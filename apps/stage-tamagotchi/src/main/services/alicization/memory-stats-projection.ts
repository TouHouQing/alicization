import type {
  AlicizationMemoryIngestHealth,
  AlicizationMemoryIntegrityHealth,
  AlicizationMemoryStats,
  AlicizationMemoryTierCounts,
} from '@proj-alicization/stage-shared'

import type { AlicizationMemoryFact } from '../../../shared/eventa'

import { deriveFactMemoryTier } from './memory-tiering'

interface AlicizationMemoryStatsProjectionEpisodicLike {
  memoryTier?: 'hot' | 'warm' | 'cold' | null
  provenance?: string | null
  latestReconsolidation?: {
    provenance?: string | null
  } | null
  reconsolidationCount: number
}

interface AlicizationMemoryStatsProjectionConsolidationLike {
  memoryTier?: 'hot' | 'warm' | 'cold' | null
}

interface AlicizationMemoryRetrievalTelemetryLike {
  semanticLatencyMs: number | null
  graphLatencyMs: number | null
  candidateGenerationLatencyMs?: number | null
  plannerLatencyMs?: number | null
  speechPlanLatencyMs?: number | null
  cacheHitCount?: number
  cacheMissCount?: number
  prewarmHitCount?: number
  prewarmMissCount?: number
  budgetClassCounts?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
  organicStageTelemetry?: Partial<Record<'search-prelude' | 'candidate-generation' | 'candidate-ranking' | 'recollection-planning' | 'surface-planning' | 'self-evolution-integration' | 'prompt-blocks', {
    latencyMs: number | null
    sampleCount: number
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
  wrongThreadRate?: number
  suppressionHitRate?: number
  wrongThreadPreventedCount?: number
  falsePositiveSuppressionRate?: number
  staleSelfModelVetoRate?: number
  relationshipEraConfusionRate?: number
  reconstructionErrorRate?: number
  stableCoreOnlyRate?: number
  memorySurfaceViolationRate?: number
  relationshipDistanceJumpRate?: number
  templateLeakageFailCount: number
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
  sampleCount?: number
  learningPolicyStrictnessBias?: number
  learningPolicyWrongThreadSuppressionBias?: number
  learningPolicyProvenanceLabelBias?: number
  learningPolicyReasonCodes?: string[]
  selfRevisionPatchCount?: number
  selfRevisionMemoryPolicyBias?: number
  selfRevisionRelationshipPostureBias?: number
  selfRevisionResponsePostureBias?: number
  selfRevisionProactivePolicyBias?: number
  selfRevisionValidationBias?: number
  selfRevisionReasonCodes?: string[]
  selfEvolutionVersionCandidateCount?: number
  selfEvolutionActiveCandidateCount?: number
  selfEvolutionShadowCandidateCount?: number
  selfEvolutionRejectedCandidateCount?: number
  selfEvolutionRolledBackCandidateCount?: number
  selfEvolutionReplayRequiredCount?: number
  selfEvolutionReplayPassedCount?: number
  selfEvolutionReasonCodes?: string[]
  relationshipCadenceRegressionRate?: number
  selfModelStaleBeliefRate?: number
  runtimeMemoryClosureLongRunClosureRate?: number
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9\u4E00-\u9FFF]+/u)
      .map(token => token.trim())
      .filter(Boolean),
  )
}

