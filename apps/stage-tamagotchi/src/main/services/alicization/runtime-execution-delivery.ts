import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type {
  AlicizationExecutionDeliveryReplySelection,
} from './execution-delivery-surface'
import type { AlicizationExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import type { CharacterPerformanceCapabilitiesManifest } from '../../../shared/eventa'

import {
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { createAlicizationExecutionDeliveryRuntime, hasAlicizationExecutionDeliveryRetainedState } from './execution-delivery-runtime'
import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import {
  buildAlicizationExecutionPayoffDeterministicStructured,
  buildAlicizationExecutionPayoffPrompt,
  buildAlicizationExecutionPayoffStructuredReply,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'
import { deriveExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import { inferHostSocialContextsFromText } from './host-social-guidance'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { buildSelfContinuityAuthorityFromRuntimeSurface, type AlicizationSelfContinuityAuthority } from './self-continuity-authority'

interface CreateAlicizationRuntimeExecutionDeliveryOptions {
  getActiveCardId: () => string
  normalizeCardId: (raw: unknown) => string
  normalizeSessionId: (raw: unknown) => string
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  queueSubconsciousWake: (cardIdRaw: unknown, reason: string, delayMs?: number) => void
  appendAuditLog: (input: any, cardId?: string) => Promise<void>
  syncSessionMirrorFromCurrentCardState: (input: {
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string | null
    source: string
    turnId?: string | null
    taskThread?: AlicizationTaskThreadRecord | null
  }) => Promise<void>
  alicizationDb: {
    getMetaValue: (key: string) => Promise<string | undefined>
    setMetaValue: (key: string, value: string) => Promise<void>
    listExecutionEvents: (input: { threadId: string, limit?: number }) => Promise<any[]>
  }
  executionDeliveryRuntime: ReturnType<typeof createAlicizationExecutionDeliveryRuntime>
  executionDeliveryStateMetaKey: string
  generateMainGatewayText: (input: any) => Promise<string | null>
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  normalizeAlicizationEmotion: (raw: unknown) => { emotion: string, downgraded: boolean }
  normalizeAlicizationPerformancePayload: (raw: unknown, emotion: any) => any
  clampAlicizationPerformancePayloadToManifest: (payload: any, manifest: CharacterPerformanceCapabilitiesManifest | null, emotion: any) => any
  ensureVisualPresenceState: (cardIdRaw: unknown) => Promise<any>
  buildHostPersonModel: (input?: { now?: number }) => Promise<AlicizationHostPersonModelSnapshot | null>
}

function formatExecutionDeliveryStatus(status: AlicizationTaskThreadRecord['status']) {
  if (status === 'completed')
    return 'completed'
  if (status === 'cancelled')
    return 'cancelled'
  if (status === 'blocked')
    return 'blocked'
  return 'failed'
}

function inferExecutionPersonStateContexts(goal: string | null | undefined) {
  return inferHostSocialContextsFromText(goal ?? '', ['execution-callback', 'execution'])
}

export function createAlicizationRuntimeExecutionDelivery(
  options: CreateAlicizationRuntimeExecutionDeliveryOptions,
) {
  const persistExecutionDeliveryState = async (cardIdRaw: unknown) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    const state = options.executionDeliveryRuntime.snapshot(cardId)
    const value = hasAlicizationExecutionDeliveryRetainedState(state)
      ? JSON.stringify(state)
      : ''

    if (cardId === options.getActiveCardId()) {
      await options.alicizationDb.setMetaValue(options.executionDeliveryStateMetaKey, value).catch(() => {})
      return state
    }

    await options.withCardScope(cardId, async () => {
      await options.alicizationDb.setMetaValue(options.executionDeliveryStateMetaKey, value).catch(() => {})
    }, {
      label: `execution-delivery.persist:${cardId}`,
    })
    return state
  }

  const restoreExecutionDeliveryState = async (cardIdRaw: unknown) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    const apply = (raw: string | undefined) => {
      if (!raw)
        return options.executionDeliveryRuntime.restore(cardId, null)
      try {
        return options.executionDeliveryRuntime.restore(cardId, JSON.parse(raw))
      }
      catch {
        return options.executionDeliveryRuntime.restore(cardId, null)
      }
    }

    const restored = cardId === options.getActiveCardId()
      ? apply(await options.alicizationDb.getMetaValue(options.executionDeliveryStateMetaKey).catch(() => undefined))
      : await options.withCardScope(cardId, async () => apply(await options.alicizationDb.getMetaValue(options.executionDeliveryStateMetaKey).catch(() => undefined)), {
          label: `execution-delivery.restore:${cardId}`,
        })

    if (cardId === options.getActiveCardId() && restored.pending.length > 0)
      options.queueSubconsciousWake(cardId, 'execution-delivery-restore', 240)
    return restored
  }

  const queueExecutionDeliveryCandidate = async (input: {
    cardId: string
    thread: AlicizationTaskThreadRecord
  }) => {
    const cardId = options.normalizeCardId(input.cardId)
    const sessionId = options.normalizeSessionId(input.thread.sessionId)
    if (!sessionId)
      return null
    if (!alicizationTerminalTaskThreadStatuses.has(input.thread.status))
      return null

    const events = await options.alicizationDb.listExecutionEvents({
      threadId: input.thread.id,
      limit: 8,
    }).catch(() => [])
    const latestEvent = readLatestExecutionEvent(events)
    const completedAt = readTaskThreadActivityAt(input.thread)
    const queued = options.executionDeliveryRuntime.enqueue({
      cardId,
      sessionId,
      threadId: input.thread.id,
      decisionTraceId: input.thread.decisionTraceId,
      turnId: input.thread.turnId,
      channel: input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor',
      status: input.thread.status,
      goal: input.thread.goal,
      summary: input.thread.summary,
      outcome: readExecutionOutcome(events),
      signature: sanitizeExecutionLedgerText(
        latestEvent
          ? `${input.thread.id}:${latestEvent.id ?? latestEvent.createdAt}`
          : `${input.thread.id}:${completedAt}`,
        220,
      ),
      completedAt,
    })

    if (!queued)
      return null

    await persistExecutionDeliveryState(cardId)
    await options.syncSessionMirrorFromCurrentCardState({
      cardId,
      decisionTraceId: queued.decisionTraceId,
      sessionId: queued.sessionId,
      source: 'execution-delivery-queued',
      turnId: queued.turnId,
      taskThread: input.thread,
    })

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.executor.delivery',
      action: 'queued',
      message: 'Queued a settled task-thread callback for subconscious delivery.',
      payload: {
        threadId: queued.threadId,
        sessionId: queued.sessionId,
        status: queued.status,
        channel: queued.channel,
        completedAt: queued.completedAt,
      },
    }, cardId)
    options.queueSubconsciousWake(cardId, `execution-delivery:${queued.threadId}`, 240)
    return queued
  }

  const buildExecutionDeliveryDeterministicStructured = (input: {
    channel: string
    goal: string
    outcome: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    policy?: AlicizationExecutionResultDeliveryPolicy | null
    personStateProjection?: AlicizationPersonStateProjection | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  }) => {
    return buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      goal: input.goal,
      status: input.status,
      summary: input.summary,
      outcome: input.outcome,
      policy: input.policy,
      personStateProjection: input.personStateProjection ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority,
      hostPersonModel: input.hostPersonModel ?? null,
      visibleReplyAuthority: 'governed-repair-fallback',
    })
  }

  const selectExecutionDeliveryReplySurface = (input: {
    channel: string
    goal: string
    llmReply?: string | null
    outcome: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    deliveryPolicy?: AlicizationExecutionResultDeliveryPolicy | null
    personStateProjection?: AlicizationPersonStateProjection | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
  }): AlicizationExecutionDeliveryReplySelection => {
    return selectAlicizationExecutionDeliveryReply({
      ...input,
      policy: input.deliveryPolicy,
      personStateProjection: input.personStateProjection ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority,
      hostPersonModel: input.hostPersonModel ?? null,
    })
  }

  const generateExecutionCallbackStructuredWithGateway = async (input: {
    cardId: string
    channel: string
    completedAt: number
    decisionTraceId?: string | null
    goal: string
    outcome: string
    sessionId: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    threadId: string
    turnId?: string | null
    deliveryPolicy?: AlicizationExecutionResultDeliveryPolicy | null
    personStateProjection?: AlicizationPersonStateProjection | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    knowledgeEvidence?: OrganicMemoryPromptContext['knowledgeEvidence']
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    }
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) => {
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      status: formatExecutionDeliveryStatus(input.status),
      goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
      summary: sanitizeExecutionLedgerText(input.summary, 220),
      outcome: sanitizeExecutionLedgerText(input.outcome, 240),
      policy: input.deliveryPolicy,
      knowledgeEvidence: input.knowledgeEvidence ?? null,
      personStateProjection: input.personStateProjection ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority,
      hostPersonModel: input.hostPersonModel ?? null,
      trace: {
        decisionTraceId: input.decisionTraceId,
        turnMode: 'answer',
        personaKernelMode: 'backgrounded',
      },
    })

    const raw = await options.generateMainGatewayText({
      system: prompt.system,
      user: prompt.user,
      timeoutMs: 15_000,
      source: 'execution-callback',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: input.agentTurnInput,
      captureAgentSensorySnapshot: false,
    })
    if (!raw)
      return null

    const parsed = parseJsonObjectFromText(raw)
    if (!parsed)
      return null

    const thought = sanitizeExecutionLedgerText(parsed.thought, 220)
    const reply = sanitizeExecutionLedgerText(parsed.reply, 220)
    const normalizedEmotion = options.normalizeAlicizationEmotion(parsed.emotion)
    const performanceManifest = await options.getPerformanceManifest()
    const performance = options.clampAlicizationPerformancePayloadToManifest(
      options.normalizeAlicizationPerformancePayload(parsed.performance, normalizedEmotion.emotion),
      performanceManifest,
      normalizedEmotion.emotion,
    ).performance
    if (!thought || !reply || normalizedEmotion.downgraded)
      return null

    return buildAlicizationExecutionPayoffStructuredReply({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
      status: formatExecutionDeliveryStatus(input.status),
      summary: sanitizeExecutionLedgerText(input.summary, 220),
      outcome: sanitizeExecutionLedgerText(input.outcome, 240),
      thought,
      emotion: performance.baseEmotion,
      delivery: performance.delivery,
      performance: performance as any,
    })
  }

  const resolveExecutionResultDeliveryPolicyForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    status: AlicizationTaskThreadRecord['status']
  }) => {
    const spineFromTurn = input.agentTurn?.getSessionSnapshot().digitalLifeSpine ?? null
    const state = spineFromTurn
      ? null
      : await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const spine = spineFromTurn
      ?? (state ? deriveAlicizationDigitalLifeSpineFromSurface(buildAlicizationDigitalLifeRuntimeSurface(state)) : null)

    return deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: spine,
      status: input.status === 'completed' || input.status === 'failed' || input.status === 'blocked' || input.status === 'cancelled'
        ? input.status
        : 'completed',
    })
  }

  const resolveExecutionSelfContinuityAuthorityForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const spineFromTurn = input.agentTurn?.getSessionSnapshot().digitalLifeSpine ?? null
    const state = spineFromTurn
      ? null
      : await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const runtimeSurface = spineFromTurn?.runtimeSurface
      ?? (state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null)
    return buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  }

  const resolveExecutionHostPersonModelForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const runtimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const bundleHost = readHostPersonModelFromDerivedMindStateBundle(runtimeSurface?.memory.derivedMindStateBundle ?? null)
    if (bundleHost)
      return bundleHost
    if (runtimeSurface?.memory.hostPersonModel)
      return runtimeSurface.memory.hostPersonModel
    return await options.buildHostPersonModel({
      now: Date.now(),
    }).catch(() => null)
  }

  const resolveExecutionKnowledgeEvidenceForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const runtimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface
      ?? await (async () => {
        const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
        return state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
      })()
    return readKnowledgeEvidenceFromDerivedMindStateBundle(runtimeSurface?.memory.derivedMindStateBundle ?? null)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null
  }

  const resolveExecutionPersonStateProjectionForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    goal?: string | null
  }) => {
    const runtimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface
      ?? await (async () => {
        const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
        return state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
      })()

    const bundleProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(runtimeSurface?.memory.derivedMindStateBundle ?? null)
    if (bundleProjection)
      return bundleProjection as AlicizationPersonStateProjection
    if (runtimeSurface?.memory.personStateProjection)
      return runtimeSurface.memory.personStateProjection

    const hostPersonModel = runtimeSurface?.memory.hostPersonModel
      ?? await resolveExecutionHostPersonModelForRuntime(input)

    if (!runtimeSurface && !hostPersonModel)
      return null

    return buildAlicizationPersonStateProjection({
      now: Date.now(),
      contexts: [
        ...new Set([
          ...inferExecutionPersonStateContexts(input.goal),
          'execution-callback',
          'execution',
        ]),
      ],
      autobiographicalSelf: runtimeSurface?.memory.autobiographicalSelf ?? null,
      hostPersonModel: hostPersonModel ?? null,
      longHorizonMemory: runtimeSurface?.memory.longHorizonMemory ?? null,
      motiveEngine: runtimeSurface?.memory.motiveEngine ?? null,
      habitPolicy: runtimeSurface?.agency.habitPolicy ?? null,
      selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
      selfState: runtimeSurface?.agency.selfState ?? null,
      privateThought: runtimeSurface?.cognition.privateThought ?? null,
      mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
      previousContinuityState: runtimeSurface?.memory.personalityContinuityState ?? null,
    })
  }

  return {
    persistExecutionDeliveryState,
    restoreExecutionDeliveryState,
    queueExecutionDeliveryCandidate,
    buildExecutionDeliveryDeterministicStructured,
    selectExecutionDeliveryReplySurface,
    generateExecutionCallbackStructuredWithGateway,
    resolveExecutionResultDeliveryPolicyForRuntime,
    resolveExecutionSelfContinuityAuthorityForRuntime,
    resolveExecutionHostPersonModelForRuntime,
    resolveExecutionKnowledgeEvidenceForRuntime,
    resolveExecutionPersonStateProjectionForRuntime,
  }
}
