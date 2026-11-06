import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'
import { buildWorkingMemorySnapshot } from './working-memory-builder'
import { parseWorkingMemoryCheckpoint, serializeWorkingMemoryCheckpoint } from './working-memory-checkpoint'
import { compressWorkingMemorySnapshot } from './working-memory-compressor'
import { findWorkingMemoryCut, selectWorkingMemorySentences, selectWorkingMemoryTimeline, workingMemoryRetention } from './working-memory-retention'

describe('life continuity under working-memory pressure', () => {
  it('selects important English sentences without splitting a file name or decimal', () => {
    const text = `${'Ordinary background. '.repeat(60)}Remember: never modify src/alice.config.ts and keep the value 0.5. ${'More background. '.repeat(60)}`
    const excerpt = selectWorkingMemorySentences(text, 140)
    expect(excerpt).toContain('never modify src/alice.config.ts and keep the value 0.5.')
  })
  it('retains more than three small exchanges and cuts only between paired speakers', () => {
    const turns = Array.from({ length: 18 }, (_, index) => normalizeWorkingMemoryTurn({ turnId: `t-${Math.floor(index / 2)}:${index % 2 ? 'alice' : 'user'}`, role: index % 2 ? 'alice' : 'user', text: `普通聊天 ${index}`, createdAt: index, source: 'conversation-turn', visibility: 'user-visible', importance: 0.5 }))
    expect(findWorkingMemoryCut(turns)).toBe(0)
    const cut = findWorkingMemoryCut(turns, { maxRawTurns: 7 })
    expect(cut).toBe(12)
    expect(turns[cut]?.role).toBe('user')
    expect(turns[cut - 1]?.role).toBe('alice')
  })

  it('preserves late negation, promises and emotional content instead of the first 120 characters', () => {
    const text = `${'这是普通前言。'.repeat(80)}不要再叫我老板，我希望你叫我小青。那天我很难过，你答应陪我。`
    const excerpt = selectWorkingMemorySentences(text, 180)
    expect(excerpt).toContain('不要再叫我老板')
    expect(excerpt).toContain('那天我很难过，你答应陪我。')
    const snapshot = createEmptyWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'home', now: 1 })
    snapshot.recentRawTurns = Array.from({ length: 8 }, (_, index) => normalizeWorkingMemoryTurn({ turnId: `t-${index}`, role: index % 2 ? 'alice' : 'user', text: index === 0 ? text : `后续聊天 ${index}`, createdAt: index, source: 'conversation-turn', visibility: 'user-visible', importance: 0.5 }))
    const compressed = compressWorkingMemorySnapshot(snapshot, { now: 10, maxRawTurns: 4 })
    expect(compressed.compressedTimeline[0]?.evidence?.find(item => item.turnId === 't-0')).toMatchObject({ role: 'user', quote: expect.stringContaining('不要再叫我老板') })
    expect(compressed.compressedTimeline[0]?.summary).toContain('你答应陪我')
  })

  it('keeps important older relationship context beside recent small talk', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'home', now: 1 })
    snapshot.compressedTimeline = Array.from({ length: 12 }, (_, index) => ({ id: `e-${index}`, summary: index === 0 ? '共同经历：难过时约定陪伴' : `闲聊 ${index}`, sourceTurnIds: [`t-${index}`], thread: null, unresolvedQuestions: [], commitments: index === 0 ? ['答应陪伴'] : [], corrections: [], relationshipPosture: null, emotionalPosture: null, executionCarry: null, importance: index === 0 ? 0.95 : 0.4, createdAt: index }))
    const selected = selectWorkingMemoryTimeline(snapshot)
    expect(selected.map(item => item.id)).toContain('e-0')
    expect(selected.map(item => item.id)).toEqual(expect.arrayContaining(['e-9', 'e-10', 'e-11']))
  })

  it('bounds hundreds of completed exchanges across restart without losing active corrections or obligations', () => {
    let snapshot = createEmptyWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'home', now: 1 })
    snapshot.userCorrections = [{ text: '叫我小青，不要叫老板。', sourceTurnId: 'old:user', scope: 'persona' }]
    snapshot.commitments = [{ text: '周末一起回顾那次旅行', sourceTurnId: 'old:alice' }]
    for (let index = 0; index < 240; index++) {
      snapshot = buildWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'home', now: index * 100 + 2, currentTurnId: `t-${index}`, currentUserText: `今天的小事 ${index}。`, currentAssistantText: `我在听，你接着说 ${index}。`, previousSnapshot: snapshot })
      if (index % 17 === 0)
        snapshot = parseWorkingMemoryCheckpoint(serializeWorkingMemoryCheckpoint(snapshot))!
    }
    expect(snapshot.recentRawTurns.length).toBeLessThanOrEqual(workingMemoryRetention.maxRawMessages)
    expect(snapshot.compressedTimeline.length).toBeLessThanOrEqual(workingMemoryRetention.maxTimelineItems)
    expect(snapshot.userCorrections[0]?.text).toContain('小青')
    expect(snapshot.commitments[0]?.text).toContain('旅行')
    expect(snapshot.recentRawTurns.at(-1)?.turnId).toBe('t-239:alice')
    expect(Buffer.byteLength(serializeWorkingMemoryCheckpoint(snapshot))).toBeLessThan(180_000)
  })
})
