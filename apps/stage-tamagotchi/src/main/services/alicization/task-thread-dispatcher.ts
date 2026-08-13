import type {
  AlicizationDispatchTaskThreadInput,
  AlicizationDispatchTaskThreadResult,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationExecutionEventKind,
  AlicizationExecutionRuntimeContext,
  AlicizationExecutorSessionStatus,
  AlicizationExecutorSessionUpsertInput,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import type { AlicizationAuditLogInput } from '../../../shared/eventa'
import type { AlicizationLocalVisualDispatchSurface } from './executor-adapters/local-visual'

import { errorMessageFrom } from '@moeru/std'
import {
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'

import { resolveExecutionTransportChannel } from './executor-adapters/embodied-channel'
import { prepareTaskThreadDispatch } from './executor-adapters/registry'

type TaskThreadDispatchPort = Pick<{
  getTaskThread: (id: string) => Promise<AlicizationTaskThreadRecord | undefined>
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput) => Promise<AlicizationTaskThreadRecord>
  upsertExecutorSession?: (input: AlicizationExecutorSessionUpsertInput) => Promise<unknown>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[]) => Promise<void>
  appendAuditLog?: (input: AlicizationAuditLogInput) => Promise<void>
}, 'getTaskThread' | 'upsertTaskThread' | 'upsertExecutorSession' | 'appendExecutionEvents' | 'appendAuditLog'> & {
  localVisualSurface?: AlicizationLocalVisualDispatchSurface
}
export type AlicizationTaskThreadDispatchPort = TaskThreadDispatchPort

export interface AlicizationDispatchTaskThreadRuntimeInput extends AlicizationDispatchTaskThreadInput {
  killSwitchSuspended?: boolean
  abortSignal?: AbortSignal
  onExecutionEvent?: (event: AlicizationExecutionEventInput) => Promise<void> | void
  eventPersistenceTimeoutMs?: number
  workspaceRoot?: string
  now?: () => number
}

const defaultEventPersistenceTimeoutMs = 1_000
const terminalTaskThreadStatuses = new Set<AlicizationTaskThreadRecord['status']>([
  'completed',
  'failed',
  'cancelled',
])

function normalizePersistenceTimeoutMs(value: number | undefined) {
  if (!Number.isFinite(value))
    return defaultEventPersistenceTimeoutMs
  return Math.max(1, Math.floor(value as number))
}

async function runBoundedPersistence<T>(input: {
  label: string
  operation: () => Promise<T>
  timeoutMs: number
}): Promise<
  | { ok: true, value: T }
  | { ok: false, reason: string }
> {
  return await new Promise((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (
      result:
        | { ok: true, value: T }
        | { ok: false, reason: string },
    ) => {
      if (settled)
        return
      settled = true
      if (timer)
        clearTimeout(timer)
      resolve(result)
    }
    timer = setTimeout(() => {
      finish({
        ok: false,
        reason: `${input.label} timed out after ${input.timeoutMs}ms`,
      })
    }, input.timeoutMs)
    timer.unref?.()

    try {
      void input.operation().then(
        value => finish({ ok: true, value }),
        error => finish({
          ok: false,
          reason: `${input.label} failed: ${errorMessageFrom(error)}`,
        }),
      )
    }
    catch (error) {
      finish({
        ok: false,
        reason: `${input.label} failed: ${errorMessageFrom(error)}`,
      })
    }
  })
}

function withExecutionPersistenceDiagnostics(
  thread: AlicizationTaskThreadRecord,
  failures: string[],
  recordedAt: number,
) {
  if (failures.length === 0)
    return thread.metadata
  const execution = thread.metadata?.execution
  const persistence = execution
    && typeof execution === 'object'
    && !Array.isArray(execution)
    && 'persistence' in execution
    && execution.persistence
    && typeof execution.persistence === 'object'
    && !Array.isArray(execution.persistence)
    ? execution.persistence
    : null
  const previousFailures = persistence
    && 'failures' in persistence
    && Array.isArray(persistence.failures)
    ? persistence.failures.filter((failure): failure is string => typeof failure === 'string')
    : []
  return {
    ...thread.metadata,
    execution: {
      ...(execution && typeof execution === 'object' && !Array.isArray(execution)
        ? execution
        : {}),
      persistence: {
        status: 'degraded',
        failures: [...new Set([
          ...previousFailures,
          ...failures,
        ])],
        recordedAt,
      },
    },
  }
}

