export interface AlicizationMemoryRetrievalTelemetrySnapshot {
  semanticLatencyMs: number | null
  semanticSampleCount: number
  graphLatencyMs: number | null
  graphSampleCount: number
  candidateGenerationLatencyMs: number | null
  candidateGenerationSampleCount: number
  plannerLatencyMs: number | null
  plannerSampleCount: number
  speechPlanLatencyMs: number | null
  speechPlanSampleCount: number
  cacheHitCount: number
  cacheMissCount: number
  prewarmHitCount: number
  prewarmMissCount: number
  budgetClassCounts: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
  budgetLatencyTelemetry: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', AlicizationBudgetLatencyTelemetry>>
  budgetLatencySamples: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number[]>>
  organicStageTelemetry: Partial<Record<'search-prelude' | 'candidate-generation' | 'candidate-ranking' | 'recollection-planning' | 'surface-planning' | 'self-evolution-integration' | 'prompt-blocks', {
    latencyMs: number | null
    sampleCount: number
    p50LatencyMs?: number | null
    p95LatencyMs?: number | null
  }>>
  organicStageBudgetCounts: Partial<Record<'search-prelude' | 'candidate-generation' | 'candidate-ranking' | 'recollection-planning' | 'surface-planning' | 'self-evolution-integration' | 'prompt-blocks', Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>>>
  hotKeyStats: Array<{
    key: string
    candidateCount: number
    hitCount: number
    winCount: number
    missCount: number
  }>
  recallHitRate: number
  recallMissRate: number
  recallAt1: number
  recallAt3: number
  precisionAt3: number
  wrongThreadRate: number
  wrongThreadSuppression: number
  suppressionHitRate: number
  wrongThreadPreventedCount: number
  falsePositiveSuppressionRate: number
  staleSelfModelVetoRate: number
  relationshipEraConfusionRate: number
  reconstructionErrorRate: number
  stableCoreOnlyRate: number
  memorySurfaceViolationRate: number
  templateLeakageFailCount: number
  claimAccuracy: number
  replyAuthorityAccuracy: number
  latencyBudgetPass: boolean | null
  mindParticipation: number
  memoryParticipation: number
  personalityParticipation: number
  relationshipParticipation: number
  continuityParticipation: number
  learningTaskCompletionCount: number
  learningTaskFailureCount: number
  learningTaskBlockedCount: number
  learningTaskReopenedCount: number
  learningTaskDowngradedCount: number
  learningTaskCancelledCount: number
  learningRelationshipReviseCount: number
  learningSelfModelReviseCount: number
  learningWorldModelValidationCount: number
  learningWorldModelFalseInternalizationCount: number
  learningTaskCompletionRate: number
  learningTaskFailureRate: number
  learningTaskReopenRecoveryRate: number
  misinternalizationRate: number
  relationshipCadenceRegressionRate: number
  selfModelStaleBeliefRate: number
  lastUpdatedAt: number | null
}

export interface AlicizationMemoryRetrievalHealthOverride {
  semanticLatencyMs: number | null
  graphLatencyMs: number | null
  candidateGenerationLatencyMs?: number | null
  plannerLatencyMs?: number | null
  speechPlanLatencyMs?: number | null
  cacheHitRatio?: number
  prewarmHitRatio?: number
  budgetClassCounts?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
  budgetLatencyTelemetry?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', AlicizationBudgetLatencyTelemetry>>
  organicStageTelemetry?: Partial<Record<'search-prelude' | 'candidate-generation' | 'candidate-ranking' | 'recollection-planning' | 'surface-planning' | 'self-evolution-integration' | 'prompt-blocks', {
    latencyMs: number | null
    sampleCount: number
    p50LatencyMs?: number | null
    p95LatencyMs?: number | null
  }>>
  organicStageBudgetCounts?: Partial<Record<'search-prelude' | 'candidate-generation' | 'candidate-ranking' | 'recollection-planning' | 'surface-planning' | 'self-evolution-integration' | 'prompt-blocks', Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>>>
  hotKeyStats?: Array<{
    key: string
    candidateCount: number
    hitCount: number
    winCount: number
    missCount: number
  }>
  recallHitRate?: number
  recallMissRate?: number
  recallAt1?: number
  recallAt3?: number
  precisionAt3?: number
  wrongThreadRate?: number
  wrongThreadSuppression?: number
  suppressionHitRate?: number
  wrongThreadPreventedCount?: number
  falsePositiveSuppressionRate?: number
  staleSelfModelVetoRate?: number
  relationshipEraConfusionRate?: number
  reconstructionErrorRate?: number
  stableCoreOnlyRate?: number
  memorySurfaceViolationRate?: number
  templateLeakageFailCount: number
  claimAccuracy?: number
  replyAuthorityAccuracy?: number
  latencyBudgetPass?: boolean | null
  mindParticipation?: number
  memoryParticipation?: number
  personalityParticipation?: number
  relationshipParticipation?: number
  continuityParticipation?: number
  learningTaskCompletionCount?: number
  learningTaskFailureCount?: number
  learningTaskBlockedCount?: number
  learningTaskReopenedCount?: number
  learningTaskDowngradedCount?: number
  learningTaskCancelledCount?: number
  learningRelationshipReviseCount?: number
  learningSelfModelReviseCount?: number
  learningWorldModelValidationCount?: number
  learningWorldModelFalseInternalizationCount?: number
  learningTaskCompletionRate?: number
  learningTaskFailureRate?: number
  learningTaskReopenRecoveryRate?: number
  misinternalizationRate?: number
  relationshipCadenceRegressionRate?: number
  selfModelStaleBeliefRate?: number
}

export type AlicizationMemoryRetrievalBudgetClass
  = 'realtime-reply'
    | 'deep-recall-reply'
    | 'proactive-generation'
    | 'nightly-benchmark'
    | 'diagnosis-replay'

export type AlicizationOrganicMemoryRuntimeStage
  = 'search-prelude'
    | 'candidate-generation'
    | 'candidate-ranking'
    | 'recollection-planning'
    | 'surface-planning'
    | 'self-evolution-integration'
    | 'prompt-blocks'

export interface AlicizationBudgetLatencyTelemetry {
  sampleCount: number
  p50LatencyMs: number | null
  p95LatencyMs: number | null
  maxLatencyMs: number | null
  gateStatus: 'unknown' | 'pass' | 'warn' | 'fail'
  targetP95Ms: number
}

interface CreateAlicizationMemoryRetrievalTelemetryRuntimeOptions {
  now: () => number
  key: string
  getMetaValue: (key: string) => Promise<string | undefined>
  upsertMeta: (key: string, value: string) => Promise<void>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}

interface AlicizationLearningExecutionTelemetryInput {
  status: 'completed' | 'failed' | 'blocked' | 'reopened' | 'downgraded' | 'cancelled'
  domain?: 'procedure' | 'relationship' | 'self-model' | 'world-model' | null
  internalizedAsValidatedOnly?: boolean
}

