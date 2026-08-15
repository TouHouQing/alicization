import { describe, expect, it } from 'vitest'

import { rankSubconsciousRecallFragments } from './subconscious-recall-ranking'

describe('rankSubconsciousRecallFragments', () => {
  it('excludes legacy dialogue-turn rows from durable subconscious recall', () => {
    const ranked = rankSubconsciousRecallFragments({
      rows: [
        {
          id: 'dream',
          text: 'ProjectAtlas 5173 conflict',
          sourceKind: 'dream-fragment',
          createdAt: 30,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'fact',
          text: 'ProjectAtlas 5173 conflict',
          sourceKind: 'fact-ledger',
          createdAt: 20,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'dialogue',
          text: 'ProjectAtlas 5173 conflict',
          sourceKind: 'dialogue-turn',
          createdAt: 10,
          lastRecalledAt: null,
          recallCount: 0,
        },
      ],
      terms: ['ProjectAtlas', '5173'],
      limit: 3,
    })

    expect(ranked.map(item => item.id)).toEqual(['fact', 'dream'])
  })

  it('keeps lexical match score as first-order rank signal', () => {
    const ranked = rankSubconsciousRecallFragments({
      rows: [
        {
          id: 'dream-strong-lexical',
          text: 'ProjectAtlas 5173 conflict hotfix',
          sourceKind: 'dream-fragment',
          createdAt: 30,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'fact-weaker-lexical',
          text: 'ProjectAtlas conflict',
          sourceKind: 'fact-ledger',
          createdAt: 40,
          lastRecalledAt: null,
          recallCount: 0,
        },
      ],
      terms: ['ProjectAtlas', '5173', 'hotfix'],
      limit: 2,
    })

    expect(ranked[0]?.id).toBe('dream-strong-lexical')
  })

  it('dedupes same source/text pairs after ranking', () => {
    const ranked = rankSubconsciousRecallFragments({
      rows: [
        {
          id: 'fact-new',
          text: 'same fragment',
          sourceKind: 'fact-ledger',
          createdAt: 50,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'fact-old',
          text: 'same fragment',
          sourceKind: 'fact-ledger',
          createdAt: 10,
          lastRecalledAt: null,
          recallCount: 0,
        },
      ],
      terms: ['same'],
      limit: 2,
    })

    expect(ranked).toHaveLength(1)
    expect(ranked[0]?.id).toBe('fact-new')
  })

  it('applies source budget first, then falls back when budget-exhausted', () => {
    const ranked = rankSubconsciousRecallFragments({
      rows: [
        {
          id: 'fact-1',
          text: 'ProjectAtlas 5173 conflict',
          sourceKind: 'fact-ledger',
          createdAt: 30,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'fact-2',
          text: 'ProjectAtlas 5173 conflict second',
          sourceKind: 'fact-ledger',
          createdAt: 20,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'dream-1',
          text: 'ProjectAtlas 5173 conflict dream',
          sourceKind: 'dream-fragment',
          createdAt: 10,
          lastRecalledAt: null,
          recallCount: 0,
        },
      ],
      terms: ['ProjectAtlas', '5173', 'conflict'],
      limit: 2,
      sourceBudget: [
        { sourceKind: 'fact-ledger', maxItems: 1 },
        { sourceKind: 'dream-fragment', maxItems: 0 },
      ],
    })

    // The initial ranking pass keeps one fact row; a subsequent pass lets deferred rows fill the remaining slot.
    expect(ranked.map(item => item.id)).toEqual(['fact-1', 'fact-2'])
  })
})
