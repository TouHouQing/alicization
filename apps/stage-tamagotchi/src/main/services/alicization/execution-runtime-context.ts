import type {
  AlicizationDigitalLifeSpineMemoryClosureTrace,
  AlicizationExecutionRuntimeContext,
  AlicizationExecutionRuntimeMemoryClosureExecution,
} from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
} from '@proj-alicization/stage-shared'

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

function compactExecutionRuntimeList(raw: readonly unknown[] | null | undefined, maxItems: number, maxChars: number) {
  if (!Array.isArray(raw))
    return []

  const items: string[] = []
  for (const item of raw) {
    const normalized = sanitizeBoundedText(item, maxChars)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function buildMemoryClosureExecutionFromTrace(
  trace: AlicizationDigitalLifeSpineMemoryClosureTrace | null | undefined,
): AlicizationExecutionRuntimeMemoryClosureExecution | null {
  if (!trace || trace.authority !== 'memory-os')
    return null

  const execution = trace.nextInfluence.execution
  const normalized = {
    authority: 'memory-os',
    carry: sanitizeBoundedText(execution.carry, 220) || null,
    nextLearningAction: sanitizeBoundedText(execution.nextLearningAction, 80) || null,
    shouldVerify: execution.shouldVerify === true,
    shouldReflect: execution.shouldReflect === true,
    activeLearningFocuses: compactExecutionRuntimeList(execution.activeLearningFocuses, 8, 120),
    reasonTags: compactExecutionRuntimeList(trace.reasonTags, 12, 80),
    closureState: {
      state: sanitizeBoundedText(trace.closureState.state, 80) || null,
      open: trace.closureState.open === true,
      revisionRequired: trace.closureState.revisionRequired === true,
      shouldLabelUncertainty: trace.closureState.shouldLabelUncertainty === true,
      visibleCarryMode: sanitizeBoundedText(trace.closureState.visibleCarryMode, 80) || null,
      retrievalQuality: sanitizeBoundedText(trace.closureState.retrievalQuality, 80) || null,
      conflictPressure: sanitizeBoundedText(trace.closureState.conflictPressure, 80) || null,
    },
  } satisfies AlicizationExecutionRuntimeMemoryClosureExecution

  return normalized.carry
    || normalized.nextLearningAction
    || normalized.shouldVerify
    || normalized.shouldReflect
    || normalized.activeLearningFocuses.length > 0
    || normalized.reasonTags.length > 0
    || Object.values(normalized.closureState).some(Boolean)
    ? normalized
    : null
}

const EXECUTION_PROJECT_BRIEFING_PLACEHOLDER_VALUES = new Set([
  'none',
  'null',
  'unknown',
  'n/a',
  'na',
])

type ExecutionProjectBriefingField
  = | 'identity'
    | 'phase'
    | 'landed'
    | 'open'
    | 'next'
    | 'continuity_anchor'
    | 'continuity_hold'
    | 'continuity_drift_risk'
    | 'initiative_gap'
    | 'emotional_closure'
    | 'awareness'
    | 'generic'

function sanitizeExecutionProjectBriefingText(
  raw: unknown,
  maxChars: number,
  field: ExecutionProjectBriefingField = 'generic',
) {
  const normalized = sanitizeBoundedText(raw, maxChars)
  if (!normalized)
    return ''

  if (EXECUTION_PROJECT_BRIEFING_PLACEHOLDER_VALUES.has(normalized.toLowerCase()))
    return ''

  if (!containsAlicizationFixedTemplateResidue(normalized))
    return normalized

  const extractStructuredFieldValue = (
    structured: string,
    key: string,
  ) => structured
    .split('|')
    .map(part => part.trim())
    .find(part => part.startsWith(`${key}=`))
    ?.replace(new RegExp(`^${key}=`, 'u'), '')
    .trim()
    || ''

  if (field === 'identity')
    return 'runtime_personhood'
  if (field === 'phase')
    return 'life_core'
  if (field === 'awareness') {
    return formatAlicizationProjectStateAwarenessFields({
      identity: normalized,
      currentPhase: normalized,
      latestLandedProgress: normalized,
      primaryOpenLoop: normalized,
      nextClosureTarget: normalized,
      sameHerSelfLine: normalized,
      sameHerHoldDetail: normalized,
      sameHerDriftRisk: normalized,
      emotionalClosureCue: normalized,
      maxChars,
    })
  }
  if (field === 'landed')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ latestLandedProgress: normalized, maxChars }), 'landed')
  if (field === 'open')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ primaryOpenLoop: normalized, maxChars }), 'open')
  if (field === 'next')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ nextClosureTarget: normalized, maxChars }), 'next')
  if (field === 'continuity_anchor')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ sameHerSelfLine: normalized, maxChars }), 'continuity_anchor')
  if (field === 'continuity_hold')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ sameHerHoldDetail: normalized, maxChars }), 'continuity_hold')
  if (field === 'continuity_drift_risk')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ sameHerDriftRisk: normalized, maxChars }), 'continuity_drift_risk')
  if (field === 'initiative_gap')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ proactiveSameHerGap: normalized, maxChars }), 'initiative_gap')
  if (field === 'emotional_closure')
    return extractStructuredFieldValue(formatAlicizationProjectStateAwarenessFields({ emotionalClosureCue: normalized, maxChars }), 'emotional_closure')

  return alicizationFixedTemplateReplacement
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

  return /(?:^|\|\s*)(identity|phase|landed|open|next|continuity_anchor|continuity_hold|continuity_drift_risk|emotional_closure)=/iu.test(text)
    || /visibility=internal-structured|phase1_local_digital_life|open_loop=|runtime_loop_validation=|project_state_review=|embodiment_scale_validation=/iu.test(text)
}

