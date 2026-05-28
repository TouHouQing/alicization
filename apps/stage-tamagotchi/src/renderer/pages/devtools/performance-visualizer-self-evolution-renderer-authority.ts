import type { SelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence'
import type { PerformanceVisualizerLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'
import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'

import {
  buildAuthorityMismatchReasonSummary,
  buildAuthorityMismatchSummary,
} from './performance-visualizer-authority-mismatch-filter'
import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'
import {
  formatDriverExecutionSummary,
  resolvePrimaryRendererAlignmentSummary,
} from './performance-visualizer-speech-observability'

export interface SelfEvolutionRendererAuthorityProjection {
  status: 'grounded' | 'partial' | 'missing'
  rendererTarget: 'live2d' | 'vrm' | null
  runtimeProfile: string | null
  runtimeBodyState: string | null
  runtimeContinuityMode: string | null
  runtimeResidentEmotion: string | null
  runtimeResidentDelivery: string | null
  runtimeResidentFacialCue: string | null
  runtimeResidentActionCue: string | null
  playbackCueFacialCue: string | null
  playbackCueActionCue: string | null
  driverFaceCue: string | null
  driverActionCue: string | null
  authorityMatchSummary: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchDisplay?: string | null
  prosodyAuthoritySummary?: string | null
  matchedSignals: string[]
  missingSignals: string[]
  driftingSignals: string[]
  reasons: string[]
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function pushUnique(values: Array<string | null | undefined>) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
  }
  return result
}

function summarizeProsodyAuthority(value: string | null | undefined) {
  const normalized = normalizeText(value)
  if (!normalized)
    return null

  let mode: string | null = null
  let segment: string | null = null

  for (const part of normalized.split('|').map(part => part.trim()).filter(Boolean)) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0)
      continue
    const key = part.slice(0, separatorIndex).trim()
    const rawValue = part.slice(separatorIndex + 1).trim()
    if (key === 'mode')
      mode = rawValue
    else if (key === 'segment')
      segment = rawValue
  }

  if (!mode && !segment)
    return null

  return `Prosody authority still anchors ${mode ?? 'n/a'} on ${segment ?? 'n/a'}, so the mouth-driving chain remains attributable to one authoritative speech segment instead of a renderer-local guess.`
}

function resolveRendererDriftSummary(
  speech: StageThreeRuntimeSpeechEmbodimentDiagnostics | null | undefined,
) {
  const upstreamSummary = normalizeText(speech?.rendererDriftSummary?.primary)
    ?? normalizeText(speech?.rendererDriftSummary?.live2d)
    ?? normalizeText(speech?.rendererDriftSummary?.vrm)

  if (upstreamSummary)
    return upstreamSummary

  return resolvePrimaryRendererAlignmentSummary(speech?.rendererAlignment)
}

