import type { StageEmbodimentPerformanceMatchedDriver } from '@proj-alicization/stage-shared'

import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerAuthoritySegmentRow } from './performance-visualizer-authority-summary'
import type { PerformanceVisualizerSpeechDiagnosticSummaryEntry } from './performance-visualizer-speech-diagnostic-summary'
import type { PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'
import type { SpeechObservabilityView } from './performance-visualizer-speech-observability'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import {
  buildAuthorityMismatchReasonSummary,
  buildAuthorityMismatchSummary,
} from './performance-visualizer-authority-mismatch-filter'
import {
  buildSpeechDiagnosticSummaryEntries,

} from './performance-visualizer-speech-diagnostic-summary'
import {
  buildSpeechEvidenceSnapshot,

} from './performance-visualizer-speech-evidence'
import {
  formatAuthorityBindingSummary,
  formatAuthorityMatchSummary,
  formatDriverExecutionSummary,
} from './performance-visualizer-speech-observability'
import {
  buildTraceAuthorityExecutionSummary,
  buildTraceEmbodimentSummary,
} from './performance-visualizer-trace-embodiment'

export interface SpeechAuthoritySegmentRow {
  cueId: string
  cueText: string | null
  driftStatus: PerformanceVisualizerAuthoritySegmentRow['driftStatus']
  aligned: boolean | null
  authoritySegmentMatched?: boolean | null
  authorityMatchedDrivers?: StageEmbodimentPerformanceMatchedDriver[]
  authorityMatchedSources?: string[]
  authorityBindingSummary: string | null
  authorityMatchSummary: string | null
  authorityTrustSummary?: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  speechEvidence?: PerformanceVisualizerSpeechEvidenceSnapshot
  speechSummaryEntries?: PerformanceVisualizerSpeechDiagnosticSummaryEntry[]
  playbackTelemetry?: SpeechObservabilityView['playbackTelemetry'] | null
  settleAuthoritySummary: string | null
  rendererDriftSummary?: string | null
  voiceSummary: string | null
  bodyContinuitySummary?: string | null
  prosodyAuthoritySummary?: string | null
  topVisemeSummary: string | null
  cueSummary?: string | null
  cueIdentityPresent?: boolean
  cueProsodyPresent?: boolean
  faceCue: string | null
  actionCue: string | null
  weightSummary: string | null
  personaStyleSummary: string | null
  timingSummary: string | null
  driverExecutionSummary: string | null
  traceEmbodimentSummary: string | null
  visemeHintsSummary: string | null
}

function buildSettleAuthoritySummary(
  row: PerformanceVisualizerAuthoritySegmentRow,
  authorityBindingSummary: string | null,
  preferredSummary?: string | null,
) {
  const hasSettleLane = row.entries.some(entry => entry.lane === 'settle' && entry.settle)
  if (!hasSettleLane)
    return null

  if (preferredSummary)
    return preferredSummary

  if (authorityBindingSummary)
    return `authority-bound | segment=${row.cueId} | ${authorityBindingSummary}`

  return `fallback-derived | segment=${row.cueId}`
}

function collectObservedSegmentIds(view: SpeechObservabilityView) {
  const ids = new Set<string>()

  if (view.authorityBinding?.segmentId)
    ids.add(view.authorityBinding.segmentId)

  if (view.cueMicro?.cueId)
    ids.add(view.cueMicro.cueId)

  for (const hint of view.visemeHints) {
    if (hint.segmentId)
      ids.add(hint.segmentId)
  }

  return ids
}

function formatNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(2)
    : 'n/a'
}

function hasNumericCueWeight(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
}

