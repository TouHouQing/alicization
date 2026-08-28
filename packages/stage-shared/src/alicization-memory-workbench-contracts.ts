import type { AlicizationChatFailureKind } from './alicization-chat-failure-surface'
import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from './alicization-provider-response'
import type {
  AlicizationFinalReplayGateReportRecord,
  AlicizationMemoryProvenance,
} from './alicization-transport-contracts'

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
  checkpointUpdatedAt: number | null
  activityUpdatedAt: number
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

export type AlicizationSimpleRecallGoldLabel = 'right' | 'missing' | 'wrong' | 'unwanted'
export type AlicizationSimpleRecallGoldReason = 'wrong-thread' | 'expired' | 'not-needed' | 'should-abstain'
export type AlicizationSimpleRecallGoldEvaluationClass
  = | 'correct-recall'
    | 'missed-recall'
    | 'false-recall'
    | 'should-abstain'
export type AlicizationSimpleRecallGoldBenchmarkDimension
  = | 'information-extraction'
    | 'multi-session-reasoning'
    | 'temporal-reasoning'
    | 'knowledge-update'
    | 'abstention'

export interface AlicizationMemoryQualityEvidenceSnapshot {
  id: string
  kind: string
  summary: string
  source: string
  score: number
  confidence: number
  sensitivity: string | null
  scope: {
    userId: string
    cardId: string | null
  }
  provenance: AlicizationMemoryProvenance
  evidenceVersion: string
  version: string
  queryMatches: string[]
  rankReasons: string[]
}

export interface AlicizationMemoryQualityGoldLabelPayload {
  cardId: string
  conversationSampleId: string
  month?: string | null
  label: AlicizationSimpleRecallGoldLabel
  reason?: AlicizationSimpleRecallGoldReason | null
  query: string
  sessionId: string
  turnId: string
  decisionTraceId: string
  assistantReply: string
  retrievedEvidenceSnapshot: AlicizationMemoryQualityEvidenceSnapshot[]
  expectedMemoryIds?: string[]
  retrievedCandidateIds?: string[]
  surfacedMemoryIds?: string[]
  wrongThreadIds?: string[]
  note?: string | null
  createdAt?: number
}

export interface AlicizationMemoryQualityConversationSample {
  id: string
  cardId: string
  sessionId: string
  turnId: string
  decisionTraceId: string | null
  query: string
  assistantReply: string
  createdAt: number
  retrievedCandidateIds: string[]
  surfacedMemoryIds: string[]
  traceEventKinds: string[]
  existingGoldLabelId: string | null
}

