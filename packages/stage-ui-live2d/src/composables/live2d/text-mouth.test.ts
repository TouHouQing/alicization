import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useMotionUpdatePluginTextMouth } from './text-mouth'

afterEach(() => vi.useRealTimers())

describe('compiled Live2D text mouth ownership', () => {
  it('shapes the actual audio playhead and never opens through silence after smoothing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const writes = new Map<string, number>()
    const model = { getModel: () => ({ parameters: { ids: ['ParamMouthOpenY', 'ParamMouthForm'] } }), setParameterValueById: (id: string, value: number) => writes.set(id, value) }
    let frame: any = { grapheme: '啊', phoneme: 'a', script: 'pinyin', offset: 0, durationMs: 400, endsPhrase: false, startedAt: 1000, turnId: 'one', clock: 'audio', audioElapsedMs: 100 }
    const ctx = { model, speechRenderState: ref({ active: true, mouthOpenRatio: 0.3 }) } as any
    const plugin = useMotionUpdatePluginTextMouth(() => frame)
    plugin(ctx)
    expect(writes.get('ParamMouthOpenY')).toBe(0.3)
    vi.setSystemTime(1050)
    frame = { ...frame, grapheme: '衣', phoneme: 'yi', offset: 1, startedAt: 1050 }
    ctx.speechRenderState.value.mouthOpenRatio = 0
    plugin(ctx)
    expect(writes.get('ParamMouthOpenY')).toBe(0)
    writes.clear()
    ctx.speechRenderState.value.active = false
    plugin(ctx)
    expect(writes.size).toBe(0)
  })
  it('drives the existing ParamA/I/U/E/O rig bindings and releases the previous vowel', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1040)
    const writes = new Map<string, number>()
    const model = { getModel: () => ({ parameters: { ids: ['ParamA', 'ParamI', 'ParamU', 'ParamE', 'ParamO', 'ParamMouthPucker'] } }), setParameterValueById: (id: string, value: number) => writes.set(id, value) }
    let frame = { grapheme: '衣', phoneme: 'yi', script: 'pinyin' as const, offset: 0, durationMs: 110, startedAt: 1000, turnId: 'one' }
    const plugin = useMotionUpdatePluginTextMouth(() => frame)
    const ctx = { model, speechRenderState: ref({ active: false }) } as any
    plugin(ctx)
    expect(writes.get('ParamI')).toBeGreaterThan(0.5)
    expect(writes.get('ParamU')).toBe(0)
    frame = { ...frame, phoneme: 'wu' }
    plugin(ctx)
    expect(writes.get('ParamI')).toBe(0)
    expect(writes.get('ParamU')).toBeGreaterThan(0.5)
    expect(writes.get('ParamMouthPucker')).toBe(1)
  })
  it('writes supported rig parameters, yields to audio and stops after the glyph', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const writes = new Map<string, number>()
    const model = { getModel: () => ({ parameters: { ids: ['ParamMouthOpenY', 'ParamMouthForm'] } }), setParameterValueById: (id: string, value: number) => writes.set(id, value) }
    let frame: any = { grapheme: '啊', phoneme: 'a', script: 'pinyin', offset: 0, durationMs: 110, startedAt: 1000, turnId: 'one' }
    const ctx = { model, speechRenderState: ref({ active: false }) } as any
    const plugin = useMotionUpdatePluginTextMouth(() => frame)
    plugin(ctx)
    expect(writes.get('ParamMouthOpenY')).toBeGreaterThan(0.8)
    expect([...writes.keys()]).toEqual(['ParamMouthOpenY', 'ParamMouthForm'])
    writes.clear()
    ctx.speechRenderState.value.active = true
    plugin(ctx)
    expect(writes.size).toBe(0)
    ctx.speechRenderState.value.active = false
    vi.setSystemTime(1111)
    plugin(ctx)
    expect(writes.get('ParamMouthOpenY')).toBe(0)
    writes.clear()
    frame = null
    plugin(ctx)
    expect(writes.size).toBe(0)
  })
  it('smooths adjacent syllables in wall time but closes and cancels immediately', () => {
    vi.useFakeTimers()
    const writes = new Map<string, number>()
    const model = { getModel: () => ({ parameters: { ids: ['ParamMouthOpenY', 'ParamMouthForm'] } }), setParameterValueById: (id: string, value: number) => writes.set(id, value) }
    let frame: any = { grapheme: '衣', phoneme: 'yi', script: 'pinyin', offset: 0, durationMs: 230, endsPhrase: false, startedAt: 1000, turnId: 'one' }
    const ctx = { model, speechRenderState: ref({ active: false }) } as any
    const plugin = useMotionUpdatePluginTextMouth(() => frame)
    vi.setSystemTime(1210)
    plugin(ctx)
    const previous = writes.get('ParamMouthForm')!
    frame = { ...frame, grapheme: '乌', phoneme: 'wu', offset: 1, startedAt: 1230 }
    vi.setSystemTime(1230)
    plugin(ctx)
    expect(writes.get('ParamMouthForm')).toBe(previous)
    vi.setSystemTime(1265)
    plugin(ctx)
    expect(writes.get('ParamMouthForm')).toBeCloseTo(-0.05)
    vi.setSystemTime(1330) // A slow renderer catches up; it cannot stretch the transition.
    plugin(ctx)
    expect(writes.get('ParamMouthForm')).toBeCloseTo(-0.9)
    frame = { ...frame, script: 'silent', offset: 2, startedAt: 1460 }
    vi.setSystemTime(1460)
    plugin(ctx)
    expect(writes.get('ParamMouthOpenY')).toBe(0)
    frame = null
    plugin(ctx)
    frame = { grapheme: '啊', phoneme: 'a', script: 'pinyin', offset: 0, durationMs: 230, startedAt: 1500, turnId: 'two' }
    vi.setSystemTime(1500)
    plugin(ctx)
    expect(writes.get('ParamMouthOpenY')).toBeGreaterThan(0.8)
    expect(writes.get('ParamMouthForm')).toBeCloseTo(0.12)
  })
})
