import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationEpisodicEventRecord,
  AlicizationHabitPolicySnapshot,
  AlicizationHostPersonModelSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
} from '../../../shared/eventa'

import type { AlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'

import { buildAlicizationDialogueGrowthProfile } from './dialogue-growth-profile'

export type AlicizationPersonalityContinuityRegime
  = | 'focused-work'
    | 'late-night-care'
    | 'repair-window'
    | 'execution-callback'
    | 'open-companionship'
    | 'general'

export interface AlicizationPersonalityRegimeModelSnapshot {
  dominantRegime: AlicizationPersonalityContinuityRegime
  confidence: number
  primaryReason: string | null
  carryReason: string | null
  carryFrom: AlicizationPersonalityContinuityRegime | null
  signals: string[]
  scores: Record<AlicizationPersonalityContinuityRegime, number>
}

export interface AlicizationPersonalityRhythmStateSnapshot {
  cadenceMode: 'cooldown' | 'measured-return' | 'ready-return' | 'warm-hold'
  restMode: 'rest-protective' | 'low-pressure' | 'open'
  embodiedPresence: NonNullable<AlicizationPrivateThoughtSnapshot['embodiedPresence']> | null
  suggestedStyle: AlicizationPrivateThoughtSnapshot['suggestedStyle'] | null
  moodLabel: string | null
  emotionalTension: AlicizationPrivateThoughtSnapshot['emotionalTension'] | null
  cadencePressure: number
  restPressure: number
  memoryResonance: number
  companionshipTempo: number
  summary: string
  rationale: string[]
}

export interface AlicizationPersonalityContinuityStateSnapshot {
  growthProfile: AlicizationDialogueGrowthProfile
  trustStage: 'guarded' | 'cautious-open' | 'warming' | 'trusted'
  currentRegime: AlicizationPersonalityContinuityRegime
  closenessPosture: 'space-first' | 'balanced' | 'warm-guidance' | 'close-hold'
  repairPosture: 'repair-first' | 'measured-repair' | 'warm-repair'
  autonomyPosture: 'protect-space' | 'balanced' | 'close-allowed'
  cadenceProfile: 'slow-return' | 'steady-return' | 'eager-return'
  energyProfile: 'rest-sensitive' | 'steady' | 'engaged'
  continuitySummary: string
  regimeModel: AlicizationPersonalityRegimeModelSnapshot
  rhythmState: AlicizationPersonalityRhythmStateSnapshot
  trustMeaning: string | null
  reconsolidationLine: string | null
  selfLine: string | null
  relationLine: string | null
  currentPreoccupation: string | null
  rationale: string[]
  updatedAt: number
}

interface AlicizationPersonalityReconsolidationInfluence {
  lines: string[]
  primaryLine: string | null
  trustMeaning: string | null
  warmthLift: number
  spaceLift: number
  repairLift: number
  cadenceLift: number
  restLift: number
  trustLift: number
  trustDrag: number
}

const reconSpacePattern = /space|room|lighter|quiet|leave room|back off|boundary|not crowd|without crowding|lighter touch|focused windows|空间|留白|别贴太近|轻一点|慢一点|边界/u
const reconWarmthPattern = /warm|closeness|close enough|stay near|stay close|companionship|held|received|open companionship|靠近|陪|温和|亲近|被接住/u
const reconRepairPattern = /repair|truth|clarify|recheck|reground|don't guess|do not guess|truth discipline|修复|澄清|核实|真实|准确/u
const reconCadencePattern = /return|come back|follow[- ]?up|reopen|unfinished|continue|open loop|callback|回到|跟进|继续|未完成|回调/u
const reconRestPattern = /rest|late-night|tired|fatigue|body rhythm|protect rest|low-pressure|夜|累|疲惫|休息|节律/u
const reconTrustLiftPattern = /trust|safer|safe enough|opened the door|welcomed|received|steady|接住|信任|更稳|更放心/u
const reconTrustDragPattern = /pressure|intrusive|overreach|rupture|robotic|crowding|pushed too hard|not this|越界|压力|打扰|侵入|机械/u
const focusedWorkPattern = /focused|focus|runtime|diff|cursor|terminal|coding|debug|patch|review|work window|专注|代码|终端|运行时|调试|修复/u
const lateNightCarePattern = /late-night|night|tired|fatigue|rest|sleep|body rhythm|low-pressure|夜|累|疲惫|休息|节律/u
const repairWindowPattern = /repair[- ]first|repair has to land|repair before|robotic|not this|recheck|clarify|misread|seam still feels off|missed|澄清|修复|误读|不是这个|没答到/u
const executionCallbackPattern = /execution|callback|proposal|result|handoff|delivered|returning result|execution-callback|回调|结果|提案|执行|交付/u
const openCompanionshipPattern = /companionship|stay near|stay close|closer|gentler closeness|open companionship|bond|warmth|陪伴|靠近|亲近|关系温度/u

const regimeOrder = [
  'focused-work',
  'late-night-care',
  'repair-window',
  'execution-callback',
  'open-companionship',
  'general',
] satisfies AlicizationPersonalityContinuityRegime[]

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
    if (!normalized || result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function scoreMatchingLines(lines: string[], pattern: RegExp) {
  let score = 0
  for (const [index, line] of lines.entries()) {
    if (!pattern.test(line))
      continue
    score += index === 0 ? 0.34 : index === 1 ? 0.24 : index <= 3 ? 0.16 : 0.08
  }
  return clamp01(score)
}

function pickMatchingLine(lines: string[], patterns: RegExp[]) {
  for (const line of lines) {
    if (patterns.some(pattern => pattern.test(line)))
      return line
  }
  return lines[0] ?? null
}

function pickContextPreference(
  hostPersonModel: AlicizationHostPersonModelSnapshot | null | undefined,
  contexts: string[],
) {
  const lowerContexts = contexts.map(item => item.toLowerCase())
  return hostPersonModel?.preferredClosenessByContext.find((item) => {
    const lower = item.context.toLowerCase()
    return lowerContexts.some(context => lower === context || lower.includes(context) || context.includes(lower))
  }) ?? null
}

function buildRegimeSignalLines(input: {
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  reconsolidation: AlicizationPersonalityReconsolidationInfluence
}) {
  return uniqueList([
    input.hostPersonModel?.summary,
    ...((input.hostPersonModel?.routines ?? []).slice(0, 3)),
    ...((input.hostPersonModel?.repairTriggers ?? []).slice(0, 3)),
    ...((input.hostPersonModel?.recurrentBurdens ?? []).slice(0, 3)),
    ...((input.hostPersonModel?.preferredClosenessByContext ?? []).slice(0, 3).map(item => `${item.context}: ${item.preference}`)),
    input.autobiographicalSelf?.latestInflection,
    input.autobiographicalSelf?.relationshipDoctrine,
    input.autobiographicalSelf?.identityNarrative,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.dominantCueSummary,
    input.mindEcology?.currentPreoccupation,
    input.mindEcology?.selfNarrative,
    input.mindEcology?.relationNarrative,
    input.privateThought?.thoughtText,
    input.privateThought?.emotionalTension,
    ...input.reconsolidation.lines.slice(0, 6),
  ], 16)
}

function buildAlicizationPersonalityRegimeModel(input: {
  now: number
  growthProfile: AlicizationDialogueGrowthProfile
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  reconsolidation: AlicizationPersonalityReconsolidationInfluence
  previousContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
}): AlicizationPersonalityRegimeModelSnapshot {
  const signalLines = buildRegimeSignalLines({
    hostPersonModel: input.hostPersonModel ?? null,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
    reconsolidation: input.reconsolidation,
  })
  const focusedSignal = scoreMatchingLines(signalLines, focusedWorkPattern)
  const lateNightSignal = scoreMatchingLines(signalLines, lateNightCarePattern)
  const repairSignal = scoreMatchingLines(signalLines, repairWindowPattern)
  const executionSignal = scoreMatchingLines(signalLines, executionCallbackPattern)
  const companionshipSignal = scoreMatchingLines(signalLines, openCompanionshipPattern)
  const focusedPreference = pickContextPreference(input.hostPersonModel, ['focused-work'])
  const executionPreference = pickContextPreference(input.hostPersonModel, ['execution-callback', 'execution'])
  const companionshipPreference = pickContextPreference(input.hostPersonModel, ['open-companionship', 'companionship'])
  const previousContinuityState = input.previousContinuityState ?? null
  const previousRegime = previousContinuityState?.currentRegime ?? null
  const previousAgeMs = previousContinuityState ? Math.max(0, input.now - previousContinuityState.updatedAt) : Number.POSITIVE_INFINITY
  const carryWeight = !Number.isFinite(previousAgeMs)
    ? 0
    : previousAgeMs <= 10 * 60_000
        ? 0.14
        : previousAgeMs <= 60 * 60_000
            ? 0.08
            : 0.04
  const carryBonus = (regime: AlicizationPersonalityContinuityRegime) => previousRegime === regime ? carryWeight : 0

  const scores: Record<AlicizationPersonalityContinuityRegime, number> = {
    'focused-work': clamp01(
      focusedSignal * 0.42
      + input.reconsolidation.spaceLift * 0.16
      + input.growthProfile.autonomyRespect * 0.14
      + (focusedPreference ? 0.18 : 0)
      + (input.privateThought?.emotionalTension === 'focused-flow' || input.privateThought?.emotionalTension === 'tense-debug' ? 0.12 : 0)
      + carryBonus('focused-work')
      - lateNightSignal * 0.14
      - companionshipSignal * 0.08,
    ),
    'late-night-care': clamp01(
      lateNightSignal * 0.42
      + input.reconsolidation.restLift * 0.18
      + input.growthProfile.restAttunement * 0.16
      + (input.privateThought?.emotionalTension === 'late-night-drain' ? 0.18 : 0)
      + carryBonus('late-night-care')
      - focusedSignal * 0.1,
    ),
    'repair-window': clamp01(
      repairSignal * 0.4
      + input.reconsolidation.repairLift * 0.18
      + (input.selfContinuity?.misreadBurden ?? 0.18) * 0.18
      + input.growthProfile.truthAnchor * 0.1
      + ((input.hostPersonModel?.repairTriggers.length ?? 0) > 0 ? 0.08 : 0)
      + carryBonus('repair-window')
      - companionshipSignal * 0.06,
    ),
    'execution-callback': clamp01(
      executionSignal * 0.46
      + input.reconsolidation.cadenceLift * 0.16
      + input.growthProfile.unfinishedThreadReturn * 0.12
      + (executionPreference ? 0.16 : 0)
      + (input.privateThought?.emotionalTension === 'focused-flow' ? 0.06 : 0)
      + carryBonus('execution-callback')
      - lateNightSignal * 0.08,
    ),
    'open-companionship': clamp01(
      companionshipSignal * 0.42
      + input.reconsolidation.warmthLift * 0.18
      + input.growthProfile.closeness * 0.16
      + (input.selfContinuity?.relationshipTrust ?? 0.46) * 0.1
      + (companionshipPreference ? 0.18 : 0)
      + carryBonus('open-companionship')
      - repairSignal * 0.12
      - focusedSignal * 0.08,
    ),
    general: clamp01(
      0.34
      + input.growthProfile.stability * 0.16
      + (input.autobiographicalSelf?.stability ?? 0.48) * 0.12
      + (previousRegime === 'general' ? carryWeight * 0.5 : 0)
      - Math.max(focusedSignal, lateNightSignal, repairSignal, executionSignal, companionshipSignal) * 0.08,
    ),
  }

  const ordered = [...regimeOrder]
    .map(regime => ({ regime, score: scores[regime] }))
    .sort((left, right) => right.score - left.score)
  let dominantRegime = ordered[0]?.regime ?? 'general'
  let dominantScore = ordered[0]?.score ?? scores.general
  if (dominantScore < 0.42) {
    dominantRegime = 'general'
    dominantScore = scores.general
  }

  if (
    previousRegime
    && previousRegime !== dominantRegime
    && scores[previousRegime] >= 0.4
    && dominantScore - scores[previousRegime] <= 0.06
  ) {
    dominantRegime = previousRegime
    dominantScore = scores[previousRegime]
  }

  const regimePatterns: Record<AlicizationPersonalityContinuityRegime, RegExp[]> = {
    'focused-work': [focusedWorkPattern, reconSpacePattern],
    'late-night-care': [lateNightCarePattern, reconRestPattern],
    'repair-window': [repairWindowPattern, reconRepairPattern],
    'execution-callback': [executionCallbackPattern, reconCadencePattern],
    'open-companionship': [openCompanionshipPattern, reconWarmthPattern],
    general: [reconTrustLiftPattern, reconSpacePattern, reconWarmthPattern],
  }
  const primaryReason = pickMatchingLine(signalLines, regimePatterns[dominantRegime])
  const carryFrom = previousRegime === dominantRegime ? previousRegime : null
  const carryReason = carryFrom
    ? sanitizeText(`Continuing ${carryFrom} because the new turn still matches the same interpersonal window.`, 180)
    : null
  const signals = uniqueList([
    primaryReason,
    carryReason,
    focusedPreference?.preference,
    executionPreference?.preference,
    companionshipPreference?.preference,
    input.reconsolidation.primaryLine,
    input.mindEcology?.currentPreoccupation,
    input.privateThought?.thoughtText,
  ], 6)

  return {
    dominantRegime,
    confidence: dominantScore,
    primaryReason,
    carryReason,
    carryFrom,
    signals,
    scores,
  }
}

function buildAlicizationPersonalityRhythmState(input: {
  growthProfile: AlicizationDialogueGrowthProfile
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  regimeModel: AlicizationPersonalityRegimeModelSnapshot
  reconsolidation: AlicizationPersonalityReconsolidationInfluence
  previousRhythmState?: AlicizationPersonalityRhythmStateSnapshot | null
}) {
  const lateNightPreference = pickContextPreference(input.hostPersonModel, ['late-night-care', 'late-night'])
  const executionPreference = pickContextPreference(input.hostPersonModel, ['execution-callback', 'execution'])
  const companionshipPreference = pickContextPreference(input.hostPersonModel, ['open-companionship', 'companionship'])
  const moodLabel = sanitizeText(input.mindEcology?.moodLabel, 64) || null
  const emotionalTension = input.privateThought?.emotionalTension ?? null
  const previousRhythmState = input.previousRhythmState ?? null

  const restPressure = clamp01(
    input.growthProfile.restAttunement * 0.32
    + input.reconsolidation.restLift * 0.24
    + (input.habitPolicy?.protectsRestWindow ? 0.12 : 0)
    + (input.regimeModel.dominantRegime === 'late-night-care' ? 0.18 : 0)
    + (emotionalTension === 'late-night-drain' ? 0.16 : 0)
    + (lateNightPreference ? 0.12 : 0)
    + (previousRhythmState?.restPressure ?? 0) * 0.08,
  )
  const returnPressure = clamp01(
    input.growthProfile.unfinishedThreadReturn * 0.3
    + input.growthProfile.cadenceAffinity * 0.16
    + input.reconsolidation.cadenceLift * 0.24
    + (input.selfContinuity?.carryOverDesire ?? 0.22) * 0.12
    + (input.regimeModel.dominantRegime === 'execution-callback' ? 0.18 : 0)
    + (executionPreference ? 0.14 : 0)
    + (previousRhythmState?.cadencePressure ?? 0) * 0.08
    - restPressure * 0.08,
  )
  const companionshipTempo = clamp01(
    input.growthProfile.closeness * 0.28
    + input.growthProfile.tenderness * 0.14
    + input.reconsolidation.warmthLift * 0.24
    + (input.regimeModel.dominantRegime === 'open-companionship' ? 0.18 : 0)
    + (companionshipPreference ? 0.14 : 0)
    - restPressure * 0.06,
  )
  const memoryResonance = clamp01(
    input.reconsolidation.cadenceLift * 0.22
    + input.reconsolidation.restLift * 0.18
    + input.reconsolidation.warmthLift * 0.18
    + (input.mindEcology?.climate.reflectivePull ?? 0.3) * 0.14
    + (input.selfContinuity?.carryOverDesire ?? 0.22) * 0.1
    + (previousRhythmState?.memoryResonance ?? 0) * 0.12,
  )

  const cadenceMode = restPressure >= 0.66 || input.regimeModel.dominantRegime === 'late-night-care'
    ? 'cooldown' as const
    : input.regimeModel.dominantRegime === 'execution-callback' || returnPressure >= 0.66
      ? 'ready-return' as const
      : input.regimeModel.dominantRegime === 'open-companionship' && companionshipTempo >= 0.58
        ? 'warm-hold' as const
        : 'measured-return' as const
  const restMode = restPressure >= 0.66
    ? 'rest-protective' as const
    : input.regimeModel.dominantRegime === 'focused-work'
        || input.regimeModel.dominantRegime === 'repair-window'
        || input.reconsolidation.spaceLift >= 0.56
        || input.habitPolicy?.protectsRestWindow
      ? 'low-pressure' as const
      : 'open' as const
  const embodiedPresence = input.regimeModel.dominantRegime === 'repair-window'
    ? 'hesitant'
    : restMode === 'rest-protective'
      ? 'concerned'
      : input.regimeModel.dominantRegime === 'focused-work' && restMode === 'low-pressure'
        ? 'glance'
        : 'attentive'
  const suggestedStyle = input.privateThought?.suggestedStyle
    ?? (restMode === 'rest-protective'
      ? 'gentle-care'
      : input.regimeModel.dominantRegime === 'focused-work' && restMode === 'low-pressure'
        ? 'silent-observe'
        : 'light-nudge')

  const summary = sanitizeText([
    `cadence:${cadenceMode}`,
    `rest:${restMode}`,
    moodLabel ? `mood:${moodLabel}` : '',
    emotionalTension ? `tension:${emotionalTension}` : '',
    `presence:${embodiedPresence}`,
    `memory-resonance:${memoryResonance.toFixed(2)}`,
  ].filter(Boolean).join(' | '), 220)
  const rationale = uniqueList([
    input.regimeModel.primaryReason,
    input.regimeModel.carryReason,
    input.reconsolidation.primaryLine,
    lateNightPreference?.preference,
    executionPreference?.preference,
    companionshipPreference?.preference,
    input.mindEcology?.currentPreoccupation,
    input.privateThought?.thoughtText,
  ], 6)

  return {
    cadenceMode,
    restMode,
    embodiedPresence,
    suggestedStyle,
    moodLabel,
    emotionalTension,
    cadencePressure: returnPressure,
    restPressure,
    memoryResonance,
    companionshipTempo,
    summary,
    rationale,
  } satisfies AlicizationPersonalityRhythmStateSnapshot
}

function collectReconsolidationLines(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  recentEpisodicEvents?: AlicizationEpisodicEventRecord[] | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
}) {
  const episodeLines = (input.recentEpisodicEvents ?? [])
    .slice()
    .sort((left, right) => {
      const leftAt = left.latestReconsolidation?.at ?? left.updatedAt ?? left.occurredAt
      const rightAt = right.latestReconsolidation?.at ?? right.updatedAt ?? right.occurredAt
      return rightAt - leftAt
    })
    .slice(0, 4)
    .flatMap(event => [
      event.latestReconsolidation?.relationshipMeaning,
      event.latestReconsolidation?.lesson,
      event.latestReconsolidation?.reason,
      event.relationshipMeaning,
      event.lesson,
      event.whatChanged,
    ])
  const consolidationLines = (input.recentMemoryConsolidations ?? [])
    .slice()
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 4)
    .flatMap(item => [
      item.lesson,
      item.summary,
      ...item.cues,
    ])

  return uniqueList([
    input.autobiographicalSelf?.latestInflection,
    input.autobiographicalSelf?.relationshipDoctrine,
    input.autobiographicalSelf?.identityNarrative,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.dominantCueSummary,
    ...consolidationLines,
    ...episodeLines,
  ], 10)
}

