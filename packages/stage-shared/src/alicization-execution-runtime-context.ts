import type {
  AlicizationExecutionRuntimeContext,
  AlicizationExecutionRuntimeContextActionDigest,
  AlicizationExecutionRuntimeContextCapture,
  AlicizationExecutionRuntimeContextForegroundWindow,
  AlicizationExecutionRuntimeMemoryClosureExecution,
} from './alicization-transport-contracts'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from './alicization-fixed-template-sanitizer'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from './alicization-project-awareness'
import { formatAlicizationProjectStateAwarenessFields } from './alicization-project-state-awareness-format'
import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'

function sanitizeText(raw: unknown, maxChars = 200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
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

function extractStructuredProjectBriefingFieldValue(structured: string, key: string) {
  return structured
    .split('|')
    .map(part => part.trim())
    .find(part => part.startsWith(`${key}=`))
    ?.replace(new RegExp(`^${key}=`, 'u'), '')
    .trim()
    || ''
}

function sanitizeExecutionProjectBriefingText(
  raw: unknown,
  maxChars = 200,
  field: ExecutionProjectBriefingField = 'generic',
) {
  const text = sanitizeText(raw, maxChars)
  if (!text)
    return ''

  if (EXECUTION_PROJECT_BRIEFING_PLACEHOLDER_VALUES.has(text.toLowerCase()))
    return ''

  if (!containsAlicizationFixedTemplateResidue(text)) {
    const normalized = sanitizeAlicizationProviderFacingText(text, maxChars)
    return normalized === alicizationFixedTemplateReplacement ? '' : normalized
  }

  const formatField = (key: string, input: Parameters<typeof formatAlicizationProjectStateAwarenessFields>[0]) =>
    extractStructuredProjectBriefingFieldValue(formatAlicizationProjectStateAwarenessFields({
      ...input,
      maxChars,
    }), key)

  if (field === 'identity' || field === 'phase')
    return ''
  if (field === 'awareness') {
    return formatAlicizationProjectStateAwarenessFields({
      identity: text,
      currentPhase: text,
      latestLandedProgress: text,
      primaryOpenLoop: text,
      nextClosureTarget: text,
      sameHerSelfLine: text,
      sameHerHoldDetail: text,
      sameHerDriftRisk: text,
      emotionalClosureCue: text,
      maxChars,
    })
  }
  if (field === 'landed')
    return formatField('landed', { latestLandedProgress: text })
  if (field === 'open')
    return formatField('open', { primaryOpenLoop: text })
  if (field === 'next')
    return formatField('next', { nextClosureTarget: text })
  if (field === 'continuity_anchor')
    return formatField('continuity_anchor', { sameHerSelfLine: text })
  if (field === 'continuity_hold')
    return formatField('continuity_hold', { sameHerHoldDetail: text })
  if (field === 'continuity_drift_risk')
    return formatField('continuity_drift_risk', { sameHerDriftRisk: text })
  if (field === 'initiative_gap')
    return formatField('initiative_gap', { proactiveSameHerGap: text })
  if (field === 'emotional_closure')
    return formatField('emotional_closure', { emotionalClosureCue: text })

  const normalized = sanitizeAlicizationProviderFacingText(text, maxChars)
  if (!normalized)
    return ''
  if (normalized === alicizationFixedTemplateReplacement)
    return ''
  return normalized
}

function normalizeTimestamp(raw: unknown) {
  const numeric = Number(raw)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : null
}

function normalizeRuntimeForegroundWindow(
  raw: unknown,
): AlicizationExecutionRuntimeContextForegroundWindow | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const next = {
    appName: sanitizeText(value.appName, 120) || undefined,
    processName: sanitizeText(value.processName, 120) || undefined,
    title: sanitizeText(value.title, 200) || undefined,
  } satisfies AlicizationExecutionRuntimeContextForegroundWindow

  return next.appName || next.processName || next.title ? next : null
}

