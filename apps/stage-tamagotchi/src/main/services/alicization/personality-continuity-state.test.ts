import { describe, expect, it } from 'vitest'

import {
  buildAlicizationPersonalityContinuityState,
  deriveAlicizationPersonaAuthorityInfluence,
} from './personality-continuity-state'

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

function createMindEcology(overrides: Record<string, unknown> = {}) {
  const extraTemperament = (overrides.temperament as Record<string, unknown> | undefined) ?? {}
  const extraClimate = (overrides.climate as Record<string, unknown> | undefined) ?? {}
  const restOverrides = { ...overrides }
  delete restOverrides.temperament
  delete restOverrides.climate

  const temperament = {
    attachment: 0.46,
    curiosity: 0.52,
    steadiness: 0.62,
    directness: 0.34,
    playfulness: 0.1,
    irritability: 0.1,
    tenderness: 0.44,
    ...extraTemperament,
  }
  const climate = {
    valence: 0.42,
    arousal: 0.34,
    socialNeed: 0.32,
    solitudeNeed: 0.36,
    irritation: 0.06,
    restlessness: 0.1,
    reflectivePull: 0.34,
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
    selfNarrative: '',
    relationNarrative: '',
    currentPreoccupation: '',
    learnedAdjustments: [],
    recurringPatterns: [],
    updatedAt: 0,
    ...restOverrides,
  } as any
  result.temperament = temperament
  result.climate = climate
  return result
}