const memoryRetrievalBudgetClasses = [
  'realtime-reply',
  'deep-recall-reply',
  'proactive-generation',
  'nightly-benchmark',
  'diagnosis-replay',
] as const satisfies AlicizationMemoryRetrievalBudgetClass[]

const organicMemoryRuntimeStages = [
  'search-prelude',
  'candidate-generation',
  'candidate-ranking',
  'recollection-planning',
  'surface-planning',
  'self-evolution-integration',
  'prompt-blocks',
] as const satisfies AlicizationOrganicMemoryRuntimeStage[]

const budgetLatencyP95TargetsMs: Record<AlicizationMemoryRetrievalBudgetClass, number> = {
  'realtime-reply': 900,
  'deep-recall-reply': 2200,
  'proactive-generation': 750,
  'nightly-benchmark': 5000,
  'diagnosis-replay': 3600,
}

export function defaultAlicizationMemoryRetrievalTelemetry(): AlicizationMemoryRetrievalTelemetrySnapshot {
  return {
    semanticLatencyMs: null,
    semanticSampleCount: 0,
    graphLatencyMs: null,
    graphSampleCount: 0,
    candidateGenerationLatencyMs: null,
    candidateGenerationSampleCount: 0,
    plannerLatencyMs: null,
    plannerSampleCount: 0,
    speechPlanLatencyMs: null,
    speechPlanSampleCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0,
    prewarmHitCount: 0,
    prewarmMissCount: 0,
    budgetClassCounts: {},
    budgetLatencyTelemetry: {},
    budgetLatencySamples: {},
    organicStageTelemetry: {},
    organicStageBudgetCounts: {},
    hotKeyStats: [],
    recallHitRate: 0,
    recallMissRate: 0,
    recallAt1: 0,
    recallAt3: 0,
    precisionAt3: 0,
    wrongThreadRate: 0,
    wrongThreadSuppression: 0,
    suppressionHitRate: 0,
    wrongThreadPreventedCount: 0,
    falsePositiveSuppressionRate: 0,
    staleSelfModelVetoRate: 0,
    relationshipEraConfusionRate: 0,
    reconstructionErrorRate: 0,
    stableCoreOnlyRate: 0,
    memorySurfaceViolationRate: 0,
    templateLeakageFailCount: 0,
    claimAccuracy: 0,
    replyAuthorityAccuracy: 0,
    latencyBudgetPass: null,
    mindParticipation: 0,
    memoryParticipation: 0,
    personalityParticipation: 0,
    relationshipParticipation: 0,
    continuityParticipation: 0,
    learningTaskCompletionCount: 0,
    learningTaskFailureCount: 0,
    learningTaskBlockedCount: 0,
    learningTaskReopenedCount: 0,
    learningTaskDowngradedCount: 0,
    learningTaskCancelledCount: 0,
    learningRelationshipReviseCount: 0,
    learningSelfModelReviseCount: 0,
    learningWorldModelValidationCount: 0,
    learningWorldModelFalseInternalizationCount: 0,
    learningTaskCompletionRate: 0,
    learningTaskFailureRate: 0,
    learningTaskReopenRecoveryRate: 0,
    misinternalizationRate: 0,
    relationshipCadenceRegressionRate: 0,
    selfModelStaleBeliefRate: 0,
    lastUpdatedAt: null,
  }
}