export function deriveAlicizationMemoryIntegrity(input: {
  facts: AlicizationMemoryFact[]
  currentTs: number
}): AlicizationMemoryIntegrityHealth {
  const issues: string[] = []
  const dedupeKeys = new Set<string>()
  for (const fact of input.facts) {
    if (!fact.subject.trim() || !fact.predicate.trim() || !fact.object.trim())
      issues.push(`malformed-fact:${fact.id}`)
    if (fact.dedupeKey) {
      if (dedupeKeys.has(fact.dedupeKey))
        issues.push(`duplicate-dedupe:${fact.dedupeKey}`)
      dedupeKeys.add(fact.dedupeKey)
    }
    if (deriveFactMemoryTier(fact, input.currentTs) === 'cold' && tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`).size === 0)
      issues.push(`cold-unsearchable:${fact.id}`)
  }
  return {
    status: issues.length > 0 ? 'degraded' : 'ok',
    issues,
  }
}

function combineTierCounts(parts: AlicizationMemoryTierCounts[]): AlicizationMemoryTierCounts {
  return parts.reduce<AlicizationMemoryTierCounts>((acc, part) => ({
    hot: acc.hot + part.hot,
    warm: acc.warm + part.warm,
    cold: acc.cold + part.cold,
  }), {
    hot: 0,
    warm: 0,
    cold: 0,
  })
}

export function buildAlicizationMemoryStatsProjection(input: {
  facts: AlicizationMemoryFact[]
  episodicEvents: AlicizationMemoryStatsProjectionEpisodicLike[]
  consolidations: AlicizationMemoryStatsProjectionConsolidationLike[]
  factTierCounts: AlicizationMemoryTierCounts
  episodicTierCounts: AlicizationMemoryTierCounts
  consolidationTierCounts: AlicizationMemoryTierCounts
  pendingSyncCount: number
  ingestHealth: AlicizationMemoryIngestHealth
  lastPrunedAt: number | null
  retrievalTelemetry: AlicizationMemoryRetrievalTelemetryLike
  currentTs: number
}): AlicizationMemoryStats {
  const tierCounts = combineTierCounts([
    input.factTierCounts,
    input.episodicTierCounts,
    input.consolidationTierCounts,
  ])
  const reconstructedCount = input.episodicEvents.filter((event) => {
    const latestProvenance = event.latestReconsolidation?.provenance ?? event.provenance
    return latestProvenance === 'reconstructed'
  }).length
  const reconsolidatedCount = input.episodicEvents.filter(event =>
    event.reconsolidationCount > 0 || Boolean(event.latestReconsolidation),
  ).length
  const reconstructionFrequency = input.episodicEvents.length === 0
    ? 0
    : reconsolidatedCount / input.episodicEvents.length
  const active = input.facts.length + input.episodicEvents.length + input.consolidations.length
  const learningTerminalCount = Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskCompletionCount ?? 0))
    + Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskFailureCount ?? 0))
    + Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskCancelledCount ?? 0))
  const learningAttemptCount = learningTerminalCount
    + Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskBlockedCount ?? 0))
    + Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskDowngradedCount ?? 0))
  const learningReopenCount = Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskReopenedCount ?? 0))
  const learningCompletionCount = Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskCompletionCount ?? 0))
  const learningFailureCount = Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskFailureCount ?? 0))
  const learningWorldValidationCount = Math.max(0, Math.floor(input.retrievalTelemetry.learningWorldModelValidationCount ?? 0))
  const learningWorldFalseInternalizationCount = Math.max(0, Math.floor(input.retrievalTelemetry.learningWorldModelFalseInternalizationCount ?? 0))
  const relationshipCadenceRegressionRate = input.retrievalTelemetry.relationshipCadenceRegressionRate
    ?? input.retrievalTelemetry.relationshipDistanceJumpRate
    ?? 0
  const selfModelStaleBeliefRate = input.retrievalTelemetry.selfModelStaleBeliefRate
    ?? input.retrievalTelemetry.staleSelfModelVetoRate
    ?? 0
  const runtimeMemoryClosureLongRunClosureRate = input.retrievalTelemetry.runtimeMemoryClosureLongRunClosureRate ?? 0

  return {
    total: active,
    active,
    archived: tierCounts.cold,
    tierCounts,
    surfaceCounts: {
      facts: input.facts.length,
      episodic: input.episodicEvents.length,
      consolidations: input.consolidations.length,
    },
    surfaceTierCounts: {
      facts: input.factTierCounts,
      episodic: input.episodicTierCounts,
      consolidations: input.consolidationTierCounts,
    },
    pendingSyncCount: input.pendingSyncCount,
    ingestHealth: input.ingestHealth,
    writeHealth: {
      backlogCount: input.ingestHealth.pendingCount + input.ingestHealth.failedCount,
      retryOldestAgeMs: input.ingestHealth.oldestPendingAgeMs,
      nextRetryAt: input.ingestHealth.nextRetryAt,
      blocked: input.ingestHealth.status === 'degraded',
      lastError: input.ingestHealth.lastError,
    },
    retrievalHealth: {
      semanticLatencyMs: input.retrievalTelemetry.semanticLatencyMs,
      graphLatencyMs: input.retrievalTelemetry.graphLatencyMs,
      candidateGenerationLatencyMs: input.retrievalTelemetry.candidateGenerationLatencyMs ?? null,
      plannerLatencyMs: input.retrievalTelemetry.plannerLatencyMs ?? null,
      speechPlanLatencyMs: input.retrievalTelemetry.speechPlanLatencyMs ?? null,
      cacheHitRatio: (() => {
        const hits = input.retrievalTelemetry.cacheHitCount ?? 0
        const misses = input.retrievalTelemetry.cacheMissCount ?? 0
        const total = hits + misses
        return total <= 0 ? 0 : Number((hits / total).toFixed(2))
      })(),
      prewarmHitRatio: (() => {
        const hits = input.retrievalTelemetry.prewarmHitCount ?? 0
        const misses = input.retrievalTelemetry.prewarmMissCount ?? 0
        const total = hits + misses
        return total <= 0 ? 0 : Number((hits / total).toFixed(2))
      })(),
      budgetClassCounts: input.retrievalTelemetry.budgetClassCounts ?? {},
      organicStageTelemetry: input.retrievalTelemetry.organicStageTelemetry ?? {},
      organicStageBudgetCounts: input.retrievalTelemetry.organicStageBudgetCounts ?? {},
      hotKeyHitRatio: (() => {
        const rows = input.retrievalTelemetry.hotKeyStats ?? []
        const hits = rows.reduce((sum, item) => sum + Math.max(0, Number(item.hitCount ?? 0)), 0)
        const misses = rows.reduce((sum, item) => sum + Math.max(0, Number(item.missCount ?? 0)), 0)
        const total = hits + misses
        return total <= 0 ? 0 : Number((hits / total).toFixed(2))
      })(),
      hotKeyCoverage: (() => {
        const rows = input.retrievalTelemetry.hotKeyStats ?? []
        const totalCandidates = rows.reduce((sum, item) => sum + Math.max(0, Number(item.candidateCount ?? 0)), 0)
        if (totalCandidates <= 0)
          return 0
        const winningKeys = rows.filter(item => Math.max(0, Number(item.winCount ?? 0)) > 0).length
        return Number((winningKeys / rows.length).toFixed(2))
      })(),
      hotKeyCandidates: (input.retrievalTelemetry.hotKeyStats ?? []).slice(0, 5).map(item => item.key),
      hotKeyStats: input.retrievalTelemetry.hotKeyStats ?? [],
      hotKeyActiveCount: (input.retrievalTelemetry.hotKeyStats ?? []).length,
      hotKeyWinCount: (input.retrievalTelemetry.hotKeyStats ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.winCount ?? 0)), 0),
      hotKeyMissCount: (input.retrievalTelemetry.hotKeyStats ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.missCount ?? 0)), 0),
      reconstructionFrequency: Number(reconstructionFrequency.toFixed(2)),
      reconstructedCount,
      recallHitRate: Number((input.retrievalTelemetry.recallHitRate ?? 0).toFixed(2)),
      recallMissRate: Number((input.retrievalTelemetry.recallMissRate ?? 0).toFixed(2)),
      wrongThreadRate: Number((input.retrievalTelemetry.wrongThreadRate ?? 0).toFixed(2)),
      suppressionHitRate: Number((input.retrievalTelemetry.suppressionHitRate ?? 0).toFixed(2)),
      wrongThreadPreventedCount: Math.max(0, Math.floor(input.retrievalTelemetry.wrongThreadPreventedCount ?? 0)),
      falsePositiveSuppressionRate: Number((input.retrievalTelemetry.falsePositiveSuppressionRate ?? 0).toFixed(2)),
      staleSelfModelVetoRate: Number((input.retrievalTelemetry.staleSelfModelVetoRate ?? 0).toFixed(2)),
      relationshipEraConfusionRate: Number((input.retrievalTelemetry.relationshipEraConfusionRate ?? 0).toFixed(2)),
      reconstructionErrorRate: Number((input.retrievalTelemetry.reconstructionErrorRate ?? 0).toFixed(2)),
      stableCoreOnlyRate: Number((input.retrievalTelemetry.stableCoreOnlyRate ?? 0).toFixed(2)),
      memorySurfaceViolationRate: Number((input.retrievalTelemetry.memorySurfaceViolationRate ?? 0).toFixed(2)),
      templateLeakageFailCount: input.retrievalTelemetry.templateLeakageFailCount,
      mindParticipation: Number((input.retrievalTelemetry.mindParticipation ?? 0).toFixed(2)),
      memoryParticipation: Number((input.retrievalTelemetry.memoryParticipation ?? 0).toFixed(2)),
      personalityParticipation: Number((input.retrievalTelemetry.personalityParticipation ?? 0).toFixed(2)),
      relationshipParticipation: Number((input.retrievalTelemetry.relationshipParticipation ?? 0).toFixed(2)),
      continuityParticipation: Number((input.retrievalTelemetry.continuityParticipation ?? 0).toFixed(2)),
      learningTaskCompletionCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskCompletionCount ?? 0)),
      learningTaskFailureCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskFailureCount ?? 0)),
      learningTaskBlockedCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskBlockedCount ?? 0)),
      learningTaskReopenedCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskReopenedCount ?? 0)),
      learningTaskDowngradedCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskDowngradedCount ?? 0)),
      learningTaskCancelledCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningTaskCancelledCount ?? 0)),
      learningRelationshipReviseCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningRelationshipReviseCount ?? 0)),
      learningSelfModelReviseCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningSelfModelReviseCount ?? 0)),
      learningWorldModelValidationCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningWorldModelValidationCount ?? 0)),
      learningWorldModelFalseInternalizationCount: Math.max(0, Math.floor(input.retrievalTelemetry.learningWorldModelFalseInternalizationCount ?? 0)),
      learningTaskCompletionRate: Number((learningAttemptCount <= 0 ? 0 : learningCompletionCount / learningAttemptCount).toFixed(2)),
      learningTaskFailureRate: Number((learningAttemptCount <= 0 ? 0 : learningFailureCount / learningAttemptCount).toFixed(2)),
      learningTaskReopenRecoveryRate: Number((learningReopenCount <= 0 ? 0 : Math.min(learningCompletionCount, learningReopenCount) / learningReopenCount).toFixed(2)),
      misinternalizationRate: Number((learningWorldValidationCount <= 0 ? 0 : learningWorldFalseInternalizationCount / learningWorldValidationCount).toFixed(2)),
      sampleCount: Math.max(0, Math.floor(input.retrievalTelemetry.sampleCount ?? 0)),
      learningPolicyStrictnessBias: Number((input.retrievalTelemetry.learningPolicyStrictnessBias ?? 0).toFixed(2)),
      learningPolicyWrongThreadSuppressionBias: Number((input.retrievalTelemetry.learningPolicyWrongThreadSuppressionBias ?? 0).toFixed(2)),
      learningPolicyProvenanceLabelBias: Number((input.retrievalTelemetry.learningPolicyProvenanceLabelBias ?? 0).toFixed(2)),
      learningPolicyReasonCodes: input.retrievalTelemetry.learningPolicyReasonCodes ?? [],
      selfRevisionPatchCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfRevisionPatchCount ?? 0)),
      selfRevisionMemoryPolicyBias: Number((input.retrievalTelemetry.selfRevisionMemoryPolicyBias ?? 0).toFixed(2)),
      selfRevisionRelationshipPostureBias: Number((input.retrievalTelemetry.selfRevisionRelationshipPostureBias ?? 0).toFixed(2)),
      selfRevisionResponsePostureBias: Number((input.retrievalTelemetry.selfRevisionResponsePostureBias ?? 0).toFixed(2)),
      selfRevisionProactivePolicyBias: Number((input.retrievalTelemetry.selfRevisionProactivePolicyBias ?? 0).toFixed(2)),
      selfRevisionValidationBias: Number((input.retrievalTelemetry.selfRevisionValidationBias ?? 0).toFixed(2)),
      selfRevisionReasonCodes: input.retrievalTelemetry.selfRevisionReasonCodes ?? [],
      selfEvolutionVersionCandidateCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfEvolutionVersionCandidateCount ?? 0)),
      selfEvolutionActiveCandidateCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfEvolutionActiveCandidateCount ?? 0)),
      selfEvolutionShadowCandidateCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfEvolutionShadowCandidateCount ?? 0)),
      selfEvolutionRejectedCandidateCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfEvolutionRejectedCandidateCount ?? 0)),
      selfEvolutionRolledBackCandidateCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfEvolutionRolledBackCandidateCount ?? 0)),
      selfEvolutionReplayRequiredCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfEvolutionReplayRequiredCount ?? 0)),
      selfEvolutionReplayPassedCount: Math.max(0, Math.floor(input.retrievalTelemetry.selfEvolutionReplayPassedCount ?? 0)),
      selfEvolutionReasonCodes: input.retrievalTelemetry.selfEvolutionReasonCodes ?? [],
      relationshipCadenceRegressionRate: Number((relationshipCadenceRegressionRate ?? 0).toFixed(2)),
      selfModelStaleBeliefRate: Number((selfModelStaleBeliefRate ?? 0).toFixed(2)),
      runtimeMemoryClosureLongRunClosureRate: Number((runtimeMemoryClosureLongRunClosureRate ?? 0).toFixed(2)),
    },
    integrity: deriveAlicizationMemoryIntegrity({
      facts: input.facts,
      currentTs: input.currentTs,
    }),
    lastPrunedAt: input.lastPrunedAt,
  }
}
