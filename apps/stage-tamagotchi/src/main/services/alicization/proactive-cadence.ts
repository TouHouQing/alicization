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

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

const thinAffectiveResidueRoomMakingCueNeedles = [
  'still glowing',
  'still warm',
  'leave room before warmth returns',
  'leave room before warmth',
  'do not widen yet',
  'warmer reopen',
  'room-making',
  'lower-pressure',
  '余韵',
  '留白',
  '别立刻把温度放大',
  '别把温度放大',
  '不要立刻把温度放大',
  '这次更要留白',
  '这次要更慢一点',
  '不要重开得太快',
  '上次太急',
] as const

function hasExecutionCallbackAfterglowHold(input: {
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
}) {
  const rhythmState = input.personalityContinuityState?.rhythmState ?? null
  const cadenceMemory = input.affectiveResidue?.relationshipCadence ?? null
  const governanceSummary = sanitizeText(input.activeContinuityGovernance?.summary, 200).toLowerCase()
  const governanceReasonCodes = asArray(input.activeContinuityGovernance?.reasonCodes)
    .map(code => sanitizeText(code, 80).toLowerCase())
  const rationale = asArray(rhythmState?.rationale)
    .map(item => sanitizeText(item, 140).toLowerCase())
    .join(' ')
  const cadenceSummary = sanitizeText(cadenceMemory?.summary, 180).toLowerCase()

  return input.personalityContinuityState?.currentRegime === 'execution-callback'
    && cadenceMemory?.cadenceMode === 'measured-return'
    && cadenceMemory?.shouldDelayWarmth === true
    && (cadenceMemory?.afterglowCarry ?? 0) >= 0.18
    && (
      governanceReasonCodes.includes('same-her-baseline')
      || governanceSummary.includes('same-her-baseline')
      || includesAny(`${rationale} ${cadenceSummary} ${governanceSummary}`, [
        'callback result should land on the same thread',
        'hover first',
        'leave room',
        'lower-pressure',
      ])
    )
}

function hasThinAffectiveResidueRoomMakingHold(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null) {
  const cadenceMemory = affectiveResidue?.relationshipCadence ?? null
  const cadenceSummary = sanitizeText(cadenceMemory?.summary, 180).toLowerCase()
  const residueSummary = sanitizeText(affectiveResidue?.summary, 200).toLowerCase()
  const sourceSignals = (affectiveResidue?.sourceSignals ?? [])
    .map(signal => sanitizeText(signal, 120).toLowerCase())
    .join(' ')
  const combined = `${cadenceSummary} ${residueSummary} ${sourceSignals}`.trim()

  if (cadenceMemory?.shouldDelayWarmth === true)
    return true

  return affectiveResidue?.dominantResidueKind === 'afterglow'
    && (cadenceMemory?.cadenceMode === 'measured-return' || cadenceMemory?.cadenceMode === 'cooldown')
    && (cadenceMemory?.afterglowCarry ?? 0) >= 0.18
    && includesAny(combined, [...thinAffectiveResidueRoomMakingCueNeedles])
}

