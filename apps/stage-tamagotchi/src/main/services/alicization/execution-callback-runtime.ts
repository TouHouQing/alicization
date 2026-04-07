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
  status: string
  summary: string
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
    status: sanitizeExecutionLedgerText(input.thread.status, 48) || 'unknown',
    summary,
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
      },
    },
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
    },
  }
}

function buildExecutionCallbackRecallText(items: AlicizationExecutionCallbackItem[]) {
  return items.map(item => [
    `execution_callback_channel:${item.channel}`,
    `execution_callback_status:${item.status}`,
    `execution_callback_goal:${item.goal}`,
    item.outcome ? `execution_callback_outcome:${item.outcome}` : '',
    `execution_callback_summary:${item.summary}`,
  ].filter(Boolean).join(' ')).join('\n')
}

function buildExecutionCallbackSystemBlock(items: AlicizationExecutionCallbackItem[]) {
  if (items.length === 0)
    return ''

  return [
    '[ALICIZATION_EXECUTION_CALLBACKS]',
    'Freshly settled runtime callbacks carried into this turn from the current conversation session.',
    'These are already executed results. Reference them naturally when relevant, but do not claim they re-ran in this turn.',
    ...items.map(item => [
      `- channel=${item.channel}`,
      `status=${item.status}`,
      `goal=${item.goal}`,
      `summary=${item.summary}`,
      item.outcome ? `outcome=${item.outcome}` : '',
    ].filter(Boolean).join(' | ')),
  ].join('\n')
}

export function createAlicizationExecutionCallbackRuntime(options: AlicizationExecutionCallbackRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const maxPendingCallbacks = Math.max(1, Math.floor(options.maxPendingCallbacks ?? defaultMaxPendingCallbacks))
  const maxThreadAgeMs = Math.max(1_000, Math.floor(options.maxThreadAgeMs ?? defaultMaxThreadAgeMs))
  const surfacedCursorBySession = new Map<string, number>()

  async function buildPendingExecutionCallbackContext(input: {
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

    surfacedCursorBySession.set(
      sessionId,
      Math.max(...pendingItems.map(item => item.createdAt)),
    )

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
  }
}
