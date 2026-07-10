import { sanitizeAlicizationStructuredInternalText } from './alicization-fixed-template-sanitizer'

function normalizeSummaryString(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

function normalizeReasonSummaryString(raw: unknown) {
  const normalized = normalizeSummaryString(raw)
  return normalized ? sanitizeAlicizationStructuredInternalText(normalized, 520, normalized) || null : null
}

export function buildAlicizationFaceSummary(input: {
  emotion?: unknown
  facialCue?: unknown
  expressionMode?: unknown
  intensity?: unknown
  holdMs?: unknown
  preUtteranceCue?: unknown
  postUtteranceCue?: unknown
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

  const parts = [
    normalizeSummaryString(input.emotion) ? `emotion=${normalizeSummaryString(input.emotion)}` : null,
    normalizeSummaryString(input.facialCue) ? `cue=${normalizeSummaryString(input.facialCue)}` : null,
    normalizeSummaryString(input.expressionMode) ? `expression=${normalizeSummaryString(input.expressionMode)}` : null,
    formatNumber(input.intensity) ? `intensity=${formatNumber(input.intensity)}` : null,
    resolveFiniteNumber(input.holdMs) != null ? `hold=${Number(input.holdMs)}ms` : null,
    normalizeSummaryString(input.preUtteranceCue) ? `pre=${normalizeSummaryString(input.preUtteranceCue)}` : null,
    normalizeSummaryString(input.postUtteranceCue) ? `post=${normalizeSummaryString(input.postUtteranceCue)}` : null,
    normalizeSummaryString(input.residentMode) ? `mode=${normalizeSummaryString(input.residentMode)}` : null,
    normalizeSummaryString(input.continuityTiming) ? `timing=${normalizeSummaryString(input.continuityTiming)}` : null,
    normalizeSummaryString(input.preferredBlinkCadence) ? `blink=${normalizeSummaryString(input.preferredBlinkCadence)}` : null,
    normalizeSummaryString(input.preferredGazeMode) ? `gaze=${normalizeSummaryString(input.preferredGazeMode)}` : null,
    normalizeReasonSummaryString(input.reasonSummary) ? `reason=${normalizeReasonSummaryString(input.reasonSummary)}` : null,
    normalizeSummaryString(input.source) ? `src=${normalizeSummaryString(input.source)}` : null,
    formatNumber(input.confidence) ? `conf=${formatNumber(input.confidence)}` : null,
    normalizeSummaryString(input.segmentId) ? `seg=${normalizeSummaryString(input.segmentId)}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}
