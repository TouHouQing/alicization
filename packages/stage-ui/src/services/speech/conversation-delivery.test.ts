import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSilentReplyPlayer, createSpokenAudioCursor, createSpokenReplyPlanner, deliveryKey, restoreConversationDeliveryState, validateSpeechTextTimings } from './conversation-delivery'

afterEach(() => vi.useRealTimers())

describe('source-based spoken reply selection', () => {
  it('selects a natural clause before the full response finishes', () => {
    const planner = createSpokenReplyPlanner()
    expect(planner.append('今天的')).toEqual([])
    expect(planner.append('天气很好，')).toEqual([expect.objectContaining({ text: '今天的天气很好，', start: 0, end: 8 })])
    expect(planner.append('要不要散步')).toEqual([])
    expect(planner.finish().map(item => item.text)).toEqual(['要不要散步'])
    expect(planner.partial).toBe(false)
  })

  it('never reads code or URL tails even when delimiters arrive in different packets', () => {
    const planner = createSpokenReplyPlanner()
    const spoken: string[] = []
    for (const chunk of ['先看看结果。\n`', '``ts\nconst secret = 1;\n`', '``\n详情在 https:', '//example.', 'com/private/path\n最后再试一次。'])
      spoken.push(...planner.append(chunk).map(item => item.text))
    spoken.push(...planner.finish().map(item => item.text))
    expect(spoken.join('')).toBe('先看看结果。详情在最后再试一次。')
    expect(planner.partial).toBe(true)
  })

  it('keeps streamed decimals whole and allows explicit full code reading', () => {
    const planner = createSpokenReplyPlanner({ full: true })
    expect(planner.append('版本是 3.')).toEqual([])
    planner.append('14。\n```ts\nconst value = 1;\n```\n结束。')
    planner.finish()
    expect(planner.spans.map(item => item.text).join('')).toContain('版本是 3.14。const value = 1;结束。')
  })

  it('bounds automatic speech while preserving the complete reading source', () => {
    const text = '一二三四五六七八九十。'.repeat(50)
    const planner = createSpokenReplyPlanner({ maximumCharacters: 25 })
    planner.append(text)
    planner.finish()
    expect(planner.source).toBe(text)
    expect(planner.spans.reduce((sum, item) => sum + item.text.length, 0)).toBeLessThanOrEqual(25)
    expect(planner.partial).toBe(true)
  })

  it('maps Markdown omissions back to original UTF-16 positions', () => {
    const planner = createSpokenReplyPlanner()
    planner.append('**你好**，一起开始。')
    planner.finish()
    const span = planner.spans[0]!
    expect(span.text).toBe('你好，')
    expect(span.sourceOffsets?.map(index => planner.source[index] ?? '')).toEqual(['你', '好', '，', '一'])
  })

  it('supports immediate silent articulation and waits for a split surrogate', () => {
    const planner = createSpokenReplyPlanner({ eager: true })
    expect(planner.append('啊')[0]?.text).toBe('啊')
    expect(planner.append('\uD83D')).toEqual([])
    expect(planner.append('\uDE00')[0]?.text).toBe('😀')
  })

  it('reads a Markdown link label and keeps destination bytes out of speech', () => {
    const planner = createSpokenReplyPlanner()
    expect(planner.append('可以看看[说明](https://example.')).toEqual([])
    planner.append('com/doc)。然后继续。')
    planner.finish()
    expect(planner.spans.map(span => span.text).join('')).toBe('可以看看说明。然后继续。')
  })
  it('preserves operators and variable names when explicitly reading code', () => {
    const planner = createSpokenReplyPlanner({ full: true })
    planner.append('```ts\nconst total_sum = a * b;\n```\n`snake_case`。')
    planner.finish()
    expect(planner.spans.map(span => span.text).join('')).toBe('const total_sum = a * b;snake_case。')
    expect(planner.partial).toBe(false)
  })
})

