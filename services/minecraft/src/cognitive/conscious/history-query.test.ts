import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { createHistoryRuntime } from './history-query'

function createRuntime(history: Message[]) {
  return createHistoryRuntime({
    getConversationHistory: () => history,
    getArchivedContexts: () => [],
    getLlmLogEntries: () => [],
    getCurrentTurnId: () => 1,
  })
}

describe('history runtime playerChats', () => {
  it('extracts the first event line from recent user messages', () => {
    const history = [
      { role: 'user', content: '[EVENT] Chat: first\nextra details' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'prefix\n[EVENT] Chat: second' },
    ] satisfies Message[]

    expect(createRuntime(history).playerChats(2)).toEqual(['Chat: first', 'Chat: second'])
  })

  it('ignores perception signals and non-event user text', () => {
    const history = [
      { role: 'user', content: '[EVENT] Perception Signal: Alex moved nearby' },
      { role: 'user', content: 'plain text without event' },
      { role: 'user', content: '[EVENT] Chat: usable' },
    ] satisfies Message[]

    expect(createRuntime(history).playerChats(5)).toEqual(['Chat: usable'])
  })
})
