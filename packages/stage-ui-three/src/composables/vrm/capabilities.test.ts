import { describe, expect, it } from 'vitest'

import {
  listVrmPresetFacialCapabilities,
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

  it('requires the full viseme set before advertising viseme lip sync', () => {
    expect(supportsVrmVisemeLipSync(['a', 'e', 'i', 'o'])).toBe(false)
    expect(supportsVrmVisemeLipSync(['a', 'e', 'i', 'o', 'u'])).toBe(true)
  })
})
