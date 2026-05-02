import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeExecutionFeedback } from './runtime-execution-feedback'

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

  it('settles execution result feedback and writes result feedback metadata', async () => {
    const upsertTaskThread = vi.fn(async () => ({}))
    const persistOutcomeClosure = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
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
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'result-feedback-settled',
    }), 'card-1')
  })
})
