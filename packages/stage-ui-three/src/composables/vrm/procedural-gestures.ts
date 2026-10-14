import type { VRMHumanBoneName } from '@pixiv/three-vrm'
import type { Object3D } from 'three'

import { interactionGestureEnvelope } from '@proj-alicization/stage-shared'
import { AdditiveAnimationBlendMode, AnimationClip, Euler, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three'

/** Additive semantic gestures preserve the imported base pose and restore it. */
export interface VrmGestureRig {
  getNormalizedBoneNode: (name: VRMHumanBoneName) => Object3D | null
}

interface GestureDefinition {
  duration: number
  bones: Partial<Record<VRMHumanBoneName, (progress: number) => readonly [number, number, number]>>
  required: VRMHumanBoneName[]
  rootOffset?: (progress: number) => readonly [number, number, number]
}

const envelope = (progress: number) => Math.sin(Math.PI * progress) ** 2
const pulse = (progress: number, cycles = 1) => envelope(progress) * Math.sin(progress * Math.PI * 2 * cycles)

const gestures: Record<string, GestureDefinition> = {
  turn_attentive: {
    duration: 3.4,
    required: ['hips', 'spine', 'head'],
    bones: { hips: progress => [0, envelope(progress) * 0.24, 0], spine: progress => [0, envelope(progress) * 0.1, 0], head: progress => [0, envelope(progress) * 0.15, 0] },
  },
  shift_weight: {
    duration: 4,
    required: ['hips', 'leftUpperLeg', 'rightUpperLeg'],
    bones: { hips: progress => [0, 0, pulse(progress) * 0.035], leftUpperLeg: progress => [envelope(progress) * 0.025, 0, -pulse(progress) * 0.035], rightUpperLeg: progress => [-envelope(progress) * 0.025, 0, -pulse(progress) * 0.035] },
  },
  small_step: {
    duration: 3.6,
    required: ['hips', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'],
    rootOffset: progress => [envelope(progress) * 0.06, Math.abs(pulse(progress, 2)) * 0.012, 0],
    bones: {
      leftUpperLeg: progress => [pulse(progress, 2) * 0.22, 0, 0],
      rightUpperLeg: progress => [-pulse(progress, 2) * 0.22, 0, 0],
      leftLowerLeg: progress => [Math.max(0, pulse(progress, 2)) * 0.35, 0, 0],
      rightLowerLeg: progress => [Math.max(0, -pulse(progress, 2)) * 0.35, 0, 0],
      leftFoot: progress => [-Math.max(0, pulse(progress, 2)) * 0.18, 0, 0],
      rightFoot: progress => [-Math.max(0, -pulse(progress, 2)) * 0.18, 0, 0],
      leftUpperArm: progress => [-pulse(progress, 2) * 0.1, 0, 0],
      rightUpperArm: progress => [pulse(progress, 2) * 0.1, 0, 0],
    },
  },
  open_palm: {
    duration: 3.1,
    required: ['head', 'rightUpperArm', 'rightLowerArm', 'rightHand'],
    bones: {
      head: progress => [interactionGestureEnvelope(progress) * 0.035, 0, -interactionGestureEnvelope(progress) * 0.025],
      chest: progress => [-interactionGestureEnvelope(progress) * 0.035, 0, 0],
      rightUpperArm: progress => [-interactionGestureEnvelope(progress) * 0.32, interactionGestureEnvelope(progress) * 0.2, interactionGestureEnvelope(progress) * 1.12],
      rightLowerArm: progress => [interactionGestureEnvelope(progress) * 0.72, interactionGestureEnvelope(progress) * 0.28, 0],
      rightHand: progress => [0, interactionGestureEnvelope(progress) * 0.3, interactionGestureEnvelope(progress) * 0.12],
    },
  },
  thoughtful_pause: {
    duration: 2.8,
    required: ['head', 'neck'],
    bones: {
      head: progress => [interactionGestureEnvelope(progress) * 0.06, interactionGestureEnvelope(progress) * 0.09, interactionGestureEnvelope(progress) * 0.035],
      neck: progress => [interactionGestureEnvelope(progress) * 0.025, interactionGestureEnvelope(progress) * 0.035, 0],
      chest: progress => [-interactionGestureEnvelope(progress) * 0.018, 0, 0],
    },
  },
  reassuring_nod: {
    duration: 2.7,
    required: ['head', 'spine'],
    bones: {
      head: progress => [Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (progress - 0.18) / 0.55)))) * interactionGestureEnvelope(progress) * 0.12, 0, -interactionGestureEnvelope(progress) * 0.035],
      spine: progress => [interactionGestureEnvelope(progress) * 0.035, 0, 0],
      chest: progress => [interactionGestureEnvelope(progress) * 0.025, 0, 0],
    },
  },
  gentle_boundary: {
    duration: 2.6,
    required: ['head', 'rightUpperArm', 'rightLowerArm', 'rightHand'],
    bones: {
      head: progress => [interactionGestureEnvelope(progress) * 0.025, 0, 0],
      rightUpperArm: progress => [-interactionGestureEnvelope(progress) * 0.28, 0, interactionGestureEnvelope(progress) * 1.04],
      rightLowerArm: progress => [interactionGestureEnvelope(progress) * 0.62, 0, 0],
      rightHand: progress => [-interactionGestureEnvelope(progress) * 0.15, interactionGestureEnvelope(progress) * 0.2, 0],
    },
  },
  nod: {
    duration: 1.25,
    required: ['head'],
    bones: { head: progress => [Math.max(0, pulse(progress, 2)) * 0.18, 0, 0] },
  },
  shake_head: {
    duration: 1.5,
    required: ['head'],
    bones: { head: progress => [0, pulse(progress, 2) * 0.22, 0] },
  },
  tilt_head: {
    duration: 2.2,
    required: ['head'],
    bones: { head: progress => [envelope(progress) * 0.03, 0, envelope(progress) * 0.14] },
  },
  steady_focus: {
    duration: 2.8,
    required: ['head', 'spine'],
    bones: { head: progress => [envelope(progress) * 0.09, 0, 0], spine: progress => [envelope(progress) * 0.045, 0, 0] },
  },
  observe_focus: {
    duration: 2.4,
    required: ['head'],
    bones: { head: progress => [envelope(progress) * 0.04, pulse(progress) * 0.12, 0] },
  },
  comfort_sway: {
    duration: 3,
    required: ['head', 'spine'],
    bones: { head: progress => [envelope(progress) * 0.04, 0, -pulse(progress) * 0.045], spine: progress => [0, 0, pulse(progress) * 0.04] },
  },
  gentle_wave: {
    duration: 2.4,
    required: ['rightUpperArm', 'rightLowerArm', 'rightHand'],
    bones: {
      rightUpperArm: progress => [-envelope(progress) * 0.16, envelope(progress) * 0.18, envelope(progress) * 1.65],
      rightLowerArm: progress => [envelope(progress) * 0.65, 0, envelope(progress) * 0.5 + pulse(progress, 3) * 0.16],
      rightHand: progress => [0, pulse(progress, 3) * 0.12, pulse(progress, 3) * 0.32],
    },
  },
  celebrate_small: {
    duration: 2,
    required: ['head', 'leftUpperArm', 'rightUpperArm'],
    bones: {
      head: progress => [-envelope(progress) * 0.08, 0, pulse(progress) * 0.035],
      chest: progress => [-envelope(progress) * 0.08, 0, 0],
      leftUpperArm: progress => [-envelope(progress) * 0.3, 0, -envelope(progress) * 1.1],
      rightUpperArm: progress => [-envelope(progress) * 0.3, 0, envelope(progress) * 1.1],
      leftLowerArm: progress => [envelope(progress) * 0.5, 0, -envelope(progress) * 0.28],
      rightLowerArm: progress => [envelope(progress) * 0.5, 0, envelope(progress) * 0.28],
    },
  },
  listen_close: {
    duration: 3.6,
    required: ['head', 'spine'],
    bones: {
      head: progress => [envelope(progress) * 0.16, 0, -envelope(progress) * 0.07],
      spine: progress => [envelope(progress) * 0.13, 0, 0],
      chest: progress => [envelope(progress) * 0.09, 0, 0],
    },
  },
  rest_settle: {
    duration: 5,
    required: ['head', 'spine'],
    bones: {
      head: progress => [envelope(progress) * 0.23, 0, envelope(progress) * 0.12],
      spine: progress => [envelope(progress) * 0.07, 0, 0],
      chest: progress => [envelope(progress) * 0.04, 0, 0],
    },
  },
  stretch: {
    duration: 4.5,
    required: ['head', 'leftUpperArm', 'rightUpperArm'],
    bones: {
      head: progress => [-envelope(progress) * 0.12, 0, 0],
      chest: progress => [-envelope(progress) * 0.11, 0, 0],
      leftUpperArm: progress => [-envelope(progress) * 0.2, 0, -envelope(progress) * 1.85],
      rightUpperArm: progress => [-envelope(progress) * 0.2, 0, envelope(progress) * 1.85],
    },
  },
}

