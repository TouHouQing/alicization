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

type AlicizationRuntimeSamplingEvidence = NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>
type AlicizationRuntimeSamplingTraceEventCoverage = NonNullable<AlicizationRuntimeSamplingEvidence['traceEventCoverage']>
type AlicizationRuntimeSamplingRepairTargets = NonNullable<AlicizationRuntimeSamplingEvidence['repairTargets']>
type AlicizationRuntimeSamplingNextRunEvidenceChecklist = NonNullable<AlicizationRuntimeSamplingEvidence['nextRunEvidenceChecklist']>
type AlicizationReplayTracePointer = NonNullable<AlicizationReplayTurn['tracePointer']>
type AlicizationReplayRuntimeMemoryMetabolismProof = 'revision' | 'forgettingOrRestraint' | 'auditability'

interface AlicizationReplayRuntimeSampleTurn {
  turnId: string
  sessionId: string
  createdAt: number
  tracePointer: AlicizationReplayTracePointer | null
  memoryIdentityKeys: string[]
}

interface AlicizationReplayRuntimeSampleSession {
  sessionId: string
  turns: AlicizationReplayRuntimeSampleTurn[]
}

const replayRequiredCrossModalEmbodimentModalities = ['body', 'voice', 'face', 'motion', 'lipsync'] as const

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
    runtimeMemoryClosureLongRunClosureRate?: number
  }
  const rubricCount = input.report.datasetFeedback.humanRatingRubric?.dimensions.length ?? 0
  const paritySummary = input.report.datasetFeedback.paritySummary ?? null
  const authoritySummary = input.report.datasetFeedback.authoritySummary ?? null
  const quietCompanionshipCoverage = runtimeMetricNumber(telemetry.quietCompanionshipCoverage)
  const silentPresenceNuisanceRate = runtimeMetricNumber(telemetry.silentPresenceNuisanceRate)
  const continuityMindCarryRate = runtimeMetricNumber(telemetry.continuityMindCarryRate)
  const runtimeMemoryClosureLongRunClosureRate = runtimeMetricNumber(telemetry.runtimeMemoryClosureLongRunClosureRate)
  const presenceQaDiagnostics = [
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
        && (runtimeMemoryClosureLongRunClosureRate ?? 0) >= 0.7
        ? 'pass'
        : 'fail',
      detail: [
        `quietCompanionshipCoverage=${quietCompanionshipCoverage ?? 0}`,
        `silentPresenceNuisanceRate=${silentPresenceNuisanceRate ?? 0}`,
        `continuityMindCarryRate=${continuityMindCarryRate ?? 0}`,
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
  const continuityCarryHits = continuityCarryApplicable.filter(({ quality }) => {
    return quality.procedureCarryQuality === 'pass'
      || quality.replyMemoryCoherence === 'pass'
      || quality.afterglowFalseCarryRate === 'pass'
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
  }
}

function buildReplayRuntimeSampleSessions(input: {
  turns: Awaited<ReturnType<typeof benchmarkMainChatSessionReplay>>['turns']
  sampledTurns: AlicizationReplayTurn[]
}): AlicizationReplayRuntimeSampleSession[] {
  const sampledTurnById = new Map(input.sampledTurns.map(turn => [turn.turnId, turn]))
  const rows = input.turns.map((prepared, index) => {
    const sampledTurn = sampledTurnById.get(prepared.turnGraph.ids.turnId)
      ?? input.sampledTurns[index]
      ?? null
    if (!sampledTurn)
      return null
    const sessionId = sanitizeReplayBenchmarkSampleText(
      sampledTurn.tracePointer?.sessionId
      ?? prepared.turnGraph.ids.sessionId
      ?? '',
    )
    if (!sessionId)
      return null
    return {
      turnId: sampledTurn.turnId,
      sessionId,
      createdAt: Number(sampledTurn.createdAt ?? index),
      tracePointer: sampledTurn.tracePointer ?? null,
      memoryIdentityKeys: readReplayMemoryIdentityValues({ prepared, sampledTurn }),
    }
  }).filter((row): row is AlicizationReplayRuntimeSampleTurn => Boolean(row))

  const sessions = new Map<string, AlicizationReplayRuntimeSampleTurn[]>()
  for (const row of rows) {
    sessions.set(row.sessionId, [
      ...(sessions.get(row.sessionId) ?? []),
      row,
    ])
  }
  return [...sessions.entries()]
    .map(([sessionId, turns]) => ({
      sessionId,
      turns: turns.sort((left, right) =>
        left.createdAt - right.createdAt
        || left.turnId.localeCompare(right.turnId),
      ),
    }))
    .sort((left, right) => left.sessionId.localeCompare(right.sessionId))
}

function replayDecisionTraceIdFromPointer(
  tracePointer: AlicizationReplayTracePointer | null | undefined,
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
  tracePointer: AlicizationReplayTracePointer | null | undefined,
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
  turn: AlicizationReplayRuntimeSampleTurn,
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

function hasRuntimeSamplingTraceMemoryRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records.some(record =>
    Boolean(
      extractRuntimeSamplingMemoryClosureTrace(record)
      || record.recallAttribution
      || record.memoryDeliberationJudged
      || record.memoryResolutionLedger
      || extractReplayMemoryClosureExecution(record)
      || record.eventKinds.some(kind => kind.includes('memory') || kind.includes('recall')),
    ),
  )
}

function hasRuntimeSamplingTraceInitiativeOrExecutionRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records.some(record =>
    record.origin === 'subconscious-proactive'
    || Boolean(extractReplayMemoryClosureExecution(record))
    || record.eventKinds.includes('learning-executed')
    || hasRuntimeSamplingTraceInitiativeRuntimeEventEvidence(record)
    || hasRuntimeSamplingTraceExecutionRuntimeEventEvidence(record),
  )
}

function hasRuntimeSamplingTraceEmotionRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return hasRuntimeSamplingTraceEmotionalStateEvidence(records)
}

