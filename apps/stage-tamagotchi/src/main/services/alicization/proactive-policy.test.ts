import type { AlicizationPrivateThoughtSnapshot } from '../../../shared/eventa'
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
      boredom: 94,
      loneliness: 72,
      fatigue: 28,
      minutesSinceLastUserTurn: 18,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

function createPrivateThought(overrides: Record<string, any> = {}): AlicizationPrivateThoughtSnapshot {
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
    emotionalTension: 'tense-debug' as const,
    ...overrides,
  }
}

describe('evaluateProactivePolicy', () => {
  it('allows coding interruption only with strong relevant cues', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
    })

    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.scenario).toBe('coding')
    expect(decision.style).toBe('light-nudge')
    expect(decision.reasonCodes).toContain('coding-focus')
    expect(decision.reasonCodes).toContain('foreground-error')
  })

  it('suppresses media playback while the host is still actively engaged', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'media',
          confidence: 0.84,
          source: 'foreground-window-heuristic',
          matchedLabels: ['youtube'],
        },
        content: {
          kind: 'video',
          confidence: 0.84,
          source: 'foreground-window-heuristic',
          matchedLabels: ['video'],
        },
        system: {
          ...createContext().system,
          inputActivity: 'active',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought({
        stance: 'observe',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
      }),
    })

    expect(decision.scenario).toBe('media')
    expect(decision.style).toBe('silent-observe')
    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('media-playback')
  })

  it('hard suppresses fullscreen hosts', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        system: {
          ...createContext().system,
          fullscreenLikely: true,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('fullscreen-host')
  })

  it('respects global cooldown and ignored penalties', () => {
    const proactiveState = createDefaultProactiveLoopState(1_000)
    proactiveState.globalCooldownUntil = 50_000
    proactiveState.scenarioBias.coding = 0.1
    proactiveState.consecutiveIgnored.coding = 3

    const decision = evaluateProactivePolicy({
      now: 10_000,
      context: createContext(),
      proactiveState,
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.cooldownMs).toBe(36 * 60_000)
    expect(decision.reasonCodes).toContain('global-cooldown-active')
    expect(decision.reasonCodes).toContain('scenario-bias-raised')
    expect(decision.reasonCodes).toContain('recent-ignored-penalty')
  })

  it('selects late-night-care only after the time and activity gates are met', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        localTime: {
          hour: 0,
          minute: 15,
          isLateNight: true,
        },
        workload: {
          kind: 'game',
          confidence: 0.88,
          source: 'foreground-window-heuristic',
          matchedLabels: ['steam'],
        },
        content: {
          kind: 'gameplay',
          confidence: 0.76,
          source: 'foreground-window-heuristic',
          matchedLabels: ['gameplay'],
        },
        relationship: {
          ...createContext().relationship,
          fatigue: 60,
          lateNightActiveMinutes: 120,
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'mnemonic-passive',
      privateThought: createPrivateThought({
        stance: 'care',
        suggestedStyle: 'gentle-care',
        emotionalTension: 'late-night-drain',
      }),
    })

    expect(decision.scenario).toBe('late-night-care')
    expect(decision.style).toBe('gentle-care')
    expect(decision.reasonCodes).toContain('late-night-activity')
    expect(decision.reasonCodes).toContain('late-night-fatigue')
  })

  it('stops marking screen semantic input as ignored when semantic summaries are present', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'coding',
          confidence: 0.91,
          source: 'screen-semantic-summary',
          matchedLabels: ['editor', 'typescript-error'],
        },
        content: {
          kind: 'error',
          confidence: 0.91,
          source: 'screen-semantic-summary',
          matchedLabels: ['editor', 'typescript-error'],
          summary: 'red TypeScript error panel',
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
    })

    expect(decision.consideredSignals).toContain('content.summary')
    expect(decision.ignoredSignals).not.toContain('screen-semantic-input-unavailable')
  })

  it('lets attention anchor continuity recover a coding scenario when the current foreground is self-like or general', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        content: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      perception: {
        activeAttentionAnchor: true,
        attentionAnchorAgeMs: 18_000,
        attentionAnchorConfidence: 0.92,
        attentionAnchorWorkloadKind: 'coding',
        attentionAnchorCanOverrideScenario: true,
        recentObservationCount: 3,
        invitedInspectionActive: false,
      },
      watchMode: 'symbiotic-vision',
      privateThought: createPrivateThought(),
    })

    expect(decision.scenario).toBe('coding')
    expect(decision.reasonCodes).toContain('attention-anchor-active')
    expect(decision.reasonCodes).toContain('recent-observation-memory')
    expect(decision.whyNow).toContain('短时知觉')
  })

  it('records invited inspection as an explicit proactive policy signal', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext({
        workload: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        content: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      perception: {
        activeAttentionAnchor: true,
        attentionAnchorAgeMs: 5_000,
        attentionAnchorConfidence: 0.95,
        attentionAnchorWorkloadKind: 'coding',
        attentionAnchorCanOverrideScenario: true,
        recentObservationCount: 4,
        invitedInspectionActive: true,
      },
      watchMode: 'invited-inspection',
      privateThought: createPrivateThought(),
    })

    expect(decision.reasonCodes).toContain('invited-inspection-active')
    expect(decision.consideredSignals).toContain('invitedInspection.active')
  })

  it('opens an afterglow window after long symbiotic coding ends', () => {
    const decision = evaluateProactivePolicy({
      now: 22 * 60_000,
      context: createContext({
        workload: {
          kind: 'browser',
          confidence: 0.64,
          source: 'foreground-window-heuristic',
          matchedLabels: ['browser'],
        },
        content: {
          kind: 'unknown',
          confidence: 0.2,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        system: {
          ...createContext().system,
          inputActivity: 'idle',
          foregroundWindow: {
            appName: 'Arc',
            processName: 'Arc',
            title: 'New Tab',
          },
        },
      }),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'mnemonic-passive',
      recentTransition: {
        fromWatchMode: 'symbiotic-vision',
        toWatchMode: 'mnemonic-passive',
        fromScenario: 'coding',
        durationMs: 20 * 60_000,
        reason: 'passive-continuity',
        occurredAt: 21 * 60_000,
      },
      privateThought: createPrivateThought({
        stance: 'observe',
        shouldSpeak: true,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'glance',
        emotionalTension: 'focused-flow',
      }),
    })

    expect(decision.reasonCodes).toContain('afterglow-opening')
    expect(decision.style).toBe('light-nudge')
    expect(decision.shouldInterrupt).toBe(true)
  })

  it('keeps suppression when private thought is uncertain', () => {
    const decision = evaluateProactivePolicy({
      now: 1_000,
      context: createContext(),
      proactiveState: createDefaultProactiveLoopState(1_000),
      killSwitchSuspended: false,
      watchMode: 'mnemonic-passive',
      privateThought: createPrivateThought({
        stance: 'uncertain',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
      }),
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('private-thought-uncertain')
  })
})
