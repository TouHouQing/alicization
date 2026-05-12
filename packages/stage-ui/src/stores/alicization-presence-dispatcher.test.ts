import type { AlicizationDialogueRespondedPayload } from './alicization-bridge'

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAlicizationPresenceDispatcherStore } from './alicization-presence-dispatcher'

function createPayload(overrides?: Partial<AlicizationDialogueRespondedPayload>): AlicizationDialogueRespondedPayload {
  const structuredOverrides = overrides?.structured
  return {
    cardId: 'default',
    turnId: 'turn-1',
    sessionId: 'session-1',
    structured: {
      thought: '',
      emotion: 'happy',
      reply: '你好',
      performance: {
        baseEmotion: 'happy',
        emotion: 'happy',
        facialCue: null,
        actionCue: null,
        delivery: 'energetic',
        emphasis: 1,
      },
      ...structuredOverrides,
    },
    isFallback: false,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('alicization presence dispatcher', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('deduplicates same turnId and dispatches only once', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn()
    const speak = vi.fn()

    store.registerLive2DController({ applyPerformance })
    store.registerTTSController({ speak })

    const payload = createPayload({ turnId: 'turn-dedupe' })
    await store.dispatchDialogueResponded(payload)
    await store.dispatchDialogueResponded(payload)

    expect(applyPerformance).toBeCalledTimes(1)
    expect(speak).toBeCalledTimes(1)
  })

  it('downgrades unknown emotion to neutral and writes warning audit', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn()
    const speak = vi.fn()
    const appendAuditLog = vi.fn()

    store.registerLive2DController({ applyPerformance })
    store.registerTTSController({ speak })
    store.setAuditLogger(appendAuditLog)

    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-unknown-emotion',
      structured: {
        thought: '',
        emotion: 'super-excited' as any,
        reply: '我会克制表达',
        performance: {
          baseEmotion: 'super-excited' as any,
          emotion: 'super-excited' as any,
          facialCue: 'smile',
          actionCue: 'wave',
          delivery: 'energetic',
          emphasis: 2,
        },
      },
    }))

    expect(applyPerformance).toBeCalledWith(expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'glance',
      actionCue: 'quick_glance',
    }), expect.objectContaining({
      turnId: 'turn-unknown-emotion',
      structured: expect.objectContaining({
        embodiment: expect.objectContaining({
          variationToken: expect.stringContaining('turn-unknown-emotion'),
        }),
        speechTimeline: expect.objectContaining({
          version: 'speech-timeline-v1',
          segments: expect.arrayContaining([
            expect.objectContaining({
              actionWindow: 'segment-start',
              beatWeight: 0.48,
            }),
          ]),
        }),
        emotion: 'thinking',
        rawEmotion: 'super-excited',
      }),
    }))
    expect(speak).toBeCalledWith('我会克制表达', expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
    }), expect.any(Object))
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      level: 'warning',
      category: 'alicization.presence',
      action: 'emotion-downgraded',
    }))
  })

  it('dispatches live2d and tts in parallel with settled degradation', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn().mockRejectedValueOnce(new Error('live2d-failed'))
    const speak = vi.fn().mockResolvedValue(undefined)
    const appendAuditLog = vi.fn()
    const listener = vi.fn()

    store.registerLive2DController({ applyPerformance })
    store.registerTTSController({ speak })
    store.setAuditLogger(appendAuditLog)
    store.onDialogueResponded(listener)

    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-parallel',
      structured: {
        thought: '',
        emotion: 'sad',
        reply: '我还在',
        performance: {
          baseEmotion: 'sad',
          emotion: 'sad',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    }))

    expect(applyPerformance).toBeCalledTimes(1)
    expect(speak).toBeCalledTimes(1)
    expect(listener).toBeCalledTimes(1)
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'live2d-dispatch-failed',
    }))
  })

  it('routes sparse dialogue performance and avoids cue stagnation across turns', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn()

    store.registerLive2DController({ applyPerformance })

    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-sparse-1',
      structured: {
        thought: 'obligation=care; truth=grounded; focus=host-state; move=soothe; tone=warm',
        emotion: 'concerned',
        reply: '别急，我们先慢慢来，我陪着你。',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    }))
    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-sparse-2',
      structured: {
        thought: 'obligation=care; truth=grounded; focus=host-state; move=guide; tone=warm',
        emotion: 'concerned',
        reply: '我在，你可以先说最卡的一步，我们一起拆开看。',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    }))

    expect(applyPerformance).toBeCalledTimes(2)
    const firstPerformance = applyPerformance.mock.calls[0]?.[0]
    const secondPerformance = applyPerformance.mock.calls[1]?.[0]
    expect(firstPerformance?.facialCue).toBeTruthy()
    expect(firstPerformance?.actionCue).toBeTruthy()
    expect(secondPerformance?.facialCue).toBeTruthy()
    expect(secondPerformance?.actionCue).toBeTruthy()
    expect(secondPerformance?.actionCue).not.toBe(firstPerformance?.actionCue)
  })

  it('supports multi-channel embodiment routing with active channel guard', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const live2dApplyPerformance = vi.fn()
    const vrmApplyPerformance = vi.fn()

    store.registerEmbodimentController({
      channel: 'live2d',
      isActive: () => false,
      applyPerformance: live2dApplyPerformance,
    })
    store.registerEmbodimentController({
      channel: 'vrm',
      isActive: () => true,
      applyPerformance: vrmApplyPerformance,
    })

    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-vrm-active',
      structured: {
        thought: '',
        emotion: 'happy',
        reply: '专注在当前渲染器',
        performance: {
          baseEmotion: 'happy',
          emotion: 'happy',
          facialCue: null,
          actionCue: null,
          delivery: 'energetic',
          emphasis: 1,
        },
      },
    }))

    expect(vrmApplyPerformance).toBeCalledTimes(1)
    expect(live2dApplyPerformance).not.toBeCalled()
  })

  it('builds one embodiment script per dialogue turn and reuses it across live2d and tts channels', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn()
    const speak = vi.fn()

    store.setEmbodimentScriptBuilder((payload) => {
      return {
        version: 'embodiment-script-v1',
        turnId: payload.turnId,
        rendererTarget: 'live2d',
        replyText: payload.structured.reply,
        state: {
          baseEmotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
          residentMode: 'dialogue',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'hard-stop',
          preRollMs: 0,
          settleMs: 160,
        },
        facePlan: { speakingCues: [] },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: { mode: 'energy-only' },
      }
    })

    store.registerLive2DController({ applyPerformance })
    store.registerTTSController({ speak })

    await store.dispatchDialogueResponded({
      cardId: 'card-1',
      turnId: 'turn-script-1',
      sessionId: 'session-1',
      createdAt: Date.now(),
      isFallback: false,
      structured: {
        format: 'mind-turn-v1',
        thought: 'focus',
        emotion: 'neutral',
        reply: '你好',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      },
    } as any)

    const live2dPayload = applyPerformance.mock.calls[0]?.[1]
    const ttsPayload = speak.mock.calls[0]?.[2]
    expect(live2dPayload.structured.embodimentScript.turnId).toBe('turn-script-1')
    expect(ttsPayload.structured.embodimentScript.turnId).toBe('turn-script-1')
    expect(live2dPayload.structured.embodimentScript).toEqual(ttsPayload.structured.embodimentScript)
  })

  it('keeps runtime-provided embodimentScript instead of rebuilding it locally', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn()
    const builder = vi.fn(() => ({
      version: 'embodiment-script-v1',
      turnId: 'turn-script-fallback',
      rendererTarget: 'live2d',
      replyText: 'builder-reply',
      state: {
        baseEmotion: 'neutral',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'idle_settle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: { mode: 'energy-only' },
    }))
    const runtimeScript = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-script-fallback',
      rendererTarget: 'live2d' as const,
      replyText: 'runtime-reply',
      state: {
        baseEmotion: 'happy' as const,
        delivery: 'energetic' as const,
        emphasis: 2 as const,
        residentMode: 'dialogue' as const,
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop' as const,
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'runtime-idle',
        actionBursts: [],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: { mode: 'energy-only' as const },
    }

    store.setEmbodimentScriptBuilder(builder)
    store.registerLive2DController({ applyPerformance })

    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-script-fallback',
      structured: {
        thought: 'focus',
        emotion: 'happy',
        reply: '你好',
        embodimentScript: runtimeScript as any,
        performance: {
          baseEmotion: 'happy',
          emotion: 'happy',
          facialCue: null,
          actionCue: null,
          delivery: 'energetic',
          emphasis: 1,
        },
      },
    }))

    const live2dPayload = applyPerformance.mock.calls[0]?.[1]
    expect(builder).not.toBeCalled()
    expect(live2dPayload?.structured.embodimentScript).toEqual(runtimeScript)
  })

  it('restores the previous embodimentScript builder when the latest registration is disposed', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn()
    const firstDispose = store.setEmbodimentScriptBuilder((payload) => ({
      version: 'embodiment-script-v1',
      turnId: payload.turnId,
      rendererTarget: 'live2d',
      replyText: 'first',
      state: {
        baseEmotion: 'neutral',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'first-idle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: { mode: 'energy-only' },
    }))
    const secondDispose = store.setEmbodimentScriptBuilder((payload) => ({
      version: 'embodiment-script-v1',
      turnId: payload.turnId,
      rendererTarget: 'live2d',
      replyText: 'second',
      state: {
        baseEmotion: 'neutral',
        delivery: 'calm',
        emphasis: 0,
        residentMode: 'dialogue',
      },
      speechPlan: {
        segments: [],
        interruptPolicy: 'hard-stop',
        preRollMs: 0,
        settleMs: 160,
      },
      facePlan: { speakingCues: [] },
      motionPlan: {
        idleBase: 'second-idle',
        actionBursts: [],
        attentionMode: 'attentive',
      },
      lipsyncPlan: { mode: 'energy-only' },
    }))

    store.registerLive2DController({ applyPerformance })

    await store.dispatchDialogueResponded(createPayload({ turnId: 'turn-script-stack-1' }))
    secondDispose()
    await store.dispatchDialogueResponded(createPayload({ turnId: 'turn-script-stack-2' }))
    firstDispose()
    await store.dispatchDialogueResponded(createPayload({ turnId: 'turn-script-stack-3' }))

    expect(applyPerformance.mock.calls[0]?.[1]?.structured.embodimentScript?.motionPlan.idleBase).toBe('second-idle')
    expect(applyPerformance.mock.calls[1]?.[1]?.structured.embodimentScript?.motionPlan.idleBase).toBe('first-idle')
    expect(applyPerformance.mock.calls[2]?.[1]?.structured.embodimentScript).toBeNull()
  })

  it('reports vrm dispatch failure with channel specific audit action', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPerformance = vi.fn().mockRejectedValueOnce(new Error('vrm-failed'))
    const appendAuditLog = vi.fn()

    store.registerEmbodimentController({
      channel: 'vrm',
      applyPerformance,
    })
    store.setAuditLogger(appendAuditLog)

    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-vrm-failure',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: 'VRM失败降级',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      },
    }))

    expect(applyPerformance).toBeCalledTimes(1)
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'vrm-dispatch-failed',
      payload: expect.objectContaining({
        channel: 'vrm',
      }),
    }))
  })

  it('reports tts failure correctly when live2d controller is absent', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const speak = vi.fn().mockRejectedValueOnce(new Error('tts-failed'))
    const appendAuditLog = vi.fn()

    store.registerTTSController({ speak })
    store.setAuditLogger(appendAuditLog)

    await store.dispatchDialogueResponded(createPayload({
      turnId: 'turn-tts-only',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '仅语音',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      },
    }))

    expect(speak).toBeCalledTimes(1)
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      action: 'tts-dispatch-failed',
    }))
    expect(appendAuditLog).not.toBeCalledWith(expect.objectContaining({
      action: 'live2d-dispatch-failed',
    }))
  })

  it('dispatches silent presence pulse without invoking tts', async () => {
    const store = useAlicizationPresenceDispatcherStore()
    const applyPresencePulse = vi.fn()
    const speak = vi.fn()

    store.registerLive2DController({
      applyPerformance: vi.fn(),
      applyPresencePulse,
    })
    store.registerTTSController({ speak })

    await store.dispatchPresencePulse({
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: 'coding',
      stance: 'observe',
      confidence: 0.72,
      reasonTags: ['semantic-friction'],
      emotionalTension: 'focused-flow',
      expiresAt: Date.now() + 1_000,
    })

    expect(applyPresencePulse).toBeCalledTimes(1)
    expect(speak).not.toBeCalled()
  })
})
