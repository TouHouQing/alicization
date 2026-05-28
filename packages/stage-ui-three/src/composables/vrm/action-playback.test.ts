import { describe, expect, it } from 'vitest'

import { resolveVrmActionFadeDurationSeconds } from './action-playback'

describe('vrm action playback helpers', () => {
  it('shortens action fade for stronger segment-grade action intensity', () => {
    const residentFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'resident',
      actionIntensity: 0.18,
      fadeDurationSeconds: 0.36,
    })

    const segmentFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.88,
      fadeDurationSeconds: 0.36,
    })

    expect(segmentFade).toBeLessThan(residentFade)
  })

  it('keeps the default fade duration when action intensity is absent', () => {
    expect(resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'preview',
      actionIntensity: null,
      fadeDurationSeconds: 0.36,
    })).toBeCloseTo(0.36, 2)
  })
})
