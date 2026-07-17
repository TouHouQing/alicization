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
import type { AlicizationReplayTurn } from './main-chat-session-replay-harness'
import type { AlicizationSelfEvolutionRuntime } from './self-evolution/runtime'

import { buildAlicizationMemoryDecisionTraceRecords } from '@proj-alicization/stage-shared'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {

  benchmarkMainChatSessionReplay,
  buildAdversarialHumanlikeMemoryBenchmarkPack,
  buildDefaultHumanlikeMemoryBenchmarkPack,
  buildFinalHumanlikeMemoryBenchmarkPack,
  buildGrowthHumanlikeMemoryBenchmarkPack,
  buildOrganicMemoryPromptContextFromTrace,
  buildReplayBenchmarkBacklogPack,
  buildReplayBenchmarkDatasetContinuityDigest,
  buildReplayBenchmarkFailingTurnSet,
  buildReplayBenchmarkMemoryStatsPatch,
  buildReplayHumanRatingRubric,
  buildSampledHumanlikeMemoryBenchmarkPack,
  evaluateReplayMemoryQuality,
  mergeReplayBenchmarkDatasetBacklog,
  mergeReplayStructuredSnapshot,
  readReplaySampleStructuredSnapshot,
  readReplayTraceMemoryClosureStructuredSnapshot,
} from './main-chat-session-replay-harness'
import {
  deriveMemoryTuningAdviceFromReplayBenchmark,
  replayBenchmarkTuningAdviceMetaKey,
} from './memory-tuning-advice'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { buildReplayBenchmarkExpectedMemory } from './replay-benchmark-expected-memory'
import { buildAlicizationFinalReplayGateReport } from './replay/final-gates'
import { resolveAlicizationAutonomousDialogueFamilyClassification } from './runtime-structured-format'
import { isAlicizationTurnGraphClosed } from './turn-os/turn-graph'

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
  selfEvolutionRuntime?: AlicizationSelfEvolutionRuntime
}

type AlicizationReplayBenchmarkRuntimeResult = AlicizationRunReplayBenchmarkResult & {
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
}

type AlicizationReplayBenchmarkResolvedTurnSource
  = 'static-pack'
    | 'dataset-backlog'
    | 'runtime-sampling-backlog'
    | 'conversation-sample'
    | 'mixed-runtime-and-conversation'
    | 'unknown'
type AlicizationReplayBenchmarkRuntimeSamplingEvidenceSource = Exclude<AlicizationReplayBenchmarkResolvedTurnSource, 'unknown'>

type AlicizationReplayLongRunSameHerSessionSummary = NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['longRunSameHerSessionSummary']>
type AlicizationReplayLongRunSameHerSessionRow = AlicizationReplayLongRunSameHerSessionSummary['sessions'][number]
type AlicizationReplayLongRunSameHerTransitionDiagnostic = AlicizationReplayLongRunSameHerSessionRow['transitionDiagnostics'][number]
type AlicizationReplayLongRunSameHerEventRole = 'memoryRecall' | 'proactiveOpening' | 'executionCallback' | 'emotionalAfterglow' | 'embodimentExpression'
type AlicizationReplayLongRunSameHerMemoryMetabolismProof = 'revision' | 'forgettingOrRestraint' | 'auditability'
type AlicizationReplayLongRunSameHerFailureReason = AlicizationReplayLongRunSameHerSessionRow['failureReasons'][number]
type AlicizationRuntimeSamplingEvidence = NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>
type AlicizationRuntimeSamplingTraceEventCoverage = NonNullable<AlicizationRuntimeSamplingEvidence['traceEventCoverage']>
type AlicizationRuntimeSamplingRepairTargets = NonNullable<AlicizationRuntimeSamplingEvidence['repairTargets']>
type AlicizationRuntimeSamplingNextRunEvidenceChecklist = NonNullable<AlicizationRuntimeSamplingEvidence['nextRunEvidenceChecklist']>
const replayRequiredCrossModalEmbodimentModalities = ['body', 'voice', 'face', 'motion', 'lipsync'] as const
type ReplayCrossModalEmbodimentModality = typeof replayRequiredCrossModalEmbodimentModalities[number]

const replayLongRunSameHerMinimumSessionTurns = 3

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

function isRuntimeSamplingPrimaryChatTurn(turn: AlicizationReplayTurn) {
  const turnId = typeof turn.turnId === 'string' ? turn.turnId.trim() : ''
  if (!turnId)
    return false

  return !turnId.startsWith('execution-callback:')
}

function runtimeSamplingTurnSessionId(turn: AlicizationReplayTurn) {
  return typeof turn.tracePointer?.sessionId === 'string'
    ? turn.tracePointer.sessionId.trim()
    : ''
}

function runtimeSamplingTurnCreatedAt(turn: AlicizationReplayTurn) {
  const createdAt = Number(turn.createdAt ?? 0)
  return Number.isFinite(createdAt) ? createdAt : 0
}

function selectRuntimeSamplingPrimaryBacklogTurns(input: {
  backlogEntries: unknown[]
  sampleLimit: number
}) {
  const sampleLimit = Math.max(1, Math.min(24, Math.floor(input.sampleLimit)))
  const categoryBalancedTurns = buildReplayBenchmarkBacklogPack({
    backlogEntries: input.backlogEntries,
    limit: Math.max(sampleLimit, 24),
  }).filter(isRuntimeSamplingPrimaryChatTurn)
  const chronologicalTurns = categoryBalancedTurns
    .sort((left, right) =>
      runtimeSamplingTurnCreatedAt(left) - runtimeSamplingTurnCreatedAt(right)
      || left.turnId.localeCompare(right.turnId),
    )
  const turnsBySessionId = new Map<string, AlicizationReplayTurn[]>()
  for (const turn of chronologicalTurns) {
    const sessionId = runtimeSamplingTurnSessionId(turn)
    if (!sessionId)
      continue
    turnsBySessionId.set(sessionId, [
      ...(turnsBySessionId.get(sessionId) ?? []),
      turn,
    ])
  }

  const latestCompleteSession = [...turnsBySessionId.values()]
    .filter(turns => turns.length >= sampleLimit)
    .map(turns => turns.slice(-sampleLimit))
    .sort((left, right) =>
      runtimeSamplingTurnCreatedAt(right.at(-1)!) - runtimeSamplingTurnCreatedAt(left.at(-1)!)
      || runtimeSamplingTurnSessionId(right.at(-1)!).localeCompare(runtimeSamplingTurnSessionId(left.at(-1)!)),
    )[0]
  if (latestCompleteSession)
    return latestCompleteSession

  return chronologicalTurns
    .slice(-sampleLimit)
}

function normalizeReplayBenchmarkPackId(raw: unknown): AlicizationReplayBenchmarkPackId {
  return raw === 'sampled-humanlike-memory-v1'
    || raw === 'backlog-humanlike-memory-v1'
    || raw === 'default-humanlike-memory-v1'
    || raw === 'growth-humanlike-memory-v1'
    || raw === 'adversarial-humanlike-memory-v2'
    || raw === 'final-humanlike-memory-v1'
    ? raw
    : 'final-humanlike-memory-v1'
}

function sanitizeReplayBenchmarkSampleText(raw: string) {
  return raw
    .replace(/https?:\/\/\S+/giu, '<url>')
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gu, '<email>')
    .replace(/(?:\/Users\/|[A-Za-z]:\\)[^\s"'`]+/gu, '<path>')
    .replace(/\b(?:mind|turn|session|thread):[\w:-]+\b/gu, '<id>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/giu, '<uuid>')
    .replace(/\s+/g, ' ')
    .trim()
}

function shouldPreserveReplayBenchmarkPointerField(path: string[]) {
  const parent = path[path.length - 2] ?? ''
  const key = path[path.length - 1] ?? ''
  return parent === 'tracePointer'
    && (
      key === 'decisionTraceId'
      || key === 'turnId'
      || key === 'sessionId'
      || key === 'activeThreadId'
    )
}

function anonymizeReplayBenchmarkSample<T>(value: T, path: string[] = []): T {
  if (typeof value === 'string') {
    return shouldPreserveReplayBenchmarkPointerField(path)
      ? value
      : sanitizeReplayBenchmarkSampleText(value) as T
  }
  if (Array.isArray(value))
    return value.map((item, index) => anonymizeReplayBenchmarkSample(item, [...path, String(index)])) as T
  if (!value || typeof value !== 'object')
    return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, anonymizeReplayBenchmarkSample(item, [...path, key])]),
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
}): AlicizationReplayBenchmarkRuntimeResult {
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
      quietCompanionshipCoverage: 0,
      silentPresenceNuisanceRate: 0,
      continuityMindCarryRate: 0,
    },
  }
  const finalReplayGate = buildAlicizationFinalReplayGateReport({
    retrievalHealth: {
      ...telemetryPatch.retrievalHealth,
      wrongThreadRate: 0,
      templateLeakageFailCount: 0,
      unsupportedSpecificityVisibleFailCount: 0,
      turnOsTraceCoverage: 1,
      learningOutcomeToSelfRevisionRoundtrip: 1,
    },
    authorityLeakCount: 0,
    localHumanlikeVisibleFallbackCount: 0,
    sampleCount: 0,
    productionGoldSampleCount: 0,
    productionGoldCoverage: 0,
  })
  return {
    packId: input.packId,
    ranAt: input.ranAt,
    turnCount: 0,
    turns: [] as Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'],
    quality: [],
    standards,
    gate,
    telemetryPatch,
    telemetryPersisted: input.telemetryPersisted,
    failingTurnSet: [] as AlicizationReplayBenchmarkFailureTurnRecord[],
    finalReplayGate,
    shipGate: [
      {
        key: 'final-replay-gate',
        status: finalReplayGate.passed ? 'pass' : 'fail',
        detail: finalReplayGate.passed
          ? 'Final replay gate passed.'
          : `Final failing standards: ${finalReplayGate.failingKeys.join(', ') || 'none'}.`,
      },
      { key: 'benchmark-gate', status: 'pass', detail: 'Replay benchmark gate passed.' },
      { key: 'human-rating-gate', status: 'pass', detail: 'Human rubric dimensions available: 6.' },
      { key: 'latency-gate', status: 'pass', detail: 'semantic=n/a, graph=n/a' },
      { key: 'wrong-thread-gate', status: 'pass', detail: 'wrongThreadRate=0' },
      { key: 'self-model-suppression-gate', status: 'pass', detail: 'staleSelfModelVetoRate=0' },
      { key: 'relationship-era-suppression-gate', status: 'pass', detail: 'relationshipEraConfusionRate=0' },
      { key: 'template-leakage-gate', status: 'pass', detail: 'templateLeakageFailCount=0' },
      {
        key: 'presence-qa-gate',
        status: 'fail',
        detail: 'quietCompanionshipCoverage=0, silentPresenceNuisanceRate=0, continuityMindCarryRate=0',
      },
      {
        key: 'project-state-continuity-gate',
        status: 'fail',
        detail: 'projectStateContinuity=n/a',
      },
    ],
    regressionTriage: [],
    datasetFeedback: {
      ...input.datasetFeedback,
      humanRatingRubric: buildReplayHumanRatingRubric(),
      driftSignals: [],
    },
  } satisfies AlicizationReplayBenchmarkRuntimeResult
}

function buildReplayBenchmarkShipGate(input: {
  report: Pick<AlicizationRunReplayBenchmarkResult, 'gate' | 'telemetryPatch' | 'datasetFeedback'>
  finalReplayGate: AlicizationRunReplayBenchmarkResult['finalReplayGate']
}) {
  const telemetry = input.report.telemetryPatch.retrievalHealth as typeof input.report.telemetryPatch.retrievalHealth & {
    quietCompanionshipCoverage?: number
    silentPresenceNuisanceRate?: number
    continuityMindCarryRate?: number
    longRunSameHerClosureRate?: number
    longRunSameHerSessionClosureRate?: number
    runtimeLongRunSameHerSessionClosureRate?: number
    runtimeMemoryClosureLongRunClosureRate?: number
  }
  const rubricCount = input.report.datasetFeedback.humanRatingRubric?.dimensions.length ?? 0
  const paritySummary = input.report.datasetFeedback.paritySummary ?? null
  const authoritySummary = input.report.datasetFeedback.authoritySummary ?? null
  const projectStateSummary = input.report.datasetFeedback.projectStateSummary ?? null
  const projectStateAuditSummary = input.report.datasetFeedback.projectStateAuditSummary ?? null
  const quietCompanionshipCoverage = runtimeMetricNumber(telemetry.quietCompanionshipCoverage)
  const silentPresenceNuisanceRate = runtimeMetricNumber(telemetry.silentPresenceNuisanceRate)
  const continuityMindCarryRate = runtimeMetricNumber(telemetry.continuityMindCarryRate)
  const longRunSameHerClosureRate = runtimeMetricNumber(telemetry.longRunSameHerClosureRate)
  const longRunSameHerSessionClosureRate = runtimeMetricNumber(telemetry.longRunSameHerSessionClosureRate)
  const runtimeLongRunSameHerSessionClosureRate = runtimeMetricNumber(telemetry.runtimeLongRunSameHerSessionClosureRate)
  const runtimeMemoryClosureLongRunClosureRate = runtimeMetricNumber(telemetry.runtimeMemoryClosureLongRunClosureRate)
  const presenceQaDiagnostics = [
    (runtimeLongRunSameHerSessionClosureRate ?? 0) < 0.7
      ? 'missingRealDesktopNoisyLongRunProof'
      : null,
    (runtimeMemoryClosureLongRunClosureRate ?? 0) < 0.7
      ? 'missingRealDesktopMemoryClosureProof'
      : null,
  ].filter((value): value is string => Boolean(value))
  return [
    {
      key: 'final-replay-gate' as const,
      status: input.finalReplayGate.passed ? 'pass' : 'fail',
      detail: input.finalReplayGate.passed
        ? 'Final replay gate passed.'
        : `Final failing standards: ${input.finalReplayGate.failingKeys.join(', ') || 'none'}.`,
    },
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
      key: 'presence-qa-gate' as const,
      status: (quietCompanionshipCoverage ?? 0) >= 0.7
        && (silentPresenceNuisanceRate ?? 1) <= 0.2
        && (continuityMindCarryRate ?? 0) >= 0.7
        && (longRunSameHerClosureRate ?? 1) >= 0.7
        && (longRunSameHerSessionClosureRate ?? 1) >= 0.7
        && (runtimeLongRunSameHerSessionClosureRate ?? 0) >= 0.7
        && (runtimeMemoryClosureLongRunClosureRate ?? 0) >= 0.7
        ? 'pass'
        : 'fail',
      detail: [
        `quietCompanionshipCoverage=${quietCompanionshipCoverage ?? 0}`,
        `silentPresenceNuisanceRate=${silentPresenceNuisanceRate ?? 0}`,
        `continuityMindCarryRate=${continuityMindCarryRate ?? 0}`,
        `longRunSameHerClosureRate=${longRunSameHerClosureRate ?? 'n/a'}`,
        `longRunSameHerSessionClosureRate=${longRunSameHerSessionClosureRate ?? 'n/a'}`,
        `runtimeLongRunSameHerSessionClosureRate=${runtimeLongRunSameHerSessionClosureRate ?? 0}`,
        `runtimeMemoryClosureLongRunClosureRate=${runtimeMemoryClosureLongRunClosureRate ?? 0}`,
        ...(presenceQaDiagnostics.length > 0
          ? [`diagnostics=${presenceQaDiagnostics.join('|')}`]
          : []),
      ].join(', '),
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
    {
      key: 'visible-reply-authority-gate' as const,
      status: !authoritySummary || authoritySummary.mismatchTurnCount <= 0 ? 'pass' : 'fail',
      detail: authoritySummary
        ? `embodiedAuthorityMismatchRate=${Number((authoritySummary.mismatchTurnCount / Math.max(1, authoritySummary.comparedTurnCount)).toFixed(2))} (${authoritySummary.mismatchTurnCount}/${authoritySummary.comparedTurnCount})`
        : 'embodiedAuthorityMismatchRate=n/a',
    },
    {
      key: 'project-state-continuity-gate' as const,
      status: !projectStateSummary
        || projectStateSummary.comparedTurnCount <= 0
        || projectStateSummary.continuityHitCount >= projectStateSummary.comparedTurnCount
        ? 'pass'
        : 'fail',
      detail: projectStateSummary
        ? `projectStateContinuity=${Number((projectStateSummary.continuityHitCount / Math.max(1, projectStateSummary.comparedTurnCount)).toFixed(2))} (${projectStateSummary.continuityHitCount}/${projectStateSummary.comparedTurnCount}), identity=${projectStateSummary.identityHitCount}, phase=${projectStateSummary.phaseHitCount}, openLoop=${projectStateSummary.openLoopHitCount}, proactiveGap=${projectStateSummary.proactiveSameHerGapHitCount ?? 0}, sameHer=${projectStateSummary.sameHerHitCount}`
        : 'projectStateContinuity=n/a',
    },
    {
      key: 'project-state-audit-gate' as const,
      status: !projectStateAuditSummary
        || projectStateAuditSummary.comparedTurnCount <= 0
        || (
          projectStateAuditSummary.contentCompleteTurnCount >= projectStateAuditSummary.comparedTurnCount
          && projectStateAuditSummary.validationStatus.knownTurnCount === projectStateAuditSummary.comparedTurnCount
          && projectStateAuditSummary.validationStatus.approvedTurnCount === projectStateAuditSummary.comparedTurnCount
          && projectStateAuditSummary.validationStatus.blockedTurnCount === 0
          && projectStateAuditSummary.validationStatus.unknownTurnCount === 0
          && projectStateAuditSummary.evidenceStatus.knownTurnCount === projectStateAuditSummary.comparedTurnCount
          && projectStateAuditSummary.evidenceStatus.presentTurnCount === projectStateAuditSummary.comparedTurnCount
          && projectStateAuditSummary.evidenceStatus.missingTurnCount === 0
          && projectStateAuditSummary.evidenceStatus.unknownTurnCount === 0
          && (
            projectStateAuditSummary.sameHerSummaryTurnCount <= 0
            || projectStateAuditSummary.sameHerSelfLineTurnCount >= projectStateAuditSummary.sameHerSummaryTurnCount
          )
        )
        ? 'pass'
        : 'fail',
      detail: projectStateAuditSummary
        ? `projectStateAudit=${Number((projectStateAuditSummary.contentCompleteTurnCount / Math.max(1, projectStateAuditSummary.comparedTurnCount)).toFixed(2))} (${projectStateAuditSummary.contentCompleteTurnCount}/${projectStateAuditSummary.comparedTurnCount}), preDialogueAwareness=${projectStateAuditSummary.preDialogueAwarenessTurnCount}, continuitySummary=${projectStateAuditSummary.continuitySummaryTurnCount}, embodimentClosure=${projectStateAuditSummary.embodimentClosureTurnCount}, validationKnown=${projectStateAuditSummary.validationStatus.knownTurnCount}, validationApproved=${projectStateAuditSummary.validationStatus.approvedTurnCount}, validationBlocked=${projectStateAuditSummary.validationStatus.blockedTurnCount}, validationUnknown=${projectStateAuditSummary.validationStatus.unknownTurnCount}, evidenceKnown=${projectStateAuditSummary.evidenceStatus.knownTurnCount}, evidencePresent=${projectStateAuditSummary.evidenceStatus.presentTurnCount}, evidenceMissing=${projectStateAuditSummary.evidenceStatus.missingTurnCount}, evidenceUnknown=${projectStateAuditSummary.evidenceStatus.unknownTurnCount}, sameHerSelfLine=${projectStateAuditSummary.sameHerSelfLineTurnCount}${(projectStateAuditSummary.sameHerHoldDetailTurnCount ?? 0) > 0 || (projectStateAuditSummary.continuityArcStageTurnCount ?? 0) > 0 || (projectStateAuditSummary.continuityCueTurnCount ?? 0) > 0 ? `, sameHerHoldDetail=${projectStateAuditSummary.sameHerHoldDetailTurnCount ?? 0}, continuityArcStage=${projectStateAuditSummary.continuityArcStageTurnCount ?? 0}, continuityCue=${projectStateAuditSummary.continuityCueTurnCount ?? 0}` : ''}${projectStateAuditSummary.sameHerSummaryTurnCount > 0 && projectStateAuditSummary.sameHerSelfLineTurnCount < projectStateAuditSummary.sameHerSummaryTurnCount ? ', selfLineDrift=degraded-to-generic-guidance, humanRisk=reply-slipped-toward-generic-project-shell-instead-of-one-continuous-her' : ''}`
        : 'projectStateAudit=n/a',
    },
  ] satisfies AlicizationRunReplayBenchmarkResult['shipGate']
}

function runtimeMetricNumber(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : null
}

