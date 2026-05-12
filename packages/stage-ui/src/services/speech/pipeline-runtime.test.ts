import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSpeechPipelineRuntime } from './pipeline-runtime'

import * as speechBusModule from './bus'

vi.mock('./bus', () => {
  const listeners = new Map<symbol, Set<(event: { body: unknown }) => void>>()
  const speechIntentStartEvent = Symbol('speechIntentStartEvent')
  const speechIntentLiteralEvent = Symbol('speechIntentLiteralEvent')
  const speechIntentSpecialEvent = Symbol('speechIntentSpecialEvent')
  const speechIntentFlushEvent = Symbol('speechIntentFlushEvent')
  const speechIntentEndEvent = Symbol('speechIntentEndEvent')
  const speechIntentCancelEvent = Symbol('speechIntentCancelEvent')
  const speechOwnerCancelEvent = Symbol('speechOwnerCancelEvent')

  const context = {
    emit(event: symbol, payload: unknown) {
      for (const listener of listeners.get(event) ?? [])
        listener({ body: payload })
    },
    on(event: symbol, listener: (event: { body: unknown }) => void) {
      if (!listeners.has(event))
        listeners.set(event, new Set())
      listeners.get(event)!.add(listener)
      return () => {
        listeners.get(event)?.delete(listener)
      }
    },
    reset() {
      listeners.clear()
    },
  }

  return {
    __esModule: true,
    getSpeechBusContext: () => context,
    speechIntentStartEvent,
    speechIntentLiteralEvent,
    speechIntentSpecialEvent,
    speechIntentFlushEvent,
    speechIntentEndEvent,
    speechIntentCancelEvent,
    speechOwnerCancelEvent,
    __testContext: context,
  }
})

function createIntentHandle(intentId: string, streamId: string, ownerId?: string) {
  return {
    intentId,
    streamId,
    ownerId,
    priority: 0,
    stream: new ReadableStream(),
    writeLiteral: vi.fn(),
    writeSpecial: vi.fn(),
    writeFlush: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
  }
}

beforeEach(() => {
  ;(speechBusModule as any).__testContext.reset()
  vi.clearAllMocks()
})

