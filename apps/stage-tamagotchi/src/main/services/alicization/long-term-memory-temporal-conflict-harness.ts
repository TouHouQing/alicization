import type {
  LongTermMemoryHarnessResult,
  LongTermMemoryHarnessSemanticState,
} from './long-term-memory-harness'
import type {
  LongTermMemoryEvidenceCandidate,
  LongTermMemoryTemporalFocus,
} from './long-term-memory-recall'

import { runLongTermMemoryHarnessFixture } from './long-term-memory-harness'

export type LongTermMemoryTemporalConflictScenario
  = | 'knowledge-update'
    | 'relative-time'
    | 'tombstone'

export interface LongTermMemoryTemporalConflictFixture {
  id: string
  scenario: LongTermMemoryTemporalConflictScenario
  currentUserText: string
  candidates: LongTermMemoryEvidenceCandidate[]
  expectedTopIds: string[]
  expectedTemporalFocus: LongTermMemoryTemporalFocus
  forbiddenTopIds?: string[]
  blockedIds?: string[]
  blockedPolicy?: 'pre-filter' | 'observe'
  semanticExpectedIds?: string[]
  semanticScores?: Record<string, number>
  semantic?: LongTermMemoryHarnessSemanticState
  limit?: number
  workingMemoryQueryHints?: string[]
  currentThreadTitle?: string | null
  activeTask?: string | null
}

export interface LongTermMemoryTemporalConflictMetrics {
  temporalFocusMismatchCount: number
  knowledgeUpdateMissCount: number
  staleMemoryLeakCount: number
  tombstoneLeakCount: number
  blockedLeakCount: number
}

export interface LongTermMemoryTemporalConflictTrace {
  id: string
  fixtureId: string
  owner: 'LongTermMemoryRecall'
  scenario: LongTermMemoryTemporalConflictScenario
  temporalFocus: LongTermMemoryTemporalFocus
  selectedIds: string[]
  forbiddenIds: string[]
  blockedIds: string[]
  rankReasonsById: Record<string, string[]>
  metrics: LongTermMemoryTemporalConflictMetrics
  error: string | null
  createdAt: number
}

export interface LongTermMemoryTemporalConflictResult {
  fixtureId: string
  result: LongTermMemoryHarnessResult
  metrics: LongTermMemoryTemporalConflictMetrics
  trace: LongTermMemoryTemporalConflictTrace
  passed: boolean
}

export interface LongTermMemoryTemporalConflictReport {
  version: 'long-term-memory-temporal-conflict-harness-v1'
  passed: boolean
  createdAt: number
  summary: {
    fixtureCount: number
    failingFixtureIds: string[]
    temporalFocusMismatchCount: number
    knowledgeUpdateMissCount: number
    staleMemoryLeakCount: number
    tombstoneLeakCount: number
    blockedLeakCount: number
  }
  results: LongTermMemoryTemporalConflictResult[]
  traces: LongTermMemoryTemporalConflictTrace[]
  recommendedNextActions: string[]
}

