import type {
  StageEmbodimentPerformanceMatchedDriver,
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

import { cloneStageEmbodimentSpeechArticulationState } from '@proj-alicization/stage-shared'
import { computed, readonly } from 'vue'

import {
  resolveLive2DExpressionSelection,
} from '../../../../stage-ui-live2d/src/composables/live2d/expression-runtime'
import {
  resolveSupportedVrmExpressionName,
} from '../../../../stage-ui-three/src/composables/vrm/capabilities'
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

export interface StageEmbodimentDriverAuthoritySummaryEntry {
  cue: string | null
  source: string | null
  confidence: number | null
  segmentId: string | null
}

export interface StageEmbodimentLipsyncDriverAuthoritySummaryEntry extends StageEmbodimentDriverAuthoritySummaryEntry {
  mode: NonNullable<EmbodimentPlaybackTelemetry['drivers']['lipsync']>['mode'] | null
}

export interface StageEmbodimentDriverSummary {
  rendererTarget: 'live2d' | 'vrm' | null
  body: StageEmbodimentDriverAuthoritySummaryEntry | null
  face: StageEmbodimentDriverAuthoritySummaryEntry | null
  motion: StageEmbodimentDriverAuthoritySummaryEntry | null
  lipsync: StageEmbodimentLipsyncDriverAuthoritySummaryEntry | null
  voice: StageEmbodimentDriverAuthoritySummaryEntry | null
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
    authoritySummary: {
      cueId: string | null
      segmentId: string | null
      rendererTarget: 'live2d' | 'vrm' | null
      matchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
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
        reason: string | null
        status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
        driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
        driverCue: string | null
        driverSource: string | null
      } | null
      vrm: {
        predicted: string | null
        actual: string | null
        reason: string | null
        status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
        driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
        driverCue: string | null
        driverSource: string | null
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
      driverAuthority: {
        segmentId: string | null
        rendererTarget: 'live2d' | 'vrm' | null
        matchedDrivers: StageEmbodimentPerformanceMatchedDriver[]
        sources: string[]
        bodySegmentMatched: boolean
        faceSegmentMatched: boolean
        motionSegmentMatched: boolean
        lipsyncSegmentMatched: boolean
        voiceSegmentMatched?: boolean
      } | null
      prosodyAuthority: EmbodimentPlaybackTelemetry['prosodyAuthority'] | null
      cue?: {
        id: string | null
        text: string | null
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
      drivers: EmbodimentPlaybackTelemetry['drivers'] | null
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

function buildAuthorityMismatchReasonSummary(input: {
  authority: StageEmbodimentAuthorityMatchFlags | null | undefined
  matchedSources?: string[] | null
  driverExecutionSummary?: string | null
  finalSurfacePolicy?: string | null
}) {
  const mismatchSummary = buildAuthorityMismatchSummary(input.authority)
  if (!mismatchSummary)
    return null

  const labelMap: Record<string, string> = {
    'body-mismatch': '身体',
    'face-mismatch': '表情',
    'motion-mismatch': '动作',
    'lipsync-mismatch': '口型',
    'voice-mismatch': '声音',
  }
  const mismatchLabels = mismatchSummary
    .split(', ')
    .map(kind => labelMap[kind] ?? null)
    .filter((value): value is string => Boolean(value))
  const sourceText = (input.matchedSources ?? []).filter(Boolean).join('、') || '无来源'
  const driverExecutionSummary = input.driverExecutionSummary?.trim() ?? ''
  const executionKinds: string[] = []
  if (driverExecutionSummary.includes('body='))
    executionKinds.push('身体')
  if (driverExecutionSummary.includes('face='))
    executionKinds.push('表情')
  if (driverExecutionSummary.includes('motion='))
    executionKinds.push('动作')
  if (driverExecutionSummary.includes('lipsync='))
    executionKinds.push('口型')
  if (driverExecutionSummary.includes('voice='))
    executionKinds.push('声音')
  const executionText = executionKinds.join('、') || '无执行'
  return `${mismatchLabels.join('、') || '未知'} authority 漂移，当前绑定来源是 ${sourceText}，实际执行落点是${executionText}。`
}

function resolveAuthorityMismatchDisplay(input: {
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
}) {
  return normalizeSummaryString(input.authorityMismatchReasonSummary)
    ?? normalizeSummaryString(input.authorityMismatchSummary)
}

function normalizeRuntimeDynamicsProfile(variationToken: string | null) {
  const normalized = variationToken?.trim().toLowerCase() ?? ''
  if (normalized.includes('quiet-accompaniment'))
    return 'quiet-accompaniment' as const
  if (normalized.includes('protective-watch'))
    return 'protective-watch' as const
  return 'default' as const
}

function normalizeRuntimeDynamicsSummary(
  input: {
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
  const residentEmotion = normalizeSummaryString(resident?.baseEmotion)
  const residentFacialCue = normalizeSummaryString(resident?.facialCue)
  const residentConfiguredAliases = [residentFacialCue, residentEmotion].filter((value): value is string => Boolean(value))
  const residentLive2DExpressionBias = residentEmotion
    ? resolveResidentLive2DPreferredExpressionAliases({
        emotion: residentEmotion,
        configuredAliases: residentConfiguredAliases,
        presencePosture: input.presencePosture,
        visualPresenceState: input.visualPresenceState,
      })
    : []
  const residentVrmExpressionBias = residentEmotion
    ? resolveResidentVrmPreferredExpressionAliases({
        emotion: residentEmotion,
        configuredAliases: residentConfiguredAliases,
        presencePosture: input.presencePosture,
        visualPresenceState: input.visualPresenceState,
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

  return {
    profile: normalizeRuntimeDynamicsProfile(variationToken),
    variationToken,
    residentEmotion,
    residentDelivery: normalizeSummaryString(resident?.delivery),
    residentFacialCue,
    residentActionCue: normalizeSummaryString(resident?.actionCue),
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

type NormalizedPlaybackTelemetry = StageEmbodimentDiagnosticsSnapshot['speech']['playbackTelemetry']
type NormalizedPlaybackTelemetryRecord = NonNullable<NormalizedPlaybackTelemetry>

function normalizePlaybackTelemetry(raw: EmbodimentPlaybackTelemetry | null | undefined): NormalizedPlaybackTelemetry {
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
          voiceSegmentMatched: raw.driverAuthority.voiceSegmentMatched,
        }
      : null,
    prosodyAuthority: raw.prosodyAuthority
      ? {
          segmentId: normalizeSummaryString(raw.prosodyAuthority.segmentId),
          provenance: raw.prosodyAuthority.provenance,
          source: normalizeSummaryString(raw.prosodyAuthority.source),
          mode: raw.prosodyAuthority.mode ?? null,
          cueProsodyWeight: normalizeSummaryNumber(raw.prosodyAuthority.cueProsodyWeight),
          cueMouthWeight: normalizeSummaryNumber(raw.prosodyAuthority.cueMouthWeight),
          cueHeadWeight: normalizeSummaryNumber(raw.prosodyAuthority.cueHeadWeight),
          visemePeakWeight: normalizeSummaryNumber(raw.prosodyAuthority.visemePeakWeight),
        }
      : null,
    cue: raw.cue
      ? {
          id: normalizeSummaryString(raw.cue.id),
          text: normalizeSummaryString(raw.cue.text),
          prosodyWeight: normalizeSummaryNumber(raw.cue.prosodyWeight),
          mouthWeight: normalizeSummaryNumber(raw.cue.mouthWeight),
          headWeight: normalizeSummaryNumber(raw.cue.headWeight),
          personaStyleSummary: normalizeSummaryString((raw.cue as { personaStyleSummary?: string | null }).personaStyleSummary),
          facialHoldMs: normalizeSummaryNumber(raw.cue.facialHoldMs),
          actionHoldMs: normalizeSummaryNumber(raw.cue.actionHoldMs),
          emotionHoldMs: normalizeSummaryNumber(raw.cue.emotionHoldMs),
          facialCue: normalizeSummaryString(raw.cue.facialCue),
          actionCue: normalizeSummaryString(raw.cue.actionCue),
          actionWindow: normalizeSummaryString(raw.cue.actionWindow),
          interruptMode: normalizeSummaryString(raw.cue.interruptMode),
          settleMode: normalizeSummaryString((raw.cue as { settleMode?: string | null }).settleMode),
          rendererHints: raw.cue.rendererHints
            ? {
                preferredExpressionAliases: raw.cue.rendererHints.preferredExpressionAliases
                  ? [...raw.cue.rendererHints.preferredExpressionAliases]
                  : undefined,
                preferredMotionAliases: raw.cue.rendererHints.preferredMotionAliases
                  ? [...raw.cue.rendererHints.preferredMotionAliases]
                  : undefined,
              }
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
    drivers: raw.drivers,
  }
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

function normalizeDriverExecutionSummary(raw: EmbodimentPlaybackTelemetry['drivers'] | null | undefined) {
  if (!raw)
    return null

  const parts: string[] = []
  if (raw.body) {
    parts.push(
      `body=${raw.body.frameMode ?? 'none'} still=${Number(raw.body.stillness ?? 0).toFixed(2)} gaze=${Number(raw.body.gazeStability ?? 0).toFixed(2)} breath=${Number(raw.body.breathAmplitude ?? 0).toFixed(2)} expr=${Number(raw.body.expressivity ?? 0).toFixed(2)}`,
    )
  }
  if (raw.face) {
    parts.push(
      `face=${raw.face.emotion ?? 'none'}/${raw.face.facialCue ?? 'none'}@${Number(raw.face.intensity ?? 0).toFixed(2)} hold=${raw.face.holdMs ?? 0} pre=${raw.face.preUtteranceCue ?? 'none'} post=${raw.face.postUtteranceCue ?? 'none'} src=${raw.face.source ?? 'none'} conf=${Number(raw.face.confidence ?? 0).toFixed(2)}`,
    )
  }
  if (raw.motion) {
    parts.push(
      `motion=${raw.motion.actionCue ?? 'none'} mode=${raw.motion.attentionMode ?? 'none'} idle=${raw.motion.idleBase ?? 'none'}@${Number(raw.motion.intensity ?? 0).toFixed(2)} hold=${raw.motion.holdMs ?? 0} src=${raw.motion.source ?? 'none'} conf=${Number(raw.motion.confidence ?? 0).toFixed(2)}`,
    )
  }
  if (raw.lipsync) {
    parts.push(
      `lipsync=${raw.lipsync.mode ?? 'none'} phase=${raw.lipsync.playbackPhase ?? 'none'}`,
    )
  }

  return parts.length > 0 ? parts.join(' | ') : null
}

function normalizeVisemeHintsSummary(raw: EmbodimentPlaybackTelemetry['drivers'] | null | undefined) {
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
  driverAuthority: NormalizedPlaybackTelemetryRecord['driverAuthority']
  drivers: NormalizedPlaybackTelemetryRecord['drivers']
}) {
  const summary = normalizeSummaryString(input.summary)
  if (!summary)
    return null

  if (!summary.includes('closure=') || summary.includes('provenance='))
    return summary

  const provenance = input.driverAuthority ? 'authority-bound' : 'fallback-derived'
  const segmentId = normalizeSummaryString(
    input.driverAuthority?.segmentId
    ?? input.drivers?.lipsync?.segmentId
    ?? input.drivers?.face?.segmentId
    ?? input.drivers?.motion?.segmentId,
  ) ?? 'n/a'
  const source = normalizeSummaryString(
    input.drivers?.lipsync?.visemeHints?.[0]?.source
    ?? input.drivers?.face?.source
    ?? input.drivers?.motion?.source,
  ) ?? 'n/a'

  return `${summary} | provenance=${provenance} | segment=${segmentId} | source=${source}`
}

function normalizeAuthoritySummary(playbackTelemetry: NormalizedPlaybackTelemetry) {
  if (!playbackTelemetry?.cue)
    return null

  const matchedDrivers = playbackTelemetry.driverAuthority?.matchedDrivers ?? []
  const matchedSources = playbackTelemetry.driverAuthority?.sources ?? []
  const bodyMatched = playbackTelemetry.driverAuthority?.bodySegmentMatched
  const faceMatched = playbackTelemetry.driverAuthority?.faceSegmentMatched
  const motionMatched = playbackTelemetry.driverAuthority?.motionSegmentMatched
  const lipsyncMatched = playbackTelemetry.driverAuthority?.lipsyncSegmentMatched
  const voiceMatched = playbackTelemetry.driverAuthority?.voiceSegmentMatched
  const target = playbackTelemetry.rendererTarget ?? playbackTelemetry.driverAuthority?.rendererTarget ?? null
  const matchSummary = `body:${bodyMatched == null ? 'n/a' : bodyMatched ? 'yes' : 'no'} face:${faceMatched == null ? 'n/a' : faceMatched ? 'yes' : 'no'} motion:${motionMatched == null ? 'n/a' : motionMatched ? 'yes' : 'no'} lipsync:${lipsyncMatched == null ? 'n/a' : lipsyncMatched ? 'yes' : 'no'} voice:${voiceMatched == null ? 'n/a' : voiceMatched ? 'yes' : 'no'}`
  const authority = playbackTelemetry.driverAuthority
    ? {
        bodySegmentMatched: playbackTelemetry.driverAuthority.bodySegmentMatched,
        faceSegmentMatched: playbackTelemetry.driverAuthority.faceSegmentMatched,
        motionSegmentMatched: playbackTelemetry.driverAuthority.motionSegmentMatched,
        lipsyncSegmentMatched: playbackTelemetry.driverAuthority.lipsyncSegmentMatched,
        voiceSegmentMatched: playbackTelemetry.driverAuthority.voiceSegmentMatched,
      }
    : null
  const authorityMismatchSummary = buildAuthorityMismatchSummary(authority)
  const authorityMismatchReasonSummary = buildAuthorityMismatchReasonSummary({
    authority,
    matchedSources,
    driverExecutionSummary: normalizeDriverExecutionSummary(playbackTelemetry.drivers),
    finalSurfacePolicy: null,
  })
  const authorityMismatchDisplay = resolveAuthorityMismatchDisplay({
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
  })
  const settleSummaryPrefix = playbackTelemetry.driverAuthority
    ? 'authority-bound'
    : 'fallback-derived'

  return {
    cueId: playbackTelemetry.cue.id ?? null,
    segmentId: playbackTelemetry.driverAuthority?.segmentId ?? null,
    rendererTarget: target,
    matchedDrivers,
    matchedSources,
    bindingSummary: `target=${target ?? 'n/a'} | drivers=${matchedDrivers.length > 0 ? matchedDrivers.join(', ') : 'n/a'} | sources=${matchedSources.length > 0 ? matchedSources.join(', ') : 'n/a'} | matches=${matchSummary}`,
    matchSummary,
    authorityMismatchSummary,
    authorityMismatchReasonSummary,
    authorityMismatchDisplay,
    settleSummary: `${settleSummaryPrefix} | segment=${playbackTelemetry.driverAuthority?.segmentId ?? 'n/a'} | target=${target ?? 'n/a'} | drivers=${matchedDrivers.length > 0 ? matchedDrivers.join(', ') : 'n/a'} | sources=${matchedSources.length > 0 ? matchedSources.join(', ') : 'n/a'}`,
  }
}

function normalizeCueMicroSummary(playbackTelemetry: NormalizedPlaybackTelemetry) {
  if (!playbackTelemetry?.cue)
    return null

  const cueSummaryProvenance = playbackTelemetry.driverAuthority
    ? 'authority-bound'
    : 'fallback-derived'
  const cueSummarySegmentId = normalizeSummaryString(
    playbackTelemetry.cue.id
    ?? playbackTelemetry.driverAuthority?.segmentId,
  ) ?? 'n/a'

  return {
    cueId: playbackTelemetry.cue.id ?? null,
    cueText: playbackTelemetry.cue.text ?? null,
    cue: `${playbackTelemetry.cue.facialCue ?? 'none'} / ${playbackTelemetry.cue.actionCue ?? 'none'} | prosody=${Number(playbackTelemetry.cue.prosodyWeight ?? 0).toFixed(2)} mouth=${Number(playbackTelemetry.cue.mouthWeight ?? 0).toFixed(2)} head=${Number(playbackTelemetry.cue.headWeight ?? 0).toFixed(2)} provenance=${cueSummaryProvenance} segment=${cueSummarySegmentId}`,
    personaStyle: normalizeStructuredPersonaStyleSummary({
      summary: playbackTelemetry.cue.personaStyleSummary,
      provenance: cueSummaryProvenance,
      segmentId: cueSummarySegmentId,
    }),
    timing: `facial=${playbackTelemetry.cue.facialHoldMs ?? 0} action=${playbackTelemetry.cue.actionHoldMs ?? 0} emotion=${playbackTelemetry.cue.emotionHoldMs ?? 0} | ${playbackTelemetry.cue.actionWindow ?? 'n/a'} | ${playbackTelemetry.cue.interruptMode ?? 'n/a'} | ${playbackTelemetry.cue.settleMode ?? 'n/a'}`,
  }
}

function normalizeSpeechAlerts(input: {
  rendererAlignment: StageEmbodimentDiagnosticsSnapshot['speech']['rendererAlignment']
}) {
  const alerts: StageEmbodimentDiagnosticsSnapshot['speech']['alerts'] = []

  const live2d = input.rendererAlignment.live2d
  if (live2d?.driftKind === 'resident-not-yet-applied') {
    alerts.push({
      severity: 'info',
      code: 'renderer-live2d-pending',
      message: 'Live2D resident prediction has not been applied yet.',
    })
  }
  else if (live2d?.driftKind === 'alias-resolution-drift') {
    alerts.push({
      severity: 'warn',
      code: 'renderer-live2d-drift',
      message: 'Live2D actual expression diverged from resident predicted expression.',
    })
  }
  else if (live2d?.driftKind === 'runtime-only-visible') {
    alerts.push({
      severity: 'warn',
      code: 'renderer-live2d-runtime-only',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    })
  }

  const vrm = input.rendererAlignment.vrm
  if (vrm?.driftKind === 'resident-not-yet-applied') {
    alerts.push({
      severity: 'info',
      code: 'renderer-vrm-pending',
      message: 'VRM resident prediction has not been applied yet.',
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
    activeMotion: raw.activeMotion
      ? {
          group: normalizeSummaryString(raw.activeMotion.group),
          index: normalizeSummaryNumber(raw.activeMotion.index),
          segmentId: normalizeSummaryString(raw.activeMotion.segmentId),
        }
      : null,
    cue: raw.cue
      ? {
          emotion: normalizeSummaryString(raw.cue.emotion),
          facialCue: normalizeSummaryString(raw.cue.facialCue),
          preferredExpressionAliases: [...raw.cue.preferredExpressionAliases],
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
    cue: raw.cue
      ? {
          emotion: normalizeSummaryString(raw.cue.emotion),
          facialCue: normalizeSummaryString(raw.cue.facialCue),
          preferredExpressionAliases: raw.cue.preferredExpressionAliases
            .map(name => typeof name === 'string' ? name.trim() : '')
            .filter(Boolean),
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
}) {
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

  return {
    live2d: input.residentLive2DResolvedExpression || input.live2dExecution?.activeExpression
      ? {
          predicted: input.residentLive2DResolvedExpression?.name ?? null,
          actual: input.live2dExecution?.activeExpression?.name ?? null,
          reason: input.live2dExecution?.activeExpression?.reason
            ?? input.residentLive2DResolvedExpression?.reason
            ?? null,
          status: resolveAlignmentStatus(
            input.residentLive2DResolvedExpression?.name ?? null,
            input.live2dExecution?.activeExpression?.name ?? null,
          ),
          driftKind: resolveDriftKind(
            input.residentLive2DResolvedExpression?.name ?? null,
            input.live2dExecution?.activeExpression?.name ?? null,
          ),
          driverCue: input.driverSummary?.rendererTarget === 'live2d'
            ? input.driverSummary.face?.cue ?? null
            : null,
          driverSource: input.driverSummary?.rendererTarget === 'live2d'
            ? input.driverSummary.face?.source ?? null
            : null,
        }
      : null,
    vrm: (
      input.vrmExecution?.activeEmotion
      || (input.residentVrmResolvedExpression && input.residentVrmResolvedExpression.reason !== 'unresolved')
    )
      ? {
          predicted: input.residentVrmResolvedExpression?.name ?? null,
          actual: input.vrmExecution?.activeEmotion?.resolvedExpressionNames[0]
            ?? input.vrmExecution?.activeEmotion?.name
            ?? null,
          reason: input.residentVrmResolvedExpression?.reason
            ?? (input.vrmExecution?.activeEmotion?.resolvedExpressionNames.length ? 'runtime-emotion' : null),
          status: resolveAlignmentStatus(
            input.residentVrmResolvedExpression?.name ?? null,
            input.vrmExecution?.activeEmotion?.resolvedExpressionNames[0]
            ?? input.vrmExecution?.activeEmotion?.name
            ?? null,
          ),
          driftKind: resolveDriftKind(
            input.residentVrmResolvedExpression?.name ?? null,
            input.vrmExecution?.activeEmotion?.resolvedExpressionNames[0]
            ?? input.vrmExecution?.activeEmotion?.name
            ?? null,
          ),
          driverCue: input.driverSummary?.rendererTarget === 'vrm'
            ? input.driverSummary.face?.cue ?? null
            : null,
          driverSource: input.driverSummary?.rendererTarget === 'vrm'
            ? input.driverSummary.face?.source ?? null
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

function normalizeSummaryString(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
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
    cue: normalizeSummaryString(cue),
    source: normalizeSummaryString(input?.source),
    confidence: normalizeSummaryConfidence(input?.confidence),
    segmentId: normalizeSummaryString(input?.segmentId),
  }
}

function buildDriverSummary(playbackTelemetry: NormalizedPlaybackTelemetry): StageEmbodimentDriverSummary | null {
  if (!playbackTelemetry?.drivers)
    return null

  const primaryVisemeHint = playbackTelemetry.drivers.lipsync?.visemeHints[0] ?? null

  return {
    rendererTarget: playbackTelemetry.rendererTarget ?? null,
    body: playbackTelemetry.drivers.body
      ? {
          cue: normalizeSummaryString(playbackTelemetry.drivers.body.frameMode),
          source: 'body-telemetry',
          confidence: null,
          segmentId: normalizeSummaryString(playbackTelemetry.drivers.body.segmentId),
        }
      : null,
    face: buildDriverAuthoritySummaryEntry(
      playbackTelemetry.drivers.face?.facialCue,
      playbackTelemetry.drivers.face,
    ),
    motion: buildDriverAuthoritySummaryEntry(
      playbackTelemetry.drivers.motion?.actionCue,
      playbackTelemetry.drivers.motion,
    ),
    lipsync: playbackTelemetry.drivers.lipsync
      ? (() => {
          const authority = buildDriverAuthoritySummaryEntry(
            primaryVisemeHint?.viseme,
            {
              source: primaryVisemeHint?.source ?? null,
              confidence: primaryVisemeHint?.confidence ?? null,
              segmentId: primaryVisemeHint?.segmentId ?? playbackTelemetry.drivers.lipsync.segmentId,
            },
          ) ?? {
            cue: null,
            source: null,
            confidence: null,
            segmentId: normalizeSummaryString(playbackTelemetry.drivers.lipsync.segmentId),
          }

          return {
            ...authority,
            mode: playbackTelemetry.drivers.lipsync.mode,
          }
        })()
      : null,
    voice: playbackTelemetry.prosodyAuthority
      ? {
          cue: playbackTelemetry.prosodyAuthority.mode ?? null,
          source: normalizeSummaryString(playbackTelemetry.prosodyAuthority.source),
          confidence: null,
          segmentId: normalizeSummaryString(playbackTelemetry.prosodyAuthority.segmentId),
        }
      : null,
  }
}

export function useStageEmbodimentDiagnostics(options: UseStageEmbodimentDiagnosticsOptions) {
  const snapshot = computed<StageEmbodimentDiagnosticsSnapshot>(() => {
    const now = Date.now()
    const digitalLifeSpineDigest = options.digitalLifeSpineDigest?.value
    const visualPresenceState = options.visualPresenceState?.value
    const runtimeDigest = options.runtimeDigest?.value
    const performanceState = options.performanceState?.value
    const runtimePresence = resolveStageEmbodimentRuntimePresence(visualPresenceState, now)
    const runtimeBias = resolveStageEmbodimentRuntimeAttentionBias(visualPresenceState, now, runtimePresence)
    const speechRenderState = options.speechRenderState.value
    const live2dExecution = normalizeLive2DExecutionDiagnostics(options.live2dExecutionDiagnostics?.value)
    const vrmExecution = normalizeVrmExecutionDiagnostics(options.vrmExecutionDiagnostics?.value)
    const playbackTelemetry = normalizePlaybackTelemetry(options.playbackTelemetry?.value)
    const driverSummary = buildDriverSummary(playbackTelemetry)
    const runtimeDynamics = normalizeRuntimeDynamicsSummary({
      digitalLifeSpineDigest,
      live2dRuntimeCapabilities: options.live2dRuntimeCapabilities?.value,
      performanceState,
      presencePosture: options.presencePosture.value,
      runtimeDigest,
      visualPresenceState,
      vrmRuntimeCapabilities: options.vrmRuntimeCapabilities?.value,
    })

    const rendererAlignment = normalizeRendererAlignment({
      residentLive2DResolvedExpression: runtimeDynamics.residentLive2DResolvedExpression,
      residentVrmResolvedExpression: runtimeDynamics.residentVrmResolvedExpression,
      live2dExecution,
      vrmExecution,
      driverSummary,
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
        articulation: normalizeSpeechArticulation(speechRenderState?.articulation),
        articulationSummary: (() => {
          const articulationSummary = normalizeArticulationSummary(speechRenderState?.articulation)
          if (!articulationSummary)
            return null

          return {
            ...articulationSummary,
            voice: normalizeStructuredVoiceSummary({
              summary: articulationSummary.voice,
              driverAuthority: playbackTelemetry?.driverAuthority ?? null,
              drivers: playbackTelemetry?.drivers ?? null,
            }),
          }
        })(),
        authoritySummary: normalizeAuthoritySummary(playbackTelemetry),
        cueMicroSummary: normalizeCueMicroSummary(playbackTelemetry),
        driverSummary,
        driverExecutionSummary: normalizeDriverExecutionSummary(playbackTelemetry?.drivers),
        live2dExecution,
        visemeHintsSummary: normalizeVisemeHintsSummary(playbackTelemetry?.drivers),
        vrmExecution,
        rendererAlignment,
        alerts: normalizeSpeechAlerts({ rendererAlignment }),
        playbackTelemetry,
      },
      stage: options.stageBounds.value,
    }
  })

  return {
    snapshot: readonly(snapshot) as Readonly<ComputedRef<StageEmbodimentDiagnosticsSnapshot>>,
  }
}
