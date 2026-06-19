import type { Category, Repo, User } from '../types'

export const REPO_CACHE_KEY = 'gsm_repo_cache'
export const AUTO_TAG_NAMES_KEY = 'gsm_auto_tag_names'
export const ACCOUNT_SNAPSHOT_KEY = 'gsm_account_snapshot'
export const USER_CACHE_KEY = 'gsm_user_cache'

export interface AccountSnapshot {
  version: 1
  gistId: string
  ownerLogin: string
  repos: Repo[]
  categories: Category[]
  lastSynced: string
  savedAt: string
  pendingCloudWrite: boolean
}

export function scopedCacheKey(baseKey: string, gistId: string): string {
  return `${baseKey}:${gistId}`
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function loadAccountSnapshot(storage: StorageLike, gistId: string): AccountSnapshot | null {
  try {
    const snapshot = JSON.parse(storage.getItem(scopedCacheKey(ACCOUNT_SNAPSHOT_KEY, gistId)) || 'null')
    if (snapshot?.version !== 1
      || snapshot.gistId !== gistId
      || typeof snapshot.ownerLogin !== 'string'
      || !Array.isArray(snapshot.repos)
      || !Array.isArray(snapshot.categories)
      || typeof snapshot.lastSynced !== 'string'
      || typeof snapshot.savedAt !== 'string'
      || typeof snapshot.pendingCloudWrite !== 'boolean') {
      return null
    }
    return snapshot as AccountSnapshot
  }
  catch {
    return null
  }
}

export function saveAccountSnapshot(storage: StorageLike, snapshot: AccountSnapshot): void {
  storage.setItem(scopedCacheKey(ACCOUNT_SNAPSHOT_KEY, snapshot.gistId), JSON.stringify(snapshot))
  storage.removeItem(scopedCacheKey(REPO_CACHE_KEY, snapshot.gistId))
}

export function loadCachedUser(storage: StorageLike, gistId: string): User | null {
  try {
    const user = JSON.parse(storage.getItem(scopedCacheKey(USER_CACHE_KEY, gistId)) || 'null')
    if (typeof user?.login !== 'string'
      || typeof user.avatar_url !== 'string'
      || typeof user.name !== 'string'
      || typeof user.public_repos !== 'number') {
      return null
    }
    return user as User
  }
  catch {
    return null
  }
}

export function saveCachedUser(storage: StorageLike, gistId: string, user: User): void {
  storage.setItem(scopedCacheKey(USER_CACHE_KEY, gistId), JSON.stringify(user))
}

export function loadCachedAccount(
  storage: StorageLike,
  gistId: string,
): { snapshot: AccountSnapshot, user: User } | null {
  const snapshot = loadAccountSnapshot(storage, gistId)
  const user = loadCachedUser(storage, gistId)
  if (!snapshot || !user || snapshot.ownerLogin !== user.login)
    return null
  return { snapshot, user }
}

export function shouldPullCloudBeforeSync(
  snapshot: Pick<AccountSnapshot, 'pendingCloudWrite'> | null,
): boolean {
  return Boolean(snapshot && !snapshot.pendingCloudWrite)
}

export function clearAccountCache(storage: StorageLike, gistId: string): void {
  storage.removeItem(scopedCacheKey(ACCOUNT_SNAPSHOT_KEY, gistId))
  storage.removeItem(scopedCacheKey(USER_CACHE_KEY, gistId))
  storage.removeItem(scopedCacheKey(REPO_CACHE_KEY, gistId))
}

export function migrateLegacyCache(
  storage: StorageLike,
  baseKey: string,
  gistId: string,
  previousGistId: string | null,
): boolean {
  const scopedKey = scopedCacheKey(baseKey, gistId)
  const legacyValue = storage.getItem(baseKey)
  if (previousGistId !== gistId || legacyValue === null || storage.getItem(scopedKey) !== null)
    return false

  storage.setItem(scopedKey, legacyValue)
  storage.removeItem(baseKey)
  return true
}