export function buildSelfEvolutionRendererAuthorityProjection(input: {
  embodimentOutputProjection?: SelfEvolutionEvidencePanelInput['embodimentOutputProjection']
  speechEmbodiment?: StageThreeRuntimeSpeechEmbodimentDiagnostics | null
  live2dAuthorityView?: PerformanceVisualizerLive2DAuthorityComparisonView | null
  vrmAuthorityView?: PerformanceVisualizerVrmAuthorityComparisonView | null
  playbackCueAuthorityView?: PerformanceVisualizerPlaybackCueAuthorityView | null
}): SelfEvolutionRendererAuthorityProjection | null {
  const embodiment = input.embodimentOutputProjection
  const speech = input.speechEmbodiment
  const runtimeDynamics = speech?.runtimeDynamics ?? null
  const playbackCue = speech?.playbackTelemetry?.cue ?? null
  const driverFaceCue = speech?.playbackTelemetry?.drivers?.face?.facialCue ?? speech?.driverSummary?.face?.cue ?? null
  const driverActionCue = speech?.playbackTelemetry?.drivers?.motion?.actionCue ?? speech?.driverSummary?.motion?.cue ?? null
  const rendererTarget = input.playbackCueAuthorityView?.authorityRendererTarget
    ?? speech?.playbackTelemetry?.rendererTarget
    ?? speech?.driverSummary?.rendererTarget
    ?? null

  const hasSignal = Boolean(
    embodiment
    || runtimeDynamics
    || playbackCue
    || driverFaceCue
    || driverActionCue
    || input.live2dAuthorityView
    || input.vrmAuthorityView
    || input.playbackCueAuthorityView,
  )

  if (!hasSignal)
    return null

  const runtimeBodyState = normalizeText(runtimeDynamics?.provenance?.bodyState)
  const runtimeContinuityMode = normalizeText(runtimeDynamics?.provenance?.continuityMode)
  const runtimeResidentEmotion = normalizeText(runtimeDynamics?.residentEmotion)
  const runtimeResidentDelivery = normalizeText(runtimeDynamics?.residentDelivery)
  const runtimeResidentFacialCue = normalizeText(runtimeDynamics?.residentFacialCue)
  const runtimeResidentActionCue = normalizeText(runtimeDynamics?.residentActionCue)
  const playbackCueFacialCue = normalizeText(playbackCue?.facialCue)
  const playbackCueActionCue = normalizeText(playbackCue?.actionCue)
  const authoritySummaryCueId = normalizeText(speech?.authoritySummary?.cueId)
  const playbackCueAuthorityCueId = normalizeText(input.playbackCueAuthorityView?.cueId)
  const authoritySummaryMatchesPlaybackCue = !authoritySummaryCueId || !playbackCueAuthorityCueId || authoritySummaryCueId === playbackCueAuthorityCueId
  const authorityMatchSummary = normalizeText(input.playbackCueAuthorityView?.authorityMatchSummary)
    ?? (authoritySummaryMatchesPlaybackCue ? normalizeText(speech?.authoritySummary?.matchSummary) : null)
  const authority = input.playbackCueAuthorityView
    ? {
        faceSegmentMatched: input.playbackCueAuthorityView.faceSegmentMatched,
        motionSegmentMatched: input.playbackCueAuthorityView.motionSegmentMatched,
        lipsyncSegmentMatched: input.playbackCueAuthorityView.lipsyncSegmentMatched,
      }
    : speech?.playbackTelemetry?.driverAuthority
      ? {
          faceSegmentMatched: speech.playbackTelemetry.driverAuthority.faceSegmentMatched,
          motionSegmentMatched: speech.playbackTelemetry.driverAuthority.motionSegmentMatched,
          lipsyncSegmentMatched: speech.playbackTelemetry.driverAuthority.lipsyncSegmentMatched,
        }
      : null
  const authorityMismatchTechnicalSummary = (authoritySummaryMatchesPlaybackCue ? speech?.authoritySummary?.authorityMismatchSummary : null)
    ?? buildAuthorityMismatchSummary(authority)
  const fallbackDriverExecutionSummary = formatDriverExecutionSummary(
    speech?.playbackTelemetry?.drivers
      ? {
          face: speech.playbackTelemetry.drivers.face
            ? {
                segmentId: normalizeText(speech.playbackTelemetry.drivers.face.segmentId),
                emotion: normalizeText(speech.playbackTelemetry.drivers.face.emotion),
                facialCue: normalizeText(speech.playbackTelemetry.drivers.face.facialCue),
                intensity: speech.playbackTelemetry.drivers.face.intensity ?? null,
                holdMs: speech.playbackTelemetry.drivers.face.holdMs ?? null,
                source: normalizeText(speech.playbackTelemetry.drivers.face.source),
                confidence: speech.playbackTelemetry.drivers.face.confidence ?? null,
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
                intensity: speech.playbackTelemetry.drivers.motion.intensity ?? null,
                holdMs: speech.playbackTelemetry.drivers.motion.holdMs ?? null,
                source: normalizeText(speech.playbackTelemetry.drivers.motion.source),
                confidence: speech.playbackTelemetry.drivers.motion.confidence ?? null,
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
      : null,
    input.playbackCueAuthorityView?.cueId ?? normalizeText(playbackCue?.id) ?? normalizeText(speech?.authoritySummary?.cueId),
  )
  const authorityMismatchReasonSummary = (authoritySummaryMatchesPlaybackCue ? speech?.authoritySummary?.authorityMismatchReasonSummary : null)
    ?? buildAuthorityMismatchReasonSummary({
      authority,
      matchedSources: input.playbackCueAuthorityView?.authoritySources
        ?? speech?.authoritySummary?.matchedSources
        ?? speech?.playbackTelemetry?.driverAuthority?.sources,
      driverExecutionSummary: normalizeText(speech?.driverExecutionSummary) ?? fallbackDriverExecutionSummary,
      finalSurfacePolicy: speech?.recentDrivingTraceRecord?.finalSurfacePolicy ?? null,
    })
  const upstreamAuthorityMismatchDisplay = authoritySummaryMatchesPlaybackCue
    ? normalizeText(speech?.authoritySummary?.authorityMismatchDisplay)
    : null
  const authorityMismatchDisplay = upstreamAuthorityMismatchDisplay
    ?? resolveAuthorityMismatchDisplay({
      authorityMismatchSummary: authorityMismatchTechnicalSummary,
      authorityMismatchReasonSummary,
    })
  const rendererDriftSummary = resolveRendererDriftSummary(speech)
  const prosodyAuthoritySummary = normalizeText(speech?.speechEvidence?.prosodyAuthoritySummary)
    ?? normalizeText((speech as { playbackTelemetry?: { prosodyAuthority?: { summary?: string | null } | null } | null } | null | undefined)?.playbackTelemetry?.prosodyAuthority?.summary)
  const prosodyAuthorityReason = summarizeProsodyAuthority(prosodyAuthoritySummary)

  const matchedSignals = pushUnique([
    rendererTarget ? `renderer-target:${rendererTarget}` : null,
    embodiment?.projectedBodyState && runtimeBodyState === embodiment.projectedBodyState ? `runtime-body:${runtimeBodyState}` : null,
    embodiment?.projectedContinuityMode && runtimeContinuityMode === embodiment.projectedContinuityMode ? `runtime-continuity:${runtimeContinuityMode}` : null,
    embodiment?.projectedBaseEmotion && runtimeResidentEmotion === embodiment.projectedBaseEmotion ? `runtime-emotion:${runtimeResidentEmotion}` : null,
    embodiment?.projectedDelivery && runtimeResidentDelivery === embodiment.projectedDelivery ? `runtime-delivery:${runtimeResidentDelivery}` : null,
    embodiment?.projectedFacialCue && runtimeResidentFacialCue === embodiment.projectedFacialCue ? `runtime-facialCue:${runtimeResidentFacialCue}` : null,
    embodiment?.projectedActionCue && runtimeResidentActionCue === embodiment.projectedActionCue ? `runtime-actionCue:${runtimeResidentActionCue}` : null,
    embodiment?.projectedFacialCue && playbackCueFacialCue === embodiment.projectedFacialCue ? `playback-facialCue:${playbackCueFacialCue}` : null,
    embodiment?.projectedActionCue && playbackCueActionCue === embodiment.projectedActionCue ? `playback-actionCue:${playbackCueActionCue}` : null,
    embodiment?.projectedFacialCue && normalizeText(driverFaceCue) === embodiment.projectedFacialCue ? `driver-faceCue:${normalizeText(driverFaceCue)}` : null,
    embodiment?.projectedActionCue && normalizeText(driverActionCue) === embodiment.projectedActionCue ? `driver-actionCue:${normalizeText(driverActionCue)}` : null,
    input.playbackCueAuthorityView?.faceSegmentMatched ? 'authority-face:yes' : null,
    input.playbackCueAuthorityView?.motionSegmentMatched ? 'authority-motion:yes' : null,
    input.playbackCueAuthorityView?.lipsyncSegmentMatched ? 'authority-lipsync:yes' : null,
  ])

  const missingSignals = pushUnique([
    embodiment?.projectedBodyState && !runtimeBodyState ? 'runtime-body' : null,
    embodiment?.projectedContinuityMode && !runtimeContinuityMode ? 'runtime-continuity' : null,
    embodiment?.projectedBaseEmotion && !runtimeResidentEmotion ? 'runtime-emotion' : null,
    embodiment?.projectedDelivery && !runtimeResidentDelivery ? 'runtime-delivery' : null,
    embodiment?.projectedFacialCue && !runtimeResidentFacialCue ? 'runtime-facialCue' : null,
    embodiment?.projectedActionCue && !runtimeResidentActionCue ? 'runtime-actionCue' : null,
    embodiment?.projectedFacialCue && !playbackCueFacialCue ? 'playback-facialCue' : null,
    embodiment?.projectedActionCue && !playbackCueActionCue ? 'playback-actionCue' : null,
    embodiment?.projectedFacialCue && !normalizeText(driverFaceCue) ? 'driver-faceCue' : null,
    embodiment?.projectedActionCue && !normalizeText(driverActionCue) ? 'driver-actionCue' : null,
    !authorityMatchSummary ? 'authority-match-summary' : null,
  ])

  const driftingSignals = pushUnique([
    embodiment?.projectedBodyState && runtimeBodyState && runtimeBodyState !== embodiment.projectedBodyState ? `runtime-body:${runtimeBodyState}` : null,
    embodiment?.projectedContinuityMode && runtimeContinuityMode && runtimeContinuityMode !== embodiment.projectedContinuityMode ? `runtime-continuity:${runtimeContinuityMode}` : null,
    embodiment?.projectedBaseEmotion && runtimeResidentEmotion && runtimeResidentEmotion !== embodiment.projectedBaseEmotion ? `runtime-emotion:${runtimeResidentEmotion}` : null,
    embodiment?.projectedDelivery && runtimeResidentDelivery && runtimeResidentDelivery !== embodiment.projectedDelivery ? `runtime-delivery:${runtimeResidentDelivery}` : null,
    embodiment?.projectedFacialCue && runtimeResidentFacialCue && runtimeResidentFacialCue !== embodiment.projectedFacialCue ? `runtime-facialCue:${runtimeResidentFacialCue}` : null,
    embodiment?.projectedActionCue && runtimeResidentActionCue && runtimeResidentActionCue !== embodiment.projectedActionCue ? `runtime-actionCue:${runtimeResidentActionCue}` : null,
    embodiment?.projectedFacialCue && playbackCueFacialCue && playbackCueFacialCue !== embodiment.projectedFacialCue ? `playback-facialCue:${playbackCueFacialCue}` : null,
    embodiment?.projectedActionCue && playbackCueActionCue && playbackCueActionCue !== embodiment.projectedActionCue ? `playback-actionCue:${playbackCueActionCue}` : null,
    embodiment?.projectedFacialCue && normalizeText(driverFaceCue) && normalizeText(driverFaceCue) !== embodiment.projectedFacialCue ? `driver-faceCue:${normalizeText(driverFaceCue)}` : null,
    embodiment?.projectedActionCue && normalizeText(driverActionCue) && normalizeText(driverActionCue) !== embodiment.projectedActionCue ? `driver-actionCue:${normalizeText(driverActionCue)}` : null,
    input.playbackCueAuthorityView?.faceSegmentMatched === false ? 'authority-face:no' : null,
    input.playbackCueAuthorityView?.motionSegmentMatched === false ? 'authority-motion:no' : null,
    input.playbackCueAuthorityView?.lipsyncSegmentMatched === false ? 'authority-lipsync:no' : null,
    rendererDriftSummary ? `renderer-drift:${rendererDriftSummary}` : null,
    authorityMismatchDisplay ? `authority-mismatch:${authorityMismatchDisplay}` : null,
  ])

  return {
    status: missingSignals.length === 0 && driftingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
    rendererTarget,
    runtimeProfile: normalizeText(runtimeDynamics?.profile),
    runtimeBodyState,
    runtimeContinuityMode,
    runtimeResidentEmotion,
    runtimeResidentDelivery,
    runtimeResidentFacialCue,
    runtimeResidentActionCue,
    playbackCueFacialCue,
    playbackCueActionCue,
    driverFaceCue: normalizeText(driverFaceCue),
    driverActionCue: normalizeText(driverActionCue),
    authorityMatchSummary,
    authorityMismatchSummary: authorityMismatchTechnicalSummary,
    authorityMismatchDisplay,
    prosodyAuthoritySummary,
    matchedSignals,
    missingSignals,
    driftingSignals,
    reasons: pushUnique([
      runtimeResidentFacialCue || runtimeResidentActionCue || runtimeResidentEmotion || runtimeResidentDelivery
        ? `Runtime dynamics still publish ${runtimeResidentFacialCue ?? 'n/a'}/${runtimeResidentActionCue ?? 'n/a'} with ${runtimeResidentEmotion ?? 'n/a'}/${runtimeResidentDelivery ?? 'n/a'} output, so the renderer runtime is carrying the same embodiment projection rather than inventing a separate shell state.`
        : null,
      (playbackCueFacialCue || playbackCueActionCue || normalizeText(driverFaceCue) || normalizeText(driverActionCue))
        ? `Playback cue and driver execution both still consume ${playbackCueFacialCue ?? normalizeText(driverFaceCue) ?? 'n/a'} and ${playbackCueActionCue ?? normalizeText(driverActionCue) ?? 'n/a'}, so the visible face and action are the same ones projected by the resident line.`
        : null,
      embodiment
        ? 'Resident projection is still carrying one continuous manifestation line into renderer authority, so the visible embodiment remains downstream of persona-guided private thought rather than a detached renderer-only posture.'
        : null,
      authorityMatchSummary && rendererTarget
        ? `Authority matching remains ${authorityMatchSummary} on ${rendererTarget}, which shows the bound renderer segment is the one the desktop runtime actually executed.`
        : null,
      prosodyAuthorityReason,
      rendererDriftSummary
        ? `Renderer drift still shows ${rendererDriftSummary}, so the visible face is diverging after mind-to-render projection rather than before it.`
        : null,
      authorityMismatchDisplay,
    ]),
  }
}
