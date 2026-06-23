import type sqlite3 from 'sqlite3'

import type { AlicizationMemoryIngestJournalRow } from './memory-ingest-journal'

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createAlicizationMemoryIngestJournalRuntime } from './memory-ingest-journal'
import { createAlicizationMemoryRetrievalTelemetryRuntime } from './memory-retrieval-telemetry'
import { buildAlicizationMemoryStatsProjection } from './memory-stats-projection'

interface TestJournalPayload {
  id: string
}

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim()
}

function createInMemoryJournalHarness() {
  let currentNow = 1_000
  let idCounter = 0
  let failRetryPayload = true
  const appliedPayloads: TestJournalPayload[] = []
  const rows: Array<AlicizationMemoryIngestJournalRow<'fact-upsert'>> = []

  const runtime = createAlicizationMemoryIngestJournalRuntime<'fact-upsert', TestJournalPayload>({
    database: {} as any,
    now: () => currentNow,
    randomUUID: () => `journal-${++idCounter}`,
    run: async (_database, sql, params = []) => {
      const normalizedSql = normalizeSql(sql)
      if (normalizedSql.includes('INSERT INTO memory_ingest_journal')) {
        const [id, operationKind, payloadJson, createdAt, updatedAt, nextAttemptAt] = params as [string, 'fact-upsert', string, number, number, number]
        rows.push({
          id,
          operation_kind: operationKind,
          payload_json: payloadJson,
          status: 'pending',
          attempt_count: 0,
          last_error: null,
          created_at: createdAt,
          updated_at: updatedAt,
          last_attempt_at: null,
          applied_at: null,
          next_attempt_at: nextAttemptAt,
        })
        return
      }

      if (normalizedSql.includes(`UPDATE memory_ingest_journal SET status = 'applied'`)) {
        const [updatedAt, lastAttemptAt, appliedAt, id] = params as [number, number, number, string]
        const row = rows.find(item => item.id === id)
        if (!row)
          throw new Error(`missing row ${id}`)
        row.status = 'applied'
        row.attempt_count += 1
        row.last_error = null
        row.updated_at = updatedAt
        row.last_attempt_at = lastAttemptAt
        row.applied_at = appliedAt
        row.next_attempt_at = null
        return
      }

      if (normalizedSql.includes(`UPDATE memory_ingest_journal SET status = 'failed'`)) {
        const [message, updatedAt, lastAttemptAt, nextAttemptAt, id] = params as [string, number, number, number, string]
        const row = rows.find(item => item.id === id)
        if (!row)
          throw new Error(`missing row ${id}`)
        row.status = 'failed'
        row.attempt_count += 1
        row.last_error = message
        row.updated_at = updatedAt
        row.last_attempt_at = lastAttemptAt
        row.next_attempt_at = nextAttemptAt
        return
      }

      throw new Error(`Unhandled SQL in test harness: ${normalizedSql}`)
    },
    get: async (_database, sql) => {
      const normalizedSql = normalizeSql(sql)
      if (normalizedSql.includes('SELECT COUNT(1) AS total')) {
        return {
          total: rows.filter(row => row.status === 'pending' || row.status === 'failed').length,
        } as any
      }
      return undefined
    },
    all: async <T>(_database: sqlite3.Database, sql: string, params?: unknown[]) => {
      const normalizedSql = normalizeSql(sql)
      if (!normalizedSql.includes('FROM memory_ingest_journal'))
        return [] as T[]

      const source = rows
        .filter(row => row.status === 'pending' || row.status === 'failed')
        .sort((left, right) => left.created_at - right.created_at)
      const resolvedParams = params ?? []

      if (normalizedSql.includes('COALESCE(next_attempt_at, created_at) <= ?')) {
        const [dueAt, limit] = resolvedParams as [number, number]
        return source
          .filter(row => (row.next_attempt_at ?? row.created_at) <= dueAt)
          .slice(0, limit) as T[]
      }

      const limit = Number((resolvedParams as [number?])[0] ?? 256)
      return source.slice(0, limit) as T[]
    },
    runInTransaction: async (_database, task) => await task(),
    parsePayload: (raw) => {
      try {
        return JSON.parse(raw) as TestJournalPayload
      }
      catch {
        return null
      }
    },
    applyPayload: async (payload) => {
      if (payload.id === 'retry-me' && failRetryPayload) {
        failRetryPayload = false
        throw new Error('temporary fail')
      }
      appliedPayloads.push(payload)
    },
    buildBackoffMs: attemptCount => (attemptCount + 1) * 1_000,
  })

  return {
    runtime,
    rows,
    appliedPayloads,
    setNow(value: number) {
      currentNow = value
    },
  }
}