export interface AlicizationMemoryQualityConversationSampleListPayload {
  cardId: string
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryQualityConversationSampleListResult {
  items: AlicizationMemoryQualityConversationSample[]
  nextCursor: string | null
}

export interface AlicizationMemoryQualityGoldLabelItem {
  id: string
  cardId: string
  month: string
  label: AlicizationSimpleRecallGoldLabel
  reason: AlicizationSimpleRecallGoldReason | null
  labelText: string
  description: string
  evaluationClass: AlicizationSimpleRecallGoldEvaluationClass
  benchmarkDimensions: AlicizationSimpleRecallGoldBenchmarkDimension[]
  query: string
  sessionId: string
  turnId: string
  decisionTraceId: string | null
  assistantReply: string
  retrievedEvidenceSnapshot: AlicizationMemoryQualityEvidenceSnapshot[]
  expectedMemoryIds: string[]
  retrievedCandidateIds: string[]
  surfacedMemoryIds: string[]
  wrongThreadIds: string[]
  note: string | null
  humanConfirmed: boolean
  createdAt: number
}

export interface AlicizationMemoryQualityGoldLabelListPayload {
  cardId: string
  month?: string | null
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryQualityGoldLabelListResult {
  items: AlicizationMemoryQualityGoldLabelItem[]
  nextCursor: string | null
}

export interface AlicizationMemoryQualityMonthlyGoldRegressionPack {
  version: 'memory-quality-monthly-gold-regression-pack-v2'
  packId: string
  revision: number
  cardId: string
  month: string
  frozenAt: number
  contentHash: string
  sourceLabelIds: string[]
  itemCount: number
  itemsSnapshot: AlicizationMemoryQualityGoldLabelItem[]
  items: AlicizationMemoryQualityGoldLabelItem[]
}

export interface AlicizationMemoryQualityMonthlyGoldRegressionPayload {
  cardId: string
  month?: string | null
}

export interface AlicizationMemoryQualityTrialPayload {
  cardId: string
  mode?: 'historical-replay' | 'live-provider'
  month?: string | null
  /**
   * Kept as correlation metadata for old reports. The main runtime always
   * resolves the card's canonical primary conversation session.
   */
  sessionId?: string | null
}

export interface AlicizationMemoryQualityTrialCancelPayload {
  cardId: string
  reason?: string | null
}

export interface AlicizationMemoryQualityTrialCancelResult {
  cardId: string
  cancelled: boolean
  reason: string | null
}

export interface AlicizationMemoryDialogueReplayStageDetails {
  changed?: boolean
  found?: boolean
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
  updatedAt?: number | null
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
    providerRetryCount: number
    providerFailureRate: number
    p50LatencyMs: number
    p95LatencyMs: number
    p99LatencyMs: number
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

export type AlicizationLongTermMemoryEvidenceKind
  = | 'fact'
    | 'reflection'
    | 'episode'
    | 'consolidation'

export interface AlicizationLongTermMemoryRecallIntent {
  mode: AlicizationMemoryRecallMode
  shouldRecall: boolean
  confidence: number
  rationale: string
  temporalFocus: AlicizationMemoryTemporalFocus
  targetKinds: AlicizationLongTermMemoryEvidenceKind[]
  queryHints: string[]
  riskFlags: string[]
}

export interface AlicizationLongTermMemoryQueryPlan {
  rawQuery: string
  normalizedQuery: string
  keywordQueries: string[]
  phraseQueries: string[]
  charGramQueries: string[]
  semanticQueries: string[]
  episodicQueries: string[]
  temporalHints: string[]
  entityHints: string[]
  procedureHints: string[]
  threadHints: string[]
  negativeCues: string[]
  riskFlags: string[]
  targetKinds: AlicizationLongTermMemoryEvidenceKind[]
}

export interface AlicizationLongTermMemoryEvidenceScope {
  userId: string
  cardId: string | null
}

export interface AlicizationLongTermMemoryEvidenceCandidate {
  id: string
  kind: AlicizationLongTermMemoryEvidenceKind
  summary: string
  source: string
  origin?: string | null
  scope?: AlicizationLongTermMemoryEvidenceScope | null
  provenance?: AlicizationMemoryProvenance | null
  evidenceVersion?: string | null
  version?: string | null
  confidence: number
  reviewStatus?: string | null
  salience?: number | null
  updatedAt?: number | null
  occurredAt?: number | null
  threadId?: string | null
  threadAnchor?: string | null
  cues?: string[] | null
  entities?: string[] | null
  sensitivity?: 'public' | 'personal' | 'private' | 'secret' | null
}

export interface AlicizationRankedLongTermMemoryEvidence {
  candidate: AlicizationLongTermMemoryEvidenceCandidate
  score: number
  queryMatches: string[]
  rankReasons: string[]
  scope: AlicizationLongTermMemoryEvidenceScope
  provenance: AlicizationMemoryProvenance
  evidenceVersion: string
  version: string
}

export interface AlicizationLongTermMemoryEvidenceBundle {
  intent: AlicizationLongTermMemoryRecallIntent
  plan: AlicizationLongTermMemoryQueryPlan
  evidence: AlicizationRankedLongTermMemoryEvidence[]
  confidence: number
  budgetClass: 'none' | 'light' | 'normal' | 'wide'
}

export interface AlicizationWorkingMemoryFailureSurface {
  kind: AlicizationChatFailureKind
  origin: 'failure-surface'
  allowLongTermCondensation: false
  allowPersonaLearning: false
  allowTraining: false
}

export interface AlicizationWorkingMemoryLongTermEvidence {
  version: 'working-memory-long-term-evidence-v1'
  source: 'explicit-structured-memory-evidence'
  kind: AlicizationWorkingMemoryLongTermCandidate['kind']
  summary: string
  reason: string
  evidenceSnippets: string[]
  salience: number
  sensitivity: AlicizationWorkingMemoryLongTermCandidate['sensitivity']
  confidence: number
}

export interface AlicizationWorkingMemoryTurn {
  turnId: string
  role: 'user' | 'alice' | 'tool' | 'system'
  text: string
  createdAt: number
  source: 'conversation-turn' | 'tool-result' | 'runtime-event'
  visibility: 'user-visible' | 'internal'
  failureKind: 'timeout' | 'provider-error' | 'tool-error' | 'abort' | null
  origin?: AlicizationVisibleArtifactOrigin | null
  learningPolicy?: AlicizationVisibleArtifactLearningPolicy | null
  failureSurface?: AlicizationWorkingMemoryFailureSurface | null
  memoryEvidence?: AlicizationWorkingMemoryLongTermEvidence | null
  contaminated?: boolean
  importance: number
}

export interface AlicizationWorkingMemoryEpisodelet {
  id: string
  sourceTurnIds: string[]
  summary: string
  thread: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  corrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  executionCarry: string | null
  importance: number
  createdAt: number
}

export interface AlicizationWorkingMemoryThread {
  title: string
  currentUserMove: string
  currentAliceMove: string | null
  primaryAnchor: string | null
  mode: 'casual' | 'task' | 'repair' | 'execution' | 'reflection' | 'recollection'
  shouldHold: boolean
  confidence: number
}

export interface AlicizationWorkingMemoryTask {
  summary: string
  status: 'active' | 'waiting-user' | 'waiting-tool' | 'blocked' | 'settled'
  evidenceTurnIds: string[]
}

export interface AlicizationWorkingMemoryQuestion {
  text: string
  sourceTurnId: string | null
}

export interface AlicizationWorkingMemoryCommitment {
  text: string
  sourceTurnId: string | null
}

export interface AlicizationWorkingMemoryCorrection {
  text: string
  sourceTurnId: string | null
  scope: 'reply' | 'memory' | 'persona' | 'task' | 'unknown'
}

export interface AlicizationWorkingMemoryRelationshipPosture {
  summary: string
  source: 'conversation-state' | 'conscious-frame' | 'runtime'
}

export interface AlicizationWorkingMemoryEmotionalPosture {
  summary: string
  source: 'conscious-frame' | 'runtime'
}

export interface AlicizationWorkingMemoryExecutionState {
  summary: string
  source: 'execution-callback' | 'execution-ledger' | 'tool-result'
  status?: 'active' | 'terminal'
  observedAt?: number
}

export interface AlicizationWorkingMemoryLongTermCandidate {
  sourceTurnIds: string[]
  kind: 'episode' | 'preference' | 'relationship' | 'procedure' | 'correction'
  summary: string
  reason: string
  salience: number
  sensitivity: 'public' | 'personal' | 'private' | 'secret'
  confidence: number
  allowTraining: boolean
  evidenceSnippets?: string[]
  memoryEvidence?: AlicizationWorkingMemoryLongTermEvidence | null
}

export interface AlicizationWorkingMemoryCompressionState {
  level: 'none' | 'light' | 'heavy'
  sourceTurnIds: string[]
  lastCompressedAt: number | null
}

export interface AlicizationWorkingMemoryAuditState {
  failureTurnIds: string[]
  excludedLongTermCandidateTurnIds: string[]
  notes: string[]
}

export interface AlicizationWorkingMemorySnapshot {
  version: 'working-memory-v1'
  cardId: string
  sessionId: string
  updatedAt: number
  turnRange: {
    fromTurnId: string | null
    toTurnId: string | null
  }
  recentRawTurns: AlicizationWorkingMemoryTurn[]
  compressedTimeline: AlicizationWorkingMemoryEpisodelet[]
  currentThread: AlicizationWorkingMemoryThread | null
  activeTask: AlicizationWorkingMemoryTask | null
  unresolvedQuestions: AlicizationWorkingMemoryQuestion[]
  commitments: AlicizationWorkingMemoryCommitment[]
  userCorrections: AlicizationWorkingMemoryCorrection[]
  relationshipPosture: AlicizationWorkingMemoryRelationshipPosture | null
  emotionalPosture: AlicizationWorkingMemoryEmotionalPosture | null
  executionState: AlicizationWorkingMemoryExecutionState | null
  memoryQueryHints: string[]
  longTermCandidates: AlicizationWorkingMemoryLongTermCandidate[]
  compression: AlicizationWorkingMemoryCompressionState
  audit: AlicizationWorkingMemoryAuditState
}

export interface AlicizationWorkingMemoryQualityView {
  version: 'working-memory-quality-view-v1'
  scope: {
    cardId: string
    sessionId: string
    updatedAt: number
    turnRange: AlicizationWorkingMemorySnapshot['turnRange']
  }
  modules: {
    thread: {
      title: string | null
      currentUserMove: string | null
      currentAliceMove: string | null
      primaryAnchor: string | null
      mode: AlicizationWorkingMemoryThread['mode'] | null
      shouldHold: boolean | null
      confidence: number | null
    }
    task: {
      summary: string | null
      status: AlicizationWorkingMemoryTask['status'] | null
      evidenceTurnIds: string[]
    }
    compressedTimeline: Array<{
      summary: string
      thread: string | null
      sourceTurnIds: string[]
    }>
    unresolvedQuestions: string[]
    memoryQueryHints: string[]
    commitments: string[]
    corrections: Array<{
      text: string
      scope: AlicizationWorkingMemoryCorrection['scope']
    }>
    relationshipPosture: AlicizationWorkingMemoryRelationshipPosture | null
    emotionalPosture: AlicizationWorkingMemoryEmotionalPosture | null
    executionState: AlicizationWorkingMemoryExecutionState | null
    compression: AlicizationWorkingMemoryCompressionState
    audit: AlicizationWorkingMemoryAuditState
    longTermCandidates: AlicizationWorkingMemoryLongTermCandidate[]
  }
}

export interface AlicizationPersonaTrainingDatasetConsentSnapshot {
  granted: boolean
  policyVersion: string
  scope: string
  capturedAt?: number
}

export interface AlicizationPersonaTrainingDatasetCleaningProvenance {
  kind: 'working-memory-cleaning'
  cleaningTransactionId: string
  cleanedAt: number
}

export type AlicizationPersonaTrainingSourceKind
  = 'cleaned-long-term-reflection'
    | 'persona-reinforcement'

export interface AlicizationPersonaTrainingSourceRef {
  sourceId: string
  sourceKind: AlicizationPersonaTrainingSourceKind
}

export interface AlicizationPersonaTrainingDatasetExample {
  id: string
  datasetId: string
  cardId: string
  schemaVersion: string
  sourceId: string
  sourceKind: AlicizationPersonaTrainingSourceKind
  contentHash: string
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  sensitivity: string
  piiStatus: 'clear' | 'detected' | 'not-checked'
  piiReason: string | null
  consentSnapshot: AlicizationPersonaTrainingDatasetConsentSnapshot
  provenance?: AlicizationPersonaTrainingDatasetCleaningProvenance | null
  allowTraining: boolean
  state: 'staged' | 'quarantined' | 'revoked'
  createdAt: number
  revokedAt?: number | null
}

export interface AlicizationPersonaTrainingDatasetVersion {
  id: string
  cardId: string
  version: number
  schemaVersion: string
  consentSnapshot: AlicizationPersonaTrainingDatasetConsentSnapshot
  createdAt: number
  exportedAt: number | null
  activeAt: number | null
  rolledBackAt: number | null
}

export interface AlicizationPersonaTrainingDatasetManifest {
  datasetId: string
  cardId: string
  version: number
  schemaVersion: string
  exportedAt: number
  consentSnapshot: AlicizationPersonaTrainingDatasetConsentSnapshot
  exampleCount: number
  examples: Array<{
    id: string
    sourceId: string
    sourceKind: AlicizationPersonaTrainingDatasetExample['sourceKind']
    schemaVersion: string
    contentHash: string
    provenance: AlicizationPersonaTrainingDatasetCleaningProvenance
    behaviorLesson: string
    positiveExample: string
    negativeExample: string | null
  }>
  manifestHash: string
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
  expectedTopIds?: string[]
  bundle: AlicizationLongTermMemoryEvidenceBundle
  topIds: string[]
  metrics: AlicizationMemoryQualityLongTermMetrics
  trace: AlicizationMemoryQualityLongTermTrace
  passed: boolean
}

export interface AlicizationLongTermMemoryHarnessResult extends AlicizationMemoryQualityLongTermResult {
  hitRate: number
  precisionAtK: number
  mrr: number
  falseRecallCount: number
  sourceTraceRate: number
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
  compressedSnapshot: AlicizationWorkingMemorySnapshot
  view: AlicizationWorkingMemoryQualityView
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
  longTerm: AlicizationLongTermMemoryHarnessResult[]
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
  dataset: AlicizationPersonaTrainingDatasetVersion
  manifest: AlicizationPersonaTrainingDatasetManifest
  examples: AlicizationPersonaTrainingDatasetExample[]
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
    compressedSnapshot: AlicizationWorkingMemorySnapshot
    baseline: AlicizationLongTermMemoryHarnessResult
    compressed: AlicizationLongTermMemoryHarnessResult
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
    result: AlicizationLongTermMemoryHarnessResult
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
  status: 'queued' | 'running' | 'paused' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
  stage: 'projection-refresh-queued' | 'projection-refresh-running' | 'embedding-indexing' | 'completed' | 'cancelled' | 'failed'
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
    status: 'queued' | 'running' | 'paused' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
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
  resourceMetrics?: {
    dimensions: number
    vectorInput: 'deterministic' | 'provider' | 'unavailable'
    elapsedMs: number
    peakRssBytes: number
    sqliteBytes: number
    sqliteWalBytes: number
    cpuUserMs: number
    cpuSystemMs: number
  }
  resourcePreflight?: {
    passed: boolean
    requiredDiskBytes: number
    availableDiskBytes: number
    requiredMemoryBytes: number
    availableMemoryBytes: number
    failures: string[]
  } | null
  evidence?: {
    gate: 'adapter-smoke' | 'production'
    resourcePreflight: {
      passed: boolean
      requiredDiskBytes: number
      availableDiskBytes: number
      requiredMemoryBytes: number
      availableMemoryBytes: number
      failures: string[]
    } | null
    vectorInput: 'provider' | 'deterministic' | 'unavailable'
    searchMetrics: Array<{
      id: string
      vectorInput: 'provider' | 'deterministic' | 'unavailable' | undefined
      adapterImplementation: 'persistent-native' | 'test-double' | 'unknown' | undefined
      queryCount: number
      nonSelfQueryCount: number
      failures: string[]
    }>
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
    goldLabelCount: number
    goldRegressionPackId: string | null
    failingStageIds: string[]
    notRunStageIds: string[]
    optimizationFindingCount: number
    recommendedActionCount: number
    lastError: string | null
  }
  stages: Array<{
    stage:
      | 'dialogue-replay'
      | 'runtime-health'
      | 'working-memory-compression'
      | 'compressed-context-behavior'
      | 'long-term-recall'
      | 'temporal-conflict'
      | 'semantic-scale-soak'
      | 'experience-quality'
      | 'scope-fuzz'
      | 'gold-regression'
      | 'persona-dataset-hygiene'
      | 'final-replay-gate'
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
    version: 'memory-quality-harness-v1'
    passed: boolean
    createdAt: number
    summary: {
      longTermFixtureCount: number
      workingMemoryFixtureCount: number
      userTrialCount: number
      personaTrainingFixtureCount: number
      failingFixtureIds: string[]
      recallAtK: number
      recallAt1: number
      recallAt3: number
      recallAt5: number
      wrongThreadRate: number
      semanticHitRate: number
      sourceTraceRate: number
      abstentionPrecision: number
      abstentionRecall: number
      p50LatencyMs: number
      p95LatencyMs: number
      p99LatencyMs: number
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
  finalReplayGate?: AlicizationFinalReplayGateReportRecord | null
  goldRegressionPack: AlicizationMemoryQualityMonthlyGoldRegressionPack | null
  regression: {
    recallAt1: number
    recallAt3: number
    recallAt5: number
    wrongThreadRate: number
    semanticHitRate: number
    sourceTraceRate: number
    abstentionPrecision: number
    abstentionRecall: number
    p50LatencyMs: number
    p95LatencyMs: number
    p99LatencyMs: number
    staleMemoryLeakRate: number | null
    temporalUpdateAccuracy: number | null
    providerFailureRate: number
    queueFailureRate: number
    deadLetterRate: number
    embeddingCoverageRatio: number | null
  }
  compressedContextBehavior: AlicizationWorkingMemoryCompressionBehaviorReport | null
  temporalConflict: AlicizationLongTermMemoryTemporalConflictReport | null
  semanticScaleSoak: AlicizationMemorySemanticScaleSoakReport | null
  experienceQuality: AlicizationMemoryExperienceQualityReport | null
  scopeFuzz: AlicizationMemoryScopeFuzzReport | null
  recommendedNextActions: string[]
}

export interface AlicizationMemoryQualityTrialReportRecord {
  id: string
  cardId: string
  month: string
  mode: 'historical-replay' | 'live-provider'
  sessionId: string | null
  reportHash: string
  report: AlicizationMemoryQualityTrialReport
  createdAt: number
}

export type AlicizationMemoryQualityFailureCode
  = | 'timeout'
    | 'auth'
    | 'network'
    | 'recall'
    | 'database'
    | 'queue'
    | 'provider'
    | 'quality'

export type AlicizationMemoryQualityActionCode
  = | 'retry-timeout'
    | 'repair-auth'
    | 'repair-network'
    | 'repair-recall'
    | 'repair-database'
    | 'repair-queue'
    | 'repair-provider'
    | 'inspect-failure-stage'

export interface AlicizationMemoryQualityTrialSummarySurface {
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
  goldLabelCount: number
  goldRegressionPackId: string | null
  failingStageIds: string[]
  notRunStageIds: string[]
  optimizationFindingCount: number
  recommendedActionCount: number
  lastError: AlicizationMemoryQualityFailureCode | null
}

export interface AlicizationMemoryQualityTrialStageSurface {
  stage: AlicizationMemoryQualityTrialReport['stages'][number]['stage']
  id: string
  passed: boolean
  status?: 'not-run'
  itemCount: number
  error: AlicizationMemoryQualityFailureCode | null
}

export interface AlicizationMemoryDialogueReplaySummarySurface {
  turnCount: number
  succeededTurnCount: number
  failedTurnCount: number
  checkpointWriteCount: number
  personaWriteCount: number
  recalledEvidenceCount: number
  lastError: AlicizationMemoryQualityFailureCode | null
}

export interface AlicizationMemoryLiveProviderTrialSummarySurface {
  turnCount: number
  succeededTurnCount: number
  failedTurnCount: number
  recalledEvidenceCount: number
  providerCallCount: number
  providerRetryCount: number
  providerFailureRate: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  lastError: AlicizationMemoryQualityFailureCode | null
}

export interface AlicizationMemoryEmbeddingProgressSurface {
  jobId: string
  cardId: string
  status: AlicizationMemoryEmbeddingProgress['status']
  stage: AlicizationMemoryEmbeddingProgress['stage']
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
  lastError: AlicizationMemoryQualityFailureCode | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
  nextRetryAt: number | null
}

export interface AlicizationMemoryRuntimeHealthSurface {
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
    lastError: AlicizationMemoryQualityFailureCode | null
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
    lastError: AlicizationMemoryQualityFailureCode | null
    canonicalCount: number
    indexedCount: number
    missingCount: number
    textHashMismatchCount: number
    staleOrFailedCount: number
    orphanedCount: number
    coverageRatio: number | null
    reindexJob: AlicizationMemoryEmbeddingProgressSurface | null
  }
  errors: AlicizationMemoryQualityFailureCode[]
}

export interface AlicizationMemoryQualityMetricsSurface {
  longTermFixtureCount: number
  workingMemoryFixtureCount: number
  userTrialCount: number
  personaTrainingFixtureCount: number
  failingFixtureIds: string[]
  recallAtK: number
  recallAt1: number
  recallAt3: number
  recallAt5: number
  wrongThreadRate: number
  semanticHitRate: number
  sourceTraceRate: number
  abstentionPrecision: number
  abstentionRecall: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  compressionLossCount: number
  blockedLeakCount: number
  optimizationFindingCount: number
  lastError: AlicizationMemoryQualityFailureCode | null
}

export interface AlicizationMemoryQualityRegressionSurface {
  recallAt1: number
  recallAt3: number
  recallAt5: number
  wrongThreadRate: number
  semanticHitRate: number
  sourceTraceRate: number
  abstentionPrecision: number
  abstentionRecall: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  staleMemoryLeakRate: number | null
  temporalUpdateAccuracy: number | null
  providerFailureRate: number
  queueFailureRate: number
  deadLetterRate: number
  embeddingCoverageRatio: number | null
}

export interface AlicizationFinalReplayGateSurfaceMetrics {
  recallAt3: number | null
  precisionAt3: number | null
  wrongThreadRate: number | null
  templateLeakageFailCount: number | null
  authorityLeakCount: number | null
  localHumanlikeVisibleFallbackCount: number | null
  unsupportedSpecificityVisibleFailCount: number | null
  turnOsTraceCoverage: number | null
  learningOutcomeToSelfRevisionRoundtrip: number | null
  memoryClosureCoverage: number | null
  memoryClosureConflictClosureRate: number | null
  memoryClosureLowQualityWithholdRate: number | null
  memoryClosureUncertaintyLabelRate: number | null
  claimAccuracy: number | null
  replyAuthorityAccuracy: number | null
  latencyBudgetPass: boolean | null
  mindParticipation: number | null
  memoryParticipation: number | null
  personalityParticipation: number | null
  relationshipParticipation: number | null
  continuityParticipation: number | null
  misinternalizationRate: number | null
  sampleCount: number | null
  minimumSampleCount: number | null
  productionGoldSampleCount: number | null
  minimumProductionGoldSampleCount: number | null
  productionGoldCoverage: number | null
  independentProductionGoldSampleCount: number | null
  minimumIndependentProductionGoldSampleCount: number | null
  independentProductionGoldCoverage: number | null
}

export interface AlicizationFinalReplayGateSurface {
  version: 'final-replay-gate-v1'
  passed: boolean
  failingKeys: string[]
  metrics: AlicizationFinalReplayGateSurfaceMetrics
}

export interface AlicizationMemoryQualityTraceSurface {
  id: string
  fixtureId: string
  owner: 'LongTermMemoryRecall' | 'WorkingMemory' | 'PersonaTrainingDataset'
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
  } | null
  metrics: Record<string, number | null>
  error: AlicizationMemoryQualityFailureCode | null
  createdAt: number
}

export interface AlicizationMemoryQualityFindingSurface {
  code: AlicizationMemoryQualityOptimizationFinding['code']
  severity: 'critical' | 'warning' | 'info'
  fixtureId: string
  suggestedAction: AlicizationMemoryQualityActionCode | null
}

export interface AlicizationMemoryQualityTrialReportSurface {
  version: AlicizationMemoryQualityTrialReport['version']
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  summary: AlicizationMemoryQualityTrialSummarySurface
  stages: AlicizationMemoryQualityTrialStageSurface[]
  dialogueReplay: {
    version: AlicizationMemoryDialogueReplayReport['version']
    id: string
    passed: boolean
    createdAt: number
    summary: AlicizationMemoryDialogueReplaySummarySurface
  } | null
  liveProviderTrial: {
    version: AlicizationMemoryLiveProviderTrialReport['version']
    id: string
    cardId: string
    sessionId: string
    passed: boolean
    createdAt: number
    summary: AlicizationMemoryLiveProviderTrialSummarySurface
  } | null
  runtimeHealth: AlicizationMemoryRuntimeHealthSurface | null
  quality: {
    version: AlicizationMemoryQualityTrialReport['quality']['version']
    passed: boolean
    createdAt: number
    summary: AlicizationMemoryQualityMetricsSurface
    traces: AlicizationMemoryQualityTraceSurface[]
    findings: AlicizationMemoryQualityFindingSurface[]
    recommendedNextActions: AlicizationMemoryQualityActionCode[]
  }
  finalReplayGate?: AlicizationFinalReplayGateSurface | null
  regression: AlicizationMemoryQualityRegressionSurface
  recommendedNextActions: AlicizationMemoryQualityActionCode[]
}

export interface AlicizationMemoryQualityTrialReportRecordSurface {
  id: string
  cardId: string
  month: string
  mode: 'historical-replay' | 'live-provider'
  sessionId: string | null
  reportHash: string
  report: AlicizationMemoryQualityTrialReportSurface
  createdAt: number
}

export interface AlicizationMemoryQualityTrialReportListPayload {
  cardId: string
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryQualityTrialReportListResult {
  items: AlicizationMemoryQualityTrialReportRecord[]
  nextCursor: string | null
}

export interface AlicizationMemoryQualityTrialReportSurfaceListResult {
  items: AlicizationMemoryQualityTrialReportRecordSurface[]
  nextCursor: string | null
}

function projectAlicizationMemoryQualityFailureSurface(value: string | null): AlicizationMemoryQualityFailureCode | null {
  if (!value?.trim())
    return null

  const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase()
  if (/timed?\s*out|timeout|deadline exceeded|超时/u.test(normalized))
    return 'timeout'
  if (/unauthorized|forbidden|authentication|authorization|credential|api[_ -]?key|invalid key|http\s*(?:401|403)|认证|鉴权|凭证|密钥/u.test(normalized))
    return 'auth'
  if (/network|socket|connect|connection|dns|econn|enotfound|offline|网络|连接|离线/u.test(normalized))
    return 'network'
  if (/recall|retrieval|long[- ]term memory|召回|回想|长期记忆/u.test(normalized))
    return 'recall'
  if (/sqlite|database|\bdb\b|database is locked|数据库|本地记忆/u.test(normalized))
    return 'database'
  if (/queue|dead[- ]?letter|cleaning|队列|死信|清理/u.test(normalized))
    return 'queue'
  if (/provider|embedding|model|http\s*\d{3}|rate limit|模型服务|向量模型|限流/u.test(normalized))
    return 'provider'
  return 'quality'
}

function projectAlicizationMemoryQualityRecommendedActionsSurface(values: string[]): AlicizationMemoryQualityActionCode[] {
  const actions = values.flatMap<AlicizationMemoryQualityActionCode>((value) => {
    switch (projectAlicizationMemoryQualityFailureSurface(value)) {
      case 'timeout':
        return ['retry-timeout']
      case 'auth':
        return ['repair-auth']
      case 'network':
        return ['repair-network']
      case 'recall':
        return ['repair-recall']
      case 'database':
        return ['repair-database']
      case 'queue':
        return ['repair-queue']
      case 'provider':
        return ['repair-provider']
      default:
        return ['inspect-failure-stage']
    }
  })
  return [...new Set(actions)]
}

function projectBoundedQualityIds(values: unknown, limit = 64) {
  if (!Array.isArray(values))
    return []
  return [...new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim().slice(0, 240))
    .filter(Boolean))]
    .slice(0, limit)
}

const stableQualityRankReasonCodes = new Set([
  'semantic-match',
  'lexical-match',
  'scope-match',
  'scope-mismatch',
  'target-kind',
  'entity-match',
  'episodic-match',
  'shared-activity',
  'high-salience',
  'high-confidence',
  'temporal-fit',
  'wrong-thread-penalty',
  'sensitivity-limited',
  'working-memory:retained',
  'confirmed-evidence',
  'query-match',
  'rrf:lexical:query-overlap',
  'rrf:structured:thread-fit',
  'rrf:structured:target-kind',
  'rrf:structured:structured-fit',
  'rrf:semantic:semantic-score',
  'rrf:episodic:episodic-temporal-fit',
  'rrf:consolidation:consolidation-fit',
])

function projectBoundedQualityRankReasons(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return {}

  return Object.fromEntries(Object.entries(value)
    .slice(0, 64)
    .flatMap(([id, reasons]) => {
      const projectedReasons = Array.isArray(reasons)
        ? [...new Set(reasons
            .filter((reason): reason is string => typeof reason === 'string')
            .map(reason => reason.trim().replace(/\s+/g, ' ').slice(0, 160))
            .filter(reason => stableQualityRankReasonCodes.has(reason))
            .filter(Boolean))]
            .slice(0, 8)
        : []
      return projectedReasons.length > 0
        ? [[id.trim().slice(0, 240), projectedReasons] as const]
        : []
    }))
}

function projectQualityNumericMetrics(
  value: unknown,
  keys: readonly string[],
): Record<string, number | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return {}

