import { afterEach, describe, expect, it } from 'vitest'

import {
  abortAlicizationTurn,
  abortAlicizationTurns,
  clearAlicizationAbortRegistry,
  completeAlicizationTurnAbort,
  getAlicizationAbortRegistrySize,
  isAlicizationAbortError,
  registerAlicizationTurnAbort,
} from './alicization-turn-abort'

describe('alicization turn abort registry', () => {
  afterEach(() => {
    clearAlicizationAbortRegistry()
  })

  it('registers and completes turns', () => {
    const turn = registerAlicizationTurnAbort({
      scope: 'chat',
      turnId: 'chat:turn:1',
    })

    expect(getAlicizationAbortRegistrySize()).toBe(1)
    completeAlicizationTurnAbort(turn.turnId)
    expect(getAlicizationAbortRegistrySize()).toBe(0)
  })

  it('aborts a single turn with AbortError semantics', () => {
    const turn = registerAlicizationTurnAbort({
      scope: 'spark',
      turnId: 'spark:turn:1',
    })

    const aborted = abortAlicizationTurn(turn.turnId, 'kill-switch')
    expect(aborted).toBe(true)
    expect(turn.signal.aborted).toBe(true)
    expect(isAlicizationAbortError(turn.signal.reason)).toBe(true)
    expect(getAlicizationAbortRegistrySize()).toBe(0)
  })

  it('broadcast abort respects scope filtering', () => {
    registerAlicizationTurnAbort({ scope: 'chat', turnId: 'chat:1' })
    registerAlicizationTurnAbort({ scope: 'chat', turnId: 'chat:2' })
    registerAlicizationTurnAbort({ scope: 'spark', turnId: 'spark:1' })

    const chatResult = abortAlicizationTurns({ reason: 'session-reset', scope: 'chat' })
    expect(chatResult.aborted).toBe(2)
    expect(getAlicizationAbortRegistrySize('spark')).toBe(1)

    const allResult = abortAlicizationTurns({ reason: 'kill-switch' })
    expect(allResult.aborted).toBe(1)
    expect(getAlicizationAbortRegistrySize()).toBe(0)
  })
})
