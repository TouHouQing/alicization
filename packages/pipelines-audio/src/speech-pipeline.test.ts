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
})
