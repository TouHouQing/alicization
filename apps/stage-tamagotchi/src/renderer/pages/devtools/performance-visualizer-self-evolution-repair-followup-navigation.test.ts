import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairFollowupNavigation } from './performance-visualizer-self-evolution-repair-followup-navigation'

describe('performance visualizer self evolution repair followup navigation', () => {
  it('prefers the refreshed next-action route after an action completes', () => {
    expect(buildSelfEvolutionRepairFollowupNavigation({
      executedRoute: {
        surfaceKey: 'evidence:runtime-continuity-projection',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      refreshedRoute: {
        surfaceKey: 'trace:selected-trace-event',
        targetType: 'trace',
        targetId: 'selected-trace-event',
      },
      refreshedScrollTarget: {
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
        targetType: 'trace',
        targetId: 'selected-trace-event',
      },
    })).toEqual({
      activeSurfaceKey: 'trace:selected-trace-event',
      scrollTargetId: 'self-evolution-trace:selected-trace-event',
    })
  })

  it('falls back to the executed route when no refreshed route is available yet', () => {
    expect(buildSelfEvolutionRepairFollowupNavigation({
      executedRoute: {
        surfaceKey: 'snapshot:validation',
        targetType: 'snapshot',
        targetId: 'validation',
      },
      refreshedRoute: null,
      refreshedScrollTarget: null,
    })).toEqual({
      activeSurfaceKey: 'snapshot:validation',
      scrollTargetId: null,
    })
  })

  it('clears navigation when there is neither an executed nor refreshed route', () => {
    expect(buildSelfEvolutionRepairFollowupNavigation({
      executedRoute: null,
      refreshedRoute: null,
      refreshedScrollTarget: null,
    })).toBeNull()
  })
})
