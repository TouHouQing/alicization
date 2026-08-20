import type { WorkingMemoryLongTermCleaningTransaction } from './working-memory-long-term-cleaning'

import { describe, expect, it } from 'vitest'

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
      reason: 'candidate:correction',
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

  it('lists only transactions in the requested card session and queue item scope', async () => {
    const queries: Array<{ sql: string, params: unknown[] }> = []
    const current = transaction({
      id: 'wm-lt-clean:current',
      queueItemId: 'queue-current',
      cardId: 'card-current',
      sessionId: 'session-current',
    })
    const runtime = createWorkingMemoryLongTermCleaningStoreRuntime({
      database: {} as any,
      now: () => 3_000,
      run: async () => undefined,
      get: async () => undefined,
      all: async (_database, sql, params = []) => {
        queries.push({
          sql: normalizeSql(sql),
          params,
        })
        return [{
          id: current.id,
          idempotency_key: current.idempotencyKey,
          queue_item_id: current.queueItemId,
          card_id: current.cardId,
          session_id: current.sessionId,
          status: current.status,
          decision: current.decision,
          queue_item_json: JSON.stringify(current.item),
          cleaned_candidate_json: null,
          projections_json: null,
          allow_training: 0,
          rejection_reasons_json: '[]',
          review_reasons_json: '[]',
          contamination_flags_json: '[]',
          attempt_count: 0,
          last_error: null,
          created_at: current.createdAt,
          updated_at: current.updatedAt,
          next_attempt_at: current.nextAttemptAt,
          applied_at: null,
        }] as any
      },
      runInTransaction: async (_database, task) => await task(),
    })

    const scope = {
      cardId: 'card-current',
      sessionId: 'session-current',
      queueItemIds: ['queue-current', 'queue-second', 'queue-current'],
    }
    const dueRows = await runtime.listDueTransactionsByScope({
      ...scope,
      dueAt: 2_500,
    })
    const rows = await runtime.listTransactionsByScope(scope)

    expect(dueRows.map(row => row.queueItemId)).toEqual(['queue-current'])
    expect(rows.map(row => row.queueItemId)).toEqual(['queue-current'])
    expect(queries).toEqual([
      {
        sql: expect.stringContaining('WHERE card_id = ? AND session_id = ? AND queue_item_id IN (?, ?) AND status IN'),
        params: [
          'card-current',
          'session-current',
          'queue-current',
          'queue-second',
          2_500,
        ],
      },
      {
        sql: expect.stringContaining('WHERE card_id = ? AND session_id = ? AND queue_item_id IN (?, ?)'),
        params: [
          'card-current',
          'session-current',
          'queue-current',
          'queue-second',
        ],
      },
    ])
  })

  it('paginates failed and dead-lettered transactions with transparent errors and timestamps', async () => {
    const failed = transaction({
      id: 'wm-lt-clean:failed',
      queueItemId: 'queue-failed',
      status: 'failed',
      attemptCount: 1,
      lastError: 'sqlite busy while projecting correction',
      createdAt: 1_000,
      updatedAt: 3_000,
      nextAttemptAt: 4_000,
    })
    const deadLettered = transaction({
      id: 'wm-lt-clean:dead',
      queueItemId: 'queue-dead',
      status: 'dead-lettered',
      attemptCount: 3,
      lastError: 'projection provider rejected the cleaned candidate',
      createdAt: 900,
      updatedAt: 2_000,
      nextAttemptAt: null,
    })
    const queries: Array<{ sql: string, params: unknown[] }> = []
    const responses = [
      [failed, deadLettered],
      [deadLettered],
    ]
    const runtime = createWorkingMemoryLongTermCleaningStoreRuntime({
      database: {} as any,
      now: () => 5_000,
      run: async () => undefined,
      get: async () => undefined,
      all: async (_database, sql, params = []) => {
        queries.push({ sql: normalizeSql(sql), params })
        return (responses.shift() ?? []).map(item => ({
          id: item.id,
          idempotency_key: item.idempotencyKey,
          queue_item_id: item.queueItemId,
          card_id: item.cardId,
          session_id: item.sessionId,
          status: item.status,
          decision: item.decision,
          queue_item_json: JSON.stringify(item.item),
          cleaned_candidate_json: null,
          projections_json: null,
          allow_training: 0,
          rejection_reasons_json: '[]',
          review_reasons_json: '[]',
          contamination_flags_json: '[]',
          attempt_count: item.attemptCount,
          last_error: item.lastError,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
          next_attempt_at: item.nextAttemptAt,
          applied_at: null,
        })) as any
      },
      runInTransaction: async (_database, task) => await task(),
    })

    const first = await runtime.listFailureTransactions({
      cardId: 'default',
      limit: 1,
    })
    const second = await runtime.listFailureTransactions({
      cardId: 'default',
      limit: 1,
      cursor: first.nextCursor,
    })

    expect(first.items).toEqual([
      expect.objectContaining({
        id: 'wm-lt-clean:failed',
        source: 'working-memory-owner',
        queueItemId: 'queue-failed',
        status: 'failed',
        attemptCount: 1,
        lastError: 'sqlite busy while projecting correction',
        createdAt: 1_000,
        updatedAt: 3_000,
        nextAttemptAt: 4_000,
      }),
    ])
    expect(first.nextCursor).toBe('3000:wm-lt-clean:failed')
    expect(second.items.map(item => item.id)).toEqual(['wm-lt-clean:dead'])
    expect(second.nextCursor).toBeNull()
    expect(queries).toEqual([
      {
        sql: expect.stringContaining('WHERE card_id = ? AND status IN (\'failed\', \'dead-lettered\')'),
        params: ['default', 2],
      },
      {
        sql: expect.stringContaining('(updated_at < ? OR (updated_at = ? AND id > ?))'),
        params: ['default', 3_000, 3_000, 'wm-lt-clean:failed', 2],
      },
    ])
  })

  it('retries a selected failed or dead-lettered transaction as pending while preserving its raw error in the mutation result', async () => {
    const failed = transaction({
      id: 'wm-lt-clean:failed',
      queueItemId: 'queue-failed',
      status: 'failed',
      attemptCount: 2,
      lastError: 'raw provider timeout after 3125ms',
      updatedAt: 3_000,
      nextAttemptAt: 4_000,
    })
    const updates: Array<{ sql: string, params: unknown[] }> = []
    const runtime = createWorkingMemoryLongTermCleaningStoreRuntime({
      database: {} as any,
      now: () => 5_000,
      run: async (_database, sql, params = []) => {
        updates.push({ sql: normalizeSql(sql), params })
      },
      get: async () => undefined,
      all: async () => [{
        id: failed.id,
        idempotency_key: failed.idempotencyKey,
        queue_item_id: failed.queueItemId,
        card_id: failed.cardId,
        session_id: failed.sessionId,
        status: failed.status,
        decision: failed.decision,
        queue_item_json: JSON.stringify(failed.item),
        cleaned_candidate_json: null,
        projections_json: null,
        allow_training: 0,
        rejection_reasons_json: '[]',
        review_reasons_json: '[]',
        contamination_flags_json: '[]',
        attempt_count: failed.attemptCount,
        last_error: failed.lastError,
        created_at: failed.createdAt,
        updated_at: failed.updatedAt,
        next_attempt_at: failed.nextAttemptAt,
        applied_at: null,
      }] as any,
      runInTransaction: async (_database, task) => await task(),
    })

    const retried = await runtime.retryFailureTransactions({
      cardId: 'default',
      transactionIds: [' wm-lt-clean:failed ', 'wm-lt-clean:failed'],
    })

    expect(retried).toEqual([
      expect.objectContaining({
        id: 'wm-lt-clean:failed',
        status: 'pending-cleaning',
        decision: 'pending',
        attemptCount: 0,
        lastError: 'raw provider timeout after 3125ms',
        updatedAt: 5_000,
        nextAttemptAt: 5_000,
      }),
    ])
    expect(updates).toEqual([
      {
        sql: expect.stringContaining('UPDATE working_memory_long_term_transactions'),
        params: expect.arrayContaining([
          'pending-cleaning',
          'pending',
          0,
          'raw provider timeout after 3125ms',
          5_000,
          'wm-lt-clean:failed',
        ]),
      },
    ])
  })
})
