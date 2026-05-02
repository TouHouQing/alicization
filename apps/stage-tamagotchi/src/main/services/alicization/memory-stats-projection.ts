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
  templateLeakageFailCount: number
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
      reconstructionFrequency: Number(reconstructionFrequency.toFixed(2)),
      reconstructedCount,
      templateLeakageFailCount: input.retrievalTelemetry.templateLeakageFailCount,
    },
    integrity: deriveAlicizationMemoryIntegrity({
      facts: input.facts,
      currentTs: input.currentTs,
    }),
    lastPrunedAt: input.lastPrunedAt,
  }
}
