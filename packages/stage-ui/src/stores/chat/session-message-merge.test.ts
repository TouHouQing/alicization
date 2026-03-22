import type { ChatHistoryItem } from '../../types/chat'

import assert from 'node:assert/strict'

import { describe, it } from 'vitest'

import { canonicalizeSessionMessages, mergeLoadedSessionMessages } from './session-message-merge'

describe('mergeLoadedSessionMessages', () => {
  it('keeps stored history when the in-memory session only has the placeholder system message', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'saved reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('appends in-flight messages when IndexedDB finishes loading after a new send starts', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'older reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4, id: 'user-2' },
    ]

    assert.deepEqual(mergeLoadedSessionMessages(storedMessages, currentMessages), [
      ...storedMessages,
      currentMessages[1],
    ])
  })

  it('does not duplicate messages that are already present in storage', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('collapses a legacy local assistant duplicate when the authoritative turn replay is present', () => {
    const stableTurnId = 'chat:session-1:turn-1'
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      {
        role: 'assistant',
        content: 'same answer',
        createdAt: 10_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'same answer' }],
        tool_results: [],
        structured: {
          thought: 'authoritative thought',
          emotion: 'happy',
          reply: 'same answer',
          format: 'epoch1-v1',
        },
      },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 2, id: 'system-current' },
      {
        role: 'assistant',
        content: 'same answer',
        createdAt: 10_500,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'same answer',
          format: 'fallback-v1',
        },
      },
    ]

    const merged = mergeLoadedSessionMessages(storedMessages, currentMessages)
    const assistantMessages = merged.filter(message => message.role === 'assistant')

    assert.equal(assistantMessages.length, 1)
    assert.equal(assistantMessages[0]?.id, stableTurnId)
    assert.equal((assistantMessages[0] as any)?.structured?.thought, 'authoritative thought')
  })

  it('collapses duplicate assistant turns already persisted in one session snapshot', () => {
    const stableTurnId = 'chat:session-1:turn-2'
    const messages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      {
        role: 'assistant',
        content: 'duplicate reply',
        createdAt: 20_000,
        id: 'legacy-random-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'duplicate reply',
          format: 'fallback-v1',
        },
      },
      {
        role: 'assistant',
        content: 'duplicate reply',
        createdAt: 20_600,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'duplicate reply' }],
        tool_results: [],
        structured: {
          thought: 'kept thought',
          emotion: 'happy',
          reply: 'duplicate reply',
          format: 'epoch1-v1',
        },
      },
    ]

    const canonical = canonicalizeSessionMessages(messages)
    const assistantMessages = canonical.filter(message => message.role === 'assistant')

    assert.equal(assistantMessages.length, 1)
    assert.equal(assistantMessages[0]?.id, stableTurnId)
    assert.equal((assistantMessages[0] as any)?.structured?.thought, 'kept thought')
  })

  it('keeps the user bubble ahead of the assistant bubble for the same turn timestamp', () => {
    const turnId = 'chat:session-1:turn-3'
    const createdAt = 30_000
    const canonical = canonicalizeSessionMessages([
      {
        id: turnId,
        role: 'assistant',
        content: 'assistant reply',
        createdAt,
        slices: [{ type: 'text', text: 'assistant reply' }],
        tool_results: [],
        structured: {
          thought: 'reply thought',
          emotion: 'neutral',
          reply: 'assistant reply',
          format: 'epoch1-v1',
        },
      },
      {
        id: `${turnId}:user`,
        role: 'user',
        content: 'user prompt',
        createdAt,
      },
    ])

    assert.equal(canonical[0]?.role, 'user')
    assert.equal(canonical[1]?.role, 'assistant')
  })
})
