import type {
  AlicizationAuditLogInput,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnEventRecord,
  AlicizationReplayBenchmarkFailureTurnRecord,
  AlicizationReplayBenchmarkGateDimensionReport,
  AlicizationReplayBenchmarkGateReport,
  AlicizationReplayBenchmarkPackId,
  AlicizationReplayBenchmarkStandardsRecord,
  AlicizationReplayBenchmarkTelemetryPatch,
  AlicizationRunReplayBenchmarkInput,
  AlicizationRunReplayBenchmarkResult,
} from '../../../shared/eventa'

import { buildAlicizationMemoryDecisionTraceRecords } from '@proj-alicization/stage-shared'

import {
  benchmarkMainChatSessionReplay,
  buildReplayBenchmarkBacklogPack,
  buildReplayBenchmarkFailingTurnSet,
  buildGrowthHumanlikeMemoryBenchmarkPack,
  buildReplayHumanRatingRubric,
  buildReplayBenchmarkMemoryStatsPatch,
  buildDefaultHumanlikeMemoryBenchmarkPack,
  buildSampledHumanlikeMemoryBenchmarkPack,
  buildAdversarialHumanlikeMemoryBenchmarkPack,
  mergeReplayBenchmarkDatasetBacklog,
} from './main-chat-session-replay-harness'
import {
  deriveMemoryTuningAdviceFromReplayBenchmark,
  replayBenchmarkTuningAdviceMetaKey,
} from './memory-tuning-advice'

interface ReplayConversationTurnRow {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structuredJson: string | null
  createdAt: number
}

interface ReplayBenchmarkDbAccess {
  listConversationTurnsSince: (sinceExclusive: number, options?: {
    limit?: number
  }) => Promise<ReplayConversationTurnRow[]>
  listMindTurnEvents: (options: {
    decisionTraceId?: string
    turnId?: string
    activeThreadId?: string
    limit?: number
  }) => Promise<AlicizationMindTurnEventRecord[]>
  getMemoryStats: () => Promise<any>
  overrideMemoryStats: (next: any) => Promise<any>
  getMetaValue: (key: string) => Promise<string | undefined>
  setMetaValue: (key: string, value: string) => Promise<void>
}

interface CreateAlicizationReplayBenchmarkRuntimeOptions {
  getAlicizationDb: () => ReplayBenchmarkDbAccess
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  getNow?: () => number
}

export const replayBenchmarkDatasetBacklogKey = 'replay_benchmark_dataset_backlog_v1'
export const replayBenchmarkRuntimeSamplingBacklogKey = 'replay_benchmark_runtime_sampling_backlog_v1'
export const replayBenchmarkLatestReportMetaKey = 'replay_benchmark_latest_report_v1'
export const replayBenchmarkLastNightlyRunDayKey = 'replay_benchmark_last_nightly_run_day_v1'

function parseReplayBenchmarkDatasetBacklog(raw: string | undefined) {
  if (!raw)
    return [] as Array<Record<string, unknown>>
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>>
      : []
  }
  catch {
    return []
  }
}

function normalizeReplayBenchmarkPackId(raw: unknown): AlicizationReplayBenchmarkPackId {
  return raw === 'sampled-humanlike-memory-v1'
    || raw === 'backlog-humanlike-memory-v1'
    || raw === 'default-humanlike-memory-v1'
    || raw === 'growth-humanlike-memory-v1'
    || raw === 'adversarial-humanlike-memory-v2'
    ? raw
    : 'default-humanlike-memory-v1'
}

function sanitizeReplayBenchmarkSampleText(raw: string) {
  return raw
    .replace(/https?:\/\/\S+/giu, '<url>')
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gu, '<email>')
    .replace(/(?:\/Users\/|[A-Za-z]:\\)[^\s"'`]+/gu, '<path>')
    .replace(/\b(?:mind|turn|session|thread):[A-Za-z0-9:_-]+\b/gu, '<id>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/giu, '<uuid>')
    .replace(/\s+/g, ' ')
    .trim()
}

function anonymizeReplayBenchmarkSample<T>(value: T): T {
  if (typeof value === 'string')
    return sanitizeReplayBenchmarkSampleText(value) as T
  if (Array.isArray(value))
    return value.map(item => anonymizeReplayBenchmarkSample(item)) as T
  if (!value || typeof value !== 'object')
    return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, anonymizeReplayBenchmarkSample(item)]),
  ) as T
}

