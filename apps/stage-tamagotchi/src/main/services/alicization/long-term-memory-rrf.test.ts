import { describe, expect, it } from 'vitest'

import { reciprocalRankFusion } from './long-term-memory-rrf'

describe('long-term memory reciprocal rank fusion', () => {
  it('merges independent channel ranks while preserving channel reasons', () => {
    const fused = reciprocalRankFusion({
      channels: [
        {
          channel: 'lexical',
          results: [
            { candidateId: 'lexical-only', rank: 1, reason: 'phrase-match' },
            { candidateId: 'multi-source', rank: 2, reason: 'weak-phrase-match' },
          ],
        },
        {
          channel: 'structured',
          results: [
            { candidateId: 'multi-source', rank: 1, reason: 'thread-fit' },
          ],
        },
        {
          channel: 'semantic',
          results: [
            { candidateId: 'multi-source', rank: 1, reason: 'embedding-match' },
          ],
        },
      ],
      k: 60,
    })

    expect(fused[0]?.candidateId).toBe('multi-source')
    expect(fused[0]?.channelReasons).toEqual(expect.arrayContaining([
      'lexical:weak-phrase-match',
      'structured:thread-fit',
      'semantic:embedding-match',
    ]))
    expect(fused[1]?.candidateId).toBe('lexical-only')
  })
})
