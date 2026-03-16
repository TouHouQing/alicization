<script setup lang="ts">
import type { DuckDBWasmDrizzleDatabase } from '@proj-airi/drizzle-duckdb-wasm'
import type { Live2DLipSync, Live2DLipSyncOptions } from '@proj-airi/model-driver-lipsync'
import type { Profile } from '@proj-airi/model-driver-lipsync/shared/wlipsync'
import type { SpeechProviderWithExtraOptions } from '@xsai-ext/providers/utils'
import type { UnElevenLabsOptions } from 'unspeech'

import type { EmotionPayload } from '../../constants/emotions'

import { drizzle } from '@proj-airi/drizzle-duckdb-wasm'
import { getImportUrlBundles } from '@proj-airi/drizzle-duckdb-wasm/bundles/import-url-browser'
import { createLive2DLipSync } from '@proj-airi/model-driver-lipsync'
import { wlipsyncProfile } from '@proj-airi/model-driver-lipsync/shared/wlipsync'
import { createPlaybackManager, createSpeechPipeline } from '@proj-airi/pipelines-audio'
import { Live2DScene, useLive2d } from '@proj-airi/stage-ui-live2d'
import { ThreeScene } from '@proj-airi/stage-ui-three'
import { animations } from '@proj-airi/stage-ui-three/assets/vrm'
import { createQueue } from '@proj-airi/stream-kit'
import { useBroadcastChannel, useMediaQuery } from '@vueuse/core'
// import { createTransformers } from '@xsai-transformers/embed'
// import embedWorkerURL from '@xsai-transformers/embed/worker?worker&url'
// import { embed } from '@xsai/embed'
import { generateSpeech } from '@xsai/generate-speech'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import StageDialoguePanel from './stage-dialogue-panel.vue'

import { useDelayMessageQueue, useEmotionsMessageQueue } from '../../composables/queues'
import { llmInferenceEndToken } from '../../constants'
import { Emotion, EMOTION_EmotionMotionName_value, EMOTION_VRMExpressionName_value, EmotionThinkMotionName } from '../../constants/emotions'
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
import { resolveStageBubblePlacement, resolveStageBubbleText } from '../../utils'
import { shouldRunLive2dLipSyncLoop } from './runtime'

const props = withDefaults(defineProps<{
  paused?: boolean
  focusAt: { x: number, y: number }
  xOffset?: number | string
  yOffset?: number | string
  scale?: number
  quickReplyEnabled?: boolean
}>(), { paused: false, scale: 1, quickReplyEnabled: true })

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

const db = ref<DuckDBWasmDrizzleDatabase>()
// const transformersProvider = createTransformers({ embedWorkerURL })

const vrmViewerRef = ref<InstanceType<typeof ThreeScene>>()
const live2dSceneRef = ref<InstanceType<typeof Live2DScene>>()

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
const { audioContext } = useAudioContext()
const currentAudioSource = ref<AudioBufferSourceNode>()

const chatOrchestrator = useChatOrchestratorStore()
const { onBeforeMessageComposed, onBeforeSend, onTokenLiteral, onTokenSpecial, onStreamEnd, onAssistantResponseEnd } = chatOrchestrator
const { sending } = storeToRefs(chatOrchestrator)
const chatHookCleanups: Array<() => void> = []
const presenceCleanups: Array<() => void> = []
// WORKAROUND: clear previous handlers on unmount to avoid duplicate calls when this component remounts.
//             We keep per-hook disposers instead of wiping the global chat hooks to play nicely with
//             cross-window broadcast wiring.

const providersStore = useProvidersStore()
const alicizationPresenceDispatcherStore = useAlicizationPresenceDispatcherStore()
const live2dStore = useLive2d()
const chatSessionStore = useChatSessionStore()
const chatStreamStore = useChatStreamStore()
const dialoguePanelRef = ref<InstanceType<typeof StageDialoguePanel>>()
const { messages } = storeToRefs(chatSessionStore)
const { streamingMessage } = storeToRefs(chatStreamStore)
const showStage = ref(true)
const viewUpdateCleanups: Array<() => void> = []

// Caption + Presentation broadcast channels
type CaptionChannelEvent
  = | { type: 'caption-speaker', text: string }
    | { type: 'caption-assistant', text: string }
