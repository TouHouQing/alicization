import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineQuality } from './performance-visualizer-self-evolution-baseline-quality'

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

function snapshot(capturedAt: number, candidateId: string, overrides: {
  decisionTraceId?: string
  recommendedTraceEventId?: string
  bodyContinuityPhase?: BodyContinuityPhase
  rendererRejoinSurfaceKey?: RendererRejoinSurfaceKey
  survivingVisibleLane?: SurvivingVisibleLane
} = {}) {
  return {
    version: 'self-evolution-focus-snapshot/v1',
    candidateId,
    decisionTraceId: overrides.decisionTraceId ?? `trace-${candidateId}`,
    activeThreadId: 'thread-1',
    selectedCardId: 'repair-path' as const,
    explanation: 'structured baseline',
    bodyContinuityPhase: overrides.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: overrides.rendererRejoinSurfaceKey ?? null,
    ...(overrides.survivingVisibleLane
      ? { survivingVisibleLane: overrides.survivingVisibleLane }
      : {}),
    highlightedEvidencePanelIds: ['runtime-continuity-projection'],
    highlightedTraceSectionIds: ['selected-trace-event'],
    recommendedTraceEventId: overrides.recommendedTraceEventId ?? `event-${candidateId}`,
    capturedAt,
  }
}

function repairClosure(overrides: {
  isClosed?: boolean
  prosodyAuthorityRelevant?: boolean
  prosodyAuthorityValidated?: boolean | null
  bodyContinuityPhase?: BodyContinuityPhase
  rendererRejoinSurfaceKey?: RendererRejoinSurfaceKey
  survivingVisibleLane?: SurvivingVisibleLane
  summaryLines?: string[]
} = {}) {
  return {
    isClosed: overrides.isClosed ?? true,
    sessionCovered: true,
    hasFreshValidationSnapshot: true,
    samePatternStillPresent: false,
    prosodyAuthorityRelevant: overrides.prosodyAuthorityRelevant ?? false,
    prosodyAuthorityValidated: overrides.prosodyAuthorityValidated ?? null,
    bodyContinuityPhase: overrides.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: overrides.rendererRejoinSurfaceKey ?? null,
    survivingVisibleLane: overrides.survivingVisibleLane ?? null,
    summaryLines: overrides.summaryLines ?? [],
  }
}

function buildQuality(overrides: {
  latestSnapshot?: ReturnType<typeof snapshot> | null
  history?: ReturnType<typeof snapshot>[]
  unresolvedSignals?: string[]
  closure?: ReturnType<typeof repairClosure> | null
} = {}) {
  const latestSnapshot = overrides.latestSnapshot === undefined
    ? snapshot(900, 'candidate-2')
    : overrides.latestSnapshot

  return buildSelfEvolutionBaselineQuality({
    latestSnapshot,
    history: overrides.history ?? [
      snapshot(900, 'candidate-2'),
      snapshot(700, 'candidate-1'),
    ],
    repairOutcome: latestSnapshot
      ? {
          closureChanged: true,
          improvedSignals: ['same recurring drift pattern cleared from recent history'],
          unresolvedSignals: overrides.unresolvedSignals ?? [],
          summaryLine: 'repair complete',
          detailLine: 'repair complete',
        }
      : null,
    repairClosure: overrides.closure === undefined ? repairClosure() : overrides.closure,
  })
}

