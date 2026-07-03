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

  it('returns the latest snapshot for a card when session id is not provided', () => {
    const store = createWorkingMemoryStore()
    const older = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-old',
      now: 100,
    })
    const newer = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-new',
      now: 200,
    })

    store.upsert(older)
    store.upsert(newer)

    expect(store.latest('default')?.sessionId).toBe('session-new')
    expect(store.list('default').map(snapshot => snapshot.sessionId)).toEqual(['session-new', 'session-old'])
  })

  it('keeps latest snapshots cloned so UI projection cannot mutate owner state', () => {
    const store = createWorkingMemoryStore()
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 100,
    })

    store.upsert(snapshot)
    const latest = store.latest('default')
    expect(latest).not.toBeNull()
    latest!.memoryQueryHints.push('mutated outside store')

    expect(store.latest('default')?.memoryQueryHints).toEqual([])
  })
})
