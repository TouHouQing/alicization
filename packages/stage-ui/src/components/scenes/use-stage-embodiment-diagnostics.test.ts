import {
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentPresencePostureState,
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useStageEmbodimentDiagnostics } from './use-stage-embodiment-diagnostics'

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
        drivers: {
          face: {
            emotion: 'happy',
            facialCue: 'smile',
            intensity: 0.8,
            preUtteranceCue: 'soft-breath',
            postUtteranceCue: 'settle-smile',
            segmentId: 'segment-1',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'idle',
            segmentId: 'segment-1',
            visemeHints: [],
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'wave',
            intensity: 0.7,
            holdMs: 320,
            segmentId: 'segment-1',
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
      drivers: {
        face: {
          emotion: 'happy',
          facialCue: 'smile',
          intensity: 0.8,
          preUtteranceCue: 'soft-breath',
          postUtteranceCue: 'settle-smile',
          segmentId: 'segment-1',
        },
        lipsync: {
          mode: 'energy-phoneme-hybrid',
          playbackPhase: 'idle',
          segmentId: 'segment-1',
          visemeHints: [],
        },
        motion: {
          idleBase: 'idle_settle',
          attentionMode: 'attentive',
          actionCue: 'wave',
          intensity: 0.7,
          holdMs: 320,
          segmentId: 'segment-1',
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
          face: null,
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-1',
            visemeHints: [{ segmentId: 'segment-1', viseme: 'A', weight: 0.78, source: 'prosody-authority', confidence: 0.82 }],
          },
          motion: null,
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
    expect(diagnostics.snapshot.value.speech.playbackTelemetry?.drivers?.lipsync?.visemeHints).toEqual([
      { segmentId: 'segment-1', viseme: 'A', weight: 0.78, source: 'prosody-authority', confidence: 0.82 },
    ])
  })
})
