import type { PlaybackItem } from '@proj-alicization/pipelines-audio'

import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'

import { createBufferedSpeechAudioSource } from '@proj-alicization/pipelines-audio'
import {
  alignAlicizationDialogueSpeechTimelineSegment,
  buildAlicizationDialogueSpeechTimeline,
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
      cue: null,
      digitalLifeFrame: null,
    })
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
