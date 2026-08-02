import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineAdoption } from './performance-visualizer-self-evolution-baseline-adoption'

function snapshot(capturedAt: number) {
  return {
    version: 'v1',
    candidateId: 'candidate-1',
    decisionTraceId: 'trace-1',
    activeThreadId: 'thread-1',
    selectedCardId: 'repair-owner' as const,
    explanation: null,
    bodyContinuityPhase: 'body-carried-to-renderer-rejoin' as const,
    rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d' as const,
    survivingVisibleLane: null,
    highlightedEvidencePanelIds: ['renderer-authority-projection'],
    highlightedTraceSectionIds: ['trace-timeline'],
    recommendedTraceEventId: 'event-person-state',
    capturedAt,
  }
}

describe('performance visualizer self evolution baseline adoption', () => {
  it('returns null when quality or snapshot data is unavailable', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: null,
      latestSnapshot: null,
      history: [],
    })).toBeNull()
  })

  it.each([
    ['stale', 'reject', 'Baseline rejected: verdict=stale.'],
    ['provisional', 'observe', 'Baseline not adopted: verdict=provisional.'],
    ['trusted', 'adopt-now', 'Baseline ready for adoption.'],
  ] as const)('maps %s verdicts without category-specific narration', (verdict, mode, summaryLine) => {
    const latestSnapshot = snapshot(200)
    const result = buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict,
        summaryLine: 'unused',
        detailLine: 'unused',
        supportingLines: [],
      },
      latestSnapshot,
      history: [latestSnapshot],
    })

    expect(result?.mode).toBe(mode)
    expect(result?.summaryLine).toBe(summaryLine)
    expect(result?.supportingLines).toContain('decisionTraceId=trace-1')
    expect(result?.supportingLines).toContain('rendererRejoinSurfaceKey=authority:renderer-rejoin:live2d')
  })

  it('keeps a trusted older snapshot in observation mode', () => {
    const latestSnapshot = snapshot(200)
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: 'unused',
        detailLine: 'unused',
        supportingLines: [],
      },
      latestSnapshot,
      history: [latestSnapshot, snapshot(300)],
    })).toMatchObject({
      mode: 'observe',
      summaryLine: 'Baseline not adopted: a newer snapshot exists.',
    })
  })
})