  const metrics = value as Record<string, unknown>
  return Object.fromEntries(keys.map(key => [
    key,
    projectQualityNumber(metrics[key]),
  ]))
}

function projectQualityNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function projectQualityBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function projectAlicizationFinalReplayGateSurface(
  report: AlicizationFinalReplayGateReportRecord | null | undefined,
): AlicizationFinalReplayGateSurface | null {
  if (!report || typeof report !== 'object' || !report.metrics || typeof report.metrics !== 'object')
    return null

  const metrics = report.metrics as Record<string, unknown>
  return {
    version: 'final-replay-gate-v1',
    passed: report.passed === true,
    failingKeys: projectBoundedQualityIds(report.failingKeys),
    metrics: {
      recallAt3: projectQualityNumber(metrics.recallAt3),
      precisionAt3: projectQualityNumber(metrics.precisionAt3),
      wrongThreadRate: projectQualityNumber(metrics.wrongThreadRate),
      templateLeakageFailCount: projectQualityNumber(metrics.templateLeakageFailCount),
      authorityLeakCount: projectQualityNumber(metrics.authorityLeakCount),
      localHumanlikeVisibleFallbackCount: projectQualityNumber(metrics.localHumanlikeVisibleFallbackCount),
      unsupportedSpecificityVisibleFailCount: projectQualityNumber(metrics.unsupportedSpecificityVisibleFailCount),
      turnOsTraceCoverage: projectQualityNumber(metrics.turnOsTraceCoverage),
      learningOutcomeToSelfRevisionRoundtrip: projectQualityNumber(metrics.learningOutcomeToSelfRevisionRoundtrip),
      memoryClosureCoverage: projectQualityNumber(metrics.memoryClosureCoverage),
      memoryClosureConflictClosureRate: projectQualityNumber(metrics.memoryClosureConflictClosureRate),
      memoryClosureLowQualityWithholdRate: projectQualityNumber(metrics.memoryClosureLowQualityWithholdRate),
      memoryClosureUncertaintyLabelRate: projectQualityNumber(metrics.memoryClosureUncertaintyLabelRate),
      claimAccuracy: projectQualityNumber(metrics.claimAccuracy),
      replyAuthorityAccuracy: projectQualityNumber(metrics.replyAuthorityAccuracy),
      latencyBudgetPass: projectQualityBoolean(metrics.latencyBudgetPass),
      mindParticipation: projectQualityNumber(metrics.mindParticipation),
      memoryParticipation: projectQualityNumber(metrics.memoryParticipation),
      personalityParticipation: projectQualityNumber(metrics.personalityParticipation),
      relationshipParticipation: projectQualityNumber(metrics.relationshipParticipation),
      continuityParticipation: projectQualityNumber(metrics.continuityParticipation),
      misinternalizationRate: projectQualityNumber(metrics.misinternalizationRate),
      sampleCount: projectQualityNumber(metrics.sampleCount),
      minimumSampleCount: projectQualityNumber(metrics.minimumSampleCount),
      productionGoldSampleCount: projectQualityNumber(metrics.productionGoldSampleCount),
      minimumProductionGoldSampleCount: projectQualityNumber(metrics.minimumProductionGoldSampleCount),
      productionGoldCoverage: projectQualityNumber(metrics.productionGoldCoverage),
      independentProductionGoldSampleCount: projectQualityNumber(metrics.independentProductionGoldSampleCount),
      minimumIndependentProductionGoldSampleCount: projectQualityNumber(metrics.minimumIndependentProductionGoldSampleCount),
      independentProductionGoldCoverage: projectQualityNumber(metrics.independentProductionGoldCoverage),
    },
  }
}

function projectAlicizationMemoryQualityTraceSurface(
  trace: AlicizationMemoryQualityTrace,
): AlicizationMemoryQualityTraceSurface | null {
  if (
    !trace
    || typeof trace !== 'object'
    || (trace.owner !== 'LongTermMemoryRecall'
      && trace.owner !== 'WorkingMemory'
      && trace.owner !== 'PersonaTrainingDataset')
    || typeof trace.id !== 'string'
    || typeof trace.fixtureId !== 'string'
  ) {
    return null
  }
  const metricKeys = trace.owner === 'LongTermMemoryRecall'
    ? [
        'recallAtK',
        'precisionAtK',
        'mrr',
        'ndcg',
        'falseRecallRate',
        'wrongThreadRate',
        'blockedLeakCount',
        'semanticHitRate',
        'sourceTraceRate',
        'latencyMs',
      ] as const
    : trace.owner === 'WorkingMemory'
      ? [
          'obligationRetentionRate',
          'correctionRetentionRate',
          'commitmentRetentionRate',
          'failureTransparencyRetentionRate',
          'candidateBoundaryViolationCount',
          'compressionLossCount',
        ] as const
      : [
          'acceptedSourceCount',
          'stagedExampleCount',
          'quarantinedExampleCount',
          'rejectedSourceCount',
          'exportedExampleCount',
          'expectedExportMissCount',
          'forbiddenExportLeakCount',
          'expectedQuarantineMissCount',
          'expectedRejectMissCount',
          'unsafeSourceExportLeakCount',
          'piiExportLeakCount',
          'templateResidueExportLeakCount',
          'consentLeakCount',
          'defaultTrainingLeakCount',
          'crossCardLeakCount',
          'missingProvenanceAcceptedCount',
          'dedupeCollisionCount',
          'dedupeGapCount',
          'sourceTraceRate',
        ] as const
  const base = {
    id: trace.id.trim().slice(0, 240),
    fixtureId: trace.fixtureId.trim().slice(0, 240),
    owner: trace.owner,
    selectedIds: projectBoundedQualityIds(trace.selectedIds),
    rejectedIds: projectBoundedQualityIds(trace.rejectedIds),
    forbiddenIds: projectBoundedQualityIds(trace.forbiddenIds),
    rankReasonsById: projectBoundedQualityRankReasons(trace.rankReasonsById),
    metrics: projectQualityNumericMetrics(trace.metrics, metricKeys),
    error: projectAlicizationMemoryQualityFailureSurface(trace.error),
    createdAt: Number.isFinite(trace.createdAt) ? trace.createdAt : 0,
  }
  if (trace.owner === 'LongTermMemoryRecall') {
    return {
      ...base,
      semantic: {
        available: trace.semantic.available === true,
        providerId: typeof trace.semantic.providerId === 'string' ? trace.semantic.providerId.trim().slice(0, 120) || null : null,
        modelId: typeof trace.semantic.modelId === 'string' ? trace.semantic.modelId.trim().slice(0, 160) || null : null,
        dimensions: projectQualityNumber(trace.semantic.dimensions),
        reindexRequired: trace.semantic.reindexRequired === true,
      },
    }
  }
  if (trace.owner === 'WorkingMemory') {
    return {
      ...base,
      semantic: null,
    }
  }
  return {
    ...base,
    semantic: null,
  }
}

function projectAlicizationMemoryQualityFindingSurface(
  finding: AlicizationMemoryQualityOptimizationFinding,
): AlicizationMemoryQualityFindingSurface {
  return {
    code: finding.code,
    severity: finding.severity,
    fixtureId: finding.fixtureId.trim().slice(0, 240),
    suggestedAction: projectAlicizationMemoryQualityRecommendedActionsSurface([finding.suggestedAction])[0] ?? null,
  }
}

function projectAlicizationMemoryQualitySummarySurface(
  summary: AlicizationMemoryQualityTrialReport['summary'],
) {
  return {
    dialogueReplayCount: summary.dialogueReplayCount,
    workingMemoryFixtureCount: summary.workingMemoryFixtureCount,
    compressedContextBehaviorFixtureCount: summary.compressedContextBehaviorFixtureCount,
    temporalConflictFixtureCount: summary.temporalConflictFixtureCount,
    semanticScaleSoakRunCount: summary.semanticScaleSoakRunCount,
    experienceQualityFixtureCount: summary.experienceQualityFixtureCount,
    scopeFuzzCaseCount: summary.scopeFuzzCaseCount,
    longTermFixtureCount: summary.longTermFixtureCount,
    userTrialCount: summary.userTrialCount,
    personaTrainingFixtureCount: summary.personaTrainingFixtureCount,
    goldLabelCount: summary.goldLabelCount,
    goldRegressionPackId: summary.goldRegressionPackId,
    failingStageIds: [...summary.failingStageIds],
    notRunStageIds: [...summary.notRunStageIds],
    optimizationFindingCount: summary.optimizationFindingCount,
    recommendedActionCount: summary.recommendedActionCount,
    lastError: projectAlicizationMemoryQualityFailureSurface(summary.lastError),
  }
}

function projectAlicizationMemoryQualityStageSurface(
  stage: AlicizationMemoryQualityTrialReport['stages'][number],
) {
  return {
    stage: stage.stage,
    id: stage.id,
    passed: stage.passed,
    status: stage.status,
    itemCount: stage.itemCount,
    error: projectAlicizationMemoryQualityFailureSurface(stage.error),
  }
}

function projectAlicizationMemoryDialogueReplaySummarySurface(
  summary: AlicizationMemoryDialogueReplayReport['summary'],
) {
  return {
    turnCount: summary.turnCount,
    succeededTurnCount: summary.succeededTurnCount,
    failedTurnCount: summary.failedTurnCount,
    checkpointWriteCount: summary.checkpointWriteCount,
    personaWriteCount: summary.personaWriteCount,
    recalledEvidenceCount: summary.recalledEvidenceCount,
    lastError: projectAlicizationMemoryQualityFailureSurface(summary.lastError),
  }
}

function projectAlicizationMemoryLiveProviderTrialSummarySurface(
  summary: AlicizationMemoryLiveProviderTrialReport['summary'],
) {
  return {
    turnCount: summary.turnCount,
    succeededTurnCount: summary.succeededTurnCount,
    failedTurnCount: summary.failedTurnCount,
    recalledEvidenceCount: summary.recalledEvidenceCount,
    providerCallCount: summary.providerCallCount,
    providerRetryCount: summary.providerRetryCount,
    providerFailureRate: summary.providerFailureRate,
    p50LatencyMs: summary.p50LatencyMs,
    p95LatencyMs: summary.p95LatencyMs,
    p99LatencyMs: summary.p99LatencyMs,
    lastError: projectAlicizationMemoryQualityFailureSurface(summary.lastError),
  }
}

function projectAlicizationMemoryEmbeddingProgressSurface(
  progress: AlicizationMemoryEmbeddingProgress,
) {
  return {
    jobId: progress.jobId,
    cardId: progress.cardId,
    status: progress.status,
    stage: progress.stage,
    modelId: progress.modelId,
    dimensions: progress.dimensions,
    vectorSpaceId: progress.vectorSpaceId,
    total: progress.total,
    pending: progress.pending,
    leased: progress.leased,
    indexed: progress.indexed,
    retryable: progress.retryable,
    deadLettered: progress.deadLettered,
    cancelled: progress.cancelled,
    progress: progress.progress,
    lastError: projectAlicizationMemoryQualityFailureSurface(progress.lastError),
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
    nextRetryAt: progress.nextRetryAt,
  }
}

function projectAlicizationMemoryRuntimeHealthSurface(
  health: NonNullable<AlicizationMemoryQualityTrialReport['runtimeHealth']>,
) {
  return {
    queue: {
      pending: health.queue.pending,
      review: health.queue.review,
      applied: health.queue.applied,
      failed: health.queue.failed,
      deadLettered: health.queue.deadLettered,
    },
    recall: {
      lastLatencyMs: health.recall.lastLatencyMs,
      p95LatencyMs: health.recall.p95LatencyMs,
      lastError: projectAlicizationMemoryQualityFailureSurface(health.recall.lastError),
    },
    embedding: {
      providerConfigured: health.embedding.providerConfigured,
      modelId: health.embedding.modelId,
      dimensions: health.embedding.dimensions,
      vectorSpaceId: health.embedding.vectorSpaceId,
      reindexRequired: health.embedding.reindexRequired,
      indexMode: health.embedding.indexMode,
      approximate: health.embedding.approximate,
      degraded: health.embedding.degraded,
      nativeIndexReady: health.embedding.nativeIndexReady,
      searchReady: health.embedding.searchReady,
      lastError: projectAlicizationMemoryQualityFailureSurface(health.embedding.lastError),
      canonicalCount: health.embedding.canonicalCount,
      indexedCount: health.embedding.indexedCount,
      missingCount: health.embedding.missingCount,
      textHashMismatchCount: health.embedding.textHashMismatchCount,
      staleOrFailedCount: health.embedding.staleOrFailedCount,
      orphanedCount: health.embedding.orphanedCount,
      coverageRatio: health.embedding.coverageRatio,
      reindexJob: health.embedding.reindexJob
        ? projectAlicizationMemoryEmbeddingProgressSurface(health.embedding.reindexJob)
        : null,
    },
    errors: health.errors
      .map(projectAlicizationMemoryQualityFailureSurface)
      .filter((error): error is AlicizationMemoryQualityFailureCode => error !== null),
  }
}

function projectAlicizationMemoryQualitySummaryMetricsSurface(
  summary: AlicizationMemoryQualityTrialReport['quality']['summary'],
) {
  return {
    longTermFixtureCount: summary.longTermFixtureCount,
    workingMemoryFixtureCount: summary.workingMemoryFixtureCount,
    userTrialCount: summary.userTrialCount,
    personaTrainingFixtureCount: summary.personaTrainingFixtureCount,
    failingFixtureIds: [...summary.failingFixtureIds],
    recallAtK: summary.recallAtK,
    recallAt1: summary.recallAt1,
    recallAt3: summary.recallAt3,
    recallAt5: summary.recallAt5,
    wrongThreadRate: summary.wrongThreadRate,
    semanticHitRate: summary.semanticHitRate,
    sourceTraceRate: summary.sourceTraceRate,
    abstentionPrecision: summary.abstentionPrecision,
    abstentionRecall: summary.abstentionRecall,
    p50LatencyMs: summary.p50LatencyMs,
    p95LatencyMs: summary.p95LatencyMs,
    p99LatencyMs: summary.p99LatencyMs,
    compressionLossCount: summary.compressionLossCount,
    blockedLeakCount: summary.blockedLeakCount,
    optimizationFindingCount: summary.optimizationFindingCount,
    lastError: projectAlicizationMemoryQualityFailureSurface(summary.lastError),
  }
}

function projectAlicizationMemoryRegressionSurface(
  regression: AlicizationMemoryQualityTrialReport['regression'],
) {
  return {
    recallAt1: regression.recallAt1,
    recallAt3: regression.recallAt3,
    recallAt5: regression.recallAt5,
    wrongThreadRate: regression.wrongThreadRate,
    semanticHitRate: regression.semanticHitRate,
    sourceTraceRate: regression.sourceTraceRate,
    abstentionPrecision: regression.abstentionPrecision,
    abstentionRecall: regression.abstentionRecall,
    p50LatencyMs: regression.p50LatencyMs,
    p95LatencyMs: regression.p95LatencyMs,
    p99LatencyMs: regression.p99LatencyMs,
    staleMemoryLeakRate: regression.staleMemoryLeakRate,
    temporalUpdateAccuracy: regression.temporalUpdateAccuracy,
    providerFailureRate: regression.providerFailureRate,
    queueFailureRate: regression.queueFailureRate,
    deadLetterRate: regression.deadLetterRate,
    embeddingCoverageRatio: regression.embeddingCoverageRatio,
  }
}

export function projectAlicizationMemoryQualityTrialReportSurface(
  report: AlicizationMemoryQualityTrialReport,
): AlicizationMemoryQualityTrialReportSurface {
  return {
    version: report.version,
    id: report.id,
    cardId: report.cardId,
    createdAt: report.createdAt,
    passed: report.passed,
    summary: projectAlicizationMemoryQualitySummarySurface(report.summary),
    stages: report.stages.map(projectAlicizationMemoryQualityStageSurface),
    dialogueReplay: report.dialogueReplay
      ? {
          version: report.dialogueReplay.version,
          id: report.dialogueReplay.id,
          passed: report.dialogueReplay.passed,
          createdAt: report.dialogueReplay.createdAt,
          summary: projectAlicizationMemoryDialogueReplaySummarySurface(report.dialogueReplay.summary),
        }
      : null,
    liveProviderTrial: report.liveProviderTrial
      ? {
          version: report.liveProviderTrial.version,
          id: report.liveProviderTrial.id,
          cardId: report.liveProviderTrial.cardId,
          sessionId: report.liveProviderTrial.sessionId,
          passed: report.liveProviderTrial.passed,
          createdAt: report.liveProviderTrial.createdAt,
          summary: projectAlicizationMemoryLiveProviderTrialSummarySurface(report.liveProviderTrial.summary),
        }
      : null,
    runtimeHealth: report.runtimeHealth ? projectAlicizationMemoryRuntimeHealthSurface(report.runtimeHealth) : null,
    quality: {
      version: report.quality.version,
      passed: report.quality.passed,
      createdAt: report.quality.createdAt,
      summary: projectAlicizationMemoryQualitySummaryMetricsSurface(report.quality.summary),
      traces: report.quality.traces.flatMap((trace) => {
        const projected = projectAlicizationMemoryQualityTraceSurface(trace)
        return projected ? [projected] : []
      }),
      findings: report.quality.optimizationFindings.map(projectAlicizationMemoryQualityFindingSurface),
      recommendedNextActions: projectAlicizationMemoryQualityRecommendedActionsSurface(report.quality.recommendedNextActions),
    },
    finalReplayGate: projectAlicizationFinalReplayGateSurface(report.finalReplayGate),
    regression: projectAlicizationMemoryRegressionSurface(report.regression),
    recommendedNextActions: projectAlicizationMemoryQualityRecommendedActionsSurface(report.recommendedNextActions),
  }
}

export function projectAlicizationMemoryQualityTrialReportRecordSurface(
  record: AlicizationMemoryQualityTrialReportRecord,
): AlicizationMemoryQualityTrialReportRecordSurface {
  return {
    id: record.id,
    cardId: record.cardId,
    month: record.month,
    mode: record.mode,
    sessionId: record.sessionId,
    reportHash: record.reportHash,
    report: projectAlicizationMemoryQualityTrialReportSurface(record.report),
    createdAt: record.createdAt,
  }
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

export type AlicizationWorkingMemoryCleaningQueueStatus
  = | 'pending-cleaning'
    | 'failed'
    | 'dead-lettered'

export interface AlicizationWorkingMemoryCleaningQueueItem {
  itemId: string
  source: string
  sourceId: string
  status: AlicizationWorkingMemoryCleaningQueueStatus
  attemptCount: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  nextAttemptAt: number | null
}

export interface AlicizationWorkingMemoryCleaningQueuePayload {
  cardId: string
  action?: 'list' | 'retry-dead-letter'
  itemIds?: string[]
  limit?: number
  cursor?: string | null
}

export interface AlicizationWorkingMemoryCleaningQueueResult {
  items: AlicizationWorkingMemoryCleaningQueueItem[]
  nextCursor: string | null
  retried: AlicizationWorkingMemoryCleaningQueueItem[]
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
  trainingReady?: boolean
  dialogueReady?: boolean
  compatibilityReason?: string | null
  format?: 'gguf' | 'mlx-safetensors' | 'unknown'
  producerBackend?: 'mlx-lm' | 'external' | 'unknown'
  loaderTarget?: 'llama.cpp' | 'mlx-runtime' | 'unknown'
  conversion?: {
    status: 'not-required' | 'required' | 'completed' | 'failed'
    sourceArtifactId?: string | null
    tool?: string | null
    version?: string | null
  }
  compatibility: {
    status: 'compatible' | 'incompatible' | 'unknown'
    baseModel: string
    reason?: string | null
  }
  activation:
    | {
      status: 'active'
      reason: string
      loaderId: string
      receiptId: string
      activatedAt: number
    }
    | {
      status: 'inactive' | 'unsupported'
      reason: string
      loaderId?: null
      receiptId?: null
      activatedAt?: null
    }
}

function invalidPersonaTrainingArtifact(reason: string): never {
  throw new Error(`invalid Alicization persona training artifact: ${reason}`)
}

function requirePersonaTrainingArtifactText(
  value: unknown,
  field: string,
  maxLength: number,
) {
  if (typeof value !== 'string')
    invalidPersonaTrainingArtifact(`${field} must be a string`)
  const normalized = value.trim()
  if (!normalized)
    invalidPersonaTrainingArtifact(`${field} is required`)
  if (normalized.length > maxLength)
    invalidPersonaTrainingArtifact(`${field} is too long`)
  if (normalized.includes('\0'))
    invalidPersonaTrainingArtifact(`${field} contains a null byte`)
  return normalized
}

export function parseAlicizationPersonaTrainingArtifact(
  value: unknown,
): AlicizationPersonaTrainingArtifact {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalidPersonaTrainingArtifact('value must be an object')
  const artifact = value as Record<string, unknown>
  if (artifact.schemaVersion !== 'alicization-persona-training-artifact-v1')
    invalidPersonaTrainingArtifact('schemaVersion is unsupported')
  if (artifact.kind !== 'lora-adapter')
    invalidPersonaTrainingArtifact('kind is unsupported')

  const artifactId = requirePersonaTrainingArtifactText(artifact.artifactId, 'artifactId', 160)
  const runId = requirePersonaTrainingArtifactText(artifact.runId, 'runId', 160)
  const path = requirePersonaTrainingArtifactText(artifact.path, 'path', 4_096)
  const sha256 = requirePersonaTrainingArtifactText(artifact.sha256, 'sha256', 64).toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(sha256))
    invalidPersonaTrainingArtifact('sha256 must be a 64-character hexadecimal digest')
  const sizeBytes = Number(artifact.sizeBytes)
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)
    invalidPersonaTrainingArtifact('sizeBytes must be a non-negative safe integer')
  const baseModel = requirePersonaTrainingArtifactText(artifact.baseModel, 'baseModel', 1_024)
  const trainingReady = artifact.trainingReady == null
    ? undefined
    : typeof artifact.trainingReady === 'boolean'
      ? artifact.trainingReady
      : invalidPersonaTrainingArtifact('trainingReady must be a boolean')
  const dialogueReady = artifact.dialogueReady == null
    ? undefined
    : typeof artifact.dialogueReady === 'boolean'
      ? artifact.dialogueReady
      : invalidPersonaTrainingArtifact('dialogueReady must be a boolean')
  const artifactCompatibilityReason = Object.prototype.hasOwnProperty.call(artifact, 'compatibilityReason')
    ? artifact.compatibilityReason === null
      ? null
      : artifact.compatibilityReason === undefined
        ? undefined
        : requirePersonaTrainingArtifactText(artifact.compatibilityReason, 'compatibilityReason', 2_048)
    : undefined
  const format = artifact.format == null
    ? undefined
    : ['gguf', 'mlx-safetensors', 'unknown'].includes(String(artifact.format))
        ? artifact.format as AlicizationPersonaTrainingArtifact['format']
        : invalidPersonaTrainingArtifact('format is unsupported')
  const producerBackend = artifact.producerBackend == null
    ? undefined
    : ['mlx-lm', 'external', 'unknown'].includes(String(artifact.producerBackend))
        ? artifact.producerBackend as AlicizationPersonaTrainingArtifact['producerBackend']
        : invalidPersonaTrainingArtifact('producerBackend is unsupported')
  const loaderTarget = artifact.loaderTarget == null
    ? undefined
    : ['llama.cpp', 'mlx-runtime', 'unknown'].includes(String(artifact.loaderTarget))
        ? artifact.loaderTarget as AlicizationPersonaTrainingArtifact['loaderTarget']
        : invalidPersonaTrainingArtifact('loaderTarget is unsupported')

