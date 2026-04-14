import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationAuditLogInput,
  AlicizationRecallGovernorSnapshot,
  AlicizationSoulSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { SubconsciousCardState } from './runtime-soul'

import {
  buildAlicizationRuntimeSystemBlock,
  deriveAlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import { buildAnswerCompilerSystemBlock } from './answer-compiler'
import { buildAlicizationAnswerPlannerSystemBlock } from './answer-planner'
import {
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isInternalAlicizationRepairPrompt,
} from './attention-anchor'
import { updateVisualAttentionModel } from './attention-model'
import { buildAlicizationMindTurnGovernance } from './chat-mind-governance'
import {
  buildClaimEvidenceLedgerSystemBlock,
} from './claim-evidence-ledger'
import { buildConversationStateSystemBlock } from './conversation-state'
import { buildCurrentConsciousFrameSystemBlock } from './current-conscious-frame'
import { buildDialogueActKernelSystemBlock } from './dialogue-act-kernel'
import { buildDialogueFocusGovernanceSystemBlock } from './dialogue-focus-governor'
import { buildAlicizationDialogueObligationSystemBlock } from './dialogue-obligation'
import { buildDialogueTurnEncounterSystemBlock } from './dialogue-turn-encounter'
import { buildDialogueWorldThreadSystemBlock } from './dialogue-world-thread'
import { commitAlicizationDigitalLifeSpine } from './digital-life-spine'
import { buildDiscourseStateSystemBlock } from './discourse-state'
import { buildAlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import { buildMindContinuityRecallSeed } from './mind-continuity'
import { buildMindSynthesisSystemBlock } from './mind-synthesizer'
import {
  buildProactiveLayeredContext,
  inferScenarioFromContext,
} from './proactive-layered-context'
import { buildRecallGovernorSystemBlock } from './recall-governor'
import { buildReplyDeliberationSystemBlock } from './reply-deliberator'
import {
  buildAlicizationResponseCharter,
  buildAlicizationResponseCharterSystemBlock,
} from './response-charter'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'
import {
  buildChatInspectionContractSystemBlock,
  buildChatPerceptionSystemBlock,
  buildChatVisualPresenceSystemBlock,
  buildCompactMindTurnControlSystemBlock,
} from './runtime-chat-prompt-blocks'
import {
  compactMindGovernedChatMessages,
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
  } = options

  async function augmentMainChatMessagesWithPerception(input: {
    cardId: string
    userText: string
    messages: Message[]
    senderWebContentsId?: number | null
    skipInspectionGrounding?: boolean
  }) {
    if (isInternalAlicizationRepairPrompt(input.userText)) {
      return {
        messages: input.messages,
        systemBlocks: [] as string[],
        promptSystemBlocks: [] as string[],
        digitalLifeRuntimeSurface: null,
        memoryRecallSeed: '',
        recallGovernor: null as AlicizationRecallGovernorSnapshot | null,
        capture: {
          inspectionRequested: false,
          groundedThisTurn: false,
          snapshot: null,
          fallbackReason: null,
        },
        chatGovernance: {
          suppressAssociativeRecall: false,
          turnMode: 'answer' as const,
          personaKernelMode: 'full' as const,
          mindTurnGovernance: null,
        },
      }
    }

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
    let messages = preparedPerception.messages
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
    const responseCharter = buildAlicizationResponseCharter({
      context: chatLayeredContext,
      state: visualPresenceState,
      runtimeSurface: chatRuntimeSurface,
      inspectionRequested,
      dialogueActKernel: chatMindState.dialogueActKernel ?? undefined,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      discourseState: chatMindState.discourseState ?? undefined,
      mindSynthesis: chatMindState.mindSynthesis ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      currentConsciousFrame: chatMindState.currentConsciousFrame ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
    })
    const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({
      now,
      inspectionRequested,
      groundedThisTurn,
      currentForeground,
      perceptionState,
      visualPresenceState,
      runtimeSurface: chatRuntimeSurface,
      responseCharter,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      discourseState: chatMindState.discourseState ?? undefined,
      mindSynthesis: chatMindState.mindSynthesis ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
    })
    const responseSurfaceContract = buildAlicizationResponseSurfaceContract({
      brief: executiveAnswerBrief.brief,
      charter: responseCharter,
      dialogueActKernel: chatMindState.dialogueActKernel ?? undefined,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueSemantics: chatMindState.dialogueSemantics ?? undefined,
      dialogueObligation: chatMindState.dialogueObligation ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      answerCompiler: chatMindState.answerCompiler ?? undefined,
      claimEvidenceLedger: chatMindState.claimEvidenceLedger ?? undefined,
      runtimeSurface: chatRuntimeSurface,
    })
    const compactedMessages = executiveAnswerBrief.brief.shouldCompactHistory
      ? compactMindGovernedChatMessages({
          messages,
          keepRecentUserTurns: executiveAnswerBrief.brief.maxRecentUserTurns,
        })
      : {
          messages,
          beforeCount: messages.length,
          afterCount: messages.length,
        }
    messages = compactedMessages.messages
    await persistVisualPresenceState(input.cardId, visualPresenceState, {
      debounceWindowMs: visualPresenceCapturePersistDebounceWindowMs,
      fingerprint: buildVisualPresenceCapturePersistFingerprint(visualPresenceState),
    })
    const mindTurnGovernance = buildAlicizationMindTurnGovernance({
      brief: executiveAnswerBrief.brief,
      charter: responseCharter,
      surfaceContract: responseSurfaceContract.contract,
      mindTurnFrame: visualPresenceState.mindTurnFrame,
      kernel: visualPresenceState.dialogueActKernel,
      discourseState: visualPresenceState.discourseState,
      conversationState: visualPresenceState.conversationState,
      dialogueWorldThread: visualPresenceState.dialogueWorldThread,
      answerCompiler: visualPresenceState.answerCompiler,
      answerPlanner: visualPresenceState.answerPlanner,
      replyDeliberation: visualPresenceState.replyDeliberation,
      recallGovernor: visualPresenceState.recallGovernor,
      claimEvidenceLedger: visualPresenceState.claimEvidenceLedger,
      privateThought: visualPresenceState.privateThought,
      mindMode: visualPresenceState.mindKernel?.dominantMode ?? null,
      dialogueEncounter: chatMindState.dialogueEncounter ?? undefined,
      dialogueFocus: chatMindState.dialogueFocus ?? undefined,
      groundedThisTurn,
      runtimeSurface: chatRuntimeSurface,
    })
    const chatRuntimeSnapshot = deriveAlicizationRuntimeSnapshot({
      spine: committedChatDigitalLifeSpine.current,
    })
    const chatRuntimeSystemBlock = buildAlicizationRuntimeSystemBlock(chatRuntimeSnapshot)

    const systemBlocks = [
      visualPresenceState.dialogueActKernel
        ? buildDialogueActKernelSystemBlock(visualPresenceState.dialogueActKernel)
        : '',
      visualPresenceState.discourseState
        ? buildDiscourseStateSystemBlock(visualPresenceState.discourseState)
        : '',
      visualPresenceState.mindSynthesis
        ? buildMindSynthesisSystemBlock(visualPresenceState.mindSynthesis)
        : '',
      visualPresenceState.conversationState
        ? buildConversationStateSystemBlock(visualPresenceState.conversationState)
        : '',
      visualPresenceState.dialogueWorldThread
        ? buildDialogueWorldThreadSystemBlock(visualPresenceState.dialogueWorldThread)
        : '',
      visualPresenceState.answerCompiler
        ? buildAnswerCompilerSystemBlock(visualPresenceState.answerCompiler)
        : '',
      visualPresenceState.currentConsciousFrame
        ? buildCurrentConsciousFrameSystemBlock(visualPresenceState.currentConsciousFrame)
        : '',
      visualPresenceState.claimEvidenceLedger
        ? buildClaimEvidenceLedgerSystemBlock(visualPresenceState.claimEvidenceLedger)
        : '',
      visualPresenceState.replyDeliberation
        ? buildReplyDeliberationSystemBlock(visualPresenceState.replyDeliberation)
        : '',
      visualPresenceState.recallGovernor
        ? buildRecallGovernorSystemBlock(visualPresenceState.recallGovernor)
        : '',
      visualPresenceState.answerPlanner
        ? buildAlicizationAnswerPlannerSystemBlock(visualPresenceState.answerPlanner)
        : '',
      chatMindState.dialogueEncounter
        ? buildDialogueTurnEncounterSystemBlock(chatMindState.dialogueEncounter)
        : '',
      chatMindState.dialogueSemantics && chatMindState.dialogueObligation
        ? buildAlicizationDialogueObligationSystemBlock({
            semantics: chatMindState.dialogueSemantics,
            obligation: chatMindState.dialogueObligation,
          })
        : '',
      chatMindState.dialogueFocus
        ? buildDialogueFocusGovernanceSystemBlock(chatMindState.dialogueFocus)
        : '',
      executiveAnswerBrief.systemBlock,
      responseSurfaceContract.systemBlock,
      buildAlicizationResponseCharterSystemBlock(responseCharter),
      chatRuntimeSystemBlock,
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
      buildChatVisualPresenceSystemBlock(visualPresenceState),
    ].filter(Boolean)
    const promptSystemBlocks = [
      buildCompactMindTurnControlSystemBlock({
        brief: executiveAnswerBrief.brief,
        charter: responseCharter,
        contract: responseSurfaceContract.contract,
        governance: mindTurnGovernance,
        state: visualPresenceState,
        inspectionRequested,
        currentForeground,
      }),
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
          executiveBrief: {
            turnMode: executiveAnswerBrief.brief.turnMode,
            truthState: executiveAnswerBrief.brief.truthState,
            liveSurface: executiveAnswerBrief.brief.liveSurface,
            carriedThread: executiveAnswerBrief.brief.carriedThread,
            separateCarryFromSurface: executiveAnswerBrief.brief.separateCarryFromSurface,
            shouldCompactHistory: executiveAnswerBrief.brief.shouldCompactHistory,
            maxRecentUserTurns: executiveAnswerBrief.brief.maxRecentUserTurns,
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
          responseSurface: {
            openingStyle: responseSurfaceContract.contract.openingStyle,
            maxParagraphs: responseSurfaceContract.contract.maxParagraphs,
            maxSentences: responseSurfaceContract.contract.maxSentences,
            suppressAssociativeRecall: responseSurfaceContract.contract.suppressAssociativeRecall,
          },
          historyCompaction: {
            beforeCount: compactedMessages.beforeCount,
            afterCount: compactedMessages.afterCount,
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

    return {
      messages,
      systemBlocks,
      promptSystemBlocks,
      digitalLifeRuntimeSurface: chatRuntimeSurface,
      memoryRecallSeed: [
        visualPresenceState.recallGovernor?.recallSeed,
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
        suppressAssociativeRecall: responseSurfaceContract.contract.suppressAssociativeRecall,
        turnMode: executiveAnswerBrief.brief.turnMode,
        personaKernelMode: responseSurfaceContract.contract.personaKernelMode,
        mindTurnGovernance,
      },
    }
  }

  return {
    augmentMainChatMessagesWithPerception,
  }
}
