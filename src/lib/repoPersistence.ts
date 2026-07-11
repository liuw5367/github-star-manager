import type { GistFiles } from '../api/gist.ts'
import type { Category, Repo, TrashItem } from '../types'
import type { StorageLike } from './accountCache.ts'
import * as gist from '../api/gist.ts'
import { loadAccountSnapshot, saveAccountSnapshot } from './accountCache.ts'

interface RemoteRepoMaps {
  tagMap: Record<string, string[]>
  noteMap: Record<string, string>
  trashMap: Record<string, TrashItem>
}

interface GistPayloadArgs {
  repos: Repo[]
  categories: Category[]
  ownerLogin: string
  lastSynced: string
  totalStarred: number
}

type RepoSnapshotArgs = GistPayloadArgs & { gistId: string, pat: string }

interface RepoSnapshotDependencies {
  storage: StorageLike
  now: () => string
  updateGistFiles: typeof gist.updateGistFiles
}

function toRepoBase(fullName: string, repo?: Partial<Repo>): Repo {
  return {
    full_name: fullName,
    description: repo?.description ?? '',
    language: repo?.language ?? null,
    topics: repo?.topics ?? [],
    stargazers_count: repo?.stargazers_count ?? 0,
    updated_at: repo?.updated_at ?? '',
    starred_at: repo?.starred_at ?? '',
    tags: repo?.tags ?? [],
    note: repo?.note ?? '',
    trashed_at: repo?.trashed_at ?? null,
  }
}

function isDerivedTag(tagId: string): boolean {
  return tagId.startsWith('tag_lang_') || tagId.startsWith('tag_auto_')
}

export function getUserTags(tags: string[]): string[] {
  return tags.filter(tagId => !isDerivedTag(tagId))
}

function isUserCategory(category: Category): boolean {
  return category.id !== 'cat_language' && category.id !== 'cat_auto_classify'
}

export function getUserCategories(categories: Category[]): Category[] {
  return categories.filter(isUserCategory)
}

export function stripDerivedRepoTags(repos: Repo[]): Repo[] {
  return repos.map(repo => ({ ...repo, tags: getUserTags(repo.tags || []) }))
}

