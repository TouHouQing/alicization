import { AnimationClip, AnimationMixer, NumberKeyframeTrack, Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import { createVrmPosturePlayback } from './posture-playback'

describe('a persistent pose survives gestures and cancellation', () => {
  it('fades into a held pose and restores the original base through actual mixer updates', async () => {
    const bone = new Object3D()
    const mixer = new AnimationMixer(bone)
    const idle = mixer.clipAction(new AnimationClip('idle', 1, [new NumberKeyframeTrack('.rotation[x]', [0, 1], [0, 0])])).play()
    const sit = new AnimationClip('sit', 0, [new NumberKeyframeTrack('.rotation[x]', [0], [1])])
    const player = createVrmPosturePlayback({ mixer: () => mixer, neutral: () => idle, load: async () => sit })
    await player.request('sit')
    for (let i = 0; i < 60; i++) {
      player.update(1 / 60)
      mixer.update(1 / 60)
    }
    expect(bone.rotation.x).toBeCloseTo(1, 4)
    expect(player.base()).not.toBe(idle)
    await player.request('stand')
    for (let i = 0; i < 60; i++) {
      player.update(1 / 60)
      mixer.update(1 / 60)
    }
    expect(bone.rotation.x).toBeCloseTo(0, 4)
    expect(player.snapshot()).toMatchObject({ mode: 'stand', loaded: false })
    player.clear()
  })

  it('does not reapply an old asynchronous pose after a newer request or model teardown', async () => {
    const bone = new Object3D()
    const mixer = new AnimationMixer(bone)
    const idle = mixer.clipAction(new AnimationClip('idle', 1, [new NumberKeyframeTrack('.rotation[x]', [0, 1], [0, 0])])).play()
    let finish!: (clip: AnimationClip) => void
    const player = createVrmPosturePlayback({ mixer: () => mixer, neutral: () => idle, load: () => new Promise((resolve) => {
      finish = resolve
    }) })
    const pending = player.request('sleep')
    player.clear()
    finish(new AnimationClip('late', 1, [new NumberKeyframeTrack('.rotation[x]', [0, 1], [2, 2])]))
    await pending
    mixer.update(0.5)
    expect(bone.rotation.x).toBe(0)
    expect(player.snapshot().loaded).toBe(false)
  })
})
