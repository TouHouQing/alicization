import { afterEach, describe, expect, it, vi } from 'vitest'

import { createChatTextPresenter, planChatTextPresentation, presentChatText } from './text-presentation'

afterEach(() => vi.useRealTimers())

describe('accepted text presentation and its mouth cursor', () => {
  it('keeps a full glyph dwell from the actual UI commit after a slow render and hook', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const calls: number[] = []
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present: async () => {
      calls.push(Date.now())
      if (calls.length === 1) {
        await new Promise(resolve => setTimeout(resolve, 150))
        const committedAt = Date.now()
        await new Promise(resolve => setTimeout(resolve, 100))
        return committedAt
      }
      return Date.now()
    } })
    presenter.append('啊衣')
    const done = presenter.finish('啊衣')
    await vi.advanceTimersByTimeAsync(379)
    expect(calls).toEqual([1000])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual([1000, 1380])
    await vi.runAllTimersAsync()
    expect(await done).toBe(true)
  })
  it('starts before producer completion, waits across network gaps, and never replays the settled body', async () => {
    vi.useFakeTimers()
    const seen: string[] = []
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present: async (_unit, visible) => {
      seen.push(visible)
      return Date.now()
    } })
    presenter.append('你', { offset: 0, sequence: 0 })
    expect(seen).toEqual(['你'])
    await vi.advanceTimersByTimeAsync(500)
    expect(seen).toEqual(['你'])
    presenter.append('好。', { offset: 1, sequence: 1 })
    await vi.advanceTimersByTimeAsync(0)
    expect(seen).toEqual(['你', '你好'])
    const settled = presenter.finish('你好。')
    await vi.runAllTimersAsync()
    expect(await settled).toBe(true)
    expect(seen).toEqual(['你', '你好', '你好。'])
  })

  it('ignores exact packet replay, rejects gaps/replacements, and cancels buffered text promptly', async () => {
    vi.useFakeTimers()
    const seen: string[] = []
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present: async (_unit, visible) => {
      seen.push(visible)
      return Date.now()
    } })
    expect(presenter.append('你好', { offset: 0, sequence: 0 })).toBe(true)
    expect(presenter.append('你好', { offset: 0, sequence: 0 })).toBe(false)
    expect(() => presenter.append('尾', { offset: 9, sequence: 1 })).toThrow('Out-of-order')
    await expect(presenter.finish('改写后的回复')).rejects.toThrow('cannot replace')
    await presenter.cancel()
    await vi.runAllTimersAsync()
    expect(seen).toEqual(['你'])
  })

  it('keeps native emoji and late combining continuations in the same visible body', async () => {
    vi.useFakeTimers()
    const seen: string[] = []
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present: async (_unit, visible) => {
      seen.push(visible)
      return Date.now()
    } })
    presenter.append('👩')
    await vi.advanceTimersByTimeAsync(60)
    presenter.append('‍💻你好')
    const done = presenter.finish('👩‍💻你好')
    await vi.runAllTimersAsync()
    expect(await done).toBe(true)
    expect(seen.at(-1)).toBe('👩‍💻你好')
  })
  it('resolves contextual Chinese readings and keeps graphemes whole', () => {
    const units = planChatTextPresentation('重庆银行重新开门，啊衣乌👩‍💻。')
    expect(units.slice(0, 6).map(unit => unit.phoneme)).toEqual(['chong', 'qing', 'yin', 'hang', 'chong', 'xin'])
    expect(units.map(unit => unit.grapheme).join('')).toBe('重庆银行重新开门，啊衣乌👩‍💻。')
    expect(units.find(unit => unit.grapheme === '👩‍💻')?.script).toBe('silent')
  })

  it('presents the first glyph immediately, then uses the same cursor for content and lips', async () => {
    vi.useFakeTimers()
    const presented: any[] = []
    const work = presentChatText({ text: '啊衣。', signal: new AbortController().signal, isCurrent: () => true, present: async (unit, visible) => {
      presented.push({ ...unit, visible, at: Date.now() })
      return Date.now()
    } })
    expect(presented.map(unit => unit.visible)).toEqual(['啊'])
    await vi.advanceTimersByTimeAsync(229)
    expect(presented.map(unit => unit.visible)).toEqual(['啊'])
    await vi.advanceTimersByTimeAsync(1)
    expect(presented.map(unit => unit.visible)).toEqual(['啊', '啊衣'])
    await vi.runAllTimersAsync()
    expect(await work).toBe(true)
    expect(presented.map(unit => unit.phoneme)).toEqual(['a', 'yi', '。'])
    expect(presented.at(-1).script).toBe('silent')
  })

  it('paces a whole Chinese sentence with phrase lengthening and differentiated pauses', () => {
    const units = planChatTextPresentation('今天画画很开心，明天一起继续吧。')
    const syllables = units.filter(unit => unit.script === 'pinyin')
    const speakingMs = syllables.reduce((sum, unit) => sum + unit.durationMs, 0)
    expect(syllables.length / (speakingMs / 1000)).toBeGreaterThan(3.5)
    expect(syllables.length / (speakingMs / 1000)).toBeLessThan(4.5)
    expect(units.find(unit => unit.grapheme === '，')!.durationMs).toBeGreaterThan(230)
    expect(units.at(-1)!.durationMs).toBeGreaterThan(units.find(unit => unit.grapheme === '，')!.durationMs)
    expect(units.find(unit => unit.grapheme === '心')!.durationMs).toBeGreaterThan(units[0]!.durationMs)
  })

  it('interrupts its wait and never emits a stale tail after cancellation or generation replacement', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const present = vi.fn(async () => Date.now())
    const work = presentChatText({ text: '啊衣乌', signal: controller.signal, isCurrent: () => true, present })
    await vi.advanceTimersByTimeAsync(20)
    controller.abort()
    expect(await work).toBe(false)
    await vi.runAllTimersAsync()
    expect(present).toHaveBeenCalledTimes(1)
    expect(await presentChatText({ text: '旧', signal: new AbortController().signal, isCurrent: () => false, present })).toBe(false)
    expect(present).toHaveBeenCalledTimes(1)
  })
})
