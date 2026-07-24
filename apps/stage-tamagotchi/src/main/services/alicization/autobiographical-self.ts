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

export const alicizationAutobiographicalSelfMarker = '[ALICIZATION_AUTOBIOGRAPHICAL_SELF]'

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
  // NOTICE: Legacy callers may still pass project-state fields, but autobiographical
  // self is not the owner of project governance and must not turn them into persona text.
  projectStatePreDialogueAwarenessLine?: string | null
  projectStatePreflightSummary?: string | null
  projectStateEmotionalClosureCue?: string | null
  projectStatePrimaryOpenLoop?: string | null
  projectStateProactiveSameHerGap?: string | null
  projectStatePreferredPauseMode?: string | null
  projectStatePreferredLipsyncMode?: string | null
  projectStatePreferredVoiceMode?: string | null
  projectStatePreferredPacingMode?: string | null
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

const reflectionTruthPattern = /truth|ground|grounding|repair|reground|verify|clarif|misread|accur|honest|don't guess|do not guess|先确认|先稳住|修复|澄清|真实|准确|核实/iu
const reflectionBoundaryPattern = /boundary|space|crowd|pressure|softly|give more space|door before|space-protective|respect the window|边界|空间|压力|别挤|轻一点|慢一点|别贴太近/iu
const reflectionRelationshipPattern = /relationship|trust|receptive|stay near|warmth|close|closeness|soft closeness|陪|靠近|信任|关系|温度|被接住/iu
const reflectionTaskPattern = /thread|open loop|unfinished|return|follow[- ]?up|remember|carry the line|继续|未完成|线程|回来|跟进|别忘/iu
const reflectionHabitPattern = /habit|default|pattern|before.*after|before warmth|first|先.*再|默认|习惯|先后顺序/iu
const repairPattern = /repair|clarify|recheck|missed|not this|先确认|修复|澄清|重说|没答到|不是这个/iu
const burdenPattern = /burden|tired|busy|drained|interrupt|压力|累|忙|打断|疲惫|不想被催/iu
const closenessPattern = /warm|gentle|care|companionship|陪|温和|柔和|陪伴|靠近/iu
const spacePattern = /space|boundary|lighter|light touch|quiet|room|边界|空间|轻一点|安静|留白/iu
const autobiographicalNarrativePattern = /^(?:i learned|i am learning|i became|i am becoming|i learned to|我学会|我开始学会|我变得|我开始变得)/iu
const samePersonContinuityCarryPattern = /same[- ]?person continuity|same[- ]?person|same[- ]?her|continuity line|continuous digital life|tool shell|generic shell|连续性|同一条线|数字生命|工具壳/iu
const genericStatusCarryPattern = /status recap|status report|generic recap|generic status shell|concise status recap|progress recap|progress request|状态汇报|催进度|催状态/iu
const genericStatusCarryNegationPattern = /not a status report|not .*status recap|不是状态汇报|不是催进度|不是催状态/iu
const correctedCarryPattern = /corrected|host corrected|纠正|更正|corrected same-person continuity|downrank the older status shell|first interpretation|corrected relationship meaning|supersed|lower-pressure.*continuity line/iu
const tentativeCarryPattern = /tentative|not sure|uncertain|maybe|might|seems|不完全确定|似乎|也许/iu

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

function stringListFromUnknown(raw: unknown, maxItems = 8, maxChars = 64) {
  if (!Array.isArray(raw))
    return []
  return uniqueTexts(
    raw.map(item => sanitizeText(item, maxChars).toLowerCase() || null),
    maxItems,
    maxChars,
  )
}

function parseMetabolismPolicy(raw: unknown) {
  const policy = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!policy)
    return null

  const downrankMemoryIds = stringListFromUnknown(policy.downrankMemoryIds, 8, 96)
  const mergeMemoryIds = stringListFromUnknown(policy.mergeMemoryIds, 8, 96)
  const forgetMemoryIds = stringListFromUnknown(policy.forgetMemoryIds, 8, 96)
  const reasons = stringListFromUnknown(policy.reasons, 6, 220)

  if (
    downrankMemoryIds.length === 0
    && mergeMemoryIds.length === 0
    && forgetMemoryIds.length === 0
    && reasons.length === 0
  ) {
    return null
  }

  return {
    downrankMemoryIds,
    mergeMemoryIds,
    forgetMemoryIds,
    reasons,
  }
}

function blend(previous: number, target: number, rate = 0.18) {
  return clamp01(previous * (1 - rate) + target * rate)
}

function summarizeEmbodimentExpression(raw: unknown) {
  const expression = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!expression)
    return null

  const face = sanitizeText(expression.face, 64)
  const gaze = sanitizeText(expression.gaze, 64)
  const blink = sanitizeText(expression.blink, 64)
  const voice = sanitizeText(expression.voice, 64)
  const pause = sanitizeText(expression.pause, 64)
  const lipsync = sanitizeText(expression.lipsync, 64)
  const pacing = sanitizeText(expression.pacing, 64)

  if (!face && !gaze && !blink && !voice && !pause && !lipsync && !pacing)
    return null

  return sanitizeText(
    uniqueTexts([
      face ? `${face} face` : null,
      gaze ? `${gaze} gaze` : null,
      pause ? `${pause} pause` : null,
      lipsync ? `${lipsync} lipsync` : null,
      blink ? `${blink} blink` : null,
      voice ? `${voice} voice` : null,
      pacing ? `${pacing} pacing` : null,
    ], 8, 72).join(', '),
    220,
  ) || null
}

