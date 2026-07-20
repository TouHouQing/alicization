import {
  alicizationFixedTemplateReplacement,
  buildAlicizationProviderFactBlock,
  formatAlicizationProjectStateAwarenessFields,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from './project-state-focus'

export {
  describeAlicizationEmbodimentClosureReminder,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

export interface AlicizationProjectStateBrief {
  identity: string
  currentPhase: string
  latestProgress: string
  primaryOpenLoop: string
  proactiveSameHerGap: string
  sameHerSelfLine: string
  sameHerDriftRisk: string
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  emotionalClosureCue?: string | null
  emotionalClosureSummary?: string | null
  sameHerHoldDetail?: string | null
  continuityRestraint?: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
  continuityCadence?: string | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode?: 'longer' | 'natural' | null
  preferredLipsyncMode?: 'restrained' | 'matched' | null
  preferredVoiceMode?: 'lower-pressure' | 'even' | null
  preferredPacingMode?: 'slower' | 'natural' | null
  continuityCue?: string | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  closedFoundations: string[]
  continuityProgressSummary?: string
  memoryAnthropomorphismProgress: string[]
  openLoops: string[]
  nextClosureTarget: string
}

export interface AlicizationProjectStateSnapshot {
  identity: string
  currentPhase: string
  preflightSummary: string | null
  preDialogueAwarenessLine: string | null
  preDialogueAwarenessSummary?: string | null
  awarenessLine?: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  latestLandedProgress: string | null
  latestProgress?: string | null
  primaryOpenLoop: string | null
  proactiveSameHerGap: string | null
  nextClosureTarget: string
  sameHerSelfLine: string
  sameHerDriftRisk: string
  emotionalClosureCue?: string | null
  emotionalClosureSummary?: string | null
  sameHerHoldDetail?: string | null
  continuityRestraint?: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
  continuityArcStage?: string | null
  continuityCue?: string | null
  continuityPreferredTiming: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
  continuityCadence: string | null
  preferredBlinkCadence: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode: 'longer' | 'natural' | null
  preferredLipsyncMode: 'restrained' | 'matched' | null
  preferredVoiceMode: 'lower-pressure' | 'even' | null
  preferredPacingMode: 'slower' | 'natural' | null
}

interface AlicizationProjectStateSummaryAliasShape {
  landedProgressSummary?: unknown
  openClosureSummary?: unknown
  proactiveSameHerGapSummary?: unknown
  nextClosureTargetSummary?: unknown
  sameHerDriftRiskSummary?: unknown
}

export interface AlicizationProjectStatusBrief {
  projectIdentity: string
  projectPhase: string
  latestLandedProgress: string
  primaryOpenLoop: string
  proactiveSameHerGap: string
  nextClosureTarget: string
  sameHerSelfLine: string
  sameHerDriftRisk: string
  preflightSummary: string
  preDialogueAwarenessLine: string
  awarenessLine: string
  companionHeadlineLine: string
  companionBriefingLine: string
  closureReadiness: 'grounded' | 'partial'
  missingClosureItems: string[]
}

function looksLikeFullProjectPhaseClosureReanchor(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim()
  const lowered = text.toLowerCase()
  if (!text)
    return false

  const carriesProjectIdentity
    = lowered.includes('alicization is a local-first digital life project')
      || lowered.includes('before answering, remember: alicization is a local-first digital life project')
      || text.includes('Alicization 还是同一个本地优先数字生命项目')
      || text.includes('本地优先数字生命项目')
  const carriesPhase
    = lowered.includes('phase 1')
      || text.includes('第一阶段')
  const carriesClosureReanchor
    = lowered.includes('still-open closure')
      || lowered.includes('unfinished closure')
      || lowered.includes('same-life closure line')
      || lowered.includes('same living line')
      || text.includes('还没闭环')
      || text.includes('尚未闭环')
      || text.includes('未闭环')
      || text.includes('同一个她')
      || text.includes('同一条生命线')
      || text.includes('同一条线')
      || text.includes('接回去')

  return carriesProjectIdentity && carriesPhase && carriesClosureReanchor
}

export function looksLikeThinProjectClosureShell(raw: unknown, kind: 'landed' | 'open' | 'next') {
  if (typeof raw !== 'string')
    return true

  const text = raw.trim().toLowerCase()
  if (!text)
    return true

  if (
    /^(?:open_loop|runtime_loop_validation|embodiment_scale_validation|memory_dialogue_embodiment_closure|project_state_review|continuity_progress)=/u.test(text)
  ) {
    return false
  }

  if (text.length < 40)
    return true

  if (
    text.includes('project continuity')
    && !text.includes('same-her')
    && !text.includes('same living line')
    && !text.includes('same digital life')
    && !text.includes('phase 1')
    && !text.includes('memory')
    && !text.includes('initiative')
    && !text.includes('embodiment')
    && !text.includes('cross-modal')
    && !text.includes('visible-reply')
  ) {
    return true
  }

  if (kind === 'landed')
    return /project continuity exists|closure exists|continuity exists/u.test(text)
  if (kind === 'open')
    return /project continuity still needs closure|still needs closure|needs closure/u.test(text)
  return /carry project continuity forward|project continuity forward|carry continuity forward|generic next target|generic next closure|generic closure shell|generic closure summary|generic callback summary|steadier carry of this project, this phase, and the life loop that remains open/u.test(text)
}

export function resolveAlicizationProjectStatusBrief(input?: {
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    openClosureSummary?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
    nextClosureTarget?: unknown
    nextClosureTargetSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
    emotionalClosureCue?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    openClosureSummary?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
    nextClosureTarget?: unknown
    nextClosureTargetSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
    emotionalClosureCue?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
}): AlicizationProjectStatusBrief {
  const runtimeIdentity = sanitizeProjectStateIdentityText(input?.runtimeProjectState?.identity, 220)
  const runtimePhase = sanitizeProjectStatePhaseText(input?.runtimeProjectState?.currentPhase, 160)
  const runtimeLatestProgress = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.latestLandedProgress
    ?? input?.runtimeProjectState?.latestProgress
    ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
    220,
  )
  const runtimePrimaryOpenLoop = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.primaryOpenLoop
    ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.openClosureSummary,
    220,
  )
  const runtimeProactiveSameHerGap = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.proactiveSameHerGap
    ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    220,
  )
  const runtimeNextClosureTarget = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.nextClosureTarget
    ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.nextClosureTargetSummary,
    220,
  )
  const runtimeSameHerSelfLine = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.sameHerSelfLine, 220)
  const runtimeAwarenessLine = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.preDialogueAwarenessLine ?? input?.runtimeProjectState?.awarenessLine,
    220,
  )

  if (input?.runtimeProjectState
    && !runtimeIdentity
    && !runtimePhase
    && !runtimeLatestProgress
    && !runtimePrimaryOpenLoop
    && !runtimeProactiveSameHerGap
    && !runtimeNextClosureTarget
    && !runtimeSameHerSelfLine
    && !runtimeAwarenessLine) {
    return {
      projectIdentity: '',
      projectPhase: '',
      latestLandedProgress: '',
      primaryOpenLoop: '',
      proactiveSameHerGap: '',
      nextClosureTarget: '',
      sameHerSelfLine: '',
      sameHerDriftRisk: '',
      preflightSummary: '',
      preDialogueAwarenessLine: '',
      awarenessLine: '',
      companionHeadlineLine: '',
      companionBriefingLine: '',
      closureReadiness: 'partial',
      missingClosureItems: [
        'project identity missing',
        'project phase missing',
        'latest landed progress missing',
        'primary open loop missing',
        'proactive continuity gap missing',
        'next closure target missing',
        'continuity anchor missing',
        'awareness line missing',
      ],
    }
  }

  const explicitEmptyRuntimeState = Boolean(input?.runtimeProjectState)
    && [
      input?.runtimeProjectState?.identity,
      input?.runtimeProjectState?.currentPhase,
      input?.runtimeProjectState?.latestLandedProgress,
      input?.runtimeProjectState?.latestProgress,
      input?.runtimeProjectState?.primaryOpenLoop,
      input?.runtimeProjectState?.proactiveSameHerGap,
      input?.runtimeProjectState?.nextClosureTarget,
      input?.runtimeProjectState?.sameHerSelfLine,
      input?.runtimeProjectState?.preDialogueAwarenessLine,
    ].every(value => typeof value !== 'string' || value.trim() === '')

  if (explicitEmptyRuntimeState) {
    return {
      projectIdentity: '',
      projectPhase: '',
      latestLandedProgress: '',
      primaryOpenLoop: '',
      proactiveSameHerGap: '',
      nextClosureTarget: '',
      sameHerSelfLine: '',
      sameHerDriftRisk: '',
      preflightSummary: '',
      preDialogueAwarenessLine: '',
      awarenessLine: '',
      companionHeadlineLine: '',
      companionBriefingLine: '',
      closureReadiness: 'partial',
      missingClosureItems: [
        'project identity missing',
        'project phase missing',
        'latest landed progress missing',
        'primary open loop missing',
        'proactive continuity gap missing',
        'next closure target missing',
        'continuity anchor missing',
        'awareness line missing',
      ],
    }
  }

  const surface = resolveAlicizationSurfaceProjectStateSnapshot({
    runtimeSurface: {
      version: 'digital-life-runtime-surface-v1',
      raw: null,
      perception: {
        watchMode: 'idle',
        currentScene: null,
        attention: null,
        captureState: null,
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 0,
        updatedAt: Date.now(),
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      cognition: {
        mindTurnFrame: null,
        subjectiveInference: null,
        appraisal: null,
        beliefLedger: null,
        beliefRevision: null,
        hypothesisGraph: null,
        mindDynamics: null,
        mindKernel: null,
        privateThought: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        longHorizonMemory: null,
        selfContinuity: null,
        autobiographicalSelf: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
        motiveEngine: null,
        emotionalKernel: null,
        hostPersonModel: null,
        personalityContinuityState: null,
        personStateProjection: null,
        recollectionPlan: null,
        recollectionSpeechPlan: null,
        memoryDeliberation: null,
        memoryTuningAdvice: null,
        knowledgeEvidence: null,
        selfEvolution: null,
        learningExecutionState: null,
        affectiveResidue: null,
        derivedMindStateBundle: null,
        memoryStageReplay: null,
        memoryResolutionLedger: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        deliberationState: null,
        counterfactualDeliberation: null,
        actionEcology: null,
        initiativeArbitration: null,
        initiative: null,
        autonomy: null,
        habitPolicy: null,
      },
    } as any,
  })
  const status = resolveAlicizationProjectStateSnapshot(input)
  const projectIdentity = runtimeIdentity || sanitizeProjectStateIdentityText(input?.fallbackProjectState?.identity, 220) || status.identity
  const currentPhase = runtimePhase || sanitizeProjectStatePhaseText(input?.fallbackProjectState?.currentPhase, 160) || status.currentPhase
  const latestProgress = runtimeLatestProgress
    || sanitizeProjectStateSnapshotText(
      input?.fallbackProjectState?.latestLandedProgress
      ?? input?.fallbackProjectState?.latestProgress
      ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
      220,
    )
    || status.latestLandedProgress
    || status.latestProgress
    || surface.preflightSummary
    || ''
  const primaryOpenLoop = status.primaryOpenLoop ?? ''
  const proactiveSameHerGap = runtimeProactiveSameHerGap
    || sanitizeProjectStateSnapshotText(
      input?.fallbackProjectState?.proactiveSameHerGap
      ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
      220,
    )
    || status.proactiveSameHerGap
    || ''
  const nextClosureTarget = status.nextClosureTarget ?? ''
  const sameHerSelfLine = status.sameHerSelfLine
  const sameHerDriftRisk = status.sameHerDriftRisk
  const preflightSummary = status.preflightSummary ?? ''
  const awarenessLine = status.preDialogueAwarenessLine ?? status.awarenessLine ?? ''
  const companionHeadlineLine = status.companionHeadlineLine ?? status.preDialogueAwarenessLine ?? ''
  const companionBriefingLine = status.companionBriefingLine ?? ''
  const missingClosureItems = [
    !projectIdentity ? 'project identity missing' : '',
    !currentPhase ? 'current phase missing' : '',
    !latestProgress ? 'latest progress missing' : '',
    !primaryOpenLoop ? 'primary open loop missing' : '',
    !proactiveSameHerGap ? 'proactive continuity gap missing' : '',
    !nextClosureTarget ? 'next closure target missing' : '',
    !sameHerSelfLine ? 'continuity anchor missing' : '',
    !awarenessLine ? 'awareness line missing' : '',
  ].filter(Boolean)

  return {
    projectIdentity,
    projectPhase: currentPhase,
    latestLandedProgress: latestProgress,
    primaryOpenLoop,
    proactiveSameHerGap,
    nextClosureTarget,
    sameHerSelfLine,
    sameHerDriftRisk,
    preflightSummary,
    preDialogueAwarenessLine: awarenessLine,
    awarenessLine,
    companionHeadlineLine,
    companionBriefingLine,
    closureReadiness: missingClosureItems.length === 0 ? 'grounded' : 'partial',
    missingClosureItems,
  }
}

function sanitizeProjectStateSnapshotText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
  if (!normalized)
    return ''
  const providerSafe = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (!providerSafe)
    return ''
  return /[\p{L}\p{N}]/u.test(providerSafe) ? providerSafe : ''
}

function sanitizeProjectStateSnapshotTextWithReplacement(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
  if (!normalized)
    return ''
  return sanitizeAlicizationProviderFacingText(normalized, maxChars, alicizationFixedTemplateReplacement)
}

function sanitizeProjectStateCueOutput(raw: unknown, maxChars: number) {
  const normalized = sanitizeProjectStateSnapshotText(raw, maxChars)
  if (!normalized)
    return ''
  if (/(?:^|\b)(?:continuity_anchor|continuity_hold|continuity_drift_risk|continuity_cue|visibility|surface|content)\s*=/iu.test(normalized))
    return ''
  if (/visibility=internal[-_]structured|surface=structured|content_withheld|pending[-_]rejoin|embodiment_scale_validation|project_state_review|runtime_loop_validation/iu.test(normalized))
    return ''
  return normalized
}

function sanitizeProjectStateIdentityText(raw: unknown, maxChars = 220) {
  const normalized = sanitizeProjectStateSnapshotTextWithReplacement(raw, maxChars)
  if (!normalized)
    return ''
  return normalized === alicizationFixedTemplateReplacement
    || /\bidentity=runtime_personhood\b|\bruntime_personhood\b/iu.test(normalized)
    ? ''
    : normalized
}

function sanitizeProjectStatePhaseText(raw: unknown, maxChars = 160) {
  const normalized = sanitizeProjectStateSnapshotTextWithReplacement(raw, maxChars)
  if (!normalized)
    return ''
  if (
    normalized === alicizationFixedTemplateReplacement
    || /\bproject_phase=life_core\b|\blife_core\b/iu.test(normalized)
  ) {
    return ''
  }

  const withoutKey = normalized.replace(/^(?:phase|current_phase)\s*=\s*/iu, '').trim()
  return withoutKey || normalized
}

function sanitizeProviderFacingProjectStateText(raw: unknown, maxChars: number) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars, '')
  return normalized || ''
}

function preferRicherProjectStateCarryText(input: {
  current?: unknown
  candidate?: unknown
  maxChars?: number
}) {
  const current = sanitizeProjectStateSnapshotText(input.current, input.maxChars ?? 240)
  const candidate = sanitizeProjectStateSnapshotText(input.candidate, input.maxChars ?? 240)
  const currentLower = current.toLowerCase()
  const candidateLower = candidate.toLowerCase()

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (currentLower === candidateLower)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  const scoreClosureCarryStrength = (value: string) => {
    const lowered = value.toLowerCase()
    let score = 0
    if (lowered.includes('repair-before-closeness') || lowered.includes('repair before closeness'))
      score += 8
    if (lowered.includes('rest-protective') || lowered.includes('rest protective'))
      score += 8
    if (lowered.includes('quiet-companionship') || lowered.includes('quiet companionship'))
      score += 6
    if (lowered.includes('same-her hold') || lowered.includes('same her hold'))
      score += 4
    if (lowered.includes('measured-return') || lowered.includes('measured return'))
      score += 2
    if (lowered.includes('lower-pressure') || lowered.includes('leave more room'))
      score += 2
    return score
  }

  const currentScore = scoreClosureCarryStrength(current)
  const candidateScore = scoreClosureCarryStrength(candidate)
  if (currentScore !== candidateScore)
    return candidateScore > currentScore ? candidate : current

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function resolveProjectContinuityBehaviorMode(input: {
  continuityRestraint?: unknown
  continuityCadence?: unknown
}) {
  const continuityCadence = sanitizeProjectStateSnapshotText(input.continuityCadence, 120).toLowerCase()
  const continuityRestraint = sanitizeProjectStateSnapshotText(input.continuityRestraint, 64).toLowerCase()

  if (
    continuityCadence === 'repair-before-closeness'
    || continuityCadence === 'measured-return'
    || continuityCadence === 'rest-protective'
  ) {
    return continuityCadence
  }

  if (
    continuityRestraint === 'repair-before-closeness'
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'rest-protective'
  ) {
    return continuityRestraint
  }

  return null
}

function deriveSameHerHoldDetailFromProjectContinuityBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness' || mode === 'rest-protective' || mode === 'measured-return')
    return ''
  return ''
}

function deriveContinuityCueFromProjectContinuityBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'Continuity cue: repair before closeness. Surface timing: after repair settles.'
  if (mode === 'rest-protective')
    return 'Continuity cue: rest protective. Surface timing: after rest stabilizes.'
  if (mode === 'measured-return')
    return 'Continuity cue: measured return. Surface timing: the next natural opening.'
  return ''
}