describe('actual audio playhead alignment', () => {
  it('estimates from real duration and freezes when the playhead does not advance', () => {
    vi.useFakeTimers()
    const cursor = createSpokenAudioCursor('啊衣。', 2000)
    const first = cursor.at(100, 'one')
    expect(cursor.alignment).toBe('estimated')
    vi.advanceTimersByTime(5000)
    const frozen = cursor.at(100, 'one')
    expect(frozen.frame?.audioElapsedMs).toBe(first.frame?.audioElapsedMs)
    expect(frozen.frame?.offset).toBe(first.frame?.offset)
    expect(cursor.at(2000, 'one')).toEqual({ frame: null, end: 3 })
  })

  it('respects provider word gaps and subdivides a timed word into contextual syllables', () => {
    const cursor = createSpokenAudioCursor('啊衣', 1500, [{ start: 0, end: 2, startMs: 300, endMs: 1300 }])
    expect(cursor.alignment).toBe('tts')
    expect(cursor.at(100, 'one').frame).toBeNull()
    expect(cursor.at(400, 'one').frame?.grapheme).toBe('啊')
    expect(cursor.at(1100, 'one').frame?.grapheme).toBe('衣')
    expect(cursor.at(1400, 'one')).toEqual({ frame: null, end: 2 })
  })

  it.each([
    [{ start: -1, end: 1, startMs: 0, endMs: 100 }],
    [{ start: 0, end: 99, startMs: 0, endMs: 100 }],
    [{ start: 0, end: 1, startMs: 0, endMs: Number.NaN }],
    [{ start: 0, end: 1, startMs: 200, endMs: 100 }],
    [{ start: 0, end: 1, startMs: 0, endMs: 2000 }],
  ])('rejects untrustworthy adapter timing %j', (...timings) => {
    expect(validateSpeechTextTimings('你好', 1000, timings.flat())).toBeNull()
  })
})

describe('silent expression ownership', () => {
  it('keeps pronunciation context when Chinese words cross reading chunks', async () => {
    vi.useFakeTimers()
    const frame = vi.fn()
    const player = createSilentReplyPlayer({ frame, complete: vi.fn(), present: vi.fn() })
    player.begin('one')
    player.append([{ text: '银', start: 0, end: 1 }])
    player.append([{ text: '行。', start: 1, end: 3 }])
    player.finish()
    await vi.runAllTimersAsync()
    expect(frame.mock.calls.find(([item]) => item?.grapheme === '行')?.[0]).toMatchObject({ phoneme: 'hang', offset: 1 })
  })
  it('runs independently after text completion and cancels stale queued units', async () => {
    vi.useFakeTimers()
    const frame = vi.fn()
    const complete = vi.fn()
    const player = createSilentReplyPlayer({ frame, complete, present: vi.fn() })
    player.begin('old')
    player.append([{ text: '啊衣乌', start: 0, end: 3 }])
    player.finish()
    expect(frame.mock.calls.at(-1)?.[0]?.grapheme).toBe('啊')
    expect(complete).not.toHaveBeenCalled()
    player.begin('new')
    player.append([{ text: '你', start: 0, end: 1 }])
    player.finish()
    await vi.runAllTimersAsync()
    expect(frame.mock.calls.filter(([item]) => item?.turnId === 'old')).toHaveLength(1)
    expect(complete).toHaveBeenCalledTimes(1)
    expect(frame.mock.calls.at(-1)?.[0]).toBeNull()
  })

  it('does not treat an active disk cache as current playback or conflate identity keys', () => {
    expect(deliveryKey({ cardId: 'a:b', sessionId: 'c', turnId: 'd' })).not.toBe(deliveryKey({ cardId: 'a', sessionId: 'b:c', turnId: 'd' }))
    expect(restoreConversationDeliveryState({ cardId: 'a', sessionId: 's', turnId: 't', epoch: 'e', revision: 1, phase: 'speaking', mode: 'voice', currentText: '你好', start: 0, end: 2, spokenEnd: null, playedMs: 50, partial: false, alignment: 'estimated' })?.phase).toBe('interrupted')
  })
})
