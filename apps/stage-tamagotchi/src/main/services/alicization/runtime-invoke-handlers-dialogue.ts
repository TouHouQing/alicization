import type {
  AlicizationAuditLogInput,
  AlicizationConversationTurnInput,
  AlicizationConversationTurnRecord,
  AlicizationDialogueRespondedPayload,
  AlicizationLearningArtifactLedgerRecord,
  AlicizationListLearningArtifactLedgerPayload,
  AlicizationListPersonStateUpdatesPayload,
  AlicizationRunReplayBenchmarkPayload,
  AlicizationRunReplayBenchmarkResult,
  AlicizationListMemoryDecisionTracesPayload,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationListMindTurnEventsPayload,
  AlicizationMindTurnEventRecord,
  AlicizationPersonStateUpdateRecord,
  AlicizationSelfEvolutionVersionRuntimeSnapshot,
  AlicizationProactiveFeedbackKind,
  AlicizationProactiveFeedbackPayload,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationProactiveLoopMutationResult,
  AlicizationProactiveLoopState,
  AlicizationRecentProactiveOutcome,
} from './proactive-feedback'

import {
  buildAlicizationMemoryDecisionTraceRecords,
  filterLearningArtifactLedgerRecords,
  learningArtifactLedgerRecordFromMindTurnEvent,
} from '@proj-alicization/stage-shared'

import {
  electronAlicizationAckDialogue,
  electronAlicizationAppendConversationTurn,
  electronAlicizationClearAllConversations,
  electronAlicizationGetSelfEvolutionState,
  electronAlicizationListConversationTurns,
  electronAlicizationListLearningArtifactLedger,
  electronAlicizationListMemoryDecisionTraces,
  electronAlicizationListMindTurnEvents,
  electronAlicizationListPersonStateUpdates,
  electronAlicizationRunReplayBenchmark,
  electronAlicizationReplayDialogues,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationSetActiveSession,
} from '../../../shared/eventa'
import { personStateUpdateRecordFromMindTurnEvent } from './person-state-update-surface'
import {
  createAlicizationReplayBenchmarkRuntime,
} from './replay-benchmark-runtime'

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
  reportExplicitProactiveFeedback: (state: AlicizationProactiveLoopState, input: {
    turnId: string
    feedback: AlicizationProactiveFeedbackKind
    at?: number
  }) => AlicizationProactiveLoopMutationResult
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
    getMemoryStats: () => Promise<any>
    listMindTurnEvents: (options: {
      decisionTraceId?: string
      turnId?: string
      activeThreadId?: string
      activeSelfEvolutionCandidateId?: string
      kind?: AlicizationMindTurnEventRecord['kind']
      limit?: number
    }) => Promise<AlicizationMindTurnEventRecord[]>
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
  const replayBenchmarkRuntime = createAlicizationReplayBenchmarkRuntime({
    getAlicizationDb,
    appendAuditLog,
  })

  registerInvokeHandler(electronAlicizationSetActiveSession, async payload => await withCardScope(payload.cardId, async () => {
    const activeCardId = getActiveCardId()
    await persistActiveSessionId(activeCardId, normalizeSessionId(payload.sessionId))
  }))

  registerInvokeHandler(electronAlicizationAppendConversationTurn, async (payload) => {
    await withCardScope(payload.cardId, async () => {
      await appendConversationTurnWithGuards(payload)
    })
  })

  registerInvokeHandler(electronAlicizationAckDialogue, async payload => await withCardScope(payload.cardId, async () => {
    const activeCardId = getActiveCardId()
    const sessionId = normalizeSessionId(payload.sessionId)
    if (!sessionId)
      return

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
    const sessionId = normalizeSessionId(payload.sessionId)
    if (!sessionId)
      return [] as AlicizationDialogueRespondedPayload[]

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
  }))

  registerInvokeHandler(electronAlicizationClearAllConversations, async () => await withCardScope(getActiveCardId(), async () => {
    await clearAllConversationData('renderer')
  }, {
    label: 'conversation-clear-all',
  }))

  registerInvokeHandler(electronAlicizationListConversationTurns, async payload => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listConversationTurnsBySession(payload.sessionId, {
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
