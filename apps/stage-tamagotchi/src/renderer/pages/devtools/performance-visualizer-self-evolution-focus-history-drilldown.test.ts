import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryDrilldown } from './performance-visualizer-self-evolution-focus-history-drilldown'

function snapshot(capturedAt: number, overrides: Record<string, unknown> = {}) {
  return {
    version: 'v1',
    candidateId: `candidate-${capturedAt}`,
    decisionTraceId: `trace-${capturedAt}`,
    activeThreadId: 'thread-1',
    selectedCardId: 'repair-owner' as const,
    explanation: null,
    bodyContinuityPhase: null,
    rendererRejoinSurfaceKey: null,
    survivingVisibleLane: null,
    highlightedEvidencePanelIds: ['renderer-authority-projection'],
    highlightedTraceSectionIds: ['trace-timeline'],
    recommendedTraceEventId: 'event-person-state',
    capturedAt,
    ...overrides,
  }
}

describe('performance visualizer self evolution focus history drilldown', () => {
  it('returns no transitions when fewer than two snapshots exist', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([])).toEqual([])
    expect(buildSelfEvolutionFocusHistoryDrilldown([snapshot(100)])).toEqual([])
  })

  it('reports adjacent structural changes and traceable ids', () => {
    const result = buildSelfEvolutionFocusHistoryDrilldown([
      snapshot(200, {
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      }),
      snapshot(100),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      currentCapturedAt: 200,
      previousCapturedAt: 100,
      currentCandidateId: 'candidate-200',
      previousCandidateId: 'candidate-100',
      currentDecisionTraceId: 'trace-200',
      previousDecisionTraceId: 'trace-100',
      changedBodyContinuityPhase: true,
      changedRendererRejoinSurface: true,
      changedSurvivingVisibleLane: true,
    })
    expect(result[0]?.lines).toEqual(expect.arrayContaining([
      'bodyContinuityPhase: n/a -> renderer-rejoin-without-body',
      'rendererRejoinSurfaceKey: n/a -> authority:renderer-rejoin:speech',
      'survivingVisibleLane: n/a -> face+lipsync+voice-only',
    ]))
  })

  it('omits adjacent snapshots with no diagnostic changes', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      snapshot(200),
      snapshot(100),
    ])).toEqual([])
  })
})