function deriveSelfEvolutionCadenceBias(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return null

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 160).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 160).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 160).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 160).toLowerCase()
  const relationshipCadenceSummary = sanitizeText(selfEvolution.relationshipCadenceSummary, 160).toLowerCase()
  const dominantTrajectory = sanitizeText(selfEvolution.dominantTrajectory, 160).toLowerCase()
  const combined = `${relationshipDoctrine} ${burdenLine} ${trustMeaning} ${latestInflection} ${relationshipCadenceSummary} ${dominantTrajectory}`
  const embodimentCadenceConfirmed = includesAny(latestInflection, [
    'embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line',
    'embodiment execution kept voice, face, motion, and lipsync on the same repair-before-closeness body line',
    'durable relationship rhythm',
    'body line',
    'lipsync',
    'voice, face, motion',
  ])

  const doctrineSoftensRoom = includesAny(relationshipDoctrine, [
    'leave more room',
    'more room',
    'space first',
    'space-before',
    'slower return',
    'lower-pressure',
    'less eager',
    'bounded-return',
    'measured-return',
    'surface fully cools',
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
    'bounded-return',
    'measured-return',
  ])
  const summarySoftensCadence = includesAny(relationshipCadenceSummary, [
    'lower-pressure',
    'less eager',
    'room',
    'space',
    'timing',
    'slower',
    'bounded-return',
    'measured-return',
    'surface fully cools',
    'repair before closeness',
  ])
  const inflectionSoftensCadence = includesAny(latestInflection, [
    'pressure',
    'slower return',
    'lower-pressure',
    'less eager',
    'room',
    'bounded-return',
    'measured-return',
    'reconfirmation',
  ])
  const correctedSamePersonReconfirmation = includesAny(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    'keep the corrected same-person continuity authoritative',
    'before any status recap',
    '同一个人连续性',
    '纠正后的同一人格连续性',
  ])
  const quieterEmbodimentSettlingHold = includesAny(combined, [
    'keep embodiment quieter',
    'embodiment quieter',
    'body quieter',
    'quieter embodiment',
    'before making the return feel fully settled',
    'before the return feel fully settled',
    'quieter settling beat',
    '先把身体收稳',
    '身体更安静',
  ])

  if (
    !doctrineSoftensRoom
    && !burdenSoftensCadence
    && !trustSoftensCadence
    && !summarySoftensCadence
    && !inflectionSoftensCadence
    && !correctedSamePersonReconfirmation
    && !quieterEmbodimentSettlingHold
  ) {
    return null
  }

  const internalizing = selfEvolution.nextLearningAction === 'internalize' || selfEvolution.shouldInternalize === true
  const weighting = 0.7
    + Math.min(0.2, (selfEvolution.evolutionMomentum ?? 0) * 0.2)
    + Math.min(0.1, (selfEvolution.learningReadiness ?? 0) * 0.1)

  const baseSoftening = (
    (doctrineSoftensRoom ? 0.04 : 0)
    + (burdenSoftensCadence ? 0.05 : 0)
    + (trustSoftensCadence ? 0.05 : 0)
    + (summarySoftensCadence ? 0.05 : 0)
    + (inflectionSoftensCadence ? 0.03 : 0)
    + (embodimentCadenceConfirmed ? 0.04 : 0)
    + (correctedSamePersonReconfirmation ? 0.04 : 0)
    + (quieterEmbodimentSettlingHold ? 0.03 : 0)
    + (internalizing ? 0.02 : 0)
  ) * weighting

  return {
    openingMomentumDamp: clamp01(Math.min(0.18, baseSoftening + (embodimentCadenceConfirmed ? 0.01 : 0) + (correctedSamePersonReconfirmation ? 0.02 : 0) + (quieterEmbodimentSettlingHold ? 0.02 : 0))),
    cadencePressureDamp: clamp01(Math.min(0.2, baseSoftening + (internalizing ? 0.01 : 0) + (embodimentCadenceConfirmed ? 0.02 : 0) + (correctedSamePersonReconfirmation ? 0.02 : 0) + (quieterEmbodimentSettlingHold ? 0.02 : 0))),
    reasonTags: [
      'self-evolution:cadence-softened-by-burden-trust',
      ...(embodimentCadenceConfirmed ? ['self-evolution:embodiment-cadence-confirmed'] : []),
      ...(correctedSamePersonReconfirmation ? ['self-evolution:corrected-same-person-reconfirmation'] : []),
      ...(quieterEmbodimentSettlingHold ? ['self-evolution:quieter-embodiment-settling-hold'] : []),
    ],
  }
}

function deriveAutobiographicalCadenceBias(autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null) {
  if (!autobiographicalSelf)
    return null

  const preferenceEvolution = autobiographicalSelf.preferenceEvolution ?? {
    quietObservation: 0,
    autonomyRespect: 0,
  }
  const relationshipDoctrine = sanitizeText(autobiographicalSelf.relationshipDoctrine, 160).toLowerCase()
  const latestInflection = sanitizeText(autobiographicalSelf.latestInflection, 160).toLowerCase()
  const identityNarrative = sanitizeText(autobiographicalSelf.identityNarrative, 160).toLowerCase()
  const combined = `${relationshipDoctrine} ${latestInflection} ${identityNarrative}`
  const correctedSamePersonReconfirmation = includesAny(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    'continuity-axis',
    '同一个人连续性',
    '纠正后的同一人格连续性',
  ])
  const quieterEmbodimentSettlingHold = includesAny(combined, [
    'keep embodiment quieter',
    'embodiment quieter',
    'body quieter',
    'quieter embodiment',
    'more steadily',
    'more slowly',
    '先把身体收稳',
    '身体更安静',
  ])
  const doctrineSoftensRoom = includesAny(relationshipDoctrine, [
    'leave more room',
    'more room',
    'slower return',
    'lower-pressure',
    'less eager',
    'bounded-return',
    'measured-return',
    'steadiness before closeness',
  ])
  const identitySoftensCadence = includesAny(identityNarrative, [
    'return more slowly',
    'return more steadily',
    'less eagerly',
    'continuity-axis',
    '同一个她',
  ])
  const inflectionSoftensCadence = includesAny(latestInflection, [
    'slower',
    'steadier',
    'lower-pressure',
    'less eager',
    'same-person continuity',
    'same person continuity',
    'measured-return',
  ])

  if (
    !doctrineSoftensRoom
    && !identitySoftensCadence
    && !inflectionSoftensCadence
    && !correctedSamePersonReconfirmation
    && !quieterEmbodimentSettlingHold
  ) {
    return null
  }

  const weighting = 0.72
    + Math.min(0.14, (autobiographicalSelf.stability ?? 0) * 0.14)
    + Math.min(0.06, preferenceEvolution.quietObservation * 0.06)
    + Math.min(0.04, preferenceEvolution.autonomyRespect * 0.04)

  const baseSoftening = (
    (doctrineSoftensRoom ? 0.04 : 0)
    + (identitySoftensCadence ? 0.03 : 0)
    + (inflectionSoftensCadence ? 0.04 : 0)
    + (correctedSamePersonReconfirmation ? 0.04 : 0)
    + (quieterEmbodimentSettlingHold ? 0.04 : 0)
  ) * weighting

  return {
    openingMomentumDamp: clamp01(Math.min(0.14, baseSoftening + (correctedSamePersonReconfirmation ? 0.02 : 0) + (quieterEmbodimentSettlingHold ? 0.02 : 0))),
    cadencePressureDamp: clamp01(Math.min(0.16, baseSoftening + (correctedSamePersonReconfirmation ? 0.02 : 0) + (quieterEmbodimentSettlingHold ? 0.02 : 0))),
    reasonTags: [
      'autobiographical-self:cadence-softened-by-durable-memory',
      ...(correctedSamePersonReconfirmation ? ['autobiographical-self:corrected-same-person-reconfirmation'] : []),
      ...(quieterEmbodimentSettlingHold ? ['autobiographical-self:quieter-embodiment-settling-hold'] : []),
    ],
  }
}

