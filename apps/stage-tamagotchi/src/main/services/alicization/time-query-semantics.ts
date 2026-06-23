import { extractExplicitUserTimeZoneFromText } from './time-zone-governor'

function sanitizeText(raw: unknown, maxChars = 220) {
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

const zhUtilityTimePattern = /^(?:现在|这会儿|此刻)?(?:几点钟?了?|几时了?|时间(?:是多少|是啥|是什么|呢)?|现在时间|当前时间)$/u
const enUtilityTimePattern = /^(?:what(?:'s| is)? the time(?: now)?|time now|current time)$/iu
const zhUtilityDatePattern = /^(?:(?:今天|现在)?(?:几号|多少号|几月几号|几月几日|星期几|周几|礼拜几|什么日期|日期是什么)|今天是几号|今天星期几|今天周几|今天礼拜几)$/u
const enUtilityDatePattern = /^(?:what(?:'s| is)? the date(?: today)?|what day is it(?: today)?|today'?s date|current date)$/iu
const zhTimeZoneMentionPattern = /时区|北京时间|东八区|中国时间|上海时间|东京时间|日本时间|纽约时间|洛杉矶时间|伦敦时间|utc|gmt/iu
const enTimeZoneMentionPattern = /time[\s-]?zone|beijing time|tokyo time|new york time|los angeles time|london time|utc|gmt/iu
const zhTimeZoneQuestionPattern = /(?:哪个|什么|现在用的是|当前用的是|按的是|你在用什么|你现在按什么|现在是什么).{0,8}时区|时区.{0,8}(?:是什么|是啥|是多少|是哪一个|呢)|(?:北京时间|中国时间|上海时间|东京时间|日本时间|纽约时间|洛杉矶时间|伦敦时间).{0,8}(?:算哪边|属于哪边|是哪边|吗|么)/u
const enTimeZoneQuestionPattern = /(?:which|what).{0,12}time[\s-]?zone|time[\s-]?zone.{0,12}(?:are you using|is it|are you on)/iu
const zhTimeZoneWhyPattern = /(?:为什么|为啥|怎么|咋).*(?:时区|北京时间|东八区|中国时间|上海时间|东京时间|日本时间|纽约时间|洛杉矶时间|伦敦时间|utc|gmt)/iu
const enTimeZoneWhyPattern = /why.*(?:time[\s-]?zone|beijing time|tokyo time|new york time|los angeles time|london time|utc|gmt)/iu
const continuityCheckPattern = /^(?:你确定吗?|确定吗|真的吗|真的是这样吗|你认真的|are you sure|really|seriously)[?？]?$/iu
const utilityTimeReplyPattern = /现在是\s*\d{1,2}:\d{2}|it's\s*\d{1,2}:\d{2}|\d{1,2}:\d{2}[^。]*(?:星期|today|right now)/iu
const utilityDateReplyPattern = /今天是|today is|星期[一二三四五六日天]|monday|tuesday|wednesday|thursday|friday|saturday|sunday/iu
const zhNowTokens = ['现在', '当前', '这会儿', '此刻'] as const
const zhTimeCoreTokens = ['几点', '几点了', '几点啦', '几时', '时间', '现在时间', '当前时间'] as const
const zhDateCoreTokens = ['几号', '多少号', '几月几号', '几月几日', '日期', '什么日期', '今天几号', '今天星期几', '星期几', '周几', '礼拜几'] as const

export type AlicizationTimeQueryMode
  = | 'none'
    | 'time'
    | 'time-confirmation'
    | 'timezone'
    | 'timezone-why'
    | 'date'
    | 'date-confirmation'

export interface AlicizationTimeQueryIntent {
  mode: AlicizationTimeQueryMode
  explicitTimeZone: string
  mentionsTimeZone: boolean
}

export function resolveAlicizationTimeQueryIntent(input: {
  userTextRaw: unknown
  previousAssistantTextRaw?: unknown
}): AlicizationTimeQueryIntent {
  const userText = sanitizeText(input.userTextRaw, 320)
  const previousAssistantText = sanitizeText(input.previousAssistantTextRaw, 420)
  const normalizedLoose = normalizeTurnText(userText, 220)
  const normalizedCompact = normalizeCompactTurnText(userText, 220)
  const explicitTimeZone = extractExplicitUserTimeZoneFromText(userText)
  const mentionsTimeZone = zhTimeZoneMentionPattern.test(normalizedLoose) || enTimeZoneMentionPattern.test(normalizedLoose)
  const asksTimeZoneReason = zhTimeZoneWhyPattern.test(normalizedLoose) || enTimeZoneWhyPattern.test(normalizedLoose)
  const asksTimeZone = zhTimeZoneQuestionPattern.test(normalizedLoose) || enTimeZoneQuestionPattern.test(normalizedLoose)
  const asksDate = zhUtilityDatePattern.test(normalizedCompact)
    || enUtilityDatePattern.test(normalizedLoose)
    || includesAny(normalizedCompact, zhDateCoreTokens)
  const hasDateCore = includesAny(normalizedCompact, zhDateCoreTokens)
  const hasNowToken = includesAny(normalizedCompact, zhNowTokens)
  const hasTimeCore = includesAny(normalizedCompact, zhTimeCoreTokens)
  const asksTime = zhUtilityTimePattern.test(normalizedCompact)
    || enUtilityTimePattern.test(normalizedLoose)
    || (!hasDateCore && hasTimeCore && (hasNowToken || normalizedCompact === '几点' || normalizedCompact === '几点了' || normalizedCompact === '几点啦'))
    || Boolean(explicitTimeZone && hasTimeCore)

  if (continuityCheckPattern.test(normalizedLoose)) {
    if (utilityTimeReplyPattern.test(previousAssistantText)) {
      return {
        mode: 'time-confirmation',
        explicitTimeZone,
        mentionsTimeZone,
      }
    }

    if (utilityDateReplyPattern.test(previousAssistantText)) {
      return {
        mode: 'date-confirmation',
        explicitTimeZone,
        mentionsTimeZone,
      }
    }
  }

  if (asksTimeZoneReason) {
    return {
      mode: 'timezone-why',
      explicitTimeZone,
      mentionsTimeZone: true,
    }
  }

  if (asksTimeZone) {
    return {
      mode: 'timezone',
      explicitTimeZone,
      mentionsTimeZone: true,
    }
  }

  if (asksTime) {
    return {
      mode: 'time',
      explicitTimeZone,
      mentionsTimeZone,
    }
  }

  if (asksDate) {
    return {
      mode: 'date',
      explicitTimeZone,
      mentionsTimeZone,
    }
  }

  return {
    mode: 'none',
    explicitTimeZone,
    mentionsTimeZone,
  }
}
