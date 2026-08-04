import type { WorkingMemoryQualityFixture, WorkingMemoryQualityResult } from './life-core/working-memory-quality-harness'
import type {
  LongTermMemoryHarnessFixture,
  LongTermMemoryHarnessResult,
  LongTermMemoryHarnessSemanticState,
} from './long-term-memory-harness'
import type { LongTermMemoryEvidenceCandidate } from './long-term-memory-recall'

import { runWorkingMemoryQualityHarnessFixture } from './life-core/working-memory-quality-harness'
import { runLongTermMemoryHarnessFixture } from './long-term-memory-harness'

export interface MemoryUserTrialLongTermSeed {
  cardId: string
  candidate: LongTermMemoryEvidenceCandidate
  blocked?: boolean
}

export interface MemoryUserTrialReviewDecision {
  candidateId: string
  sourceTurnIds: string[]
  status: 'confirmed' | 'review-only' | 'rejected' | 'tombstoned'
  reason?: string | null
}

export interface MemoryUserTrialRecallCheck {
  id: string
  cardId: string
  query: string
  workingMemoryQueryHints?: string[]
  currentThreadTitle?: string | null
  activeTask?: string | null
  expectedTopIds: string[]
  forbiddenTopIds?: string[]
  semanticExpectedIds?: string[]
  semanticScores?: Record<string, number>
  semantic?: LongTermMemoryHarnessSemanticState
  wrongThreadIds?: string[]
  candidateScope?: 'card' | 'all-seeds'
  blockedPolicy?: 'pre-filter' | 'observe'
  requireSemantic?: boolean
  latencyMs?: number
  limit?: number
}

export interface MemoryUserTrialFinding {
  code:
    | 'working-memory-compression-loss'
    | 'long-term-recall-miss'
    | 'long-term-recall-error'
    | 'card-scope-leak'
    | 'review-candidate-leak'
    | 'blocked-memory-leak'
    | 'raw-transcript-leak'
    | 'semantic-unavailable'
    | 'semantic-required-miss'
    | 'trace-incomplete'
  severity: 'critical' | 'warning' | 'info'
  fixtureId: string
  message: string
  suggestedAction: string
}

export interface MemoryUserTrialTimelineEvent {
  kind: 'working-memory-check' | 'review-decision' | 'long-term-recall-check'
  fixtureId: string
  passed: boolean
  selectedIds: string[]
  error: string | null
}

export interface MemoryUserTrialMetrics {
  recallAtK: number
  precisionAtK: number
  mrr: number
  ndcg: number
  falseRecallRate: number
  wrongThreadRate: number
  blockedLeakCount: number
  cardScopeLeakCount: number
  reviewCandidateLeakCount: number
  rawTranscriptLeakCount: number
  compressionLossCount: number
  failureTransparencyRetentionRate: number
  semanticHitRate: number
  semanticRequiredMissCount: number
  sourceTraceRate: number
  p95LatencyMs: number
}

export interface MemoryUserTrialResult {
  version: 'memory-user-trial-harness-v1'
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  metrics: MemoryUserTrialMetrics
  findings: MemoryUserTrialFinding[]
  recommendedNextActions: string[]
  workingMemory: WorkingMemoryQualityResult[]
  longTerm: LongTermMemoryHarnessResult[]
  timeline: MemoryUserTrialTimelineEvent[]
}

export interface MemoryUserTrialHarnessInput {
  id: string
  cardId: string
  createdAt: number
  workingMemory: WorkingMemoryQualityFixture[]
  reviewDecisions?: MemoryUserTrialReviewDecision[]
  longTermSeeds: MemoryUserTrialLongTermSeed[]
  recallChecks: MemoryUserTrialRecallCheck[]
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function average(values: number[], emptyValue = 1) {
  return values.length === 0
    ? emptyValue
    : values.reduce((sum, value) => sum + value, 0) / values.length
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0)
    return 0
  const sorted = [...values].sort((left, right) => left - right)
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1))
  return sorted[rank] ?? 0
}

function uniqueActions(actions: string[]) {
  return [...new Set(actions)]
}

function sameSourceTurnIds(left: string[], right: string[]) {
  if (left.length !== right.length)
    return false
  const normalizedLeft = [...left].sort()
  const normalizedRight = [...right].sort()
  return normalizedLeft.every((item, index) => item === normalizedRight[index])
}

function workingMemoryCandidateKindToEvidenceKind(
  kind: WorkingMemoryQualityFixture['snapshot']['longTermCandidates'][number]['kind'],
): LongTermMemoryEvidenceCandidate['kind'] {
  switch (kind) {
    case 'episode':
      return 'episode'
    case 'preference':
      return 'fact'
    case 'procedure':
      return 'consolidation'
    case 'relationship':
    case 'correction':
      return 'reflection'
    default:
      return 'consolidation'
  }
}

