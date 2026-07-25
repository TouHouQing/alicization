import type {
  StageEmbodimentPerformancePhase,
  StageEmbodimentPerformanceState,
  StageEmbodimentPresencePostureState,
  StageEmbodimentSpeechArticulationState,
  StageEmbodimentSpeechRenderPhase,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { ComputedRef, Ref } from 'vue'

import type {
  Live2DExecutionDiagnosticsSnapshot,
} from '../../../../stage-ui-live2d/src/composables/live2d/execution-diagnostics'
import type {
  Live2DResolvedExpressionSelection,
  Live2DRuntimeCapabilitySnapshot,
} from '../../../../stage-ui-live2d/src/composables/live2d/expression-runtime'
import type { VrmResolvedRuntimeCapabilitySnapshot } from '../../../../stage-ui-three/src/composables/vrm/capabilities'
import type { VrmExecutionDiagnosticsSnapshot } from '../../../../stage-ui-three/src/composables/vrm/execution-diagnostics'
import type { EmbodimentPlaybackTelemetry } from '../../services/embodiment/playback-reconciler'
import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationRuntimeDigest,
  AlicizationVisualPresenceStateSnapshot,
} from '../../stores/alicization-bridge'
import type { StageEmbodimentAttentionPresenceState } from './use-stage-embodiment-attention'

import {
  buildAlicizationFaceSummary,
  buildAlicizationLipsyncSummary,
  buildAlicizationMotionSummary,
  buildAlicizationVoiceSummary,
  cloneStageEmbodimentSpeechArticulationState,
  normalizeAlicizationSettleLoopToken,
  resolveAlicizationCompanionshipReasonSummary,
} from '@proj-alicization/stage-shared'
import { computed, readonly } from 'vue'

import {
  resolveLive2DExpressionSelection,
} from '../../../../stage-ui-live2d/src/composables/live2d/expression-runtime'
import {
  resolveSupportedVrmExpressionName,
} from '../../../../stage-ui-three/src/composables/vrm/capabilities'
import {
  cloneEmbodimentPlaybackTelemetry,
} from '../../services/embodiment/playback-reconciler'
import { resolveResidentSnapshot } from './stage-embodiment-resident-performance'
import {
  resolveResidentLive2DPreferredExpressionAliases,
  resolveResidentVrmPreferredExpressionAliases,
} from './stage-resident-expression-aliases'
import {
  resolveStageEmbodimentRuntimeAttentionBias,
  resolveStageEmbodimentRuntimePresence,
} from './use-stage-embodiment-attention'

interface Point2D {
  x: number
  y: number
}

interface Size2D {
  width: number
  height: number
}

interface StageEmbodimentAuthorityMatchFlags {
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
}

type StageEmbodimentConvergenceDriver = 'body' | 'face' | 'motion' | 'lipsync' | 'voice'

type StageEmbodimentConvergenceState
  = | 'fully-reunited'
    | 'audible-body-carry'
    | 'body-carried-to-renderer-rejoin'
    | 'body-only-carry'
    | 'audible-only-carry'
    | 'split-authority'

export interface StageEmbodimentConvergenceSummary {
  segmentId: string | null
  state: StageEmbodimentConvergenceState
  line: string
  matchedDrivers: StageEmbodimentConvergenceDriver[]
  missingDrivers: StageEmbodimentConvergenceDriver[]
  summary: string
}

export interface StageEmbodimentDriverAuthoritySummaryEntry {
  cue: string | null
  emotion?: string | null
  intensity?: number | null
  holdMs?: number | null
  continuityTiming?: string | null
  preUtteranceCue?: string | null
  postUtteranceCue?: string | null
  attentionMode?: string | null
  idleBase?: string | null
  playbackPhase?: 'idle' | 'playing' | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  preferredPauseMode?: string | null
  preferredLipsyncMode?: string | null
  preferredVoiceMode?: string | null
  preferredPacingMode?: string | null
  reasonTags?: string[] | null
  reasonSummary?: string | null
  signature?: string | null
  source: string | null
  confidence: number | null
  segmentId: string | null
}

export interface StageEmbodimentLipsyncDriverAuthoritySummaryEntry extends StageEmbodimentDriverAuthoritySummaryEntry {
  mode: NonNullable<EmbodimentPlaybackTelemetry['drivers']['lipsync']>['mode'] | null
  continuityHoldMs?: number | null
  topViseme?: string | null
  hintTrail?: string | null
  hintViseme?: string | null
}

export interface StageEmbodimentBodyDriverSummaryEntry {
  frameMode: NonNullable<EmbodimentPlaybackTelemetry['drivers']['body']>['frameMode'] | null
  stillness: number | null
  gazeStability: number | null
  breathAmplitude: number | null
  expressivity: number | null
  segmentId: string | null
}

export interface StageEmbodimentDriverSummary {
  rendererTarget: 'live2d' | 'vrm' | null
  body?: StageEmbodimentBodyDriverSummaryEntry | null
  face: StageEmbodimentDriverAuthoritySummaryEntry | null
  motion: StageEmbodimentDriverAuthoritySummaryEntry | null
  lipsync: StageEmbodimentLipsyncDriverAuthoritySummaryEntry | null
  voiceAuthority?: StageEmbodimentDriverAuthoritySummaryEntry | null
  voice?: string | null
}

type StageEmbodimentRendererAlignmentReason
  = | Live2DResolvedExpressionSelection['reason']
    | 'emotion'
    | 'runtime-expression'
    | 'runtime-emotion'
    | 'runtime-facial-cue'
    | 'unresolved'
    | string

type NormalizedPlaybackTelemetry = NonNullable<ReturnType<typeof normalizePlaybackTelemetry>>
type NormalizedPlaybackDriverAuthority = NormalizedPlaybackTelemetry['driverAuthority']
type NormalizedPlaybackProsodyAuthority = NormalizedPlaybackTelemetry['prosodyAuthority']
type NormalizedPlaybackDrivers = NormalizedPlaybackTelemetry['drivers']

function normalizeRendererHintText(value: unknown) {
  return typeof value === 'string' ? normalizeSummaryString(value) : null
}

function resolvePlaybackTelemetryRendererHintSummary(
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>,
) {
  const rendererHints = playbackTelemetry?.cue?.rendererHints
  if (!rendererHints || typeof rendererHints !== 'object')
    return null

  const preferredBlinkCadence = normalizeRendererHintText((rendererHints as { preferredBlinkCadence?: unknown }).preferredBlinkCadence)
  const preferredGazeMode = normalizeRendererHintText((rendererHints as { preferredGazeMode?: unknown }).preferredGazeMode)
  const preferredPauseMode = normalizeRendererHintText((rendererHints as { preferredPauseMode?: unknown }).preferredPauseMode)
  const preferredLipsyncMode = normalizeRendererHintText((rendererHints as { preferredLipsyncMode?: unknown }).preferredLipsyncMode)
  const preferredVoiceMode = normalizeRendererHintText((rendererHints as { preferredVoiceMode?: unknown }).preferredVoiceMode)
  const preferredPacingMode = normalizeRendererHintText((rendererHints as { preferredPacingMode?: unknown }).preferredPacingMode)

  if (
    !preferredBlinkCadence
    && !preferredGazeMode
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
  ) {
    return null
  }

  return {
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    summary: [
      preferredBlinkCadence ? `blink=${preferredBlinkCadence}` : null,
      preferredGazeMode ? `gaze=${preferredGazeMode}` : null,
      preferredPauseMode ? `pause=${preferredPauseMode}` : null,
      preferredLipsyncMode ? `lipsyncMode=${preferredLipsyncMode}` : null,
      preferredVoiceMode ? `voiceMode=${preferredVoiceMode}` : null,
      preferredPacingMode ? `pacing=${preferredPacingMode}` : null,
    ].filter((value): value is string => Boolean(value)).join(' | '),
  }
}

