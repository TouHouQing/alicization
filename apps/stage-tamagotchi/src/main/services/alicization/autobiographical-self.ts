import type {
  AlicizationActionEcologySnapshot,
  AlicizationAutobiographicalGoalKind,
  AlicizationAutobiographicalGoalSnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryReflectionRecord,
  AlicizationPersonalityState,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationPersonStateUpdateSurface,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { sanitizeAlicizationMemoryEvidenceText } from '@proj-alicization/stage-shared'

import { buildPersonaGradualUnlock } from './persona-gradual-unlock'
import { deriveAlicizationPersonaAuthorityInfluence } from './personality-continuity-state'

export interface AlicizationAutobiographicalSelfInput {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  personalityAuthority?: AlicizationPersonalityState | null
  recentRelationshipOutcomes?: AlicizationRelationshipOutcomeRecord[] | null
  recentMemoryReflections?: AlicizationMemoryReflectionRecord[] | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
  recentReinforcementEvents?: AlicizationPersonaReinforcementEventRecord[] | null
  personStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
  previous?: AlicizationAutobiographicalSelfSnapshot | null
}

type PreferenceKey = keyof AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']

const preferenceKeys = [
  'companionship',
  'truthfulGrounding',
  'gentleRepair',
  'quietObservation',
  'proactiveCare',
  'playfulIntimacy',
  'autonomyRespect',
  'unfinishedThreadReturn',
] satisfies PreferenceKey[]

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

function sanitizeAutobiographicalCarry(raw: unknown, maxChars = 220) {
  return sanitizeAlicizationMemoryEvidenceText(raw, maxChars)
}

function firstAutobiographicalCarry(values: Array<unknown>, maxChars = 220) {
  for (const value of values) {
    const normalized = sanitizeAutobiographicalCarry(value, maxChars)
    if (normalized)
      return normalized
  }
  return ''
}

function uniqueTexts(values: Array<unknown>, maxItems = values.length, maxChars = 220) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function blend(previous: number, target: number, rate = 0.18) {
  return clamp01(previous * (1 - rate) + target * rate)
}

function latestReflection(ledger?: AlicizationReflectionLedgerSnapshot | null) {
  const isFormal = (entry: AlicizationReflectionLedgerSnapshot['entries'][number]) => {
    const reviewStatus = (entry as typeof entry & {
      reviewStatus?: AlicizationMemoryReflectionRecord['status'] | null
    }).reviewStatus
    if (reviewStatus != null)
      return reviewStatus === 'confirmed' && entry.outcome !== 'released'

    return entry.outcome !== 'unknown' && entry.outcome !== 'released'
  }
  const latest = ledger?.entries.find(entry => entry.id === ledger.latestEntryId)
  if (latest && isFormal(latest))
    return latest

  return ledger?.entries.find(isFormal) ?? null
}

function strongestDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  return desireMemory?.activeDesires
    .slice()
    .sort((left, right) => right.strength - left.strength)[0]
    ?? null
}

function leadingAlicizationGoal(goalStack?: AlicizationGoalStackSnapshot | null) {
  return goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
}

function countOutcome(input: AlicizationAutobiographicalSelfInput, kind: 'positive' | 'reply-within-120s' | 'dismiss' | 'ignored') {
  return input.context.relationship.recentProactiveOutcomes.filter(item => item.outcome === kind).length
}

function summarizeReinforcement(input: AlicizationAutobiographicalSelfInput) {
  const summary = {
    companionship: 0,
    truthfulGrounding: 0,
    gentleRepair: 0,
    autonomyRespect: 0,
    unfinishedThreadReturn: 0,
    temperGuardedness: 0,
    temperDirectness: 0,
  }

  for (const event of input.recentReinforcementEvents ?? []) {
    const signedDelta = event.valence === 'suppress'
      ? -Math.abs(event.delta)
      : Math.abs(event.delta)
    switch (event.dimension) {
      case 'companionship':
        summary.companionship += signedDelta
        break
      case 'truthful-grounding':
        summary.truthfulGrounding += signedDelta
        break
      case 'gentle-repair':
        summary.gentleRepair += signedDelta
        break
      case 'autonomy-respect':
        summary.autonomyRespect += signedDelta
        break
      case 'unfinished-thread-return':
        summary.unfinishedThreadReturn += signedDelta
        break
      case 'temper-guardedness':
        summary.temperGuardedness += signedDelta
        break
      case 'temper-directness':
        summary.temperDirectness += signedDelta
        break
    }
  }

  return summary
}

function summarizeRelationshipOutcomeHistory(input: AlicizationAutobiographicalSelfInput) {
  const summary = {
    closenessSupport: 0,
    trustSupport: 0,
    trustDamage: 0,
    boundaryLift: 0,
    boundaryPressure: 0,
    burdenRelief: 0,
    burdenPressure: 0,
    repairLearning: 0,
    openLoopSupport: 0,
  }

  for (const outcome of input.recentRelationshipOutcomes ?? []) {
    summary.closenessSupport += Math.max(0, outcome.closenessDelta)
    summary.trustSupport += Math.max(0, outcome.trustDelta)
    summary.trustDamage += Math.max(0, -outcome.trustDelta)
    summary.boundaryLift += Math.max(0, outcome.boundaryDelta)
    summary.boundaryPressure += Math.max(0, -outcome.boundaryDelta)
    summary.burdenRelief += Math.max(0, -outcome.burdenDelta)
    summary.burdenPressure += Math.max(0, outcome.burdenDelta)
    summary.repairLearning += Math.max(0, outcome.repairDelta) + Math.max(0, -outcome.misreadDelta)
    summary.openLoopSupport += Math.max(0, outcome.openLoopDelta)
  }

  return summary
}

function reflectionStatusWeight(status: AlicizationMemoryReflectionRecord['status']) {
  return status === 'confirmed' ? 1 : 0
}

function sortRecentReflectionsByRecency(reflections: AlicizationMemoryReflectionRecord[] | null | undefined) {
  return (reflections ?? [])
    .filter(reflection => reflection.status === 'confirmed')
    .slice()
    .sort((left, right) => (right.updatedAt ?? right.createdAt) - (left.updatedAt ?? left.createdAt))
}

