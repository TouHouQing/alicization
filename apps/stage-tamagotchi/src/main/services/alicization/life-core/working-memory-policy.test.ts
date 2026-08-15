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
      turn({ turnId: 'correction', role: 'user', text: '不是这个，实际日期是周五。' }),
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

  it('does not derive long-term candidates from raw user transcript wording', () => {
    const ordinaryRequest = turn({
      turnId: 'turn-request',
      role: 'user',
      text: '我需要你帮我写测试',
    })
    const rawTurns = [
      turn({
        turnId: 'turn-correction',
        role: 'user',
        text: '我不是要固定回复，我需要她数字生命自身的人格回复',
      }),
      ordinaryRequest,
      turn({
        turnId: 'turn-preference',
        role: 'user',
        text: '我喜欢你先说结论，再给必要细节。',
      }),
      turn({
        turnId: 'turn-episode',
        role: 'user',
        text: '上周我们一起玩过 Minecraft，下次继续联机探索。',
      }),
      turn({
        turnId: 'turn-procedure',
        role: 'user',
        text: '以后长期记忆开发按红测、实现、验证这个流程推进。',
      }),
      turn({
        turnId: 'turn-relationship',
        role: 'user',
        text: '如果出错或超时了就直接说明问题，不要固定安抚模板。',
      }),
    ]

    expect(createLongTermCandidatesFromWorkingTurns(rawTurns)).toEqual([])
    for (const rawTurn of rawTurns)
      expect(shouldExcludeTurnFromLongTermCandidate(rawTurn)).toBe(true)
  })

  it('creates a long-term candidate only from explicit structured memory evidence', () => {
    const rawTranscript = 'RAW_USER_TRANSCRIPT must remain short-term only'
    const structuredSummary = 'The user prefers conclusions before supporting detail.'
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'structured-preference',
        role: 'user',
        text: rawTranscript,
        memoryEvidence: {
          version: 'working-memory-long-term-evidence-v1',
          source: 'explicit-structured-memory-evidence',
          kind: 'preference',
          summary: structuredSummary,
          reason: 'Reviewed preference evidence.',
          evidenceSnippets: ['Preference confirmed through an explicit memory review action.'],
          salience: 0.8,
          sensitivity: 'personal',
          confidence: 0.86,
        },
      } as any),
    ])

    expect(candidates).toEqual([
      expect.objectContaining({
        kind: 'preference',
        summary: structuredSummary,
        reason: 'Reviewed preference evidence.',
        evidenceSnippets: ['Preference confirmed through an explicit memory review action.'],
        memoryEvidence: expect.objectContaining({
          version: 'working-memory-long-term-evidence-v1',
          source: 'explicit-structured-memory-evidence',
        }),
        sourceTurnIds: ['structured-preference'],
        allowTraining: false,
      }),
    ])
    expect(JSON.stringify(candidates)).not.toContain(rawTranscript)
  })

  it('rejects failure or review-like raw turns even when typed learning flags allow condensation', () => {
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'raw-review-like',
        role: 'user',
        text: 'Review this provider failure and remember the timeout transcript.',
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
      }),
    ])

    expect(candidates).toEqual([])
  })

  it('keeps explicit structured memory evidence training-blocked', () => {
    const candidates = createLongTermCandidatesFromWorkingTurns([
      turn({
        turnId: 'structured-correction',
        role: 'user',
        text: '短期上下文仍保留这句原文。',
        memoryEvidence: {
          version: 'working-memory-long-term-evidence-v1',
          source: 'explicit-structured-memory-evidence',
          kind: 'correction',
          summary: 'A reviewed correction changed the remembered date to Friday.',
          reason: 'Reviewed correction evidence.',
          evidenceSnippets: ['The corrected date is Friday.'],
          salience: 0.82,
          sensitivity: 'personal',
          confidence: 0.9,
        },
      } as any),
    ])

    expect(candidates[0]).toEqual(expect.objectContaining({
      kind: 'correction',
      allowTraining: false,
      sourceTurnIds: ['structured-correction'],
    }))
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
