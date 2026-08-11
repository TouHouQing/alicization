import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationEventLoopParticipant,
  AlicizationEventLoopRuntimeView,
  AlicizationModelAction,
  AlicizationModelObservation,
  AlicizationModelStep,
} from './event-loop'

import { randomUUID } from 'node:crypto'

export const alicizationLocalRuntimeUserIdMetaKey = 'alicization.runtime.local-user-id.v1'

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must not be empty`)
  return value.trim()
}

export async function resolveAlicizationLocalRuntimeUserId(options: {
  getMetaValue: (key: string) => Promise<string | undefined>
  setMetaValue: (key: string, value: string) => Promise<void>
  createUserId?: () => string
}) {
  const persisted = (await options.getMetaValue(alicizationLocalRuntimeUserIdMetaKey))?.trim()
  if (persisted)
    return persisted

  const created = requiredText(
    (options.createUserId ?? randomUUID)(),
    'local runtime userId',
  )
  await options.setMetaValue(alicizationLocalRuntimeUserIdMetaKey, created)
  return created
}

export interface AlicizationMainChatParticipantTurnInput<TPrepared = {
  conversationSessionId: string | null
}> {
  payload: {
    cardId: string
    turnId: string
  }
  preludeTurnId: string | null | undefined
  prepared: TPrepared
}

export type AlicizationMainChatProviderStep
  = | {
    kind: 'action'
    action: AlicizationModelAction
  }
  | {
    kind: 'reply'
    text: string
  }

export interface AlicizationMainChatParticipantContext<TPrepared> {
  payload: {
    cardId: string
    turnId: string
  }
  prepared: TPrepared
  providerMessages: Message[]
}

export function createAlicizationMainChatParticipant<TPrepared extends {
  conversationSessionId: string | null
  messages?: ReadonlyArray<{
    role: string
    content?: unknown
  }>
}>(options: {
  runProviderStep: (
    context: AlicizationMainChatParticipantContext<TPrepared>,
    runtime: AlicizationEventLoopRuntimeView,
  ) => Promise<AlicizationMainChatProviderStep>
  executeTool: (
    action: AlicizationModelAction,
    context: AlicizationMainChatParticipantContext<TPrepared>,
    runtime: AlicizationEventLoopRuntimeView,
  ) => Promise<AlicizationModelObservation>
  publishReply: (input: {
    cardId: string
    conversationId: string
    text: string
    turnId: string
    userId: string
  }) => Promise<void>
}): AlicizationEventLoopParticipant<
  AlicizationMainChatParticipantTurnInput<TPrepared>,
  AlicizationMainChatParticipantContext<TPrepared>
> {
  const contextByTurnId = new Map<string, AlicizationMainChatParticipantContext<TPrepared>>()

  return {
    assembleContext: async (input, runtime) => {
      const payloadTurnId = requiredText(input.payload.turnId, 'main chat payload turnId')
      const payloadCardId = requiredText(input.payload.cardId, 'main chat payload cardId')
      const preludeTurnId = requiredText(input.preludeTurnId, 'main chat prelude turnId')
      const conversationId = input.prepared.conversationSessionId?.trim()

      if (payloadTurnId !== runtime.turnId)
        throw new Error('main chat payload turn identity does not match runtime scope')
      if (payloadCardId !== runtime.cardId)
        throw new Error('main chat payload card identity does not match runtime scope')
      if (preludeTurnId !== payloadTurnId)
        throw new Error('stale main chat prelude turn identity')
      if (!conversationId)
        throw new TypeError('main chat requires a real conversationSessionId')
      if (conversationId !== runtime.conversationId)
        throw new Error('main chat conversation identity does not match runtime scope')
      requiredText(runtime.userId, 'main chat runtime userId')

      const context = {
        payload: {
          cardId: payloadCardId,
          turnId: payloadTurnId,
        },
        prepared: input.prepared,
        providerMessages: Array.isArray(input.prepared.messages)
          ? [...input.prepared.messages] as Message[]
          : [],
      }
      contextByTurnId.set(runtime.turnId, context)
      return context
    },

    runModelStep: async (context, runtime): Promise<AlicizationModelStep> => {
      const step = await options.runProviderStep(context, runtime)
      return step.kind === 'reply'
        ? {
            kind: 'reply',
            reply: {
              text: requiredText(step.text, 'Provider reply text'),
            },
          }
        : step
    },

    executeAction: async (action, runtime) => {
      const context = contextByTurnId.get(runtime.turnId)
      if (!context)
        throw new Error('main chat participant context is unavailable for tool execution')
      const observation = await options.executeTool(action, context, runtime)
      if (!action.toolCallId)
        throw new Error('main chat tool action requires a Provider toolCallId')
      context.providerMessages.push({
        role: 'tool',
        tool_call_id: action.toolCallId,
        content: serializeProviderToolObservation(observation.output ?? observation),
      })
      return observation
    },

    settleReply: async (reply, runtime) => {
      await options.publishReply({
        cardId: runtime.cardId,
        conversationId: runtime.conversationId,
        text: reply.text,
        turnId: runtime.turnId,
        userId: runtime.userId,
      })
      contextByTurnId.delete(runtime.turnId)
    },
  }
}

function serializeProviderToolObservation(value: unknown) {
  if (typeof value === 'string')
    return value
  try {
    return JSON.stringify(value)
  }
  catch {
    throw new TypeError('tool observation must be serializable for Provider continuation')
  }
}
