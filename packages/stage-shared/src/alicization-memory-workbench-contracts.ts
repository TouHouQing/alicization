export type AlicizationMemoryRecallMode
  = | 'none'
    | 'episodic'
    | 'relationship'
    | 'preference'
    | 'procedure'
    | 'task'
    | 'mixed'

export type AlicizationMemoryTemporalFocus
  = | 'current'
    | 'recent'
    | 'recent-or-mid'
    | 'cross-session'
    | 'distant'
    | 'unspecified'

export interface AlicizationMemoryReplaySessionSummary {
  sessionId: string
  title: string
  firstTurnAt: number | null
  lastTurnAt: number | null
  userTurnCount: number
  assistantTurnCount: number
  checkpointUpdatedAt: number
}

export interface AlicizationMemoryReplaySessionListPayload {
  cardId: string
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryReplaySessionListResult {
  items: AlicizationMemoryReplaySessionSummary[]
  nextCursor: string | null
}

export interface AlicizationMemoryQualityTrialPayload {
  cardId: string
  mode?: 'historical-replay' | 'live-provider'
  month?: string | null
  sessionId: string
}

export interface AlicizationMemoryDialogueReplayStageDetails {
  changed?: boolean
  level?: string
  sourceTurnIds?: string[]
  compressedEpisodeletCount?: number
  retainedRawTurnCount?: number
  maxRawTurns?: number
  owner?: string
  providerSystemBlockType?: string
  preRecallEvidenceCount?: number
  workingMemoryCompressedEpisodeletCount?: number
  workingMemoryObligationCount?: number
  source?: string
  status?: string
  evidenceIds?: string[]
  confidence?: number
  query?: string
  providerOutputLength?: number
  recalledEvidenceCount?: number
  checkpointUpdatedAt?: number
  persistedPersona?: boolean
  committedRawTurnCount?: number
  committedCompressedEpisodeletCount?: number
  checkpointWriteAllowed?: boolean
  personaWriteAllowed?: boolean
}

export interface AlicizationMemoryDialogueReplayStage {
  name: 'hydration' | 'compression' | 'context-assembly' | 'recall' | 'provider-adapter' | 'commit'
  status: 'succeeded' | 'failed'
  details: AlicizationMemoryDialogueReplayStageDetails
  error: string | null
}

export interface AlicizationMemoryDialogueReplayTurn {
  turnId: string
  status: 'succeeded' | 'failed'
  providerOutput: string | null
  providerMessages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  recalledEvidenceIds: string[]
  stages: AlicizationMemoryDialogueReplayStage[]
  writeback: {
    checkpoint: 'written' | 'skipped'
    persona: 'written' | 'skipped'
  }
  error: string | null
}

export interface AlicizationMemoryDialogueReplayReport {
  version: 'memory-db-dialogue-replay-report-v1'
  id: string
  passed: boolean
  createdAt: number
  summary: {
    turnCount: number
    succeededTurnCount: number
    failedTurnCount: number
    checkpointWriteCount: number
    personaWriteCount: number
    recalledEvidenceCount: number
    lastError: string | null
  }
  turns: AlicizationMemoryDialogueReplayTurn[]
}

export interface AlicizationMemoryLiveProviderTrialReport {
  version: 'memory-live-provider-trial-v1'
  id: string
  cardId: string
  sessionId: string
  createdAt: number
  passed: boolean
  summary: {
    turnCount: number
    succeededTurnCount: number
    failedTurnCount: number
    recalledEvidenceCount: number
    providerCallCount: number
    lastError: string | null
  }
  turns: Array<AlicizationMemoryDialogueReplayTurn & {
    providerTrace: {
      providerId: string
      modelId: string
      finishReason: string | null
      retryCount: number
      latencyMs: number
      outputLength: number
    } | null
  }>
  productionWrites: []
}

export interface AlicizationMemoryQualityLongTermMetrics {
  recallAtK: number
  precisionAtK: number
  mrr: number
  ndcg: number
  falseRecallRate: number
  wrongThreadRate: number
  blockedLeakCount: number
  semanticHitRate: number
  sourceTraceRate: number
  latencyMs: number
}

export interface AlicizationMemoryQualityLongTermTrace {
  id: string
  fixtureId: string
  owner: 'LongTermMemoryRecall'
  query: string
  intentMode: AlicizationMemoryRecallMode | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: {
    available: boolean
    providerId: string | null
    modelId: string | null
    dimensions: number | null
    reindexRequired: boolean
  }
  metrics: AlicizationMemoryQualityLongTermMetrics
  error: string | null
  createdAt: number
}

export interface AlicizationMemoryQualityLongTermResult {
  fixtureId: string
  topIds: string[]
  metrics: AlicizationMemoryQualityLongTermMetrics
  trace: AlicizationMemoryQualityLongTermTrace
  passed: boolean
}

export interface AlicizationWorkingMemoryQualityMetrics {
  obligationRetentionRate: number
  correctionRetentionRate: number
  commitmentRetentionRate: number
  failureTransparencyRetentionRate: number
  candidateBoundaryViolationCount: number
  compressionLossCount: number
}

export interface AlicizationWorkingMemoryQualityTrace {
  id: string
  fixtureId: string
  owner: 'WorkingMemory'
  query: string
  intentMode: string | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: {
    available: false
    providerId: null
    modelId: null
    dimensions: null
    reindexRequired: false
  }
  metrics: AlicizationWorkingMemoryQualityMetrics
  error: string | null
  createdAt: number
}

export interface AlicizationWorkingMemoryQualityResult {
  fixtureId: string
  metrics: AlicizationWorkingMemoryQualityMetrics
  trace: AlicizationWorkingMemoryQualityTrace
  passed: boolean
}

export interface AlicizationMemoryUserTrialFinding {
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

export interface AlicizationMemoryUserTrialMetrics {
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

export interface AlicizationMemoryUserTrialResult {
  version: 'memory-user-trial-harness-v1'
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  metrics: AlicizationMemoryUserTrialMetrics
  findings: AlicizationMemoryUserTrialFinding[]
  recommendedNextActions: string[]
  workingMemory: AlicizationWorkingMemoryQualityResult[]
  longTerm: AlicizationMemoryQualityLongTermResult[]
  timeline: Array<{
    kind: 'working-memory-check' | 'review-decision' | 'long-term-recall-check'
    fixtureId: string
    passed: boolean
    selectedIds: string[]
    error: string | null
  }>
}

export type AlicizationPersonaTrainingDatasetQualityFindingCode
  = | 'persona-dataset-expected-export-miss'
    | 'persona-dataset-forbidden-export-leak'
    | 'persona-dataset-quarantine-miss'
    | 'persona-dataset-rejection-miss'
    | 'persona-dataset-raw-source-leak'
    | 'persona-dataset-review-source-leak'
    | 'persona-dataset-failure-source-leak'
    | 'persona-dataset-internal-cue-leak'
    | 'persona-dataset-pii-export-leak'
    | 'persona-dataset-template-residue-leak'
    | 'persona-dataset-consent-leak'
    | 'persona-dataset-default-training-leak'
    | 'persona-dataset-cross-card-leak'
    | 'persona-dataset-missing-provenance'
    | 'persona-dataset-dedupe-gap'
    | 'persona-dataset-schema-mismatch'

export interface AlicizationPersonaTrainingDatasetQualityFinding {
  code: AlicizationPersonaTrainingDatasetQualityFindingCode
  severity: 'critical' | 'warning' | 'info'
  fixtureId: string
  message: string
  suggestedAction: string
}

export interface AlicizationPersonaTrainingDatasetQualityMetrics {
  acceptedSourceCount: number
  stagedExampleCount: number
  quarantinedExampleCount: number
  rejectedSourceCount: number
  exportedExampleCount: number
  expectedExportMissCount: number
  forbiddenExportLeakCount: number
  expectedQuarantineMissCount: number
  expectedRejectMissCount: number
  unsafeSourceExportLeakCount: number
  piiExportLeakCount: number
  templateResidueExportLeakCount: number
  consentLeakCount: number
  defaultTrainingLeakCount: number
  crossCardLeakCount: number
  missingProvenanceAcceptedCount: number
  dedupeCollisionCount: number
  dedupeGapCount: number
  sourceTraceRate: number
  schemaSupported: boolean
}

export interface AlicizationPersonaTrainingDatasetQualityTrace {
  id: string
  fixtureId: string
  owner: 'PersonaTrainingDataset'
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  metrics: AlicizationPersonaTrainingDatasetQualityMetrics
  error: string | null
  createdAt: number
}

export interface AlicizationPersonaTrainingDatasetQualityResult {
  fixtureId: string
  metrics: AlicizationPersonaTrainingDatasetQualityMetrics
  findings: AlicizationPersonaTrainingDatasetQualityFinding[]
  recommendedNextActions: string[]
  trace: AlicizationPersonaTrainingDatasetQualityTrace
  passed: boolean
}

export type AlicizationMemoryQualityTrace
  = | AlicizationMemoryQualityLongTermTrace
    | AlicizationWorkingMemoryQualityTrace
    | AlicizationPersonaTrainingDatasetQualityTrace

export type AlicizationMemoryQualityOptimizationFinding
  = | AlicizationMemoryUserTrialFinding
    | AlicizationPersonaTrainingDatasetQualityFinding

export interface AlicizationWorkingMemoryCompressionBehaviorMetrics {
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

export interface AlicizationWorkingMemoryCompressionBehaviorTrace {
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
  metrics: AlicizationWorkingMemoryCompressionBehaviorMetrics
  error: string | null
  createdAt: number
}

export interface AlicizationWorkingMemoryCompressionBehaviorReport {
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
  results: Array<{
    fixtureId: string
    baseline: AlicizationMemoryQualityLongTermResult
    compressed: AlicizationMemoryQualityLongTermResult
    metrics: AlicizationWorkingMemoryCompressionBehaviorMetrics
    trace: AlicizationWorkingMemoryCompressionBehaviorTrace
    passed: boolean
  }>
  traces: AlicizationWorkingMemoryCompressionBehaviorTrace[]
  recommendedNextActions: string[]
}

export type AlicizationLongTermMemoryTemporalConflictScenario
  = | 'knowledge-update'
    | 'relative-time'
    | 'tombstone'

export interface AlicizationLongTermMemoryTemporalConflictMetrics {
  temporalFocusMismatchCount: number
  knowledgeUpdateMissCount: number
  staleMemoryLeakCount: number
  tombstoneLeakCount: number
  blockedLeakCount: number
}

export interface AlicizationLongTermMemoryTemporalConflictTrace {
  id: string
  fixtureId: string
  owner: 'LongTermMemoryRecall'
  scenario: AlicizationLongTermMemoryTemporalConflictScenario
  temporalFocus: AlicizationMemoryTemporalFocus
  selectedIds: string[]
  forbiddenIds: string[]
  blockedIds: string[]
  rankReasonsById: Record<string, string[]>
  metrics: AlicizationLongTermMemoryTemporalConflictMetrics
  error: string | null
  createdAt: number
}

export interface AlicizationLongTermMemoryTemporalConflictReport {
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
  results: Array<{
    fixtureId: string
    result: AlicizationMemoryQualityLongTermResult
    metrics: AlicizationLongTermMemoryTemporalConflictMetrics
    trace: AlicizationLongTermMemoryTemporalConflictTrace
    passed: boolean
  }>
  traces: AlicizationLongTermMemoryTemporalConflictTrace[]
  recommendedNextActions: string[]
}

export type AlicizationMemoryExperienceQualityDimension
  = | 'non-intrusive'
    | 'anti-boast'
    | 'anti-template'
    | 'abstention'
    | 'agent-experience'

export type AlicizationMemoryExperienceAgentExperienceDimension
  = | 'environment-affordance'
    | 'workflow'
    | 'gotcha'
    | 'premise-awareness'
    | 'failure-mode'

export interface AlicizationMemoryExperienceQualityFinding {
  code:
    | 'intrusive-memory-use'
    | 'memory-boasting'
    | 'memory-template-echo'
    | 'abstention-miss'
    | 'expected-memory-miss'
    | 'forbidden-memory-used'
    | 'agent-experience-miss'
    | 'trace-incomplete'
  severity: 'critical' | 'warning'
  fixtureId: string
  dimension: AlicizationMemoryExperienceQualityDimension
  message: string
  suggestedAction: string
}

export interface AlicizationMemoryExperienceQualityTrace {
  id: string
  fixtureId: string
  owner: 'DialogueExperience'
  cardId: string
  userText: string
  shouldRecall: boolean
  expectedAbstain: boolean
  abstained: boolean
  expectedUsedMemoryIds: string[]
  forbiddenMemoryIds: string[]
  recalledMemoryIds: string[]
  surfacedMemoryIds: string[]
  missingExpectedMemoryIds: string[]
  usedForbiddenMemoryIds: string[]
  agentExperienceDimensions: AlicizationMemoryExperienceAgentExperienceDimension[]
  missingAgentExperienceIds: string[]
  rankReasonsById: Record<string, string[]>
  findings: AlicizationMemoryExperienceQualityFinding[]
  createdAt: number
}

export interface AlicizationMemoryExperienceQualityReport {
  version: 'memory-experience-quality-harness-v1'
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  summary: {
    fixtureCount: number
    failingFixtureIds: string[]
    intrusiveRecallCount: number
    memoryBoastCount: number
    templateEchoCount: number
    abstentionMissCount: number
    expectedMemoryMissCount: number
    forbiddenMemoryUsedCount: number
    agentExperienceMissCount: number
    traceIncompleteCount: number
  }
  findings: AlicizationMemoryExperienceQualityFinding[]
  traces: AlicizationMemoryExperienceQualityTrace[]
  recommendedNextActions: string[]
}

export type AlicizationMemoryScopeFuzzSurface
  = | 'memory_facts'
    | 'memory_consolidations'
    | 'search_documents'
    | 'vectors'
    | 'review_queue'
    | 'persona_dataset'

export type AlicizationMemoryScopeFuzzViolationReason
  = | 'cross-card'
    | 'cross-user'
    | 'cross-source'
    | 'target-miss'
    | 'malformed-record'
    | 'malformed-result'
    | 'surface-error'

export interface AlicizationMemoryScopeFuzzRecord {
  id: string
  cardId: string
  userId: string
  sourceId: string
}

export interface AlicizationMemoryScopeFuzzQuery {
  caseId: string
  cardId: string
  userId: string
  sourceId: string
}

export interface AlicizationMemoryScopeFuzzReport {
  version: 'memory-scope-fuzz-harness-v1'
  seed: string
  normalizedSeed: number
  caseCount: number
  passed: boolean
  surfaceSummaries: Array<{
    surface: AlicizationMemoryScopeFuzzSurface
    caseCount: number
    returnedRecordCount: number
    violationCount: number
    crossCardViolationCount: number
    crossUserViolationCount: number
    crossSourceViolationCount: number
    targetMissCount: number
    malformedRecordCount: number
    errorCount: number
    passed: boolean
  }>
  violations: Array<{
    id: string
    caseId: string
    surface: AlicizationMemoryScopeFuzzSurface
    query: AlicizationMemoryScopeFuzzQuery
    record: AlicizationMemoryScopeFuzzRecord | null
    reasons: AlicizationMemoryScopeFuzzViolationReason[]
    error: string | null
  }>
  recommendedActions: string[]
}

export interface AlicizationMemoryEmbeddingProgress {
  jobId: string
  cardId: string
  status: 'queued' | 'running' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
  modelId: string
  dimensions: number
  vectorSpaceId: string
  total: number
  pending: number
  leased: number
  indexed: number
  retryable: number
  deadLettered: number
  cancelled: number
  progress: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
  nextRetryAt: number | null
}

export interface AlicizationMemorySemanticScaleSearchMetrics {
  id: string
  corpusSize: number
  indexMode: 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'
  approximate: boolean
  degraded: boolean
  nativeIndexReady: boolean
  coverageRatio: number
  queryCount: number
  p95LatencyMs: number
  p99LatencyMs: number
  recallAtK: number
  falseRecallRate: number
  passed: boolean
  failures: string[]
}

export interface AlicizationMemorySemanticScaleProviderDegradationResult {
  id: string
  providerError: string | null
  fallbackRecallAtK: number
  errorVisible: boolean
  passed: boolean
  failures: string[]
}

export interface AlicizationMemorySemanticScaleReindexResult {
  reindexRequired: boolean
  modelSpaceChanged: boolean
  progress: {
    total: number
    indexed: number
    retryable: number
    deadLettered: number
    cancelled: number
    status: 'queued' | 'running' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
    lastError: string | null
  }
  observations: {
    cancellationObserved: boolean
    retryObserved: boolean
    deadLetterObserved: boolean
    crashRecoveryObserved: boolean
  }
  passed: boolean
  failures: string[]
}

export interface AlicizationMemorySemanticScaleSoakReport {
  version: 'memory-semantic-scale-soak-harness-v1'
  id: string
  createdAt: number
  passed: boolean
  summary: {
    corpusSize: number
    queryCount: number
    p95LatencyMs: number
    p99LatencyMs: number
    recallAtK: number
    falseRecallRate: number
    coverageRatio: number
    failingChecks: string[]
  }
  searchMetrics: AlicizationMemorySemanticScaleSearchMetrics[]
  providerDegradation: AlicizationMemorySemanticScaleProviderDegradationResult | null
  reindex: AlicizationMemorySemanticScaleReindexResult | null
  recommendedNextActions: string[]
}

export interface AlicizationMemoryQualityTrialReport {
  version: 'memory-production-trial-runner-v1'
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  summary: {
    dialogueReplayCount: number
    workingMemoryFixtureCount: number
    compressedContextBehaviorFixtureCount: number
    temporalConflictFixtureCount: number
    semanticScaleSoakRunCount: number
    experienceQualityFixtureCount: number
    scopeFuzzCaseCount: number
    longTermFixtureCount: number
    userTrialCount: number
    personaTrainingFixtureCount: number
    failingStageIds: string[]
    notRunStageIds: string[]
    optimizationFindingCount: number
    recommendedActionCount: number
    lastError: string | null
  }
  stages: Array<{
    stage: string
    id: string
    passed: boolean
    status?: 'not-run'
    itemCount: number
    error: string | null
  }>
  dialogueReplay: AlicizationMemoryDialogueReplayReport | null
  liveProviderTrial: AlicizationMemoryLiveProviderTrialReport | null
  runtimeHealth: {
    queue: {
      pending: number
      review: number
      applied: number
      failed: number
      deadLettered: number
    }
    recall: {
      lastLatencyMs: number | null
      p95LatencyMs: number | null
      lastError: string | null
    }
    embedding: {
      providerConfigured: boolean
      modelId: string | null
      dimensions: number | null
      vectorSpaceId: string | null
      reindexRequired: boolean
      indexMode: 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'
      approximate: boolean
      degraded: boolean
      nativeIndexReady: boolean
      searchReady: boolean
      lastError: string | null
      canonicalCount: number
      indexedCount: number
      missingCount: number
      textHashMismatchCount: number
      staleOrFailedCount: number
      orphanedCount: number
      coverageRatio: number | null
      reindexJob: AlicizationMemoryEmbeddingProgress | null
    }
    errors: string[]
  } | null
  quality: {
    passed: boolean
    summary: {
      failingFixtureIds: string[]
      recallAtK: number
      compressionLossCount: number
      blockedLeakCount: number
      optimizationFindingCount: number
      lastError: string | null
    }
    traces: AlicizationMemoryQualityTrace[]
    longTerm: AlicizationMemoryQualityLongTermResult[]
    workingMemory: AlicizationWorkingMemoryQualityResult[]
    userTrials: AlicizationMemoryUserTrialResult[]
    personaTraining: AlicizationPersonaTrainingDatasetQualityResult[]
    optimizationFindings: AlicizationMemoryQualityOptimizationFinding[]
    recommendedNextActions: string[]
  }
  compressedContextBehavior: AlicizationWorkingMemoryCompressionBehaviorReport | null
  temporalConflict: AlicizationLongTermMemoryTemporalConflictReport | null
  semanticScaleSoak: AlicizationMemorySemanticScaleSoakReport | null
  experienceQuality: AlicizationMemoryExperienceQualityReport | null
  scopeFuzz: AlicizationMemoryScopeFuzzReport | null
  recommendedNextActions: string[]
}

export type AlicizationMemorySemanticScaleJobTier = '10k' | '100k'
export type AlicizationMemorySemanticScaleJobStatus = 'queued' | 'running' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'

export interface AlicizationMemorySemanticScaleJobProgress {
  phase: 'queued' | 'indexing' | 'querying' | 'completed'
  completed: number
  total: number
  ratio: number
  indexedCount: number
  queryCount: number
  corpusSize: number
}

export interface AlicizationMemorySemanticScaleJob {
  jobId: string
  cardId: string
  tier: AlicizationMemorySemanticScaleJobTier
  corpusSize: number
  status: AlicizationMemorySemanticScaleJobStatus
  deadLettered: boolean
  attemptCount: number
  maxAttempts: number
  nextRetryAt: number | null
  leaseExpiresAt: number | null
  progress: AlicizationMemorySemanticScaleJobProgress
  report: AlicizationMemorySemanticScaleSoakReport | null
  lastError: string | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface AlicizationMemorySemanticScaleJobPayload {
  cardId: string
  action?: 'start' | 'status' | 'list' | 'cancel' | 'retry'
  jobId?: string
  tier?: AlicizationMemorySemanticScaleJobTier
  reason?: string | null
  limit?: number
}

export interface AlicizationMemorySemanticScaleJobResult {
  job: AlicizationMemorySemanticScaleJob | null
  jobs: AlicizationMemorySemanticScaleJob[]
}

export type AlicizationPersonaTrainingPipelineIncrementState = 'available' | 'rolled-back' | 'revoked'

export interface AlicizationPersonaTrainingArtifact {
  schemaVersion: 'alicization-persona-training-artifact-v1'
  artifactId: string
  runId: string
  kind: 'lora-adapter'
  path: string
  sha256: string
  sizeBytes: number
  baseModel: string
  compatibility: {
    status: 'compatible' | 'incompatible' | 'unknown'
    baseModel: string
    reason?: string | null
  }
  activation: {
    status: 'inactive' | 'unsupported'
    reason: string
  }
}

export interface AlicizationPersonaTrainingPipelineIncrement {
  id: string
  kind: 'persona-lora-increment'
  cardId: string
  datasetId: string
  manifestHash: string
  sourceIds: string[]
  basePersonaRevision: string
  artifact: AlicizationPersonaTrainingArtifact
  state: AlicizationPersonaTrainingPipelineIncrementState
  createdAt: number
}

export type AlicizationPersonaTrainingPipelineFailureReason
  = 'executor-failed'
    | 'source-revoked'
    | 'dataset-rolled-back'
    | 'dataset-not-active'
    | 'manifest-no-longer-usable'
    | 'cancelled'
    | 'interrupted'

export type AlicizationPersonaTrainingPipelineRunStatus
  = 'queued'
    | 'running'
    | 'cancel_requested'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'interrupted'

export type AlicizationPersonaTrainingPipelineRunStage
  = 'writing-input'
    | 'spawning'
    | 'training'
    | 'validating-artifact'
    | 'finalizing'

export interface AlicizationPersonaTrainingExecutorConfig {
  executable: string
  fixedArguments: string[]
  baseModel: string
  timeoutMs: number
}

export interface AlicizationPersonaTrainingPipelineRunRecord {
  runId: string
  cardId: string
  datasetId: string
  manifestHash: string
  sourceIds: string[]
  basePersonaRevision: string
  status: AlicizationPersonaTrainingPipelineRunStatus
  stage: AlicizationPersonaTrainingPipelineRunStage
  progress: number
  progressMessage: string | null
  failureReason: AlicizationPersonaTrainingPipelineFailureReason | null
  configSnapshot: AlicizationPersonaTrainingExecutorConfig | null
  artifact: AlicizationPersonaTrainingArtifact | null
  error: string | null
  queuedAt: number
  startedAt: number | null
  updatedAt: number
  finishedAt: number | null
  cancellationRequestedAt: number | null
}

export interface AlicizationPersonaTrainingStartResult {
  run: AlicizationPersonaTrainingPipelineRunRecord
}

export interface AlicizationPersonaTrainingRunsResult {
  items: AlicizationPersonaTrainingPipelineRunRecord[]
}

export interface AlicizationPersonaTrainingRunLookupPayload {
  cardId: string
  runId: string
}

export interface AlicizationPersonaTrainingExecutorConfigState {
  configured: boolean
  config: AlicizationPersonaTrainingExecutorConfig | null
  error: string | null
}

export interface AlicizationPersonaTrainingExecutorConfigPayload {
  cardId: string
  config: AlicizationPersonaTrainingExecutorConfig | null
}

export interface AlicizationPersonaTrainingExecutorConnectionResult {
  ok: boolean
  executable: string
  error: string | null
}

export type AlicizationPersonaTrainingPipelineResult
  = {
    status: 'succeeded'
    runId: string
    increment: AlicizationPersonaTrainingPipelineIncrement
  }
  | {
    status: 'failed'
    runId: string
    reason: AlicizationPersonaTrainingPipelineFailureReason
    error: string
  }

export interface AlicizationPersonaTrainingDatasetRevokePayload {
  cardId: string
  sourceId: string
}

export interface AlicizationPersonaTrainingRunPayload {
  cardId: string
  datasetId?: string | null
}

export interface AlicizationPersonaTrainingCancelPayload {
  cardId: string
  runId: string
  reason?: string | null
}

export interface AlicizationPersonaTrainingIncrementPayload {
  cardId: string
  incrementId: string
}

export interface AlicizationPersonaTrainingIncrementsResult {
  items: AlicizationPersonaTrainingPipelineIncrement[]
}
