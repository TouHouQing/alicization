import type { AlicizationChatFailureKind } from '@proj-alicization/stage-shared'

import type { AlicizationPersonStateProjection } from './person-state-projection'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import { derivePostPolicyQuietHoldRuntimeSnapshot } from './alicization-runtime-architecture'
import { buildAutobiographicalEpisodeFragment } from './autobiographical-episodes'
import { deriveAutonomyExecutionProposalSurface, runAutonomyActuation } from './autonomy-actuation'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import { buildAlicizationEmotionalKernel } from './emotional-kernel'
import { resolveAlicizationEmotionalTransitionDecay } from './emotional-ledger'
import { adjustProactiveStyleFromHostPersonModel, buildHostSocialContexts } from './host-social-guidance'
import { resolveHumanlikeMemoryRecallSeedFromEventHistory } from './humanlike-memory-recall-seed'
import { resolvePreferredPersonStateProjection } from './person-state-projection-resolution'
import { buildAlicizationPresenceExpression } from './presence-expression'
import { applyProactiveMemoryBoundaryRestraint } from './proactive-memory-boundary'
import { resolveAlicizationProactiveVisibleUtterance } from './proactive-mind/visible-utterance-realization'
import { normalizeDialogueRespondedPayload } from './runtime-governance'
import {
  buildAlicizationAutonomousDialogueTurnId,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueStructuredFormat,
} from './runtime-structured-format'
import { resolveRuntimeSubconsciousTickEntry } from './runtime-subconscious-tick-entry'
import { buildAlicizationMindAuthoringFailureArtifact } from './visible-reply/facade'

export function resolveProactiveProviderFailureKind(input: {
  reason: unknown
  failureKind?: AlicizationChatFailureKind | null
}): AlicizationChatFailureKind {
  if (input.failureKind)
    return input.failureKind

  const reason = typeof input.reason === 'string' ? input.reason.toLowerCase() : ''
  if (/\b(?:timed? out|timeout)\b|超时/u.test(reason))
    return 'timeout'
  if (/\b(?:401|403|unauthori[sz]ed|authentication|api key)\b|认证/u.test(reason))
    return 'provider-auth'
  if (/\b(?:config(?:uration)?|base url|model.*required)\b|配置/u.test(reason))
    return 'provider-config'
  if (/\b(?:schema|structured output|invalid json)\b|结构化/u.test(reason))
    return 'provider-schema-unsupported'
  if (/\b(?:network|connect|connection|econn|http 5\d\d)\b|网络/u.test(reason))
    return 'provider-network'
  return 'stream-failure'
}

function sanitizePresenceOnlyReasonTags(reasonTags: readonly unknown[]) {
  return reasonTags
    .map(tag => sanitizeAlicizationProviderFacingText(tag, 120, ''))
    .filter((tag): tag is string => Boolean(tag))
}

const presenceOnlyLegacyProjectStateKeys = new Set([
  'identity',
  'currentPhase',
  'latestLandedProgress',
  'latestProgress',
  'landedProgressSummary',
  'primaryOpenLoop',
  'openClosureSummary',
  'nextClosureTarget',
  'nextClosureTargetSummary',
  'sameHerSelfLine',
  'sameHerDriftRisk',
  'sameHerDriftRiskSummary',
  'sameHerHoldDetail',
  'preflightSummary',
  'preDialogueAwarenessLine',
  'awarenessLine',
  'companionHeadlineLine',
  'companionBriefingLine',
  'emotionalClosureCue',
  'emotionalClosureSummary',
  'continuityRestraint',
  'continuityArcStage',
  'continuityPreferredTiming',
  'continuityCadence',
  'continuityCue',
])

export function stripPresenceOnlyLegacyProjectState(projectState: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(projectState)
      .filter(([key]) => !presenceOnlyLegacyProjectStateKeys.has(key)),
  )
}

function normalizePresenceOnlyHoldCarryText(raw: unknown, maxChars = 420) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  if (!normalized)
    return ''
  const sanitized = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (sanitized)
    return sanitized
  const fragments = normalized
    .split(/\s*(?:[。.!?！？]\s*|\|\s*|;\s*)/u)
    .map(fragment => sanitizeAlicizationProviderFacingText(fragment, Math.min(260, maxChars), ''))
    .filter((fragment): fragment is string => Boolean(fragment))
  return fragments.join(' | ')
}

function normalizePresenceOnlyContinuitySummary(raw: unknown, maxChars = 560) {
  if (typeof raw !== 'string')
    return ''

  const normalized = raw.trim().replace(/\s+/g, ' ')
  if (!normalized)
    return ''

  const direct = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (direct) {
    return direct
  }

  return normalized
    .split(/\s*(?:[。.!?！？]\s*|\|\s*|;\s*)/u)
    .map(fragment => normalizePresenceOnlyHoldCarryText(fragment, maxChars))
    .filter(Boolean)
    .join(' | ')
    .slice(0, maxChars)
}

function resolvePresenceOnlyTransparentFailure(candidates: unknown[]) {
  return candidates
    .map(candidate => normalizePresenceOnlyContinuitySummary(candidate, 560))
    .find(candidate =>
      /failed|failure|error|timed? out|timeout|unavailable|blocked|denied|settlement|失败|错误|超时|不可用|被阻止|拒绝|结算/iu.test(candidate),
    ) ?? ''
}

export function normalizeDeferredAutonomyContinuitySignal(signal: Record<string, any> | null | undefined) {
  if (!signal || typeof signal !== 'object')
    return signal

  const metadata = signal.metadata && typeof signal.metadata === 'object'
    ? signal.metadata as Record<string, unknown>
    : {}
  const source = typeof metadata.source === 'string'
    ? metadata.source.trim()
    : ''
  const turnId = typeof metadata.turnId === 'string'
    ? metadata.turnId.trim()
    : ''
  const scenario = typeof metadata.scenario === 'string'
    ? metadata.scenario.trim()
    : ''
  const reasonCode = typeof metadata.reasonCode === 'string'
    ? metadata.reasonCode.trim()
    : typeof metadata.reason === 'string'
      ? metadata.reason.trim()
      : ''
  const sourceThreadId = typeof metadata.sourceThreadId === 'string'
    ? metadata.sourceThreadId.trim()
    : ''
  const sourceThoughtThreadId = typeof metadata.sourceThoughtThreadId === 'string'
    ? metadata.sourceThoughtThreadId.trim()
    : ''
  const sourceConcernId = typeof metadata.sourceConcernId === 'string'
    ? metadata.sourceConcernId.trim()
    : ''
  const targetThreadId = typeof metadata.targetThreadId === 'string'
    ? metadata.targetThreadId.trim()
    : ''
  const threadId = typeof metadata.threadId === 'string'
    ? metadata.threadId.trim()
    : sourceThreadId || targetThreadId
  const intentId = typeof metadata.intentId === 'string'
    ? metadata.intentId.trim()
    : typeof metadata.executionIntentKind === 'string'
      ? metadata.executionIntentKind.trim()
      : ''
  const deferredAt = typeof metadata.deferredAt === 'number' && Number.isFinite(metadata.deferredAt)
    ? metadata.deferredAt
    : typeof signal.createdAt === 'number' && Number.isFinite(signal.createdAt)
      ? signal.createdAt
      : null
  const modelSummary = normalizePresenceOnlyContinuitySummary(
    metadata.executionIntentSummary ?? signal.summary,
    560,
  )
  const normalizedDeferReason = normalizePresenceOnlyContinuitySummary(metadata.deferReason, 240)
  const failure = resolvePresenceOnlyTransparentFailure([
    metadata.failure,
    modelSummary,
    metadata.whyNow,
    normalizedDeferReason,
  ])
  const continuitySummary = Array.from(new Set([
    modelSummary,
    failure,
  ].filter(Boolean))).join(' | ')
  const structuredDeferReason = normalizedDeferReason && normalizedDeferReason !== failure
    ? normalizedDeferReason
    : null

  return {
    ...signal,
    summary: continuitySummary || null,
    metadata: {
      source: source || null,
      turnId: turnId || null,
      scenario: scenario || null,
      reasonCode: reasonCode || null,
      threadId: threadId || null,
      intentId: intentId || null,
      deferredAt,
      deferReason: structuredDeferReason,
      failure: failure || null,
      executionIntentSummary: modelSummary || null,
      sourceThreadId: sourceThreadId || null,
      sourceThoughtThreadId: sourceThoughtThreadId || null,
      sourceConcernId: sourceConcernId || null,
      targetThreadId: targetThreadId || null,
    },
  }
}

type PresenceOnlyPersistedEmotionalKernelInput = Parameters<typeof buildAlicizationEmotionalKernel>[0]
type PresenceOnlyProjection = Record<string, any> & {
  summary?: string | null
  openingGuidance?: string | null
  manifestationCadenceSummary?: string | null
  sameHerHoldDetail?: string | null
  selfContinuityAuthority?: {
    inwardLine?: string | null
    sourceTags?: string[] | null
  } | null
}
interface PresenceOnlyRuntimeAction {
  kind?: string | null
  label?: string | null
  status?: string | null
}

export function buildPresenceOnlyHoldContinuityProjection(input: {
  previousProjection: {
    summary?: string | null
    manifestationCadenceSummary?: string | null
    openingGuidance?: string | null
    selfContinuityAuthority?: {
      inwardLine?: string | null
      sourceTags?: string[] | null
    } | null
  } | null | undefined
  openingGuidance?: string | null
  continuityRestraint?: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
  initiativeWhy?: string | null
  projectContinuityCue?: string | null
}) {
  if (
    input.continuityRestraint !== 'measured-return'
    && input.continuityRestraint !== 'repair-before-closeness'
    && input.continuityRestraint !== 'rest-protective'
  ) {
    return null
  }

  const previousProjection = input.previousProjection ?? null
  const openingGuidance = normalizePresenceOnlyHoldCarryText(
    previousProjection?.openingGuidance,
    320,
  )
  const inwardLine = normalizePresenceOnlyHoldCarryText(
    previousProjection?.selfContinuityAuthority?.inwardLine,
    240,
  )

  return {
    ...previousProjection,
    summary: normalizePresenceOnlyHoldCarryText(previousProjection?.summary, 420),
    openingGuidance,
    manifestationCadenceSummary: normalizePresenceOnlyHoldCarryText(
      previousProjection?.manifestationCadenceSummary,
      420,
    ),
    sameHerHoldDetail: null,
    selfContinuityAuthority: {
      ...previousProjection?.selfContinuityAuthority,
      inwardLine: inwardLine || null,
      sourceTags: sanitizePresenceOnlyReasonTags(
        (previousProjection?.selfContinuityAuthority?.sourceTags ?? []) as string[],
      ),
    },
  }
}

