import { describe, expect, it } from 'vitest'

import { readStagePixelWitness } from './stage-pixel-witness'

const bounds = { left: 10, top: 20, width: 300, height: 200 }
describe('actual renderer pixel witnesses', () => {
  it('keeps geometry, missing pixels and failed reads unknown while recognizing actual nontransparent alpha', () => {
    expect(readStagePixelWitness({ mounted: true, bounds, readRegion: () => null })).toBe('unknown')
    expect(readStagePixelWitness({ mounted: true, bounds, readRegion: () => ({ data: [255, 255, 255, 0] }) })).toBe('unknown')
    expect(readStagePixelWitness({ mounted: true, bounds, readRegion: () => {
      throw new Error('GPU context lost')
    } })).toBe('unknown')
    expect(readStagePixelWitness({ mounted: false, bounds, readRegion: () => ({ data: [255, 255, 255, 255] }) })).toBe('unknown')
    const samples: Array<[number, number]> = []
    expect(readStagePixelWitness({ mounted: true, bounds, readRegion: (x, y) => {
      samples.push([x, y])
      return { data: [0, 0, 0, samples.length === 2 ? 200 : 0] }
    } })).toBe('visible')
    expect(samples[0]).toEqual([160, 120])
    expect(samples).toHaveLength(2)
  })
})
