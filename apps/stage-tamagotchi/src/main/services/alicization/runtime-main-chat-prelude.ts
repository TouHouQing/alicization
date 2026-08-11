import type { Message } from '@xsai/shared-chat'
import type { IpcMainEvent } from 'electron'

import type {
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type { MainGatewayToolExecutionProgress } from './main-chat-execution-surface'
import type {
  AlicizationPreparedMainChatExecutionResult,
  AlicizationPreparedMainChatPrelude,
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
  augmentMainChatMessagesWithPerception: (input: {
    cardId: string
    turnId: string
    userText: string
    messages: Message[]
    senderWebContentsId?: number | null
    abortSignal?: AbortSignal
  }) => Promise<any>
  prepareMainChatSessionExecution: (input: {
    payload: AlicizationChatStartPayload
    prelude: AlicizationPreparedMainChatPrelude
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
    augmentMainChatMessagesWithPerception,
    prepareMainChatSessionExecution,
  } = options

  async function prepareMainChatPrelude(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
    options?: {
      abortSignal?: AbortSignal
    },
  ): Promise<AlicizationPreparedMainChatPrelude> {
    const normalizedPayload = payload
    const chatConfig = mainGateway.provider.chat(mainGateway.model)
    const latestUserText = readLatestUserMessageText(normalizedPayload.messages)
    const senderWebContentsId = senderWebContentsIdFromInvokeOptions(invokeOptions)
    let messages = resolveChatMessages(normalizedPayload, {
      redactStaleInspectionHistoryForUserText: latestUserText,
    })
    messages = preserveLatestUserMultimodalContent({
      originalMessages: normalizedPayload.messages,
      resolvedMessages: messages,
    })

    const contextualStringPromise = buildMainChatContextualString(normalizedPayload)
    const executionCallbackContextPromise = buildMainChatExecutionCallbackContext(normalizedPayload)
    const executionLedgerContextPromise = buildMainChatExecutionLedgerContext(normalizedPayload)
    const perceptionAugmentation = latestUserText
      ? await awaitAlicizationPromiseWithAbort(augmentMainChatMessagesWithPerception({
          cardId: normalizedPayload.cardId,
          turnId: normalizedPayload.turnId,
          userText: latestUserText,
          messages,
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
    messages = perceptionAugmentation.messages
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
    }
  }

  async function prepareMainChatExecution(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    preludePromise?: Promise<AlicizationPreparedMainChatPrelude>,
    options?: {
      emitToolProgress?: (input: MainGatewayToolExecutionProgress) => void
      abortSignal?: AbortSignal
    },
  ): Promise<AlicizationPreparedMainChatExecutionResult> {
    const normalizedPayload = payload
    const prelude = await (preludePromise ?? prepareMainChatPrelude(normalizedPayload, mainGateway, undefined, {
      abortSignal: options?.abortSignal,
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
