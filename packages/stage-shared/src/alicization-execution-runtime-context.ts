import type {
  AlicizationExecutionRuntimeContext,
  AlicizationExecutionRuntimeContextActionDigest,
  AlicizationExecutionRuntimeContextCapture,
  AlicizationExecutionRuntimeContextForegroundWindow,
} from './alicization-transport-contracts'

import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from './alicization-project-awareness'

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

function sanitizeExecutionProjectBriefingText(raw: unknown, maxChars = 200) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''

  return EXECUTION_PROJECT_BRIEFING_PLACEHOLDER_VALUES.has(normalized.toLowerCase())
    ? ''
    : normalized
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

function resolveProjectBriefingLatestLandedProgress(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.latestLandedProgress, 320)
    || sanitizeExecutionProjectBriefingText(value.latestProgress, 320)
    || sanitizeExecutionProjectBriefingText(value.landedProgressSummary, 320)
    || null
}

function resolveProjectBriefingPrimaryOpenLoop(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.primaryOpenLoop, 320)
    || sanitizeExecutionProjectBriefingText(value.openClosureSummary, 320)
    || null
}

function resolveProjectBriefingNextClosureTarget(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.nextClosureTarget, 320)
    || sanitizeExecutionProjectBriefingText(value.nextClosureTargetSummary, 320)
    || null
}

function resolveProjectBriefingSameHerDriftRisk(value: Record<string, unknown>) {
  return sanitizeExecutionProjectBriefingText(value.sameHerDriftRisk, 320)
    || sanitizeExecutionProjectBriefingText(value.sameHerDriftRiskSummary, 320)
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
  const identity = sanitizeExecutionProjectBriefingText(value.identity, 220) || null
  const currentPhase = sanitizeExecutionProjectBriefingText(value.currentPhase, 220) || null
  const latestLandedProgress = resolveProjectBriefingLatestLandedProgress(value)
  const primaryOpenLoop = resolveProjectBriefingPrimaryOpenLoop(value)
  const nextClosureTarget = resolveProjectBriefingNextClosureTarget(value)
  const sameHerSelfLine = sanitizeExecutionProjectBriefingText(value.sameHerSelfLine, 220) || null
  const sameHerHoldDetail = sanitizeExecutionProjectBriefingText(value.sameHerHoldDetail, 220) || null
  const sameHerDriftRisk = resolveProjectBriefingSameHerDriftRisk(value)
  const proactiveSameHerGap = sanitizeExecutionProjectBriefingText(value.proactiveSameHerGap, 320) || null
  const companionBriefingLine = sanitizeExecutionProjectBriefingText(value.companionBriefingLine, 320) || null
  const emotionalClosureSummary = sanitizeExecutionProjectBriefingText(value.emotionalClosureSummary, 240) || null
  const preflightSummary = sanitizeExecutionProjectBriefingText(value.preflightSummary, 320) || null
  const explicitPreDialogueAwarenessLine = sanitizeExecutionProjectBriefingText(value.preDialogueAwarenessLine, 320) || null
  const preDialogueAwarenessSummary = sanitizeExecutionProjectBriefingText(value.preDialogueAwarenessSummary, 320) || null
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
    continuityRestraint: normalizeProjectBriefingContinuityRestraint(value.continuityRestraint),
    continuityCue: sanitizeExecutionProjectBriefingText(value.continuityCue, 220) || null,
    continuityPreferredTiming: normalizeProjectBriefingContinuityPreferredTiming(value.continuityPreferredTiming),
    continuityCadence: sanitizeExecutionProjectBriefingText(value.continuityCadence, 120) || null,
    preferredBlinkCadence: normalizeProjectBriefingBlinkCadence(value.preferredBlinkCadence),
    preferredGazeMode: normalizeProjectBriefingGazeMode(value.preferredGazeMode),
    preferredVoiceMode: normalizeProjectBriefingVoiceMode(value.preferredVoiceMode),
    preferredPacingMode: normalizeProjectBriefingPacingMode(value.preferredPacingMode),
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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const affectiveResidue = normalizeExecutionRuntimeAffectiveResidue(candidate.affectiveResidue)
  if (!affectiveResidue)
    return null

  return {
    affectiveResidue,
  }
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

  return {
    generatedAt: normalizeTimestamp(value.generatedAt) ?? Date.now(),
    cardId: sanitizeText(value.cardId, 120) || null,
    decisionTraceId: sanitizeText(value.decisionTraceId, 200) || null,
    turnId: sanitizeText(value.turnId, 160) || null,
    sessionId: sanitizeText(value.sessionId, 160) || null,
    agentSessionId: sanitizeText(value.agentSessionId, 160) || null,
    ...(affectiveResidue ? { affectiveResidue } : {}),
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
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
    context.projectBriefing?.identity ? `project_identity=${context.projectBriefing.identity}` : '',
    context.projectBriefing?.currentPhase ? `project_phase=${context.projectBriefing.currentPhase}` : '',
    context.projectBriefing?.latestLandedProgress ? `project_landed_progress=${context.projectBriefing.latestLandedProgress}` : '',
    context.projectBriefing?.primaryOpenLoop ? `project_open_loop=${context.projectBriefing.primaryOpenLoop}` : '',
    context.projectBriefing?.nextClosureTarget ? `project_next_closure=${context.projectBriefing.nextClosureTarget}` : '',
    context.projectBriefing?.sameHerSelfLine ? `project_same_her=${context.projectBriefing.sameHerSelfLine}` : '',
    context.projectBriefing?.sameHerHoldDetail ? `project_same_her_hold=${context.projectBriefing.sameHerHoldDetail}` : '',
    context.projectBriefing?.sameHerDriftRisk ? `project_same_her_drift_risk=${context.projectBriefing.sameHerDriftRisk}` : '',
    context.projectBriefing?.proactiveSameHerGap ? `project_proactive_same_her_gap=${context.projectBriefing.proactiveSameHerGap}` : '',
    context.projectBriefing?.companionBriefingLine ? `project_companion_briefing=${context.projectBriefing.companionBriefingLine}` : '',
    context.projectBriefing?.emotionalClosureSummary ? `project_emotional_closure=${context.projectBriefing.emotionalClosureSummary}` : '',
    context.projectBriefing?.continuityRestraint ? `project_continuity_restraint=${context.projectBriefing.continuityRestraint}` : '',
    context.projectBriefing?.continuityCue ? `project_continuity=${context.projectBriefing.continuityCue}` : '',
    context.projectBriefing?.preflightSummary ? `project_preflight=${context.projectBriefing.preflightSummary}` : '',
    context.projectBriefing?.preDialogueAwarenessLine ? `project_awareness=${context.projectBriefing.preDialogueAwarenessLine}` : '',
    context.projectBriefing?.continuityPreferredTiming ? `project_continuity_preferred_timing=${context.projectBriefing.continuityPreferredTiming}` : '',
    context.projectBriefing?.continuityCadence ? `project_continuity_cadence=${context.projectBriefing.continuityCadence}` : '',
    context.projectBriefing?.preferredBlinkCadence ? `project_preferred_blink_cadence=${context.projectBriefing.preferredBlinkCadence}` : '',
    context.projectBriefing?.preferredGazeMode ? `project_preferred_gaze_mode=${context.projectBriefing.preferredGazeMode}` : '',
    context.projectBriefing?.preferredVoiceMode ? `project_preferred_voice_mode=${context.projectBriefing.preferredVoiceMode}` : '',
    context.projectBriefing?.preferredPacingMode ? `project_preferred_pacing_mode=${context.projectBriefing.preferredPacingMode}` : '',
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