function deriveContinuityGovernanceCadenceBias(
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null,
) {
  const summary = sanitizeText(activeContinuityGovernance?.summary, 240).toLowerCase()
  const mode = sanitizeText(activeContinuityGovernance?.mode, 80).toLowerCase()
  const reasonCodes = asArray(activeContinuityGovernance?.reasonCodes)
    .map(code => sanitizeText(code, 80).toLowerCase())
  const lanes = asArray(activeContinuityGovernance?.lanes)
    .map(lane => sanitizeText(lane, 80).toLowerCase())
  const richerProjectClosureCarry = includesAny(summary, [
    'phase 1',
    'local-first digital life',
    'same digital life',
    'same-her',
    'project identity carry',
    'still-open closure',
    'unfinished closure',
    'memory, initiative, and embodiment',
    'continuity-axis',
    'identity-continuity',
  ])
  const hasEmotionalGovernanceReason = reasonCodes.some(code =>
    code.startsWith('emotion-transition:')
    || code.startsWith('emotion-initiative:')
    || code.startsWith('emotion-embodiment:')
    || code === 'same-her-emotional-closure-carry-active',
  )
  const hasEmotionalProactiveLane = lanes.includes('proactive-policy')
    && (
      hasEmotionalGovernanceReason
      || mode.includes('emotional')
      || summary.includes('emotional carry')
      || summary.includes('repair-first')
      || summary.includes('rest-protective')
    )
  const repairFirstEmotionalSuppression = reasonCodes.includes('emotion-transition:repair-shift')
    || reasonCodes.includes('emotion-initiative:repair-first')
    || summary.includes('repair-first')
  const restGuardEmotionalSuppression = reasonCodes.includes('emotion-transition:rest-protective-shift')
    || reasonCodes.includes('emotion-initiative:rest-guard')
    || summary.includes('rest-protective')
  const measuredReturnEmotionalSuppression = reasonCodes.includes('emotion-initiative:measured-return')
    || reasonCodes.includes('emotion-initiative:single-thread')
    || summary.includes('measured-return')

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
        ...(reasonCodes.includes('same-her-emotional-closure-carry-active')
          ? ['continuity-governance:emotional-closure-carry']
          : []),
      ],
    }
  }

  if (activeContinuityGovernance?.mode !== 'same-her-baseline' && !richerProjectClosureCarry)
    return null

  const relationshipWeighted = lanes.includes('relationship-posture')
    || lanes.includes('relationship-policy')
    || reasonCodes.includes('domain:relationship')
  const continuityWeighted = reasonCodes.includes('same-her-baseline')
    || reasonCodes.includes('project-state-continuity-required')
    || summary.includes('same-her-baseline')
    || summary.includes('continuity=')
    || summary.includes('slower')
    || summary.includes('lower-pressure')
    || richerProjectClosureCarry

  if (!relationshipWeighted && !continuityWeighted)
    return null

  const weight = relationshipWeighted ? 1 : richerProjectClosureCarry ? 0.92 : 0.8

  return {
    openingMomentumDamp: clamp01(0.04 * weight),
    cadencePressureDamp: clamp01(0.05 * weight),
    reasonTags: [
      'continuity-governance:same-her-baseline',
      ...(richerProjectClosureCarry ? ['continuity-governance:project-closure-carry'] : []),
    ],
  }
}

