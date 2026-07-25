import type { AlicizationSelfEvolutionRelationshipCadenceEvidence } from './self-evolution-kernel'

import { describe, expect, it } from 'vitest'

import { buildAlicizationSelfEvolutionKernel } from './self-evolution-kernel'

function buildTypedRelationshipCadenceEvidence(
  summary: string,
  cadence: Partial<AlicizationSelfEvolutionRelationshipCadenceEvidence['cadence']> = {},
): AlicizationSelfEvolutionRelationshipCadenceEvidence {
  return {
    source: 'owned-affective-residue',
    cadence: {
      cadenceMode: 'measured-return',
      distancePosture: 'measured-room',
      companionshipDensity: 0.4,
      repairRecovery: 0.62,
      overreachRisk: 0.58,
      fatigueGuard: 0.2,
      afterglowCarry: 0.64,
      shouldDelayWarmth: true,
      shouldProtectRest: false,
      reasonTags: ['typed-affective-residue'],
      ...cadence,
      summary,
    },
  }
}

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
        latestDoctrine: 'Let repair settle before warmth expands.',
        latestBurdenLine: 'When the host is overloaded, extra warmth can become pressure.',
        latestTrustMeaning: 'Trust rises when truth and timing land together.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Repair landed and changed the shared context.'],
        explanation: ['Let repair settle before warmth expands.'],
        updatedAt: 100,
      },
      hostPersonModel: {
        summary: 'The host opens more when the reply feels real and bounded.',
        routines: ['Focused work needs space first.'],
        sensitivities: ['Template-like speech breaks the sense of a person.'],
        repairTriggers: ['Repair the mismatch before continuing.'],
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
          object: 'let repair settle before warmth expands',
          confidence: 0.88,
          weight: 0.84,
          influenceTags: ['truth', 'care'],
          summary: 'let repair settle before warmth expands',
          lastRecalledAt: 99,
        }],
        summary: 'The durable line is becoming more truth-first and repair-led.',
        dominantCueSummary: 'let repair settle before warmth expands',
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
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence(
        'Let repair settle before warmth expands.',
        { cadenceMode: 'repair' },
      ),
      reflectionSummary: 'A recent reflection says the seam matters more than flourish.',
      reflectionLesson: 'Keep thread-faithful payoff before extra warmth.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.64,
      autobiographicalLatestInflection: 'Warmth should not outrun grounding.',
      autobiographicalStability: 0.74,
    })

    expect(kernel).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      relationshipDoctrine: 'Let repair settle before warmth expands.',
      latestInflection: 'Warmth should not outrun grounding.',
      burdenLine: 'When the host is overloaded, extra warmth can become pressure.',
      trustMeaning: 'Trust rises when truth and timing land together.',
      relationshipCadenceSummary: expect.stringContaining('Let repair settle before warmth expands.'),
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

  it('does not infer relationship cadence or durable-self rhythm from legacy prose without typed evidence', () => {
    const legacyCadenceProse
      = 'Keep the same her on the same line with measured-return, repair-before-closeness, and lower-pressure timing without reopening from scratch.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.05,
        closenessShift: -0.02,
        repairShift: 0.04,
        autonomyShift: 0.03,
        burdenShift: 0.02,
        executionTrustShift: 0.08,
        relationshipDoctrineShift: 0.04,
        latestDoctrine: legacyCadenceProse,
        latestBurdenLine: 'Over-close callback warmth still feels like pressure.',
        latestTrustMeaning: 'Callback timing keeps trust steadier after reconfirmation.',
        latestDominantRung: 'measured-room',
        recentSummaries: [legacyCadenceProse],
        explanation: [legacyCadenceProse],
        updatedAt: 150,
      },
      activeSelfRevisionProjectStateContinuity: {
        sameHerSelfLine: legacyCadenceProse,
        sameHerDriftRisk: legacyCadenceProse,
        proactiveSameHerGap: legacyCadenceProse,
        emotionalClosureCue: legacyCadenceProse,
        continuityGuard: legacyCadenceProse,
        continuityPressure: 0.72,
      },
      reflectionSummary: 'The steadier callback return now looks repeatable enough to learn from.',
      reflectionLesson: 'Measured callback return should become part of durable relationship timing.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.26,
      autobiographicalLatestInflection: legacyCadenceProse,
      autobiographicalStability: 0.76,
    })

    expect(kernel).not.toBeNull()
    expect(kernel?.relationshipCadenceSummary).toBeNull()
    expect(kernel?.activeLearningFocuses).not.toContain('internalize-relationship-cadence')
    expect(kernel?.activeLearningFocuses.some(focus => focus.startsWith('relationship:'))).toBe(false)
    expect(JSON.stringify(kernel?.activeLearningFocuses)).not.toMatch(/same her|measured-return|repair-before-closeness|lower-pressure/iu)
  })

  it('keeps policy pressure numeric instead of creating synthetic learning source text', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      learningPolicyState: {
        strictnessBias: 0.72,
        wrongThreadSuppressionBias: 0.64,
        provenanceLabelBias: 0.58,
        selfRevisionPatchCount: 1,
        selfRevisionMemoryPolicyBias: 0.72,
        selfRevisionRelationshipPostureBias: 0.62,
        selfRevisionResponsePostureBias: 0.54,
        selfRevisionProactivePolicyBias: 0.48,
        selfRevisionValidationBias: 1,
      },
      autobiographicalStability: 0.72,
    })

    expect(kernel?.activeLearningFocuses).toContain('self-revision-policy-feedback')
    expect(kernel?.sourceSignals).toEqual([])
  })

  it('uses typed affective residue cadence evidence for relationship cadence learning without rewriting its summary', () => {
    const typedCadenceSummary = 'The return remains measured while repair recovery settles.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      knowledgeEvidence: {
        validationCount: 3,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 2,
        relationshipViewStrength: 0.76,
      },
      relationshipCadenceEvidence: {
        source: 'owned-affective-residue',
        cadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.38,
          repairRecovery: 0.62,
          overreachRisk: 0.58,
          fatigueGuard: 0.2,
          afterglowCarry: 0.66,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['cadence-mode:measured-return', 'repair-recovery'],
          summary: typedCadenceSummary,
        },
      },
      autobiographicalStability: 0.76,
    })

    expect(kernel?.relationshipCadenceSummary).toBe(typedCadenceSummary)
    expect(kernel?.activeLearningFocuses).toContain('internalize-relationship-cadence')
    expect(kernel?.sourceSignals).toContain(typedCadenceSummary)
  })

  it('uses the typed cadence enum when affective residue has no cadence summary', () => {
    const kernel = buildAlicizationSelfEvolutionKernel({
      knowledgeEvidence: {
        validationCount: 2,
        contradictionCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 0,
        relationshipFactCount: 1,
        relationshipViewStrength: 0.68,
      },
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence('', {
        cadenceMode: 'repair',
        repairRecovery: 0.72,
      }),
    })

    expect(kernel?.relationshipCadenceSummary).toBe('repair')
    expect(kernel?.activeLearningFocuses).toContain('internalize-relationship-cadence')
    expect(kernel?.sourceSignals).toContain('repair')
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

  it('internalizes durable self rhythm as relationship cadence instead of treating it as a one-turn carry only', () => {
    const durableSelfRhythm
      = 'A steady presence remains available across quiet, memory, and speech after a pause.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.04,
        closenessShift: 0.01,
        repairShift: 0.03,
        autonomyShift: 0.02,
        burdenShift: 0,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.05,
        latestDoctrine: 'Stay with the shared context before widening outward again.',
        latestBurdenLine: null,
        latestTrustMeaning: 'The bond feels steadier when quiet pauses are resumed honestly.',
        latestDominantRung: 'steady-return',
        recentSummaries: ['A quieter continuation beat helped the bond feel carried forward.'],
        explanation: ['A quieter continuation beat helped the bond feel carried forward.'],
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
          object: 'steady presence across quiet, memory, and speech',
          confidence: 0.84,
          weight: 0.78,
          influenceTags: ['identity', 'bond'],
          summary: 'A steady presence remains available across quiet, memory, and speech.',
          lastRecalledAt: 169,
        }],
        summary: 'The durable self rhythm is starting to feel carried across pauses.',
        dominantCueSummary: 'steady presence across quiet, memory, and speech',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep the return gentle before widening outward again.',
        rememberedPlanSummary: 'Resume from the last shared context after a quiet beat.',
        updatedAt: 170,
      },
      activeSelfRevisionProjectStateContinuity: {
        sameHerSelfLine: durableSelfRhythm,
        sameHerDriftRisk: 'Starting from a blank pose would flatten the carried relationship rhythm.',
        emotionalClosureCue: null,
        continuityGuard: null,
        continuityPressure: 0.56,
      },
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence(durableSelfRhythm),
      reflectionSummary: 'The bond held better when the reply resumed from the last shared context.',
      reflectionLesson: 'Learn this steady rhythm as durable relationship timing.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.24,
      autobiographicalLatestInflection: 'Stay with the last shared context before widening outward again.',
      autobiographicalStability: 0.78,
    })

    expect(kernel?.relationshipCadenceSummary).toContain('steady presence')
    expect(kernel?.relationshipCadenceSummary).toContain('after a pause')
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

  it('internalizes corrected relationship meaning as long-term relationship cadence instead of defending the first read', () => {
    const correctedRelationshipMeaning
      = 'The host corrected the relationship meaning away from rushed task framing and toward a calmer care rhythm.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.05,
        closenessShift: -0.01,
        repairShift: 0.04,
        autonomyShift: 0.03,
        burdenShift: 0.01,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.06,
        latestDoctrine: 'Let the return stay gentle while the corrected relationship meaning settles.',
        latestBurdenLine: 'Pushing too fast would turn care into pressure.',
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
          factId: 'corrected-relationship-meaning',
          subject: 'relationship',
          predicate: 'prefers',
          object: 'Carry corrected relationship meaning forward instead of defaulting back to rushed task framing.',
          confidence: 0.82,
          weight: 0.78,
          influenceTags: ['bond', 'truth', 'identity'],
          summary: 'Corrected relationship meaning should remain gentle instead of becoming rushed task framing again.',
          lastRecalledAt: 179,
        }],
        summary: 'A host-corrected relationship meaning is becoming durable timing.',
        dominantCueSummary: 'corrected relationship meaning is settling back into shared context',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Let corrected meaning settle gently before pushing the thread forward again.',
        rememberedPlanSummary: 'Keep the return gentle while the corrected relationship meaning settles back into shared context.',
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
        sameHerSelfLine: 'Keep the return gentle while the corrected relationship meaning settles back into shared context.',
        sameHerDriftRisk: 'If I slide back into rushed framing, the corrected relationship meaning will blur again.',
        emotionalClosureCue: 'This was not task pressure; it was a corrected relationship meaning.',
        continuityGuard: correctedRelationshipMeaning,
        continuityPressure: 0.6,
      },
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence(
        correctedRelationshipMeaning,
        { cadenceMode: 'repair' },
      ),
      reflectionSummary: correctedRelationshipMeaning,
      reflectionLesson: 'I learned to carry corrected memory meaning instead of defending the first interpretation.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.48,
      autobiographicalLatestInflection: 'A corrected relationship meaning can settle slowly without being pushed forward right away.',
      autobiographicalStability: 0.78,
    })

    expect(kernel?.relationshipCadenceSummary).toMatch(/corrected (?:the )?relationship meaning/iu)
    expect(kernel?.relationshipCadenceSummary).toContain('rushed task framing')
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship',
      'internalize-relationship-cadence',
    ]))
    expect(kernel?.sourceSignals).toContain(correctedRelationshipMeaning)
  })

  it('internalizes metabolized corrected meaning as relationship cadence after autobiographical memory settles', () => {
    const metabolizedRelationshipCue
      = 'Corrected relationship meaning now keeps the stronger memory foregrounded while temporary noise fades.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.04,
        closenessShift: -0.01,
        repairShift: 0.05,
        autonomyShift: 0.03,
        burdenShift: 0.02,
        executionTrustShift: 0.01,
        relationshipDoctrineShift: 0.06,
        latestDoctrine: 'Keep the return gentle while corrected relationship meaning keeps settling.',
        latestBurdenLine: 'The older spike should not keep deciding the whole response once memory is steadier.',
        latestTrustMeaning: 'Trust holds when the stronger memory stays foreground and stale spike noise stops leading the response.',
        latestDominantRung: 'metabolized-return',
        recentSummaries: ['The corrected relationship meaning now holds better when the stronger memory stays ahead of the older spike.'],
        explanation: ['The corrected relationship meaning now holds better when the stronger memory stays ahead of the older spike.'],
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
          object: metabolizedRelationshipCue,
          confidence: 0.84,
          weight: 0.8,
          influenceTags: ['bond', 'truth', 'identity'],
          summary: 'Corrected relationship meaning now keeps the stronger memory foreground and lets temporary noise fade.',
          lastRecalledAt: 209,
        }],
        summary: 'Corrected relationship meaning is settling into a more metabolized timing pattern.',
        dominantCueSummary: metabolizedRelationshipCue,
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep corrected meaning gentle while the stronger memory stays foreground.',
        rememberedPlanSummary: metabolizedRelationshipCue,
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
        identityNarrative: 'I keep the relationship meaning steadier when old spikes stop overruling the stronger memory.',
        relationshipDoctrine: metabolizedRelationshipCue,
        gradualUnlock: null,
        latestInflection: 'The older emotional spike should fade while corrected relationship meaning keeps the stronger memory foregrounded.',
        stability: 0.8,
        updatedAt: 210,
      } as any,
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence(
        'Let temporary noise fade while corrected relationship meaning keeps the stronger memory foregrounded.',
        { cadenceMode: 'repair' },
      ),
      reflectionSummary: 'The corrected relationship meaning is starting to hold with less old spike noise.',
      reflectionLesson: 'Carry metabolized corrected meaning as durable timing instead of re-inflaming the older spike.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.34,
      autobiographicalLatestInflection: 'Let temporary noise fade while corrected relationship meaning keeps the stronger memory foregrounded.',
      autobiographicalStability: 0.8,
    })

    expect(kernel?.relationshipCadenceSummary?.split(' | ')[0]).toBe(
      'Let temporary noise fade while corrected relationship meaning keeps the stronger memory foregrounded.',
    )
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship-cadence',
    ]))
    expect(kernel?.sourceSignals).toContain(metabolizedRelationshipCue)
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
        recentSummaries: ['The proactive return stayed healthier when it was gentler and less eager.'],
        explanation: ['The proactive return stayed healthier when it was gentler and less eager.'],
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
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence(
        'Leave more room before future follow-ups so timing does not outrun receptivity again.',
      ),
      reflectionSummary: 'Rejected proactive timing taught a quieter reopening strategy.',
      reflectionLesson: 'Wait for a clearer opening before another proactive return.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.42,
      autobiographicalLatestInflection: 'The next return should stay gentler and leave more room.',
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
      = 'The host accepted or continued the initiative, so future follow-ups can stay gentle and anchored in remembered context.'
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
        latestTrustMeaning: 'Trust rises when the next follow-up stays gentle and anchored in remembered context.',
        latestDominantRung: 'gentle-contextual-follow-up',
        recentSummaries: ['The proactive return stayed healthy when the next response remained gentle and context-aware.'],
        explanation: ['The proactive return stayed healthy when the next response remained gentle and context-aware.'],
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
        rememberedPreferenceSummary: 'Keep future follow-ups gentle and anchored in remembered context.',
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
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence(
        acceptedInitiativeStrategyCarry,
        {
          cadenceMode: 'warm-hold',
          distancePosture: 'nearby-soft',
          shouldDelayWarmth: false,
        },
      ),
      reflectionSummary: 'Accepted initiative taught a gentler context-aware return style.',
      reflectionLesson: 'Keep the next follow-up gentle and anchored in remembered context when the opening is still receiving it.',
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

  it('internalizes proactive presence coordination', () => {
    const proactivePresenceGap = 'Need stronger long-run proof that visible proactive presence, quiet carry, and later feedback stay coordinated after restraint survives detours on longer noisy desktop runs.'
    const kernel = buildAlicizationSelfEvolutionKernel({
      personStateEvolutionSummary: {
        trustShift: 0.03,
        closenessShift: 0,
        repairShift: 0.04,
        autonomyShift: 0.08,
        burdenShift: 0.04,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.07,
        latestDoctrine: 'Keep proactive return quiet until wider evidence lands.',
        latestBurdenLine: 'If proactive carry widens too quickly, it can make presence feel forced.',
        latestTrustMeaning: 'Trust holds better when proactive continuity survives quiet carry and later follow-through.',
        latestDominantRung: 'quiet-proactive-carry',
        recentSummaries: ['Proactive carry still needs stronger follow-through across quieter detours.'],
        explanation: ['Proactive carry still needs stronger follow-through across quieter detours.'],
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
          factId: 'proactive-presence-carry',
          subject: 'assistant',
          predicate: 'proactive-presence-carry',
          object: proactivePresenceGap,
          confidence: 0.82,
          weight: 0.78,
          influenceTags: ['identity', 'task', 'bond'],
          summary: 'Proactive presence carry still needs evidence.',
          lastRecalledAt: 209,
        }],
        summary: 'Proactive presence carry still needs evidence.',
        dominantCueSummary: 'visible proactive presence, quiet carry, and later feedback still need coordination',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep proactive return quiet until wider evidence lands.',
        rememberedPlanSummary: 'Let visible proactive presence, quiet carry, and later feedback stay coordinated.',
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
        proactiveSameHerGap: proactivePresenceGap,
        emotionalClosureCue: null,
        continuityGuard: null,
        continuityPressure: 0.58,
      },
      relationshipCadenceEvidence: buildTypedRelationshipCadenceEvidence(proactivePresenceGap),
      reflectionSummary: 'Proactive presence carry still needs evidence.',
      reflectionLesson: 'Keep visible presence, quiet carry, and later feedback coordinated.',
      reflectionTargetScope: 'relationship',
      reflectionPressure: 0.3,
      autobiographicalLatestInflection: 'Quiet restraint should stay coordinated with later follow-through.',
      autobiographicalStability: 0.78,
    })

    expect(kernel?.relationshipCadenceSummary?.toLowerCase()).toContain('proactive')
    expect(kernel?.relationshipCadenceSummary?.toLowerCase()).toContain('quiet')
    expect(kernel?.activeLearningFocuses).toEqual(expect.arrayContaining([
      'reflection:relationship',
      'internalize-relationship',
      'internalize-relationship-cadence',
    ]))
    expect(
      kernel?.sourceSignals?.some(signal =>
        signal.includes('visible proactive presence')
        && signal.includes('quiet carry')
        && signal.includes('later feedback'),
      ),
    ).toBe(true)
  })
})
