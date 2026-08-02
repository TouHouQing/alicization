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

  it('keeps body continuity follow-up on the overridden trace timeline surface while still scrolling to the concrete evidence panel', () => {
    expect(buildSelfEvolutionRepairFollowupNavigation({
      executedRoute: {
        surfaceKey: 'authority:renderer-rejoin:live2d',
        targetType: 'evidence',
        targetId: 'renderer-authority-projection',
      },
      refreshedRoute: {
        surfaceKey: 'authority:renderer-rejoin:live2d',
        targetType: 'evidence',
        targetId: 'renderer-authority-projection',
      },
      refreshedScrollTarget: {
        scrollTargetId: 'self-evolution-authority:live2d-comparison',
        targetType: 'evidence',
        targetId: 'renderer-authority-projection',
      },
    })).toEqual({
      activeSurfaceKey: 'authority:renderer-rejoin:live2d',
      scrollTargetId: 'self-evolution-authority:live2d-comparison',
    })
  })

  it('uses refreshed candidate trajectory evidence after runtime inspection', () => {
    expect(buildSelfEvolutionRepairFollowupNavigation({
      executedRoute: {
        surfaceKey: 'evidence:runtime-continuity-projection',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      refreshedRoute: {
        surfaceKey: 'evidence:candidate-trajectory-summary',
        targetType: 'evidence',
        targetId: 'candidate-trajectory-summary',
      },
      refreshedScrollTarget: {
        scrollTargetId: 'self-evolution-evidence:candidate-trajectory-summary',
        targetType: 'evidence',
        targetId: 'candidate-trajectory-summary',
      },
    })).toEqual({
      activeSurfaceKey: 'evidence:candidate-trajectory-summary',
      scrollTargetId: 'self-evolution-evidence:candidate-trajectory-summary',
    })
  })

  it('uses refreshed decision-consumption evidence after runtime inspection', () => {
    expect(buildSelfEvolutionRepairFollowupNavigation({
      executedRoute: {
        surfaceKey: 'evidence:runtime-continuity-projection',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      refreshedRoute: {
        surfaceKey: 'evidence:proactive-decision-consumption-summary',
        targetType: 'evidence',
        targetId: 'proactive-decision-consumption-summary',
      },
      refreshedScrollTarget: {
        scrollTargetId: 'self-evolution-evidence:proactive-decision-consumption-summary',
        targetType: 'evidence',
        targetId: 'proactive-decision-consumption-summary',
      },
    })).toEqual({
      activeSurfaceKey: 'evidence:proactive-decision-consumption-summary',
      scrollTargetId: 'self-evolution-evidence:proactive-decision-consumption-summary',
    })
  })

  it('keeps speech renderer rejoin follow-up on the authority surface while scrolling to the concrete speech hotspots panel', () => {
    expect(buildSelfEvolutionRepairFollowupNavigation({
      executedRoute: {
        surfaceKey: 'trace:selected-trace-event',
        targetType: 'trace',
        targetId: 'selected-trace-event',
      },
      refreshedRoute: {
        surfaceKey: 'authority:renderer-rejoin:speech',
        targetType: 'evidence',
        targetId: 'renderer-authority-projection',
      },
      refreshedScrollTarget: {
        scrollTargetId: 'self-evolution-authority:speech-hotspots',
        targetType: 'evidence',
        targetId: 'renderer-authority-projection',
      },
    })).toEqual({
      activeSurfaceKey: 'authority:renderer-rejoin:speech',
      scrollTargetId: 'self-evolution-authority:speech-hotspots',
    })
  })
})
