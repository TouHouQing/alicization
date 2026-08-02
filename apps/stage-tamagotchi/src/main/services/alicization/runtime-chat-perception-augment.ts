import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationAuditLogInput,
  AlicizationMindTurnEventRecord,
  AlicizationSoulSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { SubconsciousCardState } from './runtime-soul'

import { deriveAlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import {
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
} from './attention-anchor'
import { updateVisualAttentionModel } from './attention-model'
import { commitAlicizationDigitalLifeSpine } from './digital-life-spine'
import { resolveHumanlikeMemoryRecallSeedFromEventHistory } from './humanlike-memory-recall-seed'
import { buildMindContinuityRecallSeed } from './mind-continuity'
import {
  buildProactiveLayeredContext,
  inferScenarioFromContext,
} from './proactive-layered-context'
import {
  buildChatInspectionContractSystemBlock,
  buildChatPerceptionSystemBlock,
} from './runtime-chat-prompt-blocks'
import {
  resolveInspectionGroundingContinuity,
  shouldSuppressWeakGenericBrowserInspectionAnchor,
  shouldUsePerceptionResidueAsLiveSceneSummary,
} from './runtime-perception-helpers'
import { buildVisualHeartbeat } from './visual-heartbeat'

interface CreateAlicizationChatPerceptionAugmentRuntimeOptions {
  sensoryRuntime: {
    prepareInteractivePerceptionPrelude: (input: {
      cardId: string
      userText: string
      messages: Message[]
      senderWebContentsId?: number | null
      skipInspectionGrounding?: boolean
    }) => Promise<any>
  }
  ensureProactiveLoopState: (cardIdRaw: unknown) => Promise<AlicizationProactiveLoopState>
  ensureSubconsciousState: (cardId: string) => Promise<SubconsciousCardState>
  getSoulSnapshot: () => AlicizationSoulSnapshot | null
  bootstrap: () => Promise<AlicizationSoulSnapshot>
  listPendingScheduledTaskCount: (limit: number) => Promise<number>
  buildDigitalLifeMindState: (input: any) => Promise<any>
  persistVisualPresenceState: (
    cardIdRaw: unknown,
    state: AlicizationVisualPresenceStateSnapshot,
    options?: {
      debounceWindowMs?: number
      fingerprint?: string
    },
  ) => Promise<void>
  visualPresenceCapturePersistDebounceWindowMs: number
  buildVisualPresenceCapturePersistFingerprint: (state: AlicizationVisualPresenceStateSnapshot) => string
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  listHumanlikeMemoryRecallEvents?: (input: {
    kind?: AlicizationMindTurnEventRecord['kind']
    limit: number
  }) => Promise<AlicizationMindTurnEventRecord[]>
}

export function createAlicizationChatPerceptionAugmentRuntime(options: CreateAlicizationChatPerceptionAugmentRuntimeOptions) {
  const {
    sensoryRuntime,
    ensureProactiveLoopState,
    ensureSubconsciousState,
    getSoulSnapshot,
    bootstrap,
    listPendingScheduledTaskCount,
    buildDigitalLifeMindState,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    appendAuditLog,
    listHumanlikeMemoryRecallEvents,
  } = options

  async function augmentMainChatMessagesWithPerception(input: {
    cardId: string
    userText: string
    messages: Message[]
    senderWebContentsId?: number | null
    skipInspectionGrounding?: boolean
  }) {
    const preparedPerception = await sensoryRuntime.prepareInteractivePerceptionPrelude({
      cardId: input.cardId,
      userText: input.userText,
      messages: input.messages,
      senderWebContentsId: input.senderWebContentsId,
      skipInspectionGrounding: input.skipInspectionGrounding,
    })
    const now = preparedPerception.now
    const perceptionState = preparedPerception.perceptionState
    let visualPresenceState = preparedPerception.visualPresenceState
    const messages = preparedPerception.messages
    const sensorySnapshot = preparedPerception.sensorySnapshot
    const inspectionIntent = preparedPerception.inspectionIntent
    const inspectionRequested = preparedPerception.inspectionRequested
    const inspectionRoutingSuppressed = preparedPerception.inspectionRoutingSuppressed
    const genericScreenInspection = preparedPerception.genericScreenInspection
    const currentForeground = preparedPerception.currentForeground ?? undefined
    const chatScreenSemanticSummary = preparedPerception.chatScreenSemanticSummary
    const auditAction = preparedPerception.auditAction
    const auditPayload = preparedPerception.auditPayload
    const captureGovernance = preparedPerception.captureGovernance

    const proactiveState = await ensureProactiveLoopState(input.cardId)
    const lateNightActiveMinutes = proactiveState.lateNightActivityStartedAt
      ? Math.max(0, (now - proactiveState.lateNightActivityStartedAt) / 60_000)
      : 0
    const subconsciousState = await ensureSubconsciousState(input.cardId)
    const soulForPerception = getSoulSnapshot() ?? await bootstrap()
    const reminderBacklog = await listPendingScheduledTaskCount(16)
    const chatLayeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext: {
        idleSeconds: null,
        inputActivity: 'unknown',
        fullscreenLikely: false,
        foregroundWindow: currentForeground,
        degraded: [],
      },
      subconsciousState,
      hostAttitude: soulForPerception.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveState.recentOutcomes,
      screenSemanticSummary: chatScreenSemanticSummary,
    })
    const chatScenario = inferScenarioFromContext({
      workload: chatLayeredContext.workload.kind,
      content: chatLayeredContext.content.kind,
      lateNight: chatLayeredContext.localTime.isLateNight,
      lateNightActiveMinutes: chatLayeredContext.relationship.lateNightActiveMinutes,
      fatigue: chatLayeredContext.relationship.fatigue,
    })
    const groundedResidue = getActivePerceptionSceneResidue(perceptionState, now)
    const useResidueAsLiveSceneSummary = captureGovernance.allowResidueAsLiveScene
      && shouldUsePerceptionResidueAsLiveSceneSummary({
        residue: groundedResidue,
        currentForeground,
        inspectionRequested,
        groundedThisTurn: auditAction === 'inspection-grounded',
      })
    const groundingContinuity = resolveInspectionGroundingContinuity({
      now,
      auditAction,
      auditReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
      residue: groundedResidue,
      currentForeground,
      useResidueAsLiveSceneSummary,
    })
    const groundedThisTurn = groundingContinuity.groundedThisTurn
    const chatHeartbeat = buildVisualHeartbeat({
      now,
      scenario: chatScenario,
      previousState: visualPresenceState,
      context: chatLayeredContext,
      invitedInspectionActive: inspectionRequested,
      groundedSummary: useResidueAsLiveSceneSummary ? groundedResidue?.summary ?? null : null,
      screenSemanticSummaryActive: groundedThisTurn && useResidueAsLiveSceneSummary,
      durabilityPulse: null,
    })
    const chatAttention = updateVisualAttentionModel({
      now,
      scenario: chatScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground,
      currentScene: chatHeartbeat.scene,
      invitedInspectionActive: inspectionRequested,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse: null,
    })
    const chatMindState = await buildDigitalLifeMindState({
      cardId: input.cardId,
      now,
      context: chatLayeredContext,
      userText: input.userText,
      recentMessages: input.messages,
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat: chatHeartbeat,
      attention: chatAttention,
      currentForeground,
      perceptionState,
      durabilityPulse: null,
      personalityAuthority: soulForPerception.frontmatter.personality,
      inspectionRequested,
      inspectionState: inspectionIntent.inspectionState,
      turnOwnershipHint: inspectionIntent.turnOwnershipHint,
      groundedThisTurn,
      cognitionMode: 'interactive',
    })
    const committedChatDigitalLifeSpine = commitAlicizationDigitalLifeSpine({
      now,
      previousState: visualPresenceState,
      watchMode: chatHeartbeat.watchMode,
      scene: chatHeartbeat.scene,
      attention: chatAttention,
      mindState: chatMindState,
      captureState: captureGovernance.nextCaptureState,
      durabilityPulse: null,
      recentTransition: chatHeartbeat.recentTransition,
      nextSuggestedProbeMs: chatHeartbeat.nextSuggestedProbeMs,
    })
    visualPresenceState = committedChatDigitalLifeSpine.nextState
    const chatRuntimeSurface = committedChatDigitalLifeSpine.current.runtimeSurface
    const chatDigitalLifeArchitecture = committedChatDigitalLifeSpine.current.architecture
    await persistVisualPresenceState(input.cardId, visualPresenceState, {
      debounceWindowMs: visualPresenceCapturePersistDebounceWindowMs,
      fingerprint: buildVisualPresenceCapturePersistFingerprint(visualPresenceState),
    })
    const chatRuntimeSnapshot = deriveAlicizationRuntimeSnapshot({
      spine: committedChatDigitalLifeSpine.current,
    })
    const systemBlocks: string[] = []
    const promptSystemBlocks = [
      buildChatPerceptionSystemBlock({
        now,
        state: perceptionState,
        inspectionRequested,
        currentForeground,
        suppressWeakGenericBrowserAnchor: genericScreenInspection || (inspectionRequested && shouldSuppressWeakGenericBrowserInspectionAnchor({
          now,
          userText: input.userText,
          state: perceptionState,
          currentForeground,
          groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
        })),
      }),
      inspectionRequested
        ? buildChatInspectionContractSystemBlock({
            now,
            state: perceptionState,
            mode: auditAction === 'inspection-grounded' ? 'grounded-screenshot' : 'perception-only',
            permissionStatus: typeof auditPayload.permissionStatus === 'string' ? auditPayload.permissionStatus : undefined,
            unavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            captureHealth: visualPresenceState.captureState.health,
            captureDegradedReasons: captureGovernance.auditPayload.captureDegradedReasons,
            suppressWeakGenericBrowserAnchor: genericScreenInspection || shouldSuppressWeakGenericBrowserInspectionAnchor({
              now,
              userText: input.userText,
              state: perceptionState,
              currentForeground,
              groundingUnavailableReason: typeof auditPayload.reason === 'string' ? auditPayload.reason : undefined,
            }),
          })
        : '',
    ].filter(Boolean)

    if (inspectionRequested || inspectionRoutingSuppressed || systemBlocks.length > 0) {
      await appendAuditLog({
        level: 'notice',
        category: 'alicization.perception',
        action: auditAction,
        message: inspectionRequested
          ? 'Prepared invited inspection context for the current chat turn.'
          : inspectionRoutingSuppressed
            ? 'Skipped invited inspection grounding because executor routing intent is active for this turn.'
            : 'Prepared Alicization short-lived perception context for the current chat turn.',
        payload: {
          ...auditPayload,
          groundingContinuity: {
            groundedThisTurn,
            source: groundingContinuity.source,
            overlapScore: groundingContinuity.overlapScore,
          },
          digitalLifeArchitecture: chatDigitalLifeArchitecture
            ? {
                operatingMode: chatDigitalLifeArchitecture.operatingMode,
                dominantSystem: chatDigitalLifeArchitecture.dominantSystem,
                supportingSystems: [...chatDigitalLifeArchitecture.supportingSystems],
                governingFocus: chatDigitalLifeArchitecture.governingFocus,
                summary: chatDigitalLifeArchitecture.summary,
              }
            : null,
          runtimeDigest: chatRuntimeSnapshot
            ? {
                dominantChannel: chatRuntimeSnapshot.dominantChannel,
                shouldProactivelySpeak: chatRuntimeSnapshot.shouldProactivelySpeak,
                shouldProactivelyAct: chatRuntimeSnapshot.shouldProactivelyAct,
                continuityPressure: chatRuntimeSnapshot.continuityPressure,
                companionshipPressure: chatRuntimeSnapshot.companionshipPressure,
                summary: chatRuntimeSnapshot.summary,
              }
            : null,
          providerDialogue: {
            messageCount: messages.length,
            ordinaryReplyOwner: 'provider',
          },
          visualPresence: {
            watchMode: visualPresenceState.watchMode,
            currentScene: visualPresenceState.currentScene,
            mindTurnFrame: visualPresenceState.mindTurnFrame,
            discourseState: visualPresenceState.discourseState,
            mindSynthesis: visualPresenceState.mindSynthesis,
            conversationState: visualPresenceState.conversationState,
            dialogueWorldThread: visualPresenceState.dialogueWorldThread,
            dialogueActKernel: visualPresenceState.dialogueActKernel,
            answerCompiler: visualPresenceState.answerCompiler,
            replyDeliberation: visualPresenceState.replyDeliberation,
            recallGovernor: visualPresenceState.recallGovernor,
            hypothesisGraph: visualPresenceState.hypothesisGraph,
            threadRuntime: visualPresenceState.threadRuntime,
            privateThought: visualPresenceState.privateThought,
          },
          dialogueSemantics: chatMindState.dialogueSemantics,
          dialogueObligation: chatMindState.dialogueObligation,
          dialogueFocus: chatMindState.dialogueFocus,
        },
      }, input.cardId)
    }
    const humanlikeMemoryRecallSeed = await resolveHumanlikeMemoryRecallSeedFromEventHistory({
      listHumanlikeMemoryRecallEvents,
      limit: 24,
    })

    return {
      messages,
      systemBlocks,
      promptSystemBlocks,
      digitalLifeSpine: committedChatDigitalLifeSpine.current,
      digitalLifeRuntimeSurface: chatRuntimeSurface,
      memoryRecallSeed: [
        visualPresenceState.recallGovernor?.recallSeed,
        humanlikeMemoryRecallSeed,
        buildMindContinuityRecallSeed(chatRuntimeSurface),
      ].filter(Boolean).join(' | '),
      recallGovernor: visualPresenceState.recallGovernor,
      capture: {
        inspectionRequested,
        groundedThisTurn,
        snapshot: captureGovernance.capture,
        fallbackReason: captureGovernance.fallbackReason,
      },
      chatGovernance: {
        turnMode: 'answer' as const,
        personaKernelMode: 'full' as const,
        mindTurnContract: null,
        mindTurnGovernance: null,
      },
    }
  }

  return {
    augmentMainChatMessagesWithPerception,
  }
}
