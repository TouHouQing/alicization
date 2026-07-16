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
    const cleanPayload = payload
    const cardId = normalizeCardId(cleanPayload.cardId)
    return await withCardScope(cardId, async () => {
      const startedAt = Date.now()
      await appendRuntimeDebugLine('chat-start.invoke-requested', {
        cardId,
        turnId: cleanPayload.turnId,
        providerId: sanitizeText(cleanPayload.providerId),
        model: sanitizeText(cleanPayload.model),
        activeCardId: getActiveCardId(),
      })

      try {
        const result = await startMainChatStream({
          ...cleanPayload,
          cardId,
        }, eventaOptions)
        await appendRuntimeDebugLine('chat-start.invoke-resolved', {
          cardId,
          turnId: cleanPayload.turnId,
          state: result.state,
          accepted: result.accepted,
          elapsedMs: Date.now() - startedAt,
          activeCardId: getActiveCardId(),
        })
        return result
      }
      catch (error) {
        await appendRuntimeDebugLine('chat-start.invoke-failed', {
          cardId,
          turnId: cleanPayload.turnId,
          elapsedMs: Date.now() - startedAt,
          reason: error instanceof Error ? error.message : String(error),
          activeCardId: getActiveCardId(),
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
      return await handleDirectChatStart(ipcMainEvent, payload)
    })
    ipcMain.handle(alicizationChatAbortInvokeChannel, async (_ipcMainEvent, payload: AlicizationChatAbortPayload) => await handleDirectChatAbort(payload))
  }
}
