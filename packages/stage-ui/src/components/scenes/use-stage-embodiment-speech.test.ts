import type { PlaybackItem } from '@proj-alicization/pipelines-audio'

import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'

import { createLive2DLipSync } from '@proj-alicization/model-driver-lipsync'
import { createBufferedSpeechAudioSource } from '@proj-alicization/pipelines-audio'
import {
  alignAlicizationDialogueSpeechTimelineSegment,
  buildAlicizationDialogueSpeechTimeline,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentMotorState,
  createIdleStageEmbodimentSpeechDynamicsState,
  createIdleStageEmbodimentSpeechPlaybackState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
  deriveStageEmbodimentSpeechRenderState,
  resolveStageEmbodimentSpeechStopLingerMs,
} from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

afterEach(() => {
  vi.useRealTimers()
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

describe('stage embodiment speech contract', () => {
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
      segmentId: 'segment-digital-life',
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

    const speech = useStageEmbodimentSpeech({
      audioContext,
      mouthOpenSize: ref(0),
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

  it('keeps continuous viseme-driven mouth motion even when live2d mouth-open energy is near zero', async () => {
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

  it('keeps queued preview segments in playback order instead of skipping to the latest ready chunk', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})

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

  it('builds fallback digital-life frames from spine digest when envelope frames are unavailable', async () => {
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
            selfNarrative: 'stabilize before speaking',
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
      mouthOpenSize: ref(0),
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
    }

    startListener?.({ item, startedAt: 100 })
    expect(speech.speechRenderState.value.phase).toBe('starting')
    expect(speech.nowSpeaking.value).toBe(true)

    endListener?.({ item, endedAt: 240 })
    expect(interruptListener).toBeTypeOf('function')
    expect(speech.speechRenderState.value.phase).toBe('stopping')
    expect(speech.nowSpeaking.value).toBe(true)

    vi.advanceTimersByTime(180)

    expect(speech.speechRenderState.value.phase).toBe('idle')
    expect(speech.nowSpeaking.value).toBe(false)

    speech.dispose()
  })
})
