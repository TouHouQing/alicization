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

  it('keeps weak resident-grade facial cues from overriding a strong emotional expression match', () => {
    const selection = resolveLive2DExpressionSelection({
      delivery: 'energetic',
      emotion: 'happy',
      expressionIntensity: 0.96,
      expressionNames: [
        'happy_exp_01',
        'focus_observe',
        'neutral_exp_05',
      ],
      facialCue: 'focus',
      facialCueIntensity: 0.08,
    })

    expect(selection).not.toBeNull()
    expect(selection?.name).toBe('happy_exp_01')
    expect(selection?.reason).toBe('emotion')
  })

  it('keeps direct emotional aliases ahead of neutral fallback when no facial cue is active', () => {
    const selection = resolveLive2DExpressionSelection({
      delivery: 'energetic',
      emotion: 'happy',
      expressionIntensity: 0.96,
      expressionNames: [
        'happy_exp_01',
        'focus_observe',
        'neutral_exp_05',
      ],
      facialCue: null,
      facialCueIntensity: 0,
    })

    expect(selection).not.toBeNull()
    expect(selection?.name).toBe('happy_exp_01')
    expect(selection?.reason).toBe('emotion')
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

  it('respects preferred alias ordering when multiple aliases can match different expressions', () => {
    const selection = resolveLive2DExpressionSelection({
      delivery: 'gentle',
      emotion: 'thinking',
      expressionIntensity: 0.72,
      expressionNames: [
        'configured_focus_exp',
        'recover_soft_exp',
        'neutral_exp_05',
      ],
      facialCue: 'soft-gaze',
      facialCueIntensity: 0.8,
      preferredExpressionAliases: ['recover soft', 'configured focus'],
    })

    expect(selection).not.toBeNull()
    expect(selection?.name).toBe('recover_soft_exp')
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

  it('keeps synthesized live2d facial and emotion capabilities available even when discovered expression names are sparse', () => {
    const snapshot = buildLive2DRuntimeCapabilitySnapshot([
      'neutral_exp_05',
    ])

    expect(snapshot.supportedBaseEmotions).toEqual(
      expect.arrayContaining(['neutral', 'thinking', 'concerned', 'happy']),
    )
    expect(snapshot.supportedFacialCues.map(item => item.key)).toEqual(
      expect.arrayContaining(['focus', 'soft-gaze', 'frown', 'bright-smile']),
    )
  })

  it('keeps restrained live2d action capabilities available even when discovered expressions are sparse', () => {
    const snapshot = buildLive2DRuntimeCapabilitySnapshot([
      'neutral_exp_05',
    ])

    expect(snapshot.supportedActions.map(item => item.key)).toEqual(
      expect.arrayContaining(['steady_focus', 'observe_focus', 'idle_settle']),
    )
  })
})
