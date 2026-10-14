<script setup lang="ts">
/*
  * - Extend OrbitControls from three
  * - Define camera behavior
*/

import type { VrmPostureFramingBounds } from '../../composables/vrm/daily-posture-framing'
import type { Vec3 } from '../../stores/model-store'

import { extend, useLoop, useTres } from '@tresjs/core'
import { until } from '@vueuse/core'
import {
  MOUSE,
  PerspectiveCamera,
  TOUCH,
  Vector3,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// From stage-ui-three package
import { onMounted, onUnmounted, shallowRef, toRefs, watch } from 'vue'

import { frameVrmPosture } from '../../composables/vrm/daily-posture-framing'

/*
  * Props:
  * - model size
  * - camera position
  * - camera target: camera looking at target
  * - camera fov angle
  * - camera distance: camera position - camera target
*/
const props = defineProps<{
  focusBounds?: VrmPostureFramingBounds | null
  controlEnable: boolean
  modelSize: Vec3
  cameraPosition: Vec3
  cameraTarget: Vec3
  cameraFOV: number
  cameraDistance: number
}>()
/*
  * Emits:
  * - camera changed: orbit controls can receive user input and change camera's position
  * - ready
*/
const emit = defineEmits<{
  (e: 'orbitControlsCameraChanged', value: {
    newCameraPosition: Vec3
    newCameraDistance: number
  }): void
  (e: 'orbitControlsReady'): void
}>()

const {
  controlEnable,
  modelSize,
  cameraPosition,
  cameraTarget,
  cameraFOV,
  cameraDistance,
} = toRefs(props)

extend({ OrbitControls })

const { camera: cameraTres, renderer } = useTres()
const controls = shallowRef<OrbitControls>()
const camera = shallowRef<PerspectiveCamera | null>(null)
let disposeControlsChange: (() => void) | undefined
let autoFrameActive = false
let automaticCameraChange = false
let userOwnsFraming = false
let userControlActive = false
watch(() => Boolean(props.focusBounds), () => {
  userOwnsFraming = false
})
const { onBeforeRender } = useLoop()
const stopAutoFrame = onBeforeRender(({ delta }) => {
  if (!camera.value || !controls.value)
    return
  if (userOwnsFraming)
    return
  const focus = props.focusBounds
  if (!focus && !autoFrameActive)
    return
  const frame = focus ? frameVrmPosture({ bounds: focus, position: props.cameraPosition, target: props.cameraTarget, fov: props.cameraFOV, aspect: camera.value.aspect }) : { position: new Vector3(props.cameraPosition.x, props.cameraPosition.y, props.cameraPosition.z), target: new Vector3(props.cameraTarget.x, props.cameraTarget.y, props.cameraTarget.z), distance: props.cameraDistance }
  autoFrameActive = Boolean(focus) || camera.value.position.distanceTo(frame.position) > 0.001 || controls.value.target.distanceTo(frame.target) > 0.001
  controls.value.maxDistance = Math.max(props.modelSize.z * 20, frame.distance * 1.1)
  const blend = 1 - Math.exp(-Math.min(0.1, Math.max(0, delta)) / 0.18)
  camera.value.position.lerp(frame.position, blend)
  controls.value.target.lerp(frame.target, blend)
  automaticCameraChange = true
  try {
    controls.value.update()
  }
  finally {
    automaticCameraChange = false
  }
  camera.value.updateMatrixWorld(true)
})

// Initialisation on onMounted
function registerInfoFlow() {
  /*
    * Downward info flow
    * - Pinia store value updated => command take effect
  */
  // Get mode size => update min/max camera distance
  watch(modelSize, (newSize) => {
    if (!controls.value)
      return
    controls.value.minDistance = newSize.z
    controls.value.maxDistance = newSize.z * 20
    controls.value.update()
  }, { immediate: true, deep: true })
  // Get camera position => update position
  watch(cameraPosition, (newPosition) => {
    if (!camera.value || !controls.value)
      return
    camera.value.position.set(
      newPosition.x,
      newPosition.y,
      newPosition.z,
    )
    camera.value.updateProjectionMatrix()
    controls.value.update()
  }, { immediate: true, deep: true })
  // Get camera target => update target (actually the model center)
  watch(cameraTarget, (newTarget) => {
    if (!controls.value)
      return
    controls.value.target.set(newTarget.x, newTarget.y, newTarget.z)
    controls.value.update()
  }, { immediate: true, deep: true })
  // Get fov => update camera fov
  watch(cameraFOV, (newFOV) => {
    if (!camera.value || !controls.value)
      return
    camera.value.fov = newFOV
    camera.value.updateProjectionMatrix()
    controls.value.update()
  }, { immediate: true })
  // Get camera distance => update camera distance
  watch(cameraDistance, (newDistance) => {
    if (!camera.value || !controls.value)
      return
    const newPosition = new Vector3()
    const target = controls.value.target
    const direction = new Vector3().subVectors(camera.value.position, target).normalize()
    newPosition.copy(target).addScaledVector(direction, newDistance)
    camera.value.position.set(
      newPosition.x,
      newPosition.y,
      newPosition.z,
    )
    camera.value.updateProjectionMatrix()
    controls.value.update()
  })
  watch(controlEnable, (newEnable) => {
    if (!camera.value || !controls.value)
      return
    controls.value.enableRotate = newEnable
    controls.value.enableZoom = newEnable
  }, { immediate: true })

  /*
    * Upward info flow
    * - Emit info => update pinia store
  */
  // send camera update info
  const onChange = () => {
    if (automaticCameraChange || !userControlActive || !controlEnable.value || !camera.value || !controls.value)
      return

    emit(
      'orbitControlsCameraChanged',
      {
        newCameraPosition: {
          x: camera.value.position.x,
          y: camera.value.position.y,
          z: camera.value.position.z,
        },
        newCameraDistance: controls.value.getDistance(),
      },
    )
  }

  disposeControlsChange?.()
  const onUserControl = () => {
    userOwnsFraming = true
    userControlActive = true
  }
  const onUserControlEnd = () => {
    userControlActive = false
  }
  controls.value?.addEventListener('change', onChange)
  controls.value?.addEventListener('start', onUserControl)
  controls.value?.addEventListener('end', onUserControlEnd)
  disposeControlsChange = () => {
    controls.value?.removeEventListener('change', onChange)
    controls.value?.removeEventListener('start', onUserControl)
    controls.value?.removeEventListener('end', onUserControlEnd)
  }
}

onMounted(async () => {
  // wait until camera is not undefined
  await until(() => Boolean(cameraTres.value) && Boolean(renderer.domElement)).toBe(true)
  if (!cameraTres.value || !renderer.domElement) {
    console.warn('Camera or Renderer initialisation failure!')
    return
  }
  // Narrow down the camera's type
  if (!(cameraTres.value instanceof PerspectiveCamera)) {
    console.warn('Camera is not perspective camera, type error!')
    return
  }
  camera.value = cameraTres.value as PerspectiveCamera
  // Obtain orbitControl instance
  controls.value = new OrbitControls(camera.value, renderer.domElement)
  controls.value.enablePan = false
  controls.value.enableZoom = false
  controls.value.enableRotate = false
  // Align to tresjs conventions
  controls.value.mouseButtons = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  }
  controls.value.touches = {
    ONE: TOUCH.ROTATE,
    TWO: TOUCH.DOLLY_PAN,
  }

  // define watch props and emit
  registerInfoFlow()
  controls.value.update()

  emit('orbitControlsReady')
})

onUnmounted(() => {
  stopAutoFrame.off()
  disposeControlsChange?.()
  disposeControlsChange = undefined
  controls.value?.dispose()
  controls.value = undefined
  camera.value = null
})

defineExpose({
  controls,
  getDistance: () => controls.value?.getDistance(),
  update: () => controls.value?.update(),
  setTarget: (target: { x: number, y: number, z: number }) => {
    if (controls.value) {
      controls.value.target.set(target.x, target.y, target.z)
      controls.value.update()
    }
  },
})
</script>

<template>
  <slot />
</template>
