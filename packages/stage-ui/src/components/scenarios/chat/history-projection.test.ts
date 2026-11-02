import type { ChatHistoryItem } from '../../../types/chat'

import { describe, expect, it } from 'vitest'

import { interruptedReplyMessageKey } from './execution-presentation'
import { projectChatHistory } from './history-projection'

describe('one visible reply throughout durable replay and presentation', () => {
  it('keeps one live prefix after its own prompt despite a newer replayed prompt timestamp', () => {
    const prompt: ChatHistoryItem = { role: 'user', id: 'chat:session:turn:gw1:user', content: 'Share my happiness.', createdAt: 500 }
    const durable = { role: 'assistant' as const, id: 'chat:session:turn:gw1', content: 'Complete hidden reply.', createdAt: 100, slices: [{ type: 'text' as const, text: 'Complete hidden reply.' }], tool_results: [] }
    const stream = { ...durable, id: 'chat:session:turn', content: 'Com', slices: [{ type: 'text' as const, text: 'Com' }] }
    const input = [durable, prompt]
    const live = projectChatHistory(input, stream, true)
    expect(live.map(message => message.role)).toEqual(['user', 'assistant'])
    expect(live.map(message => message.content)).toEqual([prompt.content, 'Com'])
    expect(projectChatHistory(input, stream, false).map(message => message.content)).toEqual([prompt.content, durable.content])
    expect(input.map(message => message.role)).toEqual(['assistant', 'user'])
    expect(durable.content).toBe('Complete hidden reply.')
  })

  it('does not advise resubmitting accepted work after a reply fails or durable history reloads', () => {
    for (const toolName of ['life_execute_work_plan', 'life_use_learned_procedure']) {
      const durable = { role: 'assistant' as const, content: 'Unshown suffix', slices: [{ type: 'tool-call' as const, toolCall: { toolName, args: '{}', toolCallId: 'work', toolCallType: 'function' as const } }], tool_results: [], delivery: { status: 'interrupted' as const, reason: 'failed' as const, visibleText: 'Work accepted' } }
      const replayed = projectChatHistory([durable], { role: 'assistant', content: '', slices: [], tool_results: [] }, false)[0] as typeof durable
      expect(interruptedReplyMessageKey(replayed)).toBe('stage.chat.message.work-reply-interrupted')
      expect(replayed.content).toBe('Work accepted')
      expect(interruptedReplyMessageKey({ ...durable, delivery: { ...durable.delivery, reason: 'cancelled' } })).toBe('stage.chat.message.reply-stopped')
    }
    const dialogue = { role: 'assistant' as const, content: 'Hello', slices: [], tool_results: [], delivery: { status: 'interrupted' as const, reason: 'failed' as const, visibleText: 'Hello' } }
    expect(interruptedReplyMessageKey(dialogue)).toBe('stage.chat.message.reply-interrupted')
    expect(interruptedReplyMessageKey({ ...dialogue, delivery: undefined })).toBeNull()
  })

  it('keeps an interrupted prefix after replay and reload instead of exposing an unshown suffix', () => {
    const durable = { id: 'chat:session:stopped', role: 'assistant' as const, content: '可见前缀和尚未看到的后半段', slices: [{ type: 'text' as const, text: '可见前缀和尚未看到的后半段' }], tool_results: [], delivery: { status: 'interrupted' as const, reason: 'cancelled' as const, visibleText: '可见前缀' } }
    const reloaded = JSON.parse(JSON.stringify(durable))
    const rows = projectChatHistory([reloaded], { role: 'assistant', content: '', slices: [], tool_results: [] }, false)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.content).toBe('可见前缀')
    expect((rows[0] as typeof durable).slices).toEqual([{ type: 'text', text: '可见前缀' }])
  })
  const replay = { id: 'chat:session:turn:gw2', role: 'assistant' as const, content: '我在这里。', slices: [{ type: 'text' as const, text: '我在这里。' }], tool_results: [], createdAt: 123 }
  const stream = { ...replay, id: 'chat:session:turn', content: '', slices: [], createdAt: 100 }

  it('masks early main-process replay, advances one bubble, and hands off without mutating history', () => {
    for (const prefix of ['', '我', '我在', '我在这里。']) {
      const current = { ...stream, content: prefix, slices: prefix ? [{ type: 'text' as const, text: prefix }] : [] }
      const rows = projectChatHistory([replay], current, true)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.content).toBe(prefix)
      expect((rows[0] as typeof current).slices.map(slice => slice.text).join('')).toBe(prefix)
    }
    expect(replay.content).toBe('我在这里。')
    expect(projectChatHistory([replay], stream, false)).toEqual([replay])
  })

  it('collapses only the active turn and preserves separate identical replies', () => {
    const previous = { ...replay, id: 'chat:session:previous' }
    const rows = projectChatHistory([previous, replay, { ...replay, id: stream.id }], { ...stream, content: '我' }, true)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toBe(previous)
    expect(rows[1]?.content).toBe('我')
    expect(projectChatHistory([previous] as ChatHistoryItem[], { ...stream, content: '我' }, true)).toHaveLength(2)
  })
})
