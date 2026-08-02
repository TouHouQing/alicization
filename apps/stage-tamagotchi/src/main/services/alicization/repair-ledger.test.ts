import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildRepairLedger } from './repair-ledger'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

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
    hostAttitude: '礼貌而克制，保持观察',
    boredom: 22,
    loneliness: 16,
    fatigue: 20,
    minutesSinceLastUserTurn: 4,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('buildRepairLedger', () => {
  it('opens a reground repair when the live scene is not grounded enough', () => {
    const ledger = buildRepairLedger({
      now: 30_000,
      context: baseContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts diff',
        source: 'foreground-window-heuristic',
        confidence: 0.58,
        target: null,
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'active',
          source: 'observed-scene',
          title: 'runtime.ts diff',
          summary: 'The diff knot is present but not fully grounded.',
          confidence: 0.72,
          significance: 0.8,
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
          openQuestions: ['what is actually visible now?'],
          staleRisks: [],
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
      worldOntology: {
        dominantFrame: 'remembered',
        truthPriority: ['live', 'remembered', 'imagined'],
        live: null,
        remembered: {
          kind: 'remembered',
          summary: 'The current thread is being carried more than directly seen.',
          confidence: 0.62,
          stability: 0.56,
          focusThreadId: 'thread::runtime-diff',
          evidence: ['continuity'],
        },
        imagined: null,
        updatedAt: 30_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fluid',
        revisionPressure: 0.52,
        groundingNeed: 0.74,
        contradictionPressure: 0.36,
        hostCorrectionWeight: 0.26,
        narrative: [],
        updatedAt: 30_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::recheck-scene::runtime',
        commitments: [{
          id: 'commitment::recheck-scene::runtime',
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
      inquiryPlanner: {
        activePlanId: 'plan::reground',
        plans: [{
          id: 'plan::reground',
          kind: 'reground-scene',
          status: 'tracking',
          priority: 'high',
          question: 'What is actually on screen right now?',
          askForGrounding: true,
          suggestedProbeMs: 8_000,
          evidenceWanted: ['fresh-scene-summary'],
          createdAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 120_000,
        }],
        epistemicPressure: 0.7,
        groundingUrgency: 0.8,
        narrative: [],
        updatedAt: 30_000,
      },
      previous: null,
    })

    expect(ledger.entries.some(entry => entry.kind === 'reground-scene')).toBe(true)
    const regroundEntry = ledger.entries.find(entry => entry.kind === 'reground-scene')
    expect(regroundEntry?.rationale).toBe(regroundEntry?.summary)
    const truthBoundaryEntry = ledger.entries.find(entry => entry.kind === 'present-tense-boundary')
    expect(truthBoundaryEntry?.summary).toBe('The diff knot is present but not fully grounded.')
    expect(truthBoundaryEntry?.summary).not.toMatch(/^truth:/u)
    expect(truthBoundaryEntry?.rationale).not.toMatch(/^truth-state:/u)
    expect(ledger.shouldConstrainPresentTense).toBe(true)
    expect(ledger.repairPressure).toBeGreaterThan(0.45)
  })

  it('flags stale screen anchors when continuity outruns fresh sight', () => {
    const ledger = buildRepairLedger({
      now: 50_000,
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
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      },
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop browser',
        source: 'foreground-window-heuristic',
        confidence: 0.42,
        target: null,
        beganAt: 40_000,
        lastSeenAt: 50_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The diff knot is still being carried even though the live scene softened.',
          confidence: 0.66,
          significance: 0.72,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 50_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['old anchor may be stale'],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 50_000,
      },
      concernContinuity: {
        governingEntryId: 'concern-continuity::help-fix::runtime.ts diff::thread::runtime-diff',
        entries: [{
          id: 'concern-continuity::help-fix::runtime.ts diff::thread::runtime-diff',
          sourceConcernId: 'concern-1',
          kind: 'help-fix',
          status: 'carried',
          summary: 'She is still carrying the runtime diff knot.',
          anchor: 'runtime.ts diff',
          targetThreadId: 'thread::runtime-diff',
          targetCommitmentId: null,
          targetInquiryPlanId: null,
          continuityWeight: 0.72,
          freshnessBias: 0.24,
          repairAffinity: 0.56,
          confidence: 0.74,
          createdAt: 0,
          lastUpdatedAt: 50_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.72,
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 50_000,
      },
      previous: null,
    })

    expect(ledger.entries.some(entry => entry.kind === 'stale-scene-anchor')).toBe(true)
    const staleAnchorEntry = ledger.entries.find(entry => entry.kind === 'stale-scene-anchor')
    expect(staleAnchorEntry?.rationale).toBe(staleAnchorEntry?.summary)
    expect(ledger.shouldConstrainPresentTense).toBe(true)
  })

  it('keeps belief contradiction repair text grounded in the conflicting evidence', () => {
    const ledger = buildRepairLedger({
      now: 52_000,
      context: baseContext,
      currentScene: null,
      worldModel: {
        activeThread: {
          id: 'thread::belief-conflict',
          kind: 'change-review',
          status: 'active',
          source: 'observed-scene',
          title: 'runtime conflict',
          summary: 'The current read conflicts with the carried runtime interpretation.',
          confidence: 0.62,
          significance: 0.72,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 52_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'recent',
          seenNow: [],
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
          burden: 'moderate',
        },
        updatedAt: 52_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fluid',
        revisionPressure: 0.58,
        groundingNeed: 0.32,
        contradictionPressure: 0.74,
        hostCorrectionWeight: 0.18,
        narrative: [],
        updatedAt: 52_000,
      },
      hypothesisGraph: {
        activeHypothesisId: 'hypothesis::misread',
        hypotheses: [{
          id: 'hypothesis::misread',
          kind: 'misread-drift',
          status: 'active',
          summary: 'The carried interpretation may be misreading the live diff.',
          confidence: 0.72,
          evidence: [],
          createdAt: 52_000,
          updatedAt: 52_000,
        }],
        contradictionPressure: 0.74,
        narrative: [],
        updatedAt: 52_000,
      } as any,
      previous: null,
    })

    const contradictionEntry = ledger.entries.find(entry => entry.kind === 'belief-contradiction')
    expect(contradictionEntry?.summary).toBe('The carried interpretation may be misreading the live diff.')
    expect(contradictionEntry?.rationale).toBe(contradictionEntry?.summary)
    expect(contradictionEntry?.rationale).not.toMatch(/^contradiction:/u)
  })

  it('prefers runtime surface truth cues over conflicting raw repair inputs', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(54_000),
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'Desktop browser',
        source: 'foreground-window-heuristic',
        confidence: 0.42,
        target: null,
        beganAt: 44_000,
        lastSeenAt: 54_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-diff',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The diff knot is still being carried even though the live scene softened.',
          confidence: 0.66,
          significance: 0.72,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 54_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['what is actually visible now?'],
          staleRisks: ['old anchor may be stale'],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 10_000,
          attentionAgeMs: 10_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 54_000,
      },
      worldOntology: {
        dominantFrame: 'remembered',
        truthPriority: ['live', 'remembered', 'imagined'],
        live: null,
        remembered: {
          kind: 'remembered',
          summary: 'The current thread is being carried more than directly seen.',
          confidence: 0.62,
          stability: 0.56,
          focusThreadId: 'thread::runtime-diff',
          evidence: ['continuity'],
        },
        imagined: null,
        updatedAt: 54_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'fluid',
        revisionPressure: 0.52,
        groundingNeed: 0.74,
        contradictionPressure: 0.36,
        hostCorrectionWeight: 0.26,
        narrative: [],
        updatedAt: 54_000,
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::recheck-scene::runtime',
        commitments: [{
          id: 'commitment::recheck-scene::runtime',
          kind: 'recheck-scene',
          status: 'active',
          title: 'recheck-scene',
          summary: 'commitment:recheck-scene',
          source: 'continuity',
          priority: 0.76,
          confidence: 0.7,
          createdAt: 0,
          lastRenewedAt: 54_000,
          patienceUntil: 60_000,
          expiresAt: 120_000,
        }],
        carryPressure: 0.58,
        narrative: [],
        updatedAt: 54_000,
      },
      inquiryPlanner: {
        activePlanId: 'plan::reground',
        plans: [{
          id: 'plan::reground',
          kind: 'reground-scene',
          status: 'tracking',
          priority: 'high',
          question: 'What is actually on screen right now?',
          askForGrounding: true,
          suggestedProbeMs: 8_000,
          evidenceWanted: ['fresh-scene-summary'],
          createdAt: 0,
          lastUpdatedAt: 54_000,
          expiresAt: 120_000,
        }],
        epistemicPressure: 0.7,
        groundingUrgency: 0.8,
        narrative: [],
        updatedAt: 54_000,
      },
    } as any

    const ledger = buildRepairLedger({
      now: 54_000,
      context: baseContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'fresh grounded diff',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: null,
        beganAt: 53_000,
        lastSeenAt: 54_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::raw-conflict',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'fresh grounded diff',
          summary: 'This raw path should be ignored.',
          confidence: 0.88,
          significance: 0.82,
          unresolved: false,
          beganAt: 53_000,
          lastUpdatedAt: 54_000,
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
          label: 'same-scene',
          sceneAgeMs: 1_000,
          attentionAgeMs: 1_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'light',
        },
        updatedAt: 54_000,
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
      previous: null,
    })

    expect(ledger.entries.some(entry => entry.kind === 'reground-scene')).toBe(true)
    expect(ledger.entries.some(entry => entry.kind === 'stale-scene-anchor')).toBe(true)
    expect(ledger.shouldConstrainPresentTense).toBe(true)
  })
})
