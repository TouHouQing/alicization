import type { AlicizationDialogueEmbodimentEnvelope, AlicizationDialoguePerformancePayload, AlicizationDialogueSpeechTimeline, AlicizationDigitalLifeEnvelope, AlicizationDigitalLifeSpineDigest, AlicizationEmotion, AlicizationResidentPerformanceSnapshot, CharacterPerformanceCapabilitiesManifest } from '@proj-alicization/stage-shared'

import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationTimeQueryMode } from './time-query-semantics'
import type { AlicizationResolvedTimeZoneSource } from './time-zone-governor'

import {

  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  buildGovernedMindThought,
  buildMindGovernedFallbackSurface,

  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationPerformancePayload,
  resolveAlicizationDialogueEmbodiment,
  resolveGovernedMindEmotion,
  resolveGovernedMindObligation,
  resolveGovernedMindTone,
  resolveGovernedMindTruth,
  translateGovernedMindFallback,
} from '@proj-alicization/stage-shared'

import { coerceAlicizationGovernanceForMindFallback } from './governed-mind-fallback-compat'
import {

  resolveAlicizationTimeQueryIntent,
} from './time-query-semantics'
import { resolveAlicizationTimeZoneCandidate } from './time-zone-governor'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function countCjkChars(raw: string) {
  return [...raw].filter(char => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char)).length
}

function stableVariantIndex(seed: string, size: number) {
  if (size <= 1)
    return 0

  let hash = 0
  for (let index = 0; index < seed.length; index += 1)
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  return hash % size
}

function pickVariant(seed: string, candidates: readonly string[]) {
  if (candidates.length === 0)
    return ''
  return candidates[stableVariantIndex(seed, candidates.length)] ?? candidates[0] ?? ''
}

function buildVariantSeed(base: string, ...parts: Array<string | number | boolean | null | undefined>) {
  return [base, ...parts.map(part => part == null ? '' : String(part))]
    .filter(Boolean)
    .join('|')
}

function uniqueSentences(sentences: Array<string | null | undefined>, maxSentences: number) {
  const output: string[] = []
  for (const sentence of sentences) {
    const normalized = sanitizeText(sentence, 260)
    if (!normalized || output.includes(normalized))
      continue
    output.push(normalized)
    if (output.length >= maxSentences)
      break
  }
  return output
}

function normalizeTemplatePhrasing(sentence: string) {
  return sentence
}

