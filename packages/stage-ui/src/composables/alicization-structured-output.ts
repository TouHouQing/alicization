import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDigitalLifeEnvelope,
} from '../stores/alicization-bridge'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  isAlicizationDecorativePersonaTemplateContamination,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import {
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationEmbodimentScript,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../stores/alicization-bridge'

const sentimentLexiconPositive = [
  '谢谢',
  '感谢',
  '喜欢',
  '开心',
  '高兴',
  'great',
  'good',
  'thanks',
  'love',
]

const sentimentLexiconNegative = [
  '讨厌',
  '烦',
  '难过',
  '崩溃',
  '生气',
  '糟糕',
  'bad',
  'angry',
  'hate',
  'sad',
]

const emotionToSentiment: Record<string, number> = {
  happy: 0.8,
  neutral: 0,
  concerned: -0.4,
  apologetic: -0.35,
  tired: -0.2,
  sad: -0.7,
  angry: -0.8,
  surprised: 0.2,
  thinking: 0,
}

const jsonRepairMaxChars = 32 * 1024
const jsonRepairTimeBudgetMs = 20

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value))
    return min
  return Math.min(max, Math.max(min, value))
}

function countPatternMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0
}

const inferredEmotionProfiles: Array<{ emotion: string, pattern: RegExp, weight: number }> = [
  { emotion: 'apologetic', pattern: /抱歉|对不起|不好意思|失礼|sorry|apolog/i, weight: 1.8 },
  { emotion: 'tired', pattern: /累|困|疲惫|撑不住|drain|exhaust|tired|sleepy/i, weight: 1.6 },
  { emotion: 'angry', pattern: /生气|愤怒|恼火|别再|立刻|必须|马上|angry|furious|annoy|stop/i, weight: 1.5 },
  { emotion: 'concerned', pattern: /担心|小心|先别|注意|照顾|保重|careful|concern|worry|please rest/i, weight: 1.3 },
  { emotion: 'sad', pattern: /难过|失落|沮丧|抱憾|遗憾|sad|upset|unhappy/i, weight: 1.2 },
  { emotion: 'surprised', pattern: /惊|居然|竟然|\?!|!\?|！？|surpris|unexpected|wow/i, weight: 1.2 },
  { emotion: 'thinking', pattern: /让我想|先看|我需要确认|也许|可能|或许|think|maybe|perhaps|let me check/i, weight: 0.95 },
  { emotion: 'happy', pattern: /开心|高兴|太好了|真棒|喜欢|谢谢|great|awesome|glad|happy|thanks/i, weight: 1.05 },
]

const defaultDeliveryByEmotion: Record<string, AlicizationDialoguePerformancePayload['delivery']> = {
  neutral: 'calm',
  happy: 'energetic',
  sad: 'gentle',
  angry: 'firm',
  concerned: 'gentle',
  tired: 'calm',
  apologetic: 'hesitant',
  surprised: 'energetic',
  thinking: 'hesitant',
}

function inferEmotionFromReply(input: {
  reply: string
  previousEmotion?: string
}) {
  const reply = input.reply.trim()
  if (!reply) {
    return normalizeAlicizationEmotion(input.previousEmotion ?? 'neutral').emotion
  }

  let bestEmotion = ''
  let bestScore = 0
  for (const profile of inferredEmotionProfiles) {
    const matchScore = countPatternMatches(reply, profile.pattern) * profile.weight
    if (matchScore > bestScore) {
      bestScore = matchScore
      bestEmotion = profile.emotion
    }
  }

  if (bestEmotion) {
    return normalizeAlicizationEmotion(bestEmotion).emotion
  }

  const lexicalScore = estimateLexicalSentiment(reply)
  if (lexicalScore >= 0.45)
    return 'happy'
  if (lexicalScore <= -0.55)
    return 'sad'
  if (/[?？]/.test(reply))
    return 'thinking'

  return normalizeAlicizationEmotion(input.previousEmotion ?? 'neutral').emotion
}

function inferDeliveryFromReply(input: {
  reply: string
  emotion: string
}) {
  const reply = input.reply
  if (/必须|立刻|马上|先停|不要|务必|must|need to|stop/i.test(reply))
    return 'firm'
  if (/也许|可能|不确定|我想|我觉得|maybe|perhaps|i think/i.test(reply))
    return 'hesitant'
  if (/温柔|慢慢|先别急|没关系|先休息|gentle|softly|take it easy|rest/i.test(reply))
    return 'gentle'
  if (/调皮|逗你|哼|坏笑|tease|playful/i.test(reply))
    return 'teasing'
  if (/[!！]{2,}|太好了|真棒|great|awesome|wow/i.test(reply))
    return 'energetic'

  return defaultDeliveryByEmotion[input.emotion] ?? 'calm'
}

