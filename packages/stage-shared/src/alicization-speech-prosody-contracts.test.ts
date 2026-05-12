import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationEmbodimentSpeechPlan,
  normalizeAlicizationSpeechProsodyIntent,
} from './index'

describe('speech prosody contracts', () => {
  it('normalizes chinese-first prosody intent with pause class and phrase emphasis', () => {
    const prosody = normalizeAlicizationSpeechProsodyIntent({
      language: 'zh-CN',
      pauseClass: 'comma',
      phraseBoundary: 'soft',
      contour: 'falling',
      emphasisWord: '这里',
      emphasisStrength: 0.72,
      tempoShift: -0.08,
    })

    expect(prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'comma',
      phraseBoundary: 'soft',
      contour: 'falling',
      emphasisWord: '这里',
      emphasisStrength: 0.72,
      tempoShift: -0.08,
    })
  })

  it('threads per-segment prosody intents through the embodiment speech plan', () => {
    const plan = normalizeAlicizationEmbodimentSpeechPlan({
      segments: [{
        id: 'segment-1',
        index: 0,
        text: '先看这里，',
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
        prosody: {
          language: 'zh-CN',
          pauseClass: 'comma',
          phraseBoundary: 'soft',
          contour: 'falling',
          emphasisWord: '这里',
          emphasisStrength: 0.68,
          tempoShift: -0.05,
        },
      }],
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 220,
    })

    expect(plan?.segments[0]?.prosody?.language).toBe('zh-CN')
    expect(plan?.segments[0]?.prosody?.pauseClass).toBe('comma')
  })

  it('rejects malformed prosody blocks instead of silently normalizing them to neutral intent', () => {
    expect(normalizeAlicizationSpeechProsodyIntent({})).toBeNull()
    expect(normalizeAlicizationSpeechProsodyIntent({
      language: 'zh-CN',
      pauseClass: 'bad',
      phraseBoundary: 'soft',
      contour: 'falling',
      emphasisWord: '这里',
      emphasisStrength: 0.68,
      tempoShift: -0.05,
    })).toBeNull()

    expect(normalizeAlicizationEmbodimentSpeechPlan({
      segments: [{
        id: 'segment-1',
        index: 0,
        text: '先看这里，',
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
        prosody: {},
      }],
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 220,
    })).toBeNull()
  })

  it('supports question and ellipsis pause classes needed by the chinese-first planner', () => {
    const question = normalizeAlicizationSpeechProsodyIntent({
      language: 'zh-CN',
      pauseClass: 'question',
      phraseBoundary: 'hard',
      contour: 'rising',
      emphasisWord: null,
      emphasisStrength: 0.4,
      tempoShift: 0,
    })
    const ellipsis = normalizeAlicizationSpeechProsodyIntent({
      language: 'zh-CN',
      pauseClass: 'ellipsis',
      phraseBoundary: 'soft',
      contour: 'dip-rise',
      emphasisWord: null,
      emphasisStrength: 0.22,
      tempoShift: -0.08,
    })

    expect(question?.pauseClass).toBe('question')
    expect(question?.phraseBoundary).toBe('hard')
    expect(ellipsis?.pauseClass).toBe('ellipsis')
    expect(ellipsis?.contour).toBe('dip-rise')
  })
})
