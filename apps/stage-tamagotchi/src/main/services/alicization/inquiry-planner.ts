import type {
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationInquiryPlanKind,
  AlicizationInquiryPlannerSnapshot,
  AlicizationInquiryPlanSnapshot,
  AlicizationInquiryPriority,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildEpistemicSurfacePosture } from './epistemic-surface'

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

function stablePlanId(kind: AlicizationInquiryPlanKind, anchor: string) {
  return `inquiry-plan::${kind}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function isHighImmersion(input: {
  context: AlicizationProactiveLayeredContext
}) {
  return input.context.system.fullscreenLikely
    || input.context.system.cpuUsage >= 70
    || (input.context.system.inputActivity === 'active' && input.context.system.cpuUsage >= 45)
}

function ttlMs(kind: AlicizationInquiryPlanKind) {
  switch (kind) {
    case 'check-recovery':
      return 12 * 60_000
    case 'reground-scene':
      return 18 * 60_000
    case 'localize-problem':
      return 20 * 60_000
    case 'verify-care':
      return 22 * 60_000
    case 'wait-opening':
      return 15 * 60_000
    case 'follow-thread':
      return 26 * 60_000
  }
}

function priorityScore(priority: AlicizationInquiryPriority) {
  switch (priority) {
    case 'critical':
      return 0.92
    case 'high':
      return 0.72
    case 'medium':
      return 0.5
    case 'low':
      return 0.28
  }
}

function statusFromInput(input: {
  priority: AlicizationInquiryPriority
  askForGrounding: boolean
  context: AlicizationProactiveLayeredContext
  previous?: AlicizationInquiryPlanSnapshot | null
  forceTracking?: boolean
}) {
  if (input.forceTracking)
    return 'tracking' as const
  if (!input.askForGrounding && isHighImmersion({ context: input.context }))
    return 'waiting-opening' as const
  if (input.previous?.status === 'tracking' && priorityScore(input.priority) >= 0.46)
    return 'tracking' as const
  if (priorityScore(input.priority) >= 0.52)
    return 'tracking' as const
  return input.askForGrounding ? 'queued' as const : 'waiting-opening' as const
}

function buildPlan(input: {
  now: number
  kind: AlicizationInquiryPlanKind
  anchor: string
  priority: AlicizationInquiryPriority
  question: string
  askForGrounding: boolean
  suggestedProbeMs: number
  evidenceWanted: string[]
  context: AlicizationProactiveLayeredContext
  targetHypothesisId?: string | null
  targetCommitmentId?: string | null
  targetRuntimeThreadId?: string | null
  previous?: AlicizationInquiryPlanSnapshot | null
  forceTracking?: boolean
}) {
  const previous = input.previous ?? null
  const id = stablePlanId(input.kind, input.anchor)
  return {
    id,
    kind: input.kind,
    status: statusFromInput({
      priority: input.priority,
      askForGrounding: input.askForGrounding,
      context: input.context,
      previous,
      forceTracking: input.forceTracking,
    }),
    priority: input.priority,
    question: sanitizeText(input.question, 180) || input.kind,
    targetHypothesisId: sanitizeText(input.targetHypothesisId, 160) || null,
    targetCommitmentId: sanitizeText(input.targetCommitmentId, 160) || null,
    targetRuntimeThreadId: sanitizeText(input.targetRuntimeThreadId, 160) || null,
    askForGrounding: input.askForGrounding,
    suggestedProbeMs: Math.max(1_000, Math.floor(input.suggestedProbeMs)),
    evidenceWanted: [...new Set(input.evidenceWanted.map(item => sanitizeText(item, 72)).filter(Boolean))].slice(0, 6),
    createdAt: previous?.createdAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + ttlMs(input.kind),
  } satisfies AlicizationInquiryPlanSnapshot
}

function coolingPlan(input: {
  now: number
  previous: AlicizationInquiryPlanSnapshot
}) {
  if (input.previous.expiresAt <= input.now)
    return null
  return {
    ...input.previous,
    status: input.previous.status === 'tracking' ? 'queued' : 'abandoned',
    suggestedProbeMs: Math.min(input.previous.suggestedProbeMs * 2, 90_000),
    expiresAt: Math.min(input.previous.expiresAt, input.now + 8 * 60_000),
  } satisfies AlicizationInquiryPlanSnapshot
}

// Inquiry planner turns carried commitments into explicit epistemic behavior.
// It gives Alicization a concrete next verification move instead of leaving
// uncertainty as a vague tag in the prompt.
export function buildInquiryPlanner(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  commitmentLedger: AlicizationCommitmentLedgerSnapshot
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  recentTransition?: AlicizationVisualTransitionSnapshot | null
  previous?: AlicizationInquiryPlannerSnapshot | null
}): AlicizationInquiryPlannerSnapshot {
  const previous = input.previous ?? null
  const previousById = new Map((previous?.plans ?? []).map(plan => [plan.id, plan]))
  const epistemicSurface = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel: input.worldModel,
    beliefRevision: input.beliefRevision,
  })
  const governingCommitment = input.commitmentLedger.commitments.find(commitment => commitment.id === input.commitmentLedger.governingCommitmentId)
    ?? input.commitmentLedger.commitments[0]
    ?? null
  const foregroundThread = input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const plans: AlicizationInquiryPlanSnapshot[] = []
  const seenIds = new Set<string>()

  const maybePush = (plan: AlicizationInquiryPlanSnapshot | null) => {
    if (!plan)
      return
    if (seenIds.has(plan.id))
      return
    seenIds.add(plan.id)
    plans.push(plan)
  }

  if (
    governingCommitment?.kind === 'recheck-scene'
    || (
      governingCommitment?.kind === 'repair-misread'
      && !epistemicSurface.coarseObservedProblemHolding
    )
    || epistemicSurface.requiresRegroundBeforeSurface
  ) {
    const anchor = governingCommitment?.summary
      ?? input.worldModel.activeThread?.summary
      ?? input.worldModel.epistemicState.openQuestions[0]
      ?? 'grounding'
    const planId = stablePlanId('reground-scene', anchor)
    maybePush(buildPlan({
      now: input.now,
      kind: 'reground-scene',
      anchor,
      priority: (input.beliefRevision?.groundingNeed ?? 0) >= 0.7 || input.worldModel.epistemicState.certainty === 'uncertain'
        ? 'high'
        : 'medium',
      question: input.worldModel.epistemicState.openQuestions[0]
        ?? 'What is actually in front of the host right now, and what part of my continuity is stale?',
      askForGrounding: true,
      suggestedProbeMs: input.worldModel.epistemicState.certainty === 'uncertain' ? 6_000 : 12_000,
      evidenceWanted: [
        'fresh-scene-summary',
        'foreground-target',
        'current-attention',
      ],
      context: input.context,
      targetCommitmentId: governingCommitment?.id ?? null,
      targetRuntimeThreadId: foregroundThread?.id ?? null,
      previous: previousById.get(planId) ?? null,
    }))
  }

  if (
    governingCommitment?.kind === 'hold-problem'
    || input.worldModel.activeThread?.kind === 'debugging'
    || input.worldModel.activeThread?.kind === 'change-review'
  ) {
    const anchor = governingCommitment?.summary ?? input.worldModel.activeThread?.title ?? 'problem'
    const planId = stablePlanId('localize-problem', anchor)
    maybePush(buildPlan({
      now: input.now,
      kind: 'localize-problem',
      anchor,
      priority: input.worldModel.epistemicState.certainty === 'uncertain' ? 'medium' : 'high',
      question: 'Which concrete locus is the knot actually anchored to now?',
      askForGrounding: input.worldModel.epistemicState.certainty === 'uncertain',
      suggestedProbeMs: input.worldModel.epistemicState.certainty === 'uncertain' ? 8_000 : 12_000,
      evidenceWanted: [
        'error-locus',
        'diff-hunk',
        'focused-window-fragment',
      ],
      context: input.context,
      targetCommitmentId: governingCommitment?.id ?? null,
      targetRuntimeThreadId: foregroundThread?.id ?? null,
      previous: previousById.get(planId) ?? null,
      forceTracking: input.worldModel.epistemicState.certainty === 'observed',
    }))
  }

  if (governingCommitment?.kind === 'care-host' || input.worldModel.activeThread?.kind === 'late-night-endurance') {
    const anchor = governingCommitment?.summary ?? input.worldModel.activeThread?.summary ?? 'care'
    const planId = stablePlanId('verify-care', anchor)
    maybePush(buildPlan({
      now: input.now,
      kind: 'verify-care',
      anchor,
      priority: input.context.relationship.fatigue >= 80 ? 'high' : 'medium',
      question: 'Does the host need a real care nudge now, or should I keep the concern internal a little longer?',
      askForGrounding: false,
      suggestedProbeMs: 18_000,
      evidenceWanted: [
        'fatigue-trend',
        'pause-or-idle',
        'late-night-duration',
      ],
      context: input.context,
      targetCommitmentId: governingCommitment?.id ?? null,
      targetRuntimeThreadId: foregroundThread?.id ?? null,
      previous: previousById.get(planId) ?? null,
    }))
  }

  if (governingCommitment?.kind === 'stay-near' || input.worldModel.continuity.afterglowOpen) {
    const anchor = governingCommitment?.summary ?? input.worldModel.activeThread?.summary ?? 'opening'
    const planId = stablePlanId('wait-opening', anchor)
    maybePush(buildPlan({
      now: input.now,
      kind: 'wait-opening',
      anchor,
      priority: 'medium',
      question: 'When will the host naturally loosen enough that a soft presence or whisper would belong here?',
      askForGrounding: false,
      suggestedProbeMs: 15_000,
      evidenceWanted: [
        'input-quieting',
        'afterglow-window',
        'attention-loosening',
      ],
      context: input.context,
      targetCommitmentId: governingCommitment?.id ?? null,
      targetRuntimeThreadId: foregroundThread?.id ?? null,
      previous: previousById.get(planId) ?? null,
    }))
  }

  if (governingCommitment?.kind === 'follow-through' || (foregroundThread?.continuity ?? 0) >= 0.52) {
    const anchor = governingCommitment?.summary ?? foregroundThread?.summary ?? 'thread'
    const planId = stablePlanId('follow-thread', anchor)
    maybePush(buildPlan({
      now: input.now,
      kind: 'follow-thread',
      anchor,
      priority: 'medium',
      question: 'How does this thread continue across the next scene change so it does not get flattened into noise?',
      askForGrounding: false,
      suggestedProbeMs: 20_000,
      evidenceWanted: [
        'thread-continuity',
        'same-target-reacquired',
        'scene-transition',
      ],
      context: input.context,
      targetCommitmentId: governingCommitment?.id ?? null,
      targetRuntimeThreadId: foregroundThread?.id ?? null,
      previous: previousById.get(planId) ?? null,
    }))
  }

  if (input.worldModel.hostState.burden === 'heavy' && input.worldModel.activeThread?.kind === 'recovery') {
    const anchor = input.worldModel.activeThread.summary
    const planId = stablePlanId('check-recovery', anchor)
    maybePush(buildPlan({
      now: input.now,
      kind: 'check-recovery',
      anchor,
      priority: 'critical',
      question: 'Did the host world actually recover, or is the break still alive under the surface?',
      askForGrounding: true,
      suggestedProbeMs: 5_000,
      evidenceWanted: [
        'fresh-window-state',
        'response-restored',
        'same-pid-liveness',
      ],
      context: input.context,
      targetCommitmentId: governingCommitment?.id ?? null,
      targetRuntimeThreadId: foregroundThread?.id ?? null,
      previous: previousById.get(planId) ?? null,
      forceTracking: true,
    }))
  }

  for (const previousPlan of previous?.plans ?? []) {
    if (seenIds.has(previousPlan.id))
      continue
    maybePush(coolingPlan({
      now: input.now,
      previous: previousPlan,
    }))
  }

  const ranked = plans
    .filter(plan => plan.status !== 'abandoned')
    .sort((left, right) => {
      const leftScore = priorityScore(left.priority) + (left.askForGrounding ? 0.12 : 0) + (left.status === 'tracking' ? 0.08 : left.status === 'waiting-opening' ? 0.03 : 0)
      const rightScore = priorityScore(right.priority) + (right.askForGrounding ? 0.12 : 0) + (right.status === 'tracking' ? 0.08 : right.status === 'waiting-opening' ? 0.03 : 0)
      return rightScore - leftScore
    })
    .slice(0, 6)

  const activePlan = ranked[0] ?? null
  const groundingUrgency = clamp01(
    (activePlan?.askForGrounding ? priorityScore(activePlan.priority) : 0) * 0.66
    + (input.beliefRevision?.groundingNeed ?? 0) * 0.26
    + (input.worldModel.epistemicState.certainty === 'uncertain' ? 0.12 : input.worldModel.epistemicState.certainty === 'lingering' ? 0.06 : 0),
  )
  const epistemicPressure = clamp01(
    (activePlan ? priorityScore(activePlan.priority) : 0.18) * 0.42
    + groundingUrgency * 0.3
    + (input.commitmentLedger.carryPressure * 0.16)
    + (input.worldModel.epistemicState.openQuestions.length > 0 ? 0.08 : 0),
  )

  const narrative = [
    activePlan ? `${activePlan.kind} is the current epistemic move.` : '',
    activePlan?.askForGrounding ? 'The next move still depends on fresh grounding.' : '',
    ranked.some(plan => plan.kind === 'wait-opening') ? 'Timing is part of the inquiry, not just an external gate.' : '',
  ].filter(Boolean)

  return {
    activePlanId: activePlan?.id ?? null,
    plans: ranked,
    epistemicPressure,
    groundingUrgency,
    narrative,
    updatedAt: input.now,
  }
}
