import { describe, expect, it } from 'vitest'

import { buildMemoryRecollectionNarratives } from './memory-recollection-narratives'

describe('memory recollection narratives', () => {
  it('turns recollected windows into gist-first humanlike recall surfaces', () => {
    const narratives = buildMemoryRecollectionNarratives({
      intent: {
        mode: 'conversation-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['runtime continuity'],
        rationale: 'Need to remember what we talked about before.',
        confidence: 0.8,
      },
      recollectedWindows: [{
        id: '2026-04-17',
        label: 'runtime continuity',
        summary: 'we were aligning proactive closure and runtime continuity',
        startedAt: 1,
        endedAt: 2,
        confidence: 0.72,
        dominantProvenance: 'reconstructed',
        cues: ['runtime continuity', 'proactive closure'],
      }],
    })

    expect(narratives).toHaveLength(1)
    expect(narratives[0]?.opening).toContain('What I first remember us circling around is')
    expect(narratives[0]?.certainty).toBe('fragmentary')
    expect(narratives[0]?.supportCues).toContain('runtime continuity')
  })
})
