import type { LifeClosureRecord } from './life-closure-contracts'
import type { LifeCommitReceipt, LifeExpressionReceipt, LifeStateView } from './life-contracts'

import { defineInvokeEventa } from '@moeru/eventa'

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
