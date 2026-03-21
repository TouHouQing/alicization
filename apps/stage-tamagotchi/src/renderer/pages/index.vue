<script setup lang="ts">
import type { ChatProvider } from '@xsai-ext/providers/utils'

import workletUrl from '@proj-alicization/stage-ui/workers/vad/process.worklet?worker&url'

import { electron } from '@proj-alicization/electron-eventa'
import {
  useElectronEventaInvoke,
  useElectronMouseInElement,
  useElectronMouseInWindow,
  useElectronRelativeMouse,
} from '@proj-alicization/electron-vueuse'
import { useModelStore, useThreeSceneIsTransparentAtPoint } from '@proj-alicization/stage-ui-three'
import { WidgetStage } from '@proj-alicization/stage-ui/components/scenes'
import { useAudioRecorder } from '@proj-alicization/stage-ui/composables/audio/audio-recorder'
import { useCanvasPixelIsTransparentAtPoint } from '@proj-alicization/stage-ui/composables/canvas-alpha'
import { useVAD } from '@proj-alicization/stage-ui/stores/ai/models/vad'
import { useChatOrchestratorStore } from '@proj-alicization/stage-ui/stores/chat'
import { useDisplayModelsStore } from '@proj-alicization/stage-ui/stores/display-models'
import { useLive2d } from '@proj-alicization/stage-ui/stores/live2d'
import { useConsciousnessStore } from '@proj-alicization/stage-ui/stores/modules/consciousness'
import { useHearingSpeechInputPipeline } from '@proj-alicization/stage-ui/stores/modules/hearing'
import { useOnboardingStore } from '@proj-alicization/stage-ui/stores/onboarding'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { useSettings, useSettingsAudioDevice } from '@proj-alicization/stage-ui/stores/settings'
import { useStageDialogueStore } from '@proj-alicization/stage-ui/stores/stage-dialogue'
import { refDebounced, useBroadcastChannel, useFocusWithin } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue'

import ControlsIsland from '../components/stage-islands/controls-island/index.vue'
import ResourceStatusIsland from '../components/stage-islands/resource-status-island/index.vue'
import StatusIsland from '../components/stage-islands/status-island/index.vue'

import { electronOpenOnboarding } from '../../shared/eventa'
import { useControlsIslandStore } from '../stores/controls-island'
import { useStageWindowLifecycleStore } from '../stores/stage-window-lifecycle'
import { useWindowStore } from '../stores/window'
import { resetDesktopLayoutState, resolveDesktopMouseCaptureState } from './index.desktop'

const controlsIslandRef = ref<InstanceType<typeof ControlsIsland>>()
const statusIslandRef = ref<InstanceType<typeof StatusIsland>>()
const widgetStageRef = ref<InstanceType<typeof WidgetStage>>()
const controlsIslandElement = computed(() => controlsIslandRef.value?.$el as HTMLElement | undefined)
const statusIslandElement = computed(() => statusIslandRef.value?.$el as HTMLElement | undefined)
const stageCanvas = toRef(() => widgetStageRef.value?.canvasElement())
const stageDialogueOverlay = toRef(() => widgetStageRef.value?.dialogueOverlayElement())
const componentStateStage = ref<'pending' | 'loading' | 'mounted'>('pending')

const isLoading = ref(true)

const shouldFadeOnCursorWithin = ref(false)
const stageInteractionActive = ref(false)

const onboardingStore = useOnboardingStore()
const openOnboarding = useElectronEventaInvoke(electronOpenOnboarding)

