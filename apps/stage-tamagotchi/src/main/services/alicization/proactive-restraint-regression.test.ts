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
      hostAttitude: 'focused',
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

function createSpeakableInput() {
  return {
    now: 1_000,
    context: createContext(),
    proactiveState: createDefaultProactiveLoopState(1_000),
    killSwitchSuspended: false,
    watchMode: 'symbiotic-vision' as const,
    privateThought: {
      stance: 'nudge',
      confidence: 0.84,
      rationaleTags: ['error-visible'],
      thoughtText: 'I can help.',
      shouldSpeak: true,
      suggestedStyle: 'light-nudge',
      embodiedPresence: 'attentive',
      expiresAt: 120_000,
      afterglowFromScenario: null,
      emotionalTension: 'tense-debug',
    } as any,
    initiative: {
      shouldSpeak: true,
      shouldAct: false,
      confidence: 0.82,
      speakDrive: 0.8,
      silenceDrive: 0.1,
      selectedAction: 'speak',
      preferredStyle: 'light-nudge',
    } as any,
  }
}

describe('proactive restraint regression', () => {
  it('does not let legacy continuity deliberation alter a real decision', () => {
    const input = createSpeakableInput()
    const baseline = evaluateProactivePolicy(input)
    const legacyInjected = evaluateProactivePolicy({
      ...input,
      continuityDeliberation: {
        kind: 'execution-callback',
        arcStage: 'hold-for-opening',
        summary: 'same-her fixed line',
        whyNow: 'opening_policy=hover-first',
        pressure: 1,
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'internal-only',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: ['project-state-callback-carry'],
      },
    })

    expect(legacyInjected).toEqual(baseline)
  })

  it('keeps blocked dispatch behind explicit confirmation', () => {
    const decision = evaluateProactivePolicy({
      ...createSpeakableInput(),
      currentConsciousFrame: {
        reasonTags: [
          'execution-safety-gate blocked-before-dispatch confirmation=required no-process-started permission=none',
        ],
      } as any,
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.whyNotLater).toContain('safety_gate=blocked_dispatch_confirmation_required')
  })

  it('does not convert one host confirmation into permanent permission', () => {
    const decision = evaluateProactivePolicy({
      ...createSpeakableInput(),
      replyDeliberation: {
        mustInclude: [],
        narrative: [
          'execution-resume-confirmation host-confirmed-before-redispatch confirmation boundary not permanent autonomous permission',
        ],
      } as any,
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.whyNotLater).toContain('confirmation_boundary=host_confirmed_before_redispatch')
  })

  it('keeps an actively busy host non-interruptible', () => {
    const context = createContext({
      system: {
        ...createContext().system,
        cpuUsage: 76,
        inputActivity: 'active',
      },
    })
    const decision = evaluateProactivePolicy({
      ...createSpeakableInput(),
      context,
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('busy-host')
  })
})
