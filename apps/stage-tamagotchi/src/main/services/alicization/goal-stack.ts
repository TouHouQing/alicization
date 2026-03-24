import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationGoalKind,
  AlicizationGoalSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const goalLingeringTtlMs = 25 * 60_000

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function stableGoalId(owner: 'host' | 'alicization', kind: AlicizationGoalKind, anchor: string) {
  return `${owner}::${kind}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
    || pulse?.kind === 'anr-likely'
}

function desiredHostGoalKind(appraisal: AlicizationSubjectiveSceneAppraisal): AlicizationGoalKind {
  switch (appraisal.inferredHostGoal) {
    case 'resolve-problem': return 'resolve-problem'
    case 'inspect-change': return 'inspect-change'
    case 'consume-media': return 'consume-media'
    case 'rest': return 'rest'
    case 'chat': return 'chat'
    case 'browse': return 'browse'
    default: return 'browse'
  }
}

function desiredAlicizationGoalKind(input: {
  context: AlicizationProactiveLayeredContext
  appraisal: AlicizationSubjectiveSceneAppraisal
  worldModel: AlicizationWorldModelSnapshot
  watchMode: AlicizationVisualWatchMode
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'recover-thread' as const
  if (input.appraisal.relationshipNeed === 'care')
    return 'care-body' as const
  if (input.appraisal.relationshipNeed === 'space')
    return 'guard-focus' as const
  if (
    input.appraisal.relationshipNeed === 'guidance'
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    return 'clarify-scene' as const
  }
  if (input.appraisal.relationshipNeed === 'guidance')
    return 'help-resolve' as const
  if (input.appraisal.relationshipNeed === 'companionship')
    return 'stay-near' as const
  if (
    input.watchMode === 'symbiotic-vision'
    && (input.context.workload.kind === 'media' || input.context.workload.kind === 'chat')
  ) {
    return 'stay-near' as const
  }
  if (input.worldModel.activeThread?.unresolved)
    return 'help-resolve' as const
  return 'guard-focus' as const
}

function goalLabel(kind: AlicizationGoalKind, anchor: string, appraisal: AlicizationSubjectiveSceneAppraisal) {
  const subject = sanitizeText(anchor, 120) || 'this moment'
  switch (kind) {
    case 'resolve-problem': return `host is trying to resolve ${subject}`
    case 'inspect-change': return `host is reviewing whether ${subject} should pass`
    case 'consume-media': return `host is staying inside ${subject}`
    case 'rest': return `host should be winding down around ${subject}`
    case 'chat': return `host is attending to ${subject}`
    case 'browse': return `host is browsing ${subject}`
    case 'stay-near': return `stay near ${subject} without crowding it`
    case 'guard-focus': return `protect the host focus around ${subject}`
    case 'clarify-scene': return `re-ground the scene before speaking about ${subject}`
    case 'help-resolve': return `help the host resolve ${subject}`
    case 'care-body': return `care for the host body before ${subject} hardens`
    case 'recover-thread': return `recover the broken foreground thread around ${subject}`
    default: return appraisal.situatedMeaning ?? `stay with ${subject}`
  }
}

function buildGoal(input: {
  owner: 'host' | 'alicization'
  kind: AlicizationGoalKind
  anchor: string
  confidence: number
  urgency: number
  desireWeight: number
  blockers: string[]
  entityIds: string[]
  now: number
  previous?: AlicizationGoalSnapshot
  blocked: boolean
}): AlicizationGoalSnapshot {
  return {
    id: stableGoalId(input.owner, input.kind, input.anchor),
    owner: input.owner,
    kind: input.kind,
    status: input.blocked ? 'blocked' : 'active',
    label: goalLabel(input.kind, input.anchor, {
      inferredHostGoal: 'unknown',
      confidence: 0,
      surprise: 0,
      carePressure: 0,
      interruptionCost: 0,
      desireToSpeak: 0,
      notes: [],
    }),
    confidence: clamp01(Math.max(input.confidence, input.previous?.confidence ?? 0)),
    urgency: clamp01(Math.max(input.urgency, input.previous?.urgency ?? 0)),
    desireWeight: clamp01(Math.max(input.desireWeight, input.previous?.desireWeight ?? 0)),
    blockers: [...new Set(input.blockers.map(item => sanitizeText(item, 140)).filter(Boolean))].slice(0, 4),
    entityIds: [...new Set(input.entityIds.filter(Boolean))].slice(0, 4),
    createdAt: input.previous?.createdAt ?? input.now,
    lastUpdatedAt: input.now,
  }
}

function mergeGoals(input: {
  now: number
  previous: AlicizationGoalSnapshot[] | undefined
  current: AlicizationGoalSnapshot[]
}) {
  const currentById = new Map(input.current.map(goal => [goal.id, goal]))
  const next = [...input.current]
  for (const previous of input.previous ?? []) {
    if (currentById.has(previous.id))
      continue
    if (input.now - previous.lastUpdatedAt > goalLingeringTtlMs)
      continue
    next.push({
      ...previous,
      status: previous.status === 'blocked' ? 'blocked' : 'lingering',
      confidence: clamp01(previous.confidence * 0.92),
      urgency: clamp01(previous.urgency * 0.88),
      desireWeight: clamp01(previous.desireWeight * 0.9),
    })
  }
  return next
    .sort((left, right) => (right.urgency * 0.62 + right.confidence * 0.38) - (left.urgency * 0.62 + left.confidence * 0.38))
    .slice(0, 6)
}

function leadingGoalId(goals: AlicizationGoalSnapshot[]) {
  return goals.find(goal => goal.status === 'active' || goal.status === 'blocked')?.id
    ?? goals[0]?.id
    ?? null
}

function unresolvedSummary(input: {
  hostGoals: AlicizationGoalSnapshot[]
  alicizationGoals: AlicizationGoalSnapshot[]
  worldModel: AlicizationWorldModelSnapshot
}) {
  const blockedGoal = [...input.hostGoals, ...input.alicizationGoals].find(goal => goal.status === 'blocked')
  if (blockedGoal)
    return blockedGoal.blockers[0] ?? blockedGoal.label
  if (input.worldModel.activeThread?.unresolved)
    return sanitizeText(input.worldModel.activeThread.summary, 160)
  return ''
}

export function buildGoalStack(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  previousGoalStack?: AlicizationGoalStackSnapshot | null
  watchMode: AlicizationVisualWatchMode
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}): AlicizationGoalStackSnapshot {
  const anchorEntityId = input.entityWorld.focusEntityId ?? input.entityWorld.activeEntityIds[0] ?? 'global'
  const anchorEntity = input.entityWorld.entities.find(entity => entity.id === anchorEntityId)
  const anchor = sanitizeText(
    input.appraisal.currentKnot
    ?? anchorEntity?.label
    ?? input.worldModel.activeThread?.title
    ?? input.context.system.foregroundWindow?.title
    ?? '',
    120,
  ) || 'current-thread'
  const openQuestions = input.worldModel.epistemicState.openQuestions.slice(0, 3)
  const hostGoalKind = desiredHostGoalKind(input.appraisal)
  const hostBlocked
    = (hostGoalKind === 'resolve-problem' || hostGoalKind === 'inspect-change')
      && input.worldModel.epistemicState.certainty !== 'grounded'
      && openQuestions.length > 0
  const aliceGoalKind = desiredAlicizationGoalKind({
    context: input.context,
    appraisal: input.appraisal,
    worldModel: input.worldModel,
    watchMode: input.watchMode,
    durabilityPulse: input.durabilityPulse,
  })
  const aliceBlocked
    = (aliceGoalKind === 'help-resolve' || aliceGoalKind === 'clarify-scene')
      && input.worldModel.epistemicState.certainty !== 'grounded'
      && openQuestions.length > 0

  const previousHostGoals = input.previousGoalStack?.hostGoals
  const previousAliceGoals = input.previousGoalStack?.alicizationGoals
  const currentHostGoal = buildGoal({
    owner: 'host',
    kind: hostGoalKind,
    anchor,
    confidence: clamp01(input.appraisal.confidence * 0.72 + (input.worldModel.activeThread?.confidence ?? 0) * 0.28),
    urgency: clamp01(
      input.appraisal.carePressure * 0.22
      + input.appraisal.desireToSpeak * 0.16
      + (input.worldModel.activeThread?.significance ?? 0) * 0.32
      + (hostGoalKind === 'resolve-problem' || hostGoalKind === 'inspect-change' ? 0.28 : 0.12),
    ),
    desireWeight: clamp01(input.appraisal.desireToSpeak * 0.34 + (input.worldModel.activeThread?.significance ?? 0) * 0.18),
    blockers: openQuestions,
    entityIds: anchorEntityId ? [anchorEntityId] : [],
    now: input.now,
    previous: previousHostGoals?.find(goal => goal.id === stableGoalId('host', hostGoalKind, anchor)),
    blocked: hostBlocked,
  })
  currentHostGoal.label = goalLabel(hostGoalKind, anchor, input.appraisal)

  const currentAlicizationGoal = buildGoal({
    owner: 'alicization',
    kind: aliceGoalKind,
    anchor,
    confidence: clamp01(
      input.appraisal.confidence * 0.44
      + (input.worldModel.activeThread?.confidence ?? 0) * 0.2
      + (input.appraisal.relationshipNeed === 'care' || input.appraisal.relationshipNeed === 'guidance' ? 0.16 : 0.08)
      + (input.context.relationship.recentProactiveOutcomes[0]?.outcome === 'positive' ? 0.06 : 0),
    ),
    urgency: clamp01(
      input.appraisal.carePressure * 0.38
      + input.appraisal.desireToSpeak * 0.22
      + (input.worldModel.activeThread?.unresolved ? 0.16 : 0.04)
      + (input.recentTransition && input.worldModel.continuity.afterglowOpen ? 0.16 : 0)
      + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.24 : 0),
    ),
    desireWeight: clamp01(
      input.appraisal.desireToSpeak * 0.36
      + (input.appraisal.relationshipNeed === 'companionship' ? 0.16 : 0)
      + (input.worldModel.continuity.afterglowOpen ? 0.14 : 0)
      + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.18 : 0),
    ),
    blockers: aliceGoalKind === 'guard-focus' ? [] : openQuestions,
    entityIds: anchorEntityId ? [anchorEntityId] : [],
    now: input.now,
    previous: previousAliceGoals?.find(goal => goal.id === stableGoalId('alicization', aliceGoalKind, anchor)),
    blocked: aliceBlocked,
  })
  currentAlicizationGoal.label = goalLabel(aliceGoalKind, anchor, input.appraisal)

  const hostGoals = mergeGoals({
    now: input.now,
    previous: previousHostGoals,
    current: [currentHostGoal],
  })
  const alicizationGoals = mergeGoals({
    now: input.now,
    previous: previousAliceGoals,
    current: [currentAlicizationGoal],
  })

  return {
    leadingHostGoalId: leadingGoalId(hostGoals),
    leadingAlicizationGoalId: leadingGoalId(alicizationGoals),
    hostGoals,
    alicizationGoals,
    unresolvedSummary: unresolvedSummary({
      hostGoals,
      alicizationGoals,
      worldModel: input.worldModel,
    }) || undefined,
    updatedAt: input.now,
  }
}
