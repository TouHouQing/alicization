import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '../../../shared/eventa'

const executionOutcomePayloadKeys = [
  'reply',
  'assistant',
  'summary',
  'stdout',
  'stderr',
  'errorMessage',
  'errorCode',
] as const

export const alicizationTerminalTaskThreadStatuses = new Set<AlicizationTaskThreadStatus>([
  'completed',
  'failed',
  'cancelled',
  'blocked',
])

export function sanitizeExecutionLedgerText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function uniqueExecutionLedgerValues(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

export function readTaskThreadActivityAt(thread: AlicizationTaskThreadRecord) {
  return Math.max(
    Number.isFinite(thread.lastEventAt) ? Number(thread.lastEventAt) : 0,
    Number.isFinite(thread.completedAt) ? Number(thread.completedAt) : 0,
    Number.isFinite(thread.updatedAt) ? Number(thread.updatedAt) : 0,
    Number.isFinite(thread.createdAt) ? Number(thread.createdAt) : 0,
  )
}

function readExecutionPayloadOutcome(payload: Record<string, unknown> | null | undefined) {
  if (!payload || typeof payload !== 'object')
    return ''

  for (const key of executionOutcomePayloadKeys) {
    const value = payload[key]
    const text = sanitizeExecutionLedgerText(value, 240)
    if (text)
      return text
  }

  return ''
}

export function readLatestExecutionEvent<
  Event extends Pick<AlicizationExecutionEventRecord, 'createdAt' | 'kind'>,
>(
  events: Event[],
  preferredKinds: string[] = ['result', 'cancel', 'takeover'],
) {
  const ordered = [...events].sort((left, right) => left.createdAt - right.createdAt)
  const latestPreferred = [...ordered].reverse().find(event => preferredKinds.includes(event.kind))
  return latestPreferred ?? ordered.at(-1) ?? null
}

export function readExecutionOutcome(events: AlicizationExecutionEventRecord[]) {
  const latestEvent = readLatestExecutionEvent(events)
  if (!latestEvent)
    return ''
  return readExecutionPayloadOutcome(latestEvent.payload)
}
