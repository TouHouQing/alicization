import { describe, expect, it } from 'vitest'

import { createVisibleReplyStreamDecoder } from './stream-decoder'

describe('public body decoding during provider generation', () => {
  const body = '你好，重庆银行。👩‍💻\n第二行“引号”\\反斜线'
  const raw = JSON.stringify({ thought: 'PRIVATE', nested: { reply: 'NESTED PRIVATE' }, reply: body, performance: { facialCue: null }, memoryUsage: { ids: [] } })
  it('decodes the exact root body for every possible split without emitting private fields', () => {
    for (let split = 0; split <= raw.length; split++) {
      let visible = ''
      const decoder = createVisibleReplyStreamDecoder(text => visible += text)
      decoder.push(raw.slice(0, split))
      decoder.push(raw.slice(split))
      decoder.finish()
      expect(visible).toBe(body)
    }
  })
  it('publishes the first public text before the reply string, metadata or provider request finishes', () => {
    let visible = ''
    const decoder = createVisibleReplyStreamDecoder(text => visible += text)
    decoder.push('{"reply":"你')
    expect(visible).toBe('你')
    decoder.push('好","thought":"INTERNAL"}')
    decoder.finish()
    expect(visible).toBe('你好')
  })
  it('separates a small emotion header and negotiated plain output from private metadata', () => {
    const emotion = [] as string[]
    let visible = ''
    const decoder = createVisibleReplyStreamDecoder(text => visible += text, { onEmotion: value => emotion.push(value) })
    decoder.push('{"emotion":"happy","reply":"好')
    expect(emotion).toEqual(['happy'])
    expect(visible).toBe('好')
    decoder.push('","private":{"emotion":"angry"}}')
    decoder.finish()
    expect(emotion).toEqual(['happy'])
    visible = ''
    const plain = createVisibleReplyStreamDecoder(text => visible += text, { allowPlainText: true })
    plain.push('你')
    expect(visible).toBe('你')
    plain.push('好。')
    plain.finish()
    expect(visible).toBe('你好。')
  })
  it('handles escaped surrogate pairs and whitespace across individual-byte-sized chunks', () => {
    let visible = ''
    const decoder = createVisibleReplyStreamDecoder(text => visible += text)
    for (const char of '{"reply":"  \\u4f60\\u597d \\ud83d\\ude00  "}')
      decoder.push(char)
    decoder.finish()
    expect(visible).toBe('你好 😀')
  })
  it('holds split private framing instead of releasing or silently removing it', () => {
    let visible = ''
    const decoder = createVisibleReplyStreamDecoder(text => visible += text)
    decoder.push('{"reply":"你好<thi')
    expect(visible).toBe('你好')
    expect(() => decoder.push('nk>private')).toThrow('internal-leak')
    expect(visible).toBe('你好')
  })
  it('does not mistake an ordinary final word for a private heading', () => {
    let visible = ''
    const decoder = createVisibleReplyStreamDecoder(text => visible += text)
    decoder.push('{"reply":"One thought"}')
    decoder.finish()
    expect(visible).toBe('One thought')
  })
  it('rejects duplicate root keys, invalid escapes, truncated strings and excessive body length', () => {
    for (const malformed of ['{"reply":"first","reply":"second"}', '{"reply":"\\q"}', '{"reply":42}', '{"reply":"\\ud800x"}', '{"reply":"好",}', '{"private":[1,],"reply":"好"}']) {
      const decoder = createVisibleReplyStreamDecoder(() => {})
      expect(() => { decoder.push(malformed); decoder.finish() }).toThrow()
    }
    const truncated = createVisibleReplyStreamDecoder(() => {})
    truncated.push('{"reply":"unfinished')
    expect(() => truncated.finish()).toThrow()
    const large = createVisibleReplyStreamDecoder(() => {})
    expect(() => large.push(JSON.stringify({ reply: 'a'.repeat(12_001) }))).toThrow('limit')
  })
})
