import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeGoalVerification, LifeMutation } from '../../../../shared/life-contracts'
import type { ProcedureRepairNotice } from '../../../../shared/procedure-contracts'
import type { AlicizationDbService } from '../db'
import type { ObligationRow } from '../life-obligation-repository'
import type { LifeTransaction } from '../life-transaction'
import type { ProcedureCandidate } from './procedure-candidate-repository'

import * as v from 'valibot'

import { applyLifeEvidenceInvalidation } from '../life-evidence-repository'
import { applyLifeIngress } from '../life-ingress-repository'
import { executionDigest } from './acceptance-compiler'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const repairSchema = v.strictObject({ reason: v.literal('acceptance-not-satisfied'), sourceThreadId: id, sourcePlanId: id, verificationId: id, evidenceHash: hash, observedAt: v.pipe(v.number(), v.integer(), v.minValue(1)) })

export async function readProcedureRepair(database: AlicizationDbService, candidate: ProcedureCandidate): Promise<ProcedureRepairNotice | null> {
  const entry = await database.getLifeIngress(`procedure-failure:${candidate.version}`)
  if (!entry)
    return null
  if (entry.kind !== 'system' || entry.source !== 'execution-procedure-failure' || entry.status !== 'settled' || entry.payload.candidateId !== `procedure:${candidate.version}` || entry.payload.version !== candidate.version)
    throw new Error('Procedure repair evidence lost its exact method version')
  return v.parse(repairSchema, entry.payload.repair)
}

/** Only the life writer can downgrade a method from an actual failed verification. */
export async function applyProcedureFailure(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'execution-procedure-observe-failure' }>) {
  const row = await tx.get<{ body_json: string }>('SELECT body_json FROM life_work_plans WHERE card_id=? AND plan_id=? ORDER BY revision DESC LIMIT 1', [tx.cardId, input.planId])
  const plan: WorkPlan | null = row ? JSON.parse(row.body_json) : null
  const goal = plan && await tx.get<ObligationRow>('SELECT * FROM life_obligations WHERE card_id=? AND obligation_id=?', [tx.cardId, plan.rootObligationId])
  if (!plan || !goal || plan.revision !== input.planRevision || plan.obligationGeneration !== input.generation || goal.generation !== input.generation || goal.thread_id !== plan.rootThreadId)
    return
  const source = JSON.parse(goal.source_ref_json)
  const verification: LifeGoalVerification | null = goal.fulfilled_receipt_ref_json ? JSON.parse(goal.fulfilled_receipt_ref_json) : null
  const accepted = JSON.parse(goal.required_proof_json).acceptance
  if (!source.procedure || source.invalidatedBy || !verification?.independent || verification.id !== input.verificationId || verification.verdict !== 'not-satisfied' || accepted?.contractHash !== plan.acceptanceHash || accepted.obligationGeneration !== goal.generation || ['fulfilled', 'cancelled', 'superseded'].includes(goal.status))
    return
  // Cancellation, pending approval and uncertain effects are not evidence that
  // a reusable method is wrong. Only a completed, independently checked use is.
  if (await tx.get('SELECT 1 FROM life_effect_intents WHERE card_id=? AND turn_id IN (SELECT ingress_id FROM life_work_slices WHERE card_id=? AND plan_id=?) AND status IN (\'claimed\',\'dispatched\',\'uncertain\') LIMIT 1', [tx.cardId, tx.cardId, plan.id]))
    return
  const candidateRow = await tx.get<{ payload_ref_json: string }>('SELECT payload_ref_json FROM life_ingress WHERE card_id=? AND ingress_id=? AND source=\'execution-procedure-candidate\' AND status=\'settled\'', [tx.cardId, source.procedure.candidateId])
  const candidate: ProcedureCandidate | null = candidateRow ? JSON.parse(candidateRow.payload_ref_json).candidate : null
  if (!candidate || candidate.version !== source.procedure.version || source.procedure.candidateId !== `procedure:${candidate.version}` || executionDigest(candidate.template) !== candidate.templateHash || executionDigest({ templateHash: candidate.templateHash, source: candidate.source }) !== candidate.version)
    throw new Error('Failed method use lost its immutable learned source')
  const id = `procedure-failure:${candidate.version}`
  if (await tx.get('SELECT 1 FROM life_ingress WHERE card_id=? AND ingress_id=?', [tx.cardId, id]))
    return
  const repair: ProcedureRepairNotice = { reason: 'acceptance-not-satisfied', sourceThreadId: plan.rootThreadId, sourcePlanId: plan.id, verificationId: verification.id, evidenceHash: executionDigest({ planId: plan.id, revision: plan.revision, generation: goal.generation, verification }), observedAt: tx.now }
  await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id, kind: 'system', source: 'execution-procedure-failure', sourceKey: id, occurredAt: tx.now, payload: { candidateId: source.procedure.candidateId, version: candidate.version, repair, repairCandidate: { templateHash: candidate.templateHash, requirement: 'fresh-independently-verified-source-and-dedicated-replay' } } } })
  await applyLifeIngress(tx, { type: 'ingress-settle', id, status: 'settled' })
  // The original successful experience remains history. This method version
  // loses action authority, including stale in-memory activation projections.
  await applyLifeEvidenceInvalidation(tx, { type: 'evidence-invalidate', source: { cardId: tx.cardId, kind: 'execution-procedure', id: source.procedure.candidateId, version: candidate.version }, mode: 'correction', reason: 'independent-method-use-verification-failed' })
}

export async function observeProcedureFailure(database: AlicizationDbService, plan: WorkPlan) {
  const view = await database.readLifeState({ executionPlanId: plan.id })
  const goal = view.obligations.find(item => item.id === plan.rootObligationId)
  if (view.cardId !== plan.cardId || goal?.generation !== plan.obligationGeneration || goal.invalidatedBy || !goal.procedureSource || !goal.verification?.independent || goal.verification.verdict !== 'not-satisfied')
    return
  await database.commitLifeState({ cardId: plan.cardId, operationKey: `procedure-failure-observe:${plan.id}:${plan.revision}:${goal.verification.id}`, changes: [], mutations: [{ type: 'execution-procedure-observe-failure', planId: plan.id, planRevision: plan.revision, generation: goal.generation, verificationId: goal.verification.id }] })
}
