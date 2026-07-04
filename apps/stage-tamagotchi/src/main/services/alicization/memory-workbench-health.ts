import type sqlite3 from 'sqlite3'

import type { AlicizationMemoryWorkbenchHealth, AlicizationMemoryWorkbenchStatus } from '../../../shared/eventa'

export interface MemoryWorkbenchRecallMetricInput {
  cardId: string
  query: string
  mode: string
  latencyMs: number
  evidenceCount: number
  semanticAvailable: boolean
  error?: string | null
}

interface MemoryWorkbenchRecallMetricRow {
  latency_ms: number
  error: string | null
}

function normalizeText(raw: unknown, maxChars = 240) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

export function summarizeMemoryWorkbenchQueueRows(rows: Array<{ status: string }>): AlicizationMemoryWorkbenchHealth['queue'] {
  return rows.reduce<AlicizationMemoryWorkbenchHealth['queue']>((summary, row) => {
    if (row.status === 'pending' || row.status === 'pending-cleaning' || row.status === 'admitted') {
      summary.pending += 1
    }
    else if (row.status === 'needs-user-review') {
      summary.review += 1
    }
    else if (row.status === 'applied') {
      summary.applied += 1
    }
    else if (row.status === 'failed') {
      summary.failed += 1
    }
    else if (row.status === 'dead-lettered' || row.status === 'rejected') {
      summary.failed += 1
      if (row.status === 'dead-lettered')
        summary.deadLettered += 1
    }
    return summary
  }, {
    pending: 0,
    review: 0,
    applied: 0,
    failed: 0,
    deadLettered: 0,
  })
}

export function calculateMemoryWorkbenchP95Latency(values: number[]) {
  const sorted = values
    .filter(Number.isFinite)
    .map(value => Math.max(0, Math.floor(value)))
    .sort((left, right) => left - right)
  if (sorted.length === 0)
    return null
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? sorted[sorted.length - 1] ?? null
}

export function deriveMemoryWorkbenchStatus(input: {
  errors: string[]
  queueFailed: number
  embeddingConfigured: boolean
}): AlicizationMemoryWorkbenchStatus {
  if (input.errors.length > 0 || input.queueFailed > 0)
    return 'degraded'
  return 'ok'
}

export function createMemoryWorkbenchHealthRuntime(input: {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}) {
  async function getQueueHealth(queueInput: { cardId: string }) {
    const cardId = normalizeText(queueInput.cardId, 120)
    if (!cardId) {
      return summarizeMemoryWorkbenchQueueRows([])
    }
    const rows = await input.all<{ status: string }>(
      input.database,
      `
      SELECT status
      FROM working_memory_long_term_transactions
      WHERE card_id = ?
      `,
      [cardId],
    )
    return summarizeMemoryWorkbenchQueueRows(rows)
  }

  async function appendRecallMetric(metricInput: MemoryWorkbenchRecallMetricInput) {
    const cardId = normalizeText(metricInput.cardId, 120)
    if (!cardId)
      return
    await input.enqueueWrite(async () => {
      await input.run(
        input.database,
        `
        INSERT INTO memory_workbench_recall_metrics (
          id,
          card_id,
          query,
          mode,
          latency_ms,
          evidence_count,
          semantic_available,
          error,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          `memory-workbench-recall:${input.randomUUID()}`,
          cardId,
          normalizeText(metricInput.query, 240),
          normalizeText(metricInput.mode, 80) || 'none',
          Math.max(0, Math.floor(Number(metricInput.latencyMs) || 0)),
          Math.max(0, Math.floor(Number(metricInput.evidenceCount) || 0)),
          metricInput.semanticAvailable ? 1 : 0,
          normalizeText(metricInput.error, 240) || null,
          input.now(),
        ],
      )
    })
  }

  async function getRecallHealth(recallInput: { cardId: string }): Promise<AlicizationMemoryWorkbenchHealth['recall']> {
    const cardId = normalizeText(recallInput.cardId, 120)
    if (!cardId) {
      return {
        lastLatencyMs: null,
        p95LatencyMs: null,
        lastError: null,
      }
    }
    const rows = await input.all<MemoryWorkbenchRecallMetricRow>(
      input.database,
      `
      SELECT latency_ms, error
      FROM memory_workbench_recall_metrics
      WHERE card_id = ?
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [cardId],
    )
    return {
      lastLatencyMs: Number.isFinite(rows[0]?.latency_ms) ? Math.max(0, Math.floor(rows[0]!.latency_ms)) : null,
      p95LatencyMs: calculateMemoryWorkbenchP95Latency(rows.map(row => row.latency_ms)),
      lastError: normalizeText(rows[0]?.error, 240) || null,
    }
  }

  return {
    appendRecallMetric,
    getQueueHealth,
    getRecallHealth,
  }
}