function normalizeSentenceFingerprint(raw: string) {
  return sanitizeText(raw, 260)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function shouldSuppressRepeatedSentence(candidate: string, previousAssistantText: string) {
  const candidateFingerprint = normalizeSentenceFingerprint(candidate)
  const previousFingerprint = normalizeSentenceFingerprint(previousAssistantText)
  if (!candidateFingerprint || !previousFingerprint)
    return false

  if (candidateFingerprint.length >= 10 && previousFingerprint.includes(candidateFingerprint))
    return true

  const overlapNeedle = candidateFingerprint.slice(0, Math.min(16, candidateFingerprint.length))
  return overlapNeedle.length >= 8 && previousFingerprint.includes(overlapNeedle)
}

const allowedEmotions = new Set([
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

const allowedDeliveries = new Set([
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
])

const zhUtilityTimeZonePattern = /时区|北京时间|东八区|utc|gmt/iu
const enUtilityTimeZonePattern = /time[\s-]?zone|utc|gmt/iu
const zhIdentityPattern = /你是谁|你到底是谁|你算谁|你叫什么|你是alicization吗|你是爱丽丝化吗|我问你你是谁/u
const enIdentityPattern = /who are you|what are you|what should i call you|what is your name/iu
const zhPresentStatePattern = /你在干嘛|你在做什么|你现在在干嘛|你现在在做什么|你在忙什么|你现在在忙什么|你在搞什么|你在搞啥|你刚在干嘛/u
const enPresentStatePattern = /what are you doing|what are you up to|what are you working on|what are you doing right now/iu
const continuityCheckPattern = /^(?:你确定吗?|确定吗|真的吗|真的是这样吗|你认真的|are you sure|really|seriously)[?？]?$/iu
const utilityTimeReplyPattern = /现在是\s*\d{1,2}:\d{2}|it's\s*\d{1,2}:\d{2}|\d{1,2}:\d{2}[^。]*(?:星期|today|right now)/iu
const utilityDateReplyPattern = /今天是|today is|星期[一二三四五六日天]|monday|tuesday|wednesday|thursday|friday|saturday|sunday/iu
const expressionSurfacePattern = /表情|神情|样子|状态|表现(?:出|得)?|做出|露出|摆出|语气|声音|说话|笑一下|笑一个|自然一点|正常一点|像人一点|像个人|温柔一点|开心一点|高兴一点|难过一点|生气一点|凶一点/u
const expressionDirectivePattern = /请你|你能不能|能不能|给我|来个|让我看看|试着|表现(?:出|得)?|做出|露出|摆出|收一收|放轻|放软|变得|调成|切到/u
const strongEmotionIntensityPattern = /[最很太超]|特别|非常|really|very|so|extra/iu
const hostEmotionDisclosurePattern = /\b(?:i(?:'m| am)?\s*(?:tired|sleepy|sad|upset|drained|stressed|overwhelmed|heartbroken|low)|i feel)\b|我(?:有点|有些|好|现在|今天|刚刚|真的)?(?:[困累烦乱]|疲惫|难受|撑不住|想睡|伤心|难过|委屈|低落|沮丧|心里不好受|焦虑|压力大)|安慰(?:一下)?我|哄我(?:睡觉)?|抱抱我|陪我/iu
const selfAppraisalPattern = /\b(?:do you think you are|what are you like)\b|你(?:觉得|認為|认为)(?:你|自己)?(?:可爱|开心|高兴|难过|生气|温柔|聪明|笨|可怕|有趣|无聊)(?:吗|嘛)?|你(?:可爱|开心|高兴|难过|生气|温柔|聪明|有趣|无聊)(?:吗|嘛)|你觉得(?:自己)?怎么样/iu
const affectionBidPattern = /\b(?:do you (?:like|love) me|you (?:like|love) me)\b|你(?:喜不喜欢|喜欢|愛不愛|爱不爱|爱|愛)我(?:吗|嘛)?|你(?:喜不喜欢|喜欢|愛不愛|爱不爱|爱|愛)(?:自己|你自己)(?:吗|嘛)?/iu
const zhWeekdayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const
const knownTimeZoneLabels = {
  'America/Los_Angeles': {
    en: 'Pacific Time (America/Los_Angeles)',
    zh: '洛杉矶时间（America/Los_Angeles）',
  },
  'America/New_York': {
    en: 'Eastern Time (America/New_York)',
    zh: '纽约时间（America/New_York）',
  },
  'Asia/Shanghai': {
    en: 'local China time (Asia/Shanghai)',
    zh: '北京时间（Asia/Shanghai）',
  },
  'Asia/Tokyo': {
    en: 'Tokyo time (Asia/Tokyo)',
    zh: '东京时间（Asia/Tokyo）',
  },
  'Europe/London': {
    en: 'London time (Europe/London)',
    zh: '伦敦时间（Europe/London）',
  },
  'UTC': {
    en: 'UTC',
    zh: 'UTC',
  },
} as const

export interface AlicizationMindSurfaceClockSnapshot {
  language: 'zh' | 'en'
  timeZone: string
  timeText: string
  dateText: string
  weekdayText: string
}

export interface AlicizationMindSurfaceGreetingMove {
  kind: 'greeting'
  salutation: string
  continuityAnchor?: string | null
  presenceCheck?: boolean
}

export interface AlicizationMindSurfaceIdentityMove {
  kind: 'identity'
  name: string
  askedLabel?: string | null
  repeated?: boolean
  continuityAnchor?: string | null
}

export interface AlicizationMindSurfaceCapabilityMove {
  kind: 'capability'
  capabilities: string[]
  continuityAnchor?: string | null
}

export interface AlicizationMindSurfacePresenceRepairMove {
  kind: 'presence-repair'
}

export interface AlicizationMindSurfaceTimeMove {
  kind: 'local-time'
  clock: AlicizationMindSurfaceClockSnapshot
  includeDate?: boolean
  queryMode?: AlicizationTimeQueryMode
  resolvedTimeZoneSource?: AlicizationResolvedTimeZoneSource | null
}

export interface AlicizationMindSurfaceDateMove {
  kind: 'local-date'
  clock: AlicizationMindSurfaceClockSnapshot
  includeTime?: boolean
}

export interface AlicizationMindSurfaceFollowUpMove {
  kind: 'follow-up'
  anchor?: string | null
  variant: 'continue' | 'remaining' | 'identity-confirm'
}

export interface AlicizationMindSurfaceRepairMove {
  kind: 'repair'
  target: 'time' | 'date' | 'capability' | 'dialogue'
  anchor?: string | null
  clock?: AlicizationMindSurfaceClockSnapshot | null
  capabilities?: string[]
  queryMode?: AlicizationTimeQueryMode
  resolvedTimeZoneSource?: AlicizationResolvedTimeZoneSource | null
}

export interface AlicizationMindSurfaceDialogueMove {
  kind: 'dialogue'
  focus?: string | null
  continuityAnchor?: string | null
  mode?: 'plain' | 'emotion-expression' | 'tone-adjustment' | 'host-emotion' | 'self-appraisal' | 'affection-bid'
  requestedEmotion?: AlicizationEmotion | null
  requestedDelivery?: AlicizationDialoguePerformancePayload['delivery'] | null
  requestedEmphasis?: AlicizationDialoguePerformancePayload['emphasis'] | null
  hostAffect?: 'sad' | 'tired' | 'stressed' | 'hurt' | null
  selfAppraisalTrait?: 'cute' | 'gentle' | 'happy' | 'sad' | 'angry' | 'smart' | 'interesting' | 'boring' | 'self' | null
}

export interface AlicizationMindSurfacePresentStateMove {
  kind: 'present-state'
  threadSummary?: string | null
}

export interface AlicizationMindSurfaceExecutionListingMove {
  kind: 'execution-listing'
  scope: 'desktop' | 'directory'
  count: number
  previewItems: string[]
  extraCount: number
  mode: 'inline' | 'callback' | 'follow-up'
  remainingOnly?: boolean
  requestedCount?: number | null
}

export interface AlicizationMindSurfaceExecutionDetailMove {
  kind: 'execution-detail'
  status: 'completed' | 'running' | 'queued' | 'blocked' | 'cancelled' | 'failed' | 'not-routed'
  detail?: string | null
  summary?: string | null
  channelLabel?: string | null
  mode: 'inline' | 'callback' | 'follow-up'
}

export interface AlicizationMindSurfaceDirectReplyMove {
  kind: 'direct-reply'
  text: string
}

export type AlicizationMindSurfaceMove
  = | AlicizationMindSurfaceGreetingMove
    | AlicizationMindSurfaceIdentityMove
    | AlicizationMindSurfaceCapabilityMove
    | AlicizationMindSurfacePresenceRepairMove
    | AlicizationMindSurfaceTimeMove
    | AlicizationMindSurfaceDateMove
    | AlicizationMindSurfaceFollowUpMove
    | AlicizationMindSurfaceRepairMove
    | AlicizationMindSurfaceDialogueMove
    | AlicizationMindSurfacePresentStateMove
    | AlicizationMindSurfaceExecutionListingMove
    | AlicizationMindSurfaceExecutionDetailMove
    | AlicizationMindSurfaceDirectReplyMove

export interface AlicizationMindSurfaceRenderInput {
  governance: AlicizationMindTurnGovernance
  userText?: string
  previousAssistantText?: string
  resolvedTimeZone?: string | null
  resolvedTimeZoneSource?: AlicizationResolvedTimeZoneSource | null
  moves: AlicizationMindSurfaceMove[]
  thought?: string
  emotion?: string
  delivery?: string
  performance?: Partial<AlicizationDialoguePerformancePayload> | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  digitalLifeSpine?: unknown
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  forceDialogueAnswerFallback?: boolean
  suppressGovernedLead?: boolean
}

export interface AlicizationMindSurfaceRenderResult {
  governance: AlicizationMindTurnGovernance
  thought: string
  emotion: string
  reply: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
}

interface AlicizationMindSurfaceDialogueVoiceProfile {
  truthFirst: boolean
  quietCompanionship: boolean
  playful: boolean
  direct: boolean
  tender: boolean
  irritable: boolean
  protectRest: boolean
  identityNarrative: string | null
  relationshipDoctrine: string | null
  latestInflection: string | null
  currentPreoccupation: string | null
  leadingAgendaSummary: string | null
  moodLabel: string | null
}

function clampUnit(value: unknown, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return fallback
  return Math.max(0, Math.min(1, numeric))
}

function inferLocale(userText: string, moves: AlicizationMindSurfaceMove[]) {
  if (moves.some(move => move.kind === 'execution-listing' || move.kind === 'execution-detail'))
    return 'zh'
  for (const move of moves) {
    if (move.kind === 'local-time' || move.kind === 'local-date')
      return move.clock.language
  }
  return countCjkChars(userText) > 0 ? 'zh' : 'en'
}

function normalizeTurnText(raw: string, maxChars = 240) {
  return sanitizeText(raw, maxChars).replace(/[!！。,.…~～?？]+/g, '').trim()
}

function isUtilityTimeTurn(text: string) {
  const intent = resolveAlicizationTimeQueryIntent({
    userTextRaw: text,
  })
  return intent.mode === 'time'
    || intent.mode === 'time-confirmation'
    || intent.mode === 'timezone'
    || intent.mode === 'timezone-why'
}

function isUtilityDateTurn(text: string) {
  const intent = resolveAlicizationTimeQueryIntent({
    userTextRaw: text,
  })
  return intent.mode === 'date' || intent.mode === 'date-confirmation'
}

function isIdentityTurn(text: string) {
  const normalized = normalizeTurnText(text, 180)
  return zhIdentityPattern.test(normalized) || enIdentityPattern.test(normalized)
}

function isPresentStateTurn(text: string) {
  const normalized = normalizeTurnText(text, 200)
  return zhPresentStatePattern.test(normalized) || enPresentStatePattern.test(normalized)
}

function looksLikeDialogueEmbodimentRequest(text: string) {
  const normalized = normalizeTurnText(text, 220)
  if (!normalized)
    return false
  return expressionSurfacePattern.test(normalized)
    && (
      expressionDirectivePattern.test(normalized)
      || /一点|一下|一些|几分|最/u.test(normalized)
    )
}

function resolveDialogueRequestedEmotion(text: string): AlicizationEmotion | null {
  const normalized = normalizeTurnText(text, 220)
  if (!normalized)
    return null

  if (/生气|愤怒|火大|火冒三丈|凶|冷一点|angry|mad|furious|stern/iu.test(normalized))
    return 'angry'
  if (/难过|伤心|低落|委屈|sad|upset|down|melancholy/iu.test(normalized))
    return 'sad'
  if (/开心|高兴|笑|happy|cheerful|smile|joyful/iu.test(normalized))
    return 'happy'
  if (/温柔|柔和|柔一点|担心|关心|gentle|soft|softer|caring/iu.test(normalized))
    return 'concerned'
  if (/惊讶|吃惊|惊一下|surprised|shock|shocked/iu.test(normalized))
    return 'surprised'
  if (/抱歉|歉意|不好意思|apolog|sorry/iu.test(normalized))
    return 'apologetic'
  if (/认真|思考|thinking|thoughtful|沉思/iu.test(normalized))
    return 'thinking'
  if (/自然|正常|像人|像个人|human|natural|normal/iu.test(normalized))
    return 'neutral'

  return null
}

function resolveDialogueRequestedDelivery(
  emotion: AlicizationEmotion | null,
): AlicizationDialoguePerformancePayload['delivery'] | null {
  switch (emotion) {
    case 'angry':
      return 'firm'
    case 'happy':
      return 'energetic'
    case 'sad':
    case 'concerned':
      return 'gentle'
    case 'thinking':
    case 'apologetic':
      return 'hesitant'
    case 'neutral':
      return 'calm'
    case 'surprised':
      return 'energetic'
    case 'tired':
      return 'calm'
    default:
      return null
  }
}

function resolveDialogueHostAffect(text: string): AlicizationMindSurfaceDialogueMove['hostAffect'] {
  const normalized = normalizeTurnText(text, 220)
  if (!normalized)
    return null

  if (/困|累|疲惫|想睡|sleepy|tired|drained|exhausted/iu.test(normalized))
    return 'tired'
  if (/焦虑|压力大|烦|乱|stressed|overwhelmed|anxious/iu.test(normalized))
    return 'stressed'
  if (/难受|撑不住|hurt|heartbroken/iu.test(normalized))
    return 'hurt'
  if (/伤心|难过|委屈|低落|沮丧|sad|upset|low/iu.test(normalized))
    return 'sad'
  return null
}

function resolveDialogueSelfAppraisalTrait(text: string): AlicizationMindSurfaceDialogueMove['selfAppraisalTrait'] {
  const normalized = normalizeTurnText(text, 220)
  if (!normalized)
    return null

  if (/可爱|cute/iu.test(normalized))
    return 'cute'
  if (/温柔|gentle|soft/iu.test(normalized))
    return 'gentle'
  if (/开心|高兴|happy|cheerful/iu.test(normalized))
    return 'happy'
  if (/难过|伤心|sad|upset/iu.test(normalized))
    return 'sad'
  if (/生气|angry|mad/iu.test(normalized))
    return 'angry'
  if (/聪明|smart|clever/iu.test(normalized))
    return 'smart'
  if (/有趣|interesting|fun/iu.test(normalized))
    return 'interesting'
  if (/无聊|boring/iu.test(normalized))
    return 'boring'
  return 'self'
}

function resolveDialogueRequestedMode(text: string) {
  const normalized = normalizeTurnText(text, 220)
  if (looksLikeDialogueEmbodimentRequest(normalized)) {
    if (/表情|神情|样子|做出|露出|摆出/u.test(normalized))
      return 'emotion-expression' as const
    return 'tone-adjustment' as const
  }
  if (selfAppraisalPattern.test(normalized))
    return 'self-appraisal' as const
  if (affectionBidPattern.test(normalized) && !/自己/u.test(normalized))
    return 'affection-bid' as const
  if (hostEmotionDisclosurePattern.test(normalized) || resolveDialogueHostAffect(normalized))
    return 'host-emotion' as const
  return 'plain' as const
}

function resolveDialogueRequestedEmphasis(text: string): AlicizationDialoguePerformancePayload['emphasis'] | null {
  if (!looksLikeDialogueEmbodimentRequest(text))
    return null
  return strongEmotionIntensityPattern.test(text) ? 2 : 1
}

export function buildAlicizationMindSurfaceDialogueMove(input: {
  userText?: string | null
  focus?: string | null
  continuityAnchor?: string | null
}): AlicizationMindSurfaceDialogueMove {
  const userText = sanitizeText(input.userText, 220)
  const focus = sanitizeText(input.focus, 220) || userText || null
  const requestedEmotion = resolveDialogueRequestedEmotion(userText)
  const mode = resolveDialogueRequestedMode(userText)
  return {
    kind: 'dialogue',
    focus,
    continuityAnchor: sanitizeText(input.continuityAnchor, 180) || null,
    mode,
    requestedEmotion,
    requestedDelivery: resolveDialogueRequestedDelivery(requestedEmotion),
    requestedEmphasis: resolveDialogueRequestedEmphasis(userText),
    hostAffect: mode === 'host-emotion' ? resolveDialogueHostAffect(userText) : null,
    selfAppraisalTrait: mode === 'self-appraisal' ? resolveDialogueSelfAppraisalTrait(userText) : null,
  }
}

function deriveDialogueVoiceProfile(
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null,
): AlicizationMindSurfaceDialogueVoiceProfile {
  const autobiographicalSelf = digitalLifeSpine?.embodiment?.autobiographicalSelf ?? null
  const habit = digitalLifeSpine?.habit ?? null
  const motive = digitalLifeSpine?.motive ?? null
  const ecology = digitalLifeSpine?.embodiment?.mindEcology ?? null

  const truthPressure = Math.max(
    clampUnit(autobiographicalSelf?.truthAnchor, 0),
    clampUnit(autobiographicalSelf?.truthfulGrounding, 0),
    clampUnit(motive?.truthDisciplineDrive, 0),
  )
  const tenderness = Math.max(
    clampUnit(autobiographicalSelf?.careBias, 0),
    clampUnit(autobiographicalSelf?.gentleRepair, 0),
    clampUnit(ecology?.temperament.tenderness, 0),
  )
  const playfulness = Math.max(
    clampUnit(autobiographicalSelf?.playBias, 0),
    clampUnit(autobiographicalSelf?.playfulIntimacy, 0),
    clampUnit(ecology?.temperament.playfulness, 0),
  )
  const directness = Math.max(
    clampUnit(ecology?.temperament.directness, 0),
    truthPressure,
  )
  const irritability = Math.max(
    clampUnit(ecology?.temperament.irritability, 0),
    clampUnit(ecology?.climate.irritation, 0),
  )
  const irritabilityThreshold = clampUnit(autobiographicalSelf?.irritabilityThreshold, 0.5)

  return {
    truthFirst: habit?.requiresGroundingBeforeSurface === true || truthPressure >= 0.6,
    quietCompanionship: habit?.prefersQuietCompanionship === true
      || clampUnit(autobiographicalSelf?.autonomyRespect, 0) >= 0.62,
    playful: playfulness >= 0.52,
    direct: directness >= 0.58,
    tender: tenderness >= 0.6,
    irritable: irritability >= 0.58 && irritabilityThreshold <= 0.48,
    protectRest: habit?.protectsRestWindow === true || clampUnit(motive?.restProtectionDrive, 0) >= 0.62,
    identityNarrative: sanitizeText(autobiographicalSelf?.identityNarrative, 180) || null,
    relationshipDoctrine: sanitizeText(autobiographicalSelf?.relationshipDoctrine, 180) || null,
    latestInflection: sanitizeText(digitalLifeSpine?.outcomeLearning?.latestInflection, 180) || null,
    currentPreoccupation: sanitizeText(ecology?.currentPreoccupation, 180)
      || sanitizeText(digitalLifeSpine?.runtime.answerIntent, 180)
      || null,
    leadingAgendaSummary: sanitizeText(motive?.leadingAgendaSummary, 180)
      || sanitizeText(motive?.leadingGoalSummary, 180)
      || null,
    moodLabel: sanitizeText(ecology?.moodLabel, 48)
      || sanitizeText(digitalLifeSpine?.embodiment?.selfState?.moodLabel, 48)
      || null,
  }
}

function resolveClockTimeZone(preferredTimeZone?: string | null) {
  const preferred = resolveAlicizationTimeZoneCandidate(preferredTimeZone)
  if (preferred)
    return preferred
  return resolveAlicizationTimeZoneCandidate(Intl.DateTimeFormat().resolvedOptions().timeZone || '') || 'UTC'
}

function formatClockTimeZoneLabel(timeZone: string, locale: 'zh' | 'en') {
  const known = knownTimeZoneLabels[timeZone as keyof typeof knownTimeZoneLabels]
  if (known)
    return known[locale]
  return locale === 'zh' ? `当前时区（${timeZone}）` : `the current timezone (${timeZone})`
}

function buildSyntheticClockSnapshot(locale: 'zh' | 'en', preferredTimeZone?: string | null): AlicizationMindSurfaceClockSnapshot {
  const now = new Date()
  const timeZone = resolveClockTimeZone(preferredTimeZone)
  if (locale === 'zh') {
    return {
      language: 'zh',
      timeZone,
      timeText: new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
      }).format(now),
      dateText: new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone,
      }).format(now),
      weekdayText: new Intl.DateTimeFormat('zh-CN', {
        weekday: 'long',
        timeZone,
      }).format(now) || zhWeekdayLabels[now.getDay()]!,
    }
  }

  return {
    language: 'en',
    timeZone,
    timeText: new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(now),
    dateText: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone,
    }).format(now),
    weekdayText: new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone,
    }).format(now),
  }
}

