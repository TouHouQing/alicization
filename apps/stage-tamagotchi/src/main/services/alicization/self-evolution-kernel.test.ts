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
})
