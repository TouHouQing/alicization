<script setup lang="ts">
import type { PerceptionState, VrmPoseTargets } from '@proj-alicization/model-driver-mediapipe'
import type { Vector3Like } from 'three'

import { createMediaPipeBackend, createMocapEngine, createVrmPoseApplier, drawOverlay, poseToVrmTargets } from '@proj-alicization/model-driver-mediapipe'
import { ThreeScene } from '@proj-alicization/stage-ui-three'
import { animations } from '@proj-alicization/stage-ui-three/assets/vrm'
import { useSettings } from '@proj-alicization/stage-ui/stores/settings'
import { Checkbox } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const status = ref<'idle' | 'starting' | 'running' | 'error'>('idle')
const errorMessage = ref('')
const pipelineEnabled = ref(true)
const syncingToggleState = ref(false)
const ignoreErrorsUntil = ref(0)

const videoRef = ref<HTMLVideoElement>()
const canvasRef = ref<HTMLCanvasElement>()
const sceneRef = ref<InstanceType<typeof ThreeScene>>()
let stream: MediaStream | undefined
let engine: ReturnType<typeof createMocapEngine> | undefined

// config on the page
const config = ref({
  enabled: {
    pose: true,
    hands: true,
    face: true,
  },
  hz: {
    pose: 30,
    hands: 30,
    face: 30,
  },
  maxPeople: 1 as const, // Fixed to 1 for simplicity
})

const vrmMapping = ref({
  flipX: true,
  flipY: true,
  flipZ: false,
})

const poseFiltering = ref({
  minVisibility: 0.5,
})
const { t } = useI18n()
const statusLabel = computed(() => {
  return t(`settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.states.${status.value}`)
})

// MediaPipe assets config
const latestState = ref<PerceptionState>()
const latestPoseTargets = ref<VrmPoseTargets>()
const prevPoseTargets = ref<VrmPoseTargets>()
const prevPoseForward = ref<Vector3Like>()

// VRM pose applier
const vrmPoseApplier = createVrmPoseApplier({ alpha: 1 })
function onVrmFrame(vrm: Parameters<typeof vrmPoseApplier.applyPoseDirectionsToVrm>[0]) {
  const targets = latestPoseTargets.value
  if (!targets)
    return
  vrmPoseApplier.applyPoseTargetsToVrm(vrm, targets)
}
const vrmFrameHook = (vrm: Parameters<typeof vrmPoseApplier.applyPoseDirectionsToVrm>[0]) => onVrmFrame(vrm)

const settingsStore = useSettings()
const { stageModelRenderer, stageModelSelected, stageModelSelectedUrl, stageViewControlsEnabled } = storeToRefs(settingsStore)

// Snapshot summary of the running state
const summary = computed(() => {
  const enabled = Object.entries(config.value.enabled)
    .filter(([, v]) => v)
    .map(([key]) => t(`settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.summary.features.${key}`))
    .join(', ') || t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.summary.features.none')

  const fps = latestState.value?.quality.fps
  const latency = latestState.value?.quality.latencyMs
  const dropped = latestState.value?.quality.droppedFrames

  return [
    t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.summary.enabled', { value: enabled }),
    t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.summary.hz', {
      pose: config.value.hz.pose,
      hands: config.value.hz.hands,
      face: config.value.hz.face,
    }),
    fps != null ? t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.summary.fps', { value: fps.toFixed(1) }) : null,
    latency != null ? t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.summary.latency', { value: latency.toFixed(1) }) : null,
    dropped != null ? t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.summary.dropped', { value: dropped }) : null,
  ].filter(Boolean).join(' | ')
})

