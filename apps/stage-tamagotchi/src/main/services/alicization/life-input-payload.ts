import { createHash } from 'node:crypto'

export function serializeLifeUserInput(message: unknown) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || (message as { role?: unknown }).role !== 'user')
    throw new TypeError('Life user input must identify an actual user message')
  const content = (message as { content?: unknown }).content
  if (typeof content !== 'string' && !Array.isArray(content))
    throw new TypeError('Life user input requires text or actual content parts')
  const body = JSON.stringify(message)
  if (body.length > 8_000_000)
    throw new TypeError('Current user input exceeds the raw payload budget')
  return { body, inputHash: createHash('sha256').update(body).digest('hex') }
}