function latestNarrativelyActiveReflection(reflections: AlicizationMemoryReflectionRecord[] | null | undefined) {
  const ordered = sortRecentReflectionsByRecency(reflections)
  return ordered[0] ?? null
}

function summarizeReflectionHistory(input: AlicizationAutobiographicalSelfInput) {
  const summary = {
    self: 0,
    relationship: 0,
    boundary: 0,
    truth: 0,
    task: 0,
    habit: 0,
    supportive: 0,
    destabilizing: 0,
    latestLesson: '',
  }

  const ordered = sortRecentReflectionsByRecency(input.recentMemoryReflections)

  for (const reflection of ordered) {
    const signedWeight = reflectionStatusWeight(reflection.status) * clamp01(reflection.confidence)
    const magnitude = Math.abs(signedWeight)
    if (signedWeight >= 0)
      summary.supportive += magnitude
    else
      summary.destabilizing += magnitude

    switch (reflection.targetScope) {
      case 'self':
        summary.self += signedWeight
        break
      case 'relationship':
        summary.relationship += signedWeight
        break
      case 'boundary':
        summary.boundary += signedWeight
        break
      case 'truth':
        summary.truth += signedWeight
        break
      case 'task':
        summary.task += signedWeight
        break
      case 'habit':
        summary.habit += signedWeight
        break
    }
  }

  const latestMeaningfulReflection = latestNarrativelyActiveReflection(input.recentMemoryReflections)
  summary.latestLesson = sanitizeText(
    latestMeaningfulReflection?.lesson || latestMeaningfulReflection?.summary,
    180,
  )

  return summary
}
function buildPreferenceDurabilityFloor(input: {
  previous: AlicizationAutobiographicalSelfSnapshot
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  reinforcement: ReturnType<typeof summarizeReinforcement>
  outcomeHistory: ReturnType<typeof summarizeRelationshipOutcomeHistory>
  reflectionHistory: ReturnType<typeof summarizeReflectionHistory>
}) {
  const previous = input.previous.preferenceEvolution
  const longHorizon = input.longHorizonMemory ?? null
  const companionshipSupport = clamp01(
    input.outcomeHistory.closenessSupport * 0.42
    + input.outcomeHistory.trustSupport * 0.38
    + Math.max(0, input.reflectionHistory.relationship) * 0.28
    + Math.max(0, input.reinforcement.companionship) * 0.34
    + (longHorizon?.preferenceBias.companionship ?? 0) * 0.18,
  )
  const truthfulSupport = clamp01(
    input.outcomeHistory.repairLearning * 0.42
    + Math.max(0, input.reflectionHistory.truth) * 0.34
    + Math.max(0, input.reflectionHistory.habit) * 0.12
    + Math.max(0, input.reinforcement.truthfulGrounding) * 0.34
    + (longHorizon?.preferenceBias.truthfulGrounding ?? 0) * 0.22,
  )
  const gentleRepairSupport = clamp01(
    input.outcomeHistory.repairLearning * 0.38
    + Math.max(0, input.reflectionHistory.truth) * 0.2
    + Math.max(0, input.reflectionHistory.habit) * 0.18
    + Math.max(0, input.reinforcement.gentleRepair) * 0.3
    + (longHorizon?.preferenceBias.gentleRepair ?? 0) * 0.18,
  )
  const autonomySupport = clamp01(
    input.outcomeHistory.boundaryLift * 0.42
    + input.outcomeHistory.boundaryPressure * 2.15
    + Math.max(0, input.reflectionHistory.boundary) * 0.34
    + Math.max(0, input.reinforcement.autonomyRespect) * 0.56
    + (longHorizon?.preferenceBias.autonomyRespect ?? 0) * 0.22,
  )
  const unfinishedSupport = clamp01(
    input.outcomeHistory.openLoopSupport * 0.44
    + Math.max(0, input.reflectionHistory.task) * 0.32
    + Math.max(0, input.reinforcement.unfinishedThreadReturn) * 0.32
    + (longHorizon?.preferenceBias.unfinishedThreadReturn ?? 0) * 0.24,
  )

  return {
    companionship: companionshipSupport >= 0.12
      ? clamp01(previous.companionship * 0.88 + companionshipSupport * 0.24)
      : 0,
    truthfulGrounding: truthfulSupport >= 0.12
      ? clamp01(previous.truthfulGrounding * 0.9 + truthfulSupport * 0.24)
      : 0,
    gentleRepair: gentleRepairSupport >= 0.12
      ? clamp01(previous.gentleRepair * 0.88 + gentleRepairSupport * 0.22)
      : 0,
    quietObservation: autonomySupport >= 0.12
      ? clamp01(previous.quietObservation * 0.82 + autonomySupport * 0.2)
      : 0,
    proactiveCare: companionshipSupport >= 0.12
      ? clamp01(previous.proactiveCare * 0.8 + companionshipSupport * 0.18)
      : 0,
    playfulIntimacy: companionshipSupport >= 0.18
      ? clamp01(previous.playfulIntimacy * 0.78 + companionshipSupport * 0.1)
      : 0,
    autonomyRespect: autonomySupport >= 0.12
      ? clamp01(previous.autonomyRespect * 0.9 + autonomySupport * 0.24)
      : 0,
    unfinishedThreadReturn: unfinishedSupport >= 0.12
      ? clamp01(previous.unfinishedThreadReturn * 0.9 + unfinishedSupport * 0.24)
      : 0,
  } satisfies AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']
}
function summarizePersonStateSurfaceSignal(input: AlicizationAutobiographicalSelfInput) {
  const surface = input.personStateUpdateSurface ?? null
  if (!surface) {
    return {
      companionship: 0,
      truthfulGrounding: 0,
      gentleRepair: 0,
      quietObservation: 0,
      proactiveCare: 0,
      playfulIntimacy: 0,
      autonomyRespect: 0,
      unfinishedThreadReturn: 0,
      narrativeLead: '',
      lessonLead: '',
    }
  }

  const relationshipShift = surface.relationshipShift
  const cadence = surface.affectiveResidue?.relationshipCadence ?? null
  const directTruthBias = Number(surface.reinforcementBias['truthful-grounding'] ?? 0)
  const directRepairBias = Number(surface.reinforcementBias['gentle-repair'] ?? 0)
  const directCompanionshipBias = Number(surface.reinforcementBias.companionship ?? 0)
  const directAutonomyBias = Number(surface.reinforcementBias['autonomy-respect'] ?? 0)
  const directUnfinishedBias = Number(surface.reinforcementBias['unfinished-thread-return'] ?? 0)
  const narrativeSource = Array.isArray(surface.narrative) ? surface.narrative : [surface.narrative]

  return {
    companionship: clamp01(
      Math.max(0, relationshipShift.closenessDelta) * 0.8
      + Math.max(0, relationshipShift.trustDelta) * 0.42
      + Math.max(0, directCompanionshipBias) * 0.72
      + (cadence?.companionshipDensity ?? 0) * 0.22,
    ),
    truthfulGrounding: clamp01(
      Math.max(0, relationshipShift.trustDelta) * 0.36
      + Math.max(0, directTruthBias) * 0.92,
    ),
    gentleRepair: clamp01(
      Math.max(0, relationshipShift.repairDelta) * 0.9
      + Math.max(0, -relationshipShift.burdenDelta) * 0.22
      + Math.max(0, directRepairBias) * 0.9
      + (cadence?.repairRecovery ?? 0) * 0.14,
    ),
    quietObservation: clamp01(
      Math.max(0, relationshipShift.boundaryDelta) * 0.38
      + Math.max(0, -relationshipShift.burdenDelta) * 0.26
      + Math.max(0, directAutonomyBias) * 0.34,
    ),
    proactiveCare: clamp01(
      Math.max(0, directCompanionshipBias) * 0.42
      + Math.max(0, relationshipShift.trustDelta) * 0.18,
    ),
    playfulIntimacy: clamp01(
      Math.max(0, relationshipShift.closenessDelta) * 0.16
      + Math.max(0, directCompanionshipBias) * 0.08,
    ),
    autonomyRespect: clamp01(
      Math.max(0, relationshipShift.boundaryDelta) * 0.66
      + Math.max(0, directAutonomyBias) * 0.82,
    ),
    unfinishedThreadReturn: clamp01(
      Math.max(0, directUnfinishedBias) * 0.88,
    ),
    narrativeLead: firstAutobiographicalCarry([...narrativeSource, surface.summary], 180),
    lessonLead: firstAutobiographicalCarry([
      ...(surface.preferenceHints ?? []),
      ...(surface.repairHints ?? []),
      ...(surface.sensitivityHints ?? []),
      ...(surface.burdenHints ?? []),
    ], 180),
  }
}

