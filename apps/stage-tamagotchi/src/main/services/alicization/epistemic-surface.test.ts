import { describe, expect, it } from 'vitest'

import { buildEpistemicSurfacePosture } from './epistemic-surface'

const baseContext = {
  localTime: { hour: 14, minute: 5, isLateNight: false },
  system: {
    cpuUsage: 12,
    battery: { percent: 80, charging: true },
    memory: { usagePercent: 40, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 22,
    inputActivity: 'idle' as const,
    fullscreenLikely: false,
    foregroundWindow: {
      appName: 'Visual Studio Code',
      processName: 'Code',
      title: 'index.ts - diff',
      pid: 7,
    },
    degradedSignals: [],
  },
  workload: {
    kind: 'coding' as const,
    confidence: 0.84,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['vscode'],
  },
  content: {
    kind: 'diff' as const,
    confidence: 0.82,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['diff'],
    summary: 'index.ts - diff',
  },
  relationship: {
    hostAttitude: '礼貌而克制，保持观察',
    boredom: 84,
    loneliness: 72,
    fatigue: 18,
    minutesSinceLastUserTurn: 8,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('buildEpistemicSurfacePosture', () => {
  it('keeps an observed live diff as a surfaceable problem thread when contradictions stay low', () => {
    const posture = buildEpistemicSurfacePosture({
      context: baseContext,
      worldModel: {
        activeThread: {
          id: 'thread::diff',
          kind: 'change-review',
          status: 'active',
          source: 'observed-scene',
          title: 'index.ts - diff',
          summary: 'The host is still reviewing a live diff.',
          confidence: 0.74,
          significance: 0.7,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['当前只拿到了窗口级线索，还没有稳定内容级 grounding。'],
        },
        continuity: {
          label: 'new-focus',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fluid',
        revisionPressure: 0.38,
        groundingNeed: 0.48,
        contradictionPressure: 0.18,
        hostCorrectionWeight: 0.22,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(posture.coarseObservedProblemHolding).toBe(true)
    expect(posture.requiresRegroundBeforeSurface).toBe(false)
  })

  it('still requires regrounding when the scene is lingering or contradiction pressure is high', () => {
    const posture = buildEpistemicSurfacePosture({
      context: baseContext,
      worldModel: {
        activeThread: {
          id: 'thread::diff',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'index.ts - diff',
          summary: 'This may still be the old diff thread.',
          confidence: 0.52,
          significance: 0.54,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['她还没重新看见这条线程，只是在沿着刚才的连续性跟着它。'],
          staleRisks: ['旧线程可能污染这次理解。'],
        },
        continuity: {
          label: 'recovery',
          sceneAgeMs: 20_000,
          attentionAgeMs: 20_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fractured',
        revisionPressure: 0.72,
        groundingNeed: 0.78,
        contradictionPressure: 0.46,
        hostCorrectionWeight: 0.4,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(posture.coarseObservedProblemHolding).toBe(false)
    expect(posture.requiresRegroundBeforeSurface).toBe(true)
  })
})
