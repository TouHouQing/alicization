import type {
  AlicizationExecutionEventRecord,
  AlicizationListExecutionEventsInput,
  AlicizationListTaskThreadsInput,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionActionInput,
  AlicizationAgentSessionContinuityInput,
} from './agent-runtime'

import { buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'

import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'

export interface AlicizationExecutionCallbackContext {
  actions: AlicizationAgentSessionActionInput[]
  callbacks: AlicizationExecutionCallbackDigest[]
  continuitySignals: AlicizationAgentSessionContinuityInput[]
  recallText: string
  systemBlock: string
}

export interface AlicizationExecutionCallbackDigest {
  channel: string
  createdAt: number
  decisionTraceId: string | null
  goal: string
  outcome: string
  sessionId: string | null
  status: string
  summary: string
  threadId: string
  turnId: string | null
}

interface AlicizationExecutionCallbackSafetyGateDigest {
  auditability: string | null
  confirmationRequired: boolean | null
  effect: string | null
  interruptibility: string | null
  permissionMode: string | null
  riskPolicy: string | null
}

interface AlicizationExecutionCallbackResumeConfirmationDigest {
  affirmationReasonCodes: string[]
  approval: string | null
  auditability: string | null
  confirmationBoundary: string | null
  effect: string | null
  interruptibility: string | null
  permissionMode: string | null
  previousPermissionMode: string | null
  previousStatus: string | null
  resumedStatus: string | null
  riskBudget: string | null
}

export const emptyAlicizationExecutionCallbackContext: AlicizationExecutionCallbackContext = {
  actions: [],
  callbacks: [],
  continuitySignals: [],
  recallText: '',
  systemBlock: '',
}

interface AlicizationExecutionCallbackRuntimeOptions {
  getNow?: () => number
  listExecutionEvents: (input?: AlicizationListExecutionEventsInput) => Promise<AlicizationExecutionEventRecord[]>
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
  maxPendingCallbacks?: number
  maxThreadAgeMs?: number
}

interface AlicizationExecutionCallbackItem {
  action: AlicizationAgentSessionActionInput
  channel: string
  createdAt: number
  digest: AlicizationExecutionCallbackDigest
  goal: string
  outcome: string
  resumeConfirmation: AlicizationExecutionCallbackResumeConfirmationDigest | null
  resumeConfirmationSummary: string
  safetyGate: AlicizationExecutionCallbackSafetyGateDigest | null
  safetyGateSummary: string
  status: string
  summary: string
  thread: AlicizationTaskThreadRecord
}

const defaultMaxPendingCallbacks = 3
const defaultMaxThreadAgeMs = 20 * 60_000

function normalizeCallbackStatus(status: AlicizationTaskThreadRecord['status']) {
  return status === 'completed' ? 'completed' : 'failed'
}

function buildCallbackLabel(thread: AlicizationTaskThreadRecord) {
  const channel = sanitizeExecutionLedgerText(thread.selectedChannel ?? thread.proposedChannel ?? 'executor', 48) || 'executor'
  return `callback:${channel}`
}

function buildCallbackSummary(input: {
  thread: AlicizationTaskThreadRecord
  outcome: string
}) {
  const goal = sanitizeExecutionLedgerText(input.thread.goal, 120) || 'the current task'
  const summary = sanitizeExecutionLedgerText(input.thread.summary, 160)
  const statusLead = input.thread.status === 'completed'
    ? 'Completed'
    : input.thread.status === 'cancelled'
      ? 'Cancelled'
      : input.thread.status === 'blocked'
        ? 'Blocked'
        : 'Failed'
  const detail = input.outcome || summary
  return detail
    ? `${statusLead} ${goal}: ${detail}`
    : `${statusLead} ${goal}.`
}

function readPayloadObject(payload: unknown) {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
}

function readBooleanOrNull(raw: unknown) {
  if (raw === true || raw === false)
    return raw
  return null
}

function readStringArray(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map(value => sanitizeExecutionLedgerText(value, 80))
    .filter(Boolean)
}

function readExecutionCallbackSafetyGate(events: AlicizationExecutionEventRecord[]): AlicizationExecutionCallbackSafetyGateDigest | null {
  const latestEvent = readLatestExecutionEvent(events)
  const payload = readPayloadObject(latestEvent?.payload)
  const safetyGate = readPayloadObject(payload?.safetyGate)
  if (!safetyGate)
    return null

  const digest: AlicizationExecutionCallbackSafetyGateDigest = {
    auditability: sanitizeExecutionLedgerText(safetyGate.auditability, 80) || null,
    confirmationRequired: readBooleanOrNull(safetyGate.confirmationRequired),
    effect: sanitizeExecutionLedgerText(safetyGate.effect, 80) || null,
    interruptibility: sanitizeExecutionLedgerText(safetyGate.interruptibility, 80) || null,
    permissionMode: sanitizeExecutionLedgerText(safetyGate.permissionMode, 80) || null,
    riskPolicy: sanitizeExecutionLedgerText(safetyGate.riskPolicy, 120) || null,
  }

  if (
    !digest.auditability
    && digest.confirmationRequired === null
    && !digest.effect
    && !digest.interruptibility
    && !digest.permissionMode
    && !digest.riskPolicy
  ) {
    return null
  }

  return digest
}

function buildExecutionCallbackSafetyGateSummary(safetyGate: AlicizationExecutionCallbackSafetyGateDigest | null) {
  if (!safetyGate)
    return ''

  return [
    safetyGate.effect ? `effect=${safetyGate.effect}` : '',
    safetyGate.permissionMode ? `permission=${safetyGate.permissionMode}` : '',
    safetyGate.confirmationRequired === true
      ? 'confirmation=required'
      : safetyGate.confirmationRequired === false
        ? 'confirmation=not-required'
        : '',
    safetyGate.riskPolicy ? `risk=${safetyGate.riskPolicy}` : '',
    safetyGate.auditability ? `audit=${safetyGate.auditability}` : '',
    safetyGate.interruptibility ? `interrupt=${safetyGate.interruptibility}` : '',
  ].filter(Boolean).join(' ')
}

function readExecutionCallbackResumeConfirmation(
  events: AlicizationExecutionEventRecord[],
): AlicizationExecutionCallbackResumeConfirmationDigest | null {
  const latestResumeEvent = readLatestExecutionEvent(events, ['resume'])
  const payload = readPayloadObject(latestResumeEvent?.payload)
  if (!payload)
    return null

  const digest: AlicizationExecutionCallbackResumeConfirmationDigest = {
    affirmationReasonCodes: readStringArray(payload.affirmationReasonCodes),
    approval: sanitizeExecutionLedgerText(payload.approval, 80) || null,
    auditability: sanitizeExecutionLedgerText(payload.auditability, 80) || null,
    confirmationBoundary: sanitizeExecutionLedgerText(payload.confirmationBoundary, 120) || null,
    effect: sanitizeExecutionLedgerText(payload.effect, 80) || null,
    interruptibility: sanitizeExecutionLedgerText(payload.interruptibility, 80) || null,
    permissionMode: sanitizeExecutionLedgerText(payload.permissionMode, 80) || null,
    previousPermissionMode: sanitizeExecutionLedgerText(payload.previousPermissionMode, 80) || null,
    previousStatus: sanitizeExecutionLedgerText(payload.previousStatus, 80) || null,
    resumedStatus: sanitizeExecutionLedgerText(payload.resumedStatus, 80) || null,
    riskBudget: sanitizeExecutionLedgerText(payload.riskBudget, 80) || null,
  }

  if (
    !digest.approval
    && !digest.auditability
    && !digest.confirmationBoundary
    && !digest.effect
    && !digest.interruptibility
    && !digest.permissionMode
    && !digest.previousPermissionMode
    && !digest.previousStatus
    && !digest.resumedStatus
    && !digest.riskBudget
    && digest.affirmationReasonCodes.length === 0
  ) {
    return null
  }

  return digest
}

function buildExecutionCallbackResumeConfirmationSummary(
  resumeConfirmation: AlicizationExecutionCallbackResumeConfirmationDigest | null,
) {
  if (!resumeConfirmation)
    return ''

  return [
    resumeConfirmation.approval ? `approval=${resumeConfirmation.approval}` : '',
    resumeConfirmation.previousStatus ? `previous=${resumeConfirmation.previousStatus}` : '',
    resumeConfirmation.resumedStatus ? `resumed=${resumeConfirmation.resumedStatus}` : '',
    resumeConfirmation.previousPermissionMode ? `previousPermission=${resumeConfirmation.previousPermissionMode}` : '',
    resumeConfirmation.permissionMode ? `permission=${resumeConfirmation.permissionMode}` : '',
    resumeConfirmation.effect ? `effect=${resumeConfirmation.effect}` : '',
    resumeConfirmation.riskBudget ? `risk=${resumeConfirmation.riskBudget}` : '',
    resumeConfirmation.confirmationBoundary ? `confirmation=${resumeConfirmation.confirmationBoundary}` : '',
    resumeConfirmation.auditability ? `audit=${resumeConfirmation.auditability}` : '',
    resumeConfirmation.interruptibility ? `interrupt=${resumeConfirmation.interruptibility}` : '',
    resumeConfirmation.affirmationReasonCodes.length > 0
      ? `affirmation=${resumeConfirmation.affirmationReasonCodes.join(',')}`
      : '',
  ].filter(Boolean).join(' ')
}

function buildCallbackItem(input: {
  events: AlicizationExecutionEventRecord[]
  thread: AlicizationTaskThreadRecord
}): AlicizationExecutionCallbackItem {
  const latestEvent = readLatestExecutionEvent(input.events)
  const outcome = readExecutionOutcome(input.events)
  const summary = buildCallbackSummary({
    thread: input.thread,
    outcome,
  })
  const safetyGate = readExecutionCallbackSafetyGate(input.events)
  const safetyGateSummary = buildExecutionCallbackSafetyGateSummary(safetyGate)
  const resumeConfirmation = readExecutionCallbackResumeConfirmation(input.events)
  const resumeConfirmationSummary = buildExecutionCallbackResumeConfirmationSummary(resumeConfirmation)
  const channel = sanitizeExecutionLedgerText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'unknown', 48) || 'unknown'
  const goal = sanitizeExecutionLedgerText(input.thread.goal, 140) || 'the current task'
  const createdAt = Number.isFinite(latestEvent?.createdAt)
    ? Number(latestEvent?.createdAt)
    : readTaskThreadActivityAt(input.thread)
  const signature = sanitizeExecutionLedgerText(
    `${input.thread.id}:${latestEvent?.id ?? createdAt}`,
    220,
  )

  return {
    channel,
    createdAt,
    digest: {
      channel,
      createdAt,
      decisionTraceId: sanitizeExecutionLedgerText(input.thread.decisionTraceId, 220) || null,
      goal,
      outcome,
      sessionId: sanitizeExecutionLedgerText(input.thread.sessionId, 160) || null,
      status: sanitizeExecutionLedgerText(input.thread.status, 48) || 'unknown',
      summary,
      threadId: sanitizeExecutionLedgerText(input.thread.id, 160) || 'unknown-thread',
      turnId: sanitizeExecutionLedgerText(input.thread.turnId, 160) || null,
    },
    goal,
    outcome,
    resumeConfirmation,
    resumeConfirmationSummary,
    status: sanitizeExecutionLedgerText(input.thread.status, 48) || 'unknown',
    summary,
    thread: input.thread,
    action: {
      kind: 'executor',
      status: normalizeCallbackStatus(input.thread.status),
      label: buildCallbackLabel(input.thread),
      summary,
      signature,
      finishedAt: createdAt,
      metadata: {
        source: 'execution-callback-runtime',
        threadId: input.thread.id,
        decisionTraceId: input.thread.decisionTraceId,
        turnId: input.thread.turnId,
        sessionId: input.thread.sessionId,
        selectedChannel: input.thread.selectedChannel,
        threadStatus: input.thread.status,
        ...(resumeConfirmation
          ? {
              resumeConfirmation,
              resumeConfirmationSummary,
            }
          : {}),
        ...(safetyGate
          ? {
              safetyGate,
              safetyGateSummary,
            }
          : {}),
      },
    },
    safetyGate,
    safetyGateSummary,
  }
}