function hasRuntimeSamplingTraceEmbodimentRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return hasRuntimeSamplingTraceEmbodimentContinuityLedgerStateEvidence(records)
}

function runtimeSamplingTraceDerivedMindStateBundle(record: AlicizationMemoryDecisionTraceRecord) {
  return isRuntimeSamplingPlainObject(record.derivedMindStateBundle)
    ? record.derivedMindStateBundle as Record<string, unknown>
    : null
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

function readRuntimeSamplingTraceDownstreamStateMemoryIdentityFromRecords(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const concreteIdentityKeys: string[] = []
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
  }
  const uniqueConcreteIdentityKeys = [...new Set(concreteIdentityKeys)]
  return {
    stable: uniqueConcreteIdentityKeys.length === 1,
    identityKeys: uniqueConcreteIdentityKeys,
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
  sessions: AlicizationReplayRuntimeSampleSession[]
  verifiedDecisionTraceIds: ReadonlySet<string>
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>
}) {
  const memoryIdentityTurnIds = new Set<string>()
  const missingMemoryIdentityTurnIds: string[] = []
  const transitionBreaks: string[] = []

  for (const session of input.sessions) {
    const sessionIdentityRows: Array<{ turnId: string, identityKeys: string[] }> = []
    for (const turn of session.turns) {
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
  turn: AlicizationReplayRuntimeSampleTurn,
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

  return continuityKey.length > 0
    && Object.keys(laneInfluence).length > 0
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
    return hasConcreteEmotionMovement
      && hasRuntimeSamplingStructuredMemoryClosureCausalityEvidence(emotionalTransitionLedger, 'emotion')
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

    return hasRuntimeSamplingTraceInitiativeRuntimeEventEvidence(record)
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

    const hasExecutionState = (
      typeof learningExecutionState.currentTaskId === 'string'
      || typeof learningExecutionState.nextLearningAction === 'string'
      || learningExecutionState.shouldRecord === true
      || learningExecutionState.shouldReflect === true
      || learningExecutionState.shouldVerify === true
      || learningExecutionState.shouldRevise === true
      || learningExecutionState.shouldInternalize === true
    )
    return hasRuntimeSamplingTraceExecutionRuntimeEventEvidence(record)
      && hasExecutionState
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
  return hasStructuredRuntimeSurfaces
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
    return hasRuntimeSamplingTraceEmbodimentAuthoritySurfaceEvidence(record)
      && hasStructuredLanes
      && hasRuntimeSamplingStructuredMemoryClosureCausalityEvidence(embodimentContinuityLedger, 'embodiment')
  })
}

