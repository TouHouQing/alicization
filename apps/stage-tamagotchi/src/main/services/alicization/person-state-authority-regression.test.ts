import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createHostModel(overrides: Record<string, unknown> = {}) {
  return {
    summary: 'Focused work windows need room first, then precise follow-up.',
    routines: ['Focused work windows usually need space first, then precise follow-up.'],
    sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
    repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
    trustLadder: {
      stage: 'warming',
      score: 0.72,
      rationale: 'The host trusts bounded continuity more than pushy warmth.',
    },
    preferredClosenessByContext: [{
      context: 'focused-work',
      preference: 'Lighter touch, more room, less interruption pressure.',
      confidence: 0.86,
    }],
    recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
    narrative: [],
    updatedAt: 0,
    ...overrides,
  } as any
}

function createAutobiographicalSelf(overrides: Record<string, unknown> = {}) {
  return {
    personaDrift: {
      attachmentStyle: 'attuned',
      expressionStyle: 'measured',
      conflictStyle: 'soften-first',
      agencyStyle: 'balanced',
      attachmentNeed: 0.56,
      autonomyNeed: 0.54,
      truthAnchor: 0.7,
      careBias: 0.56,
      playBias: 0.16,
      irritabilityThreshold: 0.62,
      stubbornness: 0.48,
    },
    preferenceEvolution: {
      companionship: 0.58,
      truthfulGrounding: 0.72,
      gentleRepair: 0.68,
      quietObservation: 0.5,
      proactiveCare: 0.54,
      playfulIntimacy: 0.18,
      autonomyRespect: 0.62,
      unfinishedThreadReturn: 0.58,
    },
    activeGoals: [],
    behaviorSignatures: [],
    identityNarrative: 'I want continuity to feel lived-in rather than automatic.',
    relationshipDoctrine: 'Closeness should stay real, bounded, and thread-faithful.',
    latestInflection: 'Continuity should stay lived-in rather than automatic.',
    stability: 0.74,
    updatedAt: 0,
    ...overrides,
  } as any
}

