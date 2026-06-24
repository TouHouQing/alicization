import type {
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationMemoryUpsertFactsPayload,
  AlicizationMindTurnEventInput,
  AlicizationReminderSchedulePayload,
} from '../../../shared/eventa'
import type { AlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'

import {
  electronAlicizationGetMemoryStats,
  electronAlicizationGetOrganicMemorySnapshot,
  electronAlicizationGetPerformanceManifest,
  electronAlicizationMemoryImportLegacy,
  electronAlicizationMemoryRetrieveFacts,
  electronAlicizationMemoryUpsertFacts,
  electronAlicizationReminderSchedule,
  electronAlicizationRunMemoryPrune,
  electronAlicizationSearchOrganicSubconsciousFragments,
  electronAlicizationSetPerformanceManifest,
  electronAlicizationUpdateMemoryStats,
} from '../../../shared/eventa'
import {
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
} from './runtime-structured-format'

interface RegisterAlicizationMemoryInvokeHandlersOptions {
  registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => void
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  cardIdFrom: (scope?: Partial<AlicizationCardScope>) => string
  getAlicizationDb: () => any
  getOrganicMemorySnapshot: () => Promise<unknown>
  getPerformanceManifest: () => Promise<unknown>
  setPerformanceManifest: (manifest: any) => Promise<unknown>
  searchOrganicSubconsciousFragments: (query: string, limit?: number) => Promise<unknown>
  scheduleReminderTask: (cardId: string, input: {
    minutes: unknown
    message: unknown
    sourceTurnId?: string
  }, source: any) => Promise<unknown>
  buildAsyncFactMemoryFragments: (input: {
    facts: AlicizationMemoryUpsertFactsPayload['facts']
    trace: AlicizationMemoryUpsertFactsPayload['trace'] | null
  }) => string[]
  knowledgeAssimilationRuntime: AlicizationKnowledgeAssimilationRuntime
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  sanitizeMindGovernanceDecisionTraceId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  normalizeSessionId: (raw: unknown) => string
  errorMessageFrom: (error: unknown) => string | undefined
}

export function registerAlicizationMemoryInvokeHandlers(options: RegisterAlicizationMemoryInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    cardIdFrom,
    getAlicizationDb,
    getOrganicMemorySnapshot,
    getPerformanceManifest,
    setPerformanceManifest,
    searchOrganicSubconsciousFragments,
    scheduleReminderTask,
    buildAsyncFactMemoryFragments,
    knowledgeAssimilationRuntime,
    appendAuditLog,
    sanitizeMindGovernanceDecisionTraceId,
    sanitizeText,
    normalizeSessionId,
    errorMessageFrom,
  } = options

  registerInvokeHandler(electronAlicizationGetMemoryStats, async scope => await withCardScope(cardIdFrom(scope), async () => await getAlicizationDb().getMemoryStats()))
  registerInvokeHandler(electronAlicizationGetOrganicMemorySnapshot, async scope => await withCardScope(cardIdFrom(scope), async () => await getOrganicMemorySnapshot()))
  registerInvokeHandler(electronAlicizationGetPerformanceManifest, async scope => await withCardScope(cardIdFrom(scope), async () => await getPerformanceManifest()))
  registerInvokeHandler(electronAlicizationUpdateMemoryStats, async payload => await withCardScope(payload.cardId, async () => await getAlicizationDb().overrideMemoryStats(payload)))
  registerInvokeHandler(electronAlicizationRunMemoryPrune, async scope => await withCardScope(cardIdFrom(scope), async () => await getAlicizationDb().runMemoryPrune()))
  registerInvokeHandler(electronAlicizationMemoryRetrieveFacts, async payload => await withCardScope(payload.cardId, async () => await getAlicizationDb().retrieveMemoryFacts(payload.query, payload.limit)))
  registerInvokeHandler(electronAlicizationMemoryUpsertFacts, async (payload: AlicizationMemoryUpsertFactsPayload) => await withCardScope(payload.cardId, async () => {
    const alicizationDb = getAlicizationDb()
    const existingFacts = typeof alicizationDb.listMemoryFacts === 'function'
      ? await alicizationDb.listMemoryFacts().catch(() => [])
      : []
    const assimilation = knowledgeAssimilationRuntime.assimilateMemoryFactsDetailed({
      facts: payload.facts,
      source: payload.source,
      existingFacts,
    })
    if (assimilation.corrections.length > 0 && typeof alicizationDb.applyMemoryFactCorrections === 'function')
      await alicizationDb.applyMemoryFactCorrections(assimilation.corrections)
    await alicizationDb.upsertMemoryFacts(assimilation.facts, payload.source)

    if (payload.source !== 'async-llm')
      return

    const asyncFactMemoryFragments = buildAsyncFactMemoryFragments({
      facts: assimilation.facts,
      trace: payload.trace ?? null,
    })
    if (asyncFactMemoryFragments.length > 0) {
      await alicizationDb.appendSubconsciousFragments(
        asyncFactMemoryFragments.map(text => ({
          text,
          sourceKind: 'fact-ledger',
        })),
      ).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.memory',
          action: 'fact-ledger-write-failed',
          message: 'Failed to append fact-ledger fragments after async memory upsert.',
          payload: {
            decisionTraceId: sanitizeMindGovernanceDecisionTraceId(payload.trace?.decisionTraceId) || null,
            turnId: sanitizeText(payload.trace?.turnId) || null,
            sessionId: normalizeSessionId(payload.trace?.sessionId) || null,
            reason: errorMessageFrom(error) ?? 'unknown-error',
            fragmentCount: asyncFactMemoryFragments.length,
          },
        })
      })
    }

    const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(payload.trace?.decisionTraceId)
    if (!decisionTraceId)
      return

    const turnId = sanitizeText(payload.trace?.turnId) || null
    const sessionId = normalizeSessionId(payload.trace?.sessionId) || null
    const normalizedTraceOrigin = typeof payload.trace?.origin === 'string'
      ? payload.trace.origin.trim().toLowerCase()
      : ''
    const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId,
      origin: normalizedTraceOrigin,
    })
    const origin = autonomousDialogueFamily.isAutonomous
      ? autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
      : normalizedTraceOrigin === 'system'
        ? 'system'
        : 'user-turn'
    const trigger = payload.trace?.trigger === 'batch' || payload.trace?.trigger === 'idle' || payload.trace?.trigger === 'force' || payload.trace?.trigger === 'manual'
      ? payload.trace.trigger
      : null
    const batchSize = Number.isFinite(payload.trace?.batchSize)
      ? Math.max(0, Math.floor(Number(payload.trace?.batchSize)))
      : null
    const extractedCount = Number.isFinite(payload.trace?.extractedCount)
      ? Math.max(0, Math.floor(Number(payload.trace?.extractedCount)))
      : null
    const batchPriority = payload.trace?.batchPriority && typeof payload.trace.batchPriority === 'object'
      ? {
          max: Number.isFinite(payload.trace.batchPriority.max) ? Number(payload.trace.batchPriority.max) : 0,
          min: Number.isFinite(payload.trace.batchPriority.min) ? Number(payload.trace.batchPriority.min) : 0,
          avg: Number.isFinite(payload.trace.batchPriority.avg) ? Number(payload.trace.batchPriority.avg) : 0,
        }
      : null

    const event: AlicizationMindTurnEventInput = {
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'memory-facts-upserted',
      payload: {
        source: payload.source,
        trigger,
        factInputCount: assimilation.facts.length,
        extractedCount,
        batchSize,
        batchPriority,
      },
      createdAt: Date.now(),
    }

    try {
      await alicizationDb.appendMindTurnEvents([event])
    }
    catch (error) {
      await appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'mind-turn-memory-event-append-failed',
        message: 'Failed to append memory upsert trace event for async extraction facts.',
        payload: {
          decisionTraceId,
          turnId,
          sessionId,
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      })
    }
  }))
  registerInvokeHandler(electronAlicizationMemoryImportLegacy, async payload => await withCardScope(payload.cardId, async () => await getAlicizationDb().importLegacyMemory(payload)))
  registerInvokeHandler(electronAlicizationSearchOrganicSubconsciousFragments, async payload => await withCardScope(payload.cardId, async () => await searchOrganicSubconsciousFragments(payload.query, payload.limit)))
  registerInvokeHandler(electronAlicizationSetPerformanceManifest, async payload => await withCardScope(payload.cardId, async () => await setPerformanceManifest(payload.manifest)))
  registerInvokeHandler(electronAlicizationReminderSchedule, async (payload: AlicizationReminderSchedulePayload) => {
    const cardId = cardIdFrom(payload)
    return await scheduleReminderTask(cardId, {
      minutes: payload.minutes,
      message: payload.message,
      sourceTurnId: payload.sourceTurnId,
    }, 'manual-fallback')
  })
}
