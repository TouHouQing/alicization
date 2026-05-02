import type { AlicizationDialogueRespondedPayload } from '../../../shared/eventa'
import type { PendingDialogueDeliveryState } from './runtime-soul'

interface CreateAlicizationRuntimeDialogueDeliveryOptions {
  normalizeCardId: (raw: unknown) => string
  normalizeSessionId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  getActiveCardId: () => string
  getActiveSessionIdForCard: (cardId: string) => string
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  deliverDialogueResponded: (payload: AlicizationDialogueRespondedPayload) => void
  alicizationDb: {
    getMetaValue: (key: string) => Promise<string | undefined>
    setMetaValue: (key: string, value: string) => Promise<void>
  }
  dialogueAckStateMetaKey: string
  dialogueReplyFeedbackAckMetaKey: string
  dialogueDeliveryRetryBaseMs: number
  dialogueDeliveryRetryMaxMs: number
  dialogueDeliveryRetryMaxAttempts: number
}

export function normalizeDialogueAckObject(
  raw: unknown,
  normalizeSessionId: (raw: unknown) => string,
) {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const entries = Object.entries(source)
    .map(([sessionId, cursorRaw]) => {
      const normalizedSessionId = normalizeSessionId(sessionId)
      const cursor = Number(cursorRaw)
      if (!normalizedSessionId || !Number.isFinite(cursor))
        return null
      return [normalizedSessionId, Math.max(0, Math.floor(cursor))] as const
    })
    .filter((entry): entry is readonly [string, number] => Boolean(entry))
  return new Map<string, number>(entries)
}

export function createPendingDialogueDeliveryKey(input: Pick<AlicizationDialogueRespondedPayload, 'cardId' | 'sessionId' | 'turnId'>, options: {
  normalizeCardId: (raw: unknown) => string
  normalizeSessionId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
}) {
  return `${options.normalizeCardId(input.cardId)}::${options.normalizeSessionId(input.sessionId)}::${options.sanitizeText(input.turnId)}`
}

