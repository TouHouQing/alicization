import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAlicizationChatStreamLifecycle } from './alicization-chat-stream-bridge'
import {
  createAlicizationChatStreamIngressDeduplicator,
  isAlicizationChatStreamAttemptForLogicalTurn,
  resolveAlicizationLogicalChatStreamTurnId,
  scheduleAlicizationLateToolEventDisposal,
} from './alicization-chat-stream-routing'

describe('alicization chat stream routing', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('treats gateway retry attempts as one logical turn', () => {
    expect(isAlicizationChatStreamAttemptForLogicalTurn('turn-1', 'turn-1')).toBe(true)
    expect(isAlicizationChatStreamAttemptForLogicalTurn('turn-1', 'turn-1:gw1')).toBe(true)
    expect(isAlicizationChatStreamAttemptForLogicalTurn('turn-1', 'turn-1:gw2')).toBe(true)
    expect(isAlicizationChatStreamAttemptForLogicalTurn('turn-1', 'turn-10:gw1')).toBe(false)
  })

  it('resolves retry events to the sole pending logical stream', () => {
    expect(resolveAlicizationLogicalChatStreamTurnId(
      ['turn-1'],
      'turn-1:gw2',
    )).toBe('turn-1')
  })

  it('does not guess when two logical turns share an ambiguous transport id', () => {
    expect(resolveAlicizationLogicalChatStreamTurnId(
      ['turn-1', 'turn-1:gw2'],
      'turn-1:gw2',
    )).toBeNull()
  })

  it('deduplicates the same stream payload across dispatch and Eventa fallback ingress', () => {
    let now = 1_000
    const deduplicator = createAlicizationChatStreamIngressDeduplicator({
      getNow: () => now,
      windowMs: 250,
    })
    const payload = {
      cardId: 'default',
      turnId: 'turn-1',
      toolCallId: 'codex-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      elapsedMs: 120,
      eventId: 'tool-progress-1',
    } as any

    expect(deduplicator.accept('dispatch', 'tool-progress', payload)).toBe(true)
    expect(deduplicator.accept('eventa', 'tool-progress', { ...payload })).toBe(false)

    now += 300
    expect(deduplicator.accept('eventa', 'tool-progress', { ...payload })).toBe(true)
  })

  it('keeps the pending stream addressable until the late-tool grace period expires', () => {
    vi.useFakeTimers()
    const onDispose = vi.fn()
    const handle = scheduleAlicizationLateToolEventDisposal({
      delayMs: 5_000,
      onDispose,
    })

    vi.advanceTimersByTime(4_999)
    expect(onDispose).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onDispose).toHaveBeenCalledOnce()

    handle.cancel()
    expect(onDispose).toHaveBeenCalledOnce()
  })

  it('cancels pending stream disposal when the stream is retired early', () => {
    vi.useFakeTimers()
    const onDispose = vi.fn()
    const handle = scheduleAlicizationLateToolEventDisposal({
      delayMs: 5_000,
      onDispose,
    })

    handle.cancel()
    vi.advanceTimersByTime(5_000)

    expect(onDispose).not.toHaveBeenCalled()
  })

  it('scopes eventId deduplication by card, turn, tool call, and executor thread identity', () => {
    const deduplicator = createAlicizationChatStreamIngressDeduplicator({
      getNow: () => 1_000,
    })
    const payload = {
      cardId: 'card-a',
      turnId: 'turn-a',
      toolCallId: 'tool-a',
      toolName: 'executor_run_codex',
      phase: 'running',
      elapsedMs: 120,
      eventId: 'shared-event-id',
      threadId: 'thread-a',
    } as any

    expect(deduplicator.accept('dispatch', 'tool-progress', payload)).toBe(true)
    expect(deduplicator.accept('eventa', 'tool-progress', { ...payload })).toBe(false)

    for (const identity of [
      { cardId: 'card-b' },
      { turnId: 'turn-b' },
      { toolCallId: 'tool-b' },
      { threadId: 'thread-b' },
    ]) {
      const scopedPayload = {
        ...payload,
        ...identity,
      }
      expect(deduplicator.accept('dispatch', 'tool-progress', scopedPayload)).toBe(true)
      expect(deduplicator.accept('eventa', 'tool-progress', { ...scopedPayload })).toBe(false)
    }
  })

  it('does not suppress identity-less tool progress across ingress sources', () => {
    const deduplicator = createAlicizationChatStreamIngressDeduplicator({
      getNow: () => 1_000,
    })
    const payload = {
      cardId: 'default',
      turnId: 'turn-1',
      toolCallId: 'codex-2',
      toolName: 'executor_run_codex',
      phase: 'running',
      elapsedMs: 120,
    } as any

    expect(deduplicator.accept('dispatch', 'tool-progress', payload)).toBe(true)
    expect(deduplicator.accept('eventa', 'tool-progress', { ...payload })).toBe(true)
  })

  it('does not suppress two same-source chunks with identical text', () => {
    const deduplicator = createAlicizationChatStreamIngressDeduplicator({
      getNow: () => 1_000,
    })
    const payload = {
      cardId: 'default',
      turnId: 'turn-1',
      text: 'same text',
    } as any

    expect(deduplicator.accept('dispatch', 'chunk', payload)).toBe(true)
    expect(deduplicator.accept('dispatch', 'chunk', payload)).toBe(true)
  })

  it('pins desktop pending streams to their original card and retires them before a card switch can accept late completion', () => {
    const appSource = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

    expect(appSource).toContain('cardId: string')
    expect(appSource).toContain('sessionId: string')
    expect(appSource).toContain('.filter(pending => pending.cardId === cardId)')
    expect(appSource).toContain('resolveAlicizationConversationCardId(payload.sessionId)')
    expect(appSource).toContain('alicizationConversationCardIdsBySession.set(sessionId, scope.cardId)')
    expect(appSource).toMatch(/retirePendingAlicizationStreamsForCard\(\s*previousCardId,/)
    expect(appSource).toContain('pending.lifecycle.rejectAfter([], settlementError)')
    expect(appSource).toContain('await pending.lifecycle.waitForIdle()')
    expect(appSource).toContain('pending.dispose()')
    expect(appSource).toMatch(/if \(options\.abortSignal\?\.aborted\) \{\s*try \{\s*await requestAbort\('renderer-abort'\)\s*\}\s*catch \(abortError\) \{\s*lifecycle\.rejectAfter\(\[\], abortError\)/)
    expect(appSource).not.toMatch(/\b(?:previousPending|pending)\.reject\(/)
  })

  it('retains a resolved pending stream for a bounded late terminal-tool grace period', () => {
    const appSource = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

    expect(appSource).toContain('const alicizationLateToolEventGraceMs =')
    expect(appSource).toContain('schedulePendingAlicizationStreamDisposal')
    expect(appSource).toContain('scheduleAlicizationLateToolEventDisposal')
    expect(appSource).toContain('resolve: resolveAndScheduleDispose')
    expect(appSource).toMatch(/const resolveAndScheduleDispose = \(\) => \{\s*schedulePendingAlicizationStreamDisposal\(\)\s*resolve\(\)\s*\}/)
    expect(appSource).toContain('lateToolEventCleanupTimer?.cancel()')
    expect(appSource).toContain('lateToolEventCleanupTimer.cancel()')
  })

  it('retires every pending desktop stream through the lifecycle queue during unmount', () => {
    const appSource = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

    expect(appSource).toContain('retireAllPendingAlicizationStreams(')
    expect(appSource).not.toContain('pendingAlicizationChatStreams.delete(key)\n    pending.reject(')
  })

  it('isolates a late completion from the old card after a card switch', async () => {
    const observedByCard = new Map<string, string[]>()
    const pending = new Map<string, ReturnType<typeof createAlicizationChatStreamLifecycle>>()
    const createLifecycle = (cardId: string, turnId: string) => {
      const lifecycle = createAlicizationChatStreamLifecycle({
        onStreamEvent: (event) => {
          observedByCard.set(cardId, [
            ...(observedByCard.get(cardId) ?? []),
            event.type,
          ])
        },
        resolve: () => {},
        reject: () => {},
      })
      pending.set(`${cardId}:${turnId}`, lifecycle)
      return lifecycle
    }
    const dispatch = (cardId: string, turnId: string, event: AlicizationBridgeChatStreamEvent) => {
      pending.get(`${cardId}:${turnId}`)?.publish(event)
    }

    const oldLifecycle = createLifecycle('card-a', 'turn-1')
    dispatch('card-a', 'turn-1', {
      type: 'text-delta',
      text: 'old-card',
    })

    pending.delete('card-a:turn-1')
    oldLifecycle.rejectAfter([], new Error('card switched'))
    await oldLifecycle.waitForIdle()

    const newLifecycle = createLifecycle('card-b', 'turn-1')
    dispatch('card-a', 'turn-1', {
      type: 'finish',
      fullText: 'late old completion',
      finishReason: 'stop',
    })
    dispatch('card-b', 'turn-1', {
      type: 'finish',
      fullText: 'new card completion',
      finishReason: 'stop',
    })
    newLifecycle.resolveAfter([])
    await newLifecycle.waitForIdle()

    expect(observedByCard.get('card-a')).toEqual(['text-delta'])
    expect(observedByCard.get('card-b')).toEqual(['finish'])
  })
})
