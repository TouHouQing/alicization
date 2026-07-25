import type {
  AlicizationExecutionEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationTaskThreadRecord,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type {
  AlicizationPendingExecutionDeliveryProjectState,
  createAlicizationExecutionDeliveryRuntime,
} from './execution-delivery-runtime'
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
  return sanitizeAlicizationProviderFacingText(ledgerText, maxChars, '') || null
}

function sanitizeExecutionDeliveryProjectControlText(raw: unknown, maxChars = 120) {
  const ledgerText = sanitizeExecutionLedgerText(raw, maxChars)
  if (!ledgerText)
    return null
  return sanitizeAlicizationProviderFacingText(ledgerText, maxChars, '') || null
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
    ...projection,
    personalityContinuityState: sanitizeExecutionPersonalityContinuityState(projection.personalityContinuityState),
    openingGuidance: sanitizeExecutionProjectionCarryText(projection.openingGuidance, 320),
    manifestationCadenceSummary: sanitizeExecutionProjectionCarryText(projection.manifestationCadenceSummary, 320),
    preferenceText: sanitizeExecutionProjectionRequiredText(projection.preferenceText, 320),
    sensitivityText: sanitizeExecutionProjectionRequiredText(projection.sensitivityText, 320),
    repairTriggerText: sanitizeExecutionProjectionRequiredText(projection.repairTriggerText, 320),
    burdenText: sanitizeExecutionProjectionRequiredText(projection.burdenText, 320),
    routineText: sanitizeExecutionProjectionRequiredText(projection.routineText, 320),
    trustRationale: sanitizeExecutionProjectionRequiredText(projection.trustRationale, 320),
    relationshipDoctrine: sanitizeExecutionProjectionRequiredText(projection.relationshipDoctrine, 320),
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

function normalizeExecutionDeliveryProjectBriefing(
  projectBriefing: unknown,
): AlicizationPendingExecutionDeliveryProjectState | null {
  if (!projectBriefing || typeof projectBriefing !== 'object' || Array.isArray(projectBriefing))
    return null

  const record = projectBriefing as Record<string, unknown>
  const normalized = {
    continuityArcStage: sanitizeExecutionDeliveryProjectControlText(record.continuityArcStage, 120),
    continuityRestraint: sanitizeExecutionDeliveryProjectControlText(record.continuityRestraint, 64),
    continuityPreferredTiming: sanitizeExecutionDeliveryProjectControlText(record.continuityPreferredTiming, 120),
    continuityCadence: sanitizeExecutionDeliveryProjectControlText(record.continuityCadence, 120),
    preferredBlinkCadence: sanitizeExecutionDeliveryProjectControlText(record.preferredBlinkCadence, 32),
    preferredGazeMode: sanitizeExecutionDeliveryProjectControlText(record.preferredGazeMode, 32),
    preferredPauseMode: sanitizeExecutionDeliveryProjectControlText(record.preferredPauseMode, 32),
    preferredLipsyncMode: sanitizeExecutionDeliveryProjectControlText(record.preferredLipsyncMode, 32),
    preferredVoiceMode: sanitizeExecutionDeliveryProjectControlText(record.preferredVoiceMode, 32),
    preferredPacingMode: sanitizeExecutionDeliveryProjectControlText(record.preferredPacingMode, 32),
  } satisfies AlicizationPendingExecutionDeliveryProjectState

  return Object.values(normalized).some(Boolean) ? normalized : null
}

function preferExecutionDeliveryProjectBriefingText(input: {
  current?: string | null
  candidate?: string | null
}) {
  const current = sanitizeExecutionLedgerText(input.current, 320) || ''
  const candidate = sanitizeExecutionLedgerText(input.candidate, 320) || ''

  if (!current)
    return candidate || null
  if (!candidate)
    return current || null
  if (current === candidate)
    return current

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function mergeExecutionDeliveryProjectBriefingPair(input: {
  current: AlicizationPendingExecutionDeliveryProjectState
  candidate: AlicizationPendingExecutionDeliveryProjectState
}): AlicizationPendingExecutionDeliveryProjectState {
  return {
    continuityArcStage: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityArcStage,
      candidate: input.candidate.continuityArcStage,
    }),
    continuityRestraint: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityRestraint,
      candidate: input.candidate.continuityRestraint,
    }),
    continuityPreferredTiming: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityPreferredTiming,
      candidate: input.candidate.continuityPreferredTiming,
    }),
    continuityCadence: preferExecutionDeliveryProjectBriefingText({
      current: input.current.continuityCadence,
      candidate: input.candidate.continuityCadence,
    }),
    preferredBlinkCadence: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredBlinkCadence,
      candidate: input.candidate.preferredBlinkCadence,
    }),
    preferredGazeMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredGazeMode,
      candidate: input.candidate.preferredGazeMode,
    }),
    preferredPauseMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredPauseMode,
      candidate: input.candidate.preferredPauseMode,
    }),
    preferredLipsyncMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredLipsyncMode,
      candidate: input.candidate.preferredLipsyncMode,
    }),
    preferredVoiceMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredVoiceMode,
      candidate: input.candidate.preferredVoiceMode,
    }),
    preferredPacingMode: preferExecutionDeliveryProjectBriefingText({
      current: input.current.preferredPacingMode,
      candidate: input.candidate.preferredPacingMode,
    }),
  }
}

