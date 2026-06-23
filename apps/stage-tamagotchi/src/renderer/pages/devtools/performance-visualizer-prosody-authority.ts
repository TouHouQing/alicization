export interface PerformanceVisualizerProsodyAuthority {
  segmentId: string | null
  provenance: 'authority-bound' | 'fallback-derived'
  source: string | null
  mode: string | null
  cueProsodyWeight: number | null
  cueMouthWeight: number | null
  cueHeadWeight: number | null
  visemePeakWeight: number | null
}

interface PerformanceVisualizerProsodyAuthorityInput {
  segmentId?: string | null
  provenance?: 'authority-bound' | 'fallback-derived'
  source?: string | null
  mode?: string | null
  cueProsodyWeight?: number | null
  cueMouthWeight?: number | null
  cueHeadWeight?: number | null
  visemePeakWeight?: number | null
}

interface PerformanceVisualizerVoiceDriverTelemetry extends PerformanceVisualizerProsodyAuthorityInput {
  playbackPhase?: string | null
  continuityHoldMs?: number | null
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function normalizeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : null
}

function formatProsodyWeight(value: number | null | undefined) {
  return Number.isFinite(value)
    ? Number(value).toFixed(2)
    : 'n/a'
}

function hasVoiceAuthoritySignal(
  driver: PerformanceVisualizerVoiceDriverTelemetry | null | undefined,
) {
  if (!driver)
    return false

  return driver.playbackPhase === 'playing'
    || Math.max(0, Math.round(driver.continuityHoldMs ?? 0)) > 0
    || driver.cueProsodyWeight != null
    || driver.cueMouthWeight != null
    || driver.cueHeadWeight != null
    || driver.visemePeakWeight != null
    || Boolean(normalizeText(driver.source))
}

function normalizeProsodyAuthority(
  prosodyAuthority: PerformanceVisualizerProsodyAuthorityInput | PerformanceVisualizerVoiceDriverTelemetry | null | undefined,
): PerformanceVisualizerProsodyAuthority | null {
  if (!prosodyAuthority)
    return null

  return {
    segmentId: normalizeText(prosodyAuthority.segmentId),
    provenance: prosodyAuthority.provenance ?? 'fallback-derived',
    source: normalizeText(prosodyAuthority.source),
    mode: normalizeText(prosodyAuthority.mode),
    cueProsodyWeight: normalizeNumber(prosodyAuthority.cueProsodyWeight),
    cueMouthWeight: normalizeNumber(prosodyAuthority.cueMouthWeight),
    cueHeadWeight: normalizeNumber(prosodyAuthority.cueHeadWeight),
    visemePeakWeight: normalizeNumber(prosodyAuthority.visemePeakWeight),
  }
}

export function formatResolvedProsodyAuthoritySummary(
  prosodyAuthority: PerformanceVisualizerProsodyAuthority | null | undefined,
) {
  if (!prosodyAuthority)
    return null

  return [
    `mode=${prosodyAuthority.mode ?? 'n/a'}`,
    `prosody=${formatProsodyWeight(prosodyAuthority.cueProsodyWeight)}`,
    `mouth=${formatProsodyWeight(prosodyAuthority.cueMouthWeight)}`,
    `head=${formatProsodyWeight(prosodyAuthority.cueHeadWeight)}`,
    `visemePeak=${formatProsodyWeight(prosodyAuthority.visemePeakWeight)}`,
    `provenance=${prosodyAuthority.provenance}`,
    `source=${prosodyAuthority.source ?? 'n/a'}`,
    `segment=${prosodyAuthority.segmentId ?? 'n/a'}`,
  ].join(' | ')
}

export function resolveProsodyAuthorityFromSources<
  TDriverAuthority extends {
    prosodyAuthority?: PerformanceVisualizerProsodyAuthorityInput | null
  } | null | undefined,
  TVoiceDriver extends PerformanceVisualizerVoiceDriverTelemetry | null | undefined,
  TTelemetry extends {
    driverAuthority?: TDriverAuthority
    prosodyAuthority?: PerformanceVisualizerProsodyAuthorityInput | null
    drivers?: {
      voice?: TVoiceDriver
    } | null
  } | null | undefined,
>(telemetry: TTelemetry) {
  const driverAuthorityProsody = normalizeProsodyAuthority(telemetry?.driverAuthority?.prosodyAuthority)
  if (driverAuthorityProsody)
    return driverAuthorityProsody

  const topLevelProsody = normalizeProsodyAuthority(telemetry?.prosodyAuthority)
  if (topLevelProsody)
    return topLevelProsody

  const explicitVoiceDriver = telemetry?.drivers?.voice
  if (!hasVoiceAuthoritySignal(explicitVoiceDriver))
    return null

  return normalizeProsodyAuthority(explicitVoiceDriver)
}
