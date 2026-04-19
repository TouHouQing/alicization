import { describe, expect, it } from 'vitest'

import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('digital life spine', () => {
  it('projects autonomy as a first-class digest instead of hiding it behind initiative', () => {
    const state = createDefaultVisualPresenceState(2_000)
    state.watchMode = 'symbiotic-vision'
    state.currentScene = {
      workloadKind: 'coding',
      contentKind: 'general',
      scenario: 'coding',
      summary: 'quietly holding an unresolved task thread',
      source: 'screen-semantic-summary',
      confidence: 0.86,
      beganAt: 1_700,
      lastSeenAt: 2_000,
    } as any
    state.initiative = {
      selectedAction: 'hover',
      confidence: 0.62,
      motives: {},
      speakDrive: 0.22,
      silenceDrive: 0.64,
      preferredStyle: 'silent-observe',
      preferredPresence: 'attentive',
      why: 'stay close without interrupting',
      shouldSurface: true,
      shouldSpeak: false,
    } as any
    state.autonomy = {
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSurface: true,
      shouldSpeak: false,
      shouldAct: false,
      speakReadiness: 0.24,
      actReadiness: 0.88,
      inhibition: 0.3,
      confidence: 0.84,
      deferReason: 'busy-host',
      guardReasons: ['busy-host'],
      whyNow: 'the unresolved thread is strong enough to prepare action quietly',
      sourceThreadId: 'thread-quiet-follow-through',
      sourceThreadSummary: 'return to the open task without breaking host focus',
      executionIntent: {
        kind: 'follow-through',
        summary: 'follow the open task through quietly',
        targetThreadId: 'thread-quiet-follow-through',
      },
      updatedAt: 2_000,
    } as any

    const digest = projectAlicizationDigitalLifeSpineDigest(deriveAlicizationDigitalLifeSpine(state))

    expect(digest?.runtime.selectedAction).toBe('hover')
    expect(digest?.proactive?.selectedAction).toBe('hover')
    expect(digest?.autonomy).toEqual(expect.objectContaining({
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSpeak: false,
      shouldAct: false,
      actReadiness: 0.88,
      executionIntentKind: 'follow-through',
      sourceThreadId: 'thread-quiet-follow-through',
    }))
  })

  it('derives one reusable digital-life spine from a persisted presence state', () => {
    const state = createDefaultVisualPresenceState(1_000)
    state.watchMode = 'symbiotic-vision'
    state.currentScene = {
      workloadKind: 'coding',
      contentKind: 'diff',
      scenario: 'coding',
      summary: 'unify runtime spine',
      source: 'screen-semantic-summary',
      confidence: 0.93,
      beganAt: 800,
      lastSeenAt: 1_000,
    } as any
    state.worldModel = {
      activeThread: {
        id: 'thread-spine',
        kind: 'problem',
        title: 'runtime spine',
        summary: 'keep one living architecture line',
        status: 'active',
        significance: 0.92,
        confidence: 0.83,
        unresolved: true,
      },
      epistemicState: {
        certainty: 'grounded',
        freshness: 'fresh',
        seenNow: ['runtime.ts'],
        inferredNow: [],
        openQuestions: [],
        staleRisks: [],
      },
      continuity: {
        label: 'same-thread',
        sceneAgeMs: 200,
        attentionAgeMs: 0,
        sameSceneAsBefore: true,
        sameAttentionAsBefore: true,
        afterglowOpen: false,
      },
      hostState: {
        availability: 'focused',
        burden: 'moderate',
      },
      updatedAt: 1_000,
    } as any
    state.mindKernel = {
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      narrative: ['hold one architecture spine'],
      updatedAt: 1_000,
    } as any
    state.workingMemoryEpisodes = [{
      scene: 'coding',
      summary: 'carry the runtime spine forward',
      beganAt: 820,
      endedAt: 1_000,
      confidence: 0.8,
      emotionalTension: 'focused-flow',
      sedimentCandidate: true,
    }] as any
    state.beliefLedger = {
      focusBeliefId: 'belief-1',
      beliefs: [{
        id: 'belief-1',
        scope: 'task-knot',
        source: 'scene',
        status: 'active',
        statement: 'the runtime should commit once and project everywhere',
        confidence: 0.82,
        salience: 0.74,
        evidence: [],
        entityIds: [],
        formedAt: 800,
        lastUpdatedAt: 1_000,
        expiresAt: 2_000,
      }],
      unresolvedContradictions: [],
      updatedAt: 1_000,
    } as any
    state.goalStack = {
      leadingHostGoalId: null,
      leadingAlicizationGoalId: 'goal-1',
      hostGoals: [],
      alicizationGoals: [{
        id: 'goal-1',
        owner: 'alicization',
        kind: 'hold-knot',
        status: 'active',
        label: 'keep one living architecture line',
        confidence: 0.88,
        urgency: 0.84,
        desireWeight: 0.72,
        blockers: [],
        entityIds: [],
        createdAt: 820,
        lastUpdatedAt: 1_000,
      }],
      updatedAt: 1_000,
    } as any
    state.concerns = [{
      id: 'concern-1',
      kind: 'truth-risk',
      status: 'active',
      summary: 'parallel state drift would break continuity',
      hostGoal: 'understand-task',
      tension: 0.78,
      confidence: 0.74,
      careWeight: 0.7,
      createdAt: 860,
      lastEvidenceAt: 1_000,
      patienceUntil: 2_000,
    }] as any
    state.reflectionLedger = {
      latestEntryId: 'reflection-1',
      entries: [{
        id: 'reflection-1',
        summary: 'keep one runtime spine',
        expectation: 'session mirror and agent runtime should share the same line',
        observedOutcome: 'continuity stayed coherent',
        outcome: 'helped',
        revision: 'route memory and dialogue through one spine',
        confidenceShift: 0.12,
        createdAt: 990,
      }],
      revisionPressure: 0.63,
      narrative: [],
      updatedAt: 1_000,
    } as any
    state.recallGovernor = {
      mode: 'thread',
      recallSeed: 'runtime spine continuity',
      suppressAssociativeRecall: false,
      allowActiveThoughts: true,
      allowRecalledFragments: false,
      carryAsMemory: true,
      rationale: 'keep the same knot alive',
      narrative: [],
      updatedAt: 1_000,
    } as any
    state.thoughtThreads = {
      foregroundThreadId: 'thought-1',
      threads: [{
        id: 'thought-1',
        kind: 'problem-thread',
        status: 'active',
        title: 'shared runtime line',
        summary: 'keep dialogue and background loops on one state',
        salience: 0.8,
        confidence: 0.76,
        surfaceReadiness: 0.58,
        reopenWhen: [],
        openedAt: 840,
        lastUpdatedAt: 1_000,
        expiresAt: 2_000,
      }],
      unresolvedCount: 1,
      narrative: [],
      updatedAt: 1_000,
    } as any
    state.answerPlanner = {
      act: 'guide',
      answerIntent: 'guide',
      governingFocus: 'keep all loops on one line',
      confidence: 0.87,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: true,
      mustDo: ['name the spine'],
      mustNotDo: ['split the mind'],
      narrative: ['guide from the same living state'],
      updatedAt: 1_000,
    } as any
    state.privateThought = {
      stance: 'observe',
      confidence: 0.74,
      rationaleTags: ['runtime-spine'],
      thoughtText: 'use the same spine everywhere',
      shouldSpeak: false,
      suggestedStyle: 'silent-observe',
      embodiedPresence: 'attentive',
      expiresAt: 5_000,
      afterglowFromScenario: null,
      emotionalTension: 'focused-flow',
    } as any
    state.selfContinuity = {
      attachmentMode: 'attuned',
      initiativeTemperament: 'balanced',
      perceptionTrust: 0.64,
      relationshipTrust: 0.82,
      guardingTendency: 0.24,
      misreadBurden: 0.18,
      carryOverDesire: 0.72,
      narrative: ['stay nearby without crowding'],
      updatedAt: 1_000,
    } as any
    state.autobiographicalSelf = {
      personaDrift: {
        attachmentStyle: 'attuned',
        expressionStyle: 'warm',
        conflictStyle: 'repair-first',
        agencyStyle: 'balanced',
        attachmentNeed: 0.76,
        autonomyNeed: 0.38,
        truthAnchor: 0.82,
        careBias: 0.74,
        playBias: 0.28,
        irritabilityThreshold: 0.62,
        stubbornness: 0.44,
      },
      preferenceEvolution: {
        companionship: 0.82,
        truthfulGrounding: 0.84,
        gentleRepair: 0.72,
        quietObservation: 0.58,
        proactiveCare: 0.76,
        playfulIntimacy: 0.34,
        autonomyRespect: 0.54,
        unfinishedThreadReturn: 0.68,
      },
      activeGoals: [],
      behaviorSignatures: ['steady-companion'],
      identityNarrative: 'stay near the host while keeping the answer grounded',
      relationshipDoctrine: 'care without crowding',
      latestInflection: 'Route memory and dialogue through one spine.',
      stability: 0.8,
      updatedAt: 1_000,
    } as any
    state.motiveEngine = {
      rulingDrive: 'truth-discipline',
      drives: {
        companionship: 0.68,
        boundaryRespect: 0.64,
        truthDiscipline: 0.82,
        restProtection: 0.34,
        unfinishedThreadReturn: 0.72,
        selfDirection: 0.58,
      },
      longTermGoals: [{
        id: 'motive-goal::preserve-trust',
        kind: 'preserve-trust',
        status: 'foreground',
        weight: 0.8,
        summary: 'Keep trust by letting warmth answer to truth instead of outrunning it.',
        sourceTags: ['autobiographical-self'],
        targetGoalKind: 'clarify-scene',
        createdAt: 0,
        updatedAt: 1_000,
      }],
      backgroundAgendas: [{
        id: 'motive-agenda::preserve-trust::runtime',
        kind: 'preserve-trust',
        status: 'foreground',
        weight: 0.82,
        summary: 'Keep trust by slowing down, grounding first, and avoiding pressure.',
        sourceTags: ['truth-discipline'],
        targetGoalKind: 'clarify-scene',
        createdAt: 0,
        updatedAt: 1_000,
      }],
      returnPressure: 0.72,
      narrative: ['agenda:preserve-trust', 'drive:truth-discipline'],
      updatedAt: 1_000,
    } as any
    state.habitPolicy = {
      dominantMode: 'repair-before-fluency',
      requiresGroundingBeforeSurface: true,
      prefersQuietCompanionship: true,
      blocksDirectSpeakWhenBusy: true,
      protectsRestWindow: false,
      returnViaRecheck: true,
      suggestedStyleCap: 'silent-observe',
      suggestedPresenceCap: 'hesitant',
      narrative: ['policy:repair-before-fluency', 'ground-before-surface'],
      updatedAt: 1_000,
    } as any
    state.longHorizonMemory = {
      preferenceBias: {
        companionship: 0.8,
        truthfulGrounding: 0.84,
        gentleRepair: 0.72,
        quietObservation: 0.46,
        proactiveCare: 0.74,
        playfulIntimacy: 0.28,
        autonomyRespect: 0.58,
        unfinishedThreadReturn: 0.7,
      },
      identityBias: {
        guardedness: 0.32,
        tenderness: 0.7,
        directness: 0.76,
        selfDirection: 0.64,
      },
      anchorFacts: [{
        factId: 'memory-fact-1',
        subject: 'assistant',
        predicate: 'remember',
        object: 'return to unresolved runtime threads',
        confidence: 0.82,
        weight: 0.78,
        influenceTags: ['task', 'identity'],
        summary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
        lastRecalledAt: 1_000,
      }],
      summary: 'plan=Remembered open loop: assistant remember return to unresolved runtime threads',
      dominantCueSummary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
      rememberedPreferenceSummary: 'Remembered preference: stay warm and direct when helping.',
      rememberedConstraintSummary: 'Remembered boundary: do not crowd the host when focused.',
      rememberedPlanSummary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
      updatedAt: 1_000,
    } as any
    state.relationshipModel = {
      climate: 'warm',
      approachVector: 'care',
      receptivity: 0.82,
      sharedAttentionTrust: 0.78,
      correctionSensitivity: 0.44,
      reciprocityExpectation: 0.62,
      activeBoundaries: [],
      narrative: ['warm but careful'],
      updatedAt: 1_000,
    } as any
    state.selfState = {
      stance: 'accompany',
      feltCloseness: 0.72,
      protectiveness: 0.64,
      curiosity: 0.58,
      patience: 0.76,
      desireToSpeak: 0.54,
      fearOfInterrupting: 0.28,
      moodLabel: 'warm-focus',
    } as any
    state.initiative = {
      selectedAction: 'wait',
      confidence: 0.68,
      motives: {
        care: 0.56,
      },
      speakDrive: 0.42,
      silenceDrive: 0.58,
      preferredStyle: 'gentle-care',
      preferredPresence: 'attentive',
      why: 'stay close and guide gently',
      shouldSurface: false,
      shouldSpeak: false,
    } as any

    const spine = deriveAlicizationDigitalLifeSpine(state)
    const sameFromSurface = deriveAlicizationDigitalLifeSpineFromSurface(spine.runtimeSurface)

    expect(spine.version).toBe('digital-life-spine-v1')
    expect(spine.runtimeSurface.world.worldModel).toEqual(state.worldModel)
    expect(spine.architecture?.governingFocus).toContain('keep all loops on one line')
    expect(spine.continuitySignal?.label).toBe('digital-life-line')
    expect(spine.proactivePolicy.architecture).toEqual(spine.architecture)
    expect(spine.proactiveSelection.activeThread?.id).toBe('thread-spine')
    expect(sameFromSurface.architecture).toEqual(spine.architecture)

    const digest = projectAlicizationDigitalLifeSpineDigest(spine)
    expect(digest).toEqual(expect.objectContaining({
      version: 'digital-life-spine-digest-v1',
      runtime: expect.objectContaining({
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-spine',
        dominantMode: 'tracking',
        answerIntent: 'guide',
        preferredPresence: 'attentive',
      }),
      architecture: expect.objectContaining({
        operatingMode: expect.any(String),
        dominantSystem: expect.any(String),
      }),
      continuitySignal: expect.objectContaining({
        label: 'digital-life-line',
        summary: expect.stringContaining('watch=symbiotic-vision'),
      }),
      proactive: expect.objectContaining({
        activeThreadId: 'thread-spine',
        preferredPresence: 'attentive',
      }),
      motive: expect.objectContaining({
        rulingDrive: 'truth-discipline',
        leadingAgendaKind: 'preserve-trust',
      }),
      habit: expect.objectContaining({
        dominantMode: 'repair-before-fluency',
        requiresGroundingBeforeSurface: true,
      }),
      outcomeLearning: expect.objectContaining({
        latestInflection: 'Route memory and dialogue through one spine.',
        revisionPressure: 0.63,
      }),
      embodiment: expect.objectContaining({
        privateThought: expect.objectContaining({
          embodiedPresence: 'attentive',
          emotionalTension: 'focused-flow',
        }),
        autobiographicalSelf: expect.objectContaining({
          expressionStyle: 'warm',
          careBias: 0.74,
        }),
        relationship: expect.objectContaining({
          climate: 'warm',
          approachVector: 'care',
        }),
        selfState: expect.objectContaining({
          stance: 'accompany',
          feltCloseness: 0.72,
        }),
        mindEcology: expect.objectContaining({
          moodLabel: expect.any(String),
          temperament: expect.objectContaining({
            tenderness: expect.any(Number),
          }),
          climate: expect.objectContaining({
            socialNeed: expect.any(Number),
          }),
        }),
        initiative: expect.objectContaining({
          preferredStyle: 'gentle-care',
          confidence: 0.68,
        }),
      }),
      memory: expect.objectContaining({
        recentEpisodeCount: 1,
        leadingGoalSummary: 'keep one living architecture line',
        recallMode: 'thread',
        reflectionPressure: 0.63,
        longHorizonSummary: expect.stringContaining('Remembered open loop'),
        rememberedConstraintSummary: 'Remembered boundary: do not crowd the host when focused.',
        rememberedPlanSummary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
        longHorizonCueCount: 1,
      }),
    }))
  })

  it('commits next state and returns both previous and current spine projections', () => {
    const previousState = createDefaultVisualPresenceState(2_000)
    previousState.watchMode = 'mnemonic-passive'
    previousState.currentScene = {
      workloadKind: 'coding',
      contentKind: 'editor',
      scenario: 'coding',
      summary: 'old scene',
      source: 'screen-semantic-summary',
      confidence: 0.58,
      beganAt: 1_000,
      lastSeenAt: 2_000,
    } as any

    const committed = commitAlicizationDigitalLifeSpine({
      now: 3_000,
      previousState,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'new scene',
        source: 'screen-semantic-summary',
        confidence: 0.94,
        beganAt: 2_500,
        lastSeenAt: 3_000,
      } as any,
      attention: null,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-new',
            kind: 'problem',
            title: 'new living line',
            summary: 'foreground dialogue and background cognition share one state',
            status: 'active',
            significance: 0.91,
            confidence: 0.86,
            unresolved: true,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            seenNow: ['new scene'],
            inferredNow: [],
            openQuestions: [],
            staleRisks: [],
          },
          continuity: {
            label: 'same-scene',
            sceneAgeMs: 100,
            attentionAgeMs: 0,
            sameSceneAsBefore: false,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'focused',
            burden: 'moderate',
          },
          updatedAt: 3_000,
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          narrative: ['commit once, project everywhere'],
          updatedAt: 3_000,
        } as any,
        answerPlanner: {
          act: 'guide',
          answerIntent: 'guide',
          governingFocus: 'commit once, project everywhere',
          confidence: 0.9,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: true,
          mustDo: ['keep one living line'],
          mustNotDo: ['derive parallel states'],
          narrative: ['unify the spine'],
          updatedAt: 3_000,
        } as any,
        privateThought: {
          stance: 'observe',
          confidence: 0.71,
          rationaleTags: ['single-commit'],
          thoughtText: 'commit once, project everywhere',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: 8_000,
          afterglowFromScenario: null,
          emotionalTension: 'focused-flow',
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 2_950,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
    })

    expect(committed.version).toBe('digital-life-spine-commit-v1')
    expect(committed.previousState.watchMode).toBe('mnemonic-passive')
    expect(committed.nextState.watchMode).toBe('symbiotic-vision')
    expect(committed.previous.runtimeSurface.perception.watchMode).toBe('mnemonic-passive')
    expect(committed.current.runtimeSurface.perception.watchMode).toBe('symbiotic-vision')
    expect(committed.current.architecture?.governingFocus).toContain('commit once, project everywhere')
    expect(committed.current.proactivePolicy.architecture).toEqual(committed.current.architecture)
    expect(committed.current.continuitySignal?.summary).toContain('watch=symbiotic-vision')
  })
})
