import type { LifeCommitInput, LifeCommitReceipt, LifeObligation, LifeStateView } from '../../../shared/life-contracts'
import type { AlicizationDbService } from './db'

import { readExecutionCriterionReceipt } from './execution/criterion-receipts'
import { verifyExecutionDownload } from './execution/download-goal-verifier'
import { verifyExecutionFileReadMatch } from './execution/file-read-match-verifier'
import { verifyLifeGoal } from './life-goal-verifier'

/** The task runner and host recheck use the same accepted execution evidence. */
export function executionGoalVerificationInputs(database: AlicizationDbService | undefined, view: LifeStateView, goal: LifeObligation) {
  const contract = goal.proof.acceptance
  const readDownload: Parameters<typeof verifyLifeGoal>[0]['readDownload'] = contract && database ? predicate => verifyExecutionDownload({ database, view, contract, predicate }) : undefined
  const readFileMatch: Parameters<typeof verifyLifeGoal>[0]['readFileMatch'] = contract && database ? predicate => verifyExecutionFileReadMatch({ database, view, contract, predicate }) : undefined
  return { readDownload, readFileMatch, readReview: contract ? (id: string) => readExecutionCriterionReceipt(contract, id, view.ingress, readDownload) : undefined }
}

export async function verifyLifeTaskCompletion(options: { cardId: string, threadId: string, read: () => Promise<LifeStateView>, commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>, readSetting: (key: string) => Promise<string | undefined>, database?: AlicizationDbService }) {
  const view = await options.read()
  if (view.cardId !== options.cardId)
    throw new Error('Goal verification crossed the card boundary')
  const goal = view.obligations.find(item => item.threadId === options.threadId)
  if (!goal || goal.invalidatedBy || goal.status !== 'verifying' || !['file', 'setting', 'composite'].includes(goal.proof.kind))
    return null
  const verification = await verifyLifeGoal({ obligation: goal, readSetting: options.readSetting, ...executionGoalVerificationInputs(options.database, view, goal) })
  const id = `goal-verification:${verification.id}`
  await options.commit({ cardId: view.cardId, operationKey: id, changes: [], mutations: [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification }, { type: 'ingress-accept', ingress: { id, source: 'goal-verifier', sourceKey: id, kind: 'tool-result', occurredAt: verification.verifiedAt, payload: { obligationId: goal.id, generation: goal.generation, verification } } }, { type: 'ingress-settle', id, status: 'settled' }] })
  return verification
}
