import type {
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationLlmConfigPayload,
  AlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult,
  AlicizationSubconsciousStatePayload,
} from '../../../shared/eventa'

import { errorMessageFrom } from '@moeru/std'

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
  deleteCardScopeData: (cardId: string, reason: string) => Promise<void>
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
  persistLlmConfigToDisk: (payload: AlicizationLlmConfigPayload) => Promise<void>
  resumePendingEmbeddingReindexJobs: (scope: { cardId: string, database: unknown }) => Promise<unknown>
  getEmbeddingVectorSpaceId: () => string | null
  resolveEmbeddingVectorSpaceIdForConfig: (payload: AlicizationLlmConfigPayload) => string | null
  startEmbeddingReindexForActiveCard: (scope: { cardId: string, database: unknown }) => Promise<unknown>
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
    deleteCardScopeData,
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
    resumePendingEmbeddingReindexJobs,
    getEmbeddingVectorSpaceId,
    resolveEmbeddingVectorSpaceIdForConfig,
    startEmbeddingReindexForActiveCard,
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

  registerInvokeHandler(electronAlicizationDeleteCardScope, async payload => await withCardScope(
    defaultAlicizationCardId,
    async () => await deleteCardScopeData(cardIdFrom(payload), 'renderer'),
    {
      label: 'delete-card-scope',
    },
  ))

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
    const maintenanceScope = {
      cardId: getActiveCardId(),
      database: getAlicizationDb(),
    }
    let previousVectorSpaceId: string | null = null
    try {
      previousVectorSpaceId = getEmbeddingVectorSpaceId()
    }
    catch {
      // An invalid stored config must remain repairable from this endpoint.
    }
    const nextConfig = {
      activeProviderId: sanitizeText(payload.activeProviderId),
      activeModelId: sanitizeText(payload.activeModelId),
      providerCredentials: normalizeProviderCredentialsMap(payload.providerCredentials),
    } satisfies AlicizationLlmConfigPayload
    const nextVectorSpaceId = resolveEmbeddingVectorSpaceIdForConfig(nextConfig)
    await persistLlmConfigToDisk(nextConfig)
    setActiveProviderId(nextConfig.activeProviderId)
    setActiveModelId(nextConfig.activeModelId)
    setProviderCredentials(nextConfig.providerCredentials)
    void (async () => {
      const errors: string[] = []
      if (nextVectorSpaceId && nextVectorSpaceId !== previousVectorSpaceId) {
        try {
          await startEmbeddingReindexForActiveCard(maintenanceScope)
        }
        catch (error) {
          errors.push(`reindex: ${errorMessageFrom(error) ?? String(error)}`)
        }
      }
      try {
        await resumePendingEmbeddingReindexJobs(maintenanceScope)
      }
      catch (error) {
        errors.push(`resume: ${errorMessageFrom(error) ?? String(error)}`)
      }
      if (errors.length > 0) {
        await appendAuditLog({
          level: 'warning',
          category: 'memory-embedding',
          action: 'embedding-maintenance-failed',
          message: 'Embedding configuration was saved, but background index maintenance failed.',
          payload: {
            errors,
            previousVectorSpaceId,
            nextVectorSpaceId,
          },
        }).catch(() => {})
      }
    })()
  })

  registerInvokeHandler(electronAlicizationLlmGetConfig, async () => {
    return {
      activeProviderId: getActiveProviderId(),
      activeModelId: getActiveModelId(),
      providerCredentials: getProviderCredentials(),
    }
  })
}