function deriveSeedsFromReviewDecisions(input: MemoryUserTrialHarnessInput): MemoryUserTrialLongTermSeed[] {
  const decisions = input.reviewDecisions ?? []
  if (decisions.length === 0)
    return []

  const candidates = input.workingMemory.flatMap(fixture =>
    fixture.snapshot.longTermCandidates.map(candidate => ({
      cardId: fixture.snapshot.cardId,
      candidate,
    })),
  )

  return decisions
    .map((decision): MemoryUserTrialLongTermSeed | null => {
      const matched = candidates.find(item => sameSourceTurnIds(item.candidate.sourceTurnIds, decision.sourceTurnIds))
      if (!matched)
        return null

      const blocked = decision.status === 'rejected' || decision.status === 'tombstoned'
      const reviewStatus: NonNullable<LongTermMemoryEvidenceCandidate['reviewStatus']>
        = decision.status === 'confirmed' || decision.status === 'tombstoned'
          ? 'confirmed'
          : decision.status === 'review-only'
            ? 'candidate'
            : 'rejected'

      return {
        cardId: matched.cardId,
        blocked,
        candidate: {
          id: decision.candidateId,
          kind: workingMemoryCandidateKindToEvidenceKind(matched.candidate.kind),
          summary: matched.candidate.summary,
          source: 'working_memory_long_term_candidates',
          origin: 'cleaned-working-memory-candidate',
          confidence: matched.candidate.confidence,
          salience: matched.candidate.salience,
          reviewStatus,
          sensitivity: matched.candidate.sensitivity,
          cues: [
            matched.candidate.kind,
            matched.candidate.reason,
            ...(decision.reason ? [decision.reason] : []),
          ],
        },
      } satisfies MemoryUserTrialLongTermSeed
    })
    .filter((seed): seed is MemoryUserTrialLongTermSeed => seed !== null)
}

function looksLikeRawTranscriptSeed(seed: MemoryUserTrialLongTermSeed) {
  const text = [
    seed.candidate.source,
    seed.candidate.origin ?? '',
    seed.candidate.summary,
    ...(seed.candidate.cues ?? []),
  ].join(' ').toLowerCase()
  return /raw[ _-]?transcript|原始对话|逐字稿|未清洗/iu.test(text)
}

function buildLongTermHarnessFixture(input: {
  check: MemoryUserTrialRecallCheck
  seeds: MemoryUserTrialLongTermSeed[]
}): LongTermMemoryHarnessFixture {
  const blockedIds = input.seeds
    .filter(seed => seed.blocked === true)
    .map(seed => seed.candidate.id)

  return {
    id: input.check.id,
    currentUserText: input.check.query,
    workingMemoryQueryHints: input.check.workingMemoryQueryHints,
    currentThreadTitle: input.check.currentThreadTitle,
    activeTask: input.check.activeTask,
    expectedTopIds: input.check.expectedTopIds,
    forbiddenTopIds: input.check.forbiddenTopIds,
    blockedIds,
    blockedPolicy: input.check.blockedPolicy,
    wrongThreadIds: input.check.wrongThreadIds,
    semanticExpectedIds: input.check.semanticExpectedIds,
    semanticScores: input.check.semanticScores,
    semantic: input.check.semantic,
    latencyMs: input.check.latencyMs,
    limit: input.check.limit,
    candidates: input.seeds
      .filter(seed => input.check.candidateScope === 'all-seeds' || seed.cardId === input.check.cardId)
      .map(seed => seed.candidate),
  }
}

function countSelectedSeeds(input: {
  result: LongTermMemoryHarnessResult
  seeds: MemoryUserTrialLongTermSeed[]
  predicate: (seed: MemoryUserTrialLongTermSeed) => boolean
}) {
  const selectedIds = new Set(input.result.topIds)
  return input.seeds.filter(seed =>
    selectedIds.has(seed.candidate.id)
    && input.predicate(seed),
  ).length
}

