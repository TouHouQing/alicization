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

export interface VrmBodyExecutionState {
  openness: number | null
  settle: number | null
}

export function createIdleVrmBodyExecutionState(): VrmBodyExecutionState {
  return {
    openness: null,
    settle: null,
  }
}

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
    return createIdleVrmBodyExecutionState()

  const postureConfidence = input.posture?.engaged ? clampUnit(input.posture.confidence) : 0
  const bodyYaw = clampSignedUnit(input.posture?.bodyYaw) * postureConfidence
  const bodyPitch = clampUnit(input.posture?.bodyPitch) * postureConfidence
  const motor = input.motor
  const motorBodySway = clampSignedUnit(motor?.body.sway)
  const motorBodyLean = clampSignedUnit(motor?.body.lean)
  const motorBodyOpenness = clampUnit(motor?.body.openness, 0.5)
  const motorBodySettle = clampUnit(motor?.body.settle, 0.62)
  const motorHeadYaw = clampSignedUnit(motor?.head.yaw)
  const motorHeadPitch = clampSignedUnit(motor?.head.pitch)
  const motorHeadRoll = clampSignedUnit(motor?.head.roll)
  const motorStillness = clampUnit(motor?.stillness, 0.58)
  const motorExpressivity = clampUnit(motor?.expressivity, 0.44)
  const motorBlend = Math.max(
    postureConfidence,
    Math.max(0.08, (1 - motorStillness) * 0.38 + motorExpressivity * 0.34),
  )
  if (motorBlend <= 0) {
    return {
      openness: Number(motorBodyOpenness),
      settle: Number(motorBodySettle),
    }
  }

  const opennessYawScale = 0.84 + motorBodyOpenness * 0.44
  const opennessPitchScale = 0.88 + motorBodyOpenness * 0.24
  const opennessHeadScale = 0.9 + motorBodyOpenness * 0.18
  const settleMotionScale = 1 - motorBodySettle * 0.22
  const settleHeadScale = 1 - motorBodySettle * 0.14

  const spine = input.vrm.humanoid.getNormalizedBoneNode('spine')
  const chest = input.vrm.humanoid.getNormalizedBoneNode('chest')
  const neck = input.vrm.humanoid.getNormalizedBoneNode('neck')
  const head = input.vrm.humanoid.getNormalizedBoneNode('head')

  applyBonePosture(spine, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.08 * opennessPitchScale) + (-motorBodyLean * 0.06 * motorBlend * settleMotionScale),
    yaw: (bodyYaw * 0.1 * opennessYawScale) + (motorBodySway * 0.08 * motorBlend * opennessYawScale * settleMotionScale),
    roll: (-bodyYaw * 0.02 * settleMotionScale) + (-motorBodySway * 0.03 * motorBlend * settleMotionScale),
  })
  applyBonePosture(chest, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.12 * opennessPitchScale) + (-motorBodyLean * 0.1 * motorBlend * settleMotionScale),
    yaw: (bodyYaw * 0.14 * opennessYawScale) + (motorBodySway * 0.12 * motorBlend * opennessYawScale * settleMotionScale),
    roll: (-bodyYaw * 0.04 * settleMotionScale) + ((motorHeadRoll * 0.04 - motorBodySway * 0.05) * motorBlend * settleMotionScale),
  })
  applyBonePosture(neck, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.06 * opennessHeadScale) + (-motorHeadPitch * 0.08 * motorBlend * settleHeadScale),
    yaw: (bodyYaw * 0.08 * opennessHeadScale) + (motorHeadYaw * 0.1 * motorBlend * opennessHeadScale * settleHeadScale),
    roll: motorHeadRoll * 0.04 * motorBlend * settleHeadScale,
  })
  applyBonePosture(head, {
    delta: input.delta,
    pitch: (-bodyPitch * 0.04 * opennessHeadScale) + (-motorHeadPitch * 0.12 * motorBlend * settleHeadScale),
    yaw: (bodyYaw * 0.05 * opennessHeadScale) + (motorHeadYaw * 0.14 * motorBlend * opennessHeadScale * settleHeadScale),
    roll: motorHeadRoll * 0.08 * motorBlend * settleHeadScale,
  })

  return {
    openness: Number(motorBodyOpenness),
    settle: Number(motorBodySettle),
  }
}