describe('memory domain decoupling regression', () => {
  it('keeps ingest retry working after journal logic is split from db.ts', async () => {
    const harness = createInMemoryJournalHarness()

    await harness.runtime.appendEntries([
      {
        operationKind: 'fact-upsert',
        payload: { id: 'retry-me' },
        createdAt: 1_000,
      },
    ])

    expect(await harness.runtime.deriveHealth()).toEqual({
      status: 'backlog',
      pendingCount: 1,
      failedCount: 0,
      oldestPendingAgeMs: 0,
      nextRetryAt: 1_000,
      lastError: null,
    })

    expect(await harness.runtime.drainJournal(16, 1_000)).toEqual({
      applied: 0,
      failed: 1,
      pending: 1,
    })
    expect(await harness.runtime.deriveHealth()).toEqual({
      status: 'degraded',
      pendingCount: 0,
      failedCount: 1,
      oldestPendingAgeMs: 0,
      nextRetryAt: 2_000,
      lastError: 'temporary fail',
    })

    harness.setNow(1_500)
    expect(await harness.runtime.drainJournal(16, 1_500)).toEqual({
      applied: 0,
      failed: 0,
      pending: 1,
    })

    harness.setNow(2_100)
    expect(await harness.runtime.drainJournal(16, 2_100)).toEqual({
      applied: 1,
      failed: 0,
      pending: 0,
    })
    expect(harness.appliedPayloads).toEqual([{ id: 'retry-me' }])
    expect(await harness.runtime.deriveHealth()).toEqual({
      status: 'healthy',
      pendingCount: 0,
      failedCount: 0,
      oldestPendingAgeMs: null,
      nextRetryAt: null,
      lastError: null,
    })
  })

  it('keeps telemetry projection aligned with decoupled ingest and retrieval runtimes', async () => {
    const meta = new Map<string, string>()
    const telemetryRuntime = createAlicizationMemoryRetrievalTelemetryRuntime({
      now: () => 4_000,
      key: 'telemetry',
      getMetaValue: async key => meta.get(key),
      upsertMeta: async (key, value) => {
        meta.set(key, value)
      },
      enqueueWrite: async task => await task(),
    })

    await telemetryRuntime.recordSemanticLatency(14)
    await telemetryRuntime.recordSemanticLatency(22)
    await telemetryRuntime.recordGraphLatency(28)
    await telemetryRuntime.applyHealthOverride({
      semanticLatencyMs: 18,
      graphLatencyMs: 26,
      templateLeakageFailCount: 5,
    })

    const projected = buildAlicizationMemoryStatsProjection({
      facts: [],
      episodicEvents: [{
        provenance: 'remembered',
        latestReconsolidation: { provenance: 'reconstructed' },
        reconsolidationCount: 1,
        memoryTier: 'warm',
      }],
      consolidations: [{
        memoryTier: 'cold',
      }],
      factTierCounts: { hot: 0, warm: 0, cold: 0 },
      episodicTierCounts: { hot: 0, warm: 1, cold: 0 },
      consolidationTierCounts: { hot: 0, warm: 0, cold: 1 },
      pendingSyncCount: 2,
      ingestHealth: {
        status: 'degraded',
        pendingCount: 1,
        failedCount: 1,
        oldestPendingAgeMs: 7_500,
        nextRetryAt: 8_000,
        lastError: 'temporary fail',
      },
      lastPrunedAt: 333,
      retrievalTelemetry: await telemetryRuntime.getTelemetry(),
      currentTs: 4_000,
    })

    expect(projected.ingestHealth).toEqual({
      status: 'degraded',
      pendingCount: 1,
      failedCount: 1,
      oldestPendingAgeMs: 7_500,
      nextRetryAt: 8_000,
      lastError: 'temporary fail',
    })
    expect(projected.writeHealth).toEqual({
      backlogCount: 2,
      retryOldestAgeMs: 7_500,
      nextRetryAt: 8_000,
      blocked: true,
      lastError: 'temporary fail',
    })
    expect(projected.retrievalHealth).toEqual(expect.objectContaining({
      semanticLatencyMs: 18,
      graphLatencyMs: 26,
      reconstructionFrequency: 1,
      reconstructedCount: 1,
      templateLeakageFailCount: 5,
      organicStageTelemetry: expect.any(Object),
      organicStageBudgetCounts: expect.any(Object),
    }))
  })

  it('keeps reply and recollection authority off direct db imports after the split', () => {
    const files = [
      './answer-compiler.ts',
      './answer-planner.ts',
      './response-charter.ts',
      './response-surface-contract.ts',
      './main-chat-session-runtime.ts',
      './runtime-organic-memory-prompt.ts',
      './memory-search-retrieval-operators.ts',
    ] as const

    for (const relativePath of files) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      expect(source).not.toMatch(/from\s+['"]\.\/db['"]/u)
      expect(source).not.toMatch(/from\s+["']\.\.\/db["']/u)
    }
  })
})
