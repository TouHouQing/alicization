import type {
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import process from 'node:process'

import { createHash, randomUUID } from 'node:crypto'
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { dispatchTaskThread } from '../src/main/services/alicization/task-thread-dispatcher'

export const codexAcceptanceScenarios = [
  'long-task',
  'cancel',
  'timeout',
  'retry',
  'failure-isolation',
  'background',
  'restart-recovery',
] as const

const codexAcceptanceRetryFailureAttempts = 5

export type CodexAcceptanceScenario = typeof codexAcceptanceScenarios[number]
export type CodexAcceptanceMode = 'real-cli' | 'local-fixture'
export type CodexAcceptanceStatus = 'passed' | 'failed' | 'blocked'

export interface CodexAcceptanceTaskState {
  transitions: string[]
  persistedThread: AlicizationTaskThreadRecord | null
  persistedThreads: AlicizationTaskThreadRecord[]
  persistedEvents: AlicizationExecutionEventInput[]
  persistedStatus: AlicizationTaskThreadRecord['status'] | null
  persistedEventTypes: string[]
  observableTaskThread: boolean
  taskThreadLifecyclePersisted: boolean
  progressPersisted: boolean
  cancelledThreadPersisted: boolean
  cancelEventPersisted: boolean
  timeoutThreadTerminalPersisted: boolean
  retryAttemptLifecyclesPersisted: boolean
  backgroundAccepted: boolean
  foregroundDetached: boolean
  completedAfterForegroundDetached: boolean
  restarted: boolean
  recoveryEventPersisted: boolean
  recoveryEvidence: {
    persistedBeforeRestart: boolean
    eventCount: number
  } | null
}

interface CodexAcceptanceTaskStateInput {
  persistedThread?: AlicizationTaskThreadRecord | null
  persistedThreads?: AlicizationTaskThreadRecord[]
  persistedEvents?: AlicizationExecutionEventInput[]
  transitions?: string[]
  backgroundAccepted?: boolean
  foregroundDetached?: boolean
  completedAfterForegroundDetached?: boolean
  restarted?: boolean
  recoveryEventPersisted?: boolean
  recoveryEvidence?: {
    persistedBeforeRestart: boolean
    eventCount: number
  } | null
}

interface CodexAcceptanceTaskStoreSnapshot {
  version: 1
  thread: AlicizationTaskThreadRecord | null
  threads: AlicizationTaskThreadRecord[]
  events: AlicizationExecutionEventInput[]
  transitions: string[]
  foregroundDetached: boolean
  foregroundDetachedAt: number | null
  backgroundAccepted: boolean
  completedAfterForegroundDetached: boolean
  restarted: boolean
  recoveryEventPersisted: boolean
  recoveryEvidence: {
    persistedBeforeRestart: boolean
    eventCount: number
  } | null
}

export interface CodexAcceptanceTaskStore {
  getTaskThread: (id: string) => Promise<AlicizationTaskThreadRecord | undefined>
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput) => Promise<AlicizationTaskThreadRecord>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[]) => Promise<void>
  listTaskThreads: (input?: {
    status?: AlicizationTaskThreadRecord['status'] | AlicizationTaskThreadRecord['status'][]
    limit?: number
  }) => Promise<AlicizationTaskThreadRecord[]>
  listExecutionEvents: (input?: {
    threadId?: string
    attemptId?: string
    limit?: number
  }) => Promise<AlicizationExecutionEventInput[]>
  upsertExecutorSession?: () => Promise<void>
  appendAuditLog?: () => Promise<void>
  snapshot: () => Promise<CodexAcceptanceTaskStoreSnapshot>
  markBackgroundAccepted: () => Promise<void>
  markForegroundDetached: () => Promise<void>
  markProcessRestarted: () => Promise<void>
  prepareRestartRecovery: () => Promise<AlicizationTaskThreadRecord | null>
}

function cloneAcceptanceTaskState(
  state: CodexAcceptanceTaskStoreSnapshot,
): CodexAcceptanceTaskStoreSnapshot {
  return JSON.parse(JSON.stringify(state)) as CodexAcceptanceTaskStoreSnapshot
}

function createEmptyAcceptanceTaskState(): CodexAcceptanceTaskStoreSnapshot {
  return {
    version: 1,
    thread: null,
    threads: [],
    events: [],
    transitions: [],
    foregroundDetached: false,
    foregroundDetachedAt: null,
    backgroundAccepted: false,
    completedAfterForegroundDetached: false,
    restarted: false,
    recoveryEventPersisted: false,
    recoveryEvidence: null,
  }
}

function normalizeAcceptanceTaskState(
  raw: unknown,
): CodexAcceptanceTaskStoreSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return createEmptyAcceptanceTaskState()

  const input = raw as Partial<CodexAcceptanceTaskStoreSnapshot>
  const threads = Array.isArray(input.threads)
    ? input.threads.filter((thread): thread is AlicizationTaskThreadRecord => (
        Boolean(thread && typeof thread === 'object' && typeof thread.id === 'string')
      ))
    : []
  const thread = input.thread && typeof input.thread === 'object'
    && typeof input.thread.id === 'string'
    ? input.thread as AlicizationTaskThreadRecord
    : threads.at(-1) ?? null

  return {
    version: 1,
    thread,
    threads,
    events: Array.isArray(input.events)
      ? input.events.filter((event): event is AlicizationExecutionEventInput => (
          Boolean(event && typeof event === 'object' && typeof event.threadId === 'string')
        ))
      : [],
    transitions: Array.isArray(input.transitions)
      ? input.transitions.filter((status): status is string => typeof status === 'string')
      : [],
    foregroundDetached: input.foregroundDetached === true,
    foregroundDetachedAt: typeof input.foregroundDetachedAt === 'number'
      ? input.foregroundDetachedAt
      : null,
    backgroundAccepted: input.backgroundAccepted === true,
    completedAfterForegroundDetached: input.completedAfterForegroundDetached === true,
    restarted: input.restarted === true,
    recoveryEventPersisted: input.recoveryEventPersisted === true,
    recoveryEvidence: input.recoveryEvidence
      && typeof input.recoveryEvidence === 'object'
      ? {
          persistedBeforeRestart: input.recoveryEvidence.persistedBeforeRestart === true,
          eventCount: Number.isFinite(input.recoveryEvidence.eventCount)
            ? Math.max(0, Math.floor(input.recoveryEvidence.eventCount))
            : 0,
        }
      : null,
  }
}

async function readAcceptanceTaskState(path: string) {
  try {
    return normalizeAcceptanceTaskState(JSON.parse(await readFile(path, 'utf8')))
  }
  catch {
    return createEmptyAcceptanceTaskState()
  }
}

