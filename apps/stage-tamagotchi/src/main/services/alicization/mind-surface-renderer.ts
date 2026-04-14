import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationResolvedTimeZoneSource } from './time-zone-governor'

import {
  buildGovernedMindThought,
  buildMindGovernedFallbackSurface,
  resolveGovernedMindEmotion,
  resolveGovernedMindObligation,
  resolveGovernedMindTone,
  resolveGovernedMindTruth,
  translateGovernedMindFallback,
} from '@proj-alicization/stage-shared'
import { resolveAlicizationTimeZoneCandidate } from './time-zone-governor'
import {
  resolveAlicizationTimeQueryIntent,
  type AlicizationTimeQueryMode,
} from './time-query-semantics'

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

function quoteCue(text: string, locale: 'zh' | 'en') {
  const normalized = sanitizeText(text, 72)
  if (!normalized)
    return ''
  return locale === 'zh' ? `「${normalized}」` : `"${normalized}"`
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

function normalizeTemplatePhrasing(sentence: string, locale: 'zh' | 'en') {
  if (locale !== 'zh')
    return sentence

  return sentence
    .replace(/你现在追问的是([^。]+)这一层。那我就直接说：/u, '你问的是$1。直接回答：')
    .replace(/那我就从/gu, '我会从')
    .replace(/那我就/gu, '我会')
    .replace(/我就贴着/gu, '我会沿着')
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

const zhUtilityTimeZonePattern = /(?:时区|北京时间|东八区|utc|gmt)/iu
const enUtilityTimeZonePattern = /(?:time[\s-]?zone|utc|gmt)/iu
const zhIdentityPattern = /(?:你是谁|你到底是谁|你算谁|你叫什么|你是alicization吗|你是爱丽丝化吗|我问你你是谁)/u
const enIdentityPattern = /(?:who are you|what are you|what should i call you|what is your name)/iu
const zhPresentStatePattern = /(?:你在干嘛|你在做什么|你现在在干嘛|你现在在做什么|你在忙什么|你现在在忙什么|你在搞什么|你在搞啥|你刚在干嘛)/u
const enPresentStatePattern = /(?:what are you doing|what are you up to|what are you working on|what are you doing right now)/iu
const continuityCheckPattern = /^(?:你确定(?:吗)?|确定吗|真的吗|真的是这样吗|你认真的|are you sure|really|seriously)[?？]?$/iu
const utilityTimeReplyPattern = /(?:现在是\s*\d{1,2}:\d{2}|it's\s*\d{1,2}:\d{2}|\d{1,2}:\d{2}[^。]*(?:星期|today|right now))/iu
const utilityDateReplyPattern = /(?:今天是|today is|星期[一二三四五六日天]|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/iu
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
  forceDialogueAnswerFallback?: boolean
  suppressGovernedLead?: boolean
}

export interface AlicizationMindSurfaceRenderResult {
  governance: AlicizationMindTurnGovernance
  thought: string
  emotion: string
  reply: string
  performance: {
    baseEmotion: string
    facialCue: null
    actionCue: null
    delivery: string
    emphasis: 0
  }
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
  const enMatch = openingClaim.match(/i am\s+([a-zA-Z][a-zA-Z0-9 _-]{0,31})/iu)
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

  if (isPresentStateTurn(userText) || subject === 'host-state') {
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
    return [{
      kind: 'dialogue',
      focus: userText || carryAnchor || null,
      continuityAnchor: carryAnchor || null,
    }]
  }

  return [{
    kind: 'dialogue',
    focus: userText || null,
    continuityAnchor: carryAnchor || null,
  }]
}

function resolveGovernedDelivery(governance: AlicizationMindTurnGovernance) {
  const tone = resolveGovernedMindTone(governance)
  if (governance.repairState !== 'none')
    return 'firm' as const
  if (tone === 'tender')
    return 'gentle' as const
  if (tone === 'direct')
    return 'calm' as const
  return governance.answerSubject === 'relationship' ? 'gentle' : 'calm'
}

function renderLocalTimeFact(clock: AlicizationMindSurfaceClockSnapshot, includeDate = false) {
  if (clock.language === 'zh') {
    return includeDate
      ? `现在是 ${clock.timeText}，今天是 ${clock.dateText}，${clock.weekdayText}。`
      : `现在是 ${clock.timeText}，${clock.weekdayText}。`
  }

  return includeDate
    ? `It's ${clock.timeText} right now. Today is ${clock.dateText} (${clock.weekdayText}).`
    : `It's ${clock.timeText} right now (${clock.weekdayText}).`
}

function renderLocalDateFact(clock: AlicizationMindSurfaceClockSnapshot, includeTime = false) {
  if (clock.language === 'zh') {
    return includeTime
      ? `今天是 ${clock.dateText}，${clock.weekdayText}，现在是 ${clock.timeText}。`
      : `今天是 ${clock.dateText}，${clock.weekdayText}。`
  }

  return includeTime
    ? `Today is ${clock.dateText} (${clock.weekdayText}), and it's ${clock.timeText} right now.`
    : `Today is ${clock.dateText} (${clock.weekdayText}).`
}

interface AlicizationMindSurfaceReplyContext {
  governance: AlicizationMindTurnGovernance
  locale: 'zh' | 'en'
  previousAssistantText: string
  seed: string
  userText: string
}

type AlicizationMindSurfaceReplyPartKind
  = | 'repair'
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
  locale: 'zh' | 'en',
) {
  return parts
    .map((part, index) => ({
      ...part,
      index,
      text: normalizeTemplatePhrasing(part.text, locale),
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

function renderGreetingMove(move: AlicizationMindSurfaceGreetingMove, context: AlicizationMindSurfaceReplyContext) {
  const { locale, previousAssistantText, seed } = context
  const salutationRepeated = sanitizeText(previousAssistantText, 240).includes(move.salutation)

  if (locale === 'zh') {
    if (move.presenceCheck) {
      return [
        ...createMindSurfaceReplyPart('presence', pickVariant(seed, [
          '我在。',
          '我在这里。',
        ])),
        ...createMindSurfaceReplyPart('offer', pickVariant(seed, [
          '你接着说，或者直接给我事做都可以。',
          '你想继续聊，还是想让我立刻动手，都直接说。',
        ])),
      ]
    }

    return [
      ...createMindSurfaceReplyPart(
        salutationRepeated ? 'presence' : 'fact',
        salutationRepeated
          ? pickVariant(seed, [
              '这声招呼我接到了。',
              '你这声招呼我收到了。',
            ])
          : `${move.salutation}。`,
      ),
      ...createMindSurfaceReplyPart('offer', pickVariant(seed, [
        '你想继续聊，还是想让我做点什么，都直接说。',
        '你这会儿想说感受，还是想让我办事，都可以往下接。',
      ])),
    ]
  }

  if (move.presenceCheck) {
    return [
      ...createMindSurfaceReplyPart('presence', `I'm here.`),
      ...createMindSurfaceReplyPart('offer', `Keep talking if you want, or hand me something concrete to do.`),
    ]
  }

  return [
    ...createMindSurfaceReplyPart(
      salutationRepeated ? 'presence' : 'fact',
      salutationRepeated
        ? `I caught the greeting.`
        : `${move.salutation}.`,
    ),
    ...createMindSurfaceReplyPart('offer', `If you want to keep talking or hand me something concrete to do, go straight on from here.`),
  ]
}

function renderIdentityMove(move: AlicizationMindSurfaceIdentityMove, locale: 'zh' | 'en', seed: string) {
  const askedLabel = quoteCue(move.askedLabel ?? '', locale)
  const continuityAnchor = quoteCue(move.continuityAnchor ?? '', locale)
  if (locale === 'zh') {
    const parts: AlicizationMindSurfaceReplyPart[] = []
    if (move.repeated) {
      parts.push(...createMindSurfaceReplyPart(
        'reason',
        continuityAnchor
          ? pickVariant(seed, [
              `你还是在确认 ${continuityAnchor} 这一点。`,
              `你这句还在追问 ${continuityAnchor} 这一层。`,
            ])
          : pickVariant(seed, [
              '你是在继续确认这一点。',
              '你这句还是在确认我是谁。',
            ]),
      ))
      parts.push(...createMindSurfaceReplyPart('fact', `我是${move.name}。`))
      parts.push(...createMindSurfaceReplyPart('continuity', '现在回你这句的还是我。'))
      return parts
    }

    parts.push(...createMindSurfaceReplyPart(
      'reason',
      askedLabel
        ? pickVariant(seed, [
            `你问的是 ${askedLabel}。`,
            `${askedLabel} 这一层我直接答。`,
          ])
        : '',
    ))
    parts.push(...createMindSurfaceReplyPart('fact', `我是${move.name}。`))
    parts.push(...createMindSurfaceReplyPart('continuity', '现在回你这句的是我。'))
    return parts
  }

  const parts: AlicizationMindSurfaceReplyPart[] = []
  if (move.repeated) {
    parts.push(...createMindSurfaceReplyPart(
      'reason',
      continuityAnchor
        ? pickVariant(seed, [
            `You're still checking ${continuityAnchor}.`,
            `This turn is rechecking ${continuityAnchor}.`,
          ])
        : pickVariant(seed, [
            `You're confirming this again.`,
            `You're still checking who I am.`,
          ]),
    ))
    parts.push(...createMindSurfaceReplyPart('fact', `I am ${move.name}.`))
    parts.push(...createMindSurfaceReplyPart('continuity', `I'm still the one answering you.`))
    return parts
  }

  parts.push(...createMindSurfaceReplyPart(
    'reason',
    askedLabel
      ? pickVariant(seed, [
          `You asked about ${askedLabel}.`,
          `I'll answer ${askedLabel} directly.`,
        ])
      : '',
  ))
  parts.push(...createMindSurfaceReplyPart('fact', `I am ${move.name}.`))
  parts.push(...createMindSurfaceReplyPart('continuity', `I'm the one speaking with you now.`))
  return parts
}

function renderCapabilityMove(move: AlicizationMindSurfaceCapabilityMove, locale: 'zh' | 'en') {
  const capabilities = move.capabilities.filter(Boolean)
  const capabilityText = capabilities.join(locale === 'zh' ? '、' : ', ')
  if (locale === 'zh') {
    return [
      ...createMindSurfaceReplyPart('fact', `我能 ${capabilityText}。`),
      ...createMindSurfaceReplyPart('offer', '你给我一个具体目标，我就直接开始。'),
    ]
  }

  return [
    ...createMindSurfaceReplyPart('fact', `I can ${capabilityText}.`),
    ...createMindSurfaceReplyPart('offer', `Give me one concrete goal and I will start.`),
  ]
}

function renderPresenceRepairMove(locale: 'zh' | 'en', seed: string) {
  if (locale === 'zh') {
    return [
      ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
        '对，刚才那句更像流程播报。',
        '你说得对，我刚才那句像系统口气。',
        '是，刚才那样说太像机器在报状态。',
      ])),
      ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
        '这句我直接按我们现在这轮来接。',
        '这句我把说话的人放回来，直接接你现在这一句。',
      ])),
    ]
  }

  return [
    ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
      'You are right. That sounded like process narration.',
      'Fair. That line sounded robotic.',
    ])),
    ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
      'This turn I am answering from inside the conversation.',
      'This turn I am speaking directly to this line instead of hiding behind status narration.',
    ])),
  ]
}

