export type AlicizationRealtimeQueryCategory = 'news' | 'weather' | 'finance' | 'sports'

export interface AlicizationRealtimeQueryIntent {
  needsRealtime: boolean
  hasTimeSignal: boolean
  categories: AlicizationRealtimeQueryCategory[]
}

const realtimeTimeSignalPattern = /今天|今日|最新|最近|实时|即刻|刚刚|当前|近期|now|today|latest|recent|real[\s-]?time|current|breaking|this\s+(?:week|month)/i

const realtimeCategoryPatterns: Record<AlicizationRealtimeQueryCategory, RegExp> = {
  news: /新闻|时事|头条|快讯|事件|发生了什么|发生什么|news|headline|current events?|what happened|breaking/i,
  weather: /天气|气温|温度|降雨|风速|forecast|weather|temperature|humidity|rain|snow/i,
  finance: /股价|行情|汇率|外汇|币价|市值|指数|finance|market|stocks?|shares?|crypto|btc|eth|nasdaq|dow|s&p|forex|ticker|quote/i,
  sports: /比赛|比分|赛程|战绩|体育|sports?|scores?|match|game|fixture|standings|nba|nfl|mlb|nhl|epl|fifa|ucl/i,
}

const locationLeadNoisePatterns = [
  /^(?:请(?:你|帮我|帮忙)?|麻烦你?|想请你|能不能|可以(?:帮我|帮忙)?|我想知道|想知道)\s*/u,
  /^(?:帮我|帮忙|给我|替我)\s*/u,
  /^(?:查(?:一下|下|查)?|看(?:一下|下|看)?|搜(?:一下|下)?|找(?:一下|下)?|确认一下|告诉我|说说|问(?:一下|下)?|报一下)\s*/u,
  /^(?:现在|当前|今天|今日|这会儿|此刻)\s*/u,
]

const locationTailNoisePatterns = [
  /[\s,，。！？、;；:：]+$/u,
  /(?:现在|当前|今天|今日|这会儿|此刻)$/u,
  /(?:的|这边|那边|这里|那里)$/u,
  /(?:天气情况|天气状况|情况|状况|怎么样|如何|[呢呀啊吗吧])$/u,
]

function pushCategory(categories: AlicizationRealtimeQueryCategory[], category: AlicizationRealtimeQueryCategory) {
  if (!categories.includes(category))
    categories.push(category)
}

export function normalizeAlicizationUtilityQueryText(raw: string) {
  return raw.replace(/\s+/g, ' ').trim()
}

export function hasAlicizationRealtimeTimeSignal(message: string) {
  return realtimeTimeSignalPattern.test(normalizeAlicizationUtilityQueryText(message))
}

export function detectAlicizationRealtimeQueryIntent(message: string): AlicizationRealtimeQueryIntent {
  const normalized = normalizeAlicizationUtilityQueryText(message)
  if (!normalized) {
    return {
      needsRealtime: false,
      hasTimeSignal: false,
      categories: [],
    }
  }

  const categories: AlicizationRealtimeQueryCategory[] = []
  const hasTimeSignal = hasAlicizationRealtimeTimeSignal(normalized)

  if (realtimeCategoryPatterns.weather.test(normalized))
    pushCategory(categories, 'weather')
  if (realtimeCategoryPatterns.finance.test(normalized))
    pushCategory(categories, 'finance')
  if (realtimeCategoryPatterns.sports.test(normalized))
    pushCategory(categories, 'sports')
  if (realtimeCategoryPatterns.news.test(normalized))
    pushCategory(categories, 'news')

  const hasAlwaysRealtimeCategory = categories.some(category => category !== 'news')
  return {
    needsRealtime: categories.length > 0 && (hasAlwaysRealtimeCategory || categories.includes('news') || hasTimeSignal),
    hasTimeSignal,
    categories,
  }
}

function stripRepeatedPatterns(input: string, patterns: readonly RegExp[]) {
  let output = input.trim()
  let changed = true
  while (changed && output) {
    changed = false
    for (const pattern of patterns) {
      const next = output.replace(pattern, '').trim()
      if (next !== output) {
        output = next
        changed = true
      }
    }
  }
  return output
}

function sanitizeLocationCandidate(raw: string) {
  const normalized = normalizeAlicizationUtilityQueryText(raw)
  if (!normalized)
    return ''

  const strippedLead = stripRepeatedPatterns(normalized, locationLeadNoisePatterns)
  const strippedTail = stripRepeatedPatterns(strippedLead, locationTailNoisePatterns)
  if (!strippedTail)
    return ''

  const compactChinese = strippedTail.replace(/\s+/g, '')
  if (/[\u4E00-\u9FFF]/u.test(compactChinese))
    return compactChinese

  return strippedTail
}

function findLocationPrefixBeforeKeywords(
  normalized: string,
  categories: AlicizationRealtimeQueryCategory[],
) {
  let bestIndex = Number.POSITIVE_INFINITY
  for (const category of categories) {
    const match = realtimeCategoryPatterns[category].exec(normalized)
    if (!match || match.index < 0)
      continue
    bestIndex = Math.min(bestIndex, match.index)
  }

  if (!Number.isFinite(bestIndex))
    return ''
  return normalized.slice(0, bestIndex)
}

export function extractAlicizationLocationFromQuery(
  query: string,
  categories: AlicizationRealtimeQueryCategory[] = ['weather', 'news'],
) {
  const normalized = normalizeAlicizationUtilityQueryText(query)
  if (!normalized)
    return ''

  if (/美国|usa|united states/i.test(normalized))
    return 'United States'
  if (/中国|china/i.test(normalized))
    return 'China'
  if (/日本|japan/i.test(normalized))
    return 'Japan'

  const inMatch = /\b(?:in|for)\s+([A-Z][A-Z\s.-]{1,40})\b/i.exec(normalized)
  if (inMatch?.[1])
    return normalizeAlicizationUtilityQueryText(inMatch[1])

  const prefix = findLocationPrefixBeforeKeywords(normalized, categories)
  const sanitizedPrefix = sanitizeLocationCandidate(prefix)
  if (sanitizedPrefix)
    return sanitizedPrefix

  return ''
}
