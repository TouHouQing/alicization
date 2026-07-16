import { describe, expect, it } from 'vitest'

import { applyProactiveMemoryBoundaryRestraint } from './proactive-memory-boundary'

describe('applyProactiveMemoryBoundaryRestraint', () => {
  it('turns proactive closeness into next-open-window silent presence when memory should stay inward', () => {
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

  it('marks measured-return when memory should stay inward without requiring payoff-first repair', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'soft-reconnect',
        reasonCodes: ['relationship-reconnect'],
        cooldownMs: 8 * 60_000,
      },
      memorySurfaceRestraint: {
        shouldStayInward: true,
        shouldDelayUntilAfterPayoff: false,
        stableCoreOnly: false,
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
    expect(adjusted.companionshipHoldMode).toBe('measured-return')
  })

  it('leaves proactive decision untouched when memory does not impose visible restraint', () => {
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

  it('still slows proactive resurfacing a little when project state says memory closure is not yet fully closed', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'thread-callback',
        reasonCodes: ['execution-finished'],
        cooldownMs: 4 * 60_000,
      },
      memorySurfaceRestraint: null,
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
    })

    expect(adjusted.style).toBe('thread-callback')
    expect(adjusted.reasonCodes).toEqual(expect.arrayContaining([
      'execution-finished',
      'project-memory-closure-still-open',
    ]))
    expect(adjusted.cooldownMs).toBe(12 * 60_000)
  })

  it('also reads canonical project preflight self-awareness when deciding that memory closure is still open', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'thread-callback',
        reasonCodes: ['execution-finished'],
        cooldownMs: 4 * 60_000,
      },
      memorySurfaceRestraint: null,
      projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal identity-continuity',
    })

    expect(adjusted.style).toBe('thread-callback')
    expect(adjusted.reasonCodes).toEqual(expect.arrayContaining([
      'execution-finished',
      'project-memory-closure-still-open',
    ]))
    expect(adjusted.cooldownMs).toBe(12 * 60_000)
  })

  it('extends inward-hold cooldown further when project state says anthropomorphic memory closure is still open', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'soft-reconnect',
        reasonCodes: ['relationship-reconnect'],
        cooldownMs: 5 * 60_000,
      },
      memorySurfaceRestraint: {
        shouldStayInward: true,
        shouldDelayUntilAfterPayoff: false,
        stableCoreOnly: false,
        visibleCarryMode: 'withhold',
      },
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
    })

    expect(adjusted.style).toBe('silent-observe')
    expect(adjusted.reasonCodes).toEqual(expect.arrayContaining([
      'relationship-reconnect',
      'continuity-next-open-window',
      'relationship-residue-delay-warmth',
      'project-memory-closure-still-open',
    ]))
    expect(adjusted.cooldownMs).toBe(24 * 60_000)
  })

  it('also keeps proactive resurfacing on a measured-return line when project emotional closure cue says the same her should come back low-pressure', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'soft-reconnect',
        reasonCodes: ['relationship-reconnect'],
        cooldownMs: 6 * 60_000,
      },
      memorySurfaceRestraint: null,
      projectStateEmotionalClosureCue: 'Keep the unresolved closure seam emotionally low-pressure, so the same her returns without reopening from scratch.',
    })

    expect(adjusted.style).toBe('silent-observe')
    expect(adjusted.reasonCodes).toEqual(expect.arrayContaining([
      'relationship-reconnect',
      'project-emotional-closure-active',
      'continuity-next-open-window',
      'relationship-residue-delay-warmth',
    ]))
    expect(adjusted.cooldownMs).toBe(20 * 60_000)
    expect(adjusted.companionshipHoldMode).toBe('measured-return')
  })

  it('keeps proactive resurfacing on a rest-protective inward line when project emotional closure says care should stay quiet and inward', () => {
    const adjusted = applyProactiveMemoryBoundaryRestraint({
      decision: {
        style: 'soft-reconnect',
        reasonCodes: ['relationship-reconnect'],
        cooldownMs: 6 * 60_000,
      },
      memorySurfaceRestraint: null,
      projectStateEmotionalClosureCue: 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.',
    })

    expect(adjusted.style).toBe('silent-observe')
    expect(adjusted.reasonCodes).toEqual(expect.arrayContaining([
      'relationship-reconnect',
      'project-emotional-closure-active',
      'continuity-next-open-window',
      'relationship-residue-delay-warmth',
    ]))
    expect(adjusted.cooldownMs).toBe(20 * 60_000)
    expect(adjusted.companionshipHoldMode).toBe('rest-protective')
  })
})
