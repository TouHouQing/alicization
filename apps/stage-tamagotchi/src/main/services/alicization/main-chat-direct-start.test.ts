import type { AlicizationChatStartPayload, AlicizationChatStartResult } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { handleAlicizationDirectChatStart } from './main-chat-direct-start'

function createChatStartResult(overrides?: Partial<AlicizationChatStartResult>): AlicizationChatStartResult {
  return {
    accepted: true,
    turnId: 'turn-1',
    state: 'accepted',
    governance: null,
    embodiment: null,
    speechTimeline: null,
    ...overrides,
  }
}

function createInput(overrides?: Partial<Parameters<typeof handleAlicizationDirectChatStart>[0]>) {
  const payload: AlicizationChatStartPayload = {
    cardId: 'default',
    turnId: 'turn-1',
    providerId: 'openai',
    model: 'gpt-4o-mini',
    providerConfig: {},
    messages: [{ role: 'user', content: 'hello direct ipc' }],
  }

  return {
    ipcMainEvent: {
      sender: { id: 7 },
    } as unknown as Parameters<typeof handleAlicizationDirectChatStart>[0]['ipcMainEvent'],
    payload,
    withCardScope: vi.fn(async (_cardId, task) => await task()),
    startMainChatStream: vi.fn(async () => createChatStartResult()),
    normalizeCardId: vi.fn(() => 'default'),
    sanitizeText: vi.fn((value: unknown, fallback = '') => typeof value === 'string' ? value.trim() : fallback),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('main chat direct start', () => {
  it('runs direct chat start inside card scope and forwards the raw ipc event', async () => {
    const input = createInput()

    const result = await handleAlicizationDirectChatStart(input)

    expect(result).toEqual(createChatStartResult())
    expect(input.withCardScope).toHaveBeenCalledWith('default', expect.any(Function), {
      label: 'chat-start:default',
      skipQueueWhenScopeAlreadyActive: true,
    })
    expect(input.startMainChatStream).toHaveBeenCalledWith({
      ...input.payload,
      cardId: 'default',
    }, {
      raw: {
        ipcMainEvent: input.ipcMainEvent,
      },
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-requested', {
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-4o-mini',
      messageCount: 1,
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-resolved', expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-1',
      accepted: true,
      state: 'accepted',
    }))
  })

  it('logs failures and rethrows the direct start error', async () => {
    const input = createInput({
      startMainChatStream: vi.fn(async () => {
        throw new Error('start failed')
      }),
    })

    await expect(handleAlicizationDirectChatStart(input)).rejects.toThrow('start failed')

    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-failed', expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-1',
      reason: 'start failed',
    }))
  })
})
