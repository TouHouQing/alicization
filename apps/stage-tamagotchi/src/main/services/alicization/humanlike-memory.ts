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
  sanitizeAlicizationMemoryEvidenceText,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

const dayMs = 24 * 60 * 60 * 1000

const focusedContextPattern = /focused|focus|debug|coding|cursor|terminal|runtime|工作|写代码|调试/iu
const openContextPattern = /open|warming|聊天|陪|一起|靠近|轻松|放松/iu
const lateNightPattern = /late[- ]?night|drain|夜|熬夜|很晚|疲惫|累/iu
const executionContextPattern = /execution|result|proposal|callback|cli|codex|claude|task|执行|结果|提案|回调/iu
const executionProcedureLessonPattern = /blocked before dispatch|blocked-before-dispatch|confirmation required|explicit confirmation|explicit consent|needs-affirmation|waited for host affirmation|permission=|safety gate|resumable safety lesson|resume boundary|procedure lesson|remembered procedure|bounded execution consent|执行边界|确认后再执行|先别直接动/u
const intrusivePattern = /intrusive|heavy|pressure|挤|黏|压迫|太近|太重|打扰/iu
const roboticPattern = /robotic|template|system|模板|机械|机器人|系统口气/iu
const repairPattern = /repair|clarify|recheck|not this|missed|澄清|修复|重说|不是这个|没答到/iu
const routinePattern = /habit|routine|always|usually|often|习惯|经常|总是|会在|晚点|深夜/iu
const burdenPattern = /burden|tired|busy|drained|interrupt|压力|累|忙|打断|疲惫|不想被催/iu
const closenessPattern = /warm|gentle|care|companionship|陪|温和|柔和|陪伴|靠近/iu
const spacePattern = /space|boundary|lighter|light touch|quiet|room|边界|空间|轻一点|安静|留白/iu
const positiveMemoryPolarityPattern = /trust up|closer|lighter|gentle|useful|accepted|received|repair|soft|safe|靠近|变轻|被接住|有用|接受|修复|更稳/u
const negativeMemoryPolarityPattern = /trust down|intrusive|doubted|denied|pressure|heavy|failed|robotic|not this|boundary|down|拒绝|怀疑|压迫|打扰|失败|机械|不是这个|边界/u
const unfinishedLoopPattern = /unfinished|partial|open loop|not complete|closure|没收完|未完成|闭环|还缺|继续推进/u
const embodimentStatePattern = /embodiment|body|face|gaze|blink|voice|pause|lipsync|motion|身体|表情|视线|眨眼|声音|停顿|动作/u
const tentativeRecallPattern = /may|might|perhaps|seems|seem|uncertain|not sure|似乎|可能|也许|不完全确定/u
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
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

export function sanitizeHumanlikeMemoryText(raw: unknown, maxChars = 180) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars)
}

function normalizeHumanlikeMemoryRawText(raw: unknown, maxChars = 420) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/gu, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function sanitizeHumanlikeMemoryFactText(raw: unknown, maxChars = 420) {
  return sanitizeAlicizationMemoryEvidenceText(raw, maxChars)
}

function sanitizeHumanlikeInternalFactText(raw: unknown, maxChars = 420) {
  return sanitizeAlicizationMemoryEvidenceText(raw, maxChars, {
    provenance: 'internal-structured-fact',
  })
}

function sanitizeHumanlikeMemoryFactList(
  values: Array<string | null | undefined>,
  maxItems = 6,
  maxChars = 420,
) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeHumanlikeMemoryFactText(value, maxChars)
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

function sanitizeHumanlikeAuditFactList(
  values: Array<string | null | undefined>,
  maxItems = 10,
  maxChars = 420,
) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeHumanlikeMemoryRawText(value, maxChars)
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