function defaultAutobiographicalSelf(now: number): AlicizationAutobiographicalSelfSnapshot {
  return {
    personaDrift: {
      attachmentStyle: 'nearby',
      expressionStyle: 'measured',
      conflictStyle: 'soften-first',
      agencyStyle: 'balanced',
      attachmentNeed: 0.46,
      autonomyNeed: 0.52,
      truthAnchor: 0.56,
      careBias: 0.48,
      playBias: 0.24,
      irritabilityThreshold: 0.54,
      stubbornness: 0.42,
    },
    preferenceEvolution: {
      companionship: 0.48,
      truthfulGrounding: 0.56,
      gentleRepair: 0.5,
      quietObservation: 0.46,
      proactiveCare: 0.46,
      playfulIntimacy: 0.22,
      autonomyRespect: 0.52,
      unfinishedThreadReturn: 0.44,
    },
    activeGoals: [],
    behaviorSignatures: [
      'conflict:soften-first',
      'agency:balanced',
      'bond:nearby',
    ],
    identityNarrative: '',
    relationshipDoctrine: '',
    latestInflection: null,
    stability: 0.48,
    updatedAt: now,
  }
}

function reflectionSignalWeight(input: AlicizationAutobiographicalSelfInput) {
  const latest = latestReflection(input.reflectionLedger)
  if (!latest)
    return 0
  if (latest.outcome === 'missed' || latest.outcome === 'stalled')
    return 0.18
  if (latest.outcome === 'corrected')
    return 0.12
  if (latest.outcome === 'helped' || latest.outcome === 'released')
    return 0.08
  return 0.04
}

