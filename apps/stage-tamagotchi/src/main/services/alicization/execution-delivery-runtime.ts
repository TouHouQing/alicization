import type { AlicizationTaskThreadStatus } from '../../../shared/eventa'

import {
  alicizationTerminalTaskThreadStatuses,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'

export interface AlicizationPendingExecutionDelivery {
  key: string
  cardId: string
  sessionId: string
  threadId: string
  decisionTraceId: string | null
  turnId: string | null
  channel: string
  status: AlicizationTaskThreadStatus
  goal: string
  summary: string
  outcome: string
  signature: string
  queuedAt: number
  completedAt: number
}

export interface AlicizationExecutionDeliveryStateSnapshot {
  version: 1
  pending: AlicizationPendingExecutionDelivery[]
  delivered: Array<{
    key: string
    deliveredAt: number
  }>
}

interface AlicizationExecutionDeliveryRuntimeOptions {
  getNow?: () => number
  maxAgeMs?: number
  maxPendingPerSession?: number
}

const defaultExecutionDeliveryMaxAgeMs = 30 * 60_000
const defaultExecutionDeliveryMaxPendingPerSession = 6

function sanitizeCardId(raw: unknown) {
  return sanitizeExecutionLedgerText(raw, 120)
}

function sanitizeSessionId(raw: unknown) {
  return sanitizeExecutionLedgerText(raw, 160)
}

function sanitizeThreadId(raw: unknown) {
  return sanitizeExecutionLedgerText(raw, 180)
}

function sanitizeSignature(raw: unknown, fallback: string) {
  return sanitizeExecutionLedgerText(raw, 220) || fallback
}

function buildExecutionDeliveryKey(input: {
  cardId: string
  sessionId: string
  threadId: string
  completedAt: number
  status: AlicizationTaskThreadStatus
}) {
  return [
    input.cardId,
    input.sessionId,
    input.threadId,
    input.completedAt,
    input.status,
  ].join('::')
}

function buildExecutionDeliveryKeyPrefix(cardId: string, sessionId?: string) {
  if (!sessionId)
    return `${cardId}::`
  return `${cardId}::${sessionId}::`
}

export function createAlicizationExecutionDeliveryRuntime(
  options: AlicizationExecutionDeliveryRuntimeOptions = {},
) {
  const getNow = options.getNow ?? Date.now
  const maxAgeMs = Math.max(1_000, Math.floor(options.maxAgeMs ?? defaultExecutionDeliveryMaxAgeMs))
  const maxPendingPerSession = Math.max(1, Math.floor(
    options.maxPendingPerSession ?? defaultExecutionDeliveryMaxPendingPerSession,
  ))
  const pendingByCard = new Map<string, AlicizationPendingExecutionDelivery[]>()
  const deliveredAtByKey = new Map<string, number>()

  function prune(now = getNow()) {
    for (const [cardId, queue] of pendingByCard.entries()) {
      const nextQueue = queue.filter(entry => now - entry.completedAt <= maxAgeMs)
      if (nextQueue.length > 0)
        pendingByCard.set(cardId, nextQueue)
      else
        pendingByCard.delete(cardId)
    }

    for (const [key, deliveredAt] of deliveredAtByKey.entries()) {
      if (now - deliveredAt > maxAgeMs)
        deliveredAtByKey.delete(key)
    }
  }

  function enqueue(input: {
    cardId: string
    sessionId: string
    threadId: string
    decisionTraceId?: string | null
    turnId?: string | null
    channel?: string | null
    status: AlicizationTaskThreadStatus
    goal?: string | null
    summary?: string | null
    outcome?: string | null
    signature?: string | null
    queuedAt?: number
    completedAt: number
  }) {
    prune()

    const cardId = sanitizeCardId(input.cardId)
    const sessionId = sanitizeSessionId(input.sessionId)
    const threadId = sanitizeThreadId(input.threadId)
    const completedAt = Number.isFinite(input.completedAt)
      ? Math.max(0, Math.floor(Number(input.completedAt)))
      : 0

    if (!cardId || !sessionId || !threadId || completedAt <= 0)
      return null
    if (!alicizationTerminalTaskThreadStatuses.has(input.status))
      return null

    const key = buildExecutionDeliveryKey({
      cardId,
      sessionId,
      threadId,
      completedAt,
      status: input.status,
    })
    if (deliveredAtByKey.has(key))
      return null

    const queue = [...(pendingByCard.get(cardId) ?? [])]
    if (queue.some(entry => entry.key === key))
      return null

    const entry: AlicizationPendingExecutionDelivery = {
      key,
      cardId,
      sessionId,
      threadId,
      decisionTraceId: sanitizeExecutionLedgerText(input.decisionTraceId, 220) || null,
      turnId: sanitizeExecutionLedgerText(input.turnId, 220) || null,
      channel: sanitizeExecutionLedgerText(input.channel, 48) || 'executor',
      status: input.status,
      goal: sanitizeExecutionLedgerText(input.goal, 180) || 'the current task',
      summary: sanitizeExecutionLedgerText(input.summary, 220),
      outcome: sanitizeExecutionLedgerText(input.outcome, 240),
      signature: sanitizeSignature(input.signature, `${threadId}:${completedAt}`),
      queuedAt: Number.isFinite(input.queuedAt)
        ? Math.max(completedAt, Math.floor(Number(input.queuedAt)))
        : getNow(),
      completedAt,
    }

    queue.push(entry)
    queue.sort((left, right) => left.completedAt - right.completedAt)

    const sessionEntries = queue
      .filter(item => item.sessionId === sessionId)
      .sort((left, right) => left.completedAt - right.completedAt)
    const overflowKeys = new Set(
      sessionEntries
        .slice(0, Math.max(0, sessionEntries.length - maxPendingPerSession))
        .map(item => item.key),
    )
    const trimmedQueue = overflowKeys.size > 0
      ? queue.filter(item => !overflowKeys.has(item.key))
      : queue

    pendingByCard.set(cardId, trimmedQueue)
    return entry
  }

  function takeNext(input: {
    cardId: string
    sessionId?: string | null
  }) {
    prune()

    const cardId = sanitizeCardId(input.cardId)
    if (!cardId)
      return null

    const queue = [...(pendingByCard.get(cardId) ?? [])]
    if (queue.length === 0)
      return null

    const sessionId = sanitizeSessionId(input.sessionId)
    const targetIndex = sessionId
      ? queue.findIndex(entry => entry.sessionId === sessionId)
      : 0
    if (targetIndex < 0)
      return null

    const [entry] = queue.splice(targetIndex, 1)
    if (!entry)
      return null

    if (queue.length > 0)
      pendingByCard.set(cardId, queue)
    else
      pendingByCard.delete(cardId)

    return entry
  }

  function requeue(entry: AlicizationPendingExecutionDelivery) {
    prune()

    const cardId = sanitizeCardId(entry.cardId)
    if (!cardId || deliveredAtByKey.has(entry.key))
      return false

    const queue = [...(pendingByCard.get(cardId) ?? [])]
    if (queue.some(item => item.key === entry.key))
      return false

    queue.unshift(entry)
    queue.sort((left, right) => left.completedAt - right.completedAt)
    pendingByCard.set(cardId, queue)
    return true
  }

  function markDelivered(entry: Pick<AlicizationPendingExecutionDelivery, 'key'>) {
    const key = sanitizeExecutionLedgerText(entry.key, 320)
    if (!key)
      return
    deliveredAtByKey.set(key, getNow())
  }

  function snapshot(cardIdRaw?: string | null, sessionIdRaw?: string | null): AlicizationExecutionDeliveryStateSnapshot {
    prune()

    const cardId = sanitizeCardId(cardIdRaw)
    const sessionId = sanitizeSessionId(sessionIdRaw)
    const pending = cardId
      ? [...(pendingByCard.get(cardId) ?? [])]
      : [...pendingByCard.values()].flatMap(queue => queue)
    const filteredPending = sessionId
      ? pending.filter(entry => entry.sessionId === sessionId)
      : pending
    const deliveredPrefix = cardId ? buildExecutionDeliveryKeyPrefix(cardId, sessionId || undefined) : ''
    const delivered = [...deliveredAtByKey.entries()]
      .filter(([key]) => !deliveredPrefix || key.startsWith(deliveredPrefix))
      .map(([key, deliveredAt]) => ({
        key,
        deliveredAt,
      }))
      .sort((left, right) => left.deliveredAt - right.deliveredAt)

    return {
      version: 1,
      pending: filteredPending.map(entry => ({ ...entry })),
      delivered,
    }
  }

  function restore(cardIdRaw: string, raw: unknown) {
    prune()

    const cardId = sanitizeCardId(cardIdRaw)
    if (!cardId)
      return snapshot(cardId)

    clear(cardId)

    const state = raw && typeof raw === 'object'
      ? raw as Partial<AlicizationExecutionDeliveryStateSnapshot>
      : {}
    const deliveredEntries = Array.isArray(state.delivered) ? state.delivered : []
    const pendingEntries = Array.isArray(state.pending) ? state.pending : []
    const keyPrefix = buildExecutionDeliveryKeyPrefix(cardId)

    for (const item of deliveredEntries) {
      if (!item || typeof item !== 'object')
        continue
      const key = sanitizeExecutionLedgerText((item as { key?: unknown }).key, 320)
      const deliveredAtRaw = (item as { deliveredAt?: unknown }).deliveredAt
      const deliveredAt = Number.isFinite(deliveredAtRaw)
        ? Math.max(0, Math.floor(Number(deliveredAtRaw)))
        : 0
      if (!key || deliveredAt <= 0 || !key.startsWith(keyPrefix))
        continue
      if (getNow() - deliveredAt > maxAgeMs)
        continue
      deliveredAtByKey.set(key, deliveredAt)
    }

    const sortedPendingEntries = [...pendingEntries].sort((left, right) => {
      const leftCompletedAt = Number.isFinite((left as { completedAt?: unknown })?.completedAt)
        ? Math.floor(Number((left as { completedAt?: unknown }).completedAt))
        : 0
      const rightCompletedAt = Number.isFinite((right as { completedAt?: unknown })?.completedAt)
        ? Math.floor(Number((right as { completedAt?: unknown }).completedAt))
        : 0
      return leftCompletedAt - rightCompletedAt
    })

    for (const item of sortedPendingEntries) {
      if (!item || typeof item !== 'object')
        continue
      const pending = item as Partial<AlicizationPendingExecutionDelivery>
      enqueue({
        cardId,
        sessionId: sanitizeSessionId(pending.sessionId),
        threadId: sanitizeThreadId(pending.threadId),
        decisionTraceId: sanitizeExecutionLedgerText(pending.decisionTraceId, 220) || null,
        turnId: sanitizeExecutionLedgerText(pending.turnId, 220) || null,
        channel: sanitizeExecutionLedgerText(pending.channel, 48) || 'executor',
        status: pending.status as AlicizationTaskThreadStatus,
        goal: sanitizeExecutionLedgerText(pending.goal, 180) || 'the current task',
        summary: sanitizeExecutionLedgerText(pending.summary, 220),
        outcome: sanitizeExecutionLedgerText(pending.outcome, 240),
        signature: sanitizeSignature(pending.signature, `${sanitizeThreadId(pending.threadId)}:${Math.max(0, Math.floor(Number(pending.completedAt ?? 0)))}`),
        queuedAt: Number.isFinite(pending.queuedAt)
          ? Math.max(0, Math.floor(Number(pending.queuedAt)))
          : undefined,
        completedAt: Number.isFinite(pending.completedAt)
          ? Math.max(0, Math.floor(Number(pending.completedAt)))
          : 0,
      })
    }

    return snapshot(cardId)
  }

  function hasPending(input: {
    cardId: string
    sessionId?: string | null
  }) {
    prune()

    const cardId = sanitizeCardId(input.cardId)
    if (!cardId)
      return false

    const queue = pendingByCard.get(cardId) ?? []
    const sessionId = sanitizeSessionId(input.sessionId)
    if (!sessionId)
      return queue.length > 0
    return queue.some(entry => entry.sessionId === sessionId)
  }

  function clear(cardIdRaw?: string | null, sessionIdRaw?: string | null) {
    prune()

    const cardId = sanitizeCardId(cardIdRaw)
    const sessionId = sanitizeSessionId(sessionIdRaw)

    if (!cardId) {
      pendingByCard.clear()
      deliveredAtByKey.clear()
      return
    }

    if (!sessionId) {
      pendingByCard.delete(cardId)
      for (const key of deliveredAtByKey.keys()) {
        if (key.startsWith(`${cardId}::`))
          deliveredAtByKey.delete(key)
      }
      return
    }

    const queue = pendingByCard.get(cardId) ?? []
    const nextQueue = queue.filter(entry => entry.sessionId !== sessionId)
    if (nextQueue.length > 0)
      pendingByCard.set(cardId, nextQueue)
    else
      pendingByCard.delete(cardId)

    const deliveredPrefix = `${cardId}::${sessionId}::`
    for (const key of deliveredAtByKey.keys()) {
      if (key.startsWith(deliveredPrefix))
        deliveredAtByKey.delete(key)
    }
  }

  return {
    clear,
    enqueue,
    hasPending,
    markDelivered,
    requeue,
    restore,
    snapshot,
    takeNext,
  }
}
