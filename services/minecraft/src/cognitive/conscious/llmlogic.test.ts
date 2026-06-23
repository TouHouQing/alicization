import { describe, expect, it } from 'vitest'

import { extractJsonCandidate } from './llmlogic'

describe('llmlogic JSON candidate extraction', () => {
  it('extracts JSON fenced responses without relying on a broad regex', () => {
    expect(extractJsonCandidate('```json\n{"ok":true}\n```')).toBe('{"ok":true}')
    expect(extractJsonCandidate('```\n{"ok":true}\n```')).toBe('{"ok":true}')
  })

  it('falls back to the first JSON object inside wrapped LLM text', () => {
    expect(extractJsonCandidate('Sure:\n{"action":"chat"}\nThanks')).toBe('{"action":"chat"}')
  })

  it('keeps non-json fences as plain text for parser diagnostics', () => {
    expect(extractJsonCandidate('```ts\nconst value = 1\n```')).toBe('```ts\nconst value = 1\n```')
  })
})
