import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
} from './digital-life-architecture'
import type {
  AlicizationDigitalLifeSpineSnapshot,
} from './digital-life-spine'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'

import { randomUUID } from 'node:crypto'

import { errorMessageFrom } from '@moeru/std'

import {
  buildAlicizationRuntimeSystemBlock,
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import { deriveAlicizationDialogueMemoryCarryPolicy } from './dialogue-memory-governor'
import {
  buildAlicizationDigitalLifeArchitectureSystemBlock,
} from './digital-life-architecture'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import { createAlicizationRuntimeCallChain } from './runtime-call-chain'

type AlicizationAgentTaskKind = 'executor' | 'mcp' | 'runtime' | 'sensory'
type AlicizationAgentTaskStatus = 'completed' | 'failed' | 'pending'
export type AlicizationAgentContinuityKind = 'dialogue' | 'execution-callback' | 'presence' | 'proactive' | 'reminder' | 'runtime'
export type AlicizationAgentContinuityState = 'fresh' | 'observed' | 'pending'

export interface AlicizationAgentSessionActionInput {
  finishedAt?: number | null
  kind: AlicizationAgentTaskKind
  label: string
  metadata?: Record<string, unknown>
  signature?: string | null
  startedAt?: number
  status: AlicizationAgentTaskStatus
  summary?: string | null
}

export interface AlicizationAgentSessionContinuityInput {
  createdAt?: number | null
  kind: AlicizationAgentContinuityKind
  label: string
  metadata?: Record<string, unknown>
  signature?: string | null
  state?: AlicizationAgentContinuityState
  summary?: string | null
}

interface AlicizationAgentTaskRecord {
  finishedAt: number | null
  id: string
  kind: AlicizationAgentTaskKind
  label: string
  metadata: Record<string, unknown> | null
  startedAt: number
  status: AlicizationAgentTaskStatus
  summary: string | null
}

export interface AlicizationAgentContinuityRecord {
  createdAt: number
  id: string
  kind: AlicizationAgentContinuityKind
  label: string
  metadata: Record<string, unknown> | null
  state: AlicizationAgentContinuityState
  summary: string | null
}

interface AlicizationAgentSessionRecord {
  cardId: string
  conversationSessionId: string | null
  continuitySignatures: Set<string>
  continuitySignals: AlicizationAgentContinuityRecord[]
  createdAt: number
  digitalLifeArchitecture: AlicizationDigitalLifeArchitectureSnapshot | null
  digitalLifeSpine: AlicizationDigitalLifeSpineSnapshot | null
  id: string
  lastActiveAt: number
  lastSensorySnapshot: AlicizationSensoryCacheSnapshot | null
  taskSignatures: Set<string>
  tasks: AlicizationAgentTaskRecord[]
}

interface AlicizationAgentTurnIdentity {
  cardId: string
  decisionTraceId?: string | null
  sessionId?: string | null
  turnId: string
}

export interface AlicizationAgentSessionSnapshot {
  cardId: string
  conversationSessionId: string | null
  continuitySignals: AlicizationAgentContinuityRecord[]
  createdAt: number
  digitalLifeArchitecture: AlicizationDigitalLifeArchitectureSnapshot | null
  digitalLifeSpine: AlicizationDigitalLifeSpineSnapshot | null
  id: string
  lastActiveAt: number
  lastSensorySnapshot: AlicizationSensoryCacheSnapshot | null
  tasks: AlicizationAgentTaskRecord[]
}

export interface AlicizationAgentTurnRuntime {
  readonly agentSessionId: string
  readonly conversationSessionId: string | null
  buildExecutionRuntimeContext: (
    identity?: Partial<AlicizationAgentTurnIdentity> & {
      sensorySnapshot?: AlicizationSensoryCacheSnapshot
    },
  ) => Promise<AlicizationExecutionRuntimeContext>
  buildSessionSystemBlock: () => string
  getSensorySnapshot: (options?: { forceRefresh?: boolean }) => Promise<AlicizationSensoryCacheSnapshot>
  getSessionSnapshot: () => AlicizationAgentSessionSnapshot
  ingestDigitalLifeArchitecture: (architecture: AlicizationDigitalLifeArchitectureSnapshot | null | undefined) => void
  ingestDigitalLifeSpine: (spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) => void
  ingestContinuitySignals: (signals: AlicizationAgentSessionContinuityInput[]) => void
  ingestRuntimeActions: (actions: AlicizationAgentSessionActionInput[]) => void
  snapshot: () => AlicizationRuntimeCallChainSnapshot
  trackPhase: <T>(
    callId: string,
    task: () => Promise<T> | T,
    metadata?: Record<string, unknown>,
  ) => Promise<T>
  trackTool: <T>(input: {
    kind: AlicizationAgentTaskKind
    label: string
    metadata?: Record<string, unknown>
    phaseId?: string
    run: () => Promise<T> | T
    summarizeError?: (error: unknown) => string
    summarizeSuccess?: (value: T) => string
    traceMetadata?: Record<string, unknown>
  }) => Promise<T>
}

export interface OpenAlicizationAgentTurnInput {
  cardId: string
  decisionTraceId?: string | null
  turnId: string
}

interface CreateAlicizationAgentRuntimeOptions {
  getNow?: () => number
  maxContinuityHistory?: number
  maxContinuityInSystemBlock?: number
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot> | AlicizationSensoryCacheSnapshot
  maxTaskHistory?: number
  maxTasksInSystemBlock?: number
  resolveConversationSessionId?: (cardId: string) => Promise<string | null | undefined> | string | null | undefined
  sessionTtlMs?: number
}

const defaultMaxTaskHistory = 12
const defaultMaxTasksInSystemBlock = 4
const defaultMaxContinuityHistory = 8
const defaultMaxContinuityInSystemBlock = 4
const defaultSessionTtlMs = 10 * 60 * 1000

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeSummary(raw: unknown, maxChars = 180) {
  const text = sanitizeText(raw, maxChars + 8)
  if (!text)
    return ''
  if (text.length <= maxChars)
    return text
  return `${text.slice(0, Math.max(12, maxChars - 3))}...`
}

function sanitizePhaseId(raw: unknown) {
  const text = sanitizeText(raw, 120)
  if (!text)
    return ''
  return text.toLowerCase().replace(/[^a-z0-9:_-]+/g, '-')
}

function normalizeMetadata(raw?: Record<string, unknown>) {
  if (!raw)
    return null
  const entries = Object.entries(raw).filter(([, value]) => value !== undefined)
  if (entries.length === 0)
    return null
  return Object.fromEntries(entries)
}

function buildActionSignature(input: AlicizationAgentSessionActionInput) {
  const explicitSignature = sanitizeText(input.signature, 220)
  if (explicitSignature)
    return explicitSignature

  return sanitizeText(
    [
      input.kind,
      input.status,
      input.label,
      input.summary ?? '',
    ].join('::'),
    220,
  )
}

function buildContinuitySignature(input: AlicizationAgentSessionContinuityInput) {
  const explicitSignature = sanitizeText(input.signature, 220)
  if (explicitSignature)
    return explicitSignature

  return sanitizeText(
    [
      input.kind,
      input.state ?? 'fresh',
      input.label,
      input.summary ?? '',
    ].join('::'),
    220,
  )
}

function buildSessionKey(cardId: string, conversationSessionId: string | null) {
  return `${cardId}::${conversationSessionId ?? 'detached'}`
}

function formatForegroundWindow(snapshot: AlicizationSensoryCacheSnapshot | null) {
  const foregroundWindow = snapshot?.sample.foregroundWindow
  if (!foregroundWindow)
    return 'unknown'

  const parts = [
    sanitizeText(foregroundWindow.appName, 80),
    sanitizeText(foregroundWindow.processName, 80),
    sanitizeText(foregroundWindow.title, 120),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' | ') : 'unknown'
}

function formatCaptureSummary(snapshot: AlicizationSensoryCacheSnapshot | null) {
  const capture = snapshot?.capture
  if (!capture)
    return 'health=unknown permission=unknown source_count=unknown'

  return [
    `health=${capture.health ?? 'unknown'}`,
    `permission=${capture.permission ?? 'unknown'}`,
    `source_count=${typeof capture.sourceCount === 'number' ? capture.sourceCount : 'unknown'}`,
    capture.degradedReasons.length > 0
      ? `degraded_reasons=${capture.degradedReasons.join(',')}`
      : '',
  ].filter(Boolean).join(' ')
}

function formatTaskStatus(status: AlicizationAgentTaskStatus) {
  if (status === 'completed')
    return 'OK'
  if (status === 'failed')
    return 'FAIL'
  return 'PENDING'
}

function buildTaskSummaryLine(task: AlicizationAgentTaskRecord) {
  const summary = sanitizeSummary(task.summary ?? '', 140) || 'no summary'
  return `- [${formatTaskStatus(task.status)}] ${sanitizeSummary(task.label, 48)} -> ${summary}`
}

function formatContinuityState(state: AlicizationAgentContinuityState) {
  if (state === 'fresh')
    return 'FRESH'
  if (state === 'pending')
    return 'PENDING'
  return 'OBSERVED'
}

function buildContinuitySummaryLine(signal: AlicizationAgentContinuityRecord) {
  const summary = sanitizeSummary(signal.summary ?? '', 140) || 'no summary'
  return `- [${formatContinuityState(signal.state)}] ${sanitizeSummary(signal.kind, 32)} ${sanitizeSummary(signal.label, 48)} -> ${summary}`
}

function isDigitalLifeContinuitySignal(signal: Pick<AlicizationAgentContinuityRecord, 'kind' | 'label' | 'metadata'>) {
  return signal.kind === 'presence'
    && sanitizeText(signal.label, 80) === 'digital-life-line'
    && sanitizeText(signal.metadata?.source, 64) === 'digital-life-runtime'
}

function findLatestDigitalLifeContinuitySignal(signals: AlicizationAgentContinuityRecord[]) {
  for (let index = signals.length - 1; index >= 0; index -= 1) {
    const signal = signals[index]
    if (signal?.kind !== 'presence')
      continue
    if (sanitizeText(signal.metadata?.source, 64) !== 'digital-life-runtime')
      continue
    return signal
  }

  return null
}

function toExecutionActionDigest(task: AlicizationAgentTaskRecord) {
  return {
    kind: task.kind,
    status: task.status,
    label: sanitizeSummary(task.label, 120) || task.kind,
    summary: sanitizeSummary(task.summary ?? '', 180) || null,
  } as const
}

function cloneSensorySnapshot(snapshot: AlicizationSensoryCacheSnapshot | null) {
  return snapshot ? structuredClone(snapshot) : null
}

function cloneTask(task: AlicizationAgentTaskRecord): AlicizationAgentTaskRecord {
  return {
    ...task,
    metadata: task.metadata ? { ...task.metadata } : null,
  }
}

function cloneContinuitySignal(signal: AlicizationAgentContinuityRecord): AlicizationAgentContinuityRecord {
  return {
    ...signal,
    metadata: signal.metadata ? { ...signal.metadata } : null,
  }
}

function cloneDigitalLifeArchitecture(
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null,
): AlicizationDigitalLifeArchitectureSnapshot | null {
  return architecture ? structuredClone(architecture) : null
}

function cloneDigitalLifeSpine(
  spine: AlicizationDigitalLifeSpineSnapshot | null,
): AlicizationDigitalLifeSpineSnapshot | null {
  return spine ? structuredClone(spine) : null
}

export function createAlicizationAgentRuntime(options: CreateAlicizationAgentRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const maxContinuityHistory = Math.max(1, Math.floor(options.maxContinuityHistory ?? defaultMaxContinuityHistory))
  const maxContinuityInSystemBlock = Math.max(1, Math.floor(options.maxContinuityInSystemBlock ?? defaultMaxContinuityInSystemBlock))
  const maxTaskHistory = Math.max(1, Math.floor(options.maxTaskHistory ?? defaultMaxTaskHistory))
  const maxTasksInSystemBlock = Math.max(1, Math.floor(options.maxTasksInSystemBlock ?? defaultMaxTasksInSystemBlock))
  const sessionTtlMs = Math.max(1_000, Math.floor(options.sessionTtlMs ?? defaultSessionTtlMs))
  const sessions = new Map<string, AlicizationAgentSessionRecord>()

  function expireIdleSessions() {
    const now = getNow()
    for (const [key, session] of sessions.entries()) {
      if (now - session.lastActiveAt > sessionTtlMs)
        sessions.delete(key)
    }
  }

  function touchSession(session: AlicizationAgentSessionRecord) {
    session.lastActiveAt = getNow()
  }

  function getOrCreateSession(cardId: string, conversationSessionId: string | null) {
    const key = buildSessionKey(cardId, conversationSessionId)
    const existing = sessions.get(key)
    if (existing) {
      touchSession(existing)
      return existing
    }

    const session: AlicizationAgentSessionRecord = {
      id: `agent:${randomUUID()}`,
      cardId,
      conversationSessionId,
      continuitySignatures: new Set(),
      continuitySignals: [],
      createdAt: getNow(),
      digitalLifeArchitecture: null,
      digitalLifeSpine: null,
      lastActiveAt: getNow(),
      lastSensorySnapshot: null,
      taskSignatures: new Set(),
      tasks: [],
    }
    sessions.set(key, session)
    return session
  }

  function appendTask(session: AlicizationAgentSessionRecord, task: AlicizationAgentTaskRecord) {
    session.tasks.push(task)
    if (session.tasks.length > maxTaskHistory)
      session.tasks.splice(0, session.tasks.length - maxTaskHistory)
    touchSession(session)
  }

  function appendContinuitySignal(session: AlicizationAgentSessionRecord, signal: AlicizationAgentContinuityRecord) {
    if (isDigitalLifeContinuitySignal(signal)) {
      session.continuitySignals = session.continuitySignals
        .filter(existing => !isDigitalLifeContinuitySignal(existing))
    }
    session.continuitySignals.push(signal)
    if (session.continuitySignals.length > maxContinuityHistory)
      session.continuitySignals.splice(0, session.continuitySignals.length - maxContinuityHistory)
    touchSession(session)
  }

  async function resolveConversationSessionId(cardId: string) {
    const resolved = await options.resolveConversationSessionId?.(cardId)
    const normalized = sanitizeText(resolved, 160)
    return normalized || null
  }

  async function openTurn(input: OpenAlicizationAgentTurnInput): Promise<AlicizationAgentTurnRuntime> {
    expireIdleSessions()
    const cardId = sanitizeText(input.cardId, 120) || 'default'
    const conversationSessionId = await resolveConversationSessionId(cardId).catch(() => null)
    const session = getOrCreateSession(cardId, conversationSessionId)
    const trace = createAlicizationRuntimeCallChain({
      getNow,
    })
    let sensorySnapshotPromise: Promise<AlicizationSensoryCacheSnapshot> | null = null

    const getSensorySnapshot = async (nextOptions?: { forceRefresh?: boolean }) => {
      if (!sensorySnapshotPromise || nextOptions?.forceRefresh === true) {
        sensorySnapshotPromise = Promise.resolve(options.getSensorySnapshot())
          .then((snapshot) => {
            session.lastSensorySnapshot = structuredClone(snapshot)
            touchSession(session)
            return snapshot
          })
      }
      return await sensorySnapshotPromise
    }

    const trackPhase: AlicizationAgentTurnRuntime['trackPhase'] = async (callId, task, metadata) => {
      touchSession(session)
      return await trace.track(callId, task, metadata)
    }

    const trackTool: AlicizationAgentTurnRuntime['trackTool'] = async (toolInput) => {
      const taskRecord: AlicizationAgentTaskRecord = {
        id: `agent-task:${randomUUID()}`,
        kind: toolInput.kind,
        label: sanitizeSummary(toolInput.label, 80) || toolInput.kind,
        metadata: normalizeMetadata(toolInput.metadata),
        startedAt: getNow(),
        finishedAt: null,
        status: 'pending',
        summary: null,
      }
      appendTask(session, taskRecord)

      const phaseId = sanitizePhaseId(toolInput.phaseId)
        || `tool:${toolInput.kind}:${sanitizePhaseId(toolInput.label) || 'run'}`

      return await trace.track(phaseId, async () => {
        try {
          const value = await toolInput.run()
          taskRecord.finishedAt = getNow()
          taskRecord.status = 'completed'
          taskRecord.summary = sanitizeSummary(
            toolInput.summarizeSuccess?.(value)
            ?? taskRecord.summary
            ?? taskRecord.label,
            180,
          ) || null
          touchSession(session)
          return value
        }
        catch (error) {
          taskRecord.finishedAt = getNow()
          taskRecord.status = 'failed'
          taskRecord.summary = sanitizeSummary(
            toolInput.summarizeError?.(error)
            ?? errorMessageFrom(error)
            ?? 'runtime-action-failed',
            180,
          ) || 'runtime-action-failed'
          touchSession(session)
          throw error
        }
      }, toolInput.traceMetadata)
    }

    const ingestRuntimeActions: AlicizationAgentTurnRuntime['ingestRuntimeActions'] = (actions) => {
      for (const action of actions) {
        const signature = buildActionSignature(action)
        if (signature && session.taskSignatures.has(signature))
          continue

        if (signature)
          session.taskSignatures.add(signature)

        appendTask(session, {
          id: `agent-task:${randomUUID()}`,
          kind: action.kind,
          label: sanitizeSummary(action.label, 80) || action.kind,
          metadata: normalizeMetadata(action.metadata),
          startedAt: Number.isFinite(action.startedAt) ? Number(action.startedAt) : getNow(),
          finishedAt: Number.isFinite(action.finishedAt) ? Number(action.finishedAt) : getNow(),
          status: action.status,
          summary: sanitizeSummary(action.summary ?? '', 180) || null,
        })
      }
    }

    const ingestContinuitySignals: AlicizationAgentTurnRuntime['ingestContinuitySignals'] = (signals) => {
      for (const signal of signals) {
        const signature = buildContinuitySignature(signal)
        if (signature && session.continuitySignatures.has(signature))
          continue

        if (signature)
          session.continuitySignatures.add(signature)

        appendContinuitySignal(session, {
          id: `agent-continuity:${randomUUID()}`,
          kind: signal.kind,
          label: sanitizeSummary(signal.label, 80) || signal.kind,
          metadata: normalizeMetadata(signal.metadata),
          createdAt: Number.isFinite(signal.createdAt) ? Number(signal.createdAt) : getNow(),
          state: signal.state ?? 'fresh',
          summary: sanitizeSummary(signal.summary ?? '', 180) || null,
        })
      }
    }

    const ingestDigitalLifeArchitecture: AlicizationAgentTurnRuntime['ingestDigitalLifeArchitecture'] = (architecture) => {
      if (!architecture)
        return

      const clonedArchitecture = structuredClone(architecture)
      session.digitalLifeArchitecture = clonedArchitecture
      if (session.digitalLifeSpine) {
        session.digitalLifeSpine = {
          ...session.digitalLifeSpine,
          architecture: clonedArchitecture,
          proactivePolicy: {
            ...session.digitalLifeSpine.proactivePolicy,
            architecture: clonedArchitecture,
          },
        }
      }
      touchSession(session)
    }

    const ingestDigitalLifeSpine: AlicizationAgentTurnRuntime['ingestDigitalLifeSpine'] = (spine) => {
      if (!spine)
        return

      const clonedSpine = structuredClone(spine)
      session.digitalLifeSpine = clonedSpine
      session.digitalLifeArchitecture = cloneDigitalLifeArchitecture(clonedSpine.architecture)
      touchSession(session)
    }

    const buildSessionSystemBlock = () => {
      const recentContinuitySignals = session.continuitySignals.slice(-maxContinuityInSystemBlock)
      const recentTasks = session.tasks.slice(-maxTasksInSystemBlock)
      const digitalLifeLine = session.digitalLifeSpine?.continuitySignal
        ?? findLatestDigitalLifeContinuitySignal(session.continuitySignals)
      const digitalLifeDigest = projectAlicizationDigitalLifeSpineDigest(session.digitalLifeSpine)
      const memoryCarryPolicy = deriveAlicizationDialogueMemoryCarryPolicy({
        now: getNow(),
        spine: session.digitalLifeSpine,
      })
      const architectureBlock = buildAlicizationDigitalLifeArchitectureSystemBlock(
        session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture,
      )
      const runtimeDigestBlock = buildAlicizationRuntimeSystemBlock(
        deriveAlicizationRuntimeSnapshot({
          spine: session.digitalLifeSpine,
          agentRuntime: deriveAlicizationAgentRuntimeTelemetryFromSession({
            tasks: session.tasks,
            continuitySignals: session.continuitySignals,
            lastSensorySnapshot: session.lastSensorySnapshot,
          }),
        }),
      )
      return [
        '[ALICIZATION_AGENT_SESSION]',
        `agent_session_id=${session.id}`,
        session.conversationSessionId
          ? `conversation_session_id=${session.conversationSessionId}`
          : '',
        `foreground_window=${formatForegroundWindow(session.lastSensorySnapshot)}`,
        `capture_state=${formatCaptureSummary(session.lastSensorySnapshot)}`,
        `digital_life_line=${sanitizeSummary(digitalLifeLine?.summary ?? '', 220) || 'none'}`,
        `memory_fabric=${sanitizeSummary(digitalLifeDigest?.memory?.summary ?? '', 220) || 'none'}`,
        `memory_carry=${sanitizeSummary(memoryCarryPolicy.summary, 220) || 'none'}`,
        architectureBlock,
        runtimeDigestBlock,
        recentContinuitySignals.length > 0
          ? 'session_continuity_inbox:'
          : 'session_continuity_inbox=empty',
        ...recentContinuitySignals.map(buildContinuitySummaryLine),
        recentTasks.length > 0
          ? 'recent_runtime_actions:'
          : 'recent_runtime_actions=none',
        ...recentTasks.map(buildTaskSummaryLine),
        'Treat session continuity inbox items as carried-over session events, not fresh work done inside this exact turn.',
        'If you mention them, keep their temporal status honest.',
        'Preserve continuity with these recent grounded runtime actions.',
        'Do not claim an action re-ran unless you actually call the corresponding tool again.',
      ].filter(Boolean).join('\n')
    }

    const buildExecutionRuntimeContext: AlicizationAgentTurnRuntime['buildExecutionRuntimeContext'] = async (identity) => {
      const sensorySnapshot = identity?.sensorySnapshot ?? await getSensorySnapshot()
      return buildAlicizationExecutionRuntimeContext({
        agentSessionId: session.id,
        cardId: sanitizeText(identity?.cardId, 120) || cardId,
        turnId: sanitizeText(identity?.turnId, 160) || sanitizeText(input.turnId, 160),
        decisionTraceId: sanitizeText(identity?.decisionTraceId, 200) || sanitizeText(input.decisionTraceId, 200) || null,
        sessionId: sanitizeText(identity?.sessionId, 160) || conversationSessionId,
        recentActions: session.tasks.slice(-maxTasksInSystemBlock).map(toExecutionActionDigest),
        sensorySnapshot,
      })
    }

    const getSessionSnapshot = (): AlicizationAgentSessionSnapshot => ({
      id: session.id,
      cardId: session.cardId,
      conversationSessionId: session.conversationSessionId,
      continuitySignals: session.continuitySignals.map(cloneContinuitySignal),
      createdAt: session.createdAt,
      digitalLifeArchitecture: cloneDigitalLifeArchitecture(session.digitalLifeArchitecture),
      digitalLifeSpine: cloneDigitalLifeSpine(session.digitalLifeSpine),
      lastActiveAt: session.lastActiveAt,
      lastSensorySnapshot: cloneSensorySnapshot(session.lastSensorySnapshot),
      tasks: session.tasks.map(cloneTask),
    })

    return {
      agentSessionId: session.id,
      conversationSessionId,
      buildExecutionRuntimeContext,
      buildSessionSystemBlock,
      getSensorySnapshot,
      getSessionSnapshot,
      ingestDigitalLifeArchitecture,
      ingestDigitalLifeSpine,
      ingestContinuitySignals,
      ingestRuntimeActions,
      snapshot: () => trace.snapshot(),
      trackPhase,
      trackTool,
    }
  }

  function clear() {
    sessions.clear()
  }

  return {
    clear,
    openTurn,
  }
}
