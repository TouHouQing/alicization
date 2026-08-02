import { describe, expect, it } from 'vitest'

import { applyProactiveMemoryBoundaryRestraint } from './proactive-memory-boundary'

describe('applyProactiveMemoryBoundaryRestraint', () => {
  it('turns proactive closeness into silent presence when memory should stay inward', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'soft-reconnect',
        reasonCodes: ['relationship-reconnect'],
        cooldownMs: 5 * 60_000,
      },
      memorySurfaceRestraint: {
        shouldStayInward: true,
        shouldDelayUntilAfterPayoff: true,
        stableCoreOnly: true,
        visibleCarryMode: 'withhold',
      },
    })

    expect(adjusted.style).toBe('silent-observe')
    expect(adjusted.reasonCodes).toEqual(expect.arrayContaining([
      'relationship-reconnect',
      'continuity-next-open-window',
      'relationship-residue-delay-warmth',
    ]))
    expect(adjusted.cooldownMs).toBe(20 * 60_000)
    expect(adjusted.companionshipHoldMode).toBe('repair-before-closeness')
  })

  it('leaves proactive decisions untouched when memory does not impose visible restraint', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'thread-callback',
        reasonCodes: ['execution-finished'],
        cooldownMs: 4 * 60_000,
      },
      memorySurfaceRestraint: {
        shouldStayInward: false,
        shouldDelayUntilAfterPayoff: false,
        stableCoreOnly: false,
        visibleCarryMode: 'tone-carry',
      },
    })

    expect(adjusted).toEqual({
      style: 'thread-callback',
      reasonCodes: ['execution-finished'],
      cooldownMs: 4 * 60_000,
    })
  })
})