function normalizeRuntimeCapture(raw: unknown): AlicizationExecutionRuntimeContextCapture | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const health = value.health === 'healthy' || value.health === 'degraded' || value.health === 'unavailable'
    ? value.health
    : null
  const permission = value.permission === 'granted' || value.permission === 'denied' || value.permission === 'prompt' || value.permission === 'unknown'
    ? value.permission
    : null
  const sourceCount = Number.isFinite(Number(value.sourceCount))
    ? Math.max(0, Math.floor(Number(value.sourceCount)))
    : null
  const degradedReasons = Array.isArray(value.degradedReasons)
    ? [...new Set(value.degradedReasons.map(reason => sanitizeText(reason, 80)).filter(Boolean))].slice(0, 8)
    : []

  return {
    health,
    permission,
    sourceCount,
    lastUpdatedAt: normalizeTimestamp(value.lastUpdatedAt),
    lastError: sanitizeText(value.lastError, 240) || null,
    degradedReasons,
  }
}

function normalizeRuntimeActions(raw: unknown): AlicizationExecutionRuntimeContextActionDigest[] {
  if (!Array.isArray(raw))
    return []

  return raw
    .map((item): AlicizationExecutionRuntimeContextActionDigest | null => {
      if (!item || typeof item !== 'object')
        return null

      const value = item as Record<string, unknown>
      const kind = value.kind === 'executor' || value.kind === 'mcp' || value.kind === 'runtime' || value.kind === 'sensory'
        ? value.kind
        : null
      const status = value.status === 'completed' || value.status === 'failed' || value.status === 'pending'
        ? value.status
        : null
      const threadStatus = value.threadStatus === 'planned'
        || value.threadStatus === 'needs-affirmation'
        || value.threadStatus === 'running'
        || value.threadStatus === 'paused'
        || value.threadStatus === 'blocked'
        || value.threadStatus === 'completed'
        || value.threadStatus === 'failed'
        || value.threadStatus === 'cancelled'
        ? value.threadStatus
        : null
      const label = sanitizeText(value.label, 120)
      const summary = sanitizeText(value.summary, 180) || null
      if (!kind || !status || !label)
        return null

      const normalizedAction: AlicizationExecutionRuntimeContextActionDigest = {
        kind,
        status,
        threadStatus,
        label,
        summary,
      }

      return normalizedAction
    })
    .filter((item): item is AlicizationExecutionRuntimeContextActionDigest => item !== null)
    .slice(0, 6)
}

function normalizeMemoryClosureExecution(raw: unknown): AlicizationExecutionRuntimeMemoryClosureExecution | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const value = raw as Record<string, unknown>
  if (value.authority !== 'memory-os')
    return null

  const carry = sanitizeText(value.carry, 220) || null
  const nextLearningAction = sanitizeText(value.nextLearningAction, 80) || null
  const activeLearningFocuses = Array.isArray(value.activeLearningFocuses)
    ? [...new Set(value.activeLearningFocuses.map(focus => sanitizeText(focus, 120)).filter(Boolean))].slice(0, 8)
    : []
  const reasonTags = Array.isArray(value.reasonTags)
    ? [...new Set(value.reasonTags.map(tag => sanitizeText(tag, 80)).filter(Boolean))].slice(0, 12)
    : []
  const closureStateCandidate = value.closureState && typeof value.closureState === 'object' && !Array.isArray(value.closureState)
    ? value.closureState as Record<string, unknown>
    : {}

  const normalized = {
    authority: 'memory-os',
    carry,
    nextLearningAction,
    shouldVerify: value.shouldVerify === true,
    shouldReflect: value.shouldReflect === true,
    activeLearningFocuses,
    reasonTags,
    closureState: {
      state: sanitizeText(closureStateCandidate.state, 80) || null,
      open: closureStateCandidate.open === true,
      revisionRequired: closureStateCandidate.revisionRequired === true,
      shouldLabelUncertainty: closureStateCandidate.shouldLabelUncertainty === true,
      visibleCarryMode: sanitizeText(closureStateCandidate.visibleCarryMode, 80) || null,
      retrievalQuality: sanitizeText(closureStateCandidate.retrievalQuality, 80) || null,
      conflictPressure: sanitizeText(closureStateCandidate.conflictPressure, 80) || null,
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

function resolveProjectBriefingLatestLandedProgress(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.latestLandedProgress, 320, 'landed')
    || sanitizeExecutionProjectBriefingText(value.latestProgress, 320, 'landed')
    || sanitizeExecutionProjectBriefingText(value.landedProgressSummary, 320, 'landed')
    || null
}

function resolveProjectBriefingPrimaryOpenLoop(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.primaryOpenLoop, 320, 'open')
    || sanitizeExecutionProjectBriefingText(value.openClosureSummary, 320, 'open')
    || null
}

