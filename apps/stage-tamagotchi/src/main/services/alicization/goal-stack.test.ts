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
})
