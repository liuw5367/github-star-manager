import assert from 'node:assert/strict'
import test from 'node:test'

import { setRepoStarred } from '../src/api/github.ts'

test('setRepoStarred uses PUT to restore a repository star', async (t) => {
  let request
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    request = { input, init }
    return new Response(null, { status: 204 })
  })

  await setRepoStarred('secret-token', 'acme/widgets', true)

  assert.equal(request.input, 'https://api.github.com/user/starred/acme/widgets')
  assert.equal(request.init.method, 'PUT')
  assert.equal(request.init.headers.Authorization, 'Bearer secret-token')
})

test('setRepoStarred uses DELETE to remove a repository star', async (t) => {
  let method
  t.mock.method(globalThis, 'fetch', async (_input, init) => {
    method = init.method
    return new Response(null, { status: 204 })
  })

  await setRepoStarred('secret-token', 'acme/widgets', false)

  assert.equal(method, 'DELETE')
})

test('setRepoStarred rejects invalid repository names before requesting', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))

  await assert.rejects(() => setRepoStarred('secret-token', 'invalid', false), /仓库名称无效/)
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('setRepoStarred surfaces GitHub failures', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 403 }))

  await assert.rejects(() => setRepoStarred('secret-token', 'acme/widgets', false), /取消 Star 失败 \(403\)/)
})