export async function createCodexAcceptanceTaskStore(
  path: string,
): Promise<CodexAcceptanceTaskStore> {
  const state = await readAcceptanceTaskState(path)
  let writeQueue = Promise.resolve()

  const persist = async () => {
    const nextWrite = writeQueue.then(async () => {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    })
    writeQueue = nextWrite.catch(() => {})
    await nextWrite
  }

  const getTaskThread = async (id: string) => (
    state.threads.find(thread => thread.id === id)
    ?? (state.thread?.id === id ? state.thread : undefined)
  )

  const upsertTaskThread = async (input: AlicizationTaskThreadUpsertInput) => {
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id)
      throw new Error('Acceptance task thread id is required.')

    const current = await getTaskThread(id)
    if (input.createOnly && current) {
      throw Object.assign(new Error(`Task thread ${id} already exists.`), {
        code: 'TASK_THREAD_ALREADY_EXISTS',
      })
    }
    if (
      input.expectedUpdatedAt !== undefined
      && input.expectedUpdatedAt !== null
      && current
      && input.expectedUpdatedAt !== current.updatedAt
    ) {
      throw Object.assign(new Error(`Task thread ${id} changed before this update.`), {
        code: 'TASK_THREAD_VERSION_CONFLICT',
      })
    }

    const next: AlicizationTaskThreadRecord = {
      id,
      attemptId: input.attemptId ?? current?.attemptId ?? randomUUID(),
      decisionTraceId: input.decisionTraceId ?? current?.decisionTraceId ?? null,
      turnId: input.turnId ?? current?.turnId ?? null,
      sessionId: input.sessionId ?? current?.sessionId ?? null,
      origin: input.origin ?? current?.origin ?? 'user-turn',
      goal: input.goal ?? current?.goal ?? '',
      kind: input.kind ?? current?.kind ?? 'unknown',
      status: input.status ?? current?.status ?? 'planned',
      selectedChannel: input.selectedChannel ?? current?.selectedChannel ?? null,
      proposedChannel: input.proposedChannel ?? current?.proposedChannel ?? null,
      summary: input.summary ?? current?.summary ?? null,
      metadata: input.metadata ?? current?.metadata ?? null,
      createdAt: input.createdAt ?? current?.createdAt ?? Date.now(),
      updatedAt: input.updatedAt ?? current?.updatedAt ?? Date.now(),
      lastEventAt: input.lastEventAt ?? current?.lastEventAt ?? null,
      completedAt: input.completedAt ?? current?.completedAt ?? null,
    }

    if (!current || current.status !== next.status)
      state.transitions.push(next.status)
    if (
      state.foregroundDetached
      && next.status === 'completed'
      && current?.status !== 'completed'
    ) {
      state.completedAfterForegroundDetached = true
    }
    state.threads = [
      ...state.threads.filter(thread => thread.id !== id),
      next,
    ]
    state.thread = next
    await persist()
    return { ...next }
  }

  const appendExecutionEvents = async (events: AlicizationExecutionEventInput[]) => {
    state.events.push(...events.map(event => ({ ...event })))
    await persist()
  }

  const listTaskThreads = async (input?: {
    status?: AlicizationTaskThreadRecord['status'] | AlicizationTaskThreadRecord['status'][]
    limit?: number
  }) => {
    const statuses = input?.status === undefined
      ? []
      : Array.isArray(input.status) ? input.status : [input.status]
    const limit = Number.isFinite(input?.limit)
      ? Math.max(1, Math.floor(input?.limit as number))
      : 200
    return state.threads
      .filter(thread => statuses.length === 0 || statuses.includes(thread.status))
      .slice(-limit)
      .map(thread => ({ ...thread }))
  }

  const listExecutionEvents = async (input?: {
    threadId?: string
    attemptId?: string
    limit?: number
  }) => {
    const limit = Number.isFinite(input?.limit)
      ? Math.max(1, Math.floor(input?.limit as number))
      : state.events.length
    return state.events
      .filter(event => !input?.threadId || event.threadId === input.threadId)
      .filter(event => !input?.attemptId || event.attemptId === input.attemptId)
      .slice(-limit)
      .map(event => ({ ...event }))
  }

  const markForegroundDetached = async () => {
    state.foregroundDetached = true
    state.foregroundDetachedAt = Date.now()
    await persist()
  }

  const markBackgroundAccepted = async () => {
    state.backgroundAccepted = true
    await persist()
  }

  const markProcessRestarted = async () => {
    state.restarted = true
    state.recoveryEvidence = {
      persistedBeforeRestart: Boolean(state.thread),
      eventCount: state.events.length,
    }
    await persist()
  }

  const prepareRestartRecovery = async () => {
    const thread = state.thread
    if (!thread || !['running', 'paused', 'failed'].includes(thread.status))
      return null

    const recoveredAt = Date.now()
    const recoveryEvent: AlicizationExecutionEventInput = {
      id: `${thread.id}:restart-recovery:${recoveredAt}`,
      attemptId: thread.attemptId ?? null,
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: thread.selectedChannel,
      kind: 'resume',
      threadStatus: 'planned',
      payload: {
        resumeMode: 'retry',
        previousStatus: thread.status,
        effect: 'observe',
        sideEffectState: 'none',
        recoveryBoundary: 'process-restart',
      },
      createdAt: recoveredAt,
    }
    const recoveredThread = await upsertTaskThread({
      ...thread,
      attemptId: randomUUID(),
      status: 'planned',
      summary: 'Recovered for a read-only retry after process restart.',
      metadata: {
        ...thread.metadata,
        execution: {
          ...(
            thread.metadata?.execution
            && typeof thread.metadata.execution === 'object'
            && !Array.isArray(thread.metadata.execution)
              ? thread.metadata.execution
              : {}
          ),
          recovery: {
            mode: 'retry-observe',
            previousStatus: thread.status,
            resumedAt: recoveredAt,
            state: 'retrying',
          },
        },
      },
      updatedAt: recoveredAt,
      lastEventAt: recoveredAt,
      completedAt: null,
    })
    await appendExecutionEvents([{
      ...recoveryEvent,
      attemptId: recoveredThread.attemptId ?? null,
    }])
    return recoveredThread
  }

  return {
    getTaskThread,
    upsertTaskThread,
    appendExecutionEvents,
    listTaskThreads,
    listExecutionEvents,
    upsertExecutorSession: async () => {},
    appendAuditLog: async () => {},
    snapshot: async () => cloneAcceptanceTaskState(state),
    markBackgroundAccepted,
    markForegroundDetached,
    markProcessRestarted,
    prepareRestartRecovery,
  }
}