export function parseGistJson<T>(raw: string, fallback: T): T {
  if (!raw)
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

export function splitReposByTrash(repos: Repo[]): { activeRepos: Repo[], trashRepos: Repo[] } {
  return {
    activeRepos: repos.filter(repo => !repo.trashed_at),
    trashRepos: repos.filter(repo => Boolean(repo.trashed_at)),
  }
}

export function updateRepoStarState(
  repos: Repo[],
  fullName: string,
  starred: boolean,
  trashedAt: string,
): Repo[] {
  return repos.map(repo => repo.full_name === fullName
    ? { ...repo, trashed_at: starred ? null : trashedAt }
    : repo)
}

export function mergeRemoteRepoData(
  { cachedRepos, tagMap, noteMap, trashMap }: { cachedRepos: Repo[] } & RemoteRepoMaps,
): Repo[] {
  const cachedMap = new Map(cachedRepos.map(repo => [repo.full_name, repo]))
  const names = new Set([
    ...cachedRepos.map(repo => repo.full_name),
    ...Object.keys(tagMap),
    ...Object.keys(noteMap),
    ...Object.keys(trashMap),
  ])

  const merged: Repo[] = []

  for (const fullName of names) {
    const cached = cachedMap.get(fullName)
    const trashed = trashMap[fullName]

    if (trashed) {
      merged.push({
        ...toRepoBase(fullName, cached),
        tags: getUserTags(trashed.tags),
        note: trashed.note,
        trashed_at: trashed.trashed_at,
      })
      continue
    }

    const cachedRepo = toRepoBase(fullName, cached)
    merged.push({
      ...cachedRepo,
      tags: getUserTags(tagMap[fullName] ?? cachedRepo.tags),
      note: noteMap[fullName] ?? cachedRepo.note,
      trashed_at: null,
    })
  }

  return merged
}

export function hydrateGistFiles(files: GistFiles, cachedRepos: Repo[]): {
  categories: Category[]
  lastSynced: string
  repos: Repo[]
} {
  const meta = parseGistJson(files['meta.json'], { last_synced: '' })
  const categories = parseGistJson(files['categories.json'], { categories: [] as Category[] })
  const tagMap = parseGistJson(files['tags.json'], {} as Record<string, string[]>)
  const noteMap = parseGistJson(files['notes.json'], {} as Record<string, string>)
  const trashMap = parseGistJson(files['trash.json'], {} as Record<string, TrashItem>)

  return {
    categories: getUserCategories(categories.categories ?? []),
    lastSynced: meta.last_synced ?? '',
    repos: mergeRemoteRepoData({ cachedRepos, tagMap, noteMap, trashMap }),
  }
}

export function reconcileReposWithCategories(repos: Repo[], categories: Category[]): Repo[] {
  const validUserTags = new Set(
    categories
      .filter(isUserCategory)
      .flatMap(category => category.tags.map(tag => tag.id)),
  )

  return repos.map((repo) => {
    const keptUserTags = getUserTags(repo.tags).filter(tagId => validUserTags.has(tagId))
    return {
      ...repo,
      tags: keptUserTags,
    }
  })
}

export function buildGistPayload({ repos, categories, ownerLogin, lastSynced, totalStarred }: GistPayloadArgs): GistFiles {
  const { activeRepos, trashRepos } = splitReposByTrash(repos)
  const userCategories = getUserCategories(categories)

  const tagMap: Record<string, string[]> = {}
  const noteMap: Record<string, string> = {}
  const trashMap: Record<string, TrashItem> = {}

  for (const repo of activeRepos) {
    const userTags = getUserTags(repo.tags)
    if (userTags.length > 0)
      tagMap[repo.full_name] = userTags
    if (repo.note)
      noteMap[repo.full_name] = repo.note
  }

  for (const repo of trashRepos) {
    trashMap[repo.full_name] = {
      tags: getUserTags(repo.tags),
      note: repo.note,
      trashed_at: repo.trashed_at || '',
    }
  }

  return {
    'meta.json': JSON.stringify({
      app: gist.GIST_APP_ID,
      version: 1,
      owner_login: ownerLogin,
      initialized: true,
      last_synced: lastSynced,
      total_starred: totalStarred,
    }),
    'categories.json': JSON.stringify({ categories: userCategories }),
    'tags.json': JSON.stringify(tagMap),
    'notes.json': JSON.stringify(noteMap),
    'trash.json': JSON.stringify(trashMap),
  }
}

export async function writeRepoSnapshot({
  repos,
  categories,
  ownerLogin,
  lastSynced,
  gistId,
  pat,
  totalStarred,
}: RepoSnapshotArgs, dependencies: RepoSnapshotDependencies): Promise<void> {
  const savedAt = dependencies.now()
  const snapshot = {
    version: 1 as const,
    gistId,
    ownerLogin,
    repos,
    categories,
    lastSynced,
    savedAt,
    pendingCloudWrite: true,
  }
  saveAccountSnapshot(dependencies.storage, snapshot)

  await dependencies.updateGistFiles(
    gistId,
    pat,
    buildGistPayload({ repos, categories, ownerLogin, lastSynced, totalStarred }),
  )

  const current = loadAccountSnapshot(dependencies.storage, gistId)
  if (!current)
    return
  if (JSON.stringify(current) === JSON.stringify(snapshot)) {
    saveAccountSnapshot(dependencies.storage, { ...snapshot, pendingCloudWrite: false })
  }
  else {
    saveAccountSnapshot(dependencies.storage, { ...current, pendingCloudWrite: true })
  }
}

export async function persistRepoSnapshot(args: RepoSnapshotArgs): Promise<void> {
  await writeRepoSnapshot(args, {
    storage: localStorage,
    now: () => new Date().toISOString(),
    updateGistFiles: gist.updateGistFiles,
  })
}

export async function retryPendingRepoSnapshot(
  credentials: { gistId: string, pat: string },
  dependencies: RepoSnapshotDependencies = {
    storage: localStorage,
    now: () => new Date().toISOString(),
    updateGistFiles: gist.updateGistFiles,
  },
): Promise<boolean> {
  const snapshot = loadAccountSnapshot(dependencies.storage, credentials.gistId)
  if (!snapshot?.pendingCloudWrite)
    return false

  await writeRepoSnapshot({
    repos: snapshot.repos,
    categories: snapshot.categories,
    ownerLogin: snapshot.ownerLogin,
    lastSynced: snapshot.lastSynced,
    totalStarred: splitReposByTrash(snapshot.repos).activeRepos.length,
    gistId: credentials.gistId,
    pat: credentials.pat,
  }, dependencies)
  return true
}
