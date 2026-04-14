import type { AlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'

import { describe, expect, it } from 'vitest'

import {
  deriveAlicizationActiveLoopSnapshot,
  deriveAlicizationRuntimeProactiveSignals,
} from './alicization-active-loop'

function createArchitecture(overrides: Partial<AlicizationDigitalLifeArchitectureSnapshot> = {}): AlicizationDigitalLifeArchitectureSnapshot {
  return {
    version: 'digital-life-architecture-v1',
    operatingMode: 'speaking',
    dominantSystem: 'dialogue',
    supportingSystems: ['mind', 'proactive'],
    governingFocus: 'runtime knot',
    summary: 'dialogue-led runtime line',
    systems: {
      dialogue: {
        id: 'dialogue',
        state: 'hot',
        score: 0.9,
        focus: 'runtime knot',
        summary: 'dialogue is hot',
        reasons: ['reply:ready'],
      },
      perception: {
        id: 'perception',
        state: 'warm',
        score: 0.54,
        focus: 'editor',
        summary: 'perception stable',
        reasons: ['scene:coding'],
      },
      proactive: {
        id: 'proactive',
        state: 'warm',
        score: 0.72,
        focus: 'nudge',
        summary: 'proactive warm',
        reasons: ['initiative:speak'],
      },
      control: {
        id: 'control',
        state: 'warm',
        score: 0.6,
        focus: 'guide',
        summary: 'control warm',
        reasons: ['intention:guide'],
      },
      mind: {
        id: 'mind',
        state: 'warm',
        score: 0.7,
        focus: 'thread',
        summary: 'mind warm',
        reasons: ['thread:problem'],
      },
      memory: {
        id: 'memory',
        state: 'warm',
        score: 0.58,
        focus: 'carry',
        summary: 'memory warm',
        reasons: ['goal:help-host'],
      },
      runtime: {
        id: 'runtime',
        state: 'warm',
        score: 0.52,
        focus: 'symbiotic-vision',
        summary: 'runtime warm',
        reasons: ['watch:symbiotic-vision'],
      },
    },
    ...overrides,
  }
}

function createRuntime(overrides: Partial<AlicizationRuntimeSnapshot> = {}): AlicizationRuntimeSnapshot {
  const base: AlicizationRuntimeSnapshot = {
    version: 'alicization-runtime-v1',
    dominantChannel: 'dialogue',
    activeLoop: null,
    channels: {
      'dialogue': {
        id: 'dialogue',
        state: 'hot',
        readiness: 0.86,
        focus: 'reply',
        summary: 'dialogue ready',
      },
      'active-perception': {
        id: 'active-perception',
        state: 'warm',
        readiness: 0.58,
        focus: 'editor',
        summary: 'perception stable',
      },
      'active-dialogue': {
        id: 'active-dialogue',
        state: 'hot',
        readiness: 0.82,
        focus: 'nudge',
        summary: 'active dialogue ready',
      },
      'active-control': {
        id: 'active-control',
        state: 'warm',
        readiness: 0.62,
        focus: 'guide',
        summary: 'control warm',
      },
      'active-mind': {
        id: 'active-mind',
        state: 'warm',
        readiness: 0.64,
        focus: 'thread',
        summary: 'mind warm',
      },
      'active-memory': {
        id: 'active-memory',
        state: 'warm',
        readiness: 0.61,
        focus: 'carry',
        summary: 'memory warm',
      },
      'anthropomorphic-mind': {
        id: 'anthropomorphic-mind',
        state: 'warm',
        readiness: 0.66,
        focus: 'companionship',
        summary: 'anthropomorphic warm',
      },
      'agent-runtime': {
        id: 'agent-runtime',
        state: 'warm',
        readiness: 0.52,
        focus: 'pending:1',
        summary: 'agent runtime warm',
      },
    },
    shouldProactivelySpeak: true,
    shouldProactivelyAct: false,
    continuityPressure: 0.65,
    companionshipPressure: 0.71,
    summary: 'dominant=dialogue',
  }

  return {
    ...base,
    ...overrides,
    channels: {
      ...base.channels,
      ...overrides.channels,
    },
  }
}

describe('runtime active loop', () => {
  it('derives a dialogue phase and a dialogue handoff when runtime channels are warmed', () => {
    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture(),
      runtime: createRuntime(),
    })

    expect(loop).not.toBeNull()
    expect(loop?.phase).toBe('dialogue')
    expect(loop?.handoffTarget).toBe('active-dialogue')
    expect(loop?.dialogueReady).toBe(true)
    expect(loop?.initiativeBudget ?? 0).toBeGreaterThan(0.6)
  })

  it('stays in observe phase when perception dominates and dialogue/control channels are cold', () => {
    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        operatingMode: 'observing',
        dominantSystem: 'perception',
        systems: {
          ...createArchitecture().systems,
          dialogue: {
            id: 'dialogue',
            state: 'idle',
            score: 0.22,
            focus: null,
            summary: 'dialogue cooling',
            reasons: ['reply:none'],
          },
          proactive: {
            id: 'proactive',
            state: 'idle',
            score: 0.24,
            focus: null,
            summary: 'proactive cooling',
            reasons: ['initiative:hold'],
          },
          control: {
            id: 'control',
            state: 'idle',
            score: 0.2,
            focus: null,
            summary: 'control cooling',
            reasons: ['intention:hold'],
          },
          perception: {
            id: 'perception',
            state: 'hot',
            score: 0.94,
            focus: 'editor',
            summary: 'perception hot',
            reasons: ['scene:coding'],
          },
        },
      }),
      runtime: createRuntime({
        dominantChannel: 'active-perception',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.32,
        companionshipPressure: 0.3,
        channels: {
          ...createRuntime().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'idle',
            readiness: 0.24,
            focus: 'none',
            summary: 'dialogue cooling',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'idle',
            readiness: 0.21,
            focus: 'none',
            summary: 'active dialogue cooling',
          },
          'active-control': {
            id: 'active-control',
            state: 'idle',
            readiness: 0.2,
            focus: 'none',
            summary: 'active control cooling',
          },
          'active-perception': {
            id: 'active-perception',
            state: 'hot',
            readiness: 0.93,
            focus: 'editor',
            summary: 'active perception hot',
          },
        },
      }),
    })

    expect(loop?.phase).toBe('observe')
    expect(loop?.observationHeavy).toBe(true)
    expect(loop?.handoffTarget).toBe('active-perception')
  })

  it('merges architecture/runtime into unified proactive runtime signals', () => {
    const signals = deriveAlicizationRuntimeProactiveSignals({
      architecture: createArchitecture(),
      runtime: createRuntime(),
    })

    expect(signals.runtimeDialogueReady).toBe(true)
    expect(signals.runtimeObservationHeavy).toBe(false)
    expect(signals.runtimeControlReady).toBe(false)
    expect(signals.activeLoop?.phase).toBe('dialogue')
    expect(signals.activeLoop?.coherence ?? 0).toBeGreaterThan(0.5)
  })
})