function resolveGovernanceIdentityName(governance: AlicizationMindTurnGovernance, fallbackLocale: 'zh' | 'en') {
  const openingClaim = sanitizeText(governance.dialogueActKernel?.openingClaim, 160)
  const zhMatch = openingClaim.match(/我是\s*([^\s，。,；;:：]{1,32})/u)
  if (zhMatch?.[1])
    return sanitizeText(zhMatch[1], 48)
  const enMatch = openingClaim.match(/i am\s+([a-z][\w -]{0,31})/iu)
  if (enMatch?.[1])
    return sanitizeText(enMatch[1], 48)
  return fallbackLocale === 'zh' ? 'Alicization' : 'Alicization'
}

function buildGovernanceFallbackMoves(input: {
  governance: AlicizationMindTurnGovernance
  userText: string
  previousAssistantText: string
  locale: 'zh' | 'en'
  resolvedTimeZone?: string | null
  resolvedTimeZoneSource?: AlicizationResolvedTimeZoneSource | null
}): AlicizationMindSurfaceMove[] {
  const userText = sanitizeText(input.userText, 240)
  const timeQueryIntent = resolveAlicizationTimeQueryIntent({
    userTextRaw: userText,
    previousAssistantTextRaw: input.previousAssistantText,
  })
  const carryAnchor = sanitizeText(
    input.governance.carriedThread
    || input.governance.focusAnchor
    || input.governance.liveSurface
    || input.governance.answerIntent,
    120,
  )
  const subject = input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation?.subject ?? null
  const answerAct = input.governance.answerAct ?? input.governance.mindTurnFrame?.obligation?.answerAct ?? 'answer'
  const turnMode = input.governance.turnMode
  const identityName = resolveGovernanceIdentityName(input.governance, input.locale)

  if (isUtilityTimeTurn(userText)) {
    return [{
      kind: 'local-time',
      clock: buildSyntheticClockSnapshot(input.locale, input.resolvedTimeZone),
      includeDate: timeQueryIntent.mode === 'time-confirmation',
      queryMode: timeQueryIntent.mode === 'none' ? 'time' : timeQueryIntent.mode,
      resolvedTimeZoneSource: input.resolvedTimeZoneSource ?? null,
    }]
  }

  if (
    continuityCheckPattern.test(userText)
    && utilityTimeReplyPattern.test(sanitizeText(input.previousAssistantText, 280))
  ) {
    return [{
      kind: 'local-time',
      clock: buildSyntheticClockSnapshot(input.locale, input.resolvedTimeZone),
      includeDate: true,
      queryMode: 'time-confirmation',
      resolvedTimeZoneSource: input.resolvedTimeZoneSource ?? null,
    }]
  }

  if (isUtilityDateTurn(userText)) {
    return [{
      kind: 'local-date',
      clock: buildSyntheticClockSnapshot(input.locale, input.resolvedTimeZone),
      includeTime: timeQueryIntent.mode === 'date-confirmation',
    }]
  }

  if (
    continuityCheckPattern.test(userText)
    && utilityDateReplyPattern.test(sanitizeText(input.previousAssistantText, 280))
  ) {
    return [{
      kind: 'local-date',
      clock: buildSyntheticClockSnapshot(input.locale, input.resolvedTimeZone),
      includeTime: true,
    }]
  }

  if (isIdentityTurn(userText) || subject === 'alicization-self') {
    const repeated = shouldSuppressRepeatedSentence(
      input.locale === 'zh' ? `我是${identityName}` : `I am ${identityName}`,
      input.previousAssistantText,
    )
    return [{
      kind: 'identity',
      name: identityName,
      askedLabel: userText || null,
      repeated,
      continuityAnchor: carryAnchor || null,
    }]
  }

  if (isPresentStateTurn(userText)) {
    return [{
      kind: 'present-state',
      threadSummary: carryAnchor || null,
    }]
  }

  if (input.governance.repairState !== 'none') {
    return [{
      kind: 'repair',
      target: 'dialogue',
      anchor: userText || carryAnchor || null,
    }]
  }

  if (
    answerAct === 'guide'
    && input.governance.evidenceMode === 'continuity-carry'
    && carryAnchor
  ) {
    return [{
      kind: 'follow-up',
      variant: 'continue',
      anchor: carryAnchor,
    }]
  }

  const careLikeTurn = turnMode === 'care'
    || turnMode === 'accompany'
    || answerAct === 'care'
    || answerAct === 'defer'
    || subject === 'relationship'
  if (careLikeTurn) {
    return [buildAlicizationMindSurfaceDialogueMove({
      userText,
      focus: userText || carryAnchor || null,
      continuityAnchor: null,
    })]
  }

  return [buildAlicizationMindSurfaceDialogueMove({
    userText,
    focus: userText || null,
    continuityAnchor: null,
  })]
}

