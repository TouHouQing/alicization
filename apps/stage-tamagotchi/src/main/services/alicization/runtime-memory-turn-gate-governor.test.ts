import { describe, expect, it } from 'vitest'

import { applyMemoryTurnGateToGovernance } from './runtime-memory-turn-gate-governor'

describe('runtime-memory-turn-gate-governor', () => {
  it('turns inward-only memory gate into governance rules before reply generation', () => {
    const result = applyMemoryTurnGateToGovernance({
      governance: {
        mustDo: ['Answer the current ask.'],
        mustNotDo: [],
      } as any,
      memoryTurnArtifact: {
        visibleMemoryGate: {
          status: 'inward-only',
          recallReadiness: 0.58,
          precisionProxy: 0.4,
          wrongThreadRisk: 0.44,
          latencyPressure: 0.1,
          reasons: ['precision-proxy-low', 'wrong-thread-risk-high'],
        },
      } as any,
    })

    expect(result?.mustDo).toContain('Honor the turn memory gate before speaking: inward-only.')
    expect(result?.mustDo).toContain('Let memory shape caution, ordering, care, and uncertainty inwardly without narrating recall this turn.')
    expect(result?.mustNotDo).toContain('Do not visibly cite, narrate, or dramatize recalled material while the turn memory gate is inward-only or closed.')
    expect(result?.mustNotDo).toContain('Do not let low memory precision claim exact detail or settled continuity.')
    expect(result?.mustNotDo).toContain('Do not merge competing or wrong-thread memory into the current answer.')
  })
})
