import { describe, expect, it } from 'vitest'

import { resolveLive2DFacialCueDrive } from './facial-cue'

describe('live2d facial cue drive', () => {
  it('adds positive mouth and smile drive for smile-family cues', () => {
    const smile = resolveLive2DFacialCueDrive('smile', 1)
    const brightSmile = resolveLive2DFacialCueDrive('bright-smile', 1)

    expect(smile.eyeSmile).toBeGreaterThan(0)
    expect(smile.mouthForm).toBeGreaterThan(0)
    expect(brightSmile.eyeSmile).toBeGreaterThan(smile.eyeSmile)
    expect(brightSmile.mouthOpen).toBeGreaterThan(smile.mouthOpen)
  })

  it('treats focused as an alias of focus', () => {
    expect(resolveLive2DFacialCueDrive('focus', 0.75)).toEqual(
      resolveLive2DFacialCueDrive('focused', 0.75),
    )
  })

  it('sharpens brows for brow-furrow and opens eyes for wide-eye', () => {
    const furrow = resolveLive2DFacialCueDrive('brow-furrow', 1)
    const wideEye = resolveLive2DFacialCueDrive('wide-eye', 1)

    expect(furrow.browLift).toBeLessThan(0)
    expect(furrow.browAngle).toBeLessThan(0)
    expect(wideEye.eyeOpenScale).toBeGreaterThan(0)
    expect(wideEye.browLift).toBeGreaterThan(0)
  })

  it('compresses eyelids for blink-family cues', () => {
    const slowBlink = resolveLive2DFacialCueDrive('slow-blink', 1)
    const blink = resolveLive2DFacialCueDrive('blink', 1)

    expect(slowBlink.eyeOpenScale).toBeLessThan(0)
    expect(blink.eyeOpenScale).toBeLessThan(slowBlink.eyeOpenScale)
  })
})
