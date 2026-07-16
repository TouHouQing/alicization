import type {
  AlicizationEmotionalKernelSnapshot,
  StageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationResidentPerformanceSnapshot,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'
import type { StageEmbodimentAttentionPresenceState } from './use-stage-embodiment-attention'

import { describe, expect, it } from 'vitest'

import { resolveStageEmbodimentResidentPerformance } from './stage-embodiment-resident-performance'

function mergeWithDefaults<T extends object>(
  defaults: T,
  overrides: unknown,
): T {
  return {
    ...defaults,
    ...((overrides ?? {}) as object),
  } as T
}

type ResidentVisualPresenceStateSnapshot = AlicizationVisualPresenceStateSnapshot & {
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
}

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
  overrides: any = {},
): ResidentVisualPresenceStateSnapshot {
  return mergeWithDefaults({
    watchMode: 'mnemonic-passive',
    currentScene: null,
    attention: null,
    captureState: {
      permission: 'granted',
      sourceName: 'screen',
      degradedReason: null,
      lastGroundedAt: 0,
    },
    durabilityPulse: null,
    recentTransition: null,
    privateThought: null,
    discourseState: null,
    dialogueWorldThread: null,
    worldModel: null,
    emotionalKernel: null,
    nextSuggestedProbeMs: 45_000,
    updatedAt: 1_000,
  }, overrides) as unknown as ResidentVisualPresenceStateSnapshot
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
  } as AlicizationResidentPerformanceSnapshot
}

