import { describe, expect, it } from 'vitest'

import { buildInquiryPlanner } from './inquiry-planner'

const baseContext = {
  localTime: { hour: 14, minute: 10, isLateNight: false },
  system: {
    cpuUsage: 12,
    battery: { percent: 80, charging: true },
    memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 18,
    inputActivity: 'idle' as const,
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
    kind: 'coding' as const,
    confidence: 0.88,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['cursor'],
  },
  content: {
    kind: 'diff' as const,
    confidence: 0.84,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['diff'],
    summary: 'runtime.ts - diff',
  },
  relationship: {
    hostAttitude: 'calm',
    boredom: 34,
    loneliness: 20,
    fatigue: 26,
    minutesSinceLastUserTurn: 8,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('buildInquiryPlanner', () => {
  it('turns grounding uncertainty into an explicit reground-scene plan', () => {
    const planner = buildInquiryPlanner({
      now: 30_000,
      context: baseContext,
      worldModel: {
        activeThread: {
          id: 'thread-1',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts error',
          summary: 'There is still an unresolved debugging knot.',
          confidence: 0.74,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['what is actually on screen now?'],
          staleRisks: ['old continuity may be stale'],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 8_000,
          attentionAgeMs: 8_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::recheck-scene::live-scene',
        commitments: [{
          id: 'commitment::recheck-scene::live-scene',
          kind: 'recheck-scene',
          status: 'active',
          title: 'recheck-scene',
          summary: 'commitment:recheck-scene',
          source: 'continuity',
          priority: 0.76,
          confidence: 0.7,
          createdAt: 0,
          lastRenewedAt: 30_000,
          patienceUntil: 60_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.58,
        narrative: [],
        updatedAt: 30_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fluid',
        revisionPressure: 0.52,
        groundingNeed: 0.74,
        contradictionPressure: 0.48,
        hostCorrectionWeight: 0.26,
        narrative: [],
        updatedAt: 30_000,
      },
      previous: null,
    })

    const activePlan = planner.plans.find(plan => plan.id === planner.activePlanId)
    expect(activePlan?.kind).toBe('reground-scene')
    expect(activePlan?.askForGrounding).toBe(true)
    expect(planner.groundingUrgency).toBeGreaterThan(0.5)
  })

  it('waits for an opening instead of forcing companionship through a busy seam', () => {
    const planner = buildInquiryPlanner({
      now: 30_000,
      context: {
        ...baseContext,
        system: {
          ...baseContext.system,
          inputActivity: 'active',
        },
      },
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 4_000,
          attentionAgeMs: 4_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'focused',
          burden: 'light',
        },
        updatedAt: 30_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::stay-near::afterglow',
        commitments: [{
          id: 'commitment::stay-near::afterglow',
          kind: 'stay-near',
          status: 'active',
          title: 'stay-near',
          summary: 'thread:wait-opening',
          source: 'continuity',
          priority: 0.62,
          confidence: 0.68,
          createdAt: 0,
          lastRenewedAt: 30_000,
          patienceUntil: 60_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.46,
        narrative: [],
        updatedAt: 30_000,
      },
      previous: null,
    })

    const activePlan = planner.plans.find(plan => plan.id === planner.activePlanId)
    expect(activePlan?.kind).toBe('wait-opening')
    expect(activePlan?.status).toBe('waiting-opening')
    expect(activePlan?.question).toBe('inquiry:wait-opening')
    expect(planner.narrative).toContain('timing:wait-opening')
  })

  it('keeps an observed diff in localize-problem instead of reflexively regrounding it', () => {
    const planner = buildInquiryPlanner({
      now: 30_000,
      context: baseContext,
      worldModel: {
        activeThread: {
          id: 'thread-1',
          kind: 'change-review',
          status: 'active',
          source: 'observed-scene',
          title: 'runtime.ts diff',
          summary: 'thread:change-review',
          confidence: 0.74,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
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
          label: 'staying-with-thread',
          sceneAgeMs: 8_000,
          attentionAgeMs: 8_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::hold-problem::runtime',
        commitments: [{
          id: 'commitment::hold-problem::runtime',
          kind: 'hold-problem',
          status: 'active',
          title: 'hold-problem',
          summary: 'The concrete diff knot should stay foregrounded.',
          source: 'hypothesis',
          priority: 0.74,
          confidence: 0.72,
          createdAt: 0,
          lastRenewedAt: 30_000,
          patienceUntil: 60_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.62,
        narrative: [],
        updatedAt: 30_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fluid',
        revisionPressure: 0.38,
        groundingNeed: 0.48,
        contradictionPressure: 0.18,
        hostCorrectionWeight: 0.22,
        narrative: [],
        updatedAt: 30_000,
      },
      previous: null,
    })

    const activePlan = planner.plans.find(plan => plan.id === planner.activePlanId)
    expect(activePlan?.kind).toBe('localize-problem')
    expect(activePlan?.askForGrounding).toBe(false)
    expect(activePlan?.question).toBe('inquiry:localize-problem')
  })
})
