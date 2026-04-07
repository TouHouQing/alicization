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
    expect(surface.agency.initiative).toEqual(state.initiative)
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
            summary: 'Keep one living line across turns.',
            status: 'active',
            significance: 0.88,
            confidence: 0.82,
            unresolved: true,
          },
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          narrative: ['hold one living line'],
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
})
