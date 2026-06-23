import type { StageEmbodimentSpeechVisemeWeights } from '@proj-alicization/stage-shared'

import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerRendererTarget } from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import { resolveAuthorityLaneTruth } from './performance-visualizer-authority-lane-truth'
import {
  formatDriverAuthorityBindingSummary,
  formatDriverAuthorityMatchSummary,

} from './performance-visualizer-driver-authority'
import {
  buildPlaybackCueAuthorityView,

} from './performance-visualizer-playback-cue'
import { resolveProsodyAuthorityFromSources } from './performance-visualizer-prosody-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'

interface SpeechObservabilityVisemeWeight {
  viseme: string
  weight: number
}

export interface SpeechObservabilityView {
  articulation: {
    active: boolean
    voiceLanguage: string | null
    closureBias: number | null
    consonantPrecision: number | null
    vowelLegato: number | null
    lipClosure: number | null
    lipRound: number | null
    lipSpread: number | null
    jawOpen: number | null
    openness: number | null
    topVisemes: SpeechObservabilityVisemeWeight[]
  } | null
  articulationSummary: {
    voice: string | null
    topVisemes: string | null
  } | null
  speechEvidence?: {
    voiceSummary: string | null
    bodyContinuitySummary?: string | null
    prosodyAuthoritySummary: string | null
    authorityMatchSummary: string | null
    topVisemeSummary: string | null
    cueSummary: string | null
    cueIdentityPresent: boolean
    cueProsodyPresent: boolean
    personaStyleSummary: string | null
    timingSummary: string | null
    driverExecutionSummary: string | null
    visemeHintsSummary: string | null
  } | null
  authorityBinding: {
    segmentId: string | null
    rendererTarget: PerformanceVisualizerRendererTarget
    matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
    matchedSources: string[]
    bodySegmentMatched?: boolean | null
    faceSegmentMatched: boolean | null
    motionSegmentMatched: boolean | null
    lipsyncSegmentMatched: boolean | null
    voiceSegmentMatched?: boolean | null
  } | null
  playbackTelemetry?: {
    rendererTarget?: PerformanceVisualizerRendererTarget
    driverAuthority?: {
      segmentId: string | null
      rendererTarget: PerformanceVisualizerRendererTarget
      matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
      matchedSources?: string[]
      sources?: string[]
      bodySegmentMatched?: boolean | null
      faceSegmentMatched: boolean | null
      motionSegmentMatched: boolean | null
      lipsyncSegmentMatched: boolean | null
      voiceSegmentMatched?: boolean | null
      prosodyAuthority?: {
        segmentId: string | null
        provenance: 'authority-bound' | 'fallback-derived'
        source: string | null
        mode: string | null
        cueProsodyWeight: number | null
        cueMouthWeight: number | null
        cueHeadWeight: number | null
        visemePeakWeight: number | null
      } | null
    } | null
    prosodyAuthority?: {
      segmentId: string | null
      provenance: 'authority-bound' | 'fallback-derived'
      source: string | null
      mode: string | null
      cueProsodyWeight: number | null
      cueMouthWeight: number | null
      cueHeadWeight: number | null
      visemePeakWeight: number | null
    } | null
    cue?: {
      id: string | null
      text?: string | null
      emotion?: string | null
      prosodyWeight?: number | null
      mouthWeight?: number | null
      headWeight?: number | null
      personaStyleSummary?: string | null
      facialHoldMs?: number | null
      actionHoldMs?: number | null
      emotionHoldMs?: number | null
      facialCue?: string | null
      actionCue?: string | null
      actionWindow?: string | null
      interruptMode?: string | null
      settleMode?: string | null
      rendererHints?: {
        residentMode?: string | null
        preferredBlinkCadence?: string | null
        preferredExpressionAliases?: string[]
        preferredGazeMode?: string | null
        preferredMotionAliases?: string[]
        reasonTags?: string[]
        signature?: string | null
      } | null
      rendererSettle?: {
        live2dFacialReleaseMs?: number | null
        live2dMotionFollowThroughMs?: number | null
        vrmActionFadeMs?: number | null
        vrmExpressionBlendMs?: number | null
      } | null
    } | null
    drivers?: {
      body?: {
        frameMode: string | null
        stillness: number | null
        gazeStability: number | null
        breathAmplitude: number | null
        expressivity: number | null
        source: string | null
        confidence: number | null
        segmentId: string | null
      } | null
      face: {
        segmentId: string | null
        emotion: string | null
        facialCue: string | null
        intensity: number | null
        holdMs: number | null
        source: string | null
        confidence: number | null
        preUtteranceCue: string | null
        postUtteranceCue: string | null
      } | null
      motion: {
        segmentId: string | null
        idleBase: string | null
        attentionMode: string | null
        actionCue: string | null
        intensity: number | null
        holdMs: number | null
        source: string | null
        confidence: number | null
      } | null
      lipsync: {
        segmentId: string | null
        mode: string | null
        playbackPhase: string | null
        continuityHoldMs?: number | null
        visemeHints: Array<{
          segmentId: string | null
          viseme: string | null
          weight: number | null
          source: string | null
          confidence: number | null
        }>
      } | null
      voice?: {
        segmentId: string | null
        playbackPhase: string | null
        source: string | null
        provenance: 'authority-bound' | 'fallback-derived'
        mode: string | null
        cueProsodyWeight: number | null
        cueMouthWeight: number | null
        cueHeadWeight: number | null
        visemePeakWeight: number | null
        continuityHoldMs: number | null
      } | null
    } | null
  } | null
  playbackCue?: {
    authorityView: PerformanceVisualizerPlaybackCueAuthorityView | null
  } | null
  authoritySummary: {
    cueId: string | null
    segmentId: string | null
    rendererTarget?: PerformanceVisualizerRendererTarget
    matchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'> | null
    matchedSources?: string[] | null
    bindingSummary: string | null
    matchSummary: string | null
    authorityTrustSummary?: string | null
    authorityMismatchSummary?: string | null
    authorityMismatchReasonSummary?: string | null
    authorityMismatchDisplay?: string | null
    prosodyAuthoritySummary?: string | null
    settleSummary: string | null
  } | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  convergence?: {
    segmentId: string | null
    state: 'fully-reunited' | 'audible-body-carry' | 'body-carried-to-renderer-rejoin' | 'body-only-carry' | 'audible-only-carry' | 'split-authority'
    line: string
    matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
    missingDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
    summary: string
  } | null
  embodimentClosureStage?: string | null
  cueMicro: {
    cueId: string | null
    cueText: string | null
    prosodyWeight: number | null
    mouthWeight: number | null
    headWeight: number | null
    personaStyleSummary: string | null
    facialHoldMs: number | null
    actionHoldMs: number | null
    emotionHoldMs: number | null
    facialCue: string | null
    actionCue: string | null
    actionWindow: string | null
    interruptMode: string | null
    settleMode: string | null
  } | null
  cueMicroSummary: {
    cue: string | null
    personaStyle: string | null
    timing: string | null
  } | null
  driverExecution: {
    body?: {
      segmentId: string | null
      frameMode: string | null
      stillness: number | null
      gazeStability: number | null
      breathAmplitude: number | null
      expressivity: number | null
      source: string | null
      confidence: number | null
    } | null
    face: {
      segmentId: string | null
      emotion: string | null
      facialCue: string | null
      intensity: number | null
      holdMs: number | null
      source: string | null
      confidence: number | null
      preUtteranceCue: string | null
      postUtteranceCue: string | null
    } | null
    motion: {
      segmentId: string | null
      idleBase: string | null
      attentionMode: string | null
      actionCue: string | null
      intensity: number | null
      holdMs: number | null
      source: string | null
      confidence: number | null
    } | null
    lipsync: {
      segmentId: string | null
      mode: string | null
      playbackPhase: string | null
    } | null
    voice?: {
      segmentId: string | null
      playbackPhase: string | null
      source: string | null
      provenance: string | null
      mode: string | null
      cueProsodyWeight: number | null
      cueMouthWeight: number | null
      cueHeadWeight: number | null
      visemePeakWeight: number | null
      continuityHoldMs: number | null
    } | null
  } | null
  visemeHints: Array<{
    segmentId: string | null
    viseme: string | null
    weight: number | null
    source: string | null
    confidence: number | null
  }>
  visemeHintsSummary: string | null
  driverExecutionSummary: string | null
  rendererAlignmentSummary: {
    live2d: string | null
    vrm: string | null
  }
}

function normalizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Number(value)
    : null
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function normalizeUniqueTextList(values: unknown) {
  return Array.isArray(values)
    ? values
        .map(item => normalizeText(item))
        .filter((item): item is string => Boolean(item))
        .filter((item, index, items) => items.indexOf(item) === index)
    : []
}