const { isOutside: isOutsideWindow } = useElectronMouseInWindow()
const { isOutside } = useElectronMouseInElement(controlsIslandElement)
const { isOutside: isOutsideStatusIsland } = useElectronMouseInElement(statusIslandElement)
const { isOutside: isOutsideDialogueOverlay } = useElectronMouseInElement(stageDialogueOverlay)
const isOutsideFor250Ms = refDebounced(isOutside, 250)
const isOutsideStatusIslandFor250Ms = refDebounced(isOutsideStatusIsland, 250)
const isOutsideDialogueOverlayFor250Ms = refDebounced(isOutsideDialogueOverlay, 250)
const { focused: isDialogueOverlayFocused } = useFocusWithin(stageDialogueOverlay)
const { x: relativeMouseX, y: relativeMouseY } = useElectronRelativeMouse()
const desktopCaptureHitTestOptions = {
  regionRadius: 0,
  threshold: 16,
} as const
const desktopCharacterHoverHitTestOptions = {
  regionRadius: 0,
  threshold: 64,
} as const
// NOTICE: Desktop hit testing must stay aligned with the rendered output so blank desktop pixels remain
// fully click-through. Hover-triggered dialogue uses a stricter alpha threshold than generic capture so
// faint shadows do not count as "touching the character".
const isTransparentByPixelsForCapture = useCanvasPixelIsTransparentAtPoint(
  stageCanvas,
  relativeMouseX,
  relativeMouseY,
  desktopCaptureHitTestOptions,
)
const isTransparentByPixelsForCharacterHover = useCanvasPixelIsTransparentAtPoint(
  stageCanvas,
  relativeMouseX,
  relativeMouseY,
  desktopCharacterHoverHitTestOptions,
)
const isTransparentByThreeForCapture = useThreeSceneIsTransparentAtPoint(
  widgetStageRef,
  relativeMouseX,
  relativeMouseY,
  desktopCaptureHitTestOptions,
)
const isTransparentByThreeForCharacterHover = useThreeSceneIsTransparentAtPoint(
  widgetStageRef,
  relativeMouseX,
  relativeMouseY,
  desktopCharacterHoverHitTestOptions,
)

const settingsStore = useSettings()
const displayModelsStore = useDisplayModelsStore()
const { stageModelRenderer, stageModelSelectedUrl } = storeToRefs(settingsStore)
const { stagePaused } = storeToRefs(useStageWindowLifecycleStore())
const { fadeOnHoverEnabled } = storeToRefs(useControlsIslandStore())

const stageCapturePixel = computed(() => {
  if (stagePaused.value || componentStateStage.value !== 'mounted')
    return false

  if (stageModelRenderer.value === 'vrm')
    return !isTransparentByThreeForCapture.value

  if (stageModelRenderer.value === 'live2d')
    return !isTransparentByPixelsForCapture.value

  return false
})

const stageCharacterHovered = computed(() => {
  if (stagePaused.value || componentStateStage.value !== 'mounted')
    return false

  if (stageModelRenderer.value === 'vrm')
    return !isTransparentByThreeForCharacterHover.value

  if (stageModelRenderer.value === 'live2d')
    return !isTransparentByPixelsForCharacterHover.value

  return false
})

const setIgnoreMouseEvents = useElectronEventaInvoke(electron.window.setIgnoreMouseEvents)

const live2dStore = useLive2d()
const modelStore = useModelStore()
const stageDialogueStore = useStageDialogueStore()
const { scale, position } = storeToRefs(live2dStore)
const { live2dLookAtX, live2dLookAtY } = storeToRefs(useWindowStore())
const stageLoadRecoveryAttempts = ref(0)
const stageLoadRecoveryInFlight = ref(false)
let stageLoadRecoveryTimer: ReturnType<typeof setTimeout> | undefined
const stageLoadRecoveryDelayMs = 8000
const maxStageLoadRecoveryAttempts = 2

function resetDesktopLayout() {
  resetDesktopLayoutState({
    live2d: live2dStore,
    model: modelStore,
    stageDialogue: stageDialogueStore,
  })
}

watch(componentStateStage, () => isLoading.value = componentStateStage.value !== 'mounted', { immediate: true })

const hearingDialogOpen = computed(() => controlsIslandRef.value?.hearingDialogOpen ?? false)

