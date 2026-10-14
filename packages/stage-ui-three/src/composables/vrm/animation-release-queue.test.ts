import { AnimationClip, AnimationMixer, LoopOnce, NumberKeyframeTrack, Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import { createVrmAnimationReleaseQueue } from './animation-release-queue'

describe('actual mixer completion cleanup', () => {
  it('keeps a later activated working posture running when the earlier gesture finishes', () => {
    const root = new Object3D()
    const mixer = new AnimationMixer(root)
    const queue = createVrmAnimationReleaseQueue()
    const gesture = new AnimationClip('gesture', 0.05, [new NumberKeyframeTrack('.position[x]', [0, 0.05], [0, 1])])
    const action = mixer.clipAction(gesture).setLoop(LoopOnce, 1).play()
    action.clampWhenFinished = true
    const work = new AnimationClip('work', 1, [new NumberKeyframeTrack('.position[y]', [0, 1], [0, 1])])
    const base = mixer.clipAction(work).play()
    let completed = 0
    mixer.addEventListener('finished', (event) => {
      if (event.action === action) {
        completed++
        queue.retire(action, mixer, gesture, 0.15)
      }
    })
    expect(() => mixer.update(0.1)).not.toThrow()
    expect(completed).toBe(1)
    expect(mixer.existingAction(gesture)).toBe(action)
    for (let i = 0; i < 3; i++) {
      queue.update(0.1)
      expect(() => mixer.update(0.1)).not.toThrow()
    }
    expect(mixer.existingAction(gesture)).toBeNull()
    expect(base.isRunning()).toBe(true)
    expect(root.position.y).toBeGreaterThan(0.2)
  })

  it('cancels a retiring gesture and releases its clip when rendering is stopped', () => {
    const mixer = new AnimationMixer(new Object3D())
    const queue = createVrmAnimationReleaseQueue()
    const clip = new AnimationClip('retiring', 1, [])
    const action = mixer.clipAction(clip).play()
    queue.retire(action, mixer, clip, 0.5)
    queue.retire(action, mixer, clip)
    expect(action.getEffectiveWeight()).toBe(0)
    queue.clear()
    expect(mixer.existingAction(clip)).toBeNull()
    expect(() => mixer.update(0.1)).not.toThrow()
  })
})
