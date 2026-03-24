import { describe, expect, it } from 'vitest'

import { buildWorldOntology } from './world-ontology'

describe('buildWorldOntology', () => {
  it('prioritizes live grounded world over remembered residue', () => {
    const ontology = buildWorldOntology({
      now: 10_000,
      scene: {
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'error',
        summary: 'TypeScript error in runtime.ts',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::live',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts error',
          summary: 'The host is focused on a concrete TypeScript error in runtime.ts.',
          confidence: 0.88,
          significance: 0.9,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 10_000,
        },
        lingeringThreads: [{
          id: 'thread::memory',
          kind: 'browsing',
          status: 'lingering',
          source: 'continuity',
          title: 'Old browser tab',
          summary: 'A previously viewed tutorial page is still lingering in continuity.',
          confidence: 0.52,
          significance: 0.44,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 7_000,
        }],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: ['runtime.ts error'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 5_000,
          attentionAgeMs: 5_000,
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
        focusBeliefId: 'belief::memory',
        beliefs: [{
          id: 'belief::memory',
          scope: 'scene',
          source: 'memory',
          status: 'held',
          statement: 'A tutorial page about Java overloading was recently visible.',
          confidence: 0.58,
          salience: 0.42,
          evidence: ['continuity:recent'],
          entityIds: [],
          formedAt: 0,
          lastUpdatedAt: 8_000,
          expiresAt: 100_000,
        }],
        unresolvedContradictions: [],
        updatedAt: 10_000,
      },
      workingMemoryEpisodes: [],
    })

    expect(ontology.dominantFrame).toBe('live')
    expect(ontology.truthPriority[0]).toBe('live')
    expect(ontology.live?.summary).toContain('TypeScript error')
    expect(ontology.remembered?.summary).toContain('tutorial')
  })

  it('keeps imagined world explicit when the scene is unresolved', () => {
    const ontology = buildWorldOntology({
      now: 10_000,
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['The host may be checking whether the diff is safe to merge.'],
          staleRisks: ['scene-not-grounded'],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 40_000,
          attentionAgeMs: 40_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 10_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fractured',
        revisionPressure: 0.82,
        groundingNeed: 0.9,
        contradictionPressure: 0.72,
        hostCorrectionWeight: 0.2,
        narrative: [],
        updatedAt: 10_000,
      },
      hypothesisGraph: {
        activeHypothesisId: 'hypothesis::diff',
        focusHypothesisIds: ['hypothesis::diff'],
        driftPressure: 0.76,
        hypotheses: [{
          id: 'hypothesis::diff',
          kind: 'problem-locus',
          status: 'active',
          summary: 'The host may be evaluating whether the current diff introduces a regression.',
          confidence: 0.68,
          salience: 0.72,
          evidence: ['open-question'],
          counterEvidence: [],
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 100_000,
        }],
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(ontology.imagined).not.toBeNull()
    expect(ontology.imagined?.summary).toContain('diff')
    expect(ontology.truthPriority).toContain('imagined')
  })
})
