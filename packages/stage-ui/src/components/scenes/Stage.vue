<script setup lang="ts">
import type {
  Live2DRuntimeCapabilitySnapshot,
} from '@proj-alicization/stage-ui-live2d'
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
import { resolveStageEmbodimentMetaAuthority, shouldDeferLive2DEmotionMotionOverride } from './runtime'
import {
  attachEmbodimentScriptToSpeechMetadata,
  attachFallbackDialogueMetadataToSpeechMetadata,
  attachPreDialogueSendIdentityToSpeechMetadata,
  createStageChatIntentBridge,
} from './stage-chat-intent-bridge'
import {
  gateStageExecutionDiagnostics,
  gateStageRuntimeCapabilities,
} from './stage-execution-diagnostics-gate'
import { resolveLive2DManifestActionCapabilities } from './stage-live2d-performance-manifest'
import { resolveStagePresencePulsePerformance } from './stage-presence-pulse-performance'
import {
  resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState,
  resolveResidentVrmPreferredExpressionAliasesFromRuntimeState,
} from './stage-resident-expression-aliases'
import {
  applyRuntimeEmbodimentActiveCueState,
  applyRuntimeEmbodimentEnvelopeCueState,
  clearRuntimeSegmentEmbodimentCueState,
  createEmptyStageRuntimeEmbodimentCueState,
  resolveActiveCueWatchKey,
  resolveLive2DSegmentMotionCueSelection,
  resolvePreferredExpressionAliasesFromRuntimeState,
  resolvePreferredMotionAliasesFromRuntimeState,
} from './stage-runtime-embodiment-cues'
import {
  resolveVrmManifestActionCapabilities,
  resolveVrmManifestBaseEmotions,
  resolveVrmManifestFacialCapabilities,
} from './stage-vrm-performance-manifest'
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
const stageEmbodimentDebugStorageKey = 'devtools/embodiment-debug'

function isStageEmbodimentDebugEnabled() {
  if (props.debugEmbodiment)
    return true

  try {
    return globalThis.localStorage?.getItem(stageEmbodimentDebugStorageKey) === 'true'
  }
  catch {
    return false
  }
}

function logStageStartupTrace(message: string, payload?: Record<string, unknown>) {
  if (!isStageEmbodimentDebugEnabled())
    return

  console.info('[stage-startup-trace][stage]', {
    message,
    ...payload,
  })
}

function logStageStartupError(message: string, payload?: Record<string, unknown>) {
  if (!isStageEmbodimentDebugEnabled())
    return

  console.error('[stage-startup-trace][stage]', {
    message,
    ...payload,
  })
}

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })
// const transformersProvider = createTransformers({ embedWorkerURL })

const stageRootRef = ref<HTMLDivElement | null>(null)
const vrmViewerRef = ref<InstanceType<typeof ThreeScene>>()
const live2dSceneRef = ref<InstanceType<typeof Live2DScene>>()

logStageStartupTrace('setup-start')
queueMicrotask(() => {
  logStageStartupTrace('setup-microtask')
})
setTimeout(() => {
  logStageStartupTrace('setup-timeout-1000ms')
}, 1_000)