function withRuntimeContext<Command extends { runtimeContext?: AlicizationExecutionRuntimeContext | null }>(
  command: Command | null | undefined,
  runtimeContext: AlicizationExecutionRuntimeContext | null,
): Command | null | undefined {
  if (!command || !runtimeContext)
    return command

  return {
    ...command,
    runtimeContext,
  }
}

function applyExecutionRuntimeContextToDispatchInput(
  input: AlicizationDispatchTaskThreadRuntimeInput,
  runtimeContext: AlicizationExecutionRuntimeContext | null,
): AlicizationDispatchTaskThreadInput {
  return {
    threadId: input.threadId,
    cli: withRuntimeContext(input.cli, runtimeContext),
    codex: withRuntimeContext(input.codex, runtimeContext),
    claudeCode: withRuntimeContext(input.claudeCode, runtimeContext),
    localVisual: withRuntimeContext(input.localVisual, runtimeContext),
    openclaw: withRuntimeContext(input.openclaw, runtimeContext),
  }
}

function resolveExecutionRuntimeContext(
  input: AlicizationDispatchTaskThreadInput,
): AlicizationExecutionRuntimeContext | null {
  return normalizeAlicizationExecutionRuntimeContext(
    input.cli?.runtimeContext
    ?? input.codex?.runtimeContext
    ?? input.claudeCode?.runtimeContext
    ?? input.localVisual?.runtimeContext
    ?? input.openclaw?.runtimeContext,
  )
}

function resolvePersistedExecutionRuntimeContext(
  thread: AlicizationTaskThreadRecord,
): AlicizationExecutionRuntimeContext | null {
  const metadata = thread.metadata
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return null

  const execution = (metadata as Record<string, unknown>).execution
  if (!execution || typeof execution !== 'object' || Array.isArray(execution))
    return null

  return normalizeAlicizationExecutionRuntimeContext(
    (execution as Record<string, unknown>).runtimeContext,
  )
}

function mergeExecutionRuntimeContexts(input: {
  payloadRuntimeContext: AlicizationExecutionRuntimeContext | null
  storedRuntimeContext: AlicizationExecutionRuntimeContext | null
}): AlicizationExecutionRuntimeContext | null {
  const { payloadRuntimeContext, storedRuntimeContext } = input
  if (!payloadRuntimeContext)
    return storedRuntimeContext
  if (!storedRuntimeContext)
    return payloadRuntimeContext

  return {
    ...storedRuntimeContext,
    ...payloadRuntimeContext,
    cardId: payloadRuntimeContext.cardId ?? storedRuntimeContext.cardId ?? null,
    decisionTraceId: payloadRuntimeContext.decisionTraceId ?? storedRuntimeContext.decisionTraceId ?? null,
    turnId: payloadRuntimeContext.turnId ?? storedRuntimeContext.turnId ?? null,
    sessionId: payloadRuntimeContext.sessionId ?? storedRuntimeContext.sessionId ?? null,
    agentSessionId: payloadRuntimeContext.agentSessionId ?? storedRuntimeContext.agentSessionId ?? null,
    recentActions: payloadRuntimeContext.recentActions && payloadRuntimeContext.recentActions.length > 0
      ? payloadRuntimeContext.recentActions
      : storedRuntimeContext.recentActions ?? [],
    sensory: payloadRuntimeContext.sensory,
  }
}

