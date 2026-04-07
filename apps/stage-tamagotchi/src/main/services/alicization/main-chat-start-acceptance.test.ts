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
    messages: [
      { role: 'user', content: '你好' },
    ],
  }
}

function createInput(overrides?: Partial<Parameters<typeof acceptAlicizationMainChatStart>[0]>) {
  const payload = createPayload()
  return {
    payload,
    activeCardId: 'default',
    rawInvokeOptions: undefined,
    getExistingRun: vi.fn(() => undefined),
    registerRun: vi.fn(),
    mainChatRunState: {
      createKey: vi.fn(() => 'card-1::turn-1'),
      hasRecentlyFinished: vi.fn(() => false),
    },
    settlePendingProactiveOutcomesFromUserTurn: vi.fn(async () => {}),
    resolveMainGatewayConfig: vi.fn(() => ({
      providerId: 'openai',
      model: 'gpt-test',
      baseUrl: 'https://example.test/v1/',
      headers: {
        authorization: 'Bearer test',
      },
      probeHeaders: {
        Authorization: 'Bearer test',
      },
      provider: {} as never,
    })),
    syncMainGatewayConfigFromChatStart: vi.fn(async () => ({
      activeProviderId: 'openai',
      activeModelId: 'gpt-test',
      persistedConfigKeys: ['apiKey'],
    })),
    ensureMainGatewayReachable: vi.fn(async () => ({
      reachable: true,
    })),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
    sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    ...overrides,
  }
}

describe('main chat start acceptance', () => {
  it('rejects duplicate running turns', async () => {
    const input = createInput({
      getExistingRun: vi.fn(() => ({
        cardId: 'card-1',
        turnId: 'turn-1',
        controller: new AbortController(),
        chunkCount: 0,
        rawChunkChars: 0,
        state: 'running' as const,
      })),
    })

    const result = await acceptAlicizationMainChatStart(input)

    expect(result).toEqual({
      accepted: false,
      result: {
        accepted: false,
        turnId: 'turn-1',
        state: 'duplicate-running',
        reason: 'Turn is already running.',
      },
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.duplicate-running', {
      cardId: 'card-1',
      turnId: 'turn-1',
    })
  })

  it('rejects missing gateway config', async () => {
    const input = createInput({
      resolveMainGatewayConfig: vi.fn(() => null),
    })

    const result = await acceptAlicizationMainChatStart(input)

    expect(result).toEqual({
      accepted: false,
      result: {
        accepted: false,
        turnId: 'turn-1',
        state: 'missing-config',
        reason: 'Missing providerId/model for main-process chat stream. providerId="openai" model="gpt-test"',
      },
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.missing-config', {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'Missing providerId/model for main-process chat stream. providerId="openai" model="gpt-test"',
    })
  })

  it('rejects unreachable gateways before registering a run', async () => {
    const input = createInput({
      ensureMainGatewayReachable: vi.fn(async () => ({
        reachable: false,
        cached: true,
        code: 'ECONNREFUSED',
        formattedReason: 'Main gateway connectivity check failed for example.test (econnrefused).',
      })),
    })

    const result = await acceptAlicizationMainChatStart(input)

    expect(result).toEqual({
      accepted: false,
      result: {
        accepted: false,
        turnId: 'turn-1',
        state: 'start-failed',
        reason: 'Main gateway connectivity check failed for example.test (econnrefused).',
      },
    })
    expect(input.registerRun).not.toHaveBeenCalled()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.gateway-unreachable', {
      cardId: 'card-1',
      turnId: 'turn-1',
      cached: true,
      code: 'ECONNREFUSED',
      reason: 'Main gateway connectivity check failed for example.test (econnrefused).',
    })
  })

  it('accepts a run and syncs llm config before registering state', async () => {
    const input = createInput({
      rawInvokeOptions: {
        ipcMainEvent: {
          sender: { id: 7 },
        } as never,
      },
    })

    const result = await acceptAlicizationMainChatStart(input)

    expect(result.accepted).toBe(true)
    if (result.accepted) {
      expect(result.key).toBe('card-1::turn-1')
      expect(result.runState.state).toBe('running')
      expect(result.runState.sender?.id).toBe(7)
    }
    expect(input.syncMainGatewayConfigFromChatStart).toHaveBeenCalledWith({
      mainGateway: expect.objectContaining({
        providerId: 'openai',
        model: 'gpt-test',
      }),
      providerConfig: {},
    })
    expect(input.registerRun).toHaveBeenCalledWith('card-1::turn-1', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      state: 'running',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('llm-config.updated-from-chat-start', {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      persistedConfigKeys: ['apiKey'],
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.accepted', {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      senderId: 7,
      preparationDeferred: true,
    })
  })
})
