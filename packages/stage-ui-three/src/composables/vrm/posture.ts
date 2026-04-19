import type { VRMCore } from '@pixiv/three-vrm-core'
import type {
  StageEmbodimentMotorState,
  StageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'

import { Euler, Quaternion } from 'three'

function clampUnit(value: number | null | undefined, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, Number(value)))
}

function clampSignedUnit(value: number | null | undefined, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(-1, Number(value)))
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
  motor?: StageEmbodimentMotorState | null | undefined
  posture: StageEmbodimentPresencePostureState | null | undefined
  vrm: VRMCore | undefined
}) {
  if (!input.vrm?.humanoid)
    return

  const postureConfidence = input.posture?.engaged ? clampUnit(input.posture.confidence) : 0
  const bodyYaw = clampSignedUnit(input.posture?.bodyYaw) * postureConfidence
  const bodyPitch = clampUnit(input.posture?.bodyPitch) * postureConfidence
  const motor = input.motor
  const motorBodySway = clampSignedUnit(motor?.body.sway)
  const motorBodyLean = clampSignedUnit(motor?.body.lean)
  const motorHeadYaw = clampSignedUnit(motor?.head.yaw)
  const motorHeadPitch = clampSignedUnit(motor?.head.pitch)
  const motorHeadRoll = clampSignedUnit(motor?.head.roll)
  const motorStillness = clampUnit(motor?.stillness, 0.58)
  const motorExpressivity = clampUnit(motor?.expressivity, 0.44)
  const motorBlend = Math.max(
    postureConfidence,
    Math.max(0.08, (1 - motorStillness) * 0.38 + motorExpressivity * 0.34),
  )
  if (motorBlend <= 0)
    return

  const spine = input.vrm.humanoid.getNormalizedBoneNode('spine')
  const chest = input.vrm.humanoid.getNormalizedBoneNode('chest')
  const neck = input.vrm.humanoid.getNormalizedBoneNode('neck')
  const head = input.vrm.humanoid.getNormalizedBoneNode('head')

  applyBonePosture(spine, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.08) + (-motorBodyLean * 0.06 * motorBlend),
    yaw: (bodyYaw * 0.1) + (motorBodySway * 0.08 * motorBlend),
    roll: (-bodyYaw * 0.02) + (-motorBodySway * 0.03 * motorBlend),
  })
  applyBonePosture(chest, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.12) + (-motorBodyLean * 0.1 * motorBlend),
    yaw: (bodyYaw * 0.14) + (motorBodySway * 0.12 * motorBlend),
    roll: (-bodyYaw * 0.04) + ((motorHeadRoll * 0.04 - motorBodySway * 0.05) * motorBlend),
  })
  applyBonePosture(neck, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.06) + (-motorHeadPitch * 0.08 * motorBlend),
    yaw: (bodyYaw * 0.08) + (motorHeadYaw * 0.1 * motorBlend),
    roll: motorHeadRoll * 0.04 * motorBlend,
  })
  applyBonePosture(head, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.04) + (-motorHeadPitch * 0.12 * motorBlend),
    yaw: (bodyYaw * 0.05) + (motorHeadYaw * 0.14 * motorBlend),
    roll: motorHeadRoll * 0.08 * motorBlend,
  })
}