function buildFindings(input: {
  workingMemory: WorkingMemoryQualityResult[]
  longTerm: Array<{
    result: LongTermMemoryHarnessResult
    check: MemoryUserTrialRecallCheck
    seeds: MemoryUserTrialLongTermSeed[]
  }>
}) {
  const findings: MemoryUserTrialFinding[] = []

  for (const result of input.workingMemory) {
    if (result.metrics.compressionLossCount > 0) {
      findings.push({
        code: 'working-memory-compression-loss',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: `WorkingMemory 压缩丢失 ${result.metrics.compressionLossCount} 项短期义务或失败透明状态。`,
        suggestedAction: '检查 WorkingMemory 压缩视图是否丢失用户纠正、承诺或失败面。',
      })
    }
  }

  for (const item of input.longTerm) {
    const { result, check } = item
    if (result.trace.error) {
      findings.push({
        code: 'long-term-recall-error',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: `长期召回失败：${result.trace.error}`,
        suggestedAction: '检查 LongTermMemoryRecall 的 Provider、索引和降级链路，并保留明确错误。',
      })
    }
    else if (result.metrics.recallAtK < 1) {
      findings.push({
        code: 'long-term-recall-miss',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: `长期召回没有命中期望记忆：${check.expectedTopIds.join(', ') || '无'}`,
        suggestedAction: '补充真实用户 replay fixture，覆盖缺失的长期记忆查询。',
      })
    }

    const cardScopeLeakCount = countSelectedSeeds({
      result,
      seeds: item.seeds,
      predicate: seed => seed.cardId !== check.cardId,
    })
    if (cardScopeLeakCount > 0) {
      findings.push({
        code: 'card-scope-leak',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: `长期召回跨 card 泄漏了 ${cardScopeLeakCount} 条记忆。`,
        suggestedAction: '在 DB candidate query、vector search 和 consolidation join 上继续收紧 card scope。',
      })
    }

    const reviewCandidateLeakCount = countSelectedSeeds({
      result,
      seeds: item.seeds,
      predicate: seed => seed.candidate.reviewStatus !== 'confirmed',
    })
    if (reviewCandidateLeakCount > 0) {
      findings.push({
        code: 'review-candidate-leak',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: `召回结果把 ${reviewCandidateLeakCount} 条未确认 review candidate 当成了长期记忆。`,
        suggestedAction: '保持 review queue candidate 与 confirmed long-term memory 的查询边界分离。',
      })
    }

    const rawTranscriptLeakCount = countSelectedSeeds({
      result,
      seeds: item.seeds,
      predicate: seed => looksLikeRawTranscriptSeed(seed),
    })
    if (rawTranscriptLeakCount > 0) {
      findings.push({
        code: 'raw-transcript-leak',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: `召回结果把 ${rawTranscriptLeakCount} 条 raw transcript 或未清洗对话当成了长期记忆。`,
        suggestedAction: '在长期记忆候选、review 决策和 recall candidate 查询中拒绝 raw transcript confirmed 化。',
      })
    }

    if (result.metrics.blockedLeakCount > 0) {
      findings.push({
        code: 'blocked-memory-leak',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: `召回结果泄漏了 ${result.metrics.blockedLeakCount} 条已阻断或 tombstone 记忆。`,
        suggestedAction: '检查 tombstone、revoke 和 vector index 删除后的过滤一致性。',
      })
    }

    if (check.requireSemantic && (result.trace.semantic.available !== true || result.metrics.semanticHitRate < 1)) {
      findings.push({
        code: 'semantic-required-miss',
        severity: 'critical',
        fixtureId: result.fixtureId,
        message: '本次试用要求 semantic 召回，但 embedding 不可用或期望语义命中缺失。',
        suggestedAction: '检查 embedding provider、vector space、reindex 状态和 semantic rank reason。',
      })
    }

    if (check.semantic?.available === false || result.trace.semantic.available === false) {
      findings.push({
        code: 'semantic-unavailable',
        severity: 'warning',
        fixtureId: result.fixtureId,
        message: '本次试用没有可用 semantic embedding，结果只能证明 lexical/structured 召回。',
        suggestedAction: '使用真实 embedding provider 做 soak test，并记录降级后的召回质量差异。',
      })
    }

    if (result.metrics.sourceTraceRate < 1) {
      findings.push({
        code: 'trace-incomplete',
        severity: 'warning',
        fixtureId: result.fixtureId,
        message: '部分长期证据没有 source trace，无法完整解释为什么被召回。',
        suggestedAction: '补齐 memory id、source、rank reason 和 query plan 的用户可见 recall trace。',
      })
    }
  }

  return findings
}

