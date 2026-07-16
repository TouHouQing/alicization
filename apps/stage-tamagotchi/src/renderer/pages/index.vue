<script setup lang="ts">
import type { AlicizationMindTurnEventRecord } from '@proj-alicization/stage-ui/stores/alicization-bridge'
import type { ChatProvider } from '@xsai-ext/providers/utils'

import workletUrl from '@proj-alicization/stage-ui/workers/vad/process.worklet?worker&url'

import { electron } from '@proj-alicization/electron-eventa'
import {
  useElectronEventaInvoke,
  useElectronMouseInElement,
  useElectronMouseInWindow,
  useElectronRelativeMouse,
} from '@proj-alicization/electron-vueuse'
import { createLazyBroadcastPoster } from '@proj-alicization/stage-shared'
import { useModelStore, useThreeSceneIsTransparentAtPoint } from '@proj-alicization/stage-ui-three'
import { WidgetStage } from '@proj-alicization/stage-ui/components/scenes'
import { useAudioRecorder } from '@proj-alicization/stage-ui/composables/audio/audio-recorder'
import { useCanvasPixelIsTransparentAtPoint } from '@proj-alicization/stage-ui/composables/canvas-alpha'
import { useVAD } from '@proj-alicization/stage-ui/stores/ai/models/vad'
import { getAlicizationBridge, hasAlicizationBridge } from '@proj-alicization/stage-ui/stores/alicization-bridge'
import { useChatOrchestratorStore } from '@proj-alicization/stage-ui/stores/chat'
import { useDisplayModelsStore } from '@proj-alicization/stage-ui/stores/display-models'
import { useLive2d } from '@proj-alicization/stage-ui/stores/live2d'
import { useConsciousnessStore } from '@proj-alicization/stage-ui/stores/modules/consciousness'
import { useHearingSpeechInputPipeline } from '@proj-alicization/stage-ui/stores/modules/hearing'
import { useOnboardingStore } from '@proj-alicization/stage-ui/stores/onboarding'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { useSettings, useSettingsAudioDevice } from '@proj-alicization/stage-ui/stores/settings'
import { useStageDialogueStore } from '@proj-alicization/stage-ui/stores/stage-dialogue'
import { refDebounced, useFocusWithin } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue'

import ControlsIsland from '../components/stage-islands/controls-island/index.vue'
import ResourceStatusIsland from '../components/stage-islands/resource-status-island/index.vue'

import { electronMainStageStartupStatusChannel, electronOpenOnboarding } from '../../shared/eventa'
import { useControlsIslandStore } from '../stores/controls-island'
import { useStageThreeRuntimeDiagnosticsStore } from '../stores/stage-three-runtime-diagnostics'
import { useStageWindowLifecycleStore } from '../stores/stage-window-lifecycle'
import { useWindowStore } from '../stores/window'
import {
  dispatchDesktopVoiceTurn,
  resetDesktopLayoutState,
  resolveDesktopMouseCaptureState,
  runStageStartupOnboardingCheck,
} from './index.desktop'
import {
  buildRecentDrivingEventQueryInput,
  buildRecentDrivingTraceDetailsFromMindTurnEvents,
  buildRecentDrivingTraceEventsFromMindTurnEvents,
  buildRecentDrivingTraceRecordSummaryFromMemoryDecisionTraces,
  mapSpeechEmbodimentDiagnosticsForRenderer,
  resolveRecentDrivingEventFromMindTurnEvents,
} from './index.speech-embodiment-diagnostics'

const controlsIslandRef = ref<InstanceType<typeof ControlsIsland>>()
const widgetStageRef = ref<InstanceType<typeof WidgetStage>>()
const controlsIslandElement = computed(() => controlsIslandRef.value?.$el as HTMLElement | undefined)
const stageCanvas = toRef(() => widgetStageRef.value?.canvasElement())
const stageDialogueOverlay = toRef(() => widgetStageRef.value?.dialogueOverlayElement())
const componentStateStage = ref<'pending' | 'loading' | 'mounted'>('pending')

const isLoading = ref(true)

// NOTICE: Keep the stage surface visible by default.
// The previous fade-on-hover path can make the entire transparent desktop window
// appear as "fully disappeared" when hit-testing drifts.
const shouldFadeOnCursorWithin = ref(false)
const stageInteractionActive = ref(false)

void ResourceStatusIsland

const onboardingStore = useOnboardingStore()
const openOnboarding = useElectronEventaInvoke(electronOpenOnboarding)

const { isOutside: isOutsideWindow } = useElectronMouseInWindow()
const { isOutside } = useElectronMouseInElement(controlsIslandElement)
const { isOutside: isOutsideDialogueOverlay } = useElectronMouseInElement(stageDialogueOverlay)
const isOutsideFor250Ms = refDebounced(isOutside, 250)
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
const stageThreeRuntimeDiagnosticsStore = useStageThreeRuntimeDiagnosticsStore()
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
const stageRecoveryStepTimeoutMs = 6000
let lastStageStartupStatusState: 'stage-page-mounted' | 'stage-mounted' | 'stage-unmounted' | undefined

