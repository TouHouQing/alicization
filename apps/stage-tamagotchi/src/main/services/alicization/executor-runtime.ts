import type {
  AlicizationAuditLogInput,
  AlicizationChannelCapability,
  AlicizationChannelCapabilityManifestRecord,
  AlicizationClawTaskIntent,
  AlicizationDispatchTaskThreadPayload,
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationDbService } from './db'
import type { MainGatewayExecutionTaskThreadResult, MainGatewayExecutionToolContext } from './main-chat-execution-surface'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'
import type { AlicizationTaskRoutingAssessment } from './task-execution-governor'
import type { AlicizationTaskThreadPlanningInput } from './task-thread-governor'
import type { AlicizationTaskThreadDispatchInvocation } from './task-thread-orchestrator'

import { randomUUID } from 'node:crypto'
import { env, platform } from 'node:process'

import { errorMessageFrom } from '@moeru/std'
import { analyzeAlicizationExecutionSemanticSignals } from '@proj-alicization/stage-shared'

import { locateAlicizationExecutionBinary } from './execution-command-env'
import { expandOpenClawBackedCapabilities } from './executor-adapters/embodied-channel'
import { probeOpenClawCapability, readOpenClawCapabilitySnapshot } from './executor-adapters/openclaw'
import { buildHostPersonModelSnapshot } from './humanlike-memory'
import { readExecutionOutcome, readLatestExecutionEvent, readTaskThreadActivityAt, sanitizeExecutionLedgerText } from './execution-ledger-shared'
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
    createdEventKinds?: string[]
    errorCode?: string
    errorMessage?: string
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
  assessTaskRouting?: (input: {
    task: AlicizationTaskThreadPlanningInput['task']
    capabilities: AlicizationTaskThreadPlanningInput['capabilities']
    activeThreads: AlicizationTaskThreadRecord[]
    settledThreads: AlicizationTaskThreadRecord[]
  }) => AlicizationTaskRoutingAssessment | null | Promise<AlicizationTaskRoutingAssessment | null>
  sanitizeText: (raw: unknown, fallback?: string) => string
}

const executionCapabilityProbeTtlMs = 45_000

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

function inferPreferredProcedureChannel(text: string) {
  const semanticSignals = analyzeAlicizationExecutionSemanticSignals(text)
  const mentionedChannel = semanticSignals.mentionedChannels.find(channel =>
    channel === 'cli'
    || channel === 'codex'
    || channel === 'claude-code'
    || channel === 'openclaw',
  )
  if (mentionedChannel) {
    return {
      channel: mentionedChannel,
      reason: `remembered-procedure-mentioned-channel:${mentionedChannel}`,
    } as const
  }

  if (/terminal|shell|command|cli|补丁|patch|verify|测试|test/iu.test(text)) {
    return {
      channel: 'cli' as const,
      reason: 'remembered-procedure-cli-shape',
    }
  }
  if (/codex/iu.test(text)) {
    return {
      channel: 'codex' as const,
      reason: 'remembered-procedure-codex-shape',
    }
  }
  if (/claude[- ]?code|claude code/iu.test(text)) {
    return {
      channel: 'claude-code' as const,
      reason: 'remembered-procedure-claude-shape',
    }
  }
  if (/browser|page|tab|screen|desktop|window|click/iu.test(text)) {
    return {
      channel: 'openclaw' as const,
      reason: 'remembered-procedure-openclaw-shape',
    }
  }

  return null
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
      /failed|blocked|cancelled/iu.test(thread.status)
        ? normalizeHintText(thread.summary, 180)
        : '',
    ].filter(Boolean).slice(0, 3)
    const repairMoves = orderedEvents
      .filter(event => event.kind === 'resume' || event.kind === 'takeover' || /verify|repair|fix|retry|resume|repair/iu.test(extractExecutionEventStep(event)))
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
    const procedureText = [
      thread.goal,
      thread.summary ?? '',
      result,
      ...eventSteps,
      ...failurePoints,
      ...repairMoves,
      lesson,
    ].join(' ')
    const preferenceBoost = computeRememberedProcedureHostPreferenceBoost({
      procedureText,
      contexts: input.contexts,
      relationshipDynamics: input.relationshipDynamics,
      hostPersonModel: input.hostPersonModel,
    })
    const preferred = inferPreferredProcedureChannel(procedureText)
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
  if (input.relationshipDynamics?.hostAttitude)
    hints.push(input.relationshipDynamics.hostAttitude)
  return [...new Set(hints.map(item => normalizeHintText(item)).filter(Boolean))].slice(0, 12)
}

