import type { AlicizationDialoguePerformancePayload, AlicizationMindTurnGovernance } from '../stores/alicization-bridge'

import {
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../stores/alicization-bridge'
import {
  buildGovernedMindThought,
  buildMindGovernedFallbackSurface,
  normalizeExecutionFirstGovernance,
  replyViolatesExecutionFirstSurface,
  replyLeaksGovernedMindSurface,
  replyLooksOrganicDirectAnswer,
  replyLooksCoherentSceneAnswer,
  replyLooksThinGovernedShell,
  resolveGovernedMindEmotion,
  resolveGovernedMindObligation,
  resolveGovernedMindTone,
  resolveGovernedMindTruth,
  shouldDeferGovernedMindLocalRepair,
  shouldForceGovernedMindSurface,
  shouldPreserveDialogueFirstVisibleReply,
} from './alicization-mind-fallback'

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

function alignPerformanceEmotion(
  performance: AlicizationDialoguePerformancePayload | undefined,
  emotion: string,
): AlicizationDialoguePerformancePayload {
  const normalizedEmotion = normalizeAlicizationEmotion(emotion).emotion
  const normalized = normalizeAlicizationPerformancePayload(performance, normalizedEmotion)
  return {
    ...normalized,
    baseEmotion: normalizedEmotion,
    emotion: normalizedEmotion,
  }
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
}

export interface StructuredValidationPersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

export type StructuredValidationIssueCode
  = | 'json-contract-missing'
    | 'emotion-not-whitelisted'
    | 'thought-missing-mind-spine'
    | 'reply-surface-roleplay-residue'
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
const thoughtMindSpineMarkers = ['obligation=', 'truth=', 'focus=', 'move=', 'tone='] as const
const stageDirectionPattern = /[（(][^）)]{0,160}(?:声音|鼻音|眼睛|咬唇|歪头|膝盖|贴近|轻轻|依恋|湿湿|whisper|softly|blush|lean|sigh|nod)[^）)]*[）)]/giu
const decorativeRoleplayPattern = /[♡♥❤💕💗💖✨]/gu

function thoughtHasMindSpine(thought: string) {
  const normalized = thought.trim().toLowerCase()
  if (!normalized)
    return false
  return thoughtMindSpineMarkers.every(marker => normalized.includes(marker))
}

function readThoughtMarker(thought: string, key: typeof thoughtMindSpineMarkers[number]) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = thought.match(new RegExp(`${escaped}\\s*([^;\\n]+)`, 'i'))
  return match?.[1]?.trim().toLowerCase() ?? ''
}

function thoughtConflictsWithGovernance(thought: string, governance: AlicizationMindTurnGovernance) {
  if (!thoughtHasMindSpine(thought))
    return true

  const expectedObligation = resolveGovernedMindObligation(governance)
  const expectedTruth = resolveGovernedMindTruth(governance)
  const expectedTone = resolveGovernedMindTone(governance)

  return readThoughtMarker(thought, 'obligation=') !== expectedObligation
    || readThoughtMarker(thought, 'truth=') !== expectedTruth
    || (
      (governance.relationshipPosture === 'restrained' || governance.repairState !== 'none')
      && readThoughtMarker(thought, 'tone=') !== expectedTone
    )
}

