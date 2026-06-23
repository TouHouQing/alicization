import type { Message } from '@xsai/shared-chat'

import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'

import { sanitizeText } from './runtime-soul'

export const alicizationExecutorToolNames = new Set([
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_local_visual',
  'executor_run_openclaw',
  'browser_open_url',
  'browser_search_web',
  'browser_read_page',
  'browser_click_element',
  'browser_type_text',
  'browser_navigate',
  'browser_scroll',
  'browser_wait',
  'desktop_inspect_scene',
  'desktop_list_interactables',
  'desktop_click_element',
  'desktop_type_text',
  'desktop_press_keys',
  'desktop_open_application',
  'desktop_wait',
])

const terminalExecutionThreadStatuses = new Set([
  'completed',
  'failed',
  'blocked',
  'cancelled',
])

const alicizationMinimalRecoveryRequiredSystemMarkers = [
  '[ALICIZATION_PROJECT_STATE]',
  '[ALICIZATION_MIND_TURN_CONTRACT]',
  '[ALICIZATION_LIVING_SELF]',
  '[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]',
] as const

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

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (message?.role !== 'system')
      continue
    const text = typeof message.content === 'string' ? message.content : ''
    if (alicizationMinimalRecoveryRequiredSystemMarkers.some(marker => text.includes(marker)))
      keepIndexes.add(index)
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
          : normalizedToolName === 'executor_run_local_visual'
            ? /browser|page|tab|网页|浏览器|页面/u.test(`${sanitizeText(payload.kind, '')} ${sanitizeText(payload.goal, '')} ${sanitizeText(payload.summary, '')}`)
              ? 'browser'
              : /software|app|应用|软件/u.test(`${sanitizeText(payload.kind, '')} ${sanitizeText(payload.goal, '')} ${sanitizeText(payload.summary, '')}`)
                ? 'software'
                : 'desktop'
            : normalizedToolName === 'executor_run_openclaw'
              ? 'openclaw'
              : normalizedToolName === 'browser_open_url'
                || normalizedToolName === 'browser_search_web'
                || normalizedToolName === 'browser_read_page'
                || normalizedToolName === 'browser_click_element'
                || normalizedToolName === 'browser_type_text'
                || normalizedToolName === 'browser_navigate'
                || normalizedToolName === 'browser_scroll'
                || normalizedToolName === 'browser_wait'
                ? 'browser'
                : normalizedToolName === 'desktop_inspect_scene'
                  || normalizedToolName === 'desktop_list_interactables'
                  || normalizedToolName === 'desktop_click_element'
                  || normalizedToolName === 'desktop_type_text'
                  || normalizedToolName === 'desktop_press_keys'
                  || normalizedToolName === 'desktop_wait'
                  ? 'desktop'
                  : normalizedToolName === 'desktop_open_application'
                    ? 'desktop'
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
