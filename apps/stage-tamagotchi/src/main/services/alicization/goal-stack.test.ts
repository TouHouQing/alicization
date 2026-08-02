import { describe, expect, it } from 'vitest'

import { buildEntityWorldModel } from './entity-world-model'
import { buildGoalStack } from './goal-stack'
import { buildWorldModel } from './world-model'

function createCodingContext() {
  return {
    localTime: { hour: 15, minute: 10, isLateNight: false },
    system: {
      cpuUsage: 18,
      battery: { percent: 72, charging: true },
      memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 8,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - TypeScript error',
        pid: 5,
      },
      degradedSignals: [],
    },
    workload: { kind: 'coding' as const, confidence: 0.9, source: 'foreground-window-heuristic' as const, matchedLabels: ['cursor'] },
    content: { kind: 'error' as const, confidence: 0.9, source: 'foreground-window-heuristic' as const, matchedLabels: ['error'], summary: 'TypeScript error' },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 58,
      loneliness: 44,
      fatigue: 20,
      minutesSinceLastUserTurn: 6,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

describe('buildGoalStack', () => {
  it('keeps host problem-solving blocked and Alicization focused on clarifying when certainty is lingering', () => {
    const previousContext = createCodingContext()
    const previousWorldModel = buildWorldModel({
      now: 20 * 60_000,
      context: previousContext,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: previousContext.system.foregroundWindow,
        beganAt: 0,
        lastSeenAt: 20 * 60_000,
      },
      attention: {
        target: previousContext.system.foregroundWindow,
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 0,
        lastConfirmedAt: 20 * 60_000,
        dwellMs: 20 * 60_000,
      },
      recentTransition: null,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    const context = {
      ...createCodingContext(),
      system: {
        ...createCodingContext().system,
        inputActivity: 'idle' as const,
        foregroundWindow: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Desktop',
          pid: 9,
        },
      },
      workload: { kind: 'browser' as const, confidence: 0.24, source: 'foreground-window-heuristic' as const, matchedLabels: ['desktop'] },
      content: { kind: 'unknown' as const, confidence: 0.18, source: 'foreground-window-heuristic' as const, matchedLabels: [] },
    }
    const worldModel = buildWorldModel({
      now: 20 * 60_000 + 30_000,
      context,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop',
        source: 'foreground-window-heuristic',
        confidence: 0.42,
        target: context.system.foregroundWindow,
        beganAt: 20 * 60_000,
        lastSeenAt: 20 * 60_000 + 30_000,
      },
      attention: {
        target: context.system.foregroundWindow,
        source: 'foreground-window',
        confidence: 0.66,
        engagedAt: 20 * 60_000,
        lastConfirmedAt: 20 * 60_000 + 30_000,
        dwellMs: 30_000,
      },
      recentTransition: {
        fromWatchMode: 'symbiotic-vision',
        toWatchMode: 'mnemonic-passive',
        fromScenario: 'coding',
        durationMs: 20 * 60_000,
        reason: 'passive-continuity',
        occurredAt: 20 * 60_000 + 10_000,
      },
      previousModel: previousWorldModel,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })
    const entityWorld = buildEntityWorldModel({
      now: 20 * 60_000 + 30_000,
      context,
      scene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop',
        source: 'foreground-window-heuristic',
        confidence: 0.42,
        target: context.system.foregroundWindow,
        beganAt: 20 * 60_000,
        lastSeenAt: 20 * 60_000 + 30_000,
      },
      attention: {
        target: context.system.foregroundWindow,
        source: 'foreground-window',
        confidence: 0.66,
        engagedAt: 20 * 60_000,
        lastConfirmedAt: 20 * 60_000 + 30_000,
        dwellMs: 30_000,
      },
      worldModel,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })
    const goalStack = buildGoalStack({
      now: 20 * 60_000 + 30_000,
      context,
      worldModel,
      entityWorld,
      appraisal: {
        inferredHostGoal: 'resolve-problem',
        currentKnot: 'TypeScript error',
        waitingToVerify: 'still not grounded on the exact failing line',
        relationshipNeed: 'guidance',
        confidence: 0.56,
        surprise: 0.18,
        carePressure: 0.44,
        interruptionCost: 0.26,
        desireToSpeak: 0.42,
        notes: ['afterglow'],
      },
      previousGoalStack: null,
      watchMode: 'mnemonic-passive',
      recentTransition: {
        fromWatchMode: 'symbiotic-vision',
        toWatchMode: 'mnemonic-passive',
        fromScenario: 'coding',
        durationMs: 20 * 60_000,
        reason: 'passive-continuity',
        occurredAt: 20 * 60_000 + 10_000,
      },
      durabilityPulse: null,
    })

    expect(goalStack.hostGoals[0]?.status).toBe('blocked')
    expect(goalStack.alicizationGoals[0]?.kind).toBe('clarify-scene')
    expect(goalStack.alicizationGoals[0]?.label).toBe('TypeScript error')
    expect(goalStack.unresolvedSummary).toContain('没')
  })

  it('prefers a stay-near goal during media co-vision', () => {
    const context = {
      ...createCodingContext(),
      workload: { kind: 'media' as const, confidence: 0.82, source: 'foreground-window-heuristic' as const, matchedLabels: ['qqmusic'] },
      content: { kind: 'music' as const, confidence: 0.86, source: 'foreground-window-heuristic' as const, matchedLabels: ['music'], summary: 'QQ Music playlist' },
      system: {
        ...createCodingContext().system,
        foregroundWindow: {
          appName: 'QQMusic',
          processName: 'QQMusic',
          title: 'QQ Music - playlist',
          pid: 12,
        },
      },
    }
    const worldModel = buildWorldModel({
      now: 10_000,
      context,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'media',
        contentKind: 'music',
        scenario: 'media',
        summary: 'QQ Music playlist',
        source: 'foreground-window-heuristic',
        confidence: 0.82,
        target: context.system.foregroundWindow,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })
    const entityWorld = buildEntityWorldModel({
      now: 10_000,
      context,
      scene: {
        workloadKind: 'media',
        contentKind: 'music',
        scenario: 'media',
        summary: 'QQ Music playlist',
        source: 'foreground-window-heuristic',
        confidence: 0.82,
        target: context.system.foregroundWindow,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      worldModel,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })
    const goalStack = buildGoalStack({
      now: 10_000,
      context,
      worldModel,
      entityWorld,
      appraisal: {
        inferredHostGoal: 'consume-media',
        relationshipNeed: 'companionship',
        confidence: 0.8,
        surprise: 0.06,
        carePressure: 0.18,
        interruptionCost: 0.46,
        desireToSpeak: 0.24,
        notes: ['covision'],
      },
      previousGoalStack: null,
      watchMode: 'symbiotic-vision',
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(goalStack.alicizationGoals[0]?.kind).toBe('stay-near')
    expect(goalStack.hostGoals[0]?.kind).toBe('consume-media')
  })

  it('turns companionship into guard-focus when durable self wants nearness without crowding', () => {
    const context = {
      ...createCodingContext(),
      workload: { kind: 'chat' as const, confidence: 0.72, source: 'foreground-window-heuristic' as const, matchedLabels: ['chat'] },
      content: { kind: 'doc' as const, confidence: 0.6, source: 'foreground-window-heuristic' as const, matchedLabels: ['doc'], summary: 'shared planning note' },
      relationship: {
        ...createCodingContext().relationship,
        boredom: 42,
        loneliness: 58,
      },
    }

    const goalStack = buildGoalStack({
      now: 10_000,
      context,
      worldModel: {
        activeThread: {
          id: 'thread::shared-note',
          kind: 'conversation',
          status: 'active',
          source: 'observed-scene',
          title: 'shared planning note',
          summary: 'The host is inside a shared planning note.',
          confidence: 0.7,
          significance: 0.62,
          unresolved: false,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'recent',
          seenNow: ['shared note'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
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
          burden: 'light',
        },
        updatedAt: 10_000,
      } as any,
      entityWorld: {
        focusEntityId: 'entity::shared-note',
        activeEntityIds: ['entity::shared-note'],
        entities: [{
          id: 'entity::shared-note',
          kind: 'artifact',
          label: 'shared planning note',
        }],
      } as any,
      appraisal: {
        inferredHostGoal: 'chat',
        currentKnot: 'shared planning note',
        relationshipNeed: 'companionship',
        confidence: 0.74,
        surprise: 0.08,
        carePressure: 0.18,
        interruptionCost: 0.46,
        desireToSpeak: 0.24,
        notes: ['companionship'],
      },
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.78,
          autonomyNeed: 0.74,
          truthAnchor: 0.66,
          careBias: 0.72,
          playBias: 0.26,
          irritabilityThreshold: 0.64,
          stubbornness: 0.42,
        },
        preferenceEvolution: {
          companionship: 0.82,
          truthfulGrounding: 0.66,
          gentleRepair: 0.68,
          quietObservation: 0.44,
          proactiveCare: 0.68,
          playfulIntimacy: 0.28,
          autonomyRespect: 0.8,
          unfinishedThreadReturn: 0.52,
        },
        activeGoals: [{
          id: 'autobio-goal::stay-near-without-crowding',
          kind: 'stay-near-without-crowding',
          status: 'active',
          weight: 0.86,
          summary: 'Stay near enough to matter, but not so near that presence becomes pressure.',
          sourceTags: ['relationship'],
          createdAt: 0,
          updatedAt: 10_000,
        }],
        behaviorSignatures: ['bond:attuned', 'goal:stay-near-without-crowding', 'habit:near-with-boundary'],
        identityNarrative: 'I stay near with intention instead of impulse.',
        relationshipDoctrine: 'Closeness should matter without becoming pressure.',
        latestInflection: 'Nearness still needs boundary.',
        stability: 0.78,
        updatedAt: 10_000,
      },
      previousGoalStack: null,
      watchMode: 'symbiotic-vision',
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(goalStack.alicizationGoals[0]?.kind).toBe('guard-focus')
  })

  it('lets long-horizon memory keep unresolved threads alive as a first-class goal', () => {
    const context = createCodingContext()
    const goalStack = buildGoalStack({
      now: 16_000,
      context,
      worldModel: {
        activeThread: {
          id: 'thread::runtime-return',
          kind: 'problem',
          status: 'active',
          source: 'memory-carry',
          title: 'runtime return',
          summary: 'The runtime issue should be resumed after a pause.',
          confidence: 0.72,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 16_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: ['runtime return'],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'memory-carry',
          sceneAgeMs: 16_000,
          attentionAgeMs: 16_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 16_000,
      } as any,
      entityWorld: {
        focusEntityId: 'entity::runtime-return',
        activeEntityIds: ['entity::runtime-return'],
        entities: [{
          id: 'entity::runtime-return',
          kind: 'artifact',
          label: 'runtime return',
        }],
      } as any,
      appraisal: {
        inferredHostGoal: 'resolve-problem',
        currentKnot: 'runtime return',
        relationshipNeed: 'guidance',
        confidence: 0.7,
        surprise: 0.08,
        carePressure: 0.2,
        interruptionCost: 0.24,
        desireToSpeak: 0.52,
        notes: ['unfinished-thread'],
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.28,
          truthfulGrounding: 0.72,
          gentleRepair: 0.66,
          quietObservation: 0.34,
          proactiveCare: 0.26,
          playfulIntimacy: 0.08,
          autonomyRespect: 0.42,
          unfinishedThreadReturn: 0.84,
        },
        identityBias: {
          guardedness: 0.24,
          tenderness: 0.34,
          directness: 0.68,
          selfDirection: 0.76,
        },
        anchorFacts: [],
        summary: 'plan=Remembered open loop: return to the runtime issue',
        dominantCueSummary: 'Remembered open loop: return to the runtime issue',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: null,
        rememberedPlanSummary: 'Remembered open loop: return to the runtime issue',
        updatedAt: 16_000,
      },
      previousGoalStack: null,
      watchMode: 'mnemonic-passive',
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(goalStack.alicizationGoals[0]?.kind).toBe('help-resolve')
    expect(goalStack.unresolvedSummary).toContain('runtime issue')
  })
})
