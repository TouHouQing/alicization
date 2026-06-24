import type { IpcMain } from 'electron'

import type {
  AlicizationChatAbortPayload,
  AlicizationChatAbortResult,
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
} from '../../../shared/eventa'

import {
  alicizationChatAbortInvokeChannel,
  alicizationChatStartInvokeChannel,
  electronAlicizationChatAbort,
  electronAlicizationChatStart,
} from '../../../shared/eventa'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'

interface RegisterAlicizationChatInvokeHandlersOptions {
  registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => void
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  startMainChatStream: (...args: any[]) => Promise<AlicizationChatStartResult>
  handleDirectChatAbort: (payload: AlicizationChatAbortPayload) => Promise<AlicizationChatAbortResult>
  handleDirectChatStart: (...args: any[]) => Promise<AlicizationChatStartResult>
  getActiveCardId: () => string
  ipcMain: IpcMain
}

export function registerAlicizationChatInvokeHandlers(options: RegisterAlicizationChatInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    normalizeCardId,
    sanitizeText,
    appendRuntimeDebugLine,
    startMainChatStream,
    handleDirectChatAbort,
    handleDirectChatStart,
    getActiveCardId,
    ipcMain,
  } = options

  registerInvokeHandler(electronAlicizationChatStart, async (payload: AlicizationChatStartPayload, eventaOptions: unknown) => {
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const cardId = normalizeCardId(normalizedPayload.cardId)
    const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)
    return await withCardScope(cardId, async () => {
      const startedAt = Date.now()
      await appendRuntimeDebugLine('chat-start.invoke-requested', {
        cardId,
        turnId: normalizedPayload.turnId,
        providerId: sanitizeText(normalizedPayload.providerId),
        model: sanitizeText(normalizedPayload.model),
        activeCardId: getActiveCardId(),
        ...preDialogueAwarenessDebug,
      })

      try {
        const result = await startMainChatStream({
          ...normalizedPayload,
          cardId,
        }, eventaOptions)
        await appendRuntimeDebugLine('chat-start.invoke-resolved', {
          cardId,
          turnId: normalizedPayload.turnId,
          state: result.state,
          accepted: result.accepted,
          elapsedMs: Date.now() - startedAt,
          activeCardId: getActiveCardId(),
          ...preDialogueAwarenessDebug,
        })
        return result
      }
      catch (error) {
        await appendRuntimeDebugLine('chat-start.invoke-failed', {
          cardId,
          turnId: normalizedPayload.turnId,
          elapsedMs: Date.now() - startedAt,
          reason: error instanceof Error ? error.message : String(error),
          activeCardId: getActiveCardId(),
          ...preDialogueAwarenessDebug,
        })
        throw error
      }
    }, {
      label: `chat-start:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
  })

  registerInvokeHandler(electronAlicizationChatAbort, async (payload: AlicizationChatAbortPayload) => await handleDirectChatAbort(payload))

  if (typeof ipcMain.removeHandler === 'function') {
    ipcMain.removeHandler(alicizationChatStartInvokeChannel)
    ipcMain.removeHandler(alicizationChatAbortInvokeChannel)
  }
  if (typeof ipcMain.handle === 'function') {
    ipcMain.handle(alicizationChatStartInvokeChannel, async (ipcMainEvent, payload: AlicizationChatStartPayload) => {
      const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
      return await handleDirectChatStart(ipcMainEvent, normalizedPayload)
    })
    ipcMain.handle(alicizationChatAbortInvokeChannel, async (_ipcMainEvent, payload: AlicizationChatAbortPayload) => await handleDirectChatAbort(payload))
  }
}