function buildCallbackContinuitySignal(item: AlicizationExecutionCallbackItem): AlicizationAgentSessionContinuityInput {
  return {
    kind: 'execution-callback',
    state: 'fresh',
    label: item.action.label,
    summary: item.summary,
    signature: item.action.signature ?? null,
    createdAt: item.createdAt,
    metadata: {
      ...item.action.metadata,
      source: 'execution-callback-runtime',
      continuityKind: 'execution-callback',
      ...(item.resumeConfirmation
        ? {
            resumeConfirmation: item.resumeConfirmation,
            resumeConfirmationSummary: item.resumeConfirmationSummary,
          }
        : {}),
      ...(item.safetyGate
        ? {
            safetyGate: item.safetyGate,
            safetyGateSummary: item.safetyGateSummary,
          }
        : {}),
    },
  }
}

function buildExecutionCallbackRecallText(items: AlicizationExecutionCallbackItem[]) {
  return items.map(item => [
    `execution_callback_channel:${item.channel}`,
    `execution_callback_status:${item.status}`,
    `execution_callback_goal:${item.goal}`,
    item.outcome ? `execution_callback_outcome:${item.outcome}` : '',
    item.resumeConfirmationSummary ? `execution_callback_resume_confirmation:${item.resumeConfirmationSummary}` : '',
    item.safetyGateSummary ? `execution_callback_safety_gate:${item.safetyGateSummary}` : '',
    `execution_callback_summary:${item.summary}`,
  ].filter(Boolean).join(' ')).join('\n')
}

