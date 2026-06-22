import { normalizeAlicizationSettleLoopToken } from './alicization-same-her-renderer-hints'

function normalizeSummaryString(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

export function buildAlicizationMotionSummary(input: {
  actionCue?: unknown
  attentionMode?: unknown
  idleBase?: unknown
  intensity?: unknown
  holdMs?: unknown
  residentMode?: unknown
  continuityTiming?: unknown
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  reasonSummary?: unknown
  source?: unknown
  confidence?: unknown
  segmentId?: unknown
}) {
  const resolveFiniteNumber = (raw: unknown) => {
    if (raw == null || raw === '')
      return null

    const value = Number(raw)
    if (!Number.isFinite(value))
      return null
    return value
  }

  const formatNumber = (raw: unknown) => {
    const value = resolveFiniteNumber(raw)
    return value == null ? null : value.toFixed(2)
  }

  const normalizedActionCue = normalizeAlicizationSettleLoopToken(
    normalizeSummaryString(input.actionCue),
  )
  const normalizedIdleBase = normalizeAlicizationSettleLoopToken(
    normalizeSummaryString(input.idleBase),
  )

  const parts = [
    normalizedActionCue ? `motion=${normalizedActionCue}` : null,
    normalizeSummaryString(input.attentionMode) ? `mode=${normalizeSummaryString(input.attentionMode)}` : null,
    normalizeSummaryString(input.residentMode) ? `tail=${normalizeSummaryString(input.residentMode)}` : null,
    normalizeSummaryString(input.continuityTiming) ? `timing=${normalizeSummaryString(input.continuityTiming)}` : null,
    normalizeSummaryString(input.preferredBlinkCadence) ? `blink=${normalizeSummaryString(input.preferredBlinkCadence)}` : null,
    normalizeSummaryString(input.preferredGazeMode) ? `gaze=${normalizeSummaryString(input.preferredGazeMode)}` : null,
    normalizeSummaryString(input.reasonSummary) ? `reason=${normalizeSummaryString(input.reasonSummary)}` : null,
    normalizedIdleBase ? `idle=${normalizedIdleBase}` : null,
    formatNumber(input.intensity) ? `intensity=${formatNumber(input.intensity)}` : null,
    resolveFiniteNumber(input.holdMs) != null ? `hold=${Number(input.holdMs)}ms` : null,
    normalizeSummaryString(input.source) ? `src=${normalizeSummaryString(input.source)}` : null,
    formatNumber(input.confidence) ? `conf=${formatNumber(input.confidence)}` : null,
    normalizeSummaryString(input.segmentId) ? `seg=${normalizeSummaryString(input.segmentId)}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}