export function buildAlicizationProjectStatePreflightSummary(input: {
  identity: string
  currentPhase: string
  primaryOpenLoop: string | null | undefined
  nextClosureTarget: string | null | undefined
}) {
  const nextClosureTarget
    = sanitizeProjectStateSnapshotText(input.nextClosureTarget, 96)
  const parts = [
    sanitizeProjectStateIdentityText(input.identity, 96),
    sanitizeProjectStatePhaseText(input.currentPhase, 72),
    input.primaryOpenLoop ? `Open focus: ${sanitizeProjectStateSnapshotText(input.primaryOpenLoop, 88)}.` : '',
    nextClosureTarget ? `Next focus: ${nextClosureTarget}.` : '',
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : null
}

function lowerFirstProjectAwareness(text: string) {
  const normalized = sanitizeProjectStateSnapshotText(text, 320)
  if (!normalized)
    return ''
  return normalized.slice(0, 1).toLowerCase() + normalized.slice(1)
}

function compactProjectIdentityForAwareness(text: string, maxChars = 120) {
  const normalized = sanitizeProjectStateIdentityText(text, 220)
  if (!normalized)
    return ''
  return normalized
    .replace(/\s+rather than a better chat wrapper\.?$/u, '')
    .replace(/\s+on the host computer\.?$/u, '')
    .slice(0, maxChars)
}

function compactProjectPhaseForAwareness(text: string) {
  const normalized = sanitizeProjectStatePhaseText(text, 160)
  if (!normalized)
    return ''
  return normalized
    .split(/\.\s+|[。！？]/u)[0]
    ?.replace(/[.。!！?？;；:：]+$/u, '')
    .trim() ?? normalized
}

function compactProjectOpenLoopForAwareness(text: string, maxChars = 120) {
  const normalized = sanitizeProjectStateSnapshotText(text, 220)
  if (!normalized)
    return ''
  return normalized
    .split(' so ')[0]
    ?.replace(/[.。!！?？;；:：]+$/u, '')
    .trim()
    .slice(0, maxChars) ?? normalized.slice(0, maxChars)
}

function resolveProjectLatestProgressGovernanceTail(text: string) {
  const normalized = sanitizeProjectStateSnapshotText(text, 1200)
  if (!normalized)
    return ''
  if (!/pre-dialogue transport/iu.test(normalized))
    return ''
  if (!/entrypoint governance/iu.test(normalized))
    return ''
  if (!/chat-entry governance/iu.test(normalized))
    return ''
  return 'pre-dialogue transport is explicit entrypoint governance mirrored into chat-entry governance'
}

function resolveProjectLatestProgressLongHorizonEmotionTail(text: string) {
  const normalized = sanitizeProjectStateSnapshotText(text, 18_000)
  if (!normalized)
    return ''
  if (!/long-horizon emotion-memory-voice-motion bridge/iu.test(normalized))
    return ''
  if (!/remembered emotional carry/iu.test(normalized))
    return ''
  return 'long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence'
}

function resolveProjectLatestProgressPreDialogueReason(input: {
  runtimeLatestLandedProgress?: unknown
  runtimeLatestProgress?: unknown
  runtimeLandedProgressSummary?: unknown
  fallbackLatestLandedProgress?: unknown
  fallbackLatestProgress?: unknown
  fallbackLandedProgressSummary?: unknown
}) {
  const runtimeTail = resolveProjectLatestProgressLongHorizonEmotionTail(
    sanitizeProjectStateSnapshotText(
      input.runtimeLatestLandedProgress
      ?? input.runtimeLatestProgress
      ?? input.runtimeLandedProgressSummary,
      18_000,
    ),
  )
  const fallbackTail = resolveProjectLatestProgressLongHorizonEmotionTail(
    sanitizeProjectStateSnapshotText(
      input.fallbackLatestLandedProgress
      ?? input.fallbackLatestProgress
      ?? input.fallbackLandedProgressSummary,
      18_000,
    ),
  )
  const tail = runtimeTail || fallbackTail
  if (tail)
    return `Latest landed progress: ${tail}`

  const compactRuntimeProgress = compactProjectLatestProgressForAwareness(
    sanitizeProjectStateSnapshotText(
      input.runtimeLatestLandedProgress
      ?? input.runtimeLatestProgress
      ?? input.runtimeLandedProgressSummary,
      18_000,
    ),
    144,
  )
  const compactFallbackProgress = compactProjectLatestProgressForAwareness(
    sanitizeProjectStateSnapshotText(
      input.fallbackLatestLandedProgress
      ?? input.fallbackLatestProgress
      ?? input.fallbackLandedProgressSummary,
      18_000,
    ),
    144,
  )
  const compactProgress = compactRuntimeProgress || compactFallbackProgress
  return compactProgress ? `Latest landed progress: ${compactProgress}` : ''
}

function carriesExplicitLatestLandedProgressAwareness(value: unknown) {
  const normalized = sanitizeProjectStateSnapshotText(value, 1_600).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('what has already landed is')
    || normalized.includes('latest landed progress:')
    || normalized.includes('已经落地')
    || normalized.includes('已落地进展')
}

function resolveProjectLatestProgressAutonomyTail(text: string, mode: 'awareness' | 'system') {
  const normalized = sanitizeProjectStateSnapshotText(text, 18_000)
  if (!normalized)
    return ''
  if (!/runtime-owned proactive initiative/iu.test(normalized))
    return ''
  if (!/compact same-her closure loop/iu.test(normalized))
    return ''
  if (!/next-session feedback carry/iu.test(normalized))
    return ''

  const hasRestProtectiveProactiveFeedbackCarry
    = /rest-protective proactive feedback next-session carry|quiet-companionship closure|rest-protective line back to generic measured-return/iu.test(normalized)
  const hasFinalSettlementSameHerShellCarry
    = /final settlement reanchors generic same-her shells/iu.test(normalized)

  if (mode === 'awareness') {
    if (hasRestProtectiveProactiveFeedbackCarry && hasFinalSettlementSameHerShellCarry)
      return 'Proactive continuity is partial; use hover-first and rest-protective restraint, and block template-shell settlement.'

    return hasRestProtectiveProactiveFeedbackCarry
      ? 'Proactive continuity is partial; motive can route to project-state answer with rest-protective restraint.'
      : /next project-state answer carry/iu.test(normalized)
        ? 'Proactive continuity is partial; motive can route to project-state answer.'
        : 'Proactive continuity is partial; motive can route to next-session feedback.'
  }

  if (hasRestProtectiveProactiveFeedbackCarry && hasFinalSettlementSameHerShellCarry)
    return 'Runtime proactive initiative is partial; use hover-first and rest-protective restraint, and block template-shell settlement.'

  if (hasRestProtectiveProactiveFeedbackCarry)
    return 'Runtime proactive initiative is partial; route motive seeds to feedback with hover-first and rest-protective restraint.'

  return /next project-state answer carry/iu.test(normalized)
    ? 'Runtime proactive initiative is partial; route motive seeds to project-state answer with hover-first restraint.'
    : 'Runtime proactive initiative is partial; route motive seeds to next-session feedback with hover-first restraint.'
}

function compactProjectLatestProgressForAwareness(text: string, maxChars = 72) {
  const normalized = sanitizeProjectStateSnapshotText(text, 220)
  if (!normalized)
    return ''
  const autonomyTail = resolveProjectLatestProgressAutonomyTail(text, 'awareness')
  if (autonomyTail) {
    return ''
  }
  const governanceTail = resolveProjectLatestProgressGovernanceTail(text)
  if (governanceTail) {
    const candidates = [
      normalized.includes('Same-session mirror carry')
        ? `Same-session mirror carry already lands; ${governanceTail}`
        : `Latest progress already lands; ${governanceTail}`,
      governanceTail,
    ]
      .map(item => item.replace(/[.。!！?？;；:：]+$/u, '').trim())
    return candidates.find(item => item.length <= maxChars)
      ?? candidates[candidates.length - 1]!.slice(0, maxChars).trim()
  }
  const [beforeAlready, afterAlready] = normalized.split(/\balready\b/iu)
  if (beforeAlready && afterAlready) {
    const lead = beforeAlready
      .split(',')
      .map(segment => segment.trim().replace(/^(and|以及)\s+/iu, ''))
      .filter(Boolean)
      .slice(-3)
      .join(', ')
    const collapsed = `${lead} already ${afterAlready.trim()}`
      .replace(/\s+/g, ' ')
      .replace(/[.。!！?？;；:：]+$/u, '')
    return collapsed.slice(0, maxChars).trim()
  }

  return normalized.replace(/[.。!！?？;；:：]+$/u, '').slice(0, maxChars).trim()
}
export function compactProjectLatestProgressForSystemBlock(text: string, maxChars = 220) {
  const normalized = sanitizeProjectStateSnapshotText(text, 320)
  if (!normalized)
    return ''
  const autonomyTail = resolveProjectLatestProgressAutonomyTail(text, 'system')
  if (autonomyTail) {
    const longHorizonEmotionTail = resolveProjectLatestProgressLongHorizonEmotionTail(text)
    const autonomyWithLongHorizonTail = longHorizonEmotionTail
      ? `${autonomyTail}; ${longHorizonEmotionTail}`
      : autonomyTail
    const candidates = (longHorizonEmotionTail
      ? [
          normalized.includes('rest-protective callback continuation')
            ? `Same-session mirror carry and rest-protective callback continuation already land; ${autonomyWithLongHorizonTail}`
            : autonomyWithLongHorizonTail,
          autonomyWithLongHorizonTail,
          autonomyTail,
        ]
      : [
          autonomyTail,
          normalized.includes('rest-protective callback continuation')
            ? `Same-session mirror carry and rest-protective callback continuation already land; ${autonomyTail}`
            : autonomyTail,
        ])
      .map(item => item.replace(/[.。!！?？;；:：]+$/u, '').trim())
    return candidates.find(item => item.length <= maxChars)
      ?? normalized.replace(/[.。!！?？;；:：]+$/u, '').slice(0, maxChars).trim()
  }
  const governanceTail = resolveProjectLatestProgressGovernanceTail(text)
  if (!governanceTail)
    return normalized.replace(/[.。!！?？;；:：]+$/u, '').slice(0, maxChars).trim()

  const candidates = [
    normalized.includes('rest-protective callback continuation')
      ? `Same-session mirror carry and rest-protective callback continuation already land; ${governanceTail}`
      : `Same-session mirror carry already lands; ${governanceTail}`,
    `Same-session mirror carry already lands; ${governanceTail}`,
    governanceTail,
  ]
    .map(item => item.replace(/[.。!！?？;；:：]+$/u, '').trim())

  return candidates.find(item => item.length <= maxChars)
    ?? normalized.replace(/[.。!！?？;；:：]+$/u, '').slice(0, maxChars).trim()
}

function compactProjectProactiveSameHerGap(text: string, maxChars = 220) {
  const normalized = sanitizeProjectStateSnapshotText(text, 480)
  if (!normalized)
    return ''

  if (
    /visible proactive hold/iu.test(normalized)
    && /subconscious carry/iu.test(normalized)
    && /next-session feedback carry/iu.test(normalized)
    && /hover-first restraint/iu.test(normalized)
    && /noisy desktop runs/iu.test(normalized)
  ) {
    return sanitizeProjectStateSnapshotText(
      'proactive_continuity_loop=partial; long_run_noisy_desktop_proof=needed',
      maxChars,
    )
  }

  return normalized.replace(/[.。!！?？;；:：]+$/u, '').slice(0, maxChars).trim()
}

function compactProjectNextClosureTargetForAwareness(text: string, maxChars = 84) {
  const normalized = sanitizeProjectStateSnapshotText(text, 220)
  if (!normalized)
    return ''
  if (/cross-modal same-her proof/iu.test(normalized))
    return 'embodiment_scale_validation'
  return normalized
    .split(' so ')[0]
    ?.replace(/[.。!！?？;；:：]+$/u, '')
    .trim()
    .slice(0, maxChars) ?? normalized.slice(0, maxChars)
}

function compactSameHerLineForAwareness(text: string, maxChars = 110) {
  const normalized = sanitizeProjectStateSnapshotTextWithReplacement(text, 180)
  if (!normalized)
    return ''
  if (normalized === alicizationFixedTemplateReplacement)
    return ''
  if (/\bphase1_local_digital_life(?:_anchor)?\b/iu.test(normalized))
    return ''
  if (/same phase 1 digital life/iu.test(normalized))
    return ''
  return normalized.slice(0, maxChars)
}

function sanitizeSameHerProjectLine(raw: unknown, fallback: string) {
  const normalized = sanitizeProjectStateSnapshotText(raw, 240)
  if (!normalized)
    return fallback

  const canonicalMatch = normalized.match(/same phase 1 digital life\..*/iu)
  if (canonicalMatch?.[0])
    return ''

  return normalized
}

function looksLikeThinProjectPreflightSummary(raw: unknown) {
  const normalized = sanitizeProjectStateSnapshotText(raw, 720).toLowerCase()
  if (!normalized)
    return true

  const carriesCanonicalProjectIdentity
    = normalized.includes('alicization is a local-first digital life project')
      || normalized.includes('alicization 还是同一个本地优先数字生命项目')
      || normalized.includes('本地优先数字生命项目')
  const carriesCanonicalPhase
    = normalized.includes('phase 1')
      || normalized.includes('第一阶段')
  const carriesExplicitSameHerPhase1ClosureLine
    = carriesCanonicalPhase
      && (
        normalized.includes('same-her')
        || normalized.includes('same her')
        || normalized.includes('one same her')
        || normalized.includes('one continuous her')
        || normalized.includes('同一个她')
        || normalized.includes('同一个 her')
        || normalized.includes('同一条生命线')
        || normalized.includes('同一条线')
      )
      && (
        normalized.includes('digital life project')
        || normalized.includes('digital life')
        || normalized.includes('数字生命项目')
        || normalized.includes('数字生命')
        || normalized.includes('closure line')
        || normalized.includes('闭环')
        || normalized.includes('生命线')
      )
  if (carriesExplicitSameHerPhase1ClosureLine)
    return false

  if (carriesCanonicalProjectIdentity && carriesCanonicalPhase && normalized.includes('open=') && normalized.includes('next='))
    return false

  return normalized.startsWith('same digital life')
    || normalized === 'project'
    || normalized === 'phase 1'
    || !carriesCanonicalProjectIdentity
    || !carriesCanonicalPhase
    || !normalized.includes('open=')
    || !normalized.includes('next=')
}

function resolveProjectAwarePreflightSummaryFallback(input: {
  runtimeProjectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
  } | null
  fallbackProjectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
  } | null
}) {
  return [
    input.runtimeProjectState?.preDialogueAwarenessLine,
    input.runtimeProjectState?.awarenessLine,
    input.runtimeProjectState?.companionBriefingLine,
    input.runtimeProjectState?.preDialogueAwarenessSummary,
    input.fallbackProjectState?.preDialogueAwarenessLine,
    input.fallbackProjectState?.awarenessLine,
    input.fallbackProjectState?.companionBriefingLine,
    input.fallbackProjectState?.preDialogueAwarenessSummary,
  ]
    .map(candidate => sanitizeProjectStateSnapshotText(candidate, 1600) || null)
    .find((candidate): candidate is string => Boolean(
      candidate
      && !looksLikeThinProjectPreflightSummary(candidate)
      && looksLikeFullProjectPhaseClosureReanchor(candidate),
    )) ?? null
}

function resolvePreferredProjectPreflightSummary(input: {
  preflightSummary?: unknown
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
  } | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
}) {
  const explicitSummaryLine = sanitizeProjectStateSnapshotText(input.preflightSummary, 1600) || null
  if (explicitSummaryLine && !looksLikeThinProjectPreflightSummary(explicitSummaryLine))
    return explicitSummaryLine

  const runtimeSummaryLine = sanitizeProjectStateSnapshotText(input.runtimeProjectState?.preflightSummary, 1600) || null
  if (runtimeSummaryLine && !looksLikeThinProjectPreflightSummary(runtimeSummaryLine))
    return runtimeSummaryLine

  const fallbackSummaryLine = sanitizeProjectStateSnapshotText(input.fallbackProjectState?.preflightSummary, 1600) || null
  if (fallbackSummaryLine && !looksLikeThinProjectPreflightSummary(fallbackSummaryLine))
    return fallbackSummaryLine

  const richerProjectAwareOpening = resolveProjectAwarePreflightSummaryFallback({
    runtimeProjectState: input.runtimeProjectState,
    fallbackProjectState: input.fallbackProjectState,
  })
  if (richerProjectAwareOpening)
    return richerProjectAwareOpening

  const synthesizedSummaryLine = buildAlicizationProjectStatePreflightSummary({
    identity: sanitizeProjectStateIdentityText(
      input.runtimeProjectState?.identity,
      220,
    ) || sanitizeProjectStateIdentityText(
      input.fallbackProjectState?.identity,
      220,
    ),
    currentPhase: sanitizeProjectStatePhaseText(
      input.runtimeProjectState?.currentPhase,
      160,
    ) || sanitizeProjectStatePhaseText(
      input.fallbackProjectState?.currentPhase,
      160,
    ),
    primaryOpenLoop: input.primaryOpenLoop ?? null,
    nextClosureTarget: sanitizeProjectStateSnapshotText(input.nextClosureTarget, 320),
  })

  return synthesizedSummaryLine
    || richerProjectAwareOpening
    || explicitSummaryLine
    || runtimeSummaryLine
    || fallbackSummaryLine
    || null
}

export { resolvePreferredProjectPreflightSummary }