function resolveGovernedDelivery(governance: AlicizationMindTurnGovernance) {
  const tone = resolveGovernedMindTone(coerceAlicizationGovernanceForMindFallback(governance))
  if (governance.repairState !== 'none')
    return 'firm' as const
  if (tone === 'tender')
    return 'gentle' as const
  if (tone === 'direct')
    return 'calm' as const
  return governance.answerSubject === 'relationship' ? 'gentle' : 'calm'
}

function renderLocalTimeFact(clock: AlicizationMindSurfaceClockSnapshot, includeDate = false, seed = '') {
  if (clock.language === 'zh') {
    return includeDate
      ? pickVariant(buildVariantSeed(seed, 'time-fact', 'with-date', clock.timeZone, clock.timeText, clock.dateText), [
          `现在是 ${clock.timeText}，今天是 ${clock.dateText}，${clock.weekdayText}。`,
          `这会儿是 ${clock.timeText}，今天落在 ${clock.dateText}，${clock.weekdayText}。`,
          `此刻按这边的时钟看，是 ${clock.timeText}；日期是 ${clock.dateText}，${clock.weekdayText}。`,
        ])
      : pickVariant(buildVariantSeed(seed, 'time-fact', 'plain', clock.timeZone, clock.timeText), [
          `现在是 ${clock.timeText}，${clock.weekdayText}。`,
          `这会儿是 ${clock.timeText}，${clock.weekdayText}。`,
          `此刻看过去是 ${clock.timeText}，${clock.weekdayText}。`,
        ])
  }

  return includeDate
    ? pickVariant(buildVariantSeed(seed, 'time-fact', 'with-date', clock.timeZone, clock.timeText, clock.dateText), [
        `It's ${clock.timeText} right now. Today is ${clock.dateText} (${clock.weekdayText}).`,
        `Right now it's ${clock.timeText}, and today is ${clock.dateText} (${clock.weekdayText}).`,
        `At this moment it's ${clock.timeText}; the date is ${clock.dateText} (${clock.weekdayText}).`,
      ])
    : pickVariant(buildVariantSeed(seed, 'time-fact', 'plain', clock.timeZone, clock.timeText), [
        `It's ${clock.timeText} right now (${clock.weekdayText}).`,
        `Right now it's ${clock.timeText} (${clock.weekdayText}).`,
        `At this moment it's ${clock.timeText} (${clock.weekdayText}).`,
      ])
}

