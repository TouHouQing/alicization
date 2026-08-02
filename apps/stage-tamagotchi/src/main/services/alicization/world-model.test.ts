import { describe, expect, it } from 'vitest'

import { buildWorldModel } from './world-model'

function createContext() {
  return {
    localTime: {
      hour: 14,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 18,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - TypeScript error',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.9,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'error' as const,
      confidence: 0.94,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['error'],
      summary: 'TypeScript error panel',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 72,
      loneliness: 46,
      fatigue: 28,
      minutesSinceLastUserTurn: 8,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

describe('buildWorldModel', () => {
  it('builds a grounded debugging thread from current scene continuity', () => {
    const worldModel = buildWorldModel({
      now: 30_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.94,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      attention: {
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        source: 'current-grounded-scene',
        confidence: 0.92,
        engagedAt: 0,
        lastConfirmedAt: 30_000,
        dwellMs: 30_000,
      },
      recentTransition: null,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    expect(worldModel.activeThread?.kind).toBe('debugging')
    expect(worldModel.activeThread?.source).toBe('grounded-scene')
    expect(worldModel.epistemicState.certainty).toBe('grounded')
    expect(worldModel.hostState.availability).toBe('focused')
    expect(worldModel.continuity.sameSceneAsBefore).toBe(false)
  })

  it('carries the previous coding thread through an afterglow exit instead of dropping it instantly', () => {
    const previousWorldModel = buildWorldModel({
      now: 25 * 60_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'review.diff',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'review.diff',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 25 * 60_000,
      },
      attention: {
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'review.diff',
          pid: 7,
        },
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 0,
        lastConfirmedAt: 25 * 60_000,
        dwellMs: 25 * 60_000,
      },
      recentTransition: null,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    const worldModel = buildWorldModel({
      now: 25 * 60_000 + 30_000,
      context: {
        ...createContext(),
        system: {
          ...createContext().system,
          inputActivity: 'idle',
          foregroundWindow: {
            appName: 'Finder',
            processName: 'Finder',
            title: 'Desktop',
            pid: 11,
          },
        },
        workload: {
          kind: 'browser',
          confidence: 0.44,
          source: 'foreground-window-heuristic',
          matchedLabels: ['browser'],
        },
        content: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      },
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop',
        source: 'foreground-window-heuristic',
        confidence: 0.42,
        target: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Desktop',
          pid: 11,
        },
        beganAt: 25 * 60_000,
        lastSeenAt: 25 * 60_000 + 30_000,
      },
      attention: {
        target: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Desktop',
          pid: 11,
        },
        source: 'foreground-window',
        confidence: 0.68,
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

    expect(worldModel.continuity.afterglowOpen).toBe(true)
    expect(worldModel.activeThread?.status).toBe('lingering')
    expect(worldModel.activeThread?.source).toBe('continuity')
    expect(worldModel.epistemicState.certainty).toBe('lingering')
    expect(worldModel.epistemicState.openQuestions).toContain('world-question:thread-not-regrounded')
    expect(worldModel.epistemicState.staleRisks).toContain('world-risk:continuity-afterimage')
  })

  it('elevates durability shocks into a recovery thread', () => {
    const worldModel = buildWorldModel({
      now: 10_000,
      context: createContext(),
      watchMode: 'recovering',
      scene: null,
      attention: null,
      recentTransition: null,
      previousModel: null,
      workingMemoryEpisodes: [],
      durabilityPulse: {
        kind: 'anr-likely',
        source: 'foreground-app',
        detectedAt: 10_000,
        pid: 7,
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts - TypeScript error',
      },
    })

    expect(worldModel.activeThread?.kind).toBe('recovery')
    expect(worldModel.activeThread?.source).toBe('durability-pulse')
    expect(worldModel.continuity.label).toBe('recovery')
    expect(worldModel.epistemicState.certainty).toBe('observed')
  })

  it('lets fresh grounded evidence replace a stale carried thread', () => {
    const previousWorldModel = buildWorldModel({
      now: 60_000,
      context: {
        ...createContext(),
        workload: {
          kind: 'browser',
          confidence: 0.82,
          source: 'screen-semantic-summary',
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.9,
          source: 'screen-semantic-summary',
          matchedLabels: ['doc'],
          summary: 'Old Chrome page',
        },
        system: {
          ...createContext().system,
          foregroundWindow: {
            appName: 'Google Chrome',
            processName: 'Google Chrome',
            title: 'Old Chrome page',
            pid: 33,
          },
        },
      },
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'browser',
        contentKind: 'doc',
        scenario: 'general',
        summary: 'Old Chrome page',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        target: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Old Chrome page',
          pid: 33,
        },
        beganAt: 0,
        lastSeenAt: 60_000,
      },
      attention: {
        target: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Old Chrome page',
          pid: 33,
        },
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

    const worldModel = buildWorldModel({
      now: 90_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.94,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        beganAt: 70_000,
        lastSeenAt: 90_000,
      },
      attention: {
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts - TypeScript error',
          pid: 7,
        },
        source: 'current-grounded-scene',
        confidence: 0.92,
        engagedAt: 70_000,
        lastConfirmedAt: 90_000,
        dwellMs: 20_000,
      },
      recentTransition: null,
      previousModel: previousWorldModel,
      workingMemoryEpisodes: [],
      durabilityPulse: null,
    })

    expect(worldModel.activeThread?.kind).toBe('debugging')
    expect(worldModel.activeThread?.source).toBe('grounded-scene')
    expect(worldModel.activeThread?.title).toBe('TypeScript error panel')
    expect(worldModel.lingeringThreads.some(thread => thread.title === 'Old Chrome page')).toBe(true)
    expect(worldModel.epistemicState.staleRisks).toContain('world-risk:previous-thread-demoted')
  })
})
