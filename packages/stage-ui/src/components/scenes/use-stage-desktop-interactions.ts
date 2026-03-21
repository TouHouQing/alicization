import type { Ref } from 'vue'

import type { StageModelRenderer } from '../../stores/settings'
import type { StageCharacterFrame } from '../../utils'

import { computed, onScopeDispose, ref, watch } from 'vue'

interface StageCharacterHandle {
  characterFrame: () => StageCharacterFrame | null | undefined
  dragAnchorClientPoint?: () => { x: number, y: number } | null | undefined
  hitTestClientPoint: (clientX: number, clientY: number) => boolean
}

interface UseStageDesktopInteractionsOptions {
  stageElement: Ref<HTMLElement | null>
  dialogueElement: () => HTMLElement | undefined
  live2dHandle: () => StageCharacterHandle | undefined
  vrmHandle: () => StageCharacterHandle | undefined
  onInteractionChange?: (active: boolean) => void
  live2dPositionMode: Ref<'percent' | 'pixel'>
  live2dPosition: Ref<{ x: number, y: number }>
  live2dScale: Ref<number>
  stageModelRenderer: Ref<StageModelRenderer>
  vrmBootstrapCameraDistance: Ref<number>
  vrmCameraDistance: Ref<number>
  vrmCameraFov: Ref<number>
  vrmModelOffset: Ref<{ x: number, y: number, z: number }>
}

type DragInteraction
  = | {
    pointerId: number
    startClientX: number
    startClientY: number
    startPosition: { x: number, y: number }
    type: 'live2d'
  }
  | {
    pointerId: number
    startClientX: number
    startClientY: number
    startOffset: { x: number, y: number, z: number }
    type: 'vrm'
  }

const live2dPositionLimit = 1000
const live2dScaleMin = 0.2
const live2dScaleMax = 3
const vrmCameraDistanceMin = 0.2
const vrmCameraDistanceMaxMultiplier = 3

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min

  return Math.min(max, Math.max(min, value))
}

function normalizeWheelFactor(deltaY: number) {
  return clampNumber(1 + deltaY * 0.0015, 0.82, 1.18)
}

function resolveStageRect(stageElement: HTMLElement | null) {
  const rect = stageElement?.getBoundingClientRect()
  return {
    left: rect?.left ?? 0,
    top: rect?.top ?? 0,
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
  }
}

export function applyLive2dAbsoluteAnchor(
  clientX: number,
  clientY: number,
  pointerToAnchorX: number,
  pointerToAnchorY: number,
  stageRect: { left: number, top: number, width: number, height: number },
  mode: 'percent' | 'pixel' = 'percent',
) {
  if (!stageRect.width || !stageRect.height)
    return { x: 0, y: 0 }

  const anchorX = clientX - pointerToAnchorX - stageRect.left
  const anchorY = clientY - pointerToAnchorY - stageRect.top

  if (mode === 'pixel') {
    return {
      x: anchorX - stageRect.width / 2,
      y: anchorY - stageRect.height,
    }
  }

  return {
    x: clampNumber(((clampNumber(anchorX, 0, stageRect.width) - stageRect.width / 2) / stageRect.width) * 100, -live2dPositionLimit, live2dPositionLimit),
    y: clampNumber(((clampNumber(anchorY, 0, stageRect.height) - stageRect.height) / stageRect.height) * 100, -live2dPositionLimit, live2dPositionLimit),
  }
}

export function applyLive2dDragDelta(
  startPosition: { x: number, y: number },
  deltaX: number,
  deltaY: number,
  stageRect: { width: number, height: number },
  mode: 'percent' | 'pixel' = 'percent',
) {
  if (mode === 'pixel') {
    return {
      x: startPosition.x + deltaX,
      y: startPosition.y + deltaY,
    }
  }

  if (!stageRect.width || !stageRect.height)
    return startPosition

  return {
    x: clampNumber(startPosition.x + (deltaX / stageRect.width) * 100, -live2dPositionLimit, live2dPositionLimit),
    y: clampNumber(startPosition.y + (deltaY / stageRect.height) * 100, -live2dPositionLimit, live2dPositionLimit),
  }
}

export function applyLive2dWheelDelta(currentScale: number, deltaY: number) {
  const factor = normalizeWheelFactor(deltaY)
  return clampNumber(currentScale / factor, live2dScaleMin, live2dScaleMax)
}

function resolveVrmDistanceRange(bootstrapDistance: number) {
  const normalizedBootstrap = bootstrapDistance > 1e-6 ? bootstrapDistance : 1
  const min = Math.max(vrmCameraDistanceMin, normalizedBootstrap * 0.35)
  const max = Math.max(min + 0.5, normalizedBootstrap * vrmCameraDistanceMaxMultiplier)
  return { min, max }
}

export function applyVrmDragDelta(
  currentOffset: { x: number, y: number, z: number },
  deltaX: number,
  deltaY: number,
  stageWidth: number,
  stageHeight: number,
  cameraDistance: number,
  cameraFov: number,
) {
  if (!stageWidth || !stageHeight || !Number.isFinite(cameraDistance) || cameraDistance <= 0)
    return currentOffset

  const verticalSpan = 2 * cameraDistance * Math.tan((cameraFov * Math.PI) / 360)
  const horizontalSpan = verticalSpan * (stageWidth / Math.max(stageHeight, 1))

  return {
    x: currentOffset.x + (deltaX / stageWidth) * horizontalSpan,
    y: currentOffset.y - (deltaY / stageHeight) * verticalSpan,
    z: currentOffset.z,
  }
}