  const compatibilityRaw = artifact.compatibility
  if (!compatibilityRaw || typeof compatibilityRaw !== 'object' || Array.isArray(compatibilityRaw))
    invalidPersonaTrainingArtifact('compatibility must be an object')
  const compatibility = compatibilityRaw as Record<string, unknown>
  if (
    typeof compatibility.status !== 'string'
    || !['compatible', 'incompatible', 'unknown'].includes(compatibility.status)
  ) {
    invalidPersonaTrainingArtifact('compatibility.status is unsupported')
  }
  const compatibilityBaseModel = requirePersonaTrainingArtifactText(
    compatibility.baseModel,
    'compatibility.baseModel',
    1_024,
  )
  const compatibilityFieldReason = Object.prototype.hasOwnProperty.call(compatibility, 'reason')
    ? compatibility.reason === null
      ? null
      : compatibility.reason === undefined
        ? undefined
        : requirePersonaTrainingArtifactText(compatibility.reason, 'compatibility.reason', 2_048)
    : undefined

  const activationRaw = artifact.activation
  if (!activationRaw || typeof activationRaw !== 'object' || Array.isArray(activationRaw))
    invalidPersonaTrainingArtifact('activation must be an object')
  const activation = activationRaw as Record<string, unknown>
  if (activation.status !== 'active' && activation.status !== 'inactive' && activation.status !== 'unsupported')
    invalidPersonaTrainingArtifact('activation.status is unsupported')
  const activationReason = requirePersonaTrainingArtifactText(
    activation.reason,
    'activation.reason',
    2_048,
  )
  const parsedActivation: AlicizationPersonaTrainingArtifact['activation'] = activation.status === 'active'
    ? {
        status: 'active',
        reason: activationReason,
        loaderId: requirePersonaTrainingArtifactText(activation.loaderId, 'activation.loaderId', 256),
        receiptId: requirePersonaTrainingArtifactText(activation.receiptId, 'activation.receiptId', 512),
        activatedAt: (() => {
          if (
            typeof activation.activatedAt !== 'number'
            || !Number.isSafeInteger(activation.activatedAt)
            || activation.activatedAt < 0
          ) {
            invalidPersonaTrainingArtifact('activation.activatedAt must be a non-negative safe integer')
          }
          return activation.activatedAt
        })(),
      }
    : {
        status: activation.status,
        reason: activationReason,
      }

  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId,
    runId,
    kind: 'lora-adapter',
    path,
    sha256,
    sizeBytes,
    baseModel,
    ...(trainingReady == null ? {} : { trainingReady }),
    ...(dialogueReady == null ? {} : { dialogueReady }),
    ...(artifactCompatibilityReason === undefined ? {} : { compatibilityReason: artifactCompatibilityReason }),
    ...(format ? { format } : {}),
    ...(producerBackend ? { producerBackend } : {}),
    ...(loaderTarget ? { loaderTarget } : {}),
    ...(artifact.conversion && typeof artifact.conversion === 'object' && !Array.isArray(artifact.conversion)
      ? {
          conversion: {
            status: ['not-required', 'required', 'completed', 'failed'].includes(String((artifact.conversion as Record<string, unknown>).status))
              ? (artifact.conversion as Record<string, unknown>).status as NonNullable<AlicizationPersonaTrainingArtifact['conversion']>['status']
              : invalidPersonaTrainingArtifact('conversion.status is unsupported'),
            sourceArtifactId: typeof (artifact.conversion as Record<string, unknown>).sourceArtifactId === 'string'
              ? (artifact.conversion as Record<string, unknown>).sourceArtifactId as string
              : null,
            tool: typeof (artifact.conversion as Record<string, unknown>).tool === 'string'
              ? (artifact.conversion as Record<string, unknown>).tool as string
              : null,
            version: typeof (artifact.conversion as Record<string, unknown>).version === 'string'
              ? (artifact.conversion as Record<string, unknown>).version as string
              : null,
          },
        }
      : {}),
    compatibility: {
      status: compatibility.status as AlicizationPersonaTrainingArtifact['compatibility']['status'],
      baseModel: compatibilityBaseModel,
      ...(compatibilityFieldReason === undefined ? {} : { reason: compatibilityFieldReason }),
    },
    activation: parsedActivation,
  }
}

