import type {
  StageEmbodimentPerformanceMatchedDriver,
  StageEmbodimentSpeechVisemeWeights,
} from '@proj-alicization/stage-shared'

import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import {
  buildAuthorityMismatchReasonSummary,
  buildAuthorityMismatchSummary,
} from './performance-visualizer-authority-mismatch-filter'
import {
  formatDriverAuthorityBindingSummary,
  formatDriverAuthorityMatchSummary,
} from './performance-visualizer-driver-authority'

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
    rendererTarget: 'live2d' | 'vrm' | null
    matchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
    matchedSources: string[]
    faceSegmentMatched: boolean | null
    motionSegmentMatched: boolean | null
    lipsyncSegmentMatched: boolean | null
  } | null
  playbackTelemetry?: {
    driverAuthority?: {
      segmentId: string | null
      rendererTarget: 'live2d' | 'vrm' | null
      matchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
      matchedSources?: string[]
      sources?: string[]
      faceSegmentMatched: boolean | null
      motionSegmentMatched: boolean | null
      lipsyncSegmentMatched: boolean | null
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
  } | null
  authoritySummary: {
    cueId: string | null
    segmentId: string | null
    bindingSummary: string | null
    matchSummary: string | null
    authorityTrustSummary?: string | null
    settleSummary: string | null
  } | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
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

export const formatProsodyAuthoritySummary = buildProsodyAuthoritySummary

export function formatRendererAlignmentSummary(
  alignment: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment'] | null | undefined,
) {
  function formatEntry(entry: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment']['live2d']>) {
    const authority = entry.driverCue || entry.driverSource
      ? ` | cue ${entry.driverCue ?? 'none'}@${entry.driverSource ?? 'unknown'}`
      : ''

    if (entry.driftKind === 'alias-resolution-drift')
      return `resident ${entry.predicted ?? 'none'} -> actual ${entry.actual ?? 'none'}${authority}`

    if (entry.driftKind === 'resident-not-yet-applied')
      return `resident ${entry.predicted ?? 'none'} is waiting for renderer application`

    if (entry.driftKind === 'runtime-only-visible')
      return `runtime surfaced ${entry.actual ?? 'none'} before resident prediction${authority}`

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
  const authorityBinding = speech?.playbackTelemetry?.driverAuthority
    ? {
        segmentId: normalizeText(speech.playbackTelemetry.driverAuthority.segmentId),
        rendererTarget: speech.playbackTelemetry.driverAuthority.rendererTarget ?? null,
        matchedDrivers: [...speech.playbackTelemetry.driverAuthority.matchedDrivers],
        matchedSources: normalizeUniqueTextList(speech.playbackTelemetry.driverAuthority.sources),
        faceSegmentMatched: speech.playbackTelemetry.driverAuthority.faceSegmentMatched,
        motionSegmentMatched: speech.playbackTelemetry.driverAuthority.motionSegmentMatched,
        lipsyncSegmentMatched: speech.playbackTelemetry.driverAuthority.lipsyncSegmentMatched,
      }
    : null
  const articulationSummary = articulation
    ? {
        voice: annotateStructuredVoiceSummary({
          summary: `${articulation.voiceLanguage ?? 'n/a'} | closure=${formatNumber(articulation.closureBias)} | precision=${formatNumber(articulation.consonantPrecision)}`,
          provenance: authorityBinding ? 'authority-bound' : 'fallback-derived',
          segmentId: speech?.playbackTelemetry?.driverAuthority?.segmentId
            ?? speech?.playbackTelemetry?.drivers?.lipsync?.segmentId
            ?? speech?.playbackTelemetry?.drivers?.face?.segmentId
            ?? speech?.playbackTelemetry?.drivers?.motion?.segmentId
            ?? null,
          source: speech?.playbackTelemetry?.drivers?.lipsync?.visemeHints?.[0]?.source
            ?? speech?.playbackTelemetry?.drivers?.face?.source
            ?? speech?.playbackTelemetry?.drivers?.motion?.source
            ?? null,
        }),
        topVisemes: articulation.topVisemes.map(item => `${item.viseme}:${formatNumber(item.weight)}`).join(', ') || 'n/a',
      }
    : null
  const resolvedProsodyAuthority = speech?.playbackTelemetry?.driverAuthority?.prosodyAuthority
    ?? speech?.playbackTelemetry?.prosodyAuthority
    ?? null
  const prosodyAuthoritySummary = buildProsodyAuthoritySummary(
    resolvedProsodyAuthority,
  )
  const playbackCueId = normalizeText(speech?.playbackTelemetry?.cue?.id)
  const authoritySummaryCueId = normalizeText(speech?.authoritySummary?.cueId)
  const authoritySummaryMatchesPlaybackCue = !authoritySummaryCueId || !playbackCueId || authoritySummaryCueId === playbackCueId
  const authoritySummary = speech?.authoritySummary
    ? {
        cueId: authoritySummaryCueId,
        segmentId: normalizeText(speech.authoritySummary.segmentId),
        bindingSummary: authoritySummaryMatchesPlaybackCue ? normalizeText(speech.authoritySummary.bindingSummary) : null,
        matchSummary: authoritySummaryMatchesPlaybackCue ? normalizeText(speech.authoritySummary.matchSummary) : null,
        ...(authoritySummaryMatchesPlaybackCue && normalizeText(speech.authoritySummary.authorityTrustSummary)
          ? { authorityTrustSummary: normalizeText(speech.authoritySummary.authorityTrustSummary) }
          : {}),
        authorityMismatchSummary: authoritySummaryMatchesPlaybackCue ? normalizeText(speech.authoritySummary.authorityMismatchSummary) : null,
        authorityMismatchReasonSummary: authoritySummaryMatchesPlaybackCue ? normalizeText(speech.authoritySummary.authorityMismatchReasonSummary) : null,
        authorityMismatchDisplay: authoritySummaryMatchesPlaybackCue ? normalizeText(speech.authoritySummary.authorityMismatchDisplay) : null,
        settleSummary: authoritySummaryMatchesPlaybackCue ? normalizeText(speech.authoritySummary.settleSummary) : null,
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
  const driverExecutionSummary = normalizeText(speech?.driverExecutionSummary)
  const speechEvidence = speech?.speechEvidence
    ? {
        voiceSummary: normalizeText(speech.speechEvidence.voiceSummary),
        prosodyAuthoritySummary: normalizeText(speech.speechEvidence.prosodyAuthoritySummary),
        authorityMatchSummary: normalizeText(speech.speechEvidence.authorityMatchSummary),
        topVisemeSummary: normalizeText(speech.speechEvidence.topVisemeSummary),
        cueSummary: normalizeText(speech.speechEvidence.cueSummary),
        cueIdentityPresent: Boolean(speech.speechEvidence.cueIdentityPresent),
        cueProsodyPresent: Boolean(speech.speechEvidence.cueProsodyPresent),
        personaStyleSummary: normalizeText(speech.speechEvidence.personaStyleSummary),
        timingSummary: normalizeText(speech.speechEvidence.timingSummary),
        driverExecutionSummary: normalizeText(speech.speechEvidence.driverExecutionSummary),
        visemeHintsSummary: normalizeText(speech.speechEvidence.visemeHintsSummary),
      }
    : speech?.articulationSummary
      || speech?.cueMicroSummary
      || speech?.visemeHintsSummary
      || speech?.driverExecutionSummary
      || prosodyAuthoritySummary
      || articulationSummary
      || cueMicroSummary
      || driverExecutionSummary
      || visemeHintsSummary
      ? {
          voiceSummary: normalizeText(speech?.articulationSummary?.voice) ?? articulationSummary?.voice ?? null,
          prosodyAuthoritySummary: normalizeText((speech?.speechEvidence as { prosodyAuthoritySummary?: string | null } | undefined)?.prosodyAuthoritySummary)
            ?? prosodyAuthoritySummary
            ?? null,
          authorityMatchSummary: authorityBinding ? formatAuthorityMatchSummary(authorityBinding) : null,
          topVisemeSummary: normalizeText(speech?.articulationSummary?.topVisemes) ?? articulationSummary?.topVisemes ?? null,
          cueSummary: normalizeText(speech?.cueMicroSummary?.cue) ?? cueMicroSummary?.cue ?? null,
          cueIdentityPresent: Boolean(cueMicro?.facialCue || cueMicro?.actionCue),
          cueProsodyPresent: cueMicro?.prosodyWeight != null,
          personaStyleSummary: normalizeText(speech?.cueMicroSummary?.personaStyle) ?? cueMicroSummary?.personaStyle ?? null,
          timingSummary: normalizeText(speech?.cueMicroSummary?.timing) ?? cueMicroSummary?.timing ?? null,
          driverExecutionSummary: normalizeText(speech?.driverExecutionSummary) ?? driverExecutionSummary ?? fallbackDriverExecutionSummary ?? null,
          visemeHintsSummary: normalizeText(speech?.visemeHintsSummary) ?? visemeHintsSummary ?? null,
        }
      : null
  const authorityMismatchSummary = authorityBinding
    ? authoritySummary?.authorityMismatchSummary
    ?? buildAuthorityMismatchSummary(authorityBinding)
    : null
  const authorityMismatchReasonSummary = authorityBinding
    ? authoritySummary?.authorityMismatchReasonSummary
    ?? buildAuthorityMismatchReasonSummary({
      authority: authorityBinding,
      matchedSources: authorityBinding.matchedSources,
      driverExecutionSummary: driverExecutionSummary ?? fallbackDriverExecutionSummary,
      finalSurfacePolicy: speech?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
    })
    : null
  const authorityMismatchDisplay = authoritySummary?.authorityMismatchDisplay
    ?? resolveAuthorityMismatchDisplay({
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
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
    authorityBinding: authorityBinding
      ? {
          ...authorityBinding,
          matchedSources: [...authorityBinding.matchedSources],
        }
      : null,
    playbackTelemetry: speech?.playbackTelemetry
      ? {
          driverAuthority: speech.playbackTelemetry.driverAuthority
            ? {
                segmentId: normalizeText(speech.playbackTelemetry.driverAuthority.segmentId),
                rendererTarget: speech.playbackTelemetry.driverAuthority.rendererTarget ?? null,
                matchedDrivers: [...speech.playbackTelemetry.driverAuthority.matchedDrivers],
                matchedSources: normalizeUniqueTextList(
                  speech.playbackTelemetry.driverAuthority.matchedSources
                  ?? speech.playbackTelemetry.driverAuthority.sources,
                ),
                faceSegmentMatched: speech.playbackTelemetry.driverAuthority.faceSegmentMatched,
                motionSegmentMatched: speech.playbackTelemetry.driverAuthority.motionSegmentMatched,
                lipsyncSegmentMatched: speech.playbackTelemetry.driverAuthority.lipsyncSegmentMatched,
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
        }
      : null,
    authoritySummary,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
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
    visemeHintsSummary: speechEvidence?.visemeHintsSummary ?? normalizeText(speech?.visemeHintsSummary) ?? visemeHintsSummary,
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

  return lines.length > 0 ? lines.join(' | ') : null
}
