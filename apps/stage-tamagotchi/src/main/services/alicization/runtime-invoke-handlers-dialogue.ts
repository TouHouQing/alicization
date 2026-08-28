import type { AlicizationRuntimeEventEnvelope } from '@proj-alicization/stage-shared'

import type {
  AlicizationAuditLogInput,
  AlicizationConversationTurnInput,
  AlicizationConversationTurnRecord,
  AlicizationCorrectHumanlikeMemoryAuditPayload,
  AlicizationDialogueRespondedPayload,
  AlicizationHumanlikeMemoryAuditEntry,
  AlicizationHumanlikeMemoryCorrectionRecord,
  AlicizationLearningArtifactLedgerRecord,
  AlicizationListHumanlikeMemoryAuditPayload,
  AlicizationListLearningArtifactLedgerPayload,
  AlicizationListMemoryDecisionTracesPayload,
  AlicizationListMindTurnEventsPayload,
  AlicizationListPersonStateUpdatesPayload,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnEventRecord,
  AlicizationPersonStateUpdateRecord,
  AlicizationProactiveFeedbackPayload,
  AlicizationRunReplayBenchmarkPayload,
  AlicizationRunReplayBenchmarkResult,
  AlicizationSelfEvolutionVersionRuntimeSnapshot,
  AlicizationTurnToolProjectionReplayRecord,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationExplicitProactiveFeedbackInput,
  AlicizationProactiveLoopMutationResult,
  AlicizationProactiveLoopState,
  AlicizationRecentProactiveOutcome,
} from './proactive-feedback'
import type { AlicizationRuntimeCheckpoint } from './turn-os/checkpoint-store'
import type {
  AlicizationRuntimeEventListOptions,
  AlicizationRuntimeEventScope,
  AlicizationRuntimeEventScopeQuery,
  AlicizationRuntimeEventScopeRecord,
} from './turn-os/event-store'

import {
  alicizationPrimaryConversationSessionId,
  buildAlicizationMemoryDecisionTraceRecords,
  filterLearningArtifactLedgerRecords,
  learningArtifactLedgerRecordFromMindTurnEvent,
} from '@proj-alicization/stage-shared'

import {
  electronAlicizationAckDialogue,
  electronAlicizationAppendConversationTurn,
  electronAlicizationClearAllConversations,
  electronAlicizationCorrectHumanlikeMemoryAudit,
  electronAlicizationGetSelfEvolutionState,
  electronAlicizationListConversationTurns,
  electronAlicizationListHumanlikeMemoryAudit,
  electronAlicizationListLearningArtifactLedger,
  electronAlicizationListMemoryDecisionTraces,
  electronAlicizationListMindTurnEvents,
  electronAlicizationListPersonStateUpdates,
  electronAlicizationListTurnToolProjections,
  electronAlicizationReplayDialogues,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationRunReplayBenchmark,
  electronAlicizationSetActiveSession,
} from '../../../shared/eventa'
import { buildHumanlikeMemoryAuditEntriesFromMindTurnEvents } from './humanlike-memory'
import { personStateUpdateRecordFromMindTurnEvent } from './person-state-update-surface'
import {
  createAlicizationReplayBenchmarkRuntime,
} from './replay-benchmark-runtime'
import { replayTurn } from './turn-os/replay'

const toolProjectionReplayEventTypes = [
  'model.tool_call.proposed',
  'action.started',
  'action.progress',
  'action.output.delta',
  'action.observation',
  'action.failed',
  'action.cancelled',
  'action.dead_lettered',
] as const

const toolProjectionReplayConcurrency = 8

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  if (items.length === 0)
    return [] as R[]

  const results = Array.from<R>({ length: items.length })
  let nextIndex = 0
  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), items.length)
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }))
  return results
}

interface ReplayConversationTurnRow {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structuredJson: string | null
  createdAt: number
}

