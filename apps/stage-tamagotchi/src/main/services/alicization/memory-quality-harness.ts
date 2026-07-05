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

import { errorMessageFrom } from '@moeru/std'

import { runWorkingMemoryQualityHarnessFixture } from './life-core/working-memory-quality-harness'

export interface DbBackedLongTermMemoryQualityFixture {
  id: string
  cardId: string
  query: string
  expectedTopIds: string[]
  forbiddenTopIds?: string[]
  blockedIds?: string[]
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
    failingFixtureIds: string[]
    recallAtK: number
    compressionLossCount: number
    blockedLeakCount: number
    lastError: string | null
  }
  longTerm: DbBackedLongTermMemoryQualityResult[]
  workingMemory: WorkingMemoryQualityResult[]
  traces: Array<LongTermMemoryHarnessTrace | WorkingMemoryQualityTrace>
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
  const idcg = Array.from({ length: idealHits }).reduce((sum, _item, index) => {
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

function metricFromBundle(input: {
  bundle: LongTermMemoryEvidenceBundle
  expectedTopIds: string[]
  forbiddenTopIds: string[]
  blockedIds: string[]
  latencyMs: number
}) {
  const topIds = input.bundle.evidence.map(item => item.candidate.id)
  const expectedSet = new Set(input.expectedTopIds)
  const forbiddenSet = new Set(input.forbiddenTopIds)
  const blockedSet = new Set(input.blockedIds)
  const hitCount = topIds.filter(id => expectedSet.has(id)).length
  const falseRecallCount = topIds.filter(id => forbiddenSet.has(id)).length
  const blockedLeakCount = topIds.filter(id => blockedSet.has(id)).length
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
    wrongThreadRate: 0,
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
      passed: evaluated.metrics.recallAtK > 0
        && evaluated.metrics.falseRecallRate === 0
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
}): Promise<MemoryQualityHarnessReport> {
  const longTerm: DbBackedLongTermMemoryQualityResult[] = []
  for (const fixture of input.longTerm)
    longTerm.push(await runDbBackedLongTermMemoryQualityFixture(fixture))
  const workingMemory = input.workingMemory.map(fixture => runWorkingMemoryQualityHarnessFixture({ fixture }))
  const failingFixtureIds = [
    ...longTerm.filter(result => !result.passed).map(result => result.fixtureId),
    ...workingMemory.filter(result => !result.passed).map(result => result.fixtureId),
  ]
  const traces = [
    ...longTerm.map(result => result.trace),
    ...workingMemory.map(result => result.trace),
  ]
  const lastError = [...traces].reverse().find(trace => trace.error)?.error ?? null

  return {
    version: 'memory-quality-harness-v1',
    passed: failingFixtureIds.length === 0,
    createdAt: input.createdAt,
    summary: {
      longTermFixtureCount: longTerm.length,
      workingMemoryFixtureCount: workingMemory.length,
      failingFixtureIds,
      recallAtK: longTerm.length === 0 ? 1 : longTerm.reduce((sum, result) => sum + result.metrics.recallAtK, 0) / longTerm.length,
      compressionLossCount: workingMemory.reduce((sum, result) => sum + result.metrics.compressionLossCount, 0),
      blockedLeakCount: longTerm.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0),
      lastError,
    },
    longTerm,
    workingMemory,
    traces,
  }
}
