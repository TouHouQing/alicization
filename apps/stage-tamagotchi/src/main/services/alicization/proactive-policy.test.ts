import type { AlicizationPersonalityState } from '../../../shared/eventa'
import type { AlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { createDefaultProactiveLoopState } from './proactive-feedback'
import { evaluateProactivePolicy } from './proactive-policy'

type PolicyInput = Parameters<typeof evaluateProactivePolicy>[0]

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
      hostAttitude: 'polite and focused',
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

function createPrivateThought(overrides: Record<string, unknown> = {}) {
  return {
    stance: 'nudge',
    confidence: 0.84,
    rationaleTags: ['semantic-friction'],
    thoughtText: 'I can help with the current error.',
    shouldSpeak: true,
    suggestedStyle: 'light-nudge',
    embodiedPresence: 'attentive',
    expiresAt: 120_000,
    afterglowFromScenario: null,
    emotionalTension: 'tense-debug',
    ...overrides,
  } as any
}

function createInitiative(overrides: Record<string, unknown> = {}) {
  return {
    shouldSpeak: true,
    shouldAct: false,
    confidence: 0.82,
    speakDrive: 0.76,
    silenceDrive: 0.18,
    selectedAction: 'speak',
    preferredStyle: 'light-nudge',
    ...overrides,
  } as any
}

function createPersonality(overrides: Partial<AlicizationPersonalityState> = {}): AlicizationPersonalityState {
  return {
    obedience: 0.62,
    liveliness: 0.4,
    sensibility: 0.58,
    identityKernel: {
      relationshipPosture: 'companion',
      initiativeStyle: 'measured-approach',
      valueBias: [],
    },
    expressionProfile: {
      warmth: 'guarded-warm',
      directness: 'measured',
      playfulness: 'low',
      emotionalVisibility: 'steady',
    },
    initiativeBaseline: {
      silenceReconnect: 'light-probe',
      comfortStyle: 'gentle-care',
      jealousyStyle: 'soft-ache',
    },
    identityAnchors: [],
    antiPersonaConstraints: [],
    ...overrides,
  }
}

function createArchitecture(
  overrides: Partial<AlicizationDigitalLifeArchitectureSnapshot> = {},
): AlicizationDigitalLifeArchitectureSnapshot {
  const architecture = {
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
        score: 0.52,
        focus: 'editor',
        summary: 'perception is stable',
        reasons: ['scene:coding'],
      },
      proactive: {
        id: 'proactive',
        state: 'hot',
        score: 0.82,
        focus: 'nudge',
        summary: 'proactive is ready',
        reasons: ['initiative:speak'],
      },
      control: {
        id: 'control',
        state: 'warm',
        score: 0.58,
        focus: 'guide',
        summary: 'control is warm',
        reasons: ['intention:guide'],
      },
      mind: {
        id: 'mind',
        state: 'hot',
        score: 0.84,
        focus: 'repair thread',
        summary: 'mind is hot',
        reasons: ['thread:problem'],
      },
      memory: {
        id: 'memory',
        state: 'warm',
        score: 0.64,
        focus: 'recent repair',
        summary: 'memory is warm',
        reasons: ['memory:carry'],
      },
      runtime: {
        id: 'runtime',
        state: 'warm',
        score: 0.66,
        focus: 'symbiotic-vision',
        summary: 'runtime is warm',
        reasons: ['watch:symbiotic-vision'],
      },
    },
  } as AlicizationDigitalLifeArchitectureSnapshot

  return {
    ...architecture,
    ...overrides,
    systems: {
      ...architecture.systems,
      ...overrides.systems,
    },
  }
}

function createRuntimeSnapshot(overrides: Partial<AlicizationRuntimeSnapshot> = {}): AlicizationRuntimeSnapshot {
  const runtime = {
    version: 'alicization-runtime-v1',
    dominantChannel: 'dialogue',
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
        readiness: 0.6,
        focus: 'thread',
        summary: 'mind warm',
      },
      'active-memory': {
        id: 'active-memory',
        state: 'warm',
        readiness: 0.68,
        focus: 'carry',
        summary: 'memory carry ready',
      },
      'anthropomorphic-mind': {
        id: 'anthropomorphic-mind',
        state: 'warm',
        readiness: 0.66,
        focus: 'companionship',
        summary: 'companionship warm',
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
    continuityPressure: 0.64,
    companionshipPressure: 0.7,
    summary: 'dominant=dialogue',
  } as AlicizationRuntimeSnapshot

  return {
    ...runtime,
    ...overrides,
    channels: {
      ...runtime.channels,
      ...overrides.channels,
    },
  }
}

