import type sqlite3 from 'sqlite3'

import type { MemorySemanticScaleJobExecutionInput } from './memory-semantic-scale-job-runtime'

import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite from 'sqlite3'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createMemorySemanticScaleJobRuntime,
} from './memory-semantic-scale-job-runtime'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'

interface SqliteHarness {
  database: sqlite3.Database
  run: (sql: string, params?: unknown[]) => Promise<{ changes: number, lastID: number }>
  get: <T>(sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(sql: string, params?: unknown[]) => Promise<T[]>
  close: () => Promise<void>
}

interface WriteQueue {
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}

const harnesses: SqliteHarness[] = []
const sandboxDirs: string[] = []

function createSqliteHarness(): Promise<SqliteHarness> {
  return new Promise((resolve, reject) => {
    const database = new sqlite.Database(':memory:', (error) => {
      if (error) {
        reject(error)
        return
      }

      const harness: SqliteHarness = {
        database,
        run: (sql, params = []) => new Promise((runResolve, runReject) => {
          database.run(sql, params, function onRun(runError) {
            if (runError) {
              runReject(runError)
              return
            }
            runResolve({ changes: this.changes, lastID: this.lastID })
          })
        }),
        get: (sql, params = []) => new Promise((getResolve, getReject) => {
          database.get(sql, params, (getError, row) => getError ? getReject(getError) : getResolve(row as any))
        }),
        all: (sql, params = []) => new Promise((allResolve, allReject) => {
          database.all(sql, params, (allError, rows) => allError ? allReject(allError) : allResolve((rows ?? []) as any))
        }),
        close: () => new Promise<void>((closeResolve, closeReject) => {
          database.close(error => error ? closeReject(error) : closeResolve())
        }),
      }
      harnesses.push(harness)
      resolve(harness)
    })
  })
}

function createWriteQueue(): WriteQueue {
  let writeQueue = Promise.resolve<unknown>(undefined)
  return {
    enqueueWrite: async <T>(task: () => Promise<T>) => {
      const next = writeQueue.then(task, task)
      writeQueue = next.then(() => undefined, () => undefined)
      return await next
    },
  }
}

function createReport(corpusSize: number, id = `semantic-scale-report-${corpusSize}`) {
  return runMemorySemanticScaleSoakHarness({
    id,
    createdAt: 1_000,
    minimumCorpusSize: corpusSize,
    searches: [{
      id: `${id}:search`,
      corpusSize,
      indexMode: 'sqlite-vec',
      approximate: false,
      degraded: false,
      nativeIndexReady: true,
      coverageRatio: 1,
      queries: [{
        id: `${id}:query`,
        expectedTopIds: ['target'],
        returnedIds: ['target'],
        forbiddenIds: ['foreign'],
        latencyMs: 1,
      }],
    }],
  })
}

function createFailedReport(corpusSize: number) {
  const report = createReport(corpusSize, 'semantic-scale-quality-failure')
  return {
    ...report,
    passed: false,
    summary: {
      ...report.summary,
      failingChecks: ['recall-at-k', 'p95-latency'],
    },
    recommendedNextActions: [
      'inspect sqlite-vec recall misses',
      'profile slow semantic queries',
    ],
  }
}

async function createTempRoot() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-semantic-scale-job-test-'))
  sandboxDirs.push(dir)
  return dir
}

function attachRuntime(
  harness: SqliteHarness,
  input: {
    now?: () => number
    executeJob?: (input: MemorySemanticScaleJobExecutionInput) => Promise<ReturnType<typeof createReport>>
    maxAttempts?: number
    leaseMs?: number
    retryBaseMs?: number
    retryMaxMs?: number
    tempRootDir: string
    createTempDir?: (input: {
      jobId: string
      tempRootDir: string
    }) => Promise<string>
    writeQueue?: WriteQueue
  },
) {
  const writeQueue = input.writeQueue ?? createWriteQueue()
  let uuid = 0
  const runtime = createMemorySemanticScaleJobRuntime({
    database: harness.database,
    now: input.now ?? (() => Date.now()),
    randomUUID: () => `semantic-job-uuid-${++uuid}`,
    run: async (_database, sql, params = []) => await harness.run(sql, params),
    get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.get<T>(sql, params),
    all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => await harness.all<T>(sql, params),
    enqueueWrite: writeQueue.enqueueWrite,
    runInTransaction: async <T>(_database: sqlite3.Database, task: () => Promise<T>) => {
      await harness.run('BEGIN IMMEDIATE')
      try {
        const result = await task()
        await harness.run('COMMIT')
        return result
      }
      catch (error) {
        await harness.run('ROLLBACK').catch(() => {})
        throw error
      }
    },
    executeJob: input.executeJob,
    maxAttempts: input.maxAttempts,
    leaseMs: input.leaseMs,
    retryBaseMs: input.retryBaseMs,
    retryMaxMs: input.retryMaxMs,
    tempRootDir: input.tempRootDir,
    createTempDir: input.createTempDir,
  })
  return { runtime, writeQueue }
}