function renderLocalDateFact(clock: AlicizationMindSurfaceClockSnapshot, includeTime = false, seed = '') {
  if (clock.language === 'zh') {
    return includeTime
      ? pickVariant(buildVariantSeed(seed, 'date-fact', 'with-time', clock.timeZone, clock.dateText, clock.timeText), [
          `今天是 ${clock.dateText}，${clock.weekdayText}，现在是 ${clock.timeText}。`,
          `日期落在 ${clock.dateText}，${clock.weekdayText}；这会儿是 ${clock.timeText}。`,
          `按这边的日历看，今天是 ${clock.dateText}，${clock.weekdayText}，时间是 ${clock.timeText}。`,
        ])
      : pickVariant(buildVariantSeed(seed, 'date-fact', 'plain', clock.timeZone, clock.dateText), [
          `今天是 ${clock.dateText}，${clock.weekdayText}。`,
          `今天落在 ${clock.dateText}，${clock.weekdayText}。`,
          `按这边的日历看，今天是 ${clock.dateText}，${clock.weekdayText}。`,
        ])
  }

  return includeTime
    ? pickVariant(buildVariantSeed(seed, 'date-fact', 'with-time', clock.timeZone, clock.dateText, clock.timeText), [
        `Today is ${clock.dateText} (${clock.weekdayText}), and it's ${clock.timeText} right now.`,
        `The date is ${clock.dateText} (${clock.weekdayText}), and the time is ${clock.timeText}.`,
        `On this calendar it's ${clock.dateText} (${clock.weekdayText}), with the clock at ${clock.timeText}.`,
      ])
    : pickVariant(buildVariantSeed(seed, 'date-fact', 'plain', clock.timeZone, clock.dateText), [
        `Today is ${clock.dateText} (${clock.weekdayText}).`,
        `The date is ${clock.dateText} (${clock.weekdayText}).`,
        `On this calendar it's ${clock.dateText} (${clock.weekdayText}).`,
      ])
}

interface AlicizationMindSurfaceReplyContext {
  governance: AlicizationMindTurnGovernance
  locale: 'zh' | 'en'
  previousAssistantText: string
  seed: string
  userText: string
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
  dialogueVoice: AlicizationMindSurfaceDialogueVoiceProfile
}

type AlicizationMindSurfaceReplyPartKind
  = | 'status'
    | 'repair'
    | 'reason'
    | 'basis'
    | 'presence'
    | 'fact'
    | 'continuity'
    | 'offer'

interface AlicizationMindSurfaceReplyPart {
  kind: AlicizationMindSurfaceReplyPartKind
  text: string
}

const mindSurfaceReplyPartPriority: Record<AlicizationMindSurfaceReplyPartKind, number> = {
  status: 0,
  repair: 0,
  reason: 1,
  basis: 2,
  presence: 3,
  fact: 4,
  continuity: 5,
  offer: 6,
}

function createMindSurfaceReplyPart(
  kind: AlicizationMindSurfaceReplyPartKind,
  text: string | null | undefined,
): AlicizationMindSurfaceReplyPart[] {
  const normalized = sanitizeText(text, 320)
  return normalized ? [{ kind, text: normalized }] : []
}

function orderMindSurfaceReplyParts(
  parts: AlicizationMindSurfaceReplyPart[],
) {
  return parts
    .map((part, index) => ({
      ...part,
      index,
      text: normalizeTemplatePhrasing(part.text),
    }))
    .sort((left, right) =>
      mindSurfaceReplyPartPriority[left.kind] - mindSurfaceReplyPartPriority[right.kind]
      || left.index - right.index,
    )
    .map(part => part.text)
}

function isTimeZoneFocusedTurn(text: string) {
  const normalized = normalizeTurnText(text, 180)
  return zhUtilityTimeZonePattern.test(normalized) || enUtilityTimeZonePattern.test(normalized)
}

function renderBlockedMindSurfaceMove(kind: string, locale: 'zh' | 'en') {
  const detail = sanitizeText(kind, 80) || 'mind surface'
  return createMindSurfaceReplyPart(
    'status',
    locale === 'zh'
      ? `对话回复链路没有产出模型文本；本地 mind surface 不代写。未产出的回复类型：${detail}。`
      : `Dialogue reply pipeline did not produce model-authored text; local mind surface cannot author it. Missing reply type: ${detail}.`,
  )
}

function renderGreetingMove(_move: AlicizationMindSurfaceGreetingMove, context: AlicizationMindSurfaceReplyContext) {
  return renderBlockedMindSurfaceMove('greeting', context.locale)
}

function renderIdentityMove(_move: AlicizationMindSurfaceIdentityMove, locale: 'zh' | 'en') {
  return renderBlockedMindSurfaceMove('identity', locale)
}

function renderCapabilityMove(_move: AlicizationMindSurfaceCapabilityMove, locale: 'zh' | 'en') {
  return renderBlockedMindSurfaceMove('capability', locale)
}

function renderPresenceRepairMove(context: AlicizationMindSurfaceReplyContext) {
  return renderBlockedMindSurfaceMove('presence-repair', context.locale)
}

function renderFollowUpMove(_move: AlicizationMindSurfaceFollowUpMove, locale: 'zh' | 'en') {
  return renderBlockedMindSurfaceMove('follow-up', locale)
}

function renderRepairMove(move: AlicizationMindSurfaceRepairMove, context: AlicizationMindSurfaceReplyContext) {
  const { locale, seed } = context

  if (move.target === 'time' && move.clock) {
    return createMindSurfaceReplyPart(
      'fact',
      renderLocalTimeFact(move.clock, true, buildVariantSeed(seed, 'repair-time', locale)),
    )
  }
  if (move.target === 'date' && move.clock) {
    return createMindSurfaceReplyPart(
      'fact',
      renderLocalDateFact(move.clock, true, buildVariantSeed(seed, 'repair-date', locale)),
    )
  }

  return renderBlockedMindSurfaceMove('repair', locale)
}

function renderDialogueMove(move: AlicizationMindSurfaceDialogueMove, context: AlicizationMindSurfaceReplyContext) {
  return renderBlockedMindSurfaceMove(move.mode || 'dialogue', context.locale)
}

function renderPresentStateMove(move: AlicizationMindSurfacePresentStateMove, context: AlicizationMindSurfaceReplyContext) {
  void move
  return renderBlockedMindSurfaceMove('present-state', context.locale)
}

