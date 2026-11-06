import type { LifeClosureRecord } from './life-closure-contracts'
import type { LifeCommitReceipt, LifeExpressionReceipt, LifeStateView } from './life-contracts'

import { defineEventa, defineInvokeEventa } from '@moeru/eventa'

export const electronLifePersonaDevelopmentCommand = defineInvokeEventa<{ status: string }, import('./persona-development-contracts').PersonaDevelopmentCommand>('alicization:life:persona-development-command')
export const electronLifePersonaSources = defineInvokeEventa<import('./persona-development-contracts').PersonaSourcePreview[], { cardId: string, facetId: string, version: number }>('alicization:life:persona-sources')

export const electronLifeExecutionChanged = defineEventa<{ cardId: string, revision: number }>('alicization:life:execution-changed')
export const electronLifeAuthorizedBrowser = defineInvokeEventa<import('./authorized-browser-contracts').AuthorizedBrowserState, import('./authorized-browser-contracts').AuthorizedBrowserCommand>('alicization:life:authorized-browser')
export const electronLifeProcedure = defineInvokeEventa<import('./procedure-contracts').ProcedureCommandResult, import('./procedure-contracts').ProcedureCommand>('alicization:life:procedure')
export const electronLifeExecutionRecovery = defineInvokeEventa<import('./execution-recovery-contracts').ExecutionRecoveryResult, import('./execution-recovery-contracts').ExecutionRecoveryCommand>('alicization:life:execution-recovery')
export const electronLifeFileRecovery = defineInvokeEventa<import('./file-recovery-contracts').FileRecoveryResult, import('./file-recovery-contracts').FileRecoveryCommand>('alicization:life:file-recovery')

export const electronLifeBackupCommand = defineInvokeEventa<import('./life-backup-contracts').LifeBackupResult, import('./life-backup-contracts').LifeBackupCommand>('alicization:life:backup-command')

export interface LifeObligationCommand {
  cardId: string
  id: string
  operationId: string
  expectedGeneration: number
  expectedRevision: number
  action: 'cancel' | 'reschedule' | 'verify' | 'report-completed'
  dueAt?: number
}

