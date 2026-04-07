import type { TextSegment } from '@proj-alicization/pipelines-audio'
import type { VrmActionBinding } from '@proj-alicization/stage-ui-three'
import type { ComputedRef, Ref } from 'vue'

import type { EmotionPayload } from '../../constants/emotions'
import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationPresencePulsePayload,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'
import type { useAlicizationPresenceDispatcherStore } from '../../stores/alicization-presence-dispatcher'
import type { StageModelRenderer } from '../../stores/settings'
import type { StageEmbodimentPerformanceContinuityState } from './stage-embodiment-performance-plan'
import type { StageEmbodimentDiagnosticsSnapshot } from './use-stage-embodiment-diagnostics'

import { readonly, watch } from 'vue'

import { resolveStageEmbodimentResidentPerformance } from './stage-embodiment-resident-performance'
import { useStageEmbodimentAttention } from './use-stage-embodiment-attention'
import { useStageEmbodimentDiagnostics } from './use-stage-embodiment-diagnostics'
import { useStageEmbodimentIdlePerformance } from './use-stage-embodiment-idle-performance'
import { useStageEmbodimentPerformanceRuntime } from './use-stage-embodiment-performance-runtime'
import { useStageEmbodimentPosture } from './use-stage-embodiment-posture'
import { useStageEmbodimentPresence } from './use-stage-embodiment-presence'
import { useStageEmbodimentSpeech } from './use-stage-embodiment-speech'
import { useStageEmbodimentStyle } from './use-stage-embodiment-style'
import { useStageEmbodimentVisualPresence } from './use-stage-embodiment-visual-presence'

interface Point2D {
  x: number
  y: number
}

interface Size2D {
  height: number
  width: number
}

interface Live2DActionCapability {
  actionKey: string
  motionIndex: number
  motionName: string
}

export interface UseStageEmbodimentRuntimeOptions {
  applyRuntimeEmbodimentEnvelope?: (embodiment: AlicizationDialogueEmbodimentEnvelope | null | undefined) => void
  audioContext: AudioContext
  clampPerformance: (performance: AlicizationDialoguePerformancePayload) => AlicizationDialoguePerformancePayload
  currentMotion: Ref<{ group: string, index?: number }>
  dispatcher: ReturnType<typeof useAlicizationPresenceDispatcherStore>
  enqueueEmotion: (emotion: EmotionPayload) => void
  focusAt: Readonly<Ref<Point2D>>
  live2dActionCapabilities: ComputedRef<Live2DActionCapability[]>
  mouthOpenSize: Ref<number>
  paused: Readonly<Ref<boolean>>
  performanceManifest: ComputedRef<CharacterPerformanceCapabilitiesManifest | null>
  pitch: Ref<number>
  rate: Ref<number>
  resolveClampedPresencePulsePerformance: (payload: AlicizationPresencePulsePayload) => AlicizationDialoguePerformancePayload
  resolvePresenceIntensity: (emphasis: number | undefined, fallbackIntensity: number) => number
  speakFallback: (reply: string, performance: AlicizationDialoguePerformancePayload) => Promise<void> | void
  stageBounds: Readonly<Ref<Size2D>>
  stageModelRenderer: Ref<StageModelRenderer>
  vrmActionBindings: Readonly<Ref<VrmActionBinding[]>>
}

