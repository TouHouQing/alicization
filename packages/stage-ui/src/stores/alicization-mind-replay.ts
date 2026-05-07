import type {
  AlicizationListMemoryDecisionTracesPayload,
  AlicizationMemoryStats,
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

function pickNumber(raw: unknown) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
  }
  return result
}

function describeFollowUpTiming(raw: string | null | undefined) {
  switch (raw) {
    case 'next-open-window':
      return 'the next open window'
    case 'after-payoff':
      return 'after the current payoff'
    case 'same-turn-if-invited':
      return 'an invited same-turn opening'
    case 'internal-only':
      return 'a strictly inward lane'
    default:
      return null
  }
}

function buildMindReplayDiagnosisSummary(input: {
  failingDimensions: string[]
  learningEvidenceSummary: AlicizationMindReplayBenchmarkTurnDiagnosis['learningEvidenceSummary']
  replyMemoryCoherenceSummary: AlicizationMindReplayBenchmarkTurnDiagnosis['replyMemoryCoherenceSummary']
  resolutionLedgerSummary: AlicizationMindReplayBenchmarkTurnDiagnosis['resolutionLedgerSummary']
}) {
  if (input.resolutionLedgerSummary?.suppressionTags?.includes('self-model-stale') && input.replyMemoryCoherenceSummary?.whyWithheld) {
    const timing = describeFollowUpTiming(input.replyMemoryCoherenceSummary.followUpPreferredTiming)
    return `Older self-model continuity was vetoed${timing ? ` until ${timing}` : ''} because the newer self line still needed room: ${input.replyMemoryCoherenceSummary.whyWithheld}`
  }
  if (input.resolutionLedgerSummary?.suppressionTags?.includes('self-model-stale')) {
    const timing = describeFollowUpTiming(input.replyMemoryCoherenceSummary?.followUpPreferredTiming)
    return `Older self-model continuity was vetoed${timing ? ` until ${timing}` : ''} because the newer self line still needed room.`
  }
  if (input.resolutionLedgerSummary?.suppressionTags?.includes('relationship-era-confusion') && input.replyMemoryCoherenceSummary?.whyWithheld) {
    const timing = describeFollowUpTiming(input.replyMemoryCoherenceSummary.followUpPreferredTiming)
    return `Competing relationship eras were vetoed${timing ? ` until ${timing}` : ''} because the recalled bond line was still too easy to confuse: ${input.replyMemoryCoherenceSummary.whyWithheld}`
  }
  if (input.resolutionLedgerSummary?.suppressionTags?.includes('relationship-era-confusion')) {
    const timing = describeFollowUpTiming(input.replyMemoryCoherenceSummary?.followUpPreferredTiming)
    return `Competing relationship eras were vetoed${timing ? ` until ${timing}` : ''} because the recalled bond line was still too easy to confuse.`
  }
  if (input.learningEvidenceSummary?.domain === 'relationship' && input.replyMemoryCoherenceSummary?.whyWithheld) {
    return `Relationship learning is still revising this line, so the memory stayed inward: ${input.replyMemoryCoherenceSummary.whyWithheld}`
  }
  if (input.learningEvidenceSummary?.domain === 'self-model' && input.replyMemoryCoherenceSummary?.whyWithheld) {
    const timing = describeFollowUpTiming(input.replyMemoryCoherenceSummary.followUpPreferredTiming)
    return `Self-model learning is still revising how Alicization understands herself here, so the older self-story stayed compressed${timing ? ` until ${timing}` : ''}: ${input.replyMemoryCoherenceSummary.whyWithheld}`
  }
  if (input.learningEvidenceSummary?.domain === 'world-model' && input.replyMemoryCoherenceSummary?.followUpPreferredTiming) {
    return `World-model knowledge stayed validation-first, so follow-up timing moved to ${input.replyMemoryCoherenceSummary.followUpPreferredTiming}.`
  }
  if (input.replyMemoryCoherenceSummary?.whyWithheld)
    return input.replyMemoryCoherenceSummary.whyWithheld
  if (input.resolutionLedgerSummary?.shouldDelayUntilAfterPayoff)
    return 'Memory stayed behind the current payoff because competing or unstable details still needed to wait.'
  if (input.failingDimensions.length > 0)
    return `Failing dimensions: ${input.failingDimensions.join(', ')}.`
  return null
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

export interface AlicizationMindReplayBenchmarkDimensionGroup {
  key: string
  status: 'pass' | 'fail'
  applicableCount: number
  passedCount: number
  minimumPassingRatio: number
  passedRatio: number
  failingTurnCount: number
}

export interface AlicizationMindReplayBenchmarkTurnDiagnosis {
  turnId: string
  userText: string
  failingDimensions: string[]
  sampledCategories: string[]
  tracePointerKind: 'decision-trace' | 'synthetic-pack-turn'
  decisionTraceId: string | null
  sessionId: string | null
  activeThreadId: string | null
  diagnosisSummary: string | null
  learningEvidenceSummary: {
    action: string | null
    domain: string | null
    resultSummary: string | null
    focuses: string[]
  } | null
  learningExecutionStateSummary: {
    currentTaskId: string | null
    currentStatus: string | null
    currentAttemptCount: number
    currentMaxAttempts: number
    currentNextRetryAt: number | null
    currentBlockedReason: string | null
    currentFailureKind: string | null
    nextLearningAction: string | null
    activeLearningFocuses: string[]
    queuedTaskCount: number
    runningTaskCount: number
    blockedTaskCount: number
    lastCompletedSummary: string | null
    lastFailureReason: string | null
    lastFailureNextRetryAt: number | null
  } | null
  replyMemoryCoherenceSummary: {
    coherenceState: string | null
    whyWithheld: string | null
    followUpSummary: string | null
    followUpPreferredTiming: string | null
    followUpIntrusionRisk: string | null
  } | null
  resolutionLedgerSummary: {
    dominantClusterSummary: string | null
    competingClusterSummary: string | null
    finalSurfacePolicy: string | null
    shouldStayInward: boolean
    shouldDelayUntilAfterPayoff: boolean
    rejectedCandidateCount: number
    suppressionTags: string[]
  } | null
  memorySituationCandidateSummary: {
    selected: string[]
    rejected: string[]
    delayed: string[]
    unresolved: string[]
  } | null
  paritySummary: {
    passed: boolean
    comparedFieldCount: number
    divergentFieldCount: number
    divergentLayers: string[]
    firstDivergentLayer: string | null
    summary: string
    divergentFields: Array<{
      field: string
      mainValue: string | null
      browserValue: string | null
      layer: string
      severity: string
    }>
  } | null
}

export interface AlicizationMindReplayMemoryHealthComparisonRow {
  key: string
  before: number | null
  after: number | null
  patch: number | null
}

export interface AlicizationMindReplayHumanRatingDimensionRow {
  key: string
  label: string
  prompt: string
  scale: string
}

export interface AlicizationMindReplayShipGateRow {
  key: string
  status: 'pass' | 'fail'
  detail: string
}

export interface AlicizationMindReplayRegressionTriageRow {
  dimension: string
  owner: 'memory retrieval' | 'planner' | 'evolution' | 'contract' | 'visible realization' | 'proactive parity'
  firstCheck: string
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
  const benchmarkStatsBefore = ref<AlicizationMemoryStats | null>(null)
  const benchmarkStatsAfter = ref<AlicizationMemoryStats | null>(null)
  const selectedBenchmarkPackId = ref<NonNullable<AlicizationRunReplayBenchmarkPayload['packId']>>('final-humanlike-memory-v1')
  const selectedBenchmarkSampleLimit = ref(12)
  const selectedDiagnosisDimension = ref<string>('all')
  const selectedDiagnosisTurnId = ref<string | null>(null)

  const sortedEvents = computed(() => sortMindTurnEvents(events.value))
  const sortedTraceRecords = computed(() => sortMemoryDecisionTraces(traceRecords.value))
  const replayCoverage = computed(() => deriveMindReplayCoverage(sortedEvents.value))
  const replaySummary = computed(() => deriveMindReplaySummary(sortedEvents.value))
  const benchmarkSupported = computed(() => hasAlicizationBridge() && Boolean(getAlicizationBridge().runReplayBenchmark))
  const benchmarkPackOptions = computed(() => [
    { label: 'Final', value: 'final-humanlike-memory-v1' },
    { label: 'Sampled', value: 'sampled-humanlike-memory-v1' },
    { label: 'Backlog', value: 'backlog-humanlike-memory-v1' },
    { label: 'Default', value: 'default-humanlike-memory-v1' },
    { label: 'Growth', value: 'growth-humanlike-memory-v1' },
    { label: 'Adversarial', value: 'adversarial-humanlike-memory-v2' },
  ] as const)
  const benchmarkDimensionGroups = computed<AlicizationMindReplayBenchmarkDimensionGroup[]>(() => {
    const dimensions = benchmarkReport.value?.gate.dimensions ?? []
    return dimensions.map(dimension => ({
      key: dimension.key,
      status: dimension.status,
      applicableCount: dimension.applicableCount,
      passedCount: dimension.passedCount,
      minimumPassingRatio: dimension.minimumPassingRatio,
      passedRatio: dimension.passedRatio,
      failingTurnCount: dimension.failingTurnIds.length,
    }))
  })
  const benchmarkFailingTurns = computed<AlicizationMindReplayBenchmarkTurnDiagnosis[]>(() => {
    const failingTurns = benchmarkReport.value?.failingTurnSet ?? []
    const traceByDecisionTraceId = new Map(
      traceRecords.value
        .filter(item => item.decisionTraceId)
        .map(item => [item.decisionTraceId, item] as const),
    )
    return failingTurns.map((item) => {
      const tracePointer = item.tracePointer
      const trace = tracePointer.decisionTraceId
        ? traceByDecisionTraceId.get(tracePointer.decisionTraceId) ?? null
        : null
      const learningEvidenceSummary = (() => {
        const payload = trace?.learningExecuted && typeof trace.learningExecuted === 'object'
          ? trace.learningExecuted as Record<string, unknown>
          : null
        if (!payload)
          return null
        return {
          action: pickString(payload.action) || null,
          domain: pickString(payload.domain) || null,
          resultSummary: pickString(payload.resultSummary) || null,
          focuses: Array.isArray(payload.focuses)
            ? payload.focuses.map(item => pickString(item)).filter(Boolean)
            : [],
        }
      })()
      const replyMemoryCoherenceSummary = (() => {
        const payload = trace?.replyMemoryCoherence && typeof trace.replyMemoryCoherence === 'object'
          ? trace.replyMemoryCoherence as Record<string, unknown>
          : null
        if (!payload)
          return null
        return {
          coherenceState: pickString(payload.coherenceState) || null,
          whyWithheld: pickString(payload.whyWithheld) || null,
          followUpSummary: pickString(payload.followUpSummary) || null,
          followUpPreferredTiming: pickString(payload.followUpPreferredTiming) || null,
          followUpIntrusionRisk: pickString(payload.followUpIntrusionRisk) || null,
        }
      })()
      const learningExecutionStateSummary = (() => {
        const state = trace?.derivedMindStateBundle?.learningExecutionState ?? null
        if (!state)
          return null
        return {
          currentTaskId: state.currentTaskId,
          currentStatus: state.currentStatus,
          currentAttemptCount: state.currentAttemptCount,
          currentMaxAttempts: state.currentMaxAttempts,
          currentNextRetryAt: state.currentNextRetryAt,
          currentBlockedReason: state.currentBlockedReason,
          currentFailureKind: state.currentFailureKind,
          nextLearningAction: state.nextLearningAction,
          activeLearningFocuses: [...state.activeLearningFocuses],
          queuedTaskCount: state.queuedTaskCount,
          runningTaskCount: state.runningTaskCount,
          blockedTaskCount: state.blockedTaskCount,
          lastCompletedSummary: state.lastCompletedSummary,
          lastFailureReason: state.lastFailureReason,
          lastFailureNextRetryAt: state.lastFailureNextRetryAt,
        }
      })()
      const resolutionLedgerSummary = item.resolutionLedgerSummary
        ? {
            ...item.resolutionLedgerSummary,
            suppressionTags: [...(item.resolutionLedgerSummary.suppressionTags ?? [])],
          }
        : null
      const memorySituationCandidateSummary = item.memorySituationCandidateSummary
        ? {
            selected: [...item.memorySituationCandidateSummary.selected],
            rejected: [...item.memorySituationCandidateSummary.rejected],
            delayed: [...item.memorySituationCandidateSummary.delayed],
            unresolved: [...item.memorySituationCandidateSummary.unresolved],
          }
        : null
      const paritySummary = item.paritySummary
        ? {
            passed: item.paritySummary.passed,
            comparedFieldCount: item.paritySummary.comparedFieldCount,
            divergentFieldCount: item.paritySummary.divergentFieldCount,
            divergentLayers: [...item.paritySummary.divergentLayers],
            firstDivergentLayer: item.paritySummary.firstDivergentLayer,
            summary: item.paritySummary.summary,
            divergentFields: item.paritySummary.divergentFields.map(field => ({
              field: field.field,
              mainValue: field.mainValue,
              browserValue: field.browserValue,
              layer: field.layer,
              severity: field.severity,
            })),
          }
        : null
      return {
        turnId: item.turnId,
        userText: item.userText,
        failingDimensions: [...item.failingDimensions],
        sampledCategories: [...(item.sampledCategories ?? [])],
        tracePointerKind: tracePointer.kind,
        decisionTraceId: tracePointer.decisionTraceId ?? null,
        sessionId: tracePointer.sessionId ?? null,
        activeThreadId: tracePointer.activeThreadId ?? null,
        diagnosisSummary: buildMindReplayDiagnosisSummary({
          failingDimensions: [...item.failingDimensions],
          learningEvidenceSummary,
          replyMemoryCoherenceSummary,
          resolutionLedgerSummary,
        }),
        learningEvidenceSummary,
        learningExecutionStateSummary,
        replyMemoryCoherenceSummary,
        resolutionLedgerSummary,
        memorySituationCandidateSummary,
        paritySummary,
      }
    })
  })
  const filteredBenchmarkFailingTurns = computed(() => {
    if (selectedDiagnosisDimension.value === 'all')
      return benchmarkFailingTurns.value
    return benchmarkFailingTurns.value.filter(item => item.failingDimensions.includes(selectedDiagnosisDimension.value))
  })
  const selectedBenchmarkTurn = computed(() => {
    if (!selectedDiagnosisTurnId.value)
      return filteredBenchmarkFailingTurns.value[0] ?? null
    return filteredBenchmarkFailingTurns.value.find(item => item.turnId === selectedDiagnosisTurnId.value) ?? filteredBenchmarkFailingTurns.value[0] ?? null
  })
  const benchmarkDimensionKeySet = computed(() => uniqueStrings(benchmarkDimensionGroups.value.map(item => item.key)))
  const benchmarkHumanRatingRows = computed<AlicizationMindReplayHumanRatingDimensionRow[]>(() => {
    const dimensions = benchmarkReport.value?.datasetFeedback.humanRatingRubric?.dimensions ?? []
    return dimensions.map(item => ({
      key: item.key,
      label: item.label,
      prompt: item.prompt,
      scale: item.scale,
    }))
  })
  const benchmarkShipGateRows = computed<AlicizationMindReplayShipGateRow[]>(() => {
    const report = benchmarkReport.value
    if (!report) {
      return []
    }
    if (Array.isArray((report as any).shipGate) && (report as any).shipGate.length > 0)
      return (report as any).shipGate as AlicizationMindReplayShipGateRow[]
    const telemetry = report.telemetryPatch.retrievalHealth
    return [
      {
        key: 'benchmark-gate',
        status: report.gate.passed ? 'pass' : 'fail',
        detail: report.gate.passed
          ? 'Replay benchmark gate passed.'
          : `Failing dimensions: ${report.gate.failingKeys.join(', ') || 'none'}.`,
      },
      {
        key: 'human-rating-gate',
        status: benchmarkHumanRatingRows.value.length > 0 ? 'pass' : 'fail',
        detail: benchmarkHumanRatingRows.value.length > 0
          ? `Human rubric dimensions available: ${benchmarkHumanRatingRows.value.length}.`
          : 'Human rubric is not available.',
      },
      {
        key: 'latency-gate',
        status: (telemetry.semanticLatencyMs ?? 0) <= 1_500 && (telemetry.graphLatencyMs ?? 0) <= 1_500
          ? 'pass'
          : 'fail',
        detail: `semantic=${telemetry.semanticLatencyMs ?? 'n/a'}ms, graph=${telemetry.graphLatencyMs ?? 'n/a'}ms`,
      },
      {
        key: 'wrong-thread-gate',
        status: (telemetry.wrongThreadRate ?? 0) <= 0.25 ? 'pass' : 'fail',
        detail: `wrongThreadRate=${telemetry.wrongThreadRate ?? 0}`,
      },
      {
        key: 'template-leakage-gate',
        status: (telemetry.templateLeakageFailCount ?? 0) <= 0 ? 'pass' : 'fail',
        detail: `templateLeakageFailCount=${telemetry.templateLeakageFailCount ?? 0}`,
      },
    ]
  })
  const benchmarkParityRows = computed(() => {
    const parity = benchmarkReport.value?.datasetFeedback.paritySummary ?? null
    if (!parity)
      return []
    return [
      {
        key: 'browser_main_parity_fixture_pass_rate',
        value: parity.parityPassRate,
        detail: `${parity.parityPassCount}/${parity.comparedTurnCount} fixture turns passed`,
      },
      ...Object.entries(parity.firstDivergentLayerCounts ?? {}).map(([layer, count]) => ({
        key: `parity_divergence:${layer}`,
        value: Number(count),
        detail: `${count} turn(s) diverged first at ${layer}`,
      })),
    ]
  })
  const benchmarkRegressionTriageRows = computed<AlicizationMindReplayRegressionTriageRow[]>(() => {
    const report = benchmarkReport.value
    if (Array.isArray((report as any)?.regressionTriage) && (report as any).regressionTriage.length > 0)
      return (report as any).regressionTriage as AlicizationMindReplayRegressionTriageRow[]
    const failing = report?.gate.failingKeys ?? []
    return failing.map((dimension) => {
      let owner: AlicizationMindReplayRegressionTriageRow['owner'] = 'visible realization'
      let firstCheck = 'Inspect answer shaping and output realization first.'
      if ([
        'wrongThreadSuppression',
        'recentOnlyDrift',
        'eventGraphRecallCollapse',
      ].includes(dimension)) {
        owner = 'memory retrieval'
        firstCheck = 'Check retrieval ranking, event graph recall, and wrong-thread suppression traces first.'
      }
      else if ([
        'procedureCarryQuality',
        'temporalScopeFlexibility',
        'implicitRecallQuality',
      ].includes(dimension)) {
        owner = 'planner'
        firstCheck = 'Check recollection intent, recall planner, and speech placement decisions first.'
      }
      else if ([
        'knowledgeCorrectionDiscipline',
        'repeatedMistakeAvoidance',
        'hostUnderstandingGrowth',
        'skillInternalizationGrowth',
        'selfRevisionGrowth',
        'learningRevisionDiscipline',
        'domainInternalizationDiscipline',
        'worldModelValidationDiscipline',
      ].includes(dimension)) {
        owner = 'evolution'
        firstCheck = 'Check self-evolution kernel, active learning strategy, and knowledge assimilation signals first.'
      }
      else if ([
        'surfaceRestraint',
      ].includes(dimension)) {
        owner = 'contract'
        firstCheck = 'Check response charter, restraint judge, and truth-discipline contract first.'
      }
      else if ([
        'relationshipRepairAdaptation',
        'closenessLadderDrift',
        'templateLeakage',
      ].includes(dimension)) {
        owner = 'visible realization'
        firstCheck = 'Check answer compiler, visible realization posture, and template leakage traces first.'
      }
      else if (dimension === 'replyMemoryCoherence') {
        owner = 'proactive parity'
        firstCheck = 'Check cross-surface parity between main chat, proactive, and callback realization first.'
      }
      return {
        dimension,
        owner,
        firstCheck,
      }
    })
  })
  const memoryHealthComparisonRows = computed<AlicizationMindReplayMemoryHealthComparisonRow[]>(() => {
    const before = benchmarkStatsBefore.value?.retrievalHealth
    const after = benchmarkStatsAfter.value?.retrievalHealth
    const patch = benchmarkReport.value?.telemetryPatch.retrievalHealth
    return [
      {
        key: 'templateLeakageFailCount',
        before: pickNumber(before?.templateLeakageFailCount),
        after: pickNumber(after?.templateLeakageFailCount),
        patch: pickNumber(patch?.templateLeakageFailCount),
      },
      {
        key: 'reconstructionFrequency',
        before: pickNumber(before?.reconstructionFrequency),
        after: pickNumber(after?.reconstructionFrequency),
        patch: pickNumber(patch?.reconstructionFrequency),
      },
      {
        key: 'reconstructedCount',
        before: pickNumber(before?.reconstructedCount),
        after: pickNumber(after?.reconstructedCount),
        patch: pickNumber(patch?.reconstructedCount),
      },
      {
        key: 'semanticLatencyMs',
        before: pickNumber(before?.semanticLatencyMs),
        after: pickNumber(after?.semanticLatencyMs),
        patch: pickNumber(patch?.semanticLatencyMs),
      },
      {
        key: 'graphLatencyMs',
        before: pickNumber(before?.graphLatencyMs),
        after: pickNumber(after?.graphLatencyMs),
        patch: pickNumber(patch?.graphLatencyMs),
      },
      {
        key: 'learningTaskCompletionCount',
        before: pickNumber(before?.learningTaskCompletionCount),
        after: pickNumber(after?.learningTaskCompletionCount),
        patch: pickNumber(patch?.learningTaskCompletionCount),
      },
      {
        key: 'learningTaskFailureCount',
        before: pickNumber(before?.learningTaskFailureCount),
        after: pickNumber(after?.learningTaskFailureCount),
        patch: pickNumber(patch?.learningTaskFailureCount),
      },
      {
        key: 'learningRelationshipReviseCount',
        before: pickNumber(before?.learningRelationshipReviseCount),
        after: pickNumber(after?.learningRelationshipReviseCount),
        patch: pickNumber(patch?.learningRelationshipReviseCount),
      },
      {
        key: 'learningSelfModelReviseCount',
        before: pickNumber(before?.learningSelfModelReviseCount),
        after: pickNumber(after?.learningSelfModelReviseCount),
        patch: pickNumber(patch?.learningSelfModelReviseCount),
      },
      {
        key: 'learningWorldModelValidationCount',
        before: pickNumber(before?.learningWorldModelValidationCount),
        after: pickNumber(after?.learningWorldModelValidationCount),
        patch: pickNumber(patch?.learningWorldModelValidationCount),
      },
      {
        key: 'learningWorldModelFalseInternalizationCount',
        before: pickNumber(before?.learningWorldModelFalseInternalizationCount),
        after: pickNumber(after?.learningWorldModelFalseInternalizationCount),
        patch: pickNumber(patch?.learningWorldModelFalseInternalizationCount),
      },
      {
        key: 'learningTaskCompletionRate',
        before: pickNumber(before?.learningTaskCompletionRate),
        after: pickNumber(after?.learningTaskCompletionRate),
        patch: pickNumber(patch?.learningTaskCompletionRate),
      },
      {
        key: 'learningTaskFailureRate',
        before: pickNumber(before?.learningTaskFailureRate),
        after: pickNumber(after?.learningTaskFailureRate),
        patch: pickNumber(patch?.learningTaskFailureRate),
      },
      {
        key: 'learningTaskReopenRecoveryRate',
        before: pickNumber(before?.learningTaskReopenRecoveryRate),
        after: pickNumber(after?.learningTaskReopenRecoveryRate),
        patch: pickNumber(patch?.learningTaskReopenRecoveryRate),
      },
      {
        key: 'misinternalizationRate',
        before: pickNumber(before?.misinternalizationRate),
        after: pickNumber(after?.misinternalizationRate),
        patch: pickNumber(patch?.misinternalizationRate),
      },
      {
        key: 'relationshipCadenceRegressionRate',
        before: pickNumber(before?.relationshipCadenceRegressionRate),
        after: pickNumber(after?.relationshipCadenceRegressionRate),
        patch: pickNumber(patch?.relationshipCadenceRegressionRate),
      },
      {
        key: 'selfModelStaleBeliefRate',
        before: pickNumber(before?.selfModelStaleBeliefRate),
        after: pickNumber(after?.selfModelStaleBeliefRate),
        patch: pickNumber(patch?.selfModelStaleBeliefRate),
      },
    ]
  })

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
      const bridge = getAlicizationBridge()
      benchmarkStatsBefore.value = await bridge.getMemoryStats()
      const result = await bridge.runReplayBenchmark!({
        packId: payload?.packId ?? selectedBenchmarkPackId.value,
        persistTelemetry: payload?.persistTelemetry,
        sampleLimit: payload?.sampleLimit ?? selectedBenchmarkSampleLimit.value,
      })
      benchmarkReport.value = result
      benchmarkStatsAfter.value = await bridge.getMemoryStats()
      const selectedDimension = selectedDiagnosisDimension.value
      if (selectedDimension !== 'all' && !result.gate.dimensions.some(item => item.key === selectedDimension))
        selectedDiagnosisDimension.value = 'all'
      selectedDiagnosisTurnId.value = result.failingTurnSet[0]?.turnId ?? null
      lastError.value = null
      return result
    }
    catch (error) {
      benchmarkReport.value = null
      benchmarkStatsBefore.value = null
      benchmarkStatsAfter.value = null
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
    benchmarkStatsBefore.value = null
    benchmarkStatsAfter.value = null
    selectedDiagnosisTurnId.value = null
    selectedDiagnosisDimension.value = 'all'
  }

  function setBenchmarkPackId(packId: NonNullable<AlicizationRunReplayBenchmarkPayload['packId']>) {
    selectedBenchmarkPackId.value = packId
  }

  function setBenchmarkSampleLimit(limit: number) {
    if (!Number.isFinite(limit))
      return
    selectedBenchmarkSampleLimit.value = Math.max(1, Math.min(maxQueryLimit, Math.floor(limit)))
  }

  function setSelectedDiagnosisDimension(value: string) {
    selectedDiagnosisDimension.value = value || 'all'
    selectedDiagnosisTurnId.value = filteredBenchmarkFailingTurns.value[0]?.turnId ?? null
  }

  function setSelectedDiagnosisTurnId(turnId: string | null) {
    selectedDiagnosisTurnId.value = turnId
  }

  async function drillDownBenchmarkTurn(turnIdRaw?: string | null) {
    const turn = benchmarkFailingTurns.value.find(item => item.turnId === turnIdRaw)
      ?? selectedBenchmarkTurn.value
    if (!turn)
      return {
        events: [],
        traceRecords: [],
      }
    selectedDiagnosisTurnId.value = turn.turnId
    if (turn.decisionTraceId)
      return await queryReplayLab({ decisionTraceId: turn.decisionTraceId, limit: defaultQueryLimit })
    return await queryReplayLab({ turnId: turn.turnId, limit: defaultQueryLimit })
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
    benchmarkStatsBefore,
    benchmarkStatsAfter,
    benchmarkPackOptions,
    selectedBenchmarkPackId,
    selectedBenchmarkSampleLimit,
    selectedDiagnosisDimension,
    selectedDiagnosisTurnId,
    benchmarkDimensionGroups,
    benchmarkFailingTurns,
    filteredBenchmarkFailingTurns,
    selectedBenchmarkTurn,
    benchmarkDimensionKeySet,
    benchmarkHumanRatingRows,
    benchmarkShipGateRows,
    benchmarkParityRows,
    benchmarkRegressionTriageRows,
    memoryHealthComparisonRows,
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
    setBenchmarkPackId,
    setBenchmarkSampleLimit,
    setSelectedDiagnosisDimension,
    setSelectedDiagnosisTurnId,
    drillDownBenchmarkTurn,
  }
})
