<script setup lang="ts">
import type { Application } from '@pixi/app'
import type {
  StageEmbodimentIdleMotionPreference,
  StageEmbodimentPerformanceState,
  StageEmbodimentPresencePostureState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { Cubism4InternalModel } from 'pixi-live2d-display/cubism4'

import type { Live2DActionPulseBinding, PixiLive2DInternalModel } from '../../../composables/live2d'

import { listenBeatSyncBeatSignal } from '@proj-alicization/stage-shared/beat-sync'
import { useTheme } from '@proj-alicization/ui'
import { breakpointsTailwind, until, useBreakpoints, useDebounceFn } from '@vueuse/core'
import { formatHex } from 'culori'
import { Mutex } from 'es-toolkit'
import { storeToRefs } from 'pinia'
import { DropShadowFilter } from 'pixi-filters'
import { Live2DFactory, Live2DModel, MotionPriority } from 'pixi-live2d-display/cubism4'
import { computed, onBeforeMount, onErrorCaptured, onMounted, onUnmounted, ref, shallowRef, toRef, watch } from 'vue'

import { createBeatSyncController, resolveLive2DActionPulseBinding, useLive2DMotionManagerUpdate, useMotionUpdatePluginAutoEyeBlink, useMotionUpdatePluginBeatSync, useMotionUpdatePluginIdleDisable, useMotionUpdatePluginIdleFocus, useMotionUpdatePluginPerformanceLayers } from '../../../composables/live2d'
import { Emotion, EmotionNeutralMotionName } from '../../../constants/emotions'
import { useLive2d } from '../../../stores/live2d'

const props = withDefaults(defineProps<{
  modelSrc?: string
  modelId?: string

  app?: Application
  actionBindings?: Live2DActionPulseBinding[]
  idleMotionPreference?: StageEmbodimentIdleMotionPreference | null
  performanceState?: StageEmbodimentPerformanceState | null
  presencePosture?: StageEmbodimentPresencePostureState | null
  speechRenderState?: StageEmbodimentSpeechRenderState | null
  width: number
  height: number
  paused?: boolean
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
}>(), {
  paused: false,
  focusAt: () => ({ x: 0, y: 0 }),
  disableFocusAt: false,
  scale: 1,
  themeColorsHue: 220.44,
  themeColorsHueDynamic: false,
  live2dIdleAnimationEnabled: true,
  live2dAutoBlinkEnabled: true,
  live2dForceAutoBlinkEnabled: false,
  live2dShadowEnabled: true,
})

const emits = defineEmits<{
  (e: 'modelLoaded'): void
  (e: 'error', error: Error): void
  (e: 'characterHoverChange', hovered: boolean): void
}>()

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

console.info('[stage-startup-trace][live2d-model] setup-start')

onErrorCaptured((error, instance, info) => {
  console.error('[stage-startup-trace][live2d-model] captured-error', {
    info,
    component: instance?.$?.type,
    error,
  })
})

function parsePropsOffset() {
  let xOffset = Number.parseFloat(String(props.xOffset)) || 0
  let yOffset = Number.parseFloat(String(props.yOffset)) || 0

  if (String(props.xOffset).endsWith('%')) {
    xOffset = (Number.parseFloat(String(props.xOffset).replace('%', '')) / 100) * props.width
  }
  if (String(props.yOffset).endsWith('%')) {
    yOffset = (Number.parseFloat(String(props.yOffset).replace('%', '')) / 100) * props.height
  }

  return {
    xOffset,
    yOffset,
  }
}

const modelSrcRef = toRef(() => props.modelSrc)

const modelLoading = ref(false)
// NOTICE: boolean is sufficient; this flag is only used inside loadModel to bail out if the component unmounts mid-load.
let isUnmounted = false

const modelLoadMutex = new Mutex()

const offset = computed(() => parsePropsOffset())

const pixiApp = toRef(() => props.app)
const paused = toRef(() => props.paused)
const focusAt = toRef(() => props.focusAt)
const model = ref<Live2DModel<PixiLive2DInternalModel>>()
const initialModelWidth = ref<number>(0)
const initialModelHeight = ref<number>(0)
const lastUpdateTime = ref(0)

const { isDark: dark } = useTheme()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = computed(() => breakpoints.between('sm', 'md').value || breakpoints.smaller('sm').value)
const dropShadowFilter = shallowRef(new DropShadowFilter({
  alpha: 0.2,
  blur: 0,
  distance: 20,
  rotation: 45,
}))
type Live2DCoreModel = Cubism4InternalModel['coreModel']
interface MotionSelection { group: string, index: number }
type MotionManagerLike = NonNullable<PixiLive2DInternalModel['motionManager']>

function getInternalModel() {
  return model.value?.internalModel as (PixiLive2DInternalModel & { coreModel: Live2DCoreModel }) | undefined
}

function getCoreModel() {
  return getInternalModel()?.coreModel
}

function updateCoreModelParameter(parameterId: string, value: number) {
  const coreModel = getCoreModel()
  if (!coreModel)
    return

  coreModel.setParameterValueById(parameterId, value)
}

function setScaleAndPosition() {
  if (!model.value)
    return

  let offsetFactor = 2.2
  if (isMobile.value) {
    offsetFactor = 2.2
  }

  const heightScale = (props.height * 0.95 / initialModelHeight.value * offsetFactor)
  const widthScale = (props.width * 0.95 / initialModelWidth.value * offsetFactor)
  let scale = Math.min(heightScale, widthScale)

  // Prevent zero or NaN values to fix the "headless" model issue.
  if (Number.isNaN(scale) || scale <= 0) {
    scale = 1e-6
  }

  model.value.scale.set(scale * props.scale, scale * props.scale)

  model.value.x = (props.width / 2) + offset.value.xOffset
  model.value.y = props.height + offset.value.yOffset
}

const live2dStore = useLive2d()
const {
  currentMotion,
  availableMotions,
  motionMap,
  modelParameters,
} = storeToRefs(live2dStore)
const { setAvailableMotionsForModel } = live2dStore

const themeColorsHue = toRef(() => props.themeColorsHue)
const themeColorsHueDynamic = toRef(() => props.themeColorsHueDynamic)
const live2dIdleAnimationEnabled = toRef(() => props.live2dIdleAnimationEnabled)
const live2dAutoBlinkEnabled = toRef(() => props.live2dAutoBlinkEnabled)
const live2dForceAutoBlinkEnabled = toRef(() => props.live2dForceAutoBlinkEnabled)
const live2dShadowEnabled = toRef(() => props.live2dShadowEnabled)
const live2dPerformanceState = toRef(() => props.performanceState)
const live2dPresencePosture = toRef(() => props.presencePosture)
const live2dSpeechRenderState = toRef(() => props.speechRenderState)

const localCurrentMotion = ref<MotionSelection>({ group: 'Idle', index: 0 })
const characterHovered = ref(false)
let motionRequestId = 0
let lastMotionRequestKey = ''
let inFlightMotionRequestKey = ''
const lastAppliedActionPulseRevision = ref(0)
const preferredIdleMotionSelection = computed<MotionSelection | null>(() => {
  if (props.idleMotionPreference) {
    return {
      group: props.idleMotionPreference.motionName,
      index: props.idleMotionPreference.motionIndex,
    }
  }

  const selectedMotionGroup = localStorage.getItem('selected-runtime-motion-group')
  const selectedMotionIndex = localStorage.getItem('selected-runtime-motion-index')
  if (selectedMotionGroup === null || !selectedMotionIndex)
    return null

  const parsedIndex = Number.parseInt(selectedMotionIndex, 10)
  if (!Number.isFinite(parsedIndex))
    return null

  return {
    group: selectedMotionGroup,
    index: parsedIndex,
  }
})
const preferredIdleMotionKey = computed(() => buildMotionKey(preferredIdleMotionSelection.value))
const beatSync = createBeatSyncController({
  baseAngles: () => ({
    x: modelParameters.value.angleX,
    y: modelParameters.value.angleY,
    z: modelParameters.value.angleZ,
  }),
  initialStyle: 'sway-sine',
})

function buildMotionKey(selection: { group?: string | null, index?: number | null } | null | undefined) {
  const group = typeof selection?.group === 'string' ? selection.group.trim() : ''
  const index = Number.isFinite(selection?.index) ? Math.max(0, Math.floor(Number(selection?.index))) : Number.NaN
  if (!group || !Number.isFinite(index))
    return ''

  return `${group}:${index}`
}

function buildMotionRequestKey(motionName: string, motionIndex?: number) {
  const group = motionName.trim()
  if (!group)
    return ''

  if (!Number.isFinite(motionIndex))
    return `${group}:*`

  return `${group}:${Math.max(0, Math.floor(Number(motionIndex)))}`
}

function configureLoopingMotion(motionManager: MotionManagerLike | undefined, selection: MotionSelection | null) {
  if (!motionManager || !selection)
    return

  const groupIndex = (motionManager.groups as Record<string, any>)[selection.group]
  if (groupIndex === undefined || !motionManager.motionGroups[groupIndex])
    return

  const motion = motionManager.motionGroups[groupIndex][selection.index]
  if (!motion?._looper)
    return

  motion._looper.loopDuration = 0
}

function requestIdleMotionRestart(options: {
  force?: boolean
  reason: string
}) {
  if (!model.value)
    return false
  if (!live2dIdleAnimationEnabled.value)
    return false

  const target = preferredIdleMotionSelection.value
  if (!target)
    return false

  const currentKey = buildMotionKey(localCurrentMotion.value)
  const targetKey = buildMotionKey(target)
  if (!options.force && currentKey === targetKey)
    return false

  configureLoopingMotion(getInternalModel()?.motionManager as MotionManagerLike | undefined, target)
  requestAnimationFrame(() => {
    currentMotion.value = {
      group: target.group,
      index: target.index,
    }
  })
  return true
}

// Listen for model reload requests (e.g., when runtime motion is uploaded)
const disposeShouldUpdateView = live2dStore.onShouldUpdateView(() => {
  loadModel()
})

async function loadModel() {
  await until(modelLoading).not.toBeTruthy()

  await modelLoadMutex.acquire()
  let modelLoadSucceeded = false
  try {
    modelLoading.value = true
    componentState.value = 'loading'
    motionRequestId += 1
    lastMotionRequestKey = ''
    inFlightMotionRequestKey = ''

    if (!pixiApp.value || !pixiApp.value.stage) {
      try {
        // NOTICE: shouldUpdateView can fire while the canvas (pixiApp) is being torn down/recreated.
        // Wait briefly for the new stage instead of bailing out, otherwise we keep a blank screen.
        await until(() => !!pixiApp.value && !!pixiApp.value.stage).toBeTruthy({ timeout: 1500 })
      }
      catch {
        return
      }
    }

    // REVIEW: here as await until(...) guarded the pixiApp and stage to be valid.
    if (model.value && pixiApp.value?.stage) {
      try {
        pixiApp.value.stage.removeChild(model.value)
        model.value.destroy()
      }
      catch (error) {
        console.warn('Error removing old model:', error)
      }
      model.value = undefined
    }

    if (!modelSrcRef.value) {
      console.warn('No Live2D model source provided.')
      return
    }

    if (isUnmounted) {
      return
    }

    const live2DModel = new Live2DModel<PixiLive2DInternalModel>()
    await Live2DFactory.setupLive2DModel(live2DModel, { url: modelSrcRef.value, id: props.modelId }, { autoInteract: false })

    // --- Scene

    model.value = live2DModel
    // REVIEW: pixiApp and stage are guaranteed to be valid here due to the until(...) above.
    pixiApp.value!.stage.addChild(model.value)
    initialModelWidth.value = model.value.width
    initialModelHeight.value = model.value.height
    model.value.anchor.set(0.5, 0.5)
    setScaleAndPosition()

    // --- Interaction

    model.value.on('hit', (hitAreas) => {
      if (model.value && hitAreas.includes('body'))
        model.value.motion('tap_body')
    })

    // --- Motion

    const internalModel = getInternalModel()
    if (!internalModel)
      return

    const coreModel = internalModel.coreModel
    const motionManager = internalModel.motionManager
    const discoveredMotions = Object
      .entries(motionManager.definitions)
      .flatMap(([motionName, definition]) => (definition?.map((motion: any, index: number) => ({
        motionName,
        motionIndex: index,
        fileName: motion.File,
      })) || []))
      .filter(Boolean)
    setAvailableMotionsForModel(props.modelId, discoveredMotions)
    discoveredMotions.forEach((motion) => {
      if (motion.motionName in Emotion) {
        motionMap.value[motion.fileName] = motion.motionName
      }
      else {
        motionMap.value[motion.fileName] = EmotionNeutralMotionName
      }
    })

    configureLoopingMotion(motionManager as MotionManagerLike, preferredIdleMotionSelection.value)

    if (preferredIdleMotionSelection.value && live2dIdleAnimationEnabled.value) {
      setTimeout(() => {
        requestIdleMotionRestart({ force: true, reason: 'model-load' })
      }, 300)
    }

    // Remove eye ball movements from idle motion group to prevent conflicts
    // This is too hacky
    // FIXME: it cannot blink if loading a model only have idle motion
    if (motionManager.groups.idle) {
      motionManager.motionGroups[motionManager.groups.idle]?.forEach((motion) => {
        motion._motionData.curves.forEach((curve: any) => {
        // TODO: After emotion mapper, stage editor, eye related parameters should be take cared to be dynamical instead of hardcoding
          if (curve.id === 'ParamEyeBallX' || curve.id === 'ParamEyeBallY') {
            curve.id = `_${curve.id}`
          }
        })
      })
    }

    // This is hacky too
    const motionManagerUpdate = useLive2DMotionManagerUpdate({
      internalModel,
      motionManager,
      modelParameters,
      live2dIdleAnimationEnabled,
      live2dAutoBlinkEnabled,
      live2dForceAutoBlinkEnabled,
      performanceState: live2dPerformanceState,
      presencePosture: live2dPresencePosture,
      speechRenderState: live2dSpeechRenderState,
      lastUpdateTime,
    })

    motionManagerUpdate.register(useMotionUpdatePluginBeatSync(beatSync), 'pre')
    motionManagerUpdate.register(useMotionUpdatePluginIdleDisable(), 'pre')
    motionManagerUpdate.register(useMotionUpdatePluginIdleFocus(), 'post')
    motionManagerUpdate.register(useMotionUpdatePluginAutoEyeBlink(), 'post')
    motionManagerUpdate.register(useMotionUpdatePluginPerformanceLayers(), 'post')

    const hookedUpdate = motionManager.update as (model: Live2DCoreModel, now: number) => boolean
    motionManager.update = function (model: Live2DCoreModel, now: number) {
      return motionManagerUpdate.hookUpdate(model, now, hookedUpdate)
    }

    motionManager.on('motionStart', (group, index) => {
      localCurrentMotion.value = { group, index }
      lastMotionRequestKey = buildMotionRequestKey(group, index)
    })

    // Restart the resolved idle preference after transient motions finish.
    motionManager.on('motionFinish', () => {
      requestIdleMotionRestart({ force: true, reason: 'motion-finish' })
    })

    void applyLatestActionPulse()

    // Apply all stored parameters to the model
    coreModel.setParameterValueById('ParamAngleX', modelParameters.value.angleX)
    coreModel.setParameterValueById('ParamAngleY', modelParameters.value.angleY)
    coreModel.setParameterValueById('ParamAngleZ', modelParameters.value.angleZ)
    coreModel.setParameterValueById('ParamEyeLOpen', modelParameters.value.leftEyeOpen)
    coreModel.setParameterValueById('ParamEyeROpen', modelParameters.value.rightEyeOpen)
    coreModel.setParameterValueById('ParamEyeSmile', modelParameters.value.leftEyeSmile)
    coreModel.setParameterValueById('ParamBrowLX', modelParameters.value.leftEyebrowLR)
    coreModel.setParameterValueById('ParamBrowRX', modelParameters.value.rightEyebrowLR)
    coreModel.setParameterValueById('ParamBrowLY', modelParameters.value.leftEyebrowY)
    coreModel.setParameterValueById('ParamBrowRY', modelParameters.value.rightEyebrowY)
    coreModel.setParameterValueById('ParamBrowLAngle', modelParameters.value.leftEyebrowAngle)
    coreModel.setParameterValueById('ParamBrowRAngle', modelParameters.value.rightEyebrowAngle)
    coreModel.setParameterValueById('ParamBrowLForm', modelParameters.value.leftEyebrowForm)
    coreModel.setParameterValueById('ParamBrowRForm', modelParameters.value.rightEyebrowForm)
    coreModel.setParameterValueById('ParamMouthOpenY', modelParameters.value.mouthOpen)
    coreModel.setParameterValueById('ParamBodyAngleZ', modelParameters.value.bodyAngleZ)

    emits('modelLoaded')
    modelLoadSucceeded = true
  }
  catch (error) {
    console.error('[Live2D] Failed to load model:', error)
    emits('error', error instanceof Error ? error : new Error(String(error)))
  }
  finally {
    modelLoading.value = false
    // NOTICE: A failed model load must keep the desktop stage in recovery mode.
    // Marking it as mounted makes the transparent desktop window look healthy while
    // the character surface is actually blank and no recovery panel is shown.
    componentState.value = modelLoadSucceeded ? 'mounted' : 'loading'
    modelLoadMutex.release()
  }
}

function emitCharacterHoverChange(hovered: boolean) {
  if (characterHovered.value === hovered)
    return

  characterHovered.value = hovered
  emits('characterHoverChange', hovered)
}

function resetCharacterHover() {
  emitCharacterHoverChange(false)
}

function resolveRendererPointFromPointerEvent(event: PointerEvent) {
  return resolveRendererPointFromClientPoint(event.clientX, event.clientY)
}

function resolveRendererPointFromClientPoint(clientX: number, clientY: number) {
  const canvas = pixiApp.value?.view
  const renderer = pixiApp.value?.renderer
  if (!canvas || !renderer)
    return null

  const bounds = canvas.getBoundingClientRect()
  if (!bounds.width || !bounds.height)
    return null

  return {
    x: ((clientX - bounds.left) / bounds.width) * renderer.width,
    y: ((clientY - bounds.top) / bounds.height) * renderer.height,
  }
}

function isCharacterHoveredAtPoint(x: number, y: number) {
  if (!model.value)
    return false

  const hitAreas = model.value.hitTest(x, y)
  if (hitAreas.length > 0)
    return true

  return model.value.containsPoint({ x, y } as any)
}

function hitTestClientPoint(clientX: number, clientY: number) {
  const point = resolveRendererPointFromClientPoint(clientX, clientY)
  if (!point)
    return false

  return isCharacterHoveredAtPoint(point.x, point.y)
}

function dragAnchorClientPoint() {
  const canvas = pixiApp.value?.view
  const renderer = pixiApp.value?.renderer
  if (!canvas || !renderer || !model.value)
    return null

  const canvasBounds = canvas.getBoundingClientRect()
  if (!canvasBounds.width || !canvasBounds.height)
    return null

  const worldTransform = model.value.worldTransform
  const scaleX = canvasBounds.width / renderer.width
  const scaleY = canvasBounds.height / renderer.height

  return {
    x: canvasBounds.left + worldTransform.tx * scaleX,
    y: canvasBounds.top + worldTransform.ty * scaleY,
  }
}

function characterFrame() {
  const canvas = pixiApp.value?.view
  const renderer = pixiApp.value?.renderer
  if (!canvas || !renderer || !model.value)
    return null

  const canvasBounds = canvas.getBoundingClientRect()
  if (!canvasBounds.width || !canvasBounds.height)
    return null

  const bounds = model.value.getBounds()
  const scaleX = canvasBounds.width / renderer.width
  const scaleY = canvasBounds.height / renderer.height
  const left = canvasBounds.left + bounds.x * scaleX
  const right = canvasBounds.left + (bounds.x + bounds.width) * scaleX
  const top = canvasBounds.top + bounds.y * scaleY
  const bottom = canvasBounds.top + (bounds.y + bounds.height) * scaleY
  const height = Math.max(0, bottom - top)

  if (height <= 0 || right <= left)
    return null

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    anchorY: top + height * 0.18,
  }
}

