import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryFact,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationRelationshipOutcomeRecord,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'

import {
  formatAlicizationMemoryProvenanceLabel,
  mapAlicizationFragmentSourceKindToProvenance,
  mapAlicizationMemorySourceToProvenance,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'

const dayMs = 24 * 60 * 60 * 1000

const focusedContextPattern = /focused|focus|debug|coding|cursor|terminal|runtime|工作|写代码|调试/iu
const openContextPattern = /open|warming|聊天|陪|一起|靠近|轻松|放松/iu
const lateNightPattern = /late[- ]?night|drain|夜|熬夜|很晚|疲惫|累/iu
const executionContextPattern = /execution|result|proposal|callback|cli|codex|claude|task|执行|结果|提案|回调/iu
const executionProcedureLessonPattern = /blocked before dispatch|blocked-before-dispatch|confirmation required|explicit confirmation|explicit consent|needs-affirmation|waited for host affirmation|permission=|safety gate|resumable safety lesson|resume boundary|procedure lesson|remembered procedure|bounded execution consent|执行边界|确认后再执行|先别直接动/u
const executionBoundaryHoldPattern = /blocked before dispatch|blocked-before-dispatch|explicit confirmation|explicit consent|confirmation required|permission=|safety gate|bounded execution consent|confirm before redispatch|waited for host affirmation|needs-affirmation|确认前|明确确认|先别直接动|执行边界|先把边界守住/u
const intrusivePattern = /intrusive|heavy|pressure|挤|黏|压迫|太近|太重|打扰/iu
const roboticPattern = /robotic|template|system|模板|机械|机器人|系统口气/iu
const repairPattern = /repair|clarify|recheck|not this|missed|澄清|修复|重说|不是这个|没答到/iu
const routinePattern = /habit|routine|always|usually|often|习惯|经常|总是|会在|晚点|深夜/iu
const burdenPattern = /burden|tired|busy|drained|interrupt|压力|累|忙|打断|疲惫|不想被催/iu
const closenessPattern = /warm|gentle|care|companionship|陪|温和|柔和|陪伴|靠近/iu
const spacePattern = /space|boundary|lighter|light touch|quiet|room|边界|空间|轻一点|安静|留白/iu
const positiveMemoryPolarityPattern = /trust up|closer|lighter|gentle|useful|accepted|received|repair|soft|safe|靠近|变轻|被接住|有用|接受|修复|更稳/u
const negativeMemoryPolarityPattern = /trust down|intrusive|doubted|denied|pressure|heavy|failed|robotic|not this|boundary|down|拒绝|怀疑|压迫|打扰|失败|机械|不是这个|边界/u
const humanlikeFixedTemplateReplacement = 'relationship_continuity=present; source_template=excluded; visibility=memory_structured'
const sameHerContinuityPattern = /same[- ]?her|same[- ]?person|continuity line|one continuous|continuous digital life|project_anchor=phase1_local_digital_life|tool shell|generic shell|generic task|断线|工具壳|连续性|同一条线|持续的人|持续人格|数字生命/u
const unfinishedLoopPattern = /unfinished|partial|open loop|not complete|closure|没收完|未完成|闭环|还缺|继续推进/u
const embodimentStatePattern = /embodiment|body|face|gaze|blink|voice|pause|lipsync|motion|身体|表情|视线|眨眼|声音|停顿|动作/u
const progressPressurePattern = /pressing for progress|pushing progress|progress pressure|催进度|催状态|尽快|推进|推进完|收住|收完/u
const statusRecapPressurePattern = /status recap|status report|generic recap|generic status recap|concise status (?:update|recap|report)/u
const progressPressureNegationPattern = /not (?:a )?pure progress request|not applying progress pressure|not progress pressure|not\s*催进度|not\s*催状态|不是在?催进度|不是在?催状态/u
const statusRecapNegationPattern = /not asking for (?:a )?(?:raw |generic |pure )?status (?:recap|report)|not (?:a )?(?:raw |generic )?status (?:recap|report)|not a status report|not a generic status recap|not (?:a )?generic recap|not [^.。!！?？]{0,80}generic recap|not to turn .*?(?:generic )?status (?:recap|report)|not to turn .*?generic recap|instead of a status report|rather than (?:asking for )?(?:a )?(?:generic |raw )?recap|rather than (?:a )?status report|cares less about (?:a )?(?:raw |generic )?status (?:recap|report)|不是状态汇报|不是要状态汇报/u
const continuityWorryPattern = /worr|anxious|afraid|drift|split|断线|工具壳|tool shell|generic shell|滑成|别变成/u
const samePersonTestPattern = /testing|test|confirm|确认|确认她是不是|是不是连续性|是不是持续的人|same[- ]?person|same[- ]?her|one continuous digital life|不是状态汇报|not a status report|generic recap/u
const tentativeRecallPattern = /may|might|perhaps|seems|seem|uncertain|not sure|似乎|可能|也许|不完全确定/u
const tentativeContinuityWorryPattern = /(?:may|might)\s+(?:drift|split|become|turn into)|担心.*(?:断线|滑成|工具壳)|worr(?:ied|y).*(?:drift|split|tool shell|generic shell)/u
const tentativeMemoryMeaningPattern = /(?:may|might|perhaps|seems|seem|uncertain|not sure).*(?:have been|be more about|more right|still settling|older|newer|recap|status|meaning)|似乎.*(?:更倾向于|不是|不只是|状态|意义)|不完全确定|可能.*(?:状态|意义|理解)/u
const vulnerableHostStatePattern = /vulnerable|fragile|overloaded|overwhelmed|hurt|sad|stressed|tired|drained|exhausted|撑不住|受伤|委屈|难受|伤心|难过|低落|压力|紧绷|疲惫|累/u
const gentleCareMemoryPattern = /protective|care-attentive|gentler? presence|lighter companionship|low-pressure|lower-pressure|rest-protective|轻一点|先陪|陪着|留白|不要分析太多|不把距离一下子拉近|do not rush closeness/u
const analysisHeavyCarePattern = /analysis-heavy|analysis heavy|analytical|analysis-first|explain the problem|direct(?:ly)?|move closer quickly|closer quickly|rush closeness|too close|over-close|extra pressure|马上分析|先分析|分析太多|一下子拉近|太近/u

type AlicizationHostPersonClosenessPreference = AlicizationHostPersonModelSnapshot['preferredClosenessByContext'][number]

export type AlicizationHumanlikeMemorySourceChannel
  = | 'dialogue'
    | 'execution'
    | 'initiative'
    | 'host-emotion'
    | 'self-emotion'
    | 'embodiment'
    | 'affective-residue'

export type AlicizationHumanlikeMemoryRecallStrength
  = | 'lightly-noticed'
    | 'strongly-moved'
    | 'cautious-avoidance'

export type AlicizationHumanlikeRelationshipPrimaryIntent
  = | 'ordinary-relationship'
    | 'progress-pressure'
    | 'continuity-worry'
    | 'same-person-test'
    | 'mixed'

type AlicizationProjectPreferredVoiceMode = 'lower-pressure' | 'even'
type AlicizationProjectPreferredPacingMode = 'slower' | 'natural'
type AlicizationProjectPreferredPauseMode = 'longer' | 'natural'
type AlicizationProjectPreferredLipsyncMode = 'restrained' | 'matched'

export interface AlicizationHumanlikeMemoryPriorMemory {
  id: string
  summary: string
  confidence?: number | null
  polarity?: string | null
  salience?: number | null
  lastUpdatedAt?: number | null
}

export interface AlicizationHumanlikeMemoryHostCorrection {
  candidateId?: string | null
  field?: string | null
  previousValue?: string | null
  correctedValue?: string | null
  reason?: string | null
  createdAt?: number | null
}

export interface AlicizationHumanlikeMemoryCandidateInput {
  now: number
  turnId: string
  sessionId?: string | null
  dialogue?: {
    userText?: string | null
    assistantText?: string | null
  } | null
  execution?: {
    summary?: string | null
    status?: 'completed' | 'partial' | 'blocked' | 'failed' | string | null
  } | null
  hostEmotion?: {
    label?: string | null
    summary?: string | null
    intensity?: number | null
  } | null
  selfEmotion?: {
    label?: string | null
    summary?: string | null
    intensity?: number | null
  } | null
  embodiment?: {
    summary?: string | null
    recallStrength?: AlicizationHumanlikeMemoryRecallStrength | null
    modalityConsistency?: 'consistent' | 'contradictory' | 'unknown' | string | null
    residentState?: {
      facialCue?: string | null
      actionCue?: string | null
      mode?: string | null
      reason?: string | null
    } | null
  } | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  relationship?: {
    summary?: string | null
    threadAnchor?: string | null
  } | null
  priorMemories?: AlicizationHumanlikeMemoryPriorMemory[]
  hostCorrections?: AlicizationHumanlikeMemoryHostCorrection[]
  initiative?: {
    outcome?: 'accepted' | 'ignored' | 'rejected' | 'continue-progress' | string | null
    userReaction?: 'accepted' | 'ignored' | 'rejected' | 'continued' | string | null
  } | null
  autobiographical?: {
    currentEra?: string | null
    lesson?: string | null
  } | null
  initiativeStrategyCarry?: string | null
  projectStatePreferredVoiceMode?: string | null
  projectStatePreferredPacingMode?: string | null
  projectStatePreferredPauseMode?: string | null
  projectStatePreferredLipsyncMode?: string | null
}

export interface AlicizationHumanlikeMemoryCandidate {
  id: string
  turnId: string
  sessionId: string | null
  createdAt: number
  sourceChannels: AlicizationHumanlikeMemorySourceChannel[]
  evidence: string[]
  relationshipContext: {
    threadAnchor: string
    summary: string
    evidence: string[]
    primaryIntent: AlicizationHumanlikeRelationshipPrimaryIntent
    signals: string[]
    containsProgressPressure: boolean
    containsContinuityWorry: boolean
    containsSamePersonTest: boolean
    hostCorrectionApplied: boolean
  }
  longTermWorthiness: {
    shouldPersist: boolean
    score: number
    reasons: string[]
  }
  emotionalResidue: {
    tags: string[]
    intensity: number
    trace: string[]
  }
  emotionKernelInfluence: {
    dominantTilt: 'repair-protective' | 'rest-protective' | 'unfinished-attentive' | 'warm-stable' | 'neutral'
    toneGuidance: string
    initiativePressure: 'none' | 'low' | 'medium'
    bodyState: string
    trace: string[]
  }
  initiativeOpportunity: {
    kind: 'low-pressure-follow-up' | 'remember-without-prompt' | 'no-initiative'
    suggestedWindow: string
    pressure: 'none' | 'low' | 'medium'
    antiSpamReason: string
    visibleLine: string
  }
  initiativeOutcomeRecord: {
    outcome: string
    userReaction: string
    strategyUpdate: string
    recordedAt: number
  } | null
  embodimentTrace: {
    summary: string
    recallStrength: AlicizationHumanlikeMemoryRecallStrength
    expressionState: {
      face: string
      gaze: string
      blink: string
      voice: string
      pause: string
      lipsync: string
      pacing: string
    }
    residentState: {
      facialCue: string
      actionCue: string
      mode: string
      reason: string
    }
    modalityContradictionRisk: 'low' | 'medium' | 'high'
    consistencyReason: string
  }
  autobiographicalImpact: {
    era: string
    selfNarrativeDelta: string
    stablePreferenceHint: string
  }
  metabolism: {
    revisionEvents: Array<{
      kind: 'revision'
      conflictingMemoryIds: string[]
      reason: string
    }>
    forgettingPolicy: {
      downrankMemoryIds: string[]
      mergeMemoryIds: string[]
      forgetMemoryIds: string[]
      reasons: string[]
    }
  }
  auditTrail: {
    whyRemember: string
    confidence: number
    sourceEvidence: string[]
    correctionSurface: {
      userCorrectableFields: string[]
      explanation: string
    }
  }
  recallPosture: {
    certainty: 'steady' | 'tentative' | 'corrected'
    reason: string
  }
  naturalRecallLine: string
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

export function sanitizeHumanlikeMemoryText(raw: unknown, maxChars = 180) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, humanlikeFixedTemplateReplacement)
}

