import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAuditLogInput,
  AlicizationChatStartPayload,
} from '../../../shared/eventa'
import type { attachSynthesizedReflections, buildDialogueReplyFeedbackOutcomeClosure, deriveDialogueReplyFeedbackKind } from './outcome-reinforcement'

import {
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationRuntimeDigest,
  readAffectiveResidueFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'

import { isAlicizationAutonomousDialogueFamily } from './runtime-structured-format'

type AlicizationDialogueReplyFeedbackKind = NonNullable<ReturnType<typeof deriveDialogueReplyFeedbackKind>>

interface DialogueFeedbackConversationRow {
  turnId?: string | null
  sessionId: string
  assistantText?: string | null
  structuredJson?: string | null
  createdAt: number
}

interface AlicizationFeedbackMemoryExperience {
  felt?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  tags?: string[] | null
}

function extractStructuredAffectiveResidue(
  structured: Record<string, unknown> | null,
): AlicizationAffectiveResidueMemorySnapshot | null {
  const runtimeDigest = normalizeAlicizationRuntimeDigest(structured?.runtimeDigest ?? null)
  const runtimeDigestResidue = runtimeDigest?.affectiveResidue
    ?? runtimeDigest?.derivedMindStateBundle?.affectiveResidue
  if (runtimeDigestResidue)
    return runtimeDigestResidue

  const derivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle(structured?.derivedMindStateBundle ?? null)
  return readAffectiveResidueFromDerivedMindStateBundle(derivedMindStateBundle)
}

function extractDialogueFeedbackExperienceFromClosure(
  closure: {
    episodicEvents?: Array<{
      sourceKind?: unknown
      felt?: unknown
      relationshipMeaning?: unknown
      lesson?: unknown
      tags?: unknown
    }>
  } | null | undefined,
  sanitizeText: CreateAlicizationRuntimeDialogueFeedbackOptions['sanitizeText'],
): AlicizationFeedbackMemoryExperience | null {
  const event = closure?.episodicEvents?.find(item => sanitizeText(item?.sourceKind, '') === 'dialogue-feedback')
    ?? closure?.episodicEvents?.[0]
  if (!event)
    return null

  const tags = Array.isArray(event.tags)
    ? event.tags.map(tag => sanitizeText(tag, '').slice(0, 64)).filter(Boolean).slice(0, 12)
    : []
  const felt = sanitizeText(event.felt, '').slice(0, 220) || null
  const relationshipMeaning = sanitizeText(event.relationshipMeaning, '').slice(0, 240) || null
  const lesson = sanitizeText(event.lesson, '').slice(0, 240) || null

  if (!felt && !relationshipMeaning && !lesson && tags.length === 0)
    return null

  return {
    felt,
    relationshipMeaning,
    lesson,
    tags,
  }
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
      feedbackExperience?: AlicizationFeedbackMemoryExperience | null
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
  const structured = input.parseStoredConversationStructured(input.row.structuredJson)
  return !isAlicizationAutonomousDialogueFamily({
    turnId: input.sanitizeText(input.row.turnId, ''),
    rawFormat: input.sanitizeText(structured?.format, ''),
  })
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
    const normalizedPayload = payload
    const cardId = options.normalizeCardId(normalizedPayload.cardId)
    const userText = options.readLatestUserMessageText(normalizedPayload.messages)
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
    const affectiveResidue = extractStructuredAffectiveResidue(structured)
    const closure = options.attachSynthesizedReflections(options.buildDialogueReplyFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId,
      turnId: options.sanitizeText(latest.turnId, '') || null,
      feedback,
      previousAssistantText: latest.assistantText ?? '',
      affectiveResidue,
    }))
    const feedbackExperience = extractDialogueFeedbackExperienceFromClosure(closure, options.sanitizeText)
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
      feedbackExperience,
    })
    const previousDynamics = await options.alicizationDb.getLatestRelationshipDynamics().catch(() => null)
    const hostAttitude = `dialogue_feedback=${feedback}`
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
