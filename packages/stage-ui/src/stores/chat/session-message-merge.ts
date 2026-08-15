import type {
  ChatHistoryItem,
  ChatSlicesExecutionStatus,
  ChatSlicesToolCallResult,
} from '../../types/chat'

import { normalizeDialogueStructuredArtifact } from '../../composables/alicization-structured-output'
import { shouldReplaceToolSettlement } from './tool-settlement-arbitration'

type ChatAssistantMessage = Extract<ChatHistoryItem, { role: 'assistant' }>
type ChatToolResult = ChatAssistantMessage['tool_results'][number]

const settledExecutionPhases = new Set<ChatSlicesExecutionStatus['phase']>([
  'completed',
  'tool-cancelled',
  'tool-dead-lettered',
  'tool-failed',
  'tool-timeout',
])
const deadLetteredExecutionPhases = new Set<ChatSlicesExecutionStatus['phase']>([
  'tool-dead-lettered',
])

const settledToolResultStatuses = new Set([
  'cancelled',
  'completed',
  'dead-lettered',
  'failed',
  'timeout',
  'tool-cancelled',
  'tool-dead-lettered',
  'tool-failed',
  'tool-timeout',
])
const deadLetteredToolResultStatuses = new Set([
  'dead-lettered',
  'tool-dead-lettered',
])

function extractMessageContent(message: ChatHistoryItem) {
  if (typeof message.content === 'string')
    return message.content

  if (Array.isArray(message.content)) {
    return message.content.map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String(part.text ?? '')
      return ''
    }).join('')
  }

  return ''
}

function normalizeMessageId(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim()
}

function extractStableTurnId(raw: unknown) {
  const normalized = normalizeMessageId(raw)
  if (!normalized)
    return ''

  const directMatch = normalized.match(/((?:chat|subconscious|reminder):[\w:-]+)/)
  return directMatch?.[1] ?? ''
}

function normalizeCreatedAt(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : null
}

function compareMessageOrder(left: ChatHistoryItem, right: ChatHistoryItem) {
  const leftCreatedAt = normalizeCreatedAt(left.createdAt) ?? 0
  const rightCreatedAt = normalizeCreatedAt(right.createdAt) ?? 0
  if (leftCreatedAt !== rightCreatedAt)
    return leftCreatedAt - rightCreatedAt

  const leftRole = String(left.role ?? '')
  const rightRole = String(right.role ?? '')
  if (leftRole !== rightRole) {
    if (leftRole === 'user')
      return -1
    if (rightRole === 'user')
      return 1
    return leftRole.localeCompare(rightRole)
  }

  return normalizeMessageId(left.id).localeCompare(normalizeMessageId(right.id))
}

