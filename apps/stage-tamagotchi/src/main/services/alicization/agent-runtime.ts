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
import {
  buildAlicizationProviderFactBlock,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  deriveAlicizationAgentRuntimeTelemetryFromSession,
  deriveAlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import { deriveAlicizationDialogueMemoryCarryPolicy } from './dialogue-memory-governor'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import { createAlicizationRuntimeCallChain } from './runtime-call-chain'
import {
  deferredAutonomyCanonicalVersion,
  deferredAutonomyContinuityBudgets,
  deferredAutonomyProviderMetadataSchema,
  normalizeDeferredAutonomyCanonicalDeferReason,
  normalizeDeferredAutonomyRawText,
  readDeferredAutonomySummaryOwner,
  validateDeferredAutonomyCanonicalSummary,
} from './runtime-deferred-autonomy-summary'

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

function sanitizeProviderFactText(raw: unknown, maxChars = 180) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '') || ''
}

function sanitizeProviderContinuitySummary(raw: unknown, maxChars = 240) {
  const text = sanitizeProviderFactText(raw, maxChars)
  const containsStructuredSegment = text
    .split(/\s*[;|]\s*/u)
    .some(segment => /^[\p{L}_][\p{L}\p{N}_-]*\s*=/u.test(segment))
  return containsStructuredSegment ? '' : text
}

