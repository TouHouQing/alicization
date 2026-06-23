import type {
  AlicizationAuditLogInput,
  AlicizationChatStartPayload,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '../../../shared/eventa'
import type { AlicizationOutcomeClosureResult, buildExecutionProposalFeedbackOutcomeClosure, buildExecutionResultFeedbackOutcomeClosure, deriveExecutionProposalFeedbackKind, deriveExecutionResultFeedbackKind } from './outcome-reinforcement'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'

type AlicizationExecutionProposalFeedbackKind = NonNullable<ReturnType<typeof deriveExecutionProposalFeedbackKind>>
type AlicizationExecutionResultFeedbackKind = NonNullable<ReturnType<typeof deriveExecutionResultFeedbackKind>>

interface CreateAlicizationRuntimeExecutionFeedbackOptions {
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  readLatestUserMessageText: (messages: AlicizationChatStartPayload['messages']) => string
  readLatestAssistantMessageText: (messages: AlicizationChatStartPayload['messages']) => string
  ensureActiveOrLatestSessionId: (cardId: string) => Promise<string>
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  readTaskThreadActivityAt: (thread: AlicizationTaskThreadRecord) => number
  attachSynthesizedReflections: (input: AlicizationOutcomeClosureResult) => AlicizationOutcomeClosureResult
  buildExecutionProposalFeedbackOutcomeClosure: typeof buildExecutionProposalFeedbackOutcomeClosure
  buildExecutionResultFeedbackOutcomeClosure: typeof buildExecutionResultFeedbackOutcomeClosure
  deriveExecutionProposalFeedbackKind: typeof deriveExecutionProposalFeedbackKind
  deriveExecutionResultFeedbackKind: typeof deriveExecutionResultFeedbackKind
  persistOutcomeClosure: (cardIdRaw: unknown, input: AlicizationOutcomeClosureResult) => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  memoryReconsolidationRuntime?: unknown
  alicizationDb: {
    appendRelationshipDynamics?: (input: AlicizationRelationshipDynamicsState) => Promise<unknown>
    getLatestRelationshipDynamics?: () => Promise<Partial<AlicizationRelationshipDynamicsState> | null>
    listTaskThreads: (input: {
      sessionId: string
      status: AlicizationTaskThreadStatus[]
      limit?: number
    }) => Promise<AlicizationTaskThreadRecord[]>
    upsertTaskThread: (input: AlicizationTaskThreadRecord) => Promise<unknown>
  }
}

function readFabricAffirmationReasonCodes(thread: AlicizationTaskThreadRecord) {
  const fabric = (thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata) && thread.metadata.fabric && typeof thread.metadata.fabric === 'object' && !Array.isArray(thread.metadata.fabric))
    ? thread.metadata.fabric as { affirmationReasonCodes?: unknown }
    : null
  return Array.isArray(fabric?.affirmationReasonCodes)
    ? fabric!.affirmationReasonCodes as string[]
    : []
}

