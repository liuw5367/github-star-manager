import assert from 'node:assert/strict'
import test from 'node:test'

import { createCategoryId, createTagId, hasDuplicateName } from '../src/lib/tagIdentity.ts'

test('creates distinct stable-format IDs for Chinese category names', () => {
  const values = ['first-id', 'second-id']
  const randomId = () => values.shift()

  assert.equal(createCategoryId(randomId), 'cat_first-id')
  assert.equal(createCategoryId(randomId), 'cat_second-id')
})

test('creates tag IDs independently from their display names', () => {
  assert.equal(createTagId(() => 'generated-id'), 'tag_generated-id')
})

test('detects duplicate names after trimming and case folding', () => {
  const entries = [{ name: 'Frontend' }, { name: '后端' }]

  assert.equal(hasDuplicateName(entries, ' frontend '), true)
  assert.equal(hasDuplicateName(entries, ' 后端 '), true)
  assert.equal(hasDuplicateName(entries, '设计'), false)
})