export function createAlicizationRuntimeDialogueDelivery(
  options: CreateAlicizationRuntimeDialogueDeliveryOptions,
) {
  const dialogueAckByCard = new Map<string, Map<string, number>>()
  const dialogueReplyFeedbackAckByCard = new Map<string, string>()
  const pendingDialogueDeliveries = new Map<string, PendingDialogueDeliveryState>()

  function getDialogueAckMap(cardIdRaw: unknown) {
    const cardId = options.normalizeCardId(cardIdRaw)
    let map = dialogueAckByCard.get(cardId)
    if (!map) {
      map = new Map<string, number>()
      dialogueAckByCard.set(cardId, map)
    }
    return map
  }

  function getDialogueAckCursor(cardIdRaw: unknown, sessionIdRaw: unknown) {
    const sessionId = options.normalizeSessionId(sessionIdRaw)
    if (!sessionId)
      return 0
    const map = getDialogueAckMap(cardIdRaw)
    const cursor = map.get(sessionId)
    return typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : 0
  }

  async function persistDialogueAckMap(cardIdRaw: unknown) {
    const cardId = options.normalizeCardId(cardIdRaw)
    const payload = Object.fromEntries(getDialogueAckMap(cardId).entries())
    if (cardId === options.getActiveCardId()) {
      await options.alicizationDb.setMetaValue(options.dialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
      return
    }
    await options.withCardScope(cardId, async () => {
      await options.alicizationDb.setMetaValue(options.dialogueAckStateMetaKey, JSON.stringify(payload)).catch(() => {})
    }, {
      label: `dialogue-ack.persist:${cardId}`,
    })
  }

  async function restoreDialogueAckMap(cardIdRaw: unknown) {
    const cardId = options.normalizeCardId(cardIdRaw)
    const setMap = (map: Map<string, number>) => {
      dialogueAckByCard.set(cardId, map)
      return map
    }

    if (cardId !== options.getActiveCardId()) {
      await options.withCardScope(cardId, async () => {
        const raw = await options.alicizationDb.getMetaValue(options.dialogueAckStateMetaKey).catch(() => undefined)
        if (!raw) {
          setMap(new Map())
          return
        }
        try {
          setMap(normalizeDialogueAckObject(JSON.parse(raw), options.normalizeSessionId))
        }
        catch {
          setMap(new Map())
        }
      }, {
        label: `dialogue-ack.restore:${cardId}`,
      })
      return getDialogueAckMap(cardId)
    }

    const raw = await options.alicizationDb.getMetaValue(options.dialogueAckStateMetaKey).catch(() => undefined)
    if (!raw)
      return setMap(new Map())
    try {
      return setMap(normalizeDialogueAckObject(JSON.parse(raw), options.normalizeSessionId))
    }
    catch {
      return setMap(new Map())
    }
  }

  async function ensureDialogueReplyFeedbackAck(cardIdRaw: unknown) {
    const cardId = options.normalizeCardId(cardIdRaw)
    const existing = dialogueReplyFeedbackAckByCard.get(cardId)
    if (typeof existing === 'string')
      return existing

    const apply = (raw: unknown) => {
      const normalized = options.sanitizeText(raw, '')
      dialogueReplyFeedbackAckByCard.set(cardId, normalized)
      return normalized
    }

    if (cardId !== options.getActiveCardId()) {
      return await options.withCardScope(cardId, async () => {
        return apply(await options.alicizationDb.getMetaValue(options.dialogueReplyFeedbackAckMetaKey).catch(() => undefined))
      }, {
        label: `dialogue-reply-feedback-ack.restore:${cardId}`,
      })
    }

    return apply(await options.alicizationDb.getMetaValue(options.dialogueReplyFeedbackAckMetaKey).catch(() => undefined))
  }

  async function persistDialogueReplyFeedbackAck(cardIdRaw: unknown, ack: string) {
    const cardId = options.normalizeCardId(cardIdRaw)
    dialogueReplyFeedbackAckByCard.set(cardId, ack)
    if (cardId === options.getActiveCardId()) {
      await options.alicizationDb.setMetaValue(options.dialogueReplyFeedbackAckMetaKey, ack).catch(() => {})
      return
    }
    await options.withCardScope(cardId, async () => {
      await options.alicizationDb.setMetaValue(options.dialogueReplyFeedbackAckMetaKey, ack).catch(() => {})
    }, {
      label: `dialogue-reply-feedback-ack.persist:${cardId}`,
    })
  }

  function clearPendingDialogueDelivery(entryOrKey: PendingDialogueDeliveryState | string) {
    const key = typeof entryOrKey === 'string' ? entryOrKey : entryOrKey.key
    const pending = typeof entryOrKey === 'string' ? pendingDialogueDeliveries.get(entryOrKey) : entryOrKey
    if (pending?.timer) {
      clearTimeout(pending.timer)
      pending.timer = undefined
    }
    pendingDialogueDeliveries.delete(key)
  }

  function clearPendingDialogueDeliveriesByCard(cardIdRaw: unknown) {
    const normalizedCardId = options.normalizeCardId(cardIdRaw)
    for (const pending of pendingDialogueDeliveries.values()) {
      if (options.normalizeCardId(pending.payload.cardId) !== normalizedCardId)
        continue
      clearPendingDialogueDelivery(pending)
    }
  }

  function clearAllPendingDialogueDeliveries() {
    for (const pending of pendingDialogueDeliveries.values()) {
      clearPendingDialogueDelivery(pending)
    }
    pendingDialogueDeliveries.clear()
  }

  function shouldSkipPendingDialogueRetry(payload: AlicizationDialogueRespondedPayload) {
    const currentCursor = getDialogueAckCursor(payload.cardId, payload.sessionId)
    return payload.createdAt <= currentCursor
  }

  function schedulePendingDialogueRetry(entry: PendingDialogueDeliveryState, reason: string) {
    clearPendingDialogueDelivery(entry)

    if (shouldSkipPendingDialogueRetry(entry.payload))
      return
    if (entry.attempts >= options.dialogueDeliveryRetryMaxAttempts)
      return

    const delayMs = Math.min(
      options.dialogueDeliveryRetryMaxMs,
      options.dialogueDeliveryRetryBaseMs * 2 ** Math.max(0, entry.attempts),
    )

    entry.timer = setTimeout(() => {
      const current = pendingDialogueDeliveries.get(entry.key)
      if (!current)
        return
      if (shouldSkipPendingDialogueRetry(current.payload)) {
        clearPendingDialogueDelivery(current)
        return
      }

      options.deliverDialogueResponded(current.payload)
      current.attempts += 1
      void options.appendRuntimeDebugLine('dialogue-responded.retry', {
        cardId: current.payload.cardId,
        sessionId: current.payload.sessionId,
        turnId: current.payload.turnId,
        attempts: current.attempts,
        reason,
      })
      schedulePendingDialogueRetry(current, 'unacked-retry')
    }, delayMs)

    pendingDialogueDeliveries.set(entry.key, entry)
  }

  function emitDialogueRespondedWithDelivery(payload: AlicizationDialogueRespondedPayload) {
    options.deliverDialogueResponded(payload)

    if (payload.origin !== 'subconscious-proactive')
      return

    const key = createPendingDialogueDeliveryKey(payload, options)
    const existing = pendingDialogueDeliveries.get(key)
    const next: PendingDialogueDeliveryState = existing
      ? {
          ...existing,
          payload,
        }
      : {
          key,
          payload,
          attempts: 0,
        }
    void options.appendRuntimeDebugLine('dialogue-delivery.pending-registered', {
      cardId: payload.cardId,
      sessionId: payload.sessionId,
      turnId: payload.turnId,
      createdAt: payload.createdAt,
      hasExisting: Boolean(existing),
      currentActiveSession: options.normalizeSessionId(options.getActiveSessionIdForCard(options.normalizeCardId(payload.cardId))),
    })
    schedulePendingDialogueRetry(next, 'initial-delivery')
  }

  async function ackDialogueDelivery(input: {
    cardId: unknown
    sessionId: unknown
    turnId: unknown
    createdAt: unknown
  }) {
    const cardId = options.normalizeCardId(input.cardId)
    const sessionId = options.normalizeSessionId(input.sessionId)
    const turnId = options.sanitizeText(input.turnId)
    const createdAt = Number.isFinite(Number(input.createdAt))
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : 0
    if (!sessionId || !turnId || createdAt <= 0)
      return

    const ackMap = getDialogueAckMap(cardId)
    const previousCursor = getDialogueAckCursor(cardId, sessionId)
    const nextCursor = Math.max(previousCursor, createdAt)
    await options.appendRuntimeDebugLine('dialogue-ack.received', {
      cardId,
      sessionId,
      turnId,
      createdAt,
      previousCursor,
      nextCursor,
    })
    if (nextCursor !== previousCursor) {
      ackMap.set(sessionId, nextCursor)
      await persistDialogueAckMap(cardId)
    }

    let cleared = 0
    for (const entry of pendingDialogueDeliveries.values()) {
      if (options.normalizeCardId(entry.payload.cardId) !== cardId)
        continue
      if (options.normalizeSessionId(entry.payload.sessionId) !== sessionId)
        continue
      if (entry.payload.createdAt <= nextCursor) {
        clearPendingDialogueDelivery(entry)
        cleared += 1
      }
    }
    await options.appendRuntimeDebugLine('dialogue-delivery.acked-cleared', {
      cardId,
      sessionId,
      turnId,
      ackCursor: nextCursor,
      cleared,
      remainingPending: pendingDialogueDeliveries.size,
    })
  }

  function clearCardState(cardIdRaw: unknown) {
    const cardId = options.normalizeCardId(cardIdRaw)
    dialogueAckByCard.delete(cardId)
    dialogueReplyFeedbackAckByCard.delete(cardId)
    clearPendingDialogueDeliveriesByCard(cardId)
  }

  function clearAllState() {
    clearAllPendingDialogueDeliveries()
    dialogueAckByCard.clear()
    dialogueReplyFeedbackAckByCard.clear()
  }

  return {
    getDialogueAckCursor,
    persistDialogueAckMap,
    restoreDialogueAckMap,
    ensureDialogueReplyFeedbackAck,
    persistDialogueReplyFeedbackAck,
    emitDialogueRespondedWithDelivery,
    ackDialogueDelivery,
    clearPendingDialogueDelivery,
    clearPendingDialogueDeliveriesByCard,
    clearAllPendingDialogueDeliveries,
    clearCardState,
    clearAllState,
  }
}

export type AlicizationRuntimeDialogueDelivery = ReturnType<typeof createAlicizationRuntimeDialogueDelivery>