function handleCanvasPointerMove(event: PointerEvent) {
  const point = resolveRendererPointFromPointerEvent(event)
  if (!point) {
    resetCharacterHover()
    return
  }

  emitCharacterHoverChange(isCharacterHoveredAtPoint(point.x, point.y))
}

function attachCanvasHoverListeners(canvas: HTMLCanvasElement) {
  canvas.addEventListener('pointermove', handleCanvasPointerMove)
  canvas.addEventListener('pointerleave', resetCharacterHover)
  canvas.addEventListener('pointercancel', resetCharacterHover)
}

function detachCanvasHoverListeners(canvas?: HTMLCanvasElement | null) {
  canvas?.removeEventListener('pointermove', handleCanvasPointerMove)
  canvas?.removeEventListener('pointerleave', resetCharacterHover)
  canvas?.removeEventListener('pointercancel', resetCharacterHover)
}

async function setMotion(motionName: string, index?: number) {
  const activeModel = model.value
  if (!activeModel)
    return 'deferred' as const

  const requestKey = buildMotionRequestKey(motionName, index)
  if (!requestKey)
    return 'skipped' as const
  if (requestKey === lastMotionRequestKey || requestKey === inFlightMotionRequestKey)
    return 'skipped' as const

  inFlightMotionRequestKey = requestKey
  const requestId = ++motionRequestId
  const normalizedIndex = Number.isFinite(index)
    ? Math.max(0, Math.floor(Number(index)))
    : undefined
  const preferredIdle = preferredIdleMotionSelection.value
  const isPreferredIdleMotion = preferredIdle
    && preferredIdle.group === motionName
    && preferredIdle.index === normalizedIndex
  const priority = isPreferredIdleMotion
    ? MotionPriority.IDLE
    : MotionPriority.FORCE

  try {
    await activeModel.motion(motionName, normalizedIndex, priority)
    if (requestId !== motionRequestId)
      return 'skipped' as const

    lastMotionRequestKey = requestKey
    return 'started' as const
  }
  catch (error) {
    if (requestId !== motionRequestId)
      return 'skipped' as const
    console.warn(`[Live2D] Failed to start motion ${motionName}`, error)
    if (lastMotionRequestKey === requestKey)
      lastMotionRequestKey = ''
    return 'skipped' as const
  }
  finally {
    if (requestId === motionRequestId && inFlightMotionRequestKey === requestKey)
      inFlightMotionRequestKey = ''
  }
}

