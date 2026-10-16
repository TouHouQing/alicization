import type { MotionManagerPluginContext } from './motion-manager'

import { createIdleStageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { resolveLive2DSpeechMouthDrive, useMotionUpdatePluginIdleMouth } from './mouth-drive'

describe('live2D mouth authority', () => {
  it('uses real audio energy to distinguish silence, quiet speech and voiced speech', () => {
    const speech = { ...createIdleStageEmbodimentSpeechRenderState(), active: true, playbackPhase: 'playing' as const, audioBound: true }
    speech.dynamics.speechEnergy = 0
    expect(resolveLive2DSpeechMouthDrive(speech)).toBe(0)
    speech.dynamics.speechEnergy = 0.02
    expect(resolveLive2DSpeechMouthDrive(speech)).toBeGreaterThan(0.4)
    expect(resolveLive2DSpeechMouthDrive(speech)).toBeLessThan(0.5)
    speech.dynamics.speechEnergy = 0.4
    expect(resolveLive2DSpeechMouthDrive(speech)).toBe(1)
    speech.dynamics.speechEnergy = Number.NaN
    expect(resolveLive2DSpeechMouthDrive(speech)).toBe(0)
  })

  it('retains text-only fallback while preventing pre-play and post-stop articulation', () => {
    const speech = { ...createIdleStageEmbodimentSpeechRenderState(), active: true, playbackPhase: 'playing' as const }
    expect(resolveLive2DSpeechMouthDrive(speech)).toBe(1)
    expect(resolveLive2DSpeechMouthDrive({ ...speech, playbackPhase: 'idle' })).toBe(0)
    expect(resolveLive2DSpeechMouthDrive({ ...speech, active: false })).toBe(0)
  })

  it('removes only compiled mouth-opening idle curves, preserving facial shape and foreground motion', () => {
    const values = new Map([['ParamMouthOpenY', 0.8], ['ParamMouthForm', 0.6], ['ParamEyeLOpen', 0.7]])
    const write = vi.fn((id: string, value: number) => values.set(id, value))
    const ctx = { isIdleMotion: false, model: { getModel: () => ({ parameters: { ids: [...values.keys()] } }), setParameterValueById: write } } as unknown as MotionManagerPluginContext
    const plugin = useMotionUpdatePluginIdleMouth()
    plugin(ctx)
    expect(write).not.toHaveBeenCalled()
    ctx.isIdleMotion = true
    plugin(ctx)
    expect(values.get('ParamMouthOpenY')).toBe(0)
    expect(values.get('ParamMouthForm')).toBe(0.6)
    expect(values.get('ParamEyeLOpen')).toBe(0.7)
    expect(values.has('ParamMouthOpen')).toBe(false)
  })
})
