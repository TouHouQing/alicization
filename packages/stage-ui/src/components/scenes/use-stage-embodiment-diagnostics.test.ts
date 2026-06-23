import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationRuntimeDigest,
} from '@proj-alicization/stage-shared'

import type { Live2DRuntimeCapabilitySnapshot } from '../../../../stage-ui-live2d/src/composables/live2d/expression-runtime'
import type { VrmResolvedRuntimeCapabilitySnapshot } from '../../../../stage-ui-three/src/composables/vrm/capabilities'
import type { VrmExecutionDiagnosticsSnapshot } from '../../../../stage-ui-three/src/composables/vrm/execution-diagnostics'
import type { EmbodimentPlaybackTelemetry } from '../../services/embodiment/playback-reconciler'

import {

  createIdleStageEmbodimentPerformanceState,
  createIdleStageEmbodimentPresencePostureState,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { buildStageEmbodimentLoopSurfaceSummary } from './stage-embodiment-diagnostics-overlay-summary'
import { useStageEmbodimentDiagnostics } from './use-stage-embodiment-diagnostics'

function createPlaybackTelemetryFixture(overrides: Partial<EmbodimentPlaybackTelemetry> = {}): EmbodimentPlaybackTelemetry {
  const baseDrivers: EmbodimentPlaybackTelemetry['drivers'] = {
    body: null,
    face: null,
    lipsync: null,
    motion: null,
    voice: null,
  }

  const mergedLipsync = overrides.drivers?.lipsync
    ? {
        ...overrides.drivers.lipsync,
        continuityHoldMs: overrides.drivers.lipsync.continuityHoldMs ?? 0,
        visemeHints: overrides.drivers.lipsync.visemeHints ?? [],
      }
    : overrides.drivers?.lipsync ?? null

  return {
    actualDurationMs: 0,
    plannedDurationMs: 0,
    driftMs: 0,
    settleMs: 0,
    stopReason: null,
    rendererTarget: null,
    driverAuthority: null,
    prosodyAuthority: null,
    cue: null,
    ...overrides,
    drivers: {
      ...baseDrivers,
      ...overrides.drivers,
      lipsync: mergedLipsync,
      voice: null,
    },
  }
}

function createDigitalLifeSpineDigest(input: {
  confidence?: number
  dominantSystem: NonNullable<AlicizationDigitalLifeSpineDigest['architecture']>['dominantSystem']
  operatingMode: NonNullable<AlicizationDigitalLifeSpineDigest['architecture']>['operatingMode']
  manifestationCadenceSummary?: string | null
  openingGuidance?: string | null
  recallMode?: string
  watchMode?: string
}): AlicizationDigitalLifeSpineDigest {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: input.watchMode ?? 'symbiotic-vision',
      sceneScenario: 'coding',
      sceneSummary: 'runtime focus',
      activeThreadId: 'thread-1',
      activeThreadTitle: 'runtime',
      dominantMode: 'thinking',
      dominantDrive: 'stabilize',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
      selectedAction: 'warn',
      updatedAt: 1_000,
    },
    architecture: {
      operatingMode: input.operatingMode,
      dominantSystem: input.dominantSystem,
      supportingSystems: ['dialogue'],
      governingFocus: 'runtime coherence',
      summary: 'runtime coherence',
    },
    continuitySignal: null,
    proactive: {
      selectedAction: 'warn',
      preferredStyle: 'firm-warning',
      confidence: input.confidence ?? 0.8,
      shouldSpeak: false,
      activeThreadId: 'thread-1',
      activeThreadTitle: 'runtime',
      dominantConcernKind: null,
      dominantConcernSummary: null,
      leadingGoalId: null,
      leadingGoalSummary: null,
      preferredPresence: 'attentive',
      personaBias: {
        relationshipPosture: 'companion',
        initiativeStyle: 'measured-approach',
        silenceReconnect: 'light-probe',
        comfortStyle: 'gentle-care',
        preferredProactiveStyle: 'firm-warning',
        manifestationCadenceSummary: input.manifestationCadenceSummary ?? null,
        openingGuidance: input.openingGuidance ?? null,
        whySummary: null,
      },
    },
    memory: {
      summary: null,
      recentEpisodeSummary: null,
      recentEpisodeCount: 0,
      focusBeliefStatement: null,
      focusBeliefConfidence: null,
      leadingGoalSummary: null,
      dominantConcernSummary: null,
      reflectionSummary: null,
      reflectionPressure: null,
      recallMode: input.recallMode ?? 'working-memory',
      recallSeed: null,
      thoughtThreadSummary: null,
    },
  }
}