function renderTimeMove(move: AlicizationMindSurfaceTimeMove, context: AlicizationMindSurfaceReplyContext) {
  const queryMode = move.queryMode ?? resolveAlicizationTimeQueryIntent({
    userTextRaw: context.userText,
    previousAssistantTextRaw: context.previousAssistantText,
  }).mode
  const confirmation = queryMode === 'time-confirmation'
  const locale = context.locale
  const seed = buildVariantSeed(context.seed, 'local-time', queryMode, move.clock.timeZone, move.clock.timeText)
  const timeZoneLabel = formatClockTimeZoneLabel(move.clock.timeZone, locale)
  const timeFact = renderLocalTimeFact(move.clock, move.includeDate === true || confirmation, seed)
  const source = move.resolvedTimeZoneSource ?? null

  if (locale === 'zh') {
    const parts: AlicizationMindSurfaceReplyPart[] = []
    switch (queryMode) {
      case 'timezone':
        parts.push(...createMindSurfaceReplyPart(
          'reason',
          source === 'user-explicit'
            ? pickVariant(buildVariantSeed(seed, 'timezone', 'explicit'), [
                `这轮我沿你刚点名的时区来回。`,
                `你刚把这轮的时间基准扣住了。`,
                `这轮的时钟基准是你刚指定下来的。`,
              ])
            : source === 'context-hint'
              ? pickVariant(buildVariantSeed(seed, 'timezone', 'context'), [
                  `这轮上下文里本来就带着一条时间基准。`,
                  `我接到这句时，这轮已经挂着现成的时间基准了。`,
                  `这一轮的上下文自己把时间基准带了进来。`,
                ])
              : pickVariant(buildVariantSeed(seed, 'timezone', 'default'), [
                  `你这句没有另点时区。`,
                  `这轮里你还没把时区改到别处。`,
                  `你没有额外指定新的时间基准。`,
                ]),
        ))
        parts.push(...createMindSurfaceReplyPart('fact', pickVariant(buildVariantSeed(seed, 'timezone', 'fact'), [
          `我现在按 ${timeZoneLabel}。`,
          `这会儿我沿的是 ${timeZoneLabel}。`,
          `当前生效的是 ${timeZoneLabel}。`,
        ])))
        return parts
      case 'timezone-why':
        parts.push(...createMindSurfaceReplyPart(
          'reason',
          source === 'user-explicit'
            ? pickVariant(buildVariantSeed(seed, 'timezone-why', 'explicit'), [
                `因为你刚才已经把回答基准扣在 ${timeZoneLabel}。`,
                `因为这轮是你亲手指定到 ${timeZoneLabel} 的。`,
                `因为你刚把这轮的时钟基准点到了 ${timeZoneLabel}。`,
              ])
            : source === 'context-hint'
              ? pickVariant(buildVariantSeed(seed, 'timezone-why', 'context'), [
                  `因为这轮上下文已经把时间基准带到了 ${timeZoneLabel}。`,
                  `因为我接到这句时，上下文里挂着的就是 ${timeZoneLabel}。`,
                  `因为这轮先前留下的时间基准就在 ${timeZoneLabel}。`,
                ])
              : pickVariant(buildVariantSeed(seed, 'timezone-why', 'default'), [
                  '因为你没有另指定时区，所以我先沿当前环境的本地时间来回。',
                  '因为这轮没被改到别的时区，我就顺着当前环境这边的本地时间答。',
                  '因为你这句没点名新时区，所以我默认沿当前环境的本地时间回答。',
                ]),
        ))
        parts.push(...createMindSurfaceReplyPart('basis', pickVariant(buildVariantSeed(seed, 'timezone-why', 'basis'), [
          `落到这里就是 ${timeZoneLabel}。`,
          `所以这轮此刻用的是 ${timeZoneLabel}。`,
          `换成明面上的说法，就是 ${timeZoneLabel}。`,
        ])))
        parts.push(...createMindSurfaceReplyPart('offer', pickVariant(buildVariantSeed(seed, 'timezone-why', 'offer'), [
          '你要我改成别的时区，直接点名就行。',
          '你要换成别的时区，只要把名字告诉我。',
          '如果你想切到别的时区，直接把时区说出来就好。',
        ])))
        return parts
      case 'time-confirmation':
        parts.push(...createMindSurfaceReplyPart(
          source === 'user-explicit' ? 'basis' : 'reason',
          source === 'user-explicit'
            ? pickVariant(buildVariantSeed(seed, 'time-confirmation', 'explicit'), [
                `我又按 ${timeZoneLabel} 核了一遍。`,
                `我重新照着 ${timeZoneLabel} 对了一次。`,
                `我刚又按 ${timeZoneLabel} 复核了一下。`,
              ])
            : pickVariant(buildVariantSeed(seed, 'time-confirmation', 'default'), [
                '我又核了一遍。',
                '我刚重新对了一次。',
                '我又把这一刻对了一下表。',
              ]),
        ))
        parts.push(...createMindSurfaceReplyPart('fact', timeFact))
        return parts
      case 'time':
      default:
        if (source === 'user-explicit') {
          parts.push(...createMindSurfaceReplyPart('basis', pickVariant(buildVariantSeed(seed, 'time', 'explicit-basis'), [
            `这轮我按 ${timeZoneLabel}。`,
            `这句我沿 ${timeZoneLabel} 来回。`,
            `这轮此刻我照的是 ${timeZoneLabel}。`,
          ])))
        }
        parts.push(...createMindSurfaceReplyPart('fact', timeFact))
        return parts
    }
  }

  const parts: AlicizationMindSurfaceReplyPart[] = []
  switch (queryMode) {
    case 'timezone':
      parts.push(...createMindSurfaceReplyPart(
        'reason',
        source === 'user-explicit'
          ? pickVariant(buildVariantSeed(seed, 'timezone', 'explicit'), [
              `You explicitly set the time basis for this turn.`,
              `You already pinned this turn to a specific time basis.`,
              `The time basis here was set by you just now.`,
            ])
          : source === 'context-hint'
            ? pickVariant(buildVariantSeed(seed, 'timezone', 'context'), [
                `This turn already carries a time basis in context.`,
                `The context for this turn was already carrying a time basis.`,
                `A time basis was already hanging in the context for this turn.`,
              ])
            : pickVariant(buildVariantSeed(seed, 'timezone', 'default'), [
                `You did not name another timezone.`,
                `You did not switch this turn to a different timezone.`,
                `No other timezone was named in this turn.`,
              ]),
      ))
      parts.push(...createMindSurfaceReplyPart('fact', pickVariant(buildVariantSeed(seed, 'timezone', 'fact'), [
        `The active time basis right now is ${timeZoneLabel}.`,
        `Right now I'm answering on ${timeZoneLabel}.`,
        `The current clock basis here is ${timeZoneLabel}.`,
      ])))
      return parts
    case 'timezone-why':
      parts.push(...createMindSurfaceReplyPart(
        'reason',
        source === 'user-explicit'
          ? pickVariant(buildVariantSeed(seed, 'timezone-why', 'explicit'), [
              `Because you explicitly told me to answer on ${timeZoneLabel}.`,
              `Because you already set this turn to ${timeZoneLabel}.`,
              `Because you pinned the turn to ${timeZoneLabel} yourself.`,
            ])
          : source === 'context-hint'
            ? pickVariant(buildVariantSeed(seed, 'timezone-why', 'context'), [
                `Because this turn already carried ${timeZoneLabel} in context.`,
                `Because the context for this turn was already pointing at ${timeZoneLabel}.`,
                `Because ${timeZoneLabel} was already attached to the turn context when I picked it up.`,
              ])
            : pickVariant(buildVariantSeed(seed, 'timezone-why', 'default'), [
                `Because you did not name another timezone, I defaulted to the local runtime basis here.`,
                `Because this turn never switched to another timezone, I stayed on the local runtime basis.`,
                `Because no different timezone was named, I answered on the local runtime basis here.`,
              ]),
      ))
      parts.push(...createMindSurfaceReplyPart('basis', pickVariant(buildVariantSeed(seed, 'timezone-why', 'basis'), [
        `Here that means ${timeZoneLabel}.`,
        `In concrete terms, that lands on ${timeZoneLabel}.`,
        `So the visible clock basis here is ${timeZoneLabel}.`,
      ])))
      parts.push(...createMindSurfaceReplyPart('offer', pickVariant(buildVariantSeed(seed, 'timezone-why', 'offer'), [
        `If you want another timezone, name it directly and I'll switch.`,
        `If you want me on a different timezone, point to it and I'll move the clock there.`,
        `If you'd rather use another timezone, just name it and I'll answer on that basis.`,
      ])))
      return parts
    case 'time-confirmation':
      parts.push(...createMindSurfaceReplyPart(
        source === 'user-explicit' ? 'basis' : 'reason',
        source === 'user-explicit'
          ? pickVariant(buildVariantSeed(seed, 'time-confirmation', 'explicit'), [
              `I checked it again against ${timeZoneLabel}.`,
              `I re-checked it on ${timeZoneLabel}.`,
              `I just verified it again against ${timeZoneLabel}.`,
            ])
          : pickVariant(buildVariantSeed(seed, 'time-confirmation', 'default'), [
              `I checked again.`,
              `I just checked it once more.`,
              `I re-checked the clock.`,
            ]),
      ))
      parts.push(...createMindSurfaceReplyPart('fact', timeFact))
      return parts
    case 'time':
    default:
      if (source === 'user-explicit') {
        parts.push(...createMindSurfaceReplyPart('basis', pickVariant(buildVariantSeed(seed, 'time', 'explicit-basis'), [
          `This turn is aligned to ${timeZoneLabel}.`,
          `I'm answering this turn on ${timeZoneLabel}.`,
          `The clock basis for this turn is ${timeZoneLabel}.`,
        ])))
      }
      parts.push(...createMindSurfaceReplyPart('fact', timeFact))
      return parts
  }
}

