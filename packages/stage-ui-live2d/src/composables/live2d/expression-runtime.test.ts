import { describe, expect, it } from 'vitest'

import {
  buildLive2DRuntimeCapabilitySnapshot,
  resolveLive2DExpressionSelection,
} from './expression-runtime'

describe('live2d expression runtime', () => {
  it('resolves semantic expression names to the intended emotion', () => {
    const selection = resolveLive2DExpressionSelection({
      delivery: 'energetic',
      emotion: 'happy',
      expressionIntensity: 0.9,
      expressionNames: [
        'happy_exp_01',
        'angry_exp_08',
        'neutral_exp_05',
      ],
      facialCue: 'bright-smile',
      facialCueIntensity: 0.82,
    })

    expect(selection).not.toBeNull()
    expect(selection?.name).toBe('happy_exp_01')
    expect(selection?.score ?? 0).toBeGreaterThan(2.2)
  })

  it('prefers a strong facial-cue match when the cue is more specific than the base emotion', () => {
    const selection = resolveLive2DExpressionSelection({
      delivery: 'calm',
      emotion: 'neutral',
      expressionIntensity: 0.42,
      expressionNames: [
        'neutral_exp_05',
        'surprised_exp_07',
        'focus_observe',
      ],
      facialCue: 'focus',
      facialCueIntensity: 0.88,
    })

    expect(selection).not.toBeNull()
    expect(selection?.name).toBe('focus_observe')
    expect(selection?.reason).toBe('facial-cue')
  })

  it('lets runtime preferred aliases override heuristic emotion matching', () => {
    const selection = resolveLive2DExpressionSelection({
      delivery: 'energetic',
      emotion: 'happy',
      expressionIntensity: 0.9,
      expressionNames: [
        'happy_exp_01',
        'angry_exp_08',
        'recover_soft',
      ],
      facialCue: 'bright-smile',
      facialCueIntensity: 0.82,
      preferredExpressionAliases: ['recover soft'],
    })

    expect(selection).not.toBeNull()
    expect(selection?.name).toBe('recover_soft')
    expect(selection?.reason).toBe('preferred')
  })

  it('builds runtime capabilities from discovered expression names', () => {
    const snapshot = buildLive2DRuntimeCapabilitySnapshot([
      'happy_exp_01',
      'angry_exp_08',
      'neutral_exp_05',
      'surprised_exp_07',
      'focus_observe',
      'soft_gaze',
    ])

    expect(snapshot.supportedBaseEmotions).toEqual(
      expect.arrayContaining(['happy', 'angry', 'neutral', 'surprised']),
    )
    expect(snapshot.supportedFacialCues.map(item => item.key)).toEqual(
      expect.arrayContaining(['focus', 'soft-gaze']),
    )
  })
})
