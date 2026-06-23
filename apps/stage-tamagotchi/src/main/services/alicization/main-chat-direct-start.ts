import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'

import type {
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
} from '../../../shared/eventa'

import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'

interface HandleAlicizationDirectChatStartOptions {
  ipcMainEvent: IpcMainInvokeEvent
  payload: AlicizationChatStartPayload
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  startMainChatStream: (
    payload: AlicizationChatStartPayload,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ) => Promise<AlicizationChatStartResult>
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
}

export async function handleAlicizationDirectChatStart(
  input: HandleAlicizationDirectChatStartOptions,
): Promise<AlicizationChatStartResult> {
  const payload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
  const cardId = input.normalizeCardId(payload.cardId)
  const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(payload)

  return await input.withCardScope(cardId, async () => {
    const startedAt = Date.now()
    await input.appendRuntimeDebugLine('chat-start.direct-requested', {
      cardId,
      turnId: input.payload.turnId,
      providerId: input.sanitizeText(input.payload.providerId),
      model: input.sanitizeText(input.payload.model),
      messageCount: Array.isArray(input.payload.messages) ? input.payload.messages.length : 0,
      ...preDialogueAwarenessDebug,
    })

    try {
      const result = await input.startMainChatStream({
        ...payload,
        cardId,
      }, {
        raw: {
          ipcMainEvent: input.ipcMainEvent as unknown as IpcMainEvent,
        },
      })
      await input.appendRuntimeDebugLine('chat-start.direct-resolved', {
        cardId,
        turnId: input.payload.turnId,
        accepted: result.accepted,
        state: result.state,
        elapsedMs: Date.now() - startedAt,
        ...preDialogueAwarenessDebug,
      })
      return result
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-start.direct-failed', {
        cardId,
        turnId: input.payload.turnId,
        elapsedMs: Date.now() - startedAt,
        reason: error instanceof Error ? error.message : String(error),
        ...preDialogueAwarenessDebug,
      })
      throw error
    }
  }, {
    label: `chat-start:${cardId}`,
    skipQueueWhenScopeAlreadyActive: true,
  })
}
