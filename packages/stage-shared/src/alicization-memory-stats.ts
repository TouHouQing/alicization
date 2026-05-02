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
  reconstructionFrequency: number
  reconstructedCount: number
  templateLeakageFailCount: number
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
