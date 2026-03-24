import { describe, expect, it } from 'vitest'

import { buildThreadRuntime } from './thread-runtime'

describe('buildThreadRuntime', () => {
  it('turns deliberation and hypotheses into persistent runtime threads', () => {
    const runtime = buildThreadRuntime({
      now: 20_000,
      context: {
        localTime: { hour: 14, minute: 20, isLateNight: false },
        system: {
          cpuUsage: 10,
          battery: { percent: 80, charging: true },
          memory: { usagePercent: 32, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 30,
          inputActivity: 'idle',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'error', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['error'] },
        relationship: {
          hostAttitude: 'observing',
          boredom: 22,
          loneliness: 18,
          fatigue: 20,
          minutesSinceLastUserTurn: 8,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      },
      hypothesisGraph: {
        activeHypothesisId: 'problem-locus::main',
        focusHypothesisIds: ['problem-locus::main', 'live-scene::main'],
        driftPressure: 0.34,
        hypotheses: [{
          id: 'problem-locus::main',
          kind: 'problem-locus',
          status: 'active',
          summary: 'The real knot is narrow enough to approach.',
          confidence: 0.82,
          salience: 0.84,
          evidence: ['error'],
          counterEvidence: [],
          formedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 100_000,
        }, {
          id: 'misread-drift::main',
          kind: 'misread-drift',
          status: 'held',
          summary: 'She still wants to keep one eye on drift.',
          confidence: 0.58,
          salience: 0.52,
          evidence: ['fluid'],
          counterEvidence: [],
          formedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 100_000,
        }],
        narrative: [],
        updatedAt: 20_000,
      },
      deliberationState: {
        primaryThreadId: 'delib-1',
        dominantNeed: 'guidance',
        readiness: 0.72,
        threads: [{
          id: 'delib-1',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'Point toward the real failing locus.',
          desiredOutcome: 'localize the concrete error locus',
          surfacePressure: 0.82,
          silencePressure: 0.26,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 100_000,
        }, {
          id: 'delib-2',
          kind: 'return-later',
          status: 'holding',
          summary: 'Timing still matters.',
          desiredOutcome: 'wait for an opening',
          surfacePressure: 0.24,
          silencePressure: 0.62,
          embodiedPresence: 'hesitant',
          startedAt: 0,
          lastUpdatedAt: 20_000,
          expiresAt: 100_000,
        }],
        narrative: [],
        updatedAt: 20_000,
      },
      previous: null,
    })

    const foreground = runtime.threads.find(thread => thread.id === runtime.foregroundThreadId)
    expect(foreground?.need).toBe('guidance')
    expect(foreground?.status).toBe('foreground')
    expect(runtime.threads.some(thread => thread.status === 'suspended')).toBe(true)
    expect(runtime.driftPressure).toBeGreaterThan(0.2)
  })

  it('carries continuity forward for the same runtime thread', () => {
    const runtime = buildThreadRuntime({
      now: 30_000,
      context: {
        localTime: { hour: 14, minute: 20, isLateNight: false },
        system: {
          cpuUsage: 10,
          battery: { percent: 80, charging: true },
          memory: { usagePercent: 32, freeMB: 4096, totalMB: 8192 },
          idleSeconds: 30,
          inputActivity: 'idle',
          fullscreenLikely: false,
          foregroundWindow: undefined,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['cursor'] },
        content: { kind: 'error', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['error'] },
        relationship: {
          hostAttitude: 'observing',
          boredom: 22,
          loneliness: 18,
          fatigue: 20,
          minutesSinceLastUserTurn: 8,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      },
      hypothesisGraph: {
        activeHypothesisId: 'problem-locus::main',
        focusHypothesisIds: ['problem-locus::main'],
        driftPressure: 0.22,
        hypotheses: [{
          id: 'problem-locus::main',
          kind: 'problem-locus',
          status: 'active',
          summary: 'The knot remains narrow.',
          confidence: 0.82,
          salience: 0.8,
          evidence: [],
          counterEvidence: [],
          formedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 100_000,
        }],
        narrative: [],
        updatedAt: 30_000,
      },
      deliberationState: {
        primaryThreadId: 'delib-1',
        dominantNeed: 'guidance',
        readiness: 0.72,
        threads: [{
          id: 'delib-1',
          kind: 'localize-problem',
          status: 'ripe',
          summary: 'Point toward the real failing locus.',
          desiredOutcome: 'localize the concrete error locus',
          surfacePressure: 0.82,
          silencePressure: 0.26,
          embodiedPresence: 'attentive',
          startedAt: 0,
          lastUpdatedAt: 30_000,
          expiresAt: 100_000,
        }],
        narrative: [],
        updatedAt: 30_000,
      },
      previous: {
        foregroundThreadId: 'runtime::delib-1',
        threads: [{
          id: 'runtime::delib-1',
          sourceThreadId: 'delib-1',
          sourceHypothesisId: 'problem-locus::main',
          need: 'guidance',
          status: 'foreground',
          summary: 'Point toward the real failing locus.',
          salience: 0.74,
          continuity: 0.68,
          whyHeld: 'localize the concrete error locus',
          returnWhen: ['problem-locus-sharpens'],
          suggestedPresence: 'attentive',
          lastActivatedAt: 20_000,
          lastUpdatedAt: 20_000,
          expiresAt: 100_000,
        }],
        driftPressure: 0.24,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    const foreground = runtime.threads.find(thread => thread.id === runtime.foregroundThreadId)
    expect((foreground?.continuity ?? 0)).toBeGreaterThan(0.68)
  })
})
