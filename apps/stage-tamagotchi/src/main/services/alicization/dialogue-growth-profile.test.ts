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

  it('keeps dialogue growth continuity anchored to the learned host model instead of only present mood drift', () => {
    const baseInput = {
      autobiographicalSelf: {
        personaDrift: {
          truthAnchor: 0.72,
          careBias: 0.62,
          irritabilityThreshold: 0.66,
          autonomyNeed: 0.46,
        },
        preferenceEvolution: {
          companionship: 0.58,
          truthfulGrounding: 0.72,
          proactiveCare: 0.54,
          autonomyRespect: 0.5,
          unfinishedThreadReturn: 0.56,
        },
        stability: 0.64,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.52,
          truthfulGrounding: 0.68,
          autonomyRespect: 0.48,
          unfinishedThreadReturn: 0.5,
        },
        identityBias: {
          directness: 0.42,
          tenderness: 0.58,
          guardedness: 0.22,
        },
      } as any,
      selfContinuity: {
        relationshipTrust: 0.58,
        guardingTendency: 0.32,
        carryOverDesire: 0.48,
      } as any,
      selfState: {
        feltCloseness: 0.52,
        protectiveness: 0.48,
        patience: 0.56,
      } as any,
      mindEcology: {
        temperament: {
          attachment: 0.56,
          steadiness: 0.58,
          directness: 0.42,
          tenderness: 0.6,
          irritability: 0.16,
          playfulness: 0.18,
        },
        climate: {
          socialNeed: 0.52,
          solitudeNeed: 0.22,
          restlessness: 0.2,
          reflectivePull: 0.32,
        },
      } as any,
    }

    const baseline = buildAlicizationDialogueGrowthProfile(baseInput)
    const withHostModel = buildAlicizationDialogueGrowthProfile({
      ...baseInput,
      hostPersonModel: {
        summary: 'Focused work windows need room first, but repair should still feel lived-in and gentle.',
        routines: ['Focused work windows usually need space first, then precise follow-up.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: ['If the reply feels robotic, repair before continuing.'],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'The host trusts bounded, repair-aware continuity more than pushy warmth.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Late-night fatigue can turn small nudges into real burden.'],
        narrative: [],
        updatedAt: 1,
      } as any,
    })

    expect(withHostModel.autonomyRespect).toBeGreaterThan(baseline.autonomyRespect)
    expect(withHostModel.restAttunement).toBeGreaterThan(baseline.restAttunement)
    expect(withHostModel.repairGentleness).toBeGreaterThan(baseline.repairGentleness)
    expect(withHostModel.currentPreoccupation).toContain('Late-night fatigue')
    expect(withHostModel.leadingAgenda).toContain('Focused work windows')
  })
})
