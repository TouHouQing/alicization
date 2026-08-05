import type {
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type {
  AlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import type {
  AlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'
import type { ContextualConversationTurn } from './runtime-soul'

interface AlicizationInspectionIntentFromHistoryInput {
  messages: AlicizationChatStartPayload['messages']
  userText: string
}

type AlicizationLooseTransportMessages = Array<{ role?: string, content?: unknown }>

interface CreateAlicizationMainChatContextRuntimeOptions {
  getActiveCardId: () => string
  normalizeOrganicRecallText: (raw: string) => string
  readTransportContentAsText: (content: unknown) => string
  emptyAlicizationExecutionCallbackContext: AlicizationExecutionCallbackContext
  emptyAlicizationExecutionLedgerContext: AlicizationExecutionLedgerContext
  ensureActiveOrLatestSessionId: (cardId: string) => Promise<string>
  buildPendingExecutionCallbackContext: (input: {
    consume?: boolean
    sessionId: string
  }) => Promise<AlicizationExecutionCallbackContext>
  buildExecutionLedgerContext: (input: {
    sessionId: string
    userText: string
    recentTurns: ContextualConversationTurn[]
  }) => Promise<AlicizationExecutionLedgerContext>
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
    emptyAlicizationExecutionCallbackContext,
    emptyAlicizationExecutionLedgerContext,
    ensureActiveOrLatestSessionId,
    buildPendingExecutionCallbackContext,
    buildExecutionLedgerContext,
    resolveRecentContextualTurns,
    shouldExtendContextualRecall,
    resolveInspectionIntentFromMessageHistory,
    detectInvitedInspectionIntent,
  } = options

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
    if (!currentUserText)
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
    if (!currentUserText)
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

  async function buildMainChatContextualString(payload: AlicizationChatStartPayload) {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText)
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
    if (!latestUserText || !resolveInspectionIntentFromMessageHistory({
      userText: latestUserText,
      messages,
    })) {
      return messages
    }

    let inspectionContextActive = false
    return messages.filter((message, index) => {
      const role = typeof message?.role === 'string' ? message.role : ''
      if (role === 'user') {
        const userText = normalizeOrganicRecallText(readTransportContentAsText(message.content))
        inspectionContextActive = detectInvitedInspectionIntent(userText).active
        return true
      }

      if (role === 'assistant' && inspectionContextActive && index < messages.length - 1)
        return false

      return true
    })
  }

  return {
    readMainChatCurrentUserText,
    buildMainChatExecutionCallbackContext,
    buildMainChatExecutionLedgerContext,
    buildMainChatContextualString,
    readLatestUserMessageText,
    readLatestAssistantMessageText,
    redactStaleInspectionHistoryMessages,
  }
}
