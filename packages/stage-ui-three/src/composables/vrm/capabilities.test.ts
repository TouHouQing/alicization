import { describe, expect, it } from 'vitest'

import {
  listVrmPresetFacialCapabilities,
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
    const supportedExpressions = ['neutral', 'happy', 'sad', 'surprised']

    expect(supportsVrmBaseEmotion(supportedExpressions, 'happy')).toBe(true)
    expect(supportsVrmBaseEmotion(supportedExpressions, 'concerned')).toBe(true)
    expect(supportsVrmBaseEmotion(supportedExpressions, 'thinking')).toBe(false)
  })

  it('requires the full viseme set before advertising viseme lip sync', () => {
    expect(supportsVrmVisemeLipSync(['aa', 'ee', 'ih', 'oh'])).toBe(false)
    expect(supportsVrmVisemeLipSync(['aa', 'ee', 'ih', 'oh', 'ou'])).toBe(true)
  })
})