function resolveExecutionRendererHintSummary(input: {
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
  rendererTarget: 'live2d' | 'vrm' | null
}) {
  const cue = input.rendererTarget === 'live2d'
    ? input.live2dExecution?.cue
    : input.rendererTarget === 'vrm'
      ? input.vrmExecution?.cue
      : input.live2dExecution?.cue ?? input.vrmExecution?.cue ?? null

  const preferredBlinkCadence = normalizeSummaryString(cue?.preferredBlinkCadence)
  const preferredGazeMode = normalizeSummaryString(cue?.preferredGazeMode)
  const preferredPauseMode = normalizeRendererHintText((cue as { preferredPauseMode?: unknown } | null)?.preferredPauseMode)
  const preferredLipsyncMode = normalizeRendererHintText((cue as { preferredLipsyncMode?: unknown } | null)?.preferredLipsyncMode)
  const preferredVoiceMode = normalizeRendererHintText((cue as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
  const preferredPacingMode = normalizeRendererHintText((cue as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
  if (
    !preferredBlinkCadence
    && !preferredGazeMode
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
  ) {
    return null
  }

  return {
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    summary: [
      preferredBlinkCadence ? `blink=${preferredBlinkCadence}` : null,
      preferredGazeMode ? `gaze=${preferredGazeMode}` : null,
      preferredPauseMode ? `pause=${preferredPauseMode}` : null,
      preferredLipsyncMode ? `lipsyncMode=${preferredLipsyncMode}` : null,
      preferredVoiceMode ? `voiceMode=${preferredVoiceMode}` : null,
      preferredPacingMode ? `pacing=${preferredPacingMode}` : null,
    ].filter((value): value is string => Boolean(value)).join(' | '),
  }
}

function mergeRendererHintSummaries(
  playbackSummary: ReturnType<typeof resolvePlaybackTelemetryRendererHintSummary>,
  executionSummary: ReturnType<typeof resolveExecutionRendererHintSummary>,
) {
  const preferredBlinkCadence = playbackSummary?.preferredBlinkCadence ?? executionSummary?.preferredBlinkCadence ?? null
  const preferredGazeMode = playbackSummary?.preferredGazeMode ?? executionSummary?.preferredGazeMode ?? null
  const preferredPauseMode = playbackSummary?.preferredPauseMode ?? executionSummary?.preferredPauseMode ?? null
  const preferredLipsyncMode = playbackSummary?.preferredLipsyncMode ?? executionSummary?.preferredLipsyncMode ?? null
  const preferredVoiceMode = playbackSummary?.preferredVoiceMode ?? executionSummary?.preferredVoiceMode ?? null
  const preferredPacingMode = playbackSummary?.preferredPacingMode ?? executionSummary?.preferredPacingMode ?? null

  if (
    !preferredBlinkCadence
    && !preferredGazeMode
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
  ) {
    return null
  }

  return {
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    summary: [
      preferredBlinkCadence ? `blink=${preferredBlinkCadence}` : null,
      preferredGazeMode ? `gaze=${preferredGazeMode}` : null,
      preferredPauseMode ? `pause=${preferredPauseMode}` : null,
      preferredLipsyncMode ? `lipsyncMode=${preferredLipsyncMode}` : null,
      preferredVoiceMode ? `voiceMode=${preferredVoiceMode}` : null,
      preferredPacingMode ? `pacing=${preferredPacingMode}` : null,
    ].filter((value): value is string => Boolean(value)).join(' | '),
  }
}

export interface StageEmbodimentDiagnosticsSnapshot {
  visualPresence: {
    watchMode: AlicizationVisualPresenceStateSnapshot['watchMode'] | null
    currentBodyState: AlicizationVisualPresenceStateSnapshot['currentBodyState'] | null
    continuityMode: AlicizationVisualPresenceStateSnapshot['continuityMode'] | null
    quietLineMs: number | null
    currentInwardPreoccupation: string | null
    scenario: string | null
    thoughtStance: NonNullable<AlicizationVisualPresenceStateSnapshot['privateThought']>['stance'] | null
    embodiedPresence: NonNullable<AlicizationVisualPresenceStateSnapshot['privateThought']>['embodiedPresence'] | null
    runtimeDominantChannel: AlicizationRuntimeDigest['dominantChannel'] | null
    runtimeShouldSpeak: boolean | null
    runtimeShouldAct: boolean | null
    runtimeContinuityPressure: number | null
    runtimeCompanionshipPressure: number | null
    runtimeSummary: string | null
    runtimeMemoryClosureIdentityKey: string | null
    capturePermission: AlicizationVisualPresenceStateSnapshot['captureState']['permission'] | null
    captureSourceName: string | null
    degradedReason: string | null
    stateAgeMs: number | null
  }
  attention: {
    engaged: boolean
    targetPoint: Point2D
    resolvedPresence: StageEmbodimentAttentionPresenceState | null
    runtimePresence: StageEmbodimentAttentionPresenceState | null
    runtimeBias: {
      engaged: boolean
      confidence: number
      x: number
      y: number
    }
  }
  performance: {
    phase: StageEmbodimentPerformancePhase
    runtimeDynamics: {
      profile: 'default' | 'quiet-accompaniment' | 'protective-watch'
      companionshipTransition: {
        residentMode: string | null
        expressionAliases: string[]
        motionAliases: string[]
        reasonSummary: string | null
        reasonTags: string[]
        settleSummary: string | null
        signature: string | null
      }
      variationToken: string | null
      residentEmotion: string | null
      residentDelivery: string | null
      residentFacialCue: string | null
      residentActionCue: string | null
      residentLive2DExpressionBias: string[]
      residentVrmExpressionBias: string[]
      residentLive2DResolvedExpression: {
        name: string | null
        reason: Live2DResolvedExpressionSelection['reason'] | null
      } | null
      residentVrmResolvedExpression: {
        name: string | null
        reason: 'preferred' | 'emotion' | 'unresolved'
      } | null
      actionIntensity: number
      breathDrive: number
      focusDrive: number
      provenance: {
        watchMode: AlicizationVisualPresenceStateSnapshot['watchMode'] | null
        bodyState: AlicizationVisualPresenceStateSnapshot['currentBodyState'] | null
        continuityMode: AlicizationVisualPresenceStateSnapshot['continuityMode'] | null
        thoughtStance: NonNullable<AlicizationVisualPresenceStateSnapshot['privateThought']>['stance'] | null
        thoughtShouldSpeak: boolean | null
        thoughtTension: string | null
        runtimeChannel: AlicizationRuntimeDigest['dominantChannel'] | null
        runtimeSummary: string | null
        runtimeMemoryClosureIdentityKey: string | null
        activeThreadId: string | null
        activeThreadTitle: string | null
        preferredPresence: string | null
        selectedAction: string | null
        personaBiasSummary: string | null
        personaOpeningGuidance: string | null
        scene: string | null
        scenario: string | null
      }
      eventPointers: {
        recentTransition: {
          fromWatchMode: AlicizationVisualPresenceStateSnapshot['recentTransition'] extends infer T
            ? T extends { fromWatchMode: infer U } ? U : never
            : never
          toWatchMode: AlicizationVisualPresenceStateSnapshot['recentTransition'] extends infer T
            ? T extends { toWatchMode: infer U } ? U : never
            : never
          fromScenario: AlicizationVisualPresenceStateSnapshot['recentTransition'] extends infer T
            ? T extends { fromScenario: infer U } ? U : never
            : never
          durationMs: number
          reason: string | null
          occurredAt: number
        } | null
        rationaleTags: string[]
        focusBeliefId: string | null
        focusInquiryId: string | null
        commitmentId: string | null
        runtimeThreadId: string | null
        governorDrive: string | null
        governorIntentionId: string | null
        selectedThoughtThreadId: string | null
      }
    }
  }
  posture: StageEmbodimentPresencePostureState
  speech: {
    phase: StageEmbodimentSpeechRenderPhase
    playbackPhase: StageEmbodimentSpeechRenderState['playbackPhase']
    speechEnergy: number
    prosodyIntensity: number
    emphasisLevel: number
    cadencePulse: number
    visemeIntensity: number
    articulation: StageEmbodimentSpeechArticulationState | null
    articulationSummary: {
      voice: string | null
      topVisemes: string | null
    } | null
    prosodyAuthoritySummary: string | null
    prosodyDriverAttributionSummary: string | null
    prosodyExecutionAlignmentSummary: string | null
    lipsyncExecutionSummary: string | null
    convergence: StageEmbodimentConvergenceSummary | null
    authoritySummary: {
      cueId: string | null
      segmentId: string | null
      rendererTarget: 'live2d' | 'vrm' | null
      matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
      matchedSources: string[]
      bindingSummary: string
      matchSummary: string
      authorityMismatchSummary: string | null
      authorityMismatchReasonSummary: string | null
      authorityMismatchDisplay: string | null
      settleSummary: string
    } | null
    cueMicroSummary: {
      cueId: string | null
      cueText: string | null
      cue: string | null
      personaStyle: string | null
      timing: string | null
    } | null
    driverSummary: StageEmbodimentDriverSummary | null
    driverExecutionSummary: string | null
    live2dExecution: Live2DExecutionDiagnosticsSnapshot | null
    visemeHintsSummary: string | null
    vrmExecution: VrmExecutionDiagnosticsSnapshot | null
    rendererAlignment: {
      live2d: {
        predicted: string | null
        actual: string | null
        reason: StageEmbodimentRendererAlignmentReason | null
        reasonTags: string[]
        signature: string | null
        status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
        driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
        faceDriverCue: string | null
        faceDriverSource: string | null
        faceDriverSegmentId: string | null
        motionDriverCue: string | null
        motionDriverSource: string | null
        motionDriverSegmentId: string | null
        bodyDriverSegmentId: string | null
        lipsyncDriverSegmentId: string | null
        voiceDriverSegmentId: string | null
      } | null
      vrm: {
        predicted: string | null
        actual: string | null
        reason: StageEmbodimentRendererAlignmentReason | null
        reasonTags: string[]
        signature: string | null
        status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
        driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
        faceDriverCue: string | null
        faceDriverSource: string | null
        faceDriverSegmentId: string | null
        motionDriverCue: string | null
        motionDriverSource: string | null
        motionDriverSegmentId: string | null
        bodyDriverSegmentId: string | null
        lipsyncDriverSegmentId: string | null
        voiceDriverSegmentId: string | null
      } | null
    }
    alerts: Array<{
      severity: 'info' | 'warn'
      code: string
      message: string
    }>
    playbackTelemetry: {
      actualDurationMs: number | null
      plannedDurationMs: number | null
      driftMs: number | null
      settleMs: number | null
      stopReason: string | null
      rendererTarget: 'live2d' | 'vrm' | null
      prosodyAuthority: NormalizedPlaybackProsodyAuthority | null
      driverAuthority: {
        segmentId: string | null
        rendererTarget: 'live2d' | 'vrm' | null
        matchedDrivers: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
        sources: string[]
        bodySegmentMatched: boolean
        faceSegmentMatched: boolean
        motionSegmentMatched: boolean
        lipsyncSegmentMatched: boolean
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
      cue?: {
        id: string | null
        text: string | null
        emotion: string | null
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
        rendererHints: {
          residentMode?: string | null
          preferredExpressionAliases?: string[]
          preferredMotionAliases?: string[]
        } | null
        rendererSettle: {
          live2dFacialReleaseMs: number | null
          live2dMotionFollowThroughMs: number | null
          vrmActionFadeMs: number | null
          vrmExpressionBlendMs: number | null
        } | null
      } | null
      drivers: NormalizedPlaybackDrivers | null
    } | null
  }
  stage: Size2D
}

export interface UseStageEmbodimentDiagnosticsOptions {
  activePresence: Readonly<Ref<StageEmbodimentAttentionPresenceState | null>>
  digitalLifeSpineDigest?: Readonly<Ref<AlicizationDigitalLifeSpineDigest | null | undefined>>
  live2dExecutionDiagnostics?: Readonly<Ref<Live2DExecutionDiagnosticsSnapshot | null | undefined>>
  playbackTelemetry?: Readonly<Ref<EmbodimentPlaybackTelemetry | null>>
  performanceState?: Readonly<Ref<StageEmbodimentPerformanceState | null | undefined>>
  runtimeDigest?: Readonly<Ref<AlicizationRuntimeDigest | null | undefined>>
  presencePosture: Readonly<Ref<StageEmbodimentPresencePostureState>>
  speechRenderState: Readonly<Ref<StageEmbodimentSpeechRenderState | null | undefined>>
  stageBounds: Readonly<Ref<Size2D>>
  targetPoint: Readonly<Ref<Point2D>>
  live2dRuntimeCapabilities?: Readonly<Ref<Live2DRuntimeCapabilitySnapshot | null | undefined>>
  visualPresenceState?: Readonly<Ref<AlicizationVisualPresenceStateSnapshot | null | undefined>>
  vrmExecutionDiagnostics?: Readonly<Ref<VrmExecutionDiagnosticsSnapshot | null | undefined>>
  vrmRuntimeCapabilities?: Readonly<Ref<VrmResolvedRuntimeCapabilitySnapshot | null | undefined>>
}

function normalizeResidentResolvedExpression(
  selection: Pick<Live2DResolvedExpressionSelection, 'name' | 'reason'> | null,
) {
  if (!selection)
    return null

  return {
    name: normalizeSummaryString(selection.name),
    reason: selection.reason ?? null,
  }
}

function normalizeSummaryNumber(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Number(value)
}

function buildAuthorityMismatchSummary(
  authority: StageEmbodimentAuthorityMatchFlags | null | undefined,
) {
  if (!authority)
    return null

  const mismatches: string[] = []
  if (authority.bodySegmentMatched === false)
    mismatches.push('body-mismatch')
  if (authority.faceSegmentMatched === false)
    mismatches.push('face-mismatch')
  if (authority.motionSegmentMatched === false)
    mismatches.push('motion-mismatch')
  if (authority.lipsyncSegmentMatched === false)
    mismatches.push('lipsync-mismatch')
  if (authority.voiceSegmentMatched === false)
    mismatches.push('voice-mismatch')

  return mismatches.length > 0 ? mismatches.join(', ') : null
}

function resolveAuthorityRendererExecutionProof(input: {
  authoritySegmentId: string | null
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
}) {
  const authoritySegmentId = normalizeSummaryString(input.authoritySegmentId)
  if (!authoritySegmentId) {
    return {
      bodySegmentMatched: false,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
    }
  }

  return {
    faceSegmentMatched: Boolean(
      input.live2dExecution?.activeExpression?.segmentId === authoritySegmentId
      || input.vrmExecution?.activeEmotion?.segmentId === authoritySegmentId
      || input.vrmExecution?.activeFacialCue?.segmentId === authoritySegmentId,
    ),
    motionSegmentMatched: Boolean(
      input.live2dExecution?.activeMotion?.segmentId === authoritySegmentId
      || input.vrmExecution?.activeMotion?.segmentId === authoritySegmentId,
    ),
    bodySegmentMatched: Boolean(
      input.live2dExecution?.activeBody?.segmentId === authoritySegmentId
      || input.vrmExecution?.activeBody?.segmentId === authoritySegmentId,
    ),
    lipsyncSegmentMatched: Boolean(
      input.live2dExecution?.activeLipSync?.segmentId === authoritySegmentId
      || input.vrmExecution?.activeLipSync?.segmentId === authoritySegmentId,
    ),
  }
}

function resolveEffectiveAuthorityMatchFlags(input: {
  driverAuthority: NormalizedPlaybackDriverAuthority
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
  authoritySegmentId?: string | null
  voiceAuthoritySegmentId?: string | null
  voiceSummary?: string | null
}) {
  const authoritySegmentId = normalizeSummaryString(input.authoritySegmentId)
    ?? normalizeSummaryString(input.driverAuthority?.segmentId)
  const voiceAuthoritySegmentId = normalizeSummaryString(input.voiceAuthoritySegmentId)
    ?? input.live2dExecution?.activeVoice?.segmentId
    ?? input.vrmExecution?.activeVoice?.segmentId
    ?? null
  const rendererProof = resolveAuthorityRendererExecutionProof({
    authoritySegmentId: authoritySegmentId ?? null,
    live2dExecution: input.live2dExecution,
    vrmExecution: input.vrmExecution,
  })

  function resolveFlag(
    driverMatched: boolean | null | undefined,
    rendererMatched: boolean,
  ) {
    if (driverMatched === true || rendererMatched)
      return true
    if (driverMatched === false)
      return false
    return null
  }

  return {
    bodySegmentMatched: resolveFlag(input.driverAuthority?.bodySegmentMatched, rendererProof.bodySegmentMatched),
    faceSegmentMatched: resolveFlag(input.driverAuthority?.faceSegmentMatched, rendererProof.faceSegmentMatched),
    motionSegmentMatched: resolveFlag(input.driverAuthority?.motionSegmentMatched, rendererProof.motionSegmentMatched),
    lipsyncSegmentMatched: resolveFlag(input.driverAuthority?.lipsyncSegmentMatched, rendererProof.lipsyncSegmentMatched),
    voiceSegmentMatched: resolveVoiceAuthorityMatch({
      authoritySegmentId: authoritySegmentId ?? null,
      voiceAuthoritySegmentId,
      voiceSummary: input.voiceSummary ?? null,
    }),
  } satisfies StageEmbodimentAuthorityMatchFlags
}

function buildAuthorityMismatchReasonSummary(input: {
  authority: StageEmbodimentAuthorityMatchFlags | null | undefined
  matchedSources?: string[] | null
  driverExecutionSummary?: string | null
  voiceAuthority?: StageEmbodimentDriverAuthoritySummaryEntry | null
}) {
  const mismatchSummary = buildAuthorityMismatchSummary(input.authority)
  if (!mismatchSummary)
    return null

  const labelMap: Record<string, string> = {
    'body-mismatch': '身体',
    'face-mismatch': '表情',
    'motion-mismatch': '动作',
    'lipsync-mismatch': '口型',
    'voice-mismatch': '语音',
  }
  const mismatchLabels = mismatchSummary
    .split(', ')
    .map(kind => labelMap[kind] ?? null)
    .filter((value): value is string => Boolean(value))
  const sourceText = (input.matchedSources ?? []).filter(Boolean).join('、') || '无来源'
  const driverExecutionSummary = input.driverExecutionSummary?.trim() ?? ''
  const executionKinds: string[] = []
  if (driverExecutionSummary.includes('body='))
    executionKinds.push('体态')
  if (driverExecutionSummary.includes('emotion=') || driverExecutionSummary.includes('cue='))
    executionKinds.push('表情')
  if (driverExecutionSummary.includes('motion='))
    executionKinds.push('动作')
  if (driverExecutionSummary.includes('lipsync='))
    executionKinds.push('口型')
  if (driverExecutionSummary.includes('voice=') && !executionKinds.includes('语音'))
    executionKinds.push('语音')
  if (input.voiceAuthority?.segmentId && !executionKinds.includes('语音'))
    executionKinds.push('语音')
  const executionText = executionKinds.join('、') || '无执行'
  const segmentMatches = [...driverExecutionSummary.matchAll(/seg=([^|]+)/g)]
    .map(match => match[1]?.trim())
    .filter((value): value is string => Boolean(value))
  const uniqueSegments = [...new Set(segmentMatches)]
  const segmentText = uniqueSegments.length > 0
    ? `，执行段位是 ${uniqueSegments.join('、')}`
    : ''
  return `${mismatchLabels.join('、') || '未知'} authority 漂移，当前绑定来源是 ${sourceText}，实际执行落点是${executionText}${segmentText}。`
}

function resolveAuthorityMismatchDisplay(input: {
  authorityLaneSummary?: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
}) {
  const reason = normalizeSummaryString(input.authorityMismatchReasonSummary)
  const summary = normalizeSummaryString(input.authorityMismatchSummary)
  const lane = normalizeSummaryString(input.authorityLaneSummary)

  if (reason && lane === 'lane=lipsync+voice-only') {
    return reason
      .replace('实际执行落点是口型、语音。', '实际执行落点是口型和语音。')
      .replace('实际执行落点是口型。', '实际执行落点是口型和语音。')
  }
  if (reason && lane === 'lane=face+voice-only') {
    return reason
      .replace(/实际执行落点是表情、动作、语音，执行段位是 [^。]+。$/, '实际执行落点是表情和语音。')
      .replace(/实际执行落点是表情、语音，执行段位是 [^。]+。$/, '实际执行落点是表情和语音。')
      .replace(/实际执行落点是表情(?:、动作)?，执行段位是 [^。]+。$/, '实际执行落点是表情和语音。')
      .replace('实际执行落点是表情、语音。', '实际执行落点是表情和语音。')
      .replace('实际执行落点是表情。', '实际执行落点是表情和语音。')
  }
  if (reason && lane === 'lane=motion+voice-only') {
    return reason
      .replace(/实际执行落点是动作、语音，执行段位是 [^。]+。$/, '实际执行落点是动作和语音。')
      .replace(/实际执行落点是动作，执行段位是 [^。]+。$/, '实际执行落点是动作和语音。')
      .replace('实际执行落点是动作、语音。', '实际执行落点是动作和语音。')
      .replace('实际执行落点是动作。', '实际执行落点是动作和语音。')
  }
  if (reason && lane === 'lane=face+lipsync-only') {
    return reason
      .replace('身体、动作 authority 漂移', '身体、动作、语音 authority 漂移')
      .replace(/实际执行落点是表情、动作、口型，执行段位是 [^。]+。$/, '实际执行落点是表情和口型。')
      .replace(/实际执行落点是表情、口型，执行段位是 [^。]+。$/, '实际执行落点是表情和口型。')
      .replace('实际执行落点是表情、动作、口型。', '实际执行落点是表情和口型。')
      .replace('实际执行落点是表情、口型。', '实际执行落点是表情和口型。')
      .replace('实际执行落点是表情。', '实际执行落点是表情和口型。')
  }
  if (reason && lane === 'lane=motion+lipsync-only') {
    return reason
      .replace('身体、表情 authority 漂移', '身体、表情、语音 authority 漂移')
      .replace(/实际执行落点是动作、表情、口型，执行段位是 [^。]+。$/, '实际执行落点是动作和口型。')
      .replace(/实际执行落点是动作、口型，执行段位是 [^。]+。$/, '实际执行落点是动作和口型。')
      .replace('实际执行落点是动作、表情、口型。', '实际执行落点是动作和口型。')
      .replace('实际执行落点是动作、口型。', '实际执行落点是动作和口型。')
      .replace('实际执行落点是动作。', '实际执行落点是动作和口型。')
  }

  return reason ?? summary
}

function normalizeRendererHintReasonTags(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string')
        .map(entry => entry.trim())
        .filter(Boolean)
    : []
}

function normalizeRendererHintSignature(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function resolveAuthorityLaneSummary(authority: StageEmbodimentAuthorityMatchFlags | null | undefined) {
  if (!authority)
    return null

  const survivingLanes = [
    authority.bodySegmentMatched === true ? 'body' : null,
    authority.faceSegmentMatched === true ? 'face' : null,
    authority.motionSegmentMatched === true ? 'motion' : null,
    authority.lipsyncSegmentMatched === true ? 'lipsync' : null,
    authority.voiceSegmentMatched === true ? 'voice' : null,
  ].filter((value): value is string => Boolean(value))

  if (survivingLanes.length === 0 || survivingLanes.length === 5)
    return null

  return `lane=${survivingLanes.join('+')}-only`
}

function resolveAuthorityRemainingOpenSummary(authority: StageEmbodimentAuthorityMatchFlags | null | undefined) {
  if (!authority)
    return null

  if (
    authority.bodySegmentMatched === true
    && authority.faceSegmentMatched === true
    && authority.motionSegmentMatched === true
    && authority.lipsyncSegmentMatched !== true
    && authority.voiceSegmentMatched !== true
  ) {
    return 'remaining-open=lipsync+voice'
  }

  if (
    authority.bodySegmentMatched !== true
    && authority.faceSegmentMatched === true
    && authority.motionSegmentMatched === true
    && authority.lipsyncSegmentMatched !== true
    && authority.voiceSegmentMatched === true
  ) {
    return 'remaining-open=body+lipsync'
  }

  return null
}

const STAGE_EMBODIMENT_CONVERGENCE_DRIVERS: StageEmbodimentConvergenceDriver[] = [
  'body',
  'face',
  'motion',
  'lipsync',
  'voice',
]

function hasExactMatchedConvergenceDrivers(
  matchedDrivers: StageEmbodimentConvergenceDriver[],
  expectedDrivers: StageEmbodimentConvergenceDriver[],
) {
  return matchedDrivers.length === expectedDrivers.length
    && expectedDrivers.every(driver => matchedDrivers.includes(driver))
}

function normalizeSpeechConvergenceSummary(input: {
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
  voiceSummary?: string | null
}) {
  if (!input.playbackTelemetry)
    return null

  const explicitVoiceAuthority = resolvePlaybackExplicitVoiceAuthority({
    playbackTelemetry: input.playbackTelemetry,
  })
  const voiceAuthoritySegmentId = resolveVoiceSummarySegmentId(input.voiceSummary ?? null)
    ?? explicitVoiceAuthority?.segmentId
  const hasConvergenceSignal = Boolean(
    input.playbackTelemetry.driverAuthority
    || voiceAuthoritySegmentId
    || input.playbackTelemetry.prosodyAuthority?.segmentId,
  )
  if (!hasConvergenceSignal)
    return null

  const authoritySegmentId = resolvePreferredSpeechContinuitySegmentId({
    driverAuthoritySegmentId: input.playbackTelemetry.driverAuthority?.segmentId,
    prosodyAuthoritySegmentId: input.playbackTelemetry.prosodyAuthority?.segmentId,
    cueSegmentId: input.playbackTelemetry.cue?.id,
    voiceSummarySegmentId: voiceAuthoritySegmentId,
    bodySegmentId: input.playbackTelemetry.drivers.body?.segmentId,
    faceSegmentId: input.playbackTelemetry.drivers.face?.segmentId,
    motionSegmentId: input.playbackTelemetry.drivers.motion?.segmentId,
    lipsyncSegmentId: input.playbackTelemetry.drivers.lipsync?.segmentId,
  })
  const authority = resolveEffectiveAuthorityMatchFlags({
    driverAuthority: input.playbackTelemetry.driverAuthority ?? null,
    live2dExecution: input.live2dExecution,
    vrmExecution: input.vrmExecution,
    authoritySegmentId,
    voiceAuthoritySegmentId,
    voiceSummary: input.voiceSummary ?? null,
  })
  const matchedDrivers = STAGE_EMBODIMENT_CONVERGENCE_DRIVERS.filter((driver) => {
    switch (driver) {
      case 'body':
        return authority.bodySegmentMatched === true
      case 'face':
        return authority.faceSegmentMatched === true
      case 'motion':
        return authority.motionSegmentMatched === true
      case 'lipsync':
        return authority.lipsyncSegmentMatched === true
      case 'voice':
        return authority.voiceSegmentMatched === true
      default:
        return false
    }
  })
  const segmentId = normalizeSummaryString(
    authoritySegmentId
    ?? voiceAuthoritySegmentId
    ?? input.playbackTelemetry.prosodyAuthority?.segmentId
    ?? input.live2dExecution?.activeBody?.segmentId
    ?? input.vrmExecution?.activeBody?.segmentId
    ?? input.live2dExecution?.activeLipSync?.segmentId
    ?? input.vrmExecution?.activeLipSync?.segmentId,
  )

  if (!segmentId && matchedDrivers.length === 0)
    return null

  const missingDrivers = STAGE_EMBODIMENT_CONVERGENCE_DRIVERS.filter(
    driver => !matchedDrivers.includes(driver),
  )
  let state: StageEmbodimentConvergenceState = 'split-authority'

  if (hasExactMatchedConvergenceDrivers(matchedDrivers, STAGE_EMBODIMENT_CONVERGENCE_DRIVERS))
    state = 'fully-reunited'
  else if (hasExactMatchedConvergenceDrivers(matchedDrivers, ['body', 'lipsync', 'voice']))
    state = 'audible-body-carry'
  else if (hasExactMatchedConvergenceDrivers(matchedDrivers, ['body', 'voice']))
    state = 'body-carried-to-renderer-rejoin'
  else if (hasExactMatchedConvergenceDrivers(matchedDrivers, ['body']))
    state = 'body-only-carry'
  else if (hasExactMatchedConvergenceDrivers(matchedDrivers, ['lipsync', 'voice']))
    state = 'audible-only-carry'

  const line = matchedDrivers.length > 0 ? matchedDrivers.join('+') : 'none'
  const summary = `state=${state} | segment=${segmentId ?? 'n/a'} | line=${line} | missing=${missingDrivers.length > 0 ? missingDrivers.join(',') : 'none'}`

  return {
    segmentId,
    state,
    line,
    matchedDrivers,
    missingDrivers,
    summary,
  } satisfies StageEmbodimentConvergenceSummary
}

function normalizeRuntimeDynamicsProfile(variationToken: string | null) {
  const normalized = variationToken?.trim().toLowerCase() ?? ''
  if (normalized.includes('quiet-accompaniment'))
    return 'quiet-accompaniment' as const
  if (normalized.includes('protective-watch'))
    return 'protective-watch' as const
  return 'default' as const
}

function resolveCompanionshipReasonSummary(input: {
  residentMode: string | null | undefined
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined
}) {
  return resolveAlicizationCompanionshipReasonSummary(input)
}

function normalizeRuntimeDynamicsSummary(
  input: {
    activePresence: StageEmbodimentAttentionPresenceState | null | undefined
    digitalLifeSpineDigest: AlicizationDigitalLifeSpineDigest | null | undefined
    performanceState: StageEmbodimentPerformanceState | null | undefined
    presencePosture: StageEmbodimentPresencePostureState | null | undefined
    runtimeDigest: AlicizationRuntimeDigest | null | undefined
    live2dRuntimeCapabilities: Live2DRuntimeCapabilitySnapshot | null | undefined
    visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined
    vrmRuntimeCapabilities: VrmResolvedRuntimeCapabilitySnapshot | null | undefined
  },
) {
  const variationToken = normalizeSummaryString(input.performanceState?.variationToken)
  const resident = input.performanceState?.residentPerformance
  const privateThought = input.visualPresenceState?.privateThought
  const runtimeMemoryClosureIdentityKey = resolveRuntimeMemoryClosureIdentityKey(input.runtimeDigest)
  const residentEmotion = normalizeSummaryString(resident?.baseEmotion)
  const residentFacialCue = normalizeSummaryString(resident?.facialCue)
  const residentConfiguredAliases = [residentFacialCue, residentEmotion].filter((value): value is string => Boolean(value))
  const residentLive2DExpressionBias = residentEmotion
    ? resolveResidentLive2DPreferredExpressionAliases({
        emotion: residentEmotion,
        configuredAliases: residentConfiguredAliases,
      })
    : []
  const residentVrmExpressionBias = residentEmotion
    ? resolveResidentVrmPreferredExpressionAliases({
        emotion: residentEmotion,
        configuredAliases: residentConfiguredAliases,
      })
    : []
  const residentLive2DResolvedExpression = residentEmotion && input.live2dRuntimeCapabilities?.supportedExpressionNames?.length
    ? resolveLive2DExpressionSelection({
        delivery: resident?.delivery,
        emotion: residentEmotion,
        expressionIntensity: input.performanceState?.expressionIntensity ?? input.performanceState?.focusDrive,
        expressionNames: input.live2dRuntimeCapabilities.supportedExpressionNames,
        facialCue: residentFacialCue,
        facialCueIntensity: input.performanceState?.facialCueIntensity ?? input.performanceState?.focusDrive,
        preferredExpressionAliases: residentLive2DExpressionBias,
      })
    : null
  const residentVrmResolvedPreferredExpression = residentVrmExpressionBias.length > 0
    ? resolveSupportedVrmExpressionName(
        input.vrmRuntimeCapabilities?.supportedExpressionNames ?? [],
        residentVrmExpressionBias[0] ?? '',
      )
    : ''
  const residentVrmResolvedEmotionExpression = residentEmotion
    ? resolveSupportedVrmExpressionName(
        input.vrmRuntimeCapabilities?.supportedExpressionNames ?? [],
        residentEmotion,
      )
    : ''
  const residentVrmResolvedExpression = residentVrmResolvedPreferredExpression
    ? { name: residentVrmResolvedPreferredExpression, reason: 'preferred' as const }
    : residentVrmResolvedEmotionExpression
      ? { name: residentVrmResolvedEmotionExpression, reason: 'emotion' as const }
      : residentEmotion
        ? { name: null, reason: 'unresolved' as const }
        : null
  const residentSnapshot = input.visualPresenceState
    ? resolveResidentSnapshot({
        activePresence: input.activePresence ?? null,
        continuity: {
          previousActionCue: input.performanceState?.residentPerformance?.actionCue ?? null,
          previousFacialCue: input.performanceState?.residentPerformance?.facialCue ?? null,
          variationToken: input.performanceState?.variationToken ?? null,
        },
        digitalLifeSpine: input.digitalLifeSpineDigest,
        performanceManifest: null,
        presencePosture: input.presencePosture,
        visualPresenceState: input.visualPresenceState,
      })
    : null
  const residentReasonTags = residentSnapshot?.reasonTags
    ?? input.visualPresenceState?.residentPerformance?.reasonTags
    ?? []
  const companionshipResidentMode = normalizeSummaryString(
    input.performanceState?.activeCue?.rendererHints && typeof input.performanceState.activeCue.rendererHints === 'object' && 'residentMode' in input.performanceState.activeCue.rendererHints
      ? (input.performanceState.activeCue.rendererHints as { residentMode?: unknown }).residentMode as string | null | undefined
      : null,
  ) ?? normalizeSummaryString(
    input.performanceState?.residentPerformance?.residentMode,
  ) ?? normalizeSummaryString(
    residentSnapshot?.performance?.residentMode,
  )
  const activeCueExpressionAliases = input.performanceState?.activeCue?.rendererHints?.preferredExpressionAliases
    ? [...input.performanceState.activeCue.rendererHints.preferredExpressionAliases]
    : []
  const activeCueMotionAliases = input.performanceState?.activeCue?.rendererHints?.preferredMotionAliases
    ? [...input.performanceState.activeCue.rendererHints.preferredMotionAliases]
    : []
  const activeCuePreferredBlinkCadence = normalizeSummaryString(
    input.performanceState?.activeCue?.rendererHints && typeof input.performanceState.activeCue.rendererHints === 'object' && 'preferredBlinkCadence' in input.performanceState.activeCue.rendererHints
      ? (input.performanceState.activeCue.rendererHints as { preferredBlinkCadence?: unknown }).preferredBlinkCadence as string | null | undefined
      : null,
  )
  const activeCuePreferredGazeMode = normalizeSummaryString(
    input.performanceState?.activeCue?.rendererHints && typeof input.performanceState.activeCue.rendererHints === 'object' && 'preferredGazeMode' in input.performanceState.activeCue.rendererHints
      ? (input.performanceState.activeCue.rendererHints as { preferredGazeMode?: unknown }).preferredGazeMode as string | null | undefined
      : null,
  )
  const activeCueSignature = normalizeSummaryString(
    input.performanceState?.activeCue?.rendererHints && typeof input.performanceState.activeCue.rendererHints === 'object' && 'signature' in input.performanceState.activeCue.rendererHints
      ? (input.performanceState.activeCue.rendererHints as { signature?: unknown }).signature as string | null | undefined
      : null,
  )
  const activeCueReasonTags = input.performanceState?.activeCue?.rendererHints
    && typeof input.performanceState.activeCue.rendererHints === 'object'
    && 'reasonTags' in input.performanceState.activeCue.rendererHints
    && Array.isArray((input.performanceState.activeCue.rendererHints as { reasonTags?: unknown }).reasonTags)
    ? ((input.performanceState.activeCue.rendererHints as { reasonTags?: unknown }).reasonTags as unknown[])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(value => value.trim())
    : []
  const companionshipTransitionReasonTags = activeCueReasonTags.length > 0
    ? [...new Set(activeCueReasonTags)]
    : [...new Set(residentReasonTags)]
  const companionshipTransitionSignature = activeCueSignature
    ?? normalizeSummaryString(residentSnapshot?.signature)
  const activeCueSettle = input.performanceState?.activeCue?.rendererSettle
  const companionshipTransitionSettleSummary = companionshipResidentMode || activeCueSettle
    ? [
        companionshipResidentMode ? `mode=${companionshipResidentMode}` : null,
        activeCuePreferredBlinkCadence ? `blink=${activeCuePreferredBlinkCadence}` : null,
        activeCuePreferredGazeMode ? `gaze=${activeCuePreferredGazeMode}` : null,
        (() => {
          const reasonSummary = resolveCompanionshipReasonSummary({
            residentMode: companionshipResidentMode,
            digitalLifeSpineDigest: input.digitalLifeSpineDigest,
          })
          return reasonSummary ? `reason=${reasonSummary}` : null
        })(),
        Number.isFinite(activeCueSettle?.live2dFacialReleaseMs) ? `live2dFace=${Number(activeCueSettle?.live2dFacialReleaseMs)}ms` : null,
        Number.isFinite(activeCueSettle?.vrmExpressionBlendMs) ? `vrmExpr=${Number(activeCueSettle?.vrmExpressionBlendMs)}ms` : null,
        Number.isFinite(activeCueSettle?.vrmActionFadeMs) ? `vrmAction=${Number(activeCueSettle?.vrmActionFadeMs)}ms` : null,
      ].filter((value): value is string => Boolean(value)).join(' | ')
    : null
  const companionshipTransitionReasonSummary = resolveCompanionshipReasonSummary({
    residentMode: companionshipResidentMode,
    digitalLifeSpineDigest: input.digitalLifeSpineDigest,
  })

  return {
    profile: normalizeRuntimeDynamicsProfile(variationToken),
    companionshipTransition: {
      residentMode: companionshipResidentMode,
      expressionAliases: activeCueExpressionAliases,
      motionAliases: activeCueMotionAliases,
      reasonSummary: normalizeSummaryString(companionshipTransitionReasonSummary),
      reasonTags: companionshipTransitionReasonTags,
      settleSummary: normalizeSummaryString(companionshipTransitionSettleSummary),
      signature: companionshipTransitionSignature,
    },
    variationToken,
    residentEmotion,
    residentDelivery: normalizeSummaryString(resident?.delivery),
    residentFacialCue,
    residentActionCue: normalizeSummaryActionCue(resident?.actionCue),
    residentLive2DExpressionBias,
    residentVrmExpressionBias,
    residentLive2DResolvedExpression: normalizeResidentResolvedExpression(residentLive2DResolvedExpression),
    residentVrmResolvedExpression,
    actionIntensity: Number(input.performanceState?.actionIntensity ?? 0),
    breathDrive: Number(input.performanceState?.breathDrive ?? 0),
    focusDrive: Number(input.performanceState?.focusDrive ?? 0),
    provenance: {
      watchMode: input.visualPresenceState?.watchMode ?? null,
      bodyState: input.visualPresenceState?.currentBodyState ?? null,
      continuityMode: input.visualPresenceState?.continuityMode ?? null,
      thoughtStance: privateThought?.stance ?? null,
      thoughtShouldSpeak: typeof privateThought?.shouldSpeak === 'boolean' ? privateThought.shouldSpeak : null,
      thoughtTension: normalizeSummaryString(privateThought?.emotionalTension),
      runtimeChannel: input.runtimeDigest?.dominantChannel ?? null,
      runtimeSummary: normalizeSummaryString(input.runtimeDigest?.summary),
      runtimeMemoryClosureIdentityKey,
      activeThreadId: normalizeSummaryString(input.digitalLifeSpineDigest?.runtime.activeThreadId),
      activeThreadTitle: normalizeSummaryString(input.digitalLifeSpineDigest?.runtime.activeThreadTitle),
      preferredPresence: normalizeSummaryString(input.digitalLifeSpineDigest?.runtime.preferredPresence),
      selectedAction: normalizeSummaryString(input.digitalLifeSpineDigest?.runtime.selectedAction),
      personaBiasSummary: normalizeSummaryString(
        input.digitalLifeSpineDigest?.proactive?.personaBias?.manifestationCadenceSummary
        ?? input.digitalLifeSpineDigest?.proactive?.personaBias?.whySummary,
      ),
      personaOpeningGuidance: normalizeSummaryString(input.digitalLifeSpineDigest?.proactive?.personaBias?.openingGuidance),
      scene: normalizeSummaryString(input.visualPresenceState?.currentScene?.workloadKind),
      scenario: normalizeSummaryString(input.visualPresenceState?.currentScene?.scenario),
    },
    eventPointers: {
      recentTransition: input.visualPresenceState?.recentTransition
        ? {
            fromWatchMode: input.visualPresenceState.recentTransition.fromWatchMode,
            toWatchMode: input.visualPresenceState.recentTransition.toWatchMode,
            fromScenario: input.visualPresenceState.recentTransition.fromScenario,
            durationMs: input.visualPresenceState.recentTransition.durationMs,
            reason: normalizeSummaryString(input.visualPresenceState.recentTransition.reason),
            occurredAt: input.visualPresenceState.recentTransition.occurredAt,
          }
        : null,
      rationaleTags: Array.isArray(privateThought?.rationaleTags)
        ? privateThought.rationaleTags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim())
        : [],
      focusBeliefId: normalizeSummaryString(privateThought?.focusBeliefId),
      focusInquiryId: normalizeSummaryString(privateThought?.focusInquiryId),
      commitmentId: normalizeSummaryString(privateThought?.commitmentId),
      runtimeThreadId: normalizeSummaryString(privateThought?.runtimeThreadId),
      governorDrive: normalizeSummaryString(privateThought?.governorDrive),
      governorIntentionId: normalizeSummaryString(privateThought?.governorIntentionId),
      selectedThoughtThreadId: normalizeSummaryString(privateThought?.selectedThoughtThreadId),
    },
  }
}

function normalizePlaybackProsodyAuthority(
  raw: EmbodimentPlaybackTelemetry['prosodyAuthority'] | NonNullable<EmbodimentPlaybackTelemetry['driverAuthority']>['prosodyAuthority'] | null | undefined,
) {
  if (!raw)
    return null

  return {
    segmentId: normalizeSummaryString(raw.segmentId),
    provenance: raw.provenance,
    source: normalizeSummaryString(raw.source),
    mode: raw.mode ?? null,
    cueProsodyWeight: normalizeSummaryNumber(raw.cueProsodyWeight),
    cueMouthWeight: normalizeSummaryNumber(raw.cueMouthWeight),
    cueHeadWeight: normalizeSummaryNumber(raw.cueHeadWeight),
    visemePeakWeight: normalizeSummaryNumber(raw.visemePeakWeight),
  }
}

function hasPlaybackVoiceAuthoritySignal(
  driver: EmbodimentPlaybackTelemetry['drivers']['voice'],
) {
  if (!driver)
    return false

  return driver.playbackPhase === 'playing'
    || Math.max(0, Math.round(driver.continuityHoldMs ?? 0)) > 0
    || Number.isFinite(driver.cueProsodyWeight)
    || Number.isFinite(driver.cueMouthWeight)
    || Number.isFinite(driver.cueHeadWeight)
    || Number.isFinite(driver.visemePeakWeight)
    || Boolean(normalizeSummaryString(driver.source))
}

function resolveNormalizedPlaybackTelemetryProsodyAuthority(
  raw: EmbodimentPlaybackTelemetry | null | undefined,
) {
  const topLevelProsodyAuthority = normalizePlaybackProsodyAuthority(raw?.prosodyAuthority)
  if (topLevelProsodyAuthority)
    return topLevelProsodyAuthority

  const seededProsodyAuthority = normalizePlaybackProsodyAuthority(raw?.driverAuthority?.prosodyAuthority)
  if (seededProsodyAuthority)
    return seededProsodyAuthority

  const explicitVoiceDriver = raw?.drivers.voice ?? null
  if (!explicitVoiceDriver || !hasPlaybackVoiceAuthoritySignal(explicitVoiceDriver))
    return null

  return {
    segmentId: normalizeSummaryString(explicitVoiceDriver.segmentId),
    provenance: explicitVoiceDriver.provenance,
    source: normalizeSummaryString(explicitVoiceDriver.source),
    mode: explicitVoiceDriver.mode ?? null,
    cueProsodyWeight: normalizeSummaryNumber(explicitVoiceDriver.cueProsodyWeight),
    cueMouthWeight: normalizeSummaryNumber(explicitVoiceDriver.cueMouthWeight),
    cueHeadWeight: normalizeSummaryNumber(explicitVoiceDriver.cueHeadWeight),
    visemePeakWeight: normalizeSummaryNumber(explicitVoiceDriver.visemePeakWeight),
  }
}

function normalizePlaybackTelemetry(raw: EmbodimentPlaybackTelemetry | null | undefined) {
  if (!raw)
    return null

  return {
    actualDurationMs: raw.actualDurationMs,
    plannedDurationMs: raw.plannedDurationMs,
    driftMs: raw.driftMs,
    settleMs: raw.settleMs,
    stopReason: raw.stopReason,
    rendererTarget: raw.rendererTarget ?? null,
    driverAuthority: raw.driverAuthority
      ? {
          segmentId: normalizeSummaryString(raw.driverAuthority.segmentId),
          rendererTarget: raw.driverAuthority.rendererTarget ?? null,
          matchedDrivers: [...raw.driverAuthority.matchedDrivers],
          sources: [...raw.driverAuthority.sources],
          bodySegmentMatched: raw.driverAuthority.bodySegmentMatched,
          faceSegmentMatched: raw.driverAuthority.faceSegmentMatched,
          motionSegmentMatched: raw.driverAuthority.motionSegmentMatched,
          lipsyncSegmentMatched: raw.driverAuthority.lipsyncSegmentMatched,
          ...(raw.driverAuthority.voiceSegmentMatched != null
            ? { voiceSegmentMatched: raw.driverAuthority.voiceSegmentMatched }
            : {}),
          ...(normalizePlaybackProsodyAuthority(raw.driverAuthority.prosodyAuthority)
            ? {
                prosodyAuthority: normalizePlaybackProsodyAuthority(raw.driverAuthority.prosodyAuthority)!,
              }
            : {}),
        }
      : null,
    prosodyAuthority: resolveNormalizedPlaybackTelemetryProsodyAuthority(raw),
    cue: raw.cue
      ? {
          id: normalizeSummaryString(raw.cue.id),
          text: normalizeSummaryString(raw.cue.text),
          emotion: normalizeSummaryString(raw.cue.emotion),
          prosodyWeight: normalizeSummaryNumber(raw.cue.prosodyWeight),
          mouthWeight: normalizeSummaryNumber(raw.cue.mouthWeight),
          headWeight: normalizeSummaryNumber(raw.cue.headWeight),
          personaStyleSummary: normalizeSummaryString((raw.cue as { personaStyleSummary?: string | null }).personaStyleSummary),
          facialHoldMs: normalizeSummaryNumber(raw.cue.facialHoldMs),
          actionHoldMs: normalizeSummaryNumber(raw.cue.actionHoldMs),
          emotionHoldMs: normalizeSummaryNumber(raw.cue.emotionHoldMs),
          facialCue: normalizeSummaryString(raw.cue.facialCue),
          actionCue: normalizeSummaryActionCue(raw.cue.actionCue),
          actionWindow: normalizeSummaryString(raw.cue.actionWindow),
          interruptMode: normalizeSummaryString(raw.cue.interruptMode),
          settleMode: normalizeSummaryString((raw.cue as { settleMode?: string | null }).settleMode),
          rendererHints: raw.cue.rendererHints
            ? (() => {
                const reasonTags = normalizeRendererHintReasonTags(
                  (raw.cue.rendererHints as { reasonTags?: unknown }).reasonTags,
                )
                const signature = normalizeRendererHintSignature(
                  (raw.cue.rendererHints as { signature?: unknown }).signature,
                )
                return {
                  residentMode: normalizeSummaryString((raw.cue.rendererHints as { residentMode?: unknown }).residentMode as string | null | undefined),
                  preferredExpressionAliases: raw.cue.rendererHints.preferredExpressionAliases
                    ? [...raw.cue.rendererHints.preferredExpressionAliases]
                    : undefined,
                  preferredMotionAliases: raw.cue.rendererHints.preferredMotionAliases
                    ? [...raw.cue.rendererHints.preferredMotionAliases]
                    : undefined,
                  preferredBlinkCadence: normalizeSummaryString((raw.cue.rendererHints as { preferredBlinkCadence?: unknown }).preferredBlinkCadence as string | null | undefined),
                  preferredGazeMode: normalizeSummaryString((raw.cue.rendererHints as { preferredGazeMode?: unknown }).preferredGazeMode as string | null | undefined),
                  preferredPauseMode: normalizeSummaryString((raw.cue.rendererHints as { preferredPauseMode?: unknown }).preferredPauseMode as string | null | undefined),
                  preferredLipsyncMode: normalizeSummaryString((raw.cue.rendererHints as { preferredLipsyncMode?: unknown }).preferredLipsyncMode as string | null | undefined),
                  preferredVoiceMode: normalizeSummaryString((raw.cue.rendererHints as { preferredVoiceMode?: unknown }).preferredVoiceMode as string | null | undefined),
                  preferredPacingMode: normalizeSummaryString((raw.cue.rendererHints as { preferredPacingMode?: unknown }).preferredPacingMode as string | null | undefined),
                  ...(reasonTags.length > 0 ? { reasonTags } : {}),
                  ...(signature ? { signature } : {}),
                }
              })()
            : null,
          rendererSettle: raw.cue.rendererSettle
            ? {
                live2dFacialReleaseMs: Number.isFinite(raw.cue.rendererSettle.live2dFacialReleaseMs)
                  ? Number(raw.cue.rendererSettle.live2dFacialReleaseMs)
                  : null,
                live2dMotionFollowThroughMs: Number.isFinite(raw.cue.rendererSettle.live2dMotionFollowThroughMs)
                  ? Number(raw.cue.rendererSettle.live2dMotionFollowThroughMs)
                  : null,
                vrmActionFadeMs: Number.isFinite(raw.cue.rendererSettle.vrmActionFadeMs)
                  ? Number(raw.cue.rendererSettle.vrmActionFadeMs)
                  : null,
                vrmExpressionBlendMs: Number.isFinite(raw.cue.rendererSettle.vrmExpressionBlendMs)
                  ? Number(raw.cue.rendererSettle.vrmExpressionBlendMs)
                  : null,
              }
            : null,
        }
      : null,
    drivers: {
      body: raw.drivers?.body
        ? {
            frameMode: normalizeSummaryString(raw.drivers.body.frameMode),
            stillness: normalizeSummaryNumber(raw.drivers.body.stillness),
            gazeStability: normalizeSummaryNumber(raw.drivers.body.gazeStability),
            breathAmplitude: normalizeSummaryNumber(raw.drivers.body.breathAmplitude),
            expressivity: normalizeSummaryNumber(raw.drivers.body.expressivity),
            segmentId: normalizeSummaryString(raw.drivers.body.segmentId),
          }
        : null,
      face: raw.drivers?.face
        ? {
            ...raw.drivers.face,
            facialCue: normalizeSummaryString(raw.drivers.face.facialCue),
            preUtteranceCue: normalizeSummaryString(raw.drivers.face.preUtteranceCue),
            postUtteranceCue: normalizeSummaryString(raw.drivers.face.postUtteranceCue),
            source: normalizeSummaryString(raw.drivers.face.source),
            segmentId: normalizeSummaryString(raw.drivers.face.segmentId),
            intensity: normalizeSummaryNumber(raw.drivers.face.intensity) ?? 0,
            confidence: normalizeSummaryNumber(raw.drivers.face.confidence) ?? 0,
            holdMs: normalizeSummaryNumber(raw.drivers.face.holdMs) ?? 0,
          }
        : null,
      lipsync: raw.drivers?.lipsync
        ? {
            ...raw.drivers.lipsync,
            segmentId: normalizeSummaryString(raw.drivers.lipsync.segmentId),
            continuityHoldMs: normalizeSummaryNumber(raw.drivers.lipsync.continuityHoldMs) ?? 0,
            visemeHints: [...raw.drivers.lipsync.visemeHints],
          }
        : null,
      motion: raw.drivers?.motion
        ? {
            ...raw.drivers.motion,
            actionCue: normalizeSummaryActionCue(raw.drivers.motion.actionCue),
            attentionMode: normalizeMeasuredReturnMotionAttentionMode({
              actionCue: normalizeSummaryActionCue(raw.drivers.motion.actionCue),
              attentionMode: normalizeSummaryString(raw.drivers.motion.attentionMode),
              residentMode: resolveRawPlaybackCueResidentMode(raw),
              preferredBlinkCadence: normalizeSummaryString(raw.cue?.rendererHints?.preferredBlinkCadence ?? null),
              preferredGazeMode: normalizeSummaryString(raw.cue?.rendererHints?.preferredGazeMode ?? null),
            }),
            source: normalizeSummaryString(raw.drivers.motion.source),
            segmentId: normalizeSummaryString(raw.drivers.motion.segmentId),
            intensity: normalizeSummaryNumber(raw.drivers.motion.intensity) ?? 0,
            confidence: normalizeSummaryNumber(raw.drivers.motion.confidence) ?? 0,
            holdMs: normalizeSummaryNumber(raw.drivers.motion.holdMs) ?? 0,
          }
        : null,
      ...(raw.drivers && Object.prototype.hasOwnProperty.call(raw.drivers, 'voice')
        ? {
            voice: raw.drivers.voice
              ? {
                  ...raw.drivers.voice,
                  segmentId: normalizeSummaryString(raw.drivers.voice.segmentId),
                  source: normalizeSummaryString(raw.drivers.voice.source),
                  continuityHoldMs: normalizeSummaryNumber(raw.drivers.voice.continuityHoldMs) ?? 0,
                  cueProsodyWeight: normalizeSummaryNumber(raw.drivers.voice.cueProsodyWeight),
                  cueMouthWeight: normalizeSummaryNumber(raw.drivers.voice.cueMouthWeight),
                  cueHeadWeight: normalizeSummaryNumber(raw.drivers.voice.cueHeadWeight),
                  visemePeakWeight: normalizeSummaryNumber(raw.drivers.voice.visemePeakWeight),
                }
              : null,
          }
        : {}),
    },
  }
}

function normalizeSpeechMetadataRecord(metadata: Record<string, unknown> | null | undefined) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : null
}

function resolvePlaybackTelemetryFallbackFromSpeechRenderState(
  speechRenderState: StageEmbodimentSpeechRenderState | null | undefined,
) {
  const candidate = normalizeSpeechMetadataRecord(speechRenderState?.item?.metadata)?.embodimentPlayback
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  return cloneEmbodimentPlaybackTelemetry(candidate as EmbodimentPlaybackTelemetry)
}

function resolvePlaybackTelemetryResidentMode(
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>,
) {
  const cueResidentMode = playbackTelemetry?.cue?.rendererHints && typeof playbackTelemetry.cue.rendererHints === 'object' && 'residentMode' in playbackTelemetry.cue.rendererHints
    ? normalizeSummaryString((playbackTelemetry.cue.rendererHints as { residentMode?: unknown }).residentMode as string | null | undefined)
    : null
  if (cueResidentMode)
    return cueResidentMode
  return null
}

function resolveSummaryResidentMode(input: {
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>
  executionResidentMode?: string | null | undefined
  fallbackResidentMode?: string | null | undefined
}) {
  const playbackResidentMode = resolvePlaybackTelemetryResidentMode(input.playbackTelemetry)
  const executionResidentMode = normalizeSummaryString(input.executionResidentMode)
  const fallbackResidentMode = normalizeSummaryString(input.fallbackResidentMode)

  if (fallbackResidentMode) {
    if (playbackResidentMode && playbackResidentMode !== fallbackResidentMode)
      return fallbackResidentMode
    if (executionResidentMode && executionResidentMode !== fallbackResidentMode)
      return fallbackResidentMode
  }

  return playbackResidentMode
    ?? executionResidentMode
    ?? fallbackResidentMode
}

function resolvePlaybackTelemetryBodyContinuitySummary(
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>,
  residentMode?: string | null,
) {
  const normalizedResidentMode = normalizeSummaryString(residentMode)
  const bodyDriver = playbackTelemetry?.drivers?.body ?? null
  if (bodyDriver) {
    const rawFrameMode = normalizeSummaryString(bodyDriver.frameMode)
    const frameMode = normalizedResidentMode && rawFrameMode && rawFrameMode !== normalizedResidentMode
      ? normalizedResidentMode
      : rawFrameMode ?? normalizedResidentMode
    const stillness = formatMetric(bodyDriver.stillness)
    const gazeStability = formatMetric(bodyDriver.gazeStability)
    const breathAmplitude = formatMetric(bodyDriver.breathAmplitude)
    const expressivity = formatMetric(bodyDriver.expressivity)
    if (frameMode || stillness || gazeStability || breathAmplitude || expressivity) {
      return [
        frameMode ? `bodyMode=${frameMode}` : null,
        stillness ? `stillness=${stillness}` : null,
        gazeStability ? `bodyGaze=${gazeStability}` : null,
        breathAmplitude ? `breath=${breathAmplitude}` : null,
        expressivity ? `expressivity=${expressivity}` : null,
      ].filter((value): value is string => Boolean(value)).join(' | ') || null
    }
  }
  return null
}

function formatMetric(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return value.toFixed(2)
}

function resolveVoiceSummarySegmentId(
  voiceSummary: string | null | undefined,
) {
  const normalizedVoiceSummary = normalizeSummaryString(voiceSummary)
  if (!normalizedVoiceSummary)
    return null

  const parts = normalizedVoiceSummary
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
  const segmentPart = parts.find(part => part.startsWith('segment='))
    ?? parts.find(part => part.startsWith('seg='))
  if (!segmentPart)
    return null

  return normalizeSummaryString(segmentPart.slice(segmentPart.indexOf('=') + 1))
}

function resolvePreferredSpeechContinuitySegmentId(input: {
  driverAuthoritySegmentId?: string | null | undefined
  prosodyAuthoritySegmentId?: string | null | undefined
  cueSegmentId?: string | null | undefined
  voiceSummarySegmentId?: string | null | undefined
  bodySegmentId?: string | null | undefined
  faceSegmentId?: string | null | undefined
  motionSegmentId?: string | null | undefined
  lipsyncSegmentId?: string | null | undefined
}) {
  const driverAuthoritySegmentId = normalizeSummaryString(input.driverAuthoritySegmentId)
  const prosodyAuthoritySegmentId = normalizeSummaryString(input.prosodyAuthoritySegmentId)
  const cueSegmentId = normalizeSummaryString(input.cueSegmentId)
  const voiceSummarySegmentId = normalizeSummaryString(input.voiceSummarySegmentId)
  const bodySegmentId = normalizeSummaryString(input.bodySegmentId)
  const faceSegmentId = normalizeSummaryString(input.faceSegmentId)
  const motionSegmentId = normalizeSummaryString(input.motionSegmentId)
  const lipsyncSegmentId = normalizeSummaryString(input.lipsyncSegmentId)
  const supportingSegmentIds = [
    bodySegmentId,
    faceSegmentId,
    motionSegmentId,
    lipsyncSegmentId,
  ].filter((value): value is string => Boolean(value))
  const countSupportingSegmentMatches = (segmentId: string | null) =>
    segmentId
      ? supportingSegmentIds.filter(value => value === segmentId).length
      : 0
  const authoritySupportCount = countSupportingSegmentMatches(driverAuthoritySegmentId)
  const highestSupportCount = [
    countSupportingSegmentMatches(voiceSummarySegmentId),
    countSupportingSegmentMatches(cueSegmentId),
    countSupportingSegmentMatches(lipsyncSegmentId),
    countSupportingSegmentMatches(faceSegmentId),
    countSupportingSegmentMatches(motionSegmentId),
    countSupportingSegmentMatches(bodySegmentId),
    countSupportingSegmentMatches(prosodyAuthoritySegmentId),
    authoritySupportCount,
  ].reduce((max, count) => Math.max(max, count), 0)

  if (highestSupportCount > authoritySupportCount) {
    for (const candidate of [
      voiceSummarySegmentId,
      cueSegmentId,
      lipsyncSegmentId,
      faceSegmentId,
      motionSegmentId,
      bodySegmentId,
      prosodyAuthoritySegmentId,
      driverAuthoritySegmentId,
    ]) {
      if (countSupportingSegmentMatches(candidate) === highestSupportCount)
        return candidate
    }
  }

  return driverAuthoritySegmentId
    ?? prosodyAuthoritySegmentId
    ?? cueSegmentId
    ?? voiceSummarySegmentId
    ?? lipsyncSegmentId
    ?? faceSegmentId
    ?? motionSegmentId
    ?? bodySegmentId
    ?? null
}

function resolvePlaybackExplicitVoiceAuthority(input: {
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>
}) {
  const rawVoiceDriver = input.playbackTelemetry?.drivers.voice
  if (rawVoiceDriver) {
    const segmentId = normalizeSummaryString(rawVoiceDriver.segmentId)
    const source = normalizeSummaryString(rawVoiceDriver.source)
    if (segmentId || source) {
      return {
        segmentId,
        source,
      }
    }
  }

  const explicitVoiceAuthority = input.playbackTelemetry?.driverAuthority?.prosodyAuthority
    ?? input.playbackTelemetry?.prosodyAuthority
  if (!explicitVoiceAuthority)
    return null

  const segmentId = resolvePreferredSpeechContinuitySegmentId({
    driverAuthoritySegmentId: normalizeSummaryString(explicitVoiceAuthority.segmentId),
    prosodyAuthoritySegmentId: input.playbackTelemetry?.prosodyAuthority?.segmentId,
    cueSegmentId: input.playbackTelemetry?.cue?.id,
    bodySegmentId: input.playbackTelemetry?.drivers.body?.segmentId,
    faceSegmentId: input.playbackTelemetry?.drivers.face?.segmentId,
    motionSegmentId: input.playbackTelemetry?.drivers.motion?.segmentId,
    lipsyncSegmentId: input.playbackTelemetry?.drivers.lipsync?.segmentId,
  })
  const source = normalizeSummaryString(explicitVoiceAuthority.source)
  if (!segmentId && !source)
    return null

  return {
    segmentId,
    source,
  }
}

function resolveVoiceAuthorityMatch(input: {
  authoritySegmentId: string | null | undefined
  voiceAuthoritySegmentId?: string | null | undefined
  voiceSummary: string | null | undefined
}) {
  const authoritySegmentId = normalizeSummaryString(input.authoritySegmentId)
  if (!authoritySegmentId)
    return null

  const voiceSegmentId = normalizeSummaryString(input.voiceAuthoritySegmentId)
    ?? resolveVoiceSummarySegmentId(input.voiceSummary)
  if (!voiceSegmentId)
    return null

  return voiceSegmentId === authoritySegmentId
}

function normalizeArticulationSummary(raw: StageEmbodimentSpeechArticulationState | null | undefined) {
  if (!raw)
    return null

  const visemes = Object.entries(raw.visemes ?? {})
    .filter(([, value]) => Number.isFinite(value) && Number(value) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 3)
    .map(([key, value]) => `${key}:${Number(value).toFixed(2)}`)

  return {
    voice: raw.voice
      ? `${raw.voice.language ?? 'unknown'} | closure=${Number(raw.voice.closureBias ?? 0).toFixed(2)} | precision=${Number(raw.voice.consonantPrecision ?? 0).toFixed(2)}`
      : null,
    topVisemes: visemes.length > 0 ? visemes.join(', ') : null,
  }
}

function normalizeDriverExecutionSummary(
  raw: NormalizedPlaybackDrivers | null | undefined,
  playbackTelemetry?: ReturnType<typeof normalizePlaybackTelemetry>,
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined,
  fallbackResidentMode?: string | null,
) {
  if (!raw)
    return null

  const companionshipResidentMode = resolveSummaryResidentMode({
    playbackTelemetry: playbackTelemetry ?? null,
    fallbackResidentMode,
  })
  const companionshipReasonSummary = resolveCompanionshipReasonSummary({
    residentMode: companionshipResidentMode,
    digitalLifeSpineDigest,
  })
  const rendererHintSummary = resolvePlaybackTelemetryRendererHintSummary(playbackTelemetry ?? null)
  const authoritySegmentId = resolvePreferredSpeechContinuitySegmentId({
    driverAuthoritySegmentId: playbackTelemetry?.driverAuthority?.segmentId,
    prosodyAuthoritySegmentId: playbackTelemetry?.prosodyAuthority?.segmentId,
    cueSegmentId: playbackTelemetry?.cue?.id,
    bodySegmentId: raw.body?.segmentId,
    faceSegmentId: raw.face?.segmentId,
    motionSegmentId: raw.motion?.segmentId,
    lipsyncSegmentId: raw.lipsync?.segmentId,
  })
  const parts: string[] = []
  if (raw.body) {
    const bodyParts = [
      `body=${normalizeSummaryString(raw.body.frameMode) ?? 'none'}`,
      Number.isFinite(raw.body.stillness) ? `still=${Number(raw.body.stillness).toFixed(2)}` : null,
      Number.isFinite(raw.body.gazeStability) ? `gazeStable=${Number(raw.body.gazeStability).toFixed(2)}` : null,
      Number.isFinite(raw.body.breathAmplitude) ? `breath=${Number(raw.body.breathAmplitude).toFixed(2)}` : null,
      Number.isFinite(raw.body.expressivity) ? `express=${Number(raw.body.expressivity).toFixed(2)}` : null,
      authoritySegmentId ?? normalizeSummaryString(raw.body.segmentId)
        ? `seg=${authoritySegmentId ?? normalizeSummaryString(raw.body.segmentId)}`
        : null,
    ].filter((value): value is string => Boolean(value))

    if (bodyParts.length > 0)
      parts.push(bodyParts.join(' '))
  }
  if (raw.face) {
    const faceSummary = buildAlicizationFaceSummary({
      emotion: raw.face.emotion,
      facialCue: raw.face.facialCue,
      intensity: raw.face.intensity,
      holdMs: raw.face.holdMs,
      preUtteranceCue: raw.face.preUtteranceCue,
      postUtteranceCue: raw.face.postUtteranceCue,
      residentMode: companionshipResidentMode,
      preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence,
      preferredGazeMode: rendererHintSummary?.preferredGazeMode,
      reasonSummary: companionshipReasonSummary,
      source: raw.face.source,
      confidence: raw.face.confidence,
      segmentId: authoritySegmentId ?? raw.face.segmentId,
    })
    if (faceSummary)
      parts.push(faceSummary)
  }
  if (raw.motion) {
    const motionContinuityTiming = companionshipResidentMode === 'measured-return'
      && normalizeSummaryActionCue(raw.motion.actionCue) === 'observe_focus'
      && (rendererHintSummary?.preferredBlinkCadence === 'linger' || rendererHintSummary?.preferredGazeMode === 'soften')
      ? 'audible-body-carry'
      : null
    const motionSummary = buildAlicizationMotionSummary({
      actionCue: normalizeSummaryActionCue(raw.motion.actionCue),
      attentionMode: normalizeMeasuredReturnMotionAttentionMode({
        actionCue: normalizeSummaryActionCue(raw.motion.actionCue),
        attentionMode: raw.motion.attentionMode,
        residentMode: companionshipResidentMode,
        preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence,
        preferredGazeMode: rendererHintSummary?.preferredGazeMode,
      }),
      idleBase: raw.motion.idleBase,
      intensity: raw.motion.intensity,
      holdMs: raw.motion.holdMs,
      residentMode: companionshipResidentMode,
      continuityTiming: motionContinuityTiming,
      preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence,
      preferredGazeMode: rendererHintSummary?.preferredGazeMode,
      reasonSummary: companionshipReasonSummary,
      source: raw.motion.source,
      confidence: raw.motion.confidence,
      segmentId: authoritySegmentId ?? raw.motion.segmentId,
    })
    if (motionSummary)
      parts.push(motionSummary)
  }
  if (raw.lipsync) {
    parts.push(
      `lipsync=${raw.lipsync.mode ?? 'none'} phase=${raw.lipsync.playbackPhase ?? 'none'}${companionshipResidentMode ? ` mode=${companionshipResidentMode}` : ''}${rendererHintSummary?.summary ? ` ${rendererHintSummary.summary}` : ''}${companionshipReasonSummary ? ` reason=${companionshipReasonSummary}` : ''}`,
    )
  }
  if (raw.voice) {
    parts.push(
      `voice=${raw.voice.provenance ?? 'n/a'} phase=${raw.voice.playbackPhase ?? 'none'} seg=${normalizeSummaryString(raw.voice.segmentId) ?? 'n/a'}`,
    )
  }

  return parts.length > 0 ? parts.join(' | ') : null
}

function normalizeVisemeHintsSummary(raw: NormalizedPlaybackDrivers | null | undefined) {
  const hints = raw?.lipsync?.visemeHints ?? []
  if (hints.length === 0)
    return null

  return hints
    .map((hint) => {
      const source = normalizeSummaryString(hint.source) ?? 'n/a'
      const segmentId = normalizeSummaryString(hint.segmentId) ?? normalizeSummaryString(raw?.lipsync?.segmentId) ?? 'n/a'
      return `${hint.viseme}:${Number(hint.weight ?? 0).toFixed(2)}@${Number(hint.confidence ?? 0).toFixed(2)} src=${source} segment=${segmentId}`
    })
    .join(' | ')
}

function normalizeMeasuredReturnMotionAttentionMode(input: {
  actionCue: string | null | undefined
  attentionMode: string | null | undefined
  residentMode: string | null | undefined
  preferredBlinkCadence: string | null | undefined
  preferredGazeMode: string | null | undefined
}) {
  const actionCue = normalizeSummaryString(input.actionCue)
  const attentionMode = normalizeSummaryString(input.attentionMode)
  const residentMode = normalizeSummaryString(input.residentMode)
  const preferredBlinkCadence = normalizeSummaryString(input.preferredBlinkCadence)
  const preferredGazeMode = normalizeSummaryString(input.preferredGazeMode)

  if (
    attentionMode === 'attentive'
    && actionCue === 'observe_focus'
    && residentMode === 'measured-return'
    && (preferredBlinkCadence === 'linger' || preferredGazeMode === 'soften')
  ) {
    return 'ambient-covision'
  }

  return attentionMode
}

function resolveRawPlaybackCueResidentMode(raw: EmbodimentPlaybackTelemetry | null | undefined) {
  return normalizeSummaryString(raw?.cue?.rendererHints?.residentMode ?? null)
}

function normalizeStructuredPersonaStyleSummary(input: {
  summary: string | null | undefined
  provenance: 'authority-bound' | 'fallback-derived'
  segmentId: string | null | undefined
}) {
  const summary = normalizeSummaryString(input.summary)
  if (!summary)
    return null

  if ((!summary.includes('prosody=') && !summary.includes('beat=')) || summary.includes('provenance='))
    return summary

  return `${summary} provenance=${input.provenance} segment=${normalizeSummaryString(input.segmentId) ?? 'n/a'}`
}

function normalizeStructuredVoiceSummary(input: {
  summary: string | null | undefined
  speechArticulation: StageEmbodimentSpeechArticulationState | null | undefined
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined
  driverAuthority: NormalizedPlaybackDriverAuthority
  prosodyAuthority: NormalizedPlaybackProsodyAuthority
  drivers: NormalizedPlaybackDrivers | null
  fallbackResidentMode?: string | null
}) {
  const baseSummary = normalizeSummaryString(input.summary)
  if (!baseSummary)
    return null

  const companionshipResidentMode = resolveSummaryResidentMode({
    playbackTelemetry: input.playbackTelemetry,
    fallbackResidentMode: input.fallbackResidentMode,
  })
  const companionshipReasonSummary = resolveCompanionshipReasonSummary({
    residentMode: companionshipResidentMode,
    digitalLifeSpineDigest: input.digitalLifeSpineDigest,
  })
  const rendererHintSummary = resolvePlaybackTelemetryRendererHintSummary(input.playbackTelemetry)
  const voiceAuthoritySegmentId = resolvePreferredSpeechContinuitySegmentId({
    driverAuthoritySegmentId: input.driverAuthority?.segmentId,
    prosodyAuthoritySegmentId: input.prosodyAuthority?.segmentId,
    cueSegmentId: input.playbackTelemetry?.cue?.id,
    bodySegmentId: input.drivers?.body?.segmentId,
    faceSegmentId: input.drivers?.face?.segmentId,
    motionSegmentId: input.drivers?.motion?.segmentId,
    lipsyncSegmentId: input.drivers?.lipsync?.segmentId,
  })
  const carriesAudibleBodySegmentAuthority = Boolean(
    companionshipResidentMode === 'measured-return'
    && voiceAuthoritySegmentId
    && normalizeSummaryString(input.drivers?.body?.segmentId) === voiceAuthoritySegmentId
    && normalizeSummaryString(input.drivers?.lipsync?.segmentId) === voiceAuthoritySegmentId
    && input.drivers?.lipsync?.playbackPhase === 'playing'
    && normalizeSummaryString(input.drivers?.face?.segmentId) !== voiceAuthoritySegmentId
    && normalizeSummaryString(input.drivers?.motion?.segmentId) !== voiceAuthoritySegmentId,
  )
  const voiceContinuityTiming = companionshipResidentMode === 'measured-return'
    && carriesAudibleBodySegmentAuthority
    && (rendererHintSummary?.preferredBlinkCadence === 'linger' || rendererHintSummary?.preferredGazeMode === 'soften')
    ? 'audible-body-carry'
    : null
  const shouldExposeVoiceEmotionAuthority = companionshipResidentMode === 'repair-before-closeness'
    || carriesAudibleBodySegmentAuthority
  const faceEmotionMatchesVoiceAuthority = !voiceAuthoritySegmentId
    || !normalizeSummaryString(input.drivers?.face?.segmentId)
    || normalizeSummaryString(input.drivers?.face?.segmentId) === voiceAuthoritySegmentId
  const voiceEmotion = shouldExposeVoiceEmotionAuthority
    ? normalizeSummaryString(input.playbackTelemetry?.cue?.emotion)
    ?? (faceEmotionMatchesVoiceAuthority ? normalizeSummaryString(input.drivers?.face?.emotion) : null)
    : null
  const voiceSummary = buildAlicizationVoiceSummary({
    language: input.speechArticulation?.voice?.language,
    closureBias: input.speechArticulation?.voice?.closureBias,
    consonantPrecision: input.speechArticulation?.voice?.consonantPrecision,
    emotion: voiceEmotion,
    companionshipMode: companionshipResidentMode,
    continuityTiming: voiceContinuityTiming,
    preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence,
    preferredGazeMode: rendererHintSummary?.preferredGazeMode,
    preferredPauseMode: rendererHintSummary?.preferredPauseMode,
    preferredLipsyncMode: rendererHintSummary?.preferredLipsyncMode,
    preferredVoiceMode: rendererHintSummary?.preferredVoiceMode,
    preferredPacingMode: rendererHintSummary?.preferredPacingMode,
    reasonSummary: companionshipReasonSummary,
  })

  const summary = voiceSummary
    ? (!voiceSummary.includes('closure=') && baseSummary
        ? `${baseSummary} | ${voiceSummary}`
        : voiceSummary)
    : baseSummary

  if (!summary.includes('closure=') || summary.includes('provenance='))
    return summary

  const provenance = input.driverAuthority || input.prosodyAuthority ? 'authority-bound' : 'fallback-derived'
  const segmentId = resolvePreferredSpeechContinuitySegmentId({
    driverAuthoritySegmentId: input.driverAuthority?.segmentId,
    prosodyAuthoritySegmentId: input.prosodyAuthority?.segmentId,
    cueSegmentId: input.playbackTelemetry?.cue?.id,
    bodySegmentId: input.drivers?.body?.segmentId,
    faceSegmentId: input.drivers?.face?.segmentId,
    motionSegmentId: input.drivers?.motion?.segmentId,
    lipsyncSegmentId: input.drivers?.lipsync?.segmentId,
  }) ?? 'n/a'
  const source = normalizeSummaryString(
    input.prosodyAuthority?.source
    ?? input.drivers?.lipsync?.visemeHints?.[0]?.source
    ?? input.drivers?.face?.source
    ?? input.drivers?.motion?.source,
  ) ?? 'n/a'

  return `${summary} | provenance=${provenance} | segment=${segmentId} | source=${source}`
}

function normalizeProsodyAuthoritySummary(
  prosodyAuthority: NormalizedPlaybackProsodyAuthority,
) {
  if (!prosodyAuthority)
    return null

  return [
    `provenance=${prosodyAuthority.provenance}`,
    `segment=${prosodyAuthority.segmentId ?? 'n/a'}`,
    `source=${prosodyAuthority.source ?? 'n/a'}`,
    `mode=${prosodyAuthority.mode ?? 'n/a'}`,
    Number.isFinite(prosodyAuthority.cueProsodyWeight) ? `prosody=${Number(prosodyAuthority.cueProsodyWeight).toFixed(2)}` : null,
    Number.isFinite(prosodyAuthority.cueMouthWeight) ? `mouth=${Number(prosodyAuthority.cueMouthWeight).toFixed(2)}` : null,
    Number.isFinite(prosodyAuthority.cueHeadWeight) ? `head=${Number(prosodyAuthority.cueHeadWeight).toFixed(2)}` : null,
    Number.isFinite(prosodyAuthority.visemePeakWeight) ? `visemePeak=${Number(prosodyAuthority.visemePeakWeight).toFixed(2)}` : null,
  ].filter((value): value is string => Boolean(value)).join(' | ')
}

function normalizeProsodyDriverAttributionSummary(input: {
  prosodyAuthority: NormalizedPlaybackProsodyAuthority
  driverAuthority: NormalizedPlaybackDriverAuthority
}) {
  const prosodyAuthority = input.prosodyAuthority
  if (!prosodyAuthority)
    return null

  const matchedDrivers = input.driverAuthority?.matchedDrivers
    ? [...input.driverAuthority.matchedDrivers]
    : []
  const voiceSegmentMatched = resolveVoiceAuthorityMatch({
    authoritySegmentId: input.driverAuthority?.segmentId ?? prosodyAuthority.segmentId,
    voiceAuthoritySegmentId: prosodyAuthority.segmentId,
    voiceSummary: null,
  })
  if (voiceSegmentMatched && !matchedDrivers.includes('voice'))
    matchedDrivers.push('voice')
  const driverLead = prosodyAuthority.visemePeakWeight != null && prosodyAuthority.visemePeakWeight >= Math.max(
    prosodyAuthority.cueMouthWeight ?? 0,
    prosodyAuthority.cueHeadWeight ?? 0,
    prosodyAuthority.cueProsodyWeight ?? 0,
  )
    ? 'lipsync-led'
    : (prosodyAuthority.cueMouthWeight ?? 0) >= Math.max(
        prosodyAuthority.cueHeadWeight ?? 0,
        prosodyAuthority.cueProsodyWeight ?? 0,
      )
        ? 'mouth-led'
        : (prosodyAuthority.cueHeadWeight ?? 0) > (prosodyAuthority.cueProsodyWeight ?? 0)
            ? 'head-led'
            : 'prosody-led'

  return [
    `lead=${driverLead}`,
    `drivers=${matchedDrivers.length > 0 ? matchedDrivers.join(',') : 'n/a'}`,
    `segment=${prosodyAuthority.segmentId ?? 'n/a'}`,
    `source=${prosodyAuthority.source ?? 'n/a'}`,
    `mode=${prosodyAuthority.mode ?? 'n/a'}`,
  ].join(' | ')
}

function normalizeProsodyExecutionAlignmentSummary(input: {
  articulation: StageEmbodimentSpeechArticulationState | null
  prosodyDriverAttributionSummary: string | null
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  visemeIntensity: number
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
}) {
  const attribution = normalizeSummaryString(input.prosodyDriverAttributionSummary)
  if (!attribution)
    return null

  const lead = attribution.split(' | ').find(part => part.startsWith('lead='))?.slice(5) ?? null
  const authoritySegmentId = attribution.split(' | ').find(part => part.startsWith('segment='))?.slice(8) ?? null
  if (!lead)
    return attribution

  const closureLedMouthProof = Boolean(
    authoritySegmentId
    && Number.isFinite(input.visemeIntensity)
    && Number(input.visemeIntensity) > 0.18
    && Number.isFinite(input.articulation?.lipClosure)
    && Number(input.articulation?.lipClosure) > 0.28
    && Number.isFinite(input.articulation?.visemes.closed)
    && Number(input.articulation?.visemes.closed) > 0.32,
  )
  const hasAuthorityScopedLipSyncProof = (lipSync: {
    active: boolean
    dominantViseme: string | null
    segmentId: string | null
  } | null | undefined) => {
    if (!lipSync)
      return false

    const hasRuntimeLipSyncEvidence = Boolean(
      lipSync.active
      || lipSync.dominantViseme,
    )
    if (!authoritySegmentId)
      return hasRuntimeLipSyncEvidence

    return lipSync.segmentId === authoritySegmentId
      && (hasRuntimeLipSyncEvidence || closureLedMouthProof)
  }
  const live2dSupportsFace = Boolean(
    input.live2dExecution?.activeExpression?.name
    || input.live2dExecution?.cue?.facialCue,
  )
  const live2dSupportsLipSync = hasAuthorityScopedLipSyncProof(input.live2dExecution?.activeLipSync)
  const vrmSupportsFace = Boolean(
    input.vrmExecution?.activeEmotion?.resolvedExpressionNames[0]
    || input.vrmExecution?.activeFacialCue?.name,
  )
  const vrmSupportsLipSync = hasAuthorityScopedLipSyncProof(input.vrmExecution?.activeLipSync)

  const executionSurface = live2dSupportsLipSync
    ? 'live2d-mouth'
    : live2dSupportsFace
      ? 'live2d-face'
      : vrmSupportsLipSync
        ? 'vrm-mouth'
        : vrmSupportsFace
          ? 'vrm-face'
          : 'execution-pending'

  const alignment = lead === 'lipsync-led'
    ? executionSurface === 'vrm-mouth' || executionSurface === 'live2d-mouth'
      ? 'aligned'
      : 'awaiting-visual-mouth-proof'
    : executionSurface === 'execution-pending'
      ? 'pending'
      : 'aligned'

  return `${attribution} | execution=${executionSurface} | alignment=${alignment}`
}

function normalizeLipsyncExecutionSummary(input: {
  articulation: StageEmbodimentSpeechArticulationState | null
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>
  visemeIntensity: number
  visemeHintsSummary: string | null
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined
}) {
  const lipsyncDriver = input.playbackTelemetry?.drivers?.lipsync ?? null
  const articulation = input.articulation
  const companionshipResidentMode = resolvePlaybackTelemetryResidentMode(input.playbackTelemetry)
  const companionshipReasonSummary = resolveCompanionshipReasonSummary({
    residentMode: companionshipResidentMode,
    digitalLifeSpineDigest: input.digitalLifeSpineDigest,
  })
  const rendererHintSummary = resolvePlaybackTelemetryRendererHintSummary(input.playbackTelemetry)
  const hasMeaningfulVisemeIntensity = Number.isFinite(input.visemeIntensity)
    && Number(input.visemeIntensity) > 0.015
  const visemeIntensity = hasMeaningfulVisemeIntensity
    ? normalizeSummaryNumber(input.visemeIntensity)
    : null
  const hasMeaningfulMouthClosure = Number.isFinite(articulation?.lipClosure)
    && Number(articulation?.lipClosure) > 0.015
  const mouthClosure = hasMeaningfulMouthClosure
    ? normalizeSummaryNumber(articulation?.lipClosure)
    : null
  const topViseme = articulation
    ? Object.entries(articulation.visemes ?? {})
      .filter(([, value]) => Number.isFinite(value) && Number(value) > 0)
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .map(([name, value]) => `${name}:${Number(value).toFixed(2)}`)
      .at(0) ?? null
    : null
  const primaryVisemeHint = lipsyncDriver?.visemeHints?.[0] ?? null
  const hasMeaningfulContinuityHold = Number.isFinite(lipsyncDriver?.continuityHoldMs)
    && Number(lipsyncDriver?.continuityHoldMs) > 0
  const continuityTiming = companionshipResidentMode === 'measured-return'
    && hasMeaningfulContinuityHold
    && Number(lipsyncDriver?.continuityHoldMs) >= 360
    && (rendererHintSummary?.preferredBlinkCadence === 'linger' || rendererHintSummary?.preferredGazeMode === 'soften')
    ? 'body-lipsync-carry'
    : null
  const continuityHoldMs = hasMeaningfulContinuityHold
    ? lipsyncDriver?.continuityHoldMs ?? null
    : null
  const sharedSummary = buildAlicizationLipsyncSummary({
    mode: lipsyncDriver?.mode ?? null,
    phase: lipsyncDriver?.playbackPhase ?? null,
    continuityHoldMs,
    topViseme,
    hintTrail: input.visemeHintsSummary,
    hintViseme: !input.visemeHintsSummary ? primaryVisemeHint?.viseme ?? null : null,
    companionshipMode: companionshipResidentMode,
    continuityTiming,
    preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence,
    preferredGazeMode: rendererHintSummary?.preferredGazeMode,
    preferredPauseMode: rendererHintSummary?.preferredPauseMode,
    preferredLipsyncMode: rendererHintSummary?.preferredLipsyncMode,
    preferredVoiceMode: rendererHintSummary?.preferredVoiceMode,
    preferredPacingMode: rendererHintSummary?.preferredPacingMode,
    reasonSummary: continuityTiming ? companionshipReasonSummary : null,
    source: !input.visemeHintsSummary ? primaryVisemeHint?.source ?? null : null,
    confidence: !input.visemeHintsSummary ? primaryVisemeHint?.confidence ?? null : null,
    segmentId: continuityTiming
      ? primaryVisemeHint?.segmentId ?? lipsyncDriver?.segmentId ?? null
      : null,
  })
  const sharedSummaryParts = sharedSummary
    ? sharedSummary.split(' | ').filter(Boolean)
    : []
  const leadingSharedParts = sharedSummaryParts.filter(part => part.startsWith('mode=') || part.startsWith('phase='))
  const trailingSharedParts = sharedSummaryParts.filter(part => !part.startsWith('mode=') && !part.startsWith('phase='))
  const evidenceTail = [
    visemeIntensity != null ? `visemeIntensity=${Number(visemeIntensity).toFixed(2)}` : null,
    mouthClosure != null ? `closure=${Number(mouthClosure).toFixed(2)}` : null,
    companionshipReasonSummary ? `reason=${companionshipReasonSummary}` : null,
  ].filter((value): value is string => Boolean(value))

  if (
    !input.visemeHintsSummary
    && visemeIntensity == null
    && mouthClosure == null
    && !topViseme
    && !companionshipResidentMode
    && !rendererHintSummary?.summary
    && !companionshipReasonSummary
  ) {
    return null
  }

  return [
    ...leadingSharedParts,
    ...evidenceTail,
    ...trailingSharedParts,
  ].filter((value): value is string => Boolean(value)).join(' | ')
}

function normalizeAuthoritySummary(
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>,
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>,
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>,
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined,
  voiceSummary?: string | null,
  fallbackResidentMode?: string | null,
) {
  if (!playbackTelemetry)
    return null

  const executionCue = playbackTelemetry.rendererTarget === 'live2d'
    ? live2dExecution?.cue
    : playbackTelemetry.rendererTarget === 'vrm'
      ? vrmExecution?.cue
      : live2dExecution?.cue ?? vrmExecution?.cue ?? null
  const companionshipResidentMode = resolveSummaryResidentMode({
    playbackTelemetry,
    executionResidentMode: executionCue?.residentMode ?? null,
    fallbackResidentMode,
  })
  const matchedSources = playbackTelemetry.driverAuthority?.sources ?? []
  const explicitVoiceAuthority = resolvePlaybackExplicitVoiceAuthority({
    playbackTelemetry,
  })
  const voiceAuthority = (() => {
    const normalizedVoiceSummary = normalizeSummaryString(voiceSummary)
    if (normalizedVoiceSummary) {
      const voiceSegmentId = resolveVoiceSummarySegmentId(normalizedVoiceSummary)
      const voiceSourceMatch = /(?:^|\|)\s*source=([^|]+)/.exec(normalizedVoiceSummary)
      return {
        cue: null,
        source: normalizeSummaryString(voiceSourceMatch?.[1] ?? null),
        confidence: null,
        segmentId: voiceSegmentId,
      } satisfies StageEmbodimentDriverAuthoritySummaryEntry
    }

    if (!explicitVoiceAuthority)
      return null

    return {
      cue: null,
      source: explicitVoiceAuthority.source,
      confidence: null,
      segmentId: explicitVoiceAuthority.segmentId,
    } satisfies StageEmbodimentDriverAuthoritySummaryEntry
  })()
  const authoritySegmentId = resolvePreferredSpeechContinuitySegmentId({
    driverAuthoritySegmentId: playbackTelemetry.driverAuthority?.segmentId,
    prosodyAuthoritySegmentId: playbackTelemetry.prosodyAuthority?.segmentId,
    cueSegmentId: playbackTelemetry.cue?.id,
    voiceSummarySegmentId: voiceAuthority?.segmentId ?? null,
    bodySegmentId: playbackTelemetry.drivers.body?.segmentId,
    faceSegmentId: playbackTelemetry.drivers.face?.segmentId,
    motionSegmentId: playbackTelemetry.drivers.motion?.segmentId,
    lipsyncSegmentId: playbackTelemetry.drivers.lipsync?.segmentId,
  })
  const authority = resolveEffectiveAuthorityMatchFlags({
    driverAuthority: playbackTelemetry.driverAuthority ?? null,
    live2dExecution,
    vrmExecution,
    authoritySegmentId,
    voiceAuthoritySegmentId: voiceAuthority?.segmentId ?? null,
    voiceSummary,
  })
  const effectiveMatchedDrivers = STAGE_EMBODIMENT_CONVERGENCE_DRIVERS.filter((driver) => {
    switch (driver) {
      case 'body':
        return authority.bodySegmentMatched === true
      case 'face':
        return authority.faceSegmentMatched === true
      case 'motion':
        return authority.motionSegmentMatched === true
      case 'lipsync':
        return authority.lipsyncSegmentMatched === true
      case 'voice':
        return authority.voiceSegmentMatched === true
      default:
        return false
    }
  })
  const faceMatched = authority.faceSegmentMatched
  const motionMatched = authority.motionSegmentMatched
  const lipsyncMatched = authority.lipsyncSegmentMatched
  const bodyMatched = authority.bodySegmentMatched
  const voiceMatched = authority.voiceSegmentMatched
  const target = playbackTelemetry.rendererTarget ?? playbackTelemetry.driverAuthority?.rendererTarget ?? null
  const matchSummary = `body:${bodyMatched == null ? 'n/a' : bodyMatched ? 'yes' : 'no'} face:${faceMatched == null ? 'n/a' : faceMatched ? 'yes' : 'no'} motion:${motionMatched == null ? 'n/a' : motionMatched ? 'yes' : 'no'} lipsync:${lipsyncMatched == null ? 'n/a' : lipsyncMatched ? 'yes' : 'no'} voice:${voiceMatched == null ? 'n/a' : voiceMatched ? 'yes' : 'no'}`
  const authorityMismatchSummary = buildAuthorityMismatchSummary(authority)
  const driverExecutionSummary = normalizeDriverExecutionSummary(
    playbackTelemetry.drivers,
    playbackTelemetry,
    digitalLifeSpineDigest,
    companionshipResidentMode,
  )
  const authorityMismatchReasonSummary = buildAuthorityMismatchReasonSummary({
    authority,
    matchedSources,
    driverExecutionSummary,
    voiceAuthority,
  })
  const authorityLaneSummary = resolveAuthorityLaneSummary(authority)
  const authorityMismatchDisplay = resolveAuthorityMismatchDisplay({
    authorityLaneSummary,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
  })
  const authorityRemainingOpenSummary = resolveAuthorityRemainingOpenSummary(authority)
  const companionshipReasonSummary = resolveCompanionshipReasonSummary({
    residentMode: companionshipResidentMode,
    digitalLifeSpineDigest,
  })
  const rendererHintSummary = mergeRendererHintSummaries(
    resolvePlaybackTelemetryRendererHintSummary(playbackTelemetry),
    resolveExecutionRendererHintSummary({
      live2dExecution,
      vrmExecution,
      rendererTarget: playbackTelemetry.rendererTarget ?? playbackTelemetry.driverAuthority?.rendererTarget ?? null,
    }),
  )
  const bodyContinuitySummary = resolvePlaybackTelemetryBodyContinuitySummary(
    playbackTelemetry,
    companionshipResidentMode,
  )
  const authorityContinuityTiming = companionshipResidentMode === 'measured-return'
    && (
      authorityLaneSummary === 'lane=body+lipsync-only'
      || authorityLaneSummary === 'lane=body+face+motion-only'
    )
    && (
      rendererHintSummary?.preferredBlinkCadence === 'linger'
      || rendererHintSummary?.preferredGazeMode === 'soften'
    )
    ? 'body-lipsync-carry'
    : companionshipResidentMode === 'measured-return'
      && (
        authorityLaneSummary === 'lane=body+voice-only'
        || authorityLaneSummary === 'lane=body+lipsync+voice-only'
        || authorityLaneSummary === 'lane=body+face+motion+voice-only'
      )
      && (
        rendererHintSummary?.preferredBlinkCadence === 'linger'
        || rendererHintSummary?.preferredGazeMode === 'soften'
      )
      ? 'audible-body-carry'
      : null
  const surfacedAuthoritySegmentId = playbackTelemetry.driverAuthority
    ? authoritySegmentId
    : null
  if (!playbackTelemetry?.cue) {
    const hasAuthoritySignal = Boolean(
      playbackTelemetry.driverAuthority
      || target
      || effectiveMatchedDrivers.length > 0
      || matchedSources.length > 0,
    )
    if (!hasAuthoritySignal && !authorityMismatchSummary && !authorityMismatchReasonSummary && !authorityMismatchDisplay)
      return null

    return {
      cueId: null,
      segmentId: surfacedAuthoritySegmentId,
      rendererTarget: target,
      matchedDrivers: effectiveMatchedDrivers,
      matchedSources,
      bindingSummary: [
        `target=${target ?? 'n/a'} | drivers=${effectiveMatchedDrivers.length > 0 ? effectiveMatchedDrivers.join(', ') : 'n/a'} | sources=${matchedSources.length > 0 ? matchedSources.join(', ') : 'n/a'} | matches=${matchSummary}`,
        authorityLaneSummary,
        authorityRemainingOpenSummary,
        companionshipResidentMode ? `mode=${companionshipResidentMode}` : null,
        rendererHintSummary?.summary,
        authorityContinuityTiming ? `timing=${authorityContinuityTiming}` : null,
        bodyContinuitySummary,
        companionshipReasonSummary ? `reason=${companionshipReasonSummary}` : null,
      ].filter((value): value is string => Boolean(value)).join(' | '),
      matchSummary,
      authorityMismatchSummary,
      authorityMismatchReasonSummary,
      authorityMismatchDisplay,
      settleSummary: [
        `authority-bound | segment=${surfacedAuthoritySegmentId ?? 'n/a'} | target=${target ?? 'n/a'} | drivers=${effectiveMatchedDrivers.length > 0 ? effectiveMatchedDrivers.join(', ') : 'n/a'} | sources=${matchedSources.length > 0 ? matchedSources.join(', ') : 'n/a'}`,
        authorityLaneSummary,
        authorityRemainingOpenSummary,
        companionshipResidentMode ? `mode=${companionshipResidentMode}` : null,
        rendererHintSummary?.summary,
        authorityContinuityTiming ? `timing=${authorityContinuityTiming}` : null,
        bodyContinuitySummary,
        companionshipReasonSummary ? `reason=${companionshipReasonSummary}` : null,
      ].filter((value): value is string => Boolean(value)).join(' | '),
    }
  }

  const settleSummaryPrefix = playbackTelemetry.driverAuthority
    ? 'authority-bound'
    : 'fallback-derived'
  const lipsyncDriver = playbackTelemetry.drivers.lipsync
  const settleTimingSummary = playbackTelemetry.cue?.rendererSettle
    ? [
        Number.isFinite(playbackTelemetry.cue.rendererSettle.live2dFacialReleaseMs) ? `live2dFace=${Number(playbackTelemetry.cue.rendererSettle.live2dFacialReleaseMs)}ms` : null,
        Number.isFinite(playbackTelemetry.cue.rendererSettle.live2dMotionFollowThroughMs)
          ? `live2dMotion=${Number(playbackTelemetry.cue.rendererSettle.live2dMotionFollowThroughMs)}ms`
          : null,
        Number.isFinite(lipsyncDriver?.continuityHoldMs)
        && Number(lipsyncDriver?.continuityHoldMs) > 0
          ? `live2dMouth=${Number(lipsyncDriver?.continuityHoldMs)}ms`
          : null,
        Number.isFinite(playbackTelemetry.cue.rendererSettle.vrmExpressionBlendMs) ? `vrmExpr=${Number(playbackTelemetry.cue.rendererSettle.vrmExpressionBlendMs)}ms` : null,
        Number.isFinite(playbackTelemetry.cue.rendererSettle.vrmActionFadeMs) ? `vrmAction=${Number(playbackTelemetry.cue.rendererSettle.vrmActionFadeMs)}ms` : null,
      ].filter((value): value is string => Boolean(value)).join(' | ')
    : null

  return {
    cueId: playbackTelemetry.cue.id ?? null,
    segmentId: surfacedAuthoritySegmentId,
    rendererTarget: target,
    matchedDrivers: effectiveMatchedDrivers,
    matchedSources,
    bindingSummary: [
      `target=${target ?? 'n/a'} | drivers=${effectiveMatchedDrivers.length > 0 ? effectiveMatchedDrivers.join(', ') : 'n/a'} | sources=${matchedSources.length > 0 ? matchedSources.join(', ') : 'n/a'} | matches=${matchSummary}`,
      authorityLaneSummary,
      authorityRemainingOpenSummary,
      companionshipResidentMode ? `mode=${companionshipResidentMode}` : null,
      rendererHintSummary?.summary,
      authorityContinuityTiming ? `timing=${authorityContinuityTiming}` : null,
      bodyContinuitySummary,
      companionshipReasonSummary ? `reason=${companionshipReasonSummary}` : null,
    ].filter((value): value is string => Boolean(value)).join(' | '),
    matchSummary,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
    settleSummary: [
      `${settleSummaryPrefix} | segment=${surfacedAuthoritySegmentId ?? 'n/a'} | target=${target ?? 'n/a'} | drivers=${effectiveMatchedDrivers.length > 0 ? effectiveMatchedDrivers.join(', ') : 'n/a'} | sources=${matchedSources.length > 0 ? matchedSources.join(', ') : 'n/a'}`,
      authorityLaneSummary,
      authorityRemainingOpenSummary,
      companionshipResidentMode ? `mode=${companionshipResidentMode}` : null,
      rendererHintSummary?.summary,
      authorityContinuityTiming ? `timing=${authorityContinuityTiming}` : null,
      bodyContinuitySummary,
      companionshipReasonSummary ? `reason=${companionshipReasonSummary}` : null,
      settleTimingSummary,
    ].filter((value): value is string => Boolean(value)).join(' | '),
  }
}

function normalizeCueMicroSummary(
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>,
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined,
) {
  if (!playbackTelemetry?.cue)
    return null

  const cueSummaryProvenance = playbackTelemetry.driverAuthority
    ? 'authority-bound'
    : 'fallback-derived'
  const cueSummarySegmentId = normalizeSummaryString(
    playbackTelemetry.cue.id
    ?? playbackTelemetry.driverAuthority?.segmentId,
  ) ?? 'n/a'
  const companionshipResidentMode = resolvePlaybackTelemetryResidentMode(playbackTelemetry)
  const companionshipReasonSummary = resolveCompanionshipReasonSummary({
    residentMode: companionshipResidentMode,
    digitalLifeSpineDigest,
  })
  const rendererHintSummary = resolvePlaybackTelemetryRendererHintSummary(playbackTelemetry)

  return {
    cueId: playbackTelemetry.cue.id ?? null,
    cueText: playbackTelemetry.cue.text ?? null,
    cue: `${playbackTelemetry.cue.facialCue ?? 'none'} / ${playbackTelemetry.cue.actionCue ?? 'none'} | prosody=${Number(playbackTelemetry.cue.prosodyWeight ?? 0).toFixed(2)} mouth=${Number(playbackTelemetry.cue.mouthWeight ?? 0).toFixed(2)} head=${Number(playbackTelemetry.cue.headWeight ?? 0).toFixed(2)} provenance=${cueSummaryProvenance} segment=${cueSummarySegmentId}`,
    personaStyle: normalizeStructuredPersonaStyleSummary({
      summary: playbackTelemetry.cue.personaStyleSummary,
      provenance: cueSummaryProvenance,
      segmentId: cueSummarySegmentId,
    }),
    timing: [
      `facial=${playbackTelemetry.cue.facialHoldMs ?? 0} action=${playbackTelemetry.cue.actionHoldMs ?? 0} emotion=${playbackTelemetry.cue.emotionHoldMs ?? 0}`,
      playbackTelemetry.cue.actionWindow ?? 'n/a',
      playbackTelemetry.cue.interruptMode ?? 'n/a',
      playbackTelemetry.cue.settleMode ?? 'n/a',
      companionshipResidentMode ? `mode=${companionshipResidentMode}` : null,
      rendererHintSummary?.summary,
      companionshipReasonSummary ? `reason=${companionshipReasonSummary}` : null,
    ].filter((value): value is string => Boolean(value)).join(' | '),
  }
}

function normalizeSpeechAlerts(input: {
  authorityMismatchDisplay: string | null
  driverAuthority: NormalizedPlaybackDriverAuthority
  drivers?: NormalizedPlaybackDrivers | null
  cueSegmentId?: string | null
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  playbackTelemetry?: ReturnType<typeof normalizePlaybackTelemetry>
  prosodyAuthoritySegmentId?: string | null
  prosodyExecutionAlignmentSummary: string | null
  rendererAlignment: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
  voiceSummary?: string | null
}) {
  const alerts: StageEmbodimentDiagnosticsSnapshot['speech']['alerts'] = []
  const explicitVoiceAuthority = resolvePlaybackExplicitVoiceAuthority({
    playbackTelemetry: input.playbackTelemetry ?? null,
  })
  const voiceAuthoritySegmentId = input.rendererAlignment.live2d?.voiceDriverSegmentId
    ?? input.rendererAlignment.vrm?.voiceDriverSegmentId
    ?? resolveVoiceSummarySegmentId(input.voiceSummary ?? null)
    ?? explicitVoiceAuthority?.segmentId
  const authoritySegmentId = resolvePreferredSpeechContinuitySegmentId({
    driverAuthoritySegmentId: input.driverAuthority?.segmentId,
    prosodyAuthoritySegmentId: input.prosodyAuthoritySegmentId,
    cueSegmentId: input.cueSegmentId,
    voiceSummarySegmentId: voiceAuthoritySegmentId,
    bodySegmentId: input.drivers?.body?.segmentId,
    faceSegmentId: input.drivers?.face?.segmentId,
    motionSegmentId: input.drivers?.motion?.segmentId,
    lipsyncSegmentId: input.drivers?.lipsync?.segmentId,
  })
  const hasExplicitAudibleSameHerMetadata = (entry: {
    signature?: string | null
    reasonTags?: string[] | null
  } | null | undefined) => {
    const signature = typeof entry?.signature === 'string'
      ? entry.signature.trim()
      : null
    const reasonTags = (entry?.reasonTags ?? [])
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim())
      .filter(Boolean)

    return signature === 'embodiment:audible-identity-continuity-line'
      || signature === 'embodiment:body-lipsync-voice-rejoin'
      || reasonTags.includes('embodiment:audible-identity-continuity-line')
      || reasonTags.includes('embodiment:body-lipsync-voice-rejoin')
  }
  const hasSameSegmentFaceMotionRecovery = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => {
    const faceSegmentId = typeof entry?.faceDriverSegmentId === 'string'
      ? entry.faceDriverSegmentId.trim()
      : null
    const motionSegmentId = typeof entry?.motionDriverSegmentId === 'string'
      ? entry.motionDriverSegmentId.trim()
      : null

    return Boolean(
      faceSegmentId
      && motionSegmentId
      && faceSegmentId === motionSegmentId
      && entry?.faceDriverCue
      && entry?.motionDriverCue,
    )
  }
  const hasSameSegmentFaceMotionBodyRecovery = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => {
    const bodySegmentId = typeof entry?.bodyDriverSegmentId === 'string'
      ? entry.bodyDriverSegmentId.trim()
      : null
    const faceSegmentId = typeof entry?.faceDriverSegmentId === 'string'
      ? entry.faceDriverSegmentId.trim()
      : null
    const motionSegmentId = typeof entry?.motionDriverSegmentId === 'string'
      ? entry.motionDriverSegmentId.trim()
      : null

    return Boolean(
      bodySegmentId
      && faceSegmentId
      && motionSegmentId
      && bodySegmentId === faceSegmentId
      && bodySegmentId === motionSegmentId
      && entry?.faceDriverCue
      && entry?.motionDriverCue,
    )
  }
  const hasSameSegmentBodyOnlyRecovery = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => {
    const bodySegmentId = typeof entry?.bodyDriverSegmentId === 'string'
      ? entry.bodyDriverSegmentId.trim()
      : null
    const faceSegmentId = typeof entry?.faceDriverSegmentId === 'string'
      ? entry.faceDriverSegmentId.trim()
      : null
    const motionSegmentId = typeof entry?.motionDriverSegmentId === 'string'
      ? entry.motionDriverSegmentId.trim()
      : null
    const lipsyncSegmentId = typeof entry?.lipsyncDriverSegmentId === 'string'
      ? entry.lipsyncDriverSegmentId.trim()
      : null
    const voiceSegmentId = typeof entry?.voiceDriverSegmentId === 'string'
      ? entry.voiceDriverSegmentId.trim()
      : null

    return Boolean(
      bodySegmentId
      && bodySegmentId !== faceSegmentId
      && bodySegmentId !== motionSegmentId
      && bodySegmentId !== lipsyncSegmentId
      && bodySegmentId !== voiceSegmentId,
    )
  }
  const hasSameSegmentBodyVoiceRecovery = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => {
    const faceSegmentId = typeof entry?.faceDriverSegmentId === 'string'
      ? entry.faceDriverSegmentId.trim()
      : null
    const motionSegmentId = typeof entry?.motionDriverSegmentId === 'string'
      ? entry.motionDriverSegmentId.trim()
      : null
    const bodySegmentId = typeof entry?.bodyDriverSegmentId === 'string'
      ? entry.bodyDriverSegmentId.trim()
      : null
    const lipsyncSegmentId = typeof entry?.lipsyncDriverSegmentId === 'string'
      ? entry.lipsyncDriverSegmentId.trim()
      : null
    const voiceSegmentId = typeof entry?.voiceDriverSegmentId === 'string'
      ? entry.voiceDriverSegmentId.trim()
      : null

    return Boolean(
      bodySegmentId
      && voiceSegmentId
      && bodySegmentId === voiceSegmentId
      && lipsyncSegmentId !== bodySegmentId
      && faceSegmentId !== bodySegmentId
      && motionSegmentId !== bodySegmentId,
    )
  }
  const hasSameSegmentBodyLipsyncVoiceRecovery = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => {
    const faceSegmentId = typeof entry?.faceDriverSegmentId === 'string'
      ? entry.faceDriverSegmentId.trim()
      : null
    const motionSegmentId = typeof entry?.motionDriverSegmentId === 'string'
      ? entry.motionDriverSegmentId.trim()
      : null
    const bodySegmentId = typeof entry?.bodyDriverSegmentId === 'string'
      ? entry.bodyDriverSegmentId.trim()
      : null
    const lipsyncSegmentId = typeof entry?.lipsyncDriverSegmentId === 'string'
      ? entry.lipsyncDriverSegmentId.trim()
      : null
    const voiceSegmentId = typeof entry?.voiceDriverSegmentId === 'string'
      ? entry.voiceDriverSegmentId.trim()
      : null

    return Boolean(
      bodySegmentId
      && lipsyncSegmentId
      && voiceSegmentId
      && bodySegmentId === lipsyncSegmentId
      && bodySegmentId === voiceSegmentId
      && faceSegmentId !== bodySegmentId
      && motionSegmentId !== bodySegmentId,
    )
  }
  const hasSameSegmentEmbodiedRecovery = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => Boolean(
    hasSameSegmentFaceMotionBodyRecovery(entry)
    || hasSameSegmentBodyLipsyncVoiceRecovery(entry)
    || hasSameSegmentBodyVoiceRecovery(entry)
    || hasSameSegmentBodyOnlyRecovery(entry),
  )
  const hasSameSegmentLipsyncVoiceRecovery = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => {
    const bodySegmentId = typeof entry?.bodyDriverSegmentId === 'string'
      ? entry.bodyDriverSegmentId.trim()
      : null
    const faceSegmentId = typeof entry?.faceDriverSegmentId === 'string'
      ? entry.faceDriverSegmentId.trim()
      : null
    const motionSegmentId = typeof entry?.motionDriverSegmentId === 'string'
      ? entry.motionDriverSegmentId.trim()
      : null
    const lipsyncSegmentId = typeof entry?.lipsyncDriverSegmentId === 'string'
      ? entry.lipsyncDriverSegmentId.trim()
      : null
    const voiceSegmentId = typeof entry?.voiceDriverSegmentId === 'string'
      ? entry.voiceDriverSegmentId.trim()
      : null

    return Boolean(
      lipsyncSegmentId
      && voiceSegmentId
      && lipsyncSegmentId === voiceSegmentId
      && !bodySegmentId
      && faceSegmentId !== lipsyncSegmentId
      && motionSegmentId !== lipsyncSegmentId,
    )
  }
  const hasRendererExpressionEvidence = (entry: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['live2d'] | StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']['vrm']) => Boolean(
    entry?.predicted
    || entry?.actual,
  )

  const live2d = input.rendererAlignment.live2d
  if (live2d && hasRendererExpressionEvidence(live2d) && live2d.driftKind === 'resident-not-yet-applied') {
    if (hasSameSegmentEmbodiedRecovery(live2d)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-partial-recovery',
        message: hasSameSegmentFaceMotionBodyRecovery(live2d)
          ? 'Live2D resident prediction has not been applied yet, but body, face, and motion authority have already re-formed on the same segment.'
          : hasSameSegmentBodyLipsyncVoiceRecovery(live2d)
            ? 'Live2D resident prediction has not been applied yet, but the audible identity-continuity line has already re-formed on the same segment.'
            : hasSameSegmentBodyVoiceRecovery(live2d)
              ? 'Live2D resident prediction has not been applied yet, but the resident body line and identity-continuity voice line have already re-formed on the same segment.'
              : 'Live2D resident prediction has not been applied yet, but the resident body line has already re-formed on the same segment.',
      })
    }
    else if (hasSameSegmentLipsyncVoiceRecovery(live2d)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-partial-recovery',
        message: 'Live2D resident prediction has not been applied yet, but the audible identity-continuity line has already re-formed on the same segment.',
      })
    }
    else {
      alerts.push({
        severity: 'info',
        code: 'renderer-live2d-pending',
        message: 'Live2D resident prediction has not been applied yet.',
      })
    }
  }
  else if (live2d && hasRendererExpressionEvidence(live2d) && live2d.driftKind === 'alias-resolution-drift') {
    if (hasSameSegmentFaceMotionRecovery(live2d) || hasSameSegmentEmbodiedRecovery(live2d)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-partial-recovery',
        message: hasSameSegmentFaceMotionBodyRecovery(live2d)
          ? 'Live2D expression names still differ, but body, face, and motion authority have already re-formed on the same segment.'
          : hasSameSegmentBodyLipsyncVoiceRecovery(live2d)
            ? 'Live2D expression names still differ, but the audible identity-continuity line has already re-formed on the same segment.'
            : hasSameSegmentBodyVoiceRecovery(live2d)
              ? 'Live2D expression names still differ, but the resident body line and identity-continuity voice line have already re-formed on the same segment.'
              : hasSameSegmentFaceMotionRecovery(live2d)
                ? 'Live2D expression names still differ, but face and motion authority have already re-formed on the same segment.'
                : 'Live2D expression names still differ, but the resident body line has already re-formed on the same segment.',
      })
    }
    else if (hasSameSegmentLipsyncVoiceRecovery(live2d)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-partial-recovery',
        message: 'Live2D expression names still differ, but the audible identity-continuity line has already re-formed on the same segment.',
      })
    }
    else {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-drift',
        message: 'Live2D actual expression diverged from resident predicted expression.',
      })
    }
  }
  else if (live2d && hasRendererExpressionEvidence(live2d) && live2d.driftKind === 'runtime-only-visible') {
    if (hasSameSegmentEmbodiedRecovery(live2d)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-partial-recovery',
        message: hasSameSegmentFaceMotionBodyRecovery(live2d)
          ? 'Live2D is showing a runtime expression before resident prediction, but body, face, and motion authority have already re-formed on the same segment.'
          : hasSameSegmentBodyLipsyncVoiceRecovery(live2d)
            ? 'Live2D is showing a runtime expression before resident prediction, but the audible identity-continuity line has already re-formed on the same segment.'
            : hasSameSegmentBodyVoiceRecovery(live2d)
              ? 'Live2D is showing a runtime expression before resident prediction, but the resident body line and identity-continuity voice line have already re-formed on the same segment.'
              : 'Live2D is showing a runtime expression before resident prediction, but the resident body line has already re-formed on the same segment.',
      })
    }
    else if (hasSameSegmentLipsyncVoiceRecovery(live2d)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-partial-recovery',
        message: 'Live2D is showing a runtime expression before resident prediction, but the audible identity-continuity line has already re-formed on the same segment.',
      })
    }
    else {
      alerts.push({
        severity: 'warn',
        code: 'renderer-live2d-runtime-only',
        message: 'Live2D is showing a runtime expression without a resident predicted expression.',
      })
    }
  }

  const vrm = input.rendererAlignment.vrm
  if (vrm && hasRendererExpressionEvidence(vrm) && vrm.driftKind === 'resident-not-yet-applied') {
    if (hasSameSegmentEmbodiedRecovery(vrm)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: hasSameSegmentFaceMotionBodyRecovery(vrm)
          ? 'VRM resident prediction has not been applied yet, but body, face, and motion authority have already re-formed on the same segment.'
          : hasSameSegmentBodyLipsyncVoiceRecovery(vrm)
            ? 'VRM resident prediction has not been applied yet, but the audible identity-continuity line has already re-formed on the same segment.'
            : hasSameSegmentBodyVoiceRecovery(vrm)
              ? 'VRM resident prediction has not been applied yet, but the resident body line and identity-continuity voice line have already re-formed on the same segment.'
              : 'VRM resident prediction has not been applied yet, but the resident body line has already re-formed on the same segment.',
      })
    }
    else if (hasSameSegmentLipsyncVoiceRecovery(vrm)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: 'VRM resident prediction has not been applied yet, but the audible identity-continuity line has already re-formed on the same segment.',
      })
    }
    else {
      alerts.push({
        severity: 'info',
        code: 'renderer-vrm-pending',
        message: 'VRM resident prediction has not been applied yet.',
      })
    }
  }
  else if (vrm && hasRendererExpressionEvidence(vrm) && vrm.driftKind === 'alias-resolution-drift') {
    if (hasSameSegmentFaceMotionRecovery(vrm) || hasSameSegmentEmbodiedRecovery(vrm)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: hasSameSegmentFaceMotionBodyRecovery(vrm)
          ? 'VRM expression names still differ, but body, face, and motion authority have already re-formed on the same segment.'
          : hasSameSegmentBodyLipsyncVoiceRecovery(vrm)
            ? 'VRM expression names still differ, but the audible identity-continuity line has already re-formed on the same segment.'
            : hasSameSegmentBodyVoiceRecovery(vrm)
              ? 'VRM expression names still differ, but the resident body line and identity-continuity voice line have already re-formed on the same segment.'
              : hasSameSegmentFaceMotionRecovery(vrm)
                ? 'VRM expression names still differ, but face and motion authority have already re-formed on the same segment.'
                : 'VRM expression names still differ, but the resident body line has already re-formed on the same segment.',
      })
    }
    else if (hasSameSegmentLipsyncVoiceRecovery(vrm)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: 'VRM expression names still differ, but the audible identity-continuity line has already re-formed on the same segment.',
      })
    }
    else {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-drift',
        message: 'VRM actual expression diverged from resident predicted expression.',
      })
    }
  }
  else if (vrm && hasRendererExpressionEvidence(vrm) && vrm.driftKind === 'runtime-only-visible') {
    if (hasSameSegmentEmbodiedRecovery(vrm)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: hasSameSegmentFaceMotionBodyRecovery(vrm)
          ? 'VRM is showing a runtime expression before resident prediction, but body, face, and motion authority have already re-formed on the same segment.'
          : hasSameSegmentBodyLipsyncVoiceRecovery(vrm)
            ? 'VRM is showing a runtime expression before resident prediction, but the audible identity-continuity line has already re-formed on the same segment.'
            : hasSameSegmentBodyVoiceRecovery(vrm)
              ? 'VRM is showing a runtime expression before resident prediction, but the resident body line and identity-continuity voice line have already re-formed on the same segment.'
              : 'VRM is showing a runtime expression before resident prediction, but the resident body line has already re-formed on the same segment.',
      })
    }
    else if (hasSameSegmentLipsyncVoiceRecovery(vrm)) {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: 'VRM is showing a runtime expression before resident prediction, but the audible identity-continuity line has already re-formed on the same segment.',
      })
    }
    else {
      alerts.push({
        severity: 'warn',
        code: 'renderer-vrm-runtime-only',
        message: 'VRM is showing a runtime expression without a resident predicted expression.',
      })
    }
  }

  if (input.prosodyExecutionAlignmentSummary?.includes('lead=lipsync-led')
    && input.prosodyExecutionAlignmentSummary.includes('alignment=awaiting-visual-mouth-proof')) {
    alerts.push({
      severity: 'warn',
      code: 'lipsync-mouth-proof-missing',
      message: 'Lip sync is leading this segment, but no renderer mouth execution proof is visible yet.',
    })
  }

  if (
    (() => {
      const authority = resolveEffectiveAuthorityMatchFlags({
        driverAuthority: input.driverAuthority ?? null,
        live2dExecution: input.live2dExecution,
        vrmExecution: input.vrmExecution,
        authoritySegmentId,
        voiceAuthoritySegmentId,
        voiceSummary: input.voiceSummary ?? null,
      })
      const bodyRecovered = hasSameSegmentEmbodiedRecovery(input.rendererAlignment.live2d)
        || hasSameSegmentEmbodiedRecovery(input.rendererAlignment.vrm)
      const audibleLaneRecovered = authority.lipsyncSegmentMatched === true
        && authority.voiceSegmentMatched === true
      return authority.lipsyncSegmentMatched === true
        && (
          (!bodyRecovered && !audibleLaneRecovered && authority.faceSegmentMatched === false)
          || (!bodyRecovered && !audibleLaneRecovered && authority.motionSegmentMatched === false)
        )
    })()
  ) {
    alerts.push({
      severity: 'warn',
      code: 'cross-modal-mouth-dominance',
      message: 'Lip sync is executing, but face or motion authority has drifted away from the same segment.',
    })
  }

  const effectiveAuthority = resolveEffectiveAuthorityMatchFlags({
    driverAuthority: input.driverAuthority ?? null,
    live2dExecution: input.live2dExecution,
    vrmExecution: input.vrmExecution,
    authoritySegmentId,
    voiceAuthoritySegmentId,
    voiceSummary: input.voiceSummary ?? null,
  })
  const matchedLaneCount = [
    effectiveAuthority.bodySegmentMatched === true,
    effectiveAuthority.faceSegmentMatched === true,
    effectiveAuthority.motionSegmentMatched === true,
    effectiveAuthority.lipsyncSegmentMatched === true,
    effectiveAuthority.voiceSegmentMatched === true,
  ].filter(Boolean).length
  const expectedLaneCount = [
    effectiveAuthority.bodySegmentMatched != null,
    input.driverAuthority?.faceSegmentMatched != null || input.driverAuthority?.matchedDrivers?.includes('face'),
    input.driverAuthority?.motionSegmentMatched != null || input.driverAuthority?.matchedDrivers?.includes('motion'),
    input.driverAuthority?.lipsyncSegmentMatched != null || input.driverAuthority?.matchedDrivers?.includes('lipsync'),
    effectiveAuthority.voiceSegmentMatched != null,
  ].filter(Boolean).length
  const survivingLaneNames = [
    effectiveAuthority.bodySegmentMatched === true ? 'body' : null,
    effectiveAuthority.faceSegmentMatched === true ? 'face' : null,
    effectiveAuthority.motionSegmentMatched === true ? 'motion' : null,
    effectiveAuthority.lipsyncSegmentMatched === true ? 'lipsync' : null,
    effectiveAuthority.voiceSegmentMatched === true ? 'voice' : null,
  ].filter((lane): lane is string => Boolean(lane))
  const hasResidentBodyLane = survivingLaneNames.includes('body')
  const hasVoiceLane = survivingLaneNames.includes('voice')
  const hasLipsyncLane = survivingLaneNames.includes('lipsync')
  const hasRendererBodyVoiceRecovery = hasSameSegmentBodyVoiceRecovery(input.rendererAlignment.live2d)
    || hasSameSegmentBodyVoiceRecovery(input.rendererAlignment.vrm)
  const hasRendererBodyLipsyncVoiceRecovery = hasSameSegmentBodyLipsyncVoiceRecovery(input.rendererAlignment.live2d)
    || hasSameSegmentBodyLipsyncVoiceRecovery(input.rendererAlignment.vrm)
  const hasExplicitAudibleSameHerRecovery = (
    (input.rendererAlignment.live2d
      && hasExplicitAudibleSameHerMetadata(input.rendererAlignment.live2d)
      && (
        hasSameSegmentBodyVoiceRecovery(input.rendererAlignment.live2d)
        || hasSameSegmentLipsyncVoiceRecovery(input.rendererAlignment.live2d)
      ))
      || (input.rendererAlignment.vrm
        && hasExplicitAudibleSameHerMetadata(input.rendererAlignment.vrm)
        && (
          hasSameSegmentBodyVoiceRecovery(input.rendererAlignment.vrm)
          || hasSameSegmentLipsyncVoiceRecovery(input.rendererAlignment.vrm)
        ))
  )
  const hasBodyVoiceSameHerLane = hasResidentBodyLane
    && hasVoiceLane
    && !hasLipsyncLane
  const hasAudibleBodySameHerLane = hasResidentBodyLane
    && (
      hasRendererBodyLipsyncVoiceRecovery
      || (hasExplicitAudibleSameHerRecovery && hasLipsyncLane)
    )
  const hasBodyVoiceSameHerLag = hasBodyVoiceSameHerLane
    && effectiveAuthority.faceSegmentMatched === false
    && effectiveAuthority.motionSegmentMatched === false
  const hasExplicitAudibleSameHerLag = hasResidentBodyLane
    && hasExplicitAudibleSameHerRecovery
    && hasLipsyncLane
    && effectiveAuthority.faceSegmentMatched === false
    && effectiveAuthority.motionSegmentMatched === false
  const hasAudibleBodyPartialLaneDominance = hasAudibleBodySameHerLane
    && effectiveAuthority.faceSegmentMatched === false
    && effectiveAuthority.motionSegmentMatched === false
  if (
    expectedLaneCount >= 2
    && matchedLaneCount === 1
  ) {
    alerts.push({
      severity: 'warn',
      code: 'cross-modal-single-lane-dominance',
      message: hasResidentBodyLane
        ? 'Only the resident body lane is still aligned with the active identity-continuity segment.'
        : 'Only one embodiment lane is still aligned with the active identity-continuity segment.',
    })
  }

  if (
    expectedLaneCount >= 3
    && (
      matchedLaneCount === 2
      || hasAudibleBodyPartialLaneDominance
    )
  ) {
    alerts.push({
      severity: 'warn',
      code: 'cross-modal-partial-lane-dominance',
      message: hasExplicitAudibleSameHerLag || hasAudibleBodyPartialLaneDominance
        ? 'The resident body lane is still holding together with one audible identity-continuity lane, but face and motion have not yet rejoined the same active segment.'
        : hasBodyVoiceSameHerLag || hasRendererBodyVoiceRecovery
          ? 'The resident body lane is still holding together with the identity-continuity voice line, but lipsync, face, and motion have not yet rejoined the same active segment.'
          : hasResidentBodyLane
            ? 'The resident body lane is still holding together with one other embodiment lane, but full cross-modal continuity has already narrowed.'
            : 'Two embodiment lanes are still aligned with the active identity-continuity segment, but full cross-modal continuity has already narrowed.',
    })
  }

  return alerts
}

