import type {
  AlicizationActionEcologySnapshot,
  AlicizationAutobiographicalGoalKind,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationAutonomySnapshot,
  AlicizationConcernSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationMindActionTendency,
  AlicizationMotiveEngineSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function lowerFirst(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : ''
}

function pickLeadingGoal(goalStack?: AlicizationGoalStackSnapshot | null) {
  return goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
}

function pickLeadingAgenda(motiveEngine?: AlicizationMotiveEngineSnapshot | null) {
  return motiveEngine?.backgroundAgendas.find(agenda => agenda.status === 'foreground')
    ?? motiveEngine?.backgroundAgendas.find(agenda => agenda.status === 'warming')
    ?? motiveEngine?.backgroundAgendas[0]
    ?? motiveEngine?.longTermGoals[0]
    ?? null
}

function pickForegroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  return threadRuntime?.threads.find(thread => thread.id === threadRuntime.foregroundThreadId)
    ?? threadRuntime?.threads[0]
    ?? null
}

function pickForegroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
}

function pickResurfacingDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  return desireMemory?.activeDesires.find(desire => desire.id === desireMemory.resurfacingDesireId)
    ?? desireMemory?.activeDesires[0]
    ?? null
}

function pickSelectedProposal(initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null) {
  return initiativeArbitration?.proposals.find(proposal => proposal.id === initiativeArbitration.selectedProposalId)
    ?? initiativeArbitration?.proposals[0]
    ?? null
}

function deriveProjectStateAutonomyBias(projectState?: {
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  landedProgressSummary?: string | null
  primaryOpenLoop?: string | null
  openClosureSummary?: string | null
  nextClosureTarget?: string | null
  nextClosureTargetSummary?: string | null
  emotionalClosureSummary?: string | null
} | null) {
  const identity = sanitizeText(projectState?.identity, 200).toLowerCase()
  const currentPhase = sanitizeText(projectState?.currentPhase, 160).toLowerCase()
  const latestLandedProgress = sanitizeText(projectState?.latestLandedProgress || projectState?.landedProgressSummary, 220).toLowerCase()
  const primaryOpenLoop = sanitizeText(projectState?.primaryOpenLoop || projectState?.openClosureSummary, 220).toLowerCase()
  const nextClosureTarget = sanitizeText(projectState?.nextClosureTarget || projectState?.nextClosureTargetSummary, 220).toLowerCase()
  const emotionalClosureSummary = sanitizeText(projectState?.emotionalClosureSummary, 220).toLowerCase()

  const isDigitalLifeIdentity = identity.includes('digital life')
    || identity.includes('lifeform')
    || identity.includes('companion')
    || identity.includes('continuous personhood')
  const isPhaseOne = currentPhase.includes('phase 1')
  const closureLine = `${latestLandedProgress} ${primaryOpenLoop} ${emotionalClosureSummary}`.trim()
  const hasOpenLifeLoop = closureLine.length > 0
    && (
      closureLine.includes('continuity')
      || closureLine.includes('memory')
      || closureLine.includes('initiative')
      || closureLine.includes('embodiment')
      || closureLine.includes('dialogue')
      || closureLine.includes('personhood')
      || closureLine.includes('closure')
      || closureLine.includes('closed loop')
    )

  if (!isDigitalLifeIdentity || !isPhaseOne || !hasOpenLifeLoop)
    return null

  const sameHerClosureDirection
    = nextClosureTarget.includes('identity-continuity')
      || nextClosureTarget.includes('identity continuity')
      || nextClosureTarget.includes('measured-return')
      || nextClosureTarget.includes('repair-before-closeness')
      || emotionalClosureSummary.includes('identity-continuity')
      || emotionalClosureSummary.includes('identity continuity')
      || emotionalClosureSummary.includes('continuity line')
      || emotionalClosureSummary.includes('measured-return')
      || emotionalClosureSummary.includes('repair-before-closeness')
      || emotionalClosureSummary.includes('low-pressure')
      || emotionalClosureSummary.includes('leave more room')
      || emotionalClosureSummary.includes('do not reopen from scratch')
      || nextClosureTarget.includes('cross-modal')
      || nextClosureTarget.includes('longer-lived voice')
      || nextClosureTarget.includes('resident presence')
      || nextClosureTarget.includes('facial state')
      || nextClosureTarget.includes('motion')
      || nextClosureTarget.includes('具身')
      || nextClosureTarget.includes('拟人')
      || nextClosureTarget.includes('跨模态')

  return {
    guardReason: 'project-phase1-life-loop-open',
    inhibitionBias: sameHerClosureDirection ? 0.12 : 0.08,
    actReadinessPenalty: sameHerClosureDirection ? 0.1 : 0.06,
    prioritizeWhySuffix: sameHerClosureDirection,
    executionIntentPrefix: sameHerClosureDirection
      ? (
          nextClosureTarget.includes('continuity line')
            ? 'keep gathering cross-modal continuity evidence for the open closure'
            : 'keep gathering cross-modal continuity evidence for the open closure'
        )
      : 'keep gathering the open digital-life closure without widening too early',
    whySuffix: sameHerClosureDirection
      ? 'project-phase1 continuity closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return / repair-before-closeness while cross-modal continuity evidence is still being earned.'
      : 'project-phase1-life-loop keeps the action one step more reversible until the digital-life closure is more earned.',
  }
}

