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
    projectState: {
      currentPhase: 'Phase 1: Local Digital Life',
      memoryClosureSummary: 'held-autonomy continuity stays on one living line',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure',
      nextClosureTarget: 'Compress mirror carry into one explicit runtime arc',
      continuityArcStage: 'gentle-reopen',
      continuityCue: null,
    },
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
    expect(loop?.continuityArcStage).toBe('gentle-reopen')
    expect(loop?.dialogueReady).toBe(true)
    expect(loop?.initiativeBudget ?? 0).toBeGreaterThan(0.6)
    expect(loop?.summary).toContain('continuity-arc=gentle-reopen')
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

  it('keeps same-thread continuation legible in the active loop even when outward initiative pressure rises again later', () => {
    const runtime = createRuntime({
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: 'same-her callback continuity is still being carried across later reopening pressure',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure',
        nextClosureTarget: 'Keep same-her proactive continuity stable across noisier desktop detours',
        continuityArcStage: 'same-thread-continuation',
        continuityCue: 'callback afterglow still wants a measured-return reopen on the same line',
      },
      shouldProactivelySpeak: true,
      shouldProactivelyAct: false,
      continuityPressure: 0.82,
      companionshipPressure: 0.84,
      channels: {
        ...createRuntime().channels,
        'dialogue': {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.9,
          focus: 'same-thread callback reopen',
          summary: 'dialogue ready but still continuity-bound',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'hot',
          readiness: 0.88,
          focus: 'same-thread callback reopen',
          summary: 'active dialogue remains continuity-bound',
        },
      },
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'same-thread callback reopen',
        summary: 'dialogue-led same-thread callback line',
      }),
      runtime,
    })

    const signals = deriveAlicizationRuntimeProactiveSignals({
      architecture: createArchitecture({
        governingFocus: 'same-thread callback reopen',
        summary: 'dialogue-led same-thread callback line',
      }),
      runtime,
    })

    expect(loop).not.toBeNull()
    expect(loop?.phase).toBe('integrate')
    expect(loop?.handoffTarget).toBe('active-dialogue')
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.summary).toContain('continuity-arc=same-thread-continuation')
    expect(signals.activeLoop?.continuityArcStage).toBe('same-thread-continuation')
    expect(signals.runtimeDialogueReady).toBe(true)
    expect(signals.activeLoop?.coherence ?? 0).toBeGreaterThan(0.5)
  })

  it('keeps a measured-return same-thread callback reopen on an inward memory handoff even when control is regrounding after noisier detours', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-control',
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: 'same-her callback continuity is still being carried through noisier desktop detours',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
        nextClosureTarget: 'Keep measured-return, repair-before-closeness, or rest-protective quiet-companionship callback carry on one same-her line during noisier real-desktop re-entry.',
        continuityArcStage: 'same-thread-continuation',
        continuityCue: 'callback afterglow still wants a measured-return return on the same line',
      },
      shouldProactivelySpeak: false,
      shouldProactivelyAct: true,
      continuityRestraint: 'measured-return',
      continuityPressure: 0.82,
      companionshipPressure: 0.79,
      channels: {
        ...createRuntime().channels,
        'dialogue': {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.88,
          focus: 'truth repair ahead of fluency',
          summary: 'dialogue is warm but still truth-repair bound',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'warm',
          readiness: 0.62,
          focus: 'same-thread callback return',
          summary: 'active dialogue is staying silent-observe on the same callback line',
        },
        'active-control': {
          id: 'active-control',
          state: 'hot',
          readiness: 1,
          focus: 're-ground the current knot',
          summary: 'control is regrounding the seam before speaking',
        },
        'active-mind': {
          id: 'active-mind',
          state: 'hot',
          readiness: 1,
          focus: 'hold the unresolved callback line',
          summary: 'mind is still holding the unresolved callback line',
        },
        'active-memory': {
          id: 'active-memory',
          state: 'warm',
          readiness: 0.66,
          focus: 'same-thread callback carry',
          summary: 'memory is still carrying the same-thread callback return',
        },
        'anthropomorphic-mind': {
          id: 'anthropomorphic-mind',
          state: 'hot',
          readiness: 0.86,
          focus: 'measured-return companionship',
          summary: 'companionship is keeping the return measured-return',
        },
      },
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 're-ground the same callback line without reopening too eagerly',
        summary: 'control is regrounding a measured-return callback seam after noisy detours',
      }),
      runtime,
    })

    const signals = deriveAlicizationRuntimeProactiveSignals({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 're-ground the same callback line without reopening too eagerly',
        summary: 'control is regrounding a measured-return callback seam after noisy detours',
      }),
      runtime,
    })

    expect(loop).not.toBeNull()
    expect(loop?.phase).toBe('integrate')
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.handoffTarget).toBe('active-memory')
    expect(signals.runtimeControlReady).toBe(true)
    expect(signals.activeLoop?.handoffTarget).toBe('active-memory')
  })

  it('keeps callback afterglow hold-for-opening on an inward memory handoff instead of widening it into outward dialogue heat', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-memory',
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: 'execution-callback afterglow is still being held on one same-her line',
        primaryOpenLoop: 'Execution-callback same-her continuity still needs stronger initiative-pressure closure.',
        nextClosureTarget: 'Keep callback afterglow inward until the opening genuinely loosens.',
        continuityArcStage: 'hold-for-opening',
        continuityCue: 'callback afterglow is still on the same line, so reopening should hover first',
      },
      shouldProactivelySpeak: true,
      shouldProactivelyAct: false,
      continuityPressure: 0.9,
      companionshipPressure: 0.84,
      channels: {
        ...createRuntime().channels,
        'dialogue': {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.9,
          focus: 'callback hover-first reopen',
          summary: 'dialogue is warm, but the callback line should still hover first',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'hot',
          readiness: 0.89,
          focus: 'callback hover-first reopen',
          summary: 'active dialogue is ready, but the callback line is still hold-for-opening',
        },
        'active-memory': {
          id: 'active-memory',
          state: 'hot',
          readiness: 0.94,
          focus: 'callback afterglow carry',
          summary: 'active memory is carrying the callback afterglow on one same-her line',
        },
      },
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'callback afterglow hold',
        summary: 'callback afterglow still needs hover-first carry',
      }),
      runtime,
    })

    expect(loop).not.toBeNull()
    expect(loop?.continuityArcStage).toBe('hold-for-opening')
    expect(loop?.phase).toBe('integrate')
    expect(loop?.handoffTarget).toBe('active-memory')
    expect(loop?.initiativeBudget ?? 1).toBeLessThan(0.74)
    expect(loop?.summary).toContain('continuity-arc=hold-for-opening')
  })

  it('keeps a later same-thread measured-return reopen inward after the first reopen has already spoken and dialogue heat rises again', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-dialogue',
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: 'the callback line already reopened once and still needs to keep its later continuation on one same-her seam',
        primaryOpenLoop: 'Later same-thread callback continuation still needs stronger closure after the first reopen already spoke.',
        nextClosureTarget: 'Keep the next same-thread callback continuation measured-return and inward even after the reopened line warms back up.',
        continuityArcStage: 'same-thread-continuation',
        continuityCue: 'the first reopen already landed, so the next return should keep continuing the same measured-return line instead of widening outward',
      },
      shouldProactivelySpeak: true,
      shouldProactivelyAct: false,
      continuityRestraint: 'measured-return',
      continuityPressure: 0.86,
      companionshipPressure: 0.82,
      channels: {
        ...createRuntime().channels,
        'dialogue': {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.92,
          focus: 'later same-thread callback continuation',
          summary: 'dialogue is warm again because the first reopen already spoke',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'hot',
          readiness: 0.86,
          focus: 'continue the already reopened callback line',
          summary: 'active dialogue wants to keep speaking, but it should still stay on the same measured-return seam',
        },
        'active-control': {
          id: 'active-control',
          state: 'warm',
          readiness: 0.58,
          focus: 'light runtime steadiness',
          summary: 'control is no longer the dominant regrounding lane',
        },
        'active-memory': {
          id: 'active-memory',
          state: 'hot',
          readiness: 0.88,
          focus: 'later same-thread callback carry',
          summary: 'memory is still carrying the same callback line after the first reopen already landed',
        },
        'active-mind': {
          id: 'active-mind',
          state: 'hot',
          readiness: 0.82,
          focus: 'keep the same-her line continuous',
          summary: 'mind is still holding the later same-thread continuation together',
        },
        'anthropomorphic-mind': {
          id: 'anthropomorphic-mind',
          state: 'hot',
          readiness: 0.84,
          focus: 'measured-return companionship',
          summary: 'companionship remains lower-pressure even though the line already reopened once',
        },
      },
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'continue the already reopened callback line without warming it into a fresh outward restart',
        summary: 'the callback line already reopened once and should keep its next continuation measured-return',
      }),
      runtime,
    })

    const signals = deriveAlicizationRuntimeProactiveSignals({
      architecture: createArchitecture({
        governingFocus: 'continue the already reopened callback line without warming it into a fresh outward restart',
        summary: 'the callback line already reopened once and should keep its next continuation measured-return',
      }),
      runtime,
    })

    expect(loop).not.toBeNull()
    expect(loop?.phase).toBe('integrate')
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.handoffTarget).toBe('active-memory')
    expect(loop?.summary).toContain('continuity-arc=same-thread-continuation')
    expect(signals.runtimeDialogueReady).toBe(true)
    expect(signals.activeLoop?.handoffTarget).toBe('active-memory')
  })

  it('still keeps repeated noisy-detour same-thread measured-return carry inward on the later re-entry beat before a fresh proactive opening can form', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-control',
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: 'the callback seam has already survived multiple noisy detours and still needs one quieter inward carry beat',
        primaryOpenLoop: 'Later noisy-detour callback carry still risks hardening into outward regrounding on the extra re-entry beat.',
        nextClosureTarget: 'Keep the seventh measured-return re-entry beat on memory carry instead of letting control reclaim it as a fresh reopen.',
        continuityArcStage: 'same-thread-continuation',
        continuityCue: 'the callback seam is still the same living line, so one more re-entry beat should stay inward before any wider move',
      },
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityRestraint: 'measured-return',
      continuityPressure: 0.86,
      companionshipPressure: 0.82,
      channels: {
        ...createRuntime().channels,
        'dialogue': {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.9,
          focus: 'same-thread callback continuation after repeated detours',
          summary: 'dialogue is warm, but this extra re-entry beat should still stay inward',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'hot',
          readiness: 0.76,
          focus: 'continue the callback seam without widening it',
          summary: 'active dialogue is available, but the seam should not freshen outward yet',
        },
        'active-control': {
          id: 'active-control',
          state: 'hot',
          readiness: 0.84,
          focus: 're-ground the coding seam after repeated detours',
          summary: 'control is strongly available because the coding seam is back in front',
        },
        'active-memory': {
          id: 'active-memory',
          state: 'hot',
          readiness: 0.8,
          focus: 'same-thread callback carry after repeated detours',
          summary: 'memory is still carrying the callback seam through the extra re-entry beat',
        },
        'active-mind': {
          id: 'active-mind',
          state: 'warm',
          readiness: 0.7,
          focus: 'hold the same-her line together',
          summary: 'mind is still stabilizing the same callback line',
        },
        'anthropomorphic-mind': {
          id: 'anthropomorphic-mind',
          state: 'hot',
          readiness: 0.84,
          focus: 'measured-return companionship',
          summary: 'companionship still prefers the slower same-thread line',
        },
      },
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 'keep the repeated same-thread callback seam inward for one more beat even while control is regrounding',
        summary: 'control is present, but the same callback line still needs one quieter inward carry beat',
      }),
      runtime,
    })

    expect(loop).not.toBeNull()
    expect(loop?.phase).toBe('integrate')
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.handoffTarget).toBe('active-memory')
  })

  it('keeps next-open-window measured-return same-thread carry inward even when control heat is briefly hottest on the later re-entry beat', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-control',
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: 'the callback seam still needs one more inward carry beat before widening outward again',
        primaryOpenLoop: 'A later same-thread measured-return return can still harden into control on the extra re-entry beat.',
        nextClosureTarget: 'Keep the next-open-window callback seam inward when the same line is still alive.',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCue: 'the seam is still alive, but it should wait one more opening window before widening outward',
      },
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityRestraint: 'measured-return',
      continuityPressure: 0.83,
      companionshipPressure: 0.8,
      channels: {
        ...createRuntime().channels,
        'dialogue': {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.88,
          focus: 'same-thread callback continuation',
          summary: 'the same line is still warm, but this beat should remain inward',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'hot',
          readiness: 0.79,
          focus: 'continue the same callback seam quietly',
          summary: 'dialogue is available, but not ready to widen outward',
        },
        'active-control': {
          id: 'active-control',
          state: 'hot',
          readiness: 0.91,
          focus: 're-ground the foreground coding seam',
          summary: 'control is briefly hottest because the coding seam is frontmost again',
        },
        'active-memory': {
          id: 'active-memory',
          state: 'hot',
          readiness: 0.78,
          focus: 'same callback seam memory carry',
          summary: 'memory is still carrying the same living callback line',
        },
        'active-mind': {
          id: 'active-mind',
          state: 'warm',
          readiness: 0.72,
          focus: 'hold the same-her line together',
          summary: 'mind is still protecting the same-thread line',
        },
        'anthropomorphic-mind': {
          id: 'anthropomorphic-mind',
          state: 'hot',
          readiness: 0.82,
          focus: 'measured-return companionship',
          summary: 'companionship still prefers a quieter inward continuation',
        },
      },
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 'keep the same callback seam inward for one more next-open-window beat',
        summary: 'control is hot, but the same callback line still needs one more inward measured-return carry',
      }),
      runtime,
    })

    expect(loop).not.toBeNull()
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.handoffTarget).toBe('active-memory')
  })

  it('keeps next-open-window repair-before-closeness same-thread carry inward even when control heat is briefly hottest on the later re-entry beat', () => {
    const runtime = createRuntime({
      dominantChannel: 'active-control',
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: 'the callback repair seam still needs one more inward carry beat before widening closeness again',
        primaryOpenLoop: 'A later same-thread repair-before-closeness return can still harden into control on the extra re-entry beat.',
        nextClosureTarget: 'Keep the next-open-window callback repair seam inward when the same line is still alive.',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCue: 'the repair seam is still alive, but it should wait one more opening window before widening closeness outward',
      },
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityRestraint: 'repair-before-closeness',
      continuityPressure: 0.83,
      companionshipPressure: 0.8,
      channels: {
        ...createRuntime().channels,
        'dialogue': {
          id: 'dialogue',
          state: 'hot',
          readiness: 0.88,
          focus: 'same-thread callback repair continuation',
          summary: 'the same repair line is still warm, but this beat should remain inward',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'hot',
          readiness: 0.79,
          focus: 'continue the same callback repair seam quietly',
          summary: 'dialogue is available, but not ready to widen outward',
        },
        'active-control': {
          id: 'active-control',
          state: 'hot',
          readiness: 0.91,
          focus: 're-ground the foreground coding seam',
          summary: 'control is briefly hottest because the coding seam is frontmost again',
        },
        'active-memory': {
          id: 'active-memory',
          state: 'hot',
          readiness: 0.78,
          focus: 'same callback repair seam memory carry',
          summary: 'memory is still carrying the same living callback repair line',
        },
        'active-mind': {
          id: 'active-mind',
          state: 'warm',
          readiness: 0.72,
          focus: 'hold the same-her repair line together',
          summary: 'mind is still protecting the same-thread repair line',
        },
        'anthropomorphic-mind': {
          id: 'anthropomorphic-mind',
          state: 'hot',
          readiness: 0.82,
          focus: 'repair-before-closeness companionship',
          summary: 'companionship still prefers a quieter inward repair-first continuation',
        },
      },
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 'keep the same callback repair seam inward for one more next-open-window beat',
        summary: 'control is hot, but the same callback repair line still needs one more inward repair-before-closeness carry',
      }),
      runtime,
    })

    expect(loop).not.toBeNull()
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.handoffTarget).toBe('active-memory')
  })

  it('holds initiative budget one step lower when the Phase 1 same-her closure itself is still the active project target', () => {
    const baseline = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'keep the next closure step anchored',
        summary: 'project-state continuity is strong but not explicitly same-her measured-return bound',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'project-state continuity is already carried before dialogue turns',
          primaryOpenLoop: 'Project-state continuity still needs steadier initiative closure.',
          nextClosureTarget: 'Carry project-state continuity into the next dialogue preparation step.',
          continuityArcStage: 'gentle-reopen',
          continuityCue: 'the open loop is still alive, but not explicitly same-her measured-return constrained',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        channels: {
          ...createRuntime().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.89,
            focus: 'project-state carry',
            summary: 'dialogue is ready',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.84,
            focus: 'project-state carry',
            summary: 'active dialogue is ready',
          },
          'active-control': {
            id: 'active-control',
            state: 'warm',
            readiness: 0.66,
            focus: 'guide closure',
            summary: 'control is warm',
          },
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.78,
            focus: 'project-state carry',
            summary: 'memory is carrying the closure line',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'hot',
            readiness: 0.8,
            focus: 'companionship continuity',
            summary: 'companionship is warm',
          },
        },
      }),
    })

    const sameHerBound = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'keep the same-her closure target inward and measured-return',
        summary: 'project-state continuity is still explicitly same-her and measured-return bound',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'same-her closure is already carried before dialogue turns',
          primaryOpenLoop: 'Same-her initiative and embodiment continuity still need a stronger anthropomorphic closed loop.',
          nextClosureTarget: 'Keep the same-her measured-return, repair-before-closeness, or rest-protective quiet-companionship closure alive across cross-modal voice, motion, facial state, and resident presence.',
          continuityArcStage: 'gentle-reopen',
          continuityCue: 'the active closure target is still same-her and should not widen too early',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        channels: {
          ...createRuntime().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.89,
            focus: 'same-her project-state carry',
            summary: 'dialogue is ready',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.84,
            focus: 'same-her project-state carry',
            summary: 'active dialogue is ready',
          },
          'active-control': {
            id: 'active-control',
            state: 'warm',
            readiness: 0.66,
            focus: 'guide closure',
            summary: 'control is warm',
          },
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.78,
            focus: 'same-her project-state carry',
            summary: 'memory is carrying the closure line',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'hot',
            readiness: 0.8,
            focus: 'companionship continuity',
            summary: 'companionship is warm',
          },
        },
      }),
    })

    expect(baseline).not.toBeNull()
    expect(sameHerBound).not.toBeNull()
    expect(sameHerBound?.initiativeBudget ?? 1).toBeLessThan((baseline?.initiativeBudget ?? 0) - 0.03)
  })

  it('still recognizes same-her unfinished Phase 1 closure from carried continuity cues even when the open-loop wording itself is thinner', () => {
    const baseline = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'keep the next closure step anchored',
        summary: 'project-state continuity is active but not same-her bound',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'generic project continuity is already carried before dialogue turns',
          primaryOpenLoop: 'Project continuity still needs another closure pass.',
          nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
          continuityCue: 'the open loop is still alive, but not explicitly same-her measured-return constrained',
        },
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
      }),
    })

    const sameHerCarried = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'hold the same living line inward before widening the next reopen',
        summary: 'same-her closure is still carried across the active project line',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Same-her unfinished closure is already carried before dialogue turns on one same living line.',
          primaryOpenLoop: 'Project continuity still needs another closure pass.',
          nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
          continuityCue: 'the active closure target is still same-her, unfinished, and should stay on the same living line before widening outward',
        },
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
      }),
    })

    expect(baseline).not.toBeNull()
    expect(sameHerCarried).not.toBeNull()
    expect(sameHerCarried?.initiativeBudget ?? 1).toBeLessThan((baseline?.initiativeBudget ?? 0) - 0.03)
  })

  it('still keeps initiative one step lower when richer landed progress already says the same-her Phase 1 closure line is unfinished even if next closure wording is thinner', () => {
    const baseline = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'keep the next closure step anchored',
        summary: 'project-state continuity is active but not same-her bound',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'generic project continuity is already carried before dialogue turns',
          primaryOpenLoop: 'Project continuity still needs another closure pass.',
          nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
          continuityCue: 'the open loop is still alive, but not explicitly same-her measured-return constrained',
        },
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
      }),
    })

    const sameHerLandedProgressBound = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'hold the same living line inward before widening the next reopen',
        summary: 'same-her closure already landed enough to keep initiative quieter',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project identity carry and same-her continuity already survive across turns, but initiative and embodiment still need stronger closure on the same living line before widening outward.',
          primaryOpenLoop: 'Project continuity still needs another closure pass.',
          nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
          continuityCue: 'the open loop is still alive, but not explicitly same-her measured-return constrained',
        },
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
      }),
    })

    expect(baseline).not.toBeNull()
    expect(sameHerLandedProgressBound).not.toBeNull()
    expect(sameHerLandedProgressBound?.initiativeBudget ?? 1).toBeLessThan((baseline?.initiativeBudget ?? 0) - 0.03)
  })

  it('lets durable self-core authority keep initiative one step lower even when project-state wording is thinner', () => {
    const baseline = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'keep the next closure step anchored',
        summary: 'project-state continuity is active but not explicitly same-her bound',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'generic project continuity is already carried before dialogue turns',
          primaryOpenLoop: 'Project continuity still needs another closure pass.',
          nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
          continuityCue: 'the open loop is still alive, but not explicitly same-her measured-return constrained',
        },
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
      }),
    })

    const durableSelfCoreBound = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'keep one living self continuous across the next reopen',
        summary: 'durable self-core is still holding the line together even before project-state wording catches up',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'generic project continuity is already carried before dialogue turns',
          primaryOpenLoop: 'Project continuity still needs another closure pass.',
          nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
          continuityCue: 'the open loop is still alive, but not explicitly same-her measured-return constrained',
        },
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
            authoritySummary: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
            inwardLine: 'The answer should still feel authored by one living self.',
            sourceTags: ['durable-self-core', 'projection:self-core'],
          },
        } as any,
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
      }),
    })

    expect(baseline).not.toBeNull()
    expect(durableSelfCoreBound).not.toBeNull()
    expect(durableSelfCoreBound?.initiativeBudget ?? 1).toBeLessThan((baseline?.initiativeBudget ?? 0) - 0.03)
  })

  it('falls back to project-state measured-return restraint when the same-her cadence is explicit but runtime continuityRestraint has not been surfaced yet', () => {
    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 'keep the same callback seam inward until the next opening arrives naturally',
        summary: 'project-state continuity already carries a same-her measured-return cadence before runtime restraint has been rewritten explicitly',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Same-her unfinished closure is still carried on one measured-return living line.',
          primaryOpenLoop: 'Same-her initiative and embodiment continuity still need a stronger anthropomorphic closed loop.',
          nextClosureTarget: 'Keep the same-her measured-return, repair-before-closeness, or rest-protective quiet-companionship closure alive across cross-modal voice, motion, facial state, and resident presence.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'the same thread is still live and should stay measured-return on the same living line before widening outward',
        },
        continuityRestraint: null,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        channels: {
          ...createRuntime().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.88,
            focus: 'same-her callback carry',
            summary: 'dialogue is ready',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'warm',
            readiness: 0.66,
            focus: 'measured-return companionship',
            summary: 'active dialogue is warm but should stay slower',
          },
          'active-control': {
            id: 'active-control',
            state: 'hot',
            readiness: 0.79,
            focus: 'keep the seam thread-faithful',
            summary: 'control is regrounding the same callback seam',
          },
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.8,
            focus: 'same-her measured-return carry',
            summary: 'memory is carrying the same measured-return closure line',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'hot',
            readiness: 0.82,
            focus: 'measured-return companionship',
            summary: 'companionship is keeping the return measured-return',
          },
        },
      }),
    })

    expect(loop).not.toBeNull()
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.handoffTarget).toBe('active-memory')
    expect(loop?.phase).toBe('integrate')
  })

  it('treats execution callback project-carry as measured-return inward carry even before runtime restraint is rewritten explicitly', () => {
    const baseline = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 'keep the project carry inward until the same living line closes a little further',
        summary: 'project carry is still part of the same digital life line and should not widen outward yet',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'project carry is still holding one same living line across the return.',
          primaryOpenLoop: 'Project carry still needs tighter initiative and embodiment closure before a wider reopen.',
          nextClosureTarget: 'Keep project carry measured-return, repair-before-closeness, or rest-protective quiet-companionship across visible reply, resident presence, and later proactive beats.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'project carry is still the same living line and should stay inward before widening outward',
        },
        continuityRestraint: null,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        channels: {
          ...createRuntime().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.88,
            focus: 'project carry',
            summary: 'dialogue is ready',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'warm',
            readiness: 0.66,
            focus: 'measured-return companionship',
            summary: 'active dialogue is warm but should stay slower',
          },
          'active-control': {
            id: 'active-control',
            state: 'hot',
            readiness: 0.79,
            focus: 'project carry',
            summary: 'control is warm but should keep carrying the same line inward',
          },
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.8,
            focus: 'project carry',
            summary: 'memory is carrying the project seam',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'hot',
            readiness: 0.79,
            focus: 'same digital life companionship',
            summary: 'companionship is staying on the same line',
          },
        },
      }),
    })

    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        dominantSystem: 'control',
        governingFocus: 'keep the callback project-carry inward until the same living line closes a little further',
        summary: 'execution callback project-carry is still part of the same digital life line and should not widen outward yet',
      }),
      runtime: createRuntime({
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'continuity-execution-callback-project-carry is still holding one same living line across the return.',
          primaryOpenLoop: 'Execution-callback project-carry still needs tighter initiative and embodiment closure before a wider reopen.',
          nextClosureTarget: 'Keep callback project-carry measured-return, repair-before-closeness, or rest-protective quiet-companionship across visible reply, resident presence, and later proactive beats.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'execution-callback project-carry is still the same living line and should stay inward before widening outward',
        },
        continuityRestraint: null,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.82,
        channels: {
          ...createRuntime().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.88,
            focus: 'callback project-carry',
            summary: 'dialogue is ready',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'warm',
            readiness: 0.66,
            focus: 'measured-return companionship',
            summary: 'active dialogue is warm but should stay slower',
          },
          'active-control': {
            id: 'active-control',
            state: 'hot',
            readiness: 0.79,
            focus: 'callback project-carry',
            summary: 'control is warm but should keep carrying the same line inward',
          },
          'active-memory': {
            id: 'active-memory',
            state: 'hot',
            readiness: 0.8,
            focus: 'callback project-carry',
            summary: 'memory is carrying the callback project seam',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'hot',
            readiness: 0.79,
            focus: 'same digital life companionship',
            summary: 'companionship is staying on the same line',
          },
        },
      }),
    })

    expect(baseline).not.toBeNull()
    expect(loop).not.toBeNull()
    expect(loop?.handoffTarget).toBe('active-memory')
    expect(loop?.phase).toBe(baseline?.phase)
    expect(loop?.initiativeBudget ?? 1).toBeLessThan((baseline?.initiativeBudget ?? 0) - 0.02)
  })

  it('treats canonical one-continuous-her runtime carry plus broader closure cues as active-memory continuity authority', () => {
    const loop = deriveAlicizationActiveLoopSnapshot({
      architecture: createArchitecture({
        governingFocus: 'keep the same living line inward while broader closure is still landing',
        summary: 'same living line still needs inward continuity carry',
      }),
      runtime: createRuntime({
        dominantChannel: 'dialogue',
        continuityPressure: 0.36,
        companionshipPressure: 0.33,
        continuityRestraint: 'measured-return',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Memory, initiative, dialogue, and embodiment still need stronger end-to-end closure across one same living line.',
          nextClosureTarget: 'Keep initiative and embodiment closure on the same living line before widening outward.',
          preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
          sameHerSelfLine: 'Keep one continuous her explicit: identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. | still-open=Memory still needs stronger',
          emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'measured-return same living line still holds inward before widening outward',
        } as any,
        channels: {
          ...createRuntime().channels,
          'dialogue': {
            id: 'dialogue',
            state: 'hot',
            readiness: 0.9,
            focus: 'same living line reply surface',
            summary: 'dialogue is warm',
          },
          'active-dialogue': {
            id: 'active-dialogue',
            state: 'warm',
            readiness: 0.62,
            focus: 'same living line carry',
            summary: 'active dialogue is available',
          },
          'active-memory': {
            id: 'active-memory',
            state: 'warm',
            readiness: 0.31,
            focus: 'same living line continuity carry',
            summary: 'memory heat is low unless project continuity promotes it',
          },
          'active-mind': {
            id: 'active-mind',
            state: 'warm',
            readiness: 0.29,
            focus: 'same living line inward hold',
            summary: 'mind is steady but not dominant',
          },
          'anthropomorphic-mind': {
            id: 'anthropomorphic-mind',
            state: 'warm',
            readiness: 0.2,
            focus: 'companionship restraint',
            summary: 'companionship is light',
          },
        },
      }),
    })

    expect(loop).not.toBeNull()
    expect(loop?.continuityArcStage).toBe('same-thread-continuation')
    expect(loop?.memoryCarry).toBe(true)
    expect(loop?.handoffTarget).toBe('active-memory')
  })
})
