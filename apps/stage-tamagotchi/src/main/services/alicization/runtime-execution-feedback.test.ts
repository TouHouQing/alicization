import {
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { buildExecutionResultFeedbackOutcomeClosure as actualBuildExecutionResultFeedbackOutcomeClosure } from './outcome-reinforcement'
import { createAlicizationRuntimeExecutionFeedback } from './runtime-execution-feedback'

function withProactiveTaskOwnershipMetadata(
  metadata: Record<string, unknown> | null | undefined = {},
) {
  const normalizedMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {}
  const normalizedTask = normalizedMetadata.task && typeof normalizedMetadata.task === 'object' && !Array.isArray(normalizedMetadata.task)
    ? normalizedMetadata.task as Record<string, unknown>
    : {}

  return {
    ...normalizedMetadata,
    task: {
      ...normalizedTask,
      origin: 'proactive',
    },
  }
}

describe('runtime execution feedback', () => {
  it('settles a pending execution proposal feedback and updates the task thread', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '不用，先别做',
      readLatestAssistantMessageText: () => '',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => 'denied',
      deriveExecutionResultFeedbackKind: () => null,
      persistOutcomeClosure,
      appendAuditLog,
      alicizationDb: {
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          origin: 'user-turn',
          goal: 'run the patch',
          kind: 'task',
          status: 'needs-affirmation',
          selectedChannel: null,
          proposedChannel: 'codex',
          summary: 'proposal pending',
          metadata: {
            fabric: {
              affirmationReasonCodes: ['needs-confirmation'],
            },
          },
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: null,
        } as any],
        upsertTaskThread,
      },
    })

    const feedback = await runtime.settlePendingExecutionProposalFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(feedback).toBe('denied')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      status: 'cancelled',
      summary: 'execution-proposal-feedback:denied',
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'proposal-feedback-settled',
    }), 'card-1')
  })

  it('passes structured affective residue from stored execution runtime context into proposal feedback closure instead of dropping the pending execution feeling to consent prose only', async () => {
    const buildExecutionProposalFeedbackOutcomeClosure = vi.fn(input => input as any)
    const emotionalTransitionLedger = {
      version: 'emotional-transition-ledger-v1',
      createdAt: 82_200,
      turnId: 'turn-execution-proposal-ledger-1',
      previousEmotion: 'measured-companionship',
      nextEmotion: 'repair-tension',
      transitionKind: 'repair-shift',
      axisDeltas: {
        valence: -0.18,
        arousal: 0.24,
        guardedness: 0.31,
        closenessDrive: -0.29,
        repairNeed: 0.47,
        initiativePressure: -0.22,
      },
      changedAxes: ['arousal', 'guardedness', 'closenessDrive', 'repairNeed', 'initiativePressure'],
      sourceTags: ['proposal-boundary', 'execution-feedback'],
      decayPolicy: {
        mode: 'hold-until-repair-cools',
        carryTtlMs: 1_800_000,
        reason: 'Proposal repair should cool before another execution ask.',
      },
      memoryWriteback: {
        shouldWrite: true,
        lane: 'relationship-repair',
        reason: 'The proposal boundary should be remembered as repair pressure, not flat consent bookkeeping.',
      },
      initiativeSuppression: {
        shouldSuppress: true,
        mode: 'repair-first',
        reason: 'Lower execution initiative until the proposal boundary settles.',
      },
      embodimentDrive: {
        shouldDrive: true,
        tone: 'repair-before-closeness',
        reason: 'The body should show repair restraint while the execution ask is cooling.',
      },
      traceSummary: 'measured-companionship -> repair-tension; kind=repair-shift',
      replayLine: 'turn-execution-proposal-ledger-1 emotional-transition repair-shift',
    } as const
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '不用，先别做',
      readLatestAssistantMessageText: () => '',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => 'denied',
      deriveExecutionResultFeedbackKind: () => null,
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'run the patch',
          kind: 'task',
          status: 'needs-affirmation',
          selectedChannel: null,
          proposedChannel: 'codex',
          summary: 'proposal pending',
          metadata: {
            execution: {
              runtimeContext: {
                derivedMindStateBundle: {
                  version: 'derived-mind-state-bundle-v1',
                  source: 'browser-fallback',
                  producedAt: 82_200,
                  summary: 'execution proposal feedback carries emotional transition ledger',
                  emotionalTransitionLedger,
                },
                affectiveResidue: {
                  version: 'affective-residue-memory-v1',
                  updatedAt: 82_100,
                  residues: [{
                    kind: 'repair',
                    intensity: 0.74,
                    persistence: 0.76,
                    confidence: 0.88,
                    polarity: 'protective',
                    releaseMode: 'delay-until-open-window',
                    summary: 'The proposal boundary still wants a quieter re-approach.',
                    sourceSignals: ['proposal-boundary'],
                    lastUpdatedAt: 82_100,
                  }],
                  dominantResidueKind: 'repair',
                  afterglowPressure: 0.16,
                  repairPressure: 0.79,
                  burdenPressure: 0.12,
                  trustPressure: 0.38,
                  restProtectivePressure: 0.25,
                  relationshipCadence: {
                    cadenceMode: 'repair',
                    distancePosture: 'measured-room',
                    companionshipDensity: 0.37,
                    repairRecovery: 0.74,
                    overreachRisk: 0.27,
                    fatigueGuard: 0.2,
                    afterglowCarry: 0.23,
                    shouldDelayWarmth: true,
                    shouldProtectRest: false,
                    reasonTags: ['proposal-boundary'],
                    summary: 'Repair first before proposing again.',
                  },
                  sourceSignals: ['proposal-boundary'],
                  summary: 'The proposal boundary still carries repair pressure.',
                },
              },
            },
            fabric: {
              affirmationReasonCodes: ['needs-confirmation'],
            },
          },
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: null,
        } as any],
        upsertTaskThread: vi.fn(async () => ({})),
      },
    })

    await runtime.settlePendingExecutionProposalFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(buildExecutionProposalFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'repair',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'repair',
        }),
      }),
      emotionalTransitionLedger: expect.objectContaining({
        transitionKind: 'repair-shift',
        memoryWriteback: expect.objectContaining({
          lane: 'relationship-repair',
        }),
        initiativeSuppression: expect.objectContaining({
          mode: 'repair-first',
        }),
        embodimentDrive: expect.objectContaining({
          tone: 'repair-before-closeness',
        }),
      }),
    }))
  })

  it('ignores non-needs-affirmation threads when settling pending execution proposal feedback', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '先说别的，我现在想聊别的事',
      readLatestAssistantMessageText: () => '',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => 'interrupted',
      deriveExecutionResultFeedbackKind: () => null,
      persistOutcomeClosure,
      appendAuditLog,
      alicizationDb: {
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          origin: 'user-turn',
          goal: 'run the patch',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'patch applied',
          metadata: {
            fabric: {
              affirmationReasonCodes: ['needs-confirmation'],
            },
          },
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        upsertTaskThread,
      },
    })

    const feedback = await runtime.settlePendingExecutionProposalFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(feedback).toBeNull()
    expect(persistOutcomeClosure).not.toHaveBeenCalled()
    expect(upsertTaskThread).not.toHaveBeenCalled()
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('settles execution result feedback and writes result feedback metadata', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这次结果有用',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure,
      appendAuditLog,
      alicizationDb: {
        getLatestRelationshipDynamics: async () => ({
          hostAttitude: '之前还在观察她到底是不是只会机械报结果。',
        }),
        appendRelationshipDynamics,
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'run the patch',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'patch applied',
          metadata: withProactiveTaskOwnershipMetadata(),
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        upsertTaskThread,
      },
    })

    const feedback = await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(feedback).toBe('valued')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        execution: expect.objectContaining({
          resultFeedbackKind: 'valued',
          resultFeedbackSettledAt: 10,
        }),
      }),
    }))
    expect(appendRelationshipDynamics).toHaveBeenCalledWith(expect.objectContaining({
      hostAttitude: 'execution_feedback=valued; trust_delta=positive; reply_policy=continue_with_evidence; visibility=structured',
      previousHostAttitude: '之前还在观察她到底是不是只会机械报结果。',
      source: 'execution-result-feedback:valued',
      createdAt: 10,
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'result-feedback-settled',
    }), 'card-1')
  })

  it('reconsolidates execution result feedback from structured execution evidence', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async (_input: unknown) => {})
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个结果接得住',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      readTaskThreadActivityAt: (thread: { updatedAt?: unknown, createdAt?: unknown }) => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: (input: any) => input,
      buildExecutionProposalFeedbackOutcomeClosure: (input: any) => input as any,
      buildExecutionResultFeedbackOutcomeClosure: actualBuildExecutionResultFeedbackOutcomeClosure,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure,
      appendAuditLog,
      memoryReconsolidationRuntime: {
        reconsolidateExecutionResultFeedbackMemoryTrace,
      },
      alicizationDb: {
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics,
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'subconscious:thread-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'keep callback continuity alive',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'done',
          metadata: withProactiveTaskOwnershipMetadata(),
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        upsertTaskThread,
      },
    } as any)

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    const reconsolidationInput = reconsolidateExecutionResultFeedbackMemoryTrace.mock.calls[0]?.[0] as any
    expect(reconsolidationInput).toEqual(expect.objectContaining({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'valued',
      previousAssistantText: '结果已经回来',
      userText: '这个结果接得住',
      sessionId: 'session-1',
      turnId: 'subconscious:thread-1',
      at: 10,
      goal: 'keep callback continuity alive',
      outcome: 'done',
    }))
    expect(reconsolidationInput?.feedbackExperience).toEqual(expect.objectContaining({
      tags: expect.arrayContaining([
        'execution-result',
        'codex',
        'feedback:valued',
        'procedure-learning',
      ]),
    }))
    expect(upsertTaskThread).toHaveBeenCalled()
    expect(appendRelationshipDynamics).toHaveBeenCalled()
  })

  it('passes blocked-dispatch safety gate evidence from execution events into result feedback memory reconsolidation', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async (_input: unknown) => {})
    const listExecutionEvents = vi.fn(async () => [{
      id: 'event-result-1',
      threadId: 'thread-blocked-1',
      decisionTraceId: 'trace-blocked-1',
      turnId: 'subconscious:thread-blocked-1',
      sessionId: 'session-1',
      origin: 'subconscious-proactive',
      channel: 'codex',
      kind: 'result',
      threadStatus: 'blocked',
      payload: {
        safetyGate: {
          effect: 'mutate',
          permissionMode: 'none',
          confirmationRequired: true,
          riskPolicy: 'implicit-or-explicit-confirmation-required',
          auditability: 'blocked-before-dispatch',
          interruptibility: 'no-process-started',
        },
      },
      createdAt: 8,
    }])
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这次先拦住是对的，继续记住这个边界',
      readLatestAssistantMessageText: () => '我把这次执行拦下来了，没有启动进程',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      readTaskThreadActivityAt: (thread: { updatedAt?: unknown, createdAt?: unknown }) => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: (input: any) => input,
      buildExecutionProposalFeedbackOutcomeClosure: (input: any) => input as any,
      buildExecutionResultFeedbackOutcomeClosure: (input: any) => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure,
      appendAuditLog,
      memoryReconsolidationRuntime: {
        reconsolidateExecutionResultFeedbackMemoryTrace,
      },
      alicizationDb: {
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics,
        listExecutionEvents,
        listTaskThreads: async () => [{
          id: 'thread-blocked-1',
          decisionTraceId: 'trace-blocked-1',
          turnId: 'subconscious:thread-blocked-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'try a risky local file mutation',
          kind: 'task',
          status: 'blocked',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'blocked before dispatch by safety gate',
          metadata: {},
          createdAt: 1,
          updatedAt: 8,
          lastEventAt: 8,
          completedAt: 8,
        } as any],
        upsertTaskThread,
      },
    } as any)

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(listExecutionEvents).toHaveBeenCalledWith({
      threadId: 'thread-blocked-1',
      limit: 6,
    })
    expect(persistOutcomeClosure).toHaveBeenCalledWith('card-1', expect.objectContaining({
      thread: expect.objectContaining({
        safetyGateSummary: 'effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
      }),
    }))
    expect(reconsolidateExecutionResultFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      decisionTraceId: 'trace-blocked-1',
      feedback: 'valued',
      safetyGateSummary: 'effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
    }))
  })

  it('passes host-confirmed resume evidence from execution events into result feedback memory reconsolidation', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async (_input: unknown) => {})
    const listExecutionEvents = vi.fn(async () => [
      {
        id: 'event-resume-1',
        threadId: 'thread-resume-1',
        decisionTraceId: 'trace-resume-1',
        turnId: 'subconscious:thread-resume-1',
        sessionId: 'session-1',
        origin: 'subconscious-proactive',
        channel: 'codex',
        kind: 'resume',
        threadStatus: 'planned',
        payload: {
          approval: 'host-confirmed',
          previousStatus: 'needs-affirmation',
          resumedStatus: 'planned',
          previousPermissionMode: 'none',
          permissionMode: 'explicit',
          effect: 'mutate',
          riskBudget: 'medium',
          affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
          confirmationBoundary: 'host-confirmed-before-redispatch',
          auditability: 'resume-before-dispatch',
          interruptibility: 'process-not-yet-restarted',
        },
        createdAt: 8,
      },
      {
        id: 'event-result-1',
        threadId: 'thread-resume-1',
        decisionTraceId: 'trace-resume-1',
        turnId: 'subconscious:thread-resume-1',
        sessionId: 'session-1',
        origin: 'subconscious-proactive',
        channel: 'codex',
        kind: 'result',
        threadStatus: 'completed',
        payload: {
          summary: 'resumed execution completed after host confirmation',
        },
        createdAt: 12,
      },
    ])
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '确认之后继续执行这点要记住',
      readLatestAssistantMessageText: () => '宿主确认后我恢复执行并完成了',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      readTaskThreadActivityAt: (thread: { updatedAt?: unknown, createdAt?: unknown }) => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: (input: any) => input,
      buildExecutionProposalFeedbackOutcomeClosure: (input: any) => input as any,
      buildExecutionResultFeedbackOutcomeClosure: (input: any) => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure,
      appendAuditLog,
      memoryReconsolidationRuntime: {
        reconsolidateExecutionResultFeedbackMemoryTrace,
      },
      alicizationDb: {
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics,
        listExecutionEvents,
        listTaskThreads: async () => [{
          id: 'thread-resume-1',
          decisionTraceId: 'trace-resume-1',
          turnId: 'subconscious:thread-resume-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'resume confirmed local execution',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'resumed execution completed after host confirmation',
          metadata: {},
          createdAt: 1,
          updatedAt: 12,
          lastEventAt: 12,
          completedAt: 12,
        } as any],
        upsertTaskThread,
      },
    } as any)

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 14, 'test')

    expect(persistOutcomeClosure).toHaveBeenCalledWith('card-1', expect.objectContaining({
      thread: expect.objectContaining({
        resumeConfirmationSummary: 'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
      }),
    }))
    expect(reconsolidateExecutionResultFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      decisionTraceId: 'trace-resume-1',
      feedback: 'valued',
      resumeConfirmationSummary: 'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
    }))
  })

  it('settles execution result feedback for origin-lost autonomous threads when the turn id still carries subconscious family markers', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这次结果有用',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure,
      appendAuditLog,
      alicizationDb: {
        getLatestRelationshipDynamics: async () => ({
          hostAttitude: '之前还在观察她到底是不是只会机械报结果。',
        }),
        appendRelationshipDynamics,
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'subconscious:thread-1',
          sessionId: 'session-1',
          origin: 'user-turn',
          goal: 'run the patch',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'patch applied',
          metadata: {},
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        upsertTaskThread,
      },
    })

    const feedback = await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(feedback).toBe('valued')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      turnId: 'subconscious:thread-1',
      metadata: expect.objectContaining({
        execution: expect.objectContaining({
          resultFeedbackKind: 'valued',
          resultFeedbackSettledAt: 10,
        }),
      }),
    }))
    expect(appendRelationshipDynamics).toHaveBeenCalledWith(expect.objectContaining({
      source: 'execution-result-feedback:valued',
      createdAt: 10,
    }))
  })

  it('ignores origin-only proactive execution threads when no subconscious turn-id ownership survives', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这次结果有用',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure,
      appendAuditLog,
      alicizationDb: {
        getLatestRelationshipDynamics: async () => ({
          hostAttitude: '之前还在观察她到底是不是只会机械报结果。',
        }),
        appendRelationshipDynamics,
        listTaskThreads: async () => [{
          id: 'thread-origin-only-spoof-1',
          decisionTraceId: 'trace-origin-only-spoof-1',
          turnId: 'turn-origin-only-spoof-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'run the patch',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'patch applied',
          metadata: {},
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        upsertTaskThread,
      },
    })

    const feedback = await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(feedback).toBeNull()
    expect(persistOutcomeClosure).not.toHaveBeenCalled()
    expect(upsertTaskThread).not.toHaveBeenCalled()
    expect(appendRelationshipDynamics).not.toHaveBeenCalled()
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('settles execution result feedback for legitimate proactive task threads when ownership survives through metadata.task.origin', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个结果接得住',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure,
      appendAuditLog,
      alicizationDb: {
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics,
        listTaskThreads: async () => [{
          id: 'thread-proactive-metadata-1',
          decisionTraceId: 'trace-proactive-metadata-1',
          turnId: 'autonomy-task:callback-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'keep callback continuity alive',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'done',
          metadata: withProactiveTaskOwnershipMetadata(),
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        upsertTaskThread,
      },
    })

    const feedback = await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(feedback).toBe('valued')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      id: 'thread-proactive-metadata-1',
      metadata: expect.objectContaining({
        task: expect.objectContaining({
          origin: 'proactive',
        }),
        execution: expect.objectContaining({
          resultFeedbackKind: 'valued',
          resultFeedbackSettledAt: 10,
        }),
      }),
    }))
    expect(appendRelationshipDynamics).toHaveBeenCalled()
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'result-feedback-settled',
    }), 'card-1')
  })

  it('passes structured affective residue from stored execution runtime context into result feedback closure instead of dropping callback emotion to plain result prose', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
    const emotionalTransitionLedger = {
      version: 'emotional-transition-ledger-v1',
      createdAt: 88_200,
      turnId: 'turn-execution-result-ledger-1',
      previousEmotion: 'repair-tension',
      nextEmotion: 'measured-companionship',
      transitionKind: 'softened',
      axisDeltas: {
        valence: 0.14,
        arousal: -0.21,
        guardedness: -0.17,
        closenessDrive: 0.2,
        repairNeed: -0.11,
        initiativePressure: 0.09,
      },
      changedAxes: ['valence', 'arousal', 'guardedness', 'closenessDrive', 'repairNeed', 'initiativePressure'],
      sourceTags: ['execution-callback-afterglow', 'result-feedback'],
      decayPolicy: {
        mode: 'decay-normally',
        carryTtlMs: 300_000,
        reason: 'A softened execution result can decay normally.',
      },
      memoryWriteback: {
        shouldWrite: true,
        lane: 'emotional-continuity',
        reason: 'The softened result should remain available as continuity evidence.',
      },
      initiativeSuppression: {
        shouldSuppress: false,
        mode: 'none',
        reason: 'The softened result does not need initiative suppression.',
      },
      embodimentDrive: {
        shouldDrive: true,
        tone: 'measured-return',
        reason: 'The body should settle into measured-return after the result lands.',
      },
      traceSummary: 'repair-tension -> measured-companionship; kind=softened',
      replayLine: 'turn-execution-result-ledger-1 emotional-transition softened',
    } as const
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个结果接得住',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'keep callback continuity alive',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'done',
          metadata: withProactiveTaskOwnershipMetadata({
            execution: {
              runtimeContext: {
                derivedMindStateBundle: {
                  version: 'derived-mind-state-bundle-v1',
                  source: 'browser-fallback',
                  producedAt: 88_200,
                  summary: 'execution result feedback carries emotional transition ledger',
                  emotionalTransitionLedger,
                },
                affectiveResidue: {
                  version: 'affective-residue-memory-v1',
                  updatedAt: 88_100,
                  residues: [{
                    kind: 'afterglow',
                    intensity: 0.66,
                    persistence: 0.71,
                    confidence: 0.84,
                    polarity: 'warm',
                    releaseMode: 'delay-until-open-window',
                    summary: 'The callback still wants a measured same-line return.',
                    sourceSignals: ['execution-callback-afterglow'],
                    lastUpdatedAt: 88_100,
                  }],
                  dominantResidueKind: 'afterglow',
                  afterglowPressure: 0.68,
                  repairPressure: 0.22,
                  burdenPressure: 0.09,
                  trustPressure: 0.47,
                  restProtectivePressure: 0.18,
                  relationshipCadence: {
                    cadenceMode: 'measured-return',
                    distancePosture: 'measured-room',
                    companionshipDensity: 0.52,
                    repairRecovery: 0.31,
                    overreachRisk: 0.36,
                    fatigueGuard: 0.19,
                    afterglowCarry: 0.62,
                    shouldDelayWarmth: true,
                    shouldProtectRest: false,
                    reasonTags: ['execution-callback-afterglow'],
                    summary: 'Leave measured room before reopening the callback.',
                  },
                  sourceSignals: ['execution-callback-afterglow'],
                  summary: 'The callback still wants a measured return.',
                },
              },
            },
          }),
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        upsertTaskThread: vi.fn(async () => ({})),
      },
    })

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
        }),
      }),
      emotionalTransitionLedger: expect.objectContaining({
        transitionKind: 'softened',
        memoryWriteback: expect.objectContaining({
          lane: 'emotional-continuity',
        }),
        embodimentDrive: expect.objectContaining({
          tone: 'measured-return',
        }),
      }),
    }))
  })

  it('writes a normalizable runtime context without project briefing metadata', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个结果接得住',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'keep callback continuity alive',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'done',
          metadata: withProactiveTaskOwnershipMetadata({
            execution: {},
          }),
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        upsertTaskThread,
      },
    })

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    const upsertTaskThreadCalls = upsertTaskThread.mock.calls as unknown as Array<[any]>
    const upsertedThread = upsertTaskThreadCalls[0]?.[0]
    const runtimeContext = normalizeAlicizationExecutionRuntimeContext(upsertedThread?.metadata?.execution?.runtimeContext)

    expect(runtimeContext).toEqual(expect.objectContaining({
      generatedAt: 10,
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      sensory: expect.objectContaining({
        running: false,
        stale: true,
      }),
    }))
  })

  it('persists structured affective residue back onto the task thread execution runtime context so later memory closure can still read callback emotion structurally', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个结果接得住',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure: input => input as any,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        listTaskThreads: async () => [{
          id: 'thread-1',
          decisionTraceId: 'trace-1',
          turnId: 'turn-1',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'keep callback continuity alive',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'done',
          metadata: withProactiveTaskOwnershipMetadata({
            execution: {
              runtimeContext: {
                affectiveResidue: {
                  version: 'affective-residue-memory-v1',
                  updatedAt: 91_100,
                  residues: [{
                    kind: 'afterglow',
                    intensity: 0.69,
                    persistence: 0.7,
                    confidence: 0.86,
                    polarity: 'warm',
                    releaseMode: 'delay-until-open-window',
                    summary: 'The callback still wants a measured same-line return.',
                    sourceSignals: ['execution-callback-afterglow'],
                    lastUpdatedAt: 91_100,
                  }],
                  dominantResidueKind: 'afterglow',
                  afterglowPressure: 0.71,
                  repairPressure: 0.19,
                  burdenPressure: 0.06,
                  trustPressure: 0.45,
                  restProtectivePressure: 0.12,
                  relationshipCadence: {
                    cadenceMode: 'measured-return',
                    distancePosture: 'measured-room',
                    companionshipDensity: 0.5,
                    repairRecovery: 0.28,
                    overreachRisk: 0.34,
                    fatigueGuard: 0.17,
                    afterglowCarry: 0.64,
                    shouldDelayWarmth: true,
                    shouldProtectRest: false,
                    reasonTags: ['execution-callback-afterglow'],
                    summary: 'Leave measured room before reopening the callback.',
                  },
                  sourceSignals: ['execution-callback-afterglow'],
                  summary: 'The callback still wants a measured return.',
                },
              },
            },
          }),
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        upsertTaskThread,
      },
    })

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    const upsertTaskThreadCalls = upsertTaskThread.mock.calls as unknown as Array<[any]>
    const upsertedThread = upsertTaskThreadCalls[0]?.[0]
    const runtimeContext = normalizeAlicizationExecutionRuntimeContext(upsertedThread?.metadata?.execution?.runtimeContext)

    expect(runtimeContext).toEqual(expect.objectContaining({
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
        }),
      }),
    }))
  })

  it('passes Memory OS execution closure carry into result feedback closure and reconsolidation so callbacks remember why they must verify and reflect', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async (_input: unknown) => {})
    const memoryClosureExecution = {
      authority: 'memory-os',
      carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldReflect: true,
      activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
      reasonTags: ['memory-os', 'execution-feedback', 'same-person-callback'],
      closureState: {
        state: 'open',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: true,
        visibleCarryMode: 'tone',
        retrievalQuality: 'grounded',
        conflictPressure: 'low',
      },
    }
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个执行结果接得住，但下次要核一下',
      readLatestAssistantMessageText: () => '结果已经回来',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      readTaskThreadActivityAt: thread => Number(thread.updatedAt ?? thread.createdAt ?? 0),
      attachSynthesizedReflections: input => input,
      buildExecutionProposalFeedbackOutcomeClosure: input => input as any,
      buildExecutionResultFeedbackOutcomeClosure,
      deriveExecutionProposalFeedbackKind: () => null,
      deriveExecutionResultFeedbackKind: () => 'valued',
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      memoryReconsolidationRuntime: {
        reconsolidateExecutionResultFeedbackMemoryTrace,
      },
      alicizationDb: {
        listTaskThreads: async () => [{
          id: 'thread-memory-os-execution',
          decisionTraceId: 'trace-memory-os-execution',
          turnId: 'turn-memory-os-execution',
          sessionId: 'session-1',
          origin: 'subconscious-proactive',
          goal: 'keep Memory OS execution callback continuity alive',
          kind: 'task',
          status: 'completed',
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: 'callback result returned',
          metadata: withProactiveTaskOwnershipMetadata({
            execution: {
              runtimeContext: {
                generatedAt: 9,
                decisionTraceId: 'trace-memory-os-execution',
                turnId: 'turn-memory-os-execution',
                sessionId: 'session-1',
                memoryClosureExecution,
                sensory: {
                  collectedAt: 9,
                  running: false,
                  stale: true,
                  ageMs: 0,
                  foregroundWindow: null,
                  capture: null,
                },
              },
            },
          }),
          createdAt: 1,
          updatedAt: 2,
          lastEventAt: 2,
          completedAt: 2,
        } as any],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        upsertTaskThread,
      },
    })

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        memoryClosureExecution: expect.objectContaining({
          authority: 'memory-os',
          carry: expect.stringContaining('Carry the callback result into the next same-person reply'),
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
        }),
      }),
    }))
    expect(reconsolidateExecutionResultFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
      memoryClosureExecution: expect.objectContaining({
        authority: 'memory-os',
        carry: expect.stringContaining('Carry the callback result into the next same-person reply'),
        nextLearningAction: 'verify',
        shouldVerify: true,
        shouldReflect: true,
      }),
    }))

    const upsertedThread = (upsertTaskThread.mock.calls as unknown as Array<[any]>)[0]?.[0]
    const runtimeContext = normalizeAlicizationExecutionRuntimeContext(upsertedThread?.metadata?.execution?.runtimeContext)
    expect(runtimeContext?.memoryClosureExecution).toEqual(memoryClosureExecution)
  })
})