function deriveHabitNarrativeAutonomyBias(habitPolicy?: AlicizationHabitPolicySnapshot | null) {
  const narrative = habitPolicy?.narrative ?? []
  const correctedSamePersonSettling = narrative.includes('self-evolution:corrected-same-person-manifestation')
  const quieterEmbodimentSettling = narrative.includes('self-evolution:quieter-embodiment-settling')

  if (!correctedSamePersonSettling && !quieterEmbodimentSettling)
    return null

  return {
    correctedSamePersonSettling,
    quieterEmbodimentSettling,
    preferPrepareAct: correctedSamePersonSettling || quieterEmbodimentSettling,
    preferVisibleHover: correctedSamePersonSettling || quieterEmbodimentSettling,
    guardReasons: [
      correctedSamePersonSettling ? 'corrected-same-person-settling' : '',
      quieterEmbodimentSettling ? 'quieter-embodiment-settling' : '',
    ].filter(Boolean),
    executionIntentPrefix: correctedSamePersonSettling && quieterEmbodimentSettling
      ? 'corrected continuity is still settling and embodiment stays quieter until current evidence supports more direct action'
      : correctedSamePersonSettling
        ? 'corrected continuity is still settling until current evidence supports more direct action'
        : 'embodiment stays quieter until current evidence supports more direct action',
    personaWhyLine: correctedSamePersonSettling && quieterEmbodimentSettling
      ? 'persona keeps corrected same-person continuity settling visible and keeps embodiment quieter while the return re-settles.'
      : correctedSamePersonSettling
        ? 'persona keeps corrected same-person continuity settling visible while the return re-settles.'
        : 'persona keeps embodiment quieter while the return re-settles.',
  }
}

function carriesProjectStateInwardLine(initiativeWhy: string) {
  const normalized = sanitizeText(initiativeWhy, 220).toLowerCase()
  return normalized.includes('phase 1 continuity')
    || normalized.includes('some closure already landed')
    || normalized.includes('unfinished closure')
}

function deriveAutobiographicalGoalKind(autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null): AlicizationAutobiographicalGoalKind | null {
  return pickDominantAutobiographicalGoal(autobiographicalSelf)?.kind ?? null
}

function deriveExecutionIntentKind(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  selectedMode: AlicizationAutonomySnapshot['selectedMode']
  leadingGoalKind: AlicizationAutobiographicalGoalKind | null
  leadingAgendaKind?: string | null
  concern?: AlicizationConcernSnapshot | null
}) {
  if (input.selectedMode === 'prepare-act' || input.selectedMode === 'act') {
    if (
      input.leadingGoalKind === 'protect-rest-rhythm'
      || input.selectedAction === 'warn'
      || input.concern?.kind === 'care-body'
    ) {
      return 'care' as const
    }
    if (
      input.leadingGoalKind === 'preserve-trust'
      || input.leadingGoalKind === 'reduce-misread'
      || input.selectedAction === 'recheck'
    ) {
      return 'repair' as const
    }
    if (input.concern?.kind === 'help-fix')
      return 'guide' as const
    if (input.leadingAgendaKind === 'finish-open-loops' || input.leadingGoalKind === 'finish-open-loops')
      return 'follow-through' as const
    if (input.selectedAction === 'hover' || input.selectedAction === 'whisper')
      return 'companionship' as const
    return 'follow-through' as const
  }

  if (input.selectedAction === 'recheck')
    return 'repair' as const
  if (input.selectedAction === 'warn')
    return 'care' as const
  if (input.selectedAction === 'speak' && input.concern?.kind === 'help-fix')
    return 'guide' as const
  if (input.selectedAction === 'whisper' || input.selectedAction === 'hover')
    return 'companionship' as const
  return 'observe' as const
}

