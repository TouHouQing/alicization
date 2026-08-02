import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationPersonStateEvidenceRef,
  buildAlicizationPersonStateUpdateRecord,
  buildAlicizationPersonStateUpdateSurface,
  normalizeAlicizationPersonStateUpdateSurface,
  personStateUpdateRecordFromMindTurnEvent,
} from './person-state-update-surface'

function createClosure(
  overrides: Partial<AlicizationOutcomeClosureResult> = {},
): AlicizationOutcomeClosureResult {
  return {
    relationshipOutcomes: [],
    reinforcementEvents: [],
    memoryFacts: [],
    reflections: [],
    episodicEvents: [],
    ...overrides,
  }
}

describe('person-state-update-surface', () => {
  it('derives person state from structured outcome fields and evidence ids only', () => {
    const outcomeRef = buildAlicizationPersonStateEvidenceRef('relationship-outcome', 'outcome-1')
    const reinforcementRef = buildAlicizationPersonStateEvidenceRef('reinforcement', 'reinforce-1')
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 10_000,
      closure: createClosure({
        relationshipOutcomes: [{
          id: 'outcome-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          actionSummary: 'untrusted action interpretation',
          closenessDelta: -0.02,
          trustDelta: 0.08,
          burdenDelta: 0.06,
          boundaryDelta: -0.04,
          misreadDelta: 0,
          repairDelta: 0.03,
          openLoopDelta: 0.04,
          summary: 'untrusted relationship interpretation',
          createdAt: 9_500,
        }],
        reinforcementEvents: [{
          id: 'reinforce-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          dimension: 'autonomy-respect',
          delta: 0.08,
          valence: 'reinforce',
          summary: 'untrusted reinforcement prose',
          createdAt: 9_600,
        }],
      }),
    })

    expect(surface.summary).toBe(reinforcementRef)
    expect(surface.dominantContexts).toEqual(['general', 'execution'])
    expect(surface.relationshipShift).toEqual(expect.objectContaining({
      trustDelta: 0.08,
      burdenDelta: 0.06,
    }))
    expect(surface.reinforcementBias['autonomy-respect']).toBe(0.08)
    expect(surface.preferenceHints).toEqual([])
    expect(surface.sensitivityHints).toEqual([])
    expect(surface.repairHints).toEqual([])
    expect(surface.burdenHints).toEqual([])
    expect(surface.narrative).toEqual([])
    expect(surface.affectiveResidue).toBeNull()
    expect(surface.sourceTrail.map(entry => entry.summary)).toEqual([
      reinforcementRef,
      outcomeRef,
    ])
    expect(JSON.stringify(surface)).not.toContain('untrusted')
  })

  it('does not promote episodic interpretation or emotional cadence into person state', () => {
    const marker = 'interpretation-must-stay-outside-person-state'
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 12_000,
      closure: createClosure({
        episodicEvents: [{
          id: 'episode-1',
          cardId: 'card-1',
          sourceKind: 'dialogue-feedback',
          provenance: 'observed',
          occurredAt: 11_800,
          withWhom: ['host'],
          whatHappened: 'A factual event occurred.',
          felt: marker,
          whatChanged: marker,
          relationshipMeaning: marker,
          lesson: marker,
          sourceSummary: marker,
          confidence: 0.78,
        }],
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 11_900,
          residues: [],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.2,
          repairPressure: 0.1,
          burdenPressure: 0,
          trustPressure: 0.1,
          restProtectivePressure: 0,
          relationshipCadence: null,
          sourceSignals: [marker],
          summary: marker,
        } as any,
      }),
    })

    expect(surface.summary).toBe('')
    expect(surface.dominantContexts).toEqual(['general'])
    expect(surface.sourceTrail).toEqual([])
    expect(surface.preferenceHints).toEqual([])
    expect(surface.sensitivityHints).toEqual([])
    expect(surface.repairHints).toEqual([])
    expect(surface.burdenHints).toEqual([])
    expect(surface.narrative).toEqual([])
    expect(surface.affectiveResidue).toBeNull()
    expect(JSON.stringify(surface)).not.toContain(marker)
  })

  it('merges numeric state and traceable source ids without reviving old prose', () => {
    const outcomeRef = buildAlicizationPersonStateEvidenceRef('relationship-outcome', 'outcome-1')
    const reinforcementRef = buildAlicizationPersonStateEvidenceRef('reinforcement', 'reinforce-2')
    const previous = buildAlicizationPersonStateUpdateSurface({
      now: 10_000,
      closure: createClosure({
        relationshipOutcomes: [{
          id: 'outcome-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'reply',
          actionSummary: 'older prose',
          closenessDelta: 0.02,
          trustDelta: 0.06,
          burdenDelta: 0,
          boundaryDelta: 0,
          misreadDelta: 0,
          repairDelta: 0.05,
          openLoopDelta: 0,
          summary: 'older prose',
          createdAt: 9_000,
        }],
      }),
    })
    const merged = buildAlicizationPersonStateUpdateSurface({
      now: 20_000,
      previous,
      closure: createClosure({
        reinforcementEvents: [{
          id: 'reinforce-2',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-2',
          sessionId: 'session-1',
          sourceKind: 'execution',
          dimension: 'truthful-grounding',
          delta: 0.1,
          valence: 'reinforce',
          summary: 'newer prose',
          createdAt: 19_600,
        }],
      }),
    })

    expect(merged.summary).toBe(reinforcementRef)
    expect(merged.sourceTrail.map(entry => entry.summary)).toEqual([
      reinforcementRef,
      outcomeRef,
    ])
    expect(merged.relationshipShift.trustDelta).toBe(previous.relationshipShift.trustDelta)
    expect(merged.reinforcementBias['truthful-grounding']).toBe(0.1)
    expect(JSON.stringify(merged)).not.toMatch(/older prose|newer prose/u)
  })

  it('round-trips only structured person-state evidence from a mind event', () => {
    const outcomeRef = buildAlicizationPersonStateEvidenceRef('relationship-outcome', 'outcome-proactive-1')
    const closure = createClosure({
      relationshipOutcomes: [{
        id: 'outcome-proactive-1',
        cardId: 'card-1',
        decisionTraceId: 'mind:abc123:feedfacecafe',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'proactive',
        actionSummary: 'untrusted action prose',
        closenessDelta: 0.08,
        trustDelta: 0.06,
        burdenDelta: -0.02,
        boundaryDelta: 0,
        misreadDelta: 0,
        repairDelta: 0.04,
        openLoopDelta: 0,
        summary: 'untrusted outcome prose',
        createdAt: 29_500,
      }],
    })
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 30_000,
      closure,
    })
    const record = buildAlicizationPersonStateUpdateRecord({
      closure,
      surface,
      createdAt: 29_900,
    })
    const marker = 'persisted-prose-must-not-return'
    const normalized = personStateUpdateRecordFromMindTurnEvent({
      id: 'evt-1',
      decisionTraceId: 'mind:abc123:feedfacecafe',
      turnId: 'turn-1',
      sessionId: 'session-1',
      origin: 'subconscious-proactive',
      kind: 'person-state-updated',
      payload: {
        ...record,
        summary: record.summary,
        projectStateContinuity: { note: marker },
        preferenceHints: [marker],
        sensitivityHints: [marker],
        repairHints: [marker],
        burdenHints: [marker],
        narrative: [marker],
        affectiveResidue: { summary: marker },
      },
      createdAt: record.createdAt,
    })

    expect(record.origin).toBe('subconscious-proactive')
    expect(record.summary).toBe(outcomeRef)
    expect(record.sourceKinds).toEqual(['proactive'])
    expect(normalized).toEqual(expect.objectContaining({
      summary: outcomeRef,
      projectStateContinuity: null,
      preferenceHints: [],
      sensitivityHints: [],
      repairHints: [],
      burdenHints: [],
      narrative: [],
      affectiveResidue: null,
    }))
    expect(JSON.stringify(normalized)).not.toContain(marker)
  })

  it('does not carry an old free-text summary when the new closure has no evidence', () => {
    const previous = {
      ...buildAlicizationPersonStateUpdateSurface({
        closure: createClosure(),
        now: 10_000,
      }),
      summary: 'legacy narrative that must not be persisted',
      sourceTrail: [],
      reinforcementBias: {
        'truthful-grounding': 0.1,
        'legacy-status': 0.8,
      } as any,
    }

    const surface = buildAlicizationPersonStateUpdateSurface({
      previous,
      closure: createClosure(),
      now: 11_000,
    })

    expect(surface.summary).toBe('')
    expect(surface.reinforcementBias).toEqual({
      'truthful-grounding': 0.1,
    })
    expect(buildAlicizationPersonStateUpdateRecord({
      closure: createClosure(),
      surface: {
        ...surface,
        summary: 'legacy-status',
      },
      createdAt: 11_000,
    }).summary).toBe('')
  })

  it('normalizes persisted person state to evidence ids and approved contexts only', () => {
    const marker = 'legacy person-state prose must not re-enter memory'
    const reinforcementRef = buildAlicizationPersonStateEvidenceRef('reinforcement', 'reinforce-1')
    const normalized = normalizeAlicizationPersonStateUpdateSurface({
      version: 'person-state-update-surface-v1',
      updatedAt: 12_000,
      summary: reinforcementRef,
      dominantContexts: ['general', 'execution', marker],
      relationshipShift: {
        trustDelta: 0.2,
        closenessDelta: -0.1,
        burdenDelta: 0.04,
        boundaryDelta: 0,
        repairDelta: 0.03,
      },
      reinforcementBias: {
        'truthful-grounding': 0.1,
      },
      preferenceHints: [marker],
      sensitivityHints: [marker],
      repairHints: [marker],
      burdenHints: [marker],
      narrative: [marker],
      sourceTrail: [
        {
          kind: 'reinforcement',
          sourceKind: 'execution',
          summary: reinforcementRef,
          createdAt: 12_000,
        },
        {
          kind: 'reinforcement',
          sourceKind: 'execution',
          summary: marker,
          createdAt: 11_000,
        },
      ],
      affectiveResidue: {
        summary: marker,
      },
    })

    expect(normalized).toEqual(expect.objectContaining({
      summary: reinforcementRef,
      dominantContexts: ['general', 'execution'],
      preferenceHints: [],
      sensitivityHints: [],
      repairHints: [],
      burdenHints: [],
      narrative: [],
      affectiveResidue: null,
    }))
    expect(normalized?.sourceTrail).toEqual([{
      kind: 'reinforcement',
      sourceKind: 'execution',
      summary: reinforcementRef,
      createdAt: 12_000,
    }])
    expect(JSON.stringify(normalized)).not.toContain(marker)
  })

  it('preserves arbitrary upstream ids as opaque references and rejects untraceable event summaries', () => {
    expect(normalizeAlicizationPersonStateUpdateSurface({
      version: 'person-state-update-surface-v1',
      updatedAt: 12_500,
      summary: buildAlicizationPersonStateEvidenceRef('reinforcement', 'outcome-more-room-first'),
      dominantContexts: ['general'],
      relationshipShift: {},
      reinforcementBias: {},
      sourceTrail: [{
        kind: 'reinforcement',
        sourceKind: 'execution',
        summary: buildAlicizationPersonStateEvidenceRef('reinforcement', 'different-source'),
        createdAt: 12_500,
      }],
    })).toBeNull()

    const upstreamId = 'custom upstream id/42'
    const upstreamRef = buildAlicizationPersonStateEvidenceRef('relationship-outcome', upstreamId)
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 13_000,
      closure: createClosure({
        relationshipOutcomes: [{
          id: upstreamId,
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'reply',
          actionSummary: '',
          closenessDelta: 0.02,
          trustDelta: 0.04,
          burdenDelta: 0,
          boundaryDelta: 0,
          misreadDelta: 0,
          repairDelta: 0,
          openLoopDelta: 0,
          summary: '',
          createdAt: 12_900,
        }],
      }),
    })

    expect(surface.summary).toBe(upstreamRef)
    expect(surface.sourceTrail[0]?.summary).toBe(surface.summary)

    expect(personStateUpdateRecordFromMindTurnEvent({
      id: 'evt-forged',
      decisionTraceId: 'mind:forged',
      turnId: null,
      sessionId: null,
      origin: 'system',
      kind: 'person-state-updated',
      payload: {
        version: 'person-state-update-surface-v1',
        updatedAt: 13_000,
        summary: upstreamRef,
        dominantContexts: ['general'],
        relationshipShift: {},
        reinforcementBias: {},
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'reply',
          summary: buildAlicizationPersonStateEvidenceRef('relationship-outcome', 'different-source'),
          createdAt: 13_000,
        }],
      },
      createdAt: 13_000,
    })).toBeNull()
  })
})
