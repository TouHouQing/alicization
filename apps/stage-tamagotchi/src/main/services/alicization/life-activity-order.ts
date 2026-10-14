import type { LifeStateView } from '../../../shared/life-contracts'

import { verifiedLifeDailyActivities } from './life-daily-proof'

interface CompletionClaim {
  kind: string
  quote: string
  binding: { kind: string, id: string, version: string } | null
  meaningMatchesBinding: boolean
}

/** Completion times, not mention order or proposed activity, own retrospective ordering. */
export function lifeVerifiedActivityChronology(view: LifeStateView) {
  return [
    ...view.obligations.filter(goal => goal.status === 'fulfilled' && !goal.invalidatedBy && goal.verification?.verdict === 'satisfied' && goal.verification.independent).map(goal => ({ kind: 'task-complete', binding: { kind: 'obligation', id: goal.id, version: String(goal.generation) }, summary: goal.summary.slice(0, 160), verifiedAt: goal.verification!.verifiedAt })),
    ...verifiedLifeDailyActivities(view).map(activity => ({ kind: 'daily-activity-complete', binding: activity.binding, summary: activity.activity, verifiedAt: activity.verifiedAt })),
  ].sort((a, b) => a.verifiedAt - b.verifiedAt)
}

function assertsFirstCompletion(draft: string, quote: string) {
  const position = draft.indexOf(quote)
  const prefix = position < 0 ? '' : draft.slice(Math.max(0, position - 16), position)
  return /(?:^|[：:；;。])\s*(?:我(?:也|还|确实)?\s*)?(?:先|首先)(?:完成|[做写画伸读]|整理)/u.test(quote)
    || /(?:先|首先)\s*$/u.test(prefix) && /^(?:完成|[做写画伸读]|整理)/u.test(quote)
    || /(?:^|[.:;])\s*I\s+(?:first|initially)\s+(?:completed|did|wrote|made|finished|stretched)\b/iu.test(quote)
}

function assertsLaterCompletion(draft: string, quote: string) {
  const position = draft.indexOf(quote)
  const prefix = position < 0 ? '' : draft.slice(Math.max(0, position - 16), position)
  return /^(?:我\s*)?(?:然后|随后|接着|之后|后来|再)(?:我(?:又|还)?\s*)?(?:完成|[做写画伸读]|整理)/u.test(quote)
    || /(?:然后|随后|接着|之后|后来|再)\s*$/u.test(prefix) && /^(?:完成|[做写画伸读]|整理)/u.test(quote)
    || /^(?:I\s+)?(?:then|afterwards|subsequently)\s+(?:I\s+)?(?:completed|did|wrote|made|finished|stretched)\b/iu.test(quote)
}

export function lifeActivityOrderIssues(draft: string, claims: CompletionClaim[], view: LifeStateView) {
  const chronology = lifeVerifiedActivityChronology(view)
  const actual = claims.filter(claim => claim.meaningMatchesBinding && ['task-complete', 'daily-activity-complete'].includes(claim.kind)).flatMap((claim) => {
    const source = chronology.find(item => item.binding.kind === claim.binding?.kind && item.binding.id === claim.binding.id && item.binding.version === claim.binding.version)
    return source ? [{ claim, source }] : []
  })
  return actual.filter((item) => {
    const firstWrong = assertsFirstCompletion(draft, item.claim.quote) && actual.some(other => other.source.binding.id !== item.source.binding.id && other.source.verifiedAt < item.source.verifiedAt)
    const laterWrong = assertsLaterCompletion(draft, item.claim.quote) && actual.some(other => other.source.binding.id !== item.source.binding.id && draft.indexOf(other.claim.quote) < draft.indexOf(item.claim.quote) && other.source.verifiedAt > item.source.verifiedAt)
    return firstWrong || laterWrong
  }).map(item => ({ code: 'UNRELIABLE_REVIEW' as const, quote: item.claim.quote }))
}
