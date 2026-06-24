import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationResidentPerformanceSnapshot,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import {
  buildAlicizationDialogueSpeechTimeline,
  normalizeAlicizationEmbodimentSpeechPlan,
} from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, nextTick, ref } from 'vue'

import { clearAlicizationBridge, setAlicizationBridge } from '../../stores/alicization-bridge'
import { useStageEmbodimentRuntime } from './use-stage-embodiment-runtime'

vi.mock('@proj-alicization/model-driver-lipsync', () => ({
  createLive2DLipSync: vi.fn(),
}))

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
vi.stubGlobal('cancelAnimationFrame', vi.fn())

function createAlicizationBridgeStub(overrides?: Partial<Parameters<typeof setAlicizationBridge>[0]>) {
  return {
    bootstrap: vi.fn(),
    getSoul: vi.fn(),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn(),
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn(),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn(),
    importLegacyMemory: vi.fn(),
    appendConversationTurn: vi.fn(),
    appendAuditLog: vi.fn(),
    realtimeExecute: vi.fn(),
    getSensorySnapshot: vi.fn().mockResolvedValue({
      sample: {
        collectedAt: Date.now(),
        time: { iso: '', local: '', timezone: 'UTC' },
        cpu: { usagePercent: 0, windowMs: 1000 },
        memory: { freeMB: 0, totalMB: 0, usagePercent: 0 },
      },
      stale: false,
      ageMs: 0,
      nextTickAt: null,
      running: true,
    }),
    ...overrides,
  } as any
}

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

function createResidentOnlyProjectClosureSpineDigest(
  updatedAt = Date.now(),
): AlicizationDigitalLifeSpineDigest {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      sceneSummary: 'same-her closure is still settling before anything reopens outward.',
      activeThreadId: 'thread-runtime-project-closure',
      activeThreadTitle: 'same-her closure',
      dominantMode: 'tracking',
      dominantDrive: 'stabilize',
      answerIntent: 'hold',
      preferredPresence: 'attentive',
      selectedAction: 'hold',
      updatedAt,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        memoryClosureSummary: null,
        primaryOpenLoop: 'voice and lipsync still need to rejoin the same living line before closeness widens again.',
        emotionalClosureCue: 'same-her repair seam: keep this return repair-before-closeness on the same living line before closeness widens again.',
      },
    },
    architecture: {
      operatingMode: 'observing',
      dominantSystem: 'memory',
      supportingSystems: ['dialogue'],
      governingFocus: 'keep the same living line steady',
      summary: 'same-her closure should stay inward before widening outward again.',
    },
    continuitySignal: null,
    proactive: {
      selectedAction: 'hold',
      preferredStyle: 'silent-observe',
      confidence: 0.72,
      shouldSpeak: false,
      activeThreadId: 'thread-runtime-project-closure',
      activeThreadTitle: 'same-her closure',
      dominantConcernKind: null,
      dominantConcernSummary: null,
      leadingGoalId: null,
      leadingGoalSummary: null,
      preferredPresence: 'attentive',
    },
    embodiment: null,
    memory: {
      summary: 'same-her closure is still open and should stay quieter before it widens again.',
      recentEpisodeSummary: 'same-her closure',
      recentEpisodeCount: 1,
      focusBeliefStatement: null,
      focusBeliefConfidence: null,
      leadingGoalSummary: null,
      dominantConcernSummary: null,
      reflectionSummary: null,
      reflectionPressure: null,
      recallMode: 'working-memory',
      recallSeed: null,
      thoughtThreadSummary: 'same-her closure',
    },
  }
}

function createRestProtectiveResidentPerformanceSnapshot(
  updatedAt: number,
): AlicizationResidentPerformanceSnapshot {
  return {
    version: 'resident-performance-v1',
    source: 'main-runtime',
    performance: {
      baseEmotion: 'tired',
      emotion: 'tired',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'gentle',
      emphasis: 1,
      residentMode: 'quiet-companionship',
      face: {
        residentMode: 'quiet-companionship',
      },
      action: {
        residentMode: 'quiet-companionship',
      },
    },
    embodiedPresence: 'concerned',
    stance: 'care',
    emotionalTension: 'late-night-drain',
    confidence: 0.82,
    reasonTags: ['rest-protective', 'quiet-companionship', 'timing:project-emotional-closure'],
    signature: 'resident|main-runtime|recovering|protective-watch|quiet-companionship|rest-protective',
    updatedAt,
  }
}

