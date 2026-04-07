import {
  listStageEmbodimentLive2DFacialCapabilities,
  normalizeStageEmbodimentEmotion,
  resolveStageEmbodimentCueCandidates,
  resolveStageEmbodimentLive2DMotionAliases,
  resolveStageEmbodimentSpeechStyle,
  resolveStageEmbodimentStageEmotionName,
  resolveStageEmbodimentVrmBaseExpressionCandidates,
  resolveStageEmbodimentVrmBaseExpressionName,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

describe('stage embodiment profile', () => {
  it('maps governed emotions onto the legacy stage surface consistently', () => {
    expect(normalizeStageEmbodimentEmotion('thinking')).toBe('thinking')
    expect(resolveStageEmbodimentStageEmotionName('thinking')).toBe('think')
    expect(resolveStageEmbodimentStageEmotionName('concerned')).toBe('question')
    expect(resolveStageEmbodimentStageEmotionName('apologetic')).toBe('awkward')
  })

  it('keeps speech, motion, and vrm baselines aligned for reflective turns', () => {
    expect(resolveStageEmbodimentSpeechStyle('thinking')).toEqual({
      pitchDelta: -2,
      rateMultiplier: 0.97,
    })
    expect(resolveStageEmbodimentLive2DMotionAliases('thinking')).toContain('Think')
    expect(resolveStageEmbodimentVrmBaseExpressionName('thinking')).toBe('relaxed')
    expect(resolveStageEmbodimentVrmBaseExpressionCandidates('question')).toEqual(['relaxed', 'surprised'])
  })

  it('merges emotion and delivery cue candidates without duplicates', () => {
    expect(resolveStageEmbodimentCueCandidates({
      emotion: 'concerned',
      delivery: 'gentle',
    })).toEqual({
      facialCueCandidates: ['frown', 'soft-gaze', 'relaxed'],
      actionCueCandidates: ['idle_gentle_nod', 'comfort_sway', 'observe_focus', 'slow_nod'],
    })
  })

  it('exposes live2d facial capabilities as first-class manifest cues', () => {
    const capabilities = listStageEmbodimentLive2DFacialCapabilities()

    expect(capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'smile',
        affectsMouth: true,
      }),
      expect.objectContaining({
        key: 'focus',
        affectsMouth: false,
      }),
      expect.objectContaining({
        key: 'focused',
        affectsMouth: false,
      }),
      expect.objectContaining({
        key: 'brow-furrow',
        affectsMouth: false,
      }),
      expect.objectContaining({
        key: 'wide-eye',
        affectsMouth: false,
      }),
      expect.objectContaining({
        key: 'slow-blink',
        affectsMouth: false,
      }),
    ]))
  })
})