async function persistExecutionRuntimeContext(
  port: TaskThreadDispatchPort,
  input: {
    thread: AlicizationTaskThreadRecord
    runtimeContext: AlicizationExecutionRuntimeContext
    now: () => number
  },
) {
  return await port.upsertTaskThread({
    ...input.thread,
    metadata: {
      ...input.thread.metadata,
      execution: {
        ...((input.thread.metadata?.execution && typeof input.thread.metadata.execution === 'object')
          ? input.thread.metadata.execution
          : {}),
        runtimeContext: input.runtimeContext,
      },
    },
    updatedAt: Math.max(input.thread.updatedAt, input.now()),
  })
}

async function appendAuditLog(port: TaskThreadDispatchPort, input: AlicizationAuditLogInput) {
  if (!port.appendAuditLog)
    return
  await port.appendAuditLog(input).catch(() => {})
}

function buildExecutorSessionAffinityKey(thread: AlicizationTaskThreadRecord) {
  const sessionId = typeof thread.sessionId === 'string'
    ? thread.sessionId.trim()
    : ''
  if (sessionId)
    return sessionId
  return thread.id
}

function supportsExecutorSessionTracking(channel: AlicizationExecutionChannel | null) {
  const transportChannel = resolveExecutionTransportChannel(channel)
  return transportChannel === 'codex' || transportChannel === 'claude-code' || transportChannel === 'openclaw'
}

function buildRunningDispatchSummary(
  transportChannel: AlicizationExecutionChannel | null,
  semanticChannel: AlicizationExecutionChannel | null,
) {
  if (transportChannel === 'codex')
    return 'Codex dispatch is running for the current task thread.'
  if (transportChannel === 'claude-code')
    return 'Claude Code dispatch is running for the current task thread.'

  if (transportChannel === 'openclaw') {
    if (semanticChannel && semanticChannel !== 'openclaw')
      return `${semanticChannel} dispatch is running through OpenClaw for the current task thread.`
    return 'OpenClaw dispatch is running for the current task thread.'
  }

  return 'Executor dispatch is running for the current task thread.'
}

async function upsertExecutorSession(
  port: TaskThreadDispatchPort,
  input: {
    thread: AlicizationTaskThreadRecord
    transportChannel?: AlicizationExecutionChannel | null
    status: AlicizationExecutorSessionStatus
    summary: string
    now: () => number
    errorCode?: string
    externalSessionId?: string | null
    runtimeContext?: AlicizationExecutionRuntimeContext | null
  },
) {
  if (!port.upsertExecutorSession)
    return
  const transportChannel = input.transportChannel ?? resolveExecutionTransportChannel(input.thread.selectedChannel)
  if (!supportsExecutorSessionTracking(transportChannel))
    return
  if (!transportChannel)
    return

  await port.upsertExecutorSession({
    channel: transportChannel,
    affinityKey: buildExecutorSessionAffinityKey(input.thread),
    externalSessionId: input.externalSessionId ?? null,
    status: input.status,
    summary: input.summary,
    metadata: {
      source: 'task-thread-dispatcher',
      threadId: input.thread.id,
      decisionTraceId: input.thread.decisionTraceId,
      turnId: input.thread.turnId,
      selectedChannel: input.thread.selectedChannel,
      transportChannel,
      errorCode: input.errorCode ?? null,
      ...(input.runtimeContext
        ? {
            execution: {
              runtimeContext: input.runtimeContext,
            },
          }
        : {}),
    },
    updatedAt: input.now(),
    lastUsedAt: input.now(),
  }).catch(() => {})
}