function normalizeLive2DExecutionDiagnostics(raw: Live2DExecutionDiagnosticsSnapshot | null | undefined) {
  if (!raw)
    return null

  return {
    activeExpression: raw.activeExpression
      ? {
          name: normalizeSummaryString(raw.activeExpression.name),
          reason: raw.activeExpression.reason ?? null,
          score: normalizeSummaryNumber(raw.activeExpression.score),
          segmentId: normalizeSummaryString(raw.activeExpression.segmentId),
        }
      : null,
    activeLipSync: raw.activeLipSync
      ? {
          active: raw.activeLipSync.active === true,
          dominantViseme: normalizeSummaryString(raw.activeLipSync.dominantViseme),
          dominantWeight: normalizeSummaryNumber(raw.activeLipSync.dominantWeight),
          segmentId: normalizeSummaryString(raw.activeLipSync.segmentId),
        }
      : null,
    activeVoice: raw.activeVoice
      ? {
          active: raw.activeVoice.active === true,
          phase: normalizeSummaryString(raw.activeVoice.phase),
          segmentId: normalizeSummaryString(raw.activeVoice.segmentId),
        }
      : null,
    activeMotion: raw.activeMotion
      ? {
          group: normalizeSummaryString(raw.activeMotion.group),
          index: normalizeSummaryNumber(raw.activeMotion.index),
          segmentId: normalizeSummaryString(raw.activeMotion.segmentId),
        }
      : null,
    activeBody: raw.activeBody
      ? {
          settle: normalizeSummaryNumber(raw.activeBody.settle),
          openness: normalizeSummaryNumber(raw.activeBody.openness),
          segmentId: normalizeSummaryString(raw.activeBody.segmentId),
        }
      : null,
    cue: raw.cue
      ? {
          emotion: normalizeSummaryString(raw.cue.emotion),
          facialCue: normalizeSummaryString(raw.cue.facialCue),
          preferredExpressionAliases: [...(raw.cue.preferredExpressionAliases ?? [])],
          preferredMotionAliases: [...(raw.cue.preferredMotionAliases ?? [])],
          residentMode: normalizeSummaryString(raw.cue.residentMode),
          preferredBlinkCadence: normalizeSummaryString(raw.cue.preferredBlinkCadence),
          preferredGazeMode: normalizeSummaryString(raw.cue.preferredGazeMode),
          preferredPauseMode: normalizeRendererHintText((raw.cue as { preferredPauseMode?: unknown }).preferredPauseMode),
          preferredLipsyncMode: normalizeRendererHintText((raw.cue as { preferredLipsyncMode?: unknown }).preferredLipsyncMode),
          preferredVoiceMode: normalizeRendererHintText((raw.cue as { preferredVoiceMode?: unknown }).preferredVoiceMode),
          preferredPacingMode: normalizeRendererHintText((raw.cue as { preferredPacingMode?: unknown }).preferredPacingMode),
          reasonTags: normalizeRendererHintReasonTags(raw.cue.reasonTags),
          signature: normalizeSummaryString(raw.cue.signature),
          live2dFacialReleaseMs: normalizeSummaryNumber(raw.cue.live2dFacialReleaseMs),
          live2dMotionFollowThroughMs: normalizeSummaryNumber(raw.cue.live2dMotionFollowThroughMs),
        }
      : null,
  }
}

