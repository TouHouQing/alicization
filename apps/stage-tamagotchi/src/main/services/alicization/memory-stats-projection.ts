import type { AlicizationMemoryFact } from '../../../shared/eventa'

import type {
  AlicizationMemoryIngestHealth,
  AlicizationMemoryIntegrityHealth,
  AlicizationMemoryStats,
  AlicizationMemoryTierCounts,
} from '@proj-alicization/stage-shared'

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
  reconstructionErrorRate?: number
  stableCoreOnlyRate?: number
  memorySurfaceViolationRate?: number
  templateLeakageFailCount: number
  mindParticipation?: number
  memoryParticipation?: number
  personalityParticipation?: number
  relationshipParticipation?: number
  continuityParticipation?: number
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
      reconstructionErrorRate: Number((input.retrievalTelemetry.reconstructionErrorRate ?? 0).toFixed(2)),
      stableCoreOnlyRate: Number((input.retrievalTelemetry.stableCoreOnlyRate ?? 0).toFixed(2)),
      memorySurfaceViolationRate: Number((input.retrievalTelemetry.memorySurfaceViolationRate ?? 0).toFixed(2)),
      templateLeakageFailCount: input.retrievalTelemetry.templateLeakageFailCount,
      mindParticipation: Number((input.retrievalTelemetry.mindParticipation ?? 0).toFixed(2)),
      memoryParticipation: Number((input.retrievalTelemetry.memoryParticipation ?? 0).toFixed(2)),
      personalityParticipation: Number((input.retrievalTelemetry.personalityParticipation ?? 0).toFixed(2)),
      relationshipParticipation: Number((input.retrievalTelemetry.relationshipParticipation ?? 0).toFixed(2)),
      continuityParticipation: Number((input.retrievalTelemetry.continuityParticipation ?? 0).toFixed(2)),
    },
    integrity: deriveAlicizationMemoryIntegrity({
      facts: input.facts,
      currentTs: input.currentTs,
    }),
    lastPrunedAt: input.lastPrunedAt,
  }
}