export function normalizeAlicizationMemoryRetrievalTelemetry(raw: unknown): AlicizationMemoryRetrievalTelemetrySnapshot {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const semanticLatencyMs = Number(candidate.semanticLatencyMs)
  const semanticSampleCount = Number(candidate.semanticSampleCount)
  const graphLatencyMs = Number(candidate.graphLatencyMs)
  const graphSampleCount = Number(candidate.graphSampleCount)
  const candidateGenerationLatencyMs = Number(candidate.candidateGenerationLatencyMs)
  const candidateGenerationSampleCount = Number(candidate.candidateGenerationSampleCount)
  const plannerLatencyMs = Number(candidate.plannerLatencyMs)
  const plannerSampleCount = Number(candidate.plannerSampleCount)
  const speechPlanLatencyMs = Number(candidate.speechPlanLatencyMs)
  const speechPlanSampleCount = Number(candidate.speechPlanSampleCount)
  const cacheHitCount = Number(candidate.cacheHitCount)
  const cacheMissCount = Number(candidate.cacheMissCount)
  const prewarmHitCount = Number(candidate.prewarmHitCount)
  const prewarmMissCount = Number(candidate.prewarmMissCount)
  const budgetClassCounts = candidate.budgetClassCounts && typeof candidate.budgetClassCounts === 'object'
    ? candidate.budgetClassCounts as Record<string, unknown>
    : {}
  const budgetLatencySamples = candidate.budgetLatencySamples && typeof candidate.budgetLatencySamples === 'object'
    ? candidate.budgetLatencySamples as Record<string, unknown>
    : {}
  const budgetLatencyTelemetry = candidate.budgetLatencyTelemetry && typeof candidate.budgetLatencyTelemetry === 'object'
    ? candidate.budgetLatencyTelemetry as Record<string, unknown>
    : {}
  const organicStageTelemetry = candidate.organicStageTelemetry && typeof candidate.organicStageTelemetry === 'object'
    ? candidate.organicStageTelemetry as Record<string, unknown>
    : {}
  const organicStageBudgetCounts = candidate.organicStageBudgetCounts && typeof candidate.organicStageBudgetCounts === 'object'
    ? candidate.organicStageBudgetCounts as Record<string, unknown>
    : {}
  const hotKeyStats = Array.isArray(candidate.hotKeyStats)
    ? candidate.hotKeyStats
    : []
  const recallHitRate = Number(candidate.recallHitRate)
  const recallMissRate = Number(candidate.recallMissRate)
  const recallAt1 = Number(candidate.recallAt1)
  const recallAt3 = Number(candidate.recallAt3)
  const precisionAt3 = Number(candidate.precisionAt3)
  const wrongThreadRate = Number(candidate.wrongThreadRate)
  const wrongThreadSuppression = Number(candidate.wrongThreadSuppression)
  const suppressionHitRate = Number(candidate.suppressionHitRate)
  const wrongThreadPreventedCount = Number(candidate.wrongThreadPreventedCount)
  const falsePositiveSuppressionRate = Number(candidate.falsePositiveSuppressionRate)
  const staleSelfModelVetoRate = Number(candidate.staleSelfModelVetoRate)
  const relationshipEraConfusionRate = Number(candidate.relationshipEraConfusionRate)
  const reconstructionErrorRate = Number(candidate.reconstructionErrorRate)
  const stableCoreOnlyRate = Number(candidate.stableCoreOnlyRate)
  const memorySurfaceViolationRate = Number(candidate.memorySurfaceViolationRate)
  const templateLeakageFailCount = Number(candidate.templateLeakageFailCount)
  const claimAccuracy = Number(candidate.claimAccuracy)
  const replyAuthorityAccuracy = Number(candidate.replyAuthorityAccuracy)
  const latencyBudgetPass = typeof candidate.latencyBudgetPass === 'boolean'
    ? candidate.latencyBudgetPass
    : null
  const mindParticipation = Number(candidate.mindParticipation)
  const memoryParticipation = Number(candidate.memoryParticipation)
  const personalityParticipation = Number(candidate.personalityParticipation)
  const relationshipParticipation = Number(candidate.relationshipParticipation)
  const continuityParticipation = Number(candidate.continuityParticipation)
  const learningTaskCompletionCount = Number(candidate.learningTaskCompletionCount)
  const learningTaskFailureCount = Number(candidate.learningTaskFailureCount)
  const learningTaskBlockedCount = Number(candidate.learningTaskBlockedCount)
  const learningTaskReopenedCount = Number(candidate.learningTaskReopenedCount)
  const learningTaskDowngradedCount = Number(candidate.learningTaskDowngradedCount)
  const learningTaskCancelledCount = Number(candidate.learningTaskCancelledCount)
  const learningRelationshipReviseCount = Number(candidate.learningRelationshipReviseCount)
  const learningSelfModelReviseCount = Number(candidate.learningSelfModelReviseCount)
  const learningWorldModelValidationCount = Number(candidate.learningWorldModelValidationCount)
  const learningWorldModelFalseInternalizationCount = Number(candidate.learningWorldModelFalseInternalizationCount)
  const learningTaskCompletionRate = Number(candidate.learningTaskCompletionRate)
  const learningTaskFailureRate = Number(candidate.learningTaskFailureRate)
  const learningTaskReopenRecoveryRate = Number(candidate.learningTaskReopenRecoveryRate)
  const misinternalizationRate = Number(candidate.misinternalizationRate)
  const relationshipCadenceRegressionRate = Number(candidate.relationshipCadenceRegressionRate)
  const selfModelStaleBeliefRate = Number(candidate.selfModelStaleBeliefRate)
  const lastUpdatedAt = Number(candidate.lastUpdatedAt)
  return {
    semanticLatencyMs: Number.isFinite(semanticLatencyMs) ? Math.max(0, semanticLatencyMs) : null,
    semanticSampleCount: Number.isFinite(semanticSampleCount) ? Math.max(0, Math.floor(semanticSampleCount)) : 0,
    graphLatencyMs: Number.isFinite(graphLatencyMs) ? Math.max(0, graphLatencyMs) : null,
    graphSampleCount: Number.isFinite(graphSampleCount) ? Math.max(0, Math.floor(graphSampleCount)) : 0,
    candidateGenerationLatencyMs: Number.isFinite(candidateGenerationLatencyMs) ? Math.max(0, candidateGenerationLatencyMs) : null,
    candidateGenerationSampleCount: Number.isFinite(candidateGenerationSampleCount) ? Math.max(0, Math.floor(candidateGenerationSampleCount)) : 0,
    plannerLatencyMs: Number.isFinite(plannerLatencyMs) ? Math.max(0, plannerLatencyMs) : null,
    plannerSampleCount: Number.isFinite(plannerSampleCount) ? Math.max(0, Math.floor(plannerSampleCount)) : 0,
    speechPlanLatencyMs: Number.isFinite(speechPlanLatencyMs) ? Math.max(0, speechPlanLatencyMs) : null,
    speechPlanSampleCount: Number.isFinite(speechPlanSampleCount) ? Math.max(0, Math.floor(speechPlanSampleCount)) : 0,
    cacheHitCount: Number.isFinite(cacheHitCount) ? Math.max(0, Math.floor(cacheHitCount)) : 0,
    cacheMissCount: Number.isFinite(cacheMissCount) ? Math.max(0, Math.floor(cacheMissCount)) : 0,
    prewarmHitCount: Number.isFinite(prewarmHitCount) ? Math.max(0, Math.floor(prewarmHitCount)) : 0,
    prewarmMissCount: Number.isFinite(prewarmMissCount) ? Math.max(0, Math.floor(prewarmMissCount)) : 0,
    budgetClassCounts: {
      'realtime-reply': Number.isFinite(Number(budgetClassCounts['realtime-reply'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['realtime-reply']))) : 0,
      'deep-recall-reply': Number.isFinite(Number(budgetClassCounts['deep-recall-reply'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['deep-recall-reply']))) : 0,
      'proactive-generation': Number.isFinite(Number(budgetClassCounts['proactive-generation'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['proactive-generation']))) : 0,
      'nightly-benchmark': Number.isFinite(Number(budgetClassCounts['nightly-benchmark'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['nightly-benchmark']))) : 0,
      'diagnosis-replay': Number.isFinite(Number(budgetClassCounts['diagnosis-replay'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['diagnosis-replay']))) : 0,
    },
    budgetLatencySamples: Object.fromEntries(
      memoryRetrievalBudgetClasses.map((budgetClass) => {
        const samples = Array.isArray(budgetLatencySamples[budgetClass])
          ? budgetLatencySamples[budgetClass]
            .map(item => Number(item))
            .filter(item => Number.isFinite(item) && item >= 0)
          : []
        return [budgetClass, trimLatencySamples(samples)]
      }),
    ),
    budgetLatencyTelemetry: Object.fromEntries(
      memoryRetrievalBudgetClasses.map((budgetClass) => {
        const samples = Array.isArray(budgetLatencySamples[budgetClass])
          ? trimLatencySamples(budgetLatencySamples[budgetClass].map(item => Number(item)))
          : []
        const explicit = budgetLatencyTelemetry[budgetClass] && typeof budgetLatencyTelemetry[budgetClass] === 'object'
          ? budgetLatencyTelemetry[budgetClass] as Record<string, unknown>
          : null
        if (samples.length > 0)
          return [budgetClass, deriveBudgetLatencyTelemetry({ budgetClass, samples })]
        const p50LatencyMs = nullableNonNegativeNumber(explicit?.p50LatencyMs)
        const p95LatencyMs = nullableNonNegativeNumber(explicit?.p95LatencyMs)
        const maxLatencyMs = nullableNonNegativeNumber(explicit?.maxLatencyMs)
        return [budgetClass, {
          sampleCount: Number.isFinite(Number(explicit?.sampleCount)) ? Math.max(0, Math.floor(Number(explicit?.sampleCount))) : 0,
          p50LatencyMs,
          p95LatencyMs,
          maxLatencyMs,
          gateStatus: explicit?.gateStatus === 'pass' || explicit?.gateStatus === 'warn' || explicit?.gateStatus === 'fail' || explicit?.gateStatus === 'unknown'
            ? explicit.gateStatus
            : 'unknown',
          targetP95Ms: Number.isFinite(Number(explicit?.targetP95Ms)) ? Math.max(1, Number(explicit?.targetP95Ms)) : budgetLatencyP95TargetsMs[budgetClass],
        } satisfies AlicizationBudgetLatencyTelemetry]
      }),
    ),
    organicStageTelemetry: Object.fromEntries(
      organicMemoryRuntimeStages.map((stage) => {
        const entry = organicStageTelemetry[stage]
        const candidate = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
        return [stage, {
          latencyMs: nullableNonNegativeNumber(candidate.latencyMs),
          sampleCount: Number.isFinite(Number(candidate.sampleCount)) ? Math.max(0, Math.floor(Number(candidate.sampleCount))) : 0,
          p50LatencyMs: nullableNonNegativeNumber(candidate.p50LatencyMs),
          p95LatencyMs: nullableNonNegativeNumber(candidate.p95LatencyMs),
        }]
      }),
    ),
    organicStageBudgetCounts: Object.fromEntries(
      organicMemoryRuntimeStages.map((stage) => {
        const entry = organicStageBudgetCounts[stage]
        const candidate = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
        return [stage, {
          'realtime-reply': Number.isFinite(Number(candidate['realtime-reply'])) ? Math.max(0, Math.floor(Number(candidate['realtime-reply']))) : 0,
          'deep-recall-reply': Number.isFinite(Number(candidate['deep-recall-reply'])) ? Math.max(0, Math.floor(Number(candidate['deep-recall-reply']))) : 0,
          'proactive-generation': Number.isFinite(Number(candidate['proactive-generation'])) ? Math.max(0, Math.floor(Number(candidate['proactive-generation']))) : 0,
          'nightly-benchmark': Number.isFinite(Number(candidate['nightly-benchmark'])) ? Math.max(0, Math.floor(Number(candidate['nightly-benchmark']))) : 0,
          'diagnosis-replay': Number.isFinite(Number(candidate['diagnosis-replay'])) ? Math.max(0, Math.floor(Number(candidate['diagnosis-replay']))) : 0,
        }]
      }),
    ),
    hotKeyStats: hotKeyStats
      .map((item) => {
        const candidate = item && typeof item === 'object' ? item as Record<string, unknown> : null
        const key = typeof candidate?.key === 'string' ? candidate.key.trim().slice(0, 160) : ''
        if (!key)
          return null
        return {
          key,
          candidateCount: Number.isFinite(Number(candidate?.candidateCount)) ? Math.max(0, Math.floor(Number(candidate?.candidateCount))) : 0,
          hitCount: Number.isFinite(Number(candidate?.hitCount)) ? Math.max(0, Math.floor(Number(candidate?.hitCount))) : 0,
          winCount: Number.isFinite(Number(candidate?.winCount)) ? Math.max(0, Math.floor(Number(candidate?.winCount))) : 0,
          missCount: Number.isFinite(Number(candidate?.missCount)) ? Math.max(0, Math.floor(Number(candidate?.missCount))) : 0,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 16),
    recallHitRate: Number.isFinite(recallHitRate) ? Math.max(0, Math.min(1, recallHitRate)) : 0,
    recallMissRate: Number.isFinite(recallMissRate) ? Math.max(0, Math.min(1, recallMissRate)) : 0,
    recallAt1: Number.isFinite(recallAt1) ? Math.max(0, Math.min(1, recallAt1)) : 0,
    recallAt3: Number.isFinite(recallAt3) ? Math.max(0, Math.min(1, recallAt3)) : 0,
    precisionAt3: Number.isFinite(precisionAt3) ? Math.max(0, Math.min(1, precisionAt3)) : 0,
    wrongThreadRate: Number.isFinite(wrongThreadRate) ? Math.max(0, Math.min(1, wrongThreadRate)) : 0,
    wrongThreadSuppression: Number.isFinite(wrongThreadSuppression) ? Math.max(0, Math.min(1, wrongThreadSuppression)) : 0,
    suppressionHitRate: Number.isFinite(suppressionHitRate) ? Math.max(0, Math.min(1, suppressionHitRate)) : 0,
    wrongThreadPreventedCount: Number.isFinite(wrongThreadPreventedCount) ? Math.max(0, Math.floor(wrongThreadPreventedCount)) : 0,
    falsePositiveSuppressionRate: Number.isFinite(falsePositiveSuppressionRate) ? Math.max(0, Math.min(1, falsePositiveSuppressionRate)) : 0,
    staleSelfModelVetoRate: Number.isFinite(staleSelfModelVetoRate) ? Math.max(0, Math.min(1, staleSelfModelVetoRate)) : 0,
    relationshipEraConfusionRate: Number.isFinite(relationshipEraConfusionRate) ? Math.max(0, Math.min(1, relationshipEraConfusionRate)) : 0,
    reconstructionErrorRate: Number.isFinite(reconstructionErrorRate) ? Math.max(0, Math.min(1, reconstructionErrorRate)) : 0,
    stableCoreOnlyRate: Number.isFinite(stableCoreOnlyRate) ? Math.max(0, Math.min(1, stableCoreOnlyRate)) : 0,
    memorySurfaceViolationRate: Number.isFinite(memorySurfaceViolationRate) ? Math.max(0, Math.min(1, memorySurfaceViolationRate)) : 0,
    templateLeakageFailCount: Number.isFinite(templateLeakageFailCount) ? Math.max(0, Math.floor(templateLeakageFailCount)) : 0,
    claimAccuracy: Number.isFinite(claimAccuracy) ? Math.max(0, Math.min(1, claimAccuracy)) : 0,
    replyAuthorityAccuracy: Number.isFinite(replyAuthorityAccuracy) ? Math.max(0, Math.min(1, replyAuthorityAccuracy)) : 0,
    latencyBudgetPass,
    mindParticipation: Number.isFinite(mindParticipation) ? Math.max(0, Math.min(1, mindParticipation)) : 0,
    memoryParticipation: Number.isFinite(memoryParticipation) ? Math.max(0, Math.min(1, memoryParticipation)) : 0,
    personalityParticipation: Number.isFinite(personalityParticipation) ? Math.max(0, Math.min(1, personalityParticipation)) : 0,
    relationshipParticipation: Number.isFinite(relationshipParticipation) ? Math.max(0, Math.min(1, relationshipParticipation)) : 0,
    continuityParticipation: Number.isFinite(continuityParticipation) ? Math.max(0, Math.min(1, continuityParticipation)) : 0,
    learningTaskCompletionCount: Number.isFinite(learningTaskCompletionCount) ? Math.max(0, Math.floor(learningTaskCompletionCount)) : 0,
    learningTaskFailureCount: Number.isFinite(learningTaskFailureCount) ? Math.max(0, Math.floor(learningTaskFailureCount)) : 0,
    learningTaskBlockedCount: Number.isFinite(learningTaskBlockedCount) ? Math.max(0, Math.floor(learningTaskBlockedCount)) : 0,
    learningTaskReopenedCount: Number.isFinite(learningTaskReopenedCount) ? Math.max(0, Math.floor(learningTaskReopenedCount)) : 0,
    learningTaskDowngradedCount: Number.isFinite(learningTaskDowngradedCount) ? Math.max(0, Math.floor(learningTaskDowngradedCount)) : 0,
    learningTaskCancelledCount: Number.isFinite(learningTaskCancelledCount) ? Math.max(0, Math.floor(learningTaskCancelledCount)) : 0,
    learningRelationshipReviseCount: Number.isFinite(learningRelationshipReviseCount) ? Math.max(0, Math.floor(learningRelationshipReviseCount)) : 0,
    learningSelfModelReviseCount: Number.isFinite(learningSelfModelReviseCount) ? Math.max(0, Math.floor(learningSelfModelReviseCount)) : 0,
    learningWorldModelValidationCount: Number.isFinite(learningWorldModelValidationCount) ? Math.max(0, Math.floor(learningWorldModelValidationCount)) : 0,
    learningWorldModelFalseInternalizationCount: Number.isFinite(learningWorldModelFalseInternalizationCount) ? Math.max(0, Math.floor(learningWorldModelFalseInternalizationCount)) : 0,
    learningTaskCompletionRate: Number.isFinite(learningTaskCompletionRate) ? Math.max(0, Math.min(1, learningTaskCompletionRate)) : 0,
    learningTaskFailureRate: Number.isFinite(learningTaskFailureRate) ? Math.max(0, Math.min(1, learningTaskFailureRate)) : 0,
    learningTaskReopenRecoveryRate: Number.isFinite(learningTaskReopenRecoveryRate) ? Math.max(0, Math.min(1, learningTaskReopenRecoveryRate)) : 0,
    misinternalizationRate: Number.isFinite(misinternalizationRate) ? Math.max(0, Math.min(1, misinternalizationRate)) : 0,
    relationshipCadenceRegressionRate: Number.isFinite(relationshipCadenceRegressionRate) ? Math.max(0, Math.min(1, relationshipCadenceRegressionRate)) : 0,
    selfModelStaleBeliefRate: Number.isFinite(selfModelStaleBeliefRate) ? Math.max(0, Math.min(1, selfModelStaleBeliefRate)) : 0,
    lastUpdatedAt: Number.isFinite(lastUpdatedAt) ? Math.max(0, Math.floor(lastUpdatedAt)) : null,
  }
}

export function blendAlicizationMemoryTelemetryLatency(previous: number | null, previousSamples: number, sample: number) {
  const normalizedSample = Math.max(0, Number(sample) || 0)
  if (!Number.isFinite(previous) || previous == null || previousSamples <= 0)
    return normalizedSample
  const carryWeight = Math.min(9, Math.max(1, previousSamples))
  return (previous * carryWeight + normalizedSample) / (carryWeight + 1)
}

function nullableNonNegativeNumber(raw: unknown) {
  if (raw == null || raw === '')
    return null
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(0, value) : null
}

function averageUnit(previous: number, sample: number) {
  return Math.max(0, Math.min(1, Number(((previous + sample) / 2).toFixed(2))))
}

function trimLatencySamples(samples: number[], maxItems = 64) {
  return samples
    .filter(item => Number.isFinite(item) && item >= 0)
    .slice(-maxItems)
}

function percentileLatency(samples: number[], percentile: number) {
  const sorted = [...samples].sort((left, right) => left - right)
  if (sorted.length === 0)
    return null
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentile * sorted.length) - 1))
  return sorted[index] ?? null
}

