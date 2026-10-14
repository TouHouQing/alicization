import type { VRMHumanBoneName } from '@pixiv/three-vrm'
import type { StageEmbodimentPerformanceState, StageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import type { Object3D } from 'three'

import type { VrmGestureRig } from './procedural-gestures'

import { Euler, Quaternion } from 'three'

const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0

/** Speech beats follow the actual audio receipt, never an estimated text timer. */
export function createVrmSpeechBodyDriver() {
  const bases = new Map<Object3D, Quaternion>()
  const rotation = new Quaternion()
  const euler = new Euler()
  let strength = 0
  let snapshot = { active: false, segmentId: null as string | null, strength: 0, bones: [] as string[] }

  // Remove this layer before the mixer evaluates the next animation frame.
  function restore() {
    for (const [bone, base] of bases)
      bone.quaternion.copy(base)
    bases.clear()
  }

  function apply(input: { rig?: VrmGestureRig | null, speech?: StageEmbodimentSpeechRenderState | null, performance?: StageEmbodimentPerformanceState | null, delta: number }) {
    const speech = input.speech
    const segmentId = speech?.item?.segmentId ?? null
    if (!input.rig || !speech?.active || !speech.audioBound || !segmentId) {
      strength = 0
      snapshot = { active: false, segmentId: null, strength: 0, bones: [] }
      return snapshot
    }
    const dynamics = speech.dynamics
    const gentle = ['gentle', 'soft', 'calm'].includes(input.performance?.performance.delivery ?? 'calm')
    const scale = gentle ? 0.65 : 1
    const target = unit(dynamics.speechEnergy) * 0.38 + unit(dynamics.prosodyIntensity) * 0.25 + unit(dynamics.cadencePulse) * 0.37
    const delta = Number.isFinite(input.delta) ? Math.max(0, Math.min(0.1, input.delta)) : 0
    strength += (target - strength) * (1 - Math.exp(-delta / 0.12))
    const beat = strength * scale
    const bones: string[] = []
    const offset = (name: VRMHumanBoneName, x: number, y: number, z: number) => {
      const bone = input.rig!.getNormalizedBoneNode(name)
      if (!bone)
        return
      bases.set(bone, bone.quaternion.clone())
      rotation.setFromEuler(euler.set(x, y, z))
      bone.quaternion.multiply(rotation)
      bones.push(name)
    }
    offset('head', beat * 0.035, beat * 0.016, -beat * 0.012)
    offset('neck', beat * 0.012, 0, 0)
    offset('chest', -beat * 0.016, beat * 0.01, 0)
    offset('spine', beat * 0.008, -beat * 0.006, 0)
    // Fine hand articulation is optional; unsupported fingers are skipped.
    // The bounded bend preserves the larger owned gesture or idle pose.
    for (const side of ['left', 'right'] as const) {
      const direction = side === 'left' ? 1 : -1
      offset(`${side}Hand`, 0, beat * 0.018, direction * beat * 0.025)
      for (const finger of ['Index', 'Middle', 'Ring', 'Little'] as const) {
        offset(`${side}${finger}Proximal`, 0, 0, direction * beat * 0.07)
        offset(`${side}${finger}Intermediate`, 0, 0, direction * beat * 0.04)
      }
    }
    snapshot = { active: true, segmentId, strength, bones }
    return snapshot
  }

  return { restore, apply, snapshot: () => snapshot }
}
