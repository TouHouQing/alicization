import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type {
  LongTermMemoryHarnessResult,
  LongTermMemoryHarnessSemanticState,
} from './long-term-memory-harness'
import type { LongTermMemoryEvidenceCandidate } from './long-term-memory-recall'

import { compressWorkingMemorySnapshot } from './life-core/working-memory-compressor'
import { buildWorkingMemoryQualityView } from './life-core/working-memory-quality-view'
import { runLongTermMemoryHarnessFixture } from './long-term-memory-harness'

export interface WorkingMemoryCompressionBehaviorFixture {
  id: string
  snapshot: WorkingMemorySnapshot
  nextUserText: string
  candidates: LongTermMemoryEvidenceCandidate[]
  expectedTopIds: string[]
  maxRawTurns?: number
  expectedCommitmentIncludes?: string[]
  expectedCorrectionIncludes?: string[]
  expectedFailureTurnIds?: string[]
  forbiddenTopIds?: string[]
  semanticExpectedIds?: string[]
  semanticScores?: Record<string, number>
  semantic?: LongTermMemoryHarnessSemanticState
  limit?: number
  requireCompressionInfluence?: boolean
}

export interface WorkingMemoryCompressionBehaviorMetrics {
  compressionChangedRecall: boolean
  lostCommitments: string[]
  lostCorrections: string[]
  lostFailureTurnIds: string[]
  recallDelta: {
    recallAtK: number
    precisionAtK: number
    mrr: number
  }
}

export interface WorkingMemoryCompressionBehaviorTrace {
  id: string
  fixtureId: string
  owner: 'WorkingMemory'
  recallOwner: 'LongTermMemoryRecall'
  query: string
  compressedQueryHints: string[]
  baselineSelectedIds: string[]
  compressedSelectedIds: string[]
  lostCommitments: string[]
  lostCorrections: string[]
  lostFailureTurnIds: string[]
  rankReasonsById: Record<string, string[]>
  metrics: WorkingMemoryCompressionBehaviorMetrics
  error: string | null
  createdAt: number
}

export interface WorkingMemoryCompressionBehaviorResult {
  fixtureId: string
  compressedSnapshot: WorkingMemorySnapshot
  baseline: LongTermMemoryHarnessResult
  compressed: LongTermMemoryHarnessResult
  metrics: WorkingMemoryCompressionBehaviorMetrics
  trace: WorkingMemoryCompressionBehaviorTrace
  passed: boolean
}

export interface WorkingMemoryCompressionBehaviorReport {
  version: 'working-memory-compression-behavior-harness-v1'
  passed: boolean
  createdAt: number
  summary: {
    fixtureCount: number
    failingFixtureIds: string[]
    changedRecallCount: number
    lostCommitmentCount: number
    lostCorrectionCount: number
    lostFailureTurnCount: number
    lastError: string | null
  }
  results: WorkingMemoryCompressionBehaviorResult[]
  traces: WorkingMemoryCompressionBehaviorTrace[]
  recommendedNextActions: string[]
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 12, maxChars = 180) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function includesAllFragments(text: string, fragments: string[]) {
  return fragments.filter(fragment => !text.includes(fragment))
}

function buildCompressedRecallHints(snapshot: WorkingMemorySnapshot) {
  const view = buildWorkingMemoryQualityView(snapshot)
  return uniqueTexts([
    ...view.modules.memoryQueryHints,
    view.modules.thread.title,
    view.modules.task.summary,
    ...view.modules.commitments,
    ...view.modules.corrections.map(item => item.text),
    ...view.modules.compressedTimeline.map(item => item.summary),
    ...view.modules.audit.notes,
  ], 16, 180)
}

function resultIdsChanged(left: string[], right: string[]) {
  if (left.length !== right.length)
    return true
  return left.some((id, index) => id !== right[index])
}

function runRecallPair(input: {
  fixture: WorkingMemoryCompressionBehaviorFixture
  compressedSnapshot: WorkingMemorySnapshot
  compressedQueryHints: string[]
  now: number
}) {
  const baseline = runLongTermMemoryHarnessFixture({
    now: input.now,
    fixture: {
      id: `${input.fixture.id}:baseline`,
      currentUserText: input.fixture.nextUserText,
      candidates: input.fixture.candidates,
      expectedTopIds: input.fixture.expectedTopIds,
      forbiddenTopIds: input.fixture.forbiddenTopIds,
      limit: input.fixture.limit,
      semanticScores: input.fixture.semanticScores,
      semantic: input.fixture.semantic,
    },
  })
  const compressed = runLongTermMemoryHarnessFixture({
    now: input.now,
    fixture: {
      id: `${input.fixture.id}:compressed`,
      currentUserText: input.fixture.nextUserText,
      workingMemoryQueryHints: input.compressedQueryHints,
      currentThreadTitle: input.compressedSnapshot.currentThread?.title ?? null,
      activeTask: input.compressedSnapshot.activeTask?.summary ?? null,
      candidates: input.fixture.candidates,
      expectedTopIds: input.fixture.expectedTopIds,
      forbiddenTopIds: input.fixture.forbiddenTopIds,
      semanticExpectedIds: input.fixture.semanticExpectedIds,
      limit: input.fixture.limit,
      semanticScores: input.fixture.semanticScores,
      semantic: input.fixture.semantic,
    },
  })
  return { baseline, compressed }
}

