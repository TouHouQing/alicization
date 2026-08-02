import type { AlicizationChatStartPayload, AlicizationChatStartResult } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { handleAlicizationDirectChatStart } from './main-chat-direct-start'

function createChatStartResult(): AlicizationChatStartResult {
  return {
    accepted: true,
    turnId: 'turn-1',
    state: 'accepted',
    governance: null,
    embodiment: null,
    speechTimeline: null,
  }
}

function createInput(overrides?: Partial<Parameters<typeof handleAlicizationDirectChatStart>[0]>) {
  const payload: AlicizationChatStartPayload = {
    cardId: 'default',
    turnId: 'turn-1',
    providerId: 'openai',
    model: 'gpt-5',
    providerConfig: { apiKey: 'test' },
    messages: [{ role: 'user', content: 'hello direct ipc' }],
  } as any

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
  it('forwards real payload fields with the raw ipc event', async () => {
    const input = createInput()

    const result = await handleAlicizationDirectChatStart(input)

    expect(result).toEqual(createChatStartResult())
    expect(input.withCardScope).toHaveBeenCalledWith('default', expect.any(Function), {
      label: 'chat-start:default',
      skipQueueWhenScopeAlreadyActive: true,
    })
    expect(input.startMainChatStream).toHaveBeenCalledWith({
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: { apiKey: 'test' },
      messages: [{ role: 'user', content: 'hello direct ipc' }],
    }, {
      raw: {
        ipcMainEvent: input.ipcMainEvent,
      },
    })
  })

  it('keeps direct-start failures transparent and rethrows them', async () => {
    const input = createInput({
      startMainChatStream: vi.fn(async () => {
        throw new Error('provider start failed')
      }),
    })

    await expect(handleAlicizationDirectChatStart(input)).rejects.toThrow('provider start failed')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.direct-failed', expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-1',
      reason: 'provider start failed',
    }))
  })
})
