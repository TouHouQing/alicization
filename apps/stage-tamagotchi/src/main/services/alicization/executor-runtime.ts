import type {
  AlicizationAuditLogInput,
  AlicizationChannelCapability,
  AlicizationChannelCapabilityManifestRecord,
  AlicizationClawTaskIntent,
  AlicizationDispatchTaskThreadPayload,
  AlicizationExecutionEventInput,
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
import {
  alicizationFixedTemplateReplacement,
  analyzeAlicizationExecutionSemanticSignals,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { locateAlicizationExecutionBinary } from './execution-command-env'
import { readExecutionOutcome, readLatestExecutionEvent, readTaskThreadActivityAt, sanitizeExecutionLedgerText } from './execution-ledger-shared'
import { expandOpenClawBackedCapabilities } from './executor-adapters/embodied-channel'
import { probeOpenClawCapability, readOpenClawCapabilitySnapshot } from './executor-adapters/openclaw'
import { buildHostPersonModelSnapshot } from './humanlike-memory'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
  resolveAlicizationProjectStatusBrief,
} from './project-state-brief'
import { createTaskExecutionGovernor } from './task-execution-governor'

type CapabilityManifestSnapshotSource = 'runtime-default-probe' | 'runtime-plan-payload'

function sanitizeExecutorProviderContextText(raw: unknown, maxChars = 320) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  return normalized && normalized !== alicizationFixedTemplateReplacement ? normalized : ''
}

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
  resolveLocalCapabilityChannels?: () => Promise<AlicizationChannelCapability[]>
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

