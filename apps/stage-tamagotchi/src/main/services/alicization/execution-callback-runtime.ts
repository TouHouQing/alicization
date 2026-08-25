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
  activityAt?: number
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

export interface AlicizationExecutionCallbackCursor {
  activityAt: number
  threadId: string | null
}

interface AlicizationExecutionCallbackRuntimeOptions {
  getNow?: () => number
  listExecutionEvents: (input?: AlicizationListExecutionEventsInput) => Promise<AlicizationExecutionEventRecord[]>
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
  cursorStore?: {
    get: (sessionId: string) => Promise<number | AlicizationExecutionCallbackCursor>
    set: (sessionId: string, cursor: AlicizationExecutionCallbackCursor) => Promise<void>
    compareAndSet?: (
      sessionId: string,
      expected: AlicizationExecutionCallbackCursor,
      next: AlicizationExecutionCallbackCursor,
    ) => Promise<boolean>
  }
  pageSize?: number
  maxScanPages?: number
  maxPendingCallbacks?: number
  maxThreadAgeMs?: number
}

interface AlicizationExecutionCallbackMarkSurfacedInput {
  activityAt?: number | null
  createdAt?: number | null
  sessionId: string
  threadId?: string | null
}

interface AlicizationExecutionCallbackItem {
  action: AlicizationAgentSessionActionInput
  activityAt: number
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
const defaultCallbackPageSize = 64
const defaultCallbackMaxScanPages = 32

function compareExecutionCallbackCursor(
  left: AlicizationExecutionCallbackCursor,
  right: AlicizationExecutionCallbackCursor,
) {
  if (left.activityAt !== right.activityAt)
    return left.activityAt - right.activityAt
  if (left.threadId === right.threadId)
    return 0
  if (left.threadId === null)
    return -1
  if (right.threadId === null)
    return 1
  return left.threadId < right.threadId ? -1 : 1
}

function readExecutionCallbackCursor(thread: AlicizationTaskThreadRecord): AlicizationExecutionCallbackCursor {
  return {
    activityAt: readTaskThreadActivityAt(thread),
    threadId: sanitizeExecutionLedgerText(thread.id, 160) || 'unknown-thread',
  }
}

function normalizeExecutionCallbackCursor(
  raw: number | AlicizationExecutionCallbackCursor | null | undefined,
): AlicizationExecutionCallbackCursor {
  if (typeof raw === 'number') {
    return {
      // Legacy cursors only stored the timestamp of the last surfaced batch.
      // Rewind one millisecond so same-millisecond threads are re-evaluated once.
      activityAt: Number.isFinite(raw) ? Math.max(0, Math.floor(raw) - 1) : 0,
      threadId: null,
    }
  }
  if (!raw || typeof raw !== 'object') {
    return {
      activityAt: 0,
      threadId: null,
    }
  }
  return {
    activityAt: Number.isFinite(raw.activityAt) ? Math.max(0, Math.floor(raw.activityAt)) : 0,
    threadId: typeof raw.threadId === 'string' && raw.threadId.trim()
      ? sanitizeExecutionLedgerText(raw.threadId, 160)
      : null,
  }
}

function encodeExecutionCallbackCursor(cursor: AlicizationExecutionCallbackCursor) {
  return encodeURIComponent(JSON.stringify({
    activityAt: cursor.activityAt,
    threadId: cursor.threadId,
  }))
}

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
    activityAt: readTaskThreadActivityAt(input.thread),
    channel,
    createdAt,
    digest: {
      activityAt: readTaskThreadActivityAt(input.thread),
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
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? defaultCallbackPageSize))
  const maxScanPages = Math.max(1, Math.floor(options.maxScanPages ?? defaultCallbackMaxScanPages))
  const surfacedCursorBySession = new Map<string, AlicizationExecutionCallbackCursor>()
  const previewedItemsBySession = new Map<string, AlicizationExecutionCallbackItem[]>()
  const sessionOperationTails = new Map<string, Promise<void>>()

  async function withSessionQueue<T>(sessionId: string, operation: () => Promise<T>) {
    const previous = sessionOperationTails.get(sessionId) ?? Promise.resolve()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const tail = previous.then(() => gate, () => gate)
    sessionOperationTails.set(sessionId, tail)

    await previous
    try {
      return await operation()
    }
    finally {
      release()
      if (sessionOperationTails.get(sessionId) === tail)
        sessionOperationTails.delete(sessionId)
    }
  }

  async function persistCursor(sessionId: string, cursor: AlicizationExecutionCallbackCursor) {
    if (!options.cursorStore)
      return
    await options.cursorStore.set(sessionId, cursor)
  }

  async function commitCursor(
    sessionId: string,
    expected: AlicizationExecutionCallbackCursor,
    next: AlicizationExecutionCallbackCursor,
  ) {
    if (options.cursorStore?.compareAndSet) {
      const committed = await options.cursorStore.compareAndSet(sessionId, expected, next)
      if (!committed) {
        const persistedCursor = normalizeExecutionCallbackCursor(
          await options.cursorStore.get(sessionId),
        )
        surfacedCursorBySession.set(sessionId, persistedCursor)
        return false
      }
      surfacedCursorBySession.set(sessionId, next)
      return true
    }

    await persistCursor(sessionId, next)
    surfacedCursorBySession.set(sessionId, next)
    return true
  }

  async function buildPendingExecutionCallbackContext(input: {
    consume?: boolean
    sessionId: string
  }): Promise<AlicizationExecutionCallbackContext> {
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    if (!sessionId)
      return emptyAlicizationExecutionCallbackContext

    return await withSessionQueue(sessionId, async () => {
      const hasInMemoryCursor = surfacedCursorBySession.has(sessionId)
      let surfacedCursor = surfacedCursorBySession.get(sessionId) ?? {
        activityAt: 0,
        threadId: null,
      }
      if (options.cursorStore && !hasInMemoryCursor) {
        const persistedCursor = await options.cursorStore.get(sessionId)
        const normalizedPersistedCursor = normalizeExecutionCallbackCursor(persistedCursor)
        if (compareExecutionCallbackCursor(normalizedPersistedCursor, surfacedCursor) > 0)
          surfacedCursor = normalizedPersistedCursor
        surfacedCursorBySession.set(sessionId, surfacedCursor)
      }

      const candidateThreadsById = new Map<string, AlicizationTaskThreadRecord>()
      let pageCursor = surfacedCursor
      const minActivityAt = Math.max(0, getNow() - maxThreadAgeMs)
      const terminalStatuses = [...alicizationTerminalTaskThreadStatuses]
      for (let pageIndex = 0; pageIndex < maxScanPages; pageIndex += 1) {
        const page = await options.listTaskThreads({
          sessionId,
          status: terminalStatuses,
          cursor: pageCursor.activityAt > 0 || pageCursor.threadId
            ? encodeExecutionCallbackCursor(pageCursor)
            : null,
          order: 'asc',
          minActivityAt,
          limit: pageSize,
        })
        for (const thread of page) {
          if (thread?.id)
            candidateThreadsById.set(thread.id, thread)
        }
        if (page.length < pageSize)
          break

        const lastThread = page.at(-1)
        if (!lastThread)
          break
        const nextPageCursor = readExecutionCallbackCursor(lastThread)
        if (compareExecutionCallbackCursor(nextPageCursor, pageCursor) <= 0)
          break
        pageCursor = nextPageCursor
      }

      const recentTerminalThreads = [...candidateThreadsById.values()]
        .filter(thread => alicizationTerminalTaskThreadStatuses.has(thread.status))
        .map(thread => ({
          thread,
          cursor: readExecutionCallbackCursor(thread),
        }))
        .filter(entry =>
          compareExecutionCallbackCursor(entry.cursor, surfacedCursor) > 0
          && getNow() - entry.cursor.activityAt <= maxThreadAgeMs,
        )
        .sort((left, right) => compareExecutionCallbackCursor(left.cursor, right.cursor))

      if (recentTerminalThreads.length === 0)
        return emptyAlicizationExecutionCallbackContext

      const items = await Promise.all(recentTerminalThreads.map(async ({ thread }) => {
        const events = await options.listExecutionEvents({
          threadId: thread.id,
          limit: 8,
        })
        return buildCallbackItem({
          thread,
          events,
        })
      }))

      const pendingItems = items
        .filter(item => compareExecutionCallbackCursor({
          activityAt: item.activityAt,
          threadId: item.digest.threadId,
        }, surfacedCursor) > 0)
        .sort((left, right) => compareExecutionCallbackCursor(
          {
            activityAt: left.activityAt,
            threadId: left.digest.threadId,
          },
          {
            activityAt: right.activityAt,
            threadId: right.digest.threadId,
          },
        ))

      if (pendingItems.length === 0)
        return emptyAlicizationExecutionCallbackContext

      const surfacedItems = pendingItems.slice(0, maxPendingCallbacks)
      if (input.consume !== false) {
        previewedItemsBySession.delete(sessionId)
        const lastSurfacedItem = surfacedItems[surfacedItems.length - 1]
        const nextCursor: AlicizationExecutionCallbackCursor = {
          activityAt: lastSurfacedItem.activityAt,
          threadId: lastSurfacedItem.digest.threadId,
        }
        const committed = await commitCursor(sessionId, surfacedCursor, nextCursor)
        if (!committed)
          return emptyAlicizationExecutionCallbackContext
      }
      else {
        previewedItemsBySession.set(sessionId, pendingItems)
      }

      return {
        actions: surfacedItems.map(item => item.action),
        callbacks: surfacedItems.map(item => item.digest),
        continuitySignals: surfacedItems.map(buildCallbackContinuitySignal),
        recallText: buildExecutionCallbackRecallText(surfacedItems),
        systemBlock: buildExecutionCallbackSystemBlock(surfacedItems),
      }
    })
  }

  function markSurfaced(input: AlicizationExecutionCallbackMarkSurfacedInput): Promise<void> {
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : 0
    const activityAt = Number.isFinite(input.activityAt)
      ? Math.max(0, Math.floor(Number(input.activityAt)))
      : createdAt
    const threadId = sanitizeExecutionLedgerText(input.threadId, 160) || null
    if (!sessionId || activityAt <= 0)
      return Promise.resolve()

    return withSessionQueue(sessionId, async () => {
      const previewedItems = previewedItemsBySession.get(sessionId)
      let resolvedThreadId = threadId
      const previewedIndex = previewedItems?.findIndex(item =>
        (resolvedThreadId && item.digest.threadId === resolvedThreadId)
        || (
          !resolvedThreadId
          && item.activityAt === activityAt
          && (createdAt <= 0 || item.createdAt === createdAt)
        ),
      ) ?? -1
      const previewedItem = previewedIndex >= 0
        ? previewedItems?.[previewedIndex]
        : undefined
      if (!resolvedThreadId && !previewedItem) {
        const matchingThreads: AlicizationTaskThreadRecord[] = []
        let resolutionCursor: AlicizationExecutionCallbackCursor = {
          activityAt: Math.max(0, activityAt - 1),
          threadId: null,
        }
        for (let pageIndex = 0; pageIndex < maxScanPages; pageIndex += 1) {
          const candidateThreads = await options.listTaskThreads({
            sessionId,
            status: [...alicizationTerminalTaskThreadStatuses],
            minActivityAt: activityAt,
            cursor: encodeExecutionCallbackCursor(resolutionCursor),
            order: 'asc',
            limit: pageSize,
          }).catch(() => [])
          matchingThreads.push(...candidateThreads.filter(candidate =>
            readTaskThreadActivityAt(candidate) === activityAt,
          ))
          const lastThread = candidateThreads.at(-1)
          if (!lastThread || candidateThreads.length < pageSize)
            break
          const nextCursor = readExecutionCallbackCursor(lastThread)
          if (
            compareExecutionCallbackCursor(nextCursor, resolutionCursor) <= 0
            || nextCursor.activityAt > activityAt
          ) {
            break
          }
          resolutionCursor = nextCursor
        }
        if (matchingThreads.length === 1) {
          resolvedThreadId = sanitizeExecutionLedgerText(matchingThreads[0]?.id, 160) || null
        }
        else if (createdAt > 0 && matchingThreads.length > 1) {
          const eventMatches = await Promise.all(matchingThreads.map(async (candidate) => {
            const events = await options.listExecutionEvents({
              threadId: candidate.id,
              limit: 8,
            }).catch(() => [])
            return events.some(event => event.createdAt === createdAt) ? candidate : null
          }))
          const matchingEventThreads = eventMatches.filter(
            (candidate): candidate is AlicizationTaskThreadRecord => candidate !== null,
          )
          if (matchingEventThreads.length === 1)
            resolvedThreadId = sanitizeExecutionLedgerText(matchingEventThreads[0]?.id, 160) || null
        }
      }
      let currentCursor = surfacedCursorBySession.get(sessionId) ?? {
        activityAt: 0,
        threadId: null,
      }
      if (options.cursorStore && !surfacedCursorBySession.has(sessionId)) {
        currentCursor = normalizeExecutionCallbackCursor(
          await options.cursorStore.get(sessionId),
        )
        surfacedCursorBySession.set(sessionId, currentCursor)
      }
      if (previewedItems && previewedIndex >= 0) {
        previewedItems.splice(previewedIndex, 1)
        if (previewedItems.length === 0)
          previewedItemsBySession.delete(sessionId)
        else
          previewedItemsBySession.set(sessionId, previewedItems)
      }

      const nextCursor = previewedItem
        ? {
            activityAt: previewedItem.activityAt,
            threadId: previewedItem.digest.threadId,
          }
        : {
            activityAt,
            threadId: resolvedThreadId,
          }
      if (compareExecutionCallbackCursor(nextCursor, currentCursor) <= 0)
        return

      await commitCursor(sessionId, currentCursor, nextCursor)
    })
  }

  function clear(sessionId?: string) {
    const normalizedSessionId = sanitizeExecutionLedgerText(sessionId, 160)
    if (normalizedSessionId) {
      surfacedCursorBySession.delete(normalizedSessionId)
      previewedItemsBySession.delete(normalizedSessionId)
      return
    }
    surfacedCursorBySession.clear()
    previewedItemsBySession.clear()
  }

  return {
    buildPendingExecutionCallbackContext,
    clear,
    markSurfaced,
    peekSurfacedCursor: (sessionId: string) => {
      const normalizedSessionId = sanitizeExecutionLedgerText(sessionId, 160)
      if (!normalizedSessionId)
        return 0
      return surfacedCursorBySession.get(normalizedSessionId)?.activityAt ?? 0
    },
  }
}
