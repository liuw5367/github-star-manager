import assert from 'node:assert/strict'
import test from 'node:test'

const bootstrap = await import('../src/lib/accountBootstrap.ts').catch(() => ({}))

test('exports deterministic account bootstrap decisions', () => {
  assert.equal(typeof bootstrap.decideAccountBootstrap, 'function')
})

function candidate(id, initialized = true) {
  return {
    id,
    description: 'gitstars-data-v1',
    updatedAt: '2026-06-01T00:00:00Z',
    legacy: false,
    files: {
      'meta.json': JSON.stringify({ app: 'gitstars', version: 1, initialized, last_synced: '', total_starred: 0 }),
      'categories.json': JSON.stringify({ categories: [] }),
      'tags.json': '{}',
      'notes.json': '{}',
      'trash.json': '{}',
    },
  }
}

test('creates storage when the account has no GitStars Gist', () => {
  assert.deepEqual(bootstrap.decideAccountBootstrap([], false), { kind: 'create' })
})

test('requires a choice when duplicate valid Gists exist', () => {
  const candidates = [candidate('a'), candidate('b')]
  assert.deepEqual(bootstrap.decideAccountBootstrap(candidates, false), {
    kind: 'choose',
    candidates,
  })
})

test('loads an initialized Gist directly when its scoped cache exists', () => {
  const existing = candidate('a')
  assert.deepEqual(bootstrap.decideAccountBootstrap([existing], true), {
    kind: 'load',
    candidate: existing,
  })
})

test('syncs an existing Gist when cache is missing or initialization is unfinished', () => {
  const initialized = candidate('a')
  const unfinished = candidate('b', false)
  assert.deepEqual(bootstrap.decideAccountBootstrap([initialized], false), {
    kind: 'sync',
    candidate: initialized,
  })
  assert.deepEqual(bootstrap.decideAccountBootstrap([unfinished], true), {
    kind: 'sync',
    candidate: unfinished,
  })
})
