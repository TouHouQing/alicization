import type {
  AlicizationListMemoryDecisionTracesPayload,
  AlicizationListMindTurnEventsPayload,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMemoryStats,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
  AlicizationRunReplayBenchmarkPayload,
  AlicizationRunReplayBenchmarkResult,
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
  const activeSelfEvolutionCandidateId = 'activeSelfEvolutionCandidateId' in payload && typeof payload.activeSelfEvolutionCandidateId === 'string'
    ? payload.activeSelfEvolutionCandidateId.trim()
    : undefined
  const requestedLimit = Number(payload.limit)
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(maxQueryLimit, Math.floor(requestedLimit)))
    : defaultQueryLimit

  return {
    decisionTraceId: decisionTraceId || undefined,
    turnId: turnId || undefined,
    activeSelfEvolutionCandidateId: activeSelfEvolutionCandidateId || undefined,
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

function pickRatio(hits: number, total: number) {
  if (!Number.isFinite(hits) || !Number.isFinite(total) || total <= 0)
    return null
  return Number((hits / total).toFixed(2))
}

function readPresenceQuality(raw: AlicizationMemoryStats | null | undefined) {
  return raw?.presenceQuality ?? null
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
  selfAuthoritySummary?: {
    authoritySummary: string | null
    closenessPosture: string | null
    preservedIntoRewrite: boolean
    rewriteClosureApplied: boolean
  } | null
}) {
  const selfAuthoritySummary = input.selfAuthoritySummary ?? null
  if (
    selfAuthoritySummary
    && (!selfAuthoritySummary.preservedIntoRewrite || !selfAuthoritySummary.rewriteClosureApplied)
    && (selfAuthoritySummary.authoritySummary || selfAuthoritySummary.closenessPosture)
  ) {
    const authorityLine = selfAuthoritySummary.authoritySummary?.trim() || 'continuity self authority present'
    const postureLine = selfAuthoritySummary.closenessPosture?.trim()
    const missingSteps = [
      selfAuthoritySummary.preservedIntoRewrite ? null : 'preserve it into rewrite',
      selfAuthoritySummary.rewriteClosureApplied ? null : 'apply it in the final rewrite',
    ].filter(Boolean).join(' and ')
    return `${authorityLine}${postureLine ? ` | closeness posture: ${postureLine}` : ''}. Self-authority drift is still open here, so the next turn should ${missingSteps}.`
  }
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
  selfAuthoritySummary: {
    authoritySummary: string | null
    closenessPosture: string | null
    preservedIntoRewrite: boolean
    rewriteClosureApplied: boolean
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
  section?: 'retrieval' | 'learning' | 'presence-quality'
}

export interface AlicizationMindReplayMetricRow {
  key: string
  value: number | null
  detail: string
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
  owner: 'memory retrieval' | 'planner' | 'evolution' | 'contract' | 'visible realization' | 'proactive parity' | 'runtime continuity'
  firstCheck: string
}

export interface AlicizationMindReplaySameHerRepairTargetRow {
  lane: 'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment'
  sessionId: string
  turnId: string
  decisionTraceId?: string | null
  missingLanes: Array<'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment'>
  reasons: string[]
  firstCheck: string
}

export interface AlicizationMindReplayRuntimeSameHerProofSummary {
  status: 'closed' | 'insufficient' | 'not-runtime' | 'none'
  closed: boolean
  source: NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>['source']> | null
  sourceIsRuntime: boolean
  sampledTurnCount: number
  comparedSessionCount: number
  closedSessionCount: number
  sessionClosureRate: number
  runtimeClosureRate: number
  runtimeSourcedSessionCount: number
  allRuntimeSourcedSessionCount: number
  syntheticTurnCount: number
  decisionTraceTurnCount: number
  runtimeTurnCount: number
  headline: string
  detail: string
  nextRepairTarget: string
}

export interface AlicizationMindReplayMemoryClosureLongRunSummary {
  status: 'closed' | 'insufficient'
  closed: boolean
  turnCount: number
  requiredTurnCount: number
  stableMemoryIdentity: boolean
  dominantMemoryIdentityKey: string | null
  failureReasons: string[]
  detail: string
  nextRepairTarget: string
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
          selfAuthoritySummary: item.selfAuthoritySummary
            ? {
                authoritySummary: item.selfAuthoritySummary.authoritySummary ?? null,
                closenessPosture: item.selfAuthoritySummary.closenessPosture ?? null,
                preservedIntoRewrite: item.selfAuthoritySummary.preservedIntoRewrite === true,
                rewriteClosureApplied: item.selfAuthoritySummary.rewriteClosureApplied === true,
              }
            : null,
        }),
        learningEvidenceSummary,
        learningExecutionStateSummary,
        replyMemoryCoherenceSummary,
        selfAuthoritySummary: item.selfAuthoritySummary
          ? {
              authoritySummary: item.selfAuthoritySummary.authoritySummary ?? null,
              closenessPosture: item.selfAuthoritySummary.closenessPosture ?? null,
              preservedIntoRewrite: item.selfAuthoritySummary.preservedIntoRewrite === true,
              rewriteClosureApplied: item.selfAuthoritySummary.rewriteClosureApplied === true,
            }
          : null,
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
    const telemetry = report.telemetryPatch.retrievalHealth as typeof report.telemetryPatch.retrievalHealth & {
      quietCompanionshipCoverage?: number
      silentPresenceNuisanceRate?: number
      continuityMindCarryRate?: number
    }
    const quietCompanionshipCoverage = pickNumber(telemetry.quietCompanionshipCoverage)
    const silentPresenceNuisanceRate = pickNumber(telemetry.silentPresenceNuisanceRate)
    const continuityMindCarryRate = pickNumber(telemetry.continuityMindCarryRate)
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
      {
        key: 'presence-qa-gate',
        status: (quietCompanionshipCoverage ?? 0) >= 0.7
          && (silentPresenceNuisanceRate ?? 1) <= 0.2
          && (continuityMindCarryRate ?? 0) >= 0.7
          ? 'pass'
          : 'fail',
        detail: `quietCompanionshipCoverage=${quietCompanionshipCoverage ?? 0}, silentPresenceNuisanceRate=${silentPresenceNuisanceRate ?? 0}, continuityMindCarryRate=${continuityMindCarryRate ?? 0}`,
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
  const benchmarkProjectStateRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const projectState = benchmarkReport.value?.datasetFeedback.projectStateSummary ?? null
    if (!projectState)
      return []
    const comparedTurnCount = Math.max(0, projectState.comparedTurnCount)
    const hasProactiveSameHerGapHitCount = Object.prototype.hasOwnProperty.call(
      projectState,
      'proactiveSameHerGapHitCount',
    )
    const identityHitRate = pickRatio(projectState.identityHitCount, comparedTurnCount)
    const phaseHitRate = pickRatio(projectState.phaseHitCount, comparedTurnCount)
    const openLoopHitRate = pickRatio(projectState.openLoopHitCount, comparedTurnCount)
    const sameHerHitRate = pickRatio(projectState.sameHerHitCount, comparedTurnCount)
    const proactiveSameHerGapHitRate = hasProactiveSameHerGapHitCount
      ? pickRatio(projectState.proactiveSameHerGapHitCount ?? 0, comparedTurnCount)
      : null
    const continuityHitRate = pickRatio(projectState.continuityHitCount, comparedTurnCount)
    return [
      {
        key: 'project_state_compared_turn_count',
        value: comparedTurnCount,
        detail: `${comparedTurnCount} replay turn(s) carried project-state continuity cues that should keep project identity, Phase 1 route, and unresolved open loops on the continuity thread.`,
      },
      {
        key: 'project_state_identity_hit_rate',
        value: identityHitRate,
        detail: `identity=${identityHitRate ?? 'n/a'} (${projectState.identityHitCount}/${comparedTurnCount}) | checks whether she still knows what this project is.`,
      },
      {
        key: 'project_state_phase_hit_rate',
        value: phaseHitRate,
        detail: `phase=${phaseHitRate ?? 'n/a'} (${projectState.phaseHitCount}/${comparedTurnCount}) | checks whether she is still carrying the Phase 1 local-digital-life route.`,
      },
      {
        key: 'project_state_open_loop_hit_rate',
        value: openLoopHitRate,
        detail: `openLoop=${openLoopHitRate ?? 'n/a'} (${projectState.openLoopHitCount}/${comparedTurnCount}) | checks whether unresolved project loops are still being carried forward.`,
      },
      {
        key: 'project_state_same_her_hit_rate',
        value: sameHerHitRate,
        detail: `sameHer=${sameHerHitRate ?? 'n/a'} (${projectState.sameHerHitCount}/${comparedTurnCount}) | checks whether the continuity self line is still explicit before the turn widens outward.`,
      },
      ...(hasProactiveSameHerGapHitCount
        ? [{
            key: 'project_state_proactive_same_her_gap_hit_rate',
            value: proactiveSameHerGapHitRate,
            detail: `proactiveSameHerGap=${proactiveSameHerGapHitRate ?? 'n/a'} (${projectState.proactiveSameHerGapHitCount ?? 0}/${comparedTurnCount}) | checks whether visible proactive hold, subconscious carry, and next-session feedback still stay on one continuity follow-through line.`,
          }]
        : []),
      {
        key: 'project_state_continuity_hit_rate',
        value: continuityHitRate,
        detail: `continuity=${continuityHitRate ?? 'n/a'} (${projectState.continuityHitCount}/${comparedTurnCount}) | checks whether identity, phase, open loops, and the continuity self line still arrive together as one continuity brief.`,
      },
    ]
  })
  const benchmarkEmotionalClosureRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.emotionalClosureSummary ?? null
    if (!summary)
      return []
    const comparedTurnCount = Math.max(0, summary.comparedTurnCount)
    const activeCueRate = pickRatio(summary.activeCueTurnCount, comparedTurnCount)
    const preservedRate = pickRatio(summary.preservedTurnCount, comparedTurnCount)
    const rewriteAppliedRate = pickRatio(summary.rewriteAppliedTurnCount, comparedTurnCount)
    const fullyClosedRate = pickRatio(summary.fullyClosedTurnCount, comparedTurnCount)
    const lowPressureRequiredRate = pickRatio(summary.lowPressureRequiredTurnCount, comparedTurnCount)
    const antiRestartRequiredRate = pickRatio(summary.antiRestartRequiredTurnCount, comparedTurnCount)
    const drifted = benchmarkReport.value?.datasetFeedback.driftSignals?.includes('emotionalClosureDrift') === true
    return [
      {
        key: 'emotional_closure_compared_turn_count',
        value: comparedTurnCount,
        detail: `${comparedTurnCount} replay turn(s) carried continuity emotional closure audit.`,
      },
      {
        key: 'emotional_closure_active_cue_rate',
        value: activeCueRate,
        detail: `activeCue=${activeCueRate ?? 'n/a'} (${summary.activeCueTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'emotional_closure_preserved_rate',
        value: preservedRate,
        detail: `preservedIntoRewrite=${preservedRate ?? 'n/a'} (${summary.preservedTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'emotional_closure_rewrite_applied_rate',
        value: rewriteAppliedRate,
        detail: `rewriteClosureApplied=${rewriteAppliedRate ?? 'n/a'} (${summary.rewriteAppliedTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'emotional_closure_fully_closed_rate',
        value: fullyClosedRate,
        detail: `${drifted ? 'drift=emotionalClosureDrift | ' : ''}fullyClosed=${fullyClosedRate ?? 'n/a'} (${summary.fullyClosedTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'emotional_closure_low_pressure_required_rate',
        value: lowPressureRequiredRate,
        detail: `lowPressureRequired=${lowPressureRequiredRate ?? 'n/a'} (${summary.lowPressureRequiredTurnCount}/${comparedTurnCount}) | checks whether the continuity return still needs a lower-pressure landing instead of widening too fast.`,
      },
      {
        key: 'emotional_closure_anti_restart_required_rate',
        value: antiRestartRequiredRate,
        detail: `antiRestartRequired=${antiRestartRequiredRate ?? 'n/a'} (${summary.antiRestartRequiredTurnCount}/${comparedTurnCount}) | checks whether the continuity return still must avoid reopening from scratch.`,
      },
    ]
  })
  const benchmarkSameHerSessionRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.longRunSameHerSessionSummary ?? null
    if (!summary)
      return []
    return [
      {
        key: 'same_her_session_compared_count',
        value: summary.comparedSessionCount,
        detail: `${summary.comparedSessionCount} real sampled session(s) had enough long-run continuity evidence to compare.`,
      },
      {
        key: 'same_her_session_closure_rate',
        value: summary.sessionClosureRate,
        detail: `closed=${summary.closedSessionCount}/${summary.comparedSessionCount}, insufficient=${summary.insufficientSessionCount}, singleTurn=${summary.singleTurnSessionCount} | requires at least three applicable turns, causal handoffs, noisy desktop roles, and all lanes closed in each turn.`,
      },
      ...summary.sessions.map((session) => {
        const closureRate = pickRatio(session.hitCount, Math.max(0, session.turnCount))
        const missing = session.turnDiagnostics
          .filter(turn => turn.missingLanes.length > 0)
          .map(turn => `${turn.turnId}:${turn.missingLanes.join('+')}`)
        const missingMetabolismTransitions = session.transitionDiagnostics
          .filter(transition => transition.memoryMetabolismInfluencedNext === false)
          .map(transition => `${transition.fromTurnId}->${transition.toTurnId}`)
        const missingRoles = session.eventRoleCoverage?.missingRoles?.join('+') ?? ''
        const missingRoleTurns = session.eventRoleDiagnostics
          ?.filter(turn => turn.missingRoles.length > 0)
          .map(turn => `${turn.turnId}:${turn.missingRoles.join('+')}`)
          .join(', ') ?? ''
        const missingMetabolism = session.memoryMetabolismCoverage?.missingProofs?.join('+') ?? ''
        const eventRoleWindow = typeof session.maxConsecutiveEventRoleProofTurnCount === 'number'
          ? ` | eventRoleWindow=${session.maxConsecutiveEventRoleProofTurnCount}`
          : ''
        return {
          key: `same_her_session:${session.sessionId}`,
          value: closureRate,
          detail: `${session.status} | hits=${session.hitCount}/${session.turnCount} | failures=${session.failureReasons.join(', ') || 'none'} | turns=${session.turnIds.join(', ')} | missing=${missing.join(', ') || 'none'}${eventRoleWindow}${missingRoles ? ` | missingRoles=${missingRoles}` : ''}${missingRoleTurns ? ` | missingRoleTurns=${missingRoleTurns}` : ''}${missingMetabolism ? ` | missingMetabolism=${missingMetabolism}` : ''}${missingMetabolismTransitions.length > 0 ? ` | missingMetabolismTransitions=${missingMetabolismTransitions.join(', ')}` : ''}`,
        }
      }),
    ]
  })
  const benchmarkRuntimeSamplingEvidenceRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const evidence = benchmarkReport.value?.datasetFeedback.runtimeSamplingEvidence ?? null
    if (!evidence)
      return []
    const repairTargetText = (evidence.repairTargets ?? [])
      .map((target) => {
        const reasons = target.reasons.length > 0
          ? `: ${target.reasons.join('; ')}`
          : ''
        return `${target.lane}(turns=${target.missingTurnCount}, transitions=${target.missingTransitionCount}, sessions=${target.affectedSessionCount})${reasons}`
      })
      .join(' | ')
    const nextRunEvidenceText = runtimeSamplingNextRunEvidenceChecklistText(evidence.nextRunEvidenceChecklist ?? [])
    return [{
      key: 'runtime_sampling_evidence_status',
      value: evidence.sessionClosureRate,
      detail: `status=${evidence.status} | source=${evidence.source} | sampledTurns=${evidence.sampledTurnCount} | closedSessions=${evidence.closedSessionCount}/${evidence.comparedSessionCount}${repairTargetText ? ` | repairTargets=${repairTargetText}` : ''}${nextRunEvidenceText ? ` | nextRunEvidence=${nextRunEvidenceText}` : ''}`,
    }]
  })
  const benchmarkRuntimeSameHerProofSummary = computed<AlicizationMindReplayRuntimeSameHerProofSummary | null>(() => {
    const report = benchmarkReport.value
    const evidence = report?.datasetFeedback.runtimeSamplingEvidence ?? null
    if (!evidence)
      return null

    const sourceIsRuntime = evidence.source === 'runtime-sampling-backlog'
      || evidence.source === 'mixed-runtime-and-conversation'
      || evidence.source === 'conversation-sample'
    const sessions = report?.datasetFeedback.longRunSameHerSessionSummary?.sessions ?? []
    const runtimeSourcedSessionCount = sessions.filter(session => (session.runtimeEvidence?.runtimeTurnCount ?? 0) > 0).length
    const allRuntimeSourcedSessionCount = sessions.filter(session => session.runtimeEvidence?.allTurnsRuntimeSourced === true).length
    const runtimeTurnCount = sessions.reduce((total, session) => total + Math.max(0, session.runtimeEvidence?.runtimeTurnCount ?? 0), 0)
    const decisionTraceTurnCount = sessions.reduce((total, session) => total + Math.max(0, session.runtimeEvidence?.decisionTraceTurnCount ?? 0), 0)
    const syntheticTurnCount = sessions.reduce((total, session) => total + Math.max(0, session.runtimeEvidence?.syntheticTurnCount ?? 0), 0)
    const telemetryRetrieval = report?.telemetryPatch?.retrievalHealth as Record<string, unknown> | undefined
    const telemetryRuntimeClosureRate = pickNumber(telemetryRetrieval?.runtimeLongRunSameHerSessionClosureRate)
    const runtimeClosureRate = telemetryRuntimeClosureRate ?? (sourceIsRuntime && evidence.status === 'closed' ? 1 : 0)
    const closed = sourceIsRuntime
      && evidence.status === 'closed'
      && runtimeClosureRate >= 1
      && allRuntimeSourcedSessionCount >= evidence.comparedSessionCount
      && syntheticTurnCount === 0
    const status: AlicizationMindReplayRuntimeSameHerProofSummary['status'] = !sourceIsRuntime
      ? 'not-runtime'
      : closed
        ? 'closed'
        : evidence.status === 'none'
          ? 'none'
          : 'insufficient'
    const firstRepairTarget = evidence.repairTargets?.[0] ?? null
    const firstNextRunEvidenceChecklist = evidence.nextRunEvidenceChecklist?.[0] ?? null
    const nextRepairTarget = !sourceIsRuntime
      ? 'Run a sampled proof from real runtime turns with decision-trace provenance before treating the long-run continuity loop as closed.'
      : closed
        ? 'Real desktop continuity proof is closed; keep collecting noisy-session samples so future drift is caught before it becomes personality drift.'
        : firstNextRunEvidenceChecklist
          ? `Next real desktop run must capture ${runtimeSamplingNextRunEvidenceChecklistActionText(firstNextRunEvidenceChecklist)}`
          : firstRepairTarget
            ? `${sameHerLaneGapFirstCheck(firstRepairTarget.lane)} Latest runtime repair reason: ${firstRepairTarget.reasons[0] ?? 'runtime continuity proof is still open.'}`
            : 'Collect at least one real noisy desktop session with memory recall, proactive opening, execution callback, emotional afterglow, and embodiment expression all tied to decision-trace provenance.'
    const headline = !sourceIsRuntime
      ? 'Dataset/static continuity closure is not enough for the real desktop proof.'
      : closed
        ? 'Real desktop continuity closure is closed by runtime decision-trace evidence.'
        : 'Real desktop continuity closure is still open.'
    const detail = [
      `source=${evidence.source}`,
      `runtimeClosureRate=${runtimeClosureRate}`,
      `runtimeSessions=${runtimeSourcedSessionCount}/${evidence.comparedSessionCount}`,
      `allRuntimeSourcedSessions=${allRuntimeSourcedSessionCount}/${evidence.comparedSessionCount}`,
      `runtimeTurns=${runtimeTurnCount}`,
      `decisionTraceTurns=${decisionTraceTurnCount}`,
      `syntheticTurns=${syntheticTurnCount}`,
      `closedSessions=${evidence.closedSessionCount}/${evidence.comparedSessionCount}`,
      `sessionClosureRate=${evidence.sessionClosureRate}`,
    ].join(' | ')

    return {
      status,
      closed,
      source: evidence.source,
      sourceIsRuntime,
      sampledTurnCount: evidence.sampledTurnCount,
      comparedSessionCount: evidence.comparedSessionCount,
      closedSessionCount: evidence.closedSessionCount,
      sessionClosureRate: evidence.sessionClosureRate,
      runtimeClosureRate,
      runtimeSourcedSessionCount,
      allRuntimeSourcedSessionCount,
      syntheticTurnCount,
      decisionTraceTurnCount,
      runtimeTurnCount,
      headline,
      detail,
      nextRepairTarget,
    }
  })
  function memoryClosureLongRunDetail(longRun: NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['memoryClosureLongRun']>) {
    return [
      `status=${longRun.status}`,
      `turns=${longRun.turnCount}/${longRun.requiredTurnCount}`,
      `identity=${longRun.dominantMemoryIdentityKey ?? 'none'}`,
      `stableIdentity=${longRun.stableMemoryIdentity}`,
      `failures=${longRun.failureReasons.join(', ') || 'none'}`,
      `transitionBreaks=${longRun.transitionBreaks.join(', ') || 'none'}`,
    ].join(' | ')
  }

  function memoryClosureLongRunNextRepairTarget(longRun: NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['memoryClosureLongRun']>) {
    if (longRun.status === 'closed') {
      return 'Memory closure long-run proof is closed; keep sampling noisy desktop turns so causal identity drift is caught before it becomes relationship drift.'
    }
    if (longRun.failureReasons.includes('missing-causal-memory-identity')) {
      return 'Check downstream memoryClosureCausality memoryIdentity from emotion, initiative, execution, and embodiment lanes first.'
    }
    const firstTurnWithMissingLanes = longRun.turnDiagnostics.find(turn => turn.missingLanes.length > 0)
    if (firstTurnWithMissingLanes) {
      return `Close missing memory-closure lanes on ${firstTurnWithMissingLanes.turnId}: ${firstTurnWithMissingLanes.missingLanes.join(', ')}.`
    }
    if (longRun.transitionBreaks.length > 0) {
      return `Repair memory identity continuity across transition ${longRun.transitionBreaks[0]}.`
    }
    return 'Collect at least three chronological noisy desktop turns with downstream memory closure causality before treating the loop as closed.'
  }

  const benchmarkMemoryClosureLongRunSummary = computed<AlicizationMindReplayMemoryClosureLongRunSummary | null>(() => {
    const longRun = benchmarkReport.value?.datasetFeedback.memoryClosureLongRun ?? null
    if (!longRun)
      return null
    const closed = longRun.status === 'closed'
      && longRun.stableMemoryIdentity
      && longRun.failureReasons.length === 0
    return {
      status: longRun.status,
      closed,
      turnCount: longRun.turnCount,
      requiredTurnCount: longRun.requiredTurnCount,
      stableMemoryIdentity: longRun.stableMemoryIdentity,
      dominantMemoryIdentityKey: longRun.dominantMemoryIdentityKey,
      failureReasons: [...longRun.failureReasons],
      detail: memoryClosureLongRunDetail(longRun),
      nextRepairTarget: memoryClosureLongRunNextRepairTarget(longRun),
    }
  })
  const benchmarkMemoryClosureLongRunRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const longRun = benchmarkReport.value?.datasetFeedback.memoryClosureLongRun ?? null
    if (!longRun)
      return []
    return [
      {
        key: 'memory_closure_long_run_status',
        value: benchmarkMemoryClosureLongRunSummary.value?.closed ? 1 : 0,
        detail: memoryClosureLongRunDetail(longRun),
      },
      {
        key: 'memory_closure_long_run_identity',
        value: longRun.stableMemoryIdentity ? 1 : 0,
        detail: `dominant=${longRun.dominantMemoryIdentityKey ?? 'none'} | stable=${longRun.stableMemoryIdentity} | identityKeys=${longRun.dominantMemoryIdentityKeys.join(', ') || 'none'} | transitionBreaks=${longRun.transitionBreaks.join(', ') || 'none'}`,
      },
      ...longRun.turnDiagnostics.map(turn => ({
        key: `memory_closure_long_run_turn:${turn.turnId}`,
        value: turn.provedLanes.length,
        detail: `identity=${turn.memoryIdentityKey ?? 'none'} | proved=${turn.provedLanes.join('+') || 'none'} | missing=${turn.missingLanes.join('+') || 'none'}${turn.continuityDigest ? ` | ${turn.continuityDigest}` : ''}`,
      })),
    ]
  })

  function runtimeSamplingRepairTargetTurnId(sampleTurnId: string) {
    const parts = sampleTurnId
      .split('->')
      .map(part => part.trim())
      .filter(Boolean)
    return parts[parts.length - 1] ?? ''
  }

  function runtimeSamplingRepairTargetSessionId(sessionIds: string[], sampleTurnCount: number, sampleTurnIndex: number) {
    if (sessionIds.length === 0)
      return 'runtime-sampling'
    if (sessionIds.length === 1)
      return sessionIds[0]
    if (sessionIds.length === sampleTurnCount)
      return sessionIds[sampleTurnIndex] ?? sessionIds[0]
    return sessionIds.join(', ')
  }

  const benchmarkSameHerLaneGapRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.longRunSameHerSessionSummary ?? null
    const laneOrder = ['memory', 'initiativeOrExecution', 'emotion', 'embodiment'] as const
    const laneGaps = new Map<typeof laneOrder[number], {
      turnIds: string[]
      sessionIds: string[]
      reasons: string[]
    }>()
    for (const session of summary?.sessions ?? []) {
      for (const turn of session.turnDiagnostics) {
        for (const lane of turn.missingLanes) {
          const current = laneGaps.get(lane) ?? { turnIds: [], sessionIds: [], reasons: [] }
          if (!current.turnIds.includes(turn.turnId))
            current.turnIds.push(turn.turnId)
          if (!current.sessionIds.includes(session.sessionId))
            current.sessionIds.push(session.sessionId)
          for (const reason of turn.missingLaneReasons?.[lane] ?? []) {
            if (!current.reasons.includes(reason))
              current.reasons.push(reason)
          }
          laneGaps.set(lane, current)
        }
      }
    }
    for (const target of benchmarkReport.value?.datasetFeedback.runtimeSamplingEvidence?.repairTargets ?? []) {
      const sessionIds = target.affectedSessionIds
        .map(sessionId => sessionId.trim())
        .filter(Boolean)
      const turnSampleIds = target.sampleTurnIds
        .map(sampleTurnId => sampleTurnId.trim())
        .filter(sampleTurnId => sampleTurnId && !sampleTurnId.includes('->'))
      for (const [index, sampleTurnId] of turnSampleIds.entries()) {
        const turnId = runtimeSamplingRepairTargetTurnId(sampleTurnId)
        if (!turnId)
          continue
        const current = laneGaps.get(target.lane) ?? { turnIds: [], sessionIds: [], reasons: [] }
        const sessionId = runtimeSamplingRepairTargetSessionId(sessionIds, turnSampleIds.length, index)
        if (!current.turnIds.includes(turnId))
          current.turnIds.push(turnId)
        if (!current.sessionIds.includes(sessionId))
          current.sessionIds.push(sessionId)
        for (const reason of target.reasons) {
          if (!current.reasons.includes(reason))
            current.reasons.push(reason)
        }
        laneGaps.set(target.lane, current)
      }
    }
    return laneOrder.flatMap((lane) => {
      const gap = laneGaps.get(lane)
      if (!gap || gap.turnIds.length === 0)
        return []
      return [{
        key: `same_her_lane_gap:${lane}`,
        value: gap.turnIds.length,
        detail: `${lane} missing in ${gap.turnIds.length} turn(s) across ${gap.sessionIds.length} session(s): ${gap.sessionIds.join(', ')} | turns=${gap.turnIds.join(', ')}${gap.reasons.length > 0 ? ` | reasons=${lane}: ${gap.reasons.join('; ')}` : ''}`,
      }]
    })
  })
  const benchmarkSameHerTransitionRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.longRunSameHerSessionSummary ?? null
    const rows = [
      ...((summary?.sessions ?? []).flatMap(session =>
        session.transitionDiagnostics.map((transition) => {
          const hitCount = [
            transition.memoryInfluencedNext,
            transition.emotionInfluencedNext,
            transition.initiativeInfluencedNext,
            transition.embodimentInfluencedNext,
          ].filter(Boolean).length
          const reasonText = transition.missingInfluenceReasons
            ? Object.entries(transition.missingInfluenceReasons)
                .flatMap(([lane, reasons]) => {
                  if (!Array.isArray(reasons) || reasons.length === 0)
                    return []
                  return [`${lane}: ${reasons.join('; ')}`]
                })
                .join(' | ')
            : ''
          return {
            key: `same_her_transition:${session.sessionId}:${transition.fromTurnId}->${transition.toTurnId}`,
            value: pickRatio(hitCount, 4),
            detail: `memory=${transition.memoryInfluencedNext ? 'yes' : 'no'}, emotion=${transition.emotionInfluencedNext ? 'yes' : 'no'}, initiativeOrExecution=${transition.initiativeInfluencedNext ? 'yes' : 'no'}, embodiment=${transition.embodimentInfluencedNext ? 'yes' : 'no'} | missing=${transition.missingInfluences.join('+') || 'none'}${reasonText ? ` | reasons=${reasonText}` : ''}`,
          }
        }),
      )),
      ...((benchmarkReport.value?.datasetFeedback.runtimeSamplingEvidence?.repairTargets ?? []).flatMap((target) => {
        const sessionIds = target.affectedSessionIds
          .map(sessionId => sessionId.trim())
          .filter(Boolean)
        const transitionSampleIds = target.sampleTurnIds
          .map(sampleTurnId => sampleTurnId.trim())
          .filter(sampleTurnId => sampleTurnId.includes('->'))
        return transitionSampleIds.flatMap((sampleTurnId, index) => {
          const parts = sampleTurnId
            .split('->')
            .map(part => part.trim())
            .filter(Boolean)
          const fromTurnId = parts[0] ?? ''
          const toTurnId = parts[1] ?? ''
          if (!fromTurnId || !toTurnId)
            return []
          const sessionId = runtimeSamplingRepairTargetSessionId(sessionIds, transitionSampleIds.length, index)
          const reasonText = target.reasons.length > 0
            ? ` | reasons=${target.lane}: ${target.reasons.join('; ')}`
            : ''
          return [{
            key: `same_her_transition:${sessionId}:${fromTurnId}->${toTurnId}`,
            value: null,
            detail: `runtime-sampling repair target | missing=${target.lane}${reasonText}`,
          }]
        })
      })),
    ]
    const seen = new Set<string>()
    return rows.filter((row) => {
      if (seen.has(row.key))
        return false
      seen.add(row.key)
      return true
    })
  })
  const benchmarkSelfAuthorityRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.selfAuthoritySummary ?? null
    if (!summary)
      return []
    const comparedTurnCount = Math.max(0, summary.comparedTurnCount)
    const authoritySummaryRate = pickRatio(summary.authoritySummaryTurnCount, comparedTurnCount)
    const closenessPostureRate = pickRatio(summary.closenessPostureTurnCount, comparedTurnCount)
    const preservedRate = pickRatio(summary.preservedTurnCount, comparedTurnCount)
    const rewriteAppliedRate = pickRatio(summary.rewriteAppliedTurnCount, comparedTurnCount)
    const fullyCarriedRate = pickRatio(summary.fullyCarriedTurnCount, comparedTurnCount)
    const drifted = benchmarkReport.value?.datasetFeedback.driftSignals?.includes('selfAuthorityDrift') === true
    return [
      {
        key: 'self_authority_compared_turn_count',
        value: comparedTurnCount,
        detail: `${comparedTurnCount} replay turn(s) carried continuity self authority audit.`,
      },
      {
        key: 'self_authority_summary_rate',
        value: authoritySummaryRate,
        detail: `authoritySummary=${authoritySummaryRate ?? 'n/a'} (${summary.authoritySummaryTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'self_authority_closeness_posture_rate',
        value: closenessPostureRate,
        detail: `closenessPosture=${closenessPostureRate ?? 'n/a'} (${summary.closenessPostureTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'self_authority_preserved_rate',
        value: preservedRate,
        detail: `preservedIntoRewrite=${preservedRate ?? 'n/a'} (${summary.preservedTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'self_authority_rewrite_applied_rate',
        value: rewriteAppliedRate,
        detail: `rewriteClosureApplied=${rewriteAppliedRate ?? 'n/a'} (${summary.rewriteAppliedTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'self_authority_fully_carried_rate',
        value: fullyCarriedRate,
        detail: `${drifted ? 'drift=selfAuthorityDrift | ' : ''}fullyCarried=${fullyCarriedRate ?? 'n/a'} (${summary.fullyCarriedTurnCount}/${comparedTurnCount}) | checks whether the continuity self line stayed explicit, preserved, and rewrite-applied together.`,
      },
    ]
  })
  const benchmarkProjectStateAuditRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.projectStateAuditSummary ?? null
    if (!summary)
      return []
    const comparedTurnCount = Math.max(0, summary.comparedTurnCount)
    const sameHerSummaryRate = pickRatio(summary.sameHerSummaryTurnCount, comparedTurnCount)
    const landedProgressRate = pickRatio(summary.landedProgressTurnCount, comparedTurnCount)
    const openClosureRate = pickRatio(summary.openClosureTurnCount, comparedTurnCount)
    const preDialogueAwarenessRate = pickRatio(summary.preDialogueAwarenessTurnCount, comparedTurnCount)
    const continuitySummaryRate = pickRatio(summary.continuitySummaryTurnCount, comparedTurnCount)
    const sameHerHoldDetailCount = summary.sameHerHoldDetailTurnCount ?? 0
    const continuityArcStageCount = summary.continuityArcStageTurnCount ?? 0
    const continuityCueCount = summary.continuityCueTurnCount ?? 0
    const sameHerHoldDetailRate = pickRatio(sameHerHoldDetailCount, comparedTurnCount)
    const continuityArcStageRate = pickRatio(continuityArcStageCount, comparedTurnCount)
    const continuityCueRate = pickRatio(continuityCueCount, comparedTurnCount)
    const hasExplicitContinuityAnchors = summary.sameHerHoldDetailTurnCount != null
      || summary.continuityArcStageTurnCount != null
      || summary.continuityCueTurnCount != null
    const preservedRate = pickRatio(summary.preservedTurnCount, comparedTurnCount)
    const rewriteAppliedRate = pickRatio(summary.rewriteAppliedTurnCount, comparedTurnCount)
    const fullyCarriedRate = pickRatio(summary.fullyCarriedTurnCount, comparedTurnCount)
    const drifted = benchmarkReport.value?.datasetFeedback.driftSignals?.includes('projectStateAuditDrift') === true
    return [
      {
        key: 'project_state_audit_compared_turn_count',
        value: comparedTurnCount,
        detail: `${comparedTurnCount} replay turn(s) carried continuity project-state audit.`,
      },
      {
        key: 'project_state_audit_same_her_summary_rate',
        value: sameHerSummaryRate,
        detail: `sameHerSummary=${sameHerSummaryRate ?? 'n/a'} (${summary.sameHerSummaryTurnCount}/${comparedTurnCount}) | checks whether project-state answers stay inside one continuity continuity.`,
      },
      {
        key: 'project_state_audit_landed_progress_rate',
        value: landedProgressRate,
        detail: `landedProgress=${landedProgressRate ?? 'n/a'} (${summary.landedProgressTurnCount}/${comparedTurnCount}) | checks whether project-state answers still say what has already landed.`,
      },
      {
        key: 'project_state_audit_open_closure_rate',
        value: openClosureRate,
        detail: `openClosure=${openClosureRate ?? 'n/a'} (${summary.openClosureTurnCount}/${comparedTurnCount}) | checks whether project-state answers still keep the unfinished closure work explicit.`,
      },
      {
        key: 'project_state_audit_pre_dialogue_awareness_rate',
        value: preDialogueAwarenessRate,
        detail: `preDialogueAwareness=${preDialogueAwarenessRate ?? 'n/a'} (${summary.preDialogueAwarenessTurnCount}/${comparedTurnCount}) | checks whether the answer-side audit still carries the pre-dialogue project awareness line before local fluency takes over.`,
      },
      {
        key: 'project_state_audit_continuity_summary_rate',
        value: continuitySummaryRate,
        detail: `continuitySummary=${continuitySummaryRate ?? 'n/a'} (${summary.continuitySummaryTurnCount}/${comparedTurnCount}) | checks whether continuity line, landed progress, open closure, and the continuity drift boundary arrived together as one project continuity brief.`,
      },
      ...(hasExplicitContinuityAnchors
        ? [
          {
            key: 'project_state_audit_same_her_hold_detail_rate',
            value: sameHerHoldDetailRate,
            detail: `sameHerHoldDetail=${sameHerHoldDetailRate ?? 'n/a'} (${sameHerHoldDetailCount}/${comparedTurnCount}) | checks whether replay kept the concrete continuity hold detail instead of flattening her into generic continuity.`,
          },
          {
            key: 'project_state_audit_continuity_arc_stage_rate',
            value: continuityArcStageRate,
            detail: `continuityArcStage=${continuityArcStageRate ?? 'n/a'} (${continuityArcStageCount}/${comparedTurnCount}) | checks whether replay kept the active same-thread arc stage visible for long-horizon audit.`,
          },
          {
            key: 'project_state_audit_continuity_cue_rate',
            value: continuityCueRate,
            detail: `continuityCue=${continuityCueRate ?? 'n/a'} (${continuityCueCount}/${comparedTurnCount}) | checks whether replay kept the concrete continuity cue that tells the next turn how to stay with the continuity identity.`,
          },
        ] satisfies AlicizationMindReplayMetricRow[]
        : []),
      {
        key: 'project_state_audit_preserved_rate',
        value: preservedRate,
        detail: `preservedIntoRewrite=${preservedRate ?? 'n/a'} (${summary.preservedTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'project_state_audit_rewrite_applied_rate',
        value: rewriteAppliedRate,
        detail: `rewriteClosureApplied=${rewriteAppliedRate ?? 'n/a'} (${summary.rewriteAppliedTurnCount}/${comparedTurnCount})`,
      },
      {
        key: 'project_state_audit_fully_carried_rate',
        value: fullyCarriedRate,
        detail: `${drifted ? 'drift=projectStateAuditDrift | ' : ''}fullyCarried=${fullyCarriedRate ?? 'n/a'} (${summary.fullyCarriedTurnCount}/${comparedTurnCount}) | checks whether project identity, Phase 1 route, and still-open closure work stayed inside one current continuity.`,
      },
    ]
  })
  const benchmarkPreDialogueBriefingRows = computed<AlicizationMindReplayMetricRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.preDialogueBriefingSummary ?? null
    if (!summary)
      return []
    const comparedTurnCount = Math.max(0, summary.comparedTurnCount)
    const identityHitRate = pickRatio(summary.identityHitCount, comparedTurnCount)
    const phaseHitRate = pickRatio(summary.phaseHitCount, comparedTurnCount)
    const landedProgressHitRate = pickRatio(summary.landedProgressHitCount, comparedTurnCount)
    const openLoopHitRate = pickRatio(summary.openLoopHitCount, comparedTurnCount)
    const nextClosureHitRate = pickRatio(summary.nextClosureHitCount, comparedTurnCount)
    const emotionalClosureHitRate = pickRatio(summary.emotionalClosureHitCount, comparedTurnCount)
    const fullyBriefedRate = pickRatio(summary.fullyBriefedTurnCount, comparedTurnCount)
    const drifted = benchmarkReport.value?.datasetFeedback.driftSignals?.includes('preDialogueBriefingDrift') === true
    return [
      {
        key: 'pre_dialogue_briefing_compared_turn_count',
        value: comparedTurnCount,
        detail: `${comparedTurnCount} replay turn(s) carried pre-dialogue self briefing cues for project identity, Phase 1 route, landed progress, unresolved loops, and next closure.`,
      },
      {
        key: 'pre_dialogue_briefing_identity_hit_rate',
        value: identityHitRate,
        detail: `identity=${identityHitRate ?? 'n/a'} (${summary.identityHitCount}/${comparedTurnCount}) | checks whether the briefing still says what this project is.`,
      },
      {
        key: 'pre_dialogue_briefing_phase_hit_rate',
        value: phaseHitRate,
        detail: `phase=${phaseHitRate ?? 'n/a'} (${summary.phaseHitCount}/${comparedTurnCount}) | checks whether the briefing still carries the Phase 1 route.`,
      },
      {
        key: 'pre_dialogue_briefing_landed_progress_hit_rate',
        value: landedProgressHitRate,
        detail: `landed=${landedProgressHitRate ?? 'n/a'} (${summary.landedProgressHitCount}/${comparedTurnCount})`,
      },
      {
        key: 'pre_dialogue_briefing_open_loop_hit_rate',
        value: openLoopHitRate,
        detail: `openLoop=${openLoopHitRate ?? 'n/a'} (${summary.openLoopHitCount}/${comparedTurnCount}) | checks whether the briefing still names the unresolved life loop.`,
      },
      {
        key: 'pre_dialogue_briefing_next_closure_hit_rate',
        value: nextClosureHitRate,
        detail: `nextClosure=${nextClosureHitRate ?? 'n/a'} (${summary.nextClosureHitCount}/${comparedTurnCount})`,
      },
      {
        key: 'pre_dialogue_briefing_emotional_closure_hit_rate',
        value: emotionalClosureHitRate,
        detail: `emotionalClosure=${emotionalClosureHitRate ?? 'n/a'} (${summary.emotionalClosureHitCount}/${comparedTurnCount})`,
      },
      {
        key: 'pre_dialogue_briefing_fully_briefed_rate',
        value: fullyBriefedRate,
        detail: `${drifted ? 'drift=preDialogueBriefingDrift | ' : ''}fullyBriefed=${fullyBriefedRate ?? 'n/a'} (${summary.fullyBriefedTurnCount}/${comparedTurnCount}) | checks whether identity, phase, landed progress, open loop, and next closure still arrive as one stable self brief.`,
      },
    ]
  })

  function sameHerLaneGapFirstCheck(lane: AlicizationMindReplaySameHerRepairTargetRow['lane']) {
    if (lane === 'memory') {
      return 'Check memory retrieval and resolution first: verify recalled events, relationship continuity, and memory decision traces are carrying the continuity line before downstream initiative or embodiment tries to use it.'
    }
    if (lane === 'initiativeOrExecution') {
      return 'Check initiative and execution callback carry first: verify proactive cadence, execution feedback, and callback realization still continue the remembered continuity line instead of restarting as a detached task update.'
    }
    if (lane === 'emotion') {
      return 'Check emotional closure carry first: verify affective residue, emotional closure audit, and rewrite preservation still keep the remembered continuity line active before the next turn widens outward.'
    }
    return 'Check embodiment projection first: verify voice, facial state, lipsync, motion, and body continuity still derive from the same internal emotional/memory state rather than drifting into a detached performance layer.'
  }

  function runtimeSamplingNextRunEvidenceChecklistText(
    checklist: NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>['nextRunEvidenceChecklist']>,
  ) {
    return checklist
      .map((item) => {
        const sampleText = item.sampleTurnIds.length > 0
          ? `(samples=${item.sampleTurnIds.join(', ')})`
          : '(samples=none)'
        const requiredTraceEvidence = item.requiredTraceEvidence.length > 0
          ? `: ${item.requiredTraceEvidence.join('; ')}`
          : ''
        return `${item.lane}/${item.evidenceKind}${sampleText}${requiredTraceEvidence}`
      })
      .join(' | ')
  }

  function runtimeSamplingNextRunEvidenceChecklistActionText(
    item: NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>['nextRunEvidenceChecklist']>[number],
  ) {
    const sampleText = item.sampleTurnIds.length > 0
      ? item.sampleTurnIds.join(', ')
      : 'the next sampled turn'
    const requiredTraceEvidence = item.requiredTraceEvidence.length > 0
      ? `: ${item.requiredTraceEvidence.join('; ')}`
      : ''
    return `${item.lane}/${item.evidenceKind} evidence for ${sampleText}${requiredTraceEvidence}`
  }

  function benchmarkSameHerLaneGapTriageRows(repairTargetRows: AlicizationMindReplaySameHerRepairTargetRow[] = []): AlicizationMindReplayRegressionTriageRow[] {
    const laneOrder = ['memory', 'initiativeOrExecution', 'emotion', 'embodiment'] as const
    const missingLanes = new Set<typeof laneOrder[number]>()
    for (const row of benchmarkSameHerLaneGapRows.value) {
      const lane = laneOrder.find(candidate => row.key === `same_her_lane_gap:${candidate}`)
      if (lane)
        missingLanes.add(lane)
    }
    for (const row of repairTargetRows) {
      if (row.firstCheck === sameHerLaneGapFirstCheck(row.lane))
        missingLanes.add(row.lane)
    }
    return laneOrder
      .filter(lane => missingLanes.has(lane))
      .map(lane => ({
        dimension: `sameHerLaneGap:${lane}`,
        owner: lane === 'memory'
          ? 'memory retrieval'
          : 'runtime continuity',
        firstCheck: sameHerLaneGapFirstCheck(lane),
      }))
  }

  function sameHerTransitionGapFirstCheck(lane: AlicizationMindReplaySameHerRepairTargetRow['lane']) {
    if (lane === 'memory') {
      return 'Check memory transition carry first: verify recalled events, relationship continuity, and the next-turn handoff still keep the continuity memory line active before downstream initiative or embodiment tries to use it.'
    }
    if (lane === 'initiativeOrExecution') {
      return 'Check initiative and execution callback transition carry first: verify proactive cadence, execution feedback, callback realization, and the next-turn handoff still continue the remembered continuity line instead of restarting as a detached task update.'
    }
    if (lane === 'emotion') {
      return 'Check emotional transition carry first: verify affective residue, emotional closure audit, rewrite preservation, and the next-turn handoff still keep the remembered continuity line active before the next turn widens outward.'
    }
    return 'Check embodiment transition carry first: verify voice, facial state, lipsync, motion, body continuity, and the next-turn handoff still derive from the same internal emotional/memory state rather than drifting into a detached performance layer.'
  }

  function sameHerRepairTargetKey(row: AlicizationMindReplaySameHerRepairTargetRow) {
    return `${row.lane}:${row.turnId}`
  }

  function dedupeSameHerRepairTargetRows(rows: AlicizationMindReplaySameHerRepairTargetRow[]) {
    const seen = new Set<string>()
    return rows.filter((row) => {
      const key = sameHerRepairTargetKey(row)
      if (seen.has(key))
        return false
      seen.add(key)
      return true
    })
  }

  function benchmarkRuntimeSamplingRepairTargetRows(): AlicizationMindReplaySameHerRepairTargetRow[] {
    const evidence = benchmarkReport.value?.datasetFeedback.runtimeSamplingEvidence ?? null
    const repairTargets = evidence?.repairTargets ?? []
    const decisionTraceIdBySampleTurnId = new Map(
      (evidence?.tracePointers ?? [])
        .map(item => [
          item.sampleTurnId.trim(),
          item.tracePointer.decisionTraceId,
        ] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
    )
    return repairTargets.flatMap((target) => {
      const sampleTurnIds = target.sampleTurnIds
        .map(sampleTurnId => sampleTurnId.trim())
        .filter(Boolean)
      const sessionIds = target.affectedSessionIds
        .map(sessionId => sessionId.trim())
        .filter(Boolean)
      return sampleTurnIds.flatMap((sampleTurnId, index) => {
        const turnId = runtimeSamplingRepairTargetTurnId(sampleTurnId)
        if (!turnId)
          return []
        const isTransitionTarget = sampleTurnId.includes('->')
        return [{
          lane: target.lane,
          sessionId: runtimeSamplingRepairTargetSessionId(sessionIds, sampleTurnIds.length, index),
          turnId,
          ...(decisionTraceIdBySampleTurnId.get(sampleTurnId) ?? decisionTraceIdBySampleTurnId.get(turnId)
            ? { decisionTraceId: decisionTraceIdBySampleTurnId.get(sampleTurnId) ?? decisionTraceIdBySampleTurnId.get(turnId) }
            : {}),
          missingLanes: [target.lane],
          reasons: [...target.reasons],
          firstCheck: isTransitionTarget
            ? sameHerTransitionGapFirstCheck(target.lane)
            : sameHerLaneGapFirstCheck(target.lane),
        }]
      })
    })
  }

  function benchmarkSameHerTransitionGapTriageRows(repairTargetRows: AlicizationMindReplaySameHerRepairTargetRow[] = []): AlicizationMindReplayRegressionTriageRow[] {
    const summary = benchmarkReport.value?.datasetFeedback.longRunSameHerSessionSummary ?? null
    const laneOrder = ['memory', 'initiativeOrExecution', 'emotion', 'embodiment'] as const
    const missingLanes = new Set<typeof laneOrder[number]>()
    for (const session of summary?.sessions ?? []) {
      for (const transition of session.transitionDiagnostics) {
        for (const lane of transition.missingInfluences)
          missingLanes.add(lane)
      }
    }
    for (const row of repairTargetRows) {
      if (row.firstCheck === sameHerTransitionGapFirstCheck(row.lane))
        missingLanes.add(row.lane)
    }
    return laneOrder
      .filter(lane => missingLanes.has(lane))
      .map(lane => ({
        dimension: `sameHerTransitionGap:${lane}`,
        owner: lane === 'memory'
          ? 'memory retrieval'
          : 'runtime continuity',
        firstCheck: sameHerTransitionGapFirstCheck(lane),
      }))
  }

  const benchmarkSameHerRepairTargetRows = computed<AlicizationMindReplaySameHerRepairTargetRow[]>(() => {
    const summary = benchmarkReport.value?.datasetFeedback.longRunSameHerSessionSummary ?? null
    const sessionRepairTargetRows = summary?.sessions.flatMap((session) => {
      const decisionTraceIdByTurnId = new Map(
        session.turnDiagnostics.map(turn => [
          turn.turnId,
          turn.tracePointer?.decisionTraceId ?? null,
        ]),
      )
      return [
        ...session.turnDiagnostics.flatMap(turn =>
          turn.missingLanes.map(lane => ({
            lane,
            sessionId: session.sessionId,
            turnId: turn.turnId,
            ...(turn.tracePointer?.decisionTraceId ? { decisionTraceId: turn.tracePointer.decisionTraceId } : {}),
            missingLanes: [...turn.missingLanes],
            reasons: [...(turn.missingLaneReasons?.[lane] ?? [])],
            firstCheck: sameHerLaneGapFirstCheck(lane),
          })),
        ),
        ...session.transitionDiagnostics.flatMap(transition =>
          transition.missingInfluences.map((lane) => {
            const decisionTraceId = transition.tracePointer?.decisionTraceId
              ?? decisionTraceIdByTurnId.get(transition.toTurnId)
            return {
              lane,
              sessionId: session.sessionId,
              turnId: transition.toTurnId,
              ...(decisionTraceId ? { decisionTraceId } : {}),
              missingLanes: [...transition.missingInfluences],
              reasons: [...(transition.missingInfluenceReasons?.[lane] ?? [])],
              firstCheck: sameHerTransitionGapFirstCheck(lane),
            }
          }),
        ),
      ]
    }) ?? []
    return dedupeSameHerRepairTargetRows([
      ...sessionRepairTargetRows,
      ...benchmarkRuntimeSamplingRepairTargetRows(),
    ])
  })

  const benchmarkRegressionTriageRows = computed<AlicizationMindReplayRegressionTriageRow[]>(() => {
    const report = benchmarkReport.value
    if (Array.isArray((report as any)?.regressionTriage) && (report as any).regressionTriage.length > 0) {
      return [
        ...((report as any).regressionTriage as AlicizationMindReplayRegressionTriageRow[]),
        ...benchmarkSameHerLaneGapTriageRows(benchmarkSameHerRepairTargetRows.value),
        ...benchmarkSameHerTransitionGapTriageRows(benchmarkSameHerRepairTargetRows.value),
      ]
    }
    const failing = report?.gate.failingKeys ?? []
    const failingRows = failing.map((dimension) => {
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
      else if ([
        'preDialogueBriefingDrift',
        'projectStateAuditDrift',
      ].includes(dimension)) {
        owner = 'runtime continuity'
        firstCheck = 'Check the pre-dialogue project-awareness chain first: verify project identity, Phase 1 route, landed progress, open loop, next closure, and the continuity drift boundary are still being carried before visible reply shaping begins.'
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
    return [
      ...failingRows,
      ...benchmarkSameHerLaneGapTriageRows(benchmarkSameHerRepairTargetRows.value),
      ...benchmarkSameHerTransitionGapTriageRows(benchmarkSameHerRepairTargetRows.value),
    ]
  })
  const memoryHealthComparisonRows = computed<AlicizationMindReplayMemoryHealthComparisonRow[]>(() => {
    const before = benchmarkStatsBefore.value?.retrievalHealth
    const after = benchmarkStatsAfter.value?.retrievalHealth
    const patch = benchmarkReport.value?.telemetryPatch.retrievalHealth as Record<string, unknown> | undefined
    const beforePresence = readPresenceQuality(benchmarkStatsBefore.value)
    const afterPresence = readPresenceQuality(benchmarkStatsAfter.value)
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
      {
        key: 'quietCompanionshipCoverage',
        before: pickNumber(beforePresence?.quietCompanionshipCoverage),
        after: pickNumber(afterPresence?.quietCompanionshipCoverage),
        patch: pickNumber(patch?.quietCompanionshipCoverage),
        section: 'presence-quality',
      },
      {
        key: 'silentPresenceNuisanceRate',
        before: pickNumber(beforePresence?.silentPresenceNuisanceRate),
        after: pickNumber(afterPresence?.silentPresenceNuisanceRate),
        patch: pickNumber(patch?.silentPresenceNuisanceRate),
        section: 'presence-quality',
      },
      {
        key: 'continuityMindCarryRate',
        before: pickNumber(beforePresence?.continuityMindCarryRate),
        after: pickNumber(afterPresence?.continuityMindCarryRate),
        patch: pickNumber(patch?.continuityMindCarryRate),
        section: 'presence-quality',
      },
    ]
  })
  const benchmarkPresenceQualityRows = computed(() =>
    memoryHealthComparisonRows.value.filter(row => row.section === 'presence-quality'),
  )

  async function queryReplayLab(payload: AlicizationListMindTurnEventsPayload | AlicizationListMemoryDecisionTracesPayload) {
    const query = normalizeReplayQuery(payload)
    lastQuery.value = query
    if (!query.decisionTraceId && !query.turnId && (!('activeSelfEvolutionCandidateId' in query) || !query.activeSelfEvolutionCandidateId)) {
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

  async function runSameHerSessionProof() {
    return await runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      persistTelemetry: true,
      sampleLimit: selectedBenchmarkSampleLimit.value,
    })
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
    const requestedTurnId = turnIdRaw?.trim() || null
    const turn = requestedTurnId
      ? benchmarkFailingTurns.value.find(item => item.turnId === requestedTurnId) ?? null
      : null
    const repairTarget = requestedTurnId
      ? benchmarkSameHerRepairTargetRows.value.find(item => item.turnId === requestedTurnId) ?? null
      : null
    const repairTargetTurnId = repairTarget?.turnId ?? null
    if (turn) {
      selectedDiagnosisTurnId.value = turn.turnId
      if (turn.decisionTraceId)
        return await queryReplayLab({ decisionTraceId: turn.decisionTraceId, limit: defaultQueryLimit })
      return await queryReplayLab({ turnId: turn.turnId, limit: defaultQueryLimit })
    }
    if (repairTargetTurnId) {
      selectedDiagnosisTurnId.value = repairTargetTurnId
      if (repairTarget?.decisionTraceId)
        return await queryReplayLab({ decisionTraceId: repairTarget.decisionTraceId, limit: defaultQueryLimit })
      return await queryReplayLab({ turnId: repairTargetTurnId, limit: defaultQueryLimit })
    }
    const selectedTurn = selectedBenchmarkTurn.value
    if (!selectedTurn) {
      return {
        events: [],
        traceRecords: [],
      }
    }
    selectedDiagnosisTurnId.value = selectedTurn.turnId
    if (selectedTurn.decisionTraceId)
      return await queryReplayLab({ decisionTraceId: selectedTurn.decisionTraceId, limit: defaultQueryLimit })
    return await queryReplayLab({ turnId: selectedTurn.turnId, limit: defaultQueryLimit })
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
    benchmarkPresenceQualityRows,
    benchmarkParityRows,
    benchmarkProjectStateRows,
    benchmarkEmotionalClosureRows,
    benchmarkSameHerSessionRows,
    benchmarkRuntimeSamplingEvidenceRows,
    benchmarkRuntimeSameHerProofSummary,
    benchmarkMemoryClosureLongRunSummary,
    benchmarkMemoryClosureLongRunRows,
    benchmarkSameHerLaneGapRows,
    benchmarkSameHerTransitionRows,
    benchmarkSameHerRepairTargetRows,
    benchmarkSelfAuthorityRows,
    benchmarkProjectStateAuditRows,
    benchmarkPreDialogueBriefingRows,
    benchmarkRegressionTriageRows,
    memoryHealthComparisonRows,
    replayCoverage,
    replaySummary,
    queryReplayLab,
    queryMindTurnEvents,
    queryMemoryDecisionTraces,
    runReplayBenchmark,
    runSameHerSessionProof,
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