export function buildCodexAcceptanceTaskState(
  input: CodexAcceptanceTaskStateInput,
): CodexAcceptanceTaskState {
  const persistedThread = input.persistedThread ?? null
  const persistedThreads = input.persistedThreads ?? []
  const persistedEvents = input.persistedEvents ?? []
  const persistedStatus = persistedThread?.status ?? null
  const persistedEventTypes = persistedEvents
    .flatMap((event) => {
      const payload = event.payload
      return payload && typeof payload === 'object' && !Array.isArray(payload)
        && typeof payload.codexEventType === 'string'
        ? [payload.codexEventType]
        : []
    })
  const transitions = input.transitions ?? []
  const terminalStatus = persistedStatus === 'completed'
    || persistedStatus === 'failed'
    || persistedStatus === 'cancelled'
    || persistedStatus === 'paused'
    || persistedStatus === 'blocked'
    || persistedStatus === 'dead-lettered'
  const taskThreadLifecyclePersisted = transitions.includes('planned')
    && transitions.includes('running')
    && terminalStatus
  const progressPersisted = persistedEvents.some((event) => {
    const payload = event.payload
    return Boolean(
      payload
      && typeof payload === 'object'
      && !Array.isArray(payload)
      && (
        payload.semanticProgress === true
        || payload.itemType === 'command_execution'
      ),
    )
  })
  const cancelEventPersisted = persistedEvents.some(event => event.kind === 'cancel')
  const timeoutEvidencePersisted = persistedEvents.some((event) => {
    const payload = event.payload
    return Boolean(
      payload
      && typeof payload === 'object'
      && !Array.isArray(payload)
      && (
        payload.timedOut === true
        || (typeof payload.errorCode === 'string' && payload.errorCode.toUpperCase().includes('TIMEOUT'))
      ),
    )
  })
  const recoveryEventPersisted = persistedEvents.some(event => (
    event.kind === 'resume'
    && event.payload
    && typeof event.payload === 'object'
    && !Array.isArray(event.payload)
    && event.payload.recoveryBoundary === 'process-restart'
  ))

  return {
    transitions,
    persistedThread,
    persistedThreads,
    persistedEvents,
    persistedStatus,
    persistedEventTypes,
    observableTaskThread: Boolean(persistedThread && persistedThreads.some(thread => (
      thread.id === persistedThread.id
      && thread.status === persistedThread.status
    ))),
    taskThreadLifecyclePersisted,
    progressPersisted,
    cancelledThreadPersisted: persistedStatus === 'cancelled',
    cancelEventPersisted,
    timeoutThreadTerminalPersisted: terminalStatus
      && persistedStatus !== 'completed'
      && (persistedStatus === 'failed' || persistedStatus === 'paused')
      && timeoutEvidencePersisted,
    retryAttemptLifecyclesPersisted: countCodexEventType(persistedEventTypes, 'provider.retry')
      >= codexAcceptanceRetryFailureAttempts
      && countCodexEventType(persistedEventTypes, 'thread.started')
      >= codexAcceptanceRetryFailureAttempts + 1
      && countCodexEventType(persistedEventTypes, 'turn.started')
      >= codexAcceptanceRetryFailureAttempts + 1,
    backgroundAccepted: input.backgroundAccepted === true,
    foregroundDetached: input.foregroundDetached === true,
    completedAfterForegroundDetached: input.completedAfterForegroundDetached === true,
    restarted: input.restarted === true,
    recoveryEventPersisted: input.recoveryEventPersisted === true || recoveryEventPersisted,
    recoveryEvidence: input.recoveryEvidence ?? null,
  }
}

export interface CodexAcceptanceArgs {
  scenarios: CodexAcceptanceScenario[]
  allowRealCli: boolean
  reportPath: string
  longTaskDelayMs: number
  cancelDelayMs: number
  startupTimeoutMs: number
  activeStepTimeoutMs: number
  totalTimeoutMs: number
  keepArtifacts: boolean
}

interface CodexAcceptanceEvent {
  kind: string
  payload?: Record<string, unknown> | null
}

interface CodexAcceptanceResult {
  ok: boolean
  finalStatus: string
  aborted: boolean
  timedOut: boolean
  errorCode?: string
  errorMessage?: string
  output?: string | null
  assistantOutput?: string | null
}

export interface CodexAcceptanceClassificationInput {
  scenario: CodexAcceptanceScenario
  mode: CodexAcceptanceMode
  result: CodexAcceptanceResult
  events: CodexAcceptanceEvent[]
  attemptCount?: number
  workspaceChanged: boolean
  cancelTargetObserved?: boolean
  taskState?: CodexAcceptanceTaskState
}

export interface CodexAcceptanceClassification {
  status: Exclude<CodexAcceptanceStatus, 'blocked'>
  failures: string[]
  assertions: Record<string, boolean>
}

export interface CodexAcceptanceScenarioReport {
  scenario: CodexAcceptanceScenario
  mode: CodexAcceptanceMode
  status: CodexAcceptanceStatus
  startedAt: number
  finishedAt: number
  durationMs: number
  result: {
    ok: boolean
    finalStatus: string
    aborted: boolean
    timedOut: boolean
    errorCode: string | null
    errorMessage: string | null
    output: string | null
  }
  observations: {
    eventCount: number
    eventTypes: string[]
    semanticProgressCount: number
    heartbeatCount: number
    commandEventCount: number
    retryEventCount: number
    terminalEventCount: number
    firstSemanticProgressMs: number | null
    attemptCount: number
    threadStartCount: number
    turnStartCount: number
    failedTurnCount: number
    completedTurnCount: number
    cancelTargetObserved: boolean
  }
  taskState: CodexAcceptanceTaskState | null
  assertions: Record<string, boolean>
  failures: string[]
  workspace: {
    changed: boolean
    retained: boolean
    path: string | null
  }
  blockingReason?: string
}

export interface CodexAcceptanceReport {
  version: 'codex-real-acceptance-report-v1'
  startedAt: number
  finishedAt: number
  passed: boolean
  scenarios: CodexAcceptanceScenarioReport[]
}

export function calculateFirstSemanticProgressMs(input: {
  startedAt: number
  firstSemanticProgressAt: number | null
  settledAt: number
}) {
  if (input.firstSemanticProgressAt === null)
    return null
  return Math.max(0, input.firstSemanticProgressAt - input.startedAt)
}

function parseInteger(raw: string | undefined, fallback: number, minimum: number) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return fallback
  return Math.max(minimum, Math.floor(value))
}

function readOptionValue(args: string[], index: number, name: string) {
  const value = args[index + 1]
  if (!value || value.startsWith('--'))
    throw new Error(`${name} 需要一个值。`)
  return value
}

function normalizeScenario(raw: string): CodexAcceptanceScenario[] {
  const values = raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  if (values.length === 0)
    throw new Error('至少需要一个验收场景。')
  if (values.includes('all'))
    return [...codexAcceptanceScenarios]

  const unknown = values.filter(value => !codexAcceptanceScenarios.includes(value as CodexAcceptanceScenario))
  if (unknown.length > 0)
    throw new Error(`未知 Codex 验收场景：${unknown.join(', ')}`)

  return [...new Set(values)] as CodexAcceptanceScenario[]
}

