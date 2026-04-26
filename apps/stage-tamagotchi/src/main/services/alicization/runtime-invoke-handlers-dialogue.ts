import type {
  AlicizationAuditLogInput,
  AlicizationConversationTurnInput,
  AlicizationConversationTurnRecord,
  AlicizationDialogueRespondedPayload,
  AlicizationRunReplayBenchmarkPayload,
  AlicizationRunReplayBenchmarkResult,
  AlicizationListMemoryDecisionTracesPayload,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationListMindTurnEventsPayload,
  AlicizationMindTurnEventRecord,
  AlicizationProactiveFeedbackKind,
  AlicizationProactiveFeedbackPayload,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type {
  AlicizationProactiveLoopMutationResult,
  AlicizationProactiveLoopState,
  AlicizationRecentProactiveOutcome,
} from './proactive-feedback'
import type {
  PendingDialogueDeliveryState,
} from './runtime-soul'

import { buildAlicizationMemoryDecisionTraceRecords } from '@proj-alicization/stage-shared'

import {
  electronAlicizationAckDialogue,
  electronAlicizationAppendConversationTurn,
  electronAlicizationClearAllConversations,
  electronAlicizationListConversationTurns,
  electronAlicizationListMemoryDecisionTraces,
  electronAlicizationListMindTurnEvents,
  electronAlicizationRunReplayBenchmark,
  electronAlicizationReplayDialogues,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationSetActiveSession,
} from '../../../shared/eventa'
import {
  benchmarkMainChatSessionReplay,
  buildDefaultHumanlikeMemoryBenchmarkPack,
  buildReplayBenchmarkMemoryStatsPatch,
} from './main-chat-session-replay-harness'

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
  normalizeCardId: (raw: unknown) => string
  normalizeSessionId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  getActiveCardId: () => string
  persistActiveSessionId: (cardId: string, sessionId: string) => Promise<void>
  appendConversationTurnWithGuards: (payload: AlicizationConversationTurnInput) => Promise<boolean | undefined>
  getDialogueAckMap: (cardId: string) => Map<string, number>
  getDialogueAckCursor: (cardId: string, sessionIdRaw: unknown) => number
  persistDialogueAckMap: (cardId: string) => Promise<void>
  pendingDialogueDeliveries: Map<string, PendingDialogueDeliveryState>
  clearPendingDialogueDelivery: (entryOrKey: PendingDialogueDeliveryState | string) => void
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
    listConversationTurnsBySession: (sessionId: string, options: {
      sinceCreatedAt?: number
      limit?: number
    }) => Promise<ReplayConversationTurnRow[]>
    getMemoryStats: () => Promise<any>
    listMindTurnEvents: (options: {
      decisionTraceId?: string
      turnId?: string
      activeThreadId?: string
      limit?: number
    }) => Promise<AlicizationMindTurnEventRecord[]>
    overrideMemoryStats: (next: any) => Promise<any>
  }
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  toReplayDialogueRespondedPayload: (row: ReplayConversationTurnRow, performanceManifest?: CharacterPerformanceCapabilitiesManifest | null) => AlicizationDialogueRespondedPayload | null
  clearAllConversationData: (reason: string) => Promise<void>
  parseStructuredHint: (input: string | null | undefined) => Record<string, unknown>
}