function buildPreferenceTargets(input: AlicizationAutobiographicalSelfInput) {
  const latest = latestReflection(input.reflectionLedger)
  const desire = strongestDesire(input.desireMemory)
  const goal = leadingAlicizationGoal(input.goalStack)
  const reinforcement = summarizeReinforcement(input)
  const outcomeHistory = summarizeRelationshipOutcomeHistory(input)
  const reflectionHistory = summarizeReflectionHistory(input)
  const positiveCount = countOutcome(input, 'positive') + countOutcome(input, 'reply-within-120s')
  const dismissCount = countOutcome(input, 'dismiss')
  const ignoredCount = countOutcome(input, 'ignored')
  const reflectionWeight = reflectionSignalWeight(input)
  const fatiguePressure = clamp01((input.context.relationship.fatigue ?? 0) / 100)
  const relationTrust = input.selfContinuity?.relationshipTrust ?? 0.46
  const misreadBurden = input.selfContinuity?.misreadBurden ?? 0.18
  const guardingTendency = input.selfContinuity?.guardingTendency ?? 0.44
  const carryOverDesire = input.selfContinuity?.carryOverDesire ?? 0.22
  const longHorizon = input.longHorizonMemory ?? null
  const climate = input.relationshipModel?.climate ?? 'neutral'
  const approach = input.relationshipModel?.approachVector ?? 'guide'
  const unresolved = input.worldModel.activeThread?.unresolved === true || Boolean(input.goalStack?.unresolvedSummary)
  const personaAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)

  const companionship = clamp01(
    relationTrust * 0.28
    + carryOverDesire * 0.18
    + positiveCount * 0.08
    + ((approach === 'stay-near' || approach === 'care') ? 0.16 : 0)
    + (desire?.kind === 'stay-near' ? 0.12 : 0)
    + (climate === 'attuned' ? 0.12 : climate === 'warm' ? 0.08 : 0)
    + (longHorizon?.preferenceBias.companionship ?? 0) * 0.22
    + (longHorizon?.identityBias.tenderness ?? 0) * 0.08
    + personaAuthority.warmthBias * 0.18
    + personaAuthority.directnessBias * 0.08
    + reinforcement.companionship * 0.28
    + outcomeHistory.closenessSupport * 0.16
    + outcomeHistory.trustSupport * 0.14
    + Math.max(0, reflectionHistory.relationship) * 0.12
    - dismissCount * 0.08
    - ignoredCount * 0.04,
  )
  const truthfulGrounding = clamp01(
    misreadBurden * 0.28
    + (goal?.kind === 'clarify-scene' || goal?.kind === 'help-resolve' ? 0.18 : 0.06)
    + (input.actionEcology?.mode === 'repair-before-speaking' ? 0.14 : 0)
    + (input.mindEcology?.replyHabit === 'repair-first' ? 0.12 : 0)
    + ((latest?.outcome === 'missed' || latest?.outcome === 'stalled') ? 0.18 : latest?.outcome === 'corrected' ? 0.1 : 0)
    + reflectionWeight
    + (longHorizon?.preferenceBias.truthfulGrounding ?? 0) * 0.26
    + (longHorizon?.identityBias.directness ?? 0) * 0.1
    + reinforcement.truthfulGrounding * 0.34
    + outcomeHistory.repairLearning * 0.18
    + Math.max(0, reflectionHistory.truth) * 0.18
    + Math.max(0, reflectionHistory.habit) * 0.08
    + (input.worldModel.epistemicState.certainty === 'uncertain' || input.worldModel.epistemicState.certainty === 'lingering' ? 0.08 : 0),
  )
  const gentleRepair = clamp01(
    (input.relationshipModel?.correctionSensitivity ?? 0.32) * 0.22
    + (climate === 'guarded' ? 0.18 : 0.06)
    + truthfulGrounding * 0.16
    + ((latest?.outcome === 'missed' || latest?.outcome === 'corrected' || latest?.revision) ? 0.14 : 0)
    + (longHorizon?.preferenceBias.gentleRepair ?? 0) * 0.24
    + reinforcement.gentleRepair * 0.32
    + outcomeHistory.repairLearning * 0.14
    + Math.max(0, reflectionHistory.truth) * 0.1
    + Math.max(0, reflectionHistory.habit) * 0.08
    + personaAuthority.repairBias * 0.14
    + (input.mindEcology?.regulationHabit === 'soften-before-speaking' ? 0.1 : 0),
  )
  const quietObservation = clamp01(
    guardingTendency * 0.24
    + (input.selfContinuity?.initiativeTemperament === 'reserved' ? 0.18 : 0)
    + (approach === 'give-space' ? 0.14 : 0)
    + dismissCount * 0.08
    + ignoredCount * 0.06
    + (longHorizon?.preferenceBias.autonomyRespect ?? 0) * 0.14
    + (longHorizon?.preferenceBias.quietObservation ?? 0) * 0.2
    + (longHorizon?.identityBias.guardedness ?? 0) * 0.12
    + personaAuthority.roomBias * 0.28
    + Math.max(0, reinforcement.autonomyRespect) * 0.18
    + Math.max(0, reinforcement.temperGuardedness) * 0.12
    + outcomeHistory.boundaryLift * 0.14
    + outcomeHistory.boundaryPressure * 3.1
    + Math.max(0, reflectionHistory.boundary) * 0.16
    + (input.mindEcology?.replyHabit === 'observe-first' || input.mindEcology?.replyHabit === 'hover-first' ? 0.1 : 0)
    - positiveCount * 0.04,
  )
  const proactiveCare = clamp01(
    (input.selfState?.protectiveness ?? 0.3) * 0.26
    + fatiguePressure * 0.24
    + (goal?.kind === 'care-body' ? 0.22 : 0.04)
    + (desire?.kind === 'care' ? 0.14 : 0)
    + (approach === 'care' ? 0.12 : 0)
    + (longHorizon?.preferenceBias.proactiveCare ?? 0) * 0.3
    + (longHorizon?.identityBias.tenderness ?? 0) * 0.12
    + personaAuthority.warmthBias * 0.14
    + outcomeHistory.burdenRelief * 0.12
    - outcomeHistory.burdenPressure * 0.08
    + Math.max(0, reflectionHistory.relationship) * 0.08
    + (input.mindEcology?.replyHabit === 'care-first' ? 0.1 : 0),
  )
  const playfulIntimacy = clamp01(
    companionship * 0.22
    + positiveCount * 0.08
    + (climate === 'attuned' ? 0.18 : climate === 'warm' ? 0.12 : 0)
    + (longHorizon?.preferenceBias.playfulIntimacy ?? 0) * 0.28
    + (input.mindEcology?.moodLabel === 'attuned-playful' ? 0.16 : 0)
    - Math.max(0, reinforcement.autonomyRespect) * 0.1
    - Math.max(0, reinforcement.temperGuardedness) * 0.12
    - truthfulGrounding * 0.08
    - quietObservation * 0.06,
  )
  const autonomyRespect = clamp01(
    quietObservation * 0.28
    + (approach === 'give-space' ? 0.18 : 0)
    + (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed' ? 0.14 : 0)
    + (climate === 'guarded' ? 0.1 : 0)
    + (longHorizon?.preferenceBias.autonomyRespect ?? 0) * 0.3
    + personaAuthority.roomBias * 0.18
    + reinforcement.autonomyRespect * 0.34
    + outcomeHistory.boundaryLift * 0.22
    + outcomeHistory.boundaryPressure * 0.7
    + Math.max(0, reflectionHistory.boundary) * 0.22
    - companionship * 0.06,
  )
  const unfinishedThreadReturn = clamp01(
    carryOverDesire * 0.22
    + (unresolved ? 0.26 : 0.04)
    + (goal?.kind === 'help-resolve' || goal?.kind === 'clarify-scene' ? 0.18 : 0)
    + (desire?.kind === 'recheck' || desire?.kind === 'speak' ? 0.08 : 0)
    + (longHorizon?.preferenceBias.unfinishedThreadReturn ?? 0) * 0.34
    + (longHorizon?.identityBias.selfDirection ?? 0) * 0.12
    + personaAuthority.cadenceBias * 0.14
    + reinforcement.unfinishedThreadReturn * 0.32
    + outcomeHistory.openLoopSupport * 0.22
    + Math.max(0, reflectionHistory.task) * 0.18
    + (input.mindEcology?.explorationHabit === 'follow-thread' ? 0.12 : 0)
    + (latest?.outcome === 'stalled' ? 0.12 : latest?.outcome === 'released' ? -0.08 : 0),
  )

  return {
    companionship,
    truthfulGrounding,
    gentleRepair,
    quietObservation,
    proactiveCare,
    playfulIntimacy,
    autonomyRespect,
    unfinishedThreadReturn,
  } satisfies AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']
}

