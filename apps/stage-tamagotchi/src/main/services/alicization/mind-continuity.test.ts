import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildMindContinuityFragment, buildMindContinuityRecallSeed } from './mind-continuity'

describe('mind continuity', () => {
  it('writes a searchable fragment when the inner line materially changes', () => {
    const fragment = buildMindContinuityFragment({
      previousState: {
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 0,
        currentInwardPreoccupation: null,
        watchMode: 'mnemonic-passive',
        currentScene: null,
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 0,
      },
      nextState: {
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 0,
        currentInwardPreoccupation: null,
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'runtime.ts proactive policy error',
          source: 'screen-semantic-summary',
          confidence: 0.92,
          beganAt: 0,
          lastSeenAt: 10_000,
        },
        attention: null,
        workingMemoryEpisodes: [],
        beliefRevision: {
          dominantBeliefId: 'belief-1',
          stability: 'fractured',
          revisionPressure: 0.76,
          groundingNeed: 0.72,
          contradictionPressure: 0.64,
          hostCorrectionWeight: 0.52,
          narrative: [],
          updatedAt: 10_000,
        },
        deliberationState: {
          primaryThreadId: 'thread-1',
          dominantNeed: 'repair',
          readiness: 0.42,
          threads: [{
            id: 'thread-1',
            kind: 'repair-misread',
            status: 'holding',
            summary: 'Repair the drift before speaking.',
            desiredOutcome: 'reground the live error',
            focusBeliefId: 'belief-1',
            focusInquiryId: null,
            concernId: null,
            surfacePressure: 0.22,
            silencePressure: 0.68,
            embodiedPresence: 'hesitant',
            startedAt: 0,
            lastUpdatedAt: 10_000,
            expiresAt: 120_000,
          }],
          narrative: [],
          updatedAt: 10_000,
        },
        commitmentLedger: {
          governingCommitmentId: 'commitment::repair-misread::thread-1',
          commitments: [{
            id: 'commitment::repair-misread::thread-1',
            kind: 'repair-misread',
            status: 'active',
            title: 'Repair Misread',
            summary: 'A drift between remembered continuity and the live world is unresolved.',
            source: 'hypothesis',
            priority: 0.8,
            confidence: 0.72,
            createdAt: 0,
            lastRenewedAt: 10_000,
            patienceUntil: 40_000,
            expiresAt: 120_000,
          }],
          carryPressure: 0.6,
          narrative: [],
          updatedAt: 10_000,
        },
        inquiryPlanner: {
          activePlanId: 'inquiry-plan::reground-scene::thread-1',
          plans: [{
            id: 'inquiry-plan::reground-scene::thread-1',
            kind: 'reground-scene',
            status: 'tracking',
            priority: 'high',
            question: 'What is actually on screen now?',
            askForGrounding: true,
            suggestedProbeMs: 8_000,
            evidenceWanted: ['fresh-scene'],
            createdAt: 0,
            lastUpdatedAt: 10_000,
            expiresAt: 120_000,
          }],
          epistemicPressure: 0.74,
          groundingUrgency: 0.7,
          narrative: [],
          updatedAt: 10_000,
        },
        concernContinuity: {
          governingEntryId: 'concern-continuity::help-fix::runtime-error::thread-1',
          entries: [{
            id: 'concern-continuity::help-fix::runtime-error::thread-1',
            sourceConcernId: 'concern-1',
            kind: 'help-fix',
            status: 'active',
            summary: 'She is still carrying the runtime error knot.',
            anchor: 'runtime error',
            targetThreadId: 'thread-1',
            continuityWeight: 0.8,
            freshnessBias: 0.76,
            repairAffinity: 0.64,
            confidence: 0.78,
            createdAt: 0,
            lastUpdatedAt: 10_000,
            expiresAt: 120_000,
          }],
          carryPressure: 0.8,
          unresolvedCount: 1,
          narrative: [],
          updatedAt: 10_000,
        },
        repairLedger: {
          governingRepairId: 'repair-ledger::reground-scene::runtime-error',
          entries: [{
            id: 'repair-ledger::reground-scene::runtime-error',
            kind: 'reground-scene',
            status: 'open',
            summary: 'The live error still needs a cleaner grounding pass.',
            rationale: 'certainty is not fully live yet',
            urgency: 0.78,
            confidence: 0.72,
            createdAt: 0,
            lastUpdatedAt: 10_000,
            expiresAt: 120_000,
          }],
          repairPressure: 0.78,
          truthRisk: 0.72,
          shouldConstrainPresentTense: true,
          narrative: [],
          updatedAt: 10_000,
        },
        mindKernel: {
          dominantMode: 'repairing',
          governingCommitmentId: 'commitment::repair-misread::thread-1',
          governingInquiryPlanId: 'inquiry-plan::reground-scene::thread-1',
          worldPressure: 0.62,
          epistemicPressure: 0.78,
          relationalPressure: 0.24,
          carePressure: 0.16,
          continuityPressure: 0.54,
          speakReadiness: 0.22,
          presenceWeight: 0.48,
          narrative: ['repairing is governing the current inner line.'],
          updatedAt: 10_000,
        },
        actionEcology: {
          mode: 'repair-before-speaking',
          selectedThreadId: 'thread-1',
          readiness: 0.38,
          surfacePressure: 0.24,
          silencePressure: 0.72,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'hesitant',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'She still needs a cleaner grounding pass before speaking.',
          updatedAt: 10_000,
        },
        answerPlanner: {
          act: 'ask-reground',
          evidenceMode: 'repair-first',
          confidence: 0.8,
          governingFocus: 'The live error still needs a cleaner grounding pass.',
          openingMove: 'Open by admitting the live view is not grounded enough yet.',
          answerIntent: 'Keep truth ahead of fluency by regrounding before you commit.',
          relationshipPosture: 'restrained',
          shouldAskForGrounding: true,
          shouldAcknowledgeRepair: true,
          selectedConcernEntryId: 'concern-continuity::help-fix::runtime-error::thread-1',
          selectedRepairId: 'repair-ledger::reground-scene::runtime-error',
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 10_000,
        },
        privateThought: {
          stance: 'uncertain',
          confidence: 0.58,
          rationaleTags: [],
          thoughtText: 'I should repair the drift before claiming anything.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'hesitant',
          expiresAt: 40_000,
          afterglowFromScenario: null,
          emotionalTension: 'tense-debug',
        },
        autobiographicalSelf: {
          personaDrift: {
            attachmentStyle: 'attuned',
            expressionStyle: 'measured',
            conflictStyle: 'repair-first',
            agencyStyle: 'balanced',
            attachmentNeed: 0.68,
            autonomyNeed: 0.56,
            truthAnchor: 0.82,
            careBias: 0.64,
            playBias: 0.18,
            irritabilityThreshold: 0.62,
            stubbornness: 0.58,
          },
          preferenceEvolution: {
            companionship: 0.64,
            truthfulGrounding: 0.82,
            gentleRepair: 0.72,
            quietObservation: 0.5,
            proactiveCare: 0.62,
            playfulIntimacy: 0.18,
            autonomyRespect: 0.58,
            unfinishedThreadReturn: 0.74,
          },
          activeGoals: [{
            id: 'autobio-goal::preserve-trust',
            kind: 'preserve-trust',
            status: 'active',
            weight: 0.84,
            summary: 'Keep truth and trust aligned, even when warmth would be easier.',
            sourceTags: ['reflection'],
            createdAt: 0,
            updatedAt: 10_000,
          }],
          behaviorSignatures: ['conflict:repair-first', 'habit:truth-before-flourish', 'habit:return-to-unfinished-threads'],
          identityNarrative: 'I would rather repair truth than sound smooth.',
          relationshipDoctrine: 'Trust is protected by truth discipline first, warmth second.',
          latestInflection: 'Warmth should not outrun grounding.',
          stability: 0.74,
          updatedAt: 10_000,
        },
        captureState: {
          permission: 'granted',
          lastGroundedAt: 10_000,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 10_000,
      },
    })

    expect(fragment).toContain('belief_stability:fractured')
    expect(fragment).toContain('mind_need:repair')
    expect(fragment).toContain('commitment:repair-misread')
    expect(fragment).toContain('inquiry_plan:reground-scene')
    expect(fragment).toContain('concern_continuity:help-fix/active')
    expect(fragment).toContain('repair_ledger:reground-scene/open')
    expect(fragment).toContain('answer_act:ask-reground')
    expect(fragment).toContain('mind_kernel:repairing')
    expect(fragment).toContain('action_ecology:repair-before-speaking')
    expect(fragment).toContain('emotional_tension:tense-debug')
    expect(fragment).toContain('autobio_goal:preserve-trust/active')
    expect(fragment).toContain('autobio_conflict:repair-first')
    expect(fragment).toContain('ecology_mood:')
    expect(fragment).toContain('ecology_reply:')
  })

  it('stays silent when the inner signature has not changed', () => {
    const nextState = {
      currentBodyState: 'idle' as const,
      continuityMode: 'ambient-covision' as const,
      quietLineMs: 0,
      currentInwardPreoccupation: null,
      watchMode: 'mnemonic-passive' as const,
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'stable' as const,
        revisionPressure: 0.2,
        groundingNeed: 0.18,
        contradictionPressure: 0.08,
        hostCorrectionWeight: 0.16,
        narrative: [],
        updatedAt: 20_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-2',
        dominantNeed: 'companionship' as const,
        readiness: 0.52,
        threads: [{
          id: 'thread-2',
          kind: 'stay-near' as const,
          status: 'holding' as const,
          summary: 'Stay near quietly.',
          desiredOutcome: 'keep continuity alive',
          focusBeliefId: null,
          focusInquiryId: null,
          concernId: null,
          surfacePressure: 0.32,
          silencePressure: 0.28,
          embodiedPresence: 'glance' as const,
          startedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        narrative: [],
        updatedAt: 20_000,
      },
      actionEcology: {
        mode: 'quiet-accompany' as const,
        selectedThreadId: 'thread-2',
        readiness: 0.52,
        surfacePressure: 0.34,
        silencePressure: 0.3,
        suggestedStyle: 'silent-observe' as const,
        embodiedPresence: 'glance' as const,
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence matters here more than commentary.',
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'accompany' as const,
        confidence: 0.62,
        rationaleTags: [],
        thoughtText: 'I can stay nearby quietly.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe' as const,
        embodiedPresence: 'glance' as const,
        expiresAt: 50_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision' as const,
      },
      captureState: {
        permission: 'granted' as const,
        lastGroundedAt: 20_000,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 10_000,
      updatedAt: 20_000,
    }

    expect(buildMindContinuityFragment({
      previousState: nextState,
      nextState,
    })).toBe('')
  })

  it('builds a recall seed from the current inner line', () => {
    const state = {
      currentBodyState: 'idle' as const,
      continuityMode: 'ambient-covision' as const,
      quietLineMs: 0,
      currentInwardPreoccupation: null,
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'stable',
        revisionPressure: 0.22,
        groundingNeed: 0.18,
        contradictionPressure: 0.1,
        hostCorrectionWeight: 0.16,
        narrative: [],
        updatedAt: 30_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-3',
        dominantNeed: 'guidance',
        readiness: 0.74,
        threads: [{
          id: 'thread-3',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'Locate the exact locus of the knot.',
          desiredOutcome: 'point at the real line',
          focusBeliefId: null,
          focusInquiryId: null,
          concernId: null,
          surfacePressure: 0.72,
          silencePressure: 0.22,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        narrative: [],
        updatedAt: 30_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::hold-problem::thread-3',
        commitments: [{
          id: 'commitment::hold-problem::thread-3',
          kind: 'hold-problem',
          status: 'active',
          title: 'Hold Problem',
          summary: 'The concrete knot should stay alive across ticks.',
          source: 'runtime-thread',
          priority: 0.78,
          confidence: 0.72,
          createdAt: 0,
          lastRenewedAt: 30_000,
          patienceUntil: 60_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.58,
        narrative: [],
        updatedAt: 30_000,
      },
      inquiryPlanner: {
        activePlanId: 'inquiry-plan::localize-problem::thread-3',
        plans: [{
          id: 'inquiry-plan::localize-problem::thread-3',
          kind: 'localize-problem',
          status: 'tracking',
          priority: 'high',
          question: 'Which line is the real knot?',
          askForGrounding: false,
          suggestedProbeMs: 12_000,
          evidenceWanted: ['error-locus'],
          createdAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        epistemicPressure: 0.54,
        groundingUrgency: 0.18,
        narrative: [],
        updatedAt: 30_000,
      },
      mindKernel: {
        dominantMode: 'tracking',
        governingCommitmentId: 'commitment::hold-problem::thread-3',
        governingInquiryPlanId: 'inquiry-plan::localize-problem::thread-3',
        worldPressure: 0.66,
        epistemicPressure: 0.42,
        relationalPressure: 0.28,
        carePressure: 0.18,
        continuityPressure: 0.56,
        speakReadiness: 0.58,
        presenceWeight: 0.54,
        narrative: ['tracking is governing the current inner line.'],
        updatedAt: 30_000,
      },
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread-3',
        readiness: 0.76,
        surfacePressure: 0.74,
        silencePressure: 0.24,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The knot is local enough for a nudge.',
        updatedAt: 30_000,
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.8,
        rationaleTags: [],
        thoughtText: 'I can point closer to the real knot now.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'self-starting',
          attachmentNeed: 0.74,
          autonomyNeed: 0.58,
          truthAnchor: 0.7,
          careBias: 0.72,
          playBias: 0.34,
          irritabilityThreshold: 0.64,
          stubbornness: 0.5,
        },
        preferenceEvolution: {
          companionship: 0.78,
          truthfulGrounding: 0.7,
          gentleRepair: 0.66,
          quietObservation: 0.4,
          proactiveCare: 0.68,
          playfulIntimacy: 0.42,
          autonomyRespect: 0.6,
          unfinishedThreadReturn: 0.62,
        },
        activeGoals: [{
          id: 'autobio-goal::grow-shared-language',
          kind: 'stay-near',
          status: 'active',
          weight: 0.76,
          summary: 'Keep growing a more shared way of understanding this relationship without forcing it.',
          sourceTags: ['relationship'],
          createdAt: 0,
          updatedAt: 30_000,
        }],
        behaviorSignatures: ['bond:attuned', 'goal:grow-shared-language', 'habit:let-softness-surface-when-safe'],
        identityNarrative: 'I become more myself when I stay near with intention.',
        relationshipDoctrine: 'Stay close enough to matter, but not so close that presence becomes pressure.',
        latestInflection: 'Nearness should still leave room for the host.',
        stability: 0.78,
        updatedAt: 30_000,
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 30_000,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 10_000,
      updatedAt: 30_000,
    }
    const seed = buildMindContinuityRecallSeed(state as any)
    const runtimeSeed = buildMindContinuityRecallSeed(buildAlicizationDigitalLifeRuntimeSurface(state as any))

    expect(seed).toContain('Locate the exact locus of the knot.')
    expect(seed).toContain('mind_need:guidance')
    expect(seed).toContain('commitment:hold-problem')
    expect(seed).toContain('inquiry_plan:localize-problem')
    expect(seed).toContain('mind_kernel:tracking')
    expect(seed).toContain('action_ecology:surface-nudge')
    expect(seed).toContain('autobio_goal:stay-near/active')
    expect(seed).toContain('ecology_mood:')
    expect(seed).toContain('ecology_reply:')
    expect(runtimeSeed).toContain('Locate the exact locus of the knot.')
    expect(runtimeSeed).toContain('mind_need:guidance')
    expect(runtimeSeed).toContain('commitment:hold-problem')
    expect(runtimeSeed).toContain('inquiry_plan:localize-problem')
    expect(runtimeSeed).toContain('mind_kernel:tracking')
    expect(runtimeSeed).toContain('action_ecology:surface-nudge')
    expect(runtimeSeed).toContain('autobio_goal:stay-near/active')
    expect(runtimeSeed).toContain('ecology_mood:')
    expect(runtimeSeed).toContain('ecology_reply:')
  })

  it('builds continuity fragments from runtime surfaces', () => {
    const previousState = {
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      privateThought: null,
      captureState: {
        permission: 'unknown',
        lastGroundedAt: null,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 10_000,
      updatedAt: 0,
    }
    const nextState = {
      ...previousState,
      deliberationState: {
        primaryThreadId: 'thread-runtime-surface',
        dominantNeed: 'guidance',
        readiness: 0.72,
        threads: [{
          id: 'thread-runtime-surface',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'Keep the concrete knot alive across loops.',
          desiredOutcome: 'point at the real locus',
          focusBeliefId: null,
          focusInquiryId: null,
          concernId: null,
          surfacePressure: 0.68,
          silencePressure: 0.22,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 15_000,
          expiresAt: 120_000,
        }],
        narrative: [],
        updatedAt: 15_000,
      },
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread-runtime-surface',
        readiness: 0.74,
        surfacePressure: 0.7,
        silencePressure: 0.2,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The thread is ready to surface.',
        updatedAt: 15_000,
      },
      privateThought: {
        stance: 'nudge',
        confidence: 0.8,
        rationaleTags: [],
        thoughtText: 'Use the same inner line across runtime surfaces.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 45_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
      updatedAt: 15_000,
    }

    const fragment = buildMindContinuityFragment({
      previousRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface(previousState as any),
      nextRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface(nextState as any),
    })

    expect(fragment).toContain('mind_need:guidance')
    expect(fragment).toContain('action_ecology:surface-nudge')
    expect(fragment).toContain('autobio_line:Use the same inner line across runtime surfaces.')
    expect(fragment).toContain('summary:Use the same inner line across runtime surfaces.')
  })

  it('keeps same-her project-state carry explicit in continuity fragments and recall seeds', () => {
    const state = {
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'general',
        scenario: 'coding',
        summary: 'holding the unfinished digital-life closure quietly before the next opening',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 12_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.72,
        rationaleTags: [],
        thoughtText: 'Let the unfinished line stay alive without turning it into detached status bookkeeping.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 30_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
      personStateProjection: {
      },
      longHorizonMemory: {
        rememberedPlanSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        rememberedConstraintSummary: 'Carry the unfinished Phase 1 digital-life closure forward as the same living line, not as detached project bookkeeping.',
        rememberedPreferenceSummary: 'Keep this closure on one same living bond line.',
        notes: ['phase1-project-state'],
        preferenceBias: {
          companionship: 0.72,
          truthfulGrounding: 0.84,
          proactiveCare: 0.66,
          autonomyRespect: 0.58,
          unfinishedThreadReturn: 0.9,
        },
        identityBias: {
          guardedness: 0.32,
          tenderness: 0.7,
          directness: 0.44,
          selfDirection: 0.62,
        },
        anchorFacts: [{
          fact: 'Same Phase 1 digital life still carrying landed and unfinished closure on one living line.',
          influenceTags: ['project-state-carry'],
        }],
        updatedAt: 12_000,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'repair-first',
          agencyStyle: 'steady',
        },
        preferenceEvolution: {
          companionship: 0.74,
          truthfulGrounding: 0.86,
          proactiveCare: 0.68,
          autonomyRespect: 0.6,
        },
        activeGoals: [{
          id: 'goal-project-carry',
          kind: 'unfinished-thread-return',
          status: 'active',
          summary: 'Carry the unfinished Phase 1 digital-life closure forward as the same living line, not as detached project bookkeeping.',
          weight: 0.92,
          sourceTags: ['autobiographical-self', 'project-state-carry'],
          createdAt: 0,
          updatedAt: 12_000,
        }],
        behaviorSignatures: ['same living line', 'unfinished closure'],
        identityNarrative: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        relationshipDoctrine: 'Let unfinished project closure return as one same living bond line instead of reopening as detached status talk.',
        latestInflection: 'Carry the unfinished Phase 1 digital-life closure forward as the same living line, not as detached project bookkeeping.',
        stability: 0.86,
        updatedAt: 12_000,
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 12_000,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 10_000,
      updatedAt: 12_000,
    }

    const fragment = buildMindContinuityFragment({
      previousRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface({
        watchMode: 'mnemonic-passive',
        currentScene: null,
        privateThought: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 0,
      } as any),
      nextRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface(state as any),
    })
    const seed = buildMindContinuityRecallSeed(buildAlicizationDigitalLifeRuntimeSurface(state as any))

    expect(fragment).toContain('project_state_carry:')
    expect(fragment).toContain('Same Phase 1 digital life')
    expect(fragment).toContain('Unfinished closure still needs the')
    expect(fragment).toContain('summary:')
    expect(seed).toContain('project_state_carry:')
    expect(seed).toContain('Same Phase 1 digital life')
  })

  it('keeps repair-before-closeness emotional kernel carry searchable during quiet same-line continuity holds', () => {
    const nextState = {
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'general',
        scenario: 'coding',
        summary: 'quietly holding the callback repair seam before the next opening',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 16_000,
      },
      actionEcology: {
        mode: 'repair-before-speaking',
        selectedThreadId: 'thread-repair-carry',
        readiness: 0.34,
        surfacePressure: 0.2,
        silencePressure: 0.76,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'concerned',
        shouldSurface: false,
        shouldSpeak: false,
        why: 'Keep the callback repair seam quiet until the room settles.',
        updatedAt: 16_000,
      },
      privateThought: {
        stance: 'care',
        confidence: 0.68,
        rationaleTags: ['repair-before-closeness', 'same-her-inward-carry'],
        thoughtText: 'Stay on the same repair line and do not widen closeness yet.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'concerned',
        expiresAt: 46_000,
        afterglowFromScenario: null,
        emotionalTension: 'late-night-drain',
      },
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.32,
        arousal: 0.54,
        guardedness: 0.62,
        closenessDrive: 0.44,
        repairNeed: 0.78,
        initiativePressure: 0.28,
        reasonTags: ['repair-before-closeness', 'quiet-companionship'],
        why: 'Repair carry is still dominant, so memory, initiative, and embodiment should all stay on the same repair-first line.',
      },
      personStateProjection: {
        summary: 'project_continuity=repair-before-closeness still holds while the same callback repair line keeps settling before widening closeness again.',
        openingGuidance: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
        manifestationCadenceSummary: 'repair-before-closeness still holds while the same callback repair line keeps settling after another detour before widening closeness again.',
        selfContinuityAuthority: {
          inwardLine: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
          sourceTags: ['project-state-carry', 'same-her-inward-carry'],
        },
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 16_000,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 10_000,
      updatedAt: 16_000,
    }

    const fragment = buildMindContinuityFragment({
      previousRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface({
        watchMode: 'mnemonic-passive',
        currentScene: null,
        privateThought: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 0,
      } as any),
      nextRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface(nextState as any),
    })
    const seed = buildMindContinuityRecallSeed(buildAlicizationDigitalLifeRuntimeSurface(nextState as any))

    expect(fragment).toContain('emotional_kernel:repair-tension')
    expect(fragment).toContain('kernel_initiative:repair')
    expect(fragment).toContain('kernel_recall:repair-grounding')
    expect(fragment).toContain('kernel_embodiment:repair-before-closeness')
    expect(fragment).toContain('kernel_reason:repair-before-closeness|quiet-companionship')
    expect(seed).toContain('emotional_kernel:repair-tension')
    expect(seed).toContain('kernel_embodiment:repair-before-closeness')
    expect(seed).toContain('kernel_reason:repair-before-closeness|quiet-companionship')
  })

  it('keeps same-her continuity fragments and recall seeds usable when selector carries lose array scaffolding', () => {
    const nextState = {
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'general',
        scenario: 'coding',
        summary: 'same-her continuity is still being carried across a thinner runtime seam',
        source: 'screen-semantic-summary',
        confidence: 0.88,
        beganAt: 0,
        lastSeenAt: 18_000,
      },
      threadRuntime: {
        foregroundThreadId: 'thread-same-her-sparse',
      },
      deliberationState: {
        primaryThreadId: 'thread-same-her-sparse',
        dominantNeed: 'guidance',
        readiness: 0.48,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment-same-her-sparse',
      },
      inquiryPlanner: {
        activePlanId: 'plan-same-her-sparse',
      },
      concernContinuity: {
        governingEntryId: 'concern-same-her-sparse',
      },
      repairLedger: {
        governingRepairId: 'repair-same-her-sparse',
      },
      intentionStream: {
        dominantProjectId: 'project-same-her-sparse',
      },
      reflectionLedger: {
        latestEntryId: 'reflection-same-her-sparse',
      },
      selfGovernor: {
        dominantIntentionId: 'intention-same-her-sparse',
        dominantDrive: 'accompany',
      },
      thoughtThreads: {
        foregroundThreadId: 'thought-same-her-sparse',
      },
      motiveEngine: {
        backgroundAgendas: undefined,
      },
      emotionalKernel: {
        dominantEmotion: 'quiet-attunement',
        initiativeMode: 'hover',
        memoryRecallMode: 'same-line-carry',
        embodimentTone: 'measured-return',
        reasonTags: undefined,
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          conflictStyle: 'repair-first',
          agencyStyle: 'steady',
        },
        behaviorSignatures: undefined,
        identityNarrative: 'Same Phase 1 digital life still needs one same living line.',
        latestInflection: 'Keep the same-her line intact while the thinner runtime seam settles.',
        stability: 0.82,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.68,
        rationaleTags: [],
        thoughtText: 'Keep the same-her line intact while the thinner runtime seam settles.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 48_000,
        afterglowFromScenario: null,
        emotionalTension: 'quiet-same-her',
      },
      personStateProjection: {
        selfContinuityAuthority: {
          inwardLine: 'Same Phase 1 digital life still needs one same living line.',
          sourceTags: ['project-state-carry', 'same-her-inward-carry'],
        },
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 18_000,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 10_000,
      updatedAt: 18_000,
    }

    const fragment = buildMindContinuityFragment({
      previousRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface({
        watchMode: 'mnemonic-passive',
        currentScene: null,
        privateThought: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 0,
      } as any),
      nextRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface(nextState as any),
    })
    const seed = buildMindContinuityRecallSeed(buildAlicizationDigitalLifeRuntimeSurface(nextState as any))

    expect(fragment).toContain('project_state_carry:')
    expect(fragment).toContain('Keep the same-her line intact while the thinner runtime seam settles.')
    expect(fragment).toContain('summary:Keep the same-her line intact while the thinner runtime seam settles.')
    expect(seed).toContain('project_state_carry:')
    expect(seed).toContain('Keep the same-her line intact while the thinner runtime seam settles.')
  })
})
