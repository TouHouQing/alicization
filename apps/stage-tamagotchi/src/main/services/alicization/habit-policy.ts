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
  const autonomyRespectPreference = input.autobiographicalSelf?.preferenceEvolution.autonomyRespect ?? 0
  const quietObservationPreference = input.autobiographicalSelf?.preferenceEvolution.quietObservation ?? 0
  const relationshipApproach = input.relationshipModel?.approachVector ?? null
  const activeBoundaries = input.relationshipModel?.activeBoundaries ?? []
  void input.selfEvolution

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
      )
  const blocksDirectSpeakWhenBusy
    = busyHost
      && (
        boundaryDrive >= 0.56
        || correctionSensitivity >= 0.62
        || hostRhythm.workMode === 'deep-focus'
        || relationshipApproach === 'give-space'
        || personalityAuthority.roomBias >= 0.22
        || autonomyRespectPreference >= 0.62
        || (
          activeBoundaries.includes('focus-protection')
          && autonomyRespectPreference >= 0.44
          && quietObservationPreference >= 0.42
        )
        || (autonomyRespectPreference >= 0.5 && quietObservationPreference >= 0.56)
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

  let dominantMode: AlicizationHabitPolicySnapshot['dominantMode'] = 'watchful-boundary'
  if (protectsRestWindow)
    dominantMode = 'protect-rest-window'
  else if (requiresGroundingBeforeSurface)
    dominantMode = 'repair-before-fluency'
  else if (returnViaRecheck)
    dominantMode = 'return-with-proof'
  else if (prefersQuietCompanionship)
    dominantMode = 'light-touch-companionship'

  return {
    dominantMode,
    requiresGroundingBeforeSurface,
    prefersQuietCompanionship,
    blocksDirectSpeakWhenBusy,
    protectsRestWindow,
    returnViaRecheck,
    suggestedStyleCap: dominantMode === 'protect-rest-window'
      ? (input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care')
      : dominantMode === 'repair-before-fluency' || dominantMode === 'return-with-proof' || dominantMode === 'watchful-boundary'
        ? 'silent-observe'
        : 'light-nudge',
    suggestedPresenceCap: dominantMode === 'protect-rest-window'
      ? 'concerned'
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
      sanitizeText(input.motiveEngine?.backgroundAgendas[0]?.summary ?? '', 80),
    ].filter(Boolean),
    updatedAt: input.now,
  }
}
