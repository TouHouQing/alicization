import type {
  PerformanceVisualizerAuthorityDriver,
  PerformanceVisualizerRendererTarget,
} from './performance-visualizer-driver-authority'

import { deriveAuthorityTrustSummary } from './performance-visualizer-authority-trust'

export interface PerformanceVisualizerResolveAuthorityTrustInput {
  authorityTrustSummary?: string | null
  authorityBindingSummary?: string | null
  settleAuthoritySummary?: string | null
  rendererTarget?: PerformanceVisualizerRendererTarget
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  residentMode?: string | null
  actionWindow?: string | null
  prosodyAuthoritySummary?: string | null
  authoritySegmentId?: string | null
  authorityMatchedDrivers?: PerformanceVisualizerAuthorityDriver[]
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
}

function derivePrimaryAuthorityTrust(input: PerformanceVisualizerResolveAuthorityTrustInput) {
  return deriveAuthorityTrustSummary({
    prosodyAuthoritySummary: input.prosodyAuthoritySummary ?? null,
    settleAuthoritySummary: input.settleAuthoritySummary ?? null,
    authoritySegmentId: input.authoritySegmentId ?? null,
    authorityRendererTarget: input.rendererTarget ?? null,
    residentMode: input.residentMode ?? null,
    actionWindow: input.actionWindow ?? null,
    preferredBlinkCadence: input.preferredBlinkCadence ?? null,
    preferredGazeMode: input.preferredGazeMode ?? null,
    authorityMatchedDrivers: input.authorityMatchedDrivers ?? [],
    bodySegmentMatched: input.bodySegmentMatched ?? null,
    faceSegmentMatched: input.faceSegmentMatched ?? null,
    motionSegmentMatched: input.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: input.voiceSegmentMatched ?? null,
  })
}

function formatAuthorityRendererTargetLabel(
  rendererTarget: PerformanceVisualizerRendererTarget | undefined,
) {
  if (rendererTarget === 'vrm')
    return 'VRM'
  if (rendererTarget === 'live2d')
    return 'Live2D'
  if (rendererTarget === 'speech')
    return 'speech'
  return '当前渲染体'
}

function formatCadenceGuidance(input: {
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
}) {
  const blink = input.preferredBlinkCadence?.trim() ?? ''
  const gaze = input.preferredGazeMode?.trim() ?? ''
  const parts = [
    blink ? `${blink} blink` : null,
    gaze ? `${gaze} gaze` : null,
  ].filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(' / ') : null
}

function extractRendererTargetFromSummary(summary: string | null | undefined) {
  const value = summary?.match(/(?:^|\|\s*)target=([^|]+)/u)?.[1]?.trim() ?? null
  return value === 'live2d' || value === 'vrm' || value === 'speech'
    ? value
    : null
}

function resolveRendererTarget(input: PerformanceVisualizerResolveAuthorityTrustInput) {
  return input.rendererTarget
    ?? extractRendererTargetFromSummary(input.authorityBindingSummary)
    ?? extractRendererTargetFromSummary(input.settleAuthoritySummary)
    ?? null
}

export function resolveAuthorityTrustSummaryFromSettleAuthority(
  input: PerformanceVisualizerResolveAuthorityTrustInput,
) {
  const explicitTrust = input.authorityTrustSummary?.trim()
  if (explicitTrust)
    return explicitTrust

  const settleAuthoritySummary = input.settleAuthoritySummary?.trim()
  if (!settleAuthoritySummary)
    return null

  const thinAffectiveReason = settleAuthoritySummary.match(/(?:^|\|\s*)reason=([^|]+)$/u)?.[1]?.trim() ?? null
  if (thinAffectiveReason) {
    const cadenceGuidance = formatCadenceGuidance(input)
    return `${formatAuthorityRendererTargetLabel(resolveRendererTarget(input))} 这段 authority 仍带着“${thinAffectiveReason}”这一层关系余温，所以外层观察不该把她压回纯技术 settle。${cadenceGuidance ? ` 当前还要守住 ${cadenceGuidance} 的关系节奏。` : ''}`
  }

  const hasAudibleBodyCarry = settleAuthoritySummary.includes('lane=body+lipsync+voice-only')
    && settleAuthoritySummary.includes('pending-rejoin=face+motion')
  if (!hasAudibleBodyCarry)
    return null

  const cadenceGuidance = formatCadenceGuidance(input)
  return `${formatAuthorityRendererTargetLabel(resolveRendererTarget(input))} 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，表情和动作还在重连这条身体线。${cadenceGuidance ? ` 当前身体还在按 ${cadenceGuidance} 的节奏把这一条线稳住。` : ''}`
}

function isAutoDerivedLaneTrustSummary(summary: string | null | undefined) {
  if (typeof summary !== 'string')
    return false

  const normalized = summary.trim()
  if (!normalized)
    return false

  return normalized.includes('这段 authority 现在主要由')
    || normalized.includes('这段 authority 当前能确认的是口型还在继续托住这一段')
}

export function resolveAuthorityTrustSummaryWithFallback(
  primary: PerformanceVisualizerResolveAuthorityTrustInput,
  fallbacks: PerformanceVisualizerResolveAuthorityTrustInput[] = [],
) {
  const trustSources = [primary, ...fallbacks]
  const primaryDerivedTrust = derivePrimaryAuthorityTrust(primary)

  for (const source of trustSources) {
    const settleResolved = resolveAuthorityTrustSummaryFromSettleAuthority({
      authorityTrustSummary: null,
      authorityBindingSummary: source.authorityBindingSummary ?? null,
      settleAuthoritySummary: source.settleAuthoritySummary ?? null,
      rendererTarget: source.rendererTarget ?? null,
      preferredBlinkCadence: source.preferredBlinkCadence ?? null,
      preferredGazeMode: source.preferredGazeMode ?? null,
    })

    if (settleResolved)
      return settleResolved
  }

  for (const source of trustSources) {
    const upstreamResolved = resolveAuthorityTrustSummaryFromSettleAuthority({
      authorityTrustSummary: source.authorityTrustSummary ?? null,
      authorityBindingSummary: source.authorityBindingSummary ?? null,
      settleAuthoritySummary: source.settleAuthoritySummary ?? null,
      rendererTarget: source.rendererTarget ?? null,
      preferredBlinkCadence: source.preferredBlinkCadence ?? null,
      preferredGazeMode: source.preferredGazeMode ?? null,
    })

    if (!upstreamResolved)
      continue

    if (
      primaryDerivedTrust
      && primaryDerivedTrust !== upstreamResolved
      && isAutoDerivedLaneTrustSummary(upstreamResolved)
    ) {
      return primaryDerivedTrust
    }

    return upstreamResolved
  }

  return primaryDerivedTrust
}