const poseVisibilityDebug = computed(() => {
  const pose = latestState.value?.pose
  const lm = pose?.landmarks2d
  const world = pose?.worldLandmarks
  if (!lm?.length)
    return t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.pose_debug.empty')

  const pick = (i: number) => {
    const v = lm[i]?.visibility
    return v == null || !Number.isFinite(v) ? 'na' : v.toFixed(2)
  }

  const withVis = lm.filter(p => p.visibility != null && Number.isFinite(p.visibility)).length
  const worldWithVis = world?.filter(p => p.visibility != null && Number.isFinite(p.visibility)).length ?? 0
  return [
    t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.pose_debug.vis_2d', { visible: withVis, total: lm.length }),
    t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.pose_debug.vis_3d', { visible: worldWithVis, total: world?.length ?? 0 }),
    t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.pose_debug.shoulders_elbows', {
      ls: pick(11),
      rs: pick(12),
      le: pick(13),
      re: pick(14),
    }),
    t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.pose_debug.wrists_hips', {
      lw: pick(15),
      rw: pick(16),
      lh: pick(23),
      rh: pick(24),
    }),
  ].join(' | ')
})

// Start camera and pipeline
async function startCamera() {
  if (status.value === 'starting' || status.value === 'running')
    return

  status.value = 'starting'
  errorMessage.value = ''

  try {
    stop()
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    if (!videoRef.value)
      throw new Error('video element not mounted')

    videoRef.value.srcObject = stream
    await videoRef.value.play()

    status.value = 'running'
    await startPipeline()
  }
  catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof Error ? err.message : String(err)
    console.error('Failed to start camera or pipeline:', err)

    syncingToggleState.value = true
    pipelineEnabled.value = false
    syncingToggleState.value = false
  }
}

async function startPipeline() {
  if (!videoRef.value)
    return
  if (engine)
    return

  const backend = createMediaPipeBackend()
  engine = createMocapEngine(backend, toRaw(config.value))
  await engine.init()

  engine.start(
    { getFrame: () => videoRef.value as HTMLVideoElement },
    (state) => {
      latestState.value = state
      const axis = {
        x: vrmMapping.value.flipX ? -1 : 1,
        y: vrmMapping.value.flipY ? -1 : 1,
        z: vrmMapping.value.flipZ ? -1 : 1,
      } as const

      const poseTargets = (config.value.enabled.pose && state.pose?.worldLandmarks?.length)
        ? poseToVrmTargets(state.pose, {
            axis,
            confidence: { minVisibility: poseFiltering.value.minVisibility },
            stabilize: {
              previousTargets: prevPoseTargets.value,
              previousForward: prevPoseForward.value,
            },
          })
        : {}

      const hasAny = Object.keys(poseTargets).length > 0
      latestPoseTargets.value = hasAny ? poseTargets : undefined
      if (hasAny) {
        prevPoseTargets.value = poseTargets
        const derivedForward = poseTargets.hips?.pole ?? poseTargets.spine?.pole
        if (derivedForward)
          prevPoseForward.value = derivedForward
      }

      const canvas = canvasRef.value
      const video = videoRef.value
      if (!canvas || !video)
        return

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      if (canvas.width !== w)
        canvas.width = w
      if (canvas.height !== h)
        canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx)
        return

      drawOverlay(ctx, state, config.value.enabled)
    },
    {
      onError: (err) => {
        if (!pipelineEnabled.value || Date.now() < ignoreErrorsUntil.value) {
          console.warn('Ignored pipeline error during stop:', err)
          return
        }

        errorMessage.value = err instanceof Error ? err.message : String(err)
        // Ensure resources are released, but keep the error status visible.
        stop()
        status.value = 'error'
        console.error('Pipeline error:', err)
      },
    },
  )
}

function stopPipeline() {
  engine?.stop()
  engine = undefined
  latestState.value = undefined
  latestPoseTargets.value = undefined
  prevPoseTargets.value = undefined
  prevPoseForward.value = undefined
}

function stop() {
  // During stop, MediaPipe may still be processing an in-flight frame; ignore transient errors.
  ignoreErrorsUntil.value = Date.now() + 1500
  canvasRef.value?.getContext('2d')?.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  stopPipeline()

  try {
    stream?.getTracks().forEach(t => t.stop())
  }
  catch {}

  stream = undefined

  if (videoRef.value)
    videoRef.value.srcObject = null

  status.value = 'idle'
}

