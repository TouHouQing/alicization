import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistorySummary } from './performance-visualizer-self-evolution-focus-history-summary'

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
    highlightedEvidencePanelIds: ['runtime-continuity-projection'],
    highlightedTraceSectionIds: ['trace-timeline'],
    recommendedTraceEventId: 'event-person-state',
    capturedAt,
    ...overrides,
  }
}

describe('performance visualizer self evolution focus history summary', () => {
  it('returns null when no history exists', () => {
    expect(buildSelfEvolutionFocusHistorySummary([])).toBeNull()
  })

  it('summarizes ids, counts, and structured renderer state', () => {
    const result = buildSelfEvolutionFocusHistorySummary([
      snapshot(200, {
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
          'renderer-authority-projection',
        ],
      }),
      snapshot(100, {
        selectedCardId: 'first-check',
        recommendedTraceEventId: 'event-takeover',
      }),
    ])

    expect(result).toEqual(expect.arrayContaining([
      'historySnapshotCount=2',
      'latestCapturedAt=200',
      'latestCandidateId=candidate-200',
      'latestDecisionTraceId=trace-200',
      'latestActiveThreadId=thread-1',
      'stableEvidencePanelIds=runtime-continuity-projection',
      'driftingEvidencePanelIds=renderer-authority-projection',
      'bodyContinuityPhases=renderer-rejoin-without-body x1',
      'rendererRejoinSurfaceKeys=authority:renderer-rejoin:speech x1',
      'survivingVisibleLanes=face+lipsync+voice-only x1',
    ]))
  })
})