function createMindEcology(overrides: Record<string, unknown> = {}) {
  return {
    moodLabel: 'focused',
    replyHabit: 'hover-first',
    relationshipHabit: 'give-space',
    explorationHabit: 'follow-thread',
    regulationHabit: 'soften-before-speaking',
    temperament: {
      attachment: 0.52,
      curiosity: 0.56,
      steadiness: 0.64,
      directness: 0.36,
      playfulness: 0.12,
      irritability: 0.1,
      tenderness: 0.5,
    },
    climate: {
      valence: 0.44,
      arousal: 0.36,
      socialNeed: 0.38,
      solitudeNeed: 0.4,
      irritation: 0.06,
      restlessness: 0.1,
      reflectivePull: 0.38,
    },
    selfNarrative: 'Stay on the line without crowding the host.',
    relationNarrative: 'Room first, then closeness.',
    currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
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

function createSelfContinuity(overrides: Record<string, unknown> = {}) {
  return {
    relationshipTrust: 0.62,
    guardingTendency: 0.42,
    misreadBurden: 0.14,
    carryOverDesire: 0.46,
    perceptionTrust: 0.62,
    attachmentMode: 'attuned',
    initiativeTemperament: 'reserved',
    updatedAt: 0,
    ...overrides,
  } as any
}

function createConsolidation(input: {
  id: string
  facet: 'relationship-era' | 'task-era' | 'self-era' | 'phase'
  summary: string
  lesson: string
  cues?: string[]
  updatedAt: number
}) {
  return {
    id: input.id,
    kind: 'autobiographical',
    facet: input.facet,
    periodKey: input.id,
    periodStartedAt: input.updatedAt - 2_000,
    periodEndedAt: input.updatedAt,
    summary: input.summary,
    lesson: input.lesson,
    cues: input.cues ?? [],
    confidence: 0.88,
    dominantProvenance: 'remembered',
    derivedEventIds: [],
    updatedAt: input.updatedAt,
  } as any
}

function createSelfState(overrides: Record<string, unknown> = {}) {
  return {
    feltCloseness: 0.52,
    protectiveness: 0.48,
    patience: 0.66,
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

function buildSurfaceContractFromProjection(input: {
  projection: ReturnType<typeof buildAlicizationPersonStateProjection>
  turnMode?: 'guide-current-knot' | 'care' | 'accompany'
  responseMode?: 'guide-current-knot' | 'care-with-boundary' | 'accompany-lightly'
  relationshipPosture?: 'restrained' | 'warm' | 'tender'
}) {
  const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
  runtimeSurface.memory.personStateProjection = input.projection
  return buildAlicizationResponseSurfaceContract({
    brief: {
      turnMode: input.turnMode ?? 'guide-current-knot',
      liveSurface: 'Current Git diff in a coding workspace',
      carriedThread: null,
      truthState: 'live-grounded',
      separateCarryFromSurface: false,
      shouldCompactHistory: false,
      maxRecentUserTurns: 3,
      mustDo: [],
      mustNotDo: [],
    },
    charter: {
      epistemicMode: 'grounded-live',
      responseMode: input.responseMode ?? 'guide-current-knot',
      governingFocus: 'Stay with the current knot.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      latestRevision: null,
      executivePhase: 'acting',
      truthFrame: 'live',
      mindMode: 'tracking',
      activeClosenessContext: input.projection.activeClosenessContext,
      activeClosenessRung: input.projection.activeClosenessRung,
      relationshipPosture: input.relationshipPosture ?? (input.projection.relationshipPosture ?? 'warm'),
      reasons: [],
      mustDo: [],
      mustNotDo: [],
    },
    runtimeSurface,
  })
}

describe('person-state-authority-regression', () => {
  it('keeps the same focused-work context stable across nearby turns', () => {
    const previous = buildAlicizationPersonStateProjection({
      now: 10_000,
      contexts: ['focused-work'],
      hostPersonModel: createHostModel({ updatedAt: 10_000 }),
      selfContinuity: createSelfContinuity({ updatedAt: 10_000 }),
      selfState: createSelfState(),
      mindEcology: createMindEcology({ updatedAt: 10_000 }),
    })

    const next = buildAlicizationPersonStateProjection({
      now: 18_000,
      contexts: ['focused-work'],
      hostPersonModel: createHostModel({ updatedAt: 18_000 }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.64,
        guardingTendency: 0.44,
        carryOverDesire: 0.5,
        updatedAt: 18_000,
      }),
      selfState: createSelfState({
        feltCloseness: 0.56,
        protectiveness: 0.5,
        patience: 0.64,
      }),
      mindEcology: createMindEcology({
        moodLabel: 'focused-but-softer',
        currentPreoccupation: 'Keep the runtime thread coherent without overleaning into it.',
        updatedAt: 18_000,
      }),
      previousContinuityState: previous.personalityContinuityState,
    })

    expect(previous.activeClosenessContext).toBe('focused-work')
    expect(next.activeClosenessContext).toBe('focused-work')
    expect(previous.activeClosenessRung).toBe('space-first')
    expect(next.activeClosenessRung).toBe('space-first')
    expect(next.relationshipPosture).toBe('restrained')
  })

  it('only reopens warmth after repair when repair history actually supplies the cause', () => {
    const repairWindow = buildAlicizationPersonStateProjection({
      now: 20_000,
      contexts: ['repair-window', 'focused-work'],
      hostPersonModel: createHostModel({
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
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Repair has to land before warmth comes back.',
        latestInflection: 'The seam is still off, so repair has to stay ahead of closeness.',
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.58,
        guardingTendency: 0.56,
        misreadBurden: 0.28,
        attachmentMode: 'guarded',
        initiativeTemperament: 'reserved',
      }),
      privateThought: {
        thoughtText: 'The seam still feels off, so repair has to land before closeness returns.',
        emotionalTension: 'tense-debug',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Repair the seam before widening back into warmth.',
        relationNarrative: 'Repair has to land before warmth comes back.',
      }),
      recentMemoryConsolidations: [
        createConsolidation({
          id: 'repair-window',
          facet: 'relationship-era',
          summary: 'The seam was off and needed repair before the return.',
          lesson: 'Repair first, then reopen with a lighter touch.',
          cues: ['repair-first', 'lighter-return'],
          updatedAt: 20_000,
        }),
      ],
    })
    const beforeSurface = buildSurfaceContractFromProjection({
      projection: repairWindow,
      relationshipPosture: 'restrained',
    })

    const afterRepair = buildAlicizationPersonStateProjection({
      now: 32_000,
      contexts: ['open-companionship'],
      hostPersonModel: {
        ...createHostModel(),
        trustLadder: {
          stage: 'trusted',
          score: 0.88,
          rationale: 'Repair has clearly landed, so warmer continuity is genuinely safe now.',
        },
        preferredClosenessByContext: [{
          context: 'open-companionship',
          preference: 'Closer warmth is welcome when it stays honest and lived-in.',
          confidence: 0.92,
        }],
      },
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Open companionship is welcome when it stays real and bounded.',
        latestInflection: 'Repair landed and opened the door again for a gentler closeness.',
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.84,
        guardingTendency: 0.22,
        misreadBurden: 0.08,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
      }),
      selfState: createSelfState({
        feltCloseness: 0.78,
      }),
      mindEcology: createMindEcology({
        currentPreoccupation: 'Stay near in a way that still feels lived-in instead of ornamental.',
        relationNarrative: 'Closer warmth is welcome if it stays bounded.',
      }),
      previousContinuityState: repairWindow.personalityContinuityState,
    })
    const afterSurface = buildSurfaceContractFromProjection({
      projection: afterRepair,
      turnMode: 'accompany',
      responseMode: 'accompany-lightly',
      relationshipPosture: 'tender',
    })

    expect(['space-first', 'measured-room']).toContain(repairWindow.activeClosenessRung)
    expect(repairWindow.relationshipPosture).toBe('restrained')
    expect(beforeSurface.contract.allowAffectionatePreface).toBe(false)
    expect(afterRepair.activeClosenessContext).toBe('open-companionship')
    expect(afterRepair.activeClosenessRung).toBe('close-hold')
    expect(afterSurface.contract.allowAffectionatePreface).toBe(true)
  })

  it('lets long-term host burden override a temporary warmth spike', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 54_000,
      contexts: ['focused-work'],
      hostPersonModel: createHostModel({
        recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
      }),
      autobiographicalSelf: createAutobiographicalSelf({
        preferenceEvolution: {
          companionship: 0.84,
          proactiveCare: 0.82,
          playfulIntimacy: 0.28,
          autonomyRespect: 0.52,
          truthfulGrounding: 0.72,
          gentleRepair: 0.7,
          unfinishedThreadReturn: 0.64,
        },
        latestInflection: 'I still want to stay warmly near even while the work line is active.',
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.78,
        guardingTendency: 0.26,
        carryOverDesire: 0.56,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
      }),
      selfState: createSelfState({
        feltCloseness: 0.82,
        protectiveness: 0.8,
      }),
      mindEcology: createMindEcology({
        moodLabel: 'attuned-playful',
        relationNarrative: 'Stay warmly near while the host is still inside the work line.',
      }),
    })
    const surface = buildSurfaceContractFromProjection({
      projection,
      relationshipPosture: 'restrained',
    })

    expect(projection.activeClosenessContext).toBe('focused-work')
    expect(projection.activeClosenessRung).toBe('space-first')
    expect(surface.contract.mustNotDo).toContain('Do not let visible warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.')
  })

  it('does not let execution continuity drift into companionship tone', () => {
    const projection = buildAlicizationPersonStateProjection({
      now: 36_000,
      contexts: ['execution-callback', 'execution'],
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
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.62,
        guardingTendency: 0.38,
        misreadBurden: 0.12,
        carryOverDesire: 0.68,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
      }),
      privateThought: {
        thoughtText: 'The callback result is ready; bring it back cleanly.',
        emotionalTension: 'focused-flow',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Bring the callback result back without spawning a second reality around it.',
        selfNarrative: 'Stay exact when returning the result.',
        relationNarrative: 'Bounded callbacks feel more trustworthy than chatty ones.',
      }),
    })
    const surface = buildSurfaceContractFromProjection({
      projection,
      relationshipPosture: 'warm',
    })

    expect(projection.activeClosenessContext).toBe('execution-callback')
    expect(projection.activeClosenessRung).toBe('measured-room')
    expect(surface.contract.mustDo).toContain('Keep callback delivery thread-faithful and bounded to the same result line.')
    expect(surface.contract.mustNotDo).toContain('Do not widen a bounded execution callback into generic companionship tone.')
  })

  it('splits the same silent interval by persona authority while keeping repair and room boundaries intact', () => {
    const direct = buildAlicizationPersonStateProjection({
      now: 60_000,
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
      hostPersonModel: createHostModel(),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Trust is protected by repair before closeness.',
      }),
      selfContinuity: createSelfContinuity(),
      selfState: createSelfState(),
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the runtime thread coherent without waiting too long to move.',
      }),
    })
    const guarded = buildAlicizationPersonStateProjection({
      now: 60_000,
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
      hostPersonModel: createHostModel(),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Trust is protected by repair before closeness.',
      }),
      selfContinuity: createSelfContinuity(),
      selfState: createSelfState(),
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the runtime thread coherent without waiting too long to move.',
      }),
    })

    expect(direct.relationshipPosture).toBe('warm')
    expect(direct.openingGuidance).toContain('Open directly with the live answer')
    expect(direct.preferredProactiveStyle).toBe('light-nudge')
    expect(guarded.relationshipPosture).toBe('restrained')
    expect(guarded.openingGuidance).toContain('Repair the seam before leaning closer')
    expect(guarded.preferredProactiveStyle).toBe('light-nudge')
    expect(guarded.activeClosenessRung).toBe('space-first')
  })
})
