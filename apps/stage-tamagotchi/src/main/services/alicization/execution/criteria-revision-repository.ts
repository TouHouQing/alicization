import type { ExecutionCriteriaChange, TaskAcceptance, WorkPlan } from '../../../../shared/execution-contracts'
import type { ObligationRow } from '../life-obligation-repository'
import type { LifeTransaction } from '../life-transaction'

import { applyLifeIngress } from '../life-ingress-repository'
import { assertLifeId, boundedJson } from '../life-transaction'
import { compileTaskAcceptance, executionDigest } from './acceptance-compiler'
import { applyExplicitWorkRevision } from './explicit-work-revision'
import { applyExecutionWork } from './work-plan-repository'

/** Host control only: atomically replace criteria without replacing her task. */
export async function reviseExecutionCriteria(tx: LifeTransaction, input: ExecutionCriteriaChange) {
  assertLifeId(input.requestId)
  if (input.cardId !== tx.cardId)
    throw new Error('Acceptance revision crossed its card owner')
  const stored = await tx.get<{ body_json: string }>('SELECT body_json FROM life_work_plans WHERE card_id=? AND plan_id=? ORDER BY revision DESC LIMIT 1', [tx.cardId, input.planId])
  const previous: WorkPlan | null = stored ? JSON.parse(stored.body_json) : null
  const goal = previous && await tx.get<ObligationRow>('SELECT * FROM life_obligations WHERE card_id=? AND obligation_id=?', [tx.cardId, previous.rootObligationId])
  const row = goal && await tx.get<{ body_json: string }>('SELECT body_json FROM life_execution_contracts WHERE card_id=? AND obligation_id=? AND active=1', [tx.cardId, goal.obligation_id])
  const contract: TaskAcceptance | null = row ? JSON.parse(row.body_json) : null
  if (!previous || !goal || !contract || previous.revision !== input.expectedRevision || goal.generation !== input.expectedGeneration || previous.obligationGeneration !== goal.generation || previous.acceptanceHash !== input.contractHash || contract.contractHash !== input.contractHash || contract.obligationGeneration !== goal.generation || JSON.parse(goal.source_ref_json).invalidatedBy || ['fulfilled', 'cancelled', 'superseded', 'failed'].includes(goal.status))
    throw new Error('The accepted responsibility changed or is no longer editable')
  const active = await tx.get('SELECT 1 FROM life_work_slices WHERE card_id=? AND plan_id=? AND state IN (\'ready\',\'running\',\'stopping\') LIMIT 1', [tx.cardId, previous.id])
  const unresolved = await tx.get('SELECT 1 FROM life_effect_intents WHERE card_id=? AND turn_id IN (SELECT ingress_id FROM life_work_slices WHERE card_id=? AND plan_id=?) AND status IN (\'claimed\',\'dispatched\',\'uncertain\') LIMIT 1', [tx.cardId, tx.cardId, previous.id])
  if (active || unresolved)
    throw new Error('Stop and reconcile the current work before changing its requirements')
  const feedbackId = `work-criteria-change:${input.requestId}`
  const { contractHash: _priorHash, version: _version, ...definition } = contract
  const acceptance = compileTaskAcceptance({ ...definition, obligationGeneration: goal.generation + 1, revision: contract.revision + 1, sourceInputIds: [...contract.sourceInputIds, feedbackId], criteria: input.criteria })
  const observed = await tx.all<{ step_id: string }>('SELECT DISTINCT step_id FROM life_work_step_results WHERE card_id=? AND plan_id=? AND plan_revision=? AND state=\'verified\'', [tx.cardId, previous.id, previous.revision])
  const edited = applyExplicitWorkRevision(previous, input, observed.map(result => result.step_id))
  if (executionDigest(acceptance.criteria) === executionDigest(contract.criteria) && !edited.changed.length && !edited.graph.changed)
    throw new Error('The acceptance criteria have not changed')
  const ids = new Set(acceptance.criteria.map(item => item.id))
  for (const criterion of acceptance.criteria) {
    if ('artifactIds' in criterion.predicate && criterion.predicate.artifactIds.some(id => !acceptance.criteria.some(item => item.id === id && ['file-bytes', 'file-matches-read', 'json-structure', 'text-content', 'browser-download'].includes(item.predicate.kind))))
      throw new Error('Review conditions must refer to files in the new acceptance requirements')
  }
  const plan: WorkPlan = { ...previous, revision: previous.revision + 1, obligationGeneration: acceptance.obligationGeneration, acceptanceHash: acceptance.contractHash, sourceEvidenceRefs: [...previous.sourceEvidenceRefs, feedbackId], steps: edited.steps.map(step => ({ ...step, acceptanceCriterionIds: step.acceptanceCriterionIds.filter(id => ids.has(id)) })) }
  const payload = { bindingHash: executionDigest(input), planId: plan.id, previousRevision: previous.revision, planRevision: plan.revision, rootObligationId: goal.obligation_id, previousGeneration: goal.generation, generation: acceptance.obligationGeneration, previousContractHash: contract.contractHash, contractHash: acceptance.contractHash, changedSteps: edited.changed, graphChanges: { inserted: edited.graph.inserted, removed: edited.graph.removed, dependencies: edited.graph.dependencies, previousHash: executionDigest(previous.steps), hash: executionDigest(edited.steps) }, added: acceptance.criteria.filter(item => !contract.criteria.some(old => old.id === item.id)).map(item => item.id), removed: contract.criteria.filter(item => !ids.has(item.id)).map(item => item.id), replaced: acceptance.criteria.filter(item => contract.criteria.some(old => old.id === item.id && executionDigest(old) !== executionDigest(item))).map(item => item.id) }
  await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id: feedbackId, kind: 'feedback', source: 'execution-criteria-change', sourceKey: input.requestId, occurredAt: tx.now, payload } })
  await applyLifeIngress(tx, { type: 'ingress-settle', id: feedbackId, status: 'settled' })
  await tx.run('UPDATE life_execution_contracts SET active=0 WHERE card_id=? AND obligation_id=?', [tx.cardId, goal.obligation_id])
  await tx.run('INSERT INTO life_execution_contracts(card_id,obligation_id,obligation_generation,revision,contract_hash,body_json,active,created_at) VALUES (?,?,?,?,?,?,1,?)', [tx.cardId, goal.obligation_id, acceptance.obligationGeneration, acceptance.revision, acceptance.contractHash, boundedJson(acceptance), tx.now])
  await tx.run('UPDATE life_obligations SET generation=?,revision=?,status=\'blocked\',required_proof_json=?,fulfilled_receipt_ref_json=NULL,updated_at=? WHERE card_id=? AND obligation_id=?', [acceptance.obligationGeneration, tx.revision, boundedJson({ kind: 'composite', acceptance }), tx.now, tx.cardId, goal.obligation_id])
  const thread = await tx.get<{ metadata_json: string | null }>('SELECT metadata_json FROM task_threads WHERE id=?', [previous.rootThreadId])
  if (!thread)
    throw new Error('The accepted execution thread is absent')
  const metadata = thread.metadata_json ? JSON.parse(thread.metadata_json) : {}
  delete metadata.goalProof
  delete metadata.lifeGoalOutcome
  metadata.acceptanceCriteria = acceptance.criteria
  await tx.run('UPDATE task_threads SET status=\'paused\',summary=?,metadata_json=?,updated_at=? WHERE id=?', ['验收要求已更新，已有操作保留，等待按新要求检查。', boundedJson(metadata), tx.now, previous.rootThreadId])
  // Source withdrawal must still reach the new generation of this same task.
  await tx.run('INSERT OR IGNORE INTO life_evidence_dependencies(card_id,source_kind,source_id,source_version,dependent_owner,dependent_id,dependent_version,relation,created_revision) SELECT card_id,source_kind,source_id,source_version,dependent_owner,dependent_id,?,relation,? FROM life_evidence_dependencies WHERE card_id=? AND dependent_owner=\'goals\' AND dependent_id=? AND dependent_version=?', [String(acceptance.obligationGeneration), tx.revision, tx.cardId, goal.obligation_id, String(goal.generation)])
  const feedback = await tx.get<{ payload_hash: string }>('SELECT payload_hash FROM life_ingress WHERE card_id=? AND ingress_id=?', [tx.cardId, feedbackId])
  if (!feedback)
    throw new Error('The revised work lost its host requirement source')
  await tx.run('INSERT OR IGNORE INTO life_evidence_dependencies(card_id,source_kind,source_id,source_version,dependent_owner,dependent_id,dependent_version,relation,created_revision) VALUES (?,\'life_ingress\',?, ?,\'goals\',?,?,\'derived-from\',?)', [tx.cardId, feedbackId, feedback.payload_hash, goal.obligation_id, String(acceptance.obligationGeneration), tx.revision])
  await applyExecutionWork(tx, { type: 'execution-plan', plan, expectedRevision: previous.revision }, true)
}
