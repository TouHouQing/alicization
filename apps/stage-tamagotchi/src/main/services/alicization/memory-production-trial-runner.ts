import type { WorkingMemoryQualityFixture } from './life-core/working-memory-quality-harness'
import type {
  LongTermMemoryTemporalConflictFixture,
  LongTermMemoryTemporalConflictReport,
} from './long-term-memory-temporal-conflict-harness'
import type { MemoryDialogueReplayReport } from './memory-db-dialogue-replay-harness'
import type { MemoryEmbeddingReindexProgress } from './memory-embedding-reindex-runtime'
import type {
  MemoryExperienceQualityFixture,
  MemoryExperienceQualityReport,
} from './memory-experience-quality-harness'
import type { MemoryLiveProviderTrialReport } from './memory-live-provider-trial'
import type {
  DbBackedLongTermMemoryQualityInput,
  MemoryQualityHarnessRegressionMetrics,
  MemoryQualityHarnessReport,
} from './memory-quality-harness'
import type { MemoryScopeFuzzReport } from './memory-scope-fuzz-harness'
import type {
  MemorySemanticScaleSoakReport,
} from './memory-semantic-scale-soak-harness'
import type { MemoryUserTrialHarnessInput } from './memory-user-trial-harness'
import type { PersonaTrainingDatasetQualityFixture } from './persona-training-dataset-quality-harness'
import type {
  WorkingMemoryCompressionBehaviorFixture,
  WorkingMemoryCompressionBehaviorReport,
} from './working-memory-compression-behavior-harness'

import { errorMessageFrom } from '@moeru/std'

import { runLongTermMemoryTemporalConflictHarness } from './long-term-memory-temporal-conflict-harness'
import { runMemoryExperienceQualityHarness } from './memory-experience-quality-harness'
import { runMemoryQualityHarnessSuite } from './memory-quality-harness'
import { runMemoryScopeFuzzHarness } from './memory-scope-fuzz-harness'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'
import { runWorkingMemoryCompressionBehaviorHarness } from './working-memory-compression-behavior-harness'

export type MemoryProductionTrialStageKind
  = | 'dialogue-replay'
    | 'runtime-health'
    | 'working-memory-compression'
    | 'compressed-context-behavior'
    | 'long-term-recall'
    | 'temporal-conflict'
    | 'semantic-scale-soak'
    | 'experience-quality'
    | 'scope-fuzz'
    | 'persona-dataset-hygiene'

export interface MemoryProductionTrialDialogueReplayResult {
  id: string
  passed: boolean
  turnCount: number
  report?: MemoryDialogueReplayReport | null
  workingMemory?: WorkingMemoryQualityFixture[]
  userTrials?: MemoryUserTrialHarnessInput[]
  error?: string | null
  recommendedNextActions?: string[]
  liveProviderTrial?: MemoryLiveProviderTrialReport | null
}

export interface MemoryProductionTrialStageResult {
  stage: MemoryProductionTrialStageKind
  id: string
  passed: boolean
  status?: 'not-run'
  itemCount: number
  error: string | null
}

export interface MemoryProductionTrialRunnerInput {
  id: string
  cardId: string
  createdAt: number
  dialogueReplay?: () => Promise<MemoryProductionTrialDialogueReplayResult>
  workingMemory?: WorkingMemoryQualityFixture[]
  longTerm?: DbBackedLongTermMemoryQualityInput[]
  userTrials?: MemoryUserTrialHarnessInput[]
  compressedContextBehavior?: WorkingMemoryCompressionBehaviorFixture[]
  temporalConflict?: LongTermMemoryTemporalConflictFixture[]
  semanticScaleSoak?: Parameters<typeof runMemorySemanticScaleSoakHarness>[0]
  semanticScaleSoakReport?: MemorySemanticScaleSoakReport | null
  experienceQuality?: MemoryExperienceQualityFixture[]
  scopeFuzz?: Parameters<typeof runMemoryScopeFuzzHarness>[0]
  scopeFuzzReport?: MemoryScopeFuzzReport | null
  personaTraining?: PersonaTrainingDatasetQualityFixture[]
  personaTrainingError?: string | null
  runtimeHealth?: MemoryProductionTrialRuntimeHealth | null
  requireProductionStages?: boolean
  productionStageErrors?: Partial<Record<
    Extract<MemoryProductionTrialStageKind, 'semantic-scale-soak' | 'scope-fuzz' | 'temporal-conflict'>,
    string
  >>
}

