import { describe, expect, it } from 'vitest'

import {
  buildHostPersonModelSnapshot,
  formatMemoryProvenanceLabel,
  mapFragmentSourceKindToProvenance,
  mapMemorySourceToProvenance,
} from './humanlike-memory'

describe('humanlike memory helpers', () => {
  it('maps semantic and fragment sources into reply-visible provenance labels', () => {
    expect(mapMemorySourceToProvenance('rule')).toBe('remembered')
    expect(mapMemorySourceToProvenance('async-llm')).toBe('inferred')
    expect(mapFragmentSourceKindToProvenance('dream-fragment')).toBe('dreamt')
    expect(mapFragmentSourceKindToProvenance('former-core-incarnation')).toBe('reconstructed')
    expect(formatMemoryProvenanceLabel('observed')).toBe('observed')
  })

  it('builds a host person model from autobiographical episodes instead of raw attitude only', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 20_000,
      facts: [],
      relationshipDynamics: null,
      events: [
        {
          id: 'event-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'dialogue-feedback',
          provenance: 'observed',
          occurredAt: 10_000,
          whereSummary: 'focused coding window',
          withWhom: ['host'],
          threadAnchor: 'runtime repair',
          whatHappened: 'The host said the reply felt intrusive during focused work.',
          felt: 'I had stepped too close.',
          emotionTags: ['boundary', 'repair'],
          whatChanged: 'boundary strained 0.10, burden up 0.08',
          relationshipMeaning: 'Focused windows need more room before closeness.',
          lesson: 'If the host is focused, back off and re-enter with a lighter touch.',
          sourceSummary: 'host dialogue feedback',
          confidence: 0.88,
          salience: 0.9,
          sceneAttachment: 0.7,
          consolidationPriority: 0.8,
          relationshipShift: {
            closenessDelta: -0.03,
            trustDelta: -0.04,
            burdenDelta: 0.08,
            boundaryDelta: -0.1,
            misreadDelta: 0.04,
            repairDelta: 0.02,
            openLoopDelta: 0,
          },
          derivedFrom: [],
          tags: ['dialogue-feedback', 'focused-window'],
          createdAt: 10_000,
          updatedAt: 10_000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'event-2',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-2',
          sessionId: 'session-1',
          sourceKind: 'execution-result',
          provenance: 'observed',
          occurredAt: 12_000,
          whereSummary: 'execution callback via codex',
          withWhom: ['host'],
          threadAnchor: 'runtime patch',
          whatHappened: 'A bounded codex result landed as useful after explicit consent.',
          felt: 'The result was genuinely useful.',
          emotionTags: ['execution', 'validated'],
          whatChanged: 'trust up 0.09, closeness up 0.03',
          relationshipMeaning: 'Bounded execution can be direct when consent is explicit.',
          lesson: 'Execution callbacks land best when proposal, action, and result stay bounded.',
          sourceSummary: 'execution result feedback',
          confidence: 0.84,
          salience: 0.82,
          sceneAttachment: 0.42,
          consolidationPriority: 0.64,
          relationshipShift: {
            closenessDelta: 0.03,
            trustDelta: 0.09,
            burdenDelta: 0,
            boundaryDelta: 0.02,
            misreadDelta: -0.03,
            repairDelta: 0.03,
            openLoopDelta: 0.05,
          },
          derivedFrom: [],
          tags: ['execution-result', 'consent'],
          createdAt: 12_000,
          updatedAt: 12_000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ],
    })

    expect(snapshot.routines.some(item => item.includes('Focused work windows'))).toBe(true)
    expect(snapshot.sensitivities.some(item => item.includes('intrusive') || item.includes('pressure'))).toBe(true)
    expect(snapshot.repairTriggers.some(item => item.includes('repair') || item.includes('robotic'))).toBe(true)
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.trustLadder.stage === 'cautious-open' || snapshot.trustLadder.stage === 'warming' || snapshot.trustLadder.stage === 'trusted').toBe(true)
    expect(snapshot.summary.length).toBeGreaterThan(0)
  })
})
