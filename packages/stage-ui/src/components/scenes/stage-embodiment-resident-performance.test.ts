import type { StageEmbodimentPresencePostureState } from '@proj-alicization/stage-shared'

import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationResidentPerformanceSnapshot,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'
import type { StageEmbodimentAttentionPresenceState } from './use-stage-embodiment-attention'

import { describe, expect, it } from 'vitest'

import { resolveStageEmbodimentResidentPerformance } from './stage-embodiment-resident-performance'

function createManifest(): CharacterPerformanceCapabilitiesManifest {
  return {
    renderer: 'vrm',
    supportedBaseEmotions: [
      'neutral',
      'happy',
      'sad',
      'angry',
      'concerned',
      'tired',
      'apologetic',
      'surprised',
      'thinking',
    ],
    supportedFacialCues: [
      { key: 'focus', label: 'Focus', description: 'Focused gaze', source: 'preset', affectsMouth: false },
      { key: 'glare', label: 'Glare', description: 'Sharper focus', source: 'preset', affectsMouth: false },
      { key: 'relaxed', label: 'Relaxed', description: 'Neutral relaxed face', source: 'preset', affectsMouth: false },
      { key: 'half-lid', label: 'Half Lid', description: 'Sleepy half lid', source: 'preset', affectsMouth: false },
      { key: 'soft-gaze', label: 'Soft Gaze', description: 'Gentle concern', source: 'preset', affectsMouth: false },
      { key: 'frown', label: 'Frown', description: 'Mild frown', source: 'preset', affectsMouth: false },
    ],
    supportedActions: [
      { key: 'observe_focus', label: 'Observe', description: 'Observe the work surface', source: 'builtin' },
      { key: 'inspect_focus', label: 'Inspect', description: 'Inspect with intent', source: 'builtin' },
      { key: 'steady_focus', label: 'Steady Focus', description: 'Hold a steady focused pose', source: 'builtin' },
      { key: 'idle_settle', label: 'Idle Settle', description: 'Idle settle pose', source: 'builtin' },
      { key: 'slow_nod', label: 'Slow Nod', description: 'Slow thoughtful nod', source: 'builtin' },
      { key: 'comfort_sway', label: 'Comfort Sway', description: 'Gentle comfort sway', source: 'builtin' },
      { key: 'idle_gentle_nod', label: 'Gentle Nod', description: 'Gentle idle nod', source: 'builtin' },
    ],
    supportsLookAt: true,
    supportsVisemeLipSync: true,
    supportsMicroDynamics: true,
  }
}

function createVisualPresenceState(
  overrides: Partial<AlicizationVisualPresenceStateSnapshot> = {},
): AlicizationVisualPresenceStateSnapshot {
  return {
    watchMode: 'mnemonic-passive',
    currentScene: null,
    attention: null,
    captureState: {
      permission: 'granted',
      health: 'healthy',
      sourceName: 'screen',
      degradedReason: null,
      leaseStatus: 'inactive',
      updatedAt: 0,
      lastGroundedAt: 0,
    },
    durabilityPulse: null,
    recentTransition: null,
    privateThought: null,
    discourseState: null,
    dialogueWorldThread: null,
    worldModel: null,
    nextSuggestedProbeMs: 45_000,
    updatedAt: 1_000,
    ...overrides,
  } as AlicizationVisualPresenceStateSnapshot
}

function withSilentPresenceAuthority<T extends AlicizationVisualPresenceStateSnapshot>(
  state: T,
  authority: {
    currentBodyState: 'accompanying' | 'recovering'
    continuityMode: 'quiet-accompaniment' | 'protective-watch'
    quietLineMs: number
    currentInwardPreoccupation: string
  },
): T {
  return {
    ...state,
    ...authority,
  } as T
}

