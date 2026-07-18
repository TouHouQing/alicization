import type {
  AlicizationActionEcologySnapshot,
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationAutonomySnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueAct,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDialoguePendingValidationSnapshot,
  AlicizationDialogueResponseNeed,
  AlicizationDialogueTruthExpectation,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationDurabilityPulseSnapshot,
  AlicizationEmotionalKernelSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationInspectionTurnState,
  AlicizationIntentionStreamSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationMindTurnFrameSnapshot,
  AlicizationPersonaKernelMode,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRecallGovernorSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationRuntimeDigest,
  AlicizationRuntimeProjectStateDigest,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubconsciousFragmentSourceKind,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualEpisode,
  AlicizationVisualPresenceStateSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
  AlicizationWorldThreadSnapshot,
} from '../../../shared/eventa'

import {
  deriveAlicizationResidentPerformanceSnapshot,
  normalizeAlicizationNormalVisibleReplyAuthority,
  normalizeAlicizationRuntimeDigest,
  readRecollectionIntentFromDerivedMindStateBundle,
  sanitizeAlicizationMemoryEvidenceText,
} from '@proj-alicization/stage-shared'

import { normalizeClaimEvidenceLedger } from './claim-evidence-ledger'
import { normalizeDialogueActKernel } from './dialogue-act-kernel'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { buildAlicizationEmotionalKernel } from './emotional-kernel'
import { normalizeMindTurnFrame } from './mind-turn-frame'

export const visualWorkingMemoryTtlMs = 10 * 60_000
const visualWorkingMemoryLimit = 8
type AlicizationCurrentConsciousProjectState = NonNullable<NonNullable<AlicizationCurrentConsciousFrameSnapshot['projectState']>>
type AlicizationFullProjectState = AlicizationRuntimeProjectStateDigest
type AlicizationVisualPresenceRuntimeState = NonNullable<NonNullable<AlicizationVisualPresenceStateSnapshot['runtime']>>
const projectStateDigestKeys = [
  'preflightSummary',
  'preDialogueAwarenessLine',
  'preDialogueAwarenessSummary',
  'continuitySummary',
  'awarenessLine',
  'companionHeadlineLine',
  'companionBriefingLine',
  'identity',
  'currentPhase',
  'latestLandedProgress',
  'latestProgress',
  'landedProgressSummary',
  'memoryClosureSummary',
  'primaryOpenLoop',
  'nextClosureTarget',
  'sameHerSelfLine',
  'sameHerHoldDetail',
  'sameHerDriftRisk',
  'emotionalClosureCue',
  'emotionalClosureSummary',
  'proactiveSameHerGap',
  'continuityRestraint',
  'continuityArcStage',
  'continuityPreferredTiming',
  'continuityCadence',
  'continuityCue',
  'preferredBlinkCadence',
  'preferredGazeMode',
  'preferredPauseMode',
  'preferredLipsyncMode',
  'preferredVoiceMode',
  'preferredPacingMode',
] as const satisfies readonly (keyof AlicizationFullProjectState)[]

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeProjectStateContinuityPreferredTiming(raw: unknown): AlicizationCurrentConsciousFrameSnapshot['continuityPreferredTiming'] {
  return raw === 'internal-only'
    || raw === 'after-payoff'
    || raw === 'same-turn-if-invited'
    || raw === 'next-open-window'
    ? raw
    : null
}

function normalizeProjectStateBlinkCadence(raw: unknown): AlicizationCurrentConsciousProjectState['preferredBlinkCadence'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'normal'
    || normalized === 'linger'
    || normalized === 'quiet'
    ? normalized
    : null
}

function normalizeProjectStateGazeMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredGazeMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'steady'
    || normalized === 'soften'
    || normalized === 'drift'
    ? normalized
    : null
}

function normalizeProjectStateContinuityRestraint(raw: unknown): AlicizationCurrentConsciousProjectState['continuityRestraint'] {
  return raw === 'lower-pressure'
    || raw === 'measured-return'
    || raw === 'repair-before-closeness'
    || raw === 'rest-protective'
    || raw === 'single-thread'
    ? raw
    : null
}

function normalizeProjectStateStructuredSlug(raw: unknown) {
  const normalized = sanitizeText(raw, 80).toLowerCase()
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalized) ? normalized : null
}

function normalizeProjectStatePauseMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredPauseMode'] {
  return raw === 'longer' || raw === 'natural' ? raw : null
}

function normalizeProjectStateLipsyncMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredLipsyncMode'] {
  return raw === 'restrained' || raw === 'matched' ? raw : null
}

function normalizeProjectStateVoiceMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredVoiceMode'] {
  return raw === 'lower-pressure' || raw === 'even' ? raw : null
}

function normalizeProjectStatePacingMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredPacingMode'] {
  return raw === 'slower' || raw === 'natural' ? raw : null
}

function normalizeCurrentConsciousProjectStateSnapshot(raw: unknown): AlicizationCurrentConsciousProjectState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const normalized: AlicizationCurrentConsciousProjectState = {
    continuityPreferredTiming: normalizeProjectStateContinuityPreferredTiming(candidate.continuityPreferredTiming),
    continuityCadence: normalizeProjectStateStructuredSlug(candidate.continuityCadence),
    continuityRestraint: normalizeProjectStateContinuityRestraint(candidate.continuityRestraint),
    continuityArcStage: normalizeProjectStateStructuredSlug(candidate.continuityArcStage),
    preferredBlinkCadence: normalizeProjectStateBlinkCadence(candidate.preferredBlinkCadence),
    preferredGazeMode: normalizeProjectStateGazeMode(candidate.preferredGazeMode),
    preferredPauseMode: normalizeProjectStatePauseMode(candidate.preferredPauseMode),
    preferredLipsyncMode: normalizeProjectStateLipsyncMode(candidate.preferredLipsyncMode),
    preferredVoiceMode: normalizeProjectStateVoiceMode(candidate.preferredVoiceMode),
    preferredPacingMode: normalizeProjectStatePacingMode(candidate.preferredPacingMode),
  }

  return Object.values(normalized).some(value => value !== null && value !== undefined)
    ? normalized
    : null
}

function mergeProjectStateSnapshots(
  ...sources: Array<AlicizationCurrentConsciousProjectState | AlicizationFullProjectState | null | undefined>
): AlicizationFullProjectState | null {
  let merged: AlicizationFullProjectState | null = null

  for (const source of sources) {
    if (!source)
      continue
    merged ??= {}
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && value !== undefined)
        (merged as Record<string, unknown>)[key] = value
    }
  }

  return merged
}

function applyExplicitProjectStatePatch(
  state: AlicizationFullProjectState | null,
  rawPatch: unknown,
) {
  if (rawPatch === null)
    return null
  if (!rawPatch || typeof rawPatch !== 'object' || Array.isArray(rawPatch))
    return state

  const patch = rawPatch as Record<string, unknown>
  let next = state

  for (const key of projectStateDigestKeys) {
    if (!Object.prototype.hasOwnProperty.call(patch, key) || patch[key] !== null)
      continue

    next ??= {}
    next = {
      ...next,
      [key]: null,
    }
  }

  return next
}

function normalizeProjectStateSnapshot(raw: unknown): AlicizationFullProjectState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const explicitLatestProgress = sanitizeText(candidate.latestProgress, 320)
  const explicitLatestLandedProgress = sanitizeText(candidate.latestLandedProgress, 320)
  const summaryLatestLandedProgress = sanitizeText(candidate.landedProgressSummary, 320)
  const resolvedLatestLandedProgress
    = explicitLatestLandedProgress || summaryLatestLandedProgress || explicitLatestProgress || null

  const explicitPrimaryOpenLoop = sanitizeText(candidate.primaryOpenLoop, 320)
  const summaryPrimaryOpenLoop = sanitizeText(candidate.openClosureSummary, 320)
  const resolvedPrimaryOpenLoop = explicitPrimaryOpenLoop || summaryPrimaryOpenLoop || null

  const explicitNextClosureTarget = sanitizeText(candidate.nextClosureTarget, 420)
  const summaryNextClosureTarget = sanitizeText(candidate.nextClosureTargetSummary, 420)
  const resolvedNextClosureTarget = explicitNextClosureTarget || summaryNextClosureTarget || null

  const explicitSameHerDriftRisk = sanitizeText(candidate.sameHerDriftRisk, 320)
  const summarySameHerDriftRisk = sanitizeText(candidate.sameHerDriftRiskSummary, 320)
  const resolvedSameHerDriftRisk = explicitSameHerDriftRisk || summarySameHerDriftRisk || null

  const explicitProactiveSameHerGap = sanitizeText(candidate.proactiveSameHerGap, 320)
  const summaryProactiveSameHerGap = sanitizeText(candidate.proactiveSameHerGapSummary, 320)
  const resolvedProactiveSameHerGap
    = explicitProactiveSameHerGap || summaryProactiveSameHerGap || null

  const normalized: AlicizationFullProjectState = {
    preflightSummary: sanitizeText(candidate.preflightSummary, 480) || null,
    preDialogueAwarenessLine: sanitizeText(candidate.preDialogueAwarenessLine, 480) || null,
    preDialogueAwarenessSummary: sanitizeText(candidate.preDialogueAwarenessSummary, 480) || null,
    continuitySummary: sanitizeText(candidate.continuitySummary, 480) || null,
    awarenessLine: sanitizeText(candidate.awarenessLine, 480) || null,
    companionHeadlineLine: sanitizeText(candidate.companionHeadlineLine, 480) || null,
    companionBriefingLine: sanitizeText(candidate.companionBriefingLine, 480) || null,
    identity: sanitizeText(candidate.identity, 320) || null,
    currentPhase: sanitizeText(candidate.currentPhase, 320) || null,
    latestProgress: explicitLatestProgress || resolvedLatestLandedProgress,
    latestLandedProgress: resolvedLatestLandedProgress,
    landedProgressSummary: summaryLatestLandedProgress || resolvedLatestLandedProgress,
    memoryClosureSummary: sanitizeText(candidate.memoryClosureSummary, 320) || null,
    primaryOpenLoop: resolvedPrimaryOpenLoop,
    nextClosureTarget: resolvedNextClosureTarget,
    sameHerSelfLine: sanitizeText(candidate.sameHerSelfLine, 320) || null,
    sameHerHoldDetail: sanitizeText(candidate.sameHerHoldDetail, 320) || null,
    sameHerDriftRisk: resolvedSameHerDriftRisk,
    emotionalClosureCue: sanitizeText(candidate.emotionalClosureCue, 320) || null,
    emotionalClosureSummary: sanitizeText(candidate.emotionalClosureSummary, 320) || null,
    proactiveSameHerGap: resolvedProactiveSameHerGap,
    continuityRestraint: normalizeProjectStateContinuityRestraint(candidate.continuityRestraint),
    continuityArcStage: sanitizeText(candidate.continuityArcStage, 120) || null,
    continuityCue: sanitizeText(candidate.continuityCue, 420) || null,
    preferredBlinkCadence: normalizeProjectStateBlinkCadence(candidate.preferredBlinkCadence),
    preferredGazeMode: normalizeProjectStateGazeMode(candidate.preferredGazeMode),
    preferredPauseMode: normalizeProjectStatePauseMode(candidate.preferredPauseMode),
    preferredLipsyncMode: normalizeProjectStateLipsyncMode(candidate.preferredLipsyncMode),
    preferredVoiceMode: normalizeProjectStateVoiceMode(candidate.preferredVoiceMode),
    preferredPacingMode: normalizeProjectStatePacingMode(candidate.preferredPacingMode),
    continuityPreferredTiming: normalizeProjectStateContinuityPreferredTiming(candidate.continuityPreferredTiming),
    continuityCadence: sanitizeText(candidate.continuityCadence, 120) || null,
  }

  return Object.values(normalized).some(value => value !== null && value !== undefined)
    ? normalized
    : null
}

function normalizeVisualPresenceRuntimeState(raw: unknown): AlicizationVisualPresenceRuntimeState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const normalized: AlicizationVisualPresenceRuntimeState = {
    projectState: normalizeProjectStateSnapshot(candidate.projectState),
    memoryDeliberationProjectStateDiagnostics:
      candidate.memoryDeliberationProjectStateDiagnostics
      && typeof candidate.memoryDeliberationProjectStateDiagnostics === 'object'
      && !Array.isArray(candidate.memoryDeliberationProjectStateDiagnostics)
        ? candidate.memoryDeliberationProjectStateDiagnostics as Record<string, unknown>
        : null,
    effectiveRuntimeAwarenessDiagnostics:
      candidate.effectiveRuntimeAwarenessDiagnostics
      && typeof candidate.effectiveRuntimeAwarenessDiagnostics === 'object'
      && !Array.isArray(candidate.effectiveRuntimeAwarenessDiagnostics)
        ? candidate.effectiveRuntimeAwarenessDiagnostics as Record<string, unknown>
        : null,
  }

  return normalized.projectState
    || normalized.memoryDeliberationProjectStateDiagnostics
    || normalized.effectiveRuntimeAwarenessDiagnostics
    ? normalized
    : null
}

function normalizePresenceAuthorityCurrentBodyState(raw: unknown): AlicizationVisualPresenceStateSnapshot['currentBodyState'] {
  return raw === 'sleep'
    || raw === 'idle'
    || raw === 'noticing'
    || raw === 'accompanying'
    || raw === 'speaking'
    || raw === 'warning'
    || raw === 'recovering'
    ? raw
    : 'idle'
}

function normalizePresenceAuthorityContinuityMode(raw: unknown): AlicizationVisualPresenceStateSnapshot['continuityMode'] {
  return raw === 'ambient-covision'
    || raw === 'quiet-accompaniment'
    || raw === 'active-dialogue'
    || raw === 'protective-watch'
    || raw === 'rest-withdrawal'
    ? raw
    : 'ambient-covision'
}

function normalizePresenceAuthorityQuietLineMs(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.floor(value))
}

function normalizePresenceAuthorityCurrentInwardPreoccupation(raw: unknown) {
  const value = sanitizeText(raw, 160)
  return value || null
}

function withResidentPerformance(state: AlicizationVisualPresenceStateSnapshot): AlicizationVisualPresenceStateSnapshot {
  const autobiographicalSelf = state.autobiographicalSelf ?? null
  const selfEvolution = ((state as AlicizationVisualPresenceStateSnapshot & {
    selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  }).selfEvolution) ?? null
  return {
    ...state,
    residentPerformance: deriveAlicizationResidentPerformanceSnapshot({
      watchMode: state.watchMode,
      currentBodyState: state.currentBodyState,
      continuityMode: state.continuityMode,
      currentInwardPreoccupation: state.currentInwardPreoccupation,
      quietLineMs: state.quietLineMs,
      currentScene: state.currentScene,
      attention: state.attention,
      privateThought: state.privateThought,
      currentConsciousFrame: state.currentConsciousFrame ?? null,
      affectiveResidue: state.affectiveResidue ?? state.derivedMindStateBundle?.affectiveResidue ?? null,
      relationshipTimingBias: selfEvolution
        ? {
            ...selfEvolution,
            source: 'self-evolution',
          }
        : autobiographicalSelf?.relationshipDoctrine || autobiographicalSelf?.latestInflection
          ? {
              relationshipDoctrine: autobiographicalSelf.relationshipDoctrine,
              latestInflection: autobiographicalSelf.latestInflection ?? null,
              source: 'autobiographical-self',
            }
          : null,
      captureState: state.captureState,
      updatedAt: state.updatedAt,
    }, {
      fallbackUpdatedAt: state.updatedAt,
      source: 'main-runtime',
    }),
  }
}

