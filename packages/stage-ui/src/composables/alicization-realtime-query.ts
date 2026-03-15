import type { McpToolDescriptor } from '../stores/mcp-tool-bridge'

export type RealtimeQueryCategory = 'news' | 'weather' | 'finance' | 'sports'

export interface RealtimeQueryIntent {
  needsRealtime: boolean
  hasTimeSignal: boolean
  categories: RealtimeQueryCategory[]
}

export type RealtimePreflightReason
  = | 'not-realtime'
    | 'list-tools-timeout'
    | 'list-tools-error'
    | 'no-tools'
    | 'missing-category'
    | 'ok'

export interface RealtimeQueryPreflightResult {
  allowed: boolean
  reason: RealtimePreflightReason
  categories: RealtimeQueryCategory[]
  matchedCategories: RealtimeQueryCategory[]
  availableToolCount: number
}

const realtimeTimeSignalPattern = /今天|今日|最新|最近|实时|即刻|刚刚|当前|近期|now|today|latest|recent|real[\s-]?time|current|breaking|this\s+(?:week|month)/i
const realtimeNewsPattern = /新闻|时事|头条|快讯|事件|发生了什么|发生什么|news|headline|current events?|what happened|breaking/i
const realtimeWeatherPattern = /天气|气温|温度|降雨|风速|forecast|weather|temperature|humidity|rain|snow/i
const realtimeFinancePattern = /股价|行情|汇率|外汇|币价|市值|指数|finance|market|stocks?|shares?|crypto|btc|eth|nasdaq|dow|s&p|forex|ticker|quote/i
const realtimeSportsPattern = /比赛|比分|赛程|战绩|体育|sports?|scores?|match|game|fixture|standings|nba|nfl|mlb|nhl|epl|fifa|ucl/i

const toolCategoryMatchers: Record<RealtimeQueryCategory, RegExp> = {
  news: /(?:news|headline|events?|current[_\s-]?events?|breaking|资讯|新闻|时事|头条)/i,
  weather: /(?:weather|forecast|temperature|climate|humidity|rain|snow|气象|天气|温度)/i,
  finance: /(?:finance|market|stock|quote|price|crypto|forex|exchange|ticker|currency|行情|股价|汇率)/i,
  sports: /(?:sports?|score|match|game|fixture|standings|nba|nfl|mlb|nhl|epl|赛程|比分|体育)/i,
}

function pushCategory(categories: RealtimeQueryCategory[], category: RealtimeQueryCategory) {
  if (!categories.includes(category)) {
    categories.push(category)
  }
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number, timeoutReason: RealtimePreflightReason): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(timeoutReason), { reason: timeoutReason }))
    }, Math.max(1, timeoutMs))

    task.then((result) => {
      if (timer)
        clearTimeout(timer)
      resolve(result)
    }).catch((error) => {
      if (timer)
        clearTimeout(timer)
      reject(error)
    })
  })
}

function matchCategoryWithTool(category: RealtimeQueryCategory, tool: McpToolDescriptor) {
  const signal = `${tool.name} ${tool.toolName} ${tool.description ?? ''}`
  return toolCategoryMatchers[category].test(signal)
}

export function detectRealtimeQueryIntent(message: string): RealtimeQueryIntent {
  const normalized = message.trim()
  if (!normalized) {
    return {
      needsRealtime: false,
      hasTimeSignal: false,
      categories: [],
    }
  }

  const categories: RealtimeQueryCategory[] = []
  const hasTimeSignal = realtimeTimeSignalPattern.test(normalized)

  if (realtimeWeatherPattern.test(normalized))
    pushCategory(categories, 'weather')
  if (realtimeFinancePattern.test(normalized))
    pushCategory(categories, 'finance')
  if (realtimeSportsPattern.test(normalized))
    pushCategory(categories, 'sports')

  const hasNewsSignal = realtimeNewsPattern.test(normalized)
  if (hasNewsSignal)
    pushCategory(categories, 'news')

  const hasAlwaysRealtimeCategory = categories.some(category => category !== 'news')
  const needsRealtime = categories.length > 0 && (hasAlwaysRealtimeCategory || hasNewsSignal || hasTimeSignal)

  return {
    needsRealtime,
    hasTimeSignal,
    categories,
  }
}

export function evaluateRealtimeQueryToolCoverage(intent: RealtimeQueryIntent, tools: McpToolDescriptor[]): RealtimeQueryPreflightResult {
  if (!intent.needsRealtime) {
    return {
      allowed: true,
      reason: 'not-realtime',
      categories: intent.categories,
      matchedCategories: [],
      availableToolCount: tools.length,
    }
  }

  if (tools.length === 0) {
    return {
      allowed: false,
      reason: 'no-tools',
      categories: intent.categories,
      matchedCategories: [],
      availableToolCount: 0,
    }
  }

  const matchedCategories = intent.categories.filter(category => tools.some(tool => matchCategoryWithTool(category, tool)))
  if (matchedCategories.length === 0) {
    return {
      allowed: false,
      reason: 'missing-category',
      categories: intent.categories,
      matchedCategories,
      availableToolCount: tools.length,
    }
  }

  return {
    allowed: true,
    reason: 'ok',
    categories: intent.categories,
    matchedCategories,
    availableToolCount: tools.length,
  }
}

export async function runRealtimeQueryPreflight(input: {
  intent: RealtimeQueryIntent
  listTools: () => Promise<McpToolDescriptor[]>
  timeoutMs?: number
}): Promise<RealtimeQueryPreflightResult> {
  if (!input.intent.needsRealtime) {
    return {
      allowed: true,
      reason: 'not-realtime',
      categories: input.intent.categories,
      matchedCategories: [],
      availableToolCount: 0,
    }
  }

  try {
    const tools = await withTimeout(
      input.listTools(),
      input.timeoutMs ?? 1500,
      'list-tools-timeout',
    )
    return evaluateRealtimeQueryToolCoverage(input.intent, tools)
  }
  catch (error) {
    const reason = (error as { reason?: RealtimePreflightReason })?.reason
    if (reason === 'list-tools-timeout') {
      return {
        allowed: false,
        reason,
        categories: input.intent.categories,
        matchedCategories: [],
        availableToolCount: 0,
      }
    }

    return {
      allowed: false,
      reason: 'list-tools-error',
      categories: input.intent.categories,
      matchedCategories: [],
      availableToolCount: 0,
    }
  }
}
