import { describe, expect, it } from 'vitest'

import type { WorkingMemoryTurn } from './working-memory'

import {
  createLongTermCandidatesFromWorkingTurns,
  rankWorkingMemoryRetention,
  shouldExcludeTurnFromLongTermCandidate,
} from './working-memory-policy'

function turn(input: Partial<WorkingMemoryTurn> & Pick<WorkingMemoryTurn, 'turnId' | 'role' | 'text'>): WorkingMemoryTurn {
  return {
    createdAt: 1000,
    failureKind: null,
    importance: 0.3,
    source: 'conversation-turn',
    visibility: 'user-visible',
    ...input,
  }
}

describe('working memory policy', () => {
  it('keeps corrections and commitments above ordinary chat', () => {
    const ranked = rankWorkingMemoryRetention([
      turn({ turnId: 'chat', role: 'user', text: '今天还可以' }),
      turn({ turnId: 'correction', role: 'user', text: '不是这个，我不想要固定模板回复' }),
      turn({ turnId: 'commitment', role: 'alice', text: '我会先把 A 线清空，然后再开始 B 线' }),
    ])

    expect(ranked.map(item => item.turnId).slice(0, 2)).toEqual(['correction', 'commitment'])
  })

  it('excludes timeout and provider failures from long-term candidates', () => {
    const failure = turn({
      turnId: 'timeout-1',
      role: 'alice',
      text: '超时了。',
      failureKind: 'timeout',
    })

    expect(shouldExcludeTurnFromLongTermCandidate(failure)).toBe(true)
    expect(createLongTermCandidatesFromWorkingTurns([failure])).toEqual([])
  })

  it('creates correction candidates without allowing training from fallback-like turns', () => {
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'turn-correction',
        role: 'user',
        text: '我不是要固定回复，我需要她数字生命自身的人格回复',
      }),
      turn({
        turnId: 'turn-fallback',
        role: 'alice',
        text: '我在。同一条本地数字生命的线还在。',
      }),
    ])

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      kind: 'correction',
      allowTraining: false,
      sourceTurnIds: ['turn-correction'],
    })
  })
})
