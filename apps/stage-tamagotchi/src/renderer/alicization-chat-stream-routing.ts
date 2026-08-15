import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStreamChunkEvent,
  AlicizationChatStreamDispatchPayload,
  AlicizationChatToolCallEvent,
  AlicizationChatToolProgressEvent,
  AlicizationChatToolResultEvent,
} from '../shared/eventa'

type AlicizationChatStreamIngressEventType
  = Exclude<
    AlicizationChatStreamDispatchPayload['eventType'],
    'dialogue-responded'
  >

type AlicizationChatStreamIngressBody
  = | AlicizationChatMetaEvent
    | AlicizationChatStreamChunkEvent
    | AlicizationChatToolCallEvent
    | AlicizationChatToolResultEvent
    | AlicizationChatToolProgressEvent
    | AlicizationChatFinishEvent
    | AlicizationChatErrorEvent

export type AlicizationChatStreamIngressSource = 'dispatch' | 'eventa'

function stableFingerprint(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null)
    return 'null'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return JSON.stringify(value)
  if (Array.isArray(value))
    return `[${value.map(item => stableFingerprint(item, seen)).join(',')}]`
  if (!value || typeof value !== 'object')
    return ''
  if (seen.has(value))
    return '[circular]'

  seen.add(value)
  const result = `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableFingerprint((value as Record<string, unknown>)[key], seen)}`)
    .join(',')}}`
  seen.delete(value)
  return result
}

const streamEventIdentityKeys = [
  'cardId',
  'turnId',
  'toolCallId',
  'threadId',
] as const

function streamEventIdentityFingerprint(record: Record<string, unknown>) {
  return streamEventIdentityKeys
    .map((key) => {
      const value = record[key]
      return `${key}:${typeof value === 'string' ? value.trim() : stableFingerprint(value)}`
    })
    .join('|')
}

export interface AlicizationChatStreamIngressDeduplicatorOptions {
  getNow?: () => number
  windowMs?: number
  maxEntries?: number
}

export interface AlicizationLateToolEventDisposalHandle {
  cancel: () => void
}

/**
 * Keep the renderer stream addressable for a bounded period after the
 * user-facing finish settles. Main-owned tool facts can be delivered slightly
 * later than the Provider finish event.
 */
export function scheduleAlicizationLateToolEventDisposal(input: {
  delayMs: number
  onDispose: () => void
}): AlicizationLateToolEventDisposalHandle {
  let cancelled = false
  const timer = setTimeout(() => {
    if (!cancelled)
      input.onDispose()
  }, Math.max(1, Math.floor(input.delayMs)))

  return {
    cancel() {
      if (cancelled)
        return
      cancelled = true
      clearTimeout(timer)
    },
  }
}

/**
 * The main process prefers a sender-bound IPC dispatch and only falls back to
 * Eventa when that sender is unavailable. Keep the fallback observable without
 * allowing the same payload from both ingress paths to enter the UI twice.
 */
export function createAlicizationChatStreamIngressDeduplicator(
  options: AlicizationChatStreamIngressDeduplicatorOptions = {},
) {
  const getNow = options.getNow ?? Date.now
  const windowMs = Math.max(1, Math.floor(options.windowMs ?? 250))
  const maxEntries = Math.max(32, Math.floor(options.maxEntries ?? 2_048))
  const recent = new Map<string, {
    firstSeenAt: number
    sources: Set<AlicizationChatStreamIngressSource>
  }>()

  const trim = () => {
    while (recent.size > maxEntries) {
      const oldest = recent.keys().next().value
      if (typeof oldest !== 'string')
        break
      recent.delete(oldest)
    }
  }

  const accept = (
    source: AlicizationChatStreamIngressSource,
    eventType: AlicizationChatStreamIngressEventType,
    body: AlicizationChatStreamIngressBody,
  ) => {
    const record = body as unknown as Record<string, unknown>
    const eventId = typeof record.eventId === 'string' && record.eventId.trim()
      ? record.eventId.trim()
      : null
    // Tool progress is an append-only fact stream. Without a producer-issued
    // identity, a content fingerprint cannot distinguish a repeated heartbeat
    // from two distinct facts, so preserve both ingress observations.
    if (eventType === 'tool-progress' && !eventId)
      return true

    const now = getNow()
    const key = eventId
      ? `${eventType}:event:${eventId}:identity:${streamEventIdentityFingerprint(record)}`
      : `${eventType}:fingerprint:${stableFingerprint(body)}`
    const previous = recent.get(key)
    if (!previous || now - previous.firstSeenAt > windowMs) {
      recent.delete(key)
      recent.set(key, {
        firstSeenAt: now,
        sources: new Set([source]),
      })
      trim()
      return true
    }

    if (previous.sources.has(source))
      return true

    previous.sources.add(source)
    return false
  }

  return {
    accept,
    clear() {
      recent.clear()
    },
  }
}

export function isAlicizationChatStreamAttemptForLogicalTurn(
  logicalTurnId: string,
  transportTurnId: string,
) {
  const logical = logicalTurnId.trim()
  const transport = transportTurnId.trim()
  if (!logical || !transport)
    return false

  return transport === logical || transport.startsWith(`${logical}:gw`)
}

export function resolveAlicizationLogicalChatStreamTurnId(
  logicalTurnIds: Iterable<string>,
  transportTurnId: string,
) {
  const transport = transportTurnId.trim()
  if (!transport)
    return null

  const candidates = [...new Set([...logicalTurnIds]
    .map(turnId => turnId.trim())
    .filter(turnId => isAlicizationChatStreamAttemptForLogicalTurn(turnId, transport)))]

  return candidates.length === 1 ? candidates[0]! : null
}