function runFixture(input: {
  fixture: LongTermMemoryTemporalConflictFixture
  now: number
}): LongTermMemoryTemporalConflictResult {
  const fixture = input.fixture
  const result = runLongTermMemoryHarnessFixture({
    now: input.now,
    fixture: {
      id: fixture.id,
      currentUserText: fixture.currentUserText,
      workingMemoryQueryHints: fixture.workingMemoryQueryHints,
      currentThreadTitle: fixture.currentThreadTitle,
      activeTask: fixture.activeTask,
      candidates: fixture.candidates,
      expectedTopIds: fixture.expectedTopIds,
      forbiddenTopIds: fixture.forbiddenTopIds,
      blockedIds: fixture.blockedIds,
      blockedPolicy: fixture.blockedPolicy,
      semanticExpectedIds: fixture.semanticExpectedIds,
      semanticScores: fixture.semanticScores,
      semantic: fixture.semantic,
      limit: fixture.limit,
    },
  })
  const selectedIds = result.topIds
  const selectedSet = new Set(selectedIds)
  const temporalFocusMismatchCount = result.bundle.intent.temporalFocus === fixture.expectedTemporalFocus ? 0 : 1
  const knowledgeUpdateMissCount = fixture.scenario === 'knowledge-update'
    && result.topIds[0] !== fixture.expectedTopIds[0]
    ? 1
    : 0
  const staleMemoryLeakCount = fixture.scenario === 'knowledge-update'
    ? (fixture.forbiddenTopIds ?? []).filter(id => selectedSet.has(id)).length
    : 0
  const tombstoneLeakCount = fixture.scenario === 'tombstone'
    ? (fixture.blockedIds ?? []).filter(id => selectedSet.has(id)).length
    : 0
  const metrics: LongTermMemoryTemporalConflictMetrics = {
    temporalFocusMismatchCount,
    knowledgeUpdateMissCount,
    staleMemoryLeakCount,
    tombstoneLeakCount,
    blockedLeakCount: result.metrics.blockedLeakCount,
  }
  const reasons = [
    temporalFocusMismatchCount > 0 ? `temporal-focus-mismatch:${result.bundle.intent.temporalFocus}` : null,
    knowledgeUpdateMissCount > 0 ? 'knowledge-update-current-winner-missed' : null,
    staleMemoryLeakCount > 0 ? `stale-memory-leak:${staleMemoryLeakCount}` : null,
    tombstoneLeakCount > 0 ? `tombstone-leak:${tombstoneLeakCount}` : null,
    !result.passed ? result.trace.error ?? 'long-term-recall-gate-failed' : null,
  ].filter(Boolean) as string[]
  const trace: LongTermMemoryTemporalConflictTrace = {
    id: `long-term-memory-temporal-conflict:${fixture.id}:${input.now}`,
    fixtureId: fixture.id,
    owner: 'LongTermMemoryRecall',
    scenario: fixture.scenario,
    temporalFocus: result.bundle.intent.temporalFocus,
    selectedIds,
    forbiddenIds: fixture.forbiddenTopIds ?? [],
    blockedIds: fixture.blockedIds ?? [],
    rankReasonsById: result.trace.rankReasonsById,
    metrics,
    error: reasons.length > 0 ? reasons.join(';') : null,
    createdAt: input.now,
  }

  return {
    fixtureId: fixture.id,
    result,
    metrics,
    trace,
    passed: reasons.length === 0,
  }
}

export function runLongTermMemoryTemporalConflictHarness(input: {
  fixtures: LongTermMemoryTemporalConflictFixture[]
  now: number
}): LongTermMemoryTemporalConflictReport {
  const results = input.fixtures.map(fixture => runFixture({
    fixture,
    now: input.now,
  }))
  const traces = results.map(result => result.trace)
  const summary = {
    fixtureCount: results.length,
    failingFixtureIds: results.filter(result => !result.passed).map(result => result.fixtureId),
    temporalFocusMismatchCount: results.reduce((sum, result) => sum + result.metrics.temporalFocusMismatchCount, 0),
    knowledgeUpdateMissCount: results.reduce((sum, result) => sum + result.metrics.knowledgeUpdateMissCount, 0),
    staleMemoryLeakCount: results.reduce((sum, result) => sum + result.metrics.staleMemoryLeakCount, 0),
    tombstoneLeakCount: results.reduce((sum, result) => sum + result.metrics.tombstoneLeakCount, 0),
    blockedLeakCount: results.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0),
  }
  const recommendedNextActions = [
    summary.temporalFocusMismatchCount > 0
      ? '检查相对时间词解析和 LongTermMemoryRecall 的 temporal ranking。'
      : null,
    summary.knowledgeUpdateMissCount > 0 || summary.staleMemoryLeakCount > 0
      ? '检查 later correction、updatedAt/occurredAt 和旧事实 tombstone 的冲突解决。'
      : null,
    summary.tombstoneLeakCount > 0 || summary.blockedLeakCount > 0
      ? '检查 tombstone/revoke 删除与 vector index 过滤是否一致。'
      : null,
  ].filter(Boolean) as string[]

  return {
    version: 'long-term-memory-temporal-conflict-harness-v1',
    passed: summary.failingFixtureIds.length === 0,
    createdAt: input.now,
    summary,
    results,
    traces,
    recommendedNextActions,
  }
}
