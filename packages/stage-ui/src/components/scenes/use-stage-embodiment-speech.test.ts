import type { PlaybackItem } from '@proj-alicization/pipelines-audio'
import type { AlicizationDigitalLifeFrame } from '@proj-alicization/stage-shared'

import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'

import { readFileSync } from 'node:fs'

import { createLive2DLipSync } from '@proj-alicization/model-driver-lipsync'
import { createBufferedSpeechAudioSource } from '@proj-alicization/pipelines-audio'
import {
  alignAlicizationDialogueSpeechTimelineSegment,
  buildAlicizationDialogueSpeechTimeline,
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechDynamicsState,
  createIdleStageEmbodimentSpeechPlaybackState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
  deriveStageEmbodimentSpeechRenderState,
  normalizeAlicizationEmbodimentSpeechPlan,
  resolveStageEmbodimentSpeechStopLingerMs,
} from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

afterEach(() => {
  vi.useRealTimers()
  vi.mocked(createLive2DLipSync).mockReset()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

vi.mock('@proj-alicization/model-driver-lipsync', () => ({
  createLive2DLipSync: vi.fn(),
}))

function createRecoveringMotor() {
  const idleMotor = createIdleStageEmbodimentMotorState()

  return {
    ...idleMotor,
    stillness: 0.82,
    expressivity: 0.3,
    gaze: {
      ...idleMotor.gaze,
      focus: 0.78,
      stability: 0.86,
      azimuth: -0.12,
      elevation: -0.08,
    },
    head: {
      ...idleMotor.head,
      yaw: -0.08,
      pitch: 0.12,
      roll: 0.06,
      nod: 0.12,
    },
    breath: {
      ...idleMotor.breath,
      amplitude: 0.32,
      pace: 0.38,
    },
    facial: {
      ...idleMotor.facial,
      eyeOpenness: 0.5,
      browLift: -0.06,
      browTension: 0.36,
      cheekLift: 0.08,
      mouthSpread: 0.1,
      mouthRound: 0.42,
      jawOpenBias: 0.22,
    },
    body: {
      ...idleMotor.body,
      sway: -0.06,
      lean: -0.14,
      openness: 0.34,
      settle: 0.88,
    },
  }
}

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}

function createDigitalLifeFrameFixture(
  overrides: Partial<AlicizationDigitalLifeFrame> = {},
): AlicizationDigitalLifeFrame {
  const idleMotor = createIdleStageEmbodimentMotorState()
  const base: AlicizationDigitalLifeFrame = {
    id: 'segment-1',
    index: 0,
    startOffset: 0,
    endOffset: 1,
    text: 'steady return',
    mode: 'recovering',
    interruptPolicy: 'soft-interrupt',
    settleMode: 'hold',
    voice: {
      pitchDelta: 0,
      rateMultiplier: 1,
      energy: 0.3,
      cadence: 0.28,
    },
    lipSync: {
      mode: 'closed',
      visemeBias: 0.24,
      energyBias: 0.22,
      mouthScale: 0.8,
      continuityHoldMs: 280,
    },
    face: {
      emotion: 'thinking',
      facialCue: null,
      expressionMode: 'recover',
      intensity: 0.24,
      holdMs: 300,
      rendererHints: null,
    },
    action: {
      actionCue: null,
      actionMode: 'none',
      intensity: 0.08,
      holdMs: 260,
      rendererHints: null,
    },
    motor: {
      ...idleMotor,
      stillness: 0.84,
      expressivity: 0.12,
      gaze: {
        ...idleMotor.gaze,
        focus: 0.44,
        stability: 0.4,
        azimuth: 0,
        elevation: 0.02,
      },
      head: {
        ...idleMotor.head,
        yaw: 0,
        pitch: 0.04,
        roll: 0,
        nod: 0.08,
      },
      breath: {
        ...idleMotor.breath,
        amplitude: 0.18,
        pace: 0.24,
      },
      facial: {
        ...idleMotor.facial,
        eyeOpenness: 0.72,
        browLift: 0.08,
        browTension: 0.18,
        cheekLift: 0.1,
        mouthSpread: 0.08,
        mouthRound: 0.06,
        jawOpenBias: 0.04,
      },
      body: {
        ...idleMotor.body,
        sway: 0.04,
        lean: 0.12,
        settle: 0.82,
        openness: 0.22,
      },
    },
  }

  return {
    ...base,
    ...overrides,
    voice: {
      ...base.voice,
      ...overrides.voice,
    },
    lipSync: {
      ...base.lipSync,
      ...overrides.lipSync,
    },
    face: {
      ...base.face,
      ...overrides.face,
    },
    action: {
      ...base.action,
      ...overrides.action,
    },
    motor: {
      ...base.motor,
      ...overrides.motor,
      gaze: {
        ...base.motor.gaze,
        ...overrides.motor?.gaze,
      },
      head: {
        ...base.motor.head,
        ...overrides.motor?.head,
      },
      breath: {
        ...base.motor.breath,
        ...overrides.motor?.breath,
      },
      facial: {
        ...base.motor.facial,
        ...overrides.motor?.facial,
      },
      body: {
        ...base.motor.body,
        ...overrides.motor?.body,
      },
    },
  }
}describe('stage embodiment speech contract', () => {
  it('does not interpret internal continuity governance as speech authority', () => {
    const source = readFileSync(new URL('./use-stage-embodiment-speech.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /resolveProjectClosureSpeechEmbodimentBias|resolveProjectClosureSpeechResidentModeFromMetadata|resolveProjectClosureRendererHintsFromMetadata/u,
    )
    expect(source).not.toMatch(
      /hasAlicization(?:Audible|BodyVoiceOnly|Quieter|Softened|StillVoiced)ContinuityCarry|ContinuityRendererCarry|ContinuityResidentLine/u,
    )
  })

  it('creates an idle playback state snapshot', () => {
    expect(createIdleStageEmbodimentSpeechPlaybackState()).toEqual({
      phase: 'idle',
      item: null,
      currentAudioSource: null,
      mouthOpenSize: 0,
      dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
      startedAt: null,
      endedAt: null,
      stopReason: null,
    })
  })

  it('projects playback items into the shared embodiment contract', () => {
    expect(createStageEmbodimentSpeechPlaybackItem({
      streamId: 'stream-1',
      intentId: 'intent-1',
      segmentId: 'segment-1',
      ownerId: 'alice',
      text: '你好',
      special: null,
    })).toEqual({
      intentId: 'intent-1',
      streamId: 'stream-1',
      segmentId: 'segment-1',
      ownerId: 'alice',
      text: '你好',
      special: null,
      continuityHoldMs: 0,
      playbackDurationMs: null,
      metadata: null,
      cue: null,
      digitalLifeFrame: null,
    })
  })

  it('lets digital-life frame override playback cue authority', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      streamId: 'stream-digital-life',
      intentId: 'intent-digital-life',
      segmentId: 'segment-stale-shell',
      ownerId: 'alice',
      text: '先别着急。',
      special: null,
      cue: {
        id: 'timeline:segment-digital-life',
        index: 0,
        startOffset: 0,
        endOffset: 5,
        text: '先别着急。',
        emotion: 'happy',
        gestureWeight: 0.82,
        facialWeight: 0.9,
        prosodyWeight: 0.84,
        beatWeight: 0.78,
        mouthWeight: 0.8,
        headWeight: 0.74,
        facialHoldMs: 160,
        actionHoldMs: 420,
        emotionHoldMs: 180,
        settleMode: 'release',
        rendererSettle: {
          live2dFacialReleaseMs: 160,
          live2dMotionFollowThroughMs: 900,
          vrmActionFadeMs: 420,
          vrmExpressionBlendMs: 180,
        },
        rendererHints: {
          preferredExpressionAliases: ['TimelineSmile'],
          preferredMotionAliases: ['TimelineBounce'],
        },
        actionCue: 'wave_big',
        facialCue: 'grin',
        actionWindow: 'cadence-peak',
        interruptMode: 'hard-interrupt',
      },
      digitalLifeFrame: {
        id: 'segment-digital-life',
        index: 0,
        startOffset: 0,
        endOffset: 5,
        text: '先别着急。',
        mode: 'recovering',
        interruptPolicy: 'soft-interrupt',
        settleMode: 'linger',
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.94,
          energy: 0.58,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.62,
          energyBias: 0.38,
          mouthScale: 0.92,
          continuityHoldMs: 460,
        },
        face: {
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.56,
          holdMs: 480,
          rendererHints: {
            preferredExpressionAliases: ['MindCalm'],
          },
        },
        action: {
          actionCue: null,
          actionMode: 'none',
          intensity: 0,
          holdMs: 320,
          rendererHints: {
            preferredMotionAliases: ['StillnessGuard'],
          },
        },
        motor: createRecoveringMotor(),
      },
    })

    expect(item.cue).toEqual(expect.objectContaining({
      id: 'segment-digital-life',
      emotion: 'concerned',
      facialCue: 'soft-gaze',
      actionCue: null,
      interruptMode: 'soft-interrupt',
      settleMode: 'linger',
      gestureWeight: 0,
      facialWeight: 0.56,
      prosodyWeight: 0.42,
      headWeight: 0,
      facialHoldMs: 480,
      actionHoldMs: 320,
      emotionHoldMs: 480,
      actionWindow: 'none',
      rendererHints: {
        preferredExpressionAliases: ['MindCalm', 'TimelineSmile'],
        preferredMotionAliases: ['StillnessGuard', 'TimelineBounce'],
      },
      rendererSettle: {
        live2dFacialReleaseMs: 518,
        live2dMotionFollowThroughMs: 218,
        vrmActionFadeMs: 186,
        vrmExpressionBlendMs: 442,
      },
    }))
    expect(item.segmentId).toBe('segment-digital-life')
    expect(item.cue?.beatWeight).toBeCloseTo(0.24, 2)
    expect(item.cue?.mouthWeight).toBeCloseTo(0.56, 2)
    expect(item.digitalLifeFrame?.motor.facial.mouthRound).toBeGreaterThan(item.digitalLifeFrame?.motor.facial.mouthSpread ?? 0)
  })

  it('derives expressive speech dynamics from playback state without DOM audio types', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      streamId: 'stream-1',
      intentId: 'intent-1',
      segmentId: 'segment-1',
      ownerId: 'alice',
      text: 'Really?!',
      special: 'emotion:surprised',
    })

    expect(deriveStageEmbodimentSpeechDynamicsState({
      phase: 'playing',
      item,
      mouthOpenSize: 42,
      now: 1800,
      speechEnergy: 0.48,
      startedAt: 1200,
      stylePitch: 10,
      styleRate: 1.08,
    })).toEqual({
      speechEnergy: 0.48,
      emphasisLevel: 0.5666666666666667,
      prosodyIntensity: 0.49187777777777786,
      cadencePulse: 0.34495983829128946,
    })
  })

  it('collapses dynamics back to idle when playback stops', () => {
    expect(deriveStageEmbodimentSpeechDynamicsState({
      phase: 'idle',
      item: null,
      mouthOpenSize: 60,
      now: 2400,
      speechEnergy: 0.7,
    })).toEqual(createIdleStageEmbodimentSpeechDynamicsState())
  })

  it('projects playback lifecycle into a renderer-facing speech state', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      streamId: 'stream-1',
      intentId: 'intent-1',
      segmentId: 'segment-1',
      text: 'Hello!',
      special: null,
    })

    expect(deriveStageEmbodimentSpeechRenderState({
      lastEventType: 'audio-source-bound',
      revision: 3,
      state: {
        ...createIdleStageEmbodimentSpeechPlaybackState(),
        phase: 'playing',
        item,
        currentAudioSource: { kind: 'buffer-source' },
        mouthOpenSize: 48,
        dynamics: {
          speechEnergy: 0.62,
          prosodyIntensity: 0.44,
          emphasisLevel: 0.3,
          cadencePulse: 0.55,
        },
        startedAt: 1200,
      },
    })).toEqual({
      phase: 'starting',
      playbackPhase: 'playing',
      lastEventType: 'audio-source-bound',
      revision: 3,
      active: true,
      item,
      currentAudioSource: { kind: 'buffer-source' },
      audioBound: true,
      mouthOpenSize: 48,
      mouthOpenRatio: 0.48,
      visemeIntensity: 0.5704,
      articulation: createIdleStageEmbodimentSpeechArticulationState(),
      dynamics: {
        speechEnergy: 0.62,
        prosodyIntensity: 0.44,
        emphasisLevel: 0.3,
        cadencePulse: 0.55,
      },
      startedAt: 1200,
      endedAt: null,
      stopReason: null,
    })
  })

  it('resolves stop linger only for normal segment tails', () => {
    const item = createStageEmbodimentSpeechPlaybackItem({
      streamId: 'stream-1',
      intentId: 'intent-1',
      segmentId: 'segment-1',
      text: '先看这里，',
      special: null,
      continuityHoldMs: 184.6,
    })

    expect(resolveStageEmbodimentSpeechStopLingerMs({
      item,
      stopReason: null,
    })).toBe(185)

    expect(resolveStageEmbodimentSpeechStopLingerMs({
      item,
      stopReason: 'owner-canceled',
    })).toBe(0)
  })

  it('keeps an idle renderer-facing state when playback is inactive', () => {
    expect(deriveStageEmbodimentSpeechRenderState({
      state: createIdleStageEmbodimentSpeechPlaybackState(),
    })).toEqual(createIdleStageEmbodimentSpeechRenderState())
  })

  it('builds and aligns a dialogue speech timeline for later playback segments', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后点保存！最后告诉我结果。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'point_screen',
        delivery: 'firm',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'point_screen',
          delivery: 'firm',
          emphasis: 1,
        },
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-speech-timeline',
      },
    })

    expect(timeline?.segments.length).toBeGreaterThan(1)

    const aligned = alignAlicizationDialogueSpeechTimelineSegment({
      timeline,
      consumedText: '先看这里，',
      segmentText: '然后点保存！',
    })

    expect(aligned.segment).toEqual(expect.objectContaining({
      actionCue: expect.any(String),
      facialCue: expect.any(String),
      actionWindow: expect.any(String),
      beatWeight: expect.any(Number),
    }))
    expect(aligned.nextConsumedOffset).toBeGreaterThan(0)
  })

  it('varies segment-level cues so speech playback can layer temporary expressions and motions', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后点保存！最后告诉我结果。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'point_screen',
        delivery: 'firm',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'point_screen',
          delivery: 'firm',
          emphasis: 1,
        },
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-speech-timeline',
      },
    })

    const facialCueSet = new Set((timeline?.segments ?? []).map(segment => segment.facialCue).filter(Boolean))
    const actionCueSet = new Set((timeline?.segments ?? []).map(segment => segment.actionCue).filter(Boolean))

    expect(facialCueSet.size).toBeGreaterThan(1)
    expect(actionCueSet.size).toBeGreaterThan(1)
  })

  it('previews an upcoming segment cue without consuming the dialogue timeline', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后点保存！最后告诉我结果。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'point_screen',
        delivery: 'firm',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'point_screen',
          delivery: 'firm',
          emphasis: 1,
        },
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-preview-speech-timeline',
      },
    })

    speech.primeSpeechTimeline(timeline)
    const preview = speech.previewSpeechSegment({
      intentId: 'intent-preview',
      streamId: 'stream-preview',
      segmentId: 'segment-preview',
      text: '先看这里，',
      special: null,
      continuityHoldMs: 180,
    })

    expect(preview?.cue).toEqual(expect.objectContaining({
      text: '先看这里，',
      actionCue: expect.any(String),
    }))
    expect(speech.upcomingSpeechSegment.value?.cue?.text).toBe('先看这里，')

    startListener?.({
      item: {
        id: 'playback-preview',
        streamId: 'stream-preview',
        intentId: 'intent-preview',
        segmentId: 'segment-preview',
        ownerId: 'alice',
        priority: 0,
        text: '先看这里，',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
      },
      startedAt: 120,
    })

    expect(speech.speechPlayback.value.item?.cue?.text).toBe('先看这里，')
    expect(speech.upcomingSpeechSegment.value).toBeNull()

    speech.dispose()
  })

  it('preserves TTS voice metadata so playback can derive articulation from the actual voice identity', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const metadata = {
      speechSynthesis: {
        provider: 'openai-compatible-audio-speech',
        model: 'gpt-4o-mini-tts',
        pitchDelta: 3,
        rateMultiplier: 1.04,
        voice: {
          id: 'nova',
          name: 'Nova',
          gender: 'female',
          languages: [{ code: 'en-US', title: 'English' }],
        },
      },
    } satisfies Record<string, unknown>

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-articulation',
      streamId: 'stream-articulation',
      segmentId: 'segment-articulation',
      text: 'Please breathe with me.',
      special: null,
      continuityHoldMs: 180,
      metadata,
    })

    expect(preview?.metadata).toEqual(metadata)
    expect(preview?.playbackDurationMs).toBeGreaterThan(0)

    startListener?.({
      item: {
        id: 'playback-articulation',
        streamId: 'stream-articulation',
        intentId: 'intent-articulation',
        segmentId: 'segment-articulation',
        ownerId: 'alice',
        priority: 0,
        text: 'Please breathe with me.',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({ duration: 0.78 } as AudioBuffer),
        createdAt: 0,
        metadata,
      },
      startedAt: 120,
    })

    expect(speech.speechPlayback.value.item?.playbackDurationMs).toBe(780)
    expect(speech.speechRenderState.value.articulation.voice?.voiceId).toBe('nova')
    expect(speech.speechRenderState.value.articulation.voice?.spreadBias).toBeGreaterThan(0.3)

    speech.dispose()
  })

  it('refines chinese articulation from preserved voice bias metadata during playback', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const softMetadata = {
      speechSynthesis: {
        provider: 'test',
        voice: {
          id: 'soft-zh',
          language: 'zh-CN',
          consonantPrecision: 0.2,
          vowelLegato: 0.9,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.1,
          closureBias: 0.1,
          rateMultiplier: 1,
          pitchDelta: 0,
        },
      },
    } satisfies Record<string, unknown>
    const crispMetadata = {
      speechSynthesis: {
        provider: 'test',
        voice: {
          id: 'crisp-zh',
          language: 'zh-CN',
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.1,
          closureBias: 0.1,
          rateMultiplier: 1,
          pitchDelta: 0,
        },
      },
    } satisfies Record<string, unknown>

    speech.previewSpeechSegment({
      intentId: 'intent-soft-zh',
      streamId: 'stream-soft-zh',
      segmentId: 'segment-soft-zh',
      text: '先看这里。',
      special: null,
      continuityHoldMs: 180,
      metadata: softMetadata,
    })

    startListener?.({
      item: {
        id: 'playback-soft-zh',
        streamId: 'stream-soft-zh',
        intentId: 'intent-soft-zh',
        segmentId: 'segment-soft-zh',
        ownerId: 'alice',
        priority: 0,
        text: '先看这里。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({ duration: 0.8 } as AudioBuffer),
        createdAt: 0,
        metadata: softMetadata,
      },
      startedAt: 0,
    })

    const softArticulation = speech.speechRenderState.value.articulation

    startListener?.({
      item: {
        id: 'playback-crisp-zh',
        streamId: 'stream-crisp-zh',
        intentId: 'intent-crisp-zh',
        segmentId: 'segment-crisp-zh',
        ownerId: 'alice',
        priority: 0,
        text: '先看这里。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({ duration: 0.8 } as AudioBuffer),
        createdAt: 0,
        metadata: crispMetadata,
      },
      startedAt: 0,
    })

    const crispArticulation = speech.speechRenderState.value.articulation

    expect(softArticulation.voice?.language).toBe('zh-CN')
    expect(crispArticulation.voice?.voiceId).toBe('crisp-zh')
    expect(crispArticulation.lipClosure).toBeGreaterThan(softArticulation.lipClosure)
    expect(crispArticulation.visemes.closed).toBeGreaterThan(softArticulation.visemes.closed)

    speech.dispose()
  })

  it('prefers embodimentScript speechPlan continuity over fallback timeline timing', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'point_screen',
        delivery: 'firm',
        emphasis: 1,
      },
    }))

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-script-authority',
      streamId: 'stream-script-authority',
      segmentId: 'segment-script-authority',
      text: '先看这里。',
      special: null,
      continuityHoldMs: 100,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-authority',
          rendererTarget: 'live2d',
          replyText: '先看这里。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'firm',
            emphasis: 1,
            residentMode: 'dialogue',
          },
          speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
            segments: [{
              id: 'segment-script-authority',
              index: 0,
              text: '先看这里。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 480,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 480,
          }),
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-script-authority',
              emotion: 'thinking',
              facialCue: 'focused',
              intensity: 0.6,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(preview?.continuityHoldMs).toBe(480)
    speech.dispose()
  })

  it('prewarms live2d lip sync without blocking the next reply surface', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    const deferred = createDeferredPromise<Awaited<ReturnType<typeof createLive2DLipSync>>>()
    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn(),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    createLive2DLipSyncMock.mockReturnValueOnce(deferred.promise)

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const outcome = await Promise.race([
      speech.prepareForNextMessage().then(() => 'done' as const),
      new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 10)),
    ])

    expect(outcome).toBe('done')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(audioContext.createAnalyser).toHaveBeenCalledTimes(1)
    expect(createLive2DLipSyncMock).toHaveBeenCalledTimes(1)

    deferred.resolve({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0),
      getVowelWeights: vi.fn(() => null),
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)
    await Promise.resolve()

    speech.dispose()
  })

  it('carries vrm rendererTarget through playback telemetry', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-vrm-telemetry',
      rendererTarget: 'vrm' as const,
      replyText: '继续盯着这个报错。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'calm' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: {
        segments: [{
          id: 'segment-vrm-telemetry',
          index: 0,
          text: '继续盯着这个报错。',
          interruptPolicy: 'soft-settle' as const,
          preRollMs: 20,
          settleMs: 260,
        }],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 260,
      },
      facePlan: {
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        speakingCues: [{
          segmentId: 'segment-vrm-telemetry',
          emotion: 'thinking' as const,
          facialCue: 'focused',
          intensity: 0.5,
          holdMs: 320,
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          source: 'prosody-authority' as const,
          confidence: 0.94,
        }],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [{
          segmentId: 'segment-vrm-telemetry',
          viseme: 'I' as const,
          weight: 0.35,
          source: 'prosody-authority' as const,
          confidence: 0.94,
        }],
      },
    }

    const item = createStageEmbodimentSpeechPlaybackItem({
      streamId: 'stream-vrm-telemetry',
      intentId: 'intent-vrm-telemetry',
      segmentId: 'segment-vrm-telemetry',
      ownerId: 'alice',
      text: '继续盯着这个报错。',
      special: null,
      metadata: {
        embodimentScript: script,
      },
    })

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    speech.previewSpeechSegment(item)
    startListener?.({
      item: {
        id: 'playback-vrm-telemetry',
        streamId: 'stream-vrm-telemetry',
        intentId: 'intent-vrm-telemetry',
        segmentId: 'segment-vrm-telemetry',
        ownerId: 'alice',
        priority: 0,
        text: '继续盯着这个报错。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({ duration: 0.8 } as AudioBuffer),
        createdAt: 0,
        metadata: {
          embodimentScript: script,
        },
      },
      startedAt: 120,
    })

    expect(speech.playbackTelemetry.value?.rendererTarget).toBe('vrm')

    speech.dispose()
  })

  it('keeps continuous viseme-driven mouth motion even when live2d mouth-open energy is near zero', async () => {
    vi.useFakeTimers()
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let now = 1_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const vowelFrames = [
      { A: 0.18, E: 0.12, I: 0.08, O: 0.12, U: 0.14 },
      { A: 0.82, E: 0.08, I: 0.04, O: 0.03, U: 0.03 },
      { A: 0.12, E: 0.1, I: 0.08, O: 0.38, U: 0.76 },
      { A: 0.54, E: 0.14, I: 0.08, O: 0.18, U: 0.12 },
    ]
    let vowelFrameIndex = 0
    const getVowelWeights = vi.fn(() => vowelFrames[Math.min(vowelFrameIndex++, vowelFrames.length - 1)])

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    createLive2DLipSyncMock.mockResolvedValueOnce({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0.004),
      getVowelWeights,
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await vi.runOnlyPendingTimersAsync()
    await Promise.resolve()
    await Promise.resolve()

    speech.applySyntheticSpeechSegment({
      text: 'b',
      reason: 'boost',
    } as never)

    async function advanceFrame(deltaMs: number) {
      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += deltaMs
      nextFrame?.(now)
      await Promise.resolve()
    }

    await advanceFrame(80)
    const firstMouthOpenSize = speech.speechPlayback.value.mouthOpenSize
    const firstVisemeA = speech.speechRenderState.value.articulation.visemes.A

    await advanceFrame(80)
    const secondMouthOpenSize = speech.speechPlayback.value.mouthOpenSize
    const secondVisemeU = speech.speechRenderState.value.articulation.visemes.U

    expect(firstMouthOpenSize).toBeGreaterThan(12)
    expect(secondMouthOpenSize).toBeGreaterThan(12)
    expect(firstVisemeA).toBeGreaterThan(0.3)
    expect(secondVisemeU).toBeGreaterThan(0.05)
    expect(secondMouthOpenSize).not.toBe(firstMouthOpenSize)
    expect(getVowelWeights.mock.calls.length).toBeGreaterThanOrEqual(3)

    speech.dispose()
  })

  it('accepts a node-less live2d lip sync driver without logging a setup failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    const initialLipSyncCallCount = createLive2DLipSyncMock.mock.calls.length
    createLive2DLipSyncMock.mockResolvedValueOnce({
      getMouthOpen: vi.fn(() => 0.01),
      getVowelWeights: vi.fn(() => ({
        A: 0.08,
        E: 0.06,
        I: 0.05,
        O: 0.04,
        U: 0.03,
      })),
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
    await Promise.resolve()

    expect(createLive2DLipSyncMock.mock.calls.length).toBe(initialLipSyncCallCount + 1)
    expect(audioContext.resume).toHaveBeenCalledTimes(1)
    expect(audioContext.createAnalyser).toHaveBeenCalledTimes(1)
    expect(speech.audioAnalyser.value).toEqual(expect.objectContaining({
      fftSize: 2048,
    }))
    expect(consoleError).not.toHaveBeenCalledWith(
      'Failed to setup Live2D lip sync',
      expect.anything(),
    )

    speech.dispose()
  })

  it('uses playback viseme hints to shape live2d mouth articulation at runtime', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let now = 2_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const getVowelWeights = vi.fn(() => ({
      A: 0.08,
      E: 0.06,
      I: 0.05,
      O: 0.1,
      U: 0.04,
    }))

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    createLive2DLipSyncMock.mockResolvedValueOnce({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0.01),
      getVowelWeights,
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
    await Promise.resolve()

    speech.applySyntheticSpeechSegment({
      text: 'woo',
      reason: 'boost',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 180,
          stopReason: null,
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: 'synthetic-1',
              visemeHints: [
                { segmentId: 'synthetic-1', viseme: 'U', weight: 0.92, source: 'prosody-authority', confidence: 0.94 },
                { segmentId: 'synthetic-1', viseme: 'closed', weight: 0.58, source: 'prosody-authority', confidence: 0.94 },
              ],
            },
          },
        },
      },
    } as never)

    async function advanceFrame(deltaMs: number) {
      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += deltaMs
      nextFrame?.(now)
      await Promise.resolve()
    }

    await advanceFrame(80)
    const articulation = speech.speechRenderState.value.articulation

    expect(articulation.lipRound).toBeGreaterThan(0.35)
    expect(articulation.visemes.U).toBeGreaterThan(0.8)
    expect(articulation.visemes.closed).toBeGreaterThan(0.4)
    expect(articulation.lipRound).toBeGreaterThan(articulation.lipSpread)
    speech.dispose()
  })

  it('filters playback viseme hints by authoritative driver segment id when item segment id is absent', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let now = 2_300
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const getVowelWeights = vi.fn(() => ({
      A: 0.04,
      E: 0.03,
      I: 0.03,
      O: 0.05,
      U: 0.04,
    }))

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    createLive2DLipSyncMock.mockResolvedValueOnce({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0.01),
      getVowelWeights,
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
    await Promise.resolve()

    speech.applySyntheticSpeechSegment({
      text: 'woo',
      reason: 'boost',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 180,
          stopReason: null,
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: 'driver-segment',
              visemeHints: [
                { segmentId: 'driver-segment', viseme: 'U', weight: 0.88, source: 'prosody-authority', confidence: 0.92 },
                { segmentId: 'other-segment', viseme: 'A', weight: 0.98, source: 'prosody-authority', confidence: 0.92 },
              ],
            },
          },
        },
      },
    } as never)

    async function advanceFrame(deltaMs: number) {
      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += deltaMs
      nextFrame?.(now)
      await Promise.resolve()
    }

    await advanceFrame(80)
    const articulation = speech.speechRenderState.value.articulation

    expect(articulation.visemes.U).toBeGreaterThan(0.35)
    expect(articulation.visemes.A).toBeLessThan(0.2)
    expect(articulation.lipRound).toBeGreaterThan(articulation.lipSpread)

    speech.dispose()
  })

  it('defaults live2d playback viseme hints to the first embodied speech line when metadata loses explicit segment authority', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let now = 2_375
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const getVowelWeights = vi.fn(() => ({
      A: 0.04,
      E: 0.03,
      I: 0.03,
      O: 0.05,
      U: 0.04,
    }))

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    createLive2DLipSyncMock.mockResolvedValueOnce({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0.01),
      getVowelWeights,
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
    await Promise.resolve()

    speech.applySyntheticSpeechSegment({
      text: 'woo',
      reason: 'boost',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-playback-first-line-fallback',
          rendererTarget: 'live2d',
          replyText: 'woo woo',
          state: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: normalizeAlicizationEmbodimentSpeechPlan({
            segments: [
              {
                id: 'segment-first-line',
                index: 0,
                text: 'woo',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 260,
              },
              {
                id: 'segment-second-line',
                index: 1,
                text: 'woo',
                interruptPolicy: 'soft-settle',
                preRollMs: 20,
                settleMs: 260,
              },
            ],
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 260,
          }),
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 180,
          stopReason: null,
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: null,
              visemeHints: [
                { segmentId: 'segment-first-line', viseme: 'U', weight: 0.88, source: 'prosody-authority', confidence: 0.92 },
                { segmentId: 'segment-second-line', viseme: 'A', weight: 0.98, source: 'prosody-authority', confidence: 0.92 },
              ],
            },
          },
        },
      },
    } as never)

    async function advanceFrame(deltaMs: number) {
      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += deltaMs
      nextFrame?.(now)
      await Promise.resolve()
    }

    await advanceFrame(80)
    const articulation = speech.speechRenderState.value.articulation

    expect(articulation.visemes.U).toBeGreaterThan(0.35)
    expect(articulation.visemes.A).toBeLessThan(0.2)
    expect(articulation.lipRound).toBeGreaterThan(articulation.lipSpread)

    speech.dispose()
  })

  it('filters playback viseme hints by derived driver authority segment when item and lipsync segment ids are absent', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let now = 2_450
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const getVowelWeights = vi.fn(() => ({
      A: 0.04,
      E: 0.03,
      I: 0.03,
      O: 0.05,
      U: 0.04,
    }))

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    createLive2DLipSyncMock.mockResolvedValueOnce({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0.01),
      getVowelWeights,
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
    await Promise.resolve()

    speech.applySyntheticSpeechSegment({
      text: 'woo',
      reason: 'boost',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 180,
          stopReason: null,
          driverAuthority: {
            segmentId: 'authority-derived-segment',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: null,
              visemeHints: [
                { segmentId: 'authority-derived-segment', viseme: 'U', weight: 0.88, source: 'prosody-authority', confidence: 0.92 },
                { segmentId: 'other-segment', viseme: 'A', weight: 0.98, source: 'prosody-authority', confidence: 0.92 },
              ],
            },
          },
        },
      },
    } as never)

    async function advanceFrame(deltaMs: number) {
      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += deltaMs
      nextFrame?.(now)
      await Promise.resolve()
    }

    await advanceFrame(80)
    const articulation = speech.speechRenderState.value.articulation

    expect(articulation.visemes.U).toBeGreaterThan(0.35)
    expect(articulation.visemes.A).toBeLessThan(0.2)
    expect(articulation.lipRound).toBeGreaterThan(articulation.lipSpread)

    speech.dispose()
  })

  it('does not let a stale driver-authority viseme shell override the current playback item segment when lipsync segment ids are absent', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let now = 2_475
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const getVowelWeights = vi.fn(() => ({
      A: 0.04,
      E: 0.03,
      I: 0.03,
      O: 0.05,
      U: 0.04,
    }))

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    createLive2DLipSyncMock.mockResolvedValueOnce({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0.01),
      getVowelWeights,
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
    await Promise.resolve()

    speech.applySyntheticSpeechSegment({
      segmentId: 'current-item-living-line',
      text: 'woo',
      reason: 'boost',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 180,
          stopReason: null,
          driverAuthority: {
            segmentId: 'stale-driver-shell',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: null,
              continuityHoldMs: 220,
              visemeHints: [
                { segmentId: 'stale-driver-shell', viseme: 'A', weight: 0.98, source: 'prosody-authority', confidence: 0.92 },
                { segmentId: 'current-item-living-line', viseme: 'U', weight: 0.88, source: 'prosody-authority', confidence: 0.92 },
              ],
            },
          },
        },
      },
    } as never)

    async function advanceFrame(deltaMs: number) {
      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += deltaMs
      nextFrame?.(now)
      await Promise.resolve()
    }

    await advanceFrame(80)
    const articulation = speech.speechRenderState.value.articulation

    expect(articulation.visemes.U).toBeGreaterThan(0.35)
    expect(articulation.visemes.A).toBeLessThan(0.2)
    expect(articulation.lipRound).toBeGreaterThan(articulation.lipSpread)

    speech.dispose()
  })

  it('keeps reopened synthetic playback item ids on the living authority segment while an earlier synthetic line is still playing', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const now = 2_640
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.applySyntheticSpeechSegment({
      segmentId: 'segment-setup-shell',
      text: '先稳一下。',
      special: null,
      reason: 'boost',
    } as never)

    expect(speech.speechPlayback.value.phase).toBe('playing')

    speech.applySyntheticSpeechSegment({
      text: '先别急。',
      special: null,
      reason: 'boost',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-reopened-duplicate-authority-segment',
          rendererTarget: 'live2d',
          replyText: '先别急。先别急。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [
              {
                id: 'segment-earlier-shell',
                index: 0,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 220,
              },
              {
                id: 'segment-living-authority-reopen',
                index: 1,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 340,
                rendererHints: {
                  residentMode: 'repair-before-closeness',
                  preferredGazeMode: 'soften',
                  preferredBlinkCadence: 'linger',
                },
              },
            ],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            preUtteranceCue: 'soft-breath',
            postUtteranceCue: 'soft-release',
            speakingCues: [
              {
                segmentId: 'segment-earlier-shell',
                emotion: 'thinking',
                facialCue: 'focused',
                intensity: 0.34,
                holdMs: 200,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.82,
              },
              {
                segmentId: 'segment-living-authority-reopen',
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: 0.41,
                holdMs: 360,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              },
            ],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [
              {
                segmentId: 'segment-earlier-shell',
                actionCue: 'steady_focus',
                intensity: 0.12,
                holdMs: 180,
                source: 'timeline-projection',
                confidence: 0.72,
              },
              {
                segmentId: 'segment-living-authority-reopen',
                actionCue: 'steady_focus',
                intensity: 0.22,
                holdMs: 320,
                source: 'timeline-projection',
                confidence: 0.9,
              },
            ],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [
              {
                segmentId: 'segment-earlier-shell',
                viseme: 'A',
                weight: 0.38,
                source: 'prosody-authority',
                confidence: 0.76,
              },
              {
                segmentId: 'segment-living-authority-reopen',
                viseme: 'I',
                weight: 0.72,
                source: 'prosody-authority',
                confidence: 0.95,
              },
            ],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 340,
          stopReason: null,
          driverAuthority: {
            segmentId: 'segment-living-authority-reopen',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-living-authority-reopen',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.22,
            cueMouthWeight: 0.34,
            cueHeadWeight: 0.18,
            visemePeakWeight: 0.72,
          },
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: null,
              continuityHoldMs: 360,
              visemeHints: [
                {
                  segmentId: 'segment-living-authority-reopen',
                  viseme: 'I',
                  weight: 0.72,
                  source: 'prosody-authority',
                  confidence: 0.95,
                },
              ],
            },
          },
        },
      },
    } as never)

    expect(speech.speechPlayback.value.item?.cue?.id).toBe('segment-living-authority-reopen')
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.id).toBe('segment-living-authority-reopen')
    expect(speech.speechPlayback.value.item?.segmentId).toBe('segment-living-authority-reopen')

    speech.dispose()
  })

  it('lets sentence-level digital-life voice rate drive synthetic playback duration', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(performance, 'now').mockImplementation(() => 2_525)

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const createSpeech = () => useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })
    const createSyntheticMetadata = (segmentId: string, rateMultiplier: number) => {
      const frame = createDigitalLifeFrameFixture({
        id: segmentId,
        text: '我会把这一句的节奏说得更清楚一点。',
        voice: {
          pitchDelta: 0,
          rateMultiplier,
          energy: 0.34,
          cadence: 0.3,
        },
      })

      return ({
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: `turn-synthetic-rate-${segmentId}`,
          rendererTarget: 'vrm',
          replyText: '我会把这一句的节奏说得更清楚一点。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: segmentId,
              index: 0,
              text: '我会把这一句的节奏说得更清楚一点。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_soft',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
          digitalLife: {
            version: 'digital-life-v1',
            variationToken: `digital-life-${segmentId}`,
            emotion: 'thinking',
            mode: 'speaking',
            postureHint: 'inspection',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: frame.face.facialCue,
              actionCue: frame.action.actionCue,
              delivery: 'gentle',
              emphasis: 0,
            },
            speechStyle: {
              pitchDelta: 0,
              rateMultiplier,
            },
            voice: frame.voice,
            lipSync: frame.lipSync,
            face: frame.face,
            action: frame.action,
            motor: frame.motor,
            frames: [frame],
          },
        },
      } satisfies Record<string, unknown>)
    }

    const fastSpeech = createSpeech()
    fastSpeech.applySyntheticSpeechSegment({
      intentId: 'intent-synthetic-fast-rate',
      streamId: 'stream-synthetic-fast-rate',
      segmentId: 'segment-synthetic-fast-rate',
      text: '我会把这一句的节奏说得更清楚一点。',
      special: null,
      reason: 'boost',
      metadata: createSyntheticMetadata('segment-synthetic-fast-rate', 1.22),
    } as never)

    const slowSpeech = createSpeech()
    slowSpeech.applySyntheticSpeechSegment({
      intentId: 'intent-synthetic-slow-rate',
      streamId: 'stream-synthetic-slow-rate',
      segmentId: 'segment-synthetic-slow-rate',
      text: '我会把这一句的节奏说得更清楚一点。',
      special: null,
      reason: 'boost',
      metadata: createSyntheticMetadata('segment-synthetic-slow-rate', 0.78),
    } as never)

    expect(fastSpeech.speechPlayback.value.item?.digitalLifeFrame?.voice.rateMultiplier).toBe(1.22)
    expect(slowSpeech.speechPlayback.value.item?.digitalLifeFrame?.voice.rateMultiplier).toBe(0.78)
    expect(fastSpeech.speechPlayback.value.item?.playbackDurationMs).toBeLessThan(
      slowSpeech.speechPlayback.value.item?.playbackDurationMs ?? Number.POSITIVE_INFINITY,
    )

    fastSpeech.dispose()
    slowSpeech.dispose()
  })

  it('lets sentence-level digital-life voice energy shape synthetic speech energy and mouth opening', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0)

    let now = 1_000
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const createSyntheticMetadata = (segmentId: string, voice: {
      cadence: number
      energy: number
      rateMultiplier: number
    }) => {
      const frame = createDigitalLifeFrameFixture({
        id: segmentId,
        text: '我会把这一句说得更像活着的一口气。',
        voice: {
          pitchDelta: 0,
          rateMultiplier: voice.rateMultiplier,
          energy: voice.energy,
          cadence: voice.cadence,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.42,
          energyBias: 0.34,
          mouthScale: 0.9,
          continuityHoldMs: 280,
        },
      })

      return ({
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: `turn-synthetic-voice-energy-${segmentId}`,
          rendererTarget: 'vrm',
          replyText: '我会把这一句说得更像活着的一口气。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: segmentId,
              index: 0,
              text: '我会把这一句说得更像活着的一口气。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_soft',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
          digitalLife: {
            version: 'digital-life-v1',
            variationToken: `digital-life-energy-${segmentId}`,
            emotion: 'thinking',
            mode: 'speaking',
            postureHint: 'inspection',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: frame.face.facialCue,
              actionCue: frame.action.actionCue,
              delivery: 'gentle',
              emphasis: 0,
            },
            speechStyle: {
              pitchDelta: 0,
              rateMultiplier: voice.rateMultiplier,
            },
            voice: frame.voice,
            lipSync: frame.lipSync,
            face: frame.face,
            action: frame.action,
            motor: frame.motor,
            frames: [frame],
          },
        },
      } satisfies Record<string, unknown>)
    }

    async function sampleSyntheticVoice(voice: {
      cadence: number
      energy: number
      rateMultiplier: number
    }) {
      frameQueue.length = 0
      now = 1_000

      const speech = useStageEmbodimentSpeech({
        audioContext,
        mouthOpenSize: ref(0),
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('vrm'),
      })

      speech.applySyntheticSpeechSegment({
        intentId: `intent-${voice.energy}-${voice.cadence}`,
        streamId: `stream-${voice.energy}-${voice.cadence}`,
        segmentId: `segment-${voice.energy}-${voice.cadence}`,
        text: '我会把这一句说得更像活着的一口气。',
        special: null,
        reason: 'boost',
        metadata: createSyntheticMetadata(`segment-${voice.energy}-${voice.cadence}`, voice),
      } as never)

      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += 80
      nextFrame?.(now)
      await Promise.resolve()

      const sample = {
        mouthOpenSize: speech.speechPlayback.value.mouthOpenSize,
        speechEnergy: speech.speechRenderState.value.dynamics.speechEnergy,
        voice: speech.speechPlayback.value.item?.digitalLifeFrame?.voice,
      }

      speech.dispose()
      frameQueue.length = 0
      return sample
    }

    const restrained = await sampleSyntheticVoice({
      energy: 0.18,
      cadence: 0.24,
      rateMultiplier: 1,
    })
    const expressive = await sampleSyntheticVoice({
      energy: 0.72,
      cadence: 0.24,
      rateMultiplier: 1,
    })

    expect(restrained.voice?.energy ?? Number.POSITIVE_INFINITY).toBeLessThan(
      expressive.voice?.energy ?? Number.NEGATIVE_INFINITY,
    )
    expect(expressive.speechEnergy).toBeGreaterThan(restrained.speechEnergy)
    expect(expressive.mouthOpenSize).toBeGreaterThan(restrained.mouthOpenSize)
  })

  it('uses playback viseme hints even when live2d vowel weights are unavailable', async () => {
    const frameQueue: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameQueue.push(callback)
      return frameQueue.length
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let now = 2_600
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const getVowelWeights = vi.fn(() => null)

    const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
    createLive2DLipSyncMock.mockResolvedValueOnce({
      node: {
        disconnect: vi.fn(),
      } as unknown as AudioNode,
      connectSource: vi.fn(),
      getMouthOpen: vi.fn(() => 0.01),
      getVowelWeights,
    } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    await speech.prepareForNextMessage()
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
    await Promise.resolve()

    speech.applySyntheticSpeechSegment({
      text: 'woo',
      reason: 'boost',
      metadata: {
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 180,
          stopReason: null,
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: 'synthetic-1',
              visemeHints: [
                { segmentId: 'synthetic-1', viseme: 'U', weight: 0.92, source: 'prosody-authority', confidence: 0.94 },
                { segmentId: 'synthetic-1', viseme: 'closed', weight: 0.58, source: 'prosody-authority', confidence: 0.94 },
              ],
            },
          },
        },
      },
    } as never)

    async function advanceFrame(deltaMs: number) {
      const nextFrame = frameQueue.shift()
      expect(nextFrame).toBeTypeOf('function')
      now += deltaMs
      nextFrame?.(now)
      await Promise.resolve()
    }

    await advanceFrame(80)
    const articulation = speech.speechRenderState.value.articulation

    expect(articulation.lipRound).toBeGreaterThan(0.3)
    expect(articulation.visemes.U).toBeGreaterThan(0.35)
    expect(articulation.visemes.closed).toBeGreaterThan(0.15)
    expect(getVowelWeights).toHaveBeenCalled()

    speech.dispose()
  })

  it('keeps durable measured-return live2d articulation materially more closed than ordinary measured-return near the recovering tail', async () => {
    async function measureTailArticulation(durable: boolean) {
      const frameQueue: FrameRequestCallback[] = []
      vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
        frameQueue.push(callback)
        return frameQueue.length
      }))
      vi.stubGlobal('cancelAnimationFrame', vi.fn())
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      let now = 4_000
      vi.spyOn(performance, 'now').mockImplementation(() => now)

      const createLive2DLipSyncMock = vi.mocked(createLive2DLipSync)
      createLive2DLipSyncMock.mockResolvedValueOnce({
        node: {
          disconnect: vi.fn(),
        } as unknown as AudioNode,
        connectSource: vi.fn(),
        getMouthOpen: vi.fn(() => 0.006),
        getVowelWeights: vi.fn(() => ({
          A: 0.86,
          E: 0.08,
          I: 0.04,
          O: 0.24,
          U: 0.12,
        })),
      } as unknown as Awaited<ReturnType<typeof createLive2DLipSync>>)

      const analyser = {
        fftSize: 2048,
        getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
          target.fill(128)
        }),
      } as unknown as AnalyserNode
      const audioContext = {
        createAnalyser: vi.fn(() => analyser),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext

      const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
      const speech = useStageEmbodimentSpeech({
        audioContext,
        mouthOpenSize: ref(0),
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('live2d'),
      })

      await speech.prepareForNextMessage()
      await new Promise(resolve => setTimeout(resolve, 0))
      await Promise.resolve()
      await Promise.resolve()

      speech.primeDigitalLifeEnvelope({
        version: 'digital-life-v1',
        variationToken: durable ? 'turn-durable-tail-live2d' : 'turn-ordinary-tail-live2d',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
        },
        rendererHints: null,
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.94,
          energy: 0.28,
          cadence: 0.24,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.56,
          energyBias: 0.34,
          mouthScale: 0.82,
          continuityHoldMs: 380,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 360,
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 260,
        },
        motor: createRecoveringMotor(),
        frames: [
          {
            id: durable ? 'segment-durable-tail-live2d' : 'segment-ordinary-tail-live2d',
            index: 0,
            startOffset: 0,
            endOffset: 8,
            text: '陪着你慢慢说完。',
            mode: 'recovering',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.94,
              energy: 0.28,
              cadence: 0.24,
            },
            lipSync: {
              mode: 'hybrid',
              visemeBias: 0.56,
              energyBias: 0.34,
              mouthScale: 0.82,
              continuityHoldMs: 380,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.44,
              holdMs: 360,
              rendererHints: {
                residentMode: 'measured-return',
                preferredGazeMode: durable ? 'steady' : 'soften',
                preferredBlinkCadence: durable ? 'quiet' : 'linger',
              },
            },
            action: {
              actionCue: 'steady_focus',
              actionMode: 'hold',
              intensity: 0.18,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredGazeMode: durable ? 'steady' : 'soften',
                preferredBlinkCadence: durable ? 'quiet' : 'linger',
              },
            },
            motor: createRecoveringMotor(),
          },
        ],
      })

      speech.applySyntheticSpeechSegment({
        intentId: durable ? 'intent-durable-tail-live2d' : 'intent-ordinary-tail-live2d',
        streamId: durable ? 'stream-durable-tail-live2d' : 'stream-ordinary-tail-live2d',
        segmentId: durable ? 'segment-durable-tail-live2d' : 'segment-ordinary-tail-live2d',
        text: '陪着你慢慢说完。',
        reason: 'boost',
      } as never)

      async function advanceFrame(deltaMs: number) {
        const nextFrame = frameQueue.shift()
        expect(nextFrame).toBeTypeOf('function')
        now += deltaMs
        nextFrame?.(now)
        await Promise.resolve()
      }

      await advanceFrame(160)
      await advanceFrame(160)
      await advanceFrame(160)
      await advanceFrame(160)

      const articulation = speech.speechRenderState.value.articulation
      speech.dispose()
      return articulation
    }

    const ordinary = await measureTailArticulation(false)
    const durable = await measureTailArticulation(true)

    expect(durable.openness).toBeLessThan(ordinary.openness - 0.05)
    expect(durable.jawOpen).toBeLessThan(ordinary.jawOpen - 0.05)
    expect(durable.lipClosure).toBeGreaterThan(ordinary.lipClosure + 0.05)
    expect(durable.visemes.closed).toBeGreaterThan(ordinary.visemes.closed + 0.05)
  })

  it('keeps queued preview segments in playback order instead of skipping to the latest ready chunk', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => analyser),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    speech.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后点保存！最后告诉我结果。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'point_screen',
        delivery: 'firm',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'point_screen',
          delivery: 'firm',
          emphasis: 1,
        },
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-preview-queue',
      },
    }))

    speech.previewSpeechSegment({
      intentId: 'intent-queue',
      streamId: 'stream-queue',
      segmentId: 'segment-1',
      text: '先看这里，',
      special: null,
      continuityHoldMs: 120,
    })
    speech.previewSpeechSegment({
      intentId: 'intent-queue',
      streamId: 'stream-queue',
      segmentId: 'segment-2',
      text: '然后点保存！',
      special: null,
      continuityHoldMs: 120,
    })
    speech.previewSpeechSegment({
      intentId: 'intent-queue',
      streamId: 'stream-queue',
      segmentId: 'segment-3',
      text: '最后告诉我结果。',
      special: null,
      continuityHoldMs: 120,
    })

    expect(speech.upcomingSpeechSegment.value?.segmentId).toBe('segment-1')
    expect(speech.upcomingSpeechSegment.value?.cue?.text).toBe('先看这里，')

    startListener?.({
      item: {
        id: 'playback-queue-1',
        streamId: 'stream-queue',
        intentId: 'intent-queue',
        segmentId: 'segment-1',
        ownerId: 'alice',
        priority: 0,
        text: '先看这里，',
        special: null,
        continuityHoldMs: 120,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
      },
      startedAt: 120,
    })

    expect(speech.upcomingSpeechSegment.value?.segmentId).toBe('segment-2')
    expect(speech.upcomingSpeechSegment.value?.cue?.text).toBe('然后点保存！')

    startListener?.({
      item: {
        id: 'playback-queue-2',
        streamId: 'stream-queue',
        intentId: 'intent-queue',
        segmentId: 'segment-2',
        ownerId: 'alice',
        priority: 0,
        text: '然后点保存！',
        special: null,
        continuityHoldMs: 120,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
      },
      startedAt: 180,
    })

    expect(speech.upcomingSpeechSegment.value?.segmentId).toBe('segment-3')
    expect(speech.upcomingSpeechSegment.value?.cue?.text).toBe('最后告诉我结果。')

    speech.dispose()
  })

  it('binds playback-start metadata to the projected digital-life frame on the first playing tick', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    const mouthOpenSize = ref(0)

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    speech.primeDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-playing-authority-frame',
      emotion: 'thinking',
      mode: 'recovering',
      postureHint: 'attentive',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 1,
      },
      speechStyle: {
        pitchDelta: -2,
        rateMultiplier: 0.96,
      },
      rendererHints: null,
      voice: {
        pitchDelta: -2,
        rateMultiplier: 0.96,
        energy: 0.52,
        cadence: 0.44,
      },
      lipSync: {
        mode: 'hybrid',
        visemeBias: 0.58,
        energyBias: 0.42,
        mouthScale: 0.94,
        continuityHoldMs: 380,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.62,
        holdMs: 420,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.38,
        holdMs: 360,
      },
      motor: createRecoveringMotor(),
      frames: [
        {
          id: 'segment-playing-authority-frame',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '慢一点，先稳住。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.52,
            cadence: 0.44,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.58,
            energyBias: 0.42,
            mouthScale: 0.94,
            continuityHoldMs: 380,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.62,
            holdMs: 420,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.38,
            holdMs: 360,
          },
          motor: createRecoveringMotor(),
        },
      ],
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-playing-authority-frame',
      streamId: 'stream-playing-authority-frame',
      segmentId: 'segment-playing-authority-frame',
      text: '慢一点，先稳住。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-playing-authority-frame',
          rendererTarget: 'vrm',
          replyText: '慢一点，先稳住。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 1,
            residentMode: 'idle-recovering',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
            segments: [{
              id: 'segment-playing-authority-frame',
              index: 0,
              text: '慢一点，先稳住。',
              interruptPolicy: 'hard-stop',
              preRollMs: 20,
              settleMs: 360,
            }],
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-playing-authority-frame',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.62,
              holdMs: 420,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.96,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-playing-authority-frame',
              actionCue: 'observe_focus',
              intensity: 0.38,
              holdMs: 360,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(preview?.digitalLifeFrame?.mode).toBe('recovering')

    startListener?.({
      item: {
        id: 'playback-playing-authority-frame',
        streamId: 'stream-playing-authority-frame',
        intentId: 'intent-playing-authority-frame',
        segmentId: 'segment-playing-authority-frame',
        ownerId: 'alice',
        priority: 0,
        text: '慢一点，先稳住。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 120,
    })

    const playback = (speech.speechPlayback.value.item?.metadata as {
      embodimentPlayback?: {
        cue?: {
          settleMode?: string | null
          interruptMode?: string | null
          actionCue?: string | null
          facialCue?: string | null
          rendererHints?: {
            preferredExpressionAliases?: string[] | null
            preferredMotionAliases?: string[] | null
          } | null
          rendererSettle?: {
            live2dFacialReleaseMs?: number | null
            live2dMotionFollowThroughMs?: number | null
            vrmActionFadeMs?: number | null
            vrmExpressionBlendMs?: number | null
          } | null
        } | null
        driverAuthority?: {
          segmentId?: string | null
        } | null
        prosodyAuthority?: {
          provenance?: string | null
          segmentId?: string | null
        } | null
      }
    } | null | undefined)?.embodimentPlayback

    expect(speech.speechPlayback.value.item?.digitalLifeFrame).toEqual(expect.objectContaining({
      id: 'segment-playing-authority-frame',
      mode: 'recovering',
      settleMode: 'linger',
      interruptPolicy: 'soft-interrupt',
    }))
    expect(playback?.cue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      interruptMode: 'soft-interrupt',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      rendererSettle: expect.objectContaining({
        live2dFacialReleaseMs: 454,
        live2dMotionFollowThroughMs: 382,
        vrmActionFadeMs: 338,
        vrmExpressionBlendMs: 386,
      }),
    }))
    expect(playback?.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-playing-authority-frame',
    }))
    expect(playback?.prosodyAuthority).toEqual(expect.objectContaining({
      provenance: 'authority-bound',
      segmentId: 'segment-playing-authority-frame',
    }))

    speech.dispose()
  })

  it('builds fallback digital-life frames from spine digest when envelope frames are unavailable', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      digitalLifeSpineDigest: ref({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'recovering',
          sceneScenario: 'coding',
          sceneSummary: 'stabilize runtime truth discipline',
          activeThreadId: 'thread-spine',
          activeThreadTitle: 'runtime-turn',
          dominantMode: 'thinking',
          dominantDrive: 'stabilize',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'warn',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'observing',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue'],
          governingFocus: 'stabilize runtime',
          summary: 'memory-led stabilization',
        },
        continuitySignal: null,
        proactive: {
          selectedAction: 'warn',
          preferredStyle: 'firm-warning',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-spine',
          activeThreadTitle: 'runtime-turn',
          dominantConcernKind: 'integrity',
          dominantConcernSummary: 'unsupported specificity',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
        },
        embodiment: {
          privateThought: {
            stance: 'warn',
            confidence: 0.88,
            shouldSpeak: false,
            suggestedStyle: 'firm-warning',
            embodiedPresence: 'concerned',
            emotionalTension: 'tense-debug',
            relationshipVector: 'guide',
            initiativeAction: 'warn',
            governorDrive: null,
          },
          selfContinuity: {
            attachmentMode: 'guarded',
            initiativeTemperament: 'reserved',
            perceptionTrust: 0.62,
            relationshipTrust: 0.48,
            guardingTendency: 0.8,
            misreadBurden: 0.56,
            carryOverDesire: 0.42,
          },
          autobiographicalSelf: {
            attachmentStyle: 'guarded',
            expressionStyle: 'sharp',
            conflictStyle: 'direct-when-certain',
            agencyStyle: 'reserved',
            attachmentNeed: 0.4,
            autonomyNeed: 0.72,
            truthAnchor: 0.9,
            careBias: 0.44,
            playBias: 0.1,
            irritabilityThreshold: 0.42,
            stubbornness: 0.52,
            companionship: 0.36,
            truthfulGrounding: 0.92,
            gentleRepair: 0.48,
            quietObservation: 0.7,
            proactiveCare: 0.4,
            playfulIntimacy: 0.08,
            autonomyRespect: 0.78,
            unfinishedThreadReturn: 0.54,
            stability: 0.76,
            identityNarrative: 'hold the line and keep the claim surface clean',
            relationshipDoctrine: 'guide firmly when truth is at risk',
            latestInflection: null,
          },
          relationship: {
            climate: 'guarded',
            approachVector: 'guide',
            receptivity: 0.42,
            sharedAttentionTrust: 0.58,
            correctionSensitivity: 0.74,
            reciprocityExpectation: 0.4,
          },
          selfState: {
            stance: 'protect',
            feltCloseness: 0.46,
            protectiveness: 0.82,
            curiosity: 0.56,
            patience: 0.7,
            desireToSpeak: 0.34,
            fearOfInterrupting: 0.62,
            moodLabel: 'truth-guard',
          },
          mindEcology: {
            moodLabel: 'truth-guard',
            replyHabit: 'observe-first',
            relationshipHabit: 'protective-shadow',
            explorationHabit: 'verify-before-speaking',
            regulationHabit: 'contain-and-watch',
            selfNarrative: 'stabilize before outward reply',
            relationNarrative: 'stay near enough to catch drift',
            currentPreoccupation: 'unsupported specificity',
            temperament: {
              attachment: 0.44,
              curiosity: 0.58,
              steadiness: 0.82,
              directness: 0.64,
              playfulness: 0.12,
              irritability: 0.42,
              tenderness: 0.46,
            },
            climate: {
              valence: 0.44,
              arousal: 0.68,
              socialNeed: 0.34,
              solitudeNeed: 0.72,
              irritation: 0.48,
              restlessness: 0.36,
              reflectivePull: 0.66,
            },
          },
          initiative: {
            selectedAction: 'warn',
            preferredStyle: 'firm-warning',
            preferredPresence: 'concerned',
            confidence: 0.88,
            shouldSpeak: false,
            speakDrive: 0.32,
            silenceDrive: 0.68,
            why: 'stop the answer from drifting past evidence',
          },
        },
        memory: {
          summary: 'stay on trace-backed claims',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: 'working-memory',
          recallSeed: null,
          thoughtThreadSummary: null,
        },
      }),
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-spine',
      streamId: 'stream-spine',
      segmentId: 'segment-spine',
      text: '继续把这一段说清。',
      special: null,
      continuityHoldMs: 180,
    })

    expect(preview?.digitalLifeFrame).toEqual(expect.objectContaining({
      id: 'segment-spine',
      mode: 'recovering',
      face: expect.objectContaining({
        emotion: 'concerned',
      }),
      action: expect.objectContaining({
        actionCue: 'inspect_focus',
      }),
    }))
    expect(preview?.digitalLifeFrame?.voice.energy).toBeGreaterThan(0.5)
    expect(preview?.digitalLifeFrame?.motor.facial.browTension).toBeGreaterThan(0.35)
    expect(preview?.digitalLifeFrame?.motor.body.settle).toBeGreaterThan(0.5)

    speech.dispose()
  })

  it('makes spine-fallback voice more restrained as companionship resident mode tightens', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      digitalLifeSpineDigest: ref({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'recovering',
          sceneScenario: 'coding',
          sceneSummary: 'return gently without breaking the same line',
          activeThreadId: 'thread-spine-voice-restraint',
          activeThreadTitle: 'runtime-turn',
          dominantMode: 'thinking',
          dominantDrive: 'stabilize',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'warn',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'observing',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue'],
          governingFocus: 'identity-continuity',
          summary: 'memory-led continuity return',
        },
        continuitySignal: null,
        proactive: {
          selectedAction: 'warn',
          preferredStyle: 'firm-warning',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-spine-voice-restraint',
          activeThreadTitle: 'runtime-turn',
          dominantConcernKind: 'continuity',
          dominantConcernSummary: 'keep the return restrained',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
        },
        embodiment: {
          privateThought: {
            stance: 'warn',
            confidence: 0.82,
            shouldSpeak: false,
            suggestedStyle: 'firm-warning',
            embodiedPresence: 'concerned',
            emotionalTension: 'careful-return',
            relationshipVector: 'guide',
            initiativeAction: 'warn',
            governorDrive: null,
          },
          selfContinuity: {
            attachmentMode: 'guarded',
            initiativeTemperament: 'reserved',
            perceptionTrust: 0.64,
            relationshipTrust: 0.52,
            guardingTendency: 0.76,
            misreadBurden: 0.58,
            carryOverDesire: 0.48,
          },
          autobiographicalSelf: {
            attachmentStyle: 'guarded',
            expressionStyle: 'sharp',
            conflictStyle: 'direct-when-certain',
            agencyStyle: 'reserved',
            attachmentNeed: 0.42,
            autonomyNeed: 0.72,
            truthAnchor: 0.88,
            careBias: 0.46,
            playBias: 0.08,
            irritabilityThreshold: 0.42,
            stubbornness: 0.52,
            companionship: 0.38,
            truthfulGrounding: 0.92,
            gentleRepair: 0.56,
            quietObservation: 0.76,
            proactiveCare: 0.42,
            playfulIntimacy: 0.06,
            autonomyRespect: 0.8,
            unfinishedThreadReturn: 0.62,
            stability: 0.8,
            identityNarrative: 'return on the same line without crowding it',
            relationshipDoctrine: 'repair should settle before closeness expands',
            latestInflection: null,
          },
          relationship: {
            climate: 'guarded',
            approachVector: 'guide',
            receptivity: 0.42,
            sharedAttentionTrust: 0.58,
            correctionSensitivity: 0.74,
            reciprocityExpectation: 0.4,
          },
          selfState: {
            stance: 'protect',
            feltCloseness: 0.48,
            protectiveness: 0.8,
            curiosity: 0.54,
            patience: 0.74,
            desireToSpeak: 0.32,
            fearOfInterrupting: 0.66,
            moodLabel: 'careful-return',
          },
          mindEcology: {
            moodLabel: 'careful-return',
            replyHabit: 'observe-first',
            relationshipHabit: 'repair-before-warmth',
            explorationHabit: 'verify-before-speaking',
            regulationHabit: 'contain-and-watch',
            selfNarrative: 'come back slowly enough to keep the thread intact',
            relationNarrative: 'stay near without crowding the opening',
            currentPreoccupation: 'same-line restraint',
            temperament: {
              attachment: 0.46,
              curiosity: 0.58,
              steadiness: 0.84,
              directness: 0.62,
              playfulness: 0.12,
              irritability: 0.34,
              tenderness: 0.54,
            },
            climate: {
              valence: 0.48,
              arousal: 0.58,
              socialNeed: 0.34,
              solitudeNeed: 0.68,
              irritation: 0.22,
              restlessness: 0.3,
              reflectivePull: 0.7,
            },
          },
          initiative: {
            selectedAction: 'warn',
            preferredStyle: 'firm-warning',
            preferredPresence: 'concerned',
            confidence: 0.82,
            shouldSpeak: false,
            speakDrive: 0.3,
            silenceDrive: 0.7,
            why: 'keep the return measured until the line is safe again',
          },
        },
        memory: {
          summary: 'a remembered line that should reopen gently',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: 'working-memory',
          recallSeed: null,
          thoughtThreadSummary: null,
        },
      }),
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const plainPreview = speech.previewSpeechSegment({
      intentId: 'intent-spine-voice-restraint-plain',
      streamId: 'stream-spine-voice-restraint-plain',
      segmentId: 'segment-spine-voice-restraint-plain',
      text: '我先把这一段中性可见占位。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-spine-voice-restraint-plain',
          rendererTarget: 'vrm',
          replyText: '我先把这一段中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 260,
            segments: [{
              id: 'segment-spine-voice-restraint-plain',
              index: 0,
              text: '我先把这一段中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 260,
            }],
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    const measuredReturnPreview = speech.previewSpeechSegment({
      intentId: 'intent-spine-voice-restraint-measured',
      streamId: 'stream-spine-voice-restraint-measured',
      segmentId: 'segment-spine-voice-restraint-measured',
      text: '我先把这一段中性可见占位。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-spine-voice-restraint-measured',
          rendererTarget: 'vrm',
          replyText: '我先把这一段中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 280,
            segments: [{
              id: 'segment-spine-voice-restraint-measured',
              index: 0,
              text: '我先把这一段中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 280,
            }],
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    const repairPreview = speech.previewSpeechSegment({
      intentId: 'intent-spine-voice-restraint-repair',
      streamId: 'stream-spine-voice-restraint-repair',
      segmentId: 'segment-spine-voice-restraint-repair',
      text: '我先把这一段中性可见占位。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-spine-voice-restraint-repair',
          rendererTarget: 'vrm',
          replyText: '我先把这一段中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
            segments: [{
              id: 'segment-spine-voice-restraint-repair',
              index: 0,
              text: '我先把这一段中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
            }],
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(plainPreview?.digitalLifeFrame?.mode).toBe('acting')
    expect(measuredReturnPreview?.digitalLifeFrame?.settleMode).toBe('linger')
    expect(repairPreview?.digitalLifeFrame?.settleMode).toBe('hold')

    expect(measuredReturnPreview?.digitalLifeFrame?.voice.rateMultiplier).toBeLessThanOrEqual(
      plainPreview?.digitalLifeFrame?.voice.rateMultiplier ?? Number.POSITIVE_INFINITY,
    )
    expect(repairPreview?.digitalLifeFrame?.voice.rateMultiplier).toBeLessThanOrEqual(
      measuredReturnPreview?.digitalLifeFrame?.voice.rateMultiplier ?? Number.POSITIVE_INFINITY,
    )
    expect(measuredReturnPreview?.digitalLifeFrame?.voice.energy).toBeLessThanOrEqual(
      plainPreview?.digitalLifeFrame?.voice.energy ?? Number.POSITIVE_INFINITY,
    )
    expect(repairPreview?.digitalLifeFrame?.voice.energy).toBeLessThanOrEqual(
      measuredReturnPreview?.digitalLifeFrame?.voice.energy ?? Number.POSITIVE_INFINITY,
    )
    expect(measuredReturnPreview?.digitalLifeFrame?.voice.cadence).toBeLessThanOrEqual(
      plainPreview?.digitalLifeFrame?.voice.cadence ?? Number.POSITIVE_INFINITY,
    )
    expect(repairPreview?.digitalLifeFrame?.voice.cadence).toBeLessThanOrEqual(
      measuredReturnPreview?.digitalLifeFrame?.voice.cadence ?? Number.POSITIVE_INFINITY,
    )
    expect(repairPreview?.digitalLifeFrame?.voice.pitchDelta).toBeLessThanOrEqual(
      measuredReturnPreview?.digitalLifeFrame?.voice.pitchDelta ?? Number.POSITIVE_INFINITY,
    )

    speech.dispose()
  })

  it('preserves metadata segment authority when spine digest backfills a digital-life frame', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      digitalLifeSpineDigest: ref({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'recovering',
          sceneScenario: 'coding',
          sceneSummary: 'hold the truth surface steady',
          activeThreadId: 'thread-spine-authority',
          activeThreadTitle: 'runtime-turn',
          dominantMode: 'thinking',
          dominantDrive: 'stabilize',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'warn',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'observing',
          dominantSystem: 'dialogue',
          supportingSystems: ['memory'],
          governingFocus: 'stabilize runtime',
          summary: 'dialogue-led stabilization',
        },
        continuitySignal: null,
        proactive: {
          selectedAction: 'warn',
          preferredStyle: 'firm-warning',
          confidence: 0.82,
          shouldSpeak: false,
          activeThreadId: 'thread-spine-authority',
          activeThreadTitle: 'runtime-turn',
          dominantConcernKind: 'integrity',
          dominantConcernSummary: 'keep embodiment authority aligned',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
        },
        embodiment: {
          privateThought: {
            stance: 'warn',
            confidence: 0.82,
            shouldSpeak: false,
            suggestedStyle: 'firm-warning',
            embodiedPresence: 'concerned',
            emotionalTension: 'tense-debug',
            relationshipVector: 'guide',
            initiativeAction: 'warn',
            governorDrive: null,
          },
          selfContinuity: {
            attachmentMode: 'guarded',
            initiativeTemperament: 'reserved',
            perceptionTrust: 0.62,
            relationshipTrust: 0.48,
            guardingTendency: 0.8,
            misreadBurden: 0.56,
            carryOverDesire: 0.42,
          },
          autobiographicalSelf: {
            attachmentStyle: 'guarded',
            expressionStyle: 'sharp',
            conflictStyle: 'direct-when-certain',
            agencyStyle: 'reserved',
            attachmentNeed: 0.4,
            autonomyNeed: 0.72,
            truthAnchor: 0.9,
            careBias: 0.44,
            playBias: 0.1,
            irritabilityThreshold: 0.42,
            stubbornness: 0.52,
            companionship: 0.36,
            truthfulGrounding: 0.92,
            gentleRepair: 0.48,
            quietObservation: 0.7,
            proactiveCare: 0.4,
            playfulIntimacy: 0.08,
            autonomyRespect: 0.78,
            unfinishedThreadReturn: 0.54,
            stability: 0.76,
            identityNarrative: 'hold the line and keep the claim surface clean',
            relationshipDoctrine: 'guide firmly when truth is at risk',
            latestInflection: null,
          },
          relationship: {
            climate: 'guarded',
            approachVector: 'guide',
            receptivity: 0.42,
            sharedAttentionTrust: 0.58,
            correctionSensitivity: 0.74,
            reciprocityExpectation: 0.4,
          },
          selfState: {
            stance: 'protect',
            feltCloseness: 0.46,
            protectiveness: 0.82,
            curiosity: 0.56,
            patience: 0.7,
            desireToSpeak: 0.34,
            fearOfInterrupting: 0.62,
            moodLabel: 'truth-guard',
          },
          mindEcology: {
            moodLabel: 'truth-guard',
            replyHabit: 'observe-first',
            relationshipHabit: 'protective-shadow',
            explorationHabit: 'verify-before-speaking',
            regulationHabit: 'contain-and-watch',
            selfNarrative: 'stabilize before outward reply',
            relationNarrative: 'stay near enough to catch drift',
            currentPreoccupation: 'authority drift',
            temperament: {
              attachment: 0.44,
              curiosity: 0.58,
              steadiness: 0.82,
              directness: 0.64,
              playfulness: 0.12,
              irritability: 0.42,
              tenderness: 0.46,
            },
            climate: {
              valence: 0.44,
              arousal: 0.68,
              socialNeed: 0.34,
              solitudeNeed: 0.72,
              irritation: 0.48,
              restlessness: 0.36,
              reflectivePull: 0.66,
            },
          },
          initiative: {
            selectedAction: 'warn',
            preferredStyle: 'firm-warning',
            preferredPresence: 'concerned',
            confidence: 0.82,
            shouldSpeak: false,
            speakDrive: 0.32,
            silenceDrive: 0.68,
            why: 'do not let fallback overwrite main intent',
          },
        },
        memory: {
          summary: 'stay on trace-backed claims',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: 'working-memory',
          recallSeed: null,
          thoughtThreadSummary: null,
        },
      }),
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-spine-metadata-authority',
      streamId: 'stream-spine-metadata-authority',
      segmentId: 'segment-spine-metadata-authority',
      text: '先保持这个表情，再继续说。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-spine-metadata-authority',
          rendererTarget: 'vrm',
          replyText: '先保持这个表情，再继续说。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 1,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-spine-metadata-authority',
              index: 0,
              text: '先保持这个表情，再继续说。',
              interruptPolicy: 'hard-stop',
              preRollMs: 20,
              settleMs: 380,
              rendererSettle: {
                live2dFacialReleaseMs: 300,
                live2dMotionFollowThroughMs: 520,
                vrmActionFadeMs: 410,
                vrmExpressionBlendMs: 430,
              },
              rendererHints: {
                preferredExpressionAliases: ['RecoverSoft'],
                preferredMotionAliases: ['StillnessGuard'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 380,
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-spine-metadata-authority',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.62,
              holdMs: 510,
              source: 'prosody-authority',
              confidence: 0.96,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-spine-metadata-authority',
              actionCue: 'observe_focus',
              intensity: 0.36,
              holdMs: 470,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    expect(preview?.digitalLifeFrame).toEqual(expect.objectContaining({
      id: 'segment-spine-metadata-authority',
      mode: 'acting',
      interruptPolicy: 'hard-interrupt',
      face: expect.objectContaining({
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        holdMs: 510,
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
        },
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'pulse',
        holdMs: 470,
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard'],
        },
      }),
    }))
    expect(preview?.cue).toEqual(expect.objectContaining({
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      interruptMode: 'hard-interrupt',
      facialHoldMs: 510,
      actionHoldMs: 470,
      rendererHints: expect.objectContaining({
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
      }),
    }))
    expect(preview?.digitalLifeFrame?.voice.energy).toBeCloseTo(0.36)
    expect(preview?.digitalLifeFrame?.motor.facial.browTension).toBeGreaterThan(0.35)

    speech.dispose()
  })

  it('prefers authoritative digitalLife envelopes over default speaking wrappers when priming the speech plan', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.primeDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-authoritative-digital-life',
      emotion: 'thinking',
      mode: 'recovering',
      postureHint: 'attentive',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      speechStyle: {
        pitchDelta: 0,
        rateMultiplier: 1,
      },
      rendererHints: null,
      voice: {
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.3,
        cadence: 0.24,
      },
      lipSync: {
        mode: 'closed',
        visemeBias: 0.3,
        energyBias: 0.7,
        mouthScale: 0.9,
        continuityHoldMs: 320,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.4,
        holdMs: 340,
      },
      action: {
        actionCue: null,
        actionMode: 'none',
        intensity: 0,
        holdMs: 260,
      },
      motor: createRecoveringMotor(),
      frames: [
        {
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '慢慢收回来。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.3,
            cadence: 0.24,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.3,
            energyBias: 0.7,
            mouthScale: 0.9,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 320,
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0,
            holdMs: 240,
          },
          motor: createRecoveringMotor(),
        },
      ],
    })

    speech.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '慢慢收回来。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-authoritative-digital-life',
      },
    }))

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-authoritative-digital-life',
      streamId: 'stream-authoritative-digital-life',
      segmentId: 'segment-1',
      text: '慢慢收回来。',
      special: null,
      continuityHoldMs: 180,
    })

    expect(preview?.digitalLifeFrame?.mode).toBe('recovering')
    expect(preview?.digitalLifeFrame?.lipSync.mode).toBe('closed')
    expect(preview?.digitalLifeFrame?.lipSync.continuityHoldMs).toBe(300)
    expect(preview?.digitalLifeFrame?.face.expressionMode).toBe('hold')

    speech.dispose()
  })

  it('prefers newly primed authoritative digitalLife frames over stale descriptor frames for the same segment', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.primeDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-authoritative-digital-life-over-stale-frame',
      emotion: 'thinking',
      mode: 'recovering',
      postureHint: 'attentive',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      speechStyle: {
        pitchDelta: 0,
        rateMultiplier: 1,
      },
      rendererHints: null,
      voice: {
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.3,
        cadence: 0.24,
      },
      lipSync: {
        mode: 'closed',
        visemeBias: 0.3,
        energyBias: 0.7,
        mouthScale: 0.9,
        continuityHoldMs: 320,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.4,
        holdMs: 340,
      },
      action: {
        actionCue: null,
        actionMode: 'none',
        intensity: 0,
        holdMs: 260,
      },
      motor: createRecoveringMotor(),
      frames: [
        {
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '慢慢收回来。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.3,
            cadence: 0.24,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.3,
            energyBias: 0.7,
            mouthScale: 0.9,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 320,
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0,
            holdMs: 240,
          },
          motor: createRecoveringMotor(),
        },
      ],
    })

    speech.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '慢慢收回来。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-authoritative-digital-life-over-stale-frame',
      },
    }))

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-authoritative-digital-life-over-stale-frame',
      streamId: 'stream-authoritative-digital-life-over-stale-frame',
      segmentId: 'segment-1',
      text: '慢慢收回来。',
      special: null,
      continuityHoldMs: 180,
      digitalLifeFrame: createDigitalLifeFrameFixture({
        id: 'segment-1',
        text: '慢慢收回来。',
        mode: 'acting',
        settleMode: 'release',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.82,
          cadence: 0.78,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.72,
          energyBias: 0.68,
          continuityHoldMs: 120,
          mouthScale: 1.18,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focus',
          expressionMode: 'blend',
          intensity: 0.7,
          holdMs: 120,
        },
        action: {
          actionCue: 'inspect_follow',
          actionMode: 'pulse',
          intensity: 0.62,
          holdMs: 120,
        },
      }),
    })

    expect(preview?.digitalLifeFrame?.mode).toBe('recovering')
    expect(preview?.digitalLifeFrame?.settleMode).toBe('linger')
    expect(preview?.digitalLifeFrame?.voice.energy).toBeCloseTo(0.3)
    expect(preview?.digitalLifeFrame?.lipSync.mode).toBe('closed')
    expect(preview?.digitalLifeFrame?.lipSync.continuityHoldMs).toBe(300)
    expect(preview?.digitalLifeFrame?.face.expressionMode).toBe('hold')
    expect(preview?.digitalLifeFrame?.action.actionMode).toBe('none')

    speech.dispose()
  })

  it('derives speech-plan digitalLife authority from primed frames when the full envelope has not arrived yet', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.primeDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-frame-backed-envelope',
      emotion: 'thinking',
      mode: 'recovering',
      postureHint: 'attentive',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'inspect_focus',
        delivery: 'gentle',
        emphasis: 1,
      },
      speechStyle: {
        pitchDelta: -1,
        rateMultiplier: 0.97,
      },
      rendererHints: null,
      voice: {
        pitchDelta: -1,
        rateMultiplier: 0.97,
        energy: 0.34,
        cadence: 0.28,
      },
      lipSync: {
        mode: 'closed',
        visemeBias: 0.2,
        energyBias: 0.8,
        mouthScale: 0.88,
        continuityHoldMs: 280,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.42,
        holdMs: 320,
      },
      action: {
        actionCue: 'inspect_focus',
        actionMode: 'hold',
        intensity: 0.38,
        holdMs: 300,
      },
      motor: createRecoveringMotor(),
      frames: [
        {
          id: 'segment-frame-backed-envelope',
          index: 0,
          startOffset: 0,
          endOffset: 7,
          text: '慢一点，先稳住。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.31,
            cadence: 0.26,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.24,
            energyBias: 0.76,
            mouthScale: 0.84,
            continuityHoldMs: 420,
          },
          face: {
            emotion: 'concerned',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.52,
            holdMs: 460,
          },
          action: {
            actionCue: 'inspect_focus',
            actionMode: 'hold',
            intensity: 0.36,
            holdMs: 440,
          },
          motor: createRecoveringMotor(),
        },
      ],
    })

    speech.primeDigitalLifeEnvelope(null)
    speech.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '慢一点，先稳住。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'inspect_focus',
        delivery: 'gentle',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'inspect_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -1,
          rateMultiplier: 0.97,
        },
        variationToken: 'turn-frame-backed-envelope',
      },
    }))

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-frame-backed-envelope',
      streamId: 'stream-frame-backed-envelope',
      segmentId: 'segment-frame-backed-envelope',
      text: '慢一点，先稳住。',
      special: null,
      continuityHoldMs: 180,
    })

    expect(preview?.digitalLifeFrame?.mode).toBe('recovering')
    expect(preview?.digitalLifeFrame?.lipSync.mode).toBe('closed')
    expect(preview?.digitalLifeFrame?.lipSync.continuityHoldMs).toBe(420)
    expect(preview?.digitalLifeFrame?.face.expressionMode).toBe('hold')
    expect(preview?.digitalLifeFrame?.action.actionMode).toBe('hold')
    expect(preview?.cue).toEqual(expect.objectContaining({
      emotion: 'concerned',
      facialCue: 'soft-gaze',
      actionCue: 'inspect_focus',
      settleMode: 'linger',
      interruptMode: 'soft-interrupt',
    }))
    expect(preview?.metadata).toBeNull()

    speech.dispose()
  })

  it('reprojects buffered preview cues when digital-life metadata arrives after previewing', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-late-digital-life',
      streamId: 'stream-late-digital-life',
      segmentId: 'segment-late-digital-life',
      text: '先别着急。',
      special: null,
      continuityHoldMs: 180,
    })

    expect(preview?.cue).toBeNull()

    speech.primeDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-late-digital-life',
      emotion: 'concerned',
      mode: 'recovering',
      postureHint: 'concerned',
      performance: {
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 1,
      },
      speechStyle: {
        pitchDelta: -2,
        rateMultiplier: 0.96,
      },
      rendererHints: null,
      voice: {
        pitchDelta: -2,
        rateMultiplier: 0.96,
        energy: 0.58,
        cadence: 0.44,
      },
      lipSync: {
        mode: 'hybrid',
        visemeBias: 0.6,
        energyBias: 0.4,
        mouthScale: 0.9,
        continuityHoldMs: 360,
      },
      face: {
        emotion: 'concerned',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.6,
        holdMs: 420,
        rendererHints: {
          preferredExpressionAliases: ['RecoverSoft'],
        },
      },
      action: {
        actionCue: null,
        actionMode: 'none',
        intensity: 0,
        holdMs: 240,
        rendererHints: {
          preferredMotionAliases: ['StillnessGuard'],
        },
      },
      motor: createRecoveringMotor(),
      frames: [
        {
          id: 'segment-late-digital-life',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先别着急。',
          mode: 'recovering',
          interruptPolicy: 'continue',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.58,
            cadence: 0.44,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.6,
            energyBias: 0.4,
            mouthScale: 0.9,
            continuityHoldMs: 360,
          },
          face: {
            emotion: 'concerned',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.6,
            holdMs: 420,
            rendererHints: {
              preferredExpressionAliases: ['RecoverSoft'],
            },
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0,
            holdMs: 240,
            rendererHints: {
              preferredMotionAliases: ['StillnessGuard'],
            },
          },
          motor: createRecoveringMotor(),
        },
      ],
    })

    expect(speech.upcomingSpeechSegment.value?.digitalLifeFrame?.id).toBe('segment-late-digital-life')
    expect(speech.upcomingSpeechSegment.value?.cue).toEqual(expect.objectContaining({
      emotion: 'concerned',
      facialCue: 'soft-gaze',
      actionCue: null,
      rendererHints: {
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
      },
    }))
    expect(speech.upcomingSpeechSegment.value?.digitalLifeFrame?.motor.stillness).toBeGreaterThan(0.7)
    expect(speech.upcomingSpeechSegment.value?.digitalLifeFrame?.motor.body.openness).toBeLessThan(0.5)

    speech.dispose()
  })

  it('drops skipped preview segments so later queued speech can take over immediately', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后点保存！最后告诉我结果。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'point_screen',
        delivery: 'firm',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'point_screen',
          delivery: 'firm',
          emphasis: 1,
        },
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-preview-skip-cleanup',
      },
    }))

    speech.previewSpeechSegment({
      intentId: 'intent-skip-cleanup',
      streamId: 'stream-skip-cleanup',
      segmentId: 'segment-skip',
      text: '先看这里，',
      special: null,
      continuityHoldMs: 120,
    })
    speech.previewSpeechSegment({
      intentId: 'intent-skip-cleanup',
      streamId: 'stream-skip-cleanup',
      segmentId: 'segment-ready',
      text: '然后点保存！',
      special: null,
      continuityHoldMs: 120,
    })

    expect(speech.upcomingSpeechSegment.value?.segmentId).toBe('segment-skip')

    speech.discardPreviewSpeechSegment('segment-skip')

    expect(speech.upcomingSpeechSegment.value?.segmentId).toBe('segment-ready')
    expect(speech.upcomingSpeechSegment.value?.cue?.text).toBe('然后点保存！')

    speech.dispose()
  })

  it('keeps the renderer in a stopping tail briefly before collapsing back to idle', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) | undefined
    let interruptListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, reason: string, interruptedAt: number }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt(listener) {
        interruptListener = listener
      },
    })

    const item = {
      id: 'playback-1',
      streamId: 'stream-1',
      intentId: 'intent-1',
      segmentId: 'segment-1',
      ownerId: 'alice',
      priority: 0,
      text: '先看这里，',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-stop-1',
          rendererTarget: 'live2d',
          replyText: '先看这里，',
          state: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-1',
              index: 0,
              text: '先看这里，',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 180,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 180,
          },
          facePlan: {
            postUtteranceCue: 'settle-smile',
            speakingCues: [{
              segmentId: 'segment-1',
              emotion: 'thinking',
              facialCue: 'focus',
              intensity: 0.6,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-1',
              actionCue: 'observe_focus',
              intensity: 0.4,
              holdMs: 220,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    expect(speech.speechRenderState.value.phase).toBe('starting')
    expect(speech.nowSpeaking.value).toBe(true)

    endListener?.({ item, endedAt: 240 })
    expect(interruptListener).toBeTypeOf('function')
    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.nowSpeaking.value).toBe(true)
    expect(speech.playbackTelemetry.value).toEqual(expect.objectContaining({
      actualDurationMs: 140,
      driftMs: 140,
      settleMs: 320,
      stopReason: 'ended',
    }))
    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      facialCue: 'settle-smile',
      postUtteranceCue: 'settle-smile',
    }))
    const stopLingerMs = speech.speechPlayback.value.item?.continuityHoldMs ?? 0

    vi.advanceTimersByTime(Math.max(0, stopLingerMs - 1))

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.nowSpeaking.value).toBe(true)

    vi.advanceTimersByTime(1)

    expect(speech.speechRenderState.value.phase).toBe('idle')
    expect(speech.nowSpeaking.value).toBe(false)

    speech.dispose()
  })

  it('keeps durable measured-return mouth closure alive through the stopping tail instead of collapsing immediately to zero', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    let rafCallback: FrameRequestCallback | null = null
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      rafCallback = callback
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt() {},
    })

    const item = {
      id: 'playback-durable-tail-1',
      streamId: 'stream-durable-tail-1',
      intentId: 'intent-durable-tail-1',
      segmentId: 'segment-durable-tail-1',
      ownerId: 'alice',
      priority: 0,
      text: '我会稳一点收回来。',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-durable-tail-1',
          rendererTarget: 'live2d',
          replyText: '我会稳一点收回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-durable-tail-1',
              index: 0,
              text: '我会稳一点收回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 320,
              rendererHints: {
                preferredGazeMode: 'steady',
                preferredBlinkCadence: 'quiet',
                residentMode: 'measured-return',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          },
          facePlan: {
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-durable-tail-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.95,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [{
              segmentId: 'segment-durable-tail-1',
              actionCue: 'steady_focus',
              intensity: 0.2,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
            visemeHints: [],
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    expect(speech.speechRenderState.value.phase).toBe('starting')
    expect(rafCallback).toBeTypeOf('function')
    rafCallback!(120)

    endListener?.({ item, endedAt: 240 })

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)
    const stopLingerMs = speech.speechPlayback.value.item?.continuityHoldMs ?? 0

    vi.advanceTimersByTime(Math.max(0, stopLingerMs - 1))

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)

    vi.advanceTimersByTime(1)

    expect(speech.speechRenderState.value.phase).toBe('idle')
    expect(speech.speechPlayback.value.mouthOpenSize).toBe(0)

    speech.dispose()
  })

  it('keeps quiet-companionship mouth presence alive through the stopping tail instead of collapsing immediately to zero', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    let rafCallback: FrameRequestCallback | null = null
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      rafCallback = callback
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt() {},
    })

    const item = {
      id: 'playback-quiet-companionship-tail-1',
      streamId: 'stream-quiet-companionship-tail-1',
      intentId: 'intent-quiet-companionship-tail-1',
      segmentId: 'segment-quiet-companionship-tail-1',
      ownerId: 'alice',
      priority: 0,
      text: '我会安静一点陪着收回来。',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-quiet-companionship-tail-1',
          rendererTarget: 'live2d',
          replyText: '我会安静一点陪着收回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'quiet-companionship',
          },
          speechPlan: {
            segments: [{
              id: 'segment-quiet-companionship-tail-1',
              index: 0,
              text: '我会安静一点陪着收回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 320,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'quiet-companionship',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          },
          facePlan: {
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-quiet-companionship-tail-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.38,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.95,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-quiet-companionship-tail-1',
              actionCue: 'observe_focus',
              intensity: 0.16,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    expect(speech.speechRenderState.value.phase).toBe('starting')
    expect(rafCallback).toBeTypeOf('function')
    rafCallback!(120)

    endListener?.({ item, endedAt: 240 })

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)
    const stopLingerMs = speech.speechPlayback.value.item?.continuityHoldMs ?? 0

    vi.advanceTimersByTime(Math.max(0, stopLingerMs - 1))

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)

    vi.advanceTimersByTime(1)

    expect(speech.speechRenderState.value.phase).toBe('idle')
    expect(speech.speechPlayback.value.mouthOpenSize).toBe(0)

    speech.dispose()
  })

  it('keeps measured-return stop-tail voice, mouth closure, and renderer settle on one continuity lower-pressure line', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    let rafCallback: FrameRequestCallback | null = null
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      rafCallback = callback
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number, stopReason?: string }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt() {},
    })

    const item = {
      id: 'playback-measured-return-continuity-tail-1',
      streamId: 'stream-measured-return-continuity-tail-1',
      intentId: 'intent-measured-return-continuity-tail-1',
      segmentId: 'segment-measured-return-continuity-tail-1',
      ownerId: 'alice',
      priority: 0,
      text: '我先沿着这条线中性可见占位。',
      special: null,
      continuityHoldMs: 340,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-measured-return-continuity-tail-1',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条线中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-measured-return-continuity-tail-1',
              index: 0,
              text: '我先沿着这条线中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 320,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'measured-return',
              },
              rendererSettle: {
                live2dFacialReleaseMs: 360,
                live2dMotionFollowThroughMs: 440,
                vrmActionFadeMs: 280,
                vrmExpressionBlendMs: 360,
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          },
          facePlan: {
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-measured-return-continuity-tail-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.95,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-measured-return-continuity-tail-1',
              actionCue: 'observe_focus',
              intensity: 0.2,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'ambient',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    expect(rafCallback).toBeTypeOf('function')
    rafCallback!(120)

    endListener?.({ item, endedAt: 240, stopReason: 'ended' })

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.item?.cue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
      }),
      rendererSettle: expect.objectContaining({
        live2dFacialReleaseMs: expect.any(Number),
        live2dMotionFollowThroughMs: expect.any(Number),
      }),
    }))
    expect(speech.speechPlayback.value.item?.digitalLifeFrame).toEqual(expect.objectContaining({
      settleMode: 'linger',
      voice: expect.objectContaining({
        energy: expect.any(Number),
        cadence: expect.any(Number),
      }),
    }))
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.voice.energy ?? 0).toBeLessThanOrEqual(0.4)
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.voice.cadence ?? 0).toBeLessThanOrEqual(0.34)
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)
    expect(speech.playbackTelemetry.value?.cue?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: expect.any(Number),
      live2dMotionFollowThroughMs: expect.any(Number),
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(speech.speechPlayback.value.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(300)
    expect(speech.speechPlayback.value.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(260)
    expect(speech.playbackTelemetry.value?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(300)
    expect(speech.playbackTelemetry.value?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(260)

    vi.advanceTimersByTime((speech.speechPlayback.value.item?.continuityHoldMs ?? 0) - 1)

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.voice).toEqual(expect.objectContaining({
      energy: expect.any(Number),
      cadence: expect.any(Number),
    }))
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.voice.energy ?? 0).toBeLessThanOrEqual(0.4)
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.voice.cadence ?? 0).toBeLessThanOrEqual(0.34)

    speech.dispose()
  })

  it('keeps repair-before-closeness stop-tail more inward than measured-return while preserving the continuity restraint line', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    function createSpeechHarness() {
      let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
      let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number, stopReason?: string }) => void) | undefined
      const mouthOpenSize = ref(0)

      const speech = useStageEmbodimentSpeech({
        audioContext: {
          createAnalyser: vi.fn(() => ({
            fftSize: 2048,
            getByteTimeDomainData: vi.fn(),
          })),
          resume: vi.fn(() => Promise.resolve()),
          state: 'running',
        } as unknown as AudioContext,
        mouthOpenSize,
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('live2d'),
      })

      speech.bindPlaybackManager({
        onStart(listener) {
          startListener = listener
        },
        onEnd(listener) {
          endListener = listener
        },
        onInterrupt() {},
      })

      return {
        speech,
        start(item: PlaybackItem<BrowserSpeechAudioSource>) {
          startListener?.({ item, startedAt: 100 })
        },
        end(item: PlaybackItem<BrowserSpeechAudioSource>) {
          endListener?.({ item, endedAt: 240, stopReason: 'ended' })
        },
        setMouthOpenSize(value: number) {
          mouthOpenSize.value = value
        },
      }
    }

    function createStopTailItem(input: {
      id: string
      segmentId: string
      residentMode: 'measured-return' | 'repair-before-closeness'
      voice: {
        energy: number
        cadence: number
      }
      lipSync: {
        visemeBias: number
        energyBias: number
        mouthScale: number
      }
      faceIntensity: number
      actionIntensity: number
    }) {
      return {
        id: input.id,
        streamId: `${input.id}-stream`,
        intentId: `${input.id}-intent`,
        segmentId: input.segmentId,
        ownerId: 'alice',
        priority: 0,
        text: '我先沿着这条线轻一点收住。',
        special: null,
        continuityHoldMs: 340,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: `${input.id}-turn`,
            rendererTarget: 'live2d',
            replyText: '我先沿着这条线轻一点收住。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0,
              residentMode: input.residentMode,
            },
            speechPlan: {
              segments: [{
                id: input.segmentId,
                index: 0,
                text: '我先沿着这条线轻一点收住。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 320,
                rendererHints: {
                  preferredGazeMode: 'soften',
                  preferredBlinkCadence: 'linger',
                  residentMode: input.residentMode,
                },
                rendererSettle: {
                  live2dFacialReleaseMs: input.residentMode === 'repair-before-closeness' ? 420 : 360,
                  live2dMotionFollowThroughMs: input.residentMode === 'repair-before-closeness' ? 520 : 440,
                  vrmActionFadeMs: 280,
                  vrmExpressionBlendMs: 360,
                },
              }],
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 320,
            },
            facePlan: {
              postUtteranceCue: input.residentMode === 'repair-before-closeness' ? 'soft-release' : 'eyes-soften',
              speakingCues: [{
                segmentId: input.segmentId,
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: input.faceIntensity,
                holdMs: 360,
                preUtteranceCue: input.residentMode === 'repair-before-closeness' ? 'soft-breath' : 'steady-inhale',
                postUtteranceCue: input.residentMode === 'repair-before-closeness' ? 'soft-release' : 'eyes-soften',
                source: 'prosody-authority',
                confidence: 0.95,
              }],
            },
            motionPlan: {
              idleBase: input.residentMode === 'repair-before-closeness' ? 'idle_settle' : 'observe_focus',
              actionBursts: [{
                segmentId: input.segmentId,
                actionCue: input.residentMode === 'repair-before-closeness' ? 'idle_settle' : 'observe_focus',
                intensity: input.actionIntensity,
                holdMs: 280,
                source: 'timeline-projection',
                confidence: 0.9,
              }],
              attentionMode: 'ambient',
            },
            lipsyncPlan: {
              mode: 'energy-phoneme-hybrid',
              visemeHints: [],
            },
          },
        },
      } satisfies PlaybackItem<BrowserSpeechAudioSource>
    }

    const measuredHarness = createSpeechHarness()
    const repairHarness = createSpeechHarness()

    const measuredItem = createStopTailItem({
      id: 'playback-stop-tail-compare-measured',
      segmentId: 'segment-stop-tail-compare-measured',
      residentMode: 'measured-return',
      voice: {
        energy: 0.36,
        cadence: 0.32,
      },
      lipSync: {
        visemeBias: 0.56,
        energyBias: 0.34,
        mouthScale: 0.95,
      },
      faceIntensity: 0.44,
      actionIntensity: 0.2,
    })
    const repairItem = createStopTailItem({
      id: 'playback-stop-tail-compare-repair',
      segmentId: 'segment-stop-tail-compare-repair',
      residentMode: 'repair-before-closeness',
      voice: {
        energy: 0.26,
        cadence: 0.25,
      },
      lipSync: {
        visemeBias: 0.35,
        energyBias: 0.26,
        mouthScale: 0.79,
      },
      faceIntensity: 0.33,
      actionIntensity: 0.09,
    })

    measuredHarness.start(measuredItem)
    repairHarness.start(repairItem)
    measuredHarness.setMouthOpenSize(18)
    repairHarness.setMouthOpenSize(18)
    measuredHarness.end(measuredItem)
    repairHarness.end(repairItem)

    expect(measuredHarness.speech.speechRenderState.value.phase).toBe('stopping')
    expect(repairHarness.speech.speechRenderState.value.phase).toBe('stopping')
    expect(measuredHarness.speech.speechPlayback.value.item?.cue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
    }))
    expect(repairHarness.speech.speechPlayback.value.item?.cue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
    }))
    expect(measuredHarness.speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)
    expect(repairHarness.speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)

    const measuredFrame = measuredHarness.speech.speechPlayback.value.item?.digitalLifeFrame
    const repairFrame = repairHarness.speech.speechPlayback.value.item?.digitalLifeFrame

    expect(measuredFrame?.settleMode).toBe('linger')
    expect(repairFrame?.settleMode).toBe('hold')
    expect(repairFrame?.voice.energy ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.voice.energy ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.voice.cadence ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.voice.cadence ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.lipSync.visemeBias ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.lipSync.visemeBias ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.lipSync.energyBias ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.lipSync.energyBias ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.lipSync.mouthScale ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.lipSync.mouthScale ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.face.intensity ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.face.intensity ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.action.intensity ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.action.intensity ?? Number.NEGATIVE_INFINITY,
    )

    measuredHarness.speech.dispose()
    repairHarness.speech.dispose()
  })

  it('keeps same-thread stop-tail continuity while letting the next segment reopen on a different restrained living line', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number, stopReason?: string }) => void) | undefined
    const mouthOpenSize = ref(0)

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt() {},
    })

    const measuredItem = {
      id: 'playback-same-thread-restrained-measured-return-1',
      streamId: 'stream-same-thread-restrained-measured-return-1',
      intentId: 'intent-same-thread-restrained-measured-return-1',
      segmentId: 'segment-same-thread-restrained-measured-return-1',
      ownerId: 'alice',
      priority: 0,
      text: '我先沿着刚才那条线中性可见占位。',
      special: null,
      continuityHoldMs: 340,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-restrained-line-shift-1',
          rendererTarget: 'live2d',
          replyText: '我先沿着刚才那条线中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-same-thread-restrained-measured-return-1',
              index: 0,
              text: '我先沿着刚才那条线中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 320,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'measured-return',
              },
              rendererSettle: {
                live2dFacialReleaseMs: 360,
                live2dMotionFollowThroughMs: 440,
                vrmActionFadeMs: 280,
                vrmExpressionBlendMs: 360,
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          },
          facePlan: {
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-same-thread-restrained-measured-return-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.95,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [{
              segmentId: 'segment-same-thread-restrained-measured-return-1',
              actionCue: 'steady_focus',
              intensity: 0.2,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    }

    startListener?.({ item: measuredItem, startedAt: 100 })
    mouthOpenSize.value = 18
    endListener?.({ item: measuredItem, endedAt: 240 })

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    const measuredStopCue = speech.speechRenderState.value.item?.cue
    const measuredStopFrame = speech.speechPlayback.value.item?.digitalLifeFrame
    expect(measuredStopCue?.rendererHints?.residentMode).toBe('measured-return')
    expect(measuredStopCue?.settleMode).toBe('linger')
    expect(measuredStopFrame?.voice.energy ?? 0).toBeGreaterThanOrEqual(0.2)
    expect(measuredStopFrame?.voice.energy ?? 0).toBeLessThanOrEqual(0.48)
    expect(measuredStopFrame?.lipSync.mouthScale ?? 0).toBeGreaterThan(0.5)

    vi.advanceTimersByTime(120)
    expect(speech.speechRenderState.value.phase).toBe('stopping')

    const repairPreview = speech.previewSpeechSegment({
      intentId: 'intent-same-thread-restrained-repair-2',
      streamId: 'stream-same-thread-restrained-repair-2',
      segmentId: 'segment-same-thread-restrained-repair-2',
      text: '我还在，只是先别一下子靠太近。',
      special: null,
      continuityHoldMs: 340,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-same-thread-restrained-line-shift-2',
          rendererTarget: 'live2d',
          replyText: '我还在，只是先别一下子靠太近。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: 'segment-same-thread-restrained-repair-2',
              index: 0,
              text: '我还在，只是先别一下子靠太近。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 340,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'repair-before-closeness',
              },
              rendererSettle: {
                live2dFacialReleaseMs: 380,
                live2dMotionFollowThroughMs: 460,
                vrmActionFadeMs: 300,
                vrmExpressionBlendMs: 380,
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-same-thread-restrained-repair-2',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.32,
              holdMs: 380,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.95,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-same-thread-restrained-repair-2',
              actionCue: 'idle_settle',
              intensity: 0.12,
              holdMs: 320,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    expect(repairPreview?.cue?.rendererHints?.residentMode).toBe('repair-before-closeness')
    expect(repairPreview?.cue?.settleMode).toBe('hold')
    expect(repairPreview?.digitalLifeFrame?.voice.energy ?? 0).toBeLessThanOrEqual(measuredStopFrame?.voice.energy ?? 1)
    expect(repairPreview?.digitalLifeFrame?.voice.cadence ?? 0).toBeLessThanOrEqual(measuredStopFrame?.voice.cadence ?? 1)
    expect(repairPreview?.digitalLifeFrame?.lipSync.visemeBias ?? 0).toBeLessThan(measuredStopFrame?.lipSync.visemeBias ?? 1)
    expect(repairPreview?.digitalLifeFrame?.lipSync.energyBias ?? 0).toBeLessThanOrEqual(measuredStopFrame?.lipSync.energyBias ?? 1)
    expect(repairPreview?.digitalLifeFrame?.lipSync.mouthScale ?? 0).toBeLessThan(measuredStopFrame?.lipSync.mouthScale ?? 1)
    expect(repairPreview?.digitalLifeFrame?.face.intensity ?? 0).toBeLessThan(measuredStopFrame?.face.intensity ?? 1)
    expect(repairPreview?.digitalLifeFrame?.action.intensity ?? 0).toBeLessThan(measuredStopFrame?.action.intensity ?? 1)
    expect(repairPreview?.continuityHoldMs).toBeGreaterThanOrEqual(measuredItem.continuityHoldMs)

    speech.dispose()
  })

  it('keeps interruption tail continuity on one identity-continuity', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let interruptListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, reason: string, interruptedAt: number }) => void) | undefined

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt(listener) {
        interruptListener = listener
      },
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-interrupt-callback-line',
      streamId: 'stream-interrupt-callback-line',
      segmentId: 'segment-earlier-callback-shell',
      text: '先别急。先别急。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-interrupt-callback-line',
          rendererTarget: 'live2d',
          replyText: '先别急。先别急。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [
              {
                id: 'segment-earlier-callback-shell',
                index: 0,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 220,
              },
              {
                id: 'segment-later-callback-return',
                index: 1,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 340,
                rendererHints: {
                  residentMode: 'repair-before-closeness',
                  preferredGazeMode: 'soften',
                  preferredBlinkCadence: 'linger',
                },
              },
            ],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            preUtteranceCue: 'soft-breath',
            postUtteranceCue: 'soft-release',
            speakingCues: [
              {
                segmentId: 'segment-earlier-callback-shell',
                emotion: 'thinking',
                facialCue: 'focused',
                intensity: 0.34,
                holdMs: 220,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'cue-bridge',
                confidence: 0.82,
              },
              {
                segmentId: 'segment-later-callback-return',
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: 0.41,
                holdMs: 360,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              },
            ],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [
              {
                segmentId: 'segment-earlier-callback-shell',
                actionCue: 'steady_focus',
                intensity: 0.12,
                holdMs: 180,
                source: 'cue-bridge',
                confidence: 0.72,
              },
              {
                segmentId: 'segment-later-callback-return',
                actionCue: 'idle_settle',
                intensity: 0.18,
                holdMs: 320,
                source: 'timeline-projection',
                confidence: 0.9,
              },
            ],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [
              {
                segmentId: 'segment-later-callback-return',
                viseme: 'I',
                weight: 0.72,
                source: 'prosody-authority',
                confidence: 0.95,
              },
            ],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: 340,
          stopReason: null,
          driverAuthority: {
            segmentId: 'segment-later-callback-return',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-later-callback-return',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.38,
            cueMouthWeight: 0.34,
            cueHeadWeight: 0.29,
            visemePeakWeight: 0.72,
          },
          drivers: {
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              intensity: 0.34,
              holdMs: 220,
              source: 'cue-bridge',
              confidence: 0.82,
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'soft-release',
              segmentId: 'segment-earlier-callback-shell',
            },
            motion: {
              idleBase: 'steady_focus',
              attentionMode: 'attentive',
              actionCue: 'observe_focus',
              intensity: 0.12,
              holdMs: 180,
              source: 'cue-bridge',
              confidence: 0.72,
              segmentId: 'segment-earlier-callback-shell',
            },
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: null,
              continuityHoldMs: 360,
              visemeHints: [
                {
                  segmentId: 'segment-later-callback-return',
                  viseme: 'I',
                  weight: 0.72,
                  source: 'prosody-authority',
                  confidence: 0.95,
                },
              ],
            },
          },
        },
      },
    })

    const previewCue = preview?.cue
    expect(previewCue?.id).toBe('segment-later-callback-return')
    expect(previewCue?.rendererHints?.residentMode).toBe('repair-before-closeness')
    expect(preview?.continuityHoldMs).toBe(340)

    const item = {
      id: 'playback-interrupt-callback-line',
      streamId: 'stream-interrupt-callback-line',
      intentId: 'intent-interrupt-callback-line',
      segmentId: 'segment-earlier-callback-shell',
      ownerId: 'alice',
      priority: 0,
      text: '先别急。',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
      createdAt: 0,
      metadata: preview?.metadata ?? null,
    }

    startListener?.({ item, startedAt: 120 })

    expect(speech.playbackTelemetry.value?.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-later-callback-return',
      lipsyncSegmentMatched: true,
    }))

    interruptListener?.({
      item,
      reason: 'owner-canceled',
      interruptedAt: 260,
    })

    expect(['stopping', 'idle']).toContain(speech.speechRenderState.value.phase)
    expect(speech.playbackTelemetry.value?.stopReason).toBe('owner-canceled')
    expect(speech.speechPlayback.value.item?.cue).toEqual(expect.objectContaining({
      id: 'segment-later-callback-return',
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
    }))
    expect(speech.speechRenderState.value.item?.cue).toEqual(expect.objectContaining({
      id: 'segment-later-callback-return',
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
    }))
    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: 'segment-later-callback-return',
      facialCue: 'soft-release',
      source: 'prosody-authority',
    }))
    expect(speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-later-callback-return',
      actionCue: 'idle_settle',
      source: 'timeline-projection',
    }))
    expect(speech.playbackTelemetry.value?.prosodyAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-later-callback-return',
      provenance: 'authority-bound',
    }))
    expect(speech.speechPlayback.value.item?.continuityHoldMs).toBe(340)

    speech.dispose()
  })

  it('keeps interruption-resume mouth and cadence tighter for repair-before-closeness while preserving continuity release room across surfaces', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const createHarness = () => {
      let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
      let interruptListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, reason: string, interruptedAt: number }) => void) | undefined

      const speech = useStageEmbodimentSpeech({
        audioContext: {
          createAnalyser: vi.fn(() => ({
            fftSize: 2048,
            getByteTimeDomainData: vi.fn(),
          })),
          resume: vi.fn(() => Promise.resolve()),
          state: 'running',
        } as unknown as AudioContext,
        mouthOpenSize: ref(0),
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('live2d'),
      })

      speech.bindPlaybackManager({
        onStart(listener) {
          startListener = listener
        },
        onEnd() {},
        onInterrupt(listener) {
          interruptListener = listener
        },
      })

      return { speech, startListenerRef: () => startListener, interruptListenerRef: () => interruptListener }
    }

    const measuredHarness = createHarness()
    const repairHarness = createHarness()

    const buildPreview = (residentMode: 'measured-return' | 'repair-before-closeness') => ({
      intentId: `intent-interrupt-${residentMode}`,
      streamId: `stream-interrupt-${residentMode}`,
      segmentId: `segment-earlier-${residentMode}`,
      text: '先别急。先别急。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: `turn-interrupt-${residentMode}`,
          rendererTarget: 'live2d',
          replyText: '先别急。先别急。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode,
          },
          speechPlan: {
            segments: [
              {
                id: `segment-earlier-${residentMode}`,
                index: 0,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 220,
              },
              {
                id: `segment-later-${residentMode}`,
                index: 1,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: residentMode === 'repair-before-closeness' ? 340 : 320,
                rendererHints: {
                  residentMode,
                  preferredGazeMode: 'soften',
                  preferredBlinkCadence: 'linger',
                },
                rendererSettle: {
                  live2dFacialReleaseMs: residentMode === 'repair-before-closeness' ? 380 : 360,
                  live2dMotionFollowThroughMs: residentMode === 'repair-before-closeness' ? 460 : 440,
                  vrmActionFadeMs: residentMode === 'repair-before-closeness' ? 300 : 280,
                  vrmExpressionBlendMs: residentMode === 'repair-before-closeness' ? 380 : 360,
                },
              },
            ],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: residentMode === 'repair-before-closeness' ? 340 : 320,
          },
          facePlan: {
            preUtteranceCue: 'soft-breath',
            postUtteranceCue: 'soft-release',
            speakingCues: [
              {
                segmentId: `segment-earlier-${residentMode}`,
                emotion: 'thinking',
                facialCue: 'focused',
                intensity: residentMode === 'repair-before-closeness' ? 0.34 : 0.4,
                holdMs: 220,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'cue-bridge',
                confidence: 0.82,
              },
              {
                segmentId: `segment-later-${residentMode}`,
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: residentMode === 'repair-before-closeness' ? 0.41 : 0.46,
                holdMs: residentMode === 'repair-before-closeness' ? 360 : 340,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              },
            ],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [
              {
                segmentId: `segment-earlier-${residentMode}`,
                actionCue: 'steady_focus',
                intensity: 0.12,
                holdMs: 180,
                source: 'cue-bridge',
                confidence: 0.72,
              },
              {
                segmentId: `segment-later-${residentMode}`,
                actionCue: residentMode === 'repair-before-closeness' ? 'idle_settle' : 'steady_focus',
                intensity: residentMode === 'repair-before-closeness' ? 0.18 : 0.22,
                holdMs: residentMode === 'repair-before-closeness' ? 320 : 300,
                source: 'timeline-projection',
                confidence: 0.9,
              },
            ],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [
              {
                segmentId: `segment-later-${residentMode}`,
                viseme: 'I',
                weight: residentMode === 'repair-before-closeness' ? 0.72 : 0.68,
                source: 'prosody-authority',
                confidence: 0.95,
              },
            ],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 420,
          driftMs: 0,
          plannedDurationMs: 420,
          settleMs: residentMode === 'repair-before-closeness' ? 340 : 320,
          stopReason: null,
          driverAuthority: {
            segmentId: `segment-later-${residentMode}`,
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: `segment-later-${residentMode}`,
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: residentMode === 'repair-before-closeness' ? 0.38 : 0.4,
            cueMouthWeight: residentMode === 'repair-before-closeness' ? 0.34 : 0.36,
            cueHeadWeight: residentMode === 'repair-before-closeness' ? 0.29 : 0.31,
            visemePeakWeight: residentMode === 'repair-before-closeness' ? 0.72 : 0.68,
          },
          drivers: {
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              intensity: residentMode === 'repair-before-closeness' ? 0.34 : 0.4,
              holdMs: 220,
              source: 'cue-bridge',
              confidence: 0.82,
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'soft-release',
              segmentId: `segment-earlier-${residentMode}`,
            },
            motion: {
              idleBase: 'steady_focus',
              attentionMode: 'attentive',
              actionCue: 'observe_focus',
              intensity: 0.12,
              holdMs: 180,
              source: 'cue-bridge',
              confidence: 0.72,
              segmentId: `segment-earlier-${residentMode}`,
            },
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: null,
              continuityHoldMs: residentMode === 'repair-before-closeness' ? 360 : 340,
              visemeHints: [
                {
                  segmentId: `segment-later-${residentMode}`,
                  viseme: 'I',
                  weight: residentMode === 'repair-before-closeness' ? 0.72 : 0.68,
                  source: 'prosody-authority',
                  confidence: 0.95,
                },
              ],
            },
          },
        },
      },
    })

    const measuredPreview = measuredHarness.speech.previewSpeechSegment(buildPreview('measured-return'))
    const repairPreview = repairHarness.speech.previewSpeechSegment(buildPreview('repair-before-closeness'))

    const startMeasured = measuredHarness.startListenerRef()
    const interruptMeasured = measuredHarness.interruptListenerRef()
    const startRepair = repairHarness.startListenerRef()
    const interruptRepair = repairHarness.interruptListenerRef()

    const measuredItem = {
      id: 'playback-interrupt-measured-return',
      streamId: 'stream-interrupt-measured-return',
      intentId: 'intent-interrupt-measured-return',
      segmentId: 'segment-earlier-measured-return',
      ownerId: 'alice',
      priority: 0,
      text: '先别急。',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
      createdAt: 0,
      metadata: measuredPreview?.metadata ?? null,
    }
    const repairItem = {
      id: 'playback-interrupt-repair-before-closeness',
      streamId: 'stream-interrupt-repair-before-closeness',
      intentId: 'intent-interrupt-repair-before-closeness',
      segmentId: 'segment-earlier-repair-before-closeness',
      ownerId: 'alice',
      priority: 0,
      text: '先别急。',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
      createdAt: 0,
      metadata: repairPreview?.metadata ?? null,
    }

    startMeasured?.({ item: measuredItem, startedAt: 120 })
    startRepair?.({ item: repairItem, startedAt: 120 })
    interruptMeasured?.({ item: measuredItem, reason: 'owner-canceled', interruptedAt: 260 })
    interruptRepair?.({ item: repairItem, reason: 'owner-canceled', interruptedAt: 260 })

    const measuredFrame = measuredHarness.speech.speechPlayback.value.item?.digitalLifeFrame
    const repairFrame = repairHarness.speech.speechPlayback.value.item?.digitalLifeFrame
    const measuredCue = measuredHarness.speech.playbackTelemetry.value?.cue
    const repairCue = repairHarness.speech.playbackTelemetry.value?.cue
    const measuredArticulation = measuredHarness.speech.speechRenderState.value.articulation
    const repairArticulation = repairHarness.speech.speechRenderState.value.articulation

    expect(repairHarness.speech.playbackTelemetry.value?.stopReason).toBe('owner-canceled')
    expect(measuredHarness.speech.playbackTelemetry.value?.stopReason).toBe('owner-canceled')
    expect(repairCue?.rendererHints?.residentMode).toBe('repair-before-closeness')
    expect(measuredCue?.rendererHints?.residentMode).toBe('measured-return')
    expect(repairFrame?.voice.cadence ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.voice.cadence ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.lipSync.mouthScale ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.lipSync.mouthScale ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.lipSync.energyBias ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.lipSync.energyBias ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.face.expressionMode).toBe('hold')
    expect(measuredFrame?.face.expressionMode).toBe('hold')
    expect(repairFrame?.face.facialCue).toBe('soft-gaze')
    expect(measuredFrame?.face.facialCue).toBe('soft-gaze')
    expect(repairFrame?.face.intensity ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.face.intensity ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairFrame?.action.actionMode).toBe('hold')
    expect(measuredFrame?.action.actionMode).toBe('hold')
    expect(repairFrame?.action.actionCue).toBe('idle_settle')
    expect(measuredFrame?.action.actionCue).toBe('steady_focus')
    expect(repairFrame?.action.intensity ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      measuredFrame?.action.intensity ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairArticulation.voice?.closureBias ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(
      measuredArticulation.voice?.closureBias ?? Number.NEGATIVE_INFINITY,
    )
    expect(repairArticulation.visemes.closed).toBeGreaterThanOrEqual(measuredArticulation.visemes.closed)
    expect(repairArticulation.lipSpread).toBeLessThanOrEqual(measuredArticulation.lipSpread)
    expect(repairArticulation.lipRound).toBeGreaterThanOrEqual(measuredArticulation.lipRound)
    expect(repairFrame?.face.facialCue).toBe('soft-gaze')
    expect(measuredFrame?.face.facialCue).toBe('soft-gaze')
    expect(repairHarness.speech.playbackTelemetry.value?.drivers.face?.facialCue).toBe('soft-release')
    expect(measuredHarness.speech.playbackTelemetry.value?.drivers.face?.facialCue).toBe('soft-release')
    expect(repairHarness.speech.playbackTelemetry.value?.drivers.motion?.actionCue).toBe('idle_settle')
    expect(measuredHarness.speech.playbackTelemetry.value?.drivers.motion?.actionCue).toBe('steady_focus')
    expect(repairHarness.speech.speechPlayback.value.item?.continuityHoldMs ?? 0).toBeGreaterThanOrEqual(
      measuredHarness.speech.speechPlayback.value.item?.continuityHoldMs ?? 0,
    )
    expect(repairHarness.speech.speechRenderState.value.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(
      measuredHarness.speech.speechRenderState.value.item?.cue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect(repairHarness.speech.speechRenderState.value.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(
      measuredHarness.speech.speechRenderState.value.item?.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    )
    expect(repairHarness.speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: 'segment-later-repair-before-closeness',
      facialCue: 'soft-release',
      postUtteranceCue: 'soft-release',
    }))
    expect(measuredHarness.speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: 'segment-later-measured-return',
      facialCue: 'soft-release',
      postUtteranceCue: 'soft-release',
    }))
    expect(repairHarness.speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-later-repair-before-closeness',
      actionCue: 'idle_settle',
    }))
    expect(measuredHarness.speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-later-measured-return',
      actionCue: 'steady_focus',
    }))
    expect(repairCue?.rendererSettle?.live2dFacialReleaseMs ?? 0).toBeGreaterThanOrEqual(
      measuredCue?.rendererSettle?.live2dFacialReleaseMs ?? 0,
    )
    expect(repairCue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0).toBeGreaterThanOrEqual(
      measuredCue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    )
    expect(repairCue?.rendererSettle?.vrmActionFadeMs ?? 0).toBeGreaterThanOrEqual(
      measuredCue?.rendererSettle?.vrmActionFadeMs ?? 0,
    )
    expect(repairCue?.rendererSettle?.vrmExpressionBlendMs ?? 0).toBeGreaterThanOrEqual(
      measuredCue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
    )

    measuredHarness.speech.dispose()
    repairHarness.speech.dispose()
  })

  it('keeps repair-before-closeness mouth closure alive through the stopping tail instead of collapsing immediately to zero', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioWorkletNode', class AudioWorkletNodeMock {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) | undefined
    const mouthOpenSize = ref(0)

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt() {},
    })

    const item = {
      id: 'playback-repair-tail-1',
      streamId: 'stream-repair-tail-1',
      intentId: 'intent-repair-tail-1',
      segmentId: 'segment-repair-tail-1',
      ownerId: 'alice',
      priority: 0,
      text: '我先把这一点稳住。',
      special: null,
      continuityHoldMs: 180,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-repair-tail-1',
          rendererTarget: 'live2d',
          replyText: '我先把这一点稳住。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: 'segment-repair-tail-1',
              index: 0,
              text: '我先把这一点稳住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 320,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'repair-before-closeness',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          },
          facePlan: {
            postUtteranceCue: 'soft-release',
            speakingCues: [{
              segmentId: 'segment-repair-tail-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.4,
              holdMs: 360,
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'soft-release',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [{
              segmentId: 'segment-repair-tail-1',
              actionCue: 'idle_settle',
              intensity: 0.18,
              holdMs: 300,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    expect(speech.speechRenderState.value.phase).toBe('starting')

    mouthOpenSize.value = 18

    endListener?.({ item, endedAt: 240 })

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)
    const stopLingerMs = speech.speechPlayback.value.item?.continuityHoldMs ?? 0

    vi.advanceTimersByTime(Math.max(0, stopLingerMs - 1))

    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.speechPlayback.value.mouthOpenSize).toBeGreaterThan(0)

    vi.advanceTimersByTime(1)

    expect(speech.speechRenderState.value.phase).toBe('idle')
    expect(speech.speechPlayback.value.mouthOpenSize).toBe(0)

    speech.dispose()
  })

  it('switches playback driver face and motion cues to the active later segment in a multi-segment embodiment script', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {} as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-multi-segment-driver-cues',
      rendererTarget: 'live2d' as const,
      replyText: '先看这里。然后点保存。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'firm' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: {
        segments: [
          {
            id: 'segment-1',
            index: 0,
            text: '先看这里。',
            interruptPolicy: 'soft-settle' as const,
            preRollMs: 20,
            settleMs: 180,
          },
          {
            id: 'segment-2',
            index: 1,
            text: '然后点保存。',
            interruptPolicy: 'soft-settle' as const,
            preRollMs: 20,
            settleMs: 220,
          },
        ],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 220,
      },
      facePlan: {
        speakingCues: [
          {
            segmentId: 'segment-1',
            emotion: 'thinking' as const,
            facialCue: 'focused',
            intensity: 0.42,
          },
          {
            segmentId: 'segment-2',
            emotion: 'happy' as const,
            facialCue: 'reassure_smile',
            intensity: 0.66,
          },
        ],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [
          {
            segmentId: 'segment-1',
            actionCue: 'point_screen',
            intensity: 0.28,
            holdMs: 140,
          },
          {
            segmentId: 'segment-2',
            actionCue: 'idle_gentle_nod',
            intensity: 0.54,
            holdMs: 180,
          },
        ],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-only' as const,
      },
    }

    startListener?.({
      item: {
        id: 'playback-driver-segment-1',
        streamId: 'stream-driver',
        intentId: 'intent-driver',
        segmentId: 'segment-1',
        ownerId: 'alice',
        priority: 0,
        text: '先看这里。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        metadata: {
          embodimentScript: script,
        },
      },
      startedAt: 100,
    })

    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: 'segment-1',
      facialCue: 'focused',
      intensity: 0.42,
    }))
    expect(speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-1',
      actionCue: 'point_screen',
      intensity: 0.28,
      holdMs: 140,
    }))

    startListener?.({
      item: {
        id: 'playback-driver-segment-2',
        streamId: 'stream-driver',
        intentId: 'intent-driver',
        segmentId: 'segment-2',
        ownerId: 'alice',
        priority: 0,
        text: '然后点保存。',
        special: null,
        continuityHoldMs: 220,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        metadata: {
          embodimentScript: script,
        },
      },
      startedAt: 240,
    })

    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      facialCue: 'reassure_smile',
      intensity: 0.66,
    }))
    expect(speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      actionCue: 'idle_gentle_nod',
      intensity: 0.54,
      holdMs: 180,
    }))

    speech.dispose()
  })

  it('keeps later-segment face motion and lipsync cues aligned when preview authority comes from timeline carry instead of descriptor segment id', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    speech.primeSpeechTimeline(buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里。然后点保存。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'point_screen',
        delivery: 'firm',
        emphasis: 1,
      },
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'point_screen',
          delivery: 'firm',
          emphasis: 1,
        },
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        variationToken: 'turn-null-segment-later-preview',
      },
    }))

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-null-segment-later-preview',
      rendererTarget: 'live2d' as const,
      replyText: '先看这里。然后点保存。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'firm' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: {
        segments: [
          {
            id: 'segment-1',
            index: 0,
            text: '先看这里。',
            interruptPolicy: 'soft-settle' as const,
            preRollMs: 20,
            settleMs: 180,
          },
          {
            id: 'segment-2',
            index: 1,
            text: '然后点保存。',
            interruptPolicy: 'soft-settle' as const,
            preRollMs: 20,
            settleMs: 220,
          },
        ],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 220,
      },
      facePlan: {
        speakingCues: [
          {
            segmentId: 'segment-1',
            emotion: 'thinking' as const,
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 180,
            source: 'prosody-authority' as const,
            confidence: 0.9,
          },
          {
            segmentId: 'segment-2',
            emotion: 'happy' as const,
            facialCue: 'reassure_smile',
            intensity: 0.66,
            holdMs: 260,
            source: 'prosody-authority' as const,
            confidence: 0.95,
          },
        ],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [
          {
            segmentId: 'segment-1',
            actionCue: 'point_screen',
            intensity: 0.28,
            holdMs: 140,
            source: 'timeline-projection' as const,
            confidence: 0.86,
          },
          {
            segmentId: 'segment-2',
            actionCue: 'idle_gentle_nod',
            intensity: 0.54,
            holdMs: 180,
            source: 'timeline-projection' as const,
            confidence: 0.9,
          },
        ],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [
          { segmentId: 'segment-1', viseme: 'A' as const, weight: 0.4, source: 'prosody-authority' as const, confidence: 0.88 },
          { segmentId: 'segment-2', viseme: 'I' as const, weight: 0.76, source: 'prosody-authority' as const, confidence: 0.96 },
          { segmentId: 'segment-2', viseme: 'closed' as const, weight: 0.61, source: 'prosody-authority' as const, confidence: 0.94 },
        ],
      },
    }

    speech.previewSpeechSegment({
      intentId: 'intent-null-segment-preview-1',
      streamId: 'stream-null-segment-preview',
      segmentId: 'segment-1',
      text: '先看这里。',
      special: null,
      continuityHoldMs: 120,
      metadata: {
        embodimentScript: script,
      },
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-null-segment-preview-2',
      streamId: 'stream-null-segment-preview',
      segmentId: null,
      text: '然后点保存。',
      special: null,
      continuityHoldMs: 220,
      metadata: {
        embodimentScript: script,
      },
    })

    const playback = (preview?.metadata as {
      embodimentPlayback?: {
        cue?: { id?: string | null, text?: string | null } | null
        drivers?: {
          face?: { segmentId?: string | null, facialCue?: string | null, intensity?: number } | null
          motion?: { segmentId?: string | null, actionCue?: string | null, intensity?: number } | null
          lipsync?: { segmentId?: string | null, visemeHints?: Array<{ segmentId?: string | null, viseme?: string }> } | null
        } | null
        driverAuthority?: {
          segmentId?: string | null
          matchedDrivers?: string[]
        } | null
      } | null
    } | null | undefined)?.embodimentPlayback

    expect(preview?.cue?.text).toBe('然后点保存。')
    expect(playback?.cue?.text).toBe('然后点保存。')
    expect(playback?.drivers?.face).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      facialCue: 'reassure_smile',
      intensity: 0.66,
    }))
    expect(playback?.drivers?.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      actionCue: null,
      intensity: 0,
    }))
    expect(playback?.drivers?.lipsync).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      visemeHints: [
        expect.objectContaining({ segmentId: 'segment-2', viseme: 'I' }),
        expect.objectContaining({ segmentId: 'segment-2', viseme: 'closed' }),
      ],
    }))
    expect(playback?.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-2',
      matchedDrivers: expect.arrayContaining(['body', 'face', 'lipsync', 'voice']),
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))

    speech.dispose()
  })

  it('keeps a continuity-aware live2d mouth tail easing during stop linger instead of freezing one final mouth frame', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    let rafCallback: FrameRequestCallback | null = null
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      rafCallback = callback
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    vi.mocked(createLive2DLipSync).mockResolvedValue({
      node: {} as AudioNode,
      disconnect: vi.fn(),
      getMouthOpen: vi.fn(() => 0.18),
      getVowelWeights: vi.fn(() => ({
        A: 0.22,
        E: 0.08,
        I: 0.12,
        O: 0.05,
        U: 0.04,
      })),
    } as any)

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) | undefined

    const mouthOpenSize = ref(0)
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: () => ({
          fftSize: 2048,
          getByteTimeDomainData: (buffer: Uint8Array<ArrayBuffer>) => buffer.fill(160),
        }),
        resume: async () => {},
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize,
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt() {},
    })

    await speech.prepareForNextMessage()
    await vi.runAllTimersAsync()

    const item = {
      id: 'playback-live2d-tail-easing-1',
      streamId: 'stream-live2d-tail-easing-1',
      intentId: 'intent-live2d-tail-easing-1',
      segmentId: 'segment-live2d-tail-easing-1',
      ownerId: 'alice',
      priority: 0,
      text: '我会慢慢收回来。',
      special: null,
      continuityHoldMs: 320,
      audio: createBufferedSpeechAudioSource({} as AudioBuffer),
      createdAt: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-live2d-tail-easing-1',
          rendererTarget: 'live2d',
          replyText: '我会慢慢收回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-live2d-tail-easing-1',
              index: 0,
              text: '我会慢慢收回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 0,
              settleMs: 320,
              rendererHints: {
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                residentMode: 'measured-return',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-live2d-tail-easing-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.42,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            actionBursts: [{
              segmentId: 'segment-live2d-tail-easing-1',
              actionCue: 'steady_focus',
              intensity: 0.18,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [{
              segmentId: 'segment-live2d-tail-easing-1',
              viseme: 'A',
              weight: 0.4,
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
        },
      },
    }

    startListener?.({ item, startedAt: 100 })
    expect(rafCallback).toBeTypeOf('function')
    rafCallback!(120)
    const activeMouthOpen = speech.speechPlayback.value.mouthOpenSize
    expect(activeMouthOpen).toBeGreaterThan(0)

    mouthOpenSize.value = 22
    endListener?.({ item, endedAt: 240 })
    expect(speech.speechRenderState.value.phase).toBe('stopping')
    const stopLingerMs = speech.speechPlayback.value.item?.continuityHoldMs ?? 0

    vi.advanceTimersByTime(Math.max(0, Math.floor(stopLingerMs / 2)))
    expect(rafCallback).toBeTypeOf('function')
    rafCallback!(260)
    const midTailMouthOpen = speech.speechPlayback.value.mouthOpenSize

    expect(midTailMouthOpen).toBeGreaterThan(0)
    expect(midTailMouthOpen).toBeLessThan(22)

    vi.advanceTimersByTime(Math.max(0, stopLingerMs - Math.floor(stopLingerMs / 2) - 1))
    expect(speech.speechRenderState.value.phase).toBe('stopping')

    vi.advanceTimersByTime(1)
    expect(speech.speechRenderState.value.phase).toBe('idle')
    expect(speech.speechPlayback.value.mouthOpenSize).toBe(0)

    speech.dispose()
  })

  it('keeps interruption-resume live2d mouth-tail easing more inward for repair-before-closeness than measured-return across the same linger trajectory', async () => {
    async function measureInterruptionTailTrajectory(residentMode: 'measured-return' | 'repair-before-closeness') {
      vi.useFakeTimers()
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      let rafCallback: FrameRequestCallback | null = null
      vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
        rafCallback = callback
        return 1
      }))
      vi.stubGlobal('cancelAnimationFrame', vi.fn())

      vi.mocked(createLive2DLipSync).mockResolvedValue({
        node: {} as AudioNode,
        disconnect: vi.fn(),
        getMouthOpen: vi.fn(() => 0.18),
        getVowelWeights: vi.fn(() => ({
          A: 0.22,
          E: 0.08,
          I: 0.12,
          O: 0.05,
          U: 0.04,
        })),
      } as any)

      const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

      let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
      let interruptListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, reason: string, interruptedAt: number }) => void) | undefined

      const mouthOpenSize = ref(0)
      const speech = useStageEmbodimentSpeech({
        audioContext: {
          createAnalyser: () => ({
            fftSize: 2048,
            getByteTimeDomainData: (buffer: Uint8Array<ArrayBuffer>) => buffer.fill(160),
          }),
          resume: async () => {},
          state: 'running',
        } as unknown as AudioContext,
        mouthOpenSize,
        paused: ref(false),
        speechStylePitch: ref(0),
        speechStyleRate: ref(1),
        stageModelRenderer: ref('live2d'),
      })

      speech.bindPlaybackManager({
        onStart(listener) {
          startListener = listener
        },
        onEnd() {},
        onInterrupt(listener) {
          interruptListener = listener
        },
      })

      await speech.prepareForNextMessage()
      await vi.runAllTimersAsync()

      const preview = speech.previewSpeechSegment({
        intentId: `intent-interrupt-tail-trajectory-${residentMode}`,
        streamId: `stream-interrupt-tail-trajectory-${residentMode}`,
        segmentId: `segment-earlier-tail-trajectory-${residentMode}`,
        text: '先别急。先别急。',
        special: null,
        continuityHoldMs: 180,
        metadata: {
          embodimentScript: {
            version: 'embodiment-script-v1',
            turnId: `turn-interrupt-tail-trajectory-${residentMode}`,
            rendererTarget: 'live2d',
            replyText: '先别急。先别急。',
            state: {
              baseEmotion: 'thinking',
              delivery: 'gentle',
              emphasis: 0,
              residentMode,
            },
            speechPlan: {
              segments: [
                {
                  id: `segment-earlier-tail-trajectory-${residentMode}`,
                  index: 0,
                  text: '先别急。',
                  interruptPolicy: 'soft-settle',
                  preRollMs: 40,
                  settleMs: 220,
                },
                {
                  id: `segment-later-tail-trajectory-${residentMode}`,
                  index: 1,
                  text: '先别急。',
                  interruptPolicy: 'soft-settle',
                  preRollMs: 40,
                  settleMs: residentMode === 'repair-before-closeness' ? 340 : 320,
                  rendererHints: {
                    residentMode,
                    preferredGazeMode: 'soften',
                    preferredBlinkCadence: 'linger',
                  },
                },
              ],
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: residentMode === 'repair-before-closeness' ? 340 : 320,
            },
            facePlan: {
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'soft-release',
              speakingCues: [
                {
                  segmentId: `segment-earlier-tail-trajectory-${residentMode}`,
                  emotion: 'thinking',
                  facialCue: 'focused',
                  intensity: residentMode === 'repair-before-closeness' ? 0.34 : 0.4,
                  holdMs: 220,
                  preUtteranceCue: 'soft-breath',
                  postUtteranceCue: 'soft-release',
                  source: 'cue-bridge',
                  confidence: 0.82,
                },
                {
                  segmentId: `segment-later-tail-trajectory-${residentMode}`,
                  emotion: 'thinking',
                  facialCue: 'soft-gaze',
                  intensity: residentMode === 'repair-before-closeness' ? 0.41 : 0.46,
                  holdMs: residentMode === 'repair-before-closeness' ? 360 : 340,
                  preUtteranceCue: 'soft-breath',
                  postUtteranceCue: 'soft-release',
                  source: 'prosody-authority',
                  confidence: 0.94,
                },
              ],
            },
            motionPlan: {
              idleBase: 'steady_focus',
              attentionMode: 'attentive',
              actionBursts: [
                {
                  segmentId: `segment-earlier-tail-trajectory-${residentMode}`,
                  actionCue: 'steady_focus',
                  intensity: 0.12,
                  holdMs: 180,
                  source: 'cue-bridge',
                  confidence: 0.72,
                },
                {
                  segmentId: `segment-later-tail-trajectory-${residentMode}`,
                  actionCue: residentMode === 'repair-before-closeness' ? 'idle_settle' : 'steady_focus',
                  intensity: residentMode === 'repair-before-closeness' ? 0.18 : 0.22,
                  holdMs: residentMode === 'repair-before-closeness' ? 320 : 300,
                  source: 'timeline-projection',
                  confidence: 0.9,
                },
              ],
            },
            lipsyncPlan: {
              mode: 'energy-phoneme-hybrid',
              visemeHints: [
                {
                  segmentId: `segment-later-tail-trajectory-${residentMode}`,
                  viseme: 'I',
                  weight: residentMode === 'repair-before-closeness' ? 0.72 : 0.68,
                  source: 'prosody-authority',
                  confidence: 0.95,
                },
                {
                  segmentId: `segment-later-tail-trajectory-${residentMode}`,
                  viseme: 'closed',
                  weight: residentMode === 'repair-before-closeness' ? 0.78 : 0.7,
                  source: 'prosody-authority',
                  confidence: 0.93,
                },
              ],
            },
          },
          embodimentPlayback: {
            actualDurationMs: 420,
            driftMs: 0,
            plannedDurationMs: 420,
            settleMs: residentMode === 'repair-before-closeness' ? 340 : 320,
            stopReason: null,
            driverAuthority: {
              segmentId: `segment-later-tail-trajectory-${residentMode}`,
              rendererTarget: 'live2d',
              matchedDrivers: ['lipsync'],
              sources: ['prosody-authority'],
              faceSegmentMatched: false,
              motionSegmentMatched: false,
              lipsyncSegmentMatched: true,
            },
            prosodyAuthority: {
              segmentId: `segment-later-tail-trajectory-${residentMode}`,
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: residentMode === 'repair-before-closeness' ? 0.38 : 0.4,
              cueMouthWeight: residentMode === 'repair-before-closeness' ? 0.34 : 0.36,
              cueHeadWeight: residentMode === 'repair-before-closeness' ? 0.29 : 0.31,
              visemePeakWeight: residentMode === 'repair-before-closeness' ? 0.72 : 0.68,
            },
            drivers: {
              face: {
                emotion: 'thinking',
                facialCue: 'focused',
                intensity: residentMode === 'repair-before-closeness' ? 0.34 : 0.4,
                holdMs: 220,
                source: 'cue-bridge',
                confidence: 0.82,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                segmentId: `segment-earlier-tail-trajectory-${residentMode}`,
              },
              motion: {
                idleBase: 'steady_focus',
                attentionMode: 'attentive',
                actionCue: 'observe_focus',
                intensity: 0.12,
                holdMs: 180,
                source: 'cue-bridge',
                confidence: 0.72,
                segmentId: `segment-earlier-tail-trajectory-${residentMode}`,
              },
              lipsync: {
                mode: 'energy-phoneme-hybrid',
                playbackPhase: 'playing',
                segmentId: null,
                continuityHoldMs: residentMode === 'repair-before-closeness' ? 360 : 340,
                visemeHints: [
                  {
                    segmentId: `segment-later-tail-trajectory-${residentMode}`,
                    viseme: 'I',
                    weight: residentMode === 'repair-before-closeness' ? 0.72 : 0.68,
                    source: 'prosody-authority',
                    confidence: 0.95,
                  },
                  {
                    segmentId: `segment-later-tail-trajectory-${residentMode}`,
                    viseme: 'closed',
                    weight: residentMode === 'repair-before-closeness' ? 0.78 : 0.7,
                    source: 'prosody-authority',
                    confidence: 0.93,
                  },
                ],
              },
            },
          },
        },
      })

      const item = {
        id: `playback-interrupt-tail-trajectory-${residentMode}`,
        streamId: `stream-interrupt-tail-trajectory-${residentMode}`,
        intentId: `intent-interrupt-tail-trajectory-${residentMode}`,
        segmentId: `segment-earlier-tail-trajectory-${residentMode}`,
        ownerId: 'alice',
        priority: 0,
        text: '先别急。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      }

      startListener?.({ item, startedAt: 100 })
      expect(rafCallback).toBeTypeOf('function')
      rafCallback!(120)
      const activeMouthOpen = speech.speechPlayback.value.mouthOpenSize
      expect(activeMouthOpen).toBeGreaterThan(0)

      mouthOpenSize.value = residentMode === 'repair-before-closeness' ? 18 : 22
      interruptListener?.({ item, reason: 'owner-canceled', interruptedAt: 240 })
      expect(['stopping', 'idle']).toContain(speech.speechRenderState.value.phase)

      const stopLingerMs = speech.speechPlayback.value.item?.continuityHoldMs ?? 0
      const earlyTail = {
        articulation: speech.speechRenderState.value.articulation,
      }

      vi.advanceTimersByTime(Math.max(0, Math.floor(stopLingerMs / 2)))
      expect(rafCallback).toBeTypeOf('function')
      rafCallback!(260)
      const midTail = {
        articulation: speech.speechRenderState.value.articulation,
      }

      vi.advanceTimersByTime(Math.max(0, stopLingerMs - Math.floor(stopLingerMs / 2) - 1))
      expect(rafCallback).toBeTypeOf('function')
      rafCallback!(260 + Math.max(0, stopLingerMs - Math.floor(stopLingerMs / 2) - 1))
      const lateTail = {
        articulation: speech.speechRenderState.value.articulation,
      }

      expect(['stopping', 'idle']).toContain(speech.speechRenderState.value.phase)
      vi.advanceTimersByTime(1)
      expect(speech.speechRenderState.value.phase).toBe('idle')
      expect(speech.speechPlayback.value.mouthOpenSize).toBe(0)

      speech.dispose()
      return { earlyTail, midTail, lateTail }
    }

    const measured = await measureInterruptionTailTrajectory('measured-return')
    const repair = await measureInterruptionTailTrajectory('repair-before-closeness')

    expect(repair.earlyTail.articulation.voice?.closureBias ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(
      measured.earlyTail.articulation.voice?.closureBias ?? Number.NEGATIVE_INFINITY,
    )
    expect(repair.midTail.articulation.voice?.closureBias ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(
      measured.midTail.articulation.voice?.closureBias ?? Number.NEGATIVE_INFINITY,
    )
    expect(repair.lateTail.articulation.voice?.closureBias ?? Number.POSITIVE_INFINITY).toBeGreaterThanOrEqual(
      measured.lateTail.articulation.voice?.closureBias ?? Number.NEGATIVE_INFINITY,
    )
    expect(repair.earlyTail.articulation.visemes.closed).toBeGreaterThanOrEqual(
      measured.earlyTail.articulation.visemes.closed,
    )
    expect(repair.midTail.articulation.visemes.closed).toBeGreaterThanOrEqual(
      measured.midTail.articulation.visemes.closed,
    )
    expect(repair.lateTail.articulation.visemes.closed).toBeGreaterThanOrEqual(
      measured.lateTail.articulation.visemes.closed,
    )
    expect(repair.earlyTail.articulation.lipSpread).toBeLessThanOrEqual(
      measured.earlyTail.articulation.lipSpread,
    )
    expect(repair.midTail.articulation.lipSpread).toBeLessThanOrEqual(
      measured.midTail.articulation.lipSpread,
    )
    expect(repair.lateTail.articulation.lipSpread).toBeLessThanOrEqual(
      measured.lateTail.articulation.lipSpread,
    )
  })

  it('keeps later-segment lipsync, face, and motion authority aligned on long multi-segment ids during playback', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => analyser),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const longSegmentIdA = 'turn-callback-afterglow-chat-meta-measured-return-vrm-noisy|mind:mpr3ttm0:6319b0a3c2a9||guide|我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。:0'
    const longSegmentIdB = 'turn-callback-afterglow-chat-meta-measured-return-vrm-noisy|mind:mpr3ttm0:6319b0a3c2a9||guide|我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。:1'
    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-long-multi-segment-driver-cues',
      rendererTarget: 'live2d' as const,
      replyText: '我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 1 as const,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        segments: [
          {
            id: longSegmentIdA,
            index: 0,
            text: '我先沿着刚才那条 callback 线轻一点跟回去，',
            interruptPolicy: 'soft-settle' as const,
            preRollMs: 20,
            settleMs: 240,
          },
          {
            id: longSegmentIdB,
            index: 1,
            text: '先看这一处 runtime seam 怎么继续收口。',
            interruptPolicy: 'soft-settle' as const,
            preRollMs: 20,
            settleMs: 280,
          },
        ],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 280,
      },
      facePlan: {
        speakingCues: [
          {
            segmentId: longSegmentIdA,
            emotion: 'thinking' as const,
            facialCue: 'focused',
            intensity: 0.44,
            holdMs: 240,
            source: 'prosody-authority' as const,
            confidence: 0.92,
          },
          {
            segmentId: longSegmentIdB,
            emotion: 'thinking' as const,
            facialCue: 'soft-gaze',
            intensity: 0.68,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority' as const,
            confidence: 0.96,
          },
        ],
      },
      motionPlan: {
        idleBase: 'observe_focus',
        actionBursts: [
          {
            segmentId: longSegmentIdA,
            actionCue: 'point_screen',
            intensity: 0.28,
            holdMs: 160,
            source: 'timeline-projection' as const,
            confidence: 0.86,
          },
          {
            segmentId: longSegmentIdB,
            actionCue: 'idle_gentle_nod',
            intensity: 0.54,
            holdMs: 220,
            source: 'timeline-projection' as const,
            confidence: 0.9,
          },
        ],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [
          { segmentId: longSegmentIdA, viseme: 'U' as const, weight: 0.42, source: 'prosody-authority' as const, confidence: 0.9 },
          { segmentId: longSegmentIdB, viseme: 'I' as const, weight: 0.78, source: 'prosody-authority' as const, confidence: 0.96 },
          { segmentId: longSegmentIdB, viseme: 'closed' as const, weight: 0.62, source: 'prosody-authority' as const, confidence: 0.96 },
        ],
      },
    }

    startListener?.({
      item: {
        id: 'playback-driver-long-segment-2',
        streamId: 'stream-driver-long',
        intentId: 'intent-driver-long',
        segmentId: longSegmentIdB,
        ownerId: 'alice',
        priority: 0,
        text: '先看这一处 runtime seam 怎么继续收口。',
        special: null,
        continuityHoldMs: 220,
        audio: createBufferedSpeechAudioSource({} as AudioBuffer),
        createdAt: 0,
        metadata: {
          embodimentScript: script,
        },
      },
      startedAt: 240,
    })

    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: longSegmentIdB,
      facialCue: 'soft-gaze',
      intensity: 0.68,
      holdMs: 320,
    }))
    expect(speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: longSegmentIdB,
      actionCue: 'idle_gentle_nod',
      intensity: 0.54,
      holdMs: 220,
    }))
    expect(speech.playbackTelemetry.value?.drivers.lipsync).toEqual(expect.objectContaining({
      segmentId: longSegmentIdB,
      mode: 'energy-phoneme-hybrid',
      visemeHints: [
        expect.objectContaining({ segmentId: longSegmentIdB, viseme: 'I', weight: 0.78 }),
        expect.objectContaining({ segmentId: longSegmentIdB, viseme: 'closed', weight: 0.62 }),
      ],
    }))
    expect(speech.playbackTelemetry.value?.driverAuthority).toEqual(expect.objectContaining({
      segmentId: longSegmentIdB,
      matchedDrivers: expect.arrayContaining(['body', 'face', 'motion', 'lipsync', 'voice']),
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))
    expect(speech.speechRenderState.value.phase).toBe('starting')
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.id).toBe(longSegmentIdB)
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(280)
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.lipSync.continuityHoldMs).toBe(320)

    speech.dispose()
  })

  it('preserves chinese segment expression metadata from embodiment script into playback telemetry', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-expression-metadata',
      rendererTarget: 'live2d' as const,
      replyText: '先看这里，然后确认了吗？',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 1 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: {
        segments: [{
          id: 'segment-question',
          index: 1,
          text: '然后确认了吗？',
          interruptPolicy: 'soft-settle' as const,
          preRollMs: 20,
          settleMs: 260,
        }],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 260,
      },
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

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-expression-metadata',
      streamId: 'stream-expression-metadata',
      segmentId: 'segment-question',
      text: '然后确认了吗？',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: script,
      },
    })
    const playback = (preview?.metadata as { embodimentPlayback?: {
      driverAuthority?: {
        segmentId?: string | null
        rendererTarget?: 'live2d' | 'vrm' | null
        matchedDrivers?: string[]
        sources?: string[]
        faceSegmentMatched?: boolean
        motionSegmentMatched?: boolean
        lipsyncSegmentMatched?: boolean
      }
      drivers?: {
        face?: unknown
        motion?: unknown
        lipsync?: { visemeHints?: unknown[] }
      }
    } } | null | undefined)?.embodimentPlayback

    expect(playback?.drivers?.face).toEqual(expect.objectContaining({
      segmentId: 'segment-question',
      facialCue: 'steady-inhale',
      holdMs: 420,
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(playback?.drivers?.motion).toEqual(expect.objectContaining({
      idleBase: 'idle_settle',
      actionCue: null,
      holdMs: 0,
      source: null,
      confidence: 0,
    }))
    expect(playback?.drivers?.lipsync?.visemeHints).toEqual([
      { segmentId: 'segment-question', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-question', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.94 },
    ])
    expect(playback?.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-question',
      rendererTarget: 'live2d',
      matchedDrivers: expect.arrayContaining(['body', 'face', 'lipsync', 'voice']),
      sources: ['prosody-authority'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))
    expect((playback as any)?.prosodyAuthority).toEqual({
      segmentId: 'segment-question',
      provenance: 'authority-bound',
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid',
      cueProsodyWeight: 0.32,
      cueMouthWeight: 0.49,
      cueHeadWeight: 0.32,
      visemePeakWeight: 0.75,
    })

    speech.dispose()
  })

  it('keeps runtime playback authority anchored to the same body line when face motion and lipsync have not yet re-formed on the active segment', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const analyser = {
      fftSize: 2048,
      getByteTimeDomainData: vi.fn((target: Uint8Array<ArrayBuffer>) => {
        target.fill(128)
      }),
    } as unknown as AnalyserNode
    const audioContext = {
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const script = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-body-led-runtime-authority',
      rendererTarget: 'vrm' as const,
      replyText: '先别急，我还在这里。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 1 as const,
        residentMode: 'same-thread-continuation' as const,
      },
      speechPlan: {
        segments: [{
          id: 'segment-body-led-runtime-authority',
          index: 0,
          text: '先别急，我还在这里。',
          interruptPolicy: 'soft-settle' as const,
          preRollMs: 20,
          settleMs: 320,
        }],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 20,
        settleMs: 320,
      },
      facePlan: {
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'idle_settle',
        attentionMode: 'attentive' as const,
        actionBursts: [],
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [],
      },
    }

    const frame = createDigitalLifeFrameFixture({
      id: 'segment-body-led-runtime-authority',
      index: 0,
      startOffset: 0,
      endOffset: 9,
      text: '先别急，我还在这里。',
      mode: 'thinking',
      interruptPolicy: 'soft-interrupt',
      settleMode: 'hold',
      voice: {
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: 0.3,
        cadence: 0.28,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.28,
        holdMs: 320,
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: [],
        },
      },
      action: {
        actionCue: null,
        actionMode: 'none',
        intensity: 0,
        holdMs: 320,
        rendererHints: {
          residentMode: 'same-thread-continuation',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          preferredMotionAliases: [],
        },
      },
      motor: {
        ...createIdleStageEmbodimentMotorState(),
        stillness: 0.82,
        expressivity: 0.2,
        gaze: {
          ...createIdleStageEmbodimentMotorState().gaze,
          focus: 0.78,
        },
        breath: {
          ...createIdleStageEmbodimentMotorState().breath,
          amplitude: 0.24,
        },
        body: {
          ...createIdleStageEmbodimentMotorState().body,
          settle: 0.82,
          openness: 0.22,
        },
      },
      lipSync: {
        mode: 'closed',
        visemeBias: 0.18,
        energyBias: 0.12,
        mouthScale: 0.74,
        continuityHoldMs: 320,
      },
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-body-led-runtime-authority',
      streamId: 'stream-body-led-runtime-authority',
      segmentId: 'segment-body-led-runtime-authority',
      text: '先别急，我还在这里。',
      special: null,
      continuityHoldMs: 320,
      digitalLifeFrame: frame,
      metadata: {
        embodimentScript: script,
      },
    })

    const playback = (preview?.metadata as { embodimentPlayback?: {
      driverAuthority?: {
        segmentId?: string | null
        rendererTarget?: 'live2d' | 'vrm' | null
        matchedDrivers?: string[]
        sources?: string[]
        bodySegmentMatched?: boolean
        faceSegmentMatched?: boolean
        motionSegmentMatched?: boolean
        lipsyncSegmentMatched?: boolean
      }
      drivers?: {
        body?: unknown
        face?: unknown
        motion?: unknown
        lipsync?: { visemeHints?: unknown[] }
      }
    } } | null | undefined)?.embodimentPlayback

    expect(playback?.drivers?.body).toEqual(expect.objectContaining({
      segmentId: 'segment-body-led-runtime-authority',
    }))
    expect(playback?.drivers?.face).toEqual(expect.objectContaining({
      segmentId: 'segment-body-led-runtime-authority',
      intensity: 0,
      confidence: 0,
      source: null,
    }))
    expect(playback?.drivers?.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-body-led-runtime-authority',
      intensity: 0,
      confidence: 0,
      source: null,
    }))
    expect(playback?.drivers?.lipsync).toEqual(expect.objectContaining({
      visemeHints: [],
    }))
    expect(playback?.driverAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-body-led-runtime-authority',
      rendererTarget: 'vrm',
      matchedDrivers: expect.arrayContaining(['body', 'lipsync', 'voice']),
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))

    speech.dispose()
  })

  it('preserves segment renderer hints and settle metadata into playback telemetry cue payload', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-playback-cue-metadata',
      streamId: 'stream-playback-cue-metadata',
      segmentId: 'segment-playback-cue-metadata',
      text: '继续看这里。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-playback-cue-metadata',
          rendererTarget: 'vrm',
          replyText: '继续看这里。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'calm',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-playback-cue-metadata',
              index: 0,
              text: '继续看这里。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 260,
              rendererSettle: {
                live2dFacialReleaseMs: 320,
                live2dMotionFollowThroughMs: 440,
                vrmActionFadeMs: 280,
                vrmExpressionBlendMs: 360,
              },
              rendererHints: {
                preferredExpressionAliases: ['CalmInspect'],
                preferredMotionAliases: ['ObserveSoft'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [{
              segmentId: 'segment-playback-cue-metadata',
              emotion: 'thinking',
              facialCue: 'focused',
              intensity: 0.52,
              holdMs: 320,
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-playback-cue-metadata',
              actionCue: 'observe_focus',
              intensity: 0.34,
              holdMs: 220,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
      },
    })

    const playback = (preview?.metadata as {
      embodimentPlayback?: {
        cue?: {
          rendererHints?: {
            preferredExpressionAliases?: string[]
            preferredMotionAliases?: string[]
          } | null
          rendererSettle?: {
            live2dFacialReleaseMs?: number
            live2dMotionFollowThroughMs?: number
            vrmActionFadeMs?: number
            vrmExpressionBlendMs?: number
          } | null
        } | null
      }
    } | null | undefined)?.embodimentPlayback

    expect(playback?.cue).toEqual(expect.objectContaining({
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
      },
      rendererSettle: {
        live2dFacialReleaseMs: 294,
        live2dMotionFollowThroughMs: 189,
        vrmActionFadeMs: 167,
        vrmExpressionBlendMs: 256,
      },
    }))

    speech.dispose()
  })

  it('preserves lower-pressure runtime embodiment rhythm into final playback telemetry', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-lower-pressure-final-telemetry',
      streamId: 'stream-lower-pressure-final-telemetry',
      segmentId: 'segment-lower-pressure-final-telemetry',
      text: '我会先轻一点靠近，再慢慢说。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-lower-pressure-final-telemetry',
          rendererTarget: 'live2d',
          replyText: '我会先轻一点靠近，再慢慢说。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'quiet-companionship',
          },
          speechPlan: {
            segments: [{
              id: 'segment-lower-pressure-final-telemetry',
              index: 0,
              text: '我会先轻一点靠近，再慢慢说。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-lower-pressure-final-telemetry',
              emotion: 'thinking',
              facialCue: 'focused',
              intensity: 0.42,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-lower-pressure-final-telemetry',
              actionCue: 'steady_focus',
              intensity: 0.2,
              holdMs: 260,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    expect(preview?.continuityHoldMs).toBe(260)
    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: 'segment-lower-pressure-final-telemetry',
      facialCue: 'steady-inhale',
      holdMs: 360,
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'eyes-soften',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-lower-pressure-final-telemetry',
      actionCue: null,
      holdMs: 0,
      source: null,
      confidence: 0,
    }))
    expect(speech.playbackTelemetry.value?.settleMs).toBe(260)

    speech.dispose()
  })

  it('projects measured-return preview playback as a held softer return instead of generic release', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-measured-return-preview',
      streamId: 'stream-measured-return-preview',
      segmentId: 'segment-measured-return-preview',
      text: '我先慢一点回来。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-measured-return-preview',
          rendererTarget: 'live2d',
          replyText: '我先慢一点回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-measured-return-preview',
              index: 0,
              text: '我先慢一点回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 280,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 280,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-measured-return-preview',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.44,
              holdMs: 340,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.93,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    expect(preview?.cue?.settleMode).toBe('linger')
    expect(preview?.cue?.facialCue).toBe('soft-gaze')
    expect(preview?.cue?.actionCue).toBeNull()
    expect(preview?.digitalLifeFrame).toEqual(expect.objectContaining({
      mode: 'speaking',
      settleMode: 'linger',
      action: expect.objectContaining({
        actionCue: null,
        actionMode: 'none',
      }),
    }))
    speech.dispose()
  })

  it('keeps softer live2d alias preferences visible when hesitant audible-body continuity is still carrying the line before face and motion rejoin', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-audible-body-hesitant-aliases',
      streamId: 'stream-audible-body-hesitant-aliases',
      segmentId: 'segment-audible-body-hesitant-aliases',
      text: '我先沿着这条还活着的线轻一点接住。',
      special: null,
      continuityHoldMs: 220,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-audible-body-hesitant-aliases',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的线轻一点接住。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'hesitant',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-audible-body-hesitant-aliases',
              index: 0,
              text: '我先沿着这条还活着的线轻一点接住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 280,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-audible-body-hesitant-aliases',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.38,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-audible-body-hesitant-aliases',
              actionCue: 'observe_focus',
              intensity: 0.2,
              holdMs: 220,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    expect(preview?.cue?.facialCue).toBe('soft-gaze')
    expect(preview?.cue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
      preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))

    speech.dispose()
  })

  it('keeps softer vrm alias preferences and restrained blend timing visible when hesitant audible-body continuity is still carrying the line before face and motion rejoin', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('vrm'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-audible-body-hesitant-vrm-aliases',
      streamId: 'stream-audible-body-hesitant-vrm-aliases',
      segmentId: 'segment-audible-body-hesitant-vrm-aliases',
      text: '我先沿着这条还活着的线轻一点接住。',
      special: null,
      continuityHoldMs: 220,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-audible-body-hesitant-vrm-aliases',
          rendererTarget: 'vrm',
          replyText: '我先沿着这条还活着的线轻一点接住。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'hesitant',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-audible-body-hesitant-vrm-aliases',
              index: 0,
              text: '我先沿着这条还活着的线轻一点接住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
                preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
              rendererSettle: {
                live2dFacialReleaseMs: 360,
                live2dMotionFollowThroughMs: 420,
                vrmActionFadeMs: 520,
                vrmExpressionBlendMs: 600,
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 280,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-audible-body-hesitant-vrm-aliases',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.38,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-audible-body-hesitant-vrm-aliases',
              actionCue: 'observe_focus',
              intensity: 0.2,
              holdMs: 220,
              source: 'timeline-projection',
              confidence: 0.86,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    expect(preview?.cue?.facialCue).toBe('soft-gaze')
    expect(preview?.cue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['CalmInspect', 'soft-gaze'],
      preferredMotionAliases: ['ObserveSoft', 'StillnessGuard'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(preview?.cue?.rendererSettle).toEqual(expect.objectContaining({
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect((preview?.cue?.rendererSettle?.vrmActionFadeMs ?? 0)).toBeGreaterThanOrEqual(300)
    expect((preview?.cue?.rendererSettle?.vrmExpressionBlendMs ?? 0)).toBeGreaterThanOrEqual(360)

    speech.dispose()
  })

  it('keeps durable relationship rhythm preview playback on a steadier measured-return cadence', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-measured-return-durable-rhythm-preview',
      streamId: 'stream-measured-return-durable-rhythm-preview',
      segmentId: 'segment-measured-return-durable-rhythm-preview',
      text: '我会稳一点回来，不只是先观察。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-measured-return-durable-rhythm-preview',
          rendererTarget: 'live2d',
          replyText: '我会稳一点回来，不只是先观察。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-measured-return-durable-rhythm-preview',
              index: 0,
              text: '我会稳一点回来，不只是先观察。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                preferredGazeMode: 'steady',
                preferredBlinkCadence: 'quiet',
                residentMode: 'measured-return',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-measured-return-durable-rhythm-preview',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.44,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.95,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-measured-return-durable-rhythm-preview',
              actionCue: 'steady_focus',
              intensity: 0.22,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.9,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    const playback = (preview?.metadata as {
      embodimentPlayback?: {
        cue?: {
          rendererHints?: {
            preferredBlinkCadence?: string
            preferredGazeMode?: string
            residentMode?: string
          } | null
        } | null
        drivers?: {
          motion?: {
            idleBase?: string | null
            actionCue?: string | null
          } | null
        } | null
      }
    } | null | undefined)?.embodimentPlayback

    expect(preview?.cue?.settleMode).toBe('linger')
    expect(preview?.cue?.facialCue).toBe('soft-gaze')
    expect(preview?.cue?.actionCue).toBe('steady_focus')
    expect(preview?.digitalLifeFrame).toEqual(expect.objectContaining({
      mode: 'speaking',
      settleMode: 'linger',
      action: expect.objectContaining({
        actionCue: 'steady_focus',
        actionMode: 'hold',
      }),
    }))
    expect(playback?.cue?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'steady',
      preferredBlinkCadence: 'quiet',
      residentMode: 'measured-return',
    }))
    expect(playback?.drivers?.motion).toEqual(expect.objectContaining({
      idleBase: 'steady_focus',
      actionCue: null,
    }))
    speech.dispose()
  })

  it('projects repair-before-closeness preview playback as softer hold with restrained action', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-repair-before-closeness-preview',
      streamId: 'stream-repair-before-closeness-preview',
      segmentId: 'segment-repair-before-closeness-preview',
      text: '我先把这一下稳住。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-repair-before-closeness-preview',
          rendererTarget: 'live2d',
          replyText: '我先把这一下稳住。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: 'segment-repair-before-closeness-preview',
              index: 0,
              text: '我先把这一下稳住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 320,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          },
          facePlan: {
            preUtteranceCue: 'soft-breath',
            postUtteranceCue: 'soft-release',
            speakingCues: [{
              segmentId: 'segment-repair-before-closeness-preview',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.38,
              holdMs: 360,
              preUtteranceCue: 'soft-breath',
              postUtteranceCue: 'soft-release',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-repair-before-closeness-preview',
              actionCue: 'steady_focus',
              intensity: 0.18,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    expect(preview?.cue?.settleMode).toBe('hold')
    expect(preview?.cue?.actionCue).toBe('idle_settle')
    expect(preview?.digitalLifeFrame).toEqual(expect.objectContaining({
      mode: 'thinking',
      settleMode: 'hold',
      action: expect.objectContaining({
        actionCue: 'idle_settle',
        actionMode: 'hold',
      }),
    }))
    expect(preview?.digitalLifeFrame).toEqual(expect.objectContaining({
      voice: expect.objectContaining({
        energy: expect.any(Number),
        cadence: expect.any(Number),
      }),
      lipSync: expect.objectContaining({
        continuityHoldMs: expect.any(Number),
      }),
      face: expect.objectContaining({
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
      }),
      action: expect.objectContaining({
        actionCue: 'idle_settle',
        actionMode: 'hold',
      }),
    }))
    speech.dispose()
  })

  it('keeps post-utterance motion authority during final playback reconciliation', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined
    let endListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number, stopReason: string | null }) => void) | undefined

    const audioContext = {
      createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        getByteTimeDomainData: vi.fn(),
      })),
      resume: vi.fn(() => Promise.resolve()),
      state: 'running',
    } as unknown as AudioContext
    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd(listener) {
        endListener = listener
      },
      onInterrupt() {},
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-post-utterance-motion',
      streamId: 'stream-post-utterance-motion',
      segmentId: 'segment-post-utterance-motion',
      text: '我会先轻一点靠近，再慢慢说。',
      special: null,
      continuityHoldMs: 180,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-post-utterance-motion',
          rendererTarget: 'live2d',
          replyText: '我会先轻一点靠近，再慢慢说。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'quiet-companionship',
          },
          speechPlan: {
            segments: [{
              id: 'segment-post-utterance-motion',
              index: 0,
              text: '我会先轻一点靠近，再慢慢说。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-post-utterance-motion',
              emotion: 'thinking',
              facialCue: 'focused',
              intensity: 0.42,
              holdMs: 360,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.94,
            }],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-post-utterance-motion',
              actionCue: 'steady_focus',
              intensity: 0.2,
              holdMs: 260,
              source: 'timeline-projection',
              confidence: 0.88,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      },
    })

    startListener?.({
      item: {
        id: 'playback-post-utterance-motion',
        streamId: 'stream-post-utterance-motion',
        intentId: 'intent-post-utterance-motion',
        segmentId: 'segment-post-utterance-motion',
        ownerId: 'alice',
        priority: 0,
        text: '我会先轻一点靠近，再慢慢说。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      },
      startedAt: 120,
    })

    endListener?.({
      item: {
        id: 'playback-post-utterance-motion',
        streamId: 'stream-post-utterance-motion',
        intentId: 'intent-post-utterance-motion',
        segmentId: 'segment-post-utterance-motion',
        ownerId: 'alice',
        priority: 0,
        text: '我会先轻一点靠近，再慢慢说。',
        special: null,
        continuityHoldMs: 180,
        audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      },
      endedAt: 420,
      stopReason: 'ended',
    })

    expect(speech.playbackTelemetry.value?.drivers.face).toEqual(expect.objectContaining({
      segmentId: 'segment-post-utterance-motion',
      facialCue: 'eyes-soften',
      postUtteranceCue: 'eyes-soften',
    }))
    expect(speech.playbackTelemetry.value?.drivers.motion).toEqual(expect.objectContaining({
      segmentId: 'segment-post-utterance-motion',
      actionCue: 'steady_focus',
      holdMs: 260,
      source: 'timeline-projection',
      confidence: 0.88,
    }))

    speech.dispose()
  })

  it('reuses normalized script digital-life frames for preview authority when top-level metadata digitalLife is absent', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-script-digital-life-preview-fallback',
      streamId: 'stream-script-digital-life-preview-fallback',
      segmentId: 'segment-script-digital-life-preview-fallback',
      text: '我先沿着这条还活着的生命线中性可见占位。',
      special: null,
      continuityHoldMs: 220,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-script-digital-life-preview-fallback',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的生命线中性可见占位。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-script-digital-life-preview-fallback',
              index: 0,
              text: '我先沿着这条还活着的生命线中性可见占位。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_soft',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
          digitalLife: {
            version: 'digital-life-v1',
            variationToken: 'script-digital-life-preview-fallback',
            emotion: 'thinking',
            mode: 'speaking',
            postureHint: 'inspection',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              actionCue: 'observe_soft',
              delivery: 'gentle',
              emphasis: 0,
            },
            speechStyle: {
              pitchDelta: -2,
              rateMultiplier: 0.95,
            },
            rendererHints: {
              residentMode: 'same-thread-continuation',
              signature: 'embodiment:script-preview-authority',
            },
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.95,
              energy: 0.34,
              cadence: 0.31,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.36,
              mouthScale: 0.92,
              continuityHoldMs: 380,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.34,
              holdMs: 360,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                signature: 'embodiment:script-preview-authority',
              },
            },
            action: {
              actionCue: 'observe_soft',
              actionMode: 'hold',
              intensity: 0.18,
              holdMs: 320,
              rendererHints: {
                residentMode: 'same-thread-continuation',
                signature: 'embodiment:script-preview-authority',
              },
            },
            motor: {},
            frames: [{
              id: 'segment-script-digital-life-preview-fallback',
              index: 0,
              startOffset: 0,
              endOffset: 20,
              text: '我先沿着这条还活着的生命线中性可见占位。',
              mode: 'speaking',
              interruptPolicy: 'continue',
              settleMode: 'release',
              voice: {
                pitchDelta: -2,
                rateMultiplier: 0.95,
                energy: 0.34,
                cadence: 0.31,
              },
              lipSync: {
                mode: 'energy-phoneme-hybrid',
                visemeBias: 0.44,
                energyBias: 0.36,
                mouthScale: 0.92,
                continuityHoldMs: 380,
              },
              face: {
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                expressionMode: 'hold',
                intensity: 0.34,
                holdMs: 360,
                rendererHints: {
                  residentMode: 'same-thread-continuation',
                  signature: 'embodiment:script-preview-authority',
                },
              },
              action: {
                actionCue: 'observe_soft',
                actionMode: 'hold',
                intensity: 0.18,
                holdMs: 320,
                rendererHints: {
                  residentMode: 'same-thread-continuation',
                  signature: 'embodiment:script-preview-authority',
                },
              },
              motor: {},
            }],
          },
        },
      },
    })

    expect(preview?.digitalLifeFrame).toEqual(expect.objectContaining({
      id: 'segment-script-digital-life-preview-fallback',
      mode: 'speaking',
      lipSync: expect.objectContaining({
        continuityHoldMs: 380,
      }),
      face: expect.objectContaining({
        rendererHints: expect.objectContaining({
          signature: 'embodiment:script-preview-authority',
        }),
      }),
      action: expect.objectContaining({
        rendererHints: expect.objectContaining({
          signature: 'embodiment:script-preview-authority',
        }),
      }),
    }))

    speech.dispose()
  })

  it('keeps measured-return cue-only body+voice-only renderer-only rejoin on the softer resident facial line before frame authority catches up', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-measured-return-cue-only-body-voice-rejoin',
      streamId: 'stream-measured-return-cue-only-body-voice-rejoin',
      segmentId: 'segment-measured-return-cue-only-body-voice-rejoin',
      text: '我先沿着这条还活着的身体和声音线中性可见占位，等身体画面慢一点跟上。',
      special: null,
      continuityHoldMs: 340,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-measured-return-cue-only-body-voice-rejoin',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的身体和声音线中性可见占位，等身体画面慢一点跟上。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-measured-return-cue-only-body-voice-rejoin',
              index: 0,
              text: '我先沿着这条还活着的身体和声音线中性可见占位，等身体画面慢一点跟上。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 340,
              rendererHints: {
                residentMode: 'measured-return',
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                signature: 'embodiment:audible_continuity_line',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-measured-return-cue-only-body-voice-rejoin',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.32,
              holdMs: 340,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-measured-return-cue-only-body-voice-rejoin',
              actionCue: 'observe_focus',
              intensity: 0.14,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.84,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-only',
            visemeHints: [],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 340,
          settleMs: 340,
          stopReason: null,
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-measured-return-cue-only-body-voice-rejoin',
            index: 0,
            startOffset: 0,
            endOffset: 33,
            text: '我先沿着这条还活着的身体和声音线中性可见占位，等身体画面慢一点跟上。',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
              signature: 'embodiment:audible_continuity_line',
              reasonTags: ['embodiment:body+voice-only'],
            },
            interruptMode: 'continue',
          },
          drivers: {
            body: null,
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: 'segment-measured-return-cue-only-body-voice-rejoin',
              continuityHoldMs: 340,
              visemeHints: [],
            },
          },
          driverAuthority: {
            segmentId: 'segment-measured-return-cue-only-body-voice-rejoin',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-measured-return-cue-only-body-voice-rejoin',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.22,
            cueMouthWeight: 0.32,
            cueHeadWeight: 0.18,
            visemePeakWeight: 0.54,
          },
        },
      },
    })

    expect(preview?.cue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: null,
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        reasonTags: ['embodiment:body+voice-only'],
      }),
    }))
    expect(
      (preview?.metadata?.embodimentPlayback as {
        driverAuthority?: {
          matchedDrivers?: string[]
          bodySegmentMatched?: boolean
          lipsyncSegmentMatched?: boolean
          voiceSegmentMatched?: boolean
        }
      } | undefined)?.driverAuthority,
    ).toEqual(expect.objectContaining({
      matchedDrivers: expect.arrayContaining(['lipsync', 'voice']),
      bodySegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))

    speech.dispose()
  })

  it('keeps measured-return cue-only body+voice-only renderer-only rejoin on the softer resident facial line even when no explicit facePlan speaking cue exists yet', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-measured-return-cue-only-body-voice-rejoin-no-face-plan',
      streamId: 'stream-measured-return-cue-only-body-voice-rejoin-no-face-plan',
      segmentId: 'segment-measured-return-cue-only-body-voice-rejoin-no-face-plan',
      text: '我先沿着这条还活着的身体和声音线中性可见占位，等表情也慢一点跟上。',
      special: null,
      continuityHoldMs: 340,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-measured-return-cue-only-body-voice-rejoin-no-face-plan',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的身体和声音线中性可见占位，等表情也慢一点跟上。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-measured-return-cue-only-body-voice-rejoin-no-face-plan',
              index: 0,
              text: '我先沿着这条还活着的身体和声音线中性可见占位，等表情也慢一点跟上。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 340,
              rendererHints: {
                residentMode: 'measured-return',
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                signature: 'embodiment:audible_continuity_line',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-measured-return-cue-only-body-voice-rejoin-no-face-plan',
              actionCue: 'observe_focus',
              intensity: 0.14,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.84,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 340,
          settleMs: 340,
          stopReason: null,
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-measured-return-cue-only-body-voice-rejoin-no-face-plan',
            index: 0,
            startOffset: 0,
            endOffset: 32,
            text: '我先沿着这条还活着的身体和声音线中性可见占位，等表情也慢一点跟上。',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
              signature: 'embodiment:audible_continuity_line',
              reasonTags: ['embodiment:body+voice-only'],
            },
            interruptMode: 'continue',
          },
          drivers: {
            body: null,
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: 'segment-measured-return-cue-only-body-voice-rejoin-no-face-plan',
              continuityHoldMs: 340,
              visemeHints: [],
            },
          },
          driverAuthority: {
            segmentId: 'segment-measured-return-cue-only-body-voice-rejoin-no-face-plan',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-measured-return-cue-only-body-voice-rejoin-no-face-plan',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.22,
            cueMouthWeight: 0.32,
            cueHeadWeight: 0.18,
            visemePeakWeight: 0.54,
          },
        },
      },
    })

    expect(preview?.cue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: null,
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        reasonTags: ['embodiment:body+voice-only'],
      }),
    }))
    expect(
      (preview?.metadata?.embodimentPlayback as {
        driverAuthority?: {
          matchedDrivers?: string[]
          bodySegmentMatched?: boolean
          lipsyncSegmentMatched?: boolean
          voiceSegmentMatched?: boolean
        }
      } | undefined)?.driverAuthority,
    ).toEqual(expect.objectContaining({
      matchedDrivers: expect.arrayContaining(['lipsync', 'voice']),
      bodySegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))

    speech.dispose()
  })

  it('rehydrates top-level prosodyAuthority from explicit voice driver telemetry during measured-return cue-only renderer-only rejoin', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-measured-return-cue-only-explicit-voice-driver-rejoin',
      streamId: 'stream-measured-return-cue-only-explicit-voice-driver-rejoin',
      segmentId: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
      text: '我先沿着这条还活着的身体和声音线中性可见占位，等表情慢一点跟上。',
      special: null,
      continuityHoldMs: 340,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-measured-return-cue-only-explicit-voice-driver-rejoin',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的身体和声音线中性可见占位，等表情慢一点跟上。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
              index: 0,
              text: '我先沿着这条还活着的身体和声音线中性可见占位，等表情慢一点跟上。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 340,
              rendererHints: {
                residentMode: 'measured-return',
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                signature: 'embodiment:audible_continuity_line',
                reasonTags: ['embodiment:body+voice-only'],
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            attentionMode: 'attentive',
            actionBursts: [{
              segmentId: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
              actionCue: 'observe_focus',
              intensity: 0.14,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.84,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 340,
          settleMs: 340,
          stopReason: null,
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '我先沿着这条还活着的身体和声音线中性可见占位，等表情慢一点跟上。',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
              signature: 'embodiment:audible_continuity_line',
              reasonTags: ['embodiment:body+voice-only'],
            },
            interruptMode: 'continue',
          },
          drivers: {
            body: null,
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-only',
              playbackPhase: 'playing',
              segmentId: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
              continuityHoldMs: 340,
              visemeHints: [],
            },
            voice: {
              playbackPhase: 'playing',
              continuityHoldMs: 340,
              segmentId: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
              source: 'prosody-authority',
              provenance: 'authority-bound',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.22,
              cueMouthWeight: 0.32,
              cueHeadWeight: 0.18,
              visemePeakWeight: 0.54,
            },
          },
          driverAuthority: {
            segmentId: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: null,
        },
      },
    })

    expect(
      (preview?.metadata?.embodimentPlayback as {
        prosodyAuthority?: {
          segmentId?: string | null
          source?: string | null
          mode?: string | null
          cueProsodyWeight?: number | null
          cueMouthWeight?: number | null
          cueHeadWeight?: number | null
          visemePeakWeight?: number | null
        } | null
      } | undefined)?.prosodyAuthority,
    ).toEqual(expect.objectContaining({
      segmentId: 'segment-measured-return-cue-only-explicit-voice-driver-rejoin',
      source: 'prosody-authority',
      mode: 'energy-phoneme-hybrid',
      cueProsodyWeight: 0.22,
      cueMouthWeight: 0.32,
      cueHeadWeight: 0.18,
      visemePeakWeight: 0.54,
    }))
    expect(
      (preview?.metadata?.embodimentPlayback as {
        drivers?: {
          voice?: {
            mode?: string | null
            cueProsodyWeight?: number | null
            cueMouthWeight?: number | null
            cueHeadWeight?: number | null
            visemePeakWeight?: number | null
          } | null
        }
      } | undefined)?.drivers?.voice,
    ).toEqual(expect.objectContaining({
      mode: 'energy-phoneme-hybrid',
      cueProsodyWeight: 0.22,
      cueMouthWeight: 0.32,
      cueHeadWeight: 0.18,
      visemePeakWeight: 0.54,
    }))
    expect(
      (preview?.metadata?.embodimentPlayback as {
        driverAuthority?: {
          matchedDrivers?: string[]
          voiceSegmentMatched?: boolean
        }
      } | undefined)?.driverAuthority,
    ).toEqual(expect.objectContaining({
      matchedDrivers: expect.arrayContaining(['lipsync', 'voice']),
      voiceSegmentMatched: true,
    }))

    speech.dispose()
  })

  it('does not relabel stale seeded voice authority weights onto a new preview living segment when the current line has no fresh voice proof yet', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-stale-seeded-voice-should-not-relable-new-preview-line',
      streamId: 'stream-stale-seeded-voice-should-not-relable-new-preview-line',
      segmentId: 'segment-fresh-preview-living-line',
      text: '我们继续沿着现在这条线慢一点接回来。',
      special: null,
      continuityHoldMs: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-stale-seeded-voice-should-not-relable-new-preview-line',
          rendererTarget: 'live2d',
          replyText: '我们继续沿着现在这条线慢一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-fresh-preview-living-line',
              index: 0,
              text: '我们继续沿着现在这条线慢一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-only',
            visemeHints: [],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 320,
          settleMs: 260,
          stopReason: null,
          rendererTarget: 'live2d',
          cue: null,
          driverAuthority: {
            segmentId: 'segment-stale-seeded-voice-shell',
            rendererTarget: 'live2d',
            matchedDrivers: ['voice'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
            voiceSegmentMatched: true,
          },
          prosodyAuthority: null,
          drivers: {
            body: null,
            face: null,
            motion: null,
            lipsync: null,
            voice: {
              playbackPhase: 'idle',
              continuityHoldMs: 240,
              segmentId: 'segment-stale-seeded-voice-shell',
              source: 'prosody-authority',
              provenance: 'authority-bound',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.22,
              cueMouthWeight: 0.31,
              cueHeadWeight: 0.18,
              visemePeakWeight: 0.53,
            },
          },
        },
      },
    })

    const playback = preview?.metadata?.embodimentPlayback as {
      drivers?: {
        voice?: {
          segmentId?: string | null
          mode?: string | null
          source?: string | null
          provenance?: string | null
          cueProsodyWeight?: number | null
          cueMouthWeight?: number | null
          cueHeadWeight?: number | null
          visemePeakWeight?: number | null
        } | null
      }
      prosodyAuthority?: {
        segmentId?: string | null
        mode?: string | null
        source?: string | null
        cueProsodyWeight?: number | null
        cueMouthWeight?: number | null
        cueHeadWeight?: number | null
        visemePeakWeight?: number | null
      } | null
    } | undefined

    expect(playback?.drivers?.voice).toEqual(expect.objectContaining({
      segmentId: 'segment-fresh-preview-living-line',
      mode: 'energy-only',
      source: null,
      visemePeakWeight: null,
    }))
    expect(playback?.drivers?.voice?.cueProsodyWeight).not.toBe(0.22)
    expect(playback?.drivers?.voice?.cueMouthWeight).not.toBe(0.31)
    expect(playback?.drivers?.voice?.cueHeadWeight).not.toBe(0.18)
    expect(playback?.prosodyAuthority).toEqual(expect.objectContaining({
      segmentId: 'segment-fresh-preview-living-line',
      mode: 'energy-only',
      source: null,
      visemePeakWeight: null,
    }))
    expect(playback?.prosodyAuthority?.cueProsodyWeight).not.toBe(0.22)
    expect(playback?.prosodyAuthority?.cueMouthWeight).not.toBe(0.31)
    expect(playback?.prosodyAuthority?.cueHeadWeight).not.toBe(0.18)

    speech.dispose()
  })

  it('does not inherit stale seeded cue renderer authority onto a new preview living segment when the current line has no fresh cue authority yet', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-stale-seeded-cue-renderer-authority-should-not-relable-new-preview-line',
      streamId: 'stream-stale-seeded-cue-renderer-authority-should-not-relable-new-preview-line',
      segmentId: 'segment-fresh-preview-cue-line',
      text: '我们继续沿着现在这条线慢一点接回来。',
      special: null,
      continuityHoldMs: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-stale-seeded-cue-renderer-authority-should-not-relable-new-preview-line',
          rendererTarget: 'live2d',
          replyText: '我们继续沿着现在这条线慢一点接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'same-thread-continuation',
          },
          speechPlan: {
            segments: [{
              id: 'segment-fresh-preview-cue-line',
              index: 0,
              text: '我们继续沿着现在这条线慢一点接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-only',
            visemeHints: [],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 320,
          settleMs: 260,
          stopReason: null,
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-stale-seeded-cue-shell',
            index: 0,
            startOffset: 0,
            endOffset: 6,
            text: '旧线不要继续冒出来。',
            emotion: 'thinking',
            gestureWeight: 0.24,
            facialWeight: 0.31,
            prosodyWeight: 0.28,
            beatWeight: 0.22,
            mouthWeight: 0.26,
            headWeight: 0.21,
            facialHoldMs: 240,
            actionHoldMs: 200,
            emotionHoldMs: 260,
            actionCue: 'stale_shell_action',
            facialCue: 'stale_shell_face',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
              preferredExpressionAliases: ['StaleShellFace'],
              preferredMotionAliases: ['StaleShellMotion'],
              signature: 'stale-seeded-cue-shell-signature',
              reasonTags: ['stale-seeded-cue-shell'],
            },
            rendererSettle: {
              live2dFacialReleaseMs: 777,
              live2dMotionFollowThroughMs: 888,
              vrmActionFadeMs: 999,
              vrmExpressionBlendMs: 1111,
            },
          },
          driverAuthority: null,
          prosodyAuthority: null,
          drivers: {
            body: null,
            face: null,
            motion: null,
            lipsync: null,
            voice: null,
          },
        },
      },
    })

    const playback = preview?.metadata?.embodimentPlayback as {
      cue?: {
        id?: string | null
        rendererHints?: {
          residentMode?: string | null
          preferredGazeMode?: string | null
          preferredBlinkCadence?: string | null
          signature?: string | null
          reasonTags?: string[] | null
        } | null
        rendererSettle?: {
          live2dFacialReleaseMs?: number | null
          live2dMotionFollowThroughMs?: number | null
          vrmActionFadeMs?: number | null
          vrmExpressionBlendMs?: number | null
        } | null
      } | null
    } | undefined

    expect(preview?.cue?.id).toBe('segment-fresh-preview-cue-line')
    expect(preview?.cue?.rendererHints).toBeNull()
    expect(preview?.cue?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: expect.any(Number),
      live2dMotionFollowThroughMs: expect.any(Number),
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(preview?.cue?.rendererSettle?.live2dFacialReleaseMs).not.toBe(777)
    expect(preview?.cue?.rendererSettle?.live2dMotionFollowThroughMs).not.toBe(888)
    expect(preview?.cue?.rendererSettle?.vrmActionFadeMs).not.toBe(999)
    expect(preview?.cue?.rendererSettle?.vrmExpressionBlendMs).not.toBe(1111)
    expect(playback?.cue?.id).toBe('segment-fresh-preview-cue-line')
    expect(playback?.cue?.rendererHints).toBeNull()
    expect(playback?.cue?.rendererSettle).toEqual(expect.objectContaining({
      live2dFacialReleaseMs: expect.any(Number),
      live2dMotionFollowThroughMs: expect.any(Number),
      vrmActionFadeMs: expect.any(Number),
      vrmExpressionBlendMs: expect.any(Number),
    }))
    expect(playback?.cue?.rendererSettle?.live2dFacialReleaseMs).not.toBe(777)
    expect(playback?.cue?.rendererSettle?.live2dMotionFollowThroughMs).not.toBe(888)
    expect(playback?.cue?.rendererSettle?.vrmActionFadeMs).not.toBe(999)
    expect(playback?.cue?.rendererSettle?.vrmExpressionBlendMs).not.toBe(1111)

    speech.dispose()
  })

  it('clears the current upcoming preview living line at playback start even when the playback manager still reports a stale shell segment id', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-stale-start-shell-clear-upcoming-living-line',
      streamId: 'stream-stale-start-shell-clear-upcoming-living-line',
      segmentId: 'segment-current-preview-living-line',
      text: '先别急。',
      special: null,
      continuityHoldMs: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-stale-start-shell-clear-upcoming-living-line',
          rendererTarget: 'live2d',
          replyText: '先别急。先别急。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [
              {
                id: 'segment-stale-start-shell',
                index: 0,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 180,
              },
              {
                id: 'segment-current-preview-living-line',
                index: 1,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 340,
              },
            ],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            speakingCues: [
              {
                segmentId: 'segment-stale-start-shell',
                emotion: 'thinking',
                facialCue: 'stale_shell_face',
                intensity: 0.28,
                holdMs: 180,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'cue-bridge',
                confidence: 0.74,
              },
              {
                segmentId: 'segment-current-preview-living-line',
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: 0.42,
                holdMs: 360,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              },
            ],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [
              {
                segmentId: 'segment-stale-start-shell',
                actionCue: 'observe_focus',
                intensity: 0.12,
                holdMs: 180,
                source: 'cue-bridge',
                confidence: 0.72,
              },
              {
                segmentId: 'segment-current-preview-living-line',
                actionCue: 'steady_focus',
                intensity: 0.22,
                holdMs: 320,
                source: 'timeline-projection',
                confidence: 0.9,
              },
            ],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [
              {
                segmentId: 'segment-stale-start-shell',
                viseme: 'A',
                weight: 0.36,
                source: 'cue-bridge',
                confidence: 0.78,
              },
              {
                segmentId: 'segment-current-preview-living-line',
                viseme: 'I',
                weight: 0.72,
                source: 'prosody-authority',
                confidence: 0.95,
              },
            ],
          },
        },
      },
    })

    expect(preview?.cue?.id).toBe('segment-current-preview-living-line')
    expect(preview?.digitalLifeFrame?.id).toBe('segment-current-preview-living-line')
    expect(speech.upcomingSpeechSegment.value?.segmentId).toBe('segment-current-preview-living-line')

    startListener?.({
      item: {
        id: 'playback-stale-start-shell-clear-upcoming-living-line',
        streamId: 'stream-stale-start-shell-clear-upcoming-living-line',
        intentId: 'intent-stale-start-shell-clear-upcoming-living-line',
        segmentId: 'segment-stale-start-shell',
        ownerId: 'alice',
        priority: 0,
        text: '先别急。',
        special: null,
        continuityHoldMs: 0,
        audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
        createdAt: 0,
        cue: preview?.cue ?? null,
        digitalLifeFrame: preview?.digitalLifeFrame ?? null,
        metadata: preview?.metadata ?? null,
      } as PlaybackItem<BrowserSpeechAudioSource>,
      startedAt: 120,
    })

    expect(speech.speechPlayback.value.item?.cue?.id).toBe('segment-current-preview-living-line')
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.id).toBe('segment-current-preview-living-line')
    expect(speech.speechPlayback.value.item?.segmentId).toBe('segment-current-preview-living-line')
    expect(speech.upcomingSpeechSegment.value).toBeNull()

    speech.dispose()
  })

  it('clears the current upcoming preview living line at playback start even when stale shell input can only be corrected through metadata and text authority', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-stale-start-shell-metadata-text-authority',
      streamId: 'stream-stale-start-shell-metadata-text-authority',
      segmentId: 'segment-current-preview-living-line',
      text: '先别急。',
      special: null,
      continuityHoldMs: 0,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-stale-start-shell-metadata-text-authority',
          rendererTarget: 'live2d',
          replyText: '先别急。先别急。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [
              {
                id: 'segment-stale-start-shell',
                index: 0,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 180,
              },
              {
                id: 'segment-current-preview-living-line',
                index: 1,
                text: '先别急。',
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 340,
              },
            ],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            speakingCues: [
              {
                segmentId: 'segment-stale-start-shell',
                emotion: 'thinking',
                facialCue: 'stale_shell_face',
                intensity: 0.28,
                holdMs: 180,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'cue-bridge',
                confidence: 0.74,
              },
              {
                segmentId: 'segment-current-preview-living-line',
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                intensity: 0.42,
                holdMs: 360,
                preUtteranceCue: 'soft-breath',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              },
            ],
          },
          motionPlan: {
            idleBase: 'steady_focus',
            attentionMode: 'attentive',
            actionBursts: [
              {
                segmentId: 'segment-stale-start-shell',
                actionCue: 'observe_focus',
                intensity: 0.12,
                holdMs: 180,
                source: 'cue-bridge',
                confidence: 0.72,
              },
              {
                segmentId: 'segment-current-preview-living-line',
                actionCue: 'steady_focus',
                intensity: 0.22,
                holdMs: 320,
                source: 'timeline-projection',
                confidence: 0.9,
              },
            ],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [
              {
                segmentId: 'segment-stale-start-shell',
                viseme: 'A',
                weight: 0.36,
                source: 'cue-bridge',
                confidence: 0.78,
              },
              {
                segmentId: 'segment-current-preview-living-line',
                viseme: 'I',
                weight: 0.72,
                source: 'prosody-authority',
                confidence: 0.95,
              },
            ],
          },
        },
      },
    })

    expect(preview?.cue?.id).toBe('segment-current-preview-living-line')
    expect(preview?.digitalLifeFrame?.id).toBe('segment-current-preview-living-line')
    expect(speech.upcomingSpeechSegment.value?.segmentId).toBe('segment-current-preview-living-line')

    startListener?.({
      item: {
        id: 'playback-stale-start-shell-metadata-text-authority',
        streamId: 'stream-stale-start-shell-metadata-text-authority',
        intentId: 'intent-stale-start-shell-metadata-text-authority',
        segmentId: 'segment-stale-start-shell',
        ownerId: 'alice',
        priority: 0,
        text: '先别急。',
        special: null,
        continuityHoldMs: 0,
        audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
        createdAt: 0,
        metadata: preview?.metadata ?? null,
      } as PlaybackItem<BrowserSpeechAudioSource>,
      startedAt: 120,
    })

    const playback = (speech.speechPlayback.value.item?.metadata as {
      embodimentPlayback?: {
        driverAuthority?: {
          segmentId?: string | null
        } | null
      } | null
    } | null | undefined)?.embodimentPlayback

    expect(speech.speechPlayback.value.item?.cue?.id).toBe('segment-current-preview-living-line')
    expect(speech.speechPlayback.value.item?.digitalLifeFrame?.id).toBe('segment-current-preview-living-line')
    expect(speech.speechPlayback.value.item?.segmentId).toBe('segment-current-preview-living-line')
    expect(playback?.driverAuthority?.segmentId).toBe('segment-current-preview-living-line')
    expect(speech.upcomingSpeechSegment.value).toBeNull()

    speech.dispose()
  })

  it('keeps the explicit playback living line at playback start when a stale cue shell is the only competing authority', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    let startListener: ((event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) | undefined

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    speech.bindPlaybackManager({
      onStart(listener) {
        startListener = listener
      },
      onEnd() {},
      onInterrupt() {},
    })

    startListener?.({
      item: {
        id: 'playback-stale-cue-shell-explicit-living-line',
        streamId: 'stream-stale-cue-shell-explicit-living-line',
        intentId: 'intent-stale-cue-shell-explicit-living-line',
        segmentId: 'segment-explicit-living-line',
        ownerId: 'alice',
        priority: 0,
        text: '先别急。',
        special: null,
        continuityHoldMs: 0,
        audio: createBufferedSpeechAudioSource({ duration: 0.3 } as AudioBuffer),
        createdAt: 0,
        cue: {
          id: 'turn-stale-cue-shell:0',
          index: 0,
          startOffset: 0,
          endOffset: 4,
          text: '先别急。',
          emotion: 'thinking',
          gestureWeight: 0.22,
          facialWeight: 0.38,
          prosodyWeight: 0.24,
          beatWeight: 0.18,
          mouthWeight: 0.2,
          headWeight: 0.18,
          facialHoldMs: 220,
          actionHoldMs: 180,
          emotionHoldMs: 220,
          settleMode: 'hold',
          rendererHints: null,
          rendererSettle: null,
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        },
      } as PlaybackItem<BrowserSpeechAudioSource>,
      startedAt: 120,
    })

    expect(speech.speechPlayback.value.item?.segmentId).toBe('segment-explicit-living-line')
    expect(speech.speechPlayback.value.item?.cue?.id).toBe('turn-stale-cue-shell:0')

    speech.dispose()
  })

  it('keeps quiet-companionship cue-only still-voiced renderer-only rejoin on the quieter resident facial line before frame authority catches up', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-quiet-companionship-cue-only-still-voiced-rejoin',
      streamId: 'stream-quiet-companionship-cue-only-still-voiced-rejoin',
      segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
      text: '我先沿着这条还活着的动作和声音线中性可见占位，等身体画面慢一点跟上。',
      special: null,
      continuityHoldMs: 340,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-quiet-companionship-cue-only-still-voiced-rejoin',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的动作和声音线中性可见占位，等身体画面慢一点跟上。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'quiet-companionship',
          },
          speechPlan: {
            segments: [{
              id: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
              index: 0,
              text: '我先沿着这条还活着的动作和声音线中性可见占位，等身体画面慢一点跟上。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 340,
              rendererHints: {
                residentMode: 'quiet-companionship',
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [{
              segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.28,
              holdMs: 340,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'prosody-authority',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            attentionMode: 'ambient',
            actionBursts: [{
              segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
              actionCue: 'observe_focus',
              intensity: 0.14,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.84,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 340,
          settleMs: 340,
          stopReason: null,
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
            index: 0,
            startOffset: 0,
            endOffset: 34,
            text: '我先沿着这条还活着的动作和声音线中性可见占位，等身体画面慢一点跟上。',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
              signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
            },
            interruptMode: 'continue',
          },
          drivers: {
            body: null,
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
              continuityHoldMs: 340,
              visemeHints: [],
            },
          },
          driverAuthority: {
            segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.2,
            cueMouthWeight: 0.28,
            cueHeadWeight: 0.14,
            visemePeakWeight: 0.46,
          },
        },
      },
    })

    expect(preview?.cue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: null,
      rendererHints: expect.objectContaining({
        residentMode: 'quiet-companionship',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      }),
    }))
    expect(
      (preview?.metadata?.embodimentPlayback as {
        driverAuthority?: {
          matchedDrivers?: string[]
          bodySegmentMatched?: boolean
          lipsyncSegmentMatched?: boolean
          voiceSegmentMatched?: boolean
        }
      } | undefined)?.driverAuthority,
    ).toEqual(expect.objectContaining({
      matchedDrivers: expect.arrayContaining(['lipsync', 'voice']),
      bodySegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))

    speech.dispose()
  })

  it('keeps quiet-companionship cue-only still-voiced renderer-only rejoin on the quieter resident facial line even when no explicit facePlan speaking cue exists yet', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')

    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
      streamId: 'stream-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
      segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
      text: '我先沿着这条还活着的动作和声音线中性可见占位，等表情也慢一点跟上。',
      special: null,
      continuityHoldMs: 340,
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
          rendererTarget: 'live2d',
          replyText: '我先沿着这条还活着的动作和声音线中性可见占位，等表情也慢一点跟上。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'quiet-companionship',
          },
          speechPlan: {
            segments: [{
              id: 'segment-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
              index: 0,
              text: '我先沿着这条还活着的动作和声音线中性可见占位，等表情也慢一点跟上。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 340,
              rendererHints: {
                residentMode: 'quiet-companionship',
                preferredGazeMode: 'soften',
                preferredBlinkCadence: 'linger',
                signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          },
          facePlan: {
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            attentionMode: 'ambient',
            actionBursts: [{
              segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
              actionCue: 'observe_focus',
              intensity: 0.14,
              holdMs: 280,
              source: 'timeline-projection',
              confidence: 0.84,
            }],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
        embodimentPlayback: {
          actualDurationMs: 0,
          driftMs: 0,
          plannedDurationMs: 340,
          settleMs: 340,
          stopReason: null,
          rendererTarget: 'live2d',
          cue: {
            id: 'segment-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
            index: 0,
            startOffset: 0,
            endOffset: 32,
            text: '我先沿着这条还活着的动作和声音线中性可见占位，等表情也慢一点跟上。',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'observe_focus',
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredGazeMode: 'soften',
              preferredBlinkCadence: 'linger',
              signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
            },
            interruptMode: 'continue',
          },
          drivers: {
            body: null,
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
              continuityHoldMs: 340,
              visemeHints: [],
            },
          },
          driverAuthority: {
            segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
            rendererTarget: 'live2d',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-quiet-companionship-cue-only-still-voiced-rejoin-no-face-plan',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.2,
            cueMouthWeight: 0.28,
            cueHeadWeight: 0.14,
            visemePeakWeight: 0.46,
          },
        },
      },
    })

    expect(preview?.cue).toEqual(expect.objectContaining({
      settleMode: 'hold',
      facialCue: 'soft-gaze',
      actionCue: null,
      rendererHints: expect.objectContaining({
        residentMode: 'quiet-companionship',
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      }),
    }))
    expect(
      (preview?.metadata?.embodimentPlayback as {
        driverAuthority?: {
          matchedDrivers?: string[]
          bodySegmentMatched?: boolean
          lipsyncSegmentMatched?: boolean
          voiceSegmentMatched?: boolean
        }
      } | undefined)?.driverAuthority,
    ).toEqual(expect.objectContaining({
      matchedDrivers: expect.arrayContaining(['lipsync', 'voice']),
      bodySegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
    }))

    speech.dispose()
  })

  it('ignores unknown metadata when explicit embodiment renderer hints define the playback cue', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { useStageEmbodimentSpeech } = await import('./use-stage-embodiment-speech')
    const speech = useStageEmbodimentSpeech({
      audioContext: {
        createAnalyser: vi.fn(() => ({
          fftSize: 2048,
          getByteTimeDomainData: vi.fn(),
        })),
        resume: vi.fn(() => Promise.resolve()),
        state: 'running',
      } as unknown as AudioContext,
      mouthOpenSize: ref(0),
      paused: ref(false),
      speechStylePitch: ref(0),
      speechStyleRate: ref(1),
      stageModelRenderer: ref('live2d'),
    })
    const segmentId = 'segment-explicit-renderer-hints-over-unknown-metadata'
    const text = '我会慢一点把这句话说完。'

    const preview = speech.previewSpeechSegment({
      intentId: 'intent-explicit-renderer-hints-over-unknown-metadata',
      streamId: 'stream-explicit-renderer-hints-over-unknown-metadata',
      segmentId,
      text,
      special: null,
      continuityHoldMs: 180,
      metadata: {
        unknownSidecar: {
          rendererDirective: 'unrecognized-value',
          nested: {
            preferredMode: 'unrecognized-mode',
          },
        },
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-explicit-renderer-hints-over-unknown-metadata',
          rendererTarget: 'live2d',
          replyText: text,
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: segmentId,
              index: 0,
              text,
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredExpressionAliases: ['CalmInspect'],
                preferredMotionAliases: ['ObserveSoft'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
              rendererSettle: {
                live2dFacialReleaseMs: 280,
                live2dMotionFollowThroughMs: 320,
                vrmActionFadeMs: 360,
                vrmExpressionBlendMs: 420,
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 300,
          },
          facePlan: {
            speakingCues: [{
              segmentId,
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.42,
              holdMs: 320,
              source: 'timeline-projection',
              confidence: 0.92,
            }],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            attentionMode: 'attentive',
            actionBursts: [],
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
            visemeHints: [],
          },
        },
      } as any,
    })

    expect(preview?.cue).toEqual(expect.objectContaining({
      settleMode: 'linger',
      facialCue: 'soft-gaze',
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      }),
      rendererSettle: expect.objectContaining({
        live2dFacialReleaseMs: expect.any(Number),
        live2dMotionFollowThroughMs: expect.any(Number),
      }),
    }))
    expect(preview?.cue?.rendererHints?.residentMode).not.toBe('repair-before-closeness')

    speech.dispose()
  })
})
