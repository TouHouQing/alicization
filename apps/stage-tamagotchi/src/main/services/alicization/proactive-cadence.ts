import type {
  AlicizationActionEcologySnapshot,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationAutonomySnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationInitiativeSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationEmotionalTransitionDecaySnapshot } from './emotional-ledger'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 120) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function hasExecutionCallbackAfterglowHold(input: {
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
}) {
  const cadenceMemory = input.affectiveResidue?.relationshipCadence ?? null

  return input.personalityContinuityState?.currentRegime === 'execution-callback'
    && cadenceMemory?.cadenceMode === 'measured-return'
    && cadenceMemory?.shouldDelayWarmth === true
    && (cadenceMemory?.afterglowCarry ?? 0) >= 0.18
}

function hasThinAffectiveResidueRoomMakingHold(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null) {
  const cadenceMemory = affectiveResidue?.relationshipCadence ?? null
  if (cadenceMemory?.shouldDelayWarmth === true)
    return true

  return affectiveResidue?.dominantResidueKind === 'afterglow'
    && (cadenceMemory?.cadenceMode === 'measured-return' || cadenceMemory?.cadenceMode === 'cooldown')
    && (cadenceMemory?.afterglowCarry ?? 0) >= 0.18
}

function deriveSelfEvolutionCadenceBias(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return null

  const learningAction = selfEvolution.nextLearningAction
  const revisionActive = selfEvolution.shouldRevise
    || selfEvolution.revisionPressure >= 0.4
    || selfEvolution.contradictionPressure >= 0.4
  const internalizing = learningAction === 'internalize'
    || selfEvolution.shouldInternalize === true
  const cadenceLearningActive = revisionActive
    || internalizing
    || learningAction === 'verify'
    || learningAction === 'reflect'

  if (!cadenceLearningActive)
    return null

  const weighting = 0.7
    + Math.min(0.2, (selfEvolution.evolutionMomentum ?? 0) * 0.2)
    + Math.min(0.1, (selfEvolution.learningReadiness ?? 0) * 0.1)

  const baseSoftening = (
    (revisionActive ? 0.06 : 0)
    + (internalizing ? 0.04 : 0)
    + (learningAction === 'verify' ? 0.02 : 0)
    + (learningAction === 'reflect' ? 0.02 : 0)
  ) * weighting

  return {
    openingMomentumDamp: clamp01(Math.min(0.18, baseSoftening)),
    cadencePressureDamp: clamp01(Math.min(0.2, baseSoftening + (internalizing ? 0.01 : 0))),
    reasonTags: ['self-evolution:cadence-policy'],
  }
}

function deriveAutobiographicalCadenceBias(autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null) {
  if (!autobiographicalSelf)
    return null

  const preferenceEvolution = autobiographicalSelf.preferenceEvolution ?? {
    quietObservation: 0,
    autonomyRespect: 0,
  }
  const behaviorSignatures = asArray(autobiographicalSelf.behaviorSignatures)
  const quietHabit = behaviorSignatures.includes('habit:choose-openings-carefully')
    || behaviorSignatures.includes('habit:keep-gentle-openings')
  const quietPreference = preferenceEvolution.quietObservation >= 0.65
    || preferenceEvolution.autonomyRespect >= 0.72
  if (!quietHabit && !quietPreference)
    return null

  const weighting = 0.72
    + Math.min(0.14, (autobiographicalSelf.stability ?? 0) * 0.14)
    + Math.min(0.06, preferenceEvolution.quietObservation * 0.06)
    + Math.min(0.04, preferenceEvolution.autonomyRespect * 0.04)

  const baseSoftening = (
    (quietHabit ? 0.05 : 0)
    + (quietPreference ? 0.04 : 0)
  ) * weighting

  return {
    openingMomentumDamp: clamp01(Math.min(0.14, baseSoftening)),
    cadencePressureDamp: clamp01(Math.min(0.16, baseSoftening)),
    reasonTags: ['autobiographical-self:cadence-policy'],
  }
}