const { post: postCaption } = useBroadcastChannel<CaptionChannelEvent, CaptionChannelEvent>({ name: 'airi-caption-overlay' })
const assistantCaption = ref('')
const hoverCapable = useMediaQuery('(hover: hover) and (pointer: fine)')
const stageCharacterHovered = ref(false)
const dialoguePanelHovered = ref(false)
const dialoguePanelFocused = ref(false)
let stageCharacterHoverLeaveTimeout: number | undefined

type PresentEvent
  = | { type: 'assistant-reset' }
    | { type: 'assistant-append', text: string }
const { post: postPresent } = useBroadcastChannel<PresentEvent, PresentEvent>({ name: 'airi-chat-present' })

viewUpdateCleanups.push(live2dStore.onShouldUpdateView(async () => {
  showStage.value = false
  await settingsStore.updateStageModel()
  setTimeout(() => {
    showStage.value = true
  }, 100)
}))

const audioAnalyser = ref<AnalyserNode>()
const nowSpeaking = ref(false)
const lipSyncStarted = ref(false)
const lipSyncLoopId = ref<number>()
const live2dLipSync = ref<Live2DLipSync>()
const live2dLipSyncOptions: Live2DLipSyncOptions = { mouthUpdateIntervalMs: 50, mouthLerpWindowMs: 50 }

const { activeCard } = storeToRefs(useAiriCardStore())
const speechStore = useSpeechStore()
const { ssmlEnabled, activeSpeechProvider, activeSpeechModel, activeSpeechVoice, pitch, rate } = storeToRefs(speechStore)
const activeCardId = computed(() => activeCard.value?.name ?? 'default')
const speechRuntimeStore = useSpeechRuntimeStore()

const { currentMotion } = storeToRefs(useLive2d())

const emotionsQueue = createQueue<EmotionPayload>({
  handlers: [
    async (ctx) => {
      if (stageModelRenderer.value === 'vrm') {
        // console.debug('VRM emotion anime: ', ctx.data)
        const value = EMOTION_VRMExpressionName_value[ctx.data.name]
        if (!value)
          return

        await vrmViewerRef.value!.setExpression(value, ctx.data.intensity)
      }
      else if (stageModelRenderer.value === 'live2d') {
        currentMotion.value = { group: EMOTION_EmotionMotionName_value[ctx.data.name] }
      }
    },
  ],
})

const emotionMessageContentQueue = useEmotionsMessageQueue(emotionsQueue)
emotionMessageContentQueue.onHandlerEvent('emotion', (emotion) => {
  applyEmotionSpeechStyle(emotion.name)
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
const lipSyncNode = ref<AudioNode>()
const emotionPitchDelta = ref(0)
const emotionRateMultiplier = ref(1)

function normalizePresenceEmotionName(rawEmotion: string): EmotionPayload['name'] {
  const normalized = rawEmotion.trim().toLowerCase()
  if (normalized === 'happy')
    return Emotion.Happy
  if (normalized === 'sad')
    return Emotion.Sad
  if (normalized === 'angry')
    return Emotion.Angry
  if (normalized === 'surprised')
    return Emotion.Surprise
  if (normalized === 'awkward')
    return Emotion.Awkward
  if (normalized === 'question' || normalized === 'concerned')
    return Emotion.Question
  if (normalized === 'curious')
    return Emotion.Curious
  if (normalized === 'tired')
    return Emotion.Sad
  if (normalized === 'apologetic')
    return Emotion.Awkward
  if (normalized === 'think')
    return Emotion.Think
  return Emotion.Neutral
}

function applyEmotionSpeechStyle(emotionName: EmotionPayload['name']) {
  const styleMap: Record<Emotion, { pitchDelta: number, rateMultiplier: number }> = {
    [Emotion.Happy]: { pitchDelta: 8, rateMultiplier: 1.06 },
    [Emotion.Sad]: { pitchDelta: -20, rateMultiplier: 0.82 },
    [Emotion.Angry]: { pitchDelta: -12, rateMultiplier: 1.1 },
    [Emotion.Think]: { pitchDelta: -2, rateMultiplier: 0.97 },
    [Emotion.Surprise]: { pitchDelta: 10, rateMultiplier: 1.1 },
    [Emotion.Awkward]: { pitchDelta: -6, rateMultiplier: 0.92 },
    [Emotion.Question]: { pitchDelta: 3, rateMultiplier: 1.02 },
    [Emotion.Curious]: { pitchDelta: 4, rateMultiplier: 1.04 },
    [Emotion.Neutral]: { pitchDelta: 0, rateMultiplier: 1 },
  }
  const style = styleMap[emotionName]
  emotionPitchDelta.value = style.pitchDelta
  emotionRateMultiplier.value = style.rateMultiplier
}

async function playFunction(item: Parameters<Parameters<typeof createPlaybackManager<AudioBuffer>>[0]['play']>[0], signal: AbortSignal): Promise<void> {
  if (!audioContext || !item.audio)
    return

  // Ensure audio context is resumed (browsers suspend it by default until user interaction)
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume()
    }
    catch {
      return
    }
  }

  const source = audioContext.createBufferSource()
  currentAudioSource.value = source
  source.buffer = item.audio

  source.connect(audioContext.destination)
  if (audioAnalyser.value)
    source.connect(audioAnalyser.value)
  if (lipSyncNode.value)
    source.connect(lipSyncNode.value)

  return new Promise<void>((resolve) => {
    let settled = false
    const resolveOnce = () => {
      if (settled)
        return
      settled = true
      resolve()
    }

    const stopPlayback = () => {
      try {
        source.stop()
        source.disconnect()
      }
      catch {}
      if (currentAudioSource.value === source)
        currentAudioSource.value = undefined
      resolveOnce()
    }

    if (signal.aborted) {
      stopPlayback()
      return
    }

    signal.addEventListener('abort', stopPlayback, { once: true })
    source.onended = () => {
      signal.removeEventListener('abort', stopPlayback)
      stopPlayback()
    }

    try {
      source.start(0)
    }
    catch {
      stopPlayback()
    }
  })
}

