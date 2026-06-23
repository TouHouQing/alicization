import type {
  AlicizationClawTaskIntent,
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

import { normalizeAlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import { resolveExecutionTransportChannel } from './executor-adapters/embodied-channel'
import { prepareTaskThreadDispatch } from './executor-adapters/registry'

type TaskThreadLocalVisualDispatchInput = Pick<AlicizationDispatchTaskThreadInput, 'cli' | 'codex' | 'claudeCode' | 'localVisual' | 'openclaw'>
type TaskThreadLocalVisualSurfaceResult = Promise<unknown> | unknown

type TaskThreadLocalVisualSurface = Record<string, unknown> & {
  desktopInspectScene?: (input: {
    cardId?: string
    forceRefresh?: boolean
    maxSuggestedActions?: number
    question?: string
  }) => TaskThreadLocalVisualSurfaceResult
  executeTaskThread?: (input: {
    thread: AlicizationTaskThreadRecord
    task: AlicizationClawTaskIntent
    dispatch: TaskThreadLocalVisualDispatchInput
  }) => TaskThreadLocalVisualSurfaceResult
  resumeTaskThread?: (input: {
    thread: AlicizationTaskThreadRecord
    threadId: string
  }) => TaskThreadLocalVisualSurfaceResult
}

type TaskThreadDispatchPort = Pick<{
  getTaskThread: (id: string) => Promise<AlicizationTaskThreadRecord | undefined>
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput) => Promise<AlicizationTaskThreadRecord>
  upsertExecutorSession?: (input: AlicizationExecutorSessionUpsertInput) => Promise<unknown>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[]) => Promise<void>
  appendAuditLog?: (input: AlicizationAuditLogInput) => Promise<void>
  localVisualSurface?: TaskThreadLocalVisualSurface
}, 'getTaskThread' | 'upsertTaskThread' | 'upsertExecutorSession' | 'appendExecutionEvents' | 'appendAuditLog' | 'localVisualSurface'>
export type AlicizationTaskThreadDispatchPort = TaskThreadDispatchPort

