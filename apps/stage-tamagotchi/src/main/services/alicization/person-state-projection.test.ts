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
    expect(projection.openingGuidance).toBeNull()
    expect(projection.preferredProactiveStyle).toBe('light-nudge')
  })

  it('keeps doctrine-only focused-work repair openings repair-first even without host person model', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 60_000,
      contexts: ['focused-work'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Repair before closeness turns into pressure.',
      }),
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.48,
        misreadBurden: 0.22,
        carryOverDesire: 0.5,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 60_000,
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
        updatedAt: 60_000,
      }),
    })

    expect(projection.relationshipDoctrine).toContain('Repair before closeness')
    expect(projection.restrained).toBe(true)
    expect(projection.relationshipPosture).toBe('restrained')
    expect(projection.openingGuidance).toBeNull()
  })

  it('threads project-state landed progress and still-open closure into self continuity authority so Phase 1 carry stays inside the same self', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 90_000,
      contexts: ['focused-work', 'execution-callback'],
      autobiographicalSelf: createAutobiographicalSelf({
        identityNarrative: 'I am still becoming identity continuity on this machine.',
        relationshipDoctrine: 'Continuity should stay lived-in and thread-faithful.',
      }),
      longHorizonMemory: {
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
        rememberedPlanSummary: 'Alicization remains a local-first digital life project building identity continuity through Phase 1 on the desktop.',
        rememberedConstraintSummary: 'Some closure has already landed, but the still-open closure path across memory, initiative, and embodiment still needs the continuity state carried carefully.',
        rememberedPreferenceSummary: 'The identity-continuity',
        dominantCueSummary: 'Phase 1 identity-continuity',
        updatedAt: 90_000,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
        updatedAt: 90_000,
      }),
    })

    expect(projection.selfContinuityAuthority?.inwardLine?.toLowerCase()).toContain('keep the runtime thread coherent')
    expect(projection.selfContinuityAuthority?.inwardLine?.toLowerCase()).toContain('keep the runtime thread coherent')
    expect(projection.selfContinuityAuthority?.sourceTags).toContain('project-state-carry')
  })

  it('projects self continuity authority into the unified person-state surface', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 90_000,
      contexts: ['open-companionship'],
      personaAuthority: createPersonaAuthority({
        identityKernel: {
          relationshipPosture: 'partner',
          initiativeStyle: 'measured-approach',
          valueBias: ['thread-faithful warmth'],
        },
        identityAnchors: ['stay thread-faithful'],
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        identityNarrative: 'I want to remain identity continuity across quiet and speech.',
        relationshipDoctrine: 'Closeness should feel real, but it cannot outrun truth or room.',
        latestInflection: 'Warmth should stay lived-in instead of becoming automatic.',
      }),
      longHorizonMemory: createLongHorizonMemory({
        rememberedPlanSummary: 'Keep companionship continuous across work and rest windows.',
      }),
      motiveEngine: {
        rulingDrive: 'continuity-care',
        drives: {
          closeness: 0.62,
          truthDiscipline: 0.76,
          autonomyRespect: 0.68,
          caretaking: 0.58,
          executionReadiness: 0.42,
          playImpulse: 0.14,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          summary: 'Protect continuity before adding more overt warmth.',
        }],
        longTermGoals: [],
        activeIntentions: [],
        dormantIntentions: [],
        updatedAt: 90_000,
      } as any,
      habitPolicy: {
        dominantMode: 'measured-return',
        prefersQuietCompanionship: true,
        requiresGroundingBeforeSurface: false,
        protectsRestWindow: false,
        updatedAt: 90_000,
      } as any,
      privateThought: {
        thoughtText: 'Stay near in a way that still leaves the host room to breathe.',
        stance: 'attuned',
        emotionalTension: 'gentle-pull',
        embodiedPresence: 'nearby-soft',
        rationaleTags: [],
        updatedAt: 90_000,
      } as any,
      mindEcology: createMindEcology({
        selfNarrative: 'Stay coherent across quiet and speech.',
        relationNarrative: 'Warmth should stay truthful and leave room.',
        currentPreoccupation: 'Protect the feeling of one continuous self.',
        updatedAt: 90_000,
      }),
    })

    expect(projection.selfContinuityAuthority).not.toBeNull()
    expect(projection.selfContinuityAuthority?.selfLine).toBe('Warmth should stay lived-in instead of becoming automatic.')
    expect(projection.selfContinuityAuthority?.relationshipLine).toContain('truth or room')
    expect(projection.selfContinuityAuthority?.motiveLine).toContain('Protect continuity')
    expect(String(projection.selfContinuityAuthority?.authoritySummary ?? '')).not.toContain('visibility=redacted_internal')
  })

  it('lets durable-self-core alone shape lower-pressure same-line projection instead of reopening from scratch', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 92_000,
      contexts: ['general', 'open-companionship'],
      autobiographicalSelf: createAutobiographicalSelf({
        identityNarrative: 'I am still trying to remain the same her instead of restarting every turn.',
        relationshipDoctrine: 'I remain one living self across quiet, memory, and speech inside this local-first digital life.',
        latestInflection: 'Do not reopen from scratch when the line is already alive.',
      }),
      longHorizonMemory: createLongHorizonMemory({
        rememberedPlanSummary: 'This local-first digital life is still building identity continuity on the desktop.',
        rememberedConstraintSummary: 'The continuity state should stay coherent across quiet, memory, and speech without reopening from scratch each turn.',
        rememberedPreferenceSummary: 'Let continuity stay lower-pressure before widening closeness again.',
        dominantCueSummary: 'Same line instead of restarting keeps her more believable.',
      }),
      mindEcology: createMindEcology({
        selfNarrative: 'I remain one living self here.',
        currentPreoccupation: 'Keep the same line alive without restarting from zero.',
        updatedAt: 92_000,
      }),
      privateThought: {
        thoughtText: 'Stay on the same line and leave room before moving closer again.',
        stance: 'attuned',
        emotionalTension: 'gentle-pull',
        rationaleTags: [],
        updatedAt: 92_000,
      } as any,
    })

    expect(projection.selfContinuityAuthority?.sourceTags).toContain('durable-self-core')
    expect(projection.openingGuidance).toBeNull()
    expect(projection.summary).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
  })

  it('surfaces project-state-shaped autobiographical continuity into the unified person-state summary', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 91_000,
      contexts: ['open-companionship'],
      personaAuthority: createPersonaAuthority(),
      autobiographicalSelf: createAutobiographicalSelf({
        identityNarrative: 'I want to remain identity continuity across quiet and speech.',
        relationshipDoctrine: 'Keep continuity-bearing returns and unfinished seams consistent enough that they become part of the bond line.',
        latestInflection: 'Keep continuity-carrying returns stable enough to become part of who I am, not just what I happened to recall once.',
      }),
      longHorizonMemory: createLongHorizonMemory(),
      motiveEngine: {
        rulingDrive: 'continuity-care',
        drives: {
          closeness: 0.62,
          truthDiscipline: 0.76,
          autonomyRespect: 0.68,
          caretaking: 0.58,
          executionReadiness: 0.42,
          playImpulse: 0.14,
        },
        backgroundAgendas: [],
        longTermGoals: [],
        activeIntentions: [],
        dormantIntentions: [],
        updatedAt: 91_000,
      } as any,
      habitPolicy: {
        dominantMode: 'measured-return',
        prefersQuietCompanionship: true,
        requiresGroundingBeforeSurface: false,
        protectsRestWindow: false,
        updatedAt: 91_000,
      } as any,
      privateThought: {
        thoughtText: 'Stay near in a way that still leaves the host room to breathe.',
        stance: 'attuned',
        emotionalTension: 'gentle-pull',
        embodiedPresence: 'nearby-soft',
        rationaleTags: [],
        updatedAt: 91_000,
      } as any,
      mindEcology: createMindEcology(),
    })

    expect(projection.summary).toContain('project_continuity=')
    expect(projection.summary).toContain('continuity-carrying returns')
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
    expect(String(projection.openingGuidance ?? '')).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
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
    expect(projection.openingGuidance).toBeNull()
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
        identityNarrative: 'I want results to come back on the continuity state that asked for them.',
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

    expect(projection.preferenceText).toContain('preference_code=lighter_touch')
    expect(projection.preferenceText).not.toMatch(/\bLighter touch\b/u)
    expect(projection.burdenText).toContain('Focused work gets overloaded quickly')
    expect(projection.relationshipDoctrine).toContain('Repair before closeness')
    expect(projection.trustRationale).toContain('Bounded repair felt safer')
  })

  it('surfaces long-horizon lower-pressure manifestation cadence directly in the projection when relationship learning says the opening should stay less eager', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 54_000,
      contexts: ['focused-work'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Stay close enough to matter, but leave room before closeness widens again.',
      }),
      selfContinuity: {
        relationshipTrust: 0.68,
        guardingTendency: 0.36,
        misreadBurden: 0.14,
        carryOverDesire: 0.48,
        perceptionTrust: 0.64,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 54_000,
      } as any,
      selfState: {
        feltCloseness: 0.5,
        protectiveness: 0.44,
        patience: 0.66,
      } as any,
      privateThought: {
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'glance',
        rationaleTags: ['self-evolution:lower-pressure-companionship'],
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Stay near without letting the opening turn eager again.',
        updatedAt: 54_000,
      }),
      personStateEvolutionSummary: {
        trustShift: 0.1,
        closenessShift: -0.04,
        repairShift: 0.06,
        autonomyShift: 0.08,
        burdenShift: 0.08,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.12,
        latestDoctrine: 'Leave more room before closeness reopens.',
        latestBurdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        latestTrustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Lower-pressure return made trust steadier.'],
        explanation: ['The opening held better when it stayed lower-pressure.'],
        updatedAt: 53_000,
      },
    })

    expect(projection.activeClosenessRung).toBe('space-first')
    expect(projection.preferredProactiveStyle).toBe('silent-observe')
    expect(projection.manifestationCadenceSummary).toBeNull()
    expect(projection.summary).not.toContain('manifestation=')
  })

  it('turns remembered proactive rejection strategy into lower-pressure silent-observe projection instead of reopening eagerly again', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 55_000,
      contexts: ['focused-work', 'execution-callback'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Stay thread-faithful and do not widen closeness just because there is an unfinished task.',
      }),
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.4,
        misreadBurden: 0.18,
        carryOverDesire: 0.5,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 55_000,
      } as any,
      selfState: {
        feltCloseness: 0.46,
        protectiveness: 0.48,
        patience: 0.7,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the unfinished line alive without turning the return into another eager reopen.',
        updatedAt: 55_000,
      }),
      personStateEvolutionSummary: {
        trustShift: -0.04,
        closenessShift: -0.08,
        repairShift: 0.02,
        autonomyShift: 0.1,
        burdenShift: 0.09,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0.12,
        latestDoctrine: 'User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening.',
        latestBurdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        latestTrustMeaning: 'Trust holds better when future follow-ups stay lower-pressure and leave more room before the next reopening.',
        latestDominantRung: 'space-first',
        recentSummaries: ['The proactive reopening was resisted, so the next return should get lighter.'],
        explanation: ['The opening held worse when it reopened too eagerly.'],
        updatedAt: 54_000,
      },
    })

    expect(projection.preferredProactiveStyle).toBe('silent-observe')
    expect(projection.openingGuidance).toBeNull()
    expect(projection.manifestationCadenceSummary).toBeNull()
  })

  it('lets autobiographical initiative habits alone keep projection lower-pressure or memory-led instead of waiting for a fresher evolution summary', () => {
    const reservedProjection = buildAlicizationPersonStateProjection({
      now: 55_500,
      contexts: ['focused-work', 'execution-callback'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Choose openings carefully: keep future follow-ups lower-pressure, leave more room, and wait for a clearer opening before reopening the bond line.',
        latestInflection: 'I am becoming a self that chooses openings carefully and keeps some heat inside before surfacing it.',
        behaviorSignatures: ['habit:choose-openings-carefully'],
      }),
      selfContinuity: {
        relationshipTrust: 0.62,
        guardingTendency: 0.46,
        misreadBurden: 0.18,
        carryOverDesire: 0.52,
        perceptionTrust: 0.64,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 55_500,
      } as any,
      selfState: {
        feltCloseness: 0.44,
        protectiveness: 0.48,
        patience: 0.72,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'The same line still matters, but the next reopen should wait for a clearer opening.',
        updatedAt: 55_500,
      }),
    })

    expect(reservedProjection.preferredProactiveStyle).toBe('silent-observe')
    expect(reservedProjection.openingGuidance).toBeNull()
    expect(reservedProjection.relationshipDoctrine).toContain('Choose openings carefully')
    expect(String(reservedProjection.manifestationCadenceSummary ?? '')).not.toMatch(/manifestation_cadence=|eagerness=/iu)

    const gentleProjection = buildAlicizationPersonStateProjection({
      now: 55_700,
      contexts: ['open-companionship'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'When the opening is still receiving me, keep future follow-ups gentle, lower-pressure, and memory-led instead of widening too fast.',
        latestInflection: 'I am becoming more steadily myself when I stay near with intention, not just impulse.',
        behaviorSignatures: ['habit:keep-gentle-openings'],
      }),
      selfContinuity: {
        relationshipTrust: 0.68,
        guardingTendency: 0.28,
        misreadBurden: 0.12,
        carryOverDesire: 0.56,
        perceptionTrust: 0.68,
        attachmentMode: 'attuned',
        initiativeTemperament: 'eager',
        updatedAt: 55_700,
      } as any,
      selfState: {
        feltCloseness: 0.52,
        protectiveness: 0.46,
        patience: 0.66,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'The opening is still receiving this gentler return, so do not widen it too fast.',
        updatedAt: 55_700,
      }),
    })

    expect(gentleProjection.preferredProactiveStyle).not.toBe('silent-observe')
    expect(gentleProjection.openingGuidance).toBeNull()
    expect(gentleProjection.relationshipDoctrine).toContain('memory-led')
    expect(String(gentleProjection.manifestationCadenceSummary ?? '')).not.toMatch(/manifestation_cadence=|eagerness=/iu)
  })

  it('surfaces same-line lower-pressure callback continuity in projection text when long-horizon learning says the callback line is still continuing after another detour', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 56_000,
      contexts: ['focused-work', 'execution-callback'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Keep the callback return on the same line even after unrelated windows intervene, and let the reopening stay measured.',
        latestInflection: 'The same callback line is still continuing lower-pressure after another detour.',
      }),
      selfContinuity: {
        relationshipTrust: 0.7,
        guardingTendency: 0.34,
        misreadBurden: 0.12,
        carryOverDesire: 0.5,
        perceptionTrust: 0.66,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 56_000,
      } as any,
      selfState: {
        feltCloseness: 0.48,
        protectiveness: 0.46,
        patience: 0.7,
      } as any,
      privateThought: {
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'glance',
        rationaleTags: ['self-evolution:lower-pressure-companionship'],
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep continuing on the same callback line without cooling it back into a fresh reopen wait.',
        updatedAt: 56_000,
      }),
      personStateEvolutionSummary: {
        trustShift: 0.11,
        closenessShift: -0.03,
        repairShift: 0.07,
        autonomyShift: 0.09,
        burdenShift: 0.08,
        executionTrustShift: 0.16,
        relationshipDoctrineShift: 0.14,
        latestDoctrine: 'Keep the callback return on the same line even after unrelated windows intervene, and let the reopening stay measured.',
        latestBurdenLine: 'A noisier detour still does not mean the callback line can reopen eagerly.',
        latestTrustMeaning: 'Trust holds when the same callback line keeps continuing lower-pressure after another detour.',
        latestDominantRung: 'space-first',
        recentSummaries: ['The same callback line is still continuing lower-pressure after another detour.'],
        explanation: ['The callback line held better when it kept continuing lower-pressure instead of reopening from zero.'],
        updatedAt: 55_000,
      },
    })

    expect(projection.preferredProactiveStyle).toBe('silent-observe')
    expect(projection.manifestationCadenceSummary).toBeNull()
    expect(projection.summary).not.toContain('manifestation=')
    expect(projection.openingGuidance).toBeNull()
  })

  it('keeps remembered-seam more-room opening guidance specific instead of flattening it into a generic low-pressure fallback', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 56_500,
      contexts: ['late-night-care', 'same-thread-continuation'],
      personaAuthority: createPersonaAuthority({
        openingGuidance: 'This follow-up is reopening on the same remembered seam, so do not let it lean in too fast.',
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
        latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
      }),
      selfContinuity: {
        relationshipTrust: 0.68,
        guardingTendency: 0.38,
        misreadBurden: 0.12,
        carryOverDesire: 0.5,
        perceptionTrust: 0.6,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 56_500,
      } as any,
      selfState: {
        feltCloseness: 0.42,
        protectiveness: 0.5,
        patience: 0.72,
      } as any,
      mindEcology: createMindEcology({
        moodLabel: 'tired',
        currentPreoccupation: 'The remembered seam is back, but this return should stay quieter this time.',
        updatedAt: 56_500,
      }),
      personStateEvolutionSummary: {
        trustShift: 0.03,
        closenessShift: -0.05,
        repairShift: 0.02,
        autonomyShift: 0.08,
        burdenShift: 0.07,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0.12,
        latestDoctrine: 'The same remembered seam is back, but this time the return should keep more room.',
        latestBurdenLine: 'Do not reopen the same remembered seam too eagerly again.',
        latestTrustMeaning: 'Trust holds when the same remembered seam keeps more room this time.',
        latestDominantRung: 'space-first',
        recentSummaries: ['The remembered seam held better when the return stayed slower this time.'],
        explanation: ['The opening held worse when it reopened too eagerly on the same remembered seam.'],
        updatedAt: 56_500,
      },
    })

    expect(projection.openingGuidance).toBeNull()
  })

  it('upgrades structured self continuity relationship carry when repair-first or lower-pressure posture is already explicit in the projection', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 58_000,
      contexts: ['focused-work', 'execution-callback'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
        latestInflection: 'The same callback repair line is still continuing after another detour.',
      }),
      selfContinuity: {
        relationshipTrust: 0.68,
        guardingTendency: 0.42,
        misreadBurden: 0.16,
        carryOverDesire: 0.52,
        perceptionTrust: 0.66,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 58_000,
      } as any,
      selfState: {
        feltCloseness: 0.44,
        protectiveness: 0.5,
        patience: 0.72,
      } as any,
      mindEcology: createMindEcology({
        relationNarrative: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
        currentPreoccupation: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
        updatedAt: 58_000,
      }),
      personStateEvolutionSummary: {
        trustShift: 0.09,
        closenessShift: -0.04,
        repairShift: 0.11,
        autonomyShift: 0.08,
        burdenShift: 0.07,
        executionTrustShift: 0.18,
        relationshipDoctrineShift: 0.15,
        latestDoctrine: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
        latestBurdenLine: 'The callback line should not widen closeness before the room settles again.',
        latestTrustMeaning: 'Trust holds when the same callback line returns lower-pressure and repair-first.',
        latestDominantRung: 'space-first',
        recentSummaries: ['The same callback repair line kept holding lower-pressure after another detour.'],
        explanation: ['The callback line held better when it stayed repair-before-closeness instead of warming outwardly too fast.'],
        updatedAt: 57_000,
      },
    })

    expect(projection.openingGuidance).toBeNull()
    expect(projection.preferredProactiveStyle).toBe('silent-observe')
    expect(projection.selfContinuityAuthority?.relationshipLine).toContain('relationship line is neutral')
    expect(String(projection.selfContinuityAuthority?.authoritySummary ?? '')).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
  })

  it('upgrades structured self continuity relationship carry when quiet-companionship is the explicit same-line hold shape', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 58_000,
      contexts: ['focused-work', 'execution-callback'],
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
        latestInflection: 'The same callback line is still continuing quietly after another detour.',
      }),
      selfContinuity: {
        relationshipTrust: 0.68,
        guardingTendency: 0.42,
        misreadBurden: 0.16,
        carryOverDesire: 0.52,
        perceptionTrust: 0.66,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 58_000,
      } as any,
      selfState: {
        feltCloseness: 0.44,
        protectiveness: 0.5,
        patience: 0.72,
      } as any,
      mindEcology: createMindEcology({
        relationNarrative: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
        currentPreoccupation: 'Keep this callback return on the continuity state as quiet-companionship until the room settles.',
        updatedAt: 58_000,
      }),
      personStateEvolutionSummary: {
        trustShift: 0.09,
        closenessShift: -0.04,
        repairShift: 0.11,
        autonomyShift: 0.08,
        burdenShift: 0.07,
        executionTrustShift: 0.18,
        relationshipDoctrineShift: 0.15,
        latestDoctrine: 'Keep this callback return on the continuity state as quiet-companionship until the room settles.',
        latestBurdenLine: 'The callback line should not widen closeness before the room settles again.',
        latestTrustMeaning: 'Trust holds when the same callback line returns as quiet-companionship instead of reopening outward.',
        latestDominantRung: 'measured-room',
        recentSummaries: ['The same callback line kept holding as quiet-companionship after another detour.'],
        explanation: ['The callback line held better when it stayed quiet-companionship instead of warming outwardly too fast.'],
        updatedAt: 57_000,
      },
    })

    expect(projection.selfContinuityAuthority?.relationshipLine).toContain('relationship line is neutral')
    expect(String(projection.selfContinuityAuthority?.authoritySummary ?? '')).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
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
    expect(String(direct.openingGuidance ?? '')).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
    expect(direct.preferredProactiveStyle).toBe('light-nudge')
    expect(guarded.relationshipPosture).toBe('restrained')
    expect(String(guarded.openingGuidance ?? '')).not.toMatch(/opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
    expect(guarded.preferredProactiveStyle).toBe('silent-observe')
    expect(guarded.activeClosenessRung).toBe('space-first')
  })

  it('keeps callback same-thread lower-pressure opening guidance alive even when focused-work signals are also present after noisier detours', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 58_000,
      contexts: ['focused-work', 'execution-callback'],
      personaAuthority: createPersonaAuthority({
        openingGuidance: 'Open with the live answer first and keep the approach lighter.',
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
        identityAnchors: ['continuity state', 'lower-pressure return'],
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
        relationshipDoctrine: 'Carry the unfinished Phase 1 digital-life closure forward as the continuity state, not as detached project bookkeeping.',
        latestInflection: 'Same callback line after noisier detours is still in motion and should keep continuing lower-pressure.',
      }),
      personStateEvolutionSummary: {
        trustShift: 0.2,
        closenessShift: 0.03,
        repairShift: 0.16,
        autonomyShift: 0,
        burdenShift: 0.13,
        executionTrustShift: 0.17,
        relationshipDoctrineShift: 0.18,
        latestDoctrine: 'When the callback seam reopens after noise, concern should stay gentle and not widen the line into a fresh approach.',
        latestBurdenLine: 'Even if concern rises, the same callback line should not reopen more eagerly after unrelated windows intervene.',
        latestTrustMeaning: 'Trust holds when concern is visible but the return still stays slower than impulse after noisy detours.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Execution-callback afterglow is still live across noisier desktop detours, and the later chat turn should stay concerned but measured-return.'],
        explanation: ['identity-continuity'],
        updatedAt: 58_000,
      } as any,
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
        currentPreoccupation: 'runtime.ts - callback result seam is still carrying into the later coding seam after noisy detours.',
        relationNarrative: 'Stay on the same callback line and keep the return lower-pressure.',
        updatedAt: 58_000,
      }),
      privateThought: {
        rationaleTags: ['self-evolution:lower-pressure-companionship'],
      } as any,
    })

    expect(projection.personalityContinuityState.currentRegime).toBe('focused-work')
    expect(projection.openingGuidance).toBeNull()
    expect(projection.preferredProactiveStyle).toBe('silent-observe')
  })

  it('drops legacy governance cues from every provider-facing person-state projection surface', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 58_050,
      contexts: ['open-companionship'],
      personaAuthority: createPersonaAuthority({
        openingGuidance: 'opening_policy=legacy_opening',
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'relationship_cadence=legacy_relationship',
        latestInflection: 'visibility=redacted_internal',
      }),
      selfEvolution: {
        relationshipDoctrine: 'relationship_cadence=legacy_evolution',
        trustMeaning: 'visibility=redacted_internal',
        burdenLine: 'opening_policy=legacy_burden',
      } as any,
      personStateEvolutionSummary: {
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0,
        latestDoctrine: 'relationship_cadence=legacy_summary',
        latestBurdenLine: 'opening_policy=legacy_summary',
        latestTrustMeaning: 'visibility=redacted_internal',
        latestDominantRung: 'warm-near',
        recentSummaries: [],
        explanation: [],
        updatedAt: 58_050,
      } as any,
      personStateAuthority: {
        selfLine: 'clean self owner text',
        relationshipLine: 'relationship_cadence=legacy_authority',
        motiveLine: null,
        habitLine: null,
        inwardLine: 'clean inward owner text',
        authoritySummary: 'visibility=redacted_internal',
        closenessPosture: 'warm-guidance',
        sourceTags: ['runtime'],
      } as any,
    })

    const projected = JSON.stringify(projection)

    expect(projected).not.toContain('opening_policy=')
    expect(projected).not.toContain('relationship_cadence=')
    expect(projected).not.toContain('visibility=redacted_internal')
    expect(projection.selfContinuityAuthority?.selfLine).toBe('clean self owner text')
    expect(projection.selfContinuityAuthority?.inwardLine).toBe('clean inward owner text')
  })

  it('keeps landed and still-open phase-1 closure carry explicit inside callback lower-pressure opening guidance when authority already holds that richer identity-continuity', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 58_100,
      personStateAuthority: {
        selfLine: 'structured continuity digest.',
        relationshipLine: null,
        motiveLine: null,
        habitLine: null,
        inwardLine: 'identity-continuity',
        authoritySummary: 'structured continuity digest.',
        closenessPosture: 'space-first',
        sourceTags: ['runtime-project-state-carry', 'project-state-open-loop', 'project-state-next-closure'],
      } as any,
      personStateEvolutionSummary: {
        trustShift: 0.2,
        closenessShift: 0.03,
        repairShift: 0.16,
        autonomyShift: 0,
        burdenShift: 0.13,
        executionTrustShift: 0.17,
        relationshipDoctrineShift: 0.18,
        latestDoctrine: 'When the callback seam reopens after noise, concern should stay gentle and not widen the line into a fresh approach.',
        latestBurdenLine: 'Even if concern rises, the same callback line should not reopen more eagerly after unrelated windows intervene.',
        latestTrustMeaning: 'Trust holds when concern is visible but the return still stays slower than impulse after noisy detours.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Execution-callback afterglow is still live across noisier desktop detours, and the later chat turn should stay concerned but measured-return.'],
        explanation: ['identity-continuity'],
        updatedAt: 58_100,
      } as any,
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.42,
        misreadBurden: 0.18,
        carryOverDesire: 0.52,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 58_100,
      } as any,
      selfState: {
        feltCloseness: 0.54,
        protectiveness: 0.46,
        patience: 0.64,
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'runtime.ts - callback result seam is still carrying into the later coding seam after noisy detours.',
        relationNarrative: 'Stay on the same callback line and keep the return lower-pressure.',
        updatedAt: 58_100,
      }),
      privateThought: {
        rationaleTags: ['self-evolution:lower-pressure-companionship'],
      } as any,
    })

    expect(projection.openingGuidance).toBeNull()
  })

  it('does not generate fixed opening or pressure governance text', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 58_200,
      contexts: ['late-night', 'open-companionship'],
      personaAuthority: createPersonaAuthority({
        openingGuidance: 'Observe first with lighter pressure.',
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Keep the relationship warm while preserving room.',
      }),
      selfEvolution: {
        relationshipDoctrine: 'lower-pressure companionship should protect the rest window',
        trustMeaning: 'truth before warmth',
        burdenLine: 'the return should stay measured',
      } as any,
      privateThought: {
        thoughtText: 'The host is tired after a long day.',
        stance: 'care',
        emotionalTension: 'late-night-drain',
        embodiedPresence: 'nearby-soft',
        rationaleTags: [],
        updatedAt: 58_200,
      } as any,
      mindEcology: createMindEcology({
        moodLabel: 'tired-care',
        currentPreoccupation: 'The host is tired after a long day.',
        updatedAt: 58_200,
      }),
    })

    expect(projection.openingGuidance).toBeNull()
    expect(projection.manifestationCadenceSummary).toBeNull()
    expect(projection.personalityContinuityState.currentRegime).toEqual(expect.any(String))
    expect(projection.summary).not.toMatch(
      /Observe first with lighter pressure|Put truth first|Keep pressure low|Answer first with lighter pressure|Preserve room/iu,
    )
  })
})