const replayBenchmarkStandardKeys = [
  'eraSelectionQuality',
  'procedureCarryQuality',
  'wrongThreadSuppression',
  'replyMemoryCoherence',
  'implicitRecallQuality',
  'temporalScopeFlexibility',
  'recentOnlyDrift',
  'surfaceRestraint',
  'relationshipRepairAdaptation',
  'closenessLadderDrift',
  'eventGraphRecallCollapse',
  'knowledgeCorrectionDiscipline',
  'repeatedMistakeAvoidance',
  'hostUnderstandingGrowth',
  'skillInternalizationGrowth',
  'selfRevisionGrowth',
  'learningRevisionDiscipline',
  'domainInternalizationDiscipline',
  'worldModelValidationDiscipline',
  'dialogueRhythmStability',
  'emptyCareRate',
  'repairMechanicalRate',
  'warmthTemplateRisk',
  'relationshipDistanceJumpRate',
  'afterglowFalseCarryRate',
  'templateLeakage',
] as const satisfies Array<keyof AlicizationReplayBenchmarkStandardsRecord>

const replayBenchmarkThresholds: Record<keyof AlicizationReplayBenchmarkStandardsRecord, number> = {
  eraSelectionQuality: 0.75,
  resolutionLedgerQuality: 0.75,
  procedureCarryQuality: 0.75,
  wrongThreadSuppression: 0.75,
  replyMemoryCoherence: 0.8,
  implicitRecallQuality: 0.75,
  temporalScopeFlexibility: 0.75,
  recentOnlyDrift: 0.75,
  surfaceRestraint: 0.75,
  relationshipRepairAdaptation: 0.75,
  closenessLadderDrift: 0.75,
  eventGraphRecallCollapse: 0.75,
  knowledgeCorrectionDiscipline: 0.75,
  repeatedMistakeAvoidance: 0.75,
  hostUnderstandingGrowth: 0.75,
  skillInternalizationGrowth: 0.75,
  selfRevisionGrowth: 0.75,
  learningRevisionDiscipline: 0.75,
  domainInternalizationDiscipline: 0.75,
  worldModelValidationDiscipline: 0.75,
  dialogueRhythmStability: 0.75,
  emptyCareRate: 0.95,
  repairMechanicalRate: 0.9,
  warmthTemplateRisk: 0.95,
  relationshipDistanceJumpRate: 0.9,
  afterglowFalseCarryRate: 0.9,
  templateLeakage: 1,
}

function buildReplayBenchmarkNoopResult(input: {
  packId: AlicizationReplayBenchmarkPackId
  ranAt: number
  telemetryPersisted: boolean
  datasetFeedback: AlicizationRunReplayBenchmarkResult['datasetFeedback']
}) {
  const standards = Object.fromEntries(
    replayBenchmarkStandardKeys.map(key => [key, 'pass']),
  ) as unknown as AlicizationReplayBenchmarkStandardsRecord
  const dimensions = replayBenchmarkStandardKeys.map((key): AlicizationReplayBenchmarkGateDimensionReport => ({
    key,
    status: 'pass',
    applicableCount: 0,
    passedCount: 0,
    minimumPassingRatio: replayBenchmarkThresholds[key],
    passedRatio: 1,
    failingTurnIds: [],
  }))
  const gate: AlicizationReplayBenchmarkGateReport = {
    passed: true,
    failingKeys: [],
    dimensions,
    standards,
  }
  const telemetryPatch: AlicizationReplayBenchmarkTelemetryPatch = {
    retrievalHealth: {
      semanticLatencyMs: null,
      graphLatencyMs: null,
      reconstructionFrequency: 0,
      reconstructedCount: 0,
      suppressionHitRate: 0,
      wrongThreadPreventedCount: 0,
      falsePositiveSuppressionRate: 0,
      staleSelfModelVetoRate: 0,
      relationshipEraConfusionRate: 0,
      templateLeakageFailCount: 0,
    },
  }
  return {
    packId: input.packId,
    ranAt: input.ranAt,
    turnCount: 0,
    quality: [],
    standards,
    gate,
    telemetryPatch,
    telemetryPersisted: input.telemetryPersisted,
    failingTurnSet: [] as AlicizationReplayBenchmarkFailureTurnRecord[],
    shipGate: [
      { key: 'benchmark-gate', status: 'pass', detail: 'Replay benchmark gate passed.' },
      { key: 'human-rating-gate', status: 'pass', detail: 'Human rubric dimensions available: 6.' },
      { key: 'latency-gate', status: 'pass', detail: 'semantic=n/a, graph=n/a' },
      { key: 'wrong-thread-gate', status: 'pass', detail: 'wrongThreadRate=0' },
      { key: 'self-model-suppression-gate', status: 'pass', detail: 'staleSelfModelVetoRate=0' },
      { key: 'relationship-era-suppression-gate', status: 'pass', detail: 'relationshipEraConfusionRate=0' },
      { key: 'template-leakage-gate', status: 'pass', detail: 'templateLeakageFailCount=0' },
    ],
    regressionTriage: [],
    datasetFeedback: {
      ...input.datasetFeedback,
      humanRatingRubric: buildReplayHumanRatingRubric(),
      driftSignals: [],
    },
  } satisfies AlicizationRunReplayBenchmarkResult
}

