import type { PerformanceVisualizerAuthorityMismatchFilter } from './performance-visualizer-authority-mismatch-filter'
import type { PerformanceVisualizerAuthorityDisplayRow } from './performance-visualizer-authority-rows'
import type { PerformanceVisualizerAuthorityDriver } from './performance-visualizer-driver-authority'
import type { SpeechAuthoritySegmentRow } from './performance-visualizer-speech-authority'
import type { PerformanceVisualizerSpeechEvidenceFilter, PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'

import { resolveAuthorityLaneTruth } from './performance-visualizer-authority-lane-truth'
import {
  matchesAuthorityMismatchFilter,

} from './performance-visualizer-authority-mismatch-filter'
import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import {
  resolveAuthorityTrustSummaryFromSettleAuthority,
  resolveAuthorityTrustSummaryWithFallback,
} from './performance-visualizer-resolve-authority-trust'
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
  authorityMatchedDrivers?: PerformanceVisualizerAuthorityDriver[]
  authorityMatchedSources?: string[]
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  bodyContinuitySummary?: string | null
  embodimentClosureStage?: string | null
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

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeText(match?.[1] ?? null)
}

function matchesCueScopedSegment(segmentId: string | null | undefined, cueId: string) {
  const normalizedSegmentId = normalizeText(segmentId)
  return !normalizedSegmentId || normalizedSegmentId === cueId
}

function structuredSummaryMatchesCueSegment(summary: string | null | undefined, cueId: string) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return !structuredSegmentId || structuredSegmentId === cueId
}

function extractDriverExecutionSummaryDrivers(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return new Set<PerformanceVisualizerAuthorityDriver>()

  return new Set(
    [...normalized.matchAll(/(?:^|\|\s*)(body|face|motion|lipsync|voice)=/g)]
      .map(match => match[1])
      .filter((driver): driver is PerformanceVisualizerAuthorityDriver => (
        driver === 'body'
        || driver === 'face'
        || driver === 'motion'
        || driver === 'lipsync'
        || driver === 'voice'
      )),
  )
}

function resolvePreferredCueScopedDriverExecutionSummary(input: {
  speechEvidenceDriverExecutionSummary: string | null
  driverExecutionSummary: string | null
  expectedDrivers: PerformanceVisualizerAuthorityDriver[]
}) {
  if (!input.speechEvidenceDriverExecutionSummary)
    return input.driverExecutionSummary

  if (!input.driverExecutionSummary)
    return input.speechEvidenceDriverExecutionSummary

  const speechEvidenceExecutionDrivers = extractDriverExecutionSummaryDrivers(
    input.speechEvidenceDriverExecutionSummary,
  )
  const executionDrivers = extractDriverExecutionSummaryDrivers(input.driverExecutionSummary)

  if (speechEvidenceExecutionDrivers.size === 0 && executionDrivers.size > 0)
    return input.driverExecutionSummary

  const currentExecutionAddsExpectedDrivers = input.expectedDrivers.some(driver =>
    executionDrivers.has(driver) && !speechEvidenceExecutionDrivers.has(driver),
  )

  if (currentExecutionAddsExpectedDrivers)
    return input.driverExecutionSummary

  return input.speechEvidenceDriverExecutionSummary
}

function resolveStructuredVoiceSegmentMatchedFromSpeechRow(input: {
  cueId: string
  speech: SpeechAuthoritySegmentRow | undefined
}) {
  const driverAuthority = input.speech?.playbackTelemetry?.driverAuthority
  if (
    driverAuthority
    && matchesCueScopedSegment(driverAuthority.segmentId, input.cueId)
    && typeof driverAuthority.voiceSegmentMatched === 'boolean'
  ) {
    return driverAuthority.voiceSegmentMatched
  }

  const prosodyAuthority = driverAuthority?.prosodyAuthority
  if (
    prosodyAuthority
    && matchesCueScopedSegment(prosodyAuthority.segmentId, input.cueId)
    && prosodyAuthority.provenance === 'authority-bound'
    && normalizeText(prosodyAuthority.source) != null
  ) {
    return true
  }

  return null
}

