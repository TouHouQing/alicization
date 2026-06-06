import { describe, expect, it, vi } from 'vitest'
import { normalizeAlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import { createAlicizationRuntimeExecutionFeedback } from './runtime-execution-feedback'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'

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
        projectBriefing: expect.objectContaining({
          identity: expect.stringContaining('Alicization is a local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
          latestLandedProgress: expect.stringContaining('Execution planning already carries project identity'),
          primaryOpenLoop: expect.stringContaining('Execution proposal feedback still needs to keep same-her project closure'),
          nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
          sameHerSelfLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
          sameHerDriftRisk: expect.stringContaining('Pending proposal feedback can collapse'),
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
          metadata: {},
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
          metadata: {
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
          },
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
          metadata: {
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
          },
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
          metadata: {
            execution: {},
          },
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
          metadata: {
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
          },
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
          metadata: {
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
          },
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
          metadata: {
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
          },
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
          metadata: {
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
          },
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
          metadata: {
            execution: {
              runtimeContext: {
                projectBriefing: {
                  identity: 'project',
                  currentPhase: 'Phase 1',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  nextClosureTarget: 'Carry project continuity forward.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
                  preflightSummary: 'project',
                  preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
                },
              },
            },
          },
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
          metadata: {
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
          },
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