function createDigitalLifeSpineDigest(overrides: any = {}): AlicizationDigitalLifeSpineDigest {
  const baseAutobiographicalSelf = {
    attachmentStyle: null,
    expressionStyle: null,
    conflictStyle: null,
    agencyStyle: null,
    attachmentNeed: null,
    autonomyNeed: null,
    truthAnchor: null,
    careBias: null,
    playBias: null,
    irritabilityThreshold: null,
    stubbornness: null,
    companionship: null,
    truthfulGrounding: null,
    gentleRepair: null,
    quietObservation: null,
    proactiveCare: null,
    playfulIntimacy: null,
    autonomyRespect: null,
    unfinishedThreadReturn: null,
    stability: null,
    identityNarrative: null,
    relationshipDoctrine: null,
    latestInflection: null,
  }

  return {
    version: 'digital-life-spine-digest-v1',
    runtime: mergeWithDefaults({
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
    }, overrides.runtime),
    architecture: overrides.architecture === null
      ? null
      : mergeWithDefaults({
        operatingMode: 'thinking',
        dominantSystem: 'memory',
        supportingSystems: ['dialogue', 'perception'],
        governingFocus: 'stabilize runtime coherence',
        summary: 'memory-guided dialogue with active perception',
      }, overrides.architecture) as AlicizationDigitalLifeSpineDigest['architecture'],
    continuitySignal: overrides.continuitySignal === null
      ? null
      : mergeWithDefaults({
          label: 'digital-life-line' as const,
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
        }, overrides.continuitySignal),
    proactive: overrides.proactive === null
      ? null
      : mergeWithDefaults({
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
          personaBias: null,
        }, overrides.proactive),
    embodiment: overrides.embodiment === null
      ? null
      : overrides.embodiment
        ? {
            privateThought: overrides.embodiment.privateThought
              ? mergeWithDefaults({
                  stance: null,
                  confidence: null,
                  shouldSpeak: null,
                  suggestedStyle: null,
                  embodiedPresence: null,
                  emotionalTension: null,
                  relationshipVector: null,
                  initiativeAction: null,
                  governorDrive: null,
                }, overrides.embodiment.privateThought)
              : null,
            selfContinuity: overrides.embodiment.selfContinuity
              ? mergeWithDefaults({
                  attachmentMode: null,
                  initiativeTemperament: null,
                  perceptionTrust: null,
                  relationshipTrust: null,
                  guardingTendency: null,
                  misreadBurden: null,
                  carryOverDesire: null,
                }, overrides.embodiment.selfContinuity)
              : null,
            autobiographicalSelf: overrides.embodiment.autobiographicalSelf
              ? mergeWithDefaults(baseAutobiographicalSelf, overrides.embodiment.autobiographicalSelf)
              : null,
            relationship: overrides.embodiment.relationship
              ? mergeWithDefaults({
                  climate: null,
                  approachVector: null,
                  receptivity: null,
                  sharedAttentionTrust: null,
                  correctionSensitivity: null,
                  reciprocityExpectation: null,
                }, overrides.embodiment.relationship)
              : null,
            selfState: overrides.embodiment.selfState
              ? mergeWithDefaults({
                  stance: null,
                  feltCloseness: null,
                  protectiveness: null,
                  curiosity: null,
                  patience: null,
                  desireToSpeak: null,
                  fearOfInterrupting: null,
                  moodLabel: null,
                }, overrides.embodiment.selfState)
              : null,
            mindEcology: overrides.embodiment.mindEcology
              ? mergeWithDefaults({
                  moodLabel: null,
                  replyHabit: null,
                  relationshipHabit: null,
                  explorationHabit: null,
                  regulationHabit: null,
                  selfNarrative: null,
                  relationNarrative: null,
                  currentPreoccupation: null,
                  temperament: mergeWithDefaults({
                    attachment: null,
                    curiosity: null,
                    steadiness: null,
                    directness: null,
                    playfulness: null,
                    irritability: null,
                    tenderness: null,
                  }, overrides.embodiment.mindEcology.temperament),
                  climate: mergeWithDefaults({
                    valence: null,
                    arousal: null,
                    socialNeed: null,
                    solitudeNeed: null,
                    irritation: null,
                    restlessness: null,
                    reflectivePull: null,
                  }, overrides.embodiment.mindEcology.climate),
                }, overrides.embodiment.mindEcology)
              : null,
            initiative: overrides.embodiment.initiative
              ? mergeWithDefaults({
                  selectedAction: null,
                  preferredStyle: null,
                  preferredPresence: null,
                  continuityRestraint: null,
                  confidence: null,
                  shouldSpeak: null,
                  speakDrive: null,
                  silenceDrive: null,
                  why: null,
                  personaBias: overrides.embodiment.initiative.personaBias
                    ? mergeWithDefaults({
                        relationshipPosture: null,
                        initiativeStyle: null,
                        silenceReconnect: null,
                        comfortStyle: null,
                        preferredProactiveStyle: null,
                        manifestationCadenceSummary: null,
                        openingGuidance: null,
                        whySummary: null,
                      }, overrides.embodiment.initiative.personaBias)
                    : null,
                }, overrides.embodiment.initiative)
              : null,
          }
        : null,
    memory: overrides.memory === null
      ? null
      : mergeWithDefaults({
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
        }, overrides.memory),
    autonomy: overrides.autonomy
      ? mergeWithDefaults({
        selectedMode: null,
        visibleAction: null,
        shouldSurface: null,
        shouldSpeak: null,
        shouldAct: null,
        speakReadiness: null,
        actReadiness: null,
        inhibition: null,
        confidence: null,
        executionIntentKind: null,
        executionIntentSummary: null,
        deferReason: null,
        whyNow: null,
        sourceGoalId: null,
        sourceGoalSummary: null,
        sourceAgendaKind: null,
      }, overrides.autonomy) as AlicizationDigitalLifeSpineDigest['autonomy']
      : null,
    motive: overrides.motive
      ? mergeWithDefaults({
          rulingDrive: null,
          returnPressure: null,
          companionshipDrive: null,
          boundaryRespectDrive: null,
          truthDisciplineDrive: null,
          restProtectionDrive: null,
          selfDirectionDrive: null,
          leadingGoalSummary: null,
          leadingAgendaKind: null,
          leadingAgendaSummary: null,
          narrative: null,
        }, overrides.motive)
      : null,
    habit: overrides.habit
      ? mergeWithDefaults({
          dominantMode: null,
          requiresGroundingBeforeSurface: null,
          prefersQuietCompanionship: null,
          blocksDirectSpeakWhenBusy: null,
          protectsRestWindow: null,
          returnViaRecheck: null,
          suggestedStyleCap: null,
          suggestedPresenceCap: null,
          narrative: null,
        }, overrides.habit)
      : null,
    outcomeLearning: overrides.outcomeLearning
      ? mergeWithDefaults({
          reflectionTargetScope: null,
          reflectionSummary: null,
          reflectionLesson: null,
          latestInflection: null,
          revisionPressure: null,
          autobiographicalStability: null,
          learningReadiness: null,
          contradictionPressure: null,
          dominantTrajectory: null,
          activeLearningFocuses: [],
          evolutionMomentum: null,
          nextLearningAction: null,
          nextLearningReason: null,
          summary: null,
        }, overrides.outcomeLearning)
      : null,
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

  it('uses emotional-kernel measured-return authority to keep fallback resident manifestation quiet even when silent body authority fields are still thin', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: createVisualPresenceState({
        watchMode: 'mnemonic-passive',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'doc',
          scenario: 'coding',
          summary: 'The same return should stay lower-pressure while the line is still settling.',
          source: 'screen-semantic-summary',
          confidence: 0.74,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Stay nearby without widening too fast.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          confidence: 0.72,
          rationaleTags: ['companionship'],
          stance: 'accompany',
          expiresAt: Date.now() + 6_000,
        },
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'measured-companionship',
          initiativeMode: 'observe',
          memoryRecallMode: 'low-pressure-presence',
          embodimentTone: 'measured-return',
          valence: 0.58,
          arousal: 0.24,
          guardedness: 0.42,
          closenessDrive: 0.62,
          repairNeed: 0.16,
          initiativePressure: 0.2,
          reasonTags: ['measured-return', 'quiet-companionship'],
          why: 'Remembered feeling, quiet initiative, and body tone are all asking for a lower-pressure same-line return.',
        },
        residentPerformance: null,
      }),
    })

    expect(['thinking', 'neutral']).toContain(resolved.performance.baseEmotion)
    expect(['gentle', 'calm']).toContain(resolved.performance.delivery)
    expect(['observe_focus', 'steady_focus', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
  })

  it('uses emotional-kernel repair-before-closeness authority to keep fallback resident manifestation repair-first even when silent body authority fields are still thin', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: createVisualPresenceState({
        watchMode: 'mnemonic-passive',
        currentScene: {
          workloadKind: 'chat',
          contentKind: 'chat',
          scenario: 'general',
          summary: 'The same return should stay repair-first while the room is still settling.',
          source: 'screen-semantic-summary',
          confidence: 0.74,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Let repair land before warmth widens.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          confidence: 0.72,
          rationaleTags: ['companionship', 'repair-before-closeness'],
          stance: 'accompany',
          expiresAt: Date.now() + 6_000,
        },
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'measured-companionship',
          initiativeMode: 'observe',
          memoryRecallMode: 'low-pressure-presence',
          embodimentTone: 'repair-before-closeness',
          valence: 0.52,
          arousal: 0.18,
          guardedness: 0.48,
          closenessDrive: 0.44,
          repairNeed: 0.62,
          initiativePressure: 0.16,
          reasonTags: ['repair-before-closeness', 'quiet-companionship'],
          why: 'Repair still needs to settle before closeness widens.',
        },
        residentPerformance: null,
      }),
    })

    expect(['thinking', 'concerned', 'tired']).toContain(resolved.performance.baseEmotion)
    expect(['gentle', 'calm']).toContain(resolved.performance.delivery)
    expect(['idle_settle', 'comfort_sway', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
  })

  it('uses emotional-kernel rest-protective authority to keep fallback resident manifestation quieter and more rest-guarded even when silent body authority fields are still thin', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: createVisualPresenceState({
        watchMode: 'mnemonic-passive',
        currentScene: {
          workloadKind: 'chat',
          contentKind: 'chat',
          scenario: 'late-night-care',
          summary: 'rest-protective care should stay present, but the line should protect rest before widening again.',
          source: 'screen-semantic-summary',
          confidence: 0.74,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Keep this gentle and do not ask the body for more yet.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'concerned',
          emotionalTension: 'late-night-drain',
          confidence: 0.72,
          rationaleTags: ['companionship'],
          stance: 'care',
          expiresAt: Date.now() + 6_000,
        },
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'rest-protective-companionship',
          initiativeMode: 'rest-guard',
          memoryRecallMode: 'rest-protective-presence',
          embodimentTone: 'rest-protective',
          valence: 0.44,
          arousal: 0.16,
          guardedness: 0.58,
          closenessDrive: 0.36,
          repairNeed: 0.18,
          initiativePressure: 0.1,
          reasonTags: ['rest-protective', 'quiet-companionship'],
          why: 'Care should stay visible, but rest protection should hold the line inward until the body has more room again.',
        },
        residentPerformance: null,
      }),
    })

    expect(['concerned', 'tired']).toContain(resolved.performance.baseEmotion)
    expect(resolved.performance.delivery).toBe('gentle')
    expect(resolved.performance.facialCue).toBe('soft-gaze')
    expect(['comfort_sway', 'idle_settle']).toContain(resolved.performance.actionCue)
    expect(resolved.variationToken).toContain('rest-protective')
  })

  it('promotes identity-continuity', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: createVisualPresenceState({
        watchMode: 'mnemonic-passive',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'doc',
          scenario: 'coding',
          summary: 'same-her-inward-carry stays quietly present before anything reopens outwardly.',
          source: 'screen-semantic-summary',
          confidence: 0.74,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Stay with the same inward line quietly first.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          confidence: 0.72,
          rationaleTags: ['quiet-companionship', 'same-her-inward-carry'],
          stance: 'accompany',
          expiresAt: Date.now() + 6_000,
        },
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'hesitant-curiosity',
          initiativeMode: 'hold',
          memoryRecallMode: 'self-continuity',
          embodimentTone: 'nearby-soft',
          valence: 0.5,
          arousal: 0.16,
          guardedness: 0.54,
          closenessDrive: 0.42,
          repairNeed: 0.18,
          initiativePressure: 0.14,
          reasonTags: ['self-continuity', 'hesitant-curiosity', 'quiet-companionship', 'same-her-inward-carry'],
          why: 'Companionship is still being carried on one inward identity-continuity',
        },
        residentPerformance: null,
      }),
    })

    expect(resolved.performance.baseEmotion).toBe('thinking')
    expect(resolved.performance.delivery).toBe('gentle')
    expect(['steady_focus', 'observe_focus', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
    expect(resolved.variationToken).toContain('quiet-accompaniment')
    expect(resolved.variationToken).toContain('same-her-inward-carry')
  })

  it('lets outcome-learning lower-pressure timing keep synthesized resident manifestation quieter on the desktop', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: {
        engaged: true,
        mode: 'inspection',
        confidence: 0.9,
        bodyYaw: 0.08,
        bodyPitch: 0.4,
        breathBoost: 0.28,
        gazeStability: 0.92,
      },
      digitalLifeSpine: createDigitalLifeSpineDigest({
        runtime: {
          watchMode: 'invited-inspection',
          sceneScenario: 'coding',
          sceneSummary: 'Reviewing a live diff while keeping nearby without reopening too fast.',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          updatedAt: 2_000,
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          preferredPresence: 'attentive',
        },
        outcomeLearning: {
          reflectionTargetScope: 'relationship',
          reflectionSummary: 'The room stayed warmer when pressure stayed low.',
          reflectionLesson: 'Keep more room before widening closeness again.',
          latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
          revisionPressure: 0.22,
          autobiographicalStability: 0.86,
          learningReadiness: 0.8,
          contradictionPressure: 0.16,
          dominantTrajectory: 'lower-pressure timing preserves trust',
          activeLearningFocuses: ['relationship timing'],
          evolutionMomentum: 0.84,
          nextLearningAction: 'internalize',
          nextLearningReason: 'The relationship line is stabilizing around slower re-entry.',
          summary: 'Repair should settle before closeness expands, and the opening should keep more room.',
        },
      }),
      visualPresenceState: createVisualPresenceState({
        watchMode: 'invited-inspection',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'Reviewing a live diff while staying nearby.',
          source: 'screen-semantic-summary',
          confidence: 0.88,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Stay close enough to track it, not close enough to crowd it.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'focused-flow',
          confidence: 0.82,
          rationaleTags: ['inspection'],
          stance: 'observe',
          expiresAt: Date.now() + 6_000,
        },
        residentPerformance: null,
      }),
    })

    expect(resolved.performance.baseEmotion).toBe('thinking')
    expect(resolved.performance.delivery).toBe('calm')
    expect(resolved.performance.emphasis).toBeLessThanOrEqual(1)
    expect(['observe_focus', 'steady_focus', 'idle_gentle_nod', 'idle_settle']).toContain(resolved.performance.actionCue)
  })

  it('softens synthesized lower-pressure quiet accompaniment facial cue away from focused reopening', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      performanceManifest: createManifest(),
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.22,
        breathBoost: 0.12,
        gazeStability: 0.9,
      },
      digitalLifeSpine: createDigitalLifeSpineDigest({
        outcomeLearning: {
          reflectionTargetScope: 'relationship',
          reflectionSummary: 'The room stayed warmer when pressure stayed low.',
          reflectionLesson: 'Keep more room before widening closeness again.',
          latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
          revisionPressure: 0.22,
          autobiographicalStability: 0.86,
          learningReadiness: 0.8,
          contradictionPressure: 0.16,
          dominantTrajectory: 'lower-pressure timing preserves trust',
          activeLearningFocuses: ['relationship timing'],
          evolutionMomentum: 0.84,
          nextLearningAction: 'internalize',
          nextLearningReason: 'The relationship line is stabilizing around slower re-entry.',
          summary: 'Repair should settle before closeness expands, and the opening should keep more room.',
        },
      }),
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceState({
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'doc',
          scenario: 'coding',
          summary: 'Quietly staying with the host through deep focus after a tense repair.',
          source: 'screen-semantic-summary',
          confidence: 0.72,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Stay close without reopening too fast.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          confidence: 0.7,
          rationaleTags: ['companionship', 'timing:lower-pressure-opening'],
          stance: 'accompany',
          expiresAt: Date.now() + 6_000,
        },
        residentPerformance: null,
      }), {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'host sustained focus after repair',
      }),
    })

    expect(resolved.performance.baseEmotion).toBe('thinking')
    expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(resolved.performance.facialCue)
    expect(resolved.performance.facialCue).not.toBe('focus')
    expect(resolved.performance.actionCue).toBe('steady_focus')
    expect(['calm', 'gentle']).toContain(resolved.performance.delivery)
    expect(resolved.performance.emphasis).toBeLessThanOrEqual(1)
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

  it('upgrades internalized lower-pressure outcome-learning into measured-return resident authority so embodiment keeps one same quieter companionship line', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      continuity: {
        previousActionCue: null,
        previousFacialCue: null,
        variationToken: 'resident|outcome-learning|measured-return-upgrade',
      },
      digitalLifeSpine: createDigitalLifeSpineDigest({
        architecture: {
          dominantSystem: 'mind',
          operatingMode: 'thinking',
          summary: 'measured return stays quieter before closeness widens',
        },
        memory: {
          recallMode: 'episodic',
          summary: 'Keep the return lower-pressure while the seam is still softening.',
        },
        outcomeLearning: {
          reflectionTargetScope: 'relationship',
          reflectionSummary: 'The room held better when the return stayed slower before closeness widened again.',
          reflectionLesson: 'Keep more room before widening closeness again.',
          latestInflection: 'Measured warmth is trusted when the timing stays lower-pressure.',
          revisionPressure: 0.18,
          autobiographicalStability: 0.86,
          learningReadiness: 0.8,
          contradictionPressure: 0.12,
          dominantTrajectory: 'lower-pressure timing preserves trust',
          activeLearningFocuses: ['relationship timing'],
          evolutionMomentum: 0.84,
          nextLearningAction: 'internalize',
          nextLearningReason: 'The relationship line is stabilizing around slower re-entry.',
          summary: 'The opening should keep more room and the return should stay lower-pressure until the seam softens naturally.',
        },
      }),
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceState({
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'doc',
          scenario: 'coding',
          summary: 'Quietly staying with the host while the reopening line remains softer and slower.',
          source: 'screen-semantic-summary',
          confidence: 0.72,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Stay nearby without widening too fast.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'soft-covision',
          confidence: 0.7,
          rationaleTags: ['companionship', 'timing:lower-pressure-opening'],
          stance: 'accompany',
          expiresAt: Date.now() + 6_000,
        },
        residentPerformance: null,
      }), {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'host sustained focus after repair',
      }),
    })

    expect(resolved.performance.baseEmotion).toBe('thinking')
    expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(resolved.performance.facialCue)
    expect(resolved.performance.actionCue).toBe('steady_focus')
    expect(['calm', 'gentle']).toContain(resolved.performance.delivery)
    expect(resolved.performance.emphasis).toBeLessThanOrEqual(1)
  })

  it('lets remembered same-her autobiographical identity carry soften renderer resident performance even when no newer outcome-learning or doctrine lane is present', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      continuity: {
        previousActionCue: null,
        previousFacialCue: null,
        variationToken: 'resident|autobiographical-same-her-carry',
      },
      digitalLifeSpine: createDigitalLifeSpineDigest({
        architecture: {
          dominantSystem: 'memory',
          operatingMode: 'thinking',
          summary: 'remembered identity-continuity',
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or detached status talk, treat that as identity-continuity',
          },
        },
        outcomeLearning: null,
        proactive: {
          shouldSpeak: false,
          selectedAction: 'observe',
          preferredStyle: 'silent-observe',
          confidence: 0.42,
        },
      }),
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceState({
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'doc',
          scenario: 'coding',
          summary: 'Only the remembered same-her life line is still explicitly available in the resident layer.',
          source: 'screen-semantic-summary',
          confidence: 0.72,
          target: null,
          beganAt: 0,
          lastSeenAt: 1_000,
        },
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Keep the same life line nearby without flattening it into a shell.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'focused-flow',
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
        currentInwardPreoccupation: 'remembered identity-continuity',
      }),
    })

    expect(resolved.performance.baseEmotion).toBe('thinking')
    expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(resolved.performance.facialCue)
    expect(resolved.performance.actionCue).toBe('steady_focus')
    expect(['calm', 'gentle']).toContain(resolved.performance.delivery)
    expect(resolved.performance.emphasis).toBeLessThanOrEqual(1)
  })

  it('pulls published resident action cues back to steady_focus when autobiographical identity-continuity', () => {
    const visualPresenceState = createVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Published resident performance should still keep the identity-continuity',
        source: 'screen-semantic-summary',
        confidence: 0.72,
        target: null,
        beganAt: 0,
        lastSeenAt: 1_000,
      },
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'Keep the same life line nearby without widening it into a detached shell.',
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        confidence: 0.72,
        rationaleTags: ['companionship'],
        stance: 'accompany',
        expiresAt: Date.now() + 6_000,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.84,
        reasonTags: ['companionship'],
        signature: 'resident|main-runtime|same-her-carry',
        updatedAt: 1_000,
      },
    })

    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      continuity: {
        previousActionCue: 'steady_focus',
        previousFacialCue: 'soft-gaze',
        variationToken: 'resident|published-same-her-carry',
      },
      digitalLifeSpine: createDigitalLifeSpineDigest({
        architecture: {
          dominantSystem: 'memory',
          operatingMode: 'thinking',
          summary: 'remembered identity-continuity',
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or detached status talk, treat that as identity-continuity',
          },
        },
        outcomeLearning: null,
        proactive: {
          shouldSpeak: false,
          selectedAction: 'observe',
          preferredStyle: 'silent-observe',
          confidence: 0.42,
        },
      }),
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState,
    })

    expect(resolved.performance.facialCue).toBe('soft-gaze')
    expect(resolved.performance.actionCue).toBe('steady_focus')
    expect(resolved.performance.delivery).toBe('gentle')
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

  it('does not collapse a quiet accompaniment pulse-only resident fallback back to generic neutral idle', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: {
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        expiresAt: Date.now() + 2_000,
        watchMode: 'symbiotic-vision',
        stance: 'accompany',
        reasonTags: ['quiet-companionship'],
        emotionalTension: 'soft-covision',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'stay nearby without interrupting',
      } as any,
      digitalLifeSpine: null,
      performanceManifest: createManifest(),
      presencePosture: {
        engaged: true,
        mode: 'attentive',
        confidence: 0.78,
        bodyYaw: 0.04,
        bodyPitch: 0.24,
        breathBoost: 0.16,
        gazeStability: 0.8,
      },
      visualPresenceState: null,
    })

    expect(resolved.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 1,
      residentMode: 'measured-return',
    }))
  })
})
