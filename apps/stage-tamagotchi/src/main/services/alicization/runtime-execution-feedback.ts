import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type {
  AlicizationAuditLogInput,
  AlicizationChatStartPayload,
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '../../../shared/eventa'
import type { AlicizationOutcomeClosureResult, buildExecutionProposalFeedbackOutcomeClosure, buildExecutionResultFeedbackOutcomeClosure, deriveExecutionProposalFeedbackKind, deriveExecutionResultFeedbackKind } from './outcome-reinforcement'
import type { AlicizationTrustedExecutionResultEvidence } from './runtime-memory-reconsolidation'

import {
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'

import {
  readExecutionFailure,
  readExecutionOutcome,
  readLatestExecutionEvent,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import {
  isAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueFamilyClassification,
} from './runtime-structured-format'

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
  memoryReconsolidationRuntime?: {
    reconsolidateExecutionResultFeedbackMemoryTrace?: (input: {
      cardId: string
      feedback: AlicizationExecutionResultFeedbackKind | null
      at: number
      executionResult: AlicizationTrustedExecutionResultEvidence
      outcomeClosure: AlicizationOutcomeClosureResult
      memoryClosureExecution?: AlicizationExecutionRuntimeMemoryClosureExecution | null
      safetyGateSummary?: string | null
      resumeConfirmationSummary?: string | null
    }) => Promise<void>
  }
  alicizationDb: {
    listTaskThreads: (input: {
      sessionId: string
      status: AlicizationTaskThreadStatus[]
      limit?: number
    }) => Promise<AlicizationTaskThreadRecord[]>
    listExecutionEvents?: (input: {
      threadId: string
      limit?: number
    }) => Promise<AlicizationExecutionEventRecord[]>
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

function buildExecutionResultFeedbackHostAttitude(feedback: AlicizationExecutionResultFeedbackKind) {
  if (feedback === 'valued')
    return 'execution_feedback=valued; trust_delta=positive; reply_policy=continue_with_evidence; visibility=structured'
  if (feedback === 'doubted')
    return 'execution_feedback=doubted; trust_delta=verify_required; reply_policy=avoid_overclaim; visibility=structured'
  if (feedback === 'intrusive')
    return 'execution_feedback=intrusive; distance_delta=more_space; reply_policy=lower_pressure; visibility=structured'
  return 'execution_feedback=interrupted; distance_delta=paused; reply_policy=wait_for_new_user_opening; visibility=structured'
}

function readExecutionFeedbackRuntimeContextRecord(thread: AlicizationTaskThreadRecord) {
  const metadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
    ? thread.metadata as {
      execution?: {
        runtimeContext?: unknown
      } | null
    }
    : null
  const runtimeContext = metadata?.execution?.runtimeContext
  if (!runtimeContext || typeof runtimeContext !== 'object' || Array.isArray(runtimeContext))
    return null
  return runtimeContext as Record<string, unknown>
}

function readExecutionFeedbackAffectiveResidue(thread: AlicizationTaskThreadRecord) {
  const runtimeContext = readExecutionFeedbackRuntimeContextRecord(thread)
  if (!runtimeContext)
    return null

  const affectiveResidue = normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: 'browser-fallback',
    producedAt: 0,
    summary: 'execution-feedback-affective-residue',
    affectiveResidue: runtimeContext.affectiveResidue,
  })?.affectiveResidue
  if (affectiveResidue)
    return affectiveResidue

  const derivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle(runtimeContext.derivedMindStateBundle)
  return derivedMindStateBundle?.affectiveResidue ?? null
}

function readExecutionFeedbackEmotionalTransitionLedger(thread: AlicizationTaskThreadRecord) {
  const runtimeContext = readExecutionFeedbackRuntimeContextRecord(thread)
  if (!runtimeContext)
    return null

  const derivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle(runtimeContext.derivedMindStateBundle)
  return derivedMindStateBundle?.emotionalTransitionLedger ?? null
}

function readExecutionFeedbackMemoryClosureExecution(thread: AlicizationTaskThreadRecord) {
  const runtimeContext = normalizeAlicizationExecutionRuntimeContext(readExecutionFeedbackRuntimeContextRecord(thread))
  return runtimeContext?.memoryClosureExecution ?? null
}

function readExecutionFeedbackPayloadObject(payload: unknown) {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
}

function readExecutionFeedbackBooleanOrNull(raw: unknown) {
  if (raw === true || raw === false)
    return raw
  return null
}

function readExecutionFeedbackStringArray(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map(value => sanitizeExecutionLedgerText(value, 80))
    .filter(Boolean)
}

function buildExecutionResultFeedbackSafetyGateSummary(events: AlicizationExecutionEventRecord[]) {
  const latestEvent = readLatestExecutionEvent(events, ['result'])
  const payload = readExecutionFeedbackPayloadObject(latestEvent?.payload)
  const safetyGate = readExecutionFeedbackPayloadObject(payload?.safetyGate)
  if (!safetyGate)
    return null

  const effect = sanitizeExecutionLedgerText(safetyGate.effect, 80)
  const permissionMode = sanitizeExecutionLedgerText(safetyGate.permissionMode, 80)
  const confirmationRequired = readExecutionFeedbackBooleanOrNull(safetyGate.confirmationRequired)
  const riskPolicy = sanitizeExecutionLedgerText(safetyGate.riskPolicy, 120)
  const auditability = sanitizeExecutionLedgerText(safetyGate.auditability, 80)
  const interruptibility = sanitizeExecutionLedgerText(safetyGate.interruptibility, 80)
  const summary = [
    effect ? `effect=${effect}` : '',
    permissionMode ? `permission=${permissionMode}` : '',
    confirmationRequired === true
      ? 'confirmation=required'
      : confirmationRequired === false
        ? 'confirmation=not-required'
        : '',
    riskPolicy ? `risk=${riskPolicy}` : '',
    auditability ? `audit=${auditability}` : '',
    interruptibility ? `interrupt=${interruptibility}` : '',
  ].filter(Boolean).join(' ')

  return summary || null
}

function buildExecutionResultFeedbackResumeConfirmationSummary(events: AlicizationExecutionEventRecord[]) {
  const latestEvent = readLatestExecutionEvent(events, ['resume'])
  const payload = readExecutionFeedbackPayloadObject(latestEvent?.payload)
  if (!payload)
    return null

  const approval = sanitizeExecutionLedgerText(payload.approval, 80)
  const previousStatus = sanitizeExecutionLedgerText(payload.previousStatus, 80)
  const resumedStatus = sanitizeExecutionLedgerText(payload.resumedStatus, 80)
  const previousPermissionMode = sanitizeExecutionLedgerText(payload.previousPermissionMode, 80)
  const permissionMode = sanitizeExecutionLedgerText(payload.permissionMode, 80)
  const effect = sanitizeExecutionLedgerText(payload.effect, 80)
  const riskBudget = sanitizeExecutionLedgerText(payload.riskBudget, 80)
  const confirmationBoundary = sanitizeExecutionLedgerText(payload.confirmationBoundary, 120)
  const auditability = sanitizeExecutionLedgerText(payload.auditability, 80)
  const interruptibility = sanitizeExecutionLedgerText(payload.interruptibility, 80)
  const affirmationReasonCodes = readExecutionFeedbackStringArray(payload.affirmationReasonCodes)
  const summary = [
    approval ? `approval=${approval}` : '',
    previousStatus ? `previous=${previousStatus}` : '',
    resumedStatus ? `resumed=${resumedStatus}` : '',
    previousPermissionMode ? `previousPermission=${previousPermissionMode}` : '',
    permissionMode ? `permission=${permissionMode}` : '',
    effect ? `effect=${effect}` : '',
    riskBudget ? `risk=${riskBudget}` : '',
    confirmationBoundary ? `confirmation=${confirmationBoundary}` : '',
    auditability ? `audit=${auditability}` : '',
    interruptibility ? `interrupt=${interruptibility}` : '',
    affirmationReasonCodes.length > 0 ? `affirmation=${affirmationReasonCodes.join(',')}` : '',
  ].filter(Boolean).join(' ')

  return summary || null
}

function matchesRequiredExecutionOwnerId(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const normalizedLeft = typeof left === 'string' ? left.trim() : ''
  const normalizedRight = typeof right === 'string' ? right.trim() : ''
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight)
}

function matchesExecutionEventOwner(
  event: AlicizationExecutionEventRecord,
  thread: AlicizationTaskThreadRecord,
) {
  return matchesRequiredExecutionOwnerId(event.threadId, thread.id)
    && matchesRequiredExecutionOwnerId(event.decisionTraceId, thread.decisionTraceId)
    && matchesRequiredExecutionOwnerId(event.turnId, thread.turnId)
    && matchesRequiredExecutionOwnerId(event.sessionId, thread.sessionId)
}

async function readTrustedExecutionResultFeedbackLedger(input: {
  thread: AlicizationTaskThreadRecord
  listExecutionEvents?: (input: { threadId: string, limit?: number }) => Promise<AlicizationExecutionEventRecord[]>
}) {
  if (!input.listExecutionEvents)
    return null

  const events = await input.listExecutionEvents({
    threadId: input.thread.id,
    limit: 12,
  }).catch(() => [] as AlicizationExecutionEventRecord[])
  const ownedEvents = events.filter(event => matchesExecutionEventOwner(event, input.thread))
  const completedResultEvent = [...ownedEvents]
    .sort((left, right) => right.createdAt - left.createdAt)
    .find(event =>
      event.kind === 'result'
      && event.threadStatus === 'completed',
    ) ?? null
  if (!completedResultEvent)
    return null
  if (readExecutionFailure([completedResultEvent]))
    return null
  const trustedResumeEvents = ownedEvents.filter((event) => {
    if (event.kind !== 'resume' || event.createdAt > completedResultEvent.createdAt)
      return false
    const payload = readExecutionFeedbackPayloadObject(event.payload)
    return sanitizeExecutionLedgerText(payload?.approval, 80) === 'host-confirmed'
  })

  return {
    outcome: readExecutionOutcome([completedResultEvent]),
    safetyGateSummary: buildExecutionResultFeedbackSafetyGateSummary([completedResultEvent]),
    resumeConfirmationSummary: buildExecutionResultFeedbackResumeConfirmationSummary(trustedResumeEvents),
  }
}

export function createAlicizationRuntimeExecutionFeedback(
  options: CreateAlicizationRuntimeExecutionFeedbackOptions,
) {
  const hasAutonomousExecutionThreadOwnershipProof = (thread: AlicizationTaskThreadRecord) => {
    const hasCanonicalAutonomousOrigin = isAlicizationAutonomousDialogueOrigin(thread.origin)
    const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: thread.turnId,
      origin: hasCanonicalAutonomousOrigin ? thread.origin : undefined,
    })
    const metadataTask = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
      && thread.metadata.task && typeof thread.metadata.task === 'object' && !Array.isArray(thread.metadata.task)
      ? thread.metadata.task as { origin?: unknown }
      : null
    const hasStructuralAutonomousOwnership = autonomousDialogueFamily.matchedBy.includes('turn-id-prefix')
    const hasProactiveTaskOwnership = metadataTask?.origin === 'proactive'
    return autonomousDialogueFamily.isAutonomous
      && (hasStructuralAutonomousOwnership || hasProactiveTaskOwnership)
  }

  const settlePendingExecutionProposalFeedbackFromUserTurn = async (
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ): Promise<AlicizationExecutionProposalFeedbackKind | null> => {
    const normalizedPayload = payload
    const cardId = options.normalizeCardId(normalizedPayload.cardId)
    const userText = options.readLatestUserMessageText(normalizedPayload.messages)
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
      .filter(thread => thread.status === 'needs-affirmation')
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
        userText,
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
        affirmationReasonCodes,
      },
    })
    if (!feedback)
      return null

    if (feedback === 'denied' || feedback === 'interrupted') {
      const nextStatus = feedback === 'denied' ? 'cancelled' : 'paused'
      await options.withCardScope(cardId, async () => {
        await options.alicizationDb.upsertTaskThread({
          ...latest,
          status: nextStatus,
          summary: `execution-proposal-feedback:${feedback}`,
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
    const normalizedPayload = payload
    const cardId = options.normalizeCardId(normalizedPayload.cardId)
    const userText = options.readLatestUserMessageText(normalizedPayload.messages)
    if (!userText)
      return null

    const previousAssistantText = options.readLatestAssistantMessageText(normalizedPayload.messages as any)
    const sessionId = await options.ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const threads = await options.withCardScope(cardId, async () => await options.alicizationDb.listTaskThreads({
      sessionId,
      status: ['completed'],
      limit: 8,
    }).catch(() => []), {
      label: `execution-result-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = threads
      .filter(thread => thread.status === 'completed')
      .filter(thread => matchesRequiredExecutionOwnerId(thread.sessionId, sessionId))
      .filter(thread => hasAutonomousExecutionThreadOwnershipProof(thread))
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
    const executionLedger = await options.withCardScope(cardId, async () => await readTrustedExecutionResultFeedbackLedger({
      thread: latest,
      listExecutionEvents: options.alicizationDb.listExecutionEvents,
    }), {
      label: `execution-result-feedback.completed-result:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    if (!executionLedger)
      return null

    const affectiveResidue = readExecutionFeedbackAffectiveResidue(latest)
    const emotionalTransitionLedger = readExecutionFeedbackEmotionalTransitionLedger(latest)
    const memoryClosureExecution = readExecutionFeedbackMemoryClosureExecution(latest)
    const trustedOutcome = executionLedger.outcome || latest.summary || ''

    const feedback = options.deriveExecutionResultFeedbackKind({
      previousAssistantText,
      userText,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: trustedOutcome,
        previousAssistantText,
        userText,
        memoryClosureExecution,
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
      },
    })
    if (!feedback)
      return null

    const safetyGateSummary = executionLedger.safetyGateSummary
    const resumeConfirmationSummary = executionLedger.resumeConfirmationSummary

    const closure = options.attachSynthesizedReflections(options.buildExecutionResultFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId: latest.decisionTraceId ?? null,
      turnId: options.sanitizeText(normalizedPayload.turnId) || null,
      feedback,
      affectiveResidue,
      emotionalTransitionLedger,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: trustedOutcome,
        previousAssistantText,
        userText,
        memoryClosureExecution,
        proposedChannel: latest.proposedChannel ?? null,
        resumeConfirmationSummary,
        selectedChannel: latest.selectedChannel ?? null,
        safetyGateSummary,
      },
    }))
    await options.persistOutcomeClosure(cardId, closure)
    await options.memoryReconsolidationRuntime?.reconsolidateExecutionResultFeedbackMemoryTrace?.({
      cardId,
      feedback,
      at,
      executionResult: {
        provenance: 'execution-ledger',
        status: 'completed',
        cardId,
        threadId: latest.id,
        decisionTraceId: options.sanitizeText(latest.decisionTraceId, ''),
        turnId: options.sanitizeText(latest.turnId, ''),
        sessionId: options.sanitizeText(latest.sessionId, ''),
        goal: options.sanitizeText(latest.goal, ''),
        outcome: options.sanitizeText(trustedOutcome, '') || null,
      },
      outcomeClosure: closure,
      memoryClosureExecution,
      safetyGateSummary,
      resumeConfirmationSummary,
    })

    const previousDynamics = await options.alicizationDb.getLatestRelationshipDynamics().catch(() => null)
    await options.alicizationDb.appendRelationshipDynamics({
      hostAttitude: buildExecutionResultFeedbackHostAttitude(feedback),
      previousHostAttitude: previousDynamics?.hostAttitude ?? null,
      obedienceDelta: 0,
      livelinessDelta: feedback === 'valued'
        ? 0.02
        : feedback === 'doubted'
          ? -0.01
          : 0,
      sensibilityDelta: feedback === 'valued'
        ? 0.02
        : feedback === 'doubted' || feedback === 'intrusive'
          ? 0.03
          : 0.01,
      source: `execution-result-feedback:${feedback}`,
      createdAt: at,
    }).catch(() => {})

    await options.withCardScope(cardId, async () => {
      const metadata = latest.metadata && typeof latest.metadata === 'object' && !Array.isArray(latest.metadata)
        ? latest.metadata as Record<string, unknown>
        : {}
      const executionMetadata = metadata.execution && typeof metadata.execution === 'object' && !Array.isArray(metadata.execution)
        ? metadata.execution as Record<string, unknown>
        : {}
      const runtimeContextMetadata = executionMetadata.runtimeContext && typeof executionMetadata.runtimeContext === 'object' && !Array.isArray(executionMetadata.runtimeContext)
        ? executionMetadata.runtimeContext as Record<string, unknown>
        : {}
      const sensoryMetadata = runtimeContextMetadata.sensory && typeof runtimeContextMetadata.sensory === 'object' && !Array.isArray(runtimeContextMetadata.sensory)
        ? runtimeContextMetadata.sensory
        : {
            collectedAt: at,
            running: false,
            stale: true,
            ageMs: 0,
            foregroundWindow: null,
            capture: null,
          }
      await options.alicizationDb.upsertTaskThread({
        ...latest,
        metadata: {
          ...metadata,
          execution: {
            ...executionMetadata,
            runtimeContext: {
              ...runtimeContextMetadata,
              generatedAt: runtimeContextMetadata.generatedAt ?? at,
              decisionTraceId: runtimeContextMetadata.decisionTraceId ?? latest.decisionTraceId ?? null,
              turnId: runtimeContextMetadata.turnId ?? latest.turnId ?? null,
              sessionId: runtimeContextMetadata.sessionId ?? latest.sessionId ?? null,
              sensory: sensoryMetadata,
              ...(affectiveResidue ? { affectiveResidue } : {}),
              ...(memoryClosureExecution ? { memoryClosureExecution } : {}),
            },
            resultFeedbackKind: feedback,
            resultFeedbackSettledAt: at,
            resultFeedbackTurnId: options.sanitizeText(normalizedPayload.turnId) || null,
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
