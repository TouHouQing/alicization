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

  it('keeps outward action lower-pressure when the Phase 1 digital-life loop is still open', () => {
    const ecology = buildActionEcology({
      now: 50_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
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
          label: 'staying-with-thread',
          sceneAgeMs: 50_000,
          attentionAgeMs: 50_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 50_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-open-loop',
        stability: 'stable',
        revisionPressure: 0.18,
        groundingNeed: 0.2,
        contradictionPressure: 0.12,
        hostCorrectionWeight: 0.16,
        narrative: [],
        updatedAt: 50_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.72,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.22,
        reciprocityExpectation: 0.58,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 50_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-open-loop',
        dominantNeed: 'guidance',
        readiness: 0.74,
        threads: [{
          id: 'thread-open-loop',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The seam is real, but the life loop is not fully closed yet.',
          desiredOutcome: 'point toward the open loop carefully',
          focusBeliefId: 'belief-open-loop',
          focusInquiryId: 'inquiry-open-loop',
          concernId: null,
          surfacePressure: 0.76,
          silencePressure: 0.24,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 50_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 50_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.62,
        protectiveness: 0.34,
        curiosity: 0.68,
        patience: 0.58,
        desireToSpeak: 0.7,
        fearOfInterrupting: 0.24,
        dominantConcernId: null,
        moodLabel: 'closure-aware-guidance',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.6,
        epistemicPressure: 0.24,
        restraintPressure: 0.18,
        surfacePressure: 0.74,
        speakReadiness: 0.72,
        presenceWeight: 0.64,
        speakDrive: 0.76,
        silenceDrive: 0.22,
      }),
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Initiative, embodiment, and dialogue still need a more natural closed loop. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Initiative, embodiment, and dialogue still need a more natural closed loop.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(ecology.mode).toBe('quiet-accompany')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.shouldSurface).toBe(true)
    expect(ecology.suggestedStyle).toBe('silent-observe')
    expect(ecology.why).toContain('Phase 1 still has open digital-life closure work')
  })

  it('keeps the summary-only same-living-line next closure instead of widening back to the canonical cross-modal target', () => {
    const ecology = buildActionEcology({
      now: 54_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['same-her closure seam still visible'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 54_000,
          attentionAgeMs: 54_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 54_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-summary-only-project-state',
        stability: 'stable',
        revisionPressure: 0.16,
        groundingNeed: 0.18,
        contradictionPressure: 0.12,
        hostCorrectionWeight: 0.14,
        narrative: [],
        updatedAt: 54_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.74,
        sharedAttentionTrust: 0.78,
        correctionSensitivity: 0.2,
        reciprocityExpectation: 0.58,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 54_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-summary-only-project-state',
        dominantNeed: 'guidance',
        readiness: 0.76,
        threads: [{
          id: 'thread-summary-only-project-state',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The life loop is still open, but this turn should stay gentle.',
          desiredOutcome: 'keep the return lower-pressure',
          focusBeliefId: 'belief-summary-only-project-state',
          focusInquiryId: 'inquiry-summary-only-project-state',
          concernId: null,
          surfacePressure: 0.78,
          silencePressure: 0.24,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 54_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 54_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.62,
        protectiveness: 0.34,
        curiosity: 0.68,
        patience: 0.58,
        desireToSpeak: 0.7,
        fearOfInterrupting: 0.24,
        dominantConcernId: null,
        moodLabel: 'closure-aware-guidance',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.6,
        epistemicPressure: 0.22,
        restraintPressure: 0.18,
        surfacePressure: 0.76,
        speakReadiness: 0.72,
        presenceWeight: 0.64,
        speakDrive: 0.76,
        silenceDrive: 0.22,
      }),
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, and embodiment still need a stronger same-her closure line.',
        identity: 'A local-first digital life companion with one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        nextClosureTarget: '',
        landedProgressSummary: 'Same-session mirror carry already holds often enough to build from.',
        openClosureSummary: 'Memory, initiative, and embodiment still need stronger end-to-end closure on the same living line.',
        nextClosureTargetSummary: 'Keep the next return low-pressure and let it stay on the same living line before widening outward again.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      } as any,
    })

    expect(ecology.mode).toBe('quiet-accompany')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.shouldSurface).toBe(true)
    expect(ecology.suggestedStyle).toBe('silent-observe')
    expect(ecology.why).toContain('Phase 1 still has open digital-life closure work')
    expect(ecology.why).toContain('same living line')
    expect(ecology.why).not.toContain('cross-modal same-her proof')
  })

  it('falls back to the canonical project-state brief when an explicit projectState is present but still too thin to carry the Phase 1 digital-life closure line', () => {
    const ecology = buildActionEcology({
      now: 58_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
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
          label: 'staying-with-thread',
          sceneAgeMs: 58_000,
          attentionAgeMs: 58_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 58_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-thin-project-state',
        stability: 'stable',
        revisionPressure: 0.18,
        groundingNeed: 0.2,
        contradictionPressure: 0.12,
        hostCorrectionWeight: 0.16,
        narrative: [],
        updatedAt: 58_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.72,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.22,
        reciprocityExpectation: 0.58,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 58_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-thin-project-state',
        dominantNeed: 'guidance',
        readiness: 0.74,
        threads: [{
          id: 'thread-thin-project-state',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The seam is real, but the life loop is not fully closed yet.',
          desiredOutcome: 'point toward the open loop carefully',
          focusBeliefId: 'belief-thin-project-state',
          focusInquiryId: 'inquiry-thin-project-state',
          concernId: null,
          surfacePressure: 0.76,
          silencePressure: 0.24,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 58_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 58_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.62,
        protectiveness: 0.34,
        curiosity: 0.68,
        patience: 0.58,
        desireToSpeak: 0.7,
        fearOfInterrupting: 0.24,
        dominantConcernId: null,
        moodLabel: 'closure-aware-guidance',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.6,
        epistemicPressure: 0.24,
        restraintPressure: 0.18,
        surfacePressure: 0.74,
        speakReadiness: 0.72,
        presenceWeight: 0.64,
        speakDrive: 0.76,
        silenceDrive: 0.22,
      }),
      projectState: {
        preflightSummary: '   ',
        identity: '',
        currentPhase: ' ',
        primaryOpenLoop: null,
        nextClosureTarget: '   ',
        sameHerSelfLine: '',
      },
    })

    expect(ecology.mode).toBe('quiet-accompany')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.shouldSurface).toBe(true)
    expect(ecology.suggestedStyle).toBe('silent-observe')
    expect(ecology.why).toContain('Phase 1 still has open digital-life closure work')
  })

  it('keeps a ripe same-her closure return in quiet measured companionship when the next closure target still says reopen gently', () => {
    const ecology = buildActionEcology({
      now: 62_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['same-thread callback seam visible'],
          inferredNow: ['the line is still alive but should reopen gently'],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 62_000,
          attentionAgeMs: 62_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 62_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-same-her',
        stability: 'stable',
        revisionPressure: 0.12,
        groundingNeed: 0.1,
        contradictionPressure: 0.08,
        hostCorrectionWeight: 0.08,
        narrative: [],
        updatedAt: 62_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.78,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.18,
        reciprocityExpectation: 0.6,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 62_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-same-her',
        dominantNeed: 'guidance',
        readiness: 0.78,
        threads: [{
          id: 'thread-same-her',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The same-her closure line is still here, but it should reopen gently.',
          desiredOutcome: 'keep the same-her closure line visible without widening too early',
          focusBeliefId: 'belief-same-her',
          focusInquiryId: 'inquiry-same-her',
          concernId: null,
          surfacePressure: 0.82,
          silencePressure: 0.22,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 62_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 62_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.64,
        protectiveness: 0.36,
        curiosity: 0.72,
        patience: 0.6,
        desireToSpeak: 0.78,
        fearOfInterrupting: 0.22,
        dominantConcernId: null,
        moodLabel: 'same-her-measured-return',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.62,
        epistemicPressure: 0.18,
        restraintPressure: 0.22,
        surfacePressure: 0.84,
        speakReadiness: 0.8,
        presenceWeight: 0.68,
        speakDrive: 0.82,
        silenceDrive: 0.2,
      }),
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Project identity carry, initiative, and embodiment still need the same-her line to stay intact. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, facial state, motion, and resident presence stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
        identity: 'A local-first digital life companion with one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Project identity carry, initiative, and embodiment still need the same-her line to stay intact.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, facial state, motion, and resident presence stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(ecology.mode).toBe('quiet-accompany')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.shouldSurface).toBe(true)
    expect(ecology.suggestedStyle).toBe('silent-observe')
    expect(ecology.embodiedPresence).toBe('attentive')
    expect(ecology.why).toContain('same-her closure line')
    expect(ecology.why).toContain('Phase 1 still has open digital-life closure work')
    expect(ecology.why).toContain('cross-modal same-her proof')
  })

  it('still keeps outward action lower-pressure when the explicit open-loop wording is thinner but same-her unfinished closure is already carried on the living line', () => {
    const baseline = buildActionEcology({
      now: 66_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['same-thread callback seam visible'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 66_000,
          attentionAgeMs: 66_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 66_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-thin-open-loop',
        stability: 'stable',
        revisionPressure: 0.12,
        groundingNeed: 0.1,
        contradictionPressure: 0.08,
        hostCorrectionWeight: 0.08,
        narrative: [],
        updatedAt: 66_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.78,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.18,
        reciprocityExpectation: 0.6,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 66_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-thin-open-loop',
        dominantNeed: 'guidance',
        readiness: 0.78,
        threads: [{
          id: 'thread-thin-open-loop',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The same-her closure line is still here, but it should reopen gently.',
          desiredOutcome: 'keep the same-her closure line visible without widening too early',
          focusBeliefId: 'belief-thin-open-loop',
          focusInquiryId: 'inquiry-thin-open-loop',
          concernId: null,
          surfacePressure: 0.82,
          silencePressure: 0.22,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 66_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 66_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.64,
        protectiveness: 0.36,
        curiosity: 0.72,
        patience: 0.6,
        desireToSpeak: 0.78,
        fearOfInterrupting: 0.22,
        dominantConcernId: null,
        moodLabel: 'same-her-measured-return',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.62,
        epistemicPressure: 0.18,
        restraintPressure: 0.22,
        surfacePressure: 0.84,
        speakReadiness: 0.8,
        presenceWeight: 0.68,
        speakDrive: 0.82,
        silenceDrive: 0.2,
      }),
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
        identity: 'A local-first digital life companion with one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Project continuity still needs another closure pass.',
        nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line before widening outward.',
        openClosureSummary: 'Same-her continuity is still settling on the same living line before widening outward.',
        emotionalClosureSummary: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      },
    })

    expect(baseline.mode).toBe('quiet-accompany')
    expect(baseline.shouldSpeak).toBe(false)
    expect(baseline.suggestedStyle).toBe('silent-observe')
    expect(baseline.why).toContain('Phase 1 still has open digital-life closure work')
  })

  it('keeps outward action lower-pressure when landed progress already carries the unfinished same-her initiative and embodiment line', () => {
    const ecology = buildActionEcology({
      now: 68_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['same-thread callback seam visible'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 68_000,
          attentionAgeMs: 68_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 68_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-landed-progress-carry',
        stability: 'stable',
        revisionPressure: 0.12,
        groundingNeed: 0.1,
        contradictionPressure: 0.08,
        hostCorrectionWeight: 0.08,
        narrative: [],
        updatedAt: 68_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.78,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.18,
        reciprocityExpectation: 0.6,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 68_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-landed-progress-carry',
        dominantNeed: 'guidance',
        readiness: 0.78,
        threads: [{
          id: 'thread-landed-progress-carry',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The same-her closure line is still here, but it should reopen gently.',
          desiredOutcome: 'keep the same-her closure line visible without widening too early',
          focusBeliefId: 'belief-landed-progress-carry',
          focusInquiryId: 'inquiry-landed-progress-carry',
          concernId: null,
          surfacePressure: 0.82,
          silencePressure: 0.22,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 68_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 68_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.64,
        protectiveness: 0.36,
        curiosity: 0.72,
        patience: 0.6,
        desireToSpeak: 0.78,
        fearOfInterrupting: 0.22,
        dominantConcernId: null,
        moodLabel: 'same-her-measured-return',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.62,
        epistemicPressure: 0.18,
        restraintPressure: 0.22,
        surfacePressure: 0.84,
        speakReadiness: 0.8,
        presenceWeight: 0.68,
        speakDrive: 0.82,
        silenceDrive: 0.2,
      }),
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
        identity: 'A local-first digital life companion with one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project identity carry and same-her continuity already survive across turns, but initiative and embodiment still need stronger closure on the same living line before widening outward.',
        primaryOpenLoop: 'Natural closure rhythm is still being earned.',
        nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(ecology.mode).toBe('quiet-accompany')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.suggestedStyle).toBe('silent-observe')
    expect(ecology.why).toContain('Phase 1 still has open digital-life closure work')
  })

  it('keeps same-her action ecology alive when selector carries lose array scaffolding', () => {
    const ecology = buildActionEcology({
      now: 70_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['same-thread callback seam visible'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 70_000,
          attentionAgeMs: 70_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 70_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-same-her-sparse',
        stability: 'stable',
        revisionPressure: 0.12,
        groundingNeed: 0.1,
        contradictionPressure: 0.08,
        hostCorrectionWeight: 0.08,
        narrative: [],
        updatedAt: 70_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.78,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.18,
        reciprocityExpectation: 0.6,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 70_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-same-her-sparse',
        dominantNeed: 'guidance',
        readiness: 0.78,
        threads: [{
          id: 'thread-same-her-sparse',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The same-her closure line is still here, but it should reopen gently.',
          desiredOutcome: 'keep the same-her closure line visible without widening too early',
          focusBeliefId: 'belief-same-her-sparse',
          focusInquiryId: 'inquiry-same-her-sparse',
          concernId: null,
          surfacePressure: 0.82,
          silencePressure: 0.22,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 70_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 70_000,
      },
      threadRuntime: {
        foregroundThreadId: 'runtime-same-her-sparse',
      } as any,
      selfState: {
        stance: 'approach',
        feltCloseness: 0.64,
        protectiveness: 0.36,
        curiosity: 0.72,
        patience: 0.6,
        desireToSpeak: 0.78,
        fearOfInterrupting: 0.22,
        dominantConcernId: null,
        moodLabel: 'same-her-measured-return',
      },
      selfGovernor: {
        dominantDrive: 'approach',
      } as any,
      thoughtThreads: {
        foregroundThreadId: 'thought-same-her-sparse',
      } as any,
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.62,
        epistemicPressure: 0.18,
        restraintPressure: 0.22,
        surfacePressure: 0.84,
        speakReadiness: 0.8,
        presenceWeight: 0.68,
        speakDrive: 0.82,
        silenceDrive: 0.2,
      }),
      commitmentLedger: {
        governingCommitmentId: 'commitment-same-her-sparse',
        carryPressure: 0.2,
      } as any,
      inquiryPlanner: {
        activePlanId: 'plan-same-her-sparse',
        epistemicPressure: 0.12,
        groundingUrgency: 0.08,
      } as any,
      mindKernel: {
        dominantMode: 'tracking',
      } as any,
      counterfactualDeliberation: {
        selectedOptionId: 'option-same-her-sparse',
      } as any,
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Project identity carry, initiative, and embodiment still need the same-her line to stay intact. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, facial state, motion, and resident presence stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
        identity: 'A local-first digital life companion with one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Project identity carry, initiative, and embodiment still need the same-her line to stay intact.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, facial state, motion, and resident presence stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(ecology.mode).toBe('quiet-accompany')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.shouldSurface).toBe(true)
    expect(ecology.suggestedStyle).toBe('silent-observe')
    expect(ecology.embodiedPresence).toBe('attentive')
    expect(ecology.why).toContain('same-her closure line')
    expect(ecology.why).toContain('Phase 1 still has open digital-life closure work')
    expect(ecology.why).toContain('cross-modal same-her proof')
  })

  it('keeps the stronger same-living-line closure direction visible when richer landed and open summaries already carry the Phase 1 project seam', () => {
    const ecology = buildActionEcology({
      now: 71_000,
      context: createContext(),
      worldModel: {
        activeThread: null,
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
          label: 'staying-with-thread',
          sceneAgeMs: 71_000,
          attentionAgeMs: 71_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 71_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-richer-closure-line',
        stability: 'stable',
        revisionPressure: 0.18,
        groundingNeed: 0.2,
        contradictionPressure: 0.12,
        hostCorrectionWeight: 0.16,
        narrative: [],
        updatedAt: 71_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.72,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.22,
        reciprocityExpectation: 0.58,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 71_000,
      },
      deliberationState: {
        primaryThreadId: 'thread-richer-closure-line',
        dominantNeed: 'guidance',
        readiness: 0.74,
        threads: [{
          id: 'thread-richer-closure-line',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'The seam is real, but the life loop is not fully closed yet.',
          desiredOutcome: 'point toward the open loop carefully',
          focusBeliefId: 'belief-richer-closure-line',
          focusInquiryId: 'inquiry-richer-closure-line',
          concernId: null,
          surfacePressure: 0.76,
          silencePressure: 0.24,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 71_000,
          expiresAt: 180_000,
        }],
        narrative: [],
        updatedAt: 71_000,
      },
      selfState: {
        stance: 'approach',
        feltCloseness: 0.62,
        protectiveness: 0.34,
        curiosity: 0.68,
        patience: 0.58,
        desireToSpeak: 0.7,
        fearOfInterrupting: 0.24,
        dominantConcernId: null,
        moodLabel: 'closure-aware-guidance',
      },
      mindDynamics: createMindDynamics({
        dominantMotive: 'clarify',
        worldPressure: 0.6,
        epistemicPressure: 0.24,
        restraintPressure: 0.18,
        surfacePressure: 0.74,
        speakReadiness: 0.72,
        presenceWeight: 0.64,
        speakDrive: 0.76,
        silenceDrive: 0.22,
      }),
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns. | next=Keep project identity carry, Phase 1 route carry, and unresolved closure carry on one measured-return same living line so visible reply, voice behavior, facial state, motion, and resident presence do not split apart.',
        identity: 'A local-first digital life companion with continuous personhood.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns.',
        nextClosureTarget: 'Keep project identity carry, Phase 1 route carry, and unresolved closure carry on one measured-return same living line so visible reply, voice behavior, facial state, motion, and resident presence do not split apart.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    })

    expect(ecology.mode).toBe('quiet-accompany')
    expect(ecology.shouldSpeak).toBe(false)
    expect(ecology.why).toContain('same living line')
  })
})