function deriveVisibleAction(input: {
  selectedMode: AlicizationAutonomySnapshot['selectedMode']
  initiative: AlicizationInitiativeSnapshot
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  actReadiness: number
  habitNarrativeAutonomyBias?: ReturnType<typeof deriveHabitNarrativeAutonomyBias>
}) {
  if (input.selectedMode !== 'prepare-act' && input.selectedMode !== 'act')
    return input.initiative.selectedAction

  if (input.habitNarrativeAutonomyBias?.preferVisibleHover)
    return 'hover' as const

  if (
    input.habitPolicy?.requiresGroundingBeforeSurface
    && input.worldModel?.epistemicState.certainty !== 'grounded'
  ) {
    return 'recheck' as const
  }

  if (
    input.context.system.inputActivity === 'active'
    || input.habitPolicy?.blocksDirectSpeakWhenBusy
  ) {
    return 'hover' as const
  }

  if (input.initiative.selectedAction !== 'wait')
    return input.initiative.selectedAction

  if (input.habitPolicy?.prefersQuietCompanionship)
    return 'hover' as const

  return input.actReadiness >= 0.72 ? 'whisper' as const : 'hover' as const
}

function deriveGuardReasons(input: {
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  thoughtThread?: ReturnType<typeof pickForegroundThoughtThread>
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  habitNarrativeAutonomyBias?: ReturnType<typeof deriveHabitNarrativeAutonomyBias>
}) {
  const reasons = [...(input.habitNarrativeAutonomyBias?.guardReasons ?? [])]

  if (
    input.habitPolicy?.requiresGroundingBeforeSurface
    && input.worldModel?.epistemicState.certainty !== 'grounded'
  ) {
    reasons.push('needs-grounding')
  }
  if (
    input.actionEcology?.mode === 'repair-before-speaking'
    || input.executiveCycle?.phase === 'inferring'
    || input.executiveCycle?.phase === 'reflecting'
  ) {
    reasons.push('repair-incomplete')
  }
  if (
    input.context.system.inputActivity === 'active'
    && input.habitPolicy?.blocksDirectSpeakWhenBusy
  ) {
    reasons.push('busy-host')
  }
  if (
    input.habitPolicy?.protectsRestWindow
    && input.context.relationship.fatigue >= 78
  ) {
    reasons.push('rest-window')
  }
  if (
    (input.motiveEngine?.drives.boundaryRespect ?? 0) >= 0.68
    && (
      input.worldModel?.hostState.availability === 'focused'
      || input.worldModel?.hostState.availability === 'immersed'
    )
  ) {
    reasons.push('respect-boundary')
  }
  if (input.thoughtThread?.status === 'waiting' || input.selectedAction === 'wait')
    reasons.push('waiting-opening')

  return reasons
}

function deriveInhibition(input: {
  guardReasons: string[]
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
}) {
  let inhibition = 0

  if (input.guardReasons.includes('needs-grounding'))
    inhibition += 0.22
  if (input.guardReasons.includes('repair-incomplete'))
    inhibition += 0.16
  if (input.guardReasons.includes('busy-host'))
    inhibition += 0.14
  if (input.guardReasons.includes('rest-window'))
    inhibition += 0.14
  if (input.guardReasons.includes('respect-boundary'))
    inhibition += 0.12
  if (input.guardReasons.includes('waiting-opening'))
    inhibition += 0.1
  if (input.context.system.fullscreenLikely)
    inhibition += 0.08
  if (input.executiveCycle?.phase === 'reflecting')
    inhibition += 0.06
  if (input.worldModel?.epistemicState.certainty === 'lingering')
    inhibition += 0.06
  inhibition += (input.motiveEngine?.drives.boundaryRespect ?? 0) * 0.08
  inhibition += (input.habitPolicy?.prefersQuietCompanionship ? 0.04 : 0)

  return clamp01(inhibition)
}

