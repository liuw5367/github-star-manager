import assert from 'node:assert/strict'
import test from 'node:test'

import { addNotification } from '../src/lib/notifications.ts'

test('deduplicates notifications by key and keeps the latest content', () => {
  const first = addNotification([], {
    id: 'first',
    kind: 'error',
    message: '第一次失败',
    persistent: true,
    dedupeKey: 'sync',
  })
  const second = addNotification(first, {
    id: 'second',
    kind: 'error',
    message: '第二次失败',
    persistent: true,
    dedupeKey: 'sync',
  })

  assert.equal(second.length, 1)
  assert.equal(second[0].id, 'first')
  assert.equal(second[0].message, '第二次失败')
})

test('keeps only the three most recent unrelated notifications', () => {
  let notifications = []
  for (let index = 1; index <= 4; index++) {
    notifications = addNotification(notifications, {
      id: String(index),
      kind: 'info',
      message: String(index),
      persistent: false,
    })
  }

  assert.deepEqual(notifications.map(item => item.id), ['2', '3', '4'])
})
