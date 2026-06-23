import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationPersonStateUpdateRecord,
  buildAlicizationPersonStateUpdateSurface,
  personStateUpdateRecordFromMindTurnEvent,
} from './person-state-update-surface'

describe('person-state-update-surface', () => {
  it('aggregates outcome closure into a replayable person-state update surface', () => {
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 10_000,
      closure: {
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
            createdAt: 9_500,
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
            createdAt: 9_600,
          },
        ],
        memoryFacts: [],
        reflections: [],
        episodicEvents: [],
      },
    })

    expect(surface.version).toBe('person-state-update-surface-v1')
    expect(surface.dominantContexts).toContain('focused-work')
    expect(surface.preferenceHints[0]).toContain('Lighter touch')
    expect(surface.burdenHints.length).toBeGreaterThan(0)
    expect(surface.reinforcementBias['autonomy-respect']).toBeGreaterThan(0)
  })

  it('merges newer closure updates into the previous surface without dropping the trail', () => {
    const previous = buildAlicizationPersonStateUpdateSurface({
      now: 10_000,
      closure: {
        relationshipOutcomes: [{
          id: 'outcome-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'reply',
          actionSummary: 'reply repair landed',
          closenessDelta: 0.02,
          trustDelta: 0.06,
          burdenDelta: 0,
          boundaryDelta: 0,
          misreadDelta: -0.03,
          repairDelta: 0.05,
          openLoopDelta: 0,
          summary: 'Repair-first dialogue made the thread feel safer again.',
          createdAt: 9_000,
        }],
        reinforcementEvents: [],
        memoryFacts: [],
        reflections: [],
        episodicEvents: [],
      },
    })

    const merged = buildAlicizationPersonStateUpdateSurface({
      now: 20_000,
      previous,
      closure: {
        relationshipOutcomes: [{
          id: 'outcome-2',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-2',
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
          createdAt: 19_500,
        }],
        reinforcementEvents: [{
          id: 'reinforce-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-2',
          sessionId: 'session-1',
          sourceKind: 'execution',
          dimension: 'autonomy-respect',
          delta: 0.08,
          valence: 'reinforce',
          summary: 'Respecting working space kept the callback acceptable.',
          createdAt: 19_600,
        }],
        memoryFacts: [],
        reflections: [],
        episodicEvents: [],
      },
    })

    expect(merged.updatedAt).toBe(20_000)
    expect(merged.sourceTrail).toHaveLength(3)
    expect(merged.relationshipShift.trustDelta).toBeGreaterThan(previous.relationshipShift.trustDelta)
  })

  it('builds a replayable person-state update record from the closure and normalizes it back from a mind event', () => {
    const closure: AlicizationOutcomeClosureResult = {
      relationshipOutcomes: [
        {
          id: 'outcome-1',
          cardId: 'card-1',
          decisionTraceId: 'mind:abc123:feedfacecafe',
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'proactive',
          actionSummary: 'late-night proactive care landed softly',
          closenessDelta: 0.08,
          trustDelta: 0.06,
          burdenDelta: -0.02,
          boundaryDelta: 0,
          misreadDelta: 0,
          repairDelta: 0.04,
          openLoopDelta: 0,
          summary: 'Late-night care landed softly without feeling pushy.',
          createdAt: 29_500,
        },
      ],
      reinforcementEvents: [
        {
          id: 'reinforce-1',
          cardId: 'card-1',
          decisionTraceId: 'mind:abc123:feedfacecafe',
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'proactive',
          dimension: 'companionship',
          delta: 0.06,
          valence: 'reinforce',
          summary: 'Soft companionship was received well in the late-night window.',
          createdAt: 29_600,
        },
      ],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [],
    }

    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 30_000,
      closure: structuredClone(closure),
    })
    const record = buildAlicizationPersonStateUpdateRecord({
      closure: structuredClone(closure),
      surface,
      createdAt: 29_900,
    })

    expect(record.origin).toBe('subconscious-proactive')
    expect(record.sourceKinds).toEqual(['proactive'])
    expect(record.sourceCounts.relationshipOutcomes).toBe(1)

    const normalized = personStateUpdateRecordFromMindTurnEvent({
      id: 'evt-1',
      decisionTraceId: 'mind:abc123:feedfacecafe',
      turnId: 'turn-1',
      sessionId: 'session-1',
      origin: 'subconscious-proactive',
      kind: 'person-state-updated',
      payload: {
        version: record.version,
        updatedAt: record.updatedAt,
        summary: record.summary,
        dominantContexts: record.dominantContexts,
        relationshipShift: record.relationshipShift,
        reinforcementBias: record.reinforcementBias,
        preferenceHints: record.preferenceHints,
        sensitivityHints: record.sensitivityHints,
        repairHints: record.repairHints,
        burdenHints: record.burdenHints,
        narrative: record.narrative,
        sourceTrail: record.sourceTrail,
        sourceKinds: record.sourceKinds,
        sourceCounts: record.sourceCounts,
      },
      createdAt: record.createdAt,
    })

    expect(normalized).toEqual(expect.objectContaining({
      decisionTraceId: 'mind:abc123:feedfacecafe',
      origin: 'subconscious-proactive',
      summary: record.summary,
      dominantContexts: expect.arrayContaining(record.dominantContexts),
      sourceKinds: ['proactive'],
    }))
  })
})
