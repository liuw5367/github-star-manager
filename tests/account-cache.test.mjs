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

test('round-trips a complete account snapshot scoped to its Gist', () => {
  const storage = createStorage({
    'gsm_repo_cache:gist-a': '[{"full_name":"legacy/repo"}]',
  })
  const snapshot = {
    version: 1,
    gistId: 'gist-a',
    ownerLogin: 'octocat',
    repos: [{ full_name: 'acme/repo', tags: [], note: '' }],
    categories: [{ id: 'cat_tools', name: 'Tools', order: 0, tags: [] }],
    lastSynced: '2026-06-19T00:00:00Z',
    savedAt: '2026-06-19T00:01:00Z',
    pendingCloudWrite: false,
  }

  accountCache.saveAccountSnapshot(storage, snapshot)

  assert.deepEqual(accountCache.loadAccountSnapshot(storage, 'gist-a'), snapshot)
  assert.equal(storage.getItem('gsm_repo_cache:gist-a'), null)
  assert.equal(accountCache.loadAccountSnapshot(storage, 'gist-b'), null)
})

test('rejects corrupt or incomplete account snapshots', () => {
  const corrupt = createStorage({ 'gsm_account_snapshot:gist-a': '{bad json' })
  assert.equal(accountCache.loadAccountSnapshot(corrupt, 'gist-a'), null)

  const incomplete = createStorage({
    'gsm_account_snapshot:gist-a': JSON.stringify({ version: 1, gistId: 'gist-a', repos: [] }),
  })
  assert.equal(accountCache.loadAccountSnapshot(incomplete, 'gist-a'), null)
})

test('round-trips a cached user and clears account-local data', () => {
  const storage = createStorage()
  const user = {
    login: 'octocat',
    avatar_url: 'https://example.test/avatar.png',
    name: 'Octocat',
    public_repos: 7,
  }

  accountCache.saveCachedUser(storage, 'gist-a', user)
  assert.deepEqual(accountCache.loadCachedUser(storage, 'gist-a'), user)

  storage.setItem('gsm_account_snapshot:gist-a', '{}')
  storage.setItem('gsm_repo_cache:gist-a', '[]')
  accountCache.clearAccountCache(storage, 'gist-a')

  assert.equal(accountCache.loadCachedUser(storage, 'gist-a'), null)
  assert.equal(storage.getItem('gsm_account_snapshot:gist-a'), null)
  assert.equal(storage.getItem('gsm_repo_cache:gist-a'), null)
})

test('loads a cached account only when snapshot and user owners match', () => {
  const storage = createStorage()
  const snapshot = {
    version: 1,
    gistId: 'gist-a',
    ownerLogin: 'octocat',
    repos: [],
    categories: [],
    lastSynced: '',
    savedAt: '2026-06-19T00:01:00Z',
    pendingCloudWrite: false,
  }
  const user = {
    login: 'octocat',
    avatar_url: 'https://example.test/avatar.png',
    name: 'Octocat',
    public_repos: 7,
  }
  accountCache.saveAccountSnapshot(storage, snapshot)
  accountCache.saveCachedUser(storage, 'gist-a', user)

  assert.deepEqual(accountCache.loadCachedAccount(storage, 'gist-a'), { snapshot, user })

  accountCache.saveCachedUser(storage, 'gist-a', { ...user, login: 'someone-else' })
  assert.equal(accountCache.loadCachedAccount(storage, 'gist-a'), null)
})

test('pulls cloud data before sync only for a clean local snapshot', () => {
  assert.equal(accountCache.shouldPullCloudBeforeSync(null), false)
  assert.equal(accountCache.shouldPullCloudBeforeSync({ pendingCloudWrite: true }), false)
  assert.equal(accountCache.shouldPullCloudBeforeSync({ pendingCloudWrite: false }), true)
})