export interface AlicizationPersonaTrainingPipelineIncrement {
  id: string
  kind: 'persona-lora-increment'
  cardId: string
  datasetId: string
  manifestHash: string
  sourceRefs: AlicizationPersonaTrainingSourceRef[]
  basePersonaRevision: string
  artifact: AlicizationPersonaTrainingArtifact
  state: AlicizationPersonaTrainingPipelineIncrementState
  cleanup: {
    status: 'pending'
    stage: 'unload' | 'discard' | 'finalize'
    lastError: string | null
  } | null
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
    | 'terminalizing'
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
  baseModel: string
  timeoutMs: number
  backend?: 'external' | 'mlx-lm'
  iterations?: number
  learningRate?: number
  loraLayers?: number
  batchSize?: number
  maxSeqLength?: number
  maskPrompt?: boolean
  seed?: number
}

export interface AlicizationPersonaTrainingPipelineRunRecord {
  runId: string
  cardId: string
  datasetId: string
  manifestHash: string
  sourceRefs: AlicizationPersonaTrainingSourceRef[]
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
  backend: 'external' | 'mlx-lm'
  status: 'ready' | 'executable-missing' | 'model-unreadable' | 'mlx-lm-missing' | 'protocol-failure' | 'invalid-config'
  error: string | null
  diagnostic?: {
    action: 'none' | 'install-mlx-lm' | 'choose-readable-model' | 'configure-executable' | 'repair-protocol' | 'fix-configuration'
    command: string | null
  }
}

