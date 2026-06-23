import type { Message } from '@xsai/shared-chat'

import type { AlicizationExecutionOutcomeSurfaceStatus } from './execution-delivery-surface'

import { randomUUID } from 'node:crypto'

import { buildAlicizationExecutionPayoffDeterministicStructured } from './execution-delivery-surface'
import { extractAlicizationRequiredToolNames } from './main-chat-required-tool'

interface AlicizationDeterministicCallableTool {
  function?: {
    name?: unknown
  }
  execute?: (input: Record<string, unknown>) => Promise<unknown> | unknown
}

interface AlicizationDeterministicRequiredToolRecoveryInput {
  cardId: string
  turnId: string
  messages: Message[]
  tools?: AlicizationDeterministicCallableTool[]
  requiredToolNames: string[]
  toolInputOverrides?: Record<string, Record<string, unknown>>
  emitToolCall: (payload: {
    cardId: string
    turnId: string
    toolCallId: string
    toolName: string
    arguments?: Record<string, unknown>
  }) => void
  emitToolResult: (payload: {
    cardId: string
    turnId: string
    toolCallId: string
    result?: unknown
  }) => void
}

export interface AlicizationDeterministicRequiredToolRecoveryResult {
  toolCallId: string
  toolName: string
  toolInput: Record<string, unknown>
  toolResult: unknown
  fullText: string
}

function sanitizeText(raw: unknown, maxChars = 1_200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function readMessageContentAsText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (!Array.isArray(content))
    return ''
  return content.map((part) => {
    if (typeof part === 'string')
      return part
    if (part && typeof part === 'object' && 'text' in part)
      return String((part as { text?: unknown }).text ?? '')
    return ''
  }).join('\n')
}

function readLatestUserText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return sanitizeText(readMessageContentAsText(message.content), 4_000)
  }
  return ''
}

