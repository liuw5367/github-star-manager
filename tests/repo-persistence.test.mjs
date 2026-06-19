import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildGistPayload,
  mergeRemoteRepoData,
  reconcileReposWithCategories,
  splitReposByTrash,
} from '../src/lib/repoPersistence.ts'

test('mergeRemoteRepoData merges cached repos, remote tags/notes, and trash state', () => {
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
      tags: ['tag_lang_typescript', 'tag_remote'],
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

test('buildGistPayload serializes active repos, trash repos, and strips language category', () => {
  const repos = [
    {
      full_name: 'acme/active',
      description: '',
      language: 'TypeScript',
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: ['tag_lang_typescript', 'tag_keep'],
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

test('reconcileReposWithCategories removes deleted user tags but keeps language tags', () => {
  const repos = [
    {
      full_name: 'acme/app',
      description: '',
      language: 'TypeScript',
      topics: [],
      stargazers_count: 0,
      updated_at: '',
      starred_at: '',
      tags: ['tag_lang_typescript', 'tag_keep', 'tag_deleted'],
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
      tags: ['tag_lang_typescript', 'tag_keep'],
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