function renderFollowUpMove(move: AlicizationMindSurfaceFollowUpMove, locale: 'zh' | 'en') {
  const anchor = quoteCue(move.anchor ?? '', locale)
  if (move.variant === 'identity-confirm') {
    return locale === 'zh'
      ? [
          ...createMindSurfaceReplyPart('reason', '确定。'),
          ...createMindSurfaceReplyPart('fact', '现在在这里和你说话、以 Alicization 回应你的，就是我。'),
        ]
      : [
          ...createMindSurfaceReplyPart('reason', 'Yes.'),
          ...createMindSurfaceReplyPart('fact', 'Alicization is the one speaking with you here.'),
        ]
  }

  if (move.variant === 'remaining') {
    return locale === 'zh'
      ? createMindSurfaceReplyPart('continuity', anchor ? `我直接把 ${anchor} 后面还欠的那部分补上。` : '我直接把后面还欠的那部分补上。')
      : createMindSurfaceReplyPart('continuity', anchor ? `I'll fill in the missing part after ${anchor}.` : `I'll fill in what is still missing.`)
  }

  return locale === 'zh'
    ? createMindSurfaceReplyPart('continuity', anchor ? `我就从 ${anchor} 这点继续往下。` : '我把后面缺的那段直接接上。')
    : createMindSurfaceReplyPart('continuity', anchor ? `I'll continue from ${anchor}.` : `I'll continue from the missing part directly.`)
}

