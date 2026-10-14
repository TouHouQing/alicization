import type { VRM } from '@pixiv/three-vrm'

import { Box3, MathUtils, Vector3 } from 'three'

export interface VrmPostureFramingBounds {
  center: { x: number, y: number, z: number }
  size: { x: number, y: number, z: number }
  head?: { center: { x: number, y: number, z: number }, radius: number }
}

/** Bounds come from the rendered skeleton, including the feet of low poses. */
export function readVrmPostureFramingBounds(vrm: VRM): VrmPostureFramingBounds | null {
  const box = new Box3()
  const point = new Vector3()
  vrm.scene.updateMatrixWorld(true)
  for (const name of ['head', 'hips', 'spine', 'leftShoulder', 'rightShoulder', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'] as const) {
    const bone = vrm.humanoid.getRawBoneNode(name)
    if (bone)
      box.expandByPoint(bone.getWorldPosition(point))
  }
  if (box.isEmpty())
    return null
  const scale = vrm.scene.getWorldScale(point)
  box.expandByScalar(Math.max(scale.x, scale.y, scale.z) * 0.16)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  if (![...center.toArray(), ...size.toArray()].every(Number.isFinite))
    return null
  const head = vrm.humanoid.getRawBoneNode('head')?.getWorldPosition(new Vector3())
  return { center: { x: center.x, y: center.y, z: center.z }, size: { x: size.x, y: size.y, z: size.z }, ...(head ? { head: { center: { x: head.x, y: head.y, z: head.z }, radius: Math.max(scale.x, scale.y, scale.z) * 0.18 } } : {}) }
}

export function frameVrmPosture(input: { bounds: VrmPostureFramingBounds, position: { x: number, y: number, z: number }, target: { x: number, y: number, z: number }, fov: number, aspect: number }) {
  const center = new Vector3(input.bounds.center.x, input.bounds.center.y, input.bounds.center.z)
  const size = new Vector3(input.bounds.size.x, input.bounds.size.y, input.bounds.size.z)
  const halfVertical = MathUtils.degToRad(input.fov / 2)
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * Math.max(0.1, input.aspect))
  const distance = Math.max(0.1, size.length() / 2) / Math.sin(Math.min(halfVertical, halfHorizontal)) * 1.12
  const direction = new Vector3(input.position.x - input.target.x, input.position.y - input.target.y, input.position.z - input.target.z)
  if (direction.lengthSq() < 0.000001)
    direction.set(0, 0, 1)
  return { position: center.clone().addScaledVector(direction.normalize(), distance), target: center, distance }
}
