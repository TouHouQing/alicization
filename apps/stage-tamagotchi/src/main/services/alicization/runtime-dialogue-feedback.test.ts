import { describe, expect, it, vi } from 'vitest'

import { buildDialogueReplyFeedbackAckKey, createAlicizationRuntimeDialogueFeedback, isOrdinaryDialogueConversationRow } from './runtime-dialogue-feedback'

describe('runtime dialogue feedback', () => {
  it('filters non-ordinary dialogue rows and builds stable ack keys', () => {
    const parseStoredConversationStructured = vi.fn(() => ({
      format: 'mind-turn-v1',
    }))
    expect(isOrdinaryDialogueConversationRow({
      row: {
        turnId: 'turn-1',
        sessionId: 'session-1',
        structuredJson: '{}',
        createdAt: 1,
      },
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      parseStoredConversationStructured,
    })).toBe(true)
    expect(buildDialogueReplyFeedbackAckKey({
      turnId: 'turn-1',
      sessionId: 'session-1',
      createdAt: 1,
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    })).toBe('session-1::turn-1')
  })

  it('settles ordinary dialogue feedback and triggers memory reconsolidation runtime', async () => {
    const persistOutcomeClosure = vi.fn(async () => {})
    const reconsolidateDialogueFeedbackMemoryTrace = vi.fn(async () => {})
    const appendRelationshipDynamics = vi.fn(async () => {})
    const persistDialogueReplyFeedbackAck = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeDialogueFeedback({
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      readLatestUserMessageText: () => '你这句太模板了',
      ensureActiveOrLatestSessionId: async () => 'session-1',
      withCardScope: async (_cardId, task) => await task(),
      ensureDialogueReplyFeedbackAck: async () => '',
      persistDialogueReplyFeedbackAck,
      parseStoredConversationStructured: () => ({
        format: 'mind-turn-v1',
        governance: {
          decisionTraceId: 'trace-1',
        },
      }),
      deriveDialogueReplyFeedbackKind: () => 'robotic',
      attachSynthesizedReflections: input => input,
      buildDialogueReplyFeedbackOutcomeClosure: input => input as any,
      persistOutcomeClosure,
      appendAuditLog,
      memoryReconsolidationRuntime: {
        reconsolidateDialogueFeedbackMemoryTrace,
      },
      alicizationDb: {
        listConversationTurnsBySession: async () => [{
          turnId: 'turn-1',
          sessionId: 'session-1',
          assistantText: '上一句像模板壳。',
          structuredJson: '{}',
          createdAt: 1,
        }],
        getLatestRelationshipDynamics: async () => null,
        appendRelationshipDynamics,
      },
    })

    const result = await runtime.settleRecentDialogueReplyFeedbackFromUserTurn({
      cardId: 'card-1',
      turnId: 'turn-user',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [],
    } as any, 10, 'test')

    expect(result).toBe('robotic')
    expect(persistOutcomeClosure).toHaveBeenCalled()
    expect(reconsolidateDialogueFeedbackMemoryTrace).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'robotic',
    }))
    expect(appendRelationshipDynamics).toHaveBeenCalledWith(expect.objectContaining({
      source: 'dialogue-feedback:robotic',
    }))
    expect(persistDialogueReplyFeedbackAck).toHaveBeenCalled()
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'reply-feedback-settled',
    }), 'card-1')
  })
})
