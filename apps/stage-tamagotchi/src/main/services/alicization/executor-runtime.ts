import type {
  AlicizationAuditLogInput,
  AlicizationChannelCapability,
  AlicizationChannelCapabilityManifestRecord,
  AlicizationClawTaskIntent,
  AlicizationDispatchTaskThreadPayload,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationDbService } from './db'
import type { MainGatewayExecutionTaskThreadResult, MainGatewayExecutionToolContext } from './main-chat-execution-surface'
import type { AlicizationTaskRoutingAssessment } from './task-execution-governor'
import type { AlicizationTaskThreadPlanningInput } from './task-thread-governor'
import type { AlicizationTaskThreadDispatchInvocation } from './task-thread-orchestrator'

import { randomUUID } from 'node:crypto'
import { env, platform } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

import { locateAlicizationExecutionBinary } from './execution-command-env'
import { expandOpenClawBackedCapabilities } from './executor-adapters/embodied-channel'
import { probeOpenClawCapability, readOpenClawCapabilitySnapshot } from './executor-adapters/openclaw'
import { createTaskExecutionGovernor } from './task-execution-governor'

type CapabilityManifestSnapshotSource = 'runtime-default-probe' | 'runtime-plan-payload'

type AlicizationExecutorRuntimeDbPort = Pick<AlicizationDbService, 'appendExecutionEvents'
  | 'getTaskThread'
  | 'listChannelCapabilityManifests'
  | 'listExecutorSessions'
  | 'listTaskThreads'
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
    return await taskExecutionGovernor.plan(options.getAlicizationDb(), input)
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

  return {
    executeMainGatewayTaskThread,
    planTaskThread,
    resolveExecutionCapabilitiesForPrompt,
    resolveTaskPlanningCapabilities,
  }
}