async function applyActionPulseRevision(revision: number) {
  if (!revision || revision === lastAppliedActionPulseRevision.value)
    return

  const actionCue = live2dPerformanceState.value?.actionPulse.cue?.trim()
  if (!actionCue) {
    lastAppliedActionPulseRevision.value = revision
    return
  }

  const binding = resolveLive2DActionPulseBinding(props.actionBindings ?? [], actionCue)
  if (!binding) {
    lastAppliedActionPulseRevision.value = revision
    return
  }

  const result = await setMotion(binding.motionName, binding.motionIndex)
  if (result !== 'deferred')
    lastAppliedActionPulseRevision.value = revision
}

async function applyLatestActionPulse() {
  await applyActionPulseRevision(live2dPerformanceState.value?.actionPulse.revision ?? 0)
}

const handleResize = useDebounceFn(setScaleAndPosition, 100)

const dropShadowColorComputer = ref<HTMLDivElement>()
const dropShadowAnimationId = ref(0)

function updateDropShadowFilter() {
  if (!model.value)
    return

  if (!live2dShadowEnabled.value) {
    model.value.filters = []
    return
  }

  if (!dropShadowColorComputer.value)
    return

  const color = getComputedStyle(dropShadowColorComputer.value).backgroundColor
  dropShadowFilter.value.color = Number(formatHex(color)!.replace('#', '0x'))
  model.value.filters = [dropShadowFilter.value]
}

