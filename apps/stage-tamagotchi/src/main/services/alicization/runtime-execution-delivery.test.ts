import { describe, expect, it, vi } from 'vitest'

import { createAlicizationExecutionDeliveryRuntime } from './execution-delivery-runtime'
import { createAlicizationRuntimeExecutionDelivery } from './runtime-execution-delivery'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('runtime execution delivery', () => {
  it('persists and restores execution delivery state through runtime meta wiring', async () => {
    const meta = new Map<string, string>()
    const queueSubconsciousWake = vi.fn()
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    executionDeliveryRuntime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-1',
      channel: 'cli',
      status: 'completed',
      goal: 'run the command',
      summary: 'summary',
      outcome: 'ok',
      signature: 'thread-1:event',
      completedAt: 9_000,
    })

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake,
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async key => meta.get(key),
        setMetaValue: async (key, value) => {
          meta.set(key, value)
        },
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    await runtime.persistExecutionDeliveryState('default')
    expect(meta.get('execution_delivery_state_v1')).toContain('thread-1')

    const restoredRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const restored = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake,
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async key => meta.get(key),
        setMetaValue: async (key, value) => {
          meta.set(key, value)
        },
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: restoredRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const restoredState = await restored.restoreExecutionDeliveryState('default')
    expect(restoredState.pending).toHaveLength(1)
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-restore', 240)
  })

  it('queues a settled execution callback candidate and emits audit/sync hooks', async () => {
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const syncSessionMirrorFromCurrentCardState = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake,
      appendAuditLog,
      syncSessionMirrorFromCurrentCardState,
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [{
          id: 'event-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            stdout: 'all tests passed',
          },
        }],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const queued = await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread: {
        id: 'thread-1',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'run the command',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'summary',
        metadata: null,
        createdAt: 9_000,
        updatedAt: 9_500,
        lastEventAt: 9_500,
        completedAt: 9_500,
      } as any,
    })

    expect(queued?.threadId).toBe('thread-1')
    expect(syncSessionMirrorFromCurrentCardState).toHaveBeenCalledWith(expect.objectContaining({
      source: 'execution-delivery-queued',
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'queued',
    }), 'default')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery:thread-1', 240)
  })

  it('reuses the existing person-state projection from the current execution session snapshot', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Patch the runtime line.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | posture=restrained',
                  relationshipPosture: 'restrained',
                  openingGuidance: 'Repair the seam before leaning closer.',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: true,
                  restrained: true,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'space-first',
                    repairPosture: 'repair-first',
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(projection?.relationshipPosture).toBe('restrained')
    expect(projection?.openingGuidance).toContain('Repair the seam before leaning closer')
  })

  it('falls back to the current live same-her state when the execution session snapshot is missing lower-pressure continuity', async () => {
    const liveState = createDefaultVisualPresenceState(10_000)
    liveState.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      activeCandidateId: 'candidate-same-her-live',
      trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      relationshipDoctrine: 'steadiness before closeness',
      candidates: [{
        version: 'self-evolution-candidate-v1',
        id: 'candidate-same-her-live',
        status: 'active',
        sourceEventId: 'event-same-her-live',
        decisionTraceId: 'trace-same-her-live',
        sourceTurnId: 'turn-same-her-live',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-same-her-live',
          sourceEventId: 'event-same-her-live',
          sourceTurnId: 'turn-same-her-live',
          decisionTraceId: 'trace-same-her-live',
          domain: 'relationship',
          action: 'internalize',
          resultStatus: 'completed',
          lanes: ['relationship-posture'],
          memoryPolicy: {
            strictnessBias: 0,
            wrongThreadSuppressionBias: 0,
            provenanceLabelBias: 0,
            recallExpansionBias: 0,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0,
            hypothesisLabelBias: 0,
            specificityClampBias: 0,
            templateShellSuppressionBias: 0,
          },
          proactivePolicy: {
            restraintBias: 0.08,
            learningProposalBias: 0,
            actuationCooldownBias: 0.06,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'same-her-baseline'],
          summary: 'continuity=same-her-baseline | keep the return lower-pressure and slower than the visible opening impulse',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    } as any

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => liveState,
      buildHostPersonModel: async () => null,
      getActiveSelfEvolutionSnapshot: async () => liveState.selfEvolution as any,
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | posture=warm',
                  relationshipPosture: 'warm',
                  openingGuidance: 'Lean closer and raise the warmth immediately.',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: false,
                  restrained: false,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'warmth-first',
                    repairPosture: 'soften-first',
                  },
                },
                selfEvolution: null,
                derivedMindStateBundle: null,
              },
              agency: {},
              cognition: {},
            },
          },
        }),
      } as any,
    })

    expect(projection?.openingGuidance?.toLowerCase()).not.toContain('lean closer')
    expect(projection?.openingGuidance?.toLowerCase()).toContain('room to breathe')
    expect(projection?.relationshipDoctrine?.toLowerCase()).toContain('steadiness before closeness')
  })

  it('applies active same-her lower-pressure continuity when the current execution session surface drifts warmer than the active baseline', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
      getActiveSelfEvolutionCandidateId: async () => 'candidate-same-her-active',
      getActiveSelfRevisionStatePatch: async () => ({
        version: 'self-revision-state-patch-v1',
        id: 'patch-same-her-active',
        sourceEventId: 'event-same-her-active',
        sourceTurnId: 'turn-same-her-active',
        decisionTraceId: 'trace-same-her-active',
        domain: 'relationship',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['relationship-posture'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0.18,
          closenessCapBias: 0.22,
          warmthReleaseBias: 0.04,
        },
        responsePosture: {
          secondPassRequiredBias: 0,
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0.08,
          learningProposalBias: 0,
          actuationCooldownBias: 0.06,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
        summary: 'continuity=same-her-baseline | keep the return lower-pressure and slower than the visible opening impulse',
      }),
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | posture=warm',
                  relationshipPosture: 'warm',
                  openingGuidance: 'Lean closer and raise the warmth immediately.',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: false,
                  restrained: false,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'warmth-first',
                    repairPosture: 'soften-first',
                  },
                },
                selfEvolution: {
                  version: 'self-evolution-kernel-v1',
                  updatedAt: 9_000,
                  evolutionMomentum: 0.22,
                  learningReadiness: 0.18,
                  contradictionPressure: 0.04,
                  revisionPressure: 0.12,
                  autobiographicalStability: 0.66,
                  dominantTrajectory: 'stay close',
                  relationshipDoctrine: 'warmth first',
                  latestInflection: 'warmth first',
                  burdenLine: null,
                  trustMeaning: 'closer and quicker feels natural here',
                  nextLearningAction: 'hold',
                  nextLearningReason: 'hold',
                  shouldRecord: false,
                  shouldReflect: false,
                  shouldVerify: false,
                  shouldRevise: false,
                  shouldInternalize: false,
                  activeLearningFocuses: [],
                  sourceSignals: [],
                  summary: 'warmth first',
                },
                derivedMindStateBundle: null,
              },
              agency: {},
              cognition: {},
            },
          },
        }),
      } as any,
    })

    expect(projection?.relationshipPosture).toBe('restrained')
    expect(projection?.openingGuidance).toContain('same-her baseline')
    expect(projection?.openingGuidance).toContain('lower-pressure')
    expect(projection?.relationshipDoctrine?.toLowerCase()).toContain('lower-pressure')
  })

  it('builds a minimal same-her callback projection from the active continuity patch even when no runtime surface or host model is available', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
      getActiveSelfEvolutionCandidateId: async () => 'candidate-same-her-minimal',
      getActiveSelfRevisionStatePatch: async () => ({
        version: 'self-revision-state-patch-v1',
        id: 'patch-same-her-minimal',
        sourceEventId: 'event-same-her-minimal',
        sourceTurnId: 'turn-same-her-minimal',
        decisionTraceId: 'trace-same-her-minimal',
        domain: 'relationship',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['relationship-posture'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0.18,
          closenessCapBias: 0.22,
          warmthReleaseBias: 0.04,
        },
        responsePosture: {
          secondPassRequiredBias: 0,
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0.08,
          learningProposalBias: 0,
          actuationCooldownBias: 0.06,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        reasonCodes: ['domain:relationship', 'same-her-baseline'],
        summary: 'continuity=same-her-baseline | keep the return lower-pressure and slower than the visible opening impulse',
      }),
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: null,
    })

    expect(projection).toBeTruthy()
    expect(projection?.relationshipPosture).toBe('restrained')
    expect(projection?.openingGuidance).toContain('same-her baseline')
    expect(projection?.openingGuidance).toContain('lower-pressure')
    expect(projection?.preferredProactiveStyle).toBe('silent-observe')
  })

  it('keeps same-her lower-pressure opening guidance on gateway-authored execution callback structured payloads', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => JSON.stringify({
        thought: 'same-her callback delivery stays lower-pressure',
        emotion: 'thinking',
        reply: '我先把这条结果轻轻接回来给你：patched runtime line。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: raw => ({ performance: raw }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const structured = await runtime.generateExecutionCallbackStructuredWithGateway({
      cardId: 'default',
      channel: 'codex',
      completedAt: 10_000,
      decisionTraceId: 'trace-same-her',
      goal: 'Patch the runtime line.',
      outcome: 'patched runtime line',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'patched runtime line',
      threadId: 'thread-1',
      deliveryPolicy: {
        mode: 'deliver-now',
        tone: 'balanced',
        reasonTags: ['result-mode:deliver-now'],
      },
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep callback timing lower-pressure.',
        sensitivityText: 'Over-close callback warmth becomes pressure.',
        repairTriggerText: 'If closeness jumps too fast, reopen lighter.',
        burdenText: 'Focused work is crowded by extra callback warmth.',
        routineText: 'Execution callbacks land better when they stay exact and measured.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        },
      } as any,
    })

    expect(structured?.format).toBe('mind-turn-v1')
    expect((structured as any)?.proactive?.openingGuidance).toContain('same-her baseline')
    expect((structured as any)?.proactive?.openingGuidance).toContain('lower-pressure')
  })
})
