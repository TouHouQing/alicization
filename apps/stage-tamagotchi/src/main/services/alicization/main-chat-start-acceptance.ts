import type { IpcMainEvent } from 'electron'

import type {
  AlicizationChatStartPayload,
  AlicizationChatStartResult,
} from '../../../shared/eventa'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type {
  ChatRunState,
  MainGatewayResolvedConfig,
} from './runtime-soul'

import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'
import { readTransportContentAsText } from './runtime-transport-content'

interface AlicizationMainChatRunStateReadFacade {
  createKey: (cardId: string, turnId: string) => string
  hasRecentlyFinished: (key: string) => boolean
}

interface AcceptAlicizationMainChatStartOptions {
  payload: AlicizationChatStartPayload
  rawInvokeOptions?: { ipcMainEvent?: IpcMainEvent, event?: unknown }
  getExistingRun: (key: string) => ChatRunState | undefined
  registerRun: (key: string, runState: ChatRunState) => void
  mainChatRunState: AlicizationMainChatRunStateReadFacade
  settleRecentDialogueReplyFeedbackFromUserTurn?: (payload: AlicizationChatStartPayload, now: number, trigger: string) => Promise<unknown>
  settleRecentExecutionResultFeedbackFromUserTurn?: (payload: AlicizationChatStartPayload, now: number, trigger: string) => Promise<unknown>
  settlePendingExecutionProposalFeedbackFromUserTurn?: (payload: AlicizationChatStartPayload, now: number, trigger: string) => Promise<unknown>
  settlePendingProactiveOutcomesFromUserTurn: (
    cardId: string,
    now: number,
    trigger: string,
    carry?: {
      userText?: string | null
    },
  ) => Promise<unknown>
  resolveMainGatewayConfig: (options?: {
    cardId?: string
    providerId?: string
    model?: string
    providerConfig?: Record<string, unknown>
  }) => MainGatewayResolvedConfig | null
  rememberMainGatewayRoute: (input: {
    cardId?: string
    mainGateway: Pick<MainGatewayResolvedConfig, 'providerId' | 'model'>
    providerConfig?: Record<string, unknown>
  }) => void
  syncMainGatewayConfigFromChatStart: (input: {
    mainGateway: MainGatewayResolvedConfig
    providerConfig: Record<string, unknown>
  }) => Promise<{
    activeProviderId: string
    activeModelId: string
    persistedConfigKeys: string[]
  }>
  ensureMainGatewayReachable: (mainGateway: MainGatewayResolvedConfig, options?: {
    bypassCache?: boolean
    ignoreChatTimeoutCache?: boolean
  }) => Promise<AlicizationMainGatewayReachabilitySnapshot>
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
}

type AlicizationMainChatStartAcceptance
  = | {
    accepted: false
    result: AlicizationChatStartResult
  }
  | {
    accepted: true
    key: string
    mainGateway: MainGatewayResolvedConfig
    runState: ChatRunState
  }

export async function acceptAlicizationMainChatStart(
  input: AcceptAlicizationMainChatStartOptions,
): Promise<AlicizationMainChatStartAcceptance> {
  const payload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
  const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(payload)
  const key = input.mainChatRunState.createKey(payload.cardId, payload.turnId)
  const existing = input.getExistingRun(key)
  if (existing && existing.state === 'running') {
    await input.appendRuntimeDebugLine('chat-start.duplicate-running', {
      cardId: payload.cardId,
      turnId: payload.turnId,
      ...preDialogueAwarenessDebug,
    })
    return {
      accepted: false,
      result: {
        accepted: false,
        turnId: payload.turnId,
        state: 'duplicate-running',
        reason: 'Turn is already running.',
      },
    }
  }

  if (input.mainChatRunState.hasRecentlyFinished(key)) {
    await input.appendRuntimeDebugLine('chat-start.duplicate-finished', {
      cardId: payload.cardId,
      turnId: payload.turnId,
      ...preDialogueAwarenessDebug,
    })
    return {
      accepted: false,
      result: {
        accepted: false,
        turnId: payload.turnId,
        state: 'duplicate-finished',
        reason: 'Turn has already finished.',
      },
    }
  }

  const feedbackNow = Date.now()
  const latestUserMessage = payload.messages
    .slice()
    .reverse()
    .find(message => message?.role === 'user')
  const proactiveUserText = readTransportContentAsText(latestUserMessage?.content).trim()
  await input.settleRecentDialogueReplyFeedbackFromUserTurn?.(payload, feedbackNow, 'chat-start')
  await input.settleRecentExecutionResultFeedbackFromUserTurn?.(payload, feedbackNow, 'chat-start')
  await input.settlePendingExecutionProposalFeedbackFromUserTurn?.(payload, feedbackNow, 'chat-start')
  await input.settlePendingProactiveOutcomesFromUserTurn(payload.cardId, feedbackNow, 'chat-start', {
    userText: proactiveUserText || null,
  })

  const mainGateway = input.resolveMainGatewayConfig({
    cardId: payload.cardId,
    providerId: payload.providerId,
    model: payload.model,
    providerConfig: payload.providerConfig,
  })
  if (!mainGateway) {
    const reason = `Missing providerId/model for main-process chat stream. providerId="${input.sanitizeText(payload.providerId)}" model="${input.sanitizeText(payload.model)}"`
    await input.appendRuntimeDebugLine('chat-start.missing-config', {
      cardId: payload.cardId,
      turnId: payload.turnId,
      reason,
      ...preDialogueAwarenessDebug,
    })
    return {
      accepted: false,
      result: {
        accepted: false,
        turnId: payload.turnId,
        state: 'missing-config',
        reason,
      },
    }
  }
  const llmConfigState = await input.syncMainGatewayConfigFromChatStart({
    mainGateway,
    providerConfig: payload.providerConfig,
  })
  await input.appendRuntimeDebugLine('llm-config.updated-from-chat-start', {
    cardId: payload.cardId,
    turnId: payload.turnId,
    providerId: llmConfigState.activeProviderId,
    model: llmConfigState.activeModelId,
    persistedConfigKeys: llmConfigState.persistedConfigKeys,
    ...preDialogueAwarenessDebug,
  })

  input.rememberMainGatewayRoute({
    cardId: payload.cardId,
    mainGateway,
    providerConfig: payload.providerConfig,
  })

  const controller = new AbortController()
  const runState: ChatRunState = {
    cardId: input.normalizeCardId(payload.cardId),
    turnId: payload.turnId,
    controller,
    sender: input.rawInvokeOptions?.ipcMainEvent?.sender,
    rawInvokeOptions: input.rawInvokeOptions,
    chunkCount: 0,
    rawChunkChars: 0,
    state: 'running',
  }
  input.registerRun(key, runState)
  await input.appendRuntimeDebugLine('chat-start.accepted', {
    cardId: runState.cardId,
    turnId: runState.turnId,
    providerId: payload.providerId,
    model: payload.model,
    senderId: runState.sender?.id ?? null,
    preparationDeferred: true,
    gatewayReachable: null,
    gatewayReachabilityCode: null,
    ...preDialogueAwarenessDebug,
  })

  return {
    accepted: true,
    key,
    mainGateway,
    runState,
  }
}