watch([isOutsideFor250Ms, isOutsideStatusIslandFor250Ms, isOutsideDialogueOverlayFor250Ms, isDialogueOverlayFocused, isOutsideWindow, stageCapturePixel, hearingDialogOpen, fadeOnHoverEnabled, stagePaused, stageInteractionActive], () => {
  const insideControls = !isOutsideFor250Ms.value || !isOutsideStatusIslandFor250Ms.value
  const insideDialogueOverlay = !isOutsideDialogueOverlayFor250Ms.value || isDialogueOverlayFocused.value
  const { shouldCaptureMouse, shouldFadeOnCursorWithin: nextShouldFadeOnCursorWithin } = resolveDesktopMouseCaptureState({
    fadeOnHoverEnabled: fadeOnHoverEnabled.value,
    hearingDialogOpen: hearingDialogOpen.value,
    insideControls,
    insideDialogueOverlay,
    isOutsideWindow: isOutsideWindow.value,
    stageInteractionActive: stageInteractionActive.value,
    stageCapturePixel: stageCapturePixel.value,
    stagePaused: stagePaused.value,
  })

  setIgnoreMouseEvents([!shouldCaptureMouse, { forward: true }])
  shouldFadeOnCursorWithin.value = nextShouldFadeOnCursorWithin
})

const settingsAudioDeviceStore = useSettingsAudioDevice()
const { stream, enabled } = storeToRefs(settingsAudioDeviceStore)
const { askPermission } = settingsAudioDeviceStore
const { startRecord, stopRecord, onStopRecord } = useAudioRecorder(stream)
const hearingPipeline = useHearingSpeechInputPipeline()
const {
  transcribeForRecording,
  transcribeForMediaStream,
  stopStreamingTranscription,
} = hearingPipeline
const { supportsStreamInput } = storeToRefs(hearingPipeline)
const providersStore = useProvidersStore()
const consciousnessStore = useConsciousnessStore()
const { activeProvider: activeChatProvider, activeModel: activeChatModel } = storeToRefs(consciousnessStore)
const chatStore = useChatOrchestratorStore()
const shouldUseStreamInput = computed(() => supportsStreamInput.value && !!stream.value)

const {
  init: initVAD,
  dispose: disposeVAD,
  start: startVAD,
  loaded: vadLoaded,
} = useVAD(workletUrl, {
  threshold: ref(0.6),
  onSpeechStart: () => {
    void handleSpeechStart()
  },
  onSpeechEnd: () => {
    void handleSpeechEnd()
  },
})

let stopOnStopRecord: (() => void) | undefined

// Caption overlay broadcast channel
type CaptionChannelEvent
  = | { type: 'caption-speaker', text: string }
    | { type: 'caption-assistant', text: string }
const { post: postCaption } = useBroadcastChannel<CaptionChannelEvent, CaptionChannelEvent>({ name: 'airi-caption-overlay' })

async function handleSpeechStart() {
  if (shouldUseStreamInput.value) {
    console.info('Speech detected - transcription session should already be active')
    return
  }

  startRecord()
}

async function handleSpeechEnd() {
  if (shouldUseStreamInput.value) {
    // Keep streaming session alive; idle timer in pipeline will handle teardown.
    return
  }

  stopRecord()
}

