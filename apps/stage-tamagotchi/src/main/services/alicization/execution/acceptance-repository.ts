import type { TaskAcceptance } from '../../../../shared/execution-contracts'
import type { LifeObligation } from '../../../../shared/life-contracts'
import type { LifeTransaction } from '../life-transaction'

import { boundedJson } from '../life-transaction'
import { compileTaskAcceptance, criteriaFromLegacyProof, executionDigest } from './acceptance-compiler'

export async function projectTaskAcceptance(tx: LifeTransaction, input: {
  obligationId: string
  generation: number
  sourceTurnId: string | null
  proof: LifeObligation['proof']
  criteria?: unknown
  planned: boolean
  finalizeBeforeExecution?: boolean
}) {
  const row = await tx.get<{ body_json: string, obligation_generation: number }>('SELECT body_json, obligation_generation FROM life_execution_contracts WHERE card_id = ? AND obligation_id = ? AND active = 1', [tx.cardId, input.obligationId])
  const previous: TaskAcceptance | null = row ? JSON.parse(row.body_json) : null
  const criteria = input.criteria ?? (input.proof.kind === 'composite' ? input.proof.acceptance?.criteria : criteriaFromLegacyProof(input.proof))
  if (previous && previous.obligationGeneration === input.generation) {
    if (executionDigest(previous.criteria) === executionDigest(criteria))
      return previous
    // Personal project creation binds its fixed artifact after the empty task
    // skeleton, before dispatch. This is a one-time initialization protocol.
    const draft = executionDigest(previous.criteria) === executionDigest(criteriaFromLegacyProof({ kind: 'user-reported' }))
    const task = await tx.get<{ metadata_json: string | null }>('SELECT metadata_json FROM task_threads WHERE id = ?', [input.obligationId.slice('task:'.length)])
    const explicit = task?.metadata_json ? JSON.parse(task.metadata_json).acceptanceCriteria !== undefined : false
    const dispatched = await tx.get('SELECT 1 FROM life_effect_intents WHERE card_id = ? AND kind = \'execute\' AND (turn_id = ? OR turn_id = ?) LIMIT 1', [tx.cardId, input.obligationId.slice('task:'.length), input.sourceTurnId])
    const plan = await tx.get('SELECT 1 FROM life_work_plans WHERE card_id = ? AND root_obligation_id = ? LIMIT 1', [tx.cardId, input.obligationId])
    if (!input.finalizeBeforeExecution || !input.planned || !draft || explicit || dispatched || plan)
      throw new Error('An accepted execution contract cannot be changed by execution output')
  }
  const source = input.sourceTurnId ? await tx.get('SELECT 1 FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND kind = \'user-turn\'', [tx.cardId, `user:${input.sourceTurnId}`]) : null
  const acceptance = compileTaskAcceptance({
    cardId: tx.cardId,
    rootObligationId: input.obligationId,
    obligationGeneration: input.generation,
    revision: (previous?.revision ?? 0) + 1,
    sourceInputIds: source ? [`user:${input.sourceTurnId}`] : [],
    criteria,
    permittedResourceIds: [],
    permittedEffectPolicyId: 'local-default-risk-v1',
    stopConditions: ['source-withdrawn', 'user-cancelled', 'unknown-consequential-effect'],
  })
  await tx.run('UPDATE life_execution_contracts SET active = 0 WHERE card_id = ? AND obligation_id = ?', [tx.cardId, input.obligationId])
  await tx.run('INSERT INTO life_execution_contracts(card_id, obligation_id, obligation_generation, revision, contract_hash, body_json, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)', [tx.cardId, input.obligationId, input.generation, acceptance.revision, acceptance.contractHash, boundedJson(acceptance), tx.now])
  return acceptance
}