export const vrmProceduralGestureKeys = Object.keys(gestures)

export function supportsVrmProceduralGesture(rig: VrmGestureRig | null | undefined, key: string) {
  const definition = gestures[key]
  return Boolean(rig && definition && definition.required.every(name => rig.getNormalizedBoneNode(name)))
}

export function createVrmProceduralGestureClip(rig: VrmGestureRig, key: string): AnimationClip | null {
  if (!supportsVrmProceduralGesture(rig, key))
    return null
  const definition = gestures[key]
  const sampleCount = Math.ceil(definition.duration * 30)
  const times = Array.from({ length: sampleCount + 1 }, (_, index) => index * definition.duration / sampleCount)
  const tracks: Array<QuaternionKeyframeTrack | VectorKeyframeTrack> = []
  for (const [name, angles] of Object.entries(definition.bones)) {
    const bone = rig.getNormalizedBoneNode(name as VRMHumanBoneName)
    if (!bone || !angles)
      continue
    const quaternion = new Quaternion()
    const values = times.flatMap((_, index) => {
      const [x, y, z] = angles(index / sampleCount)
      quaternion.setFromEuler(new Euler(x, y, z))
      return quaternion.toArray()
    })
    // UUID binding avoids collisions with user-authored skeleton bone names.
    tracks.push(new QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, times, values))
  }
  if (definition.rootOffset) {
    const hips = rig.getNormalizedBoneNode('hips')!
    tracks.push(new VectorKeyframeTrack(`${hips.uuid}.position`, times, times.flatMap((_, index) => [...definition.rootOffset!(index / sampleCount)])))
  }
  return new AnimationClip(`alicization:${key}`, definition.duration, tracks, AdditiveAnimationBlendMode)
}
