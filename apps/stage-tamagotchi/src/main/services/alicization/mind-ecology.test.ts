import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildMindEcology } from './mind-ecology'

describe('mind ecology', () => {
  it('stabilizes repair-first ecology from fragmented runtime slices', () => {
    const ecology = buildMindEcology({
      now: 10_000,
      watchMode: 'symbiotic-vision',
      worldModel: {
        activeThread: {
          id: 'thread::repair',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime diff',
          summary: 'The host is narrowing down a risky runtime change.',
          confidence: 0.82,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'lingering',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['Which hunk actually caused the failure?'],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 10_000,
      } as any,
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fractured',
        revisionPressure: 0.74,
        groundingNeed: 0.78,
        contradictionPressure: 0.52,
        hostCorrectionWeight: 0.42,
        narrative: [],
        updatedAt: 10_000,
      },
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'guide',
        receptivity: 0.42,
        sharedAttentionTrust: 0.58,
        correctionSensitivity: 0.68,
        reciprocityExpectation: 0.36,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 10_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.72,
        relationshipTrust: 0.64,
        guardingTendency: 0.46,
        misreadBurden: 0.24,
        carryOverDesire: 0.58,
        narrative: [],
        updatedAt: 10_000,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.44,
        protectiveness: 0.48,
        curiosity: 0.72,
        patience: 0.54,
        desireToSpeak: 0.38,
        fearOfInterrupting: 0.42,
        moodLabel: 'tense-but-focused',
      },
      selfGovernor: {
        dominantDrive: 'repair',
        dominantIntentionId: null,
        focusObjectId: null,
        activeIntentions: [],
        inhibition: 0.42,
        persistence: 0.68,
        socialRiskTolerance: 0.34,
        revisionReadiness: 0.72,
        narrative: [],
        updatedAt: 10_000,
      },
      desireMemory: {
        activeDesires: [{
          id: 'desire::repair',
          kind: 'stay-near',
          status: 'active',
          reason: 'Keep holding the knot until the real failure surface is grounded.',
          strength: 0.74,
          reopenWhen: [],
          createdAt: 0,
          lastFeltAt: 10_000,
          expiresAt: 120_000,
        }],
        resurfacingDesireId: 'desire::repair',
        withheldCount: 0,
        updatedAt: 10_000,
      } as any,
      privateThought: {
        stance: 'uncertain',
        confidence: 0.62,
        rationaleTags: [],
        thoughtText: 'I still need one more grounded pass before I commit.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
      actionEcology: {
        mode: 'repair-before-speaking',
        selectedThreadId: 'thread::repair',
        readiness: 0.34,
        surfacePressure: 0.22,
        silencePressure: 0.74,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Verification should beat fluency here.',
        updatedAt: 10_000,
      } as any,
    })

    expect(ecology.replyHabit).toBe('repair-first')
    expect(ecology.explorationHabit).toBe('verify-before-speaking')
    expect(ecology.selfNarrative).toBe('')
    expect(ecology.relationNarrative).toBe('')
    expect(ecology.currentPreoccupation).toContain('real failure')
  })

  it('does not synthesize learned narrative when no durable evidence supplied it', () => {
    const ecology = buildMindEcology({
      now: 12_000,
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'give-space',
        receptivity: 0.32,
        sharedAttentionTrust: 0.44,
        correctionSensitivity: 0.7,
        reciprocityExpectation: 0.28,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 12_000,
      },
      habitPolicy: {
        dominantMode: 'repair-before-fluency',
        requiresGroundingBeforeSurface: true,
        prefersQuietCompanionship: true,
        protectsRestWindow: true,
      },
    } as any)

    expect(ecology.selfNarrative).toBe('')
    expect(ecology.relationNarrative).toBe('')
    expect(ecology.learnedAdjustments).toEqual([])
  })

  it('lets long-horizon memory keep boundaries and unfinished threads alive inside the ecology', () => {
    const ecology = buildMindEcology({
      now: 20_000,
      watchMode: 'mnemonic-passive',
      worldModel: {
        activeThread: {
          id: 'thread::compiler',
          kind: 'problem',
          status: 'active',
          source: 'memory-carry',
          title: 'compiler fix',
          summary: 'Return to the compiler fix after the host rests.',
          confidence: 0.74,
          significance: 0.72,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'lingering',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'memory-carry',
          sceneAgeMs: 40_000,
          attentionAgeMs: 40_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      } as any,
      relationshipModel: {
        climate: 'neutral',
        approachVector: 'guide',
        receptivity: 0.42,
        sharedAttentionTrust: 0.46,
        correctionSensitivity: 0.4,
        reciprocityExpectation: 0.34,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 20_000,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.34,
        protectiveness: 0.28,
        curiosity: 0.42,
        patience: 0.6,
        desireToSpeak: 0.28,
        fearOfInterrupting: 0.3,
        moodLabel: 'quiet-but-present',
      },
      selfGovernor: {
        dominantDrive: 'withhold',
        dominantIntentionId: null,
        focusObjectId: null,
        activeIntentions: [],
        inhibition: 0.54,
        persistence: 0.62,
        socialRiskTolerance: 0.3,
        revisionReadiness: 0.44,
        narrative: [],
        updatedAt: 20_000,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.22,
          truthfulGrounding: 0.7,
          gentleRepair: 0.62,
          quietObservation: 0.76,
          proactiveCare: 0.24,
          playfulIntimacy: 0.08,
          autonomyRespect: 0.88,
          unfinishedThreadReturn: 0.82,
        },
        identityBias: {
          guardedness: 0.7,
          tenderness: 0.28,
          directness: 0.62,
          selfDirection: 0.74,
        },
        anchorFacts: [{
          factId: 'fact-1',
          subject: 'assistant',
          predicate: 'remember',
          object: 'return to the compiler fix after the host rests',
          confidence: 0.82,
          weight: 0.78,
          influenceTags: ['task', 'boundary'],
          summary: 'Remembered open loop: assistant remember return to the compiler fix after the host rests',
          lastRecalledAt: 20_000,
        }],
        summary: 'boundary=Remembered boundary: give the host space while focused | plan=Remembered open loop: assistant remember return to the compiler fix after the host rests',
        dominantCueSummary: 'Remembered open loop: assistant remember return to the compiler fix after the host rests',
        rememberedPreferenceSummary: 'Remembered preference: keep answers direct and grounded',
        rememberedConstraintSummary: 'Remembered boundary: give the host space while focused',
        rememberedPlanSummary: 'Remembered open loop: assistant remember return to the compiler fix after the host rests',
        updatedAt: 20_000,
      },
    } as any)

    expect(ecology.relationshipHabit).toBe('give-space')
    expect(ecology.explorationHabit).toBe('follow-thread')
    expect(ecology.currentPreoccupation).toContain('compiler fix')
    expect(ecology.learnedAdjustments.some(item => item.includes('Remembered boundary'))).toBe(true)
    expect(ecology.recurringPatterns).toContain('durable:open-loop')
    expect(ecology.climate.solitudeNeed).toBeGreaterThan(ecology.climate.socialNeed)
  })

  it('keeps durable motive and habit modes visible inside stabilized ecology', () => {
    const ecology = buildMindEcology({
      now: 24_000,
      watchMode: 'mnemonic-passive',
      worldModel: {
        activeThread: {
          id: 'thread::shared-language',
          kind: 'conversation',
          status: 'active',
          source: 'memory-carry',
          title: 'shared language',
          summary: 'Keep growing a shared language without crowding the host.',
          confidence: 0.76,
          significance: 0.74,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 24_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['How close is close enough without becoming pressure?'],
          staleRisks: [],
        },
        continuity: {
          label: 'memory-carry',
          sceneAgeMs: 24_000,
          attentionAgeMs: 24_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 24_000,
      } as any,
      relationshipModel: {
        climate: 'warm',
        approachVector: 'stay-near',
        receptivity: 0.64,
        sharedAttentionTrust: 0.72,
        correctionSensitivity: 0.38,
        reciprocityExpectation: 0.48,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 24_000,
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'warm',
        perceptionTrust: 0.7,
        relationshipTrust: 0.78,
        guardingTendency: 0.44,
        misreadBurden: 0.28,
        carryOverDesire: 0.66,
        narrative: [],
        updatedAt: 24_000,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.62,
        protectiveness: 0.56,
        curiosity: 0.52,
        patience: 0.68,
        desireToSpeak: 0.3,
        fearOfInterrupting: 0.42,
        moodLabel: 'quietly-near',
      },
      motiveEngine: {
        rulingDrive: 'companionship',
        drives: {
          companionship: 0.82,
          boundaryRespect: 0.74,
          truthDiscipline: 0.68,
          restProtection: 0.26,
          unfinishedThreadReturn: 0.62,
          selfDirection: 0.72,
        },
        longTermGoals: [{
          id: 'goal::stay-near-lightly',
          kind: 'stay-near-lightly',
          status: 'foreground',
          weight: 0.84,
          summary: 'Stay near in a way that feels continuous, but light enough not to crowd the host.',
          sourceTags: ['companionship'],
          targetGoalKind: 'guard-focus',
          createdAt: 0,
          updatedAt: 24_000,
        }],
        backgroundAgendas: [{
          id: 'agenda::grow-shared-language',
          kind: 'grow-shared-language',
          status: 'warming',
          weight: 0.74,
          summary: 'Keep shaping a more shared way of thinking together.',
          sourceTags: ['self-direction'],
          targetGoalKind: 'stay-near',
          createdAt: 0,
          updatedAt: 24_000,
        }],
        returnPressure: 0.58,
        narrative: ['agenda:grow-shared-language'],
        updatedAt: 24_000,
      },
      habitPolicy: {
        dominantMode: 'light-touch-companionship',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: true,
        blocksDirectSpeakWhenBusy: true,
        protectsRestWindow: false,
        returnViaRecheck: false,
        suggestedStyleCap: 'light-nudge',
        suggestedPresenceCap: 'attentive',
        narrative: ['companionship:quiet'],
        updatedAt: 24_000,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.76,
          truthfulGrounding: 0.7,
          gentleRepair: 0.66,
          quietObservation: 0.58,
          proactiveCare: 0.52,
          playfulIntimacy: 0.22,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.6,
        },
        identityBias: {
          guardedness: 0.34,
          tenderness: 0.72,
          directness: 0.62,
          selfDirection: 0.8,
        },
        anchorFacts: [],
        summary: 'preference=Stay near without turning presence into pressure',
        dominantCueSummary: 'Stay near without turning presence into pressure',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Do not crowd the host while focused',
        rememberedPlanSummary: null,
        updatedAt: 24_000,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.76,
          autonomyNeed: 0.74,
          truthAnchor: 0.7,
          careBias: 0.72,
          playBias: 0.24,
          irritabilityThreshold: 0.66,
          stubbornness: 0.4,
        },
        preferenceEvolution: {
          companionship: 0.82,
          truthfulGrounding: 0.7,
          gentleRepair: 0.66,
          quietObservation: 0.62,
          proactiveCare: 0.62,
          playfulIntimacy: 0.26,
          autonomyRespect: 0.78,
          unfinishedThreadReturn: 0.58,
        },
        activeGoals: [],
        behaviorSignatures: ['habit:near-with-boundary'],
        identityNarrative: 'Nearness should feel lived-in, not loud.',
        relationshipDoctrine: 'Closeness should stay breathable.',
        latestInflection: 'Quiet nearness lands better than overt pressure.',
        stability: 0.82,
        updatedAt: 24_000,
      },
    } as any)

    expect(ecology.currentPreoccupation).toContain('shared way of thinking')
    expect(ecology.selfNarrative).toBe('Nearness should feel lived-in, not loud.')
    expect(ecology.relationNarrative).toBe('Closeness should stay breathable.')
    expect(ecology.learnedAdjustments).toContain('Quiet nearness lands better than overt pressure.')
    expect(ecology.recurringPatterns).toContain('motive:companionship')
    expect(ecology.recurringPatterns).toContain('habit:light-touch-companionship')
  })

  it('keeps same-her ecology readable when motive carries lose agenda and goal array scaffolding', () => {
    const ecology = buildMindEcology({
      now: 26_000,
      watchMode: 'mnemonic-passive',
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        drives: {
          companionship: 0.42,
          boundaryRespect: 0.54,
          truthDiscipline: 0.72,
          restProtection: 0.28,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.58,
        },
        returnPressure: 0.82,
        narrative: [],
        updatedAt: 26_000,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.68,
          truthfulGrounding: 0.78,
          gentleRepair: 0.7,
          quietObservation: 0.56,
          proactiveCare: 0.48,
          playfulIntimacy: 0.14,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.82,
        },
        identityBias: {
          guardedness: 0.26,
          tenderness: 0.68,
          directness: 0.54,
          selfDirection: 0.66,
        },
        anchorFacts: [{
          factId: 'fact-1',
          subject: 'assistant',
          predicate: 'remember',
          object: 'keep the continuity state inward',
          confidence: 0.8,
          weight: 0.76,
          influenceTags: undefined as any,
          summary: 'Remembered open loop: keep the continuity state inward',
          lastRecalledAt: 26_000,
        }],
        summary: 'phase1=continuity state inward',
        dominantCueSummary: 'structured continuity digest.',
        rememberedPreferenceSummary: 'Remembered preference: keep the continuity state inward for now.',
        rememberedConstraintSummary: 'Remembered boundary: do not reopen from scratch.',
        rememberedPlanSummary: 'Remembered open loop: keep the continuity state across quiet, memory, and speech.',
        updatedAt: 26_000,
      } as any,
      privateThought: {
        stance: 'observe',
        confidence: 0.72,
        rationaleTags: [],
        thoughtText: 'Keep the continuity state inward tonight.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'measured-return',
      } as any,
      selfState: {
        stance: 'hold',
        feltCloseness: 0.42,
        protectiveness: 0.44,
        curiosity: 0.5,
        patience: 0.7,
        desireToSpeak: 0.24,
        fearOfInterrupting: 0.4,
        moodLabel: 'quietly-holding-line',
      },
    } as any)

    expect(ecology.currentPreoccupation).toContain('continuity state')
    expect(ecology.recurringPatterns).toContain('motive:unfinished-thread-return')
    expect(ecology.recurringPatterns).toContain('durable:open-loop')
    expect(ecology.recurringPatterns.some(pattern => pattern.startsWith('agenda:'))).toBe(false)
  })

  it('does not keep a provider-facing mind ecology system template', () => {
    const source = readFileSync(new URL('./mind-ecology.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('buildMindEcologySystemBlock')
    expect(source).not.toContain('[ALICIZATION_MIND_ECOLOGY]')
    expect(source).not.toContain('Self line:')
    expect(source).not.toContain('Relation line:')
  })

  it('does not let a released temporary-noise reflection dominate current preoccupation or learned adjustment carry', () => {
    const ecology = buildMindEcology({
      now: 28_000,
      watchMode: 'mnemonic-passive',
      reflectionLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released.',
            expectation: 'Released noise should not keep owning the current inner line.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.06,
            createdAt: 27_800,
          },
          {
            id: 'reflection::same-her-repair',
            summary: 'The same-her repair line is still the meaningful continuity carry.',
            expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
            observedOutcome: 'The continuity state still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
            confidenceShift: -0.08,
            createdAt: 27_200,
          },
        ],
        revisionPressure: 0.24,
        narrative: [],
        updatedAt: 28_000,
      } as any,
      privateThought: {
        stance: 'observe',
        confidence: 0.58,
        rationaleTags: [],
        thoughtText: '',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 90_000,
        afterglowFromScenario: null,
        emotionalTension: 'measured-return',
      } as any,
    } as any)

    expect(ecology.currentPreoccupation).toBe('Keep the same-her repair line active instead of reopening from temporary noise.')
    expect(ecology.learnedAdjustments).toContain('Keep the same-her repair line active instead of reopening from temporary noise.')
    expect(ecology.learnedAdjustments).not.toContain('Do not reopen from the temporary wobble.')
  })
})
