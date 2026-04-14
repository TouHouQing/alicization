import { describe, expect, it } from 'vitest'

import {
  looksLikeAlicizationStructuredPayloadText,
  shouldBufferAlicizationStructuredSpeechPrelude,
} from './alicization-structured-stream-surface'

describe('alicization-structured-stream-surface', () => {
  it('recognizes raw mind-turn json payloads as structured envelopes', () => {
    const payload = '{"format":"mind-turn-v1","thought":"obligation=repair; truth=coarse; focus=current-turn; move=repair; tone=direct","emotion":"apologetic","reply":"我收回来，按你这轮真正的问题接。","performance":{"baseEmotion":"apologetic","delivery":"firm","emphasis":0},"governance":{"turnMode":"screen-repair"}}'

    expect(looksLikeAlicizationStructuredPayloadText(payload)).toBe(true)
    expect(shouldBufferAlicizationStructuredSpeechPrelude(payload.slice(0, 96))).toBe(true)
  })

  it('recognizes fenced structured envelopes before they can leak into visible speech', () => {
    const payload = '```json\n{"thought":"obligation=answer; truth=coarse; focus=current-turn; move=answer; tone=warm","emotion":"neutral","reply":"你好，我在。"}\n```'

    expect(looksLikeAlicizationStructuredPayloadText(payload)).toBe(true)
    expect(shouldBufferAlicizationStructuredSpeechPrelude('```json\n{"thought":"obligation=answer"')).toBe(true)
  })

  it('does not classify ordinary human dialogue as structured envelope text', () => {
    const reply = '你好，我在。你接下来想聊什么，或者想让我做什么，都直接说。'

    expect(looksLikeAlicizationStructuredPayloadText(reply)).toBe(false)
    expect(shouldBufferAlicizationStructuredSpeechPrelude(reply)).toBe(false)
  })
})