describe('performance visualizer self evolution baseline quality', () => {
  it('returns null without the latest snapshot or repair closure data', () => {
    expect(buildQuality({ latestSnapshot: null })).toBeNull()
    expect(buildQuality({ closure: null })).toBeNull()
  })

  it('trusts a closed, newer baseline without unresolved signals', () => {
    expect(buildQuality()).toMatchObject({
      verdict: 'trusted',
      supportingLines: expect.arrayContaining([
        expect.stringContaining('900'),
        expect.stringContaining('700'),
      ]),
    })
  })

  it('uses the previous distinct snapshot when the latest snapshot is duplicated in unsorted history', () => {
    const latest = snapshot(1200, 'candidate-latest')

    const result = buildQuality({
      latestSnapshot: latest,
      history: [
        snapshot(800, 'candidate-older'),
        latest,
        snapshot(1000, 'candidate-previous'),
      ],
    })

    expect(result).toMatchObject({
      verdict: 'trusted',
      supportingLines: expect.arrayContaining([
        expect.stringContaining('1200'),
        expect.stringContaining('1000'),
      ]),
    })
  })

  it('keeps a newer baseline provisional while unresolved signals remain', () => {
    expect(buildQuality({
      unresolvedSignals: ['same recurring drift pattern still present'],
      closure: repairClosure({ isClosed: false }),
    })).toMatchObject({
      verdict: 'provisional',
      supportingLines: expect.arrayContaining([
        expect.stringContaining('同一反复漂移模式仍然存在'),
      ]),
    })
  })

  it('marks a baseline stale when it does not move past the previous distinct anchor', () => {
    expect(buildQuality({
      latestSnapshot: snapshot(700, 'candidate-1'),
      history: [
        snapshot(700, 'candidate-1'),
        snapshot(700, 'candidate-previous'),
      ],
    })).toMatchObject({
      verdict: 'stale',
      supportingLines: expect.arrayContaining([
        expect.stringContaining('并不晚于'),
      ]),
    })
  })

  it('keeps validated prosody authority as trusted structured support', () => {
    expect(buildQuality({
      closure: repairClosure({
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: true,
      }),
    })).toMatchObject({
      verdict: 'trusted',
      supportingLines: expect.arrayContaining([
        expect.stringContaining('韵律权威链'),
      ]),
    })
  })

  it('keeps unvalidated prosody authority provisional', () => {
    expect(buildQuality({
      closure: repairClosure({
        isClosed: false,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
      }),
    })).toMatchObject({
      verdict: 'provisional',
      supportingLines: expect.arrayContaining([
        expect.stringContaining('仍未稳定回到同一片段'),
      ]),
    })
  })

  it.each([
    {
      bodyContinuityPhase: 'body-only-hold' as const,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: null,
      expected: '身体独撑态',
    },
    {
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm' as const,
      survivingVisibleLane: null,
      expected: 'VRM',
    },
    {
      bodyContinuityPhase: 'full-cross-modal-lock' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d' as const,
      survivingVisibleLane: null,
      expected: 'Live2D',
    },
    {
      bodyContinuityPhase: 'renderer-rejoin-without-body' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm' as const,
      survivingVisibleLane: null,
      expected: 'VRM',
    },
    {
      bodyContinuityPhase: 'renderer-rejoin-without-body' as const,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only' as const,
      expected: '表情、口型、声音',
    },
  ])('uses structured $bodyContinuityPhase closure metadata in baseline support', ({
    bodyContinuityPhase,
    rendererRejoinSurfaceKey,
    survivingVisibleLane,
    expected,
  }) => {
    const result = buildQuality({
      closure: repairClosure({
        bodyContinuityPhase,
        rendererRejoinSurfaceKey,
        survivingVisibleLane,
      }),
    })

    expect(result).toMatchObject({ verdict: 'trusted' })
    expect(result?.supportingLines.some(line => line.includes(expected))).toBe(true)
  })

  it('does not recover body continuity metadata from legacy summary text', () => {
    const result = buildQuality({
      closure: repairClosure({
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（VRM authority rejoin），可进入基线判断。',
        ],
      }),
    })

    expect(result).toMatchObject({ verdict: 'trusted' })
    expect(result?.supportingLines.some(line => line.includes('身体承接态'))).toBe(false)
    expect(result?.supportingLines.some(line => line.includes('VRM'))).toBe(false)
  })

  it('does not recover a surviving visible lane from legacy summary text', () => {
    const result = buildQuality({
      closure: repairClosure({
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        summaryLines: [
          '当前仅剩表情、口型、声音维持同一段连续性',
        ],
      }),
    })

    expect(result).toMatchObject({ verdict: 'trusted' })
    expect(result?.supportingLines.some(line => line.includes('表情、口型、声音'))).toBe(false)
    expect(result?.supportingLines.some(line => line.includes('显形权威已经回接'))).toBe(true)
  })
})