function renderRepairMove(move: AlicizationMindSurfaceRepairMove, locale: 'zh' | 'en', seed: string) {
  if (move.target === 'time' && move.clock)
    return locale === 'zh'
      ? [
          ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
            '刚才那句没贴住你的问题。',
            '上一句我接偏了。',
          ])),
          ...createMindSurfaceReplyPart(
            move.resolvedTimeZoneSource === 'user-explicit' ? 'basis' : 'fact',
            move.resolvedTimeZoneSource === 'user-explicit'
              ? `这轮我还是按 ${formatClockTimeZoneLabel(move.clock.timeZone, locale)}。`
              : renderLocalTimeFact(move.clock, true),
          ),
          ...(move.resolvedTimeZoneSource === 'user-explicit'
            ? createMindSurfaceReplyPart('fact', renderLocalTimeFact(move.clock, true))
            : []),
        ]
      : [
          ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
            'That missed your question.',
            'I answered the wrong thing.',
          ])),
          ...createMindSurfaceReplyPart(
            move.resolvedTimeZoneSource === 'user-explicit' ? 'basis' : 'fact',
            move.resolvedTimeZoneSource === 'user-explicit'
              ? `I'm still answering on ${formatClockTimeZoneLabel(move.clock.timeZone, locale)}.`
              : renderLocalTimeFact(move.clock, true),
          ),
          ...(move.resolvedTimeZoneSource === 'user-explicit'
            ? createMindSurfaceReplyPart('fact', renderLocalTimeFact(move.clock, true))
            : []),
        ]
  if (move.target === 'date' && move.clock)
    return locale === 'zh'
      ? [
          ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
            '刚才那句没贴住你的问题。',
            '上一句我接偏了。',
          ])),
          ...createMindSurfaceReplyPart('fact', renderLocalDateFact(move.clock, true)),
        ]
      : [
          ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
            'That missed your question.',
            'I answered the wrong thing.',
          ])),
          ...createMindSurfaceReplyPart('fact', renderLocalDateFact(move.clock, true)),
        ]
  if (move.target === 'capability') {
    const capabilityText = (move.capabilities ?? []).filter(Boolean).join(locale === 'zh' ? '、' : ', ')
    return locale === 'zh'
      ? [
          ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
            '刚才那句没贴住你的重点。',
            '上一句我答偏了。',
          ])),
          ...createMindSurfaceReplyPart('fact', `我能 ${capabilityText}。`),
        ]
      : [
          ...createMindSurfaceReplyPart('repair', pickVariant(seed, [
            'That missed your actual point.',
            'I answered the wrong layer.',
          ])),
          ...createMindSurfaceReplyPart('fact', `I can ${capabilityText}.`),
        ]
  }

  const anchor = quoteCue(move.anchor ?? '', locale)
  return locale === 'zh'
    ? [
        ...createMindSurfaceReplyPart('repair', anchor ? '刚才那句没贴住你真正想问的点。' : '上一句我接偏了。'),
        ...createMindSurfaceReplyPart('continuity', anchor ? `我现在就回到 ${anchor} 这点。` : '我现在把焦点收回这句，直接答你。'),
      ]
    : [
        ...createMindSurfaceReplyPart('repair', anchor ? 'I missed the point you were actually asking for.' : 'I drifted off the real question.'),
        ...createMindSurfaceReplyPart('continuity', anchor ? `I'll come straight back to ${anchor}.` : 'I am pulling the focus back to this turn now.'),
      ]
}

