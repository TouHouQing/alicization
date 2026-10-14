import type { VRMHumanBoneName } from '@pixiv/three-vrm'
import type { Object3D } from 'three'

import { Euler, Quaternion, Vector3 } from 'three'

export type VrmDailyPosture = 'stand' | 'sit' | 'lie' | 'sleep' | 'work'

interface PostureRig {
  scene: Object3D
  humanoid: { getNormalizedBoneNode: (name: VRMHumanBoneName) => Object3D | null, update: () => void }
}

const targets: Record<VrmDailyPosture, Partial<Record<VRMHumanBoneName, [number, number, number]>>> = {
  stand: {},
  sit: { hips: [0.1, 0, 0], leftUpperLeg: [-1.15, -0.14, -0.1], rightUpperLeg: [-1.15, 0.14, 0.1], leftLowerLeg: [1.9, 0, 0], rightLowerLeg: [1.9, 0, 0], leftFoot: [-0.75, 0, 0], rightFoot: [-0.75, 0, 0], spine: [0.08, 0, 0] },
  lie: { hips: [Math.PI / 2, 0, 0], head: [-0.1, 0, 0], leftUpperLeg: [0, 0, -0.06], rightUpperLeg: [0, 0, 0.06] },
  sleep: { hips: [Math.PI / 2, 0, 0.12], head: [0, 0, 0.14], leftUpperLeg: [-0.2, 0, -0.08], rightUpperLeg: [-0.2, 0, 0.08], leftLowerLeg: [0.35, 0, 0], rightLowerLeg: [0.35, 0, 0] },
  work: { spine: [0.12, 0, 0], chest: [0.08, 0, 0], head: [0.1, 0, 0] },
}

/**
 * Independent pose track, inspired by NEKO/Motion Engine's cancel-and-restore
 * lifecycle. Offsets restore before the mixer, so imported and short actions
 * retain ownership of their original pose. No external animation assets.
 */
export function createVrmDailyPostureDriver() {
  let rig: PostureRig | undefined
  const offsets = new Map<VRMHumanBoneName, Quaternion>()
  const originals = new Map<Object3D, Quaternion>()
  let rootPosition: Vector3 | null = null
  let floor: number | null = null
  let mode: VrmDailyPosture = 'stand'
  let supported = true
  const point = new Vector3()
  const correctedRoot = new Vector3()
  function restore() {
    for (const [bone, rotation] of originals)
      bone.quaternion.copy(rotation)
    originals.clear()
    if (rootPosition && rig)
      rig.scene.position.copy(rootPosition)
    rootPosition = null
  }
  function apply(nextRig: PostureRig | undefined, nextMode: VrmDailyPosture, delta: number) {
    if (!nextRig)
      return
    if (rig !== nextRig) {
      restore()
      offsets.clear()
      floor = null
      rig = nextRig
    }
    mode = nextMode
    const required: VRMHumanBoneName[] = ['hips', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot']
    supported = required.every(name => rig!.humanoid.getNormalizedBoneNode(name))
    if (!supported && ['sit', 'lie', 'sleep'].includes(mode))
      mode = 'stand'
    const target = targets[mode]
    rig.scene.updateMatrixWorld(true)
    if (floor === null) {
      const feet = ['leftFoot', 'rightFoot'].flatMap((name) => {
        const bone = rig!.humanoid.getNormalizedBoneNode(name as VRMHumanBoneName)
        return bone ? [bone.getWorldPosition(point).y] : []
      })
      floor = feet.length ? Math.min(...feet) : 0
    }
    const blend = 1 - Math.exp(-Math.min(0.1, Math.max(0, delta)) / 0.55)
    for (const name of new Set([...offsets.keys(), ...Object.keys(target) as VRMHumanBoneName[]])) {
      const bone = rig.humanoid.getNormalizedBoneNode(name)
      if (!bone)
        continue
      const offset = offsets.get(name) ?? new Quaternion()
      const angles = target[name] ?? [0, 0, 0]
      offset.slerp(new Quaternion().setFromEuler(new Euler(...angles)), blend)
      offsets.set(name, offset)
      originals.set(bone, bone.quaternion.clone())
      bone.quaternion.multiply(offset)
    }
    rig.scene.updateMatrixWorld(true)
    const low = ['head', 'hips', 'leftFoot', 'rightFoot'].flatMap((name) => {
      const bone = rig!.humanoid.getNormalizedBoneNode(name as VRMHumanBoneName)
      return bone ? [bone.getWorldPosition(point).y] : []
    })
    if (low.length && supported) {
      rootPosition = rig.scene.position.clone()
      // Keep the lowest body anchor above the original support plane while
      // transitioning; this also prevents a low pose sinking through the floor.
      rig.scene.getWorldPosition(correctedRoot)
      correctedRoot.y += floor - Math.min(...low)
      if (rig.scene.parent)
        rig.scene.parent.worldToLocal(correctedRoot)
      rig.scene.position.copy(correctedRoot)
    }
    rig.humanoid.update()
    return { mode, supported, floor }
  }
  return { apply, restore, snapshot: () => ({ mode, supported, floor }) }
}
