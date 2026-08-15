import type sqlite3 from 'sqlite3'

import type {
  WorkingMemoryLongTermAdmissionDecision,
  WorkingMemoryLongTermCleaningStatus,
  WorkingMemoryLongTermCleaningTransaction,
} from './working-memory-long-term-cleaning'

import { normalizeWorkingMemoryLongTermCleaningStatus } from './working-memory-long-term-cleaning'

export interface WorkingMemoryLongTermCleaningRow {
  id: string
  idempotency_key: string
  queue_item_id: string
  card_id: string
  session_id: string
  status: string
  decision: string
  queue_item_json: string
  cleaned_candidate_json: string | null
  projections_json: string | null
  allow_training: number
  rejection_reasons_json: string
  review_reasons_json: string
  contamination_flags_json: string
  attempt_count: number
  last_error: string | null
  created_at: number
  updated_at: number
  next_attempt_at: number | null
  applied_at: number | null
}

export interface WorkingMemoryLongTermCleaningStoreRuntimeOptions {
  database: sqlite3.Database
  now: () => number
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
}

export interface WorkingMemoryLongTermCleaningScope {
  cardId: string
  sessionId: string
  queueItemIds: string[]
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw)
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

function normalizeDecision(raw: string): WorkingMemoryLongTermAdmissionDecision {
  if (raw === 'admit' || raw === 'reject' || raw === 'review')
    return raw
  return 'pending'
}

function normalizeScope(input: WorkingMemoryLongTermCleaningScope) {
  const queueItemIds = [...new Set(
    input.queueItemIds
      .map(queueItemId => queueItemId.trim())
      .filter(Boolean),
  )]
  return {
    cardId: input.cardId.trim(),
    sessionId: input.sessionId.trim(),
    queueItemIds,
  }
}

export function mapWorkingMemoryLongTermCleaningRow(row: WorkingMemoryLongTermCleaningRow): WorkingMemoryLongTermCleaningTransaction {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    queueItemId: row.queue_item_id,
    source: 'working-memory-owner',
    cardId: row.card_id,
    sessionId: row.session_id,
    status: normalizeWorkingMemoryLongTermCleaningStatus(row.status),
    decision: normalizeDecision(row.decision),
    item: parseJson(row.queue_item_json, null as never),
    cleanedCandidate: parseJson(row.cleaned_candidate_json, null),
    projections: parseJson(row.projections_json, null),
    allowTraining: row.allow_training === 1,
    rejectionReasons: parseJson(row.rejection_reasons_json, []),
    reviewReasons: parseJson(row.review_reasons_json, []),
    contaminationFlags: parseJson(row.contamination_flags_json, []),
    attemptCount: Math.max(0, Math.floor(Number(row.attempt_count ?? 0))),
    lastError: row.last_error,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
    nextAttemptAt: row.next_attempt_at === null ? null : Number(row.next_attempt_at) || null,
    appliedAt: row.applied_at === null ? null : Number(row.applied_at) || null,
  }
}

