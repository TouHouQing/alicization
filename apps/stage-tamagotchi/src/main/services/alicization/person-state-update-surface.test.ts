import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'

import { describe, expect, it } from 'vitest'

import { buildProactiveFeedbackOutcomeClosure } from './outcome-reinforcement'
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
    expect(surface.projectStateContinuity).toBeNull()
    expect(surface.dominantContexts).toContain('focused-work')
    expect(surface.preferenceHints).toContain(
      'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
    )
    expect(surface.burdenHints).toContain(
      'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
    )
    expect(surface.summary).toContain('The callback was useful')
    expect(surface.summary).not.toMatch(/Preference shift:|Repair line:|Burden line:/u)
    expect(surface.reinforcementBias['autonomy-respect']).toBeGreaterThan(0)
  })

  it('keeps richer emotional closure evidence in the narrative without rebuilding project-state governance', () => {
    const richerEmotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the continuity state.'
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 12_000,
      closure: {
        relationshipOutcomes: [
          {
            id: 'outcome-emotional-1',
            cardId: 'card-1',
            decisionTraceId: null,
            turnId: 'turn-emotional-1',
            sessionId: 'session-1',
            sourceKind: 'proactive',
            actionSummary: richerEmotionalClosureCue,
            closenessDelta: 0.04,
            trustDelta: 0.06,
            burdenDelta: -0.02,
            boundaryDelta: 0.01,
            misreadDelta: 0,
            repairDelta: 0.08,
            openLoopDelta: 0.02,
            summary: 'Late-night care landed best when the return stayed low-pressure, rest-protective, and repair-before-closeness on the continuity state.',
            createdAt: 11_700,
          },
        ],
        reinforcementEvents: [
          {
            id: 'reinforce-emotional-1',
            cardId: 'card-1',
            decisionTraceId: null,
            turnId: 'turn-emotional-1',
            sessionId: 'session-1',
            sourceKind: 'proactive',
            dimension: 'companionship',
            delta: 0.06,
            valence: 'reinforce',
            summary: 'Rest-protective companionship kept the continuity state believable.',
            createdAt: 11_750,
          },
        ],
        memoryFacts: [],
        reflections: [],
        episodicEvents: [{
          cardId: 'card-1',
          sourceKind: 'proactive',
          provenance: 'remembered',
          occurredAt: 11_800,
          withWhom: ['host'],
          whatHappened: 'The late-night reopening stayed quieter and more body-aware.',
          relationshipMeaning: richerEmotionalClosureCue,
          confidence: 0.78,
        }],
      },
    })

    expect(surface.projectStateContinuity).toBeNull()
    expect(surface.narrative).toContain(richerEmotionalClosureCue)
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

  it('does not synthesize proactive strategy prose from outcome labels alone', () => {
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 25_000,
      closure: buildProactiveFeedbackOutcomeClosure({
        now: 24_900,
        cardId: 'card-1',
        outcomes: [{
          turnId: 'turn-proactive-strategy-surface-1',
          scenario: 'general',
          outcome: 'dismiss',
          createdAt: 24_900,
        }],
      }),
    })

    expect(surface.preferenceHints).toEqual([])
    expect(surface.repairHints).toEqual([])
    expect(surface.narrative.join(' ')).not.toMatch(/more room|lower-pressure|clearer opening/iu)
  })

  it('keeps corrected same-person continuity authoritative in person-state surface instead of carrying the older generic status-shell narrative forward', () => {
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 26_000,
      closure: {
        relationshipOutcomes: [],
        reinforcementEvents: [],
        memoryFacts: [],
        reflections: [],
        episodicEvents: [
          {
            cardId: 'card-1',
            sourceKind: 'dialogue-feedback',
            provenance: 'observed',
            occurredAt: 25_100,
            whereSummary: 'same continuity seam during execution callback',
            withWhom: ['host'],
            threadAnchor: 'same-person continuity closure',
            whatHappened: 'I treated the host turn like a concise status recap request and answered as a generic status shell.',
            felt: 'I rushed into a task-shell framing.',
            emotionTags: ['generic-status', 'misread'],
            whatChanged: 'trust down 0.08, burden up 0.05',
            relationshipMeaning: 'This looked like a concise progress recap request.',
            lesson: 'Answer this line with a concise status recap first.',
            sourceSummary: 'older generic status recap interpretation',
            confidence: 0.84,
            tags: ['status-recap', 'generic-shell'],
          },
          {
            cardId: 'card-1',
            sourceKind: 'dialogue-feedback',
            provenance: 'reconstructed',
            occurredAt: 25_500,
            whereSummary: 'same continuity seam during execution callback',
            withWhom: ['host'],
            threadAnchor: 'same-person continuity closure',
            whatHappened: 'The host was checking same-person continuity, not asking for a status report.',
            felt: 'I needed to return as the continuity state before giving any recap.',
            emotionTags: ['same-person continuity', 'repair', 'continuity-check'],
            whatChanged: 'trust up 0.05, repair activated 0.08, leave more room, lower-pressure return',
            relationshipMeaning: 'This corrected same-person continuity should stay authoritative before any status recap.',
            lesson: 'Repair continuity first and keep the line lower-pressure instead of defending the first interpretation.',
            sourceSummary: 'corrected same-person continuity interpretation',
            confidence: 0.89,
            tags: ['same-person-test', 'corrected-continuity'],
            reconsolidationCount: 2,
            latestReconsolidation: {
              at: 25_800,
              decisionTraceId: null,
              provenance: 'reconstructed',
              confidence: 0.86,
              reason: 'Revised older memory traces: corrected same-person continuity, not a status report, should stay authoritative before any status recap.',
              emotionTags: ['same-person continuity', 'repair'],
              relationshipMeaning: 'This corrected same-person continuity should stay authoritative before any status recap.',
              lesson: 'Repair continuity first and keep the line lower-pressure instead of defending the first interpretation.',
            },
          } as any,
        ],
      },
    })

    expect(surface.summary.toLowerCase()).toContain('same-person continuity')
    expect(surface.summary.toLowerCase()).not.toContain('concise progress recap request')
    expect(surface.narrative).toContain('This corrected same-person continuity should stay authoritative before any status recap.')
    expect(surface.narrative).not.toContain('This looked like a concise progress recap request.')
    expect(surface.narrative).not.toContain('Answer this line with a concise status recap first.')
  })

  it('persists proactive affective residue into the person-state surface and replay record instead of leaving cadence carry in the current turn only', () => {
    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 26_900,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-residue-surface-1',
        scenario: 'general',
        outcome: 'dismiss',
        createdAt: 26_900,
      }],
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 26_850,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.24,
        repairPressure: 0.11,
        burdenPressure: 0.04,
        trustPressure: 0.2,
        restProtectivePressure: 0.03,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.34,
          repairRecovery: 0.41,
          overreachRisk: 0.31,
          fatigueGuard: 0.18,
          afterglowCarry: 0.52,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['same-her', 'initiative-learning'],
          summary: 'Keep the same proactive line settling lower-pressure before warming wider.',
        },
        sourceSignals: ['proactive outcome learning'],
        summary: 'The proactive reopening should return measured and lower-pressure on the same line.',
      } as any,
    })

    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 27_000,
      closure,
    })

    expect(surface.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'afterglow',
      summary: expect.stringContaining('lower-pressure'),
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
      }),
    }))

    const record = buildAlicizationPersonStateUpdateRecord({
      closure,
      surface,
      createdAt: 27_050,
    })

    expect(record.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'afterglow',
      summary: expect.stringContaining('same line'),
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
      }),
    }))

    const normalized = personStateUpdateRecordFromMindTurnEvent({
      id: 'evt-proactive-residue-surface-1',
      decisionTraceId: 'mind:abc123:proactive-residue-surface',
      turnId: 'turn-proactive-residue-surface-1',
      sessionId: 'session-1',
      origin: 'subconscious-proactive',
      kind: 'person-state-updated',
      payload: {
        version: record.version,
        updatedAt: record.updatedAt,
        summary: record.summary,
        projectStateContinuity: record.projectStateContinuity,
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
        affectiveResidue: record.affectiveResidue,
      },
      createdAt: record.createdAt,
    })

    expect(normalized?.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'afterglow',
      summary: expect.stringContaining('measured'),
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
        shouldDelayWarmth: true,
      }),
    }))
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
    expect(record.projectStateContinuity).toBeNull()

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
        projectStateContinuity: {
          sameHerSelfLine: 'legacy same-her template',
          emotionalClosureCue: 'relationship_cadence=measured-return',
        },
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
      projectStateContinuity: null,
      dominantContexts: expect.arrayContaining(record.dominantContexts),
      sourceKinds: ['proactive'],
    }))
  })
})
