import type { Message } from '@xsai/shared-chat'
import type { IpcMainEvent } from 'electron'

import type {
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { MainGatewayToolExecutionProgress } from './main-chat-execution-surface'
import type {
  AlicizationPreparedMainChatExecutionResult,
  AlicizationPreparedMainChatPrelude,
  AlicizationWorkingMemoryHydration,
} from './main-chat-session-runtime'
import type { MainGatewayResolvedConfig } from './runtime-soul'

import { deriveMainChatActionObligation } from './main-chat-action-obligation'
import { preserveLatestUserMultimodalContent } from './runtime-transport-content'

interface CreateAlicizationMainChatPreludeRuntimeOptions {
  readLatestUserMessageText: (messages: AlicizationChatStartPayload['messages']) => string
  senderWebContentsIdFromInvokeOptions: (
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ) => number | null | undefined
  resolveChatMessages: (
    payload: AlicizationChatStartPayload,
    options?: {
      redactStaleInspectionHistoryForUserText?: string
    },
  ) => Message[]
  buildMainChatContextualString: (payload: AlicizationChatStartPayload) => Promise<string>
  buildMainChatExecutionCallbackContext: (payload: AlicizationChatStartPayload) => Promise<any>
  buildMainChatExecutionLedgerContext: (payload: AlicizationChatStartPayload) => Promise<any>
  hydrateWorkingMemory?: (input: {
    cardId: string
    turnId: string
    sessionId: string
  }) => Promise<AlicizationWorkingMemoryHydration>
  augmentMainChatMessagesWithPerception: (input: {
    cardId: string
    turnId: string
    userText: string
    messages: Message[]
    workingMemorySnapshot?: AlicizationWorkingMemoryHydration['snapshot']
    senderWebContentsId?: number | null
    abortSignal?: AbortSignal
  }) => Promise<any>
  prepareMainChatSessionExecution: (input: {
    payload: AlicizationChatStartPayload
    prelude: AlicizationPreparedMainChatPrelude
    agentTurn?: AlicizationAgentTurnRuntime
    emitToolProgress?: (input: MainGatewayToolExecutionProgress) => void
    abortSignal?: AbortSignal
  }) => Promise<AlicizationPreparedMainChatExecutionResult>
}

export function createAlicizationMainChatPreludeRuntime(options: CreateAlicizationMainChatPreludeRuntimeOptions) {
  const {
    readLatestUserMessageText,
    senderWebContentsIdFromInvokeOptions,
    resolveChatMessages,
    buildMainChatContextualString,
    buildMainChatExecutionCallbackContext,
    buildMainChatExecutionLedgerContext,
    hydrateWorkingMemory,
    augmentMainChatMessagesWithPerception,
    prepareMainChatSessionExecution,
  } = options

  async function prepareMainChatPrelude(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
    options?: {
      abortSignal?: AbortSignal
      agentTurn?: AlicizationAgentTurnRuntime
    },
  ): Promise<AlicizationPreparedMainChatPrelude> {
    const normalizedPayload = payload
    const chatConfig = mainGateway.provider.chat(mainGateway.model)
    const latestUserText = readLatestUserMessageText(normalizedPayload.messages)
    const senderWebContentsId = senderWebContentsIdFromInvokeOptions(invokeOptions)
    const workingMemorySessionId = options?.agentTurn?.conversationSessionId ?? null
    const workingMemoryHydration = workingMemorySessionId && hydrateWorkingMemory
      ? await awaitAlicizationPromiseWithAbort(hydrateWorkingMemory({
          cardId: normalizedPayload.cardId,
          turnId: normalizedPayload.turnId,
          sessionId: workingMemorySessionId,
        }), options?.abortSignal)
      : null
    let messages = resolveChatMessages(normalizedPayload, {
      redactStaleInspectionHistoryForUserText: latestUserText,
    })
    messages = preserveLatestUserMultimodalContent({
      originalMessages: normalizedPayload.messages,
      resolvedMessages: messages,
    })
    const perceptionMessages = scopeMessagesForCurrentTurn(messages)

    const contextualStringPromise = buildMainChatContextualString(normalizedPayload)
    const executionCallbackContextPromise = buildMainChatExecutionCallbackContext(normalizedPayload)
    const executionLedgerContextPromise = buildMainChatExecutionLedgerContext(normalizedPayload)
    const perceptionAugmentation = latestUserText
      ? await awaitAlicizationPromiseWithAbort(augmentMainChatMessagesWithPerception({
          cardId: normalizedPayload.cardId,
          turnId: normalizedPayload.turnId,
          userText: latestUserText,
          messages: perceptionMessages,
          workingMemorySnapshot: workingMemoryHydration?.snapshot ?? null,
          senderWebContentsId,
          abortSignal: options?.abortSignal,
        }), options?.abortSignal)
      : {
          messages,
          systemBlocks: [] as string[],
          promptSystemBlocks: [] as string[],
          digitalLifeRuntimeSurface: null,
          memoryRecallSeed: '',
          recallGovernor: null,
          capture: {
            inspectionRequested: false,
            groundedThisTurn: false,
            snapshot: null,
            fallbackReason: null,
          },
          chatGovernance: {
            turnMode: 'answer' as const,
            personaKernelMode: 'full' as const,
            mindTurnGovernance: null,
          },
        }
    messages = mergePerceptionMessagesIntoTransportMessages(
      messages,
      perceptionAugmentation.messages,
    )
    const actionObligation = deriveMainChatActionObligation({
      userText: latestUserText || '',
      runtimeSurface: perceptionAugmentation.digitalLifeRuntimeSurface,
    })

    return {
      turnId: normalizedPayload.turnId,
      actionObligation,
      chatConfig,
      messages,
      contextualStringPromise,
      executionCallbackContextPromise,
      executionLedgerContextPromise,
      perceptionAugmentation,
      workingMemoryHydration,
    }
  }

  async function prepareMainChatExecution(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    preludePromise?: Promise<AlicizationPreparedMainChatPrelude>,
    options?: {
      agentTurn?: AlicizationAgentTurnRuntime
      emitToolProgress?: (input: MainGatewayToolExecutionProgress) => void
      abortSignal?: AbortSignal
      userId?: string
    },
  ): Promise<AlicizationPreparedMainChatExecutionResult> {
    const normalizedPayload = payload
    const prelude = await (preludePromise ?? prepareMainChatPrelude(normalizedPayload, mainGateway, undefined, {
      abortSignal: options?.abortSignal,
      agentTurn: options?.agentTurn,
    }))
    return await prepareMainChatSessionExecution({
      payload: normalizedPayload,
      prelude,
      ...options,
    })
  }

  return {
    prepareMainChatPrelude,
    prepareMainChatExecution,
  }
}

function scopeMessagesForCurrentTurn(messages: Message[]) {
  let currentTurnStart = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      currentTurnStart = index
      break
    }
  }

  if (currentTurnStart < 0)
    return messages.filter(message => message?.role === 'system')

  return messages.filter((message, index) =>
    message?.role === 'system'
    || index >= currentTurnStart,
  )
}

