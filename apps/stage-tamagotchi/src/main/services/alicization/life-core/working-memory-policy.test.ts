import type { WorkingMemoryTurn } from './working-memory'

import { describe, expect, it } from 'vitest'

import * as workingMemoryPolicy from './working-memory-policy'

const {
  createLongTermCandidatesFromWorkingTurns,
  rankWorkingMemoryRetention,
  shouldExcludeTurnFromLongTermCandidate,
} = workingMemoryPolicy

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
  it('only admits uncontaminated provider artifacts into memory and persona learning', () => {
    const resolver = (workingMemoryPolicy as Record<string, unknown>).resolveAlicizationLearningEligibility
    expect(resolver).toBeTypeOf('function')

    const resolveEligibility = resolver as (input: {
      origin: 'provider' | 'failure-surface' | 'authorization-surface'
      learningPolicy: {
        allowLongTermCondensation: boolean
        allowPersonaLearning: boolean
        allowTraining: boolean
      }
      contaminated: boolean
    }) => {
      allowLongTermCondensation: boolean
      allowPersonaLearning: boolean
      allowTraining: boolean
    }
    const providerPolicy = {
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    }

    expect(resolveEligibility({
      origin: 'provider',
      learningPolicy: providerPolicy,
      contaminated: false,
    })).toEqual({
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    })

    for (const origin of ['failure-surface', 'authorization-surface'] as const) {
      expect(resolveEligibility({
        origin,
        learningPolicy: providerPolicy,
        contaminated: false,
      })).toEqual({
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      })
    }

    expect(resolveEligibility({
      origin: 'provider',
      learningPolicy: providerPolicy,
      contaminated: true,
    })).toEqual({
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
  })

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

  it('uses typed failure metadata as the primary long-term exclusion boundary', () => {
    const failure = turn({
      turnId: 'provider-auth-1',
      role: 'alice',
      text: '错误：Provider 鉴权失败。',
      origin: 'failure-surface',
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface: {
        kind: 'provider-auth',
        origin: 'failure-surface',
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
    } as Partial<WorkingMemoryTurn> & Pick<WorkingMemoryTurn, 'turnId' | 'role' | 'text'>)

    expect(shouldExcludeTurnFromLongTermCandidate(failure)).toBe(true)
    expect(createLongTermCandidatesFromWorkingTurns([failure])).toEqual([])
  })

  it('does not promote ordinary requests as corrections and excludes fallback templates directly', () => {
    const ordinaryRequest = turn({
      turnId: 'turn-request',
      role: 'user',
      text: '我需要你帮我写测试',
    })
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'turn-correction',
        role: 'user',
        text: '我不是要固定回复，我需要她数字生命自身的人格回复',
      }),
      ordinaryRequest,
    ])

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      kind: 'correction',
      allowTraining: false,
      sourceTurnIds: ['turn-correction'],
    })
    expect(createLongTermCandidatesFromWorkingTurns([ordinaryRequest])).toEqual([])
    expect(shouldExcludeTurnFromLongTermCandidate(turn({
      turnId: 'turn-fallback',
      role: 'alice',
      text: '我在。同一条本地数字生命的线还在。',
    }))).toBe(true)
  })

  it('keeps the meaning of template-rejection corrections without storing quoted fixed templates', () => {
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'template-rejection',
        role: 'user',
        text: '不要再用 Before speaking, remember this is still one continuous her 这种 same-her 固定模板来回复我。',
      }),
    ])

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toEqual(expect.objectContaining({
      kind: 'correction',
      allowTraining: false,
      sourceTurnIds: ['template-rejection'],
    }))
    expect(candidates[0]?.summary).toContain('不要使用固定模板')
    expect(candidates[0]?.summary).not.toMatch(/Before speaking|same-her|one continuous her/u)
  })

  it('creates long-term candidates for clear preference episode procedure and relationship signals', () => {
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'preference',
        role: 'user',
        text: '我喜欢你先说结论，再给必要细节。',
      }),
      turn({
        turnId: 'episode',
        role: 'user',
        text: '上周我们一起玩过 Minecraft，下次继续联机探索。',
      }),
      turn({
        turnId: 'procedure',
        role: 'user',
        text: '以后长期记忆开发按红测、实现、验证这个流程推进。',
      }),
      turn({
        turnId: 'relationship',
        role: 'user',
        text: '如果出错或超时了就直接说明问题，不要固定安抚模板。',
      }),
      turn({
        turnId: 'vague',
        role: 'user',
        text: '这样也行。',
      }),
    ])

    expect(candidates.map(candidate => candidate.kind)).toEqual([
      'preference',
      'episode',
      'procedure',
      'relationship',
    ])
    expect(candidates.find(candidate => candidate.kind === 'preference')).toEqual(expect.objectContaining({
      sourceTurnIds: ['preference'],
      allowTraining: false,
    }))
    expect(candidates.some(candidate => candidate.sourceTurnIds.includes('vague'))).toBe(false)
  })

  it('demotes failed turns even if they start with high raw importance', () => {
    const failure = turn({
      turnId: 'failure-high',
      role: 'alice',
      text: '超时了。',
      failureKind: 'timeout',
      importance: 1,
    })
    const normal = turn({
      turnId: 'normal',
      role: 'user',
      text: '今天还可以',
      importance: 0.2,
    })

    const ranked = rankWorkingMemoryRetention([failure, normal])

    expect(ranked[0].turnId).toBe('normal')
    expect(ranked.find(item => item.turnId === 'failure-high')?.importance).toBeLessThan(
      ranked.find(item => item.turnId === 'normal')?.importance ?? 0,
    )
  })
})
