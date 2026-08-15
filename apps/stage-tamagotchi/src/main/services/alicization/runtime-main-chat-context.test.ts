import type { AlicizationChatStartPayload } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationMainChatContextRuntime } from './runtime-main-chat-context'

function createRuntime(
  overrides: Partial<Parameters<typeof createAlicizationMainChatContextRuntime>[0]> = {},
) {
  return createAlicizationMainChatContextRuntime({
    getActiveCardId: () => 'default',
    normalizeOrganicRecallText: raw => raw.trim(),
    readTransportContentAsText: content => typeof content === 'string' ? content : '',
    emptyAlicizationExecutionCallbackContext: {} as never,
    emptyAlicizationExecutionLedgerContext: {} as never,
    ensureActiveOrLatestSessionId: async () => 'session-1',
    buildPendingExecutionCallbackContext: async () => ({} as never),
    buildExecutionLedgerContext: async () => ({} as never),
    resolveInspectionIntentFromMessageHistory: () => true,
    detectInvitedInspectionIntent: message => ({
      active: message.includes('inspect'),
    }),
    ...overrides,
  })
}

describe('runtime main chat context', () => {
  it('builds contextual recall seed only from the current user input without querying old DB turns', async () => {
    const ensureActiveOrLatestSessionId = vi.fn(async () => 'session-with-old-db-turns')
    const runtime = createRuntime({
      ensureActiveOrLatestSessionId,
      resolveInspectionIntentFromMessageHistory: () => false,
    })

    const contextual = await runtime.buildMainChatContextualString({
      cardId: 'default',
      turnId: 'turn-current-seed',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'assistant', content: 'transport 中的旧回复' },
        { role: 'user', content: '  只用当前输入召回  ' },
      ],
    } as AlicizationChatStartPayload)

    expect(contextual).toBe('U: 只用当前输入召回')
    expect(ensureActiveOrLatestSessionId).not.toHaveBeenCalled()
  })

  it('removes stale inspection replies without inserting replacement history', () => {
    const hostFact = { role: 'system', content: '{"type":"host"}' } as const
    const staleInspectionRequest = { role: 'user', content: 'inspect the earlier screenshot' } as const
    const staleInspectionReply = { role: 'assistant', content: 'The earlier screenshot showed a settings panel.' } as const
    const toolEvidence = {
      role: 'tool',
      content: 'inspection completed',
      toolCallId: 'tool-call-1',
      toolName: 'inspect-screen',
    } as const
    const ordinaryUserMessage = { role: 'user', content: 'continue our conversation' } as const
    const ordinaryAssistantMessage = { role: 'assistant', content: 'This reply belongs to the ordinary conversation.' } as const
    const latestInspectionRequest = { role: 'user', content: 'inspect the current screenshot' } as const
    const messages: AlicizationChatStartPayload['messages'] = [
      hostFact,
      staleInspectionRequest,
      staleInspectionReply,
      toolEvidence,
      ordinaryUserMessage,
      ordinaryAssistantMessage,
      latestInspectionRequest,
    ]

    const result = createRuntime().redactStaleInspectionHistoryMessages(
      messages,
      latestInspectionRequest.content,
    )

    expect(result).toEqual([
      hostFact,
      staleInspectionRequest,
      toolEvidence,
      ordinaryUserMessage,
      ordinaryAssistantMessage,
      latestInspectionRequest,
    ])
  })
})
