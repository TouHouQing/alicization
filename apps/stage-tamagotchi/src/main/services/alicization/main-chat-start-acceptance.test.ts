import type { AlicizationChatStartPayload } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { acceptAlicizationMainChatStart } from './main-chat-start-acceptance'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'

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
    preDialogueSendIdentity: {
      status: 'partial',
      summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=桌面执行闭环还没完全收住',
      awarenessLine: '我得先记住这是同一个数字生命项目：它现在仍在 Phase 1，本轮开口前要知道桌面执行闭环还没完全收住。',
      companionBriefingLine: '我得先记住这是同一个数字生命项目：它现在仍在 Phase 1，本轮开口前要知道桌面执行闭环还没完全收住。',
      companionNextClosureLine: '把桌面执行闭环继续收口到记忆、主动性和具身之间。',
      emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      reasonPreview: [
        'Alicization is a local-first digital life project building one continuous her on the host computer.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        '桌面执行闭环还没完全收住，下一步要把它继续收口到记忆、主动性和具身之间。',
        '把桌面执行闭环继续收口到记忆、主动性和具身之间。',
      ],
    },
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
    rememberMainGatewayRoute: vi.fn(),
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
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.duplicate-running', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      preDialogueAwarenessStatus: 'grounded',
    }))
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
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.missing-config', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'Missing providerId/model for main-process chat stream. providerId="openai" model="gpt-test"',
      preDialogueAwarenessStatus: 'grounded',
    }))
  })

  it('keeps start accepted even when the injected reachability probe would fail later in the lifecycle', async () => {
    const input = createInput({
      ensureMainGatewayReachable: vi.fn(async () => ({
        reachable: false,
        cached: true,
        code: 'ECONNREFUSED',
        formattedReason: 'Main gateway connectivity check failed for example.test (econnrefused).',
      })),
    })

    const result = await acceptAlicizationMainChatStart(input)

    expect(result.accepted).toBe(true)
    expect(input.registerRun).toHaveBeenCalledWith('card-1::turn-1', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      state: 'running',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.accepted', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      gatewayReachable: null,
      gatewayReachabilityCode: null,
      preDialogueAwarenessStatus: 'grounded',
    }))
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
    expect(input.rememberMainGatewayRoute).toHaveBeenCalledWith({
      cardId: 'card-1',
      mainGateway: expect.objectContaining({
        providerId: 'openai',
        model: 'gpt-test',
      }),
      providerConfig: {},
    })
    const expectedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
    const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(expectedPayload)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('llm-config.updated-from-chat-start', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      persistedConfigKeys: ['apiKey'],
      ...expectedDebug,
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.accepted', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      senderId: 7,
      preparationDeferred: true,
      gatewayReachable: null,
      gatewayReachabilityCode: null,
      ...expectedDebug,
    }))
  })

  it('injects canonical project awareness into accepted-start debug when payload omits pre-dialogue identity', async () => {
    const payload = createPayload()
    payload.preDialogueSendIdentity = null
    const input = createInput({ payload })

    const result = await acceptAlicizationMainChatStart(input)

    expect(result.accepted).toBe(true)
    const expectedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const expectedDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(expectedPayload)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.accepted', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      ...expectedDebug,
    }))
  })
})
