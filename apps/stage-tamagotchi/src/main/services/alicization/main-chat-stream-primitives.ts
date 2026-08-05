export function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readFirstStringField(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field]
    if (typeof value === 'string')
      return value
  }
  return ''
}

export function normalizeMainGatewayStreamEventType(rawType: unknown) {
  const eventType = sanitizeText(rawType)
  switch (eventType) {
    case 'text-delta':
    case 'text_delta':
    case 'content-delta':
    case 'content_delta':
    case 'message-delta':
    case 'message_delta':
    case 'response.output_text.delta':
    case 'delta':
    case 'text':
      return 'text-delta'
    case 'tool-call':
    case 'tool_call':
      return 'tool-call'
    case 'tool-result':
    case 'tool_result':
      return 'tool-result'
    case 'tool-call-streaming-start':
    case 'tool-call-delta':
    case 'reasoning-delta':
      return eventType
    case 'finish':
    case 'done':
    case 'response.completed':
      return 'finish'
    case 'error':
    case 'response.error':
      return 'error'
    default:
      return eventType
  }
}

export function readRawTextDelta(raw: unknown) {
  if (typeof raw === 'string')
    return raw
  if (!isRecord(raw))
    return ''
  const direct = readFirstStringField(raw, [
    'text',
    'delta',
    'content',
    'contentDelta',
    'textDelta',
    'message',
  ])
  if (direct)
    return direct

  const choice = Array.isArray(raw.choices)
    ? raw.choices[0]
    : null
  const nestedDelta = isRecord(choice) && isRecord(choice.delta)
    ? readFirstStringField(choice.delta, ['content', 'text'])
    : ''
  return nestedDelta
}

export function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

export function isMainGatewayProgressEventType(rawType: unknown) {
  const eventType = normalizeMainGatewayStreamEventType(rawType)
  return eventType === 'text-delta'
    || eventType === 'tool-call'
    || eventType === 'tool-result'
    || eventType === 'tool-call-streaming-start'
    || eventType === 'tool-call-delta'
    || eventType === 'reasoning-delta'
    || eventType === 'finish'
    || eventType === 'error'
}