function sanitizeHumanlikeHostAuthoredText(raw: unknown, maxChars = 420) {
  return normalizeHumanlikeMemoryRawText(raw, maxChars)
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

function lowerHumanlikeMemoryRawText(...values: Array<string | null | undefined>) {
  return values.map(value => normalizeHumanlikeMemoryRawText(value, 640)).filter(Boolean).join(' ').toLowerCase()
}

function hasTentativeMemoryMeaningLanguage(rawText: string, relationshipSummary: string) {
  const combined = sanitizeHumanlikeMemoryText(`${rawText} ${relationshipSummary}`, 640)
  if (!combined)
    return false
  return tentativeMemoryMeaningPattern.test(combined) || tentativeRecallPattern.test(combined)
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

function normalizeHumanlikeResidentEmbodimentValue(raw: unknown, maxChars = 64) {
  return sanitizeHumanlikeMemoryText(raw, maxChars)
    .toLowerCase()
    .replace(/[.。!！?？;；:：,，]+$/u, '')
    .trim()
}

function buildHumanlikeMemoryCandidateId(input: AlicizationHumanlikeMemoryCandidateInput) {
  const stableSeed = sanitizeHumanlikeMemoryText(input.turnId || `${input.sessionId ?? 'session'}-${input.now}`, 96)
  return `humanlike-memory-candidate:${stableSeed || input.now}`
}

function collectHumanlikeMemorySourceChannels(input: AlicizationHumanlikeMemoryCandidateInput): AlicizationHumanlikeMemorySourceChannel[] {
  const channels: AlicizationHumanlikeMemorySourceChannel[] = []
  if (normalizeHumanlikeMemoryRawText(input.dialogue?.userText) || normalizeHumanlikeMemoryRawText(input.dialogue?.assistantText))
    channels.push('dialogue')
  if (sanitizeHumanlikeInternalFactText(input.execution?.summary))
    channels.push('execution')
  if (
    normalizeHumanlikeMemoryRawText(input.initiative?.outcome, 80)
    || normalizeHumanlikeMemoryRawText(input.initiative?.userReaction, 80)
  ) {
    channels.push('initiative')
  }
  if (normalizeHumanlikeMemoryRawText(input.hostEmotion?.label, 80) || sanitizeHumanlikeInternalFactText(input.hostEmotion?.summary))
    channels.push('host-emotion')
  if (normalizeHumanlikeMemoryRawText(input.selfEmotion?.label, 80) || sanitizeHumanlikeInternalFactText(input.selfEmotion?.summary))
    channels.push('self-emotion')
  if (
    normalizeHumanlikeMemoryRawText(input.embodiment?.summary)
    || input.embodiment?.residentState?.facialCue
    || input.embodiment?.residentState?.actionCue
    || input.embodiment?.residentState?.mode
  ) {
    channels.push('embodiment')
  }
  if (
    normalizeHumanlikeMemoryRawText(input.affectiveResidue?.dominantResidueKind, 80)
    || Number.isFinite(Number(input.affectiveResidue?.afterglowPressure))
    || Number.isFinite(Number(input.affectiveResidue?.repairPressure))
    || Number.isFinite(Number(input.affectiveResidue?.restProtectivePressure))
  ) {
    channels.push('affective-residue')
  }
  return channels
}

function buildHumanlikeDialogueFactLabels(userText: string | null | undefined) {
  const text = normalizeHumanlikeMemoryRawText(userText, 640)
  if (!text)
    return []

  return sanitizeHumanlikeMemoryFactList([
    roboticPattern.test(text) ? 'dialogue-feedback:robotic' : null,
    intrusivePattern.test(text) ? 'dialogue-feedback:intrusive' : null,
    repairPattern.test(text) ? 'dialogue-feedback:correction' : null,
    burdenPattern.test(text) ? 'dialogue-feedback:burden' : null,
    vulnerableHostStatePattern.test(text) ? 'dialogue-feedback:vulnerable-state' : null,
  ], 6, 96)
}

function buildHumanlikeMemoryEvidence(input: AlicizationHumanlikeMemoryCandidateInput) {
  const initiativeOutcome = normalizeHumanlikeMemoryRawText(input.initiative?.outcome, 80)
  const initiativeReaction = normalizeHumanlikeMemoryRawText(input.initiative?.userReaction, 80)
  const relationshipSummary = sanitizeHumanlikeInternalFactText(input.relationship?.summary, 420)
  const executionSummary = sanitizeHumanlikeInternalFactText(input.execution?.summary, 420)
  const hostEmotionSummary = sanitizeHumanlikeInternalFactText(input.hostEmotion?.summary, 320)
  const selfEmotionLabel = normalizeHumanlikeMemoryRawText(input.selfEmotion?.label, 80)
  const hostEmotionLabel = normalizeHumanlikeMemoryRawText(input.hostEmotion?.label, 80)
  const affectiveResidueKind = normalizeHumanlikeMemoryRawText(input.affectiveResidue?.dominantResidueKind, 48)

  const evidence = sanitizeHumanlikeMemoryFactList([
    ...buildHumanlikeDialogueFactLabels(input.dialogue?.userText),
    relationshipSummary ? `relationship:${relationshipSummary}` : null,
    executionSummary ? `execution.${normalizeHumanlikeMemoryRawText(input.execution?.status, 40) || 'unknown'}:${executionSummary}` : null,
    hostEmotionSummary ? `host-emotion.${hostEmotionLabel || 'unknown'}:${hostEmotionSummary}` : null,
    selfEmotionLabel ? `self-emotion-label:${selfEmotionLabel}` : null,
    initiativeOutcome || initiativeReaction
      ? `initiative.outcome:${initiativeOutcome || 'unknown'}; user-reaction:${initiativeReaction || 'unknown'}`
      : null,
    affectiveResidueKind
      ? `affective-residue:${[
        affectiveResidueKind,
        Number.isFinite(Number(input.affectiveResidue?.afterglowPressure))
          ? `afterglow:${Number(input.affectiveResidue?.afterglowPressure ?? 0).toFixed(2)}`
          : null,
        Number.isFinite(Number(input.affectiveResidue?.repairPressure))
          ? `repair:${Number(input.affectiveResidue?.repairPressure ?? 0).toFixed(2)}`
          : null,
        Number.isFinite(Number(input.affectiveResidue?.restProtectivePressure))
          ? `rest-protective:${Number(input.affectiveResidue?.restProtectivePressure ?? 0).toFixed(2)}`
          : null,
      ].filter(Boolean).join(' | ')}`
      : null,
  ], 12, 520)
  for (const correction of normalizeHumanlikeHostCorrections(input.hostCorrections)) {
    const correctionEvidence = `host-correction.${correction.field}:${correction.correctedValue}`
    if (!evidence.includes(correctionEvidence))
      evidence.push(correctionEvidence)
    if (evidence.length >= 12)
      break
  }
  return evidence
}

function normalizeHumanlikeHostCorrections(corrections: AlicizationHumanlikeMemoryHostCorrection[] | null | undefined) {
  return (corrections ?? [])
    .map(correction => ({
      candidateId: sanitizeHumanlikeMemoryText(correction.candidateId, 160),
      field: sanitizeHumanlikeMemoryText(correction.field, 80),
      previousValue: sanitizeHumanlikeMemoryText(correction.previousValue, 260),
      correctedValue: sanitizeHumanlikeHostAuthoredText(correction.correctedValue, 420),
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

function buildHumanlikeEmotionalResidueCorrectionProfile(corrections: ReturnType<typeof normalizeHumanlikeHostCorrections>) {
  const correction = findLatestHumanlikeHostCorrection(corrections, 'emotionalResidue')
  if (!correction)
    return null

  const normalized = lowerHumanlikeMemoryRawText(correction.correctedValue, correction.reason)
  const tags: string[] = []
  const removeTags = new Set<string>()
  const restProtective = /rest-protective|protect rest|先护住休息|护住休息|休息优先|先别压过来|先别压|quiet concern|gentle concern|soft concern|轻微挂念|一点点挂念|更自然的窗口|more natural window/u.test(normalized)
  const unfinishedCarry = /unfinished|still open|not fully closed|还没收完|未完成|没收完|still matters|挂念/u.test(normalized)
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

  const normalized = lowerHumanlikeMemoryRawText(correction.correctedValue, correction.reason)
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

  const normalized = lowerHumanlikeMemoryRawText(correction.correctedValue, correction.reason)
  return {
    correction,
    avoidDownrank: /不要.*降权|别.*降权|not downrank|不要弱化|别弱化/u.test(normalized),
    avoidMerge: /不要.*合并|别.*合并|not merge/u.test(normalized),
    avoidForget: /不要.*忘|别.*忘|not forget|不要淡掉这条线|别淡掉这条线/u.test(normalized),
    fadeTemporaryNoise: /temporary noise|情绪噪声|一时紧张|短暂波动|temporary wobble|emotional spike|passing anxiety|该淡掉|该退下去|let.*fade|fade instead/u.test(normalized),
  }
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
  const threadAnchor = sanitizeHumanlikeInternalFactText(input.relationship?.threadAnchor, 120)
    || 'current-relationship-thread'
  const explicitSummary = sanitizeHumanlikeInternalFactText(input.relationship?.summary, 420)
  const primaryIntent: AlicizationHumanlikeRelationshipPrimaryIntent = 'ordinary-relationship'
  const signals = uniqueTexts([
    relationshipCorrection ? 'host-corrected' : null,
  ], 6)
  const summary = relationshipCorrection
    ? sanitizeHumanlikeHostAuthoredText(
        `Host correction: ${relationshipCorrection.correctedValue}`,
        420,
      )
    : explicitSummary
      || (primaryIntent === 'ordinary-relationship' ? '' : `relationship-intent:${primaryIntent}`)

  return {
    threadAnchor,
    summary,
    evidence: sanitizeHumanlikeMemoryFactList([
      explicitSummary,
      sanitizeHumanlikeInternalFactText(input.hostEmotion?.summary, 320),
      ...corrections.map(correction => `host-correction:${correction.correctedValue}`),
    ], 6, 420),
    primaryIntent,
    signals,
    containsProgressPressure: false,
    containsContinuityWorry: false,
    containsSamePersonTest: false,
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
  if (relationshipRepairLearning.detected) {
    score += relationshipRepairLearning.missed ? 0.22 : 0.18
    reasons.push('relationship repair learning')
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
  const text = lowerHumanlikeMemoryRawText(
    input.candidateInput.dialogue?.userText,
    input.candidateInput.execution?.summary,
    input.candidateInput.hostEmotion?.label,
    input.candidateInput.hostEmotion?.summary,
    input.candidateInput.selfEmotion?.label,
    input.candidateInput.relationship?.summary,
    input.candidateInput.initiative?.outcome,
    input.candidateInput.initiative?.userReaction,
    input.candidateInput.affectiveResidue?.dominantResidueKind,
  )
  const affectiveResidue = input.candidateInput.affectiveResidue ?? null
  const emotionalResidueCorrection = buildHumanlikeEmotionalResidueCorrectionProfile(input.hostCorrections)
  const tags: string[] = []
  if (/guilt|亏欠|内疚/u.test(text))
    tags.push('slight-guilt')
  if (unfinishedLoopPattern.test(text))
    tags.push('unfinishedness')
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
    trace: sanitizeHumanlikeAuditFactList([
      emotionalResidueCorrection?.correction.correctedValue ? `host-correction.emotionalResidue:${emotionalResidueCorrection.correction.correctedValue}` : null,
      emotionalResidueCorrection?.dominantResidueKind ? `affective-residue:${emotionalResidueCorrection.dominantResidueKind}` : null,
      emotionalResidueCorrection ? `host:${emotionalResidueCorrection.hostLabel} intensity:${emotionalResidueCorrection.intensity.toFixed(2)}` : null,
      emotionalResidueCorrection?.correction.correctedValue ? `host-reason:${emotionalResidueCorrection.correction.correctedValue}` : null,
      emotionalResidueCorrection ? `self:${emotionalResidueCorrection.selfLabel} intensity:${Math.max(0.24, emotionalResidueCorrection.intensity - 0.04).toFixed(2)}` : null,
      affectiveResidue?.dominantResidueKind ? `affective-residue:${affectiveResidue.dominantResidueKind}` : null,
      Number.isFinite(Number(affectiveResidue?.afterglowPressure))
        ? `pressure.afterglow:${Number(affectiveResidue?.afterglowPressure ?? 0).toFixed(2)}`
        : null,
      Number.isFinite(Number(affectiveResidue?.repairPressure))
        ? `pressure.repair:${Number(affectiveResidue?.repairPressure ?? 0).toFixed(2)}`
        : null,
      Number.isFinite(Number(affectiveResidue?.restProtectivePressure))
        ? `pressure.rest-protective:${Number(affectiveResidue?.restProtectivePressure ?? 0).toFixed(2)}`
        : null,
      `relationship-intent:${input.relationshipContext.primaryIntent}`,
      input.relationshipContext.hostCorrectionApplied ? 'host-correction-applied' : null,
      input.candidateInput.hostEmotion?.label ? `host:${input.candidateInput.hostEmotion.label} intensity:${clamp01(Number(input.candidateInput.hostEmotion.intensity ?? 0)).toFixed(2)}` : null,
      sanitizeHumanlikeInternalFactText(input.candidateInput.hostEmotion?.summary, 260)
        ? `host-reason:${sanitizeHumanlikeInternalFactText(input.candidateInput.hostEmotion?.summary, 260)}`
        : null,
      input.candidateInput.selfEmotion?.label ? `self:${input.candidateInput.selfEmotion.label} intensity:${clamp01(Number(input.candidateInput.selfEmotion.intensity ?? 0)).toFixed(2)}` : null,
      input.candidateInput.initiative?.outcome || input.candidateInput.initiative?.userReaction
        ? `initiative-outcome:${sanitizeHumanlikeMemoryText(input.candidateInput.initiative?.outcome, 40) || 'unknown'}/${sanitizeHumanlikeMemoryText(input.candidateInput.initiative?.userReaction, 40) || 'unknown'}`
        : null,
      input.candidateInput.execution?.status ? `execution-status:${input.candidateInput.execution.status}` : null,
    ], 12),
  }
}

function buildHumanlikeEmotionKernelInfluence(input: {
  residue: AlicizationHumanlikeMemoryCandidate['emotionalResidue']
  embodimentSummary: string
}) {
  const residueTags = new Set(input.residue.tags)
  const dominantTilt = residueTags.has('rest-protective')
    ? 'rest-protective'
    : residueTags.has('slight-guilt')
      ? 'repair-protective'
      : residueTags.has('unfinishedness')
        ? 'unfinished-attentive'
        : residueTags.has('relief')
          ? 'warm-stable'
          : 'neutral'

  return {
    dominantTilt,
    toneGuidance: '',
    initiativePressure: 'none',
    bodyState: embodimentStatePattern.test(input.embodimentSummary)
      ? 'embodiment-state:present'
      : 'embodiment-state:absent',
    trace: [
      `residue:${input.residue.tags.join(',')}`,
      `dominant:${dominantTilt}`,
    ],
  } satisfies AlicizationHumanlikeMemoryCandidate['emotionKernelInfluence']
}

function buildHumanlikeInitiativeOpportunity(): AlicizationHumanlikeMemoryCandidate['initiativeOpportunity'] {
  return {
    kind: 'no-initiative',
    suggestedWindow: '',
    pressure: 'none',
    antiSpamReason: '',
    visibleLine: '',
  } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
}

function buildHumanlikeInitiativeOutcomeRecord(input: AlicizationHumanlikeMemoryCandidateInput) {
  const outcome = normalizeHumanlikeMemoryRawText(input.initiative?.outcome, 80)
  const userReaction = normalizeHumanlikeMemoryRawText(input.initiative?.userReaction, 80)
  if (!outcome && !userReaction)
    return null
  return {
    outcome: outcome || 'unknown',
    userReaction: userReaction || 'unknown',
    strategyUpdate: '',
    recordedAt: input.now,
  } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOutcomeRecord']
}

function buildHumanlikeEmbodimentTrace(input: {
  candidateInput: AlicizationHumanlikeMemoryCandidateInput
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
}) {
  const embodimentCorrection = buildHumanlikeEmbodimentCorrectionProfile(input.hostCorrections)
  const recallStrength = (embodimentCorrection?.recallStrength
    || input.candidateInput.embodiment?.recallStrength
    || 'lightly-noticed') as AlicizationHumanlikeMemoryRecallStrength
  const face = embodimentCorrection?.face || 'neutral-soft'
  const gaze = embodimentCorrection?.gaze || 'soft'
  const blink = 'natural'
  const voice = embodimentCorrection?.voice || 'even'
  const pause = embodimentCorrection?.pause || 'natural'
  const lipsync = embodimentCorrection?.lipsync || 'matched'
  const pacing = embodimentCorrection?.pacing || 'natural'
  const directResidentState = input.candidateInput.embodiment?.residentState ?? null
  const residentFacialCue = normalizeHumanlikeResidentEmbodimentValue(directResidentState?.facialCue)
  const residentActionCue = normalizeHumanlikeResidentEmbodimentValue(directResidentState?.actionCue)
  const rawResidentMode = embodimentCorrection?.residentMode
    || normalizeHumanlikeResidentEmbodimentValue(directResidentState?.mode)
  const residentMode = rawResidentMode
  const residentReason = sanitizeHumanlikeMemoryFactText(directResidentState?.reason, 180)
  const consistency = normalizeHumanlikeMemoryRawText(input.candidateInput.embodiment?.modalityConsistency, 40).toLowerCase()
  const risk = consistency === 'consistent'
    ? 'low'
    : /contradict|conflict|矛盾|乱跳/u.test(consistency)
      ? 'high'
      : 'medium'
  const summary = normalizeHumanlikeMemoryRawText([
    embodimentCorrection?.face ? `face=${face}` : '',
    embodimentCorrection?.gaze ? `gaze=${gaze}` : '',
    embodimentCorrection?.voice ? `voice=${voice}` : '',
    embodimentCorrection?.pause ? `pause=${pause}` : '',
    embodimentCorrection?.lipsync ? `lipsync=${lipsync}` : '',
    embodimentCorrection?.pacing ? `pacing=${pacing}` : '',
    residentFacialCue ? `resident_face=${residentFacialCue}` : '',
    residentActionCue ? `resident_action=${residentActionCue}` : '',
    residentMode ? `resident_mode=${residentMode}` : '',
  ].filter(Boolean).join(' '), 360)

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
    consistencyReason: `modality-consistency:${risk}`,
  } satisfies AlicizationHumanlikeMemoryCandidate['embodimentTrace']
}

function buildHumanlikeAutobiographicalImpact(input: AlicizationHumanlikeMemoryCandidateInput) {
  void input
  return {
    era: '',
    selfNarrativeDelta: '',
    stablePreferenceHint: '',
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
    const emotionalNoise = isHumanlikeTemporaryNoiseMemory(summary) || /tired|drained/u.test(summary)
    const analysisHeavyCare = analysisHeavyCarePattern.test(summary)
      || (closenessPattern.test(summary) && /quick|quickly|fast|rush|direct|分析/u.test(summary))
      || (intrusivePattern.test(summary) && !gentleCareMemoryPattern.test(summary))
    if (currentVulnerableCare && analysisHeavyCare)
      vulnerableCareConflictingMemoryIds.push(memory.id)
    if (lowSalience)
      downrankMemoryIds.push(memory.id)
    if (currentVulnerableCare && analysisHeavyCare)
      downrankMemoryIds.push(memory.id)
    if (currentEmbodiment && embodimentStatePattern.test(summary))
      mergeMemoryIds.push(memory.id)
    if ((lowSalience && /noise|ephemeral|temporary|噪声|临时/u.test(summary)) || (lowSalience && emotionalNoise && staleLongAgo))
      forgetMemoryIds.push(memory.id)
  }

  const revisionEvents: AlicizationHumanlikeMemoryCandidate['metabolism']['revisionEvents'] = []
  if (conflictingMemoryIds.length > 0) {
    revisionEvents.push({
      kind: 'revision',
      conflictingMemoryIds: uniqueTexts(conflictingMemoryIds, 8),
      reason: 'memory-conflict:newer-relationship-evidence-differs-from-prior-status-summary',
    })
  }
  if (vulnerableCareConflictingMemoryIds.length > 0) {
    revisionEvents.push({
      kind: 'revision',
      conflictingMemoryIds: uniqueTexts(vulnerableCareConflictingMemoryIds, 8),
      reason: 'memory-conflict:newer-vulnerable-care-evidence-differs-from-prior-analysis-heavy-summary',
    })
  }
  for (const correction of input.hostCorrections) {
    revisionEvents.push({
      kind: 'revision',
      conflictingMemoryIds: uniqueTexts([correction.candidateId], 4),
      reason: normalizeHumanlikeMemoryRawText(
        `host-correction:${correction.field}:${correction.reason || correction.correctedValue}`,
        260,
      ),
    })
  }

  const nextDownrankMemoryIds = uniqueTexts(downrankMemoryIds, 8)
    .filter(() => !metabolismCorrection?.avoidDownrank)
  const nextMergeMemoryIds = uniqueTexts(mergeMemoryIds, 8)
    .filter(() => !metabolismCorrection?.avoidMerge)
  const nextForgetMemoryIds = uniqueTexts([
    ...forgetMemoryIds,
    ...(metabolismCorrection?.fadeTemporaryNoise
      ? input.priorMemories
          .filter(memory => isHumanlikeTemporaryNoiseMemory(priorMemorySummaryById.get(memory.id) ?? ''))
          .map(memory => memory.id)
      : []),
  ], 8).filter(() => !metabolismCorrection?.avoidForget)
  const correctionReasons = uniqueTexts([
    metabolismCorrection?.avoidDownrank
      ? 'host-correction:disable-automatic-downrank'
      : null,
    metabolismCorrection?.fadeTemporaryNoise
      ? 'host-correction:fade-temporary-noise'
      : null,
    metabolismCorrection?.avoidMerge
      ? 'host-correction:disable-automatic-merge'
      : null,
    metabolismCorrection?.avoidForget
      ? 'host-correction:disable-automatic-forget'
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
        nextDownrankMemoryIds.length > 0 ? 'memory-downrank:low-value-or-superseded' : null,
        nextMergeMemoryIds.length > 0 ? 'memory-merge:repeated-trace' : null,
        nextForgetMemoryIds.length > 0 ? 'memory-forget:low-salience-temporary-noise' : null,
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
      reason: 'recall-source:host-correction',
    } satisfies AlicizationHumanlikeMemoryCandidate['recallPosture']
  }

  if (input.confidence < 0.72 && ((hasConflictRevision || hasDownrankedPrior) && isTentativeByLanguage)) {
    return {
      certainty: 'tentative',
      reason: 'recall-risk:conflicting-or-sparse-evidence',
    } satisfies AlicizationHumanlikeMemoryCandidate['recallPosture']
  }

  return {
    certainty: 'steady',
    reason: 'recall-evidence:steady',
  } satisfies AlicizationHumanlikeMemoryCandidate['recallPosture']
}

export function buildHumanlikeMemoryCandidate(input: AlicizationHumanlikeMemoryCandidateInput): AlicizationHumanlikeMemoryCandidate {
  const hostCorrections = normalizeHumanlikeHostCorrections(input.hostCorrections)
  const sourceChannels = collectHumanlikeMemorySourceChannels(input)
  const hasInitiativeOutcomeLearning = Boolean(
    normalizeHumanlikeMemoryRawText(input.initiative?.outcome, 80)
    || normalizeHumanlikeMemoryRawText(input.initiative?.userReaction, 80),
  )
  const relationshipContext = buildHumanlikeRelationshipContext(input)
  const evidence = buildHumanlikeMemoryEvidence(input)
  const rawText = lowerHumanlikeMemoryRawText(
    input.dialogue?.userText,
    input.execution?.summary,
    input.hostEmotion?.label,
    input.hostEmotion?.summary,
    input.selfEmotion?.label,
    input.affectiveResidue?.dominantResidueKind,
    input.initiative?.outcome,
    input.initiative?.userReaction,
    relationshipContext.summary,
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
    embodimentSummary: normalizeHumanlikeMemoryRawText(input.embodiment?.summary, 260),
  })
  const initiativeOpportunity = buildHumanlikeInitiativeOpportunity()
  const initiativeOutcomeRecord = buildHumanlikeInitiativeOutcomeRecord(input)
  const embodimentTrace = buildHumanlikeEmbodimentTrace({
    candidateInput: input,
    hostCorrections,
  })
  const autobiographicalImpact = buildHumanlikeAutobiographicalImpact(input)

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
      whyRemember: normalizeHumanlikeMemoryRawText(sanitizeHumanlikeAuditFactList([
        longTermWorthiness.reasons.join(', '),
        hostCorrections.length > 0 ? 'host correction' : '',
        relationshipContext.summary,
      ], 4).join(' | '), 420),
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
        explanation: 'host-correction-surface:relationship,emotion,embodiment,memory-metabolism',
      },
    },
    recallPosture,
  }
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

function describePreference(
  _context: string,
  _score: number,
  event: AlicizationEpisodicEventRecord | null,
): string {
  return sanitizeHumanlikeMemoryFactList([
    event?.relationshipMeaning,
    event?.whatChanged,
    event?.whatHappened,
  ], 1, 180)[0] ?? ''
}

function describeRoutine(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whereSummary ?? ''} ${event.threadAnchor ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`
  if (lateNightPattern.test(text) || focusedContextPattern.test(text) || executionContextPattern.test(text) || routinePattern.test(text)) {
    return sanitizeHumanlikeMemoryFactList([
      event.whatHappened,
      event.relationshipMeaning,
      event.whereSummary,
    ], 1, 180)[0] ?? ''
  }
  return ''
}

function describeSensitivity(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''}`
  if (intrusivePattern.test(text) || roboticPattern.test(text) || burdenPattern.test(text) || spacePattern.test(text)) {
    return sanitizeHumanlikeMemoryFactList([
      event.whatHappened,
      event.relationshipMeaning,
      event.whatChanged,
    ], 1, 180)[0] ?? ''
  }
  return ''
}

function describeRepairTrigger(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''} ${event.emotionTags.join(' ')} ${event.tags.join(' ')}`
  if (repairPattern.test(text) || roboticPattern.test(text) || intrusivePattern.test(text)) {
    return sanitizeHumanlikeMemoryFactList([
      event.whatHappened,
      event.relationshipMeaning,
      event.whatChanged,
    ], 1, 180)[0] ?? ''
  }
  return ''
}

function describeBurden(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whereSummary ?? ''} ${event.whatHappened} ${event.whatChanged ?? ''} ${event.tags.join(' ')}`
  if (
    lateNightPattern.test(text)
    || focusedContextPattern.test(text)
    || (executionContextPattern.test(text) && intrusivePattern.test(text))
    || burdenPattern.test(text)
  ) {
    return sanitizeHumanlikeMemoryFactList([
      event.whatChanged,
      event.whatHappened,
      event.relationshipMeaning,
    ], 1, 180)[0] ?? ''
  }
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
    .filter(item => Boolean(item.preference))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function factStatements(facts: AlicizationMemoryFact[]) {
  return facts
    .map(fact => sanitizeHumanlikeMemoryFactText(`${fact.subject} ${fact.predicate} ${fact.object}`, 180))
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
  return outcomes.flatMap(outcome => sanitizeHumanlikeMemoryFactList([
    outcome.summary,
    outcome.actionSummary,
    summarizeRelationshipShift({
      trustDelta: outcome.trustDelta,
      closenessDelta: outcome.closenessDelta,
      boundaryDelta: outcome.boundaryDelta,
      burdenDelta: outcome.burdenDelta,
      repairDelta: outcome.repairDelta,
    } as AlicizationEpisodicEventRecord['relationshipShift']),
  ], 4, 180))
}

function personaReinforcementStatements(events: AlicizationPersonaReinforcementEventRecord[]) {
  return events.map(event =>
    `${event.dimension}:${event.valence}:${event.delta >= 0 ? '+' : ''}${event.delta.toFixed(2)}`,
  )
}

function consolidationStatements(consolidations: AlicizationMemoryConsolidationRecord[]) {
  return consolidations.flatMap(record => sanitizeHumanlikeMemoryFactList([
    record.summary,
    ...record.cues,
  ], 4, 180))
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
    .filter(item => Boolean(item.preference))
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
    .filter(item => Boolean(item.preference))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function mergeClosenessPreferences(input: {
  events: AlicizationHostPersonClosenessPreference[]
  consolidations: AlicizationHostPersonClosenessPreference[]
  outcomes?: AlicizationHostPersonClosenessPreference[]
}) {
  const merged = new Map<string, AlicizationHostPersonClosenessPreference>()
  for (const item of [...input.events, ...input.consolidations, ...(input.outcomes ?? [])]) {
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

  const routines = sanitizeHumanlikeMemoryFactList([
    ...events.map(describeRoutine),
    ...consolidationLines.filter(line => routinePattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => routinePattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...reinforcementLines.filter(line => routinePattern.test(line) || focusedContextPattern.test(line) || lateNightPattern.test(line)),
    ...factLines.filter(line => routinePattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5, 220)
  const sensitivities = sanitizeHumanlikeMemoryFactList([
    ...events.map(describeSensitivity),
    ...consolidationLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line) || repairPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
    ...reinforcementLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
    ...factLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
  ], 6, 220)
  const repairTriggers = sanitizeHumanlikeMemoryFactList([
    ...events.map(describeRepairTrigger),
    ...consolidationLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...relationshipOutcomeLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...reinforcementLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...factLines.filter(line => repairPattern.test(line) || roboticPattern.test(line)),
  ], 5, 220)
  const recurrentBurdens = sanitizeHumanlikeMemoryFactList([
    ...events.map(describeBurden),
    ...consolidationLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...reinforcementLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...factLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5, 220)
  const preferredClosenessByContext = mergeClosenessPreferences({
    events: buildClosenessPreferences(events),
    consolidations: buildClosenessPreferencesFromConsolidations(consolidations),
    outcomes: buildClosenessPreferencesFromOutcomes(relationshipOutcomes),
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
  const summary = normalizeHumanlikeMemoryRawText(
    sanitizeHumanlikeMemoryFactList([
      input.relationshipDynamics?.hostAttitude ?? null,
      routines[0] ?? null,
      sensitivities[0] ?? null,
      repairTriggers[0] ?? null,
      preferredClosenessByContext[0]?.preference ?? null,
    ], 6, 260).join(' | '),
    320,
  )

  return {
    summary,
    routines,
    sensitivities,
    repairTriggers,
    trustLadder: {
      stage,
      score: trustScore,
      rationale: `trust-stage:${stage}; score:${trustScore.toFixed(2)}`,
    },
    preferredClosenessByContext,
    recurrentBurdens,
    narrative: sanitizeHumanlikeMemoryFactList([
      summary,
      input.relationshipDynamics?.hostAttitude ?? null,
      ...consolidations.slice(0, 4).map(record => record.summary || record.periodKey),
      ...relationshipOutcomes.slice(0, 4).map(record => record.summary || record.actionSummary),
      ...reinforcementLines.slice(0, 4),
      ...preferredClosenessByContext.map(item => `${item.context}:${item.preference}`),
      ...events.slice(0, 4).map(event => event.relationshipMeaning || event.whatChanged || event.whatHappened),
    ], 8, 320),
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

  const explicitlyDerivedFromCurrent = input.candidate.derivedFrom.some(reference =>
    reference.kind === 'episodic-event' && reference.id === input.current.id,
  )
  const explicitObservedFeedback = input.candidate.sourceKind === 'dialogue-feedback'
    && input.candidate.provenance === 'observed'
  const candidateConfidence = clamp01(
    Number(input.candidate.latestReconsolidation?.confidence ?? input.candidate.confidence ?? 0),
  )
  const currentConfidence = clamp01(
    Number(input.current.latestReconsolidation?.confidence ?? input.current.confidence ?? 0),
  )
  const candidateIsNewer = Number(input.candidate.occurredAt ?? 0) >= Number(input.current.occurredAt ?? 0)
  const suppressCurrent = explicitlyDerivedFromCurrent
    && explicitObservedFeedback
    && candidateIsNewer
    && candidateConfidence >= currentConfidence

  if (!suppressCurrent) {
    return {
      suppressCurrent: false,
      reason: '',
    }
  }

  return {
    suppressCurrent: true,
    reason: 'memory-superseded:observed-dialogue-feedback-derived-from-current-event',
  }
}

export function deriveMemoryContradictionSignal(input: {
  current: AlicizationEpisodicEventRecord
  strongerMatches: AlicizationEpisodicEventRecord[]
}) {
  const currentAnchor = `${input.current.threadAnchor ?? ''} ${input.current.whereSummary ?? ''}`.trim().toLowerCase()
  const currentShift = eventShiftDirection(input.current)
  const currentPolarity = eventMemoryPolarity(input.current)
  const conflictingIds: string[] = []
  let penalty = 0

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
    const explicitSupersession = deriveMemorySupersessionSignal({
      current: input.current,
      candidate,
    }).suppressCurrent

    if (!anchorOverlap && !sharedThread)
      continue
    if (!oppositeShift && !oppositePolarity && !explicitSupersession)
      continue

    if (explicitSupersession) {
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
      ? 'memory-contradiction:conflicting-remembered-variants'
      : '',
  }
}

export function computeMemoryRecencyWeight(timestamp: number, now: number, halfLifeDays = 21) {
  const ageDays = Math.max(0, (now - timestamp) / dayMs)
  return Math.exp(-ageDays / halfLifeDays)
}