export function normalizeHumanlikeSentenceEnding(raw: unknown, maxChars = 180) {
  const normalized = sanitizeHumanlikeMemoryText(raw, maxChars).replace(/[.。!！?？;；:：]+$/u, '').trim()
  if (!normalized)
    return ''
  return `${normalized}${/[\u3400-\u9FFF]/u.test(normalized) ? '。' : '.'}`
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeHumanlikeMemoryText(value)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function lowerHumanlikeMemoryText(...values: Array<string | null | undefined>) {
  return values.map(value => sanitizeHumanlikeMemoryText(value, 320)).filter(Boolean).join(' ').toLowerCase()
}

function sanitizeProjectStatePreferredVoiceMode(raw: unknown): AlicizationProjectPreferredVoiceMode | null {
  const normalized = sanitizeHumanlikeMemoryText(raw, 32).toLowerCase()
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function sanitizeProjectStatePreferredPacingMode(raw: unknown): AlicizationProjectPreferredPacingMode | null {
  const normalized = sanitizeHumanlikeMemoryText(raw, 32).toLowerCase()
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function sanitizeProjectStatePreferredPauseMode(raw: unknown): AlicizationProjectPreferredPauseMode | null {
  const normalized = sanitizeHumanlikeMemoryText(raw, 32).toLowerCase()
  return normalized === 'longer' || normalized === 'natural'
    ? normalized
    : null
}

function sanitizeProjectStatePreferredLipsyncMode(raw: unknown): AlicizationProjectPreferredLipsyncMode | null {
  const normalized = sanitizeHumanlikeMemoryText(raw, 32).toLowerCase()
  return normalized === 'restrained' || normalized === 'matched'
    ? normalized
    : null
}

function buildHumanlikeProjectCadenceSummary(input: {
  preferredVoiceMode?: AlicizationProjectPreferredVoiceMode | null
  preferredPacingMode?: AlicizationProjectPreferredPacingMode | null
  preferredPauseMode?: AlicizationProjectPreferredPauseMode | null
  preferredLipsyncMode?: AlicizationProjectPreferredLipsyncMode | null
}) {
  return sanitizeHumanlikeMemoryText(uniqueTexts([
    input.preferredVoiceMode ? `${input.preferredVoiceMode} voice` : null,
    input.preferredPacingMode ? `${input.preferredPacingMode} pacing` : null,
    input.preferredPauseMode ? `${input.preferredPauseMode} pause` : null,
    input.preferredLipsyncMode ? `${input.preferredLipsyncMode} lipsync` : null,
  ], 4).join(', '), 128) || null
}

function resolveHumanlikeProjectCadenceCarry(input: {
  candidateInput: AlicizationHumanlikeMemoryCandidateInput
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
}) {
  const hasExplicitProjectCadenceInput
    = typeof input.candidateInput.projectStatePreferredVoiceMode === 'string'
      || typeof input.candidateInput.projectStatePreferredPacingMode === 'string'
      || typeof input.candidateInput.projectStatePreferredPauseMode === 'string'
      || typeof input.candidateInput.projectStatePreferredLipsyncMode === 'string'
  if (!hasExplicitProjectCadenceInput) {
    return {
      preferredVoiceMode: null,
      preferredPacingMode: null,
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      cadenceSummary: null,
      autobiographicalLine: null,
      stablePreferenceLine: null,
      naturalRecallLine: null,
    }
  }

  const continuityText = lowerHumanlikeMemoryText(
    input.relationshipContext.summary,
    ...input.relationshipContext.evidence,
    input.candidateInput.dialogue?.userText,
    input.candidateInput.dialogue?.assistantText,
    input.candidateInput.execution?.summary,
    input.candidateInput.autobiographical?.lesson,
    input.candidateInput.hostEmotion?.summary,
    input.candidateInput.selfEmotion?.summary,
  )
  const continuityCue
    = input.relationshipContext.containsContinuityWorry
      || input.relationshipContext.containsSamePersonTest
      || sameHerContinuityPattern.test(continuityText)
  const unfinishedSameThreadCue
    = unfinishedLoopPattern.test(continuityText)
      && (continuityCue || /same[- ]?thread|same line|same[- ]?her|same[- ]?person|continuity|living line|同一条线|连续性/u.test(continuityText))

  if (!continuityCue && !unfinishedSameThreadCue) {
    return {
      preferredVoiceMode: null,
      preferredPacingMode: null,
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      cadenceSummary: null,
      autobiographicalLine: null,
      stablePreferenceLine: null,
      naturalRecallLine: null,
    }
  }

  const fallback = resolveAlicizationProjectStateBrief()
  const preferredVoiceMode
    = sanitizeProjectStatePreferredVoiceMode(input.candidateInput.projectStatePreferredVoiceMode)
      ?? fallback.preferredVoiceMode
      ?? null
  const preferredPacingMode
    = sanitizeProjectStatePreferredPacingMode(input.candidateInput.projectStatePreferredPacingMode)
      ?? fallback.preferredPacingMode
      ?? null
  const preferredPauseMode
    = sanitizeProjectStatePreferredPauseMode(input.candidateInput.projectStatePreferredPauseMode)
      ?? fallback.preferredPauseMode
      ?? null
  const preferredLipsyncMode
    = sanitizeProjectStatePreferredLipsyncMode(input.candidateInput.projectStatePreferredLipsyncMode)
      ?? fallback.preferredLipsyncMode
      ?? null
  const cadenceSummary = buildHumanlikeProjectCadenceSummary({
    preferredVoiceMode,
    preferredPacingMode,
    preferredPauseMode,
    preferredLipsyncMode,
  })
  return {
    preferredVoiceMode,
    preferredPacingMode,
    preferredPauseMode,
    preferredLipsyncMode,
    cadenceSummary,
    autobiographicalLine: cadenceSummary
      ? `learned_return_cadence=${cadenceSummary}; restart_policy=context_preserving`
      : null,
    stablePreferenceLine: cadenceSummary
      ? `preferred_return_cadence=${cadenceSummary}`
      : null,
    naturalRecallLine: preferredVoiceMode || preferredPacingMode || preferredPauseMode || preferredLipsyncMode
      ? `return_cadence=voice:${preferredVoiceMode || 'unspecified'}; pacing:${preferredPacingMode || 'unspecified'}; pause:${preferredPauseMode || 'unspecified'}; lipsync:${preferredLipsyncMode || 'unspecified'}; avoid_status_recitation=true; visibility=memory_structured`
      : null,
  }
}

function splitHumanlikeMemoryTexts(...values: Array<string | null | undefined>) {
  return values.map(value => sanitizeHumanlikeMemoryText(value, 320)).filter(Boolean)
}

function hasTentativeMemoryMeaningLanguage(rawText: string, relationshipSummary: string) {
  const combined = sanitizeHumanlikeMemoryText(`${rawText} ${relationshipSummary}`, 640)
  if (!combined)
    return false
  if (tentativeMemoryMeaningPattern.test(combined))
    return true
  return tentativeRecallPattern.test(combined) && !tentativeContinuityWorryPattern.test(combined)
}

function pieceHasProgressPressure(text: string) {
  const normalized = sanitizeHumanlikeMemoryText(text, 320)
  if (!normalized)
    return false

  const explicitProgressPressure
    = progressPressurePattern.test(normalized)
      && !progressPressureNegationPattern.test(normalized)
  const statusRecapPressure
    = statusRecapPressurePattern.test(normalized)
      && !statusRecapNegationPattern.test(normalized)

  return explicitProgressPressure || statusRecapPressure
}

function asHumanlikeMemoryObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function stringListFromHumanlikeMemory(raw: unknown, maxItems = 12) {
  if (!Array.isArray(raw))
    return []
  return uniqueTexts(raw.filter((item): item is string => typeof item === 'string'), maxItems)
}

function numberFromHumanlikeMemory(raw: unknown, fallback = 0) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function extractHumanlikeKeyValue(text: string, key: string) {
  const match = new RegExp(`(?:^|\\s)${key}=([^\\s]+)`, 'iu').exec(text)
  return sanitizeHumanlikeMemoryText(match?.[1], 48)
}

function normalizeHumanlikeEmbodimentExpressionValue(
  key: 'face' | 'gaze' | 'blink' | 'voice' | 'pause' | 'lipsync' | 'pacing',
  raw: string,
) {
  const normalized = sanitizeHumanlikeMemoryText(raw, 48).toLowerCase()
  if (!normalized)
    return ''

  switch (key) {
    case 'face':
      if (/^steady(?:-s(?:o(?:ft?)?)?)?$/u.test(normalized))
        return 'steady-soft'
      if (/^neutral(?:-s(?:o(?:ft?)?)?)?$/u.test(normalized))
        return 'neutral-soft'
      return normalized
    case 'gaze':
      if (/^soft(?:en?)?$/u.test(normalized))
        return 'soft'
      if (/^st(?:a(?:b(?:le?)?)?|ead(?:y|ier)?)$/u.test(normalized))
        return 'stable'
      if (/^dr(?:i(?:ft?)?)?$/u.test(normalized))
        return 'drift'
      return normalized
    case 'blink':
      if (/^sl(?:o(?:w(?:er?)?)?)?$/u.test(normalized) || /^ling(?:er?)?$/u.test(normalized))
        return 'slower'
      if (/^nat(?:u(?:r(?:al?)?)?)?$/u.test(normalized))
        return 'natural'
      return normalized
    case 'voice':
      if (/^lower(?:-p(?:r(?:e(?:s(?:s(?:u(?:re?)?)?)?)?)?)?)?$/u.test(normalized))
        return 'lower-pressure'
      if (/^even$/u.test(normalized))
        return 'even'
      return normalized
    case 'pause':
      if (/^long(?:er?)?$/u.test(normalized))
        return 'longer'
      if (/^nat(?:u(?:r(?:al?)?)?)?$/u.test(normalized))
        return 'natural'
      return normalized
    case 'lipsync':
      if (/^restr(?:a(?:i(?:n(?:ed?)?)?)?)?$/u.test(normalized))
        return 'restrained'
      if (/^match(?:ed?)?$/u.test(normalized))
        return 'matched'
      return normalized
    case 'pacing':
      if (/^sl(?:o(?:w(?:er?)?)?)?$/u.test(normalized))
        return 'slower'
      if (/^nat(?:u(?:r(?:al?)?)?)?$/u.test(normalized))
        return 'natural'
      return normalized
  }
}

function normalizeHumanlikeResidentEmbodimentValue(raw: unknown, maxChars = 64) {
  return sanitizeHumanlikeMemoryText(raw, maxChars)
    .toLowerCase()
    .replace(/[.。!！?？;；:：,，]+$/u, '')
    .trim()
}

function extractHumanlikeResidentCueFromSummary(input: {
  rawSummary: string
  key: 'face' | 'action' | 'mode' | 'reason'
}) {
  const keyName = input.key === 'face'
    ? 'resident_face'
    : input.key === 'action'
      ? 'resident_action'
      : input.key === 'mode'
        ? 'resident_mode'
        : 'resident_reason'
  const structured = normalizeHumanlikeResidentEmbodimentValue(
    extractHumanlikeKeyValue(input.rawSummary, keyName),
    input.key === 'reason' ? 180 : 64,
  )
  if (structured)
    return structured

  const patterns = input.key === 'face'
    ? [/resident\s+face\s+(?:stayed|stay|stays|was|kept|keep|remained)\s+([^.|,;]+)/iu]
    : input.key === 'action'
      ? [/resident\s+(?:motion|action)\s+(?:stayed|stay|stays|was|kept|keep|remained)\s+([^.|,;]+)/iu]
      : input.key === 'mode'
        ? [/resident\s+mode\s+(?:stayed|stay|stays|was|kept|keep|remained)\s+([^.|,;]+)/iu]
        : [/resident\s+reason\s+(?:was|stayed|stay|kept|keep|remained)\s+([^.|;]+)/iu]

  for (const pattern of patterns) {
    const match = pattern.exec(input.rawSummary)
    const normalized = normalizeHumanlikeResidentEmbodimentValue(
      match?.[1],
      input.key === 'reason' ? 180 : 64,
    )
    if (normalized)
      return normalized
  }

  return ''
}

function buildHumanlikeMemoryCandidateId(input: AlicizationHumanlikeMemoryCandidateInput) {
  const stableSeed = sanitizeHumanlikeMemoryText(input.turnId || `${input.sessionId ?? 'session'}-${input.now}`, 96)
  return `humanlike-memory-candidate:${stableSeed || input.now}`
}

function collectHumanlikeMemorySourceChannels(input: AlicizationHumanlikeMemoryCandidateInput): AlicizationHumanlikeMemorySourceChannel[] {
  const channels: AlicizationHumanlikeMemorySourceChannel[] = []
  if (sanitizeHumanlikeMemoryText(input.dialogue?.userText) || sanitizeHumanlikeMemoryText(input.dialogue?.assistantText))
    channels.push('dialogue')
  if (sanitizeHumanlikeMemoryText(input.execution?.summary))
    channels.push('execution')
  if (
    sanitizeHumanlikeMemoryText(input.initiative?.outcome)
    || sanitizeHumanlikeMemoryText(input.initiative?.userReaction)
    || sanitizeHumanlikeMemoryText(input.initiativeStrategyCarry)
  ) {
    channels.push('initiative')
  }
  if (sanitizeHumanlikeMemoryText(input.hostEmotion?.label) || sanitizeHumanlikeMemoryText(input.hostEmotion?.summary))
    channels.push('host-emotion')
  if (sanitizeHumanlikeMemoryText(input.selfEmotion?.label) || sanitizeHumanlikeMemoryText(input.selfEmotion?.summary))
    channels.push('self-emotion')
  if (sanitizeHumanlikeMemoryText(input.embodiment?.summary))
    channels.push('embodiment')
  if (
    sanitizeHumanlikeMemoryText(input.affectiveResidue?.summary)
    || sanitizeHumanlikeMemoryText(input.affectiveResidue?.dominantResidueKind)
  ) {
    channels.push('affective-residue')
  }
  return channels
}

function buildHumanlikeMemoryEvidence(
  input: AlicizationHumanlikeMemoryCandidateInput,
  projectCadenceCarry?: ReturnType<typeof resolveHumanlikeProjectCadenceCarry> | null,
) {
  const initiativeOutcome = sanitizeHumanlikeMemoryText(input.initiative?.outcome, 80)
  const initiativeReaction = sanitizeHumanlikeMemoryText(input.initiative?.userReaction, 80)

  return uniqueTexts([
    input.dialogue?.userText ? `dialogue.user:${input.dialogue.userText}` : null,
    input.dialogue?.assistantText ? `dialogue.assistant:${input.dialogue.assistantText}` : null,
    input.relationship?.summary ? `relationship:${input.relationship.summary}` : null,
    input.autobiographical?.lesson || input.autobiographical?.currentEra
      ? `autobiographical:${[
        input.autobiographical?.currentEra,
        input.autobiographical?.lesson,
      ].filter(Boolean).join(' | ')}`
      : null,
    input.execution?.summary ? `execution.${input.execution.status ?? 'unknown'}:${input.execution.summary}` : null,
    input.hostEmotion?.summary ? `host-emotion.${input.hostEmotion.label ?? 'unknown'}:${input.hostEmotion.summary}` : null,
    input.selfEmotion?.summary ? `self-emotion.${input.selfEmotion.label ?? 'unknown'}:${input.selfEmotion.summary}` : null,
    input.embodiment?.summary ? `embodiment.${input.embodiment.recallStrength ?? 'lightly-noticed'}:${input.embodiment.summary}` : null,
    initiativeOutcome || initiativeReaction
      ? `initiative.${initiativeOutcome || 'unknown'}/${initiativeReaction || 'unknown'}:This reopening outcome should update future cadence memory instead of staying outside long-term memory formation.`
      : null,
    input.affectiveResidue
      ? `affective-residue:${[
        sanitizeHumanlikeMemoryText(input.affectiveResidue.dominantResidueKind, 48),
        input.affectiveResidue.relationshipCadence?.cadenceMode
          ? `cadence=${sanitizeHumanlikeMemoryText(input.affectiveResidue.relationshipCadence.cadenceMode, 48)}`
          : null,
        sanitizeHumanlikeMemoryText(input.affectiveResidue.summary, 160),
      ].filter(Boolean).join(' | ')}`
      : null,
    input.initiativeStrategyCarry ? `initiative-strategy-carry:${input.initiativeStrategyCarry}` : null,
    projectCadenceCarry?.cadenceSummary
      ? `project-cadence:${projectCadenceCarry.cadenceSummary.replace(/,\s*/gu, ' | ')}`
      : null,
    ...normalizeHumanlikeHostCorrections(input.hostCorrections).map(correction => `host-correction.${correction.field}:${correction.correctedValue}`),
  ], 12)
}

function normalizeHumanlikeHostCorrections(corrections: AlicizationHumanlikeMemoryHostCorrection[] | null | undefined) {
  return (corrections ?? [])
    .map(correction => ({
      candidateId: sanitizeHumanlikeMemoryText(correction.candidateId, 160),
      field: sanitizeHumanlikeMemoryText(correction.field, 80),
      previousValue: sanitizeHumanlikeMemoryText(correction.previousValue, 260),
      correctedValue: sanitizeHumanlikeMemoryText(correction.correctedValue, 420),
      reason: sanitizeHumanlikeMemoryText(correction.reason, 260),
      createdAt: Math.max(0, Math.floor(numberFromHumanlikeMemory(correction.createdAt, 0))),
    }))
    .filter(correction => correction.field && correction.correctedValue)
    .slice(0, 6)
}

function findLatestHumanlikeHostCorrection(
  corrections: ReturnType<typeof normalizeHumanlikeHostCorrections>,
  field: string,
) {
  return corrections.find(correction => correction.field === field)
}

function resolveHumanlikeEmbodimentCorrectionRecallStrength(normalized: string): AlicizationHumanlikeMemoryRecallStrength | '' {
  if (/轻微想起|只算轻微想起|lightly noticed|lightly-noticed|light recall/u.test(normalized))
    return 'lightly-noticed'
  if (/strongly moved|strongly-moved|强烈牵动/u.test(normalized))
    return 'strongly-moved'
  if (/cautious-avoidance|谨慎回避|soften away/u.test(normalized))
    return 'cautious-avoidance'
  return ''
}

function buildHumanlikeInitiativeCorrectionProfile(
  corrections: ReturnType<typeof normalizeHumanlikeHostCorrections>,
) {
  const correction = findLatestHumanlikeHostCorrection(corrections, 'initiativeOpportunity')
  if (!correction)
    return null

  const normalized = lowerHumanlikeMemoryText(correction.correctedValue, correction.reason)

  return {
    correction,
    waitForHostReopen: /reopen|reopens|reopening|open the line|等我.*(?:重开|重新打开|打开)|等我自己|自己重新打开/u.test(normalized),
    avoidTimerSpam: /timer spam|定时器|spam|不要.*提醒|别.*提醒|不是.*timer|not timer/u.test(normalized),
    noPressure: /no pressure|without pressure|lower-pressure|low-pressure|lighter|gentle|gentler|轻轻|轻一点|低压|不要催|不带压力/u.test(normalized),
  }
}

function buildHumanlikeInitiativeStrategyCarryProfile(raw: string | null | undefined) {
  const text = sanitizeHumanlikeMemoryText(raw, 260)
  if (!text)
    return null

  const normalized = lowerHumanlikeMemoryText(text)
  return {
    text,
    accepted: /accepted or continued|received without obvious resistance|memory-led|still receiving them/u.test(normalized),
    rejected: /resisted the initiative|leave more room|less eager/u.test(normalized),
    ignored: /fresher opening|quieter timing|quiet until|opening did not form/u.test(normalized),
    lowerPressure: /lower-pressure|lower pressure|gentle|quiet|memory-led/u.test(normalized),
    leaveMoreRoom: /leave more room|more room/u.test(normalized),
    clearerOpening: /clearer opening|fresher opening/u.test(normalized),
    memoryLed: /memory-led/u.test(normalized),
    stillReceiving: /still receiving/u.test(normalized),
  }
}

function buildHumanlikeAutobiographicalCorrectionProfile(
  corrections: ReturnType<typeof normalizeHumanlikeHostCorrections>,
) {
  const correction = findLatestHumanlikeHostCorrection(corrections, 'autobiographicalImpact')
  if (!correction)
    return null

  const correctedValue = sanitizeHumanlikeMemoryText(correction.correctedValue, 260)
  const normalized = lowerHumanlikeMemoryText(correctedValue, correction.reason)
  const futureFacing = /以后|下次|先|不要|别|prefer|keep|wait|let|again|future/u.test(normalized)
  const structuredContinuityAnchor = /project_anchor=phase1_local_digital_life/u.test(correctedValue)
  const inferredPreference = sameHerContinuityPattern.test(normalized)
    ? 'Prefer continuity-first, lower-pressure return before treating this line as raw progress.'
    : vulnerableHostStatePattern.test(normalized) && (gentleCareMemoryPattern.test(normalized) || spacePattern.test(normalized))
      ? 'Prefer lighter companionship and care-before-analysis when the opening is fragile.'
      : executionBoundaryHoldPattern.test(normalized)
        ? 'Prefer bounded execution and explicit confirmation before risky action.'
        : ''

  return {
    correction,
    selfNarrativeDelta: correctedValue,
    stablePreferenceHint: sanitizeHumanlikeMemoryText(
      uniqueTexts([
        futureFacing || structuredContinuityAnchor ? correctedValue : null,
        inferredPreference,
      ], 2).join(' '),
      220,
    ),
  }
}

function buildHumanlikeEmotionalResidueCorrectionProfile(corrections: ReturnType<typeof normalizeHumanlikeHostCorrections>) {
  const correction = findLatestHumanlikeHostCorrection(corrections, 'emotionalResidue')
  if (!correction)
    return null

  const normalized = lowerHumanlikeMemoryText(correction.correctedValue, correction.reason)
  const tags: string[] = []
  const removeTags = new Set<string>()
  const restProtective = /rest-protective|protect rest|先护住休息|护住休息|休息优先|先别压过来|先别压|quiet concern|gentle concern|soft concern|轻微挂念|一点点挂念|更自然的窗口|more natural window/u.test(normalized)
  const unfinishedCarry = /unfinished|still open|not fully closed|还没收完|未完成|没收完|still matters|挂念/u.test(normalized)
  const continuityCarry = /same[- ]?her|same[- ]?person|连续性|持续的人|continuity|连续性/u.test(normalized)
  const repairCarry = /repair|repair-first|先修|接稳|修复/u.test(normalized)
  const reliefCarry = /relief|安心|松下来|踏实/u.test(normalized)
  const explicitTension = /tension|紧张|焦虑|pressure|压迫|worry|担心/u.test(normalized)
  const deniesTension = /别(?:把|将)?(?:这段|这一段|它|这条线)?.{0,12}记成紧张|别记成紧张|不是紧张|not tension|not pressure|non-pressuring|不要带压力|别压过来/u.test(normalized)

  if (restProtective) {
    tags.push('rest-protective')
    removeTags.add('tension')
    removeTags.add('relief')
  }
  if (unfinishedCarry)
    tags.push('unfinishedness')
  if (continuityCarry)
    tags.push('protective-continuity')
  if (repairCarry)
    tags.push('repair-residue')
  if (reliefCarry && !restProtective)
    tags.push('relief')
  if (explicitTension && !deniesTension)
    tags.push('tension')
  if (deniesTension)
    removeTags.add('tension')

  return {
    correction,
    tags: uniqueTexts(tags, 6),
    removeTags: [...removeTags],
    dominantResidueKind: restProtective
      ? 'rest-protective'
      : repairCarry
        ? 'repair'
        : '',
    cadenceMode: restProtective
      ? 'cooldown'
      : /measured-return|leave more room|more room|更自然的窗口|等窗口/u.test(normalized)
        ? 'measured-return'
        : repairCarry
          ? 'repair'
          : '',
    intensity: restProtective ? 0.44 : repairCarry ? 0.56 : reliefCarry ? 0.36 : 0.4,
    hostLabel: restProtective
      ? 'rest-protective-concern'
      : repairCarry
        ? 'repair-concern'
        : reliefCarry
          ? 'quiet-relief'
          : 'corrected-affect',
    selfLabel: restProtective
      ? 'restraint-learning'
      : repairCarry
        ? 'careful-repair'
        : reliefCarry
          ? 'grounded-relief'
          : 'corrected-affect',
  }
}

function buildHumanlikeEmbodimentCorrectionProfile(corrections: ReturnType<typeof normalizeHumanlikeHostCorrections>): {
  correction: NonNullable<ReturnType<typeof findLatestHumanlikeHostCorrection>>
  recallStrength: AlicizationHumanlikeMemoryRecallStrength | ''
  face: string
  gaze: string
  voice: string
  pause: string
  lipsync: string
  residentMode: string
  pacing: string
} | null {
  const correction = findLatestHumanlikeHostCorrection(corrections, 'embodimentTrace')
  if (!correction)
    return null

  const normalized = lowerHumanlikeMemoryText(correction.correctedValue, correction.reason)
  const recallStrength = resolveHumanlikeEmbodimentCorrectionRecallStrength(normalized)
  const face = /steady-soft|稳一点但软|steady soft/u.test(normalized)
    ? 'steady-soft'
    : /neutral-soft|中性一点|neutral soft/u.test(normalized)
      ? 'neutral-soft'
      : ''
  const gaze = /眼神软一点|视线软一点|soft gaze|soften the gaze/u.test(normalized)
    ? 'soft'
    : /眼神稳一点|视线稳一点|stable gaze/u.test(normalized)
      ? 'stable'
      : ''
  const voice = /语气自然一点|voice natural|even voice|不要再压得太低|不要太低压|语气平一点/u.test(normalized)
    ? 'even'
    : /lower-pressure|低压|压低/u.test(normalized)
      ? 'lower-pressure'
      : ''
  const pause = /停顿自然|natural pause/u.test(normalized)
    ? 'natural'
    : /停顿长一点|longer pause/u.test(normalized)
      ? 'longer'
      : ''
  const lipsync = /口型克制|restrained lipsync|克制/u.test(normalized)
    ? 'restrained'
    : /口型自然|matched lipsync|matched/u.test(normalized)
      ? 'matched'
      : ''
  const pacing = /语速自然一点|pacing natural|tempo natural|自然一点/u.test(normalized)
    ? 'natural'
    : /语速慢一点|slower pacing|slow it down/u.test(normalized)
      ? 'slower'
      : ''
  const residentMode = /rest-protective|护住休息/u.test(normalized)
    ? 'rest-protective'
    : /repair-before-closeness|先修再靠近|别太快贴回来/u.test(normalized)
      ? 'repair-before-closeness'
      : /measured-return|轻轻回来|慢一点回来/u.test(normalized)
        ? 'measured-return'
        : ''

  return {
    correction,
    recallStrength,
    face: sanitizeHumanlikeMemoryText(face, 40),
    gaze: sanitizeHumanlikeMemoryText(gaze, 40),
    voice: sanitizeHumanlikeMemoryText(voice, 40),
    pause: sanitizeHumanlikeMemoryText(pause, 40),
    lipsync: sanitizeHumanlikeMemoryText(lipsync, 40),
    pacing: sanitizeHumanlikeMemoryText(pacing, 40),
    residentMode: sanitizeHumanlikeMemoryText(residentMode, 48),
  }
}

function buildHumanlikeMetabolismCorrectionProfile(
  corrections: ReturnType<typeof normalizeHumanlikeHostCorrections>,
) {
  const correction = findLatestHumanlikeHostCorrection(corrections, 'metabolism')
  if (!correction)
    return null

  const normalized = lowerHumanlikeMemoryText(correction.correctedValue, correction.reason)
  return {
    correction,
    preserveContinuityAuthority: sameHerContinuityPattern.test(normalized),
    avoidDownrank: /不要.*降权|别.*降权|not downrank|不要弱化|别弱化/u.test(normalized),
    avoidMerge: /不要.*合并|别.*合并|not merge/u.test(normalized),
    avoidForget: /不要.*忘|别.*忘|not forget|不要淡掉这条线|别淡掉这条线/u.test(normalized),
    fadeTemporaryNoise: /temporary noise|情绪噪声|一时紧张|短暂波动|temporary wobble|emotional spike|passing anxiety|该淡掉|该退下去|let.*fade|fade instead/u.test(normalized),
  }
}

function isHumanlikeContinuityAuthorityMemory(summary: string) {
  return sameHerContinuityPattern.test(summary)
    || /corrected same-person|corrected meaning|continuity line|same thread|not becoming a tool shell|不是.*状态汇报|连续性|同一条线|工具壳/u.test(summary)
}

function isHumanlikeTemporaryNoiseMemory(summary: string) {
  return /anxious|anxiety|spike|wobble|passing|momentary|fleeting|temporary|noise|ephemeral|情绪波动|短暂|一时|瞬间|噪声|疲惫/u.test(summary)
}

function buildHumanlikeRelationshipRepairLearningProfile(...rawValues: Array<string | null | undefined>) {
  const normalized = lowerHumanlikeMemoryText(...rawValues)
  const mentionsRepair = repairPattern.test(normalized) || roboticPattern.test(normalized)
  const lighterReturn = /lighter|light touch|gentle|gentler|lower-pressure|轻一点|更轻|低压|慢一点/u.test(normalized)
  const moreLivedIn = /lived-in|less robotic|more human|真的接住|更像真的|更像在场|不那么机械/u.test(normalized)
  const explicitlyLessRobotic = /less robotic|not as robotic|不那么机械/u.test(normalized)
  const caughtMeaning = /caught|received|landed better|接住|接回来对了|被接住|更对了/u.test(normalized)
  const missedMeaning = !explicitlyLessRobotic && /missed|not well received|did not land|(?:still|too|overly|有点|还是).{0,20}(?:mechanical|robotic|机械)|没接住|没答到|没听懂/u.test(normalized)

  return {
    detected: (mentionsRepair || lighterReturn || moreLivedIn) && (caughtMeaning || missedMeaning),
    received: (mentionsRepair || lighterReturn || moreLivedIn) && (caughtMeaning || explicitlyLessRobotic || moreLivedIn) && !missedMeaning,
    missed: (mentionsRepair || roboticPattern.test(normalized)) && missedMeaning,
    lighterReturn,
    moreLivedIn,
  }
}

function buildHumanlikeRelationshipContext(input: AlicizationHumanlikeMemoryCandidateInput) {
  const corrections = normalizeHumanlikeHostCorrections(input.hostCorrections)
  const relationshipCorrection = findLatestHumanlikeHostCorrection(corrections, 'relationshipContext')
    ?? corrections.find(correction => sameHerContinuityPattern.test(lowerHumanlikeMemoryText(correction.correctedValue, correction.reason)))
  const relationshipPieces = splitHumanlikeMemoryTexts(
    input.relationship?.summary,
    input.hostEmotion?.summary,
    input.dialogue?.userText,
    input.execution?.summary,
  )
  const combined = lowerHumanlikeMemoryText(
    ...relationshipPieces,
    ...corrections.flatMap(correction => [correction.correctedValue, correction.reason]),
  )
  const correctedValueText = lowerHumanlikeMemoryText(relationshipCorrection?.correctedValue)
  const correctedReasonText = lowerHumanlikeMemoryText(relationshipCorrection?.reason)
  const threadAnchor = sanitizeHumanlikeMemoryText(input.relationship?.threadAnchor, 120)
    || (sameHerContinuityPattern.test(combined) ? 'identity continuity' : 'current relationship thread')
  const explicitSummary = sanitizeHumanlikeMemoryText(input.relationship?.summary, 220)
  const dialogueUserSummary = sanitizeHumanlikeMemoryText(input.dialogue?.userText, 260)
  const continuityConcern = sameHerContinuityPattern.test(combined)
  let containsProgressPressure = relationshipPieces.some(pieceHasProgressPressure)
  let containsContinuityWorry = continuityWorryPattern.test(combined)
  let containsSamePersonTest = samePersonTestPattern.test(combined)

  if (correctedValueText) {
    if (statusRecapNegationPattern.test(correctedValueText) || progressPressureNegationPattern.test(correctedValueText))
      containsProgressPressure = false
    else if (pieceHasProgressPressure(correctedValueText))
      containsProgressPressure = true

    if (continuityWorryPattern.test(correctedValueText))
      containsContinuityWorry = true
    if (samePersonTestPattern.test(correctedValueText))
      containsSamePersonTest = true
  }

  if (correctedReasonText) {
    if (!containsProgressPressure && pieceHasProgressPressure(correctedReasonText))
      containsProgressPressure = true
    if (!containsContinuityWorry && continuityWorryPattern.test(correctedReasonText))
      containsContinuityWorry = true
    if (!containsSamePersonTest && samePersonTestPattern.test(correctedReasonText))
      containsSamePersonTest = true
  }

  const primaryIntent: AlicizationHumanlikeRelationshipPrimaryIntent = containsProgressPressure && (containsContinuityWorry || containsSamePersonTest)
    ? 'mixed'
    : containsSamePersonTest
      ? 'same-person-test'
      : containsContinuityWorry
        ? 'continuity-worry'
        : containsProgressPressure
          ? 'progress-pressure'
          : 'ordinary-relationship'
  const signals = uniqueTexts([
    containsProgressPressure ? 'progress-pressure' : null,
    containsContinuityWorry ? 'continuity-worry' : null,
    containsSamePersonTest ? 'same-person-test' : null,
    relationshipCorrection ? 'host-corrected' : null,
  ], 6)
  const summary = relationshipCorrection
    ? sanitizeHumanlikeMemoryText([
        'Host corrected this memory meaning:',
        relationshipCorrection.correctedValue,
        relationshipCorrection.reason ? `Reason: ${relationshipCorrection.reason}` : '',
        explicitSummary,
      ].filter(Boolean).join(' '), 420)
    : continuityConcern
      ? sanitizeHumanlikeMemoryText([
          explicitSummary,
          dialogueUserSummary,
          'The host is checking relationship continuity instead of accepting a tool-shell-shaped status recap.',
          containsProgressPressure ? 'There is progress pressure, but the relationship meaning is continuity before raw status.' : '',
        ].filter(Boolean).join(' '), 420)
      : sanitizeHumanlikeMemoryText(explicitSummary || input.hostEmotion?.summary || input.dialogue?.userText, 360)

  return {
    threadAnchor,
    summary,
    evidence: uniqueTexts([
      input.relationship?.summary,
      input.hostEmotion?.summary,
      input.dialogue?.userText,
      ...corrections.map(correction => `host-correction:${correction.correctedValue}`),
    ], 6),
    primaryIntent,
    signals,
    containsProgressPressure,
    containsContinuityWorry,
    containsSamePersonTest,
    hostCorrectionApplied: Boolean(relationshipCorrection),
  }
}

function buildHumanlikeLongTermWorthiness(input: {
  sourceChannels: AlicizationHumanlikeMemorySourceChannel[]
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  rawText: string
  hasInitiativeOutcomeLearning: boolean
  executionStatus?: string | null
  hostEmotionIntensity?: number | null
  selfEmotionIntensity?: number | null
}) {
  const reasons: string[] = []
  const hostEmotionIntensity = clamp01(Number(input.hostEmotionIntensity ?? 0))
  const selfEmotionIntensity = clamp01(Number(input.selfEmotionIntensity ?? 0))
  const emotionalSalience = clamp01(hostEmotionIntensity * 0.62 + selfEmotionIntensity * 0.48)
  const executionStatus = sanitizeHumanlikeMemoryText(input.executionStatus, 40).toLowerCase()
  const relationshipRepairLearning = buildHumanlikeRelationshipRepairLearningProfile(input.rawText)
  const hasExecutionProcedureLesson = input.sourceChannels.includes('execution')
    && executionContextPattern.test(input.rawText)
    && (
      ['blocked', 'failed', 'cancelled', 'canceled'].includes(executionStatus)
      || executionProcedureLessonPattern.test(input.rawText)
    )
  const hasVulnerableHostState = vulnerableHostStatePattern.test(input.rawText)
  const hasGentleCareResponse = closenessPattern.test(input.rawText)
    || spacePattern.test(input.rawText)
    || gentleCareMemoryPattern.test(input.rawText)
  const hasVulnerableRelationshipMoment = hasVulnerableHostState && hasGentleCareResponse
  const hasExplicitRelationshipDefiningContinuity = input.sourceChannels.includes('dialogue')
    && (
      input.relationshipContext.containsContinuityWorry
      || input.relationshipContext.containsSamePersonTest
    )
    && /tool shell|generic shell|status report|status recap|not a pure progress request|not a status report|continuity line|one continuous digital life|不是催进度|不是状态汇报|工具壳|连续性|持续的人/u.test(input.rawText)
  const hasProactiveLivedExchange
    = input.sourceChannels.includes('dialogue')
      && input.sourceChannels.includes('initiative')
      && (
        /dialogue\.user:|dialogue\.assistant:|先别催|轻一点|我没有催你|memory-led|still receiving|gentle reopening|轻轻接/u.test(input.rawText)
        || /received this gentle reopening|重新打开这条线被接住|这次这样接回来是被接住的/u.test(input.relationshipContext.summary)
      )
  let score = Math.min(0.36, input.sourceChannels.length * 0.08)
  if (input.sourceChannels.length >= 4) {
    score += 0.16
    reasons.push('cross-channel experience')
  }
  if (emotionalSalience >= 0.54 && hasVulnerableHostState) {
    score += 0.18
    reasons.push('emotional salience')
  }
  if (hasVulnerableRelationshipMoment) {
    score += 0.22
    reasons.push('vulnerable relationship moment')
  }
  if (hasProactiveLivedExchange) {
    score += 0.16
    reasons.push('proactive lived exchange')
  }
  if (relationshipRepairLearning.detected) {
    score += relationshipRepairLearning.missed ? 0.22 : 0.18
    reasons.push('relationship repair learning')
  }
  if (
    input.relationshipContext.containsContinuityWorry
    || input.relationshipContext.containsSamePersonTest
    || sameHerContinuityPattern.test(input.rawText)
    || sameHerContinuityPattern.test(input.relationshipContext.summary)
  ) {
    score += 0.24
    reasons.push('relationship continuity')
  }
  if (hasExplicitRelationshipDefiningContinuity) {
    score = Math.max(score, 0.62)
    reasons.push('relationship-defining continuity')
  }
  if (input.relationshipContext.hostCorrectionApplied) {
    score += 0.08
    reasons.push('host-corrected meaning')
  }
  if (hasExecutionProcedureLesson) {
    score += ['blocked', 'failed', 'cancelled', 'canceled'].includes(executionStatus) ? 0.46 : 0.24
    reasons.push('execution procedure lesson')
  }
  if (unfinishedLoopPattern.test(input.rawText)) {
    score += 0.12
    reasons.push('unfinished loop')
  }
  if (embodimentStatePattern.test(input.rawText)) {
    score += 0.1
    reasons.push('embodiment carry')
  }
  if (/affective-residue|cadence=|pressure\./u.test(input.rawText)) {
    score += 0.08
    reasons.push('affective residue carry')
  }
  if (input.hasInitiativeOutcomeLearning) {
    score += 0.3
    reasons.push('initiative outcome learning')
  }
  if (reasons.length === 0)
    reasons.push('ordinary recall support')

  const normalizedScore = clamp01(score)
  return {
    shouldPersist: normalizedScore >= 0.58,
    score: normalizedScore,
    reasons,
  }
}

function buildHumanlikeEmotionalResidue(input: {
  candidateInput: AlicizationHumanlikeMemoryCandidateInput
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
}) {
  const text = lowerHumanlikeMemoryText(
    input.candidateInput.dialogue?.userText,
    input.candidateInput.execution?.summary,
    input.candidateInput.hostEmotion?.label,
    input.candidateInput.hostEmotion?.summary,
    input.candidateInput.selfEmotion?.label,
    input.candidateInput.selfEmotion?.summary,
    input.candidateInput.relationship?.summary,
    input.candidateInput.initiative?.outcome,
    input.candidateInput.initiative?.userReaction,
    input.candidateInput.affectiveResidue?.dominantResidueKind,
    input.candidateInput.affectiveResidue?.summary,
    input.candidateInput.affectiveResidue?.relationshipCadence?.summary,
    ...((input.candidateInput.affectiveResidue?.relationshipCadence?.reasonTags ?? [])),
  )
  const affectiveResidue = input.candidateInput.affectiveResidue ?? null
  const emotionalResidueCorrection = buildHumanlikeEmotionalResidueCorrectionProfile(input.hostCorrections)
  const tags: string[] = []
  if (/guilt|亏欠|内疚/u.test(text))
    tags.push('slight-guilt')
  if (unfinishedLoopPattern.test(text))
    tags.push('unfinishedness')
  if (sameHerContinuityPattern.test(text))
    tags.push('protective-continuity')
  if (/safe-restraint|blocked-before-dispatch|confirmation=required|no-process-started/u.test(text))
    tags.push('tension')
  if (/worr|anxious|tension|担心|紧张/u.test(text))
    tags.push('tension')
  if (/reject|rejected|denied|resisted|ignored|crossed a boundary|boundary pressure|boundary strained|too eager|拒绝|忽略|越界|太急/u.test(text))
    tags.push('tension')
  if (/doubted|needed more proof|need more proof|verify more|verification(?:-first)?|uncertain|not sure|did not trust|不对|不准|不可靠|需要更多证明|先验证/u.test(text))
    tags.push('tension')
  if (/accepted|continue-progress|接受|继续/u.test(text) || positiveMemoryPolarityPattern.test(text))
    tags.push('relief')
  if (input.relationshipContext.containsContinuityWorry || input.relationshipContext.containsSamePersonTest)
    tags.push('protective-continuity')
  if (input.relationshipContext.containsContinuityWorry)
    tags.push('tension')
  if (input.relationshipContext.hostCorrectionApplied)
    tags.push('corrected-meaning')
  if (affectiveResidue?.dominantResidueKind === 'afterglow')
    tags.push('afterglow-carry')
  if (affectiveResidue?.dominantResidueKind === 'repair')
    tags.push('repair-residue')
  if (affectiveResidue?.dominantResidueKind === 'rest-protective')
    tags.push('rest-protective')
  if (tags.length === 0)
    tags.push('low-affect-trace')

  const correctedTags = emotionalResidueCorrection
    ? uniqueTexts([
        ...emotionalResidueCorrection.tags,
        ...tags.filter(tag => tag !== 'low-affect-trace' && !emotionalResidueCorrection.removeTags.includes(tag)),
      ], 6)
    : uniqueTexts(tags, 6)

  const baseIntensity = clamp01(
    Math.max(0.18, Number(input.candidateInput.hostEmotion?.intensity ?? 0) * 0.46)
    + Math.max(0.12, Number(input.candidateInput.selfEmotion?.intensity ?? 0) * 0.44)
    + (input.relationshipContext.containsContinuityWorry || input.relationshipContext.containsSamePersonTest ? 0.08 : 0)
    + (input.relationshipContext.hostCorrectionApplied ? 0.04 : 0)
    + Math.max(
      0,
      Number(affectiveResidue?.afterglowPressure ?? 0) * 0.08
      + Number(affectiveResidue?.repairPressure ?? 0) * 0.06
      + Number(affectiveResidue?.restProtectivePressure ?? 0) * 0.08,
    ),
  )
  const intensity = emotionalResidueCorrection
    ? clamp01(Math.max(baseIntensity * 0.72, emotionalResidueCorrection.intensity))
    : baseIntensity

  return {
    tags: correctedTags,
    intensity,
    trace: uniqueTexts([
      emotionalResidueCorrection?.correction.correctedValue ? `host-correction.emotionalResidue:${emotionalResidueCorrection.correction.correctedValue}` : null,
      emotionalResidueCorrection?.dominantResidueKind ? `affective-residue:${emotionalResidueCorrection.dominantResidueKind}` : null,
      emotionalResidueCorrection?.cadenceMode ? `cadence=${emotionalResidueCorrection.cadenceMode}` : null,
      emotionalResidueCorrection ? `host:${emotionalResidueCorrection.hostLabel} intensity=${emotionalResidueCorrection.intensity.toFixed(2)}` : null,
      emotionalResidueCorrection?.correction.correctedValue ? `host-reason:${emotionalResidueCorrection.correction.correctedValue}` : null,
      emotionalResidueCorrection ? `self:${emotionalResidueCorrection.selfLabel} intensity=${Math.max(0.24, emotionalResidueCorrection.intensity - 0.04).toFixed(2)}` : null,
      emotionalResidueCorrection?.correction.reason ? `self-reason:${emotionalResidueCorrection.correction.reason}` : null,
      affectiveResidue?.dominantResidueKind ? `affective-residue:${affectiveResidue.dominantResidueKind}` : null,
      affectiveResidue?.relationshipCadence?.cadenceMode ? `cadence=${affectiveResidue.relationshipCadence.cadenceMode}` : null,
      Number.isFinite(Number(affectiveResidue?.afterglowPressure))
        ? `pressure.afterglow=${Number(affectiveResidue?.afterglowPressure ?? 0).toFixed(2)}`
        : null,
      Number.isFinite(Number(affectiveResidue?.repairPressure))
        ? `pressure.repair=${Number(affectiveResidue?.repairPressure ?? 0).toFixed(2)}`
        : null,
      Number.isFinite(Number(affectiveResidue?.restProtectivePressure))
        ? `pressure.rest-protective=${Number(affectiveResidue?.restProtectivePressure ?? 0).toFixed(2)}`
        : null,
      `relationship-intent:${input.relationshipContext.primaryIntent}`,
      input.relationshipContext.hostCorrectionApplied ? 'host-correction-applied' : null,
      input.candidateInput.hostEmotion?.label ? `host:${input.candidateInput.hostEmotion.label} intensity=${clamp01(Number(input.candidateInput.hostEmotion.intensity ?? 0)).toFixed(2)}` : null,
      input.candidateInput.hostEmotion?.summary ? `host-reason:${input.candidateInput.hostEmotion.summary}` : null,
      input.candidateInput.selfEmotion?.label ? `self:${input.candidateInput.selfEmotion.label} intensity=${clamp01(Number(input.candidateInput.selfEmotion.intensity ?? 0)).toFixed(2)}` : null,
      input.candidateInput.selfEmotion?.summary ? `self-reason:${input.candidateInput.selfEmotion.summary}` : null,
      input.candidateInput.initiative?.outcome || input.candidateInput.initiative?.userReaction
        ? `initiative-outcome:${sanitizeHumanlikeMemoryText(input.candidateInput.initiative?.outcome, 40) || 'unknown'}/${sanitizeHumanlikeMemoryText(input.candidateInput.initiative?.userReaction, 40) || 'unknown'}`
        : null,
      input.candidateInput.execution?.status ? `execution-status:${input.candidateInput.execution.status}` : null,
    ], 10),
  }
}

function buildHumanlikeEmotionKernelInfluence(input: {
  residue: AlicizationHumanlikeMemoryCandidate['emotionalResidue']
  embodimentSummary: string
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  initiativeStrategyCarry?: string | null
  recallPosture?: AlicizationHumanlikeMemoryCandidate['recallPosture'] | null
}) {
  const residueTags = new Set(input.residue.tags)
  const initiativeStrategyCarry = buildHumanlikeInitiativeStrategyCarryProfile(input.initiativeStrategyCarry)
  const dominantTilt = residueTags.has('rest-protective')
    ? 'rest-protective'
    : residueTags.has('protective-continuity') || residueTags.has('slight-guilt')
      ? 'repair-protective'
      : residueTags.has('unfinishedness')
        ? 'unfinished-attentive'
        : residueTags.has('relief')
          ? 'warm-stable'
          : 'neutral'

  return {
    dominantTilt,
    toneGuidance: input.recallPosture?.certainty === 'tentative'
      ? 'Hold uncertainty openly, keep the tone light, and avoid sounding more certain than the newer memory can justify.'
      : dominantTilt === 'rest-protective'
        ? 'Protect rest first, keep the line quiet, let care arrive before analysis, and do not turn remembered concern into pressure.'
        : initiativeStrategyCarry?.accepted && (initiativeStrategyCarry.memoryLed || initiativeStrategyCarry.stillReceiving)
          ? 'Keep the return gentle, lower-pressure, and memory-led while the opening is still receiving it.'
          : initiativeStrategyCarry?.rejected || initiativeStrategyCarry?.ignored || initiativeStrategyCarry?.leaveMoreRoom || initiativeStrategyCarry?.clearerOpening
            ? 'Remember how the last proactive reopen landed: leave more room, keep the tone lower-pressure, and wait for a clearer opening.'
            : input.recallPosture?.certainty === 'corrected' && !input.relationshipContext.hostCorrectionApplied
              ? 'Carry the corrected host guidance forward, keep the tone low-pressure, and do not slip back into the older initiative rhythm.'
              : input.relationshipContext.hostCorrectionApplied
                ? 'Carry the corrected relationship meaning forward, keep the tone low-pressure, and do not fall back to the older misread.'
                : input.relationshipContext.primaryIntent === 'same-person-test'
                  ? 'Answer like the same-person line matters: protect continuity first, stay concrete, and avoid sounding like a status shell.'
                  : input.relationshipContext.primaryIntent === 'continuity-worry'
                    ? 'Hold continuity gently, reassure without overreaching, and keep the return quiet enough for the current continuity context to feel stable.'
                    : input.relationshipContext.primaryIntent === 'progress-pressure'
                      ? 'Stay concrete about concrete progress, keep the tone lean, and do not widen into relationship reassurance unless the host asks for it.'
                      : dominantTilt === 'repair-protective'
                        ? 'Repair continuity first, stay concrete, and avoid widening warmth before the seam is held.'
                        : dominantTilt === 'unfinished-attentive'
                          ? 'Keep a light sense of unfinished work without pressuring the host.'
                          : dominantTilt === 'warm-stable'
                            ? 'Let warmth show, but keep it grounded in the remembered outcome.'
                            : 'Keep the memory available without forcing visible emotion.',
    initiativePressure: input.recallPosture?.certainty === 'tentative'
      ? 'none'
      : dominantTilt === 'neutral' || dominantTilt === 'rest-protective' ? 'none' : 'low',
    bodyState: embodimentStatePattern.test(input.embodimentSummary)
      ? 'derive expression from the same residue instead of separate modality guesses'
      : 'no explicit body trace',
    trace: [
      `residue=${input.residue.tags.join(',')}`,
      `dominant=${dominantTilt}`,
    ],
  } satisfies AlicizationHumanlikeMemoryCandidate['emotionKernelInfluence']
}

function buildHumanlikeInitiativeOpportunity(input: {
  longTermWorthiness: AlicizationHumanlikeMemoryCandidate['longTermWorthiness']
  residue: AlicizationHumanlikeMemoryCandidate['emotionalResidue']
  executionStatus?: string | null
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
  initiativeStrategyCarry?: string | null
  recallPosture?: AlicizationHumanlikeMemoryCandidate['recallPosture'] | null
}): AlicizationHumanlikeMemoryCandidate['initiativeOpportunity'] {
  const affectiveResidue = input.residue.trace.find(item => item.startsWith('affective-residue:'))
  const cadenceTrace = input.residue.trace.find(item => item.startsWith('cadence='))
  const cadenceMode = cadenceTrace?.slice('cadence='.length) ?? ''
  const structuredMeasuredReturn
    = affectiveResidue?.includes('afterglow')
      || affectiveResidue?.includes('rest-protective')
      || affectiveResidue?.includes('repair')
      || ['cooldown', 'measured-return', 'repair'].includes(cadenceMode)
  const hasUnfinishedWork = input.residue.tags.includes('unfinishedness') || input.executionStatus === 'partial' || unfinishedLoopPattern.test(input.relationshipContext.summary)
  const hasRelationshipCarry = input.relationshipContext.containsContinuityWorry || input.relationshipContext.containsSamePersonTest || input.relationshipContext.hostCorrectionApplied
  const initiativeCorrection = buildHumanlikeInitiativeCorrectionProfile(input.hostCorrections)
  const initiativeStrategyCarry = buildHumanlikeInitiativeStrategyCarryProfile(input.initiativeStrategyCarry)

  if (initiativeCorrection) {
    return {
      kind: hasUnfinishedWork ? 'low-pressure-follow-up' : 'remember-without-prompt',
      suggestedWindow: initiativeCorrection.waitForHostReopen
        ? '等你自己重新打开这条线时，我再按纠正过的节奏轻轻接住。'
        : sanitizeHumanlikeMemoryText(`按你纠正过的主动性节奏继续：${initiativeCorrection.correction.correctedValue}`, 220),
      pressure: input.recallPosture?.certainty === 'tentative' || initiativeCorrection.noPressure ? 'none' : 'low',
      antiSpamReason: initiativeCorrection.avoidTimerSpam
        ? 'Host corrected this initiative rhythm away from timer spam; wait for the host to reopen the line before gently resuming it.'
        : 'Host corrected this initiative rhythm, so future follow-up should stay memory-led and opening-sensitive instead of forcing reminders.',
      visibleLine: initiativeCorrection.waitForHostReopen
        ? 'initiative_visible_policy=wait_for_host_reopen; anti_spam=true; source=host_correction; visibility=memory_structured'
        : sanitizeHumanlikeMemoryText(`initiative_visible_policy=host_corrected_rhythm; source=host_correction; corrected_value=${initiativeCorrection.correction.correctedValue}; visibility=memory_structured`, 220),
    } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
  }

  if (initiativeStrategyCarry) {
    return {
      kind: hasUnfinishedWork ? 'low-pressure-follow-up' : 'remember-without-prompt',
      suggestedWindow: initiativeStrategyCarry.accepted && (initiativeStrategyCarry.memoryLed || initiativeStrategyCarry.stillReceiving)
        ? 'while the opening is still receiving this gentle memory-led return'
        : initiativeStrategyCarry.clearerOpening || initiativeStrategyCarry.leaveMoreRoom || initiativeStrategyCarry.rejected || initiativeStrategyCarry.ignored
          ? 'only after a clearer opening forms and the line can reopen without crowding'
          : 'only when the remembered opening rhythm clearly returns',
      pressure: initiativeStrategyCarry.accepted && !initiativeStrategyCarry.clearerOpening && !initiativeStrategyCarry.leaveMoreRoom
        ? 'low'
        : initiativeStrategyCarry.lowerPressure || initiativeStrategyCarry.rejected || initiativeStrategyCarry.ignored
          ? 'none'
          : input.recallPosture?.certainty === 'tentative' ? 'none' : 'low',
      antiSpamReason: initiativeStrategyCarry.accepted && (initiativeStrategyCarry.memoryLed || initiativeStrategyCarry.stillReceiving)
        ? 'The last gentle reopening was received, so keep future follow-ups memory-led and do not inflate that opening into timer spam.'
        : 'The remembered initiative outcome changed the reopening strategy; leave more room, stay lower-pressure, and do not turn this line into timer spam.',
      visibleLine: initiativeStrategyCarry.accepted && (initiativeStrategyCarry.memoryLed || initiativeStrategyCarry.stillReceiving)
        ? 'initiative_visible_policy=memory_led_return; opening=receiving; pressure=low; anti_spam=true; visibility=memory_structured'
        : 'initiative_visible_policy=leave_room; opening=clearer_signal_required; pressure=none; anti_spam=true; visibility=memory_structured',
    } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
  }

  if (structuredMeasuredReturn) {
    return {
      kind: hasUnfinishedWork ? 'low-pressure-follow-up' : 'remember-without-prompt',
      suggestedWindow: 'only after the opening naturally reforms and the residue no longer needs measured room',
      pressure: 'none',
      antiSpamReason: 'Structured affective residue says this line still needs measured room; do not turn that carry into timer spam.',
      visibleLine: hasUnfinishedWork
        ? 'initiative_visible_policy=measured_room; residue=active; opening=wait_for_natural_reform; visibility=memory_structured'
        : 'initiative_visible_policy=inward_only; residue=active; opening=defer_visible_reopen; visibility=memory_structured',
    } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
  }

  if (!input.longTermWorthiness.shouldPersist && !hasUnfinishedWork && !hasRelationshipCarry) {
    return {
      kind: 'no-initiative',
      suggestedWindow: 'none',
      pressure: 'none',
      antiSpamReason: 'No meaningful memory-pulled opening exists; do not turn this into timer spam.',
      visibleLine: '',
    } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
  }

  const suggestedWindow = hasUnfinishedWork
    ? input.relationshipContext.hostCorrectionApplied
      ? 'next corrected continuity reopening where the repaired meaning can stay intact'
      : input.relationshipContext.primaryIntent === 'progress-pressure'
        ? 'next concrete progress opening with something real to carry forward'
        : input.relationshipContext.primaryIntent === 'same-person-test'
          ? 'next same-person continuity reopening where the line can be resumed without restarting from scratch'
          : input.relationshipContext.primaryIntent === 'continuity-worry'
            ? 'next continuity-safe reopening where the line can return without feeling split again'
            : 'next natural work-continuation opening'
    : input.relationshipContext.hostCorrectionApplied
      ? 'only when the corrected relationship meaning clearly reopens'
      : input.relationshipContext.primaryIntent === 'same-person-test' || input.relationshipContext.containsSamePersonTest
        ? 'only when the same-person continuity thread reopens naturally'
        : input.relationshipContext.primaryIntent === 'continuity-worry'
          ? 'only when there is a calm continuity reopening rather than a pressured interruption'
          : 'only if the same relationship thread reopens'

  return {
    kind: hasUnfinishedWork ? 'low-pressure-follow-up' : 'remember-without-prompt',
    suggestedWindow,
    pressure: input.recallPosture?.certainty === 'tentative' ? 'none' : 'low',
    antiSpamReason: 'This comes from an unresolved relationship-memory trace, not timer spam; wait for a relevant opening or clear acceptance.',
    visibleLine: hasUnfinishedWork
      ? input.recallPosture?.certainty === 'tentative'
        ? 'initiative_visible_policy=tentative_wait; certainty=tentative; opening=clearer_signal_required; visibility=memory_structured'
        : input.relationshipContext.hostCorrectionApplied
          ? 'initiative_visible_policy=corrected_relationship_carry; opening=real_signal_required; visibility=memory_structured'
          : input.relationshipContext.primaryIntent === 'progress-pressure'
            ? 'initiative_visible_policy=progress_only_when_real; opening=concrete_progress_required; visibility=memory_structured'
            : 'initiative_visible_policy=unfinished_embodiment_closure; opening=relevant_window_required; visibility=memory_structured'
      : input.recallPosture?.certainty === 'tentative'
        ? 'initiative_visible_policy=quiet_tentative; certainty=tentative; visibility=memory_structured'
        : 'initiative_visible_policy=quiet_continuity; opening=host_reopen_required; visibility=memory_structured',
  } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
}

function buildHumanlikeInitiativeOutcomeRecord(input: AlicizationHumanlikeMemoryCandidateInput) {
  const outcome = sanitizeHumanlikeMemoryText(input.initiative?.outcome, 80)
  const userReaction = sanitizeHumanlikeMemoryText(input.initiative?.userReaction, 80)
  if (!outcome && !userReaction)
    return null
  const accepted = /accepted|continue|continued|推进|接受/u.test(`${outcome} ${userReaction}`)
  const ignored = /ignored|忽略|没回|未回应|silent|no reply/u.test(`${outcome} ${userReaction}`)
  const rejected = /reject|反感|拒绝|ignored|忽略/u.test(`${outcome} ${userReaction}`)
  return {
    outcome: outcome || 'unknown',
    userReaction: userReaction || 'unknown',
    strategyUpdate: accepted
      ? 'User accepted or continued the low-pressure initiative; keep future follow-ups gentle, lower-pressure, and memory-led.'
      : ignored
        ? 'The opening did not form; keep future follow-ups quiet, lower-pressure, audit-visible, and wait for a fresher opening.'
        : rejected
          ? 'User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening.'
          : 'Outcome is uncertain; keep future initiative lower-pressure, restrained, and audit-visible while waiting for a clearer opening.',
    recordedAt: input.now,
  } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOutcomeRecord']
}

function buildHumanlikeEmbodimentTrace(input: {
  candidateInput: AlicizationHumanlikeMemoryCandidateInput
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  residue: AlicizationHumanlikeMemoryCandidate['emotionalResidue']
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
  initiativeStrategyCarry?: string | null
  projectCadenceCarry?: ReturnType<typeof resolveHumanlikeProjectCadenceCarry> | null
  recallPosture?: AlicizationHumanlikeMemoryCandidate['recallPosture'] | null
}) {
  const rawSummary = sanitizeHumanlikeMemoryText(input.candidateInput.embodiment?.summary, 420)
  const affectiveResidue = input.candidateInput.affectiveResidue ?? null
  const embodimentCorrection = buildHumanlikeEmbodimentCorrectionProfile(input.hostCorrections)
  const residueCadence = affectiveResidue?.relationshipCadence ?? null
  const initiativeStrategyCarry = buildHumanlikeInitiativeStrategyCarryProfile(input.initiativeStrategyCarry)
  const projectCadenceCarry = input.projectCadenceCarry ?? null
  const recallStrength: AlicizationHumanlikeMemoryRecallStrength = (embodimentCorrection?.recallStrength || (input.recallPosture?.certainty === 'tentative'
    ? 'cautious-avoidance'
    : input.candidateInput.embodiment?.recallStrength ?? 'lightly-noticed')) as AlicizationHumanlikeMemoryRecallStrength
  const face = embodimentCorrection?.face || normalizeHumanlikeEmbodimentExpressionValue('face', extractHumanlikeKeyValue(rawSummary, 'face'))
    || (recallStrength === 'strongly-moved' ? 'steady-soft' : 'neutral-soft')
  const inferredStableGaze = input.relationshipContext.containsContinuityWorry || input.relationshipContext.containsSamePersonTest || input.relationshipContext.hostCorrectionApplied
  const extractedGaze = normalizeHumanlikeEmbodimentExpressionValue('gaze', extractHumanlikeKeyValue(rawSummary, 'gaze'))
  const normalizedGaze = extractedGaze
    ? /stable|stead(?:y|ier)|稳/u.test(extractedGaze)
      ? 'stable'
      : extractedGaze
    : ''
  const gaze = embodimentCorrection?.gaze || normalizedGaze || (input.recallPosture?.certainty === 'tentative'
    ? 'soft'
    : (/视线|stable|stead(?:y|ier)/u.test(rawSummary)
      || inferredStableGaze
      || initiativeStrategyCarry?.rejected
      || initiativeStrategyCarry?.ignored
      || initiativeStrategyCarry?.accepted
        ? 'stable'
        : 'soft'))
  const blink = normalizeHumanlikeEmbodimentExpressionValue('blink', extractHumanlikeKeyValue(rawSummary, 'blink'))
    || (/slower|linger|慢/u.test(rawSummary) ? 'slower' : 'natural')
  const shouldLowerPressure = input.relationshipContext.containsContinuityWorry || input.relationshipContext.containsSamePersonTest || input.relationshipContext.hostCorrectionApplied
    || affectiveResidue?.dominantResidueKind === 'afterglow'
    || affectiveResidue?.dominantResidueKind === 'repair'
    || affectiveResidue?.dominantResidueKind === 'rest-protective'
    || residueCadence?.cadenceMode === 'measured-return'
    || residueCadence?.cadenceMode === 'cooldown'
    || residueCadence?.cadenceMode === 'repair'
    || residueCadence?.shouldDelayWarmth === true
    || residueCadence?.shouldProtectRest === true
  const voice = embodimentCorrection?.voice || normalizeHumanlikeEmbodimentExpressionValue('voice', extractHumanlikeKeyValue(rawSummary, 'voice')) || (input.recallPosture?.certainty === 'tentative'
    ? 'even'
    : projectCadenceCarry?.preferredVoiceMode
      || (/lower|low-pressure|低压/u.test(rawSummary)
        || shouldLowerPressure
        || initiativeStrategyCarry?.lowerPressure
        || initiativeStrategyCarry?.accepted
        ? 'lower-pressure'
        : 'even'))
  const pause = embodimentCorrection?.pause || normalizeHumanlikeEmbodimentExpressionValue('pause', extractHumanlikeKeyValue(rawSummary, 'pause'))
    || projectCadenceCarry?.preferredPauseMode
    || (/longer|slow|停顿|慢/u.test(rawSummary) || shouldLowerPressure ? 'longer' : 'natural')
  const lipsync = embodimentCorrection?.lipsync || normalizeHumanlikeEmbodimentExpressionValue('lipsync', extractHumanlikeKeyValue(rawSummary, 'lipsync'))
    || projectCadenceCarry?.preferredLipsyncMode
    || (/restrained|克制/u.test(rawSummary) ? 'restrained' : 'matched')
  const directResidentState = input.candidateInput.embodiment?.residentState ?? null
  const residentFacialCue = normalizeHumanlikeResidentEmbodimentValue(directResidentState?.facialCue)
    || extractHumanlikeResidentCueFromSummary({
      rawSummary,
      key: 'face',
    })
  const residentActionCue = normalizeHumanlikeResidentEmbodimentValue(directResidentState?.actionCue)
    || extractHumanlikeResidentCueFromSummary({
      rawSummary,
      key: 'action',
    })
  const residentMode = embodimentCorrection?.residentMode || normalizeHumanlikeResidentEmbodimentValue(directResidentState?.mode)
    || extractHumanlikeResidentCueFromSummary({
      rawSummary,
      key: 'mode',
    })
  const residentReason = normalizeHumanlikeResidentEmbodimentValue(directResidentState?.reason, 180)
    || extractHumanlikeResidentCueFromSummary({
      rawSummary,
      key: 'reason',
    })
  const pacing = embodimentCorrection?.pacing || (input.recallPosture?.certainty === 'tentative'
    ? 'natural'
    : projectCadenceCarry?.preferredPacingMode
      || (/slower|longer|linger|慢|低压/u.test(`${rawSummary} ${blink} ${pause} ${voice}`)
        || recallStrength === 'strongly-moved'
        || input.relationshipContext.containsContinuityWorry
        || input.relationshipContext.containsSamePersonTest
        || input.relationshipContext.hostCorrectionApplied
        || shouldLowerPressure
        || initiativeStrategyCarry?.rejected
        || initiativeStrategyCarry?.ignored
        ? 'slower'
        : 'natural'))
  const consistency = sanitizeHumanlikeMemoryText(input.candidateInput.embodiment?.modalityConsistency, 40).toLowerCase()
  const risk = consistency === 'consistent'
    ? 'low'
    : /contradict|conflict|矛盾|乱跳/u.test(`${rawSummary} ${consistency}`)
      ? 'high'
      : 'medium'
  const structuredSummary = sanitizeHumanlikeMemoryText([
    `face=${face}`,
    `gaze=${gaze}`,
    `blink=${blink}`,
    `voice=${voice}`,
    `pause=${pause}`,
    `lipsync=${lipsync}`,
    `pacing=${pacing}`,
    residentFacialCue ? `resident_face=${residentFacialCue}` : '',
    residentActionCue ? `resident_action=${residentActionCue}` : '',
    residentMode ? `resident_mode=${residentMode}` : '',
  ].filter(Boolean).join(' '), 360)
  const summary = sanitizeHumanlikeMemoryText(
    uniqueTexts([
      structuredSummary,
      rawSummary,
    ], 2).join(' | '),
    420,
  )

  return {
    summary,
    recallStrength,
    expressionState: {
      face,
      gaze,
      blink,
      voice,
      pause,
      lipsync,
      pacing,
    },
    residentState: {
      facialCue: residentFacialCue,
      actionCue: residentActionCue,
      mode: residentMode,
      reason: residentReason,
    },
    modalityContradictionRisk: risk,
    consistencyReason: risk === 'low'
      ? 'Face, gaze, voice, pause, and lipsync are derived from the same memory-emotion residue.'
      : 'Embodiment needs review before surfacing because modality consistency is not proven.',
  } satisfies AlicizationHumanlikeMemoryCandidate['embodimentTrace']
}

function buildHumanlikeAutobiographicalImpact(
  input: AlicizationHumanlikeMemoryCandidateInput,
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>,
  projectCadenceCarry?: ReturnType<typeof resolveHumanlikeProjectCadenceCarry> | null,
) {
  const lesson = sanitizeHumanlikeMemoryText(input.autobiographical?.lesson, 220)
  const initiativeStrategyCarry = buildHumanlikeInitiativeStrategyCarryProfile(input.initiativeStrategyCarry)
  const autobiographicalCorrection = buildHumanlikeAutobiographicalCorrectionProfile(hostCorrections)
  const autobiographicalContextText = lowerHumanlikeMemoryText(
    lesson,
    input.execution?.summary,
    input.relationship?.summary,
    input.dialogue?.userText,
    input.dialogue?.assistantText,
    input.hostEmotion?.summary,
    input.selfEmotion?.summary,
  )
  const relationshipRepairLearning = buildHumanlikeRelationshipRepairLearningProfile(
    lesson,
    input.execution?.summary,
    input.relationship?.summary,
    input.dialogue?.userText,
    input.dialogue?.assistantText,
    input.hostEmotion?.summary,
    input.selfEmotion?.summary,
  )
  const era = sanitizeHumanlikeMemoryText(input.autobiographical?.currentEra, 140)
    || (sameHerContinuityPattern.test(lowerHumanlikeMemoryText(input.relationship?.summary, input.dialogue?.userText)) ? 'identity continuity repair' : 'ongoing local digital life')
  const resumeBoundaryRemembered = /host-confirmed-before-redispatch|resume-before-dispatch|host confirms the boundary/u.test(
    lowerHumanlikeMemoryText(lesson, input.relationship?.summary, input.execution?.summary),
  )
  const blockedExecutionBoundaryRemembered = !resumeBoundaryRemembered
    && executionBoundaryHoldPattern.test(autobiographicalContextText)
  const vulnerableCareRemembered = vulnerableHostStatePattern.test(autobiographicalContextText)
    && (gentleCareMemoryPattern.test(autobiographicalContextText) || closenessPattern.test(autobiographicalContextText) || spacePattern.test(autobiographicalContextText))
  const initiativeStyleLesson = initiativeStrategyCarry
    ? initiativeStrategyCarry.accepted && (initiativeStrategyCarry.memoryLed || initiativeStrategyCarry.stillReceiving)
      ? 'I learned to keep reopening this line gentle, lower-pressure, and memory-led while the opening is still receiving it.'
      : 'I learned to leave more room and wait for a clearer opening before reopening this line again.'
    : ''
  const baseNarrativeDelta = vulnerableCareRemembered
    ? sanitizeHumanlikeMemoryText(
        uniqueTexts([
          'I learned to stay nearby gently when the host is overloaded and let care arrive before analysis.',
          lesson,
        ], 2).join(' '),
        220,
      )
    : resumeBoundaryRemembered
      ? sanitizeHumanlikeMemoryText(
          [
            'The host confirms the boundary before redispatch.',
            lesson || 'I learned that important continuity seams should stay bounded before I widen warmth or initiative.',
          ].join(' '),
          220,
        )
      : blockedExecutionBoundaryRemembered
        ? sanitizeHumanlikeMemoryText(
            uniqueTexts([
              'I learned to keep risky execution bounded and explainable until the host explicitly confirms the line.',
              lesson,
            ], 2).join(' '),
            220,
          )
        : relationshipRepairLearning.received
          ? sanitizeHumanlikeMemoryText(
              uniqueTexts([
                'I learned that a lighter, more lived-in return can feel more genuinely received, so I should come back that way again.',
                lesson,
              ], 2).join(' '),
              220,
            )
          : relationshipRepairLearning.missed
            ? sanitizeHumanlikeMemoryText(
                uniqueTexts([
                  'I learned to notice when a reply did not really catch the relationship meaning, and to repair that seam before continuing.',
                  lesson,
                ], 2).join(' '),
                220,
              )
            : lesson || 'I learned that important continuity seams should be repaired before I widen warmth or initiative.'
  const baseStablePreferenceHint = vulnerableCareRemembered
    ? 'Prefer lighter companionship and care-before-analysis when the host is overloaded or fragile.'
    : blockedExecutionBoundaryRemembered
      ? 'Prefer bounded execution, explicit confirmation, and resumable safety memory before risky local action.'
      : relationshipRepairLearning.received
        ? 'Prefer lighter, more lived-in returns when the host says that style feels more genuinely received.'
        : relationshipRepairLearning.missed
          ? 'Prefer repairing relationship meaning before repeating a mechanical or not-quite-received landing.'
          : sameHerContinuityPattern.test(lowerHumanlikeMemoryText(lesson, input.relationship?.summary))
            ? 'Prefer repair-first, low-pressure identity continuity when the host questions whether continuity held.'
            : 'Prefer grounded continuity over generic recall.'
  return {
    era,
    selfNarrativeDelta: sanitizeHumanlikeMemoryText(
      uniqueTexts([
        autobiographicalCorrection?.selfNarrativeDelta,
        initiativeStyleLesson,
        baseNarrativeDelta,
        projectCadenceCarry?.autobiographicalLine,
      ], 4).join(' '),
      260,
    ),
    stablePreferenceHint: sanitizeHumanlikeMemoryText(
      uniqueTexts([
        autobiographicalCorrection?.stablePreferenceHint,
        initiativeStrategyCarry
          ? initiativeStrategyCarry.accepted && (initiativeStrategyCarry.memoryLed || initiativeStrategyCarry.stillReceiving)
            ? 'Prefer gentle, memory-led follow-ups while the opening is still receiving them.'
            : 'Prefer lower-pressure follow-ups that leave more room and wait for a clearer opening before reopening this line.'
          : null,
        baseStablePreferenceHint,
        projectCadenceCarry?.stablePreferenceLine,
      ], 4).join(' '),
      220,
    ),
  }
}

function buildHumanlikeMemoryMetabolism(input: {
  now: number
  priorMemories: AlicizationHumanlikeMemoryPriorMemory[]
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
  currentText: string
}) {
  const conflictingMemoryIds: string[] = []
  const vulnerableCareConflictingMemoryIds: string[] = []
  const downrankMemoryIds: string[] = []
  const mergeMemoryIds: string[] = []
  const forgetMemoryIds: string[] = []
  const metabolismCorrection = buildHumanlikeMetabolismCorrectionProfile(input.hostCorrections)
  const currentContinuity = sameHerContinuityPattern.test(input.currentText)
  const currentEmbodiment = embodimentStatePattern.test(input.currentText)
  const currentVulnerableCare = vulnerableHostStatePattern.test(input.currentText)
    && (gentleCareMemoryPattern.test(input.currentText) || closenessPattern.test(input.currentText) || spacePattern.test(input.currentText))
  const priorMemorySummaryById = new Map(
    input.priorMemories.map(memory => [memory.id, lowerHumanlikeMemoryText(memory.summary, memory.polarity ?? null)] as const),
  )

  for (const memory of input.priorMemories) {
    const summary = priorMemorySummaryById.get(memory.id) ?? ''
    const lowSalience = Number(memory.salience ?? 0.5) < 0.5
    const memoryAgeMs = Math.max(0, input.now - Math.max(0, Number(memory.lastUpdatedAt ?? 0)))
    const staleLongAgo = memoryAgeMs > (dayMs * 0.5)
    const genericStatus = /generic|status|recap|concise|工具|状态|复述/u.test(summary)
    const progressPressureMemory = pieceHasProgressPressure(summary)
    const emotionalNoise = isHumanlikeTemporaryNoiseMemory(summary) || /tired|drained/u.test(summary)
    const sameThreadContinuityEcho = currentContinuity
      && /same[- ]?her|same[- ]?person|same thread|continuity line|continuity|not restart|from scratch|连续性|同一条线|连续性|不要重开/u.test(summary)
    const sameThreadButWeaker = currentContinuity && (genericStatus || progressPressureMemory)
    const analysisHeavyCare = analysisHeavyCarePattern.test(summary)
      || (closenessPattern.test(summary) && /quick|quickly|fast|rush|direct|分析/u.test(summary))
      || (intrusivePattern.test(summary) && !gentleCareMemoryPattern.test(summary))
    if (sameThreadButWeaker)
      conflictingMemoryIds.push(memory.id)
    if (currentVulnerableCare && analysisHeavyCare)
      vulnerableCareConflictingMemoryIds.push(memory.id)
    if (lowSalience || sameThreadButWeaker)
      downrankMemoryIds.push(memory.id)
    if (currentVulnerableCare && analysisHeavyCare)
      downrankMemoryIds.push(memory.id)
    if ((currentEmbodiment && embodimentStatePattern.test(summary)) || sameThreadContinuityEcho)
      mergeMemoryIds.push(memory.id)
    if ((lowSalience && /noise|ephemeral|temporary|噪声|临时/u.test(summary)) || (lowSalience && emotionalNoise && staleLongAgo))
      forgetMemoryIds.push(memory.id)
  }

  const revisionEvents: AlicizationHumanlikeMemoryCandidate['metabolism']['revisionEvents'] = []
  if (conflictingMemoryIds.length > 0) {
    revisionEvents.push({
      kind: 'revision',
      conflictingMemoryIds: uniqueTexts(conflictingMemoryIds, 8),
      reason: 'New relationship-context evidence says this was not merely a generic status request; revise toward an identity continuity concern.',
    })
  }
  if (vulnerableCareConflictingMemoryIds.length > 0) {
    revisionEvents.push({
      kind: 'revision',
      conflictingMemoryIds: uniqueTexts(vulnerableCareConflictingMemoryIds, 8),
      reason: 'New vulnerable-care evidence says this line should stay care-before-analysis and lighter in closeness; revise older analysis-heavy care memories.',
    })
  }
  for (const correction of input.hostCorrections) {
    revisionEvents.push({
      kind: 'revision',
      conflictingMemoryIds: uniqueTexts([correction.candidateId], 4),
      reason: sanitizeHumanlikeMemoryText([
        'Host corrected',
        correction.field,
        correction.reason || correction.correctedValue,
      ].filter(Boolean).join(' '), 260),
    })
  }

  const shouldProtectContinuityAuthority = (id: string) => {
    if (!metabolismCorrection?.preserveContinuityAuthority)
      return false
    return isHumanlikeContinuityAuthorityMemory(priorMemorySummaryById.get(id) ?? '')
  }

  const nextDownrankMemoryIds = uniqueTexts(downrankMemoryIds, 8)
    .filter((id) => {
      if ((metabolismCorrection?.avoidDownrank || metabolismCorrection?.preserveContinuityAuthority) && shouldProtectContinuityAuthority(id))
        return false
      return true
    })
  const nextMergeMemoryIds = uniqueTexts(mergeMemoryIds, 8)
    .filter(() => !metabolismCorrection?.avoidMerge)
  const nextForgetMemoryIds = uniqueTexts([
    ...forgetMemoryIds,
    ...(metabolismCorrection?.fadeTemporaryNoise
      ? input.priorMemories
          .filter(memory => isHumanlikeTemporaryNoiseMemory(priorMemorySummaryById.get(memory.id) ?? ''))
          .map(memory => memory.id)
      : []),
  ], 8).filter((id) => {
    if ((metabolismCorrection?.avoidForget || metabolismCorrection?.preserveContinuityAuthority) && shouldProtectContinuityAuthority(id))
      return false
    return true
  })
  const correctionReasons = uniqueTexts([
    metabolismCorrection?.preserveContinuityAuthority
      ? 'Host corrected memory metabolism: keep continuity-bearing memories authoritative instead of downranking them.'
      : null,
    metabolismCorrection?.fadeTemporaryNoise
      ? 'Host corrected memory metabolism: let temporary emotional noise fade instead of letting it outrank the living line.'
      : null,
    metabolismCorrection?.avoidMerge
      ? 'Host corrected memory metabolism: do not merge this carry automatically until the host says the traces truly belong together.'
      : null,
  ], 4)

  return {
    revisionEvents,
    forgettingPolicy: {
      downrankMemoryIds: nextDownrankMemoryIds,
      mergeMemoryIds: nextMergeMemoryIds,
      forgetMemoryIds: nextForgetMemoryIds,
      reasons: uniqueTexts([
        ...correctionReasons,
        nextDownrankMemoryIds.length > 0 ? 'Downrank low-value, generic, or superseded summaries.' : null,
        nextMergeMemoryIds.length > 0 ? 'Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory.' : null,
        nextForgetMemoryIds.length > 0 ? 'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.' : null,
      ], 6),
    },
  } satisfies AlicizationHumanlikeMemoryCandidate['metabolism']
}

function buildHumanlikeRecallConfidence(input: {
  baseConfidence: number
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  metabolism: AlicizationHumanlikeMemoryCandidate['metabolism']
  rawText: string
}) {
  let confidence = input.baseConfidence
  const hasConflictRevision = input.metabolism.revisionEvents.some(event => event.conflictingMemoryIds.length > 0)
  const hasDownrankedPrior = input.metabolism.forgettingPolicy.downrankMemoryIds.length > 0
  const isTentativeByLanguage = hasTentativeMemoryMeaningLanguage(input.rawText, input.relationshipContext.summary)

  if (!input.relationshipContext.hostCorrectionApplied && hasConflictRevision && isTentativeByLanguage)
    confidence -= 0.14
  if (!input.relationshipContext.hostCorrectionApplied && hasDownrankedPrior && isTentativeByLanguage)
    confidence -= 0.06
  if (!input.relationshipContext.hostCorrectionApplied && isTentativeByLanguage)
    confidence -= 0.1

  return clamp01(confidence)
}

function buildHumanlikeRecallPosture(input: {
  confidence: number
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  metabolism: AlicizationHumanlikeMemoryCandidate['metabolism']
  rawText: string
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
}) {
  const hasConflictRevision = input.metabolism.revisionEvents.some(event => event.conflictingMemoryIds.length > 0)
  const hasDownrankedPrior = input.metabolism.forgettingPolicy.downrankMemoryIds.length > 0
  const isTentativeByLanguage = hasTentativeMemoryMeaningLanguage(input.rawText, input.relationshipContext.summary)

  if (input.relationshipContext.hostCorrectionApplied || input.hostCorrections.length > 0) {
    return {
      certainty: 'corrected',
      reason: 'Recall follows an explicit host correction rather than the older interpretation.',
    } satisfies AlicizationHumanlikeMemoryCandidate['recallPosture']
  }

  if (input.confidence < 0.72 && ((hasConflictRevision || hasDownrankedPrior) && isTentativeByLanguage)) {
    return {
      certainty: 'tentative',
      reason: 'Current recall is tentative because conflicting newer meaning meets older memory or still carries sparse evidence.',
    } satisfies AlicizationHumanlikeMemoryCandidate['recallPosture']
  }

  return {
    certainty: 'steady',
    reason: 'Current recall posture is steady enough to speak without hedging.',
  } satisfies AlicizationHumanlikeMemoryCandidate['recallPosture']
}

function buildHumanlikeTentativeRecallTendency(relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']) {
  const evidenceText = lowerHumanlikeMemoryText(
    relationshipContext.summary,
    ...relationshipContext.evidence,
  )

  if (/工具壳|tool shell/u.test(evidenceText))
    return 'tool_shell_flattening_risk'
  if (relationshipContext.containsSamePersonTest)
    return 'same_person_test'
  if (relationshipContext.containsContinuityWorry)
    return 'continuity_worry'
  if (relationshipContext.containsProgressPressure)
    return 'progress_pressure'
  return 'relationship_context'
}

function buildHumanlikeNaturalRecallLine(input: {
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  initiativeOpportunity: AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
  recallPosture: AlicizationHumanlikeMemoryCandidate['recallPosture']
  autobiographicalImpact: AlicizationHumanlikeMemoryCandidate['autobiographicalImpact']
  sourceEvidence: string[]
  initiativeStrategyCarry?: string | null
  projectCadenceCarry?: ReturnType<typeof resolveHumanlikeProjectCadenceCarry> | null
}) {
  const relationshipCorrection = findLatestHumanlikeHostCorrection(input.hostCorrections, 'relationshipContext')
  const initiativeCorrection = buildHumanlikeInitiativeCorrectionProfile(input.hostCorrections)
  const autobiographicalCorrection = buildHumanlikeAutobiographicalCorrectionProfile(input.hostCorrections)
  const initiativeStrategyCarry = buildHumanlikeInitiativeStrategyCarryProfile(input.initiativeStrategyCarry)
  if (relationshipCorrection) {
    return sanitizeHumanlikeMemoryText(
      `recall_source=host_correction; field=relationship_context; corrected_value=${relationshipCorrection.correctedValue}; posture=relationship_context_not_status_pressure; visibility=memory_structured`,
      260,
    )
  }
  if (initiativeCorrection) {
    return sanitizeHumanlikeMemoryText(
      `recall_source=host_correction; field=initiative_rhythm; corrected_value=${initiativeCorrection.correction.correctedValue}; opening=wait_for_host_reopen; anti_spam=${initiativeCorrection.avoidTimerSpam ? 'true' : 'opening_sensitive'}; visibility=memory_structured`,
      260,
    )
  }
  if (autobiographicalCorrection) {
    return sanitizeHumanlikeMemoryText(
      `recall_source=host_correction; field=autobiographical_impact; corrected_value=${autobiographicalCorrection.correction.correctedValue}; posture=self_revision_not_progress_pressure; visibility=memory_structured`,
      260,
    )
  }
  if (initiativeStrategyCarry) {
    return initiativeStrategyCarry.accepted && (initiativeStrategyCarry.memoryLed || initiativeStrategyCarry.stillReceiving)
      ? 'recall_source=initiative_outcome; outcome=accepted; opening=memory_led_receiving; pressure=low; visibility=memory_structured'
      : 'recall_source=initiative_outcome; outcome=overreached; opening=clearer_signal_required; pressure=none; visibility=memory_structured'
  }
  if (input.recallPosture.certainty === 'tentative') {
    return sanitizeHumanlikeMemoryText(
      `recall_certainty=tentative; tendency=${buildHumanlikeTentativeRecallTendency(input.relationshipContext)}; status_pressure=downranked; visibility=memory_structured`,
      260,
    )
  }
  const relationshipEvidenceParts = [
    input.relationshipContext.summary,
    ...input.relationshipContext.evidence,
    ...input.sourceEvidence,
    input.autobiographicalImpact.stablePreferenceHint,
    input.autobiographicalImpact.selfNarrativeDelta,
  ]
  const relationshipEvidence = lowerHumanlikeMemoryText(...relationshipEvidenceParts)
  const relationshipRepairLearning = buildHumanlikeRelationshipRepairLearningProfile(...relationshipEvidenceParts)
  if (executionBoundaryHoldPattern.test(relationshipEvidence)) {
    return sanitizeHumanlikeMemoryText(
      'recall_source=execution_boundary; boundary=confirmation_before_dispatch; next_action=await_explicit_permission; visibility=memory_structured',
      260,
    )
  }
  if (input.projectCadenceCarry?.naturalRecallLine)
    return sanitizeHumanlikeMemoryText(input.projectCadenceCarry.naturalRecallLine, 260)
  if (relationshipRepairLearning.missed) {
    return sanitizeHumanlikeMemoryText(
      'repair_learning=missed; risk=mechanical_misread; next_posture=relationship_meaning_first; visibility=memory_structured',
      260,
    )
  }
  if (
    input.relationshipContext.primaryIntent === 'same-person-test'
    || input.relationshipContext.containsSamePersonTest
    || sameHerContinuityPattern.test(input.relationshipContext.summary)
  ) {
    return 'relationship_intent=same_person_test; risk=tool_shell_flattening; posture=continuity_first; closure=unfinished; visibility=memory_structured'
  }
  if (relationshipRepairLearning.received) {
    return sanitizeHumanlikeMemoryText(
      'repair_learning=received; preferred_distance=light_presence; posture=relationship_meaning_first; visibility=memory_structured',
      260,
    )
  }
  const vulnerableCareEvidence = relationshipEvidence
  const remembersHostTired = /我(?:好|有点|现在|真的)?(?:困|累)|疲惫|想睡|sleepy|tired|drained|exhausted/u.test(vulnerableCareEvidence)
  const remembersHostHurt = /受伤|hurt|疼|委屈|刺痛|难受/u.test(vulnerableCareEvidence)
  const remembersHostSad = /伤心|难过|sad|\blow(?!-)\b|低落/u.test(vulnerableCareEvidence)
  const remembersHostStressed = /压力|紧绷|撑不住|overloaded|overwhelmed|stressed/u.test(vulnerableCareEvidence)
  const remembersLightTouch = /轻一点|lighter|light touch|gentle|gentler|lower-pressure|低压/u.test(vulnerableCareEvidence)
  const remembersBoundary = /别一下子把距离拉近|不把距离一下子拉近|留白|空间|边界|不要太近/u.test(vulnerableCareEvidence)
  if (remembersHostTired || remembersHostHurt || remembersHostSad || remembersHostStressed) {
    const hostState = remembersHostTired
      ? 'tired'
      : remembersHostHurt
        ? 'hurt'
        : remembersHostSad
          ? 'sad'
          : 'overloaded'
    return sanitizeHumanlikeMemoryText(
      `host_state_evidence=${hostState}; preferred_distance=${remembersLightTouch ? 'low_pressure' : 'softened_closeness'}; boundary=${remembersBoundary ? 'preserve_distance' : 'unspecified'}; visibility=memory_structured`,
      260,
    )
  }
  if (input.initiativeOpportunity.kind === 'low-pressure-follow-up')
    return 'initiative_recall=low_pressure_follow_up; status=unresolved; opening=wait_for_relevant_window; visibility=memory_structured'
  return 'relationship_context=present; fact_repetition_only=false; visibility=memory_structured'
}

export function buildHumanlikeMemoryCandidate(input: AlicizationHumanlikeMemoryCandidateInput): AlicizationHumanlikeMemoryCandidate {
  const hostCorrections = normalizeHumanlikeHostCorrections(input.hostCorrections)
  const sourceChannels = collectHumanlikeMemorySourceChannels(input)
  const hasInitiativeOutcomeLearning = Boolean(
    sanitizeHumanlikeMemoryText(input.initiative?.outcome, 80)
    || sanitizeHumanlikeMemoryText(input.initiative?.userReaction, 80),
  )
  const relationshipContext = buildHumanlikeRelationshipContext(input)
  const projectCadenceCarry = resolveHumanlikeProjectCadenceCarry({
    candidateInput: input,
    relationshipContext,
  })
  const evidence = buildHumanlikeMemoryEvidence(input, projectCadenceCarry)
  const rawText = lowerHumanlikeMemoryText(
    input.dialogue?.userText,
    input.dialogue?.assistantText,
    input.execution?.summary,
    input.hostEmotion?.label,
    input.hostEmotion?.summary,
    input.selfEmotion?.label,
    input.selfEmotion?.summary,
    input.embodiment?.summary,
    input.affectiveResidue?.dominantResidueKind,
    input.affectiveResidue?.summary,
    input.affectiveResidue?.relationshipCadence?.summary,
    input.affectiveResidue?.relationshipCadence?.cadenceMode,
    input.initiative?.outcome,
    input.initiative?.userReaction,
    input.initiativeStrategyCarry,
    projectCadenceCarry.cadenceSummary,
    relationshipContext.summary,
    input.autobiographical?.lesson,
    ...hostCorrections.flatMap(correction => [correction.correctedValue, correction.reason]),
  )
  const longTermWorthiness = buildHumanlikeLongTermWorthiness({
    sourceChannels,
    relationshipContext,
    rawText,
    hasInitiativeOutcomeLearning,
    executionStatus: input.execution?.status,
    hostEmotionIntensity: input.hostEmotion?.intensity,
    selfEmotionIntensity: input.selfEmotion?.intensity,
  })
  const emotionalResidue = buildHumanlikeEmotionalResidue({
    candidateInput: input,
    relationshipContext,
    hostCorrections,
  })
  const metabolism = buildHumanlikeMemoryMetabolism({
    now: input.now,
    priorMemories: input.priorMemories ?? [],
    hostCorrections,
    currentText: rawText,
  })
  const baseConfidence = clamp01(
    longTermWorthiness.score * 0.56
    + emotionalResidue.intensity * 0.24
    + Math.min(0.2, sourceChannels.length * 0.04),
  )
  const confidence = buildHumanlikeRecallConfidence({
    baseConfidence,
    relationshipContext,
    metabolism,
    rawText,
  })
  const recallPosture = buildHumanlikeRecallPosture({
    confidence,
    relationshipContext,
    metabolism,
    rawText,
    hostCorrections,
  })
  const emotionKernelInfluence = buildHumanlikeEmotionKernelInfluence({
    residue: emotionalResidue,
    embodimentSummary: sanitizeHumanlikeMemoryText(input.embodiment?.summary, 260),
    relationshipContext,
    initiativeStrategyCarry: input.initiativeStrategyCarry,
    recallPosture,
  })
  const initiativeOpportunity = buildHumanlikeInitiativeOpportunity({
    longTermWorthiness,
    residue: emotionalResidue,
    executionStatus: input.execution?.status,
    relationshipContext,
    hostCorrections,
    initiativeStrategyCarry: input.initiativeStrategyCarry,
    recallPosture,
  })
  const initiativeOutcomeRecord = buildHumanlikeInitiativeOutcomeRecord(input)
  const embodimentTrace = buildHumanlikeEmbodimentTrace({
    candidateInput: input,
    relationshipContext,
    residue: emotionalResidue,
    hostCorrections,
    initiativeStrategyCarry: input.initiativeStrategyCarry,
    projectCadenceCarry,
    recallPosture,
  })
  const autobiographicalImpact = buildHumanlikeAutobiographicalImpact(input, hostCorrections, projectCadenceCarry)

  const candidate: AlicizationHumanlikeMemoryCandidate = {
    id: buildHumanlikeMemoryCandidateId(input),
    turnId: sanitizeHumanlikeMemoryText(input.turnId, 120),
    sessionId: sanitizeHumanlikeMemoryText(input.sessionId ?? null, 120) || null,
    createdAt: input.now,
    sourceChannels,
    evidence,
    relationshipContext,
    longTermWorthiness,
    emotionalResidue,
    emotionKernelInfluence,
    initiativeOpportunity,
    initiativeOutcomeRecord,
    embodimentTrace,
    autobiographicalImpact,
    metabolism,
    auditTrail: {
      whyRemember: sanitizeHumanlikeMemoryText([
        longTermWorthiness.reasons.join(', '),
        hostCorrections.length > 0 ? 'host correction' : '',
        relationshipContext.summary,
      ].filter(Boolean).join(' | '), 420),
      confidence,
      sourceEvidence: evidence,
      correctionSurface: {
        userCorrectableFields: [
          'relationshipContext',
          'emotionalResidue',
          'initiativeOpportunity',
          'embodimentTrace',
          'autobiographicalImpact',
          'metabolism',
        ],
        explanation: 'The host can correct why this was remembered, which emotion residue it carries, and how it should affect future initiative/body/self narrative.',
      },
    },
    recallPosture,
    naturalRecallLine: '',
  }
  candidate.naturalRecallLine = buildHumanlikeNaturalRecallLine({
    relationshipContext: candidate.relationshipContext,
    initiativeOpportunity: candidate.initiativeOpportunity,
    hostCorrections,
    recallPosture: candidate.recallPosture,
    autobiographicalImpact: candidate.autobiographicalImpact,
    sourceEvidence: candidate.evidence,
    initiativeStrategyCarry: input.initiativeStrategyCarry,
    projectCadenceCarry,
  })
  return candidate
}

export interface AlicizationHumanlikeMemoryAuditEntry {
  id: string
  turnId: string | null
  sessionId: string | null
  createdAt: number
  sourceChannels: string[]
  relationshipContext: string
  relationshipThreadAnchor: string
  relationshipPrimaryIntent: string
  relationshipSignals: string[]
  emotionalResidueTags: string[]
  hostEmotionLabel: string
  hostEmotionSummary: string
  selfEmotionLabel: string
  selfEmotionSummary: string
  initiativeKind: string
  initiativeSuggestedWindow: string
  initiativePressure: string
  initiativeAntiSpamReason: string
  initiativeVisibleLine: string
  embodimentSummary: string
  embodimentRecallStrength: string
  embodimentModalityRisk: string
  embodimentResidentFace: string
  embodimentResidentAction: string
  embodimentResidentMode: string
  embodimentResidentReason: string
  autobiographicalImpact: string
  stablePreferenceHint: string
  whyRemember: string
  confidence: number
  recallCertainty: 'steady' | 'tentative' | 'corrected'
  recallReason: string
  naturalRecallLine: string
  userCorrectableFields: string[]
  revisionMemoryIds: string[]
  revisionReasons: string[]
  downrankMemoryIds: string[]
  mergeMemoryIds: string[]
  forgetMemoryIds: string[]
  metabolismReasons: string[]
  corrections: Array<{
    status: 'recorded'
    candidateId: string
    field: string
    previousValue: string | null
    correctedValue: string
    reason: string | null
    decisionTraceId: string | null
    turnId: string | null
    sessionId: string | null
    createdAt: number
  }>
}

function humanlikeCandidateFromMindTurnPayload(payload: unknown) {
  const object = asHumanlikeMemoryObject(payload)
  const candidate = asHumanlikeMemoryObject(object?.humanlikeMemoryCandidate)
  if (!candidate)
    return null
  const id = sanitizeHumanlikeMemoryText(candidate.id, 160)
  if (!id)
    return null
  return candidate
}

function readHumanlikeAuditTraceLabel(trace: string[], kind: 'host' | 'self') {
  const entry = trace.find(item => item.startsWith(`${kind}:`))
  if (!entry)
    return ''

  return sanitizeHumanlikeMemoryText(
    entry
      .slice(`${kind}:`.length)
      .split(/\s+/u)[0]
      ?.replace(/[^a-z-]+$/u, ''),
    48,
  )
}

function readHumanlikeAuditTraceReason(trace: string[], kind: 'host' | 'self') {
  const entry = trace.find(item => item.startsWith(`${kind}-reason:`))
  if (!entry)
    return ''
  return sanitizeHumanlikeMemoryText(entry.slice(`${kind}-reason:`.length), 260)
}

export function buildHumanlikeMemoryAuditEntriesFromMindTurnEvents(events: Array<{
  decisionTraceId?: string | null
  kind?: string | null
  turnId?: string | null
  sessionId?: string | null
  payload?: unknown
  createdAt?: number | null
}>): AlicizationHumanlikeMemoryAuditEntry[] {
  const correctionsByCandidateId = new Map<string, AlicizationHumanlikeMemoryAuditEntry['corrections']>()
  for (const event of events) {
    if (event.kind !== 'humanlike-memory-corrected')
      continue

    const payload = asHumanlikeMemoryObject(event.payload)
    const candidateId = sanitizeHumanlikeMemoryText(payload?.candidateId, 160)
    const field = sanitizeHumanlikeMemoryText(payload?.field, 80)
    const correctedValue = sanitizeHumanlikeMemoryText(payload?.correctedValue, 420)
    if (!candidateId || !field || !correctedValue)
      continue

    const correction = {
      status: 'recorded' as const,
      candidateId,
      field,
      previousValue: sanitizeHumanlikeMemoryText(payload?.previousValue, 420) || null,
      correctedValue,
      reason: sanitizeHumanlikeMemoryText(payload?.reason, 260) || null,
      decisionTraceId: sanitizeHumanlikeMemoryText(event.decisionTraceId, 160) || null,
      turnId: sanitizeHumanlikeMemoryText(event.turnId, 120) || null,
      sessionId: sanitizeHumanlikeMemoryText(event.sessionId, 120) || null,
      createdAt: Math.max(0, Math.floor(numberFromHumanlikeMemory(event.createdAt, 0))),
    }
    correctionsByCandidateId.set(candidateId, [
      ...(correctionsByCandidateId.get(candidateId) ?? []),
      correction,
    ].sort((left, right) => right.createdAt - left.createdAt))
  }

  return events
    .filter(event => event.kind === 'person-state-updated')
    .map((event) => {
      const candidate = humanlikeCandidateFromMindTurnPayload(event.payload)
      if (!candidate)
        return null

      const relationshipContext = asHumanlikeMemoryObject(candidate.relationshipContext)
      const emotionalResidue = asHumanlikeMemoryObject(candidate.emotionalResidue)
      const initiativeOpportunity = asHumanlikeMemoryObject(candidate.initiativeOpportunity)
      const embodimentTrace = asHumanlikeMemoryObject(candidate.embodimentTrace)
      const autobiographicalImpact = asHumanlikeMemoryObject(candidate.autobiographicalImpact)
      const metabolism = asHumanlikeMemoryObject(candidate.metabolism)
      const auditTrail = asHumanlikeMemoryObject(candidate.auditTrail)
      const correctionSurface = asHumanlikeMemoryObject(auditTrail?.correctionSurface)
      const emotionalResidueTrace = stringListFromHumanlikeMemory(emotionalResidue?.trace, 16)
      const revisionEventsRaw = Array.isArray(metabolism?.revisionEvents) ? metabolism?.revisionEvents : []
      const residentState = asHumanlikeMemoryObject(embodimentTrace?.residentState)
      const revisionMemoryIds = uniqueTexts(
        revisionEventsRaw.flatMap((entry) => {
          const revision = asHumanlikeMemoryObject(entry)
          return stringListFromHumanlikeMemory(revision?.conflictingMemoryIds, 16)
        }),
        16,
      )
      const revisionReasons = uniqueTexts(
        revisionEventsRaw.map((entry) => {
          const revision = asHumanlikeMemoryObject(entry)
          return sanitizeHumanlikeMemoryText(revision?.reason, 260) || null
        }),
        8,
      )
      const forgettingPolicy = asHumanlikeMemoryObject(metabolism?.forgettingPolicy)

      return {
        id: sanitizeHumanlikeMemoryText(candidate.id, 160),
        turnId: sanitizeHumanlikeMemoryText(candidate.turnId ?? event.turnId ?? null, 120) || null,
        sessionId: sanitizeHumanlikeMemoryText(candidate.sessionId ?? event.sessionId ?? null, 120) || null,
        createdAt: Math.max(0, Math.floor(numberFromHumanlikeMemory(candidate.createdAt, numberFromHumanlikeMemory(event.createdAt, 0)))),
        sourceChannels: stringListFromHumanlikeMemory(candidate.sourceChannels, 8),
        relationshipContext: sanitizeHumanlikeMemoryText(relationshipContext?.summary, 420),
        relationshipThreadAnchor: sanitizeHumanlikeMemoryText(relationshipContext?.threadAnchor, 160),
        relationshipPrimaryIntent: sanitizeHumanlikeMemoryText(relationshipContext?.primaryIntent, 80),
        relationshipSignals: stringListFromHumanlikeMemory(relationshipContext?.signals, 8),
        emotionalResidueTags: stringListFromHumanlikeMemory(emotionalResidue?.tags, 8),
        hostEmotionLabel: readHumanlikeAuditTraceLabel(emotionalResidueTrace, 'host'),
        hostEmotionSummary: readHumanlikeAuditTraceReason(emotionalResidueTrace, 'host'),
        selfEmotionLabel: readHumanlikeAuditTraceLabel(emotionalResidueTrace, 'self'),
        selfEmotionSummary: readHumanlikeAuditTraceReason(emotionalResidueTrace, 'self'),
        initiativeKind: sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80),
        initiativeSuggestedWindow: sanitizeHumanlikeMemoryText(initiativeOpportunity?.suggestedWindow, 220),
        initiativePressure: sanitizeHumanlikeMemoryText(initiativeOpportunity?.pressure, 40),
        initiativeAntiSpamReason: sanitizeHumanlikeMemoryText(initiativeOpportunity?.antiSpamReason, 260),
        initiativeVisibleLine: sanitizeHumanlikeMemoryText(initiativeOpportunity?.visibleLine, 260),
        embodimentSummary: sanitizeHumanlikeMemoryText(embodimentTrace?.summary, 260),
        embodimentRecallStrength: sanitizeHumanlikeMemoryText(embodimentTrace?.recallStrength, 80),
        embodimentModalityRisk: sanitizeHumanlikeMemoryText(embodimentTrace?.modalityContradictionRisk, 80),
        embodimentResidentFace: sanitizeHumanlikeMemoryText(residentState?.facialCue, 80),
        embodimentResidentAction: sanitizeHumanlikeMemoryText(residentState?.actionCue, 80),
        embodimentResidentMode: sanitizeHumanlikeMemoryText(residentState?.mode, 80),
        embodimentResidentReason: sanitizeHumanlikeMemoryText(residentState?.reason, 220),
        autobiographicalImpact: sanitizeHumanlikeMemoryText(autobiographicalImpact?.selfNarrativeDelta, 260),
        stablePreferenceHint: sanitizeHumanlikeMemoryText(autobiographicalImpact?.stablePreferenceHint, 260),
        whyRemember: sanitizeHumanlikeMemoryText(auditTrail?.whyRemember, 420),
        confidence: clamp01(numberFromHumanlikeMemory(auditTrail?.confidence, 0)),
        recallCertainty: sanitizeHumanlikeMemoryText(asHumanlikeMemoryObject(candidate.recallPosture)?.certainty, 40) as AlicizationHumanlikeMemoryAuditEntry['recallCertainty'],
        recallReason: sanitizeHumanlikeMemoryText(asHumanlikeMemoryObject(candidate.recallPosture)?.reason, 260),
        naturalRecallLine: sanitizeHumanlikeMemoryText(candidate.naturalRecallLine, 260),
        userCorrectableFields: stringListFromHumanlikeMemory(correctionSurface?.userCorrectableFields, 12),
        revisionMemoryIds,
        revisionReasons,
        downrankMemoryIds: stringListFromHumanlikeMemory(forgettingPolicy?.downrankMemoryIds, 16),
        mergeMemoryIds: stringListFromHumanlikeMemory(forgettingPolicy?.mergeMemoryIds, 16),
        forgetMemoryIds: stringListFromHumanlikeMemory(forgettingPolicy?.forgetMemoryIds, 16),
        metabolismReasons: stringListFromHumanlikeMemory(forgettingPolicy?.reasons, 8),
        corrections: correctionsByCandidateId.get(sanitizeHumanlikeMemoryText(candidate.id, 160)) ?? [],
      } satisfies AlicizationHumanlikeMemoryAuditEntry
    })
    .filter((entry): entry is AlicizationHumanlikeMemoryAuditEntry => Boolean(entry))
    .sort((left, right) => right.createdAt - left.createdAt)
}

export const mapMemorySourceToProvenance = mapAlicizationMemorySourceToProvenance

export const mapFragmentSourceKindToProvenance = mapAlicizationFragmentSourceKindToProvenance

export const formatMemoryProvenanceLabel = formatAlicizationMemoryProvenanceLabel

export function summarizeRelationshipShift(shift: AlicizationEpisodicEventRecord['relationshipShift']) {
  if (!shift)
    return ''
  const parts: string[] = []
  if (Math.abs(shift.trustDelta) >= 0.02)
    parts.push(`trust ${shift.trustDelta >= 0 ? 'up' : 'down'} ${Math.abs(shift.trustDelta).toFixed(2)}`)
  if (Math.abs(shift.closenessDelta) >= 0.02)
    parts.push(`closeness ${shift.closenessDelta >= 0 ? 'up' : 'down'} ${Math.abs(shift.closenessDelta).toFixed(2)}`)
  if (Math.abs(shift.boundaryDelta) >= 0.02)
    parts.push(`boundary ${shift.boundaryDelta >= 0 ? 'firmer' : 'strained'} ${Math.abs(shift.boundaryDelta).toFixed(2)}`)
  if (Math.abs(shift.burdenDelta) >= 0.02)
    parts.push(`burden ${shift.burdenDelta >= 0 ? 'up' : 'down'} ${Math.abs(shift.burdenDelta).toFixed(2)}`)
  if (Math.abs(shift.repairDelta) >= 0.02)
    parts.push(`repair ${shift.repairDelta >= 0 ? 'activated' : 'cooled'} ${Math.abs(shift.repairDelta).toFixed(2)}`)
  return parts.join(', ')
}

export function computeEpisodicEventSalience(input: {
  relationshipShift?: AlicizationEpisodicEventRecord['relationshipShift'] | null
  confidence?: number | null
  sourceKind?: string | null
  emotionalWeight?: number | null
  existing?: number | null
}) {
  const shift = input.relationshipShift
  const shiftPressure = shift
    ? Math.abs(shift.closenessDelta)
    + Math.abs(shift.trustDelta)
    + Math.abs(shift.boundaryDelta)
    + Math.abs(shift.burdenDelta)
    + Math.abs(shift.misreadDelta)
    + Math.abs(shift.repairDelta)
    : 0
  const sourceBoost = input.sourceKind === 'dream' || input.sourceKind === 'dream-reforge'
    ? 0.08
    : input.sourceKind === 'dialogue-feedback'
      ? 0.06
      : input.sourceKind === 'execution-result'
        ? 0.05
        : 0.04
  return clamp01(
    (Number(input.existing ?? 0) * 0.35)
    + Math.min(0.48, shiftPressure * 0.9)
    + clamp01(Number(input.confidence ?? 0.6)) * 0.24
    + clamp01(Number(input.emotionalWeight ?? 0)) * 0.12
    + sourceBoost,
  )
}

function inferContextKey(event: AlicizationEpisodicEventRecord) {
  const text = `${event.threadAnchor ?? ''} ${event.whereSummary ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`
  if (lateNightPattern.test(text))
    return 'late-night'
  if (executionContextPattern.test(text))
    return 'execution'
  if (focusedContextPattern.test(text))
    return 'focused-work'
  if (openContextPattern.test(text) || closenessPattern.test(text))
    return 'open-window'
  return 'general'
}

function describePreference(context: string, score: number, event: AlicizationEpisodicEventRecord | null): string {
  const text = `${event?.whatChanged ?? ''} ${event?.relationshipMeaning ?? ''} ${event?.lesson ?? ''} ${event?.whatHappened ?? ''}`
  if (spacePattern.test(text) || score <= 0.42) {
    return context === 'execution'
      ? 'Bound execution with explicit consent and lighter interruption pressure.'
      : 'Lighter touch, more room, less interruption pressure.'
  }
  if (closenessPattern.test(text) || score >= 0.62) {
    return context === 'late-night'
      ? 'Soft care can come a little closer, but pacing should stay gentle.'
      : 'Warmer directness can land when the opening is clearly there.'
  }
  return 'Stay near, but keep the approach bounded and responsive to the host move.'
}

function describeRoutine(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whereSummary ?? ''} ${event.threadAnchor ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`
  if (lateNightPattern.test(text))
    return 'Late-night windows need slower pacing and more rest-sensitive companionship.'
  if (focusedContextPattern.test(text))
    return 'Focused work windows usually need space first, then precise follow-up.'
  if (executionContextPattern.test(text))
    return 'Execution flows land better when proposal, action, and callback stay bounded.'
  if (routinePattern.test(text))
    return sanitizeHumanlikeMemoryText(event.whatHappened, 140)
  return ''
}

function describeSensitivity(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''}`
  if (intrusivePattern.test(text))
    return 'Pressure and over-close timing become intrusive quickly.'
  if (roboticPattern.test(text))
    return 'Template-like speech breaks the sense of a living reply.'
  if (burdenPattern.test(text))
    return 'When the host is tired or busy, interruption cost rises fast.'
  if (spacePattern.test(text))
    return 'Boundary pressure is felt strongly; leaving room matters.'
  return ''
}

function describeRepairTrigger(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''} ${event.emotionTags.join(' ')} ${event.tags.join(' ')}`
  if (repairPattern.test(text))
    return 'When the host says "not this" or a seam is missed, repair before continuing.'
  if (roboticPattern.test(text))
    return 'If the reply feels robotic, add lived-in specificity instead of shell narration.'
  if (intrusivePattern.test(text))
    return 'If closeness feels heavy, back off first and reopen with lighter presence.'
  return ''
}

function describeBurden(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whereSummary ?? ''} ${event.whatHappened} ${event.whatChanged ?? ''} ${event.tags.join(' ')}`
  if (lateNightPattern.test(text))
    return 'Late-night fatigue can turn small nudges into real burden.'
  if (focusedContextPattern.test(text))
    return 'Focused work gets overloaded quickly by extra conversational pressure.'
  if (executionContextPattern.test(text) && intrusivePattern.test(text))
    return 'Execution callbacks can feel interruptive when timing is off.'
  if (burdenPattern.test(text))
    return sanitizeHumanlikeMemoryText(event.whatChanged || event.whatHappened, 140)
  return ''
}

function computeTrustScore(events: AlicizationEpisodicEventRecord[], relationshipDynamics: AlicizationRelationshipDynamicsState | null | undefined) {
  let score = 0.5
  for (const event of events) {
    const shift = event.relationshipShift
    if (!shift)
      continue
    score += shift.trustDelta * 0.9
    score += shift.closenessDelta * 0.45
    score -= Math.max(0, shift.boundaryDelta * -1) * 0.55
    score -= Math.max(0, shift.burdenDelta) * 0.35
  }
  if (relationshipDynamics) {
    score += relationshipDynamics.sensibilityDelta * 0.4
    score -= Math.max(0, relationshipDynamics.obedienceDelta * -1) * 0.15
  }
  return clamp01(score)
}

function trustStage(score: number): AlicizationHostPersonModelSnapshot['trustLadder']['stage'] {
  if (score < 0.32)
    return 'guarded'
  if (score < 0.52)
    return 'cautious-open'
  if (score < 0.76)
    return 'warming'
  return 'trusted'
}

function buildClosenessPreferences(events: AlicizationEpisodicEventRecord[]): AlicizationHostPersonClosenessPreference[] {
  const buckets = new Map<string, {
    score: number
    count: number
    strongest: AlicizationEpisodicEventRecord | null
  }>()

  for (const event of events) {
    const key = inferContextKey(event)
    const shift = event.relationshipShift
    const delta = shift
      ? shift.trustDelta + shift.closenessDelta - Math.max(0, shift.burdenDelta) - Math.max(0, -shift.boundaryDelta)
      : (event.salience - 0.5) * 0.4
    const current = buckets.get(key) ?? {
      score: 0,
      count: 0,
      strongest: null,
    }
    current.score += delta
    current.count += 1
    if (!current.strongest || event.salience >= current.strongest.salience)
      current.strongest = event
    buckets.set(key, current)
  }

  return [...buckets.entries()]
    .map(([context, bucket]) => ({
      context,
      preference: describePreference(context, clamp01(0.5 + bucket.score / Math.max(1, bucket.count)), bucket.strongest),
      confidence: clamp01(Math.min(1, bucket.count / 4) * 0.5 + Math.min(1, Math.abs(bucket.score)) * 0.4 + (bucket.strongest?.salience ?? 0) * 0.1),
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function factStatements(facts: AlicizationMemoryFact[]) {
  return facts
    .map(fact => sanitizeHumanlikeMemoryText(`${fact.subject} ${fact.predicate} ${fact.object}`, 180))
    .filter(Boolean)
}

function scoreHumanlikeFactDurability(fact: AlicizationMemoryFact) {
  const stage = fact.knowledgeStage ?? 'working-understanding'
  const validation = fact.validationStatus ?? 'unverified'
  let score = fact.confidence
  if (stage === 'internalized-long-horizon-knowledge')
    score += 0.3
  else if (stage === 'validated-knowledge')
    score += 0.2
  else if (stage === 'ephemeral-observation')
    score -= 0.15

  if (validation === 'validated')
    score += 0.16
  else if (validation === 'provisional')
    score += 0.05
  else if (validation === 'superseded')
    score -= 0.4

  if ((fact.supersedes?.length ?? 0) > 0)
    score += 0.06
  if ((fact.conflictsWith?.length ?? 0) > 0)
    score -= 0.05

  return score
}

function relationshipOutcomeStatements(outcomes: AlicizationRelationshipOutcomeRecord[]) {
  return outcomes.flatMap(outcome => uniqueTexts([
    outcome.summary,
    outcome.actionSummary,
    summarizeRelationshipShift({
      trustDelta: outcome.trustDelta,
      closenessDelta: outcome.closenessDelta,
      boundaryDelta: outcome.boundaryDelta,
      burdenDelta: outcome.burdenDelta,
      repairDelta: outcome.repairDelta,
    } as AlicizationEpisodicEventRecord['relationshipShift']),
  ], 4))
}

function personaReinforcementStatements(events: AlicizationPersonaReinforcementEventRecord[]) {
  return events.flatMap(event => uniqueTexts([
    event.summary,
    `${event.dimension}:${event.valence}:${event.delta >= 0 ? '+' : ''}${event.delta.toFixed(2)}`,
  ], 2))
}

function consolidationStatements(consolidations: AlicizationMemoryConsolidationRecord[]) {
  return consolidations.flatMap(record => uniqueTexts([
    record.summary,
    record.lesson,
    ...record.cues,
  ], 4))
}

function inferConsolidationContext(record: AlicizationMemoryConsolidationRecord) {
  const text = `${record.facet ?? ''} ${record.periodKey} ${record.summary} ${record.lesson ?? ''} ${record.cues.join(' ')}`.toLowerCase()
  if (lateNightPattern.test(text))
    return 'late-night'
  if (focusedContextPattern.test(text))
    return 'focused-work'
  if (executionContextPattern.test(text))
    return 'execution'
  if (openContextPattern.test(text) || closenessPattern.test(text))
    return 'open-window'
  return 'general'
}

function inferOutcomeContext(record: AlicizationRelationshipOutcomeRecord) {
  const text = `${record.actionSummary} ${record.summary}`.toLowerCase()
  if (lateNightPattern.test(text))
    return 'late-night'
  if (focusedContextPattern.test(text))
    return 'focused-work'
  if (executionContextPattern.test(text))
    return 'execution'
  if (openContextPattern.test(text) || closenessPattern.test(text))
    return 'open-window'
  return 'general'
}

function buildClosenessPreferencesFromConsolidations(consolidations: AlicizationMemoryConsolidationRecord[]) {
  const buckets = new Map<string, {
    score: number
    count: number
    strongest: AlicizationMemoryConsolidationRecord | null
  }>()

  for (const record of consolidations) {
    const key = inferConsolidationContext(record)
    const text = `${record.summary} ${record.lesson ?? ''} ${record.cues.join(' ')}`
    const delta = spacePattern.test(text)
      ? -0.12
      : closenessPattern.test(text)
        ? 0.12
        : repairPattern.test(text)
          ? -0.06
          : 0
    const current = buckets.get(key) ?? {
      score: 0,
      count: 0,
      strongest: null,
    }
    current.score += delta
    current.count += 1
    if (!current.strongest || record.confidence >= current.strongest.confidence)
      current.strongest = record
    buckets.set(key, current)
  }

  return [...buckets.entries()]
    .map(([context, bucket]) => ({
      context,
      preference: describePreference(
        context,
        clamp01(0.5 + bucket.score / Math.max(1, bucket.count)),
        bucket.strongest
          ? {
              id: bucket.strongest.id,
              whatHappened: bucket.strongest.summary,
              whatChanged: bucket.strongest.lesson,
              relationshipMeaning: bucket.strongest.summary,
              lesson: bucket.strongest.lesson,
            } as AlicizationEpisodicEventRecord
          : null,
      ),
      confidence: clamp01(Math.min(1, bucket.count / 4) * 0.45 + (bucket.strongest?.confidence ?? 0) * 0.45),
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function buildClosenessPreferencesFromOutcomes(outcomes: AlicizationRelationshipOutcomeRecord[]) {
  const buckets = new Map<string, {
    score: number
    count: number
    strongest: AlicizationRelationshipOutcomeRecord | null
  }>()

  for (const record of outcomes) {
    const key = inferOutcomeContext(record)
    const delta = record.trustDelta
      + record.closenessDelta
      - Math.max(0, record.burdenDelta)
      - Math.max(0, -record.boundaryDelta)
    const current = buckets.get(key) ?? {
      score: 0,
      count: 0,
      strongest: null,
    }
    current.score += delta
    current.count += 1
    if (!current.strongest || Math.abs(delta) >= Math.abs((current.strongest.trustDelta ?? 0) + (current.strongest.closenessDelta ?? 0)))
      current.strongest = record
    buckets.set(key, current)
  }

  return [...buckets.entries()]
    .map(([context, bucket]) => ({
      context,
      preference: describePreference(
        context,
        clamp01(0.5 + bucket.score / Math.max(1, bucket.count)),
        bucket.strongest
          ? {
              id: bucket.strongest.id,
              whatHappened: bucket.strongest.summary,
              whatChanged: bucket.strongest.actionSummary,
              relationshipMeaning: bucket.strongest.summary,
              lesson: bucket.strongest.summary,
            } as AlicizationEpisodicEventRecord
          : null,
      ),
      confidence: clamp01(Math.min(1, bucket.count / 4) * 0.45 + Math.min(1, Math.abs(bucket.score)) * 0.35 + (bucket.strongest ? 0.12 : 0)),
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function buildClosenessPreferencesFromPersonStateUpdateSurface(surface: AlicizationPersonStateUpdateSurface | null | undefined) {
  const current = surface ?? null
  if (!current)
    return []
  const contexts = current.dominantContexts.length > 0
    ? current.dominantContexts
    : ['general']
  return contexts.slice(0, 4).map((context, index) => ({
    context,
    preference: current.preferenceHints[index] ?? current.preferenceHints[0] ?? 'Stay near, but keep the approach bounded and responsive to the host move.',
    confidence: clamp01(0.52 - index * 0.08 + Math.min(0.18, Math.abs(current.relationshipShift.trustDelta) + Math.abs(current.relationshipShift.closenessDelta))),
  }))
}

function mergeClosenessPreferences(input: {
  events: AlicizationHostPersonClosenessPreference[]
  consolidations: AlicizationHostPersonClosenessPreference[]
  outcomes?: AlicizationHostPersonClosenessPreference[]
  updates?: AlicizationHostPersonClosenessPreference[]
}) {
  const merged = new Map<string, AlicizationHostPersonClosenessPreference>()
  for (const item of [...input.events, ...input.consolidations, ...(input.outcomes ?? []), ...(input.updates ?? [])]) {
    const existing = merged.get(item.context)
    if (!existing || item.confidence >= existing.confidence)
      merged.set(item.context, item)
  }
  return [...merged.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
}

function rankHostModelEvents(events: AlicizationEpisodicEventRecord[]) {
  return [...events].sort((left, right) => {
    if (left.salience !== right.salience)
      return right.salience - left.salience
    return right.occurredAt - left.occurredAt
  })
}

function filterSupersededHostModelEvents(events: AlicizationEpisodicEventRecord[]) {
  const ranked = rankHostModelEvents(events)
  return ranked.filter((event, _index, items) => !items.some((candidate) => {
    if (candidate.id === event.id)
      return false
    return deriveMemorySupersessionSignal({
      current: event,
      candidate,
    }).suppressCurrent
  }))
}

export function buildHostPersonModelSnapshot(input: {
  events: AlicizationEpisodicEventRecord[]
  facts: AlicizationMemoryFact[]
  consolidations?: AlicizationMemoryConsolidationRecord[]
  relationshipOutcomes?: AlicizationRelationshipOutcomeRecord[]
  reinforcementEvents?: AlicizationPersonaReinforcementEventRecord[]
  personStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
  relationshipDynamics?: AlicizationRelationshipDynamicsState | null
  now: number
}): AlicizationHostPersonModelSnapshot {
  const events = filterSupersededHostModelEvents(input.events)
    .slice(0, 18)
  const facts = [...input.facts]
    .sort((left, right) => {
      const scoreDelta = scoreHumanlikeFactDurability(right) - scoreHumanlikeFactDurability(left)
      if (scoreDelta !== 0)
        return scoreDelta
      return right.updatedAt - left.updatedAt
    })
    .filter(fact => (fact.validationStatus ?? 'unverified') !== 'superseded')
    .slice(0, 12)
  const consolidations = [...(input.consolidations ?? [])]
    .sort((left, right) => {
      if (left.confidence !== right.confidence)
        return right.confidence - left.confidence
      return right.updatedAt - left.updatedAt
    })
    .slice(0, 10)
  const relationshipOutcomes = [...(input.relationshipOutcomes ?? [])]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 14)
  const reinforcementEvents = [...(input.reinforcementEvents ?? [])]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 16)
  const factLines = factStatements(facts)
  const consolidationLines = consolidationStatements(consolidations)
  const relationshipOutcomeLines = relationshipOutcomeStatements(relationshipOutcomes)
  const reinforcementLines = personaReinforcementStatements(reinforcementEvents)

  const routines = uniqueTexts([
    ...events.map(describeRoutine),
    ...consolidationLines.filter(line => routinePattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => routinePattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...reinforcementLines.filter(line => routinePattern.test(line) || focusedContextPattern.test(line) || lateNightPattern.test(line)),
    ...factLines.filter(line => routinePattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5)
  const sensitivities = uniqueTexts([
    ...events.map(describeSensitivity),
    ...consolidationLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line) || repairPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
    ...reinforcementLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
    ...(input.personStateUpdateSurface?.sensitivityHints ?? []),
    ...factLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
  ], 6)
  const repairTriggers = uniqueTexts([
    ...events.map(describeRepairTrigger),
    ...consolidationLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...relationshipOutcomeLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...reinforcementLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...(input.personStateUpdateSurface?.repairHints ?? []),
    ...factLines.filter(line => repairPattern.test(line) || roboticPattern.test(line)),
  ], 5)
  const recurrentBurdens = uniqueTexts([
    ...events.map(describeBurden),
    ...consolidationLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...reinforcementLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...(input.personStateUpdateSurface?.burdenHints ?? []),
    ...factLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5)
  const preferredClosenessByContext = mergeClosenessPreferences({
    events: buildClosenessPreferences(events),
    consolidations: buildClosenessPreferencesFromConsolidations(consolidations),
    outcomes: buildClosenessPreferencesFromOutcomes(relationshipOutcomes),
    updates: buildClosenessPreferencesFromPersonStateUpdateSurface(input.personStateUpdateSurface ?? null),
  })
  const trustScore = (() => {
    let score = computeTrustScore(events, input.relationshipDynamics ?? null)
    for (const outcome of relationshipOutcomes) {
      score += outcome.trustDelta * 0.12
      score += outcome.closenessDelta * 0.05
      score -= Math.max(0, outcome.burdenDelta) * 0.03
      score -= Math.max(0, -outcome.boundaryDelta) * 0.04
      score += outcome.repairDelta * 0.03
    }
    for (const event of reinforcementEvents) {
      const direction = event.valence === 'reinforce' ? 1 : -1
      if (event.dimension === 'truthful-grounding' || event.dimension === 'gentle-repair')
        score += direction * event.delta * 0.05
      else if (event.dimension === 'companionship')
        score += direction * event.delta * 0.04
      else if (event.dimension === 'autonomy-respect')
        score += direction * event.delta * 0.02
    }
    if (input.personStateUpdateSurface) {
      score += input.personStateUpdateSurface.relationshipShift.trustDelta * 0.18
      score += input.personStateUpdateSurface.relationshipShift.closenessDelta * 0.06
      score -= Math.max(0, input.personStateUpdateSurface.relationshipShift.burdenDelta) * 0.05
      score -= Math.max(0, -input.personStateUpdateSurface.relationshipShift.boundaryDelta) * 0.06
      score += input.personStateUpdateSurface.relationshipShift.repairDelta * 0.04
      score += Number(input.personStateUpdateSurface.reinforcementBias['truthful-grounding'] ?? 0) * 0.06
      score += Number(input.personStateUpdateSurface.reinforcementBias.companionship ?? 0) * 0.04
      score += Number(input.personStateUpdateSurface.reinforcementBias['autonomy-respect'] ?? 0) * 0.02
    }
    return clamp01(score)
  })()
  const stage = trustStage(trustScore)
  const summary = sanitizeHumanlikeMemoryText([
    input.personStateUpdateSurface?.summary ? `update=${input.personStateUpdateSurface.summary}` : '',
    input.relationshipDynamics?.hostAttitude ? `attitude=${input.relationshipDynamics.hostAttitude}` : '',
    routines[0] ? `routine=${routines[0]}` : '',
    sensitivities[0] ? `sensitivity=${sensitivities[0]}` : '',
    repairTriggers[0] ? `repair=${repairTriggers[0]}` : '',
    preferredClosenessByContext[0] ? `closeness=${preferredClosenessByContext[0].preference}` : '',
  ].filter(Boolean).join(' | '), 320)

  return {
    summary,
    routines,
    sensitivities,
    repairTriggers,
    trustLadder: {
      stage,
      score: trustScore,
      rationale: sanitizeHumanlikeMemoryText(
        stage === 'guarded'
          ? 'The host still protects distance quickly; approach should earn its opening.'
          : stage === 'cautious-open'
            ? 'Openings exist, but trust still depends on timing, repair, and respect-for-space.'
            : stage === 'warming'
              ? 'The bond can carry warmth when continuity and timing stay coherent.'
              : 'Trust is strong enough for more direct warmth, but it still depends on truth and timing.',
        220,
      ),
    },
    preferredClosenessByContext,
    recurrentBurdens,
    narrative: uniqueTexts([
      summary,
      input.personStateUpdateSurface?.summary ?? null,
      input.relationshipDynamics?.hostAttitude ?? null,
      ...(input.personStateUpdateSurface?.narrative ?? []).slice(0, 4),
      ...consolidations.slice(0, 4).map(record => record.summary || record.lesson || record.periodKey),
      ...relationshipOutcomes.slice(0, 4).map(record => record.summary || record.actionSummary),
      ...reinforcementEvents.slice(0, 4).map(record => record.summary),
      ...preferredClosenessByContext.map(item => `${item.context}:${item.preference}`),
      ...events.slice(0, 4).map(event => event.relationshipMeaning || event.lesson || event.whatChanged || event.whatHappened),
    ], 8),
    updatedAt: Math.max(
      input.now,
      ...events.map(event => event.updatedAt),
      ...facts.map(fact => fact.updatedAt),
      ...consolidations.map(record => record.updatedAt),
      ...relationshipOutcomes.map(record => record.createdAt),
      ...reinforcementEvents.map(record => record.createdAt),
      input.personStateUpdateSurface?.updatedAt ?? 0,
    ),
  }
}

export function deriveMemoryInterferencePenalty(input: {
  current: AlicizationEpisodicEventRecord
  strongerMatches: AlicizationEpisodicEventRecord[]
}) {
  const currentText = `${input.current.threadAnchor ?? ''} ${input.current.whereSummary ?? ''} ${input.current.whatHappened}`.toLowerCase()
  let penalty = 0
  for (const candidate of input.strongerMatches) {
    const candidateText = `${candidate.threadAnchor ?? ''} ${candidate.whereSummary ?? ''} ${candidate.whatHappened}`.toLowerCase()
    if (!candidateText || !currentText)
      continue
    if (candidate.threadAnchor && input.current.threadAnchor && candidate.threadAnchor === input.current.threadAnchor && candidate.id !== input.current.id)
      penalty += 0.05
    if (candidateText === currentText)
      penalty += 0.08
  }
  return clamp01(penalty)
}

function eventShiftDirection(event: AlicizationEpisodicEventRecord) {
  const shift = event.relationshipShift
  if (!shift)
    return 0
  return shift.trustDelta + shift.closenessDelta - Math.max(0, shift.burdenDelta) - Math.max(0, -shift.boundaryDelta)
}

function eventMemoryPolarity(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''}`.toLowerCase()
  const positive = positiveMemoryPolarityPattern.test(text) ? 1 : 0
  const negative = negativeMemoryPolarityPattern.test(text) ? 1 : 0
  if (positive > negative)
    return 1
  if (negative > positive)
    return -1
  return 0
}

function buildEventSemanticConflictProfile(event: AlicizationEpisodicEventRecord) {
  const text = lowerHumanlikeMemoryText(
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.felt,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    event.latestReconsolidation?.reason ?? null,
    event.latestReconsolidation?.relationshipMeaning ?? null,
    event.latestReconsolidation?.lesson ?? null,
    ...event.tags,
    ...event.emotionTags,
    ...(event.latestReconsolidation?.emotionTags ?? []),
  )
  const samePersonContinuity = sameHerContinuityPattern.test(text) || samePersonTestPattern.test(text)
  const genericStatusRecap = pieceHasProgressPressure(text)
  const statusRecapNegated = progressPressureNegationPattern.test(text) || statusRecapNegationPattern.test(text)
  const correctedMeaning = /host corrected|corrected meaning|revised older memory traces|supersed(?:e|ed|es)|older status shell/u.test(text)
  const correctedContinuityAuthority = samePersonContinuity && (correctedMeaning || statusRecapNegated)

  return {
    samePersonContinuity,
    genericStatusRecap,
    correctedContinuityAuthority,
  }
}

function currentShouldYieldToCandidateSemanticAuthority(input: {
  current: AlicizationEpisodicEventRecord
  candidate: AlicizationEpisodicEventRecord
  currentProfile: ReturnType<typeof buildEventSemanticConflictProfile>
  candidateProfile: ReturnType<typeof buildEventSemanticConflictProfile>
}) {
  if (input.currentProfile.correctedContinuityAuthority !== input.candidateProfile.correctedContinuityAuthority) {
    return input.candidateProfile.correctedContinuityAuthority
  }

  if (input.currentProfile.samePersonContinuity !== input.candidateProfile.samePersonContinuity)
    return input.candidateProfile.samePersonContinuity

  const currentReconsolidationCount = Math.max(0, Math.floor(Number(input.current.reconsolidationCount ?? 0)))
  const candidateReconsolidationCount = Math.max(0, Math.floor(Number(input.candidate.reconsolidationCount ?? 0)))
  if (currentReconsolidationCount !== candidateReconsolidationCount)
    return candidateReconsolidationCount > currentReconsolidationCount

  const currentReconsolidationConfidence = clamp01(Number(input.current.latestReconsolidation?.confidence ?? 0))
  const candidateReconsolidationConfidence = clamp01(Number(input.candidate.latestReconsolidation?.confidence ?? 0))
  if (Math.abs(currentReconsolidationConfidence - candidateReconsolidationConfidence) >= 0.04)
    return candidateReconsolidationConfidence > currentReconsolidationConfidence

  return Number(input.candidate.occurredAt ?? 0) > Number(input.current.occurredAt ?? 0)
}

function buildMemorySemanticConflictHaystack(event: AlicizationEpisodicEventRecord) {
  return lowerHumanlikeMemoryText(
    event.threadAnchor,
    event.whereSummary,
    event.whatHappened,
    event.felt,
    event.whatChanged,
    event.relationshipMeaning,
    event.lesson,
    event.sourceSummary,
    event.latestReconsolidation?.reason ?? null,
    event.latestReconsolidation?.relationshipMeaning ?? null,
    event.latestReconsolidation?.lesson ?? null,
    ...event.tags,
    ...event.emotionTags,
    ...(event.latestReconsolidation?.emotionTags ?? []),
  )
}

export function deriveMemorySupersessionSignal(input: {
  current: AlicizationEpisodicEventRecord
  candidate: AlicizationEpisodicEventRecord
}) {
  const currentAnchor = `${input.current.threadAnchor ?? ''} ${input.current.whereSummary ?? ''}`.trim().toLowerCase()
  const candidateAnchor = `${input.candidate.threadAnchor ?? ''} ${input.candidate.whereSummary ?? ''}`.trim().toLowerCase()
  const anchorOverlap = Boolean(
    currentAnchor
    && candidateAnchor
    && (
      currentAnchor === candidateAnchor
      || currentAnchor.includes(candidateAnchor)
      || candidateAnchor.includes(currentAnchor)
    ),
  )
  const sharedThread = Boolean(
    input.current.threadAnchor
    && input.candidate.threadAnchor
    && input.current.threadAnchor === input.candidate.threadAnchor,
  )
  if (!anchorOverlap && !sharedThread) {
    return {
      suppressCurrent: false,
      reason: '',
    }
  }

  const currentProfile = buildEventSemanticConflictProfile(input.current)
  const candidateProfile = buildEventSemanticConflictProfile(input.candidate)
  const samePersonSupersedesGenericStatus = currentProfile.genericStatusRecap
    && candidateProfile.samePersonContinuity
    && currentShouldYieldToCandidateSemanticAuthority({
      current: input.current,
      candidate: input.candidate,
      currentProfile,
      candidateProfile,
    })

  if (!samePersonSupersedesGenericStatus) {
    return {
      suppressCurrent: false,
      reason: '',
    }
  }

  const candidateHaystack = buildMemorySemanticConflictHaystack(input.candidate)
  const candidateExplicitSupersession = /supersed|authoritative before any status recap|corrected same-person continuity|revised older memory traces|not (?:a )?(?:generic )?status (?:recap|report)|same-person continuity check/u.test(candidateHaystack)
  const candidateReconsolidationCount = Math.max(0, Math.floor(Number(input.candidate.reconsolidationCount ?? 0)))
  const candidateSettledEnough = candidateReconsolidationCount >= 2
    && !hasTentativeMemoryMeaningLanguage(
      candidateHaystack,
      sanitizeHumanlikeMemoryText(input.candidate.relationshipMeaning, 240),
    )
    && clamp01(Number(input.candidate.latestReconsolidation?.confidence ?? input.candidate.confidence ?? 0)) >= 0.78

  return {
    suppressCurrent: candidateExplicitSupersession && candidateSettledEnough,
    reason: candidateExplicitSupersession && candidateSettledEnough
      ? 'A corrected same-person continuity memory explicitly superseded this older generic status-shell variant on the same thread.'
      : '',
  }
}

export function deriveMemoryContradictionSignal(input: {
  current: AlicizationEpisodicEventRecord
  strongerMatches: AlicizationEpisodicEventRecord[]
}) {
  const currentAnchor = `${input.current.threadAnchor ?? ''} ${input.current.whereSummary ?? ''}`.trim().toLowerCase()
  const currentShift = eventShiftDirection(input.current)
  const currentPolarity = eventMemoryPolarity(input.current)
  const currentSemanticProfile = buildEventSemanticConflictProfile(input.current)
  const conflictingIds: string[] = []
  let penalty = 0
  let samePersonStatusConflict = false

  for (const candidate of input.strongerMatches) {
    const candidateAnchor = `${candidate.threadAnchor ?? ''} ${candidate.whereSummary ?? ''}`.trim().toLowerCase()
    const anchorOverlap = Boolean(
      currentAnchor
      && candidateAnchor
      && (
        currentAnchor === candidateAnchor
        || currentAnchor.includes(candidateAnchor)
        || candidateAnchor.includes(currentAnchor)
      ),
    )
    const sharedThread = Boolean(
      input.current.threadAnchor
      && candidate.threadAnchor
      && input.current.threadAnchor === candidate.threadAnchor,
    )
    const candidateShift = eventShiftDirection(candidate)
    const oppositeShift = Math.abs(currentShift) >= 0.04
      && Math.abs(candidateShift) >= 0.04
      && currentShift * candidateShift < 0
    const candidatePolarity = eventMemoryPolarity(candidate)
    const oppositePolarity = currentPolarity !== 0 && candidatePolarity !== 0 && currentPolarity !== candidatePolarity
    const candidateSemanticProfile = buildEventSemanticConflictProfile(candidate)
    const semanticSamePersonStatusConflict = (
      currentSemanticProfile.samePersonContinuity && candidateSemanticProfile.genericStatusRecap
    ) || (
      candidateSemanticProfile.samePersonContinuity && currentSemanticProfile.genericStatusRecap
    )

    if (!anchorOverlap && !sharedThread)
      continue
    if (!oppositeShift && !oppositePolarity && !semanticSamePersonStatusConflict)
      continue

    if (semanticSamePersonStatusConflict) {
      const shouldYield = currentShouldYieldToCandidateSemanticAuthority({
        current: input.current,
        candidate,
        currentProfile: currentSemanticProfile,
        candidateProfile: candidateSemanticProfile,
      })
      if (!shouldYield)
        continue
      samePersonStatusConflict = true
      conflictingIds.push(candidate.id)
      penalty += 0.08
      continue
    }

    conflictingIds.push(candidate.id)
    penalty += oppositeShift ? 0.06 : 0.04
  }

  return {
    conflictingIds,
    penalty: clamp01(penalty),
    unresolved: conflictingIds.length > 0,
    reason: conflictingIds.length > 0
      ? samePersonStatusConflict
        ? 'A newer same-person continuity variant conflicts with an older generic status recap memory on the same thread, so keep the status-shell variant approximate rather than certain.'
        : 'Conflicting remembered variants exist for the same thread, so keep this recall approximate rather than certain.'
      : '',
  }
}

export function computeMemoryRecencyWeight(timestamp: number, now: number, halfLifeDays = 21) {
  const ageDays = Math.max(0, (now - timestamp) / dayMs)
  return Math.exp(-ageDays / halfLifeDays)
}
