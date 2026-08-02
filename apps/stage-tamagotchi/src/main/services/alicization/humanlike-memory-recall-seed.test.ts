import { describe, expect, it } from 'vitest'

import { buildHumanlikeMemoryRecallSeedFromMindTurnEvents } from './humanlike-memory-recall-seed'

describe('humanlike memory recall seed', () => {
  it('projects structured relationship, affect, initiative, and certainty facts', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'candidate-structured',
          createdAt: 42_000,
          sourceChannels: ['host-emotion', 'initiative'],
          relationshipContext: {
            threadAnchor: 'delivery-thread',
            summary: 'The host confirmed the delivery destination.',
          },
          emotionalResidue: {
            tags: ['relief', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'low-pressure-follow-up',
            pressure: 'low',
          },
          recallPosture: {
            certainty: 'steady',
          },
          longTermWorthiness: {
            score: 0.72,
          },
          auditTrail: {
            confidence: 0.82,
          },
        },
      },
      createdAt: 42_000,
    }])

    expect(seed).toContain('relationship=The host confirmed the delivery destination.')
    expect(seed).toContain('emotion=relief,unfinishedness')
    expect(seed).toContain('initiative=low-pressure-follow-up')
    expect(seed).toContain('initiative_pressure=low')
    expect(seed).toContain('certainty=steady')
  })

  it('lets an explicit host correction replace the stored relationship fact', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([
      {
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: {
            id: 'candidate-before-correction',
            createdAt: 42_000,
            relationshipContext: {
              summary: 'Building A is the delivery destination.',
            },
          },
        },
        createdAt: 42_000,
      },
      {
        kind: 'humanlike-memory-corrected',
        payload: {
          candidateId: 'candidate-before-correction',
          field: 'relationshipContext',
          correctedValue: 'Building B is the delivery destination.',
          reason: 'The host corrected the address.',
        },
        createdAt: 43_000,
      },
    ])

    expect(seed).toContain('relationship=Building B is the delivery destination.')
    expect(seed).not.toContain('Building A')
    expect(seed).toContain('created=43000')
  })

  it('ranks equal candidates by recency instead of arbitrary prose markers', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([
      {
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: {
            id: 'candidate-older',
            createdAt: 10_000,
            relationshipContext: {
              summary: 'Legacy prose marker.',
            },
            longTermWorthiness: {
              score: 0.4,
            },
            recallPosture: {
              certainty: 'steady',
            },
          },
        },
        createdAt: 10_000,
      },
      {
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: {
            id: 'candidate-newer',
            createdAt: 20_000,
            relationshipContext: {
              summary: 'The host confirmed the delivery address.',
            },
            longTermWorthiness: {
              score: 0.4,
            },
            recallPosture: {
              certainty: 'steady',
            },
          },
        },
        createdAt: 20_000,
      },
    ], 1)

    expect(seed).toContain('relationship=The host confirmed the delivery address.')
    expect(seed).not.toContain('Legacy prose marker.')
  })

  it('keeps typed embodiment state in the recall seed', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'candidate-embodiment',
          createdAt: 61_000,
          embodimentTrace: {
            recallStrength: 'lightly-noticed',
            modalityContradictionRisk: 'medium',
            expressionState: {
              face: 'neutral-soft',
              gaze: 'stable',
              voice: 'even',
              pacing: 'natural',
            },
            residentState: {
              facialCue: 'soft-gaze',
              actionCue: 'observe-focus',
              mode: 'present',
              reason: 'The resident state remained observable.',
            },
          },
        },
      },
      createdAt: 61_000,
    }])

    expect(seed).toContain('embodiment_recall_strength=lightly-noticed')
    expect(seed).toContain('embodiment_modality_risk=medium')
    expect(seed).toContain('embodiment_gaze=stable')
    expect(seed).toContain('embodiment_resident_action=observe-focus')
  })

  it('does not expose memory metabolism commands to retrieval', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'candidate-metabolism',
          createdAt: 72_000,
          relationshipContext: {
            summary: 'The host confirmed a factual correction.',
          },
          metabolism: {
            forgettingPolicy: {
              downrankMemoryIds: ['older-note'],
              mergeMemoryIds: ['duplicate-note'],
              forgetMemoryIds: ['expired-note'],
              reasons: ['internal maintenance'],
            },
          },
          recallPosture: {
            certainty: 'tentative',
          },
        },
      },
      createdAt: 72_000,
    }])

    expect(seed).toContain('certainty=tentative')
    expect(seed).not.toMatch(/downrank=|merge=|forget=|metabolism=/u)
  })

  it('keeps typed initiative outcomes without replaying strategy prose', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'candidate-initiative',
          createdAt: 82_000,
          initiativeOutcomeRecord: {
            outcome: 'rejected',
            userReaction: 'rejected',
            strategyUpdate: 'Internal strategy prose must not be copied.',
          },
        },
      },
      createdAt: 82_000,
    }])

    expect(seed).toContain('initiative_outcome=rejected')
    expect(seed).toContain('initiative_reaction=rejected')
    expect(seed).not.toContain('Internal strategy prose')
  })

  it('turns affective residue into typed recall facts', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 91_000,
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.52,
          repairPressure: 0.2,
          burdenPressure: 0.1,
          trustPressure: 0.4,
          restProtectivePressure: 0.08,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.5,
            repairRecovery: 0.4,
            overreachRisk: 0.29,
            fatigueGuard: 0.18,
            afterglowCarry: 0.52,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['observed-affect'],
            summary: 'A measured return remains appropriate.',
          },
          sourceSignals: ['affective-observation'],
          summary: 'A measured return remains appropriate.',
        },
      },
      createdAt: 91_000,
    }])

    expect(seed).toContain('affective_residue_kind=afterglow')
    expect(seed).toContain('affective_cadence_mode=measured-return')
    expect(seed).toContain('affective_afterglow_carry=0.52')
    expect(seed).not.toContain('reasonTags')
  })
})
