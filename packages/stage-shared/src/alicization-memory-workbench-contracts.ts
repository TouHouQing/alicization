import type { AlicizationChatFailureKind } from './alicization-chat-failure-surface'
import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from './alicization-provider-response'
import type { AlicizationMemoryProvenance } from './alicization-transport-contracts'

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

export interface AlicizationPersonaTrainingDatasetExample {
  id: string
  datasetId: string
  cardId: string
  schemaVersion: string
  sourceId: string
  sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
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
      | 'persona-dataset-hygiene'
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
  const compatibilityReason = compatibility.reason == null
    ? null
    : requirePersonaTrainingArtifactText(compatibility.reason, 'compatibility.reason', 2_048)

  const activationRaw = artifact.activation
  if (!activationRaw || typeof activationRaw !== 'object' || Array.isArray(activationRaw))
    invalidPersonaTrainingArtifact('activation must be an object')
  const activation = activationRaw as Record<string, unknown>
  if (activation.status !== 'inactive' && activation.status !== 'unsupported')
    invalidPersonaTrainingArtifact('activation.status is unsupported')
  const activationReason = requirePersonaTrainingArtifactText(
    activation.reason,
    'activation.reason',
    2_048,
  )

  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId,
    runId,
    kind: 'lora-adapter',
    path,
    sha256,
    sizeBytes,
    baseModel,
    compatibility: {
      status: compatibility.status as AlicizationPersonaTrainingArtifact['compatibility']['status'],
      baseModel: compatibilityBaseModel,
      reason: compatibilityReason,
    },
    activation: {
      status: activation.status,
      reason: activationReason,
    },
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
