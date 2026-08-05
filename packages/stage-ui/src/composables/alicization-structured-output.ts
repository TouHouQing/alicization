import type { AlicizationProviderMemoryUsage } from '@proj-alicization/stage-shared'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDigitalLifeEnvelope,
} from '../stores/alicization-bridge'

import {
  alicizationEmotionWhitelist,
  alicizationPerformanceDeliveryWhitelist,
  containsAlicizationFixedTemplateResidue,
  looksLikeAlicizationStructuredPayloadText,
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

export type StructuredParsePath = 'json' | 'fallback'

interface StructuredPayloadParseResult {
  payload: Record<string, unknown> | null
  parsePath: StructuredParsePath
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

function parseStructuredPayloadFromText(content: string): StructuredPayloadParseResult {
  const candidate = content.trim()
  if (!candidate) {
    return {
      payload: null,
      parsePath: 'fallback',
    }
  }

  try {
    const payload = toObjectRecord(JSON.parse(candidate) as unknown)
    return {
      payload,
      parsePath: payload ? 'json' : 'fallback',
    }
  }
  catch {
    return {
      payload: null,
      parsePath: 'fallback',
    }
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

function parsePayloadMemoryUsage(payload: Record<string, unknown> | null): AlicizationProviderMemoryUsage | undefined {
  const memoryUsage = toObjectRecord(payload?.memoryUsage)
  if (!memoryUsage)
    return undefined

  const workingMemoryVersion = memoryUsage.workingMemoryVersion
  const longTermEvidenceIds = memoryUsage.longTermEvidenceIds
  if (
    (workingMemoryVersion !== null && typeof workingMemoryVersion !== 'string')
    || !Array.isArray(longTermEvidenceIds)
    || !longTermEvidenceIds.every(id => typeof id === 'string')
  ) {
    return undefined
  }

  return {
    workingMemoryVersion,
    longTermEvidenceIds: [...longTermEvidenceIds],
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

export function normalizeDialogueStructuredArtifact<T>(value: T): T {
  if (Array.isArray(value))
    return value.map(item => normalizeDialogueStructuredArtifact(item)) as T

  if (!value || typeof value !== 'object')
    return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, normalizeDialogueStructuredArtifact(item)]),
  ) as T
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
  memoryUsage?: AlicizationProviderMemoryUsage
  providerContractIssues?: StructuredValidationIssue[]
  visibleReplyBlocked?: boolean
  nonHumanAuthoredStatus?: string | null
  visibleReplyAuthority?: string | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
}

export type StructuredValidationIssueCode
  = | 'json-contract-missing'
    | 'json-contract-extra-properties'
    | 'format-invalid'
    | 'thought-missing'
    | 'emotion-not-whitelisted'
    | 'reply-missing'
    | 'performance-invalid'
    | 'performance-emotion-mismatch'
    | 'memory-usage-invalid'
    | 'thought-missing-mind-spine'

export interface StructuredValidationIssue {
  code: StructuredValidationIssueCode
  message: string
}

const structuredEmotionWhitelist = new Set<string>(alicizationEmotionWhitelist)
const structuredPerformanceDeliveryWhitelist = new Set<string>(alicizationPerformanceDeliveryWhitelist)
const providerTopLevelFields = new Set([
  'format',
  'thought',
  'emotion',
  'reply',
  'performance',
  'memoryUsage',
])
const providerPerformanceFields = new Set([
  'baseEmotion',
  'facialCue',
  'actionCue',
  'delivery',
  'emphasis',
])
const providerMemoryUsageFields = new Set([
  'workingMemoryVersion',
  'longTermEvidenceIds',
])
const embeddedStructuredEnvelopePattern
  = /"format"\s*:\s*"mind-turn-v1"|"(?:thought|emotion|reply|performance|memoryUsage|digitalLife|runtimeDigest)"\s*:/iu

const legacyThoughtControlMarkers = ['obligation=', 'truth=', 'focus=', 'move=', 'tone='] as const
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

function recordHasExactFields(
  record: Record<string, unknown>,
  expectedFields: ReadonlySet<string>,
) {
  const fields = Object.keys(record)
  return fields.length === expectedFields.size
    && fields.every(field => expectedFields.has(field))
}

function isValidNullableString(value: unknown, maxLength: number) {
  return value === null
    || (typeof value === 'string' && value.length <= maxLength)
}

function validateProviderPayloadContract(
  payload: Record<string, unknown> | null,
  parsePath: StructuredParsePath,
  rawText = '',
): StructuredValidationIssue[] {
  if (parsePath !== 'json' || !payload) {
    const candidate = rawText.trim()
    if (
      candidate
      && !looksLikeAlicizationStructuredPayloadText(candidate)
      && !embeddedStructuredEnvelopePattern.test(candidate)
    ) {
      return []
    }

    return [{
      code: 'json-contract-missing',
      message: 'Provider response was not a strict JSON object.',
    }]
  }

  const issues: StructuredValidationIssue[] = []
  if (!recordHasExactFields(payload, providerTopLevelFields)) {
    issues.push({
      code: 'json-contract-extra-properties',
      message: 'Provider response fields did not exactly match the native JSON schema.',
    })
  }

  if (payload.format !== 'mind-turn-v1') {
    issues.push({
      code: 'format-invalid',
      message: 'Provider response format must be "mind-turn-v1".',
    })
  }

  if (typeof payload.thought !== 'string' || payload.thought.length > 2_000) {
    issues.push({
      code: 'thought-missing',
      message: 'Provider response must contain a string thought within the schema limit.',
    })
  }
  else if (payload.thought.trim() && !thoughtHasMindSpine(payload.thought)) {
    issues.push({
      code: 'thought-missing-mind-spine',
      message: 'Provider response thought contains a legacy control protocol.',
    })
  }

  const rawEmotion = payload.emotion
  const emotionValid = typeof rawEmotion === 'string'
    && structuredEmotionWhitelist.has(rawEmotion)
  if (!emotionValid) {
    issues.push({
      code: 'emotion-not-whitelisted',
      message: 'Provider response emotion is missing or outside the Alicization whitelist.',
    })
  }

  if (
    typeof payload.reply !== 'string'
    || !payload.reply.trim()
    || payload.reply.length > 12_000
  ) {
    issues.push({
      code: 'reply-missing',
      message: 'Provider response must contain a non-empty reply within the schema limit.',
    })
  }

  const performance = toObjectRecord(payload.performance)
  const performanceValid = Boolean(
    performance
    && recordHasExactFields(performance, providerPerformanceFields)
    && typeof performance.baseEmotion === 'string'
    && structuredEmotionWhitelist.has(performance.baseEmotion)
    && isValidNullableString(performance.facialCue, 80)
    && isValidNullableString(performance.actionCue, 80)
    && typeof performance.delivery === 'string'
    && structuredPerformanceDeliveryWhitelist.has(performance.delivery)
    && Number.isInteger(performance.emphasis)
    && (performance.emphasis === 0 || performance.emphasis === 1 || performance.emphasis === 2),
  )
  if (!performanceValid) {
    issues.push({
      code: 'performance-invalid',
      message: 'Provider response performance did not satisfy the native JSON schema.',
    })
  }
  else if (emotionValid && performance?.baseEmotion !== rawEmotion) {
    issues.push({
      code: 'performance-emotion-mismatch',
      message: 'Provider performance baseEmotion must match the top-level emotion.',
    })
  }

  const memoryUsage = toObjectRecord(payload.memoryUsage)
  const longTermEvidenceIds = memoryUsage?.longTermEvidenceIds
  const memoryUsageValid = Boolean(
    memoryUsage
    && recordHasExactFields(memoryUsage, providerMemoryUsageFields)
    && isValidNullableString(memoryUsage.workingMemoryVersion, 120)
    && Array.isArray(longTermEvidenceIds)
    && longTermEvidenceIds.length <= 16
    && longTermEvidenceIds.every(id =>
      typeof id === 'string'
      && id.length >= 1
      && id.length <= 160),
  )
  if (!memoryUsageValid) {
    issues.push({
      code: 'memory-usage-invalid',
      message: 'Provider response memoryUsage did not satisfy the native JSON schema.',
    })
  }

  return issues
}

export function sanitizeStructuredReplySurface(reply: string) {
  const trimmed = reply.trim()
  if (!trimmed)
    return ''
  return containsAlicizationFixedTemplateResidue(trimmed, {
    provenance: 'internal-structured-fact',
  })
    ? ''
    : trimmed
}

export function validateStructuredContract(
  structured: StructuredOutputResult,
  _personalityState?: unknown,
  _context?: unknown,
): StructuredValidationIssue[] {
  const issues: StructuredValidationIssue[] = [...(structured.providerContractIssues ?? [])]
  const emotion = structured.emotion.trim().toLowerCase()

  if (
    !structuredEmotionWhitelist.has(emotion)
    && !issues.some(issue => issue.code === 'emotion-not-whitelisted')
  ) {
    issues.push({
      code: 'emotion-not-whitelisted',
      message: `Emotion "${structured.emotion}" is outside the Alicization emotion whitelist.`,
    })
  }

  if (
    structured.thought.trim()
    && !thoughtHasMindSpine(structured.thought)
    && !issues.some(issue => issue.code === 'thought-missing-mind-spine')
  ) {
    issues.push({
      code: 'thought-missing-mind-spine',
      message: 'Thought contains a legacy control protocol.',
    })
  }

  if (!structured.reply.trim()) {
    if (!issues.some(issue => issue.code === 'reply-missing')) {
      issues.push({
        code: 'reply-missing',
        message: 'Provider response did not contain a visible reply.',
      })
    }
  }
  return issues
}

export function normalizeStructuredOutput(input: StructuredOutputInput): StructuredOutputResult {
  const parsed = parseStructuredPayloadFromText(input.fullText)
  const payload = parsed.payload
  const providerContractIssues = validateProviderPayloadContract(payload, parsed.parsePath, input.fullText)

  const thought = parsed.parsePath === 'json'
    ? (typeof payload?.thought === 'string' ? payload.thought : '')
    : naturalizeStructuredThoughtSurface(input.thought.trim())
  const reply = typeof payload?.reply === 'string'
    ? payload.reply
    : providerContractIssues.length === 0
      ? input.fullText.trim()
      : ''
  const inferredEmotion = inferEmotionFromReply({
    reply,
    previousEmotion: input.previousEmotion,
  })
  const rawEmotion = parsePayloadEmotion(payload)
    || inferredEmotion
    || 'neutral'
  const emotion = normalizeAlicizationEmotion(rawEmotion).emotion
  const performance = parsePayloadPerformance(payload, emotion, reply)
  const memoryUsage = parsePayloadMemoryUsage(payload)
  const digitalLife = parsePayloadDigitalLife(payload, emotion)
  const visibleReplyBlocked = payload?.visibleReplyBlocked === true
    ? true
    : undefined
  const nonHumanAuthoredStatus = getString(payload, ['nonHumanAuthoredStatus', 'non_human_authored_status']) ?? null
  const visibleReplyAuthority = getString(payload, ['visibleReplyAuthority', 'visible_reply_authority']) ?? null

  const emotionScore = emotionToScore(emotion)
  const lexicalScore = estimateLexicalSentiment(reply)
  const modelSentiment = getNumeric(payload, ['userSentimentScore', 'user_sentiment_score'])
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
    format: payload?.format === 'mind-turn-v1' ? 'mind-turn-v1' : 'fallback-v1',
    parsePath: parsed.parsePath,
    memoryUsage,
    ...(providerContractIssues.length > 0
      ? { providerContractIssues }
      : {}),
    visibleReplyBlocked,
    nonHumanAuthoredStatus,
    visibleReplyAuthority,
    digitalLife,
  }
}