export interface AlicizationDispatchTaskThreadRuntimeInput extends AlicizationDispatchTaskThreadInput {
  killSwitchSuspended?: boolean
  abortSignal?: AbortSignal
  workspaceRoot?: string
  now?: () => number
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

async function refreshThreadSummary(
  port: TaskThreadDispatchPort,
  threadId: string,
  summary: string,
  now: () => number,
) {
  const refreshed = await port.getTaskThread(threadId)
  if (!refreshed)
    throw new Error(`Task thread "${threadId}" disappeared during dispatch.`)

  if (refreshed.summary === summary)
    return refreshed

  return await port.upsertTaskThread({
    ...refreshed,
    summary,
    updatedAt: Math.max(refreshed.updatedAt, now()),
    lastEventAt: refreshed.lastEventAt,
    completedAt: refreshed.completedAt,
  })
}

function collectCreatedEventKinds(events: AlicizationExecutionEventInput[]) {
  return events
    .map(event => event.kind)
    .filter((kind): kind is AlicizationExecutionEventKind => Boolean(kind))
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

function isLocalVisualExecutionChannel(channel: AlicizationExecutionChannel | null | undefined) {
  return channel === 'browser' || channel === 'software' || channel === 'desktop'
}

function readLocalVisualInstruction(input: AlicizationDispatchTaskThreadInput) {
  const localInstruction = typeof input.localVisual?.instruction === 'string'
    ? input.localVisual.instruction.trim()
    : ''
  if (localInstruction)
    return localInstruction
  return typeof input.openclaw?.instruction === 'string'
    ? input.openclaw.instruction.trim()
    : ''
}

function normalizeLocalVisualResult(result: unknown): Record<string, unknown> {
  if (result && typeof result === 'object' && !Array.isArray(result))
    return result as Record<string, unknown>
  return {
    status: 'completed',
    summary: typeof result === 'string' ? result : 'Local visual dispatch completed.',
    output: typeof result === 'string' ? result : JSON.stringify(result ?? null),
  }
}

function summarizeLocalVisualResult(result: Record<string, unknown>) {
  const summary = typeof result.summary === 'string' && result.summary.trim()
    ? result.summary.trim()
    : ''
  if (summary)
    return summary
  const output = typeof result.output === 'string' && result.output.trim()
    ? result.output.trim()
    : ''
  if (output)
    return output.slice(0, 500)
  return 'Local visual dispatch completed through the runtime GUI bridge.'
}

function readLocalVisualOutput(result: Record<string, unknown>) {
  if (typeof result.output === 'string')
    return result.output
  if (typeof result.summary === 'string')
    return result.summary
  return JSON.stringify(result)
}

function isFailedLocalVisualResult(result: Record<string, unknown>) {
  const status = typeof result.status === 'string' ? result.status.toLowerCase() : ''
  return status === 'failed' || status === 'cancelled' || typeof result.errorCode === 'string'
}

async function runLocalVisualDispatch(input: {
  input: AlicizationDispatchTaskThreadRuntimeInput
  now: () => number
  port: TaskThreadDispatchPort
  runtimeContext: AlicizationExecutionRuntimeContext | null
  thread: AlicizationTaskThreadRecord
}): Promise<AlicizationDispatchTaskThreadResult | null> {
  const localVisualSurface = input.port.localVisualSurface
  if (!localVisualSurface || !isLocalVisualExecutionChannel(input.thread.selectedChannel))
    return null

  const instruction = readLocalVisualInstruction(input.input)
  if (!instruction) {
    return {
      thread: input.thread,
      createdEventKinds: [],
      ok: false,
      summary: 'Local visual dispatch requires an instruction payload.',
      errorCode: 'TASK_THREAD_LOCAL_VISUAL_INPUT_REQUIRED',
      errorMessage: 'Missing local visual instruction payload for dispatch.',
    }
  }

  if (!localVisualSurface.desktopInspectScene)
    return null

  const dispatchAt = input.now()
  const dispatchEvent: AlicizationExecutionEventInput = {
    threadId: input.thread.id,
    decisionTraceId: input.thread.decisionTraceId,
    turnId: input.thread.turnId,
    sessionId: input.thread.sessionId,
    origin: input.thread.origin,
    channel: input.thread.selectedChannel,
    kind: 'dispatch',
    threadStatus: 'running',
    payload: {
      adapter: 'local-visual',
      instruction,
      hasRuntimeContext: input.runtimeContext !== null,
      runtimeContext: input.runtimeContext,
    },
    createdAt: dispatchAt,
  }

  const result = normalizeLocalVisualResult(await localVisualSurface.desktopInspectScene({
    forceRefresh: true,
    maxSuggestedActions: 3,
    question: instruction,
  }))
  const failed = isFailedLocalVisualResult(result)
  const summary = summarizeLocalVisualResult(result)
  const resultAt = Math.max(dispatchAt + 1, input.now())
  const resultEvent: AlicizationExecutionEventInput = {
    threadId: input.thread.id,
    decisionTraceId: input.thread.decisionTraceId,
    turnId: input.thread.turnId,
    sessionId: input.thread.sessionId,
    origin: input.thread.origin,
    channel: input.thread.selectedChannel,
    kind: 'result',
    threadStatus: failed ? 'failed' : 'completed',
    payload: {
      adapter: 'local-visual',
      instruction,
      result,
      hasRuntimeContext: input.runtimeContext !== null,
      runtimeContext: input.runtimeContext,
    },
    createdAt: resultAt,
  }

  await input.port.appendExecutionEvents([dispatchEvent, resultEvent])
  const summarizedThread = await refreshThreadSummary(input.port, input.thread.id, summary, input.now)
  await appendAuditLog(input.port, {
    level: failed ? 'warning' : 'notice',
    category: 'alicization.executor.dispatch',
    action: failed ? 'local-visual-failed' : 'local-visual-completed',
    message: summary,
    payload: {
      threadId: input.thread.id,
      selectedChannel: input.thread.selectedChannel,
      errorCode: typeof result.errorCode === 'string' ? result.errorCode : null,
    },
  })

  return {
    thread: summarizedThread,
    createdEventKinds: ['dispatch', 'result'],
    ok: !failed,
    summary,
    output: readLocalVisualOutput(result),
    errorCode: typeof result.errorCode === 'string' ? result.errorCode : undefined,
    errorMessage: typeof result.errorMessage === 'string' ? result.errorMessage : undefined,
  }
}

async function upsertExecutorSession(
  port: TaskThreadDispatchPort,
  input: {
    thread: AlicizationTaskThreadRecord
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
  const transportChannel = resolveExecutionTransportChannel(input.thread.selectedChannel)
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
  let thread = await port.getTaskThread(input.threadId)
  if (!thread)
    throw new Error(`Task thread "${input.threadId}" was not found.`)

  const runtimeContext = resolveExecutionRuntimeContext(input)
  if (runtimeContext) {
    thread = await persistExecutionRuntimeContext(port, {
      thread,
      runtimeContext,
      now,
    })
  }

  if (input.killSwitchSuspended) {
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
        reason: 'kill-switch-suspended',
        hasRuntimeContext: runtimeContext !== null,
        runtimeContext,
      },
      createdAt: now(),
    }
    await port.appendExecutionEvents([blockedEvent])
    const blockedThread = await refreshThreadSummary(
      port,
      thread.id,
      'Execution stayed blocked because the kill switch is suspended.',
      now,
    )
    await appendAuditLog(port, {
      level: 'warning',
      category: 'alicization.executor.dispatch',
      action: 'blocked-kill-switch',
      message: 'Task-thread dispatch was blocked by kill switch before execution began.',
      payload: {
        threadId: thread.id,
        selectedChannel: thread.selectedChannel,
      },
    })
    return {
      thread: blockedThread,
      createdEventKinds: ['cancel'],
      ok: false,
      summary: 'Execution stayed blocked because the kill switch is suspended.',
      errorCode: 'TASK_THREAD_KILL_SWITCH_BLOCKED',
      errorMessage: 'Kill switch is suspended.',
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

  const localVisualResult = await runLocalVisualDispatch({
    port,
    input,
    thread,
    runtimeContext,
    now,
  })
  if (localVisualResult)
    return localVisualResult

  const preparedDispatch = prepareTaskThreadDispatch({
    thread,
    dispatchInput: {
      cli: input.cli,
      codex: input.codex,
      claudeCode: input.claudeCode,
      localVisual: input.localVisual,
      openclaw: input.openclaw,
    },
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

  if (supportsExecutorSessionTracking(preparedDispatch.channel)) {
    await upsertExecutorSession(port, {
      thread,
      status: 'running',
      summary: buildRunningDispatchSummary(preparedDispatch.channel, thread.selectedChannel),
      now,
      runtimeContext,
    })
  }

  const result = await preparedDispatch.run({
    abortSignal: input.abortSignal,
    workspaceRoot: input.workspaceRoot,
    now,
  })

  if (result.events.length > 0)
    await port.appendExecutionEvents(result.events)
  const summarizedThread = await refreshThreadSummary(port, thread.id, result.summary, now)
  await upsertExecutorSession(port, {
    thread,
    status: result.ok || result.finalStatus === 'cancelled' ? 'active' : 'failed',
    summary: result.summary,
    now,
    errorCode: result.errorCode,
    externalSessionId: 'externalSessionId' in result && typeof result.externalSessionId === 'string'
      ? result.externalSessionId
      : null,
    runtimeContext,
  })
  const auditChannelPrefix = thread.selectedChannel ?? 'unknown-channel'

  await appendAuditLog(port, {
    level: result.ok ? 'notice' : result.finalStatus === 'cancelled' ? 'warning' : 'warning',
    category: 'alicization.executor.dispatch',
    action: result.ok
      ? `${auditChannelPrefix}-completed`
      : result.finalStatus === 'cancelled'
        ? `${auditChannelPrefix}-cancelled`
        : `${auditChannelPrefix}-failed`,
    message: result.summary,
    payload: {
      threadId: thread.id,
      selectedChannel: thread.selectedChannel,
      createdEventKinds: collectCreatedEventKinds(result.events),
      errorCode: result.errorCode,
    },
  })

  return {
    thread: summarizedThread,
    createdEventKinds: collectCreatedEventKinds(result.events),
    ok: result.ok,
    summary: result.summary,
    output: result.output,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  }
}