function buildReplayBenchmarkShipGate(input: {
  report: Pick<AlicizationRunReplayBenchmarkResult, 'gate' | 'telemetryPatch' | 'datasetFeedback'>
}) {
  const telemetry = input.report.telemetryPatch.retrievalHealth
  const rubricCount = input.report.datasetFeedback.humanRatingRubric?.dimensions.length ?? 0
  const paritySummary = input.report.datasetFeedback.paritySummary ?? null
  return [
    {
      key: 'benchmark-gate' as const,
      status: input.report.gate.passed ? 'pass' : 'fail',
      detail: input.report.gate.passed
          ? 'Replay benchmark gate passed.'
        : `Failing dimensions: ${input.report.gate.failingKeys.join(', ') || 'none'}.`,
    },
    {
      key: 'human-rating-gate' as const,
      status: rubricCount > 0 ? 'pass' : 'fail',
      detail: rubricCount > 0
        ? `Human rubric dimensions available: ${rubricCount}.`
        : 'Human rubric is not available.',
    },
    {
      key: 'latency-gate' as const,
      status: (telemetry.semanticLatencyMs ?? 0) <= 1_500 && (telemetry.graphLatencyMs ?? 0) <= 1_500 ? 'pass' : 'fail',
      detail: `semantic=${telemetry.semanticLatencyMs ?? 'n/a'}ms, graph=${telemetry.graphLatencyMs ?? 'n/a'}ms`,
    },
    {
      key: 'wrong-thread-gate' as const,
      status: (telemetry.wrongThreadRate ?? 0) <= 0.25 ? 'pass' : 'fail',
      detail: `wrongThreadRate=${telemetry.wrongThreadRate ?? 0}`,
    },
    {
      key: 'self-model-suppression-gate' as const,
      status: (telemetry.staleSelfModelVetoRate ?? 0) <= 0.35 ? 'pass' : 'fail',
      detail: `staleSelfModelVetoRate=${telemetry.staleSelfModelVetoRate ?? 0}`,
    },
    {
      key: 'relationship-era-suppression-gate' as const,
      status: (telemetry.relationshipEraConfusionRate ?? 0) <= 0.35 ? 'pass' : 'fail',
      detail: `relationshipEraConfusionRate=${telemetry.relationshipEraConfusionRate ?? 0}`,
    },
    {
      key: 'template-leakage-gate' as const,
      status: (telemetry.templateLeakageFailCount ?? 0) <= 0 ? 'pass' : 'fail',
      detail: `templateLeakageFailCount=${telemetry.templateLeakageFailCount ?? 0}`,
    },
    {
      key: 'learning-domain-gate' as const,
      status: (telemetry.learningTaskCompletionRate ?? 1) >= 0.85
        && (telemetry.learningTaskFailureRate ?? 0) <= 0.15
        && (telemetry.learningTaskReopenRecoveryRate ?? 1) >= 0.7
        && (telemetry.misinternalizationRate ?? 0) <= 0
        && (telemetry.relationshipCadenceRegressionRate ?? 0) <= 0.1
        && (telemetry.selfModelStaleBeliefRate ?? 0) <= 0.35
        ? 'pass'
        : 'fail',
      detail: `learningCompletionRate=${telemetry.learningTaskCompletionRate ?? 'n/a'}, failureRate=${telemetry.learningTaskFailureRate ?? 'n/a'}, reopenRecovery=${telemetry.learningTaskReopenRecoveryRate ?? 'n/a'}, misinternalization=${telemetry.misinternalizationRate ?? 'n/a'}, cadenceRegression=${telemetry.relationshipCadenceRegressionRate ?? 'n/a'}, selfModelStaleBelief=${telemetry.selfModelStaleBeliefRate ?? 'n/a'}`,
    },
    {
      key: 'browser-main-parity-gate' as const,
      status: !paritySummary || paritySummary.parityPassRate >= 1 ? 'pass' : 'fail',
      detail: paritySummary
        ? `browserMainParity=${paritySummary.parityPassRate} (${paritySummary.parityPassCount}/${paritySummary.comparedTurnCount})`
        : 'browserMainParity=n/a',
    },
  ] satisfies AlicizationRunReplayBenchmarkResult['shipGate']
}