export async function dispatchTaskThread(
  port: TaskThreadDispatchPort,
  input: AlicizationDispatchTaskThreadRuntimeInput,
): Promise<AlicizationDispatchTaskThreadResult> {
  const now = input.now ?? Date.now
  const eventPersistenceTimeoutMs = normalizePersistenceTimeoutMs(input.eventPersistenceTimeoutMs)
  let thread = await port.getTaskThread(input.threadId)
  if (!thread)
    throw new Error(`Task thread "${input.threadId}" was not found.`)

  const payloadRuntimeContext = resolveExecutionRuntimeContext(input)
  const storedRuntimeContext = resolvePersistedExecutionRuntimeContext(thread)
  const runtimeContext = mergeExecutionRuntimeContexts({
    payloadRuntimeContext,
    storedRuntimeContext,
  })

  if (runtimeContext && (payloadRuntimeContext || storedRuntimeContext !== runtimeContext)) {
    thread = await persistExecutionRuntimeContext(port, {
      thread,
      runtimeContext,
      now,
    })
  }

  if (input.killSwitchSuspended) {
    const blockedAt = now()
    const blockedSummary = 'Execution stayed blocked because the kill switch is suspended.'
    const blockedEvent: AlicizationExecutionEventInput = {
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: thread.selectedChannel,
      kind: 'cancel',
      threadStatus: 'blocked',
      payload: {
        failureKind: 'tool-execution',
        errorCode: 'TASK_THREAD_KILL_SWITCH_BLOCKED',
        errorMessage: blockedSummary,
        reason: 'kill-switch-suspended',
        hasRuntimeContext: runtimeContext !== null,
        runtimeContext,
      },
      createdAt: blockedAt,
    }
    const persistenceFailures: string[] = []
    const eventWrite = await runBoundedPersistence({
      label: 'kill-switch block event persistence',
      operation: async () => await port.appendExecutionEvents([blockedEvent]),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (!eventWrite.ok)
      persistenceFailures.push(eventWrite.reason)

    const blockedInput: AlicizationTaskThreadUpsertInput = {
      ...thread,
      status: 'blocked',
      summary: blockedSummary,
      metadata: withExecutionPersistenceDiagnostics(
        thread,
        persistenceFailures,
        blockedAt,
      ),
      updatedAt: Math.max(thread.updatedAt, blockedAt),
      lastEventAt: eventWrite.ok ? blockedAt : thread.lastEventAt,
      completedAt: thread.completedAt,
    }
    const threadWrite = await runBoundedPersistence({
      label: 'kill-switch blocked task-thread persistence',
      operation: async () => await port.upsertTaskThread(blockedInput),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (!threadWrite.ok)
      persistenceFailures.push(threadWrite.reason)
    const blockedThread = threadWrite.ok
      ? threadWrite.value
      : {
          ...blockedInput,
          metadata: withExecutionPersistenceDiagnostics(
            thread,
            persistenceFailures,
            blockedAt,
          ),
        } as AlicizationTaskThreadRecord

    void appendAuditLog(port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: 'blocked-kill-switch',
      message: persistenceFailures.length > 0
        ? 'Task-thread dispatch was blocked by kill switch with degraded persistence.'
        : 'Task-thread dispatch was blocked by kill switch before execution began.',
      payload: {
        threadId: thread.id,
        selectedChannel: thread.selectedChannel,
        failures: persistenceFailures,
      },
    }).catch(() => {})
    return {
      thread: blockedThread,
      createdEventKinds: eventWrite.ok ? ['cancel'] : [],
      ok: false,
      summary: blockedSummary,
      errorCode: 'TASK_THREAD_KILL_SWITCH_BLOCKED',
      errorMessage: persistenceFailures.length > 0
        ? `Kill switch is suspended; persistence degraded: ${persistenceFailures.join('; ')}`
        : 'Kill switch is suspended.',
    }
  }

  if (thread.status !== 'planned') {
    return {
      thread,
      createdEventKinds: [],
      ok: false,
      summary: `Task thread is not dispatchable while status is ${thread.status}.`,
      errorCode: 'TASK_THREAD_NOT_DISPATCHABLE',
      errorMessage: `Expected planned status but received ${thread.status}.`,
    }
  }

  const dispatchInput = applyExecutionRuntimeContextToDispatchInput(input, runtimeContext)
  const preparedDispatch = prepareTaskThreadDispatch({
    thread,
    dispatchInput,
    localVisualSurface: port.localVisualSurface,
  })
  if (!preparedDispatch.ok) {
    return {
      thread,
      createdEventKinds: [],
      ok: false,
      summary: preparedDispatch.summary,
      errorCode: preparedDispatch.errorCode,
      errorMessage: preparedDispatch.errorMessage,
    }
  }

  if (!runtimeContext) {
    const summary = 'Execution runtime context is required before task-thread dispatch can begin.'
    await appendAuditLog(port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: 'blocked-missing-runtime-context',
      message: summary,
      payload: {
        threadId: thread.id,
        selectedChannel: thread.selectedChannel,
      },
    })
    return {
      thread,
      createdEventKinds: [],
      ok: false,
      summary,
      errorCode: 'TASK_THREAD_RUNTIME_CONTEXT_REQUIRED',
      errorMessage: 'Execution runtime context is required before dispatch begins.',
    }
  }

  const runningDispatchSummary = buildRunningDispatchSummary(
    preparedDispatch.channel,
    thread.selectedChannel,
  )
  const runningAt = now()
  thread = await port.upsertTaskThread({
    ...thread,
    status: 'running',
    summary: runningDispatchSummary,
    updatedAt: Math.max(thread.updatedAt, runningAt),
    lastEventAt: runningAt,
    completedAt: null,
  })

  if (supportsExecutorSessionTracking(preparedDispatch.sessionTrackingChannel)) {
    await upsertExecutorSession(port, {
      thread,
      transportChannel: preparedDispatch.sessionTrackingChannel,
      status: 'running',
      summary: runningDispatchSummary,
      now,
      runtimeContext,
    })
  }

  const persistedLiveEvents = new WeakSet<AlicizationExecutionEventInput>()
  const persistedLiveEventIds = new Set<string>()
  const pendingLiveEvents = new WeakSet<AlicizationExecutionEventInput>()
  const pendingLiveEventIds = new Set<string>()
  const observedLiveEvents: AlicizationExecutionEventInput[] = []
  const persistedEventKinds = new Set<AlicizationExecutionEventKind>()
  const persistenceFailures: string[] = []
  let livePersistenceClosed = false
  let liveEventQueue = Promise.resolve()
  let lateEventQueue = Promise.resolve()
  let terminalThreadSnapshot: AlicizationTaskThreadRecord | null = null
  const scheduledLateEvents = new WeakSet<AlicizationExecutionEventInput>()
  const scheduledLateEventIds = new Set<string>()
  const eventIdOf = (event: AlicizationExecutionEventInput) => {
    const eventId = typeof event.id === 'string' ? event.id.trim() : ''
    return eventId.length > 0 ? eventId : null
  }
  const hasPersistedLiveEvent = (event: AlicizationExecutionEventInput) => {
    const eventId = eventIdOf(event)
    return persistedLiveEvents.has(event)
      || (eventId !== null && persistedLiveEventIds.has(eventId))
  }
  const hasPendingLiveEvent = (event: AlicizationExecutionEventInput) => {
    const eventId = eventIdOf(event)
    return pendingLiveEvents.has(event)
      || (eventId !== null && pendingLiveEventIds.has(eventId))
  }
  const collectUnpersistedEvents = (events: AlicizationExecutionEventInput[]) => {
    const seenEvents = new WeakSet<AlicizationExecutionEventInput>()
    const seenEventIds = new Set<string>()
    return events.filter((event) => {
      if (hasPersistedLiveEvent(event))
        return false
      const eventId = eventIdOf(event)
      if (seenEvents.has(event) || (eventId !== null && seenEventIds.has(eventId)))
        return false
      seenEvents.add(event)
      if (eventId !== null)
        seenEventIds.add(eventId)
      return true
    })
  }
  const markEventsPersisted = (events: AlicizationExecutionEventInput[]) => {
    for (const event of events) {
      const eventId = eventIdOf(event)
      persistedLiveEvents.add(event)
      if (eventId !== null)
        persistedLiveEventIds.add(eventId)
      if (event.kind)
        persistedEventKinds.add(event.kind)
    }
  }
  const clearPendingEvents = (events: AlicizationExecutionEventInput[]) => {
    for (const event of events) {
      const eventId = eventIdOf(event)
      pendingLiveEvents.delete(event)
      if (eventId !== null)
        pendingLiveEventIds.delete(eventId)
    }
  }
  const scheduleLiveEventPersistence = (events: AlicizationExecutionEventInput[]) => {
    if (livePersistenceClosed)
      return
    const pendingEvents = collectUnpersistedEvents(events)
      .filter(event => !hasPendingLiveEvent(event))
    if (pendingEvents.length === 0)
      return

    for (const event of pendingEvents) {
      pendingLiveEvents.add(event)
      const eventId = eventIdOf(event)
      if (eventId !== null)
        pendingLiveEventIds.add(eventId)
    }

    const delivery = liveEventQueue.then(async () => {
      if (livePersistenceClosed) {
        clearPendingEvents(pendingEvents)
        return
      }

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (livePersistenceClosed) {
          clearPendingEvents(pendingEvents)
          return
        }
        const write = await runBoundedPersistence({
          label: `realtime execution event persistence attempt ${attempt}`,
          operation: async () => await port.appendExecutionEvents(pendingEvents),
          timeoutMs: eventPersistenceTimeoutMs,
        })
        if (write.ok) {
          markEventsPersisted(pendingEvents)
          clearPendingEvents(pendingEvents)
          return
        }
      }
      clearPendingEvents(pendingEvents)
    })
    liveEventQueue = delivery.catch(() => {})
    void delivery
  }
  const scheduleLateEventPersistence = (event: AlicizationExecutionEventInput) => {
    const eventId = eventIdOf(event)
    if (
      scheduledLateEvents.has(event)
      || (eventId !== null && scheduledLateEventIds.has(eventId))
    ) {
      return
    }
    scheduledLateEvents.add(event)
    if (eventId !== null)
      scheduledLateEventIds.add(eventId)

    const eventIdentity = eventId ?? `${event.kind ?? 'unknown'}@${event.createdAt ?? 'unknown'}`
    const lateEventFailure = `A late execution event (${eventIdentity}) arrived after realtime persistence closed.`
    const evidenceOnlyEvent: AlicizationExecutionEventInput = {
      ...event,
      threadStatus: undefined,
      payload: {
        ...event.payload,
        lateAfterTerminal: true,
        originalThreadStatus: event.threadStatus ?? null,
      },
    }
    const delivery = lateEventQueue.then(async () => {
      const lateFailures = [lateEventFailure]
      if (!hasPersistedLiveEvent(event)) {
        const eventWrite = await runBoundedPersistence({
          label: 'late execution event persistence',
          operation: async () => await port.appendExecutionEvents([evidenceOnlyEvent]),
          timeoutMs: eventPersistenceTimeoutMs,
        })
        if (eventWrite.ok)
          markEventsPersisted([event])
        else
          lateFailures.push(eventWrite.reason)
      }

      const refreshedThreadRead = await runBoundedPersistence({
        label: 'late execution event task-thread refresh',
        operation: async () => await port.getTaskThread(thread.id),
        timeoutMs: eventPersistenceTimeoutMs,
      })
      if (!refreshedThreadRead.ok) {
        lateFailures.push(refreshedThreadRead.reason)
        return
      }
      const latestThread = refreshedThreadRead.value
      if (!latestThread)
        return
      const terminalThread = terminalTaskThreadStatuses.has(latestThread.status)
        ? latestThread
        : terminalThreadSnapshot ?? latestThread
      const diagnosticAt = now()
      await runBoundedPersistence({
        label: 'late execution event diagnostic persistence',
        operation: async () => await port.upsertTaskThread({
          ...latestThread,
          status: terminalThread.status,
          summary: terminalThread.summary,
          metadata: withExecutionPersistenceDiagnostics(
            latestThread,
            lateFailures,
            diagnosticAt,
          ),
          updatedAt: Math.max(latestThread.updatedAt, diagnosticAt),
          lastEventAt: terminalThread.lastEventAt,
          completedAt: terminalThread.completedAt,
        }),
        timeoutMs: eventPersistenceTimeoutMs,
      })
    })
    lateEventQueue = delivery.catch(() => {})
    void delivery
  }
  const persistAndPublishLiveEvent = (event: AlicizationExecutionEventInput) => {
    if (livePersistenceClosed) {
      scheduleLateEventPersistence(event)
      return Promise.resolve()
    }
    // Runtime observers must see progress immediately. Database persistence is
    // queued independently so a slow SQLite write cannot stall the executor or
    // the Provider continuation.
    try {
      void Promise.resolve(input.onExecutionEvent?.(event)).catch(() => {})
    }
    catch {
      // Synchronous observer failures must not affect executor lifecycle.
    }
    observedLiveEvents.push(event)
    scheduleLiveEventPersistence([event])
    return Promise.resolve()
  }

  let result: Awaited<ReturnType<typeof preparedDispatch.run>>
  try {
    result = await preparedDispatch.run({
      abortSignal: input.abortSignal,
      onExecutionEvent: persistAndPublishLiveEvent,
      workspaceRoot: input.workspaceRoot,
      now,
    })
  }
  catch (error) {
    const errorMessage = errorMessageFrom(error) || 'Executor adapter rejected without an error message.'
    const rawErrorCode = error && typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined
    const errorCode = typeof rawErrorCode === 'string' && rawErrorCode.trim()
      ? rawErrorCode.trim()
      : 'TASK_THREAD_ADAPTER_REJECTED'
    const failedAt = now()
    result = {
      ok: false,
      finalStatus: 'failed',
      summary: `${preparedDispatch.channel} dispatch failed: ${errorMessage}`,
      output: null,
      errorCode,
      errorMessage,
      events: [{
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: thread.selectedChannel,
        kind: 'result',
        threadStatus: 'failed',
        payload: {
          adapter: preparedDispatch.channel,
          failureKind: 'tool-execution',
          errorCode,
          errorMessage,
          rejected: true,
          hasRuntimeContext: runtimeContext !== null,
          runtimeContext,
        },
        createdAt: failedAt,
      }],
    }
  }
  const summarizedResult = result.summary.trim()
  const finalThreadStatus = result.finalStatus ?? (result.ok ? 'completed' : 'failed')
  const finalizedAt = now()
  const finalThreadCompletedAt = finalThreadStatus === 'completed'
    || finalThreadStatus === 'failed'
    || finalThreadStatus === 'cancelled'
    ? finalizedAt
    : thread.completedAt
  terminalThreadSnapshot = {
    ...thread,
    status: finalThreadStatus,
    summary: summarizedResult,
    updatedAt: Math.max(thread.updatedAt, finalizedAt),
    lastEventAt: finalizedAt,
    completedAt: finalThreadCompletedAt,
  }

  const liveDrain = await runBoundedPersistence({
    label: 'realtime execution event drain',
    operation: async () => {
      while (true) {
        const queueSnapshot = liveEventQueue
        await queueSnapshot
        if (queueSnapshot !== liveEventQueue)
          continue
        livePersistenceClosed = true
        return
      }
    },
    timeoutMs: eventPersistenceTimeoutMs,
  })
  if (!liveDrain.ok)
    persistenceFailures.push(liveDrain.reason)
  if (!livePersistenceClosed)
    livePersistenceClosed = true

  const finalEvents = collectUnpersistedEvents([
    ...observedLiveEvents,
    ...result.events,
  ])
  if (finalEvents.length > 0) {
    const finalWrite = await runBoundedPersistence({
      label: 'final execution event persistence',
      operation: async () => await port.appendExecutionEvents(finalEvents),
      timeoutMs: eventPersistenceTimeoutMs,
    })
    if (finalWrite.ok)
      markEventsPersisted(finalEvents)
    else
      persistenceFailures.push(finalWrite.reason)
  }

  const refreshedThreadRead = await runBoundedPersistence({
    label: 'terminal task-thread refresh',
    operation: async () => await port.getTaskThread(thread.id),
    timeoutMs: eventPersistenceTimeoutMs,
  })
  if (!refreshedThreadRead.ok)
    persistenceFailures.push(refreshedThreadRead.reason)
  const terminalBaseThread = refreshedThreadRead.ok && refreshedThreadRead.value
    ? refreshedThreadRead.value
    : thread
  const terminalInput: AlicizationTaskThreadUpsertInput = {
    ...terminalBaseThread,
    status: finalThreadStatus,
    summary: summarizedResult,
    metadata: withExecutionPersistenceDiagnostics(
      terminalBaseThread,
      persistenceFailures,
      finalizedAt,
    ),
    updatedAt: Math.max(terminalBaseThread.updatedAt, finalizedAt),
    lastEventAt: finalizedAt,
    completedAt: finalThreadCompletedAt,
  }
  const terminalWrite = await runBoundedPersistence({
    label: 'terminal task-thread persistence',
    operation: async () => await port.upsertTaskThread(terminalInput),
    timeoutMs: eventPersistenceTimeoutMs,
  })
  if (!terminalWrite.ok)
    persistenceFailures.push(terminalWrite.reason)
  const summarizedThread = terminalWrite.ok
    ? terminalWrite.value
    : {
        ...terminalInput,
        metadata: withExecutionPersistenceDiagnostics(
          terminalBaseThread,
          persistenceFailures,
          finalizedAt,
        ),
      } as AlicizationTaskThreadRecord
  terminalThreadSnapshot = summarizedThread
  if (supportsExecutorSessionTracking(preparedDispatch.sessionTrackingChannel)) {
    void upsertExecutorSession(port, {
      thread,
      transportChannel: preparedDispatch.sessionTrackingChannel,
      status: result.ok || result.finalStatus === 'cancelled' ? 'active' : 'failed',
      summary: summarizedResult,
      now,
      errorCode: result.errorCode,
      externalSessionId: 'externalSessionId' in result && typeof result.externalSessionId === 'string'
        ? result.externalSessionId
        : null,
      runtimeContext,
    }).catch(() => {})
  }
  const auditChannelPrefix = thread.selectedChannel ?? 'unknown-channel'
  const createdEventKinds = [...persistedEventKinds]

  if (persistenceFailures.length > 0) {
    void appendAuditLog(port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: `${auditChannelPrefix}-persistence-degraded`,
      message: 'Execution completed with degraded event or terminal persistence.',
      payload: {
        threadId: thread.id,
        selectedChannel: thread.selectedChannel,
        failures: persistenceFailures,
        createdEventKinds,
      },
    }).catch(() => {})
  }

  void appendAuditLog(port, {
    level: result.ok ? 'notice' : result.finalStatus === 'cancelled' ? 'warning' : 'warning',
    category: 'alicization.executor.dispatch',
    action: result.ok
      ? `${auditChannelPrefix}-completed`
      : result.finalStatus === 'cancelled'
        ? `${auditChannelPrefix}-cancelled`
        : `${auditChannelPrefix}-failed`,
    message: summarizedResult,
    payload: {
      threadId: thread.id,
      selectedChannel: thread.selectedChannel,
      createdEventKinds,
      errorCode: result.errorCode,
    },
  }).catch(() => {})

  return {
    thread: summarizedThread,
    createdEventKinds,
    ok: result.ok,
    finalStatus: result.finalStatus,
    summary: summarizedResult,
    output: result.output,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  }
}