describe('speech pipeline runtime', () => {
  it('cancels bridged host intents, unbinds the bus, and can rebind after dispose', async () => {
    const hostIntent = createIntentHandle('remote-intent', 'remote-stream')
    const openIntent = vi.fn(() => hostIntent)
    const stopAll = vi.fn()
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, stopAll } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      ownerId: 'card-1',
      priority: 2,
      behavior: 'interrupt',
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      ownerId: 'card-1',
      priority: 2,
      behavior: 'interrupt',
    }))

    await runtime.dispose()

    expect(hostIntent.cancel).toHaveBeenCalledWith('runtime-dispose')
    expect(stopAll).toHaveBeenCalledWith('runtime-dispose')

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-2',
      streamId: 'remote-stream-2',
    })
    expect(openIntent).toHaveBeenCalledTimes(1)

    await runtime.registerHost({ openIntent, stopAll } as any)
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-3',
      streamId: 'remote-stream-3',
    })
    expect(openIntent).toHaveBeenCalledTimes(2)
  })

  it('emits cancel events for locally created remote intents during dispose', async () => {
    const cancelPayloads: Array<{ intentId?: string, reason?: string }> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentCancelEvent, (event: { body: unknown }) => {
      cancelPayloads.push(event.body as { intentId?: string, reason?: string })
    })

    const runtime = createSpeechPipelineRuntime()
    const intent = runtime.openIntent({
      intentId: 'local-intent',
      streamId: 'local-stream',
      behavior: 'replace',
    })

    intent.writeLiteral('hello')
    await runtime.dispose()

    expect(cancelPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent',
      reason: 'runtime-dispose',
    }))
  })

  it('broadcasts owner-level cancel events and cancels matching local remote intents', async () => {
    const ownerCancelPayloads: Array<{ ownerId?: string, reason?: string }> = []
    const intentCancelPayloads: Array<{ intentId?: string, reason?: string }> = []

    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechOwnerCancelEvent, (event: { body: unknown }) => {
      ownerCancelPayloads.push(event.body as { ownerId?: string, reason?: string })
    })
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentCancelEvent, (event: { body: unknown }) => {
      intentCancelPayloads.push(event.body as { intentId?: string, reason?: string })
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'owner-a',
      streamId: 'stream-a',
      ownerId: 'card-1',
    })
    runtime.openIntent({
      intentId: 'owner-b',
      streamId: 'stream-b',
      ownerId: 'card-2',
    })

    runtime.cancelOwner('card-1', 'new-message')

    expect(ownerCancelPayloads).toContainEqual(expect.objectContaining({
      ownerId: 'card-1',
      reason: 'new-message',
    }))
    expect(intentCancelPayloads).toContainEqual(expect.objectContaining({
      intentId: 'owner-a',
      reason: 'new-message',
    }))
    expect(intentCancelPayloads).not.toContainEqual(expect.objectContaining({
      intentId: 'owner-b',
    }))
  })

  it('routes owner-level cancel events through the host pipeline without reprocessing its own echo', async () => {
    const hostIntent = createIntentHandle('remote-intent', 'remote-stream', 'card-1')
    const openIntent = vi.fn(() => hostIntent)
    const stopAll = vi.fn()
    const cancelOwner = vi.fn()
    const ownerCancelPayloads: Array<{ ownerId?: string, reason?: string }> = []
    const runtime = createSpeechPipelineRuntime()

    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechOwnerCancelEvent, (event: { body: unknown }) => {
      ownerCancelPayloads.push(event.body as { ownerId?: string, reason?: string })
    })

    await runtime.registerHost({ openIntent, stopAll, cancelOwner } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      ownerId: 'card-1',
    })
    expect(openIntent).toHaveBeenCalledTimes(1)

    runtime.cancelOwner('card-1', 'barge-in')

    expect(cancelOwner).toHaveBeenCalledTimes(1)
    expect(cancelOwner).toHaveBeenCalledWith('card-1', 'barge-in')
    expect(ownerCancelPayloads).toContainEqual(expect.objectContaining({
      ownerId: 'card-1',
      reason: 'barge-in',
    }))

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechOwnerCancelEvent, {
      originId: 'external-origin',
      ownerId: 'card-1',
      reason: 'remote-barge-in',
    })

    expect(cancelOwner).toHaveBeenCalledTimes(2)
    expect(cancelOwner).toHaveBeenNthCalledWith(2, 'card-1', 'remote-barge-in')
  })

  it('passes metadata when rebuilding host intents from remote start events', async () => {
    const hostIntent = createIntentHandle('remote-intent', 'remote-stream')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-remote-script',
          rendererTarget: 'live2d',
          replyText: 'remote reply',
          state: {
            baseEmotion: 'thinking',
            delivery: 'firm',
            emphasis: 1,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-remote-script',
              index: 0,
              text: 'remote reply',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 220,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 220,
          },
          facePlan: {
            speakingCues: [],
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
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-42',
          },
        },
      },
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      metadata: {
        embodimentScript: expect.objectContaining({
          turnId: 'turn-remote-script',
        }),
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-42',
          },
        },
      },
    }))
  })

  it('emits metadata on intent start events for remote intents', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-metadata',
      streamId: 'local-stream-metadata',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-local-script',
          rendererTarget: 'live2d',
          replyText: 'local reply',
          state: {
            baseEmotion: 'thinking',
            delivery: 'firm',
            emphasis: 1,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-local-script',
              index: 0,
              text: 'local reply',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 220,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 220,
          },
          facePlan: {
            speakingCues: [],
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
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-local',
            watchMode: 'observing',
          },
        },
      },
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-metadata',
      streamId: 'local-stream-metadata',
      metadata: {
        embodimentScript: expect.objectContaining({
          turnId: 'turn-local-script',
        }),
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-local',
            watchMode: 'observing',
          },
        },
      },
    }))
  })
})