function inferEmphasisFromReply(input: {
  reply: string
  delivery: AlicizationDialoguePerformancePayload['delivery']
}) {
  const exclamationCount = countPatternMatches(input.reply, /[!！]/g)
  const questionCount = countPatternMatches(input.reply, /[?？]/g)
  const strongImperative = /必须|立刻|马上|务必|绝对|must|immediately|right now/i.test(input.reply)
  const highArousal = /太好了|真棒|超级|非常|great|awesome|amazing|wow/i.test(input.reply)

  if (strongImperative || exclamationCount >= 2 || highArousal)
    return 2 as const
  if (questionCount >= 2 || exclamationCount >= 1 || input.delivery === 'firm' || input.delivery === 'energetic')
    return 1 as const
  return 0 as const
}

function inferPerformanceFromReply(input: {
  reply: string
  fallbackEmotion: string
}) {
  const emotion = normalizeAlicizationEmotion(input.fallbackEmotion).emotion
  const delivery = inferDeliveryFromReply({
    reply: input.reply,
    emotion,
  })
  const emphasis = inferEmphasisFromReply({
    reply: input.reply,
    delivery,
  })

  return normalizeAlicizationPerformancePayload({
    baseEmotion: emotion,
    emotion,
    delivery,
    emphasis,
    facialCue: null,
    actionCue: null,
  }, emotion)
}

function hasPerformanceFieldValue(value: unknown) {
  if (value == null)
    return false
  if (typeof value === 'string')
    return value.trim().length > 0
  return true
}

function hasPerformanceHint(payload: Record<string, unknown> | null) {
  if (!payload)
    return false

  return [
    'baseEmotion',
    'emotion',
    'facialCue',
    'actionCue',
    'delivery',
    'emphasis',
  ].some((key) => {
    return hasPerformanceFieldValue(payload[key])
  })
}

function hasPerformanceDynamicsHint(payload: Record<string, unknown> | null) {
  if (!payload)
    return false

  return [
    'facialCue',
    'actionCue',
    'delivery',
    'emphasis',
  ].some((key) => {
    return hasPerformanceFieldValue(payload[key])
  })
}

interface ActPayload {
  emotion?: unknown
  userSentimentScore?: unknown
  user_sentiment_score?: unknown
  sentimentConfidenceRaw?: unknown
  sentiment_confidence_raw?: unknown
  sentimentConfidence?: unknown
  sentiment_confidence?: unknown
  confidence?: unknown
  [key: string]: unknown
}

export type StructuredParsePath = 'json' | 'repair-json' | 'act' | 'fallback'

interface StructuredPayloadParseResult {
  payload: Record<string, unknown> | null
  parsePath: StructuredParsePath
  repairTimedOut: boolean
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return null
  return value as Record<string, unknown>
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value))
    return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed))
      return parsed
  }
  return undefined
}

function parseObjectCandidate(candidate: string, depth = 0): Record<string, unknown> | null {
  if (depth > 2)
    return null

  const parseNestedString = (value: unknown): Record<string, unknown> | null => {
    if (typeof value !== 'string')
      return null
    const nested = value.trim()
    if (!nested)
      return null
    return parseObjectCandidate(nested, depth + 1)
  }

  try {
    const parsed = JSON.parse(candidate) as unknown
    return toObjectRecord(parsed) || parseNestedString(parsed)
  }
  catch {
    const normalizedCandidate = candidate
      .replace(/,\s*\}/g, '}')
      .replace(/,\s*\]/g, ']')
      .replace(/^\uFEFF/, '')
      .trim()

    try {
      const repaired = JSON.parse(normalizedCandidate) as unknown
      return toObjectRecord(repaired) || parseNestedString(repaired)
    }
    catch {
      if (/\\"(?:thought|emotion|reply)\\"/i.test(normalizedCandidate)) {
        const unescapedCandidate = normalizedCandidate
          .replace(/\\r/g, '\r')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
        try {
          const rescued = JSON.parse(unescapedCandidate) as unknown
          return toObjectRecord(rescued) || parseNestedString(rescued)
        }
        catch {
          return null
        }
      }
      return null
    }
  }
}

