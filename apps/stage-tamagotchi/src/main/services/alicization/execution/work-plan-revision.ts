import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeTransaction } from '../life-transaction'

import { boundedJson } from '../life-transaction'
import { executionDigest } from './acceptance-compiler'

/** A revision may repair future work, but cannot erase or replay settled writes. */
export async function carryForwardVerifiedWork(tx: LifeTransaction, previous: WorkPlan, next: WorkPlan, criteriaRevised = false) {
  const results = await tx.all<{ step_id: string, attempt_id: string, input_hash: string, effect_id: string | null, observation_refs_json: string, result_json: string, state: string }>(`SELECT r.* FROM life_work_step_results r WHERE r.card_id=? AND r.plan_id=? AND r.plan_revision=? AND r.rowid=(SELECT q.rowid FROM life_work_step_results q WHERE q.card_id=r.card_id AND q.plan_id=r.plan_id AND q.plan_revision=r.plan_revision AND q.step_id=r.step_id ORDER BY q.created_at DESC,q.rowid DESC LIMIT 1)`, [tx.cardId, previous.id, previous.revision])
  if (results.some(item => ['running', 'awaiting-verification'].includes(item.state)))
    throw new Error('Reconcile unresolved work before revising its plan')
  for (const result of results.filter(item => item.state === 'verified')) {
    const before = previous.steps.find(step => step.id === result.step_id)
    const after = next.steps.find(step => step.id === result.step_id)
    // An explicit host criteria revision may change criterion associations.
    // Inputs, dependencies, operation identity and actual effects stay exact.
    const projection = (step: WorkPlan['steps'][number]) => criteriaRevised ? { ...step, acceptanceCriterionIds: [] } : step
    if (!before || !after || executionDigest(projection(before)) !== executionDigest(projection(after)))
      throw new Error('A plan revision must retain the exact already observed steps')
    const output = { ...JSON.parse(result.result_json), carriedFromRevision: previous.revision }
    await tx.run('INSERT INTO life_work_step_results(card_id,plan_id,plan_revision,step_id,attempt_id,input_hash,effect_id,observation_refs_json,result_json,state,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [tx.cardId, next.id, next.revision, result.step_id, result.attempt_id, result.input_hash, result.effect_id, result.observation_refs_json, boundedJson(output), 'verified', tx.now])
  }
}
