import { createHash } from 'node:crypto'

export function normalizeLongTermMemoryEmbeddingText(raw: unknown, maxChars = 2_000) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

export function hashLongTermMemoryEmbeddingText(raw: unknown) {
  return createHash('sha256')
    .update(normalizeLongTermMemoryEmbeddingText(raw))
    .digest('hex')
}