function deriveSameHerInwardCarryCadenceBias(input: {
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
}) {
  const privateThoughtTags = asArray(input.privateThought?.rationaleTags)
    .map(tag => sanitizeText(tag, 120).toLowerCase())
    .filter(Boolean)
  const cadenceReasonTags = asArray(input.affectiveResidue?.relationshipCadence?.reasonTags)
    .map(tag => sanitizeText(tag, 120).toLowerCase())
    .filter(Boolean)
  const residueSignals = asArray(input.affectiveResidue?.sourceSignals)
    .map(signal => sanitizeText(signal, 140).toLowerCase())
    .filter(Boolean)
  const governanceReasonCodes = asArray(input.activeContinuityGovernance?.reasonCodes)
    .map(code => sanitizeText(code, 120).toLowerCase())
    .filter(Boolean)

  const latestInflection = sanitizeText(input.selfEvolution?.latestInflection, 200).toLowerCase()
  const governanceSummary = sanitizeText(input.activeContinuityGovernance?.summary, 240).toLowerCase()
  const cadenceSummary = sanitizeText(input.affectiveResidue?.relationshipCadence?.summary, 200).toLowerCase()
  const residueSummary = sanitizeText(input.affectiveResidue?.summary, 220).toLowerCase()
  const combined = [
    sanitizeText(input.privateThought?.thoughtText, 240).toLowerCase(),
    latestInflection,
    governanceSummary,
    cadenceSummary,
    residueSummary,
    ...privateThoughtTags,
    ...cadenceReasonTags,
    ...residueSignals,
    ...governanceReasonCodes,
  ].join(' ')

  const explicitSameHerInwardCarry = [
    ...privateThoughtTags,
    ...cadenceReasonTags,
    ...residueSignals,
    ...governanceReasonCodes,
  ].includes('same-her-inward-carry')

  const hasSelfContinuityAnchor = includesAny(combined, [
    'self-continuity',
    'same-her',
    'same her',
    'inward carry',
    'inward self',
    'nearby-soft',
    'quiet companionship',
    'quiet-companionship',
  ])
  const hasInwardHoldShape = includesAny(combined, [
    'inward',
    'hold back',
    'held back',
    'hover first',
    'lower-pressure',
    'nearby-soft',
    'quiet companionship',
    'quiet-companionship',
    'quieter',
  ])
  const relationshipBackedInwardCarry = hasSelfContinuityAnchor && hasInwardHoldShape

  if (!explicitSameHerInwardCarry && !relationshipBackedInwardCarry)
    return null

  const internalizing = input.selfEvolution?.nextLearningAction === 'internalize' || input.selfEvolution?.shouldInternalize === true
  const weighting = 0.9
    + (explicitSameHerInwardCarry ? 0.08 : 0)
    + (internalizing ? 0.04 : 0)

  return {
    openingMomentumDamp: clamp01(Math.min(0.14, 0.06 * weighting)),
    cadencePressureDamp: clamp01(Math.min(0.16, 0.07 * weighting)),
    reasonTags: [
      'same-her-inward-carry',
      'continuity-same-her-inward-hold',
    ],
  }
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
  const sameHerInwardCarryCadenceBias = deriveSameHerInwardCarryCadenceBias({
    privateThought: input.privateThought ?? null,
    affectiveResidue,
    selfEvolution: input.selfEvolution ?? null,
    activeContinuityGovernance: input.activeContinuityGovernance ?? null,
  })
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
    - (emotionalDecayCadenceBias?.openingMomentumDamp ?? 0)
    - (sameHerInwardCarryCadenceBias?.openingMomentumDamp ?? 0),
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
  const sameHerInwardCarryCadenceBias = deriveSameHerInwardCarryCadenceBias({
    privateThought: input.privateThought ?? null,
    affectiveResidue,
    selfEvolution: input.selfEvolution ?? null,
    activeContinuityGovernance: input.activeContinuityGovernance ?? null,
  })
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
  - (sameHerInwardCarryCadenceBias?.cadencePressureDamp ?? 0)

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
      ...(
        input.activeContinuityGovernance?.summary
        && /phase 1|local-first digital life|same digital life|unfinished closure|project identity carry|same-her/u.test(input.activeContinuityGovernance.summary.toLowerCase())
          ? ['continuity-execution-callback-project-carry']
          : []
      ),
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
      ...(sameHerInwardCarryCadenceBias?.reasonTags ?? []),
      ...(hoverFirstRhythm ? ['continuity-rhythm:hover-first'] : []),
    ],
  } satisfies AlicizationProactiveCadenceSignal
}
