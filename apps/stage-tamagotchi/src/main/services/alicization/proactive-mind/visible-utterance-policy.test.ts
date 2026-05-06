import { describe, expect, it } from 'vitest'

import { decideAlicizationProactiveVisibleUtterance } from './visible-utterance-policy'

describe('proactive visible utterance policy', () => {
  it('requeues proactive visible text when provider mind did not author it', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: false,
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(false)
    expect(decision.requiresMindAuthoredText).toBe(true)
    expect(decision.action).toBe('requeue')
  })

  it('allows provider-authored proactive text to persist', () => {
    const decision = decideAlicizationProactiveVisibleUtterance({
      hasMindAuthoredStructured: true,
    })

    expect(decision.shouldPersistVisibleUtterance).toBe(true)
    expect(decision.action).toBe('persist')
  })
})
