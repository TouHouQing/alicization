import { describe, expect, it } from 'vitest'

import { buildMemoryRecollectionNarratives } from './memory-recollection-narratives'

describe('memory recollection narratives', () => {
  it('turns recollected windows into structured recall pressure without fixed visible wording', () => {
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
    expect(narratives[0]?.recallCenter).toBe('we were aligning proactive closure and runtime continuity')
    expect(narratives[0]?.opening).toBe(narratives[0]?.recallCenter)
    expect(narratives[0]?.opening).not.toContain('What I first remember us circling around is')
    expect(narratives[0]?.speakerInstruction).toContain('not as a copied opening line')
    expect(narratives[0]?.certainty).toBe('fragmentary')
    expect(narratives[0]?.evidenceCues).toContain('runtime continuity')
    expect(narratives[0]?.supportCues).toEqual(narratives[0]?.evidenceCues)
    expect(narratives[0]?.provenancePosture).toBe('reconstructed')
  })
})