export function buildAlicizationProjectPreDialogueAwareness(input: {
  preflightSummary: string | null
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    emotionalClosureCue?: unknown
    sameHerHoldDetail?: unknown
    sameHerSelfLine?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    emotionalClosureCue?: unknown
    sameHerHoldDetail?: unknown
    sameHerSelfLine?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
}) {
  const awarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      identity: input.runtimeProjectState?.identity ?? null,
      currentPhase: input.runtimeProjectState?.currentPhase ?? null,
      latestLandedProgress: input.runtimeProjectState?.latestLandedProgress ?? null,
      latestProgress: input.runtimeProjectState?.latestProgress ?? null,
      landedProgressSummary:
        (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary ?? null,
      primaryOpenLoop: input.primaryOpenLoop,
      nextClosureTarget: input.nextClosureTarget,
      preDialogueAwarenessLine: input.runtimeProjectState?.preDialogueAwarenessLine ?? null,
      awarenessLine: input.runtimeProjectState?.awarenessLine ?? null,
      companionHeadlineLine: input.runtimeProjectState?.companionHeadlineLine ?? null,
      companionBriefingLine: input.runtimeProjectState?.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: input.runtimeProjectState?.preDialogueAwarenessSummary ?? null,
      preflightSummary: input.runtimeProjectState?.preflightSummary ?? null,
      emotionalClosureCue: input.runtimeProjectState?.emotionalClosureCue ?? null,
      sameHerHoldDetail: input.runtimeProjectState?.sameHerHoldDetail ?? null,
      sameHerSelfLine: input.runtimeProjectState?.sameHerSelfLine ?? null,
      proactiveSameHerGap:
        input.runtimeProjectState?.proactiveSameHerGap
        ?? (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary
        ?? null,
      sameHerDriftRiskSummary:
        input.runtimeProjectState?.sameHerDriftRiskSummary
        ?? input.runtimeProjectState?.sameHerDriftRisk
        ?? null,
    },
    fallbackProjectState: {
      identity: input.fallbackProjectState?.identity ?? null,
      currentPhase: input.fallbackProjectState?.currentPhase ?? null,
      latestLandedProgress: input.fallbackProjectState?.latestLandedProgress ?? null,
      latestProgress: input.fallbackProjectState?.latestProgress ?? null,
      landedProgressSummary:
        (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary ?? null,
      primaryOpenLoop: input.primaryOpenLoop,
      nextClosureTarget: input.nextClosureTarget,
      preDialogueAwarenessLine: input.fallbackProjectState?.preDialogueAwarenessLine ?? null,
      awarenessLine: input.fallbackProjectState?.awarenessLine ?? null,
      companionHeadlineLine: input.fallbackProjectState?.companionHeadlineLine ?? null,
      companionBriefingLine: input.fallbackProjectState?.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: input.fallbackProjectState?.preDialogueAwarenessSummary ?? null,
      preflightSummary: input.fallbackProjectState?.preflightSummary ?? null,
      emotionalClosureCue: input.fallbackProjectState?.emotionalClosureCue ?? null,
      sameHerHoldDetail: input.fallbackProjectState?.sameHerHoldDetail ?? null,
      sameHerSelfLine: input.fallbackProjectState?.sameHerSelfLine ?? null,
      proactiveSameHerGap:
        input.fallbackProjectState?.proactiveSameHerGap
        ?? (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary
        ?? null,
      sameHerDriftRiskSummary:
        input.fallbackProjectState?.sameHerDriftRiskSummary
        ?? input.fallbackProjectState?.sameHerDriftRisk
        ?? null,
    },
  })
  const preflightSummary = resolvePreferredProjectPreflightSummary({
    preflightSummary: input.preflightSummary,
    runtimeProjectState: input.runtimeProjectState,
    fallbackProjectState: input.fallbackProjectState,
    primaryOpenLoop: input.primaryOpenLoop,
    nextClosureTarget: input.nextClosureTarget,
  })
  const companionHeadlineLine = sanitizeProjectStateSnapshotText(
    input.runtimeProjectState?.companionHeadlineLine,
    320,
  ) || sanitizeProjectStateSnapshotText(
    input.fallbackProjectState?.companionHeadlineLine,
    320,
  ) || null
  const companionBriefingLine = sanitizeProjectStateSnapshotText(
    input.runtimeProjectState?.companionBriefingLine,
    320,
  ) || sanitizeProjectStateSnapshotText(
    input.fallbackProjectState?.companionBriefingLine,
    320,
  ) || null
  const emotionalClosureCue = sanitizeProjectStateSnapshotText(
    input.runtimeProjectState?.emotionalClosureCue,
    220,
  ) || sanitizeProjectStateSnapshotText(
    input.fallbackProjectState?.emotionalClosureCue,
    220,
  ) || null
  const proactiveSameHerGap = sanitizeProjectStateSnapshotText(
    input.runtimeProjectState?.proactiveSameHerGap
    ?? (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    220,
  ) || sanitizeProjectStateSnapshotText(
    input.fallbackProjectState?.proactiveSameHerGap
    ?? (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    220,
  ) || null
  const latestProgressReason = resolveProjectLatestProgressPreDialogueReason({
    runtimeLatestLandedProgress: input.runtimeProjectState?.latestLandedProgress,
    runtimeLatestProgress: input.runtimeProjectState?.latestProgress,
    runtimeLandedProgressSummary: (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
    fallbackLatestLandedProgress: input.fallbackProjectState?.latestLandedProgress,
    fallbackLatestProgress: input.fallbackProjectState?.latestProgress,
    fallbackLandedProgressSummary: (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
  })
  const preferredLatestProgressReason = carriesExplicitLatestLandedProgressAwareness(awarenessLine)
    ? ''
    : latestProgressReason
  const nextClosureTarget
    = sanitizeProjectStateSnapshotText(input.nextClosureTarget, 1600) || null
  const compactNextClosureTarget
    = sanitizeProjectStateSnapshotText(nextClosureTarget, 320) || null
  const compactSummaryLine = [
    input.primaryOpenLoop ? `Open focus: ${input.primaryOpenLoop}.` : '',
    compactNextClosureTarget ? `Next focus: ${compactNextClosureTarget}.` : '',
  ].filter(Boolean).join(' ')
  const explicitSummaryLine = sanitizeProjectStateSnapshotText(input.preflightSummary, 1600) || ''
  const runtimeSummaryLine = sanitizeProjectStateSnapshotText(input.runtimeProjectState?.preflightSummary, 1600) || ''
  const fallbackSummaryLine = sanitizeProjectStateSnapshotText(input.fallbackProjectState?.preflightSummary, 1600) || ''
  const thinSummaryRequested = looksLikeThinProjectPreflightSummary(input.preflightSummary)
    && looksLikeThinProjectPreflightSummary(input.runtimeProjectState?.preflightSummary)
  const shouldPreferRuntimeSummaryOverThinExplicit
    = looksLikeThinProjectPreflightSummary(explicitSummaryLine)
      && Boolean(runtimeSummaryLine)
      && !looksLikeThinProjectPreflightSummary(runtimeSummaryLine)
  const resolvedPreflightSummary
    = sanitizeProjectStateSnapshotText(preflightSummary, 1600)
      || runtimeSummaryLine
      || fallbackSummaryLine
      || ''
  const summaryLine = shouldPreferRuntimeSummaryOverThinExplicit
    ? runtimeSummaryLine
    : thinSummaryRequested
      ? (fallbackSummaryLine
        || resolvedPreflightSummary
        || compactSummaryLine)
      : (resolvedPreflightSummary
        || compactSummaryLine)

  return {
    status: preflightSummary ? 'grounded' : 'partial',
    summaryLine,
    companionHeadlineLine,
    companionBriefingLine,
    companionNextClosureLine: nextClosureTarget,
    awarenessLine,
    emotionalClosureCue,
    reasonPreview: [
      input.primaryOpenLoop ? `${input.primaryOpenLoop}` : '',
      preferredLatestProgressReason,
      proactiveSameHerGap ? `Initiative gap: ${proactiveSameHerGap}.` : '',
      nextClosureTarget ? `Next target: ${nextClosureTarget}.` : '',
    ].filter(Boolean),
  } as const
}

export function buildAlicizationProjectPreDialogueClosure(input: {
  preflightSummary: string | null
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    emotionalClosureCue?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    emotionalClosureCue?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
  } | null
  primaryOpenLoop: string | null
  nextClosureTarget: string | null
}) {
  const awareness = buildAlicizationProjectPreDialogueAwareness(input)
  const proactiveSameHerGap = sanitizeProjectStateSnapshotText(
    input.runtimeProjectState?.proactiveSameHerGap
    ?? (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    220,
  ) || sanitizeProjectStateSnapshotText(
    input.fallbackProjectState?.proactiveSameHerGap
    ?? (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    220,
  ) || ''
  const nextClosureTarget
    = sanitizeProjectStateSnapshotText(input.nextClosureTarget, 1600) || null
  const latestProgressReason = resolveProjectLatestProgressPreDialogueReason({
    runtimeLatestLandedProgress: input.runtimeProjectState?.latestLandedProgress,
    runtimeLatestProgress: input.runtimeProjectState?.latestProgress,
    runtimeLandedProgressSummary: (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
    fallbackLatestLandedProgress: input.fallbackProjectState?.latestLandedProgress,
    fallbackLatestProgress: input.fallbackProjectState?.latestProgress,
    fallbackLandedProgressSummary: (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
  })
  const preferredLatestProgressReason = carriesExplicitLatestLandedProgressAwareness(awareness.awarenessLine)
    ? ''
    : latestProgressReason
  return {
    status: awareness.status === 'grounded' ? 'partial' : 'partial',
    summaryLine: awareness.summaryLine,
    companionHeadlineLine: awareness.companionHeadlineLine,
    companionBriefingLine: awareness.companionBriefingLine,
    companionNextClosureLine: awareness.companionNextClosureLine,
    emotionalClosureCue: awareness.emotionalClosureCue,
    briefingLines: [
      awareness.summaryLine,
      nextClosureTarget ? `Next closure target: ${nextClosureTarget}` : '',
    ].filter(Boolean),
    reasons: [
      input.primaryOpenLoop ? `${input.primaryOpenLoop}` : '',
      preferredLatestProgressReason,
      proactiveSameHerGap ? `Initiative gap: ${proactiveSameHerGap}.` : '',
      nextClosureTarget ?? '',
    ].filter(Boolean),
  } as const
}

function looksLikeSceneContaminatedRuntimeSameHerSelfLine(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const normalized = raw.trim()
  if (!normalized)
    return false

  const lowered = normalized.toLowerCase()
  const carriesSameHerProjectBaseline
    = lowered.includes('same phase 1 digital life')
      || lowered.includes('same living line')
      || lowered.includes('continuous her')
      || lowered.includes('one continuous her')
  const carriesSceneNarration
    = /宿主正在|宿主还在沿着|host is|host is still following|runtime\.ts|index\.ts|callback result seam|foreground|scene|window|screen|工作线程|work thread|trust seam/u.test(normalized)

  return carriesSameHerProjectBaseline && carriesSceneNarration
}

export function preferStrongerPersistedSameHerSelfLine(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string' ? input.current.trim() : ''
  const candidate = typeof input.candidate === 'string' ? input.candidate.trim() : ''

  if (!current)
    return candidate || ''
  if (!candidate)
    return current
  if (current === candidate)
    return current
  if (looksLikeSceneContaminatedRuntimeSameHerSelfLine(current) && !looksLikeSceneContaminatedRuntimeSameHerSelfLine(candidate))
    return candidate
  if (looksLikeSceneContaminatedRuntimeSameHerSelfLine(candidate) && !looksLikeSceneContaminatedRuntimeSameHerSelfLine(current))
    return current

  const looksLikeEmbodiedLivingSelfSameHerLine = (value: string) => {
    const lowered = value.toLowerCase()
    return (
      /holding together mainly through|being carried mainly through/u.test(lowered)
      && /one living her|same living line|cross-modal closure|full cross-modal closure/u.test(lowered)
    )
    || (
      /face|motion|voice|lipsync/u.test(lowered)
      && /must keep proving this is still one living her/u.test(lowered)
    )
  }
  const looksLikeThinGenericSameHerCarry = (value: string) => {
    const lowered = value.toLowerCase()
    return /generic same-her line|generic same her line|thinner carried audit|keep the same digital life project in view|generic reminder|generic guidance/u.test(lowered)
  }
  const looksLikeCallbackSpecificSameHerCarry = (value: string) => {
    const lowered = value.toLowerCase()
    return (
      /callback turn still belongs|same callback line|restart return|restart callback|same living her/u.test(lowered)
      && /same her|same-her|callback line|living her|belongs to the same/u.test(lowered)
    )
  }
  const looksLikeCanonicalPhaseShellSameHerCarry = (value: string) => {
    const lowered = value.toLowerCase()
    return /same phase 1 digital life/u.test(lowered)
      && /some closure already landed/u.test(lowered)
      && /same living line/u.test(lowered)
  }

  if (looksLikeEmbodiedLivingSelfSameHerLine(current) && looksLikeThinGenericSameHerCarry(candidate))
    return current
  if (looksLikeEmbodiedLivingSelfSameHerLine(candidate) && looksLikeThinGenericSameHerCarry(current))
    return candidate
  if (looksLikeCallbackSpecificSameHerCarry(current) && looksLikeCanonicalPhaseShellSameHerCarry(candidate))
    return current
  if (looksLikeCallbackSpecificSameHerCarry(candidate) && looksLikeCanonicalPhaseShellSameHerCarry(current))
    return candidate

  const scoreSameHerSelfLineStrength = (value: string) => {
    const lowered = value.toLowerCase()
    let score = 0

    if (/\bshould not outrank\b/u.test(lowered))
      score -= 24
    if (/fresher conscious-frame|conscious-frame project seam/u.test(lowered))
      score -= 8
    if (/erase the live closure seam|live closure seam/u.test(lowered))
      score += 20
    if (/unfinished closure seam|same closure line forward|same-life seam/u.test(lowered))
      score += 4
    if (/holding together mainly through|being carried mainly through/u.test(lowered))
      score += 8
    if (/callback turn still belongs|same callback line|restart return|restart callback/u.test(lowered))
      score += 10
    if (/\bsame her\b|\bsame-her\b|\bone same her\b/u.test(lowered))
      score += 6
    if (/同一个她|同一个 her/u.test(value))
      score += 6
    if (/continuous her|one continuous her/u.test(lowered))
      score += 6
    if (/same living her|one living her/u.test(lowered))
      score += 6
    if (/same phase 1 digital life/u.test(lowered))
      score += 5
    if (/same living line/u.test(lowered))
      score += 4
    if (/同一条生命线|同一条线/u.test(value))
      score += 4
    if (/回线|接回去|继续沿着这条线/u.test(value))
      score += 4
    if (/face|motion|voice|lipsync|cross-modal closure|full cross-modal closure/u.test(lowered))
      score += 3
    if (/pre-dialogue awareness|host-visible reply|provider-facing answer/u.test(lowered))
      score += 3
    if (/通用回调壳|通用项目壳|通用助手壳|项目壳/u.test(value))
      score += 5
    if (/generic same-her line|generic same her line|thinner carried audit|keep the same digital life project in view|generic reminder|generic guidance/u.test(lowered))
      score -= 8

    return score
  }

  const currentLower = current.toLowerCase()
  const candidateLower = candidate.toLowerCase()
  const currentScore = scoreSameHerSelfLineStrength(current)
  const candidateScore = scoreSameHerSelfLineStrength(candidate)
  if (currentScore !== candidateScore)
    return candidateScore > currentScore ? candidate : current

  const currentMentionsContinuousHer
    = currentLower.includes('continuous her') || currentLower.includes('one continuous her')
  const candidateMentionsContinuousHer
    = candidateLower.includes('continuous her') || candidateLower.includes('one continuous her')
  const currentCarriesUnifiedSameHerAcrossSubsystems
    = /(same her|same-her).*(across|through).*(memory|execution|embodiment)/iu.test(current)
      || /one same her.*(memory|execution|embodiment)/iu.test(current)
  const candidateCarriesUnifiedSameHerAcrossSubsystems
    = /(same her|same-her).*(across|through).*(memory|execution|embodiment)/iu.test(candidate)
      || /one same her.*(memory|execution|embodiment)/iu.test(candidate)
  const currentOnlyCarriesLivingLine
    = currentLower.includes('same living line') && !currentMentionsContinuousHer
  const candidateOnlyCarriesLivingLine
    = candidateLower.includes('same living line') && !candidateMentionsContinuousHer

  if (currentCarriesUnifiedSameHerAcrossSubsystems && !candidateCarriesUnifiedSameHerAcrossSubsystems)
    return current
  if (candidateCarriesUnifiedSameHerAcrossSubsystems && !currentCarriesUnifiedSameHerAcrossSubsystems)
    return candidate
  if (currentMentionsContinuousHer && candidateOnlyCarriesLivingLine)
    return current
  if (candidateMentionsContinuousHer && currentOnlyCarriesLivingLine)
    return candidate

  return candidate.length > current.length ? candidate : current
}

export function preferStrongerSameHerDriftRisk(input: {
  current?: unknown
  candidate?: unknown
  fallback?: unknown
}) {
  const current = sanitizeProjectStateSnapshotText(input.current, 240)
  const candidate = sanitizeProjectStateSnapshotText(input.candidate, 240)
  const fallback = sanitizeProjectStateSnapshotText(input.fallback, 240)

  const scoreSameHerDriftRisk = (value: string) => {
    const lowered = value.toLowerCase()
    let score = 0

    if (!lowered)
      return Number.NEGATIVE_INFINITY

    if (/generic assistant shell|generic helper shell|generic helper voice|generic task shell|generic callback shell|generic project shell|detached project narration|detached project shell|project-summary voice|phase-summary shell|generic productivity reporting|项目总结口气|通用回调壳|通用项目壳|通用助手壳|脱离项目叙述/u.test(lowered))
      score += 10
    if (/same-her|same her|same digital life|one living her|one continuous her|same living line|同一个她|同一个 her|同一条生命线|同一条线/u.test(lowered))
      score += 4
    if (/unfinished same-her drift|same-her continuity drift|same her continuity drift|未完成的 same-her drift|未完成的连续性漂移/u.test(lowered))
      score += 4
    if (/unfinished closure drift|未完成的闭环漂移/u.test(lowered))
      score += 2
    if (/thin generic reminder|generic reminder|泛化提醒|薄壳提醒/u.test(lowered))
      score += 3
    if (/generic guidance|泛化引导/u.test(lowered))
      score += 1
    if (/project-state continuity|项目状态连续性/u.test(lowered))
      score += 1

    return score
  }

  if (!current)
    return candidate || fallback
  if (!candidate)
    return current || fallback
  if (current === candidate)
    return current

  const currentScore = scoreSameHerDriftRisk(current)
  const candidateScore = scoreSameHerDriftRisk(candidate)
  if (currentScore !== candidateScore)
    return candidateScore > currentScore ? candidate : current

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

export function resolveAlicizationProjectStateSnapshot(input?: {
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    openClosureSummary?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
    nextClosureTarget?: unknown
    nextClosureTargetSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
    emotionalClosureCue?: unknown
    emotionalClosureSummary?: unknown
    sameHerHoldDetail?: unknown
    continuityRestraint?: unknown
    continuityArcStage?: unknown
    continuityCue?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    openClosureSummary?: unknown
    proactiveSameHerGap?: unknown
    proactiveSameHerGapSummary?: unknown
    nextClosureTarget?: unknown
    nextClosureTargetSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
    emotionalClosureCue?: unknown
    emotionalClosureSummary?: unknown
    sameHerHoldDetail?: unknown
    continuityRestraint?: unknown
    continuityArcStage?: unknown
    continuityCue?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
}): AlicizationProjectStateSnapshot {
  const brief = resolveAlicizationProjectStateBrief()
  const identity = sanitizeProjectStateIdentityText(input?.runtimeProjectState?.identity, 220)
    || sanitizeProjectStateIdentityText(input?.fallbackProjectState?.identity, 220)
    || brief.identity
  const currentPhase = sanitizeProjectStatePhaseText(input?.runtimeProjectState?.currentPhase, 160)
    || sanitizeProjectStatePhaseText(input?.fallbackProjectState?.currentPhase, 160)
    || brief.currentPhase
  const runtimePrimaryOpenLoop = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.primaryOpenLoop
    ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.openClosureSummary,
    320,
  )
  const fallbackPrimaryOpenLoop = sanitizeProjectStateSnapshotText(
    input?.fallbackProjectState?.primaryOpenLoop
    ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.openClosureSummary,
    320,
  )
  const primaryOpenLoop
    = (!looksLikeThinProjectClosureShell(runtimePrimaryOpenLoop, 'open') ? runtimePrimaryOpenLoop : '')
      || fallbackPrimaryOpenLoop
      || brief.openLoops[0]
  const proactiveSameHerGap = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.proactiveSameHerGap
    ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    320,
  )
  || sanitizeProjectStateSnapshotText(
    input?.fallbackProjectState?.proactiveSameHerGap
    ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    320,
  )
  || brief.proactiveSameHerGap
  const runtimeNextClosureTarget = sanitizeProjectStateSnapshotText(
    input?.runtimeProjectState?.nextClosureTarget
    ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.nextClosureTargetSummary,
    1600,
  )
  const fallbackNextClosureTarget = sanitizeProjectStateSnapshotText(
    input?.fallbackProjectState?.nextClosureTarget
    ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.nextClosureTargetSummary,
    1600,
  )
  const nextClosureTarget
    = (!looksLikeThinProjectClosureShell(runtimeNextClosureTarget, 'next') ? runtimeNextClosureTarget : '')
      || fallbackNextClosureTarget
      || brief.nextClosureTarget
  const sameHerSelfLine = preferStrongerPersistedSameHerSelfLine({
    current: input?.runtimeProjectState?.sameHerSelfLine,
    candidate: input?.fallbackProjectState?.sameHerSelfLine ?? brief.sameHerSelfLine,
  }) || brief.sameHerSelfLine
  const sameHerDriftRisk = sanitizeProjectStateCueOutput(preferStrongerSameHerDriftRisk({
    current:
      input?.runtimeProjectState?.sameHerDriftRisk
      ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
    candidate:
      input?.fallbackProjectState?.sameHerDriftRisk
      ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
    fallback: brief.sameHerDriftRisk,
  }), 220) || brief.sameHerDriftRisk
  const runtimeLatestLandedProgress
    = sanitizeProjectStateSnapshotText(
      input?.runtimeProjectState?.latestLandedProgress
      ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
      320,
    )
    || sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.latestProgress, 320)
  const fallbackLatestLandedProgress
    = sanitizeProjectStateSnapshotText(
      input?.fallbackProjectState?.latestLandedProgress
      ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary,
      320,
    )
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.latestProgress, 320)
  const latestLandedProgress
    = (!looksLikeThinProjectClosureShell(runtimeLatestLandedProgress, 'landed') ? runtimeLatestLandedProgress : '')
      || fallbackLatestLandedProgress
      || brief.latestProgress
  const emotionalClosureCue = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.emotionalClosureCue, 220)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.emotionalClosureCue, 220)
    || brief.emotionalClosureCue
    || null
  const emotionalClosureSummary = preferRicherProjectStateCarryText({
    current: input?.runtimeProjectState?.emotionalClosureSummary ?? input?.runtimeProjectState?.emotionalClosureCue,
    candidate: input?.fallbackProjectState?.emotionalClosureSummary
      ?? input?.fallbackProjectState?.emotionalClosureCue
      ?? brief.emotionalClosureSummary
      ?? brief.emotionalClosureCue,
    maxChars: 240,
  }) || emotionalClosureCue
  const explicitContinuityRestraintRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.continuityRestraint, 64)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.continuityRestraint, 64)
  const continuityRestraint
    = explicitContinuityRestraintRaw === 'lower-pressure'
      || explicitContinuityRestraintRaw === 'measured-return'
      || explicitContinuityRestraintRaw === 'repair-before-closeness'
      || explicitContinuityRestraintRaw === 'rest-protective'
      || explicitContinuityRestraintRaw === 'single-thread'
      ? explicitContinuityRestraintRaw
      : brief.continuityRestraint ?? null
  const explicitContinuityCadence = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.continuityCadence, 120)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.continuityCadence, 120)
  const continuityCadence = explicitContinuityCadence
    || null
  const continuityBehaviorMode = resolveProjectContinuityBehaviorMode({
    continuityRestraint: explicitContinuityRestraintRaw,
    continuityCadence: explicitContinuityCadence,
  })
  const explicitContinuityCue = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.continuityCue, 220)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.continuityCue, 220)
  const derivedContinuityCue = deriveContinuityCueFromProjectContinuityBehavior(continuityBehaviorMode)
  const continuityCue = explicitContinuityCue
    || derivedContinuityCue
    || deriveContinuityCueFromProjectContinuityBehavior(continuityBehaviorMode)
    || brief.continuityCue
    || null
  const explicitSameHerHoldDetail = preferRicherProjectStateCarryText({
    current: input?.runtimeProjectState?.sameHerHoldDetail,
    candidate: input?.fallbackProjectState?.sameHerHoldDetail,
    maxChars: 240,
  }) || null
  const derivedSameHerHoldDetail = deriveSameHerHoldDetailFromProjectContinuityBehavior(continuityBehaviorMode)
  const awarenessSameHerHoldDetail = explicitSameHerHoldDetail || derivedSameHerHoldDetail || null
  const awarenessContinuityCue = explicitContinuityCue || derivedContinuityCue || null
  const preferredExplicitSameHerHoldDetail = explicitSameHerHoldDetail
    ? preferStrongerContinuityClosureAuthority(explicitSameHerHoldDetail, continuityCue)
    ?? explicitSameHerHoldDetail
    : null
  const preferredBriefSameHerHoldDetail = brief.sameHerHoldDetail
    ? preferStrongerContinuityClosureAuthority(brief.sameHerHoldDetail, continuityCue)
    ?? brief.sameHerHoldDetail
    : null
  const sameHerHoldDetail = sanitizeProjectStateSnapshotText(
    preferredExplicitSameHerHoldDetail
    ?? derivedSameHerHoldDetail
    ?? preferredBriefSameHerHoldDetail
    ?? continuityCue,
    240,
  ) || null
  const continuityArcStage = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.continuityArcStage, 120)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.continuityArcStage, 120)
    || null
  const continuityPreferredTimingRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.continuityPreferredTiming, 120)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.continuityPreferredTiming, 120)
  const continuityPreferredTiming
    = continuityPreferredTimingRaw === 'internal-only'
      || continuityPreferredTimingRaw === 'after-payoff'
      || continuityPreferredTimingRaw === 'same-turn-if-invited'
      || continuityPreferredTimingRaw === 'next-open-window'
      ? continuityPreferredTimingRaw
      : null
  const preferredBlinkCadenceRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preferredBlinkCadence, 32)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preferredBlinkCadence, 32)
  const preferredBlinkCadence
    = preferredBlinkCadenceRaw === 'normal'
      || preferredBlinkCadenceRaw === 'linger'
      || preferredBlinkCadenceRaw === 'quiet'
      ? preferredBlinkCadenceRaw
      : null
  const preferredGazeModeRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preferredGazeMode, 32)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preferredGazeMode, 32)
  const preferredGazeMode
    = preferredGazeModeRaw === 'steady'
      || preferredGazeModeRaw === 'soften'
      || preferredGazeModeRaw === 'drift'
      ? preferredGazeModeRaw
      : null
  const preferredPauseModeRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preferredPauseMode, 32)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preferredPauseMode, 32)
  const preferredPauseMode
    = preferredPauseModeRaw === 'longer'
      || preferredPauseModeRaw === 'natural'
      ? preferredPauseModeRaw
      : null
  const preferredLipsyncModeRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preferredLipsyncMode, 32)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preferredLipsyncMode, 32)
  const preferredLipsyncMode
    = preferredLipsyncModeRaw === 'restrained'
      || preferredLipsyncModeRaw === 'matched'
      ? preferredLipsyncModeRaw
      : null
  const preferredVoiceModeRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preferredVoiceMode, 32)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preferredVoiceMode, 32)
  const preferredVoiceMode
    = preferredVoiceModeRaw === 'lower-pressure'
      || preferredVoiceModeRaw === 'even'
      ? preferredVoiceModeRaw
      : null
  const preferredPacingModeRaw = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preferredPacingMode, 32)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preferredPacingMode, 32)
  const preferredPacingMode
    = preferredPacingModeRaw === 'slower'
      || preferredPacingModeRaw === 'natural'
      ? preferredPacingModeRaw
      : null
  const preflightSummary = resolvePreferredProjectPreflightSummary({
    preflightSummary: input?.runtimeProjectState?.preflightSummary ?? input?.fallbackProjectState?.preflightSummary ?? null,
    runtimeProjectState: {
      identity,
      currentPhase,
      preflightSummary: input?.runtimeProjectState?.preflightSummary ?? null,
      preDialogueAwarenessLine: input?.runtimeProjectState?.preDialogueAwarenessLine ?? null,
      awarenessLine: input?.runtimeProjectState?.awarenessLine ?? null,
      companionBriefingLine: input?.runtimeProjectState?.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: input?.runtimeProjectState?.preDialogueAwarenessSummary ?? null,
    },
    fallbackProjectState: {
      identity,
      currentPhase,
      preflightSummary: input?.fallbackProjectState?.preflightSummary ?? null,
      preDialogueAwarenessLine: input?.fallbackProjectState?.preDialogueAwarenessLine ?? null,
      awarenessLine: input?.fallbackProjectState?.awarenessLine ?? null,
      companionBriefingLine: input?.fallbackProjectState?.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: input?.fallbackProjectState?.preDialogueAwarenessSummary ?? null,
    },
    primaryOpenLoop,
    nextClosureTarget,
  }) ?? brief.preflightSummary ?? ''
  const runtimePreDialogueAwarenessLine = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preDialogueAwarenessLine, 1600)
  const runtimeAwarenessLine = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.awarenessLine, 1600)
  const runtimeCompanionHeadlineLine = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.companionHeadlineLine, 1600)
  const runtimeCompanionBriefingLine = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.companionBriefingLine, 1600)
  const runtimePreDialogueAwarenessSummary = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.preDialogueAwarenessSummary, 1600)
  const fallbackPreDialogueAwarenessLine = sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preDialogueAwarenessLine, 1600)
  const fallbackAwarenessLine = sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.awarenessLine, 1600)
  const fallbackCompanionHeadlineLine = sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.companionHeadlineLine, 1600)
  const fallbackCompanionBriefingLine = sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.companionBriefingLine, 1600)
  const fallbackPreDialogueAwarenessSummary = sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.preDialogueAwarenessSummary, 1600)
  const awarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      identity,
      currentPhase,
      latestLandedProgress,
      latestProgress: input?.runtimeProjectState?.latestProgress ?? null,
      landedProgressSummary:
        (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary ?? null,
      primaryOpenLoop,
      nextClosureTarget,
      preDialogueAwarenessLine: runtimePreDialogueAwarenessLine,
      awarenessLine: runtimeAwarenessLine,
      companionHeadlineLine: runtimeCompanionHeadlineLine,
      companionBriefingLine: runtimeCompanionBriefingLine,
      preDialogueAwarenessSummary: runtimePreDialogueAwarenessSummary,
      sameHerSelfLine,
      sameHerHoldDetail: awarenessSameHerHoldDetail,
      continuityCue: awarenessContinuityCue,
      continuityRestraint: explicitContinuityRestraintRaw || null,
      continuityCadence: explicitContinuityCadence || null,
      sameHerDriftRiskSummary:
        input?.runtimeProjectState?.sameHerDriftRisk
        ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
      preflightSummary,
    },
    fallbackProjectState: {
      identity,
      currentPhase,
      latestLandedProgress,
      latestProgress: input?.fallbackProjectState?.latestProgress ?? null,
      landedProgressSummary:
        (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.landedProgressSummary ?? null,
      primaryOpenLoop,
      nextClosureTarget,
      preDialogueAwarenessLine: fallbackPreDialogueAwarenessLine,
      awarenessLine: fallbackAwarenessLine,
      companionHeadlineLine: fallbackCompanionHeadlineLine,
      companionBriefingLine: fallbackCompanionBriefingLine,
      preDialogueAwarenessSummary: fallbackPreDialogueAwarenessSummary,
      sameHerSelfLine,
      sameHerHoldDetail: awarenessSameHerHoldDetail,
      continuityCue: awarenessContinuityCue,
      continuityRestraint: explicitContinuityRestraintRaw || null,
      continuityCadence: explicitContinuityCadence || null,
      sameHerDriftRiskSummary:
        input?.fallbackProjectState?.sameHerDriftRisk
        ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
      preflightSummary,
    },
  }) || brief.preDialogueAwarenessLine || ''
  const preferredAwarenessSummarySource = (
    looksLikeFullProjectPhaseClosureReanchor(runtimePreDialogueAwarenessLine)
      ? runtimePreDialogueAwarenessLine
      : looksLikeFullProjectPhaseClosureReanchor(runtimePreDialogueAwarenessSummary)
        ? runtimePreDialogueAwarenessSummary
        : looksLikeFullProjectPhaseClosureReanchor(fallbackPreDialogueAwarenessSummary)
          ? fallbackPreDialogueAwarenessSummary
          : looksLikeFullProjectPhaseClosureReanchor(fallbackPreDialogueAwarenessLine)
            ? fallbackPreDialogueAwarenessLine
            : null
  ) || null
  const resolvedPreDialogueAwarenessSummary
    = preferredAwarenessSummarySource
      ?? awarenessLine
      ?? null
  const companionHeadlineLine = runtimeCompanionHeadlineLine
    || fallbackCompanionHeadlineLine
    || null
  const companionBriefingLine = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.companionBriefingLine, 320)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.companionBriefingLine, 320)
    || null

  return {
    identity,
    currentPhase,
    preflightSummary,
    preDialogueAwarenessLine: awarenessLine || null,
    preDialogueAwarenessSummary: resolvedPreDialogueAwarenessSummary,
    awarenessLine,
    companionHeadlineLine,
    companionBriefingLine,
    latestLandedProgress: latestLandedProgress || null,
    latestProgress: latestLandedProgress || null,
    primaryOpenLoop,
    proactiveSameHerGap,
    nextClosureTarget,
    sameHerSelfLine: sanitizeSameHerProjectLine(sameHerSelfLine, brief.sameHerSelfLine),
    sameHerDriftRisk,
    emotionalClosureCue,
    emotionalClosureSummary,
    sameHerHoldDetail,
    continuityRestraint,
    continuityArcStage,
    continuityCue,
    continuityPreferredTiming,
    continuityCadence,
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
  }
}