function parseLastActPayload(content: string): ActPayload | null {
  let searchEnd = content.length
  while (searchEnd > 0) {
    const openIndex = content.lastIndexOf('<|ACT', searchEnd)
    if (openIndex < 0)
      return null

    const closeIndex = content.indexOf('|>', openIndex)
    if (closeIndex < 0) {
      searchEnd = openIndex - 1
      continue
    }

    const block = content.slice(openIndex + '<|ACT'.length, closeIndex)
    const jsonStart = block.indexOf('{')
    const jsonEnd = block.lastIndexOf('}')
    if (jsonStart < 0 || jsonEnd < jsonStart) {
      searchEnd = openIndex - 1
      continue
    }

    const payloadText = block.slice(jsonStart, jsonEnd + 1)
    const parsed = parseObjectCandidate(payloadText)
    if (parsed)
      return parsed as ActPayload

    searchEnd = openIndex - 1
  }

  return null
}

function stripJsonFence(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```'))
    return trimmed

  const lines = trimmed.split('\n')
  const firstLine = (lines[0] ?? '').trim().toLowerCase()
  const lastLine = (lines.at(-1) ?? '').trim()
  if ((firstLine !== '```' && firstLine !== '```json') || lastLine !== '```') {
    return trimmed
  }

  return lines.slice(1, -1).join('\n').trim()
}

function parseStrictJsonPayload(content: string): Record<string, unknown> | null {
  const stripped = stripJsonFence(content)
  if (!stripped.startsWith('{') || !stripped.endsWith('}'))
    return null
  return parseObjectCandidate(stripped)
}

function extractJsonWindow(content: string, maxChars: number, startedAt: number): { candidate?: string, timedOut: boolean } {
  const text = content.trim()
  if (!text)
    return { timedOut: false }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace < firstBrace)
    return { timedOut: false }

  if (Date.now() - startedAt > jsonRepairTimeBudgetMs)
    return { timedOut: true }

  if (lastBrace - firstBrace + 1 > maxChars)
    return { timedOut: true }

  return {
    candidate: text.slice(firstBrace, lastBrace + 1),
    timedOut: false,
  }
}

function parseStructuredPayloadFromText(content: string): StructuredPayloadParseResult {
  const strict = parseStrictJsonPayload(content)
  if (strict) {
    return {
      payload: strict,
      parsePath: 'json',
      repairTimedOut: false,
    }
  }

  const startedAt = Date.now()
  const repairWindow = extractJsonWindow(content, jsonRepairMaxChars, startedAt)
  if (repairWindow.timedOut) {
    return {
      payload: null,
      parsePath: 'fallback',
      repairTimedOut: true,
    }
  }

  if (repairWindow.candidate) {
    const repaired = parseObjectCandidate(repairWindow.candidate)
    if (repaired) {
      return {
        payload: repaired,
        parsePath: 'repair-json',
        repairTimedOut: false,
      }
    }
  }

  const actPayload = parseLastActPayload(content)
  if (actPayload) {
    return {
      payload: actPayload as Record<string, unknown>,
      parsePath: 'act',
      repairTimedOut: false,
    }
  }

  return {
    payload: null,
    parsePath: 'fallback',
    repairTimedOut: false,
  }
}

function getNumeric(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload)
    return undefined

  for (const key of keys) {
    const value = toFiniteNumber(payload[key])
    if (typeof value === 'number')
      return value
  }

  return undefined
}

function getString(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload)
    return undefined

  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim())
      return value.trim()
  }

  return undefined
}

function sanitizeProjectStateText(value: unknown, maxChars: number) {
  if (typeof value !== 'string')
    return ''
  return sanitizeAlicizationStructuredInternalText(value, maxChars, alicizationFixedTemplateReplacement)
}

function sanitizeVisibleProjectStateText(value: unknown, maxChars: number) {
  const sanitized = sanitizeProjectStateText(value, maxChars)
  return sanitized === alicizationFixedTemplateReplacement ? '' : sanitized
}

function looksStructuredProjectStateFragment(value: string) {
  return /^[a-z][\w+-]*=/iu.test(value)
    || /^[a-z][\w+-]*:[\w+:-]+$/iu.test(value)
}

function sanitizeStructuredProjectStateListText(value: unknown, maxChars: number) {
  const sanitized = sanitizeVisibleProjectStateText(value, maxChars)
  if (!sanitized)
    return ''
  return looksStructuredProjectStateFragment(sanitized) ? sanitized : ''
}