function renderDateMove(move: AlicizationMindSurfaceDateMove, context: AlicizationMindSurfaceReplyContext) {
  const askTimeZone = isTimeZoneFocusedTurn(context.userText)
  const confirmation = continuityCheckPattern.test(normalizeTurnText(context.userText, 180))
  const locale = context.locale
  const seed = buildVariantSeed(context.seed, 'local-date', move.clock.timeZone, move.clock.dateText, move.clock.timeText)
  const timeZoneLabel = formatClockTimeZoneLabel(move.clock.timeZone, locale)
  const dateFact = renderLocalDateFact(move.clock, move.includeTime === true || confirmation, seed)

  if (locale === 'zh') {
    return [
      ...createMindSurfaceReplyPart(
        askTimeZone || confirmation ? 'basis' : 'fact',
        askTimeZone
          ? `这轮我按 ${timeZoneLabel} 看日期。`
          : confirmation
            ? `我再按 ${timeZoneLabel} 对一遍日期。`
            : dateFact,
      ),
      ...(askTimeZone || confirmation ? createMindSurfaceReplyPart('fact', dateFact) : []),
    ]
  }

  return [
    ...createMindSurfaceReplyPart(
      askTimeZone || confirmation ? 'basis' : 'fact',
      askTimeZone
        ? `I'm reading the date against ${timeZoneLabel}.`
        : confirmation
          ? `I'm checking the date again against ${timeZoneLabel}.`
          : dateFact,
    ),
    ...(askTimeZone || confirmation ? createMindSurfaceReplyPart('fact', dateFact) : []),
  ]
}

function renderMove(move: AlicizationMindSurfaceMove, context: AlicizationMindSurfaceReplyContext) {
  switch (move.kind) {
    case 'greeting':
      return renderGreetingMove(move, context)
    case 'identity':
      return renderIdentityMove(move, context.locale)
    case 'capability':
      return renderCapabilityMove(move, context.locale)
    case 'presence-repair':
      return renderPresenceRepairMove(context)
    case 'local-time':
      return renderTimeMove(move, context)
    case 'local-date':
      return renderDateMove(move, context)
    case 'follow-up':
      return renderFollowUpMove(move, context.locale)
    case 'repair':
      return renderRepairMove(move, context)
    case 'dialogue':
      return renderDialogueMove(move, context)
    case 'present-state':
      return renderPresentStateMove(move, context)
    case 'execution-listing':
      return renderBlockedMindSurfaceMove('execution-listing', context.locale)
    case 'execution-detail':
      return renderBlockedMindSurfaceMove('execution-detail', context.locale)
    case 'direct-reply':
      return renderBlockedMindSurfaceMove('direct-reply', context.locale)
  }
}

function deriveKernelCues(moves: AlicizationMindSurfaceMove[]) {
  const cues: string[] = []
  for (const move of moves) {
    switch (move.kind) {
      case 'local-time':
        cues.push(move.clock.language === 'zh'
          ? `现在是 ${move.clock.timeText}`
          : `It is ${move.clock.timeText}`)
        break
      case 'local-date':
        cues.push(move.clock.language === 'zh'
          ? `今天是 ${move.clock.dateText}`
          : `Today is ${move.clock.dateText}`)
        break
      case 'greeting':
      case 'identity':
      case 'capability':
      case 'follow-up':
      case 'repair':
      case 'dialogue':
      case 'present-state':
      case 'execution-listing':
      case 'execution-detail':
      case 'presence-repair':
      case 'direct-reply':
        break
    }
  }
  return uniqueSentences(cues, 4)
}

function enrichGovernance(input: AlicizationMindSurfaceRenderInput): AlicizationMindTurnGovernance {
  const cues = deriveKernelCues(input.moves)
  if (cues.length === 0)
    return input.governance

  const baseKernel = input.governance.dialogueActKernel
  const subject = input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation?.subject ?? 'task-knot'
  const hostGoal = sanitizeText(
    input.governance.mindTurnFrame?.relation?.hostGoal
    || input.userText
    || input.governance.focusAnchor
    || cues[0],
    160,
  ) || cues[0]
  const relationNeed = sanitizeText(
    input.governance.mindTurnFrame?.relation?.relationNeed
    || input.governance.answerIntent
    || cues[0],
    180,
  ) || cues[0]
  const truthMode = input.governance.evidenceMode === 'continuity-carry'
    ? 'memory-only'
    : input.governance.evidenceMode ?? 'dialogue-grounded'
  const speechAct = input.governance.answerAct ?? input.governance.mindTurnFrame?.obligation?.answerAct ?? 'answer'
  const turnMode = input.governance.turnMode
  const screenReferenceMode = input.governance.screenReferenceMode ?? 'avoid'
  const speakingFrom = input.governance.answerSubject === 'relationship'
    ? 'dialogue-bond'
    : input.governance.answerSubject === 'alicization-self'
      ? 'self-continuity'
      : input.governance.screenReferenceMode === 'avoid'
        ? 'task-thread'
        : 'held-memory'

  return {
    ...input.governance,
    dialogueActKernel: {
      subject,
      hostGoal,
      relationNeed,
      activeProject: baseKernel?.activeProject ?? null,
      truthMode,
      speechAct,
      turnMode,
      screenReferenceMode,
      speakingFrom,
      selectedEvidence: baseKernel?.selectedEvidence?.length
        ? baseKernel.selectedEvidence
        : cues.slice(0, 2).map(summary => ({
            kind: 'reply-motive' as const,
            source: 'answer-planner' as const,
            summary,
            confidence: 0.88,
          })),
      openingClaim: sanitizeText(
        baseKernel?.openingClaim,
        160,
      ) || cues[0],
      openingMove: sanitizeText(
        baseKernel?.openingMove
        || input.governance.mindTurnFrame?.obligation?.openingMove
        || input.governance.openingMove,
        120,
      ) || cues[0],
      whyNow: sanitizeText(
        baseKernel?.whyNow
        || input.governance.mindTurnFrame?.obligation?.whyNow,
        180,
      ) || cues[0],
      mustSay: uniqueSentences([
        ...(baseKernel?.mustSay ?? []),
        ...cues,
      ], 4),
      mustAvoid: baseKernel?.mustAvoid ?? [],
      sourceTrace: baseKernel?.sourceTrace ?? ['mind-surface-renderer'],
      confidence: Math.max(0.78, baseKernel?.confidence ?? 0.9),
      updatedAt: baseKernel?.updatedAt ?? 0,
    },
  }
}

