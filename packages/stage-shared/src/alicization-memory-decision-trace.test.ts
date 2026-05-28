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
            activeSelfRevision: {
              patchId: 'patch-runtime-1',
              patchDecisionTraceId: 'trace-runtime-1',
              lanes: ['response-posture', 'rollback-validation'],
              reasonCodes: ['domain:self-model', 'rollback-validation-required'],
              summary: 'Keep the revised self-line in verify-first posture.',
            },
            activeContinuityGovernance: {
              source: 'active-self-evolution-version',
              mode: 'same-her-baseline',
              candidateId: 'candidate-runtime-1',
              patchId: 'patch-runtime-1',
              decisionTraceId: 'trace-runtime-1',
              lanes: ['response-posture', 'rollback-validation'],
              reasonCodes: ['domain:self-model', 'rollback-validation-required'],
              summary: 'Keep the revised self-line in verify-first posture.',
            },
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
            suppressionTags: ['nearby-thread'],
            closureState: 'grounded-recall',
            surfaceConfidence: 0.79,
            shouldLabelUncertainty: false,
            visibleCarryMode: 'tone-carry',
            conflictPressure: 'medium',
            retrievalQuality: 'medium',
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
      {
        id: 'evt-3',
        decisionTraceId: 'mind:test:abc123def456',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'system',
        kind: 'learning-executed',
        payload: {
          taskId: 'learning:verify:1',
          action: 'verify',
          domain: 'relationship',
          resultSummary: 'Verification reopened relationship target.',
        },
        createdAt: 122,
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
      closureState: 'grounded-recall',
      visibleCarryMode: 'tone-carry',
      retrievalQuality: 'medium',
    }))
    expect(records[0]?.learningExecuted).toEqual(expect.objectContaining({
      action: 'verify',
      domain: 'relationship',
    }))
    expect(records[0]?.derivedMindStateBundle).toEqual(expect.objectContaining({
      activeSelfRevision: expect.objectContaining({
        patchId: 'patch-runtime-1',
        patchDecisionTraceId: 'trace-runtime-1',
        lanes: expect.arrayContaining(['response-posture', 'rollback-validation']),
      }),
      activeContinuityGovernance: expect.objectContaining({
        mode: 'same-her-baseline',
        candidateId: 'candidate-runtime-1',
        patchId: 'patch-runtime-1',
      }),
    }))
  })

  it('projects embodied authority summaries from dialogue-emitted telemetry for replay consumers', () => {
    const records = buildAlicizationMemoryDecisionTraceRecords([
      {
        id: 'evt-dialogue-1',
        decisionTraceId: 'mind:test:embodiment-authority',
        turnId: 'turn-embodiment-authority-1',
        sessionId: 'session-embodiment-authority',
        origin: 'user-turn',
        kind: 'dialogue-emitted',
        payload: {
          emotion: 'thinking',
          digitalLifeSpine: {
            runtime: {
              preferredPresence: 'attentive',
            },
          },
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'inspect_follow',
            delivery: 'calm',
            emphasis: 1,
          },
          digitalLife: {
            emotion: 'thinking',
            mode: 'acting',
            performance: {
              baseEmotion: 'thinking',
              facialCue: 'focused',
              actionCue: 'inspect_follow',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
            },
            action: {
              actionCue: 'inspect_follow',
              actionMode: 'pulse',
            },
          },
          embodimentScript: {
            rendererTarget: 'vrm',
            state: {
              baseEmotion: 'thinking',
              delivery: 'calm',
              emphasis: 1,
            },
            speechPlan: {
              segmentCount: 2,
              interruptPolicy: 'soft-settle',
            },
          },
          visibleReply: {
            expectedAuthority: 'llm-mind',
          },
        },
        createdAt: 200,
      } as any,
    ])

    expect(records).toHaveLength(1)
    expect(records[0]?.embodimentAuthority).toEqual(expect.objectContaining({
      emotion: 'thinking',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 1,
      }),
      digitalLife: expect.objectContaining({
        emotion: 'thinking',
        mode: 'acting',
        preferredPresence: 'attentive',
        face: expect.objectContaining({
          emotion: 'thinking',
          facialCue: 'focused',
        }),
        action: expect.objectContaining({
          actionCue: 'inspect_follow',
          actionMode: 'pulse',
        }),
      }),
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        state: expect.objectContaining({
          baseEmotion: 'thinking',
          delivery: 'calm',
          emphasis: 1,
        }),
        speechPlan: expect.objectContaining({
          segmentCount: 2,
          interruptPolicy: 'soft-settle',
        }),
      }),
      visibleReply: expect.objectContaining({
        expectedAuthority: 'llm-mind',
      }),
    }))
  })
})
