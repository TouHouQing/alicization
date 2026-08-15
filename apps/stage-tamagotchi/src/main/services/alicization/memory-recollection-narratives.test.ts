import { describe, expect, it } from 'vitest'

import { buildMemoryRecollectionNarratives } from './memory-recollection-narratives'

describe('memory recollection narratives', () => {
  it('returns only structured recall evidence without wording fields', () => {
    const narratives = buildMemoryRecollectionNarratives({
      intent: {
        mode: 'conversation-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
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

    expect(narratives).toEqual([{
      mode: 'conversation-history',
      certainty: 'fragmentary',
      recallCenter: 'we were aligning proactive closure and runtime continuity',
      recallPressure: 'medium',
      evidenceCues: ['runtime continuity', 'proactive closure'],
      provenancePosture: 'reconstructed',
      confidence: 0.74,
    }])
  })
})
