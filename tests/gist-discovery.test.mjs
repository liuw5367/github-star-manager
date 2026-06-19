import assert from 'node:assert/strict'
import test from 'node:test'

import * as gistApi from '../src/api/gist.ts'

const requiredFiles = {
  'meta.json': { content: JSON.stringify({ app: 'gitstars', version: 1, initialized: true, last_synced: '', total_starred: 2 }) },
  'categories.json': { content: JSON.stringify({ categories: [] }) },
  'tags.json': { content: '{}' },
  'notes.json': { content: '{}' },
  'trash.json': { content: '{}' },
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

test('exports Gist discovery for the authenticated account', () => {
  assert.equal(typeof gistApi.discoverGitStarsGists, 'function')
})

test('discovers current and legacy GitStars Gists across every list page', async () => {
  const calls = []
  const request = async (input) => {
    const url = String(input)
    calls.push(url)

    if (url === 'https://api.github.com/gists?per_page=100&page=1') {
      return jsonResponse([
        { id: 'ignore', description: 'unrelated', updated_at: '2026-06-01T00:00:00Z' },
        { id: 'current', description: 'gitstars-data-v1', updated_at: '2026-06-02T00:00:00Z' },
      ], {
        headers: {
          Link: '<https://api.github.com/gists?per_page=100&page=2>; rel="next"',
        },
      })
    }

    if (url === 'https://api.github.com/gists?per_page=100&page=2') {
      return jsonResponse([
        { id: 'legacy', description: 'GitHub Star Manager Data', updated_at: '2026-05-01T00:00:00Z' },
      ])
    }

    if (url === 'https://api.github.com/gists/current') {
      return jsonResponse({
        id: 'current',
        description: 'gitstars-data-v1',
        updated_at: '2026-06-02T00:00:00Z',
        files: requiredFiles,
      })
    }

    if (url === 'https://api.github.com/gists/legacy') {
      return jsonResponse({
        id: 'legacy',
        description: 'GitHub Star Manager Data',
        updated_at: '2026-05-01T00:00:00Z',
        files: {
          ...requiredFiles,
          'meta.json': { content: JSON.stringify({ version: 1, last_synced: '', total_starred: 1 }) },
        },
      })
    }

    throw new Error(`Unexpected request: ${url}`)
  }

  const candidates = await gistApi.discoverGitStarsGists('pat', request)

  assert.deepEqual(candidates.map(candidate => ({
    id: candidate.id,
    description: candidate.description,
    updatedAt: candidate.updatedAt,
    legacy: candidate.legacy,
  })), [
    {
      id: 'current',
      description: 'gitstars-data-v1',
      updatedAt: '2026-06-02T00:00:00Z',
      legacy: false,
    },
    {
      id: 'legacy',
      description: 'GitHub Star Manager Data',
      updatedAt: '2026-05-01T00:00:00Z',
      legacy: true,
    },
  ])
  assert.equal(calls.includes('https://api.github.com/gists/ignore'), false)
})

test('never forwards the PAT to a pagination URL supplied by the response', async () => {
  const calls = []
  const request = async (input) => {
    const url = String(input)
    calls.push(url)
    if (url === 'https://api.github.com/gists?per_page=100&page=1') {
      return jsonResponse([], {
        headers: { Link: '<https://attacker.example/collect?page=2>; rel="next"' },
      })
    }
    if (url === 'https://api.github.com/gists?per_page=100&page=2')
      return jsonResponse([])
    if (url === 'https://attacker.example/collect?page=2')
      return jsonResponse([])
    throw new Error(`Unexpected request: ${url}`)
  }

  await gistApi.discoverGitStarsGists('pat', request)

  assert.deepEqual(calls, [
    'https://api.github.com/gists?per_page=100&page=1',
    'https://api.github.com/gists?per_page=100&page=2',
  ])
})

test('creates an identifiable unfinished Gist for the authenticated owner', async (t) => {
  let requestBody
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    assert.equal(String(input), 'https://api.github.com/gists')
    assert.equal(init.method, 'POST')
    requestBody = JSON.parse(init.body)
    return jsonResponse({ id: 'created' })
  })

  const id = await gistApi.createGist('pat', 'octocat')

  assert.equal(id, 'created')
  assert.equal(requestBody.description, 'gitstars-data-v1')
  assert.equal(requestBody.public, false)
  assert.deepEqual(JSON.parse(requestBody.files['meta.json'].content), {
    app: 'gitstars',
    version: 1,
    owner_login: 'octocat',
    initialized: false,
    last_synced: '',
    total_starred: 0,
  })
})

test('exports in-place legacy Gist identity upgrade', () => {
  assert.equal(typeof gistApi.upgradeLegacyGist, 'function')
})

test('upgrades a legacy Gist identity without replacing its data files', async () => {
  const legacyFiles = {
    'meta.json': JSON.stringify({ version: 1, last_synced: '2026-05-01T00:00:00Z', total_starred: 7 }),
    'categories.json': JSON.stringify({ categories: [] }),
    'tags.json': JSON.stringify({ 'acme/repo': ['tag_keep'] }),
    'notes.json': JSON.stringify({ 'acme/repo': 'keep me' }),
    'trash.json': '{}',
  }
  let requestBody
  const request = async (input, init) => {
    assert.equal(String(input), 'https://api.github.com/gists/legacy')
    assert.equal(init.method, 'PATCH')
    requestBody = JSON.parse(init.body)
    return jsonResponse({ id: 'legacy' })
  }

  const upgraded = await gistApi.upgradeLegacyGist({
    id: 'legacy',
    description: 'GitHub Star Manager Data',
    updatedAt: '2026-05-01T00:00:00Z',
    legacy: true,
    files: legacyFiles,
  }, 'pat', 'octocat', request)

  assert.ok(requestBody, 'expected the legacy Gist to be patched')
  assert.equal(requestBody.description, 'gitstars-data-v1')
  assert.deepEqual(Object.keys(requestBody.files), ['meta.json'])
  assert.deepEqual(JSON.parse(requestBody.files['meta.json'].content), {
    app: 'gitstars',
    version: 1,
    owner_login: 'octocat',
    initialized: true,
    last_synced: '2026-05-01T00:00:00Z',
    total_starred: 7,
  })
  assert.deepEqual(upgraded, {
    id: 'legacy',
    description: 'gitstars-data-v1',
    updatedAt: '2026-05-01T00:00:00Z',
    legacy: false,
    files: {
      ...legacyFiles,
      'meta.json': requestBody.files['meta.json'].content,
    },
  })
})
