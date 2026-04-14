import type { McpToolDescriptor } from '../stores/mcp-tool-bridge'

import {
  detectAlicizationRealtimeQueryIntent,
  type AlicizationRealtimeQueryCategory,
  type AlicizationRealtimeQueryIntent,
} from '@proj-alicization/stage-shared'

export type RealtimeQueryCategory = AlicizationRealtimeQueryCategory
export type RealtimeQueryIntent = AlicizationRealtimeQueryIntent

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

const toolCategoryMatchers: Record<RealtimeQueryCategory, RegExp> = {
  news: /(?:news|headline|events?|current[_\s-]?events?|breaking|资讯|新闻|时事|头条)/i,
  weather: /(?:weather|forecast|temperature|climate|humidity|rain|snow|气象|天气|温度)/i,
  finance: /(?:finance|market|stock|quote|price|crypto|forex|exchange|ticker|currency|行情|股价|汇率)/i,
  sports: /(?:sports?|score|match|game|fixture|standings|nba|nfl|mlb|nhl|epl|赛程|比分|体育)/i,
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
  return detectAlicizationRealtimeQueryIntent(message)
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
