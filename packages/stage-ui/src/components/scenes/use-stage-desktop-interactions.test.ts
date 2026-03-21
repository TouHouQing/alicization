// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'

import {
  applyLive2dAbsoluteAnchor,
  applyLive2dDragDelta,
  applyLive2dWheelDelta,
  applyVrmDragDelta,
  applyVrmWheelDelta,
  useStageDesktopInteractions,
} from './use-stage-desktop-interactions'

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class TestPointerEvent extends MouseEvent {
    pointerId: number

    constructor(type: string, init?: PointerEventInit) {
      super(type, init)
      this.pointerId = init?.pointerId ?? 0
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    value: TestPointerEvent,
    writable: true,
  })
}

function createStageElement() {
  const element = document.createElement('div')
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      bottom: 900,
      height: 900,
      left: 0,
      right: 1600,
      top: 0,
      width: 1600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })
  document.body.appendChild(element)
  return element
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('stage desktop interaction helpers', () => {
  it('maps live2d drag to an absolute anchor position on screen', () => {
    expect(applyLive2dAbsoluteAnchor(510, 620, 30, -40, {
      left: 0,
      top: 0,
      width: 1600,
      height: 900,
    })).toEqual({
      x: -20,
      y: -26.666666666666668,
    })
  })

  it('maps live2d drag to pixel offsets for desktop canvas mode', () => {
    expect(applyLive2dAbsoluteAnchor(510, 620, 30, -40, {
      left: 0,
      top: 0,
      width: 1600,
      height: 900,
    }, 'pixel')).toEqual({
      x: -320,
      y: -240,
    })
  })

  it('does not clamp live2d vertical dragging in desktop pixel mode', () => {
    expect(applyLive2dAbsoluteAnchor(640, 720, 0, -420, {
      left: 0,
      top: 0,
      width: 1600,
      height: 900,
    }, 'pixel')).toEqual({
      x: -160,
      y: 240,
    })
  })

  it('applies live2d desktop dragging as a direct delta from the initial position', () => {
    expect(applyLive2dDragDelta({ x: 120, y: -80 }, 160, -120, {
      width: 1600,
      height: 900,
    }, 'pixel')).toEqual({
      x: 280,
      y: -200,
    })
  })

  it('applies live2d wheel zoom with clamping', () => {
    expect(applyLive2dWheelDelta(1, -120)).toBeGreaterThan(1)
    expect(applyLive2dWheelDelta(0.22, 400)).toBeGreaterThanOrEqual(0.2)
  })

  it('applies vrm drag deltas in world space', () => {
    const next = applyVrmDragDelta({ x: 0, y: 0, z: 0 }, 160, 90, 1600, 900, 2, 40)
    expect(next.x).toBeGreaterThan(0)
    expect(next.y).toBeLessThan(0)
    expect(next.z).toBe(0)
  })

  it('applies vrm wheel zoom around the bootstrap distance', () => {
    const zoomIn = applyVrmWheelDelta(2, -120, 2)
    const zoomOut = applyVrmWheelDelta(2, 120, 2)
    expect(zoomIn).toBeLessThan(2)
    expect(zoomOut).toBeGreaterThan(2)
  })
})