export function registerAlicizationDialogueInvokeHandlers(options: RegisterAlicizationDialogueInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    normalizeCardId,
    normalizeSessionId,
    sanitizeText,
    appendRuntimeDebugLine,
    getActiveCardId,
    persistActiveSessionId,
    appendConversationTurnWithGuards,
    getDialogueAckMap,
    getDialogueAckCursor,
    persistDialogueAckMap,
    pendingDialogueDeliveries,
    clearPendingDialogueDelivery,
    ensureProactiveLoopState,
    reportExplicitProactiveFeedback,
    persistProactiveLoopState,
    persistProactiveFeedbackOutcomeClosure,
    syncSessionMirrorFromCurrentCardState,
    appendAuditLog,
    queueSubconsciousWake,
    getAlicizationDb,
    getPerformanceManifest,
    toReplayDialogueRespondedPayload,
    clearAllConversationData,
    parseStructuredHint,
  } = options

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
    const turnId = sanitizeText(payload.turnId)
    const createdAt = Number.isFinite(payload.createdAt)
      ? Math.max(0, Math.floor(Number(payload.createdAt)))
      : 0
    if (!sessionId || !turnId || createdAt <= 0)
      return

    const ackMap = getDialogueAckMap(activeCardId)
    const previousCursor = getDialogueAckCursor(activeCardId, sessionId)
    const nextCursor = Math.max(previousCursor, createdAt)
    await appendRuntimeDebugLine('dialogue-ack.received', {
      cardId: activeCardId,
      sessionId,
      turnId,
      createdAt,
      previousCursor,
      nextCursor,
    })
    if (nextCursor !== previousCursor) {
      ackMap.set(sessionId, nextCursor)
      await persistDialogueAckMap(activeCardId)
    }

    let cleared = 0
    for (const entry of pendingDialogueDeliveries.values()) {
      if (normalizeCardId(entry.payload.cardId) !== activeCardId)
        continue
      if (normalizeSessionId(entry.payload.sessionId) !== sessionId)
        continue
      if (entry.payload.createdAt <= nextCursor) {
        clearPendingDialogueDelivery(entry)
        cleared += 1
      }
    }
    await appendRuntimeDebugLine('dialogue-delivery.acked-cleared', {
      cardId: activeCardId,
      sessionId,
      turnId,
      ackCursor: nextCursor,
      cleared,
      remainingPending: pendingDialogueDeliveries.size,
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
      limit: payload.limit,
    })
    return rows as AlicizationMindTurnEventRecord[]
  }))
  registerInvokeHandler(electronAlicizationListMemoryDecisionTraces, async (payload: AlicizationListMemoryDecisionTracesPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listMindTurnEvents({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      activeThreadId: payload.activeThreadId,
      limit: payload.limit ? Math.max(payload.limit * 8, payload.limit) : 400,
    })
    return buildAlicizationMemoryDecisionTraceRecords(rows).slice(0, Math.max(1, payload.limit ?? 20)) as AlicizationMemoryDecisionTraceRecord[]
  }))

  registerInvokeHandler(electronAlicizationRunReplayBenchmark, async (payload: AlicizationRunReplayBenchmarkPayload) => await withCardScope(payload.cardId, async () => {
    const packId = payload.packId === 'default-humanlike-memory-v1'
      ? payload.packId
      : 'default-humanlike-memory-v1'
    const persistTelemetry = payload.persistTelemetry !== false
    const benchmarkTurns = buildDefaultHumanlikeMemoryBenchmarkPack()
    const result = await benchmarkMainChatSessionReplay({
      turns: benchmarkTurns,
    })
    const telemetryPatch = buildReplayBenchmarkMemoryStatsPatch({
      gate: result.gate,
    })
    if (persistTelemetry) {
      const currentStats = await getAlicizationDb().getMemoryStats()
      await getAlicizationDb().overrideMemoryStats({
        ...currentStats,
        retrievalHealth: {
          ...currentStats?.retrievalHealth,
          ...telemetryPatch.retrievalHealth,
        },
      })
      await appendAuditLog({
        level: result.gate.passed ? 'notice' : 'warning',
        category: 'alicization.memory-benchmark',
        action: 'replay-benchmark-ran',
        message: result.gate.passed
          ? 'Replay benchmark gate passed for the default humanlike memory pack.'
          : 'Replay benchmark gate found failing dimensions in the default humanlike memory pack.',
        payload: {
          packId,
          failingKeys: result.gate.failingKeys,
          telemetryPatch,
        },
      })
    }
    return {
      packId,
      ranAt: Date.now(),
      turnCount: benchmarkTurns.length,
      quality: result.quality,
      standards: result.standards,
      gate: result.gate,
      telemetryPatch,
      telemetryPersisted: persistTelemetry,
    } satisfies AlicizationRunReplayBenchmarkResult
  }))
}
