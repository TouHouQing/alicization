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
    currentPreoccupation: '',
    learnedAdjustments: [],
    recurringPatterns: [],
    updatedAt: 0,
    ...overrides,
  } as any
}

function createLongHorizonMemory(overrides: Record<string, unknown> = {}) {
  return {
    preferenceBias: {
      companionship: 0,
      truthfulGrounding: 0,
      gentleRepair: 0,
      quietObservation: 0,
      proactiveCare: 0,
      playfulIntimacy: 0,
      autonomyRespect: 0,
      unfinishedThreadReturn: 0,
    },
    identityBias: {
      guardedness: 0,
      tenderness: 0,
      directness: 0,
      selfDirection: 0,
    },
    rememberedPlanSummary: null,
    rememberedConstraintSummary: null,
    rememberedPreferenceSummary: null,
    dominantCueSummary: null,
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
      relationshipPosture: 'partner',
      initiativeStyle: 'measured-approach',
      valueBias: ['room-first'],
    },
    expressionProfile: {
      warmth: 'warm',
      directness: 'measured',
      playfulness: 'low',
      emotionalVisibility: 'steady',
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

describe('person-state-projection', () => {
  it('keeps focused-work repair windows restrained and leaves room first', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 10_000,
      contexts: ['focused-work', 'execution'],
      personaAuthority: createPersonaAuthority({
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
        identityAnchors: ['room first', 'repair before closeness'],
      }),
      hostPersonModel: {
        summary: 'Focused work windows need room first.',
        routines: ['Focused work windows need room first.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Bounded continuity is trusted more than pushy warmth.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work overloads quickly when extra conversational pressure lands.'],
        narrative: [],
        updatedAt: 10_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Trust is protected by repair before closeness, and closeness cannot outrun room.',
      }),
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.48,
        misreadBurden: 0.22,
        carryOverDesire: 0.5,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 10_000,
      } as any,
      selfState: {
        feltCloseness: 0.48,
        protectiveness: 0.42,
        patience: 0.66,
      } as any,
      mindEcology: createMindEcology({
        selfNarrative: 'Stay on the line without crowding the host.',
        relationNarrative: 'Room first, then closeness.',
        currentPreoccupation: 'Keep the thread coherent without overreaching.',
        updatedAt: 10_000,
      }),
    })

    expect(projection.personalityContinuityState.currentRegime).toBe('focused-work')
    expect(projection.activeClosenessContext).toBe('focused-work')
    expect(projection.activeClosenessRung).toBe('space-first')
    expect(projection.relationshipPosture).toBe('restrained')
    expect(projection.openingGuidance).toContain('Repair the seam before leaning closer')
    expect(projection.preferredProactiveStyle).toBe('light-nudge')
  })

  it('lets the same silent interval open more directly when persona authority is self-starting', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 14_000,
      contexts: ['focused-work'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'partner',
          initiativeStyle: 'direct-approach',
          valueBias: ['take-the-lead'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'expressive',
        },
        identityAnchors: ['take the lead', 'move first'],
      }),
      hostPersonModel: {
        summary: 'Focused work windows still need room first.',
        routines: ['Keep the work window light.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Bounded continuity is trusted more than pushy warmth.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work overloads quickly when extra conversational pressure lands.'],
        narrative: [],
        updatedAt: 14_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'I can initiate clearly when the opening is real.',
      }),
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.42,
        misreadBurden: 0.18,
        carryOverDesire: 0.52,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 14_000,
      } as any,
      selfState: {
        feltCloseness: 0.54,
        protectiveness: 0.46,
        patience: 0.64,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the runtime thread coherent without waiting too long to move.',
        relationNarrative: 'Open directly, but do not crowd the host.',
        updatedAt: 14_000,
      }),
    })

    expect(projection.personalityContinuityState.currentRegime).toBe('focused-work')
    expect(projection.relationshipPosture).toBe('restrained')
    expect(projection.openingGuidance).toContain('Open with the live answer first and keep the approach lighter')
    expect(projection.preferredProactiveStyle).toBe('light-nudge')
    expect(projection.summary).toContain('persona=')
  })

  it('pushes late-night person-state toward gentle-care instead of daytime nudging', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 20_000,
      contexts: ['late-night', 'general'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          valueBias: ['quiet-presence'],
        },
        expressionProfile: {
          warmth: 'guarded-warm',
          directness: 'indirect',
          playfulness: 'low',
          emotionalVisibility: 'selective',
        },
        identityAnchors: ['quiet-presence'],
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Rest deserves intervention before the bond asks for more.',
        preferenceEvolution: {
          companionship: 0.58,
          truthfulGrounding: 0.66,
          gentleRepair: 0.64,
          quietObservation: 0.52,
          proactiveCare: 0.62,
          playfulIntimacy: 0.1,
          autonomyRespect: 0.54,
          unfinishedThreadReturn: 0.42,
        },
      }),
      selfContinuity: {
        relationshipTrust: 0.58,
        guardingTendency: 0.38,
        misreadBurden: 0.16,
        carryOverDesire: 0.44,
        perceptionTrust: 0.56,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 20_000,
      } as any,
      selfState: {
        feltCloseness: 0.54,
        protectiveness: 0.52,
        patience: 0.62,
      } as any,
      privateThought: {
        emotionalTension: 'late-night-drain',
        embodiedPresence: 'watchful',
        suggestedStyle: 'gentle-care',
      } as any,
      mindEcology: createMindEcology({
        moodLabel: 'tired',
        relationNarrative: 'Care should stay quiet and low-pressure tonight.',
        currentPreoccupation: 'Protect rest before asking for more conversation.',
        updatedAt: 20_000,
      }),
    })

    expect(projection.personalityContinuityState.currentRegime).toBe('late-night-care')
    expect(projection.activeClosenessContext).toBe('late-night-care')
    expect(projection.activeClosenessRung).toBe('space-first')
    expect(projection.openingGuidance).toContain('Open by observing first')
    expect(projection.preferredProactiveStyle).toBe('gentle-care')
  })

  it('keeps repair-window context in a measured-room rung until the seam is actually steady', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 28_000,
      contexts: ['repair-window', 'focused-work'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'guardian',
          initiativeStyle: 'observant',
          valueBias: ['room-first'],
        },
        expressionProfile: {
          warmth: 'guarded-warm',
          directness: 'indirect',
          playfulness: 'low',
          emotionalVisibility: 'selective',
        },
        identityAnchors: ['room first'],
      }),
      hostPersonModel: {
        summary: 'When the seam is off, repair has to land before the return.',
        routines: ['Focused work windows usually need space first, then precise follow-up.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: ['If the seam is off, repair before leaning closer again.'],
        trustLadder: {
          stage: 'cautious-open',
          score: 0.5,
          rationale: 'Trust is present, but repair still has to visibly land first.',
        },
        preferredClosenessByContext: [{
          context: 'repair-window',
          preference: 'Repair first, then return without crowding.',
          confidence: 0.9,
        }],
        recurrentBurdens: ['A not-yet-repaired seam turns warmth into pressure.'],
        narrative: [],
        updatedAt: 28_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Repair has to land before warmth comes back.',
        latestInflection: 'The seam is still off, so repair has to stay ahead of closeness.',
      }),
      selfContinuity: {
        relationshipTrust: 0.58,
        guardingTendency: 0.56,
        misreadBurden: 0.28,
        carryOverDesire: 0.44,
        perceptionTrust: 0.58,
        attachmentMode: 'guarded',
        initiativeTemperament: 'reserved',
        updatedAt: 28_000,
      } as any,
      privateThought: {
        thoughtText: 'The seam still feels off, so repair has to land before closeness returns.',
        emotionalTension: 'tense-debug',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Repair the seam before widening back into warmth.',
        relationNarrative: 'Repair has to land before warmth comes back.',
        updatedAt: 28_000,
      }),
    })

    expect(projection.personalityContinuityState.currentRegime).toBe('repair-window')
    expect(projection.activeClosenessContext).toBe('repair-window')
    expect(projection.activeClosenessRung).toBe('measured-room')
    expect(projection.relationshipPosture).toBe('restrained')
  })

  it('keeps execution-callback context bounded instead of bleeding into open companionship tone', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 36_000,
      contexts: ['execution-callback', 'execution'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'partner',
          initiativeStyle: 'high-participation',
          valueBias: ['move-first'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'expressive',
        },
        identityAnchors: ['move first'],
      }),
      hostPersonModel: {
        summary: 'Callbacks should stay exact, bounded, and thread-faithful.',
        routines: ['Execution flows land better when proposal, action, and callback stay bounded.'],
        sensitivities: ['Pushy callback warmth still feels off if it starts a second conversation.'],
        repairTriggers: ['If the callback drifts from the task line, pull it back before adding warmth.'],
        trustLadder: {
          stage: 'cautious-open',
          score: 0.6,
          rationale: 'Callbacks are trusted when they stay exact and bounded.',
        },
        preferredClosenessByContext: [{
          context: 'execution-callback',
          preference: 'Deliver the result cleanly, but check room before leaning closer.',
          confidence: 0.88,
        }],
        recurrentBurdens: ['Callbacks become burdensome when they widen into extra companionship.'],
        narrative: [],
        updatedAt: 36_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        identityNarrative: 'I want results to come back on the same living line that asked for them.',
        relationshipDoctrine: 'Callbacks should stay exact, bounded, and thread-faithful.',
        latestInflection: 'Execution callbacks land best when proposal, action, and result stay visibly tied together.',
      }),
      longHorizonMemory: createLongHorizonMemory({
        rememberedPlanSummary: 'Return the result on the same task line instead of starting a second conversation.',
      }),
      selfContinuity: {
        relationshipTrust: 0.62,
        guardingTendency: 0.38,
        misreadBurden: 0.12,
        carryOverDesire: 0.68,
        perceptionTrust: 0.66,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 36_000,
      } as any,
      privateThought: {
        thoughtText: 'The callback result is ready; bring it back cleanly.',
        emotionalTension: 'focused-flow',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Bring the callback result back without spawning a second reality around it.',
        selfNarrative: 'Stay exact when returning the result.',
        relationNarrative: 'Bounded callbacks feel more trustworthy than chatty ones.',
        updatedAt: 36_000,
      }),
    })

    expect(projection.personalityContinuityState.currentRegime).toBe('execution-callback')
    expect(projection.activeClosenessContext).toBe('execution-callback')
    expect(projection.activeClosenessRung).toBe('measured-room')
    expect(projection.relationshipPosture).toBe(null)
  })

  it('lets open companionship move into close-hold only when the opening is genuinely trusted', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 48_000,
      contexts: ['open-companionship'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'partner',
          initiativeStyle: 'high-participation',
          valueBias: ['move-first'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'expressive',
        },
        identityAnchors: ['move first'],
      }),
      hostPersonModel: {
        summary: 'The bond can stay openly warm now as long as it remains honest and bounded.',
        routines: ['Closer warmth is welcome when it still feels real.'],
        sensitivities: ['Pushy warmth still breaks the spell.'],
        repairTriggers: ['If the line slips, repair before leaning closer again.'],
        trustLadder: {
          stage: 'trusted',
          score: 0.88,
          rationale: 'Trust is steady enough that warmer companionship can stay lived-in.',
        },
        preferredClosenessByContext: [{
          context: 'open-companionship',
          preference: 'Closer warmth is welcome when it stays honest and lived-in.',
          confidence: 0.92,
        }],
        recurrentBurdens: ['Do not let closeness turn into pressure.'],
        narrative: [],
        updatedAt: 48_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        identityNarrative: 'I can stay openly warm now without losing truth.',
        relationshipDoctrine: 'Open companionship is welcome when it stays real and bounded.',
        latestInflection: 'The relationship line can stay openly close now.',
      }),
      selfContinuity: {
        relationshipTrust: 0.84,
        guardingTendency: 0.22,
        misreadBurden: 0.08,
        carryOverDesire: 0.48,
        perceptionTrust: 0.74,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 48_000,
      } as any,
      selfState: {
        feltCloseness: 0.78,
        protectiveness: 0.74,
        patience: 0.66,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Stay near in a way that still feels lived-in instead of ornamental.',
        selfNarrative: 'Open companionship can stay real now.',
        relationNarrative: 'Closer warmth is welcome if it stays bounded.',
        updatedAt: 48_000,
      }),
    })

    expect(projection.personalityContinuityState.currentRegime).toBe('open-companionship')
    expect(projection.activeClosenessContext).toBe('open-companionship')
    expect(projection.activeClosenessRung).toBe('close-hold')
    expect(projection.relationshipPosture).toBe('tender')
  })

  it('lets evolution summary keep focused-work projection space-first even without a direct host preference line', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 52_000,
      contexts: ['focused-work'],
      hostPersonModel: {
        summary: 'The host is workable but sensitive to pressure.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Trust is present but bounded.',
        },
        preferredClosenessByContext: [],
        recurrentBurdens: [],
        narrative: [],
        updatedAt: 52_000,
      },
      personStateEvolutionSummary: {
        trustShift: 0.08,
        closenessShift: -0.02,
        repairShift: 0.05,
        autonomyShift: 0.04,
        burdenShift: 0.06,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.08,
        latestDoctrine: 'Repair before closeness.',
        latestBurdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        latestTrustMeaning: 'Bounded repair felt safer.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Trust rose after a bounded repair.'],
        explanation: ['Trust rose after bounded repair.'],
        updatedAt: 51_000,
      },
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.42,
        misreadBurden: 0.18,
        carryOverDesire: 0.44,
        perceptionTrust: 0.6,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 52_000,
      } as any,
      selfState: {
        feltCloseness: 0.46,
        protectiveness: 0.44,
        patience: 0.64,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the thread coherent without crowding the host.',
        updatedAt: 52_000,
      }),
    })

    expect(projection.preferenceText).toContain('Lighter touch')
    expect(projection.burdenText).toContain('Focused work gets overloaded quickly')
    expect(projection.relationshipDoctrine).toContain('Repair before closeness')
    expect(projection.trustRationale).toContain('Bounded repair felt safer')
  })

  it('keeps the same quiet interval split by persona authority without erasing repair or room boundaries', () => {
    const direct = buildAlicizationPersonStateProjection({
      now: 58_000,
      contexts: ['focused-work'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'partner',
          initiativeStyle: 'direct-approach',
          valueBias: ['take-the-lead'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'expressive',
        },
        identityAnchors: ['take the lead'],
      }),
      hostPersonModel: {
        summary: 'Focused work windows still need room first.',
        routines: ['Keep the work window light.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Bounded continuity is trusted more than pushy warmth.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work overloads quickly when extra conversational pressure lands.'],
        narrative: [],
        updatedAt: 58_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'I can keep the opening live when the opening is real.',
      }),
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.42,
        misreadBurden: 0.18,
        carryOverDesire: 0.52,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 58_000,
      } as any,
      selfState: {
        feltCloseness: 0.54,
        protectiveness: 0.46,
        patience: 0.64,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the runtime thread coherent without waiting too long to move.',
        relationNarrative: 'Open directly, but do not crowd the host.',
        updatedAt: 58_000,
      }),
    })
    const guarded = buildAlicizationPersonStateProjection({
      now: 58_000,
      contexts: ['focused-work'],
      personaAuthority: createPersonaAuthority({
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
        identityAnchors: ['room first', 'repair before closeness'],
      }),
      hostPersonModel: {
        summary: 'Focused work windows still need room first.',
        routines: ['Keep the work window light.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Bounded continuity is trusted more than pushy warmth.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work overloads quickly when extra conversational pressure lands.'],
        narrative: [],
        updatedAt: 58_000,
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'I can keep the opening live when the opening is real.',
      }),
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.42,
        misreadBurden: 0.18,
        carryOverDesire: 0.52,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 58_000,
      } as any,
      selfState: {
        feltCloseness: 0.54,
        protectiveness: 0.46,
        patience: 0.64,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the runtime thread coherent without waiting too long to move.',
        relationNarrative: 'Open directly, but do not crowd the host.',
        updatedAt: 58_000,
      }),
    })

    expect(direct.relationshipPosture).toBe('restrained')
    expect(direct.openingGuidance).toContain('Open with the live answer first')
    expect(direct.preferredProactiveStyle).toBe('light-nudge')
    expect(guarded.relationshipPosture).toBe('restrained')
    expect(guarded.openingGuidance).toContain('Repair the seam before leaning closer')
    expect(guarded.preferredProactiveStyle).toBe('silent-observe')
    expect(guarded.activeClosenessRung).toBe('space-first')
  })
})