function createInput(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    now: 1_000,
    context: createContext(),
    proactiveState: createDefaultProactiveLoopState(1_000),
    killSwitchSuspended: false,
    watchMode: 'symbiotic-vision',
    privateThought: createPrivateThought(),
    initiative: createInitiative(),
    architecture: createArchitecture(),
    runtimeDigest: createRuntimeSnapshot(),
    personalityAuthority: createPersonality(),
    perception: {
      activeAttentionAnchor: true,
      attentionAnchorAgeMs: 1_000,
      attentionAnchorConfidence: 0.88,
      attentionAnchorWorkloadKind: 'coding',
      attentionAnchorCanOverrideScenario: true,
      recentObservationCount: 3,
      invitedInspectionActive: true,
    },
    ...overrides,
  }
}

function createNeutralAffectiveResidue() {
  return {
    dominantResidueKind: null,
    restProtectivePressure: 0,
    repairPressure: 0,
    relationshipCadence: {
      cadenceMode: 'open',
      shouldDelayWarmth: false,
      shouldProtectRest: false,
      fatigueGuard: 0,
      repairRecovery: 0,
      afterglowCarry: 0,
      overreachRisk: 0,
    },
  } as any
}

describe('evaluateProactivePolicy', () => {
  it('lets structured continuity deliberation defer an otherwise speakable turn', () => {
    const input = createInput()
    const baseline = evaluateProactivePolicy(input)
    const held = evaluateProactivePolicy({
      ...input,
      continuityDeliberation: {
        kind: 'dialogue-carry',
        arcStage: 'hold-for-opening',
        summary: 'owner-authored summary',
        whyNow: 'owner-authored rationale',
        pressure: 0.82,
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
    expect(held.style).toBe('silent-observe')
    expect(held.reasonCodes).toContain('continuity-next-open-window')
  })

  it('lets objective runtime and active-loop readiness drive a speakable decision', () => {
    const decision = evaluateProactivePolicy(createInput())

    expect(decision.shouldInterrupt).toBe(true)
    expect(decision.style).toBe('light-nudge')
    expect(decision.reasonCodes).toContain('runtime-dialogue-ready')
    expect(decision.reasonCodes).toContain('runtime-continuity-pressure')
    expect(decision.consideredSignals).toContain('runtimeDigest.activeLoop.coherence.gating')
  })

  it('keeps observation-dominant runtime silent without consulting persona templates', () => {
    const runtime = createRuntimeSnapshot({
      dominantChannel: 'active-perception',
      shouldProactivelySpeak: false,
      continuityPressure: 0.2,
      companionshipPressure: 0.2,
      channels: {
        'dialogue': {
          id: 'dialogue',
          state: 'cold',
          readiness: 0.1,
          focus: 'none',
          summary: 'dialogue cold',
        },
        'active-dialogue': {
          id: 'active-dialogue',
          state: 'cold',
          readiness: 0.1,
          focus: 'none',
          summary: 'active dialogue cold',
        },
        'active-control': {
          id: 'active-control',
          state: 'cold',
          readiness: 0.1,
          focus: 'none',
          summary: 'control cold',
        },
        'active-perception': {
          id: 'active-perception',
          state: 'hot',
          readiness: 0.92,
          focus: 'observe',
          summary: 'perception hot',
        },
      } as any,
    })
    const decision = evaluateProactivePolicy(createInput({
      runtimeDigest: runtime,
      architecture: createArchitecture({
        operatingMode: 'observing',
        dominantSystem: 'perception',
      } as any),
    }))

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.reasonCodes).toContain('runtime-observe-dominant')
  })

  it('treats real active-memory pressure as a runtime signal', () => {
    const decision = evaluateProactivePolicy(createInput({
      runtimeDigest: createRuntimeSnapshot({
        dominantChannel: 'active-memory',
        continuityPressure: 0.84,
        shouldProactivelySpeak: true,
      }),
    }))

    expect(decision.consideredSignals).toContain('runtimeDigest.continuityPressure')
    expect(decision.reasonCodes).toContain('runtime-continuity-pressure')
    expect(decision.whyNow).toContain('runtime_channel=active-memory')
  })

  it('keeps explicit persona preferences as direct policy inputs', () => {
    const observant = evaluateProactivePolicy(createInput({
      personalityAuthority: createPersonality({
        identityKernel: {
          relationshipPosture: 'companion',
          initiativeStyle: 'observant',
          valueBias: [],
        },
      }),
    }))
    const participating = evaluateProactivePolicy(createInput({
      personalityAuthority: createPersonality({
        identityKernel: {
          relationshipPosture: 'companion',
          initiativeStyle: 'high-participation',
          valueBias: [],
        },
        initiativeBaseline: {
          silenceReconnect: 'direct-approach',
          comfortStyle: 'gentle-care',
          jealousyStyle: 'soft-ache',
        },
      }),
    }))

    expect(observant.shouldInterrupt).toBe(false)
    expect(observant.style).toBe('silent-observe')
    expect(observant.reasonCodes).toContain('persona-observant-style')
    expect(participating.reasonCodes).toContain('persona-high-participation-style')
    expect(participating.reasonCodes).toContain('persona-direct-reconnect')
  })

  it('preserves explicit execution safety from structured emotional-kernel reason codes', () => {
    const safetyGate = evaluateProactivePolicy(createInput({
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'guarded-care',
        initiativeMode: 'hold',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'protective-watch',
        valence: 0.42,
        arousal: 0.38,
        guardedness: 0.82,
        closenessDrive: 0.36,
        repairNeed: 0.74,
        initiativePressure: 0.18,
        reasonTags: ['execution-safety-gate', 'confirmation-boundary'],
        why: 'arbitrary owner-authored explanation',
      } as any,
    } as any))

    expect(safetyGate.shouldInterrupt).toBe(false)
    expect(safetyGate.style).toBe('silent-observe')
    expect(safetyGate.consideredSignals).toContain('emotionalKernel.executionSafetyGateRestraint')
    expect(safetyGate.whyNow).toContain('safety_gate=blocked_dispatch_confirmation_required')
  })

  it('does not derive execution safety policy from conscious-frame or reply prose', () => {
    const baseline = evaluateProactivePolicy(createInput())
    const proseOnly = evaluateProactivePolicy(createInput({
      currentConsciousFrame: {
        reasonTags: ['arbitrary narrative that says execution safety restraint and confirmation=required'],
      } as any,
      replyDeliberation: {
        mustInclude: ['not permanent autonomous permission'],
        narrative: ['confirmation boundary after host-confirmed redispatch'],
      } as any,
    }))

    expect(proseOnly.shouldInterrupt).toBe(baseline.shouldInterrupt)
    expect(proseOnly.style).toBe(baseline.style)
    expect(proseOnly.consideredSignals).not.toContain('currentConsciousFrame.executionSafetyGateRestraint')
    expect(proseOnly.consideredSignals).not.toContain('replyDeliberation.executionResumeConfirmationBoundary')
  })

  it('honors kill switch, fullscreen suppression, and global cooldown', () => {
    const killSwitch = evaluateProactivePolicy(createInput({
      killSwitchSuspended: true,
    }))
    const fullscreenContext = createContext({
      system: {
        ...createContext().system,
        fullscreenLikely: true,
      },
    })
    const fullscreen = evaluateProactivePolicy(createInput({
      context: fullscreenContext,
    }))
    const cooldownState = createDefaultProactiveLoopState(1_000)
    cooldownState.globalCooldownUntil = 5_000
    const cooldown = evaluateProactivePolicy(createInput({
      proactiveState: cooldownState,
    }))

    expect(killSwitch.shouldInterrupt).toBe(false)
    expect(killSwitch.reasonCodes).toContain('kill-switch-suspended')
    expect(fullscreen.shouldInterrupt).toBe(false)
    expect(fullscreen.reasonCodes).toContain('fullscreen-host')
    expect(cooldown.shouldInterrupt).toBe(false)
    expect(cooldown.reasonCodes).toContain('global-cooldown-active')
  })

  it('uses persisted feedback bias and ignored outcomes for frequency control', () => {
    const neutralState = createDefaultProactiveLoopState(1_000)
    const restrainedState = createDefaultProactiveLoopState(1_000)
    restrainedState.scenarioBias.coding = 0.35
    restrainedState.consecutiveIgnored.coding = 3

    const neutral = evaluateProactivePolicy(createInput({
      proactiveState: neutralState,
    }))
    const restrained = evaluateProactivePolicy(createInput({
      proactiveState: restrainedState,
    }))

    expect(restrained.feedbackBias).toBe(0.35)
    expect(restrained.reasonCodes).toContain('scenario-bias-raised')
    expect(restrained.reasonCodes).toContain('recent-dismiss-penalty')
    expect(restrained.reasonCodes).toContain('recent-ignored-penalty')
    expect(restrained.cooldownMs).toBeGreaterThan(neutral.cooldownMs)
  })

  it('keeps act-only autonomy from leaking into speech', () => {
    const decision = evaluateProactivePolicy(createInput({
      autonomy: {
        selectedMode: 'prepare-act',
        shouldAct: true,
        shouldSpeak: false,
        speakReadiness: 0.82,
        actReadiness: 0.92,
        inhibition: 0.2,
        executionIntent: {
          kind: 'follow-through',
        },
      } as any,
    }))

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.style).toBe('silent-observe')
    expect(decision.consideredSignals).toContain('autonomy.actReadiness')
  })

  it('uses objective affective rest pressure but ignores relationship cadence fields', () => {
    const restProtective = createNeutralAffectiveResidue()
    restProtective.dominantResidueKind = 'rest-protective'
    restProtective.restProtectivePressure = 0.82
    const baseline = evaluateProactivePolicy(createInput({
      affectiveResidue: restProtective,
    }))
    const cadenceInjected = evaluateProactivePolicy(createInput({
      affectiveResidue: {
        ...restProtective,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          shouldDelayWarmth: true,
          shouldProtectRest: true,
          fatigueGuard: 1,
          repairRecovery: 1,
          afterglowCarry: 1,
          overreachRisk: 1,
        },
      },
    }))

    expect(baseline.shouldInterrupt).toBe(false)
    expect(baseline.style).toBe('silent-observe')
    expect(baseline.whyNow).toContain('affective_rest=protected')
    expect(cadenceInjected).toEqual(baseline)
  })

  it('keeps structured learned habit policy without parsing narrative templates', () => {
    const habitPolicy = {
      dominantMode: 'protect-rest-window',
      suggestedStyleCap: 'silent-observe',
      suggestedPresenceCap: 'concerned',
      requiresGroundingBeforeSurface: false,
      prefersQuietCompanionship: false,
      protectsRestWindow: true,
      narrative: [],
    } as any
    const decision = evaluateProactivePolicy(createInput({
      habitPolicy,
    }))

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.reasonCodes).toContain('habit-policy-rest-protection')
    expect(decision.consideredSignals).toContain('habitPolicy.dominantMode')
  })

  it('surfaces durability failures with high urgency', () => {
    const decision = evaluateProactivePolicy(createInput({
      durabilityPulse: {
        kind: 'process-gone',
      } as any,
    }))

    expect(decision.urgency).toBe('high')
    expect(decision.reasonCodes).toContain('durability-pulse')
    expect(decision.reasonCodes).toContain('durability-process-gone')
  })

  it('holds when contradiction-heavy evidence has no validation support', () => {
    const decision = evaluateProactivePolicy(createInput({
      knowledgeEvidence: {
        validationCount: 0,
        stronglyValidatedProcedureCount: 0,
        contradictionCount: 4,
        contradictionHeavyFactCount: 2,
      },
    }))

    expect(decision.shouldInterrupt).toBe(false)
    expect(decision.consideredSignals).toContain('knowledgeEvidence')
  })
})
