import type { LifeCommitInput, LifeCommitReceipt, LifeMutation, LifeObligation, LifeStateView } from '../../../shared/life-contracts'
import type { ObligationRow } from './life-obligation-repository'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import { verifyLifeFileProof } from './life-goal-verifier'
import { mapLifeObligation } from './life-obligation-repository'
import { assertLifeId, assertLifeTime, boundedJson } from './life-transaction'
import { alicizationProactiveLoopStateMetaKey } from './runtime-soul'

export async function applyLifeProjectDevelopment(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'project-share' | 'project-feedback' }>) {
  assertLifeId(input.goalId)
  assertLifeId(input.turnId)
  const row = await tx.get<ObligationRow>('SELECT * FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, input.goalId])
  if (!row)
    throw new Error('Unknown personal activity')
  const goal = mapLifeObligation(tx.cardId, row)
  if (goal.kind !== 'personal-project' || goal.status !== 'fulfilled' || goal.invalidatedBy || goal.generation !== input.generation || !goal.verification?.independent || goal.verification.verdict !== 'satisfied')
    throw new Error('Personal activity proof is stale')
  const source = JSON.parse(row.source_ref_json)
  const development = goal.personalDevelopment ?? { shares: [], feedback: [] }
  if (input.type === 'project-share') {
    const audit = await tx.get<{ payload_ref_json: string, payload_hash: string }>('SELECT payload_ref_json, payload_hash FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND source = \'reply-grounding\' AND status = \'settled\'', [tx.cardId, input.reviewId])
    const review = audit ? JSON.parse(audit.payload_ref_json) : null
    if (!audit || createHash('sha256').update(audit.payload_ref_json).digest('hex') !== audit.payload_hash || !review.accepted || review.turnId !== input.turnId || !review.claims.some((claim: { kind: string, binding: { id: string, version: string } | null, meaningMatchesBinding: boolean }) => claim.kind === 'task-complete' && claim.meaningMatchesBinding && claim.binding?.id === goal.id && claim.binding.version === String(goal.generation)))
      throw new Error('Activity sharing has no accepted semantic binding')
    const action = await tx.get<{ receipt_ref_json: string | null }>('SELECT receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND turn_id = ? AND status = \'settled\' AND json_extract(payload_ref_json, \'$.capabilityId\') = \'owned-note\'', [tx.cardId, goal.threadId])
    if (!action?.receipt_ref_json || JSON.parse(action.receipt_ref_json).outcome !== 'completed')
      throw new Error('File state alone does not prove authorship of the activity')
    if (!development.shares.some(item => item.turnId === input.turnId))
      development.shares = [...development.shares, { turnId: input.turnId, reviewId: input.reviewId }].slice(-16)
  }
  else {
    assertLifeTime(input.occurredAt)
    if (!['positive', 'dismiss', 'reply-within-120s'].includes(input.feedback))
      throw new Error('Unrecognized activity feedback')
    if (!development.shares.some(item => item.turnId === input.turnId) || !await tx.get('SELECT 1 FROM life_expression_receipts WHERE card_id = ? AND turn_id = ? AND presentation_verified = 1 AND (state = \'rendered\' OR (state = \'audio-ended\' AND segment_id = \'utterance\'))', [tx.cardId, input.turnId]))
      throw new Error('Unpresented activity cannot receive social feedback')
    const feedback = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [alicizationProactiveLoopStateMetaKey])
    const observed = feedback ? JSON.parse(feedback.value).recentOutcomes : []
    const explicit = await tx.get<{ payload_ref_json: string, payload_hash: string }>('SELECT payload_ref_json, payload_hash FROM life_ingress WHERE card_id = ? AND kind = \'feedback\' AND source = \'explicit-project-feedback\' AND occurred_at = ? AND json_extract(payload_ref_json, \'$.goalId\') = ? AND json_extract(payload_ref_json, \'$.generation\') = ? AND json_extract(payload_ref_json, \'$.turnId\') = ? AND json_extract(payload_ref_json, \'$.feedback\') = ?', [tx.cardId, input.occurredAt, goal.id, goal.generation, input.turnId, input.feedback])
    const explicitObserved = explicit && createHash('sha256').update(explicit.payload_ref_json).digest('hex') === explicit.payload_hash
    if (!explicitObserved && !observed.some((item: { turnId: string, outcome: string, createdAt: number }) => item.turnId === input.turnId && item.outcome === input.feedback && item.createdAt === input.occurredAt))
      throw new Error('Activity feedback needs a persisted user feedback observation')
    if (!development.feedback.some(item => item.turnId === input.turnId))
      development.feedback = [...development.feedback, { turnId: input.turnId, feedback: input.feedback, occurredAt: input.occurredAt }].slice(-16)
  }
  source.personalDevelopment = development
  await tx.run('UPDATE life_obligations SET source_ref_json = ?, revision = ?, updated_at = ? WHERE card_id = ? AND obligation_id = ?', [boundedJson(source), tx.revision, tx.now, tx.cardId, goal.id])
  await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ obligationId: goal.id, development }) })
}