function projectAgentSessionFactMetadata(
  raw: unknown,
  options?: {
    canonicalSummaryValidation?: ReturnType<typeof validateDeferredAutonomyCanonicalSummary>
    requiresSummaryProvenance?: boolean
  },
) {
  const metadata = asRecord(raw)
  if (!metadata)
    return null

  const projected: Record<string, unknown> = {}
  if (metadata.canonicalVersion === deferredAutonomyCanonicalVersion)
    projected.canonicalVersion = deferredAutonomyCanonicalVersion
  const source = sanitizeProviderFactText(metadata.source, 80)
  const requiresSummaryProvenance
    = options?.requiresSummaryProvenance === true
      || source === 'proactive-deferred'
      || source === 'proactive-held-autonomy'
  const canonicalSummaryValidation = options?.canonicalSummaryValidation
  const summaryOwner = requiresSummaryProvenance
    ? canonicalSummaryValidation?.summaryOwner ?? null
    : readDeferredAutonomySummaryOwner(metadata.summaryOwner)
  const allowsCanonicalSummaryMetadata
    = !requiresSummaryProvenance
      || canonicalSummaryValidation?.isValid === true
  const textFields = Object.entries(deferredAutonomyProviderMetadataSchema.textFields)
    .map(([field, schema]) => [
      field,
      requiresSummaryProvenance ? schema.canonicalMaxChars : schema.legacyMaxChars,
    ] as const)
  for (const [field, maxChars] of textFields) {
    if (
      requiresSummaryProvenance
      && (
        field === 'deferReason'
        || field === 'executionIntentSummary'
      )
      && !allowsCanonicalSummaryMetadata
    ) {
      continue
    }
    const rawValue = requiresSummaryProvenance
      ? field === 'executionIntentSummary'
        ? canonicalSummaryValidation?.executionIntentSummary
        : field === 'deferReason'
          ? normalizeDeferredAutonomyCanonicalDeferReason(metadata.deferReason)
          : metadata[field]
      : metadata[field]
    const value = sanitizeProviderFactText(rawValue, maxChars)
    if (value)
      projected[field] = value
  }

  for (const field of ['deliveredAt', 'feedbackWindowMs', 'deferredAt'] as const) {
    const value = metadata[field]
    if (typeof value === 'number' && Number.isFinite(value))
      projected[field] = Math.max(0, Math.floor(value))
  }

  const learningFocuses = Array.isArray(metadata.learningFocuses)
    ? metadata.learningFocuses
        .map(focus => sanitizeProviderFactText(
          focus,
          deferredAutonomyProviderMetadataSchema.learningFocuses.itemCanonicalMaxChars,
        ))
        .filter(Boolean)
        .slice(0, deferredAutonomyProviderMetadataSchema.learningFocuses.maxItems)
    : []
  if (learningFocuses.length > 0)
    projected.learningFocuses = learningFocuses

  const failure = requiresSummaryProvenance
    ? canonicalSummaryValidation?.failure ?? ''
    : sanitizeText(metadata.failure, deferredAutonomyProviderMetadataSchema.failure.legacyMaxChars)
  if (
    failure
    && (
      !requiresSummaryProvenance
      || (allowsCanonicalSummaryMetadata && summaryOwner === 'failure')
    )
  ) {
    projected.failure = failure
  }
  if (summaryOwner && allowsCanonicalSummaryMetadata)
    projected.summaryOwner = summaryOwner

  return Object.keys(projected).length > 0 ? projected : null
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

function selectRecentTasksForSystemBlock(tasks: AlicizationAgentTaskRecord[], limit: number) {
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

function extractContinuityArcStage(raw: unknown) {
  const text = sanitizeText(raw, 220).toLowerCase()
  if (!text)
    return ''
  if (text.includes('same-thread-continuation'))
    return 'same-thread-continuation'
  if (text.includes('gentle-reopen'))
    return 'gentle-reopen'
  if (text.includes('hold-for-opening'))
    return 'hold-for-opening'
  if (text.includes('mirror-carry'))
    return 'mirror-carry'
  return ''
}

function deriveAgentSessionInitiativeRestraint(input: {
  digitalLifeLineSummary?: string | null
  spine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const legacySpine = asRecord(input.spine)
  const legacyRuntime = asRecord(legacySpine?.runtime)
  const legacyProactive = asRecord(legacySpine?.proactive)
  const arcStage = sanitizeText(legacyRuntime?.continuityArcStage, 120)
    || extractContinuityArcStage(input.digitalLifeLineSummary)
    || sanitizeText(legacyProactive?.dominantConcernKind, 120)

  if (arcStage)
    return arcStage

  return sanitizeText(legacyRuntime?.continuityCadence, 120)
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

function resolveAgentDeferredAutonomySummaryProjection(
  signal: Pick<AlicizationAgentContinuityRecord, 'summary' | 'metadata'>,
) {
  const metadata = asRecord(signal.metadata)
  const canonicalSummaryValidation = validateDeferredAutonomyCanonicalSummary({
    canonicalVersion: metadata?.canonicalVersion,
    executionIntentSummary: metadata?.executionIntentSummary,
    failure: metadata?.failure,
    summary: signal.summary,
    summaryOwner: metadata?.summaryOwner,
    whyNow: metadata?.whyNow,
  })
  const failClosed = {
    canonicalSummaryValidation,
    summary: null,
    summaryOwner: null,
  }
  if (!canonicalSummaryValidation.isValid)
    return failClosed

  if (canonicalSummaryValidation.summaryOwner === 'failure') {
    return {
      canonicalSummaryValidation,
      summary: canonicalSummaryValidation.failure,
      summaryOwner: 'failure' as const,
    }
  }

  const summary = sanitizeProviderContinuitySummary(
    canonicalSummaryValidation.summary,
    deferredAutonomyContinuityBudgets.whyNow,
  ) || null
  if (canonicalSummaryValidation.summaryOwner && !summary) {
    return {
      canonicalSummaryValidation: {
        ...canonicalSummaryValidation,
        executionIntentSummary: null,
        failure: null,
        isValid: false,
        summary: null,
        summaryOwner: null,
        whyNow: null,
      },
      summary: null,
      summaryOwner: null,
    }
  }
  return {
    canonicalSummaryValidation,
    summary,
    summaryOwner: canonicalSummaryValidation.summaryOwner,
  }
}

function toAgentSessionContinuityFact(signal: AlicizationAgentContinuityRecord) {
  const metadata = asRecord(signal.metadata)
  const requiresSummaryProvenance = isDeferredAutonomyContinuitySignal(signal)
  const summaryProjection = requiresSummaryProvenance
    ? resolveAgentDeferredAutonomySummaryProjection(signal)
    : {
        canonicalSummaryValidation: undefined,
        summary: sanitizeProviderContinuitySummary(signal.summary) || null,
        summaryOwner: readDeferredAutonomySummaryOwner(metadata?.summaryOwner),
      }
  const continuity = {
    arcStage: sanitizeContinuityFactSlug(metadata?.continuityArcStage, 120),
    cadence: sanitizeContinuityFactSlug(metadata?.continuityCadence, 120),
    residentMode: sanitizeContinuityFactSlug(metadata?.residentMode, 120),
  }
  const projectedMetadata = projectAgentSessionFactMetadata(metadata, {
    canonicalSummaryValidation: requiresSummaryProvenance
      ? summaryProjection.canonicalSummaryValidation
      : undefined,
    requiresSummaryProvenance,
  })
  return {
    kind: signal.kind,
    state: signal.state,
    label: sanitizeProviderFactText(signal.label, 80) || signal.kind,
    summary: summaryProjection.summary,
    createdAt: signal.createdAt,
    timing: sanitizeContinuityFactSlug(metadata?.timing),
    ...(Object.values(continuity).some(Boolean) ? { continuity } : {}),
    ...(projectedMetadata ? { metadata: projectedMetadata } : {}),
  }
}

function toAgentSessionSensoryFact(snapshot: AlicizationSensoryCacheSnapshot | null) {
  const foregroundWindow = snapshot?.sample.foregroundWindow ?? null
  const capture = snapshot?.capture ?? null
  return {
    foregroundWindow: foregroundWindow
      ? {
          appName: sanitizeProviderFactText(foregroundWindow.appName, 80) || null,
          processName: sanitizeProviderFactText(foregroundWindow.processName, 80) || null,
          title: sanitizeProviderFactText(foregroundWindow.title, 120) || null,
        }
      : null,
    capture: capture
      ? {
          health: capture.health ?? null,
          permission: capture.permission ?? null,
          sourceCount: typeof capture.sourceCount === 'number' ? capture.sourceCount : null,
          degradedReasons: capture.degradedReasons
            .map(reason => sanitizeProviderFactText(reason, 120))
            .filter(Boolean),
          lastError: sanitizeProviderFactText(capture.lastError, 220) || null,
        }
      : null,
  }
}

function selectContinuitySignalsForSystemBlock(
  signals: AlicizationAgentContinuityRecord[],
  limit: number,
) {
  const safeLimit = Math.max(1, Math.floor(limit))
  if (signals.length <= safeLimit)
    return signals.slice()

  const tail = signals.slice(-safeLimit)
  const hasProactiveOutcome = tail.some(signal =>
    signal.kind === 'proactive'
    && signal.state !== 'pending'
    && String(signal.label).includes('reply-within-120s'),
  )
  if (hasProactiveOutcome)
    return tail

  const latestProactiveOutcomeIndex = signals.findLastIndex(signal =>
    signal.kind === 'proactive'
    && signal.state !== 'pending'
    && String(signal.label).includes('reply-within-120s'),
  )
  if (latestProactiveOutcomeIndex < 0)
    return tail

  const next = tail.slice(1)
  next.push(signals[latestProactiveOutcomeIndex]!)
  return next
    .sort((left, right) => Number(left.createdAt) - Number(right.createdAt))
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
  const threadStatus = readRawTaskStatusDetail(task)
  const projectedMetadata = projectAgentSessionFactMetadata(task.metadata)
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
    label: sanitizeProviderFactText(task.label, 120) || task.kind,
    summary: sanitizeProviderFactText(task.summary, 180) || null,
    ...(projectedMetadata ? { metadata: projectedMetadata } : {}),
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

    const buildSessionSystemBlock = () => {
      const recentContinuitySignals = selectContinuitySignalsForSystemBlock(
        session.continuitySignals,
        maxContinuityInSystemBlock,
      )
      const recentTasks = selectRecentTasksForSystemBlock(session.tasks, maxTasksInSystemBlock)
      const digitalLifeLine = session.digitalLifeSpine?.continuitySignal
        ?? findLatestDigitalLifeContinuitySignal(session.continuitySignals)
      const sessionInitiativeRestraint = deriveAgentSessionInitiativeRestraint({
        digitalLifeLineSummary: digitalLifeLine?.summary ?? null,
        spine: session.digitalLifeSpine,
      })
      const digitalLifeDigest = projectAlicizationDigitalLifeSpineDigest(session.digitalLifeSpine)
      const memoryCarryPolicy = deriveAlicizationDialogueMemoryCarryPolicy({
        now: getNow(),
        spine: session.digitalLifeSpine,
      })
      const runtimeDigest = deriveAlicizationRuntimeSnapshot({
        spine: session.digitalLifeSpine,
        agentRuntime: deriveAlicizationAgentRuntimeTelemetryFromSession({
          tasks: recentTasks,
          continuitySignals: session.continuitySignals,
          lastSensorySnapshot: session.lastSensorySnapshot,
        }),
      })
      const architecture = session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture

      return buildAlicizationProviderFactBlock('alicization-agent-session', {
        version: 'alicization-agent-session-v1',
        session: {
          id: session.id,
          conversationSessionId: session.conversationSessionId,
          cardId: session.cardId,
        },
        owners: {
          shortTerm: 'WorkingMemory',
          longTermRecall: 'LongTermMemoryRecall',
        },
        failureSurface: 'transparent',
        sensory: toAgentSessionSensoryFact(session.lastSensorySnapshot),
        memory: {
          summary: sanitizeProviderFactText(digitalLifeDigest?.memory?.summary, 220) || null,
          recallMode: sanitizeText(digitalLifeDigest?.memory?.recallMode, 64) || null,
          carry: {
            mode: memoryCarryPolicy.mode,
            allowMirrorCarry: memoryCarryPolicy.allowMirrorCarry,
            reflectionPressure: memoryCarryPolicy.reflectionPressure,
            reasonTags: memoryCarryPolicy.reasonTags,
            recallSeed: sanitizeProviderFactText(memoryCarryPolicy.recallSeed, 360) || null,
          },
        },
        digitalLife: {
          continuitySummary: sanitizeProviderFactText(digitalLifeLine?.summary, 220) || null,
          continuityArcStage: sessionInitiativeRestraint || null,
          initiativeRestraint: sessionInitiativeRestraint || null,
          presence: {
            mode: architecture?.operatingMode ?? null,
            style: session.digitalLifeSpine?.proactive?.preferredStyle ?? null,
            shouldSpeak: typeof session.digitalLifeSpine?.proactive?.shouldSpeak === 'boolean'
              ? session.digitalLifeSpine.proactive.shouldSpeak
              : null,
          },
          architecture: {
            operatingMode: architecture?.operatingMode ?? null,
            dominantSystem: architecture?.dominantSystem ?? null,
            supportingSystems: architecture?.supportingSystems ?? [],
            governingFocus: sanitizeProviderFactText(architecture?.governingFocus, 180) || null,
          },
          runtime: {
            dominantChannel: runtimeDigest?.dominantChannel ?? null,
            shouldSpeak: runtimeDigest?.shouldProactivelySpeak ?? null,
            shouldAct: runtimeDigest?.shouldProactivelyAct ?? null,
            continuityPressure: runtimeDigest?.continuityPressure ?? null,
            companionshipPressure: runtimeDigest?.companionshipPressure ?? null,
          },
        },
        continuitySignals: recentContinuitySignals.map(toAgentSessionContinuityFact),
        recentActions: recentTasks.map(toExecutionActionDigest),
      })
    }

    const buildExecutionRuntimeContext: AlicizationAgentTurnRuntime['buildExecutionRuntimeContext'] = async (identity) => {
      const sensorySnapshot = identity?.sensorySnapshot ?? await getSensorySnapshot()
      const recentTasks = selectRecentTasksForSystemBlock(session.tasks, maxTasksInSystemBlock)
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