export function createAlicizationRuntimeExecutionFeedback(
  options: CreateAlicizationRuntimeExecutionFeedbackOptions,
) {
  const settlePendingExecutionProposalFeedbackFromUserTurn = async (
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ): Promise<AlicizationExecutionProposalFeedbackKind | null> => {
    const cardId = options.normalizeCardId(payload.cardId)
    const userText = options.readLatestUserMessageText(payload.messages)
    if (!userText)
      return null

    const sessionId = await options.ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const threads = await options.withCardScope(cardId, async () => await options.alicizationDb.listTaskThreads({
      sessionId,
      status: ['needs-affirmation'],
      limit: 6,
    }).catch(() => []), {
      label: `execution-proposal-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
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

    const affirmationReasonCodes = readFabricAffirmationReasonCodes(latest)
    const feedback = options.deriveExecutionProposalFeedbackKind({
      userText,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
        affirmationReasonCodes,
      },
    })
    if (!feedback)
      return null

    const closure = options.attachSynthesizedReflections(options.buildExecutionProposalFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId: latest.decisionTraceId ?? null,
      turnId: options.sanitizeText(payload.turnId) || null,
      feedback,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
        affirmationReasonCodes,
      },
    }))
    await options.persistOutcomeClosure(cardId, closure)

    if (feedback === 'denied' || feedback === 'interrupted') {
      const nextStatus = feedback === 'denied' ? 'cancelled' : 'paused'
      await options.withCardScope(cardId, async () => {
        await options.alicizationDb.upsertTaskThread({
          ...latest,
          status: nextStatus,
          summary: feedback === 'denied'
            ? 'The host explicitly declined this proactive execution proposal.'
            : 'The host turned away from this proactive execution proposal before confirming it.',
          updatedAt: at,
          lastEventAt: at,
          completedAt: feedback === 'denied' ? at : latest.completedAt ?? null,
        })
      }, {
        label: `execution-proposal-feedback.thread-update:${cardId}`,
        skipQueueWhenScopeAlreadyActive: true,
      })
    }

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.execution-proposal',
      action: 'proposal-feedback-settled',
      message: 'Settled host feedback for a pending proactive execution proposal.',
      payload: {
        source,
        cardId,
        sessionId,
        threadId: latest.id,
        feedback,
        userText,
      },
    }, cardId)
    return feedback
  }

  const settleRecentExecutionResultFeedbackFromUserTurn = async (
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ): Promise<AlicizationExecutionResultFeedbackKind | null> => {
    const cardId = options.normalizeCardId(payload.cardId)
    const userText = options.readLatestUserMessageText(payload.messages)
    if (!userText)
      return null

    const previousAssistantText = options.readLatestAssistantMessageText(payload.messages as any)
    const sessionId = await options.ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const threads = await options.withCardScope(cardId, async () => await options.alicizationDb.listTaskThreads({
      sessionId,
      status: ['completed', 'failed', 'blocked', 'cancelled'],
      limit: 8,
    }).catch(() => []), {
      label: `execution-result-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = threads
      .filter(thread => thread.origin === 'subconscious-proactive')
      .filter((thread) => {
        const executionMetadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
          && thread.metadata.execution && typeof thread.metadata.execution === 'object' && !Array.isArray(thread.metadata.execution)
          ? thread.metadata.execution as { resultFeedbackSettledAt?: unknown }
          : null
        return !Number.isFinite(Number(executionMetadata?.resultFeedbackSettledAt))
      })
      .filter(thread => at - options.readTaskThreadActivityAt(thread) <= 30 * 60_000)
      .sort((left, right) => options.readTaskThreadActivityAt(right) - options.readTaskThreadActivityAt(left))[0] ?? null
    if (!latest)
      return null

    const feedback = options.deriveExecutionResultFeedbackKind({
      previousAssistantText,
      userText,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
      },
    })
    if (!feedback)
      return null

    const closure = options.attachSynthesizedReflections(options.buildExecutionResultFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId: latest.decisionTraceId ?? null,
      turnId: options.sanitizeText(payload.turnId) || null,
      feedback,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: latest.summary ?? '',
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
      },
    }))
    await options.persistOutcomeClosure(cardId, closure)

    await options.withCardScope(cardId, async () => {
      const metadata = latest.metadata && typeof latest.metadata === 'object' && !Array.isArray(latest.metadata)
        ? latest.metadata as Record<string, unknown>
        : {}
      const executionMetadata = metadata.execution && typeof metadata.execution === 'object' && !Array.isArray(metadata.execution)
        ? metadata.execution as Record<string, unknown>
        : {}
      await options.alicizationDb.upsertTaskThread({
        ...latest,
        metadata: {
          ...metadata,
          execution: {
            ...executionMetadata,
            resultFeedbackKind: feedback,
            resultFeedbackSettledAt: at,
            resultFeedbackTurnId: options.sanitizeText(payload.turnId) || null,
          },
        },
        updatedAt: at,
      })
    }, {
      label: `execution-result-feedback.thread-update:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.execution-result',
      action: 'result-feedback-settled',
      message: 'Settled host feedback for a finished proactive execution result.',
      payload: {
        source,
        cardId,
        sessionId,
        threadId: latest.id,
        feedback,
        userText,
      },
    }, cardId)
    return feedback
  }

  return {
    settlePendingExecutionProposalFeedbackFromUserTurn,
    settleRecentExecutionResultFeedbackFromUserTurn,
  }
}
