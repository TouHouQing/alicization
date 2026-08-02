import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternGuidance } from './performance-visualizer-self-evolution-focus-history-pattern-guidance'

function pattern(overrides: Record<string, unknown> = {}) {
  return {
    patternKey: 'focus:repair-path->repair-path|event:n/a->n/a',
    occurrenceCount: 1,
    summaryLine: 'unused',
    focusCardTransition: 'repair-path -> repair-path',
    traceEventTransition: 'n/a -> n/a',
    evidenceGained: [],
    evidenceLost: [],
    traceTargetsGained: [],
    traceTargetsLost: [],
    occurrences: [{ currentCapturedAt: 200, previousCapturedAt: 100 }],
    ...overrides,
  }
}

describe('performance visualizer self evolution focus history pattern guidance', () => {
  it('returns null when the pattern has no structural diagnostic signal', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance(pattern())).toBeNull()
  })

  it('derives renderer guidance from observed evidence, trace, and event ids', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance(pattern({
      occurrenceCount: 2,
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: ['runtime-continuity-projection'],
      traceTargetsGained: ['trace-timeline'],
      traceTargetsLost: ['selected-trace-event'],
    }))).toMatchObject({
      governanceLayer: 'renderer-authority',
      governanceLayerDisplay: 'renderer-authority',
      repairOwnerHint: 'renderer-authority',
      prosodyAuthorityHint: null,
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'selected-trace-event',
        'trace-timeline',
      ],
      recommendedEventKinds: [
        'person-state-updated',
        'takeover-audit',
      ],
    })
  })

  it('preserves structured body phase, surface, and surviving lane facts', () => {
    const result = buildSelfEvolutionFocusHistoryPatternGuidance(pattern({
      patternKey: 'pattern-body',
      bodyContinuityPattern: true,
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      survivingVisibleLane: 'face+lipsync+voice-only',
      occurrenceCount: 3,
      evidenceGained: ['renderer-authority-projection'],
      traceTargetsGained: ['trace-timeline'],
      traceEventTransition: 'event-takeover -> event-person-state',
    }))

    expect(result).toMatchObject({
      governanceLayer: 'body-continuity',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      survivingVisibleLane: 'face+lipsync+voice-only',
      rendererTarget: 'speech',
    })
    expect(result?.summaryLine).toBe('检测到 3 次历史模式。')
    expect(result?.bodyContinuityHint).toBeNull()
  })
})
