import type { AsyncExtractionBudgetState } from './alicization-epoch1-scheduler'

import { describe, expect, it } from 'vitest'

import {
  evaluateAsyncExtractionBudget,
  evaluateAsyncExtractionTrigger,
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
})
