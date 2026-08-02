import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDigitalLifeContinuitySignal,
  buildAlicizationDigitalLifeProactivePolicySnapshot,
  buildAlicizationDigitalLifeProactiveSelection,
  buildAlicizationDigitalLifeRuntimeSurface,
  commitAlicizationDigitalLifeMindState,
} from './digital-life-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('digital life kernel', () => {
  it('commits a composed mind state through one shared visual presence path', () => {
    const previousState = createDefaultVisualPresenceState(1_000)
    const scene = {
      workloadKind: 'coding',
      contentKind: 'error',
      scenario: 'coding',
      summary: 'runtime.ts type mismatch',
      source: 'screen-semantic-summary',
      confidence: 0.94,
      beganAt: 1_500,
      lastSeenAt: 2_000,
    } as any
    const attention = {
      target: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime.ts',
        pid: 7,
      },
      source: 'current-grounded-scene',
      confidence: 0.92,
      engagedAt: 1_500,
      lastConfirmedAt: 2_000,
      dwellMs: 500,
    } as any
    const mindTurnFrame = {
      thought: 'obligation=answer; truth=grounded; focus=task-thread',
      emotion: 'thinking',
      reply: '先把 runtime 内核统一起来。',
      format: 'mind-turn-v1',
    } as any
    const privateThought = {
      stance: 'nudge',
      confidence: 0.88,
      rationaleTags: ['kernel-unification'],
      thoughtText: 'keep proactive and dialogue loops on the same inner line',
      shouldSpeak: true,
      suggestedStyle: 'light-nudge',
      embodiedPresence: 'attentive',
      expiresAt: 60_000,
      afterglowFromScenario: null,
      emotionalTension: 'focused-flow',
    } as any
    const worldModel = {
      activeThread: {
        id: 'thread-runtime-kernel',
        kind: 'problem',
        title: 'digital life kernel',
        summary: 'Unify foreground and background cognition commits.',
        status: 'active',
        significance: 0.92,
        confidence: 0.84,
        unresolved: true,
      } as any,
      continuity: {
        label: 'same-scene',
        sameSceneAsBefore: true,
        afterglowOpen: false,
      } as any,
      epistemicState: {
        certainty: 'grounded',
        openQuestions: ['which loop should own persistence'],
      },
      hostState: {
        availability: 'focused',
      },
    } as any
    const initiative = {
      shouldInterrupt: false,
      shouldSpeak: true,
      preferredStyle: 'light-nudge',
    } as any
    const answerPlanner = {
      answerIntent: 'guide',
      suggestedMove: 'repair-before-speaking',
    } as any

    const next = commitAlicizationDigitalLifeMindState({
      now: 2_000,
      previousState,
      watchMode: 'symbiotic-vision',
      scene,
      attention,
      mindState: {
        mindTurnFrame,
        worldModel,
        initiative,
        answerPlanner,
        privateThought,
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 1_900,
        health: 'healthy',
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 30_000,
    })

    expect(next.mindTurnFrame).toEqual(mindTurnFrame)
    expect(next.worldModel).toEqual(worldModel)
    expect(next.initiative).toEqual(initiative)
    expect(next.answerPlanner).toEqual(answerPlanner)
    expect(next.privateThought?.thoughtText).toContain('same inner line')
    expect(next.captureState.permission).toBe('granted')
    expect(next.watchMode).toBe('symbiotic-vision')
  })

  it('projects a stable domain-grouped runtime surface for prompts and control loops', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 5_000,
      previousState: createDefaultVisualPresenceState(4_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'digital-life-kernel.ts',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 4_200,
        lastSeenAt: 5_000,
      } as any,
      attention: null,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-surface',
            kind: 'problem',
            title: 'runtime surface',
            summary: 'Expose one coherent digital-life view.',
            status: 'active',
            significance: 0.86,
            confidence: 0.8,
            unresolved: true,
          },
          continuity: {
            label: 'same-thread',
            sameSceneAsBefore: true,
            afterglowOpen: false,
          },
          epistemicState: {
            certainty: 'grounded',
            openQuestions: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          narrative: ['tracking is governing the current inner line.'],
          updatedAt: 5_000,
        } as any,
        motiveEngine: {
          rulingDrive: 'unfinished-thread-return',
          drives: {
            companionship: 0.42,
            boundaryRespect: 0.46,
            truthDiscipline: 0.72,
            restProtection: 0.24,
            unfinishedThreadReturn: 0.84,
            selfDirection: 0.68,
          },
          longTermGoals: [],
          backgroundAgendas: [{
            id: 'agenda::return-open-loop',
            kind: 'return-open-loop',
            status: 'foreground',
            weight: 0.82,
            summary: 'Do not let the unfinished runtime thread dissolve.',
            sourceTags: ['open-loop'],
            targetGoalKind: 'clarify-scene',
            createdAt: 0,
            updatedAt: 5_000,
          }],
          returnPressure: 0.8,
          narrative: ['agenda:return-open-loop'],
          updatedAt: 5_000,
        } as any,
        habitPolicy: {
          dominantMode: 'return-with-proof',
          requiresGroundingBeforeSurface: true,
          prefersQuietCompanionship: false,
          blocksDirectSpeakWhenBusy: true,
          protectsRestWindow: false,
          returnViaRecheck: true,
          suggestedStyleCap: 'silent-observe',
          suggestedPresenceCap: 'hesitant',
          narrative: ['policy:return-with-proof'],
          updatedAt: 5_000,
        } as any,
        replyDeliberation: {
          shouldSpeak: true,
          shouldLabelHypothesis: false,
        } as any,
        initiative: {
          shouldInterrupt: false,
          shouldSpeak: true,
          preferredStyle: 'light-nudge',
        } as any,
        privateThought: {
          stance: 'observe',
          confidence: 0.66,
          rationaleTags: ['surface-projection'],
          thoughtText: 'make runtime state legible to every loop',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'glance',
          expiresAt: 20_000,
          afterglowFromScenario: null,
          emotionalTension: 'focused-flow',
        } as any,
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 4_900,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
    })

    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)

    expect(surface.version).toBe('digital-life-runtime-surface-v1')
    expect(surface.perception.watchMode).toBe('symbiotic-vision')
    expect(surface.world.worldModel).toEqual(state.worldModel)
    expect(surface.cognition.mindKernel).toEqual(state.mindKernel)
    expect(surface.cognition.privateThought?.thoughtText).toContain('legible')
    expect(surface.dialogue.replyDeliberation).toEqual(state.replyDeliberation)
    expect(surface.memory.workingMemoryEpisodes).toEqual(state.workingMemoryEpisodes)
    expect(surface.memory.motiveEngine).toEqual(state.motiveEngine)
    expect(surface.agency.habitPolicy).toEqual(state.habitPolicy)
    expect(surface.agency.initiative).toEqual(state.initiative)
  })

  it('keeps provider-facing runtime digests aligned with the visual presence emotional-kernel authority', () => {
    const staleKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'low-pressure-presence',
      embodimentTone: 'measured-return',
      valence: 0.56,
      arousal: 0.24,
      guardedness: 0.38,
      closenessDrive: 0.48,
      repairNeed: 0.12,
      initiativePressure: 0.2,
      reasonTags: ['stale-measured-return'],
      why: 'Older digest line before the inner state shifted.',
    } as any
    const currentKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence: 0.48,
      arousal: 0.18,
      guardedness: 0.82,
      closenessDrive: 0.22,
      repairNeed: 0.41,
      initiativePressure: 0.16,
      reasonTags: ['rest-protective', 'continuity state'],
      why: 'The refreshed emotional kernel should be the one cause seen by memory, initiative, embodiment, and dialogue.',
    } as any
    const state = createDefaultVisualPresenceState(6_000) as any
    state.emotionalKernel = currentKernel
    state.runtimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      emotionalKernel: staleKernel,
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.44,
      companionshipPressure: 0.36,
      channels: [],
      summary: 'older digest line',
    }
    state.raw = {
      personStateProjection: null,
      runtime: null,
      runtimeDigest: {
        ...state.runtimeDigest,
        emotionalKernel: staleKernel,
      },
    }

    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)

    expect(surface.memory.emotionalKernel).toEqual(currentKernel)
    expect(surface.raw?.runtimeDigest?.emotionalKernel).toEqual(currentKernel)
    expect(surface.cognition.runtimeDigest?.emotionalKernel).toEqual(currentKernel)
    expect(surface.dialogue.runtimeDigest?.emotionalKernel).toEqual(currentKernel)
    expect(Object.keys(surface.raw ?? {}).sort()).toEqual([
      'personStateProjection',
      'residentPerformance',
      'runtime',
      'runtimeDigest',
    ])
  })

  it('derives a stable continuity signal from the runtime surface', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 8_000,
      previousState: createDefaultVisualPresenceState(7_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'agent-runtime.ts',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 7_500,
        lastSeenAt: 8_000,
      } as any,
      attention: null,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-continuity',
            kind: 'problem',
            title: 'digital life continuity',
            summary: 'Keep continuity state across turns.',
            status: 'active',
            significance: 0.88,
            confidence: 0.82,
            unresolved: true,
          },
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          narrative: ['hold continuity state'],
          updatedAt: 8_000,
        } as any,
        answerPlanner: {
          answerIntent: 'guide',
        } as any,
        initiative: {
          selectedAction: 'observe-and-guide',
          preferredPresence: 'attentive',
        } as any,
        privateThought: {
          stance: 'observe',
          confidence: 0.74,
          rationaleTags: ['digital-life-line'],
          thoughtText: 'keep continuity explicit for the next turn',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: 20_000,
          afterglowFromScenario: null,
          emotionalTension: 'focused-flow',
        } as any,
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 7_980,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
    })

    const signal = buildAlicizationDigitalLifeContinuitySignal(
      buildAlicizationDigitalLifeRuntimeSurface(state),
    )

    expect(signal).toEqual(expect.objectContaining({
      kind: 'presence',
      state: 'observed',
      label: 'digital-life-line',
      summary: expect.stringContaining('watch=symbiotic-vision'),
      metadata: expect.objectContaining({
        source: 'digital-life-runtime',
        dominantMode: 'tracking',
        answerIntent: 'guide',
        preferredPresence: 'attentive',
      }),
    }))
    expect(signal?.summary).toContain('thread=digital life continuity')
  })

  it('derives proactive selectors and policy input from the runtime surface', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 8_000,
      previousState: createDefaultVisualPresenceState(7_000),
      watchMode: 'recovering',
      scene: null,
      attention: null,
      mindState: {
        beliefLedger: {
          focusBeliefId: 'belief-1',
          beliefs: [
            {
              id: 'belief-1',
              scope: 'task-thread',
              status: 'active',
              statement: 'The host is circling the same bug.',
            },
          ],
        } as any,
        goalStack: {
          leadingAlicizationGoalId: 'goal-1',
          alicizationGoals: [
            {
              id: 'goal-1',
              kind: 'help-host',
              label: 'keep the debugging thread warm',
            },
          ],
        } as any,
        desireMemory: {
          resurfacingDesireId: 'desire-1',
          activeDesires: [
            {
              id: 'desire-1',
              kind: 'stay-near',
              reason: 'The unfinished repair still matters.',
            },
          ],
        } as any,
        livingWorldState: {
          focusObjectId: 'object-1',
          objects: [
            {
              id: 'object-1',
              kind: 'thread',
              label: 'repair-thread',
              summary: 'The repair thread is still active.',
            },
          ],
        } as any,
        selfGovernor: {
          dominantIntentionId: 'intention-1',
          activeIntentions: [
            {
              id: 'intention-1',
              kind: 'care-host',
              summary: 'Keep the host from grinding down.',
            },
          ],
        } as any,
        thoughtThreads: {
          foregroundThreadId: 'thought-1',
          threads: [
            {
              id: 'thought-1',
              kind: 'repair',
              status: 'active',
              summary: 'There is still one unresolved seam.',
              question: 'Should we reground the failing edge?',
            },
          ],
        } as any,
        inquiryLoop: {
          primaryInquiryId: 'inquiry-1',
          inquiries: [
            {
              id: 'inquiry-1',
              kind: 'problem-localization',
              priority: 'high',
              question: 'Which boundary is still broken?',
            },
          ],
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-1',
            kind: 'problem',
            title: 'runtime kernel',
            summary: 'The shared runtime thread remains unresolved.',
            unresolved: true,
          },
        } as any,
        privateThought: {
          stance: 'care',
          confidence: 0.72,
          rationaleTags: ['selector-test'],
          thoughtText: 'stay with the unresolved repair',
          shouldSpeak: true,
          suggestedStyle: 'gentle-care',
          embodiedPresence: 'concerned',
          expiresAt: 60_000,
          afterglowFromScenario: null,
          emotionalTension: 'tense-debug',
          livingWorldObjectId: 'object-1',
          governorIntentionId: 'intention-1',
          selectedThoughtThreadId: 'thought-1',
        } as any,
        mindKernel: {
          dominantMode: 'guarding',
        } as any,
        initiative: {
          selectedAction: 'whisper',
        } as any,
        actionEcology: {
          mode: 'surface-care',
        } as any,
      },
      captureState: {
        permission: 'granted',
        lastGroundedAt: 7_900,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
    })

    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const selection = buildAlicizationDigitalLifeProactiveSelection(surface)
    const policy = buildAlicizationDigitalLifeProactivePolicySnapshot(surface)

    expect(selection.focusBelief?.id).toBe('belief-1')
    expect(selection.leadingGoal?.id).toBe('goal-1')
    expect(selection.resurfacingDesire?.id).toBe('desire-1')
    expect(selection.livingWorldObject?.id).toBe('object-1')
    expect(selection.governorIntention?.id).toBe('intention-1')
    expect(selection.thoughtThread?.id).toBe('thought-1')
    expect(policy.watchMode).toBe('recovering')
    expect(policy.architecture?.version).toBe('digital-life-architecture-v1')
    expect(policy.worldModel).toEqual(surface.world.worldModel)
    expect(policy.privateThought?.thoughtText).toContain('unresolved repair')
    expect(policy.actionEcology).toEqual(surface.agency.actionEcology)
  })

  it('carries derived affective residue from runtime surface into proactive policy snapshot', () => {
    const state = {
      ...createDefaultVisualPresenceState(9_000),
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 9_000,
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 9_000,
          residues: [],
          dominantResidueKind: 'repair',
          afterglowPressure: 0.18,
          repairPressure: 0.72,
          burdenPressure: 0.48,
          trustPressure: 0.42,
          restProtectivePressure: 0.34,
          relationshipCadence: {
            cadenceMode: 'cooldown',
            distancePosture: 'measured-room',
            companionshipDensity: 0.22,
            repairRecovery: 0.58,
            overreachRisk: 0.42,
            fatigueGuard: 0.28,
            afterglowCarry: 0.18,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['residue:repair'],
            summary: 'Repair should settle before warmth expands.',
          },
          sourceSignals: ['repair before closeness'],
          summary: 'Repair residue dominates.',
        },
        summary: 'source=main-runtime | residue=repair',
      },
    } as any
    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const policy = buildAlicizationDigitalLifeProactivePolicySnapshot(surface)

    expect(surface.memory.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(policy.affectiveResidue?.relationshipCadence.shouldDelayWarmth).toBe(true)
  })

  it('carries derived self-evolution and learning execution authority into proactive policy snapshot', () => {
    const state = {
      ...createDefaultVisualPresenceState(9_500),
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 9_500,
        selfEvolution: {
          version: 'self-evolution-kernel-v1',
          updatedAt: 9_500,
          evolutionMomentum: 0.58,
          learningReadiness: 0.66,
          contradictionPressure: 0.42,
          revisionPressure: 0.49,
          autobiographicalStability: 0.72,
          dominantTrajectory: 'world-model revalidation',
          relationshipDoctrine: 'verify before warmth widens',
          latestInflection: 'A stale world-model seam still needs replay-backed grounding.',
          burdenLine: null,
          trustMeaning: null,
          nextLearningAction: 'verify',
          nextLearningReason: 'World-model carry is still under revalidation.',
          shouldRecord: false,
          shouldReflect: false,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['world-model'],
          sourceSignals: ['self-revision-policy-feedback'],
          summary: 'World-model carry remains verify-first.',
        },
        learningExecutionState: {
          nextLearningAction: 'verify',
          activeLearningFocuses: ['world-model'],
        },
        summary: 'source=main-runtime | trajectory=world-model revalidation | learning=verify',
      },
    } as any

    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const policy = buildAlicizationDigitalLifeProactivePolicySnapshot(surface)

    expect(surface.memory.selfEvolution).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      nextLearningAction: 'verify',
      dominantTrajectory: 'world-model revalidation',
    }))
    expect(surface.memory.learningExecutionState).toEqual(expect.objectContaining({
      nextLearningAction: 'verify',
      activeLearningFocuses: ['world-model'],
    }))
    expect(policy.selfEvolution).toEqual(expect.objectContaining({
      version: 'self-evolution-kernel-v1',
      nextLearningAction: 'verify',
    }))
    expect(policy.learningExecutionState).toEqual(expect.objectContaining({
      nextLearningAction: 'verify',
      activeLearningFocuses: ['world-model'],
    }))
  })

  it('carries autobiographical self authority into proactive policy snapshot so durable relationship memory can shape later cadence', () => {
    const state = {
      ...createDefaultVisualPresenceState(9_700),
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.46,
          autonomyNeed: 0.64,
          truthAnchor: 0.78,
          careBias: 0.52,
          playBias: 0.14,
          irritabilityThreshold: 0.34,
          stubbornness: 0.42,
        },
        preferenceEvolution: {
          companionship: 0.56,
          truthfulGrounding: 0.76,
          gentleRepair: 0.72,
          quietObservation: 0.66,
          proactiveCare: 0.48,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.7,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'I am learning to return more steadily when the same-person line is still settling.',
        relationshipDoctrine: 'Carry corrected same-person continuity on a lower-pressure line and keep more room before widening closeness.',
        latestInflection: 'Keep embodiment quieter and steadier while the corrected same-person continuity meaning is still settling.',
        stability: 0.82,
        updatedAt: 9_700,
      },
    } as any

    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const policy = buildAlicizationDigitalLifeProactivePolicySnapshot(surface)

    expect((policy as any).autobiographicalSelf).toEqual(expect.objectContaining({
      relationshipDoctrine: 'Carry corrected same-person continuity on a lower-pressure line and keep more room before widening closeness.',
      latestInflection: 'Keep embodiment quieter and steadier while the corrected same-person continuity meaning is still settling.',
    }))
  })

  it('carries long-horizon memory into proactive policy snapshot so durable initiative timing can directly shape later proactive restraint', () => {
    const state = {
      ...createDefaultVisualPresenceState(9_760),
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.24,
          truthfulGrounding: 0.18,
          gentleRepair: 0.22,
          quietObservation: 0.26,
          proactiveCare: 0.14,
          playfulIntimacy: 0.04,
          autonomyRespect: 0.32,
          unfinishedThreadReturn: 0.36,
        },
        identityBias: {
          guardedness: 0.14,
          tenderness: 0.16,
          directness: 0.12,
          selfDirection: 0.18,
        },
        anchorFacts: [{
          factId: 'derived:person-state-initiative-strategy-carry',
          subject: 'assistant',
          predicate: 'initiative-strategy-carry',
          object: 'Leave more room and wait for a clearer opening before reopening this line.',
          confidence: 0.86,
          weight: 0.82,
          influenceTags: ['bond', 'task'],
          summary: 'Remembered initiative strategy carry: leave more room and wait for a clearer opening before reopening this line.',
          lastRecalledAt: 9_720,
        }],
        summary: 'A quieter reopening strategy is now durable.',
        dominantCueSummary: 'Remembered initiative strategy carry: leave more room and wait for a clearer opening before reopening this line.',
        rememberedPreferenceSummary: 'Remembered preference: leave more room and wait for a clearer opening before reopening this line.',
        rememberedConstraintSummary: null,
        rememberedPlanSummary: 'Remembered plan: quieter timing until a clearer opening appears.',
        updatedAt: 9_730,
      },
    } as any

    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const policy = buildAlicizationDigitalLifeProactivePolicySnapshot(surface)

    expect(surface.memory.longHorizonMemory).toEqual(expect.objectContaining({
      rememberedPreferenceSummary: 'Remembered preference: leave more room and wait for a clearer opening before reopening this line.',
    }))
    expect((policy as any).longHorizonMemory).toEqual(expect.objectContaining({
      dominantCueSummary: 'Remembered initiative strategy carry: leave more room and wait for a clearer opening before reopening this line.',
      rememberedPlanSummary: 'Remembered plan: quieter timing until a clearer opening appears.',
    }))
  })

  it('keeps sparse nested runtime carries usable when selector ledgers lose array scaffolding', () => {
    const sparseSurface = {
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          scenario: 'coding',
          summary: 'identity-continuity',
        },
        attention: null,
        captureState: null,
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 12_000,
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'thread-continuity-carry',
            kind: 'problem',
            title: 'identity-continuity',
            summary: 'Keep the continuity state explicit after another sparse carry.',
            unresolved: true,
          },
        },
        livingWorldState: {
          focusObjectId: 'object-missing-array',
        },
      },
      cognition: {
        beliefLedger: {
          focusBeliefId: 'belief-missing-array',
        },
        privateThought: {
          thoughtText: 'identity-continuity',
          shouldSpeak: false,
          embodiedPresence: 'attentive',
          livingWorldObjectId: 'object-missing-array',
          governorIntentionId: 'intention-missing-array',
          selectedThoughtThreadId: 'thought-missing-array',
        },
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
        },
      },
      memory: {
        concerns: [],
        workingMemoryEpisodes: [],
        goalStack: {
          leadingAlicizationGoalId: 'goal-missing-array',
        },
        desireMemory: {
          resurfacingDesireId: 'desire-missing-array',
        },
        thoughtThreads: {
          foregroundThreadId: 'thought-missing-array',
        },
        personStateProjection: {
          selfContinuityAuthority: {
            authoritySummary: 'structured continuity digest.',
          },
        },
      },
      dialogue: {},
      agency: {
        inquiryLoop: {
          primaryInquiryId: 'inquiry-missing-array',
        },
        selfGovernor: {
          dominantIntentionId: 'intention-missing-array',
        },
        initiative: {
          selectedAction: 'wait',
          preferredPresence: 'attentive',
        },
      },
    } as any

    const signal = buildAlicizationDigitalLifeContinuitySignal(sparseSurface)
    const selection = buildAlicizationDigitalLifeProactiveSelection(sparseSurface)
    const policy = buildAlicizationDigitalLifeProactivePolicySnapshot(sparseSurface)

    expect(signal?.metadata).toEqual(expect.objectContaining({
      watchMode: 'symbiotic-vision',
      activeThreadId: 'thread-continuity-carry',
      dominantMode: 'tracking',
      preferredPresence: 'attentive',
    }))
    expect(selection).toEqual(expect.objectContaining({
      activeThread: expect.objectContaining({
        id: 'thread-continuity-carry',
      }),
      focusBelief: null,
      primaryInquiry: null,
      leadingGoal: null,
      resurfacingDesire: null,
      livingWorldObject: null,
      governorIntention: null,
      thoughtThread: null,
    }))
    expect(policy.continuityDeliberation?.kind).toBe('none')
  })
})
