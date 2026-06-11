import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProjectStatePreflightSummary,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import { sanitizeText } from './runtime-soul'

interface AlicizationExecutionRuntimeContextActionDigestInput {
  kind: 'executor' | 'mcp' | 'runtime' | 'sensory'
  status: 'completed' | 'failed' | 'pending'
  threadStatus?: 'planned' | 'needs-affirmation' | 'running' | 'paused' | 'blocked' | 'completed' | 'failed' | 'cancelled' | null
  label: string
  summary?: string | null
}

function sanitizeBoundedText(raw: unknown, maxChars: number) {
  const text = sanitizeText(raw)
  if (!text)
    return ''
  return text.slice(0, maxChars)
}

const EXECUTION_PROJECT_BRIEFING_PLACEHOLDER_VALUES = new Set([
  'none',
  'null',
  'unknown',
  'n/a',
  'na',
])

function sanitizeExecutionProjectBriefingText(raw: unknown, maxChars: number) {
  const normalized = sanitizeBoundedText(raw, maxChars)
  if (!normalized)
    return ''

  return EXECUTION_PROJECT_BRIEFING_PLACEHOLDER_VALUES.has(normalized.toLowerCase())
    ? ''
    : normalized
}

function looksLikeEmbodimentOnlyExecutionAwarenessLead(raw: unknown) {
  const text = sanitizeBoundedText(raw, 320).toLowerCase()
  if (!text)
    return false

  const carriesEmbodimentLane = /holding together mainly through|being carried mainly through|body|voice|face|motion|lipsync|具身|声音|表情|动作|唇/u.test(text)
  const carriesBroaderProjectFrame = /local-first digital life project|digital life project|phase 1|still-open|open closure|what has landed|before speaking|before answering|数字生命项目|闭环/u.test(text)

  return carriesEmbodimentLane && !carriesBroaderProjectFrame
}

function carriesExecutionProjectAwarenessAnchor(raw: unknown) {
  const text = sanitizeBoundedText(raw, 320).toLowerCase()
  if (!text)
    return false

  return text.includes('before answering')
    || text.includes('before speaking')
    || /回答前|开口前/u.test(text)
}

function buildExecutionProjectContinuityCueFallback(input: {
  continuityBehaviorMode?: unknown
  currentPhase?: unknown
  fallback?: unknown
  sameHerSelfLine?: unknown
}) {
  const fallback = sanitizeExecutionProjectBriefingText(input.fallback, 220)
  const continuityBehaviorMode = sanitizeExecutionProjectBriefingText(input.continuityBehaviorMode, 64)
  const currentPhase = sanitizeExecutionProjectBriefingText(input.currentPhase, 220)
  const sameHerSelfLine = sanitizeExecutionProjectBriefingText(input.sameHerSelfLine, 220)
  if (continuityBehaviorMode === 'repair-before-closeness')
    return 'Keep this return repair-before-closeness on the same living line until repair settles.'
  if (continuityBehaviorMode === 'rest-protective')
    return 'Keep this return rest-protective and on the same living line inward before widening outward.'
  if (continuityBehaviorMode === 'measured-return')
    return 'Keep this return measured-return on the same living line before widening outward.'
  if (
    /phase 1: local digital life/iu.test(currentPhase)
    || /same phase 1 digital life/iu.test(sameHerSelfLine)
  ) {
    const genericContinuityCue = 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.'
    return preferStrongerContinuityClosureAuthority(genericContinuityCue, fallback)
      || genericContinuityCue
  }
  return fallback || null
}