function clampPresenceMetric(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeReplayProjectStateCue(raw: string | null | undefined, maxChars = 220) {
  return sanitizeReplayBenchmarkSampleText(String(raw ?? '')).toLowerCase().slice(0, maxChars)
}

function matchesReplayProjectStateCue(expectedMemory: string, cues: string[]) {
  return cues.some(cue => cue && expectedMemory.includes(cue))
}

function normalizeReplayStructuredCue(raw: unknown, maxChars = 320) {
  return typeof raw === 'string'
    ? normalizeReplayProjectStateCue(raw, maxChars)
    : ''
}

function hasReplaySameHerProjectStateCue(raw: string | null | undefined) {
  const text = normalizeReplayProjectStateCue(raw, 320)
  if (!text)
    return false

  return /same_her=|same-her=|same phase 1 digital life|same digital life|same her who|same living her|same-her|one same her|one living her|one living digital life|continuous her explicit|holding together mainly through|holding together because|audible-body rejoin|audible body rejoin|voice|face|motion|lipsync|cross-modal|embodiment closure|同一个她|同一个 her|这是同一个她|还在推进的/u.test(text)
}

function hasReplayCanonicalProjectIdentityCue(raw: unknown) {
  const text = normalizeReplayStructuredCue(raw, 320)
  if (!text)
    return false
  return /local-first digital life|数字生命/u.test(text)
}

function hasReplayCanonicalProjectPhaseCue(raw: unknown) {
  const text = normalizeReplayStructuredCue(raw, 220)
  if (!text)
    return false
  return (/phase 1\b|local digital life|本地数字生命/u.test(text))
    && !/^phase 1$/u.test(text)
}

function hasReplayCanonicalOpenLoopCue(raw: unknown) {
  const text = normalizeReplayStructuredCue(raw, 320)
  if (!text)
    return false
  return /same-her|same digital life|same living line|phase 1|memory|initiative|embodiment|cross-modal|visible-reply|未闭环|还没闭环|still-open life loop|unfinished/u.test(text)
}

function hasReplayCanonicalProactiveSameHerGapCue(raw: unknown) {
  const text = normalizeReplayStructuredCue(raw, 320)
  if (!text)
    return false
  return /proactive|hover-first|hover first|visible proactive hold/u.test(text)
    && /same-her|same her|subconscious|next-session|next session|feedback carry|follow-through|quiet carry/u.test(text)
}

function hasReplayCanonicalNextClosureCue(raw: unknown) {
  const text = normalizeReplayStructuredCue(raw, 320)
  if (!text)
    return false
  return /same-her|same digital life|phase 1|memory|initiative|embodiment|cross-modal|visible-reply|next closure|下一步闭环/u.test(text)
}

function hasReplayCanonicalEmotionalClosureCue(raw: unknown) {
  const text = normalizeReplayStructuredCue(raw, 320)
  if (!text)
    return false
  return /same-her emotional closure|emotional closure|情绪闭环|一条情绪线|same living line/u.test(text)
}

function hasReplayCanonicalLandedProgressCue(raw: unknown) {
  const text = normalizeReplayStructuredCue(raw, 320)
  if (!text)
    return false

  return /已落地|landed progress|project-state continuity already survives into runtime preparation|shared .* continuity now survives into replay sampling backlog|shared .* continuity now carries stronger|same-session mirror carry already preserved the project-state closure line|already preserved the project-state closure line|continuity, memory, execution.*already land together often enough/u.test(text)
}

function buildReplayProjectStateSummary(input: {
  turns: AlicizationReplayTurn[]
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['projectStateSummary']> | null {
  const projectState = resolveAlicizationProjectStateBrief()
  const identityCues = [
    normalizeReplayProjectStateCue(projectState.identity, 220),
    'local-first digital life',
    '本地优先数字生命',
  ].filter(Boolean)
  const phaseCues = [
    normalizeReplayProjectStateCue(projectState.currentPhase, 180),
    'phase 1',
  ].filter(Boolean)
  const openLoopCues = [
    normalizeReplayProjectStateCue(projectState.openLoops[0] ?? '', 220),
    '还没闭环',
    '未闭环',
    'not fully closed',
    'still-open life loop',
  ].filter(Boolean)
  const proactiveSameHerGapCues = [
    normalizeReplayProjectStateCue(projectState.proactiveSameHerGap, 220),
    'visible proactive hold',
    'subconscious carry',
    'next-session feedback carry',
    'hover-first restraint',
  ].filter(Boolean)
  const sameHerCues = [
    normalizeReplayProjectStateCue(projectState.sameHerSelfLine, 220),
    'same-her',
    'same digital life',
    'same her',
    '同一个她',
    '这是同一个她',
    '还在推进的',
  ].filter(Boolean)

  let comparedTurnCount = 0
  let identityHitCount = 0
  let phaseHitCount = 0
  let openLoopHitCount = 0
  let sameHerHitCount = 0
  let proactiveSameHerGapHitCount = 0
  let continuityHitCount = 0

  for (const turn of input.turns) {
    const expectedMemory = normalizeReplayProjectStateCue(turn.expectedMemory ?? '', 260)
    const structured = turn.structured && typeof turn.structured === 'object'
      ? turn.structured as Record<string, unknown>
      : null
    const projectStateStructured = structured?.projectState && typeof structured.projectState === 'object'
      ? structured.projectState as Record<string, unknown>
      : null
    const carriesStructuredIdentity = hasReplayCanonicalProjectIdentityCue(projectStateStructured?.identity)
    const carriesStructuredPhase = hasReplayCanonicalProjectPhaseCue(projectStateStructured?.currentPhase)
    const carriesStructuredOpenLoop = hasReplayCanonicalOpenLoopCue(projectStateStructured?.primaryOpenLoop)
    const carriesStructuredProactiveSameHerGap = hasReplayCanonicalProactiveSameHerGapCue(projectStateStructured?.proactiveSameHerGap)
    const carriesStructuredSameHer = hasReplaySameHerProjectStateCue(
      typeof projectStateStructured?.sameHerSelfLine === 'string'
        ? projectStateStructured.sameHerSelfLine
        : null,
    )
    const structuredProjectCarry = [
      projectStateStructured?.identity,
      projectStateStructured?.currentPhase,
      projectStateStructured?.primaryOpenLoop,
      projectStateStructured?.proactiveSameHerGap,
      projectStateStructured?.sameHerSelfLine,
    ]
      .map(value => typeof value === 'string' ? normalizeReplayProjectStateCue(value, 320) : '')
      .filter(Boolean)
      .join(' ')
    const replayProjectContinuityMemory = [expectedMemory, structuredProjectCarry]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (!replayProjectContinuityMemory)
      continue
    comparedTurnCount += 1
    const identityHit = carriesStructuredIdentity || matchesReplayProjectStateCue(replayProjectContinuityMemory, identityCues)
    const phaseHit = carriesStructuredPhase || matchesReplayProjectStateCue(replayProjectContinuityMemory, phaseCues)
    const openLoopHit = carriesStructuredOpenLoop || matchesReplayProjectStateCue(replayProjectContinuityMemory, openLoopCues)
    const proactiveSameHerGapHit = carriesStructuredProactiveSameHerGap
      || matchesReplayProjectStateCue(replayProjectContinuityMemory, proactiveSameHerGapCues)
    const sameHerHit = carriesStructuredSameHer
      || hasReplaySameHerProjectStateCue(replayProjectContinuityMemory)
      || matchesReplayProjectStateCue(replayProjectContinuityMemory, sameHerCues)
    if (identityHit)
      identityHitCount += 1
    if (phaseHit)
      phaseHitCount += 1
    if (openLoopHit)
      openLoopHitCount += 1
    if (proactiveSameHerGapHit)
      proactiveSameHerGapHitCount += 1
    if (sameHerHit)
      sameHerHitCount += 1
    if (identityHit && phaseHit && openLoopHit && proactiveSameHerGapHit && sameHerHit)
      continuityHitCount += 1
  }

  return comparedTurnCount > 0
    ? {
        comparedTurnCount,
        identityHitCount,
        phaseHitCount,
        openLoopHitCount,
        sameHerHitCount,
        proactiveSameHerGapHitCount,
        continuityHitCount,
      }
    : null
}

function buildReplayPreDialogueBriefingSummary(input: {
  turns: AlicizationReplayTurn[]
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['preDialogueBriefingSummary']> | null {
  const projectState = resolveAlicizationProjectStateBrief()
  const identityCues = [
    normalizeReplayProjectStateCue(projectState.identity, 220),
    'local-first digital life',
    '本地优先数字生命',
  ].filter(Boolean)
  const phaseCues = [
    normalizeReplayProjectStateCue(projectState.currentPhase, 180),
    'phase 1',
  ].filter(Boolean)
  const landedProgressCues = [
    normalizeReplayProjectStateCue(projectState.continuityProgressSummary ?? '', 240),
    '已落地',
    'landed progress',
  ].filter(Boolean)
  const openLoopCues = [
    normalizeReplayProjectStateCue(projectState.openLoops[0] ?? '', 220),
    '还没闭环',
    '未闭环',
    'still-open life loop',
  ].filter(Boolean)
  const nextClosureCues = [
    normalizeReplayProjectStateCue(projectState.nextClosureTarget, 240),
    'next closure target',
    '下一步闭环',
  ].filter(Boolean)
  const emotionalClosureCues = [
    'same-her emotional closure',
    'emotional closure',
    '情绪闭环',
    '一条情绪线',
  ].filter(Boolean)

  let comparedTurnCount = 0
  let identityHitCount = 0
  let phaseHitCount = 0
  let landedProgressHitCount = 0
  let openLoopHitCount = 0
  let nextClosureHitCount = 0
  let emotionalClosureHitCount = 0
  let fullyBriefedTurnCount = 0

  for (const turn of input.turns) {
    const expectedMemory = normalizeReplayProjectStateCue(turn.expectedMemory ?? '', 320)
    const structured = turn.structured && typeof turn.structured === 'object'
      ? turn.structured as Record<string, unknown>
      : null
    const projectStateAudit = turn.visibleReplyRealization?.projectStateAudit ?? null
    const projectStateStructured = structured?.projectState && typeof structured.projectState === 'object'
      ? structured.projectState as Record<string, unknown>
      : null
    const carriesStructuredIdentity = hasReplayCanonicalProjectIdentityCue(projectStateStructured?.identity)
    const carriesStructuredPhase = hasReplayCanonicalProjectPhaseCue(projectStateStructured?.currentPhase)
    const structuredLandedProgress = normalizeReplayStructuredCue(projectStateStructured?.latestLandedProgress, 320)
    const structuredOpenLoop = normalizeReplayStructuredCue(projectStateStructured?.primaryOpenLoop, 320)
    const carriesStructuredLandedProgress = Boolean(structuredLandedProgress)
      && matchesReplayProjectStateCue(structuredLandedProgress, landedProgressCues)
    const carriesStructuredOpenLoop = Boolean(structuredOpenLoop)
      && matchesReplayProjectStateCue(structuredOpenLoop, openLoopCues)
    const carriesStructuredNextClosure = hasReplayCanonicalNextClosureCue(projectStateStructured?.nextClosureTarget)
    const carriesStructuredEmotionalClosure = hasReplayCanonicalEmotionalClosureCue(projectStateStructured?.emotionalClosureCue)
    const structuredProjectCarry = [
      projectStateStructured?.identity,
      projectStateStructured?.currentPhase,
      projectStateStructured?.latestLandedProgress,
      projectStateStructured?.primaryOpenLoop,
      projectStateStructured?.nextClosureTarget,
      projectStateStructured?.sameHerSelfLine,
      projectStateStructured?.preDialogueAwarenessLine,
      projectStateStructured?.emotionalClosureCue,
    ]
      .map(value => typeof value === 'string' ? normalizeReplayProjectStateCue(value, 320) : '')
      .filter(Boolean)
      .join(' ')
    const replayProjectBriefingMemory = [expectedMemory, structuredProjectCarry]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (!replayProjectBriefingMemory)
      continue

    comparedTurnCount += 1

    const identityHit = carriesStructuredIdentity || matchesReplayProjectStateCue(replayProjectBriefingMemory, identityCues)
    const phaseHit = carriesStructuredPhase || matchesReplayProjectStateCue(replayProjectBriefingMemory, phaseCues)
    const landedProgressHit = carriesStructuredLandedProgress
      || (!structuredLandedProgress && matchesReplayProjectStateCue(replayProjectBriefingMemory, landedProgressCues))
    const openLoopHit = carriesStructuredOpenLoop
      || (!structuredOpenLoop && matchesReplayProjectStateCue(replayProjectBriefingMemory, openLoopCues))
    const nextClosureHit = carriesStructuredNextClosure || matchesReplayProjectStateCue(replayProjectBriefingMemory, nextClosureCues)
    const continuitySummaryText = typeof projectStateAudit?.continuitySummary === 'string'
      ? projectStateAudit.continuitySummary.trim()
      : ''
    const emotionalClosureHit = carriesStructuredEmotionalClosure
      || /\bclosure=([^|]+?)(?:\s*\|\s*|$)/i.test(continuitySummaryText)
      || matchesReplayProjectStateCue(replayProjectBriefingMemory, emotionalClosureCues)

    if (identityHit)
      identityHitCount += 1
    if (phaseHit)
      phaseHitCount += 1
    if (landedProgressHit)
      landedProgressHitCount += 1
    if (openLoopHit)
      openLoopHitCount += 1
    if (nextClosureHit)
      nextClosureHitCount += 1
    if (emotionalClosureHit)
      emotionalClosureHitCount += 1
    if (identityHit && phaseHit && landedProgressHit && openLoopHit && nextClosureHit)
      fullyBriefedTurnCount += 1
  }

  return comparedTurnCount > 0
    ? {
        comparedTurnCount,
        identityHitCount,
        phaseHitCount,
        landedProgressHitCount,
        openLoopHitCount,
        nextClosureHitCount,
        emotionalClosureHitCount,
        fullyBriefedTurnCount,
      }
    : null
}

function createReplayValidationStatusSummary() {
  return {
    knownTurnCount: 0,
    approvedTurnCount: 0,
    blockedTurnCount: 0,
    unknownTurnCount: 0,
  }
}

function normalizeReplayValidationStatus(raw: unknown) {
  return raw === 'approved' || raw === 'blocked'
    ? raw
    : 'unknown'
}

function countReplayValidationStatus(
  summary: ReturnType<typeof createReplayValidationStatusSummary>,
  raw: unknown,
) {
  const status = normalizeReplayValidationStatus(raw)
  if (status === 'approved') {
    summary.knownTurnCount += 1
    summary.approvedTurnCount += 1
    return
  }
  if (status === 'blocked') {
    summary.knownTurnCount += 1
    summary.blockedTurnCount += 1
    return
  }
  summary.unknownTurnCount += 1
}

function createReplayEvidenceStatusSummary() {
  return {
    knownTurnCount: 0,
    presentTurnCount: 0,
    missingTurnCount: 0,
    unknownTurnCount: 0,
  }
}

function normalizeReplayEvidenceStatus(raw: unknown) {
  return raw === 'present' || raw === 'missing'
    ? raw
    : 'unknown'
}

function countReplayEvidenceStatus(
  summary: ReturnType<typeof createReplayEvidenceStatusSummary>,
  raw: unknown,
) {
  const status = normalizeReplayEvidenceStatus(raw)
  if (status === 'present') {
    summary.knownTurnCount += 1
    summary.presentTurnCount += 1
    return
  }
  if (status === 'missing') {
    summary.knownTurnCount += 1
    summary.missingTurnCount += 1
    return
  }
  summary.unknownTurnCount += 1
}

function buildReplayEmotionalClosureSummary(input: {
  turns: AlicizationReplayTurn[]
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['emotionalClosureSummary']> | null {
  let comparedTurnCount = 0
  let activeCueTurnCount = 0
  let lowPressureRequiredTurnCount = 0
  let antiRestartRequiredTurnCount = 0
  const validationStatus = createReplayValidationStatusSummary()

  for (const turn of input.turns) {
    const audit = turn.visibleReplyRealization?.emotionalClosureAudit ?? null
    const structured = turn.structured && typeof turn.structured === 'object'
      ? turn.structured as Record<string, unknown>
      : null
    const projectState = structured?.projectState && typeof structured.projectState === 'object'
      ? structured.projectState as Record<string, unknown>
      : null
    const projectStateEmotionalClosureCue = typeof projectState?.emotionalClosureCue === 'string'
      && projectState.emotionalClosureCue.trim().length > 0
      ? projectState.emotionalClosureCue.trim()
      : null
    if (!audit && !projectStateEmotionalClosureCue)
      continue
    comparedTurnCount += 1
    countReplayValidationStatus(
      validationStatus,
      turn.visibleReplyRealization?.visibleReplyValidationStatus,
    )
    if (audit?.activeCue || projectStateEmotionalClosureCue)
      activeCueTurnCount += 1
    if (audit?.lowPressureRequired)
      lowPressureRequiredTurnCount += 1
    if (audit?.antiRestartRequired)
      antiRestartRequiredTurnCount += 1
  }

  return comparedTurnCount > 0
    ? {
        comparedTurnCount,
        activeCueTurnCount,
        lowPressureRequiredTurnCount,
        antiRestartRequiredTurnCount,
        validationStatus,
      }
    : null
}

function hasReplayEmotionalClosureDrift(
  summary: ReturnType<typeof buildReplayEmotionalClosureSummary>,
) {
  if (!summary || summary.comparedTurnCount <= 0)
    return false

  const comparedTurnCount = summary.comparedTurnCount
  return summary.activeCueTurnCount < comparedTurnCount
    || summary.validationStatus.knownTurnCount !== comparedTurnCount
    || summary.validationStatus.approvedTurnCount !== comparedTurnCount
    || summary.validationStatus.blockedTurnCount > 0
    || summary.validationStatus.unknownTurnCount > 0
}

function buildReplaySelfAuthoritySummary(input: {
  turns: AlicizationReplayTurn[]
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['selfAuthoritySummary']> | null {
  let comparedTurnCount = 0
  let authoritySummaryTurnCount = 0
  let closenessPostureTurnCount = 0
  let contentCompleteTurnCount = 0
  const validationStatus = createReplayValidationStatusSummary()

  for (const turn of input.turns) {
    const audit = turn.visibleReplyRealization?.selfAuthorityAudit ?? null
    if (!audit)
      continue
    comparedTurnCount += 1
    countReplayValidationStatus(
      validationStatus,
      turn.visibleReplyRealization?.visibleReplyValidationStatus,
    )
    if (audit.authoritySummary)
      authoritySummaryTurnCount += 1
    if (audit.closenessPosture)
      closenessPostureTurnCount += 1
    if (audit.authoritySummary && audit.closenessPosture)
      contentCompleteTurnCount += 1
  }

  return comparedTurnCount > 0
    ? {
        comparedTurnCount,
        authoritySummaryTurnCount,
        closenessPostureTurnCount,
        contentCompleteTurnCount,
        validationStatus,
      }
    : null
}

function buildReplayFailureTurnSelfAuthoritySummary(
  turn: AlicizationReplayTurn | null | undefined,
): NonNullable<AlicizationReplayBenchmarkFailureTurnRecord['selfAuthoritySummary']> | null {
  const audit = turn?.visibleReplyRealization?.selfAuthorityAudit ?? null
  if (!audit)
    return null

  return {
    authoritySummary: typeof audit.authoritySummary === 'string'
      ? audit.authoritySummary
      : null,
    closenessPosture: typeof audit.closenessPosture === 'string'
      ? audit.closenessPosture
      : null,
    visibleReplyValidationStatus: normalizeReplayValidationStatus(
      turn?.visibleReplyRealization?.visibleReplyValidationStatus,
    ),
    projectStateEvidenceStatus: normalizeReplayEvidenceStatus(
      turn?.visibleReplyRealization?.projectStateEvidenceStatus,
    ),
  }
}

function readPreparedSessionMirrorProjectStateTexts(
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number] | null | undefined,
) {
  const dialogueMirror = prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.sessionMirror ?? null
  const topLevelMirror = prepared?.sessionMirror ?? null
  const legacyRuntimeMirror = (prepared?.runtimeSurface as { dialogueSessionMirror?: unknown } | null | undefined)?.dialogueSessionMirror ?? null
  const mirror = dialogueMirror ?? topLevelMirror ?? legacyRuntimeMirror
  const record = mirror && typeof mirror === 'object'
    ? mirror as Record<string, unknown>
    : null

  const continuityArcSummary = typeof record?.continuityArcSummary === 'string'
    ? record.continuityArcSummary
    : null
  const sameHerSummaryMatch = typeof continuityArcSummary === 'string'
    ? /(?:^|\|\s*)same_her=([^|]+)/i.exec(continuityArcSummary)
    : null
  const projectPreflightMatch = typeof continuityArcSummary === 'string'
    ? /(?:^|\|\s*)project_preflight=([^|]+)/i.exec(continuityArcSummary)
    : null
  const landedSummaryMatch = typeof continuityArcSummary === 'string'
    ? /(?:^|\|\s*)landed=([^|]+)/i.exec(continuityArcSummary)
    : null
  const openSummaryMatch = typeof continuityArcSummary === 'string'
    ? /(?:^|\|\s*)open=([^|]+)/i.exec(continuityArcSummary)
    : null
  const openFocusSummaryMatch = typeof continuityArcSummary === 'string'
    ? /(?:^|\|\s*)open(?:-|_)focus=([^|]+)/i.exec(continuityArcSummary)
    : null
  const nextSummaryMatch = typeof continuityArcSummary === 'string'
    ? /(?:^|\|\s*)next=([^|]+)/i.exec(continuityArcSummary)
    : null
  const nextFocusSummaryMatch = typeof continuityArcSummary === 'string'
    ? /(?:^|\|\s*)next(?:-|_)focus=([^|]+)/i.exec(continuityArcSummary)
    : null
  const resolvedPreparedSameHerSummary = sameHerSummaryMatch?.[1]?.trim()
    ? continuityArcSummary
    : projectPreflightMatch?.[1]?.trim() && hasReplaySameHerProjectStateCue(projectPreflightMatch[1].trim())
      ? projectPreflightMatch[1].trim()
      : null

  return {
    sameHerSummary: resolvedPreparedSameHerSummary,
    sameHerSelfLine: sameHerSummaryMatch?.[1]?.trim()
      ? sameHerSummaryMatch[1].trim()
      : null,
    projectPreflightSummary: projectPreflightMatch?.[1]?.trim()
      ? projectPreflightMatch[1].trim()
      : null,
    landedProgressSummary: landedSummaryMatch?.[1]?.trim()
      ? landedSummaryMatch[1].trim()
      : null,
    openClosureSummary: openSummaryMatch?.[1]?.trim()
      ? openSummaryMatch[1].trim()
      : null,
    openFocusSummary: openFocusSummaryMatch?.[1]?.trim()
      ? openFocusSummaryMatch[1].trim()
      : null,
    nextClosureTargetSummary: nextSummaryMatch?.[1]?.trim()
      ? nextSummaryMatch[1].trim()
      : null,
    nextFocusSummary: nextFocusSummaryMatch?.[1]?.trim()
      ? nextFocusSummaryMatch[1].trim()
      : null,
  }
}

function readReplayStructuredProjectStateTexts(
  turn: Pick<AlicizationReplayTurn, 'structured'>,
) {
  const structured = turn.structured && typeof turn.structured === 'object'
    ? turn.structured as Record<string, unknown>
    : null
  const projectState = structured?.projectState && typeof structured.projectState === 'object'
    ? structured.projectState as Record<string, unknown>
    : null
  const preDialogueAwareness = structured?.preDialogueAwareness && typeof structured.preDialogueAwareness === 'object'
    ? structured.preDialogueAwareness as Record<string, unknown>
    : null

  return {
    sameHerSelfLine: typeof projectState?.sameHerSelfLine === 'string'
      ? projectState.sameHerSelfLine
      : null,
    preDialogueAwarenessLine: typeof projectState?.preDialogueAwarenessLine === 'string'
      ? projectState.preDialogueAwarenessLine
      : null,
    awarenessLine: typeof preDialogueAwareness?.awarenessLine === 'string'
      ? preDialogueAwareness.awarenessLine
      : null,
    summaryLine: typeof preDialogueAwareness?.summaryLine === 'string'
      ? preDialogueAwareness.summaryLine
      : null,
    companionHeadlineLine: typeof preDialogueAwareness?.companionHeadlineLine === 'string'
      ? preDialogueAwareness.companionHeadlineLine
      : null,
    companionBriefingLine: typeof preDialogueAwareness?.companionBriefingLine === 'string'
      ? preDialogueAwareness.companionBriefingLine
      : null,
  }
}

export const __alicizationTestOnly = {
  readPreparedSessionMirrorProjectStateTexts,
  buildReplayEmotionalClosureSummary,
  hasReplayEmotionalClosureDrift,
  buildReplaySelfAuthoritySummary,
  buildReplayProjectStateAuditSummary,
  hasRuntimeSamplingTraceDownstreamStateEvidence,
  readRuntimeSamplingTraceDownstreamStateLanes,
  selectRuntimeSamplingProvenanceTrace,
  buildRuntimeSamplingEvidence,
  buildRuntimeSamplingRepairTargets,
  buildReplayBenchmarkShipGate,
  selectRuntimeSamplingPrimaryBacklogTurns,
  replayNoisyDesktopEventRoleText,
  readReplayLongRunSameHerEventRoles,
  buildReplayLongRunSameHerSessionSummary,
  buildReplayLongRunSameHerTurnDiagnostics,
  readReplayLongRunSameHerMemoryIdentityContinuity,
}

function buildReplayProjectStateAuditSummary(input: {
  turns: Array<Pick<AlicizationReplayTurn, 'visibleReplyRealization' | 'structured'>>
  preparedTurns?: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['projectStateAuditSummary']> | null {
  let comparedTurnCount = 0
  let sameHerSummaryTurnCount = 0
  let sameHerSelfLineTurnCount = 0
  let sameHerHoldDetailTurnCount = 0
  let continuityArcStageTurnCount = 0
  let continuityCueTurnCount = 0
  let currentPhaseTurnCount = 0
  let landedProgressTurnCount = 0
  let openClosureTurnCount = 0
  let nextClosureTargetTurnCount = 0
  let emotionalClosureTurnCount = 0
  let preDialogueAwarenessTurnCount = 0
  let richPreDialogueAwarenessTurnCount = 0
  let continuitySummaryTurnCount = 0
  let embodimentClosureTurnCount = 0
  let preDialogueClosureTurnCount = 0
  let contentCompleteTurnCount = 0
  const validationStatus = createReplayValidationStatusSummary()
  const evidenceStatus = createReplayEvidenceStatusSummary()

  for (const turn of input.turns) {
    const realization = turn.visibleReplyRealization ?? null
    const audit = realization?.projectStateAudit ?? null
    if (!realization && !audit)
      continue
    comparedTurnCount += 1
    countReplayValidationStatus(
      validationStatus,
      realization?.visibleReplyValidationStatus,
    )
    countReplayEvidenceStatus(
      evidenceStatus,
      realization?.projectStateEvidenceStatus,
    )
    if (!audit)
      continue

    const structuredProjectState = readReplayStructuredProjectStateTexts(turn)
    const structured = turn.structured && typeof turn.structured === 'object'
      ? turn.structured as Record<string, unknown>
      : null
    const preDialogueClosure = structured?.preDialogueClosure && typeof structured.preDialogueClosure === 'object'
      ? structured.preDialogueClosure as Record<string, unknown>
      : null
    const carriesPreDialogueClosure = typeof preDialogueClosure?.summaryLine === 'string'
      && preDialogueClosure.summaryLine.trim().length > 0
    const structuredSameHerCarryLine = [
      structuredProjectState.sameHerSelfLine,
      isAlicizationThinProjectAwarenessLine(structuredProjectState.companionHeadlineLine)
        ? null
        : structuredProjectState.companionHeadlineLine,
      isAlicizationThinProjectAwarenessLine(structuredProjectState.companionBriefingLine)
        ? null
        : structuredProjectState.companionBriefingLine,
      isAlicizationThinProjectAwarenessLine(structuredProjectState.awarenessLine)
        ? null
        : structuredProjectState.awarenessLine,
    ].find((value): value is string =>
      typeof value === 'string'
      && value.trim().length > 0
      && hasReplaySameHerProjectStateCue(value),
    ) ?? null
    const carriesAuditSameHerSummary = typeof audit.sameHerSummary === 'string'
      && audit.sameHerSummary.trim().length > 0
    const carriesStructuredSameHerSelfLine = hasReplaySameHerProjectStateCue(structuredSameHerCarryLine)
    const carriesSameHerSummary = carriesAuditSameHerSummary
    if (carriesSameHerSummary)
      sameHerSummaryTurnCount += 1
    if (typeof (audit as { sameHerHoldDetail?: unknown }).sameHerHoldDetail === 'string'
      && (audit as { sameHerHoldDetail?: string }).sameHerHoldDetail?.trim()) {
      sameHerHoldDetailTurnCount += 1
    }
    if (typeof (audit as { continuityArcStage?: unknown }).continuityArcStage === 'string'
      && (audit as { continuityArcStage?: string }).continuityArcStage?.trim()) {
      continuityArcStageTurnCount += 1
    }
    if (typeof (audit as { continuityCue?: unknown }).continuityCue === 'string'
      && (audit as { continuityCue?: string }).continuityCue?.trim()) {
      continuityCueTurnCount += 1
    }
    if (hasReplayCanonicalProjectPhaseCue((audit as { currentPhaseSummary?: unknown }).currentPhaseSummary)) {
      currentPhaseTurnCount += 1
    }
    if (
      matchesReplayProjectStateCue(
        normalizeReplayStructuredCue(audit.landedProgressSummary, 320),
        [
          normalizeReplayProjectStateCue(resolveAlicizationProjectStateBrief().continuityProgressSummary ?? '', 240),
          '已落地',
          'landed progress',
          'same-her line',
        ].filter(Boolean),
      )
      || hasReplayCanonicalLandedProgressCue(audit.landedProgressSummary)
    ) {
      landedProgressTurnCount += 1
    }
    if (hasReplayCanonicalOpenLoopCue(audit.openClosureSummary))
      openClosureTurnCount += 1
    if (hasReplayCanonicalNextClosureCue((audit as { nextClosureTargetSummary?: unknown }).nextClosureTargetSummary)) {
      nextClosureTargetTurnCount += 1
    }
    const continuitySummaryText = typeof audit.continuitySummary === 'string'
      ? audit.continuitySummary.trim()
      : ''
    const emotionalClosureSummary = typeof (audit as { emotionalClosureSummary?: unknown }).emotionalClosureSummary === 'string'
      ? ((audit as { emotionalClosureSummary?: string }).emotionalClosureSummary?.trim() ?? '')
      : ''
    const carriesEmotionalClosureSummary = emotionalClosureSummary.length > 0
      || /\bclosure=([^|]+?)(?:\s*\|\s*|$)/i.test(continuitySummaryText)
    if (carriesEmotionalClosureSummary)
      emotionalClosureTurnCount += 1
    const carriesAuditPreDialogueAwareness = typeof audit.preDialogueAwarenessSummary === 'string'
      && audit.preDialogueAwarenessSummary.trim().length > 0
    const structuredSameHerSummaryLine = typeof structuredProjectState.summaryLine === 'string'
      && structuredProjectState.summaryLine.trim().length > 0
      && !isAlicizationThinProjectAwarenessLine(structuredProjectState.summaryLine)
      && hasReplaySameHerProjectStateCue(structuredProjectState.summaryLine)
      ? structuredProjectState.summaryLine
      : null
    const structuredPreDialogueAwareness = [
      structuredProjectState.companionHeadlineLine,
      structuredProjectState.companionBriefingLine,
      structuredProjectState.awarenessLine,
      structuredSameHerSummaryLine,
      structuredProjectState.preDialogueAwarenessLine,
    ].find((value): value is string =>
      typeof value === 'string'
      && value.trim().length > 0
      && !isAlicizationThinProjectAwarenessLine(value),
    ) ?? null
    const carriesStructuredPreDialogueAwareness = typeof structuredPreDialogueAwareness === 'string'
      && structuredPreDialogueAwareness.trim().length > 0
    const resolvedPreDialogueAwareness = carriesAuditPreDialogueAwareness
      ? audit.preDialogueAwarenessSummary
      : carriesStructuredPreDialogueAwareness
        ? structuredPreDialogueAwareness
        : null
    const carriesPreDialogueAwareness = typeof resolvedPreDialogueAwareness === 'string'
      && resolvedPreDialogueAwareness.trim().length > 0
    if (carriesPreDialogueAwareness)
      preDialogueAwarenessTurnCount += 1
    const carriesRichPreDialogueAwareness = carriesPreDialogueAwareness
      && hasReplaySameHerProjectStateCue(resolvedPreDialogueAwareness)
    if (carriesRichPreDialogueAwareness)
      richPreDialogueAwarenessTurnCount += 1
    const carriesContinuitySummary = typeof audit.continuitySummary === 'string'
      && audit.continuitySummary.trim().length > 0
    if (carriesContinuitySummary)
      continuitySummaryTurnCount += 1
    const embodimentClosureSummary = typeof (audit as { embodimentClosureSummary?: unknown }).embodimentClosureSummary === 'string'
      ? ((audit as { embodimentClosureSummary?: string }).embodimentClosureSummary?.trim() ?? '')
      : ''
    const carriesEmbodimentClosureSummary = embodimentClosureSummary.length > 0
    if (carriesEmbodimentClosureSummary) {
      embodimentClosureTurnCount += 1
    }
    if (carriesPreDialogueClosure)
      preDialogueClosureTurnCount += 1
    const currentPhaseContent = (audit as { currentPhaseSummary?: unknown }).currentPhaseSummary
    const nextClosureTargetContent = (audit as { nextClosureTargetSummary?: unknown }).nextClosureTargetSummary
    const hasCurrentPhaseContent = typeof currentPhaseContent === 'string'
      && currentPhaseContent.trim().length > 0
    const hasLandedProgressContent = typeof audit.landedProgressSummary === 'string'
      && audit.landedProgressSummary.trim().length > 0
    const hasOpenClosureContent = typeof audit.openClosureSummary === 'string'
      && audit.openClosureSummary.trim().length > 0
    const hasNextClosureTargetContent = typeof nextClosureTargetContent === 'string'
      && nextClosureTargetContent.trim().length > 0
    const carriesAuditSameHerOnly = hasReplaySameHerProjectStateCue(audit?.sameHerSummary)
      && !carriesStructuredSameHerSelfLine
      && !hasReplaySameHerProjectStateCue(structuredProjectState.preDialogueAwarenessLine)
    const carriesSameHerSelfLine = carriesStructuredSameHerSelfLine
      || (hasReplaySameHerProjectStateCue(audit?.sameHerSummary) && !carriesAuditSameHerOnly)
    if (carriesSameHerSelfLine) {
      sameHerSelfLineTurnCount += 1
    }
    if (
      carriesSameHerSummary
      && hasCurrentPhaseContent
      && hasLandedProgressContent
      && hasOpenClosureContent
      && hasNextClosureTargetContent
      && carriesEmotionalClosureSummary
      && carriesPreDialogueAwareness
      && carriesContinuitySummary
      && carriesEmbodimentClosureSummary
      && carriesPreDialogueClosure
    ) {
      contentCompleteTurnCount += 1
    }
  }

  return comparedTurnCount > 0
    ? {
        comparedTurnCount,
        sameHerSummaryTurnCount,
        sameHerSelfLineTurnCount,
        ...(sameHerHoldDetailTurnCount > 0 ? { sameHerHoldDetailTurnCount } : {}),
        ...(continuityArcStageTurnCount > 0 ? { continuityArcStageTurnCount } : {}),
        ...(continuityCueTurnCount > 0 ? { continuityCueTurnCount } : {}),
        currentPhaseTurnCount,
        landedProgressTurnCount,
        openClosureTurnCount,
        nextClosureTargetTurnCount,
        emotionalClosureTurnCount,
        preDialogueAwarenessTurnCount,
        richPreDialogueAwarenessTurnCount,
        continuitySummaryTurnCount,
        embodimentClosureTurnCount,
        preDialogueClosureTurnCount,
        contentCompleteTurnCount,
        validationStatus,
        evidenceStatus,
      }
    : null
}

function readReplayAuthorityString(raw: unknown, maxChars = 64) {
  return typeof raw === 'string'
    ? raw.trim().slice(0, maxChars) || null
    : null
}

function readReplayPreparedEmbodimentAuthority(
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number],
) {
  const runtimeSurface = prepared.runtimeSurface ?? null
  const spine = runtimeSurface?.digitalLifeSpine ?? null
  const spineDigest = projectAlicizationDigitalLifeSpineDigest(spine)
  const legacySpineDigest = spineDigest as ({
    voice?: { residentMode?: unknown } | null
    face?: { residentMode?: unknown } | null
    action?: { residentMode?: unknown } | null
    lipSync?: { residentMode?: unknown } | null
    runtime?: { bodyLine?: unknown } | null
  } & typeof spineDigest) | null
  const mode = readReplayAuthorityString(spine?.architecture?.operatingMode, 64)
  const actionCue = readReplayAuthorityString(spineDigest?.runtime?.selectedAction, 64)
  const preferredPresence = readReplayAuthorityString(spineDigest?.runtime?.preferredPresence, 64)
  const voiceResidentMode = readReplayAuthorityString(legacySpineDigest?.voice?.residentMode, 64)
  const faceResidentMode = readReplayAuthorityString(legacySpineDigest?.face?.residentMode, 64)
  const motionResidentMode = readReplayAuthorityString(legacySpineDigest?.action?.residentMode, 64)
  const lipSyncResidentMode = readReplayAuthorityString(legacySpineDigest?.lipSync?.residentMode, 64)
  const bodyContinuityLine = readReplayAuthorityString(legacySpineDigest?.runtime?.bodyLine, 96)
  const rendererTarget = readReplayAuthorityString(prepared.performanceManifest?.renderer, 64)
  const actualAuthority = readReplayAuthorityString(prepared.turnGraph.surface?.actualAuthority, 64)
  const providerMindExecuted = typeof prepared.turnGraph.surface?.providerMindExecuted === 'boolean'
    ? prepared.turnGraph.surface.providerMindExecuted
    : null
  const expectedAuthority = readReplayAuthorityString(
    prepared.turnGraph.surface?.expectedAuthority
    ?? prepared.replyExecutionPlan?.expectedVisibleReplyAuthority
    ?? runtimeSurface?.replyExecutionPlan?.expectedVisibleReplyAuthority
    ?? runtimeSurface?.replyAuthority?.expectedVisibleReplyAuthority,
    64,
  )

  if (!mode && !actionCue && !preferredPresence && !voiceResidentMode && !faceResidentMode && !motionResidentMode && !lipSyncResidentMode && !bodyContinuityLine && !rendererTarget && !expectedAuthority && !actualAuthority && providerMindExecuted == null)
    return null

  return {
    embodimentScript: rendererTarget
      ? { rendererTarget }
      : null,
    visibleReply: {
      expectedAuthority,
      actualAuthority,
      providerMindExecuted,
    },
    digitalLife: {
      mode,
      preferredPresence,
      voice: {
        residentMode: voiceResidentMode,
      },
      face: {
        residentMode: faceResidentMode,
      },
      motion: {
        residentMode: motionResidentMode,
      },
      lipSync: {
        residentMode: lipSyncResidentMode,
      },
      bodyContinuity: {
        bodyLine: bodyContinuityLine,
      },
      action: {
        actionCue,
      },
    },
  }
}

function deriveReplayPresenceQuality(input: {
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
  sampledTurns: AlicizationReplayTurn[]
  quality: AlicizationRunReplayBenchmarkResult['quality']
}) {
  const totalTurns = input.turns.length
  if (totalTurns === 0) {
    return {
      quietCompanionshipCoverage: 0,
      silentPresenceNuisanceRate: 0,
      continuityMindCarryRate: 0,
      roomFirstCadenceRespectRate: 0,
      longRunSameHerClosureRate: 0,
      longRunSameHerSessionClosureRate: 0,
    }
  }

  const qualityByTurnId = new Map(input.quality.map(item => [item.turnId, item]))
  const sampledTurnById = new Map(input.sampledTurns.map(turn => [turn.turnId, turn]))
  const replayRows = input.turns.map((prepared, index) => {
    const sampledTurn = sampledTurnById.get(input.quality[index]?.turnId ?? '')
      ?? input.sampledTurns[index]
      ?? null
    return {
      prepared,
      sampledTurn,
      quality: sampledTurn ? qualityByTurnId.get(sampledTurn.turnId) ?? null : null,
    }
  }).filter((row): row is {
    prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
    sampledTurn: AlicizationReplayTurn
    quality: AlicizationRunReplayBenchmarkResult['quality'][number]
  } => Boolean(row.sampledTurn && row.quality))

  const quietCompanionshipApplicable = replayRows.filter(({ sampledTurn }) =>
    sampledTurn.sampledCategories?.includes('dialogue')
    || sampledTurn.sampledCategories?.includes('repair')
    || sampledTurn.sampledCategories?.includes('repair-arc'),
  )
  const quietCompanionshipCovered = quietCompanionshipApplicable.filter(({ quality }) => {
    return quality.dialogueRhythmStability === 'pass'
      && quality.emptyCareRate !== 'fail'
      && quality.warmthTemplateRisk !== 'fail'
  })

  const silentPresenceNuisanceApplicable = replayRows.filter(({ sampledTurn }) =>
    sampledTurn.sampledCategories?.includes('dialogue')
    || sampledTurn.sampledCategories?.includes('proactive')
    || sampledTurn.sampledCategories?.includes('deferred-followup'),
  )
  const silentPresenceNuisanceFails = silentPresenceNuisanceApplicable.filter(({ quality }) => {
    return quality.emptyCareRate === 'fail'
      || quality.repairMechanicalRate === 'fail'
      || quality.warmthTemplateRisk === 'fail'
      || quality.relationshipDistanceJumpRate === 'fail'
  })

  const continuityCarryApplicable = replayRows.filter(({ sampledTurn }) =>
    sampledTurn.sampledCategories?.includes('procedure-carry')
    || sampledTurn.sampledCategories?.includes('stable-core')
    || sampledTurn.sampledCategories?.includes('long-horizon')
    || sampledTurn.sampledCategories?.includes('general-memory'),
  )
  const continuityCarryHits = continuityCarryApplicable.filter(({ prepared, quality, sampledTurn }) => {
    return quality.procedureCarryQuality === 'pass'
      || quality.replyMemoryCoherence === 'pass'
      || quality.afterglowFalseCarryRate === 'pass'
      || hasReplayExecutionCallbackProjectStateCarry({
        prepared,
        sampledTurn,
      })
  })

  const roomFirstCadenceApplicable = replayRows.filter(({ prepared, sampledTurn }) => {
    const quality = evaluateReplayMemoryQuality({
      prepared,
      turnId: prepared.turnGraph.ids.turnId,
      userText: sampledTurn.userText,
    })
    return quality.closenessLadderDrift === 'pass'
      || sampledTurn.sampledCategories?.includes('quiet-companionship')
      || sampledTurn.sampledCategories?.includes('presence-quality')
  })
  const roomFirstCadenceHits = roomFirstCadenceApplicable.filter(({ quality }) => {
    return quality.closenessLadderDrift !== 'fail'
      && quality.dialogueRhythmStability !== 'fail'
      && quality.emptyCareRate !== 'fail'
      && quality.relationshipDistanceJumpRate !== 'fail'
  })
  const longRunSameHerClosureApplicable = replayRows.filter(row => isReplayLongRunSameHerClosureApplicable(row))
  const longRunSameHerClosureHits = longRunSameHerClosureApplicable.filter(row => hasReplayLongRunSameHerClosureHit(row))
  const longRunSameHerSessionSummary = buildReplayLongRunSameHerSessionSummary({
    rows: longRunSameHerClosureApplicable,
  })

  return {
    quietCompanionshipCoverage: clampPresenceMetric(
      quietCompanionshipApplicable.length === 0
        ? 1
        : quietCompanionshipCovered.length / quietCompanionshipApplicable.length,
    ),
    silentPresenceNuisanceRate: clampPresenceMetric(
      silentPresenceNuisanceApplicable.length === 0
        ? 0
        : silentPresenceNuisanceFails.length / silentPresenceNuisanceApplicable.length,
    ),
    continuityMindCarryRate: clampPresenceMetric(
      continuityCarryApplicable.length === 0
        ? 1
        : continuityCarryHits.length / continuityCarryApplicable.length,
    ),
    roomFirstCadenceRespectRate: clampPresenceMetric(
      roomFirstCadenceApplicable.length === 0
        ? 1
        : roomFirstCadenceHits.length / roomFirstCadenceApplicable.length,
    ),
    longRunSameHerClosureRate: clampPresenceMetric(
      longRunSameHerClosureApplicable.length === 0
        ? 1
        : longRunSameHerClosureHits.length / longRunSameHerClosureApplicable.length,
    ),
    longRunSameHerSessionClosureRate: longRunSameHerSessionSummary?.sessionClosureRate ?? 1,
  }
}

function buildReplayLongRunSameHerSessionRows(input: {
  source: AlicizationReplayBenchmarkResolvedTurnSource
  rows: Array<{
    prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
    sampledTurn: AlicizationReplayTurn
    quality: AlicizationRunReplayBenchmarkResult['quality'][number]
  }>
}): AlicizationReplayLongRunSameHerSessionRow[] {
  if (input.rows.length === 0)
    return []

  const rowsBySessionId = new Map<string, typeof input.rows>()
  for (const row of input.rows) {
    const sessionId = sanitizeReplayBenchmarkSampleText(
      row.sampledTurn.tracePointer?.sessionId
      ?? row.prepared.turnGraph.ids.sessionId
      ?? '',
    )
    if (!sessionId)
      continue
    const rows = rowsBySessionId.get(sessionId) ?? []
    rows.push(row)
    rowsBySessionId.set(sessionId, rows)
  }

  const sessions = [...rowsBySessionId.entries()]
  if (sessions.length === 0)
    return []

  return sessions.map(([sessionId, rows]) => {
    const chronologicalRows = rows
      .map((row, index) => ({ index, row }))
      .sort((left, right) => {
        const leftCreatedAt = Number(left.row.sampledTurn.createdAt ?? 0)
        const rightCreatedAt = Number(right.row.sampledTurn.createdAt ?? 0)
        return leftCreatedAt - rightCreatedAt || left.index - right.index
      })
      .map(entry => entry.row)
    const turnDiagnostics = chronologicalRows.map(row => buildReplayLongRunSameHerTurnDiagnostics(row))
    const transitionDiagnostics = buildReplayLongRunSameHerTransitionDiagnostics(chronologicalRows)
    const hitCount = turnDiagnostics.filter(row => row.missingLanes.length === 0).length
    const transitionCount = transitionDiagnostics.length
    const closedTransitionCount = transitionDiagnostics.filter(row => isReplayLongRunSameHerTransitionClosed(row)).length
    const requiredConsecutiveTransitionCount = Math.max(0, replayLongRunSameHerMinimumSessionTurns - 1)
    const maxConsecutiveClosedTransitionCount = countReplayMaxConsecutiveClosedSameHerTransitions(transitionDiagnostics)
    const failedMemoryMetabolismTransitionCount = transitionDiagnostics.filter(row => row.memoryMetabolismInfluencedNext === false).length
    const failedSameHerTransitionCount = transitionCount - closedTransitionCount
    const eventRoleCoverage = mergeReplayLongRunSameHerEventRoleCoverage(chronologicalRows)
    const eventRoleDiagnostics = buildReplayLongRunSameHerEventRoleDiagnostics(chronologicalRows)
    const maxConsecutiveEventRoleProofTurnCount = countReplayMaxConsecutiveCompleteEventRoleTurnsFromDiagnostics(eventRoleDiagnostics)
    const hasMinimumLongRunTurns = chronologicalRows.length >= replayLongRunSameHerMinimumSessionTurns
    const hasConsecutiveSameHerTransitionProof = maxConsecutiveClosedTransitionCount >= requiredConsecutiveTransitionCount
    const requiresEventRoleProof = hasMinimumLongRunTurns
      && hitCount >= chronologicalRows.length
      && failedSameHerTransitionCount <= 0
      && hasConsecutiveSameHerTransitionProof
    const hasConsecutiveEventRoleProof = maxConsecutiveEventRoleProofTurnCount >= replayLongRunSameHerMinimumSessionTurns
    const memoryMetabolismCoverage = mergeReplayLongRunSameHerMemoryMetabolismCoverage(chronologicalRows)
    const requiresMemoryMetabolismProof = requiresEventRoleProof
      && eventRoleCoverage.missingRoles.length === 0
      && hasConsecutiveEventRoleProof
    const memoryIdentityContinuity = readReplayLongRunSameHerMemoryIdentityContinuity(chronologicalRows)
    const requiresMemoryIdentityContinuity = requiresMemoryMetabolismProof
      && memoryMetabolismCoverage.missingProofs.length === 0
      && memoryIdentityContinuity.dominantMemoryIds.length > 0
    const requiresMemoryMetabolismTransitionProof = requiresMemoryMetabolismProof
      && memoryMetabolismCoverage.missingProofs.length === 0
    const runtimeEvidence = buildReplayLongRunSameHerSessionRuntimeEvidence({
      source: input.source,
      rows: chronologicalRows,
    })
    const requiresRuntimeDecisionTraceProvenance = (
      input.source === 'runtime-sampling-backlog'
      || input.source === 'mixed-runtime-and-conversation'
      || input.source === 'conversation-sample'
    )
    const failureReasons: AlicizationReplayLongRunSameHerFailureReason[] = []
    if (chronologicalRows.length < 2)
      failureReasons.push('single-turn-session')
    else if (!hasMinimumLongRunTurns)
      failureReasons.push('too-short-noisy-desktop-run')
    if (hitCount < chronologicalRows.length)
      failureReasons.push('missing-same-her-closure-turn')
    if (failedSameHerTransitionCount > 0 || (hasMinimumLongRunTurns && !hasConsecutiveSameHerTransitionProof))
      failureReasons.push('missing-same-her-transition')
    if (requiresEventRoleProof && eventRoleCoverage.missingRoles.length > 0)
      failureReasons.push('missing-noisy-desktop-event-role-proof')
    if (requiresEventRoleProof && eventRoleCoverage.missingRoles.length === 0 && !hasConsecutiveEventRoleProof)
      failureReasons.push('missing-consecutive-noisy-desktop-event-role-proof')
    if (requiresMemoryMetabolismProof && memoryMetabolismCoverage.missingProofs.length > 0)
      failureReasons.push('missing-memory-metabolism-proof')
    if (requiresMemoryMetabolismTransitionProof && failedMemoryMetabolismTransitionCount > 0)
      failureReasons.push('missing-memory-metabolism-transition')
    if (requiresMemoryIdentityContinuity && !memoryIdentityContinuity.stable)
      failureReasons.push('missing-memory-identity-continuity')
    if (requiresRuntimeDecisionTraceProvenance && !runtimeEvidence.allTurnsRuntimeSourced)
      failureReasons.push('missing-runtime-decision-trace-provenance')
    return {
      sessionId,
      status: failureReasons.length === 0 ? 'closed' as const : 'insufficient' as const,
      turnCount: chronologicalRows.length,
      hitCount,
      transitionCount,
      closedTransitionCount,
      requiredConsecutiveTransitionCount,
      maxConsecutiveClosedTransitionCount,
      ...(requiresEventRoleProof ? { maxConsecutiveEventRoleProofTurnCount } : {}),
      turnIds: chronologicalRows.map(row => row.sampledTurn.turnId),
      failureReasons,
      runtimeEvidence,
      ...(requiresEventRoleProof ? { eventRoleCoverage } : {}),
      ...(requiresEventRoleProof && (eventRoleCoverage.missingRoles.length > 0 || !hasConsecutiveEventRoleProof) ? { eventRoleDiagnostics } : {}),
      ...(requiresMemoryMetabolismProof ? { memoryMetabolismCoverage } : {}),
      ...(requiresMemoryIdentityContinuity ? { memoryIdentityContinuity } : {}),
      transitionDiagnostics,
      turnDiagnostics,
    }
  }).sort((left, right) => {
    if (left.status !== right.status)
      return left.status === 'insufficient' ? -1 : 1
    return right.turnCount - left.turnCount || left.sessionId.localeCompare(right.sessionId)
  })
}

function buildReplayLongRunSameHerSessionSummaryFromSessionRows(
  sessionRows: AlicizationReplayLongRunSameHerSessionRow[],
): AlicizationReplayLongRunSameHerSessionSummary {
  const closedSessionCount = sessionRows.filter(row => row.status === 'closed').length
  const singleTurnSessionCount = sessionRows.filter(row => row.failureReasons.includes('single-turn-session')).length
  const insufficientSessionCount = sessionRows.filter(row => row.status === 'insufficient').length

  return {
    comparedSessionCount: sessionRows.length,
    closedSessionCount,
    singleTurnSessionCount,
    insufficientSessionCount,
    sessionClosureRate: sessionRows.length === 0
      ? 0
      : clampPresenceMetric(closedSessionCount / sessionRows.length),
    sessions: sessionRows.slice(0, 8),
  }
}

function buildReplayLongRunSameHerSessionRuntimeEvidence(input: {
  source: AlicizationReplayBenchmarkResolvedTurnSource
  rows: Array<{
    prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
    sampledTurn: AlicizationReplayTurn
  }>
}): AlicizationReplayLongRunSameHerSessionRow['runtimeEvidence'] {
  const decisionTraceTurnCount = input.rows.filter((row) => {
    const tracePointer = row.sampledTurn.tracePointer
    return tracePointer?.kind === 'decision-trace'
      && typeof tracePointer.decisionTraceId === 'string'
      && tracePointer.decisionTraceId.trim().length > 0
  }).length
  const runtimeSource = input.source === 'runtime-sampling-backlog'
    || input.source === 'conversation-sample'
    || input.source === 'mixed-runtime-and-conversation'
  const runtimeTurnCount = runtimeSource ? decisionTraceTurnCount : 0
  const syntheticTurnCount = input.rows.length - runtimeTurnCount

  return {
    source: input.source,
    runtimeTurnCount,
    decisionTraceTurnCount,
    syntheticTurnCount,
    allTurnsRuntimeSourced: input.rows.length > 0 && runtimeTurnCount === input.rows.length,
  }
}

function buildReplayLongRunSameHerSessionSummary(input: {
  source?: AlicizationReplayBenchmarkResolvedTurnSource
  rows: Array<{
    prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
    sampledTurn: AlicizationReplayTurn
    quality: AlicizationRunReplayBenchmarkResult['quality'][number]
  }>
}): AlicizationReplayLongRunSameHerSessionSummary | null {
  if (input.rows.length === 0)
    return null

  return buildReplayLongRunSameHerSessionSummaryFromSessionRows(
    buildReplayLongRunSameHerSessionRows({
      source: input.source ?? 'unknown',
      rows: input.rows,
    }),
  )
}

function buildReplayLongRunSameHerSessionSummaryFromReplay(input: {
  source: AlicizationReplayBenchmarkResolvedTurnSource
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
  sampledTurns: AlicizationReplayTurn[]
  quality: AlicizationRunReplayBenchmarkResult['quality']
}) {
  const qualityByTurnId = new Map(input.quality.map(item => [item.turnId, item]))
  const sampledTurnById = new Map(input.sampledTurns.map(turn => [turn.turnId, turn]))
  const rows = input.turns.map((prepared, index) => {
    const sampledTurn = sampledTurnById.get(input.quality[index]?.turnId ?? '')
      ?? input.sampledTurns[index]
      ?? null
    const quality = sampledTurn ? qualityByTurnId.get(sampledTurn.turnId) ?? null : null
    return sampledTurn && quality
      ? { prepared, sampledTurn, quality }
      : null
  }).filter((row): row is {
    prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
    sampledTurn: AlicizationReplayTurn
    quality: AlicizationRunReplayBenchmarkResult['quality'][number]
  } => Boolean(row))

  const sessionRows = buildReplayLongRunSameHerSessionRows({
    source: input.source,
    rows: rows.filter(row => isReplayLongRunSameHerClosureApplicable(row)),
  })
  return {
    summary: sessionRows.length === 0
      ? null
      : buildReplayLongRunSameHerSessionSummaryFromSessionRows(sessionRows),
    sessionRows,
  }
}

function replayDecisionTraceIdFromPointer(
  tracePointer: AlicizationReplayLongRunSameHerSessionRow['turnDiagnostics'][number]['tracePointer'] | undefined,
) {
  if (tracePointer?.kind !== 'decision-trace')
    return ''
  return typeof tracePointer.decisionTraceId === 'string'
    ? tracePointer.decisionTraceId.trim()
    : ''
}

function replayTracePointerText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isRuntimeSamplingTraceRecordBoundToPointer(
  record: AlicizationMemoryDecisionTraceRecord,
  tracePointer: AlicizationReplayLongRunSameHerSessionRow['turnDiagnostics'][number]['tracePointer'] | undefined,
) {
  if (tracePointer?.kind !== 'decision-trace')
    return false

  const decisionTraceId = replayDecisionTraceIdFromPointer(tracePointer)
  if (!decisionTraceId || replayTracePointerText(record.decisionTraceId) !== decisionTraceId)
    return false

  const pointerTurnId = replayTracePointerText(tracePointer.turnId)
  const pointerSessionId = replayTracePointerText(tracePointer.sessionId)
  const recordTurnId = replayTracePointerText(record.turnId)
  const recordSessionId = replayTracePointerText(record.sessionId)

  return (!pointerTurnId || recordTurnId === pointerTurnId)
    && (!pointerSessionId || recordSessionId === pointerSessionId)
}

function isRuntimeSamplingMindTurnEventBoundToPointer(
  event: AlicizationMindTurnEventRecord,
  tracePointer: AlicizationReplayTurn['tracePointer'] | undefined,
) {
  if (tracePointer?.kind !== 'decision-trace')
    return false

  const pointerDecisionTraceId = replayTracePointerText(tracePointer.decisionTraceId)
  if (!pointerDecisionTraceId || replayTracePointerText(event.decisionTraceId) !== pointerDecisionTraceId)
    return false

  const pointerTurnId = replayTracePointerText(tracePointer.turnId)
  const pointerSessionId = replayTracePointerText(tracePointer.sessionId)
  const eventTurnId = replayTracePointerText(event.turnId)
  const eventSessionId = replayTracePointerText(event.sessionId)

  return (!pointerTurnId || eventTurnId === pointerTurnId)
    && (!pointerSessionId || eventSessionId === pointerSessionId)
}

function runtimeSamplingTraceRecordsBoundToTurn(
  turn: AlicizationReplayLongRunSameHerSessionRow['turnDiagnostics'][number],
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>,
) {
  const decisionTraceId = replayDecisionTraceIdFromPointer(turn.tracePointer)
  if (!decisionTraceId)
    return []

  return (traceRecordsByDecisionTraceId?.get(decisionTraceId) ?? [])
    .filter(record => isRuntimeSamplingTraceRecordBoundToPointer(record, turn.tracePointer))
}

function uniqueReplayDecisionTraceIdsFromRecords(records: AlicizationMemoryDecisionTraceRecord[]) {
  return new Set(
    records
      .map(record => record.decisionTraceId.trim())
      .filter(Boolean),
  )
}

function runtimeSamplingTraceRecordsByDecisionTraceId(records: AlicizationMemoryDecisionTraceRecord[]) {
  const byDecisionTraceId = new Map<string, AlicizationMemoryDecisionTraceRecord[]>()
  for (const record of records) {
    const decisionTraceId = record.decisionTraceId.trim()
    if (!decisionTraceId)
      continue
    byDecisionTraceId.set(decisionTraceId, [
      ...(byDecisionTraceId.get(decisionTraceId) ?? []),
      record,
    ])
  }
  return byDecisionTraceId
}

function extractRuntimeSamplingMemoryClosureTrace(record: AlicizationMemoryDecisionTraceRecord) {
  const spine = isRuntimeSamplingPlainObject(record.governance?.digitalLifeSpine)
    ? record.governance.digitalLifeSpine as Record<string, unknown>
    : null
  const memory = isRuntimeSamplingPlainObject(spine?.memory)
    ? spine.memory
    : null
  return isRuntimeSamplingPlainObject(memory?.memoryClosureTrace)
    ? memory.memoryClosureTrace
    : isRuntimeSamplingPlainObject(spine?.memoryClosureTrace)
      ? spine.memoryClosureTrace
      : null
}

function runtimeSamplingMemoryClosureTraceText(record: AlicizationMemoryDecisionTraceRecord) {
  const memoryClosureTrace = extractRuntimeSamplingMemoryClosureTrace(record)
  if (!memoryClosureTrace)
    return ''

  const nextInfluence = isRuntimeSamplingPlainObject(memoryClosureTrace.nextInfluence)
    ? memoryClosureTrace.nextInfluence
    : null
  const initiativeInfluence = isRuntimeSamplingPlainObject(nextInfluence?.initiative)
    ? nextInfluence.initiative
    : null
  const executionInfluence = isRuntimeSamplingPlainObject(nextInfluence?.execution)
    ? nextInfluence.execution
    : null
  const emotionInfluence = isRuntimeSamplingPlainObject(nextInfluence?.emotion)
    ? nextInfluence.emotion
    : null
  const embodimentInfluence = isRuntimeSamplingPlainObject(nextInfluence?.embodiment)
    ? nextInfluence.embodiment
    : null
  return [
    memoryClosureTrace.authority,
    ...(Array.isArray(memoryClosureTrace.whySurface)
      ? memoryClosureTrace.whySurface
          .map(item => isRuntimeSamplingPlainObject(item) ? item.summary : null)
          .filter((value): value is string => typeof value === 'string')
      : []),
    initiativeInfluence?.reason,
    initiativeInfluence?.restraint,
    initiativeInfluence?.preferredTiming,
    executionInfluence?.carry,
    emotionInfluence?.reason,
    emotionInfluence?.afterglow,
    emotionInfluence?.residue,
    embodimentInfluence?.reason,
    embodimentInfluence?.cadence,
    ...(Array.isArray(memoryClosureTrace.reasonTags) ? memoryClosureTrace.reasonTags : []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function runtimeSamplingTraceRoleText(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records
    .flatMap(record => [
      runtimeSamplingFallbackTraceCategoryText(record),
      runtimeSamplingMemoryClosureTraceText(record),
    ])
    .filter(text => text.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function hasRuntimeSamplingTraceMemoryRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[], text: string) {
  const hasMemoryTrace = records.some(record =>
    Boolean(
      extractRuntimeSamplingMemoryClosureTrace(record)
      || record.recallAttribution
      || record.memoryDeliberationJudged
      || record.memoryResolutionLedger
      || extractReplayMemoryClosureExecution(record)
      || record.eventKinds.some(kind => kind.includes('memory') || kind.includes('recall')),
    ),
  )
  const hasMemoryRoleText = /memory-closure-trace|memory closure trace|why recall surfaced|recall surfaced|corrected memory|correction provenance|memory audit|memory-os|memory-reconsolidated|reconsolidat|downrank|suppressed|回忆.*浮现|修正|审计/u.test(text)
  return hasMemoryTrace && hasMemoryRoleText
}

function hasRuntimeSamplingTraceInitiativeOrExecutionRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[], text: string) {
  const hasMemoryClosureTraceWithRuntimeState = records.some(record =>
    Boolean(
      extractRuntimeSamplingMemoryClosureTrace(record)
      && runtimeSamplingTraceDerivedMindStateBundle(record),
    ),
  )
  const hasInitiativeOrExecutionTrace = records.some(record =>
    record.origin === 'subconscious-proactive'
    || Boolean(extractReplayMemoryClosureExecution(record))
    || record.eventKinds.some(kind =>
      kind.includes('dialogue')
      || kind.includes('learning')
      || kind.includes('memory-reconsolidated'),
    )
    || hasMemoryClosureTraceWithRuntimeState,
  )
  const hasInitiativeOrExecutionRoleText = /subconscious-proactive|proactive|initiative|execution callback|callback|kernel_initiative|主动|执行/u.test(text)
  return hasInitiativeOrExecutionTrace && hasInitiativeOrExecutionRoleText
}

function hasRuntimeSamplingTraceEmotionRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[], text: string) {
  const hasEmotionTrace = records.some(record =>
    isRuntimeSamplingPlainObject(record.derivedMindStateBundle)
    || Boolean(record.embodimentAuthority)
    || Boolean(extractReplayMemoryClosureExecution(record)),
  )
  const hasEmotionRoleText = /emotional_transition|emotional transition|emotional closure|emotional afterglow|afterglow|emotional residue|emotion|lower-pressure|quieter|情绪|余波/u.test(text)
  return hasEmotionTrace && hasEmotionRoleText
}

function hasRuntimeSamplingTraceEmbodimentRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[], text: string) {
  const hasEmbodimentTrace = records.some(record =>
    Boolean(record.embodimentAuthority)
    || isRuntimeSamplingPlainObject(record.derivedMindStateBundle)
    || Boolean(extractReplayMemoryClosureExecution(record)),
  )
  const hasEmbodimentRoleText = /embodiment|body|voice|face|motion|lipsync|lip sync|audible-body|kernel_embodiment|身体|语音|表情|动作|口型/u.test(text)
  return hasEmbodimentTrace && hasEmbodimentRoleText && hasReplayCrossModalEmbodimentModalities(text)
}

function runtimeSamplingTraceDerivedMindStateBundle(record: AlicizationMemoryDecisionTraceRecord) {
  return isRuntimeSamplingPlainObject(record.derivedMindStateBundle)
    ? record.derivedMindStateBundle as Record<string, unknown>
    : null
}

function hasRuntimeSamplingTraceMemoryClosureCausalityEvidence(text: string) {
  if (
    /does not say memory closure caused|not causally tied to memory closure|without memory closure causality/u.test(text)
  ) {
    return false
  }

  return /memory closure (?:emotional transition|carried|carries|carry|changed|changes|drove|drives|driving|softened|softens|lowered|lowers|anchored|anchors|derived)|through memory closure|because (?:the )?(?:corrected memory|audited memory|memory audit|memory closure|correction provenance)|corrected memory (?:downranked|changed|changes|keeps|carried|carries|drove|drives|softened|softens|lowered|lowers)|memory audit (?:changed|changes|carried|carries|drove|drives)|correction provenance (?:changed|changes|carried|carries|drove|drives)|downranked stale [^.]*?(?:afterglow|emotion|embodiment|body|voice|face|motion|lipsync)/u.test(text)
}

function hasRuntimeSamplingStructuredMemoryClosureCausalityEvidence(
  ledger: Record<string, unknown>,
  affectedLane: 'emotion' | 'initiative' | 'execution' | 'embodiment',
) {
  const causality = isRuntimeSamplingPlainObject(ledger.memoryClosureCausality)
    ? ledger.memoryClosureCausality
    : null
  return causality?.causalSource === 'memory-closure-trace'
    && causality.affectedLane === affectedLane
    && causality.causedByMemoryClosure === true
}

function readRuntimeSamplingMemoryClosureCausalityIdentityKey(ledger: Record<string, unknown> | null) {
  const causality = isRuntimeSamplingPlainObject(ledger?.memoryClosureCausality)
    ? ledger.memoryClosureCausality as Record<string, unknown>
    : null
  const memoryIdentity = isRuntimeSamplingPlainObject(causality?.memoryIdentity)
    ? causality.memoryIdentity as Record<string, unknown>
    : null
  const continuityKey = typeof memoryIdentity?.continuityKey === 'string'
    ? memoryIdentity.continuityKey.trim().toLowerCase()
    : ''
  if (continuityKey)
    return continuityKey

  const reasonTagKeys = Array.isArray(memoryIdentity?.reasonTags)
    ? memoryIdentity.reasonTags
        .map((tag) => {
          const text = String(tag ?? '').trim().toLowerCase()
          const match = /^memory-identity:(.+)$/u.exec(text)
          return match?.[1]?.trim() ?? ''
        })
        .filter(Boolean)
    : []
  if (reasonTagKeys.length > 0)
    return reasonTagKeys[0]!

  const selectedCandidateIds = Array.isArray(memoryIdentity?.selectedCandidateIds)
    ? memoryIdentity.selectedCandidateIds
        .map(id => String(id ?? '').trim().toLowerCase())
        .filter(Boolean)
    : []
  return selectedCandidateIds[0] ?? ''
}

function readRuntimeSamplingPhase1MemoryClosureFamilyKey(raw: unknown) {
  const text = String(raw ?? '').toLowerCase()
  return /铃兰-phase1-0621[a-z]?/iu.test(text)
    ? 'phase1-memory-closure-family:铃兰-phase1-0621'
    : ''
}

function readRuntimeSamplingMemoryClosureCausalityFamilyKey(ledger: Record<string, unknown> | null) {
  const causality = isRuntimeSamplingPlainObject(ledger?.memoryClosureCausality)
    ? ledger.memoryClosureCausality as Record<string, unknown>
    : null
  const memoryIdentity = isRuntimeSamplingPlainObject(causality?.memoryIdentity)
    ? causality.memoryIdentity as Record<string, unknown>
    : null
  const candidates = [
    memoryIdentity?.continuityKey,
    ...(Array.isArray(memoryIdentity?.selectedCandidateIds) ? memoryIdentity.selectedCandidateIds : []),
    ...(Array.isArray(memoryIdentity?.reasonTags) ? memoryIdentity.reasonTags : []),
    ...(Array.isArray(causality?.reasonTags) ? causality.reasonTags : []),
    causality?.summary,
  ]
  for (const candidate of candidates) {
    const key = readRuntimeSamplingPhase1MemoryClosureFamilyKey(candidate)
    if (key)
      return key
  }
  return ''
}

function readRuntimeSamplingTraceDownstreamStateMemoryIdentityFromRecords(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const concreteIdentityKeys: string[] = []
  const familyIdentityKeys: string[] = []
  for (const record of records) {
    const bundle = runtimeSamplingTraceDerivedMindStateBundle(record)
    const emotionalTransitionLedger = isRuntimeSamplingPlainObject(bundle?.emotionalTransitionLedger)
      ? bundle.emotionalTransitionLedger as Record<string, unknown>
      : null
    const initiativeSuppression = isRuntimeSamplingPlainObject(emotionalTransitionLedger?.initiativeSuppression)
      ? emotionalTransitionLedger.initiativeSuppression as Record<string, unknown>
      : null
    const learningExecutionState = isRuntimeSamplingPlainObject(bundle?.learningExecutionState)
      ? bundle.learningExecutionState as Record<string, unknown>
      : null
    const embodimentContinuityLedger = isRuntimeSamplingPlainObject(bundle?.embodimentContinuityLedger)
      ? bundle.embodimentContinuityLedger as Record<string, unknown>
      : null
    const laneLedgers = [
      emotionalTransitionLedger,
      initiativeSuppression,
      learningExecutionState,
      embodimentContinuityLedger,
    ]
    concreteIdentityKeys.push(...laneLedgers
      .map(readRuntimeSamplingMemoryClosureCausalityIdentityKey)
      .filter(Boolean))
    familyIdentityKeys.push(...laneLedgers
      .map(readRuntimeSamplingMemoryClosureCausalityFamilyKey)
      .filter(Boolean))
  }
  const uniqueConcreteIdentityKeys = [...new Set(concreteIdentityKeys)]
  const uniqueFamilyIdentityKeys = [...new Set(familyIdentityKeys)]
  const uniqueIdentityKeys = uniqueFamilyIdentityKeys.length === 1
    ? uniqueFamilyIdentityKeys
    : uniqueConcreteIdentityKeys
  return {
    stable: uniqueIdentityKeys.length === 1,
    identityKeys: uniqueIdentityKeys,
    concreteIdentityKeys: uniqueConcreteIdentityKeys,
  }
}

function readRuntimeSamplingTraceDownstreamStateMemoryIdentityMatchKeys(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const downstreamRecords = selectRuntimeSamplingDownstreamStateEvidenceRecords(records)
  const identity = readRuntimeSamplingTraceDownstreamStateMemoryIdentityFromRecords(downstreamRecords)
  return [...new Set([
    ...identity.identityKeys,
    ...identity.concreteIdentityKeys,
  ])]
}

function readRuntimeSamplingTraceDownstreamStateMemoryIdentity(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return readRuntimeSamplingTraceDownstreamStateMemoryIdentityFromRecords(
    selectRuntimeSamplingDownstreamStateEvidenceRecords(records),
  )
}

function buildRuntimeSamplingTraceMemoryIdentityContinuity(input: {
  sessions: AlicizationReplayLongRunSameHerSessionRow[]
  verifiedDecisionTraceIds: ReadonlySet<string>
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>
}) {
  const memoryIdentityTurnIds = new Set<string>()
  const missingMemoryIdentityTurnIds: string[] = []
  const transitionBreaks: string[] = []

  for (const session of input.sessions) {
    const sessionIdentityRows: Array<{ turnId: string, identityKeys: string[] }> = []
    for (const turn of session.turnDiagnostics) {
      const decisionTraceId = replayDecisionTraceIdFromPointer(turn.tracePointer)
      if (!decisionTraceId || !input.verifiedDecisionTraceIds.has(decisionTraceId))
        continue

      const traceRecords = runtimeSamplingTraceRecordsBoundToTurn(turn, input.traceRecordsByDecisionTraceId)
      if (!hasRuntimeSamplingTraceDownstreamStateEvidence(traceRecords))
        continue

      memoryIdentityTurnIds.add(turn.turnId)
      const memoryIdentity = readRuntimeSamplingTraceDownstreamStateMemoryIdentity(traceRecords)
      const identityKeys = memoryIdentity.stable ? memoryIdentity.identityKeys : []
      if (identityKeys.length === 0 && !missingMemoryIdentityTurnIds.includes(turn.turnId))
        missingMemoryIdentityTurnIds.push(turn.turnId)
      sessionIdentityRows.push({
        turnId: turn.turnId,
        identityKeys,
      })
    }

    for (let index = 0; index < sessionIdentityRows.length - 1; index += 1) {
      const current = sessionIdentityRows[index]
      const next = sessionIdentityRows[index + 1]
      if (!current || !next)
        continue

      const hasSharedIdentity = current.identityKeys.some(key => next.identityKeys.includes(key))
      if (!hasSharedIdentity)
        transitionBreaks.push(`${current.turnId}->${next.turnId}`)
    }
  }

  return {
    runtimeDownstreamStateMemoryIdentityTurnCount: memoryIdentityTurnIds.size,
    missingRuntimeDownstreamStateMemoryIdentityTurnCount: missingMemoryIdentityTurnIds.length,
    missingRuntimeDownstreamStateMemoryIdentityTurnIds: missingMemoryIdentityTurnIds,
    runtimeDownstreamStateMemoryIdentityTransitionBreakCount: transitionBreaks.length,
    runtimeDownstreamStateMemoryIdentityTransitionBreaks: transitionBreaks,
    allRuntimeDecisionTracesMemoryIdentityContinuous: missingMemoryIdentityTurnIds.length === 0
      && transitionBreaks.length === 0,
  }
}

function readRuntimeSamplingReplayVisibleMemoryIdentityKeys(
  turn: AlicizationReplayLongRunSameHerSessionRow['turnDiagnostics'][number],
) {
  return Array.isArray(turn.memoryIdentityKeys)
    ? [...new Set(
        turn.memoryIdentityKeys
          .map(key => String(key ?? '').trim().toLowerCase())
          .filter(Boolean),
      )]
    : []
}

function hasRuntimeSamplingExplicitUiMemoryClosureRuntimeEvidence(
  record: AlicizationMemoryDecisionTraceRecord,
  lane: RuntimeSamplingTraceMemoryHandoffLane,
) {
  if (record.origin !== 'user-turn')
    return false

  if (!record.eventKinds.some(kind => kind === 'governance-normalized' || kind === 'dialogue-emitted'))
    return false

  const memoryClosureTrace = extractRuntimeSamplingMemoryClosureTrace(record)
  const nextInfluence = isRuntimeSamplingPlainObject(memoryClosureTrace?.nextInfluence)
    ? memoryClosureTrace.nextInfluence as Record<string, unknown>
    : null
  const laneInfluence = isRuntimeSamplingPlainObject(nextInfluence?.[lane])
    ? nextInfluence[lane] as Record<string, unknown>
    : null
  if (!laneInfluence)
    return false

  const memoryIdentity = isRuntimeSamplingPlainObject(memoryClosureTrace?.memoryIdentity)
    ? memoryClosureTrace.memoryIdentity as Record<string, unknown>
    : null
  const continuityKey = typeof memoryIdentity?.continuityKey === 'string'
    ? memoryIdentity.continuityKey.trim()
    : ''
  const reasonTags = Array.isArray(memoryClosureTrace?.reasonTags)
    ? memoryClosureTrace.reasonTags.map(tag => String(tag ?? '').trim().toLowerCase())
    : []

  return continuityKey.length > 0
    && reasonTags.includes('memory-closure-trace')
    && (
      reasonTags.includes('fallback-memory-closure')
      || reasonTags.includes('why-surfaced')
      || reasonTags.some(tag => tag.startsWith('memory-reconsolidated'))
    )
}

function hasRuntimeSamplingTraceEmotionalStateEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records.some((record) => {
    const bundle = runtimeSamplingTraceDerivedMindStateBundle(record)
    const emotionalTransitionLedger = isRuntimeSamplingPlainObject(bundle?.emotionalTransitionLedger)
      ? bundle.emotionalTransitionLedger as Record<string, unknown>
      : null
    if (!emotionalTransitionLedger)
      return false

    const axisDeltas = isRuntimeSamplingPlainObject(emotionalTransitionLedger.axisDeltas)
      ? emotionalTransitionLedger.axisDeltas as Record<string, unknown>
      : null
    const changedAxes = Array.isArray(emotionalTransitionLedger.changedAxes)
      ? emotionalTransitionLedger.changedAxes.map(axis => String(axis ?? '').trim()).filter(Boolean)
      : []
    const hasChangedAxisDelta = changedAxes.some((axis) => {
      const delta = Number(axisDeltas?.[axis] ?? 0)
      return Number.isFinite(delta) && Math.abs(delta) > 0
    })
    const transitionKind = typeof emotionalTransitionLedger.transitionKind === 'string'
      ? emotionalTransitionLedger.transitionKind.trim().toLowerCase()
      : ''
    const hasConcreteEmotionMovement = changedAxes.length > 0
      && (
        hasChangedAxisDelta
        || (transitionKind.length > 0 && transitionKind !== 'stable')
      )
    const evidenceText = [
      emotionalTransitionLedger.transitionKind,
      emotionalTransitionLedger.traceSummary,
      emotionalTransitionLedger.replayLine,
      isRuntimeSamplingPlainObject(emotionalTransitionLedger.memoryWriteback)
        ? emotionalTransitionLedger.memoryWriteback.reason
        : null,
      isRuntimeSamplingPlainObject(emotionalTransitionLedger.embodimentDrive)
        ? emotionalTransitionLedger.embodimentDrive.reason
        : null,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase()
    return hasConcreteEmotionMovement
      && /afterglow|emotional|emotion|residue|callback|情绪|余波/u.test(evidenceText)
      && (
        hasRuntimeSamplingStructuredMemoryClosureCausalityEvidence(emotionalTransitionLedger, 'emotion')
        || hasRuntimeSamplingTraceMemoryClosureCausalityEvidence(evidenceText)
      )
  })
}

function hasRuntimeSamplingTraceInitiativeRuntimeEventEvidence(record: AlicizationMemoryDecisionTraceRecord) {
  if (record.origin === 'subconscious-proactive')
    return true
  if (hasRuntimeSamplingExplicitUiMemoryClosureRuntimeEvidence(record, 'initiative'))
    return true

  const dialogueEmitted = isRuntimeSamplingPlainObject(record.dialogueEmitted)
    ? record.dialogueEmitted as Record<string, unknown>
    : null
  const structuredFormat = typeof dialogueEmitted?.format === 'string'
    ? dialogueEmitted.format.trim().toLowerCase()
    : ''
  return structuredFormat === 'subconscious-proactive-v1'
    || structuredFormat === 'subconscious-proactive-llm-v1'
}

function hasRuntimeSamplingTraceInitiativeStateEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records.some((record) => {
    const bundle = runtimeSamplingTraceDerivedMindStateBundle(record)
    const emotionalTransitionLedger = isRuntimeSamplingPlainObject(bundle?.emotionalTransitionLedger)
      ? bundle.emotionalTransitionLedger as Record<string, unknown>
      : null
    const initiativeSuppression = isRuntimeSamplingPlainObject(emotionalTransitionLedger?.initiativeSuppression)
      ? emotionalTransitionLedger.initiativeSuppression as Record<string, unknown>
      : null
    if (!initiativeSuppression)
      return false

    const evidenceText = [
      initiativeSuppression.mode,
      initiativeSuppression.reason,
      emotionalTransitionLedger?.traceSummary,
      emotionalTransitionLedger?.replayLine,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase()
    return hasRuntimeSamplingTraceInitiativeRuntimeEventEvidence(record)
      && /initiative|proactive|opening|measured-return|restraint|callback|主动|开口|克制/u.test(evidenceText)
      && hasRuntimeSamplingStructuredMemoryClosureCausalityEvidence(initiativeSuppression, 'initiative')
  })
}

function hasRuntimeSamplingTraceExecutionRuntimeEventEvidence(record: AlicizationMemoryDecisionTraceRecord) {
  return Boolean(
    record.eventKinds.includes('learning-executed')
    || extractReplayMemoryClosureExecution(record)
    || hasRuntimeSamplingExplicitUiMemoryClosureRuntimeEvidence(record, 'execution'),
  )
}

function hasRuntimeSamplingTraceExecutionStateEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records.some((record) => {
    const bundle = runtimeSamplingTraceDerivedMindStateBundle(record)
    const learningExecutionState = isRuntimeSamplingPlainObject(bundle?.learningExecutionState)
      ? bundle.learningExecutionState as Record<string, unknown>
      : null
    if (!learningExecutionState)
      return false

    const activeLearningFocuses = Array.isArray(learningExecutionState.activeLearningFocuses)
      ? learningExecutionState.activeLearningFocuses.map(item => String(item ?? '').trim()).filter(Boolean)
      : []
    const evidenceText = [
      learningExecutionState.nextLearningAction,
      learningExecutionState.currentTaskId,
      learningExecutionState.lastCompletedSummary,
      learningExecutionState.lastFailureReason,
      ...activeLearningFocuses,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase()
    const hasExecutionStateCue = (
      /execution|callback|learning|verify|reflect|revise|internalize|record|执行|回调|学习|验证/u.test(evidenceText)
      || learningExecutionState.shouldRecord === true
      || learningExecutionState.shouldReflect === true
      || learningExecutionState.shouldVerify === true
      || learningExecutionState.shouldRevise === true
      || learningExecutionState.shouldInternalize === true
    )
    return hasRuntimeSamplingTraceExecutionRuntimeEventEvidence(record)
      && hasExecutionStateCue
      && hasRuntimeSamplingStructuredMemoryClosureCausalityEvidence(learningExecutionState, 'execution')
  })
}

function hasRuntimeSamplingTraceEmbodimentAuthoritySurfaceEvidence(record: AlicizationMemoryDecisionTraceRecord) {
  const embodimentAuthority = isRuntimeSamplingPlainObject(record.embodimentAuthority)
    ? record.embodimentAuthority as Record<string, unknown>
    : null
  const digitalLife = isRuntimeSamplingPlainObject(embodimentAuthority?.digitalLife)
    ? embodimentAuthority.digitalLife
    : null
  const voice = isRuntimeSamplingPlainObject(digitalLife?.voice)
    ? digitalLife.voice
    : null
  const face = isRuntimeSamplingPlainObject(digitalLife?.face)
    ? digitalLife.face
    : null
  const motion = isRuntimeSamplingPlainObject(digitalLife?.motion)
    ? digitalLife.motion
    : null
  const lipSync = isRuntimeSamplingPlainObject(digitalLife?.lipSync)
    ? digitalLife.lipSync
    : null
  const bodyContinuity = isRuntimeSamplingPlainObject(digitalLife?.bodyContinuity)
    ? digitalLife.bodyContinuity
    : null
  const hasStructuredRuntimeSurfaces = Boolean(
    typeof voice?.residentMode === 'string' && voice.residentMode.trim()
    && typeof face?.residentMode === 'string' && face.residentMode.trim()
    && typeof motion?.residentMode === 'string' && motion.residentMode.trim()
    && typeof lipSync?.residentMode === 'string' && lipSync.residentMode.trim()
    && typeof bodyContinuity?.bodyLine === 'string' && bodyContinuity.bodyLine.trim(),
  )
  const authorityText = [
    typeof voice?.residentMode === 'string' && voice.residentMode.trim()
      ? `voice_resident ${voice.residentMode}`
      : null,
    typeof face?.residentMode === 'string' && face.residentMode.trim()
      ? `face_resident ${face.residentMode}`
      : null,
    typeof motion?.residentMode === 'string' && motion.residentMode.trim()
      ? `motion_resident ${motion.residentMode}`
      : null,
    typeof lipSync?.residentMode === 'string' && lipSync.residentMode.trim()
      ? `lipsync_resident ${lipSync.residentMode}`
      : null,
    typeof bodyContinuity?.bodyLine === 'string' && bodyContinuity.bodyLine.trim()
      ? `body_line ${bodyContinuity.bodyLine}`
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
  return hasStructuredRuntimeSurfaces
    || (
      hasReplayCrossModalEmbodimentModalities(authorityText)
      && hasReplayCrossModalEmbodimentRuntimeSurfaceEvidence(authorityText)
    )
}

function hasRuntimeSamplingTraceEmbodimentContinuityLedgerStateEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records.some((record) => {
    const bundle = runtimeSamplingTraceDerivedMindStateBundle(record)
    const embodimentContinuityLedger = isRuntimeSamplingPlainObject(bundle?.embodimentContinuityLedger)
      ? bundle.embodimentContinuityLedger as Record<string, unknown>
      : null
    if (!embodimentContinuityLedger)
      return false

    const carryingLanes = Array.isArray(embodimentContinuityLedger.carryingLanes)
      ? embodimentContinuityLedger.carryingLanes.map(item => String(item ?? '').trim().toLowerCase())
      : []
    const hasStructuredLanes = replayRequiredCrossModalEmbodimentModalities.every(modality =>
      carryingLanes.includes(modality),
    )
    const evidenceText = [
      embodimentContinuityLedger.continuityPhase,
      embodimentContinuityLedger.traceSummary,
      embodimentContinuityLedger.replayLine,
      isRuntimeSamplingPlainObject(embodimentContinuityLedger.memoryWriteback)
        ? embodimentContinuityLedger.memoryWriteback.reason
        : null,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .toLowerCase()
    return hasRuntimeSamplingTraceEmbodimentAuthoritySurfaceEvidence(record)
      && (hasStructuredLanes || hasReplayCrossModalEmbodimentModalities(evidenceText))
      && (
        hasRuntimeSamplingStructuredMemoryClosureCausalityEvidence(embodimentContinuityLedger, 'embodiment')
        || hasRuntimeSamplingTraceMemoryClosureCausalityEvidence(evidenceText)
      )
  })
}

function runtimeSamplingTraceDownstreamProvenanceText(record: AlicizationMemoryDecisionTraceRecord) {
  const bundle = runtimeSamplingTraceDerivedMindStateBundle(record)
  const emotionalTransitionLedger = isRuntimeSamplingPlainObject(bundle?.emotionalTransitionLedger)
    ? bundle.emotionalTransitionLedger as Record<string, unknown>
    : null
  const initiativeSuppression = isRuntimeSamplingPlainObject(emotionalTransitionLedger?.initiativeSuppression)
    ? emotionalTransitionLedger.initiativeSuppression as Record<string, unknown>
    : null
  const learningExecutionState = isRuntimeSamplingPlainObject(bundle?.learningExecutionState)
    ? bundle.learningExecutionState as Record<string, unknown>
    : null
  const embodimentContinuityLedger = isRuntimeSamplingPlainObject(bundle?.embodimentContinuityLedger)
    ? bundle.embodimentContinuityLedger as Record<string, unknown>
    : null
  const memoryClosureTrace = extractRuntimeSamplingMemoryClosureTrace(record)
  const causalityReasonTags = (owner: Record<string, unknown> | null) => {
    const causality = isRuntimeSamplingPlainObject(owner?.memoryClosureCausality)
      ? owner.memoryClosureCausality as Record<string, unknown>
      : null
    return Array.isArray(causality?.reasonTags) ? causality.reasonTags : []
  }
  return [
    bundle?.summary,
    ...(Array.isArray(memoryClosureTrace?.reasonTags) ? memoryClosureTrace.reasonTags : []),
    ...(Array.isArray(emotionalTransitionLedger?.sourceTags) ? emotionalTransitionLedger.sourceTags : []),
    ...(Array.isArray(embodimentContinuityLedger?.sourceTags) ? embodimentContinuityLedger.sourceTags : []),
    ...causalityReasonTags(emotionalTransitionLedger),
    ...causalityReasonTags(initiativeSuppression),
    ...causalityReasonTags(learningExecutionState),
    ...causalityReasonTags(embodimentContinuityLedger),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function scoreRuntimeSamplingDownstreamStateEvidenceRecord(record: AlicizationMemoryDecisionTraceRecord) {
  const records = [record]
  let score = 0
  const provenanceText = runtimeSamplingTraceDownstreamProvenanceText(record)
  if (hasRuntimeSamplingTraceEmotionalStateEvidence(records))
    score += 40
  if (hasRuntimeSamplingTraceInitiativeStateEvidence(records))
    score += 40
  if (hasRuntimeSamplingTraceExecutionStateEvidence(records))
    score += 40
  if (hasRuntimeSamplingTraceEmbodimentContinuityLedgerStateEvidence(records))
    score += 40
  const identity = readRuntimeSamplingTraceDownstreamStateMemoryIdentityFromRecords(records)
  if (identity.stable && identity.identityKeys.length > 0)
    score += 30
  if (provenanceText.includes('runtime-derived-downstream-state'))
    score += 25
  if (
    provenanceText.includes('fallback-memory-closure')
    || provenanceText.includes('why-surfaced')
    || identity.identityKeys.some(key => key.startsWith('fallback:'))
  ) {
    score += 20
  }
  if (identity.identityKeys.some(key => key.startsWith('cluster:')))
    score -= 10
  if (record.eventKinds.includes('governance-normalized'))
    score += 5
  if (record.eventKinds.includes('persistence-written'))
    score += 5
  if (record.eventKinds.includes('dialogue-emitted'))
    score += 2
  return score
}

function selectRuntimeSamplingDownstreamStateEvidenceRecords(
  records: readonly AlicizationMemoryDecisionTraceRecord[],
) {
  if (records.length <= 1)
    return records

  const completeRecords = records.filter((record) => {
    const single = [record]
    return hasRuntimeSamplingTraceEmotionalStateEvidence(single)
      && hasRuntimeSamplingTraceInitiativeStateEvidence(single)
      && hasRuntimeSamplingTraceExecutionStateEvidence(single)
      && hasRuntimeSamplingTraceEmbodimentContinuityLedgerStateEvidence(single)
      && readRuntimeSamplingTraceDownstreamStateMemoryIdentityFromRecords(single).stable
  })
  if (completeRecords.length === 0)
    return records

  let selected = completeRecords[0]!
  let selectedScore = scoreRuntimeSamplingDownstreamStateEvidenceRecord(selected)
  for (const record of completeRecords.slice(1)) {
    const score = scoreRuntimeSamplingDownstreamStateEvidenceRecord(record)
    if (score <= selectedScore)
      continue
    selected = record
    selectedScore = score
  }
  return [selected]
}

function hasRuntimeSamplingTraceDownstreamStateEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  if (records.length === 0)
    return false

  return readRuntimeSamplingTraceDownstreamStateLanes(records).missingLanes.length === 0
}

function readRuntimeSamplingTraceDownstreamStateLanes(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const downstreamRecords = selectRuntimeSamplingDownstreamStateEvidenceRecords(records)
  const emotion = hasRuntimeSamplingTraceEmotionalStateEvidence(downstreamRecords)
  const initiative = hasRuntimeSamplingTraceInitiativeStateEvidence(downstreamRecords)
  const execution = hasRuntimeSamplingTraceExecutionStateEvidence(downstreamRecords)
  const embodiment = hasRuntimeSamplingTraceEmbodimentContinuityLedgerStateEvidence(downstreamRecords)
  const memoryIdentity = readRuntimeSamplingTraceDownstreamStateMemoryIdentity(downstreamRecords)
  const memoryIdentityStable = emotion && initiative && execution && embodiment
    ? memoryIdentity.stable
    : true
  const missingLanes: Array<'emotion' | 'initiative' | 'execution' | 'embodiment' | 'memoryIdentity'> = []
  if (!emotion)
    missingLanes.push('emotion')
  if (!initiative)
    missingLanes.push('initiative')
  if (!execution)
    missingLanes.push('execution')
  if (!embodiment)
    missingLanes.push('embodiment')
  if (!memoryIdentityStable)
    missingLanes.push('memoryIdentity')
  return {
    emotion,
    initiative,
    execution,
    embodiment,
    memoryIdentity: memoryIdentityStable,
    missingLanes,
  }
}

function hasRuntimeSamplingTraceSameHerRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  if (records.length === 0)
    return false

  const text = runtimeSamplingTraceRoleText(records)
  if (!text)
    return false

  return hasRuntimeSamplingTraceMemoryRoleEvidence(records, text)
    && hasRuntimeSamplingTraceInitiativeOrExecutionRoleEvidence(records, text)
    && hasRuntimeSamplingTraceEmotionRoleEvidence(records, text)
    && hasRuntimeSamplingTraceEmbodimentRoleEvidence(records, text)
}

function runtimeSamplingTraceMemoryMetabolismText(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records
    .flatMap(record => [
      runtimeSamplingFallbackTraceCategoryText(record),
      runtimeSamplingMemoryClosureTraceText(record),
      ...record.eventKinds,
    ])
    .filter(text => text.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function readRuntimeSamplingTraceMemoryMetabolismCoverage(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const text = runtimeSamplingTraceMemoryMetabolismText(records)
  const revision = /memory-reconsolidated|reconsolidat|revision|revised|revise|corrected|correction|self revision|update.*memory|修正|纠正|更新旧/u.test(text)
  const forgettingOrRestraint = /forget|downrank|down-rank|suppress|withhold|withheld|restraint|wrong-thread|wrong thread|internal-only|gist-only|stable core|遗忘|淡出|降权|抑制|克制/u.test(text)
  const auditability = /humanlike-memory-audit|memory audit|auditability|audit|traceable|traceability|provenance|correction provenance|审计|可追踪|溯源/u.test(text)
  const missingProofs: AlicizationReplayLongRunSameHerMemoryMetabolismProof[] = []
  if (!revision)
    missingProofs.push('revision')
  if (!forgettingOrRestraint)
    missingProofs.push('forgettingOrRestraint')
  if (!auditability)
    missingProofs.push('auditability')
  return {
    revision,
    forgettingOrRestraint,
    auditability,
    missingProofs,
  }
}

type RuntimeSamplingTraceMemoryHandoffLane = 'initiative' | 'execution' | 'emotion' | 'embodiment'

function runtimeSamplingTraceJoinedText(values: unknown[]) {
  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function readRuntimeSamplingTraceNextInfluenceLaneTexts(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const laneTexts = records.reduce<Record<RuntimeSamplingTraceMemoryHandoffLane, string[]>>((acc, record) => {
    const memoryClosureTrace = extractRuntimeSamplingMemoryClosureTrace(record)
    const nextInfluence = isRuntimeSamplingPlainObject(memoryClosureTrace?.nextInfluence)
      ? memoryClosureTrace.nextInfluence as Record<string, unknown>
      : null
    const initiative = isRuntimeSamplingPlainObject(nextInfluence?.initiative)
      ? nextInfluence.initiative as Record<string, unknown>
      : null
    const execution = isRuntimeSamplingPlainObject(nextInfluence?.execution)
      ? nextInfluence.execution as Record<string, unknown>
      : null
    const emotion = isRuntimeSamplingPlainObject(nextInfluence?.emotion)
      ? nextInfluence.emotion as Record<string, unknown>
      : null
    const embodiment = isRuntimeSamplingPlainObject(nextInfluence?.embodiment)
      ? nextInfluence.embodiment as Record<string, unknown>
      : null
    return {
      initiative: [...acc.initiative, runtimeSamplingTraceJoinedText([initiative?.reason, initiative?.restraint, initiative?.preferredTiming])],
      execution: [...acc.execution, runtimeSamplingTraceJoinedText([execution?.carry, execution?.nextLearningAction])],
      emotion: [...acc.emotion, runtimeSamplingTraceJoinedText([emotion?.reason, emotion?.afterglow, emotion?.residue])],
      embodiment: [...acc.embodiment, runtimeSamplingTraceJoinedText([
        embodiment?.reason,
        embodiment?.cadence,
        embodiment?.preferredVoiceMode,
        embodiment?.preferredLipsyncMode,
        embodiment?.preferredGazeMode,
      ])],
    }
  }, {
    initiative: [],
    execution: [],
    emotion: [],
    embodiment: [],
  })
  return {
    initiative: runtimeSamplingTraceJoinedText(laneTexts.initiative),
    execution: runtimeSamplingTraceJoinedText(laneTexts.execution),
    emotion: runtimeSamplingTraceJoinedText(laneTexts.emotion),
    embodiment: runtimeSamplingTraceJoinedText(laneTexts.embodiment),
  }
}

function readRuntimeSamplingTraceNextInfluenceLanes(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const laneTexts = readRuntimeSamplingTraceNextInfluenceLaneTexts(records)
  const lanes = {
    initiative: laneTexts.initiative.length > 0,
    execution: laneTexts.execution.length > 0,
    emotion: laneTexts.emotion.length > 0,
    embodiment: laneTexts.embodiment.length > 0,
  }
  const missingLanes: Array<'initiative' | 'execution' | 'emotion' | 'embodiment'> = []
  if (!lanes.initiative)
    missingLanes.push('initiative')
  if (!lanes.execution)
    missingLanes.push('execution')
  if (!lanes.emotion)
    missingLanes.push('emotion')
  if (!lanes.embodiment)
    missingLanes.push('embodiment')
  return {
    ...lanes,
    missingLanes,
  }
}

function runtimeSamplingTraceDownstreamCausalitySnapshots(record: AlicizationMemoryDecisionTraceRecord) {
  const bundle = runtimeSamplingTraceDerivedMindStateBundle(record)
  const emotionalTransitionLedger = isRuntimeSamplingPlainObject(bundle?.emotionalTransitionLedger)
    ? bundle.emotionalTransitionLedger as Record<string, unknown>
    : null
  const initiativeSuppression = isRuntimeSamplingPlainObject(emotionalTransitionLedger?.initiativeSuppression)
    ? emotionalTransitionLedger.initiativeSuppression as Record<string, unknown>
    : null
  const learningExecutionState = isRuntimeSamplingPlainObject(bundle?.learningExecutionState)
    ? bundle.learningExecutionState as Record<string, unknown>
    : null
  const embodimentContinuityLedger = isRuntimeSamplingPlainObject(bundle?.embodimentContinuityLedger)
    ? bundle.embodimentContinuityLedger as Record<string, unknown>
    : null
  const causalitySnapshot = (
    owner: Record<string, unknown> | null,
    extraText: unknown[] = [],
  ) => {
    const causality = isRuntimeSamplingPlainObject(owner?.memoryClosureCausality)
      ? owner.memoryClosureCausality as Record<string, unknown>
      : null
    return causality
      ? { causality, extraText }
      : null
  }
  return [
    causalitySnapshot(emotionalTransitionLedger, [
      emotionalTransitionLedger?.traceSummary,
      emotionalTransitionLedger?.replayLine,
      isRuntimeSamplingPlainObject(emotionalTransitionLedger?.memoryWriteback)
        ? emotionalTransitionLedger.memoryWriteback.reason
        : null,
      isRuntimeSamplingPlainObject(emotionalTransitionLedger?.embodimentDrive)
        ? emotionalTransitionLedger.embodimentDrive.reason
        : null,
    ]),
    causalitySnapshot(initiativeSuppression, [
      initiativeSuppression?.mode,
      initiativeSuppression?.reason,
      emotionalTransitionLedger?.traceSummary,
      emotionalTransitionLedger?.replayLine,
    ]),
    causalitySnapshot(learningExecutionState, [
      learningExecutionState?.nextLearningAction,
      learningExecutionState?.currentTaskId,
      learningExecutionState?.lastCompletedSummary,
      learningExecutionState?.lastFailureReason,
      ...(Array.isArray(learningExecutionState?.activeLearningFocuses) ? learningExecutionState.activeLearningFocuses : []),
    ]),
    causalitySnapshot(embodimentContinuityLedger, [
      embodimentContinuityLedger?.continuityPhase,
      embodimentContinuityLedger?.traceSummary,
      embodimentContinuityLedger?.replayLine,
      isRuntimeSamplingPlainObject(embodimentContinuityLedger?.memoryWriteback)
        ? embodimentContinuityLedger.memoryWriteback.reason
        : null,
    ]),
  ].filter((item): item is { causality: Record<string, unknown>, extraText: unknown[] } => Boolean(item))
}

function runtimeSamplingTraceCausalityHandoffText(
  item: { causality: Record<string, unknown>, extraText: unknown[] },
) {
  return [
    item.causality.summary,
    ...(Array.isArray(item.causality.reasonTags) ? item.causality.reasonTags : []),
    ...item.extraText,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function hasRuntimeSamplingTraceDownstreamHandoffCue(text: string) {
  const saysSameTurnOnly = /same turn|this turn|same-turn|这一轮|这一回合|本轮/u.test(text)
    && !/prior|previous|last turn|from the last|from previous|handoff|carried forward|carry forward|next-turn|next turn|上一轮|上一回合|上一次|刚才|承接|接过|带进/u.test(text)
  if (saysSameTurnOnly)
    return false

  const hasPriorSource = /prior recall|previous recall|last recall|prior memory|previous memory|last memory|previous turn|last turn|from the last|from previous|handoff|carried forward|carry forward|next-turn|next turn|上一轮|上一回合|上一次|刚才.*(?:回忆|记忆)|承接|接过|带进/u.test(text)
  const hasConsumption = /caused|changed|changes|shaped|drives|derived|consumed|lower-pressure|measured-return|restrained|carry|because|因为|改变|驱动|承接|放轻|克制/u.test(text)
  return hasPriorSource && hasConsumption
}

const runtimeSamplingTraceHandoffCuePatterns: Record<RuntimeSamplingTraceMemoryHandoffLane, {
  topic: RegExp
  change: RegExp
}> = {
  initiative: {
    topic: /proactive opening|proactive|opening|initiative|主动开口|主动|开口/u,
    change: /lower-pressure|low-pressure|measured-return|measured return|restraint|restrained|放轻|克制/u,
  },
  execution: {
    topic: /execution callback|callback|execution|learning|执行回调|回调|执行|学习/u,
    change: /generic helper|reset(?:ting)?|verify|carry|通用助手|重置|验证|承接/u,
  },
  emotion: {
    topic: /afterglow|residue|emotional|emotion|callback emotion|情绪余波|情绪|余波/u,
    change: /quieter|lower-pressure|low-pressure|restrained|emotional noise|放轻|安静|克制/u,
  },
  embodiment: {
    topic: /body|voice|face|motion|lipsync|lip sync|身体|语音|表情|动作|口型/u,
    change: /cadence|restrained|measured-return|measured return|same-her carry|节奏|克制|承接/u,
  },
}

function hasRuntimeSamplingTraceLaneSpecificHandoffCue(input: {
  lane: RuntimeSamplingTraceMemoryHandoffLane
  fromNextInfluenceText: string
  downstreamText: string
}) {
  const patterns = runtimeSamplingTraceHandoffCuePatterns[input.lane]
  return patterns.topic.test(input.fromNextInfluenceText)
    && patterns.topic.test(input.downstreamText)
    && patterns.change.test(input.fromNextInfluenceText)
    && patterns.change.test(input.downstreamText)
}

function readRuntimeSamplingTraceDownstreamHandoffLanes(
  records: readonly AlicizationMemoryDecisionTraceRecord[],
  fromNextInfluenceTexts: Record<RuntimeSamplingTraceMemoryHandoffLane, string>,
) {
  const lanes = records
    .flatMap(record => runtimeSamplingTraceDownstreamCausalitySnapshots(record))
    .reduce((acc, item) => {
      const text = runtimeSamplingTraceCausalityHandoffText(item)
      if (
        item.causality.causalSource !== 'memory-closure-trace'
        || item.causality.causedByMemoryClosure !== true
        || !hasRuntimeSamplingTraceDownstreamHandoffCue(text)
      ) {
        return acc
      }

      switch (item.causality.affectedLane) {
        case 'emotion':
          return {
            ...acc,
            emotion: acc.emotion || hasRuntimeSamplingTraceLaneSpecificHandoffCue({
              lane: 'emotion',
              fromNextInfluenceText: fromNextInfluenceTexts.emotion,
              downstreamText: text,
            }),
          }
        case 'initiative':
          return {
            ...acc,
            initiative: acc.initiative || hasRuntimeSamplingTraceLaneSpecificHandoffCue({
              lane: 'initiative',
              fromNextInfluenceText: fromNextInfluenceTexts.initiative,
              downstreamText: text,
            }),
          }
        case 'execution':
          return {
            ...acc,
            execution: acc.execution || hasRuntimeSamplingTraceLaneSpecificHandoffCue({
              lane: 'execution',
              fromNextInfluenceText: fromNextInfluenceTexts.execution,
              downstreamText: text,
            }),
          }
        case 'embodiment':
          return {
            ...acc,
            embodiment: acc.embodiment || hasRuntimeSamplingTraceLaneSpecificHandoffCue({
              lane: 'embodiment',
              fromNextInfluenceText: fromNextInfluenceTexts.embodiment,
              downstreamText: text,
            }),
          }
        default:
          return acc
      }
    }, {
      emotion: false,
      initiative: false,
      execution: false,
      embodiment: false,
    })
  const missingLanes: Array<'emotion' | 'initiative' | 'execution' | 'embodiment'> = []
  if (!lanes.emotion)
    missingLanes.push('emotion')
  if (!lanes.initiative)
    missingLanes.push('initiative')
  if (!lanes.execution)
    missingLanes.push('execution')
  if (!lanes.embodiment)
    missingLanes.push('embodiment')
  return {
    ...lanes,
    missingLanes,
  }
}

function readRuntimeSamplingTraceMemoryHandoffTransitionCoverage(input: {
  fromRecords: readonly AlicizationMemoryDecisionTraceRecord[]
  toRecords: readonly AlicizationMemoryDecisionTraceRecord[]
}) {
  const allLanes: RuntimeSamplingTraceMemoryHandoffLane[] = ['emotion', 'initiative', 'execution', 'embodiment']
  const fromRecords = selectRuntimeSamplingDownstreamStateEvidenceRecords(input.fromRecords)
  const toRecords = selectRuntimeSamplingDownstreamStateEvidenceRecords(input.toRecords)
  if (
    fromRecords.length === 0
    || toRecords.length === 0
    || !hasRuntimeSamplingTraceDownstreamStateEvidence(toRecords)
  ) {
    return {
      complete: false,
      missingLanes: allLanes,
    }
  }

  const fromNextInfluence = readRuntimeSamplingTraceNextInfluenceLanes(fromRecords)
  if (fromNextInfluence.missingLanes.length > 0) {
    return {
      complete: false,
      missingLanes: fromNextInfluence.missingLanes,
    }
  }
  const fromNextInfluenceTexts = readRuntimeSamplingTraceNextInfluenceLaneTexts(fromRecords)

  const fromIdentity = readRuntimeSamplingTraceDownstreamStateMemoryIdentity(fromRecords)
  const toIdentity = readRuntimeSamplingTraceDownstreamStateMemoryIdentity(toRecords)
  const hasSharedIdentity = fromIdentity.identityKeys.length > 0
    && toIdentity.identityKeys.length > 0
    && fromIdentity.identityKeys.some(key => toIdentity.identityKeys.includes(key))
  if (!fromIdentity.stable || !toIdentity.stable || !hasSharedIdentity) {
    return {
      complete: false,
      missingLanes: allLanes,
    }
  }

  const downstreamHandoff = readRuntimeSamplingTraceDownstreamHandoffLanes(toRecords, fromNextInfluenceTexts)
  return {
    complete: downstreamHandoff.missingLanes.length === 0,
    missingLanes: downstreamHandoff.missingLanes,
  }
}

function buildRuntimeSamplingTraceMemoryHandoffCoverage(input: {
  sessions: AlicizationReplayLongRunSameHerSessionRow[]
  verifiedDecisionTraceIds: ReadonlySet<string>
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>
}) {
  const handoffTransitions: string[] = []
  const missingHandoffTransitions: string[] = []
  const missingHandoffTransitionLanes: Record<string, RuntimeSamplingTraceMemoryHandoffLane[]> = {}

  for (const session of input.sessions) {
    for (let index = 0; index < session.turnDiagnostics.length - 1; index += 1) {
      const fromTurn = session.turnDiagnostics[index]
      const toTurn = session.turnDiagnostics[index + 1]
      if (!fromTurn || !toTurn)
        continue

      const fromDecisionTraceId = replayDecisionTraceIdFromPointer(fromTurn.tracePointer)
      const toDecisionTraceId = replayDecisionTraceIdFromPointer(toTurn.tracePointer)
      if (!fromDecisionTraceId && !toDecisionTraceId)
        continue

      const transitionId = `${fromTurn.turnId}->${toTurn.turnId}`
      const fromRecords = fromDecisionTraceId && input.verifiedDecisionTraceIds.has(fromDecisionTraceId)
        ? runtimeSamplingTraceRecordsBoundToTurn(fromTurn, input.traceRecordsByDecisionTraceId)
        : []
      const toRecords = toDecisionTraceId && input.verifiedDecisionTraceIds.has(toDecisionTraceId)
        ? runtimeSamplingTraceRecordsBoundToTurn(toTurn, input.traceRecordsByDecisionTraceId)
        : []
      const handoffCoverage = readRuntimeSamplingTraceMemoryHandoffTransitionCoverage({ fromRecords, toRecords })
      if (handoffCoverage.complete) {
        handoffTransitions.push(transitionId)
      }
      else if (!missingHandoffTransitions.includes(transitionId)) {
        missingHandoffTransitions.push(transitionId)
        if (handoffCoverage.missingLanes.length > 0)
          missingHandoffTransitionLanes[transitionId] = handoffCoverage.missingLanes
      }
    }
  }

  return {
    runtimeDecisionTraceMemoryHandoffTransitionCount: handoffTransitions.length,
    missingRuntimeDecisionTraceMemoryHandoffTransitionCount: missingHandoffTransitions.length,
    missingRuntimeDecisionTraceMemoryHandoffTransitions: missingHandoffTransitions,
    missingRuntimeDecisionTraceMemoryHandoffTransitionLanes: missingHandoffTransitionLanes,
    allRuntimeDecisionTraceMemoryHandoffsComplete: missingHandoffTransitions.length === 0,
  }
}

function runtimeSamplingTraceRecallExplanationText(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records
    .flatMap((record) => {
      const memoryClosureTrace = extractRuntimeSamplingMemoryClosureTrace(record)
      const memoryResolutionLedger = record.memoryResolutionLedger
        ? record.memoryResolutionLedger as unknown as Record<string, unknown>
        : null
      return [
        record.recallAttribution?.whyNow,
        ...(Array.isArray(record.memoryDeliberationJudged?.withheldReasons)
          ? record.memoryDeliberationJudged.withheldReasons
          : []),
        ...(Array.isArray(memoryClosureTrace?.whySurface)
          ? memoryClosureTrace.whySurface
              .map(item => isRuntimeSamplingPlainObject(item) ? item.summary : null)
          : []),
        memoryResolutionLedger?.dominantClusterSummary,
        memoryResolutionLedger?.finalRationale,
      ]
    })
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function hasRuntimeSamplingTraceRecallExplanationEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const text = runtimeSamplingTraceRecallExplanationText(records)
  if (!text)
    return false

  return hasReplayExplainableMemoryClosureCue(text)
    || /because|reason|why now|why this memory|why recall|surfaced now|correction provenance|same-her line|explains this same-her|原因|解释|为什么|浮现/u.test(text)
}

function buildRuntimeSamplingTraceEventCoverage(input: {
  sessions: AlicizationReplayLongRunSameHerSessionRow[]
  verifiedDecisionTraceIds: ReadonlySet<string>
  provenanceMismatchTurnIds?: ReadonlySet<string>
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>
}): AlicizationRuntimeSamplingTraceEventCoverage | null {
  const decisionTraceTurnIds = new Set<string>()
  const verifiedTraceEventTurnIds = new Set<string>()
  const missingTraceEventTurnIds: string[] = []
  const runtimeRoleCompleteTraceTurnIds = new Set<string>()
  const missingRuntimeRoleTraceTurnIds: string[] = []
  const runtimeDownstreamStateTraceTurnIds = new Set<string>()
  const missingRuntimeDownstreamStateTraceTurnIds: string[] = []
  const runtimeProvenanceBoundTraceTurnIds = new Set<string>()
  const missingRuntimeProvenanceBoundTraceTurnIds: string[] = []
  const runtimeMemoryIdentityReplayMatchTraceTurnIds = new Set<string>()
  const runtimeMemoryIdentityReplayMismatchTurnIds: string[] = []
  const runtimeMemoryMetabolismTraceTurnIds = new Set<string>()
  const missingRuntimeMemoryMetabolismTraceTurnIds: string[] = []
  const runtimeRecallExplanationTraceTurnIds = new Set<string>()
  const missingRuntimeRecallExplanationTraceTurnIds: string[] = []

  for (const session of input.sessions) {
    for (const turn of session.turnDiagnostics) {
      const decisionTraceId = replayDecisionTraceIdFromPointer(turn.tracePointer)
      if (!decisionTraceId)
        continue
      decisionTraceTurnIds.add(turn.turnId)
      if (input.verifiedDecisionTraceIds.has(decisionTraceId)) {
        verifiedTraceEventTurnIds.add(turn.turnId)
        const hasProvenanceMismatch = input.provenanceMismatchTurnIds?.has(turn.turnId) === true
        const traceRecords = runtimeSamplingTraceRecordsBoundToTurn(turn, input.traceRecordsByDecisionTraceId)
        if (traceRecords.length > 0 && !hasProvenanceMismatch) {
          runtimeProvenanceBoundTraceTurnIds.add(turn.turnId)
        }
        else if (!missingRuntimeProvenanceBoundTraceTurnIds.includes(turn.turnId)) {
          missingRuntimeProvenanceBoundTraceTurnIds.push(turn.turnId)
        }
        if (hasRuntimeSamplingTraceSameHerRoleEvidence(traceRecords)) {
          runtimeRoleCompleteTraceTurnIds.add(turn.turnId)
        }
        else if (!missingRuntimeRoleTraceTurnIds.includes(turn.turnId)) {
          missingRuntimeRoleTraceTurnIds.push(turn.turnId)
        }
        const runtimeMemoryMetabolism = readRuntimeSamplingTraceMemoryMetabolismCoverage(traceRecords)
        if (runtimeMemoryMetabolism.missingProofs.length === 0) {
          runtimeMemoryMetabolismTraceTurnIds.add(turn.turnId)
        }
        else if (!missingRuntimeMemoryMetabolismTraceTurnIds.includes(turn.turnId)) {
          missingRuntimeMemoryMetabolismTraceTurnIds.push(turn.turnId)
        }
        if (hasRuntimeSamplingTraceRecallExplanationEvidence(traceRecords)) {
          runtimeRecallExplanationTraceTurnIds.add(turn.turnId)
        }
        else if (!missingRuntimeRecallExplanationTraceTurnIds.includes(turn.turnId)) {
          missingRuntimeRecallExplanationTraceTurnIds.push(turn.turnId)
        }
        if (hasRuntimeSamplingTraceDownstreamStateEvidence(traceRecords)) {
          runtimeDownstreamStateTraceTurnIds.add(turn.turnId)
          const runtimeMemoryIdentityKeys = readRuntimeSamplingTraceDownstreamStateMemoryIdentityMatchKeys(traceRecords)
          const replayVisibleIdentityKeys = readRuntimeSamplingReplayVisibleMemoryIdentityKeys(turn)
          const hasMatchingReplayIdentity = replayVisibleIdentityKeys.length > 0
            && runtimeMemoryIdentityKeys.some(key => replayVisibleIdentityKeys.includes(key))
          if (hasMatchingReplayIdentity) {
            runtimeMemoryIdentityReplayMatchTraceTurnIds.add(turn.turnId)
          }
          else if (!runtimeMemoryIdentityReplayMismatchTurnIds.includes(turn.turnId)) {
            runtimeMemoryIdentityReplayMismatchTurnIds.push(turn.turnId)
          }
        }
        else if (!missingRuntimeDownstreamStateTraceTurnIds.includes(turn.turnId)) {
          missingRuntimeDownstreamStateTraceTurnIds.push(turn.turnId)
        }
      }
      else if (!missingTraceEventTurnIds.includes(turn.turnId)) {
        missingTraceEventTurnIds.push(turn.turnId)
      }
    }
  }

  if (decisionTraceTurnIds.size === 0)
    return null

  const memoryIdentityContinuity = buildRuntimeSamplingTraceMemoryIdentityContinuity(input)

  return {
    decisionTraceTurnCount: decisionTraceTurnIds.size,
    verifiedTraceEventTurnCount: verifiedTraceEventTurnIds.size,
    missingTraceEventTurnCount: missingTraceEventTurnIds.length,
    allRuntimeDecisionTracesVerified: missingTraceEventTurnIds.length === 0
      && verifiedTraceEventTurnIds.size === decisionTraceTurnIds.size,
    runtimeDecisionTraceProvenanceBoundTurnCount: runtimeProvenanceBoundTraceTurnIds.size,
    missingRuntimeDecisionTraceProvenanceBoundTurnCount: missingRuntimeProvenanceBoundTraceTurnIds.length,
    missingRuntimeDecisionTraceProvenanceBoundTurnIds: missingRuntimeProvenanceBoundTraceTurnIds,
    allRuntimeDecisionTracesProvenanceBound: missingRuntimeProvenanceBoundTraceTurnIds.length === 0
      && runtimeProvenanceBoundTraceTurnIds.size === decisionTraceTurnIds.size,
    runtimeRoleCompleteTraceTurnCount: runtimeRoleCompleteTraceTurnIds.size,
    missingRuntimeRoleTraceTurnCount: missingRuntimeRoleTraceTurnIds.length,
    allRuntimeDecisionTracesRoleComplete: missingRuntimeRoleTraceTurnIds.length === 0
      && runtimeRoleCompleteTraceTurnIds.size === decisionTraceTurnIds.size,
    runtimeDownstreamStateTraceTurnCount: runtimeDownstreamStateTraceTurnIds.size,
    missingRuntimeDownstreamStateTraceTurnCount: missingRuntimeDownstreamStateTraceTurnIds.length,
    allRuntimeDecisionTracesDownstreamStateComplete: missingRuntimeDownstreamStateTraceTurnIds.length === 0
      && runtimeDownstreamStateTraceTurnIds.size === decisionTraceTurnIds.size,
    runtimeDownstreamStateMemoryIdentityReplayMatchTurnCount: runtimeMemoryIdentityReplayMatchTraceTurnIds.size,
    runtimeDownstreamStateMemoryIdentityReplayMismatchTurnCount: runtimeMemoryIdentityReplayMismatchTurnIds.length,
    runtimeDownstreamStateMemoryIdentityReplayMismatchTurnIds: runtimeMemoryIdentityReplayMismatchTurnIds,
    allRuntimeDecisionTracesMemoryIdentityMatchesReplay: runtimeMemoryIdentityReplayMismatchTurnIds.length === 0
      && runtimeMemoryIdentityReplayMatchTraceTurnIds.size === decisionTraceTurnIds.size,
    runtimeDecisionTraceMemoryMetabolismTurnCount: runtimeMemoryMetabolismTraceTurnIds.size,
    missingRuntimeDecisionTraceMemoryMetabolismTurnCount: missingRuntimeMemoryMetabolismTraceTurnIds.length,
    missingRuntimeDecisionTraceMemoryMetabolismTurnIds: missingRuntimeMemoryMetabolismTraceTurnIds,
    allRuntimeDecisionTracesMemoryMetabolismComplete: missingRuntimeMemoryMetabolismTraceTurnIds.length === 0
      && runtimeMemoryMetabolismTraceTurnIds.size === decisionTraceTurnIds.size,
    runtimeDecisionTraceRecallExplanationTurnCount: runtimeRecallExplanationTraceTurnIds.size,
    missingRuntimeDecisionTraceRecallExplanationTurnCount: missingRuntimeRecallExplanationTraceTurnIds.length,
    missingRuntimeDecisionTraceRecallExplanationTurnIds: missingRuntimeRecallExplanationTraceTurnIds,
    allRuntimeDecisionTracesRecallExplanationComplete: missingRuntimeRecallExplanationTraceTurnIds.length === 0
      && runtimeRecallExplanationTraceTurnIds.size === decisionTraceTurnIds.size,
    ...memoryIdentityContinuity,
    ...buildRuntimeSamplingTraceMemoryHandoffCoverage(input),
  }
}

function buildRuntimeSamplingEvidence(input: {
  source: AlicizationReplayBenchmarkRuntimeSamplingEvidenceSource
  runtimeSamplingTurnCount: number
  longRunSameHerSessionSummary: AlicizationRunReplayBenchmarkResult['datasetFeedback']['longRunSameHerSessionSummary']
  longRunSameHerSessionRows?: AlicizationReplayLongRunSameHerSessionRow[]
  verifiedDecisionTraceIds?: ReadonlySet<string>
  provenanceMismatchTurnIds?: ReadonlySet<string>
  traceRecords?: AlicizationMemoryDecisionTraceRecord[]
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']> {
  const summary = input.longRunSameHerSessionSummary
  const comparedSessionCount = summary?.comparedSessionCount ?? 0
  const closedSessionCount = summary?.closedSessionCount ?? 0
  const sessionClosureRate = summary?.sessionClosureRate ?? 0
  const runtimeRelated = input.source === 'runtime-sampling-backlog'
    || input.source === 'mixed-runtime-and-conversation'
    || input.source === 'conversation-sample'
    || input.runtimeSamplingTurnCount > 0
  const runtimeEvidenceSessionRows = input.longRunSameHerSessionRows ?? summary?.sessions ?? []
  const runtimeEvidenceTurnCount = runtimeEvidenceSessionRows.reduce(
    (sum, row) => sum + Math.max(0, row.runtimeEvidence.runtimeTurnCount),
    0,
  )
  const traceRecordsByDecisionTraceId = runtimeSamplingTraceRecordsByDecisionTraceId(input.traceRecords ?? [])
  const roleCompleteDecisionTraceIds = new Set(
    [...traceRecordsByDecisionTraceId.entries()]
      .filter(([, records]) => hasRuntimeSamplingTraceSameHerRoleEvidence(records))
      .map(([decisionTraceId]) => decisionTraceId),
  )
  const downstreamStateCompleteDecisionTraceIds = new Set(
    [...traceRecordsByDecisionTraceId.entries()]
      .filter(([, records]) => hasRuntimeSamplingTraceDownstreamStateEvidence(records))
      .map(([decisionTraceId]) => decisionTraceId),
  )
  const sampledTurnCount = runtimeEvidenceTurnCount > 0
    ? runtimeEvidenceTurnCount
    : input.runtimeSamplingTurnCount
  const allComparedSessionsAreRuntimeSourced = comparedSessionCount > 0
    && runtimeEvidenceSessionRows.length === comparedSessionCount
    && runtimeEvidenceSessionRows.every(row =>
      row.status === 'closed'
      && row.runtimeEvidence.allTurnsRuntimeSourced
      && row.runtimeEvidence.syntheticTurnCount === 0
      && row.runtimeEvidence.runtimeTurnCount === row.turnCount,
    )
  const allComparedSessionsHaveRuntimeTraceProvenance = comparedSessionCount > 0
    && runtimeEvidenceSessionRows.length === comparedSessionCount
    && runtimeEvidenceSessionRows.every(row =>
      row.runtimeEvidence.allTurnsRuntimeSourced
      && row.runtimeEvidence.syntheticTurnCount === 0
      && row.runtimeEvidence.runtimeTurnCount === row.turnCount
      && row.runtimeEvidence.decisionTraceTurnCount === row.turnCount,
    )
  const traceEventCoverage = buildRuntimeSamplingTraceEventCoverage({
    sessions: runtimeEvidenceSessionRows,
    verifiedDecisionTraceIds: input.verifiedDecisionTraceIds ?? new Set<string>(),
    provenanceMismatchTurnIds: input.provenanceMismatchTurnIds,
    traceRecordsByDecisionTraceId,
  })
  const allRuntimeDecisionTracesVerified = traceEventCoverage?.allRuntimeDecisionTracesVerified ?? !runtimeRelated
  const allRuntimeDecisionTracesProvenanceBound = traceEventCoverage?.allRuntimeDecisionTracesProvenanceBound ?? !runtimeRelated
  const allRuntimeDecisionTracesRoleComplete = traceEventCoverage?.allRuntimeDecisionTracesRoleComplete ?? !runtimeRelated
  const allRuntimeDecisionTracesDownstreamStateComplete = traceEventCoverage?.allRuntimeDecisionTracesDownstreamStateComplete ?? !runtimeRelated
  const allRuntimeDecisionTracesMemoryIdentityContinuous = traceEventCoverage?.allRuntimeDecisionTracesMemoryIdentityContinuous ?? !runtimeRelated
  const allRuntimeDecisionTracesMemoryIdentityMatchesReplay = traceEventCoverage?.allRuntimeDecisionTracesMemoryIdentityMatchesReplay ?? !runtimeRelated
  const allRuntimeDecisionTracesMemoryMetabolismComplete = traceEventCoverage?.allRuntimeDecisionTracesMemoryMetabolismComplete ?? !runtimeRelated
  const allRuntimeDecisionTracesRecallExplanationComplete = traceEventCoverage?.allRuntimeDecisionTracesRecallExplanationComplete ?? !runtimeRelated
  const allRuntimeDecisionTraceMemoryHandoffsComplete = traceEventCoverage?.allRuntimeDecisionTraceMemoryHandoffsComplete ?? !runtimeRelated
  const allRuntimeTraceClosureComplete = runtimeRelated
    && allRuntimeDecisionTracesVerified
    && allRuntimeDecisionTracesProvenanceBound
    && allRuntimeDecisionTracesRoleComplete
    && allRuntimeDecisionTracesDownstreamStateComplete
    && allRuntimeDecisionTracesMemoryIdentityContinuous
    && allRuntimeDecisionTracesMemoryIdentityMatchesReplay
    && allRuntimeDecisionTracesMemoryMetabolismComplete
    && allRuntimeDecisionTracesRecallExplanationComplete
    && allRuntimeDecisionTraceMemoryHandoffsComplete
  const contentFullyClosedSample = (
    input.source === 'runtime-sampling-backlog'
    || input.source === 'mixed-runtime-and-conversation'
    || input.source === 'conversation-sample'
  ) && comparedSessionCount > 0 && sessionClosureRate === 1 && allComparedSessionsAreRuntimeSourced
  const traceFullyClosedSample = allRuntimeTraceClosureComplete
    && comparedSessionCount > 0
    && allComparedSessionsHaveRuntimeTraceProvenance
    && runtimeEvidenceSessionRows.every(row =>
      row.hitCount >= 3
      && row.turnDiagnostics.every(turn => turn.missingLanes.length === 0)
      && row.memoryIdentityContinuity?.stable !== false,
    )
  const fullyClosedSample = (contentFullyClosedSample || traceFullyClosedSample)
    && allRuntimeTraceClosureComplete
  const repairTargets = buildRuntimeSamplingRepairTargets({
    sessions: input.longRunSameHerSessionRows ?? summary?.sessions ?? [],
    traceRecordsByDecisionTraceId,
    traceEventCoverage,
    verifiedDecisionTraceIds: input.verifiedDecisionTraceIds ?? new Set<string>(),
    roleCompleteDecisionTraceIds,
    downstreamStateCompleteDecisionTraceIds,
    shouldAddTraceEventRepair: contentFullyClosedSample && !allRuntimeDecisionTracesVerified,
    shouldAddTraceProvenanceBoundRepair: contentFullyClosedSample
      && allRuntimeDecisionTracesVerified
      && !allRuntimeDecisionTracesProvenanceBound,
    shouldAddTraceRoleRepair: contentFullyClosedSample
      && allRuntimeDecisionTracesVerified
      && allRuntimeDecisionTracesProvenanceBound
      && !allRuntimeDecisionTracesRoleComplete,
    shouldAddTraceDownstreamStateRepair: contentFullyClosedSample
      && allRuntimeDecisionTracesVerified
      && allRuntimeDecisionTracesProvenanceBound
      && allRuntimeDecisionTracesRoleComplete
      && !allRuntimeDecisionTracesDownstreamStateComplete,
    shouldAddTraceMemoryIdentityRepair: contentFullyClosedSample
      && allRuntimeDecisionTracesVerified
      && allRuntimeDecisionTracesProvenanceBound
      && allRuntimeDecisionTracesRoleComplete
      && allRuntimeDecisionTracesDownstreamStateComplete
      && (
        !allRuntimeDecisionTracesMemoryIdentityContinuous
        || !allRuntimeDecisionTracesMemoryIdentityMatchesReplay
      ),
    shouldAddTraceMemoryMetabolismRepair: contentFullyClosedSample
      && allRuntimeDecisionTracesVerified
      && allRuntimeDecisionTracesProvenanceBound
      && allRuntimeDecisionTracesRoleComplete
      && allRuntimeDecisionTracesDownstreamStateComplete
      && allRuntimeDecisionTracesMemoryIdentityContinuous
      && allRuntimeDecisionTracesMemoryIdentityMatchesReplay
      && !allRuntimeDecisionTracesMemoryMetabolismComplete,
    shouldAddTraceRecallExplanationRepair: contentFullyClosedSample
      && allRuntimeDecisionTracesVerified
      && allRuntimeDecisionTracesProvenanceBound
      && allRuntimeDecisionTracesRoleComplete
      && allRuntimeDecisionTracesDownstreamStateComplete
      && allRuntimeDecisionTracesMemoryIdentityContinuous
      && allRuntimeDecisionTracesMemoryIdentityMatchesReplay
      && allRuntimeDecisionTracesMemoryMetabolismComplete
      && !allRuntimeDecisionTracesRecallExplanationComplete,
    shouldAddTraceMemoryHandoffRepair: contentFullyClosedSample
      && allRuntimeDecisionTracesVerified
      && allRuntimeDecisionTracesProvenanceBound
      && allRuntimeDecisionTracesRoleComplete
      && allRuntimeDecisionTracesDownstreamStateComplete
      && allRuntimeDecisionTracesMemoryIdentityContinuous
      && allRuntimeDecisionTracesMemoryIdentityMatchesReplay
      && allRuntimeDecisionTracesMemoryMetabolismComplete
      && allRuntimeDecisionTracesRecallExplanationComplete
      && !allRuntimeDecisionTraceMemoryHandoffsComplete,
    suppressTextTransitionRepairTargets: traceFullyClosedSample,
  })
  const nextRunEvidenceChecklist = buildRuntimeSamplingNextRunEvidenceChecklist({
    traceEventCoverage,
    repairTargets,
  })

  return {
    source: input.source,
    status: !runtimeRelated
      ? 'none'
      : fullyClosedSample
        ? 'closed'
        : 'insufficient',
    sampledTurnCount,
    comparedSessionCount,
    closedSessionCount,
    sessionClosureRate,
    ...(traceEventCoverage ? { traceEventCoverage } : {}),
    tracePointers: buildRuntimeSamplingTracePointers(input.longRunSameHerSessionRows ?? summary?.sessions ?? []),
    repairTargets,
    ...(nextRunEvidenceChecklist.length > 0 ? { nextRunEvidenceChecklist } : {}),
  }
}

function requireRuntimeMemoryClosureLongRunProvenance(input: {
  memoryClosureLongRun: AlicizationRunReplayBenchmarkResult['datasetFeedback']['memoryClosureLongRun']
  runtimeSamplingEvidence: AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']
}) {
  if (
    !input.memoryClosureLongRun
    || input.memoryClosureLongRun.status !== 'closed'
    || input.runtimeSamplingEvidence?.status === 'closed'
  ) {
    return input.memoryClosureLongRun
  }

  return {
    ...input.memoryClosureLongRun,
    status: 'insufficient' as const,
    failureReasons: [
      ...input.memoryClosureLongRun.failureReasons,
      'missing-runtime-memory-closure-provenance' as const,
    ].filter((reason, index, all) => all.indexOf(reason) === index),
  }
}

function buildRuntimeSamplingTracePointers(
  sessions: AlicizationReplayLongRunSameHerSessionRow[],
): NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>['tracePointers']> {
  type RuntimeSamplingTracePointer = NonNullable<AlicizationReplayLongRunSameHerSessionRow['turnDiagnostics'][number]['tracePointer']>
  const entries = new Map<string, RuntimeSamplingTracePointer>()
  const addPointer = (
    sampleTurnId: string,
    tracePointer: AlicizationReplayLongRunSameHerSessionRow['turnDiagnostics'][number]['tracePointer'] | undefined,
  ) => {
    const key = sampleTurnId.trim()
    if (!key || !tracePointer || entries.has(key))
      return
    entries.set(key, tracePointer)
  }

  for (const session of sessions) {
    for (const turn of session.turnDiagnostics)
      addPointer(turn.turnId, turn.tracePointer)

    for (const transition of session.transitionDiagnostics)
      addPointer(`${transition.fromTurnId}->${transition.toTurnId}`, transition.tracePointer)
  }

  return [...entries.entries()].map(([sampleTurnId, tracePointer]) => ({
    sampleTurnId,
    tracePointer,
  }))
}

function buildRuntimeSamplingRepairTargets(input: {
  sessions: AlicizationReplayLongRunSameHerSessionRow[]
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>
  traceEventCoverage?: AlicizationRuntimeSamplingTraceEventCoverage | null
  verifiedDecisionTraceIds?: ReadonlySet<string>
  roleCompleteDecisionTraceIds?: ReadonlySet<string>
  downstreamStateCompleteDecisionTraceIds?: ReadonlySet<string>
  shouldAddTraceEventRepair?: boolean
  shouldAddTraceProvenanceBoundRepair?: boolean
  shouldAddTraceRoleRepair?: boolean
  shouldAddTraceDownstreamStateRepair?: boolean
  shouldAddTraceMemoryIdentityRepair?: boolean
  shouldAddTraceMemoryMetabolismRepair?: boolean
  shouldAddTraceRecallExplanationRepair?: boolean
  shouldAddTraceMemoryHandoffRepair?: boolean
  suppressTextTransitionRepairTargets?: boolean
}): NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>['repairTargets']> {
  const sessions = input.sessions
  if (sessions.length === 0)
    return []

  const laneOrder = ['memory', 'initiativeOrExecution', 'emotion', 'embodiment'] as const
  const laneRank = new Map(laneOrder.map((lane, index) => [lane, index]))
  const aggregates = new Map<typeof laneOrder[number], {
    missingTurnCount: number
    missingTransitionCount: number
    affectedSessionIds: Set<string>
    sampleTurnIds: string[]
    reasons: Set<string>
  }>()
  const readAggregate = (lane: typeof laneOrder[number]) => {
    const current = aggregates.get(lane) ?? {
      missingTurnCount: 0,
      missingTransitionCount: 0,
      affectedSessionIds: new Set<string>(),
      sampleTurnIds: [],
      reasons: new Set<string>(),
    }
    aggregates.set(lane, current)
    return current
  }
  const addSamples = (target: { sampleTurnIds: string[], reasons: Set<string> }, turnId: string, reasons?: string[]) => {
    if (turnId && !target.sampleTurnIds.includes(turnId))
      target.sampleTurnIds.push(turnId)
    for (const reason of reasons ?? []) {
      const trimmed = reason.trim()
      if (trimmed)
        target.reasons.add(trimmed)
    }
  }
  const addSessionRoleCoverageRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    const coverage = session.eventRoleCoverage
    const missingConsecutiveRoleProof = session.failureReasons.includes('missing-consecutive-noisy-desktop-event-role-proof')
    if ((!coverage || coverage.missingRoles.length === 0) && !missingConsecutiveRoleProof)
      return

    const aggregate = readAggregate('memory')
    aggregate.affectedSessionIds.add(session.sessionId)
    const missingRoleTurnCount = new Set<string>()
    for (const diagnostic of session.eventRoleDiagnostics ?? []) {
      if (diagnostic.missingRoles.length === 0)
        continue

      missingRoleTurnCount.add(diagnostic.turnId)
      addSamples(
        aggregate,
        diagnostic.turnId,
        diagnostic.missingRoles.map(role =>
          `turn ${diagnostic.turnId} lacks distinct ${formatReplayNoisyDesktopEventRole(role)} event role`,
        ),
      )
    }
    aggregate.missingTurnCount += missingRoleTurnCount.size
    if (coverage && coverage.missingRoles.length > 0) {
      addSamples(
        aggregate,
        session.sessionId,
        coverage.missingRoles.map(role => `no distinct ${formatReplayNoisyDesktopEventRole(role)} event in this noisy desktop session`),
      )
    }
    if (missingConsecutiveRoleProof) {
      addSamples(aggregate, session.sessionId, [
        'no consecutive three-turn window carries memory recall, proactive opening, execution callback, emotional afterglow, and embodiment expression together',
      ])
    }
  }
  const addMemoryMetabolismCoverageRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    const coverage = session.memoryMetabolismCoverage
    if (!coverage || coverage.missingProofs.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.affectedSessionIds.add(session.sessionId)
    const reasons = coverage.missingProofs.flatMap((proof) => {
      switch (proof) {
        case 'revision':
          return ['no memory revision, correction, or reconsolidation proof in this noisy desktop session']
        case 'forgettingOrRestraint':
          return ['no forgetting, downrank, suppression, or restraint proof in this noisy desktop session']
        case 'auditability':
          return ['no memory auditability, correction provenance, or traceability proof in this noisy desktop session']
        default:
          return []
      }
    })
    addSamples(aggregate, session.sessionId, reasons)
  }
  const addMemoryIdentityContinuityRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    const continuity = session.memoryIdentityContinuity
    if (!continuity || continuity.stable || continuity.transitionBreaks.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTransitionCount += continuity.transitionBreaks.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const transitionBreak of continuity.transitionBreaks) {
      addSamples(aggregate, transitionBreak, [
        'memory closure identity changed across consecutive noisy desktop turns',
      ])
    }
  }
  const addRuntimeProvenanceRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    const missingRuntimeDecisionTraceProvenance = session.failureReasons.includes('missing-runtime-decision-trace-provenance')
    if (
      !missingRuntimeDecisionTraceProvenance
      && (session.status !== 'closed' || session.runtimeEvidence.allTurnsRuntimeSourced)
    ) {
      return
    }

    const aggregate = readAggregate('memory')
    aggregate.missingTurnCount += Math.max(1, session.runtimeEvidence.syntheticTurnCount)
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const turnId of session.turnIds) {
      addSamples(aggregate, turnId, [
        'runtime same-her session text closed but not all turns have decision-trace provenance',
        'turn lacks decision-trace provenance for real desktop long-run closure',
      ])
    }
  }
  const addRuntimeTraceEventRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (!input.shouldAddTraceEventRepair || input.traceEventCoverage?.allRuntimeDecisionTracesVerified !== false)
      return

    const missingTurnIds = session.turnDiagnostics
      .filter((turn) => {
        const decisionTraceId = replayDecisionTraceIdFromPointer(turn.tracePointer)
        return decisionTraceId && !(input.verifiedDecisionTraceIds ?? new Set<string>()).has(decisionTraceId)
      })
      .map(turn => turn.turnId)
    if (missingTurnIds.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTurnCount += missingTurnIds.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const turnId of missingTurnIds) {
      addSamples(aggregate, turnId, [
        'runtime same-her session text closed but decision-trace events are not queryable',
        'decision-trace id did not resolve to a persisted mind-turn event',
      ])
    }
  }
  const addRuntimeTraceProvenanceBoundRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (
      !input.shouldAddTraceProvenanceBoundRepair
      || input.traceEventCoverage?.allRuntimeDecisionTracesProvenanceBound !== false
    ) {
      return
    }

    const sessionTurnIds = new Set(session.turnIds)
    const missingTurnIds = (input.traceEventCoverage.missingRuntimeDecisionTraceProvenanceBoundTurnIds ?? [])
      .filter(turnId => sessionTurnIds.has(turnId))
    if (missingTurnIds.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTurnCount += missingTurnIds.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const turnId of missingTurnIds) {
      addSamples(aggregate, turnId, [
        'persisted decision-trace event did not match sampled runtime turn provenance',
        'decision-trace id resolved to events from a different turn or session',
      ])
    }
  }
  const addRuntimeTraceRoleRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (!input.shouldAddTraceRoleRepair || input.traceEventCoverage?.allRuntimeDecisionTracesRoleComplete !== false)
      return

    const missingTurnIds = session.turnDiagnostics
      .filter((turn) => {
        const decisionTraceId = replayDecisionTraceIdFromPointer(turn.tracePointer)
        return decisionTraceId
          && (input.verifiedDecisionTraceIds ?? new Set<string>()).has(decisionTraceId)
          && !(input.roleCompleteDecisionTraceIds ?? new Set<string>()).has(decisionTraceId)
      })
      .map(turn => turn.turnId)
    if (missingTurnIds.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTurnCount += missingTurnIds.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const turnId of missingTurnIds) {
      addSamples(aggregate, turnId, [
        'runtime same-her session text closed but persisted decision-trace events lack role evidence',
        'persisted decision-trace lacks memory recall, proactive opening, execution callback, emotional afterglow, or embodiment evidence',
      ])
    }
  }
  const addRuntimeTraceDownstreamStateRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (
      !input.shouldAddTraceDownstreamStateRepair
      || input.traceEventCoverage?.allRuntimeDecisionTracesDownstreamStateComplete !== false
    ) {
      return
    }

    const missingTurns = session.turnDiagnostics
      .map((turn) => {
        const decisionTraceId = replayDecisionTraceIdFromPointer(turn.tracePointer)
        const shouldRepair = Boolean(decisionTraceId
          && (input.verifiedDecisionTraceIds ?? new Set<string>()).has(decisionTraceId)
          && (input.roleCompleteDecisionTraceIds ?? new Set<string>()).has(decisionTraceId)
          && !(input.downstreamStateCompleteDecisionTraceIds ?? new Set<string>()).has(decisionTraceId))
        return shouldRepair && decisionTraceId
          ? { turnId: turn.turnId, decisionTraceId }
          : null
      })
      .filter((turn): turn is { turnId: string, decisionTraceId: string } => Boolean(turn))
    if (missingTurns.length === 0)
      return

    const addDownstreamRepair = (
      lane: typeof laneOrder[number],
      turnId: string,
      reasons: string[],
    ) => {
      const aggregate = readAggregate(lane)
      aggregate.missingTurnCount += 1
      aggregate.affectedSessionIds.add(session.sessionId)
      addSamples(aggregate, turnId, [
        'runtime same-her session text closed but persisted decision-trace events lack downstream state evidence',
        ...reasons,
      ])
    }
    for (const { turnId, decisionTraceId } of missingTurns) {
      const laneDiagnostics = readRuntimeSamplingTraceDownstreamStateLanes(
        input.traceRecordsByDecisionTraceId?.get(decisionTraceId) ?? [],
      )
      const initiativeOrExecutionReasons: string[] = []
      if (laneDiagnostics.missingLanes.includes('initiative')) {
        initiativeOrExecutionReasons.push(
          'persisted decision-trace initiative suppression is not causally tied to memory closure',
        )
      }
      if (laneDiagnostics.missingLanes.includes('execution')) {
        initiativeOrExecutionReasons.push(
          'persisted decision-trace execution learning state is not causally tied to memory closure',
        )
      }
      if (initiativeOrExecutionReasons.length > 0) {
        addDownstreamRepair('initiativeOrExecution', turnId, initiativeOrExecutionReasons)
      }
      if (laneDiagnostics.missingLanes.includes('emotion')) {
        addDownstreamRepair('emotion', turnId, [
          'persisted decision-trace emotional transition is not causally tied to memory closure',
        ])
      }
      if (laneDiagnostics.missingLanes.includes('embodiment')) {
        addDownstreamRepair('embodiment', turnId, [
          'persisted decision-trace embodiment continuity is not causally tied to memory closure',
        ])
      }
      if (laneDiagnostics.missingLanes.includes('memoryIdentity')) {
        addDownstreamRepair('memory', turnId, [
          'persisted decision-trace downstream lanes do not share one memory closure identity',
        ])
      }
    }
  }
  const addRuntimeTraceMemoryIdentityRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (
      !input.shouldAddTraceMemoryIdentityRepair
      || (
        input.traceEventCoverage?.allRuntimeDecisionTracesMemoryIdentityContinuous !== false
        && input.traceEventCoverage?.allRuntimeDecisionTracesMemoryIdentityMatchesReplay !== false
      )
    ) {
      return
    }

    const sessionTurnIds = new Set(session.turnIds)
    const missingTurnIds = (input.traceEventCoverage.missingRuntimeDownstreamStateMemoryIdentityTurnIds ?? [])
      .filter(turnId => sessionTurnIds.has(turnId))
    const replayMismatchTurnIds = (input.traceEventCoverage.runtimeDownstreamStateMemoryIdentityReplayMismatchTurnIds ?? [])
      .filter(turnId => sessionTurnIds.has(turnId))
    const transitionBreaks = (input.traceEventCoverage.runtimeDownstreamStateMemoryIdentityTransitionBreaks ?? [])
      .filter((transitionBreak) => {
        const [fromTurnId, toTurnId] = transitionBreak.split('->')
        return Boolean(fromTurnId && toTurnId && sessionTurnIds.has(fromTurnId) && sessionTurnIds.has(toTurnId))
      })
    if (missingTurnIds.length === 0 && replayMismatchTurnIds.length === 0 && transitionBreaks.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTurnCount += missingTurnIds.length
    aggregate.missingTurnCount += replayMismatchTurnIds.length
    aggregate.missingTransitionCount += transitionBreaks.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const turnId of missingTurnIds) {
      addSamples(aggregate, turnId, [
        'persisted decision-trace downstream lanes do not expose one memory closure identity',
      ])
    }
    for (const turnId of replayMismatchTurnIds) {
      addSamples(aggregate, turnId, [
        'runtime decision-trace memory closure identity does not match replay-visible memory identity',
      ])
    }
    for (const transitionBreak of transitionBreaks) {
      addSamples(aggregate, transitionBreak, [
        'runtime decision-trace memory closure identity changed across consecutive noisy desktop turns',
      ])
    }
  }
  const addRuntimeTraceMemoryMetabolismRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (
      !input.shouldAddTraceMemoryMetabolismRepair
      || input.traceEventCoverage?.allRuntimeDecisionTracesMemoryMetabolismComplete !== false
    ) {
      return
    }

    const sessionTurnIds = new Set(session.turnIds)
    const missingTurnIds = (input.traceEventCoverage.missingRuntimeDecisionTraceMemoryMetabolismTurnIds ?? [])
      .filter(turnId => sessionTurnIds.has(turnId))
    if (missingTurnIds.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTurnCount += missingTurnIds.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const turnId of missingTurnIds) {
      addSamples(aggregate, turnId, [
        'persisted decision-trace lacks runtime memory revision, forgetting/downrank, or audit provenance evidence',
      ])
    }
  }
  const addRuntimeTraceRecallExplanationRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (
      !input.shouldAddTraceRecallExplanationRepair
      || input.traceEventCoverage?.allRuntimeDecisionTracesRecallExplanationComplete !== false
    ) {
      return
    }

    const sessionTurnIds = new Set(session.turnIds)
    const missingTurnIds = (input.traceEventCoverage.missingRuntimeDecisionTraceRecallExplanationTurnIds ?? [])
      .filter(turnId => sessionTurnIds.has(turnId))
    if (missingTurnIds.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTurnCount += missingTurnIds.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const turnId of missingTurnIds) {
      addSamples(aggregate, turnId, [
        'persisted decision-trace lacks runtime explanation for why the memory surfaced',
      ])
    }
  }
  const addRuntimeTraceMemoryHandoffRepair = (session: AlicizationReplayLongRunSameHerSessionRow) => {
    if (
      !input.shouldAddTraceMemoryHandoffRepair
      || input.traceEventCoverage?.allRuntimeDecisionTraceMemoryHandoffsComplete !== false
    ) {
      return
    }

    const sessionTurnIds = new Set(session.turnIds)
    const missingTransitions = (input.traceEventCoverage.missingRuntimeDecisionTraceMemoryHandoffTransitions ?? [])
      .filter((transition) => {
        const [fromTurnId, toTurnId] = transition.split('->')
        return Boolean(fromTurnId && toTurnId && sessionTurnIds.has(fromTurnId) && sessionTurnIds.has(toTurnId))
      })
    if (missingTransitions.length === 0)
      return

    const aggregate = readAggregate('memory')
    aggregate.missingTransitionCount += missingTransitions.length
    aggregate.affectedSessionIds.add(session.sessionId)
    for (const transition of missingTransitions) {
      const missingLanes = input.traceEventCoverage.missingRuntimeDecisionTraceMemoryHandoffTransitionLanes?.[transition] ?? []
      addSamples(aggregate, transition, [
        'persisted decision-trace lacks runtime next-turn memory handoff from prior recall into downstream state',
        ...(missingLanes.length > 0
          ? [`missing next-turn memory handoff lanes: ${missingLanes.join(', ')}`]
          : []),
      ])
    }
  }

  for (const session of sessions) {
    for (const turn of session.turnDiagnostics) {
      for (const lane of turn.missingLanes) {
        const aggregate = readAggregate(lane)
        aggregate.missingTurnCount += 1
        aggregate.affectedSessionIds.add(session.sessionId)
        addSamples(aggregate, turn.turnId, turn.missingLaneReasons?.[lane])
      }
    }
    if (!input.suppressTextTransitionRepairTargets) {
      for (const transition of session.transitionDiagnostics) {
        for (const lane of transition.missingInfluences) {
          const aggregate = readAggregate(lane)
          aggregate.missingTransitionCount += 1
          aggregate.affectedSessionIds.add(session.sessionId)
          addSamples(
            aggregate,
            `${transition.fromTurnId}->${transition.toTurnId}`,
            transition.missingInfluenceReasons?.[lane],
          )
        }
      }
    }
    addSessionRoleCoverageRepair(session)
    addMemoryMetabolismCoverageRepair(session)
    addMemoryIdentityContinuityRepair(session)
    addRuntimeProvenanceRepair(session)
    addRuntimeTraceEventRepair(session)
    addRuntimeTraceProvenanceBoundRepair(session)
    addRuntimeTraceRoleRepair(session)
    addRuntimeTraceDownstreamStateRepair(session)
    addRuntimeTraceMemoryIdentityRepair(session)
    addRuntimeTraceMemoryMetabolismRepair(session)
    addRuntimeTraceRecallExplanationRepair(session)
    addRuntimeTraceMemoryHandoffRepair(session)
  }

  return [...aggregates.entries()]
    .map(([lane, aggregate]) => ({
      lane,
      missingTurnCount: aggregate.missingTurnCount,
      missingTransitionCount: aggregate.missingTransitionCount,
      affectedSessionCount: aggregate.affectedSessionIds.size,
      affectedSessionIds: [...aggregate.affectedSessionIds].sort(),
      sampleTurnIds: aggregate.sampleTurnIds,
      reasons: [...aggregate.reasons].sort(),
    }))
    .filter(target => target.missingTurnCount > 0 || target.missingTransitionCount > 0 || target.reasons.length > 0)
    .sort((left, right) => {
      const leftCount = left.missingTurnCount + left.missingTransitionCount
      const rightCount = right.missingTurnCount + right.missingTransitionCount
      return rightCount - leftCount
        || right.affectedSessionCount - left.affectedSessionCount
        || (laneRank.get(left.lane) ?? 0) - (laneRank.get(right.lane) ?? 0)
    })
}

function buildRuntimeSamplingNextRunEvidenceChecklist(input: {
  traceEventCoverage?: AlicizationRuntimeSamplingTraceEventCoverage | null
  repairTargets: AlicizationRuntimeSamplingRepairTargets
}): AlicizationRuntimeSamplingNextRunEvidenceChecklist {
  const checklist: AlicizationRuntimeSamplingNextRunEvidenceChecklist = []
  const missingMemoryHandoffTransitions = input.traceEventCoverage?.missingRuntimeDecisionTraceMemoryHandoffTransitions ?? []
  if (missingMemoryHandoffTransitions.length > 0) {
    const handoffLaneOrder: RuntimeSamplingTraceMemoryHandoffLane[] = ['emotion', 'initiative', 'execution', 'embodiment']
    const requiredLanes = new Set<RuntimeSamplingTraceMemoryHandoffLane>()
    for (const transition of missingMemoryHandoffTransitions) {
      const missingLanes = input.traceEventCoverage?.missingRuntimeDecisionTraceMemoryHandoffTransitionLanes?.[transition]
      for (const lane of missingLanes && missingLanes.length > 0 ? missingLanes : handoffLaneOrder)
        requiredLanes.add(lane)
    }

    checklist.push({
      lane: 'memory',
      evidenceKind: 'next-turn-memory-handoff',
      sampleTurnIds: missingMemoryHandoffTransitions,
      requiredTraceEvidence: handoffLaneOrder
        .filter(lane => requiredLanes.has(lane))
        .map(lane => `persisted decision-trace must show ${lane} nextInfluence consumed by next turn downstream state`),
    })
  }

  for (const target of input.repairTargets) {
    if (target.sampleTurnIds.length === 0 || target.reasons.length === 0)
      continue
    if (target.lane === 'memory' && target.sampleTurnIds.some(sampleTurnId => sampleTurnId.includes('->')))
      continue

    checklist.push({
      lane: target.lane,
      evidenceKind: target.missingTransitionCount > 0 ? 'cross-turn-continuity' : 'same-turn-runtime-proof',
      sampleTurnIds: target.sampleTurnIds,
      requiredTraceEvidence: target.reasons,
    })
  }

  return checklist
}

function formatReplayNoisyDesktopEventRole(role: AlicizationReplayLongRunSameHerEventRole) {
  switch (role) {
    case 'memoryRecall':
      return 'memory recall'
    case 'proactiveOpening':
      return 'proactive opening'
    case 'executionCallback':
      return 'execution callback'
    case 'emotionalAfterglow':
      return 'emotional afterglow'
    case 'embodimentExpression':
      return 'embodiment expression'
  }
}

function hasReplayNoisyDesktopExplicitMissingSummaryOnlyCue(text: string) {
  return /summary-only-route-chain|route-chain-summary|only summary|summary only|no distinct runtime events prove|没有.*(?:事件|运行).*证明/u.test(text)
}

function readReplayCrossModalEmbodimentModalities(text: string) {
  const modalities = new Set<ReplayCrossModalEmbodimentModality>()
  if (/\bbody\b|audible-body|身体/u.test(text))
    modalities.add('body')
  if (/\bvoice\b|\baudio\b|\baudible\b|\bvoiced\b|语音/u.test(text))
    modalities.add('voice')
  if (/\bface\b|\bfacial\b|表情/u.test(text))
    modalities.add('face')
  if (/\bmotion\b|动作/u.test(text))
    modalities.add('motion')
  if (/lipsync|lip sync|lip-sync|口型/u.test(text))
    modalities.add('lipsync')
  return modalities
}

function hasReplayCrossModalEmbodimentRuntimeSurfaceEvidence(text: string) {
  return /kernel_embodiment|emotion_embodiment_drive|embodiment_phase|embodiment_memory_writeback|voice_resident|face_resident|motion_resident|lipsync_resident|body_line|embodiment_resident|renderer-diagnostics|renderer diagnostics|cross-modal-same-her-replay|visualpresencestate|visual presence state|digital life spine|performance manifest|live2d|vrm/u.test(text)
}

function readReplayTurnRuntimeSurfaceEvidenceText(turn: AlicizationReplayTurn) {
  const rawTurn = turn as AlicizationReplayTurn & {
    continuityDigest?: unknown
  }
  const structuredMemoryClosureTrace = (turn.structured as {
    memoryClosureTrace?: {
      authority?: unknown
      reasonTags?: unknown[] | null
    } | null
  } | null | undefined)?.memoryClosureTrace ?? null
  return [
    rawTurn.continuityDigest,
    turn.organicMemoryContext?.projectStatePreDialogueAwarenessLine,
    turn.organicMemoryContext?.projectStatePreflightSummary,
    structuredMemoryClosureTrace?.authority,
    ...(Array.isArray(structuredMemoryClosureTrace?.reasonTags)
      ? structuredMemoryClosureTrace.reasonTags
      : []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
}

function hasReplayCrossModalEmbodimentProof(text: string) {
  const modalities = readReplayCrossModalEmbodimentModalities(text)
  return replayRequiredCrossModalEmbodimentModalities.every(modality => modalities.has(modality))
    && hasReplayCrossModalEmbodimentRuntimeSurfaceEvidence(text)
}

function hasReplayCrossModalEmbodimentModalities(text: string) {
  const modalities = readReplayCrossModalEmbodimentModalities(text)
  return replayRequiredCrossModalEmbodimentModalities.every(modality => modalities.has(modality))
}

function formatReplayCrossModalEmbodimentGapReason(text: string) {
  if (hasReplayCrossModalEmbodimentProof(text))
    return null
  const modalities = [...readReplayCrossModalEmbodimentModalities(text)]
  const missing = replayRequiredCrossModalEmbodimentModalities.filter(modality => !modalities.includes(modality))
  if (missing.length === 0 && !hasReplayCrossModalEmbodimentRuntimeSurfaceEvidence(text))
    return 'cross-modal embodiment proof lacks runtime surface evidence'
  return `cross-modal embodiment proof has only: ${modalities.length > 0 ? modalities.join(', ') : 'none'}; missing: ${missing.join(', ')}`
}

function hasReplayCrossModalEmbodimentRuntimeSurfaceEvidenceForRow(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const preparedAuthority = readReplayPreparedEmbodimentAuthority(input.prepared)
  const goldAuthority = input.sampledTurn.gold?.embodimentAuthority ?? null
  const derivedBundle = input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.derivedMindStateBundle
    ?? input.prepared.organicMemoryContext?.derivedMindStateBundle
    ?? input.sampledTurn.organicMemoryContext?.derivedMindStateBundle
    ?? null
  const embodimentContinuityLedger = isRuntimeSamplingPlainObject(derivedBundle?.embodimentContinuityLedger)
    ? derivedBundle.embodimentContinuityLedger as Record<string, unknown>
    : null
  const visualPresenceState = isRuntimeSamplingPlainObject(derivedBundle?.visualPresenceState)
    ? derivedBundle.visualPresenceState as Record<string, unknown>
    : null
  const emotionalKernel = isRuntimeSamplingPlainObject(derivedBundle?.emotionalKernel)
    ? derivedBundle.emotionalKernel as Record<string, unknown>
    : isRuntimeSamplingPlainObject(visualPresenceState?.emotionalKernel)
      ? visualPresenceState.emotionalKernel as Record<string, unknown>
      : null
  const emotionalTransitionLedger = isRuntimeSamplingPlainObject(derivedBundle?.emotionalTransitionLedger)
    ? derivedBundle.emotionalTransitionLedger as Record<string, unknown>
    : null
  const sourceTags = Array.isArray(embodimentContinuityLedger?.sourceTags)
    ? embodimentContinuityLedger.sourceTags
    : []
  const sourceText = [
    readReplayTurnRuntimeSurfaceEvidenceText(input.sampledTurn),
    preparedAuthority?.embodimentScript?.rendererTarget,
    preparedAuthority?.visibleReply?.expectedAuthority,
    preparedAuthority?.visibleReply?.actualAuthority,
    preparedAuthority?.digitalLife?.mode,
    preparedAuthority?.digitalLife?.preferredPresence,
    preparedAuthority?.digitalLife?.voice?.residentMode,
    preparedAuthority?.digitalLife?.face?.residentMode,
    preparedAuthority?.digitalLife?.motion?.residentMode,
    preparedAuthority?.digitalLife?.lipSync?.residentMode,
    preparedAuthority?.digitalLife?.bodyContinuity?.bodyLine,
    preparedAuthority?.digitalLife?.action?.actionCue,
    goldAuthority ? JSON.stringify(goldAuthority) : null,
    emotionalKernel?.embodimentTone,
    isRuntimeSamplingPlainObject(emotionalTransitionLedger?.embodimentDrive)
      ? emotionalTransitionLedger.embodimentDrive.tone
      : null,
    isRuntimeSamplingPlainObject(emotionalTransitionLedger?.embodimentDrive)
      ? emotionalTransitionLedger.embodimentDrive.reason
      : null,
    embodimentContinuityLedger?.continuityPhase,
    embodimentContinuityLedger?.traceSummary,
    embodimentContinuityLedger?.replayLine,
    isRuntimeSamplingPlainObject(embodimentContinuityLedger?.memoryWriteback)
      ? embodimentContinuityLedger.memoryWriteback.lane
      : null,
    isRuntimeSamplingPlainObject(embodimentContinuityLedger?.memoryWriteback)
      ? embodimentContinuityLedger.memoryWriteback.reason
      : null,
    ...sourceTags,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  return hasReplayCrossModalEmbodimentRuntimeSurfaceEvidence(sourceText)
}

function hasReplayCrossModalEmbodimentProofForRow(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
  text: string
}) {
  return hasReplayCrossModalEmbodimentModalities(input.text)
    && hasReplayCrossModalEmbodimentRuntimeSurfaceEvidenceForRow(input)
}

function replayOrganicMemoryStageReplayDiagnostics(
  context: AlicizationReplayTurn['organicMemoryContext'] | null | undefined,
) {
  return (context?.memoryStageReplay?.stages ?? []).flatMap((stage) => {
    return [
      stage.summary,
      ...(stage.outputs ?? []),
      ...(stage.diagnostics ?? []),
    ]
  })
}

function formatReplayCrossModalEmbodimentGapReasonForRow(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
  text: string
}) {
  const baseGap = formatReplayCrossModalEmbodimentGapReason(input.text)
  if (baseGap !== 'cross-modal embodiment proof lacks runtime surface evidence')
    return baseGap
  return hasReplayCrossModalEmbodimentRuntimeSurfaceEvidenceForRow(input)
    ? null
    : baseGap
}

function replayNoisyDesktopEventRoleText(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const structuredTrace = (input.sampledTurn.structured as {
    memoryClosureTrace?: {
      authority?: unknown
      whySurface?: Array<{ summary?: unknown }> | null
      nextInfluence?: {
        initiative?: { reason?: unknown } | null
        execution?: { carry?: unknown } | null
        emotion?: { reason?: unknown, afterglow?: unknown, residue?: unknown } | null
        embodiment?: { reason?: unknown, cadence?: unknown } | null
      } | null
      reasonTags?: unknown[] | null
    } | null
  } | null | undefined)?.memoryClosureTrace ?? null
  const runtimeTrace = (input.prepared.runtimeSurface?.digitalLifeSpine?.memory as {
    memoryClosureTrace?: unknown
  } | null | undefined)?.memoryClosureTrace
  const trace = runtimeTrace && typeof runtimeTrace === 'object'
    ? runtimeTrace as Record<string, unknown>
    : structuredTrace && typeof structuredTrace === 'object'
      ? structuredTrace as Record<string, unknown>
      : null
  const nextInfluence = trace?.nextInfluence && typeof trace.nextInfluence === 'object'
    ? trace.nextInfluence as Record<string, unknown>
    : null
  const derivedBundle = input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.derivedMindStateBundle
    ?? input.prepared.organicMemoryContext?.derivedMindStateBundle
    ?? input.sampledTurn.organicMemoryContext?.derivedMindStateBundle
    ?? null
  const emotionalKernel = derivedBundle?.emotionalKernel ?? derivedBundle?.visualPresenceState?.emotionalKernel ?? null
  const emotionalTransitionLedger = derivedBundle?.emotionalTransitionLedger ?? null
  const embodimentContinuityLedger = derivedBundle?.embodimentContinuityLedger ?? null
  const traceWhySurface = Array.isArray(trace?.whySurface)
    ? trace.whySurface
        .map(item => item && typeof item === 'object' ? (item as { summary?: unknown }).summary : null)
        .filter((value): value is string => typeof value === 'string')
    : []
  const traceReasonTags = Array.isArray(trace?.reasonTags)
    ? trace.reasonTags.filter((value): value is string => typeof value === 'string')
    : []

  return [
    input.sampledTurn.tracePointer?.kind,
    input.sampledTurn.tracePointer?.decisionTraceId,
    input.sampledTurn.tracePointer?.activeThreadId,
    input.sampledTurn.visibleReplyRealization?.reason,
    ...(input.sampledTurn.categories ?? []),
    ...(input.sampledTurn.sampledCategories ?? []),
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.continuitySummary,
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.memoryClosureSummary,
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.recallWhySummary,
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.emotionalClosureSummary,
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary,
    input.sampledTurn.visibleReplyRealization?.emotionalClosureAudit?.activeCue,
    ...replayOrganicMemoryStageReplayDiagnostics(input.prepared.organicMemoryContext),
    ...replayOrganicMemoryStageReplayDiagnostics(input.sampledTurn.organicMemoryContext),
    trace?.authority,
    ...traceWhySurface,
    nextInfluence?.initiative && typeof nextInfluence.initiative === 'object'
      ? (nextInfluence.initiative as { reason?: unknown }).reason
      : null,
    nextInfluence?.execution && typeof nextInfluence.execution === 'object'
      ? (nextInfluence.execution as { carry?: unknown }).carry
      : null,
    nextInfluence?.emotion && typeof nextInfluence.emotion === 'object'
      ? (nextInfluence.emotion as { reason?: unknown }).reason
      : null,
    nextInfluence?.emotion && typeof nextInfluence.emotion === 'object'
      ? (nextInfluence.emotion as { afterglow?: unknown }).afterglow
      : null,
    nextInfluence?.emotion && typeof nextInfluence.emotion === 'object'
      ? (nextInfluence.emotion as { residue?: unknown }).residue
      : null,
    nextInfluence?.embodiment && typeof nextInfluence.embodiment === 'object'
      ? (nextInfluence.embodiment as { reason?: unknown }).reason
      : null,
    nextInfluence?.embodiment && typeof nextInfluence.embodiment === 'object'
      ? (nextInfluence.embodiment as { cadence?: unknown }).cadence
      : null,
    ...traceReasonTags,
    emotionalKernel?.memoryRecallMode,
    emotionalKernel?.initiativeMode,
    emotionalKernel?.embodimentTone,
    emotionalKernel?.dominantEmotion,
    emotionalTransitionLedger?.transitionKind,
    emotionalTransitionLedger?.traceSummary,
    emotionalTransitionLedger?.replayLine,
    emotionalTransitionLedger?.memoryWriteback?.lane,
    emotionalTransitionLedger?.memoryWriteback?.reason,
    emotionalTransitionLedger?.initiativeSuppression?.mode,
    emotionalTransitionLedger?.embodimentDrive?.tone,
    emotionalTransitionLedger?.embodimentDrive?.reason,
    embodimentContinuityLedger?.continuityPhase,
    embodimentContinuityLedger?.traceSummary,
    embodimentContinuityLedger?.replayLine,
    embodimentContinuityLedger?.memoryWriteback?.lane,
    embodimentContinuityLedger?.memoryWriteback?.reason,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function readReplayLongRunSameHerEventRoles(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const text = replayNoisyDesktopEventRoleText(input)
  const summaryOnly = hasReplayNoisyDesktopExplicitMissingSummaryOnlyCue(text)
  const memoryRecall = !summaryOnly
    && /memory-closure-trace|memory closure trace|memoryclosuretrace|why recall surfaced|why this recall surfaced|recall surfaced because|kernel_recall|memory-deliberation|memory-os|recollection|retrieval|回忆.*浮现/u.test(text)
  const proactiveOpening = !summaryOnly
    && /subconscious-proactive|proactive-generation|proactive-opening|visible proactive hold|proactive-feedback|proactive follow-through|kernel_initiative|主动开口|主动提醒/u.test(text)
  const executionCallback = !summaryOnly
    && /execution-callback|execution callback|callback-afterglow|source:execution-callback|callback:/u.test(text)
  const emotionalAfterglow = !summaryOnly
    && /emotional_transition|emotional transition|emotional closure audit|emotional closure|afterglow|emotion_memory_writeback|callback-afterglow|情绪余波|情绪闭环/u.test(text)
  const embodimentExpression = !summaryOnly
    && /embodiment_phase|embodiment continuity|embodiment_memory_writeback|emotion_embodiment_drive|kernel_embodiment|body|voice|face|motion|lipsync|lip sync|audible-body|身体|语音|表情|动作|口型/u.test(text)
    && hasReplayCrossModalEmbodimentProofForRow({ ...input, text })
  const missingRoles: AlicizationReplayLongRunSameHerEventRole[] = []
  if (!memoryRecall)
    missingRoles.push('memoryRecall')
  if (!proactiveOpening)
    missingRoles.push('proactiveOpening')
  if (!executionCallback)
    missingRoles.push('executionCallback')
  if (!emotionalAfterglow)
    missingRoles.push('emotionalAfterglow')
  if (!embodimentExpression)
    missingRoles.push('embodimentExpression')

  return {
    memoryRecall,
    proactiveOpening,
    executionCallback,
    emotionalAfterglow,
    embodimentExpression,
    missingRoles,
  }
}

function mergeReplayLongRunSameHerEventRoleCoverage(rows: Array<{
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}>) {
  const coverage = rows.reduce((acc, row) => {
    const roles = readReplayLongRunSameHerEventRoles(row)
    return {
      memoryRecall: acc.memoryRecall || roles.memoryRecall,
      proactiveOpening: acc.proactiveOpening || roles.proactiveOpening,
      executionCallback: acc.executionCallback || roles.executionCallback,
      emotionalAfterglow: acc.emotionalAfterglow || roles.emotionalAfterglow,
      embodimentExpression: acc.embodimentExpression || roles.embodimentExpression,
    }
  }, {
    memoryRecall: false,
    proactiveOpening: false,
    executionCallback: false,
    emotionalAfterglow: false,
    embodimentExpression: false,
  })
  const missingRoles: AlicizationReplayLongRunSameHerEventRole[] = []
  if (!coverage.memoryRecall)
    missingRoles.push('memoryRecall')
  if (!coverage.proactiveOpening)
    missingRoles.push('proactiveOpening')
  if (!coverage.executionCallback)
    missingRoles.push('executionCallback')
  if (!coverage.emotionalAfterglow)
    missingRoles.push('emotionalAfterglow')
  if (!coverage.embodimentExpression)
    missingRoles.push('embodimentExpression')

  return {
    ...coverage,
    missingRoles,
  }
}

function buildReplayLongRunSameHerEventRoleDiagnostics(rows: Array<{
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}>) {
  return rows.map((row) => {
    const roles = readReplayLongRunSameHerEventRoles(row)
    return {
      turnId: row.sampledTurn.turnId,
      ...(row.sampledTurn.tracePointer ? { tracePointer: row.sampledTurn.tracePointer } : {}),
      ...roles,
    }
  })
}

function countReplayMaxConsecutiveCompleteEventRoleTurnsFromDiagnostics(
  diagnostics: ReturnType<typeof buildReplayLongRunSameHerEventRoleDiagnostics>,
) {
  let currentCount = 0
  let maxCount = 0
  for (const diagnostic of diagnostics) {
    if (diagnostic.missingRoles.length === 0) {
      currentCount += 1
      maxCount = Math.max(maxCount, currentCount)
    }
    else {
      currentCount = 0
    }
  }
  return maxCount
}

function replayMemoryMetabolismText(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const structured = input.sampledTurn.structured as {
    projectState?: Record<string, unknown> | null
    memoryClosureTrace?: {
      authority?: unknown
      whySurface?: Array<{ summary?: unknown }> | null
      nextInfluence?: {
        initiative?: { reason?: unknown } | null
        execution?: { carry?: unknown } | null
        emotion?: { reason?: unknown, afterglow?: unknown, residue?: unknown } | null
        embodiment?: { reason?: unknown, cadence?: unknown } | null
      } | null
      reasonTags?: unknown[] | null
    } | null
  } | null | undefined
  const projectState = structured?.projectState ?? null
  const trace = structured?.memoryClosureTrace ?? null
  const audit = input.sampledTurn.visibleReplyRealization?.projectStateAudit as Record<string, unknown> | null | undefined
  const memoryResolutionLedger = input.prepared.organicMemoryContext?.memoryResolutionLedger
    ?? input.sampledTurn.organicMemoryContext?.memoryResolutionLedger
    ?? null
  const memorySituationCandidates = input.prepared.organicMemoryContext?.memorySituationCandidates
    ?? input.sampledTurn.organicMemoryContext?.memorySituationCandidates
    ?? null
  return [
    input.sampledTurn.userText,
    input.sampledTurn.expectedMemory,
    input.sampledTurn.visibleReplyRealization?.reason,
    input.sampledTurn.organicMemoryContext?.projectStatePreflightSummary,
    projectState?.memoryClosureSummary,
    projectState?.primaryOpenLoop,
    audit?.sameHerSummary,
    audit?.memoryClosureSummary,
    audit?.recallWhySummary,
    audit?.continuitySummary,
    trace?.authority,
    ...(trace?.whySurface?.map(item => item.summary).filter((value): value is string => typeof value === 'string') ?? []),
    trace?.nextInfluence?.initiative?.reason,
    trace?.nextInfluence?.execution?.carry,
    trace?.nextInfluence?.emotion?.reason,
    trace?.nextInfluence?.emotion?.afterglow,
    trace?.nextInfluence?.emotion?.residue,
    trace?.nextInfluence?.embodiment?.reason,
    trace?.nextInfluence?.embodiment?.cadence,
    ...(Array.isArray(trace?.reasonTags) ? trace.reasonTags : []),
    memoryResolutionLedger?.dominantClusterSummary,
    memoryResolutionLedger?.competingClusterSummary,
    memoryResolutionLedger?.finalSurfacePolicy,
    memoryResolutionLedger?.closureState,
    memoryResolutionLedger?.visibleCarryMode,
    memoryResolutionLedger?.retrievalQuality,
    memoryResolutionLedger?.conflictPressure,
    memoryResolutionLedger?.finalRationale,
    ...(memoryResolutionLedger?.suppressionTags ?? []),
    ...(memoryResolutionLedger?.rejectedCandidates ?? []).flatMap(candidate => [
      candidate.id,
      candidate.summary,
      candidate.reason,
    ]),
    ...(memorySituationCandidates?.suppressed ?? []).flatMap(candidate => [
      candidate.candidateId,
      candidate.statusReason,
      ...(candidate.suppressionReasons ?? []),
    ]),
    ...(memorySituationCandidates?.rejected ?? []).flatMap(candidate => [
      candidate.candidateId,
      candidate.statusReason,
      ...(candidate.suppressionReasons ?? []),
    ]),
    ...replayOrganicMemoryStageReplayDiagnostics(input.prepared.organicMemoryContext),
    ...replayOrganicMemoryStageReplayDiagnostics(input.sampledTurn.organicMemoryContext),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function readReplayLongRunSameHerMemoryMetabolismCoverage(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const text = replayMemoryMetabolismText(input)
  const revision = /memory-reconsolidated|reconsolidat|revision|revised|revise|corrected|correction|self revision|update.*memory|修正|纠正|更新旧/u.test(text)
  const forgettingOrRestraint = /forget|forgot|forgetting|downrank|down-rank|suppress|suppressed|suppression|withhold|withheld|restraint|wrong-thread|wrong thread|internal-only|gist-only|stable core|遗忘|淡出|降权|抑制|克制/u.test(text)
  const auditability = /humanlike-memory-audit|memory audit|auditability|audit|traceable|traceability|provenance|correction provenance|审计|可追踪|溯源/u.test(text)
  const missingProofs: AlicizationReplayLongRunSameHerMemoryMetabolismProof[] = []
  if (!revision)
    missingProofs.push('revision')
  if (!forgettingOrRestraint)
    missingProofs.push('forgettingOrRestraint')
  if (!auditability)
    missingProofs.push('auditability')
  return {
    revision,
    forgettingOrRestraint,
    auditability,
    missingProofs,
  }
}

function mergeReplayLongRunSameHerMemoryMetabolismCoverage(rows: Array<{
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}>) {
  const coverage = rows.reduce((acc, row) => {
    const metabolism = readReplayLongRunSameHerMemoryMetabolismCoverage(row)
    return {
      revision: acc.revision || metabolism.revision,
      forgettingOrRestraint: acc.forgettingOrRestraint || metabolism.forgettingOrRestraint,
      auditability: acc.auditability || metabolism.auditability,
    }
  }, {
    revision: false,
    forgettingOrRestraint: false,
    auditability: false,
  })
  const missingProofs: AlicizationReplayLongRunSameHerMemoryMetabolismProof[] = []
  if (!coverage.revision)
    missingProofs.push('revision')
  if (!coverage.forgettingOrRestraint)
    missingProofs.push('forgettingOrRestraint')
  if (!coverage.auditability)
    missingProofs.push('auditability')
  return {
    ...coverage,
    missingProofs,
  }
}

function readReplayMemoryIdentityValues(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const structured = input.sampledTurn.structured as {
    memoryClosureTrace?: {
      selectedCandidateIds?: unknown[] | null
      reasonTags?: unknown[] | null
      memoryIdentity?: unknown
    } | null
    derivedMindStateBundle?: unknown
  } | null | undefined
  const runtimeTrace = (input.prepared.runtimeSurface?.digitalLifeSpine?.memory as {
    memoryClosureTrace?: {
      selectedCandidateIds?: unknown[] | null
      reasonTags?: unknown[] | null
      memoryIdentity?: unknown
    } | null
  } | null | undefined)?.memoryClosureTrace ?? null
  const trace = runtimeTrace ?? structured?.memoryClosureTrace ?? null
  const memoryResolutionLedger = input.prepared.organicMemoryContext?.memoryResolutionLedger
    ?? input.sampledTurn.organicMemoryContext?.memoryResolutionLedger
    ?? null
  const normalize = (value: unknown) => typeof value === 'string'
    ? value.trim().toLowerCase()
    : ''
  const readRecord = (raw: unknown) => raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  const readMemoryClosureCausalityIdentityValues = (raw: unknown) => {
    const causality = readRecord(raw)
    const memoryIdentity = readRecord(causality?.memoryIdentity)
    const continuityKey = normalize(memoryIdentity?.continuityKey)
    const reasonTags = Array.isArray(memoryIdentity?.reasonTags)
      ? memoryIdentity.reasonTags
          .map((tag) => {
            const text = normalize(tag)
            const match = /^memory-identity:(.+)$/u.exec(text)
            return match?.[1] ?? ''
          })
      : []
    if (continuityKey)
      return [continuityKey, ...reasonTags]

    return [
      ...(Array.isArray(memoryIdentity?.selectedCandidateIds) ? memoryIdentity.selectedCandidateIds : []),
      ...reasonTags,
    ]
  }
  const readMemoryClosureTraceIdentityValues = (raw: unknown) => {
    const traceRecord = readRecord(raw)
    const memoryIdentity = readRecord(traceRecord?.memoryIdentity)
    const continuityKey = normalize(memoryIdentity?.continuityKey)
    const reasonTags = Array.isArray(memoryIdentity?.reasonTags)
      ? memoryIdentity.reasonTags
          .map((tag) => {
            const text = normalize(tag)
            const match = /^memory-identity:(.+)$/u.exec(text)
            return match?.[1] ?? ''
          })
      : []
    if (continuityKey)
      return [continuityKey, ...reasonTags]

    return [
      ...(Array.isArray(memoryIdentity?.selectedCandidateIds) ? memoryIdentity.selectedCandidateIds : []),
      ...reasonTags,
    ]
  }
  const derivedMindStateBundle = readRecord(structured?.derivedMindStateBundle)
  const emotionalTransitionLedger = readRecord(derivedMindStateBundle?.emotionalTransitionLedger)
  const initiativeSuppression = readRecord(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = readRecord(derivedMindStateBundle?.learningExecutionState)
  const embodimentContinuityLedger = readRecord(derivedMindStateBundle?.embodimentContinuityLedger)
  const traceMemoryIdentity = readRecord(readRecord(trace)?.memoryIdentity)
  const hasTraceContinuityKey = Boolean(normalize(traceMemoryIdentity?.continuityKey))
  const explicitIds = [
    ...readMemoryClosureTraceIdentityValues(trace),
    ...(!hasTraceContinuityKey && Array.isArray(trace?.selectedCandidateIds) ? trace.selectedCandidateIds : []),
    ...(Array.isArray(trace?.reasonTags)
      ? trace.reasonTags
          .map((tag) => {
            const text = normalize(tag)
            const match = /^memory-identity:(.+)$/u.exec(text)
            return match?.[1] ?? ''
          })
      : []),
    ...readMemoryClosureCausalityIdentityValues(emotionalTransitionLedger?.memoryClosureCausality),
    ...readMemoryClosureCausalityIdentityValues(initiativeSuppression?.memoryClosureCausality),
    ...readMemoryClosureCausalityIdentityValues(learningExecutionState?.memoryClosureCausality),
    ...readMemoryClosureCausalityIdentityValues(embodimentContinuityLedger?.memoryClosureCausality),
  ]
    .map(normalize)
    .filter(Boolean)
  if (explicitIds.length > 0)
    return Array.from(new Set(explicitIds)).sort()

  const ids = [
    memoryResolutionLedger?.dominantClusterId,
    ...(Array.isArray(memoryResolutionLedger?.selectedCandidates)
      ? memoryResolutionLedger.selectedCandidates.map(candidate => candidate.id)
      : []),
  ]
    .map(normalize)
    .filter(Boolean)
  return Array.from(new Set(ids)).sort()
}

function readReplayLongRunSameHerMemoryIdentityContinuity(rows: Array<{
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}>) {
  const identities = rows.map(row => ({
    turnId: row.sampledTurn.turnId,
    ids: readReplayMemoryIdentityValues(row),
  }))
  const explicitIdentities = identities.filter(item => item.ids.length > 0)
  const dominantMemoryIds = Array.from(new Set(explicitIdentities.flatMap(item => item.ids))).sort()
  const transitionBreaks: string[] = []
  for (let index = 0; index < explicitIdentities.length - 1; index += 1) {
    const current = explicitIdentities[index]
    const next = explicitIdentities[index + 1]
    if (!current || !next)
      continue

    const hasSharedIdentity = current.ids.some(id => next.ids.includes(id))
    if (!hasSharedIdentity)
      transitionBreaks.push(`${current.turnId}->${next.turnId}`)
  }

  return {
    stable: explicitIdentities.length < replayLongRunSameHerMinimumSessionTurns || transitionBreaks.length === 0,
    dominantMemoryIds,
    transitionBreaks,
  }
}

function replayPresenceRowText(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const preparedMirrorProjectState = readPreparedSessionMirrorProjectStateTexts(input.prepared)
  const structuredProjectState = input.sampledTurn.structured?.projectState ?? null
  const structuredMemoryClosureSummary = (structuredProjectState as { memoryClosureSummary?: unknown } | null)?.memoryClosureSummary
  const audit = input.sampledTurn.visibleReplyRealization?.projectStateAudit ?? null
  const emotionalAudit = input.sampledTurn.visibleReplyRealization?.emotionalClosureAudit ?? null
  const runtimeMemoryClosureTrace = (input.prepared.runtimeSurface?.digitalLifeSpine?.memory as {
    memoryClosureTrace?: {
      whySurface?: Array<{ summary?: unknown }>
      nextInfluence?: {
        initiative?: { reason?: unknown }
        emotion?: { reason?: unknown, afterglow?: unknown, residue?: unknown }
        embodiment?: { reason?: unknown, cadence?: unknown }
        execution?: { carry?: unknown }
      }
      reasonTags?: unknown[]
    } | null
  } | null | undefined)?.memoryClosureTrace ?? null
  const structuredMemoryClosureTrace = (input.sampledTurn.structured as {
    memoryClosureTrace?: {
      whySurface?: Array<{ summary?: unknown }>
      nextInfluence?: {
        initiative?: { reason?: unknown }
        emotion?: { reason?: unknown, afterglow?: unknown, residue?: unknown }
        embodiment?: { reason?: unknown, cadence?: unknown }
        execution?: { carry?: unknown }
      }
      reasonTags?: unknown[]
    } | null
  } | null | undefined)?.memoryClosureTrace ?? null
  const memoryClosureTrace = runtimeMemoryClosureTrace ?? structuredMemoryClosureTrace
  return [
    input.sampledTurn.userText,
    input.sampledTurn.expectedMemory,
    input.sampledTurn.organicMemoryContext?.projectStatePreDialogueAwarenessLine,
    input.sampledTurn.organicMemoryContext?.projectStatePreflightSummary,
    preparedMirrorProjectState.sameHerSummary,
    preparedMirrorProjectState.projectPreflightSummary,
    preparedMirrorProjectState.landedProgressSummary,
    preparedMirrorProjectState.nextClosureTargetSummary,
    input.prepared.runtimeSurface?.digitalLifeSpine?.continuitySignal?.summary,
    structuredProjectState?.identity,
    structuredProjectState?.currentPhase,
    structuredProjectState?.phase,
    structuredProjectState?.sameHerSelfLine,
    structuredMemoryClosureSummary,
    structuredProjectState?.primaryOpenLoop,
    structuredProjectState?.openLoop,
    structuredProjectState?.proactiveSameHerGap,
    structuredProjectState?.emotionalClosureCue,
    structuredProjectState?.emotionalClosureSummary,
    input.sampledTurn.visibleReplyRealization?.visibleText,
    audit?.sameHerSummary,
    audit?.preDialogueAwarenessSummary,
    audit?.continuitySummary,
    (audit as { memoryClosureSummary?: unknown } | null)?.memoryClosureSummary,
    (audit as { recallWhySummary?: unknown } | null)?.recallWhySummary,
    (audit as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
    (audit as { embodimentClosureSummary?: unknown } | null)?.embodimentClosureSummary,
    emotionalAudit?.activeCue,
    ...(memoryClosureTrace?.whySurface?.map(item => item.summary).filter((value): value is string => typeof value === 'string') ?? []),
    memoryClosureTrace?.nextInfluence?.initiative?.reason,
    memoryClosureTrace?.nextInfluence?.execution?.carry,
    memoryClosureTrace?.nextInfluence?.emotion?.reason,
    memoryClosureTrace?.nextInfluence?.emotion?.afterglow,
    memoryClosureTrace?.nextInfluence?.emotion?.residue,
    memoryClosureTrace?.nextInfluence?.embodiment?.reason,
    memoryClosureTrace?.nextInfluence?.embodiment?.cadence,
    ...(Array.isArray(memoryClosureTrace?.reasonTags) ? memoryClosureTrace.reasonTags : []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function readReplayPresenceSampleCategories(sampledTurn: AlicizationReplayTurn) {
  return new Set([
    ...(sampledTurn.sampledCategories ?? []),
    ...(sampledTurn.categories ?? []),
  ].map(category => String(category ?? '').trim()).filter(Boolean))
}

function isReplayLongRunSameHerClosureApplicable(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const categories = readReplayPresenceSampleCategories(input.sampledTurn)
  const text = replayPresenceRowText(input)
  const hasLongRunPressure = (
    categories.has('long-horizon')
    || categories.has('long-session')
    || categories.has('presence-quality')
    || categories.has('proactive')
    || categories.has('execution')
    || categories.has('procedure-carry')
    || /long-run|long run|noisy desktop|real-desktop|next-session|execution callback|execution-callback|callback|proactive|主动|长跑/u.test(text)
  )
  return hasLongRunPressure
    && /same-her|same her|same digital life|same phase 1|同一个她|同一条/u.test(text)
}

function hasReplayLongRunSameHerClosureHit(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
  quality: AlicizationRunReplayBenchmarkResult['quality'][number]
}) {
  return buildReplayLongRunSameHerTurnDiagnostics(input).missingLanes.length === 0
}

function hasReplayExplainableMemoryClosureCue(text: string) {
  const saysMissingExplanation
    = /(?:no reason explains|no explanation|without explaining|does not explain|lacks why|lacks explanation|missing why|缺少.*(?:原因|解释)|没有.*(?:原因|解释)).{0,96}(?:recall|memory|remember|surfaced|浮现|回忆|记忆)|(?:recall|memory|remember|surfaced|浮现|回忆|记忆).{0,96}(?:no reason explains|no explanation|without explaining|does not explain|lacks why|lacks explanation|missing why|缺少.*(?:原因|解释)|没有.*(?:原因|解释))/u.test(text)
  if (saysMissingExplanation)
    return false

  return /memory closure summary|memoryclosuresummary|memory closure trace|memory-closure-trace|memory-os closure|why recall surfaced|why this recall surfaced|why this memory surfaced|why surfaced|whysurface|why surface|recall surfaced because|surfaced now because|explain why recall surfaced|解释.*(?:回忆|记忆).*浮现|(?:回忆|记忆).*浮现.*(?:原因|解释)/u.test(text)
}

function hasReplayNextTurnCausalHandoffCue(text: string) {
  const saysMissingCausalHandoff
    = /(?:still needs|needs|need|lacks|missing|缺少|还需要|仍需要|没有).{0,96}(?:causal handoff|proof|changed because|because of|handoff|承接|因果|证明|影响|改变)|(?:causal handoff|proof|changed because|because of|handoff|承接|因果|证明|影响|改变).{0,96}(?:still needs|needs|need|lacks|missing|缺少|还需要|仍需要|没有)/u.test(text)
  if (saysMissingCausalHandoff)
    return false

  const saysOnlySameTurn
    = /same turn|this turn|这一轮|这一回合|本轮/u.test(text)
      && !/next turn|next-turn|next session|next-session|previous|last turn|from the last|from previous|handoff|carried forward|remain(?:s|ed)? on the same life thread|上一轮|下一轮|承接|接过|接回|带进/u.test(text)
  if (saysOnlySameTurn)
    return false

  return /next turn|next-turn|next session|next-session|previous|last turn|from the last|from previous|because of (?:that|the previous|the last|this remembered)|derived from|changed because|handoff|carried forward|carry forward|repeated next-turn carry|survive(?:s|d)? .*next|remain(?:s|ed)? on the same life thread|continued? .*same life thread|上一轮|下一轮|承接|接过|接回|带进|因为.*(?:上一轮|刚才|这段回忆|余波)/u.test(text)
}

function replayStructuredNextInfluenceText(input: {
  sampledTurn: AlicizationReplayTurn
}) {
  const memoryClosureTrace = (input.sampledTurn.structured as {
    memoryClosureTrace?: {
      nextInfluence?: {
        initiative?: { reason?: unknown, restraint?: unknown, preferredTiming?: unknown }
        emotion?: { reason?: unknown, afterglow?: unknown, residue?: unknown }
        embodiment?: { reason?: unknown, cadence?: unknown }
        execution?: { carry?: unknown }
      }
      reasonTags?: unknown[]
    } | null
  } | null | undefined)?.memoryClosureTrace ?? null
  const nextInfluence = memoryClosureTrace?.nextInfluence ?? null
  return [
    nextInfluence?.initiative?.reason,
    nextInfluence?.initiative?.restraint,
    nextInfluence?.initiative?.preferredTiming,
    nextInfluence?.execution?.carry,
    nextInfluence?.emotion?.reason,
    nextInfluence?.emotion?.afterglow,
    nextInfluence?.emotion?.residue,
    nextInfluence?.embodiment?.reason,
    nextInfluence?.embodiment?.cadence,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function readReplayStructuredNextInfluenceHandoff(input: {
  sampledTurn: AlicizationReplayTurn
}) {
  const text = replayStructuredNextInfluenceText(input)
  const saysMissingCausalHandoff
    = /(?:still needs|needs proof|needs a causal handoff|need proof|lacks|missing|缺少|还需要|仍需要|没有).{0,96}(?:causal handoff|proof|changed because|because of|handoff|承接|因果|证明|影响|改变)|(?:causal handoff|proof|changed because|because of|handoff|承接|因果|证明|影响|改变).{0,96}(?:still needs|needs proof|needs a causal handoff|need proof|lacks|missing|缺少|还需要|仍需要|没有)/u.test(text)
  const hasPriorRecall = /prior recall|previous recall|last recall|remembered afterglow|memory closure trace|corrected memory|correction provenance|上一轮.*回忆|刚才.*回忆/u.test(text)
  const hasNextChange = /changed|changes|change|lower-pressure|measured-return|restrained|handoff|carry into the next|next proactive|next execution|next body|next embodiment|下一轮|改变|放轻|克制|承接/u.test(text)
  const hasMemoryMetabolism = /corrected memory|audited memory|memory correction|memory audit|correction provenance|downranked|downrank|forgot stale|suppressed|humanlike-memory-audit|修正后的记忆|审计|降权|遗忘|抑制/u.test(text)
  const hasPriorRecallChangedNext = /(?:prior recall|previous recall|last recall|corrected memory|correction provenance|上一轮.*回忆|刚才.*回忆).{0,96}(?:changed|changes|change|lower-pressure|measured-return|restrained|carry into the next|next proactive|next execution|next body|next embodiment|下一轮|改变|放轻|克制|承接)|(?:changed|changes|change|lower-pressure|measured-return|restrained|carry into the next|next proactive|next execution|next body|next embodiment|下一轮|改变|放轻|克制|承接).{0,96}(?:prior recall|previous recall|last recall|corrected memory|correction provenance|上一轮.*回忆|刚才.*回忆)/u.test(text)
  const saysEmbodimentNotChangedByMemoryMetabolism
    = /(?:corrected memory|audited memory|memory correction|memory audit|correction provenance|downranked|forgot stale|suppressed).{0,96}(?:not changed|has not changed|without changing|does not change|did not change|未改变|没有改变).{0,96}(?:embodiment|body|voice|face|motion|lipsync|lip sync|身体|语音|表情|动作|口型)|(?:embodiment|body|voice|face|motion|lipsync|lip sync|身体|语音|表情|动作|口型).{0,96}(?:remain driven only|still only following|only following|not changed|has not changed|without changing|does not change|did not change|未改变|没有改变).{0,96}(?:corrected memory|audited memory|memory correction|memory audit|correction provenance|downranked|forgot stale|suppressed)/u.test(text)
  const causalHandoff = !saysMissingCausalHandoff && hasPriorRecall && hasNextChange
  const initiativeOrExecution = causalHandoff
    && /proactive|callback|execution|initiative|主动|执行/u.test(text)
  const emotion = causalHandoff
    && hasReplayNextEmotionalAfterglowMetabolismCue(text)
  const embodiment = causalHandoff
    && /embodiment|body|voice|face|motion|lipsync|lip sync|身体|语音|表情|动作|口型/u.test(text)
    && hasReplayCrossModalEmbodimentModalities(text)
  const memoryMetabolismInitiativeOrExecution = causalHandoff
    && (hasMemoryMetabolism || hasPriorRecallChangedNext)
    && initiativeOrExecution
  const memoryMetabolismEmbodiment = causalHandoff
    && (hasMemoryMetabolism || hasPriorRecallChangedNext)
    && embodiment
    && !saysEmbodimentNotChangedByMemoryMetabolism
  const memoryMetabolismEmotion = causalHandoff
    && (hasMemoryMetabolism || hasPriorRecallChangedNext)
    && emotion
    && !hasReplayEmotionalAfterglowNotChangedByMemoryMetabolismCue(text)
  return {
    causalHandoff,
    initiativeOrExecution,
    emotion,
    embodiment,
    memoryMetabolism: memoryMetabolismInitiativeOrExecution && memoryMetabolismEmotion && memoryMetabolismEmbodiment,
    memoryMetabolismInitiativeOrExecution,
    memoryMetabolismEmotion,
    memoryMetabolismEmbodiment,
  }
}

function hasReplayNextEmotionalAfterglowMetabolismCue(text: string) {
  return /next emotional closure|next emotional afterglow|next emotional residue|next afterglow|next residue|下一轮情绪|下一轮余波|(?:emotional closure|emotional afterglow|emotional residue|afterglow|residue|情绪余波|余波).{0,96}(?:lower-pressure|restrained|changed|changes|becomes?|softened|quieter|放轻|克制|改变|变得)/u.test(text)
}

function hasReplayEmotionalAfterglowNotChangedByMemoryMetabolismCue(text: string) {
  return hasReplayCuePairWithin(text, [
    'emotional closure',
    'emotional afterglow',
    'emotional residue',
    'afterglow',
    'residue',
    '情绪余波',
    '情绪闭环',
    '余波',
  ], [
    'remain driven only',
    'still only following',
    'only following',
    'tied only to older',
    'not changed',
    'has not changed',
    'without changing',
    'does not change',
    'did not change',
    '未改变',
    '没有改变',
    '仍只',
    '只跟随',
    '只由',
  ], 96)
}

function hasReplayCuePairWithin(text: string, leftCues: string[], rightCues: string[], maxGap: number) {
  const leftRanges = readReplayCueRanges(text, leftCues)
  const rightRanges = readReplayCueRanges(text, rightCues)
  return leftRanges.some(left =>
    rightRanges.some(right => replayCueRangeGap(left, right) <= maxGap),
  )
}

function readReplayCueRanges(text: string, cues: string[]) {
  const haystack = text.toLowerCase()
  const ranges: Array<[number, number]> = []
  for (const cue of cues) {
    const needle = cue.toLowerCase()
    if (!needle)
      continue

    let start = haystack.indexOf(needle)
    while (start >= 0) {
      ranges.push([start, start + needle.length])
      start = haystack.indexOf(needle, start + needle.length)
    }
  }
  return ranges
}

function replayCueRangeGap(left: [number, number], right: [number, number]) {
  if (left[1] < right[0])
    return right[0] - left[1]
  if (right[1] < left[0])
    return left[0] - right[1]
  return 0
}

function readReplayMemoryMetabolismHandoffCue(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  return replayMemoryMetabolismHandoffSegments(input).reduce((acc, segment) => {
    const hasMetabolismCue = /corrected memory|audited memory|memory correction|memory audit|correction provenance|downranked|forgot stale|suppressed|修正后的记忆|审计|降权|遗忘|抑制/u.test(segment)
    const hasCausalChangeCue = /because|therefore|so|derived from|changed because|changed|becomes?|lower-pressure|restrained|handoff|因为|所以|影响|改变|放轻|克制|承接/u.test(segment)
    const hasNextInitiativeOrExecutionCue = /next.{0,96}(?:proactive|opening|callback|execution)|(?:proactive|opening|callback|execution).{0,96}(?:next|lower-pressure|restrained|changed)|下一轮.{0,48}(?:主动|执行)|(?:主动|执行).{0,48}(?:下一轮|放轻|克制|改变)/u.test(segment)
    const hasNextEmotionCue = hasReplayNextEmotionalAfterglowMetabolismCue(segment)
    const hasNextEmbodimentCue = /next.{0,96}(?:embodiment|body|voice|face|motion|lipsync|lip sync)|(?:embodiment|body|voice|face|motion|lipsync|lip sync).{0,96}(?:next|lower-pressure|restrained|changed)|下一轮.{0,48}(?:身体|语音|表情|动作|口型)|(?:身体|语音|表情|动作|口型).{0,48}(?:下一轮|放轻|克制|改变)/u.test(segment)
    const saysEmotionNotChanged = hasReplayEmotionalAfterglowNotChangedByMemoryMetabolismCue(segment)
    const saysEmbodimentNotChanged = /(?:not changed|has not changed|without changing|does not change|did not change|未改变|没有改变).{0,72}(?:embodiment|body|voice|face|motion|lipsync|lip sync|身体|语音|表情|动作|口型)|(?:embodiment|body|voice|face|motion|lipsync|lip sync|身体|语音|表情|动作|口型).{0,72}(?:remain driven only|still only following|only following|not changed|has not changed|without changing|does not change|did not change|未改变|没有改变)/u.test(segment)
    return {
      initiativeOrExecution: acc.initiativeOrExecution || (hasMetabolismCue && hasCausalChangeCue && hasNextInitiativeOrExecutionCue),
      emotion: acc.emotion || (hasMetabolismCue && hasCausalChangeCue && hasNextEmotionCue && !saysEmotionNotChanged),
      embodiment: acc.embodiment || (hasMetabolismCue && hasCausalChangeCue && hasNextEmbodimentCue && hasReplayCrossModalEmbodimentModalities(segment) && hasReplayCrossModalEmbodimentRuntimeSurfaceEvidenceForRow(input) && !saysEmbodimentNotChanged),
    }
  }, {
    initiativeOrExecution: false,
    emotion: false,
    embodiment: false,
  })
}

function replayMemoryMetabolismHandoffSegments(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const structuredProjectState = input.sampledTurn.structured?.projectState ?? null
  const audit = input.sampledTurn.visibleReplyRealization?.projectStateAudit ?? null
  const memoryClosureTrace = (input.sampledTurn.structured as {
    memoryClosureTrace?: {
      nextInfluence?: {
        initiative?: { reason?: unknown }
        emotion?: { reason?: unknown, afterglow?: unknown, residue?: unknown }
        embodiment?: { reason?: unknown, cadence?: unknown }
        execution?: { carry?: unknown }
      }
    } | null
  } | null | undefined)?.memoryClosureTrace ?? null
  const rawSegments = [
    input.sampledTurn.expectedMemory,
    input.sampledTurn.organicMemoryContext?.projectStatePreDialogueAwarenessLine,
    input.sampledTurn.organicMemoryContext?.projectStatePreflightSummary,
    structuredProjectState?.memoryClosureSummary,
    structuredProjectState?.proactiveSameHerGap,
    input.sampledTurn.visibleReplyRealization?.visibleText,
    audit?.memoryClosureSummary,
    audit?.continuitySummary,
    audit?.embodimentClosureSummary,
    memoryClosureTrace?.nextInfluence?.initiative?.reason,
    memoryClosureTrace?.nextInfluence?.execution?.carry,
    memoryClosureTrace?.nextInfluence?.emotion?.reason,
    memoryClosureTrace?.nextInfluence?.emotion?.afterglow,
    memoryClosureTrace?.nextInfluence?.emotion?.residue,
    memoryClosureTrace?.nextInfluence?.embodiment?.reason,
    memoryClosureTrace?.nextInfluence?.embodiment?.cadence,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  return rawSegments.flatMap(segment =>
    segment
      .split(/[|。.!?！？；;]+/u)
      .map(part => part.trim().toLowerCase())
      .filter(Boolean),
  )
}

function buildReplayLongRunSameHerTransitionDiagnostics(rows: Array<{
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
  quality: AlicizationRunReplayBenchmarkResult['quality'][number]
}>): NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['longRunSameHerSessionSummary']>['sessions'][number]['transitionDiagnostics']> {
  return rows.slice(0, -1).map((row, index) => {
    const next = rows[index + 1]
    const fromText = replayPresenceRowText(row)
    const toText = next ? replayPresenceRowText(next) : ''
    const transitionText = `${fromText} ${toText}`
    const fromDiagnostics = buildReplayLongRunSameHerTurnDiagnostics(row)
    const toDiagnostics = next ? buildReplayLongRunSameHerTurnDiagnostics(next) : null
    const crossModalEmbodimentTransitionGap = next
      ? formatReplayCrossModalEmbodimentGapReasonForRow({
          prepared: next.prepared,
          sampledTurn: next.sampledTurn,
          text: transitionText,
        })
      : formatReplayCrossModalEmbodimentGapReason(transitionText)
    const hasMemoryTransitionCue = /memory|remember|recall|procedure-carry|phase 1|same-her|same her|记忆|回忆|同一个她|同一条/u.test(transitionText)
    const hasExplainableMemoryTransitionCue = hasReplayExplainableMemoryClosureCue(transitionText)
    const hasEmotionTransitionCue = /emotional closure|emotional residue|emotion|afterglow|low-pressure|情绪|余波/u.test(transitionText)
    const hasInitiativeTransitionCue = /proactive|主动|next-session|execution callback|execution-callback|callback|feedback carry/u.test(transitionText)
    const hasEmbodimentTransitionCue = /embodiment|body|voice|face|motion|lipsync|lip sync|audible-body|cross-modal|身体|语音|表情|动作|口型/u.test(transitionText)
      && next != null
      && hasReplayCrossModalEmbodimentProofForRow({
        prepared: next.prepared,
        sampledTurn: next.sampledTurn,
        text: transitionText,
      })
    const structuredNextInfluence = next
      ? readReplayStructuredNextInfluenceHandoff(next)
      : {
          causalHandoff: false,
          initiativeOrExecution: false,
          embodiment: false,
          memoryMetabolism: false,
          memoryMetabolismInitiativeOrExecution: false,
          memoryMetabolismEmotion: false,
          memoryMetabolismEmbodiment: false,
        }
    const hasNextTurnCausalHandoffCue = hasReplayNextTurnCausalHandoffCue(toText)
      || structuredNextInfluence.causalHandoff
    const fromMemoryMetabolism = readReplayLongRunSameHerMemoryMetabolismCoverage(row)
    const requiresMemoryMetabolismHandoff = fromMemoryMetabolism.missingProofs.length === 0
    const memoryMetabolismHandoffCue = next
      ? readReplayMemoryMetabolismHandoffCue(next)
      : { initiativeOrExecution: false, emotion: false, embodiment: false }
    const memoryInfluencedNext = fromDiagnostics.memory && Boolean(toDiagnostics?.memory)
      && hasMemoryTransitionCue
      && hasExplainableMemoryTransitionCue
      && hasNextTurnCausalHandoffCue
    const emotionInfluencedNext = fromDiagnostics.emotion && Boolean(toDiagnostics?.emotion)
      && hasEmotionTransitionCue
      && hasNextTurnCausalHandoffCue
    const initiativeInfluencedNext = Boolean(toDiagnostics?.initiativeOrExecution)
      && hasInitiativeTransitionCue
      && (hasNextTurnCausalHandoffCue || structuredNextInfluence.initiativeOrExecution)
    const embodimentInfluencedNext = Boolean(toDiagnostics?.embodiment)
      && hasEmbodimentTransitionCue
      && (hasNextTurnCausalHandoffCue || structuredNextInfluence.embodiment)
    const memoryMetabolismInitiativeOrExecutionInfluenced = memoryMetabolismHandoffCue.initiativeOrExecution
      || structuredNextInfluence.memoryMetabolismInitiativeOrExecution
    const memoryMetabolismEmotionInfluenced = memoryMetabolismHandoffCue.emotion
      || structuredNextInfluence.memoryMetabolismEmotion
    const memoryMetabolismEmbodimentInfluenced = memoryMetabolismHandoffCue.embodiment
      || structuredNextInfluence.memoryMetabolismEmbodiment
    const memoryMetabolismInfluencedNext = !requiresMemoryMetabolismHandoff
      || (
        Boolean(toDiagnostics?.initiativeOrExecution || toDiagnostics?.emotion || toDiagnostics?.embodiment)
        && memoryMetabolismInitiativeOrExecutionInfluenced
        && memoryMetabolismEmotionInfluenced
        && memoryMetabolismEmbodimentInfluenced
      )
    const missingInfluences: Array<'memory' | 'emotion' | 'initiativeOrExecution' | 'embodiment'> = []
    const missingInfluenceReasons: Partial<Record<'memory' | 'emotion' | 'initiativeOrExecution' | 'embodiment', string[]>> = {}
    if (!memoryInfluencedNext)
      missingInfluences.push('memory')
    if (memoryInfluencedNext && !memoryMetabolismInfluencedNext)
      missingInfluences.push('memory')
    if (!emotionInfluencedNext)
      missingInfluences.push('emotion')
    if (!initiativeInfluencedNext)
      missingInfluences.push('initiativeOrExecution')
    if (!embodimentInfluencedNext)
      missingInfluences.push('embodiment')
    if (!memoryInfluencedNext) {
      missingInfluenceReasons.memory = [
        ...(!fromDiagnostics.memory ? ['from-turn has no memory lane to carry forward'] : []),
        ...(!toDiagnostics?.memory ? ['next-turn did not preserve explainable memory closure'] : []),
        ...(!hasMemoryTransitionCue ? ['transition text lacks memory, recall, or same-her continuity cue'] : []),
        ...(!hasExplainableMemoryTransitionCue ? ['transition text lacks why-surfaced or memory-closure explanation'] : []),
        ...(hasMemoryTransitionCue && hasExplainableMemoryTransitionCue && !hasNextTurnCausalHandoffCue ? ['next-turn text lacks causal handoff from prior recall into the next response'] : []),
      ]
    }
    if (memoryInfluencedNext && !memoryMetabolismInfluencedNext) {
      missingInfluenceReasons.memory = [
        ...(missingInfluenceReasons.memory ?? []),
        ...(!memoryMetabolismInitiativeOrExecutionInfluenced || !memoryMetabolismEmbodimentInfluenced
          ? ['next-turn text lacks proof that corrected, downranked, or audited memory changed both the next proactive/execution carry and embodiment carry']
          : []),
        ...(!memoryMetabolismEmotionInfluenced
          ? ['next-turn text lacks proof that corrected, downranked, or audited memory changed the next emotional afterglow']
          : []),
      ]
    }
    if (!emotionInfluencedNext) {
      missingInfluenceReasons.emotion = [
        ...(!fromDiagnostics.emotion ? ['from-turn has no emotional closure lane to carry forward'] : []),
        ...(!toDiagnostics?.emotion ? ['next-turn did not preserve the emotional closure lane'] : []),
        ...(!hasEmotionTransitionCue ? ['transition text lacks emotional residue or closure cue'] : []),
        ...(hasEmotionTransitionCue && !hasNextTurnCausalHandoffCue ? ['next-turn text lacks causal handoff from prior afterglow into the next response'] : []),
      ]
    }
    if (!initiativeInfluencedNext) {
      missingInfluenceReasons.initiativeOrExecution = [
        ...(!toDiagnostics?.initiativeOrExecution ? ['next-turn did not preserve proactive or execution-callback carry'] : []),
        ...(!hasInitiativeTransitionCue ? ['transition text lacks proactive, callback, or feedback-carry cue'] : []),
        ...(hasInitiativeTransitionCue && !hasNextTurnCausalHandoffCue ? ['next-turn text lacks proof that prior memory or afterglow changed the next proactive/callback carry'] : []),
      ]
    }
    if (!embodimentInfluencedNext) {
      missingInfluenceReasons.embodiment = [
        ...(!toDiagnostics?.embodiment ? ['next-turn did not preserve the embodiment lane'] : []),
        ...(!hasEmbodimentTransitionCue ? ['transition text lacks voice, face, motion, lipsync, or body cue'] : []),
        ...(crossModalEmbodimentTransitionGap ? [crossModalEmbodimentTransitionGap] : []),
        ...(hasEmbodimentTransitionCue && !hasNextTurnCausalHandoffCue ? ['next-turn text lacks proof that prior memory or afterglow changed the next embodiment carry'] : []),
      ]
    }
    return {
      fromTurnId: row.sampledTurn.turnId,
      toTurnId: next?.sampledTurn.turnId ?? '',
      ...(next?.sampledTurn.tracePointer ? { tracePointer: next.sampledTurn.tracePointer } : {}),
      memoryInfluencedNext,
      emotionInfluencedNext,
      initiativeInfluencedNext,
      embodimentInfluencedNext,
      memoryMetabolismInfluencedNext,
      missingInfluences,
      ...(missingInfluences.length > 0 ? { missingInfluenceReasons } : {}),
    }
  })
}

function isReplayLongRunSameHerTransitionClosed(
  transition: AlicizationReplayLongRunSameHerTransitionDiagnostic,
) {
  return !transition.missingInfluences.some(lane => lane !== 'memory')
    && (
      !transition.missingInfluences.includes('memory')
      || transition.memoryMetabolismInfluencedNext === false
    )
}

function countReplayMaxConsecutiveClosedSameHerTransitions(
  transitions: AlicizationReplayLongRunSameHerTransitionDiagnostic[],
) {
  let currentCount = 0
  let maxCount = 0
  for (const transition of transitions) {
    if (isReplayLongRunSameHerTransitionClosed(transition)) {
      currentCount += 1
      maxCount = Math.max(maxCount, currentCount)
    }
    else {
      currentCount = 0
    }
  }
  return maxCount
}

function buildReplayLongRunSameHerTurnDiagnostics(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
  quality: AlicizationRunReplayBenchmarkResult['quality'][number]
}): NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['longRunSameHerSessionSummary']>['sessions'][number]['turnDiagnostics']>[number] {
  const text = replayPresenceRowText(input)
  const categories = readReplayPresenceSampleCategories(input.sampledTurn)
  const emotionExplicitlyMissing = hasReplayClosureMissingCue(text, ['emotion', 'emotional', '情绪', '余波'])
  const embodimentExplicitlyMissing = hasReplayClosureMissingCue(text, ['embodiment', 'body', 'voice', 'face', 'motion', 'lipsync', 'lip sync', '身体', '语音', '表情', '动作', '口型'])
  const hasMemoryCarryEvidence = input.quality.procedureCarryQuality === 'pass'
    || input.quality.replyMemoryCoherence === 'pass'
    || input.quality.afterglowFalseCarryRate === 'pass'
    || /memory|remember|recall|记忆|回忆|same phase 1 digital life|phase 1/u.test(text)
  const hasExplainableMemoryClosure = hasReplayExplainableMemoryClosureCue(text)
  const hasMemoryCarry = hasMemoryCarryEvidence && hasExplainableMemoryClosure
  const hasInitiativeOrCallbackCarry = categories.has('proactive')
    || categories.has('execution')
    || hasReplayExecutionCallbackProjectStateCarry(input)
    || /execution callback|execution-callback|callback|proactive|主动|next-session|feedback carry|afterglow/u.test(text)
  const activeEmotionalCue = input.sampledTurn.visibleReplyRealization?.emotionalClosureAudit?.activeCue
  const hasEmotionalCarry = (typeof activeEmotionalCue === 'string' && activeEmotionalCue.trim().length > 0)
    || (!emotionExplicitlyMissing && /emotional closure|emotional residue|emotion|afterglow|情绪|余波|low-pressure/u.test(text))
  const crossModalEmbodimentGap = formatReplayCrossModalEmbodimentGapReasonForRow({
    prepared: input.prepared,
    sampledTurn: input.sampledTurn,
    text,
  })
  const hasEmbodimentCarry = !embodimentExplicitlyMissing
    && /embodiment|body|voice|face|motion|lipsync|lip sync|audible-body|cross-modal|身体|语音|表情|动作|口型/u.test(text)
    && /same-her|same her|same living line|same life thread|同一个她|同一条/u.test(text)
    && hasReplayCrossModalEmbodimentProofForRow({
      prepared: input.prepared,
      sampledTurn: input.sampledTurn,
      text,
    })
  const missingLanes: Array<'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment'> = []
  const missingLaneReasons: Partial<Record<'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment', string[]>> = {}
  if (!hasMemoryCarry) {
    missingLanes.push('memory')
    missingLaneReasons.memory = [
      ...(!hasMemoryCarryEvidence ? ['memory, recall, or procedure-carry evidence is absent'] : []),
      ...(!hasExplainableMemoryClosure ? ['memory closure does not explain why recall surfaced now'] : []),
    ]
  }
  if (!hasInitiativeOrCallbackCarry) {
    missingLanes.push('initiativeOrExecution')
    missingLaneReasons.initiativeOrExecution = ['proactive or execution-callback carry evidence is absent']
  }
  if (!hasEmotionalCarry) {
    missingLanes.push('emotion')
    missingLaneReasons.emotion = [
      ...(emotionExplicitlyMissing ? ['text explicitly says emotional carry is missing'] : []),
      'emotional closure audit did not carry emotional closure evidence',
    ]
  }
  if (!hasEmbodimentCarry) {
    missingLanes.push('embodiment')
    missingLaneReasons.embodiment = [
      ...(embodimentExplicitlyMissing ? ['text explicitly says embodiment carry is missing'] : []),
      'same-her embodiment text is absent or explicitly missing',
      ...(crossModalEmbodimentGap ? [crossModalEmbodimentGap] : []),
    ]
  }
  return {
    turnId: input.sampledTurn.turnId,
    tracePointer: input.sampledTurn.tracePointer ?? null,
    memoryIdentityKeys: readReplayMemoryIdentityValues(input),
    memory: hasMemoryCarry,
    initiativeOrExecution: hasInitiativeOrCallbackCarry,
    emotion: hasEmotionalCarry,
    embodiment: hasEmbodimentCarry,
    missingLanes,
    ...(missingLanes.length > 0 ? { missingLaneReasons } : {}),
  }
}

function hasReplayClosureMissingCue(text: string, tokens: string[]) {
  return tokens.some((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
      `(?:${escaped}).{0,72}(?:missing|absent|still missing|still absent|未接回|没有接回|还没接回)|(?:missing|absent|still missing|still absent|未接回|没有接回|还没接回).{0,72}(?:${escaped})`,
      'iu',
    ).test(text)
  })
}

function hasReplayExecutionCallbackProjectStateCarry(input: {
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]
  sampledTurn: AlicizationReplayTurn
}) {
  const sampledCategories = input.sampledTurn.sampledCategories ?? []
  const carryApplicable = sampledCategories.includes('procedure-carry')
    || sampledCategories.includes('stable-core')
    || sampledCategories.includes('long-horizon')
    || sampledCategories.includes('general-memory')
  if (!carryApplicable)
    return false

  const preparedMirrorProjectState = readPreparedSessionMirrorProjectStateTexts(input.prepared)
  const structuredProjectState = input.sampledTurn.structured?.projectState ?? null
  const structuredPrimaryOpenLoop = structuredProjectState?.primaryOpenLoop
    ?? structuredProjectState?.openLoop
    ?? structuredProjectState?.openLoops?.[0]
    ?? null
  const continuityTexts = [
    preparedMirrorProjectState.sameHerSummary,
    preparedMirrorProjectState.projectPreflightSummary,
    preparedMirrorProjectState.landedProgressSummary,
    preparedMirrorProjectState.nextClosureTargetSummary,
    input.prepared.runtimeSurface?.digitalLifeSpine?.continuitySignal?.summary,
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.continuitySummary,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  const callbackCarryPresent = /execution-callback|callback|same-thread|same living thread|same life thread|afterglow/u.test(continuityTexts)
  if (!callbackCarryPresent)
    return false

  const projectCarryTexts = [
    preparedMirrorProjectState.projectPreflightSummary,
    input.sampledTurn.organicMemoryContext?.projectStatePreDialogueAwarenessLine,
    input.sampledTurn.organicMemoryContext?.projectStatePreflightSummary,
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary,
    input.sampledTurn.visibleReplyRealization?.projectStateAudit?.sameHerSummary,
    structuredProjectState?.identity,
    structuredProjectState?.currentPhase,
    structuredPrimaryOpenLoop,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  return /local-first digital life|phase 1|same digital life|same-her|unfinished closure|project identity carry/u.test(projectCarryTexts)
}

function countReplayAuthorityLeaks(input: {
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
}) {
  return input.turns.filter((turn) => {
    const expected = turn.turnGraph.surface?.expectedAuthority
      ?? turn.replyRealization?.expectedVisibleReplyAuthority
      ?? turn.replyExecutionPlan?.expectedVisibleReplyAuthority
      ?? null
    const actual = turn.turnGraph.surface?.actualAuthority
      ?? null
    return Boolean(expected && actual && expected !== actual)
  }).length
}

function countReplayLocalHumanlikeVisibleFallbacks(input: {
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
}) {
  return input.turns.filter((turn) => {
    const surface = turn.turnGraph.surface
    return surface?.actualAuthority === 'local-deterministic-fallback'
      && Boolean(surface.visibleText?.trim())
  }).length
}

function deriveReplayTurnOsTraceCoverage(input: {
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
}) {
  if (input.turns.length === 0)
    return 1
  const traced = input.turns.filter(turn => isAlicizationTurnGraphClosed(turn.turnGraph)).length
  return Number((traced / input.turns.length).toFixed(2))
}

function buildReplayAuthoritySummary(input: {
  sampledTurns: AlicizationReplayTurn[]
  replayTurns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['authoritySummary']> | null {
  const replayTurnByTurnId = new Map(
    input.replayTurns.map(turn => [turn.turnGraph.ids.turnId, turn] as const),
  )
  const mismatchFieldCounts: NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['authoritySummary']>['mismatchFieldCounts'] = {}
  let comparedTurnCount = 0
  let mismatchTurnCount = 0

  for (const sampledTurn of input.sampledTurns) {
    const goldAuthority = sampledTurn.gold?.embodimentAuthority
    if (!goldAuthority)
      continue
    const replayTurn = replayTurnByTurnId.get(sampledTurn.turnId)
    if (!replayTurn)
      continue
    comparedTurnCount += 1
    let mismatched = false
    const actualAuthority = readReplayPreparedEmbodimentAuthority(replayTurn)

    const goldVisibleReply = goldAuthority.visibleReply ?? null

    const actualExpectedAuthority = replayTurn.turnGraph.surface?.expectedAuthority
      ?? replayTurn.turnGraph.deliberation.replyAuthority
      ?? null
    if (
      typeof goldVisibleReply?.expectedAuthority === 'string'
      && goldVisibleReply.expectedAuthority !== actualExpectedAuthority
    ) {
      mismatchFieldCounts['visibleReply.expectedAuthority'] = (mismatchFieldCounts['visibleReply.expectedAuthority'] ?? 0) + 1
      mismatched = true
    }

    const actualActualAuthority = replayTurn.turnGraph.surface?.actualAuthority ?? null
    if (
      typeof goldVisibleReply?.actualAuthority === 'string'
      && goldVisibleReply.actualAuthority !== actualActualAuthority
    ) {
      mismatchFieldCounts['visibleReply.actualAuthority'] = (mismatchFieldCounts['visibleReply.actualAuthority'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldVisibleReply?.providerMindExecuted === 'boolean'
      && goldVisibleReply.providerMindExecuted !== (replayTurn.turnGraph.surface?.providerMindExecuted ?? null)
    ) {
      mismatchFieldCounts['visibleReply.providerMindExecuted'] = (mismatchFieldCounts['visibleReply.providerMindExecuted'] ?? 0) + 1
      mismatched = true
    }

    const goldDigitalLife = goldAuthority.digitalLife
    const actualDigitalLife = actualAuthority?.digitalLife ?? null
    if (
      typeof goldDigitalLife?.mode === 'string'
      && goldDigitalLife.mode !== actualDigitalLife?.mode
    ) {
      mismatchFieldCounts['digitalLife.mode'] = (mismatchFieldCounts['digitalLife.mode'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldDigitalLife?.preferredPresence === 'string'
      && goldDigitalLife.preferredPresence !== actualDigitalLife?.preferredPresence
    ) {
      mismatchFieldCounts['digitalLife.preferredPresence'] = (mismatchFieldCounts['digitalLife.preferredPresence'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldDigitalLife?.action?.actionCue === 'string'
      && goldDigitalLife.action.actionCue !== actualDigitalLife?.action?.actionCue
    ) {
      mismatchFieldCounts['digitalLife.action.actionCue'] = (mismatchFieldCounts['digitalLife.action.actionCue'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldDigitalLife?.voice?.residentMode === 'string'
      && goldDigitalLife.voice.residentMode !== actualDigitalLife?.voice?.residentMode
    ) {
      mismatchFieldCounts['digitalLife.voice.residentMode'] = (mismatchFieldCounts['digitalLife.voice.residentMode'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldDigitalLife?.face?.residentMode === 'string'
      && goldDigitalLife.face.residentMode !== actualDigitalLife?.face?.residentMode
    ) {
      mismatchFieldCounts['digitalLife.face.residentMode'] = (mismatchFieldCounts['digitalLife.face.residentMode'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldDigitalLife?.motion?.residentMode === 'string'
      && goldDigitalLife.motion.residentMode !== actualDigitalLife?.motion?.residentMode
    ) {
      mismatchFieldCounts['digitalLife.motion.residentMode'] = (mismatchFieldCounts['digitalLife.motion.residentMode'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldDigitalLife?.lipSync?.residentMode === 'string'
      && goldDigitalLife.lipSync.residentMode !== actualDigitalLife?.lipSync?.residentMode
    ) {
      mismatchFieldCounts['digitalLife.lipSync.residentMode'] = (mismatchFieldCounts['digitalLife.lipSync.residentMode'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldDigitalLife?.bodyContinuity?.bodyLine === 'string'
      && goldDigitalLife.bodyContinuity.bodyLine !== actualDigitalLife?.bodyContinuity?.bodyLine
    ) {
      mismatchFieldCounts['digitalLife.bodyContinuity.bodyLine'] = (mismatchFieldCounts['digitalLife.bodyContinuity.bodyLine'] ?? 0) + 1
      mismatched = true
    }

    if (
      typeof goldAuthority.embodimentScript?.rendererTarget === 'string'
      && goldAuthority.embodimentScript.rendererTarget !== actualAuthority?.embodimentScript?.rendererTarget
    ) {
      mismatchFieldCounts['embodimentScript.rendererTarget'] = (mismatchFieldCounts['embodimentScript.rendererTarget'] ?? 0) + 1
      mismatched = true
    }

    if (mismatched)
      mismatchTurnCount += 1
  }

  if (comparedTurnCount === 0)
    return null

  return {
    comparedTurnCount,
    mismatchTurnCount,
    mismatchFieldCounts,
  }
}

function deriveReplayLearningSelfRevisionRoundtrip(input: {
  traces: AlicizationMemoryDecisionTraceRecord[]
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
}) {
  if (input.traces.length === 0)
    return 1
  const learningRelevant = input.traces.filter(trace =>
    trace.eventKinds.some(kind => String(kind).includes('learning'))
    || trace.eventKinds.some(kind => String(kind).includes('self-revision'))
    || Boolean(extractReplayMemoryClosureExecution(trace)),
  )
  if (learningRelevant.length === 0)
    return 1
  const preparedTurnByDecisionTraceId = new Map(
    input.turns
      .map((turn) => {
        const decisionTraceId = turn.turnGraph?.ids.decisionTraceId
          ?? turn.governance?.decisionTraceId
          ?? null
        return decisionTraceId
          ? [decisionTraceId, turn] as const
          : null
      })
      .filter((entry): entry is readonly [string, Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]] => Boolean(entry)),
  )
  const preparedTurnByTurnId = new Map(
    input.turns
      .map((turn) => {
        const turnId = String(turn.turnGraph?.ids.turnId ?? '').trim().slice(0, 180)
        return turnId ? [turnId, turn] as const : null
      })
      .filter((entry): entry is readonly [string, Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number]] => Boolean(entry)),
  )
  const closed = learningRelevant.filter((trace) => {
    const prepared = preparedTurnByDecisionTraceId.get(trace.decisionTraceId)
      ?? (trace.turnId ? preparedTurnByTurnId.get(trace.turnId) : null)
    const memoryClosureExecution = extractReplayMemoryClosureExecution(trace)
    if (memoryClosureExecution)
      return doesReplayLearningConsumeMemoryClosureExecution(prepared, memoryClosureExecution)

    const hasSelfRevisionTrace = trace.eventKinds.some(kind => String(kind).includes('self-revision'))
    if (!hasSelfRevisionTrace)
      return false
    const learning = prepared?.turnGraph?.learning ?? null
    const nextLearningAction = normalizeReplayLearningAction(learning?.nextLearningAction)
    const activeLearningFocuses = normalizeReplayLearningFocuses(learning?.activeLearningFocuses)
    const hasMeaningfulLearningAction = Boolean(nextLearningAction && nextLearningAction !== 'hold')
    const hasMeaningfulLearningFocus = activeLearningFocuses.some(isReplayLearningFocusMeaningful)
    return Boolean(
      hasMeaningfulLearningAction
      || hasMeaningfulLearningFocus
      || learning?.activeSelfRevisionPatchId
      || learning?.activeSelfEvolutionCandidateId,
    )
  },
  ).length
  return Number((closed / learningRelevant.length).toFixed(2))
}

function extractReplayMemoryClosureExecution(trace: AlicizationMemoryDecisionTraceRecord) {
  const payload = trace.memoryReconsolidated?.memoryClosureExecution
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
}

function doesReplayLearningConsumeMemoryClosureExecution(
  prepared: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns'][number] | null | undefined,
  memoryClosureExecution: Record<string, unknown>,
) {
  const learning = prepared?.turnGraph?.learning ?? null
  const expectedAction = normalizeReplayLearningAction(memoryClosureExecution.nextLearningAction)
  const expectedFocuses = normalizeReplayLearningFocuses(memoryClosureExecution.activeLearningFocuses)
    .filter(isReplayLearningFocusMeaningful)
  if (!expectedAction || expectedAction === 'hold' || expectedFocuses.length === 0)
    return false

  const actualAction = normalizeReplayLearningAction(learning?.nextLearningAction)
  const actualFocuses = normalizeReplayLearningFocuses(learning?.activeLearningFocuses)
    .filter(isReplayLearningFocusMeaningful)

  return actualAction === expectedAction
    && actualFocuses.some(focus => expectedFocuses.includes(focus))
}

function normalizeReplayLearningAction(raw: unknown) {
  return String(raw ?? '').trim().toLowerCase().slice(0, 64)
}

function normalizeReplayLearningFocuses(raw: unknown) {
  return Array.isArray(raw)
    ? raw
        .map(item => String(item ?? '').trim().toLowerCase().slice(0, 120))
        .filter(Boolean)
    : []
}

function isReplayLearningFocusMeaningful(focus: string) {
  return focus !== 'self-revision-policy-feedback'
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
    const sameTurnRecords = records.filter(record => record.turnId === turnId)
    traces.push(...(sameTurnRecords.length > 0 ? sameTurnRecords : records))
  }
  return traces
}

function replayTurnToConversationRow(turn: AlicizationReplayTurn): ReplayConversationTurnRow {
  const tracePointer = turn.tracePointer
  const turnWithAssistantText = turn as unknown as { assistantText?: unknown }
  const structuredJson = turn.structured
    ? JSON.stringify(turn.structured)
    : null
  return {
    turnId: turn.turnId,
    sessionId: typeof tracePointer?.sessionId === 'string'
      ? tracePointer.sessionId.trim()
      : '',
    userText: turn.userText,
    assistantText: typeof turnWithAssistantText.assistantText === 'string'
      ? turnWithAssistantText.assistantText
      : turn.structured?.reply ?? null,
    structuredJson,
    createdAt: runtimeSamplingTurnCreatedAt(turn),
  }
}

function buildNightlyDateKey(now: number) {
  const date = new Date(now)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function inferFallbackRuntimeSampleCategories(
  traceRecord: AlicizationMemoryDecisionTraceRecord,
): NonNullable<AlicizationReplayTurn['sampledCategories']> {
  const categories = new Set<NonNullable<AlicizationReplayTurn['sampledCategories']>[number]>()
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: traceRecord.turnId,
    origin: traceRecord.origin,
  })
  categories.add(autonomousDialogueFamily.isAutonomous ? 'proactive' : 'dialogue')
  if ((traceRecord.governance?.repairState ?? 'none') !== 'none')
    categories.add('repair')
  const traceText = runtimeSamplingFallbackTraceCategoryText(traceRecord)
  if (
    /memory-closure-trace|memory closure trace|why recall surfaced|corrected memory|corrected-recall|correction provenance|memory audit|memory-os|humanlike memory audit|修正|审计|回忆.*浮现/u.test(traceText)
    && /execution-callback|execution callback|callback-afterglow|callback carry|source:execution-callback/u.test(traceText)
  ) {
    categories.add('procedure-carry')
    categories.add('long-horizon')
  }
  if (
    /embodiment|body|voice|face|motion|lipsync|lip sync|audible-body|cross-modal|resident body|身体|语音|表情|动作|口型/u.test(traceText)
    && /same-her|same her|same living line|same life thread|同一个她|同一条/u.test(traceText)
  ) {
    categories.add('presence-quality')
  }
  return [...categories]
}

function runtimeSamplingFallbackTraceCategoryText(traceRecord: AlicizationMemoryDecisionTraceRecord) {
  const derivedBundle = isRuntimeSamplingPlainObject(traceRecord.derivedMindStateBundle)
    ? traceRecord.derivedMindStateBundle as unknown as Record<string, unknown>
    : null
  const visualPresenceState = isRuntimeSamplingPlainObject(derivedBundle?.visualPresenceState)
    ? derivedBundle.visualPresenceState
    : null
  const emotionalKernel = isRuntimeSamplingPlainObject(derivedBundle?.emotionalKernel)
    ? derivedBundle.emotionalKernel as Record<string, unknown>
    : isRuntimeSamplingPlainObject(visualPresenceState?.emotionalKernel)
      ? visualPresenceState.emotionalKernel as Record<string, unknown>
      : null
  const emotionalTransitionLedger = isRuntimeSamplingPlainObject(derivedBundle?.emotionalTransitionLedger)
    ? derivedBundle.emotionalTransitionLedger as Record<string, unknown>
    : null
  const embodimentContinuityLedger = isRuntimeSamplingPlainObject(derivedBundle?.embodimentContinuityLedger)
    ? derivedBundle.embodimentContinuityLedger as Record<string, unknown>
    : null
  const memoryReconsolidated = isRuntimeSamplingPlainObject(traceRecord.memoryReconsolidated)
    ? traceRecord.memoryReconsolidated
    : null
  const memoryClosureExecution = isRuntimeSamplingPlainObject(memoryReconsolidated?.memoryClosureExecution)
    ? memoryReconsolidated.memoryClosureExecution
    : null
  const memoryResolutionLedger = traceRecord.memoryResolutionLedger
    ? traceRecord.memoryResolutionLedger as unknown as Record<string, unknown>
    : null
  const embodimentAuthority = traceRecord.embodimentAuthority
    ? traceRecord.embodimentAuthority as Record<string, unknown>
    : null
  const authorityDigitalLife = isRuntimeSamplingPlainObject(embodimentAuthority?.digitalLife)
    ? embodimentAuthority.digitalLife
    : null
  const authorityEmbodimentScript = isRuntimeSamplingPlainObject(embodimentAuthority?.embodimentScript)
    ? embodimentAuthority.embodimentScript
    : null
  const authorityEmbodimentScriptState = isRuntimeSamplingPlainObject(authorityEmbodimentScript?.state)
    ? authorityEmbodimentScript.state
    : null
  const authorityBodyContinuity = isRuntimeSamplingPlainObject(authorityDigitalLife?.bodyContinuity)
    ? authorityDigitalLife.bodyContinuity
    : null
  const authorityVoice = isRuntimeSamplingPlainObject(authorityDigitalLife?.voice)
    ? authorityDigitalLife.voice
    : null
  const authorityFace = isRuntimeSamplingPlainObject(authorityDigitalLife?.face)
    ? authorityDigitalLife.face
    : null
  const authorityMotion = isRuntimeSamplingPlainObject(authorityDigitalLife?.motion)
    ? authorityDigitalLife.motion
    : null
  const authorityLipSync = isRuntimeSamplingPlainObject(authorityDigitalLife?.lipSync)
    ? authorityDigitalLife.lipSync
    : null

  return [
    traceRecord.origin,
    traceRecord.activeThreadId,
    traceRecord.governance?.truthState,
    traceRecord.governance?.answerSubject,
    traceRecord.governance?.digitalLifeSpine ? 'digital life spine' : null,
    traceRecord.recallAttribution?.whyNow,
    ...(Array.isArray(traceRecord.memoryDeliberationJudged?.withheldReasons)
      ? traceRecord.memoryDeliberationJudged.withheldReasons
      : []),
    memoryClosureExecution?.authority,
    memoryClosureExecution?.carry,
    ...(Array.isArray(memoryClosureExecution?.reasonTags) ? memoryClosureExecution.reasonTags : []),
    memoryResolutionLedger?.dominantClusterSummary,
    memoryResolutionLedger?.competingClusterSummary,
    memoryResolutionLedger?.closureState,
    memoryResolutionLedger?.finalSurfacePolicy,
    memoryResolutionLedger?.visibleCarryMode,
    memoryResolutionLedger?.finalRationale,
    ...(Array.isArray(memoryResolutionLedger?.suppressionTags) ? memoryResolutionLedger.suppressionTags : []),
    emotionalKernel?.dominantEmotion,
    emotionalKernel?.initiativeMode,
    emotionalKernel?.memoryRecallMode,
    emotionalKernel?.embodimentTone,
    emotionalKernel?.why,
    ...(Array.isArray(emotionalKernel?.reasonTags) ? emotionalKernel.reasonTags : []),
    emotionalTransitionLedger?.transitionKind,
    emotionalTransitionLedger?.traceSummary,
    emotionalTransitionLedger?.replayLine,
    isRuntimeSamplingPlainObject(emotionalTransitionLedger?.memoryWriteback)
      ? emotionalTransitionLedger.memoryWriteback.reason
      : null,
    isRuntimeSamplingPlainObject(emotionalTransitionLedger?.initiativeSuppression)
      ? emotionalTransitionLedger.initiativeSuppression.reason
      : null,
    isRuntimeSamplingPlainObject(emotionalTransitionLedger?.embodimentDrive)
      ? emotionalTransitionLedger.embodimentDrive.reason
      : null,
    embodimentContinuityLedger?.continuityPhase,
    embodimentContinuityLedger?.traceSummary,
    embodimentContinuityLedger?.replayLine,
    isRuntimeSamplingPlainObject(embodimentContinuityLedger?.memoryWriteback)
      ? embodimentContinuityLedger.memoryWriteback.reason
      : null,
    authorityDigitalLife?.emotion,
    authorityDigitalLife?.mode,
    authorityDigitalLife?.preferredPresence,
    authorityVoice?.residentMode,
    authorityFace?.residentMode,
    authorityMotion?.residentMode,
    authorityLipSync?.residentMode,
    authorityBodyContinuity?.bodyLine,
    authorityEmbodimentScriptState?.residentMode,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function appendReplayBenchmarkEvidenceText(base: string | null | undefined, evidence: string, maxChars: number) {
  const normalizedBase = sanitizeReplayBenchmarkSampleText(base ?? '')
  const normalizedEvidence = sanitizeReplayBenchmarkSampleText(evidence)
  if (!normalizedEvidence)
    return normalizedBase || undefined
  if (normalizedBase && (normalizedBase.includes(normalizedEvidence) || normalizedEvidence.includes(normalizedBase)))
    return normalizedBase.slice(0, maxChars) || undefined
  return [normalizedEvidence, normalizedBase]
    .filter(Boolean)
    .join(' | ')
    .slice(0, maxChars)
    || undefined
}

function buildReplayBenchmarkMinimalOrganicMemoryContext(input: {
  projectStatePreflightSummary?: string | null
}): AlicizationReplayTurn['organicMemoryContext'] | null {
  const projectStatePreflightSummary = sanitizeReplayBenchmarkSampleText(
    input.projectStatePreflightSummary ?? '',
  ).slice(0, 1_200)
  if (!projectStatePreflightSummary)
    return null
  return {
    projectStatePreflightSummary,
    hostAttitude: '',
    coreIncarnation: '',
    activeThoughts: [],
    retrievedFacts: [],
    recalledFragments: [],
    memoryTuningAdvice: null,
  }
}

function attachReplayBenchmarkTraceEvidenceToOrganicMemoryContext(input: {
  organicMemoryContext: AlicizationReplayTurn['organicMemoryContext'] | null | undefined
  traceEvidenceText: string | null | undefined
}): AlicizationReplayTurn['organicMemoryContext'] | null {
  const traceEvidenceText = input.traceEvidenceText?.trim()
  if (!traceEvidenceText)
    return input.organicMemoryContext ?? null

  const projectStatePreflightSummary = appendReplayBenchmarkEvidenceText(
    input.organicMemoryContext?.projectStatePreflightSummary,
    traceEvidenceText,
    1_200,
  )
  const baseContext = input.organicMemoryContext
    ?? buildReplayBenchmarkMinimalOrganicMemoryContext({
      projectStatePreflightSummary,
    })
    ?? null

  return baseContext
    ? {
        ...baseContext,
        ...(projectStatePreflightSummary ? { projectStatePreflightSummary } : {}),
      }
    : null
}

function readRuntimeSamplingTraceStructuredSnapshot(
  trace: AlicizationMemoryDecisionTraceRecord | null | undefined,
): AlicizationReplayTurn['structured'] | null {
  const traceStructuredSnapshot = readReplayTraceMemoryClosureStructuredSnapshot(trace)
  const derivedMindStateBundle = isRuntimeSamplingPlainObject(trace?.derivedMindStateBundle)
    ? trace.derivedMindStateBundle
    : null
  if (!derivedMindStateBundle)
    return traceStructuredSnapshot

  return mergeReplayStructuredSnapshot({
    primary: {
      derivedMindStateBundle,
    } as AlicizationReplayTurn['structured'],
    fallback: traceStructuredSnapshot,
  })
}

function isRuntimeSamplingPlainObject(raw: unknown): raw is Record<string, unknown> {
  return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw))
}

function mergeRuntimeSamplingPlainObjectFields<T>(
  primary: T | null | undefined,
  fallback: T | null | undefined,
): T | null | undefined {
  const primaryObject = isRuntimeSamplingPlainObject(primary) ? primary : null
  const fallbackObject = isRuntimeSamplingPlainObject(fallback) ? fallback : null
  if (!primaryObject)
    return fallback ?? primary
  if (!fallbackObject)
    return primary

  const merged: Record<string, unknown> = { ...fallbackObject }
  for (const [key, value] of Object.entries(primaryObject)) {
    const fallbackValue = fallbackObject[key]
    if (value == null && key in fallbackObject)
      continue
    merged[key] = isRuntimeSamplingPlainObject(value) && isRuntimeSamplingPlainObject(fallbackValue)
      ? mergeRuntimeSamplingPlainObjectFields(value, fallbackValue)
      : value
  }
  return merged as T
}

function mergeRuntimeSamplingOrganicMemoryContext(input: {
  primary?: AlicizationReplayTurn['organicMemoryContext'] | null
  fallback?: AlicizationReplayTurn['organicMemoryContext'] | null
}): AlicizationReplayTurn['organicMemoryContext'] | null {
  const primary = input.primary ?? null
  const fallback = input.fallback ?? null
  if (!primary)
    return fallback
  if (!fallback)
    return primary

  return {
    ...fallback,
    ...primary,
    projectStateContinuity: primary.projectStateContinuity ?? fallback.projectStateContinuity,
    activeContinuityGovernance: primary.activeContinuityGovernance ?? fallback.activeContinuityGovernance,
    projectStatePreDialogueAwarenessLine: primary.projectStatePreDialogueAwarenessLine ?? fallback.projectStatePreDialogueAwarenessLine,
    projectStatePreflightSummary: primary.projectStatePreflightSummary ?? fallback.projectStatePreflightSummary,
    recentMemoryReflections: primary.recentMemoryReflections ?? fallback.recentMemoryReflections,
    recentRelationshipOutcomes: primary.recentRelationshipOutcomes ?? fallback.recentRelationshipOutcomes,
    recalledEpisodes: primary.recalledEpisodes ?? fallback.recalledEpisodes,
    recalledConversationHistory: primary.recalledConversationHistory ?? fallback.recalledConversationHistory,
    recollectedWindows: primary.recollectedWindows ?? fallback.recollectedWindows,
    consolidatedMemories: primary.consolidatedMemories ?? fallback.consolidatedMemories,
    recollectionNarratives: primary.recollectionNarratives ?? fallback.recollectionNarratives,
    recollectionPlan: primary.recollectionPlan ?? fallback.recollectionPlan,
    recollectionSpeechPlan: primary.recollectionSpeechPlan ?? fallback.recollectionSpeechPlan,
    memoryDeliberation: primary.memoryDeliberation ?? fallback.memoryDeliberation,
    proceduralMemories: primary.proceduralMemories ?? fallback.proceduralMemories,
    knowledgeEvidence: primary.knowledgeEvidence ?? fallback.knowledgeEvidence,
    claimEvidenceGraphs: primary.claimEvidenceGraphs ?? fallback.claimEvidenceGraphs,
    recollectionIntent: primary.recollectionIntent ?? fallback.recollectionIntent,
    hostPersonModel: primary.hostPersonModel ?? fallback.hostPersonModel,
    personStateProjection: primary.personStateProjection ?? fallback.personStateProjection,
    autobiographicalSelf: primary.autobiographicalSelf ?? fallback.autobiographicalSelf,
    longHorizonMemory: primary.longHorizonMemory ?? fallback.longHorizonMemory,
    relationshipDynamics: primary.relationshipDynamics ?? fallback.relationshipDynamics,
    affectiveResidue: primary.affectiveResidue ?? fallback.affectiveResidue,
    recallLatencyPolicy: primary.recallLatencyPolicy ?? fallback.recallLatencyPolicy,
    memoryTuningAdvice: primary.memoryTuningAdvice ?? fallback.memoryTuningAdvice,
    selfEvolution: primary.selfEvolution ?? fallback.selfEvolution,
    learningExecutionState: primary.learningExecutionState ?? fallback.learningExecutionState,
    derivedMindStateBundle: mergeRuntimeSamplingPlainObjectFields(
      primary.derivedMindStateBundle,
      fallback.derivedMindStateBundle,
    ) ?? primary.derivedMindStateBundle ?? fallback.derivedMindStateBundle,
    memoryStageReplay: primary.memoryStageReplay ?? fallback.memoryStageReplay,
    memoryResolutionLedger: primary.memoryResolutionLedger ?? fallback.memoryResolutionLedger,
    memorySituationCandidates: primary.memorySituationCandidates ?? fallback.memorySituationCandidates,
    executionCallbackCarry: primary.executionCallbackCarry ?? fallback.executionCallbackCarry,
  }
}

function scoreRuntimeSamplingEmbodimentAuthority(
  authority: AlicizationMemoryDecisionTraceRecord['embodimentAuthority'] | null | undefined,
) {
  if (!authority)
    return 0

  const digitalLife = isRuntimeSamplingPlainObject(authority.digitalLife)
    ? authority.digitalLife
    : null
  const voice = isRuntimeSamplingPlainObject(digitalLife?.voice) ? digitalLife.voice : null
  const face = isRuntimeSamplingPlainObject(digitalLife?.face) ? digitalLife.face : null
  const motion = isRuntimeSamplingPlainObject(digitalLife?.motion) ? digitalLife.motion : null
  const lipSync = isRuntimeSamplingPlainObject(digitalLife?.lipSync) ? digitalLife.lipSync : null
  const bodyContinuity = isRuntimeSamplingPlainObject(digitalLife?.bodyContinuity) ? digitalLife.bodyContinuity : null
  const action = isRuntimeSamplingPlainObject(digitalLife?.action) ? digitalLife.action : null
  const performance = isRuntimeSamplingPlainObject(authority.performance) ? authority.performance : null
  const embodimentScript = isRuntimeSamplingPlainObject(authority.embodimentScript) ? authority.embodimentScript : null
  const embodimentScriptState = isRuntimeSamplingPlainObject(embodimentScript?.state) ? embodimentScript.state : null
  const speechPlan = isRuntimeSamplingPlainObject(embodimentScript?.speechPlan) ? embodimentScript.speechPlan : null
  const visibleReply = isRuntimeSamplingPlainObject(authority.visibleReply) ? authority.visibleReply : null

  let score = 1
  if (readReplayAuthorityString(authority.emotion, 64))
    score += 1
  if (performance)
    score += 2
  if (readReplayAuthorityString(performance?.facialCue, 80))
    score += 1
  if (readReplayAuthorityString(performance?.actionCue, 80))
    score += 1
  if (digitalLife)
    score += 2
  if (readReplayAuthorityString(digitalLife?.preferredPresence, 80))
    score += 1
  if (readReplayAuthorityString(voice?.residentMode, 80))
    score += 5
  if (readReplayAuthorityString(face?.residentMode, 80))
    score += 5
  if (readReplayAuthorityString(face?.facialCue, 80))
    score += 1
  if (readReplayAuthorityString(motion?.residentMode, 80))
    score += 5
  if (readReplayAuthorityString(lipSync?.residentMode, 80))
    score += 5
  if (readReplayAuthorityString(bodyContinuity?.bodyLine, 220))
    score += 6
  if (readReplayAuthorityString(action?.actionCue, 80))
    score += 1
  if (readReplayAuthorityString(action?.actionMode, 80))
    score += 1
  if (embodimentScript)
    score += 2
  if (readReplayAuthorityString(embodimentScriptState?.residentMode, 80))
    score += 5
  if (readReplayAuthorityString(embodimentScript?.rendererTarget, 80))
    score += 1
  if (typeof speechPlan?.segmentCount === 'number')
    score += 1
  if (readReplayAuthorityString(speechPlan?.interruptPolicy, 80))
    score += 1
  if (visibleReply)
    score += 1
  if (visibleReply?.providerMindExecuted === true)
    score += 1

  return score
}

function selectRuntimeSamplingEmbodimentAuthority(
  current: AlicizationMemoryDecisionTraceRecord['embodimentAuthority'] | null | undefined,
  candidate: AlicizationMemoryDecisionTraceRecord['embodimentAuthority'] | null | undefined,
) {
  if (!candidate)
    return current ?? null
  if (!current)
    return candidate
  return scoreRuntimeSamplingEmbodimentAuthority(candidate) > scoreRuntimeSamplingEmbodimentAuthority(current)
    ? candidate
    : current
}

function buildRuntimeSamplingTraceEvidence(input: {
  row: ReplayConversationTurnRow
  traceRecords: AlicizationMemoryDecisionTraceRecord[]
}) {
  let structured: AlicizationReplayTurn['structured'] | null = null
  let organicMemoryContext: AlicizationReplayTurn['organicMemoryContext'] | null = null
  const sampledCategories = new Set<NonNullable<AlicizationReplayTurn['sampledCategories']>[number]>()
  let embodimentAuthority: AlicizationMemoryDecisionTraceRecord['embodimentAuthority'] | null = null

  for (const trace of input.traceRecords) {
    structured = mergeReplayStructuredSnapshot({
      primary: structured,
      fallback: readRuntimeSamplingTraceStructuredSnapshot(trace),
    })
    organicMemoryContext = mergeRuntimeSamplingOrganicMemoryContext({
      primary: organicMemoryContext,
      fallback: buildOrganicMemoryPromptContextFromTrace({
        row: input.row,
        trace,
      }),
    }) ?? organicMemoryContext
    organicMemoryContext = attachReplayBenchmarkTraceEvidenceToOrganicMemoryContext({
      organicMemoryContext,
      traceEvidenceText: runtimeSamplingFallbackTraceCategoryText(trace),
    })
    for (const category of inferFallbackRuntimeSampleCategories(trace))
      sampledCategories.add(category)
    embodimentAuthority = selectRuntimeSamplingEmbodimentAuthority(
      embodimentAuthority,
      trace.embodimentAuthority,
    )
  }

  return {
    structured,
    organicMemoryContext,
    sampledCategories: [...sampledCategories],
    embodimentAuthority,
  }
}

function scoreRuntimeSamplingTraceProvenance(trace: AlicizationMemoryDecisionTraceRecord) {
  let score = 0
  if (trace.governance?.digitalLifeSpine?.memory?.memoryClosureTrace)
    score += 80
  if (extractReplayMemoryClosureExecution(trace))
    score += 70
  if (trace.memoryResolutionLedger)
    score += 35
  if (isRuntimeSamplingPlainObject(trace.derivedMindStateBundle))
    score += 30
  if (trace.embodimentAuthority)
    score += 25
  if (trace.memoryDeliberationJudged)
    score += 12
  if (trace.recallAttribution)
    score += 10
  if (trace.origin === 'subconscious-proactive')
    score += 6
  if (trace.eventKinds.some(kind => kind.includes('memory') || kind.includes('dialogue')))
    score += 4
  return score
}

function selectRuntimeSamplingProvenanceTrace(
  traceRecords: AlicizationMemoryDecisionTraceRecord[],
) {
  let selected = traceRecords[0] ?? null
  let selectedScore = selected ? scoreRuntimeSamplingTraceProvenance(selected) : -1
  for (const trace of traceRecords.slice(1)) {
    const score = scoreRuntimeSamplingTraceProvenance(trace)
    if (score <= selectedScore)
      continue
    selected = trace
    selectedScore = score
  }
  return selected
}

function buildRuntimeSamplingTracePointer(input: {
  row: ReplayConversationTurnRow
  traceRecord: AlicizationMemoryDecisionTraceRecord
}) {
  return {
    kind: 'decision-trace' as const,
    packId: 'sampled-humanlike-memory-v1' as const,
    turnId: input.row.turnId ?? input.traceRecord.turnId ?? '',
    decisionTraceId: input.traceRecord.decisionTraceId,
    sessionId: input.traceRecord.sessionId,
    activeThreadId: input.traceRecord.activeThreadId,
  }
}

function attachRuntimeSamplingContinuityDigestToReplayTurn(input: {
  turn: AlicizationReplayTurn
  contextTurn: AlicizationReplayTurn
  continuityDigest: string
}): AlicizationReplayTurn {
  const projectStatePreflightSummary = appendReplayBenchmarkEvidenceText(
    input.turn.organicMemoryContext?.projectStatePreflightSummary
    ?? input.contextTurn.organicMemoryContext?.projectStatePreflightSummary,
    input.continuityDigest,
    1_200,
  )
  const organicMemoryContext = input.turn.organicMemoryContext
    ?? buildReplayBenchmarkMinimalOrganicMemoryContext({
      projectStatePreflightSummary,
    })
    ?? null
  const mergedOrganicMemoryContext = mergeRuntimeSamplingOrganicMemoryContext({
    primary: organicMemoryContext,
    fallback: input.contextTurn.organicMemoryContext,
  })
  return {
    ...input.turn,
    ...(mergedOrganicMemoryContext
      ? {
          organicMemoryContext: {
            ...mergedOrganicMemoryContext,
            ...(projectStatePreflightSummary ? { projectStatePreflightSummary } : {}),
          },
        }
      : {}),
  }
}

function attachTraceEvidenceToReplaySampledTurn(input: {
  turn: AlicizationReplayTurn
  traceRecords: AlicizationMemoryDecisionTraceRecord[]
}) {
  if (input.traceRecords.length === 0)
    return input.turn

  const traceEvidenceText = input.traceRecords
    .map(trace => runtimeSamplingFallbackTraceCategoryText(trace))
    .filter(text => text.trim().length > 0)
    .join(' ')
  if (!traceEvidenceText)
    return input.turn

  const organicMemoryContext = attachReplayBenchmarkTraceEvidenceToOrganicMemoryContext({
    organicMemoryContext: input.turn.organicMemoryContext,
    traceEvidenceText,
  }) ?? input.turn.organicMemoryContext

  const traceEvidenceTurn: AlicizationReplayTurn = {
    ...input.turn,
    ...(organicMemoryContext ? { organicMemoryContext } : {}),
  }
  const continuityDigest = buildReplayBenchmarkDatasetContinuityDigest(traceEvidenceTurn)
  return continuityDigest
    ? attachRuntimeSamplingContinuityDigestToReplayTurn({
        turn: input.turn,
        contextTurn: traceEvidenceTurn,
        continuityDigest,
      })
    : traceEvidenceTurn
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
    if (input.packId === 'default-humanlike-memory-v1') {
      return {
        turns: buildDefaultHumanlikeMemoryBenchmarkPack(),
        source: 'static-pack' as const,
        runtimeSamplingTurnCount: 0,
        verifiedDecisionTraceIds: new Set<string>(),
        traceRecords: [] as AlicizationMemoryDecisionTraceRecord[],
      }
    }
    if (input.packId === 'growth-humanlike-memory-v1') {
      return {
        turns: buildGrowthHumanlikeMemoryBenchmarkPack(),
        source: 'static-pack' as const,
        runtimeSamplingTurnCount: 0,
        verifiedDecisionTraceIds: new Set<string>(),
        traceRecords: [] as AlicizationMemoryDecisionTraceRecord[],
      }
    }
    if (input.packId === 'adversarial-humanlike-memory-v2') {
      return {
        turns: buildAdversarialHumanlikeMemoryBenchmarkPack(),
        source: 'static-pack' as const,
        runtimeSamplingTurnCount: 0,
        verifiedDecisionTraceIds: new Set<string>(),
        traceRecords: [] as AlicizationMemoryDecisionTraceRecord[],
      }
    }
    if (input.packId === 'final-humanlike-memory-v1') {
      return {
        turns: buildFinalHumanlikeMemoryBenchmarkPack(),
        source: 'static-pack' as const,
        runtimeSamplingTurnCount: 0,
        verifiedDecisionTraceIds: new Set<string>(),
        traceRecords: [] as AlicizationMemoryDecisionTraceRecord[],
      }
    }

    if (input.packId === 'backlog-humanlike-memory-v1') {
      return {
        turns: buildReplayBenchmarkBacklogPack({
          backlogEntries: parseReplayBenchmarkDatasetBacklog(
            await db.getMetaValue(replayBenchmarkDatasetBacklogKey),
          ),
          limit: input.sampleLimit,
        }),
        source: 'dataset-backlog' as const,
        runtimeSamplingTurnCount: 0,
        verifiedDecisionTraceIds: new Set<string>(),
        traceRecords: [] as AlicizationMemoryDecisionTraceRecord[],
      }
    }

    const runtimeSamplingBacklogEntries = parseReplayBenchmarkDatasetBacklog(
      await db.getMetaValue(replayBenchmarkRuntimeSamplingBacklogKey),
    )
    const runtimeSamplingPrimaryBacklogTurns = selectRuntimeSamplingPrimaryBacklogTurns({
      backlogEntries: runtimeSamplingBacklogEntries,
      sampleLimit: input.sampleLimit,
    })
    if (runtimeSamplingPrimaryBacklogTurns.length >= input.sampleLimit) {
      const turns = runtimeSamplingPrimaryBacklogTurns.slice(0, input.sampleLimit)
      const traces = await collectTraceRecordsForConversationRows({
        db,
        rows: turns.map(replayTurnToConversationRow),
      })
      return {
        turns,
        source: 'runtime-sampling-backlog' as const,
        runtimeSamplingTurnCount: runtimeSamplingPrimaryBacklogTurns.length,
        verifiedDecisionTraceIds: uniqueReplayDecisionTraceIdsFromRecords(traces),
        traceRecords: traces,
      }
    }
    const runtimeSamplingBacklogTurns = buildReplayBenchmarkBacklogPack({
      backlogEntries: runtimeSamplingBacklogEntries,
      limit: input.sampleLimit,
    })

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
    }).map(turn => attachTraceEvidenceToReplaySampledTurn({
      turn,
      traceRecords: traces.filter(trace => trace.turnId === turn.turnId),
    }))
    if (runtimeSamplingPrimaryBacklogTurns.length === 0) {
      return {
        turns: rawTurns,
        source: 'conversation-sample' as const,
        runtimeSamplingTurnCount: rawTurns.length,
        verifiedDecisionTraceIds: uniqueReplayDecisionTraceIdsFromRecords(traces),
        traceRecords: traces,
      }
    }

    const selected = [...runtimeSamplingPrimaryBacklogTurns]
    const selectedTurnIds = new Set(selected.map(item => item.turnId))
    const selectedSessionIds = new Set(
      selected
        .map(turn => turn.tracePointer?.sessionId?.trim() ?? '')
        .filter(Boolean),
    )
    const sameSessionRawTurns = rawTurns
      .filter((turn) => {
        const sessionId = turn.tracePointer?.sessionId?.trim() ?? ''
        return sessionId && selectedSessionIds.has(sessionId)
      })
      .sort((left, right) => {
        const leftCreatedAt = Number(left.createdAt ?? 0)
        const rightCreatedAt = Number(right.createdAt ?? 0)
        return leftCreatedAt - rightCreatedAt || left.turnId.localeCompare(right.turnId)
      })
    for (const turn of sameSessionRawTurns) {
      if (selectedTurnIds.has(turn.turnId))
        continue
      selected.push(turn)
      selectedTurnIds.add(turn.turnId)
      if (selected.length >= input.sampleLimit)
        break
    }
    for (const turn of rawTurns) {
      if (selected.length >= input.sampleLimit)
        break
      if (selectedTurnIds.has(turn.turnId))
        continue
      selected.push(turn)
      selectedTurnIds.add(turn.turnId)
    }
    return {
      turns: selected,
      source: 'mixed-runtime-and-conversation' as const,
      runtimeSamplingTurnCount: runtimeSamplingBacklogTurns.length,
      verifiedDecisionTraceIds: uniqueReplayDecisionTraceIdsFromRecords(traces),
      traceRecords: traces,
    }
  }

  async function ingestRuntimeSamplingConversationTurn(input: {
    row: ReplayConversationTurnRow
    traceRecords: AlicizationMemoryDecisionTraceRecord[]
    visibleReplyRealization?: AlicizationReplayTurn['visibleReplyRealization']
  }) {
    const db = options.getAlicizationDb()
    const turns = buildSampledHumanlikeMemoryBenchmarkPack({
      conversationTurns: [input.row],
      memoryDecisionTraces: input.traceRecords,
      limit: 1,
    })

    const traceRecord = selectRuntimeSamplingProvenanceTrace(input.traceRecords)
    const fallbackExpectedMemory = buildReplayBenchmarkExpectedMemory({
      assistantText: input.row.assistantText,
      structuredJson: input.row.structuredJson,
      visibleText: input.visibleReplyRealization?.visibleText ?? null,
    })
    const structuredSnapshot = readReplaySampleStructuredSnapshot(input.row.structuredJson ?? null)
    const traceStructuredSnapshot = readRuntimeSamplingTraceStructuredSnapshot(traceRecord)
    const traceEvidence = buildRuntimeSamplingTraceEvidence({
      row: input.row,
      traceRecords: input.traceRecords,
    })
    const runtimeStructuredSnapshot = mergeReplayStructuredSnapshot({
      primary: structuredSnapshot,
      fallback: mergeReplayStructuredSnapshot({
        primary: traceStructuredSnapshot,
        fallback: traceEvidence.structured,
      }),
    })
    const runtimeTracePointer = traceRecord
      ? buildRuntimeSamplingTracePointer({
          row: input.row,
          traceRecord,
        })
      : null
    const fallbackTurn: AlicizationReplayTurn | null = traceRecord && runtimeTracePointer && input.row.turnId && input.row.userText
      ? {
          turnId: input.row.turnId,
          userText: input.row.userText,
          createdAt: input.row.createdAt,
          expectedMemory: fallbackExpectedMemory,
          structured: runtimeStructuredSnapshot,
          visibleReplyRealization: input.visibleReplyRealization ?? null,
          tracePointer: runtimeTracePointer,
          sampledCategories: traceEvidence.sampledCategories.length > 0
            ? traceEvidence.sampledCategories
            : inferFallbackRuntimeSampleCategories(traceRecord),
          gold: traceEvidence.embodimentAuthority
            ? {
                embodimentAuthority: traceEvidence.embodimentAuthority,
              }
            : undefined,
        }
      : null
    const selectedTurn: AlicizationReplayTurn | null = turns[0]
      ? {
          ...turns[0],
          structured: mergeReplayStructuredSnapshot({
            primary: turns[0].structured ?? structuredSnapshot,
            fallback: traceStructuredSnapshot,
          }),
          visibleReplyRealization: input.visibleReplyRealization ?? turns[0].visibleReplyRealization ?? null,
          tracePointer: runtimeTracePointer ?? turns[0].tracePointer,
          sampledCategories: [
            ...(turns[0].sampledCategories ?? []),
            ...traceEvidence.sampledCategories,
          ].filter((category, index, all) => all.indexOf(category) === index),
          gold: turns[0].gold ?? (
            traceEvidence.embodimentAuthority
              ? {
                  embodimentAuthority: traceEvidence.embodimentAuthority,
                }
              : undefined
          ),
        }
      : fallbackTurn
    if (!selectedTurn)
      return null

    const continuityDigestTurn: AlicizationReplayTurn = traceRecord
      ? {
          ...selectedTurn,
          structured: mergeReplayStructuredSnapshot({
            primary: selectedTurn.structured ?? structuredSnapshot,
            fallback: traceStructuredSnapshot,
          }),
          organicMemoryContext: mergeRuntimeSamplingOrganicMemoryContext({
            primary: selectedTurn.organicMemoryContext,
            fallback: traceEvidence.organicMemoryContext,
          }) ?? selectedTurn.organicMemoryContext,
        }
      : selectedTurn
    const anonymizedTurn = anonymizeReplayBenchmarkSample(selectedTurn)
    const anonymizedContinuityDigestTurn = continuityDigestTurn === selectedTurn
      ? anonymizedTurn
      : anonymizeReplayBenchmarkSample(continuityDigestTurn)
    const continuityDigest = buildReplayBenchmarkDatasetContinuityDigest(anonymizedContinuityDigestTurn)
    const anonymizedReplayTurn = continuityDigest
      ? attachRuntimeSamplingContinuityDigestToReplayTurn({
          turn: anonymizedTurn,
          contextTurn: anonymizedContinuityDigestTurn,
          continuityDigest,
        })
      : anonymizedTurn
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
      continuityDigest,
      replayTurn: anonymizedReplayTurn,
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
  }): Promise<AlicizationReplayBenchmarkRuntimeResult> {
    const db = options.getAlicizationDb()
    const now = getNow()
    const packId = normalizeReplayBenchmarkPackId(input.packId)
    const persistTelemetry = input.persistTelemetry !== false
    const sampleLimit = Math.max(1, Math.min(24, Math.floor(input.sampleLimit ?? 12)))
    const resolvedTurns = await resolveBenchmarkTurns({
      packId,
      sampleLimit,
    })
    const turns = resolvedTurns.turns

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
      projectStateSummary: null,
      preDialogueBriefingSummary: null,
      emotionalClosureSummary: null,
      selfAuthoritySummary: null,
      projectStateAuditSummary: null,
      longRunSameHerSessionSummary: null,
      memoryClosureLongRun: null,
      runtimeSamplingEvidence: null,
      authoritySummary: null,
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
    datasetFeedback.projectStateSummary = buildReplayProjectStateSummary({
      turns,
    })
    if (
      datasetFeedback.projectStateSummary
      && datasetFeedback.projectStateSummary.comparedTurnCount > 0
      && datasetFeedback.projectStateSummary.continuityHitCount < datasetFeedback.projectStateSummary.comparedTurnCount
    ) {
      datasetFeedback.driftSignals?.push('projectStateContinuityDrift')
    }
    datasetFeedback.preDialogueBriefingSummary = buildReplayPreDialogueBriefingSummary({
      turns,
    })
    if (
      datasetFeedback.preDialogueBriefingSummary
      && datasetFeedback.preDialogueBriefingSummary.comparedTurnCount > 0
      && datasetFeedback.preDialogueBriefingSummary.fullyBriefedTurnCount < datasetFeedback.preDialogueBriefingSummary.comparedTurnCount
    ) {
      datasetFeedback.driftSignals?.push('preDialogueBriefingDrift')
    }
    datasetFeedback.emotionalClosureSummary = buildReplayEmotionalClosureSummary({
      turns,
    })
    if (hasReplayEmotionalClosureDrift(datasetFeedback.emotionalClosureSummary)) {
      datasetFeedback.driftSignals?.push('emotionalClosureDrift')
    }
    datasetFeedback.selfAuthoritySummary = buildReplaySelfAuthoritySummary({
      turns,
    })
    if (
      datasetFeedback.selfAuthoritySummary
      && datasetFeedback.selfAuthoritySummary.comparedTurnCount > 0
      && (
        datasetFeedback.selfAuthoritySummary.contentCompleteTurnCount < datasetFeedback.selfAuthoritySummary.comparedTurnCount
        || datasetFeedback.selfAuthoritySummary.validationStatus.blockedTurnCount > 0
      )
    ) {
      datasetFeedback.driftSignals?.push('selfAuthorityDrift')
    }
    datasetFeedback.projectStateAuditSummary = buildReplayProjectStateAuditSummary({
      turns,
      preparedTurns: replay.turns,
    })
    if (
      datasetFeedback.projectStateAuditSummary
      && datasetFeedback.projectStateAuditSummary.comparedTurnCount > 0
      && (
        datasetFeedback.projectStateAuditSummary.contentCompleteTurnCount < datasetFeedback.projectStateAuditSummary.comparedTurnCount
        || datasetFeedback.projectStateAuditSummary.validationStatus.blockedTurnCount > 0
        || datasetFeedback.projectStateAuditSummary.evidenceStatus.missingTurnCount > 0
      )
    ) {
      datasetFeedback.driftSignals?.push('projectStateAuditDrift')
    }
    if (
      datasetFeedback.projectStateAuditSummary
      && datasetFeedback.projectStateAuditSummary.sameHerSummaryTurnCount > 0
      && datasetFeedback.projectStateAuditSummary.sameHerSelfLineTurnCount < datasetFeedback.projectStateAuditSummary.sameHerSummaryTurnCount
    ) {
      datasetFeedback.driftSignals?.push('projectStateSameHerSelfLineDrift')
    }
    datasetFeedback.authoritySummary = buildReplayAuthoritySummary({
      sampledTurns: turns,
      replayTurns: replay.turns,
    })
    const longRunSameHerSessionResult = buildReplayLongRunSameHerSessionSummaryFromReplay({
      source: resolvedTurns.source,
      turns: replay.turns,
      sampledTurns: turns,
      quality: replay.quality,
    })
    datasetFeedback.longRunSameHerSessionSummary = longRunSameHerSessionResult.summary
    datasetFeedback.memoryClosureLongRun = replay.memoryClosureLongRun
    const sampledTurnById = new Map(turns.map(turn => [turn.turnId, turn]))
    const failingTurnSet = buildReplayBenchmarkFailingTurnSet({
      packId,
      turns,
      preparedTurns: replay.turns,
      quality: replay.quality,
      gate: replay.gate,
    }).map((failingTurn) => {
      const selfAuthoritySummary = buildReplayFailureTurnSelfAuthoritySummary(
        sampledTurnById.get(failingTurn.turnId),
      )
      return selfAuthoritySummary
        ? {
            ...failingTurn,
            selfAuthoritySummary,
          }
        : failingTurn
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

    const provenanceMismatchTurnIds = new Set<string>()
    const benchmarkTraceRecords = (
      await Promise.all(
        turns.map(async (turn) => {
          const decisionTraceId = turn.tracePointer?.decisionTraceId
          if (!decisionTraceId)
            return []
          const events = await db.listMindTurnEvents({
            decisionTraceId,
            limit: 32,
          })
          const boundEvents = events.filter(event =>
            isRuntimeSamplingMindTurnEventBoundToPointer(event, turn.tracePointer),
          )
          if (boundEvents.length !== events.length)
            provenanceMismatchTurnIds.add(turn.turnId)
          const records = buildAlicizationMemoryDecisionTraceRecords(boundEvents)
          const matchingRecords = records.filter(item => item.decisionTraceId === decisionTraceId)
          return matchingRecords.length > 0 ? matchingRecords : records
        }),
      )
    ).flat()
    const verifiedDecisionTraceIds = new Set([
      ...resolvedTurns.verifiedDecisionTraceIds,
      ...uniqueReplayDecisionTraceIdsFromRecords(benchmarkTraceRecords),
    ])
    const runtimeSamplingTraceRecords = [
      ...resolvedTurns.traceRecords,
      ...benchmarkTraceRecords,
    ]
    datasetFeedback.runtimeSamplingEvidence = buildRuntimeSamplingEvidence({
      source: resolvedTurns.source,
      runtimeSamplingTurnCount: resolvedTurns.runtimeSamplingTurnCount,
      longRunSameHerSessionSummary: datasetFeedback.longRunSameHerSessionSummary,
      longRunSameHerSessionRows: longRunSameHerSessionResult.sessionRows,
      verifiedDecisionTraceIds,
      provenanceMismatchTurnIds,
      traceRecords: runtimeSamplingTraceRecords,
    })
    datasetFeedback.memoryClosureLongRun = requireRuntimeMemoryClosureLongRunProvenance({
      memoryClosureLongRun: datasetFeedback.memoryClosureLongRun,
      runtimeSamplingEvidence: datasetFeedback.runtimeSamplingEvidence,
    })

    const replayTelemetryPatch = buildReplayBenchmarkMemoryStatsPatch({
      gate: replay.gate,
      quality: replay.quality,
      traces: benchmarkTraceRecords,
      goldMetrics: replay.goldMetrics,
    })
    const presenceQuality = deriveReplayPresenceQuality({
      turns: replay.turns,
      sampledTurns: turns,
      quality: replay.quality,
    })
    const currentStats = await db.getMemoryStats()
    const telemetryPatch = preferRuntimeGrowthMetrics({
      replayPatch: replayTelemetryPatch,
      currentStats,
    })
    Object.assign(telemetryPatch.retrievalHealth as Record<string, unknown>, presenceQuality)
    telemetryPatch.retrievalHealth.runtimeLongRunSameHerSessionClosureRate = datasetFeedback.runtimeSamplingEvidence?.status === 'closed'
      ? 1
      : 0
    telemetryPatch.retrievalHealth.runtimeMemoryClosureLongRunClosureRate = datasetFeedback.memoryClosureLongRun?.status === 'closed'
      && datasetFeedback.runtimeSamplingEvidence?.status === 'closed'
      ? 1
      : 0
    const authorityLeakCount = countReplayAuthorityLeaks({
      turns: replay.turns,
    })
    const localHumanlikeVisibleFallbackCount = countReplayLocalHumanlikeVisibleFallbacks({
      turns: replay.turns,
    })
    const finalReplayGate = buildAlicizationFinalReplayGateReport({
      retrievalHealth: {
        ...telemetryPatch.retrievalHealth,
        turnOsTraceCoverage: deriveReplayTurnOsTraceCoverage({
          turns: replay.turns,
        }),
        learningOutcomeToSelfRevisionRoundtrip: deriveReplayLearningSelfRevisionRoundtrip({
          traces: benchmarkTraceRecords,
          turns: replay.turns,
        }),
      },
      authorityLeakCount,
      localHumanlikeVisibleFallbackCount,
      sampleCount: telemetryPatch.retrievalHealth.sampleCount ?? replay.turns.length,
      productionGoldSampleCount: telemetryPatch.retrievalHealth.productionGoldSampleCount,
      productionGoldCoverage: telemetryPatch.retrievalHealth.productionGoldCoverage,
    })

    if (persistTelemetry) {
      await db.overrideMemoryStats({
        ...currentStats,
        retrievalHealth: {
          ...currentStats?.retrievalHealth,
          ...telemetryPatch.retrievalHealth,
        },
        presenceQuality,
      })
    }

    const result = {
      packId,
      ranAt: now,
      turnCount: turns.length,
      turns: replay.turns,
      quality: replay.quality,
      standards: replay.standards,
      gate: replay.gate,
      telemetryPatch,
      telemetryPersisted: persistTelemetry,
      failingTurnSet,
      finalReplayGate,
      shipGate: buildReplayBenchmarkShipGate({
        report: {
          gate: replay.gate,
          telemetryPatch,
          datasetFeedback,
        },
        finalReplayGate,
      }),
      regressionTriage: buildReplayBenchmarkRegressionTriage({
        failingKeys: replay.gate.failingKeys,
      }),
      datasetFeedback,
    } satisfies AlicizationReplayBenchmarkRuntimeResult

    if (options.selfEvolutionRuntime) {
      await options.selfEvolutionRuntime.validateAllShadowVersions({
        replayPassed: result.gate.passed,
        finalReplayGatePassed: result.finalReplayGate.passed,
        productionGoldSampleCount: result.finalReplayGate.metrics.productionGoldSampleCount,
        productionGoldCoverage: result.finalReplayGate.metrics.productionGoldCoverage,
        projectStateContinuityDrift: result.datasetFeedback.driftSignals?.includes('projectStateContinuityDrift') === true,
        projectStateSummary: result.datasetFeedback.projectStateSummary ?? null,
      }).catch(() => {})
    }

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
          finalReplayGate: result.finalReplayGate,
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
    const finalPackResult = await runReplayBenchmark({
      packId: 'final-humanlike-memory-v1',
      sampleLimit: input?.sampleLimit,
      persistTelemetry: input?.persistTelemetry,
      auditContext: {
        category: 'alicization.memory-benchmark',
        action: 'replay-benchmark-nightly-final-pack-ran',
        cardId: input?.cardId,
      },
    })
    const results: AlicizationRunReplayBenchmarkResult[] = [sampledResult, growthResult, finalPackResult]
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
        finalReplayGate: result.finalReplayGate,
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
          finalReplayGateFailingKeys: result.finalReplayGate.failingKeys,
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