export function preserveResidentSameLineProjection(input: {
  previousProjection: PresenceOnlyProjection | null | undefined
  nextProjection: PresenceOnlyProjection | null | undefined
  conversationState: {
    carryReason?: string | null
  } | null | undefined
  dialogueWorldThread: {
    openLoops?: string[] | null
    narrative?: string[] | null
  } | null | undefined
}): PresenceOnlyProjection | null {
  return resolvePreferredPersonStateProjection({
    bundleProjection: input.previousProjection as Partial<AlicizationPersonStateProjection> | null | undefined,
    runtimeProjection: input.nextProjection as Partial<AlicizationPersonStateProjection> | null | undefined,
  }) as PresenceOnlyProjection | null
}

export function buildPresenceOnlyHoldInitiativeFallback(input: {
  existingInitiative: Record<string, any> | null | undefined
  decision: {
    style?: string | null
    confidence?: number | null
    whyNow?: string | null
  } | null | undefined
  continuityRestraint: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
  projectContinuityCue?: string | null
  privateThought?: {
    thoughtText?: string | null
  } | null
}) {
  const continuityRestraint = input.continuityRestraint
  const preferredStyle = input.decision?.style === 'silent-observe'
    ? 'silent-observe'
    : null
  const structuredHoldActive = preferredStyle === 'silent-observe'
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'repair-before-closeness'
    || continuityRestraint === 'rest-protective'
    || continuityRestraint === 'lower-pressure'
  if (!structuredHoldActive)
    return input.existingInitiative ?? null
  if (
    preferredStyle !== 'silent-observe'
    && continuityRestraint !== 'measured-return'
    && continuityRestraint !== 'repair-before-closeness'
    && continuityRestraint !== 'rest-protective'
    && continuityRestraint !== 'lower-pressure'
  ) {
    return null
  }

  const preferredPresence = continuityRestraint === 'repair-before-closeness'
    ? 'concerned'
    : continuityRestraint === 'rest-protective'
      ? 'concerned'
      : continuityRestraint === 'lower-pressure'
        ? 'hesitant'
        : 'attentive'

  if (input.existingInitiative && typeof input.existingInitiative === 'object') {
    return {
      ...input.existingInitiative,
      preferredStyle: preferredStyle ?? input.existingInitiative.preferredStyle ?? 'silent-observe',
      preferredPresence,
      continuityRestraint: continuityRestraint ?? input.existingInitiative.continuityRestraint ?? null,
      shouldSurface: false,
      shouldSpeak: false,
      silenceDrive: 1,
      speakDrive: 0,
    }
  }

  if (
    preferredStyle !== 'silent-observe'
    && continuityRestraint !== 'measured-return'
    && continuityRestraint !== 'repair-before-closeness'
    && continuityRestraint !== 'rest-protective'
    && continuityRestraint !== 'lower-pressure'
  ) {
    return null
  }

  return {
    selectedAction: 'recheck',
    confidence: Number.isFinite(Number(input.decision?.confidence))
      ? Math.max(0, Math.min(1, Number(input.decision?.confidence)))
      : 0.72,
    motives: {},
    speakDrive: 0,
    silenceDrive: 1,
    preferredStyle: preferredStyle ?? 'silent-observe',
    preferredPresence,
    continuityRestraint,
    why: null,
    shouldSurface: false,
    shouldSpeak: false,
  }
}

function derivePresenceOnlyHoldAuthorityContinuityRestraint(input: {
  currentContinuityRestraint: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
}) {
  return input.currentContinuityRestraint
}

export function buildDeferredAutonomyContinuitySignalFallback(input: {
  now: number
  turnId: string
  scenario: string
  reason: string
  projectState?: {
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    companionHeadlineLine?: string | null
    emotionalClosureCue?: string | null
    emotionalClosureSummary?: string | null
    identity?: string | null
    currentPhase?: string | null
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    sameHerHoldDetail?: string | null
  } | null
  autonomy?: {
    deferReason?: string | null
    whyNow?: string | null
    sourceThreadId?: string | null
    sourceThoughtThreadId?: string | null
    sourceConcernId?: string | null
    executionIntent?: {
      id?: string | null
      kind?: string | null
      summary?: string | null
      targetThreadId?: string | null
    } | null
  } | null
}) {
  const scenario = String(input.scenario ?? '').trim() || 'general'
  const turnId = String(input.turnId ?? '').trim()
  const reasonCode = String(input.reason ?? '').trim()
  const explicitIntentId = String(input.autonomy?.executionIntent?.id ?? '').trim()
  const executionIntentKind = String(input.autonomy?.executionIntent?.kind ?? '').trim()
  const executionIntentSummary = String(input.autonomy?.executionIntent?.summary ?? '').trim()
  const deferReason = String(input.autonomy?.deferReason ?? '').trim()
  const whyNow = String(input.autonomy?.whyNow ?? '').trim()
  const sourceThreadId = String(input.autonomy?.sourceThreadId ?? '').trim()
  const sourceThoughtThreadId = String(input.autonomy?.sourceThoughtThreadId ?? '').trim()
  const sourceConcernId = String(input.autonomy?.sourceConcernId ?? '').trim()
  const targetThreadId = String(input.autonomy?.executionIntent?.targetThreadId ?? '').trim()
  const threadId = sourceThreadId || targetThreadId
  const intentId = explicitIntentId || executionIntentKind
  const hasHeldAutonomyThreadAnchor = Boolean(sourceThoughtThreadId)
    || Boolean(sourceConcernId)
  const explicitHeldAutonomyIntent = Boolean(intentId)
    || Boolean(executionIntentSummary)
    || hasHeldAutonomyThreadAnchor
  const visibleUtteranceWasDeferred
    = reasonCode === 'proactive-visible-presence-without-utterance'
      || reasonCode === 'provider-mind-unavailable-for-proactive-visible-utterance'
  const shouldUseDeferredProactiveLine
    = visibleUtteranceWasDeferred
      && (
        !explicitHeldAutonomyIntent
        || executionIntentKind === 'repair'
      )
  const modelSummary = normalizePresenceOnlyContinuitySummary(executionIntentSummary, 560)
  const normalizedDeferReason = normalizePresenceOnlyContinuitySummary(deferReason, 240)
  const failure = [
    modelSummary,
    normalizePresenceOnlyHoldCarryText(whyNow, 560),
    normalizedDeferReason,
  ].find(candidate =>
    /failed|failure|error|timed? out|timeout|unavailable|blocked|denied|settlement|失败|错误|超时|不可用|被阻止|拒绝|结算/iu.test(candidate),
  ) ?? ''
  const continuitySummary = Array.from(new Set([
    modelSummary,
    failure,
  ].filter(Boolean))).join(' | ')
  const structuredDeferReason = normalizedDeferReason && normalizedDeferReason !== failure
    ? normalizedDeferReason
    : null
  const source = shouldUseDeferredProactiveLine
    ? 'proactive-deferred'
    : 'proactive-held-autonomy'
  const state = shouldUseDeferredProactiveLine
    ? 'pending'
    : 'observed'
  const label = shouldUseDeferredProactiveLine
    ? `proactive:${scenario}:deferred`
    : `proactive:${intentId || scenario}:held-autonomy`

  return {
    kind: 'proactive',
    state,
    label,
    summary: continuitySummary || null,
    signature: [
      source,
      turnId || 'turn',
      threadId || 'global',
      intentId || scenario,
    ].join(':'),
    createdAt: input.now,
    metadata: {
      source,
      turnId: turnId || null,
      scenario,
      reasonCode: reasonCode || null,
      threadId: threadId || null,
      intentId: intentId || null,
      deferredAt: input.now,
      deferReason: structuredDeferReason,
      failure: failure || null,
      executionIntentSummary: modelSummary || null,
      sourceThreadId: sourceThreadId || null,
      sourceThoughtThreadId: sourceThoughtThreadId || null,
      sourceConcernId: sourceConcernId || null,
      targetThreadId: targetThreadId || null,
    },
  }
}

export function buildPresenceOnlyHoldCurrentConsciousFrame(input: {
  currentConsciousFrame: Record<string, any> | null | undefined
  continuityRestraint: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null
  holdDetail?: string | null
  projectStateCarry?: {
    sameHerSummary?: string | null
    sameHerDriftRisk?: string | null
    emotionalClosureSummary?: string | null
    continuityCue?: string | null
  } | null
}) {
  const frame = input.currentConsciousFrame && typeof input.currentConsciousFrame === 'object'
    ? input.currentConsciousFrame
    : null
  if (!frame)
    return frame

  if (
    input.continuityRestraint !== 'measured-return'
    && input.continuityRestraint !== 'repair-before-closeness'
    && input.continuityRestraint !== 'rest-protective'
    && input.continuityRestraint !== 'lower-pressure'
  ) {
    return frame
  }

  const reasonTags = Array.isArray(frame.reasonTags) ? sanitizePresenceOnlyReasonTags(frame.reasonTags) : []
  const projectState = frame.projectState && typeof frame.projectState === 'object'
    ? frame.projectState as Record<string, unknown>
    : {}
  const nextProjectState = Object.fromEntries(
    Object.entries(stripPresenceOnlyLegacyProjectState(projectState))
      .map(([key, value]) => [
        key,
        typeof value === 'string'
          ? normalizePresenceOnlyHoldCarryText(value, 560)
          : value,
      ])
      .filter(([, value]) => value !== ''),
  )

  return {
    ...frame,
    reasonTags,
    projectState: nextProjectState,
  }
}

