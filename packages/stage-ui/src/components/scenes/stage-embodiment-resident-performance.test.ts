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

import {
  resolveResidentSnapshot,
  resolveStageEmbodimentResidentPerformance,
} from './stage-embodiment-resident-performance'

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

  it('does not let fallback audit tags or emotional-kernel labels rewrite resident performance', () => {
    const resolve = (auditFields: {
      emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
      emotionalTension?: string
      rationaleTags?: string[]
    }) => {
      const input = {
        activePresence: null,
        performanceManifest: createManifest(),
        presencePosture: null,
        visualPresenceState: createVisualPresenceState({
          watchMode: 'invited-inspection',
          currentScene: {
            workloadKind: 'coding',
            contentKind: 'diff',
            scenario: 'coding',
            summary: 'Inspecting a runtime diff.',
            source: 'screen-semantic-summary',
            confidence: 0.74,
            target: null,
            beganAt: 0,
            lastSeenAt: 1_000,
          },
          privateThought: {
            shouldSpeak: false,
            thoughtText: 'Inspect the current diff.',
            suggestedStyle: 'silent-observe',
            embodiedPresence: 'attentive',
            emotionalTension: auditFields.emotionalTension ?? 'focused-flow',
            confidence: 0.72,
            rationaleTags: auditFields.rationaleTags ?? ['inspection'],
            stance: 'observe',
            expiresAt: Date.now() + 6_000,
          },
          emotionalKernel: auditFields.emotionalKernel ?? null,
          residentPerformance: null,
        }),
      }
      return {
        ...resolveStageEmbodimentResidentPerformance(input),
        reasonTags: resolveResidentSnapshot(input).reasonTags,
      }
    }

    const baseline = resolve({})
    const audited = resolve({
      rationaleTags: [
        'repair-before-closeness',
        'rest-protective',
        'measured-return',
        'timing:lower-pressure-opening',
      ],
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'rest-protective',
        valence: 0.44,
        arousal: 0.16,
        guardedness: 0.58,
        closenessDrive: 0.36,
        repairNeed: 0.18,
        initiativePressure: 0.1,
        reasonTags: ['repair-before-closeness', 'rest-protective', 'measured-return'],
        why: 'Audit-only labels must not become renderer authority.',
      },
    })

    expect(audited.performance).toEqual(baseline.performance)
    expect(audited.reasonTags).toEqual(baseline.reasonTags)
  })

  it('does not let digital-life spine prose synthesize resident authority without a published snapshot', () => {
    const resolve = (identityNarrative: string, outcomeSummary: string) => resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      digitalLifeSpine: createDigitalLifeSpineDigest({
        runtime: {
          watchMode: 'mnemonic-passive',
          preferredPresence: 'attentive',
          selectedAction: 'observe',
          updatedAt: 2_000,
        },
        proactive: {
          selectedAction: 'observe',
          preferredStyle: 'silent-observe',
          confidence: 0.72,
          shouldSpeak: false,
          preferredPresence: 'attentive',
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative,
          },
        },
        outcomeLearning: {
          reflectionTargetScope: 'relationship',
          reflectionSummary: outcomeSummary,
          reflectionLesson: null,
          latestInflection: outcomeSummary,
          revisionPressure: 0.18,
          autobiographicalStability: 0.86,
          learningReadiness: 0.8,
          contradictionPressure: 0.12,
          dominantTrajectory: outcomeSummary,
          activeLearningFocuses: [],
          evolutionMomentum: 0.84,
          nextLearningAction: 'internalize',
          nextLearningReason: null,
          summary: outcomeSummary,
        },
      }),
      performanceManifest: createManifest(),
      presencePosture: null,
      visualPresenceState: withSilentPresenceAuthority(createVisualPresenceState({
        watchMode: 'mnemonic-passive',
        privateThought: {
          shouldSpeak: false,
          thoughtText: 'Inspect the current state.',
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          emotionalTension: 'focused-flow',
          confidence: 0.72,
          rationaleTags: ['inspection'],
          stance: 'observe',
          expiresAt: Date.now() + 6_000,
        },
        residentPerformance: null,
      }), {
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'inspect the current state',
      }),
    })

    const baseline = resolve('A personal note without renderer instructions.', 'A reviewed outcome note.')
    const audited = resolve(
      'Continuity drift risk: avoid a generic assistant shell and preserve the continuity line.',
      'Keep the return lower-pressure and repair-first before closeness expands.',
    )

    expect(audited.performance).toEqual(baseline.performance)
  })

  it('derives fallback performance from structured digital-life spine fields', () => {
    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      digitalLifeSpine: createDigitalLifeSpineDigest({
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          preferredPresence: 'attentive',
          selectedAction: 'warn',
          updatedAt: 2_000,
        },
        architecture: {
          operatingMode: 'thinking',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'warn',
          preferredStyle: 'firm-warning',
          confidence: 0.9,
          shouldSpeak: false,
          preferredPresence: 'attentive',
        },
      }),
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
    expect(resolved.variationToken).toContain('warn')
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

  it('ignores legacy resident modes in an otherwise identical published performance snapshot', () => {
    const resolve = (residentMode: 'measured-return' | 'repair-before-closeness' | 'same-thread-continuation' | null) => {
      const residentPerformance = createSilentResidentPerformanceSnapshot('accompanying')
      residentPerformance.performance = {
        ...residentPerformance.performance,
        facialCue: null,
        actionCue: null,
        residentMode,
        face: residentMode ? { residentMode } : null,
        action: residentMode ? { residentMode } : null,
      }

      return resolveStageEmbodimentResidentPerformance({
        activePresence: null,
        performanceManifest: createManifest(),
        presencePosture: null,
        visualPresenceState: createVisualPresenceState({
          residentPerformance,
        }),
      }).performance
    }

    const baseline = resolve(null)

    expect(resolve('measured-return')).toEqual(baseline)
    expect(resolve('repair-before-closeness')).toEqual(baseline)
    expect(resolve('same-thread-continuation')).toEqual(baseline)
  })

  it('keeps published resident cues authoritative when autobiographical prose contains legacy continuity phrases', () => {
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
        signature: 'resident|main-runtime|continuity-carry',
        updatedAt: 1_000,
      },
    })

    const resolved = resolveStageEmbodimentResidentPerformance({
      activePresence: null,
      continuity: {
        previousActionCue: 'steady_focus',
        previousFacialCue: 'soft-gaze',
        variationToken: 'resident|published-continuity-carry',
      },
      digitalLifeSpine: createDigitalLifeSpineDigest({
        architecture: {
          dominantSystem: 'memory',
          operatingMode: 'thinking',
          summary: 'remembered identity-continuity',
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'Remembered continuity drift risk: if this slips into a generic assistant shell or detached status talk, treat that as identity-continuity',
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

    expect(resolved.performance.facialCue).toBe('focus')
    expect(resolved.performance.actionCue).toBe('observe_focus')
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
      emphasis: 0,
      residentMode: 'quiet-accompaniment',
    }))
  })
})
