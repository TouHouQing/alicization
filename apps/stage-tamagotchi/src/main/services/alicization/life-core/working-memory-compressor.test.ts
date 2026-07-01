import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'
import { compressWorkingMemorySnapshot } from './working-memory-compressor'

describe('working memory compressor', () => {
  it('compresses older raw turns into episodelets while preserving correction and commitment slots', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 5000,
    })
    snapshot.recentRawTurns = Array.from({ length: 8 }, (_, index) => normalizeWorkingMemoryTurn({
      turnId: `turn-${index + 1}`,
      role: index % 2 === 0 ? 'user' : 'alice',
      text: index === 1 ? '我会保留你的纠正' : `普通对话 ${index + 1}`,
      createdAt: 1000 + index,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 0.4,
    }))
    snapshot.userCorrections = [{
      text: '不是这个，我不要固定模板',
      sourceTurnId: 'turn-3',
      scope: 'persona',
    }]
    snapshot.commitments = [{
      text: '保留用户纠正',
      sourceTurnId: 'turn-2',
    }]
    snapshot.unresolvedQuestions = [{
      text: '短期记忆怎么不断片',
      sourceTurnId: 'turn-1',
    }]

    const compressed = compressWorkingMemorySnapshot(snapshot, {
      maxRawTurns: 4,
      now: 6000,
    })

    expect(compressed.recentRawTurns.map(turn => turn.turnId)).toEqual(['turn-5', 'turn-6', 'turn-7', 'turn-8'])
    expect(compressed.compressedTimeline).toHaveLength(1)
    expect(compressed.compressedTimeline[0].sourceTurnIds).toEqual(['turn-1', 'turn-2', 'turn-3', 'turn-4'])
    expect(compressed.compressedTimeline[0].corrections).toContain('不是这个，我不要固定模板')
    expect(compressed.compressedTimeline[0].commitments).toContain('保留用户纠正')
    expect(compressed.compression.level).toBe('light')
  })
})