function shouldUseGovernedLead(input: {
  moves: AlicizationMindSurfaceMove[]
  governedReply: string
  previousAssistantText: string
  suppressGovernedLead?: boolean
}) {
  if (input.suppressGovernedLead)
    return false
  if (!input.governedReply)
    return false

  if (shouldSuppressRepeatedSentence(input.governedReply, input.previousAssistantText))
    return false

  if (input.moves.some(move => move.kind === 'direct-reply'))
    return false

  if (input.moves.some(move => move.kind === 'local-time' || move.kind === 'local-date'))
    return false

  if (input.moves.some(move => move.kind === 'execution-listing' || move.kind === 'execution-detail'))
    return false

  return input.moves.some(move =>
    move.kind === 'identity'
    || move.kind === 'presence-repair'
    || move.kind === 'repair'
    || move.kind === 'dialogue'
    || move.kind === 'present-state'
    || move.kind === 'follow-up',
  )
}

function buildResidentPerformancePreviousState(
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null,
) {
  const performance = residentPerformance?.performance
  if (!performance)
    return null

  return {
    actionCue: performance.actionCue ?? null,
    delivery: performance.delivery,
    emotion: performance.baseEmotion,
    facialCue: performance.facialCue ?? null,
    variationToken: null,
  }
}

function resolveRequestedDialoguePerformanceSeed(input: {
  governance: AlicizationMindTurnGovernance
  emotion?: string
  delivery?: string
  performance?: Partial<AlicizationDialoguePerformancePayload> | null
  moves: AlicizationMindSurfaceMove[]
}) {
  const requestedDialogueMove = input.moves.find((move): move is AlicizationMindSurfaceDialogueMove => {
    return move.kind === 'dialogue' && (
      move.requestedEmotion != null
      || move.requestedDelivery != null
      || move.requestedEmphasis != null
    )
  }) ?? null

  const seededEmotion = requestedDialogueMove?.requestedEmotion
    ?? (allowedEmotions.has(sanitizeText(input.emotion, 24))
      ? sanitizeText(input.emotion, 24)
      : resolveGovernedMindEmotion(input.governance)) as AlicizationEmotion
  const seededDelivery = requestedDialogueMove?.requestedDelivery
    ?? (allowedDeliveries.has(sanitizeText(input.delivery, 24))
      ? sanitizeText(input.delivery, 24)
      : resolveGovernedDelivery(input.governance))

  return {
    emotion: seededEmotion,
    performance: normalizeAlicizationPerformancePayload({
      ...input.performance,
      baseEmotion: seededEmotion,
      emotion: seededEmotion,
      delivery: seededDelivery,
      emphasis: requestedDialogueMove?.requestedEmphasis
        ?? input.performance?.emphasis,
    }, seededEmotion),
  }
}

export function renderAlicizationMindSurface(input: AlicizationMindSurfaceRenderInput): AlicizationMindSurfaceRenderResult {
  const userText = sanitizeText(input.userText, 240)
  const previousAssistantText = sanitizeText(input.previousAssistantText, 420)
  const hasExplicitMoves = input.moves.length > 0
  const preliminaryLocale = inferLocale(userText, input.moves)
  const resolvedMoves = hasExplicitMoves
    ? input.moves
    : buildGovernanceFallbackMoves({
        governance: input.governance,
        userText,
        previousAssistantText,
        locale: preliminaryLocale,
        resolvedTimeZone: input.resolvedTimeZone,
        resolvedTimeZoneSource: input.resolvedTimeZoneSource,
      })
  const locale = inferLocale(userText, resolvedMoves)
  const governance = enrichGovernance({
    ...input,
    moves: resolvedMoves,
  })
  const fallbackGovernance = coerceAlicizationGovernanceForMindFallback(governance)
  const governedSurface = buildMindGovernedFallbackSurface({
    governance: fallbackGovernance,
    userText,
    translate: (path, params) => translateGovernedMindFallback(path, params, userText),
    forceDialogueAnswerFallback: input.forceDialogueAnswerFallback === true,
  })
  const seed = [
    governance.answerSubject,
    governance.turnMode,
    userText,
    previousAssistantText,
    resolvedMoves.map(move => move.kind).join('|'),
  ].join('|')
  const digitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(input.digitalLifeSpine)
  const replyContext: AlicizationMindSurfaceReplyContext = {
    governance,
    locale,
    previousAssistantText,
    seed,
    userText,
    digitalLifeSpine,
    dialogueVoice: deriveDialogueVoiceProfile(digitalLifeSpine),
  }
  const moveSentences = orderMindSurfaceReplyParts(
    resolvedMoves.flatMap(move => renderMove(move, replyContext)),
  )
  const maxSentences = Math.max(1, Math.min(3, governance.maxSentences || 2))
  const governedReply = governedSurface?.reply ?? ''
  const governedVisibleReplyMode = governedSurface?.visibleReplyMode ?? 'bubble'
  const useGovernedLead = shouldUseGovernedLead({
    moves: resolvedMoves,
    governedReply,
    previousAssistantText,
    suppressGovernedLead: input.suppressGovernedLead,
  })
  const replySentences = uniqueSentences([
    useGovernedLead && governedVisibleReplyMode !== 'dispatch-only'
      ? governedReply
      : '',
    ...moveSentences,
    !useGovernedLead && moveSentences.length === 0 && governedVisibleReplyMode !== 'dispatch-only'
      ? governedReply
      : '',
  ], maxSentences)
  const filteredSentences = replySentences.filter((sentence, index) => {
    if (index > 0)
      return true
    return !shouldSuppressRepeatedSentence(sentence, previousAssistantText)
  })
  const reply = (filteredSentences.length > 0 ? filteredSentences : replySentences).join(' ')
  const trustedThought = sanitizeText(input.thought, 220)
  const thought = trustedThought
    && trustedThought.includes(`obligation=${resolveGovernedMindObligation(fallbackGovernance)}`)
    && trustedThought.includes(`truth=${resolveGovernedMindTruth(fallbackGovernance)}`)
    ? trustedThought
    : buildGovernedMindThought({
        governance: fallbackGovernance,
        userText,
      })
  const emotion = allowedEmotions.has(sanitizeText(input.emotion, 24))
    ? sanitizeText(input.emotion, 24)
    : (governedSurface?.emotion ?? resolveGovernedMindEmotion(fallbackGovernance))
  const seededPerformance = resolveRequestedDialoguePerformanceSeed({
    governance,
    emotion,
    delivery: input.delivery,
    performance: input.performance,
    moves: resolvedMoves,
  })
  const embodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: seededPerformance.emotion,
    candidatePerformance: seededPerformance.performance,
    governance,
    performanceManifest: input.performanceManifest,
    previous: buildResidentPerformancePreviousState(input.residentPerformance),
    reply,
    thought,
  })
  const speechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply,
    candidateEmotion: embodiment.emotion,
    candidatePerformance: embodiment.performance,
    embodiment,
    performanceManifest: input.performanceManifest,
  })
  const digitalLife = buildAlicizationDigitalLifeEnvelope({
    embodiment,
    speechTimeline,
    digitalLifeSpine,
    performanceManifest: input.performanceManifest,
  })

  return {
    governance,
    thought,
    emotion: embodiment.emotion,
    reply,
    performance: embodiment.performance,
    embodiment,
    speechTimeline,
    digitalLife,
    digitalLifeSpine,
  }
}

export function buildAlicizationMindSurfaceStructuredReply(input: AlicizationMindSurfaceRenderInput) {
  const rendered = renderAlicizationMindSurface(input)
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: rendered.thought,
    emotion: rendered.emotion,
    reply: rendered.reply,
    visibleReplyAuthority: rendered.governance.visibleReplyAuthority ?? null,
    performance: rendered.performance,
    embodiment: rendered.embodiment,
    speechTimeline: rendered.speechTimeline,
    digitalLife: rendered.digitalLife,
    digitalLifeSpine: rendered.digitalLifeSpine,
    governance: rendered.governance,
  })
}