export function createWorkingMemoryLongTermCleaningStoreRuntime(options: WorkingMemoryLongTermCleaningStoreRuntimeOptions) {
  async function enqueueTransactions(transactions: WorkingMemoryLongTermCleaningTransaction[]) {
    await options.runInTransaction(options.database, async () => {
      for (const transaction of transactions) {
        await options.run(
          options.database,
          `
          INSERT OR IGNORE INTO working_memory_long_term_transactions (
            id,
            idempotency_key,
            queue_item_id,
            card_id,
            session_id,
            status,
            decision,
            queue_item_json,
            cleaned_candidate_json,
            projections_json,
            allow_training,
            rejection_reasons_json,
            review_reasons_json,
            contamination_flags_json,
            attempt_count,
            last_error,
            created_at,
            updated_at,
            next_attempt_at,
            applied_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            transaction.id,
            transaction.idempotencyKey,
            transaction.queueItemId,
            transaction.cardId,
            transaction.sessionId,
            transaction.status,
            transaction.decision,
            JSON.stringify(transaction.item),
            transaction.cleanedCandidate ? JSON.stringify(transaction.cleanedCandidate) : null,
            transaction.projections ? JSON.stringify(transaction.projections) : null,
            transaction.allowTraining ? 1 : 0,
            JSON.stringify(transaction.rejectionReasons),
            JSON.stringify(transaction.reviewReasons),
            JSON.stringify(transaction.contaminationFlags),
            transaction.attemptCount,
            transaction.lastError,
            transaction.createdAt,
            transaction.updatedAt,
            transaction.nextAttemptAt,
            transaction.appliedAt,
          ],
        )
      }
    })
  }

  async function listDueTransactions(limit = 8, dueAt = options.now()) {
    const rows = await options.all<WorkingMemoryLongTermCleaningRow>(
      options.database,
      `
      SELECT *
      FROM working_memory_long_term_transactions
      WHERE status IN ('pending-cleaning', 'admitted')
        AND COALESCE(next_attempt_at, created_at) <= ?
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [dueAt, Math.max(1, Math.min(32, Math.floor(limit)))],
    )
    return rows.map(mapWorkingMemoryLongTermCleaningRow)
  }

  async function listTransactionsByScope(input: WorkingMemoryLongTermCleaningScope) {
    const scope = normalizeScope(input)
    if (!scope.cardId || !scope.sessionId || scope.queueItemIds.length === 0)
      return []

    const placeholders = scope.queueItemIds.map(() => '?').join(', ')
    const rows = await options.all<WorkingMemoryLongTermCleaningRow>(
      options.database,
      `
      SELECT *
      FROM working_memory_long_term_transactions
      WHERE card_id = ?
        AND session_id = ?
        AND queue_item_id IN (${placeholders})
      ORDER BY updated_at DESC, created_at DESC
      `,
      [
        scope.cardId,
        scope.sessionId,
        ...scope.queueItemIds,
      ],
    )
    return rows.map(mapWorkingMemoryLongTermCleaningRow)
  }

  async function listDueTransactionsByScope(input: WorkingMemoryLongTermCleaningScope & {
    dueAt?: number
  }) {
    const scope = normalizeScope(input)
    if (!scope.cardId || !scope.sessionId || scope.queueItemIds.length === 0)
      return []

    const placeholders = scope.queueItemIds.map(() => '?').join(', ')
    const rows = await options.all<WorkingMemoryLongTermCleaningRow>(
      options.database,
      `
      SELECT *
      FROM working_memory_long_term_transactions
      WHERE card_id = ?
        AND session_id = ?
        AND queue_item_id IN (${placeholders})
        AND status IN ('pending-cleaning', 'admitted')
        AND COALESCE(next_attempt_at, created_at) <= ?
      ORDER BY created_at ASC
      `,
      [
        scope.cardId,
        scope.sessionId,
        ...scope.queueItemIds,
        input.dueAt ?? options.now(),
      ],
    )
    return rows.map(mapWorkingMemoryLongTermCleaningRow)
  }

  async function listReviewTransactions(input: {
    cardId: string
    limit?: number
  }) {
    const rows = await options.all<WorkingMemoryLongTermCleaningRow>(
      options.database,
      `
      SELECT *
      FROM working_memory_long_term_transactions
      WHERE status = 'needs-user-review'
        AND card_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ?
      `,
      [
        input.cardId,
        Math.max(1, Math.min(64, Math.floor(input.limit ?? 24))),
      ],
    )
    return rows.map(mapWorkingMemoryLongTermCleaningRow)
  }

  async function updateTransaction(
    transaction: WorkingMemoryLongTermCleaningTransaction,
    status: WorkingMemoryLongTermCleaningStatus = transaction.status,
  ) {
    await options.run(
      options.database,
      `
      UPDATE working_memory_long_term_transactions
      SET status = ?,
          decision = ?,
          cleaned_candidate_json = ?,
          projections_json = ?,
          allow_training = ?,
          rejection_reasons_json = ?,
          review_reasons_json = ?,
          contamination_flags_json = ?,
          attempt_count = ?,
          last_error = ?,
          updated_at = ?,
          next_attempt_at = ?,
          applied_at = ?
      WHERE id = ?
      `,
      [
        status,
        transaction.decision,
        transaction.cleanedCandidate ? JSON.stringify(transaction.cleanedCandidate) : null,
        transaction.projections ? JSON.stringify(transaction.projections) : null,
        transaction.allowTraining ? 1 : 0,
        JSON.stringify(transaction.rejectionReasons),
        JSON.stringify(transaction.reviewReasons),
        JSON.stringify(transaction.contaminationFlags),
        transaction.attemptCount,
        transaction.lastError,
        transaction.updatedAt,
        transaction.nextAttemptAt,
        transaction.appliedAt,
        transaction.id,
      ],
    )
  }

  return {
    enqueueTransactions,
    listDueTransactions,
    listDueTransactionsByScope,
    listReviewTransactions,
    listTransactionsByScope,
    updateTransaction,
  }
}
