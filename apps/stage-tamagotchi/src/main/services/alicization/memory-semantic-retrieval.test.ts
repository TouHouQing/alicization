import { describe, expect, it } from 'vitest'

import {
  extractSemanticConcepts,
  scoreSemanticGraphWalk,
  scoreSemanticRecall,
} from './memory-semantic-retrieval'

describe('memory-semantic-retrieval', () => {
  it('recognizes semantic continuity between non-identical recall wording and remembered seam language', () => {
    expect(extractSemanticConcepts('继续把那条断掉的线接回去')).toEqual(expect.arrayContaining([
      'thread-continuity',
      'repair-fix',
    ]))

    const score = scoreSemanticRecall({
      queryTexts: ['继续把那条断掉的线接回去'],
      candidateTexts: ['Return to the same runtime seam before branching.'],
    })

    expect(score).toBeGreaterThan(0.18)
  })

  it('lets graph-adjacent memories inherit recall pressure from a semantically matching neighbor', () => {
    const graph = scoreSemanticGraphWalk({
      nodes: [
        {
          id: 'episode-seam',
          primaryText: 'We kept returning to the same runtime seam until it held.',
          semanticTexts: ['runtime seam', 'repair rhythm'],
          groupKeys: ['session-runtime', 'runtime seam'],
          neighborKeys: ['runtime seam', 'repair rhythm'],
        },
        {
          id: 'episode-handoff',
          primaryText: 'That later handoff only worked because we returned before branching.',
          semanticTexts: ['return before branching', 'handoff'],
          groupKeys: ['session-runtime', 'runtime seam'],
          neighborKeys: ['runtime seam', 'return before branching'],
        },
      ],
      queryTexts: ['继续把那条断掉的线接回去'],
      getId: node => node.id,
    })

    expect((graph.directScoreById.get('episode-seam') ?? 0)).toBeGreaterThan(0.18)
    expect((graph.graphBoostById.get('episode-handoff') ?? 0)).toBeGreaterThan(0.05)
  })
})