const playbackManager = createPlaybackManager<AudioBuffer>({
  play: playFunction,
  maxVoices: 1,
  maxVoicesPerOwner: 1,
  overflowPolicy: 'queue',
  ownerOverflowPolicy: 'steal-oldest',
})

const speechPipeline = createSpeechPipeline<AudioBuffer>({
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

    const styledPitch = Math.max(-50, Math.min(50, pitch.value + emotionPitchDelta.value))
    const styledRate = Math.max(0.5, Math.min(2, rate.value * emotionRateMultiplier.value))
    const providerRuntimeConfigForSsml = {
      ...providerConfig,
      pitch: styledPitch,
      speed: styledRate,
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
      return audioBuffer
    }
    catch {
      return null
    }
  },
  playback: playbackManager,
})

void speechRuntimeStore.registerHost(speechPipeline)
let currentChatIntent: ReturnType<typeof speechRuntimeStore.openIntent> | null = null

presenceCleanups.push(alicizationPresenceDispatcherStore.registerLive2DController({
  playEmotion: async (emotion, payload) => {
    const emotionName = normalizePresenceEmotionName(emotion)
    emotionsQueue.enqueue({
      name: emotionName,
      intensity: payload.isFallback ? 0.75 : 1,
    })
    applyEmotionSpeechStyle(emotionName)
  },
}))

presenceCleanups.push(alicizationPresenceDispatcherStore.registerTTSController({
  speak: async (reply, emotion) => {
    const emotionName = normalizePresenceEmotionName(emotion)
    applyEmotionSpeechStyle(emotionName)

    const normalizedReply = reply.trim()
    if (!normalizedReply)
      return

    if (currentChatIntent || nowSpeaking.value)
      return

    const fallbackIntent = speechRuntimeStore.openIntent({
      ownerId: activeCardId.value,
      priority: 'normal',
      behavior: 'queue',
    })
    fallbackIntent.writeLiteral(normalizedReply)
    fallbackIntent.writeFlush()
    fallbackIntent.end()
  },
}))

speechPipeline.on('onSpecial', (segment) => {
  if (segment.special)
    playSpecialToken(segment.special)
})

playbackManager.onEnd(({ item }) => {
  if (item.special)
    playSpecialToken(item.special)

  nowSpeaking.value = false
  mouthOpenSize.value = 0
})

playbackManager.onStart(({ item }) => {
  nowSpeaking.value = true
  // NOTICE: postCaption and postPresent may throw errors if the BroadcastChannel is closed
  // (e.g., when navigating away from the page). We wrap these in try-catch to prevent
  // breaking playback when the channel is unavailable.
  assistantCaption.value += ` ${item.text}`
  try {
    postCaption({ type: 'caption-assistant', text: assistantCaption.value })
  }
  catch {
    // BroadcastChannel may be closed - don't break playback
  }
  try {
    postPresent({ type: 'assistant-append', text: item.text })
  }
  catch {
    // BroadcastChannel may be closed - don't break playback
  }
})

