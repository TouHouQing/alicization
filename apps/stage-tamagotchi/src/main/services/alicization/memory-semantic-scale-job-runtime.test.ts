import type sqlite3 from 'sqlite3'

import type { MemorySemanticScaleJobExecutionInput } from './memory-semantic-scale-job-runtime'

import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
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
    stopTimeoutMs?: number
    recoveryJournalDir?: string
    tempRootDir: string
    createTempDir?: (input: {
      jobId: string
      tempRootDir: string
    }) => Promise<string>
    removeTempDir?: (path: string) => Promise<void>
    run?: (sql: string, params?: unknown[]) => Promise<unknown>
    get?: <T>(sql: string, params?: unknown[]) => Promise<T | undefined>
    writeQueue?: WriteQueue
  },
) {
  const writeQueue = input.writeQueue ?? createWriteQueue()
  let uuid = 0
  const runtime = createMemorySemanticScaleJobRuntime({
    database: harness.database,
    now: input.now ?? (() => Date.now()),
    randomUUID: () => `semantic-job-uuid-${++uuid}`,
    run: async (_database, sql, params = []) => input.run
      ? await input.run(sql, params)
      : await harness.run(sql, params),
    get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) => input.get
      ? await input.get<T>(sql, params)
      : await harness.get<T>(sql, params),
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
    stopTimeoutMs: input.stopTimeoutMs,
    recoveryJournalDir: input.recoveryJournalDir
      ?? join(input.tempRootDir, 'stop-recovery-journal'),
    tempRootDir: input.tempRootDir,
    createTempDir: input.createTempDir,
    removeTempDir: input.removeTempDir,
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
  stopTimeoutMs?: number
  recoveryJournalDir?: string
  tempRootDir?: string
  createTempDir?: (input: {
    jobId: string
    tempRootDir: string
  }) => Promise<string>
  removeTempDir?: (path: string) => Promise<void>
  run?: (sql: string, params?: unknown[]) => Promise<unknown>
}) {
  const harness = await createSqliteHarness()
  const tempRootDir = input?.tempRootDir ?? await createTempRoot()
  const recoveryJournalDir = input?.recoveryJournalDir
    ?? join(await createTempRoot(), 'stop-recovery-journal')
  const attached = attachRuntime(harness, {
    ...input,
    recoveryJournalDir,
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
      attemptCount: 0,
      deadLettered: false,
    })
  })

  it('tracks a public runNextAttempt and prevents settlement writes after the stop deadline', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let releaseExecution: (() => void) | undefined
    let executionStarted: (() => void) | undefined
    let stopReturned = false
    let postStopJobUpdates = 0
    const executionStartedPromise = new Promise<void>((resolve) => {
      executionStarted = resolve
    })
    const { runtime } = attachRuntime(harness, {
      stopTimeoutMs: 30,
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          stopReturned
          && /^\s*UPDATE memory_semantic_scale_jobs\b/.test(sql)
        ) {
          postStopJobUpdates += 1
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executionStarted?.()
        await new Promise<void>((resolve) => {
          releaseExecution = resolve
        })
        return createReport(corpusSize, 'late-public-attempt-report')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const attempt = runtime.runNextAttempt(job.jobId)
    await executionStartedPromise

    const startedAt = Date.now()
    await runtime.stop()
    const elapsedMs = Date.now() - startedAt
    stopReturned = true

    expect(elapsedMs).toBeGreaterThanOrEqual(20)
    expect(elapsedMs).toBeLessThan(250)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'queued',
      attemptCount: 0,
    })

    releaseExecution?.()
    await attempt

    expect(postStopJobUpdates).toBe(0)
  })

  it('bounds stop when a runJob executor ignores abort', async () => {
    let executionStarted: (() => void) | undefined
    const executionStartedPromise = new Promise<void>((resolve) => {
      executionStarted = resolve
    })
    const { runtime } = await createRuntimeHarness({
      stopTimeoutMs: 30,
      executeJob: async () => {
        executionStarted?.()
        return await new Promise<ReturnType<typeof createReport>>(() => {})
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    void runtime.runJob(job.jobId)
    await executionStartedPromise

    const stopResult = await Promise.race([
      runtime.stop().then(() => 'stopped' as const),
      new Promise<'timed-out'>(resolve =>
        setTimeout(() => resolve('timed-out'), 250)),
    ])

    expect(stopResult).toBe('stopped')
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'queued',
      attemptCount: 0,
    })
  })

  it('rejects stop when a tracked public attempt rejects before a claim is established', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let claimReadStarted: (() => void) | undefined
    let releaseClaimRead: (() => void) | undefined
    const claimReadStartedPromise = new Promise<void>((resolve) => {
      claimReadStarted = resolve
    })
    const releaseClaimReadPromise = new Promise<void>((resolve) => {
      releaseClaimRead = resolve
    })
    let failClaimRead = false
    const { runtime } = attachRuntime(harness, {
      stopTimeoutMs: 100,
      tempRootDir,
      get: async <T>(sql: string, params: unknown[] = []) => {
        if (
          failClaimRead
          && sql.trim() === 'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?'
        ) {
          claimReadStarted?.()
          await releaseClaimReadPromise
          throw new Error('tracked public attempt claim read failed')
        }
        return await harness.get<T>(sql, params)
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    failClaimRead = true
    const attempt = runtime.runNextAttempt(job.jobId)
    await claimReadStartedPromise

    const stopping = runtime.stop()
    releaseClaimRead?.()

    await expect(attempt).rejects.toThrow('tracked public attempt claim read failed')
    await expect(stopping).rejects.toThrow(
      'semantic scale runtime stop could not establish a safe recovery boundary',
    )
  })

  it('does not consume failure attempts across repeated stop and resume cycles', async () => {
    let firstExecutionStarted: (() => void) | undefined
    const firstExecutionStartedPromise = new Promise<void>((resolve) => {
      firstExecutionStarted = resolve
    })
    const { harness, runtime, tempRootDir, writeQueue } = await createRuntimeHarness({
      maxAttempts: 2,
      executeJob: async ({ signal }) => {
        firstExecutionStarted?.()
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
        return createReport(10_000)
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const firstWorker = runtime.runJob(job.jobId)
    await firstExecutionStartedPromise
    await runtime.stop()
    await firstWorker
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'queued',
      attemptCount: 0,
      maxAttempts: 2,
    })

    let secondExecutionStarted: (() => void) | undefined
    const secondExecutionStartedPromise = new Promise<void>((resolve) => {
      secondExecutionStarted = resolve
    })
    const restarted = attachRuntime(harness, {
      maxAttempts: 2,
      tempRootDir,
      writeQueue,
      executeJob: async ({ signal }) => {
        secondExecutionStarted?.()
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
        return createReport(10_000)
      },
    })
    await restarted.runtime.initializeSchema()
    expect(await restarted.runtime.resumePendingJobs('card-a')).toEqual([job.jobId])
    await secondExecutionStartedPromise
    await restarted.runtime.stop()
    expect(await restarted.runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'queued',
      attemptCount: 0,
      maxAttempts: 2,
    })

    const resumed = attachRuntime(harness, {
      maxAttempts: 2,
      tempRootDir,
      writeQueue,
      executeJob: async ({ corpusSize }) =>
        createReport(corpusSize, 'completed-after-stop-resume'),
    })
    await resumed.runtime.initializeSchema()
    expect(await resumed.runtime.resumePendingJobs('card-a')).toEqual([job.jobId])
    await waitFor(() => {
      expect(resumed.runtime.activeJobIds()).toEqual([])
    })
    expect(await resumed.runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      maxAttempts: 2,
      report: {
        id: 'completed-after-stop-resume',
      },
    })
  })

  it('dead-letters an exhausted queued job without claiming beyond maxAttempts', async () => {
    let executions = 0
    const { harness, runtime } = await createRuntimeHarness({
      maxAttempts: 2,
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize)
      },
    })
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    await harness.run(`
      UPDATE memory_semantic_scale_jobs
      SET status = 'queued', attempt_count = max_attempts
      WHERE id = ?
    `, [job.jobId])

    await runtime.runJob(job.jobId)

    expect(executions).toBe(0)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'failed',
      deadLettered: true,
      attemptCount: 2,
      maxAttempts: 2,
      lastError: expect.stringContaining('max attempts'),
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

  it('retries a lease heartbeat failure instead of reporting a user cancellation', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let heartbeatWriteFailed = false
    const { runtime } = attachRuntime(harness, {
      leaseMs: 15,
      maxAttempts: 2,
      retryBaseMs: 1,
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          !heartbeatWriteFailed
          && sql.includes('SET lease_expires_at = ?, updated_at = ?')
        ) {
          heartbeatWriteFailed = true
          throw new Error('lease heartbeat persistence failed')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ signal }) => await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      }),
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const result = await runtime.runNextAttempt(job.jobId)

    expect(heartbeatWriteFailed).toBe(true)
    expect(result).toMatchObject({
      status: 'queued',
      deadLettered: false,
      attemptCount: 1,
      lastError: 'lease heartbeat persistence failed',
    })
    expect(result.nextRetryAt).not.toBeNull()
  })

  it('retries when the lease heartbeat fails after the executor returns a successful report', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let cleanupStarted = false
    let heartbeatWriteFailed = false
    let releaseCleanup: (() => void) | undefined
    const heartbeatFailedPromise = new Promise<void>((resolve) => {
      releaseCleanup = resolve
    })
    const { runtime } = attachRuntime(harness, {
      leaseMs: 15,
      maxAttempts: 2,
      retryBaseMs: 1,
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          cleanupStarted
          && !heartbeatWriteFailed
          && sql.includes('SET lease_expires_at = ?, updated_at = ?')
        ) {
          heartbeatWriteFailed = true
          releaseCleanup?.()
          throw new Error('lease heartbeat failed after report')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) =>
        createReport(corpusSize, 'successful-report-before-heartbeat-failure'),
      removeTempDir: async (path) => {
        cleanupStarted = true
        await heartbeatFailedPromise
        await rm(path, { recursive: true, force: true })
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    const result = await runtime.runNextAttempt(job.jobId)

    expect(cleanupStarted).toBe(true)
    expect(heartbeatWriteFailed).toBe(true)
    expect(result).toMatchObject({
      status: 'queued',
      deadLettered: false,
      attemptCount: 1,
      lastError: 'lease heartbeat failed after report',
      report: {
        id: 'successful-report-before-heartbeat-failure',
      },
    })
  })

  it('keeps the worker scheduled after a transient getJob read failure', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let failNextJobRead = false
    let executions = 0
    const { runtime } = attachRuntime(harness, {
      tempRootDir,
      get: async <T>(sql: string, params: unknown[] = []) => {
        if (
          failNextJobRead
          && sql.trim() === 'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?'
        ) {
          failNextJobRead = false
          throw new Error('transient worker job read failure')
        }
        return await harness.get<T>(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'worker-read-recovered')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    failNextJobRead = true

    await expect(runtime.runJob(job.jobId)).resolves.toBeUndefined()

    expect(executions).toBe(1)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      report: {
        id: 'worker-read-recovered',
      },
    })
  })

  it('keeps the worker scheduled after a transient claim read failure', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let armed = false
    let jobReadCount = 0
    let executions = 0
    const { runtime } = attachRuntime(harness, {
      tempRootDir,
      get: async <T>(sql: string, params: unknown[] = []) => {
        if (
          armed
          && sql.trim() === 'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?'
        ) {
          jobReadCount += 1
          if (jobReadCount === 2)
            throw new Error('transient claim read failure')
        }
        return await harness.get<T>(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'claim-read-recovered')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    armed = true

    await expect(runtime.runJob(job.jobId)).resolves.toBeUndefined()

    expect(executions).toBe(1)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      report: {
        id: 'claim-read-recovered',
      },
    })
  })

  it('retries settlement with the in-memory report after a transient SQLite write failure', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let failCompletionWrite = true
    let executions = 0
    const { runtime } = attachRuntime(harness, {
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          failCompletionWrite
          && sql.includes(`SET status = 'completed'`)
        ) {
          failCompletionWrite = false
          throw new Error('transient completion persistence failure')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'settlement-report-preserved')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    await expect(runtime.runJob(job.jobId)).resolves.toBeUndefined()

    expect(failCompletionWrite).toBe(false)
    expect(executions).toBe(1)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      lastError: null,
      report: {
        id: 'settlement-report-preserved',
      },
    })
  })

  it('keeps the in-memory report beyond a fixed retry count without rerunning the executor', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let remainingCompletionFailures = 5
    let executions = 0
    const { runtime } = attachRuntime(harness, {
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          remainingCompletionFailures > 0
          && sql.includes(`SET status = 'completed'`)
        ) {
          remainingCompletionFailures -= 1
          throw new Error('transient completion persistence failure')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'settlement-report-survives-retries')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    await expect(runtime.runJob(job.jobId)).resolves.toBeUndefined()

    expect(remainingCompletionFailures).toBe(0)
    expect(executions).toBe(1)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      lastError: null,
      report: {
        id: 'settlement-report-survives-retries',
      },
    })
  })

  it('renews the claimed lease while retrying settlement with an in-memory report', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let remainingCompletionFailures = 2
    let settlementLeaseRenewals = 0
    const { runtime } = attachRuntime(harness, {
      leaseMs: 60,
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          remainingCompletionFailures > 0
          && sql.includes(`SET status = 'completed'`)
        ) {
          remainingCompletionFailures -= 1
          throw new Error('transient completion persistence failure')
        }
        if (
          sql.includes('SET lease_expires_at = ?, updated_at = ?')
          && sql.includes(`status = 'running' AND lease_token = ?`)
        ) {
          settlementLeaseRenewals += 1
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) =>
        createReport(corpusSize, 'settlement-lease-renewal'),
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })

    await runtime.runJob(job.jobId)

    expect(remainingCompletionFailures).toBe(0)
    expect(settlementLeaseRenewals).toBeGreaterThan(0)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      report: {
        id: 'settlement-lease-renewal',
      },
    })
  })

  it('settles a successful report normally when stop races with completion persistence', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let failCompletionWrites = true
    let failNextStopRequeue = true
    let completionSettlementAttempts = 0
    let executions = 0
    const { runtime } = attachRuntime(harness, {
      tempRootDir,
      run: async (sql, params = []) => {
        if (failCompletionWrites && sql.includes(`SET status = 'completed'`)) {
          completionSettlementAttempts += 1
          throw new Error('completion persistence unavailable before stop')
        }
        if (
          failNextStopRequeue
          && sql.includes(`SET status = 'queued', dead_lettered = 0`)
        ) {
          failNextStopRequeue = false
          throw new Error('transient stop requeue persistence failure')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'stop-requeue-report')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const worker = runtime.runJob(job.jobId)
    await waitFor(() => {
      expect(completionSettlementAttempts).toBeGreaterThan(0)
    })

    failCompletionWrites = false
    await runtime.stop()
    await worker

    expect(failNextStopRequeue).toBe(true)
    expect(executions).toBe(1)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      deadLettered: false,
      report: {
        id: 'stop-requeue-report',
      },
    })
  })

  it('consumes a determinate failure attempt when stop races with retry settlement', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let releaseFailureSettlement: (() => void) | undefined
    let failureSettlementStarted: (() => void) | undefined
    let failFailureWrite = true
    let executions = 0
    const failureSettlementStartedPromise = new Promise<void>((resolve) => {
      failureSettlementStarted = resolve
    })
    const releaseFailureSettlementPromise = new Promise<void>((resolve) => {
      releaseFailureSettlement = resolve
    })
    const { runtime } = attachRuntime(harness, {
      maxAttempts: 1,
      stopTimeoutMs: 100,
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          failFailureWrite
          && sql.includes(`SET status = ?, dead_lettered = ?`)
        ) {
          failFailureWrite = false
          failureSettlementStarted?.()
          await releaseFailureSettlementPromise
          throw new Error('failure settlement unavailable before stop')
        }
        return await harness.run(sql, params)
      },
      executeJob: async () => {
        executions += 1
        throw new Error('determinate sqlite-vec execution failure')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const worker = runtime.runJob(job.jobId)
    await failureSettlementStartedPromise

    const stopping = runtime.stop()
    releaseFailureSettlement?.()
    await Promise.all([stopping, worker])

    expect(executions).toBe(1)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'failed',
      attemptCount: 1,
      maxAttempts: 1,
      deadLettered: true,
      lastError: 'determinate sqlite-vec execution failure',
    })
  })

  it('does not use the stop requeue path after the executor has produced a successful report', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    const writeQueue = createWriteQueue()
    let now = 1_000
    let failCompletionWrites = true
    let remainingStopRequeueFailures = 3
    let completionSettlementAttempts = 0
    let executions = 0
    const { runtime } = attachRuntime(harness, {
      now: () => now,
      maxAttempts: 1,
      leaseMs: 50,
      retryBaseMs: 1,
      tempRootDir,
      writeQueue,
      run: async (sql, params = []) => {
        if (failCompletionWrites && sql.includes(`SET status = 'completed'`)) {
          completionSettlementAttempts += 1
          throw new Error('completion persistence unavailable before stop')
        }
        if (
          remainingStopRequeueFailures > 0
          && sql.includes(`SET status = 'queued', dead_lettered = 0`)
        ) {
          remainingStopRequeueFailures -= 1
          throw new Error('transient stop requeue persistence failure')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'stop-recovery-attempt-budget')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const worker = runtime.runJob(job.jobId)
    await waitFor(() => {
      expect(completionSettlementAttempts).toBeGreaterThan(0)
    })

    failCompletionWrites = false
    await runtime.stop()
    await worker
    expect(remainingStopRequeueFailures).toBe(3)
    expect(executions).toBe(1)

    now = 2_000
    const restarted = attachRuntime(harness, {
      now: () => now,
      maxAttempts: 1,
      leaseMs: 50,
      retryBaseMs: 1,
      tempRootDir,
      writeQueue,
      executeJob: async ({ corpusSize }) =>
        createReport(corpusSize, 'completed-after-stop-recovery'),
    })
    await restarted.runtime.initializeSchema()

    expect(await restarted.runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      maxAttempts: 1,
      deadLettered: false,
      report: {
        id: 'stop-recovery-attempt-budget',
      },
    })
    expect(await restarted.runtime.resumePendingJobs('card-a')).toEqual([])
    expect(executions).toBe(1)
  })

  it('replays a durable stop journal when every job update fails during bounded shutdown', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    const recoveryJournalDir = join(tempRootDir, 'stop-recovery-journal')
    const writeQueue = createWriteQueue()
    let now = 1_000
    let failCompletionWrites = true
    let failAllJobUpdates = false
    let completionSettlementAttempts = 0
    let executions = 0
    const { runtime } = attachRuntime(harness, {
      now: () => now,
      maxAttempts: 1,
      leaseMs: 50,
      retryBaseMs: 1,
      recoveryJournalDir,
      tempRootDir,
      writeQueue,
      run: async (sql, params = []) => {
        if (
          failAllJobUpdates
          && /^\s*UPDATE memory_semantic_scale_jobs\b/.test(sql)
        ) {
          throw new Error('SQLITE_IOERR: all semantic scale job updates unavailable')
        }
        if (failCompletionWrites && sql.includes(`SET status = 'completed'`)) {
          completionSettlementAttempts += 1
          throw new Error('completion persistence unavailable before stop')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'stop-journal-attempt-budget')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const worker = runtime.runJob(job.jobId)
    await waitFor(() => {
      expect(completionSettlementAttempts).toBeGreaterThan(0)
    })

    failCompletionWrites = false
    failAllJobUpdates = true
    await runtime.stop()
    await worker
    const markerFilesBeforeRecovery = await readdir(recoveryJournalDir).catch(() => [])

    failAllJobUpdates = false
    now = 2_000
    const restarted = attachRuntime(harness, {
      now: () => now,
      maxAttempts: 1,
      leaseMs: 50,
      retryBaseMs: 1,
      recoveryJournalDir,
      tempRootDir,
      writeQueue,
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'completed-after-stop-journal-recovery')
      },
    })
    await restarted.runtime.initializeSchema()

    expect(await restarted.runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      maxAttempts: 1,
      deadLettered: false,
      report: {
        id: 'stop-journal-attempt-budget',
      },
    })
    expect(markerFilesBeforeRecovery).toHaveLength(1)
    expect(markerFilesBeforeRecovery[0]).toMatch(/^[a-f0-9]{64}\.json$/)

    expect(await restarted.runtime.resumePendingJobs('card-a')).toEqual([])
    expect(executions).toBe(1)
    expect(await readdir(recoveryJournalDir)).toEqual([])
  })

  it('quarantines a corrupt stop recovery journal marker without updating jobs', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    const recoveryJournalDir = join(tempRootDir, 'stop-recovery-journal')
    await mkdir(recoveryJournalDir, { recursive: true })
    await writeFile(
      join(recoveryJournalDir, `${'a'.repeat(64)}.json`),
      '{"version":1,"jobId":',
      'utf8',
    )
    const { runtime } = attachRuntime(harness, {
      recoveryJournalDir,
      tempRootDir,
    })

    await expect(runtime.initializeSchema()).resolves.toBeUndefined()
    expect(await readdir(recoveryJournalDir)).toEqual(['quarantine'])
    expect((await readdir(join(recoveryJournalDir, 'quarantine')))
      .some(name => name.endsWith('.error.json'))).toBe(true)
  })

  it('settles cancellation requested while completion settlement is failing', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let releaseCompletionFailure: (() => void) | undefined
    let completionSettlementStarted: (() => void) | undefined
    let failCompletionWrite = true
    let executions = 0
    const completionSettlementStartedPromise = new Promise<void>((resolve) => {
      completionSettlementStarted = resolve
    })
    const releaseCompletionFailurePromise = new Promise<void>((resolve) => {
      releaseCompletionFailure = resolve
    })
    const { runtime } = attachRuntime(harness, {
      tempRootDir,
      run: async (sql, params = []) => {
        if (failCompletionWrite && sql.includes(`SET status = 'completed'`)) {
          failCompletionWrite = false
          completionSettlementStarted?.()
          await releaseCompletionFailurePromise
          throw new Error('completion persistence failed during cancellation')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'cancel-during-settlement')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const worker = runtime.runJob(job.jobId)
    await completionSettlementStartedPromise

    const cancellation = runtime.requestCancel(
      job.jobId,
      'cancel while completion settlement retries',
      'card-a',
    )
    releaseCompletionFailure?.()
    await Promise.all([cancellation, worker])

    expect(executions).toBe(1)
    expect(await runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'cancelled',
      attemptCount: 1,
      deadLettered: false,
      leaseExpiresAt: null,
      lastError: 'cancel while completion settlement retries',
    })
  })

  it('bounds persistent settlement failures so stop resolves and leaves the lease recoverable', async () => {
    const harness = await createSqliteHarness()
    const tempRootDir = await createTempRoot()
    let settlementFailureEnabled = true
    let settlementAttempts = 0
    let executions = 0
    const { runtime, writeQueue } = attachRuntime(harness, {
      tempRootDir,
      run: async (sql, params = []) => {
        if (
          settlementFailureEnabled
          && (
            sql.includes(`SET status = 'completed'`)
            || sql.includes(`SET status = 'queued', dead_lettered = 0`)
          )
        ) {
          settlementAttempts += 1
          throw new Error('SQLITE_FULL: persistent settlement failure')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) => {
        executions += 1
        return createReport(corpusSize, 'persistent-settlement-report')
      },
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    const worker = runtime.runJob(job.jobId)
    await waitFor(() => {
      expect(settlementAttempts).toBeGreaterThanOrEqual(2)
    })
    const attemptsBeforeStop = settlementAttempts

    const stopPromise = runtime.stop().then(() => 'stopped' as const)
    const stopResult = await Promise.race([
      stopPromise,
      new Promise<'timed-out'>(resolve => setTimeout(() => resolve('timed-out'), 200)),
    ])
    settlementFailureEnabled = false
    await Promise.all([worker, stopPromise])

    expect(stopResult).toBe('stopped')
    expect(executions).toBe(1)
    expect(settlementAttempts - attemptsBeforeStop).toBeLessThanOrEqual(3)
    const restarted = attachRuntime(harness, {
      tempRootDir,
      writeQueue,
    })
    await restarted.runtime.initializeSchema()
    expect(await restarted.runtime.getJob(job.jobId, 'card-a')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      report: {
        id: 'persistent-settlement-report',
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

  it('lists card-scoped history and returns the latest available retryable or terminal report', async () => {
    let now = 1_000
    const { runtime } = await createRuntimeHarness({
      now: () => now,
      maxAttempts: 2,
      retryBaseMs: 10,
      executeJob: async execution => execution.tier === '10k'
        ? createReport(
            execution.corpusSize,
            `${execution.cardId}:${execution.tier}:${execution.jobId}`,
          )
        : createFailedReport(execution.corpusSize),
    })
    const first = await runtime.startJob({ cardId: 'card-a', tier: '10k' })
    await runtime.runJob(first.jobId)
    now = 1_001
    const second = await runtime.startJob({ cardId: 'card-a', tier: '100k' })
    const retryable = await runtime.runNextAttempt(second.jobId)
    await runtime.startJob({ cardId: 'card-b', tier: '10k' })

    const history = await runtime.listJobs('card-a')
    const latestRetryable = await runtime.getLatestAvailableReport('card-a')

    expect(history.map(job => job.jobId)).toEqual([second.jobId, first.jobId])
    expect(history.every(job => job.cardId === 'card-a')).toBe(true)
    expect(retryable.status).toBe('queued')
    expect(latestRetryable).toMatchObject({
      jobId: second.jobId,
      report: {
        passed: false,
      },
    })

    now = retryable.nextRetryAt!
    const deadLettered = await runtime.runNextAttempt(second.jobId)
    const latestTerminal = await runtime.getLatestAvailableReport('card-a')
    expect(deadLettered).toMatchObject({
      status: 'failed',
      deadLettered: true,
    })
    expect(latestTerminal).toMatchObject({
      jobId: second.jobId,
      report: {
        passed: false,
        summary: {
          failingChecks: ['recall-at-k', 'p95-latency'],
        },
      },
    })
  })
})
