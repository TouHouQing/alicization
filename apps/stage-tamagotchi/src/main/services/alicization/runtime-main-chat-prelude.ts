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

import { detectAlicizationExecutionCapabilityInquiry } from '@proj-alicization/stage-shared'

import { isInternalAlicizationRepairPrompt } from './attention-anchor'
import { emptyAlicizationExecutionCallbackContext } from './execution-callback-runtime'
import { deriveMainChatActionObligation } from './main-chat-action-obligation'
import {
  detectMainGatewayExecutionRoutingIntent,
} from './main-chat-execution-surface'
import { emptyAlicizationExecutionLedgerContext } from './memory-ledger-runtime'
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
  buildMainChatPendingAffirmationThread: (payload: AlicizationChatStartPayload) => Promise<any>
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
    buildMainChatPendingAffirmationThread,
    augmentMainChatMessagesWithPerception,
    prepareMainChatSessionExecution,
  } = options

  async function prepareMainChatPrelude(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    invokeOptions?: { raw?: { ipcMainEvent?: IpcMainEvent, event?: unknown } },
  ): Promise<AlicizationPreparedMainChatPrelude> {
    const chatConfig = mainGateway.provider.chat(mainGateway.model)
    const latestUserText = readLatestUserMessageText(payload.messages)
    const senderWebContentsId = senderWebContentsIdFromInvokeOptions(invokeOptions)
    const executionCapabilityInquiry = detectAlicizationExecutionCapabilityInquiry(latestUserText || '')
    const explicitExecutionRoutingIntent = detectMainGatewayExecutionRoutingIntent({
      userText: latestUserText || '',
      capabilityInquiry: executionCapabilityInquiry,
    })
    const shouldBypassPerception = latestUserText
      ? isInternalAlicizationRepairPrompt(latestUserText)
      : false
    let messages = resolveChatMessages(payload, {
      redactStaleInspectionHistoryForUserText: shouldBypassPerception ? '' : latestUserText,
    })
    messages = preserveLatestUserMultimodalContent({
      originalMessages: payload.messages,
      resolvedMessages: messages,
    })

    const contextualStringPromise = shouldBypassPerception
      ? Promise.resolve('')
      : buildMainChatContextualString(payload)
    const executionCallbackContextPromise = shouldBypassPerception
      ? Promise.resolve(emptyAlicizationExecutionCallbackContext)
      : buildMainChatExecutionCallbackContext(payload)
    const executionLedgerContextPromise = shouldBypassPerception
      ? Promise.resolve(emptyAlicizationExecutionLedgerContext)
      : buildMainChatExecutionLedgerContext(payload)
    const perceptionAugmentation = latestUserText && !shouldBypassPerception
      ? await augmentMainChatMessagesWithPerception({
          cardId: payload.cardId,
          userText: latestUserText,
          messages,
          senderWebContentsId,
          skipInspectionGrounding: Boolean(explicitExecutionRoutingIntent),
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
            suppressAssociativeRecall: false,
            turnMode: 'answer' as const,
            personaKernelMode: 'full' as const,
            mindTurnGovernance: null,
          },
        }
    messages = perceptionAugmentation.messages
    const actionObligation = deriveMainChatActionObligation({
      userText: latestUserText || '',
      capabilityInquiry: executionCapabilityInquiry,
      explicitRoutingIntent: explicitExecutionRoutingIntent,
      pendingAffirmationThread: latestUserText && !shouldBypassPerception
        ? await buildMainChatPendingAffirmationThread(payload)
        : null,
      runtimeSurface: perceptionAugmentation.digitalLifeRuntimeSurface,
    })

    return {
      actionObligation,
      chatConfig,
      messages,
      contextualStringPromise,
      executionCallbackContextPromise,
      executionLedgerContextPromise,
      executionCapabilityInquiry,
      executionRoutingIntent: actionObligation.routingIntent ?? explicitExecutionRoutingIntent,
      perceptionAugmentation,
    }
  }

  async function prepareMainChatExecution(
    payload: AlicizationChatStartPayload,
    mainGateway: MainGatewayResolvedConfig,
    preludePromise?: Promise<AlicizationPreparedMainChatPrelude>,
  ): Promise<AlicizationPreparedMainChatExecutionResult> {
    const prelude = await (preludePromise ?? prepareMainChatPrelude(payload, mainGateway))
    return await prepareMainChatSessionExecution({
      payload,
      prelude,
    })
  }

  return {
    prepareMainChatPrelude,
    prepareMainChatExecution,
  }
}
