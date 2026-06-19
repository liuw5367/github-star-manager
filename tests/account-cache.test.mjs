import assert from 'node:assert/strict'
import test from 'node:test'

const accountCache = await import('../src/lib/accountCache.ts').catch(() => ({}))

function createStorage(entries = {}) {
  const values = new Map(Object.entries(entries))
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

test('exports account-scoped cache keys', () => {
  assert.equal(typeof accountCache.scopedCacheKey, 'function')
})

test('exports guarded legacy cache migration', () => {
  assert.equal(typeof accountCache.migrateLegacyCache, 'function')
})

test('migrates a legacy cache only when it belongs to the same Gist', () => {
  const storage = createStorage({
    gsm_repo_cache: '[{"full_name":"acme/repo"}]',
  })

  const migrated = accountCache.migrateLegacyCache(
    storage,
    'gsm_repo_cache',
    'gist-a',
    'gist-a',
  )

  assert.equal(migrated, true)
  assert.equal(storage.getItem('gsm_repo_cache'), null)
  assert.equal(storage.getItem('gsm_repo_cache:gist-a'), '[{"full_name":"acme/repo"}]')
})

test('does not move another account cache or overwrite scoped data', () => {
  const mismatched = createStorage({ gsm_repo_cache: 'legacy' })
  assert.equal(accountCache.migrateLegacyCache(mismatched, 'gsm_repo_cache', 'gist-b', 'gist-a'), false)
  assert.equal(mismatched.getItem('gsm_repo_cache'), 'legacy')
  assert.equal(mismatched.getItem('gsm_repo_cache:gist-b'), null)

  const existing = createStorage({
    'gsm_repo_cache': 'legacy',
    'gsm_repo_cache:gist-a': 'scoped',
  })
  assert.equal(accountCache.migrateLegacyCache(existing, 'gsm_repo_cache', 'gist-a', 'gist-a'), false)
  assert.equal(existing.getItem('gsm_repo_cache'), 'legacy')
  assert.equal(existing.getItem('gsm_repo_cache:gist-a'), 'scoped')
})
