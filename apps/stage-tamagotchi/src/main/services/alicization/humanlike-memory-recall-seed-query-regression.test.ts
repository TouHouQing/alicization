import type { AlicizationMindTurnEventRecord } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { resolveHumanlikeMemoryRecallSeedFromEventHistory } from './humanlike-memory-recall-seed'

describe('humanlike memory recall seed query regression', () => {
  it('loads both candidate and correction events so the corrected fact reaches the next reply seed', async () => {
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
                threadAnchor: 'delivery-address',
                summary: 'Building A was the delivery destination.',
              },
              emotionalResidue: {
                tags: ['relief', 'unfinishedness'],
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
                  userCorrectableFields: ['relationshipContext'],
                },
              },
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
            correctedValue: 'Building B is the delivery destination.',
            reason: 'The host corrected the address.',
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
    expect(seed).toContain('relationship=Building B is the delivery destination.')
    expect(seed).not.toMatch(/\b(?:line|embodiment|self|why|reason|metabolism)=/u)
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
                reasonTags: ['observed-affect', 'initiative-learning'],
                summary: 'Keep the next return measured before increasing intensity.',
              },
              sourceSignals: ['proactive outcome learning'],
              summary: 'The proactive outcome supports a measured return.',
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
    expect(seed).toContain('affective_residue_kind=afterglow')
    expect(seed).toContain('affective_cadence_mode=measured-return')
    expect(seed).toContain('affective_distance_posture=measured-room')
    expect(seed).toContain('affective_should_delay_warmth=true')
    expect(seed).toContain('affective_should_protect_rest=false')
    expect(seed).toContain('affective_afterglow_carry=0.52')
    expect(seed).toContain('affective_fatigue_guard=0.18')
    expect(seed).toContain('affective_overreach_risk=0.29')
    expect(seed).toContain('emotion=afterglow-carry,unfinishedness')
    expect(seed).toContain('embodiment_voice=lower-pressure')
    expect(seed).not.toMatch(/\b(?:line|relationship|initiative|embodiment|self|why|reason|metabolism)=/u)
    expect(seed).not.toMatch(/Return with lower pressure|Recall with lower pressure|Keep body pressure|Affective residue says/iu)
    expect(seed).not.toContain('中性可见占位')
  })
})
