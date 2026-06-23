import type { StageEmbodimentPerformanceMatchedDriver } from '@proj-alicization/stage-shared'

import type { PerformanceVisualizerAuthorityMismatchFilter } from './performance-visualizer-authority-mismatch-filter'
import type { PerformanceVisualizerAuthorityDisplayRow } from './performance-visualizer-authority-rows'
import type { SpeechAuthoritySegmentRow } from './performance-visualizer-speech-authority'
import type { PerformanceVisualizerSpeechEvidenceFilter, PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'

import {
  buildAuthorityMismatchReasonSummary,
  buildAuthorityMismatchSummary,
  matchesAuthorityMismatchFilter,

} from './performance-visualizer-authority-mismatch-filter'
import { buildSpeechDiagnosticSummaryEntries, buildSpeechDiagnosticSummaryLines } from './performance-visualizer-speech-diagnostic-summary'
import {
  buildSpeechEvidenceSnapshot,
  matchesSpeechEvidenceSnapshot,

} from './performance-visualizer-speech-evidence'
import { buildTraceAuthorityExecutionSummary, isGeneratedTraceEmbodimentSummary } from './performance-visualizer-trace-embodiment'

export interface PerformanceVisualizerAuthorityTableRow {
  cueId: string
  cueText: string | null
  driftStatus: string
  aligned: boolean | null
  surface: string
  lane: string
  planned: string
  consumed: string
  source: string
  confidence: string
  settle: string
  settleLive2dFacialReleaseMs: string
  settleLive2dMotionFollowThroughMs: string
  settleVrmActionFadeMs: string
  settleVrmExpressionBlendMs: string
  authorityBindingSummary: string
  authorityMatchSummary: string
  voiceSummary: string
  prosodyAuthoritySummary: string
  topVisemeSummary: string
  cueSummary: string
  cueIdentityPresent: boolean
  cueProsodyPresent: boolean
  faceCue: string
  actionCue: string
  weightSummary: string
  personaStyleSummary: string
  timingSummary: string
  driverExecutionSummary: string
  traceEmbodimentSummary: string
  visemeHintsSummary: string
  settleAuthoritySummary: string
  authorityTrustSummary?: string | null
  authoritySegmentMatched?: boolean | null
  authorityMatchedDrivers?: StageEmbodimentPerformanceMatchedDriver[]
  authorityMatchedSources?: string[]
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  rendererDriftSummary?: string | null
  speechEvidence?: PerformanceVisualizerSpeechEvidenceSnapshot | null
  speechSummaryLines: string[]
}

function formatSettleValue(value: { planned: number | null, consumed: number | null } | undefined) {
  if (!value)
    return 'n/a'

  const planned = typeof value.planned === 'number' && Number.isFinite(value.planned) ? String(value.planned) : 'n/a'
  const consumed = typeof value.consumed === 'number' && Number.isFinite(value.consumed) ? String(value.consumed) : 'n/a'
  return `${planned} -> ${consumed}`
}

export interface PerformanceVisualizerAuthorityTableFilterOptions {
  surface?: string
  lane?: string
  driftStatus?: string
  cueTextQuery?: string
  speechEvidence?: PerformanceVisualizerSpeechEvidenceFilter
  settleAuthority?: 'authority-bound' | 'fallback-derived'
  authorityTrust?: 'present' | 'none'
  authorityMatch?: PerformanceVisualizerAuthorityMismatchFilter
  rendererDrift?: 'present' | 'pending-or-runtime-only' | 'none'
}

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value !== 'n/a' && value.trim().length > 0
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

function resolveAuthorityTableProsodySummary(
  speech: SpeechAuthoritySegmentRow | undefined,
) {
  return speech?.speechEvidence?.prosodyAuthoritySummary
    ?? (speech?.playbackTelemetry?.driverAuthority?.prosodyAuthority
      ? `${[
        `mode=${speech.playbackTelemetry.driverAuthority.prosodyAuthority.mode ?? 'n/a'}`,
        `prosody=${Number.isFinite(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueProsodyWeight) ? Number(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueProsodyWeight).toFixed(2) : 'n/a'}`,
        `mouth=${Number.isFinite(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueMouthWeight) ? Number(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueMouthWeight).toFixed(2) : 'n/a'}`,
        `head=${Number.isFinite(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueHeadWeight) ? Number(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueHeadWeight).toFixed(2) : 'n/a'}`,
        `visemePeak=${Number.isFinite(speech.playbackTelemetry.driverAuthority.prosodyAuthority.visemePeakWeight) ? Number(speech.playbackTelemetry.driverAuthority.prosodyAuthority.visemePeakWeight).toFixed(2) : 'n/a'}`,
        `provenance=${speech.playbackTelemetry.driverAuthority.prosodyAuthority.provenance}`,
        `source=${speech.playbackTelemetry.driverAuthority.prosodyAuthority.source ?? 'n/a'}`,
        `segment=${speech.playbackTelemetry.driverAuthority.prosodyAuthority.segmentId ?? 'n/a'}`,
      ].join(' | ')}`
      : null)
    ?? (speech?.playbackTelemetry?.prosodyAuthority
      ? `${[
        `mode=${speech.playbackTelemetry.prosodyAuthority.mode ?? 'n/a'}`,
        `prosody=${Number.isFinite(speech.playbackTelemetry.prosodyAuthority.cueProsodyWeight) ? Number(speech.playbackTelemetry.prosodyAuthority.cueProsodyWeight).toFixed(2) : 'n/a'}`,
        `mouth=${Number.isFinite(speech.playbackTelemetry.prosodyAuthority.cueMouthWeight) ? Number(speech.playbackTelemetry.prosodyAuthority.cueMouthWeight).toFixed(2) : 'n/a'}`,
        `head=${Number.isFinite(speech.playbackTelemetry.prosodyAuthority.cueHeadWeight) ? Number(speech.playbackTelemetry.prosodyAuthority.cueHeadWeight).toFixed(2) : 'n/a'}`,
        `visemePeak=${Number.isFinite(speech.playbackTelemetry.prosodyAuthority.visemePeakWeight) ? Number(speech.playbackTelemetry.prosodyAuthority.visemePeakWeight).toFixed(2) : 'n/a'}`,
        `provenance=${speech.playbackTelemetry.prosodyAuthority.provenance}`,
        `source=${speech.playbackTelemetry.prosodyAuthority.source ?? 'n/a'}`,
        `segment=${speech.playbackTelemetry.prosodyAuthority.segmentId ?? 'n/a'}`,
      ].join(' | ')}`
      : null)
    ?? null
}

function extractTraceEmbodimentField(summary: string | null | undefined, field: 'turn' | 'closure' | 'surface') {
  if (!hasValue(summary))
    return null

  const pattern = field === 'turn'
    ? /(?:^|\s)turn=([^|]+)/
    : field === 'closure'
      ? /(?:^|\s)\| closure=([^|]+)/
      : /(?:^|\s)\| surface=([^|]+)/

  return summary?.match(pattern)?.[1]?.trim() ?? null
}

function matchesRendererDriftFilter(
  row: Pick<PerformanceVisualizerAuthorityTableRow, 'rendererDriftSummary'>,
  rendererDrift: NonNullable<PerformanceVisualizerAuthorityTableFilterOptions['rendererDrift']>,
) {
  const summary = row.rendererDriftSummary?.trim() ?? ''

  if (rendererDrift === 'present')
    return summary.length > 0

  if (rendererDrift === 'pending-or-runtime-only') {
    return summary.includes('waiting for renderer application')
      || summary.includes('before resident prediction')
  }

  return summary.length === 0
}

function matchesSpeechEvidence(
  row: PerformanceVisualizerAuthorityTableRow,
  speechEvidence: NonNullable<PerformanceVisualizerAuthorityTableFilterOptions['speechEvidence']>,
) {
  if (speechEvidence === 'authority-trust')
    return hasValue(row.authorityTrustSummary ?? null)

  if (speechEvidence === 'authority-match')
    return hasValue(row.authorityMatchSummary)

  const snapshot: PerformanceVisualizerSpeechEvidenceSnapshot = {
    voiceSummary: row.speechEvidence?.voiceSummary ?? (row.voiceSummary !== 'n/a' ? row.voiceSummary : null),
    prosodyAuthoritySummary: row.speechEvidence?.prosodyAuthoritySummary ?? (row.prosodyAuthoritySummary !== 'n/a' ? row.prosodyAuthoritySummary : null),
    authorityMatchSummary: row.speechEvidence?.authorityMatchSummary ?? (row.authorityMatchSummary !== 'n/a' ? row.authorityMatchSummary : null),
    topVisemeSummary: row.speechEvidence?.topVisemeSummary ?? (row.topVisemeSummary !== 'n/a' ? row.topVisemeSummary : null),
    cueSummary: row.speechEvidence?.cueSummary ?? (row.cueSummary !== 'n/a' ? row.cueSummary : null),
    cueIdentityPresent: row.speechEvidence?.cueIdentityPresent ?? (row.cueIdentityPresent || row.faceCue !== 'n/a' || row.actionCue !== 'n/a'),
    cueProsodyPresent: row.speechEvidence?.cueProsodyPresent ?? (row.cueProsodyPresent || row.weightSummary !== 'n/a'),
    personaStyleSummary: row.speechEvidence?.personaStyleSummary ?? (row.personaStyleSummary !== 'n/a' ? row.personaStyleSummary : null),
    timingSummary: row.speechEvidence?.timingSummary ?? (row.timingSummary !== 'n/a' ? row.timingSummary : null),
    driverExecutionSummary: row.speechEvidence?.driverExecutionSummary ?? (row.driverExecutionSummary !== 'n/a' ? row.driverExecutionSummary : null),
    visemeHintsSummary: row.speechEvidence?.visemeHintsSummary ?? (row.visemeHintsSummary !== 'n/a' ? row.visemeHintsSummary : null),
  }

  return matchesSpeechEvidenceSnapshot(snapshot, speechEvidence)
}

export function buildAuthorityTableRows(
  rows: PerformanceVisualizerAuthorityDisplayRow[],
  speechRowsByCueId?: Record<string, SpeechAuthoritySegmentRow | undefined>,
): PerformanceVisualizerAuthorityTableRow[] {
  return rows.flatMap((row) => {
    const speech = speechRowsByCueId?.[row.cueId]
    const authorityMatchedSources = speech?.authorityMatchedSources ?? (
      speech?.authorityBindingSummary?.includes('sources=')
        ? speech.authorityBindingSummary.split(' | ').find(part => part.startsWith('sources='))?.replace('sources=', '').split(', ').filter(Boolean) ?? []
        : []
    )
    const authority = {
      faceSegmentMatched: speech?.authorityMatchedDrivers?.includes('face') ? true : speech?.authoritySegmentMatched ? false : null,
      motionSegmentMatched: speech?.authorityMatchedDrivers?.includes('motion') ? true : speech?.authoritySegmentMatched ? false : null,
      lipsyncSegmentMatched: speech?.authorityMatchedDrivers?.includes('lipsync') ? true : speech?.authoritySegmentMatched ? false : null,
    } as const
    const authorityMismatchSummary = speech?.authorityMismatchSummary
      ?? buildAuthorityMismatchSummary(authority)
    const authorityMismatchReasonSummary = speech?.authorityMismatchReasonSummary
      ?? buildAuthorityMismatchReasonSummary({
        authority,
        matchedSources: authorityMatchedSources,
        driverExecutionSummary: speech?.driverExecutionSummary ?? null,
        finalSurfacePolicy: null,
      })
    const authorityMismatchDisplay = speech?.authorityMismatchDisplay
      ?? authorityMismatchReasonSummary
      ?? authorityMismatchSummary

    return row.detailRows.map((detail) => {
      const speechEvidence = speech?.speechEvidence
        ? speech.speechEvidence
        : speech
          ? buildSpeechEvidenceSnapshot(speech)
          : null
      const resolvedProsodyAuthoritySummary = resolveAuthorityTableProsodySummary(speech)
      const authorityTrustSummary = speech?.authorityTrustSummary
        ?? deriveAuthorityTrustSummary({
          prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
          authoritySegmentId: speech?.cueId ?? null,
        })
      const traceEmbodimentSummary = speech?.traceEmbodimentSummary
        ? (!isGeneratedTraceEmbodimentSummary(speech.traceEmbodimentSummary)
            ? speech.traceEmbodimentSummary
            : buildTraceAuthorityExecutionSummary({
                turnMode: extractTraceEmbodimentField(speech.traceEmbodimentSummary, 'turn'),
                closureState: extractTraceEmbodimentField(speech.traceEmbodimentSummary, 'closure'),
                finalSurfacePolicy: extractTraceEmbodimentField(speech.traceEmbodimentSummary, 'surface'),
                matchedDrivers: speech.authorityMatchedDrivers ?? [],
                driverExecutionSummary: speech.driverExecutionSummary ?? null,
                traceEmbodimentSummary: speech.traceEmbodimentSummary,
              }))
        : null
      const speechSummaryLines = speech
        ? buildSpeechDiagnosticSummaryLines(buildSpeechDiagnosticSummaryEntries({
            authorityBindingSummary: speech.authorityBindingSummary,
            authorityMatchSummary: speech.authorityMatchSummary,
            authorityTrustSummary,
            authorityMismatchSummary,
            authorityMismatchReasonSummary,
            authorityMismatchDisplay,
            rendererDriftSummary: speech.rendererDriftSummary,
            settleAuthoritySummary: speech.settleAuthoritySummary,
            traceEmbodimentSummary,
            includeSettleAuthority: detail.lane === 'settle',
            speechEvidence,
          }))
        : []

      return {
        cueId: row.cueId,
        cueText: row.cueText,
        driftStatus: row.driftStatus,
        aligned: row.aligned,
        surface: detail.surface,
        lane: detail.lane,
        planned: detail.planned,
        consumed: detail.consumed,
        source: detail.source,
        confidence: detail.confidence,
        settle: detail.settleLines.length > 0 ? detail.settleLines.join(' | ') : 'n/a',
        settleLive2dFacialReleaseMs: formatSettleValue(detail.settle?.live2dFacialReleaseMs),
        settleLive2dMotionFollowThroughMs: formatSettleValue(detail.settle?.live2dMotionFollowThroughMs),
        settleVrmActionFadeMs: formatSettleValue(detail.settle?.vrmActionFadeMs),
        settleVrmExpressionBlendMs: formatSettleValue(detail.settle?.vrmExpressionBlendMs),
        authorityBindingSummary: speech?.authorityBindingSummary ?? 'n/a',
        authorityMatchSummary: speech?.authorityMatchSummary ?? 'n/a',
        voiceSummary: speechEvidence?.voiceSummary ?? 'n/a',
        prosodyAuthoritySummary: resolvedProsodyAuthoritySummary ?? 'n/a',
        topVisemeSummary: speechEvidence?.topVisemeSummary ?? 'n/a',
        cueSummary: speechEvidence?.cueSummary ?? 'n/a',
        cueIdentityPresent: speechEvidence?.cueIdentityPresent ?? false,
        cueProsodyPresent: speechEvidence?.cueProsodyPresent ?? false,
        faceCue: speech?.faceCue ?? 'n/a',
        actionCue: speech?.actionCue ?? 'n/a',
        weightSummary: speech?.weightSummary ?? 'n/a',
        personaStyleSummary: speechEvidence?.personaStyleSummary ?? 'n/a',
        timingSummary: speechEvidence?.timingSummary ?? 'n/a',
        driverExecutionSummary: speechEvidence?.driverExecutionSummary ?? 'n/a',
        traceEmbodimentSummary: traceEmbodimentSummary ?? 'n/a',
        visemeHintsSummary: speechEvidence?.visemeHintsSummary ?? 'n/a',
        settleAuthoritySummary: speech?.settleAuthoritySummary ?? 'n/a',
        authorityTrustSummary,
        authoritySegmentMatched: speech?.authoritySegmentMatched ?? null,
        authorityMatchedDrivers: speech?.authorityMatchedDrivers ?? [],
        authorityMatchedSources,
        authorityMismatchSummary,
        authorityMismatchReasonSummary,
        authorityMismatchDisplay,
        rendererDriftSummary: speech?.rendererDriftSummary ?? null,
        speechEvidence,
        speechSummaryLines,
      }
    })
  })
}

export function filterAuthorityTableRows(
  rows: PerformanceVisualizerAuthorityTableRow[],
  options?: PerformanceVisualizerAuthorityTableFilterOptions,
) {
  return rows.filter((row) => {
    if (options?.surface && row.surface !== options.surface)
      return false
    if (options?.lane && row.lane !== options.lane)
      return false
    if (options?.driftStatus && row.driftStatus !== options.driftStatus)
      return false
    if (options?.cueTextQuery) {
      const query = options.cueTextQuery.trim().toLowerCase()
      if (query && !(row.cueText ?? '').toLowerCase().includes(query))
        return false
    }
    if (options?.settleAuthority) {
      const prefix = `${options.settleAuthority} |`
      if (!row.settleAuthoritySummary.startsWith(prefix))
        return false
    }
    if (options?.authorityTrust) {
      const hasTrust = hasValue(row.authorityTrustSummary ?? null)
      if (options.authorityTrust === 'present' && !hasTrust)
        return false
      if (options.authorityTrust === 'none' && hasTrust)
        return false
    }
    if (options?.authorityMatch && !matchesAuthorityMismatchFilter({
      authorityDriftLanes: [row.lane],
      authoritySegmentMatched: row.authoritySegmentMatched,
      authorityMatchedDrivers: row.authorityMatchedDrivers,
    }, options.authorityMatch)) {
      return false
    }
    if (options?.rendererDrift && !matchesRendererDriftFilter(row, options.rendererDrift))
      return false
    if (options?.speechEvidence && !matchesSpeechEvidence(row, options.speechEvidence))
      return false
    return true
  })
}