function computeRememberedProcedureHostPreferenceBoost(input: {
  procedureText: string
  contexts: string[]
  relationshipDynamics: AlicizationRelationshipDynamicsState | null
  hostPersonModel: ReturnType<typeof buildHostPersonModelSnapshot> | null
}) {
  const text = input.procedureText.toLowerCase()
  let boost = 0

  const trustStage = input.hostPersonModel?.trustLadder.stage ?? 'cautious-open'
  if ((trustStage === 'guarded' || trustStage === 'cautious-open') && /verify|bounded|consent|lighter|space|room|quiet|repair/iu.test(text))
    boost += 0.12
  if ((trustStage === 'warming' || trustStage === 'trusted') && /direct|warm|follow through|keep going|continue/iu.test(text))
    boost += 0.08
  if (input.contexts.includes('focused-work') && /verify|quiet|space|bounded|patch|test|cli|codex|claude/iu.test(text))
    boost += 0.12
  if (input.contexts.includes('late-night') && /rest|gentle|lighter|wait|quiet/iu.test(text))
    boost += 0.1
  if (input.relationshipDynamics?.hostAttitude && /focus|观察|谨慎|克制|space|pressure/iu.test(input.relationshipDynamics.hostAttitude) && /lighter|verify|space|quiet/iu.test(text))
    boost += 0.08

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
      const procedureText = [
        sanitizeTextLike(record.summary),
        sanitizeTextLike(record.lesson),
        ...(record.cues ?? []).map(cue => sanitizeTextLike(cue)),
      ].filter(Boolean).join(' ')
      const preferenceBoost = computeRememberedProcedureHostPreferenceBoost({
        procedureText,
        contexts,
        relationshipDynamics,
        hostPersonModel,
      })
      return {
        record,
        procedureText,
        preferenceBoost,
      }
    })
    .sort((left, right) => (right.record.confidence + right.preferenceBoost) - (left.record.confidence + left.preferenceBoost))
    .map((record) => {
      const preferred = inferPreferredProcedureChannel(record.procedureText)
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
        preferredChannel: preferred?.channel ?? null,
        preferredChannelReason: preferred?.reason
          ? `${preferred.reason}${record.preferenceBoost > 0 ? ':host-context-biased' : ''}`
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
  const taskExecutionGovernor = createTaskExecutionGovernor({
    assessTaskRouting: options.assessTaskRouting,
  })

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

  async function resolveDefaultPlanningCapabilities() {
    const [codexReady, claudeReady, openClawCapability] = await Promise.all([
      probeBinaryReady('codex'),
      probeBinaryReady('claude'),
      probeOpenClawCapability(),
    ])

    return [
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
        available: codexReady,
        enabled: codexReady,
        ready: codexReady,
        sessionAffinity: true,
        reason: codexReady ? null : 'codex-binary-missing',
      },
      {
        channel: 'claude-code',
        available: claudeReady,
        enabled: claudeReady,
        ready: claudeReady,
        sessionAffinity: true,
        reason: claudeReady ? null : 'claude-cli-binary-missing',
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
  }

  async function resolveDefaultPromptCapabilities() {
    const [codexReady, claudeReady] = await Promise.all([
      probeBinaryReady('codex'),
      probeBinaryReady('claude'),
    ])

    return [
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
        available: codexReady,
        enabled: codexReady,
        ready: codexReady,
        sessionAffinity: true,
        reason: codexReady ? null : 'codex-binary-missing',
      },
      {
        channel: 'claude-code',
        available: claudeReady,
        enabled: claudeReady,
        ready: claudeReady,
        sessionAffinity: true,
        reason: claudeReady ? null : 'claude-cli-binary-missing',
      },
      ...expandOpenClawBackedCapabilities(readOpenClawCapabilitySnapshot()),
      {
        channel: 'openfang',
        available: false,
        enabled: false,
        ready: false,
        sessionAffinity: true,
        reason: 'adapter-not-configured',
      },
    ] satisfies AlicizationChannelCapability[]
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
    if (persisted.length > 0)
      return persisted.map(mapManifestToPlanningCapability)

    const defaults = await resolveDefaultPlanningCapabilities()
    await persistCapabilityManifestSnapshot(defaults, 'runtime-default-probe')
    return defaults
  }

  async function resolveExecutionCapabilitiesForPrompt() {
    const persisted = await options.getAlicizationDb().listChannelCapabilityManifests({
      limit: 64,
    }).catch(() => [] as AlicizationChannelCapabilityManifestRecord[])
    if (persisted.length > 0)
      return persisted.map(mapManifestToPlanningCapability)
    return await resolveDefaultPromptCapabilities()
  }

  async function planTaskThread(input: AlicizationTaskThreadPlanningInput & {
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
        rationale: 'Remembered procedure should inform task planning before execution starts.',
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
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'openclaw'>
    task: AlicizationClawTaskIntent
  }): Promise<MainGatewayExecutionTaskThreadResult> {
    const killSwitchSuspended = options.getGlobalKillSwitchState() === 'SUSPENDED'
      || options.getCardKillSwitchState(input.context.cardId) === 'SUSPENDED'
    const sessionId = await options.ensureSessionId(input.context.cardId).catch(() => '')
    const capabilities = await resolveTaskPlanningCapabilities()
    const db = options.getAlicizationDb()
    const planning = await planTaskThread({
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
        summary: planning.thread.summary ?? 'Task thread planning collapsed into an existing active execution thread.',
        createdEventKinds: planning.createdEventKinds,
      }
    }

    if (planning.plan.state !== 'routed' || !planning.thread.selectedChannel) {
      return {
        ok: false,
        stage: 'plan',
        thread: planning.thread,
        plan: planning.plan,
        summary: planning.thread.summary ?? (planning.plan.narrative.join(' ').trim() || 'Task thread planning was not routed.'),
      }
    }

    const dispatchResult = await options.dispatchTaskThread({
      port: {
        getTaskThread: db.getTaskThread,
        upsertTaskThread: db.upsertTaskThread,
        upsertExecutorSession: db.upsertExecutorSession,
        appendExecutionEvents: db.appendExecutionEvents,
        appendAuditLog: options.appendAuditLog,
      },
      input: {
        threadId: planning.thread.id,
        cli: input.dispatch.cli,
        codex: input.dispatch.codex,
        claudeCode: input.dispatch.claudeCode,
        openclaw: input.dispatch.openclaw,
        killSwitchSuspended,
      },
    })

    return {
      ok: dispatchResult.ok,
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
    } | null | undefined
  }) {
    const thread = input.thread
    if (!thread)
      return null

    const resumeChannel = thread.selectedChannel ?? thread.proposedChannel
    const goal = options.sanitizeText(thread.goal) || 'the current task'
    if (resumeChannel === 'codex') {
      return {
        codex: {
          prompt: thread.kind === 'codebase-edit'
            ? `Continue the already-confirmed Alicization task directly and make the code change now.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}`
            : `Continue the already-confirmed Alicization task directly in read-only investigation mode.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}`,
          sandbox: thread.kind === 'codebase-edit' ? 'workspace-write' as const : 'read-only' as const,
        },
      }
    }
    if (resumeChannel === 'claude-code') {
      return {
        claudeCode: {
          prompt: thread.kind === 'codebase-edit'
            ? `Continue the already-confirmed Alicization task directly and make the code change now.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}`
            : `Continue the already-confirmed Alicization task directly in investigation mode.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}`,
          allowTools: thread.kind === 'codebase-edit',
          permissionMode: thread.kind === 'codebase-edit' ? 'acceptEdits' as const : 'plan' as const,
        },
      }
    }
    if (resumeChannel === 'openclaw') {
      return {
        openclaw: {
          instruction: `Continue the already-confirmed Alicization task directly.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}`,
        },
      }
    }
    return null
  }

  async function resumeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    threadId: string
  }): Promise<MainGatewayExecutionTaskThreadResult> {
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
        summary: 'Task thread cannot resume because no structured channel was preserved.',
        errorCode: 'TASK_THREAD_RESUME_CHANNEL_MISSING',
        errorMessage: 'No structured channel is available for resume.',
      }
    }

    const resumableThread = originalThread.status === 'needs-affirmation'
      ? await db.upsertTaskThread({
          ...originalThread,
          selectedChannel: resumeChannel,
          status: 'planned',
          updatedAt: Date.now(),
        })
      : originalThread

    const dispatch = buildResumeDispatchPayload({
      thread: resumableThread,
    })
    if (!dispatch) {
      return {
        ok: false,
        stage: 'dispatch',
        thread: resumableThread,
        plan: {
          state: 'blocked',
          proposedChannel: resumeChannel,
        },
        summary: `Task thread resume is not supported yet for channel ${resumeChannel}.`,
        errorCode: 'TASK_THREAD_RESUME_UNSUPPORTED_CHANNEL',
        errorMessage: `Resume is not supported for ${resumeChannel}.`,
      }
    }

    const killSwitchSuspended = options.getGlobalKillSwitchState() === 'SUSPENDED'
      || options.getCardKillSwitchState(input.context.cardId) === 'SUSPENDED'
    const dispatchResult = await options.dispatchTaskThread({
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
      },
    })

    return {
      ok: dispatchResult.ok,
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

  return {
    executeMainGatewayTaskThread,
    planTaskThread,
    resumeMainGatewayTaskThread,
    resolveExecutionCapabilitiesForPrompt,
    resolveTaskPlanningCapabilities,
  }
}
