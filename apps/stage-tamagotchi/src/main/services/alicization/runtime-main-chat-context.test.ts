import type { AlicizationChatStartPayload } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import { createAlicizationMainChatContextRuntime } from './runtime-main-chat-context'

function createRuntime() {
  return createAlicizationMainChatContextRuntime({
    getActiveCardId: () => 'default',
    normalizeOrganicRecallText: raw => raw.trim(),
    readTransportContentAsText: content => typeof content === 'string' ? content : '',
    emptyAlicizationExecutionCallbackContext: {} as never,
    emptyAlicizationExecutionLedgerContext: {} as never,
    ensureActiveOrLatestSessionId: async () => 'session-1',
    buildPendingExecutionCallbackContext: async () => ({} as never),
    buildExecutionLedgerContext: async () => ({} as never),
    listTaskThreadsBySession: async () => [],
    resolveRecentContextualTurns: async () => [],
    shouldExtendContextualRecall: () => false,
    resolveInspectionIntentFromMessageHistory: () => true,
    detectInvitedInspectionIntent: message => ({
      active: message.includes('inspect'),
    }),
  })
}

describe('runtime main chat context', () => {
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