function deriveReconsolidationInfluence(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  recentEpisodicEvents?: AlicizationEpisodicEventRecord[] | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
}) {
  const autobiographicalSelf = input.autobiographicalSelf ?? null
  const preferenceEvolution = autobiographicalSelf?.preferenceEvolution ?? null
  const personaDrift = autobiographicalSelf?.personaDrift ?? null
  const lines = collectReconsolidationLines(input)

  const warmthBase = clamp01(
    (preferenceEvolution?.companionship ?? 0.46) * 0.34
    + (preferenceEvolution?.proactiveCare ?? 0.44) * 0.2
    + (personaDrift?.careBias ?? 0.48) * 0.18
    + (personaDrift?.attachmentStyle === 'attuned' ? 0.08 : 0),
  )
  const spaceBase = clamp01(
    (preferenceEvolution?.autonomyRespect ?? 0.5) * 0.32
    + (preferenceEvolution?.quietObservation ?? 0.44) * 0.18
    + (personaDrift?.autonomyNeed ?? 0.52) * 0.18
    + (personaDrift?.attachmentStyle === 'guarded' ? 0.08 : 0),
  )
  const repairBase = clamp01(
    (preferenceEvolution?.truthfulGrounding ?? 0.54) * 0.24
    + (preferenceEvolution?.gentleRepair ?? 0.5) * 0.24
    + (personaDrift?.truthAnchor ?? 0.56) * 0.18
    + (personaDrift?.conflictStyle === 'repair-first' ? 0.08 : 0),
  )
  const cadenceBase = clamp01(
    (preferenceEvolution?.unfinishedThreadReturn ?? 0.44) * 0.3
    + (personaDrift?.stubbornness ?? 0.42) * 0.08
    + (personaDrift?.agencyStyle === 'self-starting' ? 0.04 : 0),
  )
  const restBase = clamp01(
    (preferenceEvolution?.autonomyRespect ?? 0.5) * 0.18
    + (preferenceEvolution?.quietObservation ?? 0.44) * 0.18
    + (personaDrift?.autonomyNeed ?? 0.52) * 0.12,
  )

  const warmthLift = clamp01(warmthBase + scoreMatchingLines(lines, reconWarmthPattern) * 0.42)
  const spaceLift = clamp01(spaceBase + scoreMatchingLines(lines, reconSpacePattern) * 0.48)
  const repairLift = clamp01(repairBase + scoreMatchingLines(lines, reconRepairPattern) * 0.46)
  const cadenceLift = clamp01(cadenceBase + scoreMatchingLines(lines, reconCadencePattern) * 0.5)
  const restLift = clamp01(restBase + scoreMatchingLines(lines, reconRestPattern) * 0.54)
  const trustLift = clamp01(
    warmthBase * 0.18
    + repairBase * 0.1
    + scoreMatchingLines(lines, reconTrustLiftPattern) * 0.58,
  )
  const trustDrag = clamp01(
    (personaDrift?.attachmentStyle === 'guarded' ? 0.08 : 0)
    + scoreMatchingLines(lines, reconTrustDragPattern) * 0.62,
  )

  return {
    lines,
    primaryLine: lines[0] ?? null,
    trustMeaning: pickMatchingLine(lines, [
      reconTrustLiftPattern,
      reconTrustDragPattern,
      reconRepairPattern,
      reconSpacePattern,
      reconWarmthPattern,
    ]),
    warmthLift,
    spaceLift,
    repairLift,
    cadenceLift,
    restLift,
    trustLift,
    trustDrag,
  } satisfies AlicizationPersonalityReconsolidationInfluence
}