watch([() => props.width, () => props.height], handleResize)
watch(modelSrcRef, async () => await loadModel(), { immediate: true })
watch(dark, updateDropShadowFilter, { immediate: true })
watch([model, themeColorsHue], updateDropShadowFilter)
watch(live2dShadowEnabled, updateDropShadowFilter)
watch(offset, setScaleAndPosition)
watch(() => props.scale, setScaleAndPosition)

// TODO: This is hacky!
function updateDropShadowFilterLoop() {
  updateDropShadowFilter()
  if (!live2dShadowEnabled.value) {
    dropShadowAnimationId.value = 0
    return
  }

  dropShadowAnimationId.value = requestAnimationFrame(updateDropShadowFilterLoop)
}

watch([themeColorsHueDynamic, live2dShadowEnabled], ([dynamic, shadowEnabled]) => {
  if (dynamic && shadowEnabled) {
    dropShadowAnimationId.value = requestAnimationFrame(updateDropShadowFilterLoop)
  }
  else {
    cancelAnimationFrame(dropShadowAnimationId.value)
    dropShadowAnimationId.value = 0
  }
}, { immediate: true })

watch(currentMotion, value => setMotion(value.group, value.index))
watch(
  () => live2dPerformanceState.value?.actionPulse.revision ?? 0,
  async (revision) => {
    await applyActionPulseRevision(revision)
  },
  { immediate: true },
)
watch(paused, value => value ? pixiApp.value?.stop() : pixiApp.value?.start())
watch(() => pixiApp.value?.view, (canvas, previousCanvas) => {
  detachCanvasHoverListeners(previousCanvas)

  if (canvas)
    attachCanvasHoverListeners(canvas)
}, { immediate: true })

