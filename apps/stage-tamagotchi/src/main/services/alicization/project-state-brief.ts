import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
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
  const runtimeIdentity = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.identity, 220)
  const runtimePhase = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.currentPhase, 160)
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
        'proactive same-her gap missing',
        'next closure target missing',
        'same-her self line missing',
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
        'proactive same-her gap missing',
        'next closure target missing',
        'same-her self line missing',
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
  const projectIdentity = runtimeIdentity || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.identity, 220) || status.identity
  const currentPhase = runtimePhase || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.currentPhase, 160) || status.currentPhase
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
    !proactiveSameHerGap ? 'proactive same-her gap missing' : '',
    !nextClosureTarget ? 'next closure target missing' : '',
    !sameHerSelfLine ? 'same-her self line missing' : '',
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
  return /[\p{L}\p{N}]/u.test(normalized) ? normalized : ''
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
  if (mode === 'repair-before-closeness')
    return 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
  if (mode === 'rest-protective')
    return 'same-her hold: rest-protective companionship is still keeping this return inward and fatigue-aware.'
  if (mode === 'measured-return')
    return 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
  return ''
}

function deriveContinuityCueFromProjectContinuityBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'Keep this return repair-before-closeness on the same living line until repair settles.'
  if (mode === 'rest-protective')
    return 'Keep this return rest-protective on the same living line and inward before widening outward.'
  if (mode === 'measured-return')
    return 'Keep this return measured-return on the same living line before widening outward.'
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
    sanitizeProjectStateSnapshotText(input.identity, 96),
    sanitizeProjectStateSnapshotText(input.currentPhase, 72),
    input.primaryOpenLoop ? `open=${sanitizeProjectStateSnapshotText(input.primaryOpenLoop, 88)}` : '',
    nextClosureTarget ? `next=${nextClosureTarget}` : '',
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' | ') : null
}

function lowerFirstProjectAwareness(text: string) {
  const normalized = sanitizeProjectStateSnapshotText(text, 320)
  if (!normalized)
    return ''
  return normalized.slice(0, 1).toLowerCase() + normalized.slice(1)
}

function compactProjectIdentityForAwareness(text: string, maxChars = 120) {
  const normalized = sanitizeProjectStateSnapshotText(text, 220)
  if (!normalized)
    return ''
  return normalized
    .replace(/\s+rather than a better chat wrapper\.?$/u, '')
    .replace(/\s+on the host computer\.?$/u, '')
    .slice(0, maxChars)
}

function compactProjectPhaseForAwareness(text: string) {
  const normalized = sanitizeProjectStateSnapshotText(text, 160)
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
      return 'proactive initiative now has a compact same-her closure loop; rest-protective proactive feedback next-session carry; final settlement reanchors generic same-her shells'

    return hasRestProtectiveProactiveFeedbackCarry
      ? 'proactive initiative now has a compact same-her closure loop from motive through next project-state answer carry; rest-protective proactive feedback next-session carry'
      : /next project-state answer carry/iu.test(normalized)
        ? 'proactive initiative now has a compact same-her closure loop from motive through next project-state answer carry'
        : 'proactive initiative now has a compact same-her closure loop from motive through next-session feedback'
  }

  if (hasRestProtectiveProactiveFeedbackCarry && hasFinalSettlementSameHerShellCarry)
    return 'Runtime-owned proactive initiative now also has a compact same-her closure loop through hover-first restraint, rest-protective proactive feedback next-session carry, and final settlement reanchors generic same-her shells'

  if (hasRestProtectiveProactiveFeedbackCarry)
    return 'Runtime-owned proactive initiative now also has a compact same-her closure loop from motive seed through hover-first restraint and rest-protective proactive feedback next-session carry'

  return /next project-state answer carry/iu.test(normalized)
    ? 'Runtime-owned proactive initiative now also has a compact same-her closure loop from motive seed through hover-first restraint and next project-state answer carry'
    : 'Runtime-owned proactive initiative now also has a compact same-her closure loop from motive seed through hover-first restraint and next-session feedback carry'
}