function annotateStructuredVoiceSummary(input: {
  summary: string | null | undefined
  authorityBinding: SpeechObservabilityView['authorityBinding']
  visemeHints: SpeechObservabilityView['visemeHints']
  cueId: string
  driverExecution: SpeechObservabilityView['driverExecution']
}) {
  const summary = typeof input.summary === 'string' && input.summary.trim()
    ? input.summary.trim()
    : null
  if (!summary)
    return null

  if (!summary.includes('closure=') || summary.includes('provenance='))
    return summary

  const provenance = input.authorityBinding?.segmentId === input.cueId
    ? 'authority-bound'
    : 'fallback-derived'
  const source = input.visemeHints.find(hint => hint.segmentId === input.cueId && hint.source)?.source
    ?? (input.driverExecution?.face?.segmentId === input.cueId ? input.driverExecution.face.source : null)
    ?? (input.driverExecution?.motion?.segmentId === input.cueId ? input.driverExecution.motion.source : null)
    ?? 'n/a'

  return `${summary} | provenance=${provenance} | segment=${input.cueId} | source=${source ?? 'n/a'}`
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

function formatSpeechAuthorityProsodySummary(prosodyAuthority: {
  segmentId: string | null
  provenance: 'authority-bound' | 'fallback-derived'
  source: string | null
  mode: string | null
  cueProsodyWeight: number | null
  cueMouthWeight: number | null
  cueHeadWeight: number | null
  visemePeakWeight: number | null
} | null | undefined) {
  if (!prosodyAuthority)
    return null

  return [
    `mode=${prosodyAuthority.mode ?? 'n/a'}`,
    `prosody=${Number.isFinite(prosodyAuthority.cueProsodyWeight) ? Number(prosodyAuthority.cueProsodyWeight).toFixed(2) : 'n/a'}`,
    `mouth=${Number.isFinite(prosodyAuthority.cueMouthWeight) ? Number(prosodyAuthority.cueMouthWeight).toFixed(2) : 'n/a'}`,
    `head=${Number.isFinite(prosodyAuthority.cueHeadWeight) ? Number(prosodyAuthority.cueHeadWeight).toFixed(2) : 'n/a'}`,
    `visemePeak=${Number.isFinite(prosodyAuthority.visemePeakWeight) ? Number(prosodyAuthority.visemePeakWeight).toFixed(2) : 'n/a'}`,
    `provenance=${prosodyAuthority.provenance}`,
    `source=${prosodyAuthority.source ?? 'n/a'}`,
    `segment=${prosodyAuthority.segmentId ?? 'n/a'}`,
  ].join(' | ')
}

function resolveSpeechAuthorityProsodySummary(
  speechView: SpeechObservabilityView,
) {
  return speechView.speechEvidence?.prosodyAuthoritySummary
    ?? (speechView.playbackTelemetry?.driverAuthority?.prosodyAuthority
      ? formatSpeechAuthorityProsodySummary(speechView.playbackTelemetry.driverAuthority.prosodyAuthority)
      : null)
    ?? (speechView.playbackTelemetry?.prosodyAuthority
      ? formatSpeechAuthorityProsodySummary(speechView.playbackTelemetry.prosodyAuthority)
      : null)
    ?? null
}

export function buildSpeechAuthoritySegmentRows(
  authorityRows: PerformanceVisualizerAuthoritySegmentRow[],
  speechView: SpeechObservabilityView,
  traceContext?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'recentDrivingTraceRecord' | 'recentDrivingTraceDetails'
  >,
): SpeechAuthoritySegmentRow[] {
  const observedSegmentIds = collectObservedSegmentIds(speechView)
  if (observedSegmentIds.size === 0)
    return []

  return authorityRows
    .filter(row => observedSegmentIds.has(row.cueId))
    .map((row) => {
      const hasSettleEvidence = row.entries.some(entry => entry.lane === 'settle' && entry.settle)
      const matchedAuthorityBinding = speechView.authorityBinding?.segmentId === row.cueId
        ? speechView.authorityBinding
        : null
      const isAuthorityMatchedCue = Boolean(matchedAuthorityBinding)
      const cueMicro = speechView.cueMicro?.cueId === row.cueId
        ? speechView.cueMicro
        : null
      const segmentVisemeHints = speechView.visemeHints.filter(hint => hint.segmentId === row.cueId)
      const voiceSummary = annotateStructuredVoiceSummary({
        summary: speechView.articulationSummary?.voice ?? null,
        authorityBinding: speechView.authorityBinding,
        visemeHints: speechView.visemeHints,
        cueId: row.cueId,
        driverExecution: speechView.driverExecution,
      })
      const topVisemeSummary = speechView.articulationSummary?.topVisemes ?? null
      const cueHasIdentity = Boolean(
        cueMicro?.facialCue
        || cueMicro?.actionCue,
      )
      const cueHasProsodyWeights = hasNumericCueWeight(cueMicro?.prosodyWeight)
        || hasNumericCueWeight(cueMicro?.mouthWeight)
        || hasNumericCueWeight(cueMicro?.headWeight)
      const cueSummary = cueMicro && (cueHasIdentity || cueHasProsodyWeights)
        ? speechView.cueMicroSummary?.cue ?? null
        : null
      const weightSummary = cueHasProsodyWeights && cueSummary
        ? cueSummary
          .split(' | ')
          .at(1)
          ?.split(' ')
          .filter(part => part.startsWith('prosody=') || part.startsWith('mouth=') || part.startsWith('head='))
          .join(' ') ?? null
        : null
      const cueIdentityPresent = Boolean(
        cueMicro?.facialCue
        || cueMicro?.actionCue,
      )
      const cueProsodyPresent = cueHasProsodyWeights
      const timingSummary = cueMicro && (cueHasIdentity || cueHasProsodyWeights || cueMicro?.settleMode)
        ? speechView.cueMicroSummary?.timing ?? null
        : null
      const driverExecutionSummary = speechView.driverExecutionSummary
        ?? formatDriverExecutionSummary(
          speechView.driverExecution,
          row.cueId,
        )
      const visemeHintsSummary = speechView.visemeHintsSummary
        ?? (segmentVisemeHints.length > 0
          ? segmentVisemeHints.map(hint =>
              `${hint.viseme ?? 'n/a'}:${formatNumber(hint.weight)}@${formatNumber(hint.confidence)}`,
            ).join(' | ')
          : null)
      const authoritySummaryCueMatchesRow = !speechView.authoritySummary?.cueId || speechView.authoritySummary.cueId === row.cueId
      const authorityBindingSummary = isAuthorityMatchedCue
        ? (authoritySummaryCueMatchesRow ? speechView.authoritySummary?.bindingSummary : null)
        ?? formatAuthorityBindingSummary(speechView.authorityBinding)
        : null
      const authorityMatchSummary = isAuthorityMatchedCue
        ? (authoritySummaryCueMatchesRow ? speechView.authoritySummary?.matchSummary : null)
        ?? formatAuthorityMatchSummary(speechView.authorityBinding)
        : null
      const authorityMatchedSources = matchedAuthorityBinding
        ? [...matchedAuthorityBinding.matchedSources]
        : []
      const authorityMismatchSummary = matchedAuthorityBinding
        ? speechView.authorityMismatchSummary
        ?? buildAuthorityMismatchSummary(matchedAuthorityBinding)
        : null
      const authorityMismatchReasonSummary = matchedAuthorityBinding
        ? speechView.authorityMismatchReasonSummary
        ?? buildAuthorityMismatchReasonSummary({
          authority: matchedAuthorityBinding,
          matchedSources: matchedAuthorityBinding.matchedSources,
          driverExecutionSummary,
          finalSurfacePolicy: traceContext?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
        })
        : null
      const authorityMismatchDisplay = isAuthorityMatchedCue
        ? speechView.authorityMismatchDisplay
        ?? resolveAuthorityMismatchDisplay({
          authorityMismatchSummary,
          authorityMismatchReasonSummary,
        })
        : null
      const settleAuthoritySummary = buildSettleAuthoritySummary(
        row,
        authorityBindingSummary,
        isAuthorityMatchedCue && authoritySummaryCueMatchesRow
          ? speechView.authoritySummary?.settleSummary ?? null
          : null,
      )
      const baseTraceEmbodimentSummary = (isAuthorityMatchedCue || hasSettleEvidence)
        ? buildTraceEmbodimentSummary(traceContext)
        : null
      const traceEmbodimentSummary = baseTraceEmbodimentSummary
        ? buildTraceAuthorityExecutionSummary({
            turnMode: traceContext?.recentDrivingTraceRecord?.turnMode ?? null,
            closureState: traceContext?.recentDrivingTraceRecord?.closureState ?? null,
            finalSurfacePolicy: traceContext?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
            matchedDrivers: matchedAuthorityBinding
              ? [...matchedAuthorityBinding.matchedDrivers]
              : [],
            driverExecutionSummary,
            traceEmbodimentSummary: baseTraceEmbodimentSummary,
          })
        : null
      const resolvedProsodyAuthoritySummary = resolveSpeechAuthorityProsodySummary(speechView)
      const speechEvidence = buildSpeechEvidenceSnapshot({
        voiceSummary,
        prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
        authorityMatchSummary,
        topVisemeSummary,
        cueSummary,
        cueIdentityPresent,
        cueProsodyPresent,
        personaStyleSummary: speechView.cueMicro?.cueId === row.cueId
          ? speechView.cueMicroSummary?.personaStyle ?? null
          : null,
        timingSummary,
        driverExecutionSummary,
        visemeHintsSummary,
      })
      const authorityTrustSummary = deriveAuthorityTrustSummary({
        prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
        authoritySegmentId: row.cueId,
      })
      const speechSummaryEntries = buildSpeechDiagnosticSummaryEntries({
        authorityBindingSummary,
        authorityMatchSummary,
        authorityTrustSummary,
        authorityMismatchSummary,
        authorityMismatchReasonSummary,
        authorityMismatchDisplay,
        settleAuthoritySummary,
        traceEmbodimentSummary,
        includeSettleAuthority: true,
        speechEvidence,
      })

      return {
        cueId: row.cueId,
        cueText: row.cueText,
        driftStatus: row.driftStatus,
        aligned: row.aligned,
        authoritySegmentMatched: isAuthorityMatchedCue,
        authorityMatchedDrivers: matchedAuthorityBinding
          ? [...matchedAuthorityBinding.matchedDrivers]
          : [],
        authorityMatchedSources,
        authorityBindingSummary,
        authorityMatchSummary,
        authorityTrustSummary,
        authorityMismatchSummary,
        authorityMismatchReasonSummary,
        authorityMismatchDisplay,
        speechEvidence,
        speechSummaryEntries,
        ...(speechView.playbackTelemetry ? { playbackTelemetry: speechView.playbackTelemetry } : {}),
        settleAuthoritySummary,
        rendererDriftSummary: isAuthorityMatchedCue
          ? (speechView.rendererAlignmentSummary.live2d ?? speechView.rendererAlignmentSummary.vrm ?? null)
          : null,
        voiceSummary,
        prosodyAuthoritySummary: speechEvidence.prosodyAuthoritySummary,
        topVisemeSummary,
        cueSummary,
        cueIdentityPresent,
        cueProsodyPresent,
        faceCue: cueMicro?.facialCue ?? null,
        actionCue: cueMicro?.actionCue ?? null,
        weightSummary,
        personaStyleSummary: speechEvidence.personaStyleSummary,
        timingSummary,
        driverExecutionSummary,
        traceEmbodimentSummary,
        visemeHintsSummary,
      }
    })
    .filter(row =>
      row.voiceSummary
      || row.prosodyAuthoritySummary
      || row.authorityBindingSummary
      || row.authorityMatchSummary
      || row.settleAuthoritySummary
      || row.topVisemeSummary
      || row.faceCue
      || row.actionCue
      || row.weightSummary
      || row.personaStyleSummary
      || row.timingSummary
      || row.driverExecutionSummary
      || row.traceEmbodimentSummary
      || row.visemeHintsSummary,
    )
}
