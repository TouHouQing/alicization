import type { StageEmbodimentPerformanceMatchedDriver } from '@proj-alicization/stage-shared'

import type { PerformanceVisualizerRuntimeDiagnosticSummaryEntry } from './performance-visualizer-runtime-diagnostic-summary'

import {
  formatDriverAuthorityBindingSummary,
  formatDriverAuthorityMatchSummary,
} from './performance-visualizer-driver-authority'
import {
  buildPlaybackCueAuthoritySummaryEntries,

} from './performance-visualizer-runtime-diagnostic-summary'

export interface PerformanceVisualizerPlaybackCueAuthorityView {
  cueId: string
  authoritySegmentId: string | null
  authorityRendererTarget: 'live2d' | 'vrm' | null
  authorityMatchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
  authoritySources: string[]
  authorityTrustSummary?: string | null
  prosodyAuthoritySummary?: string | null
  traceEmbodimentSummary?: string | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  authorityBindingSummary: string | null
  authorityMatchSummary: string | null
  settleAuthoritySummary: string | null
  summaryEntries?: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[]
  preferredExpressionAliases: string[]
  preferredMotionAliases: string[]
  live2dFacialReleaseMs: number | null
  live2dMotionFollowThroughMs: number | null
  vrmActionFadeMs: number | null
  vrmExpressionBlendMs: number | null
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function normalizeAliasList(values: unknown) {
  return Array.isArray(values)
    ? values
        .map(item => normalizeText(item))
        .filter((item): item is string => Boolean(item))
        .filter((item, index, items) => items.indexOf(item) === index)
    : []
}

function normalizeDriverList(values: unknown): StageEmbodimentPerformanceMatchedDriver[] {
  return Array.isArray(values)
    ? values.filter((value): value is StageEmbodimentPerformanceMatchedDriver =>
        value === 'body' || value === 'face' || value === 'motion' || value === 'lipsync' || value === 'voice',
      )
    : []
}

function normalizeNumber(value: unknown) {
  return Number.isFinite(value)
    ? Number(value)
    : null
}

function buildProsodyAuthoritySummary(prosodyAuthority: {
  segmentId?: string | null
  provenance?: 'authority-bound' | 'fallback-derived'
  source?: string | null
  mode?: string | null
  cueProsodyWeight?: number | null
  cueMouthWeight?: number | null
  cueHeadWeight?: number | null
  visemePeakWeight?: number | null
} | null | undefined) {
  if (!prosodyAuthority)
    return null

  return [
    `mode=${normalizeText(prosodyAuthority.mode) ?? 'n/a'}`,
    `prosody=${Number.isFinite(prosodyAuthority.cueProsodyWeight) ? Number(prosodyAuthority.cueProsodyWeight).toFixed(2) : 'n/a'}`,
    `mouth=${Number.isFinite(prosodyAuthority.cueMouthWeight) ? Number(prosodyAuthority.cueMouthWeight).toFixed(2) : 'n/a'}`,
    `head=${Number.isFinite(prosodyAuthority.cueHeadWeight) ? Number(prosodyAuthority.cueHeadWeight).toFixed(2) : 'n/a'}`,
    `visemePeak=${Number.isFinite(prosodyAuthority.visemePeakWeight) ? Number(prosodyAuthority.visemePeakWeight).toFixed(2) : 'n/a'}`,
    `provenance=${prosodyAuthority.provenance ?? 'n/a'}`,
    `source=${normalizeText(prosodyAuthority.source) ?? 'n/a'}`,
    `segment=${normalizeText(prosodyAuthority.segmentId) ?? 'n/a'}`,
  ].join(' | ')
}

function resolvePlaybackCueProsodyAuthority(
  telemetry: {
    driverAuthority?: {
      prosodyAuthority?: {
        segmentId?: string | null
        provenance?: 'authority-bound' | 'fallback-derived'
        source?: string | null
        mode?: string | null
        cueProsodyWeight?: number | null
        cueMouthWeight?: number | null
        cueHeadWeight?: number | null
        visemePeakWeight?: number | null
      } | null
    } | null
    prosodyAuthority?: {
      segmentId?: string | null
      provenance?: 'authority-bound' | 'fallback-derived'
      source?: string | null
      mode?: string | null
      cueProsodyWeight?: number | null
      cueMouthWeight?: number | null
      cueHeadWeight?: number | null
      visemePeakWeight?: number | null
    } | null
  } | null | undefined,
) {
  return telemetry?.driverAuthority?.prosodyAuthority
    ?? telemetry?.prosodyAuthority
    ?? null
}

function buildSettleAuthoritySummary(input: {
  authoritySegmentId: string | null
  authorityRendererTarget: 'live2d' | 'vrm' | null
  authorityMatchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
  authoritySources: string[]
}) {
  const hasAuthorityBinding = Boolean(
    input.authoritySegmentId
    || input.authorityRendererTarget
    || input.authorityMatchedDrivers.length > 0
    || input.authoritySources.length > 0,
  )
  if (!hasAuthorityBinding)
    return null

  return `authority-bound | segment=${input.authoritySegmentId ?? 'n/a'} | target=${input.authorityRendererTarget ?? 'n/a'} | drivers=${input.authorityMatchedDrivers.join(', ') || 'n/a'} | sources=${input.authoritySources.join(', ') || 'n/a'}`
}

function deriveAuthorityTrustSummary(input: {
  prosodyAuthoritySummary: string | null
  authoritySegmentId: string | null
}) {
  if (!input.prosodyAuthoritySummary || !input.authoritySegmentId)
    return null

  if (
    input.prosodyAuthoritySummary.includes('provenance=authority-bound')
    && input.prosodyAuthoritySummary.includes(`segment=${input.authoritySegmentId}`)
  ) {
    return '韵律权威链已重新绑定到当前片段，可直接进入长期基线。'
  }

  return null
}

export function buildPlaybackCueAuthorityView(snapshot: {
  speech?: {
    authoritySummary?: {
      cueId?: string | null
      segmentId?: string | null
      rendererTarget?: 'live2d' | 'vrm' | null
      matchedDrivers?: StageEmbodimentPerformanceMatchedDriver[]
      matchedSources?: string[]
      bindingSummary?: string | null
      matchSummary?: string | null
      authorityTrustSummary?: string | null
      prosodyAuthoritySummary?: string | null
      settleSummary?: string | null
      traceEmbodimentSummary?: string | null
    } | null
    playbackTelemetry?: {
      rendererTarget?: 'live2d' | 'vrm' | null
      driverAuthority?: {
        segmentId?: string | null
        rendererTarget?: 'live2d' | 'vrm' | null
        matchedDrivers?: StageEmbodimentPerformanceMatchedDriver[]
        sources?: string[]
        faceSegmentMatched?: boolean | null
        motionSegmentMatched?: boolean | null
        lipsyncSegmentMatched?: boolean | null
        prosodyAuthority?: {
          segmentId?: string | null
          provenance?: 'authority-bound' | 'fallback-derived'
          source?: string | null
          mode?: string | null
          cueProsodyWeight?: number | null
          cueMouthWeight?: number | null
          cueHeadWeight?: number | null
          visemePeakWeight?: number | null
        } | null
      } | null
      prosodyAuthority?: {
        segmentId?: string | null
        provenance?: 'authority-bound' | 'fallback-derived'
        source?: string | null
        mode?: string | null
        cueProsodyWeight?: number | null
        cueMouthWeight?: number | null
        cueHeadWeight?: number | null
        visemePeakWeight?: number | null
      } | null
      cue?: {
        id?: string | null
        rendererHints?: {
          preferredExpressionAliases?: string[]
          preferredMotionAliases?: string[]
        } | null
        rendererSettle?: {
          live2dFacialReleaseMs?: number | null
          live2dMotionFollowThroughMs?: number | null
          vrmActionFadeMs?: number | null
          vrmExpressionBlendMs?: number | null
        } | null
      } | null
    } | null
  } | null
} | null | undefined): PerformanceVisualizerPlaybackCueAuthorityView | null {
  const telemetry = snapshot?.speech?.playbackTelemetry
  const authority = telemetry?.driverAuthority
  const authoritySummary = snapshot?.speech?.authoritySummary ?? null
  const authoritySummaryCueId = normalizeText(authoritySummary?.cueId)
  const authoritySegmentId = normalizeText(authoritySummary?.segmentId) ?? normalizeText(authority?.segmentId)
  const cue = snapshot?.speech?.playbackTelemetry?.cue
  const playbackCueId = normalizeText(cue?.id)
  const cueId = playbackCueId ?? authoritySummaryCueId ?? authoritySegmentId
  if (!cueId)
    return null
  const authoritySummaryMatchesCue = !authoritySummaryCueId || authoritySummaryCueId === cueId

  const authorityRendererTarget = authoritySummary?.rendererTarget ?? authority?.rendererTarget ?? telemetry?.rendererTarget ?? null
  const authorityMatchedDrivers = authoritySummary?.matchedDrivers
    ? normalizeDriverList(authoritySummary.matchedDrivers)
    : normalizeDriverList(authority?.matchedDrivers)
  const authoritySources = authoritySummary?.matchedSources
    ? normalizeAliasList(authoritySummary.matchedSources)
    : normalizeAliasList(authority?.sources)
  const faceSegmentMatched = typeof authority?.faceSegmentMatched === 'boolean' ? authority.faceSegmentMatched : null
  const motionSegmentMatched = typeof authority?.motionSegmentMatched === 'boolean' ? authority.motionSegmentMatched : null
  const lipsyncSegmentMatched = typeof authority?.lipsyncSegmentMatched === 'boolean' ? authority.lipsyncSegmentMatched : null
  const allowCueScopedAuthoritySummaries = authoritySummaryMatchesCue || !authoritySummary
  const authorityMatchSummary = allowCueScopedAuthoritySummaries
    ? ((authoritySummaryMatchesCue ? normalizeText(authoritySummary?.matchSummary) : null) ?? formatDriverAuthorityMatchSummary({
        faceSegmentMatched,
        motionSegmentMatched,
        lipsyncSegmentMatched,
      }))
    : null
  const authorityBindingSummary = allowCueScopedAuthoritySummaries
    ? ((authoritySummaryMatchesCue ? normalizeText(authoritySummary?.bindingSummary) : null) ?? (authorityRendererTarget || authorityMatchedDrivers.length > 0 || authoritySources.length > 0
        ? formatDriverAuthorityBindingSummary({
            rendererTarget: authorityRendererTarget,
            matchedDrivers: authorityMatchedDrivers,
            matchedSources: authoritySources,
            faceSegmentMatched,
            motionSegmentMatched,
            lipsyncSegmentMatched,
          })
        : null))
    : null
  const settleAuthoritySummary = allowCueScopedAuthoritySummaries
    ? ((authoritySummaryMatchesCue ? normalizeText(authoritySummary?.settleSummary) : null) ?? buildSettleAuthoritySummary({
        authoritySegmentId,
        authorityRendererTarget,
        authorityMatchedDrivers,
        authoritySources,
      }))
    : null
  const resolvedProsodyAuthority = resolvePlaybackCueProsodyAuthority(telemetry)
  const prosodyAuthoritySummary = allowCueScopedAuthoritySummaries
    ? ((authoritySummaryMatchesCue ? normalizeText(authoritySummary?.prosodyAuthoritySummary) : null) ?? buildProsodyAuthoritySummary(resolvedProsodyAuthority))
    : null
  const authorityTrustSummary = allowCueScopedAuthoritySummaries
    ? ((authoritySummaryMatchesCue ? normalizeText(authoritySummary?.authorityTrustSummary) : null) ?? deriveAuthorityTrustSummary({
        prosodyAuthoritySummary,
        authoritySegmentId,
      }))
    : null
  const traceEmbodimentSummary = authoritySummaryMatchesCue
    ? normalizeText(authoritySummary?.traceEmbodimentSummary)
    : null
  const preferredExpressionAliases = normalizeAliasList(cue?.rendererHints?.preferredExpressionAliases)
  const preferredMotionAliases = normalizeAliasList(cue?.rendererHints?.preferredMotionAliases)
  const live2dFacialReleaseMs = normalizeNumber(cue?.rendererSettle?.live2dFacialReleaseMs)
  const live2dMotionFollowThroughMs = normalizeNumber(cue?.rendererSettle?.live2dMotionFollowThroughMs)
  const vrmActionFadeMs = normalizeNumber(cue?.rendererSettle?.vrmActionFadeMs)
  const vrmExpressionBlendMs = normalizeNumber(cue?.rendererSettle?.vrmExpressionBlendMs)
  const summaryEntries = buildPlaybackCueAuthoritySummaryEntries({
    cueId,
    authoritySegmentId,
    authorityRendererTarget,
    authorityMatchedDrivers,
    authoritySources,
    authorityTrustSummary,
    prosodyAuthoritySummary,
    traceEmbodimentSummary,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    authorityBindingSummary,
    authorityMatchSummary,
    settleAuthoritySummary,
    preferredExpressionAliases,
    preferredMotionAliases,
    live2dFacialReleaseMs,
    live2dMotionFollowThroughMs,
    vrmActionFadeMs,
    vrmExpressionBlendMs,
  })

  return {
    cueId,
    authoritySegmentId,
    authorityRendererTarget,
    authorityMatchedDrivers,
    authoritySources,
    authorityTrustSummary,
    prosodyAuthoritySummary,
    traceEmbodimentSummary,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    authorityBindingSummary,
    authorityMatchSummary,
    settleAuthoritySummary,
    summaryEntries,
    preferredExpressionAliases,
    preferredMotionAliases,
    live2dFacialReleaseMs,
    live2dMotionFollowThroughMs,
    vrmActionFadeMs,
    vrmExpressionBlendMs,
  }
}
