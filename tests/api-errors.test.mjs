import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError, parseGitHubError } from '../src/api/errors.ts'

test('classifies an unauthorized response as an expired credential', async () => {
  const response = new Response(JSON.stringify({ message: 'Bad credentials' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })

  const error = await parseGitHubError(response, '同步失败')

  assert.ok(error instanceof AppError)
  assert.equal(error.code, 'auth_expired')
  assert.equal(error.status, 401)
  assert.equal(error.retryable, false)
})

test('classifies exhausted rate limits and exposes the reset time', async () => {
  const response = new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1783728000',
    },
  })

  const error = await parseGitHubError(response, '同步失败')

  assert.equal(error.code, 'rate_limited')
  assert.equal(error.retryable, true)
  assert.equal(error.retryAt, '2026-07-11T00:00:00.000Z')
})

test('classifies forbidden responses with remaining quota as missing permission', async () => {
  const response = new Response(JSON.stringify({ message: 'Resource not accessible by personal access token' }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
      'x-ratelimit-remaining': '42',
    },
  })

  const error = await parseGitHubError(response, '读取 Gist 失败')

  assert.equal(error.code, 'permission_denied')
  assert.match(error.message, /读取 Gist 失败/)
  assert.doesNotMatch(error.message, /secret|Bearer/i)
})

test('classifies server failures as retryable', async () => {
  const error = await parseGitHubError(new Response(null, { status: 503 }), '同步失败')

  assert.equal(error.code, 'server_unavailable')
  assert.equal(error.retryable, true)
})