export function rebuildPresenceOnlyPersistedEmotionalKernel(input: {
  initiative?: Record<string, any> | null
  privateThought?: PresenceOnlyPersistedEmotionalKernelInput['privateThought']
  selfState?: PresenceOnlyPersistedEmotionalKernelInput['selfState']
  affectiveResidue?: PresenceOnlyPersistedEmotionalKernelInput['affectiveResidue']
  personStateProjection?: PresenceOnlyPersistedEmotionalKernelInput['personStateProjection'] | PresenceOnlyProjection | null
  derivedMindStateBundle?: Record<string, any> | null
  fallbackEmotionalKernel?: Record<string, any> | null
}) {
  const continuityRestraint = input.initiative?.continuityRestraint as 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'lower-pressure' | null | undefined
  if (
    !input.initiative
    || input.initiative.shouldSpeak !== false
    || input.initiative.preferredStyle !== 'silent-observe'
    || (
      continuityRestraint !== 'measured-return'
      && continuityRestraint !== 'repair-before-closeness'
      && continuityRestraint !== 'rest-protective'
    )
  ) {
    return input.fallbackEmotionalKernel ?? null
  }

  const rebuiltKernel = buildAlicizationEmotionalKernel({
    selfState: input.selfState ?? null,
    privateThought: input.privateThought ?? null,
    affectiveResidue: input.affectiveResidue ?? input.derivedMindStateBundle?.affectiveResidue ?? null,
    personStateProjection: (input.personStateProjection ?? null) as PresenceOnlyPersistedEmotionalKernelInput['personStateProjection'],
  })

  if (continuityRestraint !== 'rest-protective')
    return rebuiltKernel

  return {
    ...rebuiltKernel,
    dominantEmotion: 'rest-protective-companionship',
    initiativeMode: 'observe',
    memoryRecallMode: 'rest-protective-presence',
    embodimentTone: 'rest-protective',
    reasonTags: Array.from(new Set([
      ...(Array.isArray(rebuiltKernel.reasonTags) ? rebuiltKernel.reasonTags : []),
      'rest-protective',
      'quiet-companionship',
    ])),
  }
}

