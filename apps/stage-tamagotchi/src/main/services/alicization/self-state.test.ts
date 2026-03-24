import { describe, expect, it } from 'vitest'

import { buildSelfState } from './self-state'
import { buildWorldModel } from './world-model'

describe('buildSelfState', () => {
  it('becomes protective when concern and care pressure are high', () => {
    const context = {
      localTime: { hour: 1, minute: 40, isLateNight: true },
      system: {
        cpuUsage: 8,
        battery: { percent: 38, charging: false },
        memory: { usagePercent: 40, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 15,
        inputActivity: 'idle' as const,
        fullscreenLikely: false,
        foregroundWindow: undefined,
        degradedSignals: [],
      },
      workload: { kind: 'game' as const, confidence: 0.8, source: 'foreground-window-heuristic' as const, matchedLabels: ['game'] },
      content: { kind: 'gameplay' as const, confidence: 0.8, source: 'foreground-window-heuristic' as const, matchedLabels: ['gameplay'] },
      relationship: {
        hostAttitude: '礼貌而克制，保持观察',
        boredom: 50,
        loneliness: 60,
        fatigue: 82,
        minutesSinceLastUserTurn: 12,
        reminderBacklog: 0,
        lateNightActiveMinutes: 160,
        recentProactiveOutcomes: [],
      },
    }
    const worldModel = buildWorldModel({
      now: 10_000,
      context,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'game',
        contentKind: 'gameplay',
        scenario: 'late-night-care',
        summary: 'gameplay',
        source: 'foreground-window-heuristic',
        confidence: 0.7,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousModel: null,
      workingMemoryEpisodes: [],
    })
    const selfState = buildSelfState({
      context,
      worldModel,
      appraisal: {
        inferredHostGoal: 'rest',
        confidence: 0.8,
        surprise: 0.1,
        carePressure: 0.92,
        interruptionCost: 0.12,
        desireToSpeak: 0.74,
        notes: ['late-night'],
      },
      concerns: [{
        id: 'care',
        kind: 'care-body',
        status: 'active',
        summary: '她担心你正在把自己拖进更深的疲惫里。',
        hostGoal: 'rest',
        tension: 0.84,
        confidence: 0.82,
        careWeight: 0.96,
        createdAt: 0,
        lastEvidenceAt: 10_000,
        patienceUntil: 60_000,
      }],
      watchMode: 'mnemonic-passive',
    })

    expect(selfState.stance).toBe('protect')
    expect(selfState.protectiveness).toBeGreaterThanOrEqual(0.76)
  })

  it('pulls back into repair when belief revision says the world is fractured', () => {
    const context = {
      localTime: { hour: 15, minute: 20, isLateNight: false },
      system: {
        cpuUsage: 10,
        battery: { percent: 86, charging: true },
        memory: { usagePercent: 36, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 32,
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
      workload: { kind: 'coding' as const, confidence: 0.9, source: 'foreground-window-heuristic' as const, matchedLabels: ['cursor'] },
      content: { kind: 'diff' as const, confidence: 0.88, source: 'foreground-window-heuristic' as const, matchedLabels: ['diff'] },
      relationship: {
        hostAttitude: '礼貌而克制，保持观察',
        boredom: 62,
        loneliness: 54,
        fatigue: 18,
        minutesSinceLastUserTurn: 4,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes: [],
      },
    }
    const worldModel = buildWorldModel({
      now: 20_000,
      context,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts - diff',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        beganAt: 0,
        lastSeenAt: 20_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      previousModel: null,
      workingMemoryEpisodes: [],
    })

    const selfState = buildSelfState({
      context,
      worldModel,
      appraisal: {
        inferredHostGoal: 'inspect-change',
        currentKnot: 'runtime.ts - diff',
        confidence: 0.82,
        surprise: 0.1,
        carePressure: 0.18,
        interruptionCost: 0.22,
        desireToSpeak: 0.82,
        notes: ['grounded-diff'],
      },
      concerns: [],
      watchMode: 'symbiotic-vision',
      beliefRevision: {
        dominantBeliefId: 'belief-1',
        stability: 'fractured',
        revisionPressure: 0.76,
        groundingNeed: 0.82,
        contradictionPressure: 0.64,
        hostCorrectionWeight: 0.72,
        narrative: ['beliefs-require-revision'],
        updatedAt: 20_000,
      },
      relationshipModel: {
        climate: 'warm',
        approachVector: 'guide',
        receptivity: 0.68,
        sharedAttentionTrust: 0.7,
        correctionSensitivity: 0.36,
        reciprocityExpectation: 0.52,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(selfState.stance).toBe('hesitate')
    expect(selfState.moodLabel).toBe('repairing-confidence')
    expect(selfState.fearOfInterrupting).toBeGreaterThan(0.4)
  })
})