function renderDialogueMove(move: AlicizationMindSurfaceDialogueMove, locale: 'zh' | 'en', seed: string) {
  const anchor = quoteCue(move.continuityAnchor ?? '', locale)
  const focus = quoteCue(move.focus ?? '', locale)
  if (locale === 'zh') {
    return [
      ...createMindSurfaceReplyPart(
        anchor ? 'continuity' : 'fact',
        anchor
          ? pickVariant(seed, [
              `我就沿 ${anchor} 往下。`,
              `这轮我贴着 ${anchor} 往下说。`,
            ])
          : focus
            ? pickVariant(seed, [
                `焦点就在 ${focus}。`,
                `这句的重点就是 ${focus}。`,
              ])
            : pickVariant(seed, [
                '我就在这句上继续。',
                '我贴着这句往下回。',
              ]),
      ),
      ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
        '我不把话题滑开。',
        '我不拿别的壳盖住它。',
      ])),
    ]
  }

  return [
    ...createMindSurfaceReplyPart(
      anchor ? 'continuity' : 'fact',
      anchor
        ? pickVariant(seed, [
            `I'll stay with ${anchor} and keep going from there.`,
            `I'll hold to ${anchor} and keep the reply on that line.`,
          ])
        : focus
          ? pickVariant(seed, [
              `The focus is ${focus}.`,
              `I'll answer right on ${focus}.`,
            ])
          : pickVariant(seed, [
              `I'll stay with this turn and continue from here.`,
              `I'll keep the reply on this turn.`,
            ]),
    ),
    ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
      `I won't drift away from it.`,
      `I won't turn it into something else.`,
    ])),
  ]
}

