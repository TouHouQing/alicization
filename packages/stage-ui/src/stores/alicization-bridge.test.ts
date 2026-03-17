import { describe, expect, it } from 'vitest'

import { clampAlicizationPerformancePayloadToManifest } from './alicization-bridge'

describe('alicization performance manifest clamp', () => {
  it('drops unsupported cues and downgrades unsupported base emotions', () => {
    const result = clampAlicizationPerformancePayloadToManifest({
      baseEmotion: 'angry',
      emotion: 'angry',
      facialCue: 'unknown_face',
      actionCue: 'unknown_action',
      delivery: 'firm',
      emphasis: 2,
    }, {
      renderer: 'vrm',
      supportedBaseEmotions: ['neutral', 'happy'],
      supportedFacialCues: [{
        key: 'smile',
        label: 'Smile',
        description: 'A brighter smile layered over the current emotion.',
        source: 'preset',
        affectsMouth: true,
      }],
      supportedActions: [{
        key: 'wave',
        label: 'Wave',
        description: 'A friendly wave animation.',
        source: 'external-vrma',
      }],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: false,
    }, 'happy')

    expect(result.performance).toEqual(expect.objectContaining({
      baseEmotion: 'happy',
      emotion: 'happy',
      facialCue: null,
      actionCue: null,
    }))
    expect(result.downgradedBaseEmotion).toBe('angry')
    expect(result.droppedFacialCue).toBe('unknown_face')
    expect(result.droppedActionCue).toBe('unknown_action')
  })

  it('keeps supported cues intact', () => {
    const result = clampAlicizationPerformancePayloadToManifest({
      baseEmotion: 'happy',
      emotion: 'happy',
      facialCue: 'smile',
      actionCue: 'wave',
      delivery: 'energetic',
      emphasis: 1,
    }, {
      renderer: 'vrm',
      supportedBaseEmotions: ['neutral', 'happy'],
      supportedFacialCues: [{
        key: 'smile',
        label: 'Smile',
        description: 'A brighter smile layered over the current emotion.',
        source: 'preset',
        affectsMouth: true,
      }],
      supportedActions: [{
        key: 'wave',
        label: 'Wave',
        description: 'A friendly wave animation.',
        source: 'external-vrma',
      }],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: false,
    })

    expect(result.performance).toEqual(expect.objectContaining({
      baseEmotion: 'happy',
      emotion: 'happy',
      facialCue: 'smile',
      actionCue: 'wave',
    }))
    expect(result.downgradedBaseEmotion).toBeUndefined()
    expect(result.droppedFacialCue).toBeUndefined()
    expect(result.droppedActionCue).toBeUndefined()
  })
})
