import { Box3, PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { frameVrmPosture } from './daily-posture-framing'

describe('low body camera framing', () => {
  it('keeps the whole seated or horizontal body inside wide and narrow viewports without changing saved camera settings', () => {
    const saved = { position: { x: 0, y: 1.1, z: 0.9 }, target: { x: 0, y: 0.9, z: 0 } }
    for (const aspect of [0.75, 1.35, 2.2]) {
      for (const size of [{ x: 0.6, y: 0.9, z: 0.4 }, { x: 1.5, y: 0.4, z: 0.6 }]) {
        const bounds = { center: { x: 0, y: 0.3, z: 0 }, size }
        const frame = frameVrmPosture({ ...saved, bounds, fov: 45, aspect })
        const camera = new PerspectiveCamera(45, aspect, 0.01, 100)
        camera.position.copy(frame.position)
        camera.lookAt(frame.target)
        camera.updateMatrixWorld(true)
        const box = new Box3().setFromCenterAndSize(frame.target, new Vector3(size.x, size.y, size.z))
        for (const x of [box.min.x, box.max.x]) {
          for (const y of [box.min.y, box.max.y]) {
            for (const z of [box.min.z, box.max.z]) {
              const projected = new Vector3(x, y, z).project(camera)
              expect(Math.abs(projected.x)).toBeLessThan(0.95)
              expect(Math.abs(projected.y)).toBeLessThan(0.95)
            }
          }
        }
      }
    }
    expect(saved.position).toEqual({ x: 0, y: 1.1, z: 0.9 })
  })
})