function normalizeTurnAnchorSource(raw: unknown): AlicizationDiscourseStateSnapshot['primaryTurnAnchorSource'] {
  return raw === 'user-text'
    || raw === 'dialogue-summary'
    || raw === 'question'
    || raw === 'focus-summary'
    || raw === 'obligation'
    || raw === 'thread'
    || raw === 'scene'
    || raw === 'carry'
    || raw === 'unknown'
    ? raw
    : null
}

function normalizeDialogueAct(raw: unknown): AlicizationDialogueAct | null {
  return raw === 'ask-help'
    || raw === 'ask-teach'
    || raw === 'verify-grounding'
    || raw === 'correct'
    || raw === 'challenge'
    || raw === 'share-state'
    || raw === 'seek-care'
    || raw === 'social-bid'
    || raw === 'continue-thread'
    || raw === 'close-thread'
    || raw === 'unknown'
    ? raw
    : null
}

function normalizeDialogueResponseNeed(raw: unknown): AlicizationDialogueResponseNeed | null {
  return raw === 'repair'
    || raw === 'guide'
    || raw === 'teach'
    || raw === 'answer'
    || raw === 'care'
    || raw === 'accompany'
    || raw === 'clarify'
    ? raw
    : null
}

function normalizeDialogueTruthExpectation(raw: unknown): AlicizationDialogueTruthExpectation | null {
  return raw === 'strict' || raw === 'normal' || raw === 'light'
    ? raw
    : null
}

function normalizeInspectionTurnState(raw: unknown): AlicizationInspectionTurnState | null {
  return raw === 'dialogue-first'
    || raw === 'inspection-live'
    || raw === 'inspection-carry'
    || raw === 'screen-repair'
    ? raw
    : null
}

function normalizePersonaKernelMode(raw: unknown): AlicizationPersonaKernelMode | null {
  return raw === 'full' || raw === 'backgrounded' || raw === 'muted'
    ? raw
    : null
}

function normalizeSubconsciousFragmentSourceKind(raw: unknown): AlicizationSubconsciousFragmentSourceKind | null {
  return raw === 'active-demotion'
    || raw === 'dream-fragment'
    || raw === 'former-core-incarnation'
    || raw === 'unforged-shattering-event'
    || raw === 'attitude-shift'
    || raw === 'mind-continuity'
    || raw === 'visual-sediment'
    || raw === 'reflection-ledger'
    || raw === 'dialogue-turn'
    || raw === 'fact-ledger'
    ? raw
    : null
}

function normalizeDialogueTurnEncounter(raw: unknown): AlicizationDialogueTurnEncounterSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const act = normalizeDialogueAct(candidate.act)
  const responseNeed = normalizeDialogueResponseNeed(candidate.responseNeed)
  const truthExpectation = normalizeDialogueTruthExpectation(candidate.truthExpectation)
  const subject = candidate.subject
  const screenReferenceMode = candidate.screenReferenceMode
  const continuityMode = candidate.continuityMode
  const inspectionState = normalizeInspectionTurnState(candidate.inspectionState)
  const personaKernelMode = normalizePersonaKernelMode(candidate.personaKernelMode)
  const summary = sanitizeText(candidate.summary, 180)
  if (
    !act
    || !responseNeed
    || !truthExpectation
    || (
      subject !== 'alicization-self'
      && subject !== 'relationship'
      && subject !== 'host-state'
      && subject !== 'task-knot'
      && subject !== 'visible-scene'
      && subject !== 'general'
    )
    || (
      screenReferenceMode !== 'required'
      && screenReferenceMode !== 'helpful'
      && screenReferenceMode !== 'incidental'
      && screenReferenceMode !== 'avoid'
    )
    || (
      continuityMode !== 'dialogue-first'
      && continuityMode !== 'task-first'
      && continuityMode !== 'scene-first'
    )
    || !inspectionState
    || !personaKernelMode
    || !summary
  ) {
    return null
  }

  return {
    act,
    responseNeed,
    truthExpectation,
    subject,
    screenReferenceMode,
    continuityMode,
    inspectionRequested: candidate.inspectionRequested === true,
    inspectionState,
    releaseInspectionCarry: candidate.releaseInspectionCarry === true,
    taskAnchor: sanitizeText(candidate.taskAnchor, 180) || null,
    summary,
    dialogueFirst: candidate.dialogueFirst === true,
    shouldBypassScreenRepair: candidate.shouldBypassScreenRepair === true,
    mustRepairFirst: candidate.mustRepairFirst === true,
    mustAnswerDirectly: candidate.mustAnswerDirectly === true,
    mustStayTaskBound: candidate.mustStayTaskBound === true,
    shouldAskClarifyingQuestion: candidate.shouldAskClarifyingQuestion === true,
    personaKernelMode,
    confidence: clamp01(Number(candidate.confidence)),
    reasonTags: Array.isArray(candidate.reasonTags)
      ? candidate.reasonTags.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 12)
      : [],
  }
}

function normalizePid(raw: unknown) {
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : null
}

function normalizeTarget(raw: AlicizationVisualTarget | null | undefined) {
  if (!raw)
    return null
  const appName = sanitizeText(raw.appName, 120)
  const processName = sanitizeText(raw.processName, 120)
  const title = sanitizeText(raw.title, 220)
  const pid = normalizePid(raw.pid)
  if (!appName && !processName && !title && pid === null)
    return null
  return {
    appName: appName || undefined,
    processName: processName || undefined,
    title: title || undefined,
    pid,
  }
}

function sceneSignature(scene: AlicizationVisualSceneSnapshot | null | undefined) {
  if (!scene)
    return ''
  const target = normalizeTarget(scene.target ?? null)
  return [
    scene.scenario,
    scene.workloadKind,
    scene.contentKind,
    scene.summary ?? '',
    target?.appName ?? '',
    target?.processName ?? '',
    target?.title ?? '',
    target?.pid ?? '',
  ].join('::').toLowerCase()
}

function summarizeScene(scene: AlicizationVisualSceneSnapshot) {
  return sanitizeText(
    scene.summary
    ?? scene.target?.title
    ?? scene.target?.appName
    ?? scene.target?.processName
    ?? `${scene.scenario} ${scene.contentKind}`,
    220,
  )
}

function describeAttentionTarget(target: AlicizationVisualTarget | null | undefined) {
  const normalized = normalizeTarget(target)
  if (!normalized)
    return ''
  return sanitizeText(
    normalized.title
    ?? normalized.appName
    ?? normalized.processName
    ?? '',
    160,
  )
}

function pruneWorkingMemoryEpisodes(episodes: AlicizationVisualEpisode[], now: number) {
  return episodes
    .filter(episode => now - episode.endedAt <= visualWorkingMemoryTtlMs)
    .slice(-visualWorkingMemoryLimit)
}

function normalizeEpisode(raw: unknown): AlicizationVisualEpisode | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const scene = sanitizeText(candidate.scene, 120)
  const summary = sanitizeText(candidate.summary, 220)
  const attentionTarget = sanitizeText(candidate.attentionTarget, 160)
  const beganAt = Number(candidate.beganAt)
  const endedAt = Number(candidate.endedAt)
  const confidence = Number(candidate.confidence)
  const emotionalTension = candidate.emotionalTension
  const sedimentCandidate = candidate.sedimentCandidate === true
  if (
    !scene
    || !summary
    || !Number.isFinite(beganAt)
    || !Number.isFinite(endedAt)
    || (emotionalTension !== 'tense-debug'
      && emotionalTension !== 'focused-flow'
      && emotionalTension !== 'soft-covision'
      && emotionalTension !== 'late-night-drain'
      && emotionalTension !== 'restless-switching'
      && emotionalTension !== 'calm-browse')
  ) {
    return null
  }

  return {
    scene,
    summary,
    attentionTarget: attentionTarget || undefined,
    beganAt: Math.max(0, Math.floor(beganAt)),
    endedAt: Math.max(0, Math.floor(endedAt)),
    confidence: clamp01(confidence),
    emotionalTension,
    sedimentCandidate,
  }
}

function normalizeWorldThread(raw: unknown): AlicizationWorldThreadSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const kind = candidate.kind
  const status = candidate.status
  const source = candidate.source
  if (
    (kind !== 'debugging'
      && kind !== 'change-review'
      && kind !== 'deep-focus'
      && kind !== 'co-viewing'
      && kind !== 'late-night-endurance'
      && kind !== 'chatting'
      && kind !== 'browsing'
      && kind !== 'recovery'
      && kind !== 'unknown')
    || (status !== 'forming' && status !== 'active' && status !== 'lingering')
    || (source !== 'grounded-scene'
      && source !== 'observed-scene'
      && source !== 'continuity'
      && source !== 'durability-pulse'
      && source !== 'working-memory')
  ) {
    return null
  }

  const title = sanitizeText(candidate.title, 140)
  const summary = sanitizeText(candidate.summary, 220)
  if (!title || !summary)
    return null

  return {
    id: sanitizeText(candidate.id, 220) || `${kind}::${title.toLowerCase()}`,
    kind,
    status,
    source,
    title,
    summary,
    confidence: clamp01(Number(candidate.confidence)),
    significance: clamp01(Number(candidate.significance)),
    unresolved: candidate.unresolved === true,
    beganAt: Number.isFinite(Number(candidate.beganAt))
      ? Math.max(0, Math.floor(Number(candidate.beganAt)))
      : 0,
    lastUpdatedAt: Number.isFinite(Number(candidate.lastUpdatedAt))
      ? Math.max(0, Math.floor(Number(candidate.lastUpdatedAt)))
      : 0,
    target: normalizeTarget(candidate.target as AlicizationVisualTarget | null | undefined),
  }
}

function normalizeWorldModel(raw: unknown): AlicizationWorldModelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const certainty = candidate.epistemicState && typeof candidate.epistemicState === 'object'
    ? (candidate.epistemicState as Record<string, unknown>).certainty
    : null
  const freshness = candidate.epistemicState && typeof candidate.epistemicState === 'object'
    ? (candidate.epistemicState as Record<string, unknown>).freshness
    : null
  const continuityLabel = candidate.continuity && typeof candidate.continuity === 'object'
    ? (candidate.continuity as Record<string, unknown>).label
    : null
  const hostAvailability = candidate.hostState && typeof candidate.hostState === 'object'
    ? (candidate.hostState as Record<string, unknown>).availability
    : null
  const hostBurden = candidate.hostState && typeof candidate.hostState === 'object'
    ? (candidate.hostState as Record<string, unknown>).burden
    : null
  if (
    (certainty !== 'grounded' && certainty !== 'observed' && certainty !== 'lingering' && certainty !== 'uncertain')
    || (freshness !== 'live' && freshness !== 'recent' && freshness !== 'stale')
    || (continuityLabel !== 'new-focus'
      && continuityLabel !== 'staying-with-thread'
      && continuityLabel !== 'scene-shift'
      && continuityLabel !== 'afterglow'
      && continuityLabel !== 'recovery'
      && continuityLabel !== 'reacquired')
    || (hostAvailability !== 'immersed'
      && hostAvailability !== 'focused'
      && hostAvailability !== 'open'
      && hostAvailability !== 'fatigued'
      && hostAvailability !== 'drifting')
    || (hostBurden !== 'light' && hostBurden !== 'moderate' && hostBurden !== 'heavy')
  ) {
    return null
  }

  const epistemicStateRaw = candidate.epistemicState as Record<string, unknown>
  const continuityRaw = candidate.continuity as Record<string, unknown>
  return {
    activeThread: normalizeWorldThread(candidate.activeThread),
    lingeringThreads: Array.isArray(candidate.lingeringThreads)
      ? candidate.lingeringThreads
          .map(normalizeWorldThread)
          .filter((thread): thread is AlicizationWorldThreadSnapshot => Boolean(thread))
          .slice(0, 4)
      : [],
    focusTarget: normalizeTarget(candidate.focusTarget as AlicizationVisualTarget | null | undefined),
    epistemicState: {
      certainty,
      freshness,
      seenNow: Array.isArray(epistemicStateRaw.seenNow)
        ? epistemicStateRaw.seenNow.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
      inferredNow: Array.isArray(epistemicStateRaw.inferredNow)
        ? epistemicStateRaw.inferredNow.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
      openQuestions: Array.isArray(epistemicStateRaw.openQuestions)
        ? epistemicStateRaw.openQuestions.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
      staleRisks: Array.isArray(epistemicStateRaw.staleRisks)
        ? epistemicStateRaw.staleRisks.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
    },
    continuity: {
      label: continuityLabel,
      sceneAgeMs: Number.isFinite(Number(continuityRaw.sceneAgeMs))
        ? Math.max(0, Math.floor(Number(continuityRaw.sceneAgeMs)))
        : 0,
      attentionAgeMs: Number.isFinite(Number(continuityRaw.attentionAgeMs))
        ? Math.max(0, Math.floor(Number(continuityRaw.attentionAgeMs)))
        : 0,
      sameSceneAsBefore: continuityRaw.sameSceneAsBefore === true,
      sameAttentionAsBefore: continuityRaw.sameAttentionAsBefore === true,
      afterglowOpen: continuityRaw.afterglowOpen === true,
    },
    hostState: {
      availability: hostAvailability,
      burden: hostBurden,
    },
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeAppraisal(raw: unknown): AlicizationSubjectiveSceneAppraisal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const inferredHostGoal = candidate.inferredHostGoal
  if (
    inferredHostGoal !== 'resolve-problem'
    && inferredHostGoal !== 'inspect-change'
    && inferredHostGoal !== 'consume-media'
    && inferredHostGoal !== 'rest'
    && inferredHostGoal !== 'chat'
    && inferredHostGoal !== 'browse'
    && inferredHostGoal !== 'stay-connected'
    && inferredHostGoal !== 'continue-thread'
    && inferredHostGoal !== 'keep-going'
    && inferredHostGoal !== 'finish-one-more-step'
    && inferredHostGoal !== 'resume-work'
    && inferredHostGoal !== 'continue-phase-1-line'
    && inferredHostGoal !== 'unknown'
  ) {
    return null
  }

  const relationshipNeed = candidate.relationshipNeed
  const source = candidate.source
  return {
    inferredHostGoal,
    currentKnot: sanitizeText(candidate.currentKnot, 120) || undefined,
    whatChanged: sanitizeText(candidate.whatChanged, 160) || undefined,
    waitingToVerify: sanitizeText(candidate.waitingToVerify, 160) || undefined,
    situatedMeaning: sanitizeText(candidate.situatedMeaning, 180) || undefined,
    relationshipNeed: relationshipNeed === 'space'
      || relationshipNeed === 'companionship'
      || relationshipNeed === 'guidance'
      || relationshipNeed === 'care'
      || relationshipNeed === 'unclear'
      ? relationshipNeed
      : 'unclear',
    source: source === 'heuristic' || source === 'structured-cognition' || source === 'hybrid'
      ? source
      : 'heuristic',
    confidence: clamp01(Number(candidate.confidence)),
    surprise: clamp01(Number(candidate.surprise)),
    carePressure: clamp01(Number(candidate.carePressure)),
    interruptionCost: clamp01(Number(candidate.interruptionCost)),
    desireToSpeak: clamp01(Number(candidate.desireToSpeak)),
    notes: Array.isArray(candidate.notes)
      ? candidate.notes
          .filter((item): item is string => typeof item === 'string')
          .map(item => sanitizeText(item, 48).toLowerCase())
          .filter(Boolean)
          .slice(0, 8)
      : [],
  }
}