function extractDriverExecutionSummaryDrivers(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return new Set<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>()

  return new Set(
    [...normalized.matchAll(/(?:^|\|\s*)(body|face|motion|lipsync|voice)=/g)]
      .map(match => match[1])
      .filter((driver): driver is 'body' | 'face' | 'motion' | 'lipsync' | 'voice' => (
        driver === 'body'
        || driver === 'face'
        || driver === 'motion'
        || driver === 'lipsync'
        || driver === 'voice'
      )),
  )
}

function formatNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(2)
    : 'n/a'
}

function formatInteger(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(Math.round(value))
    : 'n/a'
}

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function extractEmbodimentClosureStage(...summaries: Array<string | null | undefined>) {
  for (const summary of summaries) {
    const normalized = summary?.trim() ?? ''
    if (!normalized)
      continue
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

function resolveCueScopedSameHerSummaries(input: {
  activeSegmentId: string | null
  sameHerEvidence?: {
    live2dAuthorityView?: Pick<
      PerformanceVisualizerLive2DAuthorityComparisonView,
      'sameHerExecutionAuthoritySegmentId' | 'sameHerExecutionSummary'
    > | null
    vrmAuthorityView?: Pick<
      PerformanceVisualizerVrmAuthorityComparisonView,
      'sameHerFramePerformanceSegmentId' | 'sameHerFrameSpeechSegmentId' | 'sameHerFrameSummary'
    > | null
  }
}) {
  const live2dSameHerExecutionSummary = (() => {
    const summary = normalizeText(input.sameHerEvidence?.live2dAuthorityView?.sameHerExecutionSummary)
    if (!summary)
      return null

    const authoritySegmentId = normalizeText(input.sameHerEvidence?.live2dAuthorityView?.sameHerExecutionAuthoritySegmentId)
    if (!matchesScopedSegment(authoritySegmentId, input.activeSegmentId))
      return null
    if (!structuredSameHerSummaryMatchesScopedSegment(summary, input.activeSegmentId))
      return null

    return summary
  })()

  const vrmSameHerFrameSummary = (() => {
    const summary = normalizeText(input.sameHerEvidence?.vrmAuthorityView?.sameHerFrameSummary)
    if (!summary)
      return null

    const performanceSegmentId = normalizeText(input.sameHerEvidence?.vrmAuthorityView?.sameHerFramePerformanceSegmentId)
    const speechSegmentId = normalizeText(input.sameHerEvidence?.vrmAuthorityView?.sameHerFrameSpeechSegmentId)
    if (!matchesScopedSegment(performanceSegmentId, input.activeSegmentId))
      return null
    if (!matchesScopedSegment(speechSegmentId, input.activeSegmentId))
      return null
    if (!structuredSameHerSummaryMatchesScopedSegment(summary, input.activeSegmentId))
      return null

    return summary
  })()

  return {
    live2dSameHerExecutionSummary,
    vrmSameHerFrameSummary,
  }
}

function resolveEmbodimentClosureStageFromConvergence(
  convergence: StageThreeRuntimeSpeechEmbodimentDiagnostics['convergence'] | null | undefined,
) {
  switch (convergence?.state) {
    case 'fully-reunited':
      return 'full-driver-rejoin'
    case 'audible-body-carry':
      return 'audible-body-carry'
    case 'body-carried-to-renderer-rejoin':
      return 'body-carried-to-renderer-rejoin'
    case 'body-only-carry':
      return 'body-only-hold'
    case 'audible-only-carry':
      return 'voice-lipsync-carry'
    default:
      return null
  }
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeText(match?.[1])
}

function extractStructuredSameHerSegmentIds(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized) {
    return {
      authoritySegmentId: null,
      summarySegmentId: null,
      performanceSegmentId: null,
      speechSegmentId: null,
    }
  }

  return {
    authoritySegmentId: normalizeText(normalized.match(/(?:^|\s|\|)authority=([^|\s]+)/)?.[1]),
    summarySegmentId: normalizeText(normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)?.[1]),
    performanceSegmentId: normalizeText(normalized.match(/(?:^|\s|\|)performance=([^|\s]+)/)?.[1]),
    speechSegmentId: normalizeText(normalized.match(/(?:^|\s|\|)speech=([^|\s]+)/)?.[1]),
  }
}

function matchesScopedSegment(segmentId: string | null | undefined, activeSegmentId: string | null | undefined) {
  const normalizedSegmentId = normalizeText(segmentId)
  const normalizedActiveSegmentId = normalizeText(activeSegmentId)
  return !normalizedSegmentId || !normalizedActiveSegmentId || normalizedSegmentId === normalizedActiveSegmentId
}

function structuredSummaryMatchesScopedSegment(summary: string | null | undefined, activeSegmentId: string | null | undefined) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return matchesScopedSegment(structuredSegmentId, activeSegmentId)
}

function structuredSameHerSummaryMatchesScopedSegment(summary: string | null | undefined, activeSegmentId: string | null | undefined) {
  const segmentIds = extractStructuredSameHerSegmentIds(summary)
  return [
    segmentIds.authoritySegmentId,
    segmentIds.summarySegmentId,
    segmentIds.performanceSegmentId,
    segmentIds.speechSegmentId,
  ].every(segmentId => matchesScopedSegment(segmentId, activeSegmentId))
}

function resolveMatchedDriversFromLaneTruth(input: {
  matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
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
  ].filter((driver): driver is 'body' | 'face' | 'motion' | 'lipsync' | 'voice' => Boolean(driver))

  return resolved.length > 0 ? resolved : input.matchedDrivers
}

function resolveVoiceSegmentMatched(input: {
  explicitVoiceSegmentMatched?: boolean | null
  authoritySegmentId: string | null | undefined
  voiceSummary?: string | null | undefined
  prosodyAuthoritySummary?: string | null | undefined
  telemetryProsodySegmentId?: string | null | undefined
  matchedSources?: string[] | null | undefined
  matchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'> | null | undefined
}) {
  if (typeof input.explicitVoiceSegmentMatched === 'boolean')
    return input.explicitVoiceSegmentMatched

  const authoritySegmentId = normalizeText(input.authoritySegmentId)
  if (!authoritySegmentId)
    return null

  const voiceSegmentId = extractStructuredSegmentId(input.voiceSummary)
    ?? extractStructuredSegmentId(input.prosodyAuthoritySummary)
    ?? normalizeText(input.telemetryProsodySegmentId)
  if (voiceSegmentId)
    return voiceSegmentId === authoritySegmentId ? true : null

  const matchedDrivers = normalizeUniqueTextList(input.matchedDrivers)
  if (matchedDrivers.includes('voice'))
    return true

  const matchedSources = normalizeUniqueTextList(input.matchedSources)
  if (matchedSources.includes('voice-segment'))
    return true

  return null
}

function annotateStructuredPersonaStyleSummary(input: {
  summary: string | null | undefined
  provenance: 'authority-bound' | 'fallback-derived'
  segmentId: string | null | undefined
}) {
  const summary = normalizeText(input.summary)
  if (!summary)
    return null

  if ((!summary.includes('prosody=') && !summary.includes('beat=')) || summary.includes('provenance='))
    return summary

  return `${summary} provenance=${input.provenance} segment=${normalizeText(input.segmentId) ?? 'n/a'}`
}

function annotateStructuredVoiceSummary(input: {
  summary: string | null | undefined
  provenance: 'authority-bound' | 'fallback-derived'
  segmentId: string | null | undefined
  source: string | null | undefined
}) {
  const summary = normalizeText(input.summary)
  if (!summary)
    return null

  if (!summary.includes('closure=') || summary.includes('provenance='))
    return summary

  return `${summary} | provenance=${input.provenance} | segment=${normalizeText(input.segmentId) ?? 'n/a'} | source=${normalizeText(input.source) ?? 'n/a'}`
}

function resolveScopedSegmentId(input: {
  playbackCueId?: string | null
  authoritySegmentId?: string | null
  lipsyncSegmentId?: string | null
}) {
  return normalizeText(input.playbackCueId)
    ?? normalizeText(input.authoritySegmentId)
    ?? normalizeText(input.lipsyncSegmentId)
    ?? null
}

function buildProsodyAuthoritySummary(
  prosodyAuthority: NonNullable<NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['playbackTelemetry']>['prosodyAuthority']> | null | undefined,
) {
  if (!prosodyAuthority)
    return null

  return [
    `mode=${normalizeText(prosodyAuthority.mode) ?? 'n/a'}`,
    `prosody=${formatNumber(normalizeNumber(prosodyAuthority.cueProsodyWeight))}`,
    `mouth=${formatNumber(normalizeNumber(prosodyAuthority.cueMouthWeight))}`,
    `head=${formatNumber(normalizeNumber(prosodyAuthority.cueHeadWeight))}`,
    `visemePeak=${formatNumber(normalizeNumber(prosodyAuthority.visemePeakWeight))}`,
    `provenance=${normalizeText(prosodyAuthority.provenance) ?? 'fallback-derived'}`,
    `source=${normalizeText(prosodyAuthority.source) ?? 'n/a'}`,
    `segment=${normalizeText(prosodyAuthority.segmentId) ?? 'n/a'}`,
  ].join(' | ')
}

