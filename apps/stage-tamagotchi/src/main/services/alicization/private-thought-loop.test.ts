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
    expect(thought.thoughtText).toBe('Nearness should still leave room for the host.')
  })

  it('keeps quiet companionship grounded in typed habit and motive state', () => {
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
          summary: 'Stay available without interrupting.',
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
        narrative: [],
        updatedAt: 14_000,
      } as any,
    })

    expect(thought.shouldSpeak).toBe(false)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.rationaleTags).toContain('habit:light-touch-companionship')
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
    expect(thought.thoughtText).toBe('Which seam is still unresolved?')
    expect(thought.expiresAt).toBeGreaterThan(20_000 + 90_000)
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
        summary: 'continuity runtime closure seam',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 26_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::continuity-runtime-closure',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'continuity runtime closure seam',
          summary: 'The continuity runtime closure seam is still being repaired.',
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
          seenNow: ['continuity runtime closure seam'],
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
            id: 'reflection::continuity-repair',
            summary: 'The continuity repair line is still the meaningful continuity carry.',
            expectation: 'The steadier repair line should stay active for the current inward turn.',
            observedOutcome: 'The continuity state still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the continuity repair line active instead of reopening from temporary noise.',
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

    expect(thought.thoughtText).toBe('Keep the continuity repair line active instead of reopening from temporary noise.')
    expect(thought.rationaleTags).toContain('reflection:missed')
    expect(thought.thoughtText).not.toContain('temporary wobble')
  })
})