export function useStageEmbodimentRuntime(options: UseStageEmbodimentRuntimeOptions) {
  const visualPresence = useStageEmbodimentVisualPresence()
  const {
    applyEmotionSpeechStyle,
    normalizePresenceEmotionName,
    styledPitch,
    styledRate,
  } = useStageEmbodimentStyle({
    pitch: options.pitch,
    rate: options.rate,
  })

  const speech = useStageEmbodimentSpeech({
    audioContext: options.audioContext,
    digitalLifeSpineDigest: visualPresence.digitalLifeSpineDigest,
    mouthOpenSize: options.mouthOpenSize,
    paused: options.paused,
    speechStylePitch: styledPitch,
    speechStyleRate: styledRate,
    stageModelRenderer: options.stageModelRenderer,
  })
  const performance = useStageEmbodimentPerformanceRuntime({
    digitalLifeSpineDigest: visualPresence.digitalLifeSpineDigest,
    speechRenderState: speech.speechRenderState,
    upcomingSpeechSegment: speech.upcomingSpeechSegment,
  })
  const residentContinuity: StageEmbodimentPerformanceContinuityState = {
    previousActionCue: null,
    previousFacialCue: null,
    variationToken: null,
  }
  const attention = useStageEmbodimentAttention({
    focusAt: options.focusAt,
    speechRenderState: speech.speechRenderState,
    stageBounds: options.stageBounds,
    visualPresenceState: visualPresence.state,
  })
  const posture = useStageEmbodimentPosture({
    activePresence: attention.activePresence,
    focusAt: options.focusAt,
    speechRenderState: speech.speechRenderState,
    stageBounds: options.stageBounds,
    targetPoint: attention.live2dFocusAt,
    visualPresenceState: visualPresence.state,
  })
  const diagnostics = useStageEmbodimentDiagnostics({
    activePresence: attention.activePresence,
    presencePosture: posture.presencePosture,
    speechRenderState: speech.speechRenderState,
    stageBounds: options.stageBounds,
    targetPoint: attention.live2dFocusAt,
    visualPresenceState: visualPresence.state,
  })
  const idlePerformance = useStageEmbodimentIdlePerformance({
    live2dActionCapabilities: options.live2dActionCapabilities,
    presencePosture: posture.presencePosture,
    vrmActionBindings: options.vrmActionBindings,
  })
  const presence = useStageEmbodimentPresence({
    applyAttentionPerformance: (performance) => {
      attention.applyPerformance(performance)
    },
    applyAttentionPresencePulse: (payload) => {
      attention.applyPresencePulse(payload)
    },
    applyRuntimeEmbodimentEnvelope: options.applyRuntimeEmbodimentEnvelope,
    armPerformance: (performancePayload, armOptions) => {
      performance.armPerformance(performancePayload, armOptions)
    },
    primeDigitalLifeEnvelope: (digitalLife) => {
      speech.primeDigitalLifeEnvelope(digitalLife)
    },
    primeSpeechTimeline: (timeline) => {
      speech.primeSpeechTimeline(timeline)
    },
    currentMotion: options.currentMotion,
    dispatcher: options.dispatcher,
    live2dActionCapabilities: options.live2dActionCapabilities,
    normalizePresenceEmotionName,
    applyEmotionSpeechStyle,
    clampPerformance: options.clampPerformance,
    enqueueEmotion: options.enqueueEmotion,
    performanceManifest: options.performanceManifest,
    resolveClampedPresencePulsePerformance: options.resolveClampedPresencePulsePerformance,
    resolvePresenceIntensity: options.resolvePresenceIntensity,
    speakFallback: options.speakFallback,
    stageModelRenderer: options.stageModelRenderer,
    visualPresenceState: visualPresence.state,
  })

  function syncResidentPerformanceFromVisualPresence() {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: attention.activePresence.value,
      continuity: residentContinuity,
      digitalLifeSpine: visualPresence.digitalLifeSpineDigest.value,
      performanceManifest: options.performanceManifest.value,
      presencePosture: posture.presencePosture.value,
      visualPresenceState: visualPresence.state.value,
    })
    residentContinuity.previousActionCue = resolved.performance.actionCue ?? null
    residentContinuity.previousFacialCue = resolved.performance.facialCue ?? null
    residentContinuity.variationToken = resolved.variationToken
    performance.syncResidentPerformance(resolved.performance, {
      allowWhileActive: true,
      variationToken: resolved.variationToken,
    })
  }

  watch(
    [
      () => performance.state.value.phase,
      () => visualPresence.state.value,
      () => visualPresence.digitalLifeSpineDigest.value,
      () => attention.activePresence.value,
      () => posture.presencePosture.value,
      () => options.performanceManifest.value,
    ],
    () => {
      syncResidentPerformanceFromVisualPresence()
    },
    { deep: true, immediate: true },
  )

  function dispose() {
    performance.dispose()
    speech.dispose()
    visualPresence.dispose()
    attention.dispose()
    presence.dispose()
  }

  return {
    applyTransientDigitalLifeSpine: visualPresence.applyTransientDigitalLifeSpine,
    applyEmotionSpeechStyle,
    applySyntheticSpeechSegment: (segment: TextSegment) => speech.applySyntheticSpeechSegment(segment),
    bindPlaybackManager: speech.bindPlaybackManager,
    digitalLifeSpineDigest: visualPresence.digitalLifeSpineDigest,
    diagnostics: readonly(diagnostics.snapshot) as Readonly<ComputedRef<StageEmbodimentDiagnosticsSnapshot>>,
    dispose,
    discardPreviewSpeechSegment: speech.discardPreviewSpeechSegment,
    live2dFocusAt: attention.live2dFocusAt,
    live2dIdleMotionPreference: idlePerformance.live2dIdleMotionPreference,
    normalizePresenceEmotionName,
    nowSpeaking: speech.nowSpeaking,
    onPlaybackEvent: speech.onPlaybackEvent,
    performanceState: performance.state,
    playAudioSource: speech.playAudioSource,
    previewSpeechSegment: speech.previewSpeechSegment,
    primeDigitalLifeEnvelope: speech.primeDigitalLifeEnvelope,
    primeSpeechTimeline: speech.primeSpeechTimeline,
    prepareForNextMessage: async () => {
      performance.clear()
      await speech.prepareForNextMessage()
    },
    presencePosture: posture.presencePosture,
    speechRenderState: speech.speechRenderState,
    styledPitch,
    styledRate,
    visualPresenceState: visualPresence.state,
    vrmIdleActionPreference: idlePerformance.vrmIdleActionPreference,
    vrmLookAtScreenPoint: attention.vrmLookAtScreenPoint,
  }
}
