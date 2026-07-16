import type { TextSegment, TextToken } from './types'

import { describe, expect, it, vi } from 'vitest'

import { createSpeechPipeline } from './speech-pipeline'

describe('speech pipeline', () => {
  it('cancels only the selected owner and promotes the next queued owner intent', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }
    const startedIntentIds: string[] = []
    const pipeline = createSpeechPipeline<string>({
      tts: vi.fn(async () => null),
      playback,
    })

    pipeline.on('onIntentStart', (intentId) => {
      startedIntentIds.push(intentId)
    })

    pipeline.openIntent({
      intentId: 'owner-a-active',
      streamId: 'stream-a-active',
      ownerId: 'card-1',
    })
    pipeline.openIntent({
      intentId: 'owner-a-queued',
      streamId: 'stream-a-queued',
      ownerId: 'card-1',
    })
    pipeline.openIntent({
      intentId: 'owner-b-queued',
      streamId: 'stream-b-queued',
      ownerId: 'card-2',
    })

    pipeline.cancelOwner('card-1', 'new-message')

    await vi.waitFor(() => {
      expect(startedIntentIds).toEqual([
        'owner-a-active',
        'owner-b-queued',
      ])
    })

    expect(playback.stopByOwner).toHaveBeenCalledWith('card-1', 'new-message')
  })

  it('prefetches segment tts concurrently while preserving playback order', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }

    let resolveFirstSegment: ((value: string) => void) | undefined
    let resolveSecondSegment: ((value: string) => void) | undefined
    const tts = vi.fn((request: { segmentId: string }) => {
      return new Promise<string>((resolve) => {
        if (request.segmentId === 'segment-1')
          resolveFirstSegment = resolve
        else
          resolveSecondSegment = resolve
      })
    })

    const pipeline = createSpeechPipeline<string>({
      tts,
      ttsConcurrency: 2,
      playback,
      segmenter: (_tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string }) => {
        return new ReadableStream<TextSegment>({
          start(controller) {
            controller.enqueue({
              streamId: meta.streamId,
              intentId: meta.intentId,
              segmentId: 'segment-1',
              text: 'hello there,',
              special: null,
              reason: 'boost',
              continuityHoldMs: 180,
              createdAt: 1,
            })
            controller.enqueue({
              streamId: meta.streamId,
              intentId: meta.intentId,
              segmentId: 'segment-2',
              text: 'general kenobi.',
              special: null,
              reason: 'hard',
              continuityHoldMs: 120,
              createdAt: 2,
            })
            controller.close()
          },
        })
      },
    })

    const intent = pipeline.openIntent({
      intentId: 'intent-prefetch',
      streamId: 'stream-prefetch',
    })
    intent.writeLiteral('ignored')
    intent.end()

    await vi.waitFor(() => {
      expect(tts).toHaveBeenCalledTimes(2)
    })

    resolveSecondSegment?.('audio-2')
    await Promise.resolve()
    expect(playback.schedule).not.toHaveBeenCalled()

    resolveFirstSegment?.('audio-1')

    await vi.waitFor(() => {
      expect(playback.schedule).toHaveBeenCalledTimes(2)
    })

    expect(playback.schedule.mock.calls.map(([item]) => item.segmentId)).toEqual([
      'segment-1',
      'segment-2',
    ])
    expect(playback.schedule.mock.calls.map(([item]) => item.continuityHoldMs)).toEqual([
      180,
      120,
    ])
  })

  it('emits a tts-skipped event when synthesis returns no audio for a queued segment', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }

    const pipeline = createSpeechPipeline<string>({
      tts: vi.fn(async () => null),
      playback,
      segmenter: (_tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string }) => {
        return new ReadableStream<TextSegment>({
          start(controller) {
            controller.enqueue({
              streamId: meta.streamId,
              intentId: meta.intentId,
              segmentId: 'segment-skip',
              text: 'preview me',
              special: null,
              reason: 'boost',
              continuityHoldMs: 180,
              createdAt: 1,
            })
            controller.close()
          },
        })
      },
    })

    const skippedEvents: Array<{ segmentId: string, reason: string }> = []
    pipeline.on('onTtsSkipped', (event) => {
      skippedEvents.push({
        segmentId: event.request.segmentId,
        reason: event.reason,
      })
    })

    const intent = pipeline.openIntent({
      intentId: 'intent-skip',
      streamId: 'stream-skip',
    })
    intent.writeLiteral('ignored')
    intent.end()

    await vi.waitFor(() => {
      expect(skippedEvents).toEqual([
        {
          segmentId: 'segment-skip',
          reason: 'empty-audio',
        },
      ])
    })

    expect(playback.schedule).not.toHaveBeenCalled()
  })

  it('propagates intent metadata through segmenting and playback scheduling', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }

    const segmenter = vi.fn((_tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string, metadata?: Record<string, unknown> | null }) => {
      return new ReadableStream<TextSegment>({
        start(controller) {
          controller.enqueue({
            streamId: meta.streamId,
            intentId: meta.intentId,
            segmentId: 'segment-metadata',
            text: 'metadata path',
            special: null,
            reason: 'boost',
            continuityHoldMs: 180,
            createdAt: 1,
          })
          controller.close()
        },
      })
    })

    const pipeline = createSpeechPipeline<string>({
      tts: vi.fn(async () => 'audio-metadata'),
      playback,
      segmenter,
    })

    const metadata = {
      digitalLifeSpine: {
        runtime: {
          activeThreadId: 'thread-alpha',
          watchMode: 'observing',
        },
      },
    }
    const intent = pipeline.openIntent({
      intentId: 'intent-metadata',
      streamId: 'stream-metadata',
      metadata,
    })
    intent.writeLiteral('ignored')
    intent.end()

    await vi.waitFor(() => {
      expect(playback.schedule).toHaveBeenCalledTimes(1)
    })

    expect(segmenter).toHaveBeenCalledWith(
      expect.any(ReadableStream),
      expect.objectContaining({
        streamId: 'stream-metadata',
        intentId: 'intent-metadata',
        metadata,
      }),
    )
    expect(playback.schedule.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      segmentId: 'segment-metadata',
      metadata,
    }))
  })

  it('preserves richer intent metadata when segment metadata only brings a thinner runtime shell', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }

    const segmenter = vi.fn((_tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string, metadata?: Record<string, unknown> | null }) => {
      return new ReadableStream<TextSegment>({
        start(controller) {
          controller.enqueue({
            streamId: meta.streamId,
            intentId: meta.intentId,
            segmentId: 'segment-thinner-runtime-shell',
            text: 'continuity state',
            special: null,
            reason: 'boost',
            continuityHoldMs: 180,
            createdAt: 1,
            metadata: {
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                summary: 'segment-thinner-shell',
              },
              speechSynthesis: {
                provider: 'segment-voice',
              },
            },
          })
          controller.close()
        },
      })
    })

    const ttsRequests: Array<Record<string, unknown> | null | undefined> = []
    const pipeline = createSpeechPipeline<string>({
      tts: vi.fn(async (request) => {
        ttsRequests.push(request.metadata ?? null)
        return 'audio-thinner-runtime-shell'
      }),
      playback,
      segmenter,
    })

    const metadata = {
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        projectState: {
          emotionalClosureCue: 'identity-continuity',
        },
        summary: 'intent-richer-authority',
      },
      preDialogueAwareness: {
        awarenessLine: 'pre_turn_context_digest',
      },
    }
    const intent = pipeline.openIntent({
      intentId: 'intent-thinner-runtime-shell',
      streamId: 'stream-thinner-runtime-shell',
      metadata,
    })
    intent.writeLiteral('ignored')
    intent.end()

    await vi.waitFor(() => {
      expect(playback.schedule).toHaveBeenCalledTimes(1)
    })

    expect(ttsRequests[0]).toEqual(expect.objectContaining({
      runtimeDigest: expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        summary: 'segment-thinner-shell',
        projectState: expect.objectContaining({
          emotionalClosureCue: 'identity-continuity',
        }),
      }),
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'pre_turn_context_digest',
      }),
      speechSynthesis: expect.objectContaining({
        provider: 'segment-voice',
      }),
    }))
    expect(playback.schedule.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      segmentId: 'segment-thinner-runtime-shell',
      metadata: expect.objectContaining({
        runtimeDigest: expect.objectContaining({
          projectState: expect.objectContaining({
            emotionalClosureCue: 'identity-continuity',
          }),
        }),
        preDialogueAwareness: expect.objectContaining({
          awarenessLine: 'pre_turn_context_digest',
        }),
      }),
    }))
  })

  it('emits merged segment metadata so synthetic speech preview keeps richer intent authority', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }

    const segmenter = vi.fn((_tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string, metadata?: Record<string, unknown> | null }) => {
      return new ReadableStream<TextSegment>({
        start(controller) {
          controller.enqueue({
            streamId: meta.streamId,
            intentId: meta.intentId,
            segmentId: 'segment-merged-on-segment',
            text: 'synthetic preview carry',
            special: null,
            reason: 'boost',
            continuityHoldMs: 180,
            createdAt: 1,
            metadata: {
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                summary: 'segment-thinner-shell',
              },
            },
          })
          controller.close()
        },
      })
    })

    const segmentPayloads: Array<Record<string, unknown> | null | undefined> = []
    const pipeline = createSpeechPipeline<string>({
      tts: vi.fn(async () => null),
      playback,
      segmenter,
    })

    pipeline.on('onSegment', (segment) => {
      segmentPayloads.push(segment.metadata ?? null)
    })

    const intent = pipeline.openIntent({
      intentId: 'intent-merged-on-segment',
      streamId: 'stream-merged-on-segment',
      metadata: {
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-memory',
          projectState: {
            emotionalClosureCue: 'identity-continuity',
          },
          summary: 'intent-richer-authority',
        },
        preDialogueAwareness: {
          awarenessLine: 'pre_turn_context_digest',
        },
      },
    })
    intent.writeLiteral('ignored')
    intent.end()

    await vi.waitFor(() => {
      expect(segmentPayloads).toHaveLength(1)
    })

    expect(segmentPayloads[0]).toEqual(expect.objectContaining({
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'active-memory',
        summary: 'segment-thinner-shell',
        projectState: expect.objectContaining({
          emotionalClosureCue: 'identity-continuity',
        }),
      }),
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'pre_turn_context_digest',
      }),
    }))
  })

  it('keeps richer runtime-digest carry when a thinner segment shell explicitly brings null project state and empty channels', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }

    const segmenter = vi.fn((_tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string, metadata?: Record<string, unknown> | null }) => {
      return new ReadableStream<TextSegment>({
        start(controller) {
          controller.enqueue({
            streamId: meta.streamId,
            intentId: meta.intentId,
            segmentId: 'segment-null-project-state-shell',
            text: 'continuity state',
            special: null,
            reason: 'boost',
            continuityHoldMs: 180,
            createdAt: 1,
            metadata: {
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                projectState: null,
                channels: [],
                summary: 'segment-null-shell',
              },
            },
          })
          controller.close()
        },
      })
    })

    const ttsRequests: Array<Record<string, unknown> | null | undefined> = []
    const pipeline = createSpeechPipeline<string>({
      tts: vi.fn(async (request) => {
        ttsRequests.push(request.metadata ?? null)
        return 'audio-null-project-state-shell'
      }),
      playback,
      segmenter,
    })

    const intent = pipeline.openIntent({
      intentId: 'intent-null-project-state-shell',
      streamId: 'stream-null-project-state-shell',
      metadata: {
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-memory',
          projectState: {
            emotionalClosureCue: 'identity-continuity',
          },
          channels: [{
            id: 'active-memory',
            readiness: 0.92,
            state: 'hot',
            summary: 'richer channel carry',
          }],
          summary: 'intent-richer-authority',
        },
        preDialogueAwareness: {
          awarenessLine: 'pre_turn_context_digest',
        },
      },
    })
    intent.writeLiteral('ignored')
    intent.end()

    await vi.waitFor(() => {
      expect(playback.schedule).toHaveBeenCalledTimes(1)
    })

    expect(ttsRequests[0]).toEqual(expect.objectContaining({
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'active-memory',
        summary: 'segment-null-shell',
        projectState: expect.objectContaining({
          emotionalClosureCue: 'identity-continuity',
        }),
        channels: expect.arrayContaining([
          expect.objectContaining({
            id: 'active-memory',
            summary: 'richer channel carry',
          }),
        ]),
      }),
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'pre_turn_context_digest',
      }),
    }))
  })

  it('emits merged metadata for empty special segments so richer intent authority survives non-tts markers', async () => {
    const playback = {
      schedule: vi.fn(),
      stopAll: vi.fn(),
      stopByIntent: vi.fn(),
      stopByOwner: vi.fn(),
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onInterrupt: vi.fn(),
      onReject: vi.fn(),
    }

    const segmenter = vi.fn((_tokens: ReadableStream<TextToken>, meta: { streamId: string, intentId: string, metadata?: Record<string, unknown> | null }) => {
      return new ReadableStream<TextSegment>({
        start(controller) {
          controller.enqueue({
            streamId: meta.streamId,
            intentId: meta.intentId,
            segmentId: 'segment-special-shell',
            text: '',
            special: 'rejoin-boundary',
            reason: 'special',
            continuityHoldMs: 0,
            createdAt: 1,
            metadata: {
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                summary: 'segment-special-shell',
              },
            },
          })
          controller.close()
        },
      })
    })

    const tts = vi.fn(async () => 'audio-should-not-run')
    const pipeline = createSpeechPipeline<string>({
      tts,
      playback,
      segmenter,
    })

    const segmentPayloads: Array<Record<string, unknown> | null | undefined> = []
    const specialPayloads: Array<Record<string, unknown> | null | undefined> = []
    pipeline.on('onSegment', (segment) => {
      segmentPayloads.push(segment.metadata ?? null)
    })
    pipeline.on('onSpecial', (segment) => {
      specialPayloads.push(segment.metadata ?? null)
    })

    const intent = pipeline.openIntent({
      intentId: 'intent-special-shell',
      streamId: 'stream-special-shell',
      metadata: {
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-memory',
          projectState: {
            emotionalClosureCue: 'identity-continuity',
          },
          summary: 'intent-richer-authority',
        },
        preDialogueAwareness: {
          awarenessLine: 'pre_turn_context_digest',
        },
      },
    })
    intent.writeLiteral('ignored')
    intent.end()

    await vi.waitFor(() => {
      expect(specialPayloads).toHaveLength(1)
    })

    expect(tts).not.toHaveBeenCalled()
    expect(playback.schedule).not.toHaveBeenCalled()
    expect(segmentPayloads[0]).toEqual(expect.objectContaining({
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'active-memory',
        summary: 'segment-special-shell',
        projectState: expect.objectContaining({
          emotionalClosureCue: 'identity-continuity',
        }),
      }),
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'pre_turn_context_digest',
      }),
    }))
    expect(specialPayloads[0]).toEqual(expect.objectContaining({
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'active-memory',
        summary: 'segment-special-shell',
        projectState: expect.objectContaining({
          emotionalClosureCue: 'identity-continuity',
        }),
      }),
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'pre_turn_context_digest',
      }),
    }))
  })
})
