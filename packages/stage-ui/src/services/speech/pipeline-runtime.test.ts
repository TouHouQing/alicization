import type { IntentOptions } from '@proj-alicization/pipelines-audio'

import { readFileSync } from 'node:fs'

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

function createEmbodimentScriptFixture(turnId: string) {
  const replyText = 'Provider may discuss continuity semantics as ordinary content.'
  return {
    version: 'embodiment-script-v1',
    turnId,
    rendererTarget: 'live2d',
    replyText,
    state: {
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      residentMode: 'dialogue',
    },
    speechPlan: {
      segments: [{
        id: `segment-${turnId}`,
        index: 0,
        text: replyText,
        interruptPolicy: 'soft-settle',
        preRollMs: 40,
        settleMs: 220,
        rendererHints: {
          residentMode: 'measured-return',
          preferredGazeMode: 'soften',
        },
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
  }
}

function createSpeechMetadataFixture(turnId: string) {
  return {
    runtimeDigest: {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.24,
      companionshipPressure: 0.31,
      channels: [{
        id: 'active-memory',
        state: 'warm',
        readiness: 0.82,
        focus: 'index the latest memory batch',
        summary: 'working memory is available',
      }],
      summary: 'active memory is available',
    },
    embodimentScript: createEmbodimentScriptFixture(turnId),
    speechSynthesis: {
      provider: 'local',
      voiceId: 'alice-local',
    },
    ordinaryMetadata: {
      requestId: `request-${turnId}`,
      source: 'dialogue-runtime',
    },
  }
}

function expectSpeechMetadata(metadata: unknown, turnId: string) {
  expect(metadata).toEqual(expect.objectContaining({
    runtimeDigest: expect.objectContaining({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      companionshipPressure: 0.31,
    }),
    embodimentScript: expect.objectContaining({
      turnId,
      rendererTarget: 'live2d',
      replyText: 'Provider may discuss continuity semantics as ordinary content.',
      speechPlan: expect.objectContaining({
        segments: [
          expect.objectContaining({
            text: 'Provider may discuss continuity semantics as ordinary content.',
          }),
        ],
      }),
    }),
    speechSynthesis: {
      provider: 'local',
      voiceId: 'alice-local',
    },
    ordinaryMetadata: {
      requestId: `request-${turnId}`,
      source: 'dialogue-runtime',
    },
  }))
}

beforeEach(() => {
  ;(speechBusModule as any).__testContext.reset()
  vi.clearAllMocks()
})

describe('speech pipeline runtime', () => {
  it('does not maintain a legacy metadata-key denylist', () => {
    const source = readFileSync(new URL('./pipeline-runtime.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('legacySpeechGovernanceKeys')
    expect(source).not.toContain('isLegacySpeechGovernanceKey')
  })

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

  it('preserves provider-authored bridged literal and special speech tokens verbatim', async () => {
    const hostIntent = createIntentHandle('remote-template-intent', 'remote-template-stream')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, stopAll: vi.fn() } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
      value: 'The provider may literally discuss continuity semantics.',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentSpecialEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
      value: '这个短语也可能是用户原话。',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
      value: '这句是真正要读出来的内容。',
    })

    expect(hostIntent.writeLiteral).toHaveBeenCalledTimes(2)
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(1, 'The provider may literally discuss continuity semantics.')
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(2, '这句是真正要读出来的内容。')
    expect(hostIntent.writeSpecial).toHaveBeenCalledWith('这个短语也可能是用户原话。')
  })

  it('preserves provider-authored direct host literal and special speech tokens verbatim', async () => {
    const hostIntent = createIntentHandle('local-template-intent', 'local-template-stream')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, stopAll: vi.fn() } as any)

    const intent = runtime.openIntent({
      intentId: 'local-template-intent',
      streamId: 'local-template-stream',
    })

    intent.writeLiteral('The provider may literally discuss continuity semantics.')
    intent.writeSpecial('这个短语也可能是用户原话。')
    intent.writeLiteral('这句是真正要读出来的内容。')

    expect(hostIntent.writeLiteral).toHaveBeenCalledTimes(2)
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(1, 'The provider may literally discuss continuity semantics.')
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(2, '这句是真正要读出来的内容。')
    expect(hostIntent.writeSpecial).toHaveBeenCalledWith('这个短语也可能是用户原话。')
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

  it('preserves current metadata for direct local host intents', async () => {
    const hostIntent = createIntentHandle('local-metadata-intent', 'local-metadata-stream')
    const openIntent = vi.fn((_options?: IntentOptions) => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    runtime.openIntent({
      intentId: 'local-metadata-intent',
      streamId: 'local-metadata-stream',
      metadata: createSpeechMetadataFixture('turn-local-host'),
    } as any)

    expect(openIntent).toHaveBeenCalledTimes(1)
    expectSpeechMetadata(openIntent.mock.calls[0]?.[0]?.metadata, 'turn-local-host')
  })

  it('preserves current metadata from remote start events', async () => {
    const hostIntent = createIntentHandle('remote-metadata-intent', 'remote-metadata-stream')
    const openIntent = vi.fn((_options?: IntentOptions) => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-metadata-intent',
      streamId: 'remote-metadata-stream',
      metadata: createSpeechMetadataFixture('turn-remote-start'),
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expectSpeechMetadata(openIntent.mock.calls[0]?.[0]?.metadata, 'turn-remote-start')
  })

  it('emits real speech metadata on start events for locally created remote intents', () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-remote-metadata-intent',
      streamId: 'local-remote-metadata-stream',
      metadata: {
        embodimentScript: createEmbodimentScriptFixture('turn-local-remote'),
        speechSynthesis: {
          provider: 'local',
          voiceId: 'alice-local',
        },
        ordinaryMetadata: {
          requestId: 'request-local-remote',
        },
      },
    } as any)

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-remote-metadata-intent',
      streamId: 'local-remote-metadata-stream',
      metadata: expect.objectContaining({
        embodimentScript: expect.objectContaining({
          turnId: 'turn-local-remote',
        }),
        speechSynthesis: {
          provider: 'local',
          voiceId: 'alice-local',
        },
        ordinaryMetadata: {
          requestId: 'request-local-remote',
        },
      }),
    }))
  })

  it('opens the later owner intent after cancellation without changing its metadata', async () => {
    const firstHostIntent = createIntentHandle('remote-owner-first', 'remote-owner-stream-first', 'card-1')
    const secondHostIntent = createIntentHandle('remote-owner-second', 'remote-owner-stream-second', 'card-1')
    const openIntent = vi
      .fn()
      .mockReturnValueOnce(firstHostIntent)
      .mockReturnValueOnce(secondHostIntent)
    const cancelOwner = vi.fn()
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, cancelOwner } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-owner-first',
      streamId: 'remote-owner-stream-first',
      ownerId: 'card-1',
      metadata: {
        embodimentScript: createEmbodimentScriptFixture('turn-owner-first'),
      },
    })
    runtime.cancelOwner('card-1', 'owner-canceled')
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-owner-second',
      streamId: 'remote-owner-stream-second',
      ownerId: 'card-1',
      metadata: {
        embodimentScript: createEmbodimentScriptFixture('turn-owner-second'),
      },
    })

    expect(cancelOwner).toHaveBeenCalledWith('card-1', 'owner-canceled')
    expect(openIntent).toHaveBeenCalledTimes(2)
    expect(openIntent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      intentId: 'remote-owner-second',
      streamId: 'remote-owner-stream-second',
      ownerId: 'card-1',
      metadata: {
        embodimentScript: expect.objectContaining({
          turnId: 'turn-owner-second',
        }),
      },
    }))
  })

  it('does not reopen a started host intent while later tokens continue on the same stream', async () => {
    const hostIntent = createIntentHandle('remote-streaming-intent', 'remote-streaming-stream', 'card-1')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-streaming-intent',
      streamId: 'remote-streaming-stream',
      ownerId: 'card-1',
      metadata: {
        embodimentScript: createEmbodimentScriptFixture('turn-streaming'),
      },
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-streaming-intent',
      streamId: 'remote-streaming-stream',
      sequence: 0,
      value: '第一段。',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentFlushEvent, {
      originId: 'external-origin',
      intentId: 'remote-streaming-intent',
      streamId: 'remote-streaming-stream',
      sequence: 1,
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-streaming-intent',
      streamId: 'remote-streaming-stream',
      sequence: 2,
      value: '第二段。',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentEndEvent, {
      originId: 'external-origin',
      intentId: 'remote-streaming-intent',
      streamId: 'remote-streaming-stream',
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(1, '第一段。')
    expect(hostIntent.writeFlush).toHaveBeenCalledTimes(1)
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(2, '第二段。')
    expect(hostIntent.end).toHaveBeenCalledTimes(1)
  })

  it('rebuilds a missed-start token stream with sanitized metadata and owner interruption authority', async () => {
    const hostIntent = createIntentHandle('late-token-intent', 'late-token-stream', 'card-memory')
    const openIntent = vi.fn((_options?: IntentOptions) => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'late-token-intent',
      streamId: 'late-token-stream',
      ownerId: 'card-memory',
      priority: 7,
      behavior: 'interrupt',
      sequence: 0,
      value: '迟到的第一段。',
      metadata: createSpeechMetadataFixture('turn-token-fallback'),
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentFlushEvent, {
      originId: 'external-origin',
      intentId: 'late-token-intent',
      streamId: 'late-token-stream',
      ownerId: 'card-memory',
      priority: 7,
      behavior: 'interrupt',
      sequence: 1,
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentEndEvent, {
      originId: 'external-origin',
      intentId: 'late-token-intent',
      streamId: 'late-token-stream',
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'late-token-intent',
      streamId: 'late-token-stream',
      ownerId: 'card-memory',
      priority: 7,
      behavior: 'interrupt',
    }))
    expectSpeechMetadata(openIntent.mock.calls[0]?.[0]?.metadata, 'turn-token-fallback')
    expect(hostIntent.writeLiteral).toHaveBeenCalledWith('迟到的第一段。')
    expect(hostIntent.writeFlush).toHaveBeenCalledTimes(1)
    expect(hostIntent.end).toHaveBeenCalledTimes(1)
  })
})
