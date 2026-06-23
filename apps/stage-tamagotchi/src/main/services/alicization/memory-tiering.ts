import type {
  AlicizationMemoryFact,
  AlicizationMemoryProvenance,
  AlicizationMemoryTier,
} from '../../../shared/eventa'

const dayMs = 24 * 60 * 60 * 1000

export interface AlicizationMemoryTierCounts {
  hot: number
  warm: number
  cold: number
}

export interface AlicizationTieredMemoryFactLike extends Pick<
  AlicizationMemoryFact,
  'updatedAt' | 'lastAccessAt' | 'accessCount' | 'confidence'
> {}

export interface AlicizationTieredEpisodicMemoryLike {
  occurredAt: number
  updatedAt: number
  lastRecalledAt: number | null
  recallCount: number
  salience: number
  consolidationPriority: number
  sourceKind: string
  provenance: AlicizationMemoryProvenance
  latestReconsolidation?: {
    at: number
    provenance: AlicizationMemoryProvenance
    confidence: number
  } | null
  tags?: string[]
}

export interface AlicizationTieredConsolidationLike {
  kind: 'daily' | 'weekly' | 'procedural' | 'autobiographical'
  facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
  periodStartedAt: number
  periodEndedAt: number
  confidence: number
  derivedEventIds: string[]
  updatedAt: number
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function daysSince(timestamp: number, currentTs: number) {
  return Math.max(0, (currentTs - timestamp) / dayMs)
}

export function computeFactPrunePressure(
  fact: AlicizationTieredMemoryFactLike,
  currentTs: number,
) {
  const ageDays = daysSince(fact.updatedAt, currentTs)
  const timeDecay = Math.min(1, ageDays / 30)
  const accessFrequencyNorm = Math.min(1, fact.accessCount / 12)
  const confidenceNorm = clamp01(fact.confidence)
  return timeDecay * (1 - accessFrequencyNorm) * (1 - confidenceNorm)
}

export function deriveFactMemoryTier(
  fact: AlicizationTieredMemoryFactLike,
  currentTs: number,
): AlicizationMemoryTier {
  const daysSinceUpdate = daysSince(fact.updatedAt, currentTs)
  const daysSinceAccess = fact.lastAccessAt == null
    ? Number.POSITIVE_INFINITY
    : daysSince(fact.lastAccessAt, currentTs)
  if (
    daysSinceUpdate <= 2
    || daysSinceAccess <= 2
    || fact.accessCount >= 4
  ) {
    return 'hot'
  }
  if (
    computeFactPrunePressure(fact, currentTs) >= 0.72
    && daysSinceAccess >= 14
  ) {
    return 'cold'
  }
  return 'warm'
}

export function deriveEpisodicMemoryTier(
  event: AlicizationTieredEpisodicMemoryLike,
  currentTs: number,
): AlicizationMemoryTier {
  const daysSinceOccurred = daysSince(event.occurredAt, currentTs)
  const daysSinceUpdated = daysSince(event.updatedAt, currentTs)
  const daysSinceRecalled = event.lastRecalledAt == null
    ? Number.POSITIVE_INFINITY
    : daysSince(event.lastRecalledAt, currentTs)
  const reconsolidationFresh = event.latestReconsolidation
    ? daysSince(event.latestReconsolidation.at, currentTs) <= 14
    : false
  const continuityTagged = (event.tags ?? []).some(tag => /afterthought|continuity|session-mirror|dream/u.test(tag))
    || event.sourceKind === 'maintenance'
    || event.sourceKind === 'dream'
    || event.sourceKind === 'dream-reforge'

  if (
    daysSinceOccurred <= 3
    || daysSinceUpdated <= 3
    || daysSinceRecalled <= 3
    || event.recallCount >= 3
    || reconsolidationFresh
  ) {
    return 'hot'
  }
  if (
    daysSinceOccurred >= 45
    && event.recallCount <= 1
    && event.salience < 0.58
    && event.consolidationPriority < 0.62
    && !continuityTagged
    && event.provenance !== 'dreamt'
  ) {
    return 'cold'
  }
  return 'warm'
}

export function deriveConsolidationMemoryTier(
  record: AlicizationTieredConsolidationLike,
  currentTs: number,
): AlicizationMemoryTier {
  const daysSinceEnded = daysSince(record.periodEndedAt, currentTs)
  const daysSinceUpdated = daysSince(record.updatedAt, currentTs)
  const denseEpisodeCluster = record.derivedEventIds.length >= 3
  const durableFacet = record.facet === 'relationship-era'
    || record.facet === 'task-era'
    || record.facet === 'self-era'

  if (
    daysSinceEnded <= 7
    || daysSinceUpdated <= 7
    || (record.confidence >= 0.82 && denseEpisodeCluster)
  ) {
    return 'hot'
  }
  if (
    daysSinceEnded >= 90
    && daysSinceUpdated >= 45
    && record.confidence < 0.64
    && record.derivedEventIds.length < 2
    && !durableFacet
    && record.kind !== 'autobiographical'
  ) {
    return 'cold'
  }
  return 'warm'
}

export function deriveTierCounts<T>(
  items: T[],
  deriveTier: (item: T) => AlicizationMemoryTier,
): AlicizationMemoryTierCounts {
  const counts: AlicizationMemoryTierCounts = {
    hot: 0,
    warm: 0,
    cold: 0,
  }
  for (const item of items) {
    counts[deriveTier(item)] += 1
  }
  return counts
}

export function scoreMemoryTierReachability(input: {
  tier: AlicizationMemoryTier
  vagueQuery?: boolean
  temporalFocus?: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant' | null
  longHorizonPreferred?: boolean
}) {
  if (input.tier === 'hot')
    return 0.08
  if (input.tier === 'warm')
    return 0.03
  if (input.longHorizonPreferred || input.temporalFocus === 'cross-session' || input.temporalFocus === 'distant' || input.temporalFocus === 'experience-matched')
    return input.vagueQuery ? 0.08 : 0.05
  return input.vagueQuery ? 0.04 : -0.02
}
