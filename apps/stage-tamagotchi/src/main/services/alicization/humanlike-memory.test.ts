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
    expect(mapMemorySourceToProvenance('rule-shadow')).toBe('shadow')
    expect(mapFragmentSourceKindToProvenance('dream-fragment')).toBe('dreamt')
    expect(mapFragmentSourceKindToProvenance('former-core-incarnation')).toBe('reconstructed')
    expect(formatMemoryProvenanceLabel('observed')).toBe('observed')
    expect(formatMemoryProvenanceLabel('shadow')).toBe('shadow')
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

  it('lets consolidations and relationship dynamics keep shaping the host model even when fresh episodes are sparse', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 40_000,
      facts: [],
      relationshipDynamics: {
        hostAttitude: 'Focused work is still sensitive, but trust holds if the return stays light and precise.',
        previousHostAttitude: 'Focused work is sensitive.',
        obedienceDelta: 0,
        livelinessDelta: 0.02,
        sensibilityDelta: 0.04,
        source: 'dialogue-feedback:received',
        createdAt: 38_000,
      },
      consolidations: [
        {
          id: 'relationship-era:focused',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-focused',
          periodStartedAt: 30_000,
          periodEndedAt: 38_000,
          summary: 'Focused work periods stay safer when closeness leaves room first and repair settles before the return.',
          lesson: 'If the host is focused and the seam is off, repair first, then re-enter with a lighter touch.',
          cues: ['focused-work', 'room-before-closeness', 'repair-first'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['evt-1'],
          updatedAt: 38_000,
          memoryTier: 'warm',
        },
      ],
      events: [],
    })

    expect(snapshot.summary).toContain('attitude=')
    expect(snapshot.repairTriggers.some(item => item.includes('repair first') || item.includes('repair'))).toBe(true)
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.narrative.some(item => item.includes('Focused work periods stay safer'))).toBe(true)
  })

  it('lets relationship outcomes and reinforcement events keep shaping host preferences and trust', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 52_000,
      facts: [],
      events: [],
      relationshipDynamics: null,
      relationshipOutcomes: [
        {
          id: 'outcome-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          actionSummary: 'execution callback landed during focused work',
          closenessDelta: -0.02,
          trustDelta: 0.08,
          burdenDelta: 0.06,
          boundaryDelta: -0.04,
          misreadDelta: 0,
          repairDelta: 0.03,
          openLoopDelta: 0.04,
          summary: 'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
          createdAt: 50_000,
        },
      ],
      reinforcementEvents: [
        {
          id: 'reinforce-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          dimension: 'autonomy-respect',
          delta: 0.08,
          valence: 'reinforce',
          summary: 'Respecting working space kept the callback acceptable.',
          createdAt: 51_000,
        },
      ],
    })

    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.recurrentBurdens.some(item => item.includes('Focused work') || item.includes('callback'))).toBe(true)
    expect(snapshot.narrative.some(item => item.includes('lighter interruption pressure'))).toBe(true)
    expect(snapshot.trustLadder.score).toBeGreaterThan(0.5)
  })

  it('lets explicit person-state update surfaces feed the host model even before older stores are re-read', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 60_000,
      facts: [],
      events: [],
      relationshipDynamics: null,
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 59_000,
        summary: 'Recent outcomes nudged trust upward. Preference shift: Lighter touch, more room, less interruption pressure.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: -0.02,
          burdenDelta: 0.05,
          boundaryDelta: -0.03,
          repairDelta: 0.03,
        },
        reinforcementBias: {
          'autonomy-respect': 0.08,
        },
        preferenceHints: ['Lighter touch, more room, less interruption pressure.'],
        sensitivityHints: ['Pressure and over-close timing become intrusive quickly.'],
        repairHints: ['When the seam is off, repair before continuing.'],
        burdenHints: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: ['The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.'],
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'execution',
          summary: 'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
          createdAt: 59_000,
        }],
      },
    })

    expect(snapshot.summary).toContain('update=')
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.sensitivities.some(item => item.includes('Pressure'))).toBe(true)
    expect(snapshot.repairTriggers.some(item => item.includes('repair'))).toBe(true)
  })
})
