import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useThreeSceneIsTransparentAtPoint } from './hit-test'

describe('useThreeSceneIsTransparentAtPoint', () => {
  it('prefers render-target alpha sampling when both strategies are available', () => {
    const scene = ref({
      hitTestClientPoint: () => false,
      readRenderTargetRegionAtClientPoint: () => ({
        centerX: 0,
        centerY: 0,
        data: new Uint8Array([0, 0, 0, 255]),
        readHeight: 1,
        readWidth: 1,
        scaleX: 1,
        scaleY: 1,
        startX: 0,
        startY: 0,
      }),
    })

    const isTransparent = useThreeSceneIsTransparentAtPoint(scene, ref(0), ref(0))
    expect(isTransparent.value).toBe(false)
  })

  it('falls back to geometry hit testing when render-target reads are unavailable', () => {
    const scene = ref({
      hitTestClientPoint: () => true,
    })

    const isTransparent = useThreeSceneIsTransparentAtPoint(scene, ref(0), ref(0))
    expect(isTransparent.value).toBe(false)
  })

  it('falls back to render-target alpha sampling when geometry hit testing is unavailable', () => {
    const scene = ref({
      readRenderTargetRegionAtClientPoint: () => ({
        centerX: 0,
        centerY: 0,
        data: new Uint8Array([0, 0, 0, 255]),
        readHeight: 1,
        readWidth: 1,
        scaleX: 1,
        scaleY: 1,
        startX: 0,
        startY: 0,
      }),
    })

    const isTransparent = useThreeSceneIsTransparentAtPoint(scene, ref(0), ref(0), { threshold: 16, regionRadius: 0 })
    expect(isTransparent.value).toBe(false)
  })
})