export interface AlicizationSurfaceProjectStateSnapshot extends AlicizationProjectStateSnapshot {
  continuityRestraint: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
  continuityPreferredTiming: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
  continuityCadence: string | null
  preferredBlinkCadence: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode: 'longer' | 'natural' | null
  preferredLipsyncMode: 'restrained' | 'matched' | null
  preferredVoiceMode: 'lower-pressure' | 'even' | null
  preferredPacingMode: 'slower' | 'natural' | null
  sameHerDriftRisk: string
}

function buildSurfaceMemoryDerivedProjectState(memory?: {
  selfEvolution?: {
    relationshipCadenceSummary?: unknown
    relationshipDoctrine?: unknown
    latestInflection?: unknown
    summary?: unknown
  } | null
  personStateProjection?: {
    selfContinuityAuthority?: {
      selfLine?: unknown
      relationshipLine?: unknown
      inwardLine?: unknown
      authoritySummary?: unknown
    } | null
  } | null
} | null) {
  const selfEvolution = memory?.selfEvolution ?? null
  const authority = memory?.personStateProjection?.selfContinuityAuthority ?? null
  const rawCadenceLine = sanitizeProjectStateSnapshotText(selfEvolution?.relationshipCadenceSummary, 480)
  const rawDoctrineLine = sanitizeProjectStateSnapshotText(selfEvolution?.relationshipDoctrine, 480)
  const rawLatestInflection = sanitizeProjectStateSnapshotText(selfEvolution?.latestInflection, 480)
  const rawSelfEvolutionSummary = sanitizeProjectStateSnapshotText(selfEvolution?.summary, 480)
  const rawAuthoritySelfLine = sanitizeProjectStateSnapshotText(authority?.selfLine, 480)
  const rawAuthorityRelationshipLine = sanitizeProjectStateSnapshotText(authority?.relationshipLine, 480)
  const rawAuthorityInwardLine = sanitizeProjectStateSnapshotText(authority?.inwardLine, 480)
  const rawAuthoritySummary = sanitizeProjectStateSnapshotText(authority?.authoritySummary, 480)
  const cadenceLine = sanitizeProjectStateSnapshotText(selfEvolution?.relationshipCadenceSummary, 220)
  const doctrineLine = sanitizeProjectStateSnapshotText(selfEvolution?.relationshipDoctrine, 240)
  const latestInflection = sanitizeProjectStateSnapshotText(selfEvolution?.latestInflection, 220)
  const selfEvolutionSummary = sanitizeProjectStateSnapshotText(selfEvolution?.summary, 220)
  const authoritySelfLine = sanitizeProjectStateSnapshotText(authority?.selfLine, 220)
  const authorityRelationshipLine = sanitizeProjectStateSnapshotText(authority?.relationshipLine, 240)
  const authorityInwardLine = sanitizeProjectStateSnapshotText(authority?.inwardLine, 220)
  const authoritySummary = sanitizeProjectStateSnapshotText(authority?.authoritySummary, 220)

  if (
    !rawCadenceLine
    && !rawDoctrineLine
    && !rawLatestInflection
    && !rawSelfEvolutionSummary
    && !rawAuthoritySelfLine
    && !rawAuthorityRelationshipLine
    && !rawAuthorityInwardLine
    && !rawAuthoritySummary
  ) {
    return null
  }

  const brief = resolveAlicizationProjectStateBrief()
  const sameHerSelfLine = sanitizeProjectStateSnapshotText(
    preferStrongerPersistedSameHerSelfLine({
      current: authoritySelfLine || authoritySummary,
      candidate: cadenceLine || authoritySelfLine || authoritySummary,
    }) || cadenceLine || authoritySelfLine || authoritySummary,
    220,
  ) || null
  const sameHerHoldDetail = sanitizeProjectStateSnapshotText(
    preferRicherProjectStateCarryText({
      current: doctrineLine || authorityRelationshipLine,
      candidate: authorityRelationshipLine || latestInflection || selfEvolutionSummary,
      maxChars: 240,
    }) || doctrineLine || authorityRelationshipLine || latestInflection || selfEvolutionSummary,
    240,
  ) || null
  const compactAuthorityContinuityCue = (() => {
    const combined = `${rawAuthorityInwardLine} ${rawAuthoritySummary} ${rawLatestInflection}`.toLowerCase()
    const carriesSameHer
      = /same her|same living line|local-first digital life|without reopening from scratch/u.test(combined)
    const carriesAntiShell
      = /generic assistant shell|detached project narration|generic project shell|project-summary voice/u.test(combined)
    if (carriesSameHer && carriesAntiShell) {
      return 'Stay anchored in the current identity continuity before a generic assistant shell takes over.'
    }
    if (
      carriesSameHer
      && /before widening outward again|same living line|without reopening from scratch/u.test(combined)
    ) {
      return 'Continuity cue evidence: local desktop identity is still current; restart risk is present; outward expansion is not yet supported by evidence.'
    }
    return authorityInwardLine || authoritySummary || latestInflection || cadenceLine || sameHerSelfLine
  })()
  const continuityCue = sanitizeProjectStateSnapshotText(
    compactAuthorityContinuityCue,
    220,
  ) || null
  const companionBriefingLine = sanitizeProjectStateSnapshotText([
    continuityCue,
    cadenceLine && cadenceLine !== continuityCue ? cadenceLine : '',
  ].filter(Boolean).join(' '), 320) || null
  const preDialogueAwarenessLine = sanitizeProjectStateSnapshotText(formatAlicizationProjectStateAwarenessFields({
    identity: brief.identity,
    currentPhase: brief.currentPhase,
    sameHerSelfLine,
    continuityAnchor: continuityCue && continuityCue !== sameHerSelfLine ? continuityCue : '',
    maxChars: 1600,
  }), 1600) || null
  const sameHerDriftRisk = sanitizeProjectStateSnapshotText(
    /generic assistant shell|detached project narration|generic project shell|generic helper shell|project-summary voice/iu.test(
      `${authoritySummary} ${authorityInwardLine}`,
    )
      ? 'If this reopening flattens into a generic assistant shell or detached project narration, treat that as unfinished continuity drift instead of a completed return.'
      : '',
    240,
  ) || null

  return {
    sameHerSelfLine,
    sameHerHoldDetail,
    continuityCue,
    companionBriefingLine,
    preDialogueAwarenessLine,
    awarenessLine: preDialogueAwarenessLine,
    sameHerDriftRisk,
  }
}

function looksLikeThinSurfaceProjectIdentityShell(raw: unknown) {
  const rawText = typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, 220).trim()
    : ''
  const text = sanitizeProjectStateIdentityText(raw, 220)
  const lowered = rawText.toLowerCase()
  if (!rawText)
    return true

  const carriesCanonicalProjectIdentity
    = lowered.includes('alicization is a local-first digital life project')
      || /本地优先数字生命项目/u.test(rawText)
  const carriesAntiShellContinuity
    = /not a fresh assistant shell|not a fresh shell|not a new shell|rebuilt for this turn|rebuilt each turn/iu.test(lowered)
      || /不是.*新助手壳|不是.*新壳|不是重新拼出来的新助手壳|不是重新拼出来的新壳/u.test(text)
      || /one continuous her|one continuous "her"|same project identity/iu.test(lowered)
      || /同一个她|还是同一个|同一项目身份/u.test(rawText)

  if (
    (
      /same local-first digital life project|same digital life project/iu.test(lowered)
      || carriesCanonicalProjectIdentity
    )
    && carriesAntiShellContinuity
  ) {
    return false
  }

  return text.toLowerCase() === 'project'
    || text.toLowerCase() === 'digital life project'
    || text.toLowerCase() === 'this local-first digital life project'
    || rawText === '项目'
    || rawText === '数字生命项目'
    || !carriesCanonicalProjectIdentity
}

export function resolveAlicizationSurfaceProjectStateSnapshot(input?: {
  runtimeSurface?: {
    raw?: unknown
    perception?: unknown
    cognition?: unknown
    memory?: unknown
    dialogue?: unknown
    agency?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    proactiveSameHerGap?: unknown
    nextClosureTarget?: unknown
    sameHerSelfLine?: unknown
    sameHerDriftRisk?: unknown
    emotionalClosureCue?: unknown
    emotionalClosureSummary?: unknown
    sameHerHoldDetail?: unknown
    continuityRestraint?: unknown
    continuityArcStage?: unknown
    continuityCue?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
}): AlicizationSurfaceProjectStateSnapshot {
  const rawRuntimeProjectState = (input?.runtimeSurface?.raw as any)?.runtimeDigest?.projectState ?? null
  const cognitionRuntimeProjectState = (input?.runtimeSurface?.cognition as any)?.runtimeDigest?.projectState ?? null
  const dialogueRuntimeProjectState = (input?.runtimeSurface?.dialogue as any)?.runtimeDigest?.projectState ?? null
  const memoryDerivedProjectState = buildSurfaceMemoryDerivedProjectState((input?.runtimeSurface?.memory as any) ?? null)
  const currentConsciousProjectState = (input?.runtimeSurface?.dialogue as any)?.currentConsciousFrame?.projectState ?? null
  const persistedLatestLandedProgress
    = sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.latestLandedProgress, 320)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.latestProgress, 320)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.memoryClosureSummary, 320)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.latestLandedProgress, 320)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.latestProgress, 320)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.memoryClosureSummary, 320)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.latestLandedProgress, 320)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.latestProgress, 320)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.memoryClosureSummary, 320)
      || null
  const persistedSurfaceProjectState = {
    ...dialogueRuntimeProjectState,
    ...rawRuntimeProjectState,
    ...cognitionRuntimeProjectState,
    latestLandedProgress: persistedLatestLandedProgress,
    latestProgress: persistedLatestLandedProgress,
  }
  const fallbackSurfaceProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: persistedSurfaceProjectState,
    fallbackProjectState: {
      ...memoryDerivedProjectState,
      ...input?.fallbackProjectState,
    },
  })
  const currentLatestLandedProgress
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.latestLandedProgress, 320)
      || sanitizeProjectStateSnapshotText(currentConsciousProjectState?.latestProgress, 320)
      || sanitizeProjectStateSnapshotText(currentConsciousProjectState?.landedProgressSummary, 320)
  const currentPrimaryOpenLoop = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.primaryOpenLoop, 320)
  const currentNextClosureTarget = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.nextClosureTarget, 1600)
  const persistedExplicitPreDialogueAwarenessLine
    = sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.preDialogueAwarenessLine, 1600)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.preDialogueAwarenessLine, 1600)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.preDialogueAwarenessLine, 1600)
      || null
  const explicitCurrentPreDialogueAwarenessLine = sanitizeProjectStateSnapshotText(
    currentConsciousProjectState?.preDialogueAwarenessLine,
    1600,
  ) || null
  const explicitCurrentAwarenessLine = sanitizeProjectStateSnapshotText(
    currentConsciousProjectState?.awarenessLine,
    1600,
  ) || null
  const explicitCurrentPreDialogueAwarenessSummary = sanitizeProjectStateSnapshotText(
    currentConsciousProjectState?.preDialogueAwarenessSummary,
    1600,
  ) || null
  const mergedRuntimeProjectState = currentConsciousProjectState
    ? {
        identity:
          looksLikeThinSurfaceProjectIdentityShell(currentConsciousProjectState?.identity)
            ? null
            : currentConsciousProjectState?.identity ?? null,
        currentPhase:
          currentConsciousProjectState?.currentPhase
          ?? null,
        preflightSummary:
          currentConsciousProjectState?.preflightSummary
          ?? null,
        preDialogueAwarenessLine:
          currentConsciousProjectState?.preDialogueAwarenessLine
          ?? null,
        awarenessLine:
          currentConsciousProjectState?.awarenessLine
          ?? null,
        preDialogueAwarenessSummary:
          currentConsciousProjectState?.preDialogueAwarenessSummary
          ?? null,
        latestLandedProgress:
          (!looksLikeThinProjectClosureShell(currentLatestLandedProgress, 'landed') ? currentLatestLandedProgress : '')
          || null,
        latestProgress:
          (!looksLikeThinProjectClosureShell(currentLatestLandedProgress, 'landed') ? currentLatestLandedProgress : '')
          || sanitizeProjectStateSnapshotText(currentConsciousProjectState?.latestProgress, 320)
          || null,
        primaryOpenLoop:
          (!looksLikeThinProjectClosureShell(currentPrimaryOpenLoop, 'open') ? currentPrimaryOpenLoop : '')
          || null,
        proactiveSameHerGap:
          sanitizeProjectStateSnapshotText(currentConsciousProjectState?.proactiveSameHerGap, 320)
          || null,
        nextClosureTarget:
          (!looksLikeThinProjectClosureShell(currentNextClosureTarget, 'next') ? currentNextClosureTarget : '')
          || null,
        sameHerSelfLine:
          currentConsciousProjectState?.sameHerSelfLine
            ? preferStrongerPersistedSameHerSelfLine({
                current: currentConsciousProjectState?.sameHerSelfLine,
                candidate: fallbackSurfaceProjectState.sameHerSelfLine,
              })
            : null,
        sameHerDriftRisk:
          currentConsciousProjectState?.sameHerDriftRisk
          ?? null,
        emotionalClosureCue:
          currentConsciousProjectState?.emotionalClosureCue
          ?? null,
        emotionalClosureSummary:
          currentConsciousProjectState?.emotionalClosureSummary
          ?? null,
        sameHerHoldDetail:
          currentConsciousProjectState?.sameHerHoldDetail
          ?? null,
        continuityRestraint:
          currentConsciousProjectState?.continuityRestraint
          ?? null,
        continuityArcStage:
          currentConsciousProjectState?.continuityArcStage
          ?? null,
        continuityCue:
          currentConsciousProjectState?.continuityCue
          ?? null,
      }
    : null
  const snapshot = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: mergedRuntimeProjectState,
    fallbackProjectState: {
      ...fallbackSurfaceProjectState,
      ...input?.fallbackProjectState,
    },
  })
  const preferredExplicitSurfaceAwarenessLine
    = !isAlicizationThinProjectAwarenessLine(explicitCurrentPreDialogueAwarenessLine)
      ? explicitCurrentPreDialogueAwarenessLine
      : !isAlicizationThinProjectAwarenessLine(explicitCurrentAwarenessLine)
          ? explicitCurrentAwarenessLine
          : !isAlicizationThinProjectAwarenessLine(persistedExplicitPreDialogueAwarenessLine)
              ? persistedExplicitPreDialogueAwarenessLine
              : null
  const preferredExplicitSurfaceAwarenessSummary
    = !isAlicizationThinProjectAwarenessLine(explicitCurrentPreDialogueAwarenessSummary)
      ? explicitCurrentPreDialogueAwarenessSummary
      : !isAlicizationThinProjectAwarenessLine(explicitCurrentPreDialogueAwarenessLine)
          ? explicitCurrentPreDialogueAwarenessLine
          : !isAlicizationThinProjectAwarenessLine(explicitCurrentAwarenessLine)
              ? explicitCurrentAwarenessLine
              : !isAlicizationThinProjectAwarenessLine(persistedExplicitPreDialogueAwarenessLine)
                  ? persistedExplicitPreDialogueAwarenessLine
                  : null
  const continuityPreferredTimingRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.continuityPreferredTiming, 120)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.continuityPreferredTiming, 120)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.continuityPreferredTiming, 120)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.continuityPreferredTiming, 120)
      || null
  const continuityPreferredTiming
    = continuityPreferredTimingRaw === 'internal-only'
      || continuityPreferredTimingRaw === 'after-payoff'
      || continuityPreferredTimingRaw === 'same-turn-if-invited'
      || continuityPreferredTimingRaw === 'next-open-window'
      ? continuityPreferredTimingRaw
      : null
  const preferredBlinkCadenceRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.preferredBlinkCadence, 32)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.preferredBlinkCadence, 32)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.preferredBlinkCadence, 32)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.preferredBlinkCadence, 32)
      || null
  const preferredBlinkCadence
    = preferredBlinkCadenceRaw === 'normal'
      || preferredBlinkCadenceRaw === 'linger'
      || preferredBlinkCadenceRaw === 'quiet'
      ? preferredBlinkCadenceRaw
      : null
  const preferredGazeModeRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.preferredGazeMode, 32)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.preferredGazeMode, 32)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.preferredGazeMode, 32)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.preferredGazeMode, 32)
      || null
  const preferredGazeMode
    = preferredGazeModeRaw === 'steady'
      || preferredGazeModeRaw === 'soften'
      || preferredGazeModeRaw === 'drift'
      ? preferredGazeModeRaw
      : null
  const preferredPauseModeRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.preferredPauseMode, 32)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.preferredPauseMode, 32)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.preferredPauseMode, 32)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.preferredPauseMode, 32)
      || null
  const preferredPauseMode
    = preferredPauseModeRaw === 'longer'
      || preferredPauseModeRaw === 'natural'
      ? preferredPauseModeRaw
      : null
  const preferredLipsyncModeRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.preferredLipsyncMode, 32)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.preferredLipsyncMode, 32)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.preferredLipsyncMode, 32)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.preferredLipsyncMode, 32)
      || null
  const preferredLipsyncMode
    = preferredLipsyncModeRaw === 'restrained'
      || preferredLipsyncModeRaw === 'matched'
      ? preferredLipsyncModeRaw
      : null
  const preferredVoiceModeRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.preferredVoiceMode, 32)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.preferredVoiceMode, 32)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.preferredVoiceMode, 32)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.preferredVoiceMode, 32)
      || null
  const preferredVoiceMode
    = preferredVoiceModeRaw === 'lower-pressure'
      || preferredVoiceModeRaw === 'even'
      ? preferredVoiceModeRaw
      : null
  const preferredPacingModeRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.preferredPacingMode, 32)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.preferredPacingMode, 32)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.preferredPacingMode, 32)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.preferredPacingMode, 32)
      || null
  const preferredPacingMode
    = preferredPacingModeRaw === 'slower'
      || preferredPacingModeRaw === 'natural'
      ? preferredPacingModeRaw
      : null
  const continuityRestraintRaw
    = sanitizeProjectStateSnapshotText(currentConsciousProjectState?.continuityRestraint, 64)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.continuityRestraint, 64)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.continuityRestraint, 64)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.continuityRestraint, 64)
      || null
  const continuityRestraint
    = continuityRestraintRaw === 'lower-pressure'
      || continuityRestraintRaw === 'measured-return'
      || continuityRestraintRaw === 'repair-before-closeness'
      || continuityRestraintRaw === 'rest-protective'
      || continuityRestraintRaw === 'single-thread'
      ? continuityRestraintRaw
      : snapshot.continuityRestraint ?? resolveAlicizationProjectStateBrief().continuityRestraint ?? null

  return {
    ...snapshot,
    preDialogueAwarenessLine:
      preferredExplicitSurfaceAwarenessLine
      || snapshot.preDialogueAwarenessLine,
    awarenessLine:
      preferredExplicitSurfaceAwarenessLine
      || snapshot.awarenessLine
      || snapshot.preDialogueAwarenessLine,
    preDialogueAwarenessSummary:
      preferredExplicitSurfaceAwarenessSummary
      || snapshot.preDialogueAwarenessSummary
      || preferredExplicitSurfaceAwarenessLine
      || snapshot.preDialogueAwarenessLine,
    companionHeadlineLine:
      sanitizeProjectStateSnapshotText(currentConsciousProjectState?.companionHeadlineLine, 320)
      || fallbackSurfaceProjectState.companionHeadlineLine
      || null,
    companionBriefingLine:
      sanitizeProjectStateSnapshotText(currentConsciousProjectState?.companionBriefingLine, 320)
      || fallbackSurfaceProjectState.companionBriefingLine
      || null,
    continuityRestraint,
    continuityPreferredTiming,
    continuityCadence:
      sanitizeProjectStateSnapshotText(currentConsciousProjectState?.continuityCadence, 120)
      || sanitizeProjectStateSnapshotText(cognitionRuntimeProjectState?.continuityCadence, 120)
      || sanitizeProjectStateSnapshotText(rawRuntimeProjectState?.continuityCadence, 120)
      || sanitizeProjectStateSnapshotText(dialogueRuntimeProjectState?.continuityCadence, 120)
      || null,
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
  }
}

export function buildAlicizationProjectPreDialogueAwarenessLine(input: {
  identity: string
  currentPhase: string
  latestLandedProgress?: string | null | undefined
  latestProgress?: string | null | undefined
  landedProgressSummary?: string | null | undefined
  primaryOpenLoop: string | null | undefined
  nextClosureTarget?: string | null | undefined
  sameHerSelfLine?: string | null | undefined
}) {
  const currentPhase = compactProjectPhaseForAwareness(input.currentPhase)
  const identity = compactProjectIdentityForAwareness(input.identity, 80)
  const latestProgressRaw = input.latestLandedProgress ?? input.latestProgress ?? input.landedProgressSummary ?? ''
  const awarenessAutonomyTail = resolveProjectLatestProgressAutonomyTail(latestProgressRaw, 'awareness')
  const awarenessLongHorizonEmotionTail = resolveProjectLatestProgressLongHorizonEmotionTail(latestProgressRaw)
  const awarenessLatestProgressMaxChars
    = resolveProjectLatestProgressGovernanceTail(latestProgressRaw)
      ? 144
      : awarenessAutonomyTail
        ? awarenessAutonomyTail.includes('final settlement reanchors generic same-her shells')
          ? awarenessLongHorizonEmotionTail
            ? 280
            : 240
          : awarenessAutonomyTail.includes('rest-protective proactive feedback next-session carry')
            ? 180
            : 112
        : 88
  const latestLandedProgress = compactProjectLatestProgressForAwareness(
    latestProgressRaw,
    awarenessLatestProgressMaxChars,
  )
  const primaryOpenLoop = compactProjectOpenLoopForAwareness(input.primaryOpenLoop ?? '', 112)
  const nextClosureTarget = compactProjectNextClosureTargetForAwareness(input.nextClosureTarget ?? '', 34)
  const sameHerSelfLine = compactSameHerLineForAwareness(input.sameHerSelfLine ?? '', 42)

  const awarenessLine = formatAlicizationProjectStateAwarenessFields({
    identity: identity || '',
    currentPhase,
    sameHerSelfLine,
    latestLandedProgress,
    primaryOpenLoop: lowerFirstProjectAwareness(primaryOpenLoop),
    nextClosureTarget,
    maxChars: 1600,
  })
    .replace(/\s+/g, ' ')
    .trim()

  return awarenessLine
    ? awarenessLine.trim()
    : null
}