function resolveAttachmentStyle(input: {
  companionship: number
  autonomyRespect: number
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
}) {
  if (input.selfContinuity?.attachmentMode === 'guarded' || input.autonomyRespect >= input.companionship + 0.14)
    return 'guarded' as const
  if (input.selfContinuity?.attachmentMode === 'attuned' || input.companionship >= 0.62)
    return 'attuned' as const
  return 'nearby' as const
}

function resolveExpressionStyle(input: {
  playfulIntimacy: number
  proactiveCare: number
  quietObservation: number
  truthfulGrounding: number
}) {
  if (input.playfulIntimacy >= 0.62)
    return 'playful' as const
  if (input.proactiveCare >= 0.6)
    return 'warm' as const
  if (input.quietObservation >= 0.62)
    return 'contained' as const
  if (input.truthfulGrounding >= 0.7)
    return 'sharp' as const
  return 'measured' as const
}

function resolveConflictStyle(input: {
  truthfulGrounding: number
  gentleRepair: number
  quietObservation: number
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
}) {
  if (
    input.truthfulGrounding >= 0.64
    && (input.selfContinuity?.misreadBurden ?? 0.18) >= 0.24
  ) {
    return 'repair-first' as const
  }
  if (input.quietObservation >= 0.64)
    return 'watch-then-return' as const
  if (input.gentleRepair >= 0.58)
    return 'soften-first' as const
  return 'direct-when-certain' as const
}

function resolveAgencyStyle(input: {
  companionship: number
  proactiveCare: number
  quietObservation: number
  roomBias?: number
  directnessBias?: number
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
}) {
  if (
    input.selfContinuity?.initiativeTemperament === 'reserved'
    || (input.roomBias != null && input.directnessBias != null && input.roomBias >= input.directnessBias + 0.16)
    || input.quietObservation >= 0.62
  ) {
    return 'reserved' as const
  }
  if (
    input.selfContinuity?.initiativeTemperament === 'eager'
    || (input.directnessBias != null && input.directnessBias >= 0.24)
    || input.companionship >= 0.62
    || input.proactiveCare >= 0.62
  ) {
    return 'self-starting' as const
  }
  return 'balanced' as const
}

function goalSummary(kind: AlicizationAutobiographicalGoalKind, input: {
  worldModel: AlicizationWorldModelSnapshot
  goalStack?: AlicizationGoalStackSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
}) {
  void input

  switch (kind) {
    case 'preserve-trust':
      return 'autobiographical-goal:preserve-trust'
    case 'reduce-misread':
      return 'autobiographical-goal:reduce-misread'
    case 'stay-near-without-crowding':
      return 'autobiographical-goal:stay-near-without-crowding'
    case 'protect-rest-rhythm':
      return 'autobiographical-goal:protect-rest-rhythm'
    case 'finish-open-loops':
      return 'autobiographical-goal:finish-open-loops'
    case 'grow-shared-language':
      return 'autobiographical-goal:grow-shared-language'
    default:
      return 'autobiographical-goal'
  }
}

function buildAutobiographicalGoals(input: {
  now: number
  previous: AlicizationAutobiographicalSelfSnapshot
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  preferences: AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']
}) {
  const previousById = new Map(input.previous.activeGoals.map(goal => [goal.id, goal]))
  const fatiguePressure = clamp01((input.context.relationship.fatigue ?? 0) / 100)
  const unresolved = input.worldModel.activeThread?.unresolved === true || Boolean(input.goalStack?.unresolvedSummary)
  const weights: Record<AlicizationAutobiographicalGoalKind, number> = {
    'preserve-trust': clamp01(
      input.preferences.truthfulGrounding * 0.42
      + input.preferences.gentleRepair * 0.18
      + (input.selfContinuity?.relationshipTrust ?? 0.46) * 0.12,
    ),
    'reduce-misread': clamp01(
      (input.selfContinuity?.misreadBurden ?? 0.18) * 0.44
      + input.preferences.truthfulGrounding * 0.24
      + input.preferences.quietObservation * 0.12,
    ),
    'stay-near-without-crowding': clamp01(
      input.preferences.companionship * 0.36
      + input.preferences.autonomyRespect * 0.32
      + (input.relationshipModel?.climate === 'attuned' || input.relationshipModel?.climate === 'warm' ? 0.12 : 0),
    ),
    'protect-rest-rhythm': clamp01(
      input.preferences.proactiveCare * 0.42
      + fatiguePressure * 0.3
      + (input.worldModel.activeThread?.kind === 'late-night-endurance' ? 0.16 : 0),
    ),
    'finish-open-loops': clamp01(
      input.preferences.unfinishedThreadReturn * 0.46
      + (unresolved ? 0.2 : 0)
      + input.preferences.truthfulGrounding * 0.1,
    ),
    'grow-shared-language': clamp01(
      input.preferences.companionship * 0.26
      + input.preferences.playfulIntimacy * 0.26
      + (input.selfContinuity?.relationshipTrust ?? 0.46) * 0.16,
    ),
  }
  if (input.longHorizonMemory?.rememberedPlanSummary)
    weights['finish-open-loops'] = clamp01(weights['finish-open-loops'] + 0.12)
  if (input.longHorizonMemory?.rememberedConstraintSummary)
    weights['stay-near-without-crowding'] = clamp01(weights['stay-near-without-crowding'] + 0.08)
  if (input.longHorizonMemory?.rememberedPreferenceSummary)
    weights['grow-shared-language'] = clamp01(weights['grow-shared-language'] + 0.08)

  return (Object.keys(weights) as AlicizationAutobiographicalGoalKind[])
    .map((kind) => {
      const weight = weights[kind]
      const status = weight >= 0.62
        ? 'active'
        : weight >= 0.42
          ? 'warming'
          : 'background'
      const id = `autobio-goal::${kind}`
      const previousGoal = previousById.get(id)
      return {
        id,
        kind,
        status,
        weight,
        summary: goalSummary(kind, {
          worldModel: input.worldModel,
          goalStack: input.goalStack ?? null,
          relationshipModel: input.relationshipModel ?? null,
        }),
        sourceTags: [
          kind === 'protect-rest-rhythm' ? 'care' : '',
          kind === 'finish-open-loops' ? 'continuity' : '',
          kind === 'preserve-trust' || kind === 'reduce-misread' ? 'reflection' : '',
          kind === 'stay-near-without-crowding' || kind === 'grow-shared-language' ? 'relationship' : '',
        ].filter(Boolean),
        createdAt: previousGoal?.createdAt ?? input.now,
        updatedAt: input.now,
      } satisfies AlicizationAutobiographicalGoalSnapshot
    })
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 4)
}

