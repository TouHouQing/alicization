import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'

export const workDelegationCapabilities = ['coding_agent.codex', 'coding_agent.claude_code', 'coding_agent.cli'] as const
export type WorkDelegationCapability = typeof workDelegationCapabilities[number]

export interface WorkStepParent {
  version: 1
  cardId: string
  effectId: string
  planId: string
  planRevision: number
  rootThreadId: string
  rootObligationId: string
  obligationGeneration: number
  stepId: string
  attemptId: string
  capabilityId: WorkDelegationCapability
  inputHash: string
  approvalRef: string
}

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const positive = v.pipe(v.number(), v.integer(), v.minValue(1))
export const workStepParentSchema = v.strictObject({ version: v.literal(1), cardId: id, effectId: id, planId: id, planRevision: positive, rootThreadId: id, rootObligationId: id, obligationGeneration: positive, stepId: id, attemptId: id, capabilityId: v.picklist(workDelegationCapabilities), inputHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)), approvalRef: id })
export const workDelegationThreadId = (parent: Pick<WorkStepParent, 'cardId' | 'effectId'>) => `thread:work:${executionDigest({ cardId: parent.cardId, effectId: parent.effectId })}`