function areMessageArraysStructurallyEqual(left: ChatHistoryItem[], right: ChatHistoryItem[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function getDuplicateToleranceMs(role: ChatHistoryItem['role']) {
  return role === 'assistant' ? 15_000 : 6_000
}

function getMessageRichnessScore(message: ChatHistoryItem) {
  let score = 0

  if (extractStableTurnId(message.id))
    score += 100

  const text = extractMessageContent(message).trim()
  if (text)
    score += Math.min(text.length, 80)

  if (message.role === 'assistant') {
    const assistant = message as Extract<ChatHistoryItem, { role: 'assistant' }>
    if (assistant.origin)
      score += 8
    if (assistant.structured?.reply?.trim())
      score += 16
    if (assistant.structured?.thought?.trim())
      score += 12
    score += assistant.slices?.length ?? 0
    score += assistant.tool_results?.length ?? 0
  }

  if (normalizeCreatedAt(message.createdAt) !== null)
    score += 1

  return score
}

function choosePreferredMessage(left: ChatHistoryItem, right: ChatHistoryItem) {
  const leftScore = getMessageRichnessScore(left)
  const rightScore = getMessageRichnessScore(right)
  if (rightScore > leftScore)
    return { primary: right, secondary: left }
  return { primary: left, secondary: right }
}

function cloneValue<T>(value: T): T {
  if (value === undefined)
    return value

  return JSON.parse(JSON.stringify(value)) as T
}

function mergeExecutionStatus(
  existing: ChatSlicesExecutionStatus,
  next: ChatSlicesExecutionStatus,
) {
  if (!shouldReplaceToolSettlement({
    existingStatus: existing.phase,
    nextStatus: next.phase,
    terminalStatuses: settledExecutionPhases,
    deadLetteredStatuses: deadLetteredExecutionPhases,
  })) {
    return existing
  }

  return {
    ...existing,
    ...next,
    toolName: next.toolName ?? existing.toolName,
    elapsedMs: next.elapsedMs ?? existing.elapsedMs,
    timeoutMs: next.timeoutMs ?? existing.timeoutMs,
    errorCode: next.errorCode ?? existing.errorCode,
    errorMessage: next.errorMessage ?? existing.errorMessage,
    signal: next.signal ?? existing.signal,
    adapterEventType: next.adapterEventType ?? existing.adapterEventType,
    itemType: next.itemType ?? existing.itemType,
    summary: next.summary ?? existing.summary,
    command: next.command ?? existing.command,
    commandStatus: next.commandStatus ?? existing.commandStatus,
    commandExitCode: next.commandExitCode ?? existing.commandExitCode,
    outputPreview: next.outputPreview ?? existing.outputPreview,
    source: next.source ?? existing.source,
    category: next.category ?? existing.category,
  }
}

function extractToolResultStatus(result: unknown) {
  if (!result || typeof result !== 'object' || Array.isArray(result))
    return ''

  const record = result as Record<string, unknown>
  const status = typeof record.status === 'string'
    ? record.status
    : record.finalStatus
  return typeof status === 'string' ? status.trim().toLowerCase() : ''
}

function hasMeaningfulToolResult(result: unknown) {
  if (result === undefined || result === null)
    return false
  if (typeof result === 'string')
    return result.trim().length > 0
  if (Array.isArray(result))
    return result.length > 0
  if (typeof result === 'object')
    return Object.keys(result).length > 0
  return true
}

function mergeToolResultValue(existing: unknown, next: unknown) {
  if (!hasMeaningfulToolResult(next))
    return existing
  if (!hasMeaningfulToolResult(existing))
    return next

  const existingStatus = extractToolResultStatus(existing)
  const nextStatus = extractToolResultStatus(next)
  if (!shouldReplaceToolSettlement({
    existingStatus,
    nextStatus,
    terminalStatuses: settledToolResultStatuses,
    deadLetteredStatuses: deadLetteredToolResultStatuses,
  })) {
    return existing
  }

  if (
    existing
    && next
    && typeof existing === 'object'
    && typeof next === 'object'
    && !Array.isArray(existing)
    && !Array.isArray(next)
  ) {
    return {
      ...existing,
      ...next,
    }
  }

  return next
}

function mergeToolResult(existing: ChatToolResult, next: ChatToolResult): ChatToolResult {
  return {
    ...existing,
    ...next,
    result: mergeToolResultValue(existing.result, next.result),
  }
}

function mergeToolCallResultSlice(
  existing: ChatSlicesToolCallResult,
  next: ChatSlicesToolCallResult,
): ChatSlicesToolCallResult {
  return {
    ...existing,
    ...next,
    result: mergeToolResultValue(existing.result, next.result),
  }
}

function sanitizeCanonicalMessage(message: ChatHistoryItem) {
  const cloned = cloneValue(message)
  if (cloned.role !== 'assistant' || !cloned.structured)
    return cloned

  cloned.structured = normalizeDialogueStructuredArtifact(cloned.structured)
  return cloned
}

function areMessagesEquivalent(left: ChatHistoryItem, right: ChatHistoryItem) {
  if (left.role !== right.role)
    return false

  const leftStableTurnId = extractStableTurnId(left.id)
  const rightStableTurnId = extractStableTurnId(right.id)
  if (leftStableTurnId && rightStableTurnId)
    return leftStableTurnId === rightStableTurnId

  if (left.role !== 'assistant' && left.role !== 'user')
    return false

  const leftText = extractMessageContent(left).trim()
  const rightText = extractMessageContent(right).trim()
  if (!leftText || leftText !== rightText)
    return false

  const leftCreatedAt = normalizeCreatedAt(left.createdAt)
  const rightCreatedAt = normalizeCreatedAt(right.createdAt)
  if (leftCreatedAt === null || rightCreatedAt === null)
    return false

  if (leftStableTurnId || rightStableTurnId)
    return Math.abs(leftCreatedAt - rightCreatedAt) <= getDuplicateToleranceMs(left.role)

  return leftCreatedAt === rightCreatedAt
}

function mergeEquivalentMessages(left: ChatHistoryItem, right: ChatHistoryItem): ChatHistoryItem {
  const { primary, secondary } = choosePreferredMessage(left, right)
  const merged = {
    ...cloneValue(secondary),
    ...cloneValue(primary),
  } as ChatHistoryItem

  const primaryStableTurnId = extractStableTurnId(primary.id)
  const secondaryStableTurnId = extractStableTurnId(secondary.id)
  merged.id = primaryStableTurnId
    || secondaryStableTurnId
    || normalizeMessageId(primary.id)
    || normalizeMessageId(secondary.id)
    || undefined
  if (!merged.id)
    delete merged.id

  const primaryCreatedAt = normalizeCreatedAt(primary.createdAt)
  const secondaryCreatedAt = normalizeCreatedAt(secondary.createdAt)
  merged.createdAt = primaryCreatedAt
    ?? secondaryCreatedAt
    ?? merged.createdAt
  if (merged.createdAt === undefined)
    delete merged.createdAt

  const primaryText = extractMessageContent(primary).trim()
  const secondaryText = extractMessageContent(secondary).trim()
  if (!primaryText && secondaryText)
    merged.content = cloneValue(secondary.content)

  if (merged.role === 'assistant') {
    const leftAssistant = left as ChatAssistantMessage
    const rightAssistant = right as ChatAssistantMessage
    const primaryAssistant = primary as ChatAssistantMessage
    const secondaryAssistant = secondary as ChatAssistantMessage
    const mergedAssistant = merged as ChatAssistantMessage

    mergedAssistant.origin = primaryAssistant.origin ?? secondaryAssistant.origin
    const mergedSlices = cloneValue(leftAssistant.slices) ?? []
    for (const slice of cloneValue(rightAssistant.slices) ?? []) {
      if (slice.type === 'execution-status' && slice.toolCallId) {
        const existingIndex = mergedSlices.findIndex(candidate => (
          candidate.type === 'execution-status'
          && candidate.toolCallId === slice.toolCallId
        ))
        if (existingIndex >= 0) {
          const existing = mergedSlices[existingIndex]
          if (existing?.type === 'execution-status')
            mergedSlices.splice(existingIndex, 1, mergeExecutionStatus(existing, slice))
          continue
        }
      }
      if (slice.type === 'tool-call-result') {
        const existingIndex = mergedSlices.findIndex(candidate => (
          candidate.type === 'tool-call-result'
          && candidate.id === slice.id
        ))
        if (existingIndex >= 0) {
          const existing = mergedSlices[existingIndex]
          if (existing?.type === 'tool-call-result')
            mergedSlices.splice(existingIndex, 1, mergeToolCallResultSlice(existing, slice))
          continue
        }
      }
      if (slice.type === 'tool-call') {
        const toolCallId = typeof slice.toolCall?.toolCallId === 'string' ? slice.toolCall.toolCallId : ''
        const existingIndex = toolCallId
          ? mergedSlices.findIndex(candidate => (
              candidate.type === 'tool-call'
              && candidate.toolCall?.toolCallId === toolCallId
            ))
          : -1
        if (existingIndex >= 0) {
          mergedSlices.splice(existingIndex, 1, slice)
          continue
        }
      }
      if (
        slice.type === 'text'
        && mergedSlices.some(candidate => candidate.type === 'text' && candidate.text === slice.text)
      ) {
        continue
      }
      mergedSlices.push(slice)
    }
    mergedAssistant.slices = mergedSlices

    const mergedToolResults = cloneValue(leftAssistant.tool_results) ?? []
    for (const result of cloneValue(rightAssistant.tool_results) ?? []) {
      const existingIndex = mergedToolResults.findIndex(candidate => candidate.id === result.id)
      if (existingIndex >= 0)
        mergedToolResults.splice(existingIndex, 1, mergeToolResult(mergedToolResults[existingIndex], result))
      else
        mergedToolResults.push(result)
    }
    mergedAssistant.tool_results = mergedToolResults

    const primaryStructuredScore = primaryAssistant.structured?.thought?.trim()
      || primaryAssistant.structured?.reply?.trim()
      ? 1
      : 0
    const secondaryStructuredScore = secondaryAssistant.structured?.thought?.trim()
      || secondaryAssistant.structured?.reply?.trim()
      ? 1
      : 0
    const preferredStructured = normalizeDialogueStructuredArtifact(
      primaryStructuredScore >= secondaryStructuredScore
        ? cloneValue(primaryAssistant.structured)
        : cloneValue(secondaryAssistant.structured),
    )
    const fallbackStructured = normalizeDialogueStructuredArtifact(
      primaryStructuredScore >= secondaryStructuredScore
        ? cloneValue(secondaryAssistant.structured)
        : cloneValue(primaryAssistant.structured),
    )
    const mergedStructured = preferredStructured && fallbackStructured
      ? {
          ...fallbackStructured,
          ...preferredStructured,
        }
      : preferredStructured ?? fallbackStructured
    mergedAssistant.structured = normalizeDialogueStructuredArtifact(mergedStructured)
    mergedAssistant.categorization = primaryAssistant.categorization?.speech?.trim()
      ? cloneValue(primaryAssistant.categorization)
      : cloneValue(secondaryAssistant.categorization)
  }

  return merged
}

export function canonicalizeSessionMessages(messages: ChatHistoryItem[]) {
  const canonical: ChatHistoryItem[] = []

  for (const message of messages) {
    const duplicateIndex = canonical.findIndex(existing => areMessagesEquivalent(existing, message))
    if (duplicateIndex === -1) {
      canonical.push(sanitizeCanonicalMessage(message))
      continue
    }

    canonical[duplicateIndex] = mergeEquivalentMessages(canonical[duplicateIndex], message)
  }

  // NOTICE: SQLite conversation turns persist one shared created_at for both the
  // user prompt and the assistant reply of the same turn. When timestamps tie, the
  // user bubble must stay ahead of the assistant bubble or the chat visually flips.
  return canonical.sort(compareMessageOrder)
}

export function mergeLoadedSessionMessages(storedMessages: ChatHistoryItem[], currentMessages: ChatHistoryItem[]) {
  const canonicalStoredMessages = canonicalizeSessionMessages(storedMessages)
  const safeStoredMessages = areMessageArraysStructurallyEqual(canonicalStoredMessages, storedMessages)
    ? storedMessages
    : canonicalStoredMessages

  if (currentMessages.length === 0)
    return safeStoredMessages

  const currentNonSystemMessages = currentMessages.filter((message, index) => index !== 0 || message.role !== 'system')
  if (currentNonSystemMessages.length === 0)
    return safeStoredMessages

  const systemMessage = safeStoredMessages[0]?.role === 'system'
    ? safeStoredMessages[0]
    : currentMessages[0]?.role === 'system'
      ? currentMessages[0]
      : undefined

  const merged = canonicalizeSessionMessages([
    ...safeStoredMessages,
    ...currentNonSystemMessages,
  ])
  if (areMessageArraysStructurallyEqual(merged, safeStoredMessages))
    return safeStoredMessages

  if (safeStoredMessages.length === 0 && systemMessage && merged[0]?.role !== 'system')
    return canonicalizeSessionMessages([systemMessage, ...merged])

  return merged
}