export interface MemoryProductionTrialRuntimeHealth {
  queue: {
    pending: number
    review: number
    applied: number
    failed: number
    deadLettered: number
  }
  recall: {
    lastLatencyMs: number | null
    p95LatencyMs: number | null
    lastError: string | null
  }
  embedding: {
    providerConfigured: boolean
    modelId: string | null
    dimensions: number | null
    vectorSpaceId: string | null
    reindexRequired: boolean
    indexMode: 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'
    approximate: boolean
    degraded: boolean
    nativeIndexReady: boolean
    searchReady: boolean
    lastError: string | null
    canonicalCount: number
    indexedCount: number
    missingCount: number
    textHashMismatchCount: number
    staleOrFailedCount: number
    orphanedCount: number
    coverageRatio: number | null
    reindexJob: MemoryEmbeddingReindexProgress | null
  }
  errors: string[]
}

export interface MemoryProductionTrialRegressionMetrics extends MemoryQualityHarnessRegressionMetrics {
  staleMemoryLeakRate: number | null
  temporalUpdateAccuracy: number | null
  providerFailureRate: number
  queueFailureRate: number
  deadLetterRate: number
  embeddingCoverageRatio: number | null
}

export interface MemoryProductionTrialReport {
  version: 'memory-production-trial-runner-v1'
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  summary: {
    dialogueReplayCount: number
    workingMemoryFixtureCount: number
    compressedContextBehaviorFixtureCount: number
    temporalConflictFixtureCount: number
    semanticScaleSoakRunCount: number
    experienceQualityFixtureCount: number
    scopeFuzzCaseCount: number
    longTermFixtureCount: number
    userTrialCount: number
    personaTrainingFixtureCount: number
    failingStageIds: string[]
    notRunStageIds: string[]
    optimizationFindingCount: number
    recommendedActionCount: number
    lastError: string | null
  }
  stages: MemoryProductionTrialStageResult[]
  dialogueReplay: MemoryDialogueReplayReport | null
  liveProviderTrial: MemoryLiveProviderTrialReport | null
  runtimeHealth: MemoryProductionTrialRuntimeHealth | null
  regression: MemoryProductionTrialRegressionMetrics
  quality: MemoryQualityHarnessReport
  compressedContextBehavior: WorkingMemoryCompressionBehaviorReport | null
  temporalConflict: LongTermMemoryTemporalConflictReport | null
  semanticScaleSoak: MemorySemanticScaleSoakReport | null
  experienceQuality: MemoryExperienceQualityReport | null
  scopeFuzz: MemoryScopeFuzzReport | null
  recommendedNextActions: string[]
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function ratio(numerator: number, denominator: number) {
  if (!Number.isFinite(denominator) || denominator <= 0)
    return 0
  return Number((Math.max(0, numerator) / denominator).toFixed(4))
}

function failedReplayStage(error: string): MemoryProductionTrialStageResult {
  return {
    stage: 'dialogue-replay',
    id: 'dialogue-replay',
    passed: false,
    itemCount: 0,
    error,
  }
}

function stageFromQuality(input: {
  stage: Exclude<MemoryProductionTrialStageKind, 'dialogue-replay'>
  id: string
  itemCount: number
  passed: boolean
  error: string | null
}): MemoryProductionTrialStageResult {
  return {
    stage: input.stage,
    id: input.id,
    passed: input.passed,
    itemCount: input.itemCount,
    error: input.error,
  }
}

function notRunStage(
  stage: Extract<MemoryProductionTrialStageKind, 'semantic-scale-soak' | 'scope-fuzz' | 'temporal-conflict'>,
  error: string,
): MemoryProductionTrialStageResult {
  return {
    stage,
    id: stage,
    passed: false,
    status: 'not-run',
    itemCount: 0,
    error,
  }
}

export async function runMemoryProductionTrialRunner(
  input: MemoryProductionTrialRunnerInput,
): Promise<MemoryProductionTrialReport> {
  const stages: MemoryProductionTrialStageResult[] = []
  let dialogueReplay: MemoryDialogueReplayReport | null = null
  let liveProviderTrial: MemoryLiveProviderTrialReport | null = null
  const runtimeHealth = input.runtimeHealth ?? null
  const workingMemory: WorkingMemoryQualityFixture[] = [...(input.workingMemory ?? [])]
  const userTrials: MemoryUserTrialHarnessInput[] = [...(input.userTrials ?? [])]
  const recommendedNextActions: string[] = []
  const compressedContextBehavior = input.compressedContextBehavior?.length
    ? runWorkingMemoryCompressionBehaviorHarness({
        fixtures: input.compressedContextBehavior,
        now: input.createdAt,
      })
    : null
  const temporalConflict = input.temporalConflict?.length
    ? runLongTermMemoryTemporalConflictHarness({
        fixtures: input.temporalConflict,
        now: input.createdAt,
      })
    : null
  const semanticScaleSoak = input.semanticScaleSoakReport
    ?? (input.semanticScaleSoak
      ? runMemorySemanticScaleSoakHarness(input.semanticScaleSoak)
      : null)
  const experienceQuality = input.experienceQuality?.length
    ? runMemoryExperienceQualityHarness({
        id: `${input.id}:experience-quality`,
        cardId: input.cardId,
        createdAt: input.createdAt,
        fixtures: input.experienceQuality,
      })
    : null
  const scopeFuzz = input.scopeFuzzReport
    ?? (input.scopeFuzz
      ? await runMemoryScopeFuzzHarness(input.scopeFuzz)
      : null)

  if (input.dialogueReplay) {
    try {
      const replay = await input.dialogueReplay()
      dialogueReplay = replay.report ?? null
      liveProviderTrial = replay.liveProviderTrial ?? null
      workingMemory.push(...(replay.workingMemory ?? []))
      userTrials.push(...(replay.userTrials ?? []))
      recommendedNextActions.push(...(replay.recommendedNextActions ?? []))
      stages.push({
        stage: 'dialogue-replay',
        id: replay.id,
        passed: replay.passed,
        itemCount: replay.turnCount,
        error: replay.error ?? null,
      })
    }
    catch (error) {
      stages.push(failedReplayStage(errorMessageFrom(error) ?? String(error)))
      recommendedNextActions.push('修复 dialogue replay/provider 失败后再相信本次生产试用结果。')
    }
  }

  const quality = await runMemoryQualityHarnessSuite({
    createdAt: input.createdAt,
    longTerm: input.longTerm ?? [],
    workingMemory,
    userTrials,
    personaTraining: input.personaTraining ?? [],
  })
  const personaTrainingStageError = input.personaTrainingError
    ?? quality.personaTraining.find(result => result.trace.error)?.trace.error
    ?? null
  if (input.personaTrainingError) {
    recommendedNextActions.push('修复 Persona/LoRA 数据集快照读取失败后再相信本次生产试用结果。')
  }

  if (runtimeHealth) {
    const reindexJobPending = runtimeHealth.embedding.reindexJob
      ? ['queued', 'running', 'cancel_requested', 'failed'].includes(runtimeHealth.embedding.reindexJob.status)
      : false
    const healthFailures = [
      ...runtimeHealth.errors.map(() => 'runtime-health-query-error'),
      runtimeHealth.queue.failed > 0 ? 'memory-queue-failed-items' : null,
      runtimeHealth.queue.deadLettered > 0 ? 'memory-queue-dead-lettered-items' : null,
      runtimeHealth.recall.lastError ? 'memory-recall-error' : null,
      !runtimeHealth.embedding.providerConfigured ? 'embedding-provider-not-configured' : null,
      runtimeHealth.embedding.reindexRequired ? 'embedding-reindex-required' : null,
      runtimeHealth.embedding.indexMode === 'brute-force' ? 'embedding-index-brute-force' : null,
      runtimeHealth.embedding.degraded ? 'embedding-index-degraded' : null,
      !runtimeHealth.embedding.nativeIndexReady ? 'embedding-native-index-not-ready' : null,
      !runtimeHealth.embedding.searchReady ? 'embedding-search-not-ready' : null,
      runtimeHealth.embedding.lastError ? 'embedding-health-error' : null,
      runtimeHealth.embedding.missingCount > 0 ? 'embedding-missing-vectors' : null,
      runtimeHealth.embedding.textHashMismatchCount > 0 ? 'embedding-text-hash-mismatch' : null,
      runtimeHealth.embedding.staleOrFailedCount > 0 ? 'embedding-stale-or-failed' : null,
      runtimeHealth.embedding.orphanedCount > 0 ? 'embedding-orphaned-vectors' : null,
      runtimeHealth.embedding.coverageRatio !== null && runtimeHealth.embedding.coverageRatio < 0.999
        ? 'embedding-coverage-below-target'
        : null,
      reindexJobPending ? 'embedding-reindex-job-not-settled' : null,
    ].filter(Boolean) as string[]
    stages.push({
      stage: 'runtime-health',
      id: 'runtime-health',
      passed: healthFailures.length === 0,
      itemCount: 1,
      error: healthFailures[0] ?? null,
    })
    recommendedNextActions.push(...healthFailures.map(failure => `处理真实健康指标：${failure}。`))
    recommendedNextActions.push(...runtimeHealth.errors.map(error => `健康指标查询失败：${error}。`))
  }

  stages.push(
    stageFromQuality({
      stage: 'working-memory-compression',
      id: 'working-memory-compression',
      itemCount: quality.workingMemory.length,
      passed: quality.workingMemory.every(result => result.passed),
      error: quality.workingMemory.find(result => result.trace.error)?.trace.error ?? null,
    }),
    ...(compressedContextBehavior
      ? [
          stageFromQuality({
            stage: 'compressed-context-behavior',
            id: 'compressed-context-behavior',
            itemCount: compressedContextBehavior.summary.fixtureCount,
            passed: compressedContextBehavior.passed,
            error: compressedContextBehavior.summary.lastError,
          }),
        ]
      : []),
    stageFromQuality({
      stage: 'long-term-recall',
      id: 'long-term-recall',
      itemCount: quality.longTerm.length,
      passed: quality.longTerm.every(result => result.passed),
      error: quality.longTerm.find(result => result.trace.error)?.trace.error ?? null,
    }),
    ...(temporalConflict
      ? [
          stageFromQuality({
            stage: 'temporal-conflict',
            id: 'temporal-conflict',
            itemCount: temporalConflict.summary.fixtureCount,
            passed: temporalConflict.passed,
            error: temporalConflict.traces.find(trace => trace.error)?.error ?? null,
          }),
        ]
      : input.requireProductionStages
        ? [notRunStage(
            'temporal-conflict',
            input.productionStageErrors?.['temporal-conflict']
            ?? 'not-run: no expired, superseding, or tombstoned memory fixtures were available',
          )]
        : []),
    ...(semanticScaleSoak
      ? [
          stageFromQuality({
            stage: 'semantic-scale-soak',
            id: 'semantic-scale-soak',
            itemCount: semanticScaleSoak.summary.queryCount,
            passed: semanticScaleSoak.passed,
            error: semanticScaleSoak.summary.failingChecks[0] ?? null,
          }),
        ]
      : input.requireProductionStages
        ? [notRunStage(
            'semantic-scale-soak',
            input.productionStageErrors?.['semantic-scale-soak']
            ?? 'not-run: no completed semantic scale report is available',
          )]
        : []),
    ...(experienceQuality
      ? [
          stageFromQuality({
            stage: 'experience-quality',
            id: 'experience-quality',
            itemCount: experienceQuality.summary.fixtureCount,
            passed: experienceQuality.passed,
            error: experienceQuality.findings.find(item => item.severity === 'critical')?.message ?? null,
          }),
        ]
      : []),
    ...(scopeFuzz
      ? [
          stageFromQuality({
            stage: 'scope-fuzz',
            id: 'scope-fuzz',
            itemCount: scopeFuzz.caseCount,
            passed: scopeFuzz.passed,
            error: scopeFuzz.violations[0]?.error ?? scopeFuzz.violations[0]?.reasons.join(', ') ?? null,
          }),
        ]
      : input.requireProductionStages
        ? [notRunStage(
            'scope-fuzz',
            input.productionStageErrors?.['scope-fuzz']
            ?? 'not-run: isolated DB scope fuzz did not produce a report',
          )]
        : []),
    stageFromQuality({
      stage: 'persona-dataset-hygiene',
      id: 'persona-dataset-hygiene',
      itemCount: quality.personaTraining.length,
      passed: !personaTrainingStageError && quality.personaTraining.every(result => result.passed),
      error: personaTrainingStageError,
    }),
  )

  const failingStageIds = stages
    .filter(stage => !stage.passed && stage.status !== 'not-run')
    .map(stage => stage.id)
  const notRunStageIds = stages
    .filter(stage => stage.status === 'not-run')
    .map(stage => stage.id)
  recommendedNextActions.push(...stages
    .filter(stage => stage.status === 'not-run' && stage.error)
    .map(stage => `补齐生产质量阶段 ${stage.id}：${stage.error}。`))
  const mergedRecommendedActions = uniqueStrings([
    ...recommendedNextActions,
    ...quality.recommendedNextActions,
    ...(compressedContextBehavior?.recommendedNextActions ?? []),
    ...(temporalConflict?.recommendedNextActions ?? []),
    ...(semanticScaleSoak?.recommendedNextActions ?? []),
    ...(experienceQuality?.recommendedNextActions ?? []),
    ...(scopeFuzz?.recommendedActions ?? []),
  ])
  const lastStageError = [...stages].reverse().find(stage => stage.error)?.error ?? null
  const lastRuntimeHealthError = runtimeHealth?.errors.at(-1)
    ?? runtimeHealth?.recall.lastError
    ?? runtimeHealth?.embedding.lastError
    ?? null
  const queueTotal = runtimeHealth
    ? runtimeHealth.queue.pending
    + runtimeHealth.queue.review
    + runtimeHealth.queue.applied
    + runtimeHealth.queue.failed
    + runtimeHealth.queue.deadLettered
    : 0
  const regression: MemoryProductionTrialRegressionMetrics = {
    recallAt1: quality.summary.recallAt1,
    recallAt3: quality.summary.recallAt3,
    recallAt5: quality.summary.recallAt5,
    wrongThreadRate: quality.summary.wrongThreadRate,
    semanticHitRate: quality.summary.semanticHitRate,
    sourceTraceRate: quality.summary.sourceTraceRate,
    abstentionPrecision: quality.summary.abstentionPrecision,
    abstentionRecall: quality.summary.abstentionRecall,
    p50LatencyMs: quality.summary.p50LatencyMs,
    p95LatencyMs: quality.summary.p95LatencyMs,
    p99LatencyMs: quality.summary.p99LatencyMs,
    staleMemoryLeakRate: temporalConflict
      ? ratio(
          temporalConflict.summary.staleMemoryLeakCount,
          temporalConflict.summary.fixtureCount,
        )
      : null,
    temporalUpdateAccuracy: temporalConflict
      ? Number((1 - ratio(
          temporalConflict.summary.knowledgeUpdateMissCount,
          temporalConflict.summary.fixtureCount,
        )).toFixed(4))
      : null,
    providerFailureRate: liveProviderTrial
      ? liveProviderTrial.summary.providerFailureRate
      : dialogueReplay
        ? ratio(
            dialogueReplay.summary.failedTurnCount,
            dialogueReplay.summary.turnCount,
          )
        : 0,
    queueFailureRate: runtimeHealth
      ? ratio(
          runtimeHealth.queue.failed + runtimeHealth.queue.deadLettered,
          queueTotal,
        )
      : 0,
    deadLetterRate: runtimeHealth
      ? ratio(runtimeHealth.queue.deadLettered, queueTotal)
      : 0,
    embeddingCoverageRatio: runtimeHealth?.embedding.coverageRatio ?? null,
  }

  return {
    version: 'memory-production-trial-runner-v1',
    id: input.id,
    cardId: input.cardId,
    createdAt: input.createdAt,
    passed: failingStageIds.length === 0
      && notRunStageIds.length === 0
      && quality.passed
      && (compressedContextBehavior?.passed ?? true)
      && (temporalConflict?.passed ?? true)
      && (semanticScaleSoak?.passed ?? true)
      && (experienceQuality?.passed ?? true)
      && (scopeFuzz?.passed ?? true),
    summary: {
      dialogueReplayCount: input.dialogueReplay ? 1 : 0,
      workingMemoryFixtureCount: quality.summary.workingMemoryFixtureCount,
      compressedContextBehaviorFixtureCount: compressedContextBehavior?.summary.fixtureCount ?? 0,
      temporalConflictFixtureCount: temporalConflict?.summary.fixtureCount ?? 0,
      semanticScaleSoakRunCount: semanticScaleSoak ? 1 : 0,
      experienceQualityFixtureCount: experienceQuality?.summary.fixtureCount ?? 0,
      scopeFuzzCaseCount: scopeFuzz?.caseCount ?? 0,
      longTermFixtureCount: quality.summary.longTermFixtureCount,
      userTrialCount: quality.summary.userTrialCount,
      personaTrainingFixtureCount: quality.summary.personaTrainingFixtureCount,
      failingStageIds,
      notRunStageIds,
      optimizationFindingCount: quality.summary.optimizationFindingCount,
      recommendedActionCount: mergedRecommendedActions.length,
      lastError: quality.summary.lastError ?? lastRuntimeHealthError ?? lastStageError,
    },
    stages,
    dialogueReplay,
    liveProviderTrial,
    runtimeHealth,
    regression,
    quality,
    compressedContextBehavior,
    temporalConflict,
    semanticScaleSoak,
    experienceQuality,
    scopeFuzz,
    recommendedNextActions: mergedRecommendedActions,
  }
}

export function serializeMemoryProductionTrialReport(report: MemoryProductionTrialReport) {
  return JSON.stringify(report, null, 2)
}