function deriveBudgetLatencyTelemetry(input: {
  budgetClass: AlicizationMemoryRetrievalBudgetClass
  samples: number[]
}): AlicizationBudgetLatencyTelemetry {
  const samples = trimLatencySamples(input.samples)
  const p95LatencyMs = percentileLatency(samples, 0.95)
  const targetP95Ms = budgetLatencyP95TargetsMs[input.budgetClass]
  return {
    sampleCount: samples.length,
    p50LatencyMs: percentileLatency(samples, 0.5),
    p95LatencyMs,
    maxLatencyMs: samples.length > 0 ? Math.max(...samples) : null,
    gateStatus: !p95LatencyMs
      ? 'unknown'
      : p95LatencyMs <= targetP95Ms
        ? 'pass'
        : p95LatencyMs <= targetP95Ms * 1.18
          ? 'warn'
          : 'fail',
    targetP95Ms,
  }
}

function updateHotKeyStats(input: {
  current: AlicizationMemoryRetrievalTelemetrySnapshot['hotKeyStats']
  key: string
  hit: boolean
  won: boolean
}) {
  const normalizedKey = input.key.trim().slice(0, 160)
  if (!normalizedKey)
    return input.current
  const current = [...input.current]
  const existingIndex = current.findIndex(item => item.key === normalizedKey)
  const base = existingIndex >= 0
    ? current[existingIndex]
    : {
        key: normalizedKey,
        candidateCount: 0,
        hitCount: 0,
        winCount: 0,
        missCount: 0,
      }
  const next = {
    ...base,
    candidateCount: base.candidateCount + 1,
    hitCount: base.hitCount + (input.hit ? 1 : 0),
    winCount: base.winCount + (input.hit && input.won ? 1 : 0),
    missCount: base.missCount + (input.hit ? 0 : 1),
  }
  if (existingIndex >= 0)
    current.splice(existingIndex, 1)
  current.unshift(next)
  return current
    .sort((left, right) => right.candidateCount - left.candidateCount || right.winCount - left.winCount || left.key.localeCompare(right.key))
    .slice(0, 16)
}