function buildExecutionProjectSameHerHoldDetailFallback(input: {
  continuityBehaviorMode?: unknown
  currentPhase?: unknown
  fallback?: unknown
  sameHerSelfLine?: unknown
}) {
  const fallback = sanitizeExecutionProjectBriefingText(input.fallback, 220)
  const continuityBehaviorMode = sanitizeExecutionProjectBriefingText(input.continuityBehaviorMode, 64)
  const currentPhase = sanitizeExecutionProjectBriefingText(input.currentPhase, 220)
  const sameHerSelfLine = sanitizeExecutionProjectBriefingText(input.sameHerSelfLine, 220)
  if (continuityBehaviorMode === 'repair-before-closeness')
    return 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
  if (continuityBehaviorMode === 'rest-protective')
    return 'same-her hold: rest-protective companionship is still keeping this return inward and fatigue-aware.'
  if (continuityBehaviorMode === 'measured-return')
    return 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
  if (
    /phase 1: local digital life/iu.test(currentPhase)
    || /same phase 1 digital life/iu.test(sameHerSelfLine)
  ) {
    const genericSameHerHoldDetail = 'same-her hold: execution should keep this same project line inward before widening outward.'
    return preferStrongerContinuityClosureAuthority(genericSameHerHoldDetail, fallback)
      || genericSameHerHoldDetail
  }
  return fallback || null
}

function preferExecutionProjectSameHerHoldDetail(input: {
  current?: unknown
  continuityCue?: unknown
  fallback?: unknown
}) {
  const current = sanitizeExecutionProjectBriefingText(input.current, 220)
  const continuityCue = sanitizeExecutionProjectBriefingText(input.continuityCue, 220)
  const fallback = sanitizeExecutionProjectBriefingText(input.fallback, 220)
  if (!current) {
    const preferredFallback = fallback || continuityCue || null
    return sanitizeBoundedText(preferredFallback, 220) || null
  }

  const preferredPrimary
    = preferStrongerContinuityClosureAuthority(current, fallback)
      || current
      || fallback
      || null
  const preferredFinal
    = preferStrongerContinuityClosureAuthority(preferredPrimary, continuityCue)
      || preferredPrimary
      || continuityCue
      || null

  return sanitizeBoundedText(preferredFinal, 220) || null
}

