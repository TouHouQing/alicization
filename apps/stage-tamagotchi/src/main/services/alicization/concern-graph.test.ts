import { describe, expect, it } from 'vitest'

import { updateConcernGraph } from './concern-graph'
import { buildWorldModel } from './world-model'

function createContext() {
  return {
    localTime: {
      hour: 2,
      minute: 10,
      isLateNight: true,
    },
    system: {
      cpuUsage: 10,
      battery: { percent: 50, charging: false },
      memory: { usagePercent: 48, freeMB: 4096, totalMB: 16384 },
      idleSeconds: 12,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'diff view',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.8,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'diff' as const,
      confidence: 0.8,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: ['diff'],
      summary: 'diff view',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 74,
      loneliness: 54,
      fatigue: 35,
      minutesSinceLastUserTurn: 9,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

describe('updateConcernGraph', () => {
  it('creates a stable unresolved thread instead of discarding concern every tick', () => {
    const worldModel = buildWorldModel({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'diff view',
        source: 'foreground-window-heuristic',
        confidence: 0.8,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'diff view',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousModel: null,
      workingMemoryEpisodes: [],
    })
    const concerns = updateConcernGraph({
      now: 10_000,
      previousConcerns: [],
      context: createContext(),
      worldModel,
      appraisal: {
        inferredHostGoal: 'inspect-change',
        currentKnot: 'diff view',
        confidence: 0.84,
        surprise: 0.2,
        carePressure: 0.42,
        interruptionCost: 0.22,
        desireToSpeak: 0.52,
        notes: ['diff-visible'],
      },
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'diff view',
        source: 'foreground-window-heuristic',
        confidence: 0.8,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'diff view',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(concerns).toHaveLength(1)
    expect(concerns[0]?.kind).toBe('help-fix')
    expect(concerns[0]?.summary).toContain('diff')
  })

  it('keeps older concerns lingering for a while instead of resetting instantly', () => {
    const worldModel = buildWorldModel({
      now: 20_000,
      context: createContext(),
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousModel: null,
      workingMemoryEpisodes: [],
    })
    const concerns = updateConcernGraph({
      now: 20_000,
      previousConcerns: [{
        id: 'old',
        kind: 'co-watch',
        status: 'active',
        summary: '她还在陪你停留在当前内容里。',
        hostGoal: 'consume-media',
        tension: 0.4,
        confidence: 0.7,
        careWeight: 0.52,
        createdAt: 0,
        lastEvidenceAt: 18_000,
        patienceUntil: 50_000,
      }],
      context: createContext(),
      worldModel,
      appraisal: {
        inferredHostGoal: 'inspect-change',
        currentKnot: 'diff view',
        confidence: 0.84,
        surprise: 0.2,
        carePressure: 0.42,
        interruptionCost: 0.22,
        desireToSpeak: 0.52,
        notes: ['diff-visible'],
      },
      scene: null,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(concerns.some(item => item.id === 'old' && item.status === 'lingering')).toBe(true)
  })
})