function createSilentResidentPerformanceSnapshot(
  mode: 'accompanying' | 'recovering',
): AlicizationResidentPerformanceSnapshot {
  const recovering = mode === 'recovering'
  return {
    version: 'resident-performance-v1',
    source: 'main-runtime',
    performance: {
      baseEmotion: recovering ? 'tired' : 'thinking',
      emotion: recovering ? 'tired' : 'thinking',
      facialCue: recovering ? 'soft-gaze' : 'focus',
      actionCue: recovering ? 'comfort_sway' : 'observe_focus',
      delivery: 'gentle',
      emphasis: recovering ? 1 : 2,
    },
    embodiedPresence: recovering ? 'concerned' : 'attentive',
    stance: recovering ? 'care' : 'accompany',
    emotionalTension: recovering ? 'late-night-drain' : 'soft-covision',
    confidence: 0.82,
    reasonTags: [recovering ? 'recovery' : 'companionship'],
    signature: recovering
      ? 'resident|main-runtime|recovering|protective-watch'
      : 'resident|main-runtime|accompanying|quiet-accompaniment',
    updatedAt: 1_000,
  }
}

function createDigitalLifeSpineDigest(overrides: Partial<AlicizationDigitalLifeSpineDigest> = {}): AlicizationDigitalLifeSpineDigest {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      sceneSummary: 'Investigating a failing diff in runtime.',
      activeThreadId: 'thread-runtime',
      activeThreadTitle: 'runtime diff',
      dominantMode: 'thinking',
      dominantDrive: 'stabilize',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
      selectedAction: 'warn',
      updatedAt: 2_000,
      ...overrides.runtime,
    },
    architecture: {
      operatingMode: 'thinking',
      dominantSystem: 'memory',
      supportingSystems: ['dialogue', 'perception'],
      governingFocus: 'stabilize runtime coherence',
      summary: 'memory-guided dialogue with active perception',
      ...overrides.architecture,
    },
    continuitySignal: {
      label: 'digital-life-line',
      summary: 'watch=symbiotic-vision | scene=coding | mode=thinking',
      signature: 'spine-runtime-1',
      createdAt: 2_000,
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      activeThreadId: 'thread-runtime',
      dominantMode: 'thinking',
      dominantDrive: 'stabilize',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
      ...overrides.continuitySignal,
    },
    proactive: {
      selectedAction: 'warn',
      preferredStyle: 'firm-warning',
      confidence: 0.9,
      shouldSpeak: false,
      activeThreadId: 'thread-runtime',
      activeThreadTitle: 'runtime diff',
      dominantConcernKind: 'integrity',
      dominantConcernSummary: 'avoid unsupported specificity',
      leadingGoalId: 'goal-runtime',
      leadingGoalSummary: 'stabilize the response surface',
      preferredPresence: 'attentive',
      ...overrides.proactive,
    },
    memory: {
      summary: 'trace-backed repair line',
      recentEpisodeSummary: 'main runtime takeover stabilized',
      recentEpisodeCount: 2,
      focusBeliefStatement: 'preserve truthful response contract',
      focusBeliefConfidence: 0.82,
      leadingGoalSummary: 'stabilize runtime coherence',
      dominantConcernSummary: 'unsupported specificity',
      reflectionSummary: 'prefer trace-backed claims',
      reflectionPressure: 0.38,
      recallMode: 'working-memory',
      recallSeed: 'runtime:truth-discipline',
      thoughtThreadSummary: 'runtime truth discipline line',
      ...overrides.memory,
    },
    ...overrides,
  }
}