onErrorCaptured((error, instance, info) => {
  logStageStartupError('captured-error', {
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
logStageStartupTrace('before-audio-context')
const { audioContext } = useAudioContext()
logStageStartupTrace('after-audio-context')

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
const currentLive2DRuntimeCapabilities = ref<Live2DRuntimeCapabilitySnapshot | null>(null)
const currentVrmRuntimeCapabilities = ref<VrmRuntimeCapabilitySnapshot | null>(null)
const showStage = ref(true)
const viewUpdateCleanups: Array<() => void> = []
const stageBounds = ref({ width: 0, height: 0 })
const directDesktopInteractionActive = ref(false)
const dialoguePanelInteractionActive = ref(false)
const live2dExecutionDiagnostics = computed(() => {
  return gateStageExecutionDiagnostics({
    componentState: componentState.value,
    currentRenderer: stageModelRenderer.value,
    diagnostics: live2dSceneRef.value?.executionDiagnostics?.() ?? null,
    renderer: 'live2d',
    showStage: showStage.value,
  })
})
const vrmExecutionDiagnostics = computed(() => {
  return gateStageExecutionDiagnostics({
    componentState: componentState.value,
    currentRenderer: stageModelRenderer.value,
    diagnostics: vrmViewerRef.value?.executionDiagnostics?.() ?? null,
    renderer: 'vrm',
    showStage: showStage.value,
  })
})
const live2dDiagnosticsRuntimeCapabilities = computed(() => {
  return gateStageRuntimeCapabilities({
    componentState: componentState.value,
    currentRenderer: stageModelRenderer.value,
    renderer: 'live2d',
    runtimeCapabilities: currentLive2DRuntimeCapabilities.value,
    showStage: showStage.value,
  })
})
const vrmDiagnosticsRuntimeCapabilities = computed(() => {
  return gateStageRuntimeCapabilities({
    componentState: componentState.value,
    currentRenderer: stageModelRenderer.value,
    renderer: 'vrm',
    runtimeCapabilities: currentVrmRuntimeCapabilities.value,
    showStage: showStage.value,
  })
})

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
logStageStartupTrace('after-desktop-interactions')

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
const chatIntentBridge = createStageChatIntentBridge({
  openIntent: options => speechRuntimeStore.openIntent(options),
})
const currentChatIntent = ref<ReturnType<typeof speechRuntimeStore.openIntent> | null>(null)
const debugEmbodimentStorage = useLocalStorage(stageEmbodimentDebugStorageKey, false)
const showEmbodimentDiagnostics = computed(() => {
  return Boolean(props.debugEmbodiment || debugEmbodimentStorage.value)
})
let embodimentRuntime: ReturnType<typeof useStageEmbodimentRuntime> | null = null

function logStageEmbodimentDebug(event: string, payload?: Record<string, unknown>) {
  if (!showEmbodimentDiagnostics.value)
    return

  console.info('[stage-embodiment][stage]', {
    event,
    ...payload,
  })
}

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
const runtimeEmbodimentCueState = createEmptyStageRuntimeEmbodimentCueState()

function clearRuntimeSegmentEmbodimentCue() {
  clearRuntimeSegmentEmbodimentCueState(runtimeEmbodimentCueState)
  runtimeSegmentExpressionAliasesByEmotion.value = runtimeEmbodimentCueState.segmentExpressionAliasesByEmotion
  runtimeSegmentMotionAliasesByEmotion.value = runtimeEmbodimentCueState.segmentMotionAliasesByEmotion
}

function clearRuntimeSegmentMotionFollowThroughTimer() {
  if (!runtimeSegmentMotionFollowThroughTimer)
    return

  clearTimeout(runtimeSegmentMotionFollowThroughTimer)
  runtimeSegmentMotionFollowThroughTimer = undefined
}

function clearRuntimeEmbodimentEnvelope(options?: { preserveTurnEnvelope?: boolean }) {
  if (!options?.preserveTurnEnvelope) {
    runtimeTurnExpressionAliasesByEmotion.value = {}
    runtimeTurnMotionAliasesByEmotion.value = {}
  }
  runtimeDigest.value = null
  clearRuntimeSegmentEmbodimentCue()
  runtimeSegmentMotionActive.value = false
  runtimeSegmentMotionFollowThroughMs = 0
  clearRuntimeSegmentMotionFollowThroughTimer()
}

function resolveSpeechAudioDurationMs(audio: BrowserSpeechAudioSource | null | undefined) {
  if (!audio)
    return null

  if (audio.kind === 'buffer')
    return Math.round(audio.audio.duration * 1000)

  return null
}

function resolveSpeechSynthesisMetadata() {
  const provider = activeSpeechProvider.value?.trim() || null
  if (!provider || provider === 'speech-noop')
    return null

  const providerConfig = providersStore.getProviderConfig(provider)
  let model = activeSpeechModel.value?.trim() || null
  let voice = activeSpeechVoice.value

  if (provider === 'openai-compatible-audio-speech') {
    model = typeof providerConfig?.model === 'string' && providerConfig.model.trim()
      ? providerConfig.model.trim()
      : model || 'tts-1'

    const configuredVoiceId = typeof providerConfig?.voice === 'string' && providerConfig.voice.trim()
      ? providerConfig.voice.trim()
      : voice?.id?.trim() || 'alloy'
    voice = {
      id: configuredVoiceId,
      name: configuredVoiceId,
      description: configuredVoiceId,
      previewURL: '',
      languages: [{ code: 'en', title: 'English' }],
      provider,
      gender: 'neutral',
    }
  }

  return {
    provider,
    model,
    pitchDelta: embodimentRuntime?.styledPitch.value ?? pitch.value,
    rateMultiplier: embodimentRuntime?.styledRate.value ?? rate.value,
    ssmlEnabled: ssmlEnabled.value,
    voice: voice
      ? {
          id: voice.id,
          name: voice.name,
          gender: voice.gender ?? null,
          provider: voice.provider,
          languages: voice.languages.map(language => ({
            code: language.code,
            title: language.title,
          })),
        }
      : null,
  }
}

function resolveRuntimeSpeechSynthesisMetadata(input: {
  speechStyle: { pitchDelta: number, rateMultiplier: number } | null | undefined
  voice: { pitchDelta: number, rateMultiplier: number } | null | undefined
}) {
  const pitchDelta = Number.isFinite(input.voice?.pitchDelta)
    ? Number(input.voice?.pitchDelta)
    : Number.isFinite(input.speechStyle?.pitchDelta)
      ? Number(input.speechStyle?.pitchDelta)
      : null
  const rateMultiplier = Number.isFinite(input.voice?.rateMultiplier)
    ? Number(input.voice?.rateMultiplier)
    : Number.isFinite(input.speechStyle?.rateMultiplier)
      ? Number(input.speechStyle?.rateMultiplier)
      : null

  if (pitchDelta == null && rateMultiplier == null)
    return null

  return {
    ...(pitchDelta != null ? { pitchDelta } : {}),
    ...(rateMultiplier != null ? { rateMultiplier } : {}),
  }
}

function createSpeechIntentMetadata(
  intentSource: 'chat' | 'fallback',
  preDialogueSendIdentity?: Parameters<typeof attachPreDialogueSendIdentityToSpeechMetadata>[1],
): Record<string, unknown> {
  const digest = embodimentRuntime?.digitalLifeSpineDigest.value ?? null
  if (!digest) {
    return attachPreDialogueSendIdentityToSpeechMetadata({
      source: 'stage',
      intentSource,
      speechSynthesis: resolveSpeechSynthesisMetadata(),
      runtimeDigest: runtimeDigest.value,
    }, preDialogueSendIdentity) ?? {
      source: 'stage',
      intentSource,
      speechSynthesis: resolveSpeechSynthesisMetadata(),
      runtimeDigest: runtimeDigest.value,
    }
  }

  const runtime = digest.runtime
  const proactive = digest.proactive
  const architecture = digest.architecture

  return attachPreDialogueSendIdentityToSpeechMetadata({
    source: 'stage',
    intentSource,
    generatedAt: Date.now(),
    speechSynthesis: resolveSpeechSynthesisMetadata(),
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
    runtimeDigest: runtimeDigest.value,
  }, preDialogueSendIdentity) ?? {
    source: 'stage',
    intentSource,
    generatedAt: Date.now(),
    speechSynthesis: resolveSpeechSynthesisMetadata(),
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
    runtimeDigest: runtimeDigest.value,
  }
}

function applyRuntimeEmbodimentEnvelope(embodiment: AlicizationDialogueEmbodimentEnvelope | null | undefined) {
  applyRuntimeEmbodimentEnvelopeCueState(runtimeEmbodimentCueState, embodiment)
  runtimeTurnExpressionAliasesByEmotion.value = runtimeEmbodimentCueState.turnExpressionAliasesByEmotion
  runtimeTurnMotionAliasesByEmotion.value = runtimeEmbodimentCueState.turnMotionAliasesByEmotion
}

function applyRuntimeEmbodimentCue(cue: {
  emotion?: string | null
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints']
} | null | undefined) {
  const result = applyRuntimeEmbodimentActiveCueState(runtimeEmbodimentCueState, cue)
  runtimeSegmentExpressionAliasesByEmotion.value = runtimeEmbodimentCueState.segmentExpressionAliasesByEmotion
  runtimeSegmentMotionAliasesByEmotion.value = runtimeEmbodimentCueState.segmentMotionAliasesByEmotion
  if (!cue?.emotion && !runtimeSegmentMotionActive.value)
    runtimeSegmentMotionFollowThroughMs = 0
  if (cue?.emotion)
    runtimeSegmentMotionFollowThroughMs = result.followThroughMs
}

function resolvePreferredVrmExpressionAliases(emotion: string) {
  return resolvePreferredExpressionAliasesFromRuntimeState(
    runtimeEmbodimentCueState,
    emotion,
    stagePerformanceStore.resolveVrmEmotionExpressionAliases(stageModelSelected.value, emotion),
  )
}

function resolvePreferredLive2DMotionAliases(emotion: string) {
  return resolvePreferredMotionAliasesFromRuntimeState(
    runtimeEmbodimentCueState,
    emotion,
    stagePerformanceStore.resolveLive2DEmotionMotionAliases(stageModelSelected.value, emotion),
  )
}

function setCurrentMotionIfChanged(nextMotion: { group: string, index?: number }) {
  if (currentMotion.value.group === nextMotion.group && currentMotion.value.index === nextMotion.index)
    return

  currentMotion.value = nextMotion
}

function shouldHoldRuntimeSegmentMotionAuthority() {
  return shouldDeferLive2DEmotionMotionOverride({
    stageModelRenderer: stageModelRenderer.value,
    runtimeSegmentMotionActive: runtimeSegmentMotionActive.value,
    runtimeSegmentMotionFollowThroughMs,
  })
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

  const selection = resolveLive2DSegmentMotionCueSelection({
    state: runtimeEmbodimentCueState,
    cue,
    configuredAliases: stagePerformanceStore.resolveLive2DEmotionMotionAliases(stageModelSelected.value, emotion),
  })
  runtimeSegmentMotionFollowThroughMs = Math.max(
    runtimeSegmentMotionFollowThroughMs,
    selection.followThroughMs,
  )
  const preferredMotionAliases = selection.preferredMotionAliases
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
      if (hasAlicizationBridge()) {
        logStageEmbodimentDebug('legacy-emotion-token-suppressed', {
          emotion: ctx.data.name,
          intensity: ctx.data.intensity,
          renderer: stageModelRenderer.value,
        })
        return
      }

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

        if (shouldHoldRuntimeSegmentMotionAuthority()) {
          logStageEmbodimentDebug('deferred-emotion-motion-override-during-follow-through', {
            emotion: ctx.data.name,
            followThroughMs: runtimeSegmentMotionFollowThroughMs,
            currentMotionGroup: currentMotion.value.group,
          })
          return
        }

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
  if (hasAlicizationBridge())
    return

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
logStageStartupTrace('after-speech-pipeline')

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

function syncLive2DRuntimeCapabilities(snapshot?: Live2DRuntimeCapabilitySnapshot | null) {
  if (stageModelRenderer.value !== 'live2d') {
    currentLive2DRuntimeCapabilities.value = null
    return
  }

  if (!snapshot) {
    currentLive2DRuntimeCapabilities.value = null
    return
  }

  currentLive2DRuntimeCapabilities.value = {
    supportedExpressionNames: [...new Set(snapshot.supportedExpressionNames
      .map(name => name.trim())
      .filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    supportedBaseEmotions: [...new Set(snapshot.supportedBaseEmotions)],
    supportedFacialCues: dedupeCapabilityItemsByKey(snapshot.supportedFacialCues),
    supportedActions: dedupeCapabilityItemsByKey(snapshot.supportedActions),
  }
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
    supportedBaseEmotions: [...new Set(snapshot.supportedBaseEmotions)],
    supportedFacialCues: dedupeCapabilityItemsByKey(snapshot.supportedFacialCues),
    supportedActions: dedupeCapabilityItemsByKey(snapshot.supportedActions),
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

const currentLive2DManifestActionCapabilities = computed(() => {
  return resolveLive2DManifestActionCapabilities({
    motionCapabilities: currentLive2DResolvedActionCapabilities.value,
    runtimeSupportedActions: currentLive2DRuntimeCapabilities.value?.supportedActions ?? [],
  })
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
      resolveResidentVrmPreferredExpressionAliasesFromRuntimeState({
        emotion,
        configuredAliases: stagePerformanceStore.resolveVrmEmotionExpressionAliases(stageModelSelected.value, emotion),
        runtimeSegmentExpressionAliasesByEmotion: runtimeSegmentExpressionAliasesByEmotion.value,
        runtimeTurnExpressionAliasesByEmotion: runtimeTurnExpressionAliasesByEmotion.value,
        presencePosture: embodimentRuntime?.presencePosture.value,
        visualPresenceState: embodimentRuntime?.visualPresenceState.value,
      }),
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
  return resolveVrmManifestFacialCapabilities({
    runtimeSupportedFacialCues: currentVrmRuntimeCapabilities.value?.supportedFacialCues ?? [],
    customExpressionBindings: currentVrmManifestCustomExpressionBindings.value,
    fallbackFacialCues: currentVrmPresetFacialCapabilities.value,
  })
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
    const explicitExpressionAliases = stagePerformanceStore.listLive2DEmotionExpressionAliases(stageModelSelected.value)
    const explicitMotionAliases = stagePerformanceStore.listLive2DEmotionMotionAliases(stageModelSelected.value)
    const embodimentHintsByEmotion = new Map<string, Record<string, string[]>>()

    Object.entries(explicitExpressionAliases)
      .filter(([, aliases]) => Array.isArray(aliases) && aliases.length > 0)
      .forEach(([emotion, aliases]) => {
        const current = embodimentHintsByEmotion.get(emotion) ?? {}
        current.preferredExpressionAliases = aliases
        embodimentHintsByEmotion.set(emotion, current)
      })
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
    const runtimeSupportedBaseEmotions = currentLive2DRuntimeCapabilities.value?.supportedBaseEmotions ?? []
    const runtimeSupportedFacialCues = currentLive2DRuntimeCapabilities.value?.supportedFacialCues ?? []

    return {
      renderer: 'live2d' as const,
      supportedBaseEmotions: runtimeSupportedBaseEmotions.length > 0
        ? runtimeSupportedBaseEmotions
        : [...alicizationEmotionWhitelist],
      supportedFacialCues: runtimeSupportedFacialCues.length > 0
        ? runtimeSupportedFacialCues
        : listStageEmbodimentLive2DFacialCapabilities(),
      supportedActions: currentLive2DManifestActionCapabilities.value,
      supportsLookAt: !live2dDisableFocus.value,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
      embodimentHints: currentPerformanceEmbodimentHints.value,
    }
  }

  if (stageModelRenderer.value === 'vrm') {
    const runtimeSupportedBaseEmotions = currentVrmRuntimeCapabilities.value?.supportedBaseEmotions ?? []

    return {
      renderer: 'vrm' as const,
      supportedBaseEmotions: resolveVrmManifestBaseEmotions({
        runtimeSupportedBaseEmotions,
        fallbackBaseEmotions: currentVrmSupportedBaseEmotions.value,
      }),
      supportedFacialCues: currentVrmFacialCapabilities.value,
      supportedActions: resolveVrmManifestActionCapabilities({
        runtimeSupportedActions: currentVrmRuntimeCapabilities.value?.supportedActions ?? [],
        actionBindings: currentVrmActionBindings.value,
      }),
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
  return clampPresencePerformanceToManifest(resolveStagePresencePulsePerformance(payload))
}

watch([stageModelRenderer, stageModelSelected, currentStoredVrmExternalAnimations], async () => {
  await refreshResolvedVrmExternalAnimations()
}, { immediate: true, deep: true })

watch([stageModelRenderer, stageModelSelected], ([renderer]) => {
  currentLive2DRuntimeCapabilities.value = null

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
  live2dExecutionDiagnostics,
  live2dRuntimeCapabilities: live2dDiagnosticsRuntimeCapabilities,
  mouthOpenSize,
  paused: computed(() => Boolean(props.paused)),
  performanceManifest: currentPerformanceManifest,
  pitch,
  rate,
  runtimeDigest,
  resolveClampedPresencePulsePerformance,
  resolvePresenceIntensity,
  speakFallback: async (reply, _performance, metadata) => {
    const normalizedReply = reply.trim()
    if (!normalizedReply)
      return

    if (currentChatIntent.value || embodimentRuntime?.nowSpeaking.value)
      return

    const fallbackIntent = speechRuntimeStore.openIntent({
      ownerId: activeCardId.value,
      priority: 'normal',
      behavior: 'queue',
      metadata: attachFallbackDialogueMetadataToSpeechMetadata(
        createSpeechIntentMetadata('fallback'),
        metadata as Record<string, unknown> | null | undefined,
      ),
    })
    fallbackIntent.writeLiteral(normalizedReply)
    fallbackIntent.writeFlush()
    fallbackIntent.end()
  },
  stageBounds,
  stageModelRenderer,
  vrmActionBindings: currentVrmActionBindings,
  vrmExecutionDiagnostics,
  vrmRuntimeCapabilities: vrmDiagnosticsRuntimeCapabilities,
})
logStageStartupTrace('after-embodiment-runtime')
const {
  armDialoguePerformance,
  bindPlaybackManager,
  diagnostics: embodimentDiagnostics,
  live2dFocusAt,
  live2dIdleMotionPreference,
  onPlaybackEvent,
  performanceState,
  prepareForNextMessage,
  presencePosture,
  speechRenderState,
  visualPresenceState,
  vrmIdleActionPreference,
  vrmLookAtScreenPoint,
} = embodimentRuntime
logStageStartupTrace('after-embodiment-destructure')

const currentLive2DPreferredExpressionAliases = computed(() => {
  if (stageModelRenderer.value !== 'live2d')
    return []

  const emotion = performanceState.value?.activeCue?.emotion
    ?? performanceState.value?.performance.baseEmotion
    ?? runtimeResidentEmotion.value
  return emotion
    ? resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState({
        emotion,
        configuredAliases: stagePerformanceStore.resolveLive2DEmotionExpressionAliases(stageModelSelected.value, emotion),
        runtimeSegmentExpressionAliasesByEmotion: runtimeSegmentExpressionAliasesByEmotion.value,
        runtimeTurnExpressionAliasesByEmotion: runtimeTurnExpressionAliasesByEmotion.value,
        presencePosture: presencePosture.value,
        visualPresenceState: visualPresenceState.value,
      })
    : []
})

logStageStartupTrace('before-watch-component-state')
watch(componentState, (state) => {
  logStageStartupTrace('component-state', {
    state,
    renderer: stageModelRenderer.value || '<empty>',
    modelId: stageModelSelected.value || '<empty>',
    modelUrl: stageModelSelectedUrl.value ? 'available' : 'missing',
  })
}, { immediate: true })
logStageStartupTrace('after-watch-component-state')

logStageStartupTrace('before-watch-resident-emotion')
watch(
  () => performanceState.value?.residentPerformance.baseEmotion
    ?? performanceState.value?.performance.baseEmotion
    ?? '',
  (emotion) => {
    runtimeResidentEmotion.value = typeof emotion === 'string' ? emotion.trim() : ''
  },
  { immediate: true },
)
logStageStartupTrace('after-watch-resident-emotion')

watch(
  [
    () => stageModelRenderer.value,
    () => stageModelSelected.value,
    () => runtimeResidentEmotion.value,
    () => runtimeSegmentMotionActive.value,
    () => runtimeTurnMotionAliasesByEmotion.value[runtimeResidentEmotion.value]?.join('|') ?? '',
  ],
  () => {
    if (stageModelRenderer.value !== 'live2d' || runtimeSegmentMotionActive.value)
      return

    const residentEmotion = runtimeResidentEmotion.value
    if (!residentEmotion)
      return

    const resolvedResidentMotion = live2dStore.resolveEmotionMotionSelection(stageModelSelected.value, residentEmotion, {
      preferredMotionAliases: resolvePreferredLive2DMotionAliases(residentEmotion),
    })
    if (!resolvedResidentMotion)
      return

    setCurrentMotionIfChanged(resolvedResidentMotion)
    logStageEmbodimentDebug('resident-motion-sync', {
      emotion: residentEmotion,
      group: resolvedResidentMotion.group,
      index: resolvedResidentMotion.index ?? null,
    })
  },
  { immediate: true },
)

logStageStartupTrace('before-watch-active-cue')
watch(
  [
    () => resolveActiveCueWatchKey(performanceState.value?.activeCue),
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
logStageStartupTrace('after-watch-active-cue')

logStageStartupTrace('before-speech-pipeline-hooks')
speechPipeline.on('onSpecial', (segment) => {
  if (segment.special)
    playSpecialToken(segment.special)
})

speechPipeline.on('onTtsRequest', (request) => {
  if (!embodimentRuntime || activeSpeechProvider.value === 'speech-noop')
    return

  if (!request.text.trim())
    return

  logStageEmbodimentDebug('tts-request-preview', {
    intentId: request.intentId,
    streamId: request.streamId,
    segmentId: request.segmentId,
    text: request.text.slice(0, 96),
  })

  embodimentRuntime.previewSpeechSegment({
    intentId: request.intentId,
    streamId: request.streamId,
    segmentId: request.segmentId,
    text: request.text,
    special: request.special,
    continuityHoldMs: request.continuityHoldMs,
    metadata: attachEmbodimentScriptToSpeechMetadata(request.metadata ?? null, (request.metadata as any)?.embodimentScript),
  })
})

speechPipeline.on('onTtsResult', (result) => {
  if (!embodimentRuntime)
    return

  if (!result.text.trim())
    return

  logStageEmbodimentDebug('tts-result-preview', {
    intentId: result.intentId,
    streamId: result.streamId,
    segmentId: result.segmentId,
    playbackDurationMs: resolveSpeechAudioDurationMs(result.audio),
    text: result.text.slice(0, 96),
  })

  embodimentRuntime.previewSpeechSegment({
    intentId: result.intentId,
    streamId: result.streamId,
    segmentId: result.segmentId,
    text: result.text,
    special: result.special,
    continuityHoldMs: result.continuityHoldMs,
    metadata: attachEmbodimentScriptToSpeechMetadata(result.metadata ?? null, (result.metadata as any)?.embodimentScript),
    playbackDurationMs: resolveSpeechAudioDurationMs(result.audio),
  })
})

speechPipeline.on('onTtsSkipped', (event) => {
  logStageEmbodimentDebug('tts-skipped', {
    segmentId: event.request.segmentId,
    intentId: event.request.intentId,
    streamId: event.request.streamId,
  })
  embodimentRuntime?.discardPreviewSpeechSegment(event.request.segmentId)
})

speechPipeline.on('onSegment', (segment) => {
  if (activeSpeechProvider.value !== 'speech-noop')
    return
  if (!segment.text.trim())
    return
  logStageEmbodimentDebug('synthetic-segment', {
    intentId: segment.intentId,
    streamId: segment.streamId,
    segmentId: segment.segmentId,
    text: segment.text.slice(0, 96),
  })
  embodimentRuntime?.previewSpeechSegment({
    intentId: segment.intentId,
    streamId: segment.streamId,
    segmentId: segment.segmentId,
    text: segment.text,
    special: segment.special,
    continuityHoldMs: segment.continuityHoldMs,
    metadata: attachEmbodimentScriptToSpeechMetadata(segment.metadata ?? null, (segment.metadata as any)?.embodimentScript),
  })
  embodimentRuntime?.applySyntheticSpeechSegment(segment)
})
logStageStartupTrace('after-speech-pipeline-hooks')

logStageStartupTrace('before-bind-playback-manager')
bindPlaybackManager(playbackManager)
logStageStartupTrace('after-bind-playback-manager')

logStageStartupTrace('before-chat-hook-register')

chatHookCleanups.push(onPlaybackEvent((event) => {
  if (event.type === 'playback-start') {
    const item = event.state.item
    if (!item)
      return

    logStageEmbodimentDebug('playback-start', {
      segmentId: item.segmentId,
      intentId: item.intentId,
      streamId: item.streamId,
      text: item.text.slice(0, 96),
    })

    // NOTICE: postCaption and postPresent may throw errors if the BroadcastChannel is closed
    // (e.g., when navigating away from the page). We wrap these in try-catch to prevent
    // breaking playback when the channel is unavailable.
    assistantCaption.value += ` ${item.text}`
    captionPoster.post({ type: 'caption-assistant', text: assistantCaption.value })
    presentPoster.post({ type: 'assistant-append', text: item.text })
    return
  }

  if (event.type === 'playback-stop') {
    logStageEmbodimentDebug('playback-stop', {
      segmentId: event.state.item?.segmentId ?? null,
      stopReason: event.state.stopReason,
      special: event.state.item?.special ?? null,
    })
  }

  if (event.type === 'playback-stop' && event.state.stopReason === null && event.state.item?.special)
    playSpecialToken(event.state.item.special)
}))

chatHookCleanups.push(onBeforeMessageComposed(async (_message, context) => {
  const prepareStartedAt = performance.now()
  speechRuntimeStore.cancelOwner(activeCardId.value, 'new-message')
  clearRuntimeEmbodimentEnvelope({ preserveTurnEnvelope: true })
  logStageEmbodimentDebug('before-message-composed-start', {
    renderer: stageModelRenderer.value,
    previousEmotion: runtimeResidentEmotion.value || null,
    currentIntentId: currentChatIntent.value?.intentId ?? null,
  })

  await prepareForNextMessage()
  logStageEmbodimentDebug('before-message-composed-prepared', {
    renderer: stageModelRenderer.value,
    durationMs: Math.round(performance.now() - prepareStartedAt),
  })
  // Reset assistant caption for a new message
  assistantCaption.value = ''
  captionPoster.post({ type: 'caption-assistant', text: '' })
  presentPoster.post({ type: 'assistant-reset' })

  chatIntentBridge.cancel('prepare-next-message')
  currentChatIntent.value = null

  currentChatIntent.value = chatIntentBridge.prepare({
    ownerId: activeCardId.value,
    priority: 'normal',
    behavior: 'queue',
    metadata: createSpeechIntentMetadata('chat', context.preDialogueSendIdentity ?? null),
  })
}))

chatHookCleanups.push(onEmbodimentMeta(async (meta) => {
  runtimeDigest.value = meta.runtimeDigest ?? null

  const embodimentScript = meta.embodimentScript ?? null
  const authoritativeMeta = resolveStageEmbodimentMetaAuthority({
    embodiment: meta.embodiment,
    embodimentScript,
    digitalLife: meta.digitalLife ?? null,
    speechTimeline: meta.speechTimeline ?? null,
  })
  if (embodimentScript || meta.runtimeDigest || authoritativeMeta.voice || authoritativeMeta.speechStyle) {
    currentChatIntent.value = chatIntentBridge.attachRuntimeMetadata({
      embodimentScript,
      runtimeDigest: meta.runtimeDigest ?? null,
      speechSynthesis: resolveRuntimeSpeechSynthesisMetadata({
        speechStyle: authoritativeMeta.speechStyle,
        voice: authoritativeMeta.voice,
      }),
    })
  }

  if (meta.digitalLifeSpine)
    embodimentRuntime?.applyTransientDigitalLifeSpine(meta.digitalLifeSpine)

  if (authoritativeMeta.digitalLife)
    embodimentRuntime?.primeDigitalLifeEnvelope(authoritativeMeta.digitalLife)

  if (meta.speechTimeline)
    embodimentRuntime?.primeSpeechTimeline(meta.speechTimeline)

  if (!meta.embodiment || !embodimentRuntime)
    return
  const authoritativeEmbodiment = {
    ...meta.embodiment,
    rendererHints: authoritativeMeta.rendererHints ?? null,
  }
  armDialoguePerformance(meta.embodiment.performance, {
    variationToken: authoritativeMeta.variationToken,
  })
  applyRuntimeEmbodimentEnvelope(authoritativeEmbodiment)
  embodimentRuntime.applyEmotionSpeechStyle(
    embodimentRuntime.normalizePresenceEmotionName(meta.embodiment.emotion),
    authoritativeMeta.speechStyle,
  )
  logStageEmbodimentDebug('embodiment-meta', {
    emotion: meta.embodiment.emotion,
    delivery: meta.embodiment.performance.delivery,
    facialCue: meta.embodiment.performance.facialCue ?? null,
    actionCue: meta.embodiment.performance.actionCue ?? null,
    variationToken: authoritativeMeta.variationToken,
    hasEmbodimentScript: Boolean(embodimentScript),
    hasSpeechTimeline: Boolean(meta.speechTimeline?.segments.length),
    hasDigitalLife: Boolean(authoritativeMeta.digitalLife?.frames.length),
    speechTimelineSegments: meta.speechTimeline?.segments.length ?? 0,
    speechTimelineLastSegmentId: meta.speechTimeline?.segments.at(-1)?.id ?? null,
    digitalLifeFrames: authoritativeMeta.digitalLife?.frames.length ?? 0,
    digitalLifeLastFrameId: authoritativeMeta.digitalLife?.frames.at(-1)?.id ?? null,
  })
}))

chatHookCleanups.push(onTokenLiteral(async (literal) => {
  chatIntentBridge.writeLiteral(literal)
}))

chatHookCleanups.push(onTokenSpecial(async (special) => {
  // console.debug('Stage received special token:', special)
  chatIntentBridge.writeSpecial(special)
}))

chatHookCleanups.push(onStreamEnd(async () => {
  delaysQueue.enqueue(llmInferenceEndToken)
  chatIntentBridge.writeFlush()
}))

chatHookCleanups.push(onAssistantResponseEnd(async (_message) => {
  chatIntentBridge.end()
  currentChatIntent.value = null
  // const res = await embed({
  //   ...transformersProvider.embed('Xenova/nomic-embed-text-v1'),
  //   input: message,
  // })

  // await db.value?.execute(`INSERT INTO memory_test (vec) VALUES (${JSON.stringify(res.embedding)});`)
}))

logStageStartupTrace('after-chat-hook-register')

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
  logStageStartupTrace('onMounted-enter')
  // NOTICE: Speech runtime bus setup is non-critical for first paint.
  // Deferring host registration keeps the stage mount path free from cross-window
  // transport initialization on packaged Electron `file://` startup.
  void speechRuntimeStore.registerHost(speechPipeline).catch((error) => {
    console.warn('[Stage] Failed to register speech runtime host.', error)
  })
  logStageStartupTrace('onMounted-exit')
})

onBeforeMount(() => {
  logStageStartupTrace('onBeforeMount')
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
        :preferred-expression-aliases="currentLive2DPreferredExpressionAliases"
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
        @runtime-capabilities-resolved="syncLive2DRuntimeCapabilities"
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
