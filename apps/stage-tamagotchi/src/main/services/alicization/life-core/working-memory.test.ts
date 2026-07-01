import { describe, expect, it } from 'vitest'

import {
  clampWorkingMemoryScore,
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryText,
  normalizeWorkingMemoryTurn,
  uniqueWorkingMemoryTexts,
} from './working-memory'

describe('working memory core types', () => {
  it('creates an empty v1 snapshot with stable owner fields', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 1234,
    })

    expect(snapshot).toMatchObject({
      version: 'working-memory-v1',
      cardId: 'default',
      sessionId: 'session-1',
      updatedAt: 1234,
      turnRange: {
        fromTurnId: null,
        toTurnId: null,
      },
      currentThread: null,
      activeTask: null,
      relationshipPosture: null,
      emotionalPosture: null,
      executionState: null,
    })
    expect(snapshot.recentRawTurns).toEqual([])
    expect(snapshot.compressedTimeline).toEqual([])
    expect(snapshot.unresolvedQuestions).toEqual([])
    expect(snapshot.commitments).toEqual([])
    expect(snapshot.userCorrections).toEqual([])
    expect(snapshot.longTermCandidates).toEqual([])
    expect(snapshot.compression.level).toBe('none')
    expect(snapshot.audit.failureTurnIds).toEqual([])
  })

  it('normalizes text and clamps turn importance', () => {
    expect(normalizeWorkingMemoryText('  我们\n\n继续   B 线  ', 20)).toBe('我们 继续 B 线')

    const turn = normalizeWorkingMemoryTurn({
      turnId: 'turn-1',
      role: 'user',
      text: '  不是这个，继续短期记忆方案  ',
      createdAt: 2000,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 5,
    })

    expect(turn).toMatchObject({
      turnId: 'turn-1',
      role: 'user',
      text: '不是这个，继续短期记忆方案',
      createdAt: 2000,
      source: 'conversation-turn',
      visibility: 'user-visible',
      failureKind: null,
      importance: 1,
    })
  })

  it('preserves in-range scores and respects empty unique text limits', () => {
    expect(normalizeWorkingMemoryText('abc def', 4)).toBe('abc')
    expect(clampWorkingMemoryScore(0.555)).toBe(0.555)
    expect(clampWorkingMemoryScore(-1)).toBe(0)
    expect(clampWorkingMemoryScore(2)).toBe(1)

    expect(uniqueWorkingMemoryTexts([' A ', 'A', 'B'], 0)).toEqual([])
    expect(uniqueWorkingMemoryTexts(['A', 'B'], Number.NaN)).toEqual([])
    expect(uniqueWorkingMemoryTexts([' A ', 'A', 'B'], 2)).toEqual(['A', 'B'])
  })
})
