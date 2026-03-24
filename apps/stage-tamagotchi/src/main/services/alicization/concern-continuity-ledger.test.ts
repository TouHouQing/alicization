import { describe, expect, it } from 'vitest'

import { buildConcernContinuityLedger } from './concern-continuity-ledger'

const baseContext = {
  localTime: { hour: 14, minute: 20, isLateNight: false },
  system: {
    cpuUsage: 14,
    battery: { percent: 78, charging: true },
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
    hostAttitude: '礼貌而克制，保持观察',
    boredom: 28,
    loneliness: 18,
    fatigue: 22,
    minutesSinceLastUserTurn: 8,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('buildConcernContinuityLedger', () => {
  it('holds an unresolved diff knot across afterglow instead of dropping it instantly', () => {
    const ledger = buildConcernContinuityLedger({
      now: 25 * 60_000 + 30_000,
      context: {
        ...baseContext,
        workload: {
          kind: 'browser',
          confidence: 0.32,
          source: 'foreground-window-heuristic',
          matchedLabels: ['browser'],
        },
        content: {
          kind: 'unknown',
          confidence: 0.24,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The diff knot is still being carried forward after the scene softened.',
          confidence: 0.74,
          significance: 0.76,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 25 * 60_000 + 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 25 * 60_000 + 30_000,
      },
      concerns: [],
      commitmentLedger: {
        governingCommitmentId: 'commitment::hold-problem::runtime',
        commitments: [{
          id: 'commitment::hold-problem::runtime',
          kind: 'hold-problem',
          status: 'active',
          title: 'Hold Problem',
          summary: 'Still keep the diff knot warm across the seam.',
          source: 'continuity',
          priority: 0.7,
          confidence: 0.72,
          createdAt: 0,
          lastRenewedAt: 25 * 60_000,
          patienceUntil: 26 * 60_000,
          expiresAt: 40 * 60_000,
        }],
        carryPressure: 0.62,
        narrative: [],
        updatedAt: 25 * 60_000 + 30_000,
      },
      previous: {
        governingEntryId: 'concern-continuity::help-fix::runtime.ts diff::thread::runtime-diff',
        entries: [{
          id: 'concern-continuity::help-fix::runtime.ts diff::thread::runtime-diff',
          sourceConcernId: 'concern-1',
          kind: 'help-fix',
          status: 'active',
          summary: 'She is still carrying the runtime diff knot.',
          anchor: 'runtime.ts diff',
          targetThreadId: 'thread::runtime-diff',
          targetCommitmentId: 'commitment::hold-problem::runtime',
          targetInquiryPlanId: null,
          continuityWeight: 0.82,
          freshnessBias: 0.78,
          repairAffinity: 0.18,
          confidence: 0.8,
          createdAt: 0,
          lastUpdatedAt: 25 * 60_000,
          expiresAt: 40 * 60_000,
        }],
        carryPressure: 0.82,
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 25 * 60_000,
      },
    })

    expect(ledger.governingEntryId).toBeTruthy()
    expect(ledger.entries[0]?.status).toBe('carried')
    expect(ledger.carryPressure).toBeGreaterThan(0.45)
  })

  it('refreshes the governing concern when a live coding knot is still present', () => {
    const ledger = buildConcernContinuityLedger({
      now: 30_000,
      context: baseContext,
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is still staring at the runtime diff.',
          confidence: 0.86,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
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
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      concerns: [{
        id: 'concern-1',
        kind: 'help-fix',
        status: 'active',
        summary: 'She is still holding the runtime diff knot.',
        target: null,
        hostGoal: 'resolve-problem',
        tension: 0.84,
        confidence: 0.82,
        careWeight: 0.72,
        createdAt: 0,
        lastEvidenceAt: 30_000,
        patienceUntil: 90_000,
      }],
      commitmentLedger: null,
      previous: null,
    })

    expect(ledger.entries[0]?.status).toBe('active')
    expect(ledger.entries[0]?.kind).toBe('help-fix')
    expect(ledger.entries[0]?.freshnessBias).toBeGreaterThan(0.8)
  })
})