describe('stage embodiment diagnostics', () => {
  it('exposes latest Alicization runtime digest fields in diagnostics snapshot', () => {
    const now = Date.now()
    const { snapshot } = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 1280,
        plannedDurationMs: 900,
        driftMs: 380,
        settleMs: 560,
        stopReason: 'ended',
        driverAuthority: {
          segmentId: 'segment-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'happy',
            facialCue: 'smile',
            intensity: 0.8,
            holdMs: 360,
            preUtteranceCue: 'soft-breath',
            postUtteranceCue: 'settle-smile',
            segmentId: 'segment-1',
            source: 'prosody-authority',
            confidence: 0.94,
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'idle',
            segmentId: 'segment-1',
            continuityHoldMs: 0,
            visemeHints: [],
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'wave',
            intensity: 0.7,
            holdMs: 320,
            segmentId: 'segment-1',
            source: 'timeline-projection',
            confidence: 0.88,
          },
          voice: null,
        },
      })),
      runtimeDigest: ref({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.67,
        companionshipPressure: 0.81,
        channels: [
          {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.9,
            focus: 'stay with current thread',
            summary: 'active dialogue lane is hot',
          },
        ],
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: now - 80,
          summary: 'runtime memory closure identity is driving embodiment diagnostics',
          embodimentContinuityLedger: {
            version: 'embodiment-continuity-ledger-v1',
            createdAt: now - 80,
            turnId: 'turn-runtime-diagnostics-memory-identity',
            carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            droppedLanes: [],
            rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            pendingRejoinLanes: [],
            continuityPhase: 'fully-rejoined',
            memoryWriteback: {
              shouldWrite: false,
              lane: 'none',
              reason: 'memory identity already comes from closure causality',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              domain: 'dialogue-style',
              reasonCodes: [],
              summary: null,
            },
            traceSummary: 'same corrected callback memory drives embodiment diagnostics',
            replayLine: 'body line follows the corrected callback memory',
            sourceTags: ['memory-closure-causality'],
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'embodiment',
              causedByMemoryClosure: true,
              traceAuthority: 'runtime-memory-closure-trace',
              reasonTags: ['memory-closure-trace:next-influence'],
              memoryIdentity: {
                selectedCandidateIds: ['memory-candidate-corrected-callback'],
                continuityKey: 'corrected-callback-memory-runtime-reconsolidation',
                reasonTags: ['memory-identity:corrected-callback-memory-runtime-reconsolidation'],
              },
              summary: 'same corrected callback memory drives embodiment diagnostics',
            },
          },
        },
        summary: 'active-dialogue=hot | continuity=0.67 | companionship=0.81',
      } as unknown as AlicizationRuntimeDigest),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 1280, height: 720 }),
      targetPoint: ref({ x: 640, y: 360 }),
      visualPresenceState: ref({
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 0,
        currentInwardPreoccupation: null,
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          source: 'screen-semantic-summary',
          confidence: 0.82,
          summary: 'inspecting current diff',
          target: {
            appName: 'Visual Studio Code',
            title: 'runtime.ts',
          },
          beganAt: now - 3_000,
          lastSeenAt: now - 120,
        },
        attention: {
          target: {
            appName: 'Visual Studio Code',
            title: 'runtime.ts',
          },
          source: 'current-grounded-scene',
          confidence: 0.76,
          engagedAt: now - 2_500,
          lastConfirmedAt: now - 120,
          dwellMs: 2_380,
        },
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'observe',
          confidence: 0.68,
          rationaleTags: ['scene:diff'],
          thoughtText: 'Stay with this diff line.',
          shouldSpeak: true,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          expiresAt: now + 8_000,
          emotionalTension: 'focused-flow',
        },
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      }),
    })

    expect(snapshot.value.visualPresence.runtimeDominantChannel).toBe('active-dialogue')
    expect(snapshot.value.visualPresence.runtimeShouldSpeak).toBe(true)
    expect(snapshot.value.visualPresence.runtimeShouldAct).toBe(false)
    expect(snapshot.value.visualPresence.runtimeContinuityPressure).toBeCloseTo(0.67)
    expect(snapshot.value.visualPresence.runtimeCompanionshipPressure).toBeCloseTo(0.81)
    expect(snapshot.value.visualPresence.runtimeSummary).toContain('active-dialogue=hot')
    expect(snapshot.value.visualPresence.runtimeMemoryClosureIdentityKey).toBe('corrected-callback-memory-runtime-reconsolidation')
    expect(snapshot.value.performance.runtimeDynamics.provenance.runtimeMemoryClosureIdentityKey).toBe('corrected-callback-memory-runtime-reconsolidation')
    expect(snapshot.value.speech.playbackTelemetry).toEqual({
      actualDurationMs: 1280,
      plannedDurationMs: 900,
      driftMs: 380,
      settleMs: 560,
      stopReason: 'ended',
      rendererTarget: null,
      driverAuthority: {
        segmentId: 'segment-1',
        rendererTarget: 'live2d',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      prosodyAuthority: null,
      cue: null,
      drivers: {
        body: null,
        face: {
          emotion: 'happy',
          facialCue: 'smile',
          intensity: 0.8,
          holdMs: 360,
          preUtteranceCue: 'soft-breath',
          postUtteranceCue: 'settle-smile',
          segmentId: 'segment-1',
          source: 'prosody-authority',
          confidence: 0.94,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-1',
          continuityHoldMs: 0,
          visemeHints: [],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'wave',
          intensity: 0.7,
          holdMs: 320,
          segmentId: 'segment-1',
          source: 'timeline-projection',
          confidence: 0.88,
        },
        voice: null,
      },
    })
  })

  it('falls back to null Alicization diagnostics fields when runtime digest is absent', () => {
    const { snapshot } = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(null),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      visualPresenceState: ref(null),
    })

    expect(snapshot.value.visualPresence.runtimeDominantChannel).toBeNull()
    expect(snapshot.value.visualPresence.runtimeShouldSpeak).toBeNull()
    expect(snapshot.value.visualPresence.runtimeShouldAct).toBeNull()
    expect(snapshot.value.visualPresence.runtimeContinuityPressure).toBeNull()
    expect(snapshot.value.visualPresence.runtimeCompanionshipPressure).toBeNull()
    expect(snapshot.value.visualPresence.runtimeSummary).toBeNull()
    expect(snapshot.value.speech.articulation).toBeNull()
    expect(snapshot.value.speech.playbackTelemetry).toBeNull()
    expect(snapshot.value.speech.driverSummary).toBeNull()
    expect(snapshot.value.speech.live2dExecution).toBeNull()
  })

  it('surfaces live2d execution diagnostics alongside playback telemetry', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      live2dExecutionDiagnostics: ref({
        activeExpression: {
          name: 'CalmInspect',
          reason: 'preferred',
          score: 11.4,
          segmentId: 'segment-zh-focus-1',
        },
        activeLipSync: null,
        activeMotion: {
          group: 'ObserveSoft',
          index: 1,
          segmentId: null,
        },
        activeBody: null,
        activeVoice: null,
        cue: {
          emotion: 'thinking',
          facialCue: 'focus',
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: [],
          residentMode: null,
          preferredBlinkCadence: null,
          preferredGazeMode: null,
          preferredPauseMode: null,
          preferredLipsyncMode: null,
          preferredVoiceMode: null,
          preferredPacingMode: null,
          reasonTags: [],
          signature: null,
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 440,
        },
      }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.live2dExecution).toEqual({
      activeBody: null,
      activeExpression: {
        name: 'CalmInspect',
        reason: 'preferred',
        score: 11.4,
        segmentId: 'segment-zh-focus-1',
      },
      activeLipSync: null,
      activeMotion: {
        group: 'ObserveSoft',
        index: 1,
        segmentId: null,
      },
      activeVoice: null,
      cue: {
        emotion: 'thinking',
        facialCue: 'focus',
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: [],
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonTags: [],
        signature: null,
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 440,
      },
    })
    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: {
        predicted: null,
        actual: 'CalmInspect',
        reason: 'runtime-expression',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        bodyDriverSegmentId: null,
        faceDriverCue: null,
        faceDriverSegmentId: null,
        faceDriverSource: null,
        lipsyncDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSegmentId: null,
        motionDriverSource: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        reasonTags: [],
        residentMode: null,
        signature: null,
        voiceDriverSegmentId: null,
      },
      vrm: null,
    })
  })

  it('surfaces vrm execution diagnostics alongside playback telemetry', () => {
    const vrmExecutionDiagnostics: VrmExecutionDiagnosticsSnapshot = {
      activeEmotion: {
        name: 'thinking',
        resolvedExpressionNames: ['calm'],
        segmentId: 'segment-vrm-soft-1',
      },
      activeFacialCue: {
        name: 'soft-gaze',
        affectsMouth: false,
        segmentId: 'segment-vrm-soft-1',
      },
      activeMotion: null,
      activeBody: null,
      activeLipSync: null,
      activeVoice: null,
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['relaxed', 'focus'],
        preferredMotionAliases: [],
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonTags: [],
        signature: null,
        residentMode: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: 360,
      },
    }
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      vrmExecutionDiagnostics: ref(vrmExecutionDiagnostics),
    })

    expect(diagnostics.snapshot.value.speech.vrmExecution).toEqual({
      activeBody: null,
      activeEmotion: {
        name: 'thinking',
        resolvedExpressionNames: ['calm'],
        segmentId: 'segment-vrm-soft-1',
      },
      activeFacialCue: {
        name: 'soft-gaze',
        affectsMouth: false,
        segmentId: 'segment-vrm-soft-1',
      },
      activeLipSync: null,
      activeMotion: null,
      activeVoice: null,
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['relaxed', 'focus'],
        preferredMotionAliases: [],
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonTags: [],
        signature: null,
        residentMode: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: 360,
      },
    })
    expect(diagnostics.snapshot.value.speech.driverSummary).toBeNull()
    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: null,
      vrm: {
        predicted: null,
        actual: 'calm',
        reason: 'runtime-emotion',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        bodyDriverSegmentId: null,
        faceDriverCue: null,
        faceDriverSegmentId: null,
        faceDriverSource: null,
        lipsyncDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSegmentId: null,
        motionDriverSource: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        reasonTags: [],
        residentMode: null,
        signature: null,
        voiceDriverSegmentId: null,
      },
    })
  })

  it('surfaces chinese-first speech style and viseme telemetry for tuning', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 1100,
        plannedDurationMs: 900,
        driftMs: 200,
        settleMs: 420,
        stopReason: 'ended',
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.46,
            holdMs: 420,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            segmentId: 'segment-1',
            source: 'prosody-authority',
            confidence: 0.94,
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-1',
            continuityHoldMs: 0,
            visemeHints: [
              { segmentId: 'segment-1', viseme: 'U', weight: 0.92, source: 'prosody-authority', confidence: 0.89 },
              { segmentId: 'segment-1', viseme: 'closed', weight: 0.58, source: 'prosody-authority', confidence: 0.77 },
            ],
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'idle_gentle_nod',
            intensity: 0.32,
            holdMs: 180,
            segmentId: 'segment-1',
            source: 'timeline-projection',
            confidence: 0.88,
          },
          voice: null,
        },
      })),
      presencePosture: ref({} as any),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        phase: 'playing',
        playbackPhase: 'playing',
        visemeIntensity: 0.71,
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          active: true,
          lipClosure: 0.44,
          visemes: {
            A: 0.66,
            E: 0.24,
            I: 0.18,
            O: 0.08,
            U: 0.12,
            closed: 0.41,
          },
          voice: {
            provider: 'test',
            model: null,
            voiceId: 'crisp-zh',
            voiceName: null,
            language: 'zh-CN',
            gender: null,
            rateMultiplier: 1,
            pitchDelta: 0,
            closureBias: 0.84,
            roundBias: 0.1,
            spreadBias: 0.1,
            jawBias: 0.12,
            consonantPrecision: 0.9,
            vowelLegato: 0.3,
          },
        },
        dynamics: {
          speechEnergy: 0.52,
          prosodyIntensity: 0.64,
          emphasisLevel: 0.58,
          cadencePulse: 0.4,
        },
      }),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.prosodyIntensity).toBeCloseTo(0.64)
    expect(diagnostics.snapshot.value.speech.visemeIntensity).toBeCloseTo(0.71)
    expect(diagnostics.snapshot.value.speech.articulation).not.toBeNull()
    expect(diagnostics.snapshot.value.speech.articulation?.voice?.language).toBe('zh-CN')
    expect(diagnostics.snapshot.value.speech.articulation?.voice?.consonantPrecision).toBeCloseTo(0.9)
    expect(diagnostics.snapshot.value.speech.articulation?.lipClosure).toBeCloseTo(0.44)
    expect(diagnostics.snapshot.value.speech.articulation?.visemes.A).toBeCloseTo(0.66)
    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.drivers?.lipsync?.mode).toBe('energy-phoneme-hybrid')
    expect(diagnostics.snapshot.value.speech.articulationSummary).toEqual({
      voice: 'zh-CN | closure=0.84 | precision=0.90 | provenance=fallback-derived | segment=segment-1 | source=prosody-authority',
      topVisemes: 'A:0.66, closed:0.41, E:0.24',
    })
    expect(diagnostics.snapshot.value.speech.driverSummary).toEqual({
      rendererTarget: null,
      body: null,
      face: {
        cue: 'focused',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-1',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
      motion: {
        cue: 'idle_gentle_nod',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-1',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
      lipsync: {
        cue: 'U',
        source: 'prosody-authority',
        confidence: 0.89,
        segmentId: 'segment-1',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
      voice: 'zh-CN | closure=0.84 | precision=0.90 | provenance=fallback-derived | segment=segment-1 | source=prosody-authority',
      voiceAuthority: {
        cue: null,
        source: 'prosody-authority',
        confidence: null,
        segmentId: 'segment-1',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
      },
    })
    expect(diagnostics.snapshot.value.speech.driverExecutionSummary).toBe(
      'emotion=thinking | cue=focused | intensity=0.46 | hold=420ms | pre=steady-inhale | post=eyes-soften | src=prosody-authority | conf=0.94 | seg=segment-1 | motion=idle_gentle_nod | mode=attentive | idle=idle_settle | intensity=0.32 | hold=180ms | src=timeline-projection | conf=0.88 | seg=segment-1 | lipsync=energy-phoneme-hybrid phase=playing',
    )
    expect(diagnostics.snapshot.value.speech.visemeHintsSummary).toBe('U:0.92@0.89 src=prosody-authority segment=segment-1 | closed:0.58@0.77 src=prosody-authority segment=segment-1')
    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.drivers?.lipsync?.visemeHints).toEqual([
      { segmentId: 'segment-1', viseme: 'U', weight: 0.92, source: 'prosody-authority', confidence: 0.89 },
      { segmentId: 'segment-1', viseme: 'closed', weight: 0.58, source: 'prosody-authority', confidence: 0.77 },
    ])
  })

  it('summarizes chinese segment-2 expression provenance across face motion and lipsync', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        drivers: {
          body: null,
          face: {
            emotion: 'happy',
            facialCue: 'reassure_smile',
            intensity: 0.66,
            holdMs: 420,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            segmentId: 'segment-2',
            source: 'prosody-authority',
            confidence: 0.94,
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-2',
            continuityHoldMs: 0,
            visemeHints: [
              { segmentId: 'segment-2', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
              { segmentId: 'segment-2', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.94 },
            ],
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'idle_gentle_nod',
            intensity: 0.54,
            holdMs: 180,
            segmentId: 'segment-2',
            source: 'timeline-projection',
            confidence: 0.88,
          },
          voice: null,
        },
      })),
      presencePosture: ref({} as any),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        phase: 'playing',
        playbackPhase: 'playing',
        visemeIntensity: 0.66,
        articulation: createIdleStageEmbodimentSpeechArticulationState(),
        dynamics: {
          speechEnergy: 0.44,
          prosodyIntensity: 0.52,
          emphasisLevel: 0.36,
          cadencePulse: 0.58,
        },
      }),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })
    const playbackTelemetry = diagnostics.snapshot.value.speech.playbackTelemetry

    expect(playbackTelemetry).not.toBeNull()
    if (!playbackTelemetry)
      throw new Error('expected playback telemetry')

    expect(playbackTelemetry.drivers?.face).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(playbackTelemetry.drivers?.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(playbackTelemetry.drivers?.lipsync?.visemeHints).toEqual([
      { segmentId: 'segment-2', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-2', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.94 },
    ])
    expect(diagnostics.snapshot.value.speech.driverSummary).toEqual({
      rendererTarget: null,
      body: null,
      face: {
        cue: 'reassure_smile',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-2',
        emotion: 'happy',
        intensity: 0.66,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
      motion: {
        cue: 'idle_gentle_nod',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-2',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.54,
        holdMs: 180,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
      lipsync: {
        cue: 'I',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-2',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
    })
  })

  it('surfaces playback cue renderer authority in diagnostics snapshot telemetry', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 280,
        stopReason: null,
        rendererTarget: 'vrm',
        cue: {
          id: 'segment-explicit-playback-cue-metadata',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '继续看这里。',
          emotion: 'thinking',
          gestureWeight: 0.34,
          facialWeight: 0.52,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.28,
          headWeight: 0.32,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          actionCue: 'observe_focus',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
        },
        drivers: {
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-explicit-playback-cue-metadata',
            source: 'prosody-authority',
            confidence: 0.94,
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 240,
            segmentId: 'segment-explicit-playback-cue-metadata',
            source: 'timeline-projection',
            confidence: 0.88,
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-explicit-playback-cue-metadata',
            visemeHints: [
              { segmentId: 'segment-explicit-playback-cue-metadata', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            ],
          },
          voice: null,
        },
        prosodyAuthority: {
          segmentId: 'segment-explicit-playback-cue-metadata',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.36,
          cueMouthWeight: 0.28,
          cueHeadWeight: 0.32,
          visemePeakWeight: 0.35,
        },
      } as any)),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.cue).toEqual({
      id: 'segment-explicit-playback-cue-metadata',
      text: '继续看这里。',
      emotion: 'thinking',
      prosodyWeight: 0.36,
      mouthWeight: 0.28,
      headWeight: 0.32,
      personaStyleSummary: null,
      facialHoldMs: 320,
      actionHoldMs: 240,
      emotionHoldMs: 320,
      facialCue: 'focused',
      actionCue: 'observe_focus',
      actionWindow: 'segment-start',
      interruptMode: 'soft-interrupt',
      settleMode: null,
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        residentMode: null,
      },
      rendererSettle: {
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 440,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })
    expect((diagnostics.snapshot.value.speech.playbackTelemetry as any)?.prosodyAuthority).toEqual({
      segmentId: 'segment-explicit-playback-cue-metadata',
      provenance: 'authority-bound',
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid',
      cueProsodyWeight: 0.36,
      cueMouthWeight: 0.28,
      cueHeadWeight: 0.32,
      visemePeakWeight: 0.35,
    })
    expect(diagnostics.snapshot.value.speech.authoritySummary).toEqual({
      cueId: 'segment-explicit-playback-cue-metadata',
      segmentId: null,
      rendererTarget: 'vrm',
      matchedDrivers: ['voice'],
      matchedSources: [],
      bindingSummary: 'target=vrm | drivers=voice | sources=n/a | matches=body:n/a face:n/a motion:n/a lipsync:n/a voice:yes | lane=voice-only',
      matchSummary: 'body:n/a face:n/a motion:n/a lipsync:n/a voice:yes',
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      authorityMismatchDisplay: null,
      settleSummary: 'fallback-derived | segment=n/a | target=vrm | drivers=voice | sources=n/a | lane=voice-only | live2dFace=320ms | live2dMotion=440ms | vrmExpr=360ms | vrmAction=280ms',
    })
    expect(diagnostics.snapshot.value.speech.cueMicroSummary).toEqual({
      cueId: 'segment-explicit-playback-cue-metadata',
      cueText: '继续看这里。',
      cue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=fallback-derived segment=segment-explicit-playback-cue-metadata',
      personaStyle: null,
      timing: 'facial=320 action=240 emotion=320 | segment-start | soft-interrupt | n/a',
    })
  })

  it('annotates persona style summary with authority provenance and scoped segment for structured playback cues', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-zh-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-zh-1',
          index: 0,
          text: '继续看这里。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.28,
          headWeight: 0.32,
          gestureWeight: 0.32,
          facialWeight: 0.36,
          personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 360,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
          rendererHints: null,
          rendererSettle: null,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: null,
          voice: null,
        },
      })),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.cueMicroSummary).toEqual({
      cueId: 'segment-zh-1',
      cueText: '继续看这里。',
      cue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=authority-bound segment=segment-zh-1',
      personaStyle: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08 provenance=authority-bound segment=segment-zh-1',
      timing: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
    })
  })

  it('surfaces playback rendererTarget alongside driver summaries for vrm telemetry', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-vrm-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.5,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-vrm-1',
            source: 'prosody-authority',
            confidence: 0.94,
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'inspect_follow',
            intensity: 0.44,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-vrm-1',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-vrm-1',
            continuityHoldMs: 0,
            visemeHints: [
              { segmentId: 'segment-vrm-1', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            ],
          },
          voice: null,
        },
      } as any)),
      presencePosture: ref({
        ...createIdleStageEmbodimentPresencePostureState(),
        engaged: true,
        mode: 'attentive',
        confidence: 0.4,
        bodyYaw: 0.06,
        bodyPitch: 0.05,
        breathBoost: 0.54,
        gazeStability: 0.72,
      }),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        phase: 'playing',
        playbackPhase: 'playing',
        lastEventType: 'playback-start',
        revision: 1,
        active: true,
        item: null,
        currentAudioSource: null,
        audioBound: false,
        mouthOpenSize: 0.2,
        mouthOpenRatio: 0.18,
        visemeIntensity: 0.4,
        startedAt: Date.now(),
        endedAt: null,
        stopReason: null,
        dynamics: {
          speechEnergy: 0.44,
          prosodyIntensity: 0.52,
          emphasisLevel: 0.38,
          cadencePulse: 0.22,
        },
      }),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.driverSummary).toEqual({
      rendererTarget: 'vrm',
      body: null,
      face: {
        cue: 'focused',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-vrm-1',
        emotion: 'thinking',
        intensity: 0.5,
        holdMs: 320,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
      motion: {
        cue: 'inspect_follow',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-vrm-1',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.44,
        holdMs: 220,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
      lipsync: {
        cue: 'I',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-vrm-1',
        mode: 'energy-phoneme-hybrid',
        playbackPhase: 'playing',
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        residentMode: null,
      },
    })
    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.rendererTarget).toBe('vrm')
    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.driverAuthority).toEqual({
      segmentId: 'segment-vrm-1',
      rendererTarget: 'vrm',
      matchedDrivers: ['face', 'motion', 'lipsync'],
      sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    })
  })

  it('surfaces chinese-first authority mismatch explainability inside the diagnostics snapshot', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-authority-drift-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-authority-drift-1',
            continuityHoldMs: 0,
            visemeHints: [],
          },
          voice: null,
        },
        cue: {
          id: 'segment-authority-drift-1',
          index: 0,
          text: '继续看这里。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.28,
          headWeight: 0.32,
          gestureWeight: 0.32,
          facialWeight: 0.36,
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary).toEqual({
      cueId: 'segment-authority-drift-1',
      segmentId: 'segment-authority-drift-1',
      rendererTarget: 'vrm',
      matchedDrivers: ['lipsync'],
      matchedSources: ['prosody-authority'],
      bindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=body:no face:no motion:no lipsync:yes voice:n/a | lane=lipsync-only',
      matchSummary: 'body:no face:no motion:no lipsync:yes voice:n/a',
      authorityMismatchSummary: 'body-mismatch, face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '身体、表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
      authorityMismatchDisplay: '身体、表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
      settleSummary: 'authority-bound | segment=segment-authority-drift-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
    })
  })

  it('does not treat stale live2d lip sync residue as current visual mouth proof for a new authority segment', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-current-mouth-proof-1',
          rendererTarget: 'live2d',
          matchedDrivers: [],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        prosodyAuthority: {
          segmentId: 'segment-current-mouth-proof-1',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.24,
          cueMouthWeight: 0.31,
          cueHeadWeight: 0.26,
          visemePeakWeight: 0.79,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-current-mouth-proof-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-current-mouth-proof-1',
                viseme: 'closed',
                weight: 0.79,
                source: 'prosody-authority',
                confidence: 0.95,
              },
            ],
          },
          voice: null,
        },
        cue: {
          id: 'segment-current-mouth-proof-1',
          index: 0,
          text: '我还在这里。',
          emotion: 'thinking',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.24,
          beatWeight: 0.22,
          mouthWeight: 0.31,
          headWeight: 0.26,
          gestureWeight: 0.18,
          facialWeight: 0.22,
          personaStyleSummary: null,
          facialHoldMs: 220,
          actionHoldMs: 180,
          emotionHoldMs: 220,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      live2dExecutionDiagnostics: ref({
        activeExpression: null,
        activeLipSync: {
          active: true,
          dominantViseme: 'A',
          dominantWeight: 0.66,
          segmentId: 'segment-stale-mouth-shell',
        },
        activeMotion: null,
        activeBody: null,
        cue: null,
      } as any),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        phase: 'playing',
        playbackPhase: 'playing',
        active: true,
        visemeIntensity: 0.72,
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          active: true,
          lipClosure: 0.46,
          visemes: {
            A: 0.12,
            E: 0.06,
            I: 0.04,
            O: 0.03,
            U: 0.05,
            closed: 0.48,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.prosodyExecutionAlignmentSummary).toContain('lead=lipsync-led')
    expect(diagnostics.snapshot.value.speech.prosodyExecutionAlignmentSummary).toContain('alignment=awaiting-visual-mouth-proof')
    expect(diagnostics.snapshot.value.speech.prosodyExecutionAlignmentSummary).not.toContain('execution=live2d-mouth')
    expect(diagnostics.snapshot.value.speech.alerts).toEqual(expect.arrayContaining([
      {
        severity: 'warn',
        code: 'lipsync-mouth-proof-missing',
        message: 'Lip sync is leading this segment, but no renderer mouth execution proof is visible yet.',
      },
    ]))
  })

  it('keeps audible-body same-her continuity explicit in diagnostics without overstating face and motion closure', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 260,
        plannedDurationMs: 260,
        driftMs: 0,
        settleMs: 300,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-audible-body-hold-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['body', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.84,
            gazeStability: 0.76,
            breathAmplitude: 0.22,
            expressivity: 0.28,
            segmentId: 'segment-audible-body-hold-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 220,
            source: 'prosody-authority',
            confidence: 0.9,
            preUtteranceCue: null,
            postUtteranceCue: null,
            segmentId: 'segment-stale-face-shell',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.3,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.86,
            segmentId: 'segment-stale-motion-shell',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-audible-body-hold-1',
            continuityHoldMs: 220,
            visemeHints: [
              { segmentId: 'segment-audible-body-hold-1', viseme: 'I', weight: 0.34, source: 'prosody-authority', confidence: 0.9 },
            ],
          },
          voice: null,
        },
        cue: null,
      })),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary).toEqual(expect.objectContaining({
      cueId: null,
      segmentId: 'segment-audible-body-hold-1',
      rendererTarget: 'live2d',
      matchedDrivers: ['body', 'lipsync'],
      matchedSources: ['prosody-authority'],
      matchSummary: 'body:yes face:no motion:no lipsync:yes voice:n/a',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
    }))
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=body+lipsync-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('matches=body:yes face:no motion:no lipsync:yes voice:n/a')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchReasonSummary).toContain('表情、动作 authority 漂移')
  })

  it('keeps quieter body+lipsync continuity explicit without overstating it as an audible same-her lane', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 260,
        plannedDurationMs: 260,
        driftMs: 0,
        settleMs: 300,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-quieter-body-lipsync-hold-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['body', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-quieter-body-lipsync-hold-1',
          index: 0,
          startOffset: 0,
          endOffset: 220,
          text: '声音落下后，我还沿着这条身体和口型线陪着你。',
          emotion: 'thinking',
          gestureWeight: 0.2,
          facialWeight: 0.22,
          prosodyWeight: 0.32,
          beatWeight: 0.24,
          mouthWeight: 0.28,
          headWeight: 0.18,
          personaStyleSummary: 'measured-return',
          facialHoldMs: 260,
          actionHoldMs: 220,
          emotionHoldMs: 260,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: null,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.84,
            gazeStability: 0.76,
            breathAmplitude: 0.22,
            expressivity: 0.28,
            segmentId: 'segment-quieter-body-lipsync-hold-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 220,
            source: 'prosody-authority',
            confidence: 0.9,
            preUtteranceCue: null,
            postUtteranceCue: null,
            segmentId: 'segment-stale-face-shell',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.3,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.86,
            segmentId: 'segment-stale-motion-shell',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-quieter-body-lipsync-hold-1',
            continuityHoldMs: 420,
            visemeHints: [
              { segmentId: 'segment-quieter-body-lipsync-hold-1', viseme: 'I', weight: 0.34, source: 'prosody-authority', confidence: 0.9 },
            ],
          },
          voice: null,
        },
      })),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=body+lipsync-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('timing=body-lipsync-carry')
    expect(diagnostics.snapshot.value.speech.alerts).toEqual([
      {
        severity: 'warn',
        code: 'cross-modal-mouth-dominance',
        message: 'Lip sync is executing, but face or motion authority has drifted away from the same segment.',
      },
      {
        severity: 'warn',
        code: 'cross-modal-partial-lane-dominance',
        message: 'The resident body lane is still holding together with one other embodiment lane, but full cross-modal continuity has already narrowed.',
      },
    ])
  })

  it('keeps real mouth continuity evidence visible on the quieter body+lipsync host-facing line instead of thinning it down to a mode-only shell', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 260,
        plannedDurationMs: 260,
        driftMs: 0,
        settleMs: 300,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-quieter-body-lipsync-hold-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['body', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-quieter-body-lipsync-hold-1',
          index: 0,
          startOffset: 0,
          endOffset: 220,
          text: '声音落下后，我还沿着这条身体和口型线陪着你。',
          emotion: 'thinking',
          gestureWeight: 0.2,
          facialWeight: 0.22,
          prosodyWeight: 0.32,
          beatWeight: 0.24,
          mouthWeight: 0.28,
          headWeight: 0.18,
          personaStyleSummary: 'measured-return',
          facialHoldMs: 260,
          actionHoldMs: 220,
          emotionHoldMs: 260,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: null,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.84,
            gazeStability: 0.76,
            breathAmplitude: 0.22,
            expressivity: 0.28,
            segmentId: 'segment-quieter-body-lipsync-hold-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 220,
            source: 'prosody-authority',
            confidence: 0.9,
            preUtteranceCue: null,
            postUtteranceCue: null,
            segmentId: 'segment-stale-face-shell',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.3,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.86,
            segmentId: 'segment-stale-motion-shell',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-quieter-body-lipsync-hold-1',
            continuityHoldMs: 420,
            visemeHints: [
              { segmentId: 'segment-quieter-body-lipsync-hold-1', viseme: 'I', weight: 0.34, source: 'prosody-authority', confidence: 0.9 },
            ],
          },
          voice: null,
        },
      })),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.driverSummary?.lipsync).toEqual(expect.objectContaining({
      continuityHoldMs: 420,
      topViseme: 'I:0.34',
      hintTrail: 'I:0.34@0.90 src=prosody-authority segment=segment-quieter-body-lipsync-hold-1',
      hintViseme: 'I',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))

    const loopSummary = buildStageEmbodimentLoopSurfaceSummary(
      diagnostics.snapshot.value.speech.driverSummary as any,
    )

    expect(loopSummary).toContain(
      'mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=420ms | topViseme=I:0.34 | hints=I:0.34@0.90 src=prosody-authority segment=segment-quieter-body-lipsync-hold-1 | hint=I | companion=measured-return | timing=body-lipsync-carry | blink=linger | gaze=soften',
    )
    expect(loopSummary).not.toContain('timing=audible-body-carry')
  })

  it('does not let stale audible same-her metadata promote a body-only carry into an audible-body partial lane', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-body-only-no-audible-proof-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['body'],
          sources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.82,
            gazeStability: 0.74,
            breathAmplitude: 0.21,
            expressivity: 0.24,
            segmentId: 'segment-body-only-no-audible-proof-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.44,
            holdMs: 220,
            source: 'prosody-authority',
            confidence: 0.9,
            preUtteranceCue: null,
            postUtteranceCue: null,
            segmentId: 'segment-stale-face-shell',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.31,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.86,
            segmentId: 'segment-stale-motion-shell',
          },
          lipsync: null,
          voice: null,
        },
      })),
      live2dExecutionDiagnostics: ref({
        activeExpression: null,
        activeLipSync: null,
        activeMotion: null,
        activeBody: {
          settle: 0.46,
          openness: 0.18,
          segmentId: 'segment-body-only-no-audible-proof-1',
        },
        cue: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          preferredExpressionAliases: [],
          preferredMotionAliases: [],
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          signature: 'embodiment:audible-same-her-line',
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 420,
        },
      } as any),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.alerts).toEqual([
      {
        severity: 'warn',
        code: 'cross-modal-single-lane-dominance',
        message: 'Only the resident body lane is still aligned with the active same-her segment.',
      },
    ])
  })

  it('does not overstate body+voice-only carry as an audible same-her lane before lipsync visibly rejoins the same segment', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-body-voice-only-lane-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['body'],
          sources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        prosodyAuthority: {
          segmentId: 'segment-body-voice-only-lane-1',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.28,
          cueMouthWeight: 0.18,
          cueHeadWeight: 0.22,
          visemePeakWeight: 0.48,
        },
        cue: {
          id: 'segment-body-voice-only-lane-1',
          index: 0,
          startOffset: 0,
          endOffset: 220,
          text: '我还沿着这条身体和声音线慢慢接回去。',
          emotion: 'thinking',
          gestureWeight: 0.18,
          facialWeight: 0.18,
          prosodyWeight: 0.34,
          beatWeight: 0.24,
          mouthWeight: 0.18,
          headWeight: 0.16,
          personaStyleSummary: 'measured-return',
          facialHoldMs: 260,
          actionHoldMs: 220,
          emotionHoldMs: 260,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
            reasonTags: ['embodiment:audible-same-her-line', 'embodiment:body+voice-only'],
            signature: 'embodiment:audible-same-her-line',
          },
          rendererSettle: null,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.84,
            gazeStability: 0.76,
            breathAmplitude: 0.22,
            expressivity: 0.28,
            segmentId: 'segment-body-voice-only-lane-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 220,
            source: 'prosody-authority',
            confidence: 0.9,
            preUtteranceCue: null,
            postUtteranceCue: null,
            segmentId: 'segment-stale-face-shell',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.3,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.86,
            segmentId: 'segment-stale-motion-shell',
          },
          lipsync: null,
          voice: null,
        },
      })),
      live2dExecutionDiagnostics: ref({
        activeExpression: null,
        activeLipSync: null,
        activeMotion: null,
        activeBody: {
          settle: 0.44,
          openness: 0.18,
          segmentId: 'segment-body-voice-only-lane-1',
        },
        cue: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          preferredExpressionAliases: [],
          preferredMotionAliases: [],
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
          reasonTags: ['embodiment:audible-same-her-line', 'embodiment:body+voice-only'],
          signature: 'embodiment:audible-same-her-line',
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 420,
        },
      } as any),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.76,
            consonantPrecision: 0.84,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=body+voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary).toEqual(expect.objectContaining({
      matchedDrivers: ['body', 'voice'],
    }))
    expect(diagnostics.snapshot.value.speech.prosodyDriverAttributionSummary).toContain('drivers=body,voice')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('drivers=body, voice')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.settleSummary).toContain('drivers=body, voice')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('pause=longer')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lipsyncMode=restrained')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('voiceMode=lower-pressure')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('pacing=slower')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.settleSummary).toContain('pause=longer')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.settleSummary).toContain('voiceMode=lower-pressure')
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-body-voice-only-lane-1',
      state: 'body-carried-to-renderer-rejoin',
      line: 'body+voice',
      matchedDrivers: ['body', 'voice'],
      missingDrivers: ['face', 'motion', 'lipsync'],
      summary: 'state=body-carried-to-renderer-rejoin | segment=segment-body-voice-only-lane-1 | line=body+voice | missing=face,motion,lipsync',
    })
    expect(diagnostics.snapshot.value.speech.alerts).toEqual([
      {
        severity: 'warn',
        code: 'lipsync-mouth-proof-missing',
        message: 'Lip sync is leading this segment, but no renderer mouth execution proof is visible yet.',
      },
      {
        severity: 'warn',
        code: 'cross-modal-partial-lane-dominance',
        message: 'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
      },
    ])
  })

  it('publishes a fully reunited convergence summary when body face motion lipsync and voice all return to the same segment', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 260,
        plannedDurationMs: 260,
        driftMs: 0,
        settleMs: 300,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-convergence-full-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          bodySegmentMatched: true,
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.82,
            gazeStability: 0.76,
            breathAmplitude: 0.24,
            expressivity: 0.32,
            segmentId: 'segment-convergence-full-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.54,
            holdMs: 260,
            source: 'prosody-authority',
            confidence: 0.92,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-convergence-full-1',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 240,
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-convergence-full-1',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-convergence-full-1',
            continuityHoldMs: 220,
            visemeHints: [
              { segmentId: 'segment-convergence-full-1', viseme: 'I', weight: 0.38, source: 'prosody-authority', confidence: 0.9 },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.78,
            consonantPrecision: 0.84,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-convergence-full-1',
      state: 'fully-reunited',
      line: 'body+face+motion+lipsync+voice',
      matchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
      missingDrivers: [],
      summary: 'state=fully-reunited | segment=segment-convergence-full-1 | line=body+face+motion+lipsync+voice | missing=none',
    })
  })

  it('publishes an audible-body carry convergence summary when the resident body line and audible line stay together while face and motion lag', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 260,
        plannedDurationMs: 260,
        driftMs: 0,
        settleMs: 300,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-convergence-audible-body-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['body', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-convergence-audible-body-1',
          index: 0,
          startOffset: 0,
          endOffset: 220,
          text: '我还沿着这条声音线把身体先接回来。',
          emotion: 'thinking',
          gestureWeight: 0.2,
          facialWeight: 0.22,
          prosodyWeight: 0.36,
          beatWeight: 0.26,
          mouthWeight: 0.31,
          headWeight: 0.19,
          personaStyleSummary: 'measured-return',
          facialHoldMs: 260,
          actionHoldMs: 220,
          emotionHoldMs: 260,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: null,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.84,
            gazeStability: 0.76,
            breathAmplitude: 0.22,
            expressivity: 0.28,
            segmentId: 'segment-convergence-audible-body-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 220,
            source: 'prosody-authority',
            confidence: 0.9,
            preUtteranceCue: null,
            postUtteranceCue: null,
            segmentId: 'segment-stale-face-shell',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.3,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.86,
            segmentId: 'segment-stale-motion-shell',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-convergence-audible-body-1',
            continuityHoldMs: 220,
            visemeHints: [
              { segmentId: 'segment-convergence-audible-body-1', viseme: 'I', weight: 0.34, source: 'prosody-authority', confidence: 0.9 },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.75,
            consonantPrecision: 0.82,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-convergence-audible-body-1',
      state: 'audible-body-carry',
      line: 'body+lipsync+voice',
      matchedDrivers: ['body', 'lipsync', 'voice'],
      missingDrivers: ['face', 'motion'],
      summary: 'state=audible-body-carry | segment=segment-convergence-audible-body-1 | line=body+lipsync+voice | missing=face,motion',
    })
    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).toContain('emotion=thinking')
    expect(diagnostics.snapshot.value.speech.driverSummary?.voice).toContain('emotion=thinking')
  })

  it('keeps convergence in split-authority when only face and voice still hold the same segment truth', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-convergence-face-voice-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['face'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.58,
            holdMs: 300,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-convergence-face-voice-1',
            source: 'prosody-authority',
            confidence: 0.91,
          },
          motion: null,
          lipsync: null,
          voice: null,
        },
        cue: {
          id: 'segment-convergence-face-voice-1',
          index: 0,
          text: '我还沿着这条表情线对你说话。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.18,
          headWeight: 0.22,
          gestureWeight: 0.18,
          facialWeight: 0.44,
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.74,
            consonantPrecision: 0.81,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-convergence-face-voice-1',
      state: 'split-authority',
      line: 'face+voice',
      matchedDrivers: ['face', 'voice'],
      missingDrivers: ['body', 'motion', 'lipsync'],
      summary: 'state=split-authority | segment=segment-convergence-face-voice-1 | line=face+voice | missing=body,motion,lipsync',
    })
    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).not.toContain('timing=audible-body-carry')
    expect(diagnostics.snapshot.value.speech.driverSummary?.voice).not.toContain('timing=audible-body-carry')
  })

  it('keeps authority mismatch wording explicit about the surviving lipsync+voice same-her lane when mouth and voice stay aligned together', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-authority-lipsync-voice-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-authority-lipsync-voice-1',
            continuityHoldMs: 0,
            visemeHints: [],
          },
          voice: null,
        },
        cue: {
          id: 'segment-authority-lipsync-voice-1',
          index: 0,
          text: '我还沿着这条声音线在这里。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.28,
          headWeight: 0.32,
          gestureWeight: 0.32,
          facialWeight: 0.36,
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            locale: 'zh-CN',
            energy: 0.72,
            precision: 0.84,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=lipsync+voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchReasonSummary).toBe(
      '身体、表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型、语音。',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchDisplay).toBe(
      '身体、表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型和语音。',
    )
  })

  it('keeps authority mismatch wording explicit about the surviving face+voice same-her lane when expression and voice stay aligned together', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-authority-face-voice-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['face'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.58,
            holdMs: 300,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-authority-face-voice-1',
            source: 'prosody-authority',
            confidence: 0.91,
          },
          motion: null,
          lipsync: null,
          voice: null,
        },
        cue: {
          id: 'segment-authority-face-voice-1',
          index: 0,
          text: '我还在看着你说这句话。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.18,
          headWeight: 0.22,
          gestureWeight: 0.18,
          facialWeight: 0.44,
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            locale: 'zh-CN',
            energy: 0.74,
            precision: 0.82,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=face+voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchDisplay).toBe(
      '身体、动作、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情和语音。',
    )
  })

  it('keeps authority mismatch wording explicit about the surviving motion+voice same-her lane when motion and voice stay aligned together', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-authority-motion-voice-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['motion'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: false,
        },
        drivers: {
          body: null,
          face: null,
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.46,
            holdMs: 260,
            segmentId: 'segment-authority-motion-voice-1',
            source: 'prosody-authority',
            confidence: 0.88,
          },
          lipsync: null,
          voice: null,
        },
        cue: {
          id: 'segment-authority-motion-voice-1',
          index: 0,
          text: '我还沿着这条动作线陪着你说下去。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.34,
          beatWeight: 0.3,
          mouthWeight: 0.14,
          headWeight: 0.28,
          gestureWeight: 0.4,
          facialWeight: 0.16,
          personaStyleSummary: null,
          facialHoldMs: 300,
          actionHoldMs: 260,
          emotionHoldMs: 300,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            locale: 'zh-CN',
            energy: 0.71,
            precision: 0.8,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=motion+voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchDisplay).toBe(
      '身体、表情、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是动作和语音。',
    )
  })

  it('keeps authority mismatch wording explicit about the surviving face+lipsync same-her lane when expression and mouth stay aligned together', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-authority-face-lipsync-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.58,
            holdMs: 300,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-authority-face-lipsync-1',
            source: 'prosody-authority',
            confidence: 0.91,
          },
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-authority-face-lipsync-1',
            continuityHoldMs: 320,
            visemeHints: [
              { segmentId: 'segment-authority-face-lipsync-1', viseme: 'I', weight: 0.42, source: 'prosody-authority', confidence: 0.92 },
            ],
          },
          voice: null,
        },
        cue: {
          id: 'segment-authority-face-lipsync-1',
          index: 0,
          text: '我先沿着这条表情和口型线把你接住。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.34,
          beatWeight: 0.3,
          mouthWeight: 0.32,
          headWeight: 0.22,
          gestureWeight: 0.14,
          facialWeight: 0.44,
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=face+lipsync-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchDisplay).toBe(
      '身体、动作、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情和口型。',
    )
  })

  it('keeps authority mismatch wording explicit about the surviving motion+lipsync same-her lane when motion and mouth stay aligned together', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-authority-motion-lipsync-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['motion', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.46,
            holdMs: 260,
            segmentId: 'segment-authority-motion-lipsync-1',
            source: 'prosody-authority',
            confidence: 0.88,
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-authority-motion-lipsync-1',
            continuityHoldMs: 320,
            visemeHints: [
              { segmentId: 'segment-authority-motion-lipsync-1', viseme: 'O', weight: 0.4, source: 'prosody-authority', confidence: 0.9 },
            ],
          },
          voice: null,
        },
        cue: {
          id: 'segment-authority-motion-lipsync-1',
          index: 0,
          text: '我还沿着动作和口型这条线陪着你。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.34,
          beatWeight: 0.3,
          mouthWeight: 0.28,
          headWeight: 0.28,
          gestureWeight: 0.4,
          facialWeight: 0.16,
          personaStyleSummary: null,
          facialHoldMs: 300,
          actionHoldMs: 260,
          emotionHoldMs: 300,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=motion+lipsync-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchDisplay).toBe(
      '身体、表情、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是动作和口型。',
    )
  })

  it('keeps the still-voiced face-and-motion lane explicit in authority summaries while body and lipsync remain open', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 260,
        plannedDurationMs: 260,
        driftMs: 0,
        settleMs: 280,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-authority-face-motion-voice-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'motion'],
          sources: ['prosody-authority', 'timeline-projection'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: false,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-authority-face-motion-voice-1',
            source: 'prosody-authority',
            confidence: 0.92,
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.38,
            holdMs: 260,
            segmentId: 'segment-authority-face-motion-voice-1',
            source: 'timeline-projection',
            confidence: 0.88,
          },
          lipsync: null,
          voice: null,
        },
        cue: {
          id: 'segment-authority-face-motion-voice-1',
          index: 0,
          text: '我还沿着表情动作和声音一起陪着你。',
          startOffset: 0,
          endOffset: 220,
          prosodyWeight: 0.36,
          beatWeight: 0.3,
          mouthWeight: 0.16,
          headWeight: 0.26,
          gestureWeight: 0.32,
          facialWeight: 0.4,
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 260,
          emotionHoldMs: 320,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: null,
          rendererSettle: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            locale: 'zh-CN',
            energy: 0.76,
            precision: 0.84,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=face+motion+voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('remaining-open=body+lipsync')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.settleSummary).toContain('lane=face+motion+voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.settleSummary).toContain('remaining-open=body+lipsync')
  })

  it('derives voice-led lane continuity from the normalized structured voice summary segment instead of needing extra renderer proof', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-voice-summary-authority-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-voice-summary-authority-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-voice-summary-authority-1',
                viseme: 'I',
                weight: 0.44,
                source: 'prosody-authority',
                confidence: 0.91,
              },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.73,
            consonantPrecision: 0.85,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).toContain('segment=segment-voice-summary-authority-1')
    expect(diagnostics.snapshot.value.speech.driverSummary?.voice).toContain('segment=segment-voice-summary-authority-1')
    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority).toEqual({
      cue: null,
      source: 'prosody-authority',
      confidence: null,
      segmentId: 'segment-voice-summary-authority-1',
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonSummary: null,
    })
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=lipsync+voice-only')
  })

  it('feeds renderer voice driver segment ids from structured voiceAuthority before falling back to raw voice strings', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-voice-structural-proof-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-voice-structural-proof-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-voice-structural-proof-1',
                viseme: 'I',
                weight: 0.51,
                source: 'prosody-authority',
                confidence: 0.93,
              },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.77,
            consonantPrecision: 0.83,
          },
        },
      } as any),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
    })

    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority?.segmentId).toBe(
      'segment-voice-structural-proof-1',
    )
    expect(diagnostics.snapshot.value.speech.rendererAlignment.vrm?.voiceDriverSegmentId).toBe(
      'segment-voice-structural-proof-1',
    )
  })

  it('keeps structured voice authority available from explicit playback voice telemetry even when no formatted voice summary string is present yet', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-voice-driver-telemetry-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['voice'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
          voiceSegmentMatched: true,
          prosodyAuthority: {
            segmentId: 'segment-voice-driver-telemetry-1',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.39,
            cueMouthWeight: 0.31,
            cueHeadWeight: 0.24,
            visemePeakWeight: 0.57,
          },
        },
        prosodyAuthority: null,
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: null,
          voice: {
            playbackPhase: 'playing',
            continuityHoldMs: 240,
            segmentId: 'segment-voice-driver-telemetry-1',
            source: 'prosody-authority',
            provenance: 'authority-bound',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.39,
            cueMouthWeight: 0.31,
            cueHeadWeight: 0.24,
            visemePeakWeight: 0.57,
          },
        },
      })),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority).toEqual({
      cue: null,
      source: 'prosody-authority',
      confidence: null,
      segmentId: 'segment-voice-driver-telemetry-1',
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: null,
      preferredPacingMode: null,
      reasonSummary: null,
    })
    expect(diagnostics.snapshot.value.speech.rendererAlignment.vrm?.voiceDriverSegmentId).toBe(
      'segment-voice-driver-telemetry-1',
    )
  })

  it('treats explicit voice driver telemetry as a first-class diagnostics authority line even before caller rethreads top-level prosody authority', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref<EmbodimentPlaybackTelemetry | null>({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 280,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: null,
        prosodyAuthority: null,
        cue: null,
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: null,
          voice: {
            playbackPhase: 'playing',
            continuityHoldMs: 240,
            segmentId: 'segment-runtime-explicit-voice-driver-authority',
            source: 'prosody-authority',
            provenance: 'authority-bound',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.41,
            cueMouthWeight: 0.33,
            cueHeadWeight: 0.26,
            visemePeakWeight: 0.58,
          },
        },
      }),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).toBeNull()
    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.prosodyAuthority).toEqual({
      segmentId: 'segment-runtime-explicit-voice-driver-authority',
      provenance: 'authority-bound',
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid',
      cueProsodyWeight: 0.41,
      cueMouthWeight: 0.33,
      cueHeadWeight: 0.26,
      visemePeakWeight: 0.58,
    })
    expect(diagnostics.snapshot.value.speech.prosodyAuthoritySummary).toBe(
      'provenance=authority-bound | segment=segment-runtime-explicit-voice-driver-authority | source=prosody-authority | mode=energy-phoneme-hybrid | prosody=0.41 | mouth=0.33 | head=0.26 | visemePeak=0.58',
    )
    expect(diagnostics.snapshot.value.speech.prosodyDriverAttributionSummary).toBe(
      'lead=lipsync-led | drivers=voice | segment=segment-runtime-explicit-voice-driver-authority | source=prosody-authority | mode=energy-phoneme-hybrid',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary).toEqual(expect.objectContaining({
      cueId: null,
      segmentId: null,
      rendererTarget: 'vrm',
      matchedDrivers: ['voice'],
      matchedSources: [],
      matchSummary: 'body:n/a face:n/a motion:n/a lipsync:n/a voice:yes',
    }))
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('drivers=voice')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.settleSummary).toContain('authority-bound')
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-runtime-explicit-voice-driver-authority',
      state: 'split-authority',
      line: 'voice',
      matchedDrivers: ['voice'],
      missingDrivers: ['body', 'face', 'motion', 'lipsync'],
      summary: 'state=split-authority | segment=segment-runtime-explicit-voice-driver-authority | line=voice | missing=body,face,motion,lipsync',
    })
  })

  it('does not let stale explicit voice authority pin face+lipsync continuity to an older shell before formatted voice summary exists', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-stale-explicit-voice-shell',
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
          prosodyAuthority: {
            segmentId: 'segment-stale-explicit-voice-shell',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.37,
            cueMouthWeight: 0.3,
            cueHeadWeight: 0.22,
            visemePeakWeight: 0.51,
          },
        },
        prosodyAuthority: {
          segmentId: 'segment-current-face-mouth-shell',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.41,
          cueMouthWeight: 0.33,
          cueHeadWeight: 0.24,
          visemePeakWeight: 0.55,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.57,
            holdMs: 280,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-current-face-mouth-shell',
            source: 'prosody-authority',
            confidence: 0.92,
          },
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-current-face-mouth-shell',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-current-face-mouth-shell',
                viseme: 'I',
                weight: 0.47,
                source: 'prosody-authority',
                confidence: 0.91,
              },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).toBeNull()
    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority?.segmentId).toBe(
      'segment-current-face-mouth-shell',
    )
    expect(diagnostics.snapshot.value.speech.rendererAlignment.live2d?.voiceDriverSegmentId).toBe(
      'segment-current-face-mouth-shell',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain(
      'lane=face+lipsync+voice-only',
    )
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-current-face-mouth-shell',
      state: 'split-authority',
      line: 'face+lipsync+voice',
      matchedDrivers: ['face', 'lipsync', 'voice'],
      missingDrivers: ['body', 'motion'],
      summary: 'state=split-authority | segment=segment-current-face-mouth-shell | line=face+lipsync+voice | missing=body,motion',
    })
  })

  it('does not let stale explicit voice authority pin motion+lipsync continuity to an older shell before formatted voice summary exists', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-stale-explicit-voice-shell',
          rendererTarget: 'live2d',
          matchedDrivers: ['motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
          prosodyAuthority: {
            segmentId: 'segment-stale-explicit-voice-shell',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.36,
            cueMouthWeight: 0.29,
            cueHeadWeight: 0.25,
            visemePeakWeight: 0.5,
          },
        },
        prosodyAuthority: {
          segmentId: 'segment-current-motion-mouth-shell',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.42,
          cueMouthWeight: 0.34,
          cueHeadWeight: 0.26,
          visemePeakWeight: 0.56,
        },
        drivers: {
          body: null,
          face: null,
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.45,
            holdMs: 260,
            segmentId: 'segment-current-motion-mouth-shell',
            source: 'timeline-projection',
            confidence: 0.88,
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-current-motion-mouth-shell',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-current-motion-mouth-shell',
                viseme: 'I',
                weight: 0.45,
                source: 'prosody-authority',
                confidence: 0.9,
              },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).toBeNull()
    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority?.segmentId).toBe(
      'segment-current-motion-mouth-shell',
    )
    expect(diagnostics.snapshot.value.speech.rendererAlignment.live2d?.voiceDriverSegmentId).toBe(
      'segment-current-motion-mouth-shell',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain(
      'lane=motion+lipsync+voice-only',
    )
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-current-motion-mouth-shell',
      state: 'split-authority',
      line: 'motion+lipsync+voice',
      matchedDrivers: ['motion', 'lipsync', 'voice'],
      missingDrivers: ['body', 'face'],
      summary: 'state=split-authority | segment=segment-current-motion-mouth-shell | line=motion+lipsync+voice | missing=body,face',
    })
  })

  it('does not let stale live2d body execution override the current structured voice authority segment in renderer alignment', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-live2d-voice-authority-now-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-live2d-voice-authority-now-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-live2d-voice-authority-now-1',
                viseme: 'I',
                weight: 0.43,
                source: 'prosody-authority',
                confidence: 0.9,
              },
            ],
          },
          voice: null,
        },
      })),
      live2dExecutionDiagnostics: ref({
        activeExpression: null,
        activeLipSync: null,
        activeMotion: null,
        activeBody: {
          settle: 0.4,
          openness: 0.18,
          segmentId: 'segment-live2d-stale-body-shell',
        },
        cue: null,
      } as any),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.74,
            consonantPrecision: 0.83,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.rendererAlignment.live2d?.bodyDriverSegmentId).toBe(
      'segment-live2d-stale-body-shell',
    )
    expect(diagnostics.snapshot.value.speech.rendererAlignment.live2d?.voiceDriverSegmentId).toBe(
      'segment-live2d-voice-authority-now-1',
    )
  })

  it('keeps live2d visible voice execution as the current same-her lane even before structured voice summaries are available', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-live2d-visible-voice-only-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-live2d-visible-voice-only-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-live2d-visible-voice-only-1',
                viseme: 'I',
                weight: 0.41,
                source: 'prosody-authority',
                confidence: 0.91,
              },
            ],
          },
          voice: null,
        },
      })),
      live2dExecutionDiagnostics: ref({
        activeExpression: null,
        activeLipSync: null,
        activeMotion: null,
        activeBody: null,
        activeVoice: {
          active: true,
          phase: 'playing',
          segmentId: 'segment-live2d-visible-voice-only-1',
        },
        cue: null,
      } as any),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        revision: 2,
        item: {
          segmentId: 'segment-live2d-visible-voice-only-1',
          text: '我还在这里。',
          cue: null,
          metadata: null,
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.rendererAlignment.live2d?.voiceDriverSegmentId).toBe(
      'segment-live2d-visible-voice-only-1',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain(
      'lane=lipsync+voice-only',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.matchSummary).toBe(
      'body:no face:no motion:no lipsync:yes voice:yes',
    )
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-live2d-visible-voice-only-1',
      state: 'audible-only-carry',
      line: 'lipsync+voice',
      matchedDrivers: ['lipsync', 'voice'],
      missingDrivers: ['body', 'face', 'motion'],
      summary: 'state=audible-only-carry | segment=segment-live2d-visible-voice-only-1 | line=lipsync+voice | missing=body,face,motion',
    })
  })

  it('keeps vrm visible voice execution as the current same-her lane even before structured voice summaries are available', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-vrm-visible-voice-only-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-vrm-visible-voice-only-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-vrm-visible-voice-only-1',
                viseme: 'I',
                weight: 0.41,
                source: 'prosody-authority',
                confidence: 0.91,
              },
            ],
          },
          voice: null,
        },
      })),
      vrmExecutionDiagnostics: ref({
        activeEmotion: null,
        activeFacialCue: null,
        activeMotion: null,
        activeBody: null,
        activeLipSync: null,
        activeVoice: {
          active: true,
          phase: 'playing',
          segmentId: 'segment-vrm-visible-voice-only-1',
        },
        cue: null,
      } as any),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        active: true,
        phase: 'playing',
        playbackPhase: 'playing',
        revision: 2,
        item: {
          segmentId: 'segment-vrm-visible-voice-only-1',
          text: '我还在这里。',
          cue: null,
          metadata: null,
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.rendererAlignment.vrm?.voiceDriverSegmentId).toBe(
      'segment-vrm-visible-voice-only-1',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain(
      'lane=lipsync+voice-only',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.matchSummary).toBe(
      'body:no face:no motion:no lipsync:yes voice:yes',
    )
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-vrm-visible-voice-only-1',
      state: 'audible-only-carry',
      line: 'lipsync+voice',
      matchedDrivers: ['lipsync', 'voice'],
      missingDrivers: ['body', 'face', 'motion'],
      summary: 'state=audible-only-carry | segment=segment-vrm-visible-voice-only-1 | line=lipsync+voice | missing=body,face,motion',
    })
  })

  it('keeps effective authority matching on the same voice-led lane when structured voice authority carries the segment truth', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 210,
        plannedDurationMs: 210,
        driftMs: 0,
        settleMs: 210,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-effective-voice-lane-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-effective-voice-lane-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-effective-voice-lane-1',
                viseme: 'I',
                weight: 0.49,
                source: 'prosody-authority',
                confidence: 0.92,
              },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.79,
            consonantPrecision: 0.84,
          },
        },
      } as any),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
    })

    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority?.segmentId).toBe(
      'segment-effective-voice-lane-1',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain('lane=lipsync+voice-only')
    expect(diagnostics.snapshot.value.speech.authoritySummary?.matchSummary).toBe(
      'body:no face:no motion:no lipsync:yes voice:yes',
    )
  })

  it('keeps voice authority drift explicit when body face motion and lipsync still hold one living segment but the audible lane falls onto another shell', () => {
    const playbackTelemetry = createPlaybackTelemetryFixture({
      actualDurationMs: 240,
      plannedDurationMs: 240,
      driftMs: 0,
      settleMs: 260,
      stopReason: null,
      rendererTarget: 'vrm',
      driverAuthority: {
        segmentId: 'segment-same-her-shell-1',
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        sources: ['prosody-authority', 'timeline-projection', 'voice-segment'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      drivers: {
        body: {
          frameMode: 'measured-return',
          stillness: 0.78,
          gazeStability: 0.75,
          breathAmplitude: 0.2,
          expressivity: 0.34,
          segmentId: 'segment-same-her-shell-1',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.58,
          holdMs: 300,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-same-her-shell-1',
          source: 'prosody-authority',
          confidence: 0.91,
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.46,
          holdMs: 260,
          segmentId: 'segment-same-her-shell-1',
          source: 'timeline-projection',
          confidence: 0.88,
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing',
          segmentId: 'segment-same-her-shell-1',
          continuityHoldMs: 0,
          visemeHints: [
            {
              segmentId: 'segment-same-her-shell-1',
              viseme: 'I',
              weight: 0.45,
              source: 'prosody-authority',
              confidence: 0.92,
            },
          ],
        },
        voice: null,
      },
    })

    playbackTelemetry.drivers.voice = {
      playbackPhase: 'playing',
      continuityHoldMs: 220,
      segmentId: 'segment-other-voice-shell-1',
      source: 'voice-segment',
      provenance: 'authority-bound',
      mode: 'energy-phoneme-hybrid',
      cueProsodyWeight: 0.38,
      cueMouthWeight: 0.27,
      cueHeadWeight: 0.24,
      visemePeakWeight: 0.55,
    }

    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(playbackTelemetry),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.authoritySummary?.matchSummary).toBe(
      'body:yes face:yes motion:yes lipsync:yes voice:no',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchSummary).toBe(
      'voice-mismatch',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchReasonSummary).toContain(
      '语音 authority 漂移',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.authorityMismatchReasonSummary).toContain(
      '实际执行落点是体态、表情、动作、口型、语音',
    )
    expect(diagnostics.snapshot.value.speech.driverExecutionSummary).toContain(
      'voice=authority-bound phase=playing seg=segment-other-voice-shell-1',
    )
  })

  it('does not let a stale authority segment keep face+lipsync+voice host-facing continuity pinned to an older shell', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-stale-driver-authority-shell',
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: true,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.58,
            holdMs: 300,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-current-face-mouth-voice',
            source: 'prosody-authority',
            confidence: 0.91,
          },
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-current-face-mouth-voice',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-current-face-mouth-voice',
                viseme: 'I',
                weight: 0.46,
                source: 'prosody-authority',
                confidence: 0.92,
              },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.74,
            consonantPrecision: 0.82,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).toContain(
      'segment=segment-current-face-mouth-voice',
    )
    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).not.toContain(
      'segment=segment-stale-driver-authority-shell',
    )
    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority?.segmentId).toBe(
      'segment-current-face-mouth-voice',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain(
      'lane=face+lipsync+voice-only',
    )
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-current-face-mouth-voice',
      state: 'split-authority',
      line: 'face+lipsync+voice',
      matchedDrivers: ['face', 'lipsync', 'voice'],
      missingDrivers: ['body', 'motion'],
      summary: 'state=split-authority | segment=segment-current-face-mouth-voice | line=face+lipsync+voice | missing=body,motion',
    })
  })

  it('does not let a stale authority segment keep motion+lipsync+voice host-facing continuity pinned to an older shell', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-stale-driver-authority-shell',
          rendererTarget: 'live2d',
          matchedDrivers: ['motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: null,
          face: null,
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.46,
            holdMs: 260,
            segmentId: 'segment-current-motion-mouth-voice',
            source: 'timeline-projection',
            confidence: 0.88,
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-current-motion-mouth-voice',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-current-motion-mouth-voice',
                viseme: 'I',
                weight: 0.44,
                source: 'prosody-authority',
                confidence: 0.9,
              },
            ],
          },
          voice: null,
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.71,
            consonantPrecision: 0.8,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).toContain(
      'segment=segment-current-motion-mouth-voice',
    )
    expect(diagnostics.snapshot.value.speech.articulationSummary?.voice).not.toContain(
      'segment=segment-stale-driver-authority-shell',
    )
    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority?.segmentId).toBe(
      'segment-current-motion-mouth-voice',
    )
    expect(diagnostics.snapshot.value.speech.authoritySummary?.bindingSummary).toContain(
      'lane=motion+lipsync+voice-only',
    )
    expect(diagnostics.snapshot.value.speech.convergence).toEqual({
      segmentId: 'segment-current-motion-mouth-voice',
      state: 'split-authority',
      line: 'motion+lipsync+voice',
      matchedDrivers: ['motion', 'lipsync', 'voice'],
      missingDrivers: ['body', 'face'],
      summary: 'state=split-authority | segment=segment-current-motion-mouth-voice | line=motion+lipsync+voice | missing=body,face',
    })
  })

  it('surfaces quiet accompaniment authority and low-drive resident runtime explanation in diagnostics', () => {
    const now = Date.now()
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref({
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.82,
        delivery: null,
        emphasis: 0,
        watchMode: 'symbiotic-vision',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 180_000,
        currentInwardPreoccupation: 'quietly accompanying the current work',
        expiresAt: now + 4_000,
      } as any),
      digitalLifeSpineDigest: ref(createDigitalLifeSpineDigest({
        dominantSystem: 'mind',
        operatingMode: 'observing',
        recallMode: 'working-memory',
        watchMode: 'symbiotic-vision',
      })),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'idle',
        variationToken: 'presence-pulse|quiet-accompaniment',
        residentPerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        actionIntensity: 0.1,
        breathDrive: 0.2,
        focusDrive: 0.2,
      }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      visualPresenceState: ref({
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 180_000,
        currentInwardPreoccupation: 'quietly accompanying the current work',
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          source: 'screen-semantic-summary',
          confidence: 0.82,
          summary: 'inspecting current diff',
          target: {
            appName: 'Visual Studio Code',
            title: 'runtime.ts',
          },
          beganAt: now - 3_000,
          lastSeenAt: now - 120,
        },
        attention: {
          target: {
            appName: 'Visual Studio Code',
            title: 'runtime.ts',
          },
          source: 'current-grounded-scene',
          confidence: 0.76,
          engagedAt: now - 2_500,
          lastConfirmedAt: now - 120,
          dwellMs: 2_380,
        },
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'accompany',
          confidence: 0.68,
          rationaleTags: ['scene:diff', 'companionship'],
          thoughtText: 'Stay with this diff line.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: now + 8_000,
          emotionalTension: 'focused-flow',
          focusBeliefId: 'belief-focus-1',
          focusInquiryId: 'inquiry-focus-1',
          commitmentId: 'commitment-focus-1',
          runtimeThreadId: 'runtime-thread-1',
          governorDrive: 'stabilize',
          governorIntentionId: 'governor-intention-1',
          selectedThoughtThreadId: 'thought-thread-1',
        },
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        durabilityPulse: null,
        recentTransition: {
          fromWatchMode: 'invited-inspection',
          toWatchMode: 'symbiotic-vision',
          fromScenario: 'coding',
          durationMs: 180_000,
          reason: 'settled into quiet accompaniment',
          occurredAt: now - 1_200,
        },
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      } as any),
    })

    expect(diagnostics.snapshot.value.visualPresence.currentBodyState).toBe('accompanying')
    expect(diagnostics.snapshot.value.visualPresence.continuityMode).toBe('quiet-accompaniment')
    expect(diagnostics.snapshot.value.visualPresence.quietLineMs).toBe(180_000)
    expect(diagnostics.snapshot.value.visualPresence.currentInwardPreoccupation).toContain('quietly accompanying')
    expect(diagnostics.snapshot.value.performance.phase).toBe('idle')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.profile).toBe('quiet-accompaniment')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.variationToken).toBe('presence-pulse|quiet-accompaniment')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.actionIntensity).toBeCloseTo(0.1)
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.breathDrive).toBeCloseTo(0.2)
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.focusDrive).toBeCloseTo(0.2)
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.provenance).toEqual({
      watchMode: 'symbiotic-vision',
      bodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      thoughtStance: 'accompany',
      thoughtShouldSpeak: false,
      thoughtTension: 'focused-flow',
      runtimeChannel: null,
      runtimeSummary: null,
      runtimeMemoryClosureIdentityKey: null,
      activeThreadId: 'thread-1',
      activeThreadTitle: 'runtime',
      preferredPresence: 'attentive',
      selectedAction: 'warn',
      personaBiasSummary: null,
      personaOpeningGuidance: null,
      scene: 'coding',
      scenario: 'coding',
    })
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.eventPointers).toEqual({
      recentTransition: {
        fromWatchMode: 'invited-inspection',
        toWatchMode: 'symbiotic-vision',
        fromScenario: 'coding',
        durationMs: 180_000,
        reason: 'settled into quiet accompaniment',
        occurredAt: now - 1_200,
      },
      rationaleTags: ['scene:diff', 'companionship'],
      focusBeliefId: 'belief-focus-1',
      focusInquiryId: 'inquiry-focus-1',
      commitmentId: 'commitment-focus-1',
      runtimeThreadId: 'runtime-thread-1',
      governorDrive: 'stabilize',
      governorIntentionId: 'governor-intention-1',
      selectedThoughtThreadId: 'thought-thread-1',
    })
  })

  it('surfaces protective-watch recovery explanation in diagnostics', () => {
    const now = Date.now()
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref({
        source: 'presence-pulse',
        embodiedPresence: 'concerned',
        confidence: 0.78,
        delivery: null,
        emphasis: 1,
        watchMode: 'recovering',
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
        quietLineMs: 90_000,
        currentInwardPreoccupation: 'holding a quiet recovery line',
        expiresAt: now + 4_000,
      } as any),
      digitalLifeSpineDigest: ref(createDigitalLifeSpineDigest({
        dominantSystem: 'mind',
        operatingMode: 'observing',
        recallMode: 'working-memory',
        watchMode: 'recovering',
        manifestationCadenceSummary: 'persona leans toward direct reconnect once the opening is real, so the return cadence can loosen earlier.',
        openingGuidance: 'Open directly with the live answer first and keep the approach lighter.',
      })),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'idle',
        variationToken: 'presence-pulse|protective-watch',
        residentPerformance: {
          baseEmotion: 'tired',
          emotion: 'tired',
          facialCue: 'soft-gaze',
          actionCue: 'comfort_sway',
          delivery: 'gentle',
          emphasis: 1,
        },
        performance: {
          baseEmotion: 'tired',
          emotion: 'tired',
          facialCue: 'soft-gaze',
          actionCue: 'comfort_sway',
          delivery: 'gentle',
          emphasis: 1,
        },
        actionIntensity: 0.1,
        breathDrive: 0.2,
        focusDrive: 0.3,
      }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      visualPresenceState: ref({
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
        quietLineMs: 90_000,
        currentInwardPreoccupation: 'holding a quiet recovery line',
        watchMode: 'recovering',
        currentScene: {
          workloadKind: 'chat',
          contentKind: 'chat',
          scenario: 'late-night-care',
          source: 'screen-semantic-summary',
          confidence: 0.76,
          summary: 'winding down after a heavy day',
          target: {
            appName: 'WeChat',
            title: 'night thread',
          },
          beganAt: now - 3_000,
          lastSeenAt: now - 120,
        },
        attention: {
          target: {
            appName: 'WeChat',
            title: 'night thread',
          },
          source: 'current-grounded-scene',
          confidence: 0.72,
          engagedAt: now - 2_500,
          lastConfirmedAt: now - 120,
          dwellMs: 2_380,
        },
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'care',
          confidence: 0.72,
          rationaleTags: ['recovering', 'late-night-fatigue'],
          thoughtText: 'Stay close without pressing.',
          shouldSpeak: false,
          suggestedStyle: 'gentle-care',
          embodiedPresence: 'concerned',
          expiresAt: now + 8_000,
          emotionalTension: 'late-night-drain',
          focusBeliefId: 'belief-rest-1',
          commitmentId: 'commitment-rest-1',
          runtimeThreadId: 'runtime-thread-rest-1',
          governorDrive: 'protect',
          governorIntentionId: 'governor-intention-rest-1',
          selectedThoughtThreadId: 'thought-thread-rest-1',
        },
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        durabilityPulse: null,
        recentTransition: {
          fromWatchMode: 'symbiotic-vision',
          toWatchMode: 'recovering',
          fromScenario: 'chat',
          durationMs: 90_000,
          reason: 'host fatigue detected during late-night care',
          occurredAt: now - 900,
        },
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      } as any),
    })

    expect(diagnostics.snapshot.value.visualPresence.currentBodyState).toBe('recovering')
    expect(diagnostics.snapshot.value.visualPresence.continuityMode).toBe('protective-watch')
    expect(diagnostics.snapshot.value.visualPresence.currentInwardPreoccupation).toContain('quiet recovery')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.profile).toBe('protective-watch')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.residentActionCue).toBe('comfort_sway')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.residentFacialCue).toBe('soft-gaze')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.focusDrive).toBeCloseTo(0.3)
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.provenance).toEqual({
      watchMode: 'recovering',
      bodyState: 'recovering',
      continuityMode: 'protective-watch',
      thoughtStance: 'care',
      thoughtShouldSpeak: false,
      thoughtTension: 'late-night-drain',
      runtimeChannel: null,
      runtimeSummary: null,
      runtimeMemoryClosureIdentityKey: null,
      activeThreadId: 'thread-1',
      activeThreadTitle: 'runtime',
      preferredPresence: 'attentive',
      selectedAction: 'warn',
      personaBiasSummary: 'persona leans toward direct reconnect once the opening is real, so the return cadence can loosen earlier.',
      personaOpeningGuidance: 'Open directly with the live answer first and keep the approach lighter.',
      scene: 'chat',
      scenario: 'late-night-care',
    })
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.eventPointers).toEqual({
      recentTransition: {
        fromWatchMode: 'symbiotic-vision',
        toWatchMode: 'recovering',
        fromScenario: 'chat',
        durationMs: 90_000,
        reason: 'host fatigue detected during late-night care',
        occurredAt: now - 900,
      },
      rationaleTags: ['recovering', 'late-night-fatigue'],
      focusBeliefId: 'belief-rest-1',
      focusInquiryId: null,
      commitmentId: 'commitment-rest-1',
      runtimeThreadId: 'runtime-thread-rest-1',
      governorDrive: 'protect',
      governorIntentionId: 'governor-intention-rest-1',
      selectedThoughtThreadId: 'thought-thread-rest-1',
    })
  })

  it('surfaces lower-pressure resident reopening guidance in diagnostics', () => {
    const now = Date.now()
    const live2dRuntimeCapabilities: Live2DRuntimeCapabilitySnapshot = {
      supportedExpressionNames: ['Soft Gaze', 'Relaxed Half', 'Focus Inspect'],
      supportedBaseEmotions: ['neutral', 'thinking', 'tired'],
      supportedFacialCues: [],
      supportedActions: [],
    }
    const vrmRuntimeCapabilities: VrmResolvedRuntimeCapabilitySnapshot = {
      supportedExpressionNames: ['default', 'calm', 'focus'],
      supportedBaseEmotions: ['neutral', 'thinking', 'tired'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsMicroDynamics: true,
      supportsVisemeLipSync: true,
    }
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref({
        source: 'presence-pulse',
        embodiedPresence: 'attentive',
        confidence: 0.8,
        delivery: null,
        emphasis: 0,
        watchMode: 'symbiotic-vision',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'staying nearby without reopening too fast',
        expiresAt: now + 4_000,
      } as any),
      digitalLifeSpineDigest: ref(createDigitalLifeSpineDigest({
        dominantSystem: 'mind',
        operatingMode: 'observing',
        recallMode: 'working-memory',
        watchMode: 'symbiotic-vision',
        manifestationCadenceSummary: 'relationship timing says repair should settle before closeness expands.',
        openingGuidance: 'keep more room and reopen slowly.',
      })),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'idle',
        variationToken: 'presence-pulse|quiet-accompaniment|timing:lower-pressure-opening',
        residentPerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'calm',
          emphasis: 0,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'calm',
          emphasis: 0,
        },
        actionIntensity: 0.08,
        breathDrive: 0.2,
        focusDrive: 0.24,
      }),
      presencePosture: ref({
        engaged: true,
        mode: 'attentive',
        confidence: 0.74,
        bodyYaw: 0.02,
        bodyPitch: 0.22,
        breathBoost: 0.12,
        gazeStability: 0.9,
      }),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      live2dRuntimeCapabilities: ref(live2dRuntimeCapabilities),
      visualPresenceState: ref({
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 240_000,
        currentInwardPreoccupation: 'staying nearby without reopening too fast',
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          source: 'screen-semantic-summary',
          confidence: 0.84,
          summary: 'reviewing a settled diff after a difficult repair',
          target: {
            appName: 'Cursor',
            title: 'runtime diff',
          },
          beganAt: now - 4_000,
          lastSeenAt: now - 120,
        },
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'observe',
          confidence: 0.72,
          rationaleTags: ['quiet-companionship', 'timing:lower-pressure-opening'],
          thoughtText: 'Stay nearby without reopening too fast.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: now + 8_000,
          emotionalTension: 'soft-covision',
        },
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      } as any),
      vrmRuntimeCapabilities: ref(vrmRuntimeCapabilities),
    })

    expect(diagnostics.snapshot.value.performance.runtimeDynamics.profile).toBe('quiet-accompaniment')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.variationToken).toBe(
      'presence-pulse|quiet-accompaniment|timing:lower-pressure-opening',
    )
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.provenance.personaBiasSummary).toBe(
      'relationship timing says repair should settle before closeness expands.',
    )
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.provenance.personaOpeningGuidance).toBe(
      'keep more room and reopen slowly.',
    )
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.eventPointers.rationaleTags).toEqual(
      expect.arrayContaining(['quiet-companionship', 'timing:lower-pressure-opening']),
    )
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.residentLive2DExpressionBias.slice(0, 3)).toEqual([
      'soft-gaze',
      'relaxed',
      'half-lid',
    ])
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.residentVrmExpressionBias).toEqual([
      'relaxed',
      'focus',
      'thinking',
    ])
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.residentLive2DResolvedExpression).toEqual({
      name: 'Soft Gaze',
      reason: 'preferred',
    })
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.residentVrmResolvedExpression).toEqual({
      name: 'calm',
      reason: 'preferred',
    })
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.reasonTags).toEqual(
      expect.arrayContaining(['measured-return']),
    )
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.signature).toBeNull()
    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: {
        predicted: 'Soft Gaze',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        bodyDriverSegmentId: null,
        faceDriverCue: null,
        faceDriverSegmentId: null,
        faceDriverSource: null,
        lipsyncDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSegmentId: null,
        motionDriverSource: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        reasonTags: [],
        residentMode: null,
        signature: null,
        voiceDriverSegmentId: null,
      },
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        bodyDriverSegmentId: null,
        faceDriverCue: null,
        faceDriverSegmentId: null,
        faceDriverSource: null,
        lipsyncDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSegmentId: null,
        motionDriverSource: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        reasonTags: [],
        residentMode: null,
        signature: null,
        voiceDriverSegmentId: null,
      },
    })
    expect(diagnostics.snapshot.value.speech.alerts).toEqual([
      {
        severity: 'info',
        code: 'renderer-live2d-pending',
        message: 'Live2D resident prediction has not been applied yet.',
      },
      {
        severity: 'info',
        code: 'renderer-vrm-pending',
        message: 'VRM resident prediction has not been applied yet.',
      },
    ])
  })

  it('publishes same-her audible-return continuity metadata directly on companionshipTransition when the active cue already carries that living line', () => {
    const now = Date.now()
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      live2dExecutionDiagnostics: ref(null),
      live2dRuntimeCapabilities: ref({
        supportsExpressionOverride: true,
        supportsLookAt: true,
        supportsLipSync: true,
        supportsMotionFade: true,
      } as any),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'cooldown',
        performance: {
          ...createIdleStageEmbodimentPerformanceState().performance,
          baseEmotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          emphasis: 1,
        },
        activeCue: {
          id: 'segment-same-her-transition-1',
          index: 0,
          startOffset: 0,
          endOffset: 9,
          text: '我还沿着这条线在这里。',
          emotion: 'thinking',
          gestureWeight: 0.26,
          facialWeight: 0.44,
          prosodyWeight: 0.28,
          beatWeight: 0.2,
          mouthWeight: 0.18,
          headWeight: 0.18,
          facialHoldMs: 340,
          actionHoldMs: 280,
          emotionHoldMs: 360,
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
            signature: 'embodiment:audible-same-her-line',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 340,
            live2dMotionFollowThroughMs: 420,
            vrmExpressionBlendMs: 360,
            vrmActionFadeMs: 280,
          },
        },
        residentPerformance: {
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
        } as any,
      }),
      playbackTelemetry: ref(null),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      visualPresenceState: ref({
        watchMode: 'companionship',
        currentBodyState: 'softened-return',
        continuityMode: 'carry-forward',
        runtimeThought: null,
        residentPerformance: {
          reasonTags: ['measured-return', 'embodiment:body-lipsync-voice-rejoin'],
        },
        currentScene: null,
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        attention: null,
        workingMemoryEpisodes: [],
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      } as any),
      vrmExecutionDiagnostics: ref(null),
      vrmRuntimeCapabilities: ref({
        supportsExpressions: true,
        supportsLookAt: true,
        supportsLipSync: true,
        supportsMotionFade: true,
      } as any),
      digitalLifeSpineDigest: ref({
        runtime: {
          activeThreadId: 'thread-1',
          activeThreadTitle: 'same-her',
          preferredPresence: 'companionship',
          selectedAction: 'steady_focus',
        },
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'keep the same living line audible while the body rejoins',
            openingGuidance: 'keep more room and reopen slowly.',
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.reasonTags).toEqual([
      'embodiment:body-lipsync-voice-rejoin',
    ])
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.signature).toBe(
      'embodiment:audible-same-her-line',
    )
  })

  it('keeps live2d renderer pending when only voice has returned and the current-segment lip sync has not visually rejoined yet', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-live2d-voice-before-lipsync-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        prosodyAuthority: {
          segmentId: 'segment-live2d-voice-before-lipsync-1',
          provenance: 'authority-bound',
          source: 'prosody-authority',
          mode: 'energy-phoneme-hybrid',
          cueProsodyWeight: 0.28,
          cueMouthWeight: 0.34,
          cueHeadWeight: 0.22,
          visemePeakWeight: 0.62,
        },
        drivers: {
          body: null,
          face: null,
          motion: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-live2d-voice-before-lipsync-1',
            continuityHoldMs: 0,
            visemeHints: [
              {
                segmentId: 'segment-live2d-voice-before-lipsync-1',
                viseme: 'I',
                weight: 0.48,
                source: 'prosody-authority',
                confidence: 0.91,
              },
            ],
          },
          voice: null,
        },
      })),
      live2dRuntimeCapabilities: ref({
        supportedExpressionNames: ['Soft Gaze'],
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: ['soft-gaze'],
        supportedActions: [],
      } as any),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'idle',
        residentPerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'calm',
          emphasis: 0,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.75,
            consonantPrecision: 0.84,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.rendererAlignment.live2d).toEqual({
      predicted: 'Soft Gaze',
      actual: null,
      reason: 'preferred',
      status: 'predicted-only',
      driftKind: 'resident-not-yet-applied',
      bodyDriverSegmentId: null,
      faceDriverCue: null,
      faceDriverSegmentId: null,
      faceDriverSource: null,
      lipsyncDriverSegmentId: null,
      motionDriverCue: null,
      motionDriverSegmentId: null,
      motionDriverSource: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      reasonTags: [],
      residentMode: null,
      signature: null,
      voiceDriverSegmentId: 'segment-live2d-voice-before-lipsync-1',
    })
    expect(diagnostics.snapshot.value.speech.alerts).toEqual([
      {
        severity: 'info',
        code: 'renderer-live2d-pending',
        message: 'Live2D resident prediction has not been applied yet.',
      },
      {
        severity: 'warn',
        code: 'lipsync-mouth-proof-missing',
        message: 'Lip sync is leading this segment, but no renderer mouth execution proof is visible yet.',
      },
      {
        severity: 'warn',
        code: 'cross-modal-partial-lane-dominance',
        message: 'Two embodiment lanes are still aligned with the active same-her segment, but full cross-modal continuity has already narrowed.',
      },
    ])
    expect(diagnostics.snapshot.value.speech.alerts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'renderer-live2d-partial-recovery',
      }),
    ]))
  })

  it('keeps body+voice-only same-her continuity on companionshipTransition when resident carry is already audible before lipsync returns', () => {
    const now = Date.now()
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      live2dExecutionDiagnostics: ref(null),
      live2dRuntimeCapabilities: ref({
        supportsExpressionOverride: true,
        supportsLookAt: true,
        supportsLipSync: true,
        supportsMotionFade: true,
      } as any),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'cooldown',
        performance: {
          ...createIdleStageEmbodimentPerformanceState().performance,
          baseEmotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          emphasis: 1,
        },
        residentPerformance: {
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
        } as any,
      }),
      playbackTelemetry: ref(null),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      visualPresenceState: ref({
        watchMode: 'companionship',
        currentBodyState: 'softened-return',
        continuityMode: 'carry-forward',
        runtimeThought: null,
        residentPerformance: {
          reasonTags: ['measured-return', 'embodiment:audible-same-her-line', 'embodiment:body+voice-only'],
        },
        currentScene: null,
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        attention: null,
        workingMemoryEpisodes: [],
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      } as any),
      vrmExecutionDiagnostics: ref(null),
      vrmRuntimeCapabilities: ref({
        supportsExpressions: true,
        supportsLookAt: true,
        supportsLipSync: true,
        supportsMotionFade: true,
      } as any),
      digitalLifeSpineDigest: ref({
        runtime: {
          activeThreadId: 'thread-1',
          activeThreadTitle: 'same-her',
          preferredPresence: 'companionship',
          selectedAction: 'steady_focus',
        },
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'keep the same living line audible while the resident body line holds first',
            openingGuidance: 'keep more room and reopen slowly.',
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.reasonTags).toEqual([
      'measured-return',
      'embodiment:audible-same-her-line',
      'embodiment:body+voice-only',
    ])
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.signature).toBe(
      'embodiment:audible-same-her-line',
    )
  })

  it('treats a signature-only still-voiced motion-line carry as measured-return continuity instead of thinning it into ordinary quiet companionship', () => {
    const now = Date.now()
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      live2dExecutionDiagnostics: ref(null),
      live2dRuntimeCapabilities: ref({
        supportsExpressionOverride: true,
        supportsLookAt: true,
        supportsLipSync: true,
        supportsMotionFade: true,
      } as any),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'cooldown',
        variationToken: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
        performance: {
          ...createIdleStageEmbodimentPerformanceState().performance,
          baseEmotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          emphasis: 0,
        },
        residentPerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'calm',
          emphasis: 0,
        } as any,
        activeCue: {
          id: 'segment-signature-only-still-voiced-motion-line-diagnostics',
          index: 0,
          startOffset: 0,
          endOffset: 16,
          text: '我还顺着这条动作和声音线在这里。',
          emotion: 'thinking',
          gestureWeight: 0.1,
          facialWeight: 0.18,
          prosodyWeight: 0.14,
          beatWeight: 0.08,
          mouthWeight: 0.12,
          headWeight: 0.08,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          facialCue: 'soft-gaze',
          actionCue: null,
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
          rendererHints: {
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 380,
            vrmExpressionBlendMs: 340,
            vrmActionFadeMs: 240,
          },
        },
      }),
      playbackTelemetry: ref(null),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      visualPresenceState: ref({
        watchMode: 'companionship',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 180_000,
        runtimeThought: null,
        residentPerformance: {
          reasonTags: ['quiet-companionship'],
        },
        currentScene: null,
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        attention: null,
        workingMemoryEpisodes: [],
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      } as any),
      vrmExecutionDiagnostics: ref(null),
      vrmRuntimeCapabilities: ref({
        supportsExpressions: true,
        supportsLookAt: true,
        supportsLipSync: true,
        supportsMotionFade: true,
      } as any),
      digitalLifeSpineDigest: ref({
        runtime: {
          activeThreadId: 'thread-1',
          activeThreadTitle: 'same-her',
          preferredPresence: 'companionship',
          selectedAction: 'steady_focus',
        },
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'keep the same living line settling through motion and voice before widening again',
            openingGuidance: 'keep more room and reopen slowly.',
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.residentMode).toBe(
      'measured-return',
    )
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.signature).toBe(
      'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
    )
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.settleSummary).toContain(
      'mode=measured-return',
    )
  })

  it('normalizes a vrm settle_idle resident action cue into the same canonical idle_settle diagnostics line as live2d', () => {
    const now = Date.now()
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      live2dExecutionDiagnostics: ref(null),
      live2dRuntimeCapabilities: ref(null),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'cooldown',
        performance: {
          ...createIdleStageEmbodimentPerformanceState().performance,
          baseEmotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'settle_idle',
          delivery: 'gentle',
          emphasis: 0,
        },
        residentPerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'settle_idle',
          delivery: 'gentle',
          emphasis: 0,
        } as any,
      }),
      playbackTelemetry: ref(null),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      visualPresenceState: ref({
        watchMode: 'companionship',
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 180_000,
        runtimeThought: null,
        residentPerformance: {
          reasonTags: ['quiet-companionship'],
        },
        currentScene: null,
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        attention: null,
        workingMemoryEpisodes: [],
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      } as any),
      vrmExecutionDiagnostics: ref(null),
      vrmRuntimeCapabilities: ref(null),
      digitalLifeSpineDigest: ref(null),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.performance.runtimeDynamics.residentActionCue).toBe('idle_settle')
    expect(diagnostics.snapshot.value.performance.runtimeDynamics.companionshipTransition.residentMode).toBe('quiet-companionship')
  })

  it('carries same-her renderer-hint proof into the speech driver summary so overlay loop diagnostics can keep face motion lipsync and voice on one living line', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 320,
        plannedDurationMs: 320,
        driftMs: 0,
        settleMs: 360,
        stopReason: null,
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-loop-same-her-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          bodySegmentMatched: true,
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        drivers: {
          body: {
            frameMode: 'measured-return',
            stillness: 0.82,
            gazeStability: 0.74,
            breathAmplitude: 0.24,
            expressivity: 0.26,
            segmentId: 'segment-loop-same-her-1',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.44,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.92,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-loop-same-her-1',
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.28,
            holdMs: 260,
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-loop-same-her-1',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-loop-same-her-1',
            continuityHoldMs: 240,
            visemeHints: [
              { segmentId: 'segment-loop-same-her-1', viseme: 'I', weight: 0.36, source: 'prosody-authority', confidence: 0.9 },
            ],
          },
          voice: null,
        },
        cue: {
          id: 'segment-loop-same-her-1',
          index: 0,
          text: '我还沿着同一条生命线在这里。',
          startOffset: 0,
          endOffset: 180,
          emotion: 'thinking',
          prosodyWeight: 0.34,
          beatWeight: 0.28,
          mouthWeight: 0.24,
          headWeight: 0.22,
          gestureWeight: 0.26,
          facialWeight: 0.42,
          personaStyleSummary: null,
          facialHoldMs: 340,
          actionHoldMs: 280,
          emotionHoldMs: 360,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: undefined,
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
            signature: 'embodiment:audible-same-her-line',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 340,
            live2dMotionFollowThroughMs: 420,
            vrmExpressionBlendMs: 360,
            vrmActionFadeMs: 280,
          },
        },
      })),
      speechRenderState: ref({
        ...createIdleStageEmbodimentSpeechRenderState(),
        articulation: {
          ...createIdleStageEmbodimentSpeechArticulationState(),
          voice: {
            active: true,
            language: 'zh-CN',
            closureBias: 0.82,
            consonantPrecision: 0.88,
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    const loopSummary = buildStageEmbodimentLoopSurfaceSummary(
      diagnostics.snapshot.value.speech.driverSummary as any,
    )

    expect(loopSummary).toContain(
      'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin',
    )
    expect(loopSummary).toContain('signature=embodiment:audible-same-her-line')
  })

  it('keeps same-her loop continuity visible when only the vrm lipsync tail and cue snapshot remain after speech has already settled', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(null),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      vrmExecutionDiagnostics: ref({
        activeEmotion: null,
        activeFacialCue: null,
        activeMotion: null,
        activeBody: null,
        activeLipSync: {
          active: false,
          dominantViseme: 'I',
          dominantWeight: 0.41,
          segmentId: 'segment-vrm-tail-same-her-1',
        },
        activeVoice: null,
        cue: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['ObserveSoft'],
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
          reasonTags: ['embodiment:audible-same-her-line'],
          signature: 'embodiment:audible-same-her-line',
          vrmActionFadeMs: 260,
          vrmExpressionBlendMs: 320,
        },
      } satisfies VrmExecutionDiagnosticsSnapshot),
      digitalLifeSpineDigest: ref({
        runtime: {
          activeThreadId: 'thread-1',
          activeThreadTitle: 'same-her',
          preferredPresence: 'companionship',
          selectedAction: 'steady_focus',
        },
        proactive: {
          personaBias: {
            manifestationCadenceSummary: 'keep the same cautious line lightly audible while the mouth tail settles',
            openingGuidance: 'reopen slowly and keep room.',
          },
        },
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.driverSummary?.voiceAuthority?.segmentId).toBe(
      'segment-vrm-tail-same-her-1',
    )
    expect(diagnostics.snapshot.value.speech.rendererAlignment.vrm?.voiceDriverSegmentId).toBe(
      'segment-vrm-tail-same-her-1',
    )

    const loopSummary = buildStageEmbodimentLoopSurfaceSummary(
      diagnostics.snapshot.value.speech.driverSummary as any,
    )

    expect(loopSummary).toContain('continuity=embodiment:audible-same-her-line')
    expect(loopSummary).toContain('signature=embodiment:audible-same-her-line')
    expect(loopSummary).toContain('lane=lipsync+voice-only')
  })

  it('classifies renderer drift when predicted and actual live2d expressions diverge', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      live2dExecutionDiagnostics: ref({
        activeExpression: {
          name: 'Focus Inspect',
          reason: 'preferred',
          score: 9.6,
          segmentId: 'segment-live2d-drift-1',
        },
        activeLipSync: null,
        activeMotion: null,
        activeBody: null,
        activeVoice: null,
        cue: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          preferredExpressionAliases: ['Soft Gaze'],
          preferredMotionAliases: [],
          residentMode: null,
          preferredBlinkCadence: null,
          preferredGazeMode: null,
          preferredPauseMode: null,
          preferredLipsyncMode: null,
          preferredVoiceMode: null,
          preferredPacingMode: null,
          reasonTags: [],
          signature: null,
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 0,
        },
      }),
      live2dRuntimeCapabilities: ref({
        supportedExpressionNames: ['Soft Gaze', 'Focus Inspect'],
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
      }),
      performanceState: ref({
        ...createIdleStageEmbodimentPerformanceState(),
        phase: 'idle',
        residentPerformance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'calm',
          emphasis: 0,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: {
        predicted: 'Soft Gaze',
        actual: 'Focus Inspect',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        bodyDriverSegmentId: null,
        faceDriverCue: null,
        faceDriverSegmentId: null,
        faceDriverSource: null,
        lipsyncDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSegmentId: null,
        motionDriverSource: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        reasonTags: [],
        residentMode: null,
        signature: null,
        voiceDriverSegmentId: null,
      },
      vrm: null,
    })
    expect(diagnostics.snapshot.value.speech.alerts).toEqual([
      {
        severity: 'warn',
        code: 'renderer-live2d-drift',
        message: 'Live2D actual expression diverged from resident predicted expression.',
      },
    ])
  })

  it('attaches face-driver authority to renderer alignment when playback face authority is present', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(createPlaybackTelemetryFixture({
        actualDurationMs: 240,
        plannedDurationMs: 240,
        driftMs: 0,
        settleMs: 280,
        stopReason: null,
        rendererTarget: 'live2d',
        drivers: {
          body: null,
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-driver-face-1',
            source: 'prosody-authority',
            confidence: 0.94,
          },
          motion: null,
          lipsync: null,
          voice: null,
        },
      } as any)),
      live2dExecutionDiagnostics: ref({
        activeExpression: {
          name: 'Focus Inspect',
          reason: 'preferred',
          score: 9.6,
          segmentId: 'segment-driver-face-1',
        },
        activeLipSync: null,
        activeMotion: null,
        activeBody: null,
        activeVoice: null,
        cue: {
          emotion: 'thinking',
          facialCue: 'focused',
          preferredExpressionAliases: ['Focus Inspect'],
          preferredMotionAliases: [],
          residentMode: null,
          preferredBlinkCadence: null,
          preferredGazeMode: null,
          preferredPauseMode: null,
          preferredLipsyncMode: null,
          preferredVoiceMode: null,
          preferredPacingMode: null,
          reasonTags: [],
          signature: null,
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 0,
        },
      }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: {
        predicted: null,
        actual: 'Focus Inspect',
        reason: 'runtime-expression',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        bodyDriverSegmentId: null,
        faceDriverCue: 'focused',
        faceDriverSegmentId: 'segment-driver-face-1',
        faceDriverSource: 'prosody-authority',
        lipsyncDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSegmentId: null,
        motionDriverSource: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        reasonTags: [],
        residentMode: null,
        signature: null,
        voiceDriverSegmentId: null,
      },
      vrm: null,
    })
    expect(diagnostics.snapshot.value.speech.alerts).toEqual([
      {
        severity: 'warn',
        code: 'renderer-live2d-runtime-only',
        message: 'Live2D is showing a runtime expression without a resident predicted expression.',
      },
    ])
  })

  it('clones playback telemetry drivers so diagnostics authority snapshots do not share mutable driver references', () => {
    const playbackTelemetry = {
      actualDurationMs: 220,
      plannedDurationMs: 220,
      driftMs: 0,
      settleMs: 220,
      stopReason: null,
      rendererTarget: 'vrm' as const,
      driverAuthority: {
        segmentId: 'segment-vrm-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['face', 'motion', 'lipsync'] as Array<'face' | 'motion' | 'lipsync'>,
        sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
      cue: null,
      drivers: {
        body: null,
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          intensity: 0.52,
          holdMs: 320,
          source: 'prosody-authority',
          confidence: 0.94,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          segmentId: 'segment-vrm-1',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'playing' as const,
          segmentId: 'segment-vrm-1',
          continuityHoldMs: 0,
          visemeHints: [
            { segmentId: 'segment-vrm-1', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 240,
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-vrm-1',
        },
        voice: null,
      },
    }

    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref(playbackTelemetry as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    const snapshotPlaybackTelemetry = diagnostics.snapshot.value.speech.playbackTelemetry
    expect(snapshotPlaybackTelemetry?.drivers).toEqual(playbackTelemetry.drivers)
    expect(snapshotPlaybackTelemetry?.drivers).not.toBe(playbackTelemetry.drivers)
    expect(snapshotPlaybackTelemetry?.drivers?.body).toBeNull()
    expect(snapshotPlaybackTelemetry?.drivers?.face).not.toBe(playbackTelemetry.drivers.face)
    expect(snapshotPlaybackTelemetry?.drivers?.motion).not.toBe(playbackTelemetry.drivers.motion)
    expect(snapshotPlaybackTelemetry?.drivers?.lipsync).not.toBe(playbackTelemetry.drivers.lipsync)
    expect(snapshotPlaybackTelemetry?.drivers?.lipsync?.visemeHints).not.toBe(playbackTelemetry.drivers.lipsync.visemeHints)
  })
})