function normalizeVrmExecutionDiagnostics(raw: VrmExecutionDiagnosticsSnapshot | null | undefined) {
  if (!raw)
    return null

  return {
    activeEmotion: raw.activeEmotion
      ? {
          name: normalizeSummaryString(raw.activeEmotion.name),
          resolvedExpressionNames: raw.activeEmotion.resolvedExpressionNames
            .map(name => typeof name === 'string' ? name.trim() : '')
            .filter(Boolean),
          segmentId: normalizeSummaryString(raw.activeEmotion.segmentId),
        }
      : null,
    activeFacialCue: raw.activeFacialCue
      ? {
          name: normalizeSummaryString(raw.activeFacialCue.name),
          affectsMouth: typeof raw.activeFacialCue.affectsMouth === 'boolean' ? raw.activeFacialCue.affectsMouth : null,
          segmentId: normalizeSummaryString(raw.activeFacialCue.segmentId),
        }
      : null,
    activeMotion: raw.activeMotion
      ? {
          cue: normalizeSummaryString(raw.activeMotion.cue),
          segmentId: normalizeSummaryString(raw.activeMotion.segmentId),
        }
      : null,
    activeBody: raw.activeBody
      ? {
          settle: normalizeSummaryNumber(raw.activeBody.settle),
          openness: normalizeSummaryNumber(raw.activeBody.openness),
          segmentId: normalizeSummaryString(raw.activeBody.segmentId),
        }
      : null,
    activeLipSync: raw.activeLipSync
      ? {
          active: raw.activeLipSync.active === true,
          dominantViseme: normalizeSummaryString(raw.activeLipSync.dominantViseme),
          dominantWeight: normalizeSummaryNumber(raw.activeLipSync.dominantWeight),
          segmentId: normalizeSummaryString(raw.activeLipSync.segmentId),
        }
      : null,
    activeVoice: raw.activeVoice
      ? {
          active: raw.activeVoice.active === true,
          phase: normalizeSummaryString(raw.activeVoice.phase),
          segmentId: normalizeSummaryString(raw.activeVoice.segmentId),
        }
      : null,
    cue: raw.cue
      ? {
          emotion: normalizeSummaryString(raw.cue.emotion),
          facialCue: normalizeSummaryString(raw.cue.facialCue),
          preferredExpressionAliases: (raw.cue.preferredExpressionAliases ?? [])
            .map(name => typeof name === 'string' ? name.trim() : '')
            .filter(Boolean),
          preferredMotionAliases: (raw.cue.preferredMotionAliases ?? [])
            .map(name => typeof name === 'string' ? name.trim() : '')
            .filter(Boolean),
          preferredBlinkCadence: normalizeSummaryString(raw.cue.preferredBlinkCadence),
          preferredGazeMode: normalizeSummaryString(raw.cue.preferredGazeMode),
          preferredPauseMode: normalizeRendererHintText((raw.cue as { preferredPauseMode?: unknown }).preferredPauseMode),
          preferredLipsyncMode: normalizeRendererHintText((raw.cue as { preferredLipsyncMode?: unknown }).preferredLipsyncMode),
          preferredVoiceMode: normalizeRendererHintText((raw.cue as { preferredVoiceMode?: unknown }).preferredVoiceMode),
          preferredPacingMode: normalizeRendererHintText((raw.cue as { preferredPacingMode?: unknown }).preferredPacingMode),
          reasonTags: normalizeRendererHintReasonTags(raw.cue.reasonTags),
          signature: normalizeSummaryString(raw.cue.signature),
          residentMode: normalizeSummaryString(raw.cue.residentMode),
          vrmActionFadeMs: normalizeSummaryNumber(raw.cue.vrmActionFadeMs),
          vrmExpressionBlendMs: normalizeSummaryNumber(raw.cue.vrmExpressionBlendMs),
        }
      : null,
  } satisfies VrmExecutionDiagnosticsSnapshot
}

