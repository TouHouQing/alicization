import type { LifeObligationHistoryItem, LifeObligationHistoryPage, LifeObligationHistoryRequest } from '../../../../shared/life-history-contracts'

import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'

import { useLifeHistory } from './use-life-history'

const item = (id: string): LifeObligationHistoryItem => ({ id, kind: 'task', status: 'cancelled', summary: id, generation: 1, revision: 1, updatedAt: 100 })
const page = (items: LifeObligationHistoryItem[], nextId?: string): LifeObligationHistoryPage => ({ cardId: 'alice', items, nextCursor: nextId ? { cardId: 'alice', id: nextId, updatedAt: 100 } : null })

describe('history browsing without changing life ownership', () => {
  it('keeps browsing position and update notice while loading older pages, then refreshes explicitly', async () => {
    const scope = effectScope()
    const head = shallowRef('old')
    let initialReads = 0
    const read = vi.fn(async (input: LifeObligationHistoryRequest) => input.cursor ? page([item('a'), item('b')]) : ++initialReads === 1 ? page([item('a')], 'a') : page([item('new'), item('a')]))
    const history = scope.run(() => useLifeHistory(() => 'alice', read, () => head.value))!
    await nextTick()
    expect(history.items.value.map(item => item.id)).toEqual(['a'])
    head.value = 'new'
    await nextTick()
    expect(history.hasUpdates.value).toBe(true)
    expect(read).toHaveBeenCalledTimes(1)
    await history.more()
    expect(history.items.value.map(item => item.id)).toEqual(['a', 'b'])
    expect(history.hasUpdates.value).toBe(true)
    const requests = read.mock.calls.length
    await history.more()
    expect(read).toHaveBeenCalledTimes(requests)
    await history.refresh()
    expect(history.items.value.map(item => item.id)).toEqual(['new', 'a'])
    expect(history.hasUpdates.value).toBe(false)
    scope.stop()
  })

  it('ignores old-card responses and refuses a mismatched response cursor', async () => {
    const scope = effectScope()
    const card = shallowRef('alice')
    let old!: (page: LifeObligationHistoryPage) => void
    const read = vi.fn((input: LifeObligationHistoryRequest) => input.cardId === 'alice'
      ? new Promise<LifeObligationHistoryPage>((resolve) => {
          old = resolve
        })
      : Promise.resolve({ cardId: 'bob', items: [], nextCursor: null }))
    const history = scope.run(() => useLifeHistory(() => card.value, read))!
    card.value = 'bob'
    await nextTick()
    old(page([item('private-alice-record')]))
    await nextTick()
    expect(history.items.value).toEqual([])
    expect(history.failed.value).toBe(false)
    read.mockImplementation(async () => ({ cardId: 'bob', items: [], nextCursor: { cardId: 'alice', id: 'private', updatedAt: 100 } }))
    await history.refresh()
    expect(history.failed.value).toBe(true)
    expect(history.items.value).toEqual([])
    scope.stop()
  })

  it('retains current records and continuation cursor after an older-page error', async () => {
    const scope = effectScope()
    let rejectNext = true
    const read = vi.fn(async (input: LifeObligationHistoryRequest) => {
      if (!input.cursor)
        return page([item('a')], 'a')
      if (rejectNext) {
        rejectNext = false
        throw new Error('Read failed')
      }
      return page([item('b')])
    })
    const history = scope.run(() => useLifeHistory(() => 'alice', read))!
    await nextTick()
    await history.more()
    expect(history.failed.value).toBe(true)
    expect(history.items.value.map(item => item.id)).toEqual(['a'])
    expect(history.nextCursor.value?.id).toBe('a')
    await history.more()
    expect(history.items.value.map(item => item.id)).toEqual(['a', 'b'])
    expect(history.failed.value).toBe(false)
    scope.stop()
  })
})
