import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import { createWorkingMemoryStore } from './working-memory-store'

describe('working memory store', () => {
  it('stores snapshots by card and session without sharing mutable references', () => {
    const store = createWorkingMemoryStore()
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 1000,
    })
    snapshot.memoryQueryHints.push('短期记忆')

    store.upsert(snapshot)
    snapshot.memoryQueryHints.push('外部修改')

    expect(store.get('default', 'session-1')?.memoryQueryHints).toEqual(['短期记忆'])
    store.clear('default', 'session-1')
    expect(store.get('default', 'session-1')).toBeNull()
  })
})