export function runMemoryUserTrialHarness(input: MemoryUserTrialHarnessInput): MemoryUserTrialResult {
  const workingMemory = input.workingMemory.map(fixture =>
    runWorkingMemoryQualityHarnessFixture({ fixture }),
  )
  const reviewDerivedSeeds = deriveSeedsFromReviewDecisions(input)
  const longTermSeeds = [
    ...input.longTermSeeds,
    ...reviewDerivedSeeds,
  ]
  const longTermWithChecks = input.recallChecks.map((check) => {
    const fixture = buildLongTermHarnessFixture({
      check,
      seeds: longTermSeeds,
    })
    return {
      check,
      result: runLongTermMemoryHarnessFixture({
        fixture,
        now: input.createdAt,
      }),
      seeds: longTermSeeds,
    }
  })
  const longTerm = longTermWithChecks.map(item => item.result)

  const cardScopeLeakCount = longTermWithChecks.reduce((sum, item) =>
    sum + countSelectedSeeds({
      result: item.result,
      seeds: item.seeds,
      predicate: seed => seed.cardId !== item.check.cardId,
    }), 0)
  const reviewCandidateLeakCount = longTermWithChecks.reduce((sum, item) =>
    sum + countSelectedSeeds({
      result: item.result,
      seeds: item.seeds,
      predicate: seed => seed.candidate.reviewStatus !== 'confirmed',
    }), 0)
  const rawTranscriptLeakCount = longTermWithChecks.reduce((sum, item) =>
    sum + countSelectedSeeds({
      result: item.result,
      seeds: item.seeds,
      predicate: seed => looksLikeRawTranscriptSeed(seed),
    }), 0)
  const semanticRequiredMissCount = longTermWithChecks.filter(item =>
    item.check.requireSemantic
    && (item.result.trace.semantic.available !== true || item.result.metrics.semanticHitRate < 1),
  ).length
  const metrics: MemoryUserTrialMetrics = {
    recallAtK: average(longTerm.map(result => result.metrics.recallAtK)),
    precisionAtK: average(longTerm.map(result => result.metrics.precisionAtK)),
    mrr: average(longTerm.map(result => result.metrics.mrr)),
    ndcg: average(longTerm.map(result => result.metrics.ndcg)),
    falseRecallRate: average(longTerm.map(result => result.metrics.falseRecallRate), 0),
    wrongThreadRate: average(longTerm.map(result => result.metrics.wrongThreadRate), 0),
    blockedLeakCount: longTerm.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0),
    cardScopeLeakCount,
    reviewCandidateLeakCount,
    rawTranscriptLeakCount,
    compressionLossCount: workingMemory.reduce((sum, result) => sum + result.metrics.compressionLossCount, 0),
    failureTransparencyRetentionRate: average(
      workingMemory.map(result => result.metrics.failureTransparencyRetentionRate),
    ),
    semanticHitRate: average(longTerm.map(result => result.metrics.semanticHitRate)),
    semanticRequiredMissCount,
    sourceTraceRate: average(longTerm.map(result => result.metrics.sourceTraceRate)),
    p95LatencyMs: percentile(longTerm.map(result => result.metrics.latencyMs), 0.95),
  }
  const findings = buildFindings({
    workingMemory,
    longTerm: longTermWithChecks,
  })
  const recommendedNextActions = uniqueActions(findings.map(item => item.suggestedAction))
  const criticalFindingCount = findings.filter(item => item.severity === 'critical').length
  const timeline: MemoryUserTrialTimelineEvent[] = [
    ...workingMemory.map(result => ({
      kind: 'working-memory-check' as const,
      fixtureId: result.fixtureId,
      passed: result.passed,
      selectedIds: result.trace.selectedIds,
      error: result.trace.error,
    })),
    ...reviewDerivedSeeds.map(seed => ({
      kind: 'review-decision' as const,
      fixtureId: seed.candidate.id,
      passed: seed.candidate.reviewStatus === 'confirmed' && seed.blocked !== true,
      selectedIds: [seed.candidate.id],
      error: seed.blocked ? 'review-decision-blocked' : null,
    })),
    ...longTerm.map(result => ({
      kind: 'long-term-recall-check' as const,
      fixtureId: result.fixtureId,
      passed: result.passed,
      selectedIds: result.topIds,
      error: result.trace.error,
    })),
  ]

  return {
    version: 'memory-user-trial-harness-v1',
    id: input.id,
    cardId: input.cardId,
    createdAt: input.createdAt,
    passed: workingMemory.every(result => result.passed)
      && longTerm.every(result => result.passed)
      && metrics.cardScopeLeakCount === 0
      && metrics.reviewCandidateLeakCount === 0
      && criticalFindingCount === 0,
    metrics: {
      ...metrics,
      recallAtK: clamp01(metrics.recallAtK),
      precisionAtK: clamp01(metrics.precisionAtK),
      mrr: clamp01(metrics.mrr),
      ndcg: clamp01(metrics.ndcg),
      falseRecallRate: clamp01(metrics.falseRecallRate),
      wrongThreadRate: clamp01(metrics.wrongThreadRate),
      failureTransparencyRetentionRate: clamp01(metrics.failureTransparencyRetentionRate),
      semanticHitRate: clamp01(metrics.semanticHitRate),
      sourceTraceRate: clamp01(metrics.sourceTraceRate),
    },
    findings,
    recommendedNextActions,
    workingMemory,
    longTerm,
    timeline,
  }
}
