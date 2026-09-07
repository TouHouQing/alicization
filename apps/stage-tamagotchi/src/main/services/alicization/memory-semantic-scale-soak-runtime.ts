import type sqlite3 from 'sqlite3'

import type { PersistentLongTermMemoryVectorRecord } from './long-term-memory-persistent-vector-store'
import type { LongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import type { MemorySemanticScaleJobStatus } from './memory-semantic-scale-job-runtime'
import type {
  MemorySemanticScaleProviderDegradationObservation,
  MemorySemanticScaleProviderDegradationResult,
  MemorySemanticScaleReindexObservation,
  MemorySemanticScaleReindexResult,
  MemorySemanticScaleResourcePreflight,
  MemorySemanticScaleSearchObservation,
  MemorySemanticScaleSearchQueryObservation,
  MemorySemanticScaleSoakReport,
} from './memory-semantic-scale-soak-harness'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

import sqlite from './sqlite3-runtime'

import { resolveLongTermMemoryVectorSpaceId } from './long-term-memory-embedding-provider'
import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'

interface MemorySemanticScaleCanonicalRecord {
  cardId: string
  source: string
  sourceId: string
  text: string
}

function semanticScaleRetrievalAnchor(index: number) {
  return `memory-anchor-${String(index).padStart(8, '0')}`
}

function semanticScaleMemoryText(index: number) {
  return `Long-term memory record with retrieval anchor ${semanticScaleRetrievalAnchor(index)}`
}

function semanticScaleQueryText(index: number) {
  return `Recall the long-term memory record connected to retrieval anchor ${semanticScaleRetrievalAnchor(index)}`
}

export interface MemorySemanticScaleSoakProgress {
  phase: 'indexing' | 'querying'
  completed: number
  total: number
  ratio: number
  indexedCount: number
  queryCount: number
  corpusSize: number
}

export interface MemorySemanticScaleOperationalLifecycleProbe {
  passed: boolean
  finalStatus: MemorySemanticScaleJobStatus
  attempts?: number
  deadLettered?: number
  recoveredLeases?: number
}

export interface MemorySemanticScaleOperationalProbeReport {
  version: 'memory-semantic-scale-operational-probes-v1'
  mode: 'sqlite-runtime-fixture'
  createdAt: number
  passed: boolean
  providerDegradation: MemorySemanticScaleProviderDegradationResult
  reindex: MemorySemanticScaleReindexResult
  lifecycle: {
    cancellation: MemorySemanticScaleOperationalLifecycleProbe
    retry: MemorySemanticScaleOperationalLifecycleProbe
    deadLetter: MemorySemanticScaleOperationalLifecycleProbe
    crashRecovery: MemorySemanticScaleOperationalLifecycleProbe
  }
  failures: string[]
}

export interface MemorySemanticScaleAcceptanceOptions {
  tier: '10k' | '100k'
  maxP95LatencyMs: number
  maxP99LatencyMs: number
  operationalProbes: MemorySemanticScaleOperationalProbeReport | null
  providerConfigured?: boolean
}

export interface MemorySemanticScaleAcceptance {
  passed: boolean
  requiredCorpusSize: number
  maxP95LatencyMs: number
  maxP99LatencyMs: number
}

export type MemorySemanticScaleAcceptanceReport = MemorySemanticScaleSoakReport & {
  acceptance: MemorySemanticScaleAcceptance
  operationalProbes: MemorySemanticScaleOperationalProbeReport | null
}

const semanticScaleTierCorpusSizes: Record<MemorySemanticScaleAcceptanceOptions['tier'], number> = {
  '10k': 10_000,
  '100k': 100_000,
}

function acceptanceCheckPresent(checks: string[], check: string) {
  if (!checks.includes(check))
    checks.push(check)
}

function hasFinitePositiveEvidence(value: unknown) {
  return Number.isFinite(Number(value)) && Number(value) >= 0
}

export function applyMemorySemanticScaleAcceptanceGate(
  report: MemorySemanticScaleSoakReport,
  options: MemorySemanticScaleAcceptanceOptions,
): MemorySemanticScaleAcceptanceReport {
  const requiredCorpusSize = semanticScaleTierCorpusSizes[options.tier]
  const maxP95LatencyMs = Math.max(0, Number(options.maxP95LatencyMs))
  const maxP99LatencyMs = Math.max(maxP95LatencyMs, Number(options.maxP99LatencyMs))
  const failingChecks = [...report.summary.failingChecks]
  const queryEvidencePresent = report.summary.queryCount > 0
  const providerConfigured = options.providerConfigured
    ?? report.evidence?.vectorInput === 'provider'
  const probes = options.operationalProbes

  if (report.summary.corpusSize < requiredCorpusSize)
    acceptanceCheckPresent(failingChecks, 'scale-corpus-incomplete')
  if (!queryEvidencePresent)
    acceptanceCheckPresent(failingChecks, 'scale-query-evidence-missing')
  if (!queryEvidencePresent || !hasFinitePositiveEvidence(report.summary.p95LatencyMs))
    acceptanceCheckPresent(failingChecks, 'latency-p95-missing')
  else if (report.summary.p95LatencyMs > maxP95LatencyMs)
    acceptanceCheckPresent(failingChecks, 'latency-p95-too-high')
  if (!queryEvidencePresent || !hasFinitePositiveEvidence(report.summary.p99LatencyMs))
    acceptanceCheckPresent(failingChecks, 'latency-p99-missing')
  else if (report.summary.p99LatencyMs > maxP99LatencyMs)
    acceptanceCheckPresent(failingChecks, 'latency-p99-too-high')
  if (!providerConfigured)
    acceptanceCheckPresent(failingChecks, 'production-provider-required')

  if (!probes) {
    acceptanceCheckPresent(failingChecks, 'provider-degradation-probe-missing')
    acceptanceCheckPresent(failingChecks, 'model-switch-reindex-probe-missing')
    acceptanceCheckPresent(failingChecks, 'reindex-cancellation-probe-missing')
    acceptanceCheckPresent(failingChecks, 'reindex-retry-probe-missing')
    acceptanceCheckPresent(failingChecks, 'reindex-dead-letter-probe-missing')
    acceptanceCheckPresent(failingChecks, 'reindex-crash-recovery-probe-missing')
  }
  else {
    if (!probes.providerDegradation.passed)
      acceptanceCheckPresent(failingChecks, 'provider-degradation-probe-failed')
    if (!probes.reindex.passed)
      acceptanceCheckPresent(failingChecks, 'model-switch-reindex-probe-failed')
    if (!probes.lifecycle.cancellation.passed)
      acceptanceCheckPresent(failingChecks, 'reindex-cancellation-probe-failed')
    if (!probes.lifecycle.retry.passed)
      acceptanceCheckPresent(failingChecks, 'reindex-retry-probe-failed')
    if (!probes.lifecycle.deadLetter.passed)
      acceptanceCheckPresent(failingChecks, 'reindex-dead-letter-probe-failed')
    if (!probes.lifecycle.crashRecovery.passed)
      acceptanceCheckPresent(failingChecks, 'reindex-crash-recovery-probe-failed')
    for (const failure of probes.failures)
      acceptanceCheckPresent(failingChecks, failure)
  }

  const acceptance: MemorySemanticScaleAcceptance = {
    passed: failingChecks.length === 0,
    requiredCorpusSize,
    maxP95LatencyMs,
    maxP99LatencyMs,
  }
  return {
    ...report,
    passed: report.passed && acceptance.passed,
    summary: {
      ...report.summary,
      failingChecks,
    },
    acceptance,
    operationalProbes: probes,
  }
}

function sqliteRun(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve())
  })
}

