import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'

import { verifyLifeGoal } from './life-goal-verifier'

export async function verifyLifeTaskCompletion(options: { cardId: string, threadId: string, read: () => Promise<LifeStateView>, commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>, readSetting: (key: string) => Promise<string | undefined> }) {
  const view = await options.read()
  if (view.cardId !== options.cardId)
    throw new Error('Goal verification crossed the card boundary')
  const goal = view.obligations.find(item => item.threadId === options.threadId)
  if (!goal || goal.invalidatedBy || goal.status !== 'verifying' || !['file', 'setting'].includes(goal.proof.kind))
    return null
  const verification = await verifyLifeGoal({ obligation: goal, readSetting: options.readSetting })
  const id = `goal-verification:${verification.id}`
  await options.commit({ cardId: view.cardId, operationKey: id, changes: [], mutations: [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification }, { type: 'ingress-accept', ingress: { id, source: 'goal-verifier', sourceKey: id, kind: 'tool-result', occurredAt: verification.verifiedAt, payload: { obligationId: goal.id, generation: goal.generation, verification } } }, { type: 'ingress-settle', id, status: 'settled' }] })
  return verification
}
