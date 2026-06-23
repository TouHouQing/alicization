import { describe, expect, it, vi } from 'vitest'

import { createAlicizationPersonStateEvolutionRuntime, summarizePersonStateEvolutionLog } from './person-state-evolution-runtime'

describe('person-state-evolution-runtime', () => {
  it('appends evolution entries and summarizes recent shifts', async () => {
    const inserted: unknown[][] = []
    const runtime = createAlicizationPersonStateEvolutionRuntime({
      database: {} as never,
      now: () => 1_000,
      randomUUID: () => 'evolution-1',
      run: vi.fn(async (_database, sql, params) => {
        if (sql.includes('INSERT INTO person_state_evolution_log'))
          inserted.push(params ?? [])
        return {}
      }),
      all: async <T>() => [{
        id: 'evolution-1',
        card_id: 'default',
        decision_trace_id: 'mind:trace',
        turn_id: 'turn-1',
        session_id: 'session-1',
        active_thread_id: 'thread-runtime',
        source_kind: 'person-state-update',
        summary: 'Recent outcomes nudged trust upward.',
        contexts_json: JSON.stringify(['focused-work']),
        relationship_doctrine: 'Repair before closeness.',
        burden_line: 'Focused work gets overloaded quickly by extra conversational pressure.',
        trust_meaning: 'Trust grew when the seam stayed bounded.',
        dominant_rung: 'space-first',
        source_trail_json: JSON.stringify([]),
        shifts_json: JSON.stringify([
          { kind: 'trust-shift', delta: 0.08, rationale: 'Recent outcomes made trust easier to grant in this line.' },
          { kind: 'burden-shift', delta: 0.04, rationale: 'Burden rose, so extra pressure needs more restraint now.' },
        ]),
        created_at: 1_000,
      }] as T[],
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
    })

    const appended = await runtime.appendEvolutionEntries([{
      cardId: 'default',
      decisionTraceId: 'mind:trace',
      turnId: 'turn-1',
      sessionId: 'session-1',
      activeThreadId: 'thread-runtime',
      sourceKind: 'person-state-update',
      summary: 'Recent outcomes nudged trust upward.',
      contexts: ['focused-work'],
      relationshipDoctrine: 'Repair before closeness.',
      burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
      trustMeaning: 'Trust grew when the seam stayed bounded.',
      dominantRung: 'space-first',
      sourceTrail: [],
      shifts: [
        { kind: 'trust-shift', delta: 0.08, rationale: 'Recent outcomes made trust easier to grant in this line.' },
        { kind: 'burden-shift', delta: 0.04, rationale: 'Burden rose, so extra pressure needs more restraint now.' },
      ],
      createdAt: 1_000,
    }])

    expect(inserted).toHaveLength(1)
    expect(appended[0]?.sourceKind).toBe('person-state-update')

    const summary = await runtime.summarizeEvolution({ cardId: 'default' })
    expect(summary.trustShift).toBe(0.08)
    expect(summary.burdenShift).toBe(0.04)
    expect(summary.latestDominantRung).toBe('space-first')
    expect(summary.latestDoctrine).toContain('Repair before closeness')
  })

  it('summarizes multiple evolution entries into one replayable explanation', () => {
    const summary = summarizePersonStateEvolutionLog([
      {
        id: '1',
        cardId: 'default',
        decisionTraceId: null,
        turnId: null,
        sessionId: null,
        activeThreadId: null,
        sourceKind: 'person-state-update',
        summary: 'Trust rose after a bounded repair.',
        contexts: ['focused-work'],
        relationshipDoctrine: 'Repair before closeness.',
        burdenLine: 'Pressure rises quickly while focused.',
        trustMeaning: 'Bounded repair felt safer.',
        dominantRung: 'space-first',
        sourceTrail: [],
        shifts: [
          { kind: 'trust-shift', delta: 0.08, rationale: 'Trust rose after bounded repair.' },
          { kind: 'repair-posture-shift', delta: 0.05, rationale: 'Repair moved closer to the front.' },
        ],
        createdAt: 200,
      },
      {
        id: '2',
        cardId: 'default',
        decisionTraceId: null,
        turnId: null,
        sessionId: null,
        activeThreadId: null,
        sourceKind: 'person-state-update',
        summary: 'Burden rose after an intrusive callback.',
        contexts: ['execution-callback'],
        relationshipDoctrine: null,
        burdenLine: 'Callbacks become burdensome when they widen too early.',
        trustMeaning: null,
        dominantRung: 'measured-room',
        sourceTrail: [],
        shifts: [
          { kind: 'burden-shift', delta: 0.07, rationale: 'Burden rose after an intrusive callback.' },
        ],
        createdAt: 100,
      },
    ])

    expect(summary.trustShift).toBe(0.08)
    expect(summary.repairShift).toBe(0.05)
    expect(summary.burdenShift).toBe(0.07)
    expect(summary.explanation.length).toBeGreaterThan(0)
  })
})
