import { describe, expect, it } from 'vitest'

import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'

describe('memory procedural abstraction', () => {
  it('extracts reusable approach memory from execution episodes', () => {
    const abstractions = buildProceduralMemoryAbstractions({
      intent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime continuity', 'patch'],
        rationale: 'Reuse prior task approach.',
        confidence: 0.84,
      },
      episodes: [{
        id: 'event-1',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'execution-result',
        provenance: 'observed',
        occurredAt: 1,
        whereSummary: 'runtime patch callback',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity repair',
        whatHappened: 'I used codex to patch the continuity chain and then verified callback delivery.',
        felt: 'focused',
        emotionTags: ['execution'],
        whatChanged: 'verification came before confident payoff',
        relationshipMeaning: 'verify before claiming the fix is done',
        lesson: 'Patch first, then verify, then only surface the result.',
        sourceSummary: 'execution result',
        confidence: 0.86,
        salience: 0.82,
        sceneAttachment: 0.34,
        consolidationPriority: 0.66,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['codex', 'patch', 'verify'],
        createdAt: 1,
        updatedAt: 1,
        lastRecalledAt: null,
        recallCount: 1,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      }],
    })

    expect(abstractions).toHaveLength(1)
    expect(abstractions[0]?.label).toContain('runtime continuity repair')
    expect(abstractions[0]?.approach).toContain('Patch first')
    expect(abstractions[0]?.pitfalls.join(' ')).toContain('verify')
  })
})
