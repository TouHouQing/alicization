import type { Message } from '@xsai/shared-chat'

import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'

import { sanitizeText } from './runtime-soul'

export const alicizationExecutorToolNames = new Set([
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_openclaw',
])

const terminalExecutionThreadStatuses = new Set([
  'completed',
  'failed',
  'blocked',
  'cancelled',
])

export interface AlicizationInlineExecutionReceipt {
  completedAt: number
  sessionId: string
  threadId: string
}

export interface AlicizationInlineExecutionSurfaceInput {
  channel: string
  status: 'completed' | 'failed' | 'blocked' | 'cancelled' | 'queued' | 'running'
  goal: string
  summary: string
  outcome: string
}

export function buildAlicizationMinimalContextRecoveryMessages(messages: Message[]) {
  if (!Array.isArray(messages) || messages.length <= 6)
    return messages

  const keepIndexes = new Set<number>()
  let preservedSystemCount = 0

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (message?.role !== 'system')
      continue
    if (preservedSystemCount < 3) {
      keepIndexes.add(index)
      preservedSystemCount += 1
    }
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'system') {
      keepIndexes.add(index)
      break
    }
  }

  let preservedTailCount = 0
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'system')
      continue
    keepIndexes.add(index)
    preservedTailCount += 1
    if (preservedTailCount >= 4)
      break
  }

  const compactMessages = messages.filter((_, index) => keepIndexes.has(index))
  return compactMessages.length > 0
    ? compactMessages
    : messages.slice(-6)
}

export function readAlicizationInlineExecutionReceipt(result: unknown): AlicizationInlineExecutionReceipt | null {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return null

  const payload = result as {
    completedAt?: unknown
    sessionId?: unknown
    threadId?: unknown
    threadStatus?: unknown
  }
  const threadStatus = sanitizeText(payload.threadStatus, '')
    .toLowerCase()
  const sessionId = sanitizeText(payload.sessionId, '')
  const threadId = sanitizeText(payload.threadId, '')
  const completedAt = typeof payload.completedAt === 'number' && Number.isFinite(payload.completedAt)
    ? Math.max(0, Math.floor(payload.completedAt))
    : 0

  if (!terminalExecutionThreadStatuses.has(threadStatus) || !sessionId || !threadId || completedAt <= 0)
    return null

  return {
    completedAt,
    sessionId,
    threadId,
  }
}

export function asAlicizationInlineExecutionSurfaceInput(
  toolName: string,
  result: unknown,
): AlicizationInlineExecutionSurfaceInput | null {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return null

  const payload = result as Record<string, unknown>
  const normalizedToolName = sanitizeText(toolName, '').toLowerCase()
  const selectedChannel = sanitizeText(payload.selectedChannel, '')
    || sanitizeText(payload.channel, '')
    || (normalizedToolName === 'executor_run_cli'
      ? 'cli'
      : normalizedToolName === 'executor_run_codex'
        ? 'codex'
        : normalizedToolName === 'executor_run_claude_code'
          ? 'claude-code'
          : normalizedToolName === 'executor_run_openclaw'
            ? 'openclaw'
            : 'executor')
  const status = sanitizeText(payload.threadStatus, '').toLowerCase()
    || sanitizeText(payload.status, '').toLowerCase()
    || (payload.ok === true ? 'completed' : payload.ok === false ? 'failed' : '')
  const normalizedStatus = (
    status === 'completed'
    || status === 'failed'
    || status === 'blocked'
    || status === 'cancelled'
    || status === 'queued'
    || status === 'running'
  )
    ? status
    : 'failed'
  const summary = sanitizeText(payload.summary, '')
  const output = typeof payload.output === 'string'
    ? payload.output
    : payload.output != null
      ? JSON.stringify(payload.output)
      : ''
  const outcome = sanitizeText(output, '')
  const goal = sanitizeText(payload.goal, '')
    || summary
    || 'the current task'

  return {
    channel: selectedChannel,
    status: normalizedStatus,
    goal,
    summary,
    outcome,
  }
}

export function shouldUseAlicizationExecutionFirstFastPath(input: {
  enforcedExecutionTools: string[]
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  if (!input.prepared.waitForTools)
    return false
  if (input.enforcedExecutionTools.length !== 1)
    return false
  if (!input.enforcedExecutionTools.every(toolName => alicizationExecutorToolNames.has(toolName)))
    return false

  const actionKind = input.prepared.runtimeSurface.action?.kind
  if (actionKind !== 'execute' && actionKind !== 'continue-task')
    return false

  return input.prepared.runtimeSurface.tooling.routingRequired === true
}
