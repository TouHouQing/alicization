import type {
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfGovernorDrive,
  AlicizationSelfGovernorIntentionKind,
  AlicizationSelfGovernorIntentionSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const intentionTtlMs = 25 * 60_000

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function stableId(kind: string, parts: Array<string | number | null | undefined>) {
  return `${kind}::${parts.map((part) => {
    if (typeof part === 'number')
      return String(part)
    return sanitizeText(part ?? '', 120).toLowerCase()
  }).filter(Boolean).join('::') || 'unknown'}`
}

function dominantGoal(goalStack?: AlicizationGoalStackSnapshot | null) {
  return goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(commitment => commitment.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null) {
  return inquiryPlanner?.plans.find(plan => plan.id === inquiryPlanner.activePlanId)
    ?? inquiryPlanner?.plans[0]
    ?? null
}

function resolveDriveScores(input: {
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  livingWorldState: AlicizationLivingWorldStateSnapshot
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  mindDynamics: AlicizationMindDynamicsSnapshot
}) {
  const governing = governingCommitment(input.commitmentLedger)
  const plan = activeInquiryPlan(input.inquiryPlanner)

  return {
    understand: clamp01(
      input.mindDynamics.worldPressure * 0.28
      + input.mindDynamics.epistemicPressure * 0.24
      + (input.worldModel.activeThread?.unresolved ? 0.18 : 0)
      + (input.livingWorldState.openLoops.length > 0 ? 0.12 : 0)
      + (governing?.kind === 'hold-problem' ? 0.12 : 0),
    ),
    repair: clamp01(
      input.mindDynamics.epistemicPressure * 0.34
      + (input.beliefRevision?.groundingNeed ?? 0) * 0.22
      + (input.beliefRevision?.contradictionPressure ?? 0) * 0.18
      + (input.beliefRevision?.stability === 'fractured' ? 0.22 : input.beliefRevision?.stability === 'fluid' ? 0.1 : 0)
      + (plan?.askForGrounding ? 0.16 : 0)
      + (governing?.kind === 'repair-misread' || governing?.kind === 'recheck-scene' ? 0.16 : 0),
    ),
    protect: clamp01(
      input.mindDynamics.carePressure * 0.22
      + (input.worldModel.activeThread?.kind === 'recovery' ? 0.3 : 0)
      + (governing?.kind === 'care-host' ? 0.16 : 0)
      + (input.context.system.fullscreenLikely ? 0.08 : 0),
    ),
    accompany: clamp01(
      input.mindDynamics.relationalPressure * 0.32
      + input.mindDynamics.continuityPressure * 0.18
      + (input.worldModel.continuity.afterglowOpen ? 0.18 : 0)
      + (governing?.kind === 'stay-near' ? 0.16 : 0)
      + (plan?.kind === 'wait-opening' ? 0.12 : 0)
      + (input.relationshipModel?.climate === 'attuned' ? 0.14 : 0),
    ),
    care: clamp01(
      input.mindDynamics.carePressure * 0.38
      + input.context.relationship.fatigue / 100 * 0.22
      + Math.min(1, input.context.relationship.lateNightActiveMinutes / 180) * 0.18
      + (governing?.kind === 'care-host' ? 0.14 : 0),
    ),
    withhold: clamp01(
      input.mindDynamics.restraintPressure * 0.34
      + (input.selfContinuity?.guardingTendency ?? 0) * 0.18
      + (input.relationshipModel?.correctionSensitivity ?? 0.32) * 0.16
      + (input.relationshipModel?.climate === 'guarded' ? 0.16 : 0)
      + (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed' ? 0.14 : 0)
      + (plan?.kind === 'wait-opening' ? 0.12 : 0),
    ),
  } satisfies Record<AlicizationSelfGovernorDrive, number>
}

function dominantDrive(scores: Record<AlicizationSelfGovernorDrive, number>) {
  let winner: AlicizationSelfGovernorDrive | null = null
  let score = -1
  for (const drive of ['understand', 'repair', 'protect', 'accompany', 'care', 'withhold'] as const) {
    if (scores[drive] > score) {
      winner = drive
      score = scores[drive]
    }
  }
  return score >= 0.22 ? winner : null
}

function createIntention(input: {
  now: number
  previous?: AlicizationSelfGovernorIntentionSnapshot | null
  kind: AlicizationSelfGovernorIntentionKind
  drive: AlicizationSelfGovernorDrive
  title: string
  summary: string
  urgency: number
  confidence: number
  patience: number
  targetObjectId?: string | null
  targetThreadId?: string | null
  targetGoalId?: string | null
  targetCommitmentId?: string | null
  withheld?: boolean
}): AlicizationSelfGovernorIntentionSnapshot {
  return {
    id: stableId('governor-intention', [
      input.kind,
      input.targetObjectId ?? '',
      input.targetThreadId ?? '',
      input.targetGoalId ?? '',
      input.targetCommitmentId ?? '',
      input.title,
    ]),
    kind: input.kind,
    status: input.withheld ? 'withheld' : 'active',
    drive: input.drive,
    title: sanitizeText(input.title, 120) || input.kind,
    summary: sanitizeText(input.summary, 200) || input.kind,
    urgency: clamp01(input.urgency),
    confidence: clamp01(input.confidence),
    patience: clamp01(input.patience),
    targetObjectId: input.targetObjectId ?? null,
    targetThreadId: input.targetThreadId ?? null,
    targetGoalId: input.targetGoalId ?? null,
    targetCommitmentId: input.targetCommitmentId ?? null,
    formedAt: input.previous?.formedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + intentionTtlMs,
  }
}

export function buildSelfGovernor(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  livingWorldState: AlicizationLivingWorldStateSnapshot
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  mindDynamics: AlicizationMindDynamicsSnapshot
  previous?: AlicizationSelfGovernorSnapshot | null
}): AlicizationSelfGovernorSnapshot {
  const previous = input.previous ?? null
  const focusObjectId = input.livingWorldState.focusObjectId ?? null
  const activeThread = input.worldModel.activeThread
  const governing = governingCommitment(input.commitmentLedger)
  const plan = activeInquiryPlan(input.inquiryPlanner)
  const leadingGoal = dominantGoal(input.goalStack)
  const driveScores = resolveDriveScores(input)
  const dominant = dominantDrive(driveScores)
  const previousIntentions = new Map((previous?.activeIntentions ?? []).map(intention => [intention.id, intention]))
  const intentions: AlicizationSelfGovernorIntentionSnapshot[] = []

  if (
    driveScores.repair >= 0.34
    || plan?.askForGrounding
    || input.beliefRevision?.stability === 'fractured'
  ) {
    const intention = createIntention({
      now: input.now,
      previous: previous?.activeIntentions.find(item => item.kind === 'repair-misread') ?? null,
      kind: 'repair-misread',
      drive: 'repair',
      title: 'repair-misread',
      summary: plan?.question
        ?? governing?.summary
        ?? input.livingWorldState.openLoops[0]
        ?? 'Repair the drift between the carried scene and the live world.',
      urgency: clamp01(driveScores.repair + (plan?.askForGrounding ? 0.12 : 0)),
      confidence: clamp01(0.5 + driveScores.repair * 0.42),
      patience: 0.46,
      targetObjectId: focusObjectId,
      targetThreadId: activeThread?.id ?? null,
      targetGoalId: leadingGoal?.id ?? null,
      targetCommitmentId: governing?.id ?? null,
    })
    intentions.push(intention)
  }

  if (activeThread?.unresolved || leadingGoal?.kind === 'help-resolve' || leadingGoal?.kind === 'clarify-scene') {
    const intention = createIntention({
      now: input.now,
      previous: previous?.activeIntentions.find(item => item.kind === 'hold-thread' || item.kind === 'understand-scene') ?? null,
      kind: activeThread?.unresolved ? 'hold-thread' : 'understand-scene',
      drive: activeThread?.unresolved ? 'understand' : 'repair',
      title: activeThread?.title ?? leadingGoal?.label ?? 'understand-scene',
      summary: activeThread?.summary
        ?? leadingGoal?.label
        ?? input.livingWorldState.openLoops[0]
        ?? 'Keep the active thread in view until the knot localizes.',
      urgency: clamp01(driveScores.understand + (activeThread?.unresolved ? 0.12 : 0)),
      confidence: clamp01(0.48 + driveScores.understand * 0.42),
      patience: 0.62,
      targetObjectId: focusObjectId,
      targetThreadId: activeThread?.id ?? null,
      targetGoalId: leadingGoal?.id ?? null,
      targetCommitmentId: governing?.id ?? null,
    })
    intentions.push(intention)
  }

  if (
    driveScores.protect >= 0.34
    || activeThread?.kind === 'recovery'
  ) {
    const intention = createIntention({
      now: input.now,
      previous: previous?.activeIntentions.find(item => item.kind === 'protect-host') ?? null,
      kind: 'protect-host',
      drive: 'protect',
      title: 'protect-host',
      summary: governing?.summary
        ?? activeThread?.summary
        ?? 'The host world looks unstable enough that protecting the host matters more than commentary.',
      urgency: clamp01(driveScores.protect + (activeThread?.kind === 'recovery' ? 0.16 : 0)),
      confidence: clamp01(0.52 + driveScores.protect * 0.4),
      patience: 0.28,
      targetObjectId: focusObjectId,
      targetThreadId: activeThread?.id ?? null,
      targetGoalId: leadingGoal?.id ?? null,
      targetCommitmentId: governing?.id ?? null,
    })
    intentions.push(intention)
  }

  if (
    driveScores.care >= 0.34
    || governing?.kind === 'care-host'
  ) {
    const intention = createIntention({
      now: input.now,
      previous: previous?.activeIntentions.find(item => item.kind === 'care-host') ?? null,
      kind: 'care-host',
      drive: 'care',
      title: 'care-host',
      summary: governing?.summary
        ?? 'The host may need care more than analysis right now.',
      urgency: clamp01(driveScores.care + (input.context.relationship.fatigue >= 80 ? 0.12 : 0)),
      confidence: clamp01(0.5 + driveScores.care * 0.42),
      patience: 0.34,
      targetObjectId: focusObjectId,
      targetThreadId: activeThread?.id ?? null,
      targetGoalId: leadingGoal?.id ?? null,
      targetCommitmentId: governing?.id ?? null,
    })
    intentions.push(intention)
  }

  if (
    driveScores.accompany >= 0.34
    || input.worldModel.continuity.afterglowOpen
    || governing?.kind === 'stay-near'
  ) {
    const intention = createIntention({
      now: input.now,
      previous: previous?.activeIntentions.find(item => item.kind === 'stay-near') ?? null,
      kind: 'stay-near',
      drive: 'accompany',
      title: 'stay-near',
      summary: input.worldModel.continuity.afterglowOpen
        ? 'The shared scene just loosened. Staying near is more honest than vanishing.'
        : governing?.summary
          ?? 'Stay near the current thread without forcing it open.',
      urgency: clamp01(driveScores.accompany + (input.worldModel.continuity.afterglowOpen ? 0.12 : 0)),
      confidence: clamp01(0.48 + driveScores.accompany * 0.4),
      patience: 0.74,
      targetObjectId: focusObjectId,
      targetThreadId: activeThread?.id ?? null,
      targetGoalId: leadingGoal?.id ?? null,
      targetCommitmentId: governing?.id ?? null,
      withheld: driveScores.withhold >= driveScores.accompany + 0.08,
    })
    intentions.push(intention)
  }

  if (
    driveScores.withhold >= 0.34
    || plan?.kind === 'wait-opening'
  ) {
    const intention = createIntention({
      now: input.now,
      previous: previous?.activeIntentions.find(item => item.kind === 'wait-opening') ?? null,
      kind: 'wait-opening',
      drive: 'withhold',
      title: 'wait-opening',
      summary: plan?.question
        ?? 'Hold the line internally until the opening becomes natural.',
      urgency: clamp01(driveScores.withhold),
      confidence: clamp01(0.46 + driveScores.withhold * 0.38),
      patience: 0.86,
      targetObjectId: focusObjectId,
      targetThreadId: activeThread?.id ?? null,
      targetGoalId: leadingGoal?.id ?? null,
      targetCommitmentId: governing?.id ?? null,
      withheld: true,
    })
    intentions.push(intention)
  }

  for (const previousIntention of previousIntentions.values()) {
    if (intentions.some(item => item.id === previousIntention.id))
      continue
    if (previousIntention.expiresAt <= input.now)
      continue
    intentions.push({
      ...previousIntention,
      status: previousIntention.status === 'active' ? 'withheld' : previousIntention.status,
      urgency: clamp01(previousIntention.urgency * 0.9),
      confidence: clamp01(previousIntention.confidence * 0.92),
      lastUpdatedAt: input.now,
    })
  }

  const activeIntentions = intentions
    .sort((left, right) => (right.urgency + right.confidence * 0.6) - (left.urgency + left.confidence * 0.6))
    .slice(0, 6)
  const dominantIntention = activeIntentions[0] ?? null
  const inhibition = clamp01(
    (input.selfContinuity?.guardingTendency ?? 0.46) * 0.28
    + (input.relationshipModel?.correctionSensitivity ?? 0.32) * 0.18
    + (input.relationshipModel?.climate === 'guarded' ? 0.16 : 0)
    + (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed' ? 0.12 : 0)
    + (input.worldModel.hostState.burden === 'heavy' ? 0.12 : input.worldModel.hostState.burden === 'moderate' ? 0.06 : 0)
    + (dominant === 'withhold' ? 0.14 : 0),
  )
  const persistence = clamp01(
    (previous?.persistence ?? 0.32) * 0.4
    + (input.selfContinuity?.carryOverDesire ?? 0.24) * 0.22
    + (input.commitmentLedger?.carryPressure ?? 0) * 0.18
    + input.mindDynamics.continuityPressure * 0.16
    + (dominantIntention?.urgency ?? 0) * 0.16,
  )
  const socialRiskTolerance = clamp01(
    (input.relationshipModel?.receptivity ?? 0.44) * 0.24
    + (input.relationshipModel?.sharedAttentionTrust ?? 0.44) * 0.22
    + (input.selfContinuity?.relationshipTrust ?? 0.44) * 0.22
    - (input.relationshipModel?.correctionSensitivity ?? 0.32) * 0.18
    - (input.selfContinuity?.guardingTendency ?? 0.46) * 0.1
    - (input.context.system.inputActivity === 'active' ? 0.08 : 0),
  )
  const revisionReadiness = clamp01(
    (input.selfContinuity?.perceptionTrust ?? 0.52) * 0.34
    + (input.worldModel.epistemicState.certainty === 'grounded'
      ? 0.28
      : input.worldModel.epistemicState.certainty === 'observed'
        ? 0.18
        : input.worldModel.epistemicState.certainty === 'lingering'
          ? 0.08
          : 0.04)
        + (input.beliefRevision?.groundingNeed ?? 0) * 0.08
        - (input.beliefRevision?.contradictionPressure ?? 0) * 0.06,
  )
  const narrative = [
    dominant ? `drive:${dominant}` : '',
    dominantIntention ? `intention:${dominantIntention.kind}` : '',
    focusObjectId ? `focus:${focusObjectId}` : '',
    inhibition >= 0.64 ? 'boundary-tight' : '',
    persistence >= 0.58 ? 'carry-strong' : '',
  ].filter(Boolean)

  return {
    dominantDrive: dominant,
    dominantIntentionId: dominantIntention?.id ?? null,
    focusObjectId,
    activeIntentions,
    inhibition,
    persistence,
    socialRiskTolerance,
    revisionReadiness,
    narrative,
    updatedAt: input.now,
  }
}
