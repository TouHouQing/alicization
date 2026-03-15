import type { RealtimeQueryCategory, RealtimeQueryIntent } from '../composables/alicization-realtime-query'
import type { AlicizationRealtimeCategory, AlicizationRealtimeExecuteResult } from './alicization-bridge'
import type { McpCallToolResult, McpCapabilitiesSnapshot, McpToolDescriptor } from './mcp-tool-bridge'

import { defineStore } from 'pinia'
import { ref } from 'vue'

import { detectRealtimeQueryIntent } from '../composables/alicization-realtime-query'
import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import { getMcpCapabilitiesSnapshot, getMcpToolBridge } from './mcp-tool-bridge'

export interface ExecutionStatusSlice {
  phase: 'planning' | 'tool-running' | 'tool-failed' | 'completed'
  label: string
  source?: 'builtin' | 'mcp'
  category?: RealtimeQueryCategory
}

export interface TurnToolEvidenceV2 {
  toolCallCount: number
  successCount: number
  failureCount: number
  verifiedToolResult: boolean
  sources: Array<'builtin' | 'mcp'>
}

export interface ExecutionTurnTrace {
  realtimeIntent: boolean
  categories: RealtimeQueryCategory[]
  planStartedAt: number
  planCompletedAt: number
  fallbackApplied: boolean
  capabilitySnapshotAt: number
  toolEvidence: TurnToolEvidenceV2
}

export interface CapabilitySnapshot {
  fetchedAt: number
  ttlMs: number
  builtin: Record<RealtimeQueryCategory, boolean>
  mcp: McpCapabilitiesSnapshot
}

interface RealtimeExecutionInput {
  origin: 'ui-user' | 'tool-output' | 'context-recall' | 'system'
  message: string
  abortSignal?: AbortSignal
  onStatus?: (status: ExecutionStatusSlice) => void
  onAudit?: (entry: {
    level: 'info' | 'notice' | 'warning' | 'critical'
    category: string
    action: string
    message: string
    details?: Record<string, unknown>
  }) => Promise<void>
}

interface RealtimeExecutionOutput {
  handled: boolean
  intent: RealtimeQueryIntent
  trace: ExecutionTurnTrace
  reply?: string
}

interface RealtimeEvidenceItem {
  category: RealtimeQueryCategory
  source: 'builtin' | 'mcp'
  summary: string
}

const capabilitySnapshotTtlMs = 30_000
const maxMcpToolsPerCategory = 2

const categoryLabelMap: Record<RealtimeQueryCategory, string> = {
  weather: '天气',
  news: '新闻',
  finance: '财经',
  sports: '体育',
}

const mcpCategoryMatchers: Record<RealtimeQueryCategory, RegExp> = {
  weather: /(?:weather|forecast|temperature|climate|humidity|rain|snow|气象|天气|温度)/i,
  news: /(?:news|headline|events?|current[_\s-]?events?|breaking|资讯|新闻|时事|头条)/i,
  finance: /(?:finance|market|stock|quote|price|crypto|forex|exchange|ticker|currency|行情|股价|汇率)/i,
  sports: /(?:sports?|score|match|game|fixture|standings|nba|nfl|mlb|nhl|epl|赛程|比分|体育)/i,
}

function normalizeText(raw: string) {
  return raw.replace(/\s+/g, ' ').trim()
}

function uniqueStrings(input: string[]) {
  return [...new Set(input.filter(Boolean))]
}

function extractLocation(message: string) {
  const normalized = normalizeText(message)
  if (!normalized)
    return ''
  if (/美国|usa|united states/i.test(normalized))
    return 'United States'
  if (/中国|china/i.test(normalized))
    return 'China'
  const match = /([A-Z\u4E00-\u9FFF][A-Z\u4E00-\u9FFF\s-]{1,30})的?(?:天气|新闻|时事|events?|forecast|weather)/i.exec(normalized)
  return normalizeText(match?.[1] ?? '')
}

function extractTicker(message: string) {
  const normalized = normalizeText(message)
  const aliasMap: Record<string, string> = {
    比特币: 'BTC',
    以太坊: 'ETH',
    苹果: 'AAPL',
    特斯拉: 'TSLA',
    英伟达: 'NVDA',
    微软: 'MSFT',
  }
  for (const [alias, ticker] of Object.entries(aliasMap)) {
    if (normalized.includes(alias))
      return ticker
  }
  const matches = normalized.match(/\b[A-Z]{2,6}\b/g) ?? []
  return matches[0] ?? ''
}