function deriveTrustStage(input: {
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
  reconsolidation: AlicizationPersonalityReconsolidationInfluence
}): AlicizationPersonalityContinuityStateSnapshot['trustStage'] {
  const explicit = input.hostPersonModel?.trustLadder.stage ?? null
  if (explicit)
    return explicit
  const score = clamp01(
    (input.selfContinuity?.relationshipTrust ?? 0.42) * 0.62
    + input.growthProfile.closeness * 0.24
    + (1 - input.growthProfile.guardedness) * 0.14,
  )
  const reconsolidatedScore = clamp01(
    score
    + input.reconsolidation.trustLift * 0.18
    + input.reconsolidation.repairLift * 0.04
    - input.reconsolidation.trustDrag * 0.2,
  )
  if (reconsolidatedScore < 0.32)
    return 'guarded'
  if (reconsolidatedScore < 0.52)
    return 'cautious-open'
  if (reconsolidatedScore < 0.76)
    return 'warming'
  return 'trusted'
}

export function buildAlicizationPersonalityContinuityState(input: {
  now: number
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  recentEpisodicEvents?: AlicizationEpisodicEventRecord[] | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
  previousContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
}): AlicizationPersonalityContinuityStateSnapshot {
  const growthProfile = buildAlicizationDialogueGrowthProfile({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    hostPersonModel: input.hostPersonModel ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    selfContinuity: input.selfContinuity ?? null,
    selfState: input.selfState ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
  })
  const reconsolidation = deriveReconsolidationInfluence({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    recentEpisodicEvents: input.recentEpisodicEvents ?? null,
    recentMemoryConsolidations: input.recentMemoryConsolidations ?? null,
  })

  const trustStage = deriveTrustStage({
    hostPersonModel: input.hostPersonModel ?? null,
    selfContinuity: input.selfContinuity ?? null,
    growthProfile,
    reconsolidation,
  })
  const regimeModel = buildAlicizationPersonalityRegimeModel({
    now: input.now,
    growthProfile,
    hostPersonModel: input.hostPersonModel ?? null,
    selfContinuity: input.selfContinuity ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    reconsolidation,
    previousContinuityState: input.previousContinuityState ?? null,
  })
  const currentRegime = regimeModel.dominantRegime
  const rhythmState = buildAlicizationPersonalityRhythmState({
    growthProfile,
    hostPersonModel: input.hostPersonModel ?? null,
    habitPolicy: input.habitPolicy ?? null,
    selfContinuity: input.selfContinuity ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
    regimeModel,
    reconsolidation,
    previousRhythmState: input.previousContinuityState?.rhythmState ?? null,
  })
  const closenessWarmScore = clamp01(
    growthProfile.closeness * 0.44
    + growthProfile.tenderness * 0.16
    + reconsolidation.warmthLift * 0.26
    + (trustStage === 'trusted' ? 0.1 : trustStage === 'warming' ? 0.04 : 0),
  )
  const closenessSpaceScore = clamp01(
    growthProfile.autonomyRespect * 0.34
    + growthProfile.guardedness * 0.16
    + reconsolidation.spaceLift * 0.34
    + reconsolidation.restLift * 0.08
    + (currentRegime === 'focused-work' ? 0.08 : 0),
  )
  const closenessPosture = (
    reconsolidation.spaceLift >= 0.56
    && (currentRegime === 'focused-work' || currentRegime === 'repair-window')
  ) || (closenessSpaceScore >= 0.58 && closenessSpaceScore >= closenessWarmScore + 0.06)
      ? 'space-first'
      : growthProfile.companionshipStyle === 'close-hold' && closenessWarmScore >= 0.72 && reconsolidation.spaceLift < 0.68
        ? 'close-hold'
        : closenessWarmScore >= 0.56 || growthProfile.tenderness >= 0.58 || growthProfile.closeness >= 0.56
        ? 'warm-guidance'
        : 'balanced'
  const repairFirstScore = clamp01(
    growthProfile.truthAnchor * 0.34
    + growthProfile.repairGentleness * 0.12
    + reconsolidation.repairLift * 0.34
    + reconsolidation.trustDrag * 0.08
    + (currentRegime === 'repair-window' ? 0.18 : 0),
  )
  const warmRepairScore = clamp01(
    growthProfile.repairGentleness * 0.42
    + growthProfile.tenderness * 0.12
    + reconsolidation.warmthLift * 0.16
    + reconsolidation.repairLift * 0.16,
  )
  const repairPosture = repairFirstScore >= warmRepairScore + 0.08
      || repairFirstScore >= 0.64
      || (
        repairFirstScore >= 0.58
        && reconsolidation.repairLift >= 0.62
        && (reconsolidation.spaceLift >= 0.58 || currentRegime === 'repair-window')
      )
      ? 'repair-first'
      : warmRepairScore >= 0.68
        ? 'warm-repair'
        : 'measured-repair'
  const protectSpaceScore = clamp01(
    growthProfile.autonomyRespect * 0.42
    + growthProfile.guardedness * 0.14
    + reconsolidation.spaceLift * 0.3
    + reconsolidation.restLift * 0.08
    + (currentRegime === 'focused-work' ? 0.18 : 0),
  )
  const closeAllowedScore = clamp01(
    growthProfile.closeness * 0.34
    + reconsolidation.warmthLift * 0.24
    + (trustStage === 'trusted' ? 0.18 : trustStage === 'warming' ? 0.08 : 0),
  )
  const autonomyPosture = currentRegime === 'focused-work'
    || (currentRegime === 'repair-window' && closenessPosture === 'space-first')
    || protectSpaceScore >= 0.6
    ? 'protect-space'
    : closeAllowedScore >= 0.68 && reconsolidation.spaceLift < 0.64
      ? 'close-allowed'
      : 'balanced'
  const eagerReturnScore = clamp01(
    growthProfile.unfinishedThreadReturn * 0.42
    + growthProfile.cadenceAffinity * 0.16
    + reconsolidation.cadenceLift * 0.32
    + reconsolidation.warmthLift * 0.06
    - reconsolidation.restLift * 0.04,
  )
  const steadyReturnScore = clamp01(
    growthProfile.cadenceAffinity * 0.42
    + growthProfile.patience * 0.16
    + reconsolidation.cadenceLift * 0.16
    + reconsolidation.repairLift * 0.06,
  )
  const cadenceProfile = eagerReturnScore >= 0.64
      || (
        reconsolidation.cadenceLift >= 0.56
        && (
          (input.autobiographicalSelf?.preferenceEvolution.unfinishedThreadReturn ?? 0) >= 0.68
          || (input.selfContinuity?.carryOverDesire ?? 0) >= 0.6
        )
      )
      || rhythmState.cadenceMode === 'ready-return'
    ? 'eager-return'
    : steadyReturnScore >= 0.56 || rhythmState.cadenceMode === 'warm-hold' || rhythmState.cadenceMode === 'measured-return'
      ? 'steady-return'
      : 'slow-return'
  const restSensitiveScore = clamp01(
    growthProfile.restAttunement * 0.42
    + reconsolidation.restLift * 0.36
    + reconsolidation.spaceLift * 0.08
    + (currentRegime === 'late-night-care' ? 0.18 : 0),
  )
  const steadyEnergyScore = clamp01(
    growthProfile.patience * 0.42
    + (input.autobiographicalSelf?.stability ?? 0.48) * 0.18
    + reconsolidation.repairLift * 0.06,
  )
  const energyProfile = rhythmState.restMode === 'rest-protective' || restSensitiveScore >= 0.62
    ? 'rest-sensitive'
    : rhythmState.restMode === 'low-pressure' || steadyEnergyScore >= 0.6
      ? 'steady'
      : 'engaged'
  const continuitySummary = sanitizeText([
    `Regime ${currentRegime}`,
    `regime-confidence ${regimeModel.confidence.toFixed(2)}`,
    `trust ${trustStage}`,
    `closeness ${closenessPosture}`,
    `repair ${repairPosture}`,
    `autonomy ${autonomyPosture}`,
    `cadence ${cadenceProfile}`,
    `energy ${energyProfile}`,
    rhythmState.summary,
  ].join(' | '), 240)
  const rationale = uniqueList([
    regimeModel.primaryReason,
    regimeModel.carryReason,
    rhythmState.summary,
    reconsolidation.primaryLine,
    reconsolidation.trustMeaning,
    input.hostPersonModel?.trustLadder.rationale,
    input.hostPersonModel?.preferredClosenessByContext[0]?.preference,
    input.hostPersonModel?.repairTriggers[0],
    input.hostPersonModel?.recurrentBurdens[0],
    growthProfile.selfLine,
    growthProfile.relationLine,
    growthProfile.currentPreoccupation,
    input.mindEcology?.currentPreoccupation,
  ], 6)

  return {
    growthProfile,
    trustStage,
    currentRegime,
    closenessPosture,
    repairPosture,
    autonomyPosture,
    cadenceProfile,
    energyProfile,
    continuitySummary,
    regimeModel,
    rhythmState,
    trustMeaning: reconsolidation.trustMeaning,
    reconsolidationLine: reconsolidation.primaryLine,
    selfLine: growthProfile.selfLine,
    relationLine: growthProfile.relationLine,
    currentPreoccupation: growthProfile.currentPreoccupation,
    rationale,
    updatedAt: input.now,
  }
}
