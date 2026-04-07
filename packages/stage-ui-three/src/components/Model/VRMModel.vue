<script setup lang="ts">
/*
  * - Core component for loading and displaying VRM model
  * - Load model, get some geometry data for initialisation
  * - Shader injection and rendering setting
  * - Load & initialise animation
*/

import type { VRM } from '@pixiv/three-vrm'
import type {
  StageEmbodimentPerformanceState,
  StageEmbodimentPresencePostureState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type {
  AnimationAction,
  Group,
  Object3D,
  PerspectiveCamera,
  ShaderMaterial,
  SphericalHarmonics3,
  Texture,
  WebGLRenderer,
} from 'three'
import type { Ref, WatchStopHandle } from 'vue'

import type { SceneBootstrap, Vec3 } from '../../stores/model-store'
import type { VrmLifecycleReason } from '../../trace'
import type {
  VrmActionBinding,
  VrmCustomExpressionBinding,
  VrmIdleActionPreference,
  VrmRuntimeCapabilitySnapshot,
} from '../../types/performance'
import type { ManagedVrmInstance } from './vrm-instance-cache'

import { VRMUtils } from '@pixiv/three-vrm'
import { useLoop, useTresContext } from '@tresjs/core'
import { until, useMouse } from '@vueuse/core'
import {
  AnimationMixer,
  Box3,
  LoopOnce,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Plane,
  Raycaster,

  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import {
  computed,
  onMounted,
  onUnmounted,
  ref,

  shallowRef,

  toRefs,
  watch,

} from 'vue'

import {
  createIblProbeController,
  injectDiffuseIBL,
  normalizeEnvMode,
  updateNprShaderSetting,
} from '../../composables/shader/ibl'
// From stage-ui-three package
import {
  clipFromVRMAnimation,
  loadVRMAnimation,
  reAnchorRootPositionTrack,
  useBlink,
  useIdleEyeSaccades,
} from '../../composables/vrm/animation'
import {
  normalizeVrmExpressionName,
  resolveVrmBaseExpressionName,
  resolveVrmPresetFacialCapability,
  supportsVrmVisemeLipSync,
  vrmStandardExpressionNames,
} from '../../composables/vrm/capabilities'
import { loadVrm } from '../../composables/vrm/core'
import { useVRMEmote } from '../../composables/vrm/expression'
import { useVRMLipSync } from '../../composables/vrm/lip-sync'
import { applyStageEmbodimentVrmPosture } from '../../composables/vrm/posture'
import {
  createThreeRendererMemorySnapshot,
  createVrmSceneSummarySnapshot,
  getStageThreeRuntimeTraceContext,
  isStageThreeRuntimeTraceEnabled,
  stageThreeTraceVrmDisposeEndEvent,
  stageThreeTraceVrmDisposeStartEvent,
  stageThreeTraceVrmLoadEndEvent,
  stageThreeTraceVrmLoadErrorEvent,
  stageThreeTraceVrmLoadStartEvent,
  stageThreeTraceVrmUpdateFrameEvent,
} from '../../trace'
import {
  clearManagedVrmInstance,
  stashManagedVrmInstance,
  takeManagedVrmInstance,
} from './vrm-instance-cache'

/*
  * Props:
  * - modelSrc: model src string to load model asset
  * - idleAnimation: animation src for model
  * - loadAnimations: TBC
  * - paused: if the animation is paused
  * - nprIrrSH: Spherical Harmonics computed from the sky box, used for IBL
  *
  * - modelOffset: The placing offset of model (x, y, z)
  * - modelRotationY: The rotation of the model (y-axis)
*/
const props = withDefaults(defineProps<{
  baseExpressionOverrides?: Record<string, string[]> | null
  customExpressionBindings?: VrmCustomExpressionBinding[]
  actionBindings?: VrmActionBinding[]
  externalLookAtScreenPoint?: { x: number, y: number } | null
  modelSrc?: string
  modelId?: string
  idleAnimation: string
  // loadAnimations?: string[]
  paused?: boolean

  envSelect: string
  skyBoxIntensity: number
  nprIrrSH?: SphericalHarmonics3 | null

  modelOffset: Vec3
  modelRotationY: number
  lookAtTarget: Vec3
  trackingMode: string
  eyeHeight: number
  cameraPosition: Vec3

  camera: PerspectiveCamera
  idleActionPreference?: VrmIdleActionPreference | null
  performanceState?: StageEmbodimentPerformanceState | null
  presencePosture?: StageEmbodimentPresencePostureState | null
  speechRenderState?: StageEmbodimentSpeechRenderState | null
}>(), {
  paused: false,
})
/*
  * Emits:
  * - model-core-loading-progress
  * - model-core-error
  * - model-core-ready
  *
*/
const emit = defineEmits<{
  (e: 'loadingProgress', value: number): void
  (e: 'loadStart'): void
  (e: 'sceneBootstrap', value: SceneBootstrap): void
  (e: 'lookAtTarget', value: Vec3): void
  (e: 'customExpressionsResolved', value: string[]): void
  (e: 'runtimeCapabilitiesResolved', value: VrmRuntimeCapabilitySnapshot): void

  (e: 'error', value: unknown): void
  (e: 'loaded', value: string): void
}>()

const {
  customExpressionBindings,
  actionBindings,
  baseExpressionOverrides,
  externalLookAtScreenPoint,
  modelSrc,
  idleAnimation,
  // loadAnimations, // TBC
  paused,

  envSelect,
  skyBoxIntensity,
  nprIrrSH,

  modelOffset,
  modelRotationY,
  lookAtTarget,
  trackingMode,
  eyeHeight,
  cameraPosition,

  camera,
  idleActionPreference,
  performanceState,
  presencePosture,
  speechRenderState,
} = toRefs(props)

// Model and scene ref
const { renderer, scene } = useTresContext()
const vrm = shallowRef<VRM>()
const vrmGroup = shallowRef<Group>()
const modelLoaded = ref<boolean>(false)
let loadSequence = 0
// for eye tracking modes
const { x: mouseX, y: mouseY } = useMouse()
const raycaster = new Raycaster()
const mouse = new Vector2()
const mouseTarget = shallowRef<Vec3>()
let stopMouseWatch: WatchStopHandle | undefined
let stopCameraWatch: WatchStopHandle | undefined

// Animation related ref
const vrmAnimationMixer = ref<AnimationMixer>()
const idleClipAction = ref<AnimationAction>()
const transientClipAction = ref<AnimationAction>()
const transientCleanup = ref<(() => void) | undefined>()
let transientActionRequestId = 0
let lastTransientActionKey = ''
let lastTransientActionIssuedAt = 0
const transientActionDedupWindowMs = 220
const customExpressionNames = ref<string[]>([])
const { onBeforeRender, stop, start } = useLoop()
const lastAppliedIdleActionKey = ref('')
const lastAppliedIdleActionAt = ref(0)

type VrmFrameHook = (vrm: VRM, delta: number) => void
const vrmFrameHook = shallowRef<VrmFrameHook>()
let disposeBeforeRenderLoop: (() => void | undefined) | undefined
const lastDialoguePerformance = shallowRef<DialoguePerformanceInput | null>(null)
const lastAppliedActionPulseRevision = ref(0)

const internalMouthShadowPrefix = '__airi_internal_mouth__'

interface DialoguePerformanceInput {
  baseEmotion: string
  facialCue?: string | null
  actionCue?: string | null
  emphasis?: number
}

// Expressions
const blink = useBlink()
const idleEyeSaccades = useIdleEyeSaccades()
const vrmEmote = ref<ReturnType<typeof useVRMEmote>>()
const vrmLipSync = useVRMLipSync(speechRenderState)
const speechDynamics = computed(() => speechRenderState.value?.active === true ? speechRenderState.value.dynamics : null)

// For sky box update
const nprProgramVersion = ref(0)
// For MToon IBL
let airiIblProbe: ReturnType<typeof createIblProbeController> | null = null
const stageThreeRuntimeTraceContext = getStageThreeRuntimeTraceContext()

function measureFrameStep(enabled: boolean, fn: () => void) {
  if (!enabled) {
    fn()
    return 0
  }

  const startedAt = performance.now()
  fn()
  return performance.now() - startedAt
}

function getRendererInstance() {
  return renderer?.instance as WebGLRenderer | undefined
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error

  try {
    return JSON.stringify(error)
  }
  catch {
    return String(error)
  }
}

function emitVrmLoadError(reason: VrmLifecycleReason, startedAt: number, error: unknown) {
  if (!isStageThreeRuntimeTraceEnabled())
    return

  stageThreeRuntimeTraceContext.emit(stageThreeTraceVrmLoadErrorEvent, {
    durationMs: performance.now() - startedAt,
    errorMessage: toErrorMessage(error),
    modelSrc: modelSrc.value,
    reason,
    rendererMemory: createThreeRendererMemorySnapshot(getRendererInstance()),
    sceneSummary: createVrmSceneSummarySnapshot({ mixer: vrmAnimationMixer.value, vrm: vrm.value }),
    ts: performance.now(),
  })
}

function invalidatePendingLoads() {
  loadSequence += 1
  return loadSequence
}

function isLoadRequestCurrent(requestId: number) {
  return loadSequence === requestId
}

function disposeDetachedVrm(detachedVrm?: VRM, detachedGroup?: Group) {
  detachedGroup?.removeFromParent()

  if (detachedVrm) {
    VRMUtils.deepDispose(detachedVrm.scene as unknown as Object3D)
  }
}

function detachVrmGroup(detachedGroup?: Group) {
  detachedGroup?.removeFromParent()
}

function createManagedVrmInstance(instance: Omit<ManagedVrmInstance, 'modelSrc' | 'scopeKey'>): ManagedVrmInstance {
  return {
    modelSrc: modelSrc.value!,
    scopeKey: getManagedVrmScopeKey(),
    ...instance,
  }
}

function getManagedVrmScopeKey() {
  return typeof window !== 'undefined' ? window.location.href : 'unknown'
}

function getActiveManagedVrmInstance() {
  if (!modelSrc.value || !vrm.value || !vrmGroup.value || !vrmAnimationMixer.value || !vrmEmote.value)
    return undefined

  return createManagedVrmInstance({
    emote: vrmEmote.value,
    group: vrmGroup.value,
    idleAction: idleClipAction.value,
    mixer: vrmAnimationMixer.value,
    vrm: vrm.value,
  })
}

function clearActiveManagedVrmRefs() {
  idleClipAction.value = undefined
  transientClipAction.value = undefined
  transientCleanup.value = undefined
  vrmAnimationMixer.value = undefined
  vrmEmote.value = undefined
  vrm.value = undefined
  vrmGroup.value = undefined
}

function applyManagedVrmInstance(instance: ManagedVrmInstance) {
  vrm.value = instance.vrm
  vrmGroup.value = instance.group
  idleClipAction.value = instance.idleAction
  vrmAnimationMixer.value = instance.mixer
  vrmEmote.value = instance.emote
}

function destroyManagedVrmInstance(instance?: ManagedVrmInstance) {
  if (!instance)
    return

  instance.emote.dispose()
  instance.idleAction?.stop()
  instance.mixer.stopAllAction()
  disposeDetachedVrm(instance.vrm, instance.group)
}

function isManagedVrmInstanceReusable(instance: ManagedVrmInstance) {
  try {
    instance.group.updateMatrixWorld(true)
    instance.vrm.scene.updateMatrixWorld(true)
    instance.vrm.humanoid.update()
    return true
  }
  catch {
    return false
  }
}

function shouldDestroyVrmResources(reason: VrmLifecycleReason) {
  return reason === 'model-switch'
}

function shouldStashVrmResources(reason: VrmLifecycleReason) {
  return reason === 'component-unmount'
}

function bindManagedVrmInstanceRenderLoop() {
  disposeBeforeRenderLoop?.()

  disposeBeforeRenderLoop = onBeforeRender(({ delta }) => {
    const traceStart = isStageThreeRuntimeTraceEnabled() ? performance.now() : 0
    const tracingEnabled = traceStart > 0

    const animationMixerMs = measureFrameStep(tracingEnabled, () => {
      vrmAnimationMixer.value?.update(delta)
    })
    const activeVrm = vrm.value
    const vrmFrameHookMs = measureFrameStep(tracingEnabled, () => {
      if (activeVrm && vrmFrameHook.value) {
        try {
          vrmFrameHook.value(activeVrm, delta)
        }
        catch (err) {
          console.error(err)
          emit('error', err)
        }
      }
    })
    const humanoidMs = measureFrameStep(tracingEnabled, () => {
      activeVrm?.humanoid.update()
    })
    const lookAtMs = measureFrameStep(tracingEnabled, () => {
      activeVrm?.lookAt?.update?.(delta)
    })
    const blinkAndSaccadeMs = measureFrameStep(tracingEnabled, () => {
      const blinkResult = blink.update(delta, speechDynamics.value)
      vrmEmote.value?.setBlinkWeights(blinkResult.weights)
      idleEyeSaccades.update(activeVrm, lookAtTarget, delta, speechDynamics.value, presencePosture.value)
    })
    const postureMs = measureFrameStep(tracingEnabled, () => {
      applyStageEmbodimentVrmPosture({
        delta,
        posture: presencePosture.value,
        vrm: activeVrm,
      })
    })
    const lipSyncMs = measureFrameStep(tracingEnabled, () => {
      const result = vrmLipSync.update(delta)
      vrmEmote.value?.setVisemeWeights(result.weights, result.active)
    })
    const emoteMs = measureFrameStep(tracingEnabled, () => {
      vrmEmote.value?.update(delta)
    })
    const expressionMs = measureFrameStep(tracingEnabled, () => {
      activeVrm?.expressionManager?.update()
    })
    const springBoneMs = measureFrameStep(tracingEnabled, () => {
      activeVrm?.springBoneManager?.update(delta)
    })

    if (traceStart > 0) {
      stageThreeRuntimeTraceContext.emit(stageThreeTraceVrmUpdateFrameEvent, {
        animationMixerMs,
        blinkAndSaccadeMs,
        deltaMs: delta * 1000,
        durationMs: performance.now() - traceStart,
        emoteMs,
        expressionMs,
        humanoidMs,
        lipSyncMs,
        lookAtMs,
        postureMs,
        springBoneMs,
        ts: traceStart,
        vrmFrameHookMs,
      })
    }
  }).off
}

function commitManagedVrmInstance(instance: ManagedVrmInstance) {
  scene.value?.add(instance.group)
  applyManagedVrmInstance(instance)
  bindManagedVrmInstanceRenderLoop()
  emitCustomExpressionsResolved(instance.vrm)
  emitRuntimeCapabilitiesResolved(instance.vrm)
  emit('loaded', modelSrc.value!)
  modelLoaded.value = true
}

// clean the previous vrm model loaded
function componentCleanUp(
  reason: VrmLifecycleReason,
  options: { invalidate?: boolean } = {},
) {
  const { invalidate = true } = options
  if (invalidate)
    invalidatePendingLoads()

  const startedAt = performance.now()
  const activeInstance = getActiveManagedVrmInstance()
  const rendererInstance = getRendererInstance()
  const shouldDestroyResources = shouldDestroyVrmResources(reason)
  const hasCleanupWork = !!disposeBeforeRenderLoop
    || !!activeInstance
    || !!airiIblProbe

  if (hasCleanupWork && isStageThreeRuntimeTraceEnabled()) {
    stageThreeRuntimeTraceContext.emit(stageThreeTraceVrmDisposeStartEvent, {
      modelSrc: modelSrc.value,
      reason,
      rendererMemory: createThreeRendererMemorySnapshot(rendererInstance),
      sceneSummary: createVrmSceneSummarySnapshot({ mixer: activeInstance?.mixer, vrm: activeInstance?.vrm }),
      ts: startedAt,
    })
  }

  disposeBeforeRenderLoop?.()
  disposeBeforeRenderLoop = undefined
  clearTransientAnimation()

  if (activeInstance)
    detachVrmGroup(activeInstance.group)

  if (shouldDestroyResources) {
    destroyManagedVrmInstance(activeInstance)
    destroyManagedVrmInstance(clearManagedVrmInstance(getManagedVrmScopeKey()))
  }
  else if (shouldStashVrmResources(reason)) {
    destroyManagedVrmInstance(activeInstance ? stashManagedVrmInstance(activeInstance) : undefined)
  }
  else {
    destroyManagedVrmInstance(activeInstance)
  }

  airiIblProbe?.dispose()
  airiIblProbe = null
  clearActiveManagedVrmRefs()
  customExpressionNames.value = []
  emit('customExpressionsResolved', [])
  emitRuntimeCapabilitiesResolved()
  modelLoaded.value = false

  if (hasCleanupWork && isStageThreeRuntimeTraceEnabled()) {
    stageThreeRuntimeTraceContext.emit(stageThreeTraceVrmDisposeEndEvent, {
      durationMs: performance.now() - startedAt,
      modelSrc: modelSrc.value,
      reason,
      rendererMemory: createThreeRendererMemorySnapshot(rendererInstance),
      sceneSummary: createVrmSceneSummarySnapshot(),
      ts: performance.now(),
    })
  }
}

function resolveCustomExpressionNames(activeVrm?: VRM) {
  return Object.keys(activeVrm?.expressionManager?.expressionMap ?? {})
    .filter((name) => {
      const normalizedName = normalizeExpressionName(name).toLowerCase()
      return normalizedName
        && !normalizedName.startsWith(internalMouthShadowPrefix)
        && !vrmStandardExpressionNames.has(normalizedName)
    })
    .sort((left, right) => left.localeCompare(right))
}

function emitCustomExpressionsResolved(activeVrm?: VRM) {
  const nextNames = resolveCustomExpressionNames(activeVrm)
  customExpressionNames.value = nextNames
  emit('customExpressionsResolved', nextNames)
}

function buildRuntimeCapabilitySnapshot(activeVrm?: VRM): VrmRuntimeCapabilitySnapshot {
  const supportedExpressionNames = [...new Set(
    Object.keys(activeVrm?.expressionManager?.expressionMap ?? {})
      .map(name => normalizeVrmExpressionName(name))
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right))

  return {
    supportedExpressionNames,
    supportsLookAt: Boolean(activeVrm?.lookAt),
    supportsVisemeLipSync: supportsVrmVisemeLipSync(supportedExpressionNames),
    supportsMicroDynamics: true,
  }
}

function emitRuntimeCapabilitiesResolved(activeVrm?: VRM) {
  emit('runtimeCapabilitiesResolved', buildRuntimeCapabilitySnapshot(activeVrm))
}

function normalizeExpressionName(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function resolvePerformanceIntensity(input: DialoguePerformanceInput) {
  const emphasis = Number.isFinite(input.emphasis) ? Number(input.emphasis) : 0
  if (emphasis >= 2)
    return 1
  if (emphasis >= 1)
    return 0.85
  return 0.7
}

function clamp01(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampBlendDurationSeconds(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return undefined

  return Math.min(1.2, Math.max(0.05, Number(value) / 1000))
}

function clampActionFadeSeconds(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0.18

  return Math.min(1.2, Math.max(0.08, Number(value) / 1000))
}

function resolveExpressionIntensityFromPerformanceState(state?: StageEmbodimentPerformanceState | null) {
  if (!state || state.phase === 'idle')
    return 0.62

  return clamp01(state.expressionIntensity, 0.72)
}

function resolveFacialCueIntensityFromPerformanceState(state?: StageEmbodimentPerformanceState | null) {
  if (!state || state.phase === 'idle')
    return 0

  return clamp01(state.facialCueIntensity, resolveExpressionIntensityFromPerformanceState(state))
}

function resolveDialoguePerformanceFromState(state?: StageEmbodimentPerformanceState | null): DialoguePerformanceInput | null {
  if (!state || state.phase === 'idle')
    return null

  return {
    actionCue: state.performance.actionCue ?? null,
    baseEmotion: state.performance.baseEmotion,
    emphasis: state.performance.emphasis,
    facialCue: state.performance.facialCue ?? null,
  }
}

function resolveRendererSettleBlendDurationFromPerformanceState(state?: StageEmbodimentPerformanceState | null) {
  return clampBlendDurationSeconds(state?.activeCue?.rendererSettle?.vrmExpressionBlendMs)
}

function resolveRendererSettleActionFadeFromPerformanceState(state?: StageEmbodimentPerformanceState | null) {
  return clampActionFadeSeconds(state?.activeCue?.rendererSettle?.vrmActionFadeMs)
}

function hasConfiguredCapabilityText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function isConfiguredCustomExpressionBinding(binding?: VrmCustomExpressionBinding | null) {
  return Boolean(
    binding
    && hasConfiguredCapabilityText(binding.expressionName)
    && hasConfiguredCapabilityText(binding.facialKey)
    && hasConfiguredCapabilityText(binding.label)
    && hasConfiguredCapabilityText(binding.description),
  )
}

function resolveConfiguredCustomExpressionBinding(facialCue?: string | null) {
  const normalizedCue = typeof facialCue === 'string' ? facialCue.trim() : ''
  if (!normalizedCue)
    return undefined

  return (customExpressionBindings.value ?? [])
    .find(item => isConfiguredCustomExpressionBinding(item) && item.facialKey === normalizedCue)
}

function clearTransientAnimation() {
  transientActionRequestId += 1
  transientCleanup.value?.()
  transientCleanup.value = undefined
  transientClipAction.value?.stop()
  transientClipAction.value = undefined
}

function buildTransientActionKey(binding: VrmActionBinding) {
  const source = binding.source || 'unknown'
  const identity = binding.id || binding.actionKey || binding.fileName || 'anonymous-action'
  return `${source}:${identity}`.trim()
}

function replayIdleAnimation(fadeDuration: number = 0.18) {
  clearTransientAnimation()
  idleClipAction.value?.reset()
  idleClipAction.value?.fadeIn(fadeDuration)
  idleClipAction.value?.play()
}

function buildIdleActionPreferenceKey(preference: typeof idleActionPreference.value) {
  if (!preference)
    return 'idle:none'

  const bindingId = preference.binding?.id ?? preference.binding?.actionKey ?? 'settle_idle'
  return `${preference.mode}:${bindingId}`
}

function resolveIdleActionCooldownMs(preference: typeof idleActionPreference.value) {
  if (!preference)
    return 1200
  if (preference.mode === 'inspection')
    return 2400
  if (preference.mode === 'hesitant' || preference.mode === 'concerned')
    return 2800
  return 1800
}

async function playActionBinding(
  binding: VrmActionBinding,
  options?: {
    fadeDuration?: number
  },
) {
  const actionKey = buildTransientActionKey(binding)
  const now = performance.now()
  if (actionKey && actionKey === lastTransientActionKey && now - lastTransientActionIssuedAt < transientActionDedupWindowMs)
    return
  lastTransientActionKey = actionKey
  lastTransientActionIssuedAt = now
  const fadeDuration = clampActionFadeSeconds(options?.fadeDuration)

  const requestId = transientActionRequestId + 1
  transientActionRequestId = requestId

  const activeVrm = vrm.value
  const mixer = vrmAnimationMixer.value
  if (!activeVrm || !mixer)
    return

  if (binding.source === 'builtin' && binding.actionKey === 'settle_idle') {
    replayIdleAnimation(fadeDuration)
    return
  }

  if (!binding.file)
    return

  transientCleanup.value?.()
  transientCleanup.value = undefined
  transientClipAction.value?.stop()
  transientClipAction.value = undefined

  const animation = await loadVRMAnimation(binding.file)
  if (requestId !== transientActionRequestId)
    return

  const clip = await clipFromVRMAnimation(activeVrm, animation)
  if (requestId !== transientActionRequestId) {
    if (clip)
      mixer.uncacheClip(clip)
    return
  }
  if (!clip)
    return

  reAnchorRootPositionTrack(clip, activeVrm)
  const action = mixer.clipAction(clip)
  if (requestId !== transientActionRequestId) {
    try {
      action.stop()
    }
    catch {}
    mixer.uncacheClip(clip)
    return
  }

  transientClipAction.value = action
  action.reset()
  action.setLoop(LoopOnce, 1)
  action.clampWhenFinished = false
  action.play()
  idleClipAction.value?.crossFadeTo(action, fadeDuration, false)
  let cleanup: (() => void) | undefined

  const handleFinished = (event: { action: AnimationAction, direction: number }) => {
    if (event.action !== action)
      return
    if (requestId !== transientActionRequestId)
      return

    mixer.removeEventListener('finished', handleFinished)
    action.fadeOut(fadeDuration)
    idleClipAction.value?.reset()
    idleClipAction.value?.fadeIn(fadeDuration)
    idleClipAction.value?.play()
    action.stop()
    mixer.uncacheClip(clip)
    if (transientClipAction.value === action)
      transientClipAction.value = undefined
    if (transientCleanup.value === cleanup)
      transientCleanup.value = undefined
  }

  cleanup = () => {
    mixer.removeEventListener('finished', handleFinished)
    try {
      action.stop()
    }
    catch {}
    mixer.uncacheClip(clip)
  }

  if (requestId !== transientActionRequestId) {
    cleanup()
    return
  }

  transientCleanup.value = cleanup
  mixer.addEventListener('finished', handleFinished)
}

async function applyIdleActionPreference(
  preference: typeof idleActionPreference.value,
  options: {
    force?: boolean
  } = {},
) {
  if (speechRenderState.value?.active)
    return

  const key = buildIdleActionPreferenceKey(preference)
  const now = performance.now()
  if (!options.force) {
    const elapsedMs = now - lastAppliedIdleActionAt.value
    if (key === lastAppliedIdleActionKey.value && elapsedMs < resolveIdleActionCooldownMs(preference))
      return
  }

  lastAppliedIdleActionKey.value = key
  lastAppliedIdleActionAt.value = now

  if (!preference?.binding || preference.binding.actionKey === 'settle_idle') {
    replayIdleAnimation()
    return
  }

  await playActionBinding(preference.binding)
}

function applyDialogueExpression(
  input: DialoguePerformanceInput,
  options?: {
    blendDuration?: number
    emotionIntensity?: number
    facialCueIntensity?: number
  },
) {
  const emote = vrmEmote.value
  if (!emote)
    return

  const emotionIntensity = clamp01(options?.emotionIntensity ?? resolvePerformanceIntensity(input), 0.7)
  const facialCueIntensity = clamp01(options?.facialCueIntensity ?? emotionIntensity, emotionIntensity)
  emote.setEmotion(
    resolveVrmBaseExpressionName(
      input.baseEmotion,
      baseExpressionOverrides.value?.[input.baseEmotion],
    ),
    emotionIntensity,
    { blendDuration: options?.blendDuration },
  )

  const customBinding = resolveConfiguredCustomExpressionBinding(input.facialCue)
  if (customBinding) {
    emote.setFacialCue(customBinding.expressionName, facialCueIntensity, {
      affectsMouth: customBinding.affectsMouth,
      blendDuration: options?.blendDuration,
    })
  }
  else {
    const presetBinding = resolveVrmPresetFacialCapability(input.facialCue)
    emote.setFacialCue(presetBinding?.expressionName ?? null, facialCueIntensity, {
      affectsMouth: presetBinding?.affectsMouth === true,
      blendDuration: options?.blendDuration,
    })
  }
}

function applyDialogueExpressionFromState(state?: StageEmbodimentPerformanceState | null) {
  const performanceInput = resolveDialoguePerformanceFromState(state)
  if (!performanceInput) {
    applyDialogueExpression({
      actionCue: null,
      baseEmotion: 'neutral',
      emphasis: 0,
      facialCue: null,
    }, {
      emotionIntensity: 0.62,
      facialCueIntensity: 0,
    })
    return
  }

  applyDialogueExpression(performanceInput, {
    blendDuration: resolveRendererSettleBlendDurationFromPerformanceState(state),
    emotionIntensity: resolveExpressionIntensityFromPerformanceState(state),
    facialCueIntensity: resolveFacialCueIntensityFromPerformanceState(state),
  })
}

async function applyDialoguePerformance(input: DialoguePerformanceInput) {
  lastDialoguePerformance.value = { ...input }
  applyDialogueExpression(input)

  const actionBinding = (actionBindings.value ?? [])
    .find(item => item.actionKey === input.actionCue)
  if (actionBinding)
    await playActionBinding(actionBinding)
}

// look at mouse
function lookAtMouse(
  mouseX: number,
  mouseY: number,
  camera: Ref<PerspectiveCamera>,
): Vec3 {
  mouse.x = (mouseX / window.innerWidth) * 2 - 1
  mouse.y = -(mouseY / window.innerHeight) * 2 + 1

  // Raycast from the mouse position
  raycaster.setFromCamera(mouse, camera.value)

  // Create a plane in front of the camera
  const cameraDirection = new Vector3()
  camera.value.getWorldDirection(cameraDirection) // Get camera's forward direction

  const plane = new Plane()
  plane.setFromNormalAndCoplanarPoint(
    cameraDirection,
    camera.value.position.clone().add(cameraDirection.multiplyScalar(1)), // 1 unit in front of the camera
  )

  const intersection = new Vector3()
  raycaster.ray.intersectPlane(plane, intersection)
  return { x: intersection.x, y: intersection.y, z: intersection.z }
}

function defaultTookAt(eyeHeight: number): Vec3 {
  return {
    x: 0,
    y: eyeHeight,
    z: -100,
  }
}

function computeBoundingBox(vrmScene: Object3D) {
  const box = new Box3()
  const childBox = new Box3()

  vrmScene.updateMatrixWorld(true)

  vrmScene.traverse((obj) => {
    if (!obj.visible)
      return

    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.geometry)
      return

    if (mesh.name.startsWith('VRMC_springBone_collider'))
      return

    if (!mesh.geometry.boundingBox)
      mesh.geometry.computeBoundingBox()

    childBox.copy(mesh.geometry.boundingBox!)
    childBox.applyMatrix4(mesh.matrixWorld)
    box.union(childBox)
  })

  return box
}

function getEyePosition(activeVrm: VRM): number | null {
  const eye = activeVrm.humanoid?.getNormalizedBoneNode('head')
  if (!eye)
    return null

  const eyePos = new Vector3()
  eye.getWorldPosition(eyePos)
  return eyePos.y
}

function buildSceneBootstrap(activeVrm: VRM, cacheHit: boolean): SceneBootstrap {
  const bootstrapRoot = activeVrm.scene.parent ?? activeVrm.scene
  const box = computeBoundingBox(bootstrapRoot)
  const modelSize = new Vector3()
  const modelCenter = new Vector3()
  box.getSize(modelSize)
  box.getCenter(modelCenter)
  modelCenter.y += modelSize.y / 5

  const fov = camera.value?.fov ?? 40
  const radians = (fov / 2 * Math.PI) / 180
  const initialCameraOffset = new Vector3(
    modelSize.x / 16,
    modelSize.y / 8,
    -(modelSize.y / 3) / Math.tan(radians),
  )

  const eyePositionY = getEyePosition(activeVrm) ?? modelCenter.y
  const cameraPosition = modelCenter.clone().add(initialCameraOffset)

  return {
    cacheHit,
    cameraDistance: cameraPosition.distanceTo(modelCenter),
    cameraPosition: { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z },
    eyeHeight: eyePositionY,
    lookAtTarget: defaultTookAt(eyePositionY),
    modelOrigin: { x: modelCenter.x, y: modelCenter.y, z: modelCenter.z },
    modelSize: { x: modelSize.x, y: modelSize.y, z: modelSize.z },
  }
}

async function loadModel() {
  const requestId = invalidatePendingLoads()
  const loadReason: VrmLifecycleReason = vrmGroup.value ? 'model-switch' : 'initial-load'
  const loadStartedAt = performance.now()
  let nextVrm: VRM | undefined
  let nextVrmGroup: Group | undefined
  let nextVrmAnimationMixer: AnimationMixer | undefined
  let nextVrmEmote: ReturnType<typeof useVRMEmote> | undefined
  let didCommitLoad = false

  try {
    if (!scene.value) {
      await until(() => scene.value).toBeTruthy()
      if (!isLoadRequestCurrent(requestId))
        return
    }
    if (!modelSrc.value) {
      console.warn('NO model src, cannot load VRM model.')
      return
    }

    if (isStageThreeRuntimeTraceEnabled()) {
      stageThreeRuntimeTraceContext.emit(stageThreeTraceVrmLoadStartEvent, {
        modelSrc: modelSrc.value,
        reason: loadReason,
        rendererMemory: createThreeRendererMemorySnapshot(getRendererInstance()),
        sceneSummary: createVrmSceneSummarySnapshot(),
        ts: loadStartedAt,
      })
    }

    emit('loadStart')
    modelLoaded.value = false
    const reusableInstance = takeManagedVrmInstance(getManagedVrmScopeKey(), modelSrc.value)
    if (reusableInstance) {
      if (!isManagedVrmInstanceReusable(reusableInstance)) {
        destroyManagedVrmInstance(reusableInstance)
      }
      else {
        if (!isLoadRequestCurrent(requestId)) {
          destroyManagedVrmInstance(stashManagedVrmInstance(reusableInstance))
          return
        }

        if (!airiIblProbe && scene.value)
          airiIblProbe = createIblProbeController(scene.value)

        if (loadReason === 'model-switch') {
          componentCleanUp('model-switch', { invalidate: false })
        }

        emit('sceneBootstrap', buildSceneBootstrap(reusableInstance.vrm, true))
        commitManagedVrmInstance(reusableInstance)
        didCommitLoad = true

        if (isStageThreeRuntimeTraceEnabled()) {
          stageThreeRuntimeTraceContext.emit(stageThreeTraceVrmLoadEndEvent, {
            durationMs: performance.now() - loadStartedAt,
            modelSrc: modelSrc.value,
            reason: loadReason,
            rendererMemory: createThreeRendererMemorySnapshot(getRendererInstance()),
            sceneSummary: createVrmSceneSummarySnapshot({ mixer: reusableInstance.mixer, vrm: reusableInstance.vrm }),
            ts: performance.now(),
          })
        }
        return
      }
    }

    const _vrmInfo = await loadVrm(modelSrc.value, {
      lookAt: true,
      onProgress: progress => emit(
        'loadingProgress',
        Number((100 * progress.loaded / progress.total).toFixed(2)),
      ),
    })
    if (!_vrmInfo || !_vrmInfo._vrm || !_vrmInfo._vrmGroup) {
      if (isLoadRequestCurrent(requestId)) {
        emitVrmLoadError(loadReason, loadStartedAt, 'VRM model loading failure')
        console.warn('VRM model loading failure!')
        emit('error', new Error('VRM model loading failure'))
      }
      return
    }
    const {
      _vrm,
      _vrmGroup,
    } = _vrmInfo
    nextVrm = _vrm
    nextVrmGroup = _vrmGroup

    if (!isLoadRequestCurrent(requestId)) {
      disposeDetachedVrm(nextVrm, nextVrmGroup)
      return
    }

    /*
      * Animation setting
    */
    const animation = await loadVRMAnimation(idleAnimation.value)
    const clip = await clipFromVRMAnimation(_vrm, animation)
    if (!isLoadRequestCurrent(requestId)) {
      disposeDetachedVrm(nextVrm, nextVrmGroup)
      return
    }
    if (!clip) {
      disposeDetachedVrm(nextVrm, nextVrmGroup)
      emitVrmLoadError(loadReason, loadStartedAt, 'No VRM animation loaded')
      console.warn('No VRM animation loaded')
      if (isLoadRequestCurrent(requestId))
        emit('error', new Error('No VRM animation loaded'))
      return
    }
    // Re-anchor the root position track to the model origin
    reAnchorRootPositionTrack(clip, _vrm)

    // play animation
    nextVrmAnimationMixer = new AnimationMixer(_vrm.scene)
    idleClipAction.value = nextVrmAnimationMixer.clipAction(clip)
    idleClipAction.value.play()

    nextVrmEmote = useVRMEmote(_vrm)

    /*
      * Shader setting
    */
    // material selection
    function isMToon(mat: any): boolean {
      return !!(mat?.isShaderMaterial && mat.userData?.vrmMaterialType === 'MToon'
      )
    }
    const isShaderMat = (m: any): m is ShaderMaterial => !!m?.isShaderMaterial

    // MToon material sky box lightProbe setting
    if (!airiIblProbe && scene.value)
      airiIblProbe = createIblProbeController(scene.value)

    // Material traverse setting
    _vrm.scene.traverse((child) => {
      if (child instanceof Mesh && child.material) {
        const material = Array.isArray(child.material) ? child.material : [child.material]
        material.forEach((mat) => {
          if (mat instanceof MeshStandardMaterial || mat instanceof MeshPhysicalMaterial) {
            // Should read envMap intensity from outside props
            mat.envMapIntensity = 1.0
            mat.needsUpdate = true
          }
          else if (isMToon(mat)) {
            // --- MToon material, add IBL lightProbe only ---
            // close tone mapping for NPR materials
            if ('toneMapped' in mat)
              mat.toneMapped = false
          }
          else if (isShaderMat(mat)) {
            // --- Shader material, further IBL injection needed ---
            // TODO: stylised shader injection
            // Lilia: I plan to replace all injected shader code to be my own, so that it can always avoid double injection and unknown user upload VRM injected shader behaviour...
            if ('toneMapped' in mat)
              mat.toneMapped = false
            if ('envMap' in mat && mat.envMap)
              mat.envMap = null
            // NPR materials usually use sRGB textures
            const tex = (mat as any).map as Texture | undefined
            if (tex && (tex as any).colorSpace !== undefined) {
              try {
                (tex as any).colorSpace = SRGBColorSpace
              }
              catch (e) {
                console.warn('Failed to set colorSpace on texture:', e)
              }
            }
            injectDiffuseIBL(mat)
          }
        })
      }
    })

    if (loadReason === 'model-switch') {
      componentCleanUp('model-switch', { invalidate: false })
    }

    emit('sceneBootstrap', buildSceneBootstrap(_vrm, false))

    commitManagedVrmInstance(createManagedVrmInstance({
      emote: nextVrmEmote,
      group: _vrmGroup,
      idleAction: idleClipAction.value,
      mixer: nextVrmAnimationMixer,
      vrm: _vrm,
    }))
    didCommitLoad = true

    if (isStageThreeRuntimeTraceEnabled()) {
      stageThreeRuntimeTraceContext.emit(stageThreeTraceVrmLoadEndEvent, {
        durationMs: performance.now() - loadStartedAt,
        modelSrc: modelSrc.value,
        reason: loadReason,
        rendererMemory: createThreeRendererMemorySnapshot(getRendererInstance()),
        sceneSummary: createVrmSceneSummarySnapshot({ mixer: vrmAnimationMixer.value, vrm: _vrm }),
        ts: performance.now(),
      })
    }
  }
  catch (err) {
    if (!didCommitLoad) {
      nextVrmAnimationMixer?.stopAllAction()
      disposeDetachedVrm(nextVrm, nextVrmGroup)
    }
    if (!isLoadRequestCurrent(requestId))
      return

    emitVrmLoadError(loadReason, loadStartedAt, err)
    console.error(err)
    emit('error', err)
  }
}

onMounted(async () => {
  // watch if the model needs to be reloaded
  // Registered BEFORE the initial load to avoid missing src changes
  // that arrive while the first loadModel() is still in-flight.
  watch(modelSrc, (newSrc, oldSrc) => {
    if (newSrc !== oldSrc) {
      loadModel()
    }
  })

  // wait until scene is not undefined
  await until(() => scene.value).toBeTruthy()
  await loadModel()

  /*
    * Downward info flow
    * - Pinia store value updated => command take effect
  */
  // watch if the animation should be paused
  watch(paused, (isPaused) => {
    if (isPaused) {
      stop()
    }
    else {
      start()
    }
  }, { immediate: true })
  // update model position
  watch(modelOffset, () => {
    if (vrmGroup.value) {
      vrmGroup.value.position.set(
        modelOffset.value.x,
        modelOffset.value.y,
        modelOffset.value.z,
      )
    }
  }, { immediate: true, deep: true })
  // update model rotation
  watch(modelRotationY, (newRotationY) => {
    if (vrmGroup.value) {
      vrmGroup.value.rotation.y = MathUtils.degToRad(newRotationY)
    }
  }, { immediate: true })
  // update NPR sky box
  watch([envSelect, skyBoxIntensity, nprIrrSH], async () => {
    if (!vrm.value)
      return
    // force the program to flush
    nprProgramVersion.value += 1
    const mode = normalizeEnvMode(envSelect.value)

    // TODO: after bumping up to three 0.180.0 with @types/three 0.180.0,
    //   Argument of type 'Group<Object3DEventMap>' is not assignable to parameter of type 'Object3D<Object3DEventMap>'.
    //     Type 'Group<Object3DEventMap>' is missing the following properties from type 'Object3D<Object3DEventMap>': setPointerCapture, releasePointerCapture, hasPointerCapture
    //
    // Currently, AFAIK, https://github.com/pmndrs/xr/blob/456aa380206e93888cd3a5741a1534e672ae3106/packages/pointer-events/src/pointer.ts#L69-L100 declares
    // declare module 'three' {
    //   interface Object3D {
    //     setPointerCapture(pointerId: number): void
    //     releasePointerCapture(pointerId: number): void
    //     hasPointerCapture(pointerId: number): boolean

    //     intersectChildren?: boolean
    //     interactableDescendants?: Array<Object3D>
    //     /**
    //      * @deprecated
    //      */
    //     ancestorsHaveListeners?: boolean
    //     ancestorsHavePointerListeners?: boolean
    //     ancestorsHaveWheelListeners?: boolean
    //   }
    // }
    //
    // And in @tresjs/core v5, it uses the @pmndrs/pointer-events internally.
    // Somehow the Object3D from @types/three and the one augmented by @pmndrs/pointer-events are not compatible.
    // This needs to be fixed later.
    updateNprShaderSetting(vrm.value?.scene as unknown as Object3D, {
      mode,
      intensity: skyBoxIntensity.value,
      sh: nprIrrSH.value ?? null,
    })
    airiIblProbe?.update(mode, skyBoxIntensity.value, nprIrrSH.value ?? null)
  }, { immediate: true })
  // update eye tracking mode
  watch(trackingMode, (newMode) => {
    stopCameraWatch?.()
    stopCameraWatch = undefined
    stopMouseWatch?.()
    stopMouseWatch = undefined
    if (newMode === 'camera') {
      stopCameraWatch = watch(cameraPosition, (newPosition) => {
        // watch to update look at target to camera
        emit('lookAtTarget', newPosition)
      }, { immediate: true, deep: true })
    }
    else if (newMode === 'mouse') {
      stopMouseWatch = watch([mouseX, mouseY], ([newX, newY]) => {
        mouseTarget.value = lookAtMouse(newX, newY, camera)
        // watch to update look at target to mouse
        emit('lookAtTarget', mouseTarget.value)
      }, { immediate: true, deep: true })
    }
    else {
      emit('lookAtTarget', defaultTookAt(eyeHeight.value))
    }
  }, { immediate: true })
  watch(lookAtTarget, (newTarget) => {
    idleEyeSaccades.instantUpdate(vrm.value, newTarget)
  }, { deep: true })
  watch([externalLookAtScreenPoint, trackingMode], ([screenPoint, mode]) => {
    if (!screenPoint || mode !== 'none')
      return

    idleEyeSaccades.instantUpdate(vrm.value, lookAtMouse(screenPoint.x, screenPoint.y, camera))
  }, { deep: true, immediate: true })

  watch(customExpressionBindings, () => {
    const activePerformanceState = performanceState.value
    if (activePerformanceState && activePerformanceState.phase !== 'idle') {
      applyDialogueExpressionFromState(activePerformanceState)
      return
    }

    if (lastDialoguePerformance.value)
      applyDialogueExpression(lastDialoguePerformance.value)
  }, { deep: true })
  watch(
    [
      () => performanceState.value?.phase ?? 'idle',
      () => performanceState.value?.performance.baseEmotion ?? 'neutral',
      () => performanceState.value?.performance.facialCue ?? null,
      () => performanceState.value?.activeCue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
      () => Math.round((performanceState.value?.expressionIntensity ?? 0) * 10),
      () => Math.round((performanceState.value?.facialCueIntensity ?? 0) * 10),
    ],
    () => {
      applyDialogueExpressionFromState(performanceState.value)
    },
    { immediate: true },
  )
  watch(
    () => performanceState.value?.actionPulse.revision ?? 0,
    async (revision) => {
      if (!revision || revision === lastAppliedActionPulseRevision.value)
        return

      lastAppliedActionPulseRevision.value = revision
      const actionCue = performanceState.value?.actionPulse.cue?.trim()
      if (!actionCue)
        return

      const actionBinding = (actionBindings.value ?? [])
        .find(item => item.actionKey === actionCue)
      if (actionBinding) {
        await playActionBinding(actionBinding, {
          fadeDuration: resolveRendererSettleActionFadeFromPerformanceState(performanceState.value),
        })
      }
    },
    { immediate: true },
  )
  watch(idleActionPreference, async (preference, previousPreference) => {
    const nextKey = buildIdleActionPreferenceKey(preference)
    const previousKey = buildIdleActionPreferenceKey(previousPreference)
    if (nextKey === previousKey)
      return

    if (transientClipAction.value || speechRenderState.value?.active)
      return

    await applyIdleActionPreference(preference, { force: true })
  }, { deep: true })
  watch([
    () => transientClipAction.value,
    () => speechRenderState.value?.active === true,
  ], async ([activeTransient, speechActive], [previousTransient, previousSpeechActive]) => {
    if (activeTransient || speechActive)
      return

    if (!previousTransient && !previousSpeechActive)
      return

    await applyIdleActionPreference(idleActionPreference.value)
  })
  watch(modelLoaded, async (loaded) => {
    if (!loaded)
      return

    applyDialogueExpressionFromState(performanceState.value)
    await applyIdleActionPreference(idleActionPreference.value, { force: true })
  }, { immediate: true })
})

onUnmounted(() => {
  componentCleanUp('component-unmount')
})

if (import.meta.hot) {
  // Ensure cleanup on HMR
  import.meta.hot.dispose(() => {
    componentCleanUp('manual-reload')
  })
}

defineExpose({
  setExpression(expression: string, intensity = 1) {
    vrmEmote.value?.setEmotionWithResetAfter(expression, 3000, intensity)
  },
  async applyPerformance(performance: DialoguePerformanceInput) {
    await applyDialoguePerformance(performance)
  },
  async playActionBinding(binding: VrmActionBinding) {
    await playActionBinding(binding)
  },
  listCustomExpressionNames() {
    return [...customExpressionNames.value]
  },
  getRuntimeCapabilities() {
    return buildRuntimeCapabilitySnapshot(vrm.value)
  },
  setVrmFrameHook(hook?: VrmFrameHook) {
    vrmFrameHook.value = hook
  },
  scene: computed(() => vrm.value?.scene),
  lookAtUpdate(target: Vec3) {
    idleEyeSaccades.instantUpdate(vrm.value, target)
  },
})
</script>

<template>
  <slot v-if="modelLoaded" />
</template>
