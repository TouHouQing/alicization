import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairActionRoute } from './performance-visualizer-self-evolution-repair-action-route'

describe('performance visualizer self evolution repair action route', () => {
  it('returns null when there is no next action to route', () => {
    expect(buildSelfEvolutionRepairActionRoute(null)).toBeNull()
  })

  it('routes evidence targets to the matching evidence panel surface', () => {
    expect(buildSelfEvolutionRepairActionRoute({
      kind: 'inspect-evidence',
      label: 'Inspect runtime-continuity-projection',
      detail: '...',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })).toEqual({
      surfaceKey: 'evidence:runtime-continuity-projection',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('routes trace targets to their trace section surface', () => {
    expect(buildSelfEvolutionRepairActionRoute({
      kind: 'inspect-trace',
      label: 'Inspect trace-timeline',
      detail: '...',
      targetType: 'trace',
      targetId: 'trace-timeline',
    })).toEqual({
      surfaceKey: 'trace:trace-timeline',
      targetType: 'trace',
      targetId: 'trace-timeline',
    })
  })

  it('routes event targets to the timeline surface keyed by event kind', () => {
    expect(buildSelfEvolutionRepairActionRoute({
      kind: 'inspect-event',
      label: 'Inspect governance-normalized',
      detail: '...',
      targetType: 'event',
      targetId: 'governance-normalized',
    })).toEqual({
      surfaceKey: 'event:governance-normalized',
      targetType: 'event',
      targetId: 'governance-normalized',
    })
  })

  it('routes snapshot targets to the snapshot capture surface', () => {
    expect(buildSelfEvolutionRepairActionRoute({
      kind: 'capture-snapshot',
      label: 'Capture validation snapshot',
      detail: '...',
      targetType: 'snapshot',
      targetId: 'validation',
    })).toEqual({
      surfaceKey: 'snapshot:validation',
      targetType: 'snapshot',
      targetId: 'validation',
    })
  })
})
