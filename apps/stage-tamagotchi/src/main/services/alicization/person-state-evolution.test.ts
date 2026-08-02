import { describe, expect, it } from 'vitest'

import { buildAlicizationPersonStateEvolutionEntry } from './person-state-evolution'
import {
  buildAlicizationPersonStateEvidenceRef,
  buildAlicizationPersonStateUpdateRecord,
  buildAlicizationPersonStateUpdateSurface,
} from './person-state-update-surface'

describe('person-state-evolution', () => {
  it('records numeric shifts with evidence ids without generating relationship doctrine', () => {
    const marker = 'untrusted-prose-must-not-become-evolution-rationale'
    const closure = {
      relationshipOutcomes: [{
        id: 'outcome-1',
        cardId: 'card-1',
        decisionTraceId: 'mind:trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'execution' as const,
        actionSummary: marker,
        closenessDelta: -0.03,
        trustDelta: 0.08,
        burdenDelta: 0.06,
        boundaryDelta: -0.02,
        misreadDelta: 0,
        repairDelta: 0.04,
        openLoopDelta: 0,
        summary: marker,
        createdAt: 1_000,
      }],
      reinforcementEvents: [{
        id: 'reinforce-1',
        cardId: 'card-1',
        decisionTraceId: 'mind:trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'execution' as const,
        dimension: 'truthful-grounding' as const,
        delta: 0.1,
        valence: 'reinforce' as const,
        summary: marker,
        createdAt: 1_100,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [],
    }
    const next = buildAlicizationPersonStateUpdateSurface({
      closure,
      now: 1_200,
    })
    const record = buildAlicizationPersonStateUpdateRecord({
      closure,
      surface: next,
      createdAt: 1_200,
    })
    const entry = buildAlicizationPersonStateEvolutionEntry({
      closure,
      previous: null,
      next,
      record,
    })

    expect(entry).toEqual(expect.objectContaining({
      summary: buildAlicizationPersonStateEvidenceRef('reinforcement', 'reinforce-1'),
      relationshipDoctrine: null,
      burdenLine: null,
      trustMeaning: null,
      dominantRung: null,
    }))
    expect(entry?.shifts.length).toBeGreaterThan(0)
    expect(entry?.shifts.every(shift => shift.rationale === buildAlicizationPersonStateEvidenceRef('reinforcement', 'reinforce-1'))).toBe(true)
    expect(JSON.stringify(entry)).not.toContain(marker)
  })

  it('rejects a forged record summary that cannot be traced to closure evidence', () => {
    const closure = {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [],
    }
    const next = buildAlicizationPersonStateUpdateSurface({
      closure,
      now: 2_000,
    })
    const forgedNext = {
      ...next,
      summary: 'legacy-status',
      relationshipShift: {
        ...next.relationshipShift,
        trustDelta: 0.2,
      },
    }
    const record = buildAlicizationPersonStateUpdateRecord({
      closure,
      surface: forgedNext,
      createdAt: 2_000,
    })

    expect(buildAlicizationPersonStateEvolutionEntry({
      closure,
      previous: null,
      next: forgedNext,
      record: {
        ...record,
        summary: 'legacy-status',
      },
    })).toBeNull()
  })
})
