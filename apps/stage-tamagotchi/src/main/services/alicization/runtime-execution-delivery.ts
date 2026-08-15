import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationTaskThreadRecord,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { createAlicizationExecutionDeliveryRuntime } from './execution-delivery-runtime'
import type {
  AlicizationExecutionDeliveryReplySelection,
} from './execution-delivery-surface'
import type { AlicizationExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import type {
  AlicizationMainGatewayGenerateTextProvider,
  AlicizationMainGatewaySource,
} from './main-gateway-contract'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type {
  AlicizationPersonalityContinuityStateSnapshot,
} from './personality-continuity-state'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  normalizeAlicizationExecutionRuntimeContext,
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { hasAlicizationExecutionDeliveryRetainedState } from './execution-delivery-runtime'
import {
  buildAlicizationExecutionPayoffPrompt,
  normalizeAlicizationProviderExecutionStructured,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'
import { deriveExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionFailure,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import { buildHostSocialContexts } from './host-social-guidance'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import { buildAlicizationSelfEvolutionKernel } from './self-evolution-kernel'

function sanitizeExecutionDeliveryProjectFreeText(raw: unknown, maxChars = 320) {
  const ledgerText = sanitizeExecutionLedgerText(raw, maxChars)
  if (!ledgerText)
    return null
  return sanitizeAlicizationProviderFacingText(ledgerText, maxChars, '', {
    origin: 'internal-structured-fact',
  }) || null
}

function readExecutionResultDeliveryMode(
  thread: AlicizationTaskThreadRecord,
): 'inline' | 'callback' | null {
  const execution = thread.metadata?.execution
  if (!execution || typeof execution !== 'object' || Array.isArray(execution))
    return null

  return normalizeAlicizationExecutionRuntimeContext(
    (execution as Record<string, unknown>).runtimeContext,
  )?.resultDeliveryMode ?? null
}

function sanitizeExecutionProjectionCarryText(raw: unknown, maxChars = 320) {
  return sanitizeExecutionDeliveryProjectFreeText(raw, maxChars)
}

function sanitizeExecutionProjectionRequiredText(raw: unknown, maxChars = 320) {
  return sanitizeExecutionProjectionCarryText(raw, maxChars) ?? ''
}

function sanitizeExecutionPersonalityContinuityState(
  state: AlicizationPersonalityContinuityStateSnapshot,
) {
  return {
    ...state,
    continuitySummary: sanitizeExecutionProjectionRequiredText(state.continuitySummary, 520),
    regimeModel: state.regimeModel
      ? {
          ...state.regimeModel,
          primaryReason: sanitizeExecutionProjectionCarryText(state.regimeModel.primaryReason, 320),
          carryReason: sanitizeExecutionProjectionCarryText(state.regimeModel.carryReason, 320),
          signals: (state.regimeModel.signals ?? [])
            .map(signal => sanitizeExecutionProjectionRequiredText(signal, 220))
            .filter(Boolean),
        }
      : state.regimeModel,
    rhythmState: state.rhythmState
      ? {
          ...state.rhythmState,
          summary: sanitizeExecutionProjectionRequiredText(state.rhythmState.summary, 520),
          rationale: (state.rhythmState.rationale ?? [])
            .map(reason => sanitizeExecutionProjectionRequiredText(reason, 220))
            .filter(Boolean),
        }
      : state.rhythmState,
    trustMeaning: state.trustMeaning == null ? state.trustMeaning : sanitizeExecutionProjectionCarryText(state.trustMeaning, 320),
    reconsolidationLine: state.reconsolidationLine == null ? state.reconsolidationLine : sanitizeExecutionProjectionCarryText(state.reconsolidationLine, 320),
    selfLine: state.selfLine == null ? state.selfLine : sanitizeExecutionProjectionCarryText(state.selfLine, 320),
    relationLine: state.relationLine == null ? state.relationLine : sanitizeExecutionProjectionCarryText(state.relationLine, 320),
    currentPreoccupation: state.currentPreoccupation == null
      ? state.currentPreoccupation
      : sanitizeExecutionProjectionCarryText(state.currentPreoccupation, 320),
    rationale: (state.rationale ?? [])
      .map(reason => sanitizeExecutionProjectionRequiredText(reason, 220))
      .filter(Boolean),
  } satisfies AlicizationPersonalityContinuityStateSnapshot
}

function sanitizeExecutionPersonStateProjection(projection: AlicizationPersonStateProjection) {
  const authority = projection.selfContinuityAuthority
  return {
    contexts: projection.contexts,
    personalityContinuityState: sanitizeExecutionPersonalityContinuityState(projection.personalityContinuityState),
    activeClosenessContext: projection.activeClosenessContext,
    activeClosenessRung: projection.activeClosenessRung,
    closenessLadder: projection.closenessLadder,
    relationshipPosture: projection.relationshipPosture,
    preferredProactiveStyle: projection.preferredProactiveStyle,
    preferenceText: sanitizeExecutionProjectionRequiredText(projection.preferenceText, 320),
    sensitivityText: sanitizeExecutionProjectionRequiredText(projection.sensitivityText, 320),
    repairTriggerText: sanitizeExecutionProjectionRequiredText(projection.repairTriggerText, 320),
    burdenText: sanitizeExecutionProjectionRequiredText(projection.burdenText, 320),
    routineText: sanitizeExecutionProjectionRequiredText(projection.routineText, 320),
    trustRationale: sanitizeExecutionProjectionRequiredText(projection.trustRationale, 320),
    relationshipDoctrine: sanitizeExecutionProjectionRequiredText(projection.relationshipDoctrine, 320),
    cautious: projection.cautious,
    restrained: projection.restrained,
    summary: sanitizeExecutionProjectionRequiredText(projection.summary, 520),
    selfContinuityAuthority: authority
      ? {
          ...authority,
          selfLine: authority.selfLine == null ? authority.selfLine : sanitizeExecutionProjectionCarryText(authority.selfLine, 320),
          relationshipLine: authority.relationshipLine == null ? authority.relationshipLine : sanitizeExecutionProjectionCarryText(authority.relationshipLine, 320),
          motiveLine: authority.motiveLine == null ? authority.motiveLine : sanitizeExecutionProjectionCarryText(authority.motiveLine, 320),
          habitLine: authority.habitLine == null ? authority.habitLine : sanitizeExecutionProjectionCarryText(authority.habitLine, 320),
          inwardLine: authority.inwardLine == null ? authority.inwardLine : sanitizeExecutionProjectionCarryText(authority.inwardLine, 320),
          authoritySummary: authority.authoritySummary == null
            ? authority.authoritySummary
            : sanitizeExecutionProjectionCarryText(authority.authoritySummary, 520),
        }
      : null,
  } satisfies AlicizationPersonStateProjection
}

interface CreateAlicizationRuntimeExecutionDeliveryOptions {
  getActiveCardId: () => string
  getActiveSessionId?: (cardId: string) => string | null | undefined
  getNow?: () => number
  executionDeliveryRecoveryWindowMs?: number
  executionDeliveryRecoveryLimit?: number
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
    listTaskThreads?: (input?: {
      sessionId?: string
      status?: AlicizationTaskThreadRecord['status'] | AlicizationTaskThreadRecord['status'][]
      limit?: number
    }) => Promise<AlicizationTaskThreadRecord[]>
  }
  executionDeliveryRuntime: ReturnType<typeof createAlicizationExecutionDeliveryRuntime>
  executionDeliveryStateMetaKey: string
  generateMainGatewayText: AlicizationMainGatewayGenerateTextProvider<
    Extract<AlicizationMainGatewaySource, 'execution-callback'>,
    string,
    {
      cardId?: string
      extraSystemBlocks?: string[]
      injectCustomDirectives?: boolean
      injectPerformanceManifest?: boolean
      agentTurn?: AlicizationAgentTurnRuntime | null
      agentTurnInput?: {
        turnId: string
        decisionTraceId?: string | null
      }
      captureAgentSensorySnapshot?: boolean
      digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
    }
  >
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  normalizeAlicizationEmotion: (raw: unknown) => { emotion: string, downgraded: boolean }
  normalizeAlicizationPerformancePayload: (raw: unknown, emotion: any) => any
  clampAlicizationPerformancePayloadToManifest: (payload: any, manifest: CharacterPerformanceCapabilitiesManifest | null, emotion: any) => any
  ensureVisualPresenceState: (cardIdRaw: unknown) => Promise<any>
  buildHostPersonModel: (input?: { now?: number }) => Promise<AlicizationHostPersonModelSnapshot | null>
  getActiveSelfRevisionStatePatch?: () => Promise<AlicizationSelfRevisionStatePatch | null>
  getActiveSelfEvolutionCandidateId?: () => Promise<string | null>
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

function inferExecutionPersonStateContexts() {
  return buildHostSocialContexts({
    extraContexts: ['execution-callback', 'execution'],
  })
}

export function createAlicizationRuntimeExecutionDelivery(
  options: CreateAlicizationRuntimeExecutionDeliveryOptions,
) {
  const getNow = options.getNow ?? Date.now
  const executionDeliveryRecoveryWindowMs = Math.max(
    1_000,
    Math.floor(options.executionDeliveryRecoveryWindowMs ?? 30 * 60_000),
  )
  const executionDeliveryRecoveryLimit = Math.max(
    1,
    Math.floor(options.executionDeliveryRecoveryLimit ?? 32),
  )

  const persistExecutionDeliveryState = async (cardIdRaw: unknown) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    const state = options.executionDeliveryRuntime.snapshot(cardId)
    const value = hasAlicizationExecutionDeliveryRetainedState(state)
      ? JSON.stringify(state)
      : ''

    if (cardId === options.getActiveCardId()) {
      await options.alicizationDb.setMetaValue(options.executionDeliveryStateMetaKey, value)
      return state
    }

    await options.withCardScope(cardId, async () => {
      await options.alicizationDb.setMetaValue(options.executionDeliveryStateMetaKey, value)
    }, {
      label: `execution-delivery.persist:${cardId}`,
    })
    return state
  }

  const restoreExecutionDeliveryState = async (cardIdRaw: unknown) => {
    const cardId = options.normalizeCardId(cardIdRaw)
    let stateReadSucceeded = false
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
    const readPersistedState = async () => {
      try {
        const raw = await options.alicizationDb.getMetaValue(options.executionDeliveryStateMetaKey)
        stateReadSucceeded = true
        return raw
      }
      catch (error) {
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.executor.delivery',
          action: 'restore-state-read-failed',
          message: 'Execution delivery state could not be read during restore; the persisted value will not be overwritten.',
          payload: {
            cardId,
            reason: error instanceof Error ? error.message : String(error),
          },
        }, cardId).catch(() => {})
        return undefined
      }
    }

    if (cardId === options.getActiveCardId()) {
      await apply(await readPersistedState())
    }
    else {
      await options.withCardScope(cardId, async () => await apply(
        await readPersistedState(),
      ), {
        label: `execution-delivery.restore:${cardId}`,
      })
    }

    await reconcileExecutionDeliveryCandidates(cardId)
    if (stateReadSucceeded) {
      await persistExecutionDeliveryState(cardId).catch(async (error) => {
        await options.appendAuditLog({
          level: 'critical',
          category: 'alicization.executor.delivery',
          action: 'restore-state-persist-failed',
          message: 'Execution delivery reconciliation completed but its cleaned state could not be persisted.',
          payload: {
            cardId,
            reason: error instanceof Error ? error.message : String(error),
          },
        }, cardId).catch(() => {})
      })
    }
    const reconciled = options.executionDeliveryRuntime.snapshot(cardId)
    if (cardId === options.getActiveCardId() && reconciled.pending.length > 0)
      options.queueSubconsciousWake(cardId, 'execution-delivery-restore', 240)
    return reconciled
  }

  const queueExecutionDeliveryCandidate = async (input: {
    cardId: string
    resultDeliveryMode?: 'inline' | 'callback'
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
    const executionFailure = readExecutionFailure(events)
    const completedAt = Number.isFinite(latestEvent?.createdAt)
      ? Math.max(0, Math.floor(Number(latestEvent?.createdAt)))
      : readTaskThreadActivityAt(input.thread)
    const resultDeliveryMode = input.resultDeliveryMode
      ?? readExecutionResultDeliveryMode(input.thread)
    if (resultDeliveryMode === 'inline') {
      options.executionDeliveryRuntime.suppressMatching({
        cardId,
        sessionId,
        threadId: input.thread.id,
        completedAt,
      })
      await persistExecutionDeliveryState(cardId)
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.executor.delivery',
        action: 'inline-surfaced',
        message: 'Skipped background execution callback because the active Provider tool loop owns result delivery.',
        payload: {
          threadId: input.thread.id,
          sessionId,
          status: input.thread.status,
          completedAt,
        },
      }, cardId)
      return null
    }
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
      errorCode: executionFailure?.code || null,
      errorMessage: executionFailure?.message || null,
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

    let statePersistenceError: string | null = null
    await persistExecutionDeliveryState(cardId).catch((error) => {
      statePersistenceError = error instanceof Error ? error.message : String(error)
    })
    if (statePersistenceError) {
      await options.appendAuditLog({
        level: 'critical',
        category: 'alicization.executor.delivery',
        action: 'state-persist-failed',
        message: 'Execution delivery was queued in memory but its durable state write failed; restore reconciliation will retry it.',
        payload: {
          cardId,
          threadId: queued.threadId,
          sessionId: queued.sessionId,
          status: queued.status,
          reason: statePersistenceError,
        },
      }, cardId).catch(() => {})
      options.queueSubconsciousWake(cardId, `execution-delivery-reconcile:${queued.threadId}`, 2_500)
    }
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

  const reconcileExecutionDeliveryCandidates = async (cardIdRaw: unknown) => {
    const listTaskThreads = options.alicizationDb.listTaskThreads
    if (!listTaskThreads)
      return 0

    const cardId = options.normalizeCardId(cardIdRaw)
    const activeSessionId = options.normalizeSessionId(
      options.getActiveSessionId?.(cardId),
    )
    const reconcile = async () => {
      const threads = await listTaskThreads({
        status: [...alicizationTerminalTaskThreadStatuses],
        ...(activeSessionId ? { sessionId: activeSessionId } : {}),
        limit: executionDeliveryRecoveryLimit,
      }).catch(() => [])
      const recoveryCutoff = getNow() - executionDeliveryRecoveryWindowMs
      const recoverableThreads = threads.filter(thread => (
        options.normalizeSessionId(thread.sessionId) === activeSessionId
        && readTaskThreadActivityAt(thread) >= recoveryCutoff
      ))
      let queued = 0
      for (const thread of recoverableThreads) {
        const candidate = await queueExecutionDeliveryCandidate({
          cardId,
          thread,
        }).catch(async (error) => {
          await options.appendAuditLog({
            level: 'warning',
            category: 'alicization.executor.delivery',
            action: 'reconcile-failed',
            message: 'Failed to rebuild a terminal execution delivery candidate during restore.',
            payload: {
              cardId,
              threadId: thread.id,
              status: thread.status,
              reason: error instanceof Error ? error.message : String(error),
            },
          }, cardId).catch(() => {})
          return null
        })
        if (candidate)
          queued += 1
      }
      if (threads.length !== recoverableThreads.length) {
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.executor.delivery',
          action: 'reconcile-history-skipped',
          message: 'Skipped terminal execution history outside the active session or delivery recovery window.',
          payload: {
            cardId,
            activeSessionId: activeSessionId || null,
            scanned: threads.length,
            recovered: recoverableThreads.length,
            recoveryWindowMs: executionDeliveryRecoveryWindowMs,
          },
        }, cardId).catch(() => {})
      }
      return queued
    }

    if (!activeSessionId) {
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.executor.delivery',
        action: 'reconcile-skipped-no-active-session',
        message: 'Skipped terminal execution delivery reconciliation because no active session is available.',
        payload: {
          cardId,
        },
      }, cardId).catch(() => {})
      return 0
    }

    if (cardId === options.getActiveCardId())
      return await reconcile()
    return await options.withCardScope(cardId, reconcile, {
      label: `execution-delivery.reconcile:${cardId}`,
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

  const resolveExecutionCallbackProviderRuntimeSurface = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    return resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
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
    const normalizedProjection = input.personStateProjection
      ? sanitizeExecutionPersonStateProjection(input.personStateProjection)
      : null
    const prompt = buildAlicizationExecutionPayoffPrompt({
      mode: 'callback-delivery',
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      status: formatExecutionDeliveryStatus(input.status),
      goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
      summary: sanitizeExecutionLedgerText(input.summary, 220),
      outcome: sanitizeExecutionLedgerText(input.outcome, 240),
      policy: input.deliveryPolicy,
      knowledgeEvidence: input.knowledgeEvidence ?? null,
      personStateProjection: normalizedProjection,
      selfContinuityAuthority: input.selfContinuityAuthority,
      hostPersonModel: input.hostPersonModel ?? null,
      trace: {
        decisionTraceId: input.decisionTraceId,
        turnMode: 'answer',
        personaKernelMode: 'backgrounded',
      },
    })
    const digitalLifeRuntimeSurface = await resolveExecutionCallbackProviderRuntimeSurface({
      agentTurn: input.agentTurn,
      cardId: input.cardId,
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
      digitalLifeRuntimeSurface,
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

    return normalizeAlicizationProviderExecutionStructured({
      parsed,
      reply,
      thought,
      emotion: performance.baseEmotion,
      delivery: performance.delivery,
      performance: {
        ...performance,
      },
    })
  }

  const resolveExecutionResultDeliveryPolicyForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    status: AlicizationTaskThreadRecord['status']
  }) => {
    const spineFromTurn = input.agentTurn?.getSessionSnapshot().digitalLifeSpine ?? null
    const sessionRuntimeSurface = spineFromTurn?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
    const spine = runtimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(runtimeSurface as any)
      : null

    return deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: spine,
      status: input.status === 'dead-lettered'
        ? 'failed'
        : input.status === 'completed' || input.status === 'failed' || input.status === 'blocked' || input.status === 'cancelled'
          ? input.status
          : 'completed',
    })
  }

  const resolveExecutionSelfContinuityAuthorityForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const resolveAuthorityWithinSurface = (surface: typeof sessionRuntimeSurface | typeof liveRuntimeSurface) => {
      const bundleProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(surface?.memory?.derivedMindStateBundle ?? null)
      const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
        bundleAuthority: bundleProjection?.selfContinuityAuthority ?? null,
        runtimeAuthority: surface?.memory?.personStateProjection?.selfContinuityAuthority ?? null,
      })
      ?? null
      const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
        bundleAuthority: bundleProjection?.selfContinuityAuthority ?? null,
        runtimeAuthority: surface?.memory?.personStateProjection?.selfContinuityAuthority ?? null,
      })
      ?? null

      return mergedSelfContinuityAuthority
        ?? projectedSelfContinuityAuthority
        ?? buildSelfContinuityAuthorityFromRuntimeSurface(surface)
    }

    const sessionAuthority = resolveAuthorityWithinSurface(sessionRuntimeSurface)
    const liveAuthority = resolveAuthorityWithinSurface(liveRuntimeSurface)
    const mergedCrossSurfaceAuthority = mergePreferredSelfContinuityAuthority({
      bundleAuthority: sessionAuthority ?? null,
      runtimeAuthority: liveAuthority ?? null,
    })
    ?? resolvePreferredSelfContinuityAuthority({
      bundleAuthority: sessionAuthority ?? null,
      runtimeAuthority: liveAuthority ?? null,
    })
    ?? null

    if (mergedCrossSurfaceAuthority)
      return mergedCrossSurfaceAuthority

    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
    return buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  }

  const resolveExecutionHostPersonModelForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
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
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
    const liveRuntimeSurface = state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
    const runtimeSurface = resolvePreferredRuntimeSurface({
      spineRuntimeSurface: sessionRuntimeSurface,
      preparedRuntimeSurface: liveRuntimeSurface,
    })
    return readKnowledgeEvidenceFromDerivedMindStateBundle(runtimeSurface?.memory.derivedMindStateBundle ?? null)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null
  }

  const resolveExecutionPersonStateProjectionForRuntime = async (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    goal?: string | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  }) => {
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const liveRuntimeSurface = !sessionRuntimeSurface
      ? await (async () => {
          const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
          return state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
        })()
      : null
    const activeSelfRevisionPatch = await options.getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null
    const runtimeSurface = sessionRuntimeSurface ?? liveRuntimeSurface

    const preferredProjection = resolvePreferredPersonStateProjection({
      bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(runtimeSurface?.memory.derivedMindStateBundle ?? null),
      runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
    })
    if (preferredProjection) {
      return sanitizeExecutionPersonStateProjection(preferredProjection as AlicizationPersonStateProjection)
    }

    const hostPersonModel = runtimeSurface?.memory.hostPersonModel
      ?? await resolveExecutionHostPersonModelForRuntime(input)
    const activeSelfEvolution = activeSelfRevisionPatch
      ? buildAlicizationSelfEvolutionKernel({
          hostPersonModel: hostPersonModel ?? null,
          knowledgeEvidence: readKnowledgeEvidenceFromDerivedMindStateBundle(runtimeSurface?.memory.derivedMindStateBundle ?? null)
            ?? runtimeSurface?.memory.knowledgeEvidence
            ?? null,
          learningPolicyState: {
            strictnessBias: activeSelfRevisionPatch.memoryPolicy.strictnessBias ?? 0,
            wrongThreadSuppressionBias: activeSelfRevisionPatch.memoryPolicy.wrongThreadSuppressionBias ?? 0,
            provenanceLabelBias: activeSelfRevisionPatch.memoryPolicy.provenanceLabelBias ?? 0,
            selfRevisionPatchCount: 1,
            selfRevisionMemoryPolicyBias: Math.max(
              activeSelfRevisionPatch.memoryPolicy.strictnessBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.wrongThreadSuppressionBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.provenanceLabelBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.recallExpansionBias ?? 0,
              activeSelfRevisionPatch.memoryPolicy.shouldQuarantineUnsupportedCarry ? 0.2 : 0,
            ),
            selfRevisionRelationshipPostureBias: Math.max(
              activeSelfRevisionPatch.relationshipPosture.repairWindowBias ?? 0,
              activeSelfRevisionPatch.relationshipPosture.closenessCapBias ?? 0,
              activeSelfRevisionPatch.relationshipPosture.warmthReleaseBias ?? 0,
            ),
            selfRevisionResponsePostureBias: Math.max(
              activeSelfRevisionPatch.responsePosture.hypothesisLabelBias ?? 0,
              activeSelfRevisionPatch.responsePosture.specificityClampBias ?? 0,
            ),
            selfRevisionProactivePolicyBias: Math.max(
              activeSelfRevisionPatch.proactivePolicy.restraintBias ?? 0,
              activeSelfRevisionPatch.proactivePolicy.learningProposalBias ?? 0,
              activeSelfRevisionPatch.proactivePolicy.actuationCooldownBias ?? 0,
            ),
            selfRevisionValidationBias: Math.max(
              activeSelfRevisionPatch.validation.requiresRollbackCheck ? 1 : 0,
              activeSelfRevisionPatch.validation.requiresRevalidation ? 1 : 0,
            ),
          },
          reflectionTargetScope: activeSelfRevisionPatch.domain === 'relationship' || activeSelfRevisionPatch.domain === 'dialogue-style'
            ? 'relationship'
            : activeSelfRevisionPatch.domain === 'self-model'
              ? 'self'
              : null,
        })
      : null

    if (!runtimeSurface && !hostPersonModel)
      return null

    return sanitizeExecutionPersonStateProjection(buildAlicizationPersonStateProjection({
      now: Date.now(),
      contexts: [
        ...new Set([
          ...inferExecutionPersonStateContexts(),
          'execution-callback',
          'execution',
        ]),
      ],
      autobiographicalSelf: runtimeSurface?.memory.autobiographicalSelf ?? null,
      hostPersonModel: hostPersonModel ?? null,
      longHorizonMemory: runtimeSurface?.memory.longHorizonMemory ?? null,
      motiveEngine: runtimeSurface?.memory.motiveEngine ?? null,
      habitPolicy: runtimeSurface?.agency.habitPolicy ?? null,
      selfEvolution: activeSelfEvolution ?? runtimeSurface?.memory.selfEvolution ?? null,
      selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
      selfState: runtimeSurface?.agency.selfState ?? null,
      privateThought: runtimeSurface?.cognition.privateThought ?? null,
      mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
      previousContinuityState: runtimeSurface?.memory.personalityContinuityState ?? null,
    }))
  }

  return {
    persistExecutionDeliveryState,
    restoreExecutionDeliveryState,
    queueExecutionDeliveryCandidate,
    selectExecutionDeliveryReplySurface,
    generateExecutionCallbackStructuredWithGateway,
    resolveExecutionResultDeliveryPolicyForRuntime,
    resolveExecutionSelfContinuityAuthorityForRuntime,
    resolveExecutionHostPersonModelForRuntime,
    resolveExecutionKnowledgeEvidenceForRuntime,
    resolveExecutionPersonStateProjectionForRuntime,
    reconcileExecutionDeliveryCandidates,
  }
}
