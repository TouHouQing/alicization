import type { Message } from '@xsai/shared-chat'

import { sanitizeText } from './runtime-soul'

const terminalExecutionThreadStatuses = new Set([
  'completed',
  'failed',
  'blocked',
  'cancelled',
])

const alicizationLegacyRecoverySystemMarkers = [
  '[ALICIZATION_PROJECT_STATE]',
  '[ALICIZATION_MIND_TURN_CONTRACT]',
  '[ALICIZATION_LIVING_SELF]',
  '[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]',
] as const

function isLegacyRecoveryGovernanceMessage(message: Message) {
  if (message.role !== 'system')
    return false
  const content = message.content
  if (typeof content !== 'string')
    return false
  return alicizationLegacyRecoverySystemMarkers.some(marker => content.includes(marker))
}

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

export function buildAlicizationRequiredToolFactsSystemMessage(input: {
  toolName: string
  toolInput: unknown
  toolResult: unknown
  executionFact: unknown
}): Message {
  return {
    role: 'system',
    content: JSON.stringify({
      type: 'alicization-required-tool-facts',
      data: {
        toolName: input.toolName,
        toolInput: input.toolInput,
        toolResult: input.toolResult,
        executionFact: input.executionFact,
      },
    }),
  } as Message
}

export function buildAlicizationMinimalContextRecoveryMessages(messages: Message[]) {
  if (!Array.isArray(messages))
    return []

  const eligibleMessages = messages.filter(message => !isLegacyRecoveryGovernanceMessage(message))
  if (eligibleMessages.length <= 6)
    return eligibleMessages

  const keepIndexes = new Set<number>()
  let preservedSystemCount = 0

  for (let index = 0; index < eligibleMessages.length; index += 1) {
    const message = eligibleMessages[index]
    if (message?.role !== 'system')
      continue
    if (preservedSystemCount < 3) {
      keepIndexes.add(index)
      preservedSystemCount += 1
    }
  }

  for (let index = eligibleMessages.length - 1; index >= 0; index -= 1) {
    const message = eligibleMessages[index]
    if (message?.role === 'system') {
      keepIndexes.add(index)
      break
    }
  }

  let preservedTailCount = 0
  for (let index = eligibleMessages.length - 1; index >= 0; index -= 1) {
    if (eligibleMessages[index]?.role === 'system')
      continue
    keepIndexes.add(index)
    preservedTailCount += 1
    if (preservedTailCount >= 4)
      break
  }

  const compactMessages = eligibleMessages.filter((_, index) => keepIndexes.has(index))
  return compactMessages.length > 0
    ? compactMessages
    : eligibleMessages.slice(-6)
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
