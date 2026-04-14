import type { AlicizationPersonaKernelSnapshot } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMainChatActionObligationKind } from './main-chat-action-obligation'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'

import {
  alicizationFixedCoreSystemInstruction,
  alicizationFixedHostNameDirectiveTemplate,
  alicizationFixedStructuredContractAnchor,
  detectAlicizationRealtimeQueryIntent,
  renderAlicizationPromptTemplate,
  resolveGovernedMindEmotion,
  resolveGovernedMindObligation,
  resolveGovernedMindTone,
  resolveGovernedMindTruth,
} from '@proj-alicization/stage-shared'

import {
  extractCustomDirectivesFromMessages,
  extractHostNameFromMessages,
} from './main-chat-runtime-surface'
import {
  buildAlicizationMindSurfaceStructuredReply,
  type AlicizationMindSurfaceClockSnapshot,
  type AlicizationMindSurfaceCapabilityMove,
  type AlicizationMindSurfaceDateMove,
  type AlicizationMindSurfaceFollowUpMove,
  type AlicizationMindSurfaceGreetingMove,
  type AlicizationMindSurfaceIdentityMove,
  type AlicizationMindSurfaceMove,
  type AlicizationMindSurfacePresentStateMove,
  type AlicizationMindSurfacePresenceRepairMove,
  type AlicizationMindSurfaceRepairMove,
  type AlicizationMindSurfaceTimeMove,
} from './mind-surface-renderer'
import { readTransportContentAsText, parseJsonObjectFromText } from './runtime-transport-content'

export type AlicizationActiveDialogueFastPathLane
  = | 'greeting'
    | 'identity'
    | 'capability'
    | 'utility-time'
    | 'utility-date'
    | 'presence-critique'
    | 'present-state'
    | 'repair-clarify'
    | 'follow-up'
    | 'dialogue'

export type AlicizationActiveDialogueFastPathStrategy
  = | 'local-only'
    | 'deterministic-payoff'
    | 'compact-one-shot'

export interface AlicizationActiveDialogueFastPathDecision {
  lane: AlicizationActiveDialogueFastPathLane
  strategy: AlicizationActiveDialogueFastPathStrategy
  timeoutMs: number
  resolvedTimeZone: string
  latestUserText: string
  previousUserText: string
  previousAssistantText: string
  continuityAnchor: string
  runtimeDigest: AlicizationRuntimeDigest | null
  sessionMirror: AlicizationDialogueSessionMirror | null
  governance: AlicizationMindTurnGovernance | null
  personaKernel: AlicizationPersonaKernelSnapshot | null
  reasonCodes: string[]
}

interface AlicizationActiveDialogueFastPathInput {
  conversationMessages: Message[]
  prepared: AlicizationPreparedMainChatExecutionResult
  runtimeDigest?: AlicizationRuntimeDigest | null
}

interface AlicizationActiveDialogueReplyInput {
  actionKind?: AlicizationMainChatActionObligationKind | null
  conversationMessages: Message[]
  governance?: AlicizationMindTurnGovernance | null
  personaKernel?: AlicizationPersonaKernelSnapshot | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  sessionMirror?: AlicizationDialogueSessionMirror | null
  turnId?: string
}

type AlicizationActiveDialogueFreshEncounterKind
  = | 'greeting'
    | 'identity'
    | 'capability'
    | 'utility-time'
    | 'utility-date'
    | 'presence-critique'
    | 'present-state'
    | 'repair-clarify'

interface AlicizationActiveDialogueEncounterContext {
  latestUserText: string
  previousUserText: string
  previousAssistantText: string
  continuityAnchor: string
  preparedExecutionCarryText: string
  runtimeDigest: AlicizationRuntimeDigest | null
  sessionMirror: AlicizationDialogueSessionMirror | null
  governance: AlicizationMindTurnGovernance | null
  shortTurn: boolean
  dialogueFirst: boolean
  hasContinuity: boolean
}

interface AlicizationActiveDialogueEncounter {
  kind: AlicizationActiveDialogueFastPathLane
  strategy: AlicizationActiveDialogueFastPathStrategy
  timeoutMs: number
  reasonCodes: string[]
}