export function createAlicizationSubconsciousTickRuntime(options: any) {
  const {
    getActiveCardId,
    getSoulSnapshot,
    getAlicizationDb,
    setProactiveLoopStateCache,
    setSubconsciousStateCache,
    clearForegroundProbeTimeoutStreakForPid,
    ensureSubconsciousState,
    ensureProactiveLoopState,
    openAgentTurn,
    buildMainGatewayAgentTurnId,
    processDueRemindersForCurrentCard,
    processDueLearningActionsForCurrentCard,
    settleExpiredPendingProactiveOutcomes,
    getSensorySnapshot,
    ensurePerceptionState,
    sampleSubconsciousInterruptionContext,
    resolveForegroundDecisionTarget,
    getActiveAttentionAnchor,
    rememberPerceptionObservation,
    ensureVisualPresenceState,
    clampNeed,
    bootstrap,
    isAlicizationKillSwitchSuspended,
    getAlicizationCardKillSwitchState,
    updateLateNightActivityState,
    isLateNightWindow,
    resolveProactiveScreenSemanticSummary,
    isResidueBackedScreenSemanticSummary,
    buildProactiveLayeredContext,
    buildProactivePerceptionSignals,
    progressProactiveCadenceState,
    inferScenarioFromContext,
    consumeDurabilityPulse,
    probeForegroundPidLiveness,
    updateForegroundProbeTimeoutStreak,
    getActivePerceptionSceneResidue,
    shouldUsePerceptionResidueAsLiveSceneSummary,
    deriveRuntimeCaptureGovernance,
    buildVisualHeartbeat,
    updateVisualAttentionModel,
    buildDigitalLifeMindState,
    commitAlicizationDigitalLifeSpine,
    updateVisualPresenceState,
    bodyKernel,
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs,
    buildVisualPresenceCapturePersistFingerprint,
    buildMindContinuityFragment,
    appendAuditLog,
    errorMessageFrom,
    buildReflectionLedgerFragment,
    buildVisualSedimentFragment,
    processPendingExecutionDeliveriesForCurrentCard,
    deriveAlicizationRuntimeSnapshot,
    deriveAlicizationAgentRuntimeTelemetryFromSession,
    evaluateProactivePolicy,
    emitVisualPresencePulse,
    buildPresencePulsePayload,
    buildAgentRuntimeAuditSnapshot,
    queueSoulMutation,
    parseSoul,
    clamp01,
    syncPersonalityBaselineInBody,
    snapshotFromContent,
    toSoulContent,
    normalizeCustomDirectives,
    buildProactiveRecallSeed,
    buildVisualRecallSeed,
    buildMindContinuityRecallSeed,
    listHumanlikeMemoryRecallEvents,
    getOrganicMemorySnapshot,
    resolveOrganicMemoryPromptContext,
    generateProactiveStructuredWithGateway,
    getPerformanceManifest,
    clampAlicizationPerformancePayloadToManifest,
    appendConversationTurnWithGuards,
    syncAgentTurnSessionMirror,
    buildDeferredAutonomyContinuitySignal,
    buildPendingProactiveContinuitySignal,
    ensureActiveOrLatestSessionId,
    resolveTaskPlanningCapabilities,
    scheduleAutonomyReminder,
    planAutonomyTaskThread,
    dispatchAutonomyTaskThread,
    workspaceRoot,
    buildDefaultDialoguePerformancePayload,
    buildProactiveMetadataFromDecision,
    alicizationSubconsciousPersistMs,
    persistProactiveLoopState,
    persistSubconsciousState,
    getActiveSelfRevisionStatePatch,
    generatePresenceExpression,
  } = options as any
  function resolveDeferredAutonomyContinuitySignal(input: {
    now: number
    turnId: string
    scenario: string
    reason: string
    projectState?: Record<string, unknown> | null
    autonomy?: {
      deferReason?: string | null
      whyNow?: string | null
      sourceThreadId?: string | null
      sourceThoughtThreadId?: string | null
      sourceConcernId?: string | null
      executionIntent?: {
        kind?: string | null
        summary?: string | null
        targetThreadId?: string | null
      } | null
    } | null
  }) {
    const signal = typeof buildDeferredAutonomyContinuitySignal === 'function'
      ? buildDeferredAutonomyContinuitySignal({
          ...input,
          projectState: input.projectState ?? null,
        })
      : buildDeferredAutonomyContinuitySignalFallback({
          ...input,
          projectState: input.projectState ?? null,
        })

    return normalizeDeferredAutonomyContinuitySignal(signal)
  }

  async function runSubconsciousTickForCurrentCard(trigger: 'timer' | 'force') {
    const activeCardId = getActiveCardId()
    const alicizationDb = getAlicizationDb()
    const state = await ensureSubconsciousState(activeCardId)
    let proactiveLoopState = await ensureProactiveLoopState(activeCardId)
    const now = Date.now()
    const backgroundAgentTurn = await openAgentTurn({
      cardId: activeCardId,
      turnId: buildMainGatewayAgentTurnId('subconscious-tick', trigger, activeCardId, now),
    })
    const reminderResult = await processDueRemindersForCurrentCard(trigger, backgroundAgentTurn)
    const learningResult = await processDueLearningActionsForCurrentCard(trigger)
    proactiveLoopState = await settleExpiredPendingProactiveOutcomes(activeCardId, now, `subconscious-tick:${trigger}`)
    const elapsedMinutes = Math.max(1 / 6, (now - state.lastTickAt) / 60_000)
    const sensorySnapshot = getSensorySnapshot()
    const cpuUsage = Number(sensorySnapshot?.sample?.cpu?.usagePercent ?? 0)
    let perceptionState = await ensurePerceptionState(activeCardId)
    const rawInterruptionContext = await sampleSubconsciousInterruptionContext()
    const resolvedForegroundWindow = resolveForegroundDecisionTarget({
      snapshotForeground: sensorySnapshot?.sample?.foregroundWindow,
      probedForeground: rawInterruptionContext.foregroundWindow,
      attentionAnchor: getActiveAttentionAnchor(perceptionState, now),
    })
    const interruptionContext = {
      ...rawInterruptionContext,
      foregroundWindow: resolvedForegroundWindow,
    }
    await rememberPerceptionObservation({
      cardId: activeCardId,
      now,
      target: resolvedForegroundWindow,
      source: 'subconscious-tick',
    })
    perceptionState = await ensurePerceptionState(activeCardId)
    let visualPresenceState = await ensureVisualPresenceState(activeCardId)
    const idleLikely = interruptionContext.inputActivity === 'idle'
      || (interruptionContext.inputActivity !== 'active' && cpuUsage <= 10)

    const nextState = {
      ...state,
      boredom: clampNeed(state.boredom + elapsedMinutes * ((cpuUsage >= 70 || interruptionContext.fullscreenLikely) ? 2.2 : 1.2)),
      loneliness: clampNeed(state.loneliness + elapsedMinutes * (idleLikely ? 2.4 : 0.8)),
      fatigue: clampNeed(state.fatigue + elapsedMinutes * 0.6 + reminderResult.completed * 1.2 + learningResult.completed * 0.4),
      lastTickAt: now,
      lastInteractionAt: state.lastInteractionAt,
      updatedAt: now,
    }
    const soulForSubconscious = getSoulSnapshot() ?? await bootstrap()
    const killSwitchSuspended
      = isAlicizationKillSwitchSuspended()
        || getAlicizationCardKillSwitchState(activeCardId) === 'SUSPENDED'
    const hostActive = interruptionContext.inputActivity === 'active'
      || (typeof interruptionContext.idleSeconds === 'number' && interruptionContext.idleSeconds < 5 * 60)
    const lateNightState = updateLateNightActivityState(proactiveLoopState, {
      now,
      hostActive,
      isLateNight: isLateNightWindow(new Date(now)),
    })
    proactiveLoopState = lateNightState.state
    setProactiveLoopStateCache(activeCardId, proactiveLoopState)
    const reminderBacklog = (await alicizationDb.listPendingScheduledTasks(32).catch(() => [])).length
    const canAttemptScreenSemanticSummary
      = !killSwitchSuspended
        && !interruptionContext.fullscreenLikely
        && cpuUsage < 70
        && (interruptionContext.inputActivity !== 'active' || cpuUsage < 45)
    const proactiveGrounding = canAttemptScreenSemanticSummary
      ? await resolveProactiveScreenSemanticSummary({
          cardId: activeCardId,
          now,
          foregroundWindow: interruptionContext.foregroundWindow,
          perceptionState,
          agentTurn: backgroundAgentTurn,
        })
      : {
          summary: null,
          capture: null,
        }
    const screenSemanticSummary = proactiveGrounding.summary
    const proactiveCaptureSnapshot = proactiveGrounding.capture
    const screenSemanticSummaryGroundedThisTurn = Boolean(
      screenSemanticSummary
      && !isResidueBackedScreenSemanticSummary(screenSemanticSummary),
    )
    const layeredContext = buildProactiveLayeredContext({
      now,
      probeSample: sensorySnapshot?.sample,
      interruptionContext,
      subconsciousState: nextState,
      hostAttitude: soulForSubconscious.frontmatter.host_attitude,
      reminderBacklog,
      lateNightActiveMinutes: lateNightState.lateNightActiveMinutes,
      recentProactiveOutcomes: proactiveLoopState.recentOutcomes,
      screenSemanticSummary,
    })
    const perceptionSignals = buildProactivePerceptionSignals({
      now,
      state: perceptionState,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
    })
    const previousWorkingMemoryCount = visualPresenceState.workingMemoryEpisodes.length
    const inferredScenario = inferScenarioFromContext({
      workload: layeredContext.workload.kind,
      content: layeredContext.content.kind,
      lateNight: layeredContext.localTime.isLateNight,
      lateNightActiveMinutes: layeredContext.relationship.lateNightActiveMinutes,
      fatigue: layeredContext.relationship.fatigue,
    })
    let durabilityPulse = consumeDurabilityPulse(activeCardId)
    const currentForegroundPid = Number(
      interruptionContext.foregroundWindow?.pid
      ?? sensorySnapshot?.sample?.foregroundWindow?.pid
      ?? visualPresenceState.currentScene?.target?.pid
      ?? 0,
    )
    const shouldProbeForegroundDurability
      = Number.isFinite(currentForegroundPid)
        && currentForegroundPid > 0
        && (
          visualPresenceState.watchMode === 'symbiotic-vision'
          || visualPresenceState.watchMode === 'recovering'
          || inferredScenario === 'coding'
          || inferredScenario === 'media'
        )
    if (!durabilityPulse && shouldProbeForegroundDurability) {
      const pidAlive = await probeForegroundPidLiveness(currentForegroundPid)
      if (!pidAlive) {
        durabilityPulse = {
          kind: 'process-gone',
          source: 'foreground-app',
          detectedAt: now,
          pid: Math.floor(currentForegroundPid),
          appName: interruptionContext.foregroundWindow?.appName,
          processName: interruptionContext.foregroundWindow?.processName,
          title: interruptionContext.foregroundWindow?.title,
        }
      }
      else {
        const timeoutStreak = updateForegroundProbeTimeoutStreak(currentForegroundPid, interruptionContext.foregroundProbeTimedOut === true)
        if (timeoutStreak >= 2) {
          durabilityPulse = {
            kind: 'anr-likely',
            source: 'foreground-app',
            detectedAt: now,
            pid: Math.floor(currentForegroundPid),
            appName: interruptionContext.foregroundWindow?.appName,
            processName: interruptionContext.foregroundWindow?.processName,
            title: interruptionContext.foregroundWindow?.title,
          }
          clearForegroundProbeTimeoutStreakForPid(Math.floor(currentForegroundPid))
        }
      }
    }
    else if (Number.isFinite(currentForegroundPid) && currentForegroundPid > 0) {
      updateForegroundProbeTimeoutStreak(currentForegroundPid, false)
    }

    const backgroundSceneResidue = getActivePerceptionSceneResidue(perceptionState, now)
    const canUseBackgroundResidueAsLiveSceneSummary = (
      proactiveCaptureSnapshot === null
      || proactiveCaptureSnapshot.health === 'healthy'
    ) && shouldUsePerceptionResidueAsLiveSceneSummary({
      residue: backgroundSceneResidue,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
    })
    const groundedSummary = screenSemanticSummary?.content.summary
      ?? (
        canUseBackgroundResidueAsLiveSceneSummary
          ? backgroundSceneResidue?.summary ?? null
          : null
      )
    const backgroundCaptureGovernance = deriveRuntimeCaptureGovernance({
      capture: proactiveCaptureSnapshot,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      previousCaptureState: visualPresenceState.captureState,
      captureSourceName: screenSemanticSummaryGroundedThisTurn
        ? screenSemanticSummary?.source.name ?? null
        : null,
      now,
    })
    const organicMemorySnapshot = await getOrganicMemorySnapshot().catch(() => null)
    const visualHeartbeat = buildVisualHeartbeat({
      now,
      scenario: inferredScenario,
      previousState: visualPresenceState,
      context: layeredContext,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      groundedSummary,
      screenSemanticSummaryActive: Boolean(screenSemanticSummary),
      durabilityPulse,
    })
    const attention = updateVisualAttentionModel({
      now,
      scenario: inferredScenario,
      previousAttention: visualPresenceState.attention,
      currentForeground: interruptionContext.foregroundWindow ?? sensorySnapshot?.sample?.foregroundWindow,
      currentScene: visualHeartbeat.scene,
      invitedInspectionActive: perceptionSignals.invitedInspectionActive,
      perceptionAnchor: getActiveAttentionAnchor(perceptionState, now)
        ?? perceptionState.lastNonSelfForegroundTarget
        ?? null,
      durabilityPulse,
    })
    const digitalLifeMindState = await buildDigitalLifeMindState({
      cardId: activeCardId,
      now,
      context: layeredContext,
      recentMessages: [],
      previousVisualPresenceState: visualPresenceState,
      visualHeartbeat,
      attention,
      durabilityPulse,
      personalityAuthority: soulForSubconscious.frontmatter.personality,
      inspectionRequested: false,
      groundedThisTurn: screenSemanticSummaryGroundedThisTurn,
      cognitionMode: 'background',
      agentTurn: backgroundAgentTurn,
      selfEvolution: visualPresenceState.selfEvolution ?? null,
      organicMemoryContext: organicMemorySnapshot,
    })
    const previousMindPresenceState = visualPresenceState
    const committedDigitalLifeSpine = commitAlicizationDigitalLifeSpine({
      now,
      previousState: previousMindPresenceState,
      watchMode: visualHeartbeat.watchMode,
      scene: visualHeartbeat.scene,
      attention,
      mindState: digitalLifeMindState,
      captureState: backgroundCaptureGovernance.nextCaptureState,
      durabilityPulse,
      recentTransition: visualHeartbeat.recentTransition,
      nextSuggestedProbeMs: visualHeartbeat.nextSuggestedProbeMs,
    })
    visualPresenceState = committedDigitalLifeSpine.nextState
    const previousDigitalLifeRuntimeSurface = committedDigitalLifeSpine.previous.runtimeSurface
    const digitalLifeRuntimeSurface = committedDigitalLifeSpine.current.runtimeSurface
    const emotionalTransitionLedger = digitalLifeRuntimeSurface.memory?.derivedMindStateBundle?.emotionalTransitionLedger ?? null
    const emotionalKernelForDecay = digitalLifeRuntimeSurface.memory?.emotionalKernel
      ?? digitalLifeRuntimeSurface.memory?.derivedMindStateBundle?.emotionalKernel
      ?? visualPresenceState.emotionalKernel
      ?? null
    const emotionalTransitionDecay = emotionalTransitionLedger
      ? resolveAlicizationEmotionalTransitionDecay({
          ledger: emotionalTransitionLedger,
          now,
          current: emotionalKernelForDecay,
        })
      : null
    await persistVisualPresenceState(activeCardId, visualPresenceState, {
      debounceWindowMs: visualPresenceCapturePersistDebounceWindowMs,
      fingerprint: buildVisualPresenceCapturePersistFingerprint(visualPresenceState),
    })

    const mindContinuityText = buildMindContinuityFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (mindContinuityText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: mindContinuityText,
        sourceKind: 'mind-continuity',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'mind-continuity-write-failed',
          message: 'Failed to append mind continuity fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: mindContinuityText,
          },
        })
      })
    }

    const reflectionLedgerText = buildReflectionLedgerFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (reflectionLedgerText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: reflectionLedgerText,
        sourceKind: 'reflection-ledger',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'reflection-ledger-write-failed',
          message: 'Failed to append reflection-ledger fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: reflectionLedgerText,
          },
        })
      })
    }

    const autobiographicalEpisodeText = buildAutobiographicalEpisodeFragment({
      previousRuntimeSurface: previousDigitalLifeRuntimeSurface,
      nextRuntimeSurface: digitalLifeRuntimeSurface,
    })
    if (autobiographicalEpisodeText) {
      await alicizationDb.appendSubconsciousFragments([{
        text: autobiographicalEpisodeText,
        sourceKind: 'autobiographical-episode',
      }]).catch(async (error: unknown) => {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.mind',
          action: 'autobiographical-episode-write-failed',
          message: 'Failed to append autobiographical episode fragment after subconscious mind-state update.',
          payload: {
            reason: errorMessageFrom(error) ?? 'unknown error',
            fragment: autobiographicalEpisodeText,
          },
        })
      })
    }

    if (visualPresenceState.workingMemoryEpisodes.length > previousWorkingMemoryCount) {
      const latestEpisode = visualPresenceState.workingMemoryEpisodes.at(-1)
      const visualSedimentText = latestEpisode
        ? buildVisualSedimentFragment(latestEpisode)
        : ''
      if (visualSedimentText) {
        await alicizationDb.appendSubconsciousFragments([{
          text: visualSedimentText,
          sourceKind: 'visual-sediment',
        }]).catch(async (error: unknown) => {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.visual-memory',
            action: 'visual-sediment-write-failed',
            message: 'Failed to append visual sediment fragment after visual episode closure.',
            payload: {
              reason: errorMessageFrom(error) ?? 'unknown error',
              fragment: visualSedimentText,
            },
          })
        })
      }
    }

    proactiveLoopState = progressProactiveCadenceState({
      state: proactiveLoopState,
      now,
      context: layeredContext,
      ...committedDigitalLifeSpine.current.proactivePolicy,
      emotionalTransitionDecay,
    })
    setProactiveLoopStateCache(activeCardId, proactiveLoopState)
    const activeSelfRevisionPatch = await getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null

    let proactive = false
    let outwardProactiveTriggered = false
    let suppressed = false
    const executionDelivered = await processPendingExecutionDeliveriesForCurrentCard(trigger, backgroundAgentTurn)
    if (executionDelivered) {
      proactive = true
      outwardProactiveTriggered = true
    }
    else {
      const recentRuntimeActions = backgroundAgentTurn?.getSessionSnapshot().tasks ?? []
      if (recentRuntimeActions.some((action: PresenceOnlyRuntimeAction) =>
        action.kind === 'executor'
        && String(action.label).startsWith('callback:')
        && (action.status === 'completed' || action.status === 'pending'),
      )) {
        proactive = true
      }
      const proactiveRuntimeSnapshot = deriveAlicizationRuntimeSnapshot({
        spine: committedDigitalLifeSpine.current,
        agentRuntime: deriveAlicizationAgentRuntimeTelemetryFromSession(
          backgroundAgentTurn?.getSessionSnapshot(),
        ),
      })
      const decision = evaluateProactivePolicy({
        now,
        context: layeredContext,
        proactiveState: proactiveLoopState,
        killSwitchSuspended,
        personalityAuthority: soulForSubconscious.frontmatter.personality,
        knowledgeEvidence: committedDigitalLifeSpine.current.runtimeSurface.memory.knowledgeEvidence ?? null,
        perception: perceptionSignals,
        runtimeDigest: proactiveRuntimeSnapshot,
        selfRevisionPatch: activeSelfRevisionPatch,
        ...committedDigitalLifeSpine.current.proactivePolicy,
      })
      const preActuationEntrySurface = resolveRuntimeSubconsciousTickEntry({
        decision: {
          shouldInterrupt: decision.shouldInterrupt,
          style: decision.style,
          reasonCodes: decision.reasonCodes,
          presenceOnlyHold: decision.presenceOnlyHold,
        },
        autonomyExecutionProposalSurface: null,
      })
      const policyEvaluatedRuntimeSnapshot = derivePostPolicyQuietHoldRuntimeSnapshot(
        proactiveRuntimeSnapshot,
        {
          shouldPersistVisibleUtterance: preActuationEntrySurface.shouldEnterProactiveFlow,
          reason: preActuationEntrySurface.shouldEnterProactiveFlow
            ? null
            : preActuationEntrySurface.hardSuppressed
              ? null
              : 'proactive-visible-presence-without-utterance',
        },
      )
      if (!decision.shouldInterrupt)
        emitVisualPresencePulse(buildPresencePulsePayload(activeCardId, visualPresenceState))

      await appendAuditLog({
        level: interruptionContext.degraded.length > 0 ? 'warning' : 'notice',
        category: 'alicization.subconscious',
        action: 'proactive-policy-evaluated',
        message: 'Evaluated proactive interruption policy from layered sensory context.',
        payload: {
          trigger,
          consideredSignals: decision.consideredSignals,
          ignoredSignals: decision.ignoredSignals,
          decision: {
            shouldInterrupt: decision.shouldInterrupt,
            confidence: decision.confidence,
            urgency: decision.urgency,
            style: decision.style,
            cooldownMs: decision.cooldownMs,
            scenario: decision.scenario,
            policyVersion: decision.policyVersion,
            reasonCodes: decision.reasonCodes,
            presenceOnlyHold: decision.presenceOnlyHold,
            whyNow: decision.whyNow,
            whyNotLater: decision.whyNotLater,
            feedbackBias: decision.feedbackBias,
            consideredSignals: decision.consideredSignals,
            ignoredSignals: decision.ignoredSignals,
          },
          reasonCodes: decision.reasonCodes,
          style: decision.style,
          whyNow: decision.whyNow,
          whyNotLater: decision.whyNotLater,
          cooldownMs: decision.cooldownMs,
          feedbackBias: decision.feedbackBias,
          perception: perceptionSignals,
          runtimeDigest: policyEvaluatedRuntimeSnapshot ?? proactiveRuntimeSnapshot,
          visualPresence: digitalLifeRuntimeSurface,
          privateThought: digitalLifeRuntimeSurface.cognition.privateThought,
          entrySurface: {
            shouldEnterProactiveFlow: preActuationEntrySurface.shouldEnterProactiveFlow,
            shouldHoldVisibleUtterance: preActuationEntrySurface.shouldHoldVisibleUtterance,
            hardSuppressed: preActuationEntrySurface.hardSuppressed,
          },
          layeredContext,
          agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
        },
      })

      let autonomyActuation: any = null
      let autonomyExecutionProposalSurface: any = null
      try {
        const autonomy = committedDigitalLifeSpine.current.runtimeSurface.agency.autonomy ?? null
        if (autonomy?.selectedMode === 'prepare-act' || autonomy?.selectedMode === 'act') {
          const planningCapabilities = await resolveTaskPlanningCapabilities()
          autonomyActuation = await runAutonomyActuation({
            now,
            cardId: activeCardId,
            sessionId: await ensureActiveOrLatestSessionId(activeCardId),
            digitalLifeSpine: committedDigitalLifeSpine.current,
            runtimeDigest: proactiveRuntimeSnapshot,
            capabilities: planningCapabilities,
            workspaceRoot,
            listPendingReminders: async (limit?: number) =>
              (await alicizationDb.listPendingScheduledTasks(limit ?? 128).catch(() => []))
                .filter((task: any) => String(task?.taskId ?? '').startsWith(`reminder:${activeCardId}:`)),
            scheduleReminder: async (payload: {
              minutes: number
              message: string
              sourceTurnId?: string
            }) => await scheduleAutonomyReminder(activeCardId, payload),
            buildExecutionRuntimeContext: async ({
              cardId,
              decisionTraceId,
              sessionId,
              turnId,
            }) => await backgroundAgentTurn.buildExecutionRuntimeContext({
              cardId,
              decisionTraceId,
              sessionId,
              turnId,
              sensorySnapshot,
            }),
            planTaskThread: async (payload: any) => await planAutonomyTaskThread(activeCardId, payload),
            dispatchTaskThread: async (payload: any) => await dispatchAutonomyTaskThread(payload),
          })
          autonomyExecutionProposalSurface = deriveAutonomyExecutionProposalSurface({
            actuationResult: autonomyActuation,
            digitalLifeSpine: committedDigitalLifeSpine.current,
          })

          if (
            autonomyActuation.reminderScheduled
            || autonomyActuation.taskPlanned
            || autonomyActuation.taskDispatched
          ) {
            proactive = true
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'autonomy-actuation-applied',
              message: 'Applied an autonomous actuation follow-through from the subconscious runtime.',
              payload: {
                trigger,
                autonomy: {
                  selectedMode: autonomy.selectedMode,
                  visibleAction: autonomy.visibleAction,
                  shouldSpeak: autonomy.shouldSpeak,
                  shouldAct: autonomy.shouldAct,
                  actReadiness: autonomy.actReadiness,
                  deferReason: autonomy.deferReason ?? null,
                  executionIntent: autonomy.executionIntent ?? null,
                },
                actuation: autonomyActuation,
                runtimeDigest: proactiveRuntimeSnapshot,
              },
            })
          }
        }
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'alicization.subconscious',
          action: 'autonomy-actuation-failed',
          message: 'Autonomous actuation follow-through failed after policy evaluation.',
          payload: {
            trigger,
            reason: errorMessageFrom(error) ?? 'unknown-error',
            runtimeDigest: proactiveRuntimeSnapshot,
          },
        })
      }

      const entrySurface = resolveRuntimeSubconsciousTickEntry({
        decision,
        autonomyExecutionProposalSurface,
      })
      const policyAdjustedRuntimeSnapshot = derivePostPolicyQuietHoldRuntimeSnapshot(
        proactiveRuntimeSnapshot,
        {
          shouldPersistVisibleUtterance: entrySurface.shouldEnterProactiveFlow,
          reason: entrySurface.shouldEnterProactiveFlow
            ? null
            : entrySurface.hardSuppressed
              ? null
              : 'proactive-visible-presence-without-utterance',
        },
      )
      const { hardSuppressed } = entrySurface
      if (hardSuppressed) {
        suppressed = true
        const obediencePenalty = decision.reasonCodes.includes('busy-host') || decision.reasonCodes.includes('fullscreen-host')
          ? -0.01
          : 0
        if (obediencePenalty !== 0) {
          await queueSoulMutation(async (current: any) => {
            const parsed = parseSoul(current.content)
            const nextPersonality = {
              ...parsed.frontmatter.personality,
              obedience: clamp01(parsed.frontmatter.personality.obedience + obediencePenalty),
            }
            const nextFrontmatter = {
              ...parsed.frontmatter,
              personality: nextPersonality,
            }
            const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
            return snapshotFromContent(toSoulContent(nextFrontmatter, syncedBody))
          })
        }
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'alicization.subconscious.suppressed',
          message: 'Suppressed proactive interruption after policy evaluation.',
          payload: {
            trigger,
            decision: {
              shouldInterrupt: decision.shouldInterrupt,
              confidence: decision.confidence,
              urgency: decision.urgency,
              style: decision.style,
              cooldownMs: decision.cooldownMs,
              scenario: decision.scenario,
              policyVersion: decision.policyVersion,
            },
            reasonCodes: decision.reasonCodes,
            style: decision.style,
            whyNow: decision.whyNow,
            whyNotLater: decision.whyNotLater,
            cooldownMs: decision.cooldownMs,
            feedbackBias: decision.feedbackBias,
            perception: perceptionSignals,
            runtimeDigest: proactiveRuntimeSnapshot,
            obediencePenalty,
          },
        })
      }
      else if (entrySurface.shouldEnterProactiveFlow) {
        const personality = soulForSubconscious.frontmatter.personality
        const personaContext = {
          customDirectives: normalizeCustomDirectives(soulForSubconscious.frontmatter.custom_directives),
          coreIncarnation: soulForSubconscious.frontmatter.core_incarnation,
          hostAttitude: soulForSubconscious.frontmatter.host_attitude,
        }
        const turnId = buildAlicizationAutonomousDialogueTurnId({
          kind: 'subconscious',
          segments: [activeCardId, now],
        })
        const proactiveOrigin = resolveAlicizationAutonomousDialogueOrigin('proactive')
        let structured: any = null
        let deliveryDecision = decision
        let llmStructured: any = null
        let proactiveProviderFailure: {
          reason: string
          providerId: string
          model: string
          failureKind?: AlicizationChatFailureKind | null
        } | null = null
        let organicPromptContext: Awaited<ReturnType<typeof resolveOrganicMemoryPromptContext>> | null = null
        if (autonomyExecutionProposalSurface) {
          const performanceManifest = await getPerformanceManifest()
          const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
            buildDefaultDialoguePerformancePayload(autonomyExecutionProposalSurface.emotion),
            performanceManifest,
            autonomyExecutionProposalSurface.emotion,
          ).performance
          structured = {
            thought: autonomyExecutionProposalSurface.thought,
            emotion: structuredPerformance.baseEmotion,
            reply: autonomyExecutionProposalSurface.reply,
            performance: structuredPerformance,
            parsePath: 'deterministic',
            format: resolveAlicizationAutonomousDialogueStructuredFormat('subconscious-proactive'),
            proactive: buildProactiveMetadataFromDecision({
              decision,
              selfEvolution: committedDigitalLifeSpine.current.runtimeSurface.memory.selfEvolution ?? null,
              learningExecutionState: committedDigitalLifeSpine.current.runtimeSurface.memory.learningExecutionState ?? null,
            }),
          }
          await appendAuditLog({
            level: 'notice',
            category: 'alicization.subconscious',
            action: 'autonomy-execution-proposal-generated',
            message: 'Generated a proactive execution proposal from an affirmation-gated autonomy task thread.',
            payload: {
              turnId,
              proposal: autonomyExecutionProposalSurface,
              actuation: autonomyActuation,
              decision: {
                scenario: decision.scenario,
                style: decision.style,
                urgency: decision.urgency,
                confidence: decision.confidence,
              },
              agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
            },
          })
        }
        else {
          const humanlikeMemoryRecallSeed = await resolveHumanlikeMemoryRecallSeedFromEventHistory({
            listHumanlikeMemoryRecallEvents,
            limit: 24,
          })
          const proactiveRecallSeed = buildProactiveRecallSeed({
            foregroundWindow: interruptionContext.foregroundWindow,
            phantomSeed: [
              buildVisualRecallSeed({
                scene: visualPresenceState.currentScene,
                emotionalTension: visualPresenceState.privateThought?.emotionalTension,
              }),
              humanlikeMemoryRecallSeed,
              buildMindContinuityRecallSeed(digitalLifeRuntimeSurface),
            ].filter(Boolean).join(' | '),
          })
          organicPromptContext = await resolveOrganicMemoryPromptContext({
            recallSeed: proactiveRecallSeed,
            budgetClass: 'proactive-generation',
          })
          const sociallyAdjustedDecision = {
            ...decision,
            style: adjustProactiveStyleFromHostPersonModel({
              currentStyle: decision.style,
              hostPersonModel: organicPromptContext.hostPersonModel ?? null,
              contexts: buildHostSocialContexts({
                scenario: decision.scenario,
                workloadKind: layeredContext.workload.kind,
              }),
              selfEvolution: organicPromptContext.selfEvolution ?? null,
              learningExecutionState: organicPromptContext.learningExecutionState ?? null,
            }),
            presenceOnlyHold: decision.presenceOnlyHold,
          }
          const memoryBoundaryAdjustedDecision = applyProactiveMemoryBoundaryRestraint({
            decision: sociallyAdjustedDecision,
            memorySurfaceRestraint: organicPromptContext.memoryResolutionLedger
              ? {
                  shouldStayInward: organicPromptContext.memoryResolutionLedger.shouldStayInward,
                  shouldDelayUntilAfterPayoff: organicPromptContext.memoryResolutionLedger.shouldDelayUntilAfterPayoff,
                  stableCoreOnly: organicPromptContext.memoryResolutionLedger.stableCoreOnly,
                  visibleCarryMode: organicPromptContext.memoryResolutionLedger.visibleCarryMode,
                }
              : null,
          })
          deliveryDecision = memoryBoundaryAdjustedDecision
          const generated = await generateProactiveStructuredWithGateway(
            personality,
            nextState,
            layeredContext,
            memoryBoundaryAdjustedDecision,
            organicPromptContext,
            perceptionState,
            visualPresenceState,
            {
              turnId,
            },
            backgroundAgentTurn,
          )
          if (
            generated
            && typeof generated === 'object'
            && ('structured' in generated || 'providerFailure' in generated)
          ) {
            llmStructured = generated.structured ?? null
            proactiveProviderFailure = generated.providerFailure ?? null
          }
          else {
            llmStructured = generated
          }
          if (llmStructured) {
            const performanceManifest = await getPerformanceManifest()
            const structuredPerformance = clampAlicizationPerformancePayloadToManifest(
              llmStructured.performance,
              performanceManifest,
              llmStructured.emotion,
            ).performance
            structured = {
              ...llmStructured,
              emotion: structuredPerformance.baseEmotion,
              performance: structuredPerformance,
            }
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'proactive-llm-generated',
              message: 'Generated proactive utterance with policy-locked prompt constraints.',
              payload: {
                decision: {
                  scenario: decision.scenario,
                  style: deliveryDecision.style,
                  urgency: decision.urgency,
                  confidence: decision.confidence,
                },
                format: llmStructured.format,
                recallSeed: proactiveRecallSeed || null,
                recalledFragments: organicPromptContext.recalledFragments.length,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
                selfRevisionPatch: activeSelfRevisionPatch
                  ? {
                      id: activeSelfRevisionPatch.id,
                      lanes: activeSelfRevisionPatch.lanes,
                      reasonCodes: activeSelfRevisionPatch.reasonCodes,
                    }
                  : null,
              },
            })
          }
          else {
            if (proactiveProviderFailure) {
              structured = buildAlicizationMindAuthoringFailureArtifact({
                stage: 'provider-recovery',
                reason: proactiveProviderFailure.reason,
                turnId,
                failureKind: resolveProactiveProviderFailureKind(proactiveProviderFailure),
                reasonCodes: ['proactive-provider-failure'],
              })
            }
            await appendAuditLog({
              level: 'warning',
              category: 'alicization.subconscious',
              action: 'proactive-provider-failed',
              message: 'Provider proactive generation failed; no local mind result was created.',
              payload: {
                decision: {
                  scenario: decision.scenario,
                  style: deliveryDecision.style,
                  urgency: decision.urgency,
                  confidence: decision.confidence,
                },
                customDirectivesChars: personaContext.customDirectives.length,
                recallSeed: proactiveRecallSeed || null,
                recalledFragments: organicPromptContext.recalledFragments.length,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
                selfRevisionPatch: activeSelfRevisionPatch
                  ? {
                      id: activeSelfRevisionPatch.id,
                      lanes: activeSelfRevisionPatch.lanes,
                      reasonCodes: activeSelfRevisionPatch.reasonCodes,
                    }
                  : null,
              },
            })
          }
        }
        const memorySurfaceRestraint = organicPromptContext?.memoryResolutionLedger
          ? {
              shouldStayInward: organicPromptContext.memoryResolutionLedger.shouldStayInward,
              shouldDelayUntilAfterPayoff: organicPromptContext.memoryResolutionLedger.shouldDelayUntilAfterPayoff,
              stableCoreOnly: organicPromptContext.memoryResolutionLedger.stableCoreOnly,
              visibleCarryMode: organicPromptContext.memoryResolutionLedger.visibleCarryMode,
              rationale: organicPromptContext.memoryResolutionLedger.finalRationale,
            }
          : null
        const explicitRelationshipContinuityHold = Boolean(
          activeSelfRevisionPatch
          && (
            activeSelfRevisionPatch.domain === 'relationship'
            || activeSelfRevisionPatch.lanes.includes('relationship-posture')
            || activeSelfRevisionPatch.lanes.includes('relationship-policy')
            || activeSelfRevisionPatch.reasonCodes.includes('domain:relationship')
          ),
        )
        const worldModelVerifyFirstVisibleNudge = (
          activeSelfRevisionPatch?.domain === 'world-model'
          && activeSelfRevisionPatch?.action === 'verify'
          && deliveryDecision.reasonCodes.includes('coding-focus')
          && deliveryDecision.reasonCodes.includes('foreground-error')
          && deliveryDecision.reasonCodes.includes('belief-contradicted')
        )
        const explicitContinuityAfterglowHold = deliveryDecision.reasonCodes.includes('relationship-residue-delay-warmth')
          || deliveryDecision.reasonCodes.includes('continuity-execution-callback-afterglow-hold')
          || (
            deliveryDecision.reasonCodes.includes('continuity-execution-callback-project-carry')
            && !worldModelVerifyFirstVisibleNudge
          )
        const explicitNextOpenWindowHold = deliveryDecision.reasonCodes.includes('continuity-next-open-window')
          && deliveryDecision.style === 'silent-observe'
        const codingFeedbackWindowVisibleNudge = (
          deliveryDecision.style === 'silent-observe'
          && deliveryDecision.scenario === 'coding'
          && typeof structured?.reply === 'string'
          && structured.reply.trim().length > 0
          && typeof structured?.proactive?.feedbackWindowMs === 'number'
          && (
            deliveryDecision.reasonCodes.includes('foreground-error')
            || deliveryDecision.reasonCodes.includes('foreground-diff')
          )
        )
        const verifyFirstCodingVisibleNudge = (
          activeSelfRevisionPatch?.domain === 'world-model'
          && activeSelfRevisionPatch?.action === 'verify'
          && deliveryDecision.reasonCodes.includes('coding-focus')
          && deliveryDecision.reasonCodes.includes('foreground-error')
          && (
            deliveryDecision.reasonCodes.includes('belief-contradicted')
            || deliveryDecision.reasonCodes.includes('world-model-revalidation-required')
          )
        )
        const shouldResolveAsPresenceOnlyHold = (
          !proactiveProviderFailure
          && !verifyFirstCodingVisibleNudge
          && !codingFeedbackWindowVisibleNudge
          && (
            deliveryDecision.presenceOnlyHold === true
            || (
              entrySurface.shouldHoldVisibleUtterance
              && (
                explicitRelationshipContinuityHold
                || explicitContinuityAfterglowHold
                || explicitNextOpenWindowHold
              )
            )
          )
        )
        const proactiveVisibleUtterance = resolveAlicizationProactiveVisibleUtterance({
          kind: autonomyExecutionProposalSurface ? 'autonomy-proposal' : 'subconscious-proactive',
          structured,
          hasMindAuthoredStructured: Boolean(llmStructured),
          actualVisibleReplyAuthority: proactiveProviderFailure
            ? 'non-human-authored-blocked'
            : undefined,
          reason: shouldResolveAsPresenceOnlyHold
            ? 'proactive-visible-presence-without-utterance'
            : proactiveProviderFailure
              ? 'proactive-provider-failure'
              : llmStructured
                ? 'mind-authored-proactive-utterance'
                : 'provider-mind-unavailable-for-proactive-visible-utterance',
          allowDeterministicVisibleFallback: shouldResolveAsPresenceOnlyHold,
          allowTransparentFailureSurface: Boolean(proactiveProviderFailure),
          preferPresenceOnlyHold: shouldResolveAsPresenceOnlyHold,
          selfRevisionPatch: activeSelfRevisionPatch,
          memorySurfaceRestraint,
        })
        await appendAuditLog({
          level: 'notice',
          category: 'alicization.subconscious',
          action: 'proactive-visible-utterance-resolved',
          message: 'Resolved whether a proactive turn should persist a visible utterance or stay as inward presence.',
          payload: {
            turnId,
            trigger,
            hasLlmStructured: Boolean(llmStructured),
            structuredReply: typeof structured?.reply === 'string' ? structured.reply : null,
            deliveryStyle: deliveryDecision.style,
            presenceOnlyHoldRequested: shouldResolveAsPresenceOnlyHold,
            worldModelVerifyFirstVisibleNudge,
            verifyFirstCodingVisibleNudge,
            codingFeedbackWindowVisibleNudge,
            decision: proactiveVisibleUtterance.decision,
            realization: proactiveVisibleUtterance.visibleReplyRealization,
          },
        })
        if (!proactiveVisibleUtterance.shouldPersistVisibleUtterance) {
          proactive = false
          try {
            const persistedPresenceState = await ensureVisualPresenceState(activeCardId)
            const latestRuntimeSurface = committedDigitalLifeSpine.current.runtimeSurface
            const persistedPresenceRuntimeSnapshot = derivePostPolicyQuietHoldRuntimeSnapshot(
              policyAdjustedRuntimeSnapshot ?? proactiveRuntimeSnapshot,
              {
                shouldPersistVisibleUtterance: proactiveVisibleUtterance.shouldPersistVisibleUtterance,
                reason: proactiveVisibleUtterance.decision.reason,
              },
            ) ?? policyAdjustedRuntimeSnapshot ?? proactiveRuntimeSnapshot
            const projectContinuityCue
              = persistedPresenceState.privateThought?.thoughtText
                ?? null
            const authoritativePresenceOnlyContinuityRestraint = derivePresenceOnlyHoldAuthorityContinuityRestraint({
              currentContinuityRestraint:
                digitalLifeRuntimeSurface.mind?.initiative?.continuityRestraint
                ?? (deliveryDecision.style === 'silent-observe' ? 'lower-pressure' : null),
            })
            const persistedInitiative = buildPresenceOnlyHoldInitiativeFallback({
              existingInitiative: digitalLifeRuntimeSurface.mind?.initiative ?? null,
              decision: deliveryDecision,
              continuityRestraint: authoritativePresenceOnlyContinuityRestraint,
              projectContinuityCue,
              privateThought: persistedPresenceState.privateThought ?? null,
            })
            const persistedPrivateThought = persistedPresenceState.privateThought
              ? {
                  ...persistedPresenceState.privateThought,
                  shouldSpeak: persistedInitiative?.shouldSpeak ?? persistedPresenceState.privateThought.shouldSpeak,
                  suggestedStyle: persistedInitiative?.preferredStyle ?? persistedPresenceState.privateThought.suggestedStyle,
                  embodiedPresence: persistedInitiative?.preferredPresence === 'concerned'
                    ? 'concerned'
                    : persistedInitiative?.preferredPresence === 'hesitant'
                      ? 'hesitant'
                      : persistedInitiative?.preferredPresence === 'attentive'
                        ? 'attentive'
                        : persistedPresenceState.privateThought.embodiedPresence,
                  emotionalTension: persistedInitiative?.continuityRestraint === 'repair-before-closeness'
                    ? 'soft-covision'
                    : persistedInitiative?.continuityRestraint === 'rest-protective'
                      ? 'late-night-drain'
                      : persistedInitiative?.continuityRestraint === 'measured-return' || persistedInitiative?.continuityRestraint === 'lower-pressure'
                        ? 'soft-covision'
                        : persistedPresenceState.privateThought.emotionalTension,
                  thoughtText: persistedInitiative?.why
                    || persistedPresenceState.privateThought.thoughtText,
                  rationaleTags: Array.from(new Set([
                    ...(persistedPresenceState.privateThought.rationaleTags ?? []),
                    persistedInitiative?.continuityRestraint === 'repair-before-closeness'
                      ? 'repair-before-closeness'
                      : persistedInitiative?.continuityRestraint === 'rest-protective'
                        ? 'rest-protective'
                        : persistedInitiative?.continuityRestraint === 'measured-return' || persistedInitiative?.continuityRestraint === 'lower-pressure'
                          ? 'measured-return'
                          : '',
                    persistedInitiative?.preferredStyle === 'silent-observe'
                      ? 'quiet-companionship'
                      : '',
                  ].filter(Boolean))),
                }
              : persistedPresenceState.privateThought
            const continuityProjectionFallback = buildPresenceOnlyHoldContinuityProjection({
              previousProjection: persistedPresenceState.personStateProjection ?? null,
              openingGuidance: structured?.proactive?.openingGuidance ?? null,
              continuityRestraint: persistedInitiative?.continuityRestraint ?? null,
              initiativeWhy: persistedInitiative?.why ?? null,
              projectContinuityCue: projectContinuityCue ?? persistedPrivateThought?.thoughtText ?? null,
            })
            const resolvedProjectContinuityCueCandidates = [
              typeof continuityProjectionFallback?.openingGuidance === 'string'
                ? continuityProjectionFallback.openingGuidance
                : null,
              projectContinuityCue,
              persistedPrivateThought?.thoughtText ?? null,
            ].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
            const resolvedProjectContinuityCue = resolvedProjectContinuityCueCandidates[0] ?? null
            const persistedPersonStateProjection = preserveResidentSameLineProjection({
              previousProjection: persistedPresenceState.personStateProjection ?? null,
              nextProjection: latestRuntimeSurface.dialogue?.personStateProjection ?? continuityProjectionFallback,
              conversationState: latestRuntimeSurface.dialogue?.conversationState ?? null,
              dialogueWorldThread: latestRuntimeSurface.dialogue?.dialogueWorldThread ?? null,
            })
            const resolvedPersonStateProjection = persistedPersonStateProjection ?? continuityProjectionFallback
            const resolvedCurrentConsciousFrame = buildPresenceOnlyHoldCurrentConsciousFrame({
              currentConsciousFrame: proactiveRuntimeSnapshot?.currentConsciousFrame ?? latestRuntimeSurface.dialogue?.currentConsciousFrame ?? null,
              continuityRestraint: persistedInitiative?.continuityRestraint ?? null,
              holdDetail:
                typeof continuityProjectionFallback?.sameHerHoldDetail === 'string'
                  ? continuityProjectionFallback.sameHerHoldDetail
                  : null,
              projectStateCarry: {
                continuityCue: resolvedProjectContinuityCue,
              },
            })
            const persistedDerivedMindStateBundle
              = latestRuntimeSurface.memory?.derivedMindStateBundle
                ?? persistedPresenceState.derivedMindStateBundle
                ?? null
            const persistedAffectiveResidue
              = latestRuntimeSurface.memory?.affectiveResidue
                ?? persistedDerivedMindStateBundle?.affectiveResidue
                ?? persistedPresenceState.affectiveResidue
                ?? persistedPresenceState.derivedMindStateBundle?.affectiveResidue
                ?? null
            const persistedSelfState
              = latestRuntimeSurface.agency?.selfState
                ?? persistedPresenceState.selfState
                ?? null
            const persistedSelfEvolution
              = latestRuntimeSurface.memory?.selfEvolution
                ?? persistedDerivedMindStateBundle?.selfEvolution
                ?? persistedPresenceState.selfEvolution
                ?? persistedPresenceState.derivedMindStateBundle?.selfEvolution
                ?? null
            const persistedEmotionalKernel = rebuildPresenceOnlyPersistedEmotionalKernel({
              initiative: persistedInitiative,
              privateThought: persistedPrivateThought,
              selfState: persistedSelfState,
              affectiveResidue: persistedAffectiveResidue,
              personStateProjection: resolvedPersonStateProjection,
              derivedMindStateBundle: persistedDerivedMindStateBundle,
              fallbackEmotionalKernel:
                latestRuntimeSurface.memory?.emotionalKernel
                ?? persistedPresenceState.emotionalKernel
                ?? null,
            })
            const nextPresenceState = updateVisualPresenceState({
              now,
              previousState: persistedPresenceState,
              watchMode: persistedPresenceState.watchMode,
              scene: persistedPresenceState.currentScene,
              attention: persistedPresenceState.attention,
              mindTurnFrame: latestRuntimeSurface.memory?.mindTurnFrame ?? null,
              worldModel: latestRuntimeSurface.world.worldModel ?? null,
              motiveEngine: latestRuntimeSurface.mind?.motiveEngine ?? null,
              habitPolicy: latestRuntimeSurface.mind?.habitPolicy ?? null,
              threadRuntime: latestRuntimeSurface.dialogue?.threadRuntime ?? null,
              conversationState: latestRuntimeSurface.dialogue?.conversationState ?? null,
              dialogueWorldThread: latestRuntimeSurface.dialogue?.dialogueWorldThread ?? null,
              answerCompiler: latestRuntimeSurface.dialogue?.answerCompiler ?? null,
              personStateProjection: resolvedPersonStateProjection,
              currentConsciousFrame: resolvedCurrentConsciousFrame,
              replyDeliberation: latestRuntimeSurface.dialogue?.replyDeliberation ?? null,
              selfState: persistedSelfState,
              selfEvolution: persistedSelfEvolution,
              affectiveResidue: persistedAffectiveResidue,
              autonomy: latestRuntimeSurface.agency?.autonomy ?? null,
              derivedMindStateBundle: persistedDerivedMindStateBundle,
              privateThought: persistedPrivateThought,
              emotionalKernel: persistedEmotionalKernel,
              captureState: persistedPresenceState.captureState,
              durabilityPulse: persistedPresenceState.durabilityPulse,
              recentTransition: persistedPresenceState.recentTransition,
              nextSuggestedProbeMs: persistedPresenceState.nextSuggestedProbeMs,
              initiative: persistedInitiative,
            })
            if (persistedPresenceRuntimeSnapshot) {
              nextPresenceState.runtimeDigest = persistedPresenceRuntimeSnapshot as typeof nextPresenceState.runtimeDigest
              if (nextPresenceState.runtimeDigest.projectState) {
                nextPresenceState.runtimeDigest.projectState
                  = stripPresenceOnlyLegacyProjectState(nextPresenceState.runtimeDigest.projectState)
                nextPresenceState.runtimeDigest.continuityRestraint = null
              }
            }
            if (!nextPresenceState.currentConsciousFrame && persistedPresenceRuntimeSnapshot?.currentConsciousFrame) {
              nextPresenceState.currentConsciousFrame = persistedPresenceRuntimeSnapshot.currentConsciousFrame as typeof nextPresenceState.currentConsciousFrame
            }
            if (!nextPresenceState.initiative && persistedInitiative) {
              nextPresenceState.initiative = persistedInitiative as typeof nextPresenceState.initiative
            }
            if (!nextPresenceState.personStateProjection && continuityProjectionFallback) {
              nextPresenceState.personStateProjection = continuityProjectionFallback as typeof nextPresenceState.personStateProjection
            }
            const nextPresenceStateWithBodyAuthority = bodyKernel.applyToVisualPresenceState({
              now,
              previousState: persistedPresenceState,
              candidateState: {
                ...nextPresenceState,
                emotionalTransitionDecay,
              },
              activeConversation: false,
            })
            let nextPresenceStateToPersist = nextPresenceStateWithBodyAuthority
            try {
              const presenceExpression = await buildAlicizationPresenceExpression({
                trigger: 'presence-only-hold',
                previousState: persistedPresenceState,
                state: nextPresenceStateWithBodyAuthority,
                now,
                generate: generatePresenceExpression,
              })
              if (presenceExpression) {
                nextPresenceStateToPersist = {
                  ...nextPresenceStateWithBodyAuthority,
                  presenceExpression,
                }
              }
            }
            catch {
              nextPresenceStateToPersist = nextPresenceStateWithBodyAuthority
            }
            await persistVisualPresenceState(activeCardId, nextPresenceStateToPersist)
            visualPresenceState = nextPresenceStateToPersist
          }
          catch (error) {
            await appendAuditLog({
              level: 'warning',
              category: 'alicization.subconscious',
              action: 'proactive-presence-only-persist-failed',
              message: 'Failed to persist presence-only proactive continuity into visual presence state.',
              payload: {
                turnId,
                reason: errorMessageFrom(error) ?? 'unknown-error',
              },
            })
          }
          syncAgentTurnSessionMirror({
            agentTurn: backgroundAgentTurn,
            cardId: activeCardId,
            continuitySignals: [
              resolveDeferredAutonomyContinuitySignal({
                now,
                turnId,
                scenario: structured?.proactive?.scenario ?? decision.scenario,
                reason: proactiveVisibleUtterance.decision.reason,
                projectState: null,
                autonomy: committedDigitalLifeSpine.current.runtimeSurface.agency.autonomy ?? null,
              }),
            ],
            sessionId: await ensureActiveOrLatestSessionId(activeCardId),
            source: 'proactive-deferred',
          })
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.subconscious',
            action: 'proactive-visible-utterance-deferred',
            message: 'Deferred proactive visible utterance because normal visible proactive text must be mind-authored.',
            payload: {
              turnId,
              decision: {
                action: proactiveVisibleUtterance.decision.action,
                reason: proactiveVisibleUtterance.decision.reason,
              },
              decisionDetails: proactiveVisibleUtterance.decision,
              realization: proactiveVisibleUtterance.visibleReplyRealization,
              visibleReplyRealization: proactiveVisibleUtterance.visibleReplyRealization,
            },
          })
        }
        else {
          proactive = true
          const deliveredSessionId = await ensureActiveOrLatestSessionId(activeCardId)
          const proactiveStructuredForPersistence = (() => {
            if (!proactiveVisibleUtterance.structuredForPersistence)
              return proactiveVisibleUtterance.structuredForPersistence
            const { projectState: _projectState, ...structuredWithoutProjectState } = proactiveVisibleUtterance.structuredForPersistence
            return {
              ...structuredWithoutProjectState,
              digitalLifeSpine: proactiveVisibleUtterance.structuredForPersistence.digitalLifeSpine
                ?? projectAlicizationDigitalLifeSpineDigest(committedDigitalLifeSpine.current),
            }
          })()
          const performanceManifest = await getPerformanceManifest()
          const normalizedProactiveDialoguePayload = proactiveStructuredForPersistence
            ? normalizeDialogueRespondedPayload({
                turnId,
                sessionId: deliveredSessionId,
                assistantText: proactiveVisibleUtterance.assistantText,
                structured: proactiveStructuredForPersistence,
                origin: proactiveOrigin,
                createdAt: now,
              }, performanceManifest, {
                residentPerformance: visualPresenceState?.residentPerformance ?? null,
              })
            : null
          const persistedStructured = normalizedProactiveDialoguePayload?.structured
            ? (() => {
                const { projectState: _projectState, ...normalizedWithoutProjectState } = normalizedProactiveDialoguePayload.structured
                return {
                  ...proactiveStructuredForPersistence,
                  ...normalizedWithoutProjectState,
                  digitalLifeSpine: normalizedProactiveDialoguePayload.structured.digitalLifeSpine
                    ?? proactiveStructuredForPersistence?.digitalLifeSpine
                    ?? projectAlicizationDigitalLifeSpineDigest(committedDigitalLifeSpine.current),
                }
              })()
            : proactiveStructuredForPersistence
          const persisted = await appendConversationTurnWithGuards({
            turnId,
            sessionId: deliveredSessionId,
            assistantText: proactiveVisibleUtterance.assistantText,
            structured: persistedStructured,
            origin: proactiveOrigin,
            createdAt: now,
          })
          if (!persisted) {
            proactive = false
          }
          else {
            nextState.boredom = clampNeed(nextState.boredom * 0.35)
            nextState.loneliness = clampNeed(nextState.loneliness * 0.4)
            nextState.fatigue = clampNeed(nextState.fatigue + 5)
            outwardProactiveTriggered = true
            syncAgentTurnSessionMirror({
              agentTurn: backgroundAgentTurn,
              cardId: activeCardId,
              continuitySignals: structured.proactive
                ? [buildPendingProactiveContinuitySignal({
                    now,
                    pending: {
                      turnId,
                      scenario: structured.proactive.scenario,
                      deliveredAt: now,
                      feedbackWindowMs: structured.proactive.feedbackWindowMs,
                    },
                  })]
                : undefined,
              sessionId: deliveredSessionId,
              source: 'proactive',
            })
            await appendAuditLog({
              level: 'notice',
              category: 'alicization.subconscious',
              action: 'proactive-triggered',
              message: 'Generated proactive dialogue from the Epoch 3 policy loop.',
              payload: {
                turnId,
                decision: {
                  shouldInterrupt: decision.shouldInterrupt,
                  confidence: decision.confidence,
                  urgency: decision.urgency,
                  style: deliveryDecision.style,
                  cooldownMs: decision.cooldownMs,
                  scenario: decision.scenario,
                  policyVersion: decision.policyVersion,
                },
                reasonCodes: decision.reasonCodes,
                style: deliveryDecision.style,
                format: structured.format,
                proactive: structured.proactive ?? null,
                emotion: structured.emotion,
                trigger,
                agentRuntime: buildAgentRuntimeAuditSnapshot(backgroundAgentTurn),
              },
            })
          }
        }
      }
    }

    const shouldPersist = trigger === 'force'
      || proactive
      || suppressed
      || now - nextState.lastSavedAt >= alicizationSubconsciousPersistMs
    const latestProactiveLoopState = await ensureProactiveLoopState(activeCardId)
    await persistProactiveLoopState(activeCardId, latestProactiveLoopState)
    if (shouldPersist) {
      nextState.lastSavedAt = now
      await persistSubconsciousState(activeCardId, nextState)
    }
    else {
      setSubconsciousStateCache(activeCardId, nextState)
    }
    return { proactive, outwardProactiveTriggered, suppressed }
  }

  return {
    runSubconsciousTickForCurrentCard,
  }
}
