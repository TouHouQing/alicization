import { describe, expect, it } from 'vitest'

import { buildHypothesisGraph } from './hypothesis-graph'

const baseContext = {
  localTime: { hour: 14, minute: 20, isLateNight: false },
  system: {
    cpuUsage: 12,
    battery: { percent: 82, charging: true },
    memory: { usagePercent: 38, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 16,
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
    confidence: 0.86,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['cursor'],
  },
  content: {
    kind: 'diff' as const,
    confidence: 0.82,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['diff'],
    summary: 'runtime.ts - diff',
  },
  relationship: {
    hostAttitude: 'calm',
    boredom: 40,
    loneliness: 22,
    fatigue: 20,
    minutesSinceLastUserTurn: 8,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('buildHypothesisGraph', () => {
  it('keeps concurrent live-scene, problem-locus, and misread hypotheses', () => {
    const graph = buildHypothesisGraph({
      now: 10_000,
      context: baseContext,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts diff',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is reviewing a diff.',
          confidence: 0.88,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 10_000,
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
        updatedAt: 10_000,
      },
      beliefLedger: {
        focusBeliefId: 'belief-1',
        beliefs: [{
          id: 'belief-1',
          scope: 'scene',
          source: 'percept',
          status: 'tentative',
          statement: 'The diff still hides a concrete knot.',
          confidence: 0.72,
          salience: 0.68,
          evidence: ['diff'],
          entityIds: [],
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 100_000,
        }],
        unresolvedContradictions: ['old-anchor'],
        updatedAt: 10_000,
      },
      beliefRevision: {
        dominantBeliefId: 'belief-1',
        stability: 'fluid',
        revisionPressure: 0.62,
        groundingNeed: 0.44,
        contradictionPressure: 0.48,
        hostCorrectionWeight: 0.32,
        narrative: [],
        updatedAt: 10_000,
      },
      inquiryLoop: {
        primaryInquiryId: 'inquiry-1',
        inquiries: [{
          id: 'inquiry-1',
          kind: 'problem-localization',
          status: 'open',
          priority: 'medium',
          question: 'Which hunk is the real knot?',
          whyItMatters: 'stay precise',
          confidence: 0.76,
          evidenceWanted: [],
          reopenWhen: [],
          openedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 100_000,
        }],
        openCount: 1,
        updatedAt: 10_000,
      },
      recentTransition: null,
      durabilityPulse: null,
      previous: null,
    })

    expect(graph.hypotheses.some(hypothesis => hypothesis.kind === 'live-scene')).toBe(true)
    expect(graph.hypotheses.some(hypothesis => hypothesis.kind === 'problem-locus')).toBe(true)
    expect(graph.hypotheses.some(hypothesis => hypothesis.kind === 'misread-drift')).toBe(true)
    expect(graph.activeHypothesisId).toBeTruthy()
    expect(graph.focusHypothesisIds.length).toBeGreaterThan(0)
  })

  it('elevates recovery-event on serious durability pulse', () => {
    const graph = buildHypothesisGraph({
      now: 10_000,
      context: baseContext,
      watchMode: 'recovering',
      scene: null,
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'recovery',
          sceneAgeMs: 0,
          attentionAgeMs: 0,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'heavy',
        },
        updatedAt: 10_000,
      },
      beliefLedger: {
        focusBeliefId: null,
        beliefs: [],
        unresolvedContradictions: [],
        updatedAt: 10_000,
      },
      beliefRevision: {
        dominantBeliefId: null,
        stability: 'stable',
        revisionPressure: 0.1,
        groundingNeed: 0.12,
        contradictionPressure: 0.08,
        hostCorrectionWeight: 0.1,
        narrative: [],
        updatedAt: 10_000,
      },
      inquiryLoop: null,
      recentTransition: null,
      durabilityPulse: {
        kind: 'anr-likely',
        source: 'foreground-app',
        detectedAt: 10_000,
        pid: 7,
      },
      previous: null,
    })

    const active = graph.hypotheses.find(hypothesis => hypothesis.id === graph.activeHypothesisId)
    expect(active?.kind).toBe('recovery-event')
    expect(graph.driftPressure).toBeGreaterThan(0.2)
  })
})
