import { describe, expect, it } from 'vitest'

import { buildAsyncFactMemoryFragments } from './fact-memory'

describe('buildAsyncFactMemoryFragments', () => {
  it('builds fact-ledger fragments from async extraction facts', () => {
    const fragments = buildAsyncFactMemoryFragments({
      facts: [
        {
          subject: 'user',
          predicate: 'plan',
          object: '明天继续完善 Alicization 心智链路',
          confidence: 0.82,
        },
        {
          subject: 'user',
          predicate: 'prefers',
          object: '先给可执行结论，再展开理由',
          confidence: 0.64,
        },
      ],
      trace: {
        origin: 'user-turn',
        trigger: 'batch',
      },
    })

    expect(fragments.length).toBe(2)
    expect(fragments[0]).toContain('fact_subject:user')
    expect(fragments[0]).toContain('fact_predicate:plan')
    expect(fragments[0]).toContain('fact_confidence:0.82')
    expect(fragments[0]).toContain('fact_origin:user-turn')
    expect(fragments[0]).toContain('fact_trigger:batch')
  })

  it('dedupes duplicate triples by keeping the highest confidence', () => {
    const fragments = buildAsyncFactMemoryFragments({
      facts: [
        {
          subject: 'user',
          predicate: 'plan',
          object: '周五做发布检查',
          confidence: 0.55,
        },
        {
          subject: ' USER ',
          predicate: ' PLAN ',
          object: '  周五做发布检查  ',
          confidence: 0.95,
        },
        {
          subject: 'user',
          predicate: 'likes',
          object: '结构化拆分',
          confidence: 0.8,
        },
      ],
      maxFacts: 4,
    })

    expect(fragments.length).toBe(2)
    expect(fragments[0]).toContain('fact_predicate:plan')
    expect(fragments[0]).toContain('fact_confidence:0.95')
    expect(fragments[1]).toContain('fact_predicate:likes')
  })

  it('returns empty when facts are invalid after normalization', () => {
    const fragments = buildAsyncFactMemoryFragments({
      facts: [
        {
          subject: '   ',
          predicate: 'plan',
          object: 'something',
          confidence: 0.5,
        },
        {
          subject: 'user',
          predicate: '',
          object: 'something',
          confidence: 0.5,
        },
      ],
    })

    expect(fragments).toEqual([])
  })
})