function parsePayloadProjectState(payload: Record<string, unknown> | null) {
  const candidate = toObjectRecord(payload?.projectState) ?? toObjectRecord(payload)
  if (!candidate)
    return undefined

  const identity = sanitizeProjectStateText(candidate.identity, 180)
  const currentPhase = sanitizeProjectStateText(candidate.currentPhase, 180)
  const nextClosureTarget = sanitizeProjectStateText(candidate.nextClosureTarget, 320)

  const latestLandedProgress
    = sanitizeProjectStateText(candidate.latestLandedProgress, 320)
      || sanitizeProjectStateText(candidate.latestProgress, 320)
      || sanitizeProjectStateText(candidate.landedProgressSummary, 320)
      || null
  const primaryOpenLoop = sanitizeProjectStateText(candidate.primaryOpenLoop, 320) || null
  const emotionalClosureCueCandidate = sanitizeProjectStateText(candidate.emotionalClosureCue, 320)
  const continuityRestraintCandidate = sanitizeProjectStateText(candidate.continuityRestraint, 64)
  const continuityArcStageCandidate = sanitizeProjectStateText(candidate.continuityArcStage, 120)
  const continuityPreferredTimingCandidate = sanitizeProjectStateText(candidate.continuityPreferredTiming, 120)
  const continuityCadenceCandidate = sanitizeProjectStateText(candidate.continuityCadence, 120)
  const continuityCueCandidate = sanitizeProjectStateText(candidate.continuityCue, 220)
  const continuitySummary = sanitizeProjectStateText(candidate.continuitySummary, 320) || null

  if (
    !identity
    && !currentPhase
    && !latestLandedProgress
    && !primaryOpenLoop
    && !nextClosureTarget
    && !continuitySummary
    && !emotionalClosureCueCandidate
    && !continuityRestraintCandidate
    && !continuityArcStageCandidate
    && !continuityPreferredTimingCandidate
    && !continuityCadenceCandidate
    && !continuityCueCandidate
  ) {
    return undefined
  }

  return {
    identity,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    continuitySummary,
    sameHerSelfLine: null,
    sameHerHoldDetail: null,
    sameHerDriftRisk: null,
    emotionalClosureCue: emotionalClosureCueCandidate || null,
    ...(continuityRestraintCandidate
      ? { continuityRestraint: continuityRestraintCandidate }
      : {}),
    ...(continuityArcStageCandidate
      ? { continuityArcStage: continuityArcStageCandidate }
      : {}),
    ...(continuityPreferredTimingCandidate
      ? { continuityPreferredTiming: continuityPreferredTimingCandidate }
      : {}),
    ...(continuityCadenceCandidate
      ? { continuityCadence: continuityCadenceCandidate }
      : {}),
    ...(continuityCueCandidate
      ? { continuityCue: continuityCueCandidate }
      : {}),
  }
}

function parsePayloadDigitalLife(
  payload: Record<string, unknown> | null,
  fallbackEmotion: string,
): AlicizationDigitalLifeEnvelope | undefined {
  if (!payload)
    return undefined

  const topLevelDigitalLife = payload.digitalLife
  if (topLevelDigitalLife !== null && topLevelDigitalLife !== undefined) {
    return normalizeAlicizationDigitalLifeEnvelope(
      topLevelDigitalLife,
      normalizeAlicizationEmotion(fallbackEmotion).emotion,
    ) ?? undefined
  }

  const normalizedEmbodimentScript = normalizeAlicizationEmbodimentScript(payload.embodimentScript)
  return normalizeAlicizationDigitalLifeEnvelope(
    normalizedEmbodimentScript?.digitalLife ?? null,
    normalizeAlicizationEmotion(fallbackEmotion).emotion,
  ) ?? undefined
}

function parsePayloadPreDialogueClosure(payload: Record<string, unknown> | null): StructuredOutputResult['preDialogueClosure'] | undefined {
  const candidate = toObjectRecord(payload?.preDialogueClosure)
  if (!candidate)
    return undefined

  const rawStatus = sanitizeProjectStateText(candidate.status, 80)?.toLowerCase()
  const status = rawStatus === 'grounded' || rawStatus === 'partial' || rawStatus === 'drift'
    ? rawStatus
    : null
  if (!status)
    return undefined

  return {
    status,
    summaryLine: sanitizeVisibleProjectStateText(candidate.summaryLine, 320) || null,
    companionHeadlineLine: sanitizeVisibleProjectStateText(candidate.companionHeadlineLine, 320) || null,
    sameHerDriftRiskLine: null,
    companionshipReasonLine: sanitizeVisibleProjectStateText(candidate.companionshipReasonLine, 320) || null,
    companionBriefingLine: sanitizeVisibleProjectStateText(candidate.companionBriefingLine, 320) || null,
    companionNextClosureLine: sanitizeVisibleProjectStateText(candidate.companionNextClosureLine, 320) || null,
    emotionalClosureCue: sanitizeVisibleProjectStateText(candidate.emotionalClosureCue, 320) || null,
    briefingLines: Array.isArray(candidate.briefingLines)
      ? candidate.briefingLines
          .map(line => sanitizeStructuredProjectStateListText(line, 320))
          .filter(Boolean)
      : [],
    reasons: Array.isArray(candidate.reasons)
      ? candidate.reasons
          .map(reason => sanitizeStructuredProjectStateListText(reason, 320))
          .filter(Boolean)
      : [],
  }
}

