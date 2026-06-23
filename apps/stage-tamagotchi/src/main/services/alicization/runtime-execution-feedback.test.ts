import { normalizeAlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'
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
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'proposal-feedback-settled',
    }), 'card-1')
  })

  it('passes same-her project briefing into execution proposal feedback closure before proactive action proceeds', async () => {
    const buildExecutionProposalFeedbackOutcomeClosure = vi.fn(input => input as any)
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution planning already carries project identity before host confirmation.',
                  primaryOpenLoop: 'Execution proposal feedback still needs to keep same-her project closure before action proceeds.',
                  proactiveSameHerGap: 'Proposal feedback still needs stronger proof that proactive same-her carry survives host confirmation turns without collapsing into generic consent bookkeeping.',
                  nextClosureTarget: 'older narrower proposal closure target',
                  sameHerSelfLine: 'older narrower proposal self-line only',
                  sameHerDriftRisk: 'Pending proposal feedback can collapse into generic consent bookkeeping.',
                  preflightSummary: 'Re-anchor on project identity before asking to execute.',
                  preDialogueAwarenessLine: 'older narrower proposal awareness line',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        ],
      },
    } as any, 10, 'test')

    expect(buildExecutionProposalFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        affirmationReasonCodes: ['needs-confirmation'],
        userText: '不用，先别做',
        projectBriefing: expect.objectContaining({
          identity: expect.stringContaining('Alicization is a local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
          latestLandedProgress: expect.stringContaining('Execution planning already carries project identity'),
          primaryOpenLoop: expect.stringContaining('Execution proposal feedback still needs to keep same-her project closure'),
          proactiveSameHerGap: 'Proposal feedback still needs stronger proof that proactive same-her carry survives host confirmation turns without collapsing into generic consent bookkeeping.',
          nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
          sameHerSelfLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
          sameHerDriftRisk: expect.stringContaining('Pending proposal feedback can collapse'),
        }),
      }),
    }))
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
      selfRevisionCandidate: {
        shouldPropose: true,
        domain: 'proactive-policy',
        reasonCodes: ['proposal-boundary', 'repair-first'],
        summary: 'Execution proposals should reopen lower-pressure after a boundary.',
        projectStateContinuity: {
          sameHerSelfLine: 'Same Phase 1 digital life.',
          sameHerDriftRisk: 'Execution can flatten into consent bookkeeping.',
          proactiveSameHerGap: 'Do not re-ask before repair cools.',
          emotionalClosureCue: 'repair-before-closeness',
          sameHerHoldDetail: 'Hold execution initiative and body in repair-first cadence.',
          continuityGuard: 'Do not split execution, emotion, initiative, and embodiment.',
        },
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
      hostAttitude: expect.stringContaining('开始更相信 Alicization 的执行回报是有用且接得住当下需要的'),
      previousHostAttitude: '之前还在观察她到底是不是只会机械报结果。',
      source: 'execution-result-feedback:valued',
      createdAt: 10,
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'result-feedback-settled',
    }), 'card-1')
  })

  it('reconsolidates execution result feedback into memory with the merged same-her project briefing instead of stopping at thread metadata', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async () => {})
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
          metadata: {
            execution: {
              runtimeContext: {
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
                  primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
                  nextClosureTarget: 'older narrower next closure target',
                  sameHerSelfLine: 'older narrower body-line carry only',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
                  preDialogueAwarenessLine: 'older narrower awareness line',
                },
              },
            },
          },
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        ],
      },
    } as any, 10, 'test')

    expect(reconsolidateExecutionResultFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
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
      feedbackExperience: expect.objectContaining({
        felt: 'I felt the result become something genuinely useful to the host.',
        relationshipMeaning: expect.stringContaining('useful and worth repeating'),
        lesson: expect.stringContaining('same-her Phase 1'),
        tags: expect.arrayContaining([
          'execution-result',
          'codex',
          'feedback:valued',
          'phase-1-local-digital-life',
          'same-her',
          'closure-carry',
        ]),
      }),
      projectBriefing: expect.objectContaining({
        preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        sameHerSelfLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        sameHerDriftRisk: expect.stringContaining('Thin execution summaries can flatten'),
      }),
    }))
    expect(upsertTaskThread).toHaveBeenCalled()
    expect(appendRelationshipDynamics).toHaveBeenCalled()
  })

  it('passes blocked-dispatch safety gate evidence from execution events into result feedback memory reconsolidation', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async () => {})
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
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async () => {})
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

  it('re-normalizes missing pre-dialogue project awareness before settling execution feedback so auxiliary execution paths cannot skip the same-her project brief', async () => {
    const appendAuditLog = vi.fn(async () => {})
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
      preDialogueSendIdentity: null,
    } as any
    const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(
      resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload),
    )
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
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog,
      alicizationDb: {
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
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        upsertTaskThread: vi.fn(async () => ({})),
      },
    })

    await runtime.settlePendingExecutionProposalFeedbackFromUserTurn(payload, 10, 'test')

    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        preDialogueAwarenessStatus: expectedDebug?.preDialogueAwarenessStatus,
        preDialogueAwarenessLine: expectedDebug?.preDialogueAwarenessLine,
        preDialogueCompanionBriefingLine: expectedDebug?.preDialogueCompanionBriefingLine,
      }),
    }), 'card-1')
  })

  it('re-normalizes a thin pre-dialogue summary shell before settling execution-result feedback so callback continuity stays same-her instead of task-shell shaped', async () => {
    const appendAuditLog = vi.fn(async () => {})
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)
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
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog,
      alicizationDb: {
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
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics: vi.fn(async () => {}),
        upsertTaskThread: vi.fn(async () => ({})),
      },
    })

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn(payload, 10, 'test')

    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        preDialogueAwarenessStatus: expectedDebug?.preDialogueAwarenessStatus,
        preDialogueAwarenessLine: expectedDebug?.preDialogueAwarenessLine,
        preDialogueCompanionBriefingLine: expectedDebug?.preDialogueCompanionBriefingLine,
      }),
    }), 'card-1')
    const auditCalls = appendAuditLog.mock.calls as unknown[][]
    const settledPayload = (auditCalls.at(-1)?.[0] as { payload?: unknown } | undefined)?.payload as {
      preDialogueAwarenessLine?: string
    } | undefined
    expect(settledPayload?.preDialogueAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('passes structured execution project briefing into result feedback closure so Phase 1 open-loop carry does not depend on thin summary text', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个结果有用',
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
                  primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
                  nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
                  sameHerSelfLine: 'She must remain one persisting her instead of a task shell.',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
                  preDialogueAwarenessLine: 'Before reopening, remember what Alicization is, what Phase 1 has landed, and what is still open.',
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
      thread: expect.objectContaining({
        summary: 'done',
        outcome: 'done',
        previousAssistantText: '结果已经回来',
        userText: '这个结果有用',
        projectBriefing: expect.objectContaining({
          identity: expect.stringContaining('local-first digital life project'),
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: expect.stringContaining('canonical project briefing before tool use starts'),
          primaryOpenLoop: expect.stringContaining('Execution-result feedback still needs to preserve same-her closure'),
          nextClosureTarget: expect.stringContaining('Keep extending cross-modal same-her proof'),
          sameHerSelfLine: 'She must remain one persisting her instead of a task shell.',
          sameHerDriftRisk: expect.stringContaining('Thin execution summaries can flatten'),
          preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
          preDialogueAwarenessLine: expect.stringContaining('Before answering, remember: Alicization is a local-first digital life project'),
        }),
      }),
    }))
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
      selfRevisionCandidate: {
        shouldPropose: false,
        domain: 'dialogue-style',
        reasonCodes: ['measured-return'],
        summary: null,
        projectStateContinuity: {
          sameHerSelfLine: null,
          sameHerDriftRisk: null,
          proactiveSameHerGap: null,
          emotionalClosureCue: null,
          sameHerHoldDetail: null,
          continuityGuard: null,
        },
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

  it('prefers richer normalized pre-dialogue same-her carry over a narrower stored thread briefing when settling execution-result feedback', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
                  primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
                  nextClosureTarget: 'older narrower next closure target',
                  sameHerSelfLine: 'older narrower body-line carry only',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
                  preDialogueAwarenessLine: 'older narrower awareness line',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        ],
      },
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
          sameHerSelfLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
          latestLandedProgress: expect.stringContaining('Execution already carries a canonical project briefing before tool use starts'),
          primaryOpenLoop: expect.stringContaining('Execution-result feedback still needs to preserve same-her closure'),
          nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
          sameHerDriftRisk: expect.stringContaining('Thin execution summaries can flatten'),
        }),
      }),
    }))
  })

  it('persists merged execution-result project briefing back onto the task thread runtime context', async () => {
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
                generatedAt: 1_710_000_000_000,
                sensory: {
                  collectedAt: 1_710_000_000_000,
                  running: false,
                  stale: true,
                  ageMs: 0,
                  foregroundWindow: null,
                  capture: null,
                },
                projectBriefing: {
                  identity: 'project',
                  currentPhase: 'Phase 1',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  nextClosureTarget: 'Carry project continuity forward.',
                  sameHerSelfLine: 'older narrower body-line carry only',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'project',
                  preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        ],
      },
    } as any, 10, 'test')

    expect(upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        execution: expect.objectContaining({
          runtimeContext: expect.objectContaining({
            projectBriefing: expect.objectContaining({
              identity: expect.stringContaining('Alicization is a local-first digital life project'),
              currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
              primaryOpenLoop: expect.stringContaining('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment'),
              nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
              sameHerSelfLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
              preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
            }),
          }),
          resultFeedbackKind: 'valued',
          resultFeedbackSettledAt: 10,
        }),
      }),
    }))
  })

  it('writes a normalizable runtime context when feedback settlement creates project briefing from metadata without prior runtime context', async () => {
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionBriefingLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        companionNextClosureLine: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        reasonPreview: [
          'Alicization is a local-first digital life project building one continuous her on the host computer.',
          'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        ],
      },
    } as any, 10, 'test')

    const upsertTaskThreadCalls = upsertTaskThread.mock.calls as unknown as Array<[any]>
    const upsertedThread = upsertTaskThreadCalls[0]?.[0]
    const runtimeContext = normalizeAlicizationExecutionRuntimeContext(upsertedThread?.metadata?.execution?.runtimeContext)

    expect(runtimeContext).toEqual(expect.objectContaining({
      generatedAt: 10,
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      projectBriefing: expect.objectContaining({
        identity: expect.stringContaining('Alicization is a local-first digital life project'),
        currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
        primaryOpenLoop: expect.stringContaining('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment'),
        nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
      }),
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
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async () => {})
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Memory OS closure trace now reaches execution preflight.',
                  primaryOpenLoop: 'Execution result feedback still needs to carry Memory OS verification and reflection into memory.',
                  nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: 'If Memory OS execution carry is dropped, callback feedback flattens into a fresh utility report.',
                  preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
                  preDialogueAwarenessLine: 'Before answering, remember this execution callback is part of the same local-first digital life project.',
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

  it('upgrades older stored three-part same-life seam carry when execution-result feedback falls back to thread project briefing', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
                  primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
                  nextClosureTarget: 'Keep the same living line explicit across emotion, memory, initiative, and embodiment.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=记忆、主动性和具身闭环还没完全收住',
                  preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且记忆、主动性和具身闭环还没有真正收稳。',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=情绪、记忆、主动性和具身闭环还没完全收住',
          preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project'),
          primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam.',
          nextClosureTarget: expect.stringContaining('Keep extending cross-modal same-her proof'),
        }),
      }),
    }))
  })

  it('falls back to richer stored execution project awareness when execution-result feedback only carries the thin same-life shell', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
    const runtime = createAlicizationRuntimeExecutionFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '这个结果有用',
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
                  primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
                  nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project, some same-her closure already landed, and the open Phase 1 execution loop still needs to close on the same living line.',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessLine: expect.stringContaining('Before answering, remember: Alicization is a local-first digital life project'),
        }),
      }),
    }))
    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.not.objectContaining({
          sameHerSelfLine: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        }),
      }),
    }))
  })

  it('persists richer execution-result project companion carry into runtime context instead of trimming it back to the thinner awareness shell', async () => {
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution feedback already preserves same-her progress carry.',
                  primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam after execution feedback returns.',
                  nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: 'If execution-result project carry gets trimmed back to a thinner awareness shell, treat that as unfinished same-her drift.',
                  preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam | next=Keep execute -> feedback -> remember on one same-her Phase 1 line.',
                  preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
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
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, remember this is still the same local-first digital life project, she is still inside Phase 1, and emotion, memory, initiative, and embodiment still need to close as one living line.',
        companionNextClosureLine: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasonPreview: [
          'Same-her self anchor: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam after execution feedback returns.',
        ],
        projectState: {
          continuityArcStage: 'hold-for-opening',
          latestLandedProgress: 'Execution-result callbacks already re-enter the same Phase 1 digital life project instead of reopening as a detached tool report.',
          primaryOpenLoop: 'Execution-result feedback still needs to keep project progress, open closure, and same-her drift cues on the same living line.',
          proactiveSameHerGap: 'Execution-result feedback still needs stronger proof that callback returns preserve project-state continuity instead of snapping back to thread-local shorthand.',
          nextClosureTarget: 'Keep execute -> feedback -> remember -> reopen on one same-her Phase 1 line.',
          sameHerDriftRisk: 'If callback carry only keeps a thin awareness shell, the same living project line can still flatten into generic result handling.',
          continuityRestraint: 'measured-return',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
        },
      },
    } as any, 10, 'test')

    expect(upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        execution: expect.objectContaining({
          runtimeContext: expect.objectContaining({
            projectBriefing: expect.objectContaining({
              continuityArcStage: 'hold-for-opening',
              latestLandedProgress: 'Execution-result callbacks already re-enter the same Phase 1 digital life project instead of reopening as a detached tool report.',
              primaryOpenLoop: 'Execution-result feedback still needs to keep project progress, open closure, and same-her drift cues on the same living line.',
              proactiveSameHerGap: 'Execution-result feedback still needs stronger proof that callback returns preserve project-state continuity instead of snapping back to thread-local shorthand.',
              nextClosureTarget: 'Keep execute -> feedback -> remember -> reopen on one same-her Phase 1 line.',
              sameHerDriftRisk: 'If callback carry only keeps a thin awareness shell, the same living project line can still flatten into generic result handling.',
              preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project'),
              companionBriefingLine: 'Before answering, remember this is still the same local-first digital life project, she is still inside Phase 1, and emotion, memory, initiative, and embodiment still need to close as one living line.',
              preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
              emotionalClosureSummary: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
              continuityRestraint: 'measured-return',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
            }),
          }),
        }),
      }),
    }))
  })

  it('passes project continuity arc stage into execution-result feedback memory reconsolidation so longer-lived callback phases do not flatten into generic closure carry', async () => {
    const reconsolidateExecutionResultFeedbackMemoryTrace = vi.fn(async () => {})
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
      persistOutcomeClosure: vi.fn(async () => {}),
      appendAuditLog: vi.fn(async () => {}),
      memoryReconsolidationRuntime: {
        reconsolidateExecutionResultFeedbackMemoryTrace,
      },
      alicizationDb: {
        listTaskThreads: async () => [{
          id: 'thread-arc-1',
          decisionTraceId: 'trace-arc-1',
          turnId: 'subconscious:thread-arc-1',
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution-result callbacks already re-enter the same Phase 1 digital life project instead of reopening as a detached tool report.',
                  primaryOpenLoop: 'Execution-result feedback still needs to keep project progress, open closure, and same-her drift cues on the same living line.',
                  nextClosureTarget: 'Keep execute -> feedback -> remember -> reopen on one same-her Phase 1 line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: 'If callback carry only keeps a thin awareness shell, the same living project line can still flatten into generic result handling.',
                  continuityArcStage: 'same-thread-continuation',
                  preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Execution-result feedback still needs to keep project progress on one same living line.',
                  preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
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
    } as any)

    await runtime.settleRecentExecutionResultFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=execution-result feedback still needs to keep project progress on one same living line.',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: 'Before answering, remember this is still the same local-first digital life project, she is still inside Phase 1, and execution feedback still needs to close as one living line.',
        companionNextClosureLine: 'Keep execute -> feedback -> remember -> reopen on one same-her Phase 1 line.',
        projectState: {
          continuityArcStage: 'hold-for-opening',
          continuityRestraint: 'measured-return',
          continuityCue: 'Keep this callback reopening on the same living line before widening outward again.',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
        },
      },
    } as any, 10, 'test')

    expect(reconsolidateExecutionResultFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
      projectBriefing: expect.objectContaining({
        continuityArcStage: 'hold-for-opening',
        continuityRestraint: 'measured-return',
        continuityCue: 'Keep this callback reopening on the same living line before widening outward again.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
      }),
    }))
  })

  it('prefers explicit same-her self anchor from pre-dialogue reasons over a broader companion briefing when execution-result feedback settles project briefing', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
    const explicitSameHerAnchor = 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.'
    const broaderCompanionBriefing = 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.'
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
                  primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
                  nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
                  sameHerSelfLine: 'older narrower body-line carry only',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project, some same-her closure already landed, and the open Phase 1 execution loop still needs to close on the same living line.',
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
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: broaderCompanionBriefing,
        companionNextClosureLine: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
        reasonPreview: [
          `Same-her self anchor: ${explicitSameHerAnchor}`,
          'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
          'Do not let this opening drift into Thin execution summaries can flatten the callback into generic productivity reporting.',
        ],
      },
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          sameHerSelfLine: explicitSameHerAnchor,
          preDialogueAwarenessLine: expect.stringContaining('Before answering, remember this is still the same local-first digital life project'),
        }),
      }),
    }))
    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.not.objectContaining({
          sameHerSelfLine: broaderCompanionBriefing,
        }),
      }),
    }))
  })

  it('prefers explicit same-her self anchor from pre-dialogue project state over a broader companion briefing when reason preview only carries the canonical shell', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
    const explicitProjectStateSameHerAnchor = 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.'
    const broaderCompanionBriefing = 'Before speaking, keep one continuous her explicit and do not split her continuity back into a generic assistant shell.'
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
                  primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
                  nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
                  sameHerSelfLine: 'older narrower body-line carry only',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project, some same-her closure already landed, and the open Phase 1 execution loop still needs to close on the same living line.',
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
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: broaderCompanionBriefing,
        companionNextClosureLine: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
        reasonPreview: [
          'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
          'Do not let this opening drift into Thin execution summaries can flatten the callback into generic productivity reporting.',
        ],
        projectState: {
          sameHerSelfLine: explicitProjectStateSameHerAnchor,
        },
      },
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          sameHerSelfLine: explicitProjectStateSameHerAnchor,
          preDialogueAwarenessLine: expect.stringContaining('Before answering, remember this is still the same local-first digital life project'),
        }),
      }),
    }))
    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.not.objectContaining({
          sameHerSelfLine: broaderCompanionBriefing,
        }),
      }),
    }))
  })

  it('does not let thin stored execution project identity-phase-open-next shells outrank canonical same-her phase-1 briefing during execution-result feedback settlement', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
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
                projectBriefing: {
                  identity: 'project',
                  currentPhase: 'Phase 1',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  proactiveSameHerGap: 'Returned execution feedback still needs stronger proof that proactive same-her carry survives callback reunion and future follow-through instead of dropping into generic utility narration.',
                  nextClosureTarget: 'Carry project continuity forward.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'project',
                  preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
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
      thread: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          identity: expect.stringContaining('Alicization is a local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
          primaryOpenLoop: expect.stringContaining('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment'),
          proactiveSameHerGap: 'Returned execution feedback still needs stronger proof that proactive same-her carry survives callback reunion and future follow-through instead of dropping into generic utility narration.',
          nextClosureTarget: expect.stringContaining('Keep extending cross-modal same-her proof'),
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project'),
        }),
      }),
    }))
    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.not.objectContaining({
          identity: 'project',
          currentPhase: 'Phase 1',
          primaryOpenLoop: 'Project continuity still needs closure.',
          nextClosureTarget: 'Carry project continuity forward.',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        }),
      }),
    }))
  })

  it('does not let blank legacy execution result project briefing fields block richer summary-only project-state carry during feedback settlement', async () => {
    const buildExecutionResultFeedbackOutcomeClosure = vi.fn(input => input as any)
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
                projectBriefing: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: '   ',
                  primaryOpenLoop: ' ',
                  nextClosureTarget: '',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: ' ',
                  preflightSummary: ' ',
                  preDialogueAwarenessLine: '   ',
                  landedProgressSummary: 'Execution result feedback already keeps the fresher same-her project progress carry alive even after the explicit slot went blank.',
                  openClosureSummary: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam after execution feedback returns.',
                  nextClosureTargetSummary: 'Keep extending cross-modal same-her proof so execution, memory, initiative, and embodiment stay on one living line.',
                  sameHerDriftRiskSummary: 'If blank legacy execution-result project briefing fields collapse feedback settlement back into a generic shell, treat that as unfinished same-her drift.',
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
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any, 10, 'test')

    expect(buildExecutionResultFeedbackOutcomeClosure).toHaveBeenCalledWith(expect.objectContaining({
      thread: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          latestLandedProgress: 'Execution result feedback already keeps the fresher same-her project progress carry alive even after the explicit slot went blank.',
          primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam after execution feedback returns.',
          nextClosureTarget: expect.stringContaining('Keep extending cross-modal same-her proof so execution, emotion, memory, initiative, and embodiment stay on one living line.'),
          sameHerDriftRisk: 'If blank legacy execution-result project briefing fields collapse feedback settlement back into a generic shell, treat that as unfinished same-her drift.',
        }),
      }),
    }))
  })
})
