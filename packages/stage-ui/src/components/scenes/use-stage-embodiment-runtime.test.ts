import {
  buildAlicizationDialogueSpeechTimeline,
  normalizeAlicizationEmbodimentSpeechPlan,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'
import { computed, effectScope, nextTick, ref } from 'vue'

import { vi } from 'vitest'

import type { CharacterPerformanceCapabilitiesManifest } from '../../stores/alicization-bridge'
import { useStageEmbodimentRuntime } from './use-stage-embodiment-runtime'

vi.mock('@proj-alicization/model-driver-lipsync', () => ({
  createLive2DLipSync: vi.fn(),
}))

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
vi.stubGlobal('cancelAnimationFrame', vi.fn())

function createManifest(): CharacterPerformanceCapabilitiesManifest {
  return {
    renderer: 'vrm' as const,
    supportedBaseEmotions: ['neutral', 'thinking', 'concerned', 'happy'],
    supportedFacialCues: [
      { key: 'focused', label: 'Focused', description: 'Focused face', source: 'preset' as const, affectsMouth: false },
      { key: 'soft-gaze', label: 'Soft Gaze', description: 'Soft gaze', source: 'preset' as const, affectsMouth: false },
    ],
    supportedActions: [
      { key: 'idle_gentle_nod', label: 'Gentle Nod', description: 'gentle nod', source: 'builtin' as const },
      { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'builtin' as const },
    ],
    supportsLookAt: true,
    supportsVisemeLipSync: true,
    supportsMicroDynamics: true,
    embodimentHints: null,
  }
}

function createDispatcherHarness() {
  const controllers: any[] = []
  return {
    dispatcher: {
      registerEmbodimentController(controller: any) {
        controllers.push(controller)
        return () => {
          const index = controllers.indexOf(controller)
          if (index >= 0)
            controllers.splice(index, 1)
        }
      },
      setEmbodimentScriptBuilder() {
        return () => {}
      },
    },
    getController(channel: string) {
      return controllers.find(controller => controller.channel === channel)
    },
  }
}

describe('useStageEmbodimentRuntime', () => {
  it('keeps chinese runtime embodiment authority coherent from speech planning through playback telemetry', async () => {
    const harness = createDispatcherHarness()
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentRuntime({
      audioContext: {
        createAnalyser: () => ({
          fftSize: 2048,
          getByteTimeDomainData: () => {},
        }),
        resume: async () => {},
        state: 'running',
      } as unknown as AudioContext,
      clampPerformance: performance => performance,
      currentMotion: ref({ group: 'Idle', index: 0 }),
      dispatcher: harness.dispatcher as any,
      enqueueEmotion: () => {},
      focusAt: ref({ x: 640, y: 360 }),
      live2dActionCapabilities: computed(() => []),
      mouthOpenSize: ref(0),
      paused: ref(false),
      performanceManifest: computed(() => createManifest()),
      pitch: ref(0),
      rate: ref(1),
      resolveClampedPresencePulsePerformance: () => ({
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      }),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: async () => {},
      stageBounds: ref({ width: 1280, height: 720 }),
      stageModelRenderer: ref('vrm'),
      vrmActionBindings: ref([]),
    }))!

    runtime.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后确认了吗？',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'idle_gentle_nod',
        delivery: 'gentle',
        emphasis: 1,
      },
    }))
    runtime.primeDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-runtime-e2e',
      emotion: 'thinking',
      mode: 'speaking',
      postureHint: 'attentive',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'idle_gentle_nod',
        delivery: 'gentle',
        emphasis: 1,
      },
      speechStyle: {
        pitchDelta: 0,
        rateMultiplier: 1,
      },
      voice: {
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.54,
        cadence: 0.62,
      },
      lipSync: {
        mode: 'hybrid',
        visemeBias: 0.66,
        energyBias: 0.34,
        mouthScale: 1.04,
        continuityHoldMs: 180,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'focused',
        expressionMode: 'hold',
        intensity: 0.46,
        holdMs: 420,
      },
      action: {
        actionCue: 'idle_gentle_nod',
        actionMode: 'segment',
        intensity: 0.32,
        holdMs: 180,
      },
      motor: {
        stillness: 0.42,
        expressivity: 0.58,
        gaze: { focus: 0.72, stability: 0.76, azimuth: 0, elevation: 0 },
        head: { yaw: 0, pitch: 0, roll: 0, nod: 0.18 },
        breath: { amplitude: 0.3, pace: 0.42 },
        facial: {
          eyeOpenness: 0.56,
          browLift: 0.08,
          browTension: 0.22,
          cheekLift: 0.14,
          mouthSpread: 0.18,
          mouthRound: 0.26,
          jawOpenBias: 0.24,
        },
        body: {
          sway: 0.04,
          lean: -0.02,
          openness: 0.46,
          settle: 0.68,
        },
      },
      frames: [{
        id: 'segment-question',
        index: 0,
        startOffset: 0,
        endOffset: 9,
        text: '然后确认了吗？',
        mode: 'speaking',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.54,
          cadence: 0.62,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.66,
          energyBias: 0.34,
          mouthScale: 1.04,
          continuityHoldMs: 180,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 420,
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
          },
        },
        action: {
          actionCue: 'idle_gentle_nod',
          actionMode: 'segment',
          intensity: 0.32,
          holdMs: 180,
          rendererHints: {
            preferredMotionAliases: ['ObserveSoft'],
          },
        },
        motor: {
          stillness: 0.42,
          expressivity: 0.58,
          gaze: { focus: 0.72, stability: 0.76, azimuth: 0, elevation: 0 },
          head: { yaw: 0, pitch: 0, roll: 0, nod: 0.18 },
          breath: { amplitude: 0.3, pace: 0.42 },
          facial: {
            eyeOpenness: 0.56,
            browLift: 0.08,
            browTension: 0.22,
            cheekLift: 0.14,
            mouthSpread: 0.18,
            mouthRound: 0.26,
            jawOpenBias: 0.24,
          },
          body: {
            sway: 0.04,
            lean: -0.02,
            openness: 0.46,
            settle: 0.68,
          },
        },
      }],
    } as any)

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-runtime-e2e',
      rendererTarget: 'live2d' as const,
      replyText: '先看这里，然后确认了吗？',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
        segments: [{
          id: 'segment-question',
          index: 0,
          text: '然后确认了吗？',
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 260,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 260,
      }),
      facePlan: {
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        speakingCues: [{
          segmentId: 'segment-question',
          emotion: 'thinking' as const,
          facialCue: 'focused',
          intensity: 0.46,
          holdMs: 420,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          source: 'prosody-authority' as const,
          confidence: 0.94,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        attentionMode: 'attentive' as const,
        actionBursts: [{
          segmentId: 'segment-question',
          actionCue: 'idle_gentle_nod',
          intensity: 0.32,
          holdMs: 180,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [
          { segmentId: 'segment-question', viseme: 'I' as const, weight: 0.35, source: 'prosody-authority' as const, confidence: 0.94 },
          { segmentId: 'segment-question', viseme: 'closed' as const, weight: 0.75, source: 'prosody-authority' as const, confidence: 0.94 },
        ],
      },
    }

    const preview = runtime.previewSpeechSegment({
      intentId: 'intent-runtime-e2e',
      streamId: 'stream-runtime-e2e',
      segmentId: 'segment-question',
      text: '然后确认了吗？',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: script,
      },
    })

    expect(preview?.cue?.facialCue).toBe('focused')
    expect(preview?.cue?.actionCue).toBe('idle_gentle_nod')

    let startListener: ((event: { item: any, startedAt: number }) => void) | undefined
    runtime.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    startListener?.({
      item: {
        id: 'playback-runtime-e2e',
        streamId: 'stream-runtime-e2e',
        intentId: 'intent-runtime-e2e',
        segmentId: 'segment-question',
        ownerId: 'alice',
        priority: 0,
        text: '然后确认了吗？',
        special: null,
        continuityHoldMs: 180,
        audio: null,
        createdAt: 0,
        cue: preview?.cue ?? null,
        digitalLifeFrame: preview?.digitalLifeFrame ?? null,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 100,
    })
    await nextTick()

    expect(preview?.cue?.facialCue).toBeTruthy()
    expect(preview?.cue?.actionCue).toBeTruthy()
    expect(runtime.performanceState.value.performance.facialCue).toBe(preview?.cue?.facialCue)
    expect(runtime.performanceState.value.activeFacialCueSource).toBe('segment')
    expect(runtime.performanceState.value.performance.actionCue).toBe(preview?.cue?.actionCue)
    expect(runtime.performanceState.value.activeActionCueSource).toBe('segment')
    expect(runtime.performanceState.value.activeCueSource).toBe('segment')

    expect(runtime.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      facialCue: 'focused',
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(runtime.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      actionCue: 'idle_gentle_nod',
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(runtime.playbackTelemetry.value?.drivers.lipsync?.visemeHints).toEqual([
      { segmentId: 'segment-question', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-question', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.94 },
    ])
    expect(runtime.playbackTelemetry.value?.rendererTarget).toBe('live2d')
    expect((runtime.performanceState.value as any).driverRendererTarget).toBe('live2d')

    expect(runtime.diagnostics.value.speech.playbackTelemetry?.drivers?.face).toEqual(expect.objectContaining({
      facialCue: 'focused',
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(runtime.diagnostics.value.speech.playbackTelemetry?.rendererTarget).toBe('live2d')
    expect(runtime.diagnostics.value.speech.driverSummary).toEqual({
      rendererTarget: 'live2d',
      face: {
        cue: 'focused',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-question',
      },
      motion: {
        cue: 'idle_gentle_nod',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-question',
      },
      lipsync: {
        cue: 'I',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-question',
        mode: 'energy-phoneme-hybrid',
      },
    })

    scope.stop()
  })

  it('surfaces vrm renderer authority through runtime playback telemetry and diagnostics', async () => {
    const harness = createDispatcherHarness()
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentRuntime({
      audioContext: {
        createAnalyser: () => ({
          fftSize: 2048,
          getByteTimeDomainData: () => {},
        }),
        resume: async () => {},
        state: 'running',
      } as unknown as AudioContext,
      clampPerformance: performance => performance,
      currentMotion: ref({ group: 'Idle', index: 0 }),
      dispatcher: harness.dispatcher as any,
      enqueueEmotion: () => {},
      focusAt: ref({ x: 640, y: 360 }),
      live2dActionCapabilities: computed(() => []),
      mouthOpenSize: ref(0),
      paused: ref(false),
      performanceManifest: computed(() => createManifest()),
      pitch: ref(0),
      rate: ref(1),
      resolveClampedPresencePulsePerformance: () => ({
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      }),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: async () => {},
      stageBounds: ref({ width: 1280, height: 720 }),
      stageModelRenderer: ref('vrm'),
      vrmActionBindings: ref([]),
    }))!

    let startListener: ((event: { item: any, startedAt: number }) => void) | undefined
    runtime.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-runtime-vrm',
      rendererTarget: 'vrm' as const,
      replyText: '继续看这里。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'calm' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
        segments: [{
          id: 'segment-runtime-vrm',
          index: 0,
          text: '继续看这里。',
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 180,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 0,
        settleMs: 180,
      }),
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-runtime-vrm',
          emotion: 'thinking' as const,
          facialCue: 'focused',
          intensity: 0.56,
          holdMs: 320,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          source: 'prosody-authority' as const,
          confidence: 0.94,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        attentionMode: 'attentive' as const,
        actionBursts: [{
          segmentId: 'segment-runtime-vrm',
          actionCue: 'observe_focus',
          intensity: 0.4,
          holdMs: 220,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [
          { segmentId: 'segment-runtime-vrm', viseme: 'I' as const, weight: 0.35, source: 'prosody-authority' as const, confidence: 0.94 },
        ],
      },
    }

    const preview = runtime.previewSpeechSegment({
      intentId: 'intent-runtime-vrm',
      streamId: 'stream-runtime-vrm',
      segmentId: 'segment-runtime-vrm',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: script,
      },
    })

    startListener?.({
      item: {
        id: 'playback-runtime-vrm',
        streamId: 'stream-runtime-vrm',
        intentId: 'intent-runtime-vrm',
        segmentId: 'segment-runtime-vrm',
        ownerId: 'alice',
        priority: 0,
        text: '继续看这里。',
        special: null,
        continuityHoldMs: 180,
        audio: null,
        createdAt: 0,
        cue: preview?.cue ?? null,
        digitalLifeFrame: preview?.digitalLifeFrame ?? null,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 100,
    })
    await nextTick()

    expect(runtime.playbackTelemetry.value?.rendererTarget).toBe('vrm')
    expect((runtime.performanceState.value as any).driverRendererTarget).toBe('vrm')
    expect(runtime.diagnostics.value.speech.playbackTelemetry?.rendererTarget).toBe('vrm')
    expect(runtime.diagnostics.value.speech.driverSummary).toEqual({
      rendererTarget: 'vrm',
      face: {
        cue: 'focused',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-runtime-vrm',
      },
      motion: {
        cue: 'observe_focus',
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-runtime-vrm',
      },
      lipsync: {
        cue: 'I',
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-runtime-vrm',
        mode: 'energy-phoneme-hybrid',
      },
    })

    scope.stop()
  })

  it('restores vrm active cue semantics from embodimentScript metadata even without a scripted playback cue', async () => {
    const harness = createDispatcherHarness()
    const scope = effectScope()
    const runtime = scope.run(() => useStageEmbodimentRuntime({
      audioContext: {
        createAnalyser: () => ({
          fftSize: 2048,
          getByteTimeDomainData: () => {},
        }),
        resume: async () => {},
        state: 'running',
      } as unknown as AudioContext,
      clampPerformance: performance => performance,
      currentMotion: ref({ group: 'Idle', index: 0 }),
      dispatcher: harness.dispatcher as any,
      enqueueEmotion: () => {},
      focusAt: ref({ x: 640, y: 360 }),
      live2dActionCapabilities: computed(() => []),
      mouthOpenSize: ref(0),
      paused: ref(false),
      performanceManifest: computed(() => createManifest()),
      pitch: ref(0),
      rate: ref(1),
      resolveClampedPresencePulsePerformance: () => ({
        baseEmotion: 'neutral',
        emotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      }),
      resolvePresenceIntensity: (_emphasis, fallback) => fallback,
      speakFallback: async () => {},
      stageBounds: ref({ width: 1280, height: 720 }),
      stageModelRenderer: ref('vrm'),
      vrmActionBindings: ref([]),
    }))!

    let startListener: ((event: { item: any, startedAt: number }) => void) | undefined
    runtime.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-runtime-script-cue-recovery',
      rendererTarget: 'vrm' as const,
      replyText: '继续看这里。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'calm' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
        segments: [{
          id: 'segment-runtime-script-cue-recovery',
          index: 0,
          text: '继续看这里。',
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 260,
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 220,
            vrmExpressionBlendMs: 260,
          },
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 260,
      })!,
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-runtime-script-cue-recovery',
          emotion: 'thinking' as const,
          facialCue: 'focused',
          intensity: 0.58,
          holdMs: 320,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          source: 'prosody-authority' as const,
          confidence: 0.94,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [{
          segmentId: 'segment-runtime-script-cue-recovery',
          actionCue: 'observe_focus',
          intensity: 0.44,
          holdMs: 220,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [
          { segmentId: 'segment-runtime-script-cue-recovery', viseme: 'I' as const, weight: 0.35, source: 'prosody-authority' as const, confidence: 0.94 },
        ],
      },
    }

    const preview = runtime.previewSpeechSegment({
      intentId: 'intent-runtime-script-cue-recovery',
      streamId: 'stream-runtime-script-cue-recovery',
      segmentId: 'segment-runtime-script-cue-recovery',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: script,
      },
    })

    startListener?.({
      item: {
        id: 'playback-runtime-script-cue-recovery',
        streamId: 'stream-runtime-script-cue-recovery',
        intentId: 'intent-runtime-script-cue-recovery',
        segmentId: 'segment-runtime-script-cue-recovery',
        ownerId: 'alice',
        priority: 0,
        text: '继续看这里。',
        special: null,
        continuityHoldMs: 180,
        audio: null,
        createdAt: 0,
        cue: preview?.cue ?? null,
        digitalLifeFrame: preview?.digitalLifeFrame ?? null,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 100,
    })
    await nextTick()

    expect(runtime.performanceState.value.driverRendererTarget).toBe('vrm')
    expect(runtime.performanceState.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.performanceState.value.activeCueSource).toBe('segment')
    expect(runtime.performanceState.value.activeCue?.emotion).toBe('thinking')
    expect(runtime.performanceState.value.activeCue?.facialCue).toBe('focused')
    expect(runtime.performanceState.value.activeCue?.actionCue).toBe('observe_focus')
    expect(runtime.performanceState.value.activeCue?.rendererHints).toEqual({
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
    })
    expect(runtime.performanceState.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 420,
      vrmActionFadeMs: 220,
      vrmExpressionBlendMs: 260,
    })

    scope.stop()
  })

})