function startLipSyncLoop() {
  if (lipSyncLoopId.value)
    return

  const tick = () => {
    if (!nowSpeaking.value || !live2dLipSync.value) {
      mouthOpenSize.value = 0
    }
    else {
      mouthOpenSize.value = live2dLipSync.value.getMouthOpen()
    }
    lipSyncLoopId.value = requestAnimationFrame(tick)
  }

  lipSyncLoopId.value = requestAnimationFrame(tick)
}

function stopLipSyncLoop() {
  if (lipSyncLoopId.value) {
    cancelAnimationFrame(lipSyncLoopId.value)
    lipSyncLoopId.value = undefined
  }

  mouthOpenSize.value = 0
}

function resetLive2dLipSync() {
  stopLipSyncLoop()

  try {
    lipSyncNode.value?.disconnect()
  }
  catch {

  }

  lipSyncNode.value = undefined
  live2dLipSync.value = undefined
  lipSyncStarted.value = false
}

function syncLipSyncLoop() {
  if (shouldRunLive2dLipSyncLoop({
    stageModelRenderer: stageModelRenderer.value,
    paused: Boolean(props.paused),
  }) && lipSyncStarted.value) {
    startLipSyncLoop()
    return
  }

  stopLipSyncLoop()
}

async function setupLipSync() {
  if (stageModelRenderer.value !== 'live2d') {
    resetLive2dLipSync()
    return
  }

  if (lipSyncStarted.value)
    return

  try {
    const lipSync = await createLive2DLipSync(audioContext, wlipsyncProfile as Profile, live2dLipSyncOptions)
    live2dLipSync.value = lipSync
    lipSyncNode.value = lipSync.node
    await audioContext.resume()
    lipSyncStarted.value = true
    syncLipSyncLoop()
  }
  catch (error) {
    resetLive2dLipSync()
    console.error('Failed to setup Live2D lip sync', error)
  }
}

function setupAnalyser() {
  if (!audioAnalyser.value) {
    audioAnalyser.value = audioContext.createAnalyser()
  }
}

chatHookCleanups.push(onBeforeMessageComposed(async () => {
  playbackManager.stopAll('new-message')

  setupAnalyser()
  await setupLipSync()
  // Reset assistant caption for a new message
  assistantCaption.value = ''
  try {
    postCaption({ type: 'caption-assistant', text: '' })
  }
  catch (error) {
    // BroadcastChannel may be closed if user navigated away - don't break flow
    console.warn('[Stage] Failed to post caption reset (channel may be closed)', { error })
  }
  try {
    postPresent({ type: 'assistant-reset' })
  }
  catch (error) {
    // BroadcastChannel may be closed if user navigated away - don't break flow
    console.warn('[Stage] Failed to post present reset (channel may be closed)', { error })
  }

  if (currentChatIntent) {
    currentChatIntent.cancel('new-message')
    currentChatIntent = null
  }

  currentChatIntent = speechRuntimeStore.openIntent({
    ownerId: activeCardId.value,
    priority: 'normal',
    behavior: 'queue',
  })
}))

chatHookCleanups.push(onBeforeSend(async () => {
  currentMotion.value = { group: EmotionThinkMotionName }
}))

chatHookCleanups.push(onTokenLiteral(async (literal) => {
  currentChatIntent?.writeLiteral(literal)
}))

chatHookCleanups.push(onTokenSpecial(async (special) => {
  // console.debug('Stage received special token:', special)
  currentChatIntent?.writeSpecial(special)
}))

chatHookCleanups.push(onStreamEnd(async () => {
  delaysQueue.enqueue(llmInferenceEndToken)
  currentChatIntent?.writeFlush()
}))

chatHookCleanups.push(onAssistantResponseEnd(async (_message) => {
  currentChatIntent?.end()
  currentChatIntent = null
  // const res = await embed({
  //   ...transformersProvider.embed('Xenova/nomic-embed-text-v1'),
  //   input: message,
  // })

  // await db.value?.execute(`INSERT INTO memory_test (vec) VALUES (${JSON.stringify(res.embedding)});`)
}))

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
  db.value = drizzle({ connection: { bundles: getImportUrlBundles() } })
  await db.value.execute(`CREATE TABLE memory_test (vec FLOAT[768]);`)
})