export interface AlicizationPersonaRuntimeConfig {
  backend?: 'llama.cpp' | 'mlx-runtime'
  executable: string
  modelPath: string
  host: string
  port: number
  modelAlias: string
  startupTimeoutMs: number
}

export interface AlicizationPersonaRuntimeConfigState {
  configured: boolean
  config: AlicizationPersonaRuntimeConfig | null
  active: boolean
  artifactId: string | null
  routeBaseUrl: string | null
  error: string | null
}

export interface AlicizationPersonaRuntimeConfigPayload {
  cardId: string
  config: AlicizationPersonaRuntimeConfig | null
}

export interface AlicizationPersonaRuntimeConnectionResult {
  ok: boolean
  executable: string
  baseUrl: string | null
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

export interface AlicizationPersonaTrainingDatasetRevokePayload extends AlicizationPersonaTrainingSourceRef {
  cardId: string
}

export type AlicizationPersonaTrainingSourceRevokeIntentStatus = 'pending' | 'failed' | 'completed'

export interface AlicizationPersonaTrainingSourceRevokeIntent {
  id: string
  cardId: string
  sourceId: string
  sourceKind: AlicizationPersonaTrainingSourceRef['sourceKind']
  reason: string
  status: AlicizationPersonaTrainingSourceRevokeIntentStatus
  attempts: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

export interface AlicizationPersonaTrainingSourceRevokeIntentListPayload {
  cardId: string
  status?: AlicizationPersonaTrainingSourceRevokeIntentStatus | 'all'
  limit?: number
}

export interface AlicizationPersonaTrainingSourceRevokeIntentRetryPayload {
  cardId: string
  intentId: string
}

export interface AlicizationPersonaTrainingSourceRevokeIntentResult {
  item: AlicizationPersonaTrainingSourceRevokeIntent | null
  items: AlicizationPersonaTrainingSourceRevokeIntent[]
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
