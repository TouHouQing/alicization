import type { VRMHumanBoneName } from '@pixiv/three-vrm'

import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import { AdditiveAnimationBlendMode, AnimationMixer, Euler, LoopOnce, Object3D, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { builtinActionBindings } from '../../assets/vrm/animations'
import { resolveVrmPreferredActionBinding } from './performance-selection'
import { createVrmProceduralGestureClip, supportsVrmProceduralGesture, vrmProceduralGestureKeys } from './procedural-gestures'

function createRig() {
  const root = new Object3D()
  const bones = new Map<VRMHumanBoneName, Object3D>()
  for (const name of ['head', 'neck', 'chest', 'spine', 'leftUpperArm', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'hips', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'] as VRMHumanBoneName[]) {
    const bone = new Object3D()
    root.add(bone)
    bones.set(name, bone)
  }
  return { root, bones, getNormalizedBoneNode: (name: VRMHumanBoneName) => bones.get(name) ?? null }
}

describe('actual procedural VRM animation', () => {
  it('raises a waving hand and moves its wrist on a realistic hanging-arm rig, then restores it', () => {
    const rig = createRig()
    const upper = rig.bones.get('rightUpperArm')!
    const lower = rig.bones.get('rightLowerArm')!
    const hand = rig.bones.get('rightHand')!
    upper.add(lower)
    lower.add(hand)
    upper.position.set(0.1, 1.24, 0)
    lower.position.set(0.23, 0, 0)
    hand.position.set(0.23, 0, 0)
    upper.quaternion.setFromEuler(new Euler(0, 0, -1.35))
    const original = hand.getWorldPosition(new Vector3())
    const clip = createVrmProceduralGestureClip(rig, 'gentle_wave')!
    const mixer = new AnimationMixer(rig.root)
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play()
    let peakHandHeight = original.y
    let wristMovement = 0
    for (let frame = 0; frame < 120; frame++) {
      mixer.update(clip.duration / 120)
      peakHandHeight = Math.max(peakHandHeight, hand.getWorldPosition(new Vector3()).y)
      wristMovement = Math.max(wristMovement, hand.quaternion.angleTo(new Quaternion()))
    }
    expect(peakHandHeight).toBeGreaterThan(upper.position.y + 0.1)
    expect(wristMovement).toBeGreaterThan(0.12)
    action.stop()
    expect(hand.getWorldPosition(new Vector3()).distanceTo(original)).toBeLessThan(0.00001)
  })

  it.each(vrmProceduralGestureKeys)('registers %s in the actual Stage binding selector', (key) => {
    const state = createIdleStageEmbodimentPerformanceState()
    state.performance.actionCue = key
    state.actionPulse.cue = key
    expect(resolveVrmPreferredActionBinding(state, builtinActionBindings)?.actionKey).toBe(key)
  })
  it.each(vrmProceduralGestureKeys)('plays %s through a real mixer and restores the pre-existing pose', (key) => {
    const rig = createRig()
    for (const bone of rig.bones.values())
      bone.rotation.set(0.12, -0.08, 0.06)
    const original = new Map([...rig.bones].map(([name, bone]) => [name, bone.quaternion.clone()]))
    const clip = createVrmProceduralGestureClip(rig, key)!
    expect(clip.blendMode).toBe(AdditiveAnimationBlendMode)
    const mixer = new AnimationMixer(rig.root)
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play()
    let maximumMovement = 0
    for (let index = 0; index < 50; index++) {
      mixer.update(clip.duration / 50)
      for (const [name, bone] of rig.bones)
        maximumMovement = Math.max(maximumMovement, bone.quaternion.angleTo(original.get(name)!))
    }
    expect(maximumMovement).toBeGreaterThan(0.015)
    action.stop()
    mixer.uncacheClip(clip)
    for (const [name, bone] of rig.bones) {
      expect(bone.quaternion.angleTo(original.get(name)!)).toBeLessThan(0.00001)
      expect(bone.quaternion.length()).toBeCloseTo(1)
    }
  })

  it('cancels without leaving a rotated bone or cached action', () => {
    const rig = createRig()
    const clip = createVrmProceduralGestureClip(rig, 'shake_head')!
    const mixer = new AnimationMixer(rig.root)
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play()
    mixer.update(0.3)
    expect(rig.bones.get('head')!.quaternion.angleTo(new Quaternion())).toBeGreaterThan(0.01)
    action.stop()
    mixer.uncacheClip(clip)
    expect(rig.bones.get('head')!.quaternion.angleTo(new Quaternion())).toBeLessThan(0.00001)
    expect(mixer.existingAction(clip)).toBeNull()
  })

  it('rejects unknown gestures and gestures without their required bones', () => {
    const rig = createRig()
    rig.bones.delete('rightLowerArm')
    expect(supportsVrmProceduralGesture(rig, 'gentle_wave')).toBe(false)
    expect(createVrmProceduralGestureClip(rig, 'gentle_wave')).toBeNull()
    expect(createVrmProceduralGestureClip(rig, 'invented')).toBeNull()
    expect(supportsVrmProceduralGesture(rig, 'nod')).toBe(true)
  })
})