export function applyVrmWheelDelta(currentDistance: number, deltaY: number, bootstrapDistance: number) {
  const factor = normalizeWheelFactor(deltaY)
  const { min, max } = resolveVrmDistanceRange(bootstrapDistance)
  const baseDistance = currentDistance > 1e-6 ? currentDistance : bootstrapDistance
  return clampNumber(baseDistance * factor, min, max)
}

function isTargetWithinElement(event: Event, element?: HTMLElement) {
  if (!element)
    return false

  const target = event.target
  return target instanceof Node && element.contains(target)
}

export function useStageDesktopInteractions(options: UseStageDesktopInteractionsOptions) {
  const dragInteraction = ref<DragInteraction | null>(null)
  const wheelActive = ref(false)
  const isInteracting = computed(() => Boolean(dragInteraction.value) || wheelActive.value)
  let wheelTimer: ReturnType<typeof setTimeout> | undefined

  function setWheelActive(active: boolean) {
    wheelActive.value = active
  }

  function touchWheelActivity() {
    setWheelActive(true)
    if (wheelTimer)
      clearTimeout(wheelTimer)
    wheelTimer = setTimeout(() => {
      wheelTimer = undefined
      setWheelActive(false)
    }, 180)
  }

  function getCharacterHandle() {
    if (options.stageModelRenderer.value === 'live2d')
      return options.live2dHandle()

    if (options.stageModelRenderer.value === 'vrm')
      return options.vrmHandle()

    return undefined
  }

  function clearDragInteraction() {
    dragInteraction.value = null
  }

  function removePointerListeners() {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || dragInteraction.value)
      return

    if (isTargetWithinElement(event, options.dialogueElement()))
      return

    const renderer = options.stageModelRenderer.value
    if (renderer !== 'live2d' && renderer !== 'vrm')
      return

    const handle = getCharacterHandle()
    if (!handle)
      return

    const frame = handle?.characterFrame()
    if (!frame || !handle.hitTestClientPoint(event.clientX, event.clientY))
      return

    if (renderer === 'live2d') {
      dragInteraction.value = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPosition: { ...options.live2dPosition.value },
        type: 'live2d',
      }
    }
    else {
      dragInteraction.value = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startOffset: { ...options.vrmModelOffset.value },
        type: 'vrm',
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    event.preventDefault()
  }

  function handlePointerMove(event: PointerEvent) {
    const interaction = dragInteraction.value
    if (!interaction || interaction.pointerId !== event.pointerId)
      return

    const stageRect = resolveStageRect(options.stageElement.value)
    if (interaction.type === 'live2d') {
      options.live2dPosition.value = applyLive2dDragDelta(
        interaction.startPosition,
        event.clientX - interaction.startClientX,
        event.clientY - interaction.startClientY,
        stageRect,
        options.live2dPositionMode.value,
      )
      return
    }

    const bootstrapDistance = options.vrmBootstrapCameraDistance.value > 1e-6
      ? options.vrmBootstrapCameraDistance.value
      : 1
    const activeDistance = options.vrmCameraDistance.value > 1e-6
      ? options.vrmCameraDistance.value
      : bootstrapDistance

    options.vrmModelOffset.value = applyVrmDragDelta(
      interaction.startOffset,
      event.clientX - interaction.startClientX,
      event.clientY - interaction.startClientY,
      stageRect.width,
      stageRect.height,
      activeDistance,
      options.vrmCameraFov.value,
    )
  }

  function handlePointerUp(event: PointerEvent) {
    const interaction = dragInteraction.value
    if (!interaction || interaction.pointerId !== event.pointerId)
      return

    removePointerListeners()
    clearDragInteraction()
  }

  function handleWheel(event: WheelEvent) {
    if (isTargetWithinElement(event, options.dialogueElement()))
      return

    const handle = getCharacterHandle()
    if (!handle?.hitTestClientPoint(event.clientX, event.clientY))
      return

    if (options.stageModelRenderer.value === 'live2d') {
      options.live2dScale.value = applyLive2dWheelDelta(options.live2dScale.value, event.deltaY)
    }
    else {
      const bootstrapDistance = options.vrmBootstrapCameraDistance.value > 1e-6
        ? options.vrmBootstrapCameraDistance.value
        : 1
      options.vrmCameraDistance.value = applyVrmWheelDelta(
        options.vrmCameraDistance.value,
        event.deltaY,
        bootstrapDistance,
      )
    }

    touchWheelActivity()
    event.preventDefault()
  }

  watch(isInteracting, (active) => {
    options.onInteractionChange?.(active)
  }, { flush: 'sync', immediate: true })

  onScopeDispose(() => {
    if (wheelTimer)
      clearTimeout(wheelTimer)
    removePointerListeners()
  })

  return {
    characterFrame: computed(() => getCharacterHandle()?.characterFrame() ?? null),
    handlePointerDown,
    handleWheel,
    isInteracting,
  }
}