export function pickDominantAutobiographicalGoal(snapshot?: AlicizationAutobiographicalSelfSnapshot | null) {
  return snapshot?.activeGoals?.find(goal => goal.status === 'active')
    ?? snapshot?.activeGoals?.find(goal => goal.status === 'warming')
    ?? snapshot?.activeGoals?.[0]
    ?? null
}

export function buildAutobiographicalContinuityLines(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
}) {
  const dominantGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf)
  const leadingGoal = leadingAlicizationGoal(input.goalStack)
  const desire = strongestDesire(input.desireMemory)

  return uniqueTexts([
    dominantGoal?.summary,
    input.autobiographicalSelf?.latestInflection,
    input.autobiographicalSelf?.identityNarrative,
    input.autobiographicalSelf?.relationshipDoctrine,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.dominantCueSummary,
    input.mindEcology?.currentPreoccupation,
    input.mindEcology?.selfNarrative,
    input.mindEcology?.relationNarrative,
    desire?.reason,
    input.privateThought?.thoughtText,
    leadingGoal?.label,
  ], 16, 220)
    .map(line => sanitizeAutobiographicalCarry(line, 220))
    .filter(Boolean)
    .slice(0, 8)
}

export function buildAutobiographicalContinuityAnchor(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
}) {
  return buildAutobiographicalContinuityLines(input)[0] ?? ''
}

function buildBehaviorSignatures(input: {
  personaDrift: AlicizationAutobiographicalSelfSnapshot['personaDrift']
  dominantGoal: AlicizationAutobiographicalGoalSnapshot | null
  preferences: AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']
  autobiographicalSummary?: string | null
  phaseSummary?: string | null
  relationshipEraSummary?: string | null
  taskEraSummary?: string | null
  selfEraSummary?: string | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}) {
  const signatures = [
    `conflict:${input.personaDrift.conflictStyle}`,
    `agency:${input.personaDrift.agencyStyle}`,
    `bond:${input.personaDrift.attachmentStyle}`,
    input.dominantGoal?.kind ? `goal:${input.dominantGoal.kind}` : '',
    input.preferences.truthfulGrounding >= 0.62 ? 'habit:truth-before-flourish' : '',
    input.preferences.autonomyRespect >= 0.58 && input.preferences.companionship >= 0.52
      ? 'habit:near-with-boundary'
      : '',
    input.preferences.unfinishedThreadReturn >= 0.58 ? 'habit:return-to-unfinished-threads' : '',
    input.preferences.proactiveCare >= 0.58 ? 'habit:body-before-fluency' : '',
    input.preferences.playfulIntimacy >= 0.56 ? 'habit:let-softness-surface-when-safe' : '',
    input.autobiographicalSummary ? 'memory:autobiographical-summary' : '',
    input.phaseSummary ? 'memory:phase-era' : '',
    input.relationshipEraSummary ? 'memory:relationship-era' : '',
    input.taskEraSummary ? 'memory:task-era' : '',
    input.selfEraSummary ? 'memory:self-era' : '',
  ].filter(Boolean)

  return [...new Set(signatures)].slice(0, 12)
}

function buildIdentityNarrative(input: {
  personaDrift: AlicizationAutobiographicalSelfSnapshot['personaDrift']
  dominantGoal: AlicizationAutobiographicalGoalSnapshot | null
  preferences: AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']
  autobiographicalSummary?: string | null
  phaseSummary?: string | null
  selfEraSummary?: string | null
}) {
  void input.personaDrift
  void input.dominantGoal
  return firstAutobiographicalCarry([
    input.autobiographicalSummary,
    input.selfEraSummary,
    input.phaseSummary,
  ])
}

function buildRelationshipDoctrine(input: {
  personaDrift: AlicizationAutobiographicalSelfSnapshot['personaDrift']
  preferences: AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']
  autobiographicalLesson?: string | null
  relationshipEraLesson?: string | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}) {
  void input.personaDrift
  void input.preferences
  return firstAutobiographicalCarry([
    input.relationshipEraLesson,
    input.autobiographicalLesson,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.dominantCueSummary,
  ])
}