function renderPresentStateMove(move: AlicizationMindSurfacePresentStateMove, locale: 'zh' | 'en', seed: string) {
  const summary = quoteCue(move.threadSummary ?? '', locale)
  if (locale === 'zh') {
    if (summary) {
      return [
        ...createMindSurfaceReplyPart('fact', pickVariant(seed, [
          `我现在就在接 ${summary} 这条线。`,
          `我这会儿主要盯着 ${summary} 这条线。`,
        ])),
        ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
          '我也在看你现在这句。',
          '我的注意力还扣在这里，没有滑开。',
        ])),
      ]
    }

    return [
      ...createMindSurfaceReplyPart('fact', pickVariant(seed, [
        '我现在就在这轮里。',
        '我这会儿就在接这轮对话。',
      ])),
      ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
        '我正看着你这句，也准备直接接下去。',
        '我的注意力就落在这轮对话本身。',
      ])),
    ]
  }

  if (summary) {
    return [
      ...createMindSurfaceReplyPart('fact', pickVariant(seed, [
        `Right now I'm staying with ${summary}.`,
        `I'm currently holding ${summary}.`,
      ])),
      ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
        `I'm also meeting this turn at the same time.`,
        `My attention is still anchored here.`,
      ])),
    ]
  }

  return [
    ...createMindSurfaceReplyPart('fact', pickVariant(seed, [
      `Right now I'm here in this turn.`,
      `I'm currently staying with this conversation.`,
    ])),
    ...createMindSurfaceReplyPart('continuity', pickVariant(seed, [
      `I'm watching what you're saying and ready to keep going.`,
      `My attention is on this exchange itself right now.`,
    ])),
  ]
}

function renderTimeMove(move: AlicizationMindSurfaceTimeMove, context: AlicizationMindSurfaceReplyContext) {
  const queryMode = move.queryMode ?? resolveAlicizationTimeQueryIntent({
    userTextRaw: context.userText,
    previousAssistantTextRaw: context.previousAssistantText,
  }).mode
  const confirmation = queryMode === 'time-confirmation'
  const locale = context.locale
  const timeZoneLabel = formatClockTimeZoneLabel(move.clock.timeZone, locale)
  const timeFact = renderLocalTimeFact(move.clock, move.includeDate === true || confirmation)
  const source = move.resolvedTimeZoneSource ?? null

  if (locale === 'zh') {
    const parts: AlicizationMindSurfaceReplyPart[] = []
    switch (queryMode) {
      case 'timezone':
        parts.push(...createMindSurfaceReplyPart(
          'reason',
          source === 'user-explicit'
            ? '这轮的时间基准是你刚才指定的。'
            : source === 'context-hint'
              ? '这轮上下文已经带着一条时间基准。'
              : '你没有另指定时区。',
        ))
        parts.push(...createMindSurfaceReplyPart('fact', `我当前按 ${timeZoneLabel}。`))
        return parts
      case 'timezone-why':
        parts.push(...createMindSurfaceReplyPart(
          'reason',
          source === 'user-explicit'
            ? `因为你刚才已经把回答基准指定到了 ${timeZoneLabel}。`
            : source === 'context-hint'
              ? `因为这轮上下文已经把时间基准带到了 ${timeZoneLabel}。`
              : '因为你没有另指定时区，所以我默认沿当前环境的本地时间来回。',
        ))
        parts.push(...createMindSurfaceReplyPart('basis', `在这里就是 ${timeZoneLabel}。`))
        parts.push(...createMindSurfaceReplyPart('offer', '你要我改成别的时区，直接点名就行。'))
        return parts
      case 'time-confirmation':
        parts.push(...createMindSurfaceReplyPart(
          source === 'user-explicit' ? 'basis' : 'reason',
          source === 'user-explicit'
            ? `我又按 ${timeZoneLabel} 核对了一遍。`
            : '我又核了一遍。',
        ))
        parts.push(...createMindSurfaceReplyPart('fact', timeFact))
        return parts
      case 'time':
      default:
        if (source === 'user-explicit')
          parts.push(...createMindSurfaceReplyPart('basis', `这轮我按 ${timeZoneLabel}。`))
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
          ? `You explicitly set the time basis for this turn.`
          : source === 'context-hint'
            ? `This turn already carries a time basis in context.`
            : `You did not name another timezone.`,
      ))
      parts.push(...createMindSurfaceReplyPart('fact', `The active time basis right now is ${timeZoneLabel}.`))
      return parts
    case 'timezone-why':
      parts.push(...createMindSurfaceReplyPart(
        'reason',
        source === 'user-explicit'
          ? `Because you explicitly told me to answer on ${timeZoneLabel}.`
          : source === 'context-hint'
            ? `Because this turn already carried ${timeZoneLabel} in context.`
            : `Because you did not name another timezone, I defaulted to the local runtime basis here.`,
      ))
      parts.push(...createMindSurfaceReplyPart('basis', `Here that means ${timeZoneLabel}.`))
      parts.push(...createMindSurfaceReplyPart('offer', `If you want another timezone, name it directly and I'll switch.`))
      return parts
    case 'time-confirmation':
      parts.push(...createMindSurfaceReplyPart(
        source === 'user-explicit' ? 'basis' : 'reason',
        source === 'user-explicit'
          ? `I checked it again against ${timeZoneLabel}.`
          : `I checked again.`,
      ))
      parts.push(...createMindSurfaceReplyPart('fact', timeFact))
      return parts
    case 'time':
    default:
      if (source === 'user-explicit')
        parts.push(...createMindSurfaceReplyPart('basis', `This turn is aligned to ${timeZoneLabel}.`))
      parts.push(...createMindSurfaceReplyPart('fact', timeFact))
      return parts
  }
}