export function formatRendererAlignmentSummary(
  alignment: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment'] | null | undefined,
) {
  function formatEntry(entry: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment']['live2d']>) {
    const authority = [
      entry.faceDriverCue || entry.faceDriverSource
        ? `face ${entry.faceDriverCue ?? 'none'}@${entry.faceDriverSource ?? 'unknown'}`
        : null,
      entry.motionDriverCue || entry.motionDriverSource
        ? `motion ${entry.motionDriverCue ?? 'none'}@${entry.motionDriverSource ?? 'unknown'}`
        : null,
    ].filter((value): value is string => Boolean(value)).join(' | ')
    const authoritySuffix = authority ? ` | ${authority}` : ''

    if (entry.driftKind === 'alias-resolution-drift')
      return `resident ${entry.predicted ?? 'none'} -> actual ${entry.actual ?? 'none'}${authoritySuffix}`

    if (entry.driftKind === 'resident-not-yet-applied')
      return `resident ${entry.predicted ?? 'none'} is waiting for renderer application`

    if (entry.driftKind === 'runtime-only-visible') {
      const actual = entry.actual ?? 'none'
      const prefix = entry.reason === 'runtime-expression'
        ? 'runtime expression'
        : entry.reason === 'runtime-emotion'
          ? 'runtime emotion'
          : entry.reason === 'runtime-facial-cue'
            ? 'runtime facial cue'
            : 'runtime'

      return `${prefix} surfaced ${actual} before resident prediction${authoritySuffix}`
    }

    return null
  }

  return {
    live2d: alignment?.live2d ? formatEntry(alignment.live2d) : null,
    vrm: alignment?.vrm ? formatEntry(alignment.vrm) : null,
  }
}

function resolveRendererAlignmentSummary(
  speech: StageThreeRuntimeSpeechEmbodimentDiagnostics | null | undefined,
) {
  const upstreamSummary = speech?.rendererDriftSummary
  if (upstreamSummary) {
    return {
      live2d: normalizeText(upstreamSummary.live2d),
      vrm: normalizeText(upstreamSummary.vrm),
    }
  }

  return formatRendererAlignmentSummary(speech?.rendererAlignment)
}

export function resolvePrimaryRendererAlignmentSummary(
  alignment: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment'] | null | undefined,
) {
  const summary = formatRendererAlignmentSummary(alignment)
  return summary.live2d ?? summary.vrm ?? null
}

function buildTopVisemes(
  visemes: StageEmbodimentSpeechVisemeWeights | null | undefined,
): SpeechObservabilityVisemeWeight[] {
  if (!visemes)
    return []

  return Object.entries(visemes)
    .map(([viseme, weight]) => ({
      viseme,
      weight: Number(weight),
    }))
    .filter(item => Number.isFinite(item.weight) && item.weight > 0)
    .sort((left, right) => right.weight - left.weight || left.viseme.localeCompare(right.viseme))
    .slice(0, 3)
    .map(item => ({
      viseme: item.viseme,
      weight: Number(item.weight.toFixed(2)),
    }))
}

