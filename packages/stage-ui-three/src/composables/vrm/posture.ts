import type { VRMCore } from '@pixiv/three-vrm-core'
import type { StageEmbodimentPresencePostureState } from '@proj-alicization/stage-shared'

import { Euler, Quaternion } from 'three'

function clampUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampSignedUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(-1, value))
}

const reusableEuler = new Euler()
const reusableQuaternion = new Quaternion()

function applyBonePosture(
  bone: ReturnType<NonNullable<VRMCore['humanoid']>['getNormalizedBoneNode']>,
  input: {
    delta: number
    pitch: number
    roll: number
    yaw: number
  },
) {
  if (!bone)
    return

  const targetQuaternion = bone.quaternion.clone()
  const blend = 1 - Math.exp(-Math.max(0.001, input.delta) * 10)
  reusableEuler.set(input.pitch, input.yaw, input.roll)
  reusableQuaternion.setFromEuler(reusableEuler)
  targetQuaternion.multiply(reusableQuaternion)
  bone.quaternion.slerp(targetQuaternion, blend)
}

export function applyStageEmbodimentVrmPosture(input: {
  delta: number
  posture: StageEmbodimentPresencePostureState | null | undefined
  vrm: VRMCore | undefined
}) {
  if (!input.vrm?.humanoid || !input.posture?.engaged)
    return

  const confidence = clampUnit(input.posture.confidence)
  const bodyYaw = clampSignedUnit(input.posture.bodyYaw) * confidence
  const bodyPitch = clampUnit(input.posture.bodyPitch) * confidence

  const spine = input.vrm.humanoid.getNormalizedBoneNode('spine')
  const chest = input.vrm.humanoid.getNormalizedBoneNode('chest')
  const neck = input.vrm.humanoid.getNormalizedBoneNode('neck')
  const head = input.vrm.humanoid.getNormalizedBoneNode('head')

  applyBonePosture(spine, {
    delta: input.delta,
    pitch: -bodyPitch * 0.08,
    yaw: bodyYaw * 0.1,
    roll: -bodyYaw * 0.02,
  })
  applyBonePosture(chest, {
    delta: input.delta,
    pitch: -bodyPitch * 0.12,
    yaw: bodyYaw * 0.14,
    roll: -bodyYaw * 0.04,
  })
  applyBonePosture(neck, {
    delta: input.delta,
    pitch: -bodyPitch * 0.06,
    yaw: bodyYaw * 0.08,
    roll: 0,
  })
  applyBonePosture(head, {
    delta: input.delta,
    pitch: -bodyPitch * 0.04,
    yaw: bodyYaw * 0.05,
    roll: 0,
  })
}
