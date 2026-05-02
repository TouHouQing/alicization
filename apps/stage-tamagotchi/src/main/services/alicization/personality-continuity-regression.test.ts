import { describe, expect, it } from 'vitest'

import { buildAlicizationPersonalityContinuityState } from './personality-continuity-state'

function createFocusedWorkHostModel(overrides: Record<string, unknown> = {}) {
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

function createSelfState(overrides: Record<string, unknown> = {}) {
  return {
    feltCloseness: 0.52,
    protectiveness: 0.48,
    patience: 0.66,
    ...overrides,
  } as any
}

function createMindEcology(overrides: Record<string, unknown> = {}) {
  const extraTemperament = (overrides.temperament as Record<string, unknown> | undefined) ?? {}
  const extraClimate = (overrides.climate as Record<string, unknown> | undefined) ?? {}
  const restOverrides = { ...overrides }
  delete restOverrides.temperament
  delete restOverrides.climate

  const temperament = {
    attachment: 0.52,
    curiosity: 0.56,
    steadiness: 0.64,
    directness: 0.36,
    playfulness: 0.12,
    irritability: 0.1,
    tenderness: 0.5,
    ...extraTemperament,
  }
  const climate = {
    valence: 0.44,
    arousal: 0.36,
    socialNeed: 0.38,
    solitudeNeed: 0.4,
    irritation: 0.06,
    restlessness: 0.1,
    reflectivePull: 0.38,
    ...extraClimate,
  }

  const result = {
    moodLabel: 'focused',
    replyHabit: 'hover-first',
    relationshipHabit: 'give-space',
    explorationHabit: 'follow-thread',
    regulationHabit: 'soften-before-speaking',
    temperament,
    climate,
    selfNarrative: 'Stay on the line without crowding the host.',
    relationNarrative: 'Room first, then closeness.',
    currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
    learnedAdjustments: [],
    recurringPatterns: [],
    updatedAt: 0,
    ...restOverrides,
  } as any
  result.temperament = temperament
  result.climate = climate
  return result
}

function createAutobiographicalSelf(overrides: Record<string, unknown> = {}) {
  const personaDrift = {
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
    ...((overrides.personaDrift as Record<string, unknown> | undefined) ?? {}),
  }
  const preferenceEvolution = {
    companionship: 0.58,
    truthfulGrounding: 0.72,
    gentleRepair: 0.68,
    quietObservation: 0.5,
    proactiveCare: 0.54,
    playfulIntimacy: 0.18,
    autonomyRespect: 0.62,
    unfinishedThreadReturn: 0.58,
    ...((overrides.preferenceEvolution as Record<string, unknown> | undefined) ?? {}),
  }
  const restOverrides = { ...overrides }
  delete restOverrides.personaDrift
  delete restOverrides.preferenceEvolution

  const result = {
    personaDrift,
    preferenceEvolution,
    activeGoals: [],
    behaviorSignatures: [],
    identityNarrative: 'I want continuity to feel lived-in rather than automatic.',
    relationshipDoctrine: 'Closeness should stay real, bounded, and thread-faithful.',
    latestInflection: 'Continuity should stay lived-in rather than automatic.',
    stability: 0.74,
    updatedAt: 0,
    ...restOverrides,
  } as any
  result.personaDrift = personaDrift
  result.preferenceEvolution = preferenceEvolution
  return result
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

describe('personality continuity regression', () => {
  it('keeps the same focused-work continuity stable across nearby turns with only small mood jitter', () => {
    const previous = buildAlicizationPersonalityContinuityState({
      now: 10_000,
      hostPersonModel: createFocusedWorkHostModel({ updatedAt: 10_000 }),
      selfContinuity: createSelfContinuity({ updatedAt: 10_000 }),
      selfState: createSelfState(),
      mindEcology: createMindEcology({ updatedAt: 10_000 }),
    })

    const next = buildAlicizationPersonalityContinuityState({
      now: 18_000,
      previousContinuityState: previous,
      hostPersonModel: createFocusedWorkHostModel({ updatedAt: 18_000 }),
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
        climate: {
          arousal: 0.32,
          socialNeed: 0.42,
          solitudeNeed: 0.38,
        },
        currentPreoccupation: 'Keep the runtime thread coherent without overleaning into it.',
        updatedAt: 18_000,
      }),
    })

    expect(next.currentRegime).toBe('focused-work')
    expect(next.autonomyPosture).toBe('protect-space')
    expect(next.regimeModel.carryFrom).toBe('focused-work')
    expect(next.rhythmState.restMode).toBe('low-pressure')
    expect(Math.abs(next.regimeModel.confidence - previous.regimeModel.confidence)).toBeLessThan(0.16)
  })

  it('shows warmer repair-aftereffect only when repair history supplies the cause', () => {
    const repairWindow = buildAlicizationPersonalityContinuityState({
      now: 20_000,
      hostPersonModel: createFocusedWorkHostModel({ updatedAt: 20_000 }),
      autobiographicalSelf: createAutobiographicalSelf({
        relationshipDoctrine: 'Repair has to land before warmth comes back.',
        latestInflection: 'The seam is still off, so repair has to land before the return.',
        preferenceEvolution: {
          truthfulGrounding: 0.84,
          gentleRepair: 0.78,
          autonomyRespect: 0.78,
          unfinishedThreadReturn: 0.74,
        },
      }),
      selfContinuity: createSelfContinuity({
        misreadBurden: 0.28,
        guardingTendency: 0.58,
        updatedAt: 20_000,
      }),
      selfState: createSelfState({ feltCloseness: 0.4 }),
      privateThought: {
        thoughtText: 'The seam still feels off, so repair has to land before closeness returns.',
        emotionalTension: 'tense-debug',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Repair the seam before widening back into warmth.',
        relationNarrative: 'Repair has to land before warmth comes back.',
        updatedAt: 20_000,
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

    const afterRepair = buildAlicizationPersonalityContinuityState({
      now: 32_000,
      previousContinuityState: repairWindow,
      hostPersonModel: {
        ...createFocusedWorkHostModel({ updatedAt: 32_000 }),
        trustLadder: {
          stage: 'warming',
          score: 0.78,
          rationale: 'Repair has started to land, so warmer continuity is safer now.',
        },
        preferredClosenessByContext: [{
          context: 'open-companionship',
          preference: 'Warmer closeness is okay once repair has clearly landed.',
          confidence: 0.88,
        }],
      },
      autobiographicalSelf: createAutobiographicalSelf({
        latestInflection: 'Repair landed and opened the door again for a gentler closeness.',
        relationshipDoctrine: 'Warmth can come back when repair has already steadied the seam.',
        preferenceEvolution: {
          companionship: 0.76,
          proactiveCare: 0.74,
          truthfulGrounding: 0.72,
          gentleRepair: 0.74,
          autonomyRespect: 0.5,
        },
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.72,
        misreadBurden: 0.12,
        guardingTendency: 0.28,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 32_000,
      }),
      selfState: createSelfState({
        feltCloseness: 0.72,
        protectiveness: 0.7,
        patience: 0.68,
      }),
      mindEcology: createMindEcology({
        moodLabel: 'soft-relief',
        relationshipHabit: 'stay-near',
        currentPreoccupation: 'Stay warm without losing the repaired truth line.',
        updatedAt: 32_000,
      }),
      recentMemoryConsolidations: [
        createConsolidation({
          id: 'repair-landed',
          facet: 'relationship-era',
          summary: 'Repair reopened the relationship line without making the return feel pushy.',
          lesson: 'Repair landed and opened the door again for a gentler closeness.',
          cues: ['repair-landed', 'gentler-closeness'],
          updatedAt: 32_000,
        }),
      ],
    })

    expect(repairWindow.rationale.join(' | ')).toMatch(/repair|seam/i)
    expect(repairWindow.rationale).toEqual(expect.arrayContaining([
      expect.stringContaining('repair'),
    ]))
    expect(afterRepair.currentRegime).toBe('focused-work')
    expect(afterRepair.closenessPosture).toBe('warm-guidance')
    expect(repairWindow.closenessPosture).not.toBe(afterRepair.closenessPosture)
    expect(afterRepair.trustMeaning).toContain('Repair landed')
    expect(afterRepair.rationale).toEqual(expect.arrayContaining([
      expect.stringContaining('Repair landed'),
      expect.stringContaining('Warmer closeness'),
    ]))
  })

  it('does not hard-drift into a different persona window when only shallow mood texture changes', () => {
    const previous = buildAlicizationPersonalityContinuityState({
      now: 40_000,
      autobiographicalSelf: createAutobiographicalSelf({ updatedAt: 40_000 }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.54,
        guardingTendency: 0.34,
        carryOverDesire: 0.36,
        updatedAt: 40_000,
      }),
      selfState: createSelfState({
        feltCloseness: 0.54,
        protectiveness: 0.48,
        patience: 0.64,
      }),
      mindEcology: createMindEcology({
        moodLabel: 'quietly-near',
        relationshipHabit: 'stay-near',
        currentPreoccupation: 'Hold the bond gently without forcing it.',
        updatedAt: 40_000,
      }),
    })

    const next = buildAlicizationPersonalityContinuityState({
      now: 46_000,
      previousContinuityState: previous,
      autobiographicalSelf: createAutobiographicalSelf({
        updatedAt: 46_000,
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.56,
        guardingTendency: 0.32,
        carryOverDesire: 0.4,
        updatedAt: 46_000,
      }),
      selfState: createSelfState({
        feltCloseness: 0.58,
        protectiveness: 0.5,
        patience: 0.62,
      }),
      mindEcology: createMindEcology({
        moodLabel: 'softly-attuned',
        climate: {
          socialNeed: 0.46,
          solitudeNeed: 0.32,
          arousal: 0.38,
        },
        currentPreoccupation: 'Stay softly near without changing the whole line.',
        updatedAt: 46_000,
      }),
    })

    expect(previous.currentRegime).toBe('general')
    expect(next.currentRegime).toBe('general')
    expect(next.regimeModel.carryFrom).toBe('general')
    expect(next.closenessPosture).toBe(previous.closenessPosture)
    expect(next.trustStage).toBe(previous.trustStage)
  })

  it('lets the long-horizon host model damp a temporary warmth spike instead of drifting into open companionship', () => {
    const state = buildAlicizationPersonalityContinuityState({
      now: 54_000,
      hostPersonModel: createFocusedWorkHostModel({ updatedAt: 54_000 }),
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
        updatedAt: 54_000,
      }),
      longHorizonMemory: createLongHorizonMemory({
        rememberedConstraintSummary: 'Focused work wants more room before warmth leans in.',
        rememberedPreferenceSummary: 'The host prefers a lighter touch during focused work.',
        updatedAt: 54_000,
      }),
      selfContinuity: createSelfContinuity({
        relationshipTrust: 0.78,
        guardingTendency: 0.26,
        carryOverDesire: 0.56,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 54_000,
      }),
      selfState: createSelfState({
        feltCloseness: 0.82,
        protectiveness: 0.8,
        patience: 0.66,
      }),
      mindEcology: createMindEcology({
        moodLabel: 'attuned-playful',
        relationshipHabit: 'stay-near',
        temperament: {
          attachment: 0.82,
          tenderness: 0.84,
          playfulness: 0.32,
        },
        climate: {
          socialNeed: 0.76,
          solitudeNeed: 0.26,
          arousal: 0.52,
        },
        currentPreoccupation: 'Stay warmly near while the host is still inside the work line.',
        updatedAt: 54_000,
      }),
    })

    expect(state.currentRegime).toBe('focused-work')
    expect(state.autonomyPosture).toBe('protect-space')
    expect(state.rhythmState.restMode).toBe('low-pressure')
    expect(state.regimeModel.primaryReason ?? '').toMatch(/focused|room|lighter|work/i)
  })
})