function scoreRuntimeSamplingDownstreamStateEvidenceRecord(record: AlicizationMemoryDecisionTraceRecord) {
  const records = [record]
  let score = 0
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

function hasRuntimeSamplingTraceRoleEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  if (records.length === 0)
    return false

  return hasRuntimeSamplingTraceMemoryRoleEvidence(records)
    && hasRuntimeSamplingTraceInitiativeOrExecutionRoleEvidence(records)
    && hasRuntimeSamplingTraceEmotionRoleEvidence(records)
    && hasRuntimeSamplingTraceEmbodimentRoleEvidence(records)
}

function readRuntimeSamplingTraceMemoryMetabolismCoverage(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const revision = records.some(record =>
    Boolean(record.memoryReconsolidated)
    || record.eventKinds.includes('memory-reconsolidated'),
  )
  const forgettingOrRestraint = records.some((record) => {
    const ledger = record.memoryResolutionLedger
    return Boolean(
      record.memoryRecallWithheld
      || record.memoryWrongThreadSuppressed
      || record.memoryFollowUpDeferred
      || (Array.isArray(record.memoryDeliberationJudged?.withheldReasons)
        && record.memoryDeliberationJudged.withheldReasons.length > 0)
      || ledger?.shouldStayInward
      || ledger?.shouldDelayUntilAfterPayoff
      || ledger?.stableCoreOnly
      || ledger?.visibleCarryMode === 'withhold'
      || ledger?.rejectedCandidates.length
      || ledger?.suppressionTags.length,
    )
  })
  const auditability = records.some(record =>
    Boolean(
      record.decisionTraceId.trim()
      && (
        extractRuntimeSamplingMemoryClosureTrace(record)
        || record.recallAttribution
        || record.memoryResolutionLedger
        || record.memoryDeliberationJudged
      )
      && record.eventKinds.length > 0,
    ),
  )
  const missingProofs: AlicizationReplayRuntimeMemoryMetabolismProof[] = []
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

function readRuntimeSamplingTraceNextInfluenceLanes(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  const lanes = records.reduce<Record<RuntimeSamplingTraceMemoryHandoffLane, boolean>>((acc, record) => {
    const memoryClosureTrace = extractRuntimeSamplingMemoryClosureTrace(record)
    const nextInfluence = isRuntimeSamplingPlainObject(memoryClosureTrace?.nextInfluence)
      ? memoryClosureTrace.nextInfluence as Record<string, unknown>
      : null
    return {
      initiative: acc.initiative || isRuntimeSamplingPlainObject(nextInfluence?.initiative),
      execution: acc.execution || isRuntimeSamplingPlainObject(nextInfluence?.execution),
      emotion: acc.emotion || isRuntimeSamplingPlainObject(nextInfluence?.emotion),
      embodiment: acc.embodiment || isRuntimeSamplingPlainObject(nextInfluence?.embodiment),
    }
  }, {
    initiative: false,
    execution: false,
    emotion: false,
    embodiment: false,
  })
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
  const causalitySnapshot = (owner: Record<string, unknown> | null) => {
    const causality = isRuntimeSamplingPlainObject(owner?.memoryClosureCausality)
      ? owner.memoryClosureCausality as Record<string, unknown>
      : null
    return causality ?? null
  }
  return [
    causalitySnapshot(emotionalTransitionLedger),
    causalitySnapshot(initiativeSuppression),
    causalitySnapshot(learningExecutionState),
    causalitySnapshot(embodimentContinuityLedger),
  ].filter((item): item is Record<string, unknown> => Boolean(item))
}

function readRuntimeSamplingTraceDownstreamHandoffLanes(
  records: readonly AlicizationMemoryDecisionTraceRecord[],
) {
  const lanes = records
    .flatMap(record => runtimeSamplingTraceDownstreamCausalitySnapshots(record))
    .reduce((acc, causality) => {
      if (
        causality.causalSource !== 'memory-closure-trace'
        || causality.causedByMemoryClosure !== true
      ) {
        return acc
      }

      switch (causality.affectedLane) {
        case 'emotion':
          return { ...acc, emotion: true }
        case 'initiative':
          return { ...acc, initiative: true }
        case 'execution':
          return { ...acc, execution: true }
        case 'embodiment':
          return { ...acc, embodiment: true }
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

  const downstreamHandoff = readRuntimeSamplingTraceDownstreamHandoffLanes(toRecords)
  return {
    complete: downstreamHandoff.missingLanes.length === 0,
    missingLanes: downstreamHandoff.missingLanes,
  }
}

function buildRuntimeSamplingTraceMemoryHandoffCoverage(input: {
  sessions: AlicizationReplayRuntimeSampleSession[]
  verifiedDecisionTraceIds: ReadonlySet<string>
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>
}) {
  const handoffTransitions: string[] = []
  const missingHandoffTransitions: string[] = []
  const missingHandoffTransitionLanes: Record<string, RuntimeSamplingTraceMemoryHandoffLane[]> = {}

  for (const session of input.sessions) {
    for (let index = 0; index < session.turns.length - 1; index += 1) {
      const fromTurn = session.turns[index]
      const toTurn = session.turns[index + 1]
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

function hasRuntimeSamplingTraceRecallExplanationEvidence(records: readonly AlicizationMemoryDecisionTraceRecord[]) {
  return records.some((record) => {
    const trace = extractRuntimeSamplingMemoryClosureTrace(record)
    const hasWhySurface = Array.isArray(trace?.whySurface)
      && trace.whySurface.some(item => isRuntimeSamplingPlainObject(item))
    return Boolean(
      hasWhySurface
      || (typeof record.recallAttribution?.whyNow === 'string' && record.recallAttribution.whyNow.trim())
      || record.memoryResolutionLedger?.finalRationale
      || record.memoryResolutionLedger?.dominantClusterId,
    )
  })
}

function buildRuntimeSamplingTraceEventCoverage(input: {
  sessions: AlicizationReplayRuntimeSampleSession[]
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
    for (const turn of session.turns) {
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
        if (hasRuntimeSamplingTraceRoleEvidence(traceRecords)) {
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
  sessions: AlicizationReplayRuntimeSampleSession[]
  verifiedDecisionTraceIds?: ReadonlySet<string>
  provenanceMismatchTurnIds?: ReadonlySet<string>
  traceRecords?: AlicizationMemoryDecisionTraceRecord[]
}): NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']> {
  const runtimeRelated = input.source === 'runtime-sampling-backlog'
    || input.source === 'mixed-runtime-and-conversation'
    || input.source === 'conversation-sample'
    || input.runtimeSamplingTurnCount > 0
  const verifiedDecisionTraceIds = input.verifiedDecisionTraceIds ?? new Set<string>()
  const traceRecordsByDecisionTraceId = runtimeSamplingTraceRecordsByDecisionTraceId(input.traceRecords ?? [])
  const sampledSessionTurnCount = input.sessions.reduce(
    (sum, session) => sum + session.turns.length,
    0,
  )
  const sampledTurnCount = sampledSessionTurnCount > 0
    ? sampledSessionTurnCount
    : input.runtimeSamplingTurnCount
  const traceEventCoverage = buildRuntimeSamplingTraceEventCoverage({
    sessions: input.sessions,
    verifiedDecisionTraceIds,
    provenanceMismatchTurnIds: input.provenanceMismatchTurnIds,
    traceRecordsByDecisionTraceId,
  })
  const comparableSessions = runtimeRelated
    ? input.sessions.filter(session => session.turns.length >= 2)
    : []
  const closedSessionCount = comparableSessions.filter((session) => {
    const coverage = buildRuntimeSamplingTraceEventCoverage({
      sessions: [session],
      verifiedDecisionTraceIds,
      provenanceMismatchTurnIds: input.provenanceMismatchTurnIds,
      traceRecordsByDecisionTraceId,
    })
    return Boolean(
      coverage?.allRuntimeDecisionTracesVerified
      && coverage.allRuntimeDecisionTracesProvenanceBound
      && coverage.allRuntimeDecisionTracesRoleComplete
      && coverage.allRuntimeDecisionTracesDownstreamStateComplete
      && coverage.allRuntimeDecisionTracesMemoryIdentityContinuous
      && coverage.allRuntimeDecisionTracesMemoryIdentityMatchesReplay
      && coverage.allRuntimeDecisionTracesMemoryMetabolismComplete
      && coverage.allRuntimeDecisionTracesRecallExplanationComplete
      && coverage.allRuntimeDecisionTraceMemoryHandoffsComplete,
    )
  }).length
  const comparedSessionCount = comparableSessions.length
  const sessionClosureRate = comparedSessionCount > 0
    ? Number((closedSessionCount / comparedSessionCount).toFixed(2))
    : 0
  const fullyClosedSample = runtimeRelated
    && comparedSessionCount > 0
    && closedSessionCount === comparedSessionCount
  const repairTargets = buildRuntimeSamplingRepairTargets({
    sessions: input.sessions,
    traceRecordsByDecisionTraceId,
    traceEventCoverage,
    verifiedDecisionTraceIds,
    provenanceMismatchTurnIds: input.provenanceMismatchTurnIds,
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
    tracePointers: buildRuntimeSamplingTracePointers(input.sessions),
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
  sessions: AlicizationReplayRuntimeSampleSession[],
): NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>['tracePointers']> {
  const entries = new Map<string, AlicizationReplayTracePointer>()
  for (const session of sessions) {
    for (const turn of session.turns) {
      const turnId = turn.turnId.trim()
      if (turnId && turn.tracePointer && !entries.has(turnId))
        entries.set(turnId, turn.tracePointer)
    }
  }

  return [...entries.entries()].map(([sampleTurnId, tracePointer]) => ({
    sampleTurnId,
    tracePointer,
  }))
}

function buildRuntimeSamplingRepairTargets(input: {
  sessions: AlicizationReplayRuntimeSampleSession[]
  traceRecordsByDecisionTraceId?: ReadonlyMap<string, readonly AlicizationMemoryDecisionTraceRecord[]>
  traceEventCoverage?: AlicizationRuntimeSamplingTraceEventCoverage | null
  verifiedDecisionTraceIds?: ReadonlySet<string>
  provenanceMismatchTurnIds?: ReadonlySet<string>
}): NonNullable<NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['runtimeSamplingEvidence']>['repairTargets']> {
  if (input.sessions.length === 0)
    return []

  const laneOrder = ['memory', 'initiativeOrExecution', 'emotion', 'embodiment'] as const
  const laneRank = new Map(laneOrder.map((lane, index) => [lane, index]))
  const aggregates = new Map<typeof laneOrder[number], {
    missingTurnIds: Set<string>
    missingTransitionIds: Set<string>
    affectedSessionIds: Set<string>
    sampleTurnIds: string[]
    reasons: Set<string>
  }>()
  const readAggregate = (lane: typeof laneOrder[number]) => {
    const current = aggregates.get(lane) ?? {
      missingTurnIds: new Set<string>(),
      missingTransitionIds: new Set<string>(),
      affectedSessionIds: new Set<string>(),
      sampleTurnIds: [],
      reasons: new Set<string>(),
    }
    aggregates.set(lane, current)
    return current
  }
  const addGap = (input: {
    lane: typeof laneOrder[number]
    sessionId: string
    sampleId: string
    kind: 'turn' | 'transition'
    reasons: string[]
  }) => {
    const target = readAggregate(input.lane)
    target.affectedSessionIds.add(input.sessionId)
    if (input.kind === 'turn')
      target.missingTurnIds.add(input.sampleId)
    else
      target.missingTransitionIds.add(input.sampleId)
    if (input.sampleId && !target.sampleTurnIds.includes(input.sampleId))
      target.sampleTurnIds.push(input.sampleId)
    for (const reason of input.reasons) {
      const trimmed = reason.trim()
      if (trimmed)
        target.reasons.add(trimmed)
    }
  }
  const verifiedDecisionTraceIds = input.verifiedDecisionTraceIds ?? new Set<string>()
  for (const session of input.sessions) {
    for (const turn of session.turns) {
      const decisionTraceId = replayDecisionTraceIdFromPointer(turn.tracePointer)
      if (!decisionTraceId) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-decision-trace'],
        })
        continue
      }
      if (!verifiedDecisionTraceIds.has(decisionTraceId)) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['decision-trace-not-queryable'],
        })
        continue
      }

      const records = runtimeSamplingTraceRecordsBoundToTurn(turn, input.traceRecordsByDecisionTraceId)
      if (records.length === 0 || input.provenanceMismatchTurnIds?.has(turn.turnId)) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['trace-provenance-mismatch'],
        })
      }
      if (!hasRuntimeSamplingTraceMemoryRoleEvidence(records)) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-memory-recall-evidence'],
        })
      }
      if (!hasRuntimeSamplingTraceInitiativeOrExecutionRoleEvidence(records)) {
        addGap({
          lane: 'initiativeOrExecution',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-initiative-or-execution-event'],
        })
      }
      if (!hasRuntimeSamplingTraceEmotionRoleEvidence(records)) {
        addGap({
          lane: 'emotion',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-emotion-state-movement'],
        })
      }
      if (!hasRuntimeSamplingTraceEmbodimentRoleEvidence(records)) {
        addGap({
          lane: 'embodiment',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-embodiment-authority'],
        })
      }

      const downstream = readRuntimeSamplingTraceDownstreamStateLanes(records)
      const downstreamExecutionGaps = downstream.missingLanes
        .filter(lane => lane === 'initiative' || lane === 'execution')
        .map(lane => `missing-downstream-${lane}-state`)
      if (downstreamExecutionGaps.length > 0) {
        addGap({
          lane: 'initiativeOrExecution',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: downstreamExecutionGaps,
        })
      }
      if (downstream.missingLanes.includes('emotion')) {
        addGap({
          lane: 'emotion',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-downstream-emotion-state'],
        })
      }
      if (downstream.missingLanes.includes('embodiment')) {
        addGap({
          lane: 'embodiment',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-downstream-embodiment-state'],
        })
      }
      if (downstream.missingLanes.includes('memoryIdentity')) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-downstream-memory-identity'],
        })
      }

      const metabolism = readRuntimeSamplingTraceMemoryMetabolismCoverage(records)
      if (metabolism.missingProofs.length > 0) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: metabolism.missingProofs.map(proof => `missing-memory-metabolism:${proof}`),
        })
      }
      if (!hasRuntimeSamplingTraceRecallExplanationEvidence(records)) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['missing-recall-explanation'],
        })
      }
      const replayIdentityKeys = readRuntimeSamplingReplayVisibleMemoryIdentityKeys(turn)
      const traceIdentityKeys = readRuntimeSamplingTraceDownstreamStateMemoryIdentityMatchKeys(records)
      if (
        replayIdentityKeys.length === 0
        || !traceIdentityKeys.some(key => replayIdentityKeys.includes(key))
      ) {
        addGap({
          lane: 'memory',
          sessionId: session.sessionId,
          sampleId: turn.turnId,
          kind: 'turn',
          reasons: ['memory-identity-mismatch'],
        })
      }
    }

    for (let index = 0; index < session.turns.length - 1; index += 1) {
      const fromTurn = session.turns[index]
      const toTurn = session.turns[index + 1]
      if (!fromTurn || !toTurn)
        continue
      const transitionId = `${fromTurn.turnId}->${toTurn.turnId}`
      const fromRecords = runtimeSamplingTraceRecordsBoundToTurn(fromTurn, input.traceRecordsByDecisionTraceId)
      const toRecords = runtimeSamplingTraceRecordsBoundToTurn(toTurn, input.traceRecordsByDecisionTraceId)
      const handoff = readRuntimeSamplingTraceMemoryHandoffTransitionCoverage({ fromRecords, toRecords })
      if (handoff.complete)
        continue
      const missingLanes = handoff.missingLanes.length > 0
        ? handoff.missingLanes
        : ['emotion', 'initiative', 'execution', 'embodiment'] as const
      addGap({
        lane: 'memory',
        sessionId: session.sessionId,
        sampleId: transitionId,
        kind: 'transition',
        reasons: ['missing-next-turn-memory-handoff'],
      })
      if (missingLanes.includes('initiative') || missingLanes.includes('execution')) {
        addGap({
          lane: 'initiativeOrExecution',
          sessionId: session.sessionId,
          sampleId: transitionId,
          kind: 'transition',
          reasons: missingLanes
            .filter(lane => lane === 'initiative' || lane === 'execution')
            .map(lane => `missing-memory-handoff:${lane}`),
        })
      }
      if (missingLanes.includes('emotion')) {
        addGap({
          lane: 'emotion',
          sessionId: session.sessionId,
          sampleId: transitionId,
          kind: 'transition',
          reasons: ['missing-memory-handoff:emotion'],
        })
      }
      if (missingLanes.includes('embodiment')) {
        addGap({
          lane: 'embodiment',
          sessionId: session.sessionId,
          sampleId: transitionId,
          kind: 'transition',
          reasons: ['missing-memory-handoff:embodiment'],
        })
      }
    }
  }

  return [...aggregates.entries()]
    .map(([lane, aggregate]) => ({
      lane,
      missingTurnCount: aggregate.missingTurnIds.size,
      missingTransitionCount: aggregate.missingTransitionIds.size,
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
        .map(lane => `memory-handoff:${lane}`),
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
  const nextInfluence = extractRuntimeSamplingMemoryClosureTrace(traceRecord)?.nextInfluence
  if (
    hasRuntimeSamplingTraceMemoryRoleEvidence([traceRecord])
    && (
      hasRuntimeSamplingTraceExecutionRuntimeEventEvidence(traceRecord)
      || (
        isRuntimeSamplingPlainObject(nextInfluence)
        && isRuntimeSamplingPlainObject(nextInfluence.execution)
      )
    )
  ) {
    categories.add('procedure-carry')
    categories.add('long-horizon')
  }
  if (hasRuntimeSamplingTraceEmbodimentAuthoritySurfaceEvidence(traceRecord))
    categories.add('presence-quality')
  return [...categories]
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

function attachTraceEvidenceToReplaySampledTurn(input: {
  turn: AlicizationReplayTurn
  traceRecords: AlicizationMemoryDecisionTraceRecord[]
}) {
  if (input.traceRecords.length === 0)
    return input.turn

  const evidence = buildRuntimeSamplingTraceEvidence({
    row: replayTurnToConversationRow(input.turn),
    traceRecords: input.traceRecords,
  })
  const organicMemoryContext = mergeRuntimeSamplingOrganicMemoryContext({
    primary: input.turn.organicMemoryContext,
    fallback: evidence.organicMemoryContext,
  })
  return {
    ...input.turn,
    structured: mergeReplayStructuredSnapshot({
      primary: input.turn.structured,
      fallback: evidence.structured,
    }),
    ...(organicMemoryContext ? { organicMemoryContext } : {}),
    sampledCategories: [
      ...(input.turn.sampledCategories ?? []),
      ...evidence.sampledCategories,
    ].filter((category, index, all) => all.indexOf(category) === index),
    gold: input.turn.gold ?? (
      evidence.embodimentAuthority
        ? { embodimentAuthority: evidence.embodimentAuthority }
        : undefined
    ),
  }
}

export const __alicizationTestOnly = {
  hasRuntimeSamplingTraceDownstreamStateEvidence,
  readRuntimeSamplingTraceDownstreamStateLanes,
  selectRuntimeSamplingProvenanceTrace,
  buildRuntimeSamplingEvidence,
  buildRuntimeSamplingRepairTargets,
  buildReplayBenchmarkShipGate,
  selectRuntimeSamplingPrimaryBacklogTurns,
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

    const replayTurnWithTraceEvidence: AlicizationReplayTurn = traceRecord
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
    const anonymizedReplayTurn = anonymizeReplayBenchmarkSample(replayTurnWithTraceEvidence)
    const anonymizedTurn = anonymizedReplayTurn
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
    datasetFeedback.authoritySummary = buildReplayAuthoritySummary({
      sampledTurns: turns,
      replayTurns: replay.turns,
    })
    const runtimeSampleSessions = buildReplayRuntimeSampleSessions({
      turns: replay.turns,
      sampledTurns: turns,
    })
    datasetFeedback.memoryClosureLongRun = replay.memoryClosureLongRun
      ? {
          ...replay.memoryClosureLongRun,
          failureReasons: replay.memoryClosureLongRun.failureReasons.map(reason =>
            reason === 'inconsistent-memory-identity'
              ? 'missing-memory-identity-continuity' as const
              : reason,
          ),
        }
      : null
    const failingTurnSet = buildReplayBenchmarkFailingTurnSet({
      packId,
      turns,
      preparedTurns: replay.turns,
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
      sessions: runtimeSampleSessions,
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