function buildPersonaAutonomyWhy(input: {
  initiative: AlicizationInitiativeSnapshot
  selectedProposal?: ReturnType<typeof pickSelectedProposal>
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  visibleAction: AlicizationMindActionTendency
  baseWhy: string
  habitNarrativeAutonomyBias?: ReturnType<typeof deriveHabitNarrativeAutonomyBias>
}) {
  const proposalWhy = sanitizeText(input.selectedProposal?.why, 220)
  const personaLine = (() => {
    if (input.habitNarrativeAutonomyBias?.personaWhyLine)
      return input.habitNarrativeAutonomyBias.personaWhyLine
    if (proposalWhy.includes('persona='))
      return proposalWhy.split('persona=').slice(1).join('persona=')
    if (input.habitPolicy?.prefersQuietCompanionship && input.visibleAction === 'hover')
      return 'persona keeps the move in observe-first posture.'
    if (
      ((input.initiative.preferredStyle === 'light-nudge' || input.initiative.preferredStyle === 'gentle-care')
        && input.visibleAction === 'whisper')
      || (input.visibleAction === 'whisper' && input.selectedProposal?.shouldSpeak)
    ) {
      return 'persona allows a direct, light reconnect once the opening is real.'
    }
    return ''
  })()

  return sanitizeText([
    input.baseWhy,
    personaLine ? `persona=${personaLine}` : '',
  ].filter(Boolean).join(' '), 220) || input.baseWhy
}

