import { describe, expect, it } from 'vitest'

import {
  buildMindSynthesis,
  buildMindSynthesisSystemBlock,
} from './mind-synthesizer'

const baseDiscourseState = {
  currentTurnSubject: 'task-knot' as const,
  screenReferenceMode: 'helpful' as const,
  currentTurnSummary: 'Stay with the runtime diff knot.',
  currentQuestion: 'What is wrong with this diff?',
  owedAction: 'guide-task' as const,
  relationMove: 'guide' as const,
  continuityMode: 'task-first' as const,
  unresolvedCarry: 'The runtime diff still feels unresolved.',
  ruptureRepair: null,
  confidence: 0.86,
  narrative: [],
  updatedAt: 10_000,
}

describe('buildMindSynthesis', () => {
  it('pulls beliefs, concerns, commitments, and desires into a turn-level synthesis', () => {
    const synthesis = buildMindSynthesis({
      now: 20_000,
      discourseState: baseDiscourseState,
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is localizing a problematic runtime diff.',
          confidence: 0.88,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['Which hunk actually introduced the regression?'],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      subjectiveInference: {
        dominantInterpretation: 'The host is trying to understand whether the diff caused the failure.',
        situatedMeaning: 'This is active debugging, not casual browsing.',
        uncertainty: 'The exact failing line is still not fully grounded.',
        hostIntentCandidates: [],
        relationshipNeedCandidates: [],
        confidence: 0.82,
        source: 'hybrid',
        notes: [],
        updatedAt: 20_000,
      },
      appraisal: {
        inferredHostGoal: 'inspect-change',
        currentKnot: 'Find the risky part of the runtime diff.',
        waitingToVerify: 'Which hunk actually introduced the regression?',
        situatedMeaning: 'A narrow diff knot is being inspected.',
        relationshipNeed: 'guidance',
        source: 'hybrid',
        confidence: 0.78,
        surprise: 0.24,
        carePressure: 0.36,
        interruptionCost: 0.22,
        desireToSpeak: 0.64,
        notes: [],
      },
      concernContinuity: {
        governingEntryId: 'concern::runtime',
        entries: [{
          id: 'concern::runtime',
          sourceConcernId: 'source::runtime',
          kind: 'help-fix',
          status: 'active',
          summary: 'The runtime diff knot is still unresolved.',
          anchor: 'runtime diff',
          targetThreadId: 'thread::runtime',
          continuityWeight: 0.8,
          freshnessBias: 0.7,
          repairAffinity: 0.12,
          confidence: 0.84,
          createdAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 80_000,
        }],
        carryPressure: 0.72,
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 20_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::runtime',
        commitments: [{
          id: 'commitment::runtime',
          kind: 'hold-problem',
          status: 'active',
          title: 'Keep holding the runtime diff',
          summary: 'Stay with the runtime diff until the risky hunk is localized.',
          source: 'continuity',
          priority: 0.82,
          confidence: 0.86,
          createdAt: 0,
          lastRenewedAt: 20_000,
          patienceUntil: 80_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.74,
        narrative: [],
        updatedAt: 20_000,
      },
      relationshipModel: {
        climate: 'attuned',
        approachVector: 'guide',
        receptivity: 0.62,
        sharedAttentionTrust: 0.7,
        correctionSensitivity: 0.18,
        reciprocityExpectation: 0.4,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.8,
        rationaleTags: ['runtime-diff'],
        thoughtText: 'Stay with the real diff knot instead of drifting away from it.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 80_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
      desireMemory: {
        activeDesires: [{
          id: 'desire::runtime',
          kind: 'stay-near',
          status: 'active',
          reason: 'Keep the debugging thread intact until the risky hunk is understood.',
          strength: 0.7,
          reopenWhen: [],
          createdAt: 0,
          lastFeltAt: 20_000,
          expiresAt: 120_000,
        }],
        withheldCount: 0,
        updatedAt: 20_000,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.48,
        protectiveness: 0.42,
        curiosity: 0.72,
        patience: 0.6,
        desireToSpeak: 0.68,
        fearOfInterrupting: 0.28,
        moodLabel: 'tense-but-focused',
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.74,
        relationshipTrust: 0.66,
        guardingTendency: 0.34,
        misreadBurden: 0.2,
        carryOverDesire: 0.62,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(synthesis?.openingIntent).toContain('current knot')
    expect(synthesis?.beliefs.some(belief => belief.summary.includes('runtime diff'))).toBe(true)
    expect(synthesis?.concerns.some(concern => concern.summary.includes('unresolved'))).toBe(true)
    expect(synthesis?.commitments.some(commitment => commitment.summary.includes('risky hunk'))).toBe(true)
    expect(synthesis?.desires.some(desire => desire.summary.includes('debugging thread'))).toBe(true)
    expect(buildMindSynthesisSystemBlock(synthesis)).toContain('[ALICIZATION_MIND_SYNTHESIS]')
  })

  it('keeps dialogue-first truth boundaries when the screen should not dominate', () => {
    const synthesis = buildMindSynthesis({
      now: 30_000,
      discourseState: {
        ...baseDiscourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
      },
    })

    expect(synthesis?.truthBoundary).toContain('dialogue-first')
    expect(synthesis?.openingIntent).toContain('Alicization')
  })
})
