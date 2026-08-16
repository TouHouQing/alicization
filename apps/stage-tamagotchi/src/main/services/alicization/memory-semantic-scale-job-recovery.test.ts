import type sqlite3 from 'sqlite3'

import type { MemorySemanticScaleJobExecutionInput } from './memory-semantic-scale-job-runtime'

import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import sqlite from 'sqlite3'

import { afterEach, describe, expect, it } from 'vitest'

import { createMemorySemanticScaleJobRuntime } from './memory-semantic-scale-job-runtime'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'

interface FileSqliteHarness {
  database: sqlite3.Database
  path: string
  closed: boolean
  run: (sql: string, params?: unknown[]) => Promise<{ changes: number, lastID: number }>
  get: <T>(sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(sql: string, params?: unknown[]) => Promise<T[]>
  close: () => Promise<void>
}

interface WriteQueue {
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}

interface RecoveryMarker {
  version: 2
  jobId: string
  cardId: string
  leaseToken: string
  attemptCountBeforeClaim: number
  createdAt: number
  resolution: {
    kind: 'interrupted'
    reason: string
  }
}

const harnesses: FileSqliteHarness[] = []
const sandboxDirs: string[] = []

async function createSandboxDir() {
  const path = await mkdtemp(join(tmpdir(), 'alicization-semantic-scale-recovery-test-'))
  sandboxDirs.push(path)
  return path
}

function openFileSqliteHarness(path: string): Promise<FileSqliteHarness> {
  return new Promise((resolve, reject) => {
    const database = new sqlite.Database(path, async (error) => {
      if (error) {
        reject(error)
        return
      }
      const harness: FileSqliteHarness = {
        database,
        path,
        closed: false,
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
          database.get(sql, params, (getError, row) =>
            getError ? getReject(getError) : getResolve(row as any))
        }),
        all: (sql, params = []) => new Promise((allResolve, allReject) => {
          database.all(sql, params, (allError, rows) =>
            allError ? allReject(allError) : allResolve((rows ?? []) as any))
        }),
        close: () => new Promise<void>((closeResolve, closeReject) => {
          if (harness.closed) {
            closeResolve()
            return
          }
          database.close((closeError) => {
            if (closeError) {
              closeReject(closeError)
              return
            }
            harness.closed = true
            closeResolve()
          })
        }),
      }
      harnesses.push(harness)
      try {
        await harness.run('PRAGMA busy_timeout = 2000')
        resolve(harness)
      }
      catch (pragmaError) {
        reject(pragmaError)
      }
    })
  })
}

function createWriteQueue(): WriteQueue {
  let tail = Promise.resolve<unknown>(undefined)
  return {
    enqueueWrite: async <T>(task: () => Promise<T>) => {
      const next = tail.then(task, task)
      tail = next.then(() => undefined, () => undefined)
      return await next
    },
  }
}

function createReport(corpusSize: number, id: string) {
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

function attachRuntime(
  harness: FileSqliteHarness,
  input: {
    now?: () => number
    executeJob?: (input: MemorySemanticScaleJobExecutionInput) => Promise<ReturnType<typeof createReport>>
    maxAttempts?: number
    leaseMs?: number
    retryBaseMs?: number
    stopTimeoutMs?: number
    tempRootDir: string
    run?: (sql: string, params?: unknown[]) => Promise<unknown>
    writeQueue?: WriteQueue
  },
) {
  const writeQueue = input.writeQueue ?? createWriteQueue()
  let uuid = 0
  const runtime = createMemorySemanticScaleJobRuntime({
    database: harness.database,
    now: input.now ?? (() => Date.now()),
    randomUUID: () => `file-semantic-job-uuid-${++uuid}`,
    run: async (_database, sql, params = []) => input.run
      ? await input.run(sql, params)
      : await harness.run(sql, params),
    get: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) =>
      await harness.get<T>(sql, params),
    all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []) =>
      await harness.all<T>(sql, params),
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
    stopTimeoutMs: input.stopTimeoutMs,
    tempRootDir: input.tempRootDir,
  })
  return { runtime, writeQueue }
}

function markerFileName(marker: RecoveryMarker) {
  return `${createHash('sha256')
    .update(`${marker.jobId}\0${marker.cardId}\0${marker.leaseToken}`)
    .digest('hex')}.json`
}

function permissions(mode: number) {
  return mode & 0o777
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
  await Promise.all(harnesses.splice(0).map(harness => harness.close()))
  await Promise.all(sandboxDirs.splice(0).map(path =>
    rm(path, { recursive: true, force: true })))
})

