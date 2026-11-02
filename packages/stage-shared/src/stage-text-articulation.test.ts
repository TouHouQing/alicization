import { describe, expect, it } from 'vitest'

import { resolveStageTextMouthShape } from './stage-text-articulation'

describe('text articulation follows phonemes rather than a looping clock', () => {
  const frame = { grapheme: '啊', phoneme: 'a', script: 'pinyin' as const, offset: 0, durationMs: 110, turnId: 'one', startedAt: 1000 }
  it('distinguishes open, spread, rounded and bilabial mouth shapes', () => {
    const a = resolveStageTextMouthShape(frame, 1040)
    const i = resolveStageTextMouthShape({ ...frame, phoneme: 'yi' }, 1040)
    const u = resolveStageTextMouthShape({ ...frame, phoneme: 'wu' }, 1040)
    expect(a.open).toBeGreaterThan(i.open)
    expect(i.form).toBeGreaterThan(0.7)
    expect(u.form).toBeLessThan(-0.7)
    expect(resolveStageTextMouthShape({ ...frame, phoneme: 'ma' }, 1000).open).toBe(0)
    expect(resolveStageTextMouthShape({ ...frame, phoneme: 'ma' }, 1040).vowel).toBe('A')
    expect(resolveStageTextMouthShape({ ...frame, phoneme: 'yu' }, 1040).round).toBeGreaterThan(0.8)
  })
  it('closes on punctuation, before activation and after its deadline without replay', () => {
    for (const now of [999, 1110, 1200, 3000])
      expect(resolveStageTextMouthShape(frame, now).open).toBe(0)
    expect(resolveStageTextMouthShape({ ...frame, script: 'silent' }, 1040).open).toBe(0)
  })
  it('connects adjacent vowels without forced closures, while phrase endings release', () => {
    const connected = { ...frame, durationMs: 230, endsPhrase: false }
    expect(resolveStageTextMouthShape(connected, 1220).open).toBeGreaterThan(0.8)
    expect(resolveStageTextMouthShape({ ...connected, endsPhrase: true }, 1280).open).toBe(0)
    expect(resolveStageTextMouthShape({ ...connected, endsPhrase: true }, 1220).open).toBeLessThan(0.2)
    expect(resolveStageTextMouthShape(connected, 1230).open).toBe(0)
  })
  it('glides through a compound final with bounded adjacent frame changes', () => {
    const ai = { ...frame, phoneme: 'ai', durationMs: 230, endsPhrase: false }
    const shapes = Array.from({ length: 23 }, (_, i) => resolveStageTextMouthShape(ai, 1000 + i * 10))
    expect(shapes[0]!.form).toBeLessThan(0.2)
    expect(shapes.at(-1)!.form).toBeGreaterThan(0.7)
    expect(shapes.slice(1).every((shape, i) => Math.abs(shape.form - shapes[i]!.form) < 0.08)).toBe(true)
  })
})
