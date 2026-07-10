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
import {
  assertAlicizationCanonicalProjectState,
  carriesAlicizationCanonicalProjectState,
} from './main-chat-project-state-guard'
import { shouldIncludeProjectStateProviderContext } from './main-chat-project-state-injection-policy'
import { resolveAlicizationChatStartPayloadPreDialogueSendIdentity } from './main-chat-start-awareness'
import { emptyAlicizationExecutionLedgerContext } from './memory-ledger-runtime'
import { buildAlicizationProviderFacingProjectStateExtraSystemBlocks } from './project-state-brief'
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
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const chatConfig = mainGateway.provider.chat(mainGateway.model)
    const latestUserText = readLatestUserMessageText(normalizedPayload.messages)
    const senderWebContentsId = senderWebContentsIdFromInvokeOptions(invokeOptions)
    const executionCapabilityInquiry = detectAlicizationExecutionCapabilityInquiry(latestUserText || '')
    const explicitExecutionRoutingIntent = detectMainGatewayExecutionRoutingIntent({
      userText: latestUserText || '',
      capabilityInquiry: executionCapabilityInquiry,
    })
    const shouldBypassPerception = latestUserText
      ? isInternalAlicizationRepairPrompt(latestUserText)
      : false
    let messages = resolveChatMessages(normalizedPayload, {
      redactStaleInspectionHistoryForUserText: shouldBypassPerception ? '' : latestUserText,
    })
    messages = preserveLatestUserMultimodalContent({
      originalMessages: normalizedPayload.messages,
      resolvedMessages: messages,
    })

    const contextualStringPromise = shouldBypassPerception
      ? Promise.resolve('')
      : buildMainChatContextualString(normalizedPayload)
    const executionCallbackContextPromise = shouldBypassPerception
      ? Promise.resolve(emptyAlicizationExecutionCallbackContext)
      : buildMainChatExecutionCallbackContext(normalizedPayload)
    const executionLedgerContextPromise = shouldBypassPerception
      ? Promise.resolve(emptyAlicizationExecutionLedgerContext)
      : buildMainChatExecutionLedgerContext(normalizedPayload)
    const perceptionAugmentation = latestUserText && !shouldBypassPerception
      ? await augmentMainChatMessagesWithPerception({
          cardId: normalizedPayload.cardId,
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
    const shouldIncludeProviderProjectStateContext = shouldIncludeProjectStateProviderContext({
      answerSubject: perceptionAugmentation.chatGovernance.mindTurnGovernance?.answerSubject ?? null,
      executionCapabilityInquiry,
      executionRoutingIntent: explicitExecutionRoutingIntent,
      latestUserText,
      messages,
    })
    if (shouldIncludeProviderProjectStateContext && !carriesAlicizationCanonicalProjectState(messages)) {
      messages = [
        ...buildAlicizationProviderFacingProjectStateExtraSystemBlocks().map(content => ({ role: 'system', content }) as Message),
        ...messages,
      ]
    }
    if (shouldIncludeProviderProjectStateContext)
      assertAlicizationCanonicalProjectState(messages, 'stream')
    const actionObligation = deriveMainChatActionObligation({
      userText: latestUserText || '',
      capabilityInquiry: executionCapabilityInquiry,
      explicitRoutingIntent: explicitExecutionRoutingIntent,
      pendingAffirmationThread: latestUserText && !shouldBypassPerception
        ? await buildMainChatPendingAffirmationThread(normalizedPayload)
        : null,
      recentExecutionCallbacks: shouldBypassPerception
        ? []
        : (await executionCallbackContextPromise).callbacks,
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
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
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