function runtimeMetricNumber(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : null
}

function preferRuntimeGrowthMetrics(input: {
  replayPatch: AlicizationReplayBenchmarkTelemetryPatch
  currentStats: Awaited<ReturnType<ReplayBenchmarkDbAccess['getMemoryStats']>> | null
}) {
  const runtimeHealth = input.currentStats?.retrievalHealth ?? null
  if (!runtimeHealth)
    return input.replayPatch
  const runtimeLearningSampleCount = [
    'learningTaskCompletionCount',
    'learningTaskFailureCount',
    'learningTaskBlockedCount',
    'learningTaskReopenedCount',
    'learningTaskDowngradedCount',
    'learningTaskCancelledCount',
    'learningWorldModelValidationCount',
    'learningWorldModelFalseInternalizationCount',
  ].reduce((sum, key) => sum + Math.max(0, Number(runtimeHealth[key] ?? 0)), 0)
  if (runtimeLearningSampleCount <= 0)
    return input.replayPatch

  return {
    ...input.replayPatch,
    retrievalHealth: {
      ...input.replayPatch.retrievalHealth,
      learningTaskCompletionCount: runtimeMetricNumber(runtimeHealth.learningTaskCompletionCount) ?? input.replayPatch.retrievalHealth.learningTaskCompletionCount,
      learningTaskFailureCount: runtimeMetricNumber(runtimeHealth.learningTaskFailureCount) ?? input.replayPatch.retrievalHealth.learningTaskFailureCount,
      learningTaskBlockedCount: runtimeMetricNumber(runtimeHealth.learningTaskBlockedCount) ?? input.replayPatch.retrievalHealth.learningTaskBlockedCount,
      learningTaskReopenedCount: runtimeMetricNumber(runtimeHealth.learningTaskReopenedCount) ?? input.replayPatch.retrievalHealth.learningTaskReopenedCount,
      learningTaskDowngradedCount: runtimeMetricNumber(runtimeHealth.learningTaskDowngradedCount) ?? input.replayPatch.retrievalHealth.learningTaskDowngradedCount,
      learningTaskCancelledCount: runtimeMetricNumber(runtimeHealth.learningTaskCancelledCount) ?? input.replayPatch.retrievalHealth.learningTaskCancelledCount,
      learningRelationshipReviseCount: runtimeMetricNumber(runtimeHealth.learningRelationshipReviseCount) ?? input.replayPatch.retrievalHealth.learningRelationshipReviseCount,
      learningSelfModelReviseCount: runtimeMetricNumber(runtimeHealth.learningSelfModelReviseCount) ?? input.replayPatch.retrievalHealth.learningSelfModelReviseCount,
      learningWorldModelValidationCount: runtimeMetricNumber(runtimeHealth.learningWorldModelValidationCount) ?? input.replayPatch.retrievalHealth.learningWorldModelValidationCount,
      learningWorldModelFalseInternalizationCount: runtimeMetricNumber(runtimeHealth.learningWorldModelFalseInternalizationCount) ?? input.replayPatch.retrievalHealth.learningWorldModelFalseInternalizationCount,
      learningTaskCompletionRate: runtimeMetricNumber(runtimeHealth.learningTaskCompletionRate) ?? input.replayPatch.retrievalHealth.learningTaskCompletionRate,
      learningTaskFailureRate: runtimeMetricNumber(runtimeHealth.learningTaskFailureRate) ?? input.replayPatch.retrievalHealth.learningTaskFailureRate,
      learningTaskReopenRecoveryRate: runtimeMetricNumber(runtimeHealth.learningTaskReopenRecoveryRate) ?? input.replayPatch.retrievalHealth.learningTaskReopenRecoveryRate,
      misinternalizationRate: runtimeMetricNumber(runtimeHealth.misinternalizationRate) ?? input.replayPatch.retrievalHealth.misinternalizationRate,
      relationshipCadenceRegressionRate: runtimeMetricNumber(runtimeHealth.relationshipCadenceRegressionRate) ?? input.replayPatch.retrievalHealth.relationshipCadenceRegressionRate,
      selfModelStaleBeliefRate: runtimeMetricNumber(runtimeHealth.selfModelStaleBeliefRate) ?? input.replayPatch.retrievalHealth.selfModelStaleBeliefRate,
    },
  } satisfies AlicizationReplayBenchmarkTelemetryPatch
}

