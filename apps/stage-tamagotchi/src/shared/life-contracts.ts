export type LifeOwner = 'self' | 'reflection' | 'motivation' | 'habit' | 'presence' | 'cognition' | 'emotion' | 'relationship' | 'goals' | 'memory' | 'expression' | 'soul' | 'initiative' | 'growth' | 'persona-development'
export interface LifeCapabilityEffects {
  version: 'life-capability-effects-v1'
  sideEffect: 'read' | 'mutation' | 'external' | 'unknown'
  retryClass: 'read-only' | 'verify-before-retry' | 'manual-only'
  verifier: 'returned-observation' | 'independent-goal-proof'
  compensation: 'none' | 'manual-review'
}

export interface LifeOwnerVersion {
  owner: LifeOwner
  revision: number
  contentHash: string
  metaKey: string
}

export interface LifeMetaChange {
  owner: LifeOwner
  key: string
  value: string
  expectedValue?: string | null
}

export interface LifeCommitInput {
  cardId: string
  operationKey: string
  changes: LifeMetaChange[]
  expectedRevision?: number
  expectedOwners?: LifeOwnerVersion[]
  expectedAbsentOwners?: LifeOwner[]
  source?: string
  ingressIds?: string[]
  mutations?: LifeMutation[]
}

export interface LifeCommitReceipt {
  status: 'committed' | 'duplicate'
  cardId: string
  commitId: string
  revision: number
  owners: LifeOwnerVersion[]
  committedAt: number
}

/** Snapshots retain active work and bounded history; exact historical commands provide a scope. */
export interface LifeStateReadScope {
  executionPlanId?: string
  obligationId?: string
  obligationIds?: string[]
}

export interface LifeStateView {
  execution?: import('./execution-contracts').ExecutionStateView
  backupRestore?: { backupId: string, status: 'restored-awaiting-review' }
  cardId: string
  revision: number
  owners: LifeOwnerVersion[]
  values: Record<string, string>
  obligations: LifeObligation[]
  ingress: LifeIngress[]
  effects: LifeEffect[]
  soulActivations: LifeSoulActivation[]
}

export interface LifeIngress {
  id: string
  kind: 'user-turn' | 'tool-result' | 'due' | 'feedback' | 'body-receipt' | 'system' | 'task-run'
  source: string
  sourceKey: string
  payloadHash: string
  payload: Record<string, unknown>
  occurredAt: number
  observedAt: number
  status: 'accepted' | 'processing' | 'settled' | 'held' | 'failed'
}

export type LifeInputReadSet
  = { kind: 'active-input', ingressId: string, payloadHash: string, inputHash: string }
    | { kind: 'absent-input', ingressId: string }

export interface LifeEffect {
  id: string
  operationKey: string
  kind: 'execute' | 'verify' | 'index' | 'reflect' | 'soul-activate'
  turnId: string | null
  actionId: string | null
  generation: number
  status: 'prepared' | 'claimed' | 'dispatched' | 'settled' | 'cancelled' | 'uncertain' | 'failed'
  payload: Record<string, unknown>
  receipt: Record<string, unknown> | null
  leaseUntil: number | null
}

