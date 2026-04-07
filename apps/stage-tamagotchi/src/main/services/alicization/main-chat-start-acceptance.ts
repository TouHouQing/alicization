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
  settlePendingProactiveOutcomesFromUserTurn: (cardId: string, now: number, trigger: string) => Promise<unknown>
  resolveMainGatewayConfig: (options?: {
    providerId?: string
    model?: string
    providerConfig?: Record<string, unknown>
  }) => MainGatewayResolvedConfig | null
  syncMainGatewayConfigFromChatStart: (input: {
    mainGateway: MainGatewayResolvedConfig
    providerConfig: Record<string, unknown>
  }) => Promise<{
    activeProviderId: string
    activeModelId: string
    persistedConfigKeys: string[]
  }>
  ensureMainGatewayReachable: (mainGateway: MainGatewayResolvedConfig) => Promise<AlicizationMainGatewayReachabilitySnapshot>
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
  const key = input.mainChatRunState.createKey(input.payload.cardId, input.payload.turnId)
  const existing = input.getExistingRun(key)
  if (existing && existing.state === 'running') {
    await input.appendRuntimeDebugLine('chat-start.duplicate-running', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
    })
    return {
      accepted: false,
      result: {
        accepted: false,
        turnId: input.payload.turnId,
        state: 'duplicate-running',
        reason: 'Turn is already running.',
      },
    }
  }

  if (input.mainChatRunState.hasRecentlyFinished(key)) {
    await input.appendRuntimeDebugLine('chat-start.duplicate-finished', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
    })
    return {
      accepted: false,
      result: {
        accepted: false,
        turnId: input.payload.turnId,
        state: 'duplicate-finished',
        reason: 'Turn has already finished.',
      },
    }
  }

  await input.settlePendingProactiveOutcomesFromUserTurn(input.payload.cardId, Date.now(), 'chat-start')

  const mainGateway = input.resolveMainGatewayConfig({
    providerId: input.payload.providerId,
    model: input.payload.model,
    providerConfig: input.payload.providerConfig,
  })
  if (!mainGateway) {
    const reason = `Missing providerId/model for main-process chat stream. providerId="${input.sanitizeText(input.payload.providerId)}" model="${input.sanitizeText(input.payload.model)}"`
    await input.appendRuntimeDebugLine('chat-start.missing-config', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      reason,
    })
    return {
      accepted: false,
      result: {
        accepted: false,
        turnId: input.payload.turnId,
        state: 'missing-config',
        reason,
      },
    }
  }

  const llmConfigState = await input.syncMainGatewayConfigFromChatStart({
    mainGateway,
    providerConfig: input.payload.providerConfig,
  })
  await input.appendRuntimeDebugLine('llm-config.updated-from-chat-start', {
    cardId: input.payload.cardId,
    turnId: input.payload.turnId,
    providerId: llmConfigState.activeProviderId,
    model: llmConfigState.activeModelId,
    persistedConfigKeys: llmConfigState.persistedConfigKeys,
  })

  const reachability = await input.ensureMainGatewayReachable(mainGateway)
  if (!reachability.reachable) {
    const reason = reachability.formattedReason
      ?? reachability.reason
      ?? 'Main gateway connectivity check failed.'
    await input.appendRuntimeDebugLine('chat-start.gateway-unreachable', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      cached: reachability.cached ?? false,
      code: reachability.code,
      reason,
    })
    return {
      accepted: false,
      result: {
        accepted: false,
        turnId: input.payload.turnId,
        state: 'start-failed',
        reason,
      },
    }
  }

  const controller = new AbortController()
  const runState: ChatRunState = {
    cardId: input.normalizeCardId(input.payload.cardId),
    turnId: input.payload.turnId,
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
    providerId: input.payload.providerId,
    model: input.payload.model,
    senderId: runState.sender?.id ?? null,
    preparationDeferred: true,
  })

  return {
    accepted: true,
    key,
    mainGateway,
    runState,
  }
}