export function parseCodexAcceptanceArgs(rawArgs: string[]): CodexAcceptanceArgs {
  const defaultReportPath = join(
    homedir(),
    'Desktop',
    'Alicization-Codex-Traces',
    `codex-acceptance-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  const parsed: CodexAcceptanceArgs = {
    scenarios: [...codexAcceptanceScenarios],
    allowRealCli: false,
    reportPath: defaultReportPath,
    longTaskDelayMs: 2_000,
    cancelDelayMs: 1_000,
    startupTimeoutMs: 120_000,
    activeStepTimeoutMs: 30_000,
    totalTimeoutMs: 180_000,
    keepArtifacts: false,
  }

  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index]
    if (arg === '--real-cli') {
      parsed.allowRealCli = true
      continue
    }
    if (arg === '--keep-artifacts') {
      parsed.keepArtifacts = true
      continue
    }
    if (arg === '--scenario') {
      parsed.scenarios = normalizeScenario(readOptionValue(rawArgs, index++, arg))
      continue
    }
    if (arg === '--report') {
      parsed.reportPath = resolve(readOptionValue(rawArgs, index++, arg))
      continue
    }
    if (arg === '--long-task-delay-ms') {
      parsed.longTaskDelayMs = parseInteger(readOptionValue(rawArgs, index++, arg), parsed.longTaskDelayMs, 500)
      continue
    }
    if (arg === '--cancel-delay-ms') {
      parsed.cancelDelayMs = parseInteger(readOptionValue(rawArgs, index++, arg), parsed.cancelDelayMs, 50)
      continue
    }
    if (arg === '--startup-timeout-ms') {
      parsed.startupTimeoutMs = parseInteger(readOptionValue(rawArgs, index++, arg), parsed.startupTimeoutMs, 300)
      continue
    }
    if (arg === '--active-step-timeout-ms') {
      parsed.activeStepTimeoutMs = parseInteger(readOptionValue(rawArgs, index++, arg), parsed.activeStepTimeoutMs, 300)
      continue
    }
    if (arg === '--total-timeout-ms') {
      parsed.totalTimeoutMs = parseInteger(readOptionValue(rawArgs, index++, arg), parsed.totalTimeoutMs, 300)
      continue
    }
    throw new Error(`未知参数：${arg}`)
  }

  return parsed
}

function payloadOf(event: CodexAcceptanceEvent) {
  return event.payload ?? {}
}

export function isCodexAcceptanceActiveCommandEvent(event: CodexAcceptanceEvent) {
  const payload = payloadOf(event)
  return payload.codexEventType === 'item.started'
    && payload.itemType === 'command_execution'
}

function hasNonEmptyText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function countCodexEventType(eventTypes: string[], eventType: string) {
  return eventTypes.filter(type => type === eventType).length
}

export function classifyCodexAcceptanceOutcome(
  input: CodexAcceptanceClassificationInput,
): CodexAcceptanceClassification {
  const payloads = input.events.map(payloadOf)
  const eventTypes = payloads.map(payload => String(payload.codexEventType ?? ''))
  const semanticProgressObserved = payloads.some(payload => payload.semanticProgress === true)
  const workspaceUnchanged = !input.workspaceChanged
  const failures: string[] = []

  if (input.scenario === 'long-task') {
    const taskThreadLifecyclePersisted = !input.taskState
      || (
        input.taskState.taskThreadLifecyclePersisted
        && input.taskState.persistedStatus === 'completed'
      )
    const progressPersisted = !input.taskState || input.taskState.progressPersisted
    const observableTaskThread = !input.taskState || input.taskState.observableTaskThread
    const assertions = {
      semanticProgressObserved,
      terminalSettlementObserved: input.result.ok
        && input.result.finalStatus === 'completed'
        && eventTypes.includes('turn.completed'),
      ...(input.taskState
        ? {
            taskThreadLifecyclePersisted,
            progressPersisted,
            observableTaskThread,
          }
        : {}),
      workspaceUnchanged,
    }
    if (!assertions.semanticProgressObserved)
      failures.push('未观察到 Codex 语义进度。')
    if (!assertions.terminalSettlementObserved)
      failures.push('长任务没有以成功终态完成。')
    if (!taskThreadLifecyclePersisted)
      failures.push('任务线程没有持久化 planned -> running -> completed 生命周期。')
    if (!progressPersisted)
      failures.push('Codex 实时进度没有写入任务事件账本。')
    if (!observableTaskThread)
      failures.push('任务线程无法通过持久化任务列表查询。')
    if (!assertions.workspaceUnchanged)
      failures.push('只读长任务改变了临时工作区。')
    return {
      status: failures.length === 0 ? 'passed' : 'failed',
      failures,
      assertions,
    }
  }

  if (input.scenario === 'cancel') {
    const cancellationObserved = input.result.aborted
      && input.result.finalStatus === 'cancelled'
      && (
        input.events.some(event => event.kind === 'cancel')
        || input.result.errorCode === 'CODEX_ABORTED'
      )
    const cancelTargetObserved = input.cancelTargetObserved === true
      && input.events.some(isCodexAcceptanceActiveCommandEvent)
    const cancelledThreadPersisted = !input.taskState || input.taskState.cancelledThreadPersisted
    const cancelEventPersisted = !input.taskState || input.taskState.cancelEventPersisted
    const observableTaskThread = !input.taskState || input.taskState.observableTaskThread
    const assertions = {
      cancellationObserved,
      cancelTargetObserved,
      ...(input.taskState
        ? {
            cancelledThreadPersisted,
            cancelEventPersisted,
            observableTaskThread,
          }
        : {}),
      workspaceUnchanged,
    }
    if (!assertions.cancellationObserved)
      failures.push('真实 Codex 进程没有返回 cancelled/CODEX_ABORTED。')
    if (!assertions.cancelTargetObserved)
      failures.push('取消发生前没有观察到正在执行的命令步骤。')
    if (!cancelledThreadPersisted)
      failures.push('取消后的任务线程状态没有持久化为 cancelled。')
    if (!cancelEventPersisted)
      failures.push('取消事件没有写入持久化任务事件账本。')
    if (!observableTaskThread)
      failures.push('取消后的任务线程无法通过持久化任务列表查询。')
    if (!assertions.workspaceUnchanged)
      failures.push('取消后的临时工作区发生变化。')
    return {
      status: failures.length === 0 ? 'passed' : 'failed',
      failures,
      assertions,
    }
  }

  if (input.scenario === 'timeout') {
    const timeoutObserved = input.result.timedOut
      && (
        input.result.errorCode === 'CODEX_ACTIVE_STEP_TIMEOUT'
        || input.result.errorCode === 'CODEX_EXECUTION_TIMEOUT'
        || payloads.some(payload => payload.timedOut === true)
      )
    const noFalseSuccess = input.result.finalStatus !== 'completed'
      && !input.result.ok
      && !eventTypes.includes('turn.completed')
    const timeoutThreadTerminalPersisted = !input.taskState
      || input.taskState.timeoutThreadTerminalPersisted
    const observableTaskThread = !input.taskState || input.taskState.observableTaskThread
    const assertions = {
      timeoutObserved,
      noFalseSuccess,
      ...(input.taskState
        ? {
            timeoutThreadTerminalPersisted,
            observableTaskThread,
          }
        : {}),
      workspaceUnchanged,
    }
    if (!assertions.timeoutObserved)
      failures.push('没有观察到 Codex 适配器的超时终态。')
    if (!assertions.noFalseSuccess)
      failures.push('超时后仍被报告为成功或出现 turn.completed。')
    if (!timeoutThreadTerminalPersisted)
      failures.push('超时后的任务线程没有保持失败或暂停终态。')
    if (!observableTaskThread)
      failures.push('超时后的任务线程无法通过持久化任务列表查询。')
    if (!assertions.workspaceUnchanged)
      failures.push('超时后的临时工作区发生变化。')
    return {
      status: failures.length === 0 ? 'passed' : 'failed',
      failures,
      assertions,
    }
  }

  if (input.scenario === 'retry') {
    const retryEventCount = countCodexEventType(eventTypes, 'provider.retry')
    const threadStartCount = countCodexEventType(eventTypes, 'thread.started')
    const turnStartCount = countCodexEventType(eventTypes, 'turn.started')
    const failedTurnCount = countCodexEventType(eventTypes, 'turn.failed')
    const completedTurnCount = countCodexEventType(eventTypes, 'turn.completed')
    const retryObserved = retryEventCount >= codexAcceptanceRetryFailureAttempts
    const retryAttemptLifecyclesObserved = input.attemptCount === codexAcceptanceRetryFailureAttempts + 1
      && threadStartCount === codexAcceptanceRetryFailureAttempts + 1
      && turnStartCount === codexAcceptanceRetryFailureAttempts + 1
      && failedTurnCount === codexAcceptanceRetryFailureAttempts
      && completedTurnCount === 1
    const laterAttemptCompleted = input.result.ok
      && input.result.finalStatus === 'completed'
      && (input.attemptCount ?? 0) >= codexAcceptanceRetryFailureAttempts + 1
      && eventTypes.includes('turn.completed')
    const taskThreadLifecyclePersisted = !input.taskState
      || (
        input.taskState.taskThreadLifecyclePersisted
        && input.taskState.persistedStatus === 'completed'
      )
    const retryAttemptLifecyclesPersisted = !input.taskState
      || input.taskState.retryAttemptLifecyclesPersisted
    const observableTaskThread = !input.taskState || input.taskState.observableTaskThread
    const assertions = {
      retryObserved,
      retryAttemptLifecyclesObserved,
      laterAttemptCompleted,
      ...(input.taskState
        ? {
            taskThreadLifecyclePersisted,
            retryAttemptLifecyclesPersisted,
            observableTaskThread,
          }
        : {}),
      workspaceUnchanged,
    }
    if (!assertions.retryObserved)
      failures.push(`没有观察到 ${codexAcceptanceRetryFailureAttempts} 次适配器发出的 Provider retry 事件。`)
    if (!assertions.retryAttemptLifecyclesObserved)
      failures.push(`没有观察到 ${codexAcceptanceRetryFailureAttempts + 1} 次完整的 CLI attempt 生命周期（每次必须包含 thread.started、turn.started 和终态事件）。`)
    if (!assertions.laterAttemptCompleted)
      failures.push('重试没有在第 6 次真实子进程尝试中成功完成。')
    if (!taskThreadLifecyclePersisted)
      failures.push('重试任务线程没有持久化 planned -> running -> completed 生命周期。')
    if (!retryAttemptLifecyclesPersisted)
      failures.push('五次重试及第六次成功的 CLI 生命周期没有完整写入持久化事件账本。')
    if (!observableTaskThread)
      failures.push('重试后的任务线程无法通过持久化任务列表查询。')
    if (!assertions.workspaceUnchanged)
      failures.push('重试 fixture 改变了临时工作区。')
    return {
      status: failures.length === 0 ? 'passed' : 'failed',
      failures,
      assertions,
    }
  }

  if (input.scenario === 'background') {
    const backgroundCompleted = input.result.ok
      && input.result.finalStatus === 'completed'
      && eventTypes.includes('turn.completed')
    const backgroundAccepted = input.taskState?.backgroundAccepted === true
    const foregroundDetached = input.taskState?.foregroundDetached === true
    const completedAfterForegroundDetached = input.taskState?.completedAfterForegroundDetached === true
    const observableTaskThread = input.taskState?.observableTaskThread === true
    const assertions = {
      backgroundCompleted,
      backgroundAccepted,
      foregroundDetached,
      completedAfterForegroundDetached,
      observableTaskThread,
      workspaceUnchanged,
    }
    if (!backgroundCompleted)
      failures.push('后台 Codex 任务没有成功完成。')
    if (!backgroundAccepted)
      failures.push('后台任务接受状态没有持久化。')
    if (!foregroundDetached)
      failures.push('后台任务没有记录前台调用方已离开。')
    if (!completedAfterForegroundDetached)
      failures.push('后台任务未能在前台离开后继续执行并完成。')
    if (!observableTaskThread)
      failures.push('后台任务无法通过持久化任务列表查询。')
    if (!workspaceUnchanged)
      failures.push('只读后台任务改变了临时工作区。')
    return {
      status: failures.length === 0 ? 'passed' : 'failed',
      failures,
      assertions,
    }
  }

  if (input.scenario === 'restart-recovery') {
    const recoveryCompleted = input.result.ok
      && input.result.finalStatus === 'completed'
      && eventTypes.includes('turn.completed')
    const restarted = input.taskState?.restarted === true
    const recoveryEvidencePersisted = input.taskState?.recoveryEvidence?.persistedBeforeRestart === true
      && (input.taskState.recoveryEvidence?.eventCount ?? 0) > 0
      && input.taskState.recoveryEventPersisted
    const observableTaskThread = input.taskState?.observableTaskThread === true
    const assertions = {
      recoveryCompleted,
      restarted,
      recoveryEvidencePersisted,
      observableTaskThread,
      workspaceUnchanged,
    }
    if (!recoveryCompleted)
      failures.push('重启恢复后的 Codex 任务没有成功完成。')
    if (!restarted)
      failures.push('任务账本没有记录进程重启边界。')
    if (!recoveryEvidencePersisted)
      failures.push('重启前状态、事件或恢复事件没有保留在 durable task store。')
    if (!observableTaskThread)
      failures.push('恢复后的任务线程无法通过持久化任务列表查询。')
    if (!workspaceUnchanged)
      failures.push('只读恢复任务改变了临时工作区。')
    return {
      status: failures.length === 0 ? 'passed' : 'failed',
      failures,
      assertions,
    }
  }

  const failedResultObserved = !input.result.ok
    && input.result.finalStatus === 'failed'
    && eventTypes.includes('turn.failed')
  const noAssistantSuccess = !payloads.some(payload => (
    (payload.stream === 'assistant' && hasNonEmptyText(payload.text))
    || hasNonEmptyText(payload.assistant)
  ))
  && !hasNonEmptyText(input.result.assistantOutput)
  const assertions = {
    failedResultObserved,
    noAssistantSuccess,
    ...(input.taskState
      ? {
          taskThreadLifecyclePersisted: input.taskState.taskThreadLifecyclePersisted,
          observableTaskThread: input.taskState.observableTaskThread,
          failedThreadPersisted: input.taskState.persistedStatus === 'failed',
        }
      : {}),
    workspaceUnchanged,
  }
  if (!assertions.failedResultObserved)
    failures.push('失败 fixture 没有以 failed 终态结束。')
  if (!assertions.noAssistantSuccess)
    failures.push('失败执行产生了伪造的 assistant 成功输出。')
  if (input.taskState && !input.taskState.taskThreadLifecyclePersisted)
    failures.push('失败任务线程没有持久化 planned -> running -> failed 生命周期。')
  if (input.taskState && !input.taskState.observableTaskThread)
    failures.push('失败任务线程无法通过持久化任务列表查询。')
  if (input.taskState && input.taskState.persistedStatus !== 'failed')
    failures.push('失败任务线程没有保持 failed 终态。')
  if (!assertions.workspaceUnchanged)
    failures.push('失败执行改变了临时工作区。')
  return {
    status: failures.length === 0 ? 'passed' : 'failed',
    failures,
    assertions,
  }
}

async function snapshotTree(root: string) {
  const entries: string[] = []
  const visit = async (directory: string) => {
    const children = await readdir(directory, { withFileTypes: true })
    for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(directory, child.name)
      const relativePath = relative(root, path)
      if (child.isDirectory()) {
        entries.push(`${relativePath}/directory`)
        await visit(path)
        continue
      }
      if (child.isSymbolicLink()) {
        entries.push(`${relativePath}/symlink`)
        continue
      }
      const content = await readFile(path)
      entries.push(`${relativePath}/file/${createHash('sha256').update(content).digest('hex')}`)
    }
  }
  await visit(root)
  return entries
}

async function withEnvironment<T>(
  overrides: Record<string, string>,
  task: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    process.env[key] = value
  }
  try {
    return await task()
  }
  finally {
    for (const [key, value] of previous) {
      if (value === undefined)
        delete process.env[key]
      else
        process.env[key] = value
    }
  }
}

function createAcceptanceThread(scenario: CodexAcceptanceScenario): AlicizationTaskThreadRecord {
  const suffix = `${scenario}-${randomUUID()}`
  return {
    id: `codex-acceptance-${suffix}`,
    decisionTraceId: `codex-acceptance-trace-${suffix}`,
    turnId: `codex-acceptance-turn-${suffix}`,
    sessionId: `codex-acceptance-session-${suffix}`,
    origin: 'user-turn',
    goal: `Codex acceptance ${scenario}`,
    kind: 'codebase-investigation',
    status: 'planned',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: null,
    metadata: {
      task: {
        effect: 'observe',
        permissionMode: 'none',
      },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastEventAt: null,
    completedAt: null,
  }
}

function createAcceptanceRuntimeContext(
  thread: AlicizationTaskThreadRecord,
): AlicizationExecutionRuntimeContext {
  const generatedAt = Date.now()
  return {
    generatedAt,
    cardId: 'codex-acceptance',
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    sensory: {
      collectedAt: generatedAt,
      running: true,
      stale: false,
      ageMs: 0,
      foregroundWindow: null,
      capture: {
        health: 'healthy',
        permission: 'granted',
        sourceCount: 0,
        lastUpdatedAt: generatedAt,
        lastError: null,
        degradedReasons: [],
      },
    },
  }
}

export function buildRealPrompt(
  scenario: Extract<CodexAcceptanceScenario, 'long-task' | 'cancel' | 'timeout'>,
  delayMs: number,
) {
  if (scenario === 'cancel') {
    return [
      'Immediately run exactly this terminal command and do nothing before it: /bin/sleep 600',
      'Do not explain, inspect files, or call any other tool. Keep the command running until the external cancellation arrives.',
    ].join('\n')
  }

  const waitMs = scenario === 'long-task'
    ? delayMs
    : 60_000
  const phaseCount = scenario === 'long-task' ? 4 : 1
  const command = `node -e 'const wait = new Int32Array(new SharedArrayBuffer(4)); for (let i = 1; i <= ${phaseCount}; i++) { console.log("alicization-codex-acceptance-phase-" + i); Atomics.wait(wait, 0, 0, ${waitMs}); }'`
  return [
    command,
    '先执行上面的终端命令；不要先解释、分析、检查文件或调用其他工具。',
    '这是一次本地 Coding Agent 生命周期验收。',
    '只读执行，不修改、创建或删除任何文件。',
    '当前工作目录是一次性临时目录，不要访问工作目录之外的路径。',
    scenario === 'timeout'
      ? '命令运行期间保持工作状态，等待适配器超时；不要提前结束。'
      : '命令结束后只说明本地长任务已完成，并保留终端实际结果。',
  ].join('\n')
}

function buildFixtureCliSource() {
  return `#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const scenario = process.env.ALICIZATION_CODEX_ACCEPTANCE_FIXTURE_SCENARIO
const statePath = process.env.ALICIZATION_CODEX_ACCEPTANCE_FIXTURE_STATE
const attempt = statePath && existsSync(statePath)
  ? Number(readFileSync(statePath, 'utf8') || '0') + 1
  : 1
if (statePath)
  writeFileSync(statePath, String(attempt))

const emit = (value) => process.stdout.write(\`\${JSON.stringify(value)}\\n\`)
emit({ type: 'thread.started', thread_id: \`fixture-thread-\${attempt}\` })
emit({ type: 'turn.started' })

if (scenario === 'retry' && attempt <= ${codexAcceptanceRetryFailureAttempts}) {
  emit({ type: 'turn.failed', error: { message: '503 Service Unavailable' } })
  process.exit(1)
}

if (scenario === 'failure-isolation') {
  emit({ type: 'turn.failed', error: { message: 'controlled execution failure' } })
  process.exit(1)
}

emit({
  type: 'item.completed',
  item: {
    id: \`fixture-agent-message-\${attempt}\`,
    type: 'agent_message',
    text: 'controlled fixture success',
  },
})
emit({ type: 'turn.completed' })
`
}

async function setupFixtureEnvironment(
  scenario: Exclude<CodexAcceptanceScenario, 'long-task' | 'cancel' | 'timeout'>,
) {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'alicization-codex-acceptance-fixture-'))
  const codexHome = join(fixtureRoot, 'codex-home')
  const fixtureCli = join(fixtureRoot, 'codex-fixture.mjs')
  const statePath = join(fixtureRoot, 'attempts.txt')
  await mkdir(codexHome, { recursive: true })
  await writeFile(join(codexHome, 'config.toml'), [
    'model_provider = "alicization-acceptance-fixture"',
    'model = "alicization-acceptance-fixture-model"',
    '',
    '[model_providers.alicization-acceptance-fixture]',
    'name = "alicization-acceptance-fixture"',
    'wire_api = "responses"',
    'base_url = "http://127.0.0.1:1/v1"',
    'requires_openai_auth = false',
  ].join('\n'))
  await writeFile(fixtureCli, buildFixtureCliSource(), {
    encoding: 'utf8',
    mode: 0o700,
  })
  await chmod(fixtureCli, 0o700)
  await writeFile(statePath, '0', 'utf8')
  return {
    fixtureRoot,
    environment: {
      CODEX_HOME: codexHome,
      CODEX_CLI_PATH: fixtureCli,
      ALICIZATION_CODEX_ACCEPTANCE_FIXTURE_SCENARIO: scenario,
      ALICIZATION_CODEX_ACCEPTANCE_FIXTURE_STATE: statePath,
    },
    readAttemptCount: async () => Number(await readFile(statePath, 'utf8')),
  }
}

