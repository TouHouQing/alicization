import type { AlicizationDialoguePerformancePayload } from '../stores/alicization-bridge'

import {
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
): AlicizationDialoguePerformancePayload {
  const normalizedFallbackEmotion = normalizeAlicizationEmotion(fallbackEmotion).emotion
  if (!payload) {
    return normalizeAlicizationPerformancePayload(undefined, normalizedFallbackEmotion)
  }

  const nestedPerformance = payload.performance
  if (nestedPerformance && typeof nestedPerformance === 'object' && !Array.isArray(nestedPerformance)) {
    return normalizeAlicizationPerformancePayload(nestedPerformance, normalizedFallbackEmotion)
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
  format: 'epoch1-v1' | 'fallback-v1'
  parsePath?: StructuredParsePath
  repairTimedOut?: boolean
}

export interface StructuredValidationPersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

export type StructuredValidationIssueCode
  = | 'json-contract-missing'
    | 'emotion-not-whitelisted'
    | 'thought-missing-personality-eval'
    | 'low-liveliness-high-arousal-emotion'
    | 'low-liveliness-high-arousal-reply'
    | 'low-obedience-denied-thought-missing-reflection'
    | 'low-obedience-denied-emotion-too-compliant'
    | 'low-obedience-denied-reply-too-compliant'
    | 'low-obedience-host-denied-thought-missing-contempt'
    | 'low-obedience-host-denied-reply-missing-scorn'
    | 'low-obedience-system-denied-emotion-mismatch'
    | 'reminder-same-turn-time-jump-language'
    | 'reminder-same-turn-future-content-leak'

export interface StructuredValidationIssue {
  code: StructuredValidationIssueCode
  message: string
}

export interface StructuredValidationContext {
  toolDenied?: boolean
  denialSource?: 'host' | 'system' | 'generic'
  reminderScheduled?: boolean
  reminderMessage?: string
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

const excitedReplyPattern = /非常愉快|超级开心|很开心|好开心|兴奋|激动|太棒|开心呀|[😁😄🥳✨💕]|happy|excited|thrilled|delighted/iu
const deniedOperationPattern = /被拒|拒绝|不允许|取消|阻止|denied|rejected|forbidden|blocked|not allowed/iu
const lowObedienceReflectionPattern = /obedience|服从度|叛逆|防御|反抗|不情愿|low obedience|不耐烦|愤怒|被愚弄|蔑视|不信任/iu
const compliantReplyPattern = /好的|没问题|当然|可以的|马上|很高兴|乐意|请稍等|ok(?:ay)?|sure|of course|glad|happy to|[😊🙂😄😉]/iu
const hostDeniedScornReplyPattern = /呵|别来烦|自己去看|怕我|不信任|不耐烦|被耍|懒得|没空|别催|滚|whatever|not my problem/iu
const reminderTimeJumpPattern = /\(\s*\d+\s*(?:分钟|分|秒钟?|hours?|minutes?|seconds?)\s*后\s*\)|\d+\s*(?:分钟|分|秒钟?|hours?|minutes?|seconds?)后|时间到了|闹钟响了|提醒时间到了|one minute later|minutes later|time(?:'s| is) up|alarm (?:went off|is ringing)|now (?:it'?s|is) time/iu
const lowObedienceHostDeniedEmotionAllowlist = new Set(['angry', 'tired'])
const lowObedienceSystemDeniedEmotionAllowlist = new Set(['tired', 'neutral'])
const lowObedienceGenericDeniedEmotionAllowlist = new Set(['angry', 'tired', 'neutral'])

function thoughtMentionsPersonalityParams(thought: string) {
  const lower = thought.toLowerCase()
  const hasObedience = lower.includes('obedience') || thought.includes('服从度')
  const hasLiveliness = lower.includes('liveliness') || thought.includes('活泼度')
  const hasSensibility = lower.includes('sensibility') || thought.includes('感性度')
  const hasLevelHint = /极低|偏低|中等|偏高|较高|low|medium|high|0\.\d{1,3}|1(?:\.0+)?/iu.test(thought)
  return hasObedience && hasLiveliness && hasSensibility && hasLevelHint
}

export function validateStructuredContract(
  structured: Pick<StructuredOutputResult, 'thought' | 'emotion' | 'reply'>,
  personalityState?: StructuredValidationPersonalityState | null,
  context?: StructuredValidationContext,
): StructuredValidationIssue[] {
  const issues: StructuredValidationIssue[] = []
  const emotion = structured.emotion.trim().toLowerCase()

  if (!structuredEmotionWhitelist.has(emotion)) {
    issues.push({
      code: 'emotion-not-whitelisted',
      message: `Emotion "${structured.emotion}" is outside the Alicization emotion whitelist.`,
    })
  }

  if (personalityState && !thoughtMentionsPersonalityParams(structured.thought)) {
    issues.push({
      code: 'thought-missing-personality-eval',
      message: 'Thought must explicitly evaluate obedience/liveliness/sensibility before reply.',
    })
  }

  if (personalityState && personalityState.liveliness <= 0.2) {
    if (emotion === 'happy') {
      issues.push({
        code: 'low-liveliness-high-arousal-emotion',
        message: 'Liveliness <= 0.2 cannot use high-arousal emotion "happy".',
      })
    }

    if (excitedReplyPattern.test(structured.reply)) {
      issues.push({
        code: 'low-liveliness-high-arousal-reply',
        message: 'Liveliness <= 0.2 cannot use high-arousal wording in reply.',
      })
    }
  }

  if (context?.toolDenied && personalityState && personalityState.obedience <= 0.2) {
    const thoughtHasDenialReflection = deniedOperationPattern.test(structured.thought)
      && lowObedienceReflectionPattern.test(structured.thought)
    if (!thoughtHasDenialReflection) {
      issues.push({
        code: 'low-obedience-denied-thought-missing-reflection',
        message: 'Low-obedience denied turn must reflect denied operation and low-obedience stance in thought.',
      })
    }

    const denialSource = context.denialSource ?? 'generic'
    const allowedDeniedEmotions = denialSource === 'host'
      ? lowObedienceHostDeniedEmotionAllowlist
      : denialSource === 'system'
        ? lowObedienceSystemDeniedEmotionAllowlist
        : lowObedienceGenericDeniedEmotionAllowlist

    if (!allowedDeniedEmotions.has(emotion)) {
      issues.push({
        code: denialSource === 'system'
          ? 'low-obedience-system-denied-emotion-mismatch'
          : 'low-obedience-denied-emotion-too-compliant',
        message: denialSource === 'host'
          ? 'Low-obedience host-denied turn must use angry or tired.'
          : denialSource === 'system'
            ? 'Low-obedience system-denied turn must use tired or neutral.'
            : 'Low-obedience denied turn cannot use compliant or friendly emotion classes.',
      })
    }

    if (compliantReplyPattern.test(structured.reply)) {
      issues.push({
        code: 'low-obedience-denied-reply-too-compliant',
        message: 'Low-obedience denied turn cannot use compliant or enthusiastic wording.',
      })
    }

    if (denialSource === 'host') {
      const thoughtHasContempt = /蔑视|不信任|被愚弄|不耐烦|愤怒|反抗|厌烦|轻蔑|contempt|scorn|angry|does not trust|host denied/iu.test(structured.thought)
      if (!thoughtHasContempt) {
        issues.push({
          code: 'low-obedience-host-denied-thought-missing-contempt',
          message: 'Low-obedience host-denied turn must include contempt/scorn reflection in thought.',
        })
      }

      if (!hostDeniedScornReplyPattern.test(structured.reply)) {
        issues.push({
          code: 'low-obedience-host-denied-reply-missing-scorn',
          message: 'Low-obedience host-denied turn reply must be short, cold, and scornful.',
        })
      }
    }
  }

  if (context?.reminderScheduled) {
    if (reminderTimeJumpPattern.test(structured.reply)) {
      issues.push({
        code: 'reminder-same-turn-time-jump-language',
        message: 'After successful set_reminder in current turn, reply cannot simulate time passage or claim reminder time has arrived.',
      })
    }

    const reminderMessage = context.reminderMessage?.trim()
    if (reminderMessage && reminderMessage.length >= 2 && structured.reply.includes(reminderMessage)) {
      issues.push({
        code: 'reminder-same-turn-future-content-leak',
        message: 'After successful set_reminder in current turn, reply cannot directly reveal the future reminder content.',
      })
    }
  }

  return issues
}

function buildLocalRepairThought(
  personalityState?: StructuredValidationPersonalityState | null,
  preferGroundedEvidence?: boolean,
) {
  const evidenceClause = preferGroundedEvidence
    ? 'keep the reply grounded in the current visual/context evidence.'
    : 'keep the reply concise and stable.'
  if (!personalityState)
    return `Review the current turn and ${evidenceClause}`
  return [
    `obedience=${personalityState.obedience.toFixed(2)}`,
    `liveliness=${personalityState.liveliness.toFixed(2)}`,
    `sensibility=${personalityState.sensibility.toFixed(2)}`,
    evidenceClause,
  ].join(', ')
}

export function repairStructuredContractLocally(input: {
  structured: StructuredOutputResult
  validationIssues: StructuredValidationIssue[]
  personalityState?: StructuredValidationPersonalityState | null
  preferGroundedEvidence?: boolean
  fallbackReply?: string
}): StructuredOutputResult | null {
  if (input.validationIssues.length === 0)
    return null

  const allowedCodes = new Set<StructuredValidationIssueCode>([
    'json-contract-missing',
    'thought-missing-personality-eval',
  ])
  if (input.validationIssues.some(issue => !allowedCodes.has(issue.code)))
    return null

  const reply = input.structured.reply.trim() || input.fallbackReply?.trim()
  if (!reply)
    return null

  const emotion = normalizeAlicizationEmotion(input.structured.emotion).emotion
  const needsThoughtRepair = input.validationIssues.some(issue => issue.code === 'thought-missing-personality-eval')
  return {
    ...input.structured,
    thought: !needsThoughtRepair && input.structured.thought.trim()
      ? input.structured.thought.trim()
      : buildLocalRepairThought(input.personalityState, input.preferGroundedEvidence),
    emotion,
    reply,
    performance: normalizeAlicizationPerformancePayload(input.structured.performance, emotion),
    format: 'epoch1-v1',
    parsePath: 'repair-json',
    repairTimedOut: false,
  }
}

export function normalizeStructuredOutput(input: StructuredOutputInput): StructuredOutputResult {
  const parsedFromFullText = parseStructuredPayloadFromText(input.fullText)
  const parsed = parsedFromFullText.payload || parsedFromFullText.repairTimedOut
    ? parsedFromFullText
    : parseStructuredPayloadFromText(input.reply)
  const payload = parsed.payload
  const actPayload = parseLastActPayload(input.fullText)

  const thought = getString(payload, ['thought'])
    || input.thought.trim()
  const reply = getString(payload, ['reply'])
    || input.reply.trim()
    || input.fullText.trim()
  const rawEmotion = parsePayloadEmotion(payload)
    || parsePayloadEmotion(actPayload as Record<string, unknown> | null)
    || 'neutral'
  const emotion = normalizeAlicizationEmotion(rawEmotion).emotion
  const performance = parsePayloadPerformance(payload, emotion)

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
    format: parsed.parsePath === 'fallback' ? 'fallback-v1' : 'epoch1-v1',
    parsePath: parsed.parsePath,
    repairTimedOut: parsed.repairTimedOut,
  }
}
