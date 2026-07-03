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
  expectedMode?: LongTermMemoryEvidenceBundle['intent']['mode']
  limit?: number
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
  passed: boolean
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
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
    candidates: fixture.candidates,
    now: input.now,
    limit: fixture.limit ?? 5,
  })
  const topIds = bundle.evidence.map(item => item.candidate.id)
  const expectedSet = new Set(fixture.expectedTopIds)
  const forbiddenSet = new Set(fixture.forbiddenTopIds ?? [])
  const hitCount = topIds.filter(id => expectedSet.has(id)).length
  const falseRecallCount = topIds.filter(id => forbiddenSet.has(id)).length
  const firstExpectedIndex = topIds.findIndex(id => expectedSet.has(id))
  const tracedCount = bundle.evidence.filter(item => item.candidate.source && item.candidate.id).length
  const modePassed = fixture.expectedMode ? bundle.intent.mode === fixture.expectedMode : true
  const expectedPass = fixture.expectedTopIds.length === 0
    ? topIds.length === 0
    : hitCount > 0

  return {
    fixtureId: fixture.id,
    bundle,
    topIds,
    hitRate: fixture.expectedTopIds.length === 0 ? 1 : clamp01(hitCount / fixture.expectedTopIds.length),
    precisionAtK: topIds.length === 0 ? (fixture.expectedTopIds.length === 0 ? 1 : 0) : clamp01(hitCount / topIds.length),
    mrr: firstExpectedIndex >= 0 ? 1 / (firstExpectedIndex + 1) : 0,
    falseRecallCount,
    sourceTraceRate: bundle.evidence.length === 0 ? 1 : clamp01(tracedCount / bundle.evidence.length),
    passed: modePassed && expectedPass && falseRecallCount === 0,
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
    falseRecallCount: results.reduce((sum, result) => sum + result.falseRecallCount, 0),
  }
}
