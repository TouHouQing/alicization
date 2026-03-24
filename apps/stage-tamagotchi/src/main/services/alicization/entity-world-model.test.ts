import { describe, expect, it } from 'vitest'

import { buildEntityWorldModel } from './entity-world-model'
import { buildWorldModel } from './world-model'

function createContext() {
  return {
    localTime: {
      hour: 15,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: 14,
      battery: { percent: 78, charging: true },
      memory: { usagePercent: 36, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 12,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - review.diff',
        pid: 17,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.88,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'diff' as const,
      confidence: 0.9,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['diff'],
      summary: 'review.diff',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 64,
      loneliness: 40,
      fatigue: 24,
      minutesSinceLastUserTurn: 4,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

describe('buildEntityWorldModel', () => {
  it('materializes stable entities and relations from the active coding thread', () => {
    const context = createContext()
    const worldModel = buildWorldModel({
      now: 60_000,
      context,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'review.diff',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: context.system.foregroundWindow,
        beganAt: 0,
        lastSeenAt: 60_000,
      },
      attention: {
        target: context.system.foregroundWindow,
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 0,
        lastConfirmedAt: 60_000,
        dwellMs: 60_000,
      },
      recentTransition: null,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    const entityWorld = buildEntityWorldModel({
      now: 60_000,
      context,
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'review.diff',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: context.system.foregroundWindow,
        beganAt: 0,
        lastSeenAt: 60_000,
      },
      attention: {
        target: context.system.foregroundWindow,
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 0,
        lastConfirmedAt: 60_000,
        dwellMs: 60_000,
      },
      worldModel,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    expect(entityWorld.entities.some(entity => entity.kind === 'process')).toBe(true)
    expect(entityWorld.entities.some(entity => entity.kind === 'window')).toBe(true)
    expect(entityWorld.entities.some(entity => entity.kind === 'task')).toBe(true)
    expect(entityWorld.entities.some(entity => entity.kind === 'artifact')).toBe(true)
    expect(entityWorld.relations.some(relation => relation.kind === 'about')).toBe(true)
    expect(entityWorld.focusEntityId).toMatch(/^artifact::/)
  })

  it('keeps the old coding task alive across afterglow while foreground moves elsewhere', () => {
    const codingContext = createContext()
    const previousWorldModel = buildWorldModel({
      now: 25 * 60_000,
      context: codingContext,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'review.diff',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: codingContext.system.foregroundWindow,
        beganAt: 0,
        lastSeenAt: 25 * 60_000,
      },
      attention: {
        target: codingContext.system.foregroundWindow,
        source: 'current-grounded-scene',
        confidence: 0.88,
        engagedAt: 0,
        lastConfirmedAt: 25 * 60_000,
        dwellMs: 25 * 60_000,
      },
      recentTransition: null,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })
    const previousEntityWorld = buildEntityWorldModel({
      now: 25 * 60_000,
      context: codingContext,
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'review.diff',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: codingContext.system.foregroundWindow,
        beganAt: 0,
        lastSeenAt: 25 * 60_000,
      },
      attention: {
        target: codingContext.system.foregroundWindow,
        source: 'current-grounded-scene',
        confidence: 0.88,
        engagedAt: 0,
        lastConfirmedAt: 25 * 60_000,
        dwellMs: 25 * 60_000,
      },
      worldModel: previousWorldModel,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    const currentContext = {
      ...createContext(),
      system: {
        ...createContext().system,
        inputActivity: 'idle' as const,
        foregroundWindow: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Desktop',
          pid: 22,
        },
      },
      workload: {
        kind: 'browser' as const,
        confidence: 0.3,
        source: 'foreground-window-heuristic' as const,
        matchedLabels: ['desktop'],
      },
      content: {
        kind: 'unknown' as const,
        confidence: 0.2,
        source: 'foreground-window-heuristic' as const,
        matchedLabels: [],
      },
    }
    const worldModel = buildWorldModel({
      now: 25 * 60_000 + 30_000,
      context: currentContext,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop',
        source: 'foreground-window-heuristic',
        confidence: 0.4,
        target: currentContext.system.foregroundWindow,
        beganAt: 25 * 60_000,
        lastSeenAt: 25 * 60_000 + 30_000,
      },
      attention: {
        target: currentContext.system.foregroundWindow,
        source: 'foreground-window',
        confidence: 0.6,
        engagedAt: 25 * 60_000,
        lastConfirmedAt: 25 * 60_000 + 30_000,
        dwellMs: 30_000,
      },
      recentTransition: {
        fromWatchMode: 'symbiotic-vision',
        toWatchMode: 'mnemonic-passive',
        fromScenario: 'coding',
        durationMs: 25 * 60_000,
        reason: 'passive-continuity',
        occurredAt: 25 * 60_000 + 10_000,
      },
      previousModel: previousWorldModel,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    const entityWorld = buildEntityWorldModel({
      now: 25 * 60_000 + 30_000,
      context: currentContext,
      scene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop',
        source: 'foreground-window-heuristic',
        confidence: 0.4,
        target: currentContext.system.foregroundWindow,
        beganAt: 25 * 60_000,
        lastSeenAt: 25 * 60_000 + 30_000,
      },
      attention: {
        target: currentContext.system.foregroundWindow,
        source: 'foreground-window',
        confidence: 0.6,
        engagedAt: 25 * 60_000,
        lastConfirmedAt: 25 * 60_000 + 30_000,
        dwellMs: 30_000,
      },
      worldModel,
      previousModel: previousEntityWorld,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    expect(entityWorld.entities.some(entity => entity.kind === 'task' && entity.label.includes('review.diff'))).toBe(true)
    expect(entityWorld.entities.some(entity => entity.kind === 'window' && entity.label.includes('Desktop'))).toBe(true)
    expect(entityWorld.relations.some(relation => relation.kind === 'continues')).toBe(true)
  })
})
