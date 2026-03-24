import type { AlicizationWorldModelSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildMindDynamics } from './mind-dynamics'

function createContext(overrides: Partial<AlicizationProactiveLayeredContext> = {}): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 14,
      minute: 10,
      isLateNight: false,
    },
    system: {
      cpuUsage: 18,
      battery: { percent: 76, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 18,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'app.ts - feature diff',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.88,
      source: 'foreground-window-heuristic',
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'diff',
      confidence: 0.84,
      source: 'foreground-window-heuristic',
      matchedLabels: ['diff'],
      summary: 'feature diff',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 42,
      loneliness: 36,
      fatigue: 24,
      minutesSinceLastUserTurn: 8,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

function createWorldModel(overrides: Partial<AlicizationWorldModelSnapshot> = {}): AlicizationWorldModelSnapshot {
  return {
    activeThread: {
      id: 'thread-1',
      kind: 'change-review',
      status: 'active',
      source: 'grounded-scene',
      title: 'feature diff',
      summary: '宿主正在审视一段 diff。',
      confidence: 0.84,
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
      seenNow: ['feature diff'],
      inferredNow: [],
      openQuestions: [],
      staleRisks: [],
    },
    continuity: {
      label: 'staying-with-thread',
      sceneAgeMs: 120_000,
      attentionAgeMs: 120_000,
      sameSceneAsBefore: true,
      sameAttentionAsBefore: true,
      afterglowOpen: false,
    },
    hostState: {
      availability: 'open',
      burden: 'moderate',
    },
    updatedAt: 10_000,
    ...overrides,
  }
}

describe('buildMindDynamics', () => {
  it('centers clarify/protect drives on grounded coding friction', () => {
    const dynamics = buildMindDynamics({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      worldModel: createWorldModel(),
      appraisal: {
        inferredHostGoal: 'inspect-change',
        confidence: 0.84,
        surprise: 0.12,
        carePressure: 0.28,
        interruptionCost: 0.12,
        desireToSpeak: 0.7,
        relationshipNeed: 'guidance',
        currentKnot: 'feature diff',
        notes: ['world-grounded'],
      },
      concerns: [{
        id: 'help-fix',
        kind: 'help-fix',
        status: 'active',
        summary: '她觉得这段改动里还有一个没稳住的结。',
        hostGoal: 'inspect-change',
        tension: 0.82,
        confidence: 0.8,
        careWeight: 0.68,
        createdAt: 0,
        lastEvidenceAt: 10_000,
        patienceUntil: 60_000,
      }],
      selfState: {
        stance: 'approach',
        feltCloseness: 0.58,
        protectiveness: 0.64,
        curiosity: 0.74,
        patience: 0.48,
        desireToSpeak: 0.76,
        fearOfInterrupting: 0.2,
        dominantConcernId: 'help-fix',
      },
      commitmentLedger: {
        governingCommitmentId: 'commitment::hold-problem::feature diff',
        commitments: [{
          id: 'commitment::hold-problem::feature diff',
          kind: 'hold-problem',
          status: 'active',
          title: 'Hold Problem',
          summary: '她还在沿着这段 diff 追下去。',
          source: 'continuity',
          priority: 0.82,
          confidence: 0.8,
          createdAt: 0,
          lastRenewedAt: 10_000,
          patienceUntil: 40_000,
          expiresAt: 200_000,
        }],
        carryPressure: 0.72,
        narrative: [],
        updatedAt: 10_000,
      },
      inquiryPlanner: {
        activePlanId: 'inquiry-plan::localize-problem::feature diff',
        plans: [{
          id: 'inquiry-plan::localize-problem::feature diff',
          kind: 'localize-problem',
          status: 'tracking',
          priority: 'high',
          question: 'Which concrete locus is the knot actually anchored to now?',
          askForGrounding: false,
          suggestedProbeMs: 12_000,
          evidenceWanted: ['diff-hunk'],
          createdAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 200_000,
        }],
        epistemicPressure: 0.38,
        groundingUrgency: 0.24,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(['clarify', 'protect']).toContain(dynamics.dominantMotive)
    expect(dynamics.motives.clarify).toBeGreaterThan(0.55)
    expect(dynamics.worldPressure).toBeGreaterThan(0.45)
    expect(dynamics.speakDrive).toBeGreaterThan(dynamics.silenceDrive)
  })

  it('leans toward care with strong restraint during late-night fatigue', () => {
    const dynamics = buildMindDynamics({
      now: 10_000,
      context: createContext({
        localTime: { hour: 2, minute: 30, isLateNight: true },
        workload: { kind: 'game', confidence: 0.76, source: 'foreground-window-heuristic', matchedLabels: ['game'] },
        content: { kind: 'gameplay', confidence: 0.72, source: 'foreground-window-heuristic', matchedLabels: ['gameplay'] },
        relationship: {
          hostAttitude: '礼貌而克制，保持观察',
          boredom: 26,
          loneliness: 34,
          fatigue: 86,
          minutesSinceLastUserTurn: 14,
          reminderBacklog: 0,
          lateNightActiveMinutes: 180,
          recentProactiveOutcomes: [],
        },
      }),
      watchMode: 'mnemonic-passive',
      worldModel: createWorldModel({
        activeThread: {
          id: 'thread-2',
          kind: 'late-night-endurance',
          status: 'active',
          source: 'observed-scene',
          title: 'deep night session',
          summary: '宿主在深夜里还没有停下来。',
          confidence: 0.78,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 10_000,
          target: null,
        },
        hostState: {
          availability: 'fatigued',
          burden: 'heavy',
        },
      }),
      appraisal: {
        inferredHostGoal: 'rest',
        confidence: 0.82,
        surprise: 0.1,
        carePressure: 0.94,
        interruptionCost: 0.3,
        desireToSpeak: 0.74,
        relationshipNeed: 'care',
        currentKnot: 'deep night session',
        notes: ['late-night'],
      },
      concerns: [{
        id: 'care',
        kind: 'care-body',
        status: 'active',
        summary: '她担心你会继续把自己拖得更深。',
        hostGoal: 'rest',
        tension: 0.9,
        confidence: 0.88,
        careWeight: 0.98,
        createdAt: 0,
        lastEvidenceAt: 10_000,
        patienceUntil: 60_000,
      }],
      selfState: {
        stance: 'protect',
        feltCloseness: 0.64,
        protectiveness: 0.92,
        curiosity: 0.18,
        patience: 0.42,
        desireToSpeak: 0.8,
        fearOfInterrupting: 0.38,
        dominantConcernId: 'care',
      },
    })

    expect(['care', 'protect']).toContain(dynamics.dominantMotive)
    expect(dynamics.carePressure).toBeGreaterThan(0.7)
    expect(dynamics.restraintPressure).toBeGreaterThan(0.25)
  })
})