export function normalizeStructuredProjectStatePayload(
  projectState: Record<string, unknown> | null | undefined,
): (NonNullable<StructuredOutputResult['projectState']> & {
  continuitySummary?: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRisk?: string | null
  emotionalClosureCue?: string | null
  continuityRestraint?: string | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
  continuityCadence?: string | null
  continuityCue?: string | null
  proactiveSameHerGap?: string | null
}) | undefined {
  if (!projectState)
    return undefined

  return parsePayloadProjectState(projectState)
}

export function normalizeStructuredPreDialogueAwarenessPayload(
  preDialogueAwareness: Record<string, unknown> | null | undefined,
): {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine: string | null
  companionBriefingLine: string | null
  companionNextClosureLine: string | null
  awarenessLine: string | null
  emotionalClosureCue: string | null
  reasonPreview: string[]
} | undefined {
  if (!preDialogueAwareness)
    return undefined

  const rawStatus = typeof preDialogueAwareness.status === 'string'
    ? preDialogueAwareness.status.trim().toLowerCase()
    : null
  const status = rawStatus === 'grounded' || rawStatus === 'partial' || rawStatus === 'drift'
    ? rawStatus
    : null
  if (!status)
    return undefined

  const summaryLine = sanitizeVisibleProjectStateText(preDialogueAwareness.summaryLine, 320) || null
  const companionHeadlineLine = sanitizeVisibleProjectStateText(preDialogueAwareness.companionHeadlineLine, 320) || null
  const companionBriefingLine = sanitizeVisibleProjectStateText(preDialogueAwareness.companionBriefingLine, 320) || null
  const companionNextClosureLine = sanitizeVisibleProjectStateText(preDialogueAwareness.companionNextClosureLine, 320) || null
  const awarenessLine = sanitizeVisibleProjectStateText(preDialogueAwareness.awarenessLine, 320) || null
  const emotionalClosureCue = sanitizeVisibleProjectStateText(preDialogueAwareness.emotionalClosureCue, 320) || null
  const reasonPreview = Array.isArray(preDialogueAwareness.reasonPreview)
    ? preDialogueAwareness.reasonPreview
        .map(reason => sanitizeStructuredProjectStateListText(reason, 320))
        .filter(Boolean)
    : []

  if (!summaryLine && !companionBriefingLine && !awarenessLine && reasonPreview.length === 0)
    return undefined

  return {
    status,
    summaryLine,
    companionHeadlineLine,
    companionBriefingLine,
    companionNextClosureLine,
    awarenessLine,
    emotionalClosureCue,
    reasonPreview,
  }
}

export function normalizeStructuredPreDialogueClosurePayload(
  preDialogueClosure: Record<string, unknown> | null | undefined,
): StructuredOutputResult['preDialogueClosure'] | undefined {
  if (!preDialogueClosure)
    return undefined

  return parsePayloadPreDialogueClosure({ preDialogueClosure })
}

function parsePayloadEmotion(payload: Record<string, unknown> | null) {
  if (!payload)
    return undefined

  const nestedPerformance = payload.performance
  if (nestedPerformance && typeof nestedPerformance === 'object' && !Array.isArray(nestedPerformance)) {
    const performanceObject = nestedPerformance as Record<string, unknown>
    const nestedBaseEmotion = performanceObject.baseEmotion
    if (typeof nestedBaseEmotion === 'string' && nestedBaseEmotion.trim())
      return nestedBaseEmotion.trim().toLowerCase()
  }

  const direct = payload.emotion
  if (typeof direct === 'string' && direct.trim())
    return direct.trim().toLowerCase()

  if (direct && typeof direct === 'object' && 'name' in direct) {
    const name = (direct as { name?: unknown }).name
    if (typeof name === 'string' && name.trim())
      return name.trim().toLowerCase()
  }

  return undefined
}