function resetDesktopLayout() {
  resetDesktopLayoutState({
    live2d: live2dStore,
    model: modelStore,
    stageDialogue: stageDialogueStore,
  })
}
watch(componentStateStage, () => isLoading.value = componentStateStage.value !== 'mounted', { immediate: true })

const hearingDialogOpen = computed(() => controlsIslandRef.value?.hearingDialogOpen ?? false)

function resolveDesktopCaptureStateNow() {
  const insideControls = !isOutsideFor250Ms.value
  const insideDialogueOverlay = !isOutsideDialogueOverlayFor250Ms.value || isDialogueOverlayFocused.value
  return resolveDesktopMouseCaptureState({
    fadeOnHoverEnabled: fadeOnHoverEnabled.value,
    hearingDialogOpen: hearingDialogOpen.value,
    insideControls,
    insideDialogueOverlay,
    insideStageRecoveryPanel: false,
    emergencyPanelHovered: false,
    isOutsideWindow: isOutsideWindow.value,
    stageCharacterHovered: stageCharacterHovered.value,
    stageInteractionActive: stageInteractionActive.value,
    stageCapturePixel: stageCapturePixel.value,
    stagePaused: stagePaused.value,
  })
}

function syncDesktopMouseCaptureState() {
  const { shouldCaptureMouse } = resolveDesktopCaptureStateNow()
  // Force-disable visual fade on the main stage until hover detection is fully stabilized.
  // This guarantees desktop controls and the stage container remain visible.
  shouldFadeOnCursorWithin.value = false

  const ignoreMouse = !shouldCaptureMouse
  void setIgnoreMouseEvents([ignoreMouse, { forward: ignoreMouse }]).catch((error: unknown) => {
    console.warn('[stage-startup-trace] failed to sync ignore mouse events', error)
  })
}

function createDrivingEventQueryKey(speechDiagnostics: ReturnType<typeof mapSpeechEmbodimentDiagnosticsForRenderer> | null) {
  if (!speechDiagnostics?.runtimeDynamics)
    return ''

  const runtimeDynamics = speechDiagnostics.runtimeDynamics
  return JSON.stringify([
    runtimeDynamics.variationToken ?? '',
    runtimeDynamics.provenance.runtimeChannel ?? '',
    runtimeDynamics.eventPointers.runtimeThreadId ?? '',
    runtimeDynamics.eventPointers.governorIntentionId ?? '',
    runtimeDynamics.eventPointers.focusBeliefId ?? '',
    runtimeDynamics.eventPointers.commitmentId ?? '',
  ])
}

let recentDrivingEventRequestRevision = 0
let lastDrivingEventQueryKey = ''

async function syncRecentDrivingEventFromMindTrace(
  speechDiagnostics: ReturnType<typeof mapSpeechEmbodimentDiagnosticsForRenderer> | null,
) {
  if (!speechDiagnostics?.runtimeDynamics) {
    stageThreeRuntimeDiagnosticsStore.setSpeechEmbodiment({
      ...(speechDiagnostics ?? mapSpeechEmbodimentDiagnosticsForRenderer(null)),
      recentDrivingEvent: null,
      recentDrivingTraceRecord: null,
    })
    return
  }

  if (!hasAlicizationBridge() || !getAlicizationBridge().listMindTurnEvents) {
    stageThreeRuntimeDiagnosticsStore.setSpeechEmbodiment({
      ...speechDiagnostics,
      recentDrivingEvent: null,
      recentDrivingTraceRecord: null,
    })
    return
  }

  const queryKey = createDrivingEventQueryKey(speechDiagnostics)
  if (!queryKey || queryKey === lastDrivingEventQueryKey)
    return

  lastDrivingEventQueryKey = queryKey
  const requestRevision = ++recentDrivingEventRequestRevision
  const bridge = getAlicizationBridge()
  const query = buildRecentDrivingEventQueryInput(speechDiagnostics)
  if (!query)
    return

  const events = await bridge.listMindTurnEvents!(query)
    .catch(() => [] as AlicizationMindTurnEventRecord[])

  if (requestRevision !== recentDrivingEventRequestRevision)
    return

  const recentDrivingEvent = resolveRecentDrivingEventFromMindTurnEvents(events)
  const recentDrivingTraceDecisionId = recentDrivingEvent?.decisionTraceId?.trim() || null
  const recentDrivingTraceRecords = recentDrivingTraceDecisionId && bridge.listMemoryDecisionTraces
    ? await bridge.listMemoryDecisionTraces({
        decisionTraceId: recentDrivingTraceDecisionId,
        limit: 12,
      }).catch(() => [])
    : []

  if (requestRevision !== recentDrivingEventRequestRevision)
    return

  stageThreeRuntimeDiagnosticsStore.setSpeechEmbodiment({
    ...speechDiagnostics,
    recentDrivingEvent,
    recentDrivingTraceRecord: buildRecentDrivingTraceRecordSummaryFromMemoryDecisionTraces(
      recentDrivingTraceRecords,
      recentDrivingTraceDecisionId,
    ),
    recentDrivingTraceEvents: buildRecentDrivingTraceEventsFromMindTurnEvents(
      events,
      recentDrivingEvent?.decisionTraceId ?? null,
    ),
    recentDrivingTraceDetails: buildRecentDrivingTraceDetailsFromMindTurnEvents(
      events,
      recentDrivingEvent?.decisionTraceId ?? null,
    ),
  })
}