export function buildSpeechObservabilityView(
  speech: StageThreeRuntimeSpeechEmbodimentDiagnostics | null | undefined,
  sameHerEvidence?: {
    live2dAuthorityView?: Pick<
      PerformanceVisualizerLive2DAuthorityComparisonView,
      'sameHerExecutionAuthoritySegmentId' | 'sameHerExecutionSummary'
    > | null
    vrmAuthorityView?: Pick<
      PerformanceVisualizerVrmAuthorityComparisonView,
      'sameHerFramePerformanceSegmentId' | 'sameHerFrameSpeechSegmentId' | 'sameHerFrameSummary'
    > | null
  },
): SpeechObservabilityView {
  const articulation = speech?.articulation
    ? {
        active: speech.articulation.active,
        voiceLanguage: normalizeText(speech.articulation.voice?.language),
        closureBias: normalizeNumber(speech.articulation.voice?.closureBias),
        consonantPrecision: normalizeNumber(speech.articulation.voice?.consonantPrecision),
        vowelLegato: normalizeNumber(speech.articulation.voice?.vowelLegato),
        lipClosure: normalizeNumber(speech.articulation.lipClosure),
        lipRound: normalizeNumber(speech.articulation.lipRound),
        lipSpread: normalizeNumber(speech.articulation.lipSpread),
        jawOpen: normalizeNumber(speech.articulation.jawOpen),
        openness: normalizeNumber(speech.articulation.openness),
        topVisemes: buildTopVisemes(speech.articulation.visemes),
      }
    : null
  const resolvedProsodyAuthority = resolveProsodyAuthorityFromSources(speech?.playbackTelemetry ?? null)
  const authorityBinding = speech?.playbackTelemetry?.driverAuthority
    ? {
        segmentId: normalizeText(speech.playbackTelemetry.driverAuthority.segmentId)
          ?? normalizeText(resolvedProsodyAuthority?.segmentId),
        rendererTarget: speech.playbackTelemetry.driverAuthority.rendererTarget ?? null,
        matchedDrivers: normalizeUniqueTextList(speech.playbackTelemetry.driverAuthority.matchedDrivers).filter((driver): driver is 'body' | 'face' | 'motion' | 'lipsync' | 'voice' =>
          driver === 'body' || driver === 'face' || driver === 'motion' || driver === 'lipsync' || driver === 'voice',
        ),
        matchedSources: normalizeUniqueTextList(speech.playbackTelemetry.driverAuthority.sources),
        bodySegmentMatched: speech.playbackTelemetry.driverAuthority.bodySegmentMatched ?? null,
        faceSegmentMatched: speech.playbackTelemetry.driverAuthority.faceSegmentMatched,
        motionSegmentMatched: speech.playbackTelemetry.driverAuthority.motionSegmentMatched,
        lipsyncSegmentMatched: speech.playbackTelemetry.driverAuthority.lipsyncSegmentMatched,
        ...(speech.playbackTelemetry.driverAuthority.voiceSegmentMatched != null
          ? { voiceSegmentMatched: speech.playbackTelemetry.driverAuthority.voiceSegmentMatched }
          : {}),
      }
    : null
  const articulationSummary = articulation
    ? {
        voice: annotateStructuredVoiceSummary({
          summary: `${articulation.voiceLanguage ?? 'n/a'} | closure=${formatNumber(articulation.closureBias)} | precision=${formatNumber(articulation.consonantPrecision)}`,
          provenance: authorityBinding ? 'authority-bound' : 'fallback-derived',
          segmentId: speech?.playbackTelemetry?.driverAuthority?.segmentId
            ?? resolvedProsodyAuthority?.segmentId
            ?? speech?.playbackTelemetry?.drivers?.voice?.segmentId
            ?? speech?.playbackTelemetry?.drivers?.lipsync?.segmentId
            ?? speech?.playbackTelemetry?.drivers?.face?.segmentId
            ?? speech?.playbackTelemetry?.drivers?.motion?.segmentId
            ?? null,
          source: speech?.playbackTelemetry?.drivers?.voice?.source
            ?? speech?.playbackTelemetry?.drivers?.lipsync?.visemeHints?.[0]?.source
            ?? speech?.playbackTelemetry?.drivers?.face?.source
            ?? speech?.playbackTelemetry?.drivers?.motion?.source
            ?? null,
        }),
        topVisemes: articulation.topVisemes.map(item => `${item.viseme}:${formatNumber(item.weight)}`).join(', ') || 'n/a',
      }
    : null
  const prosodyAuthoritySummary = buildProsodyAuthoritySummary(
    resolvedProsodyAuthority,
  )
  const rawVoiceAuthoritySummary = normalizeText(speech?.speechEvidence?.voiceSummary)
    ?? normalizeText(speech?.articulationSummary?.voice)
    ?? articulationSummary?.voice
    ?? (authorityBinding?.matchedSources.includes('prosody-authority') ? prosodyAuthoritySummary : null)
  const playbackCueId = normalizeText(speech?.playbackTelemetry?.cue?.id)
  const authoritySummaryCueId = normalizeText(speech?.authoritySummary?.cueId)
  const activePlaybackSegmentId = normalizeText(speech?.playbackTelemetry?.driverAuthority?.segmentId)
    ?? playbackCueId
    ?? normalizeText(resolvedProsodyAuthority?.segmentId)
    ?? null
  const rawConvergenceSegmentId = normalizeText(speech?.convergence?.segmentId)
  const convergenceMatchesPlaybackSegment = matchesScopedSegment(rawConvergenceSegmentId, activePlaybackSegmentId)
  const convergence = speech?.convergence && convergenceMatchesPlaybackSegment
    ? {
        segmentId: rawConvergenceSegmentId,
        state: speech.convergence.state,
        line: speech.convergence.line,
        matchedDrivers: [...speech.convergence.matchedDrivers],
        missingDrivers: [...speech.convergence.missingDrivers],
        summary: speech.convergence.summary,
      }
    : null
  const authoritySummarySegmentId = normalizeText(speech?.authoritySummary?.segmentId)
  const authoritySummaryMatchesPlaybackCue = !authoritySummaryCueId || !playbackCueId || authoritySummaryCueId === playbackCueId
  const authoritySummaryMatchesPlaybackSegment = matchesScopedSegment(authoritySummarySegmentId, activePlaybackSegmentId)
  const authoritySummaryMatchesPlaybackScope = authoritySummaryMatchesPlaybackCue && authoritySummaryMatchesPlaybackSegment
  const authoritySummaryTrustSummary = authoritySummaryMatchesPlaybackScope && structuredSummaryMatchesScopedSegment(
    speech?.authoritySummary?.authorityTrustSummary,
    activePlaybackSegmentId,
  )
    ? normalizeText(speech?.authoritySummary?.authorityTrustSummary)
    : null
  const authoritySummarySettleSummary = authoritySummaryMatchesPlaybackScope && structuredSummaryMatchesScopedSegment(
    speech?.authoritySummary?.settleSummary,
    activePlaybackSegmentId,
  )
    ? normalizeText(speech?.authoritySummary?.settleSummary)
    : null
  const authoritySummaryBindingSummary = authoritySummaryMatchesPlaybackScope
    ? normalizeText(speech?.authoritySummary?.bindingSummary)
    : null
  const authoritySummaryMatchSummary = authoritySummaryMatchesPlaybackScope
    ? normalizeText(speech?.authoritySummary?.matchSummary)
    : null
  const authoritySummaryMatchedDrivers = authoritySummaryMatchesPlaybackScope
    ? normalizeUniqueTextList(speech?.authoritySummary?.matchedDrivers).filter((driver): driver is 'body' | 'face' | 'motion' | 'lipsync' | 'voice' =>
        driver === 'body' || driver === 'face' || driver === 'motion' || driver === 'lipsync' || driver === 'voice',
      )
    : []
  const authoritySummaryMatchedSources = authoritySummaryMatchesPlaybackScope
    ? normalizeUniqueTextList(speech?.authoritySummary?.matchedSources)
    : []
  const traceSummaryCueId = normalizeText(speech?.traceSummary?.cueId)
  const traceSummaryMatchesPlaybackCue = !traceSummaryCueId || !playbackCueId || traceSummaryCueId === playbackCueId
  const traceSummaryMatchedSources = traceSummaryMatchesPlaybackCue
    ? normalizeUniqueTextList(speech?.traceSummary?.segmentBinding?.matchedSources)
    : []
  const authoritySummaryMismatchSummary = authoritySummaryMatchesPlaybackScope
    ? normalizeText(speech?.authoritySummary?.authorityMismatchSummary)
    : null
  const rawVoiceSegmentMatched = resolveVoiceSegmentMatched({
    explicitVoiceSegmentMatched: speech?.playbackTelemetry?.driverAuthority?.voiceSegmentMatched ?? null,
    authoritySegmentId: authoritySummarySegmentId
      ?? authorityBinding?.segmentId
      ?? activePlaybackSegmentId,
    voiceSummary: rawVoiceAuthoritySummary,
    prosodyAuthoritySummary: normalizeText(speech?.authoritySummary?.prosodyAuthoritySummary)
      ?? prosodyAuthoritySummary,
    telemetryProsodySegmentId: normalizeText(resolvedProsodyAuthority?.segmentId),
    matchedSources: normalizeUniqueTextList([
      ...(authoritySummaryMatchedSources.length > 0 ? authoritySummaryMatchedSources : authorityBinding?.matchedSources ?? []),
      ...traceSummaryMatchedSources,
    ]),
    matchedDrivers: authoritySummaryMatchedDrivers.length > 0
      ? authoritySummaryMatchedDrivers
      : authorityBinding?.matchedDrivers ?? [],
  })
  const initialAuthorityLaneTruth = resolveAuthorityLaneTruth({
    matchSummary: authoritySummaryMatchSummary,
    matchedDrivers: authoritySummaryMatchedDrivers,
    authorityMismatchSummary: authoritySummaryMismatchSummary,
    bodySegmentMatched: speech?.playbackTelemetry?.driverAuthority?.bodySegmentMatched ?? null,
    faceSegmentMatched: speech?.playbackTelemetry?.driverAuthority?.faceSegmentMatched ?? null,
    motionSegmentMatched: speech?.playbackTelemetry?.driverAuthority?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: speech?.playbackTelemetry?.driverAuthority?.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: rawVoiceSegmentMatched,
    matchedSources: normalizeUniqueTextList([
      ...(authoritySummaryMatchedSources.length > 0 ? authoritySummaryMatchedSources : authorityBinding?.matchedSources ?? []),
      ...traceSummaryMatchedSources,
    ]),
    finalSurfacePolicy: speech?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
    authorityMismatchReasonSummary: authoritySummaryMatchesPlaybackScope
      ? normalizeText(speech?.authoritySummary?.authorityMismatchReasonSummary)
      : null,
    authorityMismatchDisplay: authoritySummaryMatchesPlaybackScope
      ? normalizeText(speech?.authoritySummary?.authorityMismatchDisplay)
      : null,
  })
  const resolvedBodySegmentMatched = initialAuthorityLaneTruth.authority.bodySegmentMatched ?? null
  const resolvedFaceSegmentMatched = initialAuthorityLaneTruth.authority.faceSegmentMatched ?? null
  const resolvedMotionSegmentMatched = initialAuthorityLaneTruth.authority.motionSegmentMatched ?? null
  const resolvedLipsyncSegmentMatched = initialAuthorityLaneTruth.authority.lipsyncSegmentMatched ?? null
  const resolvedVoiceSegmentMatched = initialAuthorityLaneTruth.authority.voiceSegmentMatched ?? rawVoiceSegmentMatched ?? null
  const effectiveAuthorityBinding = authorityBinding
    ? {
        ...authorityBinding,
        matchedDrivers: resolveMatchedDriversFromLaneTruth({
          matchedDrivers: authoritySummaryMatchedDrivers.length > 0
            ? [...authoritySummaryMatchedDrivers]
            : [...authorityBinding.matchedDrivers],
          bodySegmentMatched: resolvedBodySegmentMatched,
          faceSegmentMatched: resolvedFaceSegmentMatched,
          motionSegmentMatched: resolvedMotionSegmentMatched,
          lipsyncSegmentMatched: resolvedLipsyncSegmentMatched,
          voiceSegmentMatched: resolvedVoiceSegmentMatched,
        }),
        matchedSources: normalizeUniqueTextList([
          ...(authoritySummaryMatchedSources.length > 0 ? authoritySummaryMatchedSources : authorityBinding.matchedSources),
          ...traceSummaryMatchedSources,
        ]),
        bodySegmentMatched: resolvedBodySegmentMatched,
        faceSegmentMatched: resolvedFaceSegmentMatched,
        motionSegmentMatched: resolvedMotionSegmentMatched,
        lipsyncSegmentMatched: resolvedLipsyncSegmentMatched,
        ...(resolvedVoiceSegmentMatched != null ? { voiceSegmentMatched: resolvedVoiceSegmentMatched } : {}),
      }
    : null
  const authoritySummaryTrustDisplay = authoritySummaryMatchesPlaybackScope && speech?.authoritySummary
    ? resolveAuthorityTrustSummaryWithFallback({
        authorityTrustSummary: authoritySummaryTrustSummary,
        authorityBindingSummary: authoritySummaryBindingSummary,
        settleAuthoritySummary: authoritySummarySettleSummary,
        rendererTarget: speech.authoritySummary?.rendererTarget
          ?? effectiveAuthorityBinding?.rendererTarget
          ?? null,
        preferredBlinkCadence: normalizeText(speech?.playbackTelemetry?.cue?.rendererHints?.preferredBlinkCadence),
        preferredGazeMode: normalizeText(speech?.playbackTelemetry?.cue?.rendererHints?.preferredGazeMode),
        residentMode: normalizeText(speech?.playbackTelemetry?.cue?.rendererHints?.residentMode),
        actionWindow: normalizeText(speech?.playbackTelemetry?.cue?.actionWindow),
        prosodyAuthoritySummary,
        authoritySegmentId: authoritySummarySegmentId
          ?? activePlaybackSegmentId
          ?? effectiveAuthorityBinding?.segmentId
          ?? null,
        authorityMatchedDrivers: authoritySummaryMatchedDrivers.length > 0
          ? authoritySummaryMatchedDrivers
          : effectiveAuthorityBinding?.matchedDrivers ?? [],
        bodySegmentMatched: resolvedBodySegmentMatched,
        faceSegmentMatched: resolvedFaceSegmentMatched,
        motionSegmentMatched: resolvedMotionSegmentMatched,
        lipsyncSegmentMatched: resolvedLipsyncSegmentMatched,
        voiceSegmentMatched: resolvedVoiceSegmentMatched,
      })
    : null
  const authoritySummary = speech?.authoritySummary
    ? {
        cueId: authoritySummaryCueId,
        segmentId: authoritySummarySegmentId,
        bindingSummary: authoritySummaryBindingSummary,
        matchSummary: authoritySummaryMatchSummary,
        authorityTrustSummary: authoritySummaryMatchesPlaybackScope
          ? authoritySummaryTrustDisplay
          : null,
        authorityMismatchSummary: authoritySummaryMatchesPlaybackScope ? normalizeText(speech.authoritySummary.authorityMismatchSummary) : null,
        authorityMismatchReasonSummary: authoritySummaryMatchesPlaybackScope ? normalizeText(speech.authoritySummary.authorityMismatchReasonSummary) : null,
        authorityMismatchDisplay: authoritySummaryMatchesPlaybackScope ? normalizeText(speech.authoritySummary.authorityMismatchDisplay) : null,
        settleSummary: authoritySummarySettleSummary,
      }
    : null

  const cueMicro = speech?.playbackTelemetry?.cue
    ? {
        cueId: normalizeText(speech.playbackTelemetry.cue.id),
        cueText: normalizeText(speech.playbackTelemetry.cue.text),
        prosodyWeight: normalizeNumber(speech.playbackTelemetry.cue.prosodyWeight),
        mouthWeight: normalizeNumber(speech.playbackTelemetry.cue.mouthWeight),
        headWeight: normalizeNumber(speech.playbackTelemetry.cue.headWeight),
        personaStyleSummary: normalizeText(speech.playbackTelemetry.cue.personaStyleSummary),
        facialHoldMs: normalizeNumber(speech.playbackTelemetry.cue.facialHoldMs),
        actionHoldMs: normalizeNumber(speech.playbackTelemetry.cue.actionHoldMs),
        emotionHoldMs: normalizeNumber(speech.playbackTelemetry.cue.emotionHoldMs),
        facialCue: normalizeText(speech.playbackTelemetry.cue.facialCue),
        actionCue: normalizeText(speech.playbackTelemetry.cue.actionCue),
        actionWindow: normalizeText(speech.playbackTelemetry.cue.actionWindow),
        interruptMode: normalizeText(speech.playbackTelemetry.cue.interruptMode),
        settleMode: normalizeText(speech.playbackTelemetry.cue.settleMode),
      }
    : null
  const cueMicroSummary = cueMicro
    ? {
        cue: `${cueMicro.facialCue ?? 'n/a'} / ${cueMicro.actionCue ?? 'n/a'} | prosody=${formatNumber(cueMicro.prosodyWeight)} mouth=${formatNumber(cueMicro.mouthWeight)} head=${formatNumber(cueMicro.headWeight)} provenance=${authorityBinding ? 'authority-bound' : 'fallback-derived'} segment=${cueMicro.cueId ?? authorityBinding?.segmentId ?? 'n/a'}`,
        personaStyle: annotateStructuredPersonaStyleSummary({
          summary: cueMicro.personaStyleSummary,
          provenance: authorityBinding ? 'authority-bound' : 'fallback-derived',
          segmentId: cueMicro.cueId ?? authorityBinding?.segmentId ?? 'n/a',
        }),
        timing: `facial=${formatInteger(cueMicro.facialHoldMs)} action=${formatInteger(cueMicro.actionHoldMs)} emotion=${formatInteger(cueMicro.emotionHoldMs)} | ${cueMicro.actionWindow ?? 'n/a'} | ${cueMicro.interruptMode ?? 'n/a'} | ${cueMicro.settleMode ?? 'n/a'}`,
      }
    : null

  const driverExecution = speech?.playbackTelemetry?.drivers
    ? {
        ...(speech.playbackTelemetry.drivers.body
          ? {
              body: {
                segmentId: normalizeText(speech.playbackTelemetry.drivers.body.segmentId),
                frameMode: normalizeText(speech.playbackTelemetry.drivers.body.frameMode),
                stillness: normalizeNumber(speech.playbackTelemetry.drivers.body.stillness),
                gazeStability: normalizeNumber(speech.playbackTelemetry.drivers.body.gazeStability),
                breathAmplitude: normalizeNumber(speech.playbackTelemetry.drivers.body.breathAmplitude),
                expressivity: normalizeNumber(speech.playbackTelemetry.drivers.body.expressivity),
                source: normalizeText(speech.playbackTelemetry.drivers.body.source),
                confidence: normalizeNumber(speech.playbackTelemetry.drivers.body.confidence),
              },
            }
          : {}),
        face: speech.playbackTelemetry.drivers.face
          ? {
              segmentId: normalizeText(speech.playbackTelemetry.drivers.face.segmentId),
              emotion: normalizeText(speech.playbackTelemetry.drivers.face.emotion),
              facialCue: normalizeText(speech.playbackTelemetry.drivers.face.facialCue),
              intensity: normalizeNumber(speech.playbackTelemetry.drivers.face.intensity),
              holdMs: normalizeNumber(speech.playbackTelemetry.drivers.face.holdMs),
              source: normalizeText(speech.playbackTelemetry.drivers.face.source),
              confidence: normalizeNumber(speech.playbackTelemetry.drivers.face.confidence),
              preUtteranceCue: normalizeText(speech.playbackTelemetry.drivers.face.preUtteranceCue),
              postUtteranceCue: normalizeText(speech.playbackTelemetry.drivers.face.postUtteranceCue),
            }
          : null,
        motion: speech.playbackTelemetry.drivers.motion
          ? {
              segmentId: normalizeText(speech.playbackTelemetry.drivers.motion.segmentId),
              idleBase: normalizeText(speech.playbackTelemetry.drivers.motion.idleBase),
              attentionMode: normalizeText(speech.playbackTelemetry.drivers.motion.attentionMode),
              actionCue: normalizeText(speech.playbackTelemetry.drivers.motion.actionCue),
              intensity: normalizeNumber(speech.playbackTelemetry.drivers.motion.intensity),
              holdMs: normalizeNumber(speech.playbackTelemetry.drivers.motion.holdMs),
              source: normalizeText(speech.playbackTelemetry.drivers.motion.source),
              confidence: normalizeNumber(speech.playbackTelemetry.drivers.motion.confidence),
            }
          : null,
        lipsync: speech.playbackTelemetry.drivers.lipsync
          ? {
              segmentId: normalizeText(speech.playbackTelemetry.drivers.lipsync.segmentId),
              mode: normalizeText(speech.playbackTelemetry.drivers.lipsync.mode),
              playbackPhase: normalizeText(speech.playbackTelemetry.drivers.lipsync.playbackPhase),
            }
          : null,
        ...(speech.playbackTelemetry.drivers.voice
          ? {
              voice: {
                segmentId: normalizeText(speech.playbackTelemetry.drivers.voice.segmentId),
                playbackPhase: normalizeText(speech.playbackTelemetry.drivers.voice.playbackPhase),
                source: normalizeText(speech.playbackTelemetry.drivers.voice.source),
                provenance: normalizeText(speech.playbackTelemetry.drivers.voice.provenance),
                mode: normalizeText(speech.playbackTelemetry.drivers.voice.mode),
                cueProsodyWeight: normalizeNumber(speech.playbackTelemetry.drivers.voice.cueProsodyWeight),
                cueMouthWeight: normalizeNumber(speech.playbackTelemetry.drivers.voice.cueMouthWeight),
                cueHeadWeight: normalizeNumber(speech.playbackTelemetry.drivers.voice.cueHeadWeight),
                visemePeakWeight: normalizeNumber(speech.playbackTelemetry.drivers.voice.visemePeakWeight),
                continuityHoldMs: normalizeNumber(speech.playbackTelemetry.drivers.voice.continuityHoldMs),
              },
            }
          : {}),
      }
    : null

  const scopedSegmentId = resolveScopedSegmentId({
    playbackCueId,
    authoritySegmentId: authorityBinding?.segmentId,
    lipsyncSegmentId: driverExecution?.lipsync?.segmentId,
  })
  const visemeHints = (speech?.playbackTelemetry?.drivers?.lipsync?.visemeHints ?? [])
    .filter((hint) => {
      if (!scopedSegmentId)
        return true

      return normalizeText(hint.segmentId) === scopedSegmentId
    })
    .map(hint => ({
      segmentId: normalizeText(hint.segmentId),
      viseme: normalizeText(hint.viseme),
      weight: normalizeNumber(hint.weight),
      source: normalizeText(hint.source),
      confidence: normalizeNumber(hint.confidence),
    }))
  const visemeHintsSummary = visemeHints.length > 0
    ? visemeHints.map(hint =>
        `${hint.viseme ?? 'n/a'}:${formatNumber(hint.weight)}@${formatNumber(hint.confidence)} src=${hint.source ?? 'n/a'} segment=${hint.segmentId ?? scopedSegmentId ?? 'n/a'}`,
      ).join(' | ')
    : null
  const fallbackDriverExecutionSummary = formatDriverExecutionSummary(driverExecution, authorityBinding?.segmentId ?? null)
  const normalizedUpstreamDriverExecutionSummary = normalizeText(speech?.driverExecutionSummary)
  const driverExecutionSummary = structuredSummaryMatchesScopedSegment(
    normalizedUpstreamDriverExecutionSummary,
    scopedSegmentId,
  )
    ? normalizedUpstreamDriverExecutionSummary
    : null
  const currentCueAuthorityMatchSummary = effectiveAuthorityBinding
    ? formatAuthorityMatchSummary(effectiveAuthorityBinding)
    : null
  const currentCueDriverExecutionSummary = driverExecutionSummary
    ?? fallbackDriverExecutionSummary
    ?? formatDriverExecutionSummary(driverExecution)
  const currentCueExecutionDrivers = extractDriverExecutionSummaryDrivers(currentCueDriverExecutionSummary)
  const currentCueExpectedExecutionDrivers = normalizeUniqueTextList(effectiveAuthorityBinding?.matchedDrivers).filter((driver): driver is 'body' | 'face' | 'motion' | 'lipsync' | 'voice' => (
    driver === 'body'
    || driver === 'face'
    || driver === 'motion'
    || driver === 'lipsync'
    || driver === 'voice'
  ))
  const normalizedSpeechEvidenceProsodyAuthoritySummary = normalizeText(speech?.speechEvidence?.prosodyAuthoritySummary)
  const speechEvidenceProsodyAuthoritySegmentId = extractStructuredSegmentId(normalizedSpeechEvidenceProsodyAuthoritySummary)
  const scopedProsodyAuthoritySummary = speechEvidenceProsodyAuthoritySegmentId && scopedSegmentId && speechEvidenceProsodyAuthoritySegmentId !== scopedSegmentId
    ? null
    : normalizedSpeechEvidenceProsodyAuthoritySummary
  const normalizedSpeechEvidenceBodyContinuitySummary = normalizeText(speech?.speechEvidence?.bodyContinuitySummary)
  const speechEvidenceBodyContinuitySegmentId = extractStructuredSegmentId(normalizedSpeechEvidenceBodyContinuitySummary)
  const scopedBodyContinuitySummary = speechEvidenceBodyContinuitySegmentId && scopedSegmentId && speechEvidenceBodyContinuitySegmentId !== scopedSegmentId
    ? null
    : normalizedSpeechEvidenceBodyContinuitySummary
  const normalizedSpeechEvidenceCueSummary = normalizeText(speech?.speechEvidence?.cueSummary)
  const speechEvidenceCueSummarySegmentId = extractStructuredSegmentId(normalizedSpeechEvidenceCueSummary)
  const scopedCueSummary = speechEvidenceCueSummarySegmentId && scopedSegmentId && speechEvidenceCueSummarySegmentId !== scopedSegmentId
    ? null
    : normalizedSpeechEvidenceCueSummary
  const normalizedSpeechEvidencePersonaStyleSummary = normalizeText(speech?.speechEvidence?.personaStyleSummary)
  const speechEvidencePersonaStyleSegmentId = extractStructuredSegmentId(normalizedSpeechEvidencePersonaStyleSummary)
  const scopedPersonaStyleSummary = speechEvidencePersonaStyleSegmentId && scopedSegmentId && speechEvidencePersonaStyleSegmentId !== scopedSegmentId
    ? null
    : normalizedSpeechEvidencePersonaStyleSummary
  const normalizedSpeechEvidenceVoiceSummary = normalizeText(speech?.speechEvidence?.voiceSummary)
  const speechEvidenceVoiceSummarySegmentId = extractStructuredSegmentId(normalizedSpeechEvidenceVoiceSummary)
  const scopedVoiceSummary = speechEvidenceVoiceSummarySegmentId && scopedSegmentId && speechEvidenceVoiceSummarySegmentId !== scopedSegmentId
    ? null
    : normalizedSpeechEvidenceVoiceSummary
  const normalizedSpeechEvidenceVisemeHintsSummary = normalizeText(speech?.speechEvidence?.visemeHintsSummary)
  const speechEvidenceVisemeHintsSegmentId = extractStructuredSegmentId(normalizedSpeechEvidenceVisemeHintsSummary)
  const scopedSpeechEvidenceVisemeHintsSummary = speechEvidenceVisemeHintsSegmentId && scopedSegmentId && speechEvidenceVisemeHintsSegmentId !== scopedSegmentId
    ? null
    : normalizedSpeechEvidenceVisemeHintsSummary
  const normalizedSpeechEvidenceDriverExecutionSummary = normalizeText(speech?.speechEvidence?.driverExecutionSummary)
  const scopedSpeechEvidenceDriverExecutionSummary = structuredSummaryMatchesScopedSegment(
    normalizedSpeechEvidenceDriverExecutionSummary,
    scopedSegmentId,
  )
    ? normalizedSpeechEvidenceDriverExecutionSummary
    : null
  const speechEvidenceExecutionDrivers = extractDriverExecutionSummaryDrivers(scopedSpeechEvidenceDriverExecutionSummary)
  const normalizedUpstreamVisemeHintsSummary = normalizeText(speech?.visemeHintsSummary)
  const upstreamVisemeHintsSegmentId = extractStructuredSegmentId(normalizedUpstreamVisemeHintsSummary)
  const scopedUpstreamVisemeHintsSummary = upstreamVisemeHintsSegmentId && scopedSegmentId && upstreamVisemeHintsSegmentId !== scopedSegmentId
    ? null
    : normalizedUpstreamVisemeHintsSummary
  const shouldRefreshSameCueSpeechEvidenceAuthorityMatchSummary = authoritySummaryMatchesPlaybackCue
    && Boolean(currentCueAuthorityMatchSummary)
    && normalizeText(speech?.speechEvidence?.authorityMatchSummary) !== currentCueAuthorityMatchSummary
  const shouldRefreshSameCueSpeechEvidenceFromCurrentExecution = authoritySummaryMatchesPlaybackCue
    && Boolean(currentCueDriverExecutionSummary)
    && normalizeText(speech?.speechEvidence?.driverExecutionSummary) !== currentCueDriverExecutionSummary
    && currentCueExpectedExecutionDrivers.some(driver =>
      currentCueExecutionDrivers.has(driver) && !speechEvidenceExecutionDrivers.has(driver),
    )
  const speechEvidence = speech?.speechEvidence
    ? {
        voiceSummary: scopedVoiceSummary,
        bodyContinuitySummary: scopedBodyContinuitySummary,
        prosodyAuthoritySummary: scopedProsodyAuthoritySummary,
        authorityMatchSummary: shouldRefreshSameCueSpeechEvidenceAuthorityMatchSummary
          ? currentCueAuthorityMatchSummary
          : normalizeText(speech.speechEvidence.authorityMatchSummary),
        topVisemeSummary: normalizeText(speech.speechEvidence.topVisemeSummary),
        cueSummary: scopedCueSummary,
        cueIdentityPresent: Boolean(speech.speechEvidence.cueIdentityPresent),
        cueProsodyPresent: Boolean(speech.speechEvidence.cueProsodyPresent),
        personaStyleSummary: scopedPersonaStyleSummary,
        timingSummary: normalizeText(speech.speechEvidence.timingSummary),
        driverExecutionSummary: shouldRefreshSameCueSpeechEvidenceFromCurrentExecution
          ? currentCueDriverExecutionSummary
          : scopedSpeechEvidenceDriverExecutionSummary,
        visemeHintsSummary: scopedSpeechEvidenceVisemeHintsSummary,
      }
    : speech?.articulationSummary
      || speech?.cueMicroSummary
      || speech?.visemeHintsSummary
      || driverExecutionSummary
      || prosodyAuthoritySummary
      || articulationSummary
      || cueMicroSummary
      || driverExecutionSummary
      || visemeHintsSummary
      ? {
          voiceSummary: normalizeText(speech?.articulationSummary?.voice) ?? articulationSummary?.voice ?? null,
          bodyContinuitySummary: normalizeText((speech?.speechEvidence as { bodyContinuitySummary?: string | null } | undefined)?.bodyContinuitySummary) ?? null,
          prosodyAuthoritySummary: normalizeText((speech?.speechEvidence as { prosodyAuthoritySummary?: string | null } | undefined)?.prosodyAuthoritySummary)
            ?? prosodyAuthoritySummary
            ?? null,
          authorityMatchSummary: effectiveAuthorityBinding ? formatAuthorityMatchSummary(effectiveAuthorityBinding) : null,
          topVisemeSummary: normalizeText(speech?.articulationSummary?.topVisemes) ?? articulationSummary?.topVisemes ?? null,
          cueSummary: normalizeText(speech?.cueMicroSummary?.cue) ?? cueMicroSummary?.cue ?? null,
          cueIdentityPresent: Boolean(cueMicro?.facialCue || cueMicro?.actionCue),
          cueProsodyPresent: cueMicro?.prosodyWeight != null,
          personaStyleSummary: normalizeText(speech?.cueMicroSummary?.personaStyle) ?? cueMicroSummary?.personaStyle ?? null,
          timingSummary: normalizeText(speech?.cueMicroSummary?.timing) ?? cueMicroSummary?.timing ?? null,
          driverExecutionSummary: driverExecutionSummary ?? fallbackDriverExecutionSummary ?? null,
          visemeHintsSummary: scopedUpstreamVisemeHintsSummary ?? visemeHintsSummary ?? null,
        }
      : null
  const authorityLaneTruth = effectiveAuthorityBinding
    ? resolveAuthorityLaneTruth({
        matchSummary: authoritySummaryMatchSummary,
        matchedDrivers: effectiveAuthorityBinding.matchedDrivers,
        authorityMismatchSummary: authoritySummaryMismatchSummary,
        bodySegmentMatched: effectiveAuthorityBinding.bodySegmentMatched,
        faceSegmentMatched: effectiveAuthorityBinding.faceSegmentMatched,
        motionSegmentMatched: effectiveAuthorityBinding.motionSegmentMatched,
        lipsyncSegmentMatched: effectiveAuthorityBinding.lipsyncSegmentMatched,
        voiceSegmentMatched: effectiveAuthorityBinding.voiceSegmentMatched ?? null,
        matchedSources: effectiveAuthorityBinding.matchedSources,
        driverExecutionSummary: driverExecutionSummary ?? fallbackDriverExecutionSummary,
        finalSurfacePolicy: speech?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
        authorityMismatchReasonSummary: authoritySummary?.authorityMismatchReasonSummary ?? null,
        authorityMismatchDisplay: authoritySummary?.authorityMismatchDisplay ?? null,
      })
    : null
  const authorityMismatchSummary = effectiveAuthorityBinding
    ? authorityLaneTruth?.authorityMismatchSummary ?? null
    : null
  const authorityMismatchReasonSummary = effectiveAuthorityBinding
    ? authorityLaneTruth?.authorityMismatchReasonSummary ?? null
    : null
  const authorityMismatchDisplay = effectiveAuthorityBinding
    ? authorityLaneTruth?.authorityMismatchDisplay
    ?? resolveAuthorityMismatchDisplay({
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
    })
    : null
  const {
    live2dSameHerExecutionSummary,
    vrmSameHerFrameSummary,
  } = resolveCueScopedSameHerSummaries({
    activeSegmentId: activePlaybackSegmentId,
    sameHerEvidence,
  })
  const embodimentClosureStage = resolveEmbodimentClosureStageFromConvergence(convergence)
    ?? extractEmbodimentClosureStage(
      live2dSameHerExecutionSummary,
      vrmSameHerFrameSummary,
      authoritySummaryBindingSummary,
      authoritySummarySettleSummary,
      authorityMismatchDisplay,
      authorityMismatchReasonSummary,
      speechEvidence?.driverExecutionSummary ?? null,
      speechEvidence?.bodyContinuitySummary ?? null,
    )
  const playbackCueAuthorityView = buildPlaybackCueAuthorityView({
    speech,
    live2dAuthorityView: sameHerEvidence?.live2dAuthorityView ?? null,
    vrmAuthorityView: sameHerEvidence?.vrmAuthorityView ?? null,
  })

  return {
    articulation,
    articulationSummary: speechEvidence && (
      hasText(speechEvidence.voiceSummary)
      || hasText(speechEvidence.prosodyAuthoritySummary)
      || hasText(speechEvidence.topVisemeSummary)
      || hasText(normalizeText(speech?.articulationSummary?.voice))
      || hasText(normalizeText(speech?.articulationSummary?.topVisemes))
      || hasText(articulationSummary?.voice)
      || hasText(articulationSummary?.topVisemes)
    )
      ? {
          voice: speechEvidence.voiceSummary ?? normalizeText(speech?.articulationSummary?.voice) ?? articulationSummary?.voice ?? null,
          topVisemes: speechEvidence.topVisemeSummary ?? normalizeText(speech?.articulationSummary?.topVisemes) ?? articulationSummary?.topVisemes ?? null,
        }
      : speech?.articulationSummary
        ? {
            voice: normalizeText(speech.articulationSummary.voice),
            topVisemes: normalizeText(speech.articulationSummary.topVisemes),
          }
        : articulationSummary,
    speechEvidence,
    authorityBinding: effectiveAuthorityBinding
      ? {
          ...effectiveAuthorityBinding,
          matchedSources: [...effectiveAuthorityBinding.matchedSources],
        }
      : null,
    playbackTelemetry: speech?.playbackTelemetry
      ? {
          rendererTarget: speech.playbackTelemetry.rendererTarget ?? null,
          driverAuthority: speech.playbackTelemetry.driverAuthority
            ? {
                segmentId: normalizeText(speech.playbackTelemetry.driverAuthority.segmentId),
                rendererTarget: speech.playbackTelemetry.driverAuthority.rendererTarget ?? null,
                matchedDrivers: effectiveAuthorityBinding?.matchedDrivers
                  ? [...effectiveAuthorityBinding.matchedDrivers]
                  : [...speech.playbackTelemetry.driverAuthority.matchedDrivers],
                matchedSources: effectiveAuthorityBinding?.matchedSources
                  ? [...effectiveAuthorityBinding.matchedSources]
                  : normalizeUniqueTextList(
                      speech.playbackTelemetry.driverAuthority.matchedSources
                      ?? speech.playbackTelemetry.driverAuthority.sources,
                    ),
                bodySegmentMatched: resolvedBodySegmentMatched,
                faceSegmentMatched: resolvedFaceSegmentMatched,
                motionSegmentMatched: resolvedMotionSegmentMatched,
                lipsyncSegmentMatched: resolvedLipsyncSegmentMatched,
                ...(resolvedVoiceSegmentMatched != null
                  ? { voiceSegmentMatched: resolvedVoiceSegmentMatched }
                  : {}),
                prosodyAuthority: speech.playbackTelemetry.driverAuthority.prosodyAuthority
                  ? {
                      segmentId: normalizeText(speech.playbackTelemetry.driverAuthority.prosodyAuthority.segmentId),
                      provenance: speech.playbackTelemetry.driverAuthority.prosodyAuthority.provenance,
                      source: normalizeText(speech.playbackTelemetry.driverAuthority.prosodyAuthority.source),
                      mode: normalizeText(speech.playbackTelemetry.driverAuthority.prosodyAuthority.mode),
                      cueProsodyWeight: normalizeNumber(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueProsodyWeight),
                      cueMouthWeight: normalizeNumber(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueMouthWeight),
                      cueHeadWeight: normalizeNumber(speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueHeadWeight),
                      visemePeakWeight: normalizeNumber(speech.playbackTelemetry.driverAuthority.prosodyAuthority.visemePeakWeight),
                    }
                  : null,
              }
            : null,
          prosodyAuthority: speech.playbackTelemetry.prosodyAuthority
            ? {
                segmentId: normalizeText(speech.playbackTelemetry.prosodyAuthority.segmentId),
                provenance: speech.playbackTelemetry.prosodyAuthority.provenance,
                source: normalizeText(speech.playbackTelemetry.prosodyAuthority.source),
                mode: normalizeText(speech.playbackTelemetry.prosodyAuthority.mode),
                cueProsodyWeight: normalizeNumber(speech.playbackTelemetry.prosodyAuthority.cueProsodyWeight),
                cueMouthWeight: normalizeNumber(speech.playbackTelemetry.prosodyAuthority.cueMouthWeight),
                cueHeadWeight: normalizeNumber(speech.playbackTelemetry.prosodyAuthority.cueHeadWeight),
                visemePeakWeight: normalizeNumber(speech.playbackTelemetry.prosodyAuthority.visemePeakWeight),
              }
            : null,
          cue: speech.playbackTelemetry.cue
            ? {
                id: normalizeText(speech.playbackTelemetry.cue.id),
                text: normalizeText(speech.playbackTelemetry.cue.text),
                emotion: normalizeText(speech.playbackTelemetry.cue.emotion),
                prosodyWeight: normalizeNumber(speech.playbackTelemetry.cue.prosodyWeight),
                mouthWeight: normalizeNumber(speech.playbackTelemetry.cue.mouthWeight),
                headWeight: normalizeNumber(speech.playbackTelemetry.cue.headWeight),
                personaStyleSummary: normalizeText(speech.playbackTelemetry.cue.personaStyleSummary),
                facialHoldMs: normalizeNumber(speech.playbackTelemetry.cue.facialHoldMs),
                actionHoldMs: normalizeNumber(speech.playbackTelemetry.cue.actionHoldMs),
                emotionHoldMs: normalizeNumber(speech.playbackTelemetry.cue.emotionHoldMs),
                facialCue: normalizeText(speech.playbackTelemetry.cue.facialCue),
                actionCue: normalizeText(speech.playbackTelemetry.cue.actionCue),
                actionWindow: normalizeText(speech.playbackTelemetry.cue.actionWindow),
                interruptMode: normalizeText(speech.playbackTelemetry.cue.interruptMode),
                settleMode: normalizeText(speech.playbackTelemetry.cue.settleMode),
                rendererHints: speech.playbackTelemetry.cue.rendererHints
                  ? {
                      residentMode: normalizeText(speech.playbackTelemetry.cue.rendererHints.residentMode),
                      preferredBlinkCadence: normalizeText(speech.playbackTelemetry.cue.rendererHints.preferredBlinkCadence),
                      preferredExpressionAliases: normalizeUniqueTextList(speech.playbackTelemetry.cue.rendererHints.preferredExpressionAliases),
                      preferredGazeMode: normalizeText(speech.playbackTelemetry.cue.rendererHints.preferredGazeMode),
                      preferredMotionAliases: normalizeUniqueTextList(speech.playbackTelemetry.cue.rendererHints.preferredMotionAliases),
                      reasonTags: normalizeUniqueTextList(speech.playbackTelemetry.cue.rendererHints.reasonTags),
                      signature: normalizeText(speech.playbackTelemetry.cue.rendererHints.signature),
                    }
                  : null,
                rendererSettle: speech.playbackTelemetry.cue.rendererSettle
                  ? {
                      live2dFacialReleaseMs: normalizeNumber(speech.playbackTelemetry.cue.rendererSettle.live2dFacialReleaseMs),
                      live2dMotionFollowThroughMs: normalizeNumber(speech.playbackTelemetry.cue.rendererSettle.live2dMotionFollowThroughMs),
                      vrmActionFadeMs: normalizeNumber(speech.playbackTelemetry.cue.rendererSettle.vrmActionFadeMs),
                      vrmExpressionBlendMs: normalizeNumber(speech.playbackTelemetry.cue.rendererSettle.vrmExpressionBlendMs),
                    }
                  : null,
              }
            : null,
          drivers: speech.playbackTelemetry.drivers
            ? {
                body: speech.playbackTelemetry.drivers.body
                  ? {
                      frameMode: normalizeText(speech.playbackTelemetry.drivers.body.frameMode),
                      stillness: normalizeNumber(speech.playbackTelemetry.drivers.body.stillness),
                      gazeStability: normalizeNumber(speech.playbackTelemetry.drivers.body.gazeStability),
                      breathAmplitude: normalizeNumber(speech.playbackTelemetry.drivers.body.breathAmplitude),
                      expressivity: normalizeNumber(speech.playbackTelemetry.drivers.body.expressivity),
                      source: normalizeText(speech.playbackTelemetry.drivers.body.source),
                      confidence: normalizeNumber(speech.playbackTelemetry.drivers.body.confidence),
                      segmentId: normalizeText(speech.playbackTelemetry.drivers.body.segmentId),
                    }
                  : null,
                face: driverExecution?.face
                  ? { ...driverExecution.face }
                  : null,
                motion: driverExecution?.motion
                  ? { ...driverExecution.motion }
                  : null,
                lipsync: speech.playbackTelemetry.drivers.lipsync
                  ? {
                      segmentId: driverExecution?.lipsync?.segmentId ?? null,
                      mode: driverExecution?.lipsync?.mode ?? null,
                      playbackPhase: driverExecution?.lipsync?.playbackPhase ?? null,
                      continuityHoldMs: normalizeNumber(speech.playbackTelemetry.drivers.lipsync.continuityHoldMs),
                      visemeHints: [...visemeHints],
                    }
                  : null,
                voice: speech.playbackTelemetry.drivers.voice
                  ? {
                      segmentId: driverExecution?.voice?.segmentId ?? null,
                      playbackPhase: driverExecution?.voice?.playbackPhase ?? null,
                      source: driverExecution?.voice?.source ?? null,
                      provenance: driverExecution?.voice?.provenance === 'fallback-derived'
                        ? 'fallback-derived'
                        : 'authority-bound',
                      mode: driverExecution?.voice?.mode ?? null,
                      cueProsodyWeight: driverExecution?.voice?.cueProsodyWeight ?? null,
                      cueMouthWeight: driverExecution?.voice?.cueMouthWeight ?? null,
                      cueHeadWeight: driverExecution?.voice?.cueHeadWeight ?? null,
                      visemePeakWeight: driverExecution?.voice?.visemePeakWeight ?? null,
                      continuityHoldMs: driverExecution?.voice?.continuityHoldMs ?? null,
                    }
                  : null,
              }
            : null,
        }
      : null,
    playbackCue: playbackCueAuthorityView
      ? {
          authorityView: playbackCueAuthorityView,
        }
      : null,
    authoritySummary,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
    convergence,
    embodimentClosureStage,
    cueMicro,
    cueMicroSummary: speechEvidence && (
      hasText(speechEvidence.cueSummary)
      || hasText(speechEvidence.personaStyleSummary)
      || hasText(speechEvidence.timingSummary)
      || hasText(normalizeText(speech?.cueMicroSummary?.cue))
      || hasText(normalizeText(speech?.cueMicroSummary?.personaStyle))
      || hasText(normalizeText(speech?.cueMicroSummary?.timing))
      || hasText(cueMicroSummary?.cue)
      || hasText(cueMicroSummary?.personaStyle)
      || hasText(cueMicroSummary?.timing)
    )
      ? {
          cue: speechEvidence.cueSummary ?? normalizeText(speech?.cueMicroSummary?.cue) ?? cueMicroSummary?.cue ?? null,
          personaStyle: speechEvidence.personaStyleSummary ?? normalizeText(speech?.cueMicroSummary?.personaStyle) ?? cueMicroSummary?.personaStyle ?? null,
          timing: speechEvidence.timingSummary ?? normalizeText(speech?.cueMicroSummary?.timing) ?? cueMicroSummary?.timing ?? null,
        }
      : speech?.cueMicroSummary
        ? {
            cue: normalizeText(speech.cueMicroSummary.cue),
            personaStyle: normalizeText(speech.cueMicroSummary.personaStyle),
            timing: normalizeText(speech.cueMicroSummary.timing),
          }
        : cueMicroSummary,
    driverExecution,
    visemeHints,
    visemeHintsSummary: speechEvidence?.visemeHintsSummary ?? scopedUpstreamVisemeHintsSummary ?? visemeHintsSummary,
    driverExecutionSummary: speechEvidence?.driverExecutionSummary ?? driverExecutionSummary ?? fallbackDriverExecutionSummary ?? formatDriverExecutionSummary(driverExecution),
    rendererAlignmentSummary: resolveRendererAlignmentSummary(speech),
  }
}