interface RegisterAlicizationDialogueInvokeHandlersOptions {
  registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => void
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  normalizeSessionId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  getActiveCardId: () => string
  localRuntimeUserId: string
  persistActiveSessionId: (cardId: string, sessionId: string) => Promise<void>
  appendConversationTurnWithGuards: (payload: AlicizationConversationTurnInput) => Promise<boolean | undefined>
  getDialogueAckCursor: (cardId: string, sessionIdRaw: unknown) => number
  ackDialogueDelivery: (input: {
    cardId: unknown
    sessionId: unknown
    turnId: unknown
    createdAt: unknown
  }) => Promise<void>
  ensureProactiveLoopState: (cardId: string) => Promise<AlicizationProactiveLoopState>
  reportExplicitProactiveFeedback: (
    state: AlicizationProactiveLoopState,
    input: AlicizationExplicitProactiveFeedbackInput,
  ) => AlicizationProactiveLoopMutationResult
  persistProactiveLoopState: (cardId: string, state: AlicizationProactiveLoopState) => Promise<void>
  persistProactiveFeedbackOutcomeClosure: (input: {
    now: number
    cardId: string
    turnId: string
    outcomes: AlicizationRecentProactiveOutcome[]
  }) => Promise<void>
  syncSessionMirrorFromCurrentCardState: (input: {
    cardId: string
    decisionTraceId?: string | null
    proactiveOutcomes?: AlicizationRecentProactiveOutcome[]
    source: string
    turnId?: string | null
  }) => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  queueSubconsciousWake: (cardId: string, reason: string, delayMs?: number) => void
  getAlicizationDb: () => {
    listConversationTurnsSince: (sinceExclusive: number, options?: {
      limit?: number
    }) => Promise<ReplayConversationTurnRow[]>
    listConversationTurnsBySession: (sessionId: string, options: {
      sinceCreatedAt?: number
      limit?: number
    }) => Promise<ReplayConversationTurnRow[]>
    listRuntimeEventScopes: (
      query: AlicizationRuntimeEventScopeQuery,
    ) => Promise<AlicizationRuntimeEventScopeRecord[]>
    loadRuntimeCheckpoint: (
      scope: AlicizationRuntimeEventScope,
    ) => Promise<AlicizationRuntimeCheckpoint | null>
    listRuntimeEvents: (
      scope: AlicizationRuntimeEventScope,
      options?: AlicizationRuntimeEventListOptions,
    ) => Promise<AlicizationRuntimeEventEnvelope[]>
    getMemoryStats: () => Promise<any>
    listMindTurnEvents: (options: {
      decisionTraceId?: string
      turnId?: string
      activeThreadId?: string
      activeSelfEvolutionCandidateId?: string
      kind?: AlicizationMindTurnEventRecord['kind']
      limit?: number
    }) => Promise<AlicizationMindTurnEventRecord[]>
    appendMindTurnEvents?: (events: Array<{
      decisionTraceId: string
      turnId?: string | null
      sessionId?: string | null
      origin?: 'user-turn' | 'subconscious-proactive' | 'system'
      kind: 'humanlike-memory-corrected'
      payload?: Record<string, unknown> | null
      createdAt?: number
    }>) => Promise<void>
    overrideMemoryStats: (next: any) => Promise<any>
    getMetaValue: (key: string) => Promise<string | undefined>
    setMetaValue: (key: string, value: string) => Promise<void>
  }
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  getSelfEvolutionState: () => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot>
  toReplayDialogueRespondedPayload: (row: ReplayConversationTurnRow, performanceManifest?: CharacterPerformanceCapabilitiesManifest | null) => AlicizationDialogueRespondedPayload | null
  clearAllConversationData: (reason: string) => Promise<void>
  parseStructuredHint: (input: string | null | undefined) => Record<string, unknown>
}

