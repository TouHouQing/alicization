import type { Message } from '@xsai/shared-chat'
import type { IpcMainEvent } from 'electron'

import type {
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
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
    userText: string
    messages: Message[]
    senderWebContentsId?: number | null
    skipInspectionGrounding?: boolean
  }) => Promise<any>
  prepareMainChatSessionExecution: (input: {
    payload: AlicizationChatStartPayload
    prelude: AlicizationPreparedMainChatPrelude
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
      ? await augmentMainChatMessagesWithPerception({
          cardId: normalizedPayload.cardId,
          userText: latestUserText,
          messages,
          senderWebContentsId,
          skipInspectionGrounding: false,
        })
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
  ): Promise<AlicizationPreparedMainChatExecutionResult> {
    const normalizedPayload = payload
    const prelude = await (preludePromise ?? prepareMainChatPrelude(normalizedPayload, mainGateway))
    return await prepareMainChatSessionExecution({
      payload: normalizedPayload,
      prelude,
    })
  }

  return {
    prepareMainChatPrelude,
    prepareMainChatExecution,
  }
}