export type LifeMutation
  = { type: 'persona-development', operation: import('./persona-development-mutations').PersonaDevelopmentMutation }
    | { type: 'execution-plan', plan: import('./execution-contracts').WorkPlan, expectedRevision: number }
    | { type: 'execution-verifiers-configure', registry: string, expectedHash: string }
    | { type: 'execution-criteria-revise', command: import('./execution-contracts').ExecutionCriteriaChange }
    | { type: 'execution-work-stop', command: import('./execution-contracts').ExecutionWorkStop }
    | { type: 'execution-recovery-assert', effectId: string, binding: string }
    | { type: 'execution-procedure-bind', threadId: string, candidateId: string, version: string }
    | { type: 'execution-procedure-observe-failure', planId: string, planRevision: number, generation: number, verificationId: string }
    | { type: 'execution-step-result', result: import('./execution-contracts').WorkStepResult, expectedState: import('./execution-contracts').WorkStep['state'] }
    | { type: 'execution-slice', slice: import('./execution-contracts').WorkSlice, expectedState: import('./execution-contracts').WorkSlice['state'] | null }
    | { type: 'ingress-accept', ingress: Omit<LifeIngress, 'observedAt' | 'status' | 'payloadHash'> }
    | { type: 'input-assert-current', readSet: LifeInputReadSet }
    | { type: 'input-resume', parentIngressId: string, expectedPayloadHash: string, childTurnId: string, conversationId: string }
    | { type: 'ingress-settle', id: string, status: LifeIngress['status'], nextAttemptAt?: number, expectedStatus?: LifeIngress['status'], expectedPayloadHash?: string }
    | { type: 'effect-prepare', effect: Omit<LifeEffect, 'status' | 'receipt' | 'leaseUntil'> }
    | { type: 'effect-transition', id: string, expected: LifeEffect['status'], status: LifeEffect['status'], receipt?: Record<string, unknown>, leaseUntil?: number, expectedSnapshot?: { generation: number, payloadHash: string, receiptHash: string } }
    | { type: 'obligation-create', obligation: LifeObligation, dedupeKey: string, schedule?: { taskId: string, message: string } }
    | { type: 'obligation-update', id: string, expectedGeneration: number, expectedRevision: number, status: LifeObligationStatus, dueAt?: number, turnId?: string, receiptId?: string }
    | { type: 'expression-record', receipt: LifeExpressionReceipt, presentationVerified: boolean }
    | { type: 'obligation-verify', id: string, expectedGeneration: number, expectedRevision: number, verification: LifeGoalVerification }
    | { type: 'obligation-restore-verify', id: string, expectedGeneration: number, expectedRevision: number, verification: LifeGoalVerification, restoreOperationId: string }
    | { type: 'reminder-generated', taskId: string, turnId: string, expectedGeneration: number }
    | { type: 'reminder-attempt-settle', taskId: string, expectedGeneration: number, status: 'pending' | 'failed', nextTriggerAt: number | null, reason: string | null }
    | { type: 'task-thread-project', threadId: string, requestHash: string }
    | { type: 'soul-prepare', intent: LifeSoulActivation }
    | { type: 'persona-evaluate', proposalId: string, evaluation: import('./life-persona-contracts').LifePersonaEvaluation }
    | { type: 'persona-review', proposalId: string, expectedEvaluationHash: string, approved: boolean }
    | { type: 'soul-transition', id: string, expected: LifeSoulActivation['status'], status: LifeSoulActivation['status'] }
    | { type: 'memory-fact-version', factId: string, provenance: LifeFactProvenance, cardinality: 'single' | 'multi', validFrom: number | null, validTo: number | null, temporalPrecision?: 'day' | 'unknown', evidence: LifeEvidenceRef[] }
    | { type: 'entity-register', entity: LifeEntity }
    | { type: 'runtime-event-link', eventId: string, turnId: string }
    | { type: 'appraisal-apply', appraisal: LifeAppraisalInput }
    | { type: 'evidence-invalidate', source: LifeEvidenceRef, mode: 'correction' | 'forget', reason: string }
    | { type: 'evidence-cleanup-resume', jobId: string }
    | { type: 'growth-save', key: string, snapshotJson: string, expectedValue: string | null }
    | { type: 'growth-evaluate', evaluation: import('./life-policy-contracts').LifePolicyEvaluation }
    | { type: 'growth-adopt', candidateId: string, expectedOwnerHash: string, expectedEvaluationHash: string }
    | { type: 'growth-consumed', key: string, candidateId: string, consumer: string, turnId: string }
    | { type: 'personal-project-bind', threadId: string, proof: LifeObligation['proof'], evidence: LifeEvidenceRef[] }
    | { type: 'surface-register', sessionId: string, surface: string }
    | { type: 'body-health', sessionId: string, health: { rendererState: 'pending' | 'loading' | 'mounted', renderer: string, modelSelected: boolean, canvasPresent: boolean, visiblePixels: 'unknown' | 'visible' | 'invisible', errorCode: string | null, nativeWindowVisible?: boolean } }
    | { type: 'outreach-reserve', evidenceKey: string, turnId: string }
    | { type: 'outreach-policy', policy: LifeOutreachPolicy, expectedPolicy?: LifeOutreachPolicy }
    | { type: 'outreach-boundary', turnId: string, quiet: boolean }
    | { type: 'project-experience-indexed', goalId: string, generation: number, episodeId: string, verificationId: string }
    | { type: 'project-share', goalId: string, generation: number, turnId: string, reviewId: string }
    | { type: 'project-feedback', goalId: string, generation: number, turnId: string, feedback: 'positive' | 'dismiss' | 'reply-within-120s', occurredAt: number }

export interface LifeOutreachPolicy { maximumPerDay: number, minimumIntervalMinutes: number, quietStartHour: number, quietEndHour: number, quietEnabled: boolean, timezone: string }
export const createDefaultLifeOutreachPolicy = (): LifeOutreachPolicy => ({ maximumPerDay: 3, minimumIntervalMinutes: 120, quietStartHour: 22, quietEndHour: 8, quietEnabled: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })

