import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
} from './digital-life-architecture'
import type {
  AlicizationDigitalLifeSpineSnapshot,
} from './digital-life-spine'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'

import { createHash, randomUUID } from 'node:crypto'

import { errorMessageFrom } from '@moeru/std'
import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import { createAlicizationRuntimeCallChain } from './runtime-call-chain'
import { normalizeDeferredAutonomyRawText } from './runtime-deferred-autonomy-summary'

type AlicizationAgentTaskKind = 'executor' | 'mcp' | 'runtime' | 'sensory'
type AlicizationAgentTaskStatus = 'completed' | 'failed' | 'pending'
export type AlicizationAgentContinuityKind = 'dialogue' | 'execution-callback' | 'presence' | 'proactive' | 'reminder' | 'runtime'
export type AlicizationAgentContinuityState = 'fresh' | 'observed' | 'pending'
type AlicizationExecutionProjectBriefingInput = NonNullable<Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['projectBriefing']>

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
      affectiveResidue?: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['affectiveResidue']
      derivedMindStateBundle?: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['derivedMindStateBundle']
      memoryClosureTrace?: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['memoryClosureTrace']
      projectBriefing?: Parameters<typeof buildAlicizationExecutionRuntimeContext>[0]['projectBriefing']
      sensorySnapshot?: AlicizationSensoryCacheSnapshot
    },
  ) => Promise<AlicizationExecutionRuntimeContext>
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
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot> | AlicizationSensoryCacheSnapshot
  maxTaskHistory?: number
  maxRecentTasksInExecutionContext?: number
  resolveConversationSessionId?: (cardId: string) => Promise<string | null | undefined> | string | null | undefined
  sessionTtlMs?: number
}

const defaultMaxTaskHistory = 12
const defaultMaxRecentTasksInExecutionContext = 4
const defaultMaxContinuityHistory = 8
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
  const explicitSignature = normalizeContinuitySignatureText(input.signature)
  if (explicitSignature)
    return boundContinuitySignature(explicitSignature)

  return boundContinuitySignature(
    [
      input.kind,
      input.state ?? 'fresh',
      input.label,
      input.summary ?? '',
    ].join('::'),
  )
}

function normalizeContinuitySignatureText(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ')
    : ''
}

