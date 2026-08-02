import { describe, expect, it } from 'vitest'

import { appendSelfEvolutionBaselineAdoptionHistory } from './performance-visualizer-self-evolution-baseline-adoption-history-records'

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
  bodyContinuityPhase?: BodyContinuityPhase
  rendererRejoinSurfaceKey?: RendererRejoinSurfaceKey
  survivingVisibleLane?: SurvivingVisibleLane
} = {}) {
  return {
    version: 'self-evolution-baseline-adoption/v1',
    adoptedAt: 1000,
    snapshotCapturedAt: 900,
    candidateId: 'candidate-2',
    decisionTraceId: 'trace-2',
    activeThreadId: 'thread-1',
    selectedCardId: 'repair-path',
    activePatternKey: 'pattern-body-continuity',
    repairOwnerHint: 'body-continuity',
    adoptionMode: 'adopt-now' as const,
    summaryLine: 'trusted baseline',
    bodyContinuityPhase: null,
    rendererRejoinSurfaceKey: null,
    survivingVisibleLane: null,
    ...overrides,
  }
}

describe('performance visualizer self evolution baseline adoption history records', () => {
  it('returns the existing history when there is no new adoption record', () => {
    const history = [adoptionRecord()]

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history,
      record: null,
    })).toBe(history)
  })

  it('prepends a unique record, sorts newest first, and caps history at 10 entries', () => {
    const history = Array.from({ length: 10 }, (_, index) => adoptionRecord({
      adoptedAt: 1000 - index * 100,
      snapshotCapturedAt: 900 - index * 100,
      candidateId: `candidate-${index}`,
      decisionTraceId: `trace-${index}`,
    }))
    const newRecord = adoptionRecord({
      adoptedAt: 5000,
      snapshotCapturedAt: 4900,
      candidateId: 'candidate-new',
      decisionTraceId: 'trace-new',
    })

    const result = appendSelfEvolutionBaselineAdoptionHistory({
      history,
      record: newRecord,
    })

    expect(result).toHaveLength(10)
    expect(result[0]).toBe(newRecord)
    expect(result.map(record => record.adoptedAt)).toEqual([
      5000,
      1000,
      900,
      800,
      700,
      600,
      500,
      400,
      300,
      200,
    ])
  })

  it('deduplicates records by snapshot, trace, and adoption mode', () => {
    const existing = adoptionRecord()
    const duplicate = adoptionRecord({ adoptedAt: 5000 })

    const result = appendSelfEvolutionBaselineAdoptionHistory({
      history: [existing],
      record: duplicate,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      adoptedAt: 1000,
      snapshotCapturedAt: 900,
      decisionTraceId: 'trace-2',
      adoptionMode: 'adopt-now',
    })
  })

  it('refreshes missing structured body continuity metadata on a duplicate record', () => {
    const result = appendSelfEvolutionBaselineAdoptionHistory({
      history: [adoptionRecord()],
      record: adoptionRecord({
        adoptedAt: 5000,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      }),
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      adoptedAt: 1000,
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
    })
  })

  it('refreshes a missing surviving visible lane on a duplicate record', () => {
    const result = appendSelfEvolutionBaselineAdoptionHistory({
      history: [adoptionRecord({
        bodyContinuityPhase: 'renderer-rejoin-without-body',
      })],
      record: adoptionRecord({
        adoptedAt: 5000,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync+voice-only',
      }),
    })

    expect(result[0]).toMatchObject({
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      survivingVisibleLane: 'face+lipsync+voice-only',
    })
  })

  it('keeps existing structured metadata when a duplicate carries different values', () => {
    const result = appendSelfEvolutionBaselineAdoptionHistory({
      history: [adoptionRecord({
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        survivingVisibleLane: 'face+lipsync-only',
      })],
      record: adoptionRecord({
        adoptedAt: 5000,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        survivingVisibleLane: 'motion+lipsync+voice-only',
      }),
    })

    expect(result[0]).toMatchObject({
      bodyContinuityPhase: 'full-cross-modal-lock',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      survivingVisibleLane: 'face+lipsync-only',
    })
  })
})
