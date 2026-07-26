import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationRendererHintToken,
  normalizeAlicizationRendererHintTokens,
  normalizeAlicizationSettleLoopToken,
} from './alicization-renderer-hint-normalization'

describe('alicization renderer hint normalization', () => {
  it('normalizes hyphenated renderer hint tokens into the shared underscore form', () => {
    expect(normalizeAlicizationRendererHintToken(' Renderer-Only ')).toBe('renderer_only')
    expect(normalizeAlicizationRendererHintToken(' motion-follow-through ')).toBe('motion_follow_through')
  })

  it('deduplicates normalized renderer hint tokens', () => {
    expect(normalizeAlicizationRendererHintTokens([
      'Motion-Follow-Through',
      'motion_follow_through',
      ' motion-follow-through ',
    ])).toEqual([
      'motion_follow_through',
    ])
  })

  it('normalizes settle aliases without changing non-alias cue names', () => {
    expect(normalizeAlicizationSettleLoopToken('settle-idle')).toBe('idle_settle')
    expect(normalizeAlicizationSettleLoopToken('IdleSettle')).toBe('idle_settle')
    expect(normalizeAlicizationSettleLoopToken('ObserveSoft')).toBe('ObserveSoft')
  })
})
