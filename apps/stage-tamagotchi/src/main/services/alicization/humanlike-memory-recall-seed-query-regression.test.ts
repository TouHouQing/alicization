import type { AlicizationMindTurnEventRecord } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { resolveHumanlikeMemoryRecallSeedFromEventHistory } from './humanlike-memory-recall-seed'

describe('humanlike memory recall seed query regression', () => {
  it('loads both candidate and correction events so corrected same-her recall reaches the next reply seed', async () => {
    const listHumanlikeMemoryRecallEvents = vi.fn(async (input: {
      kind?: 'person-state-updated' | 'humanlike-memory-corrected'
      limit: number
    }): Promise<Pick<AlicizationMindTurnEventRecord, 'kind' | 'payload' | 'createdAt'>[]> => {
      if (input.kind === 'person-state-updated') {
        return [{
          kind: 'person-state-updated',
          payload: {
            humanlikeMemoryCandidate: {
              id: 'humanlike-memory-candidate:query-regression',
              turnId: 'turn-query-regression',
              sessionId: 'session-query-regression',
              createdAt: 42_000,
              relationshipContext: {
                threadAnchor: 'same-her continuity correction',
                summary: 'Host first looked like they were pushing for progress.',
              },
              emotionalResidue: {
                tags: ['protective-continuity', 'unfinishedness'],
              },
              initiativeOpportunity: {
                kind: 'low-pressure-follow-up',
              },
              embodimentTrace: {
                summary: 'Reply should slow down and keep gaze stable when recalling this correction.',
              },
              autobiographicalImpact: {
                selfNarrativeDelta: 'I learned to carry corrected memory meaning instead of defending the first interpretation.',
              },
              auditTrail: {
                whyRemember: 'old interpretation | progress pressure',
                confidence: 0.82,
                correctionSurface: {
                  userCorrectableFields: ['relationshipContext', 'naturalRecallLine'],
                },
              },
              naturalRecallLine: '我记得你那次是在催进度，所以我先接进度线。',
            },
          },
          createdAt: 42_000,
        }]
      }

      if (input.kind === 'humanlike-memory-corrected') {
        return [{
          kind: 'humanlike-memory-corrected',
          payload: {
            candidateId: 'humanlike-memory-candidate:query-regression',
            field: 'relationshipContext',
            correctedValue: '你是在测试她是不是持续的人，不是催进度。',
            reason: 'same-person continuity was at stake',
          },
          createdAt: 43_000,
        }]
      }

      return []
    })

    const seed = await resolveHumanlikeMemoryRecallSeedFromEventHistory({
      listHumanlikeMemoryRecallEvents,
      limit: 24,
    })

    expect(listHumanlikeMemoryRecallEvents.mock.calls).toEqual([
      [{ kind: 'person-state-updated', limit: 24 }],
      [{ kind: 'humanlike-memory-corrected', limit: 24 }],
    ])
    expect(seed).toContain('line=recall_source=host_correction; field=relationship_context; corrected_value=你是在测试她是不是持续的人，不是催进度。; posture=relationship_context_not_status_pressure; visibility=memory_structured')
    expect(seed).toContain('relationship=Host corrected this memory meaning: 你是在测试她是不是持续的人，不是催进度。')
    expect(seed).toContain('why=old interpretation | progress pressure | host correction | same-person continuity was at stake')
    expect(seed).not.toContain('我记得你纠正过')
  })

  it('turns persisted affective residue events into recall seed text through the query path even without an explicit humanlike candidate', async () => {
    const listHumanlikeMemoryRecallEvents = vi.fn(async (input: {
      kind?: 'person-state-updated' | 'humanlike-memory-corrected'
      limit: number
    }): Promise<Pick<AlicizationMindTurnEventRecord, 'kind' | 'payload' | 'createdAt'>[]> => {
      if (input.kind === 'person-state-updated') {
        return [{
          kind: 'person-state-updated',
          payload: {
            affectiveResidue: {
              version: 'affective-residue-memory-v1',
              updatedAt: 88_850,
              residues: [],
              dominantResidueKind: 'afterglow',
              afterglowPressure: 0.26,
              repairPressure: 0.08,
              burdenPressure: 0.03,
              trustPressure: 0.22,
              restProtectivePressure: 0.04,
              relationshipCadence: {
                cadenceMode: 'measured-return',
                distancePosture: 'measured-room',
                companionshipDensity: 0.33,
                repairRecovery: 0.41,
                overreachRisk: 0.29,
                fatigueGuard: 0.18,
                afterglowCarry: 0.52,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['same-her', 'initiative-learning'],
                summary: 'Keep the same proactive line settling lower-pressure before warming wider.',
              },
              sourceSignals: ['proactive outcome learning'],
              summary: 'The proactive reopening should return measured and lower-pressure on the same line.',
            },
          },
          createdAt: 89_000,
        }]
      }

      return []
    })

    const seed = await resolveHumanlikeMemoryRecallSeedFromEventHistory({
      listHumanlikeMemoryRecallEvents,
      limit: 24,
    })

    expect(listHumanlikeMemoryRecallEvents.mock.calls).toEqual([
      [{ kind: 'person-state-updated', limit: 24 }],
      [{ kind: 'humanlike-memory-corrected', limit: 24 }],
    ])
    expect(seed).toContain('humanlike_memory_recall:')
    expect(seed).toContain('line=relationship_cadence=measured_return; return_pressure=low; warmth=delayed; visibility=memory_structured')
    expect(seed).toContain('emotion=afterglow-carry,unfinishedness')
    expect(seed).toContain('embodiment_voice=lower-pressure')
    expect(seed).toContain('initiative_visible_policy=memory_led_low_pressure; pressure=low; opening=natural_reopen; visibility=memory_structured')
    expect(seed).not.toContain('我记得这条线还在')
    expect(seed).not.toContain('我不催你')
  })
})