watch(config, (val) => {
  engine?.updateConfig(toRaw(val))
}, { deep: true })

watch(sceneRef, (scene, prev) => {
  prev?.setVrmFrameHook(undefined)
  scene?.setVrmFrameHook(vrmFrameHook)
}, { immediate: true })

watch(pipelineEnabled, async (enabled) => {
  if (syncingToggleState.value)
    return

  if (enabled)
    await startCamera()
  else
    stop()
})

onMounted(() => {
  // Ensure a VRM model is selected for the viewer (preserve existing selection if already VRM).
  const needsFallback = !stageModelSelectedUrl.value || stageModelRenderer.value !== 'vrm'
  if (needsFallback)
    stageModelSelected.value = 'preset-vrm-1'

  settingsStore.updateStageModel().catch((err) => {
    console.error('Failed to init VRM model:', err)
  })

  // Autostart for convenience
  if (pipelineEnabled.value)
    startCamera()
})

onUnmounted(() => {
  sceneRef.value?.setVrmFrameHook(undefined)
  stop()
})
</script>

<template>
  <div :class="['p-4', 'space-y-4']">
    <div>
      <div :class="['text-lg', 'font-600']">
        {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.page_title') }}
      </div>
    </div>

    <!-- Top config -->
    <div :class="['rounded-2xl', 'border', 'border-neutral-300/40', 'dark:border-neutral-700/40', 'p-3', 'space-y-3']">
      <div :class="['flex', 'items-start', 'justify-between', 'gap-3', 'flex-wrap']">
        <div :class="['space-y-1']">
          <div :class="['font-600']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.sections.config') }}
          </div>
          <div :class="['text-xs', 'text-neutral-500']">
            {{ summary }}
          </div>
        </div>

        <label :class="['flex', 'items-center', 'gap-3']">
          <div :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
            {{ pipelineEnabled
              ? t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.status.running')
              : t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.status.stopped') }}
          </div>
          <Checkbox v-model="pipelineEnabled" />
        </label>
      </div>

      <div :class="['grid', 'gap-3', 'lg:grid-cols-3']">
        <div :class="['flex', 'items-center', 'justify-between', 'gap-3']">
          <label :class="['flex', 'items-center', 'gap-2', 'text-sm']">
            <input v-model="config.enabled.pose" type="checkbox">
            {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.features.pose') }}
          </label>
          <label :class="['flex', 'items-center', 'gap-2']">
            <div :class="['text-xs', 'text-neutral-500']">
              {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.hz') }}
            </div>
            <input
              v-model.number="config.hz.pose"
              type="number"
              min="1"
              max="60"
              :class="['w-24', 'rounded-lg', 'border', 'border-neutral-300/60', 'bg-white', 'px-2', 'py-1', 'text-sm', 'dark:bg-neutral-900/60', 'dark:border-neutral-700/60']"
            >
          </label>
        </div>

        <div :class="['flex', 'items-center', 'justify-between', 'gap-3']">
          <label :class="['flex', 'items-center', 'gap-2', 'text-sm']">
            <input v-model="config.enabled.hands" type="checkbox">
            {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.features.hands') }}
          </label>
          <label :class="['flex', 'items-center', 'gap-2']">
            <div :class="['text-xs', 'text-neutral-500']">
              {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.hz') }}
            </div>
            <input
              v-model.number="config.hz.hands"
              type="number"
              min="1"
              max="60"
              :class="['w-24', 'rounded-lg', 'border', 'border-neutral-300/60', 'bg-white', 'px-2', 'py-1', 'text-sm', 'dark:bg-neutral-900/60', 'dark:border-neutral-700/60']"
            >
          </label>
        </div>

        <div :class="['flex', 'items-center', 'justify-between', 'gap-3']">
          <label :class="['flex', 'items-center', 'gap-2', 'text-sm']">
            <input v-model="config.enabled.face" type="checkbox">
            {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.features.face') }}
          </label>
          <label :class="['flex', 'items-center', 'gap-2']">
            <div :class="['text-xs', 'text-neutral-500']">
              {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.hz') }}
            </div>
            <input
              v-model.number="config.hz.face"
              type="number"
              min="1"
              max="60"
              :class="['w-24', 'rounded-lg', 'border', 'border-neutral-300/60', 'bg-white', 'px-2', 'py-1', 'text-sm', 'dark:bg-neutral-900/60', 'dark:border-neutral-700/60']"
            >
          </label>
        </div>
      </div>

      <div :class="['flex', 'items-center', 'justify-between', 'gap-4', 'flex-wrap']">
        <div :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
          {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.sections.vrm_mapping') }}
        </div>
        <div :class="['flex', 'items-center', 'gap-6', 'flex-wrap']">
          <label :class="['flex', 'items-center', 'gap-3']">
            <div :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.mapping.flip_x') }}
            </div>
            <Checkbox v-model="vrmMapping.flipX" />
          </label>
          <label :class="['flex', 'items-center', 'gap-3']">
            <div :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.mapping.flip_y') }}
            </div>
            <Checkbox v-model="vrmMapping.flipY" />
          </label>
          <label :class="['flex', 'items-center', 'gap-3']">
            <div :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.mapping.flip_z') }}
            </div>
            <Checkbox v-model="vrmMapping.flipZ" />
          </label>
        </div>
      </div>

      <div :class="['flex', 'items-center', 'justify-between', 'gap-4', 'flex-wrap']">
        <div :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
          {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.sections.pose_filtering') }}
        </div>
        <label :class="['flex', 'items-center', 'gap-3']">
          <div :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.pose_filtering.min_visibility') }}
          </div>
          <input
            v-model.number="poseFiltering.minVisibility"
            type="number"
            min="0"
            max="1"
            step="0.05"
            :class="['w-24', 'rounded-lg', 'border', 'border-neutral-300/60', 'bg-white', 'px-2', 'py-1', 'text-sm', 'dark:bg-neutral-900/60', 'dark:border-neutral-700/60']"
          >
        </label>
      </div>

      <div :class="['text-xs', 'text-neutral-500']">
        {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.note') }}
      </div>
      <div :class="['text-xs', 'text-neutral-500', 'break-words']">
        {{ poseVisibilityDebug }}
      </div>
    </div>

    <!-- Main: camera + VRM -->
    <div :class="['grid', 'gap-4', 'lg:grid-cols-2']">
      <div :class="['rounded-2xl', 'border', 'border-neutral-300/40', 'dark:border-neutral-700/40', 'overflow-hidden']">
        <div :class="['relative', 'aspect-video', 'bg-black']">
          <video
            ref="videoRef"
            muted
            playsinline
            :class="['absolute', 'inset-0', 'h-full', 'w-full', 'object-cover', 'opacity-70']"
          />
          <canvas
            ref="canvasRef"
            :class="['absolute', 'inset-0', 'h-full', 'w-full', 'object-cover', 'opacity-70']"
          />

          <div
            :class="[
              'absolute',
              'left-3',
              'top-3',
              'rounded-lg',
              'bg-black/50',
              'px-2',
              'py-1',
              'text-xs',
              'text-white',
              'backdrop-blur',
            ]"
          >
            <div>{{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.overlay.status', { value: statusLabel }) }}</div>
            <div v-if="status === 'error'" :class="['text-red-300']">
              {{ errorMessage }}
            </div>
          </div>
        </div>
      </div>

      <div :class="['rounded-2xl', 'border', 'border-neutral-300/40', 'dark:border-neutral-700/40', 'overflow-hidden']">
        <div :class="['h-full', 'min-h-80']">
          <ThreeScene
            v-if="stageModelRenderer === 'vrm'"
            ref="sceneRef"
            :model-src="stageModelSelectedUrl"
            :idle-animation="animations.idleLoop.toString()"
            :show-axes="stageViewControlsEnabled"
            :paused="false"
            @error="console.error"
          />
          <div v-else :class="['p-4', 'text-sm', 'text-red-500']">
            {{ t('settings.pages.system.sections.section.developer.sections.section.model-driver-mediapipe.unsupported_model') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: plain
</route>
