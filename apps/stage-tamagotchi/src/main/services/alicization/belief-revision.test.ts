import { describe, expect, it } from 'vitest'

import { buildBeliefRevision } from './belief-revision'

describe('buildBeliefRevision', () => {
  it('stays stable when the scene is grounded and beliefs are held', () => {
    const revision = buildBeliefRevision({
      now: 10_000,
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['diff-visible'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 10_000,
      },
      beliefLedger: {
        focusBeliefId: 'belief-1',
        beliefs: [{
          id: 'belief-1',
          scope: 'scene',
          source: 'percept',
          status: 'held',
          statement: 'The active diff is clearly grounded.',
          confidence: 0.9,
          salience: 0.86,
          evidence: ['diff-visible'],
          entityIds: [],
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        unresolvedContradictions: [],
        updatedAt: 10_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.72,
        sharedAttentionTrust: 0.7,
        correctionSensitivity: 0.26,
        reciprocityExpectation: 0.54,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 10_000,
      },
      previous: null,
    })

    expect(revision.stability).toBe('stable')
    expect(revision.revisionPressure).toBeLessThan(0.48)
    expect(revision.narrative).toContain('world-model-settled')
  })

  it('becomes fractured when contradictions and uncertainty stack up', () => {
    const revision = buildBeliefRevision({
      now: 20_000,
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: ['browser anchor may be stale'],
          openQuestions: ['what is actually on screen now?'],
          staleRisks: ['old anchor'],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      beliefLedger: {
        focusBeliefId: 'belief-1',
        beliefs: [{
          id: 'belief-1',
          scope: 'scene',
          source: 'memory',
          status: 'contradicted',
          statement: 'The old browser page is still foregrounded.',
          confidence: 0.48,
          salience: 0.84,
          evidence: ['old anchor'],
          entityIds: [],
          contradictsBeliefIds: ['belief-2'],
          formedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }, {
          id: 'belief-2',
          scope: 'scene',
          source: 'percept',
          status: 'tentative',
          statement: 'The host may already be back in VSCode.',
          confidence: 0.54,
          salience: 0.76,
          evidence: ['foreground switched'],
          entityIds: [],
          formedAt: 18_000,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        unresolvedContradictions: ['browser-vs-code'],
        updatedAt: 20_000,
      },
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'give-space',
        receptivity: 0.38,
        sharedAttentionTrust: 0.42,
        correctionSensitivity: 0.72,
        reciprocityExpectation: 0.34,
        activeBoundaries: ['misread-cost-high'],
        narrative: [],
        updatedAt: 20_000,
      },
      previous: null,
    })

    expect(revision.stability).toBe('fractured')
    expect(revision.revisionPressure).toBeGreaterThan(0.7)
    expect(revision.contradictionPressure).toBeGreaterThan(0.5)
    expect(revision.narrative).toContain('beliefs-require-revision')
  })
})