watch([stageModelRenderer, () => props.paused], ([renderer]) => {
  if (renderer !== 'live2d') {
    resetLive2dLipSync()
    return
  }

  syncLipSyncLoop()
}, { immediate: true })

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

function clearStageCharacterHoverLeaveTimeout() {
  if (!stageCharacterHoverLeaveTimeout)
    return

  clearTimeout(stageCharacterHoverLeaveTimeout)
  stageCharacterHoverLeaveTimeout = undefined
}

function setStageCharacterHovered(hovered: boolean) {
  if (!hoverCapable.value) {
    stageCharacterHovered.value = false
    return
  }

  clearStageCharacterHoverLeaveTimeout()

  if (hovered) {
    stageCharacterHovered.value = true
    return
  }

  stageCharacterHoverLeaveTimeout = window.setTimeout(() => {
    stageCharacterHovered.value = false
    stageCharacterHoverLeaveTimeout = undefined
  }, 160)
}

function handleDialoguePanelHoverChange(hovered: boolean) {
  dialoguePanelHovered.value = hovered
  if (hovered)
    clearStageCharacterHoverLeaveTimeout()
}

function handleDialoguePanelFocusChange(focused: boolean) {
  dialoguePanelFocused.value = focused
  if (focused)
    clearStageCharacterHoverLeaveTimeout()
}

const dialoguePlacement = computed(() => resolveStageBubblePlacement(parseStagePositionX(props.xOffset)))
const streamingBubbleText = computed(() => resolveStageBubbleText(streamingMessage.value))
const recentAssistantBubbleMessage = computed(() => {
  return [...messages.value]
    .reverse()
    .find(message => message.role === 'assistant' && !!resolveStageBubbleText(message))
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
const showDialogueOverlay = computed(() => {
  if (!dialogueHasVisibleContent.value)
    return false

  if (!usesHoverTriggeredDialogue.value)
    return props.quickReplyEnabled || bubbleLoading.value || !!bubbleText.value

  return bubbleLoading.value
    || bubbleStreaming.value
    || stageCharacterHovered.value
    || dialoguePanelHovered.value
    || dialoguePanelFocused.value
})

function dialogueOverlayElement() {
  return dialoguePanelRef.value?.panelRootElement()
}

function readRenderTargetRegionAtClientPoint(clientX: number, clientY: number, radius: number) {
  if (stageModelRenderer.value !== 'vrm')
    return null

  return vrmViewerRef.value?.readRenderTargetRegionAtClientPoint?.(clientX, clientY, radius) ?? null
}

onUnmounted(() => {
  clearStageCharacterHoverLeaveTimeout()
  resetLive2dLipSync()
  chatHookCleanups.forEach(dispose => dispose?.())
  presenceCleanups.forEach(dispose => dispose?.())
  viewUpdateCleanups.forEach(dispose => dispose?.())
})

defineExpose({
  canvasElement,
  dialogueOverlayElement,
  readRenderTargetRegionAtClientPoint,
})
</script>

<template>
  <div relative h-full w-full>
    <div h-full w-full>
      <Live2DScene
        v-if="stageModelRenderer === 'live2d' && showStage"
        ref="live2dSceneRef"
        v-model:state="componentState"
        min-w="50% <lg:full" min-h="100 sm:100"
        h-full w-full flex-1
        :model-src="stageModelSelectedUrl"
        :model-id="stageModelSelected"
        :focus-at="focusAt"
        :mouth-open-size="mouthOpenSize"
        :paused="paused"
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
        :model-src="stageModelSelectedUrl"
        :idle-animation="animations.idleLoop.toString()"
        :paused="paused"
        :show-axes="stageViewControlsEnabled"
        :current-audio-source="currentAudioSource"
        @error="console.error"
      />
    </div>
    <div
      v-if="showDialogueOverlay"
      class="stage-dialogue-layer"
    >
      <StageDialoguePanel
        ref="dialoguePanelRef"
        :character-offset-x="parseStagePositionX(props.xOffset)"
        :loading="bubbleLoading"
        :streaming="bubbleStreaming"
        :text="bubbleText"
        :placement="dialoguePlacement"
        :quick-reply-enabled="props.quickReplyEnabled"
        :visible="showDialogueOverlay"
        @hover-change="handleDialoguePanelHoverChange"
        @focus-change="handleDialoguePanelFocusChange"
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