export const electronLifeView = defineInvokeEventa<LifeStateView, { cardId: string }>('alicization:life:view')
export const electronLifeObligationHistory = defineInvokeEventa<import('./life-history-contracts').LifeObligationHistoryPage, import('./life-history-contracts').LifeObligationHistoryRequest>('alicization:life:obligation-history')
export const electronLifeExecutionStorage = defineInvokeEventa<import('./execution-storage-contracts').ExecutionStorageStatus, import('./execution-storage-contracts').ExecutionStorageCommand>('alicization:life:execution-storage')
export const electronLifeExecutionVerifiers = defineInvokeEventa<import('./execution-verification-contracts').ExecutionVerifierState, import('./execution-verification-contracts').ExecutionVerifierCommand>('alicization:life:execution-verifiers')
export const electronLifeExecutionPlan = defineInvokeEventa<LifeCommitReceipt, { cardId: string, plan: import('./execution-contracts').WorkPlan, expectedRevision: number, requestId: string }>('alicization:life:execution-plan')
export const electronLifeExecutionRun = defineInvokeEventa<{ state: string }, { cardId: string, planId: string, expectedRevision: number, requestId: string }>('alicization:life:execution-run')
export const electronLifeExecutionReobserve = defineInvokeEventa<{ state: string }, { cardId: string, planId: string, expectedRevision: number, requestId: string }>('alicization:life:execution-reobserve')
export const electronLifeExecutionRevise = defineInvokeEventa<{ state: string }, { cardId: string, planId: string, expectedRevision: number, stepId: string, changes: Record<string, string>, requestId: string }>('alicization:life:execution-revise')
export const electronLifeExecutionCriteriaChange = defineInvokeEventa<{ state: string }, import('./execution-contracts').ExecutionCriteriaChange>('alicization:life:execution-criteria-change')
export const electronLifeExecutionStop = defineInvokeEventa<{ state: string }, { cardId: string, planId: string, expectedRevision: number, requestId: string, action: 'pause' | 'cancel' }>('alicization:life:execution-stop')
export const electronLifeExecutionReview = defineInvokeEventa<{ state: string }, { cardId: string, obligationId: string, expectedGeneration: number, contractHash: string, criterionId: string, approved: boolean, requestId: string }>('alicization:life:execution-review')
export const electronLifeExecutionArtifact = defineInvokeEventa<{ state: string }, { cardId: string, obligationId: string, expectedGeneration: number, criterionId: string }>('alicization:life:execution-artifact')
export const electronLifeProjectFeedback = defineInvokeEventa<{ status: 'recorded' }, { cardId: string, goalId: string, generation: number, turnId: string, feedback: 'positive' | 'dismiss', operationId: string }>('alicization:life:project-feedback')
export interface LifeArtifactCommand { cardId: string, goalId: string, operationId: string, expectedGeneration: number, expectedHash: string }
export const electronLifeArtifactRestore = defineInvokeEventa<{ status: string }, LifeArtifactCommand>('alicization:life:artifact-restore')
export const electronLifePersonaCommand = defineInvokeEventa<{ status: string }, import('./life-persona-contracts').LifePersonaCommand>('alicization:life:persona-command')
export const electronLifeClosure = defineInvokeEventa<LifeClosureRecord, { cardId: string, turnId: string }>('alicization:life:closure')
export interface LifeInputPreview { ingressId: string, turnId: string, text: string | null, truncated: boolean, hasAttachments: boolean, occurredAt: number }
export const electronLifeInputPreview = defineInvokeEventa<LifeInputPreview, { cardId: string, ingressId: string, expectedPayloadHash: string }>('alicization:life:input-preview')
export const electronLifeInputCommand = defineInvokeEventa<{ status: 'copied' | 'discarded' | 'resumed', turnId?: string }, { cardId: string, ingressId: string, expectedPayloadHash: string, operationId: string, action: 'copy' | 'discard' | 'resume' }>('alicization:life:input-command')
export const electronLifeObligationCommand = defineInvokeEventa<LifeCommitReceipt, LifeObligationCommand>('alicization:life:obligation-command')
export const electronLifeSurfaceSession = defineInvokeEventa<{ id: string }, { cardId: string }>('alicization:life:surface-session')
export const electronLifeExpressionReceipt = defineInvokeEventa<LifeCommitReceipt & { presentationVerified: boolean }, LifeExpressionReceipt>('alicization:life:expression-receipt')
export const electronLifeBodyActivity = defineInvokeEventa<{ status: string }, { receipt: import('@proj-alicization/stage-shared').AlicizationBodyActivityReceipt, sessionId: string }>('alicization:life:body-activity')
export const electronLifePersonalProposalWithdraw = defineInvokeEventa<{ status: string }, { cardId: string, proposalId: string, expectedReplyHash: string }>('alicization:life:personal-proposal-withdraw')
export const electronLifeBodyHealth = defineInvokeEventa<LifeCommitReceipt, { cardId: string, sessionId: string, health: Extract<import('./life-contracts').LifeMutation, { type: 'body-health' }>['health'] }>('alicization:life:body-health')
export const electronLifeGrowthRollback = defineInvokeEventa<LifeCommitReceipt, { cardId: string, candidateId: string, operationId: string, expectedHash: string }>('alicization:life:growth-rollback')
export const electronLifePolicyCommand = defineInvokeEventa<{ status: string }, import('./life-policy-contracts').LifePolicyCommand>('alicization:life:policy-command')
export const electronLifeOutreachPolicy = defineInvokeEventa<LifeCommitReceipt, { cardId: string, operationId: string, policy: import('./life-contracts').LifeOutreachPolicy, expectedPolicy: import('./life-contracts').LifeOutreachPolicy }>('alicization:life:outreach-policy')
