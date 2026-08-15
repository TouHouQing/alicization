import type { AlicizationRuntimeToolCardProjection } from '@proj-alicization/stage-shared'

import type {
  ChatHistoryItem,
  ChatSlices,
  ChatSlicesExecutionStatus,
  StreamingAssistantMessage,
} from '../types/chat'

export interface ChatExecutorToolReplyEvidence {
  channel: string
  errorCode: string
  errorMessage: string
  output: string
  stage: string
  status: string
  summary: string
  toolName: string
}

export interface ChatRecoveredTurnToolProjection {
  turnId: string
  cards: AlicizationRuntimeToolCardProjection[]
  recoveryRequired?: boolean
  reasonCodes?: string[]
  failure?: {
    code: string
    message: string
  } | null
}

export type ChatToolProjectionSlice = Exclude<ChatSlices, { type: 'text' }>

const executionEvidenceToolNames = new Set([
  'coding_agent',
  'cli',
  'codex',
  'claude_code',
  'local_visual',
  'openclaw',
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

const terminalExecutionPhases = new Set<ChatSlicesExecutionStatus['phase']>([
  'completed',
  'tool-cancelled',
  'tool-dead-lettered',
  'tool-failed',
  'tool-recovery-required',
  'tool-timeout',
])

export function isChatExecutionProjectionToolName(toolName: string) {
  return executionEvidenceToolNames.has(toolName)
}

function sanitizeExecutorReplyEvidenceText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function extractChatExecutorToolReplyEvidence(
  result: unknown,
  toolName: string,
): ChatExecutorToolReplyEvidence | null {
  const normalizedToolName = sanitizeExecutorReplyEvidenceText(toolName, 96) || 'executor'

  if (typeof result === 'string') {
    const summary = sanitizeExecutorReplyEvidenceText(result)
    if (!summary)
      return null
    return {
      toolName: normalizedToolName,
      channel: '',
      status: 'unknown',
      stage: '',
      summary,
      output: summary,
      errorCode: '',
      errorMessage: '',
    }
  }

  if (!result || typeof result !== 'object')
    return null

  const payload = result as Record<string, unknown>
  const rawOutput = typeof payload.output === 'string'
    ? payload.output
    : payload.output != null
      ? JSON.stringify(payload.output)
      : ''
  const summary = sanitizeExecutorReplyEvidenceText(payload.summary)
    || sanitizeExecutorReplyEvidenceText(payload.errorMessage)
    || sanitizeExecutorReplyEvidenceText(rawOutput, 420)
    || sanitizeExecutorReplyEvidenceText(payload.status)

  if (!summary)
    return null

  const status = sanitizeExecutorReplyEvidenceText(payload.status, 48).toLowerCase()
    || (payload.ok === true ? 'completed' : payload.ok === false ? 'failed' : 'unknown')

  return {
    toolName: normalizedToolName,
    channel: sanitizeExecutorReplyEvidenceText(payload.selectedChannel, 48).toLowerCase(),
    status,
    stage: sanitizeExecutorReplyEvidenceText(payload.stage, 48).toLowerCase(),
    summary,
    output: sanitizeExecutorReplyEvidenceText(rawOutput, 420),
    errorCode: sanitizeExecutorReplyEvidenceText(payload.errorCode, 96),
    errorMessage: sanitizeExecutorReplyEvidenceText(payload.errorMessage, 280),
  }
}

function normalizeExecutorChannelLabel(selectedChannel?: string) {
  const normalizedSelectedChannel = sanitizeExecutorReplyEvidenceText(selectedChannel || '', 48).toLowerCase()
  const selectedChannelLabels: Record<string, string> = {
    'browser': '浏览器',
    'claude-code': 'Claude Code',
    'cli': 'CLI',
    'codex': 'Codex',
    'desktop': '桌面',
    'openclaw': 'OpenClaw',
    'openfang': 'OpenFang',
    'software': '软件',
  }
  if (selectedChannelLabels[normalizedSelectedChannel])
    return selectedChannelLabels[normalizedSelectedChannel]
  return '工具'
}

function prefixExecutorChannelLabel(channel: string, detail: string) {
  const normalizedDetail = detail.trim()
  if (!normalizedDetail)
    return channel
  if (normalizedDetail.toLocaleLowerCase().startsWith(channel.toLocaleLowerCase()))
    return normalizedDetail
  return `${channel} ${normalizedDetail}`
}

export function buildChatExecutionStatusFromProjection(
  projection: AlicizationRuntimeToolCardProjection,
  options?: {
    recoveryRequired?: boolean
    result?: ChatExecutorToolReplyEvidence | null
  },
): ChatSlicesExecutionStatus {
  const progress = projection.step
  const channel = normalizeExecutorChannelLabel(
    projection.selectedChannel ?? undefined,
  )
  const progressPhase = projection.phase
  const elapsedMs = projection.elapsedMs ?? undefined
  const timeoutMs = projection.timeoutMs ?? undefined
  const progressSignal = progress?.signal ?? undefined
  const progressSummary = sanitizeExecutorReplyEvidenceText(progress?.summary || '', 160)
  const progressErrorCode = sanitizeExecutorReplyEvidenceText(projection.errorCode || '', 96)
  const progressErrorMessage = sanitizeExecutorReplyEvidenceText(projection.errorMessage || '', 280)
  const adapterEventType = sanitizeExecutorReplyEvidenceText(progress?.adapterEventType || '', 80)
  const itemType = sanitizeExecutorReplyEvidenceText(progress?.itemType || '', 80)
  const command = sanitizeExecutorReplyEvidenceText(progress?.command || '', 320)
  const commandStatus = sanitizeExecutorReplyEvidenceText(progress?.commandStatus || '', 80)
  const commandExitCode = typeof progress?.commandExitCode === 'number'
    && Number.isFinite(progress.commandExitCode)
    ? Math.floor(progress.commandExitCode)
    : undefined
  const outputPreview = sanitizeExecutorReplyEvidenceText(progress?.outputPreview || '', 1_200)
  const commandDetails = {
    ...(command ? { command } : {}),
    ...(commandStatus ? { commandStatus } : {}),
    ...(commandExitCode !== undefined ? { commandExitCode } : {}),
    ...(outputPreview ? { outputPreview } : {}),
  }
  const result = options?.result === undefined
    ? extractChatExecutorToolReplyEvidence(projection.result, projection.toolName)
    : options.result
  const detail = sanitizeExecutorReplyEvidenceText(
    result?.summary || result?.errorMessage || result?.output || '',
    96,
  )

  if (options?.recoveryRequired && !projection.terminal) {
    return {
      type: 'execution-status',
      phase: 'tool-recovery-required',
      toolCallId: projection.toolCallId,
      toolName: projection.toolName,
      elapsedMs,
      timeoutMs,
      signal: progressSignal,
      errorCode: 'TOOL_RECOVERY_REQUIRED',
      errorMessage: '上次运行在应用退出前没有完成结算。',
      ...commandDetails,
      label: `${channel} 上次运行未完成，需要恢复`,
      source: 'builtin',
    }
  }

  if (progressPhase === 'cancelled') {
    return {
      type: 'execution-status',
      phase: 'tool-cancelled',
      toolCallId: projection.toolCallId,
      toolName: projection.toolName,
      elapsedMs,
      timeoutMs,
      signal: progressSignal,
      errorCode: progressErrorCode || undefined,
      errorMessage: progressErrorMessage || undefined,
      ...commandDetails,
      label: `${channel} 已取消执行`,
      source: 'builtin',
    }
  }

  if (progressPhase === 'timeout') {
    return {
      type: 'execution-status',
      phase: 'tool-timeout',
      toolCallId: projection.toolCallId,
      toolName: projection.toolName,
      elapsedMs,
      timeoutMs,
      signal: progressSignal,
      errorCode: progressErrorCode || undefined,
      errorMessage: progressErrorMessage || undefined,
      ...commandDetails,
      label: progressErrorCode
        ? `${channel} 执行超时（${progressErrorCode}）`
        : `${channel} 执行超时`,
      source: 'builtin',
    }
  }

  if (progressPhase === 'dead-lettered') {
    const progressDetail = [progressErrorCode, progressErrorMessage].filter(Boolean).join(': ')
    return {
      type: 'execution-status',
      phase: 'tool-dead-lettered',
      toolCallId: projection.toolCallId,
      toolName: projection.toolName,
      elapsedMs,
      timeoutMs,
      errorCode: progressErrorCode || undefined,
      errorMessage: progressErrorMessage || undefined,
      ...commandDetails,
      label: detail
        ? `${channel} 需要人工核对: ${detail}`
        : progressDetail
          ? `${channel} 需要人工核对: ${progressDetail}`
          : `${channel} 需要人工核对`,
      source: 'builtin',
    }
  }

  if (progressPhase === 'failed') {
    const progressDetail = [progressErrorCode, progressErrorMessage].filter(Boolean).join(': ')
    return {
      type: 'execution-status',
      phase: 'tool-failed',
      toolCallId: projection.toolCallId,
      toolName: projection.toolName,
      elapsedMs,
      timeoutMs,
      errorCode: progressErrorCode || undefined,
      errorMessage: progressErrorMessage || undefined,
      ...commandDetails,
      label: detail
        ? `${channel} 没有跑通: ${detail}`
        : progressDetail
          ? `${channel} 没有跑通: ${progressDetail}`
          : `${channel} 没有跑通`,
      source: 'builtin',
    }
  }

  if (progressPhase === 'completed') {
    return {
      type: 'execution-status',
      phase: 'completed',
      toolCallId: projection.toolCallId,
      toolName: projection.toolName,
      elapsedMs,
      timeoutMs,
      ...commandDetails,
      label: detail
        ? `${channel} 已经拿到结果: ${detail}`
        : elapsedMs && elapsedMs >= 1_000
          ? `${channel} 已完成（${Math.floor(elapsedMs / 1_000)} 秒）`
          : `${channel} 已经拿到结果`,
      source: 'builtin',
    }
  }

  const elapsedLabel = elapsedMs && elapsedMs >= 1_000
    ? `（已运行 ${Math.floor(elapsedMs / 1_000)} 秒）`
    : ''
  const semanticDetail = (() => {
    if (itemType === 'command_execution' && progressSummary) {
      const resolvedCommand = command || progressSummary
        .replace(/^[^:]{1,48} command (?:started|updated|completed):\s*/i, '')
        .trim()
      if (adapterEventType === 'item.completed') {
        if (commandExitCode !== undefined && commandExitCode !== 0) {
          return resolvedCommand
            ? `${channel} 命令退出（代码 ${commandExitCode}）：${resolvedCommand}`
            : `${channel} 命令退出（代码 ${commandExitCode}）`
        }
        return resolvedCommand ? `${channel} 已完成命令：${resolvedCommand}` : `${channel} 已完成一条命令`
      }
      return resolvedCommand ? `${channel} 正在执行命令：${resolvedCommand}` : `${channel} 正在执行命令`
    }
    if (itemType === 'reasoning')
      return `${channel} 正在分析任务`
    if (itemType === 'agent_message')
      return `${channel} 正在整理任务结果`
    if (itemType === 'file_change') {
      return adapterEventType === 'item.completed'
        ? `${channel} 已完成文件变更`
        : `${channel} 正在处理文件变更`
    }
    if (adapterEventType === 'turn.started')
      return `${channel} 已开始处理任务`
    if (adapterEventType === 'turn.completed')
      return `${channel} 已完成内部任务`
    if (adapterEventType === 'turn.failed')
      return progressSummary.replace(/^[^:]{1,48} turn failed:\s*/i, `${channel} 执行失败：`)
    if (adapterEventType === 'error')
      return progressSummary.replace(/^[^:]{1,48} reported:\s*/i, `${channel} Provider 状态：`)
    return progressSummary
  })()
  if (progressSignal === 'liveness') {
    return {
      type: 'execution-status',
      phase: 'tool-running',
      toolCallId: projection.toolCallId,
      toolName: projection.toolName,
      elapsedMs,
      timeoutMs,
      signal: progressSignal,
      adapterEventType: adapterEventType || undefined,
      itemType: itemType || undefined,
      summary: progressSummary || undefined,
      ...commandDetails,
      label: semanticDetail
        ? `${channel} 进程仍在运行；最近进展：${semanticDetail}${elapsedLabel}`
        : `${channel} 进程仍在运行，暂时没有新进展${elapsedLabel}`,
      source: 'builtin',
    }
  }
  return {
    type: 'execution-status',
    phase: 'tool-running',
    toolCallId: projection.toolCallId,
    toolName: projection.toolName,
    elapsedMs,
    timeoutMs,
    signal: progressSignal,
    adapterEventType: adapterEventType || undefined,
    itemType: itemType || undefined,
    summary: progressSummary || undefined,
    ...commandDetails,
    label: semanticDetail
      ? prefixExecutorChannelLabel(channel, semanticDetail)
      : `${channel} 正在处理这件事${elapsedLabel}`,
    source: 'builtin',
  }
}

export function upsertChatExecutionStatusSlice(
  slices: ChatSlices[],
  next: ChatSlicesExecutionStatus,
) {
  if (!next.toolCallId)
    return
  const existingIndex = slices.findIndex(slice => (
    slice.type === 'execution-status'
    && slice.toolCallId === next.toolCallId
  ))
  if (existingIndex >= 0) {
    const existing = slices[existingIndex]
    if (
      existing?.type === 'execution-status'
      && terminalExecutionPhases.has(existing.phase)
      && !terminalExecutionPhases.has(next.phase)
    ) {
      return
    }
    const merged = existing?.type === 'execution-status'
      ? {
          ...existing,
          ...next,
          command: next.command ?? existing.command,
          commandStatus: next.commandStatus ?? existing.commandStatus,
          commandExitCode: next.commandExitCode ?? existing.commandExitCode,
          outputPreview: next.outputPreview ?? existing.outputPreview,
        }
      : next
    slices.splice(existingIndex, 1, merged)
    return
  }
  slices.push(next)
}

export function applyChatToolProjectionSlice(
  message: StreamingAssistantMessage,
  slice: ChatToolProjectionSlice,
  updateUI: () => void,
) {
  if (slice.type === 'tool-call') {
    const existingIndex = message.slices.findIndex(existing => (
      existing.type === 'tool-call'
      && existing.toolCall.toolCallId === slice.toolCall.toolCallId
    ))
    if (existingIndex >= 0)
      message.slices.splice(existingIndex, 1, slice)
    else
      message.slices.push(slice)
    updateUI()
    return
  }

  if (slice.type === 'execution-status') {
    upsertChatExecutionStatusSlice(message.slices, slice)
    updateUI()
    return
  }

  if (slice.type === 'tool-call-result') {
    upsertToolResult(message.tool_results, slice)
    updateUI()
  }
}

export function replaceChatAssistantTextPreservingToolProjection(
  message: Extract<ChatHistoryItem, { role: 'assistant' }>,
  text: string,
) {
  const projectedSlices = Array.isArray(message.slices)
    ? message.slices.filter(slice => slice.type !== 'text')
    : []
  message.content = text
  message.slices = text
    ? [{ type: 'text', text }, ...projectedSlices]
    : projectedSlices
  message.tool_results = Array.isArray(message.tool_results)
    ? message.tool_results
    : []
}

export function upsertChatInfrastructureErrorMessage(
  messages: ChatHistoryItem[],
  input: {
    id: string
    code: string
    message: string
    label?: string
  },
) {
  const content = `${input.label?.trim() || '工具状态恢复失败'}（${input.code}）：${input.message}`
  const existing = messages.find(message => message.id === input.id)
  if (existing) {
    if (existing.role !== 'error' || existing.content === content)
      return false
    existing.content = content
    return true
  }
  messages.push({
    id: input.id,
    role: 'error',
    content,
  })
  return true
}

export function removeChatInfrastructureErrorMessage(
  messages: ChatHistoryItem[],
  id: string,
) {
  const index = messages.findIndex(message => (
    message.role === 'error'
    && message.id === id
  ))
  if (index < 0)
    return false
  messages.splice(index, 1)
  return true
}

function upsertToolResult(
  toolResults: Array<{ id: string, result?: unknown }>,
  next: { id: string, result?: unknown },
) {
  const existingIndex = toolResults.findIndex(result => result.id === next.id)
  if (existingIndex >= 0) {
    toolResults.splice(existingIndex, 1, next)
    return
  }
  toolResults.push(next)
}

export function projectRecoveredTurnToolProjectionsIntoMessages(
  messages: ChatHistoryItem[],
  records: ChatRecoveredTurnToolProjection[],
) {
  let changed = false

  for (const record of records) {
    const turnId = record.turnId.trim()
    if (!turnId)
      continue

    const hasTurnAnchor = messages.some(message => (
      message.id === turnId
      || message.id === `${turnId}:user`
    ))
    if (!hasTurnAnchor)
      continue

    if (record.failure) {
      if (upsertChatInfrastructureErrorMessage(messages, {
        id: `${turnId}:tool-replay-error`,
        code: record.failure.code,
        message: record.failure.message,
      })) {
        changed = true
      }
      continue
    }

    if (removeChatInfrastructureErrorMessage(
      messages,
      `${turnId}:tool-replay-error`,
    )) {
      changed = true
    }

    const visibleCards = record.cards.filter(card => (
      isChatExecutionProjectionToolName(card.toolName)
      || (record.recoveryRequired && !card.terminal)
    ))
    if (visibleCards.length === 0)
      continue

    let assistant = messages.find(message => (
      message.role === 'assistant'
      && message.id === turnId
    ))
    if (!assistant) {
      assistant = {
        id: turnId,
        role: 'assistant',
        content: '',
        slices: [],
        tool_results: [],
      }
      messages.push(assistant)
      changed = true
    }
    if (assistant.role !== 'assistant')
      continue

    const before = JSON.stringify({
      slices: assistant.slices,
      toolResults: assistant.tool_results,
    })
    for (const card of visibleCards) {
      upsertChatExecutionStatusSlice(
        assistant.slices,
        buildChatExecutionStatusFromProjection(card, {
          recoveryRequired: record.recoveryRequired,
        }),
      )
      if (card.terminal && card.result !== undefined) {
        upsertToolResult(assistant.tool_results, {
          id: card.toolCallId,
          result: card.result,
        })
      }
    }
    const after = JSON.stringify({
      slices: assistant.slices,
      toolResults: assistant.tool_results,
    })
    if (before !== after)
      changed = true
  }

  return changed
}