function createRestProtectiveRuntimeVisualPresenceState(
  updatedAt = Date.now(),
): AlicizationVisualPresenceStateSnapshot {
  return {
    currentBodyState: 'recovering',
    continuityMode: 'protective-watch',
    quietLineMs: 240_000,
    currentInwardPreoccupation: 'keep care present, but let rest protection hold the line inward until the body has more room again.',
    watchMode: 'recovering',
    currentScene: {
      workloadKind: 'chat',
      contentKind: 'chat',
      scenario: 'late-night-care',
      summary: 'rest-protective care should stay present, but the line should protect rest before widening again.',
      source: 'screen-semantic-summary',
      confidence: 0.74,
      target: null,
      beganAt: updatedAt - 8_000,
      lastSeenAt: updatedAt - 300,
    },
    attention: null,
    workingMemoryEpisodes: [],
    privateThought: {
      stance: 'care',
      confidence: 0.72,
      rationaleTags: ['companionship'],
      thoughtText: 'Keep this gentle and do not ask the body for more yet.',
      shouldSpeak: false,
      suggestedStyle: 'silent-observe',
      embodiedPresence: 'concerned',
      expiresAt: updatedAt + 4_000,
      emotionalTension: 'late-night-drain',
    },
    captureState: {
      permission: 'granted',
      lastGroundedAt: updatedAt - 120,
      sourceName: 'display-1',
      degradedReason: undefined,
    },
    durabilityPulse: null,
    recentTransition: null,
    discourseState: null,
    worldModel: null,
    residentPerformance: createRestProtectiveResidentPerformanceSnapshot(updatedAt),
    nextSuggestedProbeMs: 1_400,
    updatedAt,
  } as AlicizationVisualPresenceStateSnapshot
}

