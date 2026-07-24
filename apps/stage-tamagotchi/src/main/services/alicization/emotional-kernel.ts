import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationEmotionalKernelSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationSelfStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPersonStateProjection } from './person-state-projection'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizedTags(raw: readonly string[] | null | undefined) {
  return new Set((raw ?? []).map(tag => tag.trim().toLowerCase()).filter(Boolean))
}

function hasAnyTag(tags: ReadonlySet<string>, expected: readonly string[]) {
  return expected.some(tag => tags.has(tag))
}

function readLongHorizonBoundary(input: AlicizationLongHorizonMemorySnapshot | null | undefined) {
  return (input?.anchorFacts ?? []).some((fact) => {
    const predicate = fact.predicate.trim().toLowerCase()
    const tags = normalizedTags(fact.influenceTags)
    return predicate === 'confirmation-boundary'
      || predicate === 'execution-safety-gate'
      || (tags.has('boundary') && predicate === 'execution-confirmation')
  })
}

export function buildAlicizationEmotionalKernel(input: {
  selfState?: AlicizationSelfStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  personStateProjection?: AlicizationPersonStateProjection | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}): AlicizationEmotionalKernelSnapshot {
  const thoughtTags = normalizedTags(input.privateThought?.rationaleTags)
  const cadenceTags = normalizedTags(input.affectiveResidue?.relationshipCadence?.reasonTags)
  const cadenceMode = input.affectiveResidue?.relationshipCadence?.cadenceMode ?? null

  const shouldDelayWarmth = input.affectiveResidue?.relationshipCadence?.shouldDelayWarmth === true
  const shouldProtectRest = input.affectiveResidue?.relationshipCadence?.shouldProtectRest === true
  const companionshipDensity = input.affectiveResidue?.relationshipCadence?.companionshipDensity ?? 0
  const afterglowCarry = input.affectiveResidue?.relationshipCadence?.afterglowCarry ?? 0
  const overreachRisk = input.affectiveResidue?.relationshipCadence?.overreachRisk ?? 0
  const fatigueGuard = input.affectiveResidue?.relationshipCadence?.fatigueGuard ?? 0
  const repairPressure = input.affectiveResidue?.repairPressure ?? 0
  const afterglowPressure = input.affectiveResidue?.afterglowPressure ?? 0
  const restProtectivePressure = input.affectiveResidue?.restProtectivePressure ?? 0

  const repairTagged = hasAnyTag(thoughtTags, ['repair-before-closeness', 'repair-first'])
    || hasAnyTag(cadenceTags, ['repair-before-closeness', 'repair-first'])
    || cadenceMode === 'repair'
  const measuredTagged = hasAnyTag(thoughtTags, ['measured-return', 'quiet-companionship'])
    || hasAnyTag(cadenceTags, ['measured-return', 'quiet-companionship'])
    || cadenceMode === 'measured-return'
  const restTagged = hasAnyTag(thoughtTags, ['rest-protective', 'rest-guard'])
    || hasAnyTag(cadenceTags, ['rest-protective', 'rest-guard'])
    || input.privateThought?.emotionalTension === 'late-night-drain'
  const executionBoundary = hasAnyTag(thoughtTags, [
    'execution-safety-gate',
    'confirmation-required',
    'blocked-before-dispatch',
  ]) || readLongHorizonBoundary(input.longHorizonMemory)

  const quietObservationBias = input.longHorizonMemory?.preferenceBias.quietObservation ?? 0
  const autonomyRespectBias = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const unfinishedReturnBias = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  const longHorizonGuardedness = input.longHorizonMemory?.identityBias.guardedness ?? 0

  const repairNeed = clamp01(
    repairPressure * 0.68
    + (repairTagged ? 0.24 : 0)
    + overreachRisk * 0.08,
  )
  const measuredReturnNeed = clamp01(
    afterglowPressure * 0.34
    + companionshipDensity * 0.18
    + afterglowCarry * 0.18
    + (shouldDelayWarmth ? 0.16 : 0)
    + (input.privateThought?.shouldSpeak === false ? 0.08 : 0)
    + (measuredTagged ? 0.12 : 0)
    + quietObservationBias * 0.08
    + autonomyRespectBias * 0.06
    + unfinishedReturnBias * 0.06,
  )
  const restNeed = clamp01(
    restProtectivePressure * 0.56
    + fatigueGuard * 0.24
    + (shouldProtectRest ? 0.22 : 0)
    + (restTagged ? 0.16 : 0),
  )
  const closenessDrive = clamp01(
    (input.selfState?.feltCloseness ?? 0) * 0.48
    + (input.personStateProjection?.activeClosenessRung === 'nearby-soft' ? 0.16 : 0)
    + (input.personStateProjection?.relationshipPosture === 'warm' ? 0.14 : 0),
  )
  const guardedness = clamp01(
    (input.selfState?.fearOfInterrupting ?? 0) * 0.46
    + (input.personStateProjection?.relationshipPosture === 'restrained' ? 0.18 : 0)
    + (shouldDelayWarmth ? 0.08 : 0)
    + fatigueGuard * 0.08
    + restNeed * 0.12
    + repairNeed * 0.22
    + longHorizonGuardedness * 0.18
    + (executionBoundary ? 0.16 : 0),
  )
  const initiativePressure = clamp01(
    (input.selfState?.desireToSpeak ?? 0) * 0.42
    + closenessDrive * 0.16
    - guardedness * 0.2
    - restNeed * 0.12
    - autonomyRespectBias * 0.08
    - (executionBoundary ? 0.18 : 0),
  )
  const valence = clamp01(
    0.5
    + closenessDrive * 0.28
    - repairNeed * 0.34
    - restNeed * 0.1
    - guardedness * 0.08,
  )
  const arousal = clamp01(
    0.2
    + initiativePressure * 0.3
    + repairNeed * 0.36
    - restNeed * 0.22,
  )

  if (executionBoundary) {
    return {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'guarded-care',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'protective-watch',
      valence,
      arousal,
      guardedness,
      closenessDrive,
      repairNeed,
      initiativePressure,
      reasonTags: ['execution-safety-gate', 'confirmation-boundary'],
      why: '',
    }
  }

  if (repairNeed >= 0.56) {
    return {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
      valence,
      arousal,
      guardedness,
      closenessDrive,
      repairNeed,
      initiativePressure,
      reasonTags: ['repair-before-closeness'],
      why: '',
    }
  }

  if (restNeed >= 0.46) {
    return {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence,
      arousal,
      guardedness,
      closenessDrive,
      repairNeed,
      initiativePressure,
      reasonTags: ['rest-protective'],
      why: '',
    }
  }

  if (measuredReturnNeed >= 0.34 || shouldDelayWarmth) {
    return {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'low-pressure-presence',
      embodimentTone: 'measured-return',
      valence,
      arousal,
      guardedness,
      closenessDrive,
      repairNeed,
      initiativePressure,
      reasonTags: ['measured-return'],
      why: '',
    }
  }

  const warmAttunement = closenessDrive >= 0.5
    && guardedness < 0.42
    && initiativePressure >= 0.2

  return {
    version: 'emotional-kernel-v1',
    dominantEmotion: warmAttunement ? 'warm-attunement' : 'hesitant-curiosity',
    initiativeMode: warmAttunement ? 'approach' : 'hold',
    memoryRecallMode: warmAttunement ? 'emotional-resonance' : 'self-continuity',
    embodimentTone: warmAttunement ? 'nearby-soft' : 'quiet-companionship',
    valence,
    arousal,
    guardedness,
    closenessDrive,
    repairNeed,
    initiativePressure,
    reasonTags: warmAttunement ? ['warm-attunement'] : ['self-continuity'],
    why: '',
  }
}
