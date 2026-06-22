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

function sanitizeMetaText(raw: unknown, maxChars = 320) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function uniqueMetaList(values: unknown[], maxItems = 8) {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of values) {
    const text = sanitizeMetaText(value, 64)
    if (!text || seen.has(text))
      continue
    seen.add(text)
    normalized.push(text)
    if (normalized.length >= maxItems)
      break
  }
  return normalized
}

function deriveProjectStateCarrySourceTags(input: {
  projectState?: AlicizationRuntimeDigest['projectState'] | null
  runtimeDigest?: AlicizationRuntimeDigest | null
}) {
  const joined = [
    input.projectState?.sameHerSelfLine,
    input.projectState?.sameHerHoldDetail,
    input.projectState?.continuityCue,
    input.projectState?.latestLandedProgress,
    input.projectState?.memoryClosureSummary,
    input.runtimeDigest?.summary,
    input.runtimeDigest?.activeLoop?.summary,
  ]
    .map(value => sanitizeMetaText(value).toLowerCase())
    .filter(Boolean)
    .join(' ')
  return [
    'project-state-carry',
    ...(
      joined.includes('execution-callback')
      || joined.includes('callback')
      || joined.includes('continuity-execution-callback')
        ? ['continuity-execution-callback-project-carry']
        : []
    ),
  ]
}

function deriveMetaPreDialogueAwareness(input: {
  projectState?: AlicizationRuntimeDigest['projectState'] | null
}): AlicizationChatMetaEvent['preDialogueAwareness'] {
  const projectState = input.projectState
  if (!projectState)
    return null

  const summaryLine = sanitizeMetaText(projectState.preflightSummary)
    || sanitizeMetaText(projectState.preDialogueAwarenessSummary)
    || sanitizeMetaText(projectState.awarenessLine)
    || sanitizeMetaText(projectState.preDialogueAwarenessLine)
    || null
  const awarenessLine = sanitizeMetaText(projectState.preDialogueAwarenessLine)
    || sanitizeMetaText(projectState.awarenessLine)
    || null
  const companionHeadlineLine = sanitizeMetaText(projectState.companionHeadlineLine) || null
  const companionBriefingLine = sanitizeMetaText(projectState.companionBriefingLine) || null
  const emotionalClosureCue = sanitizeMetaText(projectState.emotionalClosureCue) || null
  if (!summaryLine && !awarenessLine && !companionHeadlineLine && !companionBriefingLine && !emotionalClosureCue)
    return null

  return {
    status: summaryLine && awarenessLine ? 'grounded' : 'partial',
    summaryLine,
    companionHeadlineLine,
    companionBriefingLine,
    companionNextClosureLine: sanitizeMetaText(projectState.nextClosureTarget) || null,
    awarenessLine,
    emotionalClosureCue,
    reasonPreview: uniqueMetaList([
      projectState.identity,
      projectState.currentPhase,
      projectState.latestLandedProgress,
      projectState.primaryOpenLoop,
      projectState.nextClosureTarget,
    ], 4),
  }
}

export function repairContinuitySourceTagsFromRuntimeDigest(input: {
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine'] | null | undefined
  runtimeDigest?: AlicizationRuntimeDigest | null
}) {
  const digitalLifeSpine = input.digitalLifeSpine
  if (!digitalLifeSpine)
    return null

  const projectState = input.runtimeDigest?.projectState ?? null
  const sameHerSelfLine = sanitizeMetaText(projectState?.sameHerSelfLine, 220)
    || sanitizeMetaText(projectState?.continuityCue, 220)
  if (!sameHerSelfLine)
    return digitalLifeSpine

  const sourceTags = deriveProjectStateCarrySourceTags({
    projectState,
    runtimeDigest: input.runtimeDigest ?? null,
  })
  const memory = digitalLifeSpine.memory as (NonNullable<AlicizationChatMetaEvent['digitalLifeSpine']>['memory'] & {
    personStateProjection?: Record<string, unknown> | null
  }) | null | undefined
  const projection = memory?.personStateProjection && typeof memory.personStateProjection === 'object'
    ? memory.personStateProjection
    : null
  const authority = projection?.selfContinuityAuthority && typeof projection.selfContinuityAuthority === 'object'
    ? projection.selfContinuityAuthority as Record<string, unknown>
    : null
  const nextAuthority = {
    ...authority,
    sourceTags: uniqueMetaList([
      ...(
        Array.isArray(authority?.sourceTags)
          ? authority.sourceTags
          : []
      ),
      ...sourceTags,
    ]),
    selfLine: authority?.selfLine ?? null,
    relationshipLine: authority?.relationshipLine ?? null,
    motiveLine: authority?.motiveLine ?? null,
    habitLine: authority?.habitLine ?? null,
    inwardLine: sanitizeMetaText(authority?.inwardLine, 220) || sameHerSelfLine,
    authoritySummary: authority?.authoritySummary ?? null,
  }

  return {
    ...digitalLifeSpine,
    memory: {
      ...memory,
      personStateProjection: {
        ...projection,
        selfContinuityAuthority: nextAuthority,
      },
    },
  } satisfies AlicizationChatMetaEvent['digitalLifeSpine']
}

export function buildAlicizationChatMetaPayload(input: AlicizationChatMetaEvent): AlicizationChatMetaEvent {
  const projectState = input.projectState ?? input.runtimeDigest?.projectState ?? null
  return {
    ...input,
    projectState,
    preDialogueAwareness: input.preDialogueAwareness ?? deriveMetaPreDialogueAwareness({ projectState }),
  }
}

export function buildAlicizationChatMetaSignature(body: Pick<AlicizationChatMetaEvent, 'governance' | 'visibleReplyExecution' | 'embodiment' | 'embodimentScript' | 'speechTimeline' | 'digitalLife' | 'digitalLifeSpine' | 'runtimeDigest'>) {
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
    embodimentScriptVersion: body.embodimentScript?.version ?? null,
    embodimentScriptTurnId: body.embodimentScript?.turnId ?? null,
    embodimentScriptDecisionTraceId: body.embodimentScript?.decisionTraceId ?? null,
    embodimentScriptSegmentCount: body.embodimentScript?.speechPlan.segments.length ?? 0,
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
      embodimentScript: (meta as { embodimentScript?: AlicizationChatMetaEvent['embodimentScript'] | null }).embodimentScript ?? null,
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
