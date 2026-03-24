import type { AlicizationMindDynamicsSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildActionEcology } from './action-ecology'

function createContext(overrides: Partial<AlicizationProactiveLayeredContext> = {}): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 14,
      minute: 10,
      isLateNight: false,
    },
    system: {
      cpuUsage: 12,
      battery: { percent: 82, charging: true },
      memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 25,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - diff',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.88,
      source: 'foreground-window-heuristic',
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'diff',
      confidence: 0.84,
      source: 'foreground-window-heuristic',
      matchedLabels: ['diff'],
      summary: 'runtime.ts - diff',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 48,
      loneliness: 44,
      fatigue: 24,
      minutesSinceLastUserTurn: 8,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

function createMindDynamics(overrides: Partial<AlicizationMindDynamicsSnapshot> = {}): AlicizationMindDynamicsSnapshot {
  return {
    dominantMotive: 'clarify',
    worldPressure: 0.52,
    epistemicPressure: 0.34,
    relationalPressure: 0.28,
    carePressure: 0.22,
    continuityPressure: 0.46,
    restraintPressure: 0.38,
    surfacePressure: 0.44,
    speakReadiness: 0.46,
    presenceWeight: 0.5,
    motives: {
      'clarify': 0.62,
      'protect': 0.34,
      'accompany': 0.28,
      'care': 0.22,
      'stay-silent': 0.38,
    },
    speakDrive: 0.48,
    silenceDrive: 0.42,
    narrative: ['dominant motive is clarify.'],
    updatedAt: 10_000,
    ...overrides,
  }
}

describe('buildActionEcology', () => {
  it('prefers repair-before-speaking when belief revision is fractured', () => {
    const ecology = buildActionEcology({
      now: 10_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['need one more grounded pass'],
          staleRisks: ['anchor drift'],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 10_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-1',
        stability: 'fractured',
        revisionPressure: 0.8,
        groundingNeed: 0.78,
        contradictionPressure: 0.72,
        hostCorrectionWeight: 0.62,
        narrative: [],
        updatedAt: 10_000,
      },
      relationshipModel: {
        climate: 'neutral',
        approachVector: 'guide',
        receptivity: 0.6,
        sharedAttentionTrust: 0.62,
        correctionSensitivity: 0.38,
        reciprocityExpectation: 0.5,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 10_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-1',
        dominantNeed: 'repair',
        readiness: 0.36,
        threads: [{
          id: 'thread-1',
          kind: 'repair-misread',
          status: 'holding',
          summary: 'Repair the drift first.',
          desiredOutcome: 'reground the live scene',
          focusBeliefId: 'belief-1',
          focusInquiryId: 'inquiry-1',
          concernId: null,
          surfacePressure: 0.2,
          silencePressure: 0.68,
          embodiedPresence: 'hesitant',
          startedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        narrative: [],
        updatedAt: 10_000,
      },
      selfState: {
        stance: 'hesitate',
        feltCloseness: 0.5,
        protectiveness: 0.34,
        curiosity: 0.66,
        patience: 0.74,
        desireToSpeak: 0.38,
        fearOfInterrupting: 0.58,
        dominantConcernId: null,
        moodLabel: 'repairing-confidence',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'stay-silent',
        epistemicPressure: 0.78,
        restraintPressure: 0.72,
        surfacePressure: 0.22,
        speakReadiness: 0.26,
        speakDrive: 0.28,
        silenceDrive: 0.82,
        motives: {
          'clarify': 0.74,
          'stay-silent': 0.86,
        },
      }),
    })

    expect(ecology.mode).toBe('repair-before-speaking')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.embodiedPresence).toBe('hesitant')
  })

  it('surfaces a nudge when the knot is localizable and grounded enough', () => {
    const ecology = buildActionEcology({
      now: 20_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['diff-visible'],
          inferredNow: [],
          openQuestions: [],
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
      beliefRevision: {
        dominantBeliefId: 'belief-1',
        stability: 'stable',
        revisionPressure: 0.24,
        groundingNeed: 0.22,
        contradictionPressure: 0.12,
        hostCorrectionWeight: 0.2,
        narrative: [],
        updatedAt: 20_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.74,
        sharedAttentionTrust: 0.72,
        correctionSensitivity: 0.22,
        reciprocityExpectation: 0.58,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 20_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-2',
        dominantNeed: 'guidance',
        readiness: 0.78,
        threads: [{
          id: 'thread-2',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The knot is local enough for a concrete nudge.',
          desiredOutcome: 'point toward the real locus',
          focusBeliefId: 'belief-1',
          focusInquiryId: 'inquiry-1',
          concernId: null,
          surfacePressure: 0.78,
          silencePressure: 0.24,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        narrative: [],
        updatedAt: 20_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.58,
        protectiveness: 0.44,
        curiosity: 0.74,
        patience: 0.52,
        desireToSpeak: 0.72,
        fearOfInterrupting: 0.28,
        dominantConcernId: null,
        moodLabel: 'attuned-guidance',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.64,
        epistemicPressure: 0.24,
        restraintPressure: 0.18,
        surfacePressure: 0.72,
        speakReadiness: 0.7,
        speakDrive: 0.74,
        silenceDrive: 0.26,
      }),
    })

    expect(ecology.mode).toBe('surface-nudge')
    expect(ecology.shouldSpeak).toBe(true)
    expect(ecology.suggestedStyle).toBe('light-nudge')
  })

  it('upgrades to warning when fatigue becomes urgent', () => {
    const ecology = buildActionEcology({
      now: 30_000,
      context: createContext({
        localTime: {
          hour: 1,
          minute: 40,
          isLateNight: true,
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 86,
          lateNightActiveMinutes: 140,
        },
      }),
      worldModel: {
        activeThread: {
          id: 'thread::late-night',
          kind: 'late-night-endurance',
          status: 'active',
          source: 'observed-scene',
          title: 'late-night session',
          summary: 'The host has been pushing through the night.',
          confidence: 0.82,
          significance: 0.86,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'heavy',
        },
        updatedAt: 30_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'stable',
        revisionPressure: 0.22,
        groundingNeed: 0.2,
        contradictionPressure: 0.12,
        hostCorrectionWeight: 0.2,
        narrative: [],
        updatedAt: 30_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'care',
        receptivity: 0.72,
        sharedAttentionTrust: 0.7,
        correctionSensitivity: 0.22,
        reciprocityExpectation: 0.6,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 30_000,
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'care',
        worldPressure: 0.58,
        carePressure: 0.88,
        restraintPressure: 0.24,
        surfacePressure: 0.82,
        speakReadiness: 0.78,
        speakDrive: 0.84,
        silenceDrive: 0.24,
        motives: {
          care: 0.9,
          protect: 0.72,
        },
      }),
      deliberationState: {
        primaryThreadId: 'thread-3',
        dominantNeed: 'care',
        readiness: 0.76,
        threads: [{
          id: 'thread-3',
          kind: 'protect-host',
          status: 'ripe',
          summary: 'Care now matters more than staying silent.',
          desiredOutcome: 'reduce harm before exhaustion deepens',
          focusBeliefId: null,
          focusInquiryId: null,
          concernId: 'care',
          surfacePressure: 0.74,
          silencePressure: 0.28,
          embodiedPresence: 'concerned',
          startedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        narrative: [],
        updatedAt: 30_000,
      },
      selfState: {
        stance: 'protect',
        feltCloseness: 0.64,
        protectiveness: 0.86,
        curiosity: 0.4,
        patience: 0.46,
        desireToSpeak: 0.68,
        fearOfInterrupting: 0.22,
        dominantConcernId: 'care',
        moodLabel: 'protective-tension',
      },
    })

    expect(ecology.mode).toBe('surface-warning')
    expect(ecology.shouldSpeak).toBe(true)
    expect(ecology.embodiedPresence).toBe('concerned')
  })

  it('projects the selected counterfactual option into embodied action ecology', () => {
    const ecology = buildActionEcology({
      now: 40_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['afterglow'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 40_000,
          attentionAgeMs: 40_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 40_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'stable',
        revisionPressure: 0.18,
        groundingNeed: 0.16,
        contradictionPressure: 0.1,
        hostCorrectionWeight: 0.18,
        narrative: [],
        updatedAt: 40_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'stay-near',
        receptivity: 0.74,
        sharedAttentionTrust: 0.78,
        correctionSensitivity: 0.16,
        reciprocityExpectation: 0.58,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 40_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-afterglow',
        dominantNeed: 'companionship',
        readiness: 0.68,
        threads: [{
          id: 'thread-afterglow',
          kind: 'stay-near',
          status: 'holding',
          summary: 'Stay nearby after the shared thread loosens.',
          desiredOutcome: 'soft opening',
          focusBeliefId: null,
          focusInquiryId: null,
          concernId: null,
          surfacePressure: 0.54,
          silencePressure: 0.28,
          embodiedPresence: 'glance',
          startedAt: 0,
          lastUpdatedAt: 40_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 40_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.68,
        protectiveness: 0.26,
        curiosity: 0.3,
        patience: 0.7,
        desireToSpeak: 0.56,
        fearOfInterrupting: 0.2,
        dominantConcernId: null,
        moodLabel: 'afterglow',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'accompany',
        continuityPressure: 0.76,
        presenceWeight: 0.8,
        surfacePressure: 0.58,
        speakReadiness: 0.64,
        motives: {
          'accompany': 0.9,
          'stay-silent': 0.2,
        },
      }),
      counterfactualDeliberation: {
        selectedOptionId: 'counterfactual::whisper',
        selectedAction: 'whisper',
        confidence: 0.82,
        dominantTradeoff: 'closeness-without-breaking-scene',
        options: [{
          id: 'counterfactual::whisper',
          action: 'whisper',
          style: 'light-nudge',
          embodiedPresence: 'glance',
          relationshipCost: 0.18,
          interruptionCost: 0.22,
          informationGain: 0.26,
          timingFitness: 0.88,
          identityFit: 0.8,
          score: 0.78,
          why: 'The shared thread just loosened; a light touch belongs here.',
        }],
        narrative: [],
        updatedAt: 40_000,
      },
    })

    expect(ecology.mode).toBe('surface-nudge')
    expect(ecology.shouldSpeak).toBe(true)
    expect(ecology.why).toContain('light touch')
  })
})