export function createAlicizationMemoryRetrievalTelemetryRuntime(
  input: CreateAlicizationMemoryRetrievalTelemetryRuntimeOptions,
) {
  const getTelemetry = async () => {
    const raw = await input.getMetaValue(input.key)
    if (!raw)
      return defaultAlicizationMemoryRetrievalTelemetry()

    try {
      return normalizeAlicizationMemoryRetrievalTelemetry(JSON.parse(raw))
    }
    catch {
      return defaultAlicizationMemoryRetrievalTelemetry()
    }
  }

  const writeTelemetry = async (next: AlicizationMemoryRetrievalTelemetrySnapshot) => {
    await input.upsertMeta(input.key, JSON.stringify(next))
  }

  const recordSemanticLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        semanticLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.semanticLatencyMs,
          telemetry.semanticSampleCount,
          latencyMs,
        ),
        semanticSampleCount: telemetry.semanticSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordGraphLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        graphLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.graphLatencyMs,
          telemetry.graphSampleCount,
          latencyMs,
        ),
        graphSampleCount: telemetry.graphSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordCandidateGenerationLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        candidateGenerationLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.candidateGenerationLatencyMs,
          telemetry.candidateGenerationSampleCount,
          latencyMs,
        ),
        candidateGenerationSampleCount: telemetry.candidateGenerationSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordPlannerLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        plannerLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.plannerLatencyMs,
          telemetry.plannerSampleCount,
          latencyMs,
        ),
        plannerSampleCount: telemetry.plannerSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordSpeechPlanLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        speechPlanLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.speechPlanLatencyMs,
          telemetry.speechPlanSampleCount,
          latencyMs,
        ),
        speechPlanSampleCount: telemetry.speechPlanSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordCacheAccess = async (hit: boolean) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        cacheHitCount: telemetry.cacheHitCount + (hit ? 1 : 0),
        cacheMissCount: telemetry.cacheMissCount + (hit ? 0 : 1),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordPrewarmAccess = async (hit: boolean) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        prewarmHitCount: telemetry.prewarmHitCount + (hit ? 1 : 0),
        prewarmMissCount: telemetry.prewarmMissCount + (hit ? 0 : 1),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordBudgetClass = async (budgetClass: AlicizationMemoryRetrievalBudgetClass) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        budgetClassCounts: {
          ...telemetry.budgetClassCounts,
          [budgetClass]: (telemetry.budgetClassCounts[budgetClass] ?? 0) + 1,
        },
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordOrganicStageLatency = async (inputValue: {
    stage: AlicizationOrganicMemoryRuntimeStage
    latencyMs: number
  }) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      const currentStage = telemetry.organicStageTelemetry[inputValue.stage] ?? {
        latencyMs: null,
        sampleCount: 0,
      }
      const stageBudgetCounts = telemetry.organicStageBudgetCounts[inputValue.stage] ?? {}
      const budgetClass = [...memoryRetrievalBudgetClasses]
        .sort((left, right) => (stageBudgetCounts[right] ?? 0) - (stageBudgetCounts[left] ?? 0))[0] ?? 'realtime-reply'
      const budgetSamples = trimLatencySamples([
        ...(telemetry.budgetLatencySamples[budgetClass] ?? []),
        inputValue.latencyMs,
      ])
      await writeTelemetry({
        ...telemetry,
        budgetLatencySamples: {
          ...telemetry.budgetLatencySamples,
          [budgetClass]: budgetSamples,
        },
        budgetLatencyTelemetry: {
          ...telemetry.budgetLatencyTelemetry,
          [budgetClass]: deriveBudgetLatencyTelemetry({
            budgetClass,
            samples: budgetSamples,
          }),
        },
        organicStageTelemetry: {
          ...telemetry.organicStageTelemetry,
          [inputValue.stage]: {
            latencyMs: blendAlicizationMemoryTelemetryLatency(
              currentStage.latencyMs,
              currentStage.sampleCount,
              inputValue.latencyMs,
            ),
            sampleCount: currentStage.sampleCount + 1,
            p50LatencyMs: deriveBudgetLatencyTelemetry({
              budgetClass,
              samples: budgetSamples,
            }).p50LatencyMs,
            p95LatencyMs: deriveBudgetLatencyTelemetry({
              budgetClass,
              samples: budgetSamples,
            }).p95LatencyMs,
          },
        },
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordOrganicStageBudget = async (inputValue: {
    stage: AlicizationOrganicMemoryRuntimeStage
    budgetClass: AlicizationMemoryRetrievalBudgetClass
  }) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      const currentStage = telemetry.organicStageBudgetCounts[inputValue.stage] ?? {}
      await writeTelemetry({
        ...telemetry,
        organicStageBudgetCounts: {
          ...telemetry.organicStageBudgetCounts,
          [inputValue.stage]: {
            ...currentStage,
            [inputValue.budgetClass]: (currentStage[inputValue.budgetClass] ?? 0) + 1,
          },
        },
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordHotKeyOutcome = async (inputValue: {
    key: string
    hit: boolean
    won?: boolean
  }) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        hotKeyStats: updateHotKeyStats({
          current: telemetry.hotKeyStats,
          key: inputValue.key,
          hit: inputValue.hit,
          won: inputValue.won !== false,
        }),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordParticipation = async (inputValue: {
    mindParticipation: number
    memoryParticipation: number
    personalityParticipation: number
    relationshipParticipation: number
    continuityParticipation: number
  }) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        mindParticipation: averageUnit(telemetry.mindParticipation, inputValue.mindParticipation),
        memoryParticipation: averageUnit(telemetry.memoryParticipation, inputValue.memoryParticipation),
        personalityParticipation: averageUnit(telemetry.personalityParticipation, inputValue.personalityParticipation),
        relationshipParticipation: averageUnit(telemetry.relationshipParticipation, inputValue.relationshipParticipation),
        continuityParticipation: averageUnit(telemetry.continuityParticipation, inputValue.continuityParticipation),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordLearningExecution = async (inputValue: AlicizationLearningExecutionTelemetryInput) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      const learningTaskCompletionCount = telemetry.learningTaskCompletionCount + (inputValue.status === 'completed' ? 1 : 0)
      const learningTaskFailureCount = telemetry.learningTaskFailureCount + (inputValue.status === 'failed' ? 1 : 0)
      const learningTaskBlockedCount = telemetry.learningTaskBlockedCount + (inputValue.status === 'blocked' ? 1 : 0)
      const learningTaskReopenedCount = telemetry.learningTaskReopenedCount + (inputValue.status === 'reopened' ? 1 : 0)
      const learningTaskDowngradedCount = telemetry.learningTaskDowngradedCount + (inputValue.status === 'downgraded' ? 1 : 0)
      const learningTaskCancelledCount = telemetry.learningTaskCancelledCount + (inputValue.status === 'cancelled' ? 1 : 0)
      const learningWorldModelValidationCount = telemetry.learningWorldModelValidationCount + (
        inputValue.status === 'completed' && inputValue.domain === 'world-model' ? 1 : 0
      )
      const learningWorldModelFalseInternalizationCount = telemetry.learningWorldModelFalseInternalizationCount + (
        inputValue.status === 'completed' && inputValue.domain === 'world-model' && inputValue.internalizedAsValidatedOnly === false ? 1 : 0
      )
      const learningAttemptCount = learningTaskCompletionCount
        + learningTaskFailureCount
        + learningTaskBlockedCount
        + learningTaskDowngradedCount
        + learningTaskCancelledCount
      await writeTelemetry({
        ...telemetry,
        learningTaskCompletionCount,
        learningTaskFailureCount,
        learningTaskBlockedCount,
        learningTaskReopenedCount,
        learningTaskDowngradedCount,
        learningTaskCancelledCount,
        learningRelationshipReviseCount: telemetry.learningRelationshipReviseCount + (
          inputValue.status === 'completed' && inputValue.domain === 'relationship' ? 1 : 0
        ),
        learningSelfModelReviseCount: telemetry.learningSelfModelReviseCount + (
          inputValue.status === 'completed' && inputValue.domain === 'self-model' ? 1 : 0
        ),
        learningWorldModelValidationCount,
        learningWorldModelFalseInternalizationCount,
        learningTaskCompletionRate: learningAttemptCount <= 0 ? 0 : Number((learningTaskCompletionCount / learningAttemptCount).toFixed(2)),
        learningTaskFailureRate: learningAttemptCount <= 0 ? 0 : Number((learningTaskFailureCount / learningAttemptCount).toFixed(2)),
        learningTaskReopenRecoveryRate: learningTaskReopenedCount <= 0 ? 0 : Number((Math.min(learningTaskCompletionCount, learningTaskReopenedCount) / learningTaskReopenedCount).toFixed(2)),
        misinternalizationRate: learningWorldModelValidationCount <= 0 ? 0 : Number((learningWorldModelFalseInternalizationCount / learningWorldModelValidationCount).toFixed(2)),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const applyHealthOverrideInline = async (next: AlicizationMemoryRetrievalHealthOverride) => {
    const telemetry = await getTelemetry()
    await writeTelemetry({
      semanticLatencyMs: Number.isFinite(next.semanticLatencyMs)
        ? Math.max(0, Number(next.semanticLatencyMs))
        : telemetry.semanticLatencyMs,
      semanticSampleCount: telemetry.semanticSampleCount,
      graphLatencyMs: Number.isFinite(next.graphLatencyMs)
        ? Math.max(0, Number(next.graphLatencyMs))
        : telemetry.graphLatencyMs,
      graphSampleCount: telemetry.graphSampleCount,
      candidateGenerationLatencyMs: Number.isFinite(next.candidateGenerationLatencyMs)
        ? Math.max(0, Number(next.candidateGenerationLatencyMs))
        : telemetry.candidateGenerationLatencyMs,
      candidateGenerationSampleCount: telemetry.candidateGenerationSampleCount,
      plannerLatencyMs: Number.isFinite(next.plannerLatencyMs)
        ? Math.max(0, Number(next.plannerLatencyMs))
        : telemetry.plannerLatencyMs,
      plannerSampleCount: telemetry.plannerSampleCount,
      speechPlanLatencyMs: Number.isFinite(next.speechPlanLatencyMs)
        ? Math.max(0, Number(next.speechPlanLatencyMs))
        : telemetry.speechPlanLatencyMs,
      speechPlanSampleCount: telemetry.speechPlanSampleCount,
      cacheHitCount: Number.isFinite(next.cacheHitRatio)
        ? Math.max(0, Math.floor((telemetry.cacheHitCount + telemetry.cacheMissCount) * Math.max(0, Math.min(1, Number(next.cacheHitRatio)))))
        : telemetry.cacheHitCount,
      cacheMissCount: Number.isFinite(next.cacheHitRatio)
        ? Math.max(0, (telemetry.cacheHitCount + telemetry.cacheMissCount) - Math.floor((telemetry.cacheHitCount + telemetry.cacheMissCount) * Math.max(0, Math.min(1, Number(next.cacheHitRatio)))))
        : telemetry.cacheMissCount,
      prewarmHitCount: Number.isFinite(next.prewarmHitRatio)
        ? Math.max(0, Math.floor((telemetry.prewarmHitCount + telemetry.prewarmMissCount) * Math.max(0, Math.min(1, Number(next.prewarmHitRatio)))))
        : telemetry.prewarmHitCount,
      prewarmMissCount: Number.isFinite(next.prewarmHitRatio)
        ? Math.max(0, (telemetry.prewarmHitCount + telemetry.prewarmMissCount) - Math.floor((telemetry.prewarmHitCount + telemetry.prewarmMissCount) * Math.max(0, Math.min(1, Number(next.prewarmHitRatio)))))
        : telemetry.prewarmMissCount,
      recallHitRate: Number.isFinite(next.recallHitRate)
        ? Math.max(0, Math.min(1, Number(next.recallHitRate)))
        : telemetry.recallHitRate,
      recallMissRate: Number.isFinite(next.recallMissRate)
        ? Math.max(0, Math.min(1, Number(next.recallMissRate)))
        : telemetry.recallMissRate,
      recallAt1: Number.isFinite(next.recallAt1)
        ? Math.max(0, Math.min(1, Number(next.recallAt1)))
        : telemetry.recallAt1,
      recallAt3: Number.isFinite(next.recallAt3)
        ? Math.max(0, Math.min(1, Number(next.recallAt3)))
        : telemetry.recallAt3,
      precisionAt3: Number.isFinite(next.precisionAt3)
        ? Math.max(0, Math.min(1, Number(next.precisionAt3)))
        : telemetry.precisionAt3,
      wrongThreadRate: Number.isFinite(next.wrongThreadRate)
        ? Math.max(0, Math.min(1, Number(next.wrongThreadRate)))
        : telemetry.wrongThreadRate,
      wrongThreadSuppression: Number.isFinite(next.wrongThreadSuppression)
        ? Math.max(0, Math.min(1, Number(next.wrongThreadSuppression)))
        : telemetry.wrongThreadSuppression,
      suppressionHitRate: Number.isFinite(next.suppressionHitRate)
        ? Math.max(0, Math.min(1, Number(next.suppressionHitRate)))
        : telemetry.suppressionHitRate,
      wrongThreadPreventedCount: Number.isFinite(next.wrongThreadPreventedCount)
        ? Math.max(0, Math.floor(Number(next.wrongThreadPreventedCount)))
        : telemetry.wrongThreadPreventedCount,
      falsePositiveSuppressionRate: Number.isFinite(next.falsePositiveSuppressionRate)
        ? Math.max(0, Math.min(1, Number(next.falsePositiveSuppressionRate)))
        : telemetry.falsePositiveSuppressionRate,
      staleSelfModelVetoRate: Number.isFinite(next.staleSelfModelVetoRate)
        ? Math.max(0, Math.min(1, Number(next.staleSelfModelVetoRate)))
        : telemetry.staleSelfModelVetoRate,
      relationshipEraConfusionRate: Number.isFinite(next.relationshipEraConfusionRate)
        ? Math.max(0, Math.min(1, Number(next.relationshipEraConfusionRate)))
        : telemetry.relationshipEraConfusionRate,
      reconstructionErrorRate: Number.isFinite(next.reconstructionErrorRate)
        ? Math.max(0, Math.min(1, Number(next.reconstructionErrorRate)))
        : telemetry.reconstructionErrorRate,
      stableCoreOnlyRate: Number.isFinite(next.stableCoreOnlyRate)
        ? Math.max(0, Math.min(1, Number(next.stableCoreOnlyRate)))
        : telemetry.stableCoreOnlyRate,
      memorySurfaceViolationRate: Number.isFinite(next.memorySurfaceViolationRate)
        ? Math.max(0, Math.min(1, Number(next.memorySurfaceViolationRate)))
        : telemetry.memorySurfaceViolationRate,
      templateLeakageFailCount: Number.isFinite(next.templateLeakageFailCount)
        ? Math.max(0, Math.floor(Number(next.templateLeakageFailCount)))
        : telemetry.templateLeakageFailCount,
      claimAccuracy: Number.isFinite(next.claimAccuracy)
        ? Math.max(0, Math.min(1, Number(next.claimAccuracy)))
        : telemetry.claimAccuracy,
      replyAuthorityAccuracy: Number.isFinite(next.replyAuthorityAccuracy)
        ? Math.max(0, Math.min(1, Number(next.replyAuthorityAccuracy)))
        : telemetry.replyAuthorityAccuracy,
      latencyBudgetPass: typeof next.latencyBudgetPass === 'boolean'
        ? next.latencyBudgetPass
        : telemetry.latencyBudgetPass,
      budgetClassCounts: next.budgetClassCounts
        ? {
            ...telemetry.budgetClassCounts,
            ...next.budgetClassCounts,
          }
        : telemetry.budgetClassCounts,
      budgetLatencyTelemetry: next.budgetLatencyTelemetry
        ? {
            ...telemetry.budgetLatencyTelemetry,
            ...next.budgetLatencyTelemetry,
          }
        : telemetry.budgetLatencyTelemetry,
      budgetLatencySamples: telemetry.budgetLatencySamples,
      organicStageTelemetry: next.organicStageTelemetry
        ? {
            ...telemetry.organicStageTelemetry,
            ...next.organicStageTelemetry,
          }
        : telemetry.organicStageTelemetry,
      organicStageBudgetCounts: next.organicStageBudgetCounts
        ? {
            ...telemetry.organicStageBudgetCounts,
            ...next.organicStageBudgetCounts,
          }
        : telemetry.organicStageBudgetCounts,
      hotKeyStats: Array.isArray(next.hotKeyStats) && next.hotKeyStats.length > 0
        ? next.hotKeyStats
        : telemetry.hotKeyStats,
      mindParticipation: Number.isFinite(next.mindParticipation)
        ? Math.max(0, Math.min(1, Number(next.mindParticipation)))
        : telemetry.mindParticipation,
      memoryParticipation: Number.isFinite(next.memoryParticipation)
        ? Math.max(0, Math.min(1, Number(next.memoryParticipation)))
        : telemetry.memoryParticipation,
      personalityParticipation: Number.isFinite(next.personalityParticipation)
        ? Math.max(0, Math.min(1, Number(next.personalityParticipation)))
        : telemetry.personalityParticipation,
      relationshipParticipation: Number.isFinite(next.relationshipParticipation)
        ? Math.max(0, Math.min(1, Number(next.relationshipParticipation)))
        : telemetry.relationshipParticipation,
      continuityParticipation: Number.isFinite(next.continuityParticipation)
        ? Math.max(0, Math.min(1, Number(next.continuityParticipation)))
        : telemetry.continuityParticipation,
      learningTaskCompletionCount: Number.isFinite(next.learningTaskCompletionCount)
        ? Math.max(0, Math.floor(Number(next.learningTaskCompletionCount)))
        : telemetry.learningTaskCompletionCount,
      learningTaskFailureCount: Number.isFinite(next.learningTaskFailureCount)
        ? Math.max(0, Math.floor(Number(next.learningTaskFailureCount)))
        : telemetry.learningTaskFailureCount,
      learningTaskBlockedCount: Number.isFinite(next.learningTaskBlockedCount)
        ? Math.max(0, Math.floor(Number(next.learningTaskBlockedCount)))
        : telemetry.learningTaskBlockedCount,
      learningTaskReopenedCount: Number.isFinite(next.learningTaskReopenedCount)
        ? Math.max(0, Math.floor(Number(next.learningTaskReopenedCount)))
        : telemetry.learningTaskReopenedCount,
      learningTaskDowngradedCount: Number.isFinite(next.learningTaskDowngradedCount)
        ? Math.max(0, Math.floor(Number(next.learningTaskDowngradedCount)))
        : telemetry.learningTaskDowngradedCount,
      learningTaskCancelledCount: Number.isFinite(next.learningTaskCancelledCount)
        ? Math.max(0, Math.floor(Number(next.learningTaskCancelledCount)))
        : telemetry.learningTaskCancelledCount,
      learningRelationshipReviseCount: Number.isFinite(next.learningRelationshipReviseCount)
        ? Math.max(0, Math.floor(Number(next.learningRelationshipReviseCount)))
        : telemetry.learningRelationshipReviseCount,
      learningSelfModelReviseCount: Number.isFinite(next.learningSelfModelReviseCount)
        ? Math.max(0, Math.floor(Number(next.learningSelfModelReviseCount)))
        : telemetry.learningSelfModelReviseCount,
      learningWorldModelValidationCount: Number.isFinite(next.learningWorldModelValidationCount)
        ? Math.max(0, Math.floor(Number(next.learningWorldModelValidationCount)))
        : telemetry.learningWorldModelValidationCount,
      learningWorldModelFalseInternalizationCount: Number.isFinite(next.learningWorldModelFalseInternalizationCount)
        ? Math.max(0, Math.floor(Number(next.learningWorldModelFalseInternalizationCount)))
        : telemetry.learningWorldModelFalseInternalizationCount,
      learningTaskCompletionRate: Number.isFinite(next.learningTaskCompletionRate)
        ? Math.max(0, Math.min(1, Number(next.learningTaskCompletionRate)))
        : telemetry.learningTaskCompletionRate,
      learningTaskFailureRate: Number.isFinite(next.learningTaskFailureRate)
        ? Math.max(0, Math.min(1, Number(next.learningTaskFailureRate)))
        : telemetry.learningTaskFailureRate,
      learningTaskReopenRecoveryRate: Number.isFinite(next.learningTaskReopenRecoveryRate)
        ? Math.max(0, Math.min(1, Number(next.learningTaskReopenRecoveryRate)))
        : telemetry.learningTaskReopenRecoveryRate,
      misinternalizationRate: Number.isFinite(next.misinternalizationRate)
        ? Math.max(0, Math.min(1, Number(next.misinternalizationRate)))
        : telemetry.misinternalizationRate,
      relationshipCadenceRegressionRate: Number.isFinite(next.relationshipCadenceRegressionRate)
        ? Math.max(0, Math.min(1, Number(next.relationshipCadenceRegressionRate)))
        : telemetry.relationshipCadenceRegressionRate,
      selfModelStaleBeliefRate: Number.isFinite(next.selfModelStaleBeliefRate)
        ? Math.max(0, Math.min(1, Number(next.selfModelStaleBeliefRate)))
        : telemetry.selfModelStaleBeliefRate,
      lastUpdatedAt: input.now(),
    })
  }

  const applyHealthOverride = async (next: AlicizationMemoryRetrievalHealthOverride) => {
    await input.enqueueWrite(async () => {
      await applyHealthOverrideInline(next)
    })
  }

  return {
    getTelemetry,
    writeTelemetry,
    recordSemanticLatency,
    recordGraphLatency,
    recordCandidateGenerationLatency,
    recordPlannerLatency,
    recordSpeechPlanLatency,
    recordCacheAccess,
    recordPrewarmAccess,
    recordBudgetClass,
    recordOrganicStageLatency,
    recordOrganicStageBudget,
    recordHotKeyOutcome,
    recordParticipation,
    recordLearningExecution,
    applyHealthOverride,
    applyHealthOverrideInline,
  }
}