async function flushTasks() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('useStageEmbodimentRuntime', () => {
  afterEach(() => {
    clearAlicizationBridge()
  })

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
    expect(runtime.playbackTelemetry.value?.drivers.body).toEqual(expect.objectContaining({
      segmentId: 'segment-question',
    }))
    expect(typeof runtime.playbackTelemetry.value?.drivers.body?.stillness).toBe('number')
    expect(typeof runtime.playbackTelemetry.value?.drivers.body?.expressivity).toBe('number')
    expect(runtime.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      actionCue: 'idle_gentle_nod',
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(runtime.playbackTelemetry.value?.drivers.lipsync?.visemeHints).toEqual([
      { segmentId: 'segment-question', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-question', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.94 },
    ])
    expect(runtime.playbackTelemetry.value?.drivers.lipsync?.continuityHoldMs).toBe(180)
    expect(runtime.playbackTelemetry.value?.rendererTarget).toBe('live2d')
    expect((runtime.performanceState.value as any).driverRendererTarget).toBe('live2d')

    expect(runtime.diagnostics.value.speech.playbackTelemetry?.drivers?.face).toEqual(expect.objectContaining({
      facialCue: 'focused',
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(runtime.diagnostics.value.speech.playbackTelemetry?.drivers?.body).toEqual(expect.objectContaining({
      segmentId: 'segment-question',
    }))
    expect(typeof runtime.diagnostics.value.speech.playbackTelemetry?.drivers?.body?.stillness).toBe('number')
    expect(typeof runtime.diagnostics.value.speech.playbackTelemetry?.drivers?.body?.expressivity).toBe('number')
    expect(runtime.diagnostics.value.speech.playbackTelemetry?.rendererTarget).toBe('live2d')
    expect(runtime.diagnostics.value.speech.driverSummary).toEqual({
      rendererTarget: 'live2d',
      body: expect.objectContaining({
        segmentId: 'segment-question',
      }),
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.46,
        holdMs: 420,
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-question',
      },
      motion: {
        cue: 'idle_gentle_nod',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.32,
        holdMs: 180,
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-question',
      },
      lipsync: {
        cue: 'I',
        playbackPhase: 'playing',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-question',
        mode: 'energy-phoneme-hybrid',
        continuityHoldMs: 180,
        topViseme: 'I:0.35',
        hintTrail: 'I:0.35@0.94 src=prosody-authority segment=segment-question | closed:0.75@0.94 src=prosody-authority segment=segment-question',
        hintViseme: 'I',
      },
      voice: 'closure=0.35 | precision=0.30 | provenance=authority-bound | segment=segment-question | source=prosody-authority',
      voiceAuthority: {
        cue: null,
        source: 'prosody-authority',
        confidence: null,
        segmentId: 'segment-question',
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
    expect(typeof runtime.diagnostics.value.speech.driverSummary?.body?.stillness).toBe('number')
    expect(typeof runtime.diagnostics.value.speech.driverSummary?.body?.expressivity).toBe('number')

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
      body: expect.objectContaining({
        segmentId: 'segment-runtime-vrm',
      }),
      face: {
        cue: 'focused',
        emotion: 'thinking',
        intensity: 0.56,
        holdMs: 320,
        preUtteranceCue: null,
        postUtteranceCue: null,
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-runtime-vrm',
      },
      motion: {
        cue: 'observe_focus',
        attentionMode: 'attentive',
        idleBase: 'idle_settle',
        intensity: 0.4,
        holdMs: 220,
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        source: 'timeline-projection',
        confidence: 0.88,
        segmentId: 'segment-runtime-vrm',
      },
      lipsync: {
        cue: 'I',
        playbackPhase: 'playing',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredPauseMode: null,
        preferredLipsyncMode: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
        reasonSummary: null,
        source: 'prosody-authority',
        confidence: 0.94,
        segmentId: 'segment-runtime-vrm',
        mode: 'energy-phoneme-hybrid',
        continuityHoldMs: 320,
        topViseme: 'I:0.35',
        hintTrail: 'I:0.35@0.94 src=prosody-authority segment=segment-runtime-vrm',
        hintViseme: 'I',
      },
      voice: 'closure=0.36 | precision=0.30 | provenance=authority-bound | segment=segment-runtime-vrm | source=prosody-authority',
      voiceAuthority: {
        cue: null,
        source: 'prosody-authority',
        confidence: null,
        segmentId: 'segment-runtime-vrm',
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
    expect(typeof runtime.diagnostics.value.speech.driverSummary?.body?.stillness).toBe('number')
    expect(typeof runtime.diagnostics.value.speech.driverSummary?.body?.expressivity).toBe('number')

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

    expect(preview?.cue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 294,
      live2dMotionFollowThroughMs: 189,
      vrmActionFadeMs: 167,
      vrmExpressionBlendMs: 256,
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
    expect(runtime.performanceState.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
    }))
    expect(runtime.performanceState.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 420,
      vrmActionFadeMs: 460,
      vrmExpressionBlendMs: 500,
    })

    scope.stop()
  })

  it('restores live2d active cue semantics from embodimentScript metadata even without a scripted playback cue', async () => {
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
      performanceManifest: computed(() => ({
        ...createManifest(),
        renderer: 'live2d' as const,
      })),
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
      stageModelRenderer: ref('live2d'),
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
      turnId: 'turn-runtime-script-cue-recovery-live2d',
      rendererTarget: 'live2d' as const,
      replyText: '继续看这里。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'calm' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
        segments: [{
          id: 'segment-runtime-script-cue-recovery-live2d',
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
          segmentId: 'segment-runtime-script-cue-recovery-live2d',
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
          segmentId: 'segment-runtime-script-cue-recovery-live2d',
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
          { segmentId: 'segment-runtime-script-cue-recovery-live2d', viseme: 'I' as const, weight: 0.35, source: 'prosody-authority' as const, confidence: 0.94 },
        ],
      },
    }

    const preview = runtime.previewSpeechSegment({
      intentId: 'intent-runtime-script-cue-recovery-live2d',
      streamId: 'stream-runtime-script-cue-recovery-live2d',
      segmentId: 'segment-runtime-script-cue-recovery-live2d',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: script,
      },
    })

    expect(preview?.cue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 294,
      live2dMotionFollowThroughMs: 189,
      vrmActionFadeMs: 167,
      vrmExpressionBlendMs: 256,
    })

    startListener?.({
      item: {
        id: 'playback-runtime-script-cue-recovery-live2d',
        streamId: 'stream-runtime-script-cue-recovery-live2d',
        intentId: 'intent-runtime-script-cue-recovery-live2d',
        segmentId: 'segment-runtime-script-cue-recovery-live2d',
        ownerId: 'alice',
        priority: 0,
        text: '继续看这里。',
        special: null,
        continuityHoldMs: 180,
        audio: null,
        cue: preview?.cue
          ? {
              ...preview.cue,
              rendererHints: null,
              rendererSettle: null,
            }
          : null,
        digitalLifeFrame: preview?.digitalLifeFrame ?? null,
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 100,
    })
    await nextTick()

    expect(runtime.performanceState.value.driverRendererTarget).toBe('live2d')
    expect(runtime.performanceState.value.performance.baseEmotion).toBe('thinking')
    expect(runtime.performanceState.value.activeCueSource).toBe('segment')
    expect(runtime.performanceState.value.activeCue?.emotion).toBe('thinking')
    expect(runtime.performanceState.value.activeCue?.facialCue).toBe('focused')
    expect(runtime.performanceState.value.activeCue?.actionCue).toBe('observe_focus')
    expect(runtime.performanceState.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
    }))
    expect(runtime.performanceState.value.activeCue?.rendererSettle).toEqual({
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 420,
      vrmActionFadeMs: 460,
      vrmExpressionBlendMs: 500,
    })
    expect(runtime.playbackTelemetry.value?.rendererTarget).toBe('live2d')
    expect(runtime.diagnostics.value.speech.playbackTelemetry?.rendererTarget).toBe('live2d')
    expect(runtime.diagnostics.value.speech.driverSummary).toMatchObject({
      rendererTarget: 'live2d',
      face: expect.objectContaining({
        cue: 'focused',
        segmentId: 'segment-runtime-script-cue-recovery-live2d',
      }),
      motion: expect.objectContaining({
        cue: 'observe_focus',
        segmentId: 'segment-runtime-script-cue-recovery-live2d',
      }),
      lipsync: expect.objectContaining({
        mode: 'energy-phoneme-hybrid',
        segmentId: 'segment-runtime-script-cue-recovery-live2d',
      }),
    })

    scope.stop()
  })

  it('restores restrained repair-before-closeness renderer hints into runtime active cue from embodimentScript metadata when the playback cue omits them', async () => {
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
      performanceManifest: computed(() => ({
        ...createManifest(),
        renderer: 'live2d' as const,
      })),
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
      stageModelRenderer: ref('live2d'),
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
      turnId: 'turn-runtime-repair-before-closeness-hints',
      rendererTarget: 'live2d' as const,
      replyText: '我先把这一下轻一点接住。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 0 as const,
        residentMode: 'repair-before-closeness' as const,
      },
      speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
        segments: [{
          id: 'segment-runtime-repair-before-closeness-hints',
          index: 0,
          text: '我先把这一下轻一点接住。',
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 260,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
            preferredExpressionAliases: ['SoftGaze'],
            preferredMotionAliases: ['IdleSettle'],
          },
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 260,
      })!,
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-runtime-repair-before-closeness-hints',
          emotion: 'thinking' as const,
          facialCue: 'soft-gaze',
          intensity: 0.38,
          holdMs: 360,
          preUtteranceCue: 'soft-breath',
          postUtteranceCue: 'soft-release',
          source: 'prosody-authority' as const,
          confidence: 0.94,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [{
          segmentId: 'segment-runtime-repair-before-closeness-hints',
          actionCue: 'idle_settle',
          intensity: 0.18,
          holdMs: 280,
          source: 'timeline-projection' as const,
          confidence: 0.88,
        }],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [],
      },
    }

    const preview = runtime.previewSpeechSegment({
      intentId: 'intent-runtime-repair-before-closeness-hints',
      streamId: 'stream-runtime-repair-before-closeness-hints',
      segmentId: 'segment-runtime-repair-before-closeness-hints',
      text: '我先把这一下轻一点接住。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: script,
      },
    })

    startListener?.({
      item: {
        id: 'playback-runtime-repair-before-closeness-hints',
        streamId: 'stream-runtime-repair-before-closeness-hints',
        intentId: 'intent-runtime-repair-before-closeness-hints',
        segmentId: 'segment-runtime-repair-before-closeness-hints',
        ownerId: 'alice',
        priority: 0,
        text: '我先把这一下轻一点接住。',
        special: null,
        continuityHoldMs: 180,
        audio: null,
        cue: preview?.cue
          ? {
              ...preview.cue,
              rendererHints: null,
            }
          : null,
        digitalLifeFrame: preview?.digitalLifeFrame ?? null,
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 100,
    })
    await nextTick()

    expect(runtime.performanceState.value.activeCueSource).toBe('segment')
    expect(runtime.performanceState.value.activeCue?.emotion).toBe('thinking')
    expect(runtime.performanceState.value.activeCue?.facialCue).toBe('soft-gaze')
    expect(runtime.performanceState.value.activeCue?.actionCue).toBe('idle_settle')
    expect(runtime.performanceState.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['SoftGaze'],
      preferredMotionAliases: ['IdleSettle'],
    }))

    scope.stop()
  })

  it('keeps vrm audible same-her carry cues on the softer rejoin line when continuity survives through metadata recovery', async () => {
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
      turnId: 'turn-runtime-vrm-audible-same-her-carry',
      rendererTarget: 'vrm' as const,
      replyText: '先沿着这条线轻一点接住。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 0 as const,
        residentMode: 'same-thread-continuation' as const,
      },
      speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
        segments: [{
          id: 'segment-runtime-vrm-audible-same-her-carry',
          index: 0,
          text: '先沿着这条线轻一点接住。',
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 320,
          },
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredGazeMode: 'soften',
            preferredBlinkCadence: 'linger',
            preferredExpressionAliases: ['Relaxed', 'soft-gaze'],
            preferredMotionAliases: ['ObserveSoft', 'observe_focus'],
            signature: 'embodiment:audible-same-her-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 320,
      })!,
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-runtime-vrm-audible-same-her-carry',
          emotion: 'thinking' as const,
          facialCue: 'soft-gaze',
          intensity: 0.4,
          holdMs: 340,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          source: 'prosody-authority' as const,
          confidence: 0.93,
        }],
      },
      motionPlan: {
        idleBase: 'observe_focus',
        actionBursts: [{
          segmentId: 'segment-runtime-vrm-audible-same-her-carry',
          actionCue: 'observe_focus',
          intensity: 0.22,
          holdMs: 220,
          source: 'timeline-projection' as const,
          confidence: 0.89,
        }],
        attentionMode: 'ambient-covision' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [
          { segmentId: 'segment-runtime-vrm-audible-same-her-carry', viseme: 'A' as const, weight: 0.31, source: 'prosody-authority' as const, confidence: 0.91 },
        ],
      },
    }

    const preview = runtime.previewSpeechSegment({
      intentId: 'intent-runtime-vrm-audible-same-her-carry',
      streamId: 'stream-runtime-vrm-audible-same-her-carry',
      segmentId: 'segment-runtime-vrm-audible-same-her-carry',
      text: '先沿着这条线轻一点接住。',
      special: null,
      continuityHoldMs: 360,
      metadata: {
        embodimentScript: script,
      },
    })

    expect(preview?.cue?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: expect.any(Number),
      live2dMotionFollowThroughMs: expect.any(Number),
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(preview?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(313)
    expect(preview?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(189)
    expect(preview?.cue?.rendererSettle?.vrmActionFadeMs ?? 0).toBeGreaterThanOrEqual(220)
    expect(preview?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0).toBeGreaterThanOrEqual(320)

    startListener?.({
      item: {
        id: 'playback-runtime-vrm-audible-same-her-carry',
        streamId: 'stream-runtime-vrm-audible-same-her-carry',
        intentId: 'intent-runtime-vrm-audible-same-her-carry',
        segmentId: 'segment-runtime-vrm-audible-same-her-carry',
        ownerId: 'alice',
        priority: 0,
        text: '先沿着这条线轻一点接住。',
        special: null,
        continuityHoldMs: 360,
        audio: null,
        cue: preview?.cue
          ? {
              ...preview.cue,
              rendererHints: null,
              rendererSettle: null,
            }
          : null,
        digitalLifeFrame: preview?.digitalLifeFrame ?? null,
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 100,
    })
    await nextTick()

    expect(runtime.performanceState.value.driverRendererTarget).toBe('vrm')
    expect(runtime.performanceState.value.activeCueSource).toBe('segment')
    expect(runtime.performanceState.value.activeCue?.facialCue).toBe('soft-gaze')
    expect(runtime.performanceState.value.activeCue?.actionCue).toBe('observe_focus')
    expect(runtime.performanceState.value.activeCue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['Relaxed', 'soft-gaze'],
      preferredMotionAliases: ['ObserveSoft', 'observe_focus'],
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(runtime.performanceState.value.activeCue?.rendererSettle).toEqual(preview?.cue?.rendererSettle)
    scope.stop()
  })

  it('keeps resident-only repair-before-closeness runtime carry on the quieter nearby idle before activePresence reason tags are rebuilt', async () => {
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
      live2dActionCapabilities: computed(() => [
        {
          actionKey: 'companion_settle_nod',
          motionName: 'Idle',
          motionIndex: 0,
        },
        {
          actionKey: 'nearby_settle_guard',
          motionName: 'Idle',
          motionIndex: 1,
        },
      ]),
      mouthOpenSize: ref(0),
      paused: ref(false),
      performanceManifest: computed(() => ({
        ...createManifest(),
        renderer: 'live2d' as const,
      })),
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
      stageModelRenderer: ref('live2d'),
      vrmActionBindings: ref([
        {
          id: 'vrm-companion-settle',
          fileName: 'companion_settle_nod.vrma',
          actionKey: 'companion_settle_nod',
          label: 'Companion Settle Nod',
          description: 'attentive gentle companionship idle with a soft nod',
          importedAt: 0,
          source: 'builtin',
          file: '/tmp/companion_settle_nod.vrma',
        },
        {
          id: 'vrm-nearby-settle',
          fileName: 'nearby_settle_guard.vrma',
          actionKey: 'nearby_settle_guard',
          label: 'Nearby Settle Guard',
          description: 'quiet nearby settle guard that stays close without reopening too fast',
          importedAt: 0,
          source: 'builtin',
          file: '/tmp/nearby_settle_guard.vrma',
        },
      ]),
    }))!

    runtime.applyTransientDigitalLifeSpine(
      createResidentOnlyProjectClosureSpineDigest(1_000),
    )
    await nextTick()

    expect(runtime.visualPresenceState.value?.residentPerformance).toEqual(expect.objectContaining({
      performance: expect.objectContaining({
        residentMode: 'repair-before-closeness',
      }),
      reasonTags: expect.arrayContaining([
        'repair-before-closeness',
        'timing:project-emotional-closure',
      ]),
    }))
    expect(runtime.presencePosture.value).toEqual(expect.objectContaining({
      engaged: true,
      mode: 'attentive',
    }))
    expect(runtime.live2dIdleMotionPreference.value?.actionKey).toBe('nearby_settle_guard')
    expect(runtime.vrmIdleActionPreference.value?.binding?.actionKey).toBe('nearby_settle_guard')

    scope.stop()
  })

  it('keeps resident-only repair-before-closeness vrm runtime carry on the builtin settle loop before activePresence reason tags are rebuilt', async () => {
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
      vrmActionBindings: ref([
        {
          id: 'builtin-companion-settle',
          fileName: 'companion_settle_nod.vrma',
          actionKey: 'companion_settle_nod',
          label: 'Companion Settle Nod',
          description: 'attentive gentle companionship idle with a soft nod',
          importedAt: 0,
          source: 'builtin',
          file: '/tmp/companion_settle_nod.vrma',
        },
        {
          id: 'builtin-settle-idle',
          fileName: 'settle_idle.vrma',
          actionKey: 'settle_idle',
          label: 'Settle Idle',
          description: 'builtin restrained settle loop for repair-first callback carry',
          importedAt: 1,
          source: 'builtin',
          file: '/tmp/settle_idle.vrma',
        },
      ]),
    }))!

    runtime.applyTransientDigitalLifeSpine(
      createResidentOnlyProjectClosureSpineDigest(1_001),
    )
    await nextTick()

    expect(runtime.visualPresenceState.value?.residentPerformance).toEqual(expect.objectContaining({
      performance: expect.objectContaining({
        residentMode: 'repair-before-closeness',
      }),
      reasonTags: expect.arrayContaining([
        'repair-before-closeness',
        'timing:project-emotional-closure',
      ]),
    }))
    expect(runtime.presencePosture.value).toEqual(expect.objectContaining({
      engaged: true,
      mode: 'attentive',
    }))
    expect(runtime.vrmIdleActionPreference.value?.mode).toBe('attentive')
    expect(runtime.vrmIdleActionPreference.value?.binding?.actionKey).toBe('settle_idle')

    scope.stop()
  })

  it('keeps resident-only rest-protective vrm runtime carry on the builtin settle loop before activePresence reason tags are rebuilt', async () => {
    let emitSnapshot: ((state: AlicizationVisualPresenceStateSnapshot | null) => void) | undefined
    setAlicizationBridge(createAlicizationBridgeStub({
      getVisualPresenceState: vi.fn().mockResolvedValue(null),
      onVisualPresenceState: (listener) => {
        emitSnapshot = listener
        return () => {
          emitSnapshot = undefined
        }
      },
    }))

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
      vrmActionBindings: ref([
        {
          id: 'builtin-companion-settle',
          fileName: 'companion_settle_nod.vrma',
          actionKey: 'companion_settle_nod',
          label: 'Companion Settle Nod',
          description: 'attentive gentle companionship idle with a soft nod',
          importedAt: 0,
          source: 'builtin',
          file: '/tmp/companion_settle_nod.vrma',
        },
        {
          id: 'builtin-settle-idle',
          fileName: 'settle_idle.vrma',
          actionKey: 'settle_idle',
          label: 'Settle Idle',
          description: 'builtin restrained settle loop for rest-protective callback carry',
          importedAt: 1,
          source: 'builtin',
          file: '/tmp/settle_idle.vrma',
        },
      ]),
    }))!

    await flushTasks()
    emitSnapshot?.(createRestProtectiveRuntimeVisualPresenceState(Date.now()))
    await flushTasks()

    expect(runtime.visualPresenceState.value?.residentPerformance).toEqual(expect.objectContaining({
      performance: expect.objectContaining({
        residentMode: 'quiet-companionship',
      }),
      reasonTags: expect.arrayContaining([
        'rest-protective',
        'quiet-companionship',
        'timing:project-emotional-closure',
      ]),
    }))
    expect(runtime.presencePosture.value).toEqual(expect.objectContaining({
      engaged: true,
      mode: 'concerned',
    }))
    expect(runtime.vrmIdleActionPreference.value?.mode).toBe('concerned')
    expect(runtime.vrmIdleActionPreference.value?.binding?.actionKey).toBe('settle_idle')

    scope.stop()
  })

  it('keeps resident-only rest-protective live2d runtime carry on the builtin settle loop before activePresence reason tags are rebuilt', async () => {
    let emitSnapshot: ((state: AlicizationVisualPresenceStateSnapshot | null) => void) | undefined
    setAlicizationBridge(createAlicizationBridgeStub({
      getVisualPresenceState: vi.fn().mockResolvedValue(null),
      onVisualPresenceState: (listener) => {
        emitSnapshot = listener
        return () => {
          emitSnapshot = undefined
        }
      },
    }))

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
      live2dActionCapabilities: computed(() => [
        {
          actionKey: 'companion_settle_nod',
          motionName: 'Idle',
          motionIndex: 0,
        },
        {
          actionKey: 'idle_settle',
          motionName: 'Idle',
          motionIndex: 1,
        },
      ]),
      mouthOpenSize: ref(0),
      paused: ref(false),
      performanceManifest: computed(() => ({
        ...createManifest(),
        renderer: 'live2d' as const,
      })),
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
      stageModelRenderer: ref('live2d'),
      vrmActionBindings: ref([]),
    }))!

    await flushTasks()
    emitSnapshot?.(createRestProtectiveRuntimeVisualPresenceState(Date.now()))
    await flushTasks()

    expect(runtime.visualPresenceState.value?.residentPerformance).toEqual(expect.objectContaining({
      performance: expect.objectContaining({
        residentMode: 'quiet-companionship',
      }),
      reasonTags: expect.arrayContaining([
        'rest-protective',
        'quiet-companionship',
        'timing:project-emotional-closure',
      ]),
    }))
    expect(runtime.presencePosture.value).toEqual(expect.objectContaining({
      engaged: true,
      mode: 'concerned',
    }))
    expect(runtime.live2dIdleMotionPreference.value?.mode).toBe('concerned')
    expect(runtime.live2dIdleMotionPreference.value?.actionKey).toBe('idle_settle')

    scope.stop()
  })
})