function mergeExecutionDeliveryProjectBriefings(
  ...briefings: Array<AlicizationPendingExecutionDeliveryProjectState | null | undefined>
) {
  let merged: AlicizationPendingExecutionDeliveryProjectState | null = null

  for (const briefing of briefings) {
    if (!briefing)
      continue
    merged = merged
      ? mergeExecutionDeliveryProjectBriefingPair({
          current: merged,
          candidate: briefing,
        })
      : briefing
  }

  return merged && Object.values(merged).some(Boolean) ? merged : null
}

function readThreadExecutionDeliveryProjectState(
  thread: AlicizationTaskThreadRecord,
): AlicizationPendingExecutionDeliveryProjectState | null {
  const metadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
    ? thread.metadata as {
      execution?: {
        runtimeContext?: {
          projectBriefing?: {
            currentPhase?: unknown
            identity?: unknown
            latestLandedProgress?: unknown
            latestProgress?: unknown
            landedProgressSummary?: unknown
            nextClosureTarget?: unknown
            nextClosureTargetSummary?: unknown
            preDialogueAwarenessLine?: unknown
            preDialogueAwarenessSummary?: unknown
            preflightSummary?: unknown
            companionHeadlineLine?: unknown
            companionBriefingLine?: unknown
            emotionalClosureSummary?: unknown
            continuityCue?: unknown
            continuityPreferredTiming?: unknown
            continuityCadence?: unknown
            preferredBlinkCadence?: unknown
            preferredGazeMode?: unknown
            preferredVoiceMode?: unknown
            preferredPacingMode?: unknown
            primaryOpenLoop?: unknown
            openClosureSummary?: unknown
            sameHerDriftRisk?: unknown
            sameHerDriftRiskSummary?: unknown
            sameHerHoldDetail?: unknown
            sameHerSelfLine?: unknown
          } | null
        } | null
      } | null
    }
    : null
  return normalizeExecutionDeliveryProjectBriefing(metadata?.execution?.runtimeContext?.projectBriefing)
}

function readExecutionDeliveryPayloadObject(payload: unknown) {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
}

type AlicizationExecutionDeliveryEventSnapshot = Pick<
  AlicizationExecutionEventRecord,
  'createdAt' | 'kind' | 'payload'
>

function readExecutionDeliveryProjectBriefingFromLatestEvent(
  events: AlicizationExecutionDeliveryEventSnapshot[] | null | undefined,
) {
  const latestEvent = readLatestExecutionEvent(events ?? [])
  const payload = readExecutionDeliveryPayloadObject(latestEvent?.payload)
  const runtimeContext = readExecutionDeliveryPayloadObject(payload?.runtimeContext)
  return normalizeExecutionDeliveryProjectBriefing(runtimeContext?.projectBriefing)
}

function readExecutionDeliveryProjectBriefingFromResumeEvent(
  events: AlicizationExecutionDeliveryEventSnapshot[] | null | undefined,
) {
  const latestResumeEvent = readLatestExecutionEvent(events ?? [], ['resume'])
  const payload = readExecutionDeliveryPayloadObject(latestResumeEvent?.payload)
  if (!payload)
    return null

  return normalizeExecutionDeliveryProjectBriefing({
    identity: payload.projectIdentity,
    currentPhase: payload.projectPhase,
    latestLandedProgress: payload.latestLandedProgress,
    primaryOpenLoop: payload.primaryOpenLoop,
    nextClosureTarget: payload.nextClosureTarget,
    sameHerSelfLine: payload.sameHerLine,
    sameHerHoldDetail: payload.projectSameHerHoldDetail,
    sameHerDriftRisk: payload.sameHerDriftRisk,
    proactiveSameHerGap: payload.proactiveSameHerGap,
    preflightSummary: payload.projectPreflight,
    preDialogueAwarenessLine: payload.projectAwareness,
    companionBriefingLine: payload.projectCompanionBriefing,
    emotionalClosureSummary: payload.projectEmotionalClosure,
    continuityArcStage: payload.projectContinuityArcStage,
    continuityRestraint: payload.projectContinuityRestraint,
    continuityCue: payload.projectContinuityCue,
    continuityPreferredTiming: payload.projectContinuityPreferredTiming,
    continuityCadence: payload.projectContinuityCadence,
    preferredBlinkCadence: payload.projectBlinkCadence,
    preferredGazeMode: payload.projectGazeMode,
    preferredPauseMode: payload.projectPauseMode,
    preferredLipsyncMode: payload.projectLipsyncMode,
    preferredVoiceMode: payload.projectVoiceMode,
    preferredPacingMode: payload.projectPacingMode,
  })
}

function mergeExecutionDeliveryProjectState(input: {
  threadProjectState: AlicizationPendingExecutionDeliveryProjectState | null
  events: AlicizationExecutionDeliveryEventSnapshot[]
}) {
  return mergeExecutionDeliveryProjectBriefings(
    input.threadProjectState,
    readExecutionDeliveryProjectBriefingFromResumeEvent(input.events),
    readExecutionDeliveryProjectBriefingFromLatestEvent(input.events),
  )
}

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
    const completedAt = Number.isFinite(latestEvent?.createdAt)
      ? Math.max(0, Math.floor(Number(latestEvent?.createdAt)))
      : readTaskThreadActivityAt(input.thread)
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
      projectState: mergeExecutionDeliveryProjectState({
        threadProjectState: readThreadExecutionDeliveryProjectState(input.thread),
        events,
      }),
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
    projectState?: AlicizationPendingExecutionDeliveryProjectState | null
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
      status: input.status === 'completed' || input.status === 'failed' || input.status === 'blocked' || input.status === 'cancelled'
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
              activeSelfRevisionPatch.responsePosture.templateShellSuppressionBias ?? 0,
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
  }
}