function latestReflection(ledger?: AlicizationReflectionLedgerSnapshot | null) {
  const latest = ledger?.entries.find(entry => entry.id === ledger.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return ledger?.entries.find(entry => entry.outcome !== 'released')
    ?? ledger?.entries[0]
    ?? null
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
  if (status === 'confirmed')
    return 1
  if (status === 'pending')
    return 0.82
  if (status === 'superseded')
    return 0.36
  return -0.52
}

function sortRecentReflectionsByRecency(reflections: AlicizationMemoryReflectionRecord[] | null | undefined) {
  return (reflections ?? [])
    .slice()
    .sort((left, right) => (right.updatedAt ?? right.createdAt) - (left.updatedAt ?? left.createdAt))
}

function latestNarrativelyActiveReflection(reflections: AlicizationMemoryReflectionRecord[] | null | undefined) {
  const ordered = sortRecentReflectionsByRecency(reflections)
  return ordered.find(reflection => reflection.status !== 'superseded')
    ?? ordered[0]
    ?? null
}

function inferReflectionThemeSignals(reflection: Pick<AlicizationMemoryReflectionRecord, 'summary' | 'lesson'>) {
  const text = sanitizeText(`${reflection.summary} ${reflection.lesson}`, 320)
  return {
    truth: reflectionTruthPattern.test(text),
    boundary: reflectionBoundaryPattern.test(text),
    relationship: reflectionRelationshipPattern.test(text),
    task: reflectionTaskPattern.test(text),
    habit: reflectionHabitPattern.test(text),
  }
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

    const themeSignals = inferReflectionThemeSignals(reflection)
    if (themeSignals.truth)
      summary.truth += signedWeight * 0.72
    if (themeSignals.boundary)
      summary.boundary += signedWeight * 0.54
    if (themeSignals.relationship)
      summary.relationship += signedWeight * 0.48
    if (themeSignals.task)
      summary.task += signedWeight * 0.52
    if (themeSignals.habit)
      summary.habit += signedWeight * 0.56
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
  humanlikeCarry?: ReturnType<typeof summarizeHumanlikeCarryFromReconsolidation> | null
}) {
  const previous = input.previous.preferenceEvolution
  const longHorizon = input.longHorizonMemory ?? null
  const humanlikeCarry = input.humanlikeCarry ?? null
  const residueTags = new Set(humanlikeCarry?.emotionalResidueTags ?? [])
  const correctedSamePersonCarry
    = humanlikeCarry?.relationshipPrimaryIntent === 'same-person-test'
      || humanlikeCarry?.relationshipPrimaryIntent === 'continuity-worry'
      || humanlikeCarry?.relationshipPrimaryIntent === 'mixed'
  const correctedRecallCarry = humanlikeCarry?.recallCertainty === 'corrected'
  const hostEmotionLabels = new Set(humanlikeCarry?.hostEmotionLabels ?? [])
  const selfEmotionLabels = new Set(humanlikeCarry?.selfEmotionLabels ?? [])
  const embodimentCadence = sanitizeText(humanlikeCarry?.embodimentCadence, 180).toLowerCase()
  const embodimentSummary = sanitizeText(humanlikeCarry?.embodimentSummary, 220).toLowerCase()
  const embodimentModalityRisk = sanitizeText(humanlikeCarry?.embodimentModalityRisk, 80).toLowerCase()
  const autobiographicalDelta = sanitizeText(humanlikeCarry?.autobiographicalDelta, 220).toLowerCase()
  const stablePreferenceHint = sanitizeText(humanlikeCarry?.stablePreferenceHint, 220).toLowerCase()
  const vulnerableCareCarry
    = residueTags.has('rest-protective')
      || residueTags.has('vulnerable-care')
      || /overloaded|fragile|vulnerable|before analysis|lighter companionship|stay nearby gently|care arrive before analysis/u.test(
        `${autobiographicalDelta} ${embodimentSummary} ${embodimentCadence}`,
      )
  const stableCareBeforeAnalysisCarry
    = /care-before-analysis|care before analysis|lighter companionship|stay nearby gently/u.test(stablePreferenceHint)
  const stableGentleMemoryLedCarry
    = /gentle|memory-led|still receiving|opening is still receiving|lower-pressure/u.test(stablePreferenceHint)
  const stableClearerOpeningCarry
    = /clearer opening|leave more room|widening too fast/u.test(stablePreferenceHint)
  const stableBoundedExecutionCarry
    = /explicit confirmation|bounded execution|wait for confirmation|risky local action/u.test(stablePreferenceHint)
  const stableReceivedRepairCarry
    = /lighter|lived-in|genuinely received|less robotic/u.test(stablePreferenceHint)
  const stableRepairMeaningCarry
    = /mechanical|not-quite-received|repairing relationship meaning|relationship meaning/u.test(stablePreferenceHint)

  const humanlikeCompanionship = clamp01(
    (residueTags.has('protective-continuity') ? 0.08 : 0)
    + (correctedSamePersonCarry ? 0.06 : 0)
    + (hostEmotionLabels.has('worried-continuity') ? 0.08 : 0)
    + (embodimentCadence.includes('stable gaze') ? 0.04 : 0)
    + (vulnerableCareCarry ? 0.22 : 0)
    + (stableCareBeforeAnalysisCarry ? 0.18 : 0)
    + (stableGentleMemoryLedCarry ? 0.3 : 0)
    + (stableReceivedRepairCarry ? 0.18 : 0)
    + (/stay nearby gently|lighter companionship|care arrive before analysis/u.test(`${autobiographicalDelta} ${embodimentSummary}`) ? 0.12 : 0),
  )
  const humanlikeTruthfulSupport = clamp01(
    (correctedRecallCarry ? 0.24 : 0)
    + (correctedSamePersonCarry ? 0.16 : 0)
    + (selfEmotionLabels.has('careful-repair') ? 0.08 : 0)
    + (stableBoundedExecutionCarry ? 0.12 : 0)
    + (stableRepairMeaningCarry ? 0.1 : 0)
    + (humanlikeCarry?.metabolismSummary ? 0.1 : 0),
  )
  const humanlikeGentleRepairSupport = clamp01(
    (correctedRecallCarry ? 0.2 : 0)
    + (residueTags.has('corrected-meaning') ? 0.14 : 0)
    + (selfEmotionLabels.has('careful-repair') ? 0.12 : 0)
    + (stableGentleMemoryLedCarry ? 0.08 : 0)
    + (stableReceivedRepairCarry ? 0.14 : 0)
    + (stableRepairMeaningCarry ? 0.12 : 0)
    + (humanlikeCarry?.autobiographicalDelta?.toLowerCase().includes('first interpretation') ? 0.12 : 0),
  )
  const humanlikeAutonomySupport = clamp01(
    (embodimentCadence.includes('lower-pressure') ? 0.16 : 0)
    + (embodimentCadence.includes('slower pacing') ? 0.08 : 0)
    + (embodimentSummary.includes('same-person continuity reopening') ? 0.06 : 0)
    + (embodimentModalityRisk === 'medium' ? 0.08 : embodimentModalityRisk === 'high' ? 0.14 : 0)
    + (vulnerableCareCarry ? 0.14 : 0)
    + (stableBoundedExecutionCarry ? 0.18 : 0)
    + (stableClearerOpeningCarry ? 0.12 : 0)
    + (stableGentleMemoryLedCarry ? 0.08 : 0)
    + (/before analysis|lighter companionship|host was overloaded/u.test(`${autobiographicalDelta} ${embodimentSummary}`) ? 0.1 : 0),
  )
  const humanlikeQuietObservationSupport = clamp01(
    (vulnerableCareCarry ? 0.42 : 0)
    + (stableCareBeforeAnalysisCarry ? 0.12 : 0)
    + (stableClearerOpeningCarry ? 0.1 : 0)
    + (stableBoundedExecutionCarry ? 0.08 : 0)
    + (/stay nearby gently|before analysis/u.test(autobiographicalDelta) ? 0.12 : 0)
    + (/lower-pressure|slower pacing|stable gaze/u.test(embodimentCadence) ? 0.1 : 0),
  )
  const humanlikeProactiveCareSupport = clamp01(
    (vulnerableCareCarry ? 0.46 : 0)
    + (stableCareBeforeAnalysisCarry ? 0.18 : 0)
    + (stableGentleMemoryLedCarry ? 0.1 : 0)
    + (/stay nearby gently|care arrive before analysis/u.test(autobiographicalDelta) ? 0.12 : 0)
    + (/lighter companionship|host was overloaded|before analysis/u.test(embodimentSummary) ? 0.1 : 0),
  )
  const humanlikeUnfinishedSupport = clamp01(
    (residueTags.has('unfinishedness') ? 0.18 : 0)
    + (residueTags.has('protective-continuity') ? 0.14 : 0)
    + (stableGentleMemoryLedCarry ? 0.22 : 0)
    + (stableClearerOpeningCarry ? 0.08 : 0)
    + (stableBoundedExecutionCarry ? 0.08 : 0)
    + (humanlikeCarry?.metabolismSummary ? 0.08 : 0),
  )

  const companionshipSupport = clamp01(
    input.outcomeHistory.closenessSupport * 0.42
    + input.outcomeHistory.trustSupport * 0.38
    + Math.max(0, input.reflectionHistory.relationship) * 0.28
    + Math.max(0, input.reinforcement.companionship) * 0.34
    + (longHorizon?.preferenceBias.companionship ?? 0) * 0.18
    + humanlikeCompanionship,
  )
  const truthfulSupport = clamp01(
    input.outcomeHistory.repairLearning * 0.42
    + Math.max(0, input.reflectionHistory.truth) * 0.34
    + Math.max(0, input.reflectionHistory.habit) * 0.12
    + Math.max(0, input.reinforcement.truthfulGrounding) * 0.34
    + (longHorizon?.preferenceBias.truthfulGrounding ?? 0) * 0.22
    + humanlikeTruthfulSupport,
  )
  const gentleRepairSupport = clamp01(
    input.outcomeHistory.repairLearning * 0.38
    + Math.max(0, input.reflectionHistory.truth) * 0.2
    + Math.max(0, input.reflectionHistory.habit) * 0.18
    + Math.max(0, input.reinforcement.gentleRepair) * 0.3
    + (longHorizon?.preferenceBias.gentleRepair ?? 0) * 0.18
    + humanlikeGentleRepairSupport,
  )
  const autonomySupport = clamp01(
    input.outcomeHistory.boundaryLift * 0.42
    + Math.max(0, input.reflectionHistory.boundary) * 0.34
    + Math.max(0, input.reinforcement.autonomyRespect) * 0.32
    + (longHorizon?.preferenceBias.autonomyRespect ?? 0) * 0.22
    + humanlikeAutonomySupport,
  )
  const unfinishedSupport = clamp01(
    input.outcomeHistory.openLoopSupport * 0.44
    + Math.max(0, input.reflectionHistory.task) * 0.32
    + Math.max(0, input.reinforcement.unfinishedThreadReturn) * 0.32
    + (longHorizon?.preferenceBias.unfinishedThreadReturn ?? 0) * 0.24
    + humanlikeUnfinishedSupport,
  )
  const proactiveCareSupport = clamp01(
    Math.max(companionshipSupport, humanlikeProactiveCareSupport),
  )
  const quietObservationSupport = clamp01(
    Math.max(autonomySupport, humanlikeQuietObservationSupport),
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
    quietObservation: quietObservationSupport >= 0.12
      ? clamp01(previous.quietObservation * 0.82 + quietObservationSupport * 0.2)
      : 0,
    proactiveCare: proactiveCareSupport >= 0.12
      ? clamp01(previous.proactiveCare * 0.8 + proactiveCareSupport * 0.18)
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
  const narrativeSource = Array.isArray(surface.narrative)
    ? surface.narrative
    : [surface.narrative]
  const narrativeTexts = uniqueTexts(narrativeSource, 3, 180)
  const summaryText = sanitizeText(`${surface.summary} ${narrativeTexts.join(' ')}`, 320)
  const preferenceText = uniqueTexts(surface.preferenceHints ?? [], 2, 180).join(' ')
  const sensitivityText = uniqueTexts(surface.sensitivityHints ?? [], 2, 180).join(' ')
  const repairText = uniqueTexts(surface.repairHints ?? [], 2, 180).join(' ')
  const burdenText = uniqueTexts(surface.burdenHints ?? [], 2, 180).join(' ')
  const cadence = surface.affectiveResidue?.relationshipCadence ?? null
  const cadenceSummary = sanitizeText(cadence?.summary, 220)
  const residueSummary = sanitizeText(surface.affectiveResidue?.summary, 220)
  const cadenceReasonText = uniqueTexts(cadence?.reasonTags ?? [], 4, 64).join(' ')
  const cadenceText = sanitizeText([
    cadenceSummary,
    residueSummary,
    cadence?.cadenceMode ? `cadence mode ${cadence.cadenceMode}` : '',
    cadence?.distancePosture ? `distance posture ${cadence.distancePosture}` : '',
    cadenceReasonText,
  ].filter(Boolean).join(' '), 320)
  const autobiographicalNarrativeLead = narrativeTexts.find(text => autobiographicalNarrativePattern.test(text))
  const directTruthBias = Number(surface.reinforcementBias['truthful-grounding'] ?? 0)
  const directRepairBias = Number(surface.reinforcementBias['gentle-repair'] ?? 0)
  const directCompanionshipBias = Number(surface.reinforcementBias.companionship ?? 0)
  const directAutonomyBias = Number(surface.reinforcementBias['autonomy-respect'] ?? 0)
  const directUnfinishedBias = Number(surface.reinforcementBias['unfinished-thread-return'] ?? 0)

  return {
    companionship: clamp01(
      Math.max(0, relationshipShift.closenessDelta) * 0.8
      + Math.max(0, relationshipShift.trustDelta) * 0.42
      + Math.max(0, directCompanionshipBias) * 0.72
      + (reflectionRelationshipPattern.test(summaryText) ? 0.12 : 0)
      + (reflectionRelationshipPattern.test(preferenceText) ? 0.08 : 0)
      + ((cadence?.companionshipDensity ?? 0) * 0.22)
      + (closenessPattern.test(cadenceText) ? 0.08 : 0),
    ),
    truthfulGrounding: clamp01(
      Math.max(0, relationshipShift.trustDelta) * 0.36
      + Math.max(0, directTruthBias) * 0.92
      + (reflectionTruthPattern.test(summaryText) ? 0.22 : 0)
      + (reflectionTruthPattern.test(repairText) ? 0.14 : 0)
      + (reflectionTruthPattern.test(preferenceText) ? 0.08 : 0),
    ),
    gentleRepair: clamp01(
      Math.max(0, relationshipShift.repairDelta) * 0.9
      + Math.max(0, -relationshipShift.burdenDelta) * 0.22
      + Math.max(0, directRepairBias) * 0.9
      + (reflectionTruthPattern.test(repairText) ? 0.18 : 0)
      + (repairPattern.test(summaryText) ? 0.14 : 0)
      + ((cadence?.repairRecovery ?? 0) * 0.14),
    ),
    quietObservation: clamp01(
      Math.max(0, relationshipShift.boundaryDelta) * 0.4
      + Math.max(0, directAutonomyBias) * 0.32
      + (reflectionBoundaryPattern.test(preferenceText) ? 0.16 : 0)
      + (spacePattern.test(summaryText) ? 0.12 : 0),
    ),
    proactiveCare: clamp01(
      Math.max(0, -relationshipShift.burdenDelta) * 0.5
      + Math.max(0, relationshipShift.trustDelta) * 0.18
      + (burdenPattern.test(burdenText) ? 0.14 : 0)
      + (closenessPattern.test(summaryText) ? 0.08 : 0),
    ),
    playfulIntimacy: 0,
    autonomyRespect: clamp01(
      Math.max(0, relationshipShift.boundaryDelta) * 0.84
      + Math.max(0, directAutonomyBias) * 1.08
      + (reflectionBoundaryPattern.test(preferenceText) ? 0.2 : 0)
      + (spacePattern.test(sensitivityText) ? 0.12 : 0)
      + (cadence?.shouldDelayWarmth ? 0.18 : 0)
      + (cadence?.distancePosture === 'measured-room' ? 0.14 : 0)
      + ((cadence?.overreachRisk ?? 0) * 0.14)
      + (/lower-pressure|measured-return|continuity line/iu.test(cadenceText) ? 0.12 : 0),
    ),
    unfinishedThreadReturn: clamp01(
      Math.max(0, directUnfinishedBias) * 0.86
      + (reflectionTaskPattern.test(summaryText) ? 0.18 : 0)
      + (reflectionTaskPattern.test(repairText) ? 0.12 : 0)
      + ((cadence?.afterglowCarry ?? 0) * 0.24)
      + (cadence?.cadenceMode === 'measured-return' ? 0.12 : 0)
      + (/continuity line|still settling|lower-pressure/iu.test(cadenceText) ? 0.16 : 0),
    ),
    narrativeLead: sanitizeText(
      cadenceSummary
      || residueSummary
      || autobiographicalNarrativeLead
      || narrativeTexts[0]
      || surface.summary,
      180,
    ),
    lessonLead: sanitizeText(
      cadenceSummary
      || residueSummary
      || autobiographicalNarrativeLead
      || narrativeTexts[0]
      || surface.repairHints[0]
      || surface.preferenceHints[0]
      || surface.sensitivityHints[0]
      || surface.burdenHints[0],
      180,
    ),
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
    + outcomeHistory.boundaryPressure * 0.12
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
    + outcomeHistory.boundaryPressure * 0.1
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
    || input.roomBias != null && input.directnessBias != null && input.roomBias >= input.directnessBias + 0.16
    || input.quietObservation >= 0.62
  ) {
    return 'reserved' as const
  }
  if (
    input.selfContinuity?.initiativeTemperament === 'eager'
    || input.directnessBias != null && input.directnessBias >= 0.24
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

function parseInitiativeStrategyCue(raw: unknown) {
  const normalized = sanitizeText(raw, 320).toLowerCase()
  const chooseOpeningsCarefully = /clearer opening|fresher opening|leave more room|less eager|wait for a clearer opening|wait for a fresher opening/u.test(normalized)
  const keepGentleOpenings = !chooseOpeningsCarefully
    && /gentle|memory-led|still receiving|accepted or continued|received without obvious resistance|轻一点|轻轻接|先别催/u.test(normalized)
  const sameLivingLine = /continuity line|one living line|same[- ]?her|same line|同一条线|同一条生命线/u.test(normalized)
  const hostLightReturnWording = /轻一点|轻轻接|先别催/u.test(normalized)

  return {
    cue: normalized,
    chooseOpeningsCarefully,
    keepGentleOpenings,
    sameLivingLine,
    hostLightReturnWording,
  }
}

function readInitiativeStrategyCarryProfile(longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null) {
  const combinedCue = uniqueTexts([
    longHorizonMemory?.rememberedConstraintSummary,
    longHorizonMemory?.rememberedPreferenceSummary,
    longHorizonMemory?.rememberedPlanSummary,
    longHorizonMemory?.dominantCueSummary,
    ...(longHorizonMemory?.anchorFacts ?? [])
      .filter(item => sanitizeText(item.predicate, 64).toLowerCase() === 'initiative-strategy-carry')
      .flatMap(item => [item.object, item.summary]),
  ], 8, 220).join(' ')

  return parseInitiativeStrategyCue(combinedCue)
}

function readRecentProactiveLivedWording(raw: unknown, pattern: RegExp, maxChars = 120) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized || !pattern.test(normalized))
    return null
  return normalized
}

function readRecentProactiveOutcomeStrategyProfile(
  recentOutcomes?: AlicizationAutobiographicalSelfInput['context']['relationship']['recentProactiveOutcomes'],
) {
  const sortedOutcomes = Array.isArray(recentOutcomes)
    ? recentOutcomes
        .slice()
        .sort((left, right) => {
          const leftAt = Number((left as any)?.createdAt ?? (left as any)?.at ?? 0)
          const rightAt = Number((right as any)?.createdAt ?? (right as any)?.at ?? 0)
          return rightAt - leftAt
        })
    : []

  for (const outcome of sortedOutcomes.slice(0, 6)) {
    const combinedCue = uniqueTexts([
      (outcome as any)?.userText,
      (outcome as any)?.assistantText,
      (outcome as any)?.projectStateNextFocusSummary,
      (outcome as any)?.projectStateOpenFocusSummary,
      (outcome as any)?.projectStateEmotionalClosureCue,
      (outcome as any)?.affectiveResidue?.relationshipCadence?.summary,
      (outcome as any)?.affectiveResidue?.summary,
      ...(Array.isArray((outcome as any)?.learningFocuses) ? (outcome as any).learningFocuses : []),
    ], 8, 220).join(' ')

    const parsed = parseInitiativeStrategyCue(combinedCue)
    if (!parsed.cue)
      continue

    const acceptedOutcome = (outcome as any)?.outcome === 'positive' || (outcome as any)?.outcome === 'reply-within-120s'
    const resistedOutcome = (outcome as any)?.outcome === 'dismiss' || (outcome as any)?.outcome === 'ignored'
    const shouldCarry
      = (acceptedOutcome && parsed.keepGentleOpenings)
        || (resistedOutcome && parsed.chooseOpeningsCarefully)
        || parsed.keepGentleOpenings
        || parsed.chooseOpeningsCarefully

    if (!shouldCarry)
      continue

    const hostLivedLine = readRecentProactiveLivedWording(
      (outcome as any)?.userText,
      /轻一点|轻轻接|先别催/u,
    )
    const assistantLivedLine = readRecentProactiveLivedWording(
      (outcome as any)?.assistantText,
      /我没有催|轻轻接|轻一点/u,
    )
    const livedExchangeSnippet = sanitizeText(
      uniqueTexts([hostLivedLine, assistantLivedLine], 2, 120).join(' '),
      180,
    ) || null

    return {
      ...parsed,
      hostLivedLine,
      assistantLivedLine,
      livedExchangeSnippet,
      summary: sanitizeText(combinedCue, 220) || null,
    }
  }

  return {
    cue: '',
    chooseOpeningsCarefully: false,
    keepGentleOpenings: false,
    sameLivingLine: false,
    hostLightReturnWording: false,
    hostLivedLine: null,
    assistantLivedLine: null,
    livedExchangeSnippet: null,
    summary: null,
  }
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
  recentProactiveOutcomeStrategy?: ReturnType<typeof readRecentProactiveOutcomeStrategyProfile> | null
}) {
  const initiativeStrategyCarry = readInitiativeStrategyCarryProfile(input.longHorizonMemory ?? null)
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
    (initiativeStrategyCarry.chooseOpeningsCarefully || input.recentProactiveOutcomeStrategy?.chooseOpeningsCarefully) ? 'habit:choose-openings-carefully' : '',
    (initiativeStrategyCarry.keepGentleOpenings || input.recentProactiveOutcomeStrategy?.keepGentleOpenings) ? 'habit:keep-gentle-openings' : '',
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
  proactiveSameHerGap?: string | null
  recentProactiveOutcomeStrategy?: ReturnType<typeof readRecentProactiveOutcomeStrategyProfile> | null
}) {
  void input.personaDrift
  void input.dominantGoal
  return firstAutobiographicalCarry([
    input.autobiographicalSummary,
    input.selfEraSummary,
    input.phaseSummary,
    input.proactiveSameHerGap,
    input.recentProactiveOutcomeStrategy?.hostLivedLine,
    input.recentProactiveOutcomeStrategy?.livedExchangeSnippet,
    input.recentProactiveOutcomeStrategy?.summary,
  ])
}

