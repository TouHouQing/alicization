import type { LifeObligation, LifeStateView } from '../../../shared/life-contracts'

export type PersonalActivity = NonNullable<LifeObligation['personalActivity']>

/** Limits local work independently of the existing outward-contact budget. */
export function personalActivityCadence(view: LifeStateView, activity: PersonalActivity, now: number) {
  const own = view.obligations.filter(goal => goal.kind === 'personal-project' && !goal.invalidatedBy && !['cancelled', 'superseded'].includes(goal.status))
  const dayStart = now - 86_400_000
  if (own.filter(goal => goal.createdAt >= dayStart).length >= 3)
    return { allowed: false, reason: 'daily-project-budget' }
  const previous = own.filter(goal => goal.personalActivity === activity).sort((a, b) => b.createdAt - a.createdAt)[0]
  const minimum = activity === 'creative-writing-v1' ? 6 * 60 * 60_000 : 60 * 60_000
  return previous && now - previous.createdAt < minimum
    ? { allowed: false, reason: 'activity-cooldown' }
    : { allowed: true, reason: 'activity-opportunity' }
}

/** A self projection of her actual choices, never a copy of the host's likes. */
export function deriveLifePersonalInterests(view: LifeStateView) {
  const groups = new Map<string, LifeObligation[]>()
  for (const goal of view.obligations) {
    if (goal.kind !== 'personal-project' || !goal.personalTopic || goal.invalidatedBy || goal.status !== 'fulfilled' || goal.verification?.verdict !== 'satisfied' || !goal.verification.independent)
      continue
    if (!goal.personalAuthorship && !view.effects.some(effect => effect.turnId === goal.threadId && effect.status === 'settled' && effect.payload.capabilityId === 'owned-note' && effect.receipt?.outcome === 'completed'))
      continue
    const key = `${goal.personalActivity}|${goal.personalTopic}`
    groups.set(key, [...(groups.get(key) ?? []), goal])
  }
  return [...groups.values()].slice(0, 8).map((goals) => {
    const days = new Set(goals.filter(goal => goal.personalOrigin === 'self-initiated').map(goal => Math.floor(goal.createdAt / 86_400_000)))
    const dismissed = goals.some(goal => goal.personalDevelopment?.feedback.some(item => item.feedback === 'dismiss'))
    return {
      subject: `self:${view.cardId}`,
      topic: goals[0].personalTopic,
      activity: goals[0].personalActivity,
      development: dismissed ? 'reconsidering' : days.size >= 3 ? 'repeated-own-practice' : 'trying',
      permanentlyLikes: false,
      evidence: goals.map(goal => ({ kind: 'obligation', id: goal.id, version: String(goal.generation), verifiedAt: goal.verification!.verifiedAt })).slice(0, 8),
      feedback: goals.flatMap(goal => goal.personalDevelopment?.feedback ?? []).slice(-8),
    }
  })
}

/** Prior execution observations guide the next attempt without asserting skill. */
export function deriveLifePracticeLessons(view: LifeStateView) {
  const failures = view.effects.filter(effect => ['settled', 'uncertain', 'failed'].includes(effect.status) && effect.receipt && !effect.payload.sourceWithdrawn && !['completed', 'success'].includes(String(effect.receipt.outcome))).slice(0, 12).flatMap((effect) => {
    const receipt = effect.receipt!
    const output = receipt.output as { errorCode?: unknown } | undefined
    const capability = typeof effect.payload.capabilityId === 'string' ? effect.payload.capabilityId.slice(0, 120) : null
    if (!capability || ['completed', 'success'].includes(String(receipt.outcome)))
      return []
    const error = typeof output?.errorCode === 'string' ? output.errorCode : ''
    const reason = error === 'ALICIZATION_TOOL_DENIED_BY_HOST' ? 'host-denied' : /DENIED_SYSTEM|CONFIRMATION_UNAVAILABLE|NOT_SUPPORTED/u.test(error) ? 'policy-or-capability-boundary' : /STALE|OBSERVATION_REQUIRED/u.test(error) ? 'stale-observation' : effect.status === 'uncertain' ? 'uncertain-effect' : 'observed-failure'
    const nextAttempt = reason === 'host-denied' ? 'Respect the refusal for this action and its originating request; do not retry or route around it. A later explicit authorization must be evaluated as a new request.' : reason === 'policy-or-capability-boundary' ? 'Respect this policy or capability boundary. Explain the limit or request the required authorization; never bypass it through another channel.' : reason === 'stale-observation' ? 'Read the actual current surface again and revise the target before any mutation.' : reason === 'uncertain-effect' ? 'Observe the actual result before considering any repeated mutation.' : 'Use the observed error to revise the plan and verify the result independently.'
    return [{ capability, reason, scope: { turnId: effect.turnId, actionId: effect.actionId }, observedError: error.slice(0, 160) || null, evidence: { kind: 'effect', id: effect.id, version: String(effect.generation) }, nextAttempt, skillMastered: false }]
  })
  const incomplete = view.obligations.filter(goal => !goal.invalidatedBy && goal.verification?.independent && goal.verification.verdict === 'not-satisfied').slice(0, 4).map(goal => ({ capability: 'goal-verification', reason: 'postcondition-not-satisfied', scope: { turnId: goal.threadId, actionId: goal.id }, observedError: null, evidence: { kind: 'obligation', id: goal.id, version: String(goal.generation) }, nextAttempt: 'The requested result was independently checked and was absent. Revisit the goal and current evidence; a dispatched action is not completion.', skillMastered: false }))
  return [...failures, ...incomplete]
}

export function buildLifePracticeReview(view: LifeStateView) {
  const goals = view.obligations.filter(goal => goal.kind === 'personal-project' && goal.personalActivity !== 'practice-review-v1' && !goal.invalidatedBy && goal.status === 'fulfilled' && goal.personalAuthorship && goal.verification?.independent && goal.verification.verdict === 'satisfied').slice(0, 6)
  if (!goals.length)
    return null
  const evidence = goals.map(goal => ({ cardId: view.cardId, kind: 'goals', id: goal.id, version: String(goal.generation) }))
  const lessons = deriveLifePracticeLessons(view)
  const body = goals.map(goal => `- ${goal.summary.slice(0, 180)}${goal.personalDevelopment?.feedback.length ? `（收到 ${goal.personalDevelopment.feedback.length} 次反馈）` : ''}`).join('\n')
  const guidance = lessons.length ? lessons.map(lesson => `- ${lesson.nextAttempt}`).join('\n') : '已有活动均有结果核对；下一次继续小步练习，并保留实际结果。'
  return { evidence, topic: '回顾自己的实际练习', identity: JSON.stringify(evidence), content: `# 自己的实践复盘\n\n这次整理了我已经完成的练习和收到的反馈。\n\n${body}\n\n## 下次可以怎样做\n\n${guidance}\n\n练习次数和反馈不代表已经掌握技能。虚构作品的内容不作为真实经历。\n` }
}
