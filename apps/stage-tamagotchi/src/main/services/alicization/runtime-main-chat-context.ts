import type {
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type {
  AlicizationExecutionCallbackContext,
} from './execution-callback-runtime'
import type {
  AlicizationExecutionLedgerContext,
} from './memory-ledger-runtime'

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
  ensureActiveOrLatestSessionId: (
    cardId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<string>
  buildPendingExecutionCallbackContext: (input: {
    consume?: boolean
    sessionId: string
    signal?: AbortSignal
  }) => Promise<AlicizationExecutionCallbackContext>
  buildExecutionLedgerContext: (input: {
    sessionId: string
    signal?: AbortSignal
  }) => Promise<AlicizationExecutionLedgerContext>
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

  async function resolveCurrentSessionId(signal?: AbortSignal) {
    try {
      return await ensureActiveOrLatestSessionId(getActiveCardId(), { signal })
    }
    catch (error) {
      if (signal?.aborted || error instanceof Error && error.name === 'AbortError')
        throw error
      return ''
    }
  }

  async function buildMainChatExecutionCallbackContext(
    payload: AlicizationChatStartPayload,
    ownerOptions?: { signal?: AbortSignal },
  ): Promise<AlicizationExecutionCallbackContext> {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText)
      return emptyAlicizationExecutionCallbackContext

    const sessionId = await resolveCurrentSessionId(ownerOptions?.signal)
    if (!sessionId)
      return emptyAlicizationExecutionCallbackContext

    return await buildPendingExecutionCallbackContext({
      consume: false,
      sessionId,
      signal: ownerOptions?.signal,
    })
  }

  async function buildMainChatExecutionLedgerContext(
    payload: AlicizationChatStartPayload,
    ownerOptions?: { signal?: AbortSignal },
  ): Promise<AlicizationExecutionLedgerContext> {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText)
      return emptyAlicizationExecutionLedgerContext

    const sessionId = await resolveCurrentSessionId(ownerOptions?.signal)
    if (!sessionId)
      return emptyAlicizationExecutionLedgerContext

    return await buildExecutionLedgerContext({
      sessionId,
      signal: ownerOptions?.signal,
    })
  }

  async function buildMainChatContextualString(
    payload: AlicizationChatStartPayload,
    _ownerOptions?: { signal?: AbortSignal },
  ) {
    const currentUserText = readMainChatCurrentUserText(payload)
    if (!currentUserText)
      return ''
    return `U: ${currentUserText}`
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
