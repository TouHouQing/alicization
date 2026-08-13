import type {
  AlicizationChatAbortPayload,
  AlicizationChatAbortResult,
  AlicizationChatStartPayload,
} from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  alicizationChatStartInvokeChannel,
  electronAlicizationChatStart,
} from '../../../shared/eventa'
import { registerAlicizationChatInvokeHandlers } from './runtime-invoke-handlers-chat'

function createPayload(): AlicizationChatStartPayload {
  return {
    cardId: 'card-1',
    turnId: 'turn-1',
    providerId: 'openai',
    model: 'gpt-test',
    providerConfig: { apiKey: 'test' },
    messages: [{ role: 'user', content: '你好' }],
  } as any
}

function createHandleDirectChatAbortMock() {
  return vi.fn(async (_payload: AlicizationChatAbortPayload): Promise<AlicizationChatAbortResult> => ({
    accepted: false,
    state: 'not-found',
  }))
}

function register() {
  const registerInvokeHandler = vi.fn()
  const ipcMainHandle = vi.fn()
  const appendRuntimeDebugLine = vi.fn(async () => {})
  const withCardScope = vi.fn(async (_cardId, task) => await task())
  const startMainChatStream = vi.fn(async () => ({
    accepted: true as const,
    turnId: 'turn-1',
    state: 'accepted' as const,
    governance: null,
    embodiment: null,
    speechTimeline: null,
  }))
  const handleDirectChatStart = vi.fn(async () => ({
    accepted: true as const,
    turnId: 'turn-1',
    state: 'accepted' as const,
    governance: null,
    embodiment: null,
    speechTimeline: null,
  }))

  registerAlicizationChatInvokeHandlers({
    registerInvokeHandler,
    withCardScope,
    normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
    sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    appendRuntimeDebugLine,
    startMainChatStream,
    handleDirectChatAbort: createHandleDirectChatAbortMock(),
    handleDirectChatStart,
    getActiveCardId: () => 'card-1',
    ipcMain: {
      removeHandler: vi.fn(),
      handle: ipcMainHandle,
    } as any,
  })

  return {
    registerInvokeHandler,
    ipcMainHandle,
    appendRuntimeDebugLine,
    withCardScope,
    startMainChatStream,
    handleDirectChatStart,
  }
}

describe('runtime invoke handlers chat', () => {
  it('forwards the Eventa chat-start payload unchanged', async () => {
    const harness = register()
    const invokeRegistration = harness.registerInvokeHandler.mock.calls.find(
      call => call[0] === electronAlicizationChatStart,
    )
    const handler = invokeRegistration?.[1] as (
      payload: AlicizationChatStartPayload,
      eventaOptions: unknown,
    ) => Promise<unknown>

    await handler(createPayload(), { raw: { event: 'invoke' } })

    expect(harness.withCardScope).toHaveBeenCalledWith('card-1', expect.any(Function), {
      label: 'chat-start:card-1',
      lane: 'foreground',
      skipQueueWhenScopeAlreadyActive: true,
    })
    expect(harness.startMainChatStream).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: { apiKey: 'test' },
      messages: [{ role: 'user', content: '你好' }],
    }, { raw: { event: 'invoke' } })
  })

  it('forwards the direct ipc chat-start payload unchanged', async () => {
    const harness = register()
    const directRegistration = harness.ipcMainHandle.mock.calls.find(
      call => call[0] === alicizationChatStartInvokeChannel,
    )
    const handler = directRegistration?.[1] as (
      ipcMainEvent: unknown,
      payload: AlicizationChatStartPayload,
    ) => Promise<unknown>
    const ipcMainEvent = { sender: { id: 1 } }

    await handler(ipcMainEvent, createPayload())

    expect(harness.handleDirectChatStart).toHaveBeenCalledWith(ipcMainEvent, {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: { apiKey: 'test' },
      messages: [{ role: 'user', content: '你好' }],
    })
  })
})
