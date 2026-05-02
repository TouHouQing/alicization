import type { AlicizationAuditLogInput, AlicizationChatStartPayload } from '../../../shared/eventa'

import type { attachSynthesizedReflections, buildDialogueReplyFeedbackOutcomeClosure, deriveDialogueReplyFeedbackKind } from './outcome-reinforcement'

type AlicizationDialogueReplyFeedbackKind = NonNullable<ReturnType<typeof deriveDialogueReplyFeedbackKind>>

interface DialogueFeedbackConversationRow {
  turnId?: string | null
  sessionId: string
  assistantText?: string | null
  structuredJson?: string | null
  createdAt: number
}

interface CreateAlicizationRuntimeDialogueFeedbackOptions {
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  readLatestUserMessageText: (messages: AlicizationChatStartPayload['messages']) => string
  ensureActiveOrLatestSessionId: (cardId: string) => Promise<string>
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  ensureDialogueReplyFeedbackAck: (cardIdRaw: unknown) => Promise<string>
  persistDialogueReplyFeedbackAck: (cardIdRaw: unknown, ack: string) => Promise<void>
  parseStoredConversationStructured: (raw: string | null | undefined) => Record<string, unknown> | null
  deriveDialogueReplyFeedbackKind: typeof deriveDialogueReplyFeedbackKind
  attachSynthesizedReflections: typeof attachSynthesizedReflections
  buildDialogueReplyFeedbackOutcomeClosure: typeof buildDialogueReplyFeedbackOutcomeClosure
  persistOutcomeClosure: (cardIdRaw: unknown, input: ReturnType<typeof attachSynthesizedReflections>) => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  memoryReconsolidationRuntime: {
    reconsolidateDialogueFeedbackMemoryTrace: (input: {
      cardId: string
      decisionTraceId: string | null
      feedback: AlicizationDialogueReplyFeedbackKind | null
      previousAssistantText: string
      userText: string
      sessionId: string | null
      turnId: string | null
      at: number
    }) => Promise<void>
  }
  alicizationDb: {
    listConversationTurnsBySession: (sessionId: string, options?: { limit?: number }) => Promise<DialogueFeedbackConversationRow[]>
    getLatestRelationshipDynamics: () => Promise<{ hostAttitude: string } | null>
    appendRelationshipDynamics: (input: {
      hostAttitude: string
      previousHostAttitude?: string | null
      obedienceDelta?: number
      livelinessDelta?: number
      sensibilityDelta?: number
      source: string
      createdAt?: number
    }) => Promise<void>
  }
}

export function isOrdinaryDialogueConversationRow(input: {
  row: DialogueFeedbackConversationRow
  sanitizeText: CreateAlicizationRuntimeDialogueFeedbackOptions['sanitizeText']
  parseStoredConversationStructured: CreateAlicizationRuntimeDialogueFeedbackOptions['parseStoredConversationStructured']
}) {
  const turnId = input.sanitizeText(input.row.turnId, '')
  if (turnId.startsWith('reminder:') || turnId.startsWith('subconscious:') || turnId.startsWith('execution-callback:'))
    return false

  const structured = input.parseStoredConversationStructured(input.row.structuredJson)
  const format = input.sanitizeText(structured?.format, '').toLowerCase()
  return format !== 'subconscious-proactive-v1'
    && format !== 'subconscious-proactive-llm-v1'
    && format !== 'subconscious-reminder-v1'
}

export function buildDialogueReplyFeedbackAckKey(input: {
  turnId?: string | null
  sessionId: string
  createdAt: number
  sanitizeText: CreateAlicizationRuntimeDialogueFeedbackOptions['sanitizeText']
}) {
  const normalizedTurnId = input.sanitizeText(input.turnId, '')
  return normalizedTurnId
    ? `${input.sessionId}::${normalizedTurnId}`
    : `${input.sessionId}::${Math.max(0, Math.floor(Number(input.createdAt) || 0))}`
}