export interface AlicizationProjectStateCoverageEntry {
  id:
    | 'visible-reply-executive-brief'
    | 'visible-reply-timeout-fallback'
    | 'proactive-policy-life-loop-bias'
    | 'runtime-delivery-reminders-project-state-persistence'
    | 'habit-policy-phase1-life-loop-bias'
    | 'behavioral-ecology-preflight-bias-chain'
    | 'body-kernel-same-her-continuity-authority'
    | 'main-chat-stream-meta-cross-modal-same-her-authority'
    | 'runtime-governance-embodiment-bridge-authority'
    | 'main-chat-session-runtime-same-her-bridge'
    | 'main-chat-runtime-surface-living-self-preflight'
    | 'visible-reply-facade-preflight-surface'
    | 'runtime-chat-perception-augment'
    | 'runtime-digest-architecture'
    | 'runtime-dream-reminder-proactive-gateways'
    | 'memory-provider-planning'
    | 'runtime-mind-state-cognition'
    | 'runtime-execution-callback-delivery'
    | 'execution-callback-learning-and-reconsolidation-chain'
    | 'desktop-execution-closure-loop-hardening'
    | 'runtime-screen-semantic-gateway'
    | 'entrypoint-governance-registry-hardening'
    | 'chat-start-entrypoint-candidate-hardening'
    | 'cross-surface-entrypoint-candidate-hardening'
    | 'return-side-entrypoint-candidate-hardening'
    | 'recovery-reentry-entrypoint-candidate-hardening'
    | 'provider-consumer-entrypoint-candidate-hardening'
    | 'autonomous-dialogue-entrypoint-candidate-hardening'
    | 'autonomous-dialogue-closure-loop-hardening'
    | 'execution-dispatch-entrypoint-candidate-hardening'
    | 'execution-preflight-registration'
    | 'execution-preflight-entrypoint-candidate-hardening'
    | 'execution-follow-up-entrypoint-candidate-hardening'
    | 'long-horizon-self-carry-hardening'
    | 'noisy-desktop-same-her-closure-hardening'
    | 'noisy-desktop-cross-modal-convergence-hardening'
    | 'emotional-memory-initiative-embodiment-hardening'
    | 'affective-residue-route-chain-hardening'
    | 'callback-afterglow-recollection-same-life-hardening'
    | 'recollection-visible-reply-same-life-hardening'
    | 'emotion-memory-voice-motion-convergence-hardening'
    | 'noisy-desktop-life-loop-unity-hardening'
    | 'long-run-same-her-continuity-hardening'
    | 'route-authority-boundary-registry-hardening'
    | 'runtime-dialogue-normalization-entrypoint-candidate-hardening'
    | 'runtime-turn-persistence-entrypoint-candidate-hardening'
    | 'project-state-provider-consumer-registration'
    | 'visible-reply-final-project-awareness-hardening'
    | 'execution-dispatch-owner-registration'
    | 'runtime-current-conscious-frame-awareness'
    | 'retrieval-and-writeback-continuity-pressure'
    | 'person-state-and-self-evolution-observability'
    | 'chat-start-pre-dialogue-awareness-chain'
    | 'mind-turn-contract-project-state-grounding'
    | 'downstream-reply-project-awareness-preservation'
    | 'same-living-self-project-awareness-observability'
  area: 'reply' | 'runtime' | 'memory' | 'perception' | 'execution'
  status: 'verified'
  responsibility: string
  proof: string
}

export type AlicizationProjectEntrypointGovernanceEntry = {
  domain: 'chat-start'
  relativePath: string
  mode: 'authority' | 'normalize-before-use' | 'read-only-downstream'
  responsibility: string
}
| {
  domain: 'pre-dialogue-transport'
  relativePath: string
  mode: 'identity-construction' | 'transport-sanitization' | 'bridge-forwarding'
  responsibility: string
}
| {
  domain: 'chat-entry'
  relativePath: string
  mode: 'authority' | 'normalize-before-use' | 'read-only-downstream' | 'shared-send-authority'
  responsibility: string
}
| {
  domain: 'provider-consumer'
  relativePath: string
  mode: 'authority' | 'dispatch-owner' | 'typed-consumer'
  responsibility: string
}
| {
  domain: 'autonomous-dialogue'
  relativePath: string
  mode: 'authority' | 'normalize-before-use'
  responsibility: string
}
| {
  domain: 'execution-preflight'
  relativePath: string
  mode:
    | 'execution-briefing-authority'
    | 'runtime-context-authority'
    | 'runtime-dispatch-execution-bridge'
    | 'session-bound-execution-bridge'
    | 'subconscious-autonomy-execution-bridge'
    | 'resume-dispatch-bridge'
    | 'pre-dispatch-persistence'
    | 'blocked-dispatch-safety-gate'
  responsibility: string
}
| {
  domain: 'execution-dispatch'
  relativePath: string
  mode: 'dispatch-owner'
  responsibility: string
}
| {
  domain: 'recovery-reentry'
  relativePath: string
  mode:
    | 'accepted-start-settlement'
    | 'accepted-start-owner'
    | 'timeout-fallback-reconstruction'
    | 'timeout-recovery-finish'
    | 'background-recovery-driver'
  responsibility: string
}
| {
  domain: 'execution-follow-up-continuity'
  relativePath: string
  mode:
    | 'callback-runtime-authority'
    | 'callback-conscious-frame-surface'
    | 'callback-delivery-surface'
    | 'callback-payoff-surface'
    | 'callback-capability-project-briefing'
    | 'follow-up-obligation-authority'
    | 'follow-up-response-contract-surface'
    | 'ledger-follow-up-recall'
    | 'session-follow-up-assembly'
    | 'afterglow-learning-authority'
    | 'callback-persistence-surface'
  responsibility: string
}

export function resolveAlicizationProjectEntrypointGovernanceAllowedModes(
  domain: AlicizationProjectEntrypointGovernanceEntry['domain'],
) {
  if (domain === 'chat-start')
    return ['authority', 'normalize-before-use', 'read-only-downstream'] as const
  if (domain === 'pre-dialogue-transport')
    return ['identity-construction', 'transport-sanitization', 'bridge-forwarding'] as const
  if (domain === 'chat-entry')
    return ['authority', 'normalize-before-use', 'read-only-downstream', 'shared-send-authority'] as const
  if (domain === 'provider-consumer')
    return ['authority', 'dispatch-owner', 'typed-consumer'] as const
  if (domain === 'autonomous-dialogue')
    return ['authority', 'normalize-before-use'] as const
  if (domain === 'execution-preflight') {
    return [
      'execution-briefing-authority',
      'runtime-context-authority',
      'runtime-dispatch-execution-bridge',
      'session-bound-execution-bridge',
      'subconscious-autonomy-execution-bridge',
      'resume-dispatch-bridge',
      'pre-dispatch-persistence',
      'blocked-dispatch-safety-gate',
    ] as const
  }
  if (domain === 'execution-dispatch')
    return ['dispatch-owner'] as const
  if (domain === 'recovery-reentry') {
    return [
      'accepted-start-settlement',
      'accepted-start-owner',
      'timeout-fallback-reconstruction',
      'timeout-recovery-finish',
      'background-recovery-driver',
    ] as const
  }
  return [
    'callback-runtime-authority',
    'callback-conscious-frame-surface',
    'callback-delivery-surface',
    'callback-payoff-surface',
    'callback-capability-project-briefing',
    'follow-up-obligation-authority',
    'follow-up-response-contract-surface',
    'ledger-follow-up-recall',
    'session-follow-up-assembly',
    'afterglow-learning-authority',
    'callback-persistence-surface',
  ] as const
}

export function assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain(
  entry: Pick<AlicizationProjectEntrypointGovernanceEntry, 'domain' | 'mode' | 'relativePath'>,
) {
  const allowedModes = resolveAlicizationProjectEntrypointGovernanceAllowedModes(entry.domain)
  if (allowedModes.includes(entry.mode as never))
    return

  throw new Error(`Unexpected Alicization entrypoint governance mode for ${entry.domain} at ${entry.relativePath}: ${entry.mode}`)
}

const alicizationProjectEntrypointGovernanceRegistry = [
  {
    domain: 'chat-start',
    relativePath: 'main-chat-start-awareness.ts',
    mode: 'authority',
    responsibility: 'Canonical builder and merger for pre-dialogue project awareness on main-process chat-start payloads.',
  },
  {
    domain: 'chat-start',
    relativePath: 'main-chat-background-run.ts',
    mode: 'normalize-before-use',
    responsibility: 'Background run execution must preserve the normalized chat-start identity before deferred turn work continues.',
  },
  {
    domain: 'chat-start',
    relativePath: 'main-chat-direct-start.ts',
    mode: 'normalize-before-use',
    responsibility: 'Direct IPC chat-start handoff must normalize project awareness before entering scoped runtime execution.',
  },
  {
    domain: 'chat-start',
    relativePath: 'main-chat-run-lifecycle.ts',
    mode: 'read-only-downstream',
    responsibility: 'Run lifecycle orchestration remains explicitly governed as a downstream chat-start seam even when it relies on an already-normalized payload.',
  },
  {
    domain: 'chat-start',
    relativePath: 'main-chat-start-acceptance.ts',
    mode: 'normalize-before-use',
    responsibility: 'Chat-start acceptance must normalize project awareness before feedback settling and turn admission.',
  },
  {
    domain: 'chat-start',
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'normalize-before-use',
    responsibility: 'Session-runtime execution prep must re-normalize transported project awareness before provider-facing shaping.',
  },
  {
    domain: 'chat-start',
    relativePath: 'main-chat-stream-runner.ts',
    mode: 'normalize-before-use',
    responsibility: 'Stream runner must preserve the normalized chat-start identity across streamed response execution.',
  },
  {
    domain: 'chat-start',
    relativePath: 'main-chat-timeout-fallback.ts',
    mode: 'read-only-downstream',
    responsibility: 'Timeout fallback recovery remains explicitly governed as a downstream chat-start seam even when it consumes an already-normalized payload.',
  },
  {
    domain: 'chat-start',
    relativePath: 'runtime-chat-stream.ts',
    mode: 'read-only-downstream',
    responsibility: 'Runtime chat-stream shaping remains explicitly governed as a downstream chat-start seam after normalization has already occurred.',
  },
  {
    domain: 'chat-start',
    relativePath: 'runtime-dialogue-feedback.ts',
    mode: 'normalize-before-use',
    responsibility: 'Dialogue feedback reopenings must reuse the canonical chat-start identity before continuing the same thread.',
  },
  {
    domain: 'chat-start',
    relativePath: 'runtime-execution-feedback.ts',
    mode: 'normalize-before-use',
    responsibility: 'Execution feedback reopenings must preserve the canonical chat-start identity across callback continuation.',
  },
  {
    domain: 'chat-start',
    relativePath: 'runtime-invoke-handlers-chat.ts',
    mode: 'normalize-before-use',
    responsibility: 'Invoke-handler chat entry must normalize the transported chat-start payload before runtime execution begins.',
  },
  {
    domain: 'chat-start',
    relativePath: 'runtime-main-chat-context.ts',
    mode: 'read-only-downstream',
    responsibility: 'Main-chat context builders remain explicitly governed as downstream chat-start consumers of the normalized payload seam.',
  },
  {
    domain: 'chat-start',
    relativePath: 'runtime-main-chat-prelude.ts',
    mode: 'normalize-before-use',
    responsibility: 'Runtime prelude must re-normalize the chat-start payload before downstream builders consume it.',
  },
  {
    domain: 'chat-start',
    relativePath: 'runtime.ts',
    mode: 'normalize-before-use',
    responsibility: 'Core runtime chat-start seam must normalize project awareness before acceptance and background execution begin.',
  },
  {
    domain: 'pre-dialogue-transport',
    relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
    mode: 'identity-construction',
    responsibility: 'Shared chat store transport seam must explicitly build the outbound pre-dialogue send identity before the renderer hands a turn into main-process chat-start execution.',
  },
  {
    domain: 'pre-dialogue-transport',
    relativePath: '../../../renderer/App.vue',
    mode: 'transport-sanitization',
    responsibility: 'Desktop renderer transport seam must preserve pre-dialogue send identity while sanitizing the chat-start payload for structured-clone-safe delivery into main-process execution.',
  },
  {
    domain: 'pre-dialogue-transport',
    relativePath: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.ts',
    mode: 'bridge-forwarding',
    responsibility: 'Context bridge transport seam must intentionally forward an already prepared pre-dialogue send identity across remote chat observation and server-channel forwarding boundaries.',
  },
  {
    domain: 'chat-entry',
    relativePath: './chat.ts',
    mode: 'authority',
    responsibility: 'Shared chat store derives or forwards pre-dialogue project awareness before renderer turns enter runtime bridging.',
  },
  {
    domain: 'chat-entry',
    relativePath: './chat/text-composer-store.ts',
    mode: 'authority',
    responsibility: 'Primary text composer explicitly builds pre-dialogue project awareness before dispatching a user-authored turn.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../packages/stage-layouts/src/components/Widgets/ChatArea.vue',
    mode: 'shared-send-authority',
    responsibility: 'Widget chat surface must stay on the shared text-composer send authority instead of forking a second host-facing pre-dialogue identity seam.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../packages/stage-layouts/src/components/Layouts/MobileInteractiveArea.vue',
    mode: 'shared-send-authority',
    responsibility: 'Mobile interactive chat surface must stay on the shared text-composer send authority instead of forking a second host-facing pre-dialogue identity seam.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-composer.vue',
    mode: 'shared-send-authority',
    responsibility: 'Quick-reply composer must stay on the shared text-composer send authority instead of fabricating a second host-facing pre-dialogue identity seam.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-web/src/pages/index.voice.ts',
    mode: 'authority',
    responsibility: 'Web voice dispatch explicitly forwards same-her pre-dialogue identity before runtime dispatch.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-pocket/src/pages/index.voice.ts',
    mode: 'authority',
    responsibility: 'Pocket voice dispatch explicitly forwards same-her pre-dialogue identity before runtime dispatch.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-tamagotchi/src/renderer/pages/index.desktop.ts',
    mode: 'authority',
    responsibility: 'Desktop renderer voice dispatch explicitly forwards same-her pre-dialogue identity before runtime dispatch.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-web/src/pages/index.vue',
    mode: 'authority',
    responsibility: 'Web page voice entry builds explicit pre-dialogue identity before handing control to the audited voice dispatcher.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-pocket/src/pages/index.vue',
    mode: 'authority',
    responsibility: 'Pocket page voice entry builds explicit pre-dialogue identity before handing control to the audited voice dispatcher.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-tamagotchi/src/renderer/pages/index.vue',
    mode: 'authority',
    responsibility: 'Desktop renderer page voice entry builds explicit pre-dialogue identity before handing control to the audited voice dispatcher.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-tamagotchi/src/renderer/App.vue',
    mode: 'read-only-downstream',
    responsibility: 'Desktop renderer transport handoff must preserve pre-dialogue send identity while sanitizing chat-start payloads for structured-clone-safe delivery into main-process runtime entry.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue',
    mode: 'normalize-before-use',
    responsibility: 'Desktop main chat surface must stay on the audited shared chat-store fallback awareness path instead of fabricating a parallel pre-dialogue identity seam.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-web/src/pages/devtools/performance-playground.chat.ts',
    mode: 'authority',
    responsibility: 'Web devtools dispatch must require explicit pre-dialogue identity before performance playground dialogue opens outward.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-pocket/src/pages/devtools/performance-playground.chat.ts',
    mode: 'authority',
    responsibility: 'Pocket devtools dispatch must require explicit pre-dialogue identity before performance playground dialogue opens outward.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-web/src/pages/devtools/performance-playground.vue',
    mode: 'authority',
    responsibility: 'Web devtools page builds explicit pre-dialogue identity before handing control to the audited performance playground dispatcher.',
  },
  {
    domain: 'chat-entry',
    relativePath: '../../../../apps/stage-pocket/src/pages/devtools/performance-playground.vue',
    mode: 'authority',
    responsibility: 'Pocket devtools page builds explicit pre-dialogue identity before handing control to the audited performance playground dispatcher.',
  },
  {
    domain: 'chat-entry',
    relativePath: './markdown-stress.ts',
    mode: 'authority',
    responsibility: 'Markdown stress harness must build explicit pre-dialogue identity from inspector continuity snapshots before stress dialogue opens outward.',
  },
  {
    domain: 'chat-entry',
    relativePath: './mods/api/context-bridge.ts',
    mode: 'authority',
    responsibility: 'Context bridge must build explicit pre-dialogue identity for raw input:text ingress before remote context-recall dialogue opens outward, while still forwarding already-governed traffic.',
  },
  {
    domain: 'chat-entry',
    relativePath: './alicization-epoch1.ts',
    mode: 'read-only-downstream',
    responsibility: 'Epoch1 bridge-backed remote chat entry stays explicitly classified as a downstream canonical-awareness seam.',
  },
  {
    domain: 'provider-consumer',
    relativePath: 'runtime-main-gateway-one-shot.ts',
    mode: 'authority',
    responsibility: 'Unified one-shot gateway wrapper owns source-tag validation, typed-fact filtering, direct Provider generation, and transparent failure audit.',
  },
  {
    domain: 'provider-consumer',
    relativePath: 'runtime.ts',
    mode: 'dispatch-owner',
    responsibility: 'Runtime composition owns wiring the shared audited main gateway text provider into downstream runtime families.',
  },
  {
    domain: 'provider-consumer',
    relativePath: 'runtime-mind-state.ts',
    mode: 'typed-consumer',
    responsibility: 'Mind-state cognition must constrain provider use to the typed audited dialogue-turn-semantics and inference gateways.',
  },
  {
    domain: 'provider-consumer',
    relativePath: 'runtime-execution-delivery.ts',
    mode: 'typed-consumer',
    responsibility: 'Execution delivery must keep callback authoring on the typed audited execution-callback gateway surface.',
  },
  {
    domain: 'provider-consumer',
    relativePath: 'memory-os/provider-planning.ts',
    mode: 'typed-consumer',
    responsibility: 'Memory provider planning must stay on the typed audited counterfactual-deliberation gateway surface.',
  },
  {
    domain: 'autonomous-dialogue',
    relativePath: 'runtime.ts',
    mode: 'authority',
    responsibility: 'Runtime-owned reminder and proactive entries must keep task prompts, typed memory facts, and Provider failure handling explicit without deterministic visible reply replacement.',
  },
  {
    domain: 'autonomous-dialogue',
    relativePath: 'runtime-delivery-reminders.ts',
    mode: 'normalize-before-use',
    responsibility: 'Reminder and execution-callback delivery must preserve source ownership and failure status before a runtime-owned visible turn is persisted or reopened.',
  },
  {
    domain: 'autonomous-dialogue',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'normalize-before-use',
    responsibility: 'Subconscious proactive surfacing must not persist a visible utterance when Provider mind authoring is unavailable.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'agent-runtime.ts',
    mode: 'execution-briefing-authority',
    responsibility: 'Agent runtime builds structured execution context before desktop execution begins, preserving memory ownership, route state, and transparent failure metadata.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'execution-runtime-context.ts',
    mode: 'runtime-context-authority',
    responsibility: 'Execution runtime context canonicalizes typed briefing and route facts before dispatch without creating Provider-visible persona guidance.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'runtime.ts',
    mode: 'runtime-dispatch-execution-bridge',
    responsibility: 'Runtime-owned direct dispatch bridge must rebuild canonical execution runtime context before redispatch leaves the desktop runtime, so direct execution handoff cannot reopen as a generic executor shell when payload and stored thread context are both still empty.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'session-bound-execution-bridge',
    responsibility: 'Session-bound execution bridge requests canonical execution runtime context before main-gateway tools open outward.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'subconscious-autonomy-execution-bridge',
    responsibility: 'Subconscious autonomy requests canonical execution runtime context before background auto-dispatch opens outward.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-runtime.ts',
    mode: 'resume-dispatch-bridge',
    responsibility: 'Confirmed execution resume restores typed execution context before delegated work resumes.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'task-thread-dispatcher.ts',
    mode: 'pre-dispatch-persistence',
    responsibility: 'Pre-dispatch task-thread persistence stores execution runtime context before delegated execution starts so callbacks remain traceable.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/claude-code.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Claude Code blocked-dispatch safety gates audit effect, permission mode, confirmation, risk, interruptibility, and execution context before refusing execution.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/codex.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Codex blocked-dispatch safety gates audit effect, permission mode, confirmation, risk, interruptibility, and execution context before refusing execution.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/cli.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'CLI blocked-dispatch safety gates audit risk level, action category, permission mode, confirmation, interruptibility, and execution context before refusing local execution.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/openclaw.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'OpenClaw blocked-dispatch safety gates audit effect, permission mode, confirmation, interruptibility, and execution context before refusing outward control.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/local-visual.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Local-visual blocked-dispatch safety gates audit effect, permission mode, confirmation, risk, interruptibility, and execution context before refusing local GUI execution.',
  },
  {
    domain: 'execution-dispatch',
    relativePath: 'runtime-invoke-handlers-task.ts',
    mode: 'dispatch-owner',
    responsibility: 'Task invoke handler remains the explicit owner of invoke-side execution dispatch seams.',
  },
  {
    domain: 'execution-dispatch',
    relativePath: 'runtime.ts',
    mode: 'dispatch-owner',
    responsibility: 'Runtime execution bridge owns the shared dispatchTaskThreadWithExecutionDelivery seam so executor-runtime and runtime-owned autonomy dispatch both re-enter one audited same-her execution handoff instead of forking a parallel delivery path.',
  },
  {
    domain: 'execution-dispatch',
    relativePath: 'executor-runtime.ts',
    mode: 'dispatch-owner',
    responsibility: 'Main-gateway execution runtime owns routed and resumed task-thread dispatch handoff, including kill-switch state, audit wiring, and explicit thread targeting before delegated execution begins.',
  },
  {
    domain: 'execution-dispatch',
    relativePath: 'autonomy-actuation.ts',
    mode: 'dispatch-owner',
    responsibility: 'Autonomy actuation owns proactive auto-start task dispatch gating and must only enter direct execution dispatch through the audited autonomous payload builder after explicit eligibility checks.',
  },
  {
    domain: 'execution-dispatch',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'dispatch-owner',
    responsibility: 'Subconscious deferred execution bridge must route dispatch back through dispatchAutonomyTaskThread so silent carry re-enters the audited runtime execution bridge instead of inventing a subconscious-only execution seam.',
  },
  {
    domain: 'execution-dispatch',
    relativePath: 'task-thread-orchestrator.ts',
    mode: 'dispatch-owner',
    responsibility: 'Task-thread orchestrator owns serialized direct-dispatch fallback behind the audited dispatch seam.',
  },
  {
    domain: 'recovery-reentry',
    relativePath: 'main-chat-start-result.ts',
    mode: 'accepted-start-settlement',
    responsibility: 'Accepted-start settlement must keep prepared governance, richer digital-life spine carry, and same-her project continuity explicit before the turn is allowed to reopen outward.',
  },
  {
    domain: 'recovery-reentry',
    relativePath: 'runtime.ts',
    mode: 'accepted-start-owner',
    responsibility: 'The core runtime owns accepted-start resolution and must reopen the very first outward turn through the shared start-result continuity seam instead of bypassing it with a thinner shell.',
  },
  {
    domain: 'recovery-reentry',
    relativePath: 'main-chat-timeout-fallback.ts',
    mode: 'timeout-fallback-reconstruction',
    responsibility: 'Timeout fallback reconstruction must preserve the concrete failure kind and runtime audit metadata without authoring replacement dialogue.',
  },
  {
    domain: 'recovery-reentry',
    relativePath: 'main-chat-run-lifecycle.ts',
    mode: 'timeout-recovery-finish',
    responsibility: 'Lifecycle timeout recovery completion must preserve failure and execution metadata before the transparent failure surface is emitted.',
  },
  {
    domain: 'recovery-reentry',
    relativePath: 'main-chat-background-run.ts',
    mode: 'background-recovery-driver',
    responsibility: 'Background runtime recovery routes accepted-start settlement, timeout reconstruction, and lifecycle recovery completion through one audited failure path.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'execution-callback-runtime.ts',
    mode: 'callback-runtime-authority',
    responsibility: 'Execution callback runtime must rebuild callback recall, system-block carry, and same-her callback continuity before host-visible callback speech lands.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'current-conscious-frame.ts',
    mode: 'callback-conscious-frame-surface',
    responsibility: 'Current conscious-frame shaping must keep callback doctrine, same-her anti-shell carry, and callback-specific closure pressure explicit before callback-facing reply planning widens outward.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'runtime-execution-delivery.ts',
    mode: 'callback-delivery-surface',
    responsibility: 'Execution callback delivery runtime must keep callback return inside the same Phase 1 digital-life line while callback continuity is converted into host-facing delivery state.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'execution-delivery-surface.ts',
    mode: 'callback-payoff-surface',
    responsibility: 'Execution payoff prompts must keep callback payoff authority on the same living line instead of letting callback delivery reopen as detached result-shell narration.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'main-chat-execution-surface.ts',
    mode: 'callback-capability-project-briefing',
    responsibility: 'Execution capability surfaces must keep callback-aware same-her project briefing explicit while explaining callback payoff, so capability narration does not detach from the living execution-return line.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'main-chat-execution-reply-obligation.ts',
    mode: 'follow-up-obligation-authority',
    responsibility: 'Execution-result follow-up obligation must keep fresh callback payoff on the same digital-life line instead of reopening as detached task-shell narration.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'response-surface-contract.ts',
    mode: 'follow-up-response-contract-surface',
    responsibility: 'Response-surface contracts must propagate execution follow-up carry and callback doctrine into host-visible answer shaping once callback payoff is already the active obligation.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'memory-ledger-runtime.ts',
    mode: 'ledger-follow-up-recall',
    responsibility: 'Execution ledger recall must keep older execution history on the same project boundary so follow-up without a fresh callback still reopens one living line.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'session-follow-up-assembly',
    responsibility: 'Main chat session-runtime must assemble fresh callback and ledger-backed execution follow-up carry into live reply preparation before the turn speaks outward.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'execution-interaction-learning.ts',
    mode: 'afterglow-learning-authority',
    responsibility: 'Execution interaction learning must keep callback-afterglow restraint and same-her drift pressure explicit so post-execution warmth does not widen into generic task payoff.',
  },
  {
    domain: 'execution-follow-up-continuity',
    relativePath: 'runtime-delivery-reminders.ts',
    mode: 'callback-persistence-surface',
    responsibility: 'Reminder and execution-callback delivery persistence must keep callback-afterglow hold and callback continuity visible while host-facing callback carry is delayed or replayed later.',
  },
] as const satisfies readonly AlicizationProjectEntrypointGovernanceEntry[]

