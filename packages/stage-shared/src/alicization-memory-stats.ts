export type AlicizationOrganicMemoryRuntimeStage
  = 'search-prelude'
    | 'candidate-generation'
    | 'candidate-ranking'
    | 'recollection-planning'
    | 'surface-planning'
    | 'self-evolution-integration'
    | 'prompt-blocks'

export type AlicizationMemoryRetrievalBudgetClass
  = 'realtime-reply'
    | 'deep-recall-reply'
    | 'proactive-generation'
    | 'nightly-benchmark'
    | 'diagnosis-replay'

export interface AlicizationOrganicMemoryRuntimeStageTelemetry {
  latencyMs: number | null
  sampleCount: number
  p50LatencyMs?: number | null
  p95LatencyMs?: number | null
}

export interface AlicizationMemoryBudgetLatencyTelemetry {
  sampleCount: number
  p50LatencyMs: number | null
  p95LatencyMs: number | null
  maxLatencyMs: number | null
  gateStatus: 'unknown' | 'pass' | 'warn' | 'fail'
  targetP95Ms: number
}

export interface AlicizationOrganicMemoryRuntimeStageReplaySnapshot {
  stage: AlicizationOrganicMemoryRuntimeStage
  summary: string
  latencyMs: number | null
  budgetClass: AlicizationMemoryRetrievalBudgetClass | null
  inputs?: string[]
  outputs?: string[]
  diagnostics?: string[]
}

export interface AlicizationOrganicMemoryStageReplay {
  version: 'organic-memory-stage-replay-v1'
  producedAt: number
  stages: AlicizationOrganicMemoryRuntimeStageReplaySnapshot[]
}

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
  budgetClassCounts?: Partial<Record<AlicizationMemoryRetrievalBudgetClass, number>>
  budgetLatencyTelemetry?: Partial<Record<AlicizationMemoryRetrievalBudgetClass, AlicizationMemoryBudgetLatencyTelemetry>>
  organicStageTelemetry?: Partial<Record<AlicizationOrganicMemoryRuntimeStage, AlicizationOrganicMemoryRuntimeStageTelemetry>>
  organicStageBudgetCounts?: Partial<Record<AlicizationOrganicMemoryRuntimeStage, Partial<Record<AlicizationMemoryRetrievalBudgetClass, number>>>>
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
  suppressionHitRate?: number
  wrongThreadPreventedCount?: number
  falsePositiveSuppressionRate?: number
  staleSelfModelVetoRate?: number
  relationshipEraConfusionRate?: number
  reconstructionErrorRate?: number
  stableCoreOnlyRate?: number
  memorySurfaceViolationRate?: number
  memoryClosureCoverage?: number
  memoryClosureConflictClosureRate?: number
  memoryClosureLowQualityWithholdRate?: number
  memoryClosureUncertaintyLabelRate?: number
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
  productionGoldSampleCount?: number
  syntheticGoldSampleCount?: number
  productionGoldCoverage?: number
  independentProductionGoldSampleCount?: number
  independentProductionGoldCoverage?: number
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
}

export interface AlicizationPresenceQualityStats {
  quietCompanionshipCoverage: number
  silentPresenceNuisanceRate: number
  continuityMindCarryRate: number
  roomFirstCadenceRespectRate: number
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
  presenceQuality?: AlicizationPresenceQualityStats
  lastPrunedAt: number | null
}
