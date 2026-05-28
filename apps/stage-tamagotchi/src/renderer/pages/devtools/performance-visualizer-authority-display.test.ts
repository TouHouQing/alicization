import { describe, expect, it } from 'vitest'

import { resolveAuthorityMismatchDisplay } from './performance-visualizer-authority-display'

describe('performance visualizer authority display helpers', () => {
  it('prefers Chinese mismatch reason summaries over technical mismatch labels', () => {
    expect(resolveAuthorityMismatchDisplay({
      authorityMismatchSummary: 'lipsync-mismatch',
      authorityMismatchReasonSummary: '口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作。',
    })).toBe('口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作。')
  })

  it('falls back to the technical mismatch summary when no reason summary is available', () => {
    expect(resolveAuthorityMismatchDisplay({
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: null,
    })).toBe('face-mismatch, motion-mismatch')
  })

  it('returns null when neither mismatch summary is available', () => {
    expect(resolveAuthorityMismatchDisplay({
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
    })).toBeNull()
  })
})
