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
      baseEmotion: 'neutral',
      emotion: 'neutral',
      facialCue: 'smile',
      actionCue: 'wave',
    }), expect.objectContaining({
      turnId: 'turn-unknown-emotion',
      structured: expect.objectContaining({
        emotion: 'neutral',
        rawEmotion: 'super-excited',
      }),
    }))
    expect(speak).toBeCalledWith('我会克制表达', expect.objectContaining({
      baseEmotion: 'neutral',
      emotion: 'neutral',
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