function parsePayloadPerformance(
  payload: Record<string, unknown> | null,
  fallbackEmotion: string,
  reply: string,
): AlicizationDialoguePerformancePayload {
  const normalizedFallbackEmotion = normalizeAlicizationEmotion(fallbackEmotion).emotion
  if (!payload) {
    return inferPerformanceFromReply({
      reply,
      fallbackEmotion: normalizedFallbackEmotion,
    })
  }

  const nestedPerformance = payload.performance
  if (nestedPerformance && typeof nestedPerformance === 'object' && !Array.isArray(nestedPerformance)) {
    const nestedPerformanceRecord = nestedPerformance as Record<string, unknown>
    if (!hasPerformanceHint(nestedPerformanceRecord)) {
      return inferPerformanceFromReply({
        reply,
        fallbackEmotion: normalizedFallbackEmotion,
      })
    }
    if (!hasPerformanceDynamicsHint(nestedPerformanceRecord)) {
      const nestedEmotion = normalizeAlicizationEmotion(
        nestedPerformanceRecord.baseEmotion ?? nestedPerformanceRecord.emotion ?? normalizedFallbackEmotion,
      ).emotion
      return inferPerformanceFromReply({
        reply,
        fallbackEmotion: nestedEmotion,
      })
    }
    return normalizeAlicizationPerformancePayload(nestedPerformanceRecord, normalizedFallbackEmotion)
  }

  if (!hasPerformanceHint(payload)) {
    return inferPerformanceFromReply({
      reply,
      fallbackEmotion: normalizedFallbackEmotion,
    })
  }
  if (!hasPerformanceDynamicsHint(payload)) {
    const directEmotion = normalizeAlicizationEmotion(payload.baseEmotion ?? payload.emotion ?? normalizedFallbackEmotion).emotion
    return inferPerformanceFromReply({
      reply,
      fallbackEmotion: directEmotion,
    })
  }

  return normalizeAlicizationPerformancePayload({
    baseEmotion: payload.baseEmotion ?? payload.emotion,
    facialCue: payload.facialCue,
    actionCue: payload.actionCue,
    delivery: payload.delivery,
    emphasis: payload.emphasis,
  }, normalizedFallbackEmotion)
}

export function parseLastActEmotion(content: string) {
  const payload = parseLastActPayload(content)
  const emotion = parsePayloadEmotion(payload as Record<string, unknown> | null)
  return emotion || 'neutral'
}

function computeConfidenceCap(input: {
  lexicalStrength: number
  emotionCoherence: number
  extractorAgreement: number
}) {
  const lexicalStrength = clamp(input.lexicalStrength, 0, 1)
  const emotionCoherence = clamp(input.emotionCoherence, 0, 1)
  const extractorAgreement = clamp(input.extractorAgreement, 0, 1)

  return clamp(
    0.45
    + lexicalStrength * 0.3
    + (emotionCoherence - 0.5) * 0.25
    + (extractorAgreement - 0.5) * 0.2,
    0.2,
    0.92,
  )
}

export function calibrateSentimentConfidence(input: {
  rawConfidence?: number
  lexicalStrength: number
  emotionCoherence: number
  extractorAgreement: number
}) {
  const cap = computeConfidenceCap({
    lexicalStrength: input.lexicalStrength,
    emotionCoherence: input.emotionCoherence,
    extractorAgreement: input.extractorAgreement,
  })

  if (typeof input.rawConfidence === 'number' && Number.isFinite(input.rawConfidence)) {
    const raw = clamp(input.rawConfidence, 0, 1)
    return clamp(Math.min(raw, cap), 0, 1)
  }

  return cap
}

export function estimateLexicalSentiment(text: string) {
  const lower = text.toLowerCase()
  let positive = 0
  let negative = 0

  for (const token of sentimentLexiconPositive) {
    if (lower.includes(token))
      positive += 1
  }
  for (const token of sentimentLexiconNegative) {
    if (lower.includes(token))
      negative += 1
  }

  if (positive === 0 && negative === 0)
    return 0

  return clamp((positive - negative) / (positive + negative), -1, 1)
}

function emotionToScore(emotion: string) {
  return emotionToSentiment[emotion] ?? 0
}

export interface StructuredOutputInput {
  fullText: string
  reply: string
  thought: string
  previousEmotion?: string
  userSentimentScore?: number
  sentimentConfidenceRaw?: number
  extractorAgreement?: number
}