function normalizeBeliefLedger(raw: unknown): AlicizationBeliefLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const beliefs = Array.isArray(candidate.beliefs)
    ? candidate.beliefs.filter(item => item && typeof item === 'object') as AlicizationBeliefLedgerSnapshot['beliefs']
    : []
  const unresolvedContradictions = Array.isArray(candidate.unresolvedContradictions)
    ? candidate.unresolvedContradictions
        .filter((item): item is string => typeof item === 'string')
        .map(item => sanitizeText(item, 180))
        .filter(Boolean)
        .slice(0, 8)
    : []
  return {
    focusBeliefId: sanitizeText(candidate.focusBeliefId, 160) || null,
    beliefs: beliefs.slice(0, 8),
    unresolvedContradictions,
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeSubjectiveInference(raw: unknown): AlicizationSubjectiveInferenceSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const source = candidate.source
  if (
    typeof candidate.dominantInterpretation !== 'string'
    || (source !== undefined && source !== 'heuristic' && source !== 'structured-cognition' && source !== 'hybrid')
  ) {
    return null
  }

  const hostIntentCandidates = Array.isArray(candidate.hostIntentCandidates)
    ? candidate.hostIntentCandidates
        .filter(item => item && typeof item === 'object')
        .map((item) => {
          const value = item as Record<string, unknown>
          const goal = value.goal
          const why = sanitizeText(value.why, 180)
          if (
            (goal !== 'resolve-problem'
              && goal !== 'inspect-change'
              && goal !== 'consume-media'
              && goal !== 'rest'
              && goal !== 'chat'
              && goal !== 'browse'
              && goal !== 'unknown')
            || !why
          ) {
            return null
          }
          return {
            goal,
            confidence: clamp01(Number(value.confidence)),
            why,
          }
        })
        .filter((item): item is AlicizationSubjectiveInferenceSnapshot['hostIntentCandidates'][number] => Boolean(item))
        .slice(0, 4)
    : []

  const relationshipNeedCandidates = Array.isArray(candidate.relationshipNeedCandidates)
    ? candidate.relationshipNeedCandidates
        .filter(item => item && typeof item === 'object')
        .map((item) => {
          const value = item as Record<string, unknown>
          const need = value.need
          const why = sanitizeText(value.why, 180)
          if (
            (need !== 'space'
              && need !== 'companionship'
              && need !== 'guidance'
              && need !== 'care'
              && need !== 'unclear')
            || !why
          ) {
            return null
          }
          return {
            need,
            confidence: clamp01(Number(value.confidence)),
            why,
          }
        })
        .filter((item): item is AlicizationSubjectiveInferenceSnapshot['relationshipNeedCandidates'][number] => Boolean(item))
        .slice(0, 4)
    : []

  return {
    dominantInterpretation: sanitizeText(candidate.dominantInterpretation, 220),
    situatedMeaning: sanitizeText(candidate.situatedMeaning, 220) || undefined,
    selfQuestion: sanitizeText(candidate.selfQuestion, 220) || undefined,
    uncertainty: sanitizeText(candidate.uncertainty, 220) || undefined,
    hostIntentCandidates,
    relationshipNeedCandidates,
    confidence: clamp01(Number(candidate.confidence)),
    source: source === 'heuristic' || source === 'structured-cognition' || source === 'hybrid'
      ? source
      : 'heuristic',
    notes: Array.isArray(candidate.notes)
      ? candidate.notes.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeRelationshipModel(raw: unknown): AlicizationRelationshipModelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const climate = candidate.climate
  const approachVector = candidate.approachVector
  if (
    (climate !== 'guarded' && climate !== 'neutral' && climate !== 'warm' && climate !== 'attuned')
    || (approachVector !== 'give-space' && approachVector !== 'stay-near' && approachVector !== 'guide' && approachVector !== 'care')
  ) {
    return null
  }
  return {
    climate,
    approachVector,
    receptivity: clamp01(Number(candidate.receptivity)),
    sharedAttentionTrust: clamp01(Number(candidate.sharedAttentionTrust)),
    correctionSensitivity: clamp01(Number(candidate.correctionSensitivity)),
    reciprocityExpectation: clamp01(Number(candidate.reciprocityExpectation)),
    activeBoundaries: Array.isArray(candidate.activeBoundaries)
      ? candidate.activeBoundaries.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeInquiryLoop(raw: unknown): AlicizationInquiryLoopSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    primaryInquiryId: sanitizeText(candidate.primaryInquiryId, 160) || null,
    inquiries: Array.isArray(candidate.inquiries)
      ? candidate.inquiries.filter(item => item && typeof item === 'object') as AlicizationInquiryLoopSnapshot['inquiries']
      : [],
    openCount: Number.isFinite(Number(candidate.openCount))
      ? Math.max(0, Math.floor(Number(candidate.openCount)))
      : 0,
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeBeliefRevision(raw: unknown): AlicizationBeliefRevisionSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const stability = candidate.stability
  if (stability !== 'stable' && stability !== 'fluid' && stability !== 'fractured')
    return null
  return {
    dominantBeliefId: sanitizeText(candidate.dominantBeliefId, 160) || null,
    stability,
    revisionPressure: clamp01(Number(candidate.revisionPressure)),
    groundingNeed: clamp01(Number(candidate.groundingNeed)),
    contradictionPressure: clamp01(Number(candidate.contradictionPressure)),
    hostCorrectionWeight: clamp01(Number(candidate.hostCorrectionWeight)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeHypothesisGraph(raw: unknown): AlicizationHypothesisGraphSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    activeHypothesisId: sanitizeText(candidate.activeHypothesisId, 160) || null,
    focusHypothesisIds: Array.isArray(candidate.focusHypothesisIds)
      ? candidate.focusHypothesisIds
          .filter((item): item is string => typeof item === 'string')
          .map(item => sanitizeText(item, 160))
          .filter(Boolean)
          .slice(0, 4)
      : [],
    driftPressure: clamp01(Number(candidate.driftPressure)),
    hypotheses: Array.isArray(candidate.hypotheses)
      ? candidate.hypotheses.filter(item => item && typeof item === 'object') as AlicizationHypothesisGraphSnapshot['hypotheses']
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 64).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeDeliberationState(raw: unknown): AlicizationDeliberationStateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantNeed = candidate.dominantNeed
  if (
    dominantNeed !== 'ground-truth'
    && dominantNeed !== 'guidance'
    && dominantNeed !== 'companionship'
    && dominantNeed !== 'care'
    && dominantNeed !== 'repair'
    && dominantNeed !== 'restraint'
  ) {
    return null
  }
  return {
    primaryThreadId: sanitizeText(candidate.primaryThreadId, 160) || null,
    dominantNeed,
    readiness: clamp01(Number(candidate.readiness)),
    threads: Array.isArray(candidate.threads)
      ? candidate.threads.filter(item => item && typeof item === 'object') as AlicizationDeliberationStateSnapshot['threads']
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeActionEcology(raw: unknown): AlicizationActionEcologySnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const mode = candidate.mode
  const suggestedStyle = candidate.suggestedStyle
  const embodiedPresence = candidate.embodiedPresence
  if (
    mode !== 'silent-presence'
    && mode !== 'quiet-accompany'
    && mode !== 'repair-before-speaking'
    && mode !== 'return-later'
    && mode !== 'surface-nudge'
    && mode !== 'surface-care'
    && mode !== 'surface-warning'
  ) {
    return null
  }
  return {
    mode,
    selectedThreadId: sanitizeText(candidate.selectedThreadId, 160) || null,
    readiness: clamp01(Number(candidate.readiness)),
    surfacePressure: clamp01(Number(candidate.surfacePressure)),
    silencePressure: clamp01(Number(candidate.silencePressure)),
    suggestedStyle: suggestedStyle === 'silent-observe'
      || suggestedStyle === 'light-nudge'
      || suggestedStyle === 'gentle-care'
      || suggestedStyle === 'firm-warning'
      ? suggestedStyle
      : 'silent-observe',
    embodiedPresence: embodiedPresence === 'none'
      || embodiedPresence === 'glance'
      || embodiedPresence === 'attentive'
      || embodiedPresence === 'hesitant'
      || embodiedPresence === 'concerned'
      ? embodiedPresence
      : 'glance',
    shouldSurface: candidate.shouldSurface === true,
    shouldSpeak: candidate.shouldSpeak === true,
    why: sanitizeText(candidate.why, 200),
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeCounterfactualDeliberation(raw: unknown): AlicizationCounterfactualDeliberationSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const selectedAction = candidate.selectedAction
  if (
    selectedAction !== 'wait'
    && selectedAction !== 'recheck'
    && selectedAction !== 'hover'
    && selectedAction !== 'whisper'
    && selectedAction !== 'speak'
    && selectedAction !== 'warn'
  ) {
    return null
  }
  return {
    selectedOptionId: sanitizeText(candidate.selectedOptionId, 160) || null,
    selectedAction,
    confidence: clamp01(Number(candidate.confidence)),
    dominantTradeoff: sanitizeText(candidate.dominantTradeoff, 120),
    options: Array.isArray(candidate.options)
      ? candidate.options
          .filter(item => item && typeof item === 'object')
          .map((item) => {
            const option = item as Record<string, unknown>
            const action = option.action
            const style = option.style
            const embodiedPresence = option.embodiedPresence
            if (
              (action !== 'wait'
                && action !== 'recheck'
                && action !== 'hover'
                && action !== 'whisper'
                && action !== 'speak'
                && action !== 'warn')
              || (style !== 'silent-observe'
                && style !== 'light-nudge'
                && style !== 'gentle-care'
                && style !== 'firm-warning')
              || (embodiedPresence !== 'none'
                && embodiedPresence !== 'glance'
                && embodiedPresence !== 'attentive'
                && embodiedPresence !== 'hesitant'
                && embodiedPresence !== 'concerned')
            ) {
              return null
            }
            return {
              id: sanitizeText(option.id, 160) || `counterfactual::${action}`,
              action,
              style,
              embodiedPresence,
              relationshipCost: clamp01(Number(option.relationshipCost)),
              interruptionCost: clamp01(Number(option.interruptionCost)),
              informationGain: clamp01(Number(option.informationGain)),
              timingFitness: clamp01(Number(option.timingFitness)),
              identityFit: clamp01(Number(option.identityFit)),
              score: clamp01(Number(option.score)),
              why: sanitizeText(option.why, 220),
            }
          })
          .filter((item): item is AlicizationCounterfactualDeliberationSnapshot['options'][number] => Boolean(item))
          .slice(0, 6)
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 120)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeThreadRuntime(raw: unknown): AlicizationThreadRuntimeStateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    foregroundThreadId: sanitizeText(candidate.foregroundThreadId, 160) || null,
    threads: Array.isArray(candidate.threads)
      ? candidate.threads.filter(item => item && typeof item === 'object') as AlicizationThreadRuntimeStateSnapshot['threads']
      : [],
    driftPressure: clamp01(Number(candidate.driftPressure)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 64).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeCommitmentLedger(raw: unknown): AlicizationCommitmentLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    governingCommitmentId: sanitizeText(candidate.governingCommitmentId, 160) || null,
    commitments: Array.isArray(candidate.commitments)
      ? candidate.commitments.filter(item => item && typeof item === 'object') as AlicizationCommitmentLedgerSnapshot['commitments']
      : [],
    carryPressure: clamp01(Number(candidate.carryPressure)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeInquiryPlanner(raw: unknown): AlicizationInquiryPlannerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    activePlanId: sanitizeText(candidate.activePlanId, 160) || null,
    plans: Array.isArray(candidate.plans)
      ? candidate.plans.filter(item => item && typeof item === 'object') as AlicizationInquiryPlannerSnapshot['plans']
      : [],
    epistemicPressure: clamp01(Number(candidate.epistemicPressure)),
    groundingUrgency: clamp01(Number(candidate.groundingUrgency)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeMindKernel(raw: unknown): AlicizationMindKernelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantMode = candidate.dominantMode
  if (
    dominantMode !== 'orienting'
    && dominantMode !== 'tracking'
    && dominantMode !== 'repairing'
    && dominantMode !== 'accompanying'
    && dominantMode !== 'guarding'
    && dominantMode !== 'resting'
  ) {
    return null
  }
  return {
    dominantMode,
    governingHypothesisId: sanitizeText(candidate.governingHypothesisId, 160) || null,
    governingRuntimeThreadId: sanitizeText(candidate.governingRuntimeThreadId, 160) || null,
    governingCommitmentId: sanitizeText(candidate.governingCommitmentId, 160) || null,
    governingInquiryPlanId: sanitizeText(candidate.governingInquiryPlanId, 160) || null,
    worldPressure: clamp01(Number(candidate.worldPressure)),
    epistemicPressure: clamp01(Number(candidate.epistemicPressure)),
    relationalPressure: clamp01(Number(candidate.relationalPressure)),
    carePressure: clamp01(Number(candidate.carePressure)),
    continuityPressure: clamp01(Number(candidate.continuityPressure)),
    speakReadiness: clamp01(Number(candidate.speakReadiness)),
    presenceWeight: clamp01(Number(candidate.presenceWeight)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeMindDynamics(raw: unknown): AlicizationMindDynamicsSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantMotive = candidate.dominantMotive
  const motivesRaw = candidate.motives && typeof candidate.motives === 'object' && !Array.isArray(candidate.motives)
    ? candidate.motives as Record<string, unknown>
    : {}
  const motives: AlicizationMindDynamicsSnapshot['motives'] = {}
  for (const key of ['accompany', 'protect', 'clarify', 'care', 'curiosity', 'stay-silent'] as const) {
    const value = Number(motivesRaw[key])
    if (Number.isFinite(value))
      motives[key] = clamp01(value)
  }

  return {
    dominantMotive: dominantMotive === 'accompany'
      || dominantMotive === 'protect'
      || dominantMotive === 'clarify'
      || dominantMotive === 'care'
      || dominantMotive === 'curiosity'
      || dominantMotive === 'stay-silent'
      ? dominantMotive
      : null,
    worldPressure: clamp01(Number(candidate.worldPressure)),
    epistemicPressure: clamp01(Number(candidate.epistemicPressure)),
    relationalPressure: clamp01(Number(candidate.relationalPressure)),
    carePressure: clamp01(Number(candidate.carePressure)),
    continuityPressure: clamp01(Number(candidate.continuityPressure)),
    restraintPressure: clamp01(Number(candidate.restraintPressure)),
    surfacePressure: clamp01(Number(candidate.surfacePressure)),
    speakReadiness: clamp01(Number(candidate.speakReadiness)),
    presenceWeight: clamp01(Number(candidate.presenceWeight)),
    motives,
    speakDrive: clamp01(Number(candidate.speakDrive)),
    silenceDrive: clamp01(Number(candidate.silenceDrive)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeInitiative(raw: unknown): AlicizationInitiativeSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const selectedAction = candidate.selectedAction
  if (
    selectedAction !== 'wait'
    && selectedAction !== 'recheck'
    && selectedAction !== 'hover'
    && selectedAction !== 'whisper'
    && selectedAction !== 'speak'
    && selectedAction !== 'warn'
  ) {
    return null
  }

  const motivesRaw = candidate.motives && typeof candidate.motives === 'object' && !Array.isArray(candidate.motives)
    ? candidate.motives as Record<string, unknown>
    : {}
  const motives: AlicizationInitiativeSnapshot['motives'] = {}
  for (const key of ['accompany', 'protect', 'clarify', 'care', 'curiosity', 'stay-silent'] as const) {
    const value = Number(motivesRaw[key])
    if (Number.isFinite(value))
      motives[key] = clamp01(value)
  }

  const preferredStyle = candidate.preferredStyle
  const preferredPresence = candidate.preferredPresence
  const continuityRestraint = candidate.continuityRestraint
  return {
    selectedAction,
    selectedProposalId: sanitizeText(candidate.selectedProposalId, 160) || null,
    selectedTruthFrame: candidate.selectedTruthFrame === 'live'
      || candidate.selectedTruthFrame === 'remembered'
      || candidate.selectedTruthFrame === 'imagined'
      ? candidate.selectedTruthFrame
      : null,
    selectedCounterfactualOptionId: sanitizeText(candidate.selectedCounterfactualOptionId, 160) || null,
    selectedConcernId: sanitizeText(candidate.selectedConcernId, 120) || null,
    selectedBeliefId: sanitizeText(candidate.selectedBeliefId, 120) || null,
    selectedInquiryId: sanitizeText(candidate.selectedInquiryId, 120) || null,
    selectedCommitmentId: sanitizeText(candidate.selectedCommitmentId, 120) || null,
    selectedInquiryPlanId: sanitizeText(candidate.selectedInquiryPlanId, 120) || null,
    selectedHypothesisId: sanitizeText(candidate.selectedHypothesisId, 120) || null,
    selectedThreadId: sanitizeText(candidate.selectedThreadId, 120) || null,
    selectedRuntimeThreadId: sanitizeText(candidate.selectedRuntimeThreadId, 120) || null,
    selectedThoughtThreadId: sanitizeText(candidate.selectedThoughtThreadId, 120) || null,
    selectedGovernorIntentionId: sanitizeText(candidate.selectedGovernorIntentionId, 120) || null,
    actionEcologyMode: candidate.actionEcologyMode === 'silent-presence'
      || candidate.actionEcologyMode === 'quiet-accompany'
      || candidate.actionEcologyMode === 'repair-before-speaking'
      || candidate.actionEcologyMode === 'return-later'
      || candidate.actionEcologyMode === 'surface-nudge'
      || candidate.actionEcologyMode === 'surface-care'
      || candidate.actionEcologyMode === 'surface-warning'
      ? candidate.actionEcologyMode
      : null,
    confidence: clamp01(Number(candidate.confidence)),
    motives,
    speakDrive: clamp01(Number(candidate.speakDrive)),
    silenceDrive: clamp01(Number(candidate.silenceDrive)),
    preferredStyle: preferredStyle === 'silent-observe'
      || preferredStyle === 'light-nudge'
      || preferredStyle === 'gentle-care'
      || preferredStyle === 'firm-warning'
      ? preferredStyle
      : 'silent-observe',
    preferredPresence: preferredPresence === 'none'
      || preferredPresence === 'glance'
      || preferredPresence === 'attentive'
      || preferredPresence === 'hesitant'
      || preferredPresence === 'concerned'
      ? preferredPresence
      : 'glance',
    continuityRestraint: continuityRestraint === 'lower-pressure'
      || continuityRestraint === 'measured-return'
      || continuityRestraint === 'repair-before-closeness'
      || continuityRestraint === 'rest-protective'
      ? continuityRestraint
      : null,
    why: sanitizeText(candidate.why, 200),
    shouldSurface: candidate.shouldSurface === true,
    shouldSpeak: candidate.shouldSpeak === true,
  }
}

function normalizeAutonomy(raw: unknown): AlicizationAutonomySnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const selectedMode = candidate.selectedMode
  if (
    selectedMode !== 'wait'
    && selectedMode !== 'recheck'
    && selectedMode !== 'hover'
    && selectedMode !== 'whisper'
    && selectedMode !== 'speak'
    && selectedMode !== 'warn'
    && selectedMode !== 'prepare-act'
    && selectedMode !== 'act'
  ) {
    return null
  }

  const visibleAction = candidate.visibleAction
  if (
    visibleAction !== 'wait'
    && visibleAction !== 'recheck'
    && visibleAction !== 'hover'
    && visibleAction !== 'whisper'
    && visibleAction !== 'speak'
    && visibleAction !== 'warn'
  ) {
    return null
  }

  const executionIntent = candidate.executionIntent && typeof candidate.executionIntent === 'object' && !Array.isArray(candidate.executionIntent)
    ? candidate.executionIntent as Record<string, unknown>
    : null

  return {
    selectedMode,
    visibleAction,
    shouldSurface: candidate.shouldSurface === true,
    shouldSpeak: candidate.shouldSpeak === true,
    shouldAct: candidate.shouldAct === true,
    speakReadiness: clamp01(Number(candidate.speakReadiness)),
    actReadiness: clamp01(Number(candidate.actReadiness)),
    inhibition: clamp01(Number(candidate.inhibition)),
    confidence: clamp01(Number(candidate.confidence)),
    deferReason: sanitizeText(candidate.deferReason, 160) || null,
    guardReasons: Array.isArray(candidate.guardReasons)
      ? candidate.guardReasons.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 64)).filter(Boolean).slice(0, 6)
      : [],
    whyNow: sanitizeText(candidate.whyNow, 220),
    sourceGoalId: sanitizeText(candidate.sourceGoalId, 120) || null,
    sourceGoalSummary: sanitizeText(candidate.sourceGoalSummary, 180) || null,
    sourceAgendaId: sanitizeText(candidate.sourceAgendaId, 120) || null,
    sourceAgendaKind: sanitizeText(candidate.sourceAgendaKind, 64) || null,
    sourceAgendaSummary: sanitizeText(candidate.sourceAgendaSummary, 180) || null,
    sourceThreadId: sanitizeText(candidate.sourceThreadId, 120) || null,
    sourceThreadSummary: sanitizeText(candidate.sourceThreadSummary, 180) || null,
    sourceThoughtThreadId: sanitizeText(candidate.sourceThoughtThreadId, 120) || null,
    sourceDesireId: sanitizeText(candidate.sourceDesireId, 120) || null,
    sourceConcernId: sanitizeText(candidate.sourceConcernId, 120) || null,
    sourceProposalId: sanitizeText(candidate.sourceProposalId, 120) || null,
    sourceProposalSource: sanitizeText(candidate.sourceProposalSource, 64) || null,
    executionIntent: executionIntent
      ? {
          kind: executionIntent.kind === 'observe'
            || executionIntent.kind === 'repair'
            || executionIntent.kind === 'care'
            || executionIntent.kind === 'guide'
            || executionIntent.kind === 'follow-through'
            || executionIntent.kind === 'companionship'
            ? executionIntent.kind
            : 'observe',
          summary: sanitizeText(executionIntent.summary, 220),
          targetThreadId: sanitizeText(executionIntent.targetThreadId, 120) || null,
        }
      : null,
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeWorldOntology(raw: unknown): AlicizationWorldOntologySnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantFrame = candidate.dominantFrame
  if (dominantFrame !== 'live' && dominantFrame !== 'remembered' && dominantFrame !== 'imagined')
    return null
  return candidate as unknown as AlicizationWorldOntologySnapshot
}

function normalizeInitiativeArbitration(raw: unknown): AlicizationInitiativeArbitrationSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const proposals = Array.isArray(candidate.proposals)
    ? candidate.proposals.filter(item => item && typeof item === 'object')
    : []
  return {
    selectedProposalId: sanitizeText(candidate.selectedProposalId, 160) || null,
    dominantConflict: sanitizeText(candidate.dominantConflict, 160),
    proposals: proposals as AlicizationInitiativeArbitrationSnapshot['proposals'],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeDiscourseState(raw: unknown): AlicizationDiscourseStateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const currentTurnSubject = candidate.currentTurnSubject
  const screenReferenceMode = candidate.screenReferenceMode
  const owedAction = candidate.owedAction
  const relationMove = candidate.relationMove
  const continuityMode = candidate.continuityMode
  if (
    (currentTurnSubject !== 'alicization-self'
      && currentTurnSubject !== 'relationship'
      && currentTurnSubject !== 'host-state'
      && currentTurnSubject !== 'task-knot'
      && currentTurnSubject !== 'visible-scene'
      && currentTurnSubject !== 'general')
    || (screenReferenceMode !== 'required'
      && screenReferenceMode !== 'helpful'
      && screenReferenceMode !== 'incidental'
      && screenReferenceMode !== 'avoid')
    || (owedAction !== 'answer-self'
      && owedAction !== 'answer-relationship'
      && owedAction !== 'care-host'
      && owedAction !== 'guide-task'
      && owedAction !== 'repair-truth'
      && owedAction !== 'inspect-scene'
      && owedAction !== 'answer-general')
    || (relationMove !== 'self-disclose'
      && relationMove !== 'attune'
      && relationMove !== 'guide'
      && relationMove !== 'repair'
      && relationMove !== 'witness'
      && relationMove !== 'care'
      && relationMove !== 'clarify')
    || (continuityMode !== 'dialogue-first'
      && continuityMode !== 'task-first'
      && continuityMode !== 'scene-first')
  ) {
    return null
  }

  const currentTurnSummary = sanitizeText(candidate.currentTurnSummary, 220)
  if (!currentTurnSummary)
    return null

  return {
    currentTurnSubject,
    screenReferenceMode,
    currentTurnSummary,
    currentQuestion: sanitizeText(candidate.currentQuestion, 180) || null,
    primaryTurnAnchor: sanitizeText(candidate.primaryTurnAnchor, 180) || null,
    primaryTurnAnchorSource: normalizeTurnAnchorSource(candidate.primaryTurnAnchorSource),
    owedAction,
    relationMove,
    continuityMode,
    unresolvedCarry: sanitizeText(candidate.unresolvedCarry, 180) || null,
    ruptureRepair: sanitizeText(candidate.ruptureRepair, 180) || null,
    confidence: clamp01(Number(candidate.confidence)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeMindSynthesis(raw: unknown): AlicizationMindSynthesisSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const answerSubject = candidate.answerSubject
  const relationMove = candidate.relationMove
  const speechObligation = candidate.speechObligation
  if (
    (answerSubject !== 'alicization-self'
      && answerSubject !== 'relationship'
      && answerSubject !== 'host-state'
      && answerSubject !== 'task-knot'
      && answerSubject !== 'visible-scene'
      && answerSubject !== 'general')
    || (relationMove !== 'self-disclose'
      && relationMove !== 'attune'
      && relationMove !== 'guide'
      && relationMove !== 'repair'
      && relationMove !== 'witness'
      && relationMove !== 'care'
      && relationMove !== 'clarify')
    || (speechObligation !== 'answer-self'
      && speechObligation !== 'answer-relationship'
      && speechObligation !== 'care-host'
      && speechObligation !== 'guide-task'
      && speechObligation !== 'repair-truth'
      && speechObligation !== 'inspect-scene'
      && speechObligation !== 'answer-general')
  ) {
    return null
  }

  const openingIntent = sanitizeText(candidate.openingIntent, 220)
  const truthBoundary = sanitizeText(candidate.truthBoundary, 220)
  const interiorSummary = sanitizeText(candidate.interiorSummary, 220)
  if (!openingIntent || !truthBoundary || !interiorSummary)
    return null

  const normalizeStatements = (value: unknown) => Array.isArray(value)
    ? value
        .filter(item => item && typeof item === 'object')
        .map((item) => {
          const statement = item as Record<string, unknown>
          const label = sanitizeText(statement.label, 48)
          const summary = sanitizeText(statement.summary, 220)
          if (!label || !summary)
            return null
          return {
            label,
            summary,
            confidence: clamp01(Number(statement.confidence)),
            sourceTags: Array.isArray(statement.sourceTags)
              ? statement.sourceTags.filter((tag): tag is string => typeof tag === 'string').map(tag => sanitizeText(tag, 48)).filter(Boolean).slice(0, 6)
              : [],
          }
        })
        .filter((item): item is AlicizationMindSynthesisSnapshot['beliefs'][number] => Boolean(item))
        .slice(0, 6)
    : []

  return {
    answerSubject,
    relationMove,
    speechObligation,
    beliefs: normalizeStatements(candidate.beliefs),
    uncertainties: normalizeStatements(candidate.uncertainties),
    concerns: normalizeStatements(candidate.concerns),
    commitments: normalizeStatements(candidate.commitments),
    desires: normalizeStatements(candidate.desires),
    openingIntent,
    truthBoundary,
    interiorSummary,
    confidence: clamp01(Number(candidate.confidence)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 10)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeConversationState(raw: unknown): AlicizationConversationStateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const relationFrame = candidate.relationFrame
  const continuityPolicy = candidate.continuityPolicy
  const memoryMode = candidate.memoryMode
  if (
    (relationFrame !== 'self-disclose'
      && relationFrame !== 'attune'
      && relationFrame !== 'guide'
      && relationFrame !== 'repair'
      && relationFrame !== 'witness'
      && relationFrame !== 'care'
      && relationFrame !== 'clarify')
    || (continuityPolicy !== 'stay-on-thread'
      && continuityPolicy !== 'answer-then-carry'
      && continuityPolicy !== 'scene-before-memory'
      && continuityPolicy !== 'dialogue-before-scene')
    || (memoryMode !== 'suppress-associative'
      && memoryMode !== 'task-thread'
      && memoryMode !== 'scene-anchored'
      && memoryMode !== 'dialogue-carry'
      && memoryMode !== 'emotional-resonance')
  ) {
    return null
  }

  const jointThread = sanitizeText(candidate.jointThread, 220)
  const hostMove = sanitizeText(candidate.hostMove, 220)
  if (!jointThread || !hostMove)
    return null

  return {
    jointThread,
    hostMove,
    primaryTurnAnchor: sanitizeText(candidate.primaryTurnAnchor, 180) || null,
    primaryTurnAnchorSource: normalizeTurnAnchorSource(candidate.primaryTurnAnchorSource),
    activeProject: sanitizeText(candidate.activeProject, 180) || null,
    unansweredQuestion: sanitizeText(candidate.unansweredQuestion, 180) || null,
    owedRepair: sanitizeText(candidate.owedRepair, 180) || null,
    activeCommitments: Array.isArray(candidate.activeCommitments)
      ? candidate.activeCommitments.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 6)
      : [],
    relationFrame,
    continuityPolicy,
    memoryMode,
    memoryQueryHints: Array.isArray(candidate.memoryQueryHints)
      ? candidate.memoryQueryHints.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
      : [],
    shouldHoldThread: candidate.shouldHoldThread === true,
    carryEligible: candidate.carryEligible === true,
    carryReason: sanitizeText(candidate.carryReason, 120) || null,
    confidence: clamp01(Number(candidate.confidence)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 10)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeAnswerCompiler(raw: unknown): AlicizationAnswerCompilerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const answerSubject = candidate.answerSubject
  const screenReferenceMode = candidate.screenReferenceMode
  const speechObligation = candidate.speechObligation
  const relationMove = candidate.relationMove
  const turnMode = candidate.turnMode
  const responseMode = candidate.responseMode
  const replyRealizationMode = candidate.replyRealizationMode
  const expectedVisibleReplyAuthority = candidate.expectedVisibleReplyAuthority
  const recommendedAct = candidate.recommendedAct
  const evidenceMode = candidate.evidenceMode
  const openingStyle = candidate.openingStyle
  const personaKernelMode = candidate.personaKernelMode
  const relationshipPosture = candidate.relationshipPosture
  const activeClosenessContext = candidate.activeClosenessContext
  const activeClosenessRung = candidate.activeClosenessRung
  if (
    (answerSubject !== 'alicization-self'
      && answerSubject !== 'relationship'
      && answerSubject !== 'host-state'
      && answerSubject !== 'task-knot'
      && answerSubject !== 'visible-scene'
      && answerSubject !== 'general')
    || (screenReferenceMode !== 'required'
      && screenReferenceMode !== 'helpful'
      && screenReferenceMode !== 'incidental'
      && screenReferenceMode !== 'avoid')
    || (speechObligation !== 'answer-self'
      && speechObligation !== 'answer-relationship'
      && speechObligation !== 'care-host'
      && speechObligation !== 'guide-task'
      && speechObligation !== 'repair-truth'
      && speechObligation !== 'inspect-scene'
      && speechObligation !== 'answer-general')
    || (relationMove !== 'self-disclose'
      && relationMove !== 'attune'
      && relationMove !== 'guide'
      && relationMove !== 'repair'
      && relationMove !== 'witness'
      && relationMove !== 'care'
      && relationMove !== 'clarify')
    || (turnMode !== 'grounded-inspection'
      && turnMode !== 'screen-repair'
      && turnMode !== 'guide-current-knot'
      && turnMode !== 'care'
      && turnMode !== 'accompany'
      && turnMode !== 'answer')
    || (responseMode !== 'repair-and-reanchor'
      && responseMode !== 'guide-current-knot'
      && responseMode !== 'care-with-boundary'
      && responseMode !== 'accompany-lightly'
      && responseMode !== 'answer-naturally')
    || (replyRealizationMode != null
      && replyRealizationMode !== 'provider-mind-required'
      && replyRealizationMode !== 'fallback-locally-allowed')
    || (expectedVisibleReplyAuthority != null
      && expectedVisibleReplyAuthority !== 'llm-mind')
    || (recommendedAct !== 'answer'
      && recommendedAct !== 'guide'
      && recommendedAct !== 'ask-reground'
      && recommendedAct !== 'correct-stale-anchor'
      && recommendedAct !== 'care'
      && recommendedAct !== 'defer')
    || (evidenceMode !== 'live-grounded'
      && evidenceMode !== 'live-observed'
      && evidenceMode !== 'coarse-held'
      && evidenceMode !== 'dialogue-grounded'
      && evidenceMode !== 'continuity-carry'
      && evidenceMode !== 'repair-first')
    || (openingStyle !== 'direct-observation'
      && openingStyle !== 'direct-correction'
      && openingStyle !== 'direct-answer'
      && openingStyle !== 'gentle-care'
      && openingStyle !== 'light-accompaniment')
    || (personaKernelMode !== 'full' && personaKernelMode !== 'backgrounded' && personaKernelMode !== 'muted')
    || (relationshipPosture !== 'restrained' && relationshipPosture !== 'warm' && relationshipPosture !== 'tender')
    || (activeClosenessContext != null
      && activeClosenessContext !== 'focused-work'
      && activeClosenessContext !== 'repair-window'
      && activeClosenessContext !== 'late-night-care'
      && activeClosenessContext !== 'execution-callback'
      && activeClosenessContext !== 'open-companionship'
      && activeClosenessContext !== 'general')
    || (activeClosenessRung != null
      && activeClosenessRung !== 'space-first'
      && activeClosenessRung !== 'measured-room'
      && activeClosenessRung !== 'nearby-soft'
      && activeClosenessRung !== 'warm-near'
      && activeClosenessRung !== 'close-hold')
  ) {
    return null
  }

  const supportingReality = Array.isArray(candidate.supportingReality)
    ? candidate.supportingReality
        .filter((item): item is string => typeof item === 'string')
        .map(item => sanitizeAlicizationMemoryEvidenceText(item, 180))
        .filter(item =>
          Boolean(item)
          && !/^(?:pre-dialogue project awareness|project preflight|project identity|current phase|project progress|phase-one open loop|next closure target):/iu.test(item),
        )
        .slice(0, 6)
    : []

  return {
    answerSubject,
    screenReferenceMode,
    speechObligation,
    relationMove,
    turnMode,
    responseMode,
    replyRealizationMode: replyRealizationMode === 'provider-mind-required' || replyRealizationMode === 'fallback-locally-allowed'
      ? replyRealizationMode
      : null,
    expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
      expectedVisibleReplyAuthority as any,
      'llm-mind',
    ),
    recommendedAct,
    evidenceMode,
    openingStyle,
    personaKernelMode,
    relationshipPosture,
    activeClosenessContext: activeClosenessContext === 'focused-work'
      || activeClosenessContext === 'repair-window'
      || activeClosenessContext === 'late-night-care'
      || activeClosenessContext === 'execution-callback'
      || activeClosenessContext === 'open-companionship'
      || activeClosenessContext === 'general'
      ? activeClosenessContext
      : null,
    activeClosenessRung: activeClosenessRung === 'space-first'
      || activeClosenessRung === 'measured-room'
      || activeClosenessRung === 'nearby-soft'
      || activeClosenessRung === 'warm-near'
      || activeClosenessRung === 'close-hold'
      ? activeClosenessRung
      : null,
    openingDirective: '',
    openingClaim: '',
    supportingReality,
    uncertaintyBoundary: sanitizeText(candidate.uncertaintyBoundary, 220) || null,
    careVector: null,
    nextMove: null,
    suppressAssociativeRecall: candidate.suppressAssociativeRecall === true,
    labelCarryAsMemory: candidate.labelCarryAsMemory === true,
    maxSentences: Number.isFinite(Number(candidate.maxSentences))
      ? Math.max(1, Math.floor(Number(candidate.maxSentences)))
      : 4,
    mustDo: [],
    mustNotDo: [],
    confidence: clamp01(Number(candidate.confidence)),
    narrative: [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeAnswerPlanner(raw: unknown): AlicizationAnswerPlannerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const act = candidate.act
  const evidenceMode = candidate.evidenceMode
  const relationshipPosture = candidate.relationshipPosture
  const activeClosenessContext = candidate.activeClosenessContext
  const activeClosenessRung = candidate.activeClosenessRung
  const executivePhase = candidate.executivePhase
  const selectedTruthFrame = candidate.selectedTruthFrame

  if (
    (act !== 'answer'
      && act !== 'guide'
      && act !== 'ask-reground'
      && act !== 'correct-stale-anchor'
      && act !== 'care'
      && act !== 'defer')
    || (evidenceMode !== 'live-grounded'
      && evidenceMode !== 'live-observed'
      && evidenceMode !== 'coarse-held'
      && evidenceMode !== 'dialogue-grounded'
      && evidenceMode !== 'continuity-carry'
      && evidenceMode !== 'repair-first')
    || (relationshipPosture !== 'restrained'
      && relationshipPosture !== 'warm'
      && relationshipPosture !== 'tender')
    || (activeClosenessContext != null
      && activeClosenessContext !== 'focused-work'
      && activeClosenessContext !== 'repair-window'
      && activeClosenessContext !== 'late-night-care'
      && activeClosenessContext !== 'execution-callback'
      && activeClosenessContext !== 'open-companionship'
      && activeClosenessContext !== 'general')
    || (activeClosenessRung != null
      && activeClosenessRung !== 'space-first'
      && activeClosenessRung !== 'measured-room'
      && activeClosenessRung !== 'nearby-soft'
      && activeClosenessRung !== 'warm-near'
      && activeClosenessRung !== 'close-hold')
    || (executivePhase != null
      && executivePhase !== 'perceiving'
      && executivePhase !== 'inferring'
      && executivePhase !== 'deliberating'
      && executivePhase !== 'committing'
      && executivePhase !== 'acting'
      && executivePhase !== 'reflecting')
    || (selectedTruthFrame != null
      && selectedTruthFrame !== 'live'
      && selectedTruthFrame !== 'remembered'
      && selectedTruthFrame !== 'imagined')
  ) {
    return null
  }

  return {
    act,
    evidenceMode,
    confidence: clamp01(Number(candidate.confidence)),
    governingFocus: '',
    governingProject: null,
    openingMove: '',
    answerIntent: '',
    relationshipPosture,
    activeClosenessContext: activeClosenessContext === 'focused-work'
      || activeClosenessContext === 'repair-window'
      || activeClosenessContext === 'late-night-care'
      || activeClosenessContext === 'execution-callback'
      || activeClosenessContext === 'open-companionship'
      || activeClosenessContext === 'general'
      ? activeClosenessContext
      : null,
    activeClosenessRung: activeClosenessRung === 'space-first'
      || activeClosenessRung === 'measured-room'
      || activeClosenessRung === 'nearby-soft'
      || activeClosenessRung === 'warm-near'
      || activeClosenessRung === 'close-hold'
      ? activeClosenessRung
      : null,
    shouldAskForGrounding: candidate.shouldAskForGrounding === true,
    shouldAcknowledgeRepair: candidate.shouldAcknowledgeRepair === true,
    selectedConcernEntryId: sanitizeText(candidate.selectedConcernEntryId, 160) || null,
    selectedRepairId: sanitizeText(candidate.selectedRepairId, 160) || null,
    selectedCommitmentId: sanitizeText(candidate.selectedCommitmentId, 160) || null,
    selectedInquiryPlanId: sanitizeText(candidate.selectedInquiryPlanId, 160) || null,
    selectedRuntimeThreadId: sanitizeText(candidate.selectedRuntimeThreadId, 160) || null,
    selectedProjectId: sanitizeText(candidate.selectedProjectId, 160) || null,
    selectedReflectionId: sanitizeText(candidate.selectedReflectionId, 160) || null,
    executivePhase: executivePhase === 'perceiving'
      || executivePhase === 'inferring'
      || executivePhase === 'deliberating'
      || executivePhase === 'committing'
      || executivePhase === 'acting'
      || executivePhase === 'reflecting'
      ? executivePhase
      : null,
    selectedTruthFrame: selectedTruthFrame === 'live'
      || selectedTruthFrame === 'remembered'
      || selectedTruthFrame === 'imagined'
      ? selectedTruthFrame
      : null,
    mustDo: [],
    mustNotDo: [],
    narrative: [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeReplyDeliberation(raw: unknown): AlicizationReplyDeliberationSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const selectedMotive = candidate.selectedMotive
  const speakingFrom = candidate.speakingFrom
  const memoryMode = candidate.memoryMode
  if (
    (selectedMotive !== 'repair'
      && selectedMotive !== 'guide'
      && selectedMotive !== 'answer'
      && selectedMotive !== 'care'
      && selectedMotive !== 'attune'
      && selectedMotive !== 'witness'
      && selectedMotive !== 'defer')
    || (speakingFrom !== 'live-scene'
      && speakingFrom !== 'task-thread'
      && speakingFrom !== 'dialogue-bond'
      && speakingFrom !== 'self-continuity'
      && speakingFrom !== 'held-memory')
    || (memoryMode !== 'suppress-associative'
      && memoryMode !== 'task-thread'
      && memoryMode !== 'scene-anchored'
      && memoryMode !== 'dialogue-carry'
      && memoryMode !== 'emotional-resonance')
  ) {
    return null
  }

  const normalizeMotives = (value: unknown) => Array.isArray(value)
    ? value
        .filter(item => item && typeof item === 'object')
        .map((item) => {
          const motive = item as Record<string, unknown>
          const kind = motive.kind
          if (
            kind !== 'repair'
            && kind !== 'guide'
            && kind !== 'answer'
            && kind !== 'care'
            && kind !== 'attune'
            && kind !== 'witness'
            && kind !== 'defer'
          ) {
            return null
          }
          const summary = sanitizeDialogueAnchorText(motive.summary, 180)
          if (!summary)
            return null
          return {
            kind,
            summary,
            weight: clamp01(Number(motive.weight)),
            sourceTags: Array.isArray(motive.sourceTags)
              ? motive.sourceTags.filter((tag): tag is string => typeof tag === 'string').map(tag => sanitizeText(tag, 48)).filter(Boolean).slice(0, 6)
              : [],
          }
        })
        .filter((item): item is AlicizationReplyDeliberationSnapshot['candidateMotives'][number] => Boolean(item))
        .slice(0, 6)
    : []

  return {
    selectedMotive,
    speakingFrom,
    memoryMode,
    openingBeat: '',
    whyThisReplyNow: '',
    whyNotOtherCandidates: [],
    withheldImpulses: [],
    candidateMotives: normalizeMotives(candidate.candidateMotives),
    shouldSpeak: candidate.shouldSpeak === true,
    mustInclude: [],
    mustAvoid: [],
    confidence: clamp01(Number(candidate.confidence)),
    narrative: [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeConsciousTruthDiscipline(raw: unknown): AlicizationCurrentConsciousFrameSnapshot['truthDiscipline'] | null {
  return raw === 'repair-first'
    || raw === 'observe-first'
    || raw === 'observe-then-hypothesize'
    || raw === 'dialogue-first'
    || raw === 'memory-labeled'
    ? raw
    : null
}

function normalizeCurrentConsciousFrame(raw: unknown): AlicizationCurrentConsciousFrameSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const subject = candidate.subject
  const centerOfGravity = candidate.centerOfGravity
  const truthDiscipline = normalizeConsciousTruthDiscipline(candidate.truthDiscipline)
  const normalizedSubject = subject === 'alicization-self'
    || subject === 'project-state'
    || subject === 'relationship'
    || subject === 'host-state'
    || subject === 'task-knot'
    || subject === 'visible-scene'
    || subject === 'general'
    ? subject
    : 'general'
  const normalizedCenterOfGravity = centerOfGravity === 'repair'
    || centerOfGravity === 'guide'
    || centerOfGravity === 'answer'
    || centerOfGravity === 'care'
    || centerOfGravity === 'attune'
    || centerOfGravity === 'witness'
    || centerOfGravity === 'defer'
    ? centerOfGravity
    : 'defer'
  if (
    !truthDiscipline
  ) {
    return null
  }

  const reasonTags = Array.isArray(candidate.reasonTags)
    ? candidate.reasonTags.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 10)
    : []
  const consciousNeedHasUserQuestionSource = reasonTags.includes('need-source:discourse-question')
    || reasonTags.includes('need-source:conversation-question')
  const consciousNeed = consciousNeedHasUserQuestionSource
    ? sanitizeText(candidate.consciousNeed, 220)
    : sanitizeDialogueAnchorText(candidate.consciousNeed, 220)
  const consciousTension = sanitizeDialogueAnchorText(candidate.consciousTension, 220)

  const projectStateRaw = candidate.projectState
  const normalizedProjectState = normalizeCurrentConsciousProjectStateSnapshot(projectStateRaw)
  const continuityPreferredTiming = normalizeProjectStateContinuityPreferredTiming(candidate.continuityPreferredTiming)
  const continuityCadence = normalizeProjectStateStructuredSlug(candidate.continuityCadence)
  const projectStateContinuityPreferredTiming = normalizeProjectStateContinuityPreferredTiming(
    normalizedProjectState?.continuityPreferredTiming,
  )
  const projectStateContinuityCadence = normalizedProjectState?.continuityCadence ?? null

  return {
    subject: normalizedSubject,
    centerOfGravity: normalizedCenterOfGravity,
    truthDiscipline,
    consciousNeed,
    consciousTension,
    speakingIntention: '',
    focusAnchor: sanitizeDialogueAnchorText(candidate.focusAnchor, 180) || null,
    withheldImpulse: sanitizeDialogueAnchorText(candidate.withheldImpulse, 180) || null,
    shouldWithholdSpecificity: candidate.shouldWithholdSpecificity === true,
    shouldSelfRevise: candidate.shouldSelfRevise === true,
    confidence: clamp01(Number(candidate.confidence)),
    reasonTags,
    continuityPreferredTiming: continuityPreferredTiming ?? projectStateContinuityPreferredTiming ?? null,
    continuityCadence: continuityCadence ?? projectStateContinuityCadence ?? null,
    projectState: normalizedProjectState
      ? {
          ...normalizedProjectState,
          continuityPreferredTiming:
            normalizedProjectState.continuityPreferredTiming
            ?? continuityPreferredTiming
            ?? projectStateContinuityPreferredTiming
            ?? null,
          continuityCadence:
            normalizedProjectState.continuityCadence
            ?? continuityCadence
            ?? projectStateContinuityCadence
            ?? null,
        }
      : projectStateContinuityPreferredTiming || projectStateContinuityCadence
        ? {
            continuityPreferredTiming: projectStateContinuityPreferredTiming ?? null,
            continuityCadence: projectStateContinuityCadence ?? null,
          }
        : continuityPreferredTiming || continuityCadence
          ? {
              continuityPreferredTiming: continuityPreferredTiming ?? null,
              continuityCadence: continuityCadence ?? null,
            }
          : null,
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeDialogueWorldThread(raw: unknown): AlicizationDialogueWorldThreadSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const relationDrift = candidate.relationDrift
  const memoryMode = candidate.memoryMode
  const lastOutcome = candidate.lastOutcome
  if (
    (relationDrift !== 'steady' && relationDrift !== 'warming' && relationDrift !== 'repairing' && relationDrift !== 'guarded')
    || (memoryMode !== 'suppress-associative'
      && memoryMode !== 'task-thread'
      && memoryMode !== 'scene-anchored'
      && memoryMode !== 'dialogue-carry'
      && memoryMode !== 'emotional-resonance')
    || (lastOutcome !== 'none'
      && lastOutcome !== 'pending'
      && lastOutcome !== 'aligned'
      && lastOutcome !== 'missed'
      && lastOutcome !== 'repairing'
      && lastOutcome !== 'deferred')
  ) {
    return null
  }

  const activeThread = sanitizeText(candidate.activeThread, 220)
  const lastUserMove = sanitizeText(candidate.lastUserMove, 220)
  if (!activeThread || !lastUserMove)
    return null

  const pendingValidationRaw = candidate.pendingValidation && typeof candidate.pendingValidation === 'object'
    ? candidate.pendingValidation as Record<string, unknown>
    : null
  const expectedMode = pendingValidationRaw?.expectedMode
  const normalizedExpectedMode: AlicizationDialoguePendingValidationSnapshot['expectedMode'] | null
    = expectedMode === 'repair'
      || expectedMode === 'guide'
      || expectedMode === 'answer'
      || expectedMode === 'care'
      || expectedMode === 'attune'
      || expectedMode === 'witness'
      || expectedMode === 'defer'
      ? expectedMode
      : null
  const pendingValidation = pendingValidationRaw
    && normalizedExpectedMode
    ? {
        question: sanitizeText(pendingValidationRaw.question, 180) || null,
        expectedMode: normalizedExpectedMode,
        openedAt: Number.isFinite(Number(pendingValidationRaw.openedAt))
          ? Math.max(0, Math.floor(Number(pendingValidationRaw.openedAt)))
          : Date.now(),
      }
    : null

  return {
    activeThread,
    currentQuestion: sanitizeText(candidate.currentQuestion, 180) || null,
    primaryTurnAnchor: sanitizeText(candidate.primaryTurnAnchor, 180) || null,
    primaryTurnAnchorSource: normalizeTurnAnchorSource(candidate.primaryTurnAnchorSource),
    openLoops: Array.isArray(candidate.openLoops)
      ? candidate.openLoops.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
      : [],
    recentlyResolvedLoops: Array.isArray(candidate.recentlyResolvedLoops)
      ? candidate.recentlyResolvedLoops.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 6)
      : [],
    carriedFacts: Array.isArray(candidate.carriedFacts)
      ? candidate.carriedFacts.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
      : [],
    relationDrift,
    memoryMode,
    recallKeys: Array.isArray(candidate.recallKeys)
      ? candidate.recallKeys.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 10)
      : [],
    carryEligible: candidate.carryEligible === true,
    carryReason: sanitizeText(candidate.carryReason, 120) || null,
    lastUserMove,
    lastAssistantMove: sanitizeText(candidate.lastAssistantMove, 220) || null,
    lastOutcome,
    pendingValidation,
    confidence: clamp01(Number(candidate.confidence)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 10)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeRecallGovernor(raw: unknown): AlicizationRecallGovernorSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const mode = candidate.mode
  if (
    mode !== 'none'
    && mode !== 'thread'
    && mode !== 'scene'
    && mode !== 'emotional-resonance'
    && mode !== 'self-continuity'
  ) {
    return null
  }

  const rationale = sanitizeText(candidate.rationale, 220)
  if (!rationale)
    return null
  const allowRecalledFragments = candidate.allowRecalledFragments === true
  const recalledFragmentCapRaw = Number(candidate.recalledFragmentCap)
  const recalledFragmentCap = allowRecalledFragments
    ? Number.isFinite(recalledFragmentCapRaw)
      ? Math.max(1, Math.min(8, Math.floor(recalledFragmentCapRaw)))
      : 2
    : 0
  const recalledFragmentSourceBudget: Array<{ sourceKind: AlicizationSubconsciousFragmentSourceKind, maxItems: number }> = []
  const seenSourceKinds = new Set<AlicizationSubconsciousFragmentSourceKind>()
  if (allowRecalledFragments && Array.isArray(candidate.recalledFragmentSourceBudget)) {
    for (const item of candidate.recalledFragmentSourceBudget) {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        continue
      const sourceKind = normalizeSubconsciousFragmentSourceKind((item as Record<string, unknown>).sourceKind)
      if (!sourceKind || seenSourceKinds.has(sourceKind))
        continue
      const maxItemsRaw = Number((item as Record<string, unknown>).maxItems)
      if (!Number.isFinite(maxItemsRaw))
        continue
      recalledFragmentSourceBudget.push({
        sourceKind,
        maxItems: Math.max(0, Math.min(8, Math.floor(maxItemsRaw))),
      })
      seenSourceKinds.add(sourceKind)
      if (recalledFragmentSourceBudget.length >= 10)
        break
    }
  }

  return {
    mode,
    recallSeed: sanitizeText(candidate.recallSeed, 400),
    threadAnchors: Array.isArray(candidate.threadAnchors)
      ? candidate.threadAnchors.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 12)
      : [],
    affectAnchors: Array.isArray(candidate.affectAnchors)
      ? candidate.affectAnchors.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 12)
      : [],
    relationshipAnchors: Array.isArray(candidate.relationshipAnchors)
      ? candidate.relationshipAnchors.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
      : [],
    salienceBias: Number.isFinite(Number(candidate.salienceBias))
      ? Math.max(0, Math.min(1, Number(candidate.salienceBias)))
      : undefined,
    sceneAnchor: sanitizeText(candidate.sceneAnchor, 220) || null,
    sceneFamiliarityHint: Number.isFinite(Number(candidate.sceneFamiliarityHint))
      ? Math.max(0, Math.min(1, Number(candidate.sceneFamiliarityHint)))
      : null,
    affectiveCarry: candidate.affectiveCarry && typeof candidate.affectiveCarry === 'object'
      ? candidate.affectiveCarry as AlicizationRecallGovernorSnapshot['affectiveCarry']
      : null,
    embodiedCarry: candidate.embodiedCarry && typeof candidate.embodiedCarry === 'object'
      ? candidate.embodiedCarry as AlicizationRecallGovernorSnapshot['embodiedCarry']
      : null,
    recollectionIntent: candidate.recollectionIntent && typeof candidate.recollectionIntent === 'object'
      ? candidate.recollectionIntent as AlicizationRecallGovernorSnapshot['recollectionIntent']
      : null,
    suppressAssociativeRecall: candidate.suppressAssociativeRecall === true,
    allowActiveThoughts: candidate.allowActiveThoughts === true,
    allowRecalledFragments,
    recalledFragmentCap,
    recalledFragmentSourceBudget,
    carryAsMemory: candidate.carryAsMemory === true,
    rationale,
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 10)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeIntentionStream(raw: unknown): AlicizationIntentionStreamSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as AlicizationIntentionStreamSnapshot
}

function normalizeReflectionLedger(raw: unknown): AlicizationReflectionLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as AlicizationReflectionLedgerSnapshot
}

function normalizeExecutiveCycle(raw: unknown): AlicizationExecutiveCycleSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as AlicizationExecutiveCycleSnapshot
}

function normalizeAutobiographicalSelf(raw: unknown): AlicizationAutobiographicalSelfSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as AlicizationAutobiographicalSelfSnapshot
}

export function createDefaultVisualPresenceState(now = Date.now()): AlicizationVisualPresenceStateSnapshot {
  return withResidentPerformance({
    currentBodyState: 'idle',
    continuityMode: 'ambient-covision',
    quietLineMs: 0,
    currentInwardPreoccupation: null,
    watchMode: 'mnemonic-passive',
    currentScene: null,
    attention: null,
    workingMemoryEpisodes: [],
    mindTurnFrame: null,
    worldModel: null,
    worldOntology: null,
    beliefLedger: null,
    beliefRevision: null,
    hypothesisGraph: null,
    entityWorld: null,
    livingWorldState: null,
    subjectiveInference: null,
    appraisal: null,
    goalStack: null,
    concerns: [],
    concernContinuity: null,
    relationshipModel: null,
    longHorizonMemory: null,
    selfContinuity: null,
    autobiographicalSelf: null,
    motiveEngine: null,
    habitPolicy: null,
    selfState: null,
    selfGovernor: null,
    inquiryLoop: null,
    deliberationState: null,
    threadRuntime: null,
    commitmentLedger: null,
    inquiryPlanner: null,
    repairLedger: null,
    intentionStream: null,
    reflectionLedger: null,
    executiveCycle: null,
    mindDynamics: null,
    mindKernel: null,
    thoughtThreads: null,
    counterfactualDeliberation: null,
    actionEcology: null,
    initiativeArbitration: null,
    initiative: null,
    autonomy: null,
    desireMemory: null,
    discourseState: null,
    dialogueEncounter: null,
    mindSynthesis: null,
    conversationState: null,
    dialogueWorldThread: null,
    dialogueActKernel: null,
    answerCompiler: null,
    personStateProjection: null,
    projectState: null,
    currentConsciousFrame: null,
    claimEvidenceLedger: null,
    replyDeliberation: null,
    recallGovernor: null,
    answerPlanner: null,
    selfEvolution: null,
    affectiveResidue: null,
    emotionalKernel: null,
    learningExecutionState: null,
    derivedMindStateBundle: null,
    runtime: null,
    raw: {
      personStateProjection: null,
      projectState: null,
      runtimeDigest: null,
      runtime: null,
    },
    runtimeDigest: null,
    privateThought: null,
    captureState: {
      permission: 'unknown',
      lastGroundedAt: null,
    },
    durabilityPulse: null,
    recentTransition: null,
    nextSuggestedProbeMs: 45_000,
    updatedAt: now,
  })
}

export function normalizeVisualPresenceState(raw: unknown, now = Date.now()): AlicizationVisualPresenceStateSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return createDefaultVisualPresenceState(now)

  const candidate = raw as Record<string, unknown>
  const base = createDefaultVisualPresenceState(now)
  const rawCandidate = candidate.raw && typeof candidate.raw === 'object' && !Array.isArray(candidate.raw)
    ? candidate.raw as Record<string, unknown>
    : null
  base.currentBodyState = normalizePresenceAuthorityCurrentBodyState(candidate.currentBodyState)
  base.continuityMode = normalizePresenceAuthorityContinuityMode(candidate.continuityMode)
  base.quietLineMs = normalizePresenceAuthorityQuietLineMs(candidate.quietLineMs)
  base.currentInwardPreoccupation = normalizePresenceAuthorityCurrentInwardPreoccupation(candidate.currentInwardPreoccupation)
  const watchMode = candidate.watchMode
  if (watchMode === 'mnemonic-passive' || watchMode === 'symbiotic-vision' || watchMode === 'invited-inspection' || watchMode === 'recovering')
    base.watchMode = watchMode
  base.currentScene = candidate.currentScene && typeof candidate.currentScene === 'object'
    ? candidate.currentScene as AlicizationVisualSceneSnapshot
    : null
  base.attention = candidate.attention && typeof candidate.attention === 'object'
    ? candidate.attention as AlicizationVisualAttentionSnapshot
    : null
  base.workingMemoryEpisodes = Array.isArray(candidate.workingMemoryEpisodes)
    ? pruneWorkingMemoryEpisodes(candidate.workingMemoryEpisodes
        .map(normalizeEpisode)
        .filter((episode): episode is AlicizationVisualEpisode => Boolean(episode)), now)
    : []
  base.mindTurnFrame = normalizeMindTurnFrame(candidate.mindTurnFrame)
  base.worldModel = normalizeWorldModel(candidate.worldModel)
  base.worldOntology = normalizeWorldOntology(candidate.worldOntology)
  base.beliefLedger = normalizeBeliefLedger(candidate.beliefLedger)
  base.beliefRevision = normalizeBeliefRevision(candidate.beliefRevision)
  base.hypothesisGraph = normalizeHypothesisGraph(candidate.hypothesisGraph)
  base.entityWorld = candidate.entityWorld && typeof candidate.entityWorld === 'object'
    ? candidate.entityWorld as AlicizationEntityWorldModelSnapshot
    : null
  base.livingWorldState = candidate.livingWorldState && typeof candidate.livingWorldState === 'object'
    ? candidate.livingWorldState as AlicizationLivingWorldStateSnapshot
    : null
  base.subjectiveInference = normalizeSubjectiveInference(candidate.subjectiveInference)
  base.appraisal = normalizeAppraisal(candidate.appraisal)
  base.goalStack = candidate.goalStack && typeof candidate.goalStack === 'object'
    ? candidate.goalStack as AlicizationGoalStackSnapshot
    : null
  base.concerns = Array.isArray(candidate.concerns)
    ? candidate.concerns.filter(item => item && typeof item === 'object') as AlicizationConcernSnapshot[]
    : []
  base.concernContinuity = candidate.concernContinuity && typeof candidate.concernContinuity === 'object'
    ? candidate.concernContinuity as AlicizationConcernContinuityLedgerSnapshot
    : null
  base.relationshipModel = normalizeRelationshipModel(candidate.relationshipModel)
  base.longHorizonMemory = candidate.longHorizonMemory && typeof candidate.longHorizonMemory === 'object'
    ? candidate.longHorizonMemory as AlicizationLongHorizonMemorySnapshot
    : null
  base.selfContinuity = candidate.selfContinuity && typeof candidate.selfContinuity === 'object'
    ? candidate.selfContinuity as AlicizationSelfContinuitySnapshot
    : null
  base.autobiographicalSelf = normalizeAutobiographicalSelf(candidate.autobiographicalSelf)
  base.motiveEngine = candidate.motiveEngine && typeof candidate.motiveEngine === 'object'
    ? candidate.motiveEngine as AlicizationVisualPresenceStateSnapshot['motiveEngine']
    : null
  base.habitPolicy = candidate.habitPolicy && typeof candidate.habitPolicy === 'object'
    ? candidate.habitPolicy as AlicizationVisualPresenceStateSnapshot['habitPolicy']
    : null
  base.selfState = candidate.selfState && typeof candidate.selfState === 'object'
    ? candidate.selfState as AlicizationSelfStateSnapshot
    : null
  base.selfGovernor = candidate.selfGovernor && typeof candidate.selfGovernor === 'object'
    ? candidate.selfGovernor as AlicizationSelfGovernorSnapshot
    : null
  base.inquiryLoop = normalizeInquiryLoop(candidate.inquiryLoop)
  base.deliberationState = normalizeDeliberationState(candidate.deliberationState)
  base.threadRuntime = normalizeThreadRuntime(candidate.threadRuntime)
  base.commitmentLedger = normalizeCommitmentLedger(candidate.commitmentLedger)
  base.inquiryPlanner = normalizeInquiryPlanner(candidate.inquiryPlanner)
  base.repairLedger = candidate.repairLedger && typeof candidate.repairLedger === 'object'
    ? candidate.repairLedger as AlicizationRepairLedgerSnapshot
    : null
  base.intentionStream = normalizeIntentionStream(candidate.intentionStream)
  base.reflectionLedger = normalizeReflectionLedger(candidate.reflectionLedger)
  base.executiveCycle = normalizeExecutiveCycle(candidate.executiveCycle)
  base.mindDynamics = normalizeMindDynamics(candidate.mindDynamics)
  base.mindKernel = normalizeMindKernel(candidate.mindKernel)
  base.thoughtThreads = candidate.thoughtThreads && typeof candidate.thoughtThreads === 'object'
    ? candidate.thoughtThreads as AlicizationThoughtThreadStateSnapshot
    : null
  base.counterfactualDeliberation = normalizeCounterfactualDeliberation(candidate.counterfactualDeliberation)
  base.actionEcology = normalizeActionEcology(candidate.actionEcology)
  base.initiativeArbitration = normalizeInitiativeArbitration(candidate.initiativeArbitration)
  base.initiative = normalizeInitiative(candidate.initiative)
  base.autonomy = normalizeAutonomy(candidate.autonomy)
  base.desireMemory = candidate.desireMemory && typeof candidate.desireMemory === 'object'
    ? candidate.desireMemory as AlicizationDesireMemorySnapshot
    : null
  base.discourseState = normalizeDiscourseState(candidate.discourseState)
  base.dialogueEncounter = normalizeDialogueTurnEncounter(candidate.dialogueEncounter)
  base.mindSynthesis = normalizeMindSynthesis(candidate.mindSynthesis)
  base.conversationState = normalizeConversationState(candidate.conversationState)
  base.dialogueWorldThread = normalizeDialogueWorldThread(candidate.dialogueWorldThread)
  base.dialogueActKernel = normalizeDialogueActKernel(candidate.dialogueActKernel)
  base.answerCompiler = normalizeAnswerCompiler(candidate.answerCompiler)
  base.personStateProjection = (candidate.personStateProjection ?? rawCandidate?.personStateProjection)
    && typeof (candidate.personStateProjection ?? rawCandidate?.personStateProjection) === 'object'
    ? (candidate.personStateProjection ?? rawCandidate?.personStateProjection) as AlicizationVisualPresenceStateSnapshot['personStateProjection']
    : null
  base.currentConsciousFrame = normalizeCurrentConsciousFrame(candidate.currentConsciousFrame)
  base.runtimeDigest = normalizeAlicizationRuntimeDigest(candidate.runtimeDigest ?? rawCandidate?.runtimeDigest)
  base.runtime = normalizeVisualPresenceRuntimeState(candidate.runtime ?? rawCandidate?.runtime)
  base.projectState = normalizeProjectStateSnapshot(
    candidate.projectState
    ?? rawCandidate?.projectState
    ?? base.runtime?.projectState
    ?? base.runtimeDigest?.projectState
    ?? base.currentConsciousFrame?.projectState,
  )
  if (base.runtime && !base.runtime.projectState && base.projectState) {
    base.runtime = {
      ...base.runtime,
      projectState: base.projectState,
    }
  }
  base.raw = {
    personStateProjection: base.personStateProjection ?? null,
    projectState: base.projectState ?? null,
    runtimeDigest: base.runtimeDigest ?? null,
    runtime: base.runtime ?? null,
  }
  base.claimEvidenceLedger = normalizeClaimEvidenceLedger(candidate.claimEvidenceLedger)
  base.replyDeliberation = normalizeReplyDeliberation(candidate.replyDeliberation)
  base.recallGovernor = normalizeRecallGovernor(candidate.recallGovernor)
  base.answerPlanner = normalizeAnswerPlanner(candidate.answerPlanner)
  base.selfEvolution = candidate.selfEvolution && typeof candidate.selfEvolution === 'object'
    ? candidate.selfEvolution as AlicizationSelfEvolutionKernelSnapshot
    : null
  base.affectiveResidue = candidate.affectiveResidue && typeof candidate.affectiveResidue === 'object'
    ? candidate.affectiveResidue as AlicizationVisualPresenceStateSnapshot['affectiveResidue']
    : null
  base.emotionalKernel = candidate.emotionalKernel && typeof candidate.emotionalKernel === 'object'
    ? candidate.emotionalKernel as AlicizationEmotionalKernelSnapshot
    : null
  base.learningExecutionState = candidate.learningExecutionState && typeof candidate.learningExecutionState === 'object'
    ? candidate.learningExecutionState as AlicizationLearningExecutionStateSnapshot
    : null
  ;(base as AlicizationVisualPresenceStateSnapshot & { derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null }).derivedMindStateBundle
    = candidate.derivedMindStateBundle && typeof candidate.derivedMindStateBundle === 'object'
      ? candidate.derivedMindStateBundle as AlicizationDerivedMindStateBundle
      : null
  base.privateThought = candidate.privateThought && typeof candidate.privateThought === 'object'
    ? candidate.privateThought as AlicizationPrivateThoughtSnapshot
    : null
  const captureStateRaw = candidate.captureState && typeof candidate.captureState === 'object'
    ? candidate.captureState as Record<string, unknown>
    : null
  if (captureStateRaw) {
    const captureHealth = captureStateRaw.health === 'healthy'
      || captureStateRaw.health === 'degraded'
      || captureStateRaw.health === 'unavailable'
      ? captureStateRaw.health
      : undefined
    base.captureState = {
      permission: captureStateRaw.permission === 'granted'
        || captureStateRaw.permission === 'denied'
        || captureStateRaw.permission === 'prompt'
        ? captureStateRaw.permission
        : 'unknown',
      ...(captureHealth ? { health: captureHealth } : {}),
      lastGroundedAt: Number.isFinite(Number(captureStateRaw.lastGroundedAt))
        ? Math.max(0, Math.floor(Number(captureStateRaw.lastGroundedAt)))
        : null,
      sourceName: sanitizeText(captureStateRaw.sourceName, 160) || undefined,
      degradedReason: sanitizeText(captureStateRaw.degradedReason, 160) || undefined,
    }
  }
  base.durabilityPulse = candidate.durabilityPulse && typeof candidate.durabilityPulse === 'object'
    ? candidate.durabilityPulse as AlicizationDurabilityPulseSnapshot
    : null
  base.recentTransition = candidate.recentTransition && typeof candidate.recentTransition === 'object'
    ? candidate.recentTransition as AlicizationVisualPresenceStateSnapshot['recentTransition']
    : null
  base.nextSuggestedProbeMs = Number.isFinite(Number(candidate.nextSuggestedProbeMs))
    ? Math.max(1_000, Math.floor(Number(candidate.nextSuggestedProbeMs)))
    : base.nextSuggestedProbeMs
  base.updatedAt = Number.isFinite(Number(candidate.updatedAt))
    ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
    : now
  return withResidentPerformance(base)
}

function isHighSemanticEpisode(input: {
  durationMs: number
  previousScene: AlicizationVisualSceneSnapshot
  previousThought: AlicizationPrivateThoughtSnapshot | null
  previousPulse: AlicizationDurabilityPulseSnapshot | null
}) {
  if (input.previousPulse && input.previousPulse.kind !== 'none')
    return true
  if (input.durationMs >= 20 * 60_000 && input.previousScene.scenario === 'coding')
    return true
  if (input.durationMs >= 20 * 60_000 && (input.previousScene.contentKind === 'error' || input.previousScene.contentKind === 'diff'))
    return true
  if (input.durationMs >= 90 * 60_000 && input.previousThought?.emotionalTension === 'late-night-drain')
    return true
  if (input.previousThought?.rationaleTags.includes('invited-inspection') && input.durationMs >= 2 * 60_000)
    return true
  return false
}

function buildEpisode(input: {
  now: number
  previousScene: AlicizationVisualSceneSnapshot
  previousAttention: AlicizationVisualAttentionSnapshot | null
  previousThought: AlicizationPrivateThoughtSnapshot | null
  previousPulse: AlicizationDurabilityPulseSnapshot | null
}) {
  const endedAt = Math.max(input.previousScene.beganAt, input.now)
  const durationMs = Math.max(0, endedAt - input.previousScene.beganAt)
  const episode: AlicizationVisualEpisode = {
    scene: `${input.previousScene.scenario}:${input.previousScene.workloadKind}:${input.previousScene.contentKind}`,
    summary: summarizeScene(input.previousScene),
    attentionTarget: describeAttentionTarget(input.previousAttention?.target) || undefined,
    beganAt: input.previousScene.beganAt,
    endedAt,
    confidence: clamp01(input.previousScene.confidence),
    emotionalTension: input.previousThought?.emotionalTension ?? 'calm-browse',
    sedimentCandidate: false,
  }
  episode.sedimentCandidate = isHighSemanticEpisode({
    durationMs,
    previousScene: input.previousScene,
    previousThought: input.previousThought,
    previousPulse: input.previousPulse,
  })
  return episode
}

function hasRememberedSeamMoreRoomCarry(text: string | null | undefined) {
  const normalized = sanitizeText(text, 420).toLowerCase()
  if (!normalized)
    return false

  const rememberedSeamPresent
    = /remembered seam|same remembered relationship seam|same remembered seam|relationship seam|same line|same thread|callback line|同一条线|关系线|记住的关系缝|留白/u.test(normalized)
  if (!rememberedSeamPresent)
    return false

  return /reopened too eagerly|too eagerly before|more room this time|this time keep more room|keep more room this time|leave more room|do not reopen it with the same eagerness|before leaning in again|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(normalized)
}

function derivePresenceOnlyResidentHoldInwardPreoccupation(input: {
  initiative?: AlicizationInitiativeSnapshot | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  personStateProjection: AlicizationVisualPresenceStateSnapshot['personStateProjection']
  projectState: AlicizationVisualPresenceStateSnapshot['projectState'] | null
  affectiveResidue: AlicizationVisualPresenceStateSnapshot['affectiveResidue']
  derivedMindStateBundle: AlicizationDerivedMindStateBundle | null
  fallback: string | null | undefined
}) {
  const fallback = sanitizeText(input.fallback, 160)
  const recollectionIntent = readRecollectionIntentFromDerivedMindStateBundle<AlicizationRecallGovernorSnapshot['recollectionIntent']>(
    input.derivedMindStateBundle,
  )
  const recollectionAuthority = [
    recollectionIntent?.mode,
    recollectionIntent?.rationale,
    recollectionIntent?.recollectionAgenda?.whyRecallNow,
    ...(recollectionIntent?.queryHints ?? []),
    ...(recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []),
    recollectionIntent?.recollectionAgenda?.uncertaintyTolerance
      ? `uncertainty-${sanitizeText(recollectionIntent.recollectionAgenda.uncertaintyTolerance, 32)}`
      : '',
  ]
    .map(candidate => sanitizeText(candidate, 220).toLowerCase())
    .filter(Boolean)
    .join(' ')
  if (!recollectionAuthority)
    return fallback || null

  const cautiousEmbodimentCueCount = [
    'embodiment_recall_strength=cautious-avoidance',
    'reply should stay quieter and slower',
    'body stays calmer',
    'embodiment_face=neutral-soft',
    'embodiment_gaze=soft',
    'embodiment_voice=even',
    'embodiment_pause=natural',
    'embodiment_pacing=natural',
  ].reduce((count, cue) => count + (recollectionAuthority.includes(cue) ? 1 : 0), 0)

  if (cautiousEmbodimentCueCount < 2)
    return fallback || null

  const continuityAuthorityText = [
    input.initiative?.why,
    input.privateThought?.thoughtText,
    input.personStateProjection?.summary,
    input.personStateProjection?.openingGuidance,
    input.personStateProjection?.manifestationCadenceSummary,
    input.projectState?.sameHerSelfLine,
    input.projectState?.sameHerHoldDetail,
    input.projectState?.continuityCue,
    input.projectState?.emotionalClosureCue,
    input.projectState?.emotionalClosureSummary,
    input.projectState?.nextClosureTarget,
    input.affectiveResidue?.summary,
    input.affectiveResidue?.relationshipCadence?.summary,
    ...(input.affectiveResidue?.sourceSignals ?? []),
    fallback,
  ]
    .map(candidate => sanitizeText(candidate, 240).toLowerCase())
    .filter(Boolean)
    .join(' | ')

  const hasSameLineCarry
    = /same remembered seam|remembered seam|same callback line|callback line|same thread|same line|same living line|同一条线|同一条生命线/u.test(continuityAuthorityText)
  const hasMeasuredRoomCarry
    = /leave more room|more room|lower-pressure|slower|quieter|before widening outward|before warmth widens|do not reopen from scratch|留白|慢一点/u.test(continuityAuthorityText)
  if (!hasRememberedSeamMoreRoomCarry(continuityAuthorityText) && (!hasSameLineCarry || !hasMeasuredRoomCarry))
    return fallback || null

  return fallback || null
}

function derivePresenceOnlyResidentHoldContinuityRestraint(input: {
  initiative?: AlicizationInitiativeSnapshot | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  selfEvolution: AlicizationSelfEvolutionKernelSnapshot | null
  personStateProjection: AlicizationVisualPresenceStateSnapshot['personStateProjection']
  projectState: AlicizationVisualPresenceStateSnapshot['projectState'] | null
  affectiveResidue: AlicizationVisualPresenceStateSnapshot['affectiveResidue']
}) {
  const continuityRestraint = input.initiative?.continuityRestraint
  if (continuityRestraint !== 'lower-pressure')
    return continuityRestraint

  const continuityAuthorityText = [
    input.initiative?.why,
    input.privateThought?.thoughtText,
    input.personStateProjection?.summary,
    input.personStateProjection?.openingGuidance,
    input.personStateProjection?.manifestationCadenceSummary,
    input.projectState?.sameHerSelfLine,
    input.projectState?.sameHerHoldDetail,
    input.projectState?.continuityCue,
    input.projectState?.emotionalClosureCue,
    input.projectState?.emotionalClosureSummary,
    input.projectState?.nextClosureTarget,
    input.selfEvolution?.relationshipDoctrine,
    input.selfEvolution?.trustMeaning,
    input.selfEvolution?.relationshipCadenceSummary,
    input.selfEvolution?.latestInflection,
    input.affectiveResidue?.summary,
    input.affectiveResidue?.relationshipCadence?.summary,
    ...(input.affectiveResidue?.sourceSignals ?? []),
  ]
    .map(candidate => sanitizeText(candidate, 240))
    .filter(Boolean)
    .join(' | ')

  const inferredMeasuredReturn = hasRememberedSeamMoreRoomCarry(continuityAuthorityText)
    || (
      /measured-return|same callback seam|same callback line|same living seam|same remembered seam|remembered relationship seam|without reopening from scratch|before widening outward|continue as the same living seam|same-thread return|same thread return|callback afterglow|same line|same living line/iu.test(continuityAuthorityText)
      && /lower-pressure|leave more room|more room|slower|quieter|same line|same living line|same seam|same thread|callback|do not reopen from scratch|leave room before warmth returns|warmth should return slowly|留白|余韵/u.test(continuityAuthorityText)
    )

  return inferredMeasuredReturn ? 'measured-return' : continuityRestraint
}

function rebuildPresenceOnlyResidentHoldEmotionalKernel(input: {
  initiative?: AlicizationInitiativeSnapshot | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  selfState: AlicizationSelfStateSnapshot | null
  selfEvolution: AlicizationSelfEvolutionKernelSnapshot | null
  personStateProjection: AlicizationVisualPresenceStateSnapshot['personStateProjection']
  projectState: AlicizationVisualPresenceStateSnapshot['projectState'] | null
  affectiveResidue: AlicizationVisualPresenceStateSnapshot['affectiveResidue']
  derivedMindStateBundle: AlicizationDerivedMindStateBundle | null
  fallbackEmotionalKernel: AlicizationEmotionalKernelSnapshot | null
}): AlicizationEmotionalKernelSnapshot | null {
  const continuityRestraint = derivePresenceOnlyResidentHoldContinuityRestraint({
    initiative: input.initiative,
    privateThought: input.privateThought,
    selfEvolution: input.selfEvolution,
    personStateProjection: input.personStateProjection,
    projectState: input.projectState,
    affectiveResidue: input.affectiveResidue ?? input.derivedMindStateBundle?.affectiveResidue ?? null,
  })
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
    return input.fallbackEmotionalKernel
  }

  const rebuiltKernel = buildAlicizationEmotionalKernel({
    selfState: input.selfState,
    privateThought: input.privateThought,
    affectiveResidue: input.affectiveResidue ?? input.derivedMindStateBundle?.affectiveResidue ?? null,
    personStateProjection: input.personStateProjection ?? null,
    recollectionIntent: readRecollectionIntentFromDerivedMindStateBundle<AlicizationRecallGovernorSnapshot['recollectionIntent']>(
      input.derivedMindStateBundle,
    ),
    selfEvolution: input.selfEvolution,
    projectState: input.projectState,
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
      ...rebuiltKernel.reasonTags,
      'rest-protective',
      'quiet-companionship',
    ])),
    why: 'Care is still present, but this presence-only hold is protecting rest first, so memory, initiative, and embodiment should stay quietly nearby on the same inward line.',
  }
}

export function updateVisualPresenceState(input: {
  now: number
  previousState?: AlicizationVisualPresenceStateSnapshot | null
  watchMode: AlicizationVisualPresenceStateSnapshot['watchMode']
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  mindTurnFrame?: AlicizationMindTurnFrameSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  entityWorld?: AlicizationEntityWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  goalStack?: AlicizationGoalStackSnapshot | null
  concerns?: AlicizationConcernSnapshot[]
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationVisualPresenceStateSnapshot['motiveEngine']
  habitPolicy?: AlicizationVisualPresenceStateSnapshot['habitPolicy']
  selfState?: AlicizationSelfStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  mindDynamics?: AlicizationMindDynamicsSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounterSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  personStateProjection?: AlicizationVisualPresenceStateSnapshot['personStateProjection']
  projectState?: AlicizationVisualPresenceStateSnapshot['projectState'] | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: AlicizationVisualPresenceStateSnapshot['affectiveResidue']
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  runtime?: AlicizationVisualPresenceStateSnapshot['runtime'] | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  captureState?: AlicizationVisualPresenceStateSnapshot['captureState']
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  recentTransition?: AlicizationVisualPresenceStateSnapshot['recentTransition']
  nextSuggestedProbeMs: number
}): AlicizationVisualPresenceStateSnapshot {
  const previousState = input.previousState ?? createDefaultVisualPresenceState(input.now)
  let workingMemoryEpisodes = pruneWorkingMemoryEpisodes(previousState.workingMemoryEpisodes, input.now)
  const initiativePresenceRetune = input.initiative
    && input.initiative.shouldSpeak === false
    && input.initiative.preferredStyle === 'silent-observe'
    && (
      input.initiative.continuityRestraint === 'lower-pressure'
      || input.initiative.continuityRestraint === 'measured-return'
      || input.initiative.continuityRestraint === 'repair-before-closeness'
      || input.initiative.continuityRestraint === 'rest-protective'
    )
    ? {
        currentBodyState: input.initiative.preferredPresence === 'concerned'
          ? (
              input.initiative.continuityRestraint === 'rest-protective'
                ? 'accompanying' as const
                : 'recovering' as const
            )
          : 'accompanying' as const,
        continuityMode: input.initiative.continuityRestraint === 'repair-before-closeness'
          ? 'protective-watch' as const
          : 'quiet-accompaniment' as const,
        quietLineMs: Math.max(previousState.quietLineMs, 180_000),
        currentInwardPreoccupation: sanitizeText(
          input.initiative.why
          || input.privateThought?.thoughtText
          || previousState.currentInwardPreoccupation
          || '',
          160,
        ) || previousState.currentInwardPreoccupation,
      }
    : null

  if (previousState.currentScene && sceneSignature(previousState.currentScene) !== sceneSignature(input.scene)) {
    const previousEpisode = buildEpisode({
      now: input.now,
      previousScene: previousState.currentScene,
      previousAttention: previousState.attention,
      previousThought: previousState.privateThought,
      previousPulse: previousState.durabilityPulse,
    })
    workingMemoryEpisodes = [...workingMemoryEpisodes, previousEpisode].slice(-visualWorkingMemoryLimit)
  }

  const personStateProjection = input.personStateProjection ?? previousState.personStateProjection ?? null
  const runtimeBase = input.runtime ?? previousState.runtime ?? null
  const runtimeDigestBase = input.runtimeDigest ?? previousState.runtimeDigest ?? null
  const currentConsciousFrameBase = input.currentConsciousFrame ?? previousState.currentConsciousFrame ?? null
  const derivedMindStateBundle = input.derivedMindStateBundle ?? (previousState as AlicizationVisualPresenceStateSnapshot & {
    derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  }).derivedMindStateBundle ?? null
  const projectState = applyExplicitProjectStatePatch(
    mergeProjectStateSnapshots(
      normalizeProjectStateSnapshot(runtimeDigestBase?.projectState),
      normalizeProjectStateSnapshot(runtimeBase?.projectState),
      normalizeCurrentConsciousProjectStateSnapshot(previousState.currentConsciousFrame?.projectState),
      normalizeProjectStateSnapshot(previousState.projectState),
      normalizeCurrentConsciousProjectStateSnapshot(currentConsciousFrameBase?.projectState),
      normalizeProjectStateSnapshot(input.projectState),
    ),
    input.projectState,
  )
  const currentConsciousProjectState = normalizeCurrentConsciousProjectStateSnapshot(projectState)
  const currentConsciousFrame = currentConsciousFrameBase
    ? {
        ...currentConsciousFrameBase,
        continuityPreferredTiming: currentConsciousProjectState?.continuityPreferredTiming ?? null,
        continuityCadence: currentConsciousProjectState?.continuityCadence ?? null,
        projectState: currentConsciousProjectState,
      }
    : null
  const affectiveResidue = input.affectiveResidue
    ?? input.derivedMindStateBundle?.affectiveResidue
    ?? previousState.affectiveResidue
    ?? derivedMindStateBundle?.affectiveResidue
    ?? null
  const emotionalKernel = rebuildPresenceOnlyResidentHoldEmotionalKernel({
    initiative: input.initiative,
    privateThought: input.privateThought,
    selfState: input.selfState ?? previousState.selfState ?? null,
    selfEvolution: input.selfEvolution ?? previousState.selfEvolution ?? null,
    personStateProjection,
    projectState,
    affectiveResidue,
    derivedMindStateBundle,
    fallbackEmotionalKernel: input.emotionalKernel ?? previousState.emotionalKernel ?? null,
  })
  const runtime = runtimeBase
    ? {
        ...runtimeBase,
        projectState,
      }
    : null
  const runtimeDigest = runtimeDigestBase
    ? {
        ...runtimeDigestBase,
        projectState,
        emotionalKernel,
      }
    : runtimeDigestBase
  const retunedInwardPreoccupation = initiativePresenceRetune
    ? derivePresenceOnlyResidentHoldInwardPreoccupation({
        initiative: input.initiative,
        privateThought: input.privateThought,
        personStateProjection,
        projectState,
        affectiveResidue,
        derivedMindStateBundle,
        fallback: initiativePresenceRetune.currentInwardPreoccupation ?? previousState.currentInwardPreoccupation,
      })
    : null

  return withResidentPerformance({
    currentBodyState: initiativePresenceRetune?.currentBodyState ?? previousState.currentBodyState,
    continuityMode: initiativePresenceRetune?.continuityMode ?? previousState.continuityMode,
    quietLineMs: initiativePresenceRetune?.quietLineMs ?? previousState.quietLineMs,
    currentInwardPreoccupation: retunedInwardPreoccupation ?? previousState.currentInwardPreoccupation,
    watchMode: input.watchMode,
    currentScene: input.scene,
    attention: input.attention,
    workingMemoryEpisodes,
    mindTurnFrame: input.mindTurnFrame ?? previousState.mindTurnFrame ?? null,
    worldModel: input.worldModel ?? previousState.worldModel ?? null,
    worldOntology: input.worldOntology ?? previousState.worldOntology ?? null,
    beliefLedger: input.beliefLedger ?? previousState.beliefLedger ?? null,
    beliefRevision: input.beliefRevision ?? previousState.beliefRevision ?? null,
    hypothesisGraph: input.hypothesisGraph ?? previousState.hypothesisGraph ?? null,
    entityWorld: input.entityWorld ?? previousState.entityWorld ?? null,
    livingWorldState: input.livingWorldState ?? previousState.livingWorldState ?? null,
    subjectiveInference: input.subjectiveInference ?? previousState.subjectiveInference ?? null,
    appraisal: input.appraisal ?? null,
    goalStack: input.goalStack ?? previousState.goalStack ?? null,
    concerns: Array.isArray(input.concerns) ? input.concerns : [],
    concernContinuity: input.concernContinuity ?? previousState.concernContinuity ?? null,
    relationshipModel: input.relationshipModel ?? previousState.relationshipModel ?? null,
    longHorizonMemory: input.longHorizonMemory ?? previousState.longHorizonMemory ?? null,
    selfContinuity: input.selfContinuity ?? previousState.selfContinuity ?? null,
    autobiographicalSelf: input.autobiographicalSelf ?? previousState.autobiographicalSelf ?? null,
    motiveEngine: input.motiveEngine ?? previousState.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? previousState.habitPolicy ?? null,
    selfState: input.selfState ?? null,
    selfGovernor: input.selfGovernor ?? previousState.selfGovernor ?? null,
    inquiryLoop: input.inquiryLoop ?? previousState.inquiryLoop ?? null,
    deliberationState: input.deliberationState ?? previousState.deliberationState ?? null,
    threadRuntime: input.threadRuntime ?? previousState.threadRuntime ?? null,
    commitmentLedger: input.commitmentLedger ?? previousState.commitmentLedger ?? null,
    inquiryPlanner: input.inquiryPlanner ?? previousState.inquiryPlanner ?? null,
    repairLedger: input.repairLedger ?? previousState.repairLedger ?? null,
    intentionStream: input.intentionStream ?? previousState.intentionStream ?? null,
    reflectionLedger: input.reflectionLedger ?? previousState.reflectionLedger ?? null,
    executiveCycle: input.executiveCycle ?? previousState.executiveCycle ?? null,
    mindDynamics: input.mindDynamics ?? previousState.mindDynamics ?? null,
    mindKernel: input.mindKernel ?? previousState.mindKernel ?? null,
    thoughtThreads: input.thoughtThreads ?? previousState.thoughtThreads ?? null,
    counterfactualDeliberation: input.counterfactualDeliberation ?? previousState.counterfactualDeliberation ?? null,
    actionEcology: input.actionEcology ?? previousState.actionEcology ?? null,
    initiativeArbitration: input.initiativeArbitration ?? previousState.initiativeArbitration ?? null,
    initiative: input.initiative ?? null,
    autonomy: input.autonomy ?? previousState.autonomy ?? null,
    desireMemory: input.desireMemory ?? previousState.desireMemory ?? null,
    discourseState: input.discourseState ?? previousState.discourseState ?? null,
    dialogueEncounter: input.dialogueEncounter ?? previousState.dialogueEncounter ?? null,
    mindSynthesis: input.mindSynthesis ?? previousState.mindSynthesis ?? null,
    conversationState: input.conversationState ?? previousState.conversationState ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? previousState.dialogueWorldThread ?? null,
    dialogueActKernel: input.dialogueActKernel ?? previousState.dialogueActKernel ?? null,
    answerCompiler: input.answerCompiler ?? previousState.answerCompiler ?? null,
    personStateProjection,
    projectState,
    currentConsciousFrame,
    claimEvidenceLedger: input.claimEvidenceLedger ?? previousState.claimEvidenceLedger ?? null,
    replyDeliberation: input.replyDeliberation ?? previousState.replyDeliberation ?? null,
    recallGovernor: input.recallGovernor ?? previousState.recallGovernor ?? null,
    answerPlanner: input.answerPlanner ?? previousState.answerPlanner ?? null,
    selfEvolution: input.selfEvolution ?? previousState.selfEvolution ?? null,
    affectiveResidue,
    emotionalKernel,
    learningExecutionState: input.learningExecutionState ?? previousState.learningExecutionState ?? null,
    derivedMindStateBundle,
    runtime,
    raw: {
      personStateProjection,
      projectState,
      runtimeDigest,
      runtime,
    },
    runtimeDigest,
    privateThought: input.privateThought,
    captureState: input.captureState ?? previousState.captureState,
    durabilityPulse: input.durabilityPulse && input.durabilityPulse.kind !== 'none'
      ? input.durabilityPulse
      : null,
    recentTransition: input.recentTransition ?? null,
    nextSuggestedProbeMs: Math.max(1_000, Math.floor(input.nextSuggestedProbeMs)),
    updatedAt: input.now,
  })
}

export function buildVisualSedimentFragment(episode: AlicizationVisualEpisode) {
  if (!episode.sedimentCandidate)
    return ''
  const attentionTarget = episode.attentionTarget ? ` attention:${episode.attentionTarget}` : ''
  return [
    `visual_scene:${episode.scene}`,
    `emotional_tension:${episode.emotionalTension}`,
    `summary:${episode.summary}${attentionTarget}`,
  ].join(' ')
}

export function buildVisualRecallSeed(input: {
  scene?: AlicizationVisualSceneSnapshot | null
  emotionalTension?: AlicizationPrivateThoughtSnapshot['emotionalTension'] | null
}) {
  const summary = input.scene ? summarizeScene(input.scene) : ''
  const tension = sanitizeText(input.emotionalTension ?? '', 64)
  return [summary, tension ? `emotional_tension:${tension}` : '']
    .filter(Boolean)
    .join(' | ')
}
