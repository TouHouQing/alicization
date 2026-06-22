import type { AlicizationDigitalLifeSpineDigest } from '@proj-alicization/stage-shared'

import type { Live2DRuntimeCapabilitySnapshot } from '../../../../stage-ui-live2d/src/composables/live2d/expression-runtime'
import type { VrmResolvedRuntimeCapabilitySnapshot } from '../../../../stage-ui-three/src/composables/vrm/capabilities'
import type { VrmExecutionDiagnosticsSnapshot } from '../../../../stage-ui-three/src/composables/vrm/execution-diagnostics'

import {

  createIdleStageEmbodimentPerformanceState,
  createIdleStageEmbodimentPresencePostureState,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useStageEmbodimentDiagnostics } from './use-stage-embodiment-diagnostics'

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
      playbackTelemetry: ref({
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
        },
      }),
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
        summary: 'active-dialogue=hot | continuity=0.67 | companionship=0.81',
      }),
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
        activeMotion: {
          group: 'ObserveSoft',
          index: 1,
          segmentId: 'segment-zh-focus-1',
        },
        cue: {
          emotion: 'thinking',
          facialCue: 'focus',
          preferredExpressionAliases: ['CalmInspect'],
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
      activeExpression: {
        name: 'CalmInspect',
        reason: 'preferred',
        score: 11.4,
        segmentId: 'segment-zh-focus-1',
      },
      activeMotion: {
        group: 'ObserveSoft',
        index: 1,
        segmentId: 'segment-zh-focus-1',
      },
      cue: {
        emotion: 'thinking',
        facialCue: 'focus',
        preferredExpressionAliases: ['CalmInspect'],
        live2dFacialReleaseMs: 320,
        live2dMotionFollowThroughMs: 440,
      },
    })
    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: {
        predicted: null,
        actual: 'CalmInspect',
        reason: 'preferred',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        driverCue: null,
        driverSource: null,
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
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['relaxed', 'focus'],
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
      cue: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        preferredExpressionAliases: ['relaxed', 'focus'],
        vrmExpressionBlendMs: 360,
      },
    })
    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: null,
      vrm: {
        predicted: null,
        actual: 'calm',
        reason: 'runtime-emotion',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        driverCue: null,
        driverSource: null,
      },
    })
  })

  it('surfaces chinese-first speech style and viseme telemetry for tuning', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref({
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
        },
      }),
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
      },
      motion: {
        cue: 'idle_gentle_nod',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-1',
      },
      lipsync: {
        cue: 'U',
        source: 'prosody-authority',
        confidence: 0.89,
        segmentId: 'segment-1',
        mode: 'energy-phoneme-hybrid',
      },
      voice: null,
    })
    expect(diagnostics.snapshot.value.speech.driverExecutionSummary).toBe(
      'face=thinking/focused@0.46 hold=420 pre=steady-inhale post=eyes-soften src=prosody-authority conf=0.94 | motion=idle_gentle_nod mode=attentive idle=idle_settle@0.32 hold=180 src=timeline-projection conf=0.88 | lipsync=energy-phoneme-hybrid phase=playing',
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
      playbackTelemetry: ref({
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
        },
      }),
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
      },
      motion: {
        cue: 'idle_gentle_nod',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-2',
      },
      lipsync: {
        cue: 'I',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-2',
        mode: 'energy-phoneme-hybrid',
      },
      voice: null,
    })
  })

  it('surfaces playback cue renderer authority in diagnostics snapshot telemetry', () => {
    const diagnostics = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      playbackTelemetry: ref({
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
          body: null,
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
            continuityHoldMs: 0,
            visemeHints: [
              { segmentId: 'segment-explicit-playback-cue-metadata', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
            ],
          },
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
      } as any),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
    })

    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.cue).toEqual({
      id: 'segment-explicit-playback-cue-metadata',
      text: '继续看这里。',
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
      matchedDrivers: [],
      matchedSources: [],
      bindingSummary: 'target=vrm | drivers=n/a | sources=n/a | matches=face:n/a motion:n/a lipsync:n/a',
      matchSummary: 'face:n/a motion:n/a lipsync:n/a',
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      authorityMismatchDisplay: null,
      settleSummary: 'fallback-derived | segment=n/a | target=vrm | drivers=n/a | sources=n/a',
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
      playbackTelemetry: ref({
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
        },
      }),
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
      playbackTelemetry: ref({
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
        },
      } as any),
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
      },
      motion: {
        cue: 'inspect_follow',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-vrm-1',
      },
      lipsync: {
        cue: 'I',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-vrm-1',
        mode: 'energy-phoneme-hybrid',
      },
      voice: null,
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
      playbackTelemetry: ref({
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
        },
        cue: {
          id: 'segment-authority-drift-1',
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
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 320,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          rendererHints: null,
          rendererSettle: null,
        },
      }),
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
      bindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=body:no face:no motion:no lipsync:yes voice:n/a',
      matchSummary: 'body:no face:no motion:no lipsync:yes voice:n/a',
      authorityMismatchSummary: 'body-mismatch, face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '身体、表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
      authorityMismatchDisplay: '身体、表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
      settleSummary: 'authority-bound | segment=segment-authority-drift-1 | target=vrm | drivers=lipsync | sources=prosody-authority',
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
    }
    const vrmRuntimeCapabilities: VrmResolvedRuntimeCapabilitySnapshot = {
      supportedExpressionNames: ['default', 'calm', 'focus'],
      supportedBaseEmotions: ['neutral', 'thinking', 'tired'],
      supportedFacialCues: [],
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
    expect(diagnostics.snapshot.value.speech.rendererAlignment).toEqual({
      live2d: {
        predicted: 'Soft Gaze',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        driverCue: null,
        driverSource: null,
      },
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        driverCue: null,
        driverSource: null,
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
        activeMotion: null,
        cue: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          preferredExpressionAliases: ['Soft Gaze'],
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 0,
        },
      }),
      live2dRuntimeCapabilities: ref({
        supportedExpressionNames: ['Soft Gaze', 'Focus Inspect'],
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
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
        driverCue: null,
        driverSource: null,
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
      playbackTelemetry: ref({
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
        },
      } as any),
      live2dExecutionDiagnostics: ref({
        activeExpression: {
          name: 'Focus Inspect',
          reason: 'preferred',
          score: 9.6,
          segmentId: 'segment-driver-face-1',
        },
        activeMotion: null,
        cue: {
          emotion: 'thinking',
          facialCue: 'focused',
          preferredExpressionAliases: ['Focus Inspect'],
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
        reason: 'preferred',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        driverCue: 'focused',
        driverSource: 'prosody-authority',
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
    expect(snapshotPlaybackTelemetry?.drivers?.face).not.toBe(playbackTelemetry.drivers.face)
    expect(snapshotPlaybackTelemetry?.drivers?.motion).not.toBe(playbackTelemetry.drivers.motion)
    expect(snapshotPlaybackTelemetry?.drivers?.lipsync).not.toBe(playbackTelemetry.drivers.lipsync)
    expect(snapshotPlaybackTelemetry?.drivers?.lipsync?.visemeHints).not.toBe(playbackTelemetry.drivers.lipsync.visemeHints)
  })
})