watch([isOutsideFor250Ms, isOutsideDialogueOverlayFor250Ms, isDialogueOverlayFocused, isOutsideWindow, stageCapturePixel, stageCharacterHovered, hearingDialogOpen, fadeOnHoverEnabled, stagePaused, stageInteractionActive], () => {
  syncDesktopMouseCaptureState()
}, { immediate: true })

function emitStageStartupStatus(state: 'stage-page-mounted' | 'stage-mounted' | 'stage-unmounted') {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return

  if (lastStageStartupStatusState === state)
    return

  lastStageStartupStatusState = state
  const route = window.location.hash.replace(/^#/, '') || '/'
  document.documentElement.dataset.alicizationStagePageReady = route === '/' ? 'true' : 'false'
  document.documentElement.dataset.alicizationStageMounted = state === 'stage-mounted' ? 'true' : 'false'
  window.electron?.ipcRenderer?.send(electronMainStageStartupStatusChannel, {
    route,
    state,
    timestamp: Date.now(),
  })
}

watch(componentStateStage, (state) => {
  if (state === 'mounted') {
    emitStageStartupStatus('stage-mounted')
    return
  }

  emitStageStartupStatus('stage-unmounted')
}, { immediate: true })

watch(
  () => widgetStageRef.value?.embodimentDiagnostics?.speech ?? null,
  (speechDiagnostics) => {
    const mapped = mapSpeechEmbodimentDiagnosticsForRenderer(speechDiagnostics)
    stageThreeRuntimeDiagnosticsStore.setSpeechEmbodiment(mapped)
    void syncRecentDrivingEventFromMindTrace(mapped)
  },
  { immediate: true, deep: true },
)

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
const captionPoster = createLazyBroadcastPoster<CaptionChannelEvent>('airi-caption-overlay')

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

          captionPoster.post({ type: 'caption-speaker', text: finalText })

          void (async () => {
            try {
              const provider = await providersStore.getProviderInstance(activeChatProvider.value)
              if (!provider || !activeChatModel.value) {
                console.warn('[Main Page] No provider or model available, skipping chat send')
                return
              }

              console.info('[Main Page] Sending transcription to chat:', finalText)
              await dispatchDesktopVoiceTurn({
                text: finalText,
                providerId: activeChatProvider.value,
                model: activeChatModel.value,
                chatProvider: provider as ChatProvider,
                providerConfig: providersStore.getProviderConfig(activeChatProvider.value),
                origin: 'ui-user',
                ingest: chatStore.ingest,
              })
            }
            catch (err) {
              console.error('[Main Page] Failed to send chat from voice:', err)
            }
          })()
        },
        onSpeechEnd: (text) => {
          console.info('[Main Page] Speech ended, final text:', text)
          captionPoster.post({ type: 'caption-speaker', text })
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
      captionPoster.post({ type: 'caption-speaker', text })

      try {
        const provider = await providersStore.getProviderInstance(activeChatProvider.value)
        if (!provider || !activeChatModel.value)
          return

        await dispatchDesktopVoiceTurn({
          text,
          providerId: activeChatProvider.value,
          model: activeChatModel.value,
          chatProvider: provider as ChatProvider,
          providerConfig: providersStore.getProviderConfig(activeChatProvider.value),
          origin: 'ui-user',
          ingest: chatStore.ingest,
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

async function withStageRecoveryTimeout<T>(step: string, task: Promise<T>, timeoutMs = stageRecoveryStepTimeoutMs) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race<T>([
      task,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`[Main Page] ${step} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  }
  finally {
    if (timeoutHandle)
      clearTimeout(timeoutHandle)
  }
}

async function recoverStageLoading(reason: 'init' | 'watchdog') {
  if (stageLoadRecoveryInFlight.value)
    return

  stageLoadRecoveryInFlight.value = true

  try {
    await withStageRecoveryTimeout('ensureStageModelInitialized', ensureStageModelInitialized())
    // NOTICE: Always refresh the stage model directly from settings store.
    // Triggering live2d "shouldUpdateView" here can temporarily hide stage and
    // relies on async callbacks; direct refresh keeps recovery deterministic.
    await withStageRecoveryTimeout('settingsStore.updateStageModel', settingsStore.updateStageModel())

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
  emitStageStartupStatus('stage-page-mounted')
  syncDesktopMouseCaptureState()
  void recoverStageLoading('init')
  runStageStartupOnboardingCheck({
    initializeSetupCheck: () => onboardingStore.initializeSetupCheck(),
    get needsOnboarding() {
      return onboardingStore.needsOnboarding
    },
    openOnboarding,
  })
})

onUnmounted(() => {
  emitStageStartupStatus('stage-unmounted')
  captionPoster.close()
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
