import type { AlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'

import { describe, expect, it } from 'vitest'

import {
  deriveAlicizationActiveLoopSnapshot,
  deriveAlicizationRuntimeProactiveSignals,
} from './alicization-active-loop'

function createArchitecture(
  overrides: Partial<AlicizationDigitalLifeArchitectureSnapshot> = {},
): AlicizationDigitalLifeArchitectureSnapshot {
  return {
    version: 'digital-life-architecture-v1',
    operatingMode: 'speaking',
    dominantSystem: 'dialogue',
    supportingSystems: ['mind', 'proactive'],
    governingFocus: 'current runtime task',
    summary: 'dialogue-led runtime state',
    systems: {
      dialogue: {
        id: 'dialogue',
        state: 'hot',
        score: 0.88,
        focus: 'current question',
        summary: 'dialogue ready',
        reasons: ['reply:ready'],
      },
      perception: {
        id: 'perception',
        state: 'warm',
        score: 0.52,
        focus: 'editor',
        summary: 'perception stable',
        reasons: ['scene:coding'],
      },
      proactive: {
        id: 'proactive',
        state: 'warm',
        score: 0.68,
        focus: 'current initiative',
        summary: 'initiative available',
        reasons: ['initiative:available'],
      },
      control: {
        id: 'control',
        state: 'warm',
        score: 0.56,
        focus: 'current action',
        summary: 'control available',
        reasons: ['action:available'],
      },
      mind: {
        id: 'mind',
        state: 'warm',
        score: 0.66,
        focus: 'current thread',
        summary: 'mind engaged',
        reasons: ['thread:active'],
      },
      memory: {
        id: 'memory',
        state: 'warm',
        score: 0.6,
        focus: 'recalled facts',
        summary: 'memory available',
        reasons: ['memory:available'],
      },
      runtime: {
        id: 'runtime',
        state: 'warm',
        score: 0.48,
        focus: 'desktop runtime',
        summary: 'runtime healthy',
        reasons: ['runtime:healthy'],
      },
    },
    ...overrides,
  }
}

function createRuntime(
  overrides: Omit<Partial<AlicizationRuntimeSnapshot>, 'channels'> & {
    channels?: Partial<AlicizationRuntimeSnapshot['channels']>
  } = {},
): AlicizationRuntimeSnapshot {
  const base: AlicizationRuntimeSnapshot = {
    version: 'alicization-runtime-v1',
    dominantChannel: 'dialogue',
    activeLoop: null,
    channels: {
      'dialogue': {
        id: 'dialogue',
        state: 'hot',
        readiness: 0.86,
        focus: 'current question',
        summary: 'dialogue ready',
      },
      'active-perception': {
        id: 'active-perception',
        state: 'warm',
        readiness: 0.52,
        focus: 'editor',
        summary: 'perception stable',
      },
      'active-dialogue': {
        id: 'active-dialogue',
        state: 'hot',
        readiness: 0.8,
        focus: 'current initiative',
        summary: 'active dialogue ready',
      },
      'active-control': {
        id: 'active-control',
        state: 'warm',
        readiness: 0.58,
        focus: 'current action',
        summary: 'control available',
      },
      'active-mind': {
        id: 'active-mind',
        state: 'warm',
        readiness: 0.64,
        focus: 'current thread',
        summary: 'mind engaged',
      },
      'active-memory': {
        id: 'active-memory',
        state: 'warm',
        readiness: 0.62,
        focus: 'recalled facts',
        summary: 'memory available',
      },
      'anthropomorphic-mind': {
        id: 'anthropomorphic-mind',
        state: 'warm',
        readiness: 0.66,
        focus: 'relationship state',
        summary: 'relationship state available',
      },
      'agent-runtime': {
        id: 'agent-runtime',
        state: 'warm',
        readiness: 0.46,
        focus: 'runtime healthy',
        summary: 'agent runtime healthy',
      },
    },
    shouldProactivelySpeak: true,
    shouldProactivelyAct: false,
    continuityPressure: 0.64,
    companionshipPressure: 0.7,
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
  it('derives dialogue handoff from live runtime and architecture readiness', () => {
    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture(),
      runtime: createRuntime(),
    })

    expect(loop).toEqual(expect.objectContaining({
      phase: 'dialogue',
      dominantChannel: 'dialogue',
      handoffTarget: 'active-dialogue',
      dialogueReady: true,
      controlReady: false,
      memoryCarry: true,
    }))
    expect(loop?.initiativeBudget ?? 0).toBeGreaterThan(0.5)
  })

  it('keeps the active loop driven by real runtime channels', () => {
    const baseline = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture(),
      runtime: createRuntime(),
    })
    const comparable = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture(),
      runtime: createRuntime({
        channels: {
          dialogue: {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.9,
            focus: 'current question',
            summary: 'dialogue ready',
          },
        },
      }),
    })

    expect(comparable?.phase).toBe(baseline?.phase)
    expect(comparable?.dominantChannel).toBe(baseline?.dominantChannel)
    expect(comparable?.dialogueReady).toBe(true)
  })

  it('observes when perception is dominant and dialogue and control are cold', () => {
    const architecture = createArchitecture({
      operatingMode: 'observing',
      dominantSystem: 'perception',
      systems: {
        ...createArchitecture().systems,
        dialogue: {
          ...createArchitecture().systems.dialogue,
          state: 'idle',
          score: 0.18,
        },
        proactive: {
          ...createArchitecture().systems.proactive,
          state: 'idle',
          score: 0.2,
        },
        control: {
          ...createArchitecture().systems.control,
          state: 'idle',
          score: 0.16,
        },
        perception: {
          ...createArchitecture().systems.perception,
          state: 'hot',
          score: 0.94,
        },
      },
    })
    const runtime = createRuntime({
      dominantChannel: 'active-perception',
      shouldProactivelySpeak: false,
      channels: {
        'dialogue': {
          ...createRuntime().channels.dialogue,
          state: 'idle',
          readiness: 0.16,
        },
        'active-dialogue': {
          ...createRuntime().channels['active-dialogue'],
          state: 'idle',
          readiness: 0.18,
        },
        'active-control': {
          ...createRuntime().channels['active-control'],
          state: 'idle',
          readiness: 0.14,
        },
        'active-perception': {
          ...createRuntime().channels['active-perception'],
          state: 'hot',
          readiness: 0.96,
        },
      },
    })

    expect(deriveAlicizationActiveLoopSnapshot({ architecture, runtime })).toEqual(
      expect.objectContaining({
        phase: 'observe',
        handoffTarget: 'active-perception',
        observationHeavy: true,
      }),
    )
  })

  it('selects control when a real action is ready', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-control',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: true,
      channels: {
        'active-control': {
          ...createRuntime().channels['active-control'],
          state: 'hot',
          readiness: 0.94,
        },
      },
    })

    expect(deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        operatingMode: 'acting',
        dominantSystem: 'control',
      }),
      runtime,
    })).toEqual(expect.objectContaining({
      phase: 'control',
      handoffTarget: 'active-control',
      controlReady: true,
    }))
  })

  it('integrates through memory when memory is dominant without a visible action', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-memory',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      channels: {
        'dialogue': {
          ...createRuntime().channels.dialogue,
          state: 'idle',
          readiness: 0.28,
        },
        'active-dialogue': {
          ...createRuntime().channels['active-dialogue'],
          state: 'idle',
          readiness: 0.26,
        },
        'active-memory': {
          ...createRuntime().channels['active-memory'],
          state: 'hot',
          readiness: 0.9,
        },
      },
      continuityPressure: 0.86,
    })

    expect(deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        operatingMode: 'remembering',
        dominantSystem: 'memory',
      }),
      runtime,
    })).toEqual(expect.objectContaining({
      phase: 'integrate',
      handoffTarget: 'active-memory',
      memoryCarry: true,
      dialogueReady: false,
    }))
  })

  it('projects proactive signals from the same live readiness state', () => {
    const signals = deriveAlicizationRuntimeProactiveSignals({
      architecture: createArchitecture(),
      runtime: createRuntime(),
    })

    expect(signals.activeLoop?.phase).toBe('dialogue')
    expect(signals.runtimeDialogueReady).toBe(true)
    expect(signals.runtimeControlReady).toBe(false)
    expect(signals.runtimeMemoryCarry).toBe(true)
    expect(signals.continuityPressure).toBeGreaterThan(0.6)
    expect(signals.companionshipPressure).toBeGreaterThan(0.65)
  })
})
