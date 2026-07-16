import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryDecisionTraceRecords } from './alicization-memory-decision-trace'

describe('alicization memory decision trace', () => {
  it('projects memory reconsolidation payloads so replay gates can audit Memory OS execution carry consumption', () => {
    const records = buildAlicizationMemoryDecisionTraceRecords([
      {
        id: 'evt-memory-reconsolidated-1',
        decisionTraceId: 'mind:test:memory-os-execution-carry',
        turnId: 'turn-memory-os-execution-carry',
        sessionId: 'session-memory-os-execution-carry',
        origin: 'user-turn',
        kind: 'memory-reconsolidated',
        payload: {
          source: 'execution-result-feedback',
          memoryClosureExecution: {
            authority: 'memory-os',
            carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
            nextLearningAction: 'verify',
            shouldVerify: true,
            shouldReflect: true,
            activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
            reasonTags: ['memory-os', 'execution-feedback'],
          },
        },
        createdAt: 10,
      } as any,
    ])

    expect(records[0]?.memoryReconsolidated).toEqual(expect.objectContaining({
      source: 'execution-result-feedback',
      memoryClosureExecution: expect.objectContaining({
        authority: 'memory-os',
        nextLearningAction: 'verify',
        shouldVerify: true,
        shouldReflect: true,
        activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
      }),
    }))
  })

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

  it('prefers later richer same-turn closure evidence over thin early governance payloads', () => {
    const records = buildAlicizationMemoryDecisionTraceRecords([
      {
        id: 'evt-governance-thin-closure-1',
        decisionTraceId: 'mind:test:richer-dialogue-closure',
        turnId: 'turn-richer-dialogue-closure',
        sessionId: 'session-richer-dialogue-closure',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 100,
            summary: 'thin early bundle before dialogue authority landed',
          },
          memoryResolutionLedger: {
            version: 'memory-resolution-ledger-v1',
            producedAt: 100,
            candidates: [{
              id: 'cluster:thin',
              summary: 'thin early cluster',
              status: 'selected',
              reason: 'Early governance only knew the selected cluster.',
            }],
            closureState: 'grounded-recall',
            visibleCarryMode: 'tone-carry',
            retrievalQuality: 'medium',
          },
        },
        createdAt: 100,
      } as any,
      {
        id: 'evt-dialogue-rich-closure-1',
        decisionTraceId: 'mind:test:richer-dialogue-closure',
        turnId: 'turn-richer-dialogue-closure',
        sessionId: 'session-richer-dialogue-closure',
        origin: 'user-turn',
        kind: 'dialogue-emitted',
        payload: {
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 110,
            summary: 'dialogue bundle with emotional and embodiment closure proof',
            emotionalTransitionLedger: {
              version: 'emotional-transition-ledger-v1',
              createdAt: 110,
              turnId: 'turn-richer-dialogue-closure',
              previousEmotion: 'repair-tension',
              nextEmotion: 'measured-companionship',
              transitionKind: 'repair-shift',
              axisDeltas: {
                valence: 0.1,
                arousal: -0.2,
                guardedness: -0.1,
                closenessDrive: 0,
                repairNeed: -0.4,
                initiativePressure: -0.1,
              },
              changedAxes: ['arousal', 'repairNeed'],
              sourceTags: ['visible-reply', 'memory-closure'],
              decayPolicy: {
                mode: 'hold-until-repair-cools',
                carryTtlMs: 60000,
                reason: 'Keep the emotional afterglow available for the next turn.',
              },
              memoryWriteback: {
                shouldWrite: true,
                lane: 'emotional-continuity',
                reason: 'The recall changed the emotional afterglow.',
              },
              initiativeSuppression: {
                shouldSuppress: true,
                mode: 'measured-return',
                reason: 'Avoid noisy initiative while the same line settles.',
              },
              embodimentDrive: {
                shouldDrive: true,
                tone: 'measured-return',
                reason: 'Drive quieter face, voice, motion, and lipsync together.',
              },
              selfRevisionCandidate: {
                shouldPropose: false,
                domain: 'dialogue-style',
                reasonCodes: [],
                summary: null,
                projectStateContinuity: {},
              },
              traceSummary: 'emotion shifted because the remembered repair line landed',
              replayLine: 'next turn should keep the same quieter afterglow',
            },
            embodimentContinuityLedger: {
              version: 'embodiment-continuity-ledger-v1',
              createdAt: 110,
              turnId: 'turn-richer-dialogue-closure',
              carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
              droppedLanes: [],
              rejoinedLanes: [],
              pendingRejoinLanes: [],
              continuityPhase: 'fully-rejoined',
              memoryWriteback: {
                shouldWrite: true,
                lane: 'cross-modal-continuity',
                reason: 'All embodiment lanes held the same-her memory line.',
              },
              selfRevisionCandidate: {
                shouldPropose: false,
                reasonCodes: [],
                summary: null,
              },
              traceSummary: 'voice face motion lipsync and body stayed on one line',
              replayLine: 'body expression should remain measured-return next turn',
              sourceTags: ['dialogue-emitted', 'same-her-body'],
            },
          },
          memoryResolutionLedger: {
            version: 'memory-resolution-ledger-v1',
            producedAt: 110,
            dominantClusterId: 'cluster:rich',
            dominantClusterSummary: 'identity-continuity',
            competingClusterId: 'cluster:wrong-thread',
            competingClusterSummary: 'nearby but wrong thread',
            candidates: [
              {
                id: 'cluster:rich',
                summary: 'identity-continuity',
                score: 0.9,
                status: 'selected',
                reason: 'The remembered line matched the current turn.',
              },
              {
                id: 'cluster:wrong-thread',
                summary: 'nearby but wrong thread',
                score: 0.58,
                status: 'rejected',
                reason: 'Wrong thread was restrained instead of surfaced.',
              },
            ],
            finalSurfacePolicy: 'procedural-carry',
            shouldStayInward: false,
            shouldDelayUntilAfterPayoff: true,
            stableCoreOnly: true,
            suppressionTags: ['wrong-thread'],
            closureState: 'grounded-recall',
            surfaceConfidence: 0.9,
            shouldLabelUncertainty: false,
            visibleCarryMode: 'explicit-recall',
            conflictPressure: 'medium',
            retrievalQuality: 'high',
            finalRationale: 'Selected the identity-continuity',
          },
        },
        createdAt: 110,
      } as any,
    ])

    expect(records[0]?.derivedMindStateBundle?.emotionalTransitionLedger).toEqual(expect.objectContaining({
      transitionKind: 'repair-shift',
      replayLine: 'next turn should keep the same quieter afterglow',
    }))
    expect(records[0]?.derivedMindStateBundle?.embodimentContinuityLedger).toEqual(expect.objectContaining({
      continuityPhase: 'fully-rejoined',
      carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
    }))
    expect(records[0]?.memoryResolutionLedger).toEqual(expect.objectContaining({
      dominantClusterId: 'cluster:rich',
      retrievalQuality: 'high',
      suppressionTags: ['wrong-thread'],
      rejectedCandidates: expect.arrayContaining([
        expect.objectContaining({ id: 'cluster:wrong-thread' }),
      ]),
    }))
  })

  it('keeps explicit memory closure identity over richer inward-only dialogue cluster evidence', () => {
    const explicitMemoryIdentity = {
      selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621f'],
      continuityKey: 'fallback:铃兰-phase1-0621f',
      reasonTags: ['memory-identity:fallback:铃兰-phase1-0621f'],
    }
    const explicitCausality = (affectedLane: 'emotion' | 'initiative' | 'execution' | 'embodiment') => ({
      causalSource: 'memory-closure-trace',
      affectedLane,
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: [
        'memory-closure-trace',
        'runtime-derived-downstream-state',
        'fallback-memory-closure',
        'why-surfaced',
      ],
      memoryIdentity: explicitMemoryIdentity,
      summary: `explicit ${affectedLane} causality for 铃兰-Phase1-0621F`,
    })
    const buildBundle = (
      memoryIdentity: typeof explicitMemoryIdentity,
      reasonTags: string[],
      summary: string,
    ) => ({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 100,
      summary,
      emotionalTransitionLedger: {
        version: 'emotional-transition-ledger-v1',
        createdAt: 100,
        turnId: 'turn-explicit-closure-identity',
        previousEmotion: null,
        nextEmotion: 'measured-companionship',
        transitionKind: 'softened',
        axisDeltas: {
          valence: 0.04,
          arousal: -0.08,
          guardedness: -0.04,
          closenessDrive: 0.02,
          repairNeed: -0.03,
          initiativePressure: -0.06,
        },
        changedAxes: ['arousal', 'repairNeed', 'initiativePressure'],
        sourceTags: reasonTags,
        decayPolicy: {
          mode: 'decay-normally',
          carryTtlMs: 1800000,
          reason: summary,
        },
        memoryWriteback: {
          shouldWrite: true,
          lane: 'emotional-continuity',
          reason: summary,
        },
        initiativeSuppression: {
          shouldSuppress: false,
          mode: 'measured-return',
          reason: summary,
          memoryClosureCausality: {
            ...explicitCausality('initiative'),
            memoryIdentity,
            reasonTags,
          },
        },
        embodimentDrive: {
          shouldDrive: true,
          tone: 'measured-return',
          reason: summary,
        },
        selfRevisionCandidate: {
          shouldPropose: false,
          domain: 'dialogue-style',
          reasonCodes: [],
          summary: null,
          projectStateContinuity: {},
        },
        traceSummary: summary,
        replayLine: summary,
        memoryClosureCausality: {
          ...explicitCausality('emotion'),
          memoryIdentity,
          reasonTags,
        },
      },
      embodimentContinuityLedger: {
        version: 'embodiment-continuity-ledger-v1',
        createdAt: 100,
        turnId: 'turn-explicit-closure-identity',
        carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
        droppedLanes: [],
        rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
        pendingRejoinLanes: [],
        continuityPhase: 'fully-rejoined',
        memoryWriteback: {
          shouldWrite: true,
          lane: 'cross-modal-continuity',
          reason: summary,
        },
        selfRevisionCandidate: {
          shouldPropose: false,
          reasonCodes: [],
          summary: null,
        },
        traceSummary: summary,
        replayLine: summary,
        sourceTags: reasonTags,
        memoryClosureCausality: {
          ...explicitCausality('embodiment'),
          memoryIdentity,
          reasonTags,
        },
      },
      learningExecutionState: {
        currentTaskId: null,
        currentStatus: null,
        currentAttemptCount: 0,
        currentMaxAttempts: 0,
        currentNextRetryAt: null,
        currentBlockedReason: null,
        currentFailureKind: null,
        nextLearningAction: 'verify',
        shouldRecord: false,
        shouldReflect: true,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['memory-closure', 'execution-callback', '铃兰-Phase1-0621F'],
        queuedTaskCount: 0,
        runningTaskCount: 0,
        blockedTaskCount: 0,
        recentTaskIds: [],
        lastCompletedTaskId: null,
        lastCompletedAction: null,
        lastCompletedSummary: summary,
        lastFailureTaskId: null,
        lastFailureKind: null,
        lastFailureReason: null,
        lastFailureNextRetryAt: null,
        updatedAt: 100,
        memoryClosureCausality: {
          ...explicitCausality('execution'),
          memoryIdentity,
          reasonTags,
        },
      },
    })
    const genericMemoryIdentity = {
      selectedCandidateIds: [],
      continuityKey: 'cluster:2026-w25:during:2026-w25:strongest',
      reasonTags: ['memory-identity:cluster:2026-w25:during:2026-w25:strongest'],
    }

    const records = buildAlicizationMemoryDecisionTraceRecords([
      {
        id: 'evt-governance-explicit-closure-identity',
        decisionTraceId: 'mind:test:explicit-closure-identity',
        turnId: 'turn-explicit-closure-identity',
        sessionId: 'session-explicit-closure-identity',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          derivedMindStateBundle: buildBundle(
            explicitMemoryIdentity,
            ['memory-closure-trace', 'runtime-derived-downstream-state', 'fallback-memory-closure', 'why-surfaced'],
            'fallback memory closure carried 铃兰-Phase1-0621F into downstream state',
          ),
        },
        createdAt: 100,
      } as any,
      {
        id: 'evt-dialogue-generic-inward-closure-identity',
        decisionTraceId: 'mind:test:explicit-closure-identity',
        turnId: 'turn-explicit-closure-identity',
        sessionId: 'session-explicit-closure-identity',
        origin: 'user-turn',
        kind: 'dialogue-emitted',
        payload: {
          derivedMindStateBundle: buildBundle(
            genericMemoryIdentity,
            ['memory-closure-trace', 'runtime-derived-downstream-state', 'memory-os-authority', 'closure:grounded-recall', 'gate:inward-only'],
            'generic inward cluster stayed available but should not replace explicit fallback closure identity',
          ),
        },
        createdAt: 110,
      } as any,
    ])

    expect(records[0]?.derivedMindStateBundle?.learningExecutionState?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('fallback:铃兰-phase1-0621f')
    expect(records[0]?.derivedMindStateBundle?.emotionalTransitionLedger?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('fallback:铃兰-phase1-0621f')
    expect(records[0]?.derivedMindStateBundle?.embodimentContinuityLedger?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('fallback:铃兰-phase1-0621f')
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

  it('keeps cross-modal embodiment lane authority so noisy desktop replay can verify voice motion lipsync and body stay on one identity-continuity', () => {
    const records = buildAlicizationMemoryDecisionTraceRecords([
      {
        id: 'evt-dialogue-cross-modal-1',
        decisionTraceId: 'mind:test:cross-modal-embodiment-authority',
        turnId: 'turn-cross-modal-embodiment-authority-1',
        sessionId: 'session-cross-modal-embodiment-authority',
        origin: 'user-turn',
        kind: 'dialogue-emitted',
        payload: {
          emotion: 'thinking',
          digitalLife: {
            emotion: 'thinking',
            mode: 'speaking',
            voice: {
              residentMode: 'measured-return',
            },
            face: {
              residentMode: 'measured-return',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
            },
            motion: {
              residentMode: 'measured-return',
            },
            lipSync: {
              residentMode: 'measured-return',
            },
            bodyContinuity: {
              bodyLine: 'voice, face, motion, lipsync, and body remain lower-pressure on the identity-continuity',
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
            },
          },
          embodimentScript: {
            rendererTarget: 'vrm',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0.3,
              residentMode: 'measured-return',
            },
            speechPlan: {
              segmentCount: 1,
              interruptPolicy: 'soft-settle',
            },
          },
        },
        createdAt: 220,
      } as any,
    ])

    expect(records[0]?.embodimentAuthority?.digitalLife).toEqual(expect.objectContaining({
      voice: expect.objectContaining({
        residentMode: 'measured-return',
      }),
      face: expect.objectContaining({
        residentMode: 'measured-return',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
      }),
      motion: expect.objectContaining({
        residentMode: 'measured-return',
      }),
      lipSync: expect.objectContaining({
        residentMode: 'measured-return',
      }),
      bodyContinuity: expect.objectContaining({
        bodyLine: expect.stringContaining('identity-continuity'),
      }),
    }))
    expect(records[0]?.embodimentAuthority?.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
  })

  it('recovers cross-modal embodiment authority from persisted turn events when dialogue emission is unavailable', () => {
    const records = buildAlicizationMemoryDecisionTraceRecords([
      {
        id: 'evt-governance-cross-modal-1',
        decisionTraceId: 'mind:test:persisted-cross-modal-authority',
        turnId: 'turn-persisted-cross-modal-authority-1',
        sessionId: 'session-persisted-cross-modal-authority',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: {
          truthState: 'remembered',
          digitalLife: {
            emotion: 'thinking',
            mode: 'speaking',
            voice: { residentMode: 'measured-return' },
            face: {
              residentMode: 'measured-return',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
            },
            motion: { residentMode: 'measured-return' },
            lipSync: { residentMode: 'measured-return' },
            bodyContinuity: {
              bodyLine: 'voice face motion lipsync and body stay on the same-her memory callback line',
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
            },
          },
          embodimentScript: {
            rendererTarget: 'live2d',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0.3,
              residentMode: 'measured-return',
            },
            speechPlan: {
              segmentCount: 1,
              interruptPolicy: 'soft-settle',
            },
          },
          visibleReply: {
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
          },
        },
        createdAt: 300,
      } as any,
      {
        id: 'evt-persistence-cross-modal-1',
        decisionTraceId: 'mind:test:persisted-cross-modal-authority',
        turnId: 'turn-persisted-cross-modal-authority-1',
        sessionId: 'session-persisted-cross-modal-authority',
        origin: 'user-turn',
        kind: 'persistence-written',
        payload: {
          format: 'mind-turn-v1',
        },
        createdAt: 301,
      } as any,
    ])

    expect(records[0]?.embodimentAuthority?.digitalLife).toEqual(expect.objectContaining({
      voice: expect.objectContaining({ residentMode: 'measured-return' }),
      face: expect.objectContaining({
        residentMode: 'measured-return',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
      }),
      motion: expect.objectContaining({ residentMode: 'measured-return' }),
      lipSync: expect.objectContaining({ residentMode: 'measured-return' }),
      bodyContinuity: expect.objectContaining({
        bodyLine: expect.stringContaining('same-her memory callback line'),
      }),
    }))
    expect(records[0]?.embodimentAuthority?.embodimentScript).toEqual(expect.objectContaining({
      rendererTarget: 'live2d',
      state: expect.objectContaining({
        residentMode: 'measured-return',
      }),
    }))
    expect(records[0]?.embodimentAuthority?.visibleReply).toEqual(expect.objectContaining({
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
    }))
  })
})
