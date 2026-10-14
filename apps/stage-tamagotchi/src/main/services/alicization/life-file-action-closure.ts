import type { LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeObligation, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { isAbsolute } from 'node:path'

import { completedLifeExecutionStep } from './life-dialogue-claim'
import { verifyLifeGoal } from './life-goal-verifier'

/** Close actual writes and derived edits, with independent byte evidence. */
export async function closeLifeFileAction(input: {
  cardId: string
  effect: LifeEffect
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  now: () => number
}) {
  const effect = input.effect
  const capability = effect.payload.capabilityId
  if (!['tool.filesystem_write_file', 'tool.filesystem_edit_file', 'tool.filesystem_patch_file'].includes(String(capability)) || !effect.turnId || !completedLifeExecutionStep(effect))
    return
  const output = effect.receipt?.output as Record<string, unknown>
  const parameters = effect.payload.parameters as Record<string, unknown> | undefined
  if (!parameters || parameters.path !== output.path || typeof output.verifiedPath !== 'string' || !isAbsolute(output.verifiedPath))
    return
  const writing = capability === 'tool.filesystem_write_file'
  if (writing ? typeof parameters.content !== 'string' : output.writeApplied !== true || parameters.dryRun === true)
    return
  const contentHash = writing ? createHash('sha256').update(String(parameters.content)).digest('hex') : output.nextHash
  if (typeof contentHash !== 'string' || !/^[a-f\d]{64}$/u.test(contentHash))
    return
  if (output.contentHash !== contentHash)
    return
  const view = await input.read()
  if (view.cardId !== input.cardId)
    throw new Error('File action closure crossed the card boundary')
  const id = `file-goal:${effect.id}`
  let goal = view.obligations.find(item => item.id === id)
  if (!goal) {
    const now = input.now()
    const obligation: LifeObligation = { cardId: input.cardId, id, generation: 1, revision: 0, kind: 'task', summary: `${writing ? 'Write' : 'Apply the requested edit to'} the requested local file ${output.path} and independently read back the exact UTF-8 bytes; content SHA-256 ${contentHash}.`, status: 'accepted', sourceTurnId: effect.turnId, deliveryTurnId: null, dueAt: null, timezone: null, threadId: null, scheduledTaskId: null, proof: { kind: 'file', path: output.verifiedPath, contentHash }, receiptId: null, createdAt: now, updatedAt: now }
    await input.commit({ cardId: input.cardId, operationKey: `file-goal-bind:${effect.id}`, changes: [], mutations: [{ type: 'obligation-create', obligation, dedupeKey: id }] })
    goal = (await input.read()).obligations.find(item => item.id === id)
  }
  if (!goal || ['fulfilled', 'cancelled', 'superseded'].includes(goal.status))
    return
  const verification = await verifyLifeGoal({ obligation: goal, readSetting: async () => undefined, now: input.now })
  await input.commit({ cardId: input.cardId, operationKey: `file-goal-verify:${effect.id}:${verification.id}`, changes: [], mutations: [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification }] })
}
