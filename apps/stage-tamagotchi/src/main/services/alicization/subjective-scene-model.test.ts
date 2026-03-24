import { describe, expect, it } from 'vitest'

import {
  buildSubjectiveSceneAppraisal,
  mergeSubjectiveSceneAppraisal,
  parseSubjectiveSceneAppraisalCandidate,
} from './subjective-scene-model'
import { buildWorldModel } from './world-model'

function createContext() {
  return {
    localTime: {
      hour: 1,
      minute: 20,
      isLateNight: true,
    },
    system: {
      cpuUsage: 12,
      battery: { percent: 76, charging: true },
      memory: { usagePercent: 44, freeMB: 2048, totalMB: 8192 },
      idleSeconds: 25,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'proactive-policy.ts',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.88,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'error' as const,
      confidence: 0.91,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['error'],
      summary: 'TypeScript error panel',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 80,
      loneliness: 66,
      fatigue: 41,
      minutesSinceLastUserTurn: 10,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

describe('buildSubjectiveSceneAppraisal', () => {
  it('forms a host-goal hypothesis and knot instead of only scene labels', () => {
    const worldModel = buildWorldModel({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'proactive-policy.ts',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      workingMemoryEpisodes: [],
      previousModel: null,
    })
    const appraisal = buildSubjectiveSceneAppraisal({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'proactive-policy.ts',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      worldModel,
      recentTransition: null,
      durabilityPulse: null,
      workingMemoryEpisodes: [],
    })

    expect(appraisal.inferredHostGoal).toBe('resolve-problem')
    expect(appraisal.currentKnot).toContain('TypeScript')
    expect(appraisal.relationshipNeed).toBe('guidance')
    expect(appraisal.source).toBe('heuristic')
    expect(appraisal.notes).toContain('error-visible')
    expect(appraisal.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('treats durability shocks as high-surprise world changes', () => {
    const worldModel = buildWorldModel({
      now: 10_000,
      context: createContext(),
      watchMode: 'recovering',
      scene: null,
      attention: null,
      recentTransition: null,
      durabilityPulse: {
        kind: 'anr-likely',
        source: 'foreground-app',
        detectedAt: 10_000,
        pid: 7,
      },
      workingMemoryEpisodes: [],
      previousModel: null,
    })
    const appraisal = buildSubjectiveSceneAppraisal({
      now: 10_000,
      context: createContext(),
      watchMode: 'recovering',
      scene: null,
      attention: null,
      worldModel,
      recentTransition: null,
      durabilityPulse: {
        kind: 'anr-likely',
        source: 'foreground-app',
        detectedAt: 10_000,
        pid: 7,
      },
      workingMemoryEpisodes: [],
    })

    expect(appraisal.surprise).toBeGreaterThan(0.85)
    expect(appraisal.whatChanged).toContain('崩溃')
  })

  it('merges structured cognition over the heuristic base instead of replacing it wholesale', () => {
    const worldModel = buildWorldModel({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: null,
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      workingMemoryEpisodes: [],
      previousModel: null,
    })
    const heuristic = buildSubjectiveSceneAppraisal({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: null,
      attention: null,
      worldModel,
      recentTransition: null,
      durabilityPulse: null,
      workingMemoryEpisodes: [],
    })
    const parsed = parseSubjectiveSceneAppraisalCandidate(JSON.stringify({
      inferredHostGoal: 'resolve-problem',
      currentKnot: 'TypeScript narrowing around proactive policy',
      situatedMeaning: '这更像宿主在对着一个具体故障点反复确认。',
      relationshipNeed: 'guidance',
      confidence: 0.82,
      carePressure: 0.74,
      interruptionCost: 0.28,
      desireToSpeak: 0.62,
      notes: ['structured-focus', 'live-debug'],
    }))
    const merged = mergeSubjectiveSceneAppraisal(heuristic, parsed)

    expect(merged.source).toBe('hybrid')
    expect(merged.currentKnot).toContain('TypeScript')
    expect(merged.situatedMeaning).toContain('具体故障点')
    expect(merged.notes).toContain('structured-cognition')
    expect(merged.notes).toContain('live-debug')
  })
})