export function formatAuthorityBindingSummary(authority: SpeechObservabilityView['authorityBinding']) {
  return formatDriverAuthorityBindingSummary(authority)
}

export function formatAuthorityMatchSummary(authority: SpeechObservabilityView['authorityBinding']) {
  return formatDriverAuthorityMatchSummary(authority)
}

export function formatDriverExecutionSummary(
  driverExecution: SpeechObservabilityView['driverExecution'],
  cueId?: string | null,
) {
  if (!driverExecution)
    return null

  const lines: string[] = []

  if (driverExecution.body && (!cueId || driverExecution.body.segmentId === cueId)) {
    lines.push(
      `body=${driverExecution.body.frameMode ?? 'n/a'} seg=${driverExecution.body.segmentId ?? 'n/a'}`,
    )
  }

  if (driverExecution.face && (!cueId || driverExecution.face.segmentId === cueId)) {
    lines.push(
      `face=${driverExecution.face.emotion ?? 'n/a'}/${driverExecution.face.facialCue ?? 'n/a'}@${formatNumber(driverExecution.face.intensity)} hold=${formatInteger(driverExecution.face.holdMs)} pre=${driverExecution.face.preUtteranceCue ?? 'n/a'} post=${driverExecution.face.postUtteranceCue ?? 'n/a'} src=${driverExecution.face.source ?? 'n/a'} conf=${formatNumber(driverExecution.face.confidence)}`,
    )
  }

  if (driverExecution.motion && (!cueId || driverExecution.motion.segmentId === cueId)) {
    lines.push(
      `motion=${driverExecution.motion.actionCue ?? 'n/a'} mode=${driverExecution.motion.attentionMode ?? 'n/a'} idle=${driverExecution.motion.idleBase ?? 'n/a'}@${formatNumber(driverExecution.motion.intensity)} hold=${formatInteger(driverExecution.motion.holdMs)} src=${driverExecution.motion.source ?? 'n/a'} conf=${formatNumber(driverExecution.motion.confidence)}`,
    )
  }

  if (driverExecution.lipsync && (!cueId || driverExecution.lipsync.segmentId === cueId)) {
    lines.push(
      `lipsync=${driverExecution.lipsync.mode ?? 'n/a'} phase=${driverExecution.lipsync.playbackPhase ?? 'n/a'}`,
    )
  }

  if (driverExecution.voice && (!cueId || driverExecution.voice.segmentId === cueId)) {
    lines.push(
      `voice=${driverExecution.voice.provenance ?? 'n/a'} phase=${driverExecution.voice.playbackPhase ?? 'n/a'} seg=${driverExecution.voice.segmentId ?? 'n/a'}`,
    )
  }

  return lines.length > 0 ? lines.join(' | ') : null
}
