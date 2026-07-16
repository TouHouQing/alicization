import { describe, expect, it } from 'vitest'

import { buildAlicizationLongHorizonMemory } from './long-horizon-memory'

describe('long horizon memory continuity arc stage', () => {
  it('treats continuity arc stage itself as durable same-her pressure for longer-horizon memory carry', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 72_000,
      facts: [],
      projectStatePrimaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
      projectStateSameHerSelfLine: 'structured continuity digest.',
      projectStateContinuityArcStage: 'hold-for-opening',
    } as any)

    expect(snapshot).not.toBeNull()
    expect(snapshot?.summary).toContain('continuity=')
    expect(snapshot?.summary).toContain('hold-for-opening')
    expect(snapshot?.dominantCueSummary).toContain('hold-for-opening')
    expect(snapshot?.anchorFacts.some(cue => cue.summary.includes('hold-for-opening'))).toBe(true)
  })
})
