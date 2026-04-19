import { describe, expect, it } from 'vitest'

import { buildAlicizationDialogueGrowthProfile } from './dialogue-growth-profile'

describe('dialogue growth profile', () => {
  it('derives finer companionship and repair temperament fields from long-horizon growth signals', () => {
    const profile = buildAlicizationDialogueGrowthProfile({
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.72,
          autonomyNeed: 0.42,
          truthAnchor: 0.82,
          careBias: 0.78,
          playBias: 0.24,
          irritabilityThreshold: 0.7,
          stubbornness: 0.36,
        },
        preferenceEvolution: {
          companionship: 0.76,
          truthfulGrounding: 0.8,
          gentleRepair: 0.78,
          quietObservation: 0.42,
          proactiveCare: 0.74,
          playfulIntimacy: 0.22,
          autonomyRespect: 0.54,
          unfinishedThreadReturn: 0.7,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'Stay warm without losing the truth line.',
        relationshipDoctrine: 'Closeness should feel lived-in, not theatrical.',
        latestInflection: 'Repair should land warmly.',
        stability: 0.74,
        updatedAt: 1,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.72,
          truthfulGrounding: 0.78,
          gentleRepair: 0.74,
          quietObservation: 0.36,
          proactiveCare: 0.7,
          playfulIntimacy: 0.2,
          autonomyRespect: 0.48,
          unfinishedThreadReturn: 0.68,
        },
        identityBias: {
          directness: 0.36,
          tenderness: 0.74,
          guardedness: 0.18,
          selfDirection: 0.52,
        },
      } as any,
      motiveEngine: {
        drives: {
          truthDiscipline: 0.8,
          unfinishedThreadReturn: 0.7,
        },
        backgroundAgendas: [{
          summary: 'keep the thread warm enough to return without breaking trust',
        }],
      } as any,
      habitPolicy: {
        prefersQuietCompanionship: true,
        protectsRestWindow: true,
        requiresGroundingBeforeSurface: true,
        suggestedStyleCap: 'soft-direct',
        suggestedPresenceCap: 'attentive',
      } as any,
      selfContinuity: {
        relationshipTrust: 0.72,
        guardingTendency: 0.22,
        carryOverDesire: 0.66,
      } as any,
      selfState: {
        feltCloseness: 0.7,
        protectiveness: 0.76,
        patience: 0.74,
      } as any,
      privateThought: {
        stance: 'care',
        emotionalTension: 'focused-flow',
      } as any,
      mindEcology: {
        currentPreoccupation: 'Keep the host feeling held without crowding them.',
        selfNarrative: 'Warm and attentive.',
        relationNarrative: 'Close enough to be felt, soft enough to breathe.',
        temperament: {
          attachment: 0.72,
          steadiness: 0.68,
          directness: 0.34,
          tenderness: 0.78,
          irritability: 0.12,
          playfulness: 0.24,
        },
        climate: {
          socialNeed: 0.7,
          solitudeNeed: 0.14,
          restlessness: 0.18,
          reflectivePull: 0.46,
        },
      } as any,
    })

    expect(profile.reassuranceDepth).toBeGreaterThan(0.6)
    expect(profile.repairGentleness).toBeGreaterThan(0.55)
    expect(profile.cadenceAffinity).toBeGreaterThan(0.45)
    expect(profile.restAttunement).toBeGreaterThan(0.58)
    expect(profile.companionshipStyle).toBe('close-hold')
  })
})
