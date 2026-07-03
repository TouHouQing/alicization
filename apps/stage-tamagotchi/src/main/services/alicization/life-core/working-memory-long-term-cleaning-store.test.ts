import { describe, expect, it } from 'vitest'

import type { WorkingMemoryLongTermCleaningTransaction } from './working-memory-long-term-cleaning'

import { createWorkingMemoryLongTermCleaningStoreRuntime } from './working-memory-long-term-cleaning-store'

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim()
}

function transaction(overrides: Partial<WorkingMemoryLongTermCleaningTransaction> = {}): WorkingMemoryLongTermCleaningTransaction {
  return {
    id: 'wm-lt-clean:one',
    idempotencyKey: 'working-memory-owner:default:session-1:correction:turn-1:user:no-fixed-template',
    queueItemId: 'queue-1',
    source: 'working-memory-owner',
    cardId: 'default',
    sessionId: 'session-1',
    status: 'pending-cleaning',
    decision: 'pending',
    item: {
      id: 'queue-1',
      source: 'working-memory-owner',
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格。',
      reason: 'User corrected Alicization persona expression during the current dialogue.',
      sourceTurnIds: ['turn-1:user'],
      evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
      salience: 0.82,
      confidence: 0.78,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 2_000,
    },
    cleanedCandidate: null,
    projections: null,
    allowTraining: false,
    rejectionReasons: [],
    reviewReasons: [],
    contaminationFlags: [],
    attemptCount: 0,
    lastError: null,
    createdAt: 2_000,
    updatedAt: 2_000,
    nextAttemptAt: 2_000,
    appliedAt: null,
    ...overrides,
  }
}

describe('working memory long-term cleaning store', () => {
  it('enqueues by idempotency key and lists due pending transactions once', async () => {
    const rows: Record<string, unknown>[] = []
    const runtime = createWorkingMemoryLongTermCleaningStoreRuntime({
      database: {} as any,
      now: () => 3_000,
      run: async (_database, sql, params = []) => {
        const normalized = normalizeSql(sql)
        if (normalized.includes('INSERT OR IGNORE INTO working_memory_long_term_transactions')) {
          const [
            id,
            idempotencyKey,
            queueItemId,
            cardId,
            sessionId,
            status,
            decision,
            queueItemJson,
            cleanedCandidateJson,
            projectionsJson,
            allowTraining,
            rejectionReasonsJson,
            reviewReasonsJson,
            contaminationFlagsJson,
            attemptCount,
            lastError,
            createdAt,
            updatedAt,
            nextAttemptAt,
            appliedAt,
          ] = params as unknown[]
          if (!rows.some(row => row.id === id || row.idempotency_key === idempotencyKey)) {
            rows.push({
              id,
              idempotency_key: idempotencyKey,
              queue_item_id: queueItemId,
              card_id: cardId,
              session_id: sessionId,
              status,
              decision,
              queue_item_json: queueItemJson,
              cleaned_candidate_json: cleanedCandidateJson,
              projections_json: projectionsJson,
              allow_training: allowTraining,
              rejection_reasons_json: rejectionReasonsJson,
              review_reasons_json: reviewReasonsJson,
              contamination_flags_json: contaminationFlagsJson,
              attempt_count: attemptCount,
              last_error: lastError,
              created_at: createdAt,
              updated_at: updatedAt,
              next_attempt_at: nextAttemptAt,
              applied_at: appliedAt,
            })
          }
          return
        }
        throw new Error(`Unhandled SQL: ${normalized}`)
      },
      get: async () => undefined,
      all: async () => rows as any,
      runInTransaction: async (_database, task) => await task(),
    })

    await runtime.enqueueTransactions([transaction(), transaction()])
    const due = await runtime.listDueTransactions(8, 3_000)

    expect(due).toHaveLength(1)
    expect(due[0]).toEqual(expect.objectContaining({
      id: 'wm-lt-clean:one',
      idempotencyKey: 'working-memory-owner:default:session-1:correction:turn-1:user:no-fixed-template',
      status: 'pending-cleaning',
      queueItemId: 'queue-1',
    }))
  })
})