describe('useStageDesktopInteractions', () => {
  it('handles live2d drag with absolute mouse following and toggles interaction activity', () => {
    const stageElement = createStageElement()
    const activity: boolean[] = []
    const live2dPosition = ref({ x: 0, y: 0 })
    const scope = effectScope()

    const interactions = scope.run(() => useStageDesktopInteractions({
      stageElement: ref(stageElement),
      dialogueElement: () => undefined,
      stageModelRenderer: ref<'live2d' | 'vrm' | 'disabled'>('live2d'),
      live2dHandle: () => ({
        characterFrame: () => ({
          left: 180,
          right: 460,
          top: 120,
          bottom: 780,
          centerX: 320,
          anchorY: 240,
        }),
        hitTestClientPoint: () => true,
      }),
      vrmHandle: () => undefined,
      live2dPositionMode: ref<'percent' | 'pixel'>('percent'),
      live2dPosition,
      live2dScale: ref(1),
      vrmModelOffset: ref({ x: 0, y: 0, z: 0 }),
      vrmCameraDistance: ref(2),
      vrmBootstrapCameraDistance: ref(2),
      vrmCameraFov: ref(40),
      onInteractionChange(active) {
        activity.push(active)
      },
    }))!

    stageElement.addEventListener('pointerdown', interactions.handlePointerDown as EventListener)
    stageElement.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 350,
      clientY: 740,
      pointerId: 1,
    }))
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 510,
      clientY: 620,
      pointerId: 1,
    }))
    window.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      clientX: 510,
      clientY: 620,
      pointerId: 1,
    }))

    expect(live2dPosition.value.x).toBeCloseTo(10)
    expect(live2dPosition.value.y).toBeCloseTo(-13.3333333333)
    expect(interactions.isInteracting.value).toBe(false)
    expect(activity).toContain(true)
    expect(activity.at(-1)).toBe(false)
    scope.stop()
  })

  it('handles wheel zoom and clears transient interaction activity', () => {
    vi.useFakeTimers()
    const stageElement = createStageElement()
    const activity: boolean[] = []
    const live2dScale = ref(1)
    const scope = effectScope()

    const interactions = scope.run(() => useStageDesktopInteractions({
      stageElement: ref(stageElement),
      dialogueElement: () => undefined,
      stageModelRenderer: ref<'live2d' | 'vrm' | 'disabled'>('live2d'),
      live2dHandle: () => ({
        characterFrame: () => ({
          left: 180,
          right: 460,
          top: 120,
          bottom: 780,
          centerX: 320,
          anchorY: 240,
        }),
        hitTestClientPoint: () => true,
      }),
      vrmHandle: () => undefined,
      live2dPositionMode: ref<'percent' | 'pixel'>('percent'),
      live2dPosition: ref({ x: 0, y: 0 }),
      live2dScale,
      vrmModelOffset: ref({ x: 0, y: 0, z: 0 }),
      vrmCameraDistance: ref(2),
      vrmBootstrapCameraDistance: ref(2),
      vrmCameraFov: ref(40),
      onInteractionChange(active) {
        activity.push(active)
      },
    }))!

    stageElement.addEventListener('wheel', interactions.handleWheel as EventListener, { passive: false })
    stageElement.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 420,
      clientY: 360,
      deltaY: -160,
    }))

    expect(live2dScale.value).toBeGreaterThan(1)
    expect(interactions.isInteracting.value).toBe(true)
    vi.advanceTimersByTime(200)
    expect(interactions.isInteracting.value).toBe(false)
    expect(activity.at(-1)).toBe(false)
    scope.stop()
  })

  it('handles live2d drag in pixel mode for desktop canvas layout', () => {
    const stageElement = createStageElement()
    const live2dPosition = ref({ x: 0, y: 0 })
    const scope = effectScope()

    const interactions = scope.run(() => useStageDesktopInteractions({
      stageElement: ref(stageElement),
      dialogueElement: () => undefined,
      stageModelRenderer: ref<'live2d' | 'vrm' | 'disabled'>('live2d'),
      live2dHandle: () => ({
        characterFrame: () => ({
          left: 180,
          right: 460,
          top: 120,
          bottom: 780,
          centerX: 320,
          anchorY: 240,
        }),
        hitTestClientPoint: () => true,
      }),
      vrmHandle: () => undefined,
      live2dPositionMode: ref<'percent' | 'pixel'>('pixel'),
      live2dPosition,
      live2dScale: ref(1),
      vrmModelOffset: ref({ x: 0, y: 0, z: 0 }),
      vrmCameraDistance: ref(2),
      vrmBootstrapCameraDistance: ref(2),
      vrmCameraFov: ref(40),
    }))!

    stageElement.addEventListener('pointerdown', interactions.handlePointerDown as EventListener)
    stageElement.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 350,
      clientY: 740,
      pointerId: 1,
    }))
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 510,
      clientY: 620,
      pointerId: 1,
    }))

    expect(live2dPosition.value).toEqual({
      x: 160,
      y: -120,
    })
    scope.stop()
  })

  it('allows live2d vertical dragging even when the dragged anchor would go below the screen', () => {
    const stageElement = createStageElement()
    const live2dPosition = ref({ x: 0, y: 0 })
    const scope = effectScope()

    const interactions = scope.run(() => useStageDesktopInteractions({
      stageElement: ref(stageElement),
      dialogueElement: () => undefined,
      stageModelRenderer: ref<'live2d' | 'vrm' | 'disabled'>('live2d'),
      live2dHandle: () => ({
        characterFrame: () => ({
          left: 280,
          right: 760,
          top: 60,
          bottom: 920,
          centerX: 520,
          anchorY: 180,
        }),
        hitTestClientPoint: () => true,
      }),
      vrmHandle: () => undefined,
      live2dPositionMode: ref<'percent' | 'pixel'>('pixel'),
      live2dPosition,
      live2dScale: ref(1),
      vrmModelOffset: ref({ x: 0, y: 0, z: 0 }),
      vrmCameraDistance: ref(2),
      vrmBootstrapCameraDistance: ref(2),
      vrmCameraFov: ref(40),
    }))!

    stageElement.addEventListener('pointerdown', interactions.handlePointerDown as EventListener)
    stageElement.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 520,
      clientY: 420,
      pointerId: 1,
    }))
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 520,
      clientY: 700,
      pointerId: 1,
    }))

    expect(live2dPosition.value.y).toBe(280)
    scope.stop()
  })

  it('keeps the initial live2d position when desktop drag starts without pointer movement', () => {
    const stageElement = createStageElement()
    const live2dPosition = ref({ x: 135, y: -48 })
    const scope = effectScope()

    const interactions = scope.run(() => useStageDesktopInteractions({
      stageElement: ref(stageElement),
      dialogueElement: () => undefined,
      stageModelRenderer: ref<'live2d' | 'vrm' | 'disabled'>('live2d'),
      live2dHandle: () => ({
        characterFrame: () => ({
          left: 280,
          right: 760,
          top: 80,
          bottom: 780,
          centerX: 520,
          anchorY: 200,
        }),
        dragAnchorClientPoint: () => ({
          x: 800,
          y: 900,
        }),
        hitTestClientPoint: () => true,
      }),
      vrmHandle: () => undefined,
      live2dPositionMode: ref<'percent' | 'pixel'>('pixel'),
      live2dPosition,
      live2dScale: ref(1),
      vrmModelOffset: ref({ x: 0, y: 0, z: 0 }),
      vrmCameraDistance: ref(2),
      vrmBootstrapCameraDistance: ref(2),
      vrmCameraFov: ref(40),
    }))!

    stageElement.addEventListener('pointerdown', interactions.handlePointerDown as EventListener)
    stageElement.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 520,
      clientY: 600,
      pointerId: 1,
    }))
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 520,
      clientY: 600,
      pointerId: 1,
    }))

    expect(live2dPosition.value).toEqual({
      x: 135,
      y: -48,
    })
    scope.stop()
  })
})
