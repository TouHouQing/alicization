import { describe, expect, it } from 'vitest'

import {
  buildVrmRuntimeCapabilitySnapshot,
  listVrmPresetFacialCapabilities,
  resolveSupportedVrmExpressionName,
  resolveVrmBaseExpressionName,
  supportsVrmBaseEmotion,
  supportsVrmVisemeLipSync,
} from './capabilities'

describe('vrm capability helpers', () => {
  it('only exposes preset facial capabilities backed by runtime expressions', () => {
    expect(listVrmPresetFacialCapabilities(['happy', 'relaxed'])).toEqual([
      expect.objectContaining({ key: 'smile', expressionName: 'happy' }),
      expect.objectContaining({ key: 'relaxed', expressionName: 'relaxed' }),
    ])
  })

  it('maps base emotions through the actual runtime expression support', () => {
    const supportedExpressions = ['default', 'joy', 'sorrow', 'shock']

    expect(supportsVrmBaseEmotion(supportedExpressions, 'happy')).toBe(true)
    expect(supportsVrmBaseEmotion(supportedExpressions, 'concerned')).toBe(true)
    expect(supportsVrmBaseEmotion(supportedExpressions, 'thinking')).toBe(false)
  })

  it('accepts model-specific base expression overrides ahead of shared defaults', () => {
    expect(resolveVrmBaseExpressionName('happy', ['joy_01'])).toBe('joy_01')
    expect(supportsVrmBaseEmotion(['joy_01'], 'happy', ['joy_01'])).toBe(true)
  })

  it('resolves a preferred alias to the actual supported runtime expression name', () => {
    expect(resolveSupportedVrmExpressionName(['default', 'calm', 'joy'], 'relaxed')).toBe('calm')
    expect(resolveSupportedVrmExpressionName(['default', 'joy'], 'relaxed')).toBe('')
  })

  it('requires the full viseme set before advertising viseme lip sync', () => {
    expect(supportsVrmVisemeLipSync(['a', 'e', 'i', 'o'])).toBe(false)
    expect(supportsVrmVisemeLipSync(['a', 'e', 'i', 'o', 'u'])).toBe(true)
  })

  it('builds a runtime capability snapshot with supported emotions and preset facial cues', () => {
    const snapshot = buildVrmRuntimeCapabilitySnapshot({
      expressionNames: ['default', 'joy', 'sorrow', 'relaxed', 'shock', 'a', 'e', 'i', 'o', 'u'],
      supportsLookAt: true,
    })

    expect(snapshot.supportedExpressionNames).toEqual([
      'a',
      'default',
      'e',
      'i',
      'joy',
      'o',
      'relaxed',
      'shock',
      'sorrow',
      'u',
    ])
    expect(snapshot.supportedBaseEmotions).toEqual(
      expect.arrayContaining(['neutral', 'happy', 'concerned', 'tired', 'apologetic', 'surprised']),
    )
    expect(snapshot.supportedFacialCues.map(item => item.key)).toEqual(
      expect.arrayContaining(['smile', 'frown', 'relaxed', 'shock']),
    )
    expect(snapshot.supportedActions.map(item => item.key)).toEqual(
      expect.arrayContaining(['steady_focus', 'observe_focus', 'idle_settle']),
    )
    expect(snapshot.supportsLookAt).toBe(true)
    expect(snapshot.supportsVisemeLipSync).toBe(true)
    expect(snapshot.supportsMicroDynamics).toBe(true)
  })
})