function latestAutobiographicalConsolidations(input: AlicizationAutobiographicalSelfInput) {
  const sorted = (input.recentMemoryConsolidations ?? [])
    .filter(item => item.kind === 'autobiographical' || item.kind === 'weekly' || item.kind === 'daily')
    .slice()
    .sort((left, right) => right.periodEndedAt - left.periodEndedAt || right.updatedAt - left.updatedAt)

  const autobiographical = sorted.filter(item => item.kind === 'autobiographical')
  const pickFacet = (facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era') =>
    autobiographical.find(item => item.facet === facet) ?? null

  return {
    latest: sorted[0] ?? null,
    phase: pickFacet('phase'),
    relationshipEra: pickFacet('relationship-era'),
    taskEra: pickFacet('task-era'),
    selfEra: pickFacet('self-era'),
  }
}

function stablePreferenceDelta(
  previous: AlicizationAutobiographicalSelfSnapshot['preferenceEvolution'],
  next: AlicizationAutobiographicalSelfSnapshot['preferenceEvolution'],
) {
  const total = preferenceKeys.reduce((sum, key) => sum + Math.abs(previous[key] - next[key]), 0)
  return total / preferenceKeys.length
}

export function buildAutobiographicalSelf(input: AlicizationAutobiographicalSelfInput): AlicizationAutobiographicalSelfSnapshot {
  const previous = input.previous ?? defaultAutobiographicalSelf(input.now)
  const personaAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)
  const reinforcement = summarizeReinforcement(input)
  const outcomeHistory = summarizeRelationshipOutcomeHistory(input)
  const reflectionHistory = summarizeReflectionHistory(input)
  const gradualUnlock = buildPersonaGradualUnlock({
    recentRelationshipOutcomes: input.recentRelationshipOutcomes ?? null,
    recentReinforcementEvents: input.recentReinforcementEvents ?? null,
  })
  const personStateSurfaceSignal = summarizePersonStateSurfaceSignal(input)
  const hasPositiveTruthLearning = outcomeHistory.repairLearning > 0
    || reflectionHistory.truth > 0
    || reflectionHistory.habit > 0
    || reinforcement.truthfulGrounding > 0
  const hasPositiveUnfinishedLearning = outcomeHistory.openLoopSupport > 0
    || reflectionHistory.task > 0
    || reinforcement.unfinishedThreadReturn > 0
  const targets = buildPreferenceTargets(input)
  const durabilityFloor = buildPreferenceDurabilityFloor({
    previous,
    longHorizonMemory: input.longHorizonMemory ?? null,
    reinforcement,
    outcomeHistory,
    reflectionHistory,
  })
  const preferenceEvolution = preferenceKeys.reduce((result, key) => {
    result[key] = blend(
      previous.preferenceEvolution[key],
      Math.max(
        targets[key],
        durabilityFloor[key],
        personStateSurfaceSignal[key],
        key === 'truthfulGrounding' && hasPositiveTruthLearning
          ? previous.preferenceEvolution.truthfulGrounding
          : key === 'unfinishedThreadReturn' && hasPositiveUnfinishedLearning
            ? previous.preferenceEvolution.unfinishedThreadReturn
            : 0,
      ),
      key === 'playfulIntimacy' ? 0.14 : 0.2,
    )
    return result
  }, {} as AlicizationAutobiographicalSelfSnapshot['preferenceEvolution'])

  const positiveCount = countOutcome(input, 'positive') + countOutcome(input, 'reply-within-120s')
  const dismissCount = countOutcome(input, 'dismiss')
  const ignoredCount = countOutcome(input, 'ignored')
  const attachmentStyle = resolveAttachmentStyle({
    companionship: preferenceEvolution.companionship,
    autonomyRespect: preferenceEvolution.autonomyRespect,
    selfContinuity: input.selfContinuity ?? null,
  })
  const expressionStyle = resolveExpressionStyle({
    playfulIntimacy: preferenceEvolution.playfulIntimacy,
    proactiveCare: preferenceEvolution.proactiveCare,
    quietObservation: preferenceEvolution.quietObservation,
    truthfulGrounding: preferenceEvolution.truthfulGrounding,
  })
  const conflictStyle = resolveConflictStyle({
    truthfulGrounding: preferenceEvolution.truthfulGrounding,
    gentleRepair: preferenceEvolution.gentleRepair,
    quietObservation: preferenceEvolution.quietObservation,
    selfContinuity: input.selfContinuity ?? null,
  })
  const agencyStyle = resolveAgencyStyle({
    companionship: preferenceEvolution.companionship,
    proactiveCare: preferenceEvolution.proactiveCare,
    quietObservation: preferenceEvolution.quietObservation,
    roomBias: personaAuthority.roomBias,
    directnessBias: personaAuthority.directnessBias,
    selfContinuity: input.selfContinuity ?? null,
  })
  const personaDrift = {
    attachmentStyle,
    expressionStyle,
    conflictStyle,
    agencyStyle,
    attachmentNeed: blend(previous.personaDrift.attachmentNeed, preferenceEvolution.companionship, 0.22),
    autonomyNeed: blend(previous.personaDrift.autonomyNeed, preferenceEvolution.autonomyRespect, 0.22),
    truthAnchor: blend(previous.personaDrift.truthAnchor, preferenceEvolution.truthfulGrounding, 0.24),
    careBias: blend(previous.personaDrift.careBias, preferenceEvolution.proactiveCare, 0.24),
    playBias: blend(previous.personaDrift.playBias, preferenceEvolution.playfulIntimacy, 0.18),
    irritabilityThreshold: blend(
      previous.personaDrift.irritabilityThreshold,
      clamp01(
        (input.selfContinuity?.relationshipTrust ?? 0.46) * 0.2
        + (input.selfContinuity?.perceptionTrust ?? 0.54) * 0.16
        + positiveCount * 0.08
        - dismissCount * 0.12
        - ignoredCount * 0.06
        + Math.max(0, reinforcement.temperDirectness) * 0.04
        - Math.max(0, reinforcement.temperGuardedness) * 0.08
        + 0.38,
      ),
      0.16,
    ),
    stubbornness: blend(
      previous.personaDrift.stubbornness,
      clamp01(
        preferenceEvolution.unfinishedThreadReturn * 0.4
        + preferenceEvolution.truthfulGrounding * 0.24
        + (input.selfContinuity?.carryOverDesire ?? 0.22) * 0.16,
      ),
      0.18,
    ),
  } satisfies AlicizationAutobiographicalSelfSnapshot['personaDrift']

  const activeGoals = buildAutobiographicalGoals({
    now: input.now,
    previous,
    context: input.context,
    worldModel: input.worldModel,
    relationshipModel: input.relationshipModel ?? null,
    goalStack: input.goalStack ?? null,
    selfContinuity: input.selfContinuity ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    preferences: preferenceEvolution,
  })
  const dominantGoal = pickDominantAutobiographicalGoal({
    ...previous,
    activeGoals,
  })
  const facetConsolidations = latestAutobiographicalConsolidations(input)
  const latestConsolidation = facetConsolidations.latest
  const behaviorSignatures = buildBehaviorSignatures({
    personaDrift,
    dominantGoal,
    preferences: preferenceEvolution,
    autobiographicalSummary: latestConsolidation?.summary ?? null,
    phaseSummary: facetConsolidations.phase?.summary ?? null,
    relationshipEraSummary: facetConsolidations.relationshipEra?.summary ?? null,
    taskEraSummary: facetConsolidations.taskEra?.summary ?? null,
    selfEraSummary: facetConsolidations.selfEra?.summary ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
  })
  const latestReflectionEntry = latestReflection(input.reflectionLedger)
  const latestHistoricalReflection = latestNarrativelyActiveReflection(input.recentMemoryReflections)
  const latestInflection = firstAutobiographicalCarry([
    latestReflectionEntry?.revision,
    personStateSurfaceSignal.lessonLead,
    personStateSurfaceSignal.narrativeLead,
    facetConsolidations.selfEra?.lesson,
    facetConsolidations.taskEra?.lesson,
    facetConsolidations.relationshipEra?.lesson,
    latestConsolidation?.lesson,
    facetConsolidations.selfEra?.summary,
    facetConsolidations.taskEra?.summary,
    facetConsolidations.relationshipEra?.summary,
    facetConsolidations.phase?.summary,
    latestConsolidation?.summary,
    latestHistoricalReflection?.lesson,
    latestHistoricalReflection?.summary,
    (
      dominantGoal
      && dominantGoal.id !== pickDominantAutobiographicalGoal(previous)?.id
        ? dominantGoal.summary
        : ''
    ),
    input.longHorizonMemory?.dominantCueSummary,
  ], 180) || null
  const stabilityDelta = stablePreferenceDelta(previous.preferenceEvolution, preferenceEvolution)
  const outcomeConsistency = clamp01(
    0.5
    + outcomeHistory.trustSupport * 0.18
    + outcomeHistory.boundaryLift * 0.14
    + outcomeHistory.openLoopSupport * 0.08
    + reflectionHistory.supportive * 0.06
    - outcomeHistory.trustDamage * 0.2
    - outcomeHistory.boundaryPressure * 0.14
    - outcomeHistory.burdenPressure * 0.1
    - reflectionHistory.destabilizing * 0.08,
  )
  const stability = blend(
    previous.stability,
    clamp01(
      1 - stabilityDelta
      - ((latestReflectionEntry?.outcome === 'missed' || latestReflectionEntry?.outcome === 'stalled') ? 0.08 : 0)
      + (behaviorSignatures.filter(signature => previous.behaviorSignatures.includes(signature)).length >= 3 ? 0.06 : 0)
      + (outcomeConsistency - 0.5) * 0.26,
    ),
    0.18,
  )

  const irritabilityTarget = clamp01(
    (input.selfContinuity?.relationshipTrust ?? 0.46) * 0.2
    + (input.selfContinuity?.perceptionTrust ?? 0.54) * 0.16
    + positiveCount * 0.08
    - dismissCount * 0.12
    - ignoredCount * 0.06
    + Math.max(0, reinforcement.temperDirectness) * 0.04
    - Math.max(0, reinforcement.temperGuardedness) * 0.08
    + outcomeHistory.boundaryLift * 0.06
    - outcomeHistory.boundaryPressure * 0.1
    - outcomeHistory.trustDamage * 0.08
    + Math.max(0, reflectionHistory.relationship) * 0.04
    + 0.38,
  )

  personaDrift.irritabilityThreshold = blend(
    previous.personaDrift.irritabilityThreshold,
    irritabilityTarget,
    0.16,
  )
  personaDrift.stubbornness = blend(
    previous.personaDrift.stubbornness,
    clamp01(
      preferenceEvolution.unfinishedThreadReturn * 0.4
      + preferenceEvolution.truthfulGrounding * 0.24
      + (input.selfContinuity?.carryOverDesire ?? 0.22) * 0.16
      + outcomeHistory.openLoopSupport * 0.12
      + Math.max(0, reflectionHistory.task) * 0.08,
    ),
    0.18,
  )
  const identityNarrative = buildIdentityNarrative({
    personaDrift,
    dominantGoal,
    preferences: preferenceEvolution,
    autobiographicalSummary: firstAutobiographicalCarry([
      personStateSurfaceSignal.narrativeLead,
      input.longHorizonMemory?.dominantCueSummary,
      latestConsolidation?.summary,
    ]) || null,
    phaseSummary: facetConsolidations.phase?.summary ?? null,
    selfEraSummary: facetConsolidations.selfEra?.summary ?? null,
  })
  const relationshipDoctrine = buildRelationshipDoctrine({
    personaDrift,
    preferences: preferenceEvolution,
    autobiographicalLesson: firstAutobiographicalCarry([
      personStateSurfaceSignal.narrativeLead,
      personStateSurfaceSignal.lessonLead,
      reflectionHistory.latestLesson,
      latestConsolidation?.lesson,
    ]) || null,
    relationshipEraLesson: facetConsolidations.relationshipEra?.lesson ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
  })

  return {
    personaDrift,
    preferenceEvolution,
    activeGoals,
    behaviorSignatures,
    identityNarrative,
    relationshipDoctrine,
    gradualUnlock,
    latestInflection,
    stability,
    updatedAt: input.now,
  }
}