function resolveProjectBriefingNextClosureTarget(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.nextClosureTarget, 320, 'next')
    || sanitizeExecutionProjectBriefingText(value.nextClosureTargetSummary, 320, 'next')
    || null
}

function resolveProjectBriefingSameHerDriftRisk(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.sameHerDriftRisk, 320, 'continuity_drift_risk')
    || sanitizeExecutionProjectBriefingText(value.sameHerDriftRiskSummary, 320, 'continuity_drift_risk')
    || null
}

function normalizeProjectBriefingContinuityPreferredTiming(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 120)
  return value === 'internal-only'
    || value === 'after-payoff'
    || value === 'same-turn-if-invited'
    || value === 'next-open-window'
    ? value
    : null
}

function normalizeProjectBriefingBlinkCadence(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 32)
  return value === 'normal'
    || value === 'linger'
    || value === 'quiet'
    ? value
    : null
}

function normalizeProjectBriefingGazeMode(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 32)
  return value === 'steady'
    || value === 'soften'
    || value === 'drift'
    ? value
    : null
}

function normalizeProjectBriefingPauseMode(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 32)
  return value === 'longer'
    || value === 'natural'
    ? value
    : null
}

function normalizeProjectBriefingLipsyncMode(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 32)
  return value === 'restrained'
    || value === 'matched'
    ? value
    : null
}

function normalizeProjectBriefingContinuityRestraint(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 64)
  return value === 'lower-pressure'
    || value === 'measured-return'
    || value === 'repair-before-closeness'
    || value === 'rest-protective'
    || value === 'single-thread'
    ? value
    : null
}

function normalizeProjectBriefingVoiceMode(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 32)
  return value === 'lower-pressure'
    || value === 'even'
    ? value
    : null
}

function normalizeProjectBriefingPacingMode(raw: unknown) {
  const value = sanitizeExecutionProjectBriefingText(raw, 32)
  return value === 'slower'
    || value === 'natural'
    ? value
    : null
}

