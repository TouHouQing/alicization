import { describe, expect, it } from 'vitest'

import { buildPersonaGradualUnlock } from './persona-gradual-unlock'

describe('buildPersonaGradualUnlock', () => {
  it('keeps persona candidates as machine-readable facets instead of fixed prose hypotheses', () => {
    const unlock = buildPersonaGradualUnlock({
      recentRelationshipOutcomes: [{
        id: 'outcome::shared-language',
        cardId: 'card::shared-language',
        decisionTraceId: 'trace::shared-language',
        turnId: 'turn::shared-language',
        sessionId: 'session::shared-language',
        sourceKind: 'reply',
        actionSummary: 'specific correction before continuing',
        closenessDelta: 0.08,
        trustDelta: 0.12,
        burdenDelta: -0.02,
        boundaryDelta: 0.04,
        misreadDelta: -0.08,
        repairDelta: 0.1,
        openLoopDelta: 0.06,
        summary: 'The host accepted a grounded correction.',
        createdAt: 1_000,
      }, {
        id: 'outcome::return',
        cardId: 'card::return',
        decisionTraceId: 'trace::return',
        turnId: 'turn::return',
        sessionId: 'session::return',
        sourceKind: 'reply',
        actionSummary: 'returned to the unresolved thread',
        closenessDelta: 0.07,
        trustDelta: 0.1,
        burdenDelta: -0.01,
        boundaryDelta: 0.03,
        misreadDelta: -0.04,
        repairDelta: 0.06,
        openLoopDelta: 0.11,
        summary: 'The host stayed receptive when the open thread was carried.',
        createdAt: 1_200,
      }],
      recentReinforcementEvents: [{
        id: 'reinforcement::companionship',
        cardId: 'card::shared-language',
        decisionTraceId: 'trace::shared-language',
        turnId: 'turn::shared-language',
        sessionId: 'session::shared-language',
        sourceKind: 'reply',
        dimension: 'companionship',
        delta: 0.16,
        valence: 'reinforce',
        summary: 'Grounded companionship landed well.',
        createdAt: 1_300,
      }, {
        id: 'reinforcement::truthful-grounding',
        cardId: 'card::truth',
        decisionTraceId: 'trace::truth',
        turnId: 'turn::truth',
        sessionId: 'session::truth',
        sourceKind: 'reply',
        dimension: 'truthful-grounding',
        delta: 0.14,
        valence: 'reinforce',
        summary: 'Fact-first repair improved trust.',
        createdAt: 1_400,
      }],
    })

    expect(unlock?.unlockableFacets[0]?.reason).toBe(`facet:${unlock?.unlockableFacets[0]?.facet}`)
    expect(unlock?.pendingHypotheses[0]?.hypothesis).toBe(`persona-candidate:${unlock?.pendingHypotheses[0]?.facet}`)
    expect(unlock?.pendingHypotheses[0]?.supportingSignals).toEqual(expect.arrayContaining([
      'signal:relationship-repeat',
    ]))
  })
})