function renderDateMove(move: AlicizationMindSurfaceDateMove, context: AlicizationMindSurfaceReplyContext) {
  const askTimeZone = isTimeZoneFocusedTurn(context.userText)
  const confirmation = continuityCheckPattern.test(normalizeTurnText(context.userText, 180))
  const locale = context.locale
  const timeZoneLabel = formatClockTimeZoneLabel(move.clock.timeZone, locale)
  const dateFact = renderLocalDateFact(move.clock, move.includeTime === true || confirmation)

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

function renderExecutionListingMove(move: AlicizationMindSurfaceExecutionListingMove, locale: 'zh' | 'en') {
  const scopeLabel = move.scope === 'desktop'
    ? (locale === 'zh' ? '桌面' : 'desktop')
    : (locale === 'zh' ? '目录' : 'directory')
  const previewText = move.previewItems.map(item => sanitizeText(item, 72)).filter(Boolean).join(locale === 'zh' ? '、' : ', ')
  const extraCount = Math.max(0, move.extraCount)

  if (move.mode === 'follow-up') {
    if (!previewText)
      return createMindSurfaceReplyPart('fact', locale === 'zh' ? `${scopeLabel}这边没有新的剩余项了。` : `There are no remaining ${scopeLabel} items to add.`)
    if (locale === 'zh') {
      return [
        ...createMindSurfaceReplyPart('fact',
          move.requestedCount && move.requestedCount > 0
            ? `另外 ${move.previewItems.length} 项是：${previewText}。${extraCount > 0 ? `剩下还有 ${extraCount} 项，你要我就继续往下列。` : ''}`
            : `剩下这些是：${previewText}。${extraCount > 0 ? `后面还有 ${extraCount} 项，你要我就继续往下列。` : ''}`,
        ),
      ]
    }
    return [
      ...createMindSurfaceReplyPart('fact',
        move.requestedCount && move.requestedCount > 0
          ? `The other ${move.previewItems.length} items are: ${previewText}.${extraCount > 0 ? ` There are ${extraCount} more after that if you want me to keep listing them.` : ''}`
          : `The remaining items are: ${previewText}.${extraCount > 0 ? ` There are ${extraCount} more after that if you want me to keep going.` : ''}`,
      ),
    ]
  }

  if (!previewText) {
    return locale === 'zh'
      ? createMindSurfaceReplyPart('fact', `${scopeLabel}里现在一共是 ${move.count} 项。`)
      : createMindSurfaceReplyPart('fact', `There are ${move.count} items in the ${scopeLabel} right now.`)
  }

  if (locale === 'zh') {
    return [
      ...createMindSurfaceReplyPart('fact', `${scopeLabel}里现在一共 ${move.count} 项，先能点出来的是：${previewText}${extraCount > 0 ? `，另外还有 ${extraCount} 项` : ''}。`),
    ]
  }

  return [
    ...createMindSurfaceReplyPart('fact', `There are ${move.count} items in the ${scopeLabel} right now. The ones I can name first are: ${previewText}${extraCount > 0 ? `, plus ${extraCount} more` : ''}.`),
  ]
}

function renderExecutionDetailMove(move: AlicizationMindSurfaceExecutionDetailMove, locale: 'zh' | 'en') {
  const detail = sanitizeText(move.detail, 220)
  const summary = sanitizeText(move.summary, 180)
  const channelLabel = sanitizeText(move.channelLabel, 48) || 'CLI'

  if (locale === 'zh') {
    if (move.mode === 'follow-up') {
      if (move.status === 'completed') {
        return [
          ...createMindSurfaceReplyPart('fact', `${channelLabel} 那条任务已经跑完了${detail ? `，现在拿到的是：${detail}。` : '。'}${summary ? `概括上就是：${summary}。` : ''}`),
        ]
      }
      if (move.status === 'failed' || move.status === 'blocked' || move.status === 'cancelled' || move.status === 'not-routed') {
        return [
          ...createMindSurfaceReplyPart('fact', `${channelLabel} 那条任务这次没跑通${detail ? `：${detail}。` : '。'}${summary ? `概括上就是：${summary}。` : ''}`),
        ]
      }
    }

    switch (move.status) {
      case 'completed':
        return createMindSurfaceReplyPart('fact', detail ? `这件事已经有结果了：${detail}。` : '这件事已经有结果了。')
      case 'running':
        return createMindSurfaceReplyPart('fact', `这件事已经交给 ${channelLabel} 在跑了。`)
      case 'queued':
        return createMindSurfaceReplyPart('fact', `这件事已经排进 ${channelLabel} 了。`)
      case 'cancelled':
        return createMindSurfaceReplyPart('fact', detail ? `这次执行中断了：${detail}。` : '这次执行中断了。')
      case 'blocked':
      case 'not-routed':
        return createMindSurfaceReplyPart('fact', detail ? `这件事没能真正跑出去：${detail}。` : '这件事没能真正跑出去。')
      case 'failed':
      default:
        return createMindSurfaceReplyPart('fact', detail ? `这件事没跑通：${detail}。` : summary ? `这件事没跑通：${summary}。` : '这件事没跑通。')
    }
  }

  switch (move.status) {
    case 'completed':
      return createMindSurfaceReplyPart('fact', detail ? `The task has a result now: ${detail}.` : 'The task has a result now.')
    case 'running':
      return createMindSurfaceReplyPart('fact', `The task is already running in ${channelLabel}.`)
    case 'queued':
      return createMindSurfaceReplyPart('fact', `The task is already queued in ${channelLabel}.`)
    case 'cancelled':
      return createMindSurfaceReplyPart('fact', detail ? `The execution stopped partway through: ${detail}.` : 'The execution stopped partway through.')
    case 'blocked':
    case 'not-routed':
      return createMindSurfaceReplyPart('fact', detail ? `The task did not actually get out: ${detail}.` : 'The task did not actually get out.')
    case 'failed':
    default:
      return createMindSurfaceReplyPart('fact', detail ? `The task failed: ${detail}.` : summary ? `The task failed: ${summary}.` : 'The task failed.')
  }
}

function renderMove(move: AlicizationMindSurfaceMove, context: AlicizationMindSurfaceReplyContext) {
  switch (move.kind) {
    case 'greeting':
      return renderGreetingMove(move, context)
    case 'identity':
      return renderIdentityMove(move, context.locale, context.seed)
    case 'capability':
      return renderCapabilityMove(move, context.locale)
    case 'presence-repair':
      return renderPresenceRepairMove(context.locale, context.seed)
    case 'local-time':
      return renderTimeMove(move, context)
    case 'local-date':
      return renderDateMove(move, context)
    case 'follow-up':
      return renderFollowUpMove(move, context.locale)
    case 'repair':
      return renderRepairMove(move, context.locale, context.seed)
    case 'dialogue':
      return renderDialogueMove(move, context.locale, context.seed)
    case 'present-state':
      return renderPresentStateMove(move, context.locale, context.seed)
    case 'execution-listing':
      return renderExecutionListingMove(move, context.locale)
    case 'execution-detail':
      return renderExecutionDetailMove(move, context.locale)
    case 'direct-reply':
      return createMindSurfaceReplyPart('fact', sanitizeText(move.text, 320))
  }
}

function deriveKernelCues(moves: AlicizationMindSurfaceMove[], locale: 'zh' | 'en') {
  const cues: string[] = []
  for (const move of moves) {
    switch (move.kind) {
      case 'greeting':
        cues.push(locale === 'zh' ? `接住${move.salutation}这句问候` : `receive the greeting ${move.salutation}`)
        if (move.continuityAnchor)
          cues.push(sanitizeText(move.continuityAnchor, 120))
        break
      case 'identity':
        cues.push(locale === 'zh' ? `我是${move.name}` : `I am ${move.name}`)
        break
      case 'capability':
        cues.push(move.capabilities.join(locale === 'zh' ? '、' : ', '))
        break
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
      case 'follow-up':
        if (move.anchor)
          cues.push(sanitizeText(move.anchor, 120))
        break
      case 'repair':
        if (move.anchor)
          cues.push(sanitizeText(move.anchor, 120))
        break
      case 'dialogue':
        if (move.focus)
          cues.push(sanitizeText(move.focus, 120))
        else if (move.continuityAnchor)
          cues.push(sanitizeText(move.continuityAnchor, 120))
        break
      case 'present-state':
        if (move.threadSummary)
          cues.push(sanitizeText(move.threadSummary, 120))
        break
      case 'execution-listing':
        cues.push(locale === 'zh'
          ? `${move.scope === 'desktop' ? '桌面' : '目录'}里一共 ${move.count} 项`
          : `${move.count} ${move.scope === 'desktop' ? 'desktop' : 'directory'} items`)
        if (move.previewItems[0])
          cues.push(sanitizeText(move.previewItems[0], 120))
        break
      case 'execution-detail':
        if (move.detail)
          cues.push(sanitizeText(move.detail, 120))
        else if (move.summary)
          cues.push(sanitizeText(move.summary, 120))
        break
      case 'presence-repair':
      case 'direct-reply':
        break
    }
  }
  return uniqueSentences(cues, 4)
}

function enrichGovernance(input: AlicizationMindSurfaceRenderInput, locale: 'zh' | 'en'): AlicizationMindTurnGovernance {
  const cues = deriveKernelCues(input.moves, locale)
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
  }, locale)
  const governedSurface = buildMindGovernedFallbackSurface({
    governance,
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
  const replyContext: AlicizationMindSurfaceReplyContext = {
    governance,
    locale,
    previousAssistantText,
    seed,
    userText,
  }
  const moveSentences = orderMindSurfaceReplyParts(
    resolvedMoves.flatMap(move => renderMove(move, replyContext)),
    locale,
  )
  const maxSentences = Math.max(1, Math.min(3, governance.maxSentences || 2))
  const governedReply = governedSurface?.reply ?? ''
  const normalizedGovernedReply = normalizeTemplatePhrasing(governedReply, locale)
  const governedVisibleReplyMode = governedSurface?.visibleReplyMode ?? 'bubble'
  const useGovernedLead = shouldUseGovernedLead({
    moves: resolvedMoves,
    governedReply: normalizedGovernedReply,
    previousAssistantText,
    suppressGovernedLead: input.suppressGovernedLead || !hasExplicitMoves,
  })
  const replySentences = uniqueSentences([
    useGovernedLead && governedVisibleReplyMode !== 'dispatch-only'
      ? normalizedGovernedReply
      : '',
    ...moveSentences,
    !useGovernedLead && moveSentences.length === 0 && governedVisibleReplyMode !== 'dispatch-only'
      ? normalizedGovernedReply
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
    && trustedThought.includes(`obligation=${resolveGovernedMindObligation(governance)}`)
    && trustedThought.includes(`truth=${resolveGovernedMindTruth(governance)}`)
      ? trustedThought
      : buildGovernedMindThought({
          governance,
          userText,
        })
  const emotion = allowedEmotions.has(sanitizeText(input.emotion, 24))
    ? sanitizeText(input.emotion, 24)
    : (governedSurface?.emotion ?? resolveGovernedMindEmotion(governance))
  const delivery = allowedDeliveries.has(sanitizeText(input.delivery, 24))
    ? sanitizeText(input.delivery, 24)
    : resolveGovernedDelivery(governance)

  return {
    governance,
    thought,
    emotion,
    reply,
    performance: {
      baseEmotion: emotion,
      facialCue: null,
      actionCue: null,
      delivery,
      emphasis: 0,
    },
  }
}

export function buildAlicizationMindSurfaceStructuredReply(input: AlicizationMindSurfaceRenderInput) {
  const rendered = renderAlicizationMindSurface(input)
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: rendered.thought,
    emotion: rendered.emotion,
    reply: rendered.reply,
    performance: rendered.performance,
    governance: rendered.governance,
  })
}
