import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineAdoptionHistorySummary } from './performance-visualizer-self-evolution-baseline-adoption-history'

type BodyContinuityPhase
  = | 'body-only-hold'
    | 'body-carried-to-renderer-rejoin'
    | 'full-cross-modal-lock'
    | 'renderer-rejoin-without-body'
    | null

type RendererRejoinSurfaceKey
  = | 'authority:renderer-rejoin:speech'
    | 'authority:renderer-rejoin:live2d'
    | 'authority:renderer-rejoin:vrm'
    | null

type SurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

function adoptionRecord(overrides: {
  adoptedAt?: number
  snapshotCapturedAt?: number
  candidateId?: string
  decisionTraceId?: string
  repairOwnerHint?: string
  bodyContinuityPhase?: BodyContinuityPhase
  rendererRejoinSurfaceKey?: RendererRejoinSurfaceKey
  survivingVisibleLane?: SurvivingVisibleLane
} = {}) {
  return {
    version: 'self-evolution-baseline-adoption/v1',
    adoptedAt: 1200,
    snapshotCapturedAt: 1100,
    candidateId: 'candidate-3',
    decisionTraceId: 'trace-3',
    activeThreadId: 'thread-1',
    selectedCardId: 'repair-owner',
    activePatternKey: 'pattern-body-continuity',
    repairOwnerHint: 'body-continuity',
    adoptionMode: 'adopt-now',
    summaryLine: 'trusted baseline',
    bodyContinuityPhase: null,
    rendererRejoinSurfaceKey: null,
    survivingVisibleLane: null,
    ...overrides,
  }
}

describe('performance visualizer self evolution baseline adoption history summary', () => {
  it('returns null when no adoption history exists', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([])).toBeNull()
  })

  it('summarizes the latest and previous adoption anchors', () => {
    const summary = buildSelfEvolutionBaselineAdoptionHistorySummary([
      adoptionRecord(),
      adoptionRecord({
        adoptedAt: 1000,
        snapshotCapturedAt: 900,
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        repairOwnerHint: 'previous-owner',
      }),
    ])

    expect(summary).toEqual([
      expect.stringContaining('快照 1100'),
      expect.stringContaining('最近 2 次'),
      expect.stringContaining('上一轮采纳归属：previous-owner'),
    ])
  })

  it.each([
    {
      bodyContinuityPhase: 'body-only-hold' as const,
      rendererRejoinSurfaceKey: null,
      expected: '身体独撑态',
    },
    {
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm' as const,
      expected: 'VRM authority rejoin',
    },
    {
      bodyContinuityPhase: 'full-cross-modal-lock' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d' as const,
      expected: 'Live2D authority lock',
    },
    {
      bodyContinuityPhase: 'renderer-rejoin-without-body' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech' as const,
      expected: 'speech authority rejoin without same-segment body carry',
    },
  ])('keeps $bodyContinuityPhase structured phase metadata visible', ({
    bodyContinuityPhase,
    rendererRejoinSurfaceKey,
    expected,
  }) => {
    const summary = buildSelfEvolutionBaselineAdoptionHistorySummary([
      adoptionRecord({
        bodyContinuityPhase,
        rendererRejoinSurfaceKey,
      }),
    ])

    expect(summary?.some(line => line.includes(expected))).toBe(true)
  })

  it.each([
    ['face+lipsync-only', '表情、口型连续性'] as const,
    ['motion+lipsync-only', '动作、口型连续性'] as const,
    ['face+lipsync+voice-only', '表情、口型、声音连续性'] as const,
    ['motion+lipsync+voice-only', '动作、口型、声音连续性'] as const,
  ])('uses structured surviving lane %s in renderer-rejoin-without-body summaries', (
    survivingVisibleLane,
    expected,
  ) => {
    const summary = buildSelfEvolutionBaselineAdoptionHistorySummary([
      adoptionRecord({
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        survivingVisibleLane,
      }),
    ])

    expect(summary?.some(line => line.includes(expected))).toBe(true)
    expect(summary?.some(line => line.includes('VRM authority rejoin without same-segment body carry'))).toBe(false)
  })
})
