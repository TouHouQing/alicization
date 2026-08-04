import type {
  LongTermMemoryEvidenceBundle,
  LongTermMemoryEvidenceCandidate,
} from './long-term-memory-recall'

import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'

export interface LongTermMemoryHarnessFixture {
  id: string
  currentUserText: string
  workingMemoryQueryHints?: string[]
  currentThreadTitle?: string | null
  activeTask?: string | null
  candidates: LongTermMemoryEvidenceCandidate[]
  expectedTopIds: string[]
  forbiddenTopIds?: string[]
  blockedIds?: string[]
  blockedPolicy?: 'pre-filter' | 'observe'
  wrongThreadIds?: string[]
  semanticExpectedIds?: string[]
  semanticScores?: Record<string, number>
  semantic?: LongTermMemoryHarnessSemanticState
  latencyMs?: number
  expectedMode?: LongTermMemoryEvidenceBundle['intent']['mode']
  limit?: number
}

export interface LongTermMemoryHarnessSemanticState {
  available: boolean
  providerId: string | null
  modelId: string | null
  dimensions: number | null
  reindexRequired: boolean
}

export interface LongTermMemoryHarnessMetrics {
  recallAtK: number
  precisionAtK: number
  mrr: number
  ndcg: number
  falseRecallRate: number
  wrongThreadRate: number
  blockedLeakCount: number
  semanticHitRate: number
  sourceTraceRate: number
  latencyMs: number
}

export interface LongTermMemoryHarnessTrace {
  id: string
  fixtureId: string
  owner: 'LongTermMemoryRecall'
  query: string
  intentMode: LongTermMemoryEvidenceBundle['intent']['mode'] | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: LongTermMemoryHarnessSemanticState
  metrics: LongTermMemoryHarnessMetrics
  error: string | null
  createdAt: number
}