function boundContinuitySignature(signature: string, maxChars = 220) {
  if (signature.length <= maxChars)
    return signature

  const fingerprint = createHash('sha256').update(signature).digest('hex')
  const suffix = `::sha256:${fingerprint}`
  return `${signature.slice(0, maxChars - suffix.length)}${suffix}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : null
}

function shouldReplaceHeldAutonomyWithDeferred(
  existing: AlicizationAgentContinuityRecord,
  incoming: AlicizationAgentSessionContinuityInput,
) {
  if (existing.kind !== 'proactive' || incoming.kind !== 'proactive')
    return false

  const existingMetadata = asRecord(existing.metadata)
  const incomingMetadata = asRecord(incoming.metadata)
  const existingSource = sanitizeText(existingMetadata?.source, 80)
  const incomingSource = sanitizeText(incomingMetadata?.source, 80)
  if (existingSource !== 'proactive-held-autonomy' || incomingSource !== 'proactive-deferred')
    return false

  const existingTurnId = sanitizeText(existingMetadata?.turnId, 160)
  const incomingTurnId = sanitizeText(incomingMetadata?.turnId, 160)
  if (!existingTurnId || existingTurnId !== incomingTurnId)
    return false

  const existingThreadId = sanitizeText(existingMetadata?.sourceThreadId, 160)
  const incomingThreadId = sanitizeText(incomingMetadata?.sourceThreadId, 160)
  return !!existingThreadId && existingThreadId === incomingThreadId
}

function buildSessionKey(cardId: string, conversationSessionId: string | null) {
  return `${cardId}::${conversationSessionId ?? 'detached'}`
}

function readRawTaskStatusDetail(task: AlicizationAgentTaskRecord) {
  const metadata = asRecord(task.metadata)
  const threadStatus = sanitizeText(metadata?.threadStatus, 48).toLowerCase()
  if (!threadStatus)
    return ''
  if (threadStatus === 'completed' || threadStatus === 'failed' || threadStatus === 'pending')
    return ''
  return threadStatus
}

function selectRecentTasksForExecutionContext(tasks: AlicizationAgentTaskRecord[], limit: number) {
  const safeLimit = Math.max(0, Math.floor(limit))
  if (safeLimit === 0)
    return []

  const tail = tasks.slice(-safeLimit)
  if (tail.some(task => sanitizeSummary(task.label, 80).startsWith('proactive-feedback:')))
    return tail

  const latestProactiveFeedback = [...tasks]
    .reverse()
    .find(task => sanitizeSummary(task.label, 80).startsWith('proactive-feedback:'))
  if (!latestProactiveFeedback)
    return tail

  return [...tail.slice(1), latestProactiveFeedback]
    .sort((left, right) => left.startedAt - right.startedAt)
}

function sanitizeContinuityFactSlug(raw: unknown, maxChars = 64) {
  const value = sanitizeText(raw, maxChars)
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) ? value : null
}

function isDeferredAutonomyContinuitySignal(
  signal: Pick<AlicizationAgentContinuityRecord, 'kind' | 'label' | 'metadata'>,
) {
  const source = sanitizeText(signal.metadata?.source, 80)
  if (source === 'proactive-deferred' || source === 'proactive-held-autonomy')
    return true
  if (signal.kind !== 'proactive')
    return false

  const label = normalizeDeferredAutonomyRawText(signal.label)
  return label.endsWith(':deferred')
    || label.endsWith(':held-autonomy')
}

function sanitizeDeferredAutonomyContinuityLabel(raw: unknown, maxChars = 80) {
  const label = normalizeDeferredAutonomyRawText(raw)
  const suffix = label.endsWith(':held-autonomy')
    ? ':held-autonomy'
    : label.endsWith(':deferred')
      ? ':deferred'
      : ''
  if (!suffix || label.length <= maxChars)
    return sanitizeSummary(label, maxChars)
  return `${label.slice(0, maxChars - suffix.length)}${suffix}`
}

function isDigitalLifeContinuitySignal(signal: Pick<AlicizationAgentContinuityRecord, 'kind' | 'label' | 'metadata'>) {
  return signal.kind === 'presence'
    && sanitizeText(signal.label, 80) === 'digital-life-line'
    && sanitizeText(signal.metadata?.source, 64) === 'digital-life-runtime'
}

function toExecutionActionDigest(task: AlicizationAgentTaskRecord) {
  const threadStatus = readRawTaskStatusDetail(task)
  return {
    kind: task.kind,
    status: task.status,
    threadStatus:
      threadStatus === 'planned'
      || threadStatus === 'needs-affirmation'
      || threadStatus === 'running'
      || threadStatus === 'paused'
      || threadStatus === 'blocked'
      || threadStatus === 'completed'
      || threadStatus === 'failed'
      || threadStatus === 'cancelled'
        ? threadStatus
        : null,
    label: sanitizeAlicizationProviderFacingText(task.label, 120, '') || task.kind,
    summary: sanitizeAlicizationProviderFacingText(task.summary, 180, '') || null,
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

function normalizeAgentExecutionEnum<T extends string>(
  raw: unknown,
  values: readonly T[],
): T | null {
  const value = sanitizeText(raw, 64)
  return values.includes(value as T) ? value as T : null
}

function resolveAgentExecutionFactBriefing(
  session: AlicizationAgentSessionRecord,
): AlicizationExecutionProjectBriefingInput | null {
  const runtimeSurface = session.digitalLifeSpine?.runtimeSurface ?? null
  if (!runtimeSurface)
    return null

  const rawProjectState = asRecord(asRecord(asRecord(runtimeSurface.raw)?.runtimeDigest)?.projectState)
  const cognitionProjectState = asRecord(asRecord(asRecord(runtimeSurface.cognition)?.runtimeDigest)?.projectState)
  const dialogueProjectState = asRecord(asRecord(asRecord(runtimeSurface.dialogue)?.runtimeDigest)?.projectState)
  const currentConsciousProjectState = asRecord(asRecord(asRecord(runtimeSurface.dialogue)?.currentConsciousFrame)?.projectState)
  const source = {
    ...rawProjectState,
    ...cognitionProjectState,
    ...dialogueProjectState,
    ...currentConsciousProjectState,
  }
  const briefing = {
    continuityArcStage: sanitizeContinuityFactSlug(source.continuityArcStage, 120),
    continuityRestraint: normalizeAgentExecutionEnum(source.continuityRestraint, [
      'lower-pressure',
      'measured-return',
      'repair-before-closeness',
      'rest-protective',
      'single-thread',
    ] as const),
    continuityPreferredTiming: normalizeAgentExecutionEnum(source.continuityPreferredTiming, [
      'internal-only',
      'after-payoff',
      'same-turn-if-invited',
      'next-open-window',
    ] as const),
    continuityCadence: sanitizeContinuityFactSlug(source.continuityCadence, 120),
    preferredBlinkCadence: normalizeAgentExecutionEnum(source.preferredBlinkCadence, ['normal', 'linger', 'quiet'] as const),
    preferredGazeMode: normalizeAgentExecutionEnum(source.preferredGazeMode, ['steady', 'soften', 'drift'] as const),
    preferredPauseMode: normalizeAgentExecutionEnum(source.preferredPauseMode, ['longer', 'natural'] as const),
    preferredLipsyncMode: normalizeAgentExecutionEnum(source.preferredLipsyncMode, ['restrained', 'matched'] as const),
    preferredVoiceMode: normalizeAgentExecutionEnum(source.preferredVoiceMode, ['lower-pressure', 'even'] as const),
    preferredPacingMode: normalizeAgentExecutionEnum(source.preferredPacingMode, ['slower', 'natural'] as const),
  } satisfies AlicizationExecutionProjectBriefingInput

  return Object.values(briefing).some(Boolean) ? briefing : null
}

export function createAlicizationAgentRuntime(options: CreateAlicizationAgentRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const maxContinuityHistory = Math.max(1, Math.floor(options.maxContinuityHistory ?? defaultMaxContinuityHistory))
  const maxTaskHistory = Math.max(1, Math.floor(options.maxTaskHistory ?? defaultMaxTaskHistory))
  const maxRecentTasksInExecutionContext = Math.max(
    1,
    Math.floor(options.maxRecentTasksInExecutionContext ?? defaultMaxRecentTasksInExecutionContext),
  )
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
        const replacedHeldAutonomyIndex = session.continuitySignals.findIndex(existing =>
          shouldReplaceHeldAutonomyWithDeferred(existing, signal))
        if (replacedHeldAutonomyIndex >= 0) {
          const replaced = session.continuitySignals.splice(replacedHeldAutonomyIndex, 1)[0]
          const replacedSignature = buildContinuitySignature({
            kind: replaced.kind,
            state: replaced.state,
            label: replaced.label,
            metadata: replaced.metadata ?? undefined,
            summary: replaced.summary,
          })
          if (replacedSignature)
            session.continuitySignatures.delete(replacedSignature)
        }

        const signature = buildContinuitySignature(signal)
        if (signature && session.continuitySignatures.has(signature))
          continue

        if (signature)
          session.continuitySignatures.add(signature)

        const isDeferredAutonomySignal = isDeferredAutonomyContinuitySignal({
          kind: signal.kind,
          label: signal.label,
          metadata: signal.metadata ?? null,
        })
        appendContinuitySignal(session, {
          id: `agent-continuity:${randomUUID()}`,
          kind: signal.kind,
          label: isDeferredAutonomySignal
            ? sanitizeDeferredAutonomyContinuityLabel(signal.label) || signal.kind
            : sanitizeSummary(signal.label, 80) || signal.kind,
          metadata: normalizeMetadata(signal.metadata),
          createdAt: Number.isFinite(signal.createdAt) ? Number(signal.createdAt) : getNow(),
          state: signal.state ?? 'fresh',
          summary: isDeferredAutonomySignal
            ? normalizeDeferredAutonomyRawText(signal.summary) || null
            : sanitizeSummary(signal.summary ?? '', 260) || null,
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

    const buildExecutionRuntimeContext: AlicizationAgentTurnRuntime['buildExecutionRuntimeContext'] = async (identity) => {
      const sensorySnapshot = identity?.sensorySnapshot ?? await getSensorySnapshot()
      const recentTasks = selectRecentTasksForExecutionContext(
        session.tasks,
        maxRecentTasksInExecutionContext,
      )
      return buildAlicizationExecutionRuntimeContext({
        agentSessionId: session.id,
        affectiveResidue: identity?.affectiveResidue ?? null,
        cardId: sanitizeText(identity?.cardId, 120) || cardId,
        turnId: sanitizeText(identity?.turnId, 160) || sanitizeText(input.turnId, 160),
        decisionTraceId: sanitizeText(identity?.decisionTraceId, 200) || sanitizeText(input.decisionTraceId, 200) || null,
        derivedMindStateBundle: identity?.derivedMindStateBundle ?? null,
        memoryClosureTrace: identity?.memoryClosureTrace ?? null,
        sessionId: sanitizeText(identity?.sessionId, 160) || conversationSessionId,
        projectBriefing: identity?.projectBriefing ?? resolveAgentExecutionFactBriefing(session),
        recentActions: recentTasks.map(toExecutionActionDigest),
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