async function startAudioInteraction() {
  try {
    console.info('[Main Page] Starting audio interaction...')

    initVAD().then(() => {
      if (stream.value)
        return startVAD(stream.value)
    }).catch((err) => {
      console.warn('[Main Page] VAD initialization failed (non-critical for Web Speech API):', err)
    })

    if (shouldUseStreamInput.value) {
      console.info('[Main Page] Starting streaming transcription...', {
        supportsStreamInput: supportsStreamInput.value,
        hasStream: !!stream.value,
      })

      if (!stream.value) {
        console.warn('[Main Page] Stream not available despite shouldUseStreamInput being true')
        return
      }

      // Use sentence deltas for live captions and speech end for final text.
      await transcribeForMediaStream(stream.value, {
        onSentenceEnd: (delta) => {
          console.info('[Main Page] Received transcription delta:', delta)
          const finalText = delta
          if (!finalText || !finalText.trim()) {
            return
          }

          postCaption({ type: 'caption-speaker', text: finalText })

          void (async () => {
            try {
              const provider = await providersStore.getProviderInstance(activeChatProvider.value)
              if (!provider || !activeChatModel.value) {
                console.warn('[Main Page] No provider or model available, skipping chat send')
                return
              }

              console.info('[Main Page] Sending transcription to chat:', finalText)
              await chatStore.ingest(finalText, {
                model: activeChatModel.value,
                chatProvider: provider as ChatProvider,
                origin: 'ui-user',
              })
            }
            catch (err) {
              console.error('[Main Page] Failed to send chat from voice:', err)
            }
          })()
        },
        onSpeechEnd: (text) => {
          console.info('[Main Page] Speech ended, final text:', text)
          postCaption({ type: 'caption-speaker', text })
        },
      })

      console.info('[Main Page] Streaming transcription started successfully')
    }
    else {
      console.warn('[Main Page] Not starting streaming transcription:', {
        shouldUseStreamInput: shouldUseStreamInput.value,
        hasStream: !!stream.value,
        supportsStreamInput: supportsStreamInput.value,
      })
    }

    // Hook once
    stopOnStopRecord = onStopRecord(async (recording) => {
      if (shouldUseStreamInput.value)
        return

      const text = await transcribeForRecording(recording)
      if (!text || !text.trim())
        return

      // Update caption overlay speaker text via BroadcastChannel
      postCaption({ type: 'caption-speaker', text })

      try {
        const provider = await providersStore.getProviderInstance(activeChatProvider.value)
        if (!provider || !activeChatModel.value)
          return

        await chatStore.ingest(text, {
          model: activeChatModel.value,
          chatProvider: provider as ChatProvider,
          origin: 'ui-user',
        })
      }
      catch (err) {
        console.error('Failed to send chat from voice:', err)
      }
    })
  }
  catch (e) {
    console.error('Audio interaction init failed:', e)
  }
}

function stopAudioInteraction() {
  try {
    stopOnStopRecord?.()
    stopOnStopRecord = undefined
    void stopStreamingTranscription(true)
    disposeVAD()
  }
  catch {}
}

watch(enabled, async (val) => {
  console.info('[Main Page] Audio enabled changed:', val, 'stream available:', !!stream.value)
  if (val) {
    await askPermission()
    await startAudioInteraction()
  }
  else {
    stopAudioInteraction()
  }
}, { immediate: true })

function clearStageLoadRecoveryTimer() {
  if (!stageLoadRecoveryTimer)
    return

  clearTimeout(stageLoadRecoveryTimer)
  stageLoadRecoveryTimer = undefined
}

async function ensureStageModelInitialized() {
  await displayModelsStore.loadDisplayModelsFromIndexedDB()
  await settingsStore.initializeStageModel()
}

async function recoverStageLoading(reason: 'init' | 'watchdog') {
  if (stageLoadRecoveryInFlight.value)
    return

  stageLoadRecoveryInFlight.value = true

  try {
    await ensureStageModelInitialized()

    if (stageModelRenderer.value === 'live2d') {
      live2dStore.shouldUpdateView()
    }
    else {
      await settingsStore.updateStageModel()
    }

    if (reason === 'watchdog')
      stageLoadRecoveryAttempts.value += 1
  }
  catch (error) {
    console.warn('[Main Page] Failed to recover stage loading state:', error)
  }
  finally {
    stageLoadRecoveryInFlight.value = false
  }
}