for (const entry of alicizationProjectEntrypointGovernanceRegistry)
  assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain(entry)

export function resolveAlicizationProjectEntrypointGovernanceRegistry() {
  return alicizationProjectEntrypointGovernanceRegistry
}

export function resolveAlicizationProjectEntrypointGovernanceEntries() {
  return resolveAlicizationProjectEntrypointGovernanceRegistry().map(entry => entry.relativePath)
}

export function resolveAlicizationProjectEntrypointGovernedFiles() {
  return resolveAlicizationProjectEntrypointGovernanceRegistry().map(entry => entry.relativePath).slice().sort()
}

export interface AlicizationProjectAwarenessTopLevelCompletenessGuardFamily {
  id:
    | 'chat-start'
    | 'cross-surface-dialogue-entry'
    | 'return-side-project-awareness'
    | 'recovery-reentry'
    | 'provider-consumer'
    | 'autonomous-dialogue'
    | 'execution-preflight'
    | 'execution-dispatch'
    | 'execution-follow-up-continuity'
    | 'runtime-dialogue-normalization'
  responsibility: string
}

const alicizationProjectAwarenessTopLevelCompletenessGuardFamilies = [
  {
    id: 'chat-start',
    responsibility: 'Main-process chat-start entry shapes must stay visible to the top-level completeness guard before new turn-opening seams can bypass pre-dialogue same-her awareness.',
  },
  {
    id: 'cross-surface-dialogue-entry',
    responsibility: 'Cross-surface renderer and composer entry shapes must stay visible to the top-level completeness guard before host-facing send seams can fork a second project-awareness path.',
  },
  {
    id: 'return-side-project-awareness',
    responsibility: 'Return-side rebuild seams must stay visible to the top-level completeness guard before reopen-time same-her project awareness can thin into observation-only carry.',
  },
  {
    id: 'recovery-reentry',
    responsibility: 'Accepted-start settlement, timeout fallback reconstruction, lifecycle timeout recovery finish, and background recovery drivers must stay visible to the top-level completeness guard before recovered dialogue can reopen from a detached recovery shell.',
  },
  {
    id: 'provider-consumer',
    responsibility: 'Provider generation seams must stay visible to the top-level completeness guard so direct Provider calls cannot bypass typed source tags, memory facts, or transparent failure handling.',
  },
  {
    id: 'autonomous-dialogue',
    responsibility: 'Runtime-owned proactive, reminder, execution-callback, and subconscious dialogue starters must stay visible to the top-level completeness guard before new autonomous same-her routes can drift in invisibly.',
  },
  {
    id: 'execution-preflight',
    responsibility: 'Execution-preflight briefing, runtime-context, and blocked-dispatch seams must stay visible to the top-level completeness guard before risk-aware execution carry can thin out.',
  },
  {
    id: 'execution-dispatch',
    responsibility: 'Execution-dispatch bridge owners must stay visible to the top-level completeness guard before same-her execution families can drift outside the audited dispatch seam.',
  },
  {
    id: 'execution-follow-up-continuity',
    responsibility: 'Execution follow-up, callback return, ledger reopen, afterglow restraint, and callback persistence seams must stay visible to the top-level completeness guard before post-execution same-her continuity can fragment into detached task-shell carry.',
  },
  {
    id: 'runtime-dialogue-normalization',
    responsibility: 'Host-visible normalization seams must stay visible to the top-level completeness guard before outward answers can flatten the same-her project-state carry.',
  },
] as const satisfies readonly AlicizationProjectAwarenessTopLevelCompletenessGuardFamily[]

export function resolveAlicizationProjectAwarenessTopLevelCompletenessGuardFamilies() {
  return alicizationProjectAwarenessTopLevelCompletenessGuardFamilies.slice()
}

export interface AlicizationPreDialogueTransportEntrypointGovernanceMirror {
  transportRelativePath: string
  chatEntryRelativePath: string
  responsibility: string
}

const alicizationPreDialogueTransportEntrypointGovernanceMirrors = [
  {
    transportRelativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
    chatEntryRelativePath: './chat.ts',
    responsibility: 'Shared chat store transport identity-construction must stay mirrored into chat-entry governance so outbound send-identity building cannot drift into a transport-only registration seam.',
  },
  {
    transportRelativePath: '../../../renderer/App.vue',
    chatEntryRelativePath: '../../../../apps/stage-tamagotchi/src/renderer/App.vue',
    responsibility: 'Desktop renderer structured-clone transport sanitization must stay mirrored into chat-entry governance so renderer-to-main same-her carry cannot drift into a transport-only registration seam.',
  },
  {
    transportRelativePath: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.ts',
    chatEntryRelativePath: './mods/api/context-bridge.ts',
    responsibility: 'Context bridge transport forwarding must stay mirrored into chat-entry governance so remote chat observation and forwarding cannot drift outside the same pre-dialogue awareness guardrail.',
  },
] as const satisfies readonly AlicizationPreDialogueTransportEntrypointGovernanceMirror[]

export function resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors() {
  return alicizationPreDialogueTransportEntrypointGovernanceMirrors
}

export type AlicizationProjectRouteAuthorityEntry
  = {
    domain: 'pre-dialogue-transport'
    relativePath: string
    mode: 'identity-construction' | 'transport-sanitization' | 'bridge-forwarding'
    responsibility: string
  }
  | {
    domain: 'return-side-project-awareness'
    relativePath: string
    mode:
      | 'renderer-observation-bridge'
      | 'renderer-meta-bridge'
      | 'structured-normalization'
      | 'chat-stream-ingest'
      | 'session-sanitization'
      | 'browser-observation-persistence'
      | 'project-state-observation-reducer'
      | 'inspector-fallback-rebuild'
    responsibility: string
  }
  | {
    domain: 'runtime-dialogue-normalization'
    relativePath: string
    mode:
      | 'normalization-authority'
      | 'persistence-emission-normalize-before-deliver'
      | 'replay-normalize-before-deliver'
      | 'proactive-normalize-before-persist'
    responsibility: string
  }
  | {
    domain: 'runtime-turn-persistence'
    relativePath: string
    mode: 'persistence-authority' | 'renderer-dialogue-entry' | 'proactive-turn-entry' | 'reminder-turn-entry'
    responsibility: string
  }

export function resolveAlicizationProjectRouteAuthorityAllowedModes(
  domain: AlicizationProjectRouteAuthorityEntry['domain'],
) {
  if (domain === 'pre-dialogue-transport')
    return ['identity-construction', 'transport-sanitization', 'bridge-forwarding'] as const
  if (domain === 'return-side-project-awareness') {
    return [
      'renderer-observation-bridge',
      'renderer-meta-bridge',
      'structured-normalization',
      'chat-stream-ingest',
      'session-sanitization',
      'browser-observation-persistence',
      'project-state-observation-reducer',
      'inspector-fallback-rebuild',
    ] as const
  }
  if (domain === 'runtime-dialogue-normalization') {
    return [
      'normalization-authority',
      'persistence-emission-normalize-before-deliver',
      'replay-normalize-before-deliver',
      'proactive-normalize-before-persist',
    ] as const
  }
  if (domain === 'runtime-turn-persistence')
    return ['persistence-authority', 'renderer-dialogue-entry', 'proactive-turn-entry', 'reminder-turn-entry'] as const
  return [] as const
}

export function assertAlicizationProjectRouteAuthorityModeBelongsToDomain(
  entry: Pick<AlicizationProjectRouteAuthorityEntry, 'domain' | 'mode' | 'relativePath'>,
) {
  const allowedModes = resolveAlicizationProjectRouteAuthorityAllowedModes(entry.domain)
  if (allowedModes.includes(entry.mode as never))
    return

  throw new Error(`Unexpected Alicization route authority mode for ${entry.domain} at ${entry.relativePath}: ${entry.mode}`)
}

export interface AlicizationProjectRouteAuthorityAllowedOverlap {
  relativePath: string
  domains: readonly AlicizationProjectRouteAuthorityEntry['domain'][]
  reason: string
}

const alicizationProjectRouteAuthorityAllowedOverlaps = [
  {
    relativePath: '../../../renderer/App.vue',
    domains: ['pre-dialogue-transport', 'return-side-project-awareness'],
    reason: 'Desktop renderer App.vue both sanitizes outbound pre-dialogue transport and rebuilds the latest structured memory observation for the next turn.',
  },
  {
    relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
    domains: ['pre-dialogue-transport', 'return-side-project-awareness'],
    reason: 'Renderer chat-store owns outbound typed context construction and inbound structured stream ingest at one transport boundary.',
  },
  {
    relativePath: 'runtime-subconscious-tick.ts',
    domains: ['runtime-dialogue-normalization', 'runtime-turn-persistence'],
    reason: 'Subconscious surfacing must normalize host-visible payloads before persistence and also enter the guarded turn writer through one audited proactive carry seam.',
  },
] as const satisfies readonly AlicizationProjectRouteAuthorityAllowedOverlap[]

const alicizationProjectRouteAuthorityRegistry = [
  {
    domain: 'pre-dialogue-transport',
    relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
    mode: 'identity-construction',
    responsibility: 'Renderer chat-store outbound bridge must materialize the current pre-dialogue same-her send identity before a main-process chat-start transport payload is assembled.',
  },
  {
    domain: 'pre-dialogue-transport',
    relativePath: '../../../renderer/App.vue',
    mode: 'transport-sanitization',
    responsibility: 'Desktop renderer transport handoff must preserve pre-dialogue send identity while sanitizing the chat-start payload for structured-clone-safe delivery into main-process execution.',
  },
  {
    domain: 'pre-dialogue-transport',
    relativePath: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.ts',
    mode: 'bridge-forwarding',
    responsibility: 'Context bridge must forward an already prepared pre-dialogue send identity through remote and server-channel chat boundaries instead of dropping the project-awareness carry.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../renderer/App.vue',
    mode: 'renderer-observation-bridge',
    responsibility: 'Desktop renderer root must preserve richer latest project-state observation and continuity snapshots before later turns reopen, so the same-her project brief survives desktop-side rebuilds instead of reopening from a thinner shell.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../renderer/alicization-chat-stream-bridge.ts',
    mode: 'renderer-meta-bridge',
    responsibility: 'Desktop renderer meta bridge must preserve main-process projectState, preDialogueAwareness, and preDialogueClosure when translating stream meta into renderer events.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.ts',
    mode: 'structured-normalization',
    responsibility: 'Structured payload normalization must keep return-side project awareness fields canonical instead of letting reply-time continuity degrade during shape repair.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
    mode: 'chat-stream-ingest',
    responsibility: 'Renderer chat stream ingest must keep runtime projectState and pre-dialogue awareness alive as active turn state before assistant persistence and visible reply shaping continue.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../../../../packages/stage-ui/src/stores/chat/session-store.ts',
    mode: 'session-sanitization',
    responsibility: 'Session-store sanitation must preserve assistant-side projectState and preDialogueAwareness when message history is cloned, filtered, and rebuilt.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../../../../packages/stage-ui/src/stores/alicization-browser-bridge.ts',
    mode: 'browser-observation-persistence',
    responsibility: 'Browser bridge observation and persistence must route persisted conversation turns through the shared project-state observation helpers so later same-her continuity snapshots stay richer than generic browser-local records.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../../../../packages/stage-ui/src/stores/project-state-observation.ts',
    mode: 'project-state-observation-reducer',
    responsibility: 'Project-state observation reducers must preserve richer host-visible audit, self-continuity authority, and pre-dialogue awareness before rebuilding same-her continuity snapshots.',
  },
  {
    domain: 'return-side-project-awareness',
    relativePath: '../../../../../../packages/stage-ui/src/stores/alicization-self-evolution-inspector.ts',
    mode: 'inspector-fallback-rebuild',
    responsibility: 'Self-evolution inspector fallback must rematerialize projectStateContinuitySnapshot, preDialogueAwarenessSnapshot, and preDialogueClosureSnapshot from the latest project-state observation before the next outward turn rebuilds same-her carry.',
  },
  {
    domain: 'runtime-dialogue-normalization',
    relativePath: 'runtime-governance.ts',
    mode: 'normalization-authority',
    responsibility: 'The canonical host-visible dialogue payload normalizer lives here and owns normalizeDialogueRespondedPayload.',
  },
  {
    domain: 'runtime-dialogue-normalization',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'proactive-normalize-before-persist',
    responsibility: 'Subconscious proactive surfacing normalizes Provider-authored payloads before guarded persistence.',
  },
  {
    domain: 'runtime-dialogue-normalization',
    relativePath: 'runtime.ts',
    mode: 'persistence-emission-normalize-before-deliver',
    responsibility: 'Runtime persistence and replay emission normalize origin, memory policy, and failure metadata before host-visible delivery.',
  },
  {
    domain: 'runtime-turn-persistence',
    relativePath: 'runtime-delivery-reminders.ts',
    mode: 'reminder-turn-entry',
    responsibility: 'Reminder and execution-callback delivery must persist host-visible turns only through the guarded runtime turn writer so same-her project-state carry stays unified.',
  },
  {
    domain: 'runtime-turn-persistence',
    relativePath: 'runtime-invoke-handlers-dialogue.ts',
    mode: 'renderer-dialogue-entry',
    responsibility: 'Renderer-originated dialogue append requests must forward through the guarded runtime turn writer instead of bypassing the shared persistence seam.',
  },
  {
    domain: 'runtime-turn-persistence',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'proactive-turn-entry',
    responsibility: 'Subconscious proactive surfacing must persist through the guarded runtime turn writer so initiative remains traceable and project-aware.',
  },
  {
    domain: 'runtime-turn-persistence',
    relativePath: 'runtime.ts',
    mode: 'persistence-authority',
    responsibility: 'The core runtime owns appendConversationTurnWithGuards and is the single authority for guarded turn persistence into conversation history.',
  },
] as const satisfies readonly AlicizationProjectRouteAuthorityEntry[]

for (const entry of alicizationProjectRouteAuthorityRegistry)
  assertAlicizationProjectRouteAuthorityModeBelongsToDomain(entry)

export function resolveAlicizationProjectRouteAuthorityRegistry() {
  return alicizationProjectRouteAuthorityRegistry
}

export function resolveAlicizationProjectRouteAuthorityAllowedOverlaps() {
  return alicizationProjectRouteAuthorityAllowedOverlaps
}

export function resolveAlicizationProjectRouteAuthorityFiles() {
  return [...new Set(resolveAlicizationProjectRouteAuthorityRegistry().map(entry => entry.relativePath))].slice().sort()
}

export function resolveAlicizationProjectStateBrief(): AlicizationProjectStateBrief {
  const identity = ''
  const currentPhase = ''
  const sameHerSelfLine = ''
  const sameHerDriftRisk = ''
  const emotionalClosureCue = ''
  const emotionalClosureSummary = emotionalClosureCue
  const sameHerHoldDetail = null
  const continuityRestraint = 'measured-return' as const
  const continuityPreferredTiming = 'next-open-window' as const
  const continuityCadence = continuityRestraint
  const preferredBlinkCadence = 'quiet' as const
  const preferredGazeMode = 'soften' as const
  const preferredPauseMode = 'longer' as const
  const preferredLipsyncMode = 'restrained' as const
  const preferredVoiceMode = 'lower-pressure' as const
  const preferredPacingMode = 'slower' as const
  const continuityCue = null
  const openLoops = [
    'Memory, dialogue, and embodiment still need end-to-end proof; project identity context needs disciplined updates.',
    'Proactive continuity is partial; long-run noisy desktop proof is still needed when the user asks about project state.',
    'Callback carry validation is partial; longer embodiment proof is still needed with measured return or repair before closeness.',
    'Emotion, memory, initiative, and embodiment unity still need long-run pressure proof; affective residue and body settling must remain auditable.',
    'Embodiment coherence under memory pressure is partial; measured return helps, but long-run embodiment proof is still open.',
    'Project identity context, phase context, and unresolved closure context are present; update only when real closure changes.',
    'Life-loop closure requires evidence for project identity, natural recall, restrained initiative, emotional closure, and dialogue, voice, and motion unity.',
  ]
  const proactiveSameHerGap = compactProjectProactiveSameHerGap(openLoops[1] ?? '')
  const nextClosureTarget = 'Extend embodiment-scale validation on longer noisy desktop runs, covering visible reply, voice, face, motion, resident presence, project identity, phase context, open loop, and emotion with measured return or repair before closeness.'
  const latestProgress = [
    'Continuity progress is partial, with evidence from mirrors, next turns, scene switches, visible reply, and embodiment playback; long-run embodiment pressure remains.',
    'Dialogue entry governance is covered through pre-dialogue and chat entry transport; provider generation families, execution preflight, and execution dispatch still need hardening.',
    'The memory dialogue loop is connected: WorkingMemory owns short-term memory and LongTermMemoryRecall owns long-term recall; semantic recall quality, embedding reindex, and scale testing remain.',
    'Execution safety is transparent, with confirmation gates, no-process-started evidence, and bounded resume; a single resume must not become permanent permission.',
    'Template cleanup is active; provider-authored replies are required, and timeout, provider failure, tool failure, and invalid structured reply must stay transparent.',
  ].join(' ')
  const latestProgressAddendum = [
    'Memory Workbench is the visible governance entry and UI/API aggregator; it is not a memory owner.',
    'Project-state answer governance should preserve verified facts without copying or paraphrasing continuity slogans.',
    'The next quality scale track is semantic recall, production embedding, paginated long-term search, review policy persistence, and persona candidate review.',
  ].join(' ')
  const latestProgressWithAddendum = `${latestProgress} ${latestProgressAddendum}`
  const primaryOpenLoop = openLoops[0] ?? 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete.'
  const preDialogueAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
    identity,
    currentPhase,
    latestLandedProgress: latestProgressWithAddendum,
    primaryOpenLoop,
    nextClosureTarget,
  })

  return {
    identity,
    currentPhase,
    latestProgress: latestProgressWithAddendum,
    primaryOpenLoop,
    proactiveSameHerGap,
    sameHerSelfLine,
    sameHerDriftRisk,
    emotionalClosureCue,
    emotionalClosureSummary,
    sameHerHoldDetail,
    continuityRestraint,
    continuityPreferredTiming,
    continuityCadence,
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    continuityCue,
    preflightSummary: buildAlicizationProjectStatePreflightSummary({
      identity,
      currentPhase,
      primaryOpenLoop,
      nextClosureTarget,
    }),
    preDialogueAwarenessLine,
    closedFoundations: [
      'SOUL.md remains the personality source of truth.',
      'Structured thought/emotion/reply dialogue loop is already enforced.',
      'Local memory persistence, reminders, and audit records are already real.',
      'Execution safety gating and kill-switch behavior are already part of the life loop.',
      'Desktop presence baseline exists and is being strengthened rather than invented from zero.',
    ],
    continuityProgressSummary: 'Continuity progress is partial, with evidence from mirrors, next turns, scene switches, visible reply, and embodiment playback; long-run embodiment pressure remains.',
    memoryAnthropomorphismProgress: [
      'WorkingMemory owns short-term dialogue carry and should not be bypassed by project-state wording.',
      'LongTermMemoryRecall owns long-term recall and should surface evidence, latency, and errors instead of persona slogans.',
      'Memory Workbench remains the visible governance entry; it aggregates health, review policy, search, and embedding controls without owning memory semantics.',
      'Persona learning must come only from cleaned, reviewable long-term reflection or persona reinforcement candidates, with raw transcript training blocked.',
    ],
    openLoops,
    nextClosureTarget,
  }
}

