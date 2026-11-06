import { afterEach, describe, expect, it, vi } from 'vitest'

import { createConversationOutputController } from './conversation-output-controller'

afterEach(() => vi.useRealTimers())

function fixture() {
  const ports = { state: vi.fn(), frame: vi.fn(), caption: vi.fn(), writeSpeech: vi.fn(), endSpeech: vi.fn(), cancelSpeech: vi.fn(), perform: vi.fn(), finishPerformance: vi.fn(), silentMouth: () => true, rate: () => 1 }
  const output = createConversationOutputController(ports)
  const identity = { cardId: 'card', sessionId: 'session', turnId: 'turn', epoch: 'first' }
  const audio = (status: 'started' | 'progress' | 'completed' | 'interrupted' | 'failed', playedMs: number, extra = {}) => output.audio({ epoch: 'first', segmentId: 'segment-1', text: '啊衣。', status, playedMs, durationMs: 2000, activeAudio: status === 'started' || status === 'progress', ...extra })
  return { output, ports, identity, audio }
}

describe('one response, independent reading and actual voice delivery', () => {
  it('finishes reading while voice continues, and never reports generated audio as played', () => {
    const { output, ports, identity, audio } = fixture()
    output.begin(identity, 'voice')
    output.append('啊衣。', 0)
    output.finish()
    expect(ports.writeSpeech).toHaveBeenCalledExactlyOnceWith('啊衣。\n')
    expect(output.current?.phase).toBe('waiting')
    expect(ports.frame.mock.calls.every(([frame]) => frame === null)).toBe(true)
    expect(output.current?.spokenEnd).toBeNull()
    audio('started', 0)
    audio('progress', 400)
    expect(output.current?.phase).toBe('speaking')
    expect(ports.frame.mock.calls.at(-1)?.[0]?.clock).toBe('audio')
    expect(audio('completed', 2000)?.alignedTextEnd).toBe(3)
    output.finishVoice('first', 'completed')
    expect(output.current).toMatchObject({ phase: 'completed', spokenEnd: 3, playedMs: 2000 })
    expect(ports.frame.mock.calls.at(-1)?.[0]).toBeNull()
  })

  it('does not move the mouth across playback gaps and rejects stale segments and epochs', () => {
    const { output, ports, identity, audio } = fixture()
    output.begin(identity, 'voice')
    output.append('啊衣。', 0)
    audio('progress', 500)
    audio('progress', 500, { activeAudio: false })
    expect(ports.frame.mock.calls.at(-1)?.[0]).toBeNull()
    audio('completed', 2000)
    expect(audio('progress', 100)).toBeNull()
    output.begin({ ...identity, epoch: 'second' }, 'voice')
    const count = ports.state.mock.calls.length
    expect(audio('progress', 600)).toBeNull()
    output.finishVoice('first', 'completed')
    expect(ports.state).toHaveBeenCalledTimes(count)
    expect(output.current?.epoch).toBe('second')
  })

  it('accumulates actual playback across phrases and binds trimmed/combined Markdown chunks', () => {
    const { output, identity, audio, ports } = fixture()
    output.begin(identity, 'voice')
    output.append('**啊衣**，你好。再见。', 0)
    audio('completed', 1000, { text: '啊衣，\n你好。' })
    audio('progress', 200, { segmentId: 'segment-2', text: '再见。' })
    expect(ports.frame.mock.calls.at(-1)?.[0]?.offset).toBe(10)
    const result = audio('completed', 800, { segmentId: 'segment-2', text: '再见。' })
    expect(result?.alignedTextEnd).toBe(13)
    expect(output.current?.playedMs).toBe(1800)
  })

  it('retains only confirmed phrase delivery on interruption', () => {
    const { output, identity, audio, ports } = fixture()
    output.begin(identity, 'voice')
    output.append('啊衣。下一句话。', 0)
    audio('completed', 900)
    const partial = audio('interrupted', 250, { segmentId: 'segment-2', text: '下一句话。' })
    expect(partial?.alignedTextEnd).toBe(3)
    expect(output.current).toMatchObject({ phase: 'interrupted', playedMs: 1150, spokenEnd: 3 })
    expect(ports.cancelSpeech).toHaveBeenCalledWith('first')
    expect(ports.finishPerformance).toHaveBeenCalledWith('turn')
  })

  it('does not let arbitrary playback text become proof that source text was spoken', () => {
    const { output, identity, audio } = fixture()
    output.begin(identity, 'voice')
    output.append('啊衣。', 0)
    expect(audio('completed', 1000, { text: '不属于回复的文本' })).toBeNull()
    expect(output.current).toMatchObject({ phase: 'failed', spokenEnd: null })
  })

  it('marks auto excerpts and keeps explicit full reading source-based', () => {
    const { output, identity } = fixture()
    const text = '一二三四五六七八九十。'.repeat(30)
    output.begin(identity, 'voice')
    output.append(text, 0)
    output.finish()
    expect(output.current?.partial).toBe(true)
    output.begin({ ...identity, epoch: 'full' }, 'voice', true)
    output.append(text, 0)
    output.finish()
    expect(output.current?.partial).toBe(false)
  })

  it('begins silent mouth at the first streamed character without emitting speech', async () => {
    vi.useFakeTimers()
    const { output, ports, identity } = fixture()
    output.begin(identity, 'silent')
    output.append('啊', 0)
    expect(ports.frame.mock.calls.at(-1)?.[0]?.grapheme).toBe('啊')
    output.append('衣。', 1)
    output.finish()
    expect(output.source).toBe('啊衣。')
    expect(output.current?.phase).toBe('silent')
    expect(ports.writeSpeech).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(output.current?.phase).toBe('completed')
    expect(output.current?.spokenEnd).toBeNull()
  })

  it('supports disabled silent mouth and cancels all owned output on stop', () => {
    const { output, ports, identity, audio } = fixture()
    ports.silentMouth = () => false
    output.begin(identity, 'silent')
    output.append('啊衣。', 0)
    output.finish()
    expect(output.current?.phase).toBe('completed')
    expect(ports.perform).not.toHaveBeenCalled()
    output.begin({ ...identity, epoch: 'voice' }, 'voice')
    output.append('啊衣。', 0)
    output.cancel()
    expect(ports.cancelSpeech).toHaveBeenCalledWith('voice')
    expect(output.current?.phase).toBe('interrupted')
    expect(audio('progress', 100, { epoch: 'voice' })).toBeNull()
  })
})