function normalizeRendererAlignment(input: {
  residentLive2DResolvedExpression: {
    name: string | null
    reason: string | null
  } | null
  residentVrmResolvedExpression: {
    name: string | null
    reason: string | null
  } | null
  live2dExecution: Live2DExecutionDiagnosticsSnapshot | null
  vrmExecution: VrmExecutionDiagnosticsSnapshot | null
  driverSummary: StageEmbodimentDriverSummary | null
  voiceSummary?: string | null
}) {
  function normalizeRendererHintReasonTags(
    value: unknown,
  ) {
    return Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean)
      : []
  }

  function resolveAlignmentStatus(predicted: string | null, actual: string | null) {
    if (predicted && actual)
      return predicted === actual ? 'aligned' as const : 'drifted' as const
    if (predicted)
      return 'predicted-only' as const
    return 'actual-only' as const
  }

  function resolveDriftKind(predicted: string | null, actual: string | null) {
    if (predicted && actual)
      return predicted === actual ? 'aligned' as const : 'alias-resolution-drift' as const
    if (predicted)
      return 'resident-not-yet-applied' as const
    return 'runtime-only-visible' as const
  }

  function resolveFaceDriverSegmentId(rendererTarget: 'live2d' | 'vrm') {
    const hasFaceDriverAuthority = Boolean(
      input.driverSummary?.rendererTarget === rendererTarget
      && (
        input.driverSummary.face?.cue
        || input.driverSummary.face?.source
      ),
    )
    if (!hasFaceDriverAuthority)
      return null

    if (rendererTarget === 'live2d') {
      return input.live2dExecution?.activeExpression?.segmentId
        ?? input.driverSummary?.face?.segmentId
        ?? null
    }

    return input.vrmExecution?.activeFacialCue?.segmentId
      ?? input.vrmExecution?.activeEmotion?.segmentId
      ?? input.driverSummary?.face?.segmentId
      ?? null
  }

  function resolveMotionDriverSegmentId(rendererTarget: 'live2d' | 'vrm') {
    const hasMotionDriverAuthority = Boolean(
      input.driverSummary?.rendererTarget === rendererTarget
      && (
        input.driverSummary.motion?.cue
        || input.driverSummary.motion?.source
      ),
    )
    if (!hasMotionDriverAuthority)
      return null

    return rendererTarget === 'live2d'
      ? input.live2dExecution?.activeMotion?.segmentId
      ?? input.driverSummary?.motion?.segmentId
      ?? null
      : input.vrmExecution?.activeMotion?.segmentId
        ?? input.driverSummary?.motion?.segmentId
        ?? null
  }

  function resolveVoiceDriverSegmentId(rendererTarget: 'live2d' | 'vrm') {
    const hasVoiceDriverAuthority = Boolean(
      input.driverSummary?.rendererTarget === rendererTarget
      && (
        input.driverSummary.voiceAuthority?.segmentId
        || input.driverSummary.voice
      ),
    )
    const hasVoiceContinuitySummary = Boolean(
      typeof input.voiceSummary === 'string'
      && input.voiceSummary.trim(),
    )
    const executionVoiceSegmentId = rendererTarget === 'live2d'
      ? input.live2dExecution?.activeVoice?.segmentId ?? null
      : input.vrmExecution?.activeVoice?.segmentId ?? null
    const bodySegmentId = rendererTarget === 'live2d'
      ? input.live2dExecution?.activeBody?.segmentId ?? null
      : input.vrmExecution?.activeBody?.segmentId ?? null
    const structuredVoiceSegmentId = input.driverSummary?.rendererTarget === rendererTarget
      ? input.driverSummary.voiceAuthority?.segmentId ?? null
      : null
    const voiceSummarySegmentId = hasVoiceContinuitySummary
      ? resolveVoiceSummarySegmentId(input.voiceSummary)
      : null

    if (hasVoiceDriverAuthority)
      return executionVoiceSegmentId ?? structuredVoiceSegmentId ?? voiceSummarySegmentId ?? bodySegmentId

    if (!hasVoiceContinuitySummary && !executionVoiceSegmentId)
      return null

    return executionVoiceSegmentId ?? structuredVoiceSegmentId ?? voiceSummarySegmentId ?? bodySegmentId
  }

  function resolveLipsyncDriverSegmentId(rendererTarget: 'live2d' | 'vrm') {
    return rendererTarget === 'live2d'
      ? input.live2dExecution?.activeLipSync?.segmentId ?? null
      : input.vrmExecution?.activeLipSync?.segmentId ?? null
  }

  function hasRendererAlignmentEvidence(rendererTarget: 'live2d' | 'vrm') {
    if (rendererTarget === 'live2d') {
      return Boolean(
        input.residentLive2DResolvedExpression
        || input.live2dExecution?.activeExpression
        || input.live2dExecution?.activeMotion
        || input.live2dExecution?.activeBody
        || input.live2dExecution?.activeLipSync
        || input.live2dExecution?.activeVoice
        || (
          input.driverSummary?.rendererTarget === 'live2d'
          && (
            input.driverSummary.face
            || input.driverSummary.motion
            || input.driverSummary.lipsync
            || input.driverSummary.voiceAuthority
            || input.driverSummary.voice
          )
        ),
      )
    }

    return Boolean(
      (input.residentVrmResolvedExpression && input.residentVrmResolvedExpression.reason !== 'unresolved')
      || input.vrmExecution?.activeEmotion
      || input.vrmExecution?.activeFacialCue
      || input.vrmExecution?.activeMotion
      || input.vrmExecution?.activeBody
      || input.vrmExecution?.activeLipSync
      || input.vrmExecution?.activeVoice
      || (
        input.driverSummary?.rendererTarget === 'vrm'
        && (
          input.driverSummary.face
          || input.driverSummary.motion
          || input.driverSummary.lipsync
          || input.driverSummary.voiceAuthority
          || input.driverSummary.voice
        )
      ),
    )
  }

  return {
    live2d: hasRendererAlignmentEvidence('live2d')
      ? {
          predicted: input.residentLive2DResolvedExpression?.name ?? null,
          actual: input.live2dExecution?.activeExpression?.name ?? null,
          reason: (
            !input.residentLive2DResolvedExpression?.name
            && input.live2dExecution?.activeExpression?.name
          )
            ? 'runtime-expression'
            : input.live2dExecution?.activeExpression?.reason
              ?? input.residentLive2DResolvedExpression?.reason
              ?? null,
          residentMode: input.live2dExecution?.cue?.residentMode ?? null,
          preferredBlinkCadence: input.live2dExecution?.cue?.preferredBlinkCadence ?? null,
          preferredGazeMode: input.live2dExecution?.cue?.preferredGazeMode ?? null,
          reasonTags: normalizeRendererHintReasonTags(input.live2dExecution?.cue?.reasonTags),
          signature: normalizeRendererHintSignature(input.live2dExecution?.cue?.signature),
          status: resolveAlignmentStatus(
            input.residentLive2DResolvedExpression?.name ?? null,
            input.live2dExecution?.activeExpression?.name ?? null,
          ),
          driftKind: resolveDriftKind(
            input.residentLive2DResolvedExpression?.name ?? null,
            input.live2dExecution?.activeExpression?.name ?? null,
          ),
          faceDriverCue: input.driverSummary?.rendererTarget === 'live2d'
            ? input.driverSummary.face?.cue ?? null
            : null,
          faceDriverSource: input.driverSummary?.rendererTarget === 'live2d'
            ? input.driverSummary.face?.source ?? null
            : null,
          faceDriverSegmentId: input.driverSummary?.rendererTarget === 'live2d'
            ? resolveFaceDriverSegmentId('live2d')
            : null,
          motionDriverCue: input.driverSummary?.rendererTarget === 'live2d'
            ? input.driverSummary.motion?.cue ?? null
            : null,
          motionDriverSource: input.driverSummary?.rendererTarget === 'live2d'
            ? input.driverSummary.motion?.source ?? null
            : null,
          motionDriverSegmentId: input.driverSummary?.rendererTarget === 'live2d'
            ? resolveMotionDriverSegmentId('live2d')
            : null,
          bodyDriverSegmentId: input.live2dExecution?.activeBody?.segmentId ?? null,
          lipsyncDriverSegmentId: input.driverSummary?.rendererTarget === 'live2d'
            ? resolveLipsyncDriverSegmentId('live2d')
            : null,
          voiceDriverSegmentId: (
            input.driverSummary?.rendererTarget === 'live2d'
            || input.live2dExecution?.activeVoice
          )
            ? resolveVoiceDriverSegmentId('live2d')
            : null,
        }
      : null,
    vrm: hasRendererAlignmentEvidence('vrm')
      ? {
          predicted: input.residentVrmResolvedExpression?.name ?? null,
          actual: input.vrmExecution?.activeEmotion?.resolvedExpressionNames[0]
            ?? input.vrmExecution?.activeEmotion?.name
            ?? input.vrmExecution?.activeFacialCue?.name
            ?? null,
          reason: input.residentVrmResolvedExpression?.reason
            ?? (input.vrmExecution?.activeEmotion?.resolvedExpressionNames.length
              ? 'runtime-emotion'
              : input.vrmExecution?.activeFacialCue?.name
                ? 'runtime-facial-cue'
                : null),
          residentMode: input.vrmExecution?.cue?.residentMode ?? null,
          preferredBlinkCadence: input.vrmExecution?.cue?.preferredBlinkCadence ?? null,
          preferredGazeMode: input.vrmExecution?.cue?.preferredGazeMode ?? null,
          reasonTags: normalizeRendererHintReasonTags(input.vrmExecution?.cue?.reasonTags),
          signature: normalizeRendererHintSignature(input.vrmExecution?.cue?.signature),
          status: resolveAlignmentStatus(
            input.residentVrmResolvedExpression?.name ?? null,
            input.vrmExecution?.activeEmotion?.resolvedExpressionNames[0]
            ?? input.vrmExecution?.activeEmotion?.name
            ?? input.vrmExecution?.activeFacialCue?.name
            ?? null,
          ),
          driftKind: resolveDriftKind(
            input.residentVrmResolvedExpression?.name ?? null,
            input.vrmExecution?.activeEmotion?.resolvedExpressionNames[0]
            ?? input.vrmExecution?.activeEmotion?.name
            ?? input.vrmExecution?.activeFacialCue?.name
            ?? null,
          ),
          faceDriverCue: input.driverSummary?.rendererTarget === 'vrm'
            ? input.driverSummary.face?.cue ?? null
            : null,
          faceDriverSource: input.driverSummary?.rendererTarget === 'vrm'
            ? input.driverSummary.face?.source ?? null
            : null,
          faceDriverSegmentId: input.driverSummary?.rendererTarget === 'vrm'
            ? resolveFaceDriverSegmentId('vrm')
            : null,
          motionDriverCue: input.driverSummary?.rendererTarget === 'vrm'
            ? input.driverSummary.motion?.cue ?? null
            : null,
          motionDriverSource: input.driverSummary?.rendererTarget === 'vrm'
            ? input.driverSummary.motion?.source ?? null
            : null,
          motionDriverSegmentId: input.driverSummary?.rendererTarget === 'vrm'
            ? resolveMotionDriverSegmentId('vrm')
            : null,
          bodyDriverSegmentId: input.vrmExecution?.activeBody?.segmentId ?? null,
          lipsyncDriverSegmentId: input.driverSummary?.rendererTarget === 'vrm'
            ? resolveLipsyncDriverSegmentId('vrm')
            : null,
          voiceDriverSegmentId: (
            input.driverSummary?.rendererTarget === 'vrm'
            || input.vrmExecution?.activeVoice
          )
            ? resolveVoiceDriverSegmentId('vrm')
            : null,
        }
      : null,
  }
}

