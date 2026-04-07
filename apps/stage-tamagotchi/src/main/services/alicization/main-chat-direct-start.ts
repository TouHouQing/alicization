import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'

import type {
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
} from '../../../shared/eventa'

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
  const cardId = input.normalizeCardId(input.payload.cardId)

  return await input.withCardScope(cardId, async () => {
    const startedAt = Date.now()
    await input.appendRuntimeDebugLine('chat-start.direct-requested', {
      cardId,
      turnId: input.payload.turnId,
      providerId: input.sanitizeText(input.payload.providerId),
      model: input.sanitizeText(input.payload.model),
      messageCount: Array.isArray(input.payload.messages) ? input.payload.messages.length : 0,
    })

    try {
      const result = await input.startMainChatStream({
        ...input.payload,
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
      })
      return result
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-start.direct-failed', {
        cardId,
        turnId: input.payload.turnId,
        elapsedMs: Date.now() - startedAt,
        reason: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }, {
    label: `chat-start:${cardId}`,
    skipQueueWhenScopeAlreadyActive: true,
  })
}
