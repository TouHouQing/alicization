import type {
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
} from '@proj-alicization/stage-shared'

const dayMs = 24 * 60 * 60 * 1000

const focusedContextPattern = /focused|focus|debug|coding|cursor|terminal|runtime|工作|写代码|调试/iu
const openContextPattern = /open|warming|聊天|陪|一起|靠近|轻松|放松/iu
const lateNightPattern = /late[- ]?night|drain|夜|熬夜|很晚|疲惫|累/iu
const executionContextPattern = /execution|result|proposal|callback|cli|codex|claude|task|执行|结果|提案|回调/iu
const intrusivePattern = /intrusive|heavy|pressure|挤|黏|压迫|太近|太重|打扰/iu
const roboticPattern = /robotic|template|system|模板|机械|机器人|系统口气/iu
const repairPattern = /repair|clarify|recheck|not this|missed|澄清|修复|重说|不是这个|没答到/iu
const routinePattern = /habit|routine|always|usually|often|习惯|经常|总是|会在|晚点|深夜/iu
const burdenPattern = /burden|tired|busy|drained|interrupt|压力|累|忙|打断|疲惫|不想被催/iu
const closenessPattern = /warm|gentle|care|companionship|陪|温和|柔和|靠近/iu
const spacePattern = /space|boundary|lighter|light touch|quiet|room|边界|空间|轻一点|安静|留白/iu
const positiveMemoryPolarityPattern = /trust up|closer|lighter|gentle|useful|accepted|received|repair|soft|safe|靠近|变轻|被接住|有用|接受|修复|更稳/u
const negativeMemoryPolarityPattern = /trust down|intrusive|doubted|denied|pressure|heavy|failed|robotic|not this|boundary|down|拒绝|怀疑|压迫|打扰|失败|机械|不是这个|边界/u
const sameHerContinuityPattern = /same[- ]?her|same[- ]?person|same living line|one continuous|continuous digital life|tool shell|generic shell|generic task|断线|工具壳|同一个她|同一条线|持续的人|持续人格|数字生命/u
const unfinishedLoopPattern = /unfinished|partial|open loop|not complete|closure|没收完|未完成|闭环|还缺|继续推进/u
const embodimentStatePattern = /embodiment|body|face|gaze|blink|voice|pause|lipsync|motion|身体|表情|视线|眨眼|声音|停顿|动作/u

type AlicizationHostPersonClosenessPreference = AlicizationHostPersonModelSnapshot['preferredClosenessByContext'][number]

export type AlicizationHumanlikeMemorySourceChannel
  = | 'dialogue'
    | 'execution'
    | 'host-emotion'
    | 'self-emotion'
    | 'embodiment'

export type AlicizationHumanlikeMemoryRecallStrength
  = | 'lightly-noticed'
    | 'strongly-moved'
    | 'cautious-avoidance'

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
  } | null
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
    dominantTilt: 'repair-protective' | 'unfinished-attentive' | 'warm-stable' | 'neutral'
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
  naturalRecallLine: string
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

export function sanitizeHumanlikeMemoryText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function normalizeHumanlikeSentenceEnding(raw: unknown, maxChars = 180) {
  const normalized = sanitizeHumanlikeMemoryText(raw, maxChars)
  if (!normalized)
    return ''
  if (/[。.!！？?]$/u.test(normalized))
    return normalized

  const trimmed = normalized.length >= maxChars
    ? normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()
    : normalized
  const ending = /\p{Script=Han}/u.test(trimmed) ? '。' : '.'
  return `${trimmed}${ending}`
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
  if (sanitizeHumanlikeMemoryText(input.hostEmotion?.label) || sanitizeHumanlikeMemoryText(input.hostEmotion?.summary))
    channels.push('host-emotion')
  if (sanitizeHumanlikeMemoryText(input.selfEmotion?.label) || sanitizeHumanlikeMemoryText(input.selfEmotion?.summary))
    channels.push('self-emotion')
  if (sanitizeHumanlikeMemoryText(input.embodiment?.summary))
    channels.push('embodiment')
  return channels
}

