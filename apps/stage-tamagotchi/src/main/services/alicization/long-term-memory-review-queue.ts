import type { WorkingMemoryLongTermCleaningTransaction } from './life-core/working-memory-long-term-cleaning'
import type { WorkingMemoryLongTermCandidate } from './life-core/working-memory'

export type LongTermMemoryReviewStatus =
  | 'needs-user-review'
  | 'approved'
  | 'rejected'
  | 'tombstoned'
  | 'superseded'

export type LongTermMemoryReviewDecision =
  | 'approve'
  | 'reject'
  | 'tombstone'
  | 'supersede'

export interface LongTermMemoryReviewItem {
  id: string
  transactionId: string
  sourceMemoryIds: string[]
  status: LongTermMemoryReviewStatus
  cardId: string
  sessionId: string
  kind: WorkingMemoryLongTermCandidate['kind']
  summary: string
  evidenceSnippets: string[]
  reviewReasons: string[]
  sensitivity: WorkingMemoryLongTermCandidate['sensitivity']
  allowTraining: boolean
  visibleMode: 'explicit' | 'inward-only'
  createdAt: number
  updatedAt: number
}

export interface LongTermMemorySourceBackedCandidate {
  id: string
  sourceMemoryIds?: string[]
}

function normalizeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 10, maxChars = 160) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function longTermMemoryPrivacyVisibleMode(
  sensitivity: WorkingMemoryLongTermCandidate['sensitivity'] | null | undefined,
): 'explicit' | 'inward-only' {
  return sensitivity === 'private' || sensitivity === 'secret'
    ? 'inward-only'
    : 'explicit'
}

export function createLongTermMemoryReviewItemFromTransaction(input: {
  transaction: WorkingMemoryLongTermCleaningTransaction
  now: number
}): LongTermMemoryReviewItem | null {
  const transaction = input.transaction
  const candidate = transaction.cleanedCandidate
  if (transaction.status !== 'needs-user-review' || !candidate)
    return null

  const summary = normalizeText(candidate.summary, 320)
  if (!summary)
    return null

  return {
    id: `review:${transaction.id}`,
    transactionId: transaction.id,
    sourceMemoryIds: uniqueTexts([candidate.id, transaction.queueItemId], 4, 180),
    status: 'needs-user-review',
    cardId: transaction.cardId,
    sessionId: transaction.sessionId,
    kind: candidate.kind,
    summary,
    evidenceSnippets: uniqueTexts(candidate.evidenceSnippets, 6, 260),
    reviewReasons: uniqueTexts(transaction.reviewReasons, 12, 180),
    sensitivity: candidate.sensitivity,
    allowTraining: false,
    visibleMode: longTermMemoryPrivacyVisibleMode(candidate.sensitivity),
    createdAt: transaction.createdAt,
    updatedAt: Number.isFinite(input.now) ? Number(input.now) : Date.now(),
  }
}

export function applyLongTermMemoryReviewDecision(input: {
  item: LongTermMemoryReviewItem
  transaction: WorkingMemoryLongTermCleaningTransaction
  decision: LongTermMemoryReviewDecision
  now: number
}): {
  item: LongTermMemoryReviewItem
  transaction: WorkingMemoryLongTermCleaningTransaction
} {
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now()
  const baseItem = {
    ...input.item,
    allowTraining: false,
    updatedAt: now,
  }

  if (input.decision === 'approve') {
    return {
      item: {
        ...baseItem,
        status: 'approved',
      },
      transaction: {
        ...input.transaction,
        status: 'admitted',
        decision: 'admit',
        allowTraining: false,
        reviewReasons: [],
        updatedAt: now,
        nextAttemptAt: now,
      },
    }
  }

  const status = input.decision === 'tombstone'
    ? 'tombstoned'
    : input.decision === 'supersede'
      ? 'superseded'
      : 'rejected'
  const rejectionReason = input.decision === 'tombstone'
    ? 'tombstoned'
    : input.decision === 'supersede'
      ? 'superseded'
      : 'user-rejected'

  return {
    item: {
      ...baseItem,
      status,
    },
    transaction: {
      ...input.transaction,
      status: 'rejected',
      decision: 'reject',
      allowTraining: false,
      rejectionReasons: uniqueTexts([
        ...input.transaction.rejectionReasons,
        rejectionReason,
      ], 12, 180),
      reviewReasons: [],
      updatedAt: now,
      nextAttemptAt: null,
    },
  }
}

export function filterTombstonedLongTermMemoryCandidates<T extends LongTermMemorySourceBackedCandidate>(input: {
  candidates: T[]
  tombstonedSourceIds: string[]
}): T[] {
  const tombstoned = new Set(input.tombstonedSourceIds.map(id => normalizeText(id, 240)).filter(Boolean))
  if (tombstoned.size === 0)
    return input.candidates

  return input.candidates.filter((candidate) => {
    const sourceIds = uniqueTexts([
      candidate.id,
      ...(candidate.sourceMemoryIds ?? []),
    ], 16, 240)
    return sourceIds.every(sourceId => !tombstoned.has(sourceId))
  })
}