function buildExecutionCallbackSystemBlock(items: AlicizationExecutionCallbackItem[]) {
  if (items.length === 0)
    return ''

  return buildAlicizationProviderFactBlock('alicization-execution-callbacks', {
    alreadyExecuted: true,
    callbacks: items.map(item => ({
      channel: item.channel,
      createdAt: item.createdAt,
      decisionTraceId: item.digest.decisionTraceId,
      goal: item.goal,
      outcome: item.outcome || null,
      resumeConfirmation: item.resumeConfirmation,
      safetyGate: item.safetyGate,
      sessionId: item.digest.sessionId,
      status: item.status,
      summary: item.summary,
      threadId: item.digest.threadId,
      turnId: item.digest.turnId,
    })),
  })
}

export function createAlicizationExecutionCallbackRuntime(options: AlicizationExecutionCallbackRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const maxPendingCallbacks = Math.max(1, Math.floor(options.maxPendingCallbacks ?? defaultMaxPendingCallbacks))
  const maxThreadAgeMs = Math.max(1_000, Math.floor(options.maxThreadAgeMs ?? defaultMaxThreadAgeMs))
  const surfacedCursorBySession = new Map<string, number>()

  async function buildPendingExecutionCallbackContext(input: {
    consume?: boolean
    sessionId: string
  }): Promise<AlicizationExecutionCallbackContext> {
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    if (!sessionId)
      return emptyAlicizationExecutionCallbackContext

    const surfacedCursor = surfacedCursorBySession.get(sessionId) ?? 0
    const candidateThreads = await options.listTaskThreads({
      sessionId,
      limit: 8,
    }).catch(() => [])

    const recentTerminalThreads = candidateThreads
      .filter(thread => alicizationTerminalTaskThreadStatuses.has(thread.status))
      .map(thread => ({
        thread,
        activityAt: readTaskThreadActivityAt(thread),
      }))
      .filter(entry =>
        entry.activityAt > surfacedCursor
        && getNow() - entry.activityAt <= maxThreadAgeMs,
      )
      .sort((left, right) => left.activityAt - right.activityAt)
      .slice(-maxPendingCallbacks)

    if (recentTerminalThreads.length === 0)
      return emptyAlicizationExecutionCallbackContext

    const items = await Promise.all(recentTerminalThreads.map(async ({ thread }) => {
      const events = await options.listExecutionEvents({
        threadId: thread.id,
        limit: 8,
      }).catch(() => [])
      return buildCallbackItem({
        thread,
        events,
      })
    }))

    const pendingItems = items
      .filter(item => item.createdAt > surfacedCursor)
      .sort((left, right) => left.createdAt - right.createdAt)

    if (pendingItems.length === 0)
      return emptyAlicizationExecutionCallbackContext

    if (input.consume !== false) {
      surfacedCursorBySession.set(
        sessionId,
        Math.max(...pendingItems.map(item => item.createdAt)),
      )
    }

    return {
      actions: pendingItems.map(item => item.action),
      callbacks: pendingItems.map(item => item.digest),
      continuitySignals: pendingItems.map(buildCallbackContinuitySignal),
      recallText: buildExecutionCallbackRecallText(pendingItems),
      systemBlock: buildExecutionCallbackSystemBlock(pendingItems),
    }
  }

  function markSurfaced(input: {
    createdAt: number
    sessionId: string
  }) {
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : 0
    if (!sessionId || createdAt <= 0)
      return

    surfacedCursorBySession.set(
      sessionId,
      Math.max(
        surfacedCursorBySession.get(sessionId) ?? 0,
        createdAt,
      ),
    )
  }

  function clear(sessionId?: string) {
    const normalizedSessionId = sanitizeExecutionLedgerText(sessionId, 160)
    if (normalizedSessionId) {
      surfacedCursorBySession.delete(normalizedSessionId)
      return
    }
    surfacedCursorBySession.clear()
  }

  return {
    buildPendingExecutionCallbackContext,
    clear,
    markSurfaced,
    peekSurfacedCursor: (sessionId: string) => {
      const normalizedSessionId = sanitizeExecutionLedgerText(sessionId, 160)
      if (!normalizedSessionId)
        return 0
      return surfacedCursorBySession.get(normalizedSessionId) ?? 0
    },
  }
}
