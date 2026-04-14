<script setup lang="ts">
import type {
  VrmActionBinding,
  VrmRuntimeCapabilitySnapshot,
} from '@proj-alicization/stage-ui-three'
import type { SpeechProviderWithExtraOptions } from '@xsai-ext/providers/utils'
import type { UnElevenLabsOptions } from 'unspeech'

import type { EmotionPayload } from '../../constants/emotions'
import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'
import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationPresencePulsePayload,
  AlicizationRuntimeDigest,
} from '../../stores/alicization-bridge'

import { createBufferedSpeechAudioSource, createPlaybackManager, createSpeechPipeline } from '@proj-alicization/pipelines-audio'
import { createLazyBroadcastPoster, listStageEmbodimentLive2DFacialCapabilities } from '@proj-alicization/stage-shared'
import { Live2DScene, useLive2d } from '@proj-alicization/stage-ui-live2d'
import { ThreeScene, useModelStore } from '@proj-alicization/stage-ui-three'
import { animations, builtinActionBindings } from '@proj-alicization/stage-ui-three/assets/vrm'
import {
  listVrmPresetFacialCapabilities,
  resolveVrmBaseExpressionName,
  supportsVrmBaseEmotion,
} from '@proj-alicization/stage-ui-three/composables/vrm'
import { createQueue } from '@proj-alicization/stream-kit'
import { useLocalStorage, useMediaQuery, useNow, useResizeObserver } from '@vueuse/core'
// import { createTransformers } from '@xsai-transformers/embed'
// import embedWorkerURL from '@xsai-transformers/embed/worker?worker&url'
// import { embed } from '@xsai/embed'
import { generateSpeech } from '@xsai/generate-speech'
import { storeToRefs } from 'pinia'
import { computed, onBeforeMount, onErrorCaptured, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import StageDialoguePanel from './stage-dialogue-panel.vue'
import StageEmbodimentDiagnosticsOverlay from './stage-embodiment-diagnostics-overlay.vue'

import { useDelayMessageQueue, useEmotionsMessageQueue } from '../../composables/queues'
import { llmInferenceEndToken } from '../../constants'
import { EMOTION_EmotionMotionName_value, EMOTION_VRMExpressionName_value } from '../../constants/emotions'
import {
  alicizationEmotionWhitelist,
  clampAlicizationPerformancePayloadToManifest,
  getAlicizationBridge,
  hasAlicizationBridge,
} from '../../stores/alicization-bridge'
import { useAlicizationPresenceDispatcherStore } from '../../stores/alicization-presence-dispatcher'
import { useAudioContext, useSpeakingStore } from '../../stores/audio'
import { useChatOrchestratorStore } from '../../stores/chat'
import { useChatSessionStore } from '../../stores/chat/session-store'
import { useChatStreamStore } from '../../stores/chat/stream-store'
import { useAiriCardStore } from '../../stores/modules'
import { useSpeechStore } from '../../stores/modules/speech'
import { useProvidersStore } from '../../stores/providers'
import { useSettings } from '../../stores/settings'
import { useSpeechRuntimeStore } from '../../stores/speech-runtime'
import { isVrmCustomExpressionConfigured, resolveLive2DActionBindingForMotion, useStagePerformanceStore } from '../../stores/stage-performance'
import { resolveStageBubblePlacement, resolveStageBubbleText } from '../../utils'
import { resolveStageProactiveFeedbackTarget } from '../../utils/stage-dialogue'
import { useStageDesktopInteractions } from './use-stage-desktop-interactions'
import { useStageDialogueHoverVisibility } from './use-stage-dialogue-hover-visibility'
import { useStageEmbodimentRuntime } from './use-stage-embodiment-runtime'

const props = withDefaults(defineProps<{
  paused?: boolean
  focusAt: { x: number, y: number }
  xOffset?: number | string
  yOffset?: number | string
  live2dPositionMode?: 'percent' | 'pixel'
  scale?: number
  quickReplyEnabled?: boolean
  characterHoveredOverride?: boolean | null
  debugEmbodiment?: boolean
}>(), { paused: false, live2dPositionMode: 'percent', scale: 1, quickReplyEnabled: true, characterHoveredOverride: null, debugEmbodiment: false })

const emit = defineEmits<{
  (e: 'desktopInteractionChange', active: boolean): void
}>()
const { t } = useI18n()

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })
// const transformersProvider = createTransformers({ embedWorkerURL })

const stageRootRef = ref<HTMLDivElement | null>(null)
const vrmViewerRef = ref<InstanceType<typeof ThreeScene>>()
const live2dSceneRef = ref<InstanceType<typeof Live2DScene>>()

console.info('[stage-startup-trace][stage] setup-start')
queueMicrotask(() => {
  console.info('[stage-startup-trace][stage] setup-microtask')
})
setTimeout(() => {
  console.info('[stage-startup-trace][stage] setup-timeout-1000ms')
}, 1_000)

onErrorCaptured((error, instance, info) => {
  console.error('[stage-startup-trace][stage] captured-error', {
    info,
    component: instance?.$?.type,
    error,
  })
})

const settingsStore = useSettings()
const {
  stageModelRenderer,
  stageViewControlsEnabled,
  live2dDisableFocus,
  stageModelSelectedUrl,
  stageModelSelected,
  themeColorsHue,
  themeColorsHueDynamic,
  live2dIdleAnimationEnabled,
  live2dAutoBlinkEnabled,
  live2dForceAutoBlinkEnabled,
  live2dShadowEnabled,
  live2dMaxFps,
} = storeToRefs(settingsStore)
const { mouthOpenSize } = storeToRefs(useSpeakingStore())
console.info('[stage-startup-trace][stage] before-audio-context')
const { audioContext } = useAudioContext()
console.info('[stage-startup-trace][stage] after-audio-context')

const chatOrchestrator = useChatOrchestratorStore()
const {
  onBeforeMessageComposed,
  onEmbodimentMeta,
  onTokenLiteral,
  onTokenSpecial,
  onStreamEnd,
  onAssistantResponseEnd,
} = chatOrchestrator
const { sending } = storeToRefs(chatOrchestrator)
const chatHookCleanups: Array<() => void> = []
// WORKAROUND: clear previous handlers on unmount to avoid duplicate calls when this component remounts.
//             We keep per-hook disposers instead of wiping the global chat hooks to play nicely with
//             cross-window broadcast wiring.

const providersStore = useProvidersStore()
const alicizationPresenceDispatcherStore = useAlicizationPresenceDispatcherStore()
const live2dStore = useLive2d()
const modelStore = useModelStore()
const stagePerformanceStore = useStagePerformanceStore()
const chatSessionStore = useChatSessionStore()
const chatStreamStore = useChatStreamStore()
const dialoguePanelRef = ref<InstanceType<typeof StageDialoguePanel>>()
const { messages } = storeToRefs(chatSessionStore)
const { streamingMessage } = storeToRefs(chatStreamStore)
const { position: live2dPosition, scale: live2dScale } = storeToRefs(live2dStore)
const {
  bootstrapCameraDistance,
  cameraDistance,
  cameraFOV,
  modelOffset,
} = storeToRefs(modelStore)
const resolvedVrmExternalAnimations = ref<VrmActionBinding[]>([])
const currentVrmRuntimeCapabilities = ref<VrmRuntimeCapabilitySnapshot | null>(null)
const showStage = ref(true)
const viewUpdateCleanups: Array<() => void> = []
const stageBounds = ref({ width: 0, height: 0 })
const directDesktopInteractionActive = ref(false)
const dialoguePanelInteractionActive = ref(false)

