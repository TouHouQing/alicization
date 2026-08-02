import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineAdoptionRecord } from './performance-visualizer-self-evolution-baseline-adoption-record'

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

function latestSnapshot(overrides: {
  bodyContinuityPhase?: BodyContinuityPhase
  rendererRejoinSurfaceKey?: RendererRejoinSurfaceKey
  survivingVisibleLane?: SurvivingVisibleLane
} = {}) {
  return {
    version: 'self-evolution-focus-snapshot/v1',
    candidateId: 'candidate-3',
    decisionTraceId: 'trace-3',
    activeThreadId: 'thread-1',
    selectedCardId: 'repair-path' as const,
    explanation: 'structured baseline',
    bodyContinuityPhase: null,
    rendererRejoinSurfaceKey: null,
    highlightedEvidencePanelIds: ['runtime-continuity-projection'],
    highlightedTraceSectionIds: ['selected-trace-event'],
    recommendedTraceEventId: 'event-3',
    capturedAt: 1100,
    ...overrides,
  }
}

function buildRecord(overrides: {
  mode?: 'adopt-now' | 'observe' | 'reject'
  snapshot?: ReturnType<typeof latestSnapshot> | null
  prosodyAuthorityNote?: string | null
  supportingLines?: string[]
} = {}) {
  return buildSelfEvolutionBaselineAdoptionRecord({
    baselineAdoption: {
      mode: overrides.mode ?? 'adopt-now',
      summaryLine: 'trusted baseline',
      detailLine: 'fresh structured baseline',
      supportingLines: overrides.supportingLines ?? ['fresh validation snapshot'],
    },
    latestSnapshot: overrides.snapshot === undefined ? latestSnapshot() : overrides.snapshot,
    activePatternKey: 'pattern-body-continuity',
    repairOwnerHint: 'body-continuity',
    prosodyAuthorityNote: overrides.prosodyAuthorityNote ?? null,
    capturedAt: 1200,
  })
}

describe('performance visualizer self evolution baseline adoption record', () => {
  it('returns null unless adoption is immediate and a latest snapshot exists', () => {
    expect(buildRecord({ mode: 'observe' })).toBeNull()
    expect(buildRecord({ mode: 'reject' })).toBeNull()
    expect(buildRecord({ snapshot: null })).toBeNull()
  })

  it('builds the stable adoption identity from the latest snapshot', () => {
    expect(buildRecord()).toMatchObject({
      version: 'self-evolution-baseline-adoption/v1',
      adoptedAt: 1200,
      snapshotCapturedAt: 1100,
      candidateId: 'candidate-3',
      decisionTraceId: 'trace-3',
      activeThreadId: 'thread-1',
      selectedCardId: 'repair-path',
      activePatternKey: 'pattern-body-continuity',
      repairOwnerHint: 'body-continuity',
      adoptionMode: 'adopt-now',
      summaryLine: 'trusted baseline',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
    })
  })

  it.each([
    {
      bodyContinuityPhase: 'body-only-hold' as const,
      rendererRejoinSurfaceKey: null,
    },
    {
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm' as const,
    },
    {
      bodyContinuityPhase: 'full-cross-modal-lock' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d' as const,
    },
    {
      bodyContinuityPhase: 'renderer-rejoin-without-body' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech' as const,
    },
  ])('preserves $bodyContinuityPhase structured metadata', ({
    bodyContinuityPhase,
    rendererRejoinSurfaceKey,
  }) => {
    expect(buildRecord({
      snapshot: latestSnapshot({
        bodyContinuityPhase,
        rendererRejoinSurfaceKey,
      }),
    })).toMatchObject({
      bodyContinuityPhase,
      rendererRejoinSurfaceKey,
    })
  })

  it.each([
    'face+lipsync-only',
    'motion+lipsync-only',
    'face+lipsync+voice-only',
    'motion+lipsync+voice-only',
  ] as const)('preserves structured surviving visible lane %s', (survivingVisibleLane) => {
    expect(buildRecord({
      snapshot: latestSnapshot({
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane,
      }),
    })).toMatchObject({
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane,
    })
  })

  it('does not recover a prosody authority note from adoption supporting text', () => {
    expect(buildRecord({
      supportingLines: [
        '韵律权威链已重新绑定到当前片段，可作为采纳基线的一部分。',
      ],
    })).toMatchObject({
      prosodyAuthorityNote: null,
    })
  })
})
