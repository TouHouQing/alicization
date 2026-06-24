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
    providerConfig: {},
    messages: [
      { role: 'user', content: '你好' },
    ],
    preDialogueSendIdentity: {
      status: 'partial',
      summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution continuity still needs closure',
      awarenessLine: '我先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
      companionBriefingLine: '我先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
      companionNextClosureLine: 'Keep closing desktop execution continuity across memory, initiative, and embodiment.',
      reasonPreview: [
        'Alicization is a local-first digital life project building one continuous her on the host computer.',
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'desktop execution continuity still needs closure',
      ],
    },
  }
}

function createHandleDirectChatAbortMock() {
  return vi.fn(async (_payload: AlicizationChatAbortPayload): Promise<AlicizationChatAbortResult> => ({
    accepted: false,
    state: 'not-found',
  }))
}

describe('runtime invoke handlers chat', () => {
  it('logs pre-dialogue project awareness on invoke-based chat start before the main stream begins', async () => {
    const registerInvokeHandler = vi.fn()
    const appendRuntimeDebugLine = vi.fn(async () => {})
    const startMainChatStream = vi.fn(async () => ({
      accepted: true as const,
      turnId: 'turn-1',
      state: 'accepted' as const,
      governance: null,
      embodiment: null,
      speechTimeline: null,
    }))

    registerAlicizationChatInvokeHandlers({
      registerInvokeHandler,
      withCardScope: vi.fn(async (_cardId, task) => await task()),
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine,
      startMainChatStream,
      handleDirectChatAbort: createHandleDirectChatAbortMock(),
      handleDirectChatStart: vi.fn(),
      getActiveCardId: () => 'card-1',
      ipcMain: {
        removeHandler: vi.fn(),
        handle: vi.fn(),
      } as any,
    })

    const invokeRegistration = registerInvokeHandler.mock.calls.find(call => call[0] === electronAlicizationChatStart)
    expect(invokeRegistration).toBeTruthy()

    const handler = invokeRegistration?.[1] as (payload: AlicizationChatStartPayload, eventaOptions: unknown) => Promise<unknown>
    const payload = createPayload()

    await handler(payload, { raw: { event: 'invoke' } })

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.invoke-requested', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      activeCardId: 'card-1',
      preDialogueAwarenessStatus: 'grounded',
      preDialogueAwarenessSummaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution continuity still needs closure',
      preDialogueAwarenessLine: '我先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
      preDialogueCompanionBriefingLine: '我先记住这是一个数字生命项目，它当前仍在 Phase 1，而且桌面执行连续性还没完全闭环。',
      preDialogueNextClosureLine: 'Keep closing desktop execution continuity across memory, initiative, and embodiment.',
      preDialogueReasonPreview: expect.arrayContaining([
        expect.stringContaining('Same-her self anchor:'),
        expect.stringContaining('Memory still needs stronger end-to-end closure'),
        expect.stringContaining('Next closure target is still'),
        expect.stringContaining('Do not let this opening drift into'),
        expect.stringContaining('long-horizon emotion-memory-voice-motion bridge'),
      ]),
      preDialogueReasonCount: 5,
    }))
  })

  it('fills canonical project awareness on invoke-based chat start when payload omits it', async () => {
    const registerInvokeHandler = vi.fn()
    const appendRuntimeDebugLine = vi.fn(async () => {})
    const startMainChatStream = vi.fn(async () => ({
      accepted: true as const,
      turnId: 'turn-1',
      state: 'accepted' as const,
      governance: null,
      embodiment: null,
      speechTimeline: null,
    }))

    registerAlicizationChatInvokeHandlers({
      registerInvokeHandler,
      withCardScope: vi.fn(async (_cardId, task) => await task()),
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine,
      startMainChatStream,
      handleDirectChatAbort: createHandleDirectChatAbortMock(),
      handleDirectChatStart: vi.fn(),
      getActiveCardId: () => 'card-1',
      ipcMain: {
        removeHandler: vi.fn(),
        handle: vi.fn(),
      } as any,
    })

    const invokeRegistration = registerInvokeHandler.mock.calls.find(call => call[0] === electronAlicizationChatStart)
    const handler = invokeRegistration?.[1] as (payload: AlicizationChatStartPayload, eventaOptions: unknown) => Promise<unknown>
    const payload = createPayload()
    payload.preDialogueSendIdentity = null

    await handler(payload, { raw: { event: 'invoke' } })

    expect(startMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      preDialogueSendIdentity: expect.objectContaining({
        status: 'grounded',
        summaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
        awarenessLine: expect.stringContaining('Before answering, remember'),
        companionBriefingLine: null,
        companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      }),
    }), { raw: { event: 'invoke' } })
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.invoke-requested', expect.objectContaining({
      preDialogueAwarenessStatus: 'grounded',
      preDialogueAwarenessSummaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
  })

  it('re-normalizes a thin invoke-based payload summary shell before handing off to the main stream', async () => {
    const registerInvokeHandler = vi.fn()
    const appendRuntimeDebugLine = vi.fn(async () => {})
    const startMainChatStream = vi.fn(async () => ({
      accepted: true as const,
      turnId: 'turn-1',
      state: 'accepted' as const,
      governance: null,
      embodiment: null,
      speechTimeline: null,
    }))

    registerAlicizationChatInvokeHandlers({
      registerInvokeHandler,
      withCardScope: vi.fn(async (_cardId, task) => await task()),
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine,
      startMainChatStream,
      handleDirectChatAbort: createHandleDirectChatAbortMock(),
      handleDirectChatStart: vi.fn(),
      getActiveCardId: () => 'card-1',
      ipcMain: {
        removeHandler: vi.fn(),
        handle: vi.fn(),
      } as any,
    })

    const invokeRegistration = registerInvokeHandler.mock.calls.find(call => call[0] === electronAlicizationChatStart)
    const handler = invokeRegistration?.[1] as (payload: AlicizationChatStartPayload, eventaOptions: unknown) => Promise<unknown>
    const payload = createPayload()
    payload.preDialogueSendIdentity = {
      status: 'partial',
      summaryLine: 'same digital life | keep the closure seam explicit',
      reasonPreview: [
        'same digital life | keep the closure seam explicit',
      ],
    } as any

    await handler(payload, { raw: { event: 'invoke' } })

    expect(startMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      preDialogueSendIdentity: expect.objectContaining({
        status: 'partial',
        awarenessLine: expect.stringContaining('Before answering, remember'),
      }),
    }), { raw: { event: 'invoke' } })
    expect(startMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      preDialogueSendIdentity: expect.not.objectContaining({
        awarenessLine: 'same digital life | keep the closure seam explicit',
      }),
    }), expect.anything())
  })

  it('fills canonical project awareness on direct ipc chat start before handing off to the direct handler', async () => {
    const registerInvokeHandler = vi.fn()
    const handleDirectChatStart = vi.fn(async () => ({
      accepted: true as const,
      turnId: 'turn-1',
      state: 'accepted' as const,
      governance: null,
      embodiment: null,
      speechTimeline: null,
    }))
    const ipcMainHandle = vi.fn()

    registerAlicizationChatInvokeHandlers({
      registerInvokeHandler,
      withCardScope: vi.fn(async (_cardId, task) => await task()),
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      startMainChatStream: vi.fn(),
      handleDirectChatAbort: createHandleDirectChatAbortMock(),
      handleDirectChatStart,
      getActiveCardId: () => 'card-1',
      ipcMain: {
        removeHandler: vi.fn(),
        handle: ipcMainHandle,
      } as any,
    })

    const directRegistration = ipcMainHandle.mock.calls.find(call => call[0] === alicizationChatStartInvokeChannel)
    expect(directRegistration).toBeTruthy()

    const handler = directRegistration?.[1] as (ipcMainEvent: unknown, payload: AlicizationChatStartPayload) => Promise<unknown>
    const payload = createPayload()
    payload.preDialogueSendIdentity = null
    const ipcMainEvent = { sender: { id: 1 } }

    await handler(ipcMainEvent, payload)

    expect(handleDirectChatStart).toHaveBeenCalledWith(ipcMainEvent, expect.objectContaining({
      preDialogueSendIdentity: expect.objectContaining({
        status: 'grounded',
        summaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
        awarenessLine: expect.stringContaining('Before answering, remember'),
        companionBriefingLine: null,
        companionNextClosureLine: expect.stringContaining('Keep extending cross-modal same-her proof'),
      }),
    }))
  })

  it('re-normalizes a thin direct ipc payload summary shell before handing off to the direct handler', async () => {
    const registerInvokeHandler = vi.fn()
    const handleDirectChatStart = vi.fn(async () => ({
      accepted: true as const,
      turnId: 'turn-1',
      state: 'accepted' as const,
      governance: null,
      embodiment: null,
      speechTimeline: null,
    }))
    const ipcMainHandle = vi.fn()

    registerAlicizationChatInvokeHandlers({
      registerInvokeHandler,
      withCardScope: vi.fn(async (_cardId, task) => await task()),
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
      startMainChatStream: vi.fn(),
      handleDirectChatAbort: createHandleDirectChatAbortMock(),
      handleDirectChatStart,
      getActiveCardId: () => 'card-1',
      ipcMain: {
        removeHandler: vi.fn(),
        handle: ipcMainHandle,
      } as any,
    })

    const directRegistration = ipcMainHandle.mock.calls.find(call => call[0] === alicizationChatStartInvokeChannel)
    const handler = directRegistration?.[1] as (ipcMainEvent: unknown, payload: AlicizationChatStartPayload) => Promise<unknown>
    const payload = createPayload()
    payload.preDialogueSendIdentity = {
      status: 'partial',
      summaryLine: 'same digital life | keep the closure seam explicit',
      reasonPreview: [
        'same digital life | keep the closure seam explicit',
      ],
    } as any

    await handler({ sender: { id: 1 } }, payload)

    expect(handleDirectChatStart).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      preDialogueSendIdentity: expect.objectContaining({
        status: 'partial',
        awarenessLine: expect.stringContaining('Before answering, remember'),
      }),
    }))
    expect(handleDirectChatStart).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      preDialogueSendIdentity: expect.not.objectContaining({
        awarenessLine: 'same digital life | keep the closure seam explicit',
      }),
    }))
  })
})
