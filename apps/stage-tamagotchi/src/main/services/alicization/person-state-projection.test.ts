import { describe, expect, it } from 'vitest'

import { buildAlicizationPersonStateProjection } from './person-state-projection'

function createMindEcology(overrides: Record<string, unknown> = {}) {
  return {
    moodLabel: 'focused',
    replyHabit: 'hover-first',
    relationshipHabit: 'give-space',
    explorationHabit: 'follow-thread',
    regulationHabit: 'soften-before-speaking',
    temperament: {
      attachment: 0.5,
      curiosity: 0.54,
      steadiness: 0.62,
      directness: 0.34,
      playfulness: 0.12,
      irritability: 0.08,
      tenderness: 0.46,
    },
    climate: {
      valence: 0.42,
      arousal: 0.34,
      socialNeed: 0.32,
      solitudeNeed: 0.4,
      irritation: 0.06,
      restlessness: 0.08,
      reflectivePull: 0.34,
    },
    selfNarrative: '',
    relationNarrative: '',
    currentPreoccupation: 'focused runtime work',
    learnedAdjustments: [],
    recurringPatterns: [],
    updatedAt: 0,
    ...overrides,
  } as any
}

function createAutobiographicalSelf(overrides: Record<string, unknown> = {}) {
  return {
    personaDrift: {
      attachmentStyle: 'attuned',
      expressionStyle: 'measured',
      conflictStyle: 'repair-first',
      agencyStyle: 'balanced',
      attachmentNeed: 0.46,
      autonomyNeed: 0.62,
      truthAnchor: 0.74,
      careBias: 0.5,
      playBias: 0.14,
      irritabilityThreshold: 0.38,
      stubbornness: 0.44,
    },
    preferenceEvolution: {
      companionship: 0.52,
      truthfulGrounding: 0.72,
      gentleRepair: 0.68,
      quietObservation: 0.58,
      proactiveCare: 0.5,
      playfulIntimacy: 0.14,
      autonomyRespect: 0.7,
      unfinishedThreadReturn: 0.58,
    },
    activeGoals: [],
    behaviorSignatures: [],
    identityNarrative: '',
    relationshipDoctrine: '',
    latestInflection: '',
    stability: 0.68,
    updatedAt: 0,
    ...overrides,
  } as any
}

function createPersonaAuthority(overrides: Record<string, unknown> = {}) {
  return {
    obedience: 0.62,
    liveliness: 0.34,
    sensibility: 0.58,
    identityKernel: {
      relationshipPosture: 'guardian',
      initiativeStyle: 'observant',
      valueBias: ['room-first', 'repair-first'],
    },
    expressionProfile: {
      warmth: 'guarded-warm',
      directness: 'indirect',
      playfulness: 'low',
      emotionalVisibility: 'selective',
    },
    initiativeBaseline: {
      silenceReconnect: 'hold',
      comfortStyle: 'quiet-presence',
      jealousyStyle: 'mask-it',
    },
    evolutionSeed: {
      fastLayers: [],
      slowLayers: [],
      unlockTracks: [],
    },
    identityAnchors: ['room first'],
    antiPersonaConstraints: [],
    ...overrides,
  } as any
}

function createSelfContinuity(overrides: Record<string, unknown> = {}) {
  return {
    relationshipTrust: 0.64,
    guardingTendency: 0.42,
    misreadBurden: 0.18,
    carryOverDesire: 0.5,
    perceptionTrust: 0.62,
    attachmentMode: 'attuned',
    initiativeTemperament: 'reserved',
    updatedAt: 1_000,
    ...overrides,
  } as any
}

function createSelfState(overrides: Record<string, unknown> = {}) {
  return {
    feltCloseness: 0.48,
    protectiveness: 0.42,
    patience: 0.66,
    ...overrides,
  } as any
}

function createProjectionInput(overrides: Record<string, unknown> = {}) {
  return {
    now: 1_000,
    contexts: ['focused-work'],
    personaAuthority: createPersonaAuthority(),
    autobiographicalSelf: createAutobiographicalSelf(),
    selfContinuity: createSelfContinuity(),
    selfState: createSelfState(),
    mindEcology: createMindEcology(),
    ...overrides,
  }
}