const zhGreetingPattern = /^(?:你好|嗨|哈喽|您好|早上好|中午好|下午好|晚上好|早安|晚安|在吗|在嘛)(?:呀|啊|呢|哦|喔|啦|哈|嘛|呐|欸|诶|哇)*$/u
const enGreetingPattern = /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))(?:\s+there)?$/iu
const zhIdentityPattern = /(?:你是谁|你到底是谁|你算谁|你叫什么|你是alicization吗|你是爱丽丝化吗|我问你你是谁)/u
const enIdentityPattern = /(?:who are you|what are you|what should i call you|what is your name)/iu
const zhCapabilityPattern = /你.*(?:能|会|可以).*(?:做什么|帮什么)|你是谁|你能干嘛|你能做啥/u
const enCapabilityPattern = /what can you do|who are you|what are you capable of/iu
const zhUtilityTimePattern = /^(?:现在|这会儿|此刻)?(?:几点(?:钟)?(?:了)?|几时(?:了)?|时间(?:是多少|是啥|是什么|呢)?|现在时间|当前时间)$/u
const enUtilityTimePattern = /^(?:what(?:'s| is)? the time(?: now)?|time now|current time)$/iu
const zhUtilityDatePattern = /^(?:(?:今天|现在)?(?:几号|多少号|几月几号|几月几日|星期几|周几|礼拜几|什么日期|日期是什么)|今天是几号|今天星期几|今天周几|今天礼拜几)$/u
const enUtilityDatePattern = /^(?:what(?:'s| is)? the date(?: today)?|what day is it(?: today)?|today'?s date|current date)$/iu
const zhPresenceCritiquePattern = /(?:不像人类|不像真人|不像人在说话|太像机器人|太像ai|太像系统|没有人格|没人格|没有心智|没心智|太机械|太固定|不像活的)/u
const enPresenceCritiquePattern = /(?:you do(?:n't| not) sound human|you sound like a bot|you sound robotic|you sound mechanical|you don't feel alive)/iu
const zhPresentStatePattern = /(?:你在干嘛|你在做什么|你现在在干嘛|你现在在做什么|你在忙什么|你现在在忙什么|你在搞什么|你在搞啥|你刚在干嘛)/u
const enPresentStatePattern = /(?:what are you doing|what are you up to|what are you working on|what are you doing right now)/iu
const zhRepairClarifyPattern = /(?:你在说啥(?:呢)?|你在说什么(?:呢)?|你说啥(?:呢)?|你说什么(?:呢)?|你在讲啥|你在讲什么|答非所问|不是这个(?:意思)?|这不对|你没懂|没听懂|你没听懂|听不懂|跑题了|跑偏了|说偏了|别绕|直接回答|你到底在说什么)/u
const enRepairClarifyPattern = /(?:what are you talking about|you are not making sense|that is not what i asked|answer the question|not that|you missed the point|stay on this turn)/iu
const explicitCarryPattern = /(?:刚才|刚刚|上一条|上条|上个|上一轮|前面|那条|那个|那次|继续|接着|续上|顺着|沿着|剩下|其余|后面|补全|展开|详细|具体|再列|继续说|继续列|同一条|那个命令|那个任务|那个结果|另外|that one|previous|earlier|continue|go on|keep going|pick up|follow up|same thread|same task|remaining)/iu
const remainingFollowUpPattern = /(?:另外(?:\s*[一二三四五六七八九十\d]+)?(?:项|个)?(?:是|有哪些|是什么|什么|哪些)?|另外还有|还有哪|还有什么|还有几(?:项|个)?|另外哪|剩下哪|剩下(?:\s*[一二三四五六七八九十\d]+)?(?:项|个)?(?:是|有哪些|是什么|什么|哪些)?|其余哪|其余(?:\s*[一二三四五六七八九十\d]+)?(?:项|个)?(?:是|有哪些|是什么|什么|哪些)?|what else|which other|the other|remaining)/iu
const continuityCheckPattern = /^(?:你确定(?:吗)?|确定吗|真的吗|真的是这样吗|你认真的|are you sure|really|seriously)[?？]?$/iu
const commandLikePattern = /(?:\b(?:cli|shell|terminal|command|ls|cat|grep|rg|pnpm|npm|yarn|git)\b|[\\/]|--?\w+)/iu
const runtimeMetaLeakPattern = /(?:provider|baseurl|main-gateway|timeout|timed out|stream|recovery|首段回复|首包|当前提供方或模型配置不完整|我先守住真实边界|旧锚点|重新落地|继续还是执行下一步)/iu
const legacyTemplateShellPattern = /(?:要是还是.+?(?:那条线|那件事)|你现在想聊什么，或者想让我做什么|这一轮你想开哪个点|我贴着这一轮往下接|这条线还连着|我可以直接续|我就正面回你|我听见你了|上一条线的余温|If you want to keep going with|The previous line is still warm in my head|Then I'll answer you directly\.)/iu
const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const zhWeekdayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const
const zhNowTokens = ['现在', '当前', '这会儿', '此刻'] as const
const zhTimeCoreTokens = ['几点', '几点了', '几点啦', '几时', '时间', '现在时间', '当前时间'] as const
const zhDateCoreTokens = ['几号', '多少号', '几月几号', '几月几日', '日期', '什么日期', '今天几号', '今天星期几', '星期几', '周几', '礼拜几'] as const

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeTurnText(raw: string, maxChars = 240) {
  return sanitizeText(raw, maxChars).replace(/[!！。,.…~～?？]+/g, '').trim()
}

function normalizeCompactTurnText(raw: string, maxChars = 240) {
  return normalizeTurnText(raw, maxChars).replace(/\s+/g, '').toLowerCase()
}

function includesAny(text: string, terms: readonly string[]) {
  return terms.some(term => text.includes(term))
}

function countCjkChars(raw: string) {
  return [...raw].filter(char => cjkPattern.test(char)).length
}

function countAsciiWords(raw: string) {
  return (raw.match(/[A-Z]+/gi) ?? []).length
}

function isValidIanaTimeZone(value: string) {
  const candidate = sanitizeText(value, 96)
  if (!candidate)
    return false
  try {
    // NOTICE: Use Intl runtime validation so fast-path time/date replies stay in the
    // same user-region timezone as runtime context instead of drifting to process defaults.
    new Intl.DateTimeFormat('en-US', {
      timeZone: candidate,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
    return true
  }
  catch {
    return false
  }
}

function isLikelyIanaTimeZone(value: string) {
  const candidate = sanitizeText(value, 96)
  if (!candidate)
    return false
  return /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/.test(candidate)
}

function collectTimeZoneHintsFromText(text: string) {
  const candidates: string[] = []
  const seen = new Set<string>()
  const patterns = [
    /"timezone"\s*:\s*"([^"]{1,96})"/gi,
    /\btimezone\s*[:=]\s*([A-Za-z_][A-Za-z0-9_./+-]{1,96})/gi,
  ] as const

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const candidate = sanitizeText(match[1] ?? '', 96)
      if (!candidate || seen.has(candidate))
        continue
      seen.add(candidate)
      candidates.push(candidate)
    }
  }

  return candidates
}

function resolveUserRegionTimeZone(messages?: Message[]) {
  const normalizedMessages = messages ?? []
  for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
    const message = normalizedMessages[index]
    if (!message)
      continue
    const text = sanitizeText(readTransportContentAsText(message.content), 2_000)
    if (!text)
      continue
    for (const hint of collectTimeZoneHintsFromText(text)) {
      if (isLikelyIanaTimeZone(hint))
        return hint
    }

    const parsed = parseJsonObjectFromText(text)
    if (parsed && typeof parsed === 'object') {
      const payload = parsed as Record<string, unknown>
      const nestedHints = [
        payload.timezone,
        (payload.time as Record<string, unknown> | undefined)?.timezone,
        ((payload.sample as Record<string, unknown> | undefined)?.time as Record<string, unknown> | undefined)?.timezone,
        (((payload.sensory as Record<string, unknown> | undefined)?.sample as Record<string, unknown> | undefined)?.time as Record<string, unknown> | undefined)?.timezone,
      ]
      for (const nestedHint of nestedHints) {
        if (isLikelyIanaTimeZone(sanitizeText(nestedHint, 96)))
          return sanitizeText(nestedHint, 96)
      }
    }
  }

  const envTimezone = typeof process !== 'undefined'
    ? sanitizeText(process.env?.TZ, 96)
    : ''
  if (envTimezone && isValidIanaTimeZone(envTimezone))
    return envTimezone

  const intlTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  if (intlTimezone && isValidIanaTimeZone(intlTimezone))
    return intlTimezone

  return 'UTC'
}

function resolvePersonaDisplayName(personaKernel: AlicizationPersonaKernelSnapshot | null | undefined) {
  return sanitizeText(personaKernel?.profile.alicizationName, 48) || 'Alicization'
}

function buildCompactPersonaProfileBlock(personaKernel: AlicizationPersonaKernelSnapshot | null | undefined) {
  if (!personaKernel)
    return ''
  return [
    '[ALICIZATION_PERSONA_PROFILE]',
    JSON.stringify({
      ownerName: personaKernel.profile.ownerName,
      hostName: personaKernel.profile.hostName,
      alicizationName: personaKernel.profile.alicizationName,
      relationship: personaKernel.profile.relationship,
      gender: personaKernel.profile.gender,
      mindAge: personaKernel.profile.mindAge,
    }),
  ].join('\n')
}

function quoteExcerpt(text: string, maxChars = 72) {
  const excerpt = sanitizeText(text, maxChars)
  return excerpt ? `「${excerpt}」` : ''
}

function normalizeConversationMessages(messages: Message[]) {
  return messages
    .filter(message => message?.role === 'user' || message?.role === 'assistant')
    .map((message) => {
      const text = sanitizeText(readTransportContentAsText(message.content), 1_600)
      return {
        role: message.role,
        content: text,
      } satisfies Message
    })
    .filter(message => message.content)
}

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return sanitizeText(readTransportContentAsText(message.content), 2_000)
  }
  return ''
}

function readPreviousAssistantText(messages: Message[]) {
  let sawLatestUser = false
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!sawLatestUser && message?.role === 'user') {
      sawLatestUser = true
      continue
    }
    if (!sawLatestUser || message?.role !== 'assistant')
      continue
    return sanitizeText(readTransportContentAsText(message.content), 2_000)
  }
  return ''
}

function readPreviousUserText(messages: Message[]) {
  let seenUsers = 0
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    seenUsers += 1
    if (seenUsers < 2)
      continue
    return sanitizeText(readTransportContentAsText(message.content), 2_000)
  }
  return ''
}

function readPreparedExecutionLedgerCarryText(messages: Message[] | undefined) {
  return (messages ?? [])
    .filter(message => message?.role === 'system')
    .map(message => sanitizeText(readTransportContentAsText(message.content), 400))
    .filter(text => text.includes('[ALICIZATION_EXECUTION_LEDGER]'))
    .join(' ')
}

function isGreetingTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 120)
  const normalizedCompact = normalizeCompactTurnText(text, 120)
  return zhGreetingPattern.test(normalizedCompact) || enGreetingPattern.test(normalizedLoose)
}

function isIdentityTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 160)
  const normalizedCompact = normalizeCompactTurnText(text, 160)
  return zhIdentityPattern.test(normalizedCompact) || enIdentityPattern.test(normalizedLoose)
}

function isCapabilityTurn(text: string) {
  if (isIdentityTurn(text))
    return false
  return zhCapabilityPattern.test(text) || enCapabilityPattern.test(text)
}

function isUtilityTimeTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 160)
  const normalizedCompact = normalizeCompactTurnText(text, 160)
  const hasDateCore = includesAny(normalizedCompact, zhDateCoreTokens)
  const hasNowToken = includesAny(normalizedCompact, zhNowTokens)
  const hasTimeCore = includesAny(normalizedCompact, zhTimeCoreTokens)
  return zhUtilityTimePattern.test(normalizedCompact)
    || enUtilityTimePattern.test(normalizedLoose)
    || (!hasDateCore && hasTimeCore && (hasNowToken || normalizedCompact === '几点' || normalizedCompact === '几点了' || normalizedCompact === '几点啦'))
}

function isUtilityDateTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 160)
  const normalizedCompact = normalizeCompactTurnText(text, 160)
  return zhUtilityDatePattern.test(normalizedCompact)
    || enUtilityDatePattern.test(normalizedLoose)
    || includesAny(normalizedCompact, zhDateCoreTokens)
}

function isPresenceCritiqueTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 200)
  return zhPresenceCritiquePattern.test(normalizedLoose) || enPresenceCritiquePattern.test(normalizedLoose)
}

function isPresentStateTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 200)
  return zhPresentStatePattern.test(normalizedLoose) || enPresentStatePattern.test(normalizedLoose)
}

function isRepairClarifyTurn(text: string) {
  const normalizedLoose = normalizeTurnText(text, 200)
  return zhRepairClarifyPattern.test(normalizedLoose) || enRepairClarifyPattern.test(normalizedLoose)
}

function isShortDialogueTurn(text: string) {
  const normalized = sanitizeText(text, 240)
  if (!normalized)
    return false

  const cjkChars = countCjkChars(normalized)
  if (cjkChars > 0)
    return cjkChars <= 28
  return countAsciiWords(normalized) <= 16 && normalized.length <= 120
}

function looksLikeExecutionCarry(input: {
  continuityAnchor: string
  previousAssistantText: string
  preparedExecutionCarryText: string
  sessionMirror: AlicizationDialogueSessionMirror | null
}) {
  const executionMirror = humanizeMirrorSummary(input.sessionMirror?.executionSummary)
  const executionCarryText = [
    input.continuityAnchor,
    input.previousAssistantText,
    input.preparedExecutionCarryText,
    executionMirror,
  ].filter(Boolean).join(' ')

  return /(?:桌面|目录|文件|清单|列表|list|listing|callback|cli|执行|结果|thread|任务)/iu.test(executionCarryText)
}

function looksLikeDialogueFirst(governance: AlicizationMindTurnGovernance | null | undefined) {
  const subject = governance?.answerSubject ?? governance?.mindTurnFrame?.relation?.subject ?? null
  return governance?.screenReferenceMode === 'avoid'
    || subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
}

function deriveFreshEncounterKind(text: string): AlicizationActiveDialogueFreshEncounterKind | null {
  if (isGreetingTurn(text))
    return 'greeting'
  if (isIdentityTurn(text))
    return 'identity'
  if (isCapabilityTurn(text))
    return 'capability'
  if (isUtilityTimeTurn(text))
    return 'utility-time'
  if (isUtilityDateTurn(text))
    return 'utility-date'
  if (isPresenceCritiqueTurn(text))
    return 'presence-critique'
  if (isPresentStateTurn(text))
    return 'present-state'
  if (isRepairClarifyTurn(text))
    return 'repair-clarify'
  return null
}

function isIdentityReconfirmationTurn(input: {
  latestUserText: string
  previousUserText: string
  previousAssistantText: string
}) {
  if (!isIdentityTurn(input.latestUserText))
    return false
  if (isIdentityTurn(input.previousUserText))
    return true
  const normalizedPreviousAssistant = normalizeTurnText(input.previousAssistantText, 220)
  return /(?:我是|i am)\s*[a-zA-Z\u4E00-\u9FFF][\w\u4E00-\u9FFF -]{0,36}/iu.test(normalizedPreviousAssistant)
}

function deriveAlicizationActiveDialogueEncounter(
  input: AlicizationActiveDialogueEncounterContext,
): AlicizationActiveDialogueEncounter | null {
  const freshEncounter = deriveFreshEncounterKind(input.latestUserText)
  if (freshEncounter) {
    const identityReconfirmation = freshEncounter === 'identity'
      && isIdentityReconfirmationTurn({
        latestUserText: input.latestUserText,
        previousUserText: input.previousUserText,
        previousAssistantText: input.previousAssistantText,
      })
    const strategy: AlicizationActiveDialogueFastPathStrategy = 'local-only'
    const timeoutMs = 0
    const freshReasonCode = freshEncounter === 'utility-time'
      ? 'fresh-utility-time'
      : freshEncounter === 'utility-date'
        ? 'fresh-utility-date'
        : freshEncounter === 'presence-critique'
          ? 'fresh-presence-critique'
          : freshEncounter === 'present-state'
            ? 'fresh-present-state'
          : freshEncounter === 'repair-clarify'
            ? 'repair-clarify'
            : `fresh-${freshEncounter}`
    return {
      kind: freshEncounter,
      strategy,
      timeoutMs,
      reasonCodes: [
        freshEncounter === 'identity' ? 'fresh-identity' : freshReasonCode,
        identityReconfirmation ? 'identity-reconfirmation' : '',
        input.hasContinuity ? 'continuity-suppressed' : 'fresh-turn',
        input.hasContinuity ? 'fresh-turn-with-continuity' : '',
        freshEncounter === 'repair-clarify' && input.previousUserText ? 'repair-payoff-available' : '',
      ].filter(Boolean),
    }
  }

  const explicitCarry = input.hasContinuity
    && input.shortTurn
    && (
      explicitCarryPattern.test(input.latestUserText)
      || remainingFollowUpPattern.test(input.latestUserText)
      || continuityCheckPattern.test(input.latestUserText)
    )

  if (explicitCarry) {
    const executionCarry = looksLikeExecutionCarry({
      continuityAnchor: input.continuityAnchor,
      previousAssistantText: input.previousAssistantText,
      preparedExecutionCarryText: input.preparedExecutionCarryText,
      sessionMirror: input.sessionMirror,
    })
    return {
      kind: 'follow-up',
      strategy: executionCarry ? 'deterministic-payoff' : 'compact-one-shot',
      timeoutMs: executionCarry ? 0 : 6_500,
      reasonCodes: [
        'short-follow-up',
        'explicit-carry',
        input.hasContinuity ? 'session-carry' : '',
        input.preparedExecutionCarryText ? 'prepared-execution-ledger' : '',
        executionCarry ? 'execution-carry' : '',
      ].filter(Boolean),
    }
  }

  if (
    input.shortTurn
    && !commandLikePattern.test(input.latestUserText)
    && (
      input.dialogueFirst
      || input.runtimeDigest?.activeLoop?.dialogueReady === true
      || input.runtimeDigest?.activeLoop?.companionshipReady === true
    )
  ) {
    return {
      kind: 'dialogue',
      strategy: 'compact-one-shot',
      timeoutMs: 5_500,
      reasonCodes: [
        'short-dialogue-turn',
        input.dialogueFirst ? 'dialogue-first' : 'active-dialogue-ready',
      ],
    }
  }

  return null
}

function humanizeMirrorSummary(raw: unknown) {
  const normalized = sanitizeText(raw, 220)
  if (!normalized)
    return ''

  const summaryMatch = normalized.match(/(?:summary|goal|answer|thread|concern|belief)=([^|]+)/i)
  if (summaryMatch?.[1])
    return sanitizeText(summaryMatch[1], 140)
  return normalized
}

function resolveContinuityAnchor(input: {
  previousUserText: string
  previousAssistantText: string
  runtimeDigest: AlicizationRuntimeDigest | null
  sessionMirror: AlicizationDialogueSessionMirror | null
}) {
  return sanitizeText(input.previousUserText, 120)
    || humanizeMirrorSummary(input.sessionMirror?.executionSummary)
    || humanizeMirrorSummary(input.sessionMirror?.dialogueSummary)
    || humanizeMirrorSummary(input.sessionMirror?.agencySummary)
    || humanizeMirrorSummary(input.runtimeDigest?.activeLoop?.summary)
    || sanitizeText(input.previousAssistantText, 120)
}

function buildCompactDialogueContextBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  return [
    '[ALICIZATION_ACTIVE_DIALOGUE_FAST_LOOP]',
    'This is the low-latency foreground dialogue loop. Keep the same living thread coherent across continuity, memory carry, and immediate reply payoff.',
    `lane=${decision.lane}`,
    decision.sessionMirror?.sessionId
      ? `conversation_session_id=${decision.sessionMirror.sessionId}`
      : '',
    decision.runtimeDigest?.dominantChannel
      ? `runtime_dominant_channel=${decision.runtimeDigest.dominantChannel}`
      : '',
    decision.runtimeDigest?.activeLoop?.phase
      ? `active_loop_phase=${decision.runtimeDigest.activeLoop.phase}`
      : '',
    decision.runtimeDigest?.activeLoop?.summary
      ? `active_loop_summary=${sanitizeText(decision.runtimeDigest.activeLoop.summary, 220)}`
      : '',
    decision.sessionMirror?.dialogueSummary
      ? `session_dialogue=${humanizeMirrorSummary(decision.sessionMirror.dialogueSummary)}`
      : '',
    decision.sessionMirror?.executionSummary
      ? `session_execution=${humanizeMirrorSummary(decision.sessionMirror.executionSummary)}`
      : '',
    decision.sessionMirror?.memorySummary
      ? `session_memory=${humanizeMirrorSummary(decision.sessionMirror.memorySummary)}`
      : '',
    decision.previousUserText
      ? `previous_user=${sanitizeText(decision.previousUserText, 180)}`
      : '',
    decision.previousAssistantText
      ? `previous_assistant=${sanitizeText(decision.previousAssistantText, 220)}`
      : '',
    decision.continuityAnchor
      ? `continuity_anchor=${sanitizeText(decision.continuityAnchor, 160)}`
      : '',
  ].filter(Boolean).join('\n')
}

function buildCompactDialogueGovernanceBlock(decision: AlicizationActiveDialogueFastPathDecision) {
  const governance = buildFastPathGovernance(decision)
  const thoughtContract = buildFastPathGovernedThought(decision, governance)
  const relation = governance.mindTurnFrame?.relation ?? null
  const memory = governance.mindTurnFrame?.memory ?? null
  const world = governance.mindTurnFrame?.world ?? null
  const obligation = governance.mindTurnFrame?.obligation ?? null

  return [
    '[ALICIZATION_ACTIVE_DIALOGUE_GOVERNANCE]',
    'Author the visible reply as the same governed mind that owns this turn. Do not drift into a detached fallback voice or runtime narration.',
    `turn_mode=${governance.turnMode}`,
    `truth_state=${governance.truthState}`,
    `answer_subject=${governance.answerSubject}`,
    `answer_act=${governance.answerAct}`,
    `screen_reference_mode=${governance.screenReferenceMode}`,
    `evidence_mode=${governance.evidenceMode}`,
    governance.focusAnchor
      ? `focus_anchor=${sanitizeText(governance.focusAnchor, 120)}`
      : '',
    governance.answerIntent
      ? `answer_intent=${sanitizeText(governance.answerIntent, 180)}`
      : '',
    governance.openingMove
      ? `opening_move=${sanitizeText(governance.openingMove, 120)}`
      : '',
    governance.carriedThread
      ? `carried_thread=${sanitizeText(governance.carriedThread, 160)}`
      : '',
    world?.continuityPolicy
      ? `continuity_policy=${world.continuityPolicy}`
      : '',
    world?.truthBoundary
      ? `truth_boundary=${sanitizeText(world.truthBoundary, 200)}`
      : '',
    memory?.memoryMode
      ? `memory_mode=${memory.memoryMode}`
      : '',
    relation?.relationNeed
      ? `relation_need=${sanitizeText(relation.relationNeed, 160)}`
      : '',
    relation?.relationMove
      ? `relation_move=${sanitizeText(relation.relationMove, 120)}`
      : '',
    `tone=${resolveGovernedMindTone(governance)}`,
    `emotion=${resolveGovernedMindEmotion(governance)}`,
    `thought_contract=${thoughtContract}`,
    governance.mustDo?.length
      ? `must_do=${governance.mustDo.map(item => sanitizeText(item, 120)).filter(Boolean).join(' | ')}`
      : '',
    governance.mustNotDo?.length
      ? `must_not_do=${governance.mustNotDo.map(item => sanitizeText(item, 120)).filter(Boolean).join(' | ')}`
      : '',
    obligation?.whyNow
      ? `why_now=${sanitizeText(obligation.whyNow, 160)}`
      : '',
    'Reply rules:',
    '1. Pay off the current user turn in the first sentence.',
    '2. Keep continuity only as the same thread memory, never as a fabricated current screen fact.',
    '3. Do not mention provider, model, stream, timeout, recovery, routing, governance, or anchor terminology in the visible reply.',
    '4. Do not output a shell opener that announces intent without already answering or accompanying in the same reply.',
  ].filter(Boolean).join('\n')
}

