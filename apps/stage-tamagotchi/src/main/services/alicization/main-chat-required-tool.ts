const requiredToolMissingMessagePrefix = 'Model finished without calling required tool:'

function normalizeToolNames(raw: unknown) {
  if (!Array.isArray(raw))
    return [] as string[]
  return [...new Set(raw
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean))]
}

export interface AlicizationRequiredToolMissingErrorDetails {
  requiredToolNames: string[]
  finishReason?: string
  observedToolNames?: string[]
  stage: 'stream' | 'one-shot'
}

export class AlicizationRequiredToolMissingError extends Error {
  readonly code = 'alicization-required-tool-missing'
  readonly requiredToolNames: string[]
  readonly finishReason: string
  readonly observedToolNames: string[]
  readonly stage: AlicizationRequiredToolMissingErrorDetails['stage']

  constructor(details: AlicizationRequiredToolMissingErrorDetails) {
    const requiredToolNames = normalizeToolNames(details.requiredToolNames)
    const message = requiredToolNames.length > 0
      ? `${requiredToolMissingMessagePrefix} ${requiredToolNames.join(', ')}`
      : requiredToolMissingMessagePrefix
    super(message)
    this.name = 'AlicizationRequiredToolMissingError'
    this.requiredToolNames = requiredToolNames
    this.finishReason = typeof details.finishReason === 'string'
      ? details.finishReason.trim()
      : ''
    this.observedToolNames = normalizeToolNames(details.observedToolNames)
    this.stage = details.stage
  }
}

export function isAlicizationRequiredToolMissingError(error: unknown): error is AlicizationRequiredToolMissingError {
  if (!error || typeof error !== 'object')
    return false

  const payload = error as {
    code?: unknown
    name?: unknown
    message?: unknown
  }
  if (payload.code === 'alicization-required-tool-missing')
    return true
  if (payload.name === 'AlicizationRequiredToolMissingError')
    return true

  const message = typeof payload.message === 'string'
    ? payload.message.trim()
    : ''
  return message.startsWith(requiredToolMissingMessagePrefix)
}

export function extractAlicizationRequiredToolNames(error: unknown) {
  if (isAlicizationRequiredToolMissingError(error))
    return error.requiredToolNames

  const message = String(error instanceof Error ? error.message : error ?? '').trim()
  if (!message.startsWith(requiredToolMissingMessagePrefix))
    return [] as string[]
  const rawNames = message.slice(requiredToolMissingMessagePrefix.length).trim()
  if (!rawNames)
    return [] as string[]
  return [...new Set(rawNames.split(',').map(name => name.trim()).filter(Boolean))]
}
