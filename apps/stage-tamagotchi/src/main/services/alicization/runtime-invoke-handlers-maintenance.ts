import type {
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult,
  AlicizationSubconsciousStatePayload,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'

import {
  electronAlicizationAppendAuditLog,
  electronAlicizationDeleteAllData,
  electronAlicizationDeleteCardScope,
  electronAlicizationLlmGetConfig,
  electronAlicizationLlmSyncConfig,
  electronAlicizationRealtimeExecute,
  electronAlicizationSubconsciousForceDream,
  electronAlicizationSubconsciousForceTick,
  electronAlicizationSubconsciousGetState,
} from '../../../shared/eventa'

interface RegisterAlicizationMaintenanceInvokeHandlersOptions {
  registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => void
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  cardIdFrom: (scope?: AlicizationCardScope) => string
  getActiveCardId: () => string
  getAlicizationDb: () => any
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  executeBuiltinRealtimeQuery: (payload: AlicizationRealtimeExecutePayload) => Promise<AlicizationRealtimeExecuteResult>
  defaultAlicizationCardId: string
  normalizeCardId: (raw: unknown) => string
  switchCardScope: (nextCardIdRaw: unknown) => Promise<void>
  resolveCardPaths: (cardId: string) => { soulRoot: string }
  rm: (path: string, options: { recursive: true, force: true }) => Promise<void>
  proactiveLoopStateByCard: Map<string, unknown>
  perceptionStateByCard: Map<string, unknown>
  visualPresenceStateByCard: Map<string, unknown>
  visualPresenceCapturePersistMetaByCard: Map<string, unknown>
  emitVisualPresenceState: (cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) => void
  screenSemanticCacheByCard: Map<string, unknown>
  subconsciousStateByCard: Map<string, unknown>
  activeSessionIdByCard: Map<string, unknown>
  dialogueAckByCard: Map<string, unknown>
  clearDialogueSessionMirrorCard: (cardId: string) => void
  clearExecutionDeliveryStateMemory: (cardId: string) => void
  bootstrap: () => Promise<unknown>
  deleteAllAlicizationData: (reason: string) => Promise<void>
  ensureSubconsciousState: (cardId: string) => Promise<{
    boredom: number
    loneliness: number
    fatigue: number
    lastTickAt: number
    lastInteractionAt: number
    lastSavedAt: number
    updatedAt: number
  }>
  runSubconsciousTickAcrossCards: (trigger: 'force', cardIds?: string[]) => Promise<unknown>
  runDreamAcrossCards: (reason: string, specificCardIds?: string[]) => Promise<unknown>
  sanitizeText: (raw: unknown, fallback?: string) => string
  normalizeProviderCredentialsMap: (raw: unknown) => Record<string, Record<string, unknown>>
  setActiveProviderId: (value: string) => void
  setActiveModelId: (value: string) => void
  setProviderCredentials: (value: Record<string, Record<string, unknown>>) => void
  persistLlmConfigToDisk: () => Promise<void>
  getActiveProviderId: () => string
  getActiveModelId: () => string
  getProviderCredentials: () => Record<string, Record<string, unknown>>
}

export function registerAlicizationMaintenanceInvokeHandlers(options: RegisterAlicizationMaintenanceInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    cardIdFrom,
    getActiveCardId,
    getAlicizationDb,
    appendAuditLog,
    executeBuiltinRealtimeQuery,
    defaultAlicizationCardId,
    normalizeCardId,
    switchCardScope,
    resolveCardPaths,
    rm,
    proactiveLoopStateByCard,
    perceptionStateByCard,
    visualPresenceStateByCard,
    visualPresenceCapturePersistMetaByCard,
    emitVisualPresenceState,
    screenSemanticCacheByCard,
    subconsciousStateByCard,
    activeSessionIdByCard,
    dialogueAckByCard,
    clearDialogueSessionMirrorCard,
    clearExecutionDeliveryStateMemory,
    bootstrap,
    deleteAllAlicizationData,
    ensureSubconsciousState,
    runSubconsciousTickAcrossCards,
    runDreamAcrossCards,
    sanitizeText,
    normalizeProviderCredentialsMap,
    setActiveProviderId,
    setActiveModelId,
    setProviderCredentials,
    persistLlmConfigToDisk,
    getActiveProviderId,
    getActiveModelId,
    getProviderCredentials,
  } = options

  registerInvokeHandler(electronAlicizationAppendAuditLog, async payload => await withCardScope(payload.cardId, async () => await getAlicizationDb().appendAuditLog(payload)))

  registerInvokeHandler(electronAlicizationRealtimeExecute, async (payload: AlicizationCardScope & AlicizationRealtimeExecutePayload) => {
    return await withCardScope(payload.cardId, async () => {
      const result = await executeBuiltinRealtimeQuery(payload)
      await appendAuditLog({
        level: result.ok ? 'notice' : 'warning',
        category: 'realtime-builtin',
        action: result.ok ? 'execute-success' : 'execute-failed',
        message: result.ok
          ? `Builtin realtime ${payload.category} execution succeeded.`
          : `Builtin realtime ${payload.category} execution failed.`,
        payload: {
          category: payload.category,
          ok: result.ok,
          errorCode: result.errorCode,
          durationMs: result.durationMs,
        },
      })
      return result
    })
  })

  registerInvokeHandler(electronAlicizationDeleteCardScope, async payload => await withCardScope(defaultAlicizationCardId, async () => {
    const targetCardId = normalizeCardId(payload?.cardId)
    if (targetCardId === getActiveCardId()) {
      await switchCardScope(defaultAlicizationCardId)
    }
    await rm(resolveCardPaths(targetCardId).soulRoot, { recursive: true, force: true })
    proactiveLoopStateByCard.delete(targetCardId)
    perceptionStateByCard.delete(targetCardId)
    visualPresenceStateByCard.delete(targetCardId)
    visualPresenceCapturePersistMetaByCard.delete(targetCardId)
    emitVisualPresenceState(targetCardId, null)
    screenSemanticCacheByCard.delete(targetCardId)
    subconsciousStateByCard.delete(targetCardId)
    activeSessionIdByCard.delete(targetCardId)
    dialogueAckByCard.delete(targetCardId)
    clearDialogueSessionMirrorCard(targetCardId)
    clearExecutionDeliveryStateMemory(targetCardId)
    if (targetCardId === defaultAlicizationCardId) {
      await switchCardScope(defaultAlicizationCardId)
      await bootstrap()
    }
  }))

  registerInvokeHandler(electronAlicizationDeleteAllData, async () => await withCardScope(defaultAlicizationCardId, async () => {
    await deleteAllAlicizationData('renderer')
  }, {
    label: 'delete-all-data',
  }))

  registerInvokeHandler(electronAlicizationSubconsciousGetState, async scope => await withCardScope(cardIdFrom(scope), async () => {
    const activeCardId = getActiveCardId()
    const state = await ensureSubconsciousState(activeCardId)
    return {
      cardId: activeCardId,
      boredom: state.boredom,
      loneliness: state.loneliness,
      fatigue: state.fatigue,
      lastTickAt: state.lastTickAt,
      lastInteractionAt: state.lastInteractionAt,
      lastSavedAt: state.lastSavedAt,
      updatedAt: state.updatedAt,
    } satisfies AlicizationSubconsciousStatePayload
  }))

  registerInvokeHandler(electronAlicizationSubconsciousForceTick, async scope => await runSubconsciousTickAcrossCards('force', [cardIdFrom(scope)]))

  registerInvokeHandler(electronAlicizationSubconsciousForceDream, async (payload) => {
    const targetCardId = sanitizeText(payload?.cardId)
    return await runDreamAcrossCards(payload?.reason ?? 'force', targetCardId ? [targetCardId] : undefined)
  })

  registerInvokeHandler(electronAlicizationLlmSyncConfig, async (payload) => {
    setActiveProviderId(sanitizeText(payload.activeProviderId))
    setActiveModelId(sanitizeText(payload.activeModelId))
    setProviderCredentials(normalizeProviderCredentialsMap(payload.providerCredentials))
    await persistLlmConfigToDisk()
  })

  registerInvokeHandler(electronAlicizationLlmGetConfig, async () => {
    return {
      activeProviderId: getActiveProviderId(),
      activeModelId: getActiveModelId(),
      providerCredentials: getProviderCredentials(),
    }
  })
}