export function sanitizeStructuredReplySurface(reply: string) {
  return reply
    .replace(stageDirectionPattern, ' ')
    .replace(decorativeRoleplayPattern, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
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

  if (!thoughtHasMindSpine(structured.thought)) {
    issues.push({
      code: 'thought-missing-mind-spine',
      message: 'Thought must carry obligation/truth/focus/move/tone markers before reply.',
    })
  }

  if (sanitizeStructuredReplySurface(structured.reply) !== structured.reply.trim()) {
    issues.push({
      code: 'reply-surface-roleplay-residue',
      message: 'Reply surface still contains decorative roleplay residue or stage-direction narration.',
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
  const truth = preferGroundedEvidence ? 'grounded' : 'uncertain'
  const focus = preferGroundedEvidence ? 'current-screen-and-current-ask' : 'current-user-turn'
  const move = preferGroundedEvidence ? 'lead-with-current-evidence' : 'stabilize-and-answer'
  const tone = (() => {
    if (!personalityState)
      return 'direct'
    if (personalityState.liveliness <= 0.2 || personalityState.sensibility <= 0.2)
      return 'restrained'
    if (personalityState.sensibility >= 0.8)
      return 'warm'
    return 'direct'
  })()
  return `obligation=answer; truth=${truth}; focus=${focus}; move=${move}; tone=${tone}`
}

export function repairStructuredContractLocally(input: {
  structured: StructuredOutputResult
  validationIssues: StructuredValidationIssue[]
  personalityState?: StructuredValidationPersonalityState | null
  preferGroundedEvidence?: boolean
  fallbackReply?: string
  governance?: AlicizationMindTurnGovernance | null
  userText?: string
  translate?: (path: string, params?: Record<string, unknown>) => string
}): StructuredOutputResult | null {
  if (input.validationIssues.length === 0)
    return null

  const effectiveGovernance = normalizeExecutionFirstGovernance({
    governance: input.governance,
    userText: input.userText,
  }).governance ?? input.governance ?? null
  if (
    input.validationIssues.some(issue => issue.code === 'json-contract-missing')
    && shouldDeferGovernedMindLocalRepair(effectiveGovernance)
  ) {
    return null
  }

  const allowedCodes = new Set<StructuredValidationIssueCode>([
    'json-contract-missing',
    'thought-missing-mind-spine',
    'reply-surface-roleplay-residue',
  ])
  if (input.validationIssues.some(issue => !allowedCodes.has(issue.code)))
    return null

  const governedSurface = input.translate
    ? buildMindGovernedFallbackSurface({
        governance: effectiveGovernance,
        userText: input.userText,
        translate: input.translate,
      })
    : null
  const normalizedVisibleReply = sanitizeStructuredReplySurface(input.structured.reply.trim() || input.fallbackReply?.trim() || '')
  const strictSurface = shouldForceGovernedMindSurface(effectiveGovernance, input.userText)
  const leakedGovernedSurface = replyLeaksGovernedMindSurface(normalizedVisibleReply, effectiveGovernance, input.userText)
  const executionSurfaceViolation = replyViolatesExecutionFirstSurface({
    reply: normalizedVisibleReply,
    governance: effectiveGovernance,
    userText: input.userText,
  })
  const preserveSceneReply = replyLooksCoherentSceneAnswer({
    reply: normalizedVisibleReply,
    governance: effectiveGovernance,
    userText: input.userText,
  })
  const preserveOrganicReply = replyLooksOrganicDirectAnswer({
    reply: normalizedVisibleReply,
    governance: effectiveGovernance,
    userText: input.userText,
    thinShellCue: governedSurface?.thinShellCue,
  })
  const dispatchOnlyVisibleOverride = governedSurface?.visibleReplyMode === 'dispatch-only'
  const preserveVisibleReply = Boolean(
    normalizedVisibleReply
    && !leakedGovernedSurface
    && !executionSurfaceViolation
    && (!strictSurface || preserveSceneReply || preserveOrganicReply),
  )
  const reply = preserveVisibleReply
    ? normalizedVisibleReply
    : dispatchOnlyVisibleOverride
      ? ''
      : strictSurface
        ? (
            governedSurface?.reply
            || input.fallbackReply?.trim()
            || normalizedVisibleReply
          )
        : (
            input.fallbackReply?.trim()
            || governedSurface?.reply
            || normalizedVisibleReply
          )
  if (!reply && !dispatchOnlyVisibleOverride)
    return null

  const emotion = normalizeAlicizationEmotion(governedSurface?.emotion ?? input.structured.emotion).emotion
  const needsThoughtRepair = input.validationIssues.some(issue => issue.code === 'thought-missing-mind-spine')
  return {
    ...input.structured,
    thought: !needsThoughtRepair && input.structured.thought.trim()
      ? input.structured.thought.trim()
      : governedSurface?.thought
        ?? buildLocalRepairThought(input.personalityState, input.preferGroundedEvidence),
    emotion,
    reply,
    performance: alignPerformanceEmotion(input.structured.performance, emotion),
    format: 'mind-turn-v1',
    parsePath: 'repair-json',
    repairTimedOut: false,
  }
}

export function enforceGovernedMindTurn(input: {
  structured: StructuredOutputResult & { contractFailed?: boolean }
  governance?: AlicizationMindTurnGovernance | null
  personalityState?: StructuredValidationPersonalityState | null
  preferGroundedEvidence?: boolean
  fallbackReply?: string
  userText?: string
  translate?: (path: string, params?: Record<string, unknown>) => string
}): StructuredOutputResult & { contractFailed?: boolean } {
  const baseReply = sanitizeStructuredReplySurface(
    input.structured.reply.trim()
    || input.fallbackReply?.trim()
    || '',
  )
  const normalizedStructured = {
    ...input.structured,
    reply: baseReply || input.structured.reply.trim() || input.fallbackReply?.trim() || '',
  }

  if (!input.governance)
    return normalizedStructured

  const effectiveGovernance = normalizeExecutionFirstGovernance({
    governance: input.governance,
    userText: input.userText,
  }).governance ?? input.governance
  const governedThought = buildGovernedMindThought({
    governance: effectiveGovernance,
    userText: input.userText,
  })
  const governedEmotion = normalizeAlicizationEmotion(
    resolveGovernedMindEmotion(effectiveGovernance),
  ).emotion
  const needsThoughtRepair = thoughtConflictsWithGovernance(
    normalizedStructured.thought,
    effectiveGovernance,
  )
  const deferVisibleRepair = shouldDeferGovernedMindLocalRepair(effectiveGovernance)
  const preserveDialogueFirstVisibleReply = shouldPreserveDialogueFirstVisibleReply(effectiveGovernance)
  const shouldForceSurface = shouldForceGovernedMindSurface(effectiveGovernance, input.userText)
  const leakedGovernedSurface = replyLeaksGovernedMindSurface(
    normalizedStructured.reply,
    effectiveGovernance,
    input.userText,
  )
  const executionSurfaceViolation = replyViolatesExecutionFirstSurface({
    reply: normalizedStructured.reply,
    governance: effectiveGovernance,
    userText: input.userText,
  })
  const governedSurface = input.translate
    ? buildMindGovernedFallbackSurface({
        governance: effectiveGovernance,
        userText: input.userText,
        translate: input.translate,
      })
    : null
  const thinGovernedShell = governedSurface
    ? replyLooksThinGovernedShell(
        normalizedStructured.reply,
        governedSurface.reply,
        effectiveGovernance,
        governedSurface.thinShellCue,
      )
    : false
  const coherentSceneReply = replyLooksCoherentSceneAnswer({
    reply: normalizedStructured.reply,
    governance: effectiveGovernance,
    userText: input.userText,
  })
  const organicDirectReply = replyLooksOrganicDirectAnswer({
    reply: normalizedStructured.reply,
    governance: effectiveGovernance,
    userText: input.userText,
    thinShellCue: governedSurface?.thinShellCue,
  })
  const dispatchOnlyVisibleOverride = governedSurface?.visibleReplyMode === 'dispatch-only'

  const shouldOverrideVisibleReply = shouldForceSurface
    ? executionSurfaceViolation
    || leakedGovernedSurface
    || (thinGovernedShell && !preserveDialogueFirstVisibleReply)
    || (!coherentSceneReply && !organicDirectReply)
    : executionSurfaceViolation
      || leakedGovernedSurface
      || (thinGovernedShell && !preserveDialogueFirstVisibleReply)

  if (shouldOverrideVisibleReply) {
    const reply = dispatchOnlyVisibleOverride
      ? ''
      : shouldForceSurface
        ? (
            governedSurface?.reply
            || normalizedStructured.reply
            || input.fallbackReply?.trim()
            || ''
          )
        : (
            input.fallbackReply?.trim()
            || governedSurface?.reply
            || normalizedStructured.reply
            || ''
          )
    const emotion = normalizeAlicizationEmotion(governedSurface?.emotion ?? governedEmotion).emotion
    return {
      ...normalizedStructured,
      thought: governedSurface?.thought ?? governedThought,
      emotion,
      reply,
      performance: alignPerformanceEmotion(normalizedStructured.performance, emotion),
      format: 'mind-turn-v1',
      parsePath: 'repair-json',
      repairTimedOut: false,
      contractFailed: false,
    }
  }

  const normalizedFormat = typeof normalizedStructured.format === 'string'
    ? normalizedStructured.format.trim().toLowerCase()
    : ''
  const validationIssues: StructuredValidationIssue[] = []
  if (
    normalizedStructured.contractFailed === true
    || !normalizedFormat
    || normalizedFormat === 'fallback-v1'
    || normalizedFormat === 'epoch1-v1'
  ) {
    validationIssues.push({
      code: 'json-contract-missing',
      message: 'Mind-governed turn must settle into mind-turn-v1 before it can be surfaced.',
    })
  }
  if (!thoughtHasMindSpine(normalizedStructured.thought)) {
    validationIssues.push({
      code: 'thought-missing-mind-spine',
      message: 'Mind-governed turn must carry obligation/truth/focus/move/tone markers.',
    })
  }
  else if (needsThoughtRepair) {
    validationIssues.push({
      code: 'thought-missing-mind-spine',
      message: 'Mind-governed turn thought markers no longer match the governing turn charter.',
    })
  }
  if (sanitizeStructuredReplySurface(normalizedStructured.reply) !== normalizedStructured.reply.trim()) {
    validationIssues.push({
      code: 'reply-surface-roleplay-residue',
      message: 'Mind-governed turn cannot keep decorative roleplay residue on the reply surface.',
    })
  }

  if (validationIssues.length === 0) {
    return {
      ...normalizedStructured,
      thought: needsThoughtRepair ? governedThought : normalizedStructured.thought,
      emotion: governedEmotion,
      performance: alignPerformanceEmotion(normalizedStructured.performance, governedEmotion),
      format: 'mind-turn-v1' as const,
      contractFailed: false,
    }
  }

  const repaired = repairStructuredContractLocally({
    structured: normalizedStructured,
    validationIssues,
    personalityState: input.personalityState,
    preferGroundedEvidence: input.preferGroundedEvidence,
    fallbackReply: normalizedStructured.reply || input.fallbackReply,
    governance: effectiveGovernance,
    userText: input.userText,
    translate: input.translate,
  })
  if (repaired) {
    return {
      ...repaired,
      contractFailed: false,
    }
  }

  const emotion = normalizeAlicizationEmotion(governedSurface?.emotion ?? normalizedStructured.emotion).emotion
  const reply = deferVisibleRepair
    ? (
        normalizedStructured.reply
        || input.fallbackReply?.trim()
        || governedSurface?.reply
        || ''
      )
    : (
        governedSurface?.reply
        || normalizedStructured.reply
        || input.fallbackReply?.trim()
        || ''
      )

  return {
    ...normalizedStructured,
    thought: governedSurface?.thought
      ?? governedThought
      ?? buildLocalRepairThought(input.personalityState, input.preferGroundedEvidence),
    emotion,
    reply,
    performance: alignPerformanceEmotion(normalizedStructured.performance, emotion),
    format: 'mind-turn-v1',
    parsePath: 'repair-json',
    repairTimedOut: false,
    contractFailed: false,
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
  const rawReply = getString(payload, ['reply'])
    || input.reply.trim()
    || input.fullText.trim()
  const reply = sanitizeStructuredReplySurface(rawReply) || rawReply.trim()
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
  }
}
