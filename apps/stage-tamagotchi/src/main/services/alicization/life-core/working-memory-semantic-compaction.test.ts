import { describe, expect, it, vi } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import { parseWorkingMemoryCheckpoint, serializeWorkingMemoryCheckpoint } from './working-memory-checkpoint'
import { createWorkingMemorySemanticCompactor, prepareWorkingMemorySemanticCompaction } from './working-memory-semantic-compaction'
import { createWorkingMemoryStore } from './working-memory-store'

function fixture() {
  const snapshot = createEmptyWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'home', now: 100 })
  snapshot.commitments = [{ text: '答应陪伴，不代表已经完成', sourceTurnId: 't-0:user' }]
  snapshot.compressedTimeline = Array.from({ length: 9 }, (_, index) => ({ id: `e-${index}`, sourceTurnIds: [`t-${index}:user`, `t-${index}:alice`], summary: `谈话 ${index}`, thread: '共同生活', unresolvedQuestions: [], commitments: [], corrections: [], relationshipPosture: null, emotionalPosture: null, executionCarry: null, importance: 0.6, createdAt: index, evidence: [{ turnId: `t-${index}:user`, role: 'user' as const, quote: index === 0 ? '不要叫我老板，叫我小青。' : `我想和你说一件事 ${index}。` }, { turnId: `t-${index}:alice`, role: 'alice' as const, quote: `我答应陪你 ${index}。` }], method: 'extractive' as const }))
  return snapshot
}

describe('semantic working-memory checkpoint', () => {
  it('lets the model select exact attributed evidence without authoring facts or completing promises', () => {
    const snapshot = fixture()
    const plan = prepareWorkingMemorySemanticCompaction(snapshot)!
    const next = plan.accept(JSON.stringify({ selected: [{ id: 0, kind: 'correction' }, { id: 1, kind: 'commitment' }] }))
    expect(next.compressedTimeline).toHaveLength(4)
    expect(next.compressedTimeline[0]?.evidence).toEqual(snapshot.compressedTimeline[0]?.evidence)
    expect(next.compressedTimeline[0]?.method).toBe('model-selected')
    expect(next.commitments).toEqual(snapshot.commitments)
    expect(next.updatedAt).toBe(snapshot.updatedAt)
    expect(parseWorkingMemoryCheckpoint(serializeWorkingMemoryCheckpoint(next))?.compressedTimeline[0]?.evidence).toEqual(next.compressedTimeline[0]?.evidence)
    expect(() => plan.accept('{"selected":[{"id":63,"kind":"task"}]}')).toThrow('unknown')
    expect(() => plan.accept('{"selected":[{"id":0,"kind":"task"},{"id":0,"kind":"task"}]}')).toThrow('repeated')
    expect(() => plan.accept('{"selected":[{"id":0,"kind":"task","quote":"我已经完成了任务"}]}')).toThrow()
  })

  it('commits only against the exact source checkpoint and preserves extractive state on provider failure', async () => {
    const store = createWorkingMemoryStore()
    const snapshot = fixture()
    store.upsert(snapshot)
    const replace = vi.fn(async () => true)
    const generate = vi.fn(async () => '{"selected":[{"id":0,"kind":"correction"}]}')
    const compact = createWorkingMemorySemanticCompactor({ store, generate, replace })
    await compact(snapshot)
    expect(replace).toHaveBeenCalledOnce()
    expect(store.get('alice', 'home')?.compressedTimeline[0]?.method).toBe('model-selected')

    store.upsert(snapshot)
    const failedReplace = vi.fn()
    await createWorkingMemorySemanticCompactor({ store, generate: async () => null, replace: failedReplace })(snapshot)
    expect(store.get('alice', 'home')).toEqual(snapshot)
    expect(failedReplace).not.toHaveBeenCalled()
  })

  it('discards a late result after a newer turn, and never crosses a cancelled lifetime', async () => {
    const store = createWorkingMemoryStore()
    const snapshot = fixture()
    store.upsert(snapshot)
    const replace = vi.fn(async () => true)
    const newer = { ...snapshot, updatedAt: 101 }
    const compact = createWorkingMemorySemanticCompactor({ store, replace, generate: async () => {
      store.upsert(newer)
      return '{"selected":[{"id":0,"kind":"correction"}]}'
    } })
    await compact(snapshot)
    expect(replace).not.toHaveBeenCalled()
    expect(store.get('alice', 'home')?.updatedAt).toBe(101)
    const controller = new AbortController()
    controller.abort()
    await expect(compact(snapshot, controller.signal)).rejects.toThrow()
  })

  it('does not send revoked source excerpts to the summarizer', async () => {
    const store = createWorkingMemoryStore()
    const snapshot = fixture()
    store.upsert(snapshot)
    const generate = vi.fn()
    const replace = vi.fn()
    await createWorkingMemorySemanticCompactor({ store, generate, replace, sourcesCurrent: async () => false })(snapshot)
    expect(generate).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(store.get('alice', 'home')).toEqual(snapshot)
  })
})
