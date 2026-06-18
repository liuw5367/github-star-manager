import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getFilteredRepos,
  getRepoListEmptyState,
  shouldClearSelectedRepo,
} from '../src/lib/repoList.ts'

const categories = [
  { id: 'cat_user', name: 'User', order: 0, tags: [{ id: 'tag_frontend', name: 'Frontend', order: 0 }] },
]

const repos = [
  {
    full_name: 'acme/active',
    description: 'ui kit',
    language: 'TypeScript',
    topics: ['ui'],
    stargazers_count: 10,
    updated_at: '2026-06-01T00:00:00Z',
    starred_at: '2026-06-01T00:00:00Z',
    tags: ['tag_frontend'],
    note: '',
    trashed_at: null,
  },
  {
    full_name: 'acme/trashed',
    description: 'old ui kit',
    language: 'TypeScript',
    topics: ['ui'],
    stargazers_count: 5,
    updated_at: '2026-05-01T00:00:00Z',
    starred_at: '2026-05-01T00:00:00Z',
    tags: ['tag_frontend'],
    note: '',
    trashed_at: '2026-06-02T00:00:00Z',
  },
]

test('getFilteredRepos returns trash repos for trash filter', () => {
  const filtered = getFilteredRepos({
    repos,
    categories,
    activeFilter: 'trash',
    sortBy: 'starred_at',
    sortDir: 'desc',
    searchQuery: '',
  })

  assert.deepEqual(filtered.map(repo => repo.full_name), ['acme/trashed'])
})

test('getRepoListEmptyState distinguishes empty trash and no search results', () => {
  assert.equal(
    getRepoListEmptyState({
      repos,
      filteredRepos: [],
      activeFilter: 'trash',
      searchQuery: '',
    }),
    'empty-trash',
  )

  assert.equal(
    getRepoListEmptyState({
      repos,
      filteredRepos: [],
      activeFilter: 'all',
      searchQuery: 'rust',
    }),
    'no-results',
  )

  assert.equal(
    getRepoListEmptyState({
      repos: [],
      filteredRepos: [],
      activeFilter: 'all',
      searchQuery: '',
    }),
    'no-data',
  )
})

test('shouldClearSelectedRepo clears when selected repo is no longer visible', () => {
  assert.equal(
    shouldClearSelectedRepo('acme/trashed', getFilteredRepos({
      repos,
      categories,
      activeFilter: 'all',
      sortBy: 'starred_at',
      sortDir: 'desc',
      searchQuery: '',
    })),
    true,
  )

  assert.equal(
    shouldClearSelectedRepo('acme/active', getFilteredRepos({
      repos,
      categories,
      activeFilter: 'all',
      sortBy: 'starred_at',
      sortDir: 'desc',
      searchQuery: '',
    })),
    false,
  )
})
