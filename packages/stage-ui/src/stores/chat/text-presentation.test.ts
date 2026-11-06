import { afterEach, describe, expect, it, vi } from 'vitest'

import { createChatTextPresenter, planChatTextPresentation, presentChatText } from './text-presentation'

afterEach(() => vi.useRealTimers())

describe('admitted reading stream', () => {
  it('presents a network chunk immediately without waiting for a speech clock', async () => {
    vi.useFakeTimers()
    const present = vi.fn(async () => Date.now())
    const work = presentChatText({ text: '啊衣。', signal: new AbortController().signal, isCurrent: () => true, present })
    expect(present).toHaveBeenCalledExactlyOnceWith({ text: '啊衣。', offset: 0 }, '啊衣。')
    expect(await work).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts before producer completion and retains one append-only body across gaps', async () => {
    const seen: string[] = []
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present: async (_chunk, text) => {
      seen.push(text)
      return Date.now()
    } })
    presenter.append('你', { offset: 0, sequence: 0 })
    expect(seen).toEqual(['你'])
    await Promise.resolve()
    presenter.append('好。', { offset: 1, sequence: 1 })
    presenter.seal('你好。', { offset: 3, sequence: 2 })
    expect(await presenter.finish('你好。')).toBe(true)
    expect(seen).toEqual(['你', '你好。'])
  })

  it('coalesces only unseen suffixes during a slow UI commit', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => release = resolve)
    const present = vi.fn(async (..._args: unknown[]) => {
      await gate
      return Date.now()
    })
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present })
    presenter.append('第一')
    presenter.append('第二')
    presenter.append('第三')
    release()
    expect(await presenter.finish('第一第二第三')).toBe(true)
    expect(present.mock.calls).toEqual([[{ text: '第一', offset: 0 }, '第一'], [{ text: '第二第三', offset: 2 }, '第一第二第三']])
  })

  it('ignores exact packet replay and rejects gaps and post-completion replacement', async () => {
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present: async () => Date.now() })
    expect(presenter.append('你好', { offset: 0, sequence: 0 })).toBe(true)
    expect(presenter.append('你好', { offset: 0, sequence: 0 })).toBe(false)
    expect(() => presenter.append('尾', { offset: 9, sequence: 1 })).toThrow('Out-of-order')
    presenter.seal('你好', { offset: 2, sequence: 1 })
    expect(() => presenter.append('替换', { offset: 2, sequence: 1 })).toThrow('already complete')
    await expect(presenter.finish('改写')).rejects.toThrow('cannot replace')
    expect(await presenter.finish('你好')).toBe(true)
  })

  it('cancels buffered commits and a superseded owner cannot display text', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => release = resolve)
    const present = vi.fn(async () => {
      await gate
      return Date.now()
    })
    const signal = new AbortController()
    const presenter = createChatTextPresenter({ signal: signal.signal, isCurrent: () => true, present })
    presenter.append('已显示')
    presenter.append('未显示')
    signal.abort()
    release()
    await presenter.cancel()
    expect(presenter.visibleText).toBe('已显示')
    expect(present).toHaveBeenCalledTimes(1)
    expect(await presentChatText({ text: '旧', signal: new AbortController().signal, isCurrent: () => false, present })).toBe(false)
    expect(present).toHaveBeenCalledTimes(1)
  })

  it('keeps emoji continuations and combining marks in the same reading body', async () => {
    const presenter = createChatTextPresenter({ signal: new AbortController().signal, isCurrent: () => true, present: async () => Date.now() })
    presenter.append('👩')
    presenter.append('‍💻e')
    presenter.append('\u0301')
    expect(await presenter.finish('👩‍💻e\u0301')).toBe(true)
    expect(presenter.visibleText).toBe('👩‍💻e\u0301')
  })
})

describe('independent articulation plan', () => {
  it('resolves contextual Chinese pronunciation and keeps graphemes whole', () => {
    const units = planChatTextPresentation('重庆银行重新开门，啊衣乌👩‍💻。')
    expect(units.slice(0, 6).map(unit => unit.phoneme)).toEqual(['chong', 'qing', 'yin', 'hang', 'chong', 'xin'])
    expect(units.map(unit => unit.grapheme).join('')).toBe('重庆银行重新开门，啊衣乌👩‍💻。')
    expect(units.find(unit => unit.grapheme === '👩‍💻')?.script).toBe('silent')
  })

  it('uses natural speech tempo and differentiated pauses independently of reading', () => {
    const units = planChatTextPresentation('今天画画很开心，明天一起继续吧。')
    const syllables = units.filter(unit => unit.script === 'pinyin')
    const seconds = syllables.reduce((sum, unit) => sum + unit.durationMs, 0) / 1000
    expect(syllables.length / seconds).toBeGreaterThan(3.5)
    expect(syllables.length / seconds).toBeLessThan(4.5)
    expect(units.at(-1)!.durationMs).toBeGreaterThan(units.find(unit => unit.grapheme === '，')!.durationMs)
  })
})
