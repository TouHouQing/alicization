import { describe, expect, it } from 'vitest'

import { buildIntentionStream } from './intention-stream'

const baseContext = {
  localTime: { hour: 14, minute: 0, isLateNight: false },
  system: {
    cpuUsage: 18,
    battery: { percent: 82, charging: true },
    memory: { usagePercent: 36, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 12,
    inputActivity: 'active' as const,
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
    boredom: 14,
    loneliness: 18,
    fatigue: 20,
    minutesSinceLastUserTurn: 2,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('buildIntentionStream', () => {
  it('elevates repair-truth when truth repair is still governing', () => {
    const stream = buildIntentionStream({
      now: 20_000,
      context: baseContext,
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The old diff knot is still being carried.',
          confidence: 0.66,
          significance: 0.82,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 20_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'lingering',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: ['What is actually current on screen now?'],
          staleRisks: ['Old diff residue may still be carrying forward.'],
        },
        continuity: {
          label: 'afterglow',
          sceneAgeMs: 6_000,
          attentionAgeMs: 6_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'moderate',
        },
        updatedAt: 20_000,
      },
      repairLedger: {
        governingRepairId: 'repair::stale',
        entries: [{
          id: 'repair::stale',
          kind: 'stale-scene-anchor',
          status: 'open',
          summary: 'The carried diff anchor is outrunning live sight.',
          rationale: 'Continuity is outrunning grounding.',
          urgency: 0.84,
          confidence: 0.8,
          createdAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        repairPressure: 0.82,
        truthRisk: 0.86,
        shouldConstrainPresentTense: true,
        narrative: [],
        updatedAt: 20_000,
      },
      inquiryPlanner: {
        activePlanId: 'plan::reground',
        plans: [{
          id: 'plan::reground',
          kind: 'reground-scene',
          status: 'tracking',
          priority: 'high',
          question: 'Look again before speaking about live screen details.',
          askForGrounding: true,
          suggestedProbeMs: 1_000,
          evidenceWanted: ['fresh-scene'],
          createdAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 120_000,
        }],
        epistemicPressure: 0.82,
        groundingUrgency: 0.78,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(stream.dominantProjectId).toBeTruthy()
    expect(stream.projects[0]?.kind).toBe('repair-truth')
    expect(stream.projects.some(project => project.kind === 'reacquire-scene')).toBe(true)
  })

  it('carries a stay-near project through afterglow instead of dropping it every tick', () => {
    const previous = buildIntentionStream({
      now: 10_000,
      context: baseContext,
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
          label: 'afterglow',
          sceneAgeMs: 2_000,
          attentionAgeMs: 2_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 10_000,
      },
      relationshipModel: {
        climate: 'attuned',
        approachVector: 'stay-near',
        receptivity: 0.72,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.18,
        reciprocityExpectation: 0.4,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 10_000,
      },
    })

    const next = buildIntentionStream({
      now: 11_000,
      context: {
        ...baseContext,
        system: {
          ...baseContext.system,
          inputActivity: 'idle',
        },
      },
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
          label: 'afterglow',
          sceneAgeMs: 3_000,
          attentionAgeMs: 3_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: true,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 11_000,
      },
      relationshipModel: {
        climate: 'attuned',
        approachVector: 'stay-near',
        receptivity: 0.72,
        sharedAttentionTrust: 0.76,
        correctionSensitivity: 0.18,
        reciprocityExpectation: 0.4,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 11_000,
      },
      previous,
    })

    expect(next.projects.some(project => project.kind === 'stay-near' || project.kind === 'witness-afterglow')).toBe(true)
    expect(next.carryPressure).toBeGreaterThan(0)
  })
})
