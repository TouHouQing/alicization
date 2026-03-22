import type { ChatHistoryItem } from '../../types/chat'

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
    const primaryAssistant = primary as Extract<ChatHistoryItem, { role: 'assistant' }>
    const secondaryAssistant = secondary as Extract<ChatHistoryItem, { role: 'assistant' }>
    const mergedAssistant = merged as Extract<ChatHistoryItem, { role: 'assistant' }>

    mergedAssistant.origin = primaryAssistant.origin ?? secondaryAssistant.origin
    mergedAssistant.slices = (primaryAssistant.slices?.length ?? 0) >= (secondaryAssistant.slices?.length ?? 0)
      ? cloneValue(primaryAssistant.slices) ?? []
      : cloneValue(secondaryAssistant.slices) ?? []
    mergedAssistant.tool_results = (primaryAssistant.tool_results?.length ?? 0) >= (secondaryAssistant.tool_results?.length ?? 0)
      ? cloneValue(primaryAssistant.tool_results) ?? []
      : cloneValue(secondaryAssistant.tool_results) ?? []

    const primaryStructuredScore = primaryAssistant.structured?.thought?.trim()
      || primaryAssistant.structured?.reply?.trim()
      ? 1
      : 0
    const secondaryStructuredScore = secondaryAssistant.structured?.thought?.trim()
      || secondaryAssistant.structured?.reply?.trim()
      ? 1
      : 0
    mergedAssistant.structured = primaryStructuredScore >= secondaryStructuredScore
      ? cloneValue(primaryAssistant.structured)
      : cloneValue(secondaryAssistant.structured)
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
      canonical.push(cloneValue(message))
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
  if (currentMessages.length === 0)
    return storedMessages

  const currentNonSystemMessages = currentMessages.filter((message, index) => index !== 0 || message.role !== 'system')
  if (currentNonSystemMessages.length === 0)
    return storedMessages

  const systemMessage = storedMessages[0]?.role === 'system'
    ? storedMessages[0]
    : currentMessages[0]?.role === 'system'
      ? currentMessages[0]
      : undefined

  const merged = canonicalizeSessionMessages([
    ...storedMessages,
    ...currentNonSystemMessages,
  ])
  if (areMessageArraysStructurallyEqual(merged, storedMessages))
    return storedMessages

  if (storedMessages.length === 0 && systemMessage && merged[0]?.role !== 'system')
    return canonicalizeSessionMessages([systemMessage, ...merged])

  return merged
}