describe('stage embodiment resident performance', () => {
  it('keeps inspection-focused resident performance aligned with coding scenes', () => {
    const activePresence: StageEmbodimentAttentionPresenceState = {
      source: 'runtime-visual-presence',
      embodiedPresence: 'attentive',
      confidence: 0.86,
      delivery: null,
      emphasis: 1,
      expiresAt: Date.now() + 3_000,
    }
    const presencePosture: StageEmbodimentPresencePostureState = {
      engaged: true,
      mode: 'inspection',
      confidence: 0.88,
      bodyYaw: 0.1,
      bodyPitch: 0.44,
      breathBoost: 0.32,
      gazeStability: 0.92,
    }
    const visualPresenceState = createVisualPresenceState({
      watchMode: 'invited-inspection',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Reviewing a failing diff before patching.',
        source: 'screen-semantic-summary',
        confidence: 0.84,
        target: null,
        beganAt: 0,
        lastSeenAt: 1_000,
      },
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'Need to trace the regression carefully.',
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        confidence: 0.74,
        rationaleTags: ['inspection'],
        stance: 'observe',
        expiresAt: Date.now() + 6_000,
      },
    })

    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence,
      continuity: {
        previousActionCue: 'observe_focus',
        previousFacialCue: 'focus',
        variationToken: 'resident:previous',
      },
      performanceManifest: createManifest(),
      presencePosture,
      visualPresenceState,
    })

    expect(resolved.performance.baseEmotion).toBe('thinking')
    expect(resolved.performance.delivery).toBe('firm')
    expect(resolved.performance.emphasis).toBe(2)
    expect(['focus', 'glare']).toContain(resolved.performance.facialCue)
    expect(['inspect_focus', 'steady_focus', 'observe_focus']).toContain(resolved.performance.actionCue)
    expect(resolved.variationToken).toContain('invited-inspection')
  })

  it('settles into a gentle tired resident performance during late-night care states', () => {
    const activePresence: StageEmbodimentAttentionPresenceState = {
      source: 'runtime-visual-presence',
      embodiedPresence: 'concerned',
      confidence: 0.72,
      delivery: null,
      emphasis: 1,
      expiresAt: Date.now() + 3_000,
    }
    const presencePosture: StageEmbodimentPresencePostureState = {
      engaged: true,
      mode: 'concerned',
      confidence: 0.7,
      bodyYaw: -0.06,
      bodyPitch: 0.38,
      breathBoost: 0.28,
      gazeStability: 0.84,
    }
    const visualPresenceState = createVisualPresenceState({
      currentScene: {
        workloadKind: 'chat',
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'Staying close while the host is winding down.',
        source: 'foreground-window-heuristic',
        confidence: 0.68,
        target: null,
        beganAt: 0,
        lastSeenAt: 1_000,
      },
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'Keep things soft and steady.',
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        confidence: 0.76,
        rationaleTags: ['care'],
        stance: 'care',
        expiresAt: Date.now() + 6_000,
      },
    })

    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence,
      performanceManifest: createManifest(),
      presencePosture,
      visualPresenceState,
    })

    expect(resolved.performance.baseEmotion).toBe('tired')
    expect(resolved.performance.delivery).toBe('gentle')
    expect(resolved.performance.emphasis).toBe(1)
    expect(['relaxed', 'half-lid', 'soft-gaze']).toContain(resolved.performance.facialCue)
    expect(['idle_settle', 'slow_nod', 'comfort_sway', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
    expect(resolved.variationToken).toContain('late-night-care')
  })

  it('biases synthesized silent accompanying toward quiet companionship instead of a flat reset', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceState({
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'doc',
          scenario: 'coding',
          summary: 'Quietly staying with the host through deep focus.',
          source: 'screen-semantic-summary',
          confidence: 0.72,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Stay close without interrupting.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          confidence: 0.7,
          rationaleTags: ['companionship'],
          stance: 'accompany',
          expiresAt: Date.now() + 6_000,
        },
        residentPerformance: null,
      }), {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'host sustained focus',
      }),
    })

    expect(['thinking', 'neutral']).toContain(resolved.performance.baseEmotion)
    expect(['calm', 'gentle']).toContain(resolved.performance.delivery)
    expect(['observe_focus', 'steady_focus', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
  })

  it('biases synthesized silent recovering toward low-pressure care instead of generic attention', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceState({
        watchMode: 'recovering',
        currentScene: {
          workloadKind: 'chat',
          contentKind: 'chat',
          scenario: 'late-night-care',
          summary: 'Holding a gentle recovery watch without pushing.',
          source: 'foreground-window-heuristic',
          confidence: 0.65,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Keep the pressure low and stay nearby.',
          suggestedStyle: 'gentle-care',
          embodiedPresence: 'concerned',
          emotionalTension: 'late-night-drain',
          confidence: 0.68,
          rationaleTags: ['recovery'],
          stance: 'care',
          expiresAt: Date.now() + 6_000,
        },
        residentPerformance: null,
      }), {
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
        quietLineMs: 90_000,
        currentInwardPreoccupation: 'host recovery window',
      }),
    })

    expect(['tired', 'concerned']).toContain(resolved.performance.baseEmotion)
    expect(resolved.performance.delivery).toBe('gentle')
    expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(resolved.performance.facialCue)
    expect(['idle_settle', 'comfort_sway', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
  })

  it('prefers authoritative resident performance published by the main runtime', () => {
    const activePresence: StageEmbodimentAttentionPresenceState = {
      source: 'runtime-visual-presence',
      embodiedPresence: 'attentive',
      confidence: 0.92,
      delivery: null,
      emphasis: 2,
      expiresAt: Date.now() + 3_000,
    }
    const presencePosture: StageEmbodimentPresencePostureState = {
      engaged: true,
      mode: 'inspection',
      confidence: 0.9,
      bodyYaw: 0.08,
      bodyPitch: 0.42,
      breathBoost: 0.34,
      gazeStability: 0.9,
    }
    const visualPresenceState = createVisualPresenceState({
      watchMode: 'invited-inspection',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'The renderer should not override main-owned resident affect.',
        source: 'screen-semantic-summary',
        confidence: 0.91,
        target: null,
        beganAt: 0,
        lastSeenAt: 1_000,
      },
        residentPerformance: {
        ...createSilentResidentPerformanceSnapshot('recovering'),
        performance: {
          ...createSilentResidentPerformanceSnapshot('recovering').performance,
          facialCue: 'runtime-half-closed',
          actionCue: 'runtime-stillness',
        },
      } satisfies AlicizationResidentPerformanceSnapshot,
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'Stay gentle.',
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        confidence: 0.8,
        rationaleTags: ['care'],
        stance: 'care',
        expiresAt: Date.now() + 6_000,
      },
    })

    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence,
      performanceManifest: createManifest(),
      presencePosture,
      visualPresenceState,
    })

    expect(resolved.performance.baseEmotion).toBe('tired')
    expect(resolved.performance.delivery).toBe('gentle')
    expect(resolved.performance.emphasis).toBe(1)
    expect(resolved.performance.facialCue).toBe('runtime-half-closed')
    expect(resolved.performance.actionCue).toBe('runtime-stillness')
    expect(resolved.variationToken).toBe(visualPresenceState.residentPerformance?.signature)
  })

  it('fills missing published runtime cues through renderer planning without changing authoritative affect', () => {
    const visualPresenceState = createVisualPresenceState({
      watchMode: 'recovering',
      currentScene: {
        workloadKind: 'chat',
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'Published runtime affect should still receive renderer-supported cues when missing.',
        source: 'foreground-window-heuristic',
        confidence: 0.77,
        target: null,
        beganAt: 0,
        lastSeenAt: 1_000,
      },
      residentPerformance: {
        ...createSilentResidentPerformanceSnapshot('recovering'),
        performance: {
          ...createSilentResidentPerformanceSnapshot('recovering').performance,
          facialCue: null,
          actionCue: null,
        },
      } satisfies AlicizationResidentPerformanceSnapshot,
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'Hold a soft care posture.',
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        confidence: 0.8,
        rationaleTags: ['care'],
        stance: 'care',
        expiresAt: Date.now() + 6_000,
      },
    })

    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState,
    })

    expect(resolved.performance.baseEmotion).toBe('tired')
    expect(resolved.performance.delivery).toBe('gentle')
    expect(resolved.performance.emphasis).toBe(1)
    expect(['relaxed', 'half-lid', 'soft-gaze']).toContain(resolved.performance.facialCue)
    expect(['idle_settle', 'slow_nod', 'comfort_sway', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
    expect(resolved.variationToken).toBe(visualPresenceState.residentPerformance?.signature)
  })

  it('derives resident performance from transient digital-life spine when runtime snapshot is absent', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      digitalLifeSpine: createDigitalLifeSpineDigest(),
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: createVisualPresenceState({
        watchMode: 'mnemonic-passive',
        currentScene: null,
        privateThought: null,
        residentPerformance: null,
      }),
    })

    expect(resolved.performance.baseEmotion).toBe('concerned')
    expect(resolved.performance.delivery).toBe('firm')
    expect(resolved.performance.emphasis).toBe(2)
    expect(resolved.variationToken).toContain('concerned')
    expect(resolved.variationToken).toContain('firm')
    expect(resolved.variationToken).toContain('warn')
  })
})
