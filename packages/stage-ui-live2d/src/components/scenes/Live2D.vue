<script setup lang="ts">
import type {
  StageEmbodimentIdleMotionPreference,
  StageEmbodimentPerformanceState,
  StageEmbodimentPresencePostureState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'

import type { Live2DActionPulseBinding } from '../../composables/live2d'

import { useWindowSize } from '@vueuse/core'
import { onBeforeMount, onErrorCaptured, onMounted, ref, watch } from 'vue'

import Live2DCanvas from './live2d/Canvas.vue'
import Live2DModel from './live2d/Model.vue'

import '../../utils/live2d-zip-loader'
import '../../utils/live2d-opfs-registration'

withDefaults(defineProps<{
  modelSrc?: string
  modelId?: string

  paused?: boolean
  actionBindings?: Live2DActionPulseBinding[]
  idleMotionPreference?: StageEmbodimentIdleMotionPreference | null
  performanceState?: StageEmbodimentPerformanceState | null
  presencePosture?: StageEmbodimentPresencePostureState | null
  speechRenderState?: StageEmbodimentSpeechRenderState | null
  focusAt?: { x: number, y: number }
  disableFocusAt?: boolean
  xOffset?: number | string
  yOffset?: number | string
  scale?: number
  themeColorsHue?: number
  themeColorsHueDynamic?: boolean
  live2dIdleAnimationEnabled?: boolean
  live2dAutoBlinkEnabled?: boolean
  live2dForceAutoBlinkEnabled?: boolean
  live2dShadowEnabled?: boolean
  live2dMaxFps?: number
}>(), {
  paused: false,
  focusAt: () => ({ x: 0, y: 0 }),
  xOffset: 0,
  yOffset: 0,
  scale: 1,
  themeColorsHue: 220.44,
  themeColorsHueDynamic: false,
  live2dIdleAnimationEnabled: true,
  live2dAutoBlinkEnabled: true,
  live2dForceAutoBlinkEnabled: false,
  live2dShadowEnabled: true,
  live2dMaxFps: 0,
})

const emits = defineEmits<{
  (e: 'characterHoverChange', hovered: boolean): void
}>()

console.info('[stage-startup-trace][live2d-scene] setup-start')

onErrorCaptured((error, instance, info) => {
  console.error('[stage-startup-trace][live2d-scene] captured-error', {
    info,
    component: instance?.$?.type,
    error,
  })
})

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })
const componentStateCanvas = defineModel<'pending' | 'loading' | 'mounted'>('canvasState', { default: 'pending' })
const componentStateModel = defineModel<'pending' | 'loading' | 'mounted'>('modelState', { default: 'pending' })
const { width: viewportWidth, height: viewportHeight } = useWindowSize()

const live2dCanvasRef = ref<InstanceType<typeof Live2DCanvas>>()
const live2dModelRef = ref<{
  characterFrame: () => {
    left: number
    right: number
    top: number
    bottom: number
    centerX: number
    anchorY: number
  } | null
  dragAnchorClientPoint: () => {
    x: number
    y: number
  } | null
  hitTestClientPoint: (clientX: number, clientY: number) => boolean
}>()

watch([componentStateModel, componentStateCanvas], () => {
  componentState.value = (componentStateModel.value === 'mounted' && componentStateCanvas.value === 'mounted')
    ? 'mounted'
    : 'loading'
})

watch(componentState, (state) => {
  console.info(`[stage-startup-trace][live2d-scene] component-state state=${state}`)
}, { immediate: true })

onMounted(() => {
  console.info('[stage-startup-trace][live2d-scene] onMounted')
})

onBeforeMount(() => {
  console.info('[stage-startup-trace][live2d-scene] onBeforeMount')
})

defineExpose({
  canvasElement: () => {
    return live2dCanvasRef.value?.canvasElement()
  },
  characterFrame: () => {
    return live2dModelRef.value?.characterFrame()
  },
  dragAnchorClientPoint: () => {
    return live2dModelRef.value?.dragAnchorClientPoint() ?? null
  },
  hitTestClientPoint: (clientX: number, clientY: number) => {
    return live2dModelRef.value?.hitTestClientPoint(clientX, clientY) ?? false
  },
})
</script>

<template>
  <div relative h-full w-full>
    <Live2DCanvas
      ref="live2dCanvasRef"
      v-slot="{ app }"
      v-model:state="componentStateCanvas"
      :width="viewportWidth"
      :height="viewportHeight"
      :resolution="2"
      :max-fps="live2dMaxFps"
      max-h="100dvh"
    >
      <Live2DModel
        ref="live2dModelRef"
        v-model:state="componentStateModel"
        :model-src="modelSrc"
        :model-id="modelId"
        :app="app"
        :action-bindings="actionBindings"
        :idle-motion-preference="idleMotionPreference"
        :performance-state="performanceState"
        :presence-posture="presencePosture"
        :speech-render-state="speechRenderState"
        :width="viewportWidth"
        :height="viewportHeight"
        :paused="paused"
        :focus-at="focusAt"
        :x-offset="xOffset"
        :y-offset="yOffset"
        :scale="scale"
        :disable-focus-at="disableFocusAt"
        :theme-colors-hue="themeColorsHue"
        :theme-colors-hue-dynamic="themeColorsHueDynamic"
        :live2d-idle-animation-enabled="live2dIdleAnimationEnabled"
        :live2d-auto-blink-enabled="live2dAutoBlinkEnabled"
        :live2d-force-auto-blink-enabled="live2dForceAutoBlinkEnabled"
        :live2d-shadow-enabled="live2dShadowEnabled"
        @character-hover-change="emits('characterHoverChange', $event)"
      />
    </Live2DCanvas>
  </div>
</template>