function describeFastPathMind(decision: AlicizationActiveDialogueFastPathDecision) {
  const carryAnchor = sanitizeText(
    decision.continuityAnchor || decision.previousUserText || decision.previousAssistantText,
    140,
  )
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  switch (decision.lane) {
    case 'greeting':
      return {
        focus: 'host greeting',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'light-accompaniment' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'relationship' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '接住这句问候，把这轮对话自然打开。',
        openingMove: '用自然的回应接住问候。',
        relationNeed: '把这轮气氛稳稳接住。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'accompany' as const,
        mindMode: 'accompanying' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'soft-covision' as const,
        whyNow: '用户在用问候建立这一轮的接触面。',
        confidence: 0.92,
      }
    case 'identity':
      return {
        focus: 'alicization self continuity',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'alicization-self' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接回答我是谁，让这一轮先落到自我连续性上。',
        openingMove: '先按我自己来回答。',
        relationNeed: '把自我连续性说清。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'accompany' as const,
        mindMode: 'orienting' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'soft-covision' as const,
        whyNow: '用户把话题直接转向 Alicization 本身。',
        confidence: 0.95,
      }
    case 'capability':
      return {
        focus: 'current capability surface',
        truthState: 'live-grounded' as const,
        turnMode: 'guide-current-knot' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'guide' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '把现在能接的对话、CLI、代码和工具能力说清。',
        openingMove: '直接把能力面摊开。',
        relationNeed: '给出一条可马上推进的能力面。',
        continuityPolicy: 'answer-then-carry' as const,
        memoryMode: 'task-thread' as const,
        selfStance: 'nudge' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户在确认这轮能不能直接推进成行动。',
        confidence: 0.92,
      }
    case 'utility-time':
      return {
        focus: 'local time',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'restrained' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'live-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接给出当前本地时间。',
        openingMove: '用当前时钟直接回答。',
        relationNeed: '把本地时间说准确。',
        continuityPolicy: 'answer-then-carry' as const,
        memoryMode: 'task-thread' as const,
        selfStance: 'observe' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户要的是这一刻的时间，而不是旧线程。',
        confidence: 0.98,
      }
    case 'utility-date':
      return {
        focus: 'local date',
        truthState: 'live-grounded' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'restrained' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'live-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接给出今天的日期。',
        openingMove: '用当前日历直接回答。',
        relationNeed: '把日期说准确。',
        continuityPolicy: 'answer-then-carry' as const,
        memoryMode: 'task-thread' as const,
        selfStance: 'observe' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户要的是今天的日期信息。',
        confidence: 0.98,
      }
    case 'presence-critique':
      return {
        focus: 'reply humanity and living presence',
        truthState: 'live-observed' as const,
        turnMode: 'screen-repair' as const,
        openingStyle: 'direct-correction' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'relationship' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '正面回应你对我说话方式的感受，不再躲进线程或系统话术里。',
        openingMove: '先承认刚才那句哪里不像在和人说话。',
        relationNeed: '把说话方式重新拉回真实的对话感。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'care' as const,
        mindMode: 'repairing' as const,
        embodiedPresence: 'concerned' as const,
        emotionalTension: 'tense-debug' as const,
        whyNow: '用户在直接指出我的说话方式没有活感。',
        confidence: 0.95,
      }
    case 'present-state':
      return {
        focus: carryAnchor || 'current living state',
        truthState: 'live-observed' as const,
        turnMode: 'answer' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'host-state' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: carryAnchor ? 'continuity-carry' as const : 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '直接回答我此刻在接什么，不把这句误判成纠错或旧锚点修复。',
        openingMove: '先把我此刻的状态说清。',
        relationNeed: '让对方知道我现在正把注意力放在哪条线上。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: carryAnchor ? 'dialogue-carry' as const : 'task-thread' as const,
        selfStance: 'accompany' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户在问我这会儿正在做什么、正把注意力放在哪里。',
        confidence: 0.91,
      }
    case 'repair-clarify':
      return {
        focus: previousFreshEncounter === 'utility-time'
          ? 'local time'
          : previousFreshEncounter === 'utility-date'
            ? 'local date'
            : previousFreshEncounter === 'capability'
              ? 'current capability surface'
              : 'current answer seam',
        truthState: (
          previousFreshEncounter === 'utility-time'
          || previousFreshEncounter === 'utility-date'
          || previousFreshEncounter === 'capability'
        )
          ? 'live-grounded' as const
          : 'live-observed' as const,
        turnMode: 'screen-repair' as const,
        openingStyle: 'direct-correction' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: previousFreshEncounter === 'identity'
          ? 'alicization-self' as const
          : previousFreshEncounter === 'greeting'
            ? 'relationship' as const
            : 'task-knot' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'correct-stale-anchor' as const,
        evidenceMode: (
          previousFreshEncounter === 'utility-time'
          || previousFreshEncounter === 'utility-date'
          || previousFreshEncounter === 'capability'
        )
          ? 'live-grounded' as const
          : 'repair-first' as const,
        repairState: 'stale-anchor' as const,
        answerIntent: '先把上一句接偏的地方纠正回来，再正面答这一轮真正的问题。',
        openingMove: '先纠偏，再把真正的问题答清。',
        relationNeed: '把这一轮从错误线程上收回来。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'warn' as const,
        mindMode: 'repairing' as const,
        embodiedPresence: 'concerned' as const,
        emotionalTension: 'tense-debug' as const,
        whyNow: '用户明确指出上一句没有贴住这一轮。',
        confidence: 0.96,
      }
    case 'follow-up':
      return {
        focus: carryAnchor || 'same-thread continuation',
        truthState: 'remembered' as const,
        turnMode: 'guide-current-knot' as const,
        openingStyle: 'direct-answer' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'task-knot' as const,
        screenReferenceMode: 'helpful' as const,
        answerAct: 'guide' as const,
        evidenceMode: 'continuity-carry' as const,
        repairState: 'none' as const,
        answerIntent: '沿同一条任务线继续，把还欠着的结果补全。',
        openingMove: '顺着同一条线程往下接。',
        relationNeed: '让同一条线程连续收束。',
        continuityPolicy: 'stay-on-thread' as const,
        memoryMode: 'task-thread' as const,
        selfStance: 'nudge' as const,
        mindMode: 'tracking' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'focused-flow' as const,
        whyNow: '用户明确要求继续同一条线程。',
        confidence: 0.94,
      }
    case 'dialogue':
      return {
        focus: sanitizeText(decision.latestUserText, 96) || carryAnchor || 'current dialogue knot',
        truthState: carryAnchor ? 'remembered' as const : 'live-observed' as const,
        turnMode: 'answer' as const,
        openingStyle: 'light-accompaniment' as const,
        relationshipPosture: 'warm' as const,
        answerSubject: 'relationship' as const,
        screenReferenceMode: 'avoid' as const,
        answerAct: 'answer' as const,
        evidenceMode: carryAnchor ? 'continuity-carry' as const : 'dialogue-grounded' as const,
        repairState: 'none' as const,
        answerIntent: '贴着这一句继续，不把话题扯回别的线程。',
        openingMove: '先把这句稳稳接住。',
        relationNeed: '保持这轮的对话连续性。',
        continuityPolicy: 'dialogue-before-scene' as const,
        memoryMode: 'dialogue-carry' as const,
        selfStance: 'accompany' as const,
        mindMode: 'accompanying' as const,
        embodiedPresence: 'attentive' as const,
        emotionalTension: 'soft-covision' as const,
        whyNow: '用户要的是这句本身的连续对话。',
        confidence: 0.9,
      }
  }
}