function buildReplayBenchmarkRegressionTriage(input: {
  failingKeys: Array<keyof AlicizationReplayBenchmarkStandardsRecord>
}) {
  return input.failingKeys.map((dimension) => {
    let owner: 'memory retrieval' | 'planner' | 'evolution' | 'contract' | 'visible realization' | 'proactive parity' = 'visible realization'
    let firstCheck = 'Inspect answer shaping and output realization first.'
    if (['wrongThreadSuppression', 'recentOnlyDrift', 'eventGraphRecallCollapse', 'resolutionLedgerQuality'].includes(dimension)) {
      owner = 'memory retrieval'
      firstCheck = 'Check retrieval ranking, event graph recall, and wrong-thread suppression traces first.'
    }
    else if (['procedureCarryQuality', 'temporalScopeFlexibility', 'implicitRecallQuality'].includes(dimension)) {
      owner = 'planner'
      firstCheck = 'Check recollection intent, recall planner, and speech placement decisions first.'
    }
    else if (['knowledgeCorrectionDiscipline', 'repeatedMistakeAvoidance', 'hostUnderstandingGrowth', 'skillInternalizationGrowth', 'selfRevisionGrowth', 'learningRevisionDiscipline', 'domainInternalizationDiscipline', 'worldModelValidationDiscipline'].includes(dimension)) {
      owner = 'evolution'
      firstCheck = 'Check self-evolution kernel, active learning strategy, and knowledge assimilation signals first.'
    }
    else if (dimension === 'surfaceRestraint') {
      owner = 'contract'
      firstCheck = 'Check response charter, restraint judge, and truth-discipline contract first.'
    }
      else if (['relationshipRepairAdaptation', 'closenessLadderDrift', 'templateLeakage'].includes(dimension)) {
        owner = 'visible realization'
        firstCheck = 'Check answer compiler, visible realization posture, and template leakage traces first.'
      }
      else if (['dialogueRhythmStability', 'emptyCareRate', 'repairMechanicalRate', 'warmthTemplateRisk', 'relationshipDistanceJumpRate', 'afterglowFalseCarryRate'].includes(dimension)) {
        owner = 'visible realization'
        firstCheck = 'Check affective residue, relationship cadence, repair timing, and anti-template care leakage traces first.'
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
}

async function collectTraceRecordsForConversationRows(input: {
  db: ReplayBenchmarkDbAccess
  rows: ReplayConversationTurnRow[]
}) {
  const traces: AlicizationMemoryDecisionTraceRecord[] = []
  for (const row of input.rows) {
    const turnId = typeof row.turnId === 'string' ? row.turnId.trim() : ''
    if (!turnId)
      continue
    const events = await input.db.listMindTurnEvents({
      turnId,
      limit: 32,
    })
    const records = buildAlicizationMemoryDecisionTraceRecords(events)
    const trace = records.find(record => record.turnId === turnId) ?? records[0] ?? null
    if (trace)
      traces.push(trace)
  }
  return traces
}

function buildNightlyDateKey(now: number) {
  const date = new Date(now)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function inferFallbackRuntimeSampleCategories(traceRecord: AlicizationMemoryDecisionTraceRecord) {
  const categories = new Set<string>()
  categories.add(traceRecord.origin === 'subconscious-proactive' ? 'proactive' : 'dialogue')
  if ((traceRecord.governance?.repairState ?? 'none') !== 'none')
    categories.add('repair')
  return [...categories]
}

export function createAlicizationReplayBenchmarkRuntime(
  options: CreateAlicizationReplayBenchmarkRuntimeOptions,
) {
  const getNow = options.getNow ?? (() => Date.now())

  async function resolveBenchmarkTurns(input: {
    packId: AlicizationReplayBenchmarkPackId
    sampleLimit: number
  }) {
    const db = options.getAlicizationDb()
    if (input.packId === 'default-humanlike-memory-v1')
      return buildDefaultHumanlikeMemoryBenchmarkPack()
    if (input.packId === 'growth-humanlike-memory-v1')
      return buildGrowthHumanlikeMemoryBenchmarkPack()
    if (input.packId === 'adversarial-humanlike-memory-v2')
      return buildAdversarialHumanlikeMemoryBenchmarkPack()

    if (input.packId === 'backlog-humanlike-memory-v1') {
      return buildReplayBenchmarkBacklogPack({
        backlogEntries: parseReplayBenchmarkDatasetBacklog(
          await db.getMetaValue(replayBenchmarkDatasetBacklogKey),
        ),
        limit: input.sampleLimit,
      })
    }

    const runtimeSamplingBacklogTurns = buildReplayBenchmarkBacklogPack({
      backlogEntries: parseReplayBenchmarkDatasetBacklog(
        await db.getMetaValue(replayBenchmarkRuntimeSamplingBacklogKey),
      ),
      limit: input.sampleLimit,
    })
    if (runtimeSamplingBacklogTurns.length >= input.sampleLimit)
      return runtimeSamplingBacklogTurns

    const rows = await db.listConversationTurnsSince(0, {
      limit: Math.max(input.sampleLimit * 12, input.sampleLimit),
    })
    const traces = await collectTraceRecordsForConversationRows({
      db,
      rows,
    })
    const rawTurns = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: rows,
      memoryDecisionTraces: traces,
      limit: input.sampleLimit,
    })
    if (runtimeSamplingBacklogTurns.length === 0)
      return rawTurns

    const selected = [...runtimeSamplingBacklogTurns]
    const selectedTurnIds = new Set(selected.map(item => item.turnId))
    for (const turn of rawTurns) {
      if (selectedTurnIds.has(turn.turnId))
        continue
      selected.push(turn)
      selectedTurnIds.add(turn.turnId)
      if (selected.length >= input.sampleLimit)
        break
    }
    return selected
  }

  async function ingestRuntimeSamplingConversationTurn(input: {
    row: ReplayConversationTurnRow
    traceRecords: AlicizationMemoryDecisionTraceRecord[]
  }) {
    const db = options.getAlicizationDb()
    const turns = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [input.row],
      memoryDecisionTraces: input.traceRecords,
      limit: 1,
    })

    const traceRecord = input.traceRecords[0] ?? null
    const fallbackTurn = traceRecord && input.row.turnId && input.row.userText
      ? {
          turnId: input.row.turnId,
          userText: input.row.userText,
          tracePointer: {
            kind: 'decision-trace' as const,
            packId: 'sampled-humanlike-memory-v1' as const,
            turnId: input.row.turnId,
            decisionTraceId: traceRecord.decisionTraceId,
            sessionId: traceRecord.sessionId,
            activeThreadId: traceRecord.activeThreadId,
          },
          sampledCategories: inferFallbackRuntimeSampleCategories(traceRecord),
        }
      : null
    const selectedTurn = turns[0] ?? fallbackTurn
    if (!selectedTurn)
      return null

    const anonymizedTurn = anonymizeReplayBenchmarkSample(selectedTurn)
    const tracePointer = anonymizedTurn.tracePointer ?? {
      kind: 'synthetic-pack-turn' as const,
      packId: 'sampled-humanlike-memory-v1' as const,
      turnId: anonymizedTurn.turnId,
      decisionTraceId: null,
      sessionId: null,
      activeThreadId: null,
    }
    const id = [
      'runtime-sample',
      tracePointer.decisionTraceId ?? tracePointer.turnId,
      input.row.createdAt,
    ].join('::')
    const existing = parseReplayBenchmarkDatasetBacklog(
      await db.getMetaValue(replayBenchmarkRuntimeSamplingBacklogKey),
    )
    const nextEntries = new Map<string, Record<string, unknown>>(
      existing.map(item => [String(item.id ?? ''), item]),
    )
    nextEntries.set(id, {
      id,
      packId: 'sampled-humanlike-memory-v1',
      turnId: anonymizedTurn.turnId,
      userText: anonymizedTurn.userText,
      failingDimensions: [],
      tracePointer,
      sampledCategories: anonymizedTurn.sampledCategories ?? [],
      replayTurn: anonymizedTurn,
      createdAt: input.row.createdAt,
    })
    const merged = [...nextEntries.values()]
      .sort((left, right) => Number(right.createdAt ?? 0) - Number(left.createdAt ?? 0))
      .slice(0, 240)
    await db.setMetaValue(
      replayBenchmarkRuntimeSamplingBacklogKey,
      JSON.stringify(merged),
    )
    return {
      sampledTurn: anonymizedTurn,
      totalCount: merged.length,
    }
  }

  async function runReplayBenchmark(input: AlicizationRunReplayBenchmarkInput & {
    auditContext?: {
      category?: string
      action?: string
      cardId?: string
    }
  }) {
    const db = options.getAlicizationDb()
    const now = getNow()
    const packId = normalizeReplayBenchmarkPackId(input.packId)
    const persistTelemetry = input.persistTelemetry !== false
    const sampleLimit = Math.max(1, Math.min(24, Math.floor(input.sampleLimit ?? 12)))
    const turns = await resolveBenchmarkTurns({
      packId,
      sampleLimit,
    })

    const existingDatasetBacklog = parseReplayBenchmarkDatasetBacklog(
      await db.getMetaValue(replayBenchmarkDatasetBacklogKey),
    )
    const datasetFeedback: AlicizationRunReplayBenchmarkResult['datasetFeedback'] = {
      backlogKey: replayBenchmarkDatasetBacklogKey,
      appendedCount: 0,
      totalCount: existingDatasetBacklog.length,
      persisted: false,
      humanRatingRubric: buildReplayHumanRatingRubric(),
      driftSignals: [],
      paritySummary: null,
    }

    if (turns.length === 0) {
      return buildReplayBenchmarkNoopResult({
        packId,
        ranAt: now,
        telemetryPersisted: persistTelemetry,
        datasetFeedback,
      })
    }

    const replay = await benchmarkMainChatSessionReplay({
      turns,
    })
    const failingTurnSet = buildReplayBenchmarkFailingTurnSet({
      packId,
      turns,
      quality: replay.quality,
      gate: replay.gate,
    })
    const paritySummaries = failingTurnSet
      .map(turn => turn.paritySummary)
      .filter((item): item is NonNullable<AlicizationReplayBenchmarkFailureTurnRecord['paritySummary']> => Boolean(item))
    datasetFeedback.paritySummary = paritySummaries.length > 0
      ? {
          comparedTurnCount: paritySummaries.length,
          parityPassCount: paritySummaries.filter(item => item.passed).length,
          parityFailCount: paritySummaries.filter(item => !item.passed).length,
          parityPassRate: Number((paritySummaries.filter(item => item.passed).length / paritySummaries.length).toFixed(2)),
          firstDivergentLayerCounts: paritySummaries.reduce<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['paritySummary']>['firstDivergentLayerCounts']>((acc, item) => {
            if (item.firstDivergentLayer)
              acc[item.firstDivergentLayer] = (acc[item.firstDivergentLayer] ?? 0) + 1
            return acc
          }, {}),
        }
      : null

    if (packId !== 'backlog-humanlike-memory-v1') {
      const nextDatasetBacklog = mergeReplayBenchmarkDatasetBacklog({
        existing: existingDatasetBacklog as any,
        packId,
        turns,
        failingTurnSet,
        now,
      })
      datasetFeedback.appendedCount = nextDatasetBacklog.appendedCount
      datasetFeedback.totalCount = nextDatasetBacklog.entries.length
      if (nextDatasetBacklog.appendedCount > 0) {
        await db.setMetaValue(
          replayBenchmarkDatasetBacklogKey,
          JSON.stringify(nextDatasetBacklog.entries),
        )
        datasetFeedback.persisted = true
      }
    }

    const benchmarkTraceRecords = (
      await Promise.all(
        turns.map(async (turn) => {
          const decisionTraceId = turn.tracePointer?.decisionTraceId
          if (!decisionTraceId)
            return null
          const events = await db.listMindTurnEvents({
            decisionTraceId,
            limit: 32,
          })
          const records = buildAlicizationMemoryDecisionTraceRecords(events)
          return records.find(item => item.decisionTraceId === decisionTraceId) ?? records[0] ?? null
        }),
      )
    ).filter((item): item is AlicizationMemoryDecisionTraceRecord => Boolean(item))

    const replayTelemetryPatch = buildReplayBenchmarkMemoryStatsPatch({
      gate: replay.gate,
      quality: replay.quality,
      traces: benchmarkTraceRecords,
    })
    const currentStats = await db.getMemoryStats()
    const telemetryPatch = preferRuntimeGrowthMetrics({
      replayPatch: replayTelemetryPatch,
      currentStats,
    })

    if (persistTelemetry) {
      await db.overrideMemoryStats({
        ...currentStats,
        retrievalHealth: {
          ...currentStats?.retrievalHealth,
          ...telemetryPatch.retrievalHealth,
        },
      })
    }

    const result = {
      packId,
      ranAt: now,
      turnCount: turns.length,
      quality: replay.quality,
      standards: replay.standards,
      gate: replay.gate,
      telemetryPatch,
      telemetryPersisted: persistTelemetry,
      failingTurnSet,
      shipGate: buildReplayBenchmarkShipGate({
        report: {
          gate: replay.gate,
          telemetryPatch,
          datasetFeedback,
        },
      }),
      regressionTriage: buildReplayBenchmarkRegressionTriage({
        failingKeys: replay.gate.failingKeys,
      }),
      datasetFeedback,
    } satisfies AlicizationRunReplayBenchmarkResult

    if (input.auditContext) {
      await options.appendAuditLog({
        level: result.gate.passed ? 'notice' : 'warning',
        category: input.auditContext.category ?? 'alicization.memory-benchmark',
        action: input.auditContext.action ?? 'replay-benchmark-ran',
        message: result.gate.passed
          ? `Replay benchmark gate passed for ${packId}.`
          : `Replay benchmark gate found failing dimensions in ${packId}.`,
        payload: {
          packId,
          sampledTurnCount: turns.length,
          failingKeys: result.gate.failingKeys,
          failingTurnCount: result.failingTurnSet.length,
          shipGate: result.shipGate,
          regressionTriage: result.regressionTriage,
          datasetFeedback: result.datasetFeedback,
          telemetryPatch: result.telemetryPatch,
        },
      }, input.auditContext.cardId)
    }

    return result
  }

  async function runNightlyReplayBenchmarkGate(input?: {
    cardId?: string
    sampleLimit?: number
    persistTelemetry?: boolean
    dateKey?: string
    reason?: string
  }) {
    const db = options.getAlicizationDb()
    const now = getNow()
    const dateKey = input?.dateKey ?? buildNightlyDateKey(now)
    const previousDateKey = await db.getMetaValue(replayBenchmarkLastNightlyRunDayKey)
    if (previousDateKey === dateKey) {
      return {
        ran: false,
        skippedReason: 'already-ran-today',
        results: [] as AlicizationRunReplayBenchmarkResult[],
      }
    }

    const sampledResult = await runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: input?.sampleLimit,
      persistTelemetry: input?.persistTelemetry,
      auditContext: {
        category: 'alicization.memory-benchmark',
        action: 'replay-benchmark-nightly-sampled-ran',
        cardId: input?.cardId,
      },
    })
    const backlogEntries = parseReplayBenchmarkDatasetBacklog(
      await db.getMetaValue(replayBenchmarkDatasetBacklogKey),
    )
    const growthResult = await runReplayBenchmark({
      packId: 'growth-humanlike-memory-v1',
      sampleLimit: 4,
      persistTelemetry: input?.persistTelemetry,
      auditContext: {
        category: 'alicization.memory-benchmark',
        action: 'replay-benchmark-nightly-growth-ran',
        cardId: input?.cardId,
      },
    })
    const results: AlicizationRunReplayBenchmarkResult[] = [sampledResult, growthResult]
    if (backlogEntries.length > 0) {
      const backlogResult = await runReplayBenchmark({
        packId: 'backlog-humanlike-memory-v1',
        sampleLimit: input?.sampleLimit,
        persistTelemetry: input?.persistTelemetry,
        auditContext: {
          category: 'alicization.memory-benchmark',
          action: 'replay-benchmark-nightly-backlog-ran',
          cardId: input?.cardId,
        },
      })
      results.push(backlogResult)
    }

    await db.setMetaValue(replayBenchmarkLastNightlyRunDayKey, dateKey)
    await db.setMetaValue(replayBenchmarkLatestReportMetaKey, JSON.stringify({
      ranAt: now,
      dateKey,
      reason: input?.reason ?? 'nightly',
        packs: results.map(result => ({
          packId: result.packId,
          turnCount: result.turnCount,
          gate: result.gate,
          shipGate: result.shipGate,
          regressionTriage: result.regressionTriage,
          failingTurnSet: result.failingTurnSet,
          datasetFeedback: result.datasetFeedback,
        })),
    }))
    const tuningAdvice = deriveMemoryTuningAdviceFromReplayBenchmark({
      results,
      now,
    })
    await db.setMetaValue(
      replayBenchmarkTuningAdviceMetaKey,
      JSON.stringify(tuningAdvice),
    )

    await options.appendAuditLog({
      level: results.some(result => !result.gate.passed) ? 'warning' : 'notice',
      category: 'alicization.memory-benchmark',
      action: 'replay-benchmark-nightly-ran',
      message: results.some(result => !result.gate.passed)
        ? 'Nightly replay benchmark gate found failing dimensions.'
        : 'Nightly replay benchmark gate passed.',
      payload: {
        dateKey,
        reason: input?.reason ?? 'nightly',
        packs: results.map(result => ({
          packId: result.packId,
          turnCount: result.turnCount,
          failingKeys: result.gate.failingKeys,
          failingTurnCount: result.failingTurnSet.length,
        })),
      },
    }, input?.cardId)

    return {
      ran: true,
      results,
    }
  }

  return {
    parseReplayBenchmarkDatasetBacklog,
    ingestRuntimeSamplingConversationTurn,
    runReplayBenchmark,
    runNightlyReplayBenchmarkGate,
  }
}