watch([componentStateStage, stageModelRenderer, stageModelSelectedUrl], ([state, renderer, modelUrl]) => {
  clearStageLoadRecoveryTimer()

  if (state === 'mounted') {
    stageLoadRecoveryAttempts.value = 0
    return
  }

  if (renderer === 'disabled')
    return

  if (stageLoadRecoveryAttempts.value >= maxStageLoadRecoveryAttempts)
    return

  stageLoadRecoveryTimer = setTimeout(() => {
    if (componentStateStage.value === 'mounted')
      return

    if (stageLoadRecoveryInFlight.value)
      return

    if (!stageModelRenderer.value || !stageModelSelectedUrl.value || modelUrl !== stageModelSelectedUrl.value || renderer !== stageModelRenderer.value) {
      void recoverStageLoading('init')
      return
    }

    void recoverStageLoading('watchdog')
  }, stageLoadRecoveryDelayMs)
}, { immediate: true })

onMounted(() => {
  void recoverStageLoading('init')

  if (onboardingStore.needsOnboarding) {
    openOnboarding()
  }
})

onUnmounted(() => {
  clearStageLoadRecoveryTimer()
  stopAudioInteraction()
})

watch([stream, () => vadLoaded.value], async ([s, loaded]) => {
  if (enabled.value && loaded && s) {
    try {
      await startVAD(s)
    }
    catch (e) {
      console.error('Failed to start VAD with stream:', e)
    }
  }
})

// Assistant caption is broadcast from Stage.vue via the same channel
</script>

<template>
  <div
    relative z-2 h-full w-full overflow-hidden
    transition="opacity duration-500 ease-in-out"
  >
    <div
      :class="[
        shouldFadeOnCursorWithin ? 'op-0' : 'op-100',
        'absolute inset-0 overflow-hidden transition-opacity duration-250 ease-in-out',
      ]"
    >
      <StatusIsland ref="statusIslandRef" />
      <ResourceStatusIsland />
      <WidgetStage
        ref="widgetStageRef"
        v-model:state="componentStateStage"
        h-full w-full
        flex-1
        :paused="stagePaused"
        :quick-reply-enabled="true"
        :focus-at="{ x: live2dLookAtX, y: live2dLookAtY }"
        live2d-position-mode="pixel"
        :scale="scale"
        :x-offset="position.x"
        :y-offset="position.y"
        :character-hovered-override="stageCharacterHovered"
        @desktop-interaction-change="stageInteractionActive = $event"
      />
      <ControlsIsland
        ref="controlsIslandRef"
        @reset-desktop-layout="resetDesktopLayout"
      />
    </div>
    <div v-show="isLoading" class="pointer-events-none absolute left-0 top-0 z-99 h-full w-full flex items-center justify-center overflow-hidden">
      <div
        :class="[
          'absolute h-24 w-full overflow-hidden',
          'flex items-center justify-center',
          'bg-white/80 dark:bg-neutral-950/80',
          'backdrop-blur-md',
        ]"
      >
        <div
          :class="[
            'absolute left-0 top-0',
            'h-full w-full flex items-center justify-center',
            'text-1.5rem text-primary-600 dark:text-primary-400 font-normal',
            'select-none',
            'animate-flash animate-duration-5s animate-count-infinite',
          ]"
        >
          Loading...
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes wall-move {
  0% {
    transform: translateX(calc(var(--wall-width) * -2));
  }
  100% {
    transform: translateX(calc(var(--wall-width) * 1));
  }
}

.wall {
  --at-apply: text-primary-300;

  --wall-width: 8px;
  animation: wall-move 1s linear infinite;
  background-image: repeating-linear-gradient(
    45deg,
    currentColor,
    currentColor var(--wall-width),
    #ff00 var(--wall-width),
    #ff00 calc(var(--wall-width) * 2)
  );
  width: calc(100% + 4 * var(--wall-width));
}
</style>

<route lang="yaml">
meta:
  layout: stage
</route>