export interface LifeAppraisalInput {
  relationship?: { snapshot: Record<string, unknown> | null, baseline: Record<string, unknown> | null }
  causeKey: string
  turnId: string | null
  occurredAt: number
  parameterVersion: string
  dimensions: Record<string, number>
  snapshot: Record<string, unknown>
  baseline: Record<string, unknown> | null
  evidence: LifeEvidenceRef[]
}

export type LifeFactProvenance = 'observed' | 'reported' | 'inferred' | 'imagined' | 'fictional'
export interface LifeEvidenceRef { cardId: string, kind: string, id: string, version: string, usage?: 'current' | 'historical' }
export interface LifeEntity {
  id: string
  kind: 'host' | 'self' | 'person' | 'place' | 'project'
  name: string
  discriminators: Record<string, string>
  aliases: Array<{ name: string, scope: string, evidence: LifeEvidenceRef }>
}

export interface LifeFactVersion {
  streamId: string
  factId: string
  version: number
  recordedFrom: number
  recordedTo: number | null
  validFrom: number | null
  validTo: number | null
  subject: { kind: string, id?: string, name?: string }
  predicate: string
  value: unknown
  provenance: LifeFactProvenance
  lifecycle: 'candidate' | 'active' | 'disputed' | 'superseded' | 'revoked'
  evidence: LifeEvidenceRef[]
}

export interface LifeSoulActivation {
  developmentAuthorization?: import('./persona-development-contracts').PersonaDevelopmentAuthorization
  personaAuthorization?: { proposalId: string, evaluationHash: string }
  id: string
  baseHash: string
  targetHash: string
  stagedPath: string
  backupPath: string
  status: 'prepared' | 'file-replaced' | 'activated' | 'conflicted' | 'rolled-back' | 'failed'
  soulRevision: number
}

export interface LifeGoalVerification {
  id: string
  verdict: 'satisfied' | 'not-satisfied' | 'unknown' | 'stale'
  kind: LifeProofKind
  evidence: Record<string, unknown>
  verifiedAt: number
  independent: boolean
}

export type LifeObligationStatus = 'proposed' | 'accepted' | 'waiting' | 'in-progress' | 'verifying' | 'fulfilled' | 'blocked' | 'failed' | 'cancelled' | 'superseded'
export type LifeProofKind = 'file' | 'setting' | 'reminder' | 'user-reported' | 'interface-state' | 'composite'

export interface LifeObligation {
  procedureSource?: { candidateId: string, version: string }
  sourceAttemptId?: string | null
  personalTopic?: string
  personalOrigin?: 'self-initiated' | 'host-invited'
  personalAuthorship?: { effectId: string, episodeId: string, verifiedAt: number }
  personalChoice?: { proposalId: string, sourceReplyHash: string }
  personalDevelopment?: { shares: Array<{ turnId: string, reviewId: string }>, feedback: Array<{ turnId: string, feedback: 'positive' | 'dismiss' | 'reply-within-120s', occurredAt: number }> }
  personalActivity?: 'interest-note-v1' | 'creative-writing-v1' | 'practice-review-v1' | 'visual-study-v1'
  invalidatedBy?: LifeEvidenceRef | null
  invalidationMode?: 'correction' | 'forget' | null
  verification?: LifeGoalVerification | null
  cardId: string
  id: string
  generation: number
  revision: number
  kind: 'reminder' | 'task' | 'relationship' | 'personal-project'
  summary: string
  status: LifeObligationStatus
  sourceTurnId: string | null
  deliveryTurnId: string | null
  dueAt: number | null
  timezone: string | null
  threadId: string | null
  scheduledTaskId: string | null
  proof: { kind: LifeProofKind, acceptance?: import('./execution-contracts').TaskAcceptance, channel?: 'text-rendered' | 'audio-ended' | 'browser' | 'desktop', targetId?: string, path?: string, contentHash?: string, settingKey?: string, expectedValue?: string }
  receiptId: string | null
  createdAt: number
  updatedAt: number
}

export interface LifeExpressionReceipt {
  cardId: string
  receiptId: string
  deliveryId: string
  turnId: string
  utteranceId: string
  segmentId: string
  playbackEpoch: string
  surfaceSessionId: string
  sequence: number
  state: 'rendered' | 'audio-started' | 'audio-progress' | 'audio-ended' | 'audio-interrupted' | 'audio-failed'
  playedMs: number
  alignedTextEnd: number | null
  alignmentSource: 'tts' | 'viseme' | 'segment' | null
  /** Includes deliberate partial-delivery reasons such as `excerpt-only`. */
  errorCode: string | null
  occurredAt: number
}
