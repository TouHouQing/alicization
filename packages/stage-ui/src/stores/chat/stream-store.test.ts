import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useChatStreamStore } from './stream-store'

const mocks = vi.hoisted(() => ({ messages: [] as any[], persist: vi.fn() }))
vi.mock('./session-store', () => ({ useChatSessionStore: () => ({ activeSessionId: 'session', getSessionMessages: () => mocks.messages, persistSessionMessages: mocks.persist }) }))

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.messages.length = 0
  mocks.persist.mockClear()
})

describe('remote stream identity and single completion', () => {
  it('retains the visible prefix and non-learning interruption state across remote cancellation', () => {
    const store = useChatStreamStore()
    store.beginStream('chat:session:cancelled')
    store.appendStreamLiteral('尚未说完')
    store.interruptStream('provider-failed')
    expect(mocks.messages).toHaveLength(1)
    expect(mocks.messages[0]).toMatchObject({ content: '尚未说完', delivery: { status: 'interrupted', reason: 'failed', visibleText: '尚未说完' }, structured: { contractFailed: true, learningPolicy: { allowLongTermCondensation: false, allowPersonaLearning: false, allowTraining: false } } })
    expect(store.streamingMessage.content).toBe('')
  })
  it('upserts the same replay turn and cannot append it twice on repeated end events', () => {
    const store = useChatStreamStore()
    const execution = { type: 'execution-status', phase: 'completed', label: 'Done' }
    mocks.messages.push({ id: 'chat:session:turn:gw1', role: 'assistant', content: '我在这里。', slices: [execution, { type: 'text', text: '我在这里。' }], tool_results: [{ id: 'tool-1', result: { status: 'completed' } }], structured: { reply: '我在这里。' } })
    store.beginStream('chat:session:turn')
    store.appendStreamLiteral('我')
    store.appendStreamLiteral('在这里。')
    expect(store.streamingMessage.id).toBe('chat:session:turn')
    store.finalizeStream('我在这里。')
    store.finalizeStream('我在这里。')
    expect(mocks.messages).toHaveLength(1)
    expect(mocks.messages[0]).toMatchObject({ content: '我在这里。', structured: { reply: '我在这里。' } })
    expect(mocks.messages[0].slices).toEqual([execution, { type: 'text', text: '我在这里。' }])
    expect(mocks.messages[0].tool_results).toHaveLength(1)
    expect(store.streamingMessage.content).toBe('')
    expect(store.streamingMessage.slices).toEqual([])
  })
  it('commits an end-only transparent failure surface even without text cursor events', () => {
    const store = useChatStreamStore()
    store.beginStream('chat:session:failure')
    store.finalizeStream('连接失败，请检查服务配置。')
    expect(mocks.messages).toHaveLength(1)
    expect(mocks.messages[0].content).toBe('连接失败，请检查服务配置。')
  })
})
