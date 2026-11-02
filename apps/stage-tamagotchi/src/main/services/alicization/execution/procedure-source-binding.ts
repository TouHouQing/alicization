import type { LifeMutation } from '../../../../shared/life-contracts'
import type { IngressRow } from '../life-read-repository'
import type { LifeTransaction } from '../life-transaction'
import type { ProcedureCandidate } from './procedure-candidate-repository'

import { createHash } from 'node:crypto'

import { mapLifeIngress } from '../life-read-repository'
import { assertLifeId, boundedJson } from '../life-transaction'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { executionDigest } from './acceptance-compiler'
import { procedureSkillSource } from './procedure-skill-files'
import { isAcceptedProcedureInput } from './procedure-source-input'

/** Bind before scheduling; withdrawals then use the existing goal invalidation graph. */
export async function bindExecutionProcedureSource(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'execution-procedure-bind' }>) {
  for (const value of [input.threadId, input.candidateId, input.version])
    assertLifeId(value)
  const stored = await tx.get<{ payload_ref_json: string }>(`SELECT payload_ref_json FROM life_ingress WHERE card_id=? AND ingress_id=? AND source='execution-procedure-candidate' AND status='settled'`, [tx.cardId, input.candidateId])
  const candidate = stored ? JSON.parse(stored.payload_ref_json).candidate as ProcedureCandidate : null
  if (!candidate || candidate.version !== input.version || executionDigest(candidate.template) !== candidate.templateHash || executionDigest({ templateHash: candidate.templateHash, source: candidate.source }) !== candidate.version)
    throw new Error('Procedure binding lost its immutable source')
  const source = candidate.source
  const sourcePlan = await tx.get<{ revision: number, contract_hash: string }>(`SELECT revision,contract_hash FROM life_work_plans WHERE card_id=? AND plan_id=? ORDER BY revision DESC LIMIT 1`, [tx.cardId, source.planId])
  if (!sourcePlan || sourcePlan.revision !== source.planRevision || sourcePlan.contract_hash !== source.acceptanceHash || source.inputIds.length !== source.inputHashes.length)
    throw new Error('Procedure source acceptance changed before work admission')
  for (const [index, id] of source.inputIds.entries()) {
    const input = await tx.get<IngressRow>('SELECT * FROM life_ingress WHERE card_id=? AND ingress_id=?', [tx.cardId, id])
    if (!input || input.payload_hash !== source.inputHashes[index] || !isAcceptedProcedureInput(mapLifeIngress(input), source) || await tx.get(`SELECT 1 FROM life_input_payloads WHERE card_id=? AND ingress_id=? AND lifecycle IN ('withdrawn','unavailable') LIMIT 1`, [tx.cardId, id]))
      throw new Error('Procedure source input was withdrawn or changed')
  }
  const goal = await tx.get<{ source_ref_json: string, fulfilled_receipt_ref_json: string }>(`SELECT source_ref_json,fulfilled_receipt_ref_json FROM life_obligations WHERE card_id=? AND obligation_id=? AND generation=? AND status='fulfilled'`, [tx.cardId, source.goalId, source.generation])
  const sourceState = goal ? JSON.parse(goal.source_ref_json) : null
  const proof = goal ? JSON.parse(goal.fulfilled_receipt_ref_json) : null
  if (!sourceState || sourceState.invalidatedBy || sourceState.attemptId !== source.attemptId || proof?.id !== source.verificationId || !proof.independent || proof.verdict !== 'satisfied')
    throw new Error('Procedure source was withdrawn before admission')
  for (const ref of [{ kind: 'goals', id: source.goalId, version: String(source.generation) }, { kind: 'execution-procedure', id: input.candidateId, version: input.version }]) {
    if (await tx.get(`SELECT 1 FROM life_evidence_cleanup_jobs WHERE card_id=? AND json_extract(source_ref_json,'$.kind')=? AND json_extract(source_ref_json,'$.id')=? AND json_extract(source_ref_json,'$.version') IN ('*',?) LIMIT 1`, [tx.cardId, ref.kind, ref.id, ref.version]))
      throw new Error('Procedure source has an earlier withdrawal')
  }
  const state = await tx.get<{ payload_ref_json: string }>(`SELECT payload_ref_json FROM life_ingress WHERE card_id=? AND source='execution-skill-state' AND status='settled' ORDER BY observed_at DESC,rowid DESC LIMIT 1`, [tx.cardId])
  const items = state ? JSON.parse(state.payload_ref_json).snapshot?.items : null
  // Transferable operations are built-ins. Recheck their recorded interface
  // against the same canonical policy before trusting an activation hash.
  const sourceHash = createHash('sha256').update(procedureSkillSource(candidate, createCanonicalToolRegistry())).digest('hex')
  if (!Array.isArray(items) || !items.some(item => item.id === candidate.id && item.version === input.version && item.sourceHash === sourceHash && item.evaluationStatus === 'approved' && item.activationStatus === 'active'))
    throw new Error('Procedure activation changed before work admission')
  const id = `task:${input.threadId}`
  const target = await tx.get<{ generation: number, source_ref_json: string }>(`SELECT o.generation,o.source_ref_json FROM life_obligations o JOIN task_threads t ON t.id=o.thread_id WHERE o.card_id=? AND o.obligation_id=? AND o.status='accepted' AND t.status='planned'`, [tx.cardId, id])
  if (!target || id === source.goalId)
    throw new Error('Procedure needs a fresh unstarted responsibility')
  const current = JSON.parse(target.source_ref_json)
  if (current.procedure && (current.procedure.candidateId !== input.candidateId || current.procedure.version !== input.version))
    throw new Error('Accepted work cannot silently change its learned source')
  await tx.run(`UPDATE life_obligations SET source_ref_json=?,revision=? WHERE card_id=? AND obligation_id=?`, [boundedJson({ ...current, procedure: { candidateId: input.candidateId, version: input.version } }), tx.revision, tx.cardId, id])
  for (const ref of [{ kind: 'goals', id: source.goalId, version: String(source.generation) }, { kind: 'execution-procedure', id: input.candidateId, version: input.version }])
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id,source_kind,source_id,source_version,dependent_owner,dependent_id,dependent_version,relation,created_revision) VALUES (?,?,?,?,'goals',?,?,'derived-from',?)`, [tx.cardId, ref.kind, ref.id, ref.version, id, String(target.generation), tx.revision])
  await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: id, procedureVersion: input.version }) })
}