export interface StructuredOutputResult {
  thought: string
  emotion: string
  reply: string
  performance: AlicizationDialoguePerformancePayload
  userSentimentScore: number
  sentimentConfidenceRaw?: number
  sentimentConfidence: number
  format: 'mind-turn-v1' | 'fallback-v1'
  parsePath?: StructuredParsePath
  repairTimedOut?: boolean
  visibleReplyBlocked?: boolean
  nonHumanAuthoredStatus?: string | null
  visibleReplyAuthority?: string | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  projectState?: {
    identity: string
    currentPhase: string
    latestLandedProgress: string | null
    primaryOpenLoop: string | null
    nextClosureTarget: string
    continuitySummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRisk?: string | null
    emotionalClosureCue?: string | null
    proactiveSameHerGap?: string | null
    continuityRestraint?: string | null
    continuityArcStage?: string | null
    continuityPreferredTiming?: string | null
    continuityCadence?: string | null
    continuityCue?: string | null
  } | null
  preDialogueAwareness?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine: string | null
    companionBriefingLine: string | null
    companionNextClosureLine: string | null
    awarenessLine: string | null
    emotionalClosureCue: string | null
    reasonPreview: string[]
  } | null
  preDialogueClosure?: {
    status: 'grounded' | 'partial' | 'drift'
    summaryLine: string | null
    companionHeadlineLine?: string | null
    sameHerDriftRiskLine?: string | null
    companionshipReasonLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    emotionalClosureCue?: string | null
    briefingLines: string[]
    reasons: string[]
  } | null
}

export type StructuredValidationIssueCode
  = | 'json-contract-missing'
    | 'emotion-not-whitelisted'
    | 'thought-missing-mind-spine'
    | 'reply-surface-roleplay-residue'

export interface StructuredValidationIssue {
  code: StructuredValidationIssueCode
  message: string
}

const structuredEmotionWhitelist = new Set([
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
])

const legacyThoughtControlMarkers = ['obligation=', 'truth=', 'focus=', 'move=', 'tone='] as const
const stageDirectionPattern = /[（(][^）)]{0,160}(?:声音|鼻音|眼睛|咬唇|歪头|膝盖|贴近|轻轻|依恋|湿湿|whisper|softly|blush|lean|sigh|nod)[^）)]*[）)]/giu
const decorativeRoleplayPattern = /[♡♥❤💕💗💖✨]/gu
function thoughtContainsLegacyControlLine(thought: string) {
  const normalized = thought.trim().toLowerCase()
  return legacyThoughtControlMarkers.every(marker => normalized.includes(marker))
}

function naturalizeStructuredThoughtSurface(thought: string) {
  const trimmed = thought.trim()
  if (!trimmed)
    return ''
  if (!thoughtContainsLegacyControlLine(trimmed))
    return trimmed

  return ''
}

function thoughtHasMindSpine(thought: string) {
  const normalized = thought.trim().toLowerCase()
  if (!normalized)
    return false
  return !thoughtContainsLegacyControlLine(normalized)
}

export function sanitizeStructuredReplySurface(reply: string) {
  const trimmed = reply.trim()
  if (!trimmed)
    return ''
  if (trimmed.match(stageDirectionPattern) || trimmed.match(decorativeRoleplayPattern))
    return ''
  return containsAlicizationFixedTemplateResidue(trimmed)
    || isAlicizationDecorativePersonaTemplateContamination(trimmed)
    ? ''
    : trimmed
}

function normalizeVisibleReplySurface(rawReply: string) {
  const trimmed = rawReply.trim()
  const sanitized = sanitizeStructuredReplySurface(trimmed)
  if (sanitized)
    return sanitized
  return trimmed && sanitized === trimmed ? trimmed : ''
}

export function validateStructuredContract(
  structured: Pick<StructuredOutputResult, 'thought' | 'emotion' | 'reply'>,
  _personalityState?: unknown,
  _context?: unknown,
): StructuredValidationIssue[] {
  const issues: StructuredValidationIssue[] = []
  const emotion = structured.emotion.trim().toLowerCase()

  if (!structuredEmotionWhitelist.has(emotion)) {
    issues.push({
      code: 'emotion-not-whitelisted',
      message: `Emotion "${structured.emotion}" is outside the Alicization emotion whitelist.`,
    })
  }

  if (structured.thought.trim() && !thoughtHasMindSpine(structured.thought)) {
    issues.push({
      code: 'thought-missing-mind-spine',
      message: 'Thought contains a legacy control protocol.',
    })
  }

  if (sanitizeStructuredReplySurface(structured.reply) !== structured.reply.trim()) {
    issues.push({
      code: 'reply-surface-roleplay-residue',
      message: 'Reply contains blocked template or roleplay residue.',
    })
  }

  return issues
}

