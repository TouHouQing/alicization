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

export function buildAlicizationVoiceSummary(input: {
  language?: unknown
  pitchDelta?: unknown
  rateMultiplier?: unknown
  energy?: unknown
  cadence?: unknown
  closureBias?: unknown
  consonantPrecision?: unknown
  emotion?: unknown
  companionshipMode?: unknown
  continuityTiming?: unknown
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
  reasonSummary?: unknown
  source?: unknown
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
    normalizeSummaryString(input.language),
    formatNumber(input.pitchDelta) ? `pitch=${formatNumber(input.pitchDelta)}` : null,
    formatNumber(input.rateMultiplier) ? `rate=${formatNumber(input.rateMultiplier)}` : null,
    formatNumber(input.energy) ? `energy=${formatNumber(input.energy)}` : null,
    formatNumber(input.cadence) ? `cadence=${formatNumber(input.cadence)}` : null,
    formatNumber(input.closureBias) ? `closure=${formatNumber(input.closureBias)}` : null,
    formatNumber(input.consonantPrecision) ? `precision=${formatNumber(input.consonantPrecision)}` : null,
    normalizeSummaryString(input.emotion) ? `emotion=${normalizeSummaryString(input.emotion)}` : null,
    normalizeSummaryString(input.companionshipMode) ? `companion=${normalizeSummaryString(input.companionshipMode)}` : null,
    normalizeSummaryString(input.continuityTiming) ? `timing=${normalizeSummaryString(input.continuityTiming)}` : null,
    normalizeSummaryString(input.preferredBlinkCadence) ? `blink=${normalizeSummaryString(input.preferredBlinkCadence)}` : null,
    normalizeSummaryString(input.preferredGazeMode) ? `gaze=${normalizeSummaryString(input.preferredGazeMode)}` : null,
    normalizeSummaryString(input.preferredPauseMode) ? `pause=${normalizeSummaryString(input.preferredPauseMode)}` : null,
    normalizeSummaryString(input.preferredLipsyncMode) ? `lipsyncMode=${normalizeSummaryString(input.preferredLipsyncMode)}` : null,
    normalizeSummaryString(input.preferredVoiceMode) ? `voiceMode=${normalizeSummaryString(input.preferredVoiceMode)}` : null,
    normalizeSummaryString(input.preferredPacingMode) ? `pacing=${normalizeSummaryString(input.preferredPacingMode)}` : null,
    normalizeReasonSummaryString(input.reasonSummary) ? `reason=${normalizeReasonSummaryString(input.reasonSummary)}` : null,
    normalizeSummaryString(input.source) ? `src=${normalizeSummaryString(input.source)}` : null,
    normalizeSummaryString(input.segmentId) ? `seg=${normalizeSummaryString(input.segmentId)}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}