function normalizeProjectBriefing(raw: unknown): NonNullable<AlicizationExecutionRuntimeContext['projectBriefing']> | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const identity = sanitizeExecutionProjectBriefingText(value.identity, 220, 'identity') || null
  const currentPhase = sanitizeExecutionProjectBriefingText(value.currentPhase, 220, 'phase') || null
  const latestLandedProgress = resolveProjectBriefingLatestLandedProgress(value)
  const primaryOpenLoop = resolveProjectBriefingPrimaryOpenLoop(value)
  const nextClosureTarget = resolveProjectBriefingNextClosureTarget(value)
  const sameHerSelfLine = sanitizeExecutionProjectBriefingText(value.sameHerSelfLine, 220, 'continuity_anchor') || null
  const sameHerHoldDetail = sanitizeExecutionProjectBriefingText(value.sameHerHoldDetail, 220, 'continuity_hold') || null
  const sameHerDriftRisk = resolveProjectBriefingSameHerDriftRisk(value)
  const proactiveSameHerGap = sanitizeExecutionProjectBriefingText(value.proactiveSameHerGap, 320, 'initiative_gap') || null
  const companionBriefingLine = sanitizeExecutionProjectBriefingText(value.companionBriefingLine, 320, 'awareness') || null
  const emotionalClosureSummary = sanitizeExecutionProjectBriefingText(value.emotionalClosureSummary, 240, 'emotional_closure') || null
  const continuityRestraint = normalizeProjectBriefingContinuityRestraint(value.continuityRestraint)
  const continuityCue = sanitizeExecutionProjectBriefingText(value.continuityCue, 220, 'continuity_hold') || null
  const continuityPreferredTiming = normalizeProjectBriefingContinuityPreferredTiming(value.continuityPreferredTiming)
  const continuityCadence = sanitizeExecutionProjectBriefingText(value.continuityCadence, 120) || null
  const preferredBlinkCadence = normalizeProjectBriefingBlinkCadence(value.preferredBlinkCadence)
  const preferredGazeMode = normalizeProjectBriefingGazeMode(value.preferredGazeMode)
  const preferredPauseMode = normalizeProjectBriefingPauseMode(value.preferredPauseMode)
  const preferredLipsyncMode = normalizeProjectBriefingLipsyncMode(value.preferredLipsyncMode)
  const preferredVoiceMode = normalizeProjectBriefingVoiceMode(value.preferredVoiceMode)
  const preferredPacingMode = normalizeProjectBriefingPacingMode(value.preferredPacingMode)
  const preflightSummary = sanitizeExecutionProjectBriefingText(value.preflightSummary, 320, 'awareness') || null
  const explicitPreDialogueAwarenessLine = sanitizeExecutionProjectBriefingText(value.preDialogueAwarenessLine, 320, 'awareness') || null
  const preDialogueAwarenessSummary = sanitizeExecutionProjectBriefingText(value.preDialogueAwarenessSummary, 320, 'awareness') || null
  const resolvedPreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      identity,
      currentPhase,
      latestLandedProgress,
      primaryOpenLoop,
      nextClosureTarget,
      sameHerSelfLine,
      sameHerHoldDetail,
      sameHerDriftRisk,
      proactiveSameHerGap,
      companionBriefingLine,
      emotionalClosureSummary,
      continuityRestraint,
      continuityCue,
      continuityPreferredTiming,
      continuityCadence,
      preferredPauseMode,
      preferredLipsyncMode,
      preferredVoiceMode,
      preferredPacingMode,
      preflightSummary,
      preDialogueAwarenessLine: explicitPreDialogueAwarenessLine,
      preDialogueAwarenessSummary,
      awarenessLine: explicitPreDialogueAwarenessLine,
    },
  }) ?? preDialogueAwarenessSummary ?? explicitPreDialogueAwarenessLine
  const preDialogueAwarenessLine
    = explicitPreDialogueAwarenessLine
      && isAlicizationThinProjectAwarenessLine(explicitPreDialogueAwarenessLine)
      && preDialogueAwarenessSummary
      && !isAlicizationThinProjectAwarenessLine(preDialogueAwarenessSummary)
      ? preDialogueAwarenessSummary
      : resolvedPreDialogueAwarenessLine

  const next = {
    identity,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine,
    sameHerHoldDetail,
    sameHerDriftRisk,
    proactiveSameHerGap,
    companionBriefingLine,
    emotionalClosureSummary,
    continuityRestraint,
    continuityCue,
    continuityPreferredTiming,
    continuityCadence,
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    preflightSummary,
    preDialogueAwarenessLine,
    preDialogueAwarenessSummary,
  } satisfies NonNullable<AlicizationExecutionRuntimeContext['projectBriefing']>

  return Object.values(next).some(Boolean) ? next : null
}

function normalizeExecutionRuntimeAffectiveResidue(raw: unknown) {
  return normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: 'browser-fallback',
    producedAt: 0,
    summary: 'execution-runtime-context-affective-residue',
    affectiveResidue: raw,
  })?.affectiveResidue ?? null
}

function normalizeExecutionRuntimeDerivedMindStateBundle(
  raw: unknown,
): AlicizationExecutionRuntimeContext['derivedMindStateBundle'] {
  const normalized = normalizeAlicizationDerivedMindStateBundle(raw)
  if (normalized)
    return normalized

  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const value = raw as Record<string, unknown>
  if (!('affectiveResidue' in value))
    return null

  return normalizeAlicizationDerivedMindStateBundle({
    ...value,
    version: 'derived-mind-state-bundle-v1',
    source: value.source === 'main-runtime' || value.source === 'browser-fallback'
      ? value.source
      : 'browser-fallback',
    producedAt: normalizeTimestamp(value.producedAt) ?? 0,
    summary: sanitizeText(value.summary, 220) || 'execution-runtime-context-derived-mind-state-bundle',
  })
}