function buildTaskStateFromSnapshot(input: {
  snapshot: CodexAcceptanceTaskStoreSnapshot
  persistedThread: AlicizationTaskThreadRecord | null
  persistedThreads: AlicizationTaskThreadRecord[]
  persistedEvents: AlicizationExecutionEventInput[]
}) {
  return buildCodexAcceptanceTaskState({
    persistedThread: input.persistedThread,
    persistedThreads: input.persistedThreads,
    persistedEvents: input.persistedEvents,
    transitions: input.snapshot.transitions,
    backgroundAccepted: input.snapshot.backgroundAccepted,
    foregroundDetached: input.snapshot.foregroundDetached,
    completedAfterForegroundDetached: input.snapshot.completedAfterForegroundDetached,
    restarted: input.snapshot.restarted,
    recoveryEvidence: input.snapshot.recoveryEvidence,
    recoveryEventPersisted: input.snapshot.recoveryEventPersisted,
  })
}

async function waitForAcceptanceThreadToStart(input: {
  store: CodexAcceptanceTaskStore
  threadId: string
  timeoutMs?: number
}) {
  const deadlineAt = Date.now() + (input.timeoutMs ?? 5_000)
  while (Date.now() <= deadlineAt) {
    const thread = await input.store.getTaskThread(input.threadId)
    if (thread && thread.status !== 'planned')
      return thread
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  return await input.store.getTaskThread(input.threadId)
}

function summarizeLiveEvent(scenario: CodexAcceptanceScenario, event: AlicizationExecutionEventInput) {
  const payload = event.payload
  if (!payload || typeof payload !== 'object')
    return
  const record = payload as Record<string, unknown>
  const eventType = String(record.codexEventType ?? '')
  if (![
    'thread.started',
    'turn.started',
    'item.started',
    'item.updated',
    'item.completed',
    'item.failed',
    'turn.completed',
    'turn.failed',
    'heartbeat',
    'provider.retry',
  ].includes(eventType)) {
    return
  }
  const summary = typeof record.summary === 'string' && record.summary.trim()
    ? ` ${record.summary.trim().slice(0, 240)}`
    : ''
  process.stdout.write(`[codex:${scenario}] ${eventType}${summary}\n`)
}

async function runScenario(
  scenario: CodexAcceptanceScenario,
  args: CodexAcceptanceArgs,
): Promise<CodexAcceptanceScenarioReport> {
  const isReal = scenario === 'long-task' || scenario === 'cancel' || scenario === 'timeout'
  const mode: CodexAcceptanceMode = isReal ? 'real-cli' : 'local-fixture'
  if (isReal && !args.allowRealCli) {
    const now = Date.now()
    return {
      scenario,
      mode,
      status: 'blocked',
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      result: {
        ok: false,
        finalStatus: 'blocked',
        aborted: false,
        timedOut: false,
        errorCode: null,
        errorMessage: null,
        output: null,
      },
      observations: {
        eventCount: 0,
        eventTypes: [],
        semanticProgressCount: 0,
        heartbeatCount: 0,
        commandEventCount: 0,
        retryEventCount: 0,
        terminalEventCount: 0,
        firstSemanticProgressMs: null,
        attemptCount: 0,
        threadStartCount: 0,
        turnStartCount: 0,
        failedTurnCount: 0,
        completedTurnCount: 0,
        cancelTargetObserved: false,
      },
      taskState: null,
      assertions: {},
      failures: [],
      workspace: {
        changed: false,
        retained: false,
        path: null,
      },
      blockingReason: '真实 Codex 场景默认关闭；确认配置与费用后使用 --real-cli。',
    }
  }

  const startedAt = Date.now()
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'alicization-codex-acceptance-workspace-'))
  const taskStoreRoot = await mkdtemp(join(tmpdir(), 'alicization-codex-acceptance-task-store-'))
  const taskStorePath = join(taskStoreRoot, 'task-state.json')
  const controller = scenario === 'cancel' ? new AbortController() : null
  const liveEvents: AlicizationExecutionEventInput[] = []
  let firstSemanticProgressAt: number | null = null
  let cancelTargetObserved = false
  let cancelTimer: ReturnType<typeof setTimeout> | undefined
  let fixture: Awaited<ReturnType<typeof setupFixtureEnvironment>> | undefined
  const environment = isReal
    ? null
    : fixture = await setupFixtureEnvironment(scenario as Exclude<CodexAcceptanceScenario, 'long-task' | 'cancel' | 'timeout'>)
  const before = await snapshotTree(workspaceRoot)
  const thread = createAcceptanceThread(scenario)
  let taskStore = await createCodexAcceptanceTaskStore(taskStorePath)
  await taskStore.upsertTaskThread({
    ...thread,
    createOnly: true,
  })
  const runtimeContext = createAcceptanceRuntimeContext(thread)

  const run = async () => {
    if (scenario === 'restart-recovery') {
      const runningAt = Date.now()
      await taskStore.upsertTaskThread({
        ...thread,
        status: 'running',
        summary: 'running before acceptance process restart',
        updatedAt: runningAt,
        lastEventAt: runningAt,
        completedAt: null,
      })
      await taskStore.appendExecutionEvents([{
        threadId: thread.id,
        attemptId: thread.attemptId ?? null,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: thread.selectedChannel,
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'heartbeat',
          semanticProgress: false,
          recoveryBoundary: 'before-process-restart',
        },
        createdAt: runningAt,
      }])
      await taskStore.markProcessRestarted()
      taskStore = await createCodexAcceptanceTaskStore(taskStorePath)
      await taskStore.prepareRestartRecovery()
    }

    const dispatchPromise = dispatchTaskThread(taskStore, {
      threadId: thread.id,
      codex: {
        prompt: isReal
          ? buildRealPrompt(scenario as Extract<CodexAcceptanceScenario, 'long-task' | 'cancel' | 'timeout'>, args.longTaskDelayMs)
          : '执行一次受控验收，不要修改、创建或删除任何文件。',
        cwd: workspaceRoot,
        sandbox: 'read-only',
        timeoutMs: scenario === 'timeout'
          ? args.activeStepTimeoutMs
          : args.totalTimeoutMs,
        runtimeContext,
      },
      abortSignal: controller?.signal,
      onExecutionEvent: (event) => {
        liveEvents.push(event)
        const payload = event.payload
        if (
          firstSemanticProgressAt === null
          && payload
          && typeof payload === 'object'
          && (payload as Record<string, unknown>).semanticProgress === true
        ) {
          firstSemanticProgressAt = event.createdAt ?? Date.now()
        }
        summarizeLiveEvent(scenario, event)
        if (
          scenario === 'cancel'
          && isCodexAcceptanceActiveCommandEvent(event)
          && !cancelTargetObserved
        ) {
          cancelTargetObserved = true
          cancelTimer = setTimeout(() => controller?.abort(), args.cancelDelayMs)
          cancelTimer.unref?.()
        }
      },
      workspaceRoot,
    })
    const settledDispatch = dispatchPromise.then(
      result => ({ ok: true as const, result }),
      error => ({ ok: false as const, error }),
    )

    if (scenario === 'background') {
      const startedThread = await waitForAcceptanceThreadToStart({
        store: taskStore,
        threadId: thread.id,
      })
      if (!startedThread || startedThread.status === 'planned')
        throw new Error('Background Codex dispatch did not leave planned state.')
      await taskStore.markBackgroundAccepted()
      await taskStore.markForegroundDetached()
    }

    const settled = await settledDispatch
    if (!settled.ok)
      throw settled.error
    return settled.result
  }

  try {
    const result = environment
      ? await withEnvironment(environment.environment, run)
      : await run()
    const after = await snapshotTree(workspaceRoot)
    const workspaceChanged = before.join('\n') !== after.join('\n')
    const persistedThread = await taskStore.getTaskThread(thread.id) ?? null
    const persistedThreads = await taskStore.listTaskThreads({ limit: 200 })
    const persistedEvents = await taskStore.listExecutionEvents({
      threadId: thread.id,
      limit: 10_000,
    })
    const storeSnapshot = await taskStore.snapshot()
    const taskState = buildTaskStateFromSnapshot({
      snapshot: storeSnapshot,
      persistedThread,
      persistedThreads,
      persistedEvents,
    })
    const reportEvents = persistedEvents.length > 0 ? persistedEvents : liveEvents
    const reportPayloads = reportEvents.map(payloadOf)
    const attemptCount = fixture
      ? await fixture.readAttemptCount()
      : reportEvents.filter(event => (
        event.payload
        && event.payload.codexEventType === 'provider.retry'
      )).length + 1
    const acceptanceResult: CodexAcceptanceResult = {
      ok: result.ok,
      finalStatus: result.finalStatus ?? result.thread.status,
      aborted: (result.finalStatus ?? result.thread.status) === 'cancelled',
      timedOut: reportEvents.some(event => (
        event.payload
        && event.payload.timedOut === true
      )),
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      output: result.output,
      assistantOutput: reportPayloads
        .filter(payload => payload.stream === 'assistant')
        .map(payload => typeof payload.text === 'string' ? payload.text : '')
        .filter(Boolean)
        .join('\n') || undefined,
    }
    const classification = classifyCodexAcceptanceOutcome({
      scenario,
      mode,
      result: acceptanceResult,
      events: reportEvents,
      attemptCount,
      workspaceChanged,
      cancelTargetObserved,
      taskState,
    })
    const finishedAt = Date.now()
    return {
      scenario,
      mode,
      status: classification.status,
      startedAt,
      finishedAt,
      durationMs: Math.max(0, finishedAt - startedAt),
      result: {
        ok: acceptanceResult.ok,
        finalStatus: acceptanceResult.finalStatus,
        aborted: acceptanceResult.aborted,
        timedOut: acceptanceResult.timedOut,
        errorCode: acceptanceResult.errorCode ?? null,
        errorMessage: acceptanceResult.errorMessage ?? null,
        output: acceptanceResult.output ?? null,
      },
      observations: {
        eventCount: reportEvents.length,
        eventTypes: reportPayloads
          .map(payload => String(payload.codexEventType ?? ''))
          .filter(Boolean),
        semanticProgressCount: reportPayloads.filter(payload => payload.semanticProgress === true).length,
        heartbeatCount: reportPayloads.filter(payload => (
          payload.codexEventType === 'heartbeat'
        )).length,
        commandEventCount: reportPayloads.filter(payload => (
          payload.itemType === 'command_execution'
        )).length,
        retryEventCount: reportPayloads.filter(payload => (
          payload.codexEventType === 'provider.retry'
        )).length,
        terminalEventCount: reportPayloads.filter(payload => (
          payload.terminal === true
        )).length,
        firstSemanticProgressMs: calculateFirstSemanticProgressMs({
          startedAt,
          firstSemanticProgressAt,
          settledAt: finishedAt,
        }),
        attemptCount,
        threadStartCount: reportPayloads.filter(payload => (
          payload.codexEventType === 'thread.started'
        )).length,
        turnStartCount: reportPayloads.filter(payload => (
          payload.codexEventType === 'turn.started'
        )).length,
        failedTurnCount: reportPayloads.filter(payload => (
          payload.codexEventType === 'turn.failed'
        )).length,
        completedTurnCount: reportPayloads.filter(payload => (
          payload.codexEventType === 'turn.completed'
        )).length,
        cancelTargetObserved,
      },
      taskState,
      assertions: classification.assertions,
      failures: classification.failures,
      workspace: {
        changed: workspaceChanged,
        retained: args.keepArtifacts,
        path: args.keepArtifacts ? workspaceRoot : null,
      },
    }
  }
  finally {
    if (cancelTimer)
      clearTimeout(cancelTimer)
    if (!args.keepArtifacts)
      await rm(workspaceRoot, { recursive: true, force: true })
    if (fixture && !args.keepArtifacts)
      await rm(fixture.fixtureRoot, { recursive: true, force: true })
    if (!args.keepArtifacts)
      await rm(taskStoreRoot, { recursive: true, force: true })
  }
}

