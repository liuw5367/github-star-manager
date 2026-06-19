export const REPO_CACHE_KEY = 'gsm_repo_cache'
export const AUTO_TAG_NAMES_KEY = 'gsm_auto_tag_names'

export function scopedCacheKey(baseKey: string, gistId: string): string {
  return `${baseKey}:${gistId}`
}

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
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