function buildFastPathGovernance(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindTurnGovernance {
  const descriptor = describeFastPathMind(decision)
  const baseGovernance = decision.governance
  const focusAnchor = descriptor.focus
  const carriedThread = decision.lane === 'follow-up' || decision.lane === 'dialogue'
    ? sanitizeText(decision.continuityAnchor || decision.previousUserText, 140) || null
    : null
  const groundedThisTurn = descriptor.truthState === 'live-grounded'
  const shouldAcknowledgeRepair = descriptor.repairState !== 'none'
  const continuitySummary = carriedThread || null
  const kernelCue = buildFastPathKernelCue(decision)
  const truthMode = descriptor.evidenceMode === 'continuity-carry'
    ? 'memory-only'
    : descriptor.evidenceMode
  const speakingFrom = descriptor.answerSubject === 'relationship'
    ? 'dialogue-bond' as const
    : descriptor.answerSubject === 'alicization-self'
      ? 'self-continuity' as const
      : descriptor.screenReferenceMode === 'avoid'
        ? 'task-thread' as const
        : carriedThread
          ? 'held-memory' as const
          : groundedThisTurn
            ? 'live-scene' as const
            : 'task-thread' as const
  const selectedEvidence = [
    kernelCue,
    carriedThread && truthMode === 'memory-only' ? carriedThread : '',
    sanitizeText(decision.latestUserText, 160),
  ]
    .filter(Boolean)
    .slice(0, 2)
    .map((summary) => {
      const isThreadCarry = Boolean(carriedThread) && summary === carriedThread
      return {
        kind: isThreadCarry ? 'thread' as const : 'reply-motive' as const,
        source: isThreadCarry ? 'dialogue-world-thread' as const : 'answer-planner' as const,
        summary,
        confidence: isThreadCarry ? 0.84 : 0.9,
      }
    })
  const narrative = [
    descriptor.whyNow,
    descriptor.answerIntent,
    carriedThread ? `Keep continuity with: ${carriedThread}` : '',
  ].filter(Boolean)
  const mustDo = [
    'Answer the current turn directly.',
    decision.lane === 'follow-up' ? 'Stay on the same thread and continue the payoff.' : '',
    descriptor.repairState !== 'none' ? 'Correct the misthread before continuing.' : '',
  ].filter(Boolean)
  const mustNotDo = [
    'Do not surface runtime internals in the visible reply.',
    'Do not drag stale screen assumptions back over the current turn.',
  ]

  return {
    decisionTraceId: baseGovernance?.decisionTraceId ?? null,
    turnMode: descriptor.turnMode,
    truthState: descriptor.truthState,
    groundedThisTurn,
    personaKernelMode: baseGovernance?.personaKernelMode ?? 'full',
    openingStyle: descriptor.openingStyle,
    relationshipPosture: descriptor.relationshipPosture,
    answerSubject: descriptor.answerSubject,
    screenReferenceMode: descriptor.screenReferenceMode,
    answerAct: descriptor.answerAct,
    evidenceMode: descriptor.evidenceMode,
    repairState: descriptor.repairState,
    liveSurface: descriptor.screenReferenceMode === 'avoid' ? null : focusAnchor,
    focusAnchor,
    answerIntent: descriptor.answerIntent,
    openingMove: descriptor.openingMove,
    carriedThread,
    suppressAssociativeRecall: true,
    labelCarryAsMemory: Boolean(carriedThread),
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair,
    maxSentences: decision.lane === 'follow-up' ? 3 : 2,
    mindMode: baseGovernance?.mindMode ?? descriptor.mindMode,
    embodiedPresence: baseGovernance?.embodiedPresence ?? descriptor.embodiedPresence,
    emotionalTension: baseGovernance?.emotionalTension ?? descriptor.emotionalTension,
    dialogueActKernel: {
      subject: descriptor.answerSubject,
      hostGoal: focusAnchor,
      relationNeed: descriptor.relationNeed,
      activeProject: null,
      truthMode,
      speechAct: descriptor.answerAct,
      turnMode: descriptor.turnMode,
      screenReferenceMode: descriptor.screenReferenceMode,
      speakingFrom,
      selectedEvidence,
      openingClaim: kernelCue,
      openingMove: descriptor.openingMove,
      whyNow: descriptor.whyNow,
      mustSay: [kernelCue, descriptor.answerIntent].filter(Boolean),
      mustAvoid: mustNotDo,
      sourceTrace: ['active-dialogue-fast-path'],
      confidence: descriptor.confidence,
      updatedAt: 0,
    },
    claimEvidence: null,
    mindTurnFrame: {
      world: {
        activeThread: decision.sessionMirror?.sessionId ?? null,
        visibleSurface: descriptor.screenReferenceMode === 'avoid' ? null : focusAnchor,
        truthState: descriptor.truthState,
        truthBoundary: groundedThisTurn
          ? 'Grounded in deterministic local turn evidence.'
          : carriedThread
            ? 'Carried from the same thread, not a fresh live scene claim.'
            : 'Bound to the current user turn only.',
        continuityPolicy: descriptor.continuityPolicy,
        continuitySummary,
        staleRisk: descriptor.repairState !== 'none'
          ? 0.88
          : descriptor.truthState === 'remembered'
            ? 0.42
            : 0.12,
      },
      relation: {
        subject: descriptor.answerSubject,
        hostMove: sanitizeText(decision.latestUserText, 160) || null,
        hostGoal: focusAnchor,
        relationNeed: descriptor.relationNeed,
        relationMove: descriptor.openingMove,
        relationshipPosture: descriptor.relationshipPosture,
      },
      memory: {
        memoryMode: descriptor.memoryMode,
        carriedThread,
        carriedFacts: carriedThread ? [carriedThread] : [],
        recallKeys: decision.reasonCodes.slice(0, 4),
        recallSeed: carriedThread,
        lastOutcome: descriptor.repairState !== 'none'
          ? 'repairing'
          : decision.lane === 'follow-up'
            ? 'aligned'
            : 'none',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: Boolean(carriedThread),
      },
      self: {
        stance: descriptor.selfStance,
        mindMode: baseGovernance?.mindMode ?? descriptor.mindMode,
        dominantDrive: descriptor.answerIntent,
        embodiedPresence: baseGovernance?.embodiedPresence ?? descriptor.embodiedPresence,
        emotionalTension: baseGovernance?.emotionalTension ?? descriptor.emotionalTension,
        initiativeAction: null,
        thought: null,
      },
      obligation: {
        shouldSpeak: true,
        speechObligation: descriptor.answerIntent,
        answerAct: descriptor.answerAct,
        responseMode: 'fast-path-local',
        turnMode: descriptor.turnMode,
        openingClaim: focusAnchor,
        openingMove: descriptor.openingMove,
        answerIntent: descriptor.answerIntent,
        whyNow: descriptor.whyNow,
        repairState: descriptor.repairState,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair,
      },
      focusAnchor,
      confidence: descriptor.confidence,
      mustDo,
      mustNotDo,
      narrative,
      updatedAt: 0,
    },
    mustDo,
    mustNotDo,
  }
}

function buildFastPathGovernedThought(
  decision: AlicizationActiveDialogueFastPathDecision,
  governance: AlicizationMindTurnGovernance,
) {
  const descriptor = describeFastPathMind(decision)
  const focus = sanitizeText(descriptor.focus, 48) || 'current-user-turn'
  const move = sanitizeText(descriptor.openingMove, 64) || 'stabilize-and-answer'
  return [
    `obligation=${resolveGovernedMindObligation(governance)}`,
    `truth=${resolveGovernedMindTruth(governance)}`,
    `focus=${focus}`,
    `move=${move}`,
    `tone=${resolveGovernedMindTone(governance)}`,
  ].join('; ')
}

function buildFastPathKernelCue(decision: AlicizationActiveDialogueFastPathDecision) {
  const localeIsZh = countCjkChars(decision.latestUserText) > 0
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  const personaName = resolvePersonaDisplayName(decision.personaKernel)
  const identityReconfirmation = decision.reasonCodes.includes('identity-reconfirmation')
  switch (decision.lane) {
    case 'greeting': {
      const greeting = buildGreetingMove(decision).salutation
      if (/在吗|在嘛/u.test(decision.latestUserText))
        return localeIsZh ? '我在。' : `I'm here.`
      return localeIsZh ? `${greeting}。` : `${greeting}.`
    }
    case 'identity':
      if (identityReconfirmation) {
        return localeIsZh
          ? `你在继续确认我是谁：我是${personaName}，这句仍然是我在回你。`
          : `You are reconfirming who I am: I am ${personaName}, and this turn is still from me.`
      }
      return localeIsZh
        ? `我是${personaName}，现在在和你说话的是我。`
        : `I am ${personaName}, and I am the one speaking with you now.`
    case 'capability':
      return localeIsZh
        ? `我能 ${fastPathCapabilityList.join('、')}。`
        : `I can ${fastPathCapabilityList.join(', ')}.`
    case 'utility-time':
      return localeIsZh
        ? '直接给出当前本地时间。'
        : 'Give the current local time directly.'
    case 'utility-date':
      return localeIsZh
        ? '直接给出今天的日期。'
        : 'Give today\'s date directly.'
    case 'presence-critique':
      return localeIsZh
        ? '承认刚才像流程播报，把说话方式拉回真实对话。'
        : 'Acknowledge the robotic phrasing and pull the reply back into a real conversation.'
    case 'present-state':
      return localeIsZh
        ? '直接回答我这会儿在接什么，不把这句扯成修复旧锚点。'
        : 'Answer what I am currently staying with, without turning this into a stale-anchor repair.'
    case 'repair-clarify':
      if (previousFreshEncounter === 'utility-time')
        return localeIsZh ? '先承认刚才答偏了，再直接给出时间。' : 'Acknowledge the miss first, then give the time directly.'
      if (previousFreshEncounter === 'utility-date')
        return localeIsZh ? '先承认刚才答偏了，再直接给出日期。' : 'Acknowledge the miss first, then give the date directly.'
      if (previousFreshEncounter === 'capability')
        return localeIsZh ? '先纠偏，再把我能做什么直接说清。' : 'Correct the drift, then state the capability surface directly.'
      if (previousFreshEncounter === 'identity')
        return localeIsZh ? '先纠偏，再直接回答我是谁。' : 'Correct the drift, then answer who I am directly.'
      return localeIsZh
        ? '先承认刚才没贴住你，再直接回到这一句。'
        : 'Acknowledge the drift first, then come straight back to this turn.'
    case 'follow-up':
      return localeIsZh
        ? '沿同一条线程继续，把还欠着的那部分补上。'
        : 'Stay on the same thread and fill in the missing part.'
    case 'dialogue':
      return localeIsZh
        ? '贴着这一句直接回应，不把话题扯开。'
        : 'Reply right on this turn without drifting away from it.'
  }
}

const fastPathCapabilityList = [
  '继续对话',
  '看上下文',
  '跑 CLI',
  '改代码',
  '接工具和记忆',
]

function resolveGreetingSalutation(text: string) {
  const normalizedCompact = normalizeCompactTurnText(text, 120)
  return normalizedCompact.includes('早上好') || normalizedCompact.includes('早安')
    ? '早上好'
    : normalizedCompact.includes('中午好')
      ? '中午好'
      : normalizedCompact.includes('下午好')
        ? '下午好'
        : normalizedCompact.includes('晚上好') || normalizedCompact.includes('晚安')
          ? '晚上好'
        : countCjkChars(text) > 0
            ? '你好'
            : 'Hello'
}

function buildGreetingMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceGreetingMove {
  const salutation = resolveGreetingSalutation(decision.latestUserText)
  return {
    kind: 'greeting',
    salutation,
    continuityAnchor: null,
    presenceCheck: /在吗|在嘛/u.test(decision.latestUserText),
  }
}

function buildIdentityMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceIdentityMove {
  const identityReconfirmation = decision.reasonCodes.includes('identity-reconfirmation')
  return {
    kind: 'identity',
    name: resolvePersonaDisplayName(decision.personaKernel),
    askedLabel: decision.latestUserText,
    repeated: identityReconfirmation,
    continuityAnchor: identityReconfirmation
      ? sanitizeText(decision.previousUserText || decision.continuityAnchor, 120) || null
      : null,
  }
}

function buildCapabilityMove(): AlicizationMindSurfaceCapabilityMove {
  return {
    kind: 'capability',
    capabilities: fastPathCapabilityList,
    continuityAnchor: null,
  }
}

function buildPresenceCritiqueMove(): AlicizationMindSurfacePresenceRepairMove {
  return {
    kind: 'presence-repair',
  }
}

function buildLocalClockSnapshot(text: string, preferredTimeZone?: string): AlicizationMindSurfaceClockSnapshot {
  const now = new Date()
  const resolvedFromContext = resolveUserRegionTimeZone()
  const preferred = sanitizeText(preferredTimeZone, 96)
  const timeZone = [preferred, resolvedFromContext]
    .find(candidate => isValidIanaTimeZone(candidate)) || 'UTC'
  const prefersChinese = countCjkChars(text) > 0
  if (prefersChinese) {
    return {
      language: 'zh' as const,
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
    language: 'en' as const,
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

function buildUtilityTimeMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceTimeMove {
  return {
    kind: 'local-time',
    clock: buildLocalClockSnapshot(decision.latestUserText, decision.resolvedTimeZone),
  }
}

function buildUtilityDateMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceDateMove {
  return {
    kind: 'local-date',
    clock: buildLocalClockSnapshot(decision.latestUserText, decision.resolvedTimeZone),
  }
}

function buildFollowUpMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceFollowUpMove {
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  const remainingLike = /(?:另外|还有|剩下|其余|后面|哪几项|哪四项|rest|remaining|what else|other)/iu.test(decision.latestUserText)
  if (continuityCheckPattern.test(decision.latestUserText) && previousFreshEncounter === 'identity') {
    return {
      kind: 'follow-up',
      variant: 'identity-confirm',
      anchor: decision.continuityAnchor || decision.previousUserText,
    }
  }
  if (remainingLike) {
    return {
      kind: 'follow-up',
      variant: 'remaining',
      anchor: decision.continuityAnchor || decision.previousUserText,
    }
  }
  return {
    kind: 'follow-up',
    variant: 'continue',
    anchor: decision.continuityAnchor || decision.previousUserText,
  }
}

function buildRepairClarifyMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceRepairMove {
  const previousFreshEncounter = deriveFreshEncounterKind(decision.previousUserText)
  if (previousFreshEncounter === 'utility-time') {
    return {
      kind: 'repair',
      target: 'time',
      clock: buildLocalClockSnapshot(
        decision.previousUserText || decision.latestUserText,
        decision.resolvedTimeZone,
      ),
    }
  }

  if (previousFreshEncounter === 'utility-date') {
    return {
      kind: 'repair',
      target: 'date',
      clock: buildLocalClockSnapshot(
        decision.previousUserText || decision.latestUserText,
        decision.resolvedTimeZone,
      ),
    }
  }

  if (previousFreshEncounter === 'capability') {
    return {
      kind: 'repair',
      target: 'capability',
      capabilities: fastPathCapabilityList,
    }
  }

  return {
    kind: 'repair',
    target: 'dialogue',
    anchor: decision.previousUserText || decision.continuityAnchor,
  }
}

function buildDialogueMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceMove {
  if (isPresenceCritiqueTurn(decision.latestUserText))
    return buildPresenceCritiqueMove()

  return {
    kind: 'dialogue',
    focus: decision.latestUserText,
    continuityAnchor: decision.continuityAnchor,
  }
}

function buildPresentStateMove(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfacePresentStateMove {
  const threadSummary = sanitizeText(
    decision.continuityAnchor
    || humanizeMirrorSummary(decision.sessionMirror?.executionSummary)
    || humanizeMirrorSummary(decision.sessionMirror?.dialogueSummary)
    || humanizeMirrorSummary(decision.runtimeDigest?.activeLoop?.summary),
    120,
  )

  return {
    kind: 'present-state',
    threadSummary: threadSummary || null,
  }
}

function buildDecisionLocalMoves(decision: AlicizationActiveDialogueFastPathDecision): AlicizationMindSurfaceMove[] {
  switch (decision.lane) {
    case 'greeting':
      return [buildGreetingMove(decision)]
    case 'identity':
      return [buildIdentityMove(decision)]
    case 'capability':
      return [buildCapabilityMove()]
    case 'utility-time':
      return [buildUtilityTimeMove(decision)]
    case 'utility-date':
      return [buildUtilityDateMove(decision)]
    case 'presence-critique':
      return [buildPresenceCritiqueMove()]
    case 'present-state':
      return [buildPresentStateMove(decision)]
    case 'repair-clarify':
      return [buildRepairClarifyMove(decision)]
    case 'follow-up':
      return [buildFollowUpMove(decision)]
    case 'dialogue':
      return [buildDialogueMove(decision)]
  }
}

function buildExecutionRecoveryReply(input: {
  latestUserText: string
  previousUserText: string
  sessionMirror?: AlicizationDialogueSessionMirror | null
  runtimeDigest?: AlicizationRuntimeDigest | null
}) {
  const anchor = quoteExcerpt(
    sanitizeText(input.latestUserText, 96)
      || sanitizeText(input.previousUserText, 96)
      || humanizeMirrorSummary(input.sessionMirror?.executionSummary)
      || humanizeMirrorSummary(input.runtimeDigest?.activeLoop?.summary),
    72,
  )
  const reply = anchor
    ? `如果还是 ${anchor} 这件事，你要我重新执行，还是把结果补全，我都直接接着做。`
    : '如果还是刚才那件事，你要我重新执行，还是把结果补全，我都直接接着做。'
  const decision = {
    lane: 'follow-up',
    strategy: 'local-only',
    timeoutMs: 0,
    resolvedTimeZone: resolveUserRegionTimeZone(),
    latestUserText: input.latestUserText,
    previousUserText: input.previousUserText,
    previousAssistantText: '',
    continuityAnchor: sanitizeText(input.latestUserText || input.previousUserText, 96),
    runtimeDigest: input.runtimeDigest ?? null,
    sessionMirror: input.sessionMirror ?? null,
    governance: null,
    personaKernel: null,
    reasonCodes: ['execution-recovery'],
  } satisfies AlicizationActiveDialogueFastPathDecision
  return buildAlicizationActiveDialogueGovernedReply({
    decision,
    moves: [
      {
        kind: 'direct-reply',
        text: reply,
      },
    ],
    delivery: 'firm',
  })
}

export function buildAlicizationActiveDialogueGovernedReply(input: {
  decision: AlicizationActiveDialogueFastPathDecision
  reply?: string
  moves?: AlicizationMindSurfaceMove[]
  thought?: string
  emotion?: string
  delivery?: string
  suppressGovernedLead?: boolean
}) {
  const governance = buildFastPathGovernance(input.decision)
  const governedThought = buildFastPathGovernedThought(input.decision, governance)
  const moves = input.moves?.length
    ? input.moves
    : input.reply
      ? [{
          kind: 'direct-reply',
          text: sanitizeText(input.reply, 320),
        } satisfies AlicizationMindSurfaceMove]
      : buildDecisionLocalMoves(input.decision)

  return buildAlicizationMindSurfaceStructuredReply({
    governance,
    userText: input.decision.latestUserText,
    previousAssistantText: input.decision.previousAssistantText,
    moves,
    thought: !runtimeMetaLeakPattern.test(sanitizeText(input.thought, 220))
      ? sanitizeText(input.thought, 220) || governedThought
      : governedThought,
    emotion: input.emotion,
    delivery: input.delivery,
    suppressGovernedLead: input.suppressGovernedLead,
  })
}

function buildDecisionLocalReply(decision: AlicizationActiveDialogueFastPathDecision) {
  return buildAlicizationActiveDialogueGovernedReply({
    decision,
    moves: buildDecisionLocalMoves(decision),
    suppressGovernedLead: true,
  })
}

function normalizeCompactReplyPayload(
  raw: string,
  decision: AlicizationActiveDialogueFastPathDecision,
) {
  const normalizedRaw = sanitizeText(raw, 2_000)
  if (!normalizedRaw)
    return buildDecisionLocalReply(decision)

  const parsed = parseJsonObjectFromText(normalizedRaw)
  if (parsed) {
    const reply = sanitizeText(parsed.reply, 320)
    if (!reply || runtimeMetaLeakPattern.test(reply) || legacyTemplateShellPattern.test(reply))
      return buildDecisionLocalReply(decision)

    return buildAlicizationActiveDialogueGovernedReply({
      decision,
      reply,
      thought: sanitizeText(parsed.thought, 220),
      emotion: sanitizeText(parsed.emotion, 24),
      delivery: sanitizeText((parsed.performance as { delivery?: unknown } | undefined)?.delivery, 24),
    })
  }

  if (runtimeMetaLeakPattern.test(normalizedRaw) || legacyTemplateShellPattern.test(normalizedRaw))
    return buildDecisionLocalReply(decision)
  return buildAlicizationActiveDialogueGovernedReply({
    decision,
    reply: normalizedRaw,
  })
}

export function deriveAlicizationActiveDialogueFastPathDecision(
  input: AlicizationActiveDialogueFastPathInput,
): AlicizationActiveDialogueFastPathDecision | null {
  const conversationMessages = normalizeConversationMessages(input.conversationMessages)
  const latestUserText = readLatestUserText(conversationMessages)
  if (!latestUserText)
    return null

  const actionKind = input.prepared.runtimeSurface.action?.kind ?? null
  const runtimeBlocked = (
    input.prepared.waitForTools
    || actionKind === 'execute'
    || actionKind === 'continue-task'
    || actionKind === 'inspect'
    || input.prepared.hasVisualGrounding
  )
  const localDeterministicEncounter = deriveFreshEncounterKind(latestUserText)
  const realtimeIntent = detectAlicizationRealtimeQueryIntent(latestUserText)
  if (realtimeIntent.needsRealtime && !localDeterministicEncounter)
    return null
  if (runtimeBlocked && !localDeterministicEncounter) {
    return null
  }

  const previousUserText = readPreviousUserText(conversationMessages)
  const previousAssistantText = readPreviousAssistantText(conversationMessages)
  const preparedExecutionCarryText = readPreparedExecutionLedgerCarryText(input.prepared.messages)
  const runtimeDigest = input.runtimeDigest ?? null
  const sessionMirror = input.prepared.sessionMirror ?? null
  const continuityAnchor = resolveContinuityAnchor({
    previousUserText,
    previousAssistantText,
    runtimeDigest,
    sessionMirror,
  })
  const governance = input.prepared.governance ?? input.prepared.runtimeSurface.governance ?? null
  const shortTurn = isShortDialogueTurn(latestUserText)
  const dialogueFirst = looksLikeDialogueFirst(governance)
  const hasContinuity = Boolean(previousUserText || previousAssistantText || sessionMirror)
  const encounter = deriveAlicizationActiveDialogueEncounter({
    latestUserText,
    previousUserText,
    previousAssistantText,
    continuityAnchor,
    preparedExecutionCarryText,
    runtimeDigest,
    sessionMirror,
    governance,
    shortTurn,
    dialogueFirst,
    hasContinuity,
  })
  if (!encounter)
    return null

  return {
    lane: encounter.kind,
    strategy: encounter.strategy,
    timeoutMs: encounter.timeoutMs,
    resolvedTimeZone: resolveUserRegionTimeZone(input.prepared.messages),
    latestUserText,
    previousUserText,
    previousAssistantText,
    continuityAnchor,
    runtimeDigest,
    sessionMirror,
    governance,
    personaKernel: input.prepared.personaKernel ?? null,
    reasonCodes: runtimeBlocked
      ? [...encounter.reasonCodes, 'runtime-blocked-local-override']
      : encounter.reasonCodes,
  }
}

export function buildAlicizationActiveDialogueFastPathMessages(input: {
  conversationMessages: Message[]
  decision: AlicizationActiveDialogueFastPathDecision
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const recentConversationMessages = normalizeConversationMessages(input.conversationMessages).slice(-6)
  const hostName = sanitizeText(input.prepared.personaKernel?.profile.hostName, 48)
    || extractHostNameFromMessages(input.prepared.messages)
  const customDirectives = sanitizeText(
    extractCustomDirectivesFromMessages(input.prepared.messages),
    320,
  )

  const systemBlocks = [
    alicizationFixedCoreSystemInstruction,
    alicizationFixedStructuredContractAnchor,
    buildCompactPersonaProfileBlock(input.prepared.personaKernel),
    hostName
      ? renderAlicizationPromptTemplate(alicizationFixedHostNameDirectiveTemplate, { hostName })
      : '',
    customDirectives
      ? `[ALICIZATION_CARD_DIRECTIVES_COMPACT]\n${customDirectives}`
      : '',
    buildCompactDialogueContextBlock(input.decision),
    buildCompactDialogueGovernanceBlock(input.decision),
  ]
    .filter(Boolean)
    .map(content => ({
      role: 'system',
      content,
    }) as Message)

  return [
    ...systemBlocks,
    ...recentConversationMessages,
  ]
}

export function buildAlicizationActiveDialogueFallbackReply(
  input: AlicizationActiveDialogueReplyInput,
) {
  const normalizedConversationMessages = normalizeConversationMessages(input.conversationMessages)
  const latestUserText = readLatestUserText(normalizedConversationMessages)
  const previousUserText = readPreviousUserText(normalizedConversationMessages)
  if (input.actionKind === 'execute' || input.actionKind === 'continue-task') {
    return buildExecutionRecoveryReply({
      latestUserText,
      previousUserText,
      runtimeDigest: input.runtimeDigest ?? null,
      sessionMirror: input.sessionMirror ?? null,
    })
  }

  const preparedLike = {
    waitForTools: false,
    hasVisualGrounding: false,
    governance: input.governance ?? null,
    personaKernel: input.personaKernel ?? null,
    sessionMirror: input.sessionMirror ?? null,
    runtimeSurface: {
      action: input.actionKind ? { kind: input.actionKind } : null,
      governance: input.governance ?? null,
    },
  } as AlicizationPreparedMainChatExecutionResult
  const decision = deriveAlicizationActiveDialogueFastPathDecision({
    conversationMessages: normalizedConversationMessages,
    prepared: preparedLike,
    runtimeDigest: input.runtimeDigest ?? null,
  }) ?? {
    lane: 'dialogue',
    strategy: 'local-only',
    timeoutMs: 0,
    resolvedTimeZone: resolveUserRegionTimeZone(normalizedConversationMessages),
    latestUserText,
    previousUserText,
    previousAssistantText: readPreviousAssistantText(normalizedConversationMessages),
    continuityAnchor: resolveContinuityAnchor({
      previousUserText,
      previousAssistantText: readPreviousAssistantText(normalizedConversationMessages),
      runtimeDigest: input.runtimeDigest ?? null,
      sessionMirror: input.sessionMirror ?? null,
    }),
    runtimeDigest: input.runtimeDigest ?? null,
    sessionMirror: input.sessionMirror ?? null,
    governance: input.governance ?? null,
    personaKernel: input.personaKernel ?? null,
    reasonCodes: ['local-recovery'],
  } satisfies AlicizationActiveDialogueFastPathDecision

  return buildDecisionLocalReply(decision)
}

export function normalizeAlicizationActiveDialogueFastPathReply(input: {
  decision: AlicizationActiveDialogueFastPathDecision
  rawText: string
}) {
  return normalizeCompactReplyPayload(input.rawText, input.decision)
}
