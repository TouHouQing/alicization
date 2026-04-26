import type {
  AlicizationListMemoryDecisionTracesPayload,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationListMindTurnEventsPayload,
  AlicizationRunReplayBenchmarkPayload,
  AlicizationRunReplayBenchmarkResult,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

const defaultQueryLimit = 200
const maxQueryLimit = 500

const requiredReplayKinds: AlicizationMindTurnEventKind[] = [
  'governance-normalized',
  'persistence-written',
]

function sortMindTurnEvents(events: AlicizationMindTurnEventRecord[]) {
  return [...events].sort((left, right) => {
    if (left.createdAt !== right.createdAt)
      return left.createdAt - right.createdAt
    return left.id.localeCompare(right.id)
  })
}

function sortMemoryDecisionTraces(records: AlicizationMemoryDecisionTraceRecord[]) {
  return [...records].sort((left, right) => {
    if (left.lastUpdatedAt !== right.lastUpdatedAt)
      return right.lastUpdatedAt - left.lastUpdatedAt
    if (left.createdAt !== right.createdAt)
      return right.createdAt - left.createdAt
    return left.decisionTraceId.localeCompare(right.decisionTraceId)
  })
}

function normalizeReplayQuery(payload: AlicizationListMindTurnEventsPayload): AlicizationListMindTurnEventsPayload {
  const decisionTraceId = payload.decisionTraceId?.trim()
  const turnId = payload.turnId?.trim()
  const requestedLimit = Number(payload.limit)
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(maxQueryLimit, Math.floor(requestedLimit)))
    : defaultQueryLimit

  return {
    decisionTraceId: decisionTraceId || undefined,
    turnId: turnId || undefined,
    limit,
  }
}

function asPayloadRecord(event: AlicizationMindTurnEventRecord): Record<string, unknown> {
  return event.payload && typeof event.payload === 'object'
    ? event.payload as Record<string, unknown>
    : {}
}

function pickInteger(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.floor(value))
}

