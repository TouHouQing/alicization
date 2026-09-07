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

  it('passes the turn abort signal through session and execution context owners', async () => {
    const controller = new AbortController()
    const ensureActiveOrLatestSessionId = vi.fn(async () => 'session-owner-signal')
    const buildPendingExecutionCallbackContext = vi.fn(async () => ({} as never))
    const buildExecutionLedgerContext = vi.fn(async () => ({} as never))
    const runtime = createRuntime({
      ensureActiveOrLatestSessionId,
      buildPendingExecutionCallbackContext,
      buildExecutionLedgerContext,
    })
    const payload = {
      cardId: 'card-owner-signal',
      turnId: 'turn-owner-signal',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [{ role: 'user', content: '继续执行' }],
    } as AlicizationChatStartPayload

    await runtime.buildMainChatExecutionCallbackContext(payload, {
      signal: controller.signal,
    })
    await runtime.buildMainChatExecutionLedgerContext(payload, {
      signal: controller.signal,
    })

    expect(ensureActiveOrLatestSessionId).toHaveBeenNthCalledWith(
      1,
      'default',
      { signal: controller.signal },
    )
    expect(ensureActiveOrLatestSessionId).toHaveBeenNthCalledWith(
      2,
      'default',
      { signal: controller.signal },
    )
    expect(buildPendingExecutionCallbackContext).toHaveBeenCalledWith({
      consume: false,
      sessionId: 'session-owner-signal',
      signal: controller.signal,
    })
    expect(buildExecutionLedgerContext).toHaveBeenCalledWith({
      sessionId: 'session-owner-signal',
      signal: controller.signal,
    })
  })

  it('does not downgrade an aborted session read into empty execution context', async () => {
    const abortError = new DOMException('user cancelled', 'AbortError')
    const runtime = createRuntime({
      ensureActiveOrLatestSessionId: vi.fn(async () => {
        throw abortError
      }),
    })

    await expect(runtime.buildMainChatExecutionCallbackContext({
      cardId: 'card-owner-abort',
      turnId: 'turn-owner-abort',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [{ role: 'user', content: '取消这轮' }],
    } as AlicizationChatStartPayload, {
      signal: new AbortController().signal,
    })).rejects.toBe(abortError)
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
