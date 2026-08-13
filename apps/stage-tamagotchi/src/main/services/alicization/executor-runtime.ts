import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type {
  AlicizationAuditLogInput,
  AlicizationChannelCapability,
  AlicizationChannelCapabilityManifestRecord,
  AlicizationClawTaskIntent,
  AlicizationDispatchTaskThreadPayload,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationExecutionEventKind,
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '../../../shared/eventa'
import type { AlicizationDbService } from './db'
import type { MainGatewayExecutionTaskThreadResult, MainGatewayExecutionToolContext } from './main-chat-execution-surface'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type { AlicizationTaskExecutionGovernorPlanningInput } from './task-execution-governor'
import type { AlicizationTaskThreadDispatchInvocation } from './task-thread-orchestrator'

import { randomUUID } from 'node:crypto'
import { env, platform } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

import { locateAlicizationExecutionBinary } from './execution-command-env'
import { readExecutionOutcome, readLatestExecutionEvent, readTaskThreadActivityAt, sanitizeExecutionLedgerText } from './execution-ledger-shared'
import { expandOpenClawBackedCapabilities } from './executor-adapters/embodied-channel'
import { probeOpenClawCapability } from './executor-adapters/openclaw'
import { buildHostPersonModelSnapshot } from './humanlike-memory'
import { createTaskExecutionGovernor } from './task-execution-governor'

type CapabilityManifestSnapshotSource = 'runtime-default-probe' | 'runtime-plan-payload'

type AlicizationExecutorRuntimeDbPort = Pick<AlicizationDbService, 'appendExecutionEvents'
  | 'getTaskThread'
  | 'getLatestRelationshipDynamics'
  | 'listChannelCapabilityManifests'
  | 'listExecutionEvents'
  | 'listRecentEpisodicEvents'
  | 'listExecutorSessions'
  | 'listTaskThreads'
  | 'searchMemoryConsolidations'
  | 'upsertChannelCapabilityManifest'
  | 'upsertExecutorSession'
  | 'upsertTaskThread'>

interface AlicizationExecutorRuntimeOptions {
  appendAuditLog: (input: AlicizationAuditLogInput) => Promise<void>
  dispatchTaskThread: (input: AlicizationTaskThreadDispatchInvocation) => Promise<{
    createdEventKinds?: AlicizationExecutionEventKind[]
    errorCode?: string
    errorMessage?: string
    finalStatus?: AlicizationTaskThreadStatus
    ok: boolean
    output?: unknown | null
    summary: string
    thread: Awaited<ReturnType<AlicizationExecutorRuntimeDbPort['upsertTaskThread']>>
  }>
  ensureSessionId: (cardId: string) => Promise<string>
  getAlicizationDb: () => AlicizationExecutorRuntimeDbPort
  getCardKillSwitchState: (cardId: string) => 'ACTIVE' | 'SUSPENDED'
  getGlobalKillSwitchState: () => 'ACTIVE' | 'SUSPENDED'
  normalizeSessionId: (raw: unknown) => string
  resolveLocalCapabilityChannels?: () => Promise<AlicizationChannelCapability[]>
  sanitizeText: (raw: unknown, fallback?: string) => string
}

const executionCapabilityProbeTtlMs = 45_000

function combineAbortSignals(signals: readonly (AbortSignal | undefined)[]) {
  const uniqueSignals = signals.filter((signal, index, all): signal is AbortSignal => (
    signal !== undefined
    && all.indexOf(signal) === index
  ))
  if (uniqueSignals.length === 0)
    return undefined
  if (uniqueSignals.length === 1)
    return uniqueSignals[0]

  const controller = new AbortController()
  const abortFrom = (signal: AbortSignal) => {
    if (!controller.signal.aborted)
      controller.abort(signal.reason)
  }
  for (const signal of uniqueSignals) {
    if (signal.aborted) {
      abortFrom(signal)
      break
    }
    signal.addEventListener('abort', () => abortFrom(signal), { once: true })
  }
  return controller.signal
}

function resolveAbortMessage(signal: AbortSignal, fallback: string) {
  const reason = signal.reason
  if (typeof reason === 'string' && reason.trim())
    return reason.trim()
  return errorMessageFrom(reason) || fallback
}

function withResultDeliveryMode<
  Command extends { runtimeContext?: AlicizationExecutionRuntimeContext | null },
>(
  command: Command | null | undefined,
  resultDeliveryMode: 'inline' | 'callback',
): Command | null | undefined {
  if (!command?.runtimeContext)
    return command

  return {
    ...command,
    runtimeContext: {
      ...command.runtimeContext,
      resultDeliveryMode,
    },
  }
}

function withDispatchResultDeliveryMode(
  dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'localVisual' | 'openclaw'>,
  resultDeliveryMode: 'inline' | 'callback',
) {
  return {
    cli: withResultDeliveryMode(dispatch.cli, resultDeliveryMode),
    codex: withResultDeliveryMode(dispatch.codex, resultDeliveryMode),
    claudeCode: withResultDeliveryMode(dispatch.claudeCode, resultDeliveryMode),
    localVisual: withResultDeliveryMode(dispatch.localVisual, resultDeliveryMode),
    openclaw: withResultDeliveryMode(dispatch.openclaw, resultDeliveryMode),
  }
}

function areCapabilityManifestsFresh(
  manifests: AlicizationChannelCapabilityManifestRecord[],
  nowTs = Date.now(),
) {
  return manifests.length > 0
    && manifests.every((manifest) => {
      const lastCheckedAt = manifest.lastCheckedAt
      return typeof lastCheckedAt === 'number'
        && Number.isFinite(lastCheckedAt)
        && nowTs - lastCheckedAt <= executionCapabilityProbeTtlMs
    })
}

function normalizePlanningCapability(capability: AlicizationChannelCapability): AlicizationChannelCapability {
  return {
    channel: capability.channel,
    available: capability.available !== false,
    enabled: capability.enabled !== false,
    ready: capability.ready !== false,
    sessionAffinity: typeof capability.sessionAffinity === 'boolean' ? capability.sessionAffinity : undefined,
    reason: typeof capability.reason === 'string'
      ? capability.reason.trim().slice(0, 360) || null
      : capability.reason ?? undefined,
  }
}

function mapManifestToPlanningCapability(manifest: AlicizationChannelCapabilityManifestRecord): AlicizationChannelCapability {
  return {
    channel: manifest.channel,
    available: manifest.available,
    enabled: manifest.enabled,
    ready: manifest.ready,
    sessionAffinity: manifest.sessionAffinity,
    reason: manifest.reason,
  }
}

function mergeExecutionCapabilities(
  baseCapabilities: AlicizationChannelCapability[],
  overlayCapabilities: AlicizationChannelCapability[],
) {
  const capabilityMap = new Map<string, AlicizationChannelCapability>()

  for (const capability of baseCapabilities)
    capabilityMap.set(capability.channel, capability)

  for (const capability of overlayCapabilities) {
    const existing = capabilityMap.get(capability.channel)
    if (!existing) {
      capabilityMap.set(capability.channel, capability)
      continue
    }

    const mergedReady = existing.ready !== false || capability.ready !== false
    capabilityMap.set(capability.channel, {
      channel: capability.channel,
      available: existing.available !== false || capability.available !== false,
      enabled: existing.enabled !== false || capability.enabled !== false,
      ready: mergedReady,
      sessionAffinity: capability.sessionAffinity ?? existing.sessionAffinity,
      reason: mergedReady
        ? null
        : capability.reason ?? existing.reason ?? null,
    })
  }

  return [...capabilityMap.values()]
}

const executionChannels = new Set<AlicizationExecutionChannel>([
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
])

function normalizeTypedExecutionChannel(raw: unknown): AlicizationExecutionChannel | null {
  return typeof raw === 'string' && executionChannels.has(raw as AlicizationExecutionChannel)
    ? raw as AlicizationExecutionChannel
    : null
}

function readPreferredChannelFromMetadata(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const metadata = raw as Record<string, unknown>
  const execution = metadata.execution && typeof metadata.execution === 'object' && !Array.isArray(metadata.execution)
    ? metadata.execution as Record<string, unknown>
    : null
  return normalizeTypedExecutionChannel(
    metadata.preferredChannel
    ?? metadata.channel
    ?? execution?.preferredChannel
    ?? execution?.channel,
  )
}

export function inferPreferredProcedureChannel(input: {
  selectedChannel?: unknown
  proposedChannel?: unknown
  metadata?: unknown
  summary?: unknown
}) {
  const selectedChannel = normalizeTypedExecutionChannel(input.selectedChannel)
  if (selectedChannel) {
    return {
      channel: selectedChannel,
      reason: 'remembered-procedure-selected-channel',
    } as const
  }

  const proposedChannel = normalizeTypedExecutionChannel(input.proposedChannel)
  if (proposedChannel) {
    return {
      channel: proposedChannel,
      reason: 'remembered-procedure-proposed-channel',
    } as const
  }

  const metadataChannel = readPreferredChannelFromMetadata(input.metadata)
  if (!metadataChannel)
    return null
  return {
    channel: metadataChannel,
    reason: 'remembered-procedure-metadata-channel',
  } as const
}

function inferPlanningHostContexts(goal: string) {
  const normalized = goal.toLowerCase()
  const contexts = ['general']
  if (/runtime|debug|coding|code|patch|fix|verify|test|cursor|terminal|cli/iu.test(normalized))
    contexts.push('focused-work', 'execution')
  if (/late|night|fatigue|rest|sleep|tired|熬夜|疲惫|休息/u.test(normalized))
    contexts.push('late-night')
  return [...new Set(contexts)]
}

function normalizeHintText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizePlanningText(raw: unknown, maxChars = 220) {
  return normalizeHintText(raw, maxChars)
}

function uniqueProcedureTexts(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeHintText(value, 180)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function uniqueProcedureCues(values: Array<string | null | undefined>, maxItems = 8) {
  return [...new Set(values.map(value => normalizeHintText(value, 120)).filter(Boolean))].slice(0, maxItems)
}

function tokenizeGoalText(raw: unknown) {
  return normalizeHintText(raw, 360)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .split(/\s+/u)
    .map(token => token.trim())
    .filter(token => token.length >= 2)
}

function computeTokenOverlapScore(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0)
    return 0
  const rightSet = new Set(right)
  let overlap = 0
  for (const token of left) {
    if (rightSet.has(token))
      overlap += 1
  }
  const union = new Set([...left, ...right]).size
  return union > 0 ? overlap / union : 0
}

function extractExecutionEventStep(event: AlicizationExecutionEventRecord) {
  const payload = event.payload && typeof event.payload === 'object'
    ? event.payload as Record<string, unknown>
    : null
  const detail = sanitizeExecutionLedgerText(
    payload?.summary
    ?? payload?.reply
    ?? payload?.assistant
    ?? payload?.stdout
    ?? payload?.stderr
    ?? payload?.errorMessage
    ?? payload?.reason
    ?? payload?.goal,
    180,
  )
  if (detail)
    return detail
  const channel = sanitizePlanningText(event.channel, 64)
  const kind = sanitizePlanningText(event.kind, 64)
  if (!channel && !kind)
    return ''
  return [kind || 'step', channel ? `via ${channel}` : ''].filter(Boolean).join(' ')
}

function buildRememberedProcedureTraceSummary(input: {
  label: string
  situation: string
  steps: string[]
  result: string
  lesson: string
  failurePoints: string[]
  repairMoves: string[]
}) {
  return normalizeHintText([
    input.label,
    input.situation,
    input.steps[0] ? `steps: ${input.steps.slice(0, 2).join(' -> ')}` : '',
    input.result ? `result: ${input.result}` : '',
    input.failurePoints[0] ? `failure: ${input.failurePoints.slice(0, 2).join(' | ')}` : '',
    input.repairMoves[0] ? `repair: ${input.repairMoves.slice(0, 2).join(' | ')}` : '',
    input.lesson ? `lesson: ${input.lesson}` : '',
  ].filter(Boolean).join(' | '), 280)
}

async function buildRememberedProcedureTracesFromExecution(input: {
  db: AlicizationExecutorRuntimeDbPort
  goalText: string
  contexts: string[]
  hostPersonModel: ReturnType<typeof buildHostPersonModelSnapshot> | null
  relationshipDynamics: AlicizationRelationshipDynamicsState | null
}) {
  const goalTokens = tokenizeGoalText(input.goalText)
  if (goalTokens.length === 0)
    return []

  const recentThreads = await input.db.listTaskThreads({
    limit: 24,
  }).catch(() => [] as AlicizationTaskThreadRecord[])
  const candidateThreads = recentThreads
    .filter(thread => ['completed', 'failed', 'cancelled', 'blocked', 'running', 'paused'].includes(thread.status))
    .map(thread => ({
      thread,
      similarity: computeTokenOverlapScore(goalTokens, tokenizeGoalText(thread.goal)),
    }))
    .filter(item => item.similarity >= 0.14)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 8)

  const traces = await Promise.all(candidateThreads.map(async ({ thread, similarity }) => {
    const events = await input.db.listExecutionEvents({
      threadId: thread.id,
      limit: 12,
    }).catch(() => [] as AlicizationExecutionEventRecord[])
    const orderedEvents = [...events].sort((left, right) => left.createdAt - right.createdAt)
    const channel = thread.selectedChannel ?? thread.proposedChannel ?? null
    const eventSteps = orderedEvents
      .map(extractExecutionEventStep)
      .filter(Boolean)
      .slice(0, 5)
    const result = sanitizeExecutionLedgerText(readExecutionOutcome(orderedEvents), 220)
      || normalizeHintText(thread.summary, 220)
    const latestEvent = readLatestExecutionEvent(orderedEvents)
    const failurePoints = [
      ...orderedEvents
        .filter(event => event.kind === 'cancel' || event.threadStatus === 'failed' || event.threadStatus === 'blocked' || event.threadStatus === 'cancelled')
        .map(event => extractExecutionEventStep(event)),
      ['failed', 'blocked', 'cancelled'].includes(thread.status)
        ? normalizeHintText(thread.summary, 180)
        : '',
    ].filter(Boolean).slice(0, 3)
    const repairMoves = orderedEvents
      .filter(event => event.kind === 'resume' || event.kind === 'takeover')
      .map(event => extractExecutionEventStep(event))
      .filter(Boolean)
      .slice(0, 3)
    const lesson = uniqueProcedureTexts([
      normalizeHintText(thread.summary, 220),
      result,
      latestEvent ? extractExecutionEventStep(latestEvent) : '',
      ...repairMoves,
      ...failurePoints,
    ], 4)[0] ?? ''
    const preferenceBoost = computeRememberedProcedureHostPreferenceBoost({
      contexts: input.contexts,
      relationshipDynamics: input.relationshipDynamics,
      hostPersonModel: input.hostPersonModel,
      channel,
      threadStatus: thread.status,
      hasRepairEvent: repairMoves.length > 0,
    })
    const preferred = inferPreferredProcedureChannel({
      selectedChannel: thread.selectedChannel,
      proposedChannel: thread.proposedChannel,
      metadata: thread.metadata,
    })
    const label = sanitizePlanningText(thread.goal, 160) || sanitizePlanningText(thread.summary, 160) || 'remembered execution trace'
    const situation = [
      channel ? `channel=${channel}` : '',
      sanitizePlanningText(thread.kind, 64),
      sanitizePlanningText(thread.status, 64),
    ].filter(Boolean).join(' | ')

    return {
      id: `execution-trace:${thread.id}`,
      sourceKind: 'autobiographical' as const,
      facet: 'task-era' as const,
      label,
      approach: eventSteps[0] || lesson || result || label,
      pitfalls: uniqueProcedureTexts(failurePoints, 3),
      situation: normalizeHintText(situation, 220) || null,
      steps: uniqueProcedureTexts(eventSteps, 5),
      failurePoints: uniqueProcedureTexts(failurePoints, 3),
      repairMoves: uniqueProcedureTexts(repairMoves, 3),
      result: result || null,
      traceSummary: buildRememberedProcedureTraceSummary({
        label,
        situation,
        steps: uniqueProcedureTexts(eventSteps, 5),
        result,
        lesson,
        failurePoints: uniqueProcedureTexts(failurePoints, 3),
        repairMoves: uniqueProcedureTexts(repairMoves, 3),
      }) || null,
      lastExperiencedAt: readTaskThreadActivityAt(thread),
      confidence: Math.max(0, Math.min(1, 0.52 + similarity * 0.26 + preferenceBoost)),
      cues: uniqueProcedureCues([
        thread.goal,
        thread.summary,
        channel,
        ...eventSteps.slice(0, 3),
        ...input.contexts,
      ]).slice(0, 6),
      preferredChannel: preferred?.channel ?? channel,
      preferredChannelReason: preferred?.reason
        ? `${preferred.reason}${preferenceBoost > 0 ? ':host-context-biased' : ''}`
        : channel
          ? 'remembered-thread-channel'
          : null,
    }
  }))

  return traces
    .filter(item => item.label && item.approach)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function buildHostProcedureHints(input: {
  contexts: string[]
  relationshipDynamics: AlicizationRelationshipDynamicsState | null
  hostPersonModel: ReturnType<typeof buildHostPersonModelSnapshot> | null
}) {
  const hints: string[] = []
  const hostPersonModel = input.hostPersonModel
  if (hostPersonModel) {
    for (const preference of hostPersonModel.preferredClosenessByContext) {
      if (!input.contexts.includes(preference.context))
        continue
      hints.push(preference.preference)
    }
    for (const routine of hostPersonModel.routines)
      hints.push(routine)
    for (const trigger of hostPersonModel.repairTriggers)
      hints.push(trigger)
    for (const sensitivity of hostPersonModel.sensitivities)
      hints.push(sensitivity)
    for (const burden of hostPersonModel.recurrentBurdens)
      hints.push(burden)
    hints.push(hostPersonModel.trustLadder.rationale)
  }
  return [...new Set(hints.map(item => normalizeHintText(item)).filter(Boolean))].slice(0, 12)
}

function computeRememberedProcedureHostPreferenceBoost(input: {
  contexts: string[]
  relationshipDynamics: AlicizationRelationshipDynamicsState | null
  hostPersonModel: ReturnType<typeof buildHostPersonModelSnapshot> | null
  channel?: AlicizationExecutionChannel | null
  threadStatus?: AlicizationTaskThreadRecord['status'] | null
  hasRepairEvent?: boolean
}) {
  let boost = 0

  const trustStage = input.hostPersonModel?.trustLadder.stage ?? 'cautious-open'
  if ((trustStage === 'guarded' || trustStage === 'cautious-open') && input.hasRepairEvent)
    boost += 0.1
  if ((trustStage === 'warming' || trustStage === 'trusted') && input.threadStatus === 'completed')
    boost += 0.06
  if (input.contexts.includes('focused-work') && input.channel && ['cli', 'codex', 'claude-code'].includes(input.channel))
    boost += 0.12
  if (input.contexts.includes('late-night') && (input.hostPersonModel?.recurrentBurdens.length ?? 0) > 0)
    boost += 0.08
  if ((input.relationshipDynamics?.sensibilityDelta ?? 0) > 0.05 && input.hasRepairEvent)
    boost += 0.04

  return Math.max(0, Math.min(0.3, boost))
}

function buildRememberedProcedures(
  sanitizeTextLike: (raw: unknown, fallback?: string) => string,
  goalText: string,
  hostPersonModel: ReturnType<typeof buildHostPersonModelSnapshot> | null,
  relationshipDynamics: AlicizationRelationshipDynamicsState | null,
  records: Awaited<ReturnType<AlicizationExecutorRuntimeDbPort['searchMemoryConsolidations']>>,
) {
  const contexts = inferPlanningHostContexts(goalText)
  return records
    .filter(record => record.kind === 'procedural' || (record.kind === 'autobiographical' && record.facet === 'task-era'))
    .map((record) => {
      const preferred = inferPreferredProcedureChannel({
        metadata: record.metadata,
      })
      const preferenceBoost = computeRememberedProcedureHostPreferenceBoost({
        contexts,
        relationshipDynamics,
        hostPersonModel,
        channel: preferred?.channel ?? null,
      })
      return {
        record,
        preferred,
        preferenceBoost,
      }
    })
    .sort((left, right) => (right.record.confidence + right.preferenceBoost) - (left.record.confidence + left.preferenceBoost))
    .map((record) => {
      return {
        id: record.record.id,
        sourceKind: record.record.kind === 'procedural' ? 'procedural' as const : 'autobiographical' as const,
        facet: record.record.facet ?? null,
        label: sanitizeTextLike(record.record.periodKey) || sanitizeTextLike(record.record.summary),
        approach: sanitizeTextLike(record.record.lesson) || sanitizeTextLike(record.record.summary),
        pitfalls: [],
        situation: null,
        steps: [],
        failurePoints: [],
        repairMoves: [],
        result: null,
        traceSummary: sanitizeTextLike(record.record.summary) || sanitizeTextLike(record.record.lesson),
        lastExperiencedAt: record.record.periodEndedAt,
        confidence: Math.max(0, Math.min(1, record.record.confidence + record.preferenceBoost)),
        cues: [...new Set([
          ...(record.record.cues ?? []).map(cue => sanitizeTextLike(cue)),
          ...contexts,
        ].filter(Boolean))].slice(0, 6),
        preferredChannel: record.preferred?.channel ?? null,
        preferredChannelReason: record.preferred?.reason
          ? `${record.preferred.reason}${record.preferenceBoost > 0 ? ':host-context-biased' : ''}`
          : record.preferenceBoost > 0
            ? 'host-context-biased-procedure'
            : null,
      }
    })
    .filter(item => item.label && item.approach)
    .slice(0, 4)
}

export function createAlicizationExecutorRuntime(options: AlicizationExecutorRuntimeOptions) {
  const executionCapabilityProbeCache = new Map<string, {
    checkedAt: number
    ready: boolean
  }>()
  const taskExecutionGovernor = createTaskExecutionGovernor()
  const inFlightTaskThreadResumes = new Map<
    string,
    Promise<MainGatewayExecutionTaskThreadResult>
  >()
  const terminalTaskThreadStatuses = new Set<AlicizationTaskThreadStatus>([
    'blocked',
    'cancelled',
    'completed',
    'failed',
  ])

  async function persistBackgroundDispatchFailure(input: {
    action: 'dispatch-failed' | 'resume-dispatch-failed'
    error: unknown
    selectedChannel: AlicizationExecutionChannel | null
    threadId: string
  }) {
    const db = options.getAlicizationDb()
    const errorMessage = errorMessageFrom(input.error) ?? 'Background task-thread dispatch failed.'
    const rawErrorCode = input.error && typeof input.error === 'object' && 'code' in input.error
      ? (input.error as { code?: unknown }).code
      : undefined
    const errorCode = typeof rawErrorCode === 'string' && rawErrorCode.trim()
      ? rawErrorCode.trim()
      : 'TASK_THREAD_BACKGROUND_DISPATCH_FAILED'
    const failedAt = Date.now()
    const currentThread = await db.getTaskThread(input.threadId).catch(() => undefined)
    if (!currentThread) {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.executor.background-dispatch',
        action: input.action,
        message: 'Background task-thread dispatch failed and its thread could not be reloaded.',
        payload: {
          threadId: input.threadId,
          selectedChannel: input.selectedChannel,
          errorCode,
          errorMessage,
        },
      }).catch(() => {})
      return
    }

    if (terminalTaskThreadStatuses.has(currentThread.status)) {
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.executor.background-dispatch',
        action: `${input.action}-already-settled`,
        message: 'Ignored a late background dispatch rejection because the task thread was already terminal.',
        payload: {
          threadId: currentThread.id,
          selectedChannel: currentThread.selectedChannel ?? input.selectedChannel,
          threadStatus: currentThread.status,
          errorCode,
          errorMessage,
        },
      }).catch(() => {})
      return
    }

    const summary = `${currentThread.selectedChannel ?? input.selectedChannel ?? 'executor'} background dispatch failed: ${errorMessage}`
    const failureEvent: AlicizationExecutionEventInput = {
      id: `${currentThread.id}:${input.action}`,
      threadId: currentThread.id,
      decisionTraceId: currentThread.decisionTraceId,
      turnId: currentThread.turnId,
      sessionId: currentThread.sessionId,
      origin: currentThread.origin,
      channel: currentThread.selectedChannel ?? input.selectedChannel,
      kind: 'result',
      threadStatus: 'failed',
      payload: {
        failureKind: 'tool-execution',
        errorCode,
        errorMessage,
        backgroundDispatch: true,
      },
      createdAt: failedAt,
    }
    let eventPersistenceError: string | null = null
    await db.appendExecutionEvents([failureEvent]).catch((error) => {
      eventPersistenceError = errorMessageFrom(error) ?? 'execution-event-persistence-failed'
    })
    let threadPersistenceError: string | null = null
    await db.upsertTaskThread({
      ...currentThread,
      status: 'failed',
      summary,
      updatedAt: Math.max(currentThread.updatedAt, failedAt),
      lastEventAt: failedAt,
      completedAt: failedAt,
    }).catch((error) => {
      threadPersistenceError = errorMessageFrom(error) ?? 'task-thread-persistence-failed'
    })
    await options.appendAuditLog({
      level: eventPersistenceError || threadPersistenceError ? 'critical' : 'warning',
      category: 'alicization.executor.background-dispatch',
      action: input.action,
      message: 'Background task-thread dispatch failed after the Provider accepted the task.',
      payload: {
        threadId: currentThread.id,
        selectedChannel: currentThread.selectedChannel ?? input.selectedChannel,
        errorCode,
        errorMessage,
        eventPersistenceError,
        threadPersistenceError,
      },
    }).catch(() => {})
  }

  async function probeBinaryReady(binary: string) {
    const cached = executionCapabilityProbeCache.get(binary)
    const nowTs = Date.now()
    if (cached && nowTs - cached.checkedAt <= executionCapabilityProbeTtlMs)
      return cached.ready

    const resolved = Boolean(await locateAlicizationExecutionBinary(binary, {
      pathValue: typeof env.PATH === 'string' ? env.PATH : '',
      platform,
    }))

    executionCapabilityProbeCache.set(binary, {
      ready: resolved,
      checkedAt: nowTs,
    })
    return resolved
  }

  async function recordCapabilityProbeFailure(input: {
    channel: AlicizationExecutionChannel | 'local'
    error: unknown
    source: CapabilityManifestSnapshotSource
  }) {
    const reason = errorMessageFrom(input.error) ?? 'unknown-error'
    await options.appendAuditLog({
      level: 'warning',
      category: 'alicization.executor.capability-manifest',
      action: 'probe-failed',
      message: 'Failed to refresh executor capability manifest snapshot.',
      payload: {
        source: input.source,
        channel: input.channel,
        reason,
      },
    }).catch(() => {})
    return reason
  }

  async function resolveBinaryCapabilityProbe(
    binary: 'codex' | 'claude',
    source: CapabilityManifestSnapshotSource,
  ) {
    try {
      return {
        ready: await probeBinaryReady(binary),
        reason: null,
      }
    }
    catch (error) {
      const errorReason = await recordCapabilityProbeFailure({
        channel: binary === 'claude' ? 'claude-code' : 'codex',
        error,
        source,
      })
      return {
        ready: false,
        reason: `${binary}-capability-probe-failed: ${errorReason}`,
      }
    }
  }

  async function resolveLocalCapabilityProbe(source: CapabilityManifestSnapshotSource) {
    if (!options.resolveLocalCapabilityChannels)
      return []
    try {
      return await options.resolveLocalCapabilityChannels()
    }
    catch (error) {
      await recordCapabilityProbeFailure({
        channel: 'local',
        error,
        source,
      })
      return []
    }
  }

  async function resolveOpenClawCapabilityProbe(source: CapabilityManifestSnapshotSource) {
    try {
      return await probeOpenClawCapability()
    }
    catch (error) {
      const errorReason = await recordCapabilityProbeFailure({
        channel: 'openclaw',
        error,
        source,
      })
      return {
        channel: 'openclaw',
        available: false,
        enabled: false,
        ready: false,
        sessionAffinity: true,
        reason: `openclaw-capability-probe-failed: ${errorReason}`,
      } satisfies AlicizationChannelCapability
    }
  }

  async function resolveDefaultPlanningCapabilities() {
    const [codexReady, claudeReady, openClawCapability, localCapabilities] = await Promise.all([
      resolveBinaryCapabilityProbe('codex', 'runtime-default-probe'),
      resolveBinaryCapabilityProbe('claude', 'runtime-default-probe'),
      resolveOpenClawCapabilityProbe('runtime-default-probe'),
      resolveLocalCapabilityProbe('runtime-default-probe'),
    ])

    const defaults = [
      {
        channel: 'cli',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: false,
        reason: null,
      },
      {
        channel: 'codex',
        available: codexReady.ready,
        enabled: codexReady.ready,
        ready: codexReady.ready,
        sessionAffinity: true,
        reason: codexReady.ready ? null : codexReady.reason ?? 'codex-binary-missing',
      },
      {
        channel: 'claude-code',
        available: claudeReady.ready,
        enabled: claudeReady.ready,
        ready: claudeReady.ready,
        sessionAffinity: true,
        reason: claudeReady.ready ? null : claudeReady.reason ?? 'claude-cli-binary-missing',
      },
      ...expandOpenClawBackedCapabilities(openClawCapability),
      {
        channel: 'openfang',
        available: false,
        enabled: false,
        ready: false,
        sessionAffinity: true,
        reason: 'adapter-not-configured',
      },
    ] satisfies AlicizationChannelCapability[]

    return mergeExecutionCapabilities(defaults, localCapabilities)
  }

  async function resolveDefaultPromptCapabilities() {
    const [codexReady, claudeReady, openClawCapability, localCapabilities] = await Promise.all([
      resolveBinaryCapabilityProbe('codex', 'runtime-default-probe'),
      resolveBinaryCapabilityProbe('claude', 'runtime-default-probe'),
      resolveOpenClawCapabilityProbe('runtime-default-probe'),
      resolveLocalCapabilityProbe('runtime-default-probe'),
    ])

    const defaults = [
      {
        channel: 'cli',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: false,
        reason: null,
      },
      {
        channel: 'codex',
        available: codexReady.ready,
        enabled: codexReady.ready,
        ready: codexReady.ready,
        sessionAffinity: true,
        reason: codexReady.ready ? null : codexReady.reason ?? 'codex-binary-missing',
      },
      {
        channel: 'claude-code',
        available: claudeReady.ready,
        enabled: claudeReady.ready,
        ready: claudeReady.ready,
        sessionAffinity: true,
        reason: claudeReady.ready ? null : claudeReady.reason ?? 'claude-cli-binary-missing',
      },
      ...expandOpenClawBackedCapabilities(openClawCapability),
      {
        channel: 'openfang',
        available: false,
        enabled: false,
        ready: false,
        sessionAffinity: true,
        reason: 'adapter-not-configured',
      },
    ] satisfies AlicizationChannelCapability[]

    return mergeExecutionCapabilities(defaults, localCapabilities)
  }

  async function persistCapabilityManifestSnapshot(
    capabilities: AlicizationChannelCapability[],
    source: CapabilityManifestSnapshotSource,
  ) {
    const checkedAt = Date.now()
    for (const capability of capabilities) {
      await options.getAlicizationDb().upsertChannelCapabilityManifest({
        ...capability,
        updatedAt: checkedAt,
        lastCheckedAt: checkedAt,
        metadata: {
          source,
        },
      }).catch(async (error) => {
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.executor.capability-manifest',
          action: 'upsert-failed',
          message: 'Failed to persist planning capability manifest snapshot.',
          payload: {
            source,
            channel: capability.channel,
            reason: errorMessageFrom(error) ?? 'unknown-error',
          },
        })
      })
    }
  }

  async function resolveTaskPlanningCapabilities(capabilities?: AlicizationChannelCapability[]) {
    const provided = Array.isArray(capabilities)
      ? capabilities
          .filter((item): item is AlicizationChannelCapability => Boolean(item && typeof item === 'object' && typeof item.channel === 'string'))
          .map(normalizePlanningCapability)
      : []

    if (provided.length > 0) {
      await persistCapabilityManifestSnapshot(provided, 'runtime-plan-payload')
      return provided
    }

    const persisted = await options.getAlicizationDb().listChannelCapabilityManifests({
      limit: 64,
    }).catch(async (error) => {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.executor.capability-manifest',
        action: 'list-failed',
        message: 'Failed to list capability manifests for task-thread planning fallback.',
        payload: {
          reason: errorMessageFrom(error) ?? 'unknown-error',
        },
      })
      return [] as AlicizationChannelCapabilityManifestRecord[]
    })
    if (areCapabilityManifestsFresh(persisted))
      return persisted.map(mapManifestToPlanningCapability)

    const defaults = await resolveDefaultPlanningCapabilities()
    await persistCapabilityManifestSnapshot(defaults, 'runtime-default-probe')
    return defaults
  }

  async function resolveExecutionCapabilitiesForPrompt() {
    const persisted = await options.getAlicizationDb().listChannelCapabilityManifests({
      limit: 64,
    }).catch(() => [] as AlicizationChannelCapabilityManifestRecord[])
    if (areCapabilityManifestsFresh(persisted))
      return persisted.map(mapManifestToPlanningCapability)
    const defaults = await resolveDefaultPromptCapabilities()
    await persistCapabilityManifestSnapshot(defaults, 'runtime-default-probe')
    return defaults
  }

  async function planTaskThread(input: AlicizationTaskExecutionGovernorPlanningInput & {
    killSwitchSuspended?: boolean
  }) {
    const db = options.getAlicizationDb()
    const planningNow = Number.isFinite(input.now) ? Number(input.now) : Date.now()
    const [recentEpisodicEvents, relationshipDynamics] = await Promise.all([
      db.listRecentEpisodicEvents(24).catch(() => []),
      db.getLatestRelationshipDynamics().catch(() => null),
    ])
    const hostPersonModel = recentEpisodicEvents.length > 0
      ? buildHostPersonModelSnapshot({
          events: recentEpisodicEvents,
          facts: [],
          relationshipDynamics,
          now: planningNow,
        })
      : null
    const planningContexts = inferPlanningHostContexts(input.task.goal)
    const procedureQuery = [
      input.task.goal,
      ...buildHostProcedureHints({
        contexts: planningContexts,
        relationshipDynamics,
        hostPersonModel,
      }).slice(0, 4),
    ].filter(Boolean).join(' ')
    const proceduralMemories = await db.searchMemoryConsolidations({
      query: procedureQuery,
      limit: 6,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: [input.task.goal, ...planningContexts],
        rationale: 'recall:execution-procedure',
        confidence: 0.84,
      },
    }).catch(() => [])
    const rememberedExecutionTraces = await buildRememberedProcedureTracesFromExecution({
      db,
      goalText: input.task.goal,
      contexts: planningContexts,
      hostPersonModel,
      relationshipDynamics,
    })
    const rememberedProcedures = [
      ...rememberedExecutionTraces,
      ...buildRememberedProcedures(
        options.sanitizeText,
        input.task.goal,
        hostPersonModel,
        relationshipDynamics,
        proceduralMemories,
      ),
    ]
      .filter((item, index, items) => items.findIndex(entry => entry.id === item.id) === index)
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, 4)
    return await taskExecutionGovernor.plan(db, {
      ...input,
      experience: {
        ...input.experience,
        rememberedProcedures,
      },
    })
  }

  async function executeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    dispatchMode?: 'inline' | 'background'
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'localVisual' | 'openclaw'>
    task: AlicizationClawTaskIntent
    abortSignal?: AbortSignal
    onExecutionEvent?: (event: AlicizationExecutionEventInput) => Promise<void> | void
  }): Promise<MainGatewayExecutionTaskThreadResult> {
    const killSwitchSuspended = options.getGlobalKillSwitchState() === 'SUSPENDED'
      || options.getCardKillSwitchState(input.context.cardId) === 'SUSPENDED'
    const sessionId = await options.ensureSessionId(input.context.cardId).catch(() => '')
    const capabilities = await resolveTaskPlanningCapabilities()
    const db = options.getAlicizationDb()
    const planning = await planTaskThread({
      canonicalToolCallId: options.sanitizeText(input.context.toolCallId) || null,
      threadId: `thread:tool:${randomUUID()}`,
      trace: {
        decisionTraceId: options.sanitizeText(input.context.decisionTraceId) || null,
        turnId: options.sanitizeText(input.context.turnId) || null,
        sessionId: options.normalizeSessionId(sessionId) || null,
        origin: 'user-turn',
      },
      task: input.task,
      capabilities,
      killSwitchSuspended,
    })

    if (planning.governor.disposition === 'duplicate') {
      return {
        ok: false,
        stage: 'plan',
        thread: planning.thread,
        plan: planning.plan,
        summary: planning.thread.summary ?? 'task-thread:duplicate',
        createdEventKinds: planning.createdEventKinds,
      }
    }

    if (planning.plan.state !== 'routed' || !planning.thread.selectedChannel) {
      return {
        ok: false,
        stage: 'plan',
        thread: planning.thread,
        plan: planning.plan,
        summary: planning.thread.summary ?? (planning.plan.narrative.join(' ').trim() || 'task-thread:not-routed'),
      }
    }

    const resultDeliveryMode: 'inline' | 'callback' = input.dispatchMode === 'background'
      ? 'callback'
      : 'inline'
    const dispatch = withDispatchResultDeliveryMode(input.dispatch, resultDeliveryMode)
    const dispatchInvocation = {
      resultDeliveryMode,
      port: {
        getTaskThread: db.getTaskThread,
        upsertTaskThread: db.upsertTaskThread,
        upsertExecutorSession: db.upsertExecutorSession,
        appendExecutionEvents: db.appendExecutionEvents,
        appendAuditLog: options.appendAuditLog,
      },
      input: {
        threadId: planning.thread.id,
        cli: dispatch.cli,
        codex: dispatch.codex,
        claudeCode: dispatch.claudeCode,
        localVisual: dispatch.localVisual,
        openclaw: dispatch.openclaw,
        killSwitchSuspended,
        ...(input.dispatchMode === 'background'
          ? {}
          : {
              // Keep the Provider's original signal at the resume adapter
              // boundary, but enforce the execution-surface deadline at the
              // actual task-thread dispatcher.
              abortSignal: combineAbortSignals([
                input.abortSignal,
                input.context.abortSignal,
              ]),
              onExecutionEvent: input.onExecutionEvent,
            }),
      },
    }

    if (input.dispatchMode === 'background') {
      void options.dispatchTaskThread(dispatchInvocation).catch(async error => await persistBackgroundDispatchFailure({
        action: 'dispatch-failed',
        error,
        selectedChannel: planning.thread.selectedChannel,
        threadId: planning.thread.id,
      }))
      return {
        accepted: true,
        ok: true,
        finalStatus: null,
        stage: 'dispatch',
        thread: planning.thread,
        plan: planning.plan,
        summary: `${planning.thread.selectedChannel} task accepted for background execution.`,
        output: null,
        createdEventKinds: planning.createdEventKinds,
      }
    }

    const dispatchResult = await options.dispatchTaskThread(dispatchInvocation)

    return {
      ok: dispatchResult.ok,
      finalStatus: dispatchResult.finalStatus,
      stage: 'dispatch',
      thread: dispatchResult.thread,
      plan: planning.plan,
      summary: dispatchResult.summary,
      output: dispatchResult.output ?? null,
      errorCode: dispatchResult.errorCode,
      errorMessage: dispatchResult.errorMessage,
      createdEventKinds: dispatchResult.createdEventKinds,
    }
  }

  function buildResumeDispatchPayload(input: {
    thread: {
      goal: string
      kind: string
      proposedChannel: string | null
      selectedChannel: string | null
      summary: string | null
      metadata?: AlicizationTaskThreadRecord['metadata']
    } | null | undefined
  }) {
    const thread = input.thread
    if (!thread)
      return null

    const resumeChannel = thread.selectedChannel ?? thread.proposedChannel
    const goal = options.sanitizeText(thread.goal) || 'the current task'
    const summary = options.sanitizeText(thread.summary) || 'none'
    const failureTransparency = 'failure-transparency:required'
    const instruction = `Continue the already-confirmed task directly.\nGoal: ${goal}\nSummary: ${summary}\n${failureTransparency}`

    if (resumeChannel === 'codex') {
      return {
        codex: {
          prompt: thread.kind === 'codebase-edit'
            ? `${instruction}\nMake the code change now.`
            : `${instruction}\nUse read-only investigation mode.`,
          sandbox: thread.kind === 'codebase-edit' ? 'workspace-write' as const : 'read-only' as const,
        },
      }
    }
    if (resumeChannel === 'claude-code') {
      return {
        claudeCode: {
          prompt: thread.kind === 'codebase-edit'
            ? `${instruction}\nMake the code change now.`
            : `${instruction}\nUse investigation mode.`,
          allowTools: thread.kind === 'codebase-edit',
          permissionMode: thread.kind === 'codebase-edit' ? 'acceptEdits' as const : 'plan' as const,
        },
      }
    }
    if (resumeChannel === 'openclaw') {
      return {
        openclaw: {
          instruction,
        },
      }
    }
    if (resumeChannel === 'browser' || resumeChannel === 'software' || resumeChannel === 'desktop') {
      return {
        localVisual: {
          instruction,
        },
      }
    }
    return null
  }

  function promoteApprovedTaskMetadata(input: {
    metadata: AlicizationTaskThreadRecord['metadata']
  }) {
    const metadata = input.metadata && typeof input.metadata === 'object'
      ? input.metadata
      : {}
    const taskMetadata = metadata.task && typeof metadata.task === 'object'
      ? metadata.task as Record<string, unknown>
      : {}

    return {
      ...metadata,
      task: {
        ...taskMetadata,
        permissionMode: 'explicit',
      },
    }
  }

  function readResumeRecord(raw: unknown): Record<string, unknown> {
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {}
  }

  function readResumeStringArray(raw: unknown) {
    return Array.isArray(raw)
      ? raw.map(value => options.sanitizeText(value)).filter(Boolean)
      : []
  }

  function buildConfirmedResumeExecutionEvent(input: {
    originalThread: AlicizationTaskThreadRecord
    resumeChannel: NonNullable<AlicizationTaskThreadRecord['selectedChannel']>
    resumableThread: AlicizationTaskThreadRecord
  }): AlicizationExecutionEventInput {
    const originalMetadata = readResumeRecord(input.originalThread.metadata)
    const resumableMetadata = readResumeRecord(input.resumableThread.metadata)
    const originalTaskMetadata = readResumeRecord(originalMetadata.task)
    const resumableTaskMetadata = readResumeRecord(resumableMetadata.task)
    const fabricMetadata = readResumeRecord(originalMetadata.fabric)

    return {
      threadId: input.resumableThread.id,
      decisionTraceId: input.originalThread.decisionTraceId,
      turnId: input.originalThread.turnId,
      sessionId: input.originalThread.sessionId,
      origin: input.originalThread.origin,
      channel: input.resumeChannel,
      kind: 'resume',
      threadStatus: input.resumableThread.status,
      payload: {
        approval: 'host-confirmed',
        previousStatus: input.originalThread.status,
        resumedStatus: input.resumableThread.status,
        previousPermissionMode: options.sanitizeText(originalTaskMetadata.permissionMode) || null,
        permissionMode: options.sanitizeText(resumableTaskMetadata.permissionMode) || 'explicit',
        effect: options.sanitizeText(originalTaskMetadata.effect) || null,
        riskBudget: options.sanitizeText(originalTaskMetadata.riskBudget) || null,
        justification: options.sanitizeText(originalTaskMetadata.justification) || null,
        affirmationReasonCodes: readResumeStringArray(fabricMetadata.affirmationReasonCodes),
        confirmationBoundary: 'host-confirmed-before-redispatch',
        auditability: 'resume-before-dispatch',
        interruptibility: 'process-not-yet-restarted',
      },
      createdAt: Date.now(),
    }
  }

  async function resumeMainGatewayTaskThreadOnce(input: {
    context: MainGatewayExecutionToolContext
    dispatchMode?: 'inline' | 'background'
    expectedChannel: AlicizationExecutionChannel
    threadId: string
    abortSignal?: AbortSignal
    onExecutionEvent?: (event: AlicizationExecutionEventInput) => Promise<void> | void
  }): Promise<MainGatewayExecutionTaskThreadResult> {
    if (!input.expectedChannel) {
      return {
        ok: false,
        stage: 'dispatch',
        thread: {
          id: input.threadId,
          selectedChannel: null,
          status: 'failed',
        },
        plan: {
          state: 'blocked',
        },
        summary: 'task-thread-resume:channel-required',
        errorCode: 'TASK_THREAD_RESUME_CHANNEL_REQUIRED',
        errorMessage: 'Task thread resume requires an expected execution channel.',
      }
    }

    const db = options.getAlicizationDb()
    const originalThread = await db.getTaskThread(input.threadId).catch(() => undefined)
    if (!originalThread) {
      return {
        ok: false,
        stage: 'dispatch',
        thread: {
          id: input.threadId,
          selectedChannel: null,
          status: 'failed',
        },
        plan: {
          state: 'blocked',
        },
        summary: `Task thread "${input.threadId}" was not found for resume.`,
        errorCode: 'TASK_THREAD_NOT_FOUND',
        errorMessage: 'The pending affirmation task thread no longer exists.',
      }
    }

    const resumeChannel = originalThread.selectedChannel ?? originalThread.proposedChannel
    if (!resumeChannel) {
      return {
        ok: false,
        stage: 'dispatch',
        thread: originalThread,
        plan: {
          state: 'blocked',
        },
        summary: 'task-thread-resume:channel-missing',
        errorCode: 'TASK_THREAD_RESUME_CHANNEL_MISSING',
        errorMessage: 'No structured channel is available for resume.',
      }
    }

    if (resumeChannel !== input.expectedChannel) {
      return {
        ok: false,
        stage: 'dispatch',
        thread: originalThread,
        plan: {
          state: 'blocked',
          proposedChannel: resumeChannel,
        },
        summary: `Task thread belongs to ${resumeChannel}; ${input.expectedChannel} resume was rejected.`,
        errorCode: 'TASK_THREAD_RESUME_CHANNEL_MISMATCH',
        errorMessage: `This task thread belongs to ${resumeChannel} and cannot be resumed through ${input.expectedChannel}.`,
      }
    }

    const resumeDispatch = buildResumeDispatchPayload({
      thread: originalThread,
    })
    if (!resumeDispatch) {
      return {
        ok: false,
        stage: 'dispatch',
        thread: originalThread,
        plan: {
          state: 'blocked',
          proposedChannel: resumeChannel,
        },
        summary: `Task thread resume is not supported yet for channel ${resumeChannel}.`,
        errorCode: 'TASK_THREAD_RESUME_UNSUPPORTED_CHANNEL',
        errorMessage: `Resume is not supported for ${resumeChannel}.`,
      }
    }

    if (input.abortSignal?.aborted) {
      return {
        ok: false,
        finalStatus: 'cancelled',
        stage: 'dispatch',
        thread: originalThread,
        plan: {
          state: 'blocked',
          proposedChannel: resumeChannel,
        },
        summary: `Task thread resume was cancelled before ${resumeChannel} redispatch.`,
        errorCode: 'TASK_THREAD_RESUME_ABORTED',
        errorMessage: resolveAbortMessage(
          input.abortSignal,
          'Task thread resume was cancelled before redispatch.',
        ),
        createdEventKinds: [],
      }
    }

    const resumableThread = originalThread.status === 'needs-affirmation'
      ? await db.upsertTaskThread({
          ...originalThread,
          selectedChannel: resumeChannel,
          status: 'planned',
          metadata: promoteApprovedTaskMetadata({
            metadata: originalThread.metadata,
          }),
          updatedAt: Date.now(),
        })
      : originalThread

    if (originalThread.status === 'needs-affirmation') {
      await db.appendExecutionEvents([
        buildConfirmedResumeExecutionEvent({
          originalThread,
          resumeChannel,
          resumableThread,
        }),
      ])
    }

    const killSwitchSuspended = options.getGlobalKillSwitchState() === 'SUSPENDED'
      || options.getCardKillSwitchState(input.context.cardId) === 'SUSPENDED'
    const resultDeliveryMode: 'inline' | 'callback' = input.dispatchMode === 'background'
      ? 'callback'
      : 'inline'
    const dispatch = withDispatchResultDeliveryMode(resumeDispatch, resultDeliveryMode)
    const dispatchInvocation = {
      resultDeliveryMode,
      port: {
        getTaskThread: db.getTaskThread,
        upsertTaskThread: db.upsertTaskThread,
        upsertExecutorSession: db.upsertExecutorSession,
        appendExecutionEvents: db.appendExecutionEvents,
        appendAuditLog: options.appendAuditLog,
      },
      input: {
        threadId: resumableThread.id,
        ...dispatch,
        killSwitchSuspended,
        ...(input.dispatchMode === 'background'
          ? {}
          : {
              abortSignal: input.abortSignal,
              onExecutionEvent: input.onExecutionEvent,
            }),
      },
    }

    if (input.dispatchMode === 'background') {
      void options.dispatchTaskThread(dispatchInvocation).catch(async error => await persistBackgroundDispatchFailure({
        action: 'resume-dispatch-failed',
        error,
        selectedChannel: resumeChannel,
        threadId: resumableThread.id,
      }))
      return {
        accepted: true,
        ok: true,
        finalStatus: null,
        stage: 'dispatch',
        thread: resumableThread,
        plan: {
          state: 'routed',
          proposedChannel: resumeChannel,
        },
        summary: `${resumeChannel} task resumed for background execution.`,
        output: null,
        createdEventKinds: originalThread.status === 'needs-affirmation'
          ? ['resume']
          : [],
      }
    }

    const dispatchResult = await options.dispatchTaskThread(dispatchInvocation)

    return {
      ok: dispatchResult.ok,
      finalStatus: dispatchResult.finalStatus,
      stage: 'dispatch',
      thread: dispatchResult.thread,
      plan: {
        state: 'routed',
        proposedChannel: resumeChannel,
      },
      summary: dispatchResult.summary,
      output: dispatchResult.output ?? null,
      errorCode: dispatchResult.errorCode,
      errorMessage: dispatchResult.errorMessage,
      createdEventKinds: dispatchResult.createdEventKinds,
    }
  }

  function resumeMainGatewayTaskThread(
    input: Parameters<typeof resumeMainGatewayTaskThreadOnce>[0],
  ) {
    if (!input.expectedChannel)
      return resumeMainGatewayTaskThreadOnce(input)

    const threadId = input.threadId.trim()
    const inFlightKey = `${threadId}:${input.expectedChannel}`
    const inFlight = inFlightTaskThreadResumes.get(inFlightKey)
    if (inFlight)
      return inFlight

    const resume = resumeMainGatewayTaskThreadOnce(input)
    inFlightTaskThreadResumes.set(inFlightKey, resume)
    void resume.finally(() => {
      if (inFlightTaskThreadResumes.get(inFlightKey) === resume)
        inFlightTaskThreadResumes.delete(inFlightKey)
    }).catch(() => {})
    return resume
  }

  return {
    executeMainGatewayTaskThread,
    planTaskThread,
    resumeMainGatewayTaskThread,
    resolveExecutionCapabilitiesForPrompt,
    resolveTaskPlanningCapabilities,
  }
}
