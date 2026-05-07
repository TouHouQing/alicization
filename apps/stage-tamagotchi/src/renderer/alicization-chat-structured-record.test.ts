import { describe, expect, it } from 'vitest'

import { normalizeChatStructuredRecord, resolveVisibleReasoning } from './alicization-chat-structured-record'

describe('alicization chat structured record', () => {
  it('normalizes malformed formats without turning them into fallback-v1', () => {
    expect(normalizeChatStructuredRecord({
      thought: ' inner ',
      emotion: 'thinking',
      reply: '',
      format: 'unknown-format',
    }, 'visible reply')).toEqual(expect.objectContaining({
      thought: 'inner',
      emotion: 'thinking',
      reply: 'visible reply',
      format: 'mind-turn-v1',
      malformedFormat: 'unknown-format',
    }))
  })

  it('preserves legacy format lineage for renderer diagnostics', () => {
    expect(normalizeChatStructuredRecord({
      thought: 'legacy thought',
      emotion: 'neutral',
      reply: 'legacy reply',
      format: 'epoch1-v1',
    }, 'fallback')).toEqual(expect.objectContaining({
      format: 'epoch1-v1',
      legacyFormat: 'epoch1-v1',
      malformedFormat: undefined,
    }))
  })

  it('keeps subconscious reasoning hidden from visible chat categorization', () => {
    const structured = normalizeChatStructuredRecord({
      thought: 'internal proactive reasoning',
      emotion: 'neutral',
      reply: 'care line',
      format: 'subconscious-proactive-llm-v1',
    }, 'fallback')

    expect(resolveVisibleReasoning(structured, 'user-turn')).toBe('')
    expect(resolveVisibleReasoning(structured, 'subconscious-proactive')).toBe('')
  })
})
