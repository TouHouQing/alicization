export interface AlicizationMemoryTierCounts {
  hot: number
  warm: number
  cold: number
}

export interface AlicizationMemorySurfaceCounts {
  facts: number
  episodic: number
  consolidations: number
}

export interface AlicizationMemorySurfaceTierCounts {
  facts: AlicizationMemoryTierCounts
  episodic: AlicizationMemoryTierCounts
  consolidations: AlicizationMemoryTierCounts
}

export interface AlicizationMemoryIngestHealth {
  status: 'healthy' | 'backlog' | 'degraded'
  pendingCount: number
  failedCount: number
  oldestPendingAgeMs: number | null
  nextRetryAt: number | null
  lastError: string | null
}

export interface AlicizationMemoryIntegrityHealth {
  status: 'ok' | 'degraded'
  issues: string[]
}

export interface AlicizationMemoryWriteHealth {
  backlogCount: number
  retryOldestAgeMs: number | null
  nextRetryAt: number | null
  blocked: boolean
  lastError: string | null
}

export interface AlicizationMemoryRetrievalHealth {
  semanticLatencyMs: number | null
  graphLatencyMs: number | null
  candidateGenerationLatencyMs?: number | null
  plannerLatencyMs?: number | null
  speechPlanLatencyMs?: number | null
  cacheHitRatio?: number
  prewarmHitRatio?: number
  budgetClassCounts?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
  hotKeyHitRatio?: number
  hotKeyCoverage?: number
  hotKeyCandidates?: string[]
  hotKeyStats?: Array<{
    key: string
    candidateCount: number
    hitCount: number
    winCount: number
    missCount: number
  }>
  hotKeyActiveCount?: number
  hotKeyWinCount?: number
  hotKeyMissCount?: number
  reconstructionFrequency: number
  reconstructedCount: number
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

export interface AlicizationMemoryStats {
  total: number
  active: number
  archived: number
  tierCounts?: AlicizationMemoryTierCounts
  surfaceCounts?: AlicizationMemorySurfaceCounts
  surfaceTierCounts?: AlicizationMemorySurfaceTierCounts
  pendingSyncCount?: number
  ingestHealth?: AlicizationMemoryIngestHealth
  integrity?: AlicizationMemoryIntegrityHealth
  writeHealth?: AlicizationMemoryWriteHealth
  retrievalHealth?: AlicizationMemoryRetrievalHealth
  lastPrunedAt: number | null
}