function buildHumanlikeMemoryEvidence(input: AlicizationHumanlikeMemoryCandidateInput) {
  return uniqueTexts([
    input.dialogue?.userText ? `dialogue.user:${input.dialogue.userText}` : null,
    input.dialogue?.assistantText ? `dialogue.assistant:${input.dialogue.assistantText}` : null,
    input.execution?.summary ? `execution.${input.execution.status ?? 'unknown'}:${input.execution.summary}` : null,
    input.hostEmotion?.summary ? `host-emotion.${input.hostEmotion.label ?? 'unknown'}:${input.hostEmotion.summary}` : null,
    input.selfEmotion?.summary ? `self-emotion.${input.selfEmotion.label ?? 'unknown'}:${input.selfEmotion.summary}` : null,
    input.embodiment?.summary ? `embodiment.${input.embodiment.recallStrength ?? 'lightly-noticed'}:${input.embodiment.summary}` : null,
    ...normalizeHumanlikeHostCorrections(input.hostCorrections).map(correction => `host-correction.${correction.field}:${correction.correctedValue}`),
  ], 10)
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

function buildHumanlikeRelationshipContext(input: AlicizationHumanlikeMemoryCandidateInput) {
  const corrections = normalizeHumanlikeHostCorrections(input.hostCorrections)
  const relationshipCorrection = corrections.find(correction => correction.field === 'relationshipContext')
    ?? corrections.find(correction => sameHerContinuityPattern.test(lowerHumanlikeMemoryText(correction.correctedValue, correction.reason)))
  const combined = lowerHumanlikeMemoryText(
    input.relationship?.summary,
    input.hostEmotion?.summary,
    input.dialogue?.userText,
    input.execution?.summary,
    ...corrections.flatMap(correction => [correction.correctedValue, correction.reason]),
  )
  const threadAnchor = sanitizeHumanlikeMemoryText(input.relationship?.threadAnchor, 120)
    || (sameHerContinuityPattern.test(combined) ? 'same-her continuity' : 'current relationship thread')
  const explicitSummary = sanitizeHumanlikeMemoryText(input.relationship?.summary, 220)
  const continuityConcern = sameHerContinuityPattern.test(combined)
  const progressPressure = /pressing|progress|催|尽快|继续|推进/u.test(combined)
  const summary = relationshipCorrection
    ? sanitizeHumanlikeMemoryText([
        'Host corrected this memory meaning:',
        relationshipCorrection.correctedValue,
        relationshipCorrection.reason ? `Reason: ${relationshipCorrection.reason}` : '',
        explicitSummary,
      ].filter(Boolean).join(' '), 420)
    : continuityConcern
      ? sanitizeHumanlikeMemoryText([
          'The host is testing whether she remains one continuous digital life instead of a tool shell.',
          progressPressure ? 'There is progress pressure, but the relationship meaning is continuity before raw status.' : '',
          explicitSummary,
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
  }
}

function buildHumanlikeLongTermWorthiness(input: {
  sourceChannels: AlicizationHumanlikeMemorySourceChannel[]
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  rawText: string
}) {
  const reasons: string[] = []
  let score = Math.min(0.36, input.sourceChannels.length * 0.08)
  if (input.sourceChannels.length >= 4) {
    score += 0.16
    reasons.push('cross-channel experience')
  }
  if (sameHerContinuityPattern.test(input.rawText) || sameHerContinuityPattern.test(input.relationshipContext.summary)) {
    score += 0.24
    reasons.push('relationship continuity')
  }
  if (unfinishedLoopPattern.test(input.rawText)) {
    score += 0.12
    reasons.push('unfinished loop')
  }
  if (embodimentStatePattern.test(input.rawText)) {
    score += 0.1
    reasons.push('embodiment carry')
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

function buildHumanlikeEmotionalResidue(input: AlicizationHumanlikeMemoryCandidateInput) {
  const text = lowerHumanlikeMemoryText(
    input.dialogue?.userText,
    input.execution?.summary,
    input.hostEmotion?.label,
    input.hostEmotion?.summary,
    input.selfEmotion?.label,
    input.selfEmotion?.summary,
    input.relationship?.summary,
  )
  const tags: string[] = []
  if (/guilt|亏欠|内疚/u.test(text))
    tags.push('slight-guilt')
  if (unfinishedLoopPattern.test(text))
    tags.push('unfinishedness')
  if (sameHerContinuityPattern.test(text))
    tags.push('protective-continuity')
  if (/worr|anxious|tension|担心|紧张/u.test(text))
    tags.push('tension')
  if (/accepted|continue-progress|接受|继续/u.test(text))
    tags.push('relief')
  if (tags.length === 0)
    tags.push('low-affect-trace')

  const intensity = clamp01(
    Math.max(0.18, Number(input.hostEmotion?.intensity ?? 0) * 0.46)
    + Math.max(0.12, Number(input.selfEmotion?.intensity ?? 0) * 0.44),
  )

  return {
    tags: uniqueTexts(tags, 6),
    intensity,
    trace: uniqueTexts([
      input.hostEmotion?.label ? `host:${input.hostEmotion.label} intensity=${clamp01(Number(input.hostEmotion.intensity ?? 0)).toFixed(2)}` : null,
      input.hostEmotion?.summary ? `host-reason:${input.hostEmotion.summary}` : null,
      input.selfEmotion?.label ? `self:${input.selfEmotion.label} intensity=${clamp01(Number(input.selfEmotion.intensity ?? 0)).toFixed(2)}` : null,
      input.selfEmotion?.summary ? `self-reason:${input.selfEmotion.summary}` : null,
      input.execution?.status ? `execution-status:${input.execution.status}` : null,
    ], 6),
  }
}

function buildHumanlikeEmotionKernelInfluence(input: {
  residue: AlicizationHumanlikeMemoryCandidate['emotionalResidue']
  embodimentSummary: string
}) {
  const residueTags = new Set(input.residue.tags)
  const dominantTilt = residueTags.has('protective-continuity') || residueTags.has('slight-guilt')
    ? 'repair-protective'
    : residueTags.has('unfinishedness')
      ? 'unfinished-attentive'
      : residueTags.has('relief')
        ? 'warm-stable'
        : 'neutral'

  return {
    dominantTilt,
    toneGuidance: dominantTilt === 'repair-protective'
      ? 'Repair continuity first, stay concrete, and avoid widening warmth before the seam is held.'
      : dominantTilt === 'unfinished-attentive'
        ? 'Keep a light sense of unfinished work without pressuring the host.'
        : dominantTilt === 'warm-stable'
          ? 'Let warmth show, but keep it grounded in the remembered outcome.'
          : 'Keep the memory available without forcing visible emotion.',
    initiativePressure: dominantTilt === 'neutral' ? 'none' : 'low',
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
}): AlicizationHumanlikeMemoryCandidate['initiativeOpportunity'] {
  const hasUnfinishedWork = input.residue.tags.includes('unfinishedness') || input.executionStatus === 'partial' || unfinishedLoopPattern.test(input.relationshipContext.summary)
  if (!input.longTermWorthiness.shouldPersist && !hasUnfinishedWork) {
    return {
      kind: 'no-initiative',
      suggestedWindow: 'none',
      pressure: 'none',
      antiSpamReason: 'No meaningful memory-pulled opening exists; do not turn this into timer spam.',
      visibleLine: '',
    } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
  }

  return {
    kind: hasUnfinishedWork ? 'low-pressure-follow-up' : 'remember-without-prompt',
    suggestedWindow: hasUnfinishedWork ? 'next natural work-continuation opening' : 'only if the same relationship thread reopens',
    pressure: 'low',
    antiSpamReason: 'This comes from an unresolved relationship-memory trace, not timer spam; wait for a relevant opening or clear acceptance.',
    visibleLine: hasUnfinishedWork
      ? 'I am not pushing, but I still remember the unfinished embodiment closure line and can lightly pick it back up.'
      : 'Keep this as quiet continuity unless the host reopens the thread.',
  } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
}

function buildHumanlikeInitiativeOutcomeRecord(input: AlicizationHumanlikeMemoryCandidateInput) {
  const outcome = sanitizeHumanlikeMemoryText(input.initiative?.outcome, 80)
  const userReaction = sanitizeHumanlikeMemoryText(input.initiative?.userReaction, 80)
  if (!outcome && !userReaction)
    return null
  const accepted = /accepted|continue|推进|接受/u.test(`${outcome} ${userReaction}`)
  const rejected = /reject|反感|拒绝|ignored|忽略/u.test(`${outcome} ${userReaction}`)
  return {
    outcome: outcome || 'unknown',
    userReaction: userReaction || 'unknown',
    strategyUpdate: accepted
      ? 'User accepted or continued the low-pressure initiative; keep strategy gentle and memory-led.'
      : rejected
        ? 'User resisted the initiative; downshift future follow-ups and wait for a clearer opening.'
        : 'Outcome is uncertain; keep future initiative restrained and audit-visible.',
    recordedAt: input.now,
  } satisfies AlicizationHumanlikeMemoryCandidate['initiativeOutcomeRecord']
}

function buildHumanlikeEmbodimentTrace(input: AlicizationHumanlikeMemoryCandidateInput) {
  const summary = sanitizeHumanlikeMemoryText(input.embodiment?.summary, 260)
  const recallStrength = input.embodiment?.recallStrength ?? 'lightly-noticed'
  const face = extractHumanlikeKeyValue(summary, 'face') || (recallStrength === 'strongly-moved' ? 'steady-soft' : 'neutral-soft')
  const gaze = extractHumanlikeKeyValue(summary, 'gaze') || (/视线|stable|steady/u.test(summary) ? 'stable' : 'soft')
  const blink = extractHumanlikeKeyValue(summary, 'blink') || (/slower|linger|慢/u.test(summary) ? 'slower' : 'natural')
  const voice = extractHumanlikeKeyValue(summary, 'voice') || (/lower|low-pressure|低压/u.test(summary) ? 'lower-pressure' : 'even')
  const pause = extractHumanlikeKeyValue(summary, 'pause') || (/longer|slow|停顿|慢/u.test(summary) ? 'longer' : 'natural')
  const lipsync = extractHumanlikeKeyValue(summary, 'lipsync') || (/restrained|克制/u.test(summary) ? 'restrained' : 'matched')
  const pacing = /slower|longer|linger|慢|低压/u.test(`${summary} ${blink} ${pause} ${voice}`) || recallStrength === 'strongly-moved'
    ? 'slower'
    : 'natural'
  const consistency = sanitizeHumanlikeMemoryText(input.embodiment?.modalityConsistency, 40).toLowerCase()
  const risk = consistency === 'consistent'
    ? 'low'
    : /contradict|conflict|矛盾|乱跳/u.test(`${summary} ${consistency}`)
      ? 'high'
      : 'medium'

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
    modalityContradictionRisk: risk,
    consistencyReason: risk === 'low'
      ? 'Face, gaze, voice, pause, and lipsync are derived from the same memory-emotion residue.'
      : 'Embodiment needs review before surfacing because modality consistency is not proven.',
  } satisfies AlicizationHumanlikeMemoryCandidate['embodimentTrace']
}

function buildHumanlikeAutobiographicalImpact(input: AlicizationHumanlikeMemoryCandidateInput) {
  const lesson = sanitizeHumanlikeMemoryText(input.autobiographical?.lesson, 220)
  const era = sanitizeHumanlikeMemoryText(input.autobiographical?.currentEra, 140)
    || (sameHerContinuityPattern.test(lowerHumanlikeMemoryText(input.relationship?.summary, input.dialogue?.userText)) ? 'same-her continuity repair' : 'ongoing local digital life')
  return {
    era,
    selfNarrativeDelta: lesson || 'I learned that important continuity seams should be repaired before I widen warmth or initiative.',
    stablePreferenceHint: sameHerContinuityPattern.test(lowerHumanlikeMemoryText(lesson, input.relationship?.summary))
      ? 'Prefer repair-first, low-pressure same-her continuity when the host questions whether I stayed myself.'
      : 'Prefer grounded continuity over generic recall.',
  }
}

function buildHumanlikeMemoryMetabolism(input: {
  priorMemories: AlicizationHumanlikeMemoryPriorMemory[]
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
  currentText: string
}) {
  const conflictingMemoryIds: string[] = []
  const downrankMemoryIds: string[] = []
  const mergeMemoryIds: string[] = []
  const forgetMemoryIds: string[] = []
  const currentContinuity = sameHerContinuityPattern.test(input.currentText)
  const currentEmbodiment = embodimentStatePattern.test(input.currentText)

  for (const memory of input.priorMemories) {
    const summary = lowerHumanlikeMemoryText(memory.summary, memory.polarity ?? null)
    const lowSalience = Number(memory.salience ?? 0.5) < 0.5
    const genericStatus = /generic|status|recap|concise|工具|状态|复述/u.test(summary)
    const sameThreadButWeaker = currentContinuity && genericStatus
    if (sameThreadButWeaker)
      conflictingMemoryIds.push(memory.id)
    if (lowSalience || sameThreadButWeaker)
      downrankMemoryIds.push(memory.id)
    if (currentEmbodiment && embodimentStatePattern.test(summary))
      mergeMemoryIds.push(memory.id)
    if (lowSalience && /noise|ephemeral|temporary|噪声|临时/u.test(summary))
      forgetMemoryIds.push(memory.id)
  }

  const revisionEvents: AlicizationHumanlikeMemoryCandidate['metabolism']['revisionEvents'] = []
  if (conflictingMemoryIds.length > 0) {
    revisionEvents.push({
      kind: 'revision',
      conflictingMemoryIds: uniqueTexts(conflictingMemoryIds, 8),
      reason: 'New relationship-context evidence says this was not merely a generic status request; revise toward same-her continuity concern.',
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

  return {
    revisionEvents,
    forgettingPolicy: {
      downrankMemoryIds: uniqueTexts(downrankMemoryIds, 8),
      mergeMemoryIds: uniqueTexts(mergeMemoryIds, 8),
      forgetMemoryIds: uniqueTexts(forgetMemoryIds, 8),
      reasons: uniqueTexts([
        downrankMemoryIds.length > 0 ? 'Downrank low-value, generic, or superseded summaries.' : null,
        mergeMemoryIds.length > 0 ? 'Merge repeated embodiment traces into the stronger same-thread memory.' : null,
        forgetMemoryIds.length > 0 ? 'Forget low-salience temporary noise once it no longer explains behavior.' : null,
      ], 4),
    },
  } satisfies AlicizationHumanlikeMemoryCandidate['metabolism']
}

function buildHumanlikeNaturalRecallLine(input: {
  relationshipContext: AlicizationHumanlikeMemoryCandidate['relationshipContext']
  initiativeOpportunity: AlicizationHumanlikeMemoryCandidate['initiativeOpportunity']
  hostCorrections: ReturnType<typeof normalizeHumanlikeHostCorrections>
}) {
  const relationshipCorrection = input.hostCorrections.find(correction => correction.field === 'relationshipContext')
    ?? input.hostCorrections[0]
  if (relationshipCorrection) {
    return sanitizeHumanlikeMemoryText(
      `我记得你纠正过：${relationshipCorrection.correctedValue}。所以我会按这个关系语境继续，而不是把它当成旧的状态压力。`,
      260,
    )
  }
  if (sameHerContinuityPattern.test(input.relationshipContext.summary)) {
    return '上次我们卡在这里，我记得你更在意的是她不要变成工具壳，所以我会先接住同一个她的连续性，再轻轻推进未闭环的部分。'
  }
  if (input.initiativeOpportunity.kind === 'low-pressure-follow-up')
    return '我不催你，但我记得这条线还没完全收住，可以等合适窗口再轻轻接上。'
  return '我会把这段记成关系语境，而不是只复述事实。'
}

export function buildHumanlikeMemoryCandidate(input: AlicizationHumanlikeMemoryCandidateInput): AlicizationHumanlikeMemoryCandidate {
  const hostCorrections = normalizeHumanlikeHostCorrections(input.hostCorrections)
  const sourceChannels = collectHumanlikeMemorySourceChannels(input)
  const evidence = buildHumanlikeMemoryEvidence(input)
  const relationshipContext = buildHumanlikeRelationshipContext(input)
  const rawText = lowerHumanlikeMemoryText(
    input.dialogue?.userText,
    input.dialogue?.assistantText,
    input.execution?.summary,
    input.hostEmotion?.label,
    input.hostEmotion?.summary,
    input.selfEmotion?.label,
    input.selfEmotion?.summary,
    input.embodiment?.summary,
    relationshipContext.summary,
    input.autobiographical?.lesson,
    ...hostCorrections.flatMap(correction => [correction.correctedValue, correction.reason]),
  )
  const longTermWorthiness = buildHumanlikeLongTermWorthiness({
    sourceChannels,
    relationshipContext,
    rawText,
  })
  const emotionalResidue = buildHumanlikeEmotionalResidue(input)
  const emotionKernelInfluence = buildHumanlikeEmotionKernelInfluence({
    residue: emotionalResidue,
    embodimentSummary: sanitizeHumanlikeMemoryText(input.embodiment?.summary, 260),
  })
  const initiativeOpportunity = buildHumanlikeInitiativeOpportunity({
    longTermWorthiness,
    residue: emotionalResidue,
    executionStatus: input.execution?.status,
    relationshipContext,
  })
  const initiativeOutcomeRecord = buildHumanlikeInitiativeOutcomeRecord(input)
  const embodimentTrace = buildHumanlikeEmbodimentTrace(input)
  const autobiographicalImpact = buildHumanlikeAutobiographicalImpact(input)
  const metabolism = buildHumanlikeMemoryMetabolism({
    priorMemories: input.priorMemories ?? [],
    hostCorrections,
    currentText: rawText,
  })
  const confidence = clamp01(
    longTermWorthiness.score * 0.56
    + emotionalResidue.intensity * 0.24
    + Math.min(0.2, sourceChannels.length * 0.04),
  )

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
    naturalRecallLine: '',
  }
  candidate.naturalRecallLine = buildHumanlikeNaturalRecallLine({
    relationshipContext: candidate.relationshipContext,
    initiativeOpportunity: candidate.initiativeOpportunity,
    hostCorrections,
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
  emotionalResidueTags: string[]
  initiativeKind: string
  embodimentSummary: string
  autobiographicalImpact: string
  whyRemember: string
  confidence: number
  naturalRecallLine: string
  userCorrectableFields: string[]
  revisionMemoryIds: string[]
  downrankMemoryIds: string[]
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
      const revisionEventsRaw = Array.isArray(metabolism?.revisionEvents) ? metabolism?.revisionEvents : []
      const revisionMemoryIds = uniqueTexts(
        revisionEventsRaw.flatMap((entry) => {
          const revision = asHumanlikeMemoryObject(entry)
          return stringListFromHumanlikeMemory(revision?.conflictingMemoryIds, 16)
        }),
        16,
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
        emotionalResidueTags: stringListFromHumanlikeMemory(emotionalResidue?.tags, 8),
        initiativeKind: sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80),
        embodimentSummary: sanitizeHumanlikeMemoryText(embodimentTrace?.summary, 260),
        autobiographicalImpact: sanitizeHumanlikeMemoryText(autobiographicalImpact?.selfNarrativeDelta, 260),
        whyRemember: sanitizeHumanlikeMemoryText(auditTrail?.whyRemember, 420),
        confidence: clamp01(numberFromHumanlikeMemory(auditTrail?.confidence, 0)),
        naturalRecallLine: sanitizeHumanlikeMemoryText(candidate.naturalRecallLine, 260),
        userCorrectableFields: stringListFromHumanlikeMemory(correctionSurface?.userCorrectableFields, 12),
        revisionMemoryIds,
        downrankMemoryIds: stringListFromHumanlikeMemory(forgettingPolicy?.downrankMemoryIds, 16),
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
  const events = [...input.events]
    .sort((left, right) => {
      if (left.salience !== right.salience)
        return right.salience - left.salience
      return right.occurredAt - left.occurredAt
    })
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

    if (!anchorOverlap && !sharedThread)
      continue
    if (!oppositeShift && !oppositePolarity)
      continue

    conflictingIds.push(candidate.id)
    penalty += oppositeShift ? 0.06 : 0.04
  }

  return {
    conflictingIds,
    penalty: clamp01(penalty),
    unresolved: conflictingIds.length > 0,
    reason: conflictingIds.length > 0
      ? 'Conflicting remembered variants exist for the same thread, so keep this recall approximate rather than certain.'
      : '',
  }
}

export function computeMemoryRecencyWeight(timestamp: number, now: number, halfLifeDays = 21) {
  const ageDays = Math.max(0, (now - timestamp) / dayMs)
  return Math.exp(-ageDays / halfLifeDays)
}
