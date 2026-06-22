function normalizeSummaryString(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

export function resolveLipsyncContinuityPosture(input: {
  mode: unknown
  continuityHoldMs: unknown
}) {
  const mode = normalizeSummaryString(input.mode)
  const holdMs = Number(input.continuityHoldMs)

  if (!mode || !Number.isFinite(holdMs) || holdMs <= 0)
    return null

  if (mode === 'closed')
    return Number.isFinite(holdMs) && holdMs >= 360 ? 'held-close' : 'brief-close'

  if (mode === 'energy-phoneme-hybrid' || mode === 'hybrid')
    return Number.isFinite(holdMs) && holdMs >= 360 ? 'sustained-articulation' : 'reactive-articulation'

  if (mode === 'energy-only')
    return Number.isFinite(holdMs) && holdMs >= 320 ? 'held-energy-open' : 'pulse-open'

  return Number.isFinite(holdMs) && holdMs >= 360 ? 'sustained' : 'reactive'
}

export function buildAlicizationLipsyncSummary(input: {
  mode: unknown
  phase?: unknown
  continuityHoldMs?: unknown
  topViseme?: unknown
  hintTrail?: unknown
  hintViseme?: unknown
  companionshipMode?: unknown
  continuityTiming?: unknown
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
  reasonSummary?: unknown
  visemeBias?: unknown
  energyBias?: unknown
  mouthScale?: unknown
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

  const continuity = resolveLipsyncContinuityPosture({
    mode: input.mode,
    continuityHoldMs: input.continuityHoldMs,
  })

  const parts = [
    normalizeSummaryString(input.mode) ? `mode=${normalizeSummaryString(input.mode)}` : null,
    normalizeSummaryString(input.phase) ? `phase=${normalizeSummaryString(input.phase)}` : null,
    continuity ? `continuity=${continuity}` : null,
    Number.isFinite(Number(input.continuityHoldMs)) && Number(input.continuityHoldMs) > 0 ? `hold=${Number(input.continuityHoldMs)}ms` : null,
    normalizeSummaryString(input.topViseme) ? `topViseme=${normalizeSummaryString(input.topViseme)}` : null,
    normalizeSummaryString(input.hintTrail) ? `hints=${normalizeSummaryString(input.hintTrail)}` : null,
    normalizeSummaryString(input.hintViseme) ? `hint=${normalizeSummaryString(input.hintViseme)}` : null,
    normalizeSummaryString(input.companionshipMode) ? `companion=${normalizeSummaryString(input.companionshipMode)}` : null,
    normalizeSummaryString(input.continuityTiming) ? `timing=${normalizeSummaryString(input.continuityTiming)}` : null,
    normalizeSummaryString(input.preferredBlinkCadence) ? `blink=${normalizeSummaryString(input.preferredBlinkCadence)}` : null,
    normalizeSummaryString(input.preferredGazeMode) ? `gaze=${normalizeSummaryString(input.preferredGazeMode)}` : null,
    normalizeSummaryString(input.preferredPauseMode) ? `pause=${normalizeSummaryString(input.preferredPauseMode)}` : null,
    normalizeSummaryString(input.preferredLipsyncMode) ? `lipsyncMode=${normalizeSummaryString(input.preferredLipsyncMode)}` : null,
    normalizeSummaryString(input.preferredVoiceMode) ? `voiceMode=${normalizeSummaryString(input.preferredVoiceMode)}` : null,
    normalizeSummaryString(input.preferredPacingMode) ? `pacing=${normalizeSummaryString(input.preferredPacingMode)}` : null,
    normalizeSummaryString(input.reasonSummary) ? `reason=${normalizeSummaryString(input.reasonSummary)}` : null,
    formatNumber(input.visemeBias) ? `visemeBias=${formatNumber(input.visemeBias)}` : null,
    formatNumber(input.energyBias) ? `energyBias=${formatNumber(input.energyBias)}` : null,
    formatNumber(input.mouthScale) ? `mouthScale=${formatNumber(input.mouthScale)}` : null,
    normalizeSummaryString(input.source) ? `src=${normalizeSummaryString(input.source)}` : null,
    formatNumber(input.confidence) ? `conf=${formatNumber(input.confidence)}` : null,
    normalizeSummaryString(input.segmentId) ? `seg=${normalizeSummaryString(input.segmentId)}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}
