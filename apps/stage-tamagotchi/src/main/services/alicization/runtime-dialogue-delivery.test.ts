import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AlicizationDialogueRespondedPayload } from '../../../shared/eventa'

import { createAlicizationRuntimeDialogueDelivery } from './runtime-dialogue-delivery'

function buildPayload(overrides: Partial<AlicizationDialogueRespondedPayload> = {}): AlicizationDialogueRespondedPayload {
  return {
    cardId: 'card-a',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'subconscious-proactive',
    structured: {
      format: 'mind-turn-v1',
      reply: 'hello',
    } as any,
    isFallback: false,
    createdAt: 100,
    ...overrides,
  }
}

function createHarness() {
  const activeCardId = 'card-a'
  let scopedCardId = activeCardId
  const metaByCard = new Map<string, Map<string, string>>([
    ['card-a', new Map()],
    ['card-b', new Map()],
  ])
  const delivered: AlicizationDialogueRespondedPayload[] = []
  const debugEvents: Array<{ event: string, payload?: Record<string, unknown> }> = []

  const normalizeCardId = (raw: unknown) => typeof raw === 'string' && raw.trim() ? raw.trim() : activeCardId
  const normalizeSessionId = (raw: unknown) => typeof raw === 'string' ? raw.trim() : ''
  const sanitizeText = (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback

  const ensureMetaStore = (cardId: string) => {
    let store = metaByCard.get(cardId)
    if (!store) {
      store = new Map<string, string>()
      metaByCard.set(cardId, store)
    }
    return store
  }

  const runtime = createAlicizationRuntimeDialogueDelivery({
    normalizeCardId,
    normalizeSessionId,
    sanitizeText,
    getActiveCardId: () => activeCardId,
    getActiveSessionIdForCard: cardId => cardId === 'card-b' ? 'session-b' : 'session-1',
    withCardScope: async (nextCardIdRaw, task) => {
      const previousCardId = scopedCardId
      scopedCardId = normalizeCardId(nextCardIdRaw)
      try {
        return await task()
      }
      finally {
        scopedCardId = previousCardId
      }
    },
    appendRuntimeDebugLine: async (event, payload) => {
      debugEvents.push({ event, payload })
    },
    deliverDialogueResponded: (payload) => {
      delivered.push(payload)
    },
    alicizationDb: {
      getMetaValue: async key => ensureMetaStore(scopedCardId).get(key),
      setMetaValue: async (key, value) => {
        ensureMetaStore(scopedCardId).set(key, value)
      },
    },
    dialogueAckStateMetaKey: 'dialogue-ack',
    dialogueReplyFeedbackAckMetaKey: 'dialogue-reply-feedback-ack',
    dialogueDeliveryRetryBaseMs: 2_000,
    dialogueDeliveryRetryMaxMs: 60_000,
    dialogueDeliveryRetryMaxAttempts: 8,
  })

  return {
    runtime,
    metaByCard,
    delivered,
    debugEvents,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('runtime dialogue delivery', () => {
  it('restores and persists dialogue reply feedback ack across card scopes', async () => {
    const harness = createHarness()
    harness.metaByCard.get('card-b')?.set('dialogue-reply-feedback-ack', 'session-b::turn-9')

    const restored = await harness.runtime.ensureDialogueReplyFeedbackAck('card-b')
    expect(restored).toBe('session-b::turn-9')

    await harness.runtime.persistDialogueReplyFeedbackAck('card-b', 'session-b::turn-10')
    expect(harness.metaByCard.get('card-b')?.get('dialogue-reply-feedback-ack')).toBe('session-b::turn-10')
  })

  it('retries proactive dialogue delivery until it is acknowledged', async () => {
    vi.useFakeTimers()
    const harness = createHarness()
    const payload = buildPayload()

    harness.runtime.emitDialogueRespondedWithDelivery(payload)
    expect(harness.delivered).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(2_000)
    expect(harness.delivered).toHaveLength(2)
    expect(harness.debugEvents.some(event => event.event === 'dialogue-responded.retry')).toBe(true)

    await harness.runtime.ackDialogueDelivery(payload)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(harness.delivered).toHaveLength(2)
  })

  it('persists ack cursor when a dialogue delivery is acknowledged', async () => {
    const harness = createHarness()
    const payload = buildPayload({
      turnId: 'turn-2',
      createdAt: 240,
    })

    await harness.runtime.ackDialogueDelivery(payload)

    expect(harness.runtime.getDialogueAckCursor('card-a', 'session-1')).toBe(240)
    expect(harness.metaByCard.get('card-a')?.get('dialogue-ack')).toBe(JSON.stringify({
      'session-1': 240,
    }))
  })
})