useResizeObserver(stageRootRef, (entries) => {
  const entry = entries[0]
  if (!entry)
    return

  stageBounds.value = {
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  }
})

const desktopInteractions = useStageDesktopInteractions({
  stageElement: stageRootRef,
  dialogueElement: () => dialoguePanelRef.value?.panelRootElement(),
  stageModelRenderer,
  live2dHandle: () => {
    const scene = live2dSceneRef.value
    if (!scene)
      return undefined

    return {
      characterFrame: () => scene.characterFrame() ?? null,
      dragAnchorClientPoint: () => scene.dragAnchorClientPoint?.() ?? null,
      hitTestClientPoint: (clientX: number, clientY: number) => scene.hitTestClientPoint(clientX, clientY),
    }
  },
  vrmHandle: () => {
    const scene = vrmViewerRef.value
    if (!scene)
      return undefined

    return {
      characterFrame: () => scene.characterFrame() ?? null,
      hitTestClientPoint: (clientX: number, clientY: number) => scene.hitTestClientPoint(clientX, clientY),
    }
  },
  live2dPositionMode: computed(() => props.live2dPositionMode),
  live2dPosition,
  live2dScale,
  vrmModelOffset: modelOffset,
  vrmCameraDistance: cameraDistance,
  vrmBootstrapCameraDistance: bootstrapCameraDistance,
  vrmCameraFov: cameraFOV,
  onInteractionChange(active) {
    directDesktopInteractionActive.value = active
  },
})
console.info('[stage-startup-trace][stage] after-desktop-interactions')

watch(
  () => directDesktopInteractionActive.value || dialoguePanelInteractionActive.value,
  (active) => {
    emit('desktopInteractionChange', active)
  },
  { flush: 'sync', immediate: true },
)

// Caption + Presentation broadcast channels
type CaptionChannelEvent
  = | { type: 'caption-speaker', text: string }
    | { type: 'caption-assistant', text: string }
const captionPoster = createLazyBroadcastPoster<CaptionChannelEvent>('airi-caption-overlay')
const assistantCaption = ref('')
const hoverCapable = useMediaQuery('(hover: hover) and (pointer: fine)')
const stageCharacterHovered = ref(false)
const dialoguePanelHovered = ref(false)
const dialoguePanelFocused = ref(false)

type PresentEvent
  = | { type: 'assistant-reset' }
    | { type: 'assistant-append', text: string }
const presentPoster = createLazyBroadcastPoster<PresentEvent>('airi-chat-present')

viewUpdateCleanups.push(live2dStore.onShouldUpdateView(async () => {
  showStage.value = false
  try {
    await settingsStore.updateStageModel()
  }
  catch (error) {
    console.warn('[stage-ui] failed to refresh live2d stage view:', error)
  }
  finally {
    setTimeout(() => {
      showStage.value = true
    }, 100)
  }
}))

const { activeCard } = storeToRefs(useAiriCardStore())
const speechStore = useSpeechStore()
const { ssmlEnabled, activeSpeechProvider, activeSpeechModel, activeSpeechVoice, pitch, rate } = storeToRefs(speechStore)
const activeCardId = computed(() => activeCard.value?.name ?? 'default')
const speechRuntimeStore = useSpeechRuntimeStore()
const currentChatIntent = ref<ReturnType<typeof speechRuntimeStore.openIntent> | null>(null)
const debugEmbodimentStorage = useLocalStorage('devtools/embodiment-debug', false)
const showEmbodimentDiagnostics = computed(() => {
  return Boolean(props.debugEmbodiment || (import.meta.env.DEV && debugEmbodimentStorage.value))
})
let embodimentRuntime: ReturnType<typeof useStageEmbodimentRuntime> | null = null

const { currentMotion } = storeToRefs(useLive2d())
const runtimeTurnExpressionAliasesByEmotion = ref<Partial<Record<string, string[]>>>({})
const runtimeTurnMotionAliasesByEmotion = ref<Partial<Record<string, string[]>>>({})
const runtimeSegmentExpressionAliasesByEmotion = ref<Partial<Record<string, string[]>>>({})
const runtimeSegmentMotionAliasesByEmotion = ref<Partial<Record<string, string[]>>>({})
const runtimeSegmentMotionActive = ref(false)
let runtimeSegmentMotionFollowThroughMs = 0
const runtimeResidentEmotion = ref('')
const runtimeDigest = ref<AlicizationRuntimeDigest | null>(null)
let runtimeSegmentMotionFollowThroughTimer: ReturnType<typeof setTimeout> | undefined

function normalizeRuntimeAliasList(rawAliases: readonly string[] | null | undefined) {
  return [...new Set(
    (rawAliases ?? [])
      .map(alias => alias.trim())
      .filter(Boolean),
  )]
}

function mergePreferredAliases(runtimeAliases: readonly string[] | null | undefined, configuredAliases: readonly string[] | null | undefined) {
  return normalizeRuntimeAliasList([
    ...(runtimeAliases ?? []),
    ...(configuredAliases ?? []),
  ])
}

function clearRuntimeSegmentEmbodimentCue() {
  runtimeSegmentExpressionAliasesByEmotion.value = {}
  runtimeSegmentMotionAliasesByEmotion.value = {}
}

function clearRuntimeSegmentMotionFollowThroughTimer() {
  if (!runtimeSegmentMotionFollowThroughTimer)
    return

  clearTimeout(runtimeSegmentMotionFollowThroughTimer)
  runtimeSegmentMotionFollowThroughTimer = undefined
}

function clearRuntimeEmbodimentEnvelope() {
  runtimeTurnExpressionAliasesByEmotion.value = {}
  runtimeTurnMotionAliasesByEmotion.value = {}
  runtimeDigest.value = null
  clearRuntimeSegmentEmbodimentCue()
  runtimeSegmentMotionActive.value = false
  runtimeSegmentMotionFollowThroughMs = 0
  clearRuntimeSegmentMotionFollowThroughTimer()
}

function createSpeechIntentMetadata(intentSource: 'chat' | 'fallback'): Record<string, unknown> {
  const digest = embodimentRuntime?.digitalLifeSpineDigest.value ?? null
  if (!digest) {
    return {
      source: 'stage',
      intentSource,
    }
  }

  const runtime = digest.runtime
  const proactive = digest.proactive
  const architecture = digest.architecture

  return {
    source: 'stage',
    intentSource,
    generatedAt: Date.now(),
    digitalLifeSpine: {
      runtime: {
        activeThreadId: runtime.activeThreadId,
        watchMode: runtime.watchMode,
        dominantMode: runtime.dominantMode,
        answerIntent: runtime.answerIntent,
        preferredPresence: runtime.preferredPresence,
        selectedAction: runtime.selectedAction,
        updatedAt: runtime.updatedAt,
      },
      architecture: architecture
        ? {
            operatingMode: architecture.operatingMode,
            dominantSystem: architecture.dominantSystem,
          }
        : null,
      proactive: proactive
        ? {
            activeThreadId: proactive.activeThreadId,
            selectedAction: proactive.selectedAction,
            preferredStyle: proactive.preferredStyle,
            confidence: proactive.confidence,
            shouldSpeak: proactive.shouldSpeak,
          }
        : null,
    },
    runtimeDigest: runtimeDigest.value
      ? {
          dominantChannel: runtimeDigest.value.dominantChannel,
          shouldProactivelySpeak: runtimeDigest.value.shouldProactivelySpeak,
          shouldProactivelyAct: runtimeDigest.value.shouldProactivelyAct,
          continuityPressure: runtimeDigest.value.continuityPressure,
          companionshipPressure: runtimeDigest.value.companionshipPressure,
          summary: runtimeDigest.value.summary,
        }
      : null,
  }
}

