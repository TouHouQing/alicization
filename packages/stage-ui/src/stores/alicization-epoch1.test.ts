import type { AsyncExtractionBudgetState } from './alicization-epoch1-scheduler'

import { describe, expect, it } from 'vitest'

import {
  evaluateAsyncExtractionBudget,
  evaluateAsyncExtractionTrigger,
  hasAsyncExtractionDuplicate,
  pickAsyncExtractionBatch,
  trimAsyncExtractionQueue,
} from './alicization-epoch1-scheduler'

describe('alicization epoch1 async extraction scheduler', () => {
  it('does not trigger batch before 10 pending turns, triggers at 10', () => {
    const now = Date.now()
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 9, lastQueuedAt: now, now })).toBe('none')
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 10, lastQueuedAt: now, now })).toBe('batch')
  })

  it('triggers idle flush after 5 minutes without batch threshold', () => {
    const now = Date.now()
    const idleNow = now + 5 * 60 * 1000
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 3, lastQueuedAt: now, now: idleNow })).toBe('idle')
    expect(evaluateAsyncExtractionTrigger({ pendingCount: 3, lastQueuedAt: now, now: idleNow - 1 })).toBe('none')
  })

  it('enforces budget window and degrades when exhausted', () => {
    const now = Date.now()
    let state: AsyncExtractionBudgetState = {
      windowStartedAt: now,
      consumed: 0,
    }

    for (let i = 0; i < 12; i += 1) {
      const result = evaluateAsyncExtractionBudget({
        state,
        now,
      })
      expect(result.allowed).toBe(true)
      state = result.nextState
    }

    const exceeded = evaluateAsyncExtractionBudget({
      state,
      now,
    })
    expect(exceeded.allowed).toBe(false)

    const afterWindow = evaluateAsyncExtractionBudget({
      state: exceeded.nextState,
      now: now + 60 * 60 * 1000,
    })
    expect(afterWindow.allowed).toBe(true)
    expect(afterWindow.nextState.consumed).toBe(1)
  })

  it('selects higher-priority turns first when batching', () => {
    const selected = pickAsyncExtractionBatch({
      pending: [
        { turnId: 'turn-low-old', dedupeKey: 'a', priority: 60, queuedAt: 100 },
        { turnId: 'turn-high-new', dedupeKey: 'b', priority: 200, queuedAt: 300 },
        { turnId: 'turn-high-old', dedupeKey: 'c', priority: 200, queuedAt: 120 },
        { turnId: 'turn-mid', dedupeKey: 'd', priority: 120, queuedAt: 200 },
      ],
      batchSize: 2,
    })

    expect(selected.batch.map(item => item.turnId)).toEqual([
      'turn-high-old',
      'turn-high-new',
    ])
    expect(selected.remaining.map(item => item.turnId)).toEqual([
      'turn-low-old',
      'turn-mid',
    ])
  })

  it('drops low-priority oldest turns when queue exceeds bound', () => {
    const trimmed = trimAsyncExtractionQueue({
      pending: [
        { turnId: 'turn-1', dedupeKey: 'a', priority: 60, queuedAt: 100 },
        { turnId: 'turn-2', dedupeKey: 'b', priority: 60, queuedAt: 90 },
        { turnId: 'turn-3', dedupeKey: 'c', priority: 200, queuedAt: 110 },
      ],
      maxPending: 2,
    })

    expect(trimmed.queue.map(item => item.turnId)).toEqual(['turn-1', 'turn-3'])
    expect(trimmed.dropped.map(item => item.turnId)).toEqual(['turn-2'])
  })

  it('treats same turn id or dedupe key as duplicate', () => {
    const pending = [
      { turnId: 'turn-1', dedupeKey: 'dup-key' },
    ]
    expect(hasAsyncExtractionDuplicate(pending, { turnId: 'turn-1', dedupeKey: 'another-key' })).toBe(true)
    expect(hasAsyncExtractionDuplicate(pending, { turnId: 'turn-2', dedupeKey: 'dup-key' })).toBe(true)
    expect(hasAsyncExtractionDuplicate(pending, { turnId: 'turn-3', dedupeKey: 'unique-key' })).toBe(false)
  })
})
