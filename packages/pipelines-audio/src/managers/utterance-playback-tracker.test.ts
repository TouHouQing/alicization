import { describe, expect, it, vi } from 'vitest'

import { createUtterancePlaybackTracker } from './utterance-playback-tracker'

describe('complete utterance proof', () => {
  it('requires all planned segments and generation seal before a completion', () => {
    const emit = vi.fn()
    const tracker = createUtterancePlaybackTracker(emit)
    tracker.plan('intent', 'stream', 'one', null)
    tracker.plan('intent', 'stream', 'two', null)
    tracker.scheduled('intent', 'one')
    tracker.scheduled('intent', 'two')
    tracker.observe('intent', 'one', { status: 'completed', playedMs: 500, errorCode: null })
    tracker.seal('intent', 'stream', null)
    expect(emit).not.toHaveBeenCalled()
    tracker.observe('intent', 'two', { status: 'completed', playedMs: 700, errorCode: null })
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ segmentCount: 2, completedSegments: 2, result: { status: 'completed', playedMs: 1200, errorCode: null } }))
    tracker.observe('intent', 'two', { status: 'completed', playedMs: 700, errorCode: null })
    expect(emit).toHaveBeenCalledOnce()
  })
  it('waits for actual partial playback after cancellation and classifies missing TTS as failed', () => {
    const emit = vi.fn()
    const tracker = createUtterancePlaybackTracker(emit)
    tracker.plan('cancelled', 'stream', 'active', null)
    tracker.plan('cancelled', 'stream', 'tts-pending', null)
    tracker.scheduled('cancelled', 'active')
    tracker.seal('cancelled', 'stream', null, 'interrupted')
    expect(emit).not.toHaveBeenCalled()
    tracker.observe('cancelled', 'active', { status: 'interrupted', playedMs: 240, errorCode: 'user-interruption' })
    expect(emit.mock.calls[0][0].result).toMatchObject({ status: 'interrupted', playedMs: 240 })
    tracker.plan('failed', 'stream', 'tts-empty', null)
    tracker.observe('failed', 'tts-empty', { status: 'failed', playedMs: 0, errorCode: 'tts-error' })
    tracker.seal('failed', 'stream', null)
    expect(emit.mock.calls[1][0].result.status).toBe('failed')
  })
})
