import type { Repo } from '../types'
import { create } from 'zustand'
import * as gist from '../api/gist'
import * as github from '../api/github'
import { loadAccountSnapshot, migrateLegacyCache, REPO_CACHE_KEY, scopedCacheKey, shouldPullCloudBeforeSync } from '../lib/accountCache'
import { hydrateGistFiles, persistRepoSnapshot, splitReposByTrash, stripDerivedRepoTags, updateRepoStarState } from '../lib/repoPersistence'
import { useAuthStore } from './authStore'
import { useTagStore } from './tagStore'

interface RepoState {
  repos: Repo[]
  cacheGistId: string
  syncing: boolean
  syncProgress: string
  lastSynced: string
  activateCache: (gistId: string, previousGistId: string | null) => { repos: Repo[], exists: boolean }
  setRepos: (repos: Repo[], persist?: boolean) => void
  setLastSynced: (lastSynced: string) => void
  syncStarred: (credentials?: SyncCredentials) => Promise<void>
  setRepoStarred: (fullName: string, starred: boolean) => Promise<void>
  toggleTag: (fullName: string, tagId: string) => void
  setNote: (fullName: string, note: string) => void
  addTag: (fullName: string, tagId: string) => void
  removeTag: (fullName: string, tagId: string) => void
}

export interface SyncCredentials {
  pat: string
  gistId: string
  ownerLogin: string
}

function saveCache(repos: Repo[], gistId: string) {
  if (gistId)
    localStorage.setItem(scopedCacheKey(REPO_CACHE_KEY, gistId), JSON.stringify(repos))
}

function loadCache(gistId: string): { repos: Repo[], exists: boolean } {
  try {
    const raw = localStorage.getItem(scopedCacheKey(REPO_CACHE_KEY, gistId))
    return { repos: raw ? JSON.parse(raw) : [], exists: raw !== null }
  }
  catch {
    return { repos: [], exists: false }
  }
}

async function persistMetadata(repos: Repo[], lastSynced: string) {
  const { pat, gistId, user } = useAuthStore.getState()
  if (!pat || !gistId || !user)
    return

  const categories = useTagStore.getState().categories
  const { activeRepos } = splitReposByTrash(repos)

  await persistRepoSnapshot({
    repos,
    categories,
    ownerLogin: user.login,
    lastSynced,
    totalStarred: activeRepos.length,
    gistId,
    pat,
  })
}