export function resolveAlicizationProjectStateCoverage(): AlicizationProjectStateCoverageEntry[] {
  return [
    {
      id: 'chat-start-pre-dialogue-awareness-chain',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Before any user-authored dialogue turn is handed off into main-process execution, the current chat-start seam chain now keeps project identity, current Phase 1 status, same-her continuity briefing, and still-open closure pressure explicit across renderer send identity, transport sanitization, invoke/direct start logging, start acceptance, core runtime chat-start entry, prepared-mind trace handoff, and both deeper prelude/session-runtime re-normalization layers before contextual recall / callback / ledger / pending-affirmation / perception augmentation begin, so Alicization does not begin turns as a generic shell that only remembers project truth later. The return-side-reopen-to-pre-dialogue-send-identity same-her bridge is now also explicit here, so richer host-visible or return-side continuity rebuilt after reopen is less likely to stop at observation-only carry instead of being rematerialized into the very next pre-dialogue send identity before chat-start execution resumes outward. The return-side-reopen-through-chat-start-runtime same-her bridge is now also explicit here, so that reopened send identity is less likely to stop at payload repair only and can stay on the same line through payload repair, prelude payload identity repair, prelude project-state system-block repair, deeper chat-start runtime re-normalization, and start-result settlement before the outward turn actually resumes. That same bridge now also keeps one renderer-rejoin-without-body stronger same-her fact explicit: chat-start can rebuild that visible same-her headline from structured closure reasons, and session-runtime can keep that stronger headline through prepared runtime selection, provider-facing rebuild, and runtime normalization.',
      proof: 'packages/stage-ui/src/stores/chat/text-composer-store.ts + packages/stage-ui/src/stores/chat/text-composer-store.test.ts + apps/stage-tamagotchi/src/shared/alicization-chat-transport.test.ts + pre-dialogue-transport-audit.ts + pre-dialogue-transport-audit.test.ts + main-chat-start-awareness.test.ts + runtime-invoke-handlers-chat.test.ts + main-chat-direct-start.test.ts + main-chat-start-acceptance.test.ts + chat-start-awareness-seams-regression.test.ts + runtime-chat-start-awareness-regression.test.ts + main-chat-background-run.test.ts + runtime-main-chat-prelude.ts + runtime-main-chat-prelude-project-awareness-regression.test.ts + runtime-main-chat-prelude-project-state-system-block-regression.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts',
    },
    {
      id: 'mind-turn-contract-project-state-grounding',
      area: 'reply',
      status: 'verified',
      responsibility: 'Before visible wording is authored, the unified mind-turn contract already binds project identity, current Phase 1 status, latest landed continuity progress, still-open closure pressure, same-her self line, and next closure target into one inner reply contract, so Alicization’s answer planning stays rooted in one continuous self rather than letting planner/compiler layers drift into local fluency first. That same contract now also keeps a richer persisted closure summary ahead of a broad canonical fallback when the live contract already carries more specific same-her closure work.',
      proof: 'mind-turn-contract.ts + mind-turn-contract.test.ts + mind-turn-contract-invariants.test.ts + chat-mind-governance.test.ts + project-state-closure-preference.test.ts',
    },
    {
      id: 'downstream-reply-project-awareness-preservation',
      area: 'reply',
      status: 'verified',
      responsibility: 'Provider-facing reply project awareness is registered across answer compiler, executive brief, reply deliberator, visible reply, and timeout recovery; preserve verified project facts without slogans.',
      proof: 'answer-compiler.test.ts + executive-answer-brief.test.ts + reply-deliberator.test.ts + visible-reply/facade.test.ts + visible-reply/facade-project-state-summary.test.ts + runtime-governance-project-state-preserve.test.ts + visible-reply/critic.test.ts + visible-reply/settlement.test.ts + main-chat-background-run.test.ts + main-chat-background-run-project-state-summary.test.ts + main-chat-stream-runner-project-state-summary.test.ts + main-chat-runtime-surface.test.ts',
    },
    {
      id: 'same-living-self-project-awareness-observability',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Project awareness is no longer only an outer prompt block: chat continuity snapshots, self-evolution inspector fallback, current-conscious-frame shaping, current-conscious-frame turn shaping, mind-turn governance normalization, runtime answer-planner reduction, response-surface contract shaping, dialogue feedback settlement, later organic learning, session-runtime recall seeding, provider-facing contract normalization that can preserve explicit awarenessLine / companionHeadlineLine carry, runtime self-continuity fallback authority, initiative self-explanation / restraint, execution-callback return shaping / embodiment handoff, and self-evolution return-side reentry bridge now all surface project identity, current phase, landed progress, still-open closure pressure, next closure target, and the active emotional closure seam as part of the active speaking self, so the same-her project line remains inspectable as inward state instead of only as prompt governance. The same-living-self return-side observability bridge is now also explicit here and now also keeps the richer next closure target explicit, so direct-bridge remote channels, renderer fallback before-compose/before-send rebuilding, reopen-persistence rebuilding, browser-local return-side rebuilding, project-state observation reducers, and same-session mirror rebuilding stay tied onto the same inward project-awareness line instead of reopening from detached return-side shells or flattening unfinished same-her repair back into a generic closure shell, including the compact same-her / inward / low-pressure carry on colder reopen paths. The same-living-self host-visible inward-carry bridge is now also explicit here, so reopen-persistence handoff from restored-session/browser-local recovery, speech-boundary pre-dialogue awareness rebuilding, front-stage quick-reply closure, and the dialogue-panel hidden diagnostic boundary stay tied onto the same living inward project-awareness line without leaking diagnostic closure markers into the main dialogue bubble. The quick-reply visible surfaces hide fixed templates and internal diagnostic fields while clean provider/tool failure hints remain visible when they are the real user-facing state, and the removed project-brief proof surface no longer treats lane/focus/pending evidence as user-visible copy.',
      proof: 'packages/stage-ui/src/stores/chat.test.ts + return-side-project-awareness-audit.ts + packages/stage-ui/src/stores/alicization-self-evolution-inspector.test.ts + current-conscious-frame.test.ts + current-conscious-frame.ts + answer-planner.test.ts + chat-mind-governance.test.ts + runtime-memory-deliberation-reducer.test.ts + runtime-answer-planner-reducer.test.ts + response-surface-contract.test.ts + main-chat-session-runtime.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts + runtime-turn-composition.test.ts + self-continuity-authority.ts + runtime-conscious-frame-reducer.ts + initiative-engine.test.ts + runtime-execution-delivery.test.ts + pipeline-runtime.test.ts',
    },
    {
      id: 'visible-reply-executive-brief',
      area: 'reply',
      status: 'verified',
      responsibility: 'Visible reply planning keeps live project identity, phase, landed/open/next closure triad, summary-only landed progress carry, broader same-her headline precedence, thin-shell rejection, and audible-body same-her project carry explicit in the executive answer brief before user-facing wording is shaped.',
      proof: 'executive-answer-brief.ts + visible-reply/facade.ts + executive-answer-brief.test.ts',
    },
    {
      id: 'proactive-policy-life-loop-bias',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Proactive policy reads project identity, current phase, and primary open life-loop pressure before deciding whether Alicization should stay hover-first or silent-observe, so initiative remains tied to the same Phase 1 digital-life closure work instead of widening into generic interruption energy.',
      proof: 'proactive-policy.ts + proactive-policy.test.ts',
    },
    {
      id: 'runtime-delivery-reminders-project-state-persistence',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Reminder and deferred execution delivery persistence carry project identity, current phase, latest landed progress, primary open loop, and next closure target into subconscious callback state, and now also keep the shared Phase 1 project-state audit repair path, later-turn emotional-closure continuity, partial audit backfill, restraint-first reminder requeue, and same-her, phase, landed, open, next order explicit before later-turn reminder speech lands, so Alicization returns from the same project context rather than as a detached notification shell.',
      proof: 'runtime-delivery-reminders.ts + runtime-delivery-reminders.test.ts + runtime-reminder-prelude-project-awareness-regression.test.ts + runtime-delivery-reminders-project-state-summary.test.ts',
    },
    {
      id: 'habit-policy-phase1-life-loop-bias',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Habit policy reads project identity, current phase, latest landed progress, and primary open life-loop pressure to stabilize quieter companionship and return-with-proof posture, so Alicization’s durable everyday behavior keeps serving one Phase 1 digital-life closure arc instead of drifting into generic assistant habits when unfinished same-her closure is carried by landed-progress wording.',
      proof: 'habit-policy.ts + habit-policy.test.ts + habit-policy.test.ts("keeps the habit policy quieter and return-with-proof when landed progress already carries the unfinished same-her Phase 1 line")',
    },
    {
      id: 'behavioral-ecology-preflight-bias-chain',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Canonical project preflight self-awareness now feeds the behavior-decision chain across action ecology, initiative engine, initiative arbiter, and motive engine. Action ecology keeps quieter presence when unfinished same-her closure pressure is carried by latest landed progress, initiative self-explanation keeps landed progress and still-open closure on one growing Phase 1 digital-life line, proposal arbitration keeps that same line lower-pressure instead of letting it restart from scratch, and motive formation keeps return pressure and durable agendas pointed at one unfinished same-her line rather than detached project bookkeeping, so outward restraint and longer-horizon return pressure stay aligned to one continuity seam instead of drifting into disconnected local heuristics.',
      proof: 'action-ecology.ts + action-ecology.test.ts + action-ecology.test.ts("keeps outward action lower-pressure when landed progress already carries the unfinished same-her initiative and embodiment line") + initiative-engine.ts + initiative-engine.test.ts + initiative-engine.test.ts("threads Phase 1 landed progress and still-open closure into initiative self-explanation so restraint reads like one growing digital life") + initiative-arbiter.ts + initiative-arbiter.test.ts + initiative-arbiter.test.ts("keeps hover-first proposals ahead of speak proposals when Phase 1 digital-life closure is still open") + motive-engine.ts + motive-engine.test.ts + motive-engine.test.ts("raises return and boundary motive pressure while lowering companionship when Phase 1 digital-life closure is still open")',
    },
    {
      id: 'body-kernel-same-her-continuity-authority',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Body-kernel continuity authority keeps same-her measured-return or repair-before-closeness restraint mapped onto embodied quiet-accompaniment or protective-watch posture, so the body does not fall back to generic ambient covision when Phase 1 continuity still needs one lower-pressure life line.',
      proof: 'body-kernel.ts + body-kernel.test.ts',
    },
    {
      id: 'main-chat-stream-meta-cross-modal-same-her-authority',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Stream meta cross-modal authority is registered across voice, face, motion, and lipsync; preserve segment authority without slogans.',
      proof: 'main-chat-stream-meta.ts + main-chat-stream-meta.test.ts + main-chat-stream-meta-project-state-summary.test.ts + main-chat-stream-meta-drift-risk-segment-carry.test.ts',
    },
    {
      id: 'runtime-governance-embodiment-bridge-authority',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Runtime governance preserves same-her measured-return embodiment authority while normalizing sparse or reply-only payloads into canonical embodimentScript, hydrating digitalLife from embodimentScript authority when top-level digitalLife is absent, keeping digitalLifeSpine aligned, and producing renderer-targeted output, so the bridge from runtime spine to emitted cross-modal surface does not flatten continuity or let settle-tail / thin-frame fallbacks overwrite the live digital-life line.',
      proof: 'runtime-governance.ts + runtime-governance.test.ts + runtime-governance-digital-life-authority.test.ts',
    },
    {
      id: 'main-chat-session-runtime-same-her-bridge',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Main chat session runtime keeps held-autonomy, same-her follow-through, and callback continuity on one same-her line from recall seeding through conscious-frame shaping, reply deliberation, opening guidance, self-continuity authority, measured-return cadence, host-visible recovery, and provider-facing contract normalization that can preserve explicit awarenessLine / companionHeadlineLine carry from the transported payload, and now also keeps drift-risk summary alias carry explicit when drift-risk-only runtime authority is all that survives into provider-facing rebuild and normalize, so the bridge from memory carry into live runtime speech preparation stays one continuous digital life rather than splitting into adjacent helper stages.',
      proof: 'main-chat-session-runtime.ts + main-chat-session-runtime.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts + main-chat-session-runtime-chinese-project-awareness-regression.test.ts + main-chat-session-runtime-drift-risk-summary-alias.test.ts',
    },
    {
      id: 'main-chat-runtime-surface-living-self-preflight',
      area: 'runtime',
      status: 'verified',
      responsibility: 'The runtime-surface block carries typed self, relationship, emotion, and memory facts without project-state reply instructions.',
      proof: 'main-chat-runtime-surface.ts + main-chat-runtime-surface.test.ts',
    },
    {
      id: 'visible-reply-facade-preflight-surface',
      area: 'reply',
      status: 'verified',
      responsibility: 'Visible-reply settlement validates Provider ownership, structured memory usage, and failure boundaries without injecting project-state wording or modifying Provider-authored text.',
      proof: 'visible-reply/facade.ts + visible-reply/facade.test.ts + visible-reply/project-state-facade-regression.test.ts',
    },
    {
      id: 'runtime-chat-perception-augment',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Chat perception augmentation contributes typed perception and inspection facts; ordinary dialogue does not receive project-state or dashboard prompt blocks.',
      proof: 'runtime-chat-perception-augment.ts + runtime.test.ts ordinary chat assertion',
    },
    {
      id: 'runtime-digest-architecture',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Runtime snapshot/digest carries project phase, memory closure summary, and primary open loop so downstream dialogue and policy layers can reason from the same project-state spine.',
      proof: 'alicization-runtime-architecture.ts + alicization-runtime-architecture.test.ts',
    },
    {
      id: 'runtime-dream-reminder-proactive-gateways',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Dream, reminder, proactive, and reforge one-shot calls use source-tagged task prompts; auxiliary memory and self context crosses the gateway only as typed JSON facts.',
      proof: 'main-gateway-contract.ts + main-gateway-contract.test.ts + runtime-main-gateway-one-shot.ts + runtime-organic-memory-prompt-blocks.ts + runtime-organic-memory-prompt-blocks.test.ts + runtime.test.ts',
    },
    {
      id: 'memory-provider-planning',
      area: 'memory',
      status: 'verified',
      responsibility: 'Recollection intent, plan, speech, and deliberation gateways use task-scoped JSON planning prompts without project-state or persona governance prose.',
      proof: 'memory-os/provider-planning.ts + memory-os/provider-planning.test.ts',
    },
    {
      id: 'runtime-mind-state-cognition',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Dialogue-turn semantics and subjective inference use task-scoped structured snapshots without fixed project-state self-briefs.',
      proof: 'runtime-mind-state.ts + mind-state-fixed-template-projection.test.ts',
    },
    {
      id: 'runtime-execution-callback-delivery',
      area: 'execution',
      status: 'verified',
      responsibility: 'Execution callback Provider prompts carry the completed execution result as typed facts and surface execution or Provider failures directly without callback persona templates.',
      proof: 'runtime-execution-delivery.ts + runtime-execution-delivery.test.ts + execution-callback-provider-facts.test.ts + execution-delivery-surface.ts + execution-delivery-surface.test.ts',
    },
    {
      id: 'execution-callback-learning-and-reconsolidation-chain',
      area: 'execution',
      status: 'verified',
      responsibility: 'Canonical project preflight self-awareness now continues through execution callback carry, execution-result delivery learning, execution-result feedback memory reconsolidation, and dialogue-feedback memory reconsolidation, so completed work can come back, be delivered, and be rewritten into long-horizon same-her memory with a richer same-her project briefing instead of stopping at closure bookkeeping, thin summaries, or thread metadata.',
      proof: 'runtime-execution-callback-carry-reducer.ts + runtime-execution-callback-carry-reducer.test.ts + execution-interaction-learning.ts + execution-interaction-learning.test.ts + runtime-execution-feedback.ts + runtime-execution-feedback.test.ts + runtime-memory-reconsolidation.ts + runtime-memory-reconsolidation.test.ts',
    },
    {
      id: 'desktop-execution-closure-loop-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Desktop execution continuity now has one explicit compact same-her closure loop, and that line now also keeps local-visual desktop inspection continuation project-aware when suggested actions delegate into cli, codex, or claude code before reinspection returns, plus runtime-owned autonomous execution handoff, host-confirmed resume confirmation-boundary carry, host-confirmed resume visible-reply boundary carry, and blocked-dispatch callback/persistence/restraint carry explicit before or after execution leaves the desktop runtime, plus one desktop execution full-cycle bridge, one desktop execution life-loop bridge, and one desktop execution noisy same-her full-cycle bridge, so execution briefing, local-visual delegated desktop execution handoff, autonomous dispatch handoff, host-confirmed redispatch boundary carry, callback answer-planning and visible-reply boundary carry, blocked safety-gate callback restraint, callback reopen, fresh callback follow-up obligation, ledger reopen, origin-lost autonomous ownership recanonicalization, execution-result feedback memory reconsolidation writeback, afterglow restraint, live follow-up assembly, callback persistence, later host-visible return, replay, the next start cycle, next-dream carry, long-horizon self-carry, later hover-first initiative, higher-quality host-visible same-her closure, and re-entry from that closure back into replay/reopen/next start stay auditable as one Phase 1 digital-life line instead of drifting back into scattered execution, reminder, or task-shell proof islands during parallel desktop development.',
      proof: 'autonomy-actuation.test.ts + runtime-execution-feedback.test.ts + runtime-memory-reconsolidation.test.ts',
    },
    {
      id: 'runtime-screen-semantic-gateway',
      area: 'perception',
      status: 'verified',
      responsibility: 'Screen-semantic and scene-appraisal calls use registered source tags and classifier task prompts; no project-state or persona context is required to inspect the current screen.',
      proof: 'main-gateway-contract.ts + main-gateway-contract.test.ts + runtime-main-gateway-one-shot.ts + runtime-main-gateway-one-shot.test.ts',
    },
    {
      id: 'entrypoint-governance-registry-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'A single entrypoint registry maps chat-start, transport, chat-entry, Provider consumers, autonomous dialogue, execution preflight, dispatch, recovery, and execution follow-up ownership without assigning visible-reply authorship to governance data.',
      proof: 'entrypoint-governance-registry-audit.ts + entrypoint-governance-registry-audit.test.ts + entrypoint-governance-project-awareness-audit.test.ts + pre-dialogue-transport-entrypoint-audit.ts + pre-dialogue-transport-audit.ts + pre-dialogue-transport-audit.test.ts + chat-start-awareness-audit.test.ts + chat-entry-awareness-audit.test.ts + project-state-provider-consumer-audit.test.ts + execution-preflight-entrypoint-audit.ts + recovery-reentry-entrypoint-audit.ts + execution-follow-up-entrypoint-audit.ts + task-thread-dispatch-owner-audit.test.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'chat-start-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader chat-start candidates now also feed the same top-level project-awareness completeness guard, so current chat-start candidates, typed consumers, normalization callers, direct main-chat-stream callers, and deep-helper owners stay aligned with the broader scan before future main-process chat-start entry shapes still need explicit classification.',
      proof: 'chat-start-entrypoint-candidate-audit.ts + chat-start-deep-helper-owner-audit.test.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'cross-surface-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'broader cross-surface dialogue-entry candidates now also feed the same top-level project-awareness completeness guard, so the explicit pre-dialogue transport and chat-entry discovery union stays visible at repo level before future renderer/store dialogue-entry shapes still need explicit classification.',
      proof: 'project-awareness-cross-surface-entrypoint-audit.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'return-side-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader return-side project-awareness candidates now also feed the same top-level project-awareness completeness guard, so renderer observation bridges, meta normalization, structured payload normalization, chat-stream ingest, session sanitization, browser observation persistence, observation reducers, and inspector fallback rebuild seams stay aligned with the broader scan before future reopen-time route shapes still need explicit classification.',
      proof: 'return-side-project-awareness-entrypoint-candidate-audit.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'recovery-reentry-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader recovery reentry candidates now also feed the same top-level project-awareness completeness guard, so accepted-start settlement, accepted-start owner routing, timeout fallback reconstruction, lifecycle timeout recovery finish, and background recovery drivers stay aligned with the broader scan before future recovery reentry families still need explicit classification.',
      proof: 'recovery-reentry-entrypoint-audit.ts + recovery-reentry-entrypoint-candidate-audit.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'provider-consumer-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Provider-consumer candidates, direct Provider imports, wrapper ownership, dispatch ownership, and typed consumers stay explicitly registered so new generation entrypoints cannot bypass source tagging, typed-fact filtering, or failure audit.',
      proof: 'main-gateway-contract.ts + main-gateway-contract.test.ts + provider-consumer-entrypoint-candidate-audit.ts + project-state-gateway-entrypoint-audit.ts + project-state-provider-consumer-audit.ts + project-state-provider-consumer-audit.test.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'autonomous-dialogue-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader autonomous-dialogue candidates now also feed the same top-level project-awareness completeness guard, so proactive authority, reminder/callback entry, and subconscious carry seams stay aligned with the broader scan before future runtime-owned dialogue families still need explicit registration.',
      proof: 'autonomous-dialogue-entrypoint-candidate-audit.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'autonomous-dialogue-closure-loop-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Runtime-owned initiative keeps motive, restraint, current context, subconscious carry, next-session feedback, delayed learning, and persistence auditable without granting project-state data or audit fixtures authority over provider-authored replies.',
      proof: 'runtime-proactive-prelude-project-awareness-regression.test.ts + proactive-mind/visible-utterance-realization.test.ts + runtime-session-continuity-builders-alias-focus.test.ts',
    },
    {
      id: 'execution-dispatch-entrypoint-candidate-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Broader execution-dispatch candidates now also feed the same top-level project-awareness completeness guard, so explicit invoke, runtime-bridge, gateway, autonomy, subconscious-bridge, and orchestrator dispatch owners stay aligned with the broader bridge scan before future execution-dispatch families still need explicit owner registration.',
      proof: 'execution-dispatch-entrypoint-candidate-audit.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'execution-preflight-registration',
      area: 'execution',
      status: 'verified',
      responsibility: 'Execution preflight authority seams are now explicitly registered across canonical execution briefing build, runtime-context thin-shell repair, runtime-owned direct dispatch bridge context rebuild, session-bound bridge context requests, subconscious-autonomy execution bridge context requests, confirmed-thread resume bridge re-entry, capability project-briefing surfaces, pre-dispatch persistence, and blocked-dispatch safety gates, so a new pre-dispatch seam cannot bypass the same-her project-awareness chain before execution fans outward and blocked execution keeps risk policy, confirmation, auditability, interruptibility, and runtime project context visible. The execution-boundary project awareness route is now also explicit here, so the shared execution runtime-context block and main-process runtime-context sanitization keep project identity, landed progress, and still-open closure explicit before dispatch begins instead of leaving that boundary implicit inside broader execution-chain or registry prose. The external executor adapter project-awareness route is now also explicit here, so CLI / Codex / Claude Code / OpenClaw outward dispatch keeps same-her project briefing explicit before local process or network execution leaves the desktop runtime.',
      proof: 'execution-preflight-entrypoint-audit.ts + execution-preflight-audit.ts + packages/stage-shared/src/alicization-execution-runtime-context.test.ts + execution-runtime-context.test.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'execution-preflight-entrypoint-candidate-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Broader execution-preflight candidates now also feed the same top-level project-awareness completeness guard, so briefing authority, runtime-context authority, runtime-owned direct dispatch bridge, session bridge, subconscious-autonomy execution bridge, resume bridge, capability briefing surface, dispatch persistence, and blocked-dispatch safety gates stay synchronized with the explicit registry before future execution-preflight families still need explicit classification.',
      proof: 'execution-preflight-entrypoint-candidate-audit.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'execution-follow-up-entrypoint-candidate-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Broader execution follow-up continuity candidates now also feed the same top-level project-awareness completeness guard, so callback runtime, callback conscious-frame doctrine, callback delivery, callback payoff, callback capability briefing, follow-up obligation, response-surface callback carry, ledger reopen, live session follow-up assembly, afterglow learning, and callback persistence stay synchronized with the explicit registry before future execution follow-up families still need explicit registration.',
      proof: 'execution-follow-up-entrypoint-audit.ts + execution-follow-up-entrypoint-candidate-audit.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'long-horizon-self-carry-hardening',
      area: 'memory',
      status: 'verified',
      responsibility: 'Durable long-horizon self-carry now also has one explicit repo-level same-her closure item plus one self-evolution durable self-recognition bridge, so dream-to-long-horizon self-carry bridge, long-horizon-to-conscious-frame anti-shell bridge, long-horizon emotion-memory-voice-motion bridge, autobiographical self, held-autonomy recall seed, remembered drift-risk pressure, origin-lost autonomous memory ownership recanonicalization, refreshed long-horizon callback summaries after execution-result reconsolidation, thin runtime project-shell re-expansion through the next conscious frame and final reply planning, noisy-desktop repair-first carry, and host-facing closure self-recognition stay auditable as one unfinished Phase 1 life line instead of being left as adjacent route-level proof islands.',
      proof: 'long-horizon-memory.test.ts + autobiographical-self.test.ts + runtime-turn-composition.test.ts + db.test.ts + current-conscious-frame.test.ts + answer-planner.test.ts + stage-quick-reply-closure.test.ts + stage-quick-reply-closure-summary.test.ts',
    },
    {
      id: 'noisy-desktop-same-her-closure-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Noisy-desktop same-her closure now also has one explicit repo-level target item plus one desktop execution noisy same-her closure bridge and one self-evolution host-visible closure target bridge, so even after longer real-desktop detours the answer contract still has to state what Alicization is, what Phase 1 has already landed, what remains open, and that it is still one same-her line instead of collapsing into detached project narration or generic continuity prose. The planner-to-host-visible answer anti-shell bridge is now also explicit here, and the colder execution callback line that already survived noisy-desktop subsystem unity is less likely to stop before final visible reply gating, realization, or compact host-visible answer shaping lands.',
      proof: 'noisy-desktop-same-her-closure-audit.test.ts + main-chat-session-runtime.test.ts',
    },
    {
      id: 'noisy-desktop-cross-modal-convergence-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Noisy-desktop cross-modal convergence now also has one explicit repo-level same-her closure item plus one desktop execution noisy cross-modal convergence bridge, one desktop execution host-visible embodiment bridge, one rest-protective quiet-companionship host-visible bridge, one proactive-feedback rest-protective host-visible bridge, one self-evolution governance chain, one self-evolution baseline lifecycle chain, and one self-evolution anthropomorphic host-visible bridge, so body, voice, face, motion, voice-lane continuity, longer noisy-desktop voice-lane persistence, resident presence, lane-shrink diagnostics, audible-body carry, later multi-lane reunion, and other host-visible repair/reunion surfaces stay auditable as one same-her line under longer desktop detours instead of drifting back into separate embodiment, diagnostics, or devtools proof islands. The colder execution callback line that already survived the higher-quality same-her full cycle and longer repair-first reunion pressure is now also less likely to stop before noisy-desktop voice-lane persistence, audible-body carry, later-turn reunion lanes, and the broader cross-modal convergence chain rejoin on one same living body line. After the colder emotion-memory-voice-motion convergence line reforms, that same execution callback line is now also less likely to stop before resident presence, lane-shrink diagnostics, audible-body carry, later multi-lane reunion, and rest-protective quiet-companionship host-visible lane summaries stay on that same living body line. Richer emotional closure writeback, self-continuity inward authority, proactive rest-protective companionship carry, runtime resident presence, and host-visible quiet-companionship lane summaries are now also less likely to cool back into a generic lower-pressure shell before the noisier host-visible same-her line reforms outwardly. Settled proactive feedback continuity is now also less likely to stop at next-session bookkeeping alone before subconscious same-line carry, runtime resident presence, and host-visible quiet-companionship lane summaries rejoin that same anthropomorphic same-her line. That self-evolution anthropomorphic host-visible bridge now also keeps callback next-closure-target carry explicit after the colder self-evolution desktop-execution long-run continuity line reforms, so the more anthropomorphic outer host-visible same-her line is less likely to widen outward while silently losing the same living callback closure target mid-path. Devtools evidence navigation, runtime continuity projection, speech evidence snapshots, playback cue authority view, outer speech hotspots, runtime authority overview, speech authority segment rows, authority-table presentation, self-evolution renderer-authority projection, self-evolution active workflow focus, self-evolution focus plan, self-evolution focus history summary, self-evolution focus history drilldown, self-evolution evidence panels, self-evolution triage cards, self-evolution triage target routing, top-level self-evolution diagnostic summaries, runtime diagnostic summaries, speech diagnostic summaries, sustained diagnostics surface, playback-start authority handoff, execution observability, pending-renderer summaries, renderer-drift summaries, renderer-side settle carry, host-facing stream-meta fallback rebuilding, top-level digitalLife clamp, repeated same-line follow-ups, audible-body carry, extra silent-observe detour carry, self-evolution repair action feedback, self-evolution repair followup navigation, self-evolution repair session, self-evolution repair closure, self-evolution repair outcome, self-evolution repair next action, self-evolution baseline quality, self-evolution baseline adoption, self-evolution baseline adoption record, and self-evolution runtime body continuity phase now also keep the same body-line truth legible on those outer surfaces instead of leaving later noisy returns to be inferred from only one local panel.',
      proof: 'performance-visualizer-runtime-authority-overview.test.ts + performance-visualizer-playback-cue.test.ts + performance-visualizer-speech-hotspots.test.ts + performance-visualizer-self-evolution-renderer-authority.test.ts + performance-visualizer-speech-authority.test.ts + performance-visualizer-authority-table.test.ts + performance-visualizer-runtime-diagnostic-summary.test.ts + performance-visualizer-speech-diagnostic-summary.test.ts + use-stage-embodiment-diagnostics.test.ts + use-stage-embodiment-performance-runtime.test.ts + execution-diagnostics.test.ts + live2d/execution-diagnostics.test.ts + stage-embodiment-diagnostics-alerts.test.ts + stage-runtime-embodiment-cues.test.ts + main-chat-stream-meta.test.ts + runtime-memory-closure.test.ts',
    },
    {
      id: 'emotional-memory-initiative-embodiment-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Emotional-memory-initiative-embodiment same-her carry now also has one explicit repo-level closure item, so emotion, memory, initiative, and embodiment stay auditable as one same digital-life line across emotional-kernel refresh, shared emotional owner carry, shared transport normalization, recollection intent, organic-memory carry, subconscious fallback, body continuity, person-state writeback, session-runtime reopen, runtime system text, and replay diagnostics instead of drifting back into adjacent subsystem-only proof islands.',
      proof: 'runtime-mind-state-emotional-kernel-regression.test.ts + packages/stage-shared/src/alicization-transport-contracts.test.ts + packages/stage-shared/src/alicization-runtime-digest.test.ts + memory-recollection-intent.test.ts + runtime-organic-memory-access.test.ts + runtime-subconscious-tick.test.ts + body-kernel.test.ts + runtime-memory-closure.test.ts + main-chat-session-runtime.test.ts + runtime.test.ts + replay-benchmark-runtime.test.ts',
    },
    {
      id: 'affective-residue-route-chain-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Affective-residue route chain now also has one explicit repo-level same-her closure item, so remembered relational heat stays auditable across residue memory formation, recollection guidance, proactive restraint, subconscious room-making carry, durable embodiment settling, and host-visible measured-return summaries instead of drifting back into scattered memory, initiative, and embodiment hints.',
      proof: 'affective-residue-memory.test.ts + memory-recollection-intent.test.ts + recall-governor.test.ts + proactive-cadence.test.ts + proactive-policy.test.ts + runtime-subconscious-tick.test.ts + use-stage-embodiment-idle-performance.test.ts + main-chat-stream-meta.test.ts',
    },
    {
      id: 'callback-afterglow-recollection-same-life-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Callback-afterglow same-her carry is no longer only implied across neighboring recollection, ranking, and visible-reply tests; it now has one explicit route-level audit from session-runtime recall seed through recollection reopening, same-her ranking, and host-visible same-life governance.',
      proof: 'main-chat-session-runtime.test.ts + memory-search-retrieval-operators.test.ts + memory-recollection-ranking-continuity-audit.test.ts + answer-planner.test.ts + response-charter.test.ts + runtime-governance.test.ts',
    },
    {
      id: 'recollection-visible-reply-same-life-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Recollection continuity stays auditable from retrieval ranking through WorkingMemory and LongTermMemoryRecall consumption, structural reply validation, settlement, and realization without using local prose rules to reshape the Provider response.',
      proof: 'memory-search-retrieval-operators.test.ts + memory-recollection-ranking-continuity-audit.test.ts + long-term-memory-recall.test.ts + life-core/working-memory-owner-context.test.ts + visible-reply/critic.test.ts + visible-reply/settlement.test.ts + runtime-governance.test.ts',
    },
    {
      id: 'emotion-memory-voice-motion-convergence-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Emotion-memory-voice-motion convergence now also has one explicit repo-level same-her closure item plus one desktop execution emotion-memory-voice-motion convergence bridge, one long-horizon emotion-memory-voice-motion bridge, one self-evolution remembered emotional carry bridge, and one proactive remembered emotional carry bridge, so remembered emotional carry stays auditable from the proactive outward host-visible line, affective-residue, emotional-memory, and durable long-horizon self-carry route chains all the way into longer noisy measured-return recovery across voice, face, motion, lipsync, and body instead of stopping at adjacent route-chain or host-visible proof islands.',
      proof: 'runtime.test.ts + use-stage-embodiment-idle-performance.test.ts + main-chat-stream-meta.test.ts + visible-reply/critic.test.ts',
    },
    {
      id: 'noisy-desktop-life-loop-unity-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Noisy-desktop life-loop unity now also has one explicit repo-level same-her closure item plus one desktop execution noisy life-loop unity bridge, so personality, memory, initiative, and embodiment stay auditable as one same-her closure problem under noisy desktop drift instead of splitting back into neighboring proof islands or letting the execution callback line stop before those four life subsystems reconverge.',
      proof: 'alicization-runtime-architecture.test.ts + runtime-memory-closure.test.ts',
    },
    {
      id: 'long-run-same-her-continuity-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Long-run continuity remains auditable across subconscious persistence, callback recall, later initiative restraint, current context, repeated detours, replay, reopen, and desktop execution without relying on fixed visible-reply wording.',
      proof: 'runtime-subconscious-tick-project-awareness-regression.test.ts + runtime-subconscious-tick.test.ts + runtime-organic-memory-prompt.test.ts + proactive-policy.test.ts + current-conscious-frame.test.ts',
    },
    {
      id: 'route-authority-boundary-registry-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Pre-dialogue transport, return-side reconstruction, host-visible normalization, and guarded turn persistence share one route registry without granting project-state data any visible-reply authorship.',
      proof: 'project-state-brief.ts + route-authority-boundary-registry-audit.test.ts + pre-dialogue-transport-audit.ts + pre-dialogue-transport-audit.test.ts + return-side-project-awareness-audit.ts + runtime-dialogue-normalization-audit.ts + runtime-dialogue-normalization-audit.test.ts + runtime-turn-persistence-audit.ts + runtime-turn-persistence-project-state-hold-regression.test.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'runtime-dialogue-normalization-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Runtime dialogue-normalization candidates are derived from the canonical normalizer and its real call sites: proactive persistence plus runtime persistence and replay delivery.',
      proof: 'runtime-dialogue-normalization-entrypoint-audit.ts + runtime-dialogue-normalization-audit.test.ts + project-awareness-route-authority-audit.test.ts',
    },
    {
      id: 'runtime-turn-persistence-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader guarded turn persistence candidates now also feed the same top-level project-awareness completeness guard, so persistence authority, renderer dialogue entry, proactive turn entry, reminder/callback turn entry, and origin-spoof rejection stay aligned with the broader scan before future guarded persistence families still need explicit classification.',
      proof: 'runtime-turn-persistence-entrypoint-audit.ts + project-awareness-route-authority-audit.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'project-state-provider-consumer-registration',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Main-gateway wrapper ownership, runtime dispatch ownership, and typed consumers are explicitly registered without requiring project-state or persona prompt injection.',
      proof: 'main-gateway-contract.ts + main-gateway-contract.test.ts + project-state-provider-consumer-audit.ts + project-state-provider-consumer-audit.test.ts',
    },
    {
      id: 'visible-reply-final-project-awareness-hardening',
      area: 'reply',
      status: 'verified',
      responsibility: 'Visible-reply project-state data remains metadata for audit and observability only; it cannot author, judge, or rewrite Provider text.',
      proof: 'visible-reply/project-awareness.test.ts + visible-reply/project-awareness-scoring-regression.test.ts + visible-reply/realization-engine.test.ts + visible-reply/critic.test.ts + visible-reply/settlement.test.ts',
    },
    {
      id: 'execution-dispatch-owner-registration',
      area: 'execution',
      status: 'verified',
      responsibility: 'Task-thread dispatch owner seams are explicitly registered across invoke entry, runtime dispatch, delegated execution, autonomous dispatch, and orchestrator fallback.',
      proof: 'task-thread-dispatch-owner-audit.ts + task-thread-dispatch-owner-audit.test.ts',
    },
    {
      id: 'visible-reply-timeout-fallback',
      area: 'reply',
      status: 'verified',
      responsibility: 'Main chat timeout recovery surfaces the timeout or Provider failure directly and does not replace the failed turn with project-state, persona, or companionship prose.',
      proof: 'main-chat-timeout-fallback.ts + main-chat-timeout-fallback.test.ts + main-chat-background-run.test.ts + packages/stage-shared/src/alicization-chat-failure-surface.test.ts',
    },
    {
      id: 'runtime-current-conscious-frame-awareness',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Current conscious frame shaping combines current state, WorkingMemory, recalled long-term evidence, emotion, and tool facts without generating project-state or persona reply guidance.',
      proof: 'current-conscious-frame.ts + current-conscious-frame.test.ts + answer-planner.test.ts + runtime-conscious-frame-reducer.ts + runtime-conscious-frame-reducer.test.ts + runtime-memory-deliberation-reducer.ts + runtime-memory-deliberation-reducer.test.ts + main-chat-session-runtime.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts + structured-project-state.test.ts + prepared-runtime-continuity.test.ts',
    },
    {
      id: 'retrieval-and-writeback-continuity-pressure',
      area: 'memory',
      status: 'verified',
      responsibility: 'Primary open-loop continuity pressure reshapes retrieval ranking, proactive restraint, long-horizon memory, autobiographical self, autobiographical writeback, and post-recall long-horizon summary refresh so unfinished seams are treated as lived continuity work instead of leaving reconsolidated execution callback lessons trapped below the durable self-carry layer.',
      proof: 'memory-*retrieval.ts + proactive-memory-boundary.ts + long-horizon-memory.ts + autobiographical-*.ts tests + db.test.ts',
    },
    {
      id: 'person-state-and-self-evolution-observability',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Project continuity now remains visible beyond local prompt shaping by surfacing through unified person-state summary, runtime architecture snapshot/digest/system block, and self-evolution candidate continuity reasons.',
      proof: 'person-state-projection.ts + alicization-runtime-architecture.ts + self-evolution/version-runtime.ts tests',
    },
  ]
}

