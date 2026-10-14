import type { VRMHumanBoneName } from '@pixiv/three-vrm'

import { createIdleStageEmbodimentPerformanceState, createIdleStageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import { Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import { createVrmSpeechBodyDriver } from './speech-body-driver'

function fixture() {
  const bones = new Map<VRMHumanBoneName, Object3D>()
  for (const name of ['head', 'neck', 'chest', 'spine', 'rightHand', 'rightIndexProximal', 'rightIndexIntermediate', 'leftHand'] as VRMHumanBoneName[]) {
    const bone = new Object3D()
    bone.rotation.set(0.12, -0.03, 0.02)
    bones.set(name, bone)
  }
  const rig = { getNormalizedBoneNode: (name: VRMHumanBoneName) => bones.get(name) ?? null }
  const speech = createIdleStageEmbodimentSpeechRenderState()
  speech.active = true
  speech.audioBound = true
  speech.item = { intentId: 'turn', streamId: 'turn', segmentId: 'segment:1', ownerId: 'alice', text: '我在这里', special: null, continuityHoldMs: 0, playbackDurationMs: 1000, metadata: null, cue: null, digitalLifeFrame: null }
  speech.dynamics = { speechEnergy: 0.8, prosodyIntensity: 0.7, cadencePulse: 0.9, emphasisLevel: 1 }
  return { bones, rig, speech, performance: createIdleStageEmbodimentPerformanceState(), delta: 1 / 60 }
}

describe('body articulation follows real speech', () => {
  it('moves supported head, torso, wrists and fingers, then restores all original poses', () => {
    const input = fixture()
    const before = new Map([...input.bones].map(([name, bone]) => [name, bone.quaternion.clone()]))
    const driver = createVrmSpeechBodyDriver()
    for (let frame = 0; frame < 240; frame++) {
      driver.restore()
      expect(input.bones.get('head')!.quaternion.angleTo(before.get('head')!)).toBeLessThan(1e-7)
      const observation = driver.apply(input)
      expect(observation.segmentId).toBe('segment:1')
      expect(observation.bones).toContain('rightIndexProximal')
      expect(input.bones.get('rightIndexProximal')!.quaternion.angleTo(before.get('rightIndexProximal')!)).toBeGreaterThan(0)
    }
    driver.restore()
    for (const [name, bone] of input.bones)
      expect(bone.quaternion.angleTo(before.get(name)!)).toBeLessThan(1e-7)
  })

  it('does not animate waiting, unbound, cancelled or unowned audio', () => {
    const input = fixture()
    const driver = createVrmSpeechBodyDriver()
    for (const speech of [{ ...input.speech, active: false }, { ...input.speech, audioBound: false }, { ...input.speech, item: null }]) {
      driver.restore()
      expect(driver.apply({ ...input, speech })).toMatchObject({ active: false, strength: 0, bones: [] })
    }
  })

  it('safely uses a partial rig and clamps invalid energy instead of producing invalid rotations', () => {
    const input = fixture()
    input.speech.dynamics = { speechEnergy: Number.NaN, prosodyIntensity: 10, cadencePulse: -2, emphasisLevel: 1 }
    const driver = createVrmSpeechBodyDriver()
    const result = driver.apply(input)
    expect(result.strength).toBeLessThanOrEqual(1)
    for (const bone of input.bones.values())
      expect(bone.quaternion.toArray().every(Number.isFinite)).toBe(true)
    driver.restore()
  })
})