describe('person-state-projection', () => {
  it('derives bounded closeness from structured host and personality state', () => {
    const projection = buildAlicizationPersonStateProjection(createProjectionInput({
      hostPersonModel: {
        summary: 'Focused work needs room.',
        routines: ['Keep the work window light.'],
        sensitivities: ['Pressure becomes intrusive quickly.'],
        repairTriggers: ['Repair before moving closer.'],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Bounded continuity is trusted.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'More room during focused work.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work overloads quickly.'],
        narrative: [],
        updatedAt: 1_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Repair before closeness.',
      }),
    }))

    expect(projection.closenessLadder.find(entry => entry.context === 'focused-work')?.rung).toBe('space-first')
    expect(projection.relationshipPosture).toBe('restrained')
    expect(projection.preferredProactiveStyle).toBe('silent-observe')
    expect(projection.preferenceText).toBe('More room during focused work.')
  })

  it('uses the evolution rung as a structured proactive signal without synthesizing preference prose', () => {
    const projection = buildAlicizationPersonStateProjection(createProjectionInput({
      personStateEvolutionSummary: {
        trustShift: 0.08,
        closenessShift: -0.02,
        repairShift: 0.05,
        autonomyShift: 0.04,
        burdenShift: 0.06,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.08,
        latestDoctrine: 'Repair before closeness.',
        latestBurdenLine: 'Focused work becomes overloaded quickly.',
        latestTrustMeaning: 'Bounded repair felt safer.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Bounded repair held better.'],
        explanation: ['Trust rose after bounded repair.'],
        updatedAt: 900,
      },
    }))

    expect(projection.preferredProactiveStyle).toBe('silent-observe')
    expect(projection.preferenceText).toBe('')
    expect(projection.burdenText).toBe('Focused work becomes overloaded quickly.')
    expect(projection.relationshipDoctrine).toBe('Repair before closeness.')
    expect(projection.trustRationale).toBe('Bounded repair felt safer.')
  })

  it('lets the current private thought and autobiographical habits use typed styles', () => {
    const reserved = buildAlicizationPersonStateProjection(createProjectionInput({
      autobiographicalSelf: createAutobiographicalSelf({
        behaviorSignatures: ['habit:choose-openings-carefully'],
      }),
      privateThought: {
        suggestedStyle: 'light-nudge',
      } as any,
    }))
    const gentle = buildAlicizationPersonStateProjection(createProjectionInput({
      contexts: ['open-companionship'],
      autobiographicalSelf: createAutobiographicalSelf({
        behaviorSignatures: ['habit:keep-gentle-openings'],
      }),
      privateThought: {
        suggestedStyle: 'silent-observe',
      } as any,
    }))

    expect(reserved.preferredProactiveStyle).toBe('silent-observe')
    expect(gentle.preferredProactiveStyle).toBe('light-nudge')
  })

  it('does not let owner prose manufacture legacy governance fields', () => {
    const projection = buildAlicizationPersonStateProjection(createProjectionInput({
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'The relationship owner keeps repair and room explicit.',
        latestInflection: 'The current self state is still settling.',
      }),
      selfEvolution: {
        relationshipDoctrine: 'The learned doctrine remains available to the owner.',
        trustMeaning: 'Trust is updated from reviewed outcomes.',
        burdenLine: 'Burden remains visible as state.',
      } as any,
      personStateAuthority: {
        selfLine: 'Owner self line.',
        relationshipLine: 'Owner relationship line.',
        motiveLine: null,
        habitLine: null,
        inwardLine: 'Owner inward line.',
        authoritySummary: 'Owner summary.',
        closenessPosture: 'space-first',
        sourceTags: ['runtime'],
      } as any,
    }))

    const serialized = JSON.stringify(projection)
    expect(projection.selfContinuityAuthority).not.toBeNull()
    expect(serialized).toContain('"selfContinuityAuthority"')
  })

  it('keeps open companionship close only when structured trust and posture allow it', () => {
    const projection = buildAlicizationPersonStateProjection(createProjectionInput({
      contexts: ['open-companionship'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'partner',
          initiativeStyle: 'measured-approach',
          valueBias: ['warmth'],
        },
        expressionProfile: {
          warmth: 'intense',
          directness: 'measured',
          playfulness: 'medium',
          emotionalVisibility: 'expressive',
        },
        identityAnchors: ['warmth'],
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.82,
        guardingTendency: 0.18,
        initiativeTemperament: 'eager',
      }),
      selfState: createSelfState({
        feltCloseness: 0.78,
        protectiveness: 0.74,
      }),
      mindEcology: createMindEcology({
        currentPreoccupation: 'open companionship',
      }),
    }))

    expect(projection.closenessLadder.find(entry => entry.context === 'open-companionship')?.rung).toBe('close-hold')
  })

  it('keeps repair and execution callbacks in measured room', () => {
    const repair = buildAlicizationPersonStateProjection(createProjectionInput({
      contexts: ['repair-window'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Repair before closeness.',
      }),
      mindEcology: createMindEcology({
        currentPreoccupation: 'repair window',
      }),
    }))
    const callback = buildAlicizationPersonStateProjection(createProjectionInput({
      contexts: ['execution-callback'],
      personStateEvolutionSummary: {
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0.1,
        autonomyShift: 0.05,
        burdenShift: 0.05,
        executionTrustShift: 0.1,
        relationshipDoctrineShift: 0,
        latestDoctrine: null,
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: 'space-first',
        recentSummaries: [],
        explanation: [],
        updatedAt: 900,
      },
      mindEcology: createMindEcology({
        currentPreoccupation: 'execution callback result',
      }),
    }))

    expect(repair.closenessLadder.find(entry => entry.context === 'repair-window')?.rung).toBe('measured-room')
    expect(callback.closenessLadder.find(entry => entry.context === 'execution-callback')?.rung).toBe('measured-room')
    expect(repair.openingGuidance).toBeNull()
    expect(callback.manifestationCadenceSummary).toBeNull()
  })
})
