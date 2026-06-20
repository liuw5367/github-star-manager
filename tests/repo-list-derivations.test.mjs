import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getDerivedCategories,
  getFilteredRepos,
  getRepoListEmptyState,
  shouldClearSelectedRepo,
  sortTagsByRepoCount,
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
    note: 'component reference',
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

test('sortTagsByRepoCount orders by count and preserves configured order for ties', () => {
  const tags = [
    { id: 'low', name: 'Low', order: 0 },
    { id: 'high-later', name: 'High later', order: 2 },
    { id: 'high-first', name: 'High first', order: 1 },
  ]

  assert.deepEqual(
    sortTagsByRepoCount(tags, { 'low': 1, 'high-later': 5, 'high-first': 5 }).map(tag => tag.id),
    ['high-first', 'high-later', 'low'],
  )
  assert.deepEqual(tags.map(tag => tag.id), ['low', 'high-later', 'high-first'])
})

test('getFilteredRepos searches repository topics, notes, language, and user tag names', () => {
  for (const query of ['ui', 'reference', 'typescript', 'frontend']) {
    const filtered = getFilteredRepos({
      repos,
      categories,
      activeFilter: 'all',
      sortBy: 'full_name',
      sortDir: 'asc',
      searchQuery: query,
    })

    assert.deepEqual(filtered.map(repo => repo.full_name), ['acme/active'])
  }
})

test('getDerivedCategories computes language and automatic topic categories from current repos', () => {
  const derived = getDerivedCategories([
    ...repos,
    {
      ...repos[0],
      full_name: 'acme/rust-tools',
      language: 'Rust',
      topics: ['cli'],
      tags: [],
    },
  ])

  assert.deepEqual(derived.map(category => category.id), ['derived:language', 'derived:auto'])
  assert.deepEqual(derived[0].tags.map(tag => tag.name), ['Rust', 'TypeScript'])
  assert.ok(derived[1].tags.some(tag => tag.name === 'ui'))
  assert.ok(derived[1].tags.some(tag => tag.name === 'cli'))
})

test('getFilteredRepos filters derived languages and automatic topics without stored tags', () => {
  const byLanguage = getFilteredRepos({
    repos,
    categories,
    activeFilter: 'lang:TypeScript',
    sortBy: 'full_name',
    sortDir: 'asc',
    searchQuery: '',
  })
  const byTopic = getFilteredRepos({
    repos,
    categories,
    activeFilter: 'topic:ui',
    sortBy: 'full_name',
    sortDir: 'asc',
    searchQuery: '',
  })

  assert.deepEqual(byLanguage.map(repo => repo.full_name), ['acme/active'])
  assert.deepEqual(byTopic.map(repo => repo.full_name), ['acme/active'])
})

test('getFilteredRepos retains a mutated repository in its sorted position', () => {
  const trashedRepos = repos.map(repo => repo.full_name === 'acme/active'
    ? { ...repo, trashed_at: '2026-06-19T00:00:00Z' }
    : repo)

  const visible = getFilteredRepos({
    repos: [
      ...trashedRepos,
      { ...repos[0], full_name: 'acme/newer', starred_at: '2026-06-02T00:00:00Z' },
    ],
    categories,
    activeFilter: 'all',
    sortBy: 'starred_at',
    sortDir: 'desc',
    searchQuery: '',
    retainedRepoNames: ['acme/active'],
  })

  assert.deepEqual(visible.map(repo => repo.full_name), ['acme/newer', 'acme/active'])
  assert.equal(visible[1].trashed_at, '2026-06-19T00:00:00Z')
})