// Watch and apply model parameters
watch(() => modelParameters.value.angleX, value => updateCoreModelParameter('ParamAngleX', value))
watch(() => modelParameters.value.angleY, value => updateCoreModelParameter('ParamAngleY', value))
watch(() => modelParameters.value.angleZ, value => updateCoreModelParameter('ParamAngleZ', value))
watch(() => modelParameters.value.leftEyeOpen, value => updateCoreModelParameter('ParamEyeLOpen', value))
watch(() => modelParameters.value.rightEyeOpen, value => updateCoreModelParameter('ParamEyeROpen', value))
watch(() => modelParameters.value.mouthOpen, value => updateCoreModelParameter('ParamMouthOpenY', value))
watch(() => modelParameters.value.bodyAngleZ, value => updateCoreModelParameter('ParamBodyAngleZ', value))
// Watch eyebrow parameters
watch(() => modelParameters.value.leftEyebrowLR, value => updateCoreModelParameter('ParamBrowLX', value))
watch(() => modelParameters.value.rightEyebrowLR, value => updateCoreModelParameter('ParamBrowRX', value))
watch(() => modelParameters.value.leftEyebrowY, value => updateCoreModelParameter('ParamBrowLY', value))
watch(() => modelParameters.value.rightEyebrowY, value => updateCoreModelParameter('ParamBrowRY', value))
watch(() => modelParameters.value.leftEyebrowAngle, value => updateCoreModelParameter('ParamBrowLAngle', value))
watch(() => modelParameters.value.rightEyebrowAngle, value => updateCoreModelParameter('ParamBrowRAngle', value))
watch(() => modelParameters.value.leftEyebrowForm, value => updateCoreModelParameter('ParamBrowLForm', value))
watch(() => modelParameters.value.rightEyebrowForm, value => updateCoreModelParameter('ParamBrowRForm', value))