export function buildAlicizationProjectStateSystemBlock(input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  void input
  return ''
}

export function buildAlicizationProviderFacingProjectStateSystemBlock(input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  void input
  return ''
}

export function buildAlicizationProjectStateExtraSystemBlocks(input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  void input
  return []
}

export function buildAlicizationProviderFacingProjectStateExtraSystemBlocks(input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  void input
  return []
}

export function buildAlicizationProjectStateClosureDashboard(input?: {
  brief?: AlicizationProjectStateBrief | null
  architecture?: {
    operatingMode?: string | null
    dominantSystem?: string | null
    closureAudit?: {
      summary?: string | null
      activeClosurePressures?: string[] | null
    } | null
  } | null
  runtimeDigest?: {
    dominantChannel?: string | null
    habitMode?: string | null
    shouldProactivelySpeak?: boolean | null
    shouldProactivelyAct?: boolean | null
    projectState?: {
      continuityArcStage?: string | null
      continuityCue?: string | null
    } | null
  } | null
}) {
  const brief = input?.brief ?? resolveAlicizationProjectStateBrief()
  const openFocusSummary = deriveCompactProjectStateOpenFocusSummary(brief.openLoops[0] ?? '')
  const nextFocusSummary = deriveCompactProjectStateNextFocusSummary(brief.nextClosureTarget)
  const coverage = resolveAlicizationProjectStateCoverage()
  const architecture = input?.architecture ?? null
  const runtimeDigest = input?.runtimeDigest ?? null
  const closurePressures = (architecture?.closureAudit?.activeClosurePressures ?? [])
    .map(item => sanitizeProjectStateSnapshotText(item, 120))
    .filter(Boolean)
    .slice(0, 5)

  return buildAlicizationProviderFactBlock('alicization-memory-governance-dashboard', {
    version: 'alicization-memory-governance-dashboard-v1',
    scope: 'memory-governance-audit',
    audience: 'internal',
    owners: {
      shortTerm: 'WorkingMemory',
      longTermRecall: 'LongTermMemoryRecall',
      visibleGovernance: 'MemoryWorkbench',
    },
    failureSurface: 'transparent',
    projectState: {
      identity: sanitizeProviderFacingProjectStateText(brief.identity, 220) || null,
      phase: sanitizeProviderFacingProjectStateText(brief.currentPhase, 160) || null,
      latestLandedProgress: sanitizeProviderFacingProjectStateText(
        brief.continuityProgressSummary ?? brief.memoryAnthropomorphismProgress[0] ?? '',
        220,
      ) || null,
      primaryOpenLoop: sanitizeProviderFacingProjectStateText(brief.openLoops[0] ?? '', 220) || null,
      initiativeGap: sanitizeProviderFacingProjectStateText(brief.proactiveSameHerGap, 220) || null,
      openFocus: sanitizeProviderFacingProjectStateText(openFocusSummary, 220) || null,
      nextClosureTarget: sanitizeProviderFacingProjectStateText(brief.nextClosureTarget, 220) || null,
      nextFocus: sanitizeProviderFacingProjectStateText(nextFocusSummary, 220) || null,
    },
    verifiedCoverageCount: coverage.length,
    architecture: {
      mode: sanitizeProjectStateSnapshotText(architecture?.operatingMode ?? '', 64) || null,
      dominantSystem: sanitizeProjectStateSnapshotText(architecture?.dominantSystem ?? '', 64) || null,
      closureSummary: sanitizeProviderFacingProjectStateText(architecture?.closureAudit?.summary, 220) || null,
      activeClosurePressures: closurePressures,
    },
    runtime: {
      dominantChannel: sanitizeProjectStateSnapshotText(runtimeDigest?.dominantChannel ?? '', 64) || null,
      habitMode: sanitizeProjectStateSnapshotText(runtimeDigest?.habitMode ?? '', 96) || null,
      shouldSpeak: typeof runtimeDigest?.shouldProactivelySpeak === 'boolean'
        ? runtimeDigest.shouldProactivelySpeak
        : null,
      shouldAct: typeof runtimeDigest?.shouldProactivelyAct === 'boolean'
        ? runtimeDigest.shouldProactivelyAct
        : null,
      arcStage: sanitizeProjectStateSnapshotText(runtimeDigest?.projectState?.continuityArcStage ?? '', 120) || null,
    },
  })
}

export function buildAlicizationProviderFacingProjectStateClosureDashboard(input?: {
  brief?: AlicizationProjectStateBrief | null
  architecture?: {
    operatingMode?: string | null
    dominantSystem?: string | null
    closureAudit?: {
      summary?: string | null
      activeClosurePressures?: string[] | null
    } | null
  } | null
  runtimeDigest?: {
    dominantChannel?: string | null
    habitMode?: string | null
    shouldProactivelySpeak?: boolean | null
    shouldProactivelyAct?: boolean | null
    projectState?: {
      continuityArcStage?: string | null
      continuityCue?: string | null
    } | null
  } | null
}) {
  const coverage = resolveAlicizationProjectStateCoverage()
  const architecture = input?.architecture ?? null
  const runtimeDigest = input?.runtimeDigest ?? null
  const closurePressures = (architecture?.closureAudit?.activeClosurePressures ?? [])
    .map(item => sanitizeProviderFacingProjectStateText(item, 120))
    .filter(Boolean)
    .slice(0, 5)

  return buildAlicizationProviderFactBlock('alicization-memory-governance-dashboard', {
    version: 'alicization-memory-governance-dashboard-v1',
    scope: 'memory-governance-audit',
    audience: 'provider',
    owners: {
      shortTerm: 'WorkingMemory',
      longTermRecall: 'LongTermMemoryRecall',
      visibleGovernance: 'MemoryWorkbench',
    },
    failureSurface: 'transparent',
    verifiedCoverageCount: coverage.length,
    architecture: {
      mode: sanitizeProviderFacingProjectStateText(architecture?.operatingMode, 64) || null,
      dominantSystem: sanitizeProviderFacingProjectStateText(architecture?.dominantSystem, 64) || null,
      closureSummary: sanitizeProviderFacingProjectStateText(architecture?.closureAudit?.summary, 220) || null,
      activeClosurePressures: closurePressures,
    },
    runtime: {
      dominantChannel: sanitizeProviderFacingProjectStateText(runtimeDigest?.dominantChannel, 64) || null,
      habitMode: sanitizeProviderFacingProjectStateText(runtimeDigest?.habitMode, 96) || null,
      shouldSpeak: typeof runtimeDigest?.shouldProactivelySpeak === 'boolean'
        ? runtimeDigest.shouldProactivelySpeak
        : null,
      shouldAct: typeof runtimeDigest?.shouldProactivelyAct === 'boolean'
        ? runtimeDigest.shouldProactivelyAct
        : null,
      arcStage: sanitizeProviderFacingProjectStateText(runtimeDigest?.projectState?.continuityArcStage, 120) || null,
    },
  })
}
