import type {
  AlicizationExecutionRuntimeContext,
  AlicizationExecutionRuntimeContextActionDigest,
  AlicizationExecutionRuntimeContextCapture,
  AlicizationExecutionRuntimeContextForegroundWindow,
} from './alicization-transport-contracts'

function sanitizeText(raw: unknown, maxChars = 200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
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
    .map((item) => {
      if (!item || typeof item !== 'object')
        return null

      const value = item as Record<string, unknown>
      const kind = value.kind === 'executor' || value.kind === 'mcp' || value.kind === 'runtime' || value.kind === 'sensory'
        ? value.kind
        : null
      const status = value.status === 'completed' || value.status === 'failed' || value.status === 'pending'
        ? value.status
        : null
      const label = sanitizeText(value.label, 120)
      const summary = sanitizeText(value.summary, 180) || null
      if (!kind || !status || !label)
        return null

      return {
        kind,
        status,
        label,
        summary,
      } satisfies AlicizationExecutionRuntimeContextActionDigest
    })
    .filter((item): item is AlicizationExecutionRuntimeContextActionDigest => item !== null)
    .slice(0, 6)
}

export function normalizeAlicizationExecutionRuntimeContext(raw: unknown): AlicizationExecutionRuntimeContext | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const sensoryValue = value.sensory
  if (!sensoryValue || typeof sensoryValue !== 'object')
    return null

  const sensory = sensoryValue as Record<string, unknown>

  return {
    generatedAt: normalizeTimestamp(value.generatedAt) ?? Date.now(),
    cardId: sanitizeText(value.cardId, 120) || null,
    decisionTraceId: sanitizeText(value.decisionTraceId, 200) || null,
    turnId: sanitizeText(value.turnId, 160) || null,
    sessionId: sanitizeText(value.sessionId, 160) || null,
    agentSessionId: sanitizeText(value.agentSessionId, 160) || null,
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
    .map(action => `${action.kind}/${action.status}:${action.label}${action.summary ? ` -> ${action.summary}` : ''}`)
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
