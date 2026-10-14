import { AnimationClip, AnimationMixer, LoopOnce, Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import { createVrmAnimationPlaybackState, stepVrmAnimationPlayback } from './animation-playback-state'
import { createVrmProceduralGestureClip } from './procedural-gestures'

describe('rendered animation ownership', () => {
  it('moves the semantic head and releases its exact owned action on the actual Three.js completion event', () => {
    const root = new Object3D()
    const head = new Object3D()
    root.add(head)
    const state = createVrmAnimationPlaybackState()
    const mixer = new AnimationMixer(root)
    state.mixer.value = mixer
    state.idleAction.value = mixer.clipAction(new AnimationClip('idle', 2, []))
    state.idleAction.value.play()
    const clip = createVrmProceduralGestureClip({ getNormalizedBoneNode: name => name === 'head' ? head : null }, 'nod')!
    const action = state.mixer.value.clipAction(clip)
    state.transientAction.value = action
    action.setLoop(LoopOnce, 1).play()
    let finished = 0
    let peak = 0
    state.mixer.value.addEventListener('finished', (event) => {
      if (event.action === state.transientAction.value) {
        finished += 1
        event.action.stop()
        state.transientAction.value = undefined
      }
    })
    for (let frame = 0; frame < 120; frame++) {
      stepVrmAnimationPlayback(state.mixer.value, 1 / 60)
      peak = Math.max(peak, head.quaternion.angleTo(new Object3D().quaternion))
    }
    expect(peak).toBeGreaterThan(0.1)
    expect(finished).toBe(1)
    expect(state.transientAction.value).toBeUndefined()
    expect(state.mixer.value).toBe(mixer)
  })

  it('keeps an actual short gesture visible after long frame stalls and still finishes', () => {
    const root = new Object3D()
    const head = new Object3D()
    root.add(head)
    const mixer = new AnimationMixer(root)
    const clip = createVrmProceduralGestureClip({ getNormalizedBoneNode: name => name === 'head' ? head : null }, 'nod')!
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play()
    let peak = 0
    stepVrmAnimationPlayback(mixer, 5)
    expect(action.time).toBeCloseTo(0.1)
    expect(action.isRunning()).toBe(true)
    for (let frame = 0; frame < 20; frame++) {
      stepVrmAnimationPlayback(mixer, 0.5)
      peak = Math.max(peak, head.quaternion.angleTo(new Object3D().quaternion))
    }
    expect(peak).toBeGreaterThan(0.1)
    expect(action.isRunning()).toBe(false)
  })
})