export async function runCodexAcceptance(args: CodexAcceptanceArgs): Promise<CodexAcceptanceReport> {
  const startedAt = Date.now()
  const scenarios: CodexAcceptanceScenarioReport[] = []
  for (const scenario of args.scenarios)
    scenarios.push(await runScenario(scenario, args))
  const finishedAt = Date.now()
  return {
    version: 'codex-real-acceptance-report-v1',
    startedAt,
    finishedAt,
    passed: scenarios.every(scenario => scenario.status === 'passed'),
    scenarios,
  }
}

const help = `用法：
  pnpm -F @proj-alicization/stage-tamagotchi codex:acceptance [选项]

默认场景：
  retry,failure-isolation 使用本地临时 CLI fixture；
  long-task,cancel,timeout 必须显式传 --real-cli 才会调用真实 Codex CLI。

选项：
  --scenario <名称[,名称]>  all、long-task、cancel、timeout、retry、failure-isolation
  --real-cli                开启真实 Codex CLI 场景
  --report <路径>           JSON 报告路径
  --long-task-delay-ms <ms> 长任务每阶段等待时间，默认 2000
  --cancel-delay-ms <ms>    观察到命令后多久取消，默认 1000
  --startup-timeout-ms <ms> 启动超时，默认 120000
  --active-step-timeout-ms <ms> 活动步骤超时，默认 30000
  --total-timeout-ms <ms>   总执行超时，默认 180000
  --keep-artifacts          保留临时工作区和 fixture
`

async function main() {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    process.stdout.write(help)
    return
  }

  const args = parseCodexAcceptanceArgs(rawArgs)
  const report = await runCodexAcceptance(args)
  await mkdir(dirname(args.reportPath), { recursive: true })
  await writeFile(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.stderr.write(`Codex 验收报告已写入：${args.reportPath}\n`)
  if (!report.passed)
    process.exitCode = 2
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
