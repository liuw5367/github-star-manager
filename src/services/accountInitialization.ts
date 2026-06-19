import type { GistCandidate } from '../api/gist'
import type { Category, TrashItem, User } from '../types'
import { createGist, discoverGitStarsGists, upgradeLegacyGist } from '../api/gist'
import { getUser } from '../api/github'
import { decideAccountBootstrap } from '../lib/accountBootstrap'
import { mergeRemoteRepoData, parseGistJson } from '../lib/repoPersistence'
import { useAuthStore } from '../stores/authStore'
import { useRepoStore } from '../stores/repoStore'
import { useTagStore } from '../stores/tagStore'

export type AccountInitializationResult
  = | { kind: 'ready' }
    | { kind: 'choose', user: User, candidates: GistCandidate[] }

interface InitializeAccountOptions {
  candidateId?: string
  preferredGistId?: string | null
  onStatus?: (message: string) => void
}

function hydrateCandidate(candidate: GistCandidate, cachedRepos: ReturnType<typeof useRepoStore.getState>['repos']) {
  const meta = parseGistJson(candidate.files['meta.json'], { last_synced: '' })
  const categories = parseGistJson(candidate.files['categories.json'], { categories: [] as Category[] })
  const tagMap = parseGistJson(candidate.files['tags.json'], {} as Record<string, string[]>)
  const noteMap = parseGistJson(candidate.files['notes.json'], {} as Record<string, string>)
  const trashMap = parseGistJson(candidate.files['trash.json'], {} as Record<string, TrashItem>)

  return {
    categories: categories.categories ?? [],
    lastSynced: meta.last_synced ?? '',
    repos: mergeRemoteRepoData({ cachedRepos, tagMap, noteMap, trashMap }),
  }
}

export async function initializeAccount(
  pat: string,
  options: InitializeAccountOptions = {},
): Promise<AccountInitializationResult> {
  const token = pat.trim()
  if (!token)
    throw new Error('请输入 PAT')

  options.onStatus?.('正在验证 PAT...')
  const user = await getUser(token)
  options.onStatus?.('正在查找 GitStars Gist...')
  let candidates = await discoverGitStarsGists(token)

  const requestedId = options.candidateId || options.preferredGistId
  if (requestedId) {
    const requested = candidates.find(candidate => candidate.id === requestedId)
    if (requested)
      candidates = [requested]
    else if (options.candidateId)
      throw new Error('选择的 Gist 已不存在，请重新检测')
  }

  if (candidates.length > 1)
    return { kind: 'choose', user, candidates }

  const previousGistId = localStorage.getItem('github_star_manager_gist_id')

  if (candidates.length === 0) {
    options.onStatus?.('正在创建 GitStars Gist...')
    const gistId = await createGist(token, user.login)
    useRepoStore.getState().activateCache(gistId, null)
    useTagStore.getState().activateCache(gistId, null)
    useTagStore.getState().setCategories([])
    useRepoStore.getState().setRepos([], false)
    options.onStatus?.('正在首次拉取 Star 数据...')
    await useRepoStore.getState().syncStarred({ pat: token, gistId, ownerLogin: user.login })
    useAuthStore.getState().login(token, user, gistId)
    return { kind: 'ready' }
  }

  let candidate = candidates[0]
  if (candidate.legacy) {
    options.onStatus?.('正在升级旧版 GitStars Gist...')
    candidate = await upgradeLegacyGist(candidate, token, user.login)
  }

  const repoCache = useRepoStore.getState().activateCache(candidate.id, previousGistId)
  useTagStore.getState().activateCache(candidate.id, previousGistId)
  const hydrated = hydrateCandidate(candidate, repoCache.repos)
  useTagStore.getState().setCategories(hydrated.categories)
  useRepoStore.getState().setLastSynced(hydrated.lastSynced)
  useRepoStore.getState().setRepos(hydrated.repos, false)

  const decision = decideAccountBootstrap([candidate], repoCache.exists)
  if (decision.kind === 'sync') {
    options.onStatus?.('正在拉取 Star 数据以补全本地缓存...')
    await useRepoStore.getState().syncStarred({
      pat: token,
      gistId: candidate.id,
      ownerLogin: user.login,
    })
  }
  else {
    useRepoStore.getState().setRepos(hydrated.repos)
  }

  const repos = useRepoStore.getState().repos
  if (repos.length > 0)
    useTagStore.getState().ensureAutoCategories(repos)
  useAuthStore.getState().login(token, user, candidate.id)
  return { kind: 'ready' }
}
