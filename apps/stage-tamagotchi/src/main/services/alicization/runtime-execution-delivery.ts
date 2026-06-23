import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationTaskThreadRecord,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { createAlicizationExecutionDeliveryRuntime } from './execution-delivery-runtime'
import type {
  AlicizationExecutionDeliveryReplySelection,
} from './execution-delivery-surface'
import type { AlicizationExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'

import { buildAlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { hasAlicizationExecutionDeliveryRetainedState } from './execution-delivery-runtime'
import {
  buildAlicizationExecutionPayoffDeterministicStructured,
  buildAlicizationExecutionPayoffPrompt,
  buildAlicizationExecutionPayoffStructuredReply,
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
import { inferHostSocialContextsFromText } from './host-social-guidance'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import { buildAlicizationSelfEvolutionKernel } from './self-evolution-kernel'

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
  getActiveSelfRevisionStatePatch?: () => Promise<AlicizationSelfRevisionStatePatch | null>
  getActiveSelfEvolutionCandidateId?: () => Promise<string | null>
  getActiveSelfEvolutionSnapshot?: () => Promise<unknown>
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

function carriesStrongerSameHerContinuity(projection: AlicizationPersonStateProjection | null | undefined) {
  return Boolean(
    projection
    && (
      projection.restrained
      || /lower-pressure|same-her|steadiness before closeness/i.test([
        projection.openingGuidance,
        projection.relationshipDoctrine,
        projection.summary,
        projection.trustRationale,
      ]
        .filter(Boolean)
        .join(' '))
    ),
  )
}

function activeSameHerContinuityShouldOverride(input: {
  projection: AlicizationPersonStateProjection | null | undefined
  activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch | null
}) {
  const patch = input.activeSelfRevisionPatch
  if (!patch)
    return false
  if (carriesStrongerSameHerContinuity(input.projection))
    return false

  const summary = [
    patch.summary,
    ...patch.reasonCodes,
    ...patch.lanes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    /same-her|lower-pressure|slower than|steadiness before closeness/i.test(summary)
    || patch.relationshipPosture.closenessCapBias >= 0.18
    || patch.relationshipPosture.repairWindowBias >= 0.16
    || patch.proactivePolicy.restraintBias >= 0.08
  )
}

function applyActiveSameHerContinuityToProjection(input: {
  projection: AlicizationPersonStateProjection
  activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch | null
}) {
  if (!activeSameHerContinuityShouldOverride(input))
    return input.projection

  const continuitySummary = input.activeSelfRevisionPatch?.summary?.trim() || 'preserve the current same-her baseline'
  const nextSummaryParts = [
    input.projection.summary,
    `continuity=${continuitySummary}`,
  ].filter(Boolean)

  return {
    ...input.projection,
    contexts: [
      ...new Set([
        ...(input.projection.contexts ?? []),
        'execution-callback',
        'execution',
      ]),
    ],
    activeClosenessContext: 'execution-callback',
    activeClosenessRung: 'measured-room',
    relationshipPosture: 'restrained',
    openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
    preferredProactiveStyle: 'silent-observe',
    manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation lower-pressure and less eager before closeness widens again.',
    trustRationale: input.projection.trustRationale || 'Trust holds when the opening stays lower-pressure and less eager.',
    relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
    cautious: true,
    restrained: true,
    summary: nextSummaryParts.join(' | ').slice(0, 520),
    personalityContinuityState: {
      ...input.projection.personalityContinuityState,
      currentRegime: 'execution-callback',
      closenessPosture: 'space-first',
      repairPosture: 'repair-first',
    },
  }
}

function buildMinimalActiveSameHerProjection(input: {
  activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch
  goal?: string | null
}): AlicizationPersonStateProjection {
  const continuitySummary = input.activeSelfRevisionPatch.summary?.trim() || 'preserve the current same-her baseline'
  return {
    contexts: [
      ...new Set([
        ...inferExecutionPersonStateContexts(input.goal),
        'execution-callback',
        'execution',
      ]),
    ],
    activeClosenessContext: 'execution-callback',
    activeClosenessRung: 'measured-room',
    closenessLadder: [{
      context: 'execution-callback',
      rung: 'measured-room',
      preference: 'Deliver the result cleanly, but leave room before widening closeness.',
      rationale: `continuity=${continuitySummary}`,
      confidence: 0.82,
    }],
    relationshipPosture: 'restrained',
    openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
    preferredProactiveStyle: 'silent-observe',
    manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation lower-pressure and less eager before closeness widens again.',
    preferenceText: 'Keep callback timing lower-pressure.',
    sensitivityText: 'Over-close callback warmth becomes pressure.',
    repairTriggerText: 'If closeness jumps too fast, reopen lighter.',
    burdenText: 'Execution callback warmth should not crowd the host.',
    routineText: '',
    trustRationale: 'Trust holds when callback timing stays measured.',
    relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
    cautious: true,
    restrained: true,
    summary: `regime=execution-callback | posture=restrained | continuity=${continuitySummary}`.slice(0, 520),
    personalityContinuityState: {
      growthProfile: buildAlicizationDialogueGrowthProfile({}),
      currentRegime: 'execution-callback',
      trustStage: 'settling',
      closenessPosture: 'space-first',
      repairPosture: 'repair-first',
      autonomyPosture: 'protect-space',
      cadenceProfile: 'slow-return',
      energyProfile: 'steady',
      continuitySummary: continuitySummary.slice(0, 220),
      regimeModel: {
        dominantRegime: 'execution-callback',
        confidence: 0.72,
        primaryReason: 'execution callback should return with measured continuity',
        carryReason: null,
        carryFrom: null,
        signals: ['execution-callback', 'same-her-baseline'],
        scores: {
          'focused-work': 0.18,
          'late-night-care': 0.12,
          'repair-window': 0.28,
          'execution-callback': 0.72,
          'open-companionship': 0.24,
          'general': 0.34,
        },
      },
      rhythmState: {
        cadenceMode: 'cooldown',
        silenceNeed: 'medium',
        interruptionTolerance: 'low',
        restMode: 'ordinary',
        embodiedPresence: 'attentive',
        suggestedStyle: 'silent-observe',
        moodLabel: 'measured execution return',
        emotionalTension: 'focused-flow',
        cadencePressure: 0.42,
        restPressure: 0.34,
        memoryResonance: 0.52,
        companionshipTempo: 0.38,
        summary: 'Measured execution callback rhythm with low-pressure continuity.',
        rationale: ['execution-callback', 'same-her-baseline', 'lower-pressure'],
      },
      trustMeaning: 'callback timing stays trustworthy when it returns lower-pressure.',
      reconsolidationLine: continuitySummary.slice(0, 220),
      selfLine: 'same local digital life, returning through execution without restarting herself',
      relationLine: 'measured callback continuity before widening closeness',
      currentPreoccupation: 'finish the execution return without crowding the host',
      rationale: ['execution-callback', 'same-her-baseline', 'lower-pressure'],
      updatedAt: Date.now(),
    },
  }
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
      visibleReplyAuthority: 'llm-second-pass-rewrite',
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

    return {
      ...buildAlicizationExecutionPayoffStructuredReply({
        mode: 'callback-delivery',
        channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
        goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
        status: formatExecutionDeliveryStatus(input.status),
        summary: sanitizeExecutionLedgerText(input.summary, 220),
        outcome: sanitizeExecutionLedgerText(input.outcome, 240),
        personStateProjection: input.personStateProjection ?? null,
        thought,
        emotion: performance.baseEmotion,
        delivery: performance.delivery,
        performance: performance as any,
      }),
      reply,
      thought,
      emotion: performance.baseEmotion,
      performance: performance as any,
    }
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
    const sessionRuntimeSurface = input.agentTurn?.getSessionSnapshot().digitalLifeSpine?.runtimeSurface ?? null
    const sessionProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(sessionRuntimeSurface?.memory.derivedMindStateBundle ?? null)
      ?? sessionRuntimeSurface?.memory.personStateProjection
      ?? null
    const sessionSelfEvolution = sessionRuntimeSurface?.memory.selfEvolution
      ?? sessionRuntimeSurface?.memory.derivedMindStateBundle?.selfEvolution
      ?? null
    const liveRuntimeSurface = !sessionSelfEvolution
      ? await (async () => {
          const state = await options.ensureVisualPresenceState(input.cardId).catch(() => null)
          return state ? buildAlicizationDigitalLifeRuntimeSurface(state) : null
        })()
      : null
    const liveProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(liveRuntimeSurface?.memory.derivedMindStateBundle ?? null)
      ?? liveRuntimeSurface?.memory.personStateProjection
      ?? null
    const activeSelfRevisionPatch = await options.getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null
    const activeSelfEvolutionCandidateId = await options.getActiveSelfEvolutionCandidateId?.().catch(() => null) ?? null
    const liveSelfEvolution = liveRuntimeSurface?.memory.selfEvolution
      ?? liveRuntimeSurface?.memory.derivedMindStateBundle?.selfEvolution
      ?? null
    const liveProjectionCarriesStrongerContinuity = carriesStrongerSameHerContinuity(liveProjection)
      && !carriesStrongerSameHerContinuity(sessionProjection)
    const runtimeSurface = !sessionSelfEvolution && (liveSelfEvolution || liveProjectionCarriesStrongerContinuity)
      ? liveRuntimeSurface
      : sessionRuntimeSurface ?? liveRuntimeSurface

    const bundleProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(runtimeSurface?.memory.derivedMindStateBundle ?? null)
    if (bundleProjection) {
      return applyActiveSameHerContinuityToProjection({
        projection: bundleProjection as AlicizationPersonStateProjection,
        activeSelfRevisionPatch,
      })
    }
    if (runtimeSurface?.memory.personStateProjection) {
      return applyActiveSameHerContinuityToProjection({
        projection: runtimeSurface.memory.personStateProjection,
        activeSelfRevisionPatch,
      })
    }

    const hostPersonModel = runtimeSurface?.memory.hostPersonModel
      ?? await resolveExecutionHostPersonModelForRuntime(input)
    const activeSelfEvolution = activeSelfRevisionPatch
      ? buildAlicizationSelfEvolutionKernel({
          hostPersonModel: hostPersonModel ?? null,
          learningPolicyState: {
            strictnessBias: activeSelfRevisionPatch.memoryPolicy.strictnessBias ?? 0,
            wrongThreadSuppressionBias: activeSelfRevisionPatch.memoryPolicy.wrongThreadSuppressionBias ?? 0,
            provenanceLabelBias: activeSelfRevisionPatch.memoryPolicy.provenanceLabelBias ?? 0,
            reasonCodes: activeSelfRevisionPatch.reasonCodes ?? [],
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
              activeSelfRevisionPatch.responsePosture.secondPassRequiredBias ?? 0,
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
            selfRevisionReasonCodes: [
              ...(activeSelfRevisionPatch.reasonCodes ?? []),
              ...(activeSelfRevisionPatch.lanes ?? []).map(lane => `lane:${lane}`),
              activeSelfEvolutionCandidateId ? `candidate:${activeSelfEvolutionCandidateId}` : null,
            ].filter((value): value is string => Boolean(value)).slice(0, 24),
          },
          reflectionLesson: activeSelfRevisionPatch.summary,
          reflectionTargetScope: activeSelfRevisionPatch.domain === 'relationship' || activeSelfRevisionPatch.domain === 'dialogue-style'
            ? 'relationship'
            : activeSelfRevisionPatch.domain === 'self-model'
              ? 'self'
              : null,
        })
      : null

    if (!runtimeSurface && !hostPersonModel) {
      if (activeSelfRevisionPatch) {
        return buildMinimalActiveSameHerProjection({
          activeSelfRevisionPatch,
          goal: input.goal,
        })
      }
      return null
    }

    const sessionProjectionCarriesStrongerContinuity = carriesStrongerSameHerContinuity(sessionProjection)
    const activeSelfEvolutionCarriesStrongerContinuity = Boolean(
      activeSelfEvolution
      && /lower-pressure|same-her|steadiness before closeness|pressure|slower return/i.test([
        activeSelfEvolution.relationshipDoctrine,
        activeSelfEvolution.trustMeaning,
        activeSelfEvolution.summary,
        ...(activeSelfEvolution.sourceSignals ?? []),
      ]
        .filter(Boolean)
        .join(' ')),
    )

    return applyActiveSameHerContinuityToProjection({
      projection: buildAlicizationPersonStateProjection({
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
        selfEvolution: activeSelfEvolutionCarriesStrongerContinuity && !sessionProjectionCarriesStrongerContinuity
          ? activeSelfEvolution
          : runtimeSurface?.memory.selfEvolution ?? activeSelfEvolution ?? null,
        selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
        selfState: runtimeSurface?.agency.selfState ?? null,
        privateThought: runtimeSurface?.cognition.privateThought ?? null,
        mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
        previousContinuityState: runtimeSurface?.memory.personalityContinuityState ?? null,
      }),
      activeSelfRevisionPatch,
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