function resolveAuthorityTableProsodySummary(
  cueId: string,
  speech: SpeechAuthoritySegmentRow | undefined,
) {
  const candidateSummaries = [
    normalizeText(speech?.speechEvidence?.prosodyAuthoritySummary),
    hasValue(speech?.prosodyAuthoritySummary) ? normalizeText(speech?.prosodyAuthoritySummary ?? null) : null,
  ].filter((summary): summary is string => Boolean(summary))

  for (const summary of candidateSummaries) {
    if (structuredSummaryMatchesCueSegment(summary, cueId))
      return summary
  }

  const resolvedSummary = formatResolvedProsodyAuthoritySummary(
    resolveProsodyAuthorityFromSources(speech?.playbackTelemetry),
  )
  return structuredSummaryMatchesCueSegment(resolvedSummary, cueId)
    ? resolvedSummary
    : null
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

function extractEmbodimentClosureStage(...summaries: Array<string | null | undefined>) {
  for (const summary of summaries) {
    if (!hasValue(summary))
      continue
    const normalized = summary?.trim() ?? ''
    if (
      /(?:^|\s|\|)timing=body-lipsync-carry(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+lipsync-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+voice-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+face\+motion-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'body-carried-to-renderer-rejoin'
    }
    if (
      /(?:^|\s|\|)lane=body\+lipsync\+voice-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'audible-body-carry'
    }
    if (
      normalized === 'face+lipsync-only'
      || normalized === 'motion+lipsync-only'
      || normalized === 'face+lipsync+voice-only'
      || normalized === 'motion+lipsync+voice-only'
      || normalized === 'face+motion+lipsync+voice-only'
    ) {
      return 'renderer-rejoin-without-body'
    }
    if (
      normalized === 'audible-body-carry'
      || normalized === 'full-driver-rejoin'
      || normalized === 'body-only-hold'
      || normalized === 'body-carried-to-renderer-rejoin'
      || normalized === 'full-cross-modal-lock'
      || normalized === 'renderer-rejoin-without-body'
      || normalized === 'voice-lipsync-carry'
    ) {
      return normalized
    }
    const match = normalized.match(/(?:^|\s|\|)(?:closure|lane)=(face\+lipsync-only|motion\+lipsync-only|face\+lipsync\+voice-only|motion\+lipsync\+voice-only|face\+motion\+lipsync\+voice-only|audible-body-carry|full-driver-rejoin|body-only-hold|body-carried-to-renderer-rejoin|full-cross-modal-lock|renderer-rejoin-without-body|voice-lipsync-carry)(?:\s|\||$)/)
    if (match?.[1]) {
      if (
        match[1] === 'face+lipsync-only'
        || match[1] === 'motion+lipsync-only'
        || match[1] === 'face+lipsync+voice-only'
        || match[1] === 'motion+lipsync+voice-only'
        || match[1] === 'face+motion+lipsync+voice-only'
      ) {
        return 'renderer-rejoin-without-body'
      }
      return match[1]
    }
  }

  return null
}

function resolveMatchedDriversFromLaneTruth(input: {
  matchedDrivers: PerformanceVisualizerAuthorityDriver[]
  bodySegmentMatched: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched: boolean | null
}) {
  const resolved = [
    input.bodySegmentMatched === true ? 'body' : null,
    input.faceSegmentMatched === true ? 'face' : null,
    input.motionSegmentMatched === true ? 'motion' : null,
    input.lipsyncSegmentMatched === true ? 'lipsync' : null,
    input.voiceSegmentMatched === true ? 'voice' : null,
  ].filter((driver): driver is PerformanceVisualizerAuthorityDriver => Boolean(driver))

  return resolved.length > 0 ? resolved : input.matchedDrivers
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

function resolveAuthorityTableTrustSummary(
  row: Pick<
    PerformanceVisualizerAuthorityTableRow,
    'authorityTrustSummary'
    | 'authorityBindingSummary'
    | 'settleAuthoritySummary'
  >,
) {
  return resolveAuthorityTrustSummaryFromSettleAuthority({
    authorityTrustSummary: row.authorityTrustSummary ?? null,
    authorityBindingSummary: row.authorityBindingSummary,
    settleAuthoritySummary: row.settleAuthoritySummary,
  })
}

function matchesSpeechEvidence(
  row: PerformanceVisualizerAuthorityTableRow,
  speechEvidence: NonNullable<PerformanceVisualizerAuthorityTableFilterOptions['speechEvidence']>,
) {
  if (speechEvidence === 'authority-trust')
    return hasValue(resolveAuthorityTableTrustSummary(row))

  if (speechEvidence === 'authority-match')
    return hasValue(row.authorityMatchSummary)

  const snapshot: PerformanceVisualizerSpeechEvidenceSnapshot = {
    voiceSummary: row.speechEvidence?.voiceSummary ?? (row.voiceSummary !== 'n/a' ? row.voiceSummary : null),
    bodyContinuitySummary: row.speechEvidence?.bodyContinuitySummary ?? (row.bodyContinuitySummary !== 'n/a' ? row.bodyContinuitySummary : null),
    embodimentClosureStage: row.speechEvidence?.embodimentClosureStage ?? row.embodimentClosureStage ?? null,
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
    const hasExplicitSpeechEvidence = Boolean(speech?.speechEvidence)
    const authorityMatchedDrivers = speech?.authorityMatchedDrivers ?? []
    const scopedDriverExecutionSummary = structuredSummaryMatchesCueSegment(
      speech?.driverExecutionSummary ?? null,
      row.cueId,
    )
      ? speech?.driverExecutionSummary ?? null
      : null
    const scopedSpeechEvidenceDriverExecutionSummary = structuredSummaryMatchesCueSegment(
      speech?.speechEvidence?.driverExecutionSummary ?? null,
      row.cueId,
    )
      ? speech?.speechEvidence?.driverExecutionSummary ?? null
      : null
    const effectiveDriverExecutionSummary = resolvePreferredCueScopedDriverExecutionSummary({
      speechEvidenceDriverExecutionSummary: scopedSpeechEvidenceDriverExecutionSummary,
      driverExecutionSummary: scopedDriverExecutionSummary,
      expectedDrivers: authorityMatchedDrivers,
    })
    const authorityMatchedSources = speech?.authorityMatchedSources ?? (
      speech?.authorityBindingSummary?.includes('sources=')
        ? speech.authorityBindingSummary.split(' | ').find(part => part.startsWith('sources='))?.replace('sources=', '').split(', ').filter(Boolean) ?? []
        : []
    )
    const authorityMatchSummary = speech?.authorityMatchSummary ?? null
    const upstreamAuthorityMismatchSummary = speech?.authorityMismatchSummary ?? null
    const {
      authority,
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
      authorityMismatchDisplay,
    } = resolveAuthorityLaneTruth({
      matchSummary: authorityMatchSummary,
      matchedDrivers: authorityMatchedDrivers,
      authorityMismatchSummary: upstreamAuthorityMismatchSummary,
      fallbackDriverMatched: () => speech?.authoritySegmentMatched ? false : null,
      matchedSources: authorityMatchedSources,
      driverExecutionSummary: effectiveDriverExecutionSummary,
      finalSurfacePolicy: null,
      authorityMismatchReasonSummary: speech?.authorityMismatchReasonSummary ?? null,
      authorityMismatchDisplay: speech?.authorityMismatchDisplay ?? null,
    })
    const resolvedProsodyAuthoritySummary = resolveAuthorityTableProsodySummary(row.cueId, speech)
    return row.detailRows.map((detail) => {
      const speechEvidence = speech?.speechEvidence
        ? speech.speechEvidence
        : speech
          ? buildSpeechEvidenceSnapshot(speech)
          : null
      const resolvedEmbodimentClosureStage = speech?.embodimentClosureStage
        ?? extractEmbodimentClosureStage(
          speech?.authorityBindingSummary ?? null,
          speech?.settleAuthoritySummary ?? null,
          effectiveDriverExecutionSummary,
          authorityMismatchDisplay,
          authorityMismatchReasonSummary,
        )
      const resolvedSpeechEvidence = speechEvidence
        ? {
            ...speechEvidence,
            prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
            driverExecutionSummary: structuredSummaryMatchesCueSegment(
              speechEvidence.driverExecutionSummary ?? null,
              row.cueId,
            )
              ? speechEvidence.driverExecutionSummary ?? null
              : null,
            embodimentClosureStage: hasExplicitSpeechEvidence
              ? (speechEvidence.embodimentClosureStage
                ?? resolvedEmbodimentClosureStage
                ?? null)
              : (resolvedEmbodimentClosureStage ?? null),
          }
        : null
      const structuredAuthorityVoiceSegmentMatched = resolveStructuredVoiceSegmentMatchedFromSpeechRow({
        cueId: row.cueId,
        speech,
      })
      const authorityVoiceSegmentMatched = structuredAuthorityVoiceSegmentMatched ?? (() => {
        const voiceSegmentId = extractStructuredSegmentId(resolvedSpeechEvidence?.voiceSummary ?? null)
        const authoritySegmentId = normalizeText(speech?.cueId)
        return voiceSegmentId && authoritySegmentId
          ? voiceSegmentId === authoritySegmentId
          : null
      })()
      const resolvedAuthorityMatchedDrivers = resolveMatchedDriversFromLaneTruth({
        matchedDrivers: authorityMatchedDrivers,
        bodySegmentMatched: authority.bodySegmentMatched ?? null,
        faceSegmentMatched: authority.faceSegmentMatched ?? null,
        motionSegmentMatched: authority.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: authority.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: authorityVoiceSegmentMatched,
      })
      const authorityTrustSummary = resolveAuthorityTrustSummaryWithFallback({
        authorityTrustSummary: speech?.authorityTrustSummary ?? null,
        authorityBindingSummary: speech?.authorityBindingSummary ?? null,
        settleAuthoritySummary: speech?.settleAuthoritySummary ?? null,
        rendererTarget: (speech?.authorityRendererTarget
          ?? speech?.playbackTelemetry?.driverAuthority?.rendererTarget
          ?? speech?.playbackTelemetry?.rendererTarget
          ?? null) as 'live2d' | 'vrm' | null,
        preferredBlinkCadence: speech?.preferredBlinkCadence ?? null,
        preferredGazeMode: speech?.preferredGazeMode ?? null,
        residentMode: speech?.residentMode ?? null,
        prosodyAuthoritySummary: resolvedProsodyAuthoritySummary,
        authoritySegmentId: speech?.cueId ?? null,
        authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
        bodySegmentMatched: authority.bodySegmentMatched ?? null,
        faceSegmentMatched: authority.faceSegmentMatched ?? null,
        motionSegmentMatched: authority.motionSegmentMatched ?? null,
        lipsyncSegmentMatched: authority.lipsyncSegmentMatched ?? null,
        voiceSegmentMatched: authorityVoiceSegmentMatched,
      })
      const traceEmbodimentSummary = speech?.traceEmbodimentSummary
        ? (!isGeneratedTraceEmbodimentSummary(speech.traceEmbodimentSummary)
            ? speech.traceEmbodimentSummary
            : buildTraceAuthorityExecutionSummary({
                turnMode: extractTraceEmbodimentField(speech.traceEmbodimentSummary, 'turn'),
                closureState: extractTraceEmbodimentField(speech.traceEmbodimentSummary, 'closure'),
                finalSurfacePolicy: extractTraceEmbodimentField(speech.traceEmbodimentSummary, 'surface'),
                matchedDrivers: resolvedAuthorityMatchedDrivers,
                driverExecutionSummary: effectiveDriverExecutionSummary,
                traceEmbodimentSummary: speech.traceEmbodimentSummary,
              }))
        : null
      const speechSummaryLines = speech
        ? buildSpeechDiagnosticSummaryLines(buildSpeechDiagnosticSummaryEntries({
            authorityBindingSummary: speech.authorityBindingSummary,
            authorityMatchSummary: speech.authorityMatchSummary,
            authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
            authorityVoiceSegmentMatched,
            authorityTrustSummary,
            sameHerSignature: speech.sameHerSignature ?? null,
            sameHerReasonTags: speech.sameHerReasonTags ?? null,
            authorityMismatchSummary,
            authorityMismatchReasonSummary,
            authorityMismatchDisplay,
            rendererDriftSummary: speech.rendererDriftSummary,
            settleAuthoritySummary: speech.settleAuthoritySummary,
            traceEmbodimentSummary,
            includeSettleAuthority: detail.lane === 'settle',
            speechEvidence: resolvedSpeechEvidence,
          }))
        : []

      const authorityTableRow: PerformanceVisualizerAuthorityTableRow = {
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
        voiceSummary: resolvedSpeechEvidence?.voiceSummary ?? 'n/a',
        prosodyAuthoritySummary: resolvedProsodyAuthoritySummary ?? 'n/a',
        topVisemeSummary: resolvedSpeechEvidence?.topVisemeSummary ?? 'n/a',
        cueSummary: resolvedSpeechEvidence?.cueSummary ?? 'n/a',
        cueIdentityPresent: resolvedSpeechEvidence?.cueIdentityPresent ?? false,
        cueProsodyPresent: resolvedSpeechEvidence?.cueProsodyPresent ?? false,
        faceCue: speech?.faceCue ?? 'n/a',
        actionCue: speech?.actionCue ?? 'n/a',
        weightSummary: speech?.weightSummary ?? 'n/a',
        personaStyleSummary: resolvedSpeechEvidence?.personaStyleSummary ?? 'n/a',
        timingSummary: resolvedSpeechEvidence?.timingSummary ?? 'n/a',
        driverExecutionSummary: resolvedSpeechEvidence?.driverExecutionSummary ?? 'n/a',
        traceEmbodimentSummary: traceEmbodimentSummary ?? 'n/a',
        visemeHintsSummary: resolvedSpeechEvidence?.visemeHintsSummary ?? 'n/a',
        settleAuthoritySummary: speech?.settleAuthoritySummary ?? 'n/a',
        authorityTrustSummary,
        authoritySegmentMatched: speech?.authoritySegmentMatched ?? null,
        authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
        authorityMatchedSources,
        authorityMismatchSummary,
        authorityMismatchReasonSummary,
        authorityMismatchDisplay,
        embodimentClosureStage: resolvedEmbodimentClosureStage,
        rendererDriftSummary: speech?.rendererDriftSummary ?? null,
        speechSummaryLines,
      }

      if (!resolvedSpeechEvidence)
        return authorityTableRow

      return Object.defineProperty(authorityTableRow, 'speechEvidence', {
        value: resolvedSpeechEvidence,
        enumerable: false,
        configurable: true,
        writable: true,
      })
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
      const hasTrust = hasValue(resolveAuthorityTableTrustSummary(row))
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