function preferStrongerExecutionProjectAwarenessCandidate(input: {
  currentAwarenessLine?: unknown
  candidate?: unknown
}) {
  const currentAwarenessLine = sanitizeExecutionProjectBriefingText(input.currentAwarenessLine, 320, 'awareness')
  const candidate = sanitizeExecutionProjectBriefingText(input.candidate, 320, 'awareness')
  if (!candidate)
    return ''

  const currentAwarenessLooksThin
    = !currentAwarenessLine
      || looksLikeEmbodimentOnlyExecutionAwarenessLead(currentAwarenessLine)
      || isAlicizationThinProjectAwarenessLine(currentAwarenessLine)
      || !carriesExecutionProjectAwarenessAnchor(currentAwarenessLine)
  if (!currentAwarenessLooksThin)
    return ''
  if (isAlicizationThinProjectAwarenessLine(candidate))
    return ''
  if (!carriesExecutionProjectAwarenessAnchor(candidate))
    return ''

  return candidate
}

function buildExecutionProjectContinuityCueFallback(input: {
  continuityBehaviorMode?: unknown
  currentPhase?: unknown
  fallback?: unknown
  sameHerSelfLine?: unknown
}) {
  const fallback = sanitizeExecutionProjectBriefingText(input.fallback, 220, 'continuity_hold')
  const continuityBehaviorMode = sanitizeExecutionProjectBriefingText(input.continuityBehaviorMode, 64)
  const currentPhase = sanitizeExecutionProjectBriefingText(input.currentPhase, 220, 'phase')
  const sameHerSelfLine = sanitizeExecutionProjectBriefingText(input.sameHerSelfLine, 220, 'continuity_anchor')
  if (continuityBehaviorMode === 'repair-before-closeness')
    return 'continuity_cue=repair_before_closeness; until=repair_settles'
  if (continuityBehaviorMode === 'rest-protective')
    return 'continuity_cue=rest_protective; direction=inward; widening=deferred'
  if (continuityBehaviorMode === 'measured-return')
    return 'continuity_cue=measured_return; widening=deferred'
  if (
    /phase 1: local digital life/iu.test(currentPhase)
    || /same phase 1 digital life/iu.test(sameHerSelfLine)
  ) {
    const genericContinuityCue = 'continuity_cue=project_context_active; widening=deferred'
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
  const fallback = sanitizeExecutionProjectBriefingText(input.fallback, 220, 'continuity_hold')
  const continuityBehaviorMode = sanitizeExecutionProjectBriefingText(input.continuityBehaviorMode, 64)
  const currentPhase = sanitizeExecutionProjectBriefingText(input.currentPhase, 220, 'phase')
  const sameHerSelfLine = sanitizeExecutionProjectBriefingText(input.sameHerSelfLine, 220, 'continuity_anchor')
  if (fallback)
    return fallback
  if (continuityBehaviorMode === 'repair-before-closeness')
    return 'hold_detail=repair_before_closeness; closeness_widening=deferred'
  if (continuityBehaviorMode === 'rest-protective')
    return 'hold_detail=rest_protective; direction=inward; fatigue_aware=true'
  if (continuityBehaviorMode === 'measured-return')
    return 'hold_detail=measured_return; pressure=lower; widening=deferred'
  if (
    /phase 1: local digital life/iu.test(currentPhase)
    || /same phase 1 digital life/iu.test(sameHerSelfLine)
  ) {
    const genericSameHerHoldDetail = 'hold_detail=project_context_inward; widening=deferred'
    return genericSameHerHoldDetail
  }
  return fallback || null
}

function preferExecutionProjectSameHerHoldDetail(input: {
  current?: unknown
  continuityCue?: unknown
  fallback?: unknown
}) {
  const current = sanitizeExecutionProjectBriefingText(input.current, 220, 'continuity_hold')
  const continuityCue = sanitizeExecutionProjectBriefingText(input.continuityCue, 220, 'continuity_hold')
  const fallback = sanitizeExecutionProjectBriefingText(input.fallback, 220, 'continuity_hold')
  if (!current) {
    const preferredFallback = fallback || continuityCue || null
    return sanitizeBoundedText(preferredFallback, 220) || null
  }

  const preferredPrimary
    = preferStrongerContinuityClosureAuthority(current, fallback)
      || current
      || fallback
      || null
  const cuePreferredOverPrimary = preferStrongerContinuityClosureAuthority(preferredPrimary, continuityCue)
  const continuityCueLooksLikeGenericModeFallback
    = continuityCue
      ? /continuity_cue=(?:repair_before_closeness|rest_protective|measured_return)|hold_detail=project_context_inward/iu.test(
          continuityCue,
        )
      : false
  const shouldKeepPrimaryOverGenericCue = Boolean(
    cuePreferredOverPrimary
    && cuePreferredOverPrimary === continuityCue
    && continuityCueLooksLikeGenericModeFallback,
  )
  const preferredFinal = shouldKeepPrimaryOverGenericCue
    ? preferredPrimary
    : cuePreferredOverPrimary
      || preferredPrimary
      || continuityCue
      || null

  const normalizedPreferredFinal = (() => {
    const base = sanitizeBoundedText(preferredFinal, 220)
    if (!base)
      return null
    if (/widening=deferred|closeness_widening=deferred|fatigue_aware=true/iu.test(base))
      return base
    if (/remembered living line|generic assistant shell|detached project narration/iu.test(base)) {
      return sanitizeBoundedText(`${base}; reopening=inward; widening=deferred`, 220) || base
    }
    return base
  })()

  return normalizedPreferredFinal || null
}

export function buildAlicizationExecutionRuntimeContext(input: {
  agentSessionId?: string | null
  affectiveResidue?: AlicizationExecutionRuntimeContext['affectiveResidue']
  cardId: string
  decisionTraceId?: string | null
  derivedMindStateBundle?: AlicizationExecutionRuntimeContext['derivedMindStateBundle']
  memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
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
    continuityArcStage?: string | null
    continuityRestraint?: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
    sameHerDriftRisk?: string | null
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGap?: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    emotionalClosureSummary?: string | null
    continuityCue?: string | null
    continuityPreferredTiming?: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
    continuityCadence?: string | null
    preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
    preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
    preferredPauseMode?: 'longer' | 'natural' | null
    preferredLipsyncMode?: 'restrained' | 'matched' | null
    preferredVoiceMode?: 'lower-pressure' | 'even' | null
    preferredPacingMode?: 'slower' | 'natural' | null
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    preDialogueAwarenessSummary?: string | null
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
    continuityArcStage: null,
    sameHerDriftRisk: fallbackProjectBrief.sameHerDriftRisk,
    proactiveSameHerGap: fallbackProjectBrief.proactiveSameHerGap ?? null,
    companionHeadlineLine: null,
    companionBriefingLine: null,
    emotionalClosureSummary: fallbackProjectBrief.emotionalClosureSummary ?? fallbackProjectBrief.emotionalClosureCue ?? null,
    continuityCue: fallbackProjectBrief.continuityCue ?? null,
    continuityRestraint: fallbackProjectBrief.continuityRestraint ?? null,
    continuityPreferredTiming: null,
    continuityCadence: null,
    preferredBlinkCadence: fallbackProjectBrief.preferredBlinkCadence ?? null,
    preferredGazeMode: fallbackProjectBrief.preferredGazeMode ?? null,
    preferredPauseMode: fallbackProjectBrief.preferredPauseMode ?? null,
    preferredLipsyncMode: fallbackProjectBrief.preferredLipsyncMode ?? null,
    preferredVoiceMode: fallbackProjectBrief.preferredVoiceMode ?? null,
    preferredPacingMode: fallbackProjectBrief.preferredPacingMode ?? null,
    preflightSummary: fallbackProjectBrief.preflightSummary ?? null,
    preDialogueAwarenessLine: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
    preDialogueAwarenessSummary: fallbackProjectBrief.preDialogueAwarenessLine ?? null,
  }
  const summaryAliasProjectBriefing = resolvedProjectBriefing as {
    latestProgress?: unknown
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  const resolvedIdentityInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.identity ?? null, 220, 'identity')
  const resolvedCurrentPhaseInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.currentPhase ?? null, 220, 'phase')
  const resolvedSameHerSelfLineInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.sameHerSelfLine ?? null, 220, 'continuity_anchor')
  const resolvedSameHerHoldDetailInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.sameHerHoldDetail ?? null, 220, 'continuity_hold')
  const resolvedContinuityArcStageInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.continuityArcStage ?? null, 120)
  const resolvedProactiveSameHerGapInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.proactiveSameHerGap ?? null, 320, 'initiative_gap')
  const resolvedCompanionHeadlineLineInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.companionHeadlineLine ?? null, 320, 'awareness')
  const resolvedCompanionBriefingLineInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.companionBriefingLine ?? null, 320, 'awareness')
  const resolvedEmotionalClosureSummaryInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.emotionalClosureSummary ?? null, 240, 'emotional_closure')
  const resolvedContinuityCueInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.continuityCue ?? null, 220, 'continuity_hold')
  const resolvedContinuityRestraintInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.continuityRestraint ?? null, 64)
  const resolvedContinuityCadenceInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.continuityCadence ?? null, 120)
  const resolvedPreflightSummaryInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.preflightSummary ?? null, 320, 'awareness')
  const resolvedPreDialogueAwarenessLineInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.preDialogueAwarenessLine ?? null, 320, 'awareness')
  const resolvedPreDialogueAwarenessSummaryInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.preDialogueAwarenessSummary ?? null, 320, 'awareness')
  const explicitLatestProgressInput = sanitizeExecutionProjectBriefingText(
    resolvedProjectBriefing?.latestLandedProgress ?? summaryAliasProjectBriefing?.latestProgress ?? null,
    320,
    'landed',
  )
  const summaryLatestProgressInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.landedProgressSummary, 320, 'landed')
  const explicitPrimaryOpenLoopInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.primaryOpenLoop ?? null, 320, 'open')
  const summaryPrimaryOpenLoopInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.openClosureSummary, 320, 'open')
  const explicitNextClosureTargetInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.nextClosureTarget ?? null, 320, 'next')
  const summaryNextClosureTargetInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.nextClosureTargetSummary, 320, 'next')
  const explicitSameHerDriftRiskInput = sanitizeExecutionProjectBriefingText(resolvedProjectBriefing?.sameHerDriftRisk ?? null, 320, 'continuity_drift_risk')
  const summarySameHerDriftRiskInput = sanitizeExecutionProjectBriefingText(summaryAliasProjectBriefing?.sameHerDriftRiskSummary, 320, 'continuity_drift_risk')
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
          continuityArcStage: resolvedContinuityArcStageInput || null,
          sameHerDriftRisk: liveSameHerDriftRiskInput || null,
          proactiveSameHerGap: resolvedProactiveSameHerGapInput || null,
          companionHeadlineLine: resolvedCompanionHeadlineLineInput || null,
          companionBriefingLine: resolvedCompanionBriefingLineInput || null,
          emotionalClosureSummary: resolvedEmotionalClosureSummaryInput || null,
          continuityCue: resolvedContinuityCueInput || null,
          continuityRestraint: resolvedContinuityRestraintInput || null,
          continuityPreferredTiming: resolvedProjectBriefing.continuityPreferredTiming ?? null,
          continuityCadence: resolvedContinuityCadenceInput || null,
          preferredBlinkCadence: resolvedProjectBriefing.preferredBlinkCadence ?? null,
          preferredGazeMode: resolvedProjectBriefing.preferredGazeMode ?? null,
          preferredPauseMode: resolvedProjectBriefing.preferredPauseMode ?? null,
          preferredLipsyncMode: resolvedProjectBriefing.preferredLipsyncMode ?? null,
          preferredVoiceMode: resolvedProjectBriefing.preferredVoiceMode ?? null,
          preferredPacingMode: resolvedProjectBriefing.preferredPacingMode ?? null,
          preflightSummary: resolvedPreflightSummaryInput || null,
          preDialogueAwarenessLine: resolvedPreDialogueAwarenessLineInput || null,
          awarenessLine: resolvedPreDialogueAwarenessLineInput || null,
          preDialogueAwarenessSummary: resolvedPreDialogueAwarenessSummaryInput || null,
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

    const strongerAwarenessSummary = preferStrongerExecutionProjectAwarenessCandidate({
      currentAwarenessLine: normalizedRawInputAwarenessLine,
      candidate: resolvedPreDialogueAwarenessSummaryInput ?? normalizedProjectBriefing?.preDialogueAwarenessSummary ?? null,
    })
    if (strongerAwarenessSummary)
      return strongerAwarenessSummary

    const strongerCompanionHeadlineLine = preferStrongerExecutionProjectAwarenessCandidate({
      currentAwarenessLine: normalizedRawInputAwarenessLine,
      candidate: normalizedProjectBriefing?.companionHeadlineLine ?? resolvedCompanionHeadlineLineInput ?? null,
    })
    if (strongerCompanionHeadlineLine)
      return strongerCompanionHeadlineLine

    const normalizedAwarenessSummary = normalizedProjectBriefing?.preDialogueAwarenessSummary ?? null
    if (
      normalizedAwarenessSummary
      && !isAlicizationThinProjectAwarenessLine(normalizedAwarenessSummary)
      && carriesExecutionProjectAwarenessAnchor(normalizedAwarenessSummary)
    ) {
      return normalizedAwarenessSummary
    }

    const normalizedCompanionHeadlineLine = normalizedProjectBriefing?.companionHeadlineLine ?? resolvedCompanionHeadlineLineInput ?? null
    if (
      normalizedCompanionHeadlineLine
      && !isAlicizationThinProjectAwarenessLine(normalizedCompanionHeadlineLine)
      && carriesExecutionProjectAwarenessAnchor(normalizedCompanionHeadlineLine)
    ) {
      return normalizedCompanionHeadlineLine
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
  const preferredPreDialogueAwarenessSummary = (() => {
    const rawInputAwarenessSummary = sanitizeExecutionProjectBriefingText(
      resolvedPreDialogueAwarenessSummaryInput,
      320,
    ) || null
    if (
      rawInputAwarenessSummary
      && !isAlicizationThinProjectAwarenessLine(rawInputAwarenessSummary)
      && carriesExecutionProjectAwarenessAnchor(rawInputAwarenessSummary)
    ) {
      return rawInputAwarenessSummary
    }

    const normalizedAwarenessSummary = sanitizeExecutionProjectBriefingText(
      normalizedProjectBriefing?.preDialogueAwarenessSummary
      ?? rawInputAwarenessSummary
      ?? null,
      320,
    ) || null
    if (
      normalizedAwarenessSummary
      && !isAlicizationThinProjectAwarenessLine(normalizedAwarenessSummary)
      && carriesExecutionProjectAwarenessAnchor(normalizedAwarenessSummary)
    ) {
      return normalizedAwarenessSummary
    }
    if (
      preferredPreDialogueAwarenessLine
      && !isAlicizationThinProjectAwarenessLine(preferredPreDialogueAwarenessLine)
      && carriesExecutionProjectAwarenessAnchor(preferredPreDialogueAwarenessLine)
    ) {
      return preferredPreDialogueAwarenessLine
    }
    return normalizedAwarenessSummary ?? preferredPreDialogueAwarenessLine ?? null
  })()
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
  const executionCompanionBriefingLine = sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.companionBriefingLine, 320, 'awareness')
    || resolvedCompanionBriefingLineInput
    || null
  const executionEmotionalClosureSummary = sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.emotionalClosureSummary, 240, 'emotional_closure')
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
  const executionPreferredPauseMode = normalizedProjectBriefing?.preferredPauseMode
    ?? (
      resolvedProjectBriefing?.preferredPauseMode === 'longer'
      || resolvedProjectBriefing?.preferredPauseMode === 'natural'
        ? resolvedProjectBriefing.preferredPauseMode
        : null
    )
  const executionPreferredLipsyncMode = normalizedProjectBriefing?.preferredLipsyncMode
    ?? (
      resolvedProjectBriefing?.preferredLipsyncMode === 'restrained'
      || resolvedProjectBriefing?.preferredLipsyncMode === 'matched'
        ? resolvedProjectBriefing.preferredLipsyncMode
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
  const memoryClosureExecution = buildMemoryClosureExecutionFromTrace(input.memoryClosureTrace)

  return {
    generatedAt: getNow(),
    cardId: sanitizeText(input.cardId) || null,
    decisionTraceId: sanitizeText(input.decisionTraceId) || null,
    turnId: sanitizeText(input.turnId) || null,
    sessionId: sanitizeText(input.sessionId) || null,
    agentSessionId: sanitizeText(input.agentSessionId) || null,
    ...(affectiveResidue ? { affectiveResidue } : {}),
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
    ...(memoryClosureExecution ? { memoryClosureExecution } : {}),
    projectBriefing: resolvedProjectBriefing
      ? {
          identity: sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.identity ?? resolvedIdentityInput, 220, 'identity') || null,
          currentPhase: sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.currentPhase ?? resolvedCurrentPhaseInput, 220, 'phase') || null,
          latestLandedProgress: sanitizeExecutionProjectBriefingText(
            !explicitLatestProgressInput && summaryLatestProgressInput
              ? summaryLatestProgressInput
              : (normalizedProjectBriefing?.latestLandedProgress ?? normalizedProjectBriefing?.latestProgress ?? liveLatestProgressInput),
            320,
            'landed',
          ) || null,
          primaryOpenLoop: sanitizeExecutionProjectBriefingText(
            !explicitPrimaryOpenLoopInput && summaryPrimaryOpenLoopInput
              ? summaryPrimaryOpenLoopInput
              : (normalizedProjectBriefing?.primaryOpenLoop ?? livePrimaryOpenLoopInput),
            320,
            'open',
          ) || null,
          nextClosureTarget: sanitizeExecutionProjectBriefingText(
            !explicitNextClosureTargetInput && summaryNextClosureTargetInput
              ? summaryNextClosureTargetInput
              : (normalizedProjectBriefing?.nextClosureTarget ?? liveNextClosureTargetInput),
            320,
            'next',
          ) || null,
          sameHerSelfLine: sanitizeExecutionProjectBriefingText(normalizedProjectBriefing?.sameHerSelfLine ?? resolvedSameHerSelfLineInput, 220, 'continuity_anchor') || null,
          sameHerHoldDetail: preferExecutionProjectSameHerHoldDetail({
            current: resolvedSameHerHoldDetailInput,
            continuityCue: executionContinuityCue,
            fallback: executionSameHerHoldDetailFallback,
          }),
          continuityArcStage: sanitizeExecutionProjectBriefingText(
            normalizedProjectBriefing?.continuityArcStage ?? resolvedContinuityArcStageInput,
            120,
          ) || null,
          sameHerDriftRisk: sanitizeExecutionProjectBriefingText(
            !explicitSameHerDriftRiskInput && summarySameHerDriftRiskInput
              ? summarySameHerDriftRiskInput
              : (normalizedProjectBriefing?.sameHerDriftRisk ?? liveSameHerDriftRiskInput),
            320,
            'continuity_drift_risk',
          ) || null,
          proactiveSameHerGap: sanitizeExecutionProjectBriefingText(
            normalizedProjectBriefing?.proactiveSameHerGap ?? resolvedProactiveSameHerGapInput,
            320,
            'initiative_gap',
          ) || null,
          companionBriefingLine: executionCompanionBriefingLine,
          emotionalClosureSummary: executionEmotionalClosureSummary,
          continuityRestraint: executionContinuityRestraint,
          continuityCue: executionContinuityCue,
          continuityPreferredTiming: executionContinuityPreferredTiming,
          continuityCadence: executionContinuityCadence,
          preferredBlinkCadence: executionPreferredBlinkCadence,
          preferredGazeMode: executionPreferredGazeMode,
          preferredPauseMode: executionPreferredPauseMode,
          preferredLipsyncMode: executionPreferredLipsyncMode,
          preferredVoiceMode: executionPreferredVoiceMode,
          preferredPacingMode: executionPreferredPacingMode,
          preflightSummary: sanitizeExecutionProjectBriefingText(canonicalPreflightSummary ?? normalizedProjectBriefing?.preflightSummary ?? resolvedPreflightSummaryInput, 320, 'awareness') || null,
          preDialogueAwarenessLine: sanitizeExecutionProjectBriefingText(preferredPreDialogueAwarenessLine, 320, 'awareness') || null,
          preDialogueAwarenessSummary: sanitizeExecutionProjectBriefingText(preferredPreDialogueAwarenessSummary, 320, 'awareness') || null,
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