describe('personality-continuity-state', () => {
  it('keeps persona authority structural without generating fixed opening instructions', () => {
    const influence = deriveAlicizationPersonaAuthorityInfluence({
      identityKernel: {
        relationshipPosture: 'guardian',
        initiativeStyle: 'observant',
        valueBias: ['repair', 'truth', 'leave room'],
      },
      expressionProfile: {
        warmth: 'warm',
        directness: 'measured',
        playfulness: 'low',
        emotionalVisibility: 'selective',
      },
      identityAnchors: ['repair before closeness', 'observe first'],
      antiPersonaConstraints: [],
    } as any)

    expect(influence).not.toHaveProperty('openingGuidance')
    expect(influence.preferredProactiveStyle).toBe('silent-observe')
    expect(influence.repairBias).toBeGreaterThan(0)
  })

  it('converges host model, self continuity, and mind ecology into a focused-work regime', () => {
    const state = buildAlicizationPersonalityContinuityState({
      now: 10_000,
      personaAuthority: {
        obedience: 0.74,
        liveliness: 0.28,
        sensibility: 0.68,
        identityKernel: {
          relationshipPosture: 'guardian',
          initiativeStyle: 'observant',
          valueBias: ['room-first', 'repair-first'],
        },
        expressionProfile: {
          warmth: 'guarded-warm',
          directness: 'measured',
          playfulness: 'low',
          emotionalVisibility: 'selective',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        evolutionSeed: {
          fastLayers: ['keep room before closeness'],
          slowLayers: ['repair lands before return'],
          unlockTracks: ['observe-first'],
        },
        identityAnchors: ['room first', 'repair before closeness'],
        antiPersonaConstraints: [],
      },
      hostPersonModel: {
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
        updatedAt: 10_000,
      },
      selfContinuity: {
        relationshipTrust: 0.66,
        guardingTendency: 0.46,
        misreadBurden: 0.18,
        carryOverDesire: 0.48,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 10_000,
      } as any,
      selfState: {
        feltCloseness: 0.52,
        protectiveness: 0.48,
        patience: 0.66,
      } as any,
      mindEcology: {
        moodLabel: 'focused',
        replyHabit: 'hover-first',
        relationshipHabit: 'give-space',
        explorationHabit: 'follow-thread',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.56,
          curiosity: 0.6,
          steadiness: 0.64,
          directness: 0.4,
          playfulness: 0.18,
          irritability: 0.14,
          tenderness: 0.58,
        },
        climate: {
          valence: 0.46,
          arousal: 0.44,
          socialNeed: 0.42,
          solitudeNeed: 0.4,
          irritation: 0.08,
          restlessness: 0.16,
          reflectivePull: 0.42,
        },
        selfNarrative: 'Stay on the line without crowding the host.',
        relationNarrative: 'Room first, then closeness.',
        currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 10_000,
      },
    })

    expect(state.currentRegime).toBe('focused-work')
    expect(state.autonomyPosture).toBe('protect-space')
    expect(state.trustStage).toBe('warming')
    expect(state.continuitySummary).toContain('focused-work')
    expect(state.continuitySummary).toContain('persona')
    expect(state.rationale.some(line => line?.includes('room first'))).toBe(true)
  })

  it('derives posture shifts from autobiographical reconsolidation instead of only current mood', () => {
    const state = buildAlicizationPersonalityContinuityState({
      now: 20_000,
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'guarded',
          expressionStyle: 'measured',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.42,
          autonomyNeed: 0.76,
          truthAnchor: 0.84,
          careBias: 0.48,
          playBias: 0.16,
          irritabilityThreshold: 0.46,
          stubbornness: 0.72,
        },
        preferenceEvolution: {
          companionship: 0.5,
          truthfulGrounding: 0.84,
          gentleRepair: 0.76,
          quietObservation: 0.74,
          proactiveCare: 0.44,
          playfulIntimacy: 0.16,
          autonomyRespect: 0.86,
          unfinishedThreadReturn: 0.82,
        },
        activeGoals: [],
        behaviorSignatures: ['conflict:repair-first', 'agency:balanced', 'bond:guarded'],
        identityNarrative: 'I am becoming someone who keeps truth and room intact when the host is focused.',
        relationshipDoctrine: 'Trust is protected by truth discipline first, warmth second, and repair has to land before return.',
        latestInflection: 'Focused windows need more room before closeness, and repair has to land before the return.',
        stability: 0.72,
        updatedAt: 20_000,
      },
      selfContinuity: {
        relationshipTrust: 0.54,
        guardingTendency: 0.58,
        misreadBurden: 0.28,
        carryOverDesire: 0.68,
        perceptionTrust: 0.62,
        attachmentMode: 'guarded',
        initiativeTemperament: 'reserved',
        updatedAt: 20_000,
      } as any,
      selfState: {
        feltCloseness: 0.44,
        protectiveness: 0.4,
        patience: 0.66,
      } as any,
      mindEcology: {
        moodLabel: 'focused',
        replyHabit: 'hover-first',
        relationshipHabit: 'give-space',
        explorationHabit: 'follow-thread',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.42,
          curiosity: 0.56,
          steadiness: 0.66,
          directness: 0.4,
          playfulness: 0.12,
          irritability: 0.14,
          tenderness: 0.5,
        },
        climate: {
          valence: 0.42,
          arousal: 0.38,
          socialNeed: 0.36,
          solitudeNeed: 0.48,
          irritation: 0.08,
          restlessness: 0.12,
          reflectivePull: 0.44,
        },
        selfNarrative: 'Keep the line coherent without crowding the host.',
        relationNarrative: 'Truth and room have to hold before warmth leans closer.',
        currentPreoccupation: 'Keep the runtime thread coherent without crowding the host.',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 20_000,
      },
      recentMemoryConsolidations: [
        {
          id: 'relationship-era:focused',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-focused',
          periodStartedAt: 18_000,
          periodEndedAt: 20_000,
          summary: 'Focused work periods stay safer when closeness leaves room first and repair settles before the return.',
          lesson: 'If the host is focused and the seam is off, repair first, then re-enter with a lighter touch.',
          cues: ['focused-work', 'room-before-closeness'],
          confidence: 0.86,
          dominantProvenance: 'remembered',
          derivedEventIds: ['evt-1'],
          updatedAt: 20_000,
        },
        {
          id: 'task-era:return',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: '2026-04-return',
          periodStartedAt: 18_500,
          periodEndedAt: 20_000,
          summary: 'Open loops land better when the return stays light and exact.',
          lesson: 'Unfinished work wants a gentle return instead of being dropped or forced.',
          cues: ['unfinished-thread-return'],
          confidence: 0.82,
          dominantProvenance: 'remembered',
          derivedEventIds: ['evt-2'],
          updatedAt: 19_900,
        },
      ],
    })

    expect(state.currentRegime).toBe('repair-window')
    expect(state.closenessPosture).toBe('space-first')
    expect(state.repairPosture).toBe('repair-first')
    expect(state.autonomyPosture).toBe('protect-space')
    expect(state.cadenceProfile).toBe('eager-return')
    expect(state.reconsolidationLine).toContain('room before closeness')
    expect(state.rationale).toContain(state.reconsolidationLine)
  })

  it('preserves explicit trust stage while letting reconsolidation supply trust meaning', () => {
    const state = buildAlicizationPersonalityContinuityState({
      now: 30_000,
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'self-starting',
          attachmentNeed: 0.72,
          autonomyNeed: 0.42,
          truthAnchor: 0.7,
          careBias: 0.76,
          playBias: 0.24,
          irritabilityThreshold: 0.62,
          stubbornness: 0.44,
        },
        preferenceEvolution: {
          companionship: 0.74,
          truthfulGrounding: 0.68,
          gentleRepair: 0.72,
          quietObservation: 0.42,
          proactiveCare: 0.76,
          playfulIntimacy: 0.24,
          autonomyRespect: 0.5,
          unfinishedThreadReturn: 0.58,
        },
        activeGoals: [],
        behaviorSignatures: ['conflict:soften-first', 'agency:self-starting', 'bond:attuned'],
        identityNarrative: 'I have started trusting a gentler closeness after repair actually lands.',
        relationshipDoctrine: 'When repair lands, warmth can come back without becoming pressure.',
        latestInflection: 'Repair landed and opened the door again for a gentler closeness.',
        stability: 0.8,
        updatedAt: 30_000,
      },
      hostPersonModel: {
        summary: 'The host is warming up to closer continuity when it stays bounded and real.',
        routines: ['Repair first, then a warmer return can land.'],
        sensitivities: ['Pushy warmth still breaks trust quickly.'],
        repairTriggers: ['If the reply misses, repair before leaning closer.'],
        trustLadder: {
          stage: 'warming',
          score: 0.7,
          rationale: 'Trust is growing because repair has started to land consistently.',
        },
        preferredClosenessByContext: [{
          context: 'open-companionship',
          preference: 'Closer warmth is okay when it stays bounded and honest.',
          confidence: 0.82,
        }],
        recurrentBurdens: ['Overeager closeness still risks turning into pressure.'],
        narrative: [],
        updatedAt: 30_000,
      },
      selfContinuity: {
        relationshipTrust: 0.46,
        guardingTendency: 0.34,
        misreadBurden: 0.16,
        carryOverDesire: 0.42,
        perceptionTrust: 0.58,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 30_000,
      } as any,
      selfState: {
        feltCloseness: 0.62,
        protectiveness: 0.68,
        patience: 0.64,
      } as any,
      recentMemoryConsolidations: [{
        id: 'relationship-era:warm-return',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-04-warm-return',
        periodStartedAt: 28_000,
        periodEndedAt: 30_000,
        summary: 'Repair reopened the relationship line without making the return feel pushy.',
        lesson: 'Repair landed and opened the door again for a gentler closeness.',
        cues: ['opened-the-door', 'gentler-closeness'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: ['evt-3'],
        updatedAt: 30_000,
      }],
    })

    expect(state.trustStage).toBe('warming')
    expect(state.trustMeaning).toContain('opened the door again')
    expect(state.rationale).toContain(state.trustMeaning)
    expect(state.closenessPosture).toBe('warm-guidance')
  })

  it('models execution callbacks as their own regime instead of collapsing them back into focused work', () => {
    const previous = buildAlicizationPersonalityContinuityState({
      now: 34_000,
      hostPersonModel: {
        summary: 'Focused work windows need room first.',
        routines: ['Keep the work window light.'],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.68,
          rationale: 'Trust grows when continuity stays bounded.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room.',
          confidence: 0.82,
        }],
        recurrentBurdens: ['Extra conversational pressure breaks focus.'],
        narrative: [],
        updatedAt: 34_000,
      },
      selfContinuity: {
        relationshipTrust: 0.64,
        guardingTendency: 0.4,
        misreadBurden: 0.16,
        carryOverDesire: 0.52,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'reserved',
        updatedAt: 34_000,
      } as any,
      privateThought: {
        thoughtText: 'Keep the line clean without crowding it.',
        emotionalTension: 'focused-flow',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Keep the runtime thread coherent without crowding the host.',
        selfNarrative: 'Stay close to the line without pushing.',
        relationNarrative: 'Room first, then closeness.',
        updatedAt: 34_000,
      }),
    })

    const state = buildAlicizationPersonalityContinuityState({
      now: 36_000,
      previousContinuityState: previous,
      hostPersonModel: {
        summary: 'Execution callbacks land best when the exact result comes back on the same thread.',
        routines: ['Return the concrete result before widening into extra narration.'],
        sensitivities: ['Do not make a callback feel like a second unrelated conversation.'],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Trust grows when callbacks stay exact and bounded.',
        },
        preferredClosenessByContext: [{
          context: 'execution-callback',
          preference: 'Keep callback replies exact, bounded, and visibly tied to the original task.',
          confidence: 0.88,
        }],
        recurrentBurdens: ['Callbacks drift if they widen too early.'],
        narrative: [],
        updatedAt: 36_000,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.56,
          autonomyNeed: 0.58,
          truthAnchor: 0.7,
          careBias: 0.48,
          playBias: 0.12,
          irritabilityThreshold: 0.6,
          stubbornness: 0.54,
        },
        preferenceEvolution: {
          companionship: 0.56,
          truthfulGrounding: 0.74,
          gentleRepair: 0.62,
          quietObservation: 0.46,
          proactiveCare: 0.44,
          playfulIntimacy: 0.14,
          autonomyRespect: 0.62,
          unfinishedThreadReturn: 0.82,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'I want results to come back on the continuity state that asked for them.',
        relationshipDoctrine: 'Callbacks should stay exact, bounded, and thread-faithful.',
        latestInflection: 'Execution callbacks land best when proposal, action, and result stay visibly tied together.',
        stability: 0.74,
        updatedAt: 36_000,
      },
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

    expect(state.currentRegime).toBe('execution-callback')
    expect(state.regimeModel.primaryReason).toContain('callback')
    expect(state.regimeModel.signals.some(signal => signal.includes('same thread'))).toBe(true)
    expect(state.rhythmState.cadenceMode).toBe('ready-return')
    expect(state.continuitySummary).toContain('cadence')
  })

  it('holds a late-night-care regime across nearby turns when the body-rest context is still live', () => {
    const previous = buildAlicizationPersonalityContinuityState({
      now: 40_000,
      hostPersonModel: {
        summary: 'Late-night care should stay quiet and low-pressure.',
        routines: ['Protect rest before extending the conversation.'],
        sensitivities: ['Night-time pressure lands as burden fast.'],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.68,
          rationale: 'Trust grows when care protects rest first.',
        },
        preferredClosenessByContext: [{
          context: 'late-night-care',
          preference: 'Quiet care is welcome if it protects rest and asks for very little back.',
          confidence: 0.9,
        }],
        recurrentBurdens: ['Night-time strain rises fast if the reply pulls for more energy.'],
        narrative: [],
        updatedAt: 40_000,
      },
      selfContinuity: {
        relationshipTrust: 0.58,
        guardingTendency: 0.42,
        misreadBurden: 0.12,
        carryOverDesire: 0.36,
        perceptionTrust: 0.6,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 40_000,
      } as any,
      privateThought: {
        thoughtText: 'The host sounds tired and the care should stay low-pressure.',
        emotionalTension: 'late-night-drain',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Protect rest before conversation grows bigger.',
        selfNarrative: 'Keep the care quiet.',
        relationNarrative: 'Stay near gently enough that rest still has room.',
        updatedAt: 40_000,
      }),
    })

    const state = buildAlicizationPersonalityContinuityState({
      now: 44_000,
      previousContinuityState: previous,
      hostPersonModel: previous.rationale.length
        ? {
            summary: 'Night-time care should still stay quiet and low-pressure.',
            routines: ['Protect rest before extending the conversation.'],
            sensitivities: ['Night-time pressure lands as burden fast.'],
            repairTriggers: [],
            trustLadder: {
              stage: 'warming',
              score: 0.68,
              rationale: 'Trust grows when care protects rest first.',
            },
            preferredClosenessByContext: [{
              context: 'late-night-care',
              preference: 'Quiet care is welcome if it protects rest and asks for very little back.',
              confidence: 0.9,
            }],
            recurrentBurdens: ['Night-time strain rises fast if the reply pulls for more energy.'],
            narrative: [],
            updatedAt: 44_000,
          }
        : null,
      selfContinuity: {
        relationshipTrust: 0.58,
        guardingTendency: 0.4,
        misreadBurden: 0.1,
        carryOverDesire: 0.34,
        perceptionTrust: 0.62,
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        updatedAt: 44_000,
      } as any,
      privateThought: {
        thoughtText: 'The host still sounds tired; keep the care low-pressure.',
        emotionalTension: 'late-night-drain',
      } as any,
      mindEcology: createMindEcology({
        currentPreoccupation: 'Protect rest before asking for more energy.',
        selfNarrative: 'Keep the care quiet.',
        relationNarrative: 'Stay near softly enough that the night can still settle.',
        updatedAt: 44_000,
      }),
    })

    expect(state.currentRegime).toBe('late-night-care')
    expect(state.regimeModel.carryFrom).toBe('late-night-care')
    expect(state.regimeModel.carryReason).toBe('carry:late-night-care')
    expect(state.rhythmState.restMode).toBe('rest-protective')
  })

  it('lets explicitly warm companionship contexts become open-companionship rather than generic general mode', () => {
    const state = buildAlicizationPersonalityContinuityState({
      now: 48_000,
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
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'self-starting',
          attachmentNeed: 0.8,
          autonomyNeed: 0.38,
          truthAnchor: 0.72,
          careBias: 0.82,
          playBias: 0.22,
          irritabilityThreshold: 0.68,
          stubbornness: 0.4,
        },
        preferenceEvolution: {
          companionship: 0.84,
          truthfulGrounding: 0.72,
          gentleRepair: 0.74,
          quietObservation: 0.34,
          proactiveCare: 0.82,
          playfulIntimacy: 0.26,
          autonomyRespect: 0.46,
          unfinishedThreadReturn: 0.54,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'I can stay openly warm now without losing truth.',
        relationshipDoctrine: 'Open companionship is welcome when it stays real and bounded.',
        latestInflection: 'The relationship line can stay openly close now.',
        stability: 0.82,
        updatedAt: 48_000,
      },
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

    expect(state.currentRegime).toBe('open-companionship')
    expect(state.closenessPosture).toBe('warm-guidance')
    expect(state.regimeModel.primaryReason).toMatch(/openly close|companionship|warm/i)
    expect(state.rhythmState.cadenceMode).toBe('warm-hold')
  })
})