export function buildAutonomySnapshot(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  concerns?: AlicizationConcernSnapshot[] | null
  goalStack?: AlicizationGoalStackSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  initiative: AlicizationInitiativeSnapshot
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  projectState?: {
    identity?: string | null
    currentPhase?: string | null
    latestLandedProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
  } | null
}): AlicizationAutonomySnapshot {
  const leadingGoal = pickLeadingGoal(input.goalStack)
  const leadingAgenda = pickLeadingAgenda(input.motiveEngine)
  const selectedProposal = pickSelectedProposal(input.initiativeArbitration)
  const resurfacingDesire = pickResurfacingDesire(input.desireMemory)
  const runtimeThread = pickForegroundRuntimeThread(input.threadRuntime)
  const thoughtThread = pickForegroundThoughtThread(input.thoughtThreads)
  const concern = input.concerns?.[0] ?? null
  const autobiographicalGoalKind = deriveAutobiographicalGoalKind(input.autobiographicalSelf)
  const projectStateAutonomyBias = deriveProjectStateAutonomyBias(input.projectState ?? null)
  const habitNarrativeAutonomyBias = deriveHabitNarrativeAutonomyBias(input.habitPolicy ?? null)
  const guardReasons = deriveGuardReasons({
    context: input.context,
    worldModel: input.worldModel,
    executiveCycle: input.executiveCycle,
    actionEcology: input.actionEcology,
    habitPolicy: input.habitPolicy,
    motiveEngine: input.motiveEngine,
    thoughtThread,
    selectedAction: input.initiative.selectedAction,
    habitNarrativeAutonomyBias,
  })
  if (projectStateAutonomyBias?.guardReason && !guardReasons.includes(projectStateAutonomyBias.guardReason))
    guardReasons.push(projectStateAutonomyBias.guardReason)
  const inhibition = deriveInhibition({
    guardReasons,
    context: input.context,
    worldModel: input.worldModel,
    executiveCycle: input.executiveCycle,
    habitPolicy: input.habitPolicy,
    motiveEngine: input.motiveEngine,
  }) + (projectStateAutonomyBias?.inhibitionBias ?? 0)

  const speakReadiness = clamp01(
    (input.initiative.speakDrive ?? 0) * 0.42
    + input.initiative.confidence * 0.18
    + (selectedProposal?.shouldSpeak ? selectedProposal.score : 0) * 0.14
    + (input.actionEcology?.surfacePressure ?? 0) * 0.1
    + (input.actionEcology?.shouldSpeak ? 0.08 : 0)
    + (input.executiveCycle?.phase === 'acting' || input.executiveCycle?.phase === 'committing' ? 0.06 : 0)
    + (input.motiveEngine?.drives.companionship ?? 0) * 0.06
    + (input.motiveEngine?.drives.restProtection ?? 0) * 0.06
    - inhibition * 0.32,
  )

  const actReadiness = clamp01(
    (input.executiveCycle?.actionReadiness ?? 0) * 0.34
    + (input.executiveCycle?.shouldAct ? 0.12 : 0)
    + (input.actionEcology?.readiness ?? 0) * 0.16
    + input.initiative.confidence * 0.1
    + (selectedProposal?.score ?? 0) * 0.1
    + (input.motiveEngine?.drives.selfDirection ?? 0) * 0.18
    + (input.motiveEngine?.returnPressure ?? 0) * 0.1
    + (leadingGoal ? Math.max(leadingGoal.urgency, leadingGoal.confidence) : 0) * 0.08
    + (leadingAgenda?.weight ?? 0) * 0.06
    + (runtimeThread ? Math.max(runtimeThread.salience, runtimeThread.continuity) : 0) * 0.08
    + (resurfacingDesire?.strength ?? 0) * 0.06
    + (input.worldModel?.activeThread?.unresolved ? 0.06 : 0)
    - clamp01(inhibition) * 0.34
    - (projectStateAutonomyBias?.actReadinessPenalty ?? 0),
  )

  const controlHot = actReadiness >= 0.72
    && inhibition <= 0.42
    && (input.executiveCycle?.shouldAct === true || (input.motiveEngine?.drives.selfDirection ?? 0) >= 0.62)
    && Boolean(leadingGoal || leadingAgenda || runtimeThread || resurfacingDesire || selectedProposal)
  const controlWarming = !controlHot
    && actReadiness >= 0.6
    && Boolean(leadingGoal || leadingAgenda || runtimeThread || resurfacingDesire || selectedProposal)

  let selectedMode: AlicizationAutonomySnapshot['selectedMode'] = input.initiative.selectedAction
  if (controlHot) {
    selectedMode = 'act'
  }
  else if (controlWarming) {
    selectedMode = 'prepare-act'
  }
  else if (
    input.initiative.selectedAction === 'wait'
    && speakReadiness >= 0.62
    && inhibition < 0.48
    && (input.actionEcology?.shouldSpeak || selectedProposal?.shouldSpeak)
  ) {
    selectedMode = input.context.system.inputActivity === 'active' ? 'whisper' : 'speak'
  }
  if (
    projectStateAutonomyBias
    && selectedMode === 'act'
    && concern?.kind !== 'care-body'
    && input.initiative.selectedAction !== 'warn'
  ) {
    selectedMode = 'prepare-act'
  }
  if (
    habitNarrativeAutonomyBias?.preferPrepareAct
    && selectedMode === 'act'
    && concern?.kind !== 'care-body'
    && input.initiative.selectedAction !== 'warn'
  ) {
    selectedMode = 'prepare-act'
  }

  const visibleAction = deriveVisibleAction({
    selectedMode,
    initiative: input.initiative,
    context: input.context,
    worldModel: input.worldModel,
    habitPolicy: input.habitPolicy,
    actReadiness,
    habitNarrativeAutonomyBias,
  })

  const shouldAct = selectedMode === 'act'
  const shouldSpeak = selectedMode === 'whisper'
    || selectedMode === 'speak'
    || selectedMode === 'warn'
  const shouldSurface = selectedMode !== 'wait'
    || visibleAction !== 'wait'
    || input.initiative.shouldSurface

  const deferReason = selectedMode === 'prepare-act'
    ? guardReasons[0] ?? 'hold-formation'
    : !shouldAct && actReadiness >= 0.58
        ? guardReasons[0] ?? 'not-yet-ripe'
        : null
  const executionIntentKind = deriveExecutionIntentKind({
    selectedAction: visibleAction,
    selectedMode,
    leadingGoalKind: autobiographicalGoalKind,
    leadingAgendaKind: leadingAgenda?.kind ?? null,
    concern,
  })
  const executionIntentSummaryBase = sanitizeText(
    leadingAgenda?.summary
    ?? leadingGoal?.label
    ?? runtimeThread?.summary
    ?? thoughtThread?.summary
    ?? resurfacingDesire?.reason
    ?? selectedProposal?.why
    ?? input.initiative.why,
    220,
  ) || 'The inner line is gathering itself into the next move.'
  const executionIntentPrefix = [
    habitNarrativeAutonomyBias?.executionIntentPrefix ?? '',
    projectStateAutonomyBias?.executionIntentPrefix ?? '',
  ].filter(Boolean).join('; ')
  const executionIntentSummary = sanitizeText(
    executionIntentPrefix
      ? `${executionIntentPrefix}; ${lowerFirst(executionIntentSummaryBase)}`
      : executionIntentSummaryBase,
    220,
  ) || executionIntentSummaryBase
  const executionIntentSummaryWithCarry = projectStateAutonomyBias
    && carriesProjectStateInwardLine(input.initiative.why)
    && !executionIntentSummary.toLowerCase().includes('some closure already landed')
    && !executionIntentSummary.toLowerCase().includes('verified_closure_progress')
    ? sanitizeText(`${executionIntentSummary}; ${lowerFirst(sanitizeText(input.initiative.why, 140))}`, 220) || executionIntentSummary
    : executionIntentSummary
  const whyNow = sanitizeText(
    leadingGoal?.label
    ?? leadingAgenda?.summary
    ?? runtimeThread?.summary
    ?? resurfacingDesire?.reason
    ?? input.executiveCycle?.currentLine
    ?? input.initiative.why,
    220,
  ) || 'The current continuity line has become strong enough to shape a next move.'
  const personaWhyNow = buildPersonaAutonomyWhy({
    initiative: input.initiative,
    selectedProposal,
    habitPolicy: input.habitPolicy ?? null,
    visibleAction,
    baseWhy: whyNow,
    habitNarrativeAutonomyBias,
  })
  const finalInhibition = clamp01(inhibition)
  const finalWhyNow = projectStateAutonomyBias?.whySuffix
    ? sanitizeText(
      projectStateAutonomyBias.prioritizeWhySuffix
        ? `${projectStateAutonomyBias.whySuffix} ${lowerFirst(personaWhyNow)}`
        : `${personaWhyNow} ${projectStateAutonomyBias.whySuffix}`,
      220,
    ) || personaWhyNow
    : personaWhyNow
  const finalWhyNowWithCarry = projectStateAutonomyBias
    && carriesProjectStateInwardLine(input.initiative.why)
    && !finalWhyNow.toLowerCase().includes('phase 1 continuity')
    ? sanitizeText(`${finalWhyNow} ${sanitizeText(input.initiative.why, 120)}`, 220) || finalWhyNow
    : finalWhyNow

  return {
    selectedMode,
    visibleAction,
    shouldSurface,
    shouldSpeak,
    shouldAct,
    speakReadiness,
    actReadiness,
    inhibition: finalInhibition,
    confidence: clamp01(
      Math.max(
        input.initiative.confidence,
        selectedProposal?.score ?? 0,
        selectedMode === 'act' || selectedMode === 'prepare-act' ? actReadiness : speakReadiness,
      ),
    ),
    deferReason,
    guardReasons,
    whyNow: finalWhyNowWithCarry,
    sourceGoalId: leadingGoal?.id ?? resurfacingDesire?.goalId ?? null,
    sourceGoalSummary: sanitizeText(leadingGoal?.label ?? '', 160) || null,
    sourceAgendaId: leadingAgenda?.id ?? null,
    sourceAgendaKind: sanitizeText(leadingAgenda?.kind ?? '', 64) || null,
    sourceAgendaSummary: sanitizeText(leadingAgenda?.summary ?? '', 180) || null,
    sourceThreadId: runtimeThread?.id ?? input.worldModel?.activeThread?.id ?? null,
    sourceThreadSummary: sanitizeText(runtimeThread?.summary ?? input.worldModel?.activeThread?.summary ?? '', 180) || null,
    sourceThoughtThreadId: thoughtThread?.id ?? null,
    sourceDesireId: resurfacingDesire?.id ?? null,
    sourceConcernId: concern?.id ?? null,
    sourceProposalId: selectedProposal?.id ?? input.initiative.selectedProposalId ?? null,
    sourceProposalSource: sanitizeText(selectedProposal?.source ?? '', 64) || null,
    executionIntent: {
      kind: executionIntentKind,
      summary: executionIntentSummaryWithCarry,
      targetThreadId: runtimeThread?.id ?? input.worldModel?.activeThread?.id ?? null,
    },
    updatedAt: input.now,
  }
}