function inferCliCommandInput(userText: string): Record<string, unknown> {
  const fencedCommand = userText.match(/`([^`\n]+)`/u)?.[1]?.trim() ?? ''
  if (fencedCommand) {
    const [command, ...args] = fencedCommand.split(/\s+/u).filter(Boolean)
    if (command) {
      return {
        command,
        args,
        goal: `Run CLI command from user turn: ${sanitizeText(fencedCommand, 220)}`,
        effect: 'observe',
      }
    }
  }

  const desktopListingIntent = /(?:桌面|desktop).*(?:什么文件|哪些文件|文件|目录|内容|list|show|查看|查一下|看看)/iu.test(userText)
  if (desktopListingIntent) {
    return {
      command: 'ls',
      args: ['-la', '~/Desktop'],
      goal: 'List desktop files requested by user.',
      effect: 'observe',
    }
  }

  const cwdListingIntent = /(?:当前目录|这个目录|列出|list|ls).*(?:文件|目录|files|folders|directory)/iu.test(userText)
  if (cwdListingIntent) {
    return {
      command: 'ls',
      args: ['-la'],
      goal: 'List files in the current directory requested by user.',
      effect: 'observe',
    }
  }

  return {
    command: 'ls',
    args: ['-la'],
    goal: `Run CLI follow-up for required execution turn: ${sanitizeText(userText, 220) || 'user-requested execution'}`,
    effect: 'observe',
  }
}

function inferCodexToolInput(userText: string, toolName: 'executor_run_codex' | 'executor_run_claude_code') {
  const mutateIntent = /修复|重构|修改|实现|新增|补丁|fix|refactor|edit|implement|patch|update/iu.test(userText)
  const kind = mutateIntent ? 'codebase-edit' : 'codebase-investigation'
  const effect = mutateIntent ? 'mutate' : 'observe'
  if (toolName === 'executor_run_claude_code') {
    return {
      prompt: userText || 'Continue the current requested task and report concrete progress.',
      kind,
      effect,
      allowTools: mutateIntent,
    } satisfies Record<string, unknown>
  }
  return {
    prompt: userText || 'Continue the current requested task and report concrete progress.',
    kind,
    effect,
    sandbox: mutateIntent ? 'workspace-write' : 'read-only',
  } satisfies Record<string, unknown>
}

function inferOpenClawToolInput(userText: string) {
  const normalized = userText.toLowerCase()
  const kind = /browser|网页|浏览器|url|tab/u.test(normalized)
    ? 'browser-automation'
    : /软件|app|窗口|window/u.test(normalized)
      ? 'software-automation'
      : /桌面|desktop|screen|屏幕/u.test(normalized)
        ? 'desktop-automation'
        : 'mixed'
  return {
    instruction: userText || 'Continue the requested embodied task and report concrete results.',
    kind,
    effect: 'observe',
  } satisfies Record<string, unknown>
}

function buildDeterministicToolInput(toolName: string, userText: string) {
  switch (toolName) {
    case 'executor_run_cli':
      return inferCliCommandInput(userText)
    case 'executor_run_codex':
      return inferCodexToolInput(userText, 'executor_run_codex')
    case 'executor_run_claude_code':
      return inferCodexToolInput(userText, 'executor_run_claude_code')
    case 'executor_run_openclaw':
      return inferOpenClawToolInput(userText)
    default:
      return {}
  }
}

function readToolName(tool: AlicizationDeterministicCallableTool) {
  if (!tool || typeof tool !== 'object')
    return ''
  return sanitizeText(tool.function?.name, 96)
}

function readDeterministicRecoveryReply(result: unknown) {
  if (typeof result === 'string')
    return sanitizeText(result, 2_000)
  if (!result || typeof result !== 'object')
    return ''
  const payload = result as Record<string, unknown>
  const summary = sanitizeText(payload.summary, 2_000)
  if (summary)
    return summary
  const errorMessage = sanitizeText(payload.errorMessage, 2_000)
  if (errorMessage)
    return errorMessage
  if (typeof payload.output === 'string') {
    const outputText = sanitizeText(payload.output, 2_000)
    if (outputText)
      return outputText
  }
  if (payload.output != null) {
    const serialized = sanitizeText(JSON.stringify(payload.output), 2_000)
    if (serialized)
      return serialized
  }
  return sanitizeText(payload.status, 200)
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function normalizeExecutorChannel(toolName: string, result: Record<string, unknown>) {
  const selectedChannel = sanitizeText(result.selectedChannel, 48)
  if (selectedChannel)
    return selectedChannel
  if (toolName === 'executor_run_cli')
    return 'cli'
  if (toolName === 'executor_run_codex')
    return 'codex'
  if (toolName === 'executor_run_claude_code')
    return 'claude-code'
  if (toolName === 'executor_run_openclaw')
    return 'openclaw'
  return 'executor'
}

function normalizeInlineExecutionStatus(result: Record<string, unknown>): AlicizationExecutionOutcomeSurfaceStatus {
  const threadStatus = sanitizeText(result.threadStatus, 48).toLowerCase()
  if (threadStatus === 'completed' || threadStatus === 'cancelled' || threadStatus === 'blocked' || threadStatus === 'failed' || threadStatus === 'queued' || threadStatus === 'running')
    return threadStatus
  const status = sanitizeText(result.status, 48).toLowerCase()
  if (status === 'completed' || status === 'cancelled' || status === 'blocked' || status === 'failed' || status === 'queued' || status === 'running')
    return status
  return 'failed'
}

function buildDeterministicRecoveryStructuredText(input: {
  fullText: string
  toolName: string
  toolResult: unknown
}) {
  if (!input.toolName.startsWith('executor_run_'))
    return input.fullText

  const payload = asRecord(input.toolResult)
  if (!payload)
    return input.fullText

  const status = normalizeInlineExecutionStatus(payload)
  const channel = normalizeExecutorChannel(input.toolName, payload)
  const summary = sanitizeText(payload.summary, 220)
  const output = sanitizeText(payload.output, 220)
  const goal = sanitizeText(payload.goal, 220) || summary || 'the current task'
  const structured = buildAlicizationExecutionPayoffDeterministicStructured({
    mode: 'inline-execution',
    channel,
    goal,
    status,
    summary,
    outcome: output || summary,
    visibleReplyAuthority: 'llm-second-pass-rewrite',
  })

  return JSON.stringify(structured)
}

function pickDeterministicRecoveryTool(input: {
  requiredToolNames: string[]
  tools?: AlicizationDeterministicCallableTool[]
}) {
  const tools = Array.isArray(input.tools)
    ? input.tools
    : []
  if (tools.length === 0)
    return null

  const requiredToolNames = [...new Set(input.requiredToolNames.map(name => sanitizeText(name, 96)).filter(Boolean))]
  for (const requiredToolName of requiredToolNames) {
    const matched = tools.find((tool) => {
      return typeof tool.execute === 'function'
        && readToolName(tool) === requiredToolName
    })
    if (matched)
      return { tool: matched, toolName: requiredToolName }
  }

  const fallback = tools.find(tool => typeof tool.execute === 'function')
  if (!fallback)
    return null
  const fallbackName = readToolName(fallback)
  return fallbackName
    ? { tool: fallback, toolName: fallbackName }
    : null
}

export function resolveDeterministicRequiredToolNames(input: {
  error?: unknown
  fallbackToolNames?: string[]
}) {
  const fromError = extractAlicizationRequiredToolNames(input.error)
  if (fromError.length > 0)
    return fromError
  return [...new Set((input.fallbackToolNames ?? [])
    .map(name => sanitizeText(name, 96))
    .filter(Boolean))]
}

export async function recoverAlicizationRequiredToolDeterministically(
  input: AlicizationDeterministicRequiredToolRecoveryInput,
): Promise<AlicizationDeterministicRequiredToolRecoveryResult> {
  const selected = pickDeterministicRecoveryTool({
    requiredToolNames: input.requiredToolNames,
    tools: input.tools,
  })
  if (!selected || typeof selected.tool.execute !== 'function') {
    throw new Error(`No executable required tool found for deterministic recovery: ${input.requiredToolNames.join(', ')}`)
  }

  const userText = readLatestUserText(input.messages)
  const toolInput = input.toolInputOverrides?.[selected.toolName]
    ?? buildDeterministicToolInput(selected.toolName, userText)
  const toolCallId = `required-tool-recovery-${randomUUID()}`

  input.emitToolCall({
    cardId: input.cardId,
    turnId: input.turnId,
    toolCallId,
    toolName: selected.toolName,
    arguments: toolInput,
  })

  const toolResult = await selected.tool.execute(toolInput)
  input.emitToolResult({
    cardId: input.cardId,
    turnId: input.turnId,
    toolCallId,
    result: toolResult,
  })

  const replyText = readDeterministicRecoveryReply(toolResult)
  const fullText = buildDeterministicRecoveryStructuredText({
    fullText: replyText,
    toolName: selected.toolName,
    toolResult,
  })
  if (!fullText) {
    throw new Error(`Deterministic required-tool recovery produced no reply text: ${selected.toolName}`)
  }

  return {
    toolCallId,
    toolName: selected.toolName,
    toolInput,
    toolResult,
    fullText,
  }
}