function normalizeSpeechArticulation(raw: StageEmbodimentSpeechArticulationState | null | undefined) {
  if (!raw)
    return null
  return cloneStageEmbodimentSpeechArticulationState(raw)
}

function normalizeSummaryString(value: unknown) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizeSummaryRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readRuntimeMemoryClosureIdentityKeyFromCausality(value: unknown) {
  const causality = normalizeSummaryRecord(value)
  if (!causality || causality.causedByMemoryClosure !== true)
    return null

  const memoryIdentity = normalizeSummaryRecord(causality.memoryIdentity)
  const continuityKey = normalizeSummaryString(memoryIdentity?.continuityKey)
  if (continuityKey)
    return continuityKey

  const selectedCandidateIds = Array.isArray(memoryIdentity?.selectedCandidateIds)
    ? memoryIdentity.selectedCandidateIds
    : []
  return selectedCandidateIds
    .map(normalizeSummaryString)
    .find((candidate): candidate is string => Boolean(candidate)) ?? null
}

function resolveRuntimeMemoryClosureIdentityKey(runtimeDigest: AlicizationRuntimeDigest | null | undefined) {
  const derivedMindStateBundle = normalizeSummaryRecord(runtimeDigest?.derivedMindStateBundle)
  if (!derivedMindStateBundle)
    return null

  const emotionalTransitionLedger = normalizeSummaryRecord(derivedMindStateBundle.emotionalTransitionLedger)
  const initiativeSuppression = normalizeSummaryRecord(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = normalizeSummaryRecord(derivedMindStateBundle.learningExecutionState)
  const embodimentContinuityLedger = normalizeSummaryRecord(derivedMindStateBundle.embodimentContinuityLedger)

  return [
    readRuntimeMemoryClosureIdentityKeyFromCausality(emotionalTransitionLedger?.memoryClosureCausality),
    readRuntimeMemoryClosureIdentityKeyFromCausality(initiativeSuppression?.memoryClosureCausality),
    readRuntimeMemoryClosureIdentityKeyFromCausality(learningExecutionState?.memoryClosureCausality),
    readRuntimeMemoryClosureIdentityKeyFromCausality(embodimentContinuityLedger?.memoryClosureCausality),
  ].find((candidate): candidate is string => Boolean(candidate)) ?? null
}

function normalizeSummaryActionCue(value: string | null | undefined) {
  return normalizeAlicizationSettleLoopToken(normalizeSummaryString(value))
}

function normalizeSummaryConfidence(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Number(value)
}

function buildDriverAuthoritySummaryEntry(
  cue: string | null | undefined,
  input: { source?: string | null, confidence?: number | null, segmentId?: string | null } | null | undefined,
): StageEmbodimentDriverAuthoritySummaryEntry | null {
  if (!input && cue == null)
    return null

  return {
    cue: normalizeSummaryActionCue(cue),
    source: normalizeSummaryString(input?.source),
    confidence: normalizeSummaryConfidence(input?.confidence),
    segmentId: normalizeSummaryString(input?.segmentId),
  }
}

function resolveExecutionOnlyDriverSummaryRendererTarget(input: {
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
}) {
  const scoreLive2D = [
    input.live2dExecution?.cue,
    input.live2dExecution?.activeExpression,
    input.live2dExecution?.activeLipSync,
    input.live2dExecution?.activeVoice,
    input.live2dExecution?.activeMotion,
    input.live2dExecution?.activeBody,
  ].filter(Boolean).length
  const scoreVrm = [
    input.vrmExecution?.cue,
    input.vrmExecution?.activeEmotion,
    input.vrmExecution?.activeFacialCue,
    input.vrmExecution?.activeLipSync,
    input.vrmExecution?.activeVoice,
    input.vrmExecution?.activeMotion,
    input.vrmExecution?.activeBody,
  ].filter(Boolean).length

  if (scoreLive2D === 0 && scoreVrm === 0)
    return null

  if (scoreLive2D !== scoreVrm)
    return scoreLive2D > scoreVrm ? 'live2d' : 'vrm'

  if (input.live2dExecution?.cue && !input.vrmExecution?.cue)
    return 'live2d'
  if (input.vrmExecution?.cue && !input.live2dExecution?.cue)
    return 'vrm'

  return scoreLive2D > 0 ? 'live2d' : 'vrm'
}

function buildExecutionOnlyDriverSummary(input: {
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined
  fallbackResidentMode?: string | null
}): StageEmbodimentDriverSummary | null {
  const rendererTarget = resolveExecutionOnlyDriverSummaryRendererTarget({
    live2dExecution: input.live2dExecution,
    vrmExecution: input.vrmExecution,
  })
  if (!rendererTarget)
    return null

  const activeExecution = rendererTarget === 'live2d'
    ? input.live2dExecution
    : input.vrmExecution
  const executionCue = activeExecution?.cue ?? null
  const normalizedResidentMode = resolveSummaryResidentMode({
    playbackTelemetry: null,
    executionResidentMode: executionCue?.residentMode ?? null,
    fallbackResidentMode: input.fallbackResidentMode,
  })
  const rendererHintSummary = resolveExecutionRendererHintSummary({
    live2dExecution: input.live2dExecution,
    vrmExecution: input.vrmExecution,
    rendererTarget,
  })
  const reasonSummary = resolveCompanionshipReasonSummary({
    residentMode: normalizedResidentMode,
    digitalLifeSpineDigest: input.digitalLifeSpineDigest,
  })
  const sharedCompanionshipFields = {
    residentMode: normalizedResidentMode,
    preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence ?? null,
    preferredGazeMode: rendererHintSummary?.preferredGazeMode ?? null,
    preferredPauseMode: rendererHintSummary?.preferredPauseMode ?? null,
    preferredLipsyncMode: rendererHintSummary?.preferredLipsyncMode ?? null,
    preferredVoiceMode: rendererHintSummary?.preferredVoiceMode ?? null,
    preferredPacingMode: rendererHintSummary?.preferredPacingMode ?? null,
    ...((() => {
      const reasonTags = normalizeRendererHintReasonTags(executionCue?.reasonTags ?? null)
      return reasonTags.length > 0 ? { reasonTags } : {}
    })()),
    reasonSummary,
    ...((() => {
      const signature = normalizeRendererHintSignature(executionCue?.signature ?? null)
      return signature ? { signature } : {}
    })()),
  }
  const activeLipSync = activeExecution?.activeLipSync ?? null
  const activeVoice = activeExecution?.activeVoice ?? null
  const executionOnlyVoiceSegmentId = normalizeSummaryString(activeVoice?.segmentId)
  const executionOnlyLipSyncSegmentId = normalizeSummaryString(activeLipSync?.segmentId)
  const fallbackSegmentId = normalizeSummaryString(
    executionOnlyVoiceSegmentId
    ?? executionOnlyLipSyncSegmentId
    ?? null,
  )

  if (!executionOnlyVoiceSegmentId && !executionOnlyLipSyncSegmentId)
    return null

  return {
    rendererTarget,
    body: null,
    face: null,
    motion: null,
    lipsync: activeLipSync
      ? {
          cue: normalizeSummaryString(activeLipSync.dominantViseme),
          source: 'runtime-execution',
          confidence: null,
          segmentId: normalizeSummaryString(activeLipSync.segmentId) ?? fallbackSegmentId,
          mode: null,
          playbackPhase: activeLipSync.active ? 'playing' : 'idle',
          topViseme: activeLipSync.dominantViseme && activeLipSync.dominantWeight != null
            ? `${activeLipSync.dominantViseme}:${Number(activeLipSync.dominantWeight).toFixed(2)}`
            : null,
          hintViseme: normalizeSummaryString(activeLipSync.dominantViseme),
          ...sharedCompanionshipFields,
        }
      : null,
    voiceAuthority: fallbackSegmentId
      ? {
          cue: null,
          source: 'runtime-execution',
          confidence: null,
          segmentId: fallbackSegmentId,
          ...sharedCompanionshipFields,
        }
      : null,
    voice: null,
  }
}

function buildDriverSummary(
  playbackTelemetry: ReturnType<typeof normalizePlaybackTelemetry>,
  live2dExecution: ReturnType<typeof normalizeLive2DExecutionDiagnostics>,
  vrmExecution: ReturnType<typeof normalizeVrmExecutionDiagnostics>,
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined,
  voiceSummary?: string | null,
  fallbackResidentMode?: string | null,
): StageEmbodimentDriverSummary | null {
  const drivers = playbackTelemetry?.drivers ?? null
  const normalizedVoiceSummary = normalizeSummaryString(voiceSummary)
  if (!drivers && !normalizedVoiceSummary) {
    return buildExecutionOnlyDriverSummary({
      live2dExecution,
      vrmExecution,
      digitalLifeSpineDigest,
      fallbackResidentMode,
    })
  }

  const primaryVisemeHint = drivers?.lipsync?.visemeHints[0] ?? null
  const visemeHintsSummary = normalizeVisemeHintsSummary(drivers)
  const bodyDriver = drivers?.body ?? null
  const faceDriver = drivers?.face ?? null
  const motionDriver = drivers?.motion ?? null
  const lipsyncDriver = drivers?.lipsync ?? null
  const hasMeaningfulLipsyncContinuityHold = Number.isFinite(lipsyncDriver?.continuityHoldMs)
    && Number(lipsyncDriver?.continuityHoldMs) > 0
  const executionCue = playbackTelemetry?.rendererTarget === 'live2d'
    ? live2dExecution?.cue
    : playbackTelemetry?.rendererTarget === 'vrm'
      ? vrmExecution?.cue
      : live2dExecution?.cue ?? vrmExecution?.cue ?? null
  const normalizedResidentMode = resolveSummaryResidentMode({
    playbackTelemetry,
    executionResidentMode: executionCue?.residentMode ?? null,
    fallbackResidentMode,
  })
  const rendererHintSummary = mergeRendererHintSummaries(
    resolvePlaybackTelemetryRendererHintSummary(playbackTelemetry),
    resolveExecutionRendererHintSummary({
      live2dExecution,
      vrmExecution,
      rendererTarget: playbackTelemetry?.rendererTarget ?? playbackTelemetry?.driverAuthority?.rendererTarget ?? null,
    }),
  )
  const reasonSummary = resolveCompanionshipReasonSummary({
    residentMode: normalizedResidentMode,
    digitalLifeSpineDigest,
  })
  const sharedCompanionshipFields = {
    residentMode: normalizedResidentMode,
    preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence ?? null,
    preferredGazeMode: rendererHintSummary?.preferredGazeMode ?? null,
    preferredPauseMode: rendererHintSummary?.preferredPauseMode ?? null,
    preferredLipsyncMode: rendererHintSummary?.preferredLipsyncMode ?? null,
    preferredVoiceMode: rendererHintSummary?.preferredVoiceMode ?? null,
    preferredPacingMode: rendererHintSummary?.preferredPacingMode ?? null,
    ...((() => {
      const reasonTags = normalizeRendererHintReasonTags(
        executionCue?.reasonTags
        ?? playbackTelemetry?.cue?.rendererHints?.reasonTags
        ?? null,
      )
      return reasonTags.length > 0 ? { reasonTags } : {}
    })()),
    reasonSummary,
    ...((() => {
      const signature = normalizeRendererHintSignature(
        executionCue?.signature
        ?? playbackTelemetry?.cue?.rendererHints?.signature
        ?? null,
      )
      return signature ? { signature } : {}
    })()),
  }

  const summary: StageEmbodimentDriverSummary = {
    rendererTarget: playbackTelemetry?.rendererTarget ?? null,
    body: bodyDriver
      ? {
          frameMode: normalizeSummaryString(bodyDriver.frameMode),
          stillness: normalizeSummaryNumber(bodyDriver.stillness),
          gazeStability: normalizeSummaryNumber(bodyDriver.gazeStability),
          breathAmplitude: normalizeSummaryNumber(bodyDriver.breathAmplitude),
          expressivity: normalizeSummaryNumber(bodyDriver.expressivity),
          segmentId: normalizeSummaryString(bodyDriver.segmentId),
        }
      : null,
    face: faceDriver
      ? (() => {
          const authority = buildDriverAuthoritySummaryEntry(
            faceDriver.facialCue,
            faceDriver,
          ) ?? {
            cue: normalizeSummaryString(faceDriver.facialCue),
            source: normalizeSummaryString(faceDriver.source),
            confidence: normalizeSummaryConfidence(faceDriver.confidence),
            segmentId: normalizeSummaryString(faceDriver.segmentId),
          }

          return {
            ...authority,
            emotion: normalizeSummaryString(faceDriver.emotion),
            intensity: normalizeSummaryConfidence(faceDriver.intensity),
            holdMs: normalizeSummaryConfidence(faceDriver.holdMs),
            preUtteranceCue: normalizeSummaryString(faceDriver.preUtteranceCue),
            postUtteranceCue: normalizeSummaryString(faceDriver.postUtteranceCue),
            ...sharedCompanionshipFields,
          }
        })()
      : null,
    motion: motionDriver
      ? (() => {
          const authority = buildDriverAuthoritySummaryEntry(
            motionDriver.actionCue,
            motionDriver,
          ) ?? {
            cue: normalizeSummaryActionCue(motionDriver.actionCue),
            source: normalizeSummaryString(motionDriver.source),
            confidence: normalizeSummaryConfidence(motionDriver.confidence),
            segmentId: normalizeSummaryString(motionDriver.segmentId),
          }

          return {
            ...authority,
            attentionMode: normalizeMeasuredReturnMotionAttentionMode({
              actionCue: normalizeSummaryActionCue(motionDriver.actionCue),
              attentionMode: motionDriver.attentionMode,
              residentMode: normalizedResidentMode,
              preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence,
              preferredGazeMode: rendererHintSummary?.preferredGazeMode,
            }),
            idleBase: normalizeSummaryActionCue(motionDriver.idleBase),
            intensity: normalizeSummaryConfidence(motionDriver.intensity),
            holdMs: normalizeSummaryConfidence(motionDriver.holdMs),
            ...(normalizedResidentMode === 'measured-return'
              && normalizeSummaryActionCue(motionDriver.actionCue) === 'observe_focus'
              && (rendererHintSummary?.preferredBlinkCadence === 'linger' || rendererHintSummary?.preferredGazeMode === 'soften')
              ? { continuityTiming: 'audible-body-carry' as const }
              : {}),
            ...sharedCompanionshipFields,
          }
        })()
      : null,
    lipsync: lipsyncDriver
      ? (() => {
          const authority = buildDriverAuthoritySummaryEntry(
            primaryVisemeHint?.viseme,
            {
              source: primaryVisemeHint?.source ?? null,
              confidence: primaryVisemeHint?.confidence ?? null,
              segmentId: primaryVisemeHint?.segmentId ?? lipsyncDriver.segmentId,
            },
          ) ?? {
            cue: null,
            source: null,
            confidence: null,
            segmentId: normalizeSummaryString(lipsyncDriver.segmentId),
          }

          return {
            ...authority,
            mode: lipsyncDriver.mode,
            playbackPhase: lipsyncDriver.playbackPhase,
            ...(hasMeaningfulLipsyncContinuityHold
              ? {
                  continuityHoldMs: normalizeSummaryNumber(lipsyncDriver.continuityHoldMs),
                  topViseme: primaryVisemeHint
                    ? `${primaryVisemeHint.viseme}:${Number(primaryVisemeHint.weight ?? 0).toFixed(2)}`
                    : null,
                  hintTrail: visemeHintsSummary,
                  hintViseme: normalizeSummaryString(primaryVisemeHint?.viseme),
                }
              : {}),
            ...(normalizedResidentMode === 'measured-return'
              && Number.isFinite(lipsyncDriver.continuityHoldMs)
              && Number(lipsyncDriver.continuityHoldMs) >= 360
              && normalizeSummaryString(bodyDriver?.segmentId)
              && normalizeSummaryString(bodyDriver?.segmentId) === normalizeSummaryString(lipsyncDriver.segmentId)
              && normalizeSummaryString(faceDriver?.segmentId) !== normalizeSummaryString(lipsyncDriver.segmentId)
              && normalizeSummaryString(motionDriver?.segmentId) !== normalizeSummaryString(lipsyncDriver.segmentId)
              && (rendererHintSummary?.preferredBlinkCadence === 'linger' || rendererHintSummary?.preferredGazeMode === 'soften')
              ? { continuityTiming: 'body-lipsync-carry' as const }
              : {}),
            ...sharedCompanionshipFields,
          }
        })()
      : null,
  }

  const explicitVoiceAuthority = resolvePlaybackExplicitVoiceAuthority({
    playbackTelemetry,
  })
  if (normalizedVoiceSummary) {
    const voiceSegmentId = resolveVoiceSummarySegmentId(normalizedVoiceSummary)
    const voiceSourceMatch = /(?:^|\|)\s*source=([^|]+)/.exec(normalizedVoiceSummary)
    summary.voiceAuthority = {
      cue: null,
      source: normalizeSummaryString(voiceSourceMatch?.[1] ?? null),
      confidence: null,
      segmentId: voiceSegmentId,
      residentMode: normalizedResidentMode,
      preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence ?? null,
      preferredGazeMode: rendererHintSummary?.preferredGazeMode ?? null,
      preferredPauseMode: rendererHintSummary?.preferredPauseMode ?? null,
      preferredLipsyncMode: rendererHintSummary?.preferredLipsyncMode ?? null,
      preferredVoiceMode: rendererHintSummary?.preferredVoiceMode ?? null,
      preferredPacingMode: rendererHintSummary?.preferredPacingMode ?? null,
      reasonSummary,
      ...('reasonTags' in sharedCompanionshipFields ? { reasonTags: sharedCompanionshipFields.reasonTags } : {}),
      ...('signature' in sharedCompanionshipFields ? { signature: sharedCompanionshipFields.signature } : {}),
    }
    summary.voice = normalizedVoiceSummary
  }
  else if (explicitVoiceAuthority) {
    const explicitVoiceSegmentId = normalizeSummaryString(explicitVoiceAuthority.segmentId)
    const explicitVoiceSource = normalizeSummaryString(explicitVoiceAuthority.source)

    if (explicitVoiceSegmentId || explicitVoiceSource) {
      summary.voiceAuthority = {
        cue: null,
        source: explicitVoiceSource,
        confidence: null,
        segmentId: explicitVoiceSegmentId,
        residentMode: normalizedResidentMode,
        preferredBlinkCadence: rendererHintSummary?.preferredBlinkCadence ?? null,
        preferredGazeMode: rendererHintSummary?.preferredGazeMode ?? null,
        preferredPauseMode: rendererHintSummary?.preferredPauseMode ?? null,
        preferredLipsyncMode: rendererHintSummary?.preferredLipsyncMode ?? null,
        preferredVoiceMode: rendererHintSummary?.preferredVoiceMode ?? null,
        preferredPacingMode: rendererHintSummary?.preferredPacingMode ?? null,
        reasonSummary,
        ...('reasonTags' in sharedCompanionshipFields ? { reasonTags: sharedCompanionshipFields.reasonTags } : {}),
        ...('signature' in sharedCompanionshipFields ? { signature: sharedCompanionshipFields.signature } : {}),
      }
    }
  }

  return summary
}

export function useStageEmbodimentDiagnostics(options: UseStageEmbodimentDiagnosticsOptions) {
  const snapshot = computed<StageEmbodimentDiagnosticsSnapshot>(() => {
    const now = Date.now()
    const digitalLifeSpineDigest = options.digitalLifeSpineDigest?.value
    const visualPresenceState = options.visualPresenceState?.value
    const runtimeDigest = options.runtimeDigest?.value
    const runtimeMemoryClosureIdentityKey = resolveRuntimeMemoryClosureIdentityKey(runtimeDigest)
    const performanceState = options.performanceState?.value
    const runtimePresence = resolveStageEmbodimentRuntimePresence(visualPresenceState, now)
    const runtimeBias = resolveStageEmbodimentRuntimeAttentionBias(visualPresenceState, now, runtimePresence)
    const speechRenderState = options.speechRenderState.value
    const live2dExecution = normalizeLive2DExecutionDiagnostics(options.live2dExecutionDiagnostics?.value)
    const vrmExecution = normalizeVrmExecutionDiagnostics(options.vrmExecutionDiagnostics?.value)
    const playbackTelemetry = normalizePlaybackTelemetry(
      options.playbackTelemetry?.value
      ?? resolvePlaybackTelemetryFallbackFromSpeechRenderState(speechRenderState),
    )
    const runtimeDynamics = normalizeRuntimeDynamicsSummary({
      activePresence: options.activePresence.value,
      digitalLifeSpineDigest,
      live2dRuntimeCapabilities: options.live2dRuntimeCapabilities?.value,
      performanceState,
      presencePosture: options.presencePosture.value,
      runtimeDigest,
      visualPresenceState,
      vrmRuntimeCapabilities: options.vrmRuntimeCapabilities?.value,
    })
    const fallbackResidentMode = runtimeDynamics.companionshipTransition.residentMode
    const normalizedSpeechArticulation = normalizeSpeechArticulation(speechRenderState?.articulation)
    const articulationSummary = normalizeArticulationSummary(speechRenderState?.articulation)
    const structuredVoiceSummary = articulationSummary
      ? normalizeStructuredVoiceSummary({
          summary: articulationSummary.voice,
          speechArticulation: speechRenderState?.articulation ?? null,
          playbackTelemetry: playbackTelemetry ?? null,
          digitalLifeSpineDigest,
          driverAuthority: playbackTelemetry?.driverAuthority ?? null,
          prosodyAuthority: playbackTelemetry?.prosodyAuthority ?? null,
          drivers: playbackTelemetry?.drivers ?? null,
          fallbackResidentMode,
        })
      : null
    const driverSummary = buildDriverSummary(
      playbackTelemetry,
      live2dExecution,
      vrmExecution,
      digitalLifeSpineDigest,
      structuredVoiceSummary,
      fallbackResidentMode,
    )

    const rendererAlignment = normalizeRendererAlignment({
      residentLive2DResolvedExpression: runtimeDynamics.residentLive2DResolvedExpression,
      residentVrmResolvedExpression: runtimeDynamics.residentVrmResolvedExpression,
      live2dExecution,
      vrmExecution,
      driverSummary,
      voiceSummary: structuredVoiceSummary,
    })
    const visemeHintsSummary = normalizeVisemeHintsSummary(playbackTelemetry?.drivers ?? null)
    const prosodyDriverAttributionSummary = normalizeProsodyDriverAttributionSummary({
      prosodyAuthority: playbackTelemetry?.prosodyAuthority ?? null,
      driverAuthority: playbackTelemetry?.driverAuthority ?? null,
    })
    const prosodyExecutionAlignmentSummary = normalizeProsodyExecutionAlignmentSummary({
      articulation: normalizedSpeechArticulation,
      prosodyDriverAttributionSummary,
      live2dExecution,
      visemeIntensity: speechRenderState?.visemeIntensity ?? 0,
      vrmExecution,
    })
    const authoritySummary = normalizeAuthoritySummary(
      playbackTelemetry,
      live2dExecution,
      vrmExecution,
      digitalLifeSpineDigest,
      structuredVoiceSummary,
      fallbackResidentMode,
    )
    const convergence = normalizeSpeechConvergenceSummary({
      playbackTelemetry,
      live2dExecution,
      vrmExecution,
      voiceSummary: structuredVoiceSummary,
    })

    return {
      visualPresence: {
        watchMode: visualPresenceState?.watchMode ?? null,
        currentBodyState: visualPresenceState?.currentBodyState ?? null,
        continuityMode: visualPresenceState?.continuityMode ?? null,
        quietLineMs: normalizeSummaryNumber(visualPresenceState?.quietLineMs),
        currentInwardPreoccupation: normalizeSummaryString(visualPresenceState?.currentInwardPreoccupation),
        scenario: visualPresenceState?.currentScene?.scenario ?? null,
        thoughtStance: visualPresenceState?.privateThought?.stance ?? null,
        embodiedPresence: visualPresenceState?.privateThought?.embodiedPresence ?? null,
        runtimeDominantChannel: runtimeDigest?.dominantChannel ?? null,
        runtimeShouldSpeak: typeof runtimeDigest?.shouldProactivelySpeak === 'boolean' ? runtimeDigest.shouldProactivelySpeak : null,
        runtimeShouldAct: typeof runtimeDigest?.shouldProactivelyAct === 'boolean' ? runtimeDigest.shouldProactivelyAct : null,
        runtimeContinuityPressure: Number.isFinite(runtimeDigest?.continuityPressure) ? Number(runtimeDigest?.continuityPressure) : null,
        runtimeCompanionshipPressure: Number.isFinite(runtimeDigest?.companionshipPressure) ? Number(runtimeDigest?.companionshipPressure) : null,
        runtimeSummary: typeof runtimeDigest?.summary === 'string' && runtimeDigest.summary.trim() ? runtimeDigest.summary.trim() : null,
        runtimeMemoryClosureIdentityKey,
        capturePermission: visualPresenceState?.captureState.permission ?? null,
        captureSourceName: visualPresenceState?.captureState.sourceName ?? null,
        degradedReason: visualPresenceState?.captureState.degradedReason ?? null,
        stateAgeMs: Number.isFinite(visualPresenceState?.updatedAt)
          ? Math.max(0, now - Number(visualPresenceState?.updatedAt))
          : null,
      },
      attention: {
        engaged: runtimeBias.engaged || speechRenderState?.active === true || Boolean(options.activePresence.value),
        targetPoint: options.targetPoint.value,
        resolvedPresence: options.activePresence.value,
        runtimePresence,
        runtimeBias,
      },
      performance: {
        phase: performanceState?.phase ?? 'idle',
        runtimeDynamics,
      },
      posture: options.presencePosture.value,
      speech: {
        phase: speechRenderState?.phase ?? 'idle',
        playbackPhase: speechRenderState?.playbackPhase ?? 'idle',
        speechEnergy: speechRenderState?.dynamics.speechEnergy ?? 0,
        prosodyIntensity: speechRenderState?.dynamics.prosodyIntensity ?? 0,
        emphasisLevel: speechRenderState?.dynamics.emphasisLevel ?? 0,
        cadencePulse: speechRenderState?.dynamics.cadencePulse ?? 0,
        visemeIntensity: speechRenderState?.visemeIntensity ?? 0,
        articulation: normalizedSpeechArticulation,
        articulationSummary: (() => {
          if (!articulationSummary)
            return null

          return {
            ...articulationSummary,
            voice: structuredVoiceSummary,
          }
        })(),
        prosodyAuthoritySummary: normalizeProsodyAuthoritySummary(playbackTelemetry?.prosodyAuthority ?? null),
        prosodyDriverAttributionSummary,
        prosodyExecutionAlignmentSummary,
        lipsyncExecutionSummary: normalizeLipsyncExecutionSummary({
          articulation: normalizedSpeechArticulation,
          digitalLifeSpineDigest,
          playbackTelemetry,
          visemeIntensity: speechRenderState?.visemeIntensity ?? 0,
          visemeHintsSummary,
        }),
        convergence,
        authoritySummary,
        cueMicroSummary: normalizeCueMicroSummary(playbackTelemetry, digitalLifeSpineDigest ?? null),
        driverSummary,
        driverExecutionSummary: normalizeDriverExecutionSummary(
          playbackTelemetry?.drivers ?? null,
          playbackTelemetry,
          digitalLifeSpineDigest ?? null,
          fallbackResidentMode,
        ),
        live2dExecution,
        visemeHintsSummary,
        vrmExecution,
        rendererAlignment,
        alerts: normalizeSpeechAlerts({
          authorityMismatchDisplay: authoritySummary?.authorityMismatchDisplay ?? null,
          driverAuthority: playbackTelemetry?.driverAuthority ?? null,
          drivers: playbackTelemetry?.drivers ?? null,
          cueSegmentId: playbackTelemetry?.cue?.id ?? null,
          live2dExecution,
          playbackTelemetry,
          prosodyAuthoritySegmentId: playbackTelemetry?.prosodyAuthority?.segmentId ?? null,
          prosodyExecutionAlignmentSummary,
          rendererAlignment,
          vrmExecution,
          voiceSummary: structuredVoiceSummary,
        }),
        playbackTelemetry,
      },
      stage: options.stageBounds.value,
    }
  })

  return {
    snapshot: readonly(snapshot) as Readonly<ComputedRef<StageEmbodimentDiagnosticsSnapshot>>,
  }
}