export function normalizeAlicizationExecutionRuntimeContext(raw: unknown): AlicizationExecutionRuntimeContext | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const sensoryValue = value.sensory
  if (!sensoryValue || typeof sensoryValue !== 'object')
    return null

  const sensory = sensoryValue as Record<string, unknown>
  const affectiveResidue = normalizeExecutionRuntimeAffectiveResidue(value.affectiveResidue)
  const derivedMindStateBundle = normalizeExecutionRuntimeDerivedMindStateBundle(value.derivedMindStateBundle)
  const memoryClosureExecution = normalizeMemoryClosureExecution(value.memoryClosureExecution)

  return {
    generatedAt: normalizeTimestamp(value.generatedAt) ?? Date.now(),
    cardId: sanitizeText(value.cardId, 120) || null,
    decisionTraceId: sanitizeText(value.decisionTraceId, 200) || null,
    turnId: sanitizeText(value.turnId, 160) || null,
    sessionId: sanitizeText(value.sessionId, 160) || null,
    agentSessionId: sanitizeText(value.agentSessionId, 160) || null,
    ...(affectiveResidue ? { affectiveResidue } : {}),
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
    ...(memoryClosureExecution ? { memoryClosureExecution } : {}),
    projectBriefing: normalizeProjectBriefing(value.projectBriefing),
    recentActions: normalizeRuntimeActions(value.recentActions),
    sensory: {
      collectedAt: normalizeTimestamp(sensory.collectedAt),
      running: sensory.running !== false,
      stale: sensory.stale === true,
      ageMs: Number.isFinite(Number(sensory.ageMs))
        ? Math.max(0, Math.floor(Number(sensory.ageMs)))
        : 0,
      foregroundWindow: normalizeRuntimeForegroundWindow(sensory.foregroundWindow),
      capture: normalizeRuntimeCapture(sensory.capture),
    },
  }
}

function formatForegroundWindow(
  foregroundWindow: AlicizationExecutionRuntimeContextForegroundWindow | null,
) {
  if (!foregroundWindow)
    return 'unknown'

  const parts = [
    foregroundWindow.appName,
    foregroundWindow.processName,
    foregroundWindow.title,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' | ') : 'unknown'
}

function formatCaptureReasons(capture: AlicizationExecutionRuntimeContextCapture | null) {
  if (!capture || capture.degradedReasons.length === 0)
    return 'none'
  return capture.degradedReasons.join(', ')
}

function formatRecentActions(actions: AlicizationExecutionRuntimeContextActionDigest[] | null | undefined) {
  if (!actions || actions.length === 0)
    return 'none'
  return actions
    .map(action => `${action.kind}/${action.status}:${action.label}${action.threadStatus ? ` [thread_status=${action.threadStatus}]` : ''}${action.summary ? ` -> ${action.summary}` : ''}`)
    .join(' | ')
}