watch(live2dIdleAnimationEnabled, (enabled) => {
  if (!enabled && model.value) {
    const internalModel = model.value.internalModel
    if (internalModel?.motionManager) {
      internalModel.motionManager.stopAllMotions()
    }
    return
  }

  requestIdleMotionRestart({ force: true, reason: 'idle-enabled' })
})

watch(preferredIdleMotionKey, (nextKey, previousKey) => {
  if (!nextKey || !live2dIdleAnimationEnabled.value)
    return

  const currentKey = buildMotionKey(localCurrentMotion.value)
  if (!currentKey || currentKey === previousKey || currentKey === nextKey) {
    requestIdleMotionRestart({ force: true, reason: 'idle-preference-change' })
  }
})

watch(focusAt, (value) => {
  if (!model.value)
    return
  if (props.disableFocusAt)
    return

  model.value.focus(value.x, value.y)
})

watch(componentState, (state) => {
  console.info(
    `[stage-startup-trace][live2d-model] component-state state=${state} modelId=${props.modelId || '<empty>'} modelSrc=${props.modelSrc || '<empty>'}`,
  )
}, { immediate: true })

onMounted(() => {
  console.info('[stage-startup-trace][live2d-model] onMounted-beat-sync')
  const removeListener = listenBeatSyncBeatSignal(() => beatSync.scheduleBeat())
  onUnmounted(() => removeListener())
})

onUnmounted(() => {
  detachCanvasHoverListeners(pixiApp.value?.view)
  resetCharacterHover()
})

onMounted(async () => {
  console.info('[stage-startup-trace][live2d-model] onMounted-shadow-enter')
  updateDropShadowFilter()
  console.info('[stage-startup-trace][live2d-model] onMounted-shadow-exit')
})

onBeforeMount(() => {
  console.info('[stage-startup-trace][live2d-model] onBeforeMount')
})

onUnmounted(() => {
  isUnmounted = true
  disposeShouldUpdateView?.()
})

function listMotionGroups() {
  return availableMotions.value
}

defineExpose({
  characterFrame,
  dragAnchorClientPoint,
  hitTestClientPoint,
  setMotion,
  listMotionGroups,
})

import.meta.hot?.dispose(() => {
  console.warn('[Dev] Reload on HMR dispose is active for this component. Performing a full reload.')
  window.location.reload()
})
</script>

<template>
  <div ref="dropShadowColorComputer" hidden bg="primary-400 dark:primary-500" />
  <slot />
</template>
