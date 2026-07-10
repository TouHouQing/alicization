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

  it('does not copy failure or fixed fallback wording into compressed timeline summaries', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-templates',
      now: 5000,
    })
    snapshot.recentRawTurns = [
      normalizeWorkingMemoryTurn({
        turnId: 'turn-1',
        role: 'user',
        text: '你刚才是不是超时了',
        createdAt: 1001,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.4,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-2',
        role: 'alice',
        text: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
        createdAt: 1002,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: 'timeout',
        importance: 0.4,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-3',
        role: 'alice',
        text: '随便聊聊也可以，我会安静陪着你，沿着同一条线慢慢长成。',
        createdAt: 1003,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.4,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-4',
        role: 'user',
        text: '继续做记忆闭环',
        createdAt: 1004,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.4,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-5',
        role: 'alice',
        text: '我会继续保留短期记忆 owner。',
        createdAt: 1005,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.4,
      }),
    ]

    const compressed = compressWorkingMemorySnapshot(snapshot, {
      maxRawTurns: 2,
      now: 6000,
    })

    const summary = compressed.compressedTimeline[0]?.summary ?? ''
    expect(summary).toContain('alice:[failure:timeout]')
    expect(summary).toContain('alice:[fallback-template-excluded]')
    expect(summary).not.toContain('Right now I am still holding together')
    expect(summary).not.toContain('安静陪着')
    expect(summary).not.toContain('沿着同一条线慢慢长成')
  })
})