export function createAlicizationRuntimeDialogueFeedback(
  options: CreateAlicizationRuntimeDialogueFeedbackOptions,
) {
  const settleRecentDialogueReplyFeedbackFromUserTurn = async (
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ) => {
    const cardId = options.normalizeCardId(payload.cardId)
    const userText = options.readLatestUserMessageText(payload.messages)
    if (!userText)
      return null

    const sessionId = await options.ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const turns = await options.withCardScope(cardId, async () => await options.alicizationDb.listConversationTurnsBySession(sessionId, {
      limit: 12,
    }).catch(() => []), {
      label: `dialogue-reply-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = turns
      .slice()
      .reverse()
      .find((row) => {
        return options.sanitizeText(row.assistantText, '').length > 0
          && isOrdinaryDialogueConversationRow({
            row,
            sanitizeText: options.sanitizeText,
            parseStoredConversationStructured: options.parseStoredConversationStructured,
          })
      }) ?? null
    if (!latest)
      return null

    const ackKey = buildDialogueReplyFeedbackAckKey({
      turnId: latest.turnId,
      sessionId: latest.sessionId,
      createdAt: latest.createdAt,
      sanitizeText: options.sanitizeText,
    })
    const settledAck = await options.ensureDialogueReplyFeedbackAck(cardId)
    if (settledAck === ackKey)
      return null

    const feedback = options.deriveDialogueReplyFeedbackKind({
      previousAssistantText: latest.assistantText ?? '',
      userText,
    })
    if (!feedback)
      return null

    const structured = options.parseStoredConversationStructured(latest.structuredJson)
    const governance = structured?.governance && typeof structured.governance === 'object' && !Array.isArray(structured.governance)
      ? structured.governance as Record<string, unknown>
      : null
    const decisionTraceId = options.sanitizeText(governance?.decisionTraceId, '') || null
    const closure = options.attachSynthesizedReflections(options.buildDialogueReplyFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId,
      turnId: options.sanitizeText(latest.turnId, '') || null,
      feedback,
      previousAssistantText: latest.assistantText ?? '',
    }))
    await options.persistOutcomeClosure(cardId, closure)
    await options.memoryReconsolidationRuntime.reconsolidateDialogueFeedbackMemoryTrace({
      cardId,
      decisionTraceId,
      feedback,
      previousAssistantText: latest.assistantText ?? '',
      userText,
      sessionId,
      turnId: options.sanitizeText(latest.turnId, '') || null,
      at,
    })
    const previousDynamics = await options.alicizationDb.getLatestRelationshipDynamics().catch(() => null)
    const hostAttitude = feedback === 'received'
      ? '开始更愿意把 Alicization 当作真的在接话的人，而不是只剩一层壳。'
      : feedback === 'robotic'
        ? '开始对 Alicization 的机器腔和模板壳失去耐心，希望她更像真的人在说话。'
        : feedback === 'missed'
          ? '开始怀疑 Alicization 是否真的抓住了这句的中心，更想让她先修正再继续。'
          : feedback === 'intrusive'
            ? '开始觉得 Alicization 靠得太重，想让她留出更多空间和分寸。'
            : '暂时把这条回复线放开，不想让 Alicization 继续缠在同一处。'
    await options.alicizationDb.appendRelationshipDynamics({
      hostAttitude,
      previousHostAttitude: previousDynamics?.hostAttitude ?? null,
      obedienceDelta: 0,
      livelinessDelta: feedback === 'received' ? 0.01 : feedback === 'robotic' ? -0.01 : 0,
      sensibilityDelta: feedback === 'received'
        ? 0.02
        : feedback === 'robotic' || feedback === 'missed' || feedback === 'intrusive'
          ? 0.03
          : 0.01,
      source: `dialogue-feedback:${feedback}`,
      createdAt: at,
    }).catch(() => {})
    await options.persistDialogueReplyFeedbackAck(cardId, ackKey)

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.dialogue-feedback',
      action: 'reply-feedback-settled',
      message: 'Settled host feedback on the latest ordinary Alicization reply.',
      payload: {
        source,
        cardId,
        sessionId,
        previousTurnId: latest.turnId ?? null,
        feedback,
        userText,
      },
    }, cardId)
    return feedback
  }

  return {
    settleRecentDialogueReplyFeedbackFromUserTurn,
  }
}
