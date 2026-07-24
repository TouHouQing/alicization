import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPersonalityState,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildHostRhythmModel } from './host-rhythm-model'
import { deriveAlicizationPersonaAuthorityInfluence } from './personality-continuity-state'

function sanitizeText(raw: unknown, maxChars = 80) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function deriveSelfEvolutionManifestationBias(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return null

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 160).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 160).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 160).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 160).toLowerCase()
  const dominantTrajectory = sanitizeText(selfEvolution.dominantTrajectory, 160).toLowerCase()
  const combined = `${relationshipDoctrine} ${burdenLine} ${trustMeaning} ${latestInflection} ${dominantTrajectory}`

  const lowerPressureTiming = includesAny(relationshipDoctrine, [
    'leave more room',
    'more room',
    'space first',
    'slower return',
    'lower-pressure',
    'less eager',
  ]) || includesAny(trustMeaning, [
    'lower-pressure',
    'less eager',
    'room',
    'space',
    'timing',
  ]) || includesAny(latestInflection, [
    'lower-pressure',
    'less eager',
    'slower return',
    'room',
    'space',
  ]) || includesAny(burdenLine, [
    'conversational pressure',
    'pressure',
    'overloaded',
    'crowd',
    'eager',
  ])
  const correctedSamePersonSettling = includesAny(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    'keep the corrected same-person continuity authoritative',
    'before any status recap',
    '同一个人连续性',
    '纠正后的同一人格连续性',
  ])
  const quieterEmbodimentSettling = includesAny(combined, [
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

  if (!lowerPressureTiming && !correctedSamePersonSettling && !quieterEmbodimentSettling)
    return null

  return {
    prefersQuietCompanionship: true,
    softenManifestationCaps: lowerPressureTiming || quieterEmbodimentSettling,
    preferReturnWithProof: correctedSamePersonSettling || quieterEmbodimentSettling,
    reasonTags: [
      lowerPressureTiming ? 'self-evolution:lower-pressure-manifestation' : '',
      correctedSamePersonSettling ? 'self-evolution:corrected-same-person-manifestation' : '',
      quieterEmbodimentSettling ? 'self-evolution:quieter-embodiment-settling' : '',
    ].filter(Boolean),
  }
}

function latestAutobiographicalEra(
  records: AlicizationMemoryConsolidationRecord[] | null | undefined,
  facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era',
) {
  return (records ?? [])
    .filter(record => record.kind === 'autobiographical' && record.facet === facet)
    .slice()
    .sort((left, right) => right.periodEndedAt - left.periodEndedAt || right.updatedAt - left.updatedAt)[0] ?? null
}

export function buildHabitPolicy(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  personalityAuthority?: AlicizationPersonalityState | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  previous?: AlicizationHabitPolicySnapshot | null
}): AlicizationHabitPolicySnapshot {
  const relationshipEra = latestAutobiographicalEra(input.recentMemoryConsolidations ?? null, 'relationship-era')
  const selfEra = latestAutobiographicalEra(input.recentMemoryConsolidations ?? null, 'self-era')
  const hostRhythm = buildHostRhythmModel({
    context: input.context,
    worldModel: input.worldModel,
    watchMode: 'symbiotic-vision',
  })
  const busyHost = input.context.system.inputActivity === 'active'
    || input.worldModel.hostState.availability === 'focused'
    || input.worldModel.hostState.availability === 'immersed'
  const truthDrive = input.motiveEngine?.drives.truthDiscipline ?? 0
  const boundaryDrive = input.motiveEngine?.drives.boundaryRespect ?? 0
  const companionshipDrive = input.motiveEngine?.drives.companionship ?? 0
  const restDrive = input.motiveEngine?.drives.restProtection ?? 0
  const returnDrive = input.motiveEngine?.drives.unfinishedThreadReturn ?? 0
  const misreadBurden = input.selfContinuity?.misreadBurden ?? 0.18
  const correctionSensitivity = input.relationshipModel?.correctionSensitivity ?? 0.34
  const revisionPressure = input.reflectionLedger?.revisionPressure ?? 0
  const personalityAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)
  const selfEvolutionManifestationBias = deriveSelfEvolutionManifestationBias(input.selfEvolution ?? null)

  const requiresGroundingBeforeSurface
    = truthDrive >= 0.58
      || revisionPressure >= 0.24
      || misreadBurden >= 0.32
      || personalityAuthority.repairBias >= 0.24
      || Boolean(selfEra?.lesson)
      || (
        input.autobiographicalSelf?.personaDrift.conflictStyle === 'repair-first'
        && input.worldModel.epistemicState.certainty !== 'grounded'
      )
  const prefersQuietCompanionship
    = companionshipDrive >= 0.56
      && (
        boundaryDrive >= companionshipDrive - 0.08
        || busyHost
        || hostRhythm.interruptionSensitivity >= 0.48
        || personalityAuthority.roomBias >= 0.24
        || input.autobiographicalSelf?.personaDrift.attachmentStyle !== 'attuned'
        || Boolean(relationshipEra?.lesson)
        || selfEvolutionManifestationBias?.prefersQuietCompanionship === true
      )
  const blocksDirectSpeakWhenBusy
    = busyHost
      && (
        boundaryDrive >= 0.56
        || correctionSensitivity >= 0.62
        || hostRhythm.workMode === 'deep-focus'
        || personalityAuthority.roomBias >= 0.22
        || (input.autobiographicalSelf?.preferenceEvolution.autonomyRespect ?? 0) >= 0.62
        || Boolean(relationshipEra?.lesson)
      )
  const protectsRestWindow
    = restDrive >= 0.58
      && (
        input.context.localTime.isLateNight
        || input.context.relationship.fatigue >= 60
        || input.worldModel.activeThread?.kind === 'late-night-endurance'
      )
  const returnViaRecheck
    = (
      returnDrive >= 0.56
      && input.worldModel.activeThread?.unresolved === true
      && input.worldModel.epistemicState.certainty !== 'grounded'
    )
    || (
      selfEvolutionManifestationBias?.preferReturnWithProof === true
      && input.worldModel.activeThread?.unresolved === true
    )

  let dominantMode: AlicizationHabitPolicySnapshot['dominantMode'] = 'watchful-boundary'
  if (protectsRestWindow)
    dominantMode = 'protect-rest-window'
  else if (requiresGroundingBeforeSurface)
    dominantMode = 'repair-before-fluency'
  else if (returnViaRecheck)
    dominantMode = 'return-with-proof'
  else if (prefersQuietCompanionship)
    dominantMode = 'light-touch-companionship'

  const softenedLightTouchManifestation = dominantMode === 'light-touch-companionship'
    && selfEvolutionManifestationBias?.softenManifestationCaps === true

  return {
    dominantMode,
    requiresGroundingBeforeSurface,
    prefersQuietCompanionship,
    blocksDirectSpeakWhenBusy,
    protectsRestWindow,
    returnViaRecheck,
    suggestedStyleCap: dominantMode === 'protect-rest-window'
      ? (input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care')
      : softenedLightTouchManifestation
        ? 'silent-observe'
        : dominantMode === 'repair-before-fluency' || dominantMode === 'return-with-proof' || dominantMode === 'watchful-boundary'
          ? 'silent-observe'
          : 'light-nudge',
    suggestedPresenceCap: dominantMode === 'protect-rest-window'
      ? 'concerned'
      : softenedLightTouchManifestation
        ? 'glance'
        : dominantMode === 'repair-before-fluency' || dominantMode === 'return-with-proof'
          ? 'hesitant'
          : dominantMode === 'light-touch-companionship'
            ? 'attentive'
            : 'glance',
    narrative: [
      `policy:${dominantMode}`,
      requiresGroundingBeforeSurface ? 'ground-before-surface' : '',
      prefersQuietCompanionship ? 'companionship:quiet' : '',
      blocksDirectSpeakWhenBusy ? 'busy-window:no-direct-speak' : '',
      ...hostRhythm.narrative,
      protectsRestWindow ? 'protect-rest-window' : '',
      returnViaRecheck ? 'return-open-loop-via-recheck' : '',
      ...(selfEvolutionManifestationBias?.reasonTags ?? []),
      sanitizeText(input.motiveEngine?.backgroundAgendas[0]?.summary ?? '', 80),
    ].filter(Boolean),
    updatedAt: input.now,
  }
}