function applyRuntimeEmbodimentEnvelope(embodiment: AlicizationDialogueEmbodimentEnvelope | null | undefined) {
  const emotion = typeof embodiment?.emotion === 'string' ? embodiment.emotion.trim() : ''
  if (!emotion) {
    runtimeTurnExpressionAliasesByEmotion.value = {}
    runtimeTurnMotionAliasesByEmotion.value = {}
    return
  }

  const preferredExpressionAliases = normalizeRuntimeAliasList(embodiment?.rendererHints?.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRuntimeAliasList(embodiment?.rendererHints?.preferredMotionAliases)

  runtimeTurnExpressionAliasesByEmotion.value = preferredExpressionAliases.length > 0
    ? { [emotion]: preferredExpressionAliases }
    : {}
  runtimeTurnMotionAliasesByEmotion.value = preferredMotionAliases.length > 0
    ? { [emotion]: preferredMotionAliases }
    : {}
}

function applyRuntimeEmbodimentCue(cue: {
  emotion?: string | null
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints']
} | null | undefined) {
  const emotion = typeof cue?.emotion === 'string' ? cue.emotion.trim() : ''
  if (!emotion) {
    clearRuntimeSegmentEmbodimentCue()
    if (!runtimeSegmentMotionActive.value)
      runtimeSegmentMotionFollowThroughMs = 0
    return
  }

  const preferredExpressionAliases = normalizeRuntimeAliasList(cue?.rendererHints?.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRuntimeAliasList(cue?.rendererHints?.preferredMotionAliases)
  runtimeSegmentExpressionAliasesByEmotion.value = preferredExpressionAliases.length > 0
    ? { [emotion]: preferredExpressionAliases }
    : {}
  runtimeSegmentMotionAliasesByEmotion.value = preferredMotionAliases.length > 0
    ? { [emotion]: preferredMotionAliases }
    : {}
}

function resolvePreferredVrmExpressionAliases(emotion: string) {
  return mergePreferredAliases(
    runtimeSegmentExpressionAliasesByEmotion.value[emotion],
    mergePreferredAliases(
      runtimeTurnExpressionAliasesByEmotion.value[emotion],
      stagePerformanceStore.resolveVrmEmotionExpressionAliases(stageModelSelected.value, emotion),
    ),
  )
}

function resolvePreferredLive2DMotionAliases(emotion: string) {
  return mergePreferredAliases(
    runtimeSegmentMotionAliasesByEmotion.value[emotion],
    mergePreferredAliases(
      runtimeTurnMotionAliasesByEmotion.value[emotion],
      stagePerformanceStore.resolveLive2DEmotionMotionAliases(stageModelSelected.value, emotion),
    ),
  )
}

function setCurrentMotionIfChanged(nextMotion: { group: string, index?: number }) {
  if (currentMotion.value.group === nextMotion.group && currentMotion.value.index === nextMotion.index)
    return

  currentMotion.value = nextMotion
}

function applyLive2DSegmentMotionHint(cue: {
  emotion?: string | null
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints']
  rendererSettle?: {
    live2dMotionFollowThroughMs?: number
  } | null
} | null | undefined) {
  if (stageModelRenderer.value !== 'live2d')
    return

  clearRuntimeSegmentMotionFollowThroughTimer()
  const emotion = typeof cue?.emotion === 'string' ? cue.emotion.trim() : ''
  if (!emotion) {
    if (!runtimeSegmentMotionActive.value)
      return

    const residentEmotion = runtimeResidentEmotion.value
    if (!residentEmotion)
      return

    const revertToResidentMotion = () => {
      runtimeSegmentMotionActive.value = false
      const resolvedResidentMotion = live2dStore.resolveEmotionMotionSelection(stageModelSelected.value, residentEmotion, {
        preferredMotionAliases: resolvePreferredLive2DMotionAliases(residentEmotion),
      })
      if (resolvedResidentMotion)
        setCurrentMotionIfChanged(resolvedResidentMotion)
    }

    const followThroughMs = Math.max(0, runtimeSegmentMotionFollowThroughMs)
    if (followThroughMs > 0) {
      runtimeSegmentMotionFollowThroughTimer = setTimeout(() => {
        runtimeSegmentMotionFollowThroughTimer = undefined
        runtimeSegmentMotionFollowThroughMs = 0
        revertToResidentMotion()
      }, followThroughMs)
      return
    }

    runtimeSegmentMotionFollowThroughMs = 0
    revertToResidentMotion()
    return
  }

  runtimeSegmentMotionFollowThroughMs = Math.max(
    0,
    Math.round(Number(cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)),
  )
  const preferredMotionAliases = normalizeRuntimeAliasList(cue?.rendererHints?.preferredMotionAliases)
  const resolvedMotion = live2dStore.resolveEmotionMotionSelection(stageModelSelected.value, emotion, {
    preferredMotionAliases,
  })
  if (resolvedMotion) {
    runtimeSegmentMotionActive.value = true
    setCurrentMotionIfChanged(resolvedMotion)
    return
  }

  const fallbackGroup = preferredMotionAliases[0]
  if (fallbackGroup) {
    runtimeSegmentMotionActive.value = true
    setCurrentMotionIfChanged({ group: fallbackGroup })
  }
}

function resolveEmotionPerformanceEmphasis(intensity: number) {
  if (intensity >= 0.92)
    return 2
  if (intensity >= 0.68)
    return 1
  return 0
}

const emotionsQueue = createQueue<EmotionPayload>({
  handlers: [
    async (ctx) => {
      if (stageModelRenderer.value === 'vrm') {
        const baseEmotion = resolveVrmBaseExpressionName(
          EMOTION_VRMExpressionName_value[ctx.data.name] ?? 'neutral',
          resolvePreferredVrmExpressionAliases(ctx.data.name),
        )
        await vrmViewerRef.value?.applyPerformance?.({
          actionCue: null,
          baseEmotion,
          emphasis: resolveEmotionPerformanceEmphasis(ctx.data.intensity),
          facialCue: null,
        })
      }
      else if (stageModelRenderer.value === 'live2d') {
        if (ctx.data.suppressLive2DMotion === true)
          return

        const resolvedMotion = live2dStore.resolveEmotionMotionSelection(stageModelSelected.value, ctx.data.name, {
          preferredMotionAliases: resolvePreferredLive2DMotionAliases(ctx.data.name),
        })
        if (resolvedMotion) {
          currentMotion.value = resolvedMotion
          return
        }

        currentMotion.value = {
          group: resolvePreferredLive2DMotionAliases(ctx.data.name)[0]
            ?? EMOTION_EmotionMotionName_value[ctx.data.name],
        }
      }
    },
  ],
})

const emotionMessageContentQueue = useEmotionsMessageQueue(emotionsQueue)
emotionMessageContentQueue.onHandlerEvent('emotion', (emotion) => {
  embodimentRuntime?.applyEmotionSpeechStyle(emotion.name)
  // eslint-disable-next-line no-console
  console.debug('emotion detected', emotion)
})

const delaysQueue = useDelayMessageQueue()
delaysQueue.onHandlerEvent('delay', (delay) => {
  // eslint-disable-next-line no-console
  console.debug('delay detected', delay)
})

// Play special token: delay or emotion
function playSpecialToken(special: string) {
  delaysQueue.enqueue(special)
  emotionMessageContentQueue.enqueue(special)
}

const playbackManager = createPlaybackManager<BrowserSpeechAudioSource>({
  play: async (...args) => {
    if (!embodimentRuntime)
      return

    await embodimentRuntime.playAudioSource(...args)
  },
  maxVoices: 1,
  maxVoicesPerOwner: 1,
  overflowPolicy: 'queue',
  ownerOverflowPolicy: 'steal-oldest',
})

const speechPipeline = createSpeechPipeline<BrowserSpeechAudioSource>({
  ttsConcurrency: 2,
  tts: async (request, signal) => {
    if (signal.aborted)
      return null

    if (activeSpeechProvider.value === 'speech-noop')
      return null

    if (!activeSpeechProvider.value)
      return null

    const provider = await providersStore.getProviderInstance(activeSpeechProvider.value) as SpeechProviderWithExtraOptions<string, UnElevenLabsOptions>
    if (!provider) {
      console.error('Failed to initialize speech provider')
      return null
    }

    if (!request.text && !request.special)
      return null

    const providerConfig = providersStore.getProviderConfig(activeSpeechProvider.value)

    // For OpenAI Compatible providers, always use provider config for model and voice
    // since these are manually configured in provider settings
    let model = activeSpeechModel.value
    let voice = activeSpeechVoice.value

    if (activeSpeechProvider.value === 'openai-compatible-audio-speech') {
      // Always prefer provider config for OpenAI Compatible (user configured it there)
      if (providerConfig?.model) {
        model = providerConfig.model as string
      }
      else {
        // Fallback to default if not in provider config
        model = 'tts-1'
        console.warn('[Speech Pipeline] OpenAI Compatible: No model in provider config, using default', { providerConfig })
      }

      if (providerConfig?.voice) {
        voice = {
          id: providerConfig.voice as string,
          name: providerConfig.voice as string,
          description: providerConfig.voice as string,
          previewURL: '',
          languages: [{ code: 'en', title: 'English' }],
          provider: activeSpeechProvider.value,
          gender: 'neutral',
        }
      }
      else {
        // Fallback to default if not in provider config
        voice = {
          id: 'alloy',
          name: 'alloy',
          description: 'alloy',
          previewURL: '',
          languages: [{ code: 'en', title: 'English' }],
          provider: activeSpeechProvider.value,
          gender: 'neutral',
        }
        console.warn('[Speech Pipeline] OpenAI Compatible: No voice in provider config, using default', { providerConfig })
      }
    }

    if (!model || !voice)
      return null

    const providerRuntimeConfigForSsml = {
      ...providerConfig,
      pitch: embodimentRuntime?.styledPitch.value ?? pitch.value,
      speed: embodimentRuntime?.styledRate.value ?? rate.value,
    }

    const input = ssmlEnabled.value
      ? speechStore.generateSSML(request.text, voice, providerRuntimeConfigForSsml)
      : request.text

    try {
      const res = await generateSpeech({
        ...provider.speech(model, providerConfig),
        input,
        voice: voice.id,
      })

      if (signal.aborted || !res || res.byteLength === 0)
        return null

      const audioBuffer = await audioContext.decodeAudioData(res)
      return createBufferedSpeechAudioSource(audioBuffer)
    }
    catch {
      return null
    }
  },
  playback: playbackManager,
})
console.info('[stage-startup-trace][stage] after-speech-pipeline')

function resolvePresenceIntensity(emphasis: number | undefined, fallbackIntensity: number) {
  const normalizedEmphasis = typeof emphasis === 'number' && Number.isFinite(emphasis)
    ? emphasis
    : Number.NaN
  if (!Number.isFinite(normalizedEmphasis))
    return fallbackIntensity
  if (normalizedEmphasis >= 2)
    return 1
  if (normalizedEmphasis >= 1)
    return Math.max(fallbackIntensity, 0.85)
  return fallbackIntensity
}

function resolvePresencePulsePerformance(payload: AlicizationPresencePulsePayload): AlicizationDialoguePerformancePayload {
  const emotion = (() => {
    if (payload.embodiedPresence === 'concerned')
      return payload.emotionalTension === 'late-night-drain' ? 'tired' : 'concerned'
    if (payload.embodiedPresence === 'hesitant')
      return 'thinking'
    if (payload.embodiedPresence === 'attentive')
      return payload.watchMode === 'symbiotic-vision' ? 'thinking' : 'neutral'
    return 'neutral'
  })()
  const delivery = payload.embodiedPresence === 'hesitant'
    ? 'hesitant'
    : payload.embodiedPresence === 'concerned'
      ? 'gentle'
      : 'calm'
  const emphasis = payload.embodiedPresence === 'concerned'
    ? 1
    : payload.embodiedPresence === 'attentive'
      ? 1
      : 0

  return {
    baseEmotion: emotion,
    emotion,
    facialCue: null,
    actionCue: null,
    delivery,
    emphasis,
  }
}

function syncVrmCustomExpressionScan(names: string[]) {
  if (stageModelRenderer.value !== 'vrm' || !stageModelSelected.value)
    return

  stagePerformanceStore.setVrmCustomExpressionNames(stageModelSelected.value, names)
}

async function refreshResolvedVrmExternalAnimations() {
  if (stageModelRenderer.value !== 'vrm' || !stageModelSelected.value) {
    resolvedVrmExternalAnimations.value = []
    return
  }

  resolvedVrmExternalAnimations.value = await stagePerformanceStore.resolveVrmExternalAnimations(stageModelSelected.value, {
    configuredOnly: true,
  })
}

function syncVrmRuntimeCapabilities(snapshot?: VrmRuntimeCapabilitySnapshot | null) {
  if (stageModelRenderer.value !== 'vrm') {
    currentVrmRuntimeCapabilities.value = null
    return
  }

  if (!snapshot) {
    currentVrmRuntimeCapabilities.value = null
    return
  }

  currentVrmRuntimeCapabilities.value = {
    supportedExpressionNames: [...new Set(snapshot.supportedExpressionNames
      .map(name => name.trim().toLowerCase())
      .filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    supportsLookAt: snapshot.supportsLookAt === true,
    supportsVisemeLipSync: snapshot.supportsVisemeLipSync === true,
    supportsMicroDynamics: snapshot.supportsMicroDynamics === true,
  }
}

function dedupeCapabilityItemsByKey<T extends { key: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.key.trim()
    if (!key || seen.has(key))
      return false

    seen.add(key)
    return true
  })
}

const currentLive2DActionCapabilities = computed(() => {
  return live2dStore.getAvailableMotionsForModel(stageModelSelected.value)
    .map((motion) => {
      return resolveLive2DActionBindingForMotion(
        motion,
        stagePerformanceStore.listLive2DActions(stageModelSelected.value).find(item => item.fileName === motion.fileName),
      )
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
})

const currentLive2DResolvedActionCapabilities = computed(() => {
  return currentLive2DActionCapabilities.value.map(item => ({
    key: item.actionKey,
    label: item.label,
    description: item.description,
    source: item.source,
  }))
})

const currentVrmCustomExpressionBindings = computed(() => {
  const scanned = new Set(stagePerformanceStore.listVrmCustomExpressionNames(stageModelSelected.value))
  return stagePerformanceStore.listVrmCustomExpressions(stageModelSelected.value)
    .filter(item => scanned.has(item.expressionName))
})

const currentVrmManifestCustomExpressionBindings = computed(() => {
  return currentVrmCustomExpressionBindings.value.filter(item => isVrmCustomExpressionConfigured(item))
})

const currentVrmSupportedExpressionNames = computed(() => currentVrmRuntimeCapabilities.value?.supportedExpressionNames ?? [])
const currentVrmSupportedBaseEmotions = computed(() => {
  if (stageModelRenderer.value !== 'vrm' || currentVrmSupportedExpressionNames.value.length === 0)
    return []

  return alicizationEmotionWhitelist.filter(emotion => supportsVrmBaseEmotion(
    currentVrmSupportedExpressionNames.value,
    emotion,
    stagePerformanceStore.resolveVrmEmotionExpressionAliases(stageModelSelected.value, emotion),
  ))
})

const currentVrmBaseExpressionOverrides = computed(() => {
  return Object.fromEntries(
    alicizationEmotionWhitelist.map(emotion => [
      emotion,
      resolvePreferredVrmExpressionAliases(emotion),
    ]),
  )
})

const currentVrmPresetFacialCapabilities = computed(() => {
  return listVrmPresetFacialCapabilities(currentVrmSupportedExpressionNames.value).map(item => ({
    key: item.key,
    label: item.label,
    description: item.description,
    source: 'preset' as const,
    affectsMouth: item.affectsMouth,
  }))
})

const currentVrmFacialCapabilities = computed(() => {
  return dedupeCapabilityItemsByKey([
    ...currentVrmManifestCustomExpressionBindings.value.map(item => ({
      key: item.facialKey,
      label: item.label,
      description: item.description,
      source: 'custom' as const,
      affectsMouth: item.affectsMouth,
    })),
    ...currentVrmPresetFacialCapabilities.value,
  ])
})

const currentStoredVrmExternalAnimations = computed(() => {
  return stagePerformanceStore.listVrmExternalAnimations(stageModelSelected.value)
})

const currentVrmActionBindings = computed(() => {
  if (stageModelRenderer.value !== 'vrm')
    return []

  return [
    ...resolvedVrmExternalAnimations.value,
    ...builtinActionBindings,
  ]
})

const currentPerformanceEmbodimentHints = computed(() => {
  const explicitActionCuePreferences = stagePerformanceStore.listEmotionActionCuePreferences(stageModelSelected.value)

  if (stageModelRenderer.value === 'live2d') {
    const explicitMotionAliases = stagePerformanceStore.listLive2DEmotionMotionAliases(stageModelSelected.value)
    const embodimentHintsByEmotion = new Map<string, Record<string, string[]>>()

    Object.entries(explicitMotionAliases)
      .filter(([, aliases]) => Array.isArray(aliases) && aliases.length > 0)
      .forEach(([emotion, aliases]) => {
        const current = embodimentHintsByEmotion.get(emotion) ?? {}
        current.preferredMotionAliases = aliases
        embodimentHintsByEmotion.set(emotion, current)
      })
    Object.entries(explicitActionCuePreferences)
      .filter(([, cues]) => Array.isArray(cues) && cues.length > 0)
      .forEach(([emotion, cues]) => {
        const current = embodimentHintsByEmotion.get(emotion) ?? {}
        current.preferredActionCues = cues
        embodimentHintsByEmotion.set(emotion, current)
      })

    const embodimentHints = Object.fromEntries(embodimentHintsByEmotion)

    return Object.keys(embodimentHints).length > 0 ? embodimentHints : null
  }

  if (stageModelRenderer.value === 'vrm') {
    const explicitExpressionAliases = stagePerformanceStore.listVrmEmotionExpressionAliases(stageModelSelected.value)
    const explicitFacialCuePreferences = stagePerformanceStore.listVrmEmotionFacialCuePreferences(stageModelSelected.value)
    const embodimentHintsByEmotion = new Map<string, Record<string, string[]>>()

    Object.entries(explicitExpressionAliases)
      .filter(([, aliases]) => Array.isArray(aliases) && aliases.length > 0)
      .forEach(([emotion, aliases]) => {
        const current = embodimentHintsByEmotion.get(emotion) ?? {}
        current.preferredExpressionAliases = aliases
        embodimentHintsByEmotion.set(emotion, current)
      })
    Object.entries(explicitFacialCuePreferences)
      .filter(([, cues]) => Array.isArray(cues) && cues.length > 0)
      .forEach(([emotion, cues]) => {
        const current = embodimentHintsByEmotion.get(emotion) ?? {}
        current.preferredFacialCues = cues
        embodimentHintsByEmotion.set(emotion, current)
      })
    Object.entries(explicitActionCuePreferences)
      .filter(([, cues]) => Array.isArray(cues) && cues.length > 0)
      .forEach(([emotion, cues]) => {
        const current = embodimentHintsByEmotion.get(emotion) ?? {}
        current.preferredActionCues = cues
        embodimentHintsByEmotion.set(emotion, current)
      })

    const embodimentHints = Object.fromEntries(embodimentHintsByEmotion)

    return Object.keys(embodimentHints).length > 0 ? embodimentHints : null
  }

  return null
})

const currentPerformanceManifest = computed(() => {
  if (stageModelRenderer.value === 'live2d') {
    return {
      renderer: 'live2d' as const,
      supportedBaseEmotions: [...alicizationEmotionWhitelist],
      supportedFacialCues: listStageEmbodimentLive2DFacialCapabilities(),
      supportedActions: currentLive2DResolvedActionCapabilities.value,
      supportsLookAt: !live2dDisableFocus.value,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: currentPerformanceEmbodimentHints.value,
    }
  }

  if (stageModelRenderer.value === 'vrm') {
    return {
      renderer: 'vrm' as const,
      supportedBaseEmotions: currentVrmSupportedBaseEmotions.value,
      supportedFacialCues: currentVrmFacialCapabilities.value,
      supportedActions: dedupeCapabilityItemsByKey(currentVrmActionBindings.value.map(item => ({
        key: item.actionKey,
        label: item.label,
        description: item.description,
        source: item.source,
      }))),
      supportsLookAt: currentVrmRuntimeCapabilities.value?.supportsLookAt === true,
      supportsVisemeLipSync: currentVrmRuntimeCapabilities.value?.supportsVisemeLipSync === true,
      supportsMicroDynamics: currentVrmRuntimeCapabilities.value?.supportsMicroDynamics === true,
      embodimentHints: currentPerformanceEmbodimentHints.value,
    }
  }

  return null
})

function clampPresencePerformanceToManifest(performance: AlicizationDialoguePerformancePayload) {
  return clampAlicizationPerformancePayloadToManifest(
    performance,
    currentPerformanceManifest.value,
    performance.baseEmotion,
  ).performance
}

function resolveClampedPresencePulsePerformance(payload: AlicizationPresencePulsePayload) {
  return clampPresencePerformanceToManifest(resolvePresencePulsePerformance(payload))
}

watch([stageModelRenderer, stageModelSelected, currentStoredVrmExternalAnimations], async () => {
  await refreshResolvedVrmExternalAnimations()
}, { immediate: true, deep: true })

watch([stageModelRenderer, stageModelSelected], ([renderer]) => {
  if (renderer !== 'vrm') {
    currentVrmRuntimeCapabilities.value = null
    return
  }

  currentVrmRuntimeCapabilities.value = null
}, { immediate: true })

embodimentRuntime = useStageEmbodimentRuntime({
  applyRuntimeEmbodimentEnvelope,
  audioContext,
  clampPerformance: clampPresencePerformanceToManifest,
  currentMotion,
  dispatcher: alicizationPresenceDispatcherStore,
  enqueueEmotion: emotion => emotionsQueue.enqueue(emotion),
  focusAt: computed(() => props.focusAt),
  live2dActionCapabilities: currentLive2DActionCapabilities,
  mouthOpenSize,
  paused: computed(() => Boolean(props.paused)),
  performanceManifest: currentPerformanceManifest,
  pitch,
  rate,
  runtimeDigest,
  resolveClampedPresencePulsePerformance,
  resolvePresenceIntensity,
  speakFallback: async (reply) => {
    const normalizedReply = reply.trim()
    if (!normalizedReply)
      return

    if (currentChatIntent.value || embodimentRuntime?.nowSpeaking.value)
      return

    const fallbackIntent = speechRuntimeStore.openIntent({
      ownerId: activeCardId.value,
      priority: 'normal',
      behavior: 'queue',
      metadata: createSpeechIntentMetadata('fallback'),
    })
    fallbackIntent.writeLiteral(normalizedReply)
    fallbackIntent.writeFlush()
    fallbackIntent.end()
  },
  stageBounds,
  stageModelRenderer,
  vrmActionBindings: currentVrmActionBindings,
})
console.info('[stage-startup-trace][stage] after-embodiment-runtime')
const {
  bindPlaybackManager,
  diagnostics: embodimentDiagnostics,
  live2dFocusAt,
  live2dIdleMotionPreference,
  onPlaybackEvent,
  performanceState,
  prepareForNextMessage,
  presencePosture,
  speechRenderState,
  vrmIdleActionPreference,
  vrmLookAtScreenPoint,
} = embodimentRuntime
console.info('[stage-startup-trace][stage] after-embodiment-destructure')

console.info('[stage-startup-trace][stage] before-watch-component-state')
watch(componentState, (state) => {
  console.info(
    `[stage-startup-trace][stage] component-state state=${state} renderer=${stageModelRenderer.value || '<empty>'} modelId=${stageModelSelected.value || '<empty>'} modelUrl=${stageModelSelectedUrl.value ? 'available' : 'missing'}`,
  )
}, { immediate: true })
console.info('[stage-startup-trace][stage] after-watch-component-state')

console.info('[stage-startup-trace][stage] before-watch-resident-emotion')
watch(
  () => performanceState.value?.performance.baseEmotion ?? '',
  (emotion) => {
    runtimeResidentEmotion.value = typeof emotion === 'string' ? emotion.trim() : ''
  },
  { immediate: true },
)
console.info('[stage-startup-trace][stage] after-watch-resident-emotion')

console.info('[stage-startup-trace][stage] before-watch-active-cue')
watch(
  [
    () => performanceState.value?.activeCue?.id ?? '',
    () => performanceState.value?.activeCue?.emotion ?? '',
    () => performanceState.value?.activeCue?.rendererHints?.preferredExpressionAliases?.join('|') ?? '',
    () => performanceState.value?.activeCue?.rendererHints?.preferredMotionAliases?.join('|') ?? '',
    () => performanceState.value?.activeCue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
  ],
  () => {
    const performanceCue = performanceState.value?.activeCue
    const activeCue = performanceCue
      ? {
          id: performanceCue.id,
          emotion: performanceCue.emotion ?? null,
          rendererSettle: performanceCue.rendererSettle ?? null,
          rendererHints: performanceCue.rendererHints ?? null,
        }
      : null
    applyRuntimeEmbodimentCue(activeCue)
    applyLive2DSegmentMotionHint(activeCue)
  },
  { immediate: true },
)
console.info('[stage-startup-trace][stage] after-watch-active-cue')

console.info('[stage-startup-trace][stage] before-speech-pipeline-hooks')
speechPipeline.on('onSpecial', (segment) => {
  if (segment.special)
    playSpecialToken(segment.special)
})

speechPipeline.on('onTtsRequest', (request) => {
  if (!embodimentRuntime || activeSpeechProvider.value === 'speech-noop')
    return

  if (!request.text.trim())
    return

  embodimentRuntime.previewSpeechSegment({
    intentId: request.intentId,
    streamId: request.streamId,
    segmentId: request.segmentId,
    text: request.text,
    special: request.special,
    continuityHoldMs: request.continuityHoldMs,
  })
})

speechPipeline.on('onTtsResult', (result) => {
  if (!embodimentRuntime)
    return

  if (!result.text.trim())
    return

  embodimentRuntime.previewSpeechSegment({
    intentId: result.intentId,
    streamId: result.streamId,
    segmentId: result.segmentId,
    text: result.text,
    special: result.special,
    continuityHoldMs: result.continuityHoldMs,
  })
})

speechPipeline.on('onTtsSkipped', (event) => {
  embodimentRuntime?.discardPreviewSpeechSegment(event.request.segmentId)
})

speechPipeline.on('onSegment', (segment) => {
  if (activeSpeechProvider.value !== 'speech-noop')
    return
  if (!segment.text.trim())
    return
  embodimentRuntime?.previewSpeechSegment({
    intentId: segment.intentId,
    streamId: segment.streamId,
    segmentId: segment.segmentId,
    text: segment.text,
    special: segment.special,
    continuityHoldMs: segment.continuityHoldMs,
  })
  embodimentRuntime?.applySyntheticSpeechSegment(segment)
})
console.info('[stage-startup-trace][stage] after-speech-pipeline-hooks')

console.info('[stage-startup-trace][stage] before-bind-playback-manager')
bindPlaybackManager(playbackManager)
console.info('[stage-startup-trace][stage] after-bind-playback-manager')

console.info('[stage-startup-trace][stage] before-chat-hook-register')

chatHookCleanups.push(onPlaybackEvent((event) => {
  if (event.type === 'playback-start') {
    const item = event.state.item
    if (!item)
      return

    // NOTICE: postCaption and postPresent may throw errors if the BroadcastChannel is closed
    // (e.g., when navigating away from the page). We wrap these in try-catch to prevent
    // breaking playback when the channel is unavailable.
    assistantCaption.value += ` ${item.text}`
    captionPoster.post({ type: 'caption-assistant', text: assistantCaption.value })
    presentPoster.post({ type: 'assistant-append', text: item.text })
    return
  }

  if (event.type === 'playback-stop' && event.state.stopReason === null && event.state.item?.special)
    playSpecialToken(event.state.item.special)
}))

chatHookCleanups.push(onBeforeMessageComposed(async () => {
  speechRuntimeStore.cancelOwner(activeCardId.value, 'new-message')
  clearRuntimeEmbodimentEnvelope()

  await prepareForNextMessage()
  // Reset assistant caption for a new message
  assistantCaption.value = ''
  captionPoster.post({ type: 'caption-assistant', text: '' })
  presentPoster.post({ type: 'assistant-reset' })

  currentChatIntent.value = null

  currentChatIntent.value = speechRuntimeStore.openIntent({
    ownerId: activeCardId.value,
    priority: 'normal',
    behavior: 'queue',
    metadata: createSpeechIntentMetadata('chat'),
  })
}))

chatHookCleanups.push(onEmbodimentMeta(async (meta) => {
  runtimeDigest.value = meta.runtimeDigest ?? null

  if (meta.digitalLifeSpine)
    embodimentRuntime?.applyTransientDigitalLifeSpine(meta.digitalLifeSpine)

  if (meta.digitalLife)
    embodimentRuntime?.primeDigitalLifeEnvelope(meta.digitalLife)

  if (meta.speechTimeline)
    embodimentRuntime?.primeSpeechTimeline(meta.speechTimeline)

  if (!meta.embodiment || !embodimentRuntime)
    return

  applyRuntimeEmbodimentEnvelope(meta.embodiment)
  embodimentRuntime.applyEmotionSpeechStyle(
    embodimentRuntime.normalizePresenceEmotionName(meta.embodiment.emotion),
    meta.embodiment.speechStyle,
  )
}))

chatHookCleanups.push(onTokenLiteral(async (literal) => {
  currentChatIntent.value?.writeLiteral(literal)
}))

chatHookCleanups.push(onTokenSpecial(async (special) => {
  // console.debug('Stage received special token:', special)
  currentChatIntent.value?.writeSpecial(special)
}))

chatHookCleanups.push(onStreamEnd(async () => {
  delaysQueue.enqueue(llmInferenceEndToken)
  currentChatIntent.value?.writeFlush()
}))

chatHookCleanups.push(onAssistantResponseEnd(async (_message) => {
  currentChatIntent.value?.end()
  currentChatIntent.value = null
  // const res = await embed({
  //   ...transformersProvider.embed('Xenova/nomic-embed-text-v1'),
  //   input: message,
  // })

  // await db.value?.execute(`INSERT INTO memory_test (vec) VALUES (${JSON.stringify(res.embedding)});`)
}))

console.info('[stage-startup-trace][stage] after-chat-hook-register')

// Resume audio context on first user interaction (browser requirement)
let audioContextResumed = false
function resumeAudioContextOnInteraction() {
  if (audioContextResumed || !audioContext)
    return
  audioContextResumed = true
  audioContext.resume().catch(() => {
    // Ignore errors - audio context will be resumed when needed
  })
}

// Add event listeners for user interaction
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown']
  events.forEach((event) => {
    window.addEventListener(event, resumeAudioContextOnInteraction, { once: true, passive: true })
  })
}

onMounted(async () => {
  console.info('[stage-startup-trace][stage] onMounted-enter')
  // NOTICE: Speech runtime bus setup is non-critical for first paint.
  // Deferring host registration keeps the stage mount path free from cross-window
  // transport initialization on packaged Electron `file://` startup.
  void speechRuntimeStore.registerHost(speechPipeline).catch((error) => {
    console.warn('[Stage] Failed to register speech runtime host.', error)
  })
  console.info('[stage-startup-trace][stage] onMounted-exit')
})

onBeforeMount(() => {
  console.info('[stage-startup-trace][stage] onBeforeMount')
})

function canvasElement() {
  if (stageModelRenderer.value === 'live2d')
    return live2dSceneRef.value?.canvasElement()

  else if (stageModelRenderer.value === 'vrm')
    return vrmViewerRef.value?.canvasElement()
}

function parseStagePositionX(offset: number | string | undefined) {
  if (typeof offset === 'number')
    return offset

  if (typeof offset === 'string') {
    const parsed = Number.parseFloat(offset)
    if (Number.isFinite(parsed))
      return parsed
  }

  return 0
}

const stageCharacterFrame = computed(() => desktopInteractions.characterFrame.value)
const effectiveStageCharacterHovered = computed(() => {
  if (!hoverCapable.value)
    return false

  return props.characterHoveredOverride ?? stageCharacterHovered.value
})

function setStageCharacterHovered(hovered: boolean) {
  if (!hoverCapable.value) {
    stageCharacterHovered.value = false
    return
  }

  stageCharacterHovered.value = hovered
}

function handleDialoguePanelHoverChange(hovered: boolean) {
  dialoguePanelHovered.value = hovered
}

function handleDialoguePanelFocusChange(focused: boolean) {
  dialoguePanelFocused.value = focused
}

const proactiveFeedbackClock = useNow({ interval: 1_000 })
const dismissedProactiveFeedbackTurnIds = ref<string[]>([])

const dialoguePlacement = computed(() => {
  if (stageCharacterFrame.value && stageBounds.value.width > 0)
    return resolveStageBubblePlacement(stageCharacterFrame.value, stageBounds.value.width)

  return resolveStageBubblePlacement(parseStagePositionX(props.xOffset))
})
const streamingBubbleText = computed(() => resolveStageBubbleText(streamingMessage.value))
const recentAssistantBubbleMessage = computed(() => {
  return [...messages.value]
    .reverse()
    .find(message => message.role === 'assistant' && !!resolveStageBubbleText(message))
})
const proactiveFeedbackTarget = computed(() => resolveStageProactiveFeedbackTarget(
  recentAssistantBubbleMessage.value,
  { now: proactiveFeedbackClock.value.getTime() },
))
const visibleProactiveFeedbackTarget = computed(() => {
  const target = proactiveFeedbackTarget.value
  if (!target)
    return null
  if (dismissedProactiveFeedbackTurnIds.value.includes(target.turnId))
    return null
  if (!hasAlicizationBridge())
    return null
  if (typeof getAlicizationBridge().reportProactiveFeedback !== 'function')
    return null
  return target
})
const proactiveFeedbackActions = computed(() => {
  if (!visibleProactiveFeedbackTarget.value)
    return null
  return {
    dismissLabel: t('stage.dialogue.proactive-dismiss'),
    positiveLabel: t('stage.dialogue.proactive-positive'),
  }
})
const settledBubbleText = computed(() => resolveStageBubbleText(recentAssistantBubbleMessage.value))
const bubbleLoading = computed(() => sending.value && !streamingBubbleText.value)
const bubbleStreaming = computed(() => sending.value && !!streamingBubbleText.value)
const bubbleText = computed(() => {
  if (bubbleLoading.value)
    return ''

  return streamingBubbleText.value || settledBubbleText.value
})
const dialogueHasVisibleContent = computed(() => {
  return props.quickReplyEnabled || bubbleLoading.value || bubbleStreaming.value || !!bubbleText.value
})
const usesHoverTriggeredDialogue = computed(() => hoverCapable.value && stageModelRenderer.value === 'live2d')
const dialogueHoverVisibility = useStageDialogueHoverVisibility({
  enabled: usesHoverTriggeredDialogue,
  characterHovered: effectiveStageCharacterHovered,
  dialogueHovered: dialoguePanelHovered,
  dialogueFocused: dialoguePanelFocused,
  dialogueInteracting: dialoguePanelInteractionActive,
  loading: bubbleLoading,
  streaming: bubbleStreaming,
})
const showDialogueOverlay = computed(() => {
  if (!dialogueHasVisibleContent.value)
    return false

  if (!usesHoverTriggeredDialogue.value)
    return props.quickReplyEnabled || bubbleLoading.value || !!bubbleText.value

  return bubbleLoading.value
    || bubbleStreaming.value
    || dialogueHoverVisibility.visible.value
})
const shouldRenderDialogueOverlay = computed(() => {
  // NOTICE: Keep the first stage commit free from dialogue-panel layout/composer work.
  // The desktop shell depends on the visual stage reaching mounted state before
  // overlay chrome is introduced, otherwise packaged mac builds can miss the
  // initial mount deadline and fall into recovery.
  return componentState.value === 'mounted' && showDialogueOverlay.value
})

async function handleProactiveFeedback(kind: 'dismiss' | 'positive') {
  const target = visibleProactiveFeedbackTarget.value
  if (!target)
    return

  dismissedProactiveFeedbackTurnIds.value = [...dismissedProactiveFeedbackTurnIds.value, target.turnId]
  try {
    await getAlicizationBridge().reportProactiveFeedback?.({
      turnId: target.turnId,
      feedback: kind,
    })
  }
  catch (error) {
    console.warn('[stage-ui] failed to report proactive feedback:', error)
  }
}

function dialogueOverlayElement() {
  return dialoguePanelRef.value?.panelRootElement()
}

function readRenderTargetRegionAtClientPoint(clientX: number, clientY: number, radius: number) {
  if (stageModelRenderer.value !== 'vrm')
    return null

  return vrmViewerRef.value?.readRenderTargetRegionAtClientPoint?.(clientX, clientY, radius) ?? null
}

function hitTestClientPoint(clientX: number, clientY: number) {
  if (stageModelRenderer.value === 'vrm')
    return vrmViewerRef.value?.hitTestClientPoint?.(clientX, clientY) ?? false

  if (stageModelRenderer.value === 'live2d')
    return live2dSceneRef.value?.hitTestClientPoint?.(clientX, clientY) ?? false

  return false
}

onUnmounted(() => {
  clearRuntimeSegmentMotionFollowThroughTimer()
  embodimentRuntime.dispose()
  captionPoster.close()
  presentPoster.close()
  void speechRuntimeStore.dispose().catch((error) => {
    console.warn('[Stage] Failed to dispose speech runtime.', error)
  })
  chatHookCleanups.forEach(dispose => dispose?.())
  viewUpdateCleanups.forEach(dispose => dispose?.())
})

defineExpose({
  canvasElement,
  dialogueOverlayElement,
  hitTestClientPoint,
  readRenderTargetRegionAtClientPoint,
  embodimentDiagnostics,
})
</script>

<template>
  <div
    ref="stageRootRef"
    relative h-full w-full
    @pointerdown="desktopInteractions.handlePointerDown"
    @wheel="desktopInteractions.handleWheel"
  >
    <div h-full w-full>
      <Live2DScene
        v-if="stageModelRenderer === 'live2d' && showStage"
        ref="live2dSceneRef"
        v-model:state="componentState"
        min-w="50% <lg:full" min-h="100 sm:100"
        h-full w-full flex-1
        :action-bindings="currentLive2DActionCapabilities"
        :model-src="stageModelSelectedUrl"
        :model-id="stageModelSelected"
        :focus-at="live2dFocusAt"
        :presence-posture="presencePosture"
        :speech-render-state="speechRenderState"
        :idle-motion-preference="live2dIdleMotionPreference"
        :paused="paused"
        :performance-state="performanceState"
        :x-offset="xOffset"
        :y-offset="yOffset"
        :scale="scale"
        :disable-focus-at="live2dDisableFocus"
        :theme-colors-hue="themeColorsHue"
        :theme-colors-hue-dynamic="themeColorsHueDynamic"
        :live2d-idle-animation-enabled="live2dIdleAnimationEnabled"
        :live2d-auto-blink-enabled="live2dAutoBlinkEnabled"
        :live2d-force-auto-blink-enabled="live2dForceAutoBlinkEnabled"
        :live2d-shadow-enabled="live2dShadowEnabled"
        :live2d-max-fps="live2dMaxFps"
        @character-hover-change="setStageCharacterHovered"
      />
      <ThreeScene
        v-if="stageModelRenderer === 'vrm' && showStage"
        ref="vrmViewerRef"
        v-model:state="componentState"
        min-w="50% <lg:full" min-h="100 sm:100" h-full w-full flex-1
        :base-expression-overrides="currentVrmBaseExpressionOverrides"
        :custom-expression-bindings="currentVrmManifestCustomExpressionBindings"
        :action-bindings="currentVrmActionBindings"
        :model-src="stageModelSelectedUrl"
        :model-id="stageModelSelected"
        :idle-animation="animations.idleLoop.toString()"
        :paused="paused"
        :show-axes="stageViewControlsEnabled"
        :external-look-at-screen-point="vrmLookAtScreenPoint"
        :presence-posture="presencePosture"
        :performance-state="performanceState"
        :speech-render-state="speechRenderState"
        :idle-action-preference="vrmIdleActionPreference"
        @custom-expressions-resolved="syncVrmCustomExpressionScan"
        @runtime-capabilities-resolved="syncVrmRuntimeCapabilities"
        @error="console.error"
      />
    </div>
    <StageEmbodimentDiagnosticsOverlay
      v-if="showEmbodimentDiagnostics"
      :diagnostics="embodimentDiagnostics"
    />
    <div
      v-if="shouldRenderDialogueOverlay"
      class="stage-dialogue-layer"
    >
      <StageDialoguePanel
        ref="dialoguePanelRef"
        :character-frame="stageCharacterFrame"
        :loading="bubbleLoading"
        :streaming="bubbleStreaming"
        :text="bubbleText"
        :placement="dialoguePlacement"
        :quick-reply-enabled="props.quickReplyEnabled"
        :proactive-feedback-actions="proactiveFeedbackActions"
        :visible="shouldRenderDialogueOverlay"
        @hover-change="handleDialoguePanelHoverChange"
        @focus-change="handleDialoguePanelFocusChange"
        @interaction-change="dialoguePanelInteractionActive = $event"
        @proactive-feedback="handleProactiveFeedback"
      />
    </div>
  </div>
</template>

<style scoped>
.stage-dialogue-layer {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}
</style>
