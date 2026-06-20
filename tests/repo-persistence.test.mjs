import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildGistPayload,
  hydrateGistFiles,
  mergeRemoteRepoData,
  reconcileReposWithCategories,
  splitReposByTrash,
  updateRepoStarState,
  writeRepoSnapshot,
} from '../src/lib/repoPersistence.ts'

test('mergeRemoteRepoData merges remote metadata and removes legacy derived tags', () => {
  const cachedRepos = [
    {
      full_name: 'acme/active',
      description: 'cached desc',
      language: 'TypeScript',
      topics: ['ui'],
      stargazers_count: 10,
      updated_at: '2026-06-01T00:00:00Z',
      starred_at: '2026-06-01T00:00:00Z',
      tags: ['tag_lang_typescript', 'tag_old'],
      note: 'cached note',
      trashed_at: null,
    },
  ]

  const merged = mergeRemoteRepoData({
    cachedRepos,
    tagMap: {
      'acme/active': ['tag_remote'],
    },
    noteMap: {
      'acme/active': 'remote note',
    },
    trashMap: {
      'acme/trashed': {
        tags: ['tag_archived'],
        note: 'trash note',
        trashed_at: '2026-06-02T00:00:00Z',
      },
    },
  })

  assert.deepEqual(merged, [
    {
      full_name: 'acme/active',
      description: 'cached desc',
      language: 'TypeScript',
      topics: ['ui'],
      stargazers_count: 10,
      updated_at: '2026-06-01T00:00:00Z',
      starred_at: '2026-06-01T00:00:00Z',
      tags: ['tag_remote'],
      note: 'remote note',
      trashed_at: null,
    },
    {
      full_name: 'acme/trashed',
      description: '',
      language: null,
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: ['tag_archived'],
      note: 'trash note',
      trashed_at: '2026-06-02T00:00:00Z',
    },
  ])
})

test('buildGistPayload serializes only user categories and user tags', () => {
  const repos = [
    {
      full_name: 'acme/active',
      description: '',
      language: 'TypeScript',
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: ['tag_lang_typescript', 'tag_auto_ui', 'tag_keep'],
      note: 'active note',
      trashed_at: null,
    },
    {
      full_name: 'acme/trashed',
      description: '',
      language: null,
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: ['tag_archived'],
      note: 'trash note',
      trashed_at: '2026-06-02T00:00:00Z',
    },
  ]

  const categories = [
    { id: 'cat_language', name: '语言 / Language', order: 0, tags: [] },
    { id: 'cat_auto_classify', name: '自动分类', order: 0, tags: [] },
    { id: 'cat_user', name: 'User', order: 1, tags: [{ id: 'tag_keep', name: 'Keep', order: 0 }] },
  ]

  const payload = buildGistPayload({
    repos,
    categories,
    ownerLogin: 'octocat',
    lastSynced: '2026-06-03T00:00:00Z',
    totalStarred: 1,
  })

  assert.deepEqual(JSON.parse(payload['meta.json']), {
    app: 'gitstars',
    version: 1,
    owner_login: 'octocat',
    initialized: true,
    last_synced: '2026-06-03T00:00:00Z',
    total_starred: 1,
  })
  assert.deepEqual(JSON.parse(payload['categories.json']), {
    categories: [{ id: 'cat_user', name: 'User', order: 1, tags: [{ id: 'tag_keep', name: 'Keep', order: 0 }] }],
  })
  assert.deepEqual(JSON.parse(payload['tags.json']), {
    'acme/active': ['tag_keep'],
  })
  assert.deepEqual(JSON.parse(payload['notes.json']), {
    'acme/active': 'active note',
  })
  assert.deepEqual(JSON.parse(payload['trash.json']), {
    'acme/trashed': {
      tags: ['tag_archived'],
      note: 'trash note',
      trashed_at: '2026-06-02T00:00:00Z',
    },
  })
})

test('reconcileReposWithCategories removes deleted and legacy derived tags', () => {
  const repos = [
    {
      full_name: 'acme/app',
      description: '',
      language: 'TypeScript',
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: ['tag_lang_typescript', 'tag_auto_ui', 'tag_keep', 'tag_deleted'],
      note: '',
      trashed_at: null,
    },
  ]

  const categories = [
    { id: 'cat_language', name: '语言 / Language', order: 0, tags: [{ id: 'tag_lang_typescript', name: 'TypeScript', order: 0 }] },
    { id: 'cat_user', name: 'User', order: 1, tags: [{ id: 'tag_keep', name: 'Keep', order: 0 }] },
  ]

  assert.deepEqual(reconcileReposWithCategories(repos, categories), [
    {
      full_name: 'acme/app',
      description: '',
      language: 'TypeScript',
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: ['tag_keep'],
      note: '',
      trashed_at: null,
    },
  ])
})

test('splitReposByTrash separates active and trashed repos', () => {
  const repos = [
    {
      full_name: 'acme/active',
      description: '',
      language: null,
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: [],
      note: '',
      trashed_at: null,
    },
    {
      full_name: 'acme/trashed',
      description: '',
      language: null,
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: [],
      note: '',
      trashed_at: '2026-06-02T00:00:00Z',
    },
  ]

  assert.deepEqual(splitReposByTrash(repos), {
    activeRepos: [repos[0]],
    trashRepos: [repos[1]],
  })
})

