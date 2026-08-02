import { describe, expect, it, vi } from 'vitest'

import { createAlicizationPersonStateEvolutionRuntime, summarizePersonStateEvolutionLog } from './person-state-evolution-runtime'
import { buildAlicizationPersonStateEvidenceRef } from './person-state-update-surface'

describe('person-state-evolution-runtime', () => {
  it('appends evolution entries and summarizes recent shifts', async () => {
    const evidenceRef = buildAlicizationPersonStateEvidenceRef('relationship-outcome', 'outcome-1')
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
        summary: evidenceRef,
        contexts_json: JSON.stringify(['general', 'dialogue']),
        relationship_doctrine: 'legacy doctrine',
        burden_line: 'legacy burden',
        trust_meaning: 'legacy trust',
        dominant_rung: 'legacy rung',
        source_trail_json: JSON.stringify([{
          kind: 'relationship-outcome',
          sourceKind: 'reply',
          summary: evidenceRef,
          createdAt: 1_000,
        }]),
        shifts_json: JSON.stringify([
          { kind: 'trust-shift', delta: 0.08, rationale: evidenceRef },
          { kind: 'burden-shift', delta: 0.04, rationale: evidenceRef },
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
      summary: evidenceRef,
      contexts: ['general', 'dialogue'],
      relationshipDoctrine: null,
      burdenLine: null,
      trustMeaning: null,
      dominantRung: null,
      sourceTrail: [{
        kind: 'relationship-outcome',
        sourceKind: 'reply',
        summary: evidenceRef,
        createdAt: 1_000,
      }],
      shifts: [
        { kind: 'trust-shift', delta: 0.08, rationale: evidenceRef },
        { kind: 'burden-shift', delta: 0.04, rationale: evidenceRef },
      ],
      createdAt: 1_000,
    }])

    expect(inserted).toHaveLength(1)
    expect(appended[0]?.sourceKind).toBe('person-state-update')

    const summary = await runtime.summarizeEvolution({ cardId: 'default' })
    expect(summary.trustShift).toBe(0.08)
    expect(summary.burdenShift).toBe(0.04)
    expect(summary.latestDominantRung).toBeNull()
    expect(summary.latestDoctrine).toBeNull()
    expect(summary.recentSummaries).toEqual([])
    expect(summary.explanation).toEqual([])
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
    expect(summary.latestDoctrine).toBeNull()
    expect(summary.latestBurdenLine).toBeNull()
    expect(summary.latestTrustMeaning).toBeNull()
    expect(summary.latestDominantRung).toBeNull()
    expect(summary.recentSummaries).toEqual([])
    expect(summary.explanation).toEqual([])
  })
})