export function normalizeStructuredOutput(input: StructuredOutputInput): StructuredOutputResult {
  const parsedFromFullText = parseStructuredPayloadFromText(input.fullText)
  const parsed = parsedFromFullText.payload || parsedFromFullText.repairTimedOut
    ? parsedFromFullText
    : parseStructuredPayloadFromText(input.reply)
  const payload = parsed.payload
  const actPayload = parseLastActPayload(input.fullText)

  const thought = naturalizeStructuredThoughtSurface(
    getString(payload, ['thought'])
    || input.thought.trim(),
  )
  const rawReply = getString(payload, ['reply'])
    || input.reply.trim()
    || input.fullText.trim()
  const reply = normalizeVisibleReplySurface(rawReply)
  const inferredEmotion = inferEmotionFromReply({
    reply,
    previousEmotion: input.previousEmotion,
  })
  const rawEmotion = parsePayloadEmotion(payload)
    || parsePayloadEmotion(actPayload as Record<string, unknown> | null)
    || inferredEmotion
    || 'neutral'
  const emotion = normalizeAlicizationEmotion(rawEmotion).emotion
  const performance = parsePayloadPerformance(payload, emotion, reply)
  const digitalLife = parsePayloadDigitalLife(payload, emotion)
  const projectState = parsePayloadProjectState(payload)
  const preDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
    toObjectRecord(payload?.preDialogueAwareness),
  )
  const preDialogueClosure = parsePayloadPreDialogueClosure(payload)
  const visibleReplyBlocked = payload?.visibleReplyBlocked === true
    ? true
    : undefined
  const nonHumanAuthoredStatus = getString(payload, ['nonHumanAuthoredStatus', 'non_human_authored_status']) ?? null
  const visibleReplyAuthority = getString(payload, ['visibleReplyAuthority', 'visible_reply_authority']) ?? null

  const emotionScore = emotionToScore(emotion)
  const lexicalScore = estimateLexicalSentiment(reply)
  const modelSentiment = getNumeric(payload, ['userSentimentScore', 'user_sentiment_score'])
    ?? getNumeric(actPayload as Record<string, unknown> | null, ['userSentimentScore', 'user_sentiment_score'])
  const scoreInput = input.userSentimentScore ?? modelSentiment
  const userSentimentScore = clamp(
    typeof scoreInput === 'number' && Number.isFinite(scoreInput)
      ? scoreInput
      : emotionScore * 0.7 + lexicalScore * 0.3,
    -1,
    1,
  )

  const rawInput = input.sentimentConfidenceRaw
    ?? getNumeric(payload, [
      'sentimentConfidenceRaw',
      'sentiment_confidence_raw',
      'sentimentConfidence',
      'sentiment_confidence',
      'confidence',
    ])
    ?? getNumeric(actPayload as Record<string, unknown> | null, [
      'sentimentConfidenceRaw',
      'sentiment_confidence_raw',
      'sentimentConfidence',
      'sentiment_confidence',
      'confidence',
    ])

  const lexicalStrength = Math.abs(lexicalScore)
  const coherence = input.previousEmotion
    ? (input.previousEmotion === emotion ? 1 : 0.55)
    : 0.7
  const extractorAgreement = clamp(input.extractorAgreement ?? 0.8, 0, 1)
  const calibrated = calibrateSentimentConfidence({
    rawConfidence: rawInput,
    lexicalStrength,
    emotionCoherence: coherence,
    extractorAgreement,
  })

  return {
    thought,
    emotion,
    reply,
    performance,
    userSentimentScore,
    sentimentConfidenceRaw: typeof rawInput === 'number' && Number.isFinite(rawInput)
      ? clamp(rawInput, 0, 1)
      : undefined,
    sentimentConfidence: calibrated,
    format: parsed.parsePath === 'fallback' ? 'fallback-v1' : 'mind-turn-v1',
    parsePath: parsed.parsePath,
    repairTimedOut: parsed.repairTimedOut,
    visibleReplyBlocked,
    nonHumanAuthoredStatus,
    visibleReplyAuthority,
    digitalLife,
    projectState,
    preDialogueAwareness,
    preDialogueClosure,
  }
}