function mergePerceptionMessagesIntoTransportMessages(
  transportMessages: Message[],
  perceptionMessages: Message[],
) {
  const scopedIndexes: number[] = []
  let currentTurnStart = -1
  for (let index = transportMessages.length - 1; index >= 0; index -= 1) {
    if (transportMessages[index]?.role === 'user') {
      currentTurnStart = index
      break
    }
  }

  if (currentTurnStart < 0)
    return transportMessages

  transportMessages.forEach((message, index) => {
    if (message?.role === 'system' || index >= currentTurnStart)
      scopedIndexes.push(index)
  })

  return transportMessages.map((message, index) => {
    const perceptionIndex = scopedIndexes.indexOf(index)
    return perceptionMessages[perceptionIndex] ?? message
  })
}

function awaitAlicizationPromiseWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
) {
  if (!signal)
    return promise
  if (signal.aborted)
    return Promise.reject(signal.reason ?? new DOMException('Alicization runtime aborted', 'AbortError'))

  return new Promise<T>((resolve, reject) => {
    let settled = false
    let onAbort = () => {}
    const cleanup = () => {
      signal.removeEventListener('abort', onAbort)
    }
    const settle = (callback: () => void) => {
      if (settled)
        return
      settled = true
      cleanup()
      callback()
    }
    onAbort = () => {
      settle(() => reject(signal.reason ?? new DOMException('Alicization runtime aborted', 'AbortError')))
    }

    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      value => settle(() => resolve(value)),
      error => settle(() => reject(error)),
    )
  })
}
