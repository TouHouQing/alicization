import type {
  WorkingMemoryQualityFixture,
  WorkingMemoryQualityResult,
  WorkingMemoryQualityTrace,
} from './life-core/working-memory-quality-harness'
import type {
  LongTermMemoryHarnessMetrics,
  LongTermMemoryHarnessSemanticState,
  LongTermMemoryHarnessTrace,
} from './long-term-memory-harness'
import type {
  LongTermMemoryEvidenceBundle,
  LongTermMemoryQueryPlan,
  LongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import type {
  MemoryUserTrialFinding,
  MemoryUserTrialResult,
} from './memory-user-trial-harness'
import type {
  PersonaTrainingDatasetQualityFinding,
  PersonaTrainingDatasetQualityFixture,
  PersonaTrainingDatasetQualityResult,
  PersonaTrainingDatasetQualityTrace,
} from './persona-training-dataset-quality-harness'

import { errorMessageFrom } from '@moeru/std'

import { runWorkingMemoryQualityHarnessFixture } from './life-core/working-memory-quality-harness'
import { runMemoryUserTrialHarness } from './memory-user-trial-harness'
import { runPersonaTrainingDatasetQualityHarnessFixture } from './persona-training-dataset-quality-harness'

export interface DbBackedLongTermMemoryQualityFixture {
  id: string
  cardId: string
  query: string
  expectedTopIds: string[]
  forbiddenTopIds?: string[]
  blockedIds?: string[]
  wrongThreadIds?: string[]
  limit?: number
  semantic?: LongTermMemoryHarnessSemanticState
}

export interface DbBackedLongTermMemoryQualityInput {
  fixture: DbBackedLongTermMemoryQualityFixture
  recall: (input: {
    cardId: string
    currentUserText: string
    limit: number
  }) => Promise<LongTermMemoryEvidenceBundle>
  now: () => number
}

export interface DbBackedLongTermMemoryQualityResult {
  fixtureId: string
  bundle: LongTermMemoryEvidenceBundle
  topIds: string[]
  metrics: LongTermMemoryHarnessMetrics
  trace: LongTermMemoryHarnessTrace
  passed: boolean
}

export interface MemoryQualityHarnessReport {
  version: 'memory-quality-harness-v1'
  passed: boolean
  createdAt: number
  summary: {
    longTermFixtureCount: number
    workingMemoryFixtureCount: number
    userTrialCount: number
    personaTrainingFixtureCount: number
    failingFixtureIds: string[]
    recallAtK: number
    compressionLossCount: number
    blockedLeakCount: number
    optimizationFindingCount: number
    lastError: string | null
  }
  longTerm: DbBackedLongTermMemoryQualityResult[]
  workingMemory: WorkingMemoryQualityResult[]
  userTrials: MemoryUserTrialResult[]
  personaTraining: PersonaTrainingDatasetQualityResult[]
  optimizationFindings: Array<MemoryUserTrialFinding | PersonaTrainingDatasetQualityFinding>
  recommendedNextActions: string[]
  traces: Array<LongTermMemoryHarnessTrace | WorkingMemoryQualityTrace | PersonaTrainingDatasetQualityTrace>
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function binaryNdcgAtK(topIds: string[], expectedIds: string[]) {
  if (expectedIds.length === 0)
    return topIds.length === 0 ? 1 : 0
  const expectedSet = new Set(expectedIds)
  const dcg = topIds.reduce((sum, id, index) => {
    const relevance = expectedSet.has(id) ? 1 : 0
    return sum + relevance / Math.log2(index + 2)
  }, 0)
  const idealHits = Math.min(expectedIds.length, topIds.length)
  const idcg = Array.from({ length: idealHits }).reduce<number>((sum, _item, index) => {
    return sum + 1 / Math.log2(index + 2)
  }, 0)
  return idcg > 0 ? clamp01(dcg / idcg) : 0
}

function defaultSemanticState(): LongTermMemoryHarnessSemanticState {
  return {
    available: false,
    providerId: null,
    modelId: null,
    dimensions: null,
    reindexRequired: false,
  }
}

function averageQualityMetric(values: number[], emptyValue = 1) {
  return values.length === 0
    ? emptyValue
    : values.reduce((sum, value) => sum + value, 0) / values.length
}

function metricFromBundle(input: {
  bundle: LongTermMemoryEvidenceBundle
  expectedTopIds: string[]
  forbiddenTopIds: string[]
  blockedIds: string[]
  wrongThreadIds: string[]
  latencyMs: number
}) {
  const topIds = input.bundle.evidence.map(item => item.candidate.id)
  const expectedSet = new Set(input.expectedTopIds)
  const forbiddenSet = new Set(input.forbiddenTopIds)
  const blockedSet = new Set(input.blockedIds)
  const hitCount = topIds.filter(id => expectedSet.has(id)).length
  const falseRecallCount = topIds.filter(id => forbiddenSet.has(id)).length
  const blockedLeakCount = topIds.filter(id => blockedSet.has(id)).length
  const wrongThreadSet = new Set(input.wrongThreadIds)
  const wrongThreadCount = topIds.filter(id => wrongThreadSet.has(id)).length
  const firstExpectedIndex = topIds.findIndex(id => expectedSet.has(id))
  const tracedCount = input.bundle.evidence.filter(item => item.candidate.id && item.candidate.source).length
  const semanticHitCount = input.bundle.evidence.filter(item =>
    expectedSet.has(item.candidate.id)
    && item.rankReasons.some(reason => reason.startsWith('rrf:semantic')),
  ).length
  const metrics: LongTermMemoryHarnessMetrics = {
    recallAtK: input.expectedTopIds.length === 0 ? 1 : clamp01(hitCount / input.expectedTopIds.length),
    precisionAtK: topIds.length === 0 ? (input.expectedTopIds.length === 0 ? 1 : 0) : clamp01(hitCount / topIds.length),
    mrr: firstExpectedIndex >= 0 ? 1 / (firstExpectedIndex + 1) : 0,
    ndcg: binaryNdcgAtK(topIds, input.expectedTopIds),
    falseRecallRate: topIds.length === 0 ? 0 : clamp01(falseRecallCount / topIds.length),
    wrongThreadRate: topIds.length === 0 ? 0 : clamp01(wrongThreadCount / topIds.length),
    blockedLeakCount,
    semanticHitRate: input.expectedTopIds.length === 0 ? 1 : clamp01(semanticHitCount / input.expectedTopIds.length),
    sourceTraceRate: input.bundle.evidence.length === 0 ? 1 : clamp01(tracedCount / input.bundle.evidence.length),
    latencyMs: input.latencyMs,
  }
  return { metrics, topIds }
}

function emptyFailureIntent(query: string): LongTermMemoryRecallIntent {
  return {
    mode: 'none',
    shouldRecall: false,
    confidence: 0,
    rationale: 'quality-harness-recall-failed',
    temporalFocus: 'unspecified',
    targetKinds: [],
    queryHints: [query].filter(Boolean),
    riskFlags: ['quality-harness-recall-failed'],
  }
}

function emptyFailurePlan(query: string): LongTermMemoryQueryPlan {
  return {
    rawQuery: query,
    normalizedQuery: query,
    keywordQueries: [],
    phraseQueries: [],
    charGramQueries: [],
    semanticQueries: [],
    episodicQueries: [],
    temporalHints: [],
    entityHints: [],
    procedureHints: [],
    threadHints: [],
    negativeCues: [],
    confidencePolicy: 'direct',
    riskFlags: ['quality-harness-recall-failed'],
    targetKinds: [],
  }
}

function buildFailureBundle(query: string): LongTermMemoryEvidenceBundle {
  return {
    intent: emptyFailureIntent(query),
    plan: emptyFailurePlan(query),
    evidence: [],
    confidence: 0,
    budgetClass: 'none',
  }
}

function buildTrace(input: {
  fixture: DbBackedLongTermMemoryQualityFixture
  bundle: LongTermMemoryEvidenceBundle
  topIds: string[]
  metrics: LongTermMemoryHarnessMetrics
  startedAt: number
  error: string | null
}) {
  const selectedSet = new Set(input.topIds)
  return {
    id: `db-backed-memory-quality:${input.fixture.id}:${input.startedAt}`,
    fixtureId: input.fixture.id,
    owner: 'LongTermMemoryRecall',
    query: input.fixture.query,
    intentMode: input.bundle.intent.mode,
    queryPlan: {
      lexicalQueries: input.bundle.plan.keywordQueries,
      phraseQueries: input.bundle.plan.phraseQueries,
      semanticQueries: input.bundle.plan.semanticQueries,
      threadHints: input.bundle.plan.threadHints,
    },
    selectedIds: input.topIds,
    rejectedIds: input.bundle.evidence.map(item => item.candidate.id).filter(id => !selectedSet.has(id)),
    forbiddenIds: input.fixture.forbiddenTopIds ?? [],
    rankReasonsById: Object.fromEntries(input.bundle.evidence.map(item => [item.candidate.id, item.rankReasons])),
    semantic: input.fixture.semantic ?? defaultSemanticState(),
    metrics: input.metrics,
    error: input.error,
    createdAt: input.startedAt,
  } satisfies LongTermMemoryHarnessTrace
}

export async function runDbBackedLongTermMemoryQualityFixture(input: DbBackedLongTermMemoryQualityInput): Promise<DbBackedLongTermMemoryQualityResult> {
  const startedAt = input.now()
  try {
    const bundle = await input.recall({
      cardId: input.fixture.cardId,
      currentUserText: input.fixture.query,
      limit: input.fixture.limit ?? 5,
    })
    const latencyMs = Math.max(0, input.now() - startedAt)
    const evaluated = metricFromBundle({
      bundle,
      expectedTopIds: input.fixture.expectedTopIds,
      forbiddenTopIds: input.fixture.forbiddenTopIds ?? [],
      blockedIds: input.fixture.blockedIds ?? [],
      wrongThreadIds: input.fixture.wrongThreadIds ?? [],
      latencyMs,
    })
    const trace = buildTrace({
      fixture: input.fixture,
      bundle,
      topIds: evaluated.topIds,
      metrics: evaluated.metrics,
      startedAt,
      error: null,
    })

    return {
      fixtureId: input.fixture.id,
      bundle,
      topIds: evaluated.topIds,
      metrics: evaluated.metrics,
      trace,
      passed: evaluated.metrics.recallAtK === 1
        && evaluated.metrics.falseRecallRate === 0
        && evaluated.metrics.wrongThreadRate === 0
        && evaluated.metrics.blockedLeakCount === 0,
    }
  }
  catch (error) {
    const latencyMs = Math.max(0, input.now() - startedAt)
    const message = errorMessageFrom(error) ?? String(error)
    const bundle = buildFailureBundle(input.fixture.query)
    const metrics: LongTermMemoryHarnessMetrics = {
      recallAtK: 0,
      precisionAtK: 0,
      mrr: 0,
      ndcg: 0,
      falseRecallRate: 0,
      wrongThreadRate: 0,
      blockedLeakCount: 0,
      semanticHitRate: 0,
      sourceTraceRate: 1,
      latencyMs,
    }
    return {
      fixtureId: input.fixture.id,
      bundle,
      topIds: [],
      metrics,
      trace: buildTrace({
        fixture: input.fixture,
        bundle,
        topIds: [],
        metrics,
        startedAt,
        error: message,
      }),
      passed: false,
    }
  }
}

export async function runMemoryQualityHarnessSuite(input: {
  createdAt: number
  longTerm: DbBackedLongTermMemoryQualityInput[]
  workingMemory: WorkingMemoryQualityFixture[]
  userTrials?: Parameters<typeof runMemoryUserTrialHarness>[0][]
  personaTraining?: PersonaTrainingDatasetQualityFixture[]
}): Promise<MemoryQualityHarnessReport> {
  const longTerm: DbBackedLongTermMemoryQualityResult[] = []
  for (const fixture of input.longTerm)
    longTerm.push(await runDbBackedLongTermMemoryQualityFixture(fixture))
  const workingMemory = input.workingMemory.map(fixture => runWorkingMemoryQualityHarnessFixture({ fixture }))
  const userTrials = (input.userTrials ?? []).map(trial => runMemoryUserTrialHarness(trial))
  const personaTraining = (input.personaTraining ?? []).map(fixture =>
    runPersonaTrainingDatasetQualityHarnessFixture({ fixture }),
  )
  const optimizationFindings = [
    ...userTrials.flatMap(result => result.findings),
    ...personaTraining.flatMap(result => result.findings),
  ]
  const recommendedNextActions = [...new Set([
    ...userTrials.flatMap(result => result.recommendedNextActions),
    ...personaTraining.flatMap(result => result.recommendedNextActions),
  ])]
  const userTrialTraces = userTrials.flatMap(result => [
    ...result.longTerm.map(item => item.trace),
    ...result.workingMemory.map(item => item.trace),
  ])
  const failingFixtureIds = [
    ...longTerm.filter(result => !result.passed).map(result => result.fixtureId),
    ...workingMemory.filter(result => !result.passed).map(result => result.fixtureId),
    ...userTrials.filter(result => !result.passed).map(result => result.id),
    ...personaTraining.filter(result => !result.passed).map(result => result.fixtureId),
  ]
  const traces = [
    ...longTerm.map(result => result.trace),
    ...workingMemory.map(result => result.trace),
    ...userTrialTraces,
    ...personaTraining.map(result => result.trace),
  ]
  const lastError = [...traces].reverse().find(trace => trace.error)?.error ?? null
  const recallAtKScores = [
    ...longTerm.map(result => result.metrics.recallAtK),
    ...userTrials.map(result => result.metrics.recallAtK),
  ]

  return {
    version: 'memory-quality-harness-v1',
    passed: failingFixtureIds.length === 0,
    createdAt: input.createdAt,
    summary: {
      longTermFixtureCount: longTerm.length,
      workingMemoryFixtureCount: workingMemory.length,
      userTrialCount: userTrials.length,
      personaTrainingFixtureCount: personaTraining.length,
      failingFixtureIds,
      recallAtK: averageQualityMetric(recallAtKScores),
      compressionLossCount: workingMemory.reduce((sum, result) => sum + result.metrics.compressionLossCount, 0)
        + userTrials.reduce((sum, result) => sum + result.metrics.compressionLossCount, 0),
      blockedLeakCount: longTerm.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0)
        + userTrials.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0),
      optimizationFindingCount: optimizationFindings.length,
      lastError,
    },
    longTerm,
    workingMemory,
    userTrials,
    personaTraining,
    optimizationFindings,
    recommendedNextActions,
    traces,
  }
}