function buildRelationshipDoctrine(input: {
  personaDrift: AlicizationAutobiographicalSelfSnapshot['personaDrift']
  preferences: AlicizationAutobiographicalSelfSnapshot['preferenceEvolution']
  autobiographicalLesson?: string | null
  relationshipEraLesson?: string | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  humanlikeCarry?: ReturnType<typeof summarizeHumanlikeCarryFromReconsolidation> | null
  recentProactiveOutcomeStrategy?: ReturnType<typeof readRecentProactiveOutcomeStrategyProfile> | null
}) {
  void input.personaDrift
  void input.preferences
  return firstAutobiographicalCarry([
    input.relationshipEraLesson,
    input.autobiographicalLesson,
    input.humanlikeCarry?.autobiographicalDelta,
    input.humanlikeCarry?.stablePreferenceHint,
    input.humanlikeCarry?.embodimentExpressionSummary,
    input.humanlikeCarry?.embodimentCadence,
    input.recentProactiveOutcomeStrategy?.hostLivedLine,
    input.recentProactiveOutcomeStrategy?.assistantLivedLine,
    input.recentProactiveOutcomeStrategy?.livedExchangeSnippet,
    input.recentProactiveOutcomeStrategy?.summary,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.dominantCueSummary,
  ])
}

function latestAutobiographicalConsolidations(input: AlicizationAutobiographicalSelfInput) {
  const sorted = filterSupersededAutobiographicalConsolidations(input.recentMemoryConsolidations ?? [])
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

interface ParsedHumanlikeCarryConsolidation {
  item: AlicizationMemoryConsolidationRecord
  relationshipPrimaryIntent: string
  recallCertainty: string
  emotionalResidueTags: string[]
  hostEmotionLabels: string[]
  selfEmotionLabels: string[]
  embodimentCadence: string | null
  embodimentExpressionSummary: string | null
  embodimentRecallStrength: string | null
  embodimentModalityRisk: string | null
  metabolismSummary: string | null
  metabolismPolicy: {
    downrankMemoryIds: string[]
    mergeMemoryIds: string[]
    forgetMemoryIds: string[]
    reasons: string[]
  } | null
  stablePreferenceHint: string | null
  autobiographicalDelta: string | null
  embodimentSummary: string | null
  samePersonContinuity: boolean
  genericStatusRecap: boolean
  correctedSamePersonAuthority: boolean
  tentativeMeaning: boolean
  authorityScore: number
  semanticAuthority: 'corrected-same-person' | 'generic-status' | 'other'
}

function parseHumanlikeCarryConsolidation(item: AlicizationMemoryConsolidationRecord): ParsedHumanlikeCarryConsolidation | null {
  const metadata = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, unknown>
    : null
  const humanlikeCarry = metadata?.humanlikeCarry && typeof metadata.humanlikeCarry === 'object' && !Array.isArray(metadata.humanlikeCarry)
    ? metadata.humanlikeCarry as Record<string, unknown>
    : null
  if (!humanlikeCarry)
    return null

  const relationshipPrimaryIntent = sanitizeText(humanlikeCarry.relationshipPrimaryIntent, 80).toLowerCase()
  const recallCertainty = sanitizeText(humanlikeCarry.recallCertainty, 40).toLowerCase()
  const emotionalResidueTags = Array.isArray(humanlikeCarry.emotionalResidueTags)
    ? humanlikeCarry.emotionalResidueTags.map(tag => sanitizeText(tag, 64).toLowerCase()).filter(Boolean)
    : []
  const embodimentCadence = sanitizeText(humanlikeCarry.embodimentCadence, 180) || null
  const embodimentExpressionSummary = summarizeEmbodimentExpression(humanlikeCarry.embodimentExpression)
  const metabolismPolicy = parseMetabolismPolicy(humanlikeCarry.metabolismPolicy)
  const metabolismSummary = sanitizeText(humanlikeCarry.metabolismSummary, 220)
    || sanitizeText(metabolismPolicy?.reasons.join(' '), 220)
    || null
  const stablePreferenceHint = sanitizeText(humanlikeCarry.stablePreferenceHint, 220) || null
  const autobiographicalDelta = sanitizeText(humanlikeCarry.autobiographicalDelta, 220) || null
  const embodimentSummary = sanitizeText(humanlikeCarry.embodimentSummary, 220) || null
  const affectivePerspective = humanlikeCarry.affectivePerspective && typeof humanlikeCarry.affectivePerspective === 'object' && !Array.isArray(humanlikeCarry.affectivePerspective)
    ? humanlikeCarry.affectivePerspective as Record<string, unknown>
    : null
  const hostEmotionLabels = Array.isArray(affectivePerspective?.hostEmotionLabels)
    ? affectivePerspective.hostEmotionLabels.map(label => sanitizeText(label, 64).toLowerCase()).filter(Boolean)
    : []
  const selfEmotionLabels = Array.isArray(affectivePerspective?.selfEmotionLabels)
    ? affectivePerspective.selfEmotionLabels.map(label => sanitizeText(label, 64).toLowerCase()).filter(Boolean)
    : []
  const embodimentRecallProfile = humanlikeCarry.embodimentRecallProfile && typeof humanlikeCarry.embodimentRecallProfile === 'object' && !Array.isArray(humanlikeCarry.embodimentRecallProfile)
    ? humanlikeCarry.embodimentRecallProfile as Record<string, unknown>
    : null
  const embodimentRecallStrength = sanitizeText(embodimentRecallProfile?.recallStrength, 80) || null
  const embodimentModalityRisk = sanitizeText(embodimentRecallProfile?.modalityRisk, 80) || null

  if (
    !relationshipPrimaryIntent
    && !recallCertainty
    && emotionalResidueTags.length === 0
    && hostEmotionLabels.length === 0
    && selfEmotionLabels.length === 0
    && !embodimentCadence
    && !embodimentExpressionSummary
    && !embodimentRecallStrength
    && !embodimentModalityRisk
    && !metabolismSummary
    && !metabolismPolicy
    && !stablePreferenceHint
    && !autobiographicalDelta
    && !embodimentSummary
  ) {
    return null
  }

  const semanticText = sanitizeText([
    item.summary,
    item.lesson,
    item.cues.join(' '),
    relationshipPrimaryIntent,
    recallCertainty,
    emotionalResidueTags.join(' '),
    hostEmotionLabels.join(' '),
    selfEmotionLabels.join(' '),
    embodimentCadence,
    embodimentExpressionSummary,
    embodimentRecallStrength,
    embodimentModalityRisk,
    ...(metabolismPolicy?.downrankMemoryIds ?? []),
    ...(metabolismPolicy?.mergeMemoryIds ?? []),
    ...(metabolismPolicy?.forgetMemoryIds ?? []),
    ...(metabolismPolicy?.reasons ?? []),
    metabolismSummary,
    stablePreferenceHint,
    autobiographicalDelta,
    embodimentSummary,
  ].filter(Boolean).join(' '), 640).toLowerCase()
  const samePersonContinuity = samePersonContinuityCarryPattern.test(semanticText)
  const genericStatusRecap = genericStatusCarryPattern.test(semanticText) && !genericStatusCarryNegationPattern.test(semanticText)
  const correctedSamePersonAuthority = samePersonContinuity && (
    relationshipPrimaryIntent === 'same-person-test'
    || relationshipPrimaryIntent === 'continuity-worry'
    || relationshipPrimaryIntent === 'mixed'
    || recallCertainty === 'corrected'
    || emotionalResidueTags.includes('corrected-meaning')
    || correctedCarryPattern.test(semanticText)
  )
  const tentativeMeaning = recallCertainty === 'tentative' || tentativeCarryPattern.test(semanticText)
  const authorityScore
    = item.confidence * 0.18
      + (samePersonContinuity ? 0.34 : 0)
      + (correctedSamePersonAuthority ? 0.62 : 0)
      + (
        relationshipPrimaryIntent === 'same-person-test'
        || relationshipPrimaryIntent === 'continuity-worry'
        || relationshipPrimaryIntent === 'mixed'
          ? 0.18
          : 0
      )
      + (recallCertainty === 'corrected' ? 0.22 : 0)
      + (emotionalResidueTags.includes('protective-continuity') ? 0.08 : 0)
      + (emotionalResidueTags.includes('corrected-meaning') ? 0.12 : 0)
      + (/lower-pressure|stable gaze|slower pacing/iu.test(semanticText) ? 0.08 : 0)
      - (genericStatusRecap ? 0.34 : 0)
      - (tentativeMeaning ? 0.08 : 0)

  return {
    item,
    relationshipPrimaryIntent,
    recallCertainty,
    emotionalResidueTags,
    hostEmotionLabels,
    selfEmotionLabels,
    embodimentCadence,
    embodimentExpressionSummary,
    embodimentRecallStrength,
    embodimentModalityRisk,
    metabolismSummary,
    metabolismPolicy,
    stablePreferenceHint,
    autobiographicalDelta,
    embodimentSummary,
    samePersonContinuity,
    genericStatusRecap,
    correctedSamePersonAuthority,
    tentativeMeaning,
    authorityScore,
    semanticAuthority: correctedSamePersonAuthority
      ? 'corrected-same-person'
      : genericStatusRecap
        ? 'generic-status'
        : 'other',
  }
}

function filterSupersededAutobiographicalConsolidations(consolidations: AlicizationMemoryConsolidationRecord[]) {
  const parsedById = new Map(
    consolidations
      .map(item => parseHumanlikeCarryConsolidation(item))
      .filter((item): item is ParsedHumanlikeCarryConsolidation => item !== null)
      .map(item => [item.item.id, item] as const),
  )

  return consolidations.filter((current) => {
    const parsedCurrent = parsedById.get(current.id)
    if (!parsedCurrent || !parsedCurrent.genericStatusRecap)
      return true

    return ![...parsedById.values()].some((candidate) => {
      if (candidate.item.id === current.id)
        return false
      if (candidate.item.facet !== current.facet)
        return false
      if (!candidate.correctedSamePersonAuthority || candidate.tentativeMeaning)
        return false
      if (candidate.item.confidence < 0.78)
        return false
      return candidate.authorityScore > parsedCurrent.authorityScore + 0.16
    })
  })
}

function summarizeHumanlikeCarryFromReconsolidation(input: AlicizationAutobiographicalSelfInput) {
  const parsed = filterSupersededAutobiographicalConsolidations(input.recentMemoryConsolidations ?? [])
    .map(item => parseHumanlikeCarryConsolidation(item))
    .filter((item): item is ParsedHumanlikeCarryConsolidation => item !== null)
    .sort((left, right) => {
      if (left.authorityScore !== right.authorityScore)
        return right.authorityScore - left.authorityScore
      if (left.item.confidence !== right.item.confidence)
        return right.item.confidence - left.item.confidence
      return right.item.updatedAt - left.item.updatedAt
    })

  const selected = parsed[0]
  if (selected) {
    return {
      relationshipPrimaryIntent: selected.relationshipPrimaryIntent,
      recallCertainty: selected.recallCertainty,
      emotionalResidueTags: selected.emotionalResidueTags,
      hostEmotionLabels: selected.hostEmotionLabels,
      selfEmotionLabels: selected.selfEmotionLabels,
      embodimentCadence: selected.embodimentCadence,
      embodimentExpressionSummary: selected.embodimentExpressionSummary,
      embodimentRecallStrength: selected.embodimentRecallStrength,
      embodimentModalityRisk: selected.embodimentModalityRisk,
      metabolismSummary: selected.metabolismSummary,
      metabolismPolicy: selected.metabolismPolicy,
      stablePreferenceHint: selected.stablePreferenceHint,
      autobiographicalDelta: selected.autobiographicalDelta,
      embodimentSummary: selected.embodimentSummary,
      semanticAuthority: selected.semanticAuthority,
    }
  }

  return null
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
  const recentProactiveOutcomeStrategy = readRecentProactiveOutcomeStrategyProfile(
    input.context.relationship.recentProactiveOutcomes,
  )
  const personaAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)
  const reinforcement = summarizeReinforcement(input)
  const outcomeHistory = summarizeRelationshipOutcomeHistory(input)
  const reflectionHistory = summarizeReflectionHistory(input)
  const gradualUnlock = buildPersonaGradualUnlock({
    recentRelationshipOutcomes: input.recentRelationshipOutcomes ?? null,
    recentReinforcementEvents: input.recentReinforcementEvents ?? null,
  })
  const personStateSurfaceSignal = summarizePersonStateSurfaceSignal(input)
  const reconsolidatedHumanlikeCarry = summarizeHumanlikeCarryFromReconsolidation(input)
  const stablePreferenceHint = sanitizeText(reconsolidatedHumanlikeCarry?.stablePreferenceHint, 220).toLowerCase()
  const stableGentleMemoryLedPreferenceCarry = /gentle|memory-led|still receiving|opening is still receiving|lower-pressure/u.test(stablePreferenceHint)
  const stableCareBeforeAnalysisPreferenceCarry = /care-before-analysis|care before analysis|lighter companionship|stay nearby gently/u.test(stablePreferenceHint)
  const stableReceivedRepairPreferenceCarry = /lighter|lived-in|genuinely received|less robotic/u.test(stablePreferenceHint)
  const stableRepairMeaningPreferenceCarry = /mechanical|not-quite-received|repairing relationship meaning|relationship meaning/u.test(stablePreferenceHint)
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
    humanlikeCarry: reconsolidatedHumanlikeCarry,
  })
  const preferenceEvolution = preferenceKeys.reduce((result, key) => {
    result[key] = blend(
      previous.preferenceEvolution[key],
      Math.max(
        targets[key],
        durabilityFloor[key],
        personStateSurfaceSignal[key],
        key === 'companionship' && stableGentleMemoryLedPreferenceCarry
          ? 0.48
          : key === 'companionship' && stableCareBeforeAnalysisPreferenceCarry
            ? 0.46
            : key === 'companionship' && stableReceivedRepairPreferenceCarry
              ? 0.48
              : key === 'unfinishedThreadReturn' && stableGentleMemoryLedPreferenceCarry
                ? 0.48
                : key === 'unfinishedThreadReturn' && stableCareBeforeAnalysisPreferenceCarry
                  ? 0.44
                  : key === 'gentleRepair' && (stableReceivedRepairPreferenceCarry || stableRepairMeaningPreferenceCarry)
                    ? 0.47
                    : key === 'truthfulGrounding' && stableRepairMeaningPreferenceCarry
                      ? 0.46
                      : key === 'truthfulGrounding' && hasPositiveTruthLearning
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
    recentProactiveOutcomeStrategy,
  })
  const latestReflectionEntry = latestReflection(input.reflectionLedger)
  const latestHistoricalReflection = latestNarrativelyActiveReflection(input.recentMemoryReflections)
  const latestInflection = firstAutobiographicalCarry([
    latestReflectionEntry?.revision,
    personStateSurfaceSignal.lessonLead,
    reconsolidatedHumanlikeCarry?.metabolismSummary,
    reconsolidatedHumanlikeCarry?.autobiographicalDelta,
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
      recentProactiveOutcomeStrategy.livedExchangeSnippet,
      recentProactiveOutcomeStrategy.summary,
      reconsolidatedHumanlikeCarry?.autobiographicalDelta,
      reconsolidatedHumanlikeCarry?.embodimentCadence,
      input.longHorizonMemory?.dominantCueSummary,
      latestConsolidation?.summary,
    ]) || null,
    phaseSummary: facetConsolidations.phase?.summary ?? null,
    selfEraSummary: facetConsolidations.selfEra?.summary ?? null,
    recentProactiveOutcomeStrategy,
  })
  const relationshipDoctrine = buildRelationshipDoctrine({
    personaDrift,
    preferences: preferenceEvolution,
    autobiographicalLesson: firstAutobiographicalCarry([
      personStateSurfaceSignal.lessonLead,
      reflectionHistory.latestLesson,
      reconsolidatedHumanlikeCarry?.metabolismSummary,
      reconsolidatedHumanlikeCarry?.autobiographicalDelta,
      reconsolidatedHumanlikeCarry?.embodimentCadence,
      latestConsolidation?.lesson,
    ]) || null,
    relationshipEraLesson: facetConsolidations.relationshipEra?.lesson ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    humanlikeCarry: reconsolidatedHumanlikeCarry,
    recentProactiveOutcomeStrategy,
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
