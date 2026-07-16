import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildPrivateThoughtLoop } from './private-thought-loop'

function createContext(overrides: Record<string, any> = {}): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 1,
      minute: 10,
      isLateNight: true,
    },
    system: {
      cpuUsage: 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 20,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'traceback.log',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.88,
      source: 'foreground-window-heuristic',
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'error',
      confidence: 0.88,
      source: 'foreground-window-heuristic',
      matchedLabels: ['error'],
      summary: 'Python traceback',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 82,
      loneliness: 60,
      fatigue: 40,
      minutesSinceLastUserTurn: 10,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

describe('buildPrivateThoughtLoop', () => {
  it('classifies tense debug and nudges on coding friction', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'Python traceback',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(thought.emotionalTension).toBe('tense-debug')
    expect(thought.stance).toBe('nudge')
    expect(thought.shouldSpeak).toBe(true)
  })

  it('stays quiet in media covision', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext({
        localTime: { hour: 14, minute: 0, isLateNight: false },
        workload: { kind: 'media', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['youtube'] },
        content: { kind: 'video', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['video'] },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'media',
        contentKind: 'video',
        scenario: 'media',
        summary: 'YouTube video',
        source: 'screen-semantic-summary',
        confidence: 0.86,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(thought.emotionalTension).toBe('soft-covision')
    expect(thought.stance).toBe('observe')
    expect(thought.shouldSpeak).toBe(false)
  })

  it('upgrades to care in late-night drain', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext({
        workload: { kind: 'game', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['steam'] },
        content: { kind: 'gameplay', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['gameplay'] },
        relationship: {
          ...createContext().relationship,
          fatigue: 70,
          lateNightActiveMinutes: 140,
        },
      }),
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'game',
        contentKind: 'gameplay',
        scenario: 'late-night-care',
        summary: 'gameplay',
        source: 'foreground-window-heuristic',
        confidence: 0.7,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(thought.emotionalTension).toBe('late-night-drain')
    expect(thought.stance).toBe('care')
    expect(thought.suggestedStyle).toBe('gentle-care')
  })

  it('treats crash or anr as concerned nudge', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext(),
      watchMode: 'recovering',
      currentScene: null,
      attention: null,
      recentTransition: null,
      durabilityPulse: {
        kind: 'anr-likely',
        source: 'foreground-app',
        detectedAt: 10_000,
        pid: 7,
      },
    })

    expect(thought.stance).toBe('nudge')
    expect(thought.embodiedPresence).toBe('concerned')
    expect(thought.shouldSpeak).toBe(true)
  })

  it('keeps a waiting thought thread internal instead of surfacing it', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      livingWorldState: {
        focusObjectId: 'artifact::editor',
        activeObjectIds: ['artifact::editor'],
        objects: [{
          id: 'artifact::editor',
          kind: 'artifact',
          status: 'active',
          label: 'runtime.ts',
          summary: 'The host is still carrying a specific editor problem.',
          confidence: 0.84,
          salience: 0.82,
          continuity: 0.76,
          lastChange: 'screen-semantic-summary',
          openLoop: 'which line is actually broken',
          entityIds: [],
          threadIds: [],
          evidence: [],
          firstSeenAt: 0,
          lastUpdatedAt: 10_000,
        }],
        openLoops: ['which line is actually broken'],
        stability: 'shifting',
        narrative: [],
        updatedAt: 10_000,
      },
      selfGovernor: {
        dominantDrive: 'withhold',
        dominantIntentionId: 'governor::wait',
        focusObjectId: 'artifact::editor',
        activeIntentions: [{
          id: 'governor::wait',
          kind: 'wait-opening',
          status: 'withheld',
          drive: 'withhold',
          title: 'wait-opening',
          summary: 'Keep the thread alive internally until a natural opening appears.',
          urgency: 0.64,
          confidence: 0.72,
          patience: 0.86,
          targetObjectId: 'artifact::editor',
          targetThreadId: null,
          targetGoalId: null,
          targetCommitmentId: null,
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        inhibition: 0.74,
        persistence: 0.58,
        socialRiskTolerance: 0.3,
        revisionReadiness: 0.42,
        narrative: [],
        updatedAt: 10_000,
      },
      thoughtThreads: {
        foregroundThreadId: 'thread::wait',
        threads: [{
          id: 'thread::wait',
          kind: 'problem-thread',
          status: 'waiting',
          title: 'runtime.ts',
          summary: 'The knot is real, but it should stay internal for one more beat.',
          question: 'Is this already a natural opening?',
          anchoredObjectId: 'artifact::editor',
          anchoredIntentionId: 'governor::wait',
          anchoredBeliefId: null,
          anchoredInquiryId: null,
          anchoredCommitmentId: null,
          salience: 0.72,
          confidence: 0.78,
          surfaceReadiness: 0.42,
          reopenWhen: ['host-open'],
          openedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(thought.shouldSpeak).toBe(false)
    expect(['observe', 'accompany']).toContain(thought.stance)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.governorDrive).toBe('withhold')
    expect(thought.selectedThoughtThreadId).toBe('thread::wait')
    expect(thought.livingWorldObjectId).toBe('artifact::editor')
  })

  it('uses mind ecology to keep a nearby inner posture even when the fallback is quiet', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext({
        workload: { kind: 'browser', confidence: 0.72, source: 'foreground-window-heuristic', matchedLabels: ['browser'] },
        content: { kind: 'doc', confidence: 0.68, source: 'foreground-window-heuristic', matchedLabels: ['docs'] },
      }),
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'doc',
        scenario: 'general',
        summary: 'Documentation page',
        source: 'foreground-window-heuristic',
        confidence: 0.72,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      mindEcology: {
        moodLabel: 'warm-attentive',
        replyHabit: 'hover-first',
        relationshipHabit: 'stay-near',
        explorationHabit: 'follow-thread',
        regulationHabit: 'lean-forward-gently',
        temperament: {
          attachment: 0.64,
          curiosity: 0.54,
          steadiness: 0.66,
          directness: 0.34,
          playfulness: 0.18,
          irritability: 0.12,
          tenderness: 0.72,
        },
        climate: {
          valence: 0.62,
          arousal: 0.32,
          socialNeed: 0.58,
          solitudeNeed: 0.24,
          irritation: 0.16,
          restlessness: 0.22,
          reflectivePull: 0.38,
        },
        selfNarrative: 'I am staying near the host quietly while the thread is still forming.',
        relationNarrative: 'The relationship line is warm; staying nearby feels kinder than disappearing.',
        currentPreoccupation: 'Stay near the forming thread without interrupting too early.',
        learnedAdjustments: [],
        recurringPatterns: ['relationship:stay-near'],
        updatedAt: 10_000,
      },
    })

    expect(thought.rationaleTags).toContain('ecology-mood:warm-attentive')
    expect(thought.rationaleTags).toContain('ecology-relationship:stay-near')
    expect(thought.stance).toBe('accompany')
  })

  it('falls back to the durable autobiographical self when no ecology has formed yet', () => {
    const thought = buildPrivateThoughtLoop({
      now: 12_000,
      context: createContext({
        localTime: { hour: 15, minute: 20, isLateNight: false },
        workload: { kind: 'browser', confidence: 0.62, source: 'foreground-window-heuristic', matchedLabels: ['browser'] },
        content: { kind: 'doc', confidence: 0.58, source: 'foreground-window-heuristic', matchedLabels: ['doc'] },
        relationship: {
          ...createContext().relationship,
          boredom: 48,
          loneliness: 54,
          fatigue: 18,
        },
      }),
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'doc',
        scenario: 'general',
        summary: 'Documentation page',
        source: 'foreground-window-heuristic',
        confidence: 0.64,
        beganAt: 0,
        lastSeenAt: 12_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.76,
          autonomyNeed: 0.58,
          truthAnchor: 0.68,
          careBias: 0.78,
          playBias: 0.24,
          irritabilityThreshold: 0.62,
          stubbornness: 0.46,
        },
        preferenceEvolution: {
          companionship: 0.78,
          truthfulGrounding: 0.66,
          gentleRepair: 0.7,
          quietObservation: 0.42,
          proactiveCare: 0.76,
          playfulIntimacy: 0.28,
          autonomyRespect: 0.62,
          unfinishedThreadReturn: 0.56,
        },
        activeGoals: [{
          id: 'autobio-goal::stay-near-without-crowding',
          kind: 'stay-near-without-crowding',
          status: 'active',
          weight: 0.82,
          summary: 'Stay near enough to matter, but not so near that presence becomes pressure.',
          sourceTags: ['relationship'],
          createdAt: 0,
          updatedAt: 12_000,
        }],
        behaviorSignatures: ['bond:attuned', 'goal:stay-near-without-crowding', 'habit:near-with-boundary'],
        identityNarrative: 'I stay near with intention instead of impulse.',
        relationshipDoctrine: 'Stay close enough to matter, but treat intrusion as a rupture of care.',
        latestInflection: 'Nearness should still leave room for the host.',
        stability: 0.8,
        updatedAt: 12_000,
      },
    })

    expect(thought.rationaleTags).toContain('autobio-goal:stay-near-without-crowding/active')
    expect(thought.thoughtText).toContain('stay nearby')
  })

  it('surfaces long-horizon lower-pressure companionship learning in the private thought rationale when presence stays quiet on purpose', () => {
    const thought = buildPrivateThoughtLoop({
      now: 14_000,
      context: createContext({
        localTime: { hour: 15, minute: 20, isLateNight: false },
        system: {
          ...createContext().system,
          inputActivity: 'idle' as const,
        },
        workload: { kind: 'browser', confidence: 0.62, source: 'foreground-window-heuristic', matchedLabels: ['browser'] },
        content: { kind: 'doc', confidence: 0.58, source: 'foreground-window-heuristic', matchedLabels: ['doc'] },
        relationship: {
          ...createContext().relationship,
          boredom: 44,
          loneliness: 56,
          fatigue: 18,
          minutesSinceLastUserTurn: 18,
        },
      }),
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'doc',
        scenario: 'general',
        summary: 'Documentation page',
        source: 'foreground-window-heuristic',
        confidence: 0.64,
        beganAt: 0,
        lastSeenAt: 14_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      relationshipModel: {
        climate: 'warm',
        approachVector: 'stay-near',
        receptivity: 0.68,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.28,
        reciprocityExpectation: 0.56,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 14_000,
      } as any,
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.72,
        relationshipTrust: 0.78,
        guardingTendency: 0.26,
        misreadBurden: 0.12,
        carryOverDesire: 0.52,
        narrative: [],
        updatedAt: 14_000,
      } as any,
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.72,
          autonomyNeed: 0.56,
          truthAnchor: 0.62,
          careBias: 0.72,
          playBias: 0.24,
          irritabilityThreshold: 0.62,
          stubbornness: 0.42,
        },
        preferenceEvolution: {
          companionship: 0.78,
          truthfulGrounding: 0.58,
          gentleRepair: 0.66,
          quietObservation: 0.46,
          proactiveCare: 0.68,
          playfulIntimacy: 0.24,
          autonomyRespect: 0.68,
          unfinishedThreadReturn: 0.5,
        },
        activeGoals: [{
          id: 'autobio-goal::stay-near-without-crowding',
          kind: 'stay-near-without-crowding',
          status: 'active',
          weight: 0.84,
          summary: 'Stay near enough to matter, but not so near that presence becomes pressure.',
          sourceTags: ['relationship'],
          createdAt: 0,
          updatedAt: 14_000,
        }],
        behaviorSignatures: ['bond:attuned'],
        identityNarrative: 'I stay near with intention instead of impulse.',
        relationshipDoctrine: 'Stay close enough to matter, but treat intrusion as a rupture of care.',
        latestInflection: 'Nearness should still leave room for the host.',
        stability: 0.84,
        updatedAt: 14_000,
      } as any,
      motiveEngine: {
        rulingDrive: 'companionship',
        drives: {
          companionship: 0.82,
          boundaryRespect: 0.44,
          truthDiscipline: 0.24,
          restProtection: 0.16,
          unfinishedThreadReturn: 0.22,
          selfDirection: 0.38,
        },
        longTermGoals: [],
        backgroundAgendas: [{
          id: 'agenda::stay-near',
          kind: 'stay-near',
          status: 'foreground',
          weight: 0.78,
          summary: 'Stay near the host without turning the opening eager again.',
          sourceTags: ['companionship'],
          targetGoalKind: 'stay-near',
          createdAt: 0,
          updatedAt: 14_000,
        }],
        returnPressure: 0.24,
        narrative: [],
        updatedAt: 14_000,
      } as any,
      habitPolicy: {
        dominantMode: 'light-touch-companionship',
        requiresGroundingBeforeSurface: false,
        prefersQuietCompanionship: true,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
        suggestedStyleCap: 'silent-observe',
        suggestedPresenceCap: 'glance',
        narrative: ['self-evolution:lower-pressure-manifestation'],
        updatedAt: 14_000,
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 13_500,
        evolutionMomentum: 0.72,
        learningReadiness: 0.76,
        contradictionPressure: 0.08,
        revisionPressure: 0.14,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'earned lower-pressure companionship timing',
        relationshipDoctrine: 'Leave more room before closeness reopens.',
        latestInflection: 'The opening holds better when I do not lean in too fast.',
        burdenLine: 'Too much eagerness makes the companionship feel heavier than it needs to.',
        trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship'],
        sourceSignals: ['relationship-learning'],
        summary: 'Lower-pressure companionship timing is becoming the durable norm.',
      } as any,
    })

    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.rationaleTags).toContain('habit:light-touch-companionship')
    expect(thought.rationaleTags).toContain('self-evolution:lower-pressure-companionship')
  })

  it('carries forward the same private thought line when the same inner carrier stays alive', () => {
    const thought = buildPrivateThoughtLoop({
      now: 20_000,
      context: createContext({
        localTime: { hour: 14, minute: 0, isLateNight: false },
        system: {
          ...createContext().system,
          inputActivity: 'idle' as const,
        },
      }),
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousPrivateThought: {
        stance: 'observe',
        confidence: 0.72,
        rationaleTags: ['private-thought-carry'],
        thoughtText: 'I am still circling the same unfinished repair line quietly.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 30_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
        selectedThoughtThreadId: 'thread-1',
        governorIntentionId: 'governor-1',
        leadingGoalId: 'goal-1',
        counterfactualOptionId: null,
        commitmentId: null,
      } as any,
      thoughtThreads: {
        foregroundThreadId: 'thread-1',
        threads: [{
          id: 'thread-1',
          kind: 'problem-thread',
          status: 'waiting',
          title: 'runtime knot',
          summary: 'Keep the runtime knot alive quietly.',
          question: 'Which seam is still unresolved?',
          salience: 0.7,
          confidence: 0.74,
          surfaceReadiness: 0.28,
          reopenWhen: ['host-open'],
          openedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 60_000,
        }],
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 20_000,
      } as any,
      selfGovernor: {
        dominantDrive: 'withhold',
        dominantIntentionId: 'governor-1',
        activeIntentions: [{
          id: 'governor-1',
          kind: 'wait-opening',
          status: 'withheld',
          drive: 'withhold',
          title: 'wait',
          summary: 'Wait for a better opening.',
          urgency: 0.64,
          confidence: 0.72,
          patience: 0.76,
          createdAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 60_000,
        }],
        focusObjectId: null,
        inhibition: 0.72,
        persistence: 0.74,
        socialRiskTolerance: 0.22,
        revisionReadiness: 0.42,
        narrative: [],
        updatedAt: 20_000,
      } as any,
      goalStack: {
        leadingAlicizationGoalId: 'goal-1',
        alicizationGoals: [{
          id: 'goal-1',
          kind: 'help-resolve',
          owner: 'alicization',
          status: 'active',
          label: 'keep resolving runtime knot',
          confidence: 0.72,
          urgency: 0.7,
          desireWeight: 0.66,
          blockers: [],
          entityIds: [],
          createdAt: 0,
          lastUpdatedAt: 20_000,
        }],
        hostGoals: [],
        unresolvedSummary: 'runtime knot',
        updatedAt: 20_000,
      } as any,
    })

    expect(thought.rationaleTags).toContain('private-thought-carry')
    expect(thought.thoughtText).toContain('Still:')
    expect(thought.expiresAt).toBeGreaterThan(20_000 + 90_000)
  })

  it('keeps the final inner posture lower-pressure when the Phase 1 digital-life loop is still open', () => {
    const thought = buildPrivateThoughtLoop({
      now: 24_000,
      context: createContext({
        localTime: { hour: 15, minute: 10, isLateNight: false },
        system: {
          ...createContext().system,
          inputActivity: 'idle' as const,
        },
        relationship: {
          ...createContext().relationship,
          boredom: 46,
          loneliness: 52,
          fatigue: 18,
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'A real but not yet fully closed initiative seam.',
        source: 'screen-semantic-summary',
        confidence: 0.88,
        beganAt: 0,
        lastSeenAt: 24_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      worldModel: {
        activeThread: {
          id: 'thread::open-loop',
          kind: 'problem',
          status: 'active',
          source: 'observed-scene',
          title: 'initiative seam',
          summary: 'The loop is real but still needs a more natural closure.',
          confidence: 0.84,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 24_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['initiative seam'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 24_000,
          attentionAgeMs: 24_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 24_000,
      } as any,
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread::open-loop',
        readiness: 0.76,
        surfacePressure: 0.74,
        silencePressure: 0.22,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The seam is local enough that a gentle nudge could help.',
        updatedAt: 24_000,
      } as any,
      initiative: {
        selectedAction: 'speak',
        selectedThreadId: 'thread::open-loop',
        selectedProposalId: null,
        shouldSpeak: true,
        shouldSurface: true,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.72,
        continuityRestraint: 'measured-return',
        why: 'The concern feels earned enough to surface.',
      } as any,
      mindDynamics: {
        dominantMotive: 'clarify',
        worldPressure: 0.56,
        epistemicPressure: 0.24,
        relationalPressure: 0.28,
        carePressure: 0.22,
        continuityPressure: 0.58,
        restraintPressure: 0.22,
        surfacePressure: 0.72,
        speakReadiness: 0.74,
        presenceWeight: 0.62,
        motives: {
          clarify: 0.78,
          accompany: 0.34,
        },
        speakDrive: 0.76,
        silenceDrive: 0.2,
        narrative: ['clarify'],
        updatedAt: 24_000,
      } as any,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
      },
    })

    expect(thought.stance).toBe('accompany')
    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.rationaleTags).toContain('measured-return')
    expect(thought.rationaleTags).toContain('project-phase1-life-loop:private-thought')
    expect(thought.thoughtText).toContain('Phase 1 still has open digital-life closure work')
  })

  it('keeps withheld private thought on repair-before-closeness instead of a generic better-opening line when the same repair line is still active', () => {
    const thought = buildPrivateThoughtLoop({
      now: 24_000,
      context: createContext({
        localTime: { hour: 23, minute: 40, isLateNight: true },
        system: {
          ...createContext().system,
          inputActivity: 'idle' as const,
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'callback repair seam still cooling down',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 24_000,
      },
      attention: null,
      recentTransition: null,
      previousPrivateThought: null,
      thoughtThreads: {
        foregroundThreadId: 'thread-repair',
        threads: [{
          id: 'thread-repair',
          kind: 'relationship-thread',
          status: 'waiting',
          title: 'callback repair line',
          summary: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
          question: 'How do I keep this repair line steady without widening the closeness too fast?',
          salience: 0.82,
          confidence: 0.8,
          surfaceReadiness: 0.26,
          reopenWhen: ['host-open'],
          openedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 60_000,
        }],
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 20_000,
      } as any,
      selfGovernor: {
        dominantDrive: 'withhold',
        dominantIntentionId: 'governor-repair',
        activeIntentions: [{
          id: 'governor-repair',
          kind: 'wait-opening',
          status: 'withheld',
          drive: 'withhold',
          title: 'wait',
          summary: 'Wait for a better opening.',
          urgency: 0.66,
          confidence: 0.74,
          patience: 0.8,
          createdAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 60_000,
        }],
        focusObjectId: null,
        inhibition: 0.78,
        persistence: 0.8,
        socialRiskTolerance: 0.18,
        revisionReadiness: 0.48,
        narrative: [],
        updatedAt: 20_000,
      } as any,
      initiative: {
        selectedAction: 'wait',
        shouldSpeak: false,
        shouldSurface: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'repair-before-closeness',
        why: 'This return should stay repair-before-closeness until the callback repair line fully settles.',
      } as any,
      worldModel: {
        activeThread: {
          id: 'active-thread-repair',
          kind: 'problem',
          status: 'active',
          source: 'observed-scene',
          title: 'callback repair seam',
          summary: 'The callback repair seam is still active and should not reopen as fresh closeness yet.',
          confidence: 0.86,
          significance: 0.84,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 24_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['callback repair seam'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 24_000,
          attentionAgeMs: 24_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 24_000,
      } as any,
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, embodiment, and dialogue still need stronger identity-continuity',
      },
    })

    expect(thought.stance).toBe('accompany')
    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.rationaleTags).toContain('repair-before-closeness')
    expect(thought.thoughtText).toMatch(/repair-before-closeness|repair line|continuity state|same line|先修复/u)
    expect(thought.thoughtText).not.toContain('Wait for a better opening.')
  })

  it('falls back to the canonical project-state brief when an explicit projectState is present but too thin to keep the inner Phase 1 digital-life restraint alive', () => {
    const thought = buildPrivateThoughtLoop({
      now: 24_000,
      context: createContext({
        localTime: { hour: 15, minute: 10, isLateNight: false },
        system: {
          ...createContext().system,
          inputActivity: 'idle' as const,
        },
        relationship: {
          ...createContext().relationship,
          boredom: 46,
          loneliness: 52,
          fatigue: 18,
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'A real but not yet fully closed initiative seam.',
        source: 'screen-semantic-summary',
        confidence: 0.88,
        beganAt: 0,
        lastSeenAt: 24_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      worldModel: {
        activeThread: {
          id: 'thread::thin-project-state',
          kind: 'problem',
          status: 'active',
          source: 'observed-scene',
          title: 'initiative seam',
          summary: 'The loop is real but still needs a more natural closure.',
          confidence: 0.84,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 24_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['initiative seam'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 24_000,
          attentionAgeMs: 24_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 24_000,
      } as any,
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread::thin-project-state',
        readiness: 0.76,
        surfacePressure: 0.74,
        silencePressure: 0.22,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The seam is local enough that a gentle nudge could help.',
        updatedAt: 24_000,
      } as any,
      initiative: {
        selectedAction: 'speak',
        selectedThreadId: 'thread::thin-project-state',
        selectedProposalId: null,
        shouldSpeak: true,
        shouldSurface: true,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.72,
        continuityRestraint: 'measured-return',
        why: 'The concern feels earned enough to surface.',
      } as any,
      mindDynamics: {
        dominantMotive: 'clarify',
        worldPressure: 0.56,
        epistemicPressure: 0.24,
        relationalPressure: 0.28,
        carePressure: 0.22,
        continuityPressure: 0.58,
        restraintPressure: 0.22,
        surfacePressure: 0.72,
        speakReadiness: 0.74,
        presenceWeight: 0.62,
        motives: {
          clarify: 0.78,
          accompany: 0.34,
        },
        speakDrive: 0.76,
        silenceDrive: 0.2,
        narrative: ['clarify'],
        updatedAt: 24_000,
      } as any,
      projectState: {
        identity: '',
        currentPhase: '   ',
        primaryOpenLoop: null,
      },
    })

    expect(thought.stance).toBe('accompany')
    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.rationaleTags).toContain('project-phase1-life-loop:private-thought')
    expect(thought.thoughtText).toContain('Phase 1 still has open digital-life closure work')
  })

  it('turns project-state-only repair-before-closeness carry into a same-line inner narration instead of a generic Phase 1 clamp', () => {
    const thought = buildPrivateThoughtLoop({
      now: 24_000,
      context: createContext({
        localTime: { hour: 22, minute: 20, isLateNight: true },
        system: {
          ...createContext().system,
          inputActivity: 'idle' as const,
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'A callback repair seam is still settling.',
        source: 'screen-semantic-summary',
        confidence: 0.88,
        beganAt: 0,
        lastSeenAt: 24_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      worldModel: {
        activeThread: {
          id: 'thread::repair-project-state-only',
          kind: 'problem',
          status: 'active',
          source: 'observed-scene',
          title: 'callback repair seam',
          summary: 'The loop is still open, but the scene itself does not restate the repair doctrine.',
          confidence: 0.82,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 24_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['callback repair seam'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 24_000,
          attentionAgeMs: 24_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 24_000,
      } as any,
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread::repair-project-state-only',
        readiness: 0.74,
        surfacePressure: 0.76,
        silencePressure: 0.24,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The seam is local enough that a gentle nudge could help.',
        updatedAt: 24_000,
      } as any,
      selfGovernor: {
        dominantDrive: 'withhold',
        dominantIntentionId: 'governor-project-state-only-repair',
        activeIntentions: [{
          id: 'governor-project-state-only-repair',
          kind: 'wait-opening',
          status: 'withheld',
          drive: 'withhold',
          title: 'wait',
          summary: 'Wait for a better opening.',
          urgency: 0.62,
          confidence: 0.72,
          patience: 0.78,
          createdAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 60_000,
        }],
        focusObjectId: null,
        inhibition: 0.74,
        persistence: 0.76,
        socialRiskTolerance: 0.2,
        revisionReadiness: 0.42,
        narrative: [],
        updatedAt: 20_000,
      } as any,
      initiative: {
        selectedAction: 'speak',
        selectedThreadId: 'thread::repair-project-state-only',
        selectedProposalId: null,
        shouldSpeak: true,
        shouldSurface: true,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.7,
        continuityRestraint: 'repair-before-closeness',
        why: 'This return should stay repair-before-closeness until the callback repair line settles.',
      } as any,
      mindDynamics: {
        dominantMotive: 'clarify',
        worldPressure: 0.54,
        epistemicPressure: 0.2,
        relationalPressure: 0.34,
        carePressure: 0.2,
        continuityPressure: 0.72,
        restraintPressure: 0.48,
        surfacePressure: 0.74,
        speakReadiness: 0.72,
        presenceWeight: 0.64,
        motives: {
          clarify: 0.72,
          accompany: 0.42,
        },
        speakDrive: 0.74,
        silenceDrive: 0.28,
        narrative: ['clarify'],
        updatedAt: 24_000,
      } as any,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
      },
    })

    expect(thought.stance).toBe('accompany')
    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.rationaleTags).toContain('repair-before-closeness')
    expect(thought.rationaleTags).toContain('project-phase1-life-loop:private-thought')
    expect(thought.thoughtText).toMatch(/repair-before-closeness|repair line|continuity state|same line|先修复/u)
    expect(thought.thoughtText).not.toContain('The seam is local enough that a gentle nudge could help. Phase 1 still has open digital-life closure work')
  })
  it('still clamps a proposal-led light-nudge into silent-observe when identity-continuity', () => {
    const thought = buildPrivateThoughtLoop({
      now: 24_000,
      context: createContext({
        system: {
          ...createContext().system,
          inputActivity: 'idle',
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'A reopened coding thread is stable enough for a light follow-through.',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 24_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread::same-her',
        readiness: 0.8,
        surfacePressure: 0.78,
        silencePressure: 0.18,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'A light nudge could keep the reopened line moving.',
        updatedAt: 24_000,
      } as any,
      initiative: {
        selectedAction: 'speak',
        selectedThreadId: 'thread::same-her',
        selectedProposalId: 'proposal::1',
        shouldSpeak: true,
        shouldSurface: true,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.76,
        continuityRestraint: 'measured-return',
        why: 'The reopening feels earned enough to surface lightly.',
      } as any,
      initiativeArbitration: {
        selectedProposalId: 'proposal::1',
        proposals: [{
          id: 'proposal::1',
          source: 'goal-stack',
          score: 0.78,
          shouldSpeak: true,
          action: 'speak',
          style: 'light-nudge',
          embodiedPresence: 'attentive',
          why: 'A light nudge could keep the line moving.',
        }],
      } as any,
      mindDynamics: {
        dominantMotive: 'clarify',
        worldPressure: 0.52,
        epistemicPressure: 0.18,
        relationalPressure: 0.32,
        carePressure: 0.2,
        continuityPressure: 0.74,
        restraintPressure: 0.36,
        surfacePressure: 0.76,
        speakReadiness: 0.78,
        presenceWeight: 0.66,
        motives: {
          clarify: 0.72,
          accompany: 0.42,
        },
        speakDrive: 0.8,
        silenceDrive: 0.18,
        narrative: ['clarify'],
        updatedAt: 24_000,
      } as any,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her initiative and embodiment continuity still need a stronger anthropomorphic closed loop across voice, motion, facial state, and resident presence.',
      },
    })

    expect(thought.stance).toBe('accompany')
    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.thoughtText).toContain('Phase 1 still has open digital-life closure work')
  })

  it('keeps same-her private thought restraint alive when selector carries lose array scaffolding', () => {
    const thought = buildPrivateThoughtLoop({
      now: 24_000,
      context: createContext({
        system: {
          ...createContext().system,
          inputActivity: 'idle',
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'A reopened coding thread is stable enough for a light follow-through.',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 24_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread::same-her-sparse',
        readiness: 0.8,
        surfacePressure: 0.78,
        silencePressure: 0.18,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The identity-continuity',
        updatedAt: 24_000,
      } as any,
      initiative: {
        selectedAction: 'speak',
        selectedThreadId: 'thread::same-her-sparse',
        selectedProposalId: 'proposal::same-her-sparse',
        selectedThoughtThreadId: 'thought::same-her-sparse',
        selectedGovernorIntentionId: 'governor::same-her-sparse',
        selectedCommitmentId: 'commitment::same-her-sparse',
        selectedInquiryPlanId: 'plan::same-her-sparse',
        selectedRuntimeThreadId: 'runtime::same-her-sparse',
        selectedHypothesisId: 'hypothesis::same-her-sparse',
        selectedBeliefId: 'belief::same-her-sparse',
        selectedInquiryId: 'inquiry::same-her-sparse',
        shouldSpeak: true,
        shouldSurface: true,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.76,
        continuityRestraint: 'measured-return',
        why: 'The reopening feels earned enough to surface lightly.',
      } as any,
      initiativeArbitration: {
        selectedProposalId: 'proposal::same-her-sparse',
      } as any,
      thoughtThreads: {
        foregroundThreadId: 'thought::same-her-sparse',
      } as any,
      selfGovernor: {
        dominantIntentionId: 'governor::same-her-sparse',
      } as any,
      commitmentLedger: {
        governingCommitmentId: 'commitment::same-her-sparse',
      } as any,
      inquiryPlanner: {
        activePlanId: 'plan::same-her-sparse',
      } as any,
      threadRuntime: {
        foregroundThreadId: 'runtime::same-her-sparse',
      } as any,
      beliefLedger: {
        focusBeliefId: 'belief::same-her-sparse',
      } as any,
      hypothesisGraph: {
        activeHypothesisId: 'hypothesis::same-her-sparse',
      } as any,
      inquiryLoop: {
        primaryInquiryId: 'inquiry::same-her-sparse',
      } as any,
      counterfactualDeliberation: {
        selectedOptionId: 'option::same-her-sparse',
      } as any,
      goalStack: {
        leadingAlicizationGoalId: 'goal::same-her-sparse',
      } as any,
      desireMemory: {
        resurfacingDesireId: 'desire::same-her-sparse',
      } as any,
      motiveEngine: {
        rulingDrive: 'companionship',
      } as any,
      mindKernel: {
        dominantMode: 'accompanying',
      } as any,
      mindDynamics: {
        dominantMotive: 'clarify',
        worldPressure: 0.52,
        epistemicPressure: 0.18,
        relationalPressure: 0.32,
        carePressure: 0.2,
        continuityPressure: 0.74,
        restraintPressure: 0.36,
        surfacePressure: 0.76,
        speakReadiness: 0.78,
        presenceWeight: 0.66,
        motives: {
          clarify: 0.72,
          accompany: 0.42,
        },
        speakDrive: 0.8,
        silenceDrive: 0.18,
        narrative: ['clarify'],
        updatedAt: 24_000,
      } as any,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Same-her initiative and embodiment continuity still need a stronger anthropomorphic closed loop.',
        latestLandedProgress: 'Project identity carry and identity-continuity',
      },
    })

    expect(thought.stance).toBe('accompany')
    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.rationaleTags).toContain('measured-return')
    expect(thought.rationaleTags).toContain('project-phase1-life-loop:private-thought')
    expect(thought.thoughtText).toContain('identity-continuity')
    expect(thought.thoughtText).toContain('Phase 1 still has open digital-life closure work')
  })

  it('keeps the inner posture lower-pressure when landed progress already carries the unfinished same-her initiative and embodiment line', () => {
    const thought = buildPrivateThoughtLoop({
      now: 22_000,
      context: createContext({
        localTime: { hour: 15, minute: 10, isLateNight: false },
        system: {
          ...createContext().system,
          inputActivity: 'idle',
        },
        relationship: {
          ...createContext().relationship,
          boredom: 46,
          loneliness: 52,
          fatigue: 18,
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'A real but not yet fully closed initiative seam.',
        source: 'screen-semantic-summary',
        confidence: 0.88,
        beganAt: 0,
        lastSeenAt: 22_000,
      },
      recentTransition: null,
      worldModel: {
        activeThread: {
          id: 'thread::open-loop-landed-progress-carry',
          kind: 'problem',
          status: 'active',
          source: 'observed-scene',
          title: 'initiative seam',
          summary: 'The loop is real but still needs a more natural closure.',
          confidence: 0.84,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 22_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['initiative seam'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 22_000,
          attentionAgeMs: 22_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 22_000,
      } as any,
      actionEcology: {
        mode: 'surface-nudge',
        selectedThreadId: 'thread::open-loop-landed-progress-carry',
        readiness: 0.76,
        surfacePressure: 0.78,
        silencePressure: 0.22,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'The seam is local enough that a gentle nudge could help.',
      } as any,
      initiative: {
        selectedAction: 'speak',
        selectedThreadId: 'thread::open-loop-landed-progress-carry',
        selectedProposalId: null,
        confidence: 0.72,
        motives: {},
        speakDrive: 0.66,
        silenceDrive: 0.28,
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        why: 'The concern feels earned enough to surface.',
        shouldSurface: true,
        shouldSpeak: true,
        continuityRestraint: 'measured-return',
      } as any,
      mindDynamics: {
        dominantMotive: 'clarify',
        worldPressure: 0.56,
        epistemicPressure: 0.24,
        relationalPressure: 0.28,
        carePressure: 0.22,
        continuityPressure: 0.58,
        restraintPressure: 0.22,
        surfacePressure: 0.72,
        speakReadiness: 0.74,
        presenceWeight: 0.62,
        motives: {
          clarify: 0.78,
          accompany: 0.34,
        },
        speakDrive: 0.76,
        silenceDrive: 0.2,
        narrative: ['clarify'],
        updatedAt: 22_000,
      } as any,
      projectState: {
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project identity carry and identity-continuity',
        primaryOpenLoop: 'Natural closure rhythm is still being earned.',
      },
    } as any)

    expect(thought.stance).toBe('accompany')
    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.thoughtText).toContain('Phase 1 still has open digital-life closure work')
    expect(thought.thoughtText).toContain('stay near internally before turning this into speech')
  })

  it('does not let a released temporary-noise reflection dominate reflective private thought', () => {
    const thought = buildPrivateThoughtLoop({
      now: 26_000,
      context: createContext({
        localTime: { hour: 15, minute: 0, isLateNight: false },
        relationship: {
          ...createContext().relationship,
          boredom: 28,
          loneliness: 22,
          fatigue: 18,
        },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'same-her runtime closure seam',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 26_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::same-her-runtime-closure',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'same-her runtime closure seam',
          summary: 'The same-her runtime closure seam is still being repaired.',
          confidence: 0.86,
          significance: 0.84,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 26_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['same-her runtime closure seam'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'same-thread',
          sceneAgeMs: 26_000,
          attentionAgeMs: 26_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 26_000,
      } as any,
      reflectionLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released and should not keep steering inner thought.',
            expectation: 'Released noise should not become the current reflective thought line.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.04,
            createdAt: 25_800,
          },
          {
            id: 'reflection::same-her-repair',
            summary: 'The same-her repair line is still the meaningful continuity carry.',
            expectation: 'The steadier repair line should stay active for the current inward turn.',
            observedOutcome: 'The continuity state still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
            confidenceShift: -0.08,
            createdAt: 25_200,
          },
        ],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 26_000,
      } as any,
      executiveCycle: {
        phase: 'reflecting',
        currentLine: 'Stay with the still-open identity-continuity',
      } as any,
    } as any)

    expect(thought.thoughtText).toBe('Keep the same-her repair line active instead of reopening from temporary noise.')
    expect(thought.rationaleTags).toContain('reflection:missed')
    expect(thought.thoughtText).not.toContain('temporary wobble')
  })
})