/** Explicit UI feedback also applies to work shared in an invited conversation. */
export async function recordExplicitPersonalProjectFeedback(options: { read: () => Promise<LifeStateView>, commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt> }, input: { cardId: string, goalId: string, generation: number, turnId: string, feedback: 'positive' | 'dismiss', operationId: string }) {
  const view = await options.read()
  const goal = view.obligations.find(goal => goal.id === input.goalId)
  if (view.cardId !== input.cardId || !goal || goal.kind !== 'personal-project' || goal.status !== 'fulfilled' || goal.invalidatedBy || goal.generation !== input.generation || !goal.personalDevelopment?.shares.some(share => share.turnId === input.turnId))
    throw new Error('Personal activity feedback target is stale')
  if ((await verifyLifeFileProof(goal.proof)).verdict !== 'satisfied')
    throw new Error('Personal activity artifact changed before feedback')
  const previous = goal.personalDevelopment.feedback.find(feedback => feedback.turnId === input.turnId)
  if (previous) {
    if (previous.feedback !== input.feedback)
      throw new Error('Feedback was already recorded for this presentation')
    return { status: 'recorded' as const }
  }
  const occurredAt = Date.now()
  const id = `explicit-project-feedback:${input.operationId}`
  await options.commit({ cardId: input.cardId, operationKey: id, expectedOwners: view.owners.filter(owner => ['goals', 'memory'].includes(owner.owner)), changes: [], mutations: [
    { type: 'ingress-accept', ingress: { id, kind: 'feedback', source: 'explicit-project-feedback', sourceKey: id, occurredAt, payload: { goalId: goal.id, generation: goal.generation, turnId: input.turnId, feedback: input.feedback } } },
    { type: 'project-feedback', goalId: goal.id, generation: goal.generation, turnId: input.turnId, feedback: input.feedback, occurredAt },
    { type: 'ingress-settle', id, status: 'settled' },
  ] })
  return { status: 'recorded' as const }
}

export function projectPracticePolicy(goals: LifeObligation[], activity: LifeObligation['personalActivity'], now: number) {
  const eligible = goals.filter(goal => goal.personalActivity === activity && !goal.invalidatedBy && goal.status === 'fulfilled' && goal.verification?.independent && goal.verification.verdict === 'satisfied')
  const feedback = eligible.flatMap(goal => goal.personalDevelopment?.feedback ?? [])
  const dismissed = feedback.some(item => item.feedback === 'dismiss' && now - item.occurredAt < 7 * 24 * 60 * 60_000)
  return { held: dismissed, verifiedPracticeCount: eligible.length, positiveFeedbackCount: feedback.filter(item => item.feedback === 'positive').length, responseCount: feedback.filter(item => item.feedback === 'reply-within-120s').length }
}

export async function recordPersonalProjectFeedback(options: { read: () => Promise<LifeStateView>, commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt> }, outcomes: Array<{ turnId: string, outcome: string, createdAt: number }>) {
  const view = await options.read()
  for (const goal of view.obligations.filter(goal => goal.kind === 'personal-project' && !goal.invalidatedBy)) {
    for (const outcome of outcomes.filter(outcome => ['positive', 'dismiss', 'reply-within-120s'].includes(outcome.outcome) && goal.personalDevelopment?.shares.some(share => share.turnId === outcome.turnId) && !goal.personalDevelopment.feedback.some(feedback => feedback.turnId === outcome.turnId))) {
      const id = `project-feedback:${goal.id}:${outcome.turnId}`
      await options.commit({ cardId: view.cardId, operationKey: id, changes: [], mutations: [{ type: 'project-feedback', goalId: goal.id, generation: goal.generation, turnId: outcome.turnId, feedback: outcome.outcome as 'positive' | 'dismiss' | 'reply-within-120s', occurredAt: outcome.createdAt }, { type: 'ingress-accept', ingress: { id, kind: 'feedback', source: 'personal-activity', sourceKey: id, occurredAt: outcome.createdAt, payload: { goalId: goal.id, generation: goal.generation, turnId: outcome.turnId, feedback: outcome.outcome } } }, { type: 'ingress-settle', id, status: 'settled' }] })
    }
  }
}
