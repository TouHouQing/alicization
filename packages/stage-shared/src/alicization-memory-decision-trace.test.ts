import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryDecisionTraceRecords } from './alicization-memory-decision-trace'

describe('alicization memory decision trace', () => {
  it('extracts memory stage replay snapshots from governance and persistence events', () => {
    const records = buildAlicizationMemoryDecisionTraceRecords([
      {
        id: 'evt-1',
        decisionTraceId: 'mind:test:abc123def456',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 100,
            summary: 'bundle summary',
          },
          memoryStageReplay: {
            version: 'organic-memory-stage-replay-v1',
            producedAt: 120,
            stages: [
              {
                stage: 'candidate-ranking',
                summary: 'Competing cluster remained active.',
                latencyMs: 9,
                budgetClass: 'deep-recall-reply',
                diagnostics: ['cluster-ambiguous'],
              },
            ],
          },
          memoryResolutionLedger: {
            version: 'memory-resolution-ledger-v1',
            producedAt: 121,
            dominantClusterId: 'cluster:runtime-a',
            dominantClusterSummary: 'Runtime seam cluster',
            competingClusterId: 'cluster:runtime-b',
            competingClusterSummary: 'Nearby competing seam',
            candidates: [
              {
                id: 'cluster:runtime-a',
                summary: 'Runtime seam cluster',
                score: 0.84,
                status: 'selected',
                reason: 'Same task thread, same remembered seam.',
              },
              {
                id: 'cluster:runtime-b',
                summary: 'Nearby competing seam',
                score: 0.76,
                status: 'rejected',
                reason: 'Competing cluster remained less stable.',
              },
            ],
            finalSurfacePolicy: 'procedural-carry',
            shouldStayInward: false,
            shouldDelayUntilAfterPayoff: true,
            stableCoreOnly: true,
            finalRationale: 'Keep the stable seam and suppress the competing branch.',
          },
        },
        createdAt: 120,
      } as any,
      {
        id: 'evt-2',
        decisionTraceId: 'mind:test:abc123def456',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: {
          memoryStageReplay: {
            version: 'organic-memory-stage-replay-v1',
            producedAt: 121,
            stages: [
              {
                stage: 'surface-planning',
                summary: 'Stable core only.',
                latencyMs: 4,
                budgetClass: 'deep-recall-reply',
                outputs: ['shouldSurface=no'],
              },
            ],
          },
        },
        createdAt: 121,
      } as any,
    ])

    expect(records).toHaveLength(1)
    expect(records[0]?.memoryStageReplay).toEqual(expect.objectContaining({
      version: 'organic-memory-stage-replay-v1',
      stages: expect.arrayContaining([
        expect.objectContaining({
          stage: 'candidate-ranking',
          diagnostics: expect.arrayContaining(['cluster-ambiguous']),
        }),
      ]),
    }))
    expect(records[0]?.memoryResolutionLedger).toEqual(expect.objectContaining({
      version: 'memory-resolution-ledger-v1',
      rejectedCandidates: expect.arrayContaining([
        expect.objectContaining({
          id: 'cluster:runtime-b',
        }),
      ]),
      finalSurfacePolicy: 'procedural-carry',
    }))
  })
})
