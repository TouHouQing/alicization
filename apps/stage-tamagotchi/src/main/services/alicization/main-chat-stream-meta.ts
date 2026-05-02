import type {
  AlicizationChatMetaEvent,
  AlicizationMindTurnGovernance,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import { buildAlicizationChatStreamEmbodimentMeta, readStringValue } from './runtime-governance'

export function buildAlicizationChatMetaSignature(body: Pick<AlicizationChatMetaEvent, 'governance' | 'visibleReplyExecution' | 'embodiment' | 'speechTimeline' | 'digitalLife' | 'digitalLifeSpine' | 'runtimeDigest'>) {
  const lastSegment = body.speechTimeline?.segments.at(-1)
  const lastFrame = body.digitalLife?.frames.at(-1)
  return JSON.stringify({
    decisionTraceId: body.governance?.decisionTraceId ?? null,
    visibleReplyExecutionMode: body.visibleReplyExecution?.mode ?? null,
    visibleReplyExecutionAuthority: body.visibleReplyExecution?.actualVisibleReplyAuthority ?? null,
    visibleReplyExecutionProviderMind: body.visibleReplyExecution?.providerMindExecuted ?? null,
    emotion: body.embodiment?.emotion ?? null,
    variationToken: body.embodiment?.variationToken ?? null,
    postureHint: body.embodiment?.postureHint ?? null,
    preferredExpressionAlias: body.embodiment?.rendererHints?.preferredExpressionAliases?.[0] ?? null,
    preferredMotionAlias: body.embodiment?.rendererHints?.preferredMotionAliases?.[0] ?? null,
    segmentCount: body.speechTimeline?.segments.length ?? 0,
    replyChars: body.speechTimeline?.reply.length ?? 0,
    lastSegmentEndOffset: lastSegment?.endOffset ?? null,
    lastSegmentEmotion: lastSegment?.emotion ?? null,
    lastSegmentEmotionHoldMs: lastSegment?.emotionHoldMs ?? null,
    lastSegmentSettleMode: lastSegment?.settleMode ?? null,
    lastSegmentLive2DFacialReleaseMs: lastSegment?.rendererSettle?.live2dFacialReleaseMs ?? null,
    lastSegmentVrmExpressionBlendMs: lastSegment?.rendererSettle?.vrmExpressionBlendMs ?? null,
    lastSegmentVrmActionFadeMs: lastSegment?.rendererSettle?.vrmActionFadeMs ?? null,
    lastSegmentLive2DMotionFollowThroughMs: lastSegment?.rendererSettle?.live2dMotionFollowThroughMs ?? null,
    lastSegmentPreferredExpressionAlias: lastSegment?.rendererHints?.preferredExpressionAliases?.[0] ?? null,
    lastSegmentPreferredMotionAlias: lastSegment?.rendererHints?.preferredMotionAliases?.[0] ?? null,
    lastActionCue: lastSegment?.actionCue ?? body.embodiment?.performance.actionCue ?? null,
    lastFacialCue: lastSegment?.facialCue ?? body.embodiment?.performance.facialCue ?? null,
    digitalLifeMode: body.digitalLife?.mode ?? null,
    digitalLifeVoiceEnergy: body.digitalLife?.voice.energy ?? null,
    digitalLifeLipSyncMode: body.digitalLife?.lipSync.mode ?? null,
    digitalLifeFrameCount: body.digitalLife?.frames.length ?? 0,
    digitalLifeLastFrameMode: lastFrame?.mode ?? null,
    digitalLifeLastActionMode: lastFrame?.action.actionMode ?? null,
    digitalLifeLastLipSyncMode: lastFrame?.lipSync.mode ?? null,
    digitalLifeLine: body.digitalLifeSpine?.continuitySignal?.summary ?? null,
    digitalLifeOperatingMode: body.digitalLifeSpine?.architecture?.operatingMode ?? null,
    digitalLifeDominantSystem: body.digitalLifeSpine?.architecture?.dominantSystem ?? null,
    digitalLifeSceneScenario: body.digitalLifeSpine?.runtime.sceneScenario ?? null,
    digitalLifeDominantMode: body.digitalLifeSpine?.runtime.dominantMode ?? null,
    digitalLifeSelectedAction: body.digitalLifeSpine?.proactive?.selectedAction ?? null,
    digitalLifeMemorySummary: body.digitalLifeSpine?.memory?.summary ?? null,
    digitalLifeLongHorizonSummary: body.digitalLifeSpine?.memory?.longHorizonSummary ?? null,
    digitalLifeRememberedPreferenceSummary: body.digitalLifeSpine?.memory?.rememberedPreferenceSummary ?? null,
    digitalLifeRememberedConstraintSummary: body.digitalLifeSpine?.memory?.rememberedConstraintSummary ?? null,
    digitalLifeRememberedPlanSummary: body.digitalLifeSpine?.memory?.rememberedPlanSummary ?? null,
    digitalLifeLongHorizonCueCount: body.digitalLifeSpine?.memory?.longHorizonCueCount ?? null,
    digitalLifeRecallMode: body.digitalLifeSpine?.memory?.recallMode ?? null,
    digitalLifeRecentEpisodeCount: body.digitalLifeSpine?.memory?.recentEpisodeCount ?? 0,
    digitalLifeReflectionPressure: body.digitalLifeSpine?.memory?.reflectionPressure ?? null,
    digitalLifeMotiveRulingDrive: body.digitalLifeSpine?.motive?.rulingDrive ?? null,
    digitalLifeMotiveLeadingGoal: body.digitalLifeSpine?.motive?.leadingGoalSummary ?? null,
    digitalLifeMotiveLeadingAgendaKind: body.digitalLifeSpine?.motive?.leadingAgendaKind ?? null,
    digitalLifeMotiveLeadingAgendaSummary: body.digitalLifeSpine?.motive?.leadingAgendaSummary ?? null,
    digitalLifeMotiveReturnPressure: body.digitalLifeSpine?.motive?.returnPressure ?? null,
    digitalLifeHabitMode: body.digitalLifeSpine?.habit?.dominantMode ?? null,
    digitalLifeHabitGroundingGate: body.digitalLifeSpine?.habit?.requiresGroundingBeforeSurface ?? null,
    digitalLifeHabitBusyBoundary: body.digitalLifeSpine?.habit?.blocksDirectSpeakWhenBusy ?? null,
    digitalLifeHabitProtectsRest: body.digitalLifeSpine?.habit?.protectsRestWindow ?? null,
    digitalLifeOutcomeLearningSummary: body.digitalLifeSpine?.outcomeLearning?.summary ?? null,
    digitalLifeOutcomeLatestInflection: body.digitalLifeSpine?.outcomeLearning?.latestInflection ?? null,
    digitalLifeOutcomeReflectionLesson: body.digitalLifeSpine?.outcomeLearning?.reflectionLesson ?? null,
    runtimeDigestDominantChannel: body.runtimeDigest?.dominantChannel ?? null,
    runtimeDigestShouldSpeak: body.runtimeDigest?.shouldProactivelySpeak ?? null,
    runtimeDigestShouldAct: body.runtimeDigest?.shouldProactivelyAct ?? null,
    runtimeDigestContinuityPressure: body.runtimeDigest?.continuityPressure ?? null,
    runtimeDigestCompanionshipPressure: body.runtimeDigest?.companionshipPressure ?? null,
    runtimeDigestRulingMotive: body.runtimeDigest?.rulingMotive ?? null,
    runtimeDigestHabitMode: body.runtimeDigest?.habitMode ?? null,
    runtimeDigestTruthDisciplinePressure: body.runtimeDigest?.truthDisciplinePressure ?? null,
    runtimeDigestBoundaryPressure: body.runtimeDigest?.boundaryPressure ?? null,
    runtimeDigestRestProtectionPressure: body.runtimeDigest?.restProtectionPressure ?? null,
    runtimeDigestReturnPressure: body.runtimeDigest?.returnPressure ?? null,
    runtimeDigestActiveLoopPhase: body.runtimeDigest?.activeLoop?.phase ?? null,
    runtimeDigestActiveLoopHandoff: body.runtimeDigest?.activeLoop?.handoffTarget ?? null,
    runtimeDigestActiveLoopInitiativeBudget: body.runtimeDigest?.activeLoop?.initiativeBudget ?? null,
    runtimeDigestActiveLoopCoherence: body.runtimeDigest?.activeLoop?.coherence ?? null,
    runtimeDigestActiveLoopObservationHeavy: body.runtimeDigest?.activeLoop?.observationHeavy ?? null,
    runtimeDigestSummary: body.runtimeDigest?.summary ?? null,
  })
}

export { shouldEmitAlicizationChatMetaUpdate }

export function createAlicizationChatStreamMetaEmitter(input: {
  cardId: string
  turnId: string
  getGovernance: () => AlicizationMindTurnGovernance | null | undefined
  getVisibleReplyExecution?: () => AlicizationVisibleReplyExecution | null | undefined
  getDigitalLifeSpine?: () => AlicizationChatMetaEvent['digitalLifeSpine']
  getRuntimeDigest?: () => AlicizationRuntimeDigest | null | undefined
  getResidentPerformance?: () => AlicizationResidentPerformanceSnapshot | null | undefined
  getPerformanceManifest?: () => CharacterPerformanceCapabilitiesManifest | null | undefined
  emit: (payload: AlicizationChatMetaEvent) => void
}) {
  let lastSignature: string | null = null
  let lastReply = ''

  function emit(reply: string, options?: { force?: boolean }) {
    const digitalLifeSpine = input.getDigitalLifeSpine?.() ?? null
    const meta = buildAlicizationChatStreamEmbodimentMeta({
      governance: input.getGovernance() ?? null,
      digitalLifeSpine,
      performanceManifest: input.getPerformanceManifest?.() ?? null,
      residentPerformance: input.getResidentPerformance?.() ?? null,
      reply,
      turnId: input.turnId,
    })
    const runtimeDigest = input.getRuntimeDigest?.() ?? null
    const emittedMeta = {
      cardId: input.cardId,
      turnId: input.turnId,
      governance: meta.governance,
      visibleReplyExecution: input.getVisibleReplyExecution?.() ?? null,
      embodiment: meta.embodiment,
      speechTimeline: meta.speechTimeline,
      digitalLife: meta.digitalLife,
      digitalLifeSpine,
      runtimeDigest,
    } satisfies AlicizationChatMetaEvent
    const signature = buildAlicizationChatMetaSignature(emittedMeta)
    if (!options?.force && signature === lastSignature)
      return

    lastSignature = signature
    lastReply = meta.speechTimeline?.reply ?? readStringValue(reply).trim()
    input.emit(emittedMeta)
  }

  return {
    emit,
    getLastReply: () => lastReply,
    snapshot: () => ({
      lastReply,
      lastSignature,
    }),
  }
}
