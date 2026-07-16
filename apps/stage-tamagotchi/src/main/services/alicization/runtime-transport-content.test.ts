import { describe, expect, it } from 'vitest'

import { parseJsonObjectFromText } from './runtime-transport-content'

describe('runtime transport structured content', () => {
  it('accepts only a complete JSON object response', () => {
    expect(parseJsonObjectFromText('  {"format":"mind-turn-v1","reply":"你好"}  ')).toEqual({
      format: 'mind-turn-v1',
      reply: '你好',
    })
  })

  it.each([
    '```json\n{"format":"mind-turn-v1"}\n```',
    'Here is the JSON: {"format":"mind-turn-v1"}',
    '{"format":"mind-turn-v1"} trailing prose',
    '[{"format":"mind-turn-v1"}]',
    'null',
  ])('rejects repaired or non-object structured content: %s', (raw) => {
    expect(parseJsonObjectFromText(raw)).toBeNull()
  })
})