function compactProjectLatestProgressForAwareness(text: string, maxChars = 72) {
  const normalized = sanitizeProjectStateSnapshotText(text, 220)
  if (!normalized)
    return ''
  const autonomyTail = resolveProjectLatestProgressAutonomyTail(text, 'awareness')
  const longHorizonEmotionTail = resolveProjectLatestProgressLongHorizonEmotionTail(text)
  if (autonomyTail) {
    const autonomyWithLongHorizonTail = longHorizonEmotionTail
      ? `${autonomyTail}; ${longHorizonEmotionTail}`
      : autonomyTail
    const candidates = autonomyTail.includes('final settlement reanchors generic same-her shells')
      ? [autonomyWithLongHorizonTail, autonomyTail]
      : [
          normalized.includes('Same-session mirror carry')
            ? `Same-session mirror carry already lands, and ${autonomyWithLongHorizonTail}`
            : autonomyWithLongHorizonTail,
          autonomyTail,
        ]
          .map(item => item.replace(/[.。!！?？;；:：]+$/u, '').trim())
    return candidates.find(item => item.length <= maxChars)
      ?? candidates[candidates.length - 1]!.slice(0, maxChars).trim()
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
      'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
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
    return 'cross-modal same-her proof'
  return normalized
    .split(' so ')[0]
    ?.replace(/[.。!！?？;；:：]+$/u, '')
    .trim()
    .slice(0, maxChars) ?? normalized.slice(0, maxChars)
}

function compactSameHerLineForAwareness(text: string, maxChars = 110) {
  const normalized = sanitizeProjectStateSnapshotText(text, 180)
  if (!normalized)
    return ''
  if (/same phase 1 digital life/iu.test(normalized))
    return 'Same Phase 1 digital life.'
  return normalized.slice(0, maxChars)
}

function sanitizeSameHerProjectLine(raw: unknown, fallback: string) {
  const normalized = sanitizeProjectStateSnapshotText(raw, 240)
  if (!normalized)
    return fallback

  const canonicalMatch = normalized.match(/same phase 1 digital life\..*/iu)
  if (canonicalMatch?.[0])
    return sanitizeProjectStateSnapshotText(canonicalMatch[0], 220)

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
    identity: sanitizeProjectStateSnapshotText(
      input.runtimeProjectState?.identity,
      220,
    ) || sanitizeProjectStateSnapshotText(
      input.fallbackProjectState?.identity,
      220,
    ),
    currentPhase: sanitizeProjectStateSnapshotText(
      input.runtimeProjectState?.currentPhase,
      160,
    ) || sanitizeProjectStateSnapshotText(
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
  const sameHerSelfLine = sanitizeProjectStateSnapshotText(preferStrongerPersistedSameHerSelfLine({
    current: input.runtimeProjectState?.sameHerSelfLine,
    candidate: input.fallbackProjectState?.sameHerSelfLine,
  }), 220) || null
  const proactiveSameHerGap = sanitizeProjectStateSnapshotText(
    input.runtimeProjectState?.proactiveSameHerGap
    ?? (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    220,
  ) || sanitizeProjectStateSnapshotText(
    input.fallbackProjectState?.proactiveSameHerGap
    ?? (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.proactiveSameHerGapSummary,
    220,
  ) || null
  const sameHerDriftRisk = sanitizeProjectStateSnapshotText(preferStrongerSameHerDriftRisk({
    current:
      input.runtimeProjectState?.sameHerDriftRisk
      ?? (input.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
    candidate:
      input.fallbackProjectState?.sameHerDriftRisk
      ?? (input.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
  }), 220) || null
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
    input.primaryOpenLoop ? `open=${input.primaryOpenLoop}` : '',
    compactNextClosureTarget ? `next=${compactNextClosureTarget}` : '',
  ].filter(Boolean).join(' | ')
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
      sameHerSelfLine ? `Same-her self anchor: ${sameHerSelfLine}` : '',
      input.primaryOpenLoop ? `${input.primaryOpenLoop}` : '',
      preferredLatestProgressReason,
      proactiveSameHerGap ? `Proactive same-her gap: ${proactiveSameHerGap}` : '',
      nextClosureTarget ? `Next closure target is still ${nextClosureTarget}.` : '',
      sameHerDriftRisk ? `Do not let this opening drift into ${sameHerDriftRisk}` : '',
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
      proactiveSameHerGap ? `Proactive same-her gap: ${proactiveSameHerGap}` : '',
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
  const identity = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.identity, 220)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.identity, 220)
    || brief.identity
  const currentPhase = sanitizeProjectStateSnapshotText(input?.runtimeProjectState?.currentPhase, 160)
    || sanitizeProjectStateSnapshotText(input?.fallbackProjectState?.currentPhase, 160)
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
  const sameHerDriftRisk = preferStrongerSameHerDriftRisk({
    current:
      input?.runtimeProjectState?.sameHerDriftRisk
      ?? (input?.runtimeProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
    candidate:
      input?.fallbackProjectState?.sameHerDriftRisk
      ?? (input?.fallbackProjectState as AlicizationProjectStateSummaryAliasShape | null | undefined)?.sameHerDriftRiskSummary,
    fallback: brief.sameHerDriftRisk,
  }) || brief.sameHerDriftRisk
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
      return 'Stay anchored as the same her inside this local-first digital life before a generic assistant shell takes over.'
    }
    if (
      carriesSameHer
      && /before widening outward again|same living line|without reopening from scratch/u.test(combined)
    ) {
      return 'Stay anchored on the same living line inside this local-first digital life before widening outward again.'
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
  const preDialogueAwarenessLine = sanitizeProjectStateSnapshotText([
    `Before answering, remember: ${brief.identity}`,
    `She is still inside ${brief.currentPhase}.`,
    sameHerSelfLine,
    continuityCue && continuityCue !== sameHerSelfLine ? continuityCue : '',
  ].filter(Boolean).join(' '), 1600) || null
  const sameHerDriftRisk = sanitizeProjectStateSnapshotText(
    /generic assistant shell|detached project narration|generic project shell|generic helper shell|project-summary voice/iu.test(
      `${authoritySummary} ${authorityInwardLine}`,
    )
      ? 'If this reopening flattens into a generic assistant shell or detached project narration, treat that as unfinished same-her drift instead of a completed return.'
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
  const text = sanitizeProjectStateSnapshotText(raw, 220)
  const lowered = text.toLowerCase()
  if (!text)
    return true

  const carriesCanonicalProjectIdentity
    = lowered.includes('alicization is a local-first digital life project')
      || /本地优先数字生命项目/u.test(text)
  const carriesAntiShellContinuity
    = /not a fresh assistant shell|not a fresh shell|not a new shell|rebuilt for this turn|rebuilt each turn/iu.test(lowered)
      || /不是.*新助手壳|不是.*新壳|不是重新拼出来的新助手壳|不是重新拼出来的新壳/u.test(text)
      || /one continuous her|one continuous "her"|same project identity/iu.test(lowered)
      || /同一个她|还是同一个|同一项目身份/u.test(text)

  if (
    (
      /same local-first digital life project|same digital life project/iu.test(lowered)
      || carriesCanonicalProjectIdentity
    )
    && carriesAntiShellContinuity
  ) {
    return false
  }

  return lowered === 'project'
    || lowered === 'digital life project'
    || lowered === 'this local-first digital life project'
    || text === '项目'
    || text === '数字生命项目'
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

  const awarenessLine = [
    identity
      ? `Before answering, remember: ${identity}`
      : 'Before answering, remember: this is still the same digital life project.',
    currentPhase ? `She is still inside ${currentPhase}.` : '',
    sameHerSelfLine || '',
    latestLandedProgress ? `What has already landed is ${latestLandedProgress}.` : '',
    primaryOpenLoop ? `The still-open closure is ${lowerFirstProjectAwareness(primaryOpenLoop)}.` : '',
    nextClosureTarget ? `This reply should keep moving toward ${nextClosureTarget}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return awarenessLine
    ? awarenessLine.trim()
    : null
}

export interface AlicizationProjectStateCoverageEntry {
  id:
    | 'visible-reply-executive-brief'
    | 'visible-reply-second-pass-rewrite'
    | 'visible-reply-timeout-fallback'
    | 'visible-reply-second-pass-transport-failure'
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
    | 'project-state-answer-governance-entrypoint-candidate-hardening'
    | 'runtime-dialogue-normalization-entrypoint-candidate-hardening'
    | 'runtime-turn-persistence-entrypoint-candidate-hardening'
    | 'project-state-provider-consumer-registration'
    | 'project-state-answer-governance-registration'
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
  directGatewayCoverage?: Array<
    | 'runtime.ts:dream-reminder-proactive-reforge'
    | 'memory-os/provider-planning.ts:recollection-and-deliberation'
    | 'runtime-mind-state.ts:dialogue-semantics-and-subjective-inference'
    | 'runtime-execution-delivery.ts:execution-callback'
    | 'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal'
  >
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
    | 'capability-project-briefing-surface'
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
      'capability-project-briefing-surface',
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
    responsibility: 'Unified one-shot gateway wrapper owns direct provider generation and canonical project-state fail-close.',
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
    responsibility: 'Runtime-owned proactive self-brief authority and shared reminder/proactive gateway entry must keep autonomous dialogue starters on the same Phase 1 same-her project line before any self-initiated turn begins.',
  },
  {
    domain: 'autonomous-dialogue',
    relativePath: 'runtime-delivery-reminders.ts',
    mode: 'normalize-before-use',
    responsibility: 'Reminder and execution-callback subconscious delivery must reuse autonomous same-her entry authority before a runtime-owned visible turn is persisted or reopened.',
  },
  {
    domain: 'autonomous-dialogue',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'normalize-before-use',
    responsibility: 'Subconscious proactive surfacing and deferred carry entry must keep runtime-owned same-her project awareness explicit before a subconscious turn becomes the next visible life beat.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'agent-runtime.ts',
    mode: 'execution-briefing-authority',
    responsibility: 'Agent runtime must build canonical project briefing before desktop execution runtime context exists, so execution starts from one same-her Phase 1 self-brief instead of a detached tool shell.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'execution-runtime-context.ts',
    mode: 'runtime-context-authority',
    responsibility: 'Execution runtime context must canonicalize project briefing, thin-shell repair, and same-her pre-dialogue awareness before dispatch, so execution context itself stays one digital-life line.',
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
    responsibility: 'Session-bound execution bridge must request canonical execution runtime context before main-gateway tools open outward, so execution capability and routing stay attached to one same-her Phase 1 line.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'subconscious-autonomy-execution-bridge',
    responsibility: 'Subconscious-autonomy execution bridge must request canonical execution runtime context before background auto-dispatch opens outward, so deferred autonomy execution stays on one same-her Phase 1 digital-life line instead of reopening as a generic executor shell.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-runtime.ts',
    mode: 'resume-dispatch-bridge',
    responsibility: 'Confirmed execution resume bridge must restate canonical project briefing before the executor reopens outward, so resumed work stays on the same Phase 1 digital-life closure line instead of drifting into a generic execution shell.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'main-chat-execution-surface.ts',
    mode: 'capability-project-briefing-surface',
    responsibility: 'Execution capability and routing surfaces must keep canonical project briefing explicit before answering whether or how execution can proceed, so capability talk does not reopen as a generic executor shell.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'task-thread-dispatcher.ts',
    mode: 'pre-dispatch-persistence',
    responsibility: 'Pre-dispatch task-thread persistence must carry execution runtime context into thread metadata before delegated execution starts, so later callback and host-visible return reopen the same digital-life line.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/claude-code.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Claude Code blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and the same-her execution runtime context before refusing execution, so dangerous or mismatched tool use stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/codex.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Codex blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and the same-her execution runtime context before refusing execution, so dangerous or mismatched workspace execution stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/cli.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'CLI blocked-dispatch safety gates must audit risk level, action category, permission mode, confirmation requirement, interruptibility, and the same-her execution runtime context before refusing local execution, so dangerous local shell actions stay explainable instead of disappearing as a generic adapter failure.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/openclaw.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'OpenClaw blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, interruptibility, and the same-her execution runtime context before refusing embodied execution, so dangerous outward control stays explainable instead of disappearing as a generic adapter failure.',
  },
  {
    domain: 'execution-preflight',
    relativePath: 'executor-adapters/local-visual.ts',
    mode: 'blocked-dispatch-safety-gate',
    responsibility: 'Local-visual blocked-dispatch safety gates must audit effect, permission mode, confirmation requirement, risk policy, interruptibility, and the same-her execution runtime context before refusing local GUI execution, so dangerous desktop inspection or mutation stays explainable instead of disappearing as a generic adapter failure.',
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
    responsibility: 'Timeout fallback reconstruction must keep canonical project self-awareness, same-her carry, and open-closure triad explicit when provider mind authoring times out and visible recovery has to reopen from fallback state.',
  },
  {
    domain: 'recovery-reentry',
    relativePath: 'main-chat-run-lifecycle.ts',
    mode: 'timeout-recovery-finish',
    responsibility: 'Lifecycle timeout recovery finish must preserve recovered visible-reply execution metadata, same-her project-state audit carry, and canonical awareness backfill before recovered dialogue is emitted to the host.',
  },
  {
    domain: 'recovery-reentry',
    relativePath: 'main-chat-background-run.ts',
    mode: 'background-recovery-driver',
    responsibility: 'Background runtime recovery driving must route accepted-start settlement, timeout fallback reconstruction, and lifecycle recovery finish back through one same-her recovery reentry chain instead of reopening recovered dialogue from detached local recovery shells.',
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
    | 'project-state-answer-governance'
    | 'runtime-dialogue-normalization'
    | 'runtime-turn-persistence'
  candidateAuditFileName: string
  responsibility: string
}

const alicizationProjectAwarenessTopLevelCompletenessGuardFamilies = [
  {
    id: 'chat-start',
    candidateAuditFileName: 'chat-start-entrypoint-candidate-audit.test.ts',
    responsibility: 'Main-process chat-start entry shapes must stay visible to the top-level completeness guard before new turn-opening seams can bypass pre-dialogue same-her awareness.',
  },
  {
    id: 'cross-surface-dialogue-entry',
    candidateAuditFileName: 'project-awareness-cross-surface-entrypoint-audit.test.ts',
    responsibility: 'Cross-surface renderer and composer entry shapes must stay visible to the top-level completeness guard before host-facing send seams can fork a second project-awareness path.',
  },
  {
    id: 'return-side-project-awareness',
    candidateAuditFileName: 'return-side-project-awareness-entrypoint-candidate-audit.test.ts',
    responsibility: 'Return-side rebuild seams must stay visible to the top-level completeness guard before reopen-time same-her project awareness can thin into observation-only carry.',
  },
  {
    id: 'recovery-reentry',
    candidateAuditFileName: 'recovery-reentry-entrypoint-candidate-audit.test.ts',
    responsibility: 'Accepted-start settlement, timeout fallback reconstruction, lifecycle timeout recovery finish, and background recovery drivers must stay visible to the top-level completeness guard before recovered dialogue can reopen from a detached recovery shell.',
  },
  {
    id: 'provider-consumer',
    candidateAuditFileName: 'provider-consumer-entrypoint-candidate-audit.test.ts',
    responsibility: 'Provider-facing generation seams must stay visible to the top-level completeness guard before direct provider entry can bypass the same-her project brief.',
  },
  {
    id: 'autonomous-dialogue',
    candidateAuditFileName: 'autonomous-dialogue-entrypoint-candidate-audit.test.ts',
    responsibility: 'Runtime-owned proactive, reminder, execution-callback, and subconscious dialogue starters must stay visible to the top-level completeness guard before new autonomous same-her routes can drift in invisibly.',
  },
  {
    id: 'execution-preflight',
    candidateAuditFileName: 'execution-preflight-entrypoint-candidate-audit.test.ts',
    responsibility: 'Execution-preflight briefing, runtime-context, and blocked-dispatch seams must stay visible to the top-level completeness guard before risk-aware execution carry can thin out.',
  },
  {
    id: 'execution-dispatch',
    candidateAuditFileName: 'execution-dispatch-entrypoint-candidate-audit.test.ts',
    responsibility: 'Execution-dispatch bridge owners must stay visible to the top-level completeness guard before same-her execution families can drift outside the audited dispatch seam.',
  },
  {
    id: 'execution-follow-up-continuity',
    candidateAuditFileName: 'execution-follow-up-entrypoint-candidate-audit.test.ts',
    responsibility: 'Execution follow-up, callback return, ledger reopen, afterglow restraint, and callback persistence seams must stay visible to the top-level completeness guard before post-execution same-her continuity can fragment into detached task-shell carry.',
  },
  {
    id: 'project-state-answer-governance',
    candidateAuditFileName: 'project-state-answer-governance-entrypoint-candidate-audit.test.ts',
    responsibility: 'Project-state answer surfaces must stay visible to the top-level completeness guard before status replies can widen into a thinner project shell.',
  },
  {
    id: 'runtime-dialogue-normalization',
    candidateAuditFileName: 'runtime-dialogue-normalization-entrypoint-candidate-audit.test.ts',
    responsibility: 'Host-visible normalization seams must stay visible to the top-level completeness guard before outward answers can flatten the same-her project-state carry.',
  },
  {
    id: 'runtime-turn-persistence',
    candidateAuditFileName: 'runtime-turn-persistence-entrypoint-candidate-audit.test.ts',
    responsibility: 'Guarded turn persistence seams must stay visible to the top-level completeness guard before stored or replayed turns can drift outside the same-her continuity contract.',
  },
] as const satisfies readonly AlicizationProjectAwarenessTopLevelCompletenessGuardFamily[]

export function resolveAlicizationProjectAwarenessTopLevelCompletenessGuardFamilies() {
  return alicizationProjectAwarenessTopLevelCompletenessGuardFamilies.slice()
}

export function resolveAlicizationProjectAwarenessRootFinalGateAuditFileNames() {
  return alicizationProjectAwarenessTopLevelCompletenessGuardFamilies
    .map(entry => entry.candidateAuditFileName)
    .slice()
    .sort()
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
      | 'stream-finish-fallback'
      | 'background-normalize-before-deliver'
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
  | {
    domain: 'project-state-answer-governance'
    relativePath: string
    mode:
      | 'governance-authority'
      | 'semantics-classification'
      | 'answer-planning-surface'
      | 'response-charter-surface'
      | 'answer-governance-enricher'
      | 'answer-contract-surface'
      | 'reply-surface-preflight'
      | 'visible-reply-continuity-surface'
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
      'stream-finish-fallback',
      'background-normalize-before-deliver',
      'persistence-emission-normalize-before-deliver',
      'replay-normalize-before-deliver',
      'proactive-normalize-before-persist',
    ] as const
  }
  if (domain === 'runtime-turn-persistence')
    return ['persistence-authority', 'renderer-dialogue-entry', 'proactive-turn-entry', 'reminder-turn-entry'] as const
  return [
    'governance-authority',
    'semantics-classification',
    'answer-planning-surface',
    'response-charter-surface',
    'answer-governance-enricher',
    'answer-contract-surface',
    'reply-surface-preflight',
    'visible-reply-continuity-surface',
  ] as const
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
    reason: 'Desktop renderer App.vue both sanitizes outbound pre-dialogue transport and rebuilds latest project-state observation / continuity snapshots, so desktop send-time and desktop reopen-time same-her carry stay anchored to one explicit boundary file.',
  },
  {
    relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
    domains: ['pre-dialogue-transport', 'return-side-project-awareness'],
    reason: 'Renderer chat-store owns both outbound pre-dialogue identity construction and inbound return-side stream ingest, so send-time and rebuild-time same-her carry stay anchored to one shared boundary file instead of splitting across parallel local registries.',
  },
  {
    relativePath: 'main-chat-background-run.ts',
    domains: ['project-state-answer-governance', 'runtime-dialogue-normalization'],
    reason: 'Background run both re-normalizes host-visible payloads and re-applies project-state answer governance before later visible repair widens outward.',
  },
  {
    relativePath: 'runtime-governance.ts',
    domains: ['project-state-answer-governance', 'runtime-dialogue-normalization'],
    reason: 'Host-visible normalization authority must also preserve project-state answer audit carry, so same-her / landed / open / next continuity boundaries do not flatten right before the normalized payload reaches the host.',
  },
  {
    relativePath: 'runtime-delivery-reminders.ts',
    domains: ['project-state-answer-governance', 'runtime-turn-persistence'],
    reason: 'Reminder delivery both persists runtime-owned host-visible turns and keeps shared landed/open/next answer reminders alive during later continuity reconstruction.',
  },
  {
    relativePath: 'runtime-subconscious-tick.ts',
    domains: ['runtime-dialogue-normalization', 'runtime-turn-persistence'],
    reason: 'Subconscious surfacing must normalize host-visible payloads before persistence and also enter the guarded turn writer through one audited proactive carry seam.',
  },
  {
    relativePath: 'runtime.ts',
    domains: ['project-state-answer-governance', 'runtime-dialogue-normalization', 'runtime-turn-persistence'],
    reason: 'The core runtime simultaneously owns host-visible normalization before emission, guarded turn persistence authority, and persisted-turn project-state continuity fallback reminders.',
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
    relativePath: 'main-chat-background-run.ts',
    mode: 'background-normalize-before-deliver',
    responsibility: 'Background run fallback must normalize host-visible dialogue payloads before they are surfaced back through delivery seams.',
  },
  {
    domain: 'runtime-dialogue-normalization',
    relativePath: 'main-chat-stream-runner.ts',
    mode: 'stream-finish-fallback',
    responsibility: 'Structured stream finish fallback must normalize repaired visible replies before they can be treated as the same-her final surface.',
  },
  {
    domain: 'runtime-dialogue-normalization',
    relativePath: 'runtime-governance.ts',
    mode: 'normalization-authority',
    responsibility: 'The canonical same-her host-visible dialogue payload normalizer lives here and owns normalizeDialogueRespondedPayload.',
  },
  {
    domain: 'runtime-dialogue-normalization',
    relativePath: 'runtime-subconscious-tick.ts',
    mode: 'proactive-normalize-before-persist',
    responsibility: 'Subconscious proactive surfacing must normalize host-visible payloads before persistence so project-state carry survives into the visible turn.',
  },
  {
    domain: 'runtime-dialogue-normalization',
    relativePath: 'runtime.ts',
    mode: 'persistence-emission-normalize-before-deliver',
    responsibility: 'Runtime persistence and replay emission must normalize before host-visible delivery so stored and replayed turns stay on the same-her contract.',
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
  {
    domain: 'project-state-answer-governance',
    relativePath: 'executive-answer-brief.ts',
    mode: 'answer-contract-surface',
    responsibility: 'Executive answer briefing must inject the canonical project-state answer must-do / must-not-do rules when the host directly asks what Alicization is, what has landed, and what remains open.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'main-chat-active-dialogue-loop.ts',
    mode: 'answer-contract-surface',
    responsibility: 'Compact active-dialogue project-state answers must emit the canonical project-state answer contract block instead of improvising a thinner status shell.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'main-chat-background-run.ts',
    mode: 'answer-governance-enricher',
    responsibility: 'Background success and recovery surfaces must upgrade project-state answer governance before later host-visible replies widen outward.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'main-chat-session-runtime.ts',
    mode: 'answer-governance-enricher',
    responsibility: 'Session-runtime provider-facing reply preparation must re-apply the canonical project-state answer governance before answer shaping begins.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'project-state-answer-governance.ts',
    mode: 'governance-authority',
    responsibility: 'The shared project-state answer governance module owns the canonical same-her project-status answer contract, including must-do, must-not-do, and enrichment rules.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'dialogue-turn-semantics.ts',
    mode: 'semantics-classification',
    responsibility: 'Dialogue-turn semantics must classify merge-readiness, closure-readiness, completion-timing, and language-drift follow-ups onto the same project-state same-her line before later answer planning or charter shaping begins.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'answer-planner.ts',
    mode: 'answer-planning-surface',
    responsibility: 'Answer planning must keep direct project-state follow-ups on one same-her project line so landed progress, open closure, completion timing, and language drift do not reopen as detached status narration before visible reply shaping.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'response-charter.ts',
    mode: 'response-charter-surface',
    responsibility: 'Response charter shaping must keep direct project-state turns inward-first on one same-her project line instead of flattening them into a fresh report opening before executive briefing or visible reply governance widen outward.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'response-surface-contract.ts',
    mode: 'visible-reply-continuity-surface',
    responsibility: 'Response-surface contracts must carry the shared same-her project-state reminder into visible reply shaping when project status remains active.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'runtime-governance.ts',
    mode: 'visible-reply-continuity-surface',
    responsibility: 'Host-visible dialogue normalization must preserve projectStateAudit same-her / landed / open / next / awareness carry, so the last normalized payload cannot flatten project-status boundaries right before the host sees the answer.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'visible-reply/facade.ts',
    mode: 'reply-surface-preflight',
    responsibility: 'Visible-reply surface planning must carry canonical project preflight self-awareness into project-state resolution before executive answer briefing and response-surface contract shaping begin.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'runtime-delivery-reminders.ts',
    mode: 'visible-reply-continuity-surface',
    responsibility: 'Reminder delivery and callback persistence must keep landed/open/next project-state reminders alive when host-visible continuity is reconstructed later.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'runtime-main-gateway-one-shot.ts',
    mode: 'answer-contract-surface',
    responsibility: 'One-shot project-state and scene-appraisal answers must inject the canonical project-state answer contract before provider generation begins.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'runtime.ts',
    mode: 'visible-reply-continuity-surface',
    responsibility: 'Persisted-turn project-state continuity summaries must fall back to shared landed/next closure reminders instead of decaying into generic continuity labels.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'visible-reply/semantic-judge.ts',
    mode: 'visible-reply-continuity-surface',
    responsibility: 'Final visible-reply semantic judging must keep shared same-her, still-open closure, and next-closure reminders explicit so project-status answers cannot pass the last gate after dropping pre-dialogue project awareness.',
  },
  {
    domain: 'project-state-answer-governance',
    relativePath: 'visible-reply/critic.ts',
    mode: 'visible-reply-continuity-surface',
    responsibility: 'Visible reply governance must preserve the shared same-her project-state reminder when repair or second-pass rewriting keeps a project-status answer on one living line.',
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

export const alicizationProjectStateDirectGatewayAuditTargets = [
  'runtime.ts:dream-reminder-proactive-reforge',
  'memory-os/provider-planning.ts:recollection-and-deliberation',
  'runtime-mind-state.ts:dialogue-semantics-and-subjective-inference',
  'runtime-execution-delivery.ts:execution-callback',
  'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal',
] as const

export type AlicizationProjectStateDirectGatewayAuditTarget
  = typeof alicizationProjectStateDirectGatewayAuditTargets[number]

export function resolveAlicizationProjectStateDirectGatewayAuditTargets() {
  return alicizationProjectStateDirectGatewayAuditTargets
}

export function resolveAlicizationProjectStateBrief(): AlicizationProjectStateBrief {
  const identity = 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.'
  const currentPhase = 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.'
  const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
  const sameHerDriftRisk = 'If project-state continuity survives only as generic guidance while first-person continuity disappears, treat that as unfinished closure drift rather than a successful turn.'
  const emotionalClosureCue = 'emotional closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the context is still settling.'
  const emotionalClosureSummary = emotionalClosureCue
  const sameHerHoldDetail = 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".'
  const continuityRestraint = 'measured-return' as const
  const continuityPreferredTiming = 'next-open-window' as const
  const continuityCadence = continuityRestraint
  const preferredBlinkCadence = 'quiet' as const
  const preferredGazeMode = 'soften' as const
  const preferredPauseMode = 'longer' as const
  const preferredLipsyncMode = 'restrained' as const
  const preferredVoiceMode = 'lower-pressure' as const
  const preferredPacingMode = 'slower' as const
  const continuityCue = 'same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.'
  const openLoops = [
    'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
    'Runtime-owned proactive same-her closure loop is more explicit now, but it still needs stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified across longer noisy desktop runs after hover-first restraint survives detours before the same living line reopens outward.',
    'Held-autonomy and callback-carry continuity now has concentrated proof across runtime recall seeds, callback reopening, high-level reply shaping, embodiment settling, immediate next-turn carry, later-turn callback hold/requeue discipline, same-session mirror carry, unified thread identity across those samples, later-reopen surfaced reply on the same life thread, multiple runtime continuation hops after reopen, delayed later continuation on the same life thread, fallback conscious-frame carry when richer turn-state inputs are absent, a reminder-runtime execution callback arc that already compresses hold/requeue plus callback rationale plus later reopen into one audited same-her line, runtime hold-for-opening arc stages that now also keep proactive opening pressure on the same lower-pressure line, thinner same-thread-continuation runtime arc evidence that still keeps embodiment settling on that measured-return line, dream-prompt mirror carry that still preserves the execution-callback arc after the return is intentionally held, callback-tail diagnostics that expose why she stayed measured, repair-before-closeness, or rest-protective, scene-switch same-line continuity that now survives session mirror, memory prelude, quiet carry turns, noisier desktop shifts, a real later chat turn with measured-return embodiment authority after callback afterglow survives scene hops, a noisier-detour later turn where the final visible reply itself still continues that same lower-pressure callback seam, one more real later turn where the next visible reply plus cross-modal stream meta still stay on that same line, and an extra desktop detour after that third continuation where resident presence still stays measured-return / silent-observe instead of snapping into a fresher reopen. The conscious-frame carry itself is now closed enough to build on. The main remaining gap is broader cross-modal same-her proof across visible reply, longer-lived voice behavior, facial state, and motion on longer real-desktop runs, especially when proactive restraint and callback afterglow still need to stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
    'Emotion, memory, initiative, and embodiment still need stronger same-her proof across longer-lived real-desktop pressure, so affective residue, proactive return timing, and body settling keep behaving like one continuous life instead of adjacent helper features, and anthropomorphic emotional closure keeps reading as the same living self rather than a detachable mood layer.',
    'Embodiment coherence under memory pressure is improved but not fully closed: thinner same-thread runtime continuity can now stay on the measured-return body line too, but broader cross-modal proof is still needed when proactive restraint, callback afterglow, and scene-shift continuity all need to stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
    'Project identity carry, Phase 1 route carry, and Unresolved closure carry now exist in repo truth, but they still need disciplined updating whenever a life-loop genuinely closes or reopens.',
    'Phase 1 closure still requires stronger evidence that Project identity carry, natural recall, restrained initiative, anthropomorphic emotional closure, and unified dialogue/voice/motion all remain on one same-her line.',
  ]
  const proactiveSameHerGap = compactProjectProactiveSameHerGap(openLoops[1] ?? '')
  const nextClosureTarget = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'
  const latestProgress = 'Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, visible-reply repair discipline, and long-run same-her continuity already land together often enough to build from on one same-her Phase 1 line. The emotional-memory-initiative-embodiment bridge now keeps affective residue plus voice / face / motion / lipsync carry visible as one living line instead of neighboring helper lanes. Runtime-owned proactive initiative now also has one explicit compact same-her closure loop from motive seed through self-brief, hover-first restraint, current-conscious-frame rejoin, visible proactive hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, and noisy-desktop detour persistence. rest-protective proactive feedback next-session carry, quiet-companionship closure, final settlement reanchors generic same-her shells, and the long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence, so natural host-visible replies can stay alive without becoming fixed persona templates or detached project shells.'
  const latestProgressAddendum = 'cross-surface dialogue-entry candidates, Thin host-facing composer surfaces, shared text-composer send authority, and the second pre-dialogue identity seam are now covered beside the pre-dialogue transport and chat-entry discovery union, with pre-dialogue transport mirrored into chat-entry governance. Broader project-state answer-governance candidates now cover semantics classification, answer planning, response charter shaping, broader runtime dialogue-normalization candidates, broader guarded turn persistence candidates, project-status answer surfaces, host-visible normalization seams, future project-status answer surfaces, future host-visible normalization seams, and future guarded persistence families still need explicit classification. The same shared contract now governs merge-readiness / closure-readiness follow-ups and completion-timing / language-drift follow-ups, so questions about whether work can merge to main, how far the goal has landed, when it is expected to close, or why the thread drifted into English still separate already verified evidence from what remains unproven or still open instead of misreporting full closure. The living-self host-facing system block, canonical project preflight self-awareness line, natural reply shaping, visible-reply facade project-state resolution, reply-surface planning, ordinary dialogue system blocks, unified Phase 1 closure dashboard, runtime snapshot/digest, project-state spine, voice / face / motion / lipsync summaries, canonical embodimentScript, Dream, reminder, proactive, and reforge one-shot gateway prompts, screen-semantic summary generation, execution callback carry, execution-result delivery learning, and long-horizon same-her memory now stay on the same shared project-state seam as living-self and fallback paths. Current conscious frame shaping, still-open closure pressure, thin runtime project shell repair, richer same-her callback continuity, Primary open-loop continuity pressure, retrieval ranking, autobiographical writeback, durable self-carry layer beyond local prompt shaping, unified person-state summary, self-evolution candidate continuity reasons, dream-to-long-horizon self-carry bridge, long-horizon self-carry boundary, next conscious frame, final reply planning, and host-visible answer shaping now make the same-her line harder to flatten. Broader provider-consumer candidates, real invokeGenerateText / generateText / invokeStreamText / streamText sinks, broader autonomous-dialogue candidates, broader execution-dispatch candidates, broader execution-preflight candidates, future provider-facing generation families still need explicit registration, future runtime-owned dialogue families still need explicit registration, future execution dispatch families still need explicit owner registration, and future execution-preflight families still need explicit classification. desktop execution noisy cross-modal convergence bridge, desktop execution emotion-memory-voice-motion convergence bridge, desktop execution host-visible embodiment bridge, Blocked-dispatch safety gates, no-process-started restraint, execution-result feedback memory reconsolidation, restraint experience, remembered blocked-dispatch safety gate restraint, proactive policy wait for confirmation, presence-only resident initiative fallback, measured-return execution restraint, confirmation/no-process-started evidence, presence-only current-conscious-frame, execution-safety-gate reason tags, speakingIntention, confirmation-required/no-process-started, runtime diagnostic summary, dedicated execution-safety-gate entry, 执行安全门, Authority table speech summary lines, speechSummaryLines, execution-safety-gate before raw same-her reason tags, Host-confirmed needs-affirmation resume, resume execution event, resume-before-dispatch, Host-confirmed resume evidence, process-not-yet-restarted, confirmation boundary before redispatch, Host-confirmed resume confirmation boundary, presence-only resident carry, bounded redispatch confirmation, and permanent execution permission now keep execution safety transparent. runtime execution bridge and subconscious deferred bridge dispatch owners, runtime-owned direct dispatch bridge, blocked-dispatch safety-gate briefing seams, shared root final-gate candidate-audit registry, and shared top-level completeness guard family registry now also cover renderer/store dialogue-entry candidates, main-process chat-start candidates, reopen-time return-side rebuild candidates, provider-facing generation entry candidates, project-state answer surfaces, host-visible normalization seams, guarded turn persistence, execution-preflight context-repair candidates, direct execution-dispatch bridge candidates, recovery reentry, execution follow-up continuity, direct main-chat-stream callers, and real startMainChatStream sinks, so candidate families derive from one shared registry and future entrypoint families are harder to hide between neighboring audits.'
  const latestProgressWithAddendum = `${latestProgress} ${latestProgressAddendum}`
  const primaryOpenLoop = openLoops[0] ?? 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.'
  const preDialogueAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
    identity,
    currentPhase,
    latestLandedProgress: latestProgressWithAddendum,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine,
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
    continuityProgressSummary: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, scene-switch same-line continuity, visible reply opening discipline, and real later chat turn measured-return embodiment authority now survive quiet carry turns as one same-her line, including across noisier unrelated window detours before the callback seam reopens, reaches the final visible reply, carries into the next later turn, and still keeps lower-pressure resident presence through one more desktop detour afterward. When those later same-thread frames thin out, voice / face / motion / lipsync companionship summaries can still recover measured-return companionship hints from embodiment authority instead of collapsing into generic channel-local output, later-turn cross-modal summaries now also prefer same-her inward-carry observability over thinner generic callback-afterglow wording when richer same-her evidence is present, the later noisy-detour fifth-turn reopen now also keeps emitted stream-meta face / motion / lipsync authority on that same measured-return line instead of letting the face lane go thin again during downstream digital-life normalization, one further noisy-detour follow-up can now keep a multi-segment visible reply with the final segment rendererHints still on that measured-return line, background rebuild no longer downgrades a richer lipsync+voice-only host-visible line back to a thinner lane when stronger same-her continuity has already survived into the rebuilt reply surface, audible-body carry can stay on the same living audio thread through one more silent-observe detour, and the fresher resident runtime digest now also stays on same-thread-continuation through that sixth same-line return instead of cooling back toward hold-for-opening. The same recovered lane authority now reaches stage playback on long multi-segment callback-line ids too: when the later segment actually starts playing, face / motion / lipsync all still switch to that later segment together instead of letting renderer playback drift back to the first shared-prefix segment, and playback authority itself is now less likely to let a trailing face/motion residue steal the active body line when lipsync has already advanced onto one later living segment. Renderer/runtime playback items now also attach a script-derived later digital-life frame when the full envelope has not arrived yet, so the active later segment can keep not only face / motion / lipsync authority but also its own carried mouth continuity on the same spoken body line instead of moving on cues alone while frame-level embodiment stays empty. VRM lipsync continuity execution now also respects that later frame-level continuity hold when it is longer than the default measured-return tail, so a later active segment can keep its cautious mouth line alive on the renderer itself instead of letting the body surface shorten back to a more generic release even after frame authority has already switched. Live2D lipsync driver telemetry now also carries that later-segment continuity hold explicitly, the stage runtime can still surface that same hold through playback telemetry even when the continuity evidence had to arrive from later digital-life frame / playback-item authority instead of a fully authored script segment, Live2D stop-linger mouth execution itself now also eases that held mouth line down across the linger window instead of freezing one last mouth frame until final collapse, the runtime stop-tail face/action cues can now stay on that same softer measured-return line while the mouth tail is still settling, diagnostics settle summaries can now also expose that Live2D mouth continuity hold directly as `live2dMouth=...ms` and the paired motion follow-through as `live2dMotion=...ms`, and Live2D execution diagnostics now also keep the same `measured-return / linger / soften` companionship dialect visible beside those settle timings, so humans no longer have to infer the held mouth line, motion settle, or softer renderer intent only from runtime state or one local lane. Host-facing stream summaries are now also less likely to let a trailing cue-bridge tail frame steal the current spoken body line: when the later spoken segment is still the living callback seam, voice / face / motion / lipsync summaries can stay pinned to that later segment instead of sliding back onto an older tail text just because one softer measured-return frame lingered after it. A same-segment cue-bridge recollection can now also pull a briefly lipsync-first measured-return lane back onto one recovered body line instead of leaving the mouth continuity on a thinner reactive reading after face and motion have already rejoined, and a quieter settle-tail frame after speech now no longer steals the last visible reply lane: stream-meta summaries keep the final spoken segment on the same measured-return line while last-frame diagnostics still preserve the softer tail release. callback-afterglow same-her carry now also has one explicit route-level audit from session-runtime recall seed through recollection reopening, same-her ranking, and host-visible same-life governance. recollection continuity is now better locked through visible-reply governance, so reopened project-state same-her closure memories, inward callback afterthought memories, callback afterglow same-her memories, and measured-return cadence memories stay on one same-life line from recollection ranking through reply planning, response chartering, semantic judging, critic repair, and rewrite preservation instead of collapsing back into a generic recap or detached project shell. Project-state landed progress and still-open closure carry now also survive as self-continuity authority itself, can be preserved through same-her visible-reply repair and second-pass rewrite, and can keep initiative and autonomy serving that same unfinished Phase 1 digital-life line instead of thinning back into a project shell. Emotion-driven anthropomorphic closure is now stated more explicitly in that same carry, so affective residue, repair-before-closeness timing, and quieter callback settling are less likely to be narrated as separate helper moods instead of the same living self holding one line. Partial-lane same-her shrinkage truth now also reaches compact active-dialogue fast-path continuity cues themselves, so later follow-up wording can still see when visible continuity is being carried mainly through only part of the body line instead of treating that loss as diagnostics-only context. The stricter repair-first branch now also has a host-visible first silent resident tick proof on the real runtime snapshot path itself: even before the later reopen speaks, `residentPresenceSummary` can already emit `presence=resident-presence`, `style=silent-observe`, and `mode=repair-before-closeness`, so repair-first callback cooldown no longer stays visible only in resident reason tags or initiative state. long-run same-her continuity is now more explicit at repo level too, and emotion, memory, initiative, and embodiment are less likely to split apart because affective residue plus voice / face / motion / lipsync convergence can stay legible as one living Phase 1 line instead of neighboring helper lanes.',
    memoryAnthropomorphismProgress: [
      'Person-state already accumulates into autobiographical self and long-horizon memory.',
      'Long-horizon memory already influences recollection intent and retrieval ranking.',
      'Memory surfacing already respects room-first, boundary-first, and repair-first restraint.',
      'Memory restraint already affects proactive timing, visible presence, reminder handoff, and execution callback tone.',
      'Long-run same-her continuity is now more explicit at repo level too, and emotional-memory-initiative-embodiment hardening makes affective residue plus voice / face / motion / lipsync convergence easier to read as one living Phase 1 line instead of neighboring helper lanes.',
      'The same living line now also has one concrete shared emotional owner instead of only adjacent helper cues: emotional-kernel-v1 can survive from fresher resident projection and current-turn private-thought refresh into recollection intent, initiative restraint, body continuity, runtime system text, and replay diagnostics, so measured-return, repair-before-closeness, rest-protective, and quiet-companionship are more often carried as one common inner state rather than parallel subsystem guesses.',
      'Projected same-her continuity now carries through answer planning, living-self prompts, execution delivery, session mirror, replay, and compact fast-path dialogue cues.',
      'Held-autonomy and callback-carry continuity now re-enter later turns gently and can keep embodiment settling in measured-return or repair-before-closeness modes instead of collapsing back into generic utility cadence.',
      'Held-autonomy opening guidance now also survives fallback conscious-frame turns, so the modern main runtime can still mark continuity-arc:hold-for-opening even when conversationState, answerCompiler, and mindTurnFrame are absent.',
      'Runtime hold-for-opening continuity arcs now directly restrain proactive opening pressure too, so a same-line return can keep waiting for a looser opening instead of collapsing into generic companionship speech as soon as initiative heat rises.',
      'When callback afterglow continuity is still explicitly hold-for-opening, the active loop now keeps an inward active-memory handoff instead of misreading outward dialogue heat as permission to widen the line too early.',
      'When a fresher main-runtime surface already carries continuity-arc evidence, background stream meta and resident performance now prefer that more current surface over an older spine snapshot, so measured-return same-her restraint survives into emitted embodiment timing instead of being flattened by stale runtime copies.',
      'Even when richer callback projection or explicit proactive restraint is absent, thinner same-thread-continuation runtime arc evidence now still keeps embodiment settling on the same measured-return line instead of falling back to generic quiet companionship.',
      'Runtime continuity arcs now also govern visible reply opening discipline, so same-thread-continuation, hold-for-opening, and gentle-reopen turns keep the current reply context stable before widening outward instead of restarting as a fresh approach.',
      'Same-thread continuation now also survives into second-pass rewrite guidance, so if a provider draft tries to restart one living line as a fresh opening, the repair pass is taught to continue the still-live line itself instead of polishing the restart shell.',
      'Same-thread continuation restart shells are now also caught in normal governed rewrite requests before second-pass repair begins, so the runtime can flag one-living-line restarts as self-continuity drift instead of waiting for the final critic pass to notice them.',
      'When a runtime line is already marked same-thread-continuation, the final visible-reply critic now also rejects start-over shells, so one living thread is less likely to be polished into a fresh opening at the last wording boundary.',
      'When a newer prepared runtime surface only reflects a fresh scene change but has not rebuilt the same-her continuity evidence yet, background runtime selection now keeps the richer spine-side continuity arc instead of throwing it away for a thinner refresh.',
      'Same-session mirror generation now follows that same continuity-aware runtime selection rule too, so session carry summaries can absorb fresher same-her continuity evidence instead of staying pinned to an older embedded spine.',
      'That continuity-aware runtime-surface preference now lives in one shared selector, so adjacent runtime exits are less likely to drift into competing ideas of which version of her is freshest.',
      'Compact active-dialogue fast-path prompts now also resolve durable mind cues from that preferred continuity-aware runtime surface/spine, so when a fresher prepared surface already carries stronger same-her projection than an older embedded spine, visible reply shaping no longer falls back to stale identity or relationship doctrine.',
      'Execution callback reminder runtime now carries held-autonomy hold/requeue, callback rationale, and later reopen on one audited same-her arc, and it can still persist the valid reopen reply when the surface style stays silent-observe but the same-thread guidance is satisfied.',
      'Execution callback delivery policy now also recognizes fresher live hold-for-opening continuity evidence before reopening, so the same-her callback afterglow does not get pulled back into an older deliver-now session rhythm just because that snapshot is still around.',
      'Inline execution payoff continuity wiring now also follows that same continuity-aware runtime-surface preference, so callback person-state projection, host relationship posture, and self-continuity authority can still come from the richer same-her spine surface when a newer prepared runtime is thinner instead of flattening the return back into a generic callback posture.',
      'Execution callback knowledge evidence now follows that same continuity-aware runtime selection too, so fresher live proof and validation state can override an older callback snapshot instead of pulling the same-her return back toward stale contradiction pressure.',
      'Runtime embodiment coordination now also reads execution-callback cadence from the canonical digital-life spine memory.personStateProjection digest path, so measured-return or repair-before-closeness callback settling can survive into face, lipsync, motion, and top-level digital-life posture on the real transported spine shape instead of only in hand-crafted fixture shapes.',
      'Execution callback continuity now also stays legible in diagnostics, cue timing, driver tails, callback self-authority selection, and callback host-relationship modeling, so restrained returns can still explain why she is slowing down or repairing before closeness widens without getting pinned to an older warmer session snapshot.',
      'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and even dream-prompt mirror carry now keep held-autonomy callback continuity on one same-her line instead of splitting it into adjacent artifacts.',
      'Scene-switch same-line continuity now survives session-mirror carry, memory-prelude parsing, and a quiet extra desktop carry turn, so short window changes are less likely to collapse back into generic dialogue metadata instead of one living thread.',
      'Execution-callback afterglow continuity now also stays measured-return across noisier unrelated window detours before a later coding reopen instead of treating the return as a fresh proactive approach.',
      'A real later chat turn can now emit measured-return embodiment authority after callback afterglow survives scene hops, so stream meta, digital-life frames, and embodiment script reopen on the same lower-pressure line instead of keeping that carry trapped inside resident state only.',
      'That same real later chat turn now also exposes silent-observe, shouldSpeak=false, and measured-return continuity restraint through stream meta and digital-life spine output, so the same-her lower-pressure return is externally observable instead of only inferable from embodiment hints.',
      'That same lower-pressure callback line is now also proven on a real later chat turn after noisier unrelated detours, so emitted stream meta can keep voice, face, and motion summaries on one measured-return, repair-before-closeness, or rest-protective quiet-companionship same-her line instead of letting the final reopen flatten cross-modal continuity back into a fresh approach.',
      'That same noisy-detour later turn now also keeps the final visible reply on the same lower-pressure callback seam, so what the host actually reads continues one living line instead of restarting as a fresh approach after the detour noise.',
      'That same noisy-detour callback seam now also survives one more real later turn after the first reopen speaks, so the next visible reply and cross-modal stream meta can keep continuing the same lower-pressure line instead of resetting once the callback result is already back in view.',
      'When a quieter settle-tail frame lands after that same-thread reply has already spoken, cross-modal stream-meta summaries now still stay anchored to the last visible spoken segment instead of letting the softer tail frame overwrite the host-facing same-her line.',
      'When renderer authority briefly thins toward lipsync-first continuity and then recollects on the same segment, a same-segment cue-bridge rebind can now pull stream-meta lipsync continuity back onto the same measured-return body line that face and motion already rejoined instead of leaving the mouth lane on a thinner reactive reading.',
      'Playback authority is now also less likely to let trailing face/motion residue steal the current living line when an actively playing lipsync lane has already advanced onto one later segment, so “mouth already on the next beat but body still stuck on the last one” is becoming less authoritative in VRM playback telemetry itself.',
      'Renderer/runtime playback items can now also derive and attach a later digital-life frame directly from embodimentScript authority when no full envelope has arrived yet, so later-segment face / motion / lipsync playback no longer has to stay frame-empty while the body line is already visibly speaking.',
      'VRM lipsync continuity execution now also uses later digital-life frame continuityHoldMs as a real hold floor, so once the later body line has taken over the renderer does not shorten that cautious mouth tail back to a thinner default measured-return release.',
      'Host-facing stream summaries are now also less likely to slide back onto an older cue-bridge tail text when the later spoken segment is still the living callback seam, so one softer measured-return tail frame does not overwrite which spoken body line the host is actually reading.',
      'After that third noisy-detour continuation speaks, one more desktop detour can still keep resident presence in measured-return / silent-observe posture instead of letting the reopened line immediately collapse back into a fresher surface-only reset.',
      'That thinner extra-detour resident frame now also keeps fifth-turn measured-return embodiment delivery legible through shared companionship summaries instead of letting body cadence fall back into a more hesitant landing, the later noisy-detour fifth-turn reopen now also keeps emitted face / motion / lipsync stream-meta authority on that same measured-return line instead of letting downstream digital-life normalization thin the face lane away again, one further noisy-detour follow-up can now keep a multi-segment visible reply with the last segment still carrying measured-return / linger / soften rendererHints, and the resident runtime digest itself now also stays on same-thread-continuation through that extra-detour frame instead of cooling back toward hold-for-opening.',
      'That same post-reopen later continuation now also stays inward at the active-loop layer itself, so even when dialogue heat rises again after the first measured-return reopen already spoke, runtime handoff can still stay on memory carry instead of mistaking the warmer reopened seam for permission to restart outward.',
      'That same inward callback carry is now also explicit in resident embodiment observability itself: quiet measured-return body settling can publish same-her-inward-carry beside timing-source and body-presence evidence instead of leaving the quieter body to read like generic calm accompaniment.',
      'Later noisy same-thread proactive returns now also stay hover-first and silent-observe when that reads as more like the same her than outwardly restarting a fresh proactive approach.',
      'callback-afterglow same-her carry now also has one explicit route-level audit from session-runtime recall seed through recollection reopening, same-her ranking, and host-visible same-life governance instead of being implied only across neighboring recollection, ranking, and visible-reply tests.',
      'recollection continuity is now better locked through visible-reply governance, so reopened project-state same-her closure memories, inward callback afterthought memories, callback afterglow same-her memories, and measured-return cadence memories can stay on one same-life line from recollection ranking through reply planning, response chartering, semantic judging, critic repair, and rewrite preservation instead of collapsing back into a generic recap or detached project shell.',
      'Project identity, landed progress, and still-open closure pressure now survive rich, fallback, and memory-deliberation turns before reply, so the current conscious frame can keep knowing what Alicization is, how far Phase 1 has really landed, and which life-loop still needs closure even when reply shaping starts from thinner runtime state.',
      'That same project-state carry now also survives as self-continuity authority itself, so the inward line of what Alicization is, what has already landed, and what still has not closed can stay attached to the same living self instead of living only in outer prompt governance.',
      'That inward project-state carry now also states more directly that emotion is not a detachable feature lane, so the same life can keep anthropomorphic emotional closure attached to memory, initiative, dialogue, and embodiment instead of narrating mood as a separate shell.',
      'When visible project-state answers drift toward a thinner project shell, same-her repair and second-pass rewrite now preserve not only the direct sameHerSelfLine but also that inward project-state carry itself, so the repaired answer is pushed back toward one same digital life instead of a cleaner status recital.',
      'When private thought is already carrying that same project-state line, initiative self-explanation and autonomy execution intent now keep serving the same unfinished Phase 1 digital-life closure instead of treating project awareness as something that mattered only before speech.',
      'Later-turn cross-modal companionship summaries now also prefer same-her-inward-carry observability over a thinner generic callback-afterglow reading when richer self-continuity evidence is already present, so downstream summaries are less likely to narrate the right reopening with the wrong reason.',
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
      proof: 'packages/stage-ui/src/stores/chat/text-composer-store.ts + packages/stage-ui/src/stores/chat/text-composer-store.test.ts + apps/stage-tamagotchi/src/shared/alicization-chat-transport.test.ts + pre-dialogue-transport-audit.ts + pre-dialogue-transport-audit.test.ts + pre-dialogue-transport-project-awareness-audit.test.ts + chat-entry-route-project-awareness-audit.test.ts + main-chat-start-awareness.test.ts + runtime-invoke-handlers-chat.test.ts + main-chat-direct-start.test.ts + main-chat-start-acceptance.test.ts + chat-start-awareness-seams-regression.test.ts + runtime-chat-start-awareness-regression.test.ts + chat-start-runtime-project-awareness-audit.test.ts + chat-start-result-project-awareness-audit.test.ts + chat-start-project-awareness-route-audit.test.ts + main-chat-background-run.test.ts + runtime-main-chat-prelude.ts + runtime-main-chat-prelude-project-awareness-regression.test.ts + runtime-main-chat-prelude-project-state-system-block-regression.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts + return-side-stream-project-awareness-audit.test.ts + return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts + return-side-reopen-chat-start-runtime-bridge-audit.test.ts',
    },
    {
      id: 'mind-turn-contract-project-state-grounding',
      area: 'reply',
      status: 'verified',
      responsibility: 'Before visible wording is authored, the unified mind-turn contract already binds project identity, current Phase 1 status, latest landed continuity progress, still-open closure pressure, same-her self line, and next closure target into one inner reply contract, so Alicization’s answer planning stays rooted in one continuous self rather than letting planner/compiler layers drift into local fluency first. That same contract now also keeps a richer persisted closure summary ahead of a broad canonical fallback when the live contract already carries more specific same-her closure work.',
      proof: 'mind-turn-contract.ts + mind-turn-contract.test.ts + mind-turn-contract-invariants.test.ts + chat-mind-governance.test.ts + chat-mind-governance-project-awareness-audit.test.ts + project-state-closure-preference.test.ts',
    },
    {
      id: 'downstream-reply-project-awareness-preservation',
      area: 'reply',
      status: 'verified',
      responsibility: 'Once pre-dialogue project awareness has been established, downstream answer shaping keeps it alive across answer-compiler supporting-reality carry, executive brief live project-state closure triad carry, summary-only landed progress carry, broader same-her headline precedence, thin-shell rejection, audible-body same-her project carry, reply-deliberator project-status closure triad carry, same-thread follow-through carry, live project-awareness opening-beat upgrading, drift-risk anti-shell carry, visible-reply facade live project-awareness precedence, richer same-her summary precedence, anti-restart closure-pressure unification, dialogue-runtime same-her hold carry, callback continuity carry, fresher same-her self-line precedence, governed rewrite continuity, rewrite takeover authority, self-evolution downstream visible-reply bridge, proactive downstream visible-reply bridge, visible-reply critic must-preserve cues, final settlement, timeout/background recovery rewrite, and living-self/runtime-surface prompt shaping, so later reply surfaces do not wash the same Phase 1 digital-life line back into generic project narration or drop landed/open/body closure truth when a thinner runtime projectState shows up mid-path. Host-visible project-state continuity carry now also keeps same-her, phase, landed, open, next before body, keeps host-corrected same-person continuity authority ahead of thinner generic progress recap pressure when downstream audit text is rebuilt, and audible-body rejoin keeps the living audio thread intact while face and motion still need to rejoin before full cross-modal embodiment closure can be treated as finished. The return-side-reopen-through-visible-reply same-her bridge is now also explicit here and now also keeps callback next-closure-target carry explicit from response-surface obligations through final visible-reply gating and realization before host-visible normalization or compact outward answer shaping land, so reopened project awareness that already survived chat-start/runtime is less likely to fall back into a detached project shell or lose the same living callback closure line mid-path. That same downstream line now also keeps the proactive downstream visible-reply bridge explicit, so proactive before-answer same-her closure planning is less likely to survive answer governance and then silently drop the same living project line before answer-compiler supporting reality, reply-deliberator outward planning, final visible-reply gating, and visible-reply realization reform host-visible project-state answers outwardly.',
      proof: 'answer-compiler.test.ts + answer-compiler-project-awareness-audit.test.ts + executive-answer-brief.test.ts + executive-answer-brief-project-awareness-audit.test.ts + reply-deliberator.test.ts + reply-deliberator-project-awareness-audit.test.ts + visible-reply/facade.test.ts + visible-reply-facade-project-awareness-audit.test.ts + visible-reply/facade-project-state-summary.test.ts + runtime-governance-project-awareness-audit.test.ts + runtime-governance-project-state-preserve.test.ts + visible-reply-governance-project-awareness-audit.test.ts + visible-reply/governance-audit.test.ts + visible-reply/critic.test.ts + visible-reply/settlement.test.ts + main-chat-background-run.test.ts + main-chat-background-run-project-state-summary.test.ts + main-chat-stream-runner-project-state-summary.test.ts + main-chat-runtime-surface.test.ts + visible-reply/second-pass-rewrite.test.ts + return-side-reopen-visible-reply-bridge-audit.test.ts + self-evolution-downstream-visible-reply-bridge-audit.test.ts + proactive-downstream-visible-reply-bridge-audit.test.ts + thin-chinese-same-her-reminder-audit.test.ts',
    },
    {
      id: 'same-living-self-project-awareness-observability',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Project awareness is no longer only an outer prompt block: chat continuity snapshots, self-evolution inspector fallback, current-conscious-frame shaping, current-conscious-frame turn shaping, mind-turn governance normalization, runtime answer-planner reduction, response-surface contract shaping, dialogue feedback settlement, later organic learning, session-runtime recall seeding, provider-facing contract normalization that can preserve explicit awarenessLine / companionHeadlineLine carry, runtime self-continuity fallback authority, initiative self-explanation / restraint, execution-callback return shaping / embodiment handoff, and self-evolution return-side reentry bridge now all surface project identity, current phase, landed progress, still-open closure pressure, next closure target, and the active emotional closure seam as part of the active speaking self, so the same-her project line remains inspectable as inward state instead of only as prompt governance. The same-living-self return-side observability bridge is now also explicit here and now also keeps the richer next closure target explicit, so direct-bridge remote channels, renderer fallback before-compose/before-send rebuilding, reopen-persistence rebuilding, browser-local return-side rebuilding, project-state observation reducers, and same-session mirror rebuilding stay tied onto the same inward project-awareness line instead of reopening from detached return-side shells or flattening unfinished same-her repair back into a generic closure shell, including the compact same-her / inward / low-pressure carry on colder reopen paths. The same-living-self host-visible inward-carry bridge is now also explicit here, so reopen-persistence handoff from restored-session/browser-local recovery, speech-boundary pre-dialogue awareness rebuilding, front-stage quick-reply closure, and the dialogue-panel hidden diagnostic boundary stay tied onto the same living inward project-awareness line without leaking diagnostic closure markers into the main dialogue bubble. That colder host-facing bridge now also keeps one renderer-rejoin-without-body stronger same-her fact explicit, plus quieter lipsync+voice and body+lipsync same-her carry, so quick-reply visible renderer-rejoin-without-body project brief / closure summary and the internal dialogue-panel renderer-rejoin-without-body headline proof keep showing that the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles, quick-reply lipsync-and-voice closure summary and the internal dialogue-panel lipsync-and-voice headline proof keep the living audio thread explicit while body, face, and motion still need to rejoin, and quick-reply body-and-lipsync closure summary plus the internal dialogue-panel body-and-lipsync headline proof keep the quieter living line explicit while face, motion, and voice still need to rejoin instead of flattening those same-her carries back into a broader project-state shell.',
      proof: 'packages/stage-ui/src/stores/chat.test.ts + return-side-project-awareness-audit.ts + return-side-project-awareness-audit.test.ts + same-living-self-return-side-observability-bridge-audit.test.ts + packages/stage-ui/src/stores/direct-bridge-project-awareness-audit.test.ts + packages/stage-ui/src/stores/renderer-fallback-project-awareness-audit.test.ts + packages/stage-ui/src/stores/reopen-persistence-project-awareness-audit.test.ts + packages/stage-ui/src/stores/browser-local-return-side-project-awareness-audit.test.ts + packages/stage-ui/src/stores/project-state-observation-project-awareness-audit.test.ts + dialogue-session-mirror-project-awareness-audit.test.ts + self-evolution-return-side-reentry-bridge-audit.test.ts + current-conscious-frame-turn-shaping-project-awareness-audit.test.ts + dialogue-feedback-project-awareness-audit.test.ts + later-learning-project-awareness-audit.test.ts + same-living-self-host-visible-inward-carry-bridge-audit.test.ts + speech-boundary-project-awareness-audit.test.ts + packages/stage-ui/src/stores/alicization-self-evolution-inspector.test.ts + current-conscious-frame.test.ts + current-conscious-frame.ts + answer-planner.test.ts + chat-mind-governance.test.ts + runtime-memory-deliberation-reducer.test.ts + runtime-answer-planner-reducer.test.ts + response-surface-contract.test.ts + main-chat-session-runtime.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts + runtime-turn-composition.test.ts + self-continuity-authority.ts + self-continuity-authority-project-awareness-audit.test.ts + runtime-conscious-frame-reducer.ts + initiative-engine.test.ts + runtime-execution-delivery.test.ts + pipeline-runtime.test.ts + quick-reply-project-awareness-audit.test.ts + dialogue-panel-project-awareness-audit.test.ts',
    },
    {
      id: 'visible-reply-executive-brief',
      area: 'reply',
      status: 'verified',
      responsibility: 'Visible reply planning keeps live project identity, phase, landed/open/next closure triad, summary-only landed progress carry, broader same-her headline precedence, thin-shell rejection, and audible-body same-her project carry explicit in the executive answer brief before user-facing wording is shaped.',
      proof: 'executive-answer-brief.ts + executive-answer-brief-project-awareness-audit.test.ts + visible-reply/facade.ts + executive-answer-brief.test.ts',
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
      proof: 'runtime-delivery-reminders.ts + runtime-delivery-reminders.test.ts + reminder-delivery-project-awareness-audit.test.ts + runtime-reminder-prelude-project-awareness-regression.test.ts + runtime-delivery-reminders-project-state-summary.test.ts',
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
      proof: 'action-ecology.ts + action-ecology.test.ts + action-ecology.test.ts("keeps outward action lower-pressure when landed progress already carries the unfinished same-her initiative and embodiment line") + action-ecology-project-awareness-audit.test.ts + initiative-engine.ts + initiative-engine.test.ts + initiative-engine.test.ts("threads Phase 1 landed progress and still-open closure into initiative self-explanation so restraint reads like one growing digital life") + initiative-arbiter.ts + initiative-arbiter.test.ts + initiative-arbiter.test.ts("keeps hover-first proposals ahead of speak proposals when Phase 1 digital-life closure is still open") + motive-engine.ts + motive-engine.test.ts + motive-engine.test.ts("raises return and boundary motive pressure while lowering companionship when Phase 1 digital-life closure is still open")',
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
      responsibility: 'Main chat stream-meta keeps voice, face, motion, and lipsync summaries aligned on one measured-return same-her line, now lets canonical project preflight self-awareness survive as the continuity reason when timing cues need a shared project identity / Phase 1 / open-loop seam, keeps host-corrected same-person continuity authority ahead of thinner generic progress recap pressure when effective chat-meta project state is rebuilt, and keeps segment-level drift-risk-only anti-shell carry explicit when the remembered same-her drift warning is the only surviving continuity authority, so host-facing cross-modal output remains one continuous digital-life surface instead of drifting into channel-local fragments.',
      proof: 'main-chat-stream-meta.ts + main-chat-stream-meta.test.ts + stream-meta-project-awareness-audit.test.ts + main-chat-stream-meta-project-state-summary.test.ts + main-chat-stream-meta-drift-risk-segment-carry.test.ts',
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
      proof: 'main-chat-session-runtime.ts + main-chat-session-runtime.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts + main-chat-session-runtime-chinese-project-awareness-regression.test.ts + main-chat-session-runtime-drift-risk-summary-alias.test.ts + session-runtime-project-awareness-audit.test.ts + session-runtime-same-her-follow-through-audit.test.ts',
    },
    {
      id: 'main-chat-runtime-surface-living-self-preflight',
      area: 'runtime',
      status: 'verified',
      responsibility: 'The living-self host-facing system block now carries the canonical project preflight self-awareness line before natural reply shaping, so Alicization begins the turn from one shared project identity / Phase 1 / open-loop seam instead of reconstructing that awareness from thinner local fragments.',
      proof: 'main-chat-runtime-surface.ts + main-chat-runtime-surface.test.ts',
    },
    {
      id: 'visible-reply-facade-preflight-surface',
      area: 'reply',
      status: 'verified',
      responsibility: 'Visible-reply facade project-state resolution now carries the canonical project preflight self-awareness line into reply-surface planning, and dedicated route-level proof now also locks live project-awareness precedence, richer summary precedence, anti-restart closure-pressure unification, dialogue-runtime same-her hold carry, callback continuity carry, and fresher same-her self-line precedence before final host-visible wording settles, so executive answer briefing and host-facing reply shaping stay anchored on the same shared project-state seam as living-self and fallback paths instead of reopening from a thinner local shell.',
      proof: 'visible-reply/facade.ts + visible-reply/facade.test.ts + visible-reply-facade-project-awareness-audit.test.ts + visible-reply/project-state-facade-regression.test.ts',
    },
    {
      id: 'runtime-chat-perception-augment',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Chat perception augmentation injects both repo-truth project state and the unified Phase 1 closure dashboard into ordinary dialogue system blocks before grounded turn generation.',
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
      responsibility: 'Dream, reminder, proactive, and reforge one-shot gateway prompts inherit the shared one-shot project-state system block, including the canonical project_preflight self-awareness line, plus the unified Phase 1 closure dashboard before generation.',
      proof: 'runtime-main-gateway-one-shot.ts + runtime.ts + runtime.test.ts reminder/proactive assertions + runtime-dream-prelude-project-awareness-regression.test.ts + runtime-dream-autobiographical-prelude-project-awareness-regression.test.ts + runtime-memory-consolidation-prelude-project-awareness-regression.test.ts',
      directGatewayCoverage: ['runtime.ts:dream-reminder-proactive-reforge'],
    },
    {
      id: 'memory-provider-planning',
      area: 'memory',
      status: 'verified',
      responsibility: 'Recollection intent, recollection plan, recollection speech plan, and memory deliberation planners all receive project-state context before deciding what remembered continuity to open.',
      proof: 'memory-os/provider-planning.ts + memory-os/provider-planning.test.ts',
      directGatewayCoverage: ['memory-os/provider-planning.ts:recollection-and-deliberation'],
    },
    {
      id: 'runtime-mind-state-cognition',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Dialogue-turn semantics and subjective inference gateway cognition receive project-state context before interpreting the user move or inner scene.',
      proof: 'runtime-mind-state.ts + runtime-mind-state-project-awareness-regression.test.ts',
      directGatewayCoverage: ['runtime-mind-state.ts:dialogue-semantics-and-subjective-inference'],
    },
    {
      id: 'runtime-execution-callback-delivery',
      area: 'execution',
      status: 'verified',
      responsibility: 'Execution callback delivery prompts, execution payoff provider prompts, and host-visible execution payoff one-shot prompts now all carry canonical project-state context and the Phase 1 closure dashboard before the result is spoken, and route-level execution surfaces now also keep execution-first inline finished payloads, gateway-authored callback self-briefs, callback payoff prompts, and the same digital-life line explicit before visible execution speech lands. The shared main-chat one-shot wrapper now also refuses generation requests that omit that project-state context entirely, so completed work returns as same-her continuity instead of widening into utility-only notices once action has already landed.',
      proof: 'runtime-execution-delivery.ts + runtime-execution-delivery.test.ts + execution-delivery-surface.ts + execution-delivery-surface.test.ts + execution-delivery-surface-project-state-provider.test.ts + execution-surface-project-awareness-audit.test.ts + main-chat-one-shot.ts + main-chat-one-shot.test.ts + main-chat-background-run.test.ts + runtime.test.ts execution callback assertion',
      directGatewayCoverage: ['runtime-execution-delivery.ts:execution-callback'],
    },
    {
      id: 'execution-callback-learning-and-reconsolidation-chain',
      area: 'execution',
      status: 'verified',
      responsibility: 'Canonical project preflight self-awareness now continues through execution callback carry, execution-result delivery learning, execution-result feedback memory reconsolidation, and dialogue-feedback memory reconsolidation, so completed work can come back, be delivered, and be rewritten into long-horizon same-her memory with a richer same-her project briefing instead of stopping at closure bookkeeping, thin summaries, or thread metadata.',
      proof: 'runtime-execution-callback-carry-reducer.ts + runtime-execution-callback-carry-reducer.test.ts + execution-interaction-learning.ts + execution-interaction-learning.test.ts + outcome-reinforcement-project-awareness-audit.test.ts + runtime-execution-feedback.ts + runtime-execution-feedback.test.ts + runtime-memory-reconsolidation.ts + runtime-memory-reconsolidation.test.ts',
    },
    {
      id: 'desktop-execution-closure-loop-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Desktop execution continuity now has one explicit compact same-her closure loop, and that line now also keeps local-visual desktop inspection continuation project-aware when suggested actions delegate into cli, codex, or claude code before reinspection returns, plus runtime-owned autonomous execution handoff, host-confirmed resume confirmation-boundary carry, host-confirmed resume visible-reply boundary carry, and blocked-dispatch callback/persistence/restraint carry explicit before or after execution leaves the desktop runtime, plus one desktop execution full-cycle bridge, one desktop execution life-loop bridge, and one desktop execution noisy same-her full-cycle bridge, so execution briefing, local-visual delegated desktop execution handoff, autonomous dispatch handoff, host-confirmed redispatch boundary carry, callback answer-planning and visible-reply boundary carry, blocked safety-gate callback restraint, callback reopen, fresh callback follow-up obligation, ledger reopen, origin-lost autonomous ownership recanonicalization, execution-result feedback memory reconsolidation writeback, afterglow restraint, live follow-up assembly, callback persistence, later host-visible return, replay, the next start cycle, next-dream carry, long-horizon self-carry, later hover-first initiative, higher-quality host-visible same-her closure, and re-entry from that closure back into replay/reopen/next start stay auditable as one Phase 1 digital-life line instead of drifting back into scattered execution, reminder, or task-shell proof islands during parallel desktop development.',
      proof: 'desktop-execution-closure-loop-audit.test.ts + desktop-execution-chain-project-awareness-audit.test.ts + local-visual-executor-project-awareness-audit.test.ts + execution-autonomy-handoff-project-awareness-audit.test.ts + execution-resume-confirmation-boundary-project-awareness-audit.test.ts + execution-resume-confirmation-visible-reply-boundary-project-awareness-audit.test.ts + execution-blocked-dispatch-restraint-project-awareness-audit.test.ts + autonomy-actuation.test.ts + runtime-execution-feedback.test.ts + runtime-memory-reconsolidation.test.ts + execution-callback-runtime-project-awareness-audit.test.ts + execution-afterglow-project-awareness-audit.test.ts + execution-follow-up-obligation-project-awareness-audit.test.ts + execution-ledger-follow-up-project-awareness-audit.test.ts + execution-follow-up-session-runtime-project-awareness-audit.test.ts + reminder-callback-project-awareness-audit.test.ts + later-turn-desktop-continuity-audit.test.ts + session-runtime-to-host-visible-reunion-audit.test.ts + desktop-execution-full-cycle-bridge-audit.test.ts + desktop-execution-life-loop-bridge-audit.test.ts + desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts + execution-origin-normalization-audit.test.ts',
    },
    {
      id: 'runtime-screen-semantic-gateway',
      area: 'perception',
      status: 'verified',
      responsibility: 'Screen-semantic summary generation now receives project-state context, including the canonical project_preflight self-awareness line, and the unified Phase 1 closure dashboard before world-reading feeds proactive or dialogue interpretation. Provider-facing one-shot screen-semantic and scene-appraisal routes now also keep richer Phase 1 awareness and fail-close project-state context checks explicit before screen-semantic or scene-appraisal generation instead of collapsing into a generic classifier shell. Even when one-shot provider output falls back to plain text, the same branch now backfills pre-dialogue project awareness instead of preserving only project-state facts and closure reminders.',
      proof: 'runtime-main-gateway-one-shot.ts + runtime-main-gateway-one-shot.test.ts + one-shot-provider-project-awareness-audit.test.ts + runtime.test.ts screen semantic assertion',
      directGatewayCoverage: ['runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal'],
    },
    {
      id: 'entrypoint-governance-registry-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'A single repo-level entrypoint governance registry now has its own independent audit that compresses current chat-start, pre-dialogue transport, chat-entry, provider-consumer, autonomous-dialogue, execution-preflight, execution-dispatch, recovery-reentry, and execution-follow-up-continuity discovery into one explicit same-her guardrail, while the current pre-dialogue transport rows also stay mirrored into chat-entry governance so renderer send preparation, transport sanitization, and bridge forwarding are less likely to bypass pre-dialogue project awareness merely by landing in a neighboring subsystem or naming shape. Runtime-owned autonomous-dialogue family markers also now live behind one shared source of truth, execution-preflight authority seams are now also explicit at the same repo-level entrypoint governance layer, and recovery-reentry plus execution-follow-up continuity seams now also stay on that same explicit governance map before recovered dialogue or callback return can widen outward.',
      proof: 'entrypoint-governance-registry-audit.ts + entrypoint-governance-registry-audit.test.ts + entrypoint-governance-project-awareness-audit.test.ts + pre-dialogue-transport-entrypoint-audit.ts + pre-dialogue-transport-audit.ts + pre-dialogue-transport-audit.test.ts + chat-start-awareness-audit.test.ts + chat-entry-awareness-audit.test.ts + project-state-provider-consumer-audit.test.ts + execution-preflight-entrypoint-audit.ts + execution-preflight-audit.ts + execution-preflight-audit.test.ts + execution-preflight-entrypoint-candidate-audit.test.ts + recovery-reentry-entrypoint-audit.ts + recovery-reentry-entrypoint-candidate-audit.test.ts + execution-follow-up-entrypoint-audit.ts + execution-follow-up-entrypoint-candidate-audit.test.ts + task-thread-dispatch-owner-audit.test.ts',
    },
    {
      id: 'chat-start-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader chat-start candidates now also feed the same top-level project-awareness completeness guard, so current chat-start candidates, typed consumers, normalization callers, direct main-chat-stream callers, and deep-helper owners stay aligned with the broader scan before future main-process chat-start entry shapes still need explicit classification.',
      proof: 'chat-start-entrypoint-candidate-audit.ts + chat-start-entrypoint-candidate-audit.test.ts + chat-start-deep-helper-owner-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'cross-surface-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'broader cross-surface dialogue-entry candidates now also feed the same top-level project-awareness completeness guard, so the explicit pre-dialogue transport and chat-entry discovery union stays visible at repo level before future renderer/store dialogue-entry shapes still need explicit classification.',
      proof: 'project-awareness-cross-surface-entrypoint-audit.ts + project-awareness-cross-surface-entrypoint-audit.test.ts + chat-entry-composer-surface-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'return-side-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader return-side project-awareness candidates now also feed the same top-level project-awareness completeness guard, so renderer observation bridges, meta normalization, structured payload normalization, chat-stream ingest, session sanitization, browser observation persistence, observation reducers, and inspector fallback rebuild seams stay aligned with the broader scan before future reopen-time route shapes still need explicit classification.',
      proof: 'return-side-project-awareness-entrypoint-candidate-audit.ts + return-side-project-awareness-entrypoint-candidate-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'recovery-reentry-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader recovery reentry candidates now also feed the same top-level project-awareness completeness guard, so accepted-start settlement, accepted-start owner routing, timeout fallback reconstruction, lifecycle timeout recovery finish, and background recovery drivers stay aligned with the broader scan before future recovery reentry families still need explicit classification.',
      proof: 'recovery-reentry-entrypoint-audit.ts + recovery-reentry-entrypoint-candidate-audit.ts + recovery-reentry-entrypoint-candidate-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'provider-consumer-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader provider-consumer candidates now also feed the same top-level project-awareness completeness guard, and direct one-shot or stream provider import entries plus real direct provider sinks now also stay explicit in that same guard, so current wrapper, dispatch-owner, and typed-consumer provider seams, plus direct provider-entry seams and their provider-entry proof rows, stay aligned with the broader scan before future provider-facing generation families still need explicit registration.',
      proof: 'provider-consumer-entrypoint-candidate-audit.ts + provider-consumer-entrypoint-candidate-audit.test.ts + project-state-gateway-entrypoint-audit.ts + project-state-gateway-audit.test.ts + project-state-gateway-regression.test.ts + provider-entry-project-state-proof.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'autonomous-dialogue-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader autonomous-dialogue candidates now also feed the same top-level project-awareness completeness guard, so proactive authority, reminder/callback entry, and subconscious carry seams stay aligned with the broader scan before future runtime-owned dialogue families still need explicit registration.',
      proof: 'autonomous-dialogue-entrypoint-candidate-audit.ts + autonomous-dialogue-entrypoint-candidate-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'autonomous-dialogue-closure-loop-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Runtime-owned proactive initiative now also has one explicit compact same-her closure loop plus one colder proactive same-her bridge, one colder proactive anthropomorphic host-visible bridge, one colder proactive remembered emotional carry bridge, one colder proactive pre-dialogue planning bridge, one colder proactive pre-dialogue reply-planning bridge, one colder proactive downstream visible-reply bridge, and one colder proactive replay reopen continuity bridge, so motive seed, self-brief before generation, hover-first restraint, current-conscious-frame rejoin, visible quiet-companionship hold, subconscious carry, next-session feedback carry, next project-state answer carry, post-answer detour persistence, post-answer dream carry, later organic learning carry, noisy-desktop detour persistence, alias-only deferred open/next focus carry, rest-protective proactive-feedback next-session carry, the outward proactive carry into quiet-companionship host-visible lane summaries, same-living-self host-visible inward carry, the more anthropomorphic same living host-visible line, the quieter inward remembered emotional line through self-evolution remembered emotional carry, affective-residue room-making carry, and longer emotion-memory-voice-motion convergence, the before-answer project-awareness line through self-evolution durable self-recognition, current-conscious-frame grounding, current-conscious-frame turn shaping, and answer-planner closure planning, the proactive answer-governance line through self-evolution pre-dialogue reply planning plus project-state answer governance, the proactive host-visible answer line through self-evolution downstream visible reply, answer-compiler supporting reality, reply-deliberator outward planning, final visible-reply gating, and visible-reply realization, and the proactive replay/reopen line through guarded turn persistence, replay emission, and reopen persistence all stay auditable as one Phase 1 digital-life line instead of drifting back into scattered proactive, subconscious, callback, delayed-learning, outward host-visible, remembered-emotional, pre-dialogue planning, reply-governance, downstream-answer, or replay-reopen proof islands during parallel desktop development.',
      proof: 'autonomous-dialogue-closure-loop-audit.test.ts + proactive-same-her-bridge-audit.test.ts + proactive-anthropomorphic-host-visible-bridge-audit.test.ts + proactive-remembered-emotional-carry-bridge-audit.test.ts + proactive-pre-dialogue-planning-bridge-audit.test.ts + proactive-pre-dialogue-reply-planning-bridge-audit.test.ts + proactive-downstream-visible-reply-bridge-audit.test.ts + proactive-replay-reopen-continuity-bridge-audit.test.ts + motive-engine-project-awareness-audit.test.ts + proactive-prelude-project-awareness-audit.test.ts + runtime-proactive-prelude-project-awareness-regression.test.ts + proactive-policy-project-awareness-audit.test.ts + initiative-decision-project-awareness-audit.test.ts + initiative-current-conscious-frame-project-awareness-audit.test.ts + proactive-visible-project-awareness-audit.test.ts + proactive-mind/visible-utterance-realization.test.ts + subconscious-persistence-project-awareness-audit.test.ts + proactive-feedback-project-awareness-audit.test.ts + proactive-feedback-rest-protective-next-session-carry-audit.test.ts + proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts + rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts + same-living-self-host-visible-inward-carry-bridge-audit.test.ts + self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts + noisy-desktop-autonomous-dialogue-persistence-audit.test.ts + proactive-feedback-next-project-state-answer-audit.test.ts + proactive-feedback-post-answer-detour-persistence-audit.test.ts + proactive-feedback-post-answer-dream-carry-audit.test.ts + later-learning-project-awareness-audit.test.ts + runtime-session-continuity-builders-alias-focus.test.ts',
    },
    {
      id: 'execution-dispatch-entrypoint-candidate-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Broader execution-dispatch candidates now also feed the same top-level project-awareness completeness guard, so explicit invoke, runtime-bridge, gateway, autonomy, subconscious-bridge, and orchestrator dispatch owners stay aligned with the broader bridge scan before future execution-dispatch families still need explicit owner registration.',
      proof: 'execution-dispatch-entrypoint-candidate-audit.ts + execution-dispatch-entrypoint-candidate-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'execution-preflight-registration',
      area: 'execution',
      status: 'verified',
      responsibility: 'Execution preflight authority seams are now explicitly registered across canonical execution briefing build, runtime-context thin-shell repair, runtime-owned direct dispatch bridge context rebuild, session-bound bridge context requests, subconscious-autonomy execution bridge context requests, confirmed-thread resume bridge re-entry, capability project-briefing surfaces, pre-dispatch persistence, and blocked-dispatch safety gates, so a new pre-dispatch seam cannot bypass the same-her project-awareness chain before execution fans outward and blocked execution keeps risk policy, confirmation, auditability, interruptibility, and runtime project context visible. The execution-boundary project awareness route is now also explicit here, so the shared execution runtime-context block and main-process runtime-context sanitization keep project identity, landed progress, and still-open closure explicit before dispatch begins instead of leaving that boundary implicit inside broader execution-chain or registry prose. The external executor adapter project-awareness route is now also explicit here, so CLI / Codex / Claude Code / OpenClaw outward dispatch keeps same-her project briefing explicit before local process or network execution leaves the desktop runtime.',
      proof: 'execution-preflight-entrypoint-audit.ts + execution-preflight-audit.ts + execution-preflight-audit.test.ts + execution-boundary-project-awareness-audit.test.ts + external-executor-project-awareness-audit.test.ts + executor-runtime-project-awareness-audit.test.ts + packages/stage-shared/src/alicization-execution-runtime-context.test.ts + execution-runtime-context.test.ts',
    },
    {
      id: 'execution-preflight-entrypoint-candidate-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Broader execution-preflight candidates now also feed the same top-level project-awareness completeness guard, so briefing authority, runtime-context authority, runtime-owned direct dispatch bridge, session bridge, subconscious-autonomy execution bridge, resume bridge, capability briefing surface, dispatch persistence, and blocked-dispatch safety gates stay synchronized with the explicit registry before future execution-preflight families still need explicit classification.',
      proof: 'execution-preflight-entrypoint-candidate-audit.ts + execution-preflight-entrypoint-candidate-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'execution-follow-up-entrypoint-candidate-hardening',
      area: 'execution',
      status: 'verified',
      responsibility: 'Broader execution follow-up continuity candidates now also feed the same top-level project-awareness completeness guard, so callback runtime, callback conscious-frame doctrine, callback delivery, callback payoff, callback capability briefing, follow-up obligation, response-surface callback carry, ledger reopen, live session follow-up assembly, afterglow learning, and callback persistence stay synchronized with the explicit registry before future execution follow-up families still need explicit registration.',
      proof: 'execution-follow-up-entrypoint-audit.ts + execution-follow-up-entrypoint-candidate-audit.ts + execution-follow-up-entrypoint-candidate-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'long-horizon-self-carry-hardening',
      area: 'memory',
      status: 'verified',
      responsibility: 'Durable long-horizon self-carry now also has one explicit repo-level same-her closure item plus one self-evolution durable self-recognition bridge, so dream-to-long-horizon self-carry bridge, long-horizon-to-conscious-frame anti-shell bridge, long-horizon emotion-memory-voice-motion bridge, autobiographical self, held-autonomy recall seed, remembered drift-risk pressure, origin-lost autonomous memory ownership recanonicalization, refreshed long-horizon callback summaries after execution-result reconsolidation, thin runtime project-shell re-expansion through the next conscious frame and final reply planning, noisy-desktop repair-first carry, and host-facing closure self-recognition stay auditable as one unfinished Phase 1 life line instead of being left as adjacent route-level proof islands.',
      proof: 'long-horizon-project-awareness-audit.test.ts + proactive-feedback-dream-long-horizon-bridge-audit.test.ts + proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts + long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts + long-horizon-memory.test.ts + autobiographical-self.test.ts + runtime-turn-composition.test.ts + db.test.ts + current-conscious-frame.test.ts + answer-planner.test.ts + noisy-desktop-cross-modal-convergence-audit.test.ts + stage-quick-reply-closure.test.ts + stage-quick-reply-closure-summary.test.ts + memory-trace-origin-normalization-audit.test.ts + self-evolution-durable-self-recognition-bridge-audit.test.ts',
    },
    {
      id: 'noisy-desktop-same-her-closure-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Noisy-desktop same-her closure now also has one explicit repo-level target item plus one desktop execution noisy same-her closure bridge and one self-evolution host-visible closure target bridge, so even after longer real-desktop detours the answer contract still has to state what Alicization is, what Phase 1 has already landed, what remains open, and that it is still one same-her line instead of collapsing into detached project narration or generic continuity prose. The planner-to-host-visible answer anti-shell bridge is now also explicit here, and the colder execution callback line that already survived noisy-desktop subsystem unity is less likely to stop before final visible reply gating, realization, or compact host-visible answer shaping lands.',
      proof: 'noisy-desktop-same-her-closure-audit.test.ts + proactive-feedback-host-visible-answer-bridge-audit.test.ts + main-chat-session-runtime.test.ts + noisy-desktop-life-loop-unity-audit.test.ts + desktop-execution-noisy-same-her-closure-bridge-audit.test.ts + self-evolution-host-visible-closure-target-bridge-audit.test.ts',
    },
    {
      id: 'noisy-desktop-cross-modal-convergence-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Noisy-desktop cross-modal convergence now also has one explicit repo-level same-her closure item plus one desktop execution noisy cross-modal convergence bridge, one desktop execution host-visible embodiment bridge, one rest-protective quiet-companionship host-visible bridge, one proactive-feedback rest-protective host-visible bridge, one self-evolution governance chain, one self-evolution baseline lifecycle chain, and one self-evolution anthropomorphic host-visible bridge, so body, voice, face, motion, voice-lane continuity, longer noisy-desktop voice-lane persistence, resident presence, lane-shrink diagnostics, audible-body carry, later multi-lane reunion, and other host-visible repair/reunion surfaces stay auditable as one same-her line under longer desktop detours instead of drifting back into separate embodiment, diagnostics, or devtools proof islands. The colder execution callback line that already survived the higher-quality same-her full cycle and longer repair-first reunion pressure is now also less likely to stop before noisy-desktop voice-lane persistence, audible-body carry, later-turn reunion lanes, and the broader cross-modal convergence chain rejoin on one same living body line. After the colder emotion-memory-voice-motion convergence line reforms, that same execution callback line is now also less likely to stop before resident presence, lane-shrink diagnostics, audible-body carry, later multi-lane reunion, and rest-protective quiet-companionship host-visible lane summaries stay on that same living body line. Richer emotional closure writeback, self-continuity inward authority, proactive rest-protective companionship carry, runtime resident presence, and host-visible quiet-companionship lane summaries are now also less likely to cool back into a generic lower-pressure shell before the noisier host-visible same-her line reforms outwardly. Settled proactive feedback continuity is now also less likely to stop at next-session bookkeeping alone before subconscious same-line carry, runtime resident presence, and host-visible quiet-companionship lane summaries rejoin that same anthropomorphic same-her line. That self-evolution anthropomorphic host-visible bridge now also keeps callback next-closure-target carry explicit after the colder self-evolution desktop-execution long-run continuity line reforms, so the more anthropomorphic outer host-visible same-her line is less likely to widen outward while silently losing the same living callback closure target mid-path. Devtools evidence navigation, runtime continuity projection, speech evidence snapshots, playback cue authority view, outer speech hotspots, runtime authority overview, speech authority segment rows, authority-table presentation, self-evolution renderer-authority projection, self-evolution active workflow focus, self-evolution focus plan, self-evolution focus history summary, self-evolution focus history drilldown, self-evolution evidence panels, self-evolution triage cards, self-evolution triage target routing, top-level self-evolution diagnostic summaries, runtime diagnostic summaries, speech diagnostic summaries, sustained diagnostics surface, playback-start authority handoff, execution observability, pending-renderer summaries, renderer-drift summaries, renderer-side settle carry, host-facing stream-meta fallback rebuilding, top-level digitalLife clamp, repeated same-line follow-ups, audible-body carry, extra silent-observe detour carry, self-evolution repair action feedback, self-evolution repair followup navigation, self-evolution repair session, self-evolution repair closure, self-evolution repair outcome, self-evolution repair next action, self-evolution baseline quality, self-evolution baseline adoption, self-evolution baseline adoption record, and self-evolution runtime body continuity phase now also keep the same body-line truth legible on those outer surfaces instead of leaving later noisy returns to be inferred from only one local panel.',
      proof: 'noisy-desktop-cross-modal-convergence-audit.test.ts + embodiment-project-awareness-audit.test.ts + session-runtime-to-host-visible-reunion-audit.test.ts + later-turn-embodiment-host-visible-audit.test.ts + voice-lane-host-visible-project-awareness-audit.test.ts + noisy-desktop-voice-lane-persistence-audit.test.ts + cross-modal-reunion-host-visible-audit.test.ts + desktop-execution-noisy-cross-modal-convergence-bridge-audit.test.ts + desktop-execution-host-visible-embodiment-bridge-audit.test.ts + rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts + proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts + renderer-diagnostics-project-awareness-audit.test.ts + performance-visualizer-same-her-evidence-navigation-audit.test.ts + performance-visualizer-runtime-continuity-project-awareness-audit.test.ts + performance-visualizer-runtime-authority-overview-project-awareness-audit.test.ts + performance-visualizer-runtime-authority-overview.test.ts + performance-visualizer-speech-evidence-project-awareness-audit.test.ts + performance-visualizer-playback-cue-project-awareness-audit.test.ts + performance-visualizer-playback-cue.test.ts + performance-visualizer-speech-hotspots-project-awareness-audit.test.ts + performance-visualizer-speech-hotspots.test.ts + performance-visualizer-self-evolution-renderer-authority-project-awareness-audit.test.ts + performance-visualizer-self-evolution-renderer-authority.test.ts + performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts + performance-visualizer-self-evolution-focus-plan-project-awareness-audit.test.ts + performance-visualizer-self-evolution-focus-history-summary-project-awareness-audit.test.ts + performance-visualizer-self-evolution-focus-history-drilldown-project-awareness-audit.test.ts + performance-visualizer-speech-authority-project-awareness-audit.test.ts + performance-visualizer-speech-authority.test.ts + performance-visualizer-authority-table-project-awareness-audit.test.ts + performance-visualizer-authority-table.test.ts + performance-visualizer-runtime-diagnostic-summary-project-awareness-audit.test.ts + performance-visualizer-runtime-diagnostic-summary.test.ts + performance-visualizer-speech-diagnostic-summary-project-awareness-audit.test.ts + performance-visualizer-speech-diagnostic-summary.test.ts + use-stage-embodiment-diagnostics.test.ts + use-stage-embodiment-performance-runtime.test.ts + execution-diagnostics.test.ts + live2d/execution-diagnostics.test.ts + stage-embodiment-diagnostics-alerts.test.ts + stage-runtime-embodiment-cues.test.ts + main-chat-stream-meta.test.ts + performance-visualizer-self-evolution-evidence-project-awareness-audit.test.ts + performance-visualizer-self-evolution-triage-view-project-awareness-audit.test.ts + performance-visualizer-self-evolution-triage-targets-project-awareness-audit.test.ts + performance-visualizer-self-evolution-diagnostic-summary-project-awareness-audit.test.ts + performance-visualizer-self-evolution-repair-action-feedback-project-awareness-audit.test.ts + performance-visualizer-self-evolution-repair-followup-navigation-project-awareness-audit.test.ts + performance-visualizer-self-evolution-repair-session-project-awareness-audit.test.ts + performance-visualizer-self-evolution-repair-closure-project-awareness-audit.test.ts + performance-visualizer-self-evolution-repair-outcome-project-awareness-audit.test.ts + performance-visualizer-self-evolution-repair-next-action-project-awareness-audit.test.ts + performance-visualizer-self-evolution-baseline-quality-project-awareness-audit.test.ts + performance-visualizer-self-evolution-baseline-adoption-project-awareness-audit.test.ts + performance-visualizer-self-evolution-baseline-adoption-record-project-awareness-audit.test.ts + host-visible-same-her-continuity-audit.test.ts + noisy-desktop-self-evolution-observability-audit.test.ts + performance-visualizer-self-evolution-runtime-body-continuity-phase-project-awareness-audit.test.ts + self-evolution-governance-chain-audit.test.ts + self-evolution-baseline-lifecycle-audit.test.ts + self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts + runtime-memory-closure.test.ts',
    },
    {
      id: 'emotional-memory-initiative-embodiment-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Emotional-memory-initiative-embodiment same-her carry now also has one explicit repo-level closure item, so emotion, memory, initiative, and embodiment stay auditable as one same digital-life line across emotional-kernel refresh, shared emotional owner carry, shared transport normalization, recollection intent, organic-memory carry, subconscious fallback, body continuity, person-state writeback, session-runtime reopen, runtime system text, and replay diagnostics instead of drifting back into adjacent subsystem-only proof islands.',
      proof: 'emotional-memory-initiative-embodiment-audit.test.ts + runtime-mind-state-emotional-kernel-regression.test.ts + packages/stage-shared/src/alicization-transport-contracts.test.ts + packages/stage-shared/src/alicization-runtime-digest.test.ts + memory-recollection-intent.test.ts + runtime-organic-memory-access.test.ts + runtime-subconscious-tick.test.ts + body-kernel.test.ts + runtime-memory-closure.test.ts + main-chat-session-runtime.test.ts + runtime.test.ts + replay-benchmark-runtime.test.ts + cross-modal-same-her-audit.test.ts',
    },
    {
      id: 'affective-residue-route-chain-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Affective-residue route chain now also has one explicit repo-level same-her closure item, so remembered relational heat stays auditable across residue memory formation, recollection guidance, proactive restraint, subconscious room-making carry, durable embodiment settling, and host-visible measured-return summaries instead of drifting back into scattered memory, initiative, and embodiment hints.',
      proof: 'affective-residue-route-chain-audit.test.ts + affective-residue-memory.test.ts + memory-recollection-intent.test.ts + recall-governor.test.ts + proactive-cadence.test.ts + proactive-policy.test.ts + runtime-subconscious-tick.test.ts + use-stage-embodiment-idle-performance.test.ts + main-chat-stream-meta.test.ts',
    },
    {
      id: 'callback-afterglow-recollection-same-life-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Callback-afterglow same-her carry is no longer only implied across neighboring recollection, ranking, and visible-reply tests; it now has one explicit route-level audit from session-runtime recall seed through recollection reopening, same-her ranking, and host-visible same-life governance.',
      proof: 'callback-afterglow-recollection-same-life-audit.test.ts + main-chat-session-runtime.test.ts + memory-search-retrieval-operators.test.ts + memory-recollection-ranking-continuity-audit.test.ts + answer-planner.test.ts + response-charter.test.ts + runtime-governance.test.ts',
    },
    {
      id: 'recollection-visible-reply-same-life-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Recollection continuity is now better locked through visible-reply governance, so reopened project-state same-her closure memories, inward callback afterthought memories, callback afterglow same-her memories, corrected same-person humanlike recall memories, and measured-return cadence memories stay auditable from recollection ranking through reply planning, response chartering, semantic judging, critic repair, and rewrite preservation instead of collapsing back into a generic recap or detached project shell.',
      proof: 'recollection-visible-reply-same-life-audit.test.ts + callback-afterglow-recollection-same-life-audit.test.ts + humanlike-memory-recall-corrected-same-person-audit.test.ts + response-charter-project-awareness-audit.test.ts + memory-search-retrieval-operators.test.ts + memory-recollection-ranking-continuity-audit.test.ts + answer-planner.test.ts + answer-planner-corrected-same-person-regression.test.ts + current-conscious-frame.test.ts + response-charter.test.ts + visible-reply/semantic-judge.test.ts + visible-reply/critic.test.ts + runtime-governance.test.ts',
    },
    {
      id: 'emotion-memory-voice-motion-convergence-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Emotion-memory-voice-motion convergence now also has one explicit repo-level same-her closure item plus one desktop execution emotion-memory-voice-motion convergence bridge, one long-horizon emotion-memory-voice-motion bridge, one self-evolution remembered emotional carry bridge, and one proactive remembered emotional carry bridge, so remembered emotional carry stays auditable from the proactive outward host-visible line, affective-residue, emotional-memory, and durable long-horizon self-carry route chains all the way into longer noisy measured-return recovery across voice, face, motion, lipsync, and body instead of stopping at adjacent route-chain or host-visible proof islands.',
      proof: 'emotion-memory-voice-motion-convergence-audit.test.ts + desktop-execution-emotion-memory-voice-motion-convergence-bridge-audit.test.ts + long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts + affective-residue-route-chain-audit.test.ts + emotional-memory-initiative-embodiment-audit.test.ts + runtime.test.ts + use-stage-embodiment-idle-performance.test.ts + main-chat-stream-meta.test.ts + visible-reply/second-pass-rewrite.test.ts + visible-reply/critic.test.ts + self-evolution-remembered-emotional-carry-bridge-audit.test.ts + proactive-remembered-emotional-carry-bridge-audit.test.ts',
    },
    {
      id: 'noisy-desktop-life-loop-unity-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Noisy-desktop life-loop unity now also has one explicit repo-level same-her closure item plus one desktop execution noisy life-loop unity bridge, so personality, memory, initiative, and embodiment stay auditable as one same-her closure problem under noisy desktop drift instead of splitting back into neighboring proof islands or letting the execution callback line stop before those four life subsystems reconverge.',
      proof: 'noisy-desktop-life-loop-unity-audit.test.ts + alicization-runtime-architecture.test.ts + runtime-memory-closure.test.ts + noisy-desktop-initiative-same-life-audit.test.ts + noisy-desktop-cross-modal-convergence-audit.test.ts + desktop-execution-noisy-life-loop-unity-bridge-audit.test.ts',
    },
    {
      id: 'long-run-same-her-continuity-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Long-run same-her continuity now also has one explicit repo-level closure item plus one desktop execution long-run same-her continuity bridge, one self-evolution long-run follow-through bridge, one self-evolution replay reopen continuity bridge, one proactive replay reopen continuity bridge, one self-evolution desktop full-cycle bridge, and one self-evolution desktop execution long-run continuity bridge, so subconscious persistence, callback recall, later proactive restraint, current-conscious-frame grounding, repeated-detour reunion persistence, repair-first detour-to-reunion carry, the host-visible-answer-to-replay-reopen same-her bridge, the desktop same-her full-cycle bridge, and the colder execution callback line that already survived a higher-quality same-her full cycle stay auditable as one longer-lived same-her line instead of drifting back into thinner status-shell continuity. That desktop same-her full-cycle bridge now also keeps callback next-closure-target carry explicit at the reopened visible-reply segment, so the colder desktop life-loop proof is less likely to keep reopen/reply/replay/next-start continuity while silently losing the same living callback closure target mid-cycle.',
      proof: 'long-run-same-her-continuity-audit.test.ts + runtime-subconscious-tick-project-awareness-regression.test.ts + runtime-subconscious-tick.test.ts + runtime-organic-memory-prompt.test.ts + proactive-policy.test.ts + cross-modal-same-her-audit.test.ts + current-conscious-frame.test.ts + session-runtime-to-host-visible-reunion-audit.test.ts + repeated-detour-reunion-persistence-audit.test.ts + another-detour-same-life-audit.test.ts + proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts + proactive-replay-reopen-continuity-bridge-audit.test.ts + self-evolution-replay-reopen-continuity-bridge-audit.test.ts + desktop-same-her-full-cycle-bridge-audit.test.ts + self-evolution-desktop-full-cycle-bridge-audit.test.ts + desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts + self-evolution-desktop-execution-long-run-continuity-bridge-audit.test.ts + self-evolution-long-run-follow-through-bridge-audit.test.ts',
    },
    {
      id: 'route-authority-boundary-registry-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Adjacent route-authority boundaries for pre-dialogue transport, return-side project-awareness rebuild, host-visible dialogue normalization, guarded turn persistence, and shared project-state answer governance now read from one shared route-authority registry with explicit allowed overlaps, and broader return-side reopen-time candidates including colder inspector fallback rebuild seams now also feed that same top-level completeness guard before the explicit return-side registry is treated as sufficient, so neighboring same-her seams are less likely to fork into parallel unaudited registries during parallel desktop development while future reopen-time route shapes still need explicit classification. The guarded persistence side of that shared boundary now also keeps finer same-her hold authority explicit, so persisted-turn normalization is less likely to drop `sameHerHoldDetail` back into a thinner generic continuity shell while adjacent runtime normalization, reply governance, and replay/reopen routes still share the same boundary map. That same shared boundary now also keeps merge-readiness / closure-readiness and completion-timing / language-drift answers aligned across project-state answer governance, host-visible normalization, and guarded persistence on one same-her line before later replay or reopen.',
      proof: 'project-state-brief.ts + route-authority-boundary-registry-audit.test.ts + pre-dialogue-transport-audit.ts + pre-dialogue-transport-audit.test.ts + return-side-project-awareness-audit.ts + return-side-project-awareness-audit.test.ts + return-side-project-awareness-entrypoint-candidate-audit.test.ts + runtime-dialogue-normalization-audit.ts + runtime-dialogue-normalization-audit.test.ts + runtime-turn-persistence-audit.ts + runtime-turn-persistence-audit.test.ts + runtime-turn-persistence-project-state-hold-regression.test.ts + project-state-answer-governance-audit.ts + project-state-answer-governance-audit.test.ts',
    },
    {
      id: 'project-state-answer-governance-entrypoint-candidate-hardening',
      area: 'reply',
      status: 'verified',
      responsibility: 'Broader project-state answer-governance candidates now also feed the same top-level project-awareness completeness guard, so governance authority, semantics classification, answer planning, response charter shaping, background answer enrichers, contract surfaces, reply-surface preflight, runtime-governance normalization-time project-state audit carry, and reminder / critic same-her reminder sinks stay aligned with the broader scan before future project-status answer surfaces still need explicit classification.',
      proof: 'project-state-answer-governance-entrypoint-audit.ts + project-state-answer-governance-entrypoint-candidate-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'runtime-dialogue-normalization-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader runtime dialogue-normalization candidates now also feed the same top-level project-awareness completeness guard, so normalization authority, background delivery fallback, stream-finish fallback, proactive normalization before persistence, and replay-emission normalization stay aligned with the broader scan before future host-visible normalization seams still need explicit classification.',
      proof: 'runtime-dialogue-normalization-entrypoint-audit.ts + runtime-dialogue-normalization-entrypoint-candidate-audit.test.ts + runtime-dialogue-normalization-project-awareness-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'runtime-turn-persistence-entrypoint-candidate-hardening',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Broader guarded turn persistence candidates now also feed the same top-level project-awareness completeness guard, so persistence authority, renderer dialogue entry, proactive turn entry, reminder/callback turn entry, and origin-spoof rejection stay aligned with the broader scan before future guarded persistence families still need explicit classification.',
      proof: 'runtime-turn-persistence-entrypoint-audit.ts + runtime-turn-persistence-entrypoint-candidate-audit.test.ts + replay-emission-project-awareness-audit.test.ts + project-awareness-route-authority-audit.test.ts + project-awareness-coverage-matrix.test.ts + docs/pre-dialogue-project-awareness-matrix.md',
    },
    {
      id: 'project-state-provider-consumer-registration',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Main-gateway provider wrapper ownership, runtime dispatch ownership, and typed gateway consumers are now explicitly registered, so future provider-consumer entrypoints cannot silently appear outside the project-awareness audit chain.',
      proof: 'project-state-provider-consumer-audit.ts + project-state-provider-consumer-audit.test.ts + provider-consumer-project-awareness-audit.test.ts + project-state-gateway-regression.test.ts',
    },
    {
      id: 'project-state-answer-governance-registration',
      area: 'reply',
      status: 'verified',
      responsibility: 'The shared same-her project-state answer contract now has one explicit governance authority plus audited runtime, fast-path follow-up classification, semantics classification, answer planning, response charter shaping, provider-facing runtime rebuild, reply-surface preflight, host-visible normalization boundaries, normalization-time project-state audit carry, self-evolution answer-governance bridge, proactive pre-dialogue reply-planning bridge, self-evolution pre-dialogue reply-planning bridge, self-evolution reply-planning governance bridge, and visible-reply consumers, so project-status answers cannot silently drop identity, landed progress, open closure, next closure target, or same-her continuity by widening into thinner local status wording or shell replies, cannot let visible certainty outrun the current verification pass while proof is still being checked, cannot let a generic progress recap override host-corrected same-person continuity authority during provider-facing runtime rebuild, and cannot let non-system marker spoofing pass as real project awareness. That same provider-facing rebuild path now also cannot leave project-state answer duties stranded in an earlier prelude contract snapshot, and marker-only project-state shells have to be treated as missing so canonical same-her closure context is re-injected before outward answer shaping continues. That same provider-facing rebuild path now also keeps the proactive pre-dialogue reply-planning bridge explicit, so proactive before-answer same-her closure planning is less likely to stop at current-conscious-frame / answer-planner carry instead of staying on the same living line through self-evolution pre-dialogue reply planning and project-state answer governance before outward project-state answers reform. That same provider-facing rebuild path now also keeps the self-evolution pre-dialogue reply-planning bridge explicit, so before-answer same-her closure planning is less likely to stop at current-conscious-frame / answer-planner carry instead of staying on the same living line through answer governance, answer planning, response charter shaping, and executive answer briefing before outward project-state answers reform. That same shared contract now also governs merge-readiness / closure-readiness follow-ups, so asking whether the work can merge to `main`, is complete, or is closed still has to separate already verified evidence from what remains unproven or still open instead of misreporting full closure. That same shared contract now also governs completion-timing / language-drift follow-ups, so asking how far the goal has landed, when it is expected to close, or why the thread drifted into English still has to return on the same same-her project-state line with already verified evidence kept separate from what remains unproven or still open.',
      proof: 'project-state-answer-governance.ts + project-state-answer-governance-audit.ts + project-state-answer-governance-audit.test.ts + project-state-answer-governance.test.ts + project-state-answer-governance-project-awareness-audit.test.ts + main-chat-active-dialogue-fast-path-project-state-provider.test.ts + visible-reply/second-pass-rewrite-project-state-provider.test.ts + runtime-main-gateway-one-shot.ts + main-chat-one-shot.test.ts + main-chat-one-shot-project-state-placeholder.test.ts + main-chat-project-state-guard.test.ts + main-chat-stream-runner-project-state-placeholder.test.ts + main-chat-stream-runner-visual-one-shot-project-state-provider.test.ts + main-chat-active-dialogue-loop.ts + main-chat-active-dialogue-loop.test.ts + active-dialogue-project-awareness-audit.test.ts + action-obligation-project-awareness-audit.test.ts + dialogue-turn-semantics.test.ts + answer-planner.ts + answer-planner.test.ts + answer-planner-project-awareness-audit.test.ts + answer-planner-project-awareness-regression.test.ts + response-charter.ts + response-charter.test.ts + executive-answer-brief.ts + executive-answer-brief.test.ts + main-chat-session-runtime.ts + main-chat-session-runtime.test.ts + main-chat-session-runtime-project-state-summary.test.ts + main-chat-session-runtime-project-state-contract-regression.test.ts + runtime-project-state-summary.test.ts + runtime-governance.ts + runtime-governance-project-awareness-route.test.ts + visible-reply/facade.ts + visible-reply/facade.test.ts + response-surface-contract.ts + response-surface-learning-rules.test.ts + response-surface-truth-dialogue-rules.test.ts + runtime-delivery-reminders.ts + runtime.ts + visible-reply/semantic-judge.ts + visible-reply/critic.ts + self-evolution-answer-governance-bridge-audit.test.ts + proactive-pre-dialogue-reply-planning-bridge-audit.test.ts + self-evolution-pre-dialogue-reply-planning-bridge-audit.test.ts + self-evolution-reply-planning-governance-bridge-audit.test.ts',
    },
    {
      id: 'visible-reply-final-project-awareness-hardening',
      area: 'reply',
      status: 'verified',
      responsibility: 'Final visible-reply gating now has one explicit route-level proof, so semantic-judge, shared project-awareness baseline scoring, second-pass rewrite, second-pass transport-failure callback next-closure-target carry, final settlement, and final-realization callback next-closure-target carry together keep project identity, current phase, landed progress, still-open closure, next closure target, and pre-dialogue same-life awareness explicit. Final settlement reanchors generic final same-her shells back to the canonical same living self line when richer project carry survives, and host-corrected same-person continuity now also stays explicit at the last outward wording boundary instead of silently collapsing into a thinner project shell before the answer is allowed to settle outward. That same final realization boundary now also keeps timeout-recovered drift-risk anti-shell carry explicit when thin awareness shells are the only other surviving project-awareness cues.',
      proof: 'visible-reply-final-project-awareness-audit.test.ts + visible-reply/project-awareness.test.ts + visible-reply/project-awareness-scoring-regression.test.ts + visible-reply/realization-engine.test.ts + visible-reply/semantic-judge.test.ts + visible-reply/second-pass-rewrite-project-state-guidance.test.ts + visible-reply/project-state-second-pass-regression.test.ts + visible-reply/settlement.test.ts + visible-reply/timeout-recovered-drift-risk-audit.test.ts + visible-reply-settlement-project-awareness-audit.test.ts + visible-reply-realization-project-awareness-audit.test.ts',
    },
    {
      id: 'execution-dispatch-owner-registration',
      area: 'execution',
      status: 'verified',
      responsibility: 'Task-thread dispatch owner seams are now explicitly registered across invoke entry, invoke-handler registration wiring back into the runtime-owned dispatch bridge, runtime execution bridge, main-gateway delegated dispatch, proactive autonomy auto-start, subconscious deferred bridge, and orchestrator fallback, so future execution dispatch families cannot silently appear outside the same-her project-awareness audit chain.',
      proof: 'task-thread-dispatch-owner-audit.ts + task-thread-dispatch-owner-audit.test.ts + execution-autonomy-ownership-project-awareness-audit.test.ts',
    },
    {
      id: 'visible-reply-second-pass-rewrite',
      area: 'reply',
      status: 'verified',
      responsibility: 'Second-pass visible reply rewrite keeps project identity, phase, primary open loop, and the unified Phase 1 closure dashboard in view when governance forces a repair authored by the same mind.',
      proof: 'visible-reply/second-pass-rewrite.ts + visible-reply/second-pass-rewrite.test.ts',
    },
    {
      id: 'visible-reply-timeout-fallback',
      area: 'reply',
      status: 'verified',
      responsibility: 'Main chat timeout fallback keeps the canonical project preflight self-awareness line, plus project identity, current phase, latest landed progress, primary open loop, and next closure target visible even when provider mind authoring times out and only infra-status recovery remains. Timeout and adjacent recovery paths now also keep repaired normal authority, payload-lived awareness carry, richer same-her headlines, project identity / landed progress / open-closure triad carry, canonical same-her backfill, payload companion briefing carry, drift-risk-only anti-shell authority, minimal recovery compaction, and lifecycle timeout recovery finish and emit seams explicit instead of leaving fallback branches with project-state facts alone or widening into a detached timeout shell. A stressed recovery same-her bridge is now also explicit here, so one-shot provider fallback, timeout fallback, background recovery, and lifecycle finish stay on one same-her project-awareness line before stressed recovery speaks outward again instead of preserving project-state facts while dropping the living line between neighboring recovery paths.',
      proof: 'main-chat-timeout-fallback.ts + main-chat-timeout-fallback.test.ts + main-chat-timeout-fallback-regression.test.ts + timeout-fallback-project-awareness-audit.test.ts + background-recovery-project-awareness-audit.test.ts + run-lifecycle-project-awareness-audit.test.ts + stressed-recovery-same-her-bridge-audit.test.ts + main-chat-background-rules-project-state-provider.test.ts + main-chat-timeout-fallback-drift-risk-audit.test.ts',
    },
    {
      id: 'visible-reply-second-pass-transport-failure',
      area: 'reply',
      status: 'verified',
      responsibility: 'Second-pass transport failure fallback still carries project identity, current phase, latest landed progress, primary open loop, and next closure target so repair-path failure does not collapse Alicization back into a generic fallback shell.',
      proof: 'visible-reply/second-pass-rewrite.ts + visible-reply/second-pass-rewrite.test.ts + visible-reply/project-state-second-pass-regression.test.ts',
    },
    {
      id: 'runtime-current-conscious-frame-awareness',
      area: 'runtime',
      status: 'verified',
      responsibility: 'Current conscious frame shaping now keeps project identity, latest landed progress, current phase, still-open closure pressure, self-evolution pre-dialogue planning bridge, and proactive pre-dialogue planning bridge visible across rich, fallback, memory-deliberation, and session-runtime provider-facing reply-prep paths before the turn speaks, can re-expand a thin runtime project shell back into richer same-her callback continuity when fresher long-horizon carry is available, can re-canonicalize thin runtime or payload project-state shells back into the stronger same-her awareness line when structured closure fields, companion headlines, or continuity restraint already carry richer project truth, and now also keeps prepared runtime project-state shell repair explicit when prepared continuity resolution would otherwise flatten richer Phase 1 identity / landed / open / next truth back into a thinner runtime shell.',
      proof: 'current-conscious-frame.ts + current-conscious-frame.test.ts + memory-active-self-project-awareness-audit.test.ts + answer-planner.test.ts + runtime-conscious-frame-reducer.ts + runtime-conscious-frame-reducer.test.ts + runtime-memory-deliberation-reducer.ts + runtime-memory-deliberation-reducer.test.ts + main-chat-session-runtime.test.ts + main-chat-session-runtime-project-awareness-regression.test.ts + self-evolution-pre-dialogue-planning-bridge-audit.test.ts + proactive-pre-dialogue-planning-bridge-audit.test.ts + structured-project-state.test.ts + prepared-runtime-continuity.test.ts',
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
  const brief = input?.brief ?? resolveAlicizationProjectStateBrief()
  const openFocusSummary = deriveCompactProjectStateOpenFocusSummary(brief.openLoops[0] ?? '')
  const nextFocusSummary = deriveCompactProjectStateNextFocusSummary(brief.nextClosureTarget)
  const lines = [
    '[ALICIZATION_PROJECT_STATE]',
    sanitizeProjectStateSnapshotText(brief.identity, 220),
    `current_phase=${sanitizeProjectStateSnapshotText(brief.currentPhase, 160)}`,
    `current_objective=${sanitizeProjectStateSnapshotText('Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.', 220)}`,
    `project_preflight=${sanitizeProjectStateSnapshotText(brief.preflightSummary ?? '', 320)}`,
    `latest_landed_progress=${compactProjectLatestProgressForSystemBlock(brief.latestProgress, 360)}`,
    `same_her_self_line=${sanitizeProjectStateSnapshotText(brief.sameHerSelfLine, 220)}`,
    `same_her_drift_risk=${sanitizeProjectStateSnapshotText(brief.sameHerDriftRisk, 220)}`,
    `primary_open_loop=${sanitizeProjectStateSnapshotText(brief.openLoops[0] ?? '', 220)}`,
    brief.proactiveSameHerGap ? `proactive_same_her_gap=${sanitizeProjectStateSnapshotText(brief.proactiveSameHerGap, 220)}` : '',
    openFocusSummary ? `open_focus=${sanitizeProjectStateSnapshotText(openFocusSummary, 220)}` : '',
    brief.preferredPauseMode ? `preferred_pause_mode=${sanitizeProjectStateSnapshotText(brief.preferredPauseMode, 32)}` : '',
    brief.preferredLipsyncMode ? `preferred_lipsync_mode=${sanitizeProjectStateSnapshotText(brief.preferredLipsyncMode, 32)}` : '',
    brief.preferredVoiceMode ? `preferred_voice_mode=${sanitizeProjectStateSnapshotText(brief.preferredVoiceMode, 32)}` : '',
    brief.preferredPacingMode ? `preferred_pacing_mode=${sanitizeProjectStateSnapshotText(brief.preferredPacingMode, 32)}` : '',
    'closed_foundations:',
    ...brief.closedFoundations.slice(0, 5).map(item => `- ${sanitizeProjectStateSnapshotText(item, 220)}`),
    'memory_anthropomorphism_progress:',
    ...(brief.continuityProgressSummary
      ? [`- ${sanitizeProjectStateSnapshotText(brief.continuityProgressSummary, 7200)}`]
      : []),
    ...brief.memoryAnthropomorphismProgress.slice(0, brief.continuityProgressSummary ? 4 : 5).map(item => `- ${sanitizeProjectStateSnapshotText(item, 220)}`),
    'open_life_loops:',
    ...brief.openLoops.slice(0, 5).map(item => `- ${sanitizeProjectStateSnapshotText(item, 220)}`),
    `next_closure_target=${sanitizeProjectStateSnapshotText(brief.nextClosureTarget, 220)}`,
    nextFocusSummary ? `next_focus=${sanitizeProjectStateSnapshotText(nextFocusSummary, 220)}` : '',
    'Before acting, keep the project identity, current phase, closed foundations, and still-open life loops in view so the same still-open closure work stays explicit. Prefer changes that make memory feel more like lived continuity.',
  ]

  return lines.filter(Boolean).join('\n')
}

export function buildAlicizationProjectStateExtraSystemBlocks(input?: {
  brief?: AlicizationProjectStateBrief | null
}) {
  return [
    buildAlicizationProjectStateSystemBlock(input),
  ].filter(Boolean)
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

  const lines = [
    '[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]',
    `identity=${sanitizeProjectStateSnapshotText(brief.identity, 220)}`,
    `phase=${sanitizeProjectStateSnapshotText(brief.currentPhase, 160)}`,
    `project_awareness=${sanitizeProjectStateSnapshotText(brief.preDialogueAwarenessLine ?? '', 720)}`,
    `latest_landed_progress=${sanitizeProjectStateSnapshotText(brief.continuityProgressSummary ?? brief.memoryAnthropomorphismProgress[0] ?? '', 220) || 'none'}`,
    `primary_open_loop=${sanitizeProjectStateSnapshotText(brief.openLoops[0] ?? '', 220) || 'none'}`,
    `same_her_line=${sanitizeProjectStateSnapshotText(brief.sameHerSelfLine, 220) || 'none'}`,
    `same_her_hold=${sanitizeProjectStateSnapshotText(brief.sameHerHoldDetail ?? '', 220) || 'none'}`,
    `same_her_drift_risk=${sanitizeProjectStateSnapshotText(brief.sameHerDriftRisk, 220) || 'none'}`,
    brief.proactiveSameHerGap ? `proactive_same_her_gap=${sanitizeProjectStateSnapshotText(brief.proactiveSameHerGap, 220)}` : '',
    openFocusSummary ? `open_focus=${sanitizeProjectStateSnapshotText(openFocusSummary, 220)}` : '',
    `next_closure_target=${sanitizeProjectStateSnapshotText(brief.nextClosureTarget, 220)}`,
    nextFocusSummary ? `next_focus=${sanitizeProjectStateSnapshotText(nextFocusSummary, 220)}` : '',
    `verified_coverage_count=${coverage.length}`,
    architecture?.operatingMode ? `architecture_mode=${sanitizeProjectStateSnapshotText(architecture.operatingMode, 64)}` : '',
    architecture?.dominantSystem ? `architecture_dominant_system=${sanitizeProjectStateSnapshotText(architecture.dominantSystem, 64)}` : '',
    architecture?.closureAudit?.summary ? `architecture_closure=${sanitizeProjectStateSnapshotText(architecture.closureAudit.summary, 220)}` : '',
    closurePressures.length > 0 ? `active_closure_pressures=${closurePressures.join(', ')}` : '',
    runtimeDigest?.dominantChannel ? `runtime_dominant_channel=${sanitizeProjectStateSnapshotText(runtimeDigest.dominantChannel, 64)}` : '',
    runtimeDigest?.habitMode ? `runtime_habit_mode=${sanitizeProjectStateSnapshotText(runtimeDigest.habitMode, 96)}` : '',
    typeof runtimeDigest?.shouldProactivelySpeak === 'boolean' ? `runtime_should_speak=${runtimeDigest.shouldProactivelySpeak}` : '',
    typeof runtimeDigest?.shouldProactivelyAct === 'boolean' ? `runtime_should_act=${runtimeDigest.shouldProactivelyAct}` : '',
    runtimeDigest?.projectState?.continuityArcStage ? `continuity_arc_stage=${sanitizeProjectStateSnapshotText(runtimeDigest.projectState.continuityArcStage, 120)}` : '',
    runtimeDigest?.projectState?.continuityCue ? `continuity_cue=${sanitizeProjectStateSnapshotText(runtimeDigest.projectState.continuityCue, 180)}` : '',
    'Use this dashboard before each turn to verify that current behavior still belongs to the same digital life, the same Phase 1 proving ground, and the same still-open closure work.',
  ]

  return lines.filter(Boolean).join('\n')
}