function pickString(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

export interface AlicizationMindReplayCoverage {
  requiredComplete: boolean
  hasGovernanceNormalized: boolean
  hasPersistenceWritten: boolean
  hasTakeoverAudit: boolean
  hasDialogueEmitted: boolean
  hasMemoryFactsUpserted: boolean
  eventKindCounts: Partial<Record<AlicizationMindTurnEventKind, number>>
}

export interface AlicizationMindReplaySummary {
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  origin: AlicizationMindTurnEventRecord['origin'] | null
  eventCount: number
  firstCreatedAt: number | null
  lastCreatedAt: number | null
  memoryFactInputTotal: number
  memoryExtractionTriggerSet: Array<'batch' | 'idle' | 'force' | 'manual'>
  fallbackReasonSet: string[]
  coverage: AlicizationMindReplayCoverage
}

export function deriveMindReplayCoverage(events: AlicizationMindTurnEventRecord[]): AlicizationMindReplayCoverage {
  const eventKindCounts: Partial<Record<AlicizationMindTurnEventKind, number>> = {}
  for (const event of events) {
    eventKindCounts[event.kind] = (eventKindCounts[event.kind] ?? 0) + 1
  }

  const hasGovernanceNormalized = (eventKindCounts['governance-normalized'] ?? 0) > 0
  const hasPersistenceWritten = (eventKindCounts['persistence-written'] ?? 0) > 0
  const hasTakeoverAudit = (eventKindCounts['takeover-audit'] ?? 0) > 0
  const hasDialogueEmitted = (eventKindCounts['dialogue-emitted'] ?? 0) > 0
  const hasMemoryFactsUpserted = (eventKindCounts['memory-facts-upserted'] ?? 0) > 0

  return {
    requiredComplete: requiredReplayKinds.every(kind => (eventKindCounts[kind] ?? 0) > 0),
    hasGovernanceNormalized,
    hasPersistenceWritten,
    hasTakeoverAudit,
    hasDialogueEmitted,
    hasMemoryFactsUpserted,
    eventKindCounts,
  }
}

export function deriveMindReplaySummary(events: AlicizationMindTurnEventRecord[]): AlicizationMindReplaySummary {
  const sorted = sortMindTurnEvents(events)
  const first = sorted[0]
  const last = sorted.at(-1)
  const coverage = deriveMindReplayCoverage(sorted)

  const memoryExtractionTriggerSet = new Set<'batch' | 'idle' | 'force' | 'manual'>()
  const fallbackReasonSet = new Set<string>()
  let memoryFactInputTotal = 0

  for (const event of sorted) {
    const payload = asPayloadRecord(event)
    if (event.kind === 'memory-facts-upserted') {
      memoryFactInputTotal += pickInteger(payload.factInputCount)
      const trigger = pickString(payload.trigger)
      if (trigger === 'batch' || trigger === 'idle' || trigger === 'force' || trigger === 'manual')
        memoryExtractionTriggerSet.add(trigger)
    }

    if (event.kind === 'takeover-audit') {
      const fallbackReason = pickString(payload.fallback_reason)
      if (fallbackReason)
        fallbackReasonSet.add(fallbackReason)
    }
  }

  return {
    decisionTraceId: first?.decisionTraceId ?? null,
    turnId: first?.turnId ?? null,
    sessionId: first?.sessionId ?? null,
    origin: first?.origin ?? null,
    eventCount: sorted.length,
    firstCreatedAt: first?.createdAt ?? null,
    lastCreatedAt: last?.createdAt ?? null,
    memoryFactInputTotal,
    memoryExtractionTriggerSet: [...memoryExtractionTriggerSet],
    fallbackReasonSet: [...fallbackReasonSet],
    coverage,
  }
}

export const useAlicizationMindReplayStore = defineStore('alicization-mind-replay', () => {
  const events = ref<AlicizationMindTurnEventRecord[]>([])
  const traceRecords = ref<AlicizationMemoryDecisionTraceRecord[]>([])
  const loading = ref(false)
  const benchmarkLoading = ref(false)
  const lastError = ref<string | null>(null)
  const lastQuery = ref<AlicizationListMindTurnEventsPayload | null>(null)
  const benchmarkReport = ref<AlicizationRunReplayBenchmarkResult | null>(null)

  const sortedEvents = computed(() => sortMindTurnEvents(events.value))
  const sortedTraceRecords = computed(() => sortMemoryDecisionTraces(traceRecords.value))
  const replayCoverage = computed(() => deriveMindReplayCoverage(sortedEvents.value))
  const replaySummary = computed(() => deriveMindReplaySummary(sortedEvents.value))
  const benchmarkSupported = computed(() => hasAlicizationBridge() && Boolean(getAlicizationBridge().runReplayBenchmark))

  async function queryReplayLab(payload: AlicizationListMindTurnEventsPayload | AlicizationListMemoryDecisionTracesPayload) {
    const query = normalizeReplayQuery(payload)
    lastQuery.value = query
    if (!query.decisionTraceId && !query.turnId) {
      events.value = []
      traceRecords.value = []
      lastError.value = null
      return {
        events: [],
        traceRecords: [],
      }
    }

    if (!hasAlicizationBridge()) {
      events.value = []
      traceRecords.value = []
      lastError.value = null
      return {
        events: [],
        traceRecords: [],
      }
    }

    loading.value = true
    try {
      const bridge = getAlicizationBridge()
      const [eventRows, memoryTraceRows] = await Promise.all([
        bridge.listMindTurnEvents
          ? bridge.listMindTurnEvents(query)
          : Promise.resolve([] as AlicizationMindTurnEventRecord[]),
        bridge.listMemoryDecisionTraces
          ? bridge.listMemoryDecisionTraces(query)
          : Promise.resolve([] as AlicizationMemoryDecisionTraceRecord[]),
      ])
      const normalizedRows = sortMindTurnEvents(Array.isArray(eventRows) ? eventRows : [])
      const normalizedTraceRecords = sortMemoryDecisionTraces(Array.isArray(memoryTraceRows) ? memoryTraceRows : [])
      events.value = normalizedRows
      traceRecords.value = normalizedTraceRecords
      lastError.value = null
      return {
        events: normalizedRows,
        traceRecords: normalizedTraceRecords,
      }
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      events.value = []
      traceRecords.value = []
      return {
        events: [],
        traceRecords: [],
      }
    }
    finally {
      loading.value = false
    }
  }

  async function queryMindTurnEvents(payload: AlicizationListMindTurnEventsPayload) {
    const result = await queryReplayLab(payload)
    return result.events
  }

  async function queryMemoryDecisionTraces(payload: AlicizationListMemoryDecisionTracesPayload) {
    const result = await queryReplayLab(payload)
    return result.traceRecords
  }

  async function runReplayBenchmark(payload?: AlicizationRunReplayBenchmarkPayload) {
    if (!benchmarkSupported.value) {
      benchmarkReport.value = null
      return null
    }

    benchmarkLoading.value = true
    try {
      const result = await getAlicizationBridge().runReplayBenchmark!({
        packId: payload?.packId ?? 'default-humanlike-memory-v1',
        persistTelemetry: payload?.persistTelemetry,
      })
      benchmarkReport.value = result
      lastError.value = null
      return result
    }
    catch (error) {
      benchmarkReport.value = null
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      benchmarkLoading.value = false
    }
  }

  async function queryByDecisionTraceId(decisionTraceId: string, limit = defaultQueryLimit) {
    return await queryMindTurnEvents({
      decisionTraceId,
      limit,
    })
  }

  async function queryByTurnId(turnId: string, limit = defaultQueryLimit) {
    return await queryMindTurnEvents({
      turnId,
      limit,
    })
  }

  function clearReplay() {
    events.value = []
    traceRecords.value = []
    lastError.value = null
    lastQuery.value = null
  }

  function clearBenchmarkReport() {
    benchmarkReport.value = null
  }

  return {
    events: sortedEvents,
    traceRecords: sortedTraceRecords,
    loading,
    benchmarkLoading,
    lastError,
    lastQuery,
    benchmarkSupported,
    benchmarkReport,
    replayCoverage,
    replaySummary,
    queryReplayLab,
    queryMindTurnEvents,
    queryMemoryDecisionTraces,
    runReplayBenchmark,
    queryByDecisionTraceId,
    queryByTurnId,
    clearReplay,
    clearBenchmarkReport,
  }
})
