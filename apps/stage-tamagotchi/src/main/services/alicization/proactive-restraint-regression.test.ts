import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { createDefaultProactiveLoopState } from './proactive-feedback'
import { evaluateProactivePolicy } from './proactive-policy'

function createContext(overrides: Partial<AlicizationProactiveLayeredContext> = {}): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 14,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: 12,
      battery: {
        percent: 80,
        charging: true,
      },
      memory: {
        usagePercent: 42,
        freeMB: 4096,
        totalMB: 8192,
      },
      idleSeconds: 45,
      inputActivity: 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'index.ts - Project',
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.82,
      source: 'foreground-window-heuristic',
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'error',
      confidence: 0.82,
      source: 'foreground-window-heuristic',
      matchedLabels: ['error'],
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 40,
      loneliness: 32,
      fatigue: 24,
      minutesSinceLastUserTurn: 18,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

function createPrivateThought(overrides: Record<string, unknown> = {}) {
  return {
    stance: 'nudge' as const,
    confidence: 0.84,
    rationaleTags: ['semantic-friction'],
    thoughtText: 'I can nudge here.',
    shouldSpeak: true,
    suggestedStyle: 'light-nudge' as const,
    embodiedPresence: 'attentive' as const,
    expiresAt: 120_000,
    afterglowFromScenario: null,
    emotionalTension: 'focused-flow' as const,
    ...overrides,
  } as any
}

function createRuntimeDigest(overrides: Record<string, unknown> = {}) {
  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel: 'active-memory',
    shouldProactivelySpeak: false,
    shouldProactivelyAct: false,
    continuityPressure: 0.78,
    companionshipPressure: 0.42,
    channels: [],
    summary: 'dominant=active-memory | continuity=0.78',
    ...overrides,
  } as any
}

describe('proactive restraint regression', () => {
  it('does not interrupt when remembered continuity is relevant but explicitly inward-only', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      runtimeDigest: createRuntimeDigest(),
      continuityDeliberation: {
        kind: 'memory-follow-up',
        arcStage: 'hold-for-opening',
        summary: 'The remembered seam should stay inward until the host opens the door again.',
        whyNow: 'The seam is relevant, but surfacing it now would crowd the current line.',
        pressure: 0.82,
        intrusionRisk: 'high',
        payoffDependency: 'memory-only',
        preferredTiming: 'internal-only',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: ['memory-deliberation'],
      },
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('continuity-internal-only')
    expect(decision.whyNow).toContain('先留在心里')
    expect(decision.whyNotLater).toContain('留在内在层')
  })

  it('holds an after-payoff continuity mention instead of proactively interrupting early', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      runtimeDigest: createRuntimeDigest({
        dominantChannel: 'active-dialogue',
        continuityPressure: 0.8,
      }),
      continuityDeliberation: {
        kind: 'dialogue-carry',
        arcStage: 'hold-for-opening',
        summary: 'The remembered seam is relevant, but it belongs after the current payoff lands.',
        whyNow: 'This continuity should contour the current answer after it has already paid off the live ask.',
        pressure: 0.8,
        intrusionRisk: 'medium',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: ['memory-deliberation'],
      },
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('continuity-after-payoff')
    expect(decision.whyNotLater).toContain('当前 payoff 先落地')
  })

  it('does not let execution callback continuity steal the opening from the current answer lane', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
      runtimeDigest: createRuntimeDigest({
        dominantChannel: 'active-control',
        continuityPressure: 0.84,
      }),
      continuityDeliberation: {
        kind: 'execution-callback',
        arcStage: 'same-thread-continuation',
        summary: 'A settled callback is waiting, but it should not jump ahead of the current answer.',
        whyNow: 'The callback is real, but it still needs the live answer or payoff window first.',
        pressure: 0.88,
        intrusionRisk: 'medium',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'same-turn-if-invited',
        shouldStayOnThread: true,
        shouldSpeakNow: true,
        sourceTags: ['execution-callback'],
      },
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('continuity-execution-callback')
    expect(decision.whyNotLater).toContain('执行结果或当前主回答')
  })

  it('keeps repair scenes from drifting into remembered continuity even under high continuity pressure', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'recovering',
      privateThought: createPrivateThought({
        stance: 'uncertain',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
      }),
      runtimeDigest: createRuntimeDigest({
        dominantChannel: 'active-memory',
        continuityPressure: 0.86,
      }),
      relationshipModel: {
        climate: 'guarded',
        approachVector: 'give-space',
        receptivity: 0.46,
        sharedAttentionTrust: 0.44,
        correctionSensitivity: 0.72,
        reciprocityExpectation: 0.3,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 1_000,
      } as any,
      selfGovernor: {
        dominantDrive: 'repair',
        dominantIntentionId: 'repair-1',
        focusObjectId: null,
        activeIntentions: [{
          id: 'repair-1',
          kind: 'repair-misread',
          status: 'active',
          drive: 'repair',
          title: 'repair seam',
          summary: 'Repair the current seam before any remembered carry opens.',
          urgency: 0.84,
          confidence: 0.8,
          patience: 0.68,
          targetObjectId: null,
          targetThreadId: null,
          targetGoalId: null,
          targetCommitmentId: null,
          formedAt: 0,
          lastUpdatedAt: 1_000,
          expiresAt: 120_000,
        }],
        inhibition: 0.74,
        persistence: 0.7,
        socialRiskTolerance: 0.22,
        revisionReadiness: 0.64,
        narrative: [],
        updatedAt: 1_000,
      } as any,
      worldModel: {
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 8_000,
          attentionAgeMs: 8_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        epistemicState: {
          certainty: 'lingering',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
      } as any,
      actionEcology: {
        mode: 'repair-before-speaking',
        surfacePressure: 0.22,
        silencePressure: 0.72,
        shouldSpeak: false,
      } as any,
      continuityDeliberation: {
        kind: 'dialogue-carry',
        arcStage: 'hold-for-opening',
        summary: 'The remembered line is still relevant, but it should wait for the next safer opening.',
        whyNow: 'The remembered line would be relevant later, but not while the repair seam is still unstable.',
        pressure: 0.82,
        intrusionRisk: 'high',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'next-open-window',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: ['memory-deliberation'],
      },
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('continuity-next-open-window')
    expect(decision.reasonCodes).toContain('governor-repair')
    expect(decision.reasonCodes).toContain('relationship-correction-sensitive')
    expect(decision.whyNotLater).toContain('下一个更自然的 opening')
  })
})