function extractLeague(message: string) {
  const normalized = normalizeText(message).toLowerCase()
  if (/\bnba\b|篮球|湖人|勇士/.test(normalized))
    return 'nba'
  if (/\bnfl\b|橄榄球/.test(normalized))
    return 'nfl'
  if (/\bmlb\b|棒球/.test(normalized))
    return 'mlb'
  if (/\bnhl\b|冰球/.test(normalized))
    return 'nhl'
  if (/\bepl\b|英超|premier league/.test(normalized))
    return 'epl'
  return ''
}

function extractTeam(message: string) {
  const normalized = normalizeText(message)
  const match = /([A-Z\u4E00-\u9FFF]{2,24})的?(?:比赛|赛程|比分)/i.exec(normalized)
  if (!match?.[1])
    return ''
  if (/今天|今日|最新|实时|当前/.test(match[1]))
    return ''
  return match[1]
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

function hasNonEmptyContent(content: unknown) {
  if (typeof content === 'string')
    return content.trim().length > 0

  if (Array.isArray(content)) {
    return content.some((item) => {
      if (typeof item === 'string')
        return item.trim().length > 0
      if (item && typeof item === 'object' && 'text' in item) {
        return String((item as { text?: unknown }).text ?? '').trim().length > 0
      }
      return Boolean(item && typeof item === 'object' && Object.keys(item).length > 0)
    })
  }

  if (content && typeof content === 'object')
    return Object.keys(content as Record<string, unknown>).length > 0

  return false
}

function hasVerifiedToolResultPayload(result: unknown) {
  if (!result)
    return false
  if (typeof result === 'string')
    return result.trim().length > 0

  if (Array.isArray(result))
    return hasNonEmptyContent(result)

  if (typeof result === 'object') {
    const data = result as Record<string, unknown>
    if (data.isError === true || data.ok === false)
      return false
    if (hasNonEmptyContent(data.content))
      return true
    if (hasNonEmptyContent(data.structuredContent))
      return true
    if (hasNonEmptyContent(data.toolResult))
      return true
    return false
  }

  return false
}

function summarizeMcpResult(tool: McpToolDescriptor, result: McpCallToolResult) {
  const fromContent = Array.isArray(result.content)
    ? result.content
        .map((item) => {
          if (item && typeof item === 'object' && 'text' in item)
            return String((item as { text?: unknown }).text ?? '')
          return ''
        })
        .filter(Boolean)
        .join('\n')
    : ''

  if (normalizeText(fromContent))
    return normalizeText(fromContent)

  if (result.structuredContent != null) {
    const payload = safeStringify(result.structuredContent)
    return `${tool.toolName} 返回结构化数据：${payload}`
  }

  if (result.toolResult != null) {
    const payload = safeStringify(result.toolResult)
    return `${tool.toolName} 返回结果：${payload}`
  }

  return `${tool.toolName} 已返回结果，但内容不可读。`
}

function matchToolsForCategory(tools: McpToolDescriptor[], category: RealtimeQueryCategory) {
  return tools
    .filter((tool) => {
      const signal = `${tool.name} ${tool.toolName} ${tool.description ?? ''}`
      return mcpCategoryMatchers[category].test(signal)
    })
    .slice(0, maxMcpToolsPerCategory)
}

function buildMcpArgumentCandidates(category: RealtimeQueryCategory, message: string) {
  const location = extractLocation(message)
  const ticker = extractTicker(message)
  const league = extractLeague(message)
  const team = extractTeam(message)

  const candidates: Array<Record<string, unknown>> = []
  if (category === 'weather') {
    candidates.push({ location })
    candidates.push({ q: location })
  }
  else if (category === 'news') {
    candidates.push({ location, query: message })
    candidates.push({ query: message })
  }
  else if (category === 'finance') {
    if (ticker) {
      candidates.push({ ticker })
      candidates.push({ symbol: ticker })
    }
  }
  else if (category === 'sports') {
    if (league || team) {
      candidates.push({ league, team })
      candidates.push({ team })
    }
  }

  const normalized = uniqueStrings(candidates.map(candidate => safeStringify(candidate)))
  return normalized.map(item => JSON.parse(item) as Record<string, unknown>)
}

function realtimeFailureReplyFromCategory(category: RealtimeQueryCategory) {
  if (category === 'finance')
    return '当前无法获取可靠的财经实时数据。请补充 ticker（例如 AAPL、TSLA、BTC）后重试。'
  if (category === 'sports')
    return '当前无法获取可靠的体育实时数据。请补充联赛（例如 NBA/NFL/MLB/NHL/EPL）或球队后重试。'
  if (category === 'weather')
    return '当前无法获取可靠的实时天气数据。请补充城市或国家后重试。'
  return '当前无法获取可靠的实时新闻数据。请稍后重试，或检查 MCP 实时工具状态。'
}

function composeRealtimeReply(input: {
  evidences: RealtimeEvidenceItem[]
  failed: RealtimeQueryCategory[]
}) {
  if (input.evidences.length === 0) {
    if (input.failed.length > 0) {
      return realtimeFailureReplyFromCategory(input.failed[0]!)
    }
    return '当前无法获取可靠的实时外部数据。请稍后重试，或在设置里检查 MCP 实时工具是否可用。'
  }

  const sections = input.evidences.map((item) => {
    const prefix = `${categoryLabelMap[item.category]}（${item.source === 'builtin' ? '内置源' : 'MCP'}）`
    return `${prefix}：${item.summary}`
  })

  const failedHints = input.failed.length > 0
    ? `\n\n未完成类别：${input.failed.map(category => categoryLabelMap[category]).join('、')}（当前数据源不可用）`
    : ''

  return `${sections.join('\n\n')}${failedHints}`
}

async function safeAudit(
  callback: RealtimeExecutionInput['onAudit'],
  entry: {
    level: 'info' | 'notice' | 'warning' | 'critical'
    category: string
    action: string
    message: string
    details?: Record<string, unknown>
  },
) {
  if (!callback)
    return
  await callback(entry).catch(() => {})
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted)
    return

  throw signal.reason ?? new DOMException('Aborted', 'AbortError')
}

