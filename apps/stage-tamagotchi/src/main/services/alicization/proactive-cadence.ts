import type {
  AlicizationActionEcologySnapshot,
  AlicizationAffectiveResidueMemorySnapshot,
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

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function deriveSelfEvolutionCadenceBias(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return null

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 160).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 160).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 160).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 160).toLowerCase()

  const doctrineSoftensRoom = includesAny(relationshipDoctrine, [
    'leave more room',
    'more room',
    'space first',
    'space-before',
    'slower return',
    'lower-pressure',
    'less eager',
  ])
  const burdenSoftensCadence = includesAny(burdenLine, [
    'overloaded',
    'pressure',
    'crowd',
    'conversational pressure',
    'interrupt',
    'eager',
  ])
  const trustSoftensCadence = includesAny(trustMeaning, [
    'lower-pressure',
    'less eager',
    'room',
    'space',
    'timing',
    'slower',
  ])
  const inflectionSoftensCadence = includesAny(latestInflection, [
    'pressure',
    'slower return',
    'lower-pressure',
    'less eager',
    'room',
  ])

  if (!doctrineSoftensRoom && !burdenSoftensCadence && !trustSoftensCadence && !inflectionSoftensCadence)
    return null

  const internalizing = selfEvolution.nextLearningAction === 'internalize' || selfEvolution.shouldInternalize === true
  const weighting = 0.7
    + Math.min(0.2, (selfEvolution.evolutionMomentum ?? 0) * 0.2)
    + Math.min(0.1, (selfEvolution.learningReadiness ?? 0) * 0.1)

  const baseSoftening = (
    (doctrineSoftensRoom ? 0.04 : 0)
    + (burdenSoftensCadence ? 0.05 : 0)
    + (trustSoftensCadence ? 0.05 : 0)
    + (inflectionSoftensCadence ? 0.03 : 0)
    + (internalizing ? 0.02 : 0)
  ) * weighting

  return {
    openingMomentumDamp: clamp01(Math.min(0.12, baseSoftening)),
    cadencePressureDamp: clamp01(Math.min(0.14, baseSoftening + (internalizing ? 0.01 : 0))),
    reasonTags: ['self-evolution:cadence-softened-by-burden-trust'],
  }
}

function deriveContinuityGovernanceCadenceBias(
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null,
) {
  if (activeContinuityGovernance?.mode !== 'same-her-baseline')
    return null

  const summary = sanitizeText(activeContinuityGovernance.summary, 200).toLowerCase()
  const reasonCodes = activeContinuityGovernance.reasonCodes.map(code => sanitizeText(code, 80).toLowerCase())
  const lanes = activeContinuityGovernance.lanes.map(lane => sanitizeText(lane, 80).toLowerCase())

  const relationshipWeighted = lanes.includes('relationship-posture')
    || lanes.includes('relationship-policy')
    || reasonCodes.includes('domain:relationship')
  const continuityWeighted = reasonCodes.includes('same-her-baseline')
    || summary.includes('same-her-baseline')
    || summary.includes('continuity=')
    || summary.includes('slower')
    || summary.includes('lower-pressure')

  if (!relationshipWeighted && !continuityWeighted)
    return null

  const weight = relationshipWeighted ? 1 : 0.8

  return {
    openingMomentumDamp: clamp01(0.04 * weight),
    cadencePressureDamp: clamp01(0.05 * weight),
    reasonTags: ['continuity-governance:same-her-baseline'],
  }
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
}

function foregroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  return threadRuntime?.threads.find(thread => thread.id === threadRuntime.foregroundThreadId)
    ?? threadRuntime?.threads[0]
    ?? null
}

function hostBusy(context: AlicizationProactiveLayeredContext, worldModel?: AlicizationWorldModelSnapshot | null) {
  return context.system.inputActivity === 'active'
    || context.system.fullscreenLikely
    || context.system.cpuUsage >= 70
    || worldModel?.hostState.availability === 'focused'
    || worldModel?.hostState.availability === 'immersed'
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
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
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
  const selfEvolutionCadenceBias = deriveSelfEvolutionCadenceBias(input.selfEvolution ?? null)
  const continuityGovernanceCadenceBias = deriveContinuityGovernanceCadenceBias(input.activeContinuityGovernance ?? null)
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
    - (cadenceMemory?.fatigueGuard ?? 0) * 0.12
    - (cadenceMemory?.overreachRisk ?? 0) * 0.12
    - (input.actionEcology?.mode === 'repair-before-speaking' ? 0.16 : 0)
    - (input.actionEcology?.mode === 'return-later' ? 0.12 : 0)
    - (recentProactiveGapMinutes < 6 ? 0.18 : recentProactiveGapMinutes < 12 ? 0.08 : 0)
    - (selfEvolutionCadenceBias?.openingMomentumDamp ?? 0)
    - (continuityGovernanceCadenceBias?.openingMomentumDamp ?? 0),
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
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
}) {
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime ?? null)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads ?? null)
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const affectiveResidue = input.affectiveResidue ?? null
  const cadenceMemory = affectiveResidue?.relationshipCadence ?? null
  const selfEvolutionCadenceBias = deriveSelfEvolutionCadenceBias(input.selfEvolution ?? null)
  const continuityGovernanceCadenceBias = deriveContinuityGovernanceCadenceBias(input.activeContinuityGovernance ?? null)
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
  - ((cadenceMemory?.fatigueGuard ?? 0) * 0.12)
  - ((cadenceMemory?.overreachRisk ?? 0) * 0.1)
  - (selfEvolutionCadenceBias?.cadencePressureDamp ?? 0)
  - (continuityGovernanceCadenceBias?.cadencePressureDamp ?? 0)

  const normalizedCadencePressure = clamp01(
    cadencePressure,
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
      ...(cadenceMemory?.shouldDelayWarmth ? ['residue-delay-warmth'] : []),
      ...(cadenceMemory?.shouldProtectRest ? ['residue-protect-rest'] : []),
      ...(rhythmState
        ? [
            `rhythm-cadence:${rhythmState.cadenceMode}`,
            `rhythm-rest:${rhythmState.restMode}`,
            `rhythm-presence:${rhythmState.embodiedPresence ?? 'none'}`,
          ]
        : []),
      ...(selfEvolutionCadenceBias?.reasonTags ?? []),
      ...(continuityGovernanceCadenceBias?.reasonTags ?? []),
    ],
  } satisfies AlicizationProactiveCadenceSignal
}
