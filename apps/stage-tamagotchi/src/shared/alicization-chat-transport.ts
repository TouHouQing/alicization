import type { AlicizationChatStartPayload } from './eventa'

type JsonSafeValue
  = | null
    | string
    | number
    | boolean
    | JsonSafeValue[]
    | { [key: string]: JsonSafeValue }

export interface AlicizationChatTransportSanitizationReport {
  changed: boolean
  droppedCount: number
  coercedCount: number
  droppedPaths: string[]
  coercedPaths: string[]
}

const maxReportedPaths = 12

function recordPath(target: string[], path: string) {
  if (target.length < maxReportedPaths)
    target.push(path)
}

function sanitizeScalar(value: unknown, path: string, report: AlicizationChatTransportSanitizationReport): JsonSafeValue | undefined {
  if (value === null)
    return null

  if (typeof value === 'string' || typeof value === 'boolean')
    return value

  if (typeof value === 'number') {
    if (Number.isFinite(value))
      return value
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return String(value)
  }

  if (typeof value === 'bigint') {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toString()
  }

  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    report.changed = true
    report.droppedCount += 1
    recordPath(report.droppedPaths, path)
    return undefined
  }

  return null
}

function sanitizeJsonSafeValue(
  value: unknown,
  path: string,
  report: AlicizationChatTransportSanitizationReport,
  seen: WeakSet<object>,
): JsonSafeValue | undefined {
  const scalar = sanitizeScalar(value, path, report)
  if (scalar !== null || value == null || typeof value !== 'object')
    return scalar

  if (seen.has(value)) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return '[Circular]'
  }
  seen.add(value)

  if (Array.isArray(value)) {
    const next: JsonSafeValue[] = []
    value.forEach((entry, index) => {
      const sanitized = sanitizeJsonSafeValue(entry, `${path}[${index}]`, report, seen)
      if (sanitized !== undefined)
        next.push(sanitized)
    })
    return next
  }

  if (value instanceof Date) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toISOString()
  }

  if (value instanceof URL) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toString()
  }

  if (value instanceof Map) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    const next: Record<string, JsonSafeValue> = {}
    for (const [entryKey, entryValue] of value.entries()) {
      const key = typeof entryKey === 'string' ? entryKey : String(entryKey)
      const sanitized = sanitizeJsonSafeValue(entryValue, `${path}.${key}`, report, seen)
      if (sanitized !== undefined)
        next[key] = sanitized
    }
    return next
  }

  if (value instanceof Set) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    const next: JsonSafeValue[] = []
    let index = 0
    for (const entry of value.values()) {
      const sanitized = sanitizeJsonSafeValue(entry, `${path}[${index}]`, report, seen)
      if (sanitized !== undefined)
        next.push(sanitized)
      index += 1
    }
    return next
  }

  if (value instanceof RegExp) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toString()
  }

  if (value instanceof Error) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return {
      name: value.name,
      message: value.message,
    }
  }

  if (value instanceof ArrayBuffer) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return Array.from(new Uint8Array(value))
  }

  if (ArrayBuffer.isView(value)) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return Array.from(new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)))
  }

  const next: Record<string, JsonSafeValue> = {}
  for (const [entryKey, entryValue] of Object.entries(value)) {
    const sanitized = sanitizeJsonSafeValue(entryValue, `${path}.${entryKey}`, report, seen)
    if (sanitized !== undefined)
      next[entryKey] = sanitized
  }
  return next
}

function sanitizeToCloneSafeJson<T>(value: T, path: string): { value: T, report: AlicizationChatTransportSanitizationReport } {
  const report: AlicizationChatTransportSanitizationReport = {
    changed: false,
    droppedCount: 0,
    coercedCount: 0,
    droppedPaths: [],
    coercedPaths: [],
  }
  const sanitized = sanitizeJsonSafeValue(value, path, report, new WeakSet()) as T
  return {
    value: structuredClone(sanitized),
    report,
  }
}

function describeContentKind(value: unknown): string {
  if (value == null)
    return 'null'
  if (Array.isArray(value))
    return 'array'
  if (value instanceof Date)
    return 'date'
  if (value instanceof Map)
    return 'map'
  if (value instanceof Set)
    return 'set'
  return typeof value
}

export function summarizeAlicizationChatStartPayloadForTransport(payload: AlicizationChatStartPayload) {
  return {
    providerConfigKeys: Object.keys(payload.providerConfig ?? {}),
    messageSchema: payload.messages.map(message => ({
      role: message.role,
      contentKind: describeContentKind(message.content),
      hasToolCallId: typeof message.toolCallId === 'string' && message.toolCallId.length > 0,
      hasToolName: typeof message.toolName === 'string' && message.toolName.length > 0,
    })),
  }
}

// NOTICE: Electron IPC uses structured clone, which rejects Vue/Pinia proxies and other non-plain objects.
// We normalize chat-start payloads into plain JSON-compatible data before crossing the renderer -> main boundary.
export function sanitizeAlicizationChatStartPayloadForTransport(payload: AlicizationChatStartPayload) {
  return sanitizeToCloneSafeJson(payload, 'payload')
}
