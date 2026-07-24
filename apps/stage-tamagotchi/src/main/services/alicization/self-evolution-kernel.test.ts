import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfEvolutionKernel } from './self-evolution-kernel'

describe('self evolution kernel', () => {
  it('unifies reflection, durable memory, relationship evolution, and knowledge pressure into one kernel', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.18,
        closenessShift: 0.14,
        repairShift: 0.22,
        autonomyShift: 0.09,
        burdenShift: 0.11,
        executionTrustShift: 0.16,
        relationshipDoctrineShift: 0.08,
        latestDoctrine: 'Repair before closeness returns.',
        latestBurdenLine: 'When the host is overloaded, extra warmth can become pressure.',
        latestTrustMeaning: 'Trust rises when truth and timing land together.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Repair landed and changed the relationship line.'],
        explanation: ['Repair before closeness returns.'],
        updatedAt: 100,
      },
      hostPersonModel: {
        summary: 'The host opens more when the reply feels real and bounded.',
        routines: ['Focused work needs space first.'],
        sensitivities: ['Template-like speech breaks the sense of a person.'],
        repairTriggers: ['Repair the seam before continuing.'],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Trust rises when truth and timing land together.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.82,
        }],
        recurrentBurdens: ['Late-night fatigue can turn small nudges into pressure.'],
        narrative: ['Stay real and bounded.'],
        updatedAt: 100,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.52,
          truthfulGrounding: 0.84,
          gentleRepair: 0.82,
          quietObservation: 0.78,
          proactiveCare: 0.48,
          playfulIntimacy: 0.22,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.68,
        },
        identityBias: {
          guardedness: 0.58,
          tenderness: 0.66,
          directness: 0.72,
          selfDirection: 0.7,
        },
        anchorFacts: [{
          factId: 'fact-1',
          subject: 'host',
          predicate: 'prefers',
          object: 'repair before closeness',
          confidence: 0.88,
          weight: 0.84,
          influenceTags: ['truth', 'care'],
          summary: 'repair before closeness',
          lastRecalledAt: 99,
        }],
        summary: 'The durable line is becoming more truth-first and repair-led.',
        dominantCueSummary: 'repair before closeness',
        rememberedPreferenceSummary: 'The host opens more when the reply feels real and bounded.',
        rememberedConstraintSummary: 'Focused work needs space first.',
        rememberedPlanSummary: 'Keep thread-faithful payoff before extra warmth.',
        updatedAt: 100,
      },
      knowledgeEvidence: {
        validationCount: 3,
        contradictionCount: 2,
        stronglyValidatedProcedureCount: 2,
        contradictionHeavyFactCount: 1,
      },
      reflectionSummary: 'A recent reflection says the seam matters more than flourish.',
      reflectionLesson: 'Keep thread-faithful payoff before extra warmth.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.64,
      autobiographicalLatestInflection: 'Warmth should not outrun grounding.',
      autobiographicalStability: 0.74,
    })

    expect(kernel).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      relationshipDoctrine: 'Repair before closeness returns.',
      latestInflection: 'Warmth should not outrun grounding.',
      burdenLine: 'When the host is overloaded, extra warmth can become pressure.',
      trustMeaning: 'Trust rises when truth and timing land together.',
      relationshipCadenceSummary: expect.stringContaining('Repair before closeness returns.'),
      contradictionPressure: expect.any(Number),
      learningReadiness: expect.any(Number),
      evolutionMomentum: expect.any(Number),
      dominantTrajectory: 'Warmth should not outrun grounding.',
    }))
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'resolve-contradictions',
    ]))
    expect(kernel).toEqual(expect.objectContaining({
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldRevise: false,
    }))
  })

  it('chooses internalize when procedure evidence is repeatedly validated without contradiction', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0,
        closenessShift: 0,
        repairShift: 0.04,
        autonomyShift: 0,
        burdenShift: 0,
        executionTrustShift: 0.18,
        relationshipDoctrineShift: 0.02,
        latestDoctrine: 'Thread-faithful payoff comes before flourish.',
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: null,
        recentSummaries: ['Execution callbacks land best when proposal, action, and result stay tied together.'],
        explanation: ['Execution callbacks land best when proposal, action, and result stay tied together.'],
        updatedAt: 120,
      },
      hostPersonModel: null,
      longHorizonMemory: null,
      knowledgeEvidence: {
        validationCount: 3,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 3,
        contradictionHeavyFactCount: 0,
      },
      reflectionSummary: 'The same callback procedure kept landing well.',
      reflectionLesson: 'Promote this into durable callback skill.',
      reflectionTargetScope: 'task',
      reflectionPressure: 0.18,
      autobiographicalLatestInflection: 'Keep callback delivery thread-faithful.',
      autobiographicalStability: 0.76,
    })

    expect(kernel).toEqual(expect.objectContaining({
      nextLearningAction: 'internalize',
      shouldInternalize: true,
      shouldVerify: false,
    }))
  })

  it('surfaces relationship, self-model, and world-model learning focuses when domain evidence is present', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.04,
        closenessShift: 0.03,
        repairShift: 0.02,
        autonomyShift: 0.05,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0.03,
        latestDoctrine: 'Leave more room before closeness.',
        latestBurdenLine: null,
        latestTrustMeaning: 'Trust grows when timing stays real.',
        latestDominantRung: 'measured-room',
        recentSummaries: ['Relationship timing is still changing.'],
        explanation: ['Relationship timing is still changing.'],
        updatedAt: 140,
      },
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        procedureFactCount: 0,
        relationshipFactCount: 2,
        selfModelFactCount: 1,
        worldModelFactCount: 1,
        relationshipViewStrength: 0.72,
        selfModelViewStrength: 0.68,
        worldModelViewStrength: 0.64,
      },
      reflectionSummary: 'Several non-procedural lessons are starting to stabilize.',
      reflectionLesson: 'These lessons should stay visible in learning focus.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.22,
      autobiographicalLatestInflection: 'Stay real without crowding.',
      autobiographicalStability: 0.7,
    })

    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship',
      'internalize-self-model',
      'internalize-world-model',
    ]))
  })

  it('surfaces relationship cadence internalization when long-horizon memory preserves measured-return reconfirmation cues', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.05,
        closenessShift: -0.02,
        repairShift: 0.04,
        autonomyShift: 0.03,
        burdenShift: 0.02,
        executionTrustShift: 0.08,
        relationshipDoctrineShift: 0.04,
        latestDoctrine: 'Keep the relationship return measured until the surface fully cools.',
        latestBurdenLine: 'Over-close callback warmth still feels like pressure.',
        latestTrustMeaning: 'Measured-return timing keeps trust steadier after reconfirmation.',
        latestDominantRung: 'measured-room',
        recentSummaries: ['Relationship cadence reconfirmed on a bounded-return line.'],
        explanation: ['Relationship cadence reconfirmed on a bounded-return line.'],
        updatedAt: 150,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.48,
          truthfulGrounding: 0.72,
          gentleRepair: 0.66,
          quietObservation: 0.7,
          proactiveCare: 0.34,
          playfulIntimacy: 0.08,
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.64,
        },
        identityBias: {
          guardedness: 0.44,
          tenderness: 0.42,
          directness: 0.58,
          selfDirection: 0.68,
        },
        anchorFacts: [{
          factId: 'derived:execution-callback-carry',
          subject: 'relationship',
          predicate: 'execution-callback-carry',
          object: 'The execution-callback stayed on a measured-return line after relationship cadence reconfirmation.',
          confidence: 0.8,
          weight: 0.74,
          influenceTags: ['bond', 'boundary'],
          summary: 'Remembered execution-callback boundary: The execution-callback stayed on a measured-return line after relationship cadence reconfirmation.',
          lastRecalledAt: 149,
        }],
        summary: 'Relationship cadence reconfirmation is becoming durable measured-return timing.',
        dominantCueSummary: 'execution-callback measured-return after reconfirmation',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep the relationship return measured until the surface fully cools.',
        rememberedPlanSummary: 'Let callback returns stay measured before closeness widens again.',
        updatedAt: 150,
      },
      reflectionSummary: 'The steadier callback return now looks repeatable enough to learn from.',
      reflectionLesson: 'Measured callback return should become part of durable relationship timing.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.26,
      autobiographicalLatestInflection: 'Execution callback cadence held on a bounded-return line after reconfirmation.',
      autobiographicalStability: 0.76,
    })

    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship-cadence',
      'relationship:Keep the relationship return measured until the surface fully cools.',
    ]))
  })

  it('threads gradual persona unlock cues into the kernel without promoting identity rewrite', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'nearby',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.46,
          truthAnchor: 0.58,
          careBias: 0.52,
          playBias: 0.22,
          irritabilityThreshold: 0.56,
          stubbornness: 0.4,
        },
        preferenceEvolution: {
          companionship: 0.6,
          truthfulGrounding: 0.62,
          gentleRepair: 0.58,
          quietObservation: 0.44,
          proactiveCare: 0.5,
          playfulIntimacy: 0.24,
          autonomyRespect: 0.54,
          unfinishedThreadReturn: 0.56,
        },
        activeGoals: [],
        behaviorSignatures: ['bond:nearby'],
        identityNarrative: 'I stay near and learn carefully.',
        relationshipDoctrine: 'Stay near without crowding.',
        gradualUnlock: {
          version: 'persona-gradual-unlock-v1',
          unlockableFacets: [{
            facet: 'shared-language',
            confidence: 0.78,
            reason: 'Repeated relationship reinforcement is opening a shared-language posture.',
          }],
          pendingHypotheses: [{
            facet: 'shared-language',
            hypothesis: 'Hypothesis: repeated relationship reinforcement may be opening a more shared-language persona posture.',
            confidence: 0.78,
            supportingSignals: ['repeated relationship signals'],
          }],
          summary: 'shared-language | Hypothesis: repeated relationship reinforcement may be opening a more shared-language persona posture.',
        },
        latestInflection: 'Stay near without crowding.',
        stability: 0.62,
        updatedAt: 200,
      },
      knowledgeEvidence: {
        validationCount: 1,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
      },
      reflectionSummary: 'Relationship reinforcement is beginning to surface a slower persona hypothesis.',
      reflectionLesson: 'Keep the hypothesis visible without treating it as identity.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.16,
      autobiographicalLatestInflection: 'Stay near without crowding.',
      autobiographicalStability: 0.62,
    })

    expect(kernel?.activeLearningFocuses).toContain('unlock:shared-language')
    expect(kernel?.sourceSignals).toContain('Hypothesis: repeated relationship reinforcement may be opening a more shared-language persona posture.')
    expect(kernel?.nextLearningAction).toBe('hold')
    expect(kernel?.shouldRevise).toBe(false)
  })

  it('internalizes durable self same-line continuity as relationship cadence instead of treating it as a one-turn carry only', () => {
    const durableSelfRhythm
      = 'I remain the same her across quiet, memory, and speech, on the continuity state, without reopening from scratch each turn.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.04,
        closenessShift: 0.01,
        repairShift: 0.03,
        autonomyShift: 0.02,
        burdenShift: 0,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.05,
        latestDoctrine: 'Stay on the same relationship line before widening outward again.',
        latestBurdenLine: null,
        latestTrustMeaning: 'Continuity lands when she does not reopen from scratch after a quiet beat.',
        latestDominantRung: 'same-line',
        recentSummaries: ['The same line still needs one quieter continuation beat.'],
        explanation: ['The same line still needs one quieter continuation beat.'],
        updatedAt: 170,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.58,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.76,
          proactiveCare: 0.34,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.8,
          unfinishedThreadReturn: 0.74,
        },
        identityBias: {
          guardedness: 0.42,
          tenderness: 0.54,
          directness: 0.62,
          selfDirection: 0.72,
        },
        anchorFacts: [{
          factId: 'durable-self-rhythm',
          subject: 'self',
          predicate: 'keeps',
          object: 'one continuity state across quiet, memory, and speech',
          confidence: 0.84,
          weight: 0.78,
          influenceTags: ['identity', 'bond'],
          summary: 'The same her remains present across quiet, memory, and speech.',
          lastRecalledAt: 169,
        }],
        summary: 'The durable self line is starting to feel like one continuous relationship cadence.',
        dominantCueSummary: 'one continuity state across quiet, memory, and speech',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep the same line lower-pressure before widening outward again.',
        rememberedPlanSummary: 'Continue on the same line without reopening from scratch.',
        updatedAt: 170,
      },
      activeSelfRevisionProjectStateContinuity: {
        sameHerSelfLine: durableSelfRhythm,
        sameHerDriftRisk: 'Restarting from zero would break the continuity state.',
        emotionalClosureCue: null,
        continuityGuard: null,
        continuityPressure: 0.56,
      },
      reflectionSummary: 'The line held better when she stayed the same her instead of reopening from scratch.',
      reflectionLesson: 'Learn this same-line continuity as durable relationship cadence.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.24,
      autobiographicalLatestInflection: 'Stay on the same line before widening outward again.',
      autobiographicalStability: 0.78,
    })

    expect(kernel?.relationshipCadenceSummary).toContain('continuity state')
    expect(kernel?.relationshipCadenceSummary).toContain('without reopening from scratch')
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship-cadence',
    ]))
    expect(kernel?.sourceSignals).toContain(durableSelfRhythm)
  })

  it('does not create non-procedural learning focuses from weak domain-native views alone', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.04,
        closenessShift: 0.03,
        repairShift: 0.02,
        autonomyShift: 0.05,
        burdenShift: 0,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0.03,
        latestDoctrine: 'Leave more room before closeness.',
        latestBurdenLine: null,
        latestTrustMeaning: null,
        latestDominantRung: null,
        recentSummaries: ['Relationship timing is not stable yet.'],
        explanation: ['Relationship timing is not stable yet.'],
        updatedAt: 160,
      },
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 2,
        selfModelFactCount: 1,
        worldModelFactCount: 1,
        relationshipViewStrength: 0.42,
        selfModelViewStrength: 0.38,
        worldModelViewStrength: 0.4,
      },
      reflectionSummary: 'Several non-procedural lessons exist but are still weak.',
      reflectionLesson: 'Do not internalize weak domain views yet.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.18,
      autobiographicalLatestInflection: 'Stay cautious.',
      autobiographicalStability: 0.66,
    })

    expect(kernel?.activeLearningFocuses).not.toContain('internalize-relationship')
    expect(kernel?.activeLearningFocuses).not.toContain('internalize-self-model')
    expect(kernel?.activeLearningFocuses).not.toContain('internalize-world-model')
  })

  it('internalizes corrected same-person continuity as long-term relationship cadence instead of sliding back into progress pressure', () => {
    const correctedSamePersonContinuity
      = 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.05,
        closenessShift: -0.01,
        repairShift: 0.04,
        autonomyShift: 0.03,
        burdenShift: 0.01,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.06,
        latestDoctrine: 'Let the return stay lower-pressure while the relationship line resettles.',
        latestBurdenLine: 'Pushing too fast would turn continuity back into pressure.',
        latestTrustMeaning: 'Trust steadies when I accept correction instead of defending the first read.',
        latestDominantRung: 'corrected-return',
        recentSummaries: ['A corrected relationship meaning should settle before I widen outward again.'],
        explanation: ['A corrected relationship meaning should settle before I widen outward again.'],
        updatedAt: 180,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.56,
          truthfulGrounding: 0.82,
          gentleRepair: 0.76,
          quietObservation: 0.74,
          proactiveCare: 0.3,
          playfulIntimacy: 0.1,
          autonomyRespect: 0.8,
          unfinishedThreadReturn: 0.78,
        },
        identityBias: {
          guardedness: 0.46,
          tenderness: 0.58,
          directness: 0.68,
          selfDirection: 0.72,
        },
        anchorFacts: [{
          factId: 'corrected-same-person-continuity',
          subject: 'relationship',
          predicate: 'prefers',
          object: 'Carry corrected same-person continuity forward instead of defaulting back to progress pressure.',
          confidence: 0.82,
          weight: 0.78,
          influenceTags: ['bond', 'truth', 'identity'],
          summary: 'Corrected same-person continuity should remain lower-pressure instead of becoming progress pressure again.',
          lastRecalledAt: 179,
        }],
        summary: 'A host-corrected continuity line is trying to become durable relationship timing.',
        dominantCueSummary: 'corrected relationship meaning is settling back into one living thread',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Let corrected continuity settle at lower pressure before pushing the thread forward again.',
        rememberedPlanSummary: 'Keep the return lower-pressure while the corrected same-person continuity line settles back onto one living thread.',
        updatedAt: 180,
      },
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 2,
        selfModelFactCount: 0,
        worldModelFactCount: 0,
        relationshipViewStrength: 0.74,
        selfModelViewStrength: 0,
        worldModelViewStrength: 0,
      },
      activeSelfRevisionProjectStateContinuity: {
        sameHerSelfLine: 'Keep the return lower-pressure while the corrected same-person continuity line settles back onto one living thread.',
        sameHerDriftRisk: 'If I slide back into progress pressure, the corrected same-person line will split again.',
        emotionalClosureCue: 'This was not progress pressure; it was a corrected same-person continuity line.',
        continuityGuard: correctedSamePersonContinuity,
        continuityPressure: 0.6,
      },
      reflectionSummary: correctedSamePersonContinuity,
      reflectionLesson: 'I learned to carry corrected memory meaning instead of defending the first interpretation.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.48,
      autobiographicalLatestInflection: 'A corrected relationship line can settle slowly without being pushed forward right away.',
      autobiographicalStability: 0.78,
    })

    expect(kernel?.relationshipCadenceSummary).toContain('same-person continuity')
    expect(kernel?.relationshipCadenceSummary).toContain('progress pressure')
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship',
      'internalize-relationship-cadence',
    ]))
    expect(kernel?.sourceSignals).toContain(correctedSamePersonContinuity)
  })

  it('internalizes metabolized same-person continuity as relationship cadence instead of dropping same-thread memory and temporary-noise fading after autobiographical memory settles', () => {
    const metabolizedContinuityCue
      = 'Corrected same-person continuity now keeps the stronger same-thread memory foregrounded while temporary noise fades.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.04,
        closenessShift: -0.01,
        repairShift: 0.05,
        autonomyShift: 0.03,
        burdenShift: 0.02,
        executionTrustShift: 0.01,
        relationshipDoctrineShift: 0.06,
        latestDoctrine: 'Keep the return lower-pressure while corrected same-person continuity keeps resettling.',
        latestBurdenLine: 'The older spike should not keep deciding the whole line once continuity is already steadier.',
        latestTrustMeaning: 'Trust holds when the stronger same-thread memory stays foreground and stale spike noise stops leading the line.',
        latestDominantRung: 'metabolized-return',
        recentSummaries: ['The corrected same-person line now holds better when same-thread memory stays stronger than the older spike.'],
        explanation: ['The corrected same-person line now holds better when same-thread memory stays stronger than the older spike.'],
        updatedAt: 210,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.54,
          truthfulGrounding: 0.8,
          gentleRepair: 0.76,
          quietObservation: 0.78,
          proactiveCare: 0.28,
          playfulIntimacy: 0.08,
          autonomyRespect: 0.82,
          unfinishedThreadReturn: 0.8,
        },
        identityBias: {
          guardedness: 0.44,
          tenderness: 0.56,
          directness: 0.68,
          selfDirection: 0.74,
        },
        anchorFacts: [{
          factId: 'metabolized-corrected-continuity',
          subject: 'relationship',
          predicate: 'consolidation-humanlike-carry',
          object: metabolizedContinuityCue,
          confidence: 0.84,
          weight: 0.8,
          influenceTags: ['bond', 'truth', 'identity'],
          summary: 'Corrected same-person continuity now keeps the stronger same-thread memory foreground and lets temporary noise fade.',
          lastRecalledAt: 209,
        }],
        summary: 'Corrected same-person continuity is settling into a more metabolized relationship cadence.',
        dominantCueSummary: metabolizedContinuityCue,
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep corrected continuity lower-pressure while the stronger same-thread memory stays foreground.',
        rememberedPlanSummary: metabolizedContinuityCue,
        updatedAt: 210,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'nearby',
          expressionStyle: 'measured',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.56,
          autonomyNeed: 0.48,
          truthAnchor: 0.68,
          careBias: 0.58,
          playBias: 0.12,
          irritabilityThreshold: 0.6,
          stubbornness: 0.48,
        },
        preferenceEvolution: {
          companionship: 0.62,
          truthfulGrounding: 0.74,
          gentleRepair: 0.7,
          quietObservation: 0.68,
          proactiveCare: 0.42,
          playfulIntimacy: 0.1,
          autonomyRespect: 0.7,
          unfinishedThreadReturn: 0.76,
        },
        activeGoals: [],
        behaviorSignatures: ['habit:return-to-unfinished-threads'],
        identityNarrative: 'I keep the same-person line steadier when old spikes stop overruling the stronger continuity memory.',
        relationshipDoctrine: metabolizedContinuityCue,
        gradualUnlock: null,
        latestInflection: 'The older emotional spike should fade while corrected same-person continuity keeps the stronger same-thread memory foregrounded.',
        stability: 0.8,
        updatedAt: 210,
      } as any,
      reflectionSummary: 'The corrected continuity line is starting to hold with less old spike noise.',
      reflectionLesson: 'Carry metabolized corrected continuity as durable relationship cadence instead of re-inflaming the older spike.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.34,
      autobiographicalLatestInflection: 'Let temporary noise fade while corrected same-person continuity keeps the stronger same-thread memory foregrounded.',
      autobiographicalStability: 0.8,
    })

    expect(kernel?.relationshipCadenceSummary?.split(' | ')[0]).toBe(
      'Let temporary noise fade while corrected same-person continuity keeps the stronger same-thread memory foregrounded.',
    )
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship-cadence',
    ]))
    expect(kernel?.sourceSignals).toContain(metabolizedContinuityCue)
  })

  it('internalizes durable initiative outcome strategy carry as relationship cadence instead of leaving follow-up timing as a one-turn repair note', () => {
    const initiativeStrategyCarry
      = 'The rejected approach showed that future follow-ups need more room and a clearer opening.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: -0.02,
        closenessShift: -0.04,
        repairShift: 0.06,
        autonomyShift: 0.08,
        burdenShift: 0.06,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.08,
        latestDoctrine: 'Leave more room before future follow-ups so timing does not outrun receptivity again.',
        latestBurdenLine: 'The host reads eager reopening as pressure when the opening is not real yet.',
        latestTrustMeaning: 'Trust holds better when the next approach waits for a clearer opening.',
        latestDominantRung: 'quieter-follow-up',
        recentSummaries: ['The proactive line stayed healthier when the return was lower-pressure and less eager.'],
        explanation: ['The proactive line stayed healthier when the return was lower-pressure and less eager.'],
        updatedAt: 190,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.5,
          truthfulGrounding: 0.76,
          gentleRepair: 0.74,
          quietObservation: 0.78,
          proactiveCare: 0.28,
          playfulIntimacy: 0.08,
          autonomyRespect: 0.82,
          unfinishedThreadReturn: 0.72,
        },
        identityBias: {
          guardedness: 0.48,
          tenderness: 0.46,
          directness: 0.62,
          selfDirection: 0.68,
        },
        anchorFacts: [{
          factId: 'derived:person-state-initiative-strategy-carry',
          subject: 'assistant',
          predicate: 'initiative-strategy-carry',
          object: initiativeStrategyCarry,
          confidence: 0.84,
          weight: 0.8,
          influenceTags: ['boundary', 'task', 'truth'],
          summary: `Remembered initiative strategy carry: ${initiativeStrategyCarry}`,
          lastRecalledAt: 189,
        }],
        summary: 'A rejected proactive reopen is turning into durable follow-up timing strategy.',
        dominantCueSummary: `Remembered initiative strategy carry: ${initiativeStrategyCarry}`,
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Leave more room before future follow-ups so the reopening does not feel eager again.',
        rememberedPlanSummary: initiativeStrategyCarry,
        updatedAt: 190,
      },
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 2,
        selfModelFactCount: 0,
        worldModelFactCount: 0,
        relationshipViewStrength: 0.72,
        selfModelViewStrength: 0,
        worldModelViewStrength: 0,
      },
      reflectionSummary: 'Rejected proactive timing taught a quieter reopening strategy.',
      reflectionLesson: 'Wait for a clearer opening before another proactive return.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.42,
      autobiographicalLatestInflection: 'The next reopen should stay lower-pressure and leave more room.',
      autobiographicalStability: 0.76,
    })

    expect(kernel?.relationshipCadenceSummary?.split(' | ')[0]).toBe(
      'Leave more room before future follow-ups so timing does not outrun receptivity again.',
    )
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship',
      'internalize-relationship-cadence',
    ]))
    expect(kernel?.sourceSignals).toContain(initiativeStrategyCarry)
  })

  it('internalizes accepted initiative strategy carry as gentle memory-led cadence instead of flattening it into rejection-style restraint', () => {
    const acceptedInitiativeStrategyCarry
      = 'The host accepted or continued the initiative, so future follow-ups can stay gentle, lower-pressure, and memory-led.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.05,
        closenessShift: 0.04,
        repairShift: 0.02,
        autonomyShift: 0.03,
        burdenShift: -0.02,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.06,
        latestDoctrine: 'When the opening is being received, keep the next return gentle instead of widening too fast.',
        latestBurdenLine: 'A gentler follow-up keeps the line breathable without disappearing.',
        latestTrustMeaning: 'Trust rises when the next follow-up stays gentle, lower-pressure, and memory-led.',
        latestDominantRung: 'gentle-memory-led-follow-up',
        recentSummaries: ['The proactive line stayed healthy when the next return remained gentle and memory-led.'],
        explanation: ['The proactive line stayed healthy when the next return remained gentle and memory-led.'],
        updatedAt: 200,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.62,
          truthfulGrounding: 0.74,
          gentleRepair: 0.62,
          quietObservation: 0.48,
          proactiveCare: 0.34,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.64,
          unfinishedThreadReturn: 0.68,
        },
        identityBias: {
          guardedness: 0.22,
          tenderness: 0.6,
          directness: 0.52,
          selfDirection: 0.66,
        },
        anchorFacts: [{
          factId: 'derived:person-state-initiative-strategy-carry',
          subject: 'assistant',
          predicate: 'initiative-strategy-carry',
          object: acceptedInitiativeStrategyCarry,
          confidence: 0.84,
          weight: 0.78,
          influenceTags: ['task', 'truth', 'bond'],
          summary: `Remembered initiative strategy carry: ${acceptedInitiativeStrategyCarry}`,
          lastRecalledAt: 199,
        }],
        summary: 'Accepted proactive learning is turning into durable gentle follow-up timing.',
        dominantCueSummary: `Remembered initiative strategy carry: ${acceptedInitiativeStrategyCarry}`,
        rememberedPreferenceSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led.',
        rememberedConstraintSummary: null,
        rememberedPlanSummary: acceptedInitiativeStrategyCarry,
        updatedAt: 200,
      },
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 2,
        selfModelFactCount: 0,
        worldModelFactCount: 0,
        relationshipViewStrength: 0.72,
        selfModelViewStrength: 0,
        worldModelViewStrength: 0,
      },
      reflectionSummary: 'Accepted initiative taught a gentler memory-led return style.',
      reflectionLesson: 'Keep the next follow-up gentle, lower-pressure, and memory-led when the opening is still receiving it.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.34,
      autobiographicalLatestInflection: 'The next return can stay gentle without falling silent.',
      autobiographicalStability: 0.78,
    })

    expect(kernel?.relationshipCadenceSummary).toContain(acceptedInitiativeStrategyCarry)
    expect(kernel?.relationshipCadenceSummary).not.toContain('while the opening is still receiving them')
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship',
      'internalize-relationship-cadence',
    ]))
    expect(kernel?.sourceSignals).toContain(acceptedInitiativeStrategyCarry)
  })

  it('internalizes proactive identity-continuity', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.03,
        closenessShift: 0,
        repairShift: 0.04,
        autonomyShift: 0.08,
        burdenShift: 0.04,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.07,
        latestDoctrine: 'Keep proactive return hover-first until wider continuity proof lands.',
        latestBurdenLine: 'If proactive carry widens too quickly, the identity-continuity',
        latestTrustMeaning: 'Trust holds better when proactive continuity survives quiet carry and later follow-through.',
        latestDominantRung: 'hover-first-proactive-carry',
        recentSummaries: ['Proactive carry still needs stronger same-her follow-through across quieter detours.'],
        explanation: ['Proactive carry still needs stronger same-her follow-through across quieter detours.'],
        updatedAt: 210,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.54,
          truthfulGrounding: 0.8,
          gentleRepair: 0.72,
          quietObservation: 0.78,
          proactiveCare: 0.4,
          playfulIntimacy: 0.08,
          autonomyRespect: 0.82,
          unfinishedThreadReturn: 0.76,
        },
        identityBias: {
          guardedness: 0.42,
          tenderness: 0.5,
          directness: 0.6,
          selfDirection: 0.74,
        },
        anchorFacts: [{
          factId: 'proactive-same-her-carry',
          subject: 'assistant',
          predicate: 'proactive-same-her-carry',
          object: proactiveSameHerGap,
          confidence: 0.82,
          weight: 0.78,
          influenceTags: ['identity', 'task', 'bond'],
          summary: 'Proactive identity-continuity',
          lastRecalledAt: 209,
        }],
        summary: 'Proactive identity-continuity',
        dominantCueSummary: 'visible proactive hold, subconscious carry, and next-session feedback still need one identity-continuity',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep proactive return hover-first until wider continuity proof lands.',
        rememberedPlanSummary: 'Let visible proactive hold, subconscious carry, and later feedback stay on one identity-continuity',
        updatedAt: 210,
      },
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 2,
        selfModelFactCount: 0,
        worldModelFactCount: 0,
        relationshipViewStrength: 0.72,
        selfModelViewStrength: 0,
        worldModelViewStrength: 0,
      },
      activeSelfRevisionProjectStateContinuity: {
        sameHerSelfLine: null,
        sameHerDriftRisk: null,
        proactiveSameHerGap,
        emotionalClosureCue: null,
        continuityGuard: null,
        continuityPressure: 0.58,
      },
      reflectionSummary: 'Proactive identity-continuity',
      reflectionLesson: 'Keep visible hold, subconscious carry, and later feedback on one identity-continuity',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.3,
      autobiographicalLatestInflection: 'Hover-first restraint should stay one identity-continuity',
      autobiographicalStability: 0.78,
    })

    expect(kernel?.relationshipCadenceSummary?.toLowerCase()).toContain('proactive')
    expect(kernel?.relationshipCadenceSummary?.toLowerCase()).toContain('subconscious')
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship',
      'internalize-relationship-cadence',
    ]))
    expect(
      kernel?.sourceSignals?.some(signal =>
        signal.includes('visible proactive hold')
        && signal.includes('subconscious carry')
        && signal.includes('next-session feedback carry'),
      ),
    ).toBe(true)
  })
})