async function createRuntimeHarness(input?: {
  now?: () => number
  executeJob?: (input: MemorySemanticScaleJobExecutionInput) => Promise<ReturnType<typeof createReport>>
  maxAttempts?: number
  leaseMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
  tempRootDir?: string
  createTempDir?: (input: {
    jobId: string
    tempRootDir: string
  }) => Promise<string>
}) {
  const harness = await createSqliteHarness()
  const tempRootDir = input?.tempRootDir ?? await createTempRoot()
  const attached = attachRuntime(harness, {
    ...input,
    tempRootDir,
  })
  await attached.runtime.initializeSchema()
  return {
    harness,
    tempRootDir,
    ...attached,
  }
}

async function waitFor(assertion: () => void, timeoutMs = 1_000) {
  const startedAt = Date.now()
  while (true) {
    try {
      assertion()
      return
    }
    catch (error) {
      if (Date.now() - startedAt >= timeoutMs)
        throw error
      await new Promise(resolve => setTimeout(resolve, 5))
    }
  }
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(harnesses.splice(0).map(harness => harness.close()))
  await Promise.all(sandboxDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('memory semantic scale job runtime', () => {
  it('persists queued, running progress, and a completed report while cleaning the isolated directory', async () => {
    let releaseExecution: (() => void) | undefined
    let progressPersisted: (() => void) | undefined
    const progressPersistedPromise = new Promise<void>((resolve) => {
      progressPersisted = resolve
    })
    const report = createReport(10_000)
    const { runtime, tempRootDir } = await createRuntimeHarness({
      executeJob: async (execution) => {
        await execution.onProgress({
          phase: 'indexing',
          completed: 10,
          total: 20,
          ratio: 0.5,
          indexedCount: 5_000,
          queryCount: 0,
          corpusSize: 10_000,
        })
        progressPersisted?.()
        await new Promise<void>((resolve) => {
          releaseExecution = resolve
        })
        return report
      },
    })

    const queued = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    expect(queued).toMatchObject({
      cardId: 'card-a',
      tier: '10k',
      corpusSize: 10_000,
      status: 'queued',
      deadLettered: false,
      attemptCount: 0,
      report: null,
    })

    const worker = runtime.runJob(queued.jobId)
    await progressPersistedPromise
    const running = await runtime.getJob(queued.jobId, 'card-a')

    expect(running.status).toBe('running')
    expect(running.attemptCount).toBe(1)
    expect(running.leaseExpiresAt).not.toBeNull()
    expect(running.progress).toMatchObject({
      phase: 'indexing',
      ratio: 0.5,
      indexedCount: 5_000,
    })
    expect(await readdir(tempRootDir)).toHaveLength(1)

    releaseExecution?.()
    await worker

    const completed = await runtime.getJob(queued.jobId, 'card-a')
    expect(completed.status).toBe('completed')
    expect(completed.deadLettered).toBe(false)
    expect(completed.progress.ratio).toBe(1)
    expect(completed.report).toEqual(report)
    expect(completed.completedAt).not.toBeNull()
    expect(completed.leaseExpiresAt).toBeNull()
    expect(await readdir(tempRootDir)).toEqual([])
  })

  it('retries and dead-letters a job when its temporary directory cannot be created', async () => {
    let now = 1_000
    const sandboxDir = await createTempRoot()
    const blockedTempRoot = join(sandboxDir, 'not-a-directory')
    await writeFile(blockedTempRoot, 'blocks mkdir')
    const { runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 2,
      retryBaseMs: 10,
      tempRootDir: blockedTempRoot,
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const retryable = await runtime.runNextAttempt(job.jobId)
    expect(retryable).toMatchObject({
      status: 'queued',
      attemptCount: 1,
      deadLettered: false,
      nextRetryAt: 1_010,
      lastError: expect.stringContaining('EEXIST'),
    })

    now = 1_010
    const deadLettered = await runtime.runNextAttempt(job.jobId)
    expect(deadLettered).toMatchObject({
      status: 'failed',
      attemptCount: 2,
      deadLettered: true,
      nextRetryAt: null,
      lastError: expect.stringContaining('EEXIST'),
    })
  })

  it('propagates cancellation through AbortSignal and settles the running job as cancelled', async () => {
    let observedSignal: AbortSignal | undefined
    let executionStarted: (() => void) | undefined
    const executionStartedPromise = new Promise<void>((resolve) => {
      executionStarted = resolve
    })
    const { runtime, tempRootDir } = await createRuntimeHarness({
      executeJob: async ({ signal }) => {
        observedSignal = signal
        executionStarted?.()
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
        return createReport(10_000)
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const worker = runtime.runJob(job.jobId)
    await executionStartedPromise
    const requested = await runtime.requestCancel(job.jobId, '用户取消语义规模压测', 'card-a')

    expect(requested.status).toBe('cancel_requested')
    await worker

    const cancelled = await runtime.getJob(job.jobId, 'card-a')
    expect(observedSignal?.aborted).toBe(true)
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.deadLettered).toBe(false)
    expect(cancelled.lastError).toBe('用户取消语义规模压测')
    expect(cancelled.completedAt).not.toBeNull()
    expect(await readdir(tempRootDir)).toEqual([])
  })

  it('preserves cancellation requested after claim but before the executor starts', async () => {
    let releaseTempCreation: (() => void) | undefined
    let tempCreationStarted: (() => void) | undefined
    let observedSignal: AbortSignal | undefined
    const releaseTempCreationPromise = new Promise<void>((resolve) => {
      releaseTempCreation = resolve
    })
    const tempCreationStartedPromise = new Promise<void>((resolve) => {
      tempCreationStarted = resolve
    })
    const { runtime } = await createRuntimeHarness({
      createTempDir: async ({ tempRootDir }) => {
        tempCreationStarted?.()
        await releaseTempCreationPromise
        return await mkdtemp(join(tempRootDir, 'cancel-race-'))
      },
      executeJob: async ({ corpusSize, signal }) => {
        observedSignal = signal
        if (signal.aborted)
          throw signal.reason
        return createReport(corpusSize)
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const attempt = runtime.runNextAttempt(job.jobId)
    await tempCreationStartedPromise
    const requested = await runtime.requestCancel(job.jobId, 'cancel during temp setup', 'card-a')
    expect(requested.status).toBe('cancel_requested')

    releaseTempCreation?.()
    await attempt

    expect(observedSignal?.aborted).toBe(true)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'cancelled',
      lastError: 'cancel during temp setup',
    })
  })

  it('preserves stop requested after claim but before the executor starts', async () => {
    let releaseTempCreation: (() => void) | undefined
    let tempCreationStarted: (() => void) | undefined
    let observedSignal: AbortSignal | undefined
    const releaseTempCreationPromise = new Promise<void>((resolve) => {
      releaseTempCreation = resolve
    })
    const tempCreationStartedPromise = new Promise<void>((resolve) => {
      tempCreationStarted = resolve
    })
    const { runtime } = await createRuntimeHarness({
      createTempDir: async ({ tempRootDir }) => {
        tempCreationStarted?.()
        await releaseTempCreationPromise
        return await mkdtemp(join(tempRootDir, 'stop-race-'))
      },
      executeJob: async ({ corpusSize, signal }) => {
        observedSignal = signal
        if (signal.aborted)
          throw signal.reason
        return createReport(corpusSize)
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const worker = runtime.runJob(job.jobId)
    await tempCreationStartedPromise
    const stopping = runtime.stop()
    releaseTempCreation?.()
    await Promise.all([worker, stopping])

    expect(observedSignal?.aborted).toBe(true)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'queued',
      attemptCount: 1,
      deadLettered: false,
    })
  })

  it('applies exponential retry backoff and dead-letters the job at maxAttempts', async () => {
    let now = 1_000
    const { runtime, tempRootDir } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 3,
      retryBaseMs: 10,
      retryMaxMs: 1_000,
      executeJob: async () => {
        throw new Error('sqlite-vec soak failed')
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '100k' })

    await runtime.runNextAttempt(job.jobId)
    let failed = await runtime.getJob(job.jobId, 'card-a')
    expect(failed).toMatchObject({
      status: 'queued',
      attemptCount: 1,
      deadLettered: false,
      nextRetryAt: 1_010,
      lastError: 'sqlite-vec soak failed',
    })

    now = 1_010
    await runtime.runNextAttempt(job.jobId)
    failed = await runtime.getJob(job.jobId, 'card-a')
    expect(failed.attemptCount).toBe(2)
    expect(failed.nextRetryAt).toBe(1_030)

    now = 1_030
    await runtime.runNextAttempt(job.jobId)
    failed = await runtime.getJob(job.jobId, 'card-a')
    expect(failed).toMatchObject({
      status: 'failed',
      attemptCount: 3,
      maxAttempts: 3,
      deadLettered: true,
      nextRetryAt: null,
      lastError: 'sqlite-vec soak failed',
    })
    expect(failed.completedAt).toBe(1_030)
    expect(await readdir(tempRootDir)).toEqual([])
  })

  it('retries a failed quality report and preserves its diagnostics through dead-letter', async () => {
    let now = 1_000
    const qualityFailure = createFailedReport(10_000)
    const { runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 2,
      retryBaseMs: 10,
      executeJob: async () => qualityFailure,
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const retryable = await runtime.runNextAttempt(job.jobId)
    expect(retryable).toMatchObject({
      status: 'queued',
      attemptCount: 1,
      deadLettered: false,
      nextRetryAt: 1_010,
      report: {
        passed: false,
        summary: {
          failingChecks: ['recall-at-k', 'p95-latency'],
        },
        recommendedNextActions: [
          'inspect sqlite-vec recall misses',
          'profile slow semantic queries',
        ],
      },
      lastError: expect.stringContaining('recall-at-k'),
    })

    now = 1_010
    const deadLettered = await runtime.runNextAttempt(job.jobId)
    expect(deadLettered).toMatchObject({
      status: 'failed',
      attemptCount: 2,
      deadLettered: true,
      nextRetryAt: null,
      report: {
        passed: false,
        summary: {
          failingChecks: ['recall-at-k', 'p95-latency'],
        },
      },
      lastError: expect.stringContaining('p95-latency'),
    })
  })

  it('keeps the latest failed quality report when a later retry throws operationally', async () => {
    let now = 1_000
    let executions = 0
    const qualityFailure = createFailedReport(10_000)
    const { runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 2,
      retryBaseMs: 10,
      executeJob: async () => {
        executions += 1
        if (executions === 1)
          return qualityFailure
        throw new Error('temporary sqlite write failure')
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    await runtime.runNextAttempt(job.jobId)
    now = 1_010
    const deadLettered = await runtime.runNextAttempt(job.jobId)

    expect(deadLettered).toMatchObject({
      status: 'failed',
      deadLettered: true,
      lastError: 'temporary sqlite write failure',
      report: {
        id: qualityFailure.id,
        passed: false,
        summary: {
          failingChecks: ['recall-at-k', 'p95-latency'],
        },
      },
    })
  })

  it('automatically retries a transient failure after its backoff', async () => {
    let executions = 0
    const { runtime } = await createRuntimeHarness({
      retryBaseMs: 5,
      executeJob: async () => {
        executions += 1
        if (executions === 1)
          throw new Error('transient sqlite-vec failure')
        return createReport(10_000, 'automatic-retry-report')
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    await runtime.runJob(job.jobId)

    expect(executions).toBe(2)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 2,
      nextRetryAt: null,
      lastError: null,
      report: {
        id: 'automatic-retry-report',
      },
    })
  })

  it('allows a user to retry a dead-lettered job and automatically completes it', async () => {
    let shouldFail = true
    const { runtime } = await createRuntimeHarness({
      maxAttempts: 1,
      retryBaseMs: 1,
      executeJob: async () => {
        if (shouldFail)
          throw new Error('temporary scale soak failure')
        return createReport(10_000, 'retried-report')
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    await runtime.runNextAttempt(job.jobId)
    expect((await runtime.getJob(job.jobId, 'card-a')).deadLettered).toBe(true)

    const retried = await runtime.retryJob(job.jobId, 'card-a')
    expect(retried).toMatchObject({
      status: 'queued',
      attemptCount: 0,
      deadLettered: false,
      nextRetryAt: null,
      lastError: null,
    })

    shouldFail = false
    await runtime.runJob(job.jobId)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      report: {
        id: 'retried-report',
      },
    })
  })

  it('recovers an expired lease after restart and resumes the persisted job', async () => {
    let now = 1_000
    const { harness, runtime, tempRootDir, writeQueue } = await createRuntimeHarness({
      now: () => now,
      retryBaseMs: 10,
      executeJob: async () => createReport(10_000),
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    await harness.run(`
      UPDATE memory_semantic_scale_jobs
      SET status = 'running', attempt_count = 1, lease_token = 'crashed-worker',
          lease_expires_at = 999, started_at = 900
      WHERE id = ?
    `, [job.jobId])

    const restarted = attachRuntime(harness, {
      now: () => now,
      retryBaseMs: 10,
      tempRootDir,
      writeQueue,
      executeJob: async () => createReport(10_000, 'recovered-report'),
    })
    await restarted.runtime.initializeSchema()
    const recovered = await restarted.runtime.getJob(job.jobId, 'card-a')

    expect(recovered).toMatchObject({
      status: 'queued',
      attemptCount: 1,
      nextRetryAt: 1_010,
      lastError: expect.stringContaining('lease expired'),
    })

    now = 1_010
    expect(await restarted.runtime.resumePendingJobs('card-a')).toEqual([job.jobId])
    await waitFor(() => {
      expect(restarted.runtime.activeJobIds()).toEqual([])
    })
    expect(await restarted.runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 2,
      report: {
        id: 'recovered-report',
      },
    })
  })

  it('waits for an unexpired crash lease and automatically takes over after it expires', async () => {
    const { harness, runtime, tempRootDir, writeQueue } = await createRuntimeHarness({
      executeJob: async () => createReport(10_000),
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const leaseExpiresAt = Date.now() + 30
    await harness.run(`
      UPDATE memory_semantic_scale_jobs
      SET status = 'running', attempt_count = 1, lease_token = 'crashed-worker',
          lease_expires_at = ?, started_at = ?
      WHERE id = ?
    `, [leaseExpiresAt, Date.now(), job.jobId])

    const restarted = attachRuntime(harness, {
      now: () => Date.now(),
      retryBaseMs: 1,
      tempRootDir,
      writeQueue,
      executeJob: async () => createReport(10_000, 'delayed-recovery-report'),
    })
    await restarted.runtime.initializeSchema()
    expect((await restarted.runtime.getJob(job.jobId, 'card-a')).status).toBe('running')

    expect(await restarted.runtime.resumePendingJobs('card-a')).toEqual([job.jobId])
    await waitFor(() => {
      expect(restarted.runtime.activeJobIds()).toEqual([])
    })
    expect(await restarted.runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 2,
      report: {
        id: 'delayed-recovery-report',
      },
    })
  })

  it('renews the lease without progress so a second runtime cannot execute the same job', async () => {
    let releaseExecution: (() => void) | undefined
    let executionStarted: (() => void) | undefined
    const executionStartedPromise = new Promise<void>((resolve) => {
      executionStarted = resolve
    })
    const executionReleasedPromise = new Promise<void>((resolve) => {
      releaseExecution = resolve
    })
    const executions: string[] = []
    const { harness, runtime, tempRootDir, writeQueue } = await createRuntimeHarness({
      leaseMs: 30,
      retryBaseMs: 1,
      executeJob: async ({ corpusSize }) => {
        executions.push('runtime-a')
        executionStarted?.()
        await executionReleasedPromise
        return createReport(corpusSize, 'heartbeat-runtime-a')
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const firstWorker = runtime.runJob(job.jobId)
    await executionStartedPromise

    await new Promise(resolve => setTimeout(resolve, 80))
    const restarted = attachRuntime(harness, {
      leaseMs: 30,
      retryBaseMs: 1,
      tempRootDir,
      writeQueue,
      executeJob: async ({ corpusSize }) => {
        executions.push('runtime-b')
        return createReport(corpusSize, 'heartbeat-runtime-b')
      },
    })
    await restarted.runtime.initializeSchema()
    const resumed = await restarted.runtime.resumePendingJobs('card-a')
    await new Promise(resolve => setTimeout(resolve, 50))
    const executionsBeforeRelease = [...executions]

    releaseExecution?.()
    await firstWorker
    await waitFor(() => {
      expect(restarted.runtime.activeJobIds()).toEqual([])
    })

    expect(resumed).toEqual([job.jobId])
    expect(executionsBeforeRelease).toEqual(['runtime-a'])
    expect(executions).toEqual(['runtime-a'])
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      report: {
        id: 'heartbeat-runtime-a',
      },
    })
  })

  it('runs only one active worker for the same job', async () => {
    let executions = 0
    let releaseExecution: (() => void) | undefined
    let executionStarted: (() => void) | undefined
    const executionStartedPromise = new Promise<void>((resolve) => {
      executionStarted = resolve
    })
    const { runtime } = await createRuntimeHarness({
      executeJob: async () => {
        executions += 1
        executionStarted?.()
        await new Promise<void>((resolve) => {
          releaseExecution = resolve
        })
        return createReport(10_000)
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const first = runtime.runJob(job.jobId)
    const second = runtime.runJob(job.jobId)
    expect(second).toBe(first)

    await executionStartedPromise
    expect(executions).toBe(1)
    releaseExecution?.()
    await Promise.all([first, second])
    expect(executions).toBe(1)
  })

  it('executes different queued jobs through one global runtime worker', async () => {
    let activeExecutions = 0
    let maximumConcurrency = 0
    const executionOrder: string[] = []
    const releases = new Map<string, () => void>()
    const { runtime } = await createRuntimeHarness({
      executeJob: async (execution) => {
        executionOrder.push(execution.jobId)
        activeExecutions += 1
        maximumConcurrency = Math.max(maximumConcurrency, activeExecutions)
        await new Promise<void>((resolve) => {
          releases.set(execution.jobId, resolve)
        })
        activeExecutions -= 1
        return createReport(execution.corpusSize, `global-worker:${execution.jobId}`)
      },
    })
    const firstJob = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const secondJob = await runtime.startJob({ cardId: 'card-a', tier: '100k' })

    expect(await runtime.resumePendingJobs('card-a')).toEqual([
      firstJob.jobId,
      secondJob.jobId,
    ])
    await waitFor(() => {
      expect(executionOrder).toHaveLength(1)
    })
    expect(executionOrder).toEqual([firstJob.jobId])
    expect(maximumConcurrency).toBe(1)

    releases.get(firstJob.jobId)?.()
    await waitFor(() => {
      expect(executionOrder).toEqual([firstJob.jobId, secondJob.jobId])
    })
    expect(maximumConcurrency).toBe(1)

    releases.get(secondJob.jobId)?.()
    await waitFor(() => {
      expect(runtime.activeJobIds()).toEqual([])
    })
    expect(maximumConcurrency).toBe(1)
    expect(await runtime.getJob(firstJob.jobId, 'card-a')).toMatchObject({ status: 'completed' })
    expect(await runtime.getJob(secondJob.jobId, 'card-a')).toMatchObject({ status: 'completed' })
  })

  it('rejects status, cancellation, and retry access from another card', async () => {
    const { runtime } = await createRuntimeHarness({
      maxAttempts: 1,
      executeJob: async () => {
        throw new Error('dead letter for scope test')
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    await runtime.runNextAttempt(job.jobId)

    await expect(runtime.getJob(job.jobId, 'card-b')).rejects.toThrow('does not belong to card')
    await expect(runtime.requestCancel(job.jobId, undefined, 'card-b')).rejects.toThrow('does not belong to card')
    await expect(runtime.retryJob(job.jobId, 'card-b')).rejects.toThrow('does not belong to card')
    await expect(runtime.listJobs('card-b')).resolves.toEqual([])
  })

  it('lists card-scoped history and returns only the latest completed report', async () => {
    const { runtime } = await createRuntimeHarness({
      executeJob: async execution => createReport(
        execution.corpusSize,
        `${execution.cardId}:${execution.tier}:${execution.jobId}`,
      ),
    })
    const first = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    await runtime.runJob(first.jobId)
    const second = await runtime.startJob({ cardId: 'card-a', tier: '100k' })
    await runtime.runJob(second.jobId)
    await runtime.startJob({ cardId: 'card-b', tier: '10k' })

    const history = await runtime.listJobs('card-a')
    const latest = await runtime.getLatestCompletedReport('card-a')

    expect(history.map(job => job.jobId)).toEqual([second.jobId, first.jobId])
    expect(history.every(job => job.cardId === 'card-a')).toBe(true)
    expect(latest?.jobId).toBe(second.jobId)
    expect(latest?.report.id).toContain('card-a:100k')
  })
})