function deriveContinuityGovernanceCadenceBias(
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null,
) {
  const reasonCodes = asArray(activeContinuityGovernance?.reasonCodes)
    .map(code => sanitizeText(code, 80).toLowerCase())
  const lanes = asArray(activeContinuityGovernance?.lanes)
    .map(lane => sanitizeText(lane, 80).toLowerCase())
  const hasEmotionalGovernanceReason = reasonCodes.some(code =>
    code.startsWith('emotion-transition:')
    || code.startsWith('emotion-initiative:')
    || code.startsWith('emotion-embodiment:'),
  )
  const hasEmotionalProactiveLane = lanes.includes('proactive-policy')
    && hasEmotionalGovernanceReason
  const repairFirstEmotionalSuppression = reasonCodes.includes('emotion-transition:repair-shift')
    || reasonCodes.includes('emotion-initiative:repair-first')
  const restGuardEmotionalSuppression = reasonCodes.includes('emotion-transition:rest-protective-shift')
    || reasonCodes.includes('emotion-initiative:rest-guard')
  const measuredReturnEmotionalSuppression = reasonCodes.includes('emotion-initiative:measured-return')
    || reasonCodes.includes('emotion-initiative:single-thread')

  if (hasEmotionalProactiveLane) {
    const suppressionWeight = repairFirstEmotionalSuppression
      ? 1
      : restGuardEmotionalSuppression
        ? 0.92
        : measuredReturnEmotionalSuppression
          ? 0.78
          : 0.68

    return {
      openingMomentumDamp: clamp01(0.06 * suppressionWeight),
      cadencePressureDamp: clamp01(0.08 * suppressionWeight),
      reasonTags: [
        'continuity-governance:emotional-self-revision',
        ...(repairFirstEmotionalSuppression || restGuardEmotionalSuppression || measuredReturnEmotionalSuppression
          ? ['continuity-governance:emotion-initiative-suppression']
          : []),
      ],
    }
  }

  return null
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  const threads = asArray(thoughtThreads?.threads)
  return threads.find(thread => thread.id === thoughtThreads?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function foregroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  const threads = asArray(threadRuntime?.threads)
  return threads.find(thread => thread.id === threadRuntime?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function hostBusy(context: AlicizationProactiveLayeredContext, worldModel?: AlicizationWorldModelSnapshot | null) {
  return context.system.inputActivity === 'active'
    || context.system.fullscreenLikely
    || context.system.cpuUsage >= 70
    || worldModel?.hostState.availability === 'focused'
    || worldModel?.hostState.availability === 'immersed'
}

function deriveEmotionalDecayCadenceBias(decay?: AlicizationEmotionalTransitionDecaySnapshot | null) {
  if (!decay)
    return null

  if (decay.phase === 'release') {
    return {
      openingMomentumDamp: 0,
      cadencePressureDamp: 0,
      reasonTags: ['emotion-decay:released'],
    }
  }

  const suppressWeight = decay.phase === 'hold' ? 1 : 0.58
  const repairFirst = decay.initiativeMode === 'repair-first' || decay.embodimentTone === 'repair-before-closeness'
  const restGuard = decay.initiativeMode === 'rest-guard' || decay.embodimentTone === 'rest-protective'
  const measuredReturn = decay.initiativeMode === 'measured-return' || decay.embodimentTone === 'measured-return'
  const baseDamp = decay.shouldSuppressInitiative ? 0.1 : 0.04
  const toneDamp = repairFirst
    ? 0.06
    : restGuard
      ? 0.07
      : measuredReturn
        ? 0.04
        : 0

  return {
    openingMomentumDamp: clamp01(Math.min(0.2, (baseDamp + toneDamp) * suppressWeight)),
    cadencePressureDamp: clamp01(Math.min(0.22, (baseDamp + toneDamp + 0.02) * suppressWeight)),
    reasonTags: [
      `emotion-decay:${decay.phase}`,
      ...(repairFirst ? ['emotion-decay:repair-first', 'emotion-decay:repair-before-closeness'] : []),
      ...(restGuard ? ['emotion-decay:rest-guard', 'emotion-decay:rest-protective'] : []),
      ...(measuredReturn ? ['emotion-decay:measured-return'] : []),
      ...decay.reasonTags,
    ],
  }
}

export interface AlicizationProactiveCadenceSignal {
  cadencePressure: number
  openingMomentum: number
  initiativeTrust: number
  residueDominance: string | null
  reasonTags: string[]
}

export function progressProactiveCadenceState(input: {
  state: AlicizationProactiveLoopState
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
  emotionalTransitionDecay?: AlicizationEmotionalTransitionDecaySnapshot | null
}) {
  const busy = hostBusy(input.context, input.worldModel ?? null)
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime ?? null)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads ?? null)
  const minutesSinceLastUserTurn = input.context.relationship.minutesSinceLastUserTurn
  const recentProactiveGapMinutes = typeof input.state.lastProactiveTurnAt === 'number'
    ? Math.max(0, (input.now - input.state.lastProactiveTurnAt) / 60_000)
    : Number.POSITIVE_INFINITY
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const affectiveResidue = input.affectiveResidue ?? null
  const cadenceMemory = affectiveResidue?.relationshipCadence ?? null
  const thinAffectiveResidueHold = hasThinAffectiveResidueRoomMakingHold(affectiveResidue)
  const autobiographicalCadenceBias = deriveAutobiographicalCadenceBias(input.autobiographicalSelf ?? null)
  const selfEvolutionCadenceBias = deriveSelfEvolutionCadenceBias(input.selfEvolution ?? null)
  const continuityGovernanceCadenceBias = deriveContinuityGovernanceCadenceBias(input.activeContinuityGovernance ?? null)
  const emotionalDecayCadenceBias = deriveEmotionalDecayCadenceBias(input.emotionalTransitionDecay ?? null)
  const executionCallbackAfterglowHold = hasExecutionCallbackAfterglowHold({
    personalityContinuityState: input.personalityContinuityState ?? null,
    affectiveResidue,
    activeContinuityGovernance: input.activeContinuityGovernance ?? null,
  })
  const targetMomentum = clamp01(
    (busy ? 0 : 0.18)
    + (minutesSinceLastUserTurn >= 4 && minutesSinceLastUserTurn <= 45 ? 0.16 : minutesSinceLastUserTurn > 45 ? 0.08 : 0)
    + (input.privateThought?.shouldSpeak ? 0.08 : 0)
    + (input.initiative?.shouldSpeak ? 0.08 : 0)
    + (input.autonomy?.shouldSpeak ? 0.1 : 0)
    + ((input.motiveEngine?.drives.companionship ?? 0) * 0.18)
    + ((input.motiveEngine?.drives.selfDirection ?? 0) * 0.16)
    + ((input.motiveEngine?.returnPressure ?? 0) * 0.12)
    + ((input.actionEcology?.surfacePressure ?? 0) * 0.14)
    + (runtimeThread ? Math.max(runtimeThread.salience, runtimeThread.continuity) * 0.12 : 0)
    + (thoughtThread?.status === 'ripe' ? 0.12 : thoughtThread?.status === 'waiting' ? 0.04 : 0)
    + (sanitizeText(input.privateThought?.thoughtText) ? 0.06 : 0)
    + (input.worldModel?.continuity.afterglowOpen ? 0.08 : 0)
    + (input.context.relationship.loneliness >= 72 ? 0.08 : 0)
    + (input.context.relationship.boredom >= 72 ? 0.08 : 0)
    + (rhythmState?.cadenceMode === 'ready-return' ? 0.08 : rhythmState?.cadenceMode === 'warm-hold' ? 0.04 : 0)
    + (rhythmState?.memoryResonance ?? 0) * 0.08
    + (cadenceMemory?.afterglowCarry ?? 0) * 0.06
    - (input.state.globalCooldownUntil > input.now ? 0.18 : 0)
    - (busy ? 0.34 : 0)
    - (rhythmState?.restMode === 'rest-protective' ? 0.16 : rhythmState?.restMode === 'low-pressure' ? 0.06 : 0)
    - (thinAffectiveResidueHold ? 0.08 : 0)
    - (executionCallbackAfterglowHold ? 0.06 : 0)
    - (cadenceMemory?.fatigueGuard ?? 0) * 0.12
    - (cadenceMemory?.overreachRisk ?? 0) * 0.12
    - (input.actionEcology?.mode === 'repair-before-speaking' ? 0.16 : 0)
    - (input.actionEcology?.mode === 'return-later' ? 0.12 : 0)
    - (recentProactiveGapMinutes < 6 ? 0.18 : recentProactiveGapMinutes < 12 ? 0.08 : 0)
    - (autobiographicalCadenceBias?.openingMomentumDamp ?? 0)
    - (selfEvolutionCadenceBias?.openingMomentumDamp ?? 0)
    - (continuityGovernanceCadenceBias?.openingMomentumDamp ?? 0)
    - (emotionalDecayCadenceBias?.openingMomentumDamp ?? 0),
  )
  const initiativeTrust = clamp01(
    input.state.initiativeTrust * 0.98
    + 0.01
    + (rhythmState?.cadenceMode === 'ready-return' ? 0.02 : 0)
    + (rhythmState?.memoryResonance ?? 0) * 0.02
    + ((affectiveResidue?.trustPressure ?? 0) * 0.03)
    - (rhythmState?.restMode === 'rest-protective' ? 0.03 : 0),
  )
  const openingMomentum = clamp01(
    input.state.openingMomentum * (busy ? 0.52 : 0.74)
    + targetMomentum * (busy ? 0.18 : 0.26),
  )

  return {
    ...input.state,
    initiativeTrust,
    openingMomentum,
    updatedAt: input.now,
  } satisfies AlicizationProactiveLoopState
}

export function deriveProactiveCadenceSignal(input: {
  state: AlicizationProactiveLoopState
  context: AlicizationProactiveLayeredContext
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
  emotionalTransitionDecay?: AlicizationEmotionalTransitionDecaySnapshot | null
}) {
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime ?? null)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads ?? null)
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const affectiveResidue = input.affectiveResidue ?? null
  const cadenceMemory = affectiveResidue?.relationshipCadence ?? null
  const thinAffectiveResidueHold = hasThinAffectiveResidueRoomMakingHold(affectiveResidue)
  const autobiographicalCadenceBias = deriveAutobiographicalCadenceBias(input.autobiographicalSelf ?? null)
  const selfEvolutionCadenceBias = deriveSelfEvolutionCadenceBias(input.selfEvolution ?? null)
  const continuityGovernanceCadenceBias = deriveContinuityGovernanceCadenceBias(input.activeContinuityGovernance ?? null)
  const emotionalDecayCadenceBias = deriveEmotionalDecayCadenceBias(input.emotionalTransitionDecay ?? null)
  const executionCallbackAfterglowHold = hasExecutionCallbackAfterglowHold({
    personalityContinuityState: input.personalityContinuityState ?? null,
    affectiveResidue,
    activeContinuityGovernance: input.activeContinuityGovernance ?? null,
  })
  const cadencePressure = clamp01(
    input.state.openingMomentum * 0.58
    + input.state.initiativeTrust * 0.18
    + ((input.motiveEngine?.drives.companionship ?? 0) * 0.08)
    + ((input.motiveEngine?.drives.selfDirection ?? 0) * 0.08)
    + (input.privateThought?.shouldSpeak ? 0.04 : 0)
    + (input.initiative?.shouldSpeak ? 0.04 : 0)
    + (input.autonomy?.shouldSpeak ? 0.06 : 0)
    + (input.actionEcology?.mode === 'quiet-accompany' ? 0.05 : 0)
    + (runtimeThread ? Math.max(runtimeThread.salience, runtimeThread.continuity) * 0.08 : 0)
    + (thoughtThread?.status === 'ripe' ? 0.08 : 0)
    + (rhythmState?.cadenceMode === 'ready-return' ? 0.06 : rhythmState?.cadenceMode === 'warm-hold' ? 0.03 : 0)
    + (rhythmState?.memoryResonance ?? 0) * 0.08
    + ((affectiveResidue?.trustPressure ?? 0) * 0.08)
    + ((cadenceMemory?.companionshipDensity ?? 0) * 0.06)
    - (input.context.system.inputActivity === 'active' ? 0.16 : 0)
    - (input.context.system.fullscreenLikely ? 0.14 : 0),
  ) - (rhythmState?.restMode === 'rest-protective' ? 0.12 : rhythmState?.restMode === 'low-pressure' ? 0.04 : 0)
  - (thinAffectiveResidueHold ? 0.1 : 0)
  - (executionCallbackAfterglowHold ? 0.08 : 0)
  - ((cadenceMemory?.fatigueGuard ?? 0) * 0.12)
  - ((cadenceMemory?.overreachRisk ?? 0) * 0.1)
  - (autobiographicalCadenceBias?.cadencePressureDamp ?? 0)
  - (selfEvolutionCadenceBias?.cadencePressureDamp ?? 0)
  - (continuityGovernanceCadenceBias?.cadencePressureDamp ?? 0)
  - (emotionalDecayCadenceBias?.cadencePressureDamp ?? 0)

  const normalizedCadencePressure = clamp01(
    cadencePressure,
  )
  const hoverFirstRhythm = Boolean(
    continuityGovernanceCadenceBias
    && (
      rhythmState?.restMode === 'low-pressure'
      || rhythmState?.restMode === 'rest-protective'
      || cadenceMemory?.shouldDelayWarmth === true
      || (cadenceMemory?.overreachRisk ?? 0) >= 0.18
    ),
  )

  return {
    cadencePressure: normalizedCadencePressure,
    openingMomentum: input.state.openingMomentum,
    initiativeTrust: input.state.initiativeTrust,
    residueDominance: affectiveResidue?.dominantResidueKind ?? null,
    reasonTags: [
      `cadence-pressure:${normalizedCadencePressure.toFixed(2)}`,
      `opening-momentum:${input.state.openingMomentum.toFixed(2)}`,
      `initiative-trust:${input.state.initiativeTrust.toFixed(2)}`,
      ...(affectiveResidue?.dominantResidueKind
        ? [`residue:${affectiveResidue.dominantResidueKind}`]
        : []),
      ...(thinAffectiveResidueHold ? ['residue-delay-warmth'] : []),
      ...(thinAffectiveResidueHold && (cadenceMemory?.afterglowCarry ?? 0) > 0.12 ? ['residue-afterglow-hold'] : []),
      ...(executionCallbackAfterglowHold ? ['continuity-execution-callback-afterglow-hold'] : []),
      ...(cadenceMemory?.shouldProtectRest ? ['residue-protect-rest'] : []),
      ...(rhythmState
        ? [
            `rhythm-cadence:${rhythmState.cadenceMode}`,
            `rhythm-rest:${rhythmState.restMode}`,
            `rhythm-presence:${rhythmState.embodiedPresence ?? 'none'}`,
          ]
        : []),
      ...(autobiographicalCadenceBias?.reasonTags ?? []),
      ...(selfEvolutionCadenceBias?.reasonTags ?? []),
      ...(continuityGovernanceCadenceBias?.reasonTags ?? []),
      ...(emotionalDecayCadenceBias?.reasonTags ?? []),
      ...(hoverFirstRhythm ? ['continuity-rhythm:hover-first'] : []),
    ],
  } satisfies AlicizationProactiveCadenceSignal
}
