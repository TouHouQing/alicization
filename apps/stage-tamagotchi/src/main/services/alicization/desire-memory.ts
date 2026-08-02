import type {
  AlicizationActionEcologySnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDesireKind,
  AlicizationDesireMemoryEntry,
  AlicizationDesireMemorySnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationGoalKind,
  AlicizationGoalStackSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualTransitionSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const desireTtlMs = 30 * 60_000

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

function desireKindFromGoal(goalKind: AlicizationGoalKind, action: AlicizationInitiativeSnapshot['selectedAction']): AlicizationDesireKind {
  if (action === 'warn')
    return 'warn'
  if (goalKind === 'care-body')
    return 'care'
  if (goalKind === 'clarify-scene' || action === 'recheck')
    return 'recheck'
  if (goalKind === 'stay-near')
    return 'stay-near'
  return 'speak'
}

function desireKindFromMind(input: {
  goalKind?: AlicizationGoalKind | null
  action: AlicizationInitiativeSnapshot['selectedAction']
  commitmentKind?: AlicizationCommitmentLedgerSnapshot['commitments'][number]['kind'] | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
}): AlicizationDesireKind {
  if (input.actionEcology?.mode === 'surface-warning')
    return 'warn'
  if (input.actionEcology?.mode === 'surface-care')
    return 'care'
  if (input.actionEcology?.mode === 'repair-before-speaking')
    return 'recheck'
  if (
    input.actionEcology?.mode === 'quiet-accompany'
    || input.deliberationState?.dominantNeed === 'companionship'
  ) {
    return 'stay-near'
  }
  if (input.deliberationState?.dominantNeed === 'care')
    return 'care'
  if (
    input.deliberationState?.dominantNeed === 'ground-truth'
    || input.deliberationState?.dominantNeed === 'repair'
  ) {
    return 'recheck'
  }
  if (input.commitmentKind === 'recheck-scene' || input.commitmentKind === 'repair-misread')
    return 'recheck'
  if (input.commitmentKind === 'care-host')
    return 'care'
  if (input.commitmentKind === 'stay-near' || input.commitmentKind === 'follow-through')
    return 'stay-near'
  if (input.goalKind)
    return desireKindFromGoal(input.goalKind, input.action)
  if (input.action === 'warn')
    return 'warn'
  if (input.action === 'recheck')
    return 'recheck'
  return input.action === 'hover' ? 'stay-near' : 'speak'
}

function buildReopenWhen(input: {
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  recentTransition: AlicizationVisualTransitionSnapshot | null
}) {
  return [
    input.context.system.inputActivity !== 'active' ? 'host-open' : '',
    input.worldModel.continuity.afterglowOpen ? 'afterglow-window' : '',
    input.worldModel.epistemicState.certainty === 'grounded' ? 'grounded-scene' : '',
    input.worldModel.hostState.availability === 'drifting' || input.worldModel.hostState.availability === 'open' ? 'attention-loose' : '',
  ]
    .map(item => sanitizeText(item, 48))
    .filter(Boolean)
}

function defaultDesireState(now: number): AlicizationDesireMemorySnapshot {
  return {
    activeDesires: [],
    resurfacingDesireId: null,
    withheldCount: 0,
    updatedAt: now,
  }
}

function chooseResurfacingDesire(input: {
  now: number
  desires: AlicizationDesireMemoryEntry[]
  worldModel: AlicizationWorldModelSnapshot
  recentTransition: AlicizationVisualTransitionSnapshot | null
  context: AlicizationProactiveLayeredContext
}) {
  const candidates = input.desires.filter((desire) => {
    if (desire.status !== 'withheld' && desire.status !== 'active')
      return false
    if (desire.expiresAt <= input.now)
      return false
    if (input.worldModel.continuity.afterglowOpen)
      return desire.reopenWhen.includes('afterglow-window')
    return input.context.system.inputActivity !== 'active'
      && (desire.reopenWhen.includes('host-open') || desire.reopenWhen.includes('attention-loose'))
  })
  return candidates.sort((left, right) => right.strength - left.strength)[0] ?? null
}

export function buildDesireMemory(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  goalStack: AlicizationGoalStackSnapshot
  selfContinuity: AlicizationSelfContinuitySnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  initiative: AlicizationInitiativeSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  previous?: AlicizationDesireMemorySnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
}): AlicizationDesireMemorySnapshot {
  const previous = input.previous ?? defaultDesireState(input.now)
  const alicizationGoal = input.goalStack.alicizationGoals.find(goal => goal.id === input.goalStack.leadingAlicizationGoalId)
    ?? input.goalStack.alicizationGoals[0]
    ?? null
  const primaryThread = input.deliberationState?.threads.find(thread => thread.id === input.deliberationState?.primaryThreadId)
    ?? input.deliberationState?.threads[0]
    ?? null
  const governingCommitment = input.commitmentLedger?.commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? input.commitmentLedger?.commitments[0]
    ?? null
  const entityId = alicizationGoal?.entityIds[0] ?? input.entityWorld.focusEntityId ?? null
  const reason = sanitizeText(
    governingCommitment?.summary
    || input.actionEcology?.why
    || primaryThread?.summary
    || input.initiative.why
    || alicizationGoal?.label
    || input.goalStack.unresolvedSummary
    || input.appraisal.whatChanged
    || input.worldModel.activeThread?.summary,
    180,
  )
  const reopenWhen = [
    ...buildReopenWhen({
      context: input.context,
      worldModel: input.worldModel,
      recentTransition: input.recentTransition,
    }),
    governingCommitment?.kind ? `commitment:${governingCommitment.kind}` : '',
    input.actionEcology?.mode ? `ecology:${input.actionEcology.mode}` : '',
    input.deliberationState?.dominantNeed ? `mind-need:${input.deliberationState.dominantNeed}` : '',
    primaryThread?.status === 'ripe' ? 'thread-ripe' : '',
    input.actionEcology?.mode === 'repair-before-speaking' ? 'repair-cleared' : '',
  ]
    .map(item => sanitizeText(item, 48))
    .filter(Boolean)
  const currentDesires = previous.activeDesires.filter(desire => desire.expiresAt > input.now && desire.status !== 'released')
  const carried = new Map(currentDesires.map(desire => [desire.id, desire]))
  const activeDesires: AlicizationDesireMemoryEntry[] = []

  if (reason && (alicizationGoal || input.actionEcology || input.deliberationState)) {
    const kind = desireKindFromMind({
      goalKind: alicizationGoal?.kind ?? null,
      action: input.initiative.selectedAction,
      commitmentKind: governingCommitment?.kind ?? null,
      deliberationState: input.deliberationState,
      actionEcology: input.actionEcology,
    })
    const desireAnchor = alicizationGoal?.id
      ?? governingCommitment?.id
      ?? input.actionEcology?.selectedThreadId
      ?? input.initiative.selectedThreadId
      ?? primaryThread?.id
      ?? 'global'
    const desireId = `desire::${kind}::${sanitizeText(desireAnchor, 120)}::${sanitizeText(entityId ?? '', 120) || 'global'}`
    const previousDesire = carried.get(desireId)
    const speakingNow = typeof input.initiative.shouldSpeak === 'boolean'
      ? input.initiative.shouldSpeak
      : input.actionEcology?.shouldSpeak
        ?? (
          input.initiative.selectedAction === 'speak'
          || input.initiative.selectedAction === 'whisper'
          || input.initiative.selectedAction === 'warn'
        )
    const ecologyWithholding = input.actionEcology
      && !input.actionEcology.shouldSpeak
      && (
        input.actionEcology.mode === 'repair-before-speaking'
        || input.actionEcology.mode === 'return-later'
        || input.actionEcology.mode === 'quiet-accompany'
        || input.actionEcology.mode === 'silent-presence'
      )
    const nextStatus: AlicizationDesireMemoryEntry['status'] = speakingNow
      ? 'surfaced'
      : ecologyWithholding || input.initiative.selectedAction === 'hover' || input.initiative.selectedAction === 'recheck' || input.initiative.selectedAction === 'wait'
        ? 'withheld'
        : 'active'
    const strength = clamp01(
      (alicizationGoal?.desireWeight ?? 0.28) * 0.34
      + input.initiative.confidence * 0.16
      + input.selfContinuity.carryOverDesire * 0.22
      + (alicizationGoal?.urgency ?? 0.28) * 0.12
      + (input.deliberationState?.readiness ?? 0) * 0.1
      + (input.commitmentLedger?.carryPressure ?? 0) * 0.12
      + (input.actionEcology?.surfacePressure ?? 0) * 0.1
      + (input.motiveEngine?.returnPressure ?? 0) * (kind === 'recheck' ? 0.12 : 0.04)
      + (input.motiveEngine?.drives.companionship ?? 0) * (kind === 'stay-near' ? 0.1 : 0)
      + (input.motiveEngine?.drives.restProtection ?? 0) * (kind === 'care' || kind === 'warn' ? 0.12 : 0)
      - (input.actionEcology?.silencePressure ?? 0) * 0.08,
    )
    activeDesires.push({
      id: desireId,
      kind,
      status: nextStatus,
      reason,
      strength,
      goalId: alicizationGoal?.id ?? null,
      entityId,
      reopenWhen: Array.from(new Set(reopenWhen)).slice(0, 8),
      createdAt: previousDesire?.createdAt ?? input.now,
      lastFeltAt: input.now,
      lastSurfacedAt: speakingNow ? input.now : previousDesire?.lastSurfacedAt ?? null,
      expiresAt: input.now + (
        input.habitPolicy?.returnViaRecheck && kind === 'recheck'
          ? 40 * 60_000
          : speakingNow ? 5 * 60_000 : desireTtlMs
      ),
    })
  }

  for (const previousDesire of currentDesires) {
    if (activeDesires.some(item => item.id === previousDesire.id))
      continue
    activeDesires.push({
      ...previousDesire,
      status: previousDesire.status === 'surfaced' ? 'active' : previousDesire.status,
      strength: clamp01(previousDesire.strength * 0.92),
    })
  }

  const resurfacingDesire = chooseResurfacingDesire({
    now: input.now,
    desires: activeDesires,
    worldModel: input.worldModel,
    recentTransition: input.recentTransition,
    context: input.context,
  })

  return {
    activeDesires: activeDesires
      .sort((left, right) => right.strength - left.strength)
      .slice(0, 6),
    resurfacingDesireId: resurfacingDesire?.id ?? null,
    withheldCount: activeDesires.filter(desire => desire.status === 'withheld').length,
    updatedAt: input.now,
  }
}