export function inferPreferredProcedureChannel(text: string) {
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

  if (/\bterminal\b|\bshell\b|\bcommand\b|\bcli\b|补丁|\bpatch\b|\bverify\b|测试|\btest\b/iu.test(text)) {
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
  if (/browser|page|tab|url|link|search|网页|页面|标签页|浏览器/u.test(text)) {
    return {
      channel: 'browser' as const,
      reason: 'remembered-procedure-browser-shape',
    }
  }
  if (/desktop|window|dialog|file chooser|桌面|窗口|弹窗|对话框|文件选择/u.test(text)) {
    return {
      channel: 'desktop' as const,
      reason: 'remembered-procedure-desktop-shape',
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
    const [codexReady, claudeReady, openClawCapability, localCapabilities] = await Promise.all([
      probeBinaryReady('codex'),
      probeBinaryReady('claude'),
      probeOpenClawCapability(),
      options.resolveLocalCapabilityChannels?.().catch(() => []) ?? [],
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

    return mergeExecutionCapabilities(defaults, localCapabilities)
  }

  async function resolveDefaultPromptCapabilities() {
    const [codexReady, claudeReady, localCapabilities] = await Promise.all([
      probeBinaryReady('codex'),
      probeBinaryReady('claude'),
      options.resolveLocalCapabilityChannels?.().catch(() => []) ?? [],
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
    const projectStateBrief = resolveAlicizationProjectStateBrief()

    return await taskExecutionGovernor.plan(db, {
      ...input,
      experience: {
        ...input.experience,
        projectBriefing: {
          identity: projectStateBrief.identity,
          currentPhase: projectStateBrief.currentPhase,
          latestLandedProgress: projectStateBrief.continuityProgressSummary ?? projectStateBrief.latestProgress ?? null,
          primaryOpenLoop: projectStateBrief.openLoops[0] ?? projectStateBrief.primaryOpenLoop ?? null,
          nextClosureTarget: projectStateBrief.nextClosureTarget,
          sameHerSelfLine: projectStateBrief.sameHerSelfLine,
          sameHerHoldDetail: projectStateBrief.sameHerHoldDetail ?? null,
          sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
          proactiveSameHerGap: projectStateBrief.proactiveSameHerGap ?? null,
          continuityCue: projectStateBrief.continuityCue ?? null,
          preflightSummary: projectStateBrief.preflightSummary ?? null,
          preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
        },
        rememberedProcedures,
      },
    })
  }

  async function executeMainGatewayTaskThread(input: {
    context: MainGatewayExecutionToolContext
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'cli' | 'codex' | 'claudeCode' | 'localVisual' | 'openclaw'>
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
        localVisual: input.dispatch.localVisual,
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
      metadata?: AlicizationTaskThreadRecord['metadata']
    } | null | undefined
  }) {
    const thread = input.thread
    if (!thread)
      return null

    const resumeChannel = thread.selectedChannel ?? thread.proposedChannel
    const goal = options.sanitizeText(thread.goal) || 'the current task'
    const metadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
      ? thread.metadata as {
        execution?: {
          runtimeContext?: {
            projectBriefing?: {
              identity?: unknown
              currentPhase?: unknown
              latestLandedProgress?: unknown
              latestProgress?: unknown
              landedProgressSummary?: unknown
              primaryOpenLoop?: unknown
              openClosureSummary?: unknown
              nextClosureTarget?: unknown
              nextClosureTargetSummary?: unknown
              sameHerSelfLine?: unknown
              sameHerHoldDetail?: unknown
              sameHerDriftRisk?: unknown
              sameHerDriftRiskSummary?: unknown
              proactiveSameHerGap?: unknown
              continuityCue?: unknown
              preflightSummary?: unknown
              preDialogueAwarenessLine?: unknown
              preDialogueAwarenessSummary?: unknown
              companionHeadlineLine?: unknown
              companionBriefingLine?: unknown
              emotionalClosureCue?: unknown
              emotionalClosureSummary?: unknown
              continuityArcStage?: unknown
              continuityRestraint?: unknown
              continuityPreferredTiming?: unknown
              continuityCadence?: unknown
              preferredBlinkCadence?: unknown
              preferredGazeMode?: unknown
              preferredPauseMode?: unknown
              preferredLipsyncMode?: unknown
              preferredVoiceMode?: unknown
              preferredPacingMode?: unknown
            } | null
          } | null
        } | null
      }
      : null
    const storedProjectBriefing = metadata?.execution?.runtimeContext?.projectBriefing
    const fallbackProjectBrief = resolveAlicizationProjectStateBrief()
    const summaryAliasProjectBriefing = storedProjectBriefing as {
      latestProgress?: unknown
      landedProgressSummary?: unknown
      openClosureSummary?: unknown
      nextClosureTargetSummary?: unknown
      sameHerDriftRiskSummary?: unknown
    } | null
    const explicitLatestProgressInput = options.sanitizeText(
      storedProjectBriefing?.latestLandedProgress ?? summaryAliasProjectBriefing?.latestProgress,
    )
    const summaryLatestProgressInput = options.sanitizeText(summaryAliasProjectBriefing?.landedProgressSummary)
    const explicitPrimaryOpenLoopInput = options.sanitizeText(storedProjectBriefing?.primaryOpenLoop)
    const summaryPrimaryOpenLoopInput = options.sanitizeText(summaryAliasProjectBriefing?.openClosureSummary)
    const explicitNextClosureTargetInput = options.sanitizeText(storedProjectBriefing?.nextClosureTarget)
    const summaryNextClosureTargetInput = options.sanitizeText(summaryAliasProjectBriefing?.nextClosureTargetSummary)
    const explicitSameHerDriftRiskInput = options.sanitizeText(storedProjectBriefing?.sameHerDriftRisk)
    const summarySameHerDriftRiskInput = options.sanitizeText(summaryAliasProjectBriefing?.sameHerDriftRiskSummary)
    const normalizedProjectBriefing = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: storedProjectBriefing
        ? {
            identity: storedProjectBriefing.identity ?? null,
            currentPhase: storedProjectBriefing.currentPhase ?? null,
            latestLandedProgress: explicitLatestProgressInput || summaryLatestProgressInput || null,
            primaryOpenLoop: explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput || null,
            nextClosureTarget: explicitNextClosureTargetInput || summaryNextClosureTargetInput || null,
            sameHerSelfLine: storedProjectBriefing.sameHerSelfLine ?? null,
            sameHerHoldDetail: storedProjectBriefing.sameHerHoldDetail ?? null,
            sameHerDriftRisk: explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput || null,
            proactiveSameHerGap: storedProjectBriefing.proactiveSameHerGap ?? null,
            continuityCue: storedProjectBriefing.continuityCue ?? null,
            preflightSummary: storedProjectBriefing.preflightSummary ?? null,
            preDialogueAwarenessLine: storedProjectBriefing.preDialogueAwarenessLine ?? null,
            preDialogueAwarenessSummary: storedProjectBriefing.preDialogueAwarenessSummary ?? null,
            awarenessLine: storedProjectBriefing.preDialogueAwarenessLine ?? null,
            companionHeadlineLine: storedProjectBriefing.companionHeadlineLine ?? null,
            companionBriefingLine: storedProjectBriefing.companionBriefingLine ?? null,
            emotionalClosureCue:
              storedProjectBriefing.emotionalClosureCue
              ?? storedProjectBriefing.emotionalClosureSummary
              ?? null,
            emotionalClosureSummary: storedProjectBriefing.emotionalClosureSummary ?? null,
            continuityArcStage: storedProjectBriefing.continuityArcStage ?? null,
            continuityRestraint: storedProjectBriefing.continuityRestraint ?? null,
            continuityPreferredTiming: storedProjectBriefing.continuityPreferredTiming ?? null,
            continuityCadence: storedProjectBriefing.continuityCadence ?? null,
            preferredBlinkCadence: storedProjectBriefing.preferredBlinkCadence ?? null,
            preferredGazeMode: storedProjectBriefing.preferredGazeMode ?? null,
            preferredPauseMode: storedProjectBriefing.preferredPauseMode ?? null,
            preferredLipsyncMode: storedProjectBriefing.preferredLipsyncMode ?? null,
            preferredVoiceMode: storedProjectBriefing.preferredVoiceMode ?? null,
            preferredPacingMode: storedProjectBriefing.preferredPacingMode ?? null,
          }
        : null,
      fallbackProjectState: {
        identity: fallbackProjectBrief.identity,
        currentPhase: fallbackProjectBrief.currentPhase,
        latestLandedProgress: fallbackProjectBrief.continuityProgressSummary ?? fallbackProjectBrief.latestProgress ?? null,
        primaryOpenLoop: fallbackProjectBrief.openLoops[0] ?? fallbackProjectBrief.primaryOpenLoop ?? null,
        nextClosureTarget: fallbackProjectBrief.nextClosureTarget,
        sameHerSelfLine: fallbackProjectBrief.sameHerSelfLine,
        sameHerHoldDetail: fallbackProjectBrief.sameHerHoldDetail ?? null,
        sameHerDriftRisk: fallbackProjectBrief.sameHerDriftRisk,
        proactiveSameHerGap: fallbackProjectBrief.proactiveSameHerGap ?? null,
        continuityRestraint: fallbackProjectBrief.continuityRestraint ?? null,
        continuityCue: fallbackProjectBrief.continuityCue ?? null,
        preferredBlinkCadence: fallbackProjectBrief.preferredBlinkCadence ?? null,
        preferredGazeMode: fallbackProjectBrief.preferredGazeMode ?? null,
        preferredVoiceMode: fallbackProjectBrief.preferredVoiceMode ?? null,
        preferredPacingMode: fallbackProjectBrief.preferredPacingMode ?? null,
        preflightSummary: fallbackProjectBrief.preflightSummary ?? null,
        preDialogueAwarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
        awarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
      },
    })
    const projectIdentity = options.sanitizeText(normalizedProjectBriefing.identity) || fallbackProjectBrief.identity
    const projectPhase = options.sanitizeText(normalizedProjectBriefing.currentPhase) || fallbackProjectBrief.currentPhase
    const latestLandedProgress = (
      !explicitLatestProgressInput && summaryLatestProgressInput
        ? summaryLatestProgressInput
        : options.sanitizeText(normalizedProjectBriefing.latestLandedProgress ?? normalizedProjectBriefing.latestProgress)
    )
    || fallbackProjectBrief.continuityProgressSummary
    || fallbackProjectBrief.latestProgress
    || ''
    const primaryOpenLoop = (
      !explicitPrimaryOpenLoopInput && summaryPrimaryOpenLoopInput
        ? summaryPrimaryOpenLoopInput
        : options.sanitizeText(normalizedProjectBriefing.primaryOpenLoop)
    )
    || fallbackProjectBrief.openLoops[0]
    || fallbackProjectBrief.primaryOpenLoop
    || ''
    const nextClosureTarget = (
      !explicitNextClosureTargetInput && summaryNextClosureTargetInput
        ? summaryNextClosureTargetInput
        : options.sanitizeText(normalizedProjectBriefing.nextClosureTarget)
    ) || fallbackProjectBrief.nextClosureTarget
    const sameHerSelfLine = options.sanitizeText(normalizedProjectBriefing.sameHerSelfLine) || fallbackProjectBrief.sameHerSelfLine
    const continuityArcStage = options.sanitizeText(normalizedProjectBriefing.continuityArcStage)
      || options.sanitizeText(storedProjectBriefing?.continuityArcStage)
      || ''
    const proactiveSameHerGap = options.sanitizeText(normalizedProjectBriefing.proactiveSameHerGap)
      || options.sanitizeText((storedProjectBriefing as { proactiveSameHerGap?: unknown } | null)?.proactiveSameHerGap)
      || fallbackProjectBrief.proactiveSameHerGap
      || ''
    const continuityRestraint = options.sanitizeText(normalizedProjectBriefing.continuityRestraint)
      || options.sanitizeText(storedProjectBriefing?.continuityRestraint)
      || fallbackProjectBrief.continuityRestraint
      || ''
    const projectContinuity = options.sanitizeText(normalizedProjectBriefing.continuityCue)
      || options.sanitizeText(storedProjectBriefing?.continuityCue)
      || fallbackProjectBrief.continuityCue
      || ''
    const emotionalClosureSummary = options.sanitizeText(normalizedProjectBriefing.emotionalClosureSummary)
      || options.sanitizeText(storedProjectBriefing?.emotionalClosureSummary)
      || options.sanitizeText(storedProjectBriefing?.emotionalClosureCue)
      || fallbackProjectBrief.emotionalClosureSummary
      || fallbackProjectBrief.emotionalClosureCue
      || ''
    const projectCompanionHeadline = options.sanitizeText(normalizedProjectBriefing.companionHeadlineLine)
      || options.sanitizeText(storedProjectBriefing?.companionHeadlineLine)
      || ''
    const continuityPreferredTiming = options.sanitizeText(normalizedProjectBriefing.continuityPreferredTiming)
      || options.sanitizeText(storedProjectBriefing?.continuityPreferredTiming)
      || options.sanitizeText(fallbackProjectBrief.continuityPreferredTiming)
      || ''
    const continuityCadence = options.sanitizeText(normalizedProjectBriefing.continuityCadence)
      || options.sanitizeText(storedProjectBriefing?.continuityCadence)
      || options.sanitizeText(fallbackProjectBrief.continuityCadence)
      || ''
    const preferredBlinkCadence = options.sanitizeText(normalizedProjectBriefing.preferredBlinkCadence)
      || options.sanitizeText(storedProjectBriefing?.preferredBlinkCadence)
      || options.sanitizeText(fallbackProjectBrief.preferredBlinkCadence)
      || ''
    const preferredGazeMode = options.sanitizeText(normalizedProjectBriefing.preferredGazeMode)
      || options.sanitizeText(storedProjectBriefing?.preferredGazeMode)
      || options.sanitizeText(fallbackProjectBrief.preferredGazeMode)
      || ''
    const preferredPauseMode = options.sanitizeText(normalizedProjectBriefing.preferredPauseMode)
      || options.sanitizeText(storedProjectBriefing?.preferredPauseMode)
      || options.sanitizeText(fallbackProjectBrief.preferredPauseMode)
      || ''
    const preferredLipsyncMode = options.sanitizeText(normalizedProjectBriefing.preferredLipsyncMode)
      || options.sanitizeText(storedProjectBriefing?.preferredLipsyncMode)
      || options.sanitizeText(fallbackProjectBrief.preferredLipsyncMode)
      || ''
    const preferredVoiceMode = options.sanitizeText(normalizedProjectBriefing.preferredVoiceMode)
      || options.sanitizeText(storedProjectBriefing?.preferredVoiceMode)
      || fallbackProjectBrief.preferredVoiceMode
      || ''
    const preferredPacingMode = options.sanitizeText(normalizedProjectBriefing.preferredPacingMode)
      || options.sanitizeText(storedProjectBriefing?.preferredPacingMode)
      || fallbackProjectBrief.preferredPacingMode
      || ''
    const projectPreflight = options.sanitizeText(normalizedProjectBriefing.preflightSummary)
      || projectCompanionHeadline
      || sameHerSelfLine
      || options.sanitizeText(storedProjectBriefing?.preDialogueAwarenessLine)
      || options.sanitizeText(storedProjectBriefing?.preflightSummary)
      || fallbackProjectBrief.preflightSummary
      || ''
    const storedProjectAwarenessSummary = options.sanitizeText(storedProjectBriefing?.preDialogueAwarenessSummary)
    const thinStoredProjectAwarenessSummary
      = Boolean(storedProjectAwarenessSummary)
        && isAlicizationThinProjectAwarenessLine(storedProjectAwarenessSummary)
    const threadSpecificCanonicalProjectAwareness
      = thinStoredProjectAwarenessSummary
        && Boolean(explicitLatestProgressInput || explicitPrimaryOpenLoopInput || explicitNextClosureTargetInput)
        ? options.sanitizeText(buildAlicizationProjectPreDialogueAwarenessLine({
            identity: projectIdentity,
            currentPhase: projectPhase,
            latestLandedProgress: latestLandedProgress || null,
            primaryOpenLoop: primaryOpenLoop || null,
            nextClosureTarget: nextClosureTarget || null,
            sameHerSelfLine: sameHerSelfLine || null,
          }))
        : ''
    const usableStoredProjectAwarenessSummary
      = storedProjectAwarenessSummary && !isAlicizationThinProjectAwarenessLine(storedProjectAwarenessSummary)
        ? storedProjectAwarenessSummary
        : ''
    const projectAwareness = usableStoredProjectAwarenessSummary
      || projectCompanionHeadline
      || threadSpecificCanonicalProjectAwareness
      || options.sanitizeText(normalizedProjectBriefing.preDialogueAwarenessSummary)
      || options.sanitizeText(normalizedProjectBriefing.preDialogueAwarenessLine)
      || fallbackProjectBrief.preDialogueAwarenessLine
    const projectCompanionBriefing = options.sanitizeText(normalizedProjectBriefing.companionBriefingLine)
      || options.sanitizeText((storedProjectBriefing as { companionBriefingLine?: unknown } | null)?.companionBriefingLine)
      || ''
    const providerLatestLandedProgress = sanitizeExecutorProviderContextText(latestLandedProgress)
    const providerPrimaryOpenLoop = sanitizeExecutorProviderContextText(primaryOpenLoop)
    const providerNextClosureTarget = sanitizeExecutorProviderContextText(nextClosureTarget)
    const providerProactiveContinuityGap = sanitizeExecutorProviderContextText(proactiveSameHerGap)
    const providerExecutionContinuity = sanitizeExecutorProviderContextText(projectContinuity)
    const providerExecutionEmotionalContext = sanitizeExecutorProviderContextText(emotionalClosureSummary)
    const projectBriefingLines = [
      'runtime_context=local_runtime',
      providerLatestLandedProgress ? `latest_landed_progress=${providerLatestLandedProgress}` : '',
      providerPrimaryOpenLoop ? `primary_open_loop=${providerPrimaryOpenLoop}` : '',
      providerNextClosureTarget ? `next_closure_target=${providerNextClosureTarget}` : '',
      continuityArcStage ? `execution_continuity_arc_stage=${continuityArcStage}` : '',
      providerProactiveContinuityGap ? `proactive_continuity_gap=${providerProactiveContinuityGap}` : '',
      continuityRestraint ? `execution_continuity_restraint=${continuityRestraint}` : '',
      providerExecutionContinuity ? `execution_continuity=${providerExecutionContinuity}` : '',
      providerExecutionEmotionalContext ? `execution_emotional_context=${providerExecutionEmotionalContext}` : '',
      continuityPreferredTiming ? `execution_continuity_preferred_timing=${continuityPreferredTiming}` : '',
      continuityCadence ? `execution_continuity_cadence=${continuityCadence}` : '',
      preferredBlinkCadence ? `execution_preferred_blink_cadence=${preferredBlinkCadence}` : '',
      preferredGazeMode ? `execution_preferred_gaze_mode=${preferredGazeMode}` : '',
      preferredPauseMode ? `execution_pause_mode=${preferredPauseMode}` : '',
      preferredLipsyncMode ? `execution_lipsync_mode=${preferredLipsyncMode}` : '',
      preferredVoiceMode ? `execution_voice_mode=${preferredVoiceMode}` : '',
      preferredPacingMode ? `execution_pacing_mode=${preferredPacingMode}` : '',
      projectPreflight || projectAwareness || projectCompanionBriefing
        ? 'template_awareness=withheld_from_executor_prompt'
        : '',
      'Report execution blockers, tool failures, and uncertainty directly; do not cover them with persona continuity language.',
    ].filter(Boolean).join('\n')
    if (resumeChannel === 'codex') {
      return {
        codex: {
          prompt: thread.kind === 'codebase-edit'
            ? `Continue the already-confirmed Alicization task directly and make the code change now.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}\n${projectBriefingLines}`
            : `Continue the already-confirmed Alicization task directly in read-only investigation mode.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}\n${projectBriefingLines}`,
          sandbox: thread.kind === 'codebase-edit' ? 'workspace-write' as const : 'read-only' as const,
        },
      }
    }
    if (resumeChannel === 'claude-code') {
      return {
        claudeCode: {
          prompt: thread.kind === 'codebase-edit'
            ? `Continue the already-confirmed Alicization task directly and make the code change now.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}\n${projectBriefingLines}`
            : `Continue the already-confirmed Alicization task directly in investigation mode.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}\n${projectBriefingLines}`,
          allowTools: thread.kind === 'codebase-edit',
          permissionMode: thread.kind === 'codebase-edit' ? 'acceptEdits' as const : 'plan' as const,
        },
      }
    }
    if (resumeChannel === 'openclaw') {
      return {
        openclaw: {
          instruction: `Continue the already-confirmed Alicization task directly.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}\n${projectBriefingLines}`,
        },
      }
    }
    if (resumeChannel === 'browser' || resumeChannel === 'software' || resumeChannel === 'desktop') {
      return {
        localVisual: {
          instruction: `Continue the already-confirmed Alicization task directly.\nGoal: ${goal}\nSummary: ${options.sanitizeText(thread.summary) || 'none'}\n${projectBriefingLines}`,
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
    const executionMetadata = readResumeRecord(originalMetadata.execution)
    const runtimeContext = readResumeRecord(executionMetadata.runtimeContext)
    const storedProjectBriefing = readResumeRecord(runtimeContext.projectBriefing)
    const fallbackProjectBrief = resolveAlicizationProjectStateBrief()
    const fallbackProjectStatusBrief = resolveAlicizationProjectStatusBrief({
      fallbackProjectState: {
        identity: fallbackProjectBrief.identity,
        currentPhase: fallbackProjectBrief.currentPhase,
        latestLandedProgress: fallbackProjectBrief.continuityProgressSummary ?? fallbackProjectBrief.latestProgress ?? null,
        primaryOpenLoop: fallbackProjectBrief.openLoops[0] ?? fallbackProjectBrief.primaryOpenLoop ?? null,
        nextClosureTarget: fallbackProjectBrief.nextClosureTarget,
        sameHerSelfLine: fallbackProjectBrief.sameHerSelfLine,
        sameHerDriftRisk: fallbackProjectBrief.sameHerDriftRisk,
        preflightSummary: fallbackProjectBrief.preflightSummary ?? null,
        preDialogueAwarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
        awarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
      },
    })
    const projectSnapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: Object.keys(storedProjectBriefing).length > 0
        ? {
            identity: storedProjectBriefing.identity ?? null,
            currentPhase: storedProjectBriefing.currentPhase ?? null,
            latestLandedProgress: storedProjectBriefing.latestLandedProgress ?? storedProjectBriefing.latestProgress ?? storedProjectBriefing.landedProgressSummary ?? null,
            primaryOpenLoop: storedProjectBriefing.primaryOpenLoop ?? storedProjectBriefing.openClosureSummary ?? null,
            nextClosureTarget: storedProjectBriefing.nextClosureTarget ?? storedProjectBriefing.nextClosureTargetSummary ?? null,
            sameHerSelfLine: storedProjectBriefing.sameHerSelfLine ?? null,
            sameHerHoldDetail: storedProjectBriefing.sameHerHoldDetail ?? null,
            sameHerDriftRisk: storedProjectBriefing.sameHerDriftRisk ?? storedProjectBriefing.sameHerDriftRiskSummary ?? null,
            proactiveSameHerGap: storedProjectBriefing.proactiveSameHerGap ?? null,
            continuityRestraint: storedProjectBriefing.continuityRestraint ?? null,
            continuityArcStage: storedProjectBriefing.continuityArcStage ?? null,
            continuityCue: storedProjectBriefing.continuityCue ?? null,
            continuityPreferredTiming: storedProjectBriefing.continuityPreferredTiming ?? null,
            continuityCadence: storedProjectBriefing.continuityCadence ?? null,
            preflightSummary: storedProjectBriefing.preflightSummary ?? null,
            preDialogueAwarenessLine: storedProjectBriefing.preDialogueAwarenessLine ?? null,
            awarenessLine: storedProjectBriefing.preDialogueAwarenessLine ?? null,
            companionHeadlineLine: storedProjectBriefing.companionHeadlineLine ?? null,
            companionBriefingLine: storedProjectBriefing.companionBriefingLine ?? null,
            emotionalClosureSummary: storedProjectBriefing.emotionalClosureSummary ?? null,
            preferredBlinkCadence: storedProjectBriefing.preferredBlinkCadence ?? null,
            preferredGazeMode: storedProjectBriefing.preferredGazeMode ?? null,
            preferredPauseMode: storedProjectBriefing.preferredPauseMode ?? null,
            preferredLipsyncMode: storedProjectBriefing.preferredLipsyncMode ?? null,
            preferredVoiceMode: storedProjectBriefing.preferredVoiceMode ?? null,
            preferredPacingMode: storedProjectBriefing.preferredPacingMode ?? null,
          }
        : null,
      fallbackProjectState: {
        identity: fallbackProjectBrief.identity,
        currentPhase: fallbackProjectBrief.currentPhase,
        latestLandedProgress: fallbackProjectBrief.continuityProgressSummary ?? fallbackProjectBrief.latestProgress ?? null,
        primaryOpenLoop: fallbackProjectBrief.openLoops[0] ?? fallbackProjectBrief.primaryOpenLoop ?? null,
        nextClosureTarget: fallbackProjectBrief.nextClosureTarget,
        sameHerSelfLine: fallbackProjectBrief.sameHerSelfLine,
        sameHerDriftRisk: fallbackProjectBrief.sameHerDriftRisk,
        proactiveSameHerGap: fallbackProjectBrief.proactiveSameHerGap ?? null,
        continuityRestraint: fallbackProjectBrief.continuityRestraint ?? null,
        continuityCue: fallbackProjectBrief.continuityCue ?? null,
        preflightSummary: fallbackProjectBrief.preflightSummary ?? null,
        preDialogueAwarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
        awarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
        emotionalClosureSummary: fallbackProjectBrief.emotionalClosureSummary ?? null,
        preferredVoiceMode: fallbackProjectBrief.preferredVoiceMode ?? null,
        preferredPacingMode: fallbackProjectBrief.preferredPacingMode ?? null,
      },
    })

    const projectAwareness = options.sanitizeText(projectSnapshot.preDialogueAwarenessLine)
      || fallbackProjectBrief.preDialogueAwarenessLine
    const projectPreflight = options.sanitizeText(projectSnapshot.preflightSummary)
      || fallbackProjectBrief.preflightSummary
      || ''
    const projectContinuityRestraint = options.sanitizeText(projectSnapshot.continuityRestraint)
      || fallbackProjectBrief.continuityRestraint
      || null
    const projectEmotionalClosure = options.sanitizeText(projectSnapshot.emotionalClosureSummary)
      || fallbackProjectBrief.emotionalClosureSummary
      || fallbackProjectBrief.emotionalClosureCue
      || null
    const projectVoiceMode = options.sanitizeText(projectSnapshot.preferredVoiceMode)
      || fallbackProjectBrief.preferredVoiceMode
      || null
    const projectPacingMode = options.sanitizeText(projectSnapshot.preferredPacingMode)
      || fallbackProjectBrief.preferredPacingMode
      || null
    const projectCompanionBriefing = options.sanitizeText(projectSnapshot.companionBriefingLine)
      || fallbackProjectStatusBrief.companionBriefingLine
      || null
    const projectCompanionHeadline = options.sanitizeText(projectSnapshot.companionHeadlineLine)
      || fallbackProjectStatusBrief.companionHeadlineLine
      || null
    const projectSameHerHoldDetail = options.sanitizeText(projectSnapshot.sameHerHoldDetail)
      || null
    const projectContinuityArcStage = options.sanitizeText(projectSnapshot.continuityArcStage)
      || null
    const projectContinuityCue = options.sanitizeText(projectSnapshot.continuityCue)
      || null
    const projectContinuityPreferredTiming = options.sanitizeText(projectSnapshot.continuityPreferredTiming)
      || null
    const projectContinuityCadence = options.sanitizeText(projectSnapshot.continuityCadence)
      || null
    const projectBlinkCadence = options.sanitizeText(projectSnapshot.preferredBlinkCadence)
      || null
    const projectGazeMode = options.sanitizeText(projectSnapshot.preferredGazeMode)
      || null
    const projectPauseMode = options.sanitizeText(projectSnapshot.preferredPauseMode)
      || null
    const projectLipsyncMode = options.sanitizeText(projectSnapshot.preferredLipsyncMode)
      || null

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
        projectIdentity: options.sanitizeText(projectSnapshot.identity) || fallbackProjectBrief.identity,
        projectPhase: options.sanitizeText(projectSnapshot.currentPhase) || fallbackProjectBrief.currentPhase,
        latestLandedProgress: options.sanitizeText(projectSnapshot.latestLandedProgress ?? projectSnapshot.latestProgress) || null,
        primaryOpenLoop: options.sanitizeText(projectSnapshot.primaryOpenLoop) || null,
        nextClosureTarget: options.sanitizeText(projectSnapshot.nextClosureTarget) || null,
        sameHerLine: options.sanitizeText(projectSnapshot.sameHerSelfLine) || fallbackProjectBrief.sameHerSelfLine,
        sameHerDriftRisk: options.sanitizeText(projectSnapshot.sameHerDriftRisk) || fallbackProjectBrief.sameHerDriftRisk,
        projectSameHerHoldDetail,
        projectCompanionHeadline,
        projectCompanionBriefing,
        projectContinuityRestraint,
        projectContinuityArcStage,
        projectContinuityCue,
        projectContinuityPreferredTiming,
        projectContinuityCadence,
        projectBlinkCadence,
        projectGazeMode,
        projectPauseMode,
        projectLipsyncMode,
        projectEmotionalClosure,
        projectVoiceMode,
        projectPacingMode,
        projectPreflight,
        projectAwareness,
      },
      createdAt: Date.now(),
    }
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