describe('memory semantic scale file recovery journal', () => {
  it('recovers a successful result after every job UPDATE fails, a real close, and a reopen', async () => {
    const rootDir = await createSandboxDir()
    const databasePath = join(rootDir, 'alicization.sqlite')
    const recoveryJournalDir = join(dirname(databasePath), '.alicization-memory-semantic-scale-stop-recovery')
    const firstHarness = await openFileSqliteHarness(databasePath)
    let now = 1_000
    let failCompletion = true
    let failAllJobUpdates = false
    let completionStarted: (() => void) | undefined
    const completionStartedPromise = new Promise<void>((resolve) => {
      completionStarted = resolve
    })
    const first = attachRuntime(firstHarness, {
      now: () => now,
      maxAttempts: 1,
      leaseMs: 50,
      retryBaseMs: 1,
      stopTimeoutMs: 100,
      tempRootDir: rootDir,
      run: async (sql, params = []) => {
        if (
          failAllJobUpdates
          && /^\s*UPDATE memory_semantic_scale_jobs\b/.test(sql)
        ) {
          throw new Error('SQLITE_IOERR: every semantic scale UPDATE failed')
        }
        if (failCompletion && sql.includes(`SET status = 'completed'`)) {
          completionStarted?.()
          throw new Error('completion settlement unavailable before close')
        }
        return await firstHarness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) =>
        createReport(corpusSize, 'durable-success-before-close'),
    })
    await first.runtime.initializeSchema()
    const job = await first.runtime.startJob({ cardId: 'card-file', tier: '10k' })
    const worker = first.runtime.runJob(job.jobId)
    await completionStartedPromise

    failCompletion = false
    failAllJobUpdates = true
    await first.runtime.stop()
    await worker

    const markerFiles = await readdir(recoveryJournalDir)
    expect(markerFiles).toHaveLength(1)
    expect(permissions((await stat(recoveryJournalDir)).mode)).toBe(0o700)
    expect(permissions((await stat(join(recoveryJournalDir, markerFiles[0]!))).mode)).toBe(0o600)
    await firstHarness.close()

    failAllJobUpdates = false
    now = 2_000
    const secondHarness = await openFileSqliteHarness(databasePath)
    const second = attachRuntime(secondHarness, {
      now: () => now,
      maxAttempts: 1,
      leaseMs: 50,
      retryBaseMs: 1,
      stopTimeoutMs: 100,
      tempRootDir: rootDir,
      executeJob: async ({ corpusSize }) =>
        createReport(corpusSize, 'must-not-rerun-after-durable-success'),
    })
    await second.runtime.initializeSchema()

    expect(await second.runtime.getJob(job.jobId, 'card-file')).toMatchObject({
      status: 'completed',
      attemptCount: 1,
      maxAttempts: 1,
      deadLettered: false,
      report: {
        id: 'durable-success-before-close',
      },
    })
    expect(await readdir(recoveryJournalDir)).toEqual([])
  })

  it('rejects close when every settlement UPDATE and the default marker write fail', async () => {
    const rootDir = await createSandboxDir()
    const databasePath = join(rootDir, 'alicization.sqlite')
    const recoveryJournalDir = join(dirname(databasePath), '.alicization-memory-semantic-scale-stop-recovery')
    const harness = await openFileSqliteHarness(databasePath)
    let failCompletion = true
    let failAllJobUpdates = false
    let completionStarted: (() => void) | undefined
    const completionStartedPromise = new Promise<void>((resolve) => {
      completionStarted = resolve
    })
    const { runtime } = attachRuntime(harness, {
      maxAttempts: 1,
      stopTimeoutMs: 100,
      tempRootDir: rootDir,
      run: async (sql, params = []) => {
        if (
          failAllJobUpdates
          && /^\s*UPDATE memory_semantic_scale_jobs\b/.test(sql)
        ) {
          throw new Error('SQLITE_IOERR: every semantic scale UPDATE failed')
        }
        if (failCompletion && sql.includes(`SET status = 'completed'`)) {
          completionStarted?.()
          throw new Error('completion settlement unavailable before close')
        }
        return await harness.run(sql, params)
      },
      executeJob: async ({ corpusSize }) =>
        createReport(corpusSize, 'marker-write-must-not-be-lost'),
    })
    await runtime.initializeSchema()
    const job = await runtime.startJob({ cardId: 'card-file', tier: '10k' })
    const worker = runtime.runJob(job.jobId)
    await completionStartedPromise
    await writeFile(recoveryJournalDir, 'blocks recovery journal directory')

    failCompletion = false
    failAllJobUpdates = true
    const closeRuntime = async () => {
      await runtime.stop()
      await harness.close()
    }

    await expect(closeRuntime()).rejects.toThrow()
    expect(harness.closed).toBe(false)
    await worker
  })

  it('atomically quarantines corrupt, hash-mismatched, and identity-mismatched markers during concurrent initialize', async () => {
    const rootDir = await createSandboxDir()
    const databasePath = join(rootDir, 'alicization.sqlite')
    const recoveryJournalDir = join(dirname(databasePath), '.alicization-memory-semantic-scale-stop-recovery')
    const initialHarness = await openFileSqliteHarness(databasePath)
    const initial = attachRuntime(initialHarness, {
      tempRootDir: rootDir,
    })
    await initial.runtime.initializeSchema()
    const job = await initial.runtime.startJob({ cardId: 'card-file', tier: '10k' })
    await initialHarness.close()

    await mkdir(recoveryJournalDir, { recursive: true, mode: 0o777 })
    await chmod(recoveryJournalDir, 0o777)
    await writeFile(
      join(recoveryJournalDir, `${'a'.repeat(64)}.json`),
      '{"version":2,"jobId":',
      { encoding: 'utf8', mode: 0o666 },
    )
    const hashMismatchMarker: RecoveryMarker = {
      version: 2,
      jobId: job.jobId,
      cardId: 'card-file',
      leaseToken: 'hash-mismatch-lease',
      attemptCountBeforeClaim: 0,
      createdAt: 1_000,
      resolution: {
        kind: 'interrupted',
        reason: 'test hash mismatch',
      },
    }
    await writeFile(
      join(recoveryJournalDir, `${'b'.repeat(64)}.json`),
      JSON.stringify(hashMismatchMarker),
      { encoding: 'utf8', mode: 0o666 },
    )
    const identityMismatchMarker: RecoveryMarker = {
      version: 2,
      jobId: job.jobId,
      cardId: 'card-file',
      leaseToken: 'identity-mismatch-lease',
      attemptCountBeforeClaim: 0,
      createdAt: 1_000,
      resolution: {
        kind: 'interrupted',
        reason: 'test identity mismatch',
      },
    }
    await writeFile(
      join(recoveryJournalDir, markerFileName(identityMismatchMarker)),
      JSON.stringify(identityMismatchMarker),
      { encoding: 'utf8', mode: 0o666 },
    )

    const leftHarness = await openFileSqliteHarness(databasePath)
    const rightHarness = await openFileSqliteHarness(databasePath)
    const left = attachRuntime(leftHarness, { tempRootDir: rootDir })
    const right = attachRuntime(rightHarness, { tempRootDir: rootDir })

    await expect(Promise.all([
      left.runtime.initializeSchema(),
      right.runtime.initializeSchema(),
    ])).resolves.toEqual([undefined, undefined])

    expect(await left.runtime.getJob(job.jobId, 'card-file')).toMatchObject({
      status: 'queued',
      attemptCount: 0,
    })
    expect(permissions((await stat(recoveryJournalDir)).mode)).toBe(0o700)
    const quarantineDir = join(recoveryJournalDir, 'quarantine')
    expect(permissions((await stat(quarantineDir)).mode)).toBe(0o700)
    const quarantineEntries = await readdir(quarantineDir)
    const quarantinedMarkers = quarantineEntries.filter(name => name.endsWith('.invalid'))
    const auditFiles = quarantineEntries.filter(name => name.endsWith('.error.json'))
    expect(quarantinedMarkers).toHaveLength(3)
    expect(auditFiles).toHaveLength(3)
    const auditMessages = await Promise.all(auditFiles.map(async name =>
      await import('node:fs/promises').then(fs =>
        fs.readFile(join(quarantineDir, name), 'utf8'))))
    expect(auditMessages.join('\n')).toContain('invalid JSON')
    expect(auditMessages.join('\n')).toContain('file name hash mismatch')
    expect(auditMessages.join('\n')).toContain('identity mismatch')
    for (const name of [...quarantinedMarkers, ...auditFiles])
      expect(permissions((await stat(join(quarantineDir, name))).mode)).toBe(0o600)
    expect((await readdir(recoveryJournalDir))
      .filter(name => /^[a-f0-9]{64}\.json$/.test(name))).toEqual([])

    await Promise.all([leftHarness.close(), rightHarness.close()])
    const finalHarness = await openFileSqliteHarness(databasePath)
    const final = attachRuntime(finalHarness, { tempRootDir: rootDir })
    await expect(final.runtime.initializeSchema()).resolves.toBeUndefined()
    await waitFor(() => {
      expect(finalHarness.closed).toBe(false)
    })
  })
})