export function buildAlicizationExecutionRuntimeContext(input: {
  agentSessionId?: string | null
  affectiveResidue?: AlicizationExecutionRuntimeContext['affectiveResidue']
  cardId: string
  decisionTraceId?: string | null
  derivedMindStateBundle?: AlicizationExecutionRuntimeContext['derivedMindStateBundle']
  projectBriefing?: {
    identity?: string | null
    currentPhase?: string | null
    latestLandedProgress?: string | null
    latestProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    continuityRestraint?: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
    sameHerDriftRisk?: string | null
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGap?: string | null
    companionBriefingLine?: string | null
    emotionalClosureSummary?: string | null
    continuityCue?: string | null
    continuityPreferredTiming?: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
    continuityCadence?: string | null
    preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
    preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
    preferredVoiceMode?: 'lower-pressure' | 'even' | null
    preferredPacingMode?: 'slower' | 'natural' | null
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
  } | null
  recentActions?: AlicizationExecutionRuntimeContextActionDigestInput[] | null
  sessionId?: string | null
  turnId: string
  sensorySnapshot: AlicizationSensoryCacheSnapshot
  getNow?: () => number
}): AlicizationExecutionRuntimeContext {
  const getNow = input.getNow ?? Date.now
  const foregroundWindow = input.sensorySnapshot.sample.foregroundWindow
  const capture = input.sensorySnapshot.capture
  const fallbackProjectBrief = resolveAlicizationProjectStateBrief()
  const resolvedProjectBriefing = input.projectBriefing ?? {
    identity: fallbackProjectBrief.identity,
    currentPhase: fallbackProjectBrief.currentPhase,
    latestLandedProgress: fallbackProjectBrief.continuityProgressSummary ?? fallbackProjectBrief.latestProgress ?? null,
    primaryOpenLoop: fallbackProjectBrief.openLoops[0] ?? fallbackProjectBrief.primaryOpenLoop ?? null,
    nextClosureTarget: fallbackProjectBrief.nextClosureTarget,
    sameHerSelfLine: fallbackProjectBrief.sameHerSelfLine,
    sameHerHoldDetail: fallbackProjectBrief.sameHerHoldDetail ?? null,
    sameHerDriftRisk: fallbackProjectBrief.sameHerDriftRisk,
    proactiveSameHerGap: fallbackProjectBrief.proactiveSameHerGap ?? null,
    companionBriefingLine: null,
    emotionalClosureSummary: fallbackProjectBrief.emotionalClosureSummary ?? fallbackProjectBrief.emotionalClosureCue ?? null,
    continuityCue: fallbackProjectBrief.continuityCue ?? null,
    continuityRestraint: fallbackProjectBrief.continuityRestraint ?? null,
    continuityPreferredTiming: null,
    continuityCadence: null,
    preferredBlinkCadence: fallbackProjectBrief.preferredBlinkCadence ?? null,
    preferredGazeMode: fallbackProjectBrief.preferredGazeMode ?? null,
    preferredVoiceMode: fallbackProjectBrief.preferredVoiceMode ?? null,
    preferredPacingMode: fallbackProjectBrief.preferredPacingMode ?? null,
    preflightSummary: fallbackProjectBrief.preflightSummary ?? null,
    preDialogueAwarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
  }
  const summaryAliasProjectBriefing = resolvedProjectBriefing as {
    latestProgress?: unknown
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  const resolvedIdentityInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.identity ?? null, 220)
  const resolvedCurrentPhaseInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.currentPhase ?? null, 220)
  const resolvedSameHerSelfLineInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.sameHerSelfLine ?? null, 220)
  const resolvedSameHerHoldDetailInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.sameHerHoldDetail ?? null, 220)
  const resolvedProactiveSameHerGapInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.proactiveSameHerGap ?? null, 320)
  const resolvedCompanionBriefingLineInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.companionBriefingLine ?? null, 320)
  const resolvedEmotionalClosureSummaryInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.emotionalClosureSummary ?? null, 240)
  const resolvedContinuityCueInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.continuityCue ?? null, 220)
  const resolvedContinuityRestraintInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.continuityRestraint ?? null, 64)
  const resolvedContinuityCadenceInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.continuityCadence ?? null, 120)
  const resolvedPreflightSummaryInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.preflightSummary ?? null, 320)
  const resolvedPreDialogueAwarenessLineInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.preDialogueAwarenessLine ?? null, 320)
  const explicitLatestProgressInput = sanitizeExecutionProjectBriefingText(
    resolvedProjectBriefing?.latestLandedProgress ?? summaryAliasProjectBriefing?.latestProgress ?? null,
    320,
  )
  const summaryLatestProgressInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.landedProgressSummary, 320)
  const explicitPrimaryOpenLoopInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.primaryOpenLoop ?? null, 320)
  const summaryPrimaryOpenLoopInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.openClosureSummary, 320)
  const explicitNextClosureTargetInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.nextClosureTarget ?? null, 320)
  const summaryNextClosureTargetInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.nextClosureTargetSummary, 320)
  const explicitSameHerDriftRiskInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.sameHerDriftRisk ?? null, 320)
  const summarySameHerDriftRiskInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.sameHerDriftRiskSummary, 320)
  const liveLatestProgressInput = explicitLatestProgressInput || summaryLatestProgressInput
  const livePrimaryOpenLoopInput = explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput
  const liveNextClosureTargetInput = explicitNextClosureTargetInput || summaryNextClosureTargetInput
  const liveSameHerDriftRiskInput = explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput
  const normalizedProjectBriefing = resolvedProjectBriefing
    ? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: {
          identity: resolvedIdentityInput || null,
          currentPhase: resolvedCurrentPhaseInput || null,
          latestLandedProgress: liveLatestProgressInput || null,
          primaryOpenLoop: livePrimaryOpenLoopInput || null,
          nextClosureTarget: liveNextClosureTargetInput || null,
          sameHerSelfLine: resolvedSameHerSelfLineInput || null,
          sameHerHoldDetail: resolvedSameHerHoldDetailInput || null,
          sameHerDriftRisk: liveSameHerDriftRiskInput || null,
          proactiveSameHerGap: resolvedProactiveSameHerGapInput || null,
          companionBriefingLine: resolvedCompanionBriefingLineInput || null,
          emotionalClosureSummary: resolvedEmotionalClosureSummaryInput || null,
          continuityCue: resolvedContinuityCueInput || null,
          continuityRestraint: resolvedContinuityRestraintInput || null,
          continuityPreferredTiming: resolvedProjectBriefing.continuityPreferredTiming ?? null,
          continuityCadence: resolvedContinuityCadenceInput || null,
          preferredBlinkCadence: resolvedProjectBriefing.preferredBlinkCadence ?? null,
          preferredGazeMode: resolvedProjectBriefing.preferredGazeMode ?? null,
          preferredVoiceMode: resolvedProjectBriefing.preferredVoiceMode ?? null,
          preferredPacingMode: resolvedProjectBriefing.preferredPacingMode ?? null,
          preflightSummary: resolvedPreflightSummaryInput || null,
          preDialogueAwarenessLine: resolvedPreDialogueAwarenessLineInput || null,
          awarenessLine: resolvedPreDialogueAwarenessLineInput || null,
        },
      })
    : null
  const canonicalPreDialogueAwarenessLine = resolvedProjectBriefing
    ? buildAlicizationProjectPreDialogueAwarenessLine({
        identity: normalizedProjectBriefing?.identity ?? resolvedIdentityInput ?? '',
        currentPhase: normalizedProjectBriefing?.currentPhase ?? resolvedCurrentPhaseInput ?? '',
        latestLandedProgress:
          normalizedProjectBriefing?.latestLandedProgress
          ?? normalizedProjectBriefing?.latestProgress
          ?? liveLatestProgressInput
          ?? null,
        primaryOpenLoop: normalizedProjectBriefing?.primaryOpenLoop ?? livePrimaryOpenLoopInput ?? null,
        nextClosureTarget: normalizedProjectBriefing?.nextClosureTarget ?? liveNextClosureTargetInput ?? '',
        sameHerSelfLine: normalizedProjectBriefing?.sameHerSelfLine ?? resolvedSameHerSelfLineInput ?? null,
      })
    : null
  const canonicalPreflightSummary = resolvedProjectBriefing
    ? buildAlicizationProjectStatePreflightSummary({
        identity: normalizedProjectBriefing?.identity ?? resolvedIdentityInput ?? '',
        currentPhase: normalizedProjectBriefing?.currentPhase ?? resolvedCurrentPhaseInput ?? '',
        primaryOpenLoop: normalizedProjectBriefing?.primaryOpenLoop ?? livePrimaryOpenLoopInput ?? null,
        nextClosureTarget: normalizedProjectBriefing?.nextClosureTarget ?? liveNextClosureTargetInput ?? '',
      })
    : null
  const preferredPreDialogueAwarenessLine = (() => {
    const rawInputAwarenessLine = resolvedPreDialogueAwarenessLineInput || null
    const normalizedRawInputAwarenessLine = rawInputAwarenessLine ?? ''
    const sharedResolvedAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        identity: normalizedProjectBriefing?.identity ?? resolvedIdentityInput ?? null,
        currentPhase: normalizedProjectBriefing?.currentPhase ?? resolvedCurrentPhaseInput ?? null,
        latestLandedProgress:
          normalizedProjectBriefing?.latestLandedProgress
          ?? normalizedProjectBriefing?.latestProgress
          ?? liveLatestProgressInput
          ?? null,
        primaryOpenLoop: normalizedProjectBriefing?.primaryOpenLoop ?? livePrimaryOpenLoopInput ?? null,
        nextClosureTarget: normalizedProjectBriefing?.nextClosureTarget ?? liveNextClosureTargetInput ?? null,
        sameHerSelfLine: normalizedProjectBriefing?.sameHerSelfLine ?? resolvedSameHerSelfLineInput ?? null,
        sameHerHoldDetail: normalizedProjectBriefing?.sameHerHoldDetail ?? resolvedSameHerHoldDetailInput ?? null,
        sameHerDriftRisk: normalizedProjectBriefing?.sameHerDriftRisk ?? liveSameHerDriftRiskInput ?? null,
        sameHerDriftRiskSummary: normalizedProjectBriefing?.sameHerDriftRisk ?? liveSameHerDriftRiskInput ?? null,
        preDialogueAwarenessLine: normalizedRawInputAwarenessLine,
        awarenessLine: normalizedRawInputAwarenessLine,
        companionHeadlineLine: normalizedProjectBriefing?.companionHeadlineLine ?? null,
        companionBriefingLine: normalizedProjectBriefing?.companionBriefingLine ?? resolvedCompanionBriefingLineInput ?? null,
        preDialogueAwarenessSummary: normalizedProjectBriefing?.preDialogueAwarenessSummary ?? null,
        continuityRestraint: resolvedContinuityRestraintInput || null,
        continuityCadence: resolvedContinuityCadenceInput || null,
        preflightSummary: canonicalPreflightSummary ?? normalizedProjectBriefing?.preflightSummary ?? resolvedPreflightSummaryInput ?? null,
      },
    })
    const rawInputAwarenessLooksWeak
      = !normalizedRawInputAwarenessLine
        || looksLikeEmbodimentOnlyExecutionAwarenessLead(normalizedRawInputAwarenessLine)
        || isAlicizationThinProjectAwarenessLine(normalizedRawInputAwarenessLine)
        || !carriesExecutionProjectAwarenessAnchor(normalizedRawInputAwarenessLine)
    if (
      sharedResolvedAwarenessLine
      && sharedResolvedAwarenessLine !== normalizedRawInputAwarenessLine
      && rawInputAwarenessLooksWeak
      && carriesExecutionProjectAwarenessAnchor(sharedResolvedAwarenessLine)
      && !isAlicizationThinProjectAwarenessLine(sharedResolvedAwarenessLine)
    ) {
      return sharedResolvedAwarenessLine
    }
    if (
      rawInputAwarenessLine
      && !isAlicizationThinProjectAwarenessLine(rawInputAwarenessLine)
      && carriesExecutionProjectAwarenessAnchor(rawInputAwarenessLine)
    ) {
      return rawInputAwarenessLine
    }

    const normalizedAwarenessSummary = normalizedProjectBriefing?.preDialogueAwarenessSummary ?? null
    if (
      normalizedAwarenessSummary
      && !isAlicizationThinProjectAwarenessLine(normalizedAwarenessSummary)
      && carriesExecutionProjectAwarenessAnchor(normalizedAwarenessSummary)
    ) {
      return normalizedAwarenessSummary
    }

    const normalizedAwarenessLine = normalizedProjectBriefing?.preDialogueAwarenessLine ?? null
    if (
      normalizedAwarenessLine
      && !isAlicizationThinProjectAwarenessLine(normalizedAwarenessLine)
      && carriesExecutionProjectAwarenessAnchor(normalizedAwarenessLine)
    ) {
      return normalizedAwarenessLine
    }

    if (canonicalPreDialogueAwarenessLine)
      return canonicalPreDialogueAwarenessLine

    return canonicalPreflightSummary
      ?? normalizedProjectBriefing?.preflightSummary
      ?? resolvedPreflightSummaryInput
      ?? normalizedAwarenessSummary
      ?? normalizedAwarenessLine
      ?? canonicalPreDialogueAwarenessLine
      ?? rawInputAwarenessLine
      ?? null
  })()
  const explicitExecutionContinuityBehaviorMode
    = sanitizeExecutionProjectBriefingText(
      resolvedContinuityCadenceInput
      ?? resolvedContinuityRestraintInput,
      64,
    ) || null
  const executionContinuityCue = sanitizeBoundedText(
    resolvedContinuityCueInput
    || buildExecutionProjectContinuityCueFallback({
      continuityBehaviorMode: explicitExecutionContinuityBehaviorMode,
      currentPhase: normalizedProjectBriefing?.currentPhase ?? resolvedProjectBriefing?.currentPhase,
      sameHerSelfLine: normalizedProjectBriefing?.sameHerSelfLine ?? resolvedProjectBriefing?.sameHerSelfLine,
      fallback: normalizedProjectBriefing?.continuityCue,
    }),
    220,
  ) || null
  const executionSameHerHoldDetailFallback = buildExecutionProjectSameHerHoldDetailFallback({
    continuityBehaviorMode: explicitExecutionContinuityBehaviorMode,
    currentPhase: normalizedProjectBriefing?.currentPhase ?? resolvedProjectBriefing?.currentPhase,
    sameHerSelfLine: normalizedProjectBriefing?.sameHerSelfLine ?? resolvedProjectBriefing?.sameHerSelfLine,
    fallback: normalizedProjectBriefing?.sameHerHoldDetail,
  })
  const executionCompanionBriefingLine = sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.companionBriefingLine, 320)
    || resolvedCompanionBriefingLineInput
    || null
  const executionEmotionalClosureSummary = sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.emotionalClosureSummary, 240)
    || resolvedEmotionalClosureSummaryInput
    || null
  const executionContinuityRestraint = normalizedProjectBriefing?.continuityRestraint
    ?? (
      resolvedProjectBriefing?.continuityRestraint === 'lower-pressure'
      || resolvedProjectBriefing?.continuityRestraint === 'measured-return'
      || resolvedProjectBriefing?.continuityRestraint === 'repair-before-closeness'
      || resolvedProjectBriefing?.continuityRestraint === 'rest-protective'
      || resolvedProjectBriefing?.continuityRestraint === 'single-thread'
        ? resolvedProjectBriefing.continuityRestraint
        : null
    )
  const executionContinuityPreferredTiming = normalizedProjectBriefing?.continuityPreferredTiming
    ?? (
      resolvedProjectBriefing?.continuityPreferredTiming === 'internal-only'
      || resolvedProjectBriefing?.continuityPreferredTiming === 'after-payoff'
      || resolvedProjectBriefing?.continuityPreferredTiming === 'same-turn-if-invited'
      || resolvedProjectBriefing?.continuityPreferredTiming === 'next-open-window'
        ? resolvedProjectBriefing.continuityPreferredTiming
        : null
    )
  const executionContinuityCadence = sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.continuityCadence, 120)
    || resolvedContinuityCadenceInput
    || null
  const executionPreferredBlinkCadence = normalizedProjectBriefing?.preferredBlinkCadence
    ?? (
      resolvedProjectBriefing?.preferredBlinkCadence === 'normal'
      || resolvedProjectBriefing?.preferredBlinkCadence === 'linger'
      || resolvedProjectBriefing?.preferredBlinkCadence === 'quiet'
        ? resolvedProjectBriefing.preferredBlinkCadence
        : null
    )
  const executionPreferredGazeMode = normalizedProjectBriefing?.preferredGazeMode
    ?? (
      resolvedProjectBriefing?.preferredGazeMode === 'steady'
      || resolvedProjectBriefing?.preferredGazeMode === 'soften'
      || resolvedProjectBriefing?.preferredGazeMode === 'drift'
        ? resolvedProjectBriefing.preferredGazeMode
        : null
    )
  const executionPreferredVoiceMode = normalizedProjectBriefing?.preferredVoiceMode
    ?? (
      resolvedProjectBriefing?.preferredVoiceMode === 'lower-pressure'
      || resolvedProjectBriefing?.preferredVoiceMode === 'even'
        ? resolvedProjectBriefing.preferredVoiceMode
        : null
    )
  const executionPreferredPacingMode = normalizedProjectBriefing?.preferredPacingMode
    ?? (
      resolvedProjectBriefing?.preferredPacingMode === 'slower'
      || resolvedProjectBriefing?.preferredPacingMode === 'natural'
        ? resolvedProjectBriefing.preferredPacingMode
        : null
    )
  const affectiveResidue = input.affectiveResidue ?? null
  const derivedMindStateBundle = input.derivedMindStateBundle ?? null

  return {
    generatedAt: getNow(),
    cardId: sanitizeText(input.cardId) || null,
    decisionTraceId: sanitizeText(input.decisionTraceId) || null,
    turnId: sanitizeText(input.turnId) || null,
    sessionId: sanitizeText(input.sessionId) || null,
    agentSessionId: sanitizeText(input.agentSessionId) || null,
    ...(affectiveResidue ? { affectiveResidue } : {}),
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
    projectBriefing: resolvedProjectBriefing
      ? {
          identity: sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.identity ?? resolvedIdentityInput, 220) || null,
          currentPhase: sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.currentPhase ?? resolvedCurrentPhaseInput, 220) || null,
          latestLandedProgress: sanitizeExecutionProjectBriefingText(
            !explicitLatestProgressInput && summaryLatestProgressInput
              ? summaryLatestProgressInput
              : (normalizedProjectBriefing?.latestLandedProgress ?? normalizedProjectBriefing?.latestProgress ?? liveLatestProgressInput),
            320,
          ) || null,
          primaryOpenLoop: sanitizeExecutionProjectBriefingText(
            !explicitPrimaryOpenLoopInput && summaryPrimaryOpenLoopInput
              ? summaryPrimaryOpenLoopInput
              : (normalizedProjectBriefing?.primaryOpenLoop ?? livePrimaryOpenLoopInput),
            320,
          ) || null,
          nextClosureTarget: sanitizeExecutionProjectBriefingText(
            !explicitNextClosureTargetInput && summaryNextClosureTargetInput
              ? summaryNextClosureTargetInput
              : (normalizedProjectBriefing?.nextClosureTarget ?? liveNextClosureTargetInput),
            320,
          ) || null,
          sameHerSelfLine: sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.sameHerSelfLine ?? resolvedSameHerSelfLineInput, 220) || null,
          sameHerHoldDetail: preferExecutionProjectSameHerHoldDetail({
            current: resolvedSameHerHoldDetailInput,
            continuityCue: executionContinuityCue,
            fallback: executionSameHerHoldDetailFallback,
          }),
          sameHerDriftRisk: sanitizeExecutionProjectBriefingText(
            !explicitSameHerDriftRiskInput && summarySameHerDriftRiskInput
              ? summarySameHerDriftRiskInput
              : (normalizedProjectBriefing?.sameHerDriftRisk ?? liveSameHerDriftRiskInput),
            320,
          ) || null,
          proactiveSameHerGap: sanitizeExecutionProjectBriefingText(
            normalizedProjectBriefing?.proactiveSameHerGap ?? resolvedProactiveSameHerGapInput,
            320,
          ) || null,
          companionBriefingLine: executionCompanionBriefingLine,
          emotionalClosureSummary: executionEmotionalClosureSummary,
          continuityRestraint: executionContinuityRestraint,
          continuityCue: executionContinuityCue,
          continuityPreferredTiming: executionContinuityPreferredTiming,
          continuityCadence: executionContinuityCadence,
          preferredBlinkCadence: executionPreferredBlinkCadence,
          preferredGazeMode: executionPreferredGazeMode,
          preferredVoiceMode: executionPreferredVoiceMode,
          preferredPacingMode: executionPreferredPacingMode,
          preflightSummary: sanitizeExecutionProjectBriefingText(canonicalPreflightSummary ?? normalizedProjectBriefing?.preflightSummary ?? resolvedPreflightSummaryInput, 320) || null,
          preDialogueAwarenessLine: sanitizeExecutionProjectBriefingText(preferredPreDialogueAwarenessLine, 320) || null,
        }
      : null,
    recentActions: Array.isArray(input.recentActions)
      ? input.recentActions
          .map(action => ({
            kind: action.kind,
            status: action.status,
            threadStatus: action.threadStatus ?? null,
            label: sanitizeBoundedText(action.label, 120),
            summary: sanitizeBoundedText(action.summary, 180) || null,
          }))
          .filter(action => action.label)
          .slice(0, 6)
      : [],
    sensory: {
      collectedAt: input.sensorySnapshot.sample.collectedAt ?? null,
      running: input.sensorySnapshot.running !== false,
      stale: input.sensorySnapshot.stale === true,
      ageMs: Number.isFinite(input.sensorySnapshot.ageMs) ? Math.max(0, Math.floor(input.sensorySnapshot.ageMs)) : 0,
      foregroundWindow: foregroundWindow
        ? {
            appName: sanitizeText(foregroundWindow.appName) || undefined,
            processName: sanitizeText(foregroundWindow.processName) || undefined,
            title: sanitizeText(foregroundWindow.title, '') || undefined,
          }
        : null,
      capture: capture
        ? {
            health: capture.health ?? null,
            permission: capture.permission ?? null,
            sourceCount: typeof capture.sourceCount === 'number' ? capture.sourceCount : null,
            lastUpdatedAt: capture.lastUpdatedAt ?? null,
            lastError: sanitizeText(capture.lastError) || null,
            degradedReasons: [...new Set(capture.degradedReasons
              .map(reason => sanitizeText(reason))
              .filter(Boolean))],
          }
        : null,
    },
  }
}
