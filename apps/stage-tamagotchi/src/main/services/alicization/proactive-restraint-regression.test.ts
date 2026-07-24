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
  it('lets structured continuity timing restrain a real decision', () => {
    const input = createSpeakableInput()
    const baseline = evaluateProactivePolicy(input)
    const held = evaluateProactivePolicy({
      ...input,
      continuityDeliberation: {
        kind: 'dialogue-carry',
        arcStage: 'hold-for-opening',
        summary: 'owner-authored summary',
        whyNow: 'owner-authored rationale',
        pressure: 1,
        intrusionRisk: 'medium',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'next-open-window',
        shouldStayOnThread: true,
        shouldSpeakNow: false,
        sourceTags: ['thread:continuation'],
      },
    })

    expect(baseline.shouldInterrupt).toBe(true)
    expect(held.shouldInterrupt).toBe(false)
    expect(held.reasonCodes).toContain('continuity-next-open-window')
  })

  it('keeps blocked dispatch behind explicit confirmation', () => {
    const decision = evaluateProactivePolicy({
      ...createSpeakableInput(),
      emotionalKernel: {
        reasonTags: ['execution-safety-gate'],
      } as any,
    })

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.whyNotLater).toContain('safety_gate=blocked_dispatch_confirmation_required')
  })

  it('does not convert one host confirmation into permanent permission', () => {
    const decision = evaluateProactivePolicy({
      ...createSpeakableInput(),
      emotionalKernel: {
        reasonTags: ['execution-resume-confirmation'],
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
