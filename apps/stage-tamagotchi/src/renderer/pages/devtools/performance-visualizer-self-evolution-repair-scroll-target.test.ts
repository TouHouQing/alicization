import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairScrollTarget } from './performance-visualizer-self-evolution-repair-scroll-target'

describe('performance visualizer self evolution repair scroll target', () => {
  it('returns null when there is no active repair surface route', () => {
    expect(buildSelfEvolutionRepairScrollTarget(null)).toBeNull()
  })

  it('maps evidence route to evidence section target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'evidence:runtime-continuity-projection',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })).toEqual({
      scrollTargetId: 'self-evolution-evidence:runtime-continuity-projection',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('maps trace route to trace section target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'trace:trace-timeline',
      targetType: 'trace',
      targetId: 'trace-timeline',
    })).toEqual({
      scrollTargetId: 'self-evolution-trace:trace-timeline',
      targetType: 'trace',
      targetId: 'trace-timeline',
    })
  })

  it('maps event route to event kind target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'event:governance-normalized',
      targetType: 'event',
      targetId: 'governance-normalized',
    })).toEqual({
      scrollTargetId: 'self-evolution-event:governance-normalized',
      targetType: 'event',
      targetId: 'governance-normalized',
    })
  })

  it('maps snapshot route to snapshot action target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'snapshot:validation',
      targetType: 'snapshot',
      targetId: 'validation',
    })).toEqual({
      scrollTargetId: 'self-evolution-snapshot:history',
      targetType: 'snapshot',
      targetId: 'validation',
    })
  })
})
