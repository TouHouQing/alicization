import {
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'
import { Euler, Object3D } from 'three'

import { applyStageEmbodimentVrmPosture } from './posture'

function createMockVrm() {
  const bones = {
    chest: new Object3D(),
    head: new Object3D(),
    neck: new Object3D(),
    spine: new Object3D(),
  }

  return {
    bones,
    vrm: {
      humanoid: {
        getNormalizedBoneNode(name: string) {
          return bones[name as keyof typeof bones] ?? null
        },
      },
    },
  }
}

function readBoneEulerY(node: Object3D) {
  return new Euler().setFromQuaternion(node.quaternion).y
}

describe('vrm posture motor bridge', () => {
  it('applies motor-authored posture even when presence posture is idle', () => {
    const { bones, vrm } = createMockVrm()
    const idleMotor = createIdleStageEmbodimentMotorState()

    applyStageEmbodimentVrmPosture({
      delta: 0.16,
      motor: {
        ...idleMotor,
        stillness: 0.12,
        expressivity: 0.88,
        head: {
          ...idleMotor.head,
          yaw: 0.7,
          pitch: -0.48,
          roll: 0.36,
        },
        body: {
          ...idleMotor.body,
          sway: 0.62,
          lean: 0.44,
        },
      },
      posture: createIdleStageEmbodimentPresencePostureState(),
      vrm: vrm as never,
    })

    expect(Math.abs(readBoneEulerY(bones.spine))).toBeGreaterThan(0.005)
    expect(Math.abs(readBoneEulerY(bones.chest))).toBeGreaterThan(0.008)
    expect(Math.abs(readBoneEulerY(bones.head))).toBeGreaterThan(0.012)
  })

  it('damps posture motion when motor stillness is high', () => {
    const restrained = createMockVrm()
    const animated = createMockVrm()
    const idleMotor = createIdleStageEmbodimentMotorState()
    const sharedPosture = {
      ...createIdleStageEmbodimentPresencePostureState(),
      engaged: true,
      confidence: 0.32,
      bodyYaw: 0.2,
      bodyPitch: 0.12,
    }

    applyStageEmbodimentVrmPosture({
      delta: 0.16,
      motor: {
        ...idleMotor,
        stillness: 0.9,
        expressivity: 0.18,
        head: {
          ...idleMotor.head,
          yaw: 0.52,
        },
        body: {
          ...idleMotor.body,
          sway: 0.42,
          lean: 0.18,
        },
      },
      posture: sharedPosture,
      vrm: restrained.vrm as never,
    })

    applyStageEmbodimentVrmPosture({
      delta: 0.16,
      motor: {
        ...idleMotor,
        stillness: 0.08,
        expressivity: 0.92,
        head: {
          ...idleMotor.head,
          yaw: 0.52,
        },
        body: {
          ...idleMotor.body,
          sway: 0.42,
          lean: 0.18,
        },
      },
      posture: sharedPosture,
      vrm: animated.vrm as never,
    })

    expect(Math.abs(readBoneEulerY(animated.bones.chest))).toBeGreaterThan(Math.abs(readBoneEulerY(restrained.bones.chest)))
    expect(Math.abs(readBoneEulerY(animated.bones.head))).toBeGreaterThan(Math.abs(readBoneEulerY(restrained.bones.head)))
  })
})