export function buildAlicizationExecutionRuntimeContextBlock(raw: unknown) {
  const context = normalizeAlicizationExecutionRuntimeContext(raw)
  if (!context)
    return ''

  const capture = context.sensory.capture
  return [
    '[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]',
    `generated_at=${new Date(context.generatedAt).toISOString()}`,
    context.cardId ? `card_id=${context.cardId}` : '',
    context.turnId ? `turn_id=${context.turnId}` : '',
    context.decisionTraceId ? `decision_trace_id=${context.decisionTraceId}` : '',
    context.sessionId ? `conversation_session_id=${context.sessionId}` : '',
    context.agentSessionId ? `agent_session_id=${context.agentSessionId}` : '',
    context.affectiveResidue?.dominantResidueKind ? `affective_residue_kind=${context.affectiveResidue.dominantResidueKind}` : '',
    context.affectiveResidue?.relationshipCadence?.cadenceMode ? `affective_residue_cadence=${context.affectiveResidue.relationshipCadence.cadenceMode}` : '',
    context.affectiveResidue?.summary ? `affective_residue_summary=${context.affectiveResidue.summary}` : '',
    context.memoryClosureExecution?.carry ? `memory_closure_execution_carry=${context.memoryClosureExecution.carry}` : '',
    context.memoryClosureExecution?.nextLearningAction ? `memory_closure_next_learning_action=${context.memoryClosureExecution.nextLearningAction}` : '',
    context.memoryClosureExecution ? `memory_closure_should_verify=${context.memoryClosureExecution.shouldVerify ? 'true' : 'false'}` : '',
    context.memoryClosureExecution ? `memory_closure_should_reflect=${context.memoryClosureExecution.shouldReflect ? 'true' : 'false'}` : '',
    context.memoryClosureExecution?.activeLearningFocuses.length
      ? `memory_closure_active_learning_focuses=${context.memoryClosureExecution.activeLearningFocuses.join(' | ')}`
      : '',
    context.memoryClosureExecution?.reasonTags.length
      ? `memory_closure_reason_tags=${context.memoryClosureExecution.reasonTags.join(' | ')}`
      : '',
    context.projectBriefing?.identity ? `runtime_identity=${context.projectBriefing.identity}` : '',
    context.projectBriefing?.currentPhase ? `runtime_phase=${context.projectBriefing.currentPhase}` : '',
    context.projectBriefing?.latestLandedProgress ? `runtime_landed_progress=${context.projectBriefing.latestLandedProgress}` : '',
    context.projectBriefing?.primaryOpenLoop ? `runtime_open_loop=${context.projectBriefing.primaryOpenLoop}` : '',
    context.projectBriefing?.nextClosureTarget ? `runtime_next_closure=${context.projectBriefing.nextClosureTarget}` : '',
    context.projectBriefing?.proactiveSameHerGap ? `execution_proactive_continuity_gap=${context.projectBriefing.proactiveSameHerGap}` : '',
    context.projectBriefing?.companionBriefingLine ? `execution_companion_briefing=${context.projectBriefing.companionBriefingLine}` : '',
    context.projectBriefing?.emotionalClosureSummary ? `execution_emotional_context=${context.projectBriefing.emotionalClosureSummary}` : '',
    context.projectBriefing?.continuityRestraint ? `execution_continuity_restraint=${context.projectBriefing.continuityRestraint}` : '',
    context.projectBriefing?.continuityCue ? `execution_continuity=${context.projectBriefing.continuityCue}` : '',
    context.projectBriefing?.preflightSummary || context.projectBriefing?.preDialogueAwarenessLine
      ? 'template_awareness=withheld_from_execution_runtime_context'
      : '',
    context.projectBriefing?.continuityPreferredTiming ? `execution_continuity_preferred_timing=${context.projectBriefing.continuityPreferredTiming}` : '',
    context.projectBriefing?.continuityCadence ? `execution_continuity_cadence=${context.projectBriefing.continuityCadence}` : '',
    context.projectBriefing?.preferredBlinkCadence ? `execution_preferred_blink_cadence=${context.projectBriefing.preferredBlinkCadence}` : '',
    context.projectBriefing?.preferredGazeMode ? `execution_preferred_gaze_mode=${context.projectBriefing.preferredGazeMode}` : '',
    context.projectBriefing?.preferredPauseMode ? `execution_preferred_pause_mode=${context.projectBriefing.preferredPauseMode}` : '',
    context.projectBriefing?.preferredLipsyncMode ? `execution_preferred_lipsync_mode=${context.projectBriefing.preferredLipsyncMode}` : '',
    context.projectBriefing?.preferredVoiceMode ? `execution_preferred_voice_mode=${context.projectBriefing.preferredVoiceMode}` : '',
    context.projectBriefing?.preferredPacingMode ? `execution_preferred_pacing_mode=${context.projectBriefing.preferredPacingMode}` : '',
    `recent_runtime_actions=${formatRecentActions(context.recentActions)}`,
    `sensory_running=${context.sensory.running ? 'true' : 'false'}`,
    `sensory_stale=${context.sensory.stale ? 'true' : 'false'}`,
    `sensory_age_ms=${context.sensory.ageMs}`,
    context.sensory.collectedAt != null
      ? `sensory_collected_at=${new Date(context.sensory.collectedAt).toISOString()}`
      : '',
    `foreground_window=${formatForegroundWindow(context.sensory.foregroundWindow)}`,
    `capture_health=${capture?.health ?? 'unknown'}`,
    `capture_permission=${capture?.permission ?? 'unknown'}`,
    `capture_source_count=${capture?.sourceCount ?? 'unknown'}`,
    `capture_degraded_reasons=${formatCaptureReasons(capture)}`,
    capture?.lastError ? `capture_last_error=${capture.lastError}` : '',
    'Treat this as Alicization\'s freshest grounded desktop observation before execution begins.',
    context.sensory.stale || capture?.health === 'degraded' || capture?.health === 'unavailable'
      ? 'If the live UI does not clearly match this snapshot, re-ground through visible observation and avoid confident hidden-state claims.'
      : 'If the live UI diverges, trust the live surface over this snapshot and explain the drift plainly.',
  ].filter(Boolean).join('\n')
}