function runFixture(input: {
  fixture: WorkingMemoryCompressionBehaviorFixture
  now: number
}): WorkingMemoryCompressionBehaviorResult {
  const fixture = input.fixture
  const compressedSnapshot = compressWorkingMemorySnapshot(fixture.snapshot, {
    now: input.now,
    maxRawTurns: fixture.maxRawTurns,
  })
  const compressedQueryHints = buildCompressedRecallHints(compressedSnapshot)
  const { baseline, compressed } = runRecallPair({
    fixture,
    compressedSnapshot,
    compressedQueryHints,
    now: input.now,
  })
  const view = buildWorkingMemoryQualityView(compressedSnapshot)
  const commitmentText = view.modules.commitments.join('\n')
  const correctionText = view.modules.corrections.map(item => item.text).join('\n')
  const lostCommitments = includesAllFragments(commitmentText, fixture.expectedCommitmentIncludes ?? [])
  const lostCorrections = includesAllFragments(correctionText, fixture.expectedCorrectionIncludes ?? [])
  const failureIds = new Set(view.modules.audit.failureTurnIds)
  const lostFailureTurnIds = (fixture.expectedFailureTurnIds ?? []).filter(id => !failureIds.has(id))
  const compressionChangedRecall = resultIdsChanged(baseline.topIds, compressed.topIds)
  const metrics: WorkingMemoryCompressionBehaviorMetrics = {
    compressionChangedRecall,
    lostCommitments,
    lostCorrections,
    lostFailureTurnIds,
    recallDelta: {
      recallAtK: Number((compressed.metrics.recallAtK - baseline.metrics.recallAtK).toFixed(4)),
      precisionAtK: Number((compressed.metrics.precisionAtK - baseline.metrics.precisionAtK).toFixed(4)),
      mrr: Number((compressed.metrics.mrr - baseline.metrics.mrr).toFixed(4)),
    },
  }
  const requireCompressionInfluence = fixture.requireCompressionInfluence !== false && fixture.expectedTopIds.length > 0
  const missingReasons = [
    !compressed.passed ? 'compressed-recall-failed' : null,
    requireCompressionInfluence && !compressionChangedRecall ? 'compression-did-not-change-recall' : null,
    ...lostCommitments.map(item => `lost-commitment:${item}`),
    ...lostCorrections.map(item => `lost-correction:${item}`),
    ...lostFailureTurnIds.map(item => `lost-failure-turn:${item}`),
  ].filter(Boolean) as string[]
  const trace: WorkingMemoryCompressionBehaviorTrace = {
    id: `working-memory-compression-behavior:${fixture.id}:${input.now}`,
    fixtureId: fixture.id,
    owner: 'WorkingMemory',
    recallOwner: 'LongTermMemoryRecall',
    query: fixture.nextUserText,
    compressedQueryHints,
    baselineSelectedIds: baseline.topIds,
    compressedSelectedIds: compressed.topIds,
    lostCommitments,
    lostCorrections,
    lostFailureTurnIds,
    rankReasonsById: compressed.trace.rankReasonsById,
    metrics,
    error: missingReasons.length > 0 ? missingReasons.join(';') : null,
    createdAt: input.now,
  }

  return {
    fixtureId: fixture.id,
    compressedSnapshot,
    baseline,
    compressed,
    metrics,
    trace,
    passed: missingReasons.length === 0,
  }
}

export function runWorkingMemoryCompressionBehaviorHarness(input: {
  fixtures: WorkingMemoryCompressionBehaviorFixture[]
  now: number
}): WorkingMemoryCompressionBehaviorReport {
  const results = input.fixtures.map(fixture => runFixture({
    fixture,
    now: input.now,
  }))
  const traces = results.map(result => result.trace)
  const failingFixtureIds = results.filter(result => !result.passed).map(result => result.fixtureId)
  const lostCommitmentCount = results.reduce((sum, result) => sum + result.metrics.lostCommitments.length, 0)
  const lostCorrectionCount = results.reduce((sum, result) => sum + result.metrics.lostCorrections.length, 0)
  const lostFailureTurnCount = results.reduce((sum, result) => sum + result.metrics.lostFailureTurnIds.length, 0)
  const recommendedNextActions = [
    lostCommitmentCount > 0 || lostCorrectionCount > 0
      ? '检查 WorkingMemory 压缩视图是否把承诺和用户纠正继续注入下一轮对话主链路。'
      : null,
    lostFailureTurnCount > 0
      ? '检查失败面透明审计字段，确保 timeout/provider/tool 失败不会在压缩后丢失。'
      : null,
    results.some(result => !result.metrics.compressionChangedRecall)
      ? '检查下一轮 recall query hints 是否真实使用 WorkingMemory 压缩视图。'
      : null,
    results.some(result => result.compressed.passed === false)
      ? '检查 LongTermMemoryRecall 的 query plan、card scope 和索引过滤。'
      : null,
  ].filter(Boolean) as string[]

  return {
    version: 'working-memory-compression-behavior-harness-v1',
    passed: failingFixtureIds.length === 0,
    createdAt: input.now,
    summary: {
      fixtureCount: results.length,
      failingFixtureIds,
      changedRecallCount: results.filter(result => result.metrics.compressionChangedRecall).length,
      lostCommitmentCount,
      lostCorrectionCount,
      lostFailureTurnCount,
      lastError: [...traces].reverse().find(trace => trace.error)?.error ?? null,
    },
    results,
    traces,
    recommendedNextActions,
  }
}