export function registerAlicizationDialogueInvokeHandlers(options: RegisterAlicizationDialogueInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    normalizeSessionId,
    sanitizeText,
    appendRuntimeDebugLine,
    getActiveCardId,
    localRuntimeUserId,
    persistActiveSessionId,
    appendConversationTurnWithGuards,
    getDialogueAckCursor,
    ackDialogueDelivery,
    ensureProactiveLoopState,
    reportExplicitProactiveFeedback,
    persistProactiveLoopState,
    persistProactiveFeedbackOutcomeClosure,
    syncSessionMirrorFromCurrentCardState,
    appendAuditLog,
    queueSubconsciousWake,
    getAlicizationDb,
    getPerformanceManifest,
    getSelfEvolutionState,
    toReplayDialogueRespondedPayload,
    clearAllConversationData,
    parseStructuredHint,
  } = options
  const getCanonicalSessionId = () => alicizationPrimaryConversationSessionId(getActiveCardId())
  const replayBenchmarkRuntime = createAlicizationReplayBenchmarkRuntime({
    getAlicizationDb,
    appendAuditLog,
  })

  registerInvokeHandler(electronAlicizationSetActiveSession, async payload => await withCardScope(payload.cardId, async () => {
    const activeCardId = getActiveCardId()
    await persistActiveSessionId(activeCardId, normalizeSessionId(payload.sessionId))
  }, {
    label: `dialogue-active-session:${payload.cardId}`,
    skipQueueWhenScopeAlreadyActive: true,
  }))

  registerInvokeHandler(electronAlicizationAppendConversationTurn, async (payload) => {
    await withCardScope(payload.cardId, async () => {
      await appendConversationTurnWithGuards(payload)
    }, {
      label: `dialogue-append-turn:${payload.cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
  })

  registerInvokeHandler(electronAlicizationAckDialogue, async payload => await withCardScope(payload.cardId, async () => {
    const activeCardId = getActiveCardId()
    const sessionId = getCanonicalSessionId()

    const previousCursor = getDialogueAckCursor(activeCardId, sessionId)
    await ackDialogueDelivery({
      cardId: activeCardId,
      sessionId,
      turnId: payload.turnId,
      createdAt: payload.createdAt,
    })
    const nextCursor = getDialogueAckCursor(activeCardId, sessionId)
    await appendRuntimeDebugLine('dialogue-ack.applied', {
      cardId: activeCardId,
      sessionId,
      turnId: sanitizeText(payload.turnId),
      previousCursor,
      nextCursor,
    })
  }, {
    label: `dialogue-ack:${payload.cardId}`,
    skipQueueWhenScopeAlreadyActive: true,
  }))

  registerInvokeHandler(electronAlicizationReportProactiveFeedback, async (payload: AlicizationProactiveFeedbackPayload) => await withCardScope(payload.cardId, async () => {
    const activeCardId = getActiveCardId()
    const turnId = sanitizeText(payload.turnId)
    if (!turnId || (payload.feedback !== 'dismiss' && payload.feedback !== 'positive'))
      return

    const current = await ensureProactiveLoopState(activeCardId)
    const settled = reportExplicitProactiveFeedback(current, {
      turnId,
      feedback: payload.feedback,
      at: Date.now(),
      userText: sanitizeText(payload.userText, '') || null,
    })
    if (settled.appliedOutcomes.length === 0)
      return

    await persistProactiveLoopState(activeCardId, settled.state)
    await syncSessionMirrorFromCurrentCardState({
      cardId: activeCardId,
      proactiveOutcomes: settled.appliedOutcomes,
      source: 'proactive-feedback-explicit',
      turnId,
    })
    await persistProactiveFeedbackOutcomeClosure({
      now: Date.now(),
      cardId: activeCardId,
      turnId,
      outcomes: settled.appliedOutcomes,
    })
    await appendAuditLog({
      level: 'notice',
      category: 'alicization.subconscious',
      action: 'proactive-feedback-explicit',
      message: 'Applied explicit proactive feedback from renderer bubble action.',
      payload: {
        turnId,
        feedback: payload.feedback,
        outcomes: settled.appliedOutcomes,
      },
    })
    queueSubconsciousWake(activeCardId, `feedback:${payload.feedback}`, 300)
  }))

  registerInvokeHandler(electronAlicizationReplayDialogues, async payload => await withCardScope(payload.cardId, async () => {
    const activeCardId = getActiveCardId()
    const requestedSessionId = normalizeSessionId(payload.sessionId)
    const sessionId = getCanonicalSessionId()
    if (requestedSessionId && requestedSessionId !== sessionId)
      await appendRuntimeDebugLine('dialogue-replay.session-id-normalized', { requestedSessionId, sessionId })

    const ackCursor = getDialogueAckCursor(activeCardId, sessionId)
    const limit = Math.max(1, Math.min(500, Math.floor(payload.limit ?? 200)))
    await appendRuntimeDebugLine('dialogue-replay.requested', {
      cardId: activeCardId,
      sessionId,
      ackCursor,
      limit,
    })
    const rows = await getAlicizationDb().listConversationTurnsBySession(sessionId, {
      sinceCreatedAt: ackCursor + 1,
      limit,
    })
    const performanceManifest = await getPerformanceManifest()
    const replayRows = rows
      .map(row => toReplayDialogueRespondedPayload(row, performanceManifest))
      .filter((item: AlicizationDialogueRespondedPayload | null): item is AlicizationDialogueRespondedPayload => Boolean(item))
    await appendRuntimeDebugLine('dialogue-replay.returned', {
      cardId: activeCardId,
      sessionId,
      ackCursor,
      requestedLimit: limit,
      rawRows: rows.length,
      replayRows: replayRows.length,
    })
    return replayRows
  }, {
    label: `dialogue-replay:${payload.cardId}`,
    skipQueueWhenScopeAlreadyActive: true,
  }))

  registerInvokeHandler(electronAlicizationClearAllConversations, async () => await withCardScope(getActiveCardId(), async () => {
    await clearAllConversationData('renderer')
  }, {
    label: 'conversation-clear-all',
  }))

  registerInvokeHandler(electronAlicizationListConversationTurns, async payload => await withCardScope(payload.cardId, async () => {
    const requestedSessionId = normalizeSessionId(payload.sessionId)
    const sessionId = getCanonicalSessionId()
    if (requestedSessionId && requestedSessionId !== sessionId)
      await appendRuntimeDebugLine('dialogue-list-turns.session-id-normalized', { requestedSessionId, sessionId })
    const rows = await getAlicizationDb().listConversationTurnsBySession(sessionId, {
      sinceCreatedAt: payload.sinceCreatedAt,
      limit: payload.limit,
    })
    return rows.map((row): AlicizationConversationTurnRecord => {
      const structured = parseStructuredHint(row.structuredJson)
      const hasStructured = Object.keys(structured).length > 0
      return {
        turnId: row.turnId,
        sessionId: row.sessionId,
        userText: row.userText,
        assistantText: row.assistantText,
        structured: hasStructured ? structured : null,
        createdAt: row.createdAt,
      }
    })
  }, {
    label: `dialogue-list-turns:${payload.cardId}`,
    skipQueueWhenScopeAlreadyActive: true,
  }))

  registerInvokeHandler(electronAlicizationListTurnToolProjections, async payload => await withCardScope(payload.cardId, async () => {
    const activeCardId = getActiveCardId()
    const requestedSessionId = normalizeSessionId(payload.sessionId)
    const sessionId = getCanonicalSessionId()
    if (requestedSessionId && requestedSessionId !== sessionId)
      await appendRuntimeDebugLine('dialogue-tool-projection.session-id-normalized', { requestedSessionId, sessionId })

    const limit = Math.max(1, Math.min(500, Math.floor(payload.limit ?? 200)))
    const db = getAlicizationDb()
    const scopes = await db.listRuntimeEventScopes({
      cardId: activeCardId,
      userId: localRuntimeUserId,
      conversationId: sessionId,
      eventTypes: [...toolProjectionReplayEventTypes],
      limit,
    })
    return await mapWithConcurrency(scopes, toolProjectionReplayConcurrency, async (scope): Promise<AlicizationTurnToolProjectionReplayRecord> => {
      const runtimeScope: AlicizationRuntimeEventScope = {
        turnId: scope.turnId,
        cardId: scope.cardId,
        userId: scope.userId,
        conversationId: scope.conversationId,
      }
      try {
        const replay = await replayTurn({
          scope: runtimeScope,
          reader: db,
        })
        return {
          cardId: activeCardId,
          turnId: scope.turnId,
          sessionId,
          startedAt: scope.startedAt,
          updatedAt: scope.updatedAt,
          cards: replay.toolProjection.cards,
          recoveryRequired: replay.recoveryRequired,
          reasonCodes: replay.reasonCodes,
          failure: null,
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await appendRuntimeDebugLine('dialogue-tool-projection-replay.failed', {
          cardId: activeCardId,
          sessionId,
          turnId: scope.turnId,
          error: message,
        }).catch(() => {})
        return {
          cardId: activeCardId,
          turnId: scope.turnId,
          sessionId,
          startedAt: scope.startedAt,
          updatedAt: scope.updatedAt,
          cards: [],
          recoveryRequired: true,
          reasonCodes: ['runtime-replay:failed'],
          failure: {
            code: 'RUNTIME_REPLAY_FAILED',
            message,
          },
        }
      }
    })
  }, {
    label: `dialogue-list-tool-projections:${payload.cardId}`,
    skipQueueWhenScopeAlreadyActive: true,
  }))

  registerInvokeHandler(electronAlicizationListMindTurnEvents, async (payload: AlicizationListMindTurnEventsPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listMindTurnEvents({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      activeThreadId: payload.activeThreadId,
      kind: payload.kind,
      limit: payload.limit,
    })
    return rows as AlicizationMindTurnEventRecord[]
  }))
  registerInvokeHandler(electronAlicizationListLearningArtifactLedger, async (payload: AlicizationListLearningArtifactLedgerPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listMindTurnEvents({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      kind: 'learning-executed',
      limit: payload.limit ? Math.max(payload.limit * 8, payload.limit) : 400,
    })
    const ledgerRecords = rows
      .map(row => learningArtifactLedgerRecordFromMindTurnEvent(row))
      .filter((row): row is AlicizationLearningArtifactLedgerRecord => Boolean(row))
    return filterLearningArtifactLedgerRecords(ledgerRecords, payload) as AlicizationLearningArtifactLedgerRecord[]
  }))
  registerInvokeHandler(electronAlicizationListMemoryDecisionTraces, async (payload: AlicizationListMemoryDecisionTracesPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listMindTurnEvents({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      activeThreadId: payload.activeThreadId,
      activeSelfEvolutionCandidateId: payload.activeSelfEvolutionCandidateId,
      limit: payload.limit ? Math.max(payload.limit * 8, payload.limit) : 400,
    })
    return buildAlicizationMemoryDecisionTraceRecords(rows).slice(0, Math.max(1, payload.limit ?? 20)) as AlicizationMemoryDecisionTraceRecord[]
  }))
  registerInvokeHandler(electronAlicizationListPersonStateUpdates, async (payload: AlicizationListPersonStateUpdatesPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listMindTurnEvents({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      limit: payload.limit ? Math.max(payload.limit * 6, payload.limit) : 180,
    })
    return rows
      .filter(row => row.kind === 'person-state-updated')
      .map(row => personStateUpdateRecordFromMindTurnEvent(row))
      .filter((row): row is AlicizationPersonStateUpdateRecord => Boolean(row))
      .slice(0, Math.max(1, payload.limit ?? 20))
  }))
  registerInvokeHandler(electronAlicizationListHumanlikeMemoryAudit, async (payload: AlicizationListHumanlikeMemoryAuditPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listMindTurnEvents({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      limit: payload.limit ? Math.max(payload.limit * 6, payload.limit) : 180,
    })
    return buildHumanlikeMemoryAuditEntriesFromMindTurnEvents(rows)
      .slice(0, Math.max(1, payload.limit ?? 20)) as AlicizationHumanlikeMemoryAuditEntry[]
  }))
  registerInvokeHandler(electronAlicizationCorrectHumanlikeMemoryAudit, async (payload: AlicizationCorrectHumanlikeMemoryAuditPayload) => await withCardScope(payload.cardId, async () => {
    const candidateId = sanitizeText(payload.candidateId)
    const field = sanitizeText(payload.field)
    const correctedValue = sanitizeText(payload.correctedValue, '')
    if (!candidateId || !field || !correctedValue)
      throw new Error('humanlike memory correction requires candidateId, field, and correctedValue')

    const decisionTraceId = sanitizeText(payload.decisionTraceId) || `humanlike-memory-correction:${candidateId}`
    const turnId = sanitizeText(payload.turnId) || null
    const requestedSessionId = normalizeSessionId(payload.sessionId)
    const sessionId = getCanonicalSessionId()
    if (requestedSessionId && requestedSessionId !== sessionId)
      await appendRuntimeDebugLine('humanlike-memory-correction.session-id-normalized', { requestedSessionId, sessionId })
    const previousValue = sanitizeText(payload.previousValue) || null
    const reason = sanitizeText(payload.reason) || null
    const createdAt = Date.now()
    const record: AlicizationHumanlikeMemoryCorrectionRecord = {
      status: 'recorded',
      candidateId,
      field,
      previousValue,
      correctedValue,
      reason,
      decisionTraceId,
      turnId,
      sessionId,
      createdAt,
    }
    const alicizationDb = getAlicizationDb()
    if (typeof alicizationDb.appendMindTurnEvents !== 'function')
      throw new Error('humanlike memory correction requires mind-turn event persistence')

    await alicizationDb.appendMindTurnEvents([{
      decisionTraceId,
      turnId,
      sessionId,
      origin: 'user-turn',
      kind: 'humanlike-memory-corrected',
      payload: {
        candidateId,
        field,
        previousValue,
        correctedValue,
        reason,
      },
      createdAt,
    }])
    return record
  }))
  registerInvokeHandler(electronAlicizationGetSelfEvolutionState, async payload => await withCardScope(payload.cardId, async () => await getSelfEvolutionState()))

  registerInvokeHandler(electronAlicizationRunReplayBenchmark, async (payload: AlicizationRunReplayBenchmarkPayload) => await withCardScope(payload.cardId, async () => {
    return await replayBenchmarkRuntime.runReplayBenchmark({
      packId: payload.packId,
      sampleLimit: payload.sampleLimit,
      persistTelemetry: payload.persistTelemetry,
      auditContext: {
        category: 'alicization.memory-benchmark',
        action: 'replay-benchmark-ran',
        cardId: payload.cardId,
      },
    }) satisfies AlicizationRunReplayBenchmarkResult
  }))
}