export const useAlicizationExecutionEngineStore = defineStore('alicization-execution-engine', () => {
  const capabilityCache = ref<CapabilitySnapshot | null>(null)
  const capabilityCacheExpireAt = ref(0)

  async function getCapabilitySnapshot(forceRefresh = false): Promise<CapabilitySnapshot> {
    const now = Date.now()
    if (!forceRefresh && capabilityCache.value && capabilityCacheExpireAt.value > now) {
      return capabilityCache.value
    }

    const fallback: McpCapabilitiesSnapshot = {
      path: '',
      updatedAt: now,
      servers: [],
      tools: [],
      healthyServers: 0,
    }
    const mcpSnapshot = await getMcpCapabilitiesSnapshot().catch(() => fallback)
    const snapshot: CapabilitySnapshot = {
      fetchedAt: now,
      ttlMs: capabilitySnapshotTtlMs,
      builtin: {
        weather: true,
        news: true,
        finance: true,
        sports: true,
      },
      mcp: mcpSnapshot,
    }

    capabilityCache.value = snapshot
    capabilityCacheExpireAt.value = now + capabilitySnapshotTtlMs
    return snapshot
  }

  async function executeRealtimeQueryTurn(input: RealtimeExecutionInput): Promise<RealtimeExecutionOutput> {
    throwIfAborted(input.abortSignal)
    const intent = detectRealtimeQueryIntent(input.origin === 'ui-user' ? input.message : '')
    const planStartedAt = Date.now()
    const trace: ExecutionTurnTrace = {
      realtimeIntent: intent.needsRealtime,
      categories: intent.categories,
      planStartedAt,
      planCompletedAt: planStartedAt,
      fallbackApplied: false,
      capabilitySnapshotAt: planStartedAt,
      toolEvidence: {
        toolCallCount: 0,
        successCount: 0,
        failureCount: 0,
        verifiedToolResult: false,
        sources: [],
      },
    }

    if (!intent.needsRealtime || input.origin !== 'ui-user' || !hasAlicizationBridge()) {
      return {
        handled: false,
        intent,
        trace,
      }
    }

    input.onStatus?.({
      phase: 'planning',
      label: '规划实时查询执行路径',
    })
    await safeAudit(input.onAudit, {
      level: 'notice',
      category: 'execution-engine',
      action: 'plan-start',
      message: 'Realtime execution plan started.',
      details: {
        categories: intent.categories,
      },
    })

    const capabilitySnapshot = await getCapabilitySnapshot()
    throwIfAborted(input.abortSignal)
    trace.capabilitySnapshotAt = capabilitySnapshot.fetchedAt
    const evidences: RealtimeEvidenceItem[] = []
    const failedCategories: RealtimeQueryCategory[] = []

    for (const category of intent.categories) {
      throwIfAborted(input.abortSignal)
      trace.toolEvidence.toolCallCount += 1
      input.onStatus?.({
        phase: 'tool-running',
        label: `调用${categoryLabelMap[category]}实时源`,
        source: 'builtin',
        category,
      })

      const builtinResult = await getAlicizationBridge().realtimeExecute({
        category: category as AlicizationRealtimeCategory,
        query: input.message,
      }).catch((error) => {
        return {
          category: category as AlicizationRealtimeCategory,
          source: 'builtin',
          ok: false,
          errorCode: 'BUILTIN_EXECUTE_FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          durationMs: 0,
        } satisfies AlicizationRealtimeExecuteResult
      })
      throwIfAborted(input.abortSignal)

      if (builtinResult.ok && normalizeText(builtinResult.summary ?? '')) {
        evidences.push({
          category,
          source: 'builtin',
          summary: normalizeText(builtinResult.summary ?? ''),
        })
        trace.toolEvidence.successCount += 1
        trace.toolEvidence.verifiedToolResult = true
        trace.toolEvidence.sources.push('builtin')
        await safeAudit(input.onAudit, {
          level: 'notice',
          category: 'execution-engine',
          action: 'tool-success',
          message: 'Builtin realtime execution succeeded.',
          details: {
            category,
            source: 'builtin',
            durationMs: builtinResult.durationMs,
          },
        })
        continue
      }

      trace.toolEvidence.failureCount += 1
      input.onStatus?.({
        phase: 'tool-failed',
        label: `${categoryLabelMap[category]}内置源不可用，尝试 MCP`,
        source: 'builtin',
        category,
      })
      await safeAudit(input.onAudit, {
        level: 'warning',
        category: 'execution-engine',
        action: 'tool-fail',
        message: 'Builtin realtime execution failed.',
        details: {
          category,
          source: 'builtin',
          errorCode: builtinResult.errorCode,
        },
      })

      const matchedTools = matchToolsForCategory(capabilitySnapshot.mcp.tools, category)
      const argumentCandidates = buildMcpArgumentCandidates(category, input.message)
      let matched = false

      for (const tool of matchedTools) {
        throwIfAborted(input.abortSignal)
        for (const candidate of argumentCandidates) {
          throwIfAborted(input.abortSignal)
          trace.toolEvidence.toolCallCount += 1
          input.onStatus?.({
            phase: 'tool-running',
            label: `调用 MCP ${tool.toolName}`,
            source: 'mcp',
            category,
          })

          const mcpResult = await getMcpToolBridge().callTool({
            name: tool.name,
            arguments: candidate,
          }).catch((error) => {
            return {
              isError: true,
              ok: false,
              errorCode: 'MCP_CALL_FAILED',
              errorMessage: error instanceof Error ? error.message : String(error),
            } satisfies McpCallToolResult
          })
          throwIfAborted(input.abortSignal)

          if (hasVerifiedToolResultPayload(mcpResult)) {
            evidences.push({
              category,
              source: 'mcp',
              summary: summarizeMcpResult(tool, mcpResult),
            })
            trace.toolEvidence.successCount += 1
            trace.toolEvidence.verifiedToolResult = true
            trace.toolEvidence.sources.push('mcp')
            await safeAudit(input.onAudit, {
              level: 'notice',
              category: 'execution-engine',
              action: 'tool-success',
              message: 'MCP realtime fallback execution succeeded.',
              details: {
                category,
                source: 'mcp',
                toolName: tool.name,
              },
            })
            matched = true
            break
          }

          trace.toolEvidence.failureCount += 1
          await safeAudit(input.onAudit, {
            level: 'warning',
            category: 'execution-engine',
            action: 'tool-fail',
            message: 'MCP realtime fallback execution failed.',
            details: {
              category,
              source: 'mcp',
              toolName: tool.name,
            },
          })
        }

        if (matched)
          break
      }

      if (!matched) {
        failedCategories.push(category)
        input.onStatus?.({
          phase: 'tool-failed',
          label: `${categoryLabelMap[category]} MCP 不可用`,
          source: 'mcp',
          category,
        })
      }
    }

    const reply = composeRealtimeReply({
      evidences,
      failed: failedCategories,
    })
    trace.fallbackApplied = evidences.length === 0
    trace.planCompletedAt = Date.now()

    if (trace.fallbackApplied) {
      await safeAudit(input.onAudit, {
        level: 'warning',
        category: 'execution-engine',
        action: 'unverified-fallback',
        message: 'Realtime query fell back because no verified tool result was found.',
        details: {
          categories: intent.categories,
          capabilityTools: capabilitySnapshot.mcp.tools.length,
        },
      })
    }

    input.onStatus?.({
      phase: 'completed',
      label: trace.fallbackApplied ? '执行结束（无可验证结果）' : '执行结束',
    })

    return {
      handled: true,
      intent,
      trace,
      reply,
    }
  }

  return {
    getCapabilitySnapshot,
    executeRealtimeQueryTurn,
  }
})
