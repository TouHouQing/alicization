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

import {
  isAlicizationThinProjectAwarenessLine,
  normalizeAlicizationExecutionRuntimeContext,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
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
  workspaceRoot?: string
  now?: () => number
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

function looksLikeGenericDispatchSameHerHoldDetail(text: string | null | undefined) {
  const normalized = typeof text === 'string'
    ? text.trim().toLowerCase()
    : ''
  if (!normalized)
    return false

  return /project-state answer before widening|keep the line gentle for now|generic project continuity hold/u.test(normalized)
}

function preferDispatchProjectSameHerHoldDetail(input: {
  payloadProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
  storedProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
}) {
  const payloadSameHerHoldDetail = input.payloadProjectBriefing?.sameHerHoldDetail ?? null
  const continuityCue = input.payloadProjectBriefing?.continuityCue
    ?? input.storedProjectBriefing?.continuityCue
    ?? null
  const storedSameHerHoldDetail = input.storedProjectBriefing?.sameHerHoldDetail ?? null

  if (
    payloadSameHerHoldDetail
    && storedSameHerHoldDetail
    && looksLikeGenericDispatchSameHerHoldDetail(payloadSameHerHoldDetail)
    && !looksLikeGenericDispatchSameHerHoldDetail(storedSameHerHoldDetail)
  ) {
    return storedSameHerHoldDetail
  }

  const preferredPayload = preferStrongerContinuityClosureAuthority(payloadSameHerHoldDetail, continuityCue)
    ?? payloadSameHerHoldDetail
    ?? continuityCue
    ?? null
  const preferredFinal = preferStrongerContinuityClosureAuthority(preferredPayload, storedSameHerHoldDetail)
    ?? preferredPayload
    ?? storedSameHerHoldDetail
    ?? null

  return preferredFinal
}

function buildDispatchProjectAwarenessState(
  projectBriefing: AlicizationExecutionRuntimeContext['projectBriefing'],
) {
  if (!projectBriefing)
    return null

  return {
    ...projectBriefing,
    awarenessLine: projectBriefing.preDialogueAwarenessLine ?? null,
  }
}

function preferDispatchPreDialogueAwarenessLine(input: {
  payloadProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
  storedProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
}) {
  const resolved = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: buildDispatchProjectAwarenessState(input.payloadProjectBriefing),
    fallbackProjectState: buildDispatchProjectAwarenessState(input.storedProjectBriefing),
  })

  return resolved ?? null
}

function preferDispatchPreDialogueAwarenessSummary(input: {
  payloadProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
  storedProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
}) {
  const payloadSummary = input.payloadProjectBriefing?.preDialogueAwarenessSummary ?? null
  const storedSummary = input.storedProjectBriefing?.preDialogueAwarenessSummary ?? null

  if (payloadSummary && !isAlicizationThinProjectAwarenessLine(payloadSummary))
    return payloadSummary

  if (storedSummary && !isAlicizationThinProjectAwarenessLine(storedSummary))
    return storedSummary

  return preferDispatchPreDialogueAwarenessLine(input)
}

function mergeProjectBriefing(input: {
  payloadProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
  storedProjectBriefing: AlicizationExecutionRuntimeContext['projectBriefing']
}): AlicizationExecutionRuntimeContext['projectBriefing'] {
  const { payloadProjectBriefing, storedProjectBriefing } = input
  if (!payloadProjectBriefing)
    return storedProjectBriefing ?? null
  if (!storedProjectBriefing)
    return payloadProjectBriefing

  const merged = {
    identity: payloadProjectBriefing.identity ?? storedProjectBriefing.identity ?? null,
    currentPhase: payloadProjectBriefing.currentPhase ?? storedProjectBriefing.currentPhase ?? null,
    latestLandedProgress: payloadProjectBriefing.latestLandedProgress ?? storedProjectBriefing.latestLandedProgress ?? null,
    primaryOpenLoop: payloadProjectBriefing.primaryOpenLoop ?? storedProjectBriefing.primaryOpenLoop ?? null,
    nextClosureTarget: payloadProjectBriefing.nextClosureTarget ?? storedProjectBriefing.nextClosureTarget ?? null,
    sameHerSelfLine: payloadProjectBriefing.sameHerSelfLine ?? storedProjectBriefing.sameHerSelfLine ?? null,
    sameHerHoldDetail: preferDispatchProjectSameHerHoldDetail({
      payloadProjectBriefing,
      storedProjectBriefing,
    }),
    sameHerDriftRisk: payloadProjectBriefing.sameHerDriftRisk ?? storedProjectBriefing.sameHerDriftRisk ?? null,
    companionBriefingLine: payloadProjectBriefing.companionBriefingLine ?? storedProjectBriefing.companionBriefingLine ?? null,
    emotionalClosureSummary: payloadProjectBriefing.emotionalClosureSummary ?? storedProjectBriefing.emotionalClosureSummary ?? null,
    continuityCue: payloadProjectBriefing.continuityCue ?? storedProjectBriefing.continuityCue ?? null,
    continuityPreferredTiming: payloadProjectBriefing.continuityPreferredTiming ?? storedProjectBriefing.continuityPreferredTiming ?? null,
    continuityCadence: payloadProjectBriefing.continuityCadence ?? storedProjectBriefing.continuityCadence ?? null,
    preferredBlinkCadence: payloadProjectBriefing.preferredBlinkCadence ?? storedProjectBriefing.preferredBlinkCadence ?? null,
    preferredGazeMode: payloadProjectBriefing.preferredGazeMode ?? storedProjectBriefing.preferredGazeMode ?? null,
    preflightSummary: payloadProjectBriefing.preflightSummary ?? storedProjectBriefing.preflightSummary ?? null,
    preDialogueAwarenessLine: preferDispatchPreDialogueAwarenessLine({
      payloadProjectBriefing,
      storedProjectBriefing,
    }),
    preDialogueAwarenessSummary: preferDispatchPreDialogueAwarenessSummary({
      payloadProjectBriefing,
      storedProjectBriefing,
    }),
  } satisfies NonNullable<AlicizationExecutionRuntimeContext['projectBriefing']>

  return Object.values(merged).some(Boolean) ? merged : null
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
    projectBriefing: mergeProjectBriefing({
      payloadProjectBriefing: payloadRuntimeContext.projectBriefing,
      storedProjectBriefing: storedRuntimeContext.projectBriefing,
    }),
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

  if (supportsExecutorSessionTracking(preparedDispatch.sessionTrackingChannel)) {
    await upsertExecutorSession(port, {
      thread,
      transportChannel: preparedDispatch.sessionTrackingChannel,
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
  const summarizedResult = result.summary.trim()

  if (result.events.length > 0)
    await port.appendExecutionEvents(result.events)
  const summarizedThread = await refreshThreadSummary(port, thread.id, summarizedResult, now)
  if (supportsExecutorSessionTracking(preparedDispatch.sessionTrackingChannel)) {
    await upsertExecutorSession(port, {
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
    })
  }
  const auditChannelPrefix = thread.selectedChannel ?? 'unknown-channel'

  await appendAuditLog(port, {
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
      createdEventKinds: collectCreatedEventKinds(result.events),
      errorCode: result.errorCode,
    },
  })

  return {
    thread: summarizedThread,
    createdEventKinds: collectCreatedEventKinds(result.events),
    ok: result.ok,
    summary: summarizedResult,
    output: result.output,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  }
}
