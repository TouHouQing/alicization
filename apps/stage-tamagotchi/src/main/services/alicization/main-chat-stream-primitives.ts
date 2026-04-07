export function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

export function readRawTextDelta(raw: unknown) {
  return typeof raw === 'string' ? raw : ''
}

export function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

export function isMainGatewayProgressEventType(rawType: unknown) {
  const eventType = sanitizeText(rawType)
  return eventType === 'text-delta'
    || eventType === 'tool-call'
    || eventType === 'tool-result'
    || eventType === 'finish'
    || eventType === 'error'
}
