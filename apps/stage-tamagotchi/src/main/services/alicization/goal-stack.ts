import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationDurabilityPulseSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationGoalKind,
  AlicizationGoalSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import {
  buildAutobiographicalContinuityAnchor,
  pickDominantAutobiographicalGoal,
} from './autobiographical-self'

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
    case 'continue-phase-1-line': return 'chat'
    default: return 'browse'
  }
}

function desiredAlicizationGoalKind(input: {
  context: AlicizationProactiveLayeredContext
  appraisal: AlicizationSubjectiveSceneAppraisal
  worldModel: AlicizationWorldModelSnapshot
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  watchMode: AlicizationVisualWatchMode
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  const dominantAutobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf)
  const rememberedCareBias = input.longHorizonMemory?.preferenceBias.proactiveCare ?? 0
  const rememberedAutonomyBias = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const rememberedReturnBias = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  const rememberedCompanionshipBias = input.longHorizonMemory?.preferenceBias.companionship ?? 0
  const dominantAgenda = input.motiveEngine?.backgroundAgendas[0] ?? input.motiveEngine?.longTermGoals[0] ?? null
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'recover-thread' as const
  if (input.habitPolicy?.protectsRestWindow)
    return 'care-body' as const
  if (input.habitPolicy?.returnViaRecheck && input.worldModel.activeThread?.unresolved)
    return 'clarify-scene' as const
  if (dominantAgenda?.targetGoalKind && dominantAgenda.weight >= 0.62) {
    if (
      dominantAgenda.targetGoalKind === 'stay-near'
      && (input.habitPolicy?.blocksDirectSpeakWhenBusy || input.habitPolicy?.prefersQuietCompanionship)
    ) {
      return 'guard-focus' as const
    }
    return dominantAgenda.targetGoalKind
  }
  if (
    dominantAutobiographicalGoal?.kind === 'protect-rest-rhythm'
    && (
      input.context.relationship.fatigue >= 60
      || input.appraisal.relationshipNeed === 'care'
      || input.worldModel.activeThread?.kind === 'late-night-endurance'
    )
  ) {
    return 'care-body' as const
  }
  if (
    rememberedCareBias >= 0.58
    && (
      input.context.relationship.fatigue >= 54
      || input.worldModel.hostState.burden === 'heavy'
      || input.appraisal.relationshipNeed === 'care'
    )
  ) {
    return 'care-body' as const
  }
  if (
    (dominantAutobiographicalGoal?.kind === 'preserve-trust' || dominantAutobiographicalGoal?.kind === 'reduce-misread')
    && input.appraisal.relationshipNeed === 'guidance'
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    return 'clarify-scene' as const
  }
  if (
    dominantAutobiographicalGoal?.kind === 'finish-open-loops'
    && input.worldModel.activeThread?.unresolved
  ) {
    return input.worldModel.epistemicState.certainty === 'grounded'
      ? 'help-resolve'
      : 'clarify-scene'
  }
  if (
    rememberedReturnBias >= 0.58
    && input.worldModel.activeThread?.unresolved
  ) {
    return input.worldModel.epistemicState.certainty === 'grounded'
      ? 'help-resolve'
      : 'clarify-scene'
  }
  if (
    dominantAutobiographicalGoal?.kind === 'stay-near-without-crowding'
    && input.appraisal.relationshipNeed === 'companionship'
  ) {
    return input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed'
      ? 'guard-focus'
      : 'stay-near'
  }
  if (
    rememberedAutonomyBias >= 0.58
    && (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed')
  ) {
    return 'guard-focus' as const
  }
  if (
    rememberedCompanionshipBias >= 0.58
    && input.appraisal.relationshipNeed === 'companionship'
  ) {
    return 'stay-near' as const
  }
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
    case 'clarify-scene': return `scene clarity around ${subject}`
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

function buildAutonomousAgendaGoals(input: {
  now: number
  anchor: string
  entityIds: string[]
  openQuestions: string[]
  worldModel: AlicizationWorldModelSnapshot
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  appraisal: AlicizationSubjectiveSceneAppraisal
  previous?: AlicizationGoalSnapshot[] | null
}) {
  const agendaGoals: AlicizationGoalSnapshot[] = []
  for (const agenda of input.motiveEngine?.backgroundAgendas ?? []) {
    if (!agenda.targetGoalKind || agenda.weight < 0.58)
      continue
    const kind = agenda.targetGoalKind === 'stay-near' && input.habitPolicy?.prefersQuietCompanionship
      ? 'guard-focus'
      : agenda.targetGoalKind
    const blocked = (kind === 'help-resolve' || kind === 'clarify-scene')
      && input.worldModel.epistemicState.certainty !== 'grounded'
      && input.openQuestions.length > 0
    const goal = buildGoal({
      owner: 'alicization',
      kind,
      anchor: `${input.anchor}:${agenda.kind}`,
      confidence: clamp01(0.52 + agenda.weight * 0.34),
      urgency: clamp01(0.24 + agenda.weight * 0.52),
      desireWeight: clamp01(0.18 + agenda.weight * 0.5),
      blockers: blocked ? input.openQuestions : [],
      entityIds: input.entityIds,
      now: input.now,
      previous: input.previous?.find(item => item.id === stableGoalId('alicization', kind, `${input.anchor}:${agenda.kind}`)),
      blocked,
    })
    goal.label = sanitizeText(agenda.summary, 160) || goal.label
    agendaGoals.push(goal)
  }
  return agendaGoals
}

function mapAutobiographicalGoalKindToAlicizationGoalKind(input: {
  kind: NonNullable<AlicizationAutobiographicalSelfSnapshot['activeGoals']>[number]['kind']
  worldModel: AlicizationWorldModelSnapshot
  habitPolicy?: AlicizationHabitPolicySnapshot | null
}) {
  switch (input.kind) {
    case 'preserve-trust':
    case 'reduce-misread':
      return input.worldModel.epistemicState.certainty === 'grounded'
        ? 'help-resolve' as const
        : 'clarify-scene' as const
    case 'stay-near-without-crowding':
      return input.habitPolicy?.blocksDirectSpeakWhenBusy
        || input.worldModel.hostState.availability === 'focused'
        || input.worldModel.hostState.availability === 'immersed'
        ? 'guard-focus' as const
        : 'stay-near' as const
    case 'protect-rest-rhythm':
      return 'care-body' as const
    case 'finish-open-loops':
      return input.worldModel.epistemicState.certainty === 'grounded'
        ? 'help-resolve' as const
        : 'clarify-scene' as const
    case 'grow-shared-language':
      return input.habitPolicy?.prefersQuietCompanionship
        ? 'guard-focus' as const
        : 'stay-near' as const
    default:
      return 'guard-focus' as const
  }
}

function buildDurableAutobiographicalGoals(input: {
  now: number
  worldModel: AlicizationWorldModelSnapshot
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  openQuestions: string[]
  previous?: AlicizationGoalSnapshot[] | null
}) {
  const durableAnchor = buildAutobiographicalContinuityAnchor({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    goalStack: input.goalStack ?? null,
  })
  if (!durableAnchor)
    return [] as AlicizationGoalSnapshot[]

  const activeGoals = (input.autobiographicalSelf?.activeGoals ?? [])
    .filter(goal => goal.weight >= 0.42 && goal.status !== 'background')
    .slice(0, 3)
  if (activeGoals.length === 0)
    return [] as AlicizationGoalSnapshot[]

  return activeGoals
    .map((goal) => {
      const kind = mapAutobiographicalGoalKindToAlicizationGoalKind({
        kind: goal.kind,
        worldModel: input.worldModel,
        habitPolicy: input.habitPolicy ?? null,
      })
      const blocked
        = (kind === 'help-resolve' || kind === 'clarify-scene')
          && input.worldModel.epistemicState.certainty !== 'grounded'
          && input.openQuestions.length > 0
      const anchor = `${durableAnchor}:${goal.kind}`
      const previous = input.previous?.find(item => item.id === stableGoalId('alicization', kind, anchor))
      const snapshot = buildGoal({
        owner: 'alicization',
        kind,
        anchor,
        confidence: clamp01(0.46 + goal.weight * 0.38 + (goal.status === 'active' ? 0.1 : 0)),
        urgency: clamp01(
          0.18
          + goal.weight * 0.34
          + (goal.kind === 'protect-rest-rhythm' ? 0.12 : 0)
          + (goal.kind === 'finish-open-loops' ? 0.12 : 0)
          + (input.longHorizonMemory?.rememberedPlanSummary ? 0.08 : 0)
          + (input.longHorizonMemory?.rememberedConstraintSummary && kind === 'guard-focus' ? 0.08 : 0),
        ),
        desireWeight: clamp01(
          0.12
          + goal.weight * 0.4
          + (input.longHorizonMemory?.rememberedPreferenceSummary && kind === 'stay-near' ? 0.1 : 0)
          + (input.longHorizonMemory?.rememberedPlanSummary && (kind === 'help-resolve' || kind === 'clarify-scene') ? 0.08 : 0),
        ),
        blockers: blocked ? input.openQuestions : [],
        entityIds: [],
        now: input.now,
        previous,
        blocked,
      })
      snapshot.label = sanitizeText(goal.summary, 160) || snapshot.label
      return snapshot
    })
}

export function buildGoalStack(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  previousGoalStack?: AlicizationGoalStackSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
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
    longHorizonMemory: input.longHorizonMemory ?? null,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    watchMode: input.watchMode,
    durabilityPulse: input.durabilityPulse,
  })
  const companionshipBias = input.autobiographicalSelf?.preferenceEvolution.companionship ?? 0
  const truthBias = input.autobiographicalSelf?.preferenceEvolution.truthfulGrounding ?? 0
  const careBias = input.autobiographicalSelf?.preferenceEvolution.proactiveCare ?? 0
  const autonomyBias = input.autobiographicalSelf?.preferenceEvolution.autonomyRespect ?? 0
  const unfinishedThreadBias = input.autobiographicalSelf?.preferenceEvolution.unfinishedThreadReturn ?? 0
  const rememberedCompanionshipBias = input.longHorizonMemory?.preferenceBias.companionship ?? 0
  const rememberedTruthBias = input.longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0
  const rememberedCareBias = input.longHorizonMemory?.preferenceBias.proactiveCare ?? 0
  const rememberedAutonomyBias = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const rememberedReturnBias = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
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
      + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.24 : 0)
      + ((aliceGoalKind === 'care-body' ? careBias : aliceGoalKind === 'stay-near' ? companionshipBias : aliceGoalKind === 'guard-focus' ? autonomyBias : truthBias) * 0.16)
      + ((aliceGoalKind === 'care-body' ? rememberedCareBias : aliceGoalKind === 'stay-near' ? rememberedCompanionshipBias : aliceGoalKind === 'guard-focus' ? rememberedAutonomyBias : rememberedTruthBias) * 0.18)
      + ((aliceGoalKind === 'help-resolve' || aliceGoalKind === 'clarify-scene') ? (unfinishedThreadBias * 0.12 + rememberedReturnBias * 0.14) : 0),
    ),
    desireWeight: clamp01(
      input.appraisal.desireToSpeak * 0.36
      + (input.appraisal.relationshipNeed === 'companionship' ? 0.16 : 0)
      + (input.worldModel.continuity.afterglowOpen ? 0.14 : 0)
      + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.18 : 0)
      + ((aliceGoalKind === 'stay-near' ? companionshipBias : aliceGoalKind === 'care-body' ? careBias : aliceGoalKind === 'guard-focus' ? autonomyBias : unfinishedThreadBias) * 0.14)
      + ((aliceGoalKind === 'stay-near' ? rememberedCompanionshipBias : aliceGoalKind === 'care-body' ? rememberedCareBias : aliceGoalKind === 'guard-focus' ? rememberedAutonomyBias : rememberedReturnBias) * 0.16),
    ),
    blockers: aliceGoalKind === 'guard-focus' ? [] : openQuestions,
    entityIds: anchorEntityId ? [anchorEntityId] : [],
    now: input.now,
    previous: previousAliceGoals?.find(goal => goal.id === stableGoalId('alicization', aliceGoalKind, anchor)),
    blocked: aliceBlocked,
  })
  currentAlicizationGoal.label = goalLabel(aliceGoalKind, anchor, input.appraisal)
  const autonomousAgendaGoals = buildAutonomousAgendaGoals({
    now: input.now,
    anchor,
    entityIds: anchorEntityId ? [anchorEntityId] : [],
    openQuestions,
    worldModel: input.worldModel,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    appraisal: input.appraisal,
    previous: previousAliceGoals ?? null,
  })
  const durableAutobiographicalGoals = buildDurableAutobiographicalGoals({
    now: input.now,
    worldModel: input.worldModel,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    goalStack: input.previousGoalStack ?? null,
    habitPolicy: input.habitPolicy ?? null,
    openQuestions,
    previous: previousAliceGoals ?? null,
  })

  const hostGoals = mergeGoals({
    now: input.now,
    previous: previousHostGoals,
    current: [currentHostGoal],
  })
  const alicizationGoals = mergeGoals({
    now: input.now,
    previous: previousAliceGoals,
    current: [
      currentAlicizationGoal,
      ...autonomousAgendaGoals.filter(goal => goal.id !== currentAlicizationGoal.id),
      ...durableAutobiographicalGoals.filter(goal => goal.id !== currentAlicizationGoal.id),
    ],
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
