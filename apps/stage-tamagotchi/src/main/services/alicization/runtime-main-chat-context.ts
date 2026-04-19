import type {
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type {
  AlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import type {
  AlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import type { AlicizationPendingAffirmationThreadCandidate } from './main-chat-action-obligation'
import type { ContextualConversationTurn } from './runtime-soul'
import type { AlicizationTaskThreadRecord } from '../../../shared/eventa'

interface AlicizationInspectionIntentFromHistoryInput {
  messages: AlicizationChatStartPayload['messages']
  userText: string
}

type AlicizationLooseTransportMessages = Array<{ role?: string, content?: unknown }>

interface CreateAlicizationMainChatContextRuntimeOptions {
  getActiveCardId: () => string
  normalizeOrganicRecallText: (raw: string) => string
  readTransportContentAsText: (content: unknown) => string
  isInternalAlicizationRepairPrompt: (text: string) => boolean
  emptyAlicizationExecutionCallbackContext: AlicizationExecutionCallbackContext
  emptyAlicizationExecutionLedgerContext: AlicizationExecutionLedgerContext
  ensureActiveOrLatestSessionId: (cardId: string) => Promise<string>
  buildPendingExecutionCallbackContext: (input: {
    sessionId: string
  }) => Promise<AlicizationExecutionCallbackContext>
  buildExecutionLedgerContext: (input: {
    sessionId: string
    userText: string
    recentTurns: ContextualConversationTurn[]
  }) => Promise<AlicizationExecutionLedgerContext>
  listTaskThreadsBySession: (input: {
    sessionId: string
    status: AlicizationTaskThreadRecord['status'][]
    limit: number
  }) => Promise<AlicizationTaskThreadRecord[]>
  resolveRecentContextualTurns: (sessionId: string, limit: number) => Promise<ContextualConversationTurn[]>
  shouldExtendContextualRecall: (userText: string) => boolean
  resolveInspectionIntentFromMessageHistory: (input: AlicizationInspectionIntentFromHistoryInput) => boolean
  detectInvitedInspectionIntent: (message: string) => {
    active: boolean
  }
}

export function createAlicizationMainChatContextRuntime(options: CreateAlicizationMainChatContextRuntimeOptions) {
  const {
    getActiveCardId,
    normalizeOrganicRecallText,
    readTransportContentAsText,
    isInternalAlicizationRepairPrompt,
    emptyAlicizationExecutionCallbackContext,
    emptyAlicizationExecutionLedgerContext,
    ensureActiveOrLatestSessionId,
    buildPendingExecutionCallbackContext,
    buildExecutionLedgerContext,
    listTaskThreadsBySession,
    resolveRecentContextualTurns,
    shouldExtendContextualRecall,
    resolveInspectionIntentFromMessageHistory,
    detectInvitedInspectionIntent,
  } = options

  function sanitizeText(raw: unknown, maxChars = 220) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  }

  function asRecord(raw: unknown) {
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : null
  }

  function asStringArray(raw: unknown) {
    return Array.isArray(raw)
      ? raw.map(value => sanitizeText(value, 120)).filter(Boolean)
      : []
  }

  function readMainChatCurrentUserText(payload: AlicizationChatStartPayload) {
    for (let index = payload.messages.length - 1; index >= 0; index -= 1) {
      const message = payload.messages[index]
      if (message?.role !== 'user')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  async function buildMainChatExecutionCallbackContext(payload: AlicizationChatStartPayload): Promise<AlicizationExecutionCallbackContext> {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return emptyAlicizationExecutionCallbackContext

    const sessionId = await ensureActiveOrLatestSessionId(getActiveCardId()).catch(() => '')
    if (!sessionId)
      return emptyAlicizationExecutionCallbackContext

    return await buildPendingExecutionCallbackContext({
      sessionId,
    })
  }

  async function buildMainChatExecutionLedgerContext(payload: AlicizationChatStartPayload): Promise<AlicizationExecutionLedgerContext> {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return emptyAlicizationExecutionLedgerContext

    const sessionId = await ensureActiveOrLatestSessionId(getActiveCardId()).catch(() => '')
    if (!sessionId)
      return emptyAlicizationExecutionLedgerContext

    const recentTurns = await resolveRecentContextualTurns(sessionId, 3)
    return await buildExecutionLedgerContext({
      sessionId,
      userText: currentUserText,
      recentTurns,
    })
  }

  async function buildMainChatPendingAffirmationThread(payload: AlicizationChatStartPayload): Promise<AlicizationPendingAffirmationThreadCandidate | null> {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return null

    const sessionId = await ensureActiveOrLatestSessionId(getActiveCardId()).catch(() => '')
    if (!sessionId)
      return null

    const threads = await listTaskThreadsBySession({
      sessionId,
      status: ['needs-affirmation'],
      limit: 6,
    }).catch(() => [])
    const latest = threads
      .slice()
      .sort((left, right) =>
        Math.max(
          Number(right.completedAt ?? 0),
          Number(right.lastEventAt ?? 0),
          Number(right.updatedAt ?? 0),
          Number(right.createdAt ?? 0),
        ) - Math.max(
          Number(left.completedAt ?? 0),
          Number(left.lastEventAt ?? 0),
          Number(left.updatedAt ?? 0),
          Number(left.createdAt ?? 0),
        ),
      )[0] ?? null
    if (!latest)
      return null

    const metadata = asRecord(latest.metadata)
    const fabric = asRecord(metadata?.fabric)
    return {
      threadId: sanitizeText(latest.id, 120),
      goal: sanitizeText(latest.goal, 220),
      summary: sanitizeText(latest.summary, 220),
      selectedChannel: sanitizeText(latest.selectedChannel, 48) as any || null,
      proposedChannel: sanitizeText(latest.proposedChannel, 48) as any || null,
      affirmationReasonCodes: asStringArray(fabric?.affirmationReasonCodes),
    }
  }

  async function buildMainChatContextualString(payload: AlicizationChatStartPayload) {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText || isInternalAlicizationRepairPrompt(currentUserText))
      return ''
    if (resolveInspectionIntentFromMessageHistory({
      userText: currentUserText,
      messages: payload.messages,
    })) {
      return `U: ${currentUserText}`
    }

    const recentTurnCount = shouldExtendContextualRecall(currentUserText) ? 3 : 2
    const sessionId = await ensureActiveOrLatestSessionId(getActiveCardId()).catch(() => '')
    const recentTurns = await resolveRecentContextualTurns(sessionId, recentTurnCount)
    return [
      ...recentTurns.map(turn => [
        turn.userText ? `U: ${turn.userText}` : '',
        turn.assistantText ? `A: ${turn.assistantText}` : '',
      ].filter(Boolean).join('\n')),
      `U: ${currentUserText}`,
    ].filter(Boolean).join('\n\n')
  }

  function readLatestUserMessageText(messages: AlicizationLooseTransportMessages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'user')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  function readLatestAssistantMessageText(messages: AlicizationLooseTransportMessages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role !== 'assistant')
        continue
      return normalizeOrganicRecallText(readTransportContentAsText(message.content))
    }
    return ''
  }

  function redactStaleInspectionHistoryMessages(
    messages: AlicizationChatStartPayload['messages'],
    latestUserText: string,
  ) {
    if (!latestUserText || isInternalAlicizationRepairPrompt(latestUserText) || !resolveInspectionIntentFromMessageHistory({
      userText: latestUserText,
      messages,
    })) {
      return messages
    }

    let inspectionContextActive = false
    return messages.map((message, index) => {
      const role = typeof message?.role === 'string' ? message.role : ''
      if (role === 'user') {
        const userText = normalizeOrganicRecallText(readTransportContentAsText(message.content))
        inspectionContextActive = detectInvitedInspectionIntent(userText).active
        return message
      }

      if (role === 'assistant' && inspectionContextActive && index < messages.length - 1) {
        return {
          ...message,
          content: '[Earlier Alicization screen-inspection reply intentionally omitted so the current screenshot can dominate.]',
        }
      }

      return message
    })
  }

  return {
    readMainChatCurrentUserText,
    buildMainChatExecutionCallbackContext,
    buildMainChatExecutionLedgerContext,
    buildMainChatPendingAffirmationThread,
    buildMainChatContextualString,
    readLatestUserMessageText,
    readLatestAssistantMessageText,
    redactStaleInspectionHistoryMessages,
  }
}