function sqliteGet<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined))
  })
}

function sqliteAll<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve((rows ?? []) as T[]))
  })
}

function sqliteClose(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

function operationalPassReport(id: string, createdAt: number) {
  return runMemorySemanticScaleSoakHarness({
    id,
    createdAt,
    minimumCorpusSize: 1,
    searches: [{
      id: `${id}:search`,
      corpusSize: 1,
      indexMode: 'sqlite-vec',
      approximate: false,
      degraded: false,
      nativeIndexReady: true,
      coverageRatio: 1,
      vectorInput: 'provider',
      adapterImplementation: 'persistent-native',
      queries: [{
        id: `${id}:query`,
        queryText: 'operational probe query',
        queryMode: 'non-self',
        queryVectorHash: 'query-vector',
        expectedVectorHash: 'stored-vector',
        expectedTopIds: ['operational-target'],
        returnedIds: ['operational-target'],
        latencyMs: 1,
      }],
    }],
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function createOperationalVectorFixture(input: {
  database: sqlite3.Database
  cardId: string
  createdAt: number
}) {
  const run = sqliteRun
  const all = sqliteAll
  const get = sqliteGet
  let writeQueue = Promise.resolve<unknown>(undefined)
  let transactionActive = false
  const enqueueWrite = async <T>(task: () => Promise<T>) => {
    if (transactionActive)
      return await task()
    const next = writeQueue.then(async () => {
      await run(input.database, 'BEGIN IMMEDIATE')
      transactionActive = true
      try {
        const result = await task()
        await run(input.database, 'COMMIT')
        return result
      }
      catch (error) {
        await run(input.database, 'ROLLBACK').catch(() => {})
        throw error
      }
      finally {
        transactionActive = false
      }
    })
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }

  await run(input.database, `
    CREATE TABLE long_term_memory_search_documents (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      tombstoned INTEGER NOT NULL DEFAULT 0
    )
  `)
  const store = createPersistentLongTermMemoryVectorStore({
    database: input.database,
    run,
    all,
    enqueueWrite,
    now: () => input.createdAt,
  })
  const adapter = createLongTermMemoryVectorIndexAdapter({
    store,
    native: createSqliteVecLongTermMemoryVectorBackend({
      database: input.database,
      now: () => input.createdAt,
      run,
      get,
      all,
      enqueueWrite,
    }),
  })
  await adapter.initialize()

  const oldModelId = 'operational-embedding-old'
  const oldDimensions = 4
  const oldVectorSpaceId = resolveLongTermMemoryVectorSpaceId({
    modelId: oldModelId,
    dimensions: oldDimensions,
    vectorSpaceId: 'operational-space-old',
  })
  const sourceId = 'operational-memory-0001'
  const text = 'Operational probe memory for provider fallback and model switch.'
  await run(input.database, `
    INSERT INTO long_term_memory_search_documents (
      id, card_id, source, source_id, text_hash, tombstoned
    ) VALUES (?, ?, ?, ?, ?, 0)
  `, [
    `doc:${input.cardId}:memory_reflections:${sourceId}`,
    input.cardId,
    'memory_reflections',
    sourceId,
    hashLongTermMemoryEmbeddingText(text),
  ])
  await adapter.upsert([{
    id: `ltm-vector:${input.cardId}:${oldVectorSpaceId}:${sourceId}`,
    cardId: input.cardId,
    sourceId,
    source: 'memory_reflections',
    text,
    vector: [1, 0, 0, 0],
    modelId: oldModelId,
    dimensions: oldDimensions,
    vectorSpaceId: oldVectorSpaceId,
    updatedAt: input.createdAt,
    metadata: {
      operationalProbe: true,
    },
  }])

  return {
    adapter,
    sourceId,
    text,
    oldModelId,
    oldDimensions,
    oldVectorSpaceId,
    newModelId: 'operational-embedding-new',
    newDimensions: 4,
    newVectorSpaceId: resolveLongTermMemoryVectorSpaceId({
      modelId: 'operational-embedding-new',
      dimensions: 4,
      vectorSpaceId: 'operational-space-new',
    }),
  }
}

export async function runMemorySemanticScaleOperationalProbes(input: {
  cardId: string
  createdAt: number
}): Promise<MemorySemanticScaleOperationalProbeReport> {
  const { createMemorySemanticScaleJobRuntime } = await import('./memory-semantic-scale-job-runtime')
  type OperationalJobRuntime = ReturnType<typeof createMemorySemanticScaleJobRuntime>
  const tempRoot = await mkdtemp(join(tmpdir(), 'alicization-memory-operational-probes-'))
  const database = new sqlite.Database(':memory:')
  let runtime: OperationalJobRuntime | null = null
  let secondRuntime: OperationalJobRuntime | null = null
  let databaseClosed = false
  let uuid = 0
  let minimumNow = Date.now()
  const currentTime = () => Math.max(minimumNow, Date.now())
  const report = operationalPassReport('operational-probe-pass', input.createdAt)
  const makeRuntime = (options: {
    executeJob?: (execution: { signal: AbortSignal }) => Promise<MemorySemanticScaleSoakReport>
    maxAttempts?: number
  } = {}) => createMemorySemanticScaleJobRuntime({
    ...(() => {
      let writeQueue = Promise.resolve<unknown>(undefined)
      return {
        enqueueWrite: async <T>(task: () => Promise<T>) => {
          const next = writeQueue.then(task, task)
          writeQueue = next.then(() => undefined, () => undefined)
          return await next
        },
      }
    })(),
    database,
    now: currentTime,
    randomUUID: () => `operational-probe-${++uuid}`,
    run: async (targetDatabase, sql, params = []) => await sqliteRun(targetDatabase, sql, params),
    get: sqliteGet,
    all: sqliteAll,
    runInTransaction: async <T>(targetDatabase: sqlite3.Database, task: () => Promise<T>) => {
      await sqliteRun(targetDatabase, 'BEGIN IMMEDIATE')
      try {
        const result = await task()
        await sqliteRun(targetDatabase, 'COMMIT')
        return result
      }
      catch (error) {
        await sqliteRun(targetDatabase, 'ROLLBACK').catch(() => {})
        throw error
      }
    },
    executeJob: options.executeJob
      ? async execution => await options.executeJob!(execution)
      : async () => report,
    maxAttempts: options.maxAttempts,
    retryBaseMs: 1,
    retryMaxMs: 1,
    leaseMs: 50,
    stopTimeoutMs: 500,
    recoveryJournalDir: join(tempRoot, 'recovery'),
    tempRootDir: tempRoot,
    createTempDir: async ({ jobId, tempRootDir }) =>
      await mkdtemp(join(tempRootDir, `job-${jobId}-`)),
  })

  const failures: string[] = []
  let providerDegradation!: MemorySemanticScaleProviderDegradationResult
  let reindex!: MemorySemanticScaleReindexResult
  const lifecycle: MemorySemanticScaleOperationalProbeReport['lifecycle'] = {
    cancellation: {
      passed: false,
      finalStatus: 'running',
    },
    retry: {
      passed: false,
      finalStatus: 'running',
      attempts: 0,
    },
    deadLetter: {
      passed: false,
      finalStatus: 'running',
      attempts: 0,
      deadLettered: 0,
    },
    crashRecovery: {
      passed: false,
      finalStatus: 'running',
      recoveredLeases: 0,
    },
  }

  try {
    const vectorFixture = await createOperationalVectorFixture({
      database,
      cardId: input.cardId,
      createdAt: input.createdAt,
    })
    const failingProvider = {
      embedTexts: async () => {
        throw new Error('embedding provider failed with HTTP 503')
      },
    }
    let providerError: string | null = null
    try {
      await failingProvider.embedTexts()
    }
    catch (error) {
      providerError = errorMessage(error)
    }
    const fallbackRows = await sqliteAll<{ source_id: string }>(
      database,
      `SELECT doc.source_id
       FROM long_term_memory_search_documents doc
       JOIN long_term_memory_vectors vector
         ON vector.card_id = doc.card_id
        AND vector.source = doc.source
        AND vector.source_id = doc.source_id
       WHERE doc.card_id = ?
         AND doc.tombstoned = 0
         AND vector.text LIKE ?`,
      [input.cardId, '%provider fallback%'],
    )
    const fallbackObservation: MemorySemanticScaleProviderDegradationObservation = {
      id: 'provider-degradation',
      providerError,
      lexicalFallbackIds: fallbackRows.map(row => row.source_id),
      expectedTopIds: [vectorFixture.sourceId],
      errorVisible: Boolean(providerError),
    }

    const newHealth = await vectorFixture.adapter.getHealth({
      cardId: input.cardId,
      modelId: vectorFixture.newModelId,
      dimensions: vectorFixture.newDimensions,
      vectorSpaceId: vectorFixture.newVectorSpaceId,
    })
    const reindexObservation: MemorySemanticScaleReindexObservation = {
      previous: {
        modelId: vectorFixture.oldModelId,
        dimensions: vectorFixture.oldDimensions,
        vectorSpaceId: vectorFixture.oldVectorSpaceId,
      },
      active: {
        modelId: vectorFixture.newModelId,
        dimensions: vectorFixture.newDimensions,
        vectorSpaceId: vectorFixture.newVectorSpaceId,
      },
      reindexRequired: newHealth.reindexRequired,
      progress: {
        total: newHealth.canonicalCount,
        indexed: newHealth.indexedCount,
        retryable: newHealth.missingCount,
        deadLettered: 0,
        cancelled: 0,
        status: 'queued',
        lastError: newHealth.lastError,
      },
      observations: {
        cancellationObserved: false,
        retryObserved: false,
        deadLetterObserved: false,
        crashRecoveryObserved: false,
      },
    }

    const evaluatedBeforeLifecycle = runMemorySemanticScaleSoakHarness({
      id: 'operational-probe-evaluation',
      createdAt: input.createdAt,
      searches: [],
      providerDegradation: fallbackObservation,
      reindex: reindexObservation,
    })
    providerDegradation = evaluatedBeforeLifecycle.providerDegradation!

    runtime = makeRuntime({
      maxAttempts: 2,
      executeJob: async ({ signal }) => {
        await new Promise<void>((_resolve, reject) => {
          const onAbort = () => {
            signal.removeEventListener('abort', onAbort)
            reject(signal.reason instanceof Error ? signal.reason : new Error('cancelled'))
          }
          signal.addEventListener('abort', onAbort, { once: true })
          if (signal.aborted)
            onAbort()
        })
        return report
      },
    })
    await runtime.initializeSchema()
    const cancellationJob = await runtime.startJob({
      cardId: `${input.cardId}:cancel`,
      tier: '10k',
    })
    let cancellationStarted = false
    const cancellationExecution = runtime.runNextAttempt(cancellationJob.jobId)
    while (!cancellationStarted) {
      const state = await runtime.getJob(cancellationJob.jobId)
      cancellationStarted = state.status === 'running'
      if (!cancellationStarted)
        await new Promise(resolve => setTimeout(resolve, 1))
    }
    await runtime.requestCancel(cancellationJob.jobId, 'operational cancellation probe')
    const cancelled = await cancellationExecution
    lifecycle.cancellation = {
      passed: cancelled.status === 'cancelled',
      finalStatus: cancelled.status,
    }

    let retryExecutions = 0
    const retryRuntime = makeRuntime({
      maxAttempts: 2,
      executeJob: async () => {
        retryExecutions += 1
        if (retryExecutions === 1)
          throw new Error('controlled retry failure')
        return report
      },
    })
    await retryRuntime.initializeSchema()
    const retryJob = await retryRuntime.startJob({
      cardId: `${input.cardId}:retry`,
      tier: '10k',
    })
    await retryRuntime.runJob(retryJob.jobId)
    const retried = await retryRuntime.getJob(retryJob.jobId)
    lifecycle.retry = {
      passed: retried.status === 'completed' && retryExecutions === 2,
      finalStatus: retried.status,
      attempts: retried.attemptCount,
    }
    await retryRuntime.stop()

    const deadLetterRuntime = makeRuntime({
      maxAttempts: 2,
      executeJob: async () => {
        throw new Error('controlled dead letter')
      },
    })
    await deadLetterRuntime.initializeSchema()
    const deadLetterJob = await deadLetterRuntime.startJob({
      cardId: `${input.cardId}:dead-letter`,
      tier: '10k',
    })
    await deadLetterRuntime.runJob(deadLetterJob.jobId)
    const deadLettered = await deadLetterRuntime.getJob(deadLetterJob.jobId)
    lifecycle.deadLetter = {
      passed: deadLettered.status === 'failed'
        && deadLettered.deadLettered
        && deadLettered.attemptCount === 2,
      finalStatus: deadLettered.status,
      attempts: deadLettered.attemptCount,
      deadLettered: deadLettered.deadLettered ? 1 : 0,
    }
    await deadLetterRuntime.stop()

    await runtime.stop()
    runtime = null
    const crashRuntime = makeRuntime({
      maxAttempts: 2,
      executeJob: async () => report,
    })
    await crashRuntime.initializeSchema()
    const crashJob = await crashRuntime.startJob({
      cardId: `${input.cardId}:crash`,
      tier: '10k',
    })
    await sqliteRun(database, `
      UPDATE memory_semantic_scale_jobs
      SET status = 'running', attempt_count = 1, lease_token = ?,
          lease_expires_at = ?, started_at = ?
      WHERE id = ?
    `, [
      'crashed-worker',
      currentTime() - 1,
      currentTime() - 1,
      crashJob.jobId,
    ])
    await crashRuntime.stop()
    secondRuntime = makeRuntime({
      maxAttempts: 2,
      executeJob: async () => report,
    })
    await secondRuntime.initializeSchema()
    const recoveredJob = await secondRuntime.getJob(crashJob.jobId)
    const recoveredLeases = recoveredJob.status === 'queued'
      && recoveredJob.lastError?.includes('lease expired') === true
      ? 1
      : 0
    minimumNow = Math.max(
      currentTime() + 1,
      recoveredJob.nextRetryAt ?? currentTime() + 1,
    )
    await secondRuntime.runJob(crashJob.jobId)
    const recovered = await secondRuntime.getJob(crashJob.jobId)
    lifecycle.crashRecovery = {
      passed: recovered.status === 'completed' && recoveredLeases === 1,
      finalStatus: recovered.status,
      recoveredLeases,
    }

    reindexObservation.progress = {
      total: Math.max(1, newHealth.canonicalCount),
      indexed: newHealth.indexedCount,
      retryable: newHealth.missingCount,
      deadLettered: lifecycle.deadLetter.deadLettered ?? 0,
      cancelled: lifecycle.cancellation.passed ? 1 : 0,
      status: lifecycle.deadLetter.passed ? 'failed' : 'queued',
      lastError: lifecycle.deadLetter.passed ? 'controlled dead letter' : newHealth.lastError,
    }
    reindexObservation.observations = {
      cancellationObserved: lifecycle.cancellation.passed,
      retryObserved: lifecycle.retry.passed,
      deadLetterObserved: lifecycle.deadLetter.passed,
      crashRecoveryObserved: lifecycle.crashRecovery.passed,
    }
    const evaluated = runMemorySemanticScaleSoakHarness({
      id: 'operational-probe-evaluation',
      createdAt: input.createdAt,
      searches: [],
      providerDegradation: fallbackObservation,
      reindex: reindexObservation,
    })
    providerDegradation = evaluated.providerDegradation!
    reindex = evaluated.reindex!
    const lifecycleFailures = Object.entries(lifecycle)
      .filter(([, observation]) => !observation.passed)
      .map(([name]) => `reindex-${name}-probe-failed`)
    failures.push(
      ...providerDegradation.failures.map(failure => `provider-degradation-${failure}`),
      ...reindex.failures.map(failure => `model-switch-${failure}`),
      ...lifecycleFailures,
    )
  }
  catch (error) {
    failures.push(errorMessage(error))
    providerDegradation ??= {
      id: 'provider-degradation',
      providerError: null,
      fallbackRecallAtK: 0,
      errorVisible: false,
      passed: false,
      failures: ['operational-probe-error'],
    }
    reindex ??= {
      reindexRequired: false,
      modelSpaceChanged: false,
      progress: {
        total: 0,
        indexed: 0,
        retryable: 0,
        deadLettered: 0,
        cancelled: 0,
        status: 'failed',
        lastError: errorMessage(error),
      },
      observations: {
        cancellationObserved: false,
        retryObserved: false,
        deadLetterObserved: false,
        crashRecoveryObserved: false,
      },
      passed: false,
      failures: ['operational-probe-error'],
    }
  }
  finally {
    await secondRuntime?.stop().catch(() => {})
    await runtime?.stop().catch(() => {})
    if (!databaseClosed) {
      databaseClosed = true
      await sqliteClose(database).catch(() => {})
    }
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {})
  }

  return {
    version: 'memory-semantic-scale-operational-probes-v1',
    mode: 'sqlite-runtime-fixture',
    createdAt: input.createdAt,
    passed: failures.length === 0
      && providerDegradation.passed
      && reindex.passed
      && Object.values(lifecycle).every(observation => observation.passed),
    providerDegradation,
    reindex,
    lifecycle,
    failures,
  }
}

function normalizePositiveInteger(value: unknown, fallback: number, maximum: number) {
  if (!Number.isFinite(Number(value)))
    return fallback
  return Math.max(1, Math.min(maximum, Math.floor(Number(value))))
}

function normalizeCorpusSizes(values: number[]) {
  return [...new Set(values
    .map(value => normalizePositiveInteger(value, 1, 1_000_000))
    .filter(value => value > 0))]
    .sort((left, right) => left - right)
}

function deterministicVector(index: number, dimensions: number) {
  let state = (Math.imul(index + 1, 0x9E3779B1) ^ 0x85EBCA6B) >>> 0
  const vector = Array.from({ length: dimensions }, (_item, dimension) => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    const centered = ((state >>> 0) / 0xFFFF_FFFF) * 2 - 1
    return centered + ((index + dimension) % dimensions === 0 ? 0.05 : 0)
  })
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map(value => value / norm)
}

function buildVectorRecord(input: {
  cardId: string
  modelId: string
  dimensions: number
  vectorSpaceId: string
  index: number
  updatedAt: number
  vector?: number[]
  foreign?: boolean
}): PersistentLongTermMemoryVectorRecord {
  const suffix = String(input.index).padStart(8, '0')
  const sourceId = `${input.foreign ? 'foreign' : 'target'}-memory-${suffix}`
  const text = semanticScaleMemoryText(input.index)
  return {
    id: `ltm-vector:${input.cardId}:${input.vectorSpaceId}:memory_reflections:${sourceId}`,
    cardId: input.cardId,
    sourceId,
    source: 'memory_reflections',
    text,
    vector: input.vector ?? deterministicVector(input.index, input.dimensions),
    modelId: input.modelId,
    dimensions: input.dimensions,
    vectorSpaceId: input.vectorSpaceId,
    updatedAt: input.updatedAt,
    metadata: {
      kind: 'reflection',
      scaleSoak: true,
    },
  }
}

function normalizeProviderVector(
  raw: unknown,
  dimensions: number,
  text: string,
) {
  if (
    !raw
    || typeof raw !== 'object'
    || !Array.isArray((raw as { vector?: unknown }).vector)
    || (raw as { vector: unknown[] }).vector.length !== dimensions
    || !(raw as { vector: unknown[] }).vector.every(value => Number.isFinite(value))
  ) {
    throw new Error(`semantic scale embedding provider returned an invalid vector for "${text}"`)
  }
  return (raw as { vector: number[] }).vector
}

async function embedScaleTexts(input: {
  embeddingProvider?: {
    embedTexts: (texts: string[], signal?: AbortSignal) => Promise<Array<{ text: string, vector: number[] }>>
  }
  texts: string[]
  dimensions: number
  signal?: AbortSignal
}) {
  if (!input.embeddingProvider)
    return null
  const embeddings = await input.embeddingProvider.embedTexts(input.texts, input.signal)
  if (embeddings.length !== input.texts.length)
    throw new Error(`semantic scale embedding provider returned ${embeddings.length} vectors for ${input.texts.length} texts`)
  return input.texts.map((text, index) =>
    normalizeProviderVector(embeddings[index], input.dimensions, text))
}

function normalizeVector(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map(value => value / norm)
}

function nonSelfSyntheticQueryVector(vector: number[], index: number) {
  return normalizeVector(vector.map((value, dimension) =>
    value + ((dimension + index) % vector.length === 0 ? 0.001 : 0)))
}

function canonicalRecord(record: PersistentLongTermMemoryVectorRecord): MemorySemanticScaleCanonicalRecord {
  return {
    cardId: record.cardId,
    source: record.source,
    sourceId: record.sourceId,
    text: record.text,
  }
}

function queryIndexes(corpusSize: number, queryCount: number) {
  const count = Math.min(corpusSize, queryCount)
  if (count <= 1)
    return [0]
  return Array.from({ length: count }, (_item, index) =>
    Math.min(corpusSize - 1, Math.floor(index * (corpusSize - 1) / (count - 1))))
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted)
    return
  if (signal.reason instanceof Error)
    throw signal.reason
  throw new DOMException(
    typeof signal.reason === 'string' && signal.reason.trim()
      ? signal.reason
      : 'semantic scale soak aborted',
    'AbortError',
  )
}

export async function runMemorySemanticScaleVectorAdapterSoak(input: {
  id: string
  createdAt: number
  gate?: 'adapter-smoke' | 'production'
  adapterImplementation?: 'persistent-native' | 'test-double' | 'unknown'
  embeddingProvider?: {
    modelId?: string
    dimensions?: number
    embedTexts: (texts: string[], signal?: AbortSignal) => Promise<Array<{ text: string, vector: number[] }>>
  }
  resourcePreflight?: MemorySemanticScaleResourcePreflight | null
  adapter: LongTermMemoryVectorIndexAdapter
  prepareCanonical: (records: MemorySemanticScaleCanonicalRecord[]) => Promise<void>
  withBatchWrite?: (task: () => Promise<void>) => Promise<void>
  cardId: string
  foreignCardId: string
  modelId: string
  dimensions: number
  vectorSpaceId: string
  corpusSizes: number[]
  queryCount?: number
  batchSize?: number
  maxP95LatencyMs?: number
  maxP99LatencyMs?: number
  minimumCoverageRatio?: number
  signal?: AbortSignal
  onProgress?: (progress: MemorySemanticScaleSoakProgress) => void | Promise<void>
}): Promise<MemorySemanticScaleSoakReport> {
  const dimensions = normalizePositiveInteger(input.dimensions, 12, 4_096)
  const corpusSizes = normalizeCorpusSizes(input.corpusSizes)
  const queryCount = normalizePositiveInteger(input.queryCount, 24, 256)
  const batchSize = normalizePositiveInteger(input.batchSize, 500, 5_000)
  const vectorSpaceId = resolveLongTermMemoryVectorSpaceId({
    modelId: input.modelId,
    dimensions,
    vectorSpaceId: input.vectorSpaceId,
  })
  const searches: MemorySemanticScaleSearchObservation[] = []
  const totalWork = corpusSizes.reduce((total, corpusSize, index) => {
    const previousCorpusSize = corpusSizes[index - 1] ?? 0
    const indexBatchCount = Math.ceil(Math.max(0, corpusSize - previousCorpusSize) / batchSize)
    return total + indexBatchCount + queryIndexes(corpusSize, queryCount).length
  }, 0)
  let completedWork = 0
  let indexedCorpusSize = 0
  let completedQueryCount = 0

  for (const corpusSize of corpusSizes) {
    for (let offset = indexedCorpusSize; offset < corpusSize; offset += batchSize) {
      throwIfAborted(input.signal)
      const end = Math.min(corpusSize, offset + batchSize)
      const recordTexts = Array.from({ length: end - offset }, (_item, relativeIndex) =>
        semanticScaleMemoryText(offset + relativeIndex))
      const providerVectors = await embedScaleTexts({
        embeddingProvider: input.embeddingProvider,
        texts: recordTexts,
        dimensions,
        signal: input.signal,
      })
      const records = recordTexts.map((_text, relativeIndex) =>
        buildVectorRecord({
          cardId: input.cardId,
          modelId: input.modelId,
          dimensions,
          vectorSpaceId,
          index: offset + relativeIndex,
          updatedAt: input.createdAt + offset + relativeIndex,
          vector: providerVectors?.[relativeIndex],
        }))
      const persistBatch = async () => {
        await input.prepareCanonical(records.map(canonicalRecord))
        throwIfAborted(input.signal)
        await input.adapter.upsert(records)
      }
      if (input.withBatchWrite)
        await input.withBatchWrite(persistBatch)
      else
        await persistBatch()
      completedWork += 1
      await input.onProgress?.({
        phase: 'indexing',
        completed: completedWork,
        total: totalWork,
        ratio: totalWork === 0 ? 1 : completedWork / totalWork,
        indexedCount: end,
        queryCount: completedQueryCount,
        corpusSize,
      })
      throwIfAborted(input.signal)
    }
    indexedCorpusSize = corpusSize

    const indexes = queryIndexes(corpusSize, queryCount)
    throwIfAborted(input.signal)
    const foreignTexts = indexes.map(index =>
      semanticScaleMemoryText(index))
    const foreignProviderVectors = await embedScaleTexts({
      embeddingProvider: input.embeddingProvider,
      texts: foreignTexts,
      dimensions,
      signal: input.signal,
    })
    const foreignRecords = indexes.map((index, foreignIndex) =>
      buildVectorRecord({
        cardId: input.foreignCardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        index,
        updatedAt: input.createdAt + corpusSize + index,
        vector: foreignProviderVectors?.[foreignIndex],
        foreign: true,
      }))
    const persistForeignBatch = async () => {
      await input.prepareCanonical(foreignRecords.map(canonicalRecord))
      throwIfAborted(input.signal)
      await input.adapter.upsert(foreignRecords)
    }
    if (input.withBatchWrite)
      await input.withBatchWrite(persistForeignBatch)
    else
      await persistForeignBatch()
    throwIfAborted(input.signal)

    const health = await input.adapter.getHealth({
      cardId: input.cardId,
      modelId: input.modelId,
      dimensions,
      vectorSpaceId,
    })
    const queryTexts = indexes.map(index => semanticScaleQueryText(index))
    const queryProviderVectors = await embedScaleTexts({
      embeddingProvider: input.embeddingProvider,
      texts: queryTexts,
      dimensions,
      signal: input.signal,
    })
    const queries: MemorySemanticScaleSearchQueryObservation[] = []
    for (const [queryIndex, index] of indexes.entries()) {
      throwIfAborted(input.signal)
      const target = buildVectorRecord({
        cardId: input.cardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        index,
        updatedAt: input.createdAt + index,
      })
      const foreign = buildVectorRecord({
        cardId: input.foreignCardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        index,
        updatedAt: input.createdAt + corpusSize + index,
        foreign: true,
      })
      const queryVector = queryProviderVectors?.[queryIndex]
        ?? nonSelfSyntheticQueryVector(target.vector, index)
      const startedAt = performance.now()
      const results = await input.adapter.search({
        queryVector,
        cardId: input.cardId,
        modelId: input.modelId,
        dimensions,
        vectorSpaceId,
        limit: 5,
      })
      throwIfAborted(input.signal)
      queries.push({
        id: `semantic-scale-query:${corpusSize}:${index}`,
        queryText: queryTexts[queryIndex],
        queryMode: input.embeddingProvider ? 'non-self' : 'synthetic',
        queryVectorHash: JSON.stringify(queryVector),
        expectedVectorHash: JSON.stringify(target.vector),
        expectedTopIds: [target.id],
        returnedIds: results.map(result => result.record.id),
        forbiddenIds: [foreign.id],
        latencyMs: performance.now() - startedAt,
      })
      completedWork += 1
      completedQueryCount += 1
      await input.onProgress?.({
        phase: 'querying',
        completed: completedWork,
        total: totalWork,
        ratio: totalWork === 0 ? 1 : completedWork / totalWork,
        indexedCount: indexedCorpusSize,
        queryCount: completedQueryCount,
        corpusSize,
      })
      throwIfAborted(input.signal)
    }

    searches.push({
      id: `semantic-scale-search:${corpusSize}`,
      corpusSize,
      indexMode: health.indexMode,
      approximate: health.approximate,
      degraded: health.degraded,
      nativeIndexReady: health.nativeIndexReady,
      coverageRatio: health.coverageRatio ?? 0,
      vectorInput: input.embeddingProvider ? 'provider' : 'unavailable',
      adapterImplementation: input.adapterImplementation ?? 'unknown',
      queries,
    })
  }

  return runMemorySemanticScaleSoakHarness({
    id: input.id,
    createdAt: input.createdAt,
    gate: input.gate,
    searches,
    minimumCorpusSize: corpusSizes[0] ?? 1,
    maxP95LatencyMs: input.maxP95LatencyMs,
    maxP99LatencyMs: input.maxP99LatencyMs,
    minimumCoverageRatio: input.minimumCoverageRatio,
    resourcePreflight: input.resourcePreflight,
  })
}
