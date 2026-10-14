import type { VRMHumanBoneName } from '@pixiv/three-vrm'

import { Object3D, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { createVrmDailyPostureDriver } from './daily-posture-driver'

function makeRig() {
  const scene = new Object3D()
  const bones = new Map<VRMHumanBoneName, Object3D>()
  const add = (name: VRMHumanBoneName, parent: Object3D, x: number, y: number) => {
    const node = new Object3D()
    node.position.set(x, y, 0)
    parent.add(node)
    bones.set(name, node)
    return node
  }
  const hips = add('hips', scene, 0, 1)
  const spine = add('spine', hips, 0, 0.15)
  const chest = add('chest', spine, 0, 0.2)
  add('head', chest, 0, 0.35)
  for (const side of ['left', 'right'] as const) {
    const upper = add(`${side}UpperLeg`, hips, side === 'left' ? 0.1 : -0.1, -0.1)
    const lower = add(`${side}LowerLeg`, upper, 0, -0.45)
    add(`${side}Foot`, lower, 0, -0.4)
  }
  return { scene, bones, humanoid: { getNormalizedBoneNode: (name: VRMHumanBoneName) => bones.get(name) ?? null, update: () => scene.updateMatrixWorld(true) } }
}

describe('persistent posture independent of the short action track', () => {
  it('lowers the hips for sitting, lies horizontally, keeps its support plane and restores after interruption', () => {
    const rig = makeRig()
    const driver = createVrmDailyPostureDriver()
    const position = (name: VRMHumanBoneName) => rig.bones.get(name)!.getWorldPosition(new Vector3())
    const originalHeight = position('hips').y
    const floor = position('leftFoot').y
    for (let index = 0; index < 360; index++) {
      driver.restore()
      driver.apply(rig, 'sit', 1 / 60)
    }
    expect(position('hips').y).toBeLessThan(originalHeight - 0.2)
    expect(Math.min(position('leftFoot').y, position('rightFoot').y)).toBeCloseTo(floor, 4)
    for (let index = 0; index < 360; index++) {
      driver.restore()
      driver.apply(rig, 'lie', 1 / 60)
    }
    expect(Math.abs(position('head').y - position('hips').y)).toBeLessThan(0.03)
    for (let index = 0; index < 480; index++) {
      driver.restore()
      driver.apply(rig, 'stand', 1 / 60)
    }
    expect(position('hips').y).toBeCloseTo(originalHeight, 3)
    expect(rig.bones.get('leftUpperLeg')!.quaternion.angleTo(new Quaternion())).toBeLessThan(0.001)
    driver.restore()
    expect(rig.scene.position.length()).toBe(0)
  })

  it('reports a missing leg rig instead of pretending the low pose is supported', () => {
    const rig = makeRig()
    rig.bones.delete('leftLowerLeg')
    const driver = createVrmDailyPostureDriver()
    expect(driver.apply(rig, 'sleep', 1 / 60)).toMatchObject({ mode: 'stand', supported: false })
  })

  it('keeps the world support plane under a scaled and rotated parent', () => {
    const rig = makeRig()
    const parent = new Object3D()
    parent.scale.setScalar(1.7)
    parent.rotation.z = 0.15
    parent.add(rig.scene)
    parent.updateMatrixWorld(true)
    const feet = () => ['leftFoot', 'rightFoot'].map(name => rig.bones.get(name as VRMHumanBoneName)!.getWorldPosition(new Vector3()).y)
    const floor = Math.min(...feet())
    const driver = createVrmDailyPostureDriver()
    for (let index = 0; index < 360; index++) {
      driver.restore()
      driver.apply(rig, 'sit', 1 / 60)
    }
    expect(Math.min(...feet())).toBeCloseTo(floor, 4)
    driver.restore()
    expect(rig.scene.position.length()).toBe(0)
  })
})