function buildRepoFromStarred(
  starredRepo: github.StarredRepo,
  oldRepo: Repo | undefined,
): Repo {
  const tags = oldRepo?.tags.filter(tag => !tag.startsWith('tag_lang_') && !tag.startsWith('tag_auto_')) ?? []

  return {
    ...oldRepo,
    full_name: starredRepo.full_name,
    description: starredRepo.description,
    language: starredRepo.language,
    topics: starredRepo.topics || [],
    stargazers_count: starredRepo.stargazers_count,
    updated_at: starredRepo.updated_at,
    starred_at: starredRepo.starred_at,
    tags,
    note: oldRepo?.note ?? '',
    trashed_at: null,
  }
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  cacheGistId: '',
  syncing: false,
  syncProgress: '',
  lastSynced: '',

  activateCache: (gistId, previousGistId) => {
    migrateLegacyCache(localStorage, REPO_CACHE_KEY, gistId, previousGistId)
    const cached = loadCache(gistId)
    const repos = stripDerivedRepoTags(cached.repos)
    set({ cacheGistId: gistId, repos })
    return { ...cached, repos }
  },
  setRepos: (repos, persist = true) => {
    const normalizedRepos = stripDerivedRepoTags(repos)
    set({ repos: normalizedRepos })
    if (persist)
      saveCache(normalizedRepos, get().cacheGistId)
  },
  setLastSynced: lastSynced => set({ lastSynced }),

  syncStarred: async (credentials) => {
    const auth = useAuthStore.getState()
    const pat = credentials?.pat ?? auth.pat
    const gistId = credentials?.gistId ?? auth.gistId
    const ownerLogin = credentials?.ownerLogin ?? auth.user?.login
    if (!pat)
      throw new Error('未设置 PAT')
    if (!gistId)
      throw new Error('未设置 Gist')
    if (!ownerLogin)
      throw new Error('未设置 GitHub 账号')

    set({ syncing: true, syncProgress: '正在拉取 Star 数据...' })

    try {
      const snapshot = loadAccountSnapshot(localStorage, gistId)
      if (shouldPullCloudBeforeSync(snapshot)) {
        set({ syncProgress: '正在读取云端数据...' })
        const files = await gist.getGistFiles(gistId, pat)
        const hydrated = hydrateGistFiles(files, get().repos)
        useTagStore.getState().setCategories(hydrated.categories)
        set({ repos: hydrated.repos, lastSynced: hydrated.lastSynced })
      }

      set({ syncProgress: '正在拉取 Star 数据...' })
      const starredRepos = await github.getStarred(pat, (page, total) => {
        set({ syncProgress: `正在拉取第 ${page} 页 / 共 ${total} 页...` })
      })

      set({ syncProgress: '正在对比本地数据...' })

      const existing = get().repos
      const { activeRepos: existingActiveRepos, trashRepos: existingTrashRepos } = splitReposByTrash(existing)
      const starredNames = new Set(starredRepos.map(repo => repo.full_name))
      const removedNames = new Set(
        existingActiveRepos
          .filter(repo => !starredNames.has(repo.full_name))
          .map(repo => repo.full_name),
      )

      const existingMap = new Map(existing.map(repo => [repo.full_name, repo]))
      const updatedRepos = starredRepos.map(repo =>
        buildRepoFromStarred(repo, existingMap.get(repo.full_name)),
      )

      const now = new Date().toISOString()
      const restoredNames = new Set(updatedRepos.map(repo => repo.full_name))
      const nextTrashRepos = [
        ...existingTrashRepos.filter(repo => !restoredNames.has(repo.full_name) && !removedNames.has(repo.full_name)),
        ...existingActiveRepos
          .filter(repo => removedNames.has(repo.full_name))
          .map(repo => ({ ...repo, trashed_at: now })),
      ]
      const nextRepos = [...updatedRepos, ...nextTrashRepos]

      set({ syncProgress: '正在保存到 Gist...' })

      await persistRepoSnapshot({
        repos: nextRepos,
        categories: useTagStore.getState().categories,
        ownerLogin,
        lastSynced: now,
        totalStarred: updatedRepos.length,
        gistId,
        pat,
      })

      set({ repos: nextRepos, lastSynced: now, syncing: false, syncProgress: '' })
      saveCache(nextRepos, gistId)
    }
    catch (err) {
      set({ syncing: false, syncProgress: '' })
      throw err
    }
  },

  setRepoStarred: async (fullName, starred) => {
    const { pat } = useAuthStore.getState()
    if (!pat)
      throw new Error('未设置 PAT')

    const repo = get().repos.find(item => item.full_name === fullName)
    if (!repo)
      throw new Error('仓库不存在')
    if (Boolean(!repo.trashed_at) === starred)
      return

    await github.setRepoStarred(pat, fullName, starred)

    const updated = updateRepoStarState(get().repos, fullName, starred, new Date().toISOString())
    set({ repos: updated })
    saveCache(updated, get().cacheGistId)

    try {
      await persistMetadata(updated, get().lastSynced)
    }
    catch {
      throw new Error(`${starred ? '已恢复' : '已取消'} Star，但 Gist 保存失败；下次同步会重试`)
    }
  },

  toggleTag: (fullName, tagId) => {
    set((state) => {
      const updated = state.repos.map(repo =>
        repo.full_name === fullName
          ? { ...repo, tags: repo.tags.includes(tagId) ? repo.tags.filter(tag => tag !== tagId) : [...repo.tags, tagId] }
          : repo,
      )
      saveCache(updated, state.cacheGistId)
      void persistMetadata(updated, state.lastSynced)
      return { repos: updated }
    })
  },

  addTag: (fullName, tagId) => {
    set((state) => {
      const updated = state.repos.map(repo =>
        repo.full_name === fullName && !repo.tags.includes(tagId)
          ? { ...repo, tags: [...repo.tags, tagId] }
          : repo,
      )
      saveCache(updated, state.cacheGistId)
      void persistMetadata(updated, state.lastSynced)
      return { repos: updated }
    })
  },

  removeTag: (fullName, tagId) => {
    set((state) => {
      const updated = state.repos.map(repo =>
        repo.full_name === fullName
          ? { ...repo, tags: repo.tags.filter(tag => tag !== tagId) }
          : repo,
      )
      saveCache(updated, state.cacheGistId)
      void persistMetadata(updated, state.lastSynced)
      return { repos: updated }
    })
  },

  setNote: (fullName, note) => {
    set((state) => {
      const updated = state.repos.map(repo =>
        repo.full_name === fullName ? { ...repo, note } : repo,
      )
      saveCache(updated, state.cacheGistId)
      void persistMetadata(updated, state.lastSynced)
      return { repos: updated }
    })
  },
}))
