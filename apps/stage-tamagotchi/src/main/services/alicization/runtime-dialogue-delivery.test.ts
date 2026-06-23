import type { AlicizationDialogueRespondedPayload } from '../../../shared/eventa'

import { afterEach, describe, expect, it, vi } from 'vitest'

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

  it('keeps pending proactive delivery snapshot when origin is missing but autonomous family markers still survive on the payload', () => {
    const harness = createHarness()
    const payload = buildPayload({
      origin: 'user-turn',
      turnId: 'execution-callback:default:thread-originless:123',
      structured: {
        format: 'subconscious-proactive-v1',
        reply: 'callback runtime ok',
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 100,
          summary: 'pending proactive affective residue',
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 100,
            residues: [{
              kind: 'afterglow',
              weight: 0.74,
              summary: 'The proactive coding callback should reopen on the same living line.',
            }],
            dominantResidueKind: 'afterglow',
            afterglowPressure: 0.74,
            repairPressure: 0.18,
            burdenPressure: 0.1,
            trustPressure: 0.58,
            restProtectivePressure: 0.08,
            relationshipCadence: {
              cadenceMode: 'measured-return',
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              overreachRisk: 0.12,
              fatigueGuard: 0.1,
              summary: 'Let the proactive reopen stay measured and same-line.',
            },
            sourceSignals: ['proactive-coding-window'],
            summary: 'A measured return still belongs to the same living line.',
          },
        },
        proactive: {
          scenario: 'coding',
          feedbackWindowMs: 120_000,
          reasonCodes: ['learning:verify', 'learning-focus:callback-carry'],
        },
      } as any,
    })

    harness.runtime.emitDialogueRespondedWithDelivery(payload)

    expect(harness.runtime.peekLatestPendingProactiveDelivery('card-a')).toEqual(expect.objectContaining({
      cardId: 'card-a',
      sessionId: 'session-1',
      turnId: 'execution-callback:default:thread-originless:123',
      scenario: 'coding',
      feedbackWindowMs: 120_000,
      learningAction: 'verify',
      learningFocuses: ['callback-carry'],
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
        }),
      }),
    }))
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
