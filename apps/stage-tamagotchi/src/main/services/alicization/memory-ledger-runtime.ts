import type {
  AlicizationExecutionEventRecord,
  AlicizationListExecutionEventsInput,
  AlicizationListTaskThreadsInput,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

import { buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'

import {
  readExecutionOutcome,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
  uniqueExecutionLedgerValues,
} from './execution-ledger-shared'

export interface AlicizationExecutionLedgerContext {
  entries: AlicizationExecutionLedgerDigest[]
  recallText: string
  systemBlock: string
}

export interface AlicizationExecutionLedgerDigest {
  activityAt: number
  channel: string
  eventKinds: string[]
  goal: string
  outcome: string
  status: string
  summary: string
}

export const emptyAlicizationExecutionLedgerContext: AlicizationExecutionLedgerContext = {
  entries: [],
  recallText: '',
  systemBlock: '',
}

interface AlicizationExecutionLedgerRuntimeOptions {
  getNow?: () => number
  listExecutionEvents: (
    input?: AlicizationListExecutionEventsInput,
    options?: { signal?: AbortSignal },
  ) => Promise<AlicizationExecutionEventRecord[]>
  listTaskThreads: (
    input?: AlicizationListTaskThreadsInput,
    options?: { signal?: AbortSignal },
  ) => Promise<AlicizationTaskThreadRecord[]>
}

const ledgerMaxThreadAgeMs = 15 * 60_000
const activeExecutionThreadStatuses = new Set([
  'needs-affirmation',
  'planned',
  'running',
])

function throwIfExecutionLedgerAborted(signal?: AbortSignal) {
  if (signal?.aborted)
    throw signal.reason ?? new DOMException('Execution ledger read aborted', 'AbortError')
}

function readExecutionLedgerRows<TInput, TResult>(
  read: (
    input?: TInput,
    options?: { signal?: AbortSignal },
  ) => Promise<TResult>,
  input: TInput,
  signal?: AbortSignal,
) {
  return signal
    ? read(input, { signal })
    : read(input)
}

async function readExecutionLedgerOwner<T>(
  read: () => Promise<T>,
  fallback: T,
  signal?: AbortSignal,
) {
  throwIfExecutionLedgerAborted(signal)
  try {
    const value = await read()
    throwIfExecutionLedgerAborted(signal)
    return value
  }
  catch (error) {
    if (signal?.aborted || error instanceof Error && error.name === 'AbortError')
      throw error
    return fallback
  }
}

function buildExecutionLedgerItem(input: {
  events: AlicizationExecutionEventRecord[]
  thread: AlicizationTaskThreadRecord
}): AlicizationExecutionLedgerDigest {
  const goal = sanitizeExecutionLedgerText(input.thread.goal, 140) || 'the current task'
  const summary = sanitizeExecutionLedgerText(input.thread.summary, 180)
  const eventKinds = uniqueExecutionLedgerValues(
    [...input.events]
      .sort((left, right) => left.createdAt - right.createdAt)
      .map(event => sanitizeExecutionLedgerText(event.kind, 24)),
  )
  const outcome = readExecutionOutcome(input.events)

  return {
    activityAt: readTaskThreadActivityAt(input.thread),
    channel: sanitizeExecutionLedgerText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'unknown', 48) || 'unknown',
    status: sanitizeExecutionLedgerText(input.thread.status, 48) || 'unknown',
    goal,
    summary,
    eventKinds,
    outcome,
  }
}

function buildExecutionLedgerRecallText(items: AlicizationExecutionLedgerDigest[]) {
  return items.map(item => [
    `execution_channel:${item.channel}`,
    `execution_status:${item.status}`,
    `execution_goal:${item.goal}`,
    item.summary ? `execution_summary:${item.summary}` : '',
    item.eventKinds.length > 0 ? `execution_events:${item.eventKinds.join(',')}` : '',
    item.outcome ? `execution_outcome:${item.outcome}` : '',
  ].filter(Boolean).join(' ')).join('\n')
}

function buildExecutionLedgerSystemBlock(items: AlicizationExecutionLedgerDigest[]) {
  if (items.length === 0)
    return ''

  return buildAlicizationProviderFactBlock('alicization-execution-ledger', {
    entries: items,
  })
}

export function createAlicizationMemoryLedgerRuntime(options: AlicizationExecutionLedgerRuntimeOptions) {
  const getNow = options.getNow ?? Date.now

  async function buildExecutionLedgerContext(input: {
    sessionId: string
    signal?: AbortSignal
  }): Promise<AlicizationExecutionLedgerContext> {
    throwIfExecutionLedgerAborted(input.signal)
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    if (!sessionId)
      return emptyAlicizationExecutionLedgerContext

    const rawThreads = await readExecutionLedgerOwner(
      () => readExecutionLedgerRows(options.listTaskThreads, {
        sessionId,
        limit: 6,
      }, input.signal),
      [],
      input.signal,
    )
    const recentThreads = rawThreads
      .filter(thread => getNow() - readTaskThreadActivityAt(thread) <= ledgerMaxThreadAgeMs)
      .filter(thread => activeExecutionThreadStatuses.has(thread.status))
      .sort((left, right) => readTaskThreadActivityAt(right) - readTaskThreadActivityAt(left))
      .slice(0, 2)

    if (recentThreads.length === 0)
      return emptyAlicizationExecutionLedgerContext

    const items = await Promise.all(recentThreads.map(async (thread) => {
      const events = await readExecutionLedgerOwner(
        () => readExecutionLedgerRows(options.listExecutionEvents, {
          threadId: thread.id,
          limit: 8,
        }, input.signal),
        [],
        input.signal,
      )
      return buildExecutionLedgerItem({
        thread,
        events,
      })
    }))

    return {
      entries: items,
      recallText: buildExecutionLedgerRecallText(items),
      systemBlock: buildExecutionLedgerSystemBlock(items),
    }
  }

  return {
    buildExecutionLedgerContext,
  }
}
