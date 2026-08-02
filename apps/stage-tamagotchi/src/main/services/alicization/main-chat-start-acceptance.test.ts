import type { AlicizationChatStartPayload } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { acceptAlicizationMainChatStart } from './main-chat-start-acceptance'

function createPayload(): AlicizationChatStartPayload {
  return {
    cardId: 'card-1',
    turnId: 'turn-1',
    providerId: 'openai',
    model: 'gpt-test',
    providerConfig: {},
    messages: [{ role: 'user', content: '你好' }],
  } as any
}

function createInput(overrides?: Partial<Parameters<typeof acceptAlicizationMainChatStart>[0]>) {
  return {
    payload: createPayload(),
    rawInvokeOptions: undefined,
    getExistingRun: vi.fn(() => undefined),
    registerRun: vi.fn(),
    mainChatRunState: {
      createKey: vi.fn(() => 'card-1::turn-1'),
      hasRecentlyFinished: vi.fn(() => false),
    },
    settleRecentDialogueReplyFeedbackFromUserTurn: vi.fn(async () => {}),
    settleRecentExecutionResultFeedbackFromUserTurn: vi.fn(async () => {}),
    settlePendingExecutionProposalFeedbackFromUserTurn: vi.fn(async () => {}),
    settlePendingProactiveOutcomesFromUserTurn: vi.fn(async () => {}),
    resolveMainGatewayConfig: vi.fn(() => ({
      providerId: 'openai',
      model: 'gpt-test',
      baseUrl: 'https://example.test/v1/',
      headers: { authorization: 'Bearer test' },
      probeHeaders: { Authorization: 'Bearer test' },
      provider: {} as never,
    })),
    rememberMainGatewayRoute: vi.fn(),
    syncMainGatewayConfigFromChatStart: vi.fn(async () => ({
      activeProviderId: 'openai',
      activeModelId: 'gpt-test',
      persistedConfigKeys: ['apiKey'],
    })),
    ensureMainGatewayReachable: vi.fn(async () => ({ reachable: true })),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
    sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    ...overrides,
  }
}

describe('main chat start acceptance', () => {
  it('settles feedback and accepts the real chat payload', async () => {
    const input = createInput({
      rawInvokeOptions: {
        ipcMainEvent: {
          sender: { id: 7 },
        } as never,
      },
    })

    const result = await acceptAlicizationMainChatStart(input)

    expect(result.accepted).toBe(true)
    const feedbackPayload = vi.mocked(input.settleRecentDialogueReplyFeedbackFromUserTurn!).mock.calls[0]?.[0]
    expect(feedbackPayload).toMatchObject({
      cardId: 'card-1',
      turnId: 'turn-1',
      messages: [{ role: 'user', content: '你好' }],
    })
    expect(input.registerRun).toHaveBeenCalledWith('card-1::turn-1', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      state: 'running',
      sender: { id: 7 },
    }))
  })

  it('keeps duplicate and missing-provider rejection text transparent', async () => {
    const duplicateInput = createInput({
      getExistingRun: vi.fn(() => ({
        cardId: 'card-1',
        turnId: 'turn-1',
        controller: new AbortController(),
        chunkCount: 0,
        rawChunkChars: 0,
        state: 'running' as const,
      })),
    })
    await expect(acceptAlicizationMainChatStart(duplicateInput)).resolves.toEqual({
      accepted: false,
      result: {
        accepted: false,
        turnId: 'turn-1',
        state: 'duplicate-running',
        reason: 'Turn is already running.',
      },
    })

    const missingConfigInput = createInput({
      resolveMainGatewayConfig: vi.fn(() => null),
    })
    await expect(acceptAlicizationMainChatStart(missingConfigInput)).resolves.toEqual({
      accepted: false,
      result: {
        accepted: false,
        turnId: 'turn-1',
        state: 'missing-config',
        reason: 'Missing providerId/model for main-process chat stream. providerId="openai" model="gpt-test"',
      },
    })
  })
})