export interface LongTermMemoryHarnessResult {
  fixtureId: string
  bundle: LongTermMemoryEvidenceBundle
  topIds: string[]
  hitRate: number
  precisionAtK: number
  mrr: number
  falseRecallCount: number
  sourceTraceRate: number
  metrics: LongTermMemoryHarnessMetrics
  trace: LongTermMemoryHarnessTrace
  passed: boolean
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

export function runLongTermMemoryHarnessFixture(input: {
  fixture: LongTermMemoryHarnessFixture
  now: number
}): LongTermMemoryHarnessResult {
  const fixture = input.fixture
  const intent = deriveLongTermMemoryRecallIntent({
    currentUserText: fixture.currentUserText,
    workingMemoryQueryHints: fixture.workingMemoryQueryHints,
    currentThreadTitle: fixture.currentThreadTitle,
    activeTask: fixture.activeTask,
  })
  const plan = buildLongTermMemoryQueryPlan({
    intent,
    currentUserText: fixture.currentUserText,
    workingMemoryQueryHints: fixture.workingMemoryQueryHints,
    currentThreadTitle: fixture.currentThreadTitle,
    activeTask: fixture.activeTask,
  })
  const bundle = buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    candidates: fixture.blockedPolicy === 'observe'
      ? fixture.candidates
      : fixture.candidates.filter(candidate => !(fixture.blockedIds ?? []).includes(candidate.id)),
    now: input.now,
    limit: fixture.limit ?? 5,
    semanticScores: fixture.semanticScores,
  })
  const topIds = bundle.evidence.map(item => item.candidate.id)
  const expectedSet = new Set(fixture.expectedTopIds)
  const forbiddenSet = new Set(fixture.forbiddenTopIds ?? [])
  const selectedSet = new Set(topIds)
  const hitCount = topIds.filter(id => expectedSet.has(id)).length
  const falseRecallCount = topIds.filter(id => forbiddenSet.has(id)).length
  const firstExpectedIndex = topIds.findIndex(id => expectedSet.has(id))
  const tracedCount = bundle.evidence.filter(item => item.candidate.source && item.candidate.id).length
  const modePassed = fixture.expectedMode ? bundle.intent.mode === fixture.expectedMode : true
  const expectedPass = fixture.expectedTopIds.length === 0
    ? topIds.length === 0
    : hitCount >= fixture.expectedTopIds.length
  const blockedLeakCount = (fixture.blockedIds ?? []).filter(id => selectedSet.has(id)).length
  const wrongThreadCount = (fixture.wrongThreadIds ?? []).filter(id => selectedSet.has(id)).length
  const semanticExpectedIds = fixture.semanticExpectedIds ?? []
  const evidenceById = new Map(bundle.evidence.map(item => [item.candidate.id, item]))
  const semanticHitCount = semanticExpectedIds.filter(id =>
    selectedSet.has(id)
    && evidenceById.get(id)?.rankReasons.some(reason => reason.startsWith('rrf:semantic')) === true,
  ).length
  const metrics: LongTermMemoryHarnessMetrics = {
    recallAtK: fixture.expectedTopIds.length === 0 ? 1 : clamp01(hitCount / fixture.expectedTopIds.length),
    precisionAtK: topIds.length === 0 ? (fixture.expectedTopIds.length === 0 ? 1 : 0) : clamp01(hitCount / topIds.length),
    mrr: firstExpectedIndex >= 0 ? 1 / (firstExpectedIndex + 1) : 0,
    ndcg: binaryNdcgAtK(topIds, fixture.expectedTopIds),
    falseRecallRate: topIds.length === 0 ? 0 : clamp01(falseRecallCount / topIds.length),
    wrongThreadRate: topIds.length === 0 ? 0 : clamp01(wrongThreadCount / topIds.length),
    blockedLeakCount,
    semanticHitRate: semanticExpectedIds.length === 0 ? 1 : clamp01(semanticHitCount / semanticExpectedIds.length),
    sourceTraceRate: bundle.evidence.length === 0 ? 1 : clamp01(tracedCount / bundle.evidence.length),
    latencyMs: Math.max(0, Math.floor(fixture.latencyMs ?? 0)),
  }
  const trace: LongTermMemoryHarnessTrace = {
    id: `long-term-memory-harness:${fixture.id}:${input.now}`,
    fixtureId: fixture.id,
    owner: 'LongTermMemoryRecall',
    query: fixture.currentUserText,
    intentMode: bundle.intent.mode,
    queryPlan: {
      lexicalQueries: bundle.plan.keywordQueries,
      phraseQueries: bundle.plan.phraseQueries,
      semanticQueries: bundle.plan.semanticQueries,
      threadHints: bundle.plan.threadHints,
    },
    selectedIds: topIds,
    rejectedIds: fixture.candidates.map(candidate => candidate.id).filter(id => !selectedSet.has(id)),
    forbiddenIds: fixture.forbiddenTopIds ?? [],
    rankReasonsById: Object.fromEntries(bundle.evidence.map(item => [item.candidate.id, item.rankReasons])),
    semantic: fixture.semantic ?? defaultSemanticState(),
    metrics,
    error: null,
    createdAt: input.now,
  }
  const semanticPass = semanticExpectedIds.length === 0
    || (trace.semantic.available === true && metrics.semanticHitRate === 1)

  return {
    fixtureId: fixture.id,
    bundle,
    topIds,
    hitRate: metrics.recallAtK,
    precisionAtK: metrics.precisionAtK,
    mrr: metrics.mrr,
    falseRecallCount,
    sourceTraceRate: metrics.sourceTraceRate,
    metrics,
    trace,
    passed: modePassed
      && expectedPass
      && falseRecallCount === 0
      && blockedLeakCount === 0
      && wrongThreadCount === 0
      && semanticPass,
  }
}

export function runLongTermMemoryHarnessSuite(input: {
  fixtures: LongTermMemoryHarnessFixture[]
  now: number
}) {
  const results = input.fixtures.map(fixture => runLongTermMemoryHarnessFixture({
    fixture,
    now: input.now,
  }))
  return {
    results,
    passed: results.every(result => result.passed),
    averageHitRate: results.length === 0 ? 1 : results.reduce((sum, result) => sum + result.hitRate, 0) / results.length,
    averagePrecisionAtK: results.length === 0 ? 1 : results.reduce((sum, result) => sum + result.precisionAtK, 0) / results.length,
    averageMrr: results.length === 0 ? 1 : results.reduce((sum, result) => sum + result.mrr, 0) / results.length,
    averageNdcg: results.length === 0 ? 1 : results.reduce((sum, result) => sum + result.metrics.ndcg, 0) / results.length,
    falseRecallCount: results.reduce((sum, result) => sum + result.falseRecallCount, 0),
    blockedLeakCount: results.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0),
    semanticHitRate: results.length === 0 ? 1 : results.reduce((sum, result) => sum + result.metrics.semanticHitRate, 0) / results.length,
    traces: results.map(result => result.trace),
  }
}