test('updateRepoStarState moves a repository to trash without losing metadata', () => {
  const repo = {
    full_name: 'acme/widgets',
    tags: ['tag_frontend'],
    note: 'keep this',
    trashed_at: null,
  }

  const updated = updateRepoStarState([repo], 'acme/widgets', false, '2026-06-19T00:00:00Z')

  assert.deepEqual(updated[0], {
    ...repo,
    trashed_at: '2026-06-19T00:00:00Z',
  })
})

test('updateRepoStarState restores a repository from trash', () => {
  const repo = {
    full_name: 'acme/widgets',
    tags: [],
    note: '',
    trashed_at: '2026-06-19T00:00:00Z',
  }

  const updated = updateRepoStarState([repo], 'acme/widgets', true, 'unused')

  assert.equal(updated[0].trashed_at, null)
})

test('writeRepoSnapshot saves pending locally before cloud and marks clean after success', async () => {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  const args = {
    repos: [],
    categories: [],
    ownerLogin: 'octocat',
    lastSynced: '2026-06-19T00:00:00Z',
    totalStarred: 0,
    gistId: 'gist-a',
    pat: 'token',
  }

  await writeRepoSnapshot(args, {
    storage,
    now: () => '2026-06-19T00:01:00Z',
    updateGistFiles: async () => {
      const pending = JSON.parse(storage.getItem('gsm_account_snapshot:gist-a'))
      assert.equal(pending.pendingCloudWrite, true)
    },
  })

  const saved = JSON.parse(storage.getItem('gsm_account_snapshot:gist-a'))
  assert.equal(saved.pendingCloudWrite, false)
  assert.equal(saved.savedAt, '2026-06-19T00:01:00Z')
})

test('writeRepoSnapshot leaves the local backup pending when cloud fails', async () => {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  const args = {
    repos: [],
    categories: [],
    ownerLogin: 'octocat',
    lastSynced: '',
    totalStarred: 0,
    gistId: 'gist-a',
    pat: 'token',
  }

  await assert.rejects(() => writeRepoSnapshot(args, {
    storage,
    now: () => '2026-06-19T00:01:00Z',
    updateGistFiles: async () => { throw new Error('offline') },
  }), /offline/)

  const saved = JSON.parse(storage.getItem('gsm_account_snapshot:gist-a'))
  assert.equal(saved.pendingCloudWrite, true)
})

test('hydrateGistFiles merges remote metadata into cached repository details', () => {
  const cachedRepos = [{
    full_name: 'acme/repo',
    description: 'cached description',
    language: 'TypeScript',
    topics: [],
    stargazers_count: 10,
    updated_at: '2026-06-18T00:00:00Z',
    starred_at: '2026-06-17T00:00:00Z',
    tags: ['tag_lang_typescript'],
    note: '',
    trashed_at: null,
  }]
  const files = {
    'meta.json': JSON.stringify({ last_synced: '2026-06-19T00:00:00Z' }),
    'categories.json': JSON.stringify({ categories: [
      { id: 'cat_language', name: '语言 / Language', order: 0, tags: [] },
      { id: 'cat_auto_classify', name: '自动分类', order: 1, tags: [] },
      { id: 'cat_tools', name: 'Tools', order: 2, tags: [] },
    ] }),
    'tags.json': JSON.stringify({ 'acme/repo': ['tag_cli'] }),
    'notes.json': JSON.stringify({ 'acme/repo': 'remote note' }),
    'trash.json': '{}',
  }

  const hydrated = hydrateGistFiles(files, cachedRepos)

  assert.equal(hydrated.lastSynced, '2026-06-19T00:00:00Z')
  assert.deepEqual(hydrated.categories, [{ id: 'cat_tools', name: 'Tools', order: 2, tags: [] }])
  assert.equal(hydrated.repos[0].description, 'cached description')
  assert.deepEqual(hydrated.repos[0].tags, ['tag_cli'])
  assert.equal(hydrated.repos[0].note, 'remote note')
})

test('an older cloud completion cannot overwrite a newer local snapshot', async () => {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  const completions = []
  const updateGistFiles = () => new Promise(resolve => completions.push(resolve))
  const base = {
    categories: [],
    ownerLogin: 'octocat',
    lastSynced: '',
    totalStarred: 1,
    gistId: 'gist-a',
    pat: 'token',
  }
  const first = writeRepoSnapshot({
    ...base,
    repos: [{ full_name: 'acme/repo', tags: ['tag_old'], note: '' }],
  }, { storage, now: () => '2026-06-19T00:01:00Z', updateGistFiles })
  const second = writeRepoSnapshot({
    ...base,
    repos: [{ full_name: 'acme/repo', tags: ['tag_new'], note: '' }],
  }, { storage, now: () => '2026-06-19T00:01:00Z', updateGistFiles })

  completions[1]()
  await second
  completions[0]()
  await first

  const saved = JSON.parse(storage.getItem('gsm_account_snapshot:gist-a'))
  assert.deepEqual(saved.repos[0].tags, ['tag_new'])
  assert.equal(saved.pendingCloudWrite, true)
})
