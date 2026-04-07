import { describe, expect, it } from 'vitest'

import { rankSubconsciousRecallFragments } from './subconscious-recall-ranking'

describe('rankSubconsciousRecallFragments', () => {
  it('prioritizes dialogue and fact-ledger rows when lexical scores tie', () => {
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
      limit: 2,
    })

    expect(ranked.map(item => item.id)).toEqual(['dialogue', 'fact'])
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
          id: 'dialogue-weaker-lexical',
          text: 'ProjectAtlas conflict',
          sourceKind: 'dialogue-turn',
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
          id: 'dialogue-new',
          text: 'same fragment',
          sourceKind: 'dialogue-turn',
          createdAt: 50,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'dialogue-old',
          text: 'same fragment',
          sourceKind: 'dialogue-turn',
          createdAt: 10,
          lastRecalledAt: null,
          recallCount: 0,
        },
      ],
      terms: ['same'],
      limit: 2,
    })

    expect(ranked).toHaveLength(1)
    expect(ranked[0]?.id).toBe('dialogue-new')
  })

  it('applies source budget first, then falls back when budget-exhausted', () => {
    const ranked = rankSubconsciousRecallFragments({
      rows: [
        {
          id: 'dialogue-1',
          text: 'ProjectAtlas 5173 conflict',
          sourceKind: 'dialogue-turn',
          createdAt: 30,
          lastRecalledAt: null,
          recallCount: 0,
        },
        {
          id: 'dialogue-2',
          text: 'ProjectAtlas 5173 conflict second',
          sourceKind: 'dialogue-turn',
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
        { sourceKind: 'dialogue-turn', maxItems: 1 },
        { sourceKind: 'dream-fragment', maxItems: 0 },
      ],
    })

    // first pass keeps only one dialogue row; second pass allows deferred rows to fill the remaining slot.
    expect(ranked.map(item => item.id)).toEqual(['dialogue-1', 'dialogue-2'])
  })
})
