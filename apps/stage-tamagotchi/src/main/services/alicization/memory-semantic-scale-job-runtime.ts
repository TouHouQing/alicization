import type sqlite3 from 'sqlite3'

import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'
import type {
  MemorySemanticScaleResourcePreflight,
  MemorySemanticScaleSoakReport,
} from './memory-semantic-scale-soak-harness'
import type { AlicizationAtomicWriteOptions } from './runtime-atomic-write'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, open as openFile, readdir, rm, stat, statfs } from 'node:fs/promises'
import { freemem, tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { platform as processPlatform } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

import sqlite from './sqlite3-runtime'

import { hashLongTermMemoryEmbeddingText } from './long-term-memory-embedding-text'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { createSqliteVecLongTermMemoryVectorBackend } from './long-term-memory-sqlite-vec-backend'
import { createLongTermMemoryVectorIndexAdapter } from './long-term-memory-vector-index-adapter'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'
import { runMemorySemanticScaleVectorAdapterSoak } from './memory-semantic-scale-soak-runtime'
import {

  renameAlicizationAtomicPath,
  writeAlicizationAtomicContent,
} from './runtime-atomic-write'

export type MemorySemanticScaleJobTier = '10k' | '100k'
export type MemorySemanticScaleJobStatus = 'queued' | 'running' | 'cancel_requested' | 'completed' | 'cancelled' | 'failed'
export type MemorySemanticScaleJobProgressPhase = 'queued' | 'indexing' | 'querying' | 'completed'

export interface MemorySemanticScaleJobProgress {
  phase: MemorySemanticScaleJobProgressPhase
  completed: number
  total: number
  ratio: number
  indexedCount: number
  queryCount: number
  corpusSize: number
}

export interface MemorySemanticScaleJob {
  jobId: string
  cardId: string
  tier: MemorySemanticScaleJobTier
  corpusSize: number
  status: MemorySemanticScaleJobStatus
  deadLettered: boolean
  attemptCount: number
  maxAttempts: number
  nextRetryAt: number | null
  leaseExpiresAt: number | null
  progress: MemorySemanticScaleJobProgress
  report: MemorySemanticScaleSoakReport | null
  lastError: string | null
  createdAt: number
  updatedAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface MemorySemanticScaleJobExecutionInput {
  jobId: string
  cardId: string
  tier: MemorySemanticScaleJobTier
  corpusSize: number
  dimensions?: number
  embeddingProvider?: LongTermMemoryEmbeddingProvider | null
  resourceProbe?: {
    statfs: (path: string) => Promise<{ bavail: number, bsize: number }>
    freemem: () => number
  }
  createdAt: number
  tempDir: string
  signal: AbortSignal
  onProgress: (progress: MemorySemanticScaleJobProgress) => Promise<void>
}

export type MemorySemanticScaleJobExecutor = (
  input: MemorySemanticScaleJobExecutionInput,
) => Promise<MemorySemanticScaleSoakReport>

type MemorySemanticScaleRecoveryAtomicWriteOptions = Pick<
  AlicizationAtomicWriteOptions,
  'appendAuditLog' | 'fsyncPath' | 'openPath' | 'platform' | 'renamePath' | 'renameRetryDelaysMs' | 'sleep' | 'unlinkPath'
>

interface MemorySemanticScaleJobRow {
  id: string
  card_id: string
  tier: MemorySemanticScaleJobTier
  corpus_size: number
  status: MemorySemanticScaleJobStatus
  dead_lettered: number
  attempt_count: number
  max_attempts: number
  next_retry_at: number | null
  lease_token: string | null
  lease_expires_at: number | null
  progress_json: string
  report_json: string | null
  last_error: string | null
  created_at: number
  updated_at: number
  started_at: number | null
  completed_at: number | null
}

interface ClaimedMemorySemanticScaleJob {
  row: MemorySemanticScaleJobRow
  leaseToken: string
}

type MemorySemanticScaleStopRecoveryResolution
  = | {
    kind: 'interrupted'
    reason: string
  }
  | {
    kind: 'settled'
    report: MemorySemanticScaleSoakReport | null
    error: string | null
  }

interface MemorySemanticScaleStopRecoveryMarker {
  version: 2
  jobId: string
  cardId: string
  leaseToken: string
  attemptCountBeforeClaim: number
  createdAt: number
  resolution: MemorySemanticScaleStopRecoveryResolution
}

interface ActiveMemorySemanticScaleAttempt {
  jobId: string
  controller: AbortController
  claimed: ClaimedMemorySemanticScaleJob | null
  executorSettled: boolean
  report: MemorySemanticScaleSoakReport | null
  executionError: unknown
  abortedByStop: boolean
  stopAbortReason: Error | null
  stopInterrupted: boolean
  detached: boolean
  settlementCompleted: boolean
  settlementPromise: Promise<unknown> | null
  promise: Promise<MemorySemanticScaleJob> | null
}

const tierCorpusSizes: Record<MemorySemanticScaleJobTier, number> = {
  '10k': 10_000,
  '100k': 100_000,
}
const stopRecoveryMarkerMaxBytes = 512 * 1024
const stopRecoveryMarkerFilePattern = /^[a-f0-9]{64}\.json$/

class InvalidStopRecoveryMarkerError extends Error {}
class StopDeadlineExceededError extends Error {}

interface StopDeadline {
  expiresAt: number
}

function stopDeadlineError(stage: string) {
  return new StopDeadlineExceededError(
    `semantic scale runtime stop deadline reached during ${stage}`,
  )
}

function assertStopDeadline(deadline: StopDeadline, stage: string) {
  if (performance.now() >= deadline.expiresAt)
    throw stopDeadlineError(stage)
}

async function withinStopDeadline<T>(
  deadline: StopDeadline,
  stage: string,
  task: () => Promise<T>,
) {
  assertStopDeadline(deadline, stage)
  const remainingMs = Math.max(0, deadline.expiresAt - performance.now())
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(stopDeadlineError(stage)), remainingMs)
      }),
    ])
  }
  finally {
    if (timer)
      clearTimeout(timer)
  }
}

function normalizeText(raw: unknown, maxLength: number) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxLength).trim()
    : ''
}

function normalizePositiveInteger(raw: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(Number(raw)))
    return fallback
  return Math.max(1, Math.min(maximum, Math.floor(Number(raw))))
}

function clamp01(value: unknown) {
  if (!Number.isFinite(Number(value)))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function calculateBackoff(attemptCount: number, baseMs: number, maxMs: number) {
  const exponent = Math.max(0, Math.floor(attemptCount) - 1)
  return Math.min(maxMs, baseMs * 2 ** exponent)
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, Math.max(0, milliseconds)))
}

function waitUntilAborted(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, Math.max(0, milliseconds))
    function onAbort() {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

type PromiseAbortRaceResult<T>
  = | {
    kind: 'aborted'
  }
  | {
    kind: 'settled'
    value: T
  }
  | {
    kind: 'rejected'
    error: unknown
  }

async function settleOrAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<PromiseAbortRaceResult<T>> {
  return await new Promise<PromiseAbortRaceResult<T>>((resolve) => {
    let settled = false
    const finish = (result: PromiseAbortRaceResult<T>) => {
      if (settled)
        return
      settled = true
      signal.removeEventListener('abort', onAbort)
      resolve(result)
    }
    const onAbort = () => finish({ kind: 'aborted' })
    signal.addEventListener('abort', onAbort, { once: true })
    void promise.then(
      value => finish({ kind: 'settled', value }),
      error => finish({ kind: 'rejected', error }),
    )
    if (signal.aborted)
      onAbort()
  })
}

function queuedProgress(corpusSize: number): MemorySemanticScaleJobProgress {
  return {
    phase: 'queued',
    completed: 0,
    total: 0,
    ratio: 0,
    indexedCount: 0,
    queryCount: 0,
    corpusSize,
  }
}

function completedProgress(
  progress: MemorySemanticScaleJobProgress,
  corpusSize: number,
): MemorySemanticScaleJobProgress {
  return {
    ...progress,
    phase: 'completed',
    completed: Math.max(progress.completed, progress.total),
    ratio: 1,
    indexedCount: Math.max(progress.indexedCount, corpusSize),
    corpusSize,
  }
}

function normalizeProgress(
  raw: unknown,
  corpusSize: number,
): MemorySemanticScaleJobProgress {
  if (!raw || typeof raw !== 'object')
    return queuedProgress(corpusSize)
  const progress = raw as Partial<MemorySemanticScaleJobProgress>
  const phase: MemorySemanticScaleJobProgressPhase = ['queued', 'indexing', 'querying', 'completed'].includes(String(progress.phase))
    ? progress.phase as MemorySemanticScaleJobProgressPhase
    : 'queued'
  const total = Math.max(0, Math.floor(Number(progress.total) || 0))
  const completed = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, Math.floor(Number(progress.completed) || 0)))
  return {
    phase,
    completed,
    total,
    ratio: phase === 'completed' ? 1 : clamp01(progress.ratio),
    indexedCount: Math.max(0, Math.floor(Number(progress.indexedCount) || 0)),
    queryCount: Math.max(0, Math.floor(Number(progress.queryCount) || 0)),
    corpusSize,
  }
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw)
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

function errorText(error: unknown, fallback: string) {
  return normalizeText(errorMessageFrom(error) ?? error, 500) || fallback
}

function buildResourcePreflightFailureReport(input: {
  id: string
  createdAt: number
  corpusSize: number
  dimensions: number
  embeddingProvider?: LongTermMemoryEmbeddingProvider | null
  startedAt: number
  startedCpu: NodeJS.ResourceUsage
  peakRssBytes: number
  resourcePreflight: MemorySemanticScaleResourcePreflight
}): MemorySemanticScaleSoakReport {
  const finishedCpu = process.resourceUsage()
  const resourceMetrics = {
    dimensions: input.dimensions,
    vectorInput: input.embeddingProvider ? 'provider' as const : 'unavailable' as const,
    elapsedMs: performance.now() - input.startedAt,
    peakRssBytes: Math.max(input.peakRssBytes, process.memoryUsage().rss),
    sqliteBytes: 0,
    sqliteWalBytes: 0,
    cpuUserMs: Math.max(0, (finishedCpu.userCPUTime - input.startedCpu.userCPUTime) / 1_000),
    cpuSystemMs: Math.max(0, (finishedCpu.systemCPUTime - input.startedCpu.systemCPUTime) / 1_000),
  }
  return {
    version: 'memory-semantic-scale-soak-harness-v1',
    id: input.id,
    createdAt: input.createdAt,
    passed: false,
    summary: {
      corpusSize: input.corpusSize,
      queryCount: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      recallAtK: 0,
      falseRecallRate: 0,
      coverageRatio: 0,
      failingChecks: ['resource-preflight-failed', ...input.resourcePreflight.failures],
    },
    resourceMetrics,
    resourcePreflight: input.resourcePreflight,
    searchMetrics: [],
    providerDegradation: null,
    reindex: null,
    recommendedNextActions: [
      '检查磁盘和内存余量后再重试。',
    ],
    evidence: {
      gate: 'production',
      resourcePreflight: input.resourcePreflight,
      vectorInput: input.embeddingProvider ? 'provider' : 'unavailable',
      searchMetrics: [],
    },
  }
}

function invalidStopRecoveryMarker(path: string, reason: string) {
  return new InvalidStopRecoveryMarkerError(
    `invalid semantic scale stop recovery marker: ${path}: ${reason}`,
  )
}

function parseStopRecoveryReport(
  raw: unknown,
  path: string,
): MemorySemanticScaleSoakReport | null {
  if (raw === null)
    return null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw invalidStopRecoveryMarker(path, 'invalid settled report')
  const report = raw as Record<string, unknown>
  const summary = report.summary
  if (
    report.version !== 'memory-semantic-scale-soak-harness-v1'
    || !normalizeText(report.id, 240)
    || !Number.isFinite(report.createdAt)
    || typeof report.passed !== 'boolean'
    || !summary
    || typeof summary !== 'object'
    || Array.isArray(summary)
    || !Array.isArray(report.searchMetrics)
    || !Array.isArray(report.recommendedNextActions)
    || !report.recommendedNextActions.every(action => typeof action === 'string')
    || (
      report.providerDegradation !== null
      && (
        !report.providerDegradation
        || typeof report.providerDegradation !== 'object'
        || Array.isArray(report.providerDegradation)
      )
    )
    || (
      report.reindex !== null
      && (
        !report.reindex
        || typeof report.reindex !== 'object'
        || Array.isArray(report.reindex)
      )
    )
  ) {
    throw invalidStopRecoveryMarker(path, 'invalid settled report')
  }
  const summaryRecord = summary as Record<string, unknown>
  const numericSummaryKeys = [
    'corpusSize',
    'coverageRatio',
    'falseRecallRate',
    'p95LatencyMs',
    'p99LatencyMs',
    'queryCount',
    'recallAtK',
  ]
  if (
    numericSummaryKeys.some(key => !Number.isFinite(summaryRecord[key]))
    || !Array.isArray(summaryRecord.failingChecks)
    || !summaryRecord.failingChecks.every(check => typeof check === 'string')
  ) {
    throw invalidStopRecoveryMarker(path, 'invalid settled report summary')
  }
  return raw as MemorySemanticScaleSoakReport
}

function parseStopRecoveryMarker(
  raw: string,
  path: string,
): MemorySemanticScaleStopRecoveryMarker {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    throw invalidStopRecoveryMarker(path, 'invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw invalidStopRecoveryMarker(path, 'expected object')
  const record = parsed as Record<string, unknown>
  const expectedKeys = [
    'attemptCountBeforeClaim',
    'cardId',
    'createdAt',
    'jobId',
    'leaseToken',
    'resolution',
    'version',
  ]
  const actualKeys = Object.keys(record).sort()
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw invalidStopRecoveryMarker(path, 'unexpected schema')
  }
  const jobId = normalizeText(record.jobId, 240)
  const cardId = normalizeText(record.cardId, 120)
  const leaseToken = normalizeText(record.leaseToken, 240)
  const attemptCountBeforeClaim = Number(record.attemptCountBeforeClaim)
  const createdAt = Number(record.createdAt)
  const resolution = record.resolution
  if (
    record.version !== 2
    || !jobId
    || jobId !== record.jobId
    || !cardId
    || cardId !== record.cardId
    || !leaseToken
    || leaseToken !== record.leaseToken
    || !Number.isSafeInteger(attemptCountBeforeClaim)
    || attemptCountBeforeClaim < 0
    || attemptCountBeforeClaim > 20
    || !Number.isSafeInteger(createdAt)
    || createdAt < 0
    || !resolution
    || typeof resolution !== 'object'
    || Array.isArray(resolution)
  ) {
    throw invalidStopRecoveryMarker(path, 'invalid field values')
  }
  const resolutionRecord = resolution as Record<string, unknown>
  let normalizedResolution: MemorySemanticScaleStopRecoveryResolution
  if (resolutionRecord.kind === 'interrupted') {
    const actualResolutionKeys = Object.keys(resolutionRecord).sort()
    const reason = normalizeText(resolutionRecord.reason, 500)
    if (
      actualResolutionKeys.length !== 2
      || actualResolutionKeys[0] !== 'kind'
      || actualResolutionKeys[1] !== 'reason'
      || !reason
      || reason !== resolutionRecord.reason
    ) {
      throw invalidStopRecoveryMarker(path, 'invalid interrupted resolution')
    }
    normalizedResolution = {
      kind: 'interrupted',
      reason,
    }
  }
  else if (resolutionRecord.kind === 'settled') {
    const actualResolutionKeys = Object.keys(resolutionRecord).sort()
    const error = resolutionRecord.error === null
      ? null
      : normalizeText(resolutionRecord.error, 500)
    if (
      actualResolutionKeys.length !== 3
      || actualResolutionKeys[0] !== 'error'
      || actualResolutionKeys[1] !== 'kind'
      || actualResolutionKeys[2] !== 'report'
      || (resolutionRecord.error !== null && (!error || error !== resolutionRecord.error))
    ) {
      throw invalidStopRecoveryMarker(path, 'invalid settled resolution')
    }
    normalizedResolution = {
      kind: 'settled',
      report: parseStopRecoveryReport(resolutionRecord.report, path),
      error,
    }
  }
  else {
    throw invalidStopRecoveryMarker(path, 'invalid resolution kind')
  }
  return {
    version: 2,
    jobId,
    cardId,
    leaseToken,
    attemptCountBeforeClaim,
    createdAt,
    resolution: normalizedResolution,
  }
}

async function readStopRecoveryMarker(path: string) {
  const file = await openFile(path, 'r')
  try {
    const metadata = await file.stat()
    if (
      !metadata.isFile()
      || metadata.size <= 0
      || metadata.size > stopRecoveryMarkerMaxBytes
    ) {
      throw invalidStopRecoveryMarker(path, 'invalid file size')
    }
    const buffer = Buffer.alloc(metadata.size)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      )
      if (bytesRead === 0)
        throw invalidStopRecoveryMarker(path, 'unexpected end of file')
      offset += bytesRead
    }
    return parseStopRecoveryMarker(buffer.toString('utf8'), path)
  }
  finally {
    await file.close()
  }
}

function hasErrorCode(error: unknown, code: string) {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === code
  )
}

async function syncDirectory(path: string) {
  const directory = await openFile(path, 'r')
  try {
    await directory.sync()
  }
  finally {
    await directory.close()
  }
}

async function secureDirectory(
  path: string,
  create: boolean,
  platform: NodeJS.Platform,
) {
  if (create) {
    await mkdir(path, {
      recursive: true,
      mode: platform === 'win32' ? undefined : 0o700,
    })
  }
  if (platform !== 'win32')
    await chmod(path, 0o700)
  const metadata = await stat(path)
  if (
    !metadata.isDirectory()
    || (
      platform !== 'win32'
      && (metadata.mode & 0o777) !== 0o700
    )
  ) {
    throw new Error(`semantic scale recovery path is not a secure directory: ${path}`)
  }
}

function defaultStopRecoveryJournalDir(database: sqlite3.Database) {
  const filename = (database as sqlite3.Database & { filename?: unknown }).filename
  const rootDir = typeof filename === 'string' && filename && filename !== ':memory:'
    ? dirname(filename)
    : tmpdir()
  return join(rootDir, '.alicization-memory-semantic-scale-stop-recovery')
}

function stopRecoveryMarkerFileName(marker: MemorySemanticScaleStopRecoveryMarker) {
  return `${createHash('sha256')
    .update(`${marker.jobId}\0${marker.cardId}\0${marker.leaseToken}`)
    .digest('hex')}.json`
}

function throwIfAborted(signal: AbortSignal) {
  if (!signal.aborted)
    return
  if (signal.reason instanceof Error)
    throw signal.reason
  throw new DOMException(
    normalizeText(signal.reason, 500) || 'semantic scale job aborted',
    'AbortError',
  )
}

function mapJobRow(row: MemorySemanticScaleJobRow): MemorySemanticScaleJob {
  const corpusSize = Number(row.corpus_size)
  return {
    jobId: row.id,
    cardId: row.card_id,
    tier: row.tier,
    corpusSize,
    status: row.status,
    deadLettered: Number(row.dead_lettered) === 1,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    nextRetryAt: row.next_retry_at,
    leaseExpiresAt: row.lease_expires_at,
    progress: normalizeProgress(
      safeParseJson<unknown>(row.progress_json, null),
      corpusSize,
    ),
    report: safeParseJson<MemorySemanticScaleSoakReport | null>(row.report_json, null),
    lastError: row.last_error,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

function openDatabase(path: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite.Database(path, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve(database)
    })
  })
}

function run(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve())
  })
}

function get<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined))
  })
}

function all<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve((rows ?? []) as T[]))
  })
}

function closeDatabase(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

export const executeMemorySemanticScaleJob: MemorySemanticScaleJobExecutor = async (input) => {
  throwIfAborted(input.signal)
  const startedAt = performance.now()
  const startedCpu = process.resourceUsage()
  let peakRssBytes = process.memoryUsage().rss
  const dimensions = Math.max(4, Math.min(4_096, Math.floor(input.dimensions ?? input.embeddingProvider?.dimensions ?? 12)))
  const corpusSize = Math.max(1, Math.floor(input.corpusSize))
  const resourceProbe = input.resourceProbe ?? { statfs, freemem }
  const requiredDiskBytes = Math.max(
    64 * 1024 * 1024,
    corpusSize * dimensions * Float32Array.BYTES_PER_ELEMENT * 3,
  )
  const requiredMemoryBytes = Math.max(
    64 * 1024 * 1024,
    Math.min(512 * 1024 * 1024, Math.ceil(corpusSize / 10) * dimensions * Float32Array.BYTES_PER_ELEMENT),
  )
  const availableDiskBytes = await resourceProbe.statfs(input.tempDir)
    .then(result => Number(result.bavail) * Number(result.bsize))
    .catch(() => 0)
  const availableMemoryBytes = resourceProbe.freemem()
  const resourcePreflight = {
    passed: availableDiskBytes >= requiredDiskBytes && availableMemoryBytes >= requiredMemoryBytes,
    requiredDiskBytes,
    availableDiskBytes,
    requiredMemoryBytes,
    availableMemoryBytes,
    failures: [
      availableDiskBytes < requiredDiskBytes ? 'disk-space-insufficient' : null,
      availableMemoryBytes < requiredMemoryBytes ? 'memory-headroom-insufficient' : null,
    ].filter(Boolean) as string[],
  }
  if (!resourcePreflight.passed) {
    const report = runMemorySemanticScaleSoakHarness({
      id: `memory-semantic-scale-job:${input.jobId}`,
      createdAt: input.createdAt,
      gate: 'production',
      searches: [],
      minimumCorpusSize: corpusSize,
      resourcePreflight,
    })
    const finishedCpu = process.resourceUsage()
    return {
      ...report,
      resourceMetrics: {
        dimensions,
        vectorInput: input.embeddingProvider ? 'provider' : 'unavailable',
        elapsedMs: performance.now() - startedAt,
        peakRssBytes: Math.max(peakRssBytes, process.memoryUsage().rss),
        sqliteBytes: 0,
        sqliteWalBytes: 0,
        cpuUserMs: Math.max(0, (finishedCpu.userCPUTime - startedCpu.userCPUTime) / 1_000),
        cpuSystemMs: Math.max(0, (finishedCpu.systemCPUTime - startedCpu.systemCPUTime) / 1_000),
      },
    }
  }
  let database: sqlite3.Database | null = null
  let writeQueue = Promise.resolve<unknown>(undefined)
  let writeTransactionActive = false
  const enqueueWrite = async <T>(task: () => Promise<T>) => {
    if (writeTransactionActive)
      return await task()
    const next = writeQueue.then(async () => {
      await run(database!, 'BEGIN IMMEDIATE')
      writeTransactionActive = true
      try {
        const result = await task()
        await run(database!, 'COMMIT')
        return result
      }
      catch (error) {
        await run(database!, 'ROLLBACK').catch(() => {})
        throw error
      }
      finally {
        writeTransactionActive = false
      }
    })
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }

  try {
    if (!resourcePreflight.passed) {
      return buildResourcePreflightFailureReport({
        id: `memory-semantic-scale-job:${input.jobId}`,
        createdAt: input.createdAt,
        corpusSize,
        dimensions,
        embeddingProvider: input.embeddingProvider,
        startedAt,
        startedCpu,
        peakRssBytes,
        resourcePreflight,
      })
    }

    database = await openDatabase(join(input.tempDir, 'semantic-scale.sqlite'))
    await run(database, 'PRAGMA journal_mode = WAL')
    await run(database, 'PRAGMA synchronous = NORMAL')
    await run(database, `
      CREATE TABLE long_term_memory_search_documents (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        text_hash TEXT NOT NULL,
        tombstoned INTEGER NOT NULL DEFAULT 0
      )
    `)
    await run(
      database,
      `CREATE INDEX idx_semantic_scale_search_docs_identity
       ON long_term_memory_search_documents(card_id, source, source_id, text_hash, tombstoned)`,
    )
    const store = createPersistentLongTermMemoryVectorStore({
      database,
      run,
      all,
      enqueueWrite,
      now: () => Date.now(),
    })
    const adapter = createLongTermMemoryVectorIndexAdapter({
      store,
      native: createSqliteVecLongTermMemoryVectorBackend({
        database,
        now: () => Date.now(),
        run,
        get,
        all,
        enqueueWrite,
      }),
    })
    await adapter.initialize()

    const report = await runMemorySemanticScaleVectorAdapterSoak({
      id: `memory-semantic-scale-job:${input.jobId}`,
      createdAt: input.createdAt,
      gate: 'production',
      adapterImplementation: 'persistent-native',
      embeddingProvider: input.embeddingProvider ?? undefined,
      resourcePreflight,
      adapter,
      withBatchWrite: async task => await enqueueWrite(task),
      prepareCanonical: async (records) => {
        await enqueueWrite(async () => {
          await run(database!, `
            INSERT OR REPLACE INTO long_term_memory_search_documents (
              id, card_id, source, source_id, text_hash, tombstoned
            ) VALUES ${records.map(() => '(?, ?, ?, ?, ?, 0)').join(', ')}
          `, records.flatMap(record => [
            `doc:${record.cardId}:${record.source}:${record.sourceId}`,
            record.cardId,
            record.source,
            record.sourceId,
            hashLongTermMemoryEmbeddingText(record.text),
          ]))
        })
      },
      cardId: `semantic-scale-target:${input.jobId}`,
      foreignCardId: `semantic-scale-foreign:${input.jobId}`,
      modelId: input.embeddingProvider?.modelId ?? 'deterministic-semantic-scale-v1',
      dimensions,
      corpusSizes: [input.corpusSize],
      queryCount: 24,
      batchSize: 500,
      maxP95LatencyMs: 2_000,
      maxP99LatencyMs: 4_000,
      signal: input.signal,
      onProgress: async (progress) => {
        peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss)
        await input.onProgress(progress)
      },
    })
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss)
    const databaseBytes = await stat(join(input.tempDir, 'semantic-scale.sqlite'))
      .then(result => result.size)
      .catch(() => 0)
    const sqliteWalBytes = await stat(join(input.tempDir, 'semantic-scale.sqlite-wal'))
      .then(result => result.size)
      .catch(() => 0)
    const finishedCpu = process.resourceUsage()
    return {
      ...report,
      resourceMetrics: {
        dimensions,
        vectorInput: input.embeddingProvider ? 'provider' : 'unavailable',
        elapsedMs: performance.now() - startedAt,
        peakRssBytes,
        sqliteBytes: databaseBytes,
        sqliteWalBytes,
        cpuUserMs: Math.max(0, (finishedCpu.userCPUTime - startedCpu.userCPUTime) / 1_000),
        cpuSystemMs: Math.max(0, (finishedCpu.systemCPUTime - startedCpu.systemCPUTime) / 1_000),
      },
    }
  }
  finally {
    if (database)
      await closeDatabase(database)
  }
}

export function createMemorySemanticScaleJobRuntime(input: {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>, options?: { signal?: AbortSignal }) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  resolveEmbeddingProvider?: () => LongTermMemoryEmbeddingProvider | null
  executeJob?: MemorySemanticScaleJobExecutor
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
  recoveryAtomicWriteOptions?: MemorySemanticScaleRecoveryAtomicWriteOptions
}) {
  const executeJob = input.executeJob ?? executeMemorySemanticScaleJob
  const maxAttempts = normalizePositiveInteger(input.maxAttempts, 3, 20)
  const leaseMs = normalizePositiveInteger(input.leaseMs, 60_000)
  const retryBaseMs = normalizePositiveInteger(input.retryBaseMs, 5_000)
  const retryMaxMs = Math.max(retryBaseMs, normalizePositiveInteger(input.retryMaxMs, 15 * 60_000))
  const stopTimeoutMs = normalizePositiveInteger(input.stopTimeoutMs, 2_000, 60_000)
  const leaseHeartbeatMs = Math.max(1, Math.floor(leaseMs / 3))
  const recoveryJournalDir = input.recoveryJournalDir
    ?? defaultStopRecoveryJournalDir(input.database)
  const recoveryPlatform = input.recoveryAtomicWriteOptions?.platform
    ?? processPlatform
  const appendRecoveryAuditLog = input.recoveryAtomicWriteOptions?.appendAuditLog
    ?? (async () => {})
  const tempRootDir = input.tempRootDir ?? tmpdir()
  const createTempDir = input.createTempDir ?? (async () => {
    await mkdir(tempRootDir, { recursive: true })
    return await mkdtemp(join(tempRootDir, 'alicization-memory-semantic-scale-'))
  })
  const removeTempDir = input.removeTempDir ?? (async path =>
    await rm(path, { recursive: true, force: true }))
  const activeWorkers = new Map<string, Promise<void>>()
  const activeAttempts = new Map<string, ActiveMemorySemanticScaleAttempt>()
  const runtimeStopController = new AbortController()
  let workerTail = Promise.resolve()
  let stopping = false
  let stopPromise: Promise<void> | null = null

  async function readJobRow(
    jobId: string,
    expectedCardId?: string,
    stopDeadline?: StopDeadline,
  ) {
    const normalizedJobId = normalizeText(jobId, 240)
    const row = stopDeadline
      ? await withinStopDeadline(
          stopDeadline,
          `job read for ${normalizedJobId}`,
          async () => await input.get<MemorySemanticScaleJobRow>(
            input.database,
            'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?',
            [normalizedJobId],
          ),
        )
      : await input.get<MemorySemanticScaleJobRow>(
          input.database,
          'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?',
          [normalizedJobId],
        )
    if (!row)
      throw new Error(`semantic scale job not found: ${normalizedJobId}`)
    const normalizedExpectedCardId = normalizeText(expectedCardId, 120)
    if (normalizedExpectedCardId && row.card_id !== normalizedExpectedCardId)
      throw new Error(`semantic scale job does not belong to card: ${normalizedExpectedCardId}`)
    return row
  }

  function workerRetryDelay(failureCount: number) {
    return calculateBackoff(failureCount, 25, 250)
  }

  async function persistWorkerErrorBestEffort(jobId: string, error: unknown) {
    const message = errorText(error, 'semantic scale worker database operation failed')
    const now = input.now()
    try {
      await input.enqueueWrite(async () => {
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET last_error = ?, updated_at = ?
          WHERE id = ? AND status IN ('queued', 'running')
        `, [message, now, jobId])
      })
    }
    catch {
      // The worker retry loop remains authoritative when diagnostic persistence also fails.
    }
  }

  async function writeStopRecoveryMarker(
    marker: MemorySemanticScaleStopRecoveryMarker,
    stopDeadline?: StopDeadline,
  ) {
    const fileName = stopRecoveryMarkerFileName(marker)
    const path = join(recoveryJournalDir, fileName)
    const content = JSON.stringify(marker)
    const markerBytes = Buffer.byteLength(content, 'utf8')
    if (markerBytes > stopRecoveryMarkerMaxBytes) {
      throw new Error(
        `semantic scale stop recovery marker exceeds ${stopRecoveryMarkerMaxBytes} UTF-8 bytes: ${markerBytes}`,
      )
    }
    await writeAlicizationAtomicContent({
      ...input.recoveryAtomicWriteOptions,
      path,
      category: 'semantic-scale-stop-recovery',
      content,
      directoryMode: 0o700,
      fileMode: 0o600,
      randomId: input.randomUUID,
      now: input.now,
      runStep: async <T>(stage: string, task: () => Promise<T>) =>
        stopDeadline
          ? await withinStopDeadline(
              stopDeadline,
              `recovery marker ${stage}`,
              task,
            )
          : await task(),
    })
    return path
  }

  async function syncRecoveryDirectory(
    path: string,
    stopDeadline?: StopDeadline,
  ) {
    const runStep = async <T>(stage: string, task: () => Promise<T>) =>
      stopDeadline
        ? await withinStopDeadline(stopDeadline, stage, task)
        : await task()
    try {
      await runStep('recovery directory sync', async () =>
        await syncDirectory(path))
    }
    catch (error) {
      if (
        recoveryPlatform !== 'win32'
        || !['EPERM', 'EBADF', 'EINVAL', 'ENOTSUP'].includes(
          String((error as NodeJS.ErrnoException | null)?.code),
        )
      ) {
        throw error
      }
      await runStep('recovery directory fsync degradation audit', async () =>
        await appendRecoveryAuditLog({
          level: 'notice',
          category: 'semantic-scale-stop-recovery',
          action: 'directory-fsync-degraded',
          message: 'Directory fsync is not supported for this recovery journal operation.',
          payload: {
            code: (error as NodeJS.ErrnoException).code,
            path,
            platform: recoveryPlatform,
          },
        }))
    }
  }

  async function removeRecoveryFile(path: string, stopDeadline?: StopDeadline) {
    const runStep = async <T>(stage: string, task: () => Promise<T>) =>
      stopDeadline
        ? await withinStopDeadline(stopDeadline, stage, task)
        : await task()
    try {
      await runStep('reconciled recovery marker removal', async () =>
        await rm(path))
      await syncRecoveryDirectory(dirname(path), stopDeadline)
    }
    catch (error) {
      if (!hasErrorCode(error, 'ENOENT'))
        throw error
    }
  }

  async function quarantineStopRecoveryMarker(
    path: string,
    reason: string,
  ) {
    const quarantineDir = join(recoveryJournalDir, 'quarantine')
    await secureDirectory(quarantineDir, true, recoveryPlatform)
    const nonce = createHash('sha256')
      .update(input.randomUUID())
      .digest('hex')
      .slice(0, 16)
    const quarantinedPath = join(
      quarantineDir,
      `${basename(path)}.${nonce}.invalid`,
    )
    try {
      await renameAlicizationAtomicPath({
        ...input.recoveryAtomicWriteOptions,
        sourcePath: path,
        targetPath: quarantinedPath,
        category: 'semantic-scale-stop-recovery',
      })
    }
    catch (error) {
      if (hasErrorCode(error, 'ENOENT'))
        return
      throw error
    }
    if (recoveryPlatform !== 'win32') {
      await chmod(quarantinedPath, 0o600)
      const quarantinedMode = (await stat(quarantinedPath)).mode & 0o777
      if (quarantinedMode !== 0o600) {
        throw new Error(
          `semantic scale quarantined marker permissions are not secure: ${quarantinedPath}`,
        )
      }
    }
    await syncRecoveryDirectory(quarantineDir)
    await syncRecoveryDirectory(recoveryJournalDir)
    const auditPath = `${quarantinedPath}.error.json`
    await writeAlicizationAtomicContent({
      ...input.recoveryAtomicWriteOptions,
      path: auditPath,
      category: 'semantic-scale-stop-recovery',
      content: JSON.stringify({
        version: 1,
        originalFileName: basename(path),
        quarantinedFileName: basename(quarantinedPath),
        reason,
        quarantinedAt: input.now(),
      }),
      directoryMode: 0o700,
      fileMode: 0o600,
      randomId: input.randomUUID,
      now: input.now,
    })
  }

  async function reconcileStopRecoveryMarker(
    marker: MemorySemanticScaleStopRecoveryMarker,
    stopDeadline?: StopDeadline,
  ) {
    const row = stopDeadline
      ? await withinStopDeadline(
          stopDeadline,
          `recovery reconciliation read for ${marker.jobId}`,
          async () => await input.get<MemorySemanticScaleJobRow>(
            input.database,
            'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?',
            [marker.jobId],
          ),
        )
      : await input.get<MemorySemanticScaleJobRow>(
          input.database,
          'SELECT * FROM memory_semantic_scale_jobs WHERE id = ?',
          [marker.jobId],
        )
    if (
      !row
      || row.card_id !== marker.cardId
      || row.lease_token !== marker.leaseToken
      || (row.status !== 'running' && row.status !== 'cancel_requested')
    ) {
      throw invalidStopRecoveryMarker(
        stopRecoveryMarkerFileName(marker),
        'identity mismatch',
      )
    }
    await settleExecution({
      claimed: {
        row,
        leaseToken: marker.leaseToken,
      },
      report: marker.resolution.kind === 'settled'
        ? marker.resolution.report
        : null,
      error: marker.resolution.kind === 'settled'
        ? marker.resolution.error
        : null,
      interrupted: marker.resolution.kind === 'interrupted',
      interruptionReason: marker.resolution.kind === 'interrupted'
        ? marker.resolution.reason
        : null,
      requireIdentity: true,
      stopDeadline,
    })
  }

  async function replayStopRecoveryJournal() {
    try {
      await secureDirectory(recoveryJournalDir, false, recoveryPlatform)
    }
    catch (error) {
      if (hasErrorCode(error, 'ENOENT'))
        return
      throw error
    }
    const entries = await readdir(recoveryJournalDir, { withFileTypes: true })
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isFile() || !stopRecoveryMarkerFilePattern.test(entry.name))
        continue
      const path = join(recoveryJournalDir, entry.name)
      try {
        if (recoveryPlatform !== 'win32')
          await chmod(path, 0o600)
        const marker = await readStopRecoveryMarker(path)
        if (stopRecoveryMarkerFileName(marker) !== entry.name)
          throw invalidStopRecoveryMarker(path, 'file name hash mismatch')
        await reconcileStopRecoveryMarker(marker)
        await removeRecoveryFile(path)
      }
      catch (error) {
        if (hasErrorCode(error, 'ENOENT'))
          continue
        if (error instanceof InvalidStopRecoveryMarkerError) {
          await quarantineStopRecoveryMarker(path, error.message)
          continue
        }
        throw error
      }
    }
  }

  async function initializeSchema() {
    await input.run(input.database, `
      CREATE TABLE IF NOT EXISTS memory_semantic_scale_jobs (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        tier TEXT NOT NULL,
        corpus_size INTEGER NOT NULL,
        status TEXT NOT NULL,
        dead_lettered INTEGER NOT NULL DEFAULT 0,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL,
        next_retry_at INTEGER,
        lease_token TEXT,
        lease_expires_at INTEGER,
        progress_json TEXT NOT NULL,
        report_json TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER
      )
    `)
    await input.run(
      input.database,
      'CREATE INDEX IF NOT EXISTS idx_memory_semantic_scale_jobs_card_created ON memory_semantic_scale_jobs(card_id, created_at DESC, id DESC)',
    )
    await input.run(
      input.database,
      'CREATE INDEX IF NOT EXISTS idx_memory_semantic_scale_jobs_resume ON memory_semantic_scale_jobs(status, next_retry_at, lease_expires_at)',
    )
    await replayStopRecoveryJournal()
    await recoverExpiredLeases()
  }

  async function startJob(inputData: {
    cardId: string
    tier: MemorySemanticScaleJobTier
  }) {
    if (stopping)
      throw new Error('semantic scale runtime is stopping')
    const cardId = normalizeText(inputData.cardId, 120)
    if (!cardId)
      throw new Error('semantic scale job requires cardId')
    if (inputData.tier !== '10k' && inputData.tier !== '100k')
      throw new Error('semantic scale job tier must be 10k or 100k')
    const corpusSize = tierCorpusSizes[inputData.tier]
    const jobId = input.randomUUID()
    const now = input.now()
    const progress = queuedProgress(corpusSize)

    await input.enqueueWrite(async () => {
      await input.run(input.database, `
        INSERT INTO memory_semantic_scale_jobs (
          id, card_id, tier, corpus_size, status, dead_lettered,
          attempt_count, max_attempts, next_retry_at, lease_token, lease_expires_at,
          progress_json, report_json, last_error,
          created_at, updated_at, started_at, completed_at
        ) VALUES (?, ?, ?, ?, 'queued', 0, 0, ?, NULL, NULL, NULL, ?, NULL, NULL, ?, ?, NULL, NULL)
      `, [
        jobId,
        cardId,
        inputData.tier,
        corpusSize,
        maxAttempts,
        JSON.stringify(progress),
        now,
        now,
      ])
    })
    return await getJob(jobId, cardId)
  }

  async function getJob(jobId: string, expectedCardId?: string) {
    return mapJobRow(await readJobRow(jobId, expectedCardId))
  }

  async function listJobs(cardId: string, options?: { limit?: number }) {
    const normalizedCardId = normalizeText(cardId, 120)
    if (!normalizedCardId)
      return []
    const limit = normalizePositiveInteger(options?.limit, 20, 100)
    const rows = await input.all<MemorySemanticScaleJobRow>(
      input.database,
      `SELECT *
       FROM memory_semantic_scale_jobs
       WHERE card_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [normalizedCardId, limit],
    )
    return rows.map(mapJobRow)
  }

  async function getLatestAvailableReport(cardId: string) {
    const normalizedCardId = normalizeText(cardId, 120)
    if (!normalizedCardId)
      return null
    const row = await input.get<MemorySemanticScaleJobRow>(
      input.database,
      `SELECT *
       FROM memory_semantic_scale_jobs
       WHERE card_id = ? AND report_json IS NOT NULL
       ORDER BY updated_at DESC, completed_at DESC, created_at DESC, id DESC
       LIMIT 1`,
      [normalizedCardId],
    )
    if (!row)
      return null
    const job = mapJobRow(row)
    return job.report
      ? {
          jobId: job.jobId,
          report: job.report,
        }
      : null
  }

  async function recoverExpiredLeasesInternal() {
    const now = input.now()
    const rows = await input.all<MemorySemanticScaleJobRow>(
      input.database,
      `SELECT *
       FROM memory_semantic_scale_jobs
       WHERE status IN ('running', 'cancel_requested')
         AND (lease_expires_at IS NULL OR lease_expires_at <= ?)`,
      [now],
    )
    for (const row of rows) {
      if (row.status === 'cancel_requested') {
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = 'cancelled', dead_lettered = 0,
              lease_token = NULL, lease_expires_at = NULL, next_retry_at = NULL,
              completed_at = COALESCE(completed_at, ?), updated_at = ?
          WHERE id = ?
        `, [now, now, row.id])
        continue
      }

      const message = 'semantic scale job lease expired during crash recovery'
      const deadLettered = Number(row.attempt_count) >= Number(row.max_attempts)
      const nextRetryAt = deadLettered
        ? null
        : now + calculateBackoff(Number(row.attempt_count), retryBaseMs, retryMaxMs)
      await input.run(input.database, `
        UPDATE memory_semantic_scale_jobs
        SET status = ?, dead_lettered = ?,
            next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
            last_error = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
      `, [
        deadLettered ? 'failed' : 'queued',
        deadLettered ? 1 : 0,
        nextRetryAt,
        message,
        deadLettered ? now : null,
        now,
        row.id,
      ])
    }
    return rows.length
  }

  async function recoverExpiredLeases() {
    return await input.enqueueWrite(async () => {
      return await input.runInTransaction(input.database, async () => {
        return await recoverExpiredLeasesInternal()
      })
    })
  }

  async function claimNextAttempt(jobId: string): Promise<ClaimedMemorySemanticScaleJob | null> {
    const now = input.now()
    return await input.enqueueWrite(async () => {
      return await input.runInTransaction(input.database, async () => {
        if (stopping)
          return null
        await recoverExpiredLeasesInternal()
        const row = await readJobRow(jobId)
        if (
          row.status !== 'queued'
          || (row.next_retry_at !== null && Number(row.next_retry_at) > now)
        ) {
          return null
        }
        if (Number(row.attempt_count) >= Number(row.max_attempts)) {
          await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = 'failed', dead_lettered = 1,
                next_retry_at = NULL, lease_token = NULL, lease_expires_at = NULL,
                last_error = COALESCE(last_error, ?),
                completed_at = COALESCE(completed_at, ?), updated_at = ?
            WHERE id = ? AND status = 'queued' AND attempt_count >= max_attempts
          `, [
            'semantic scale job exhausted max attempts before claim',
            now,
            now,
            row.id,
          ])
          return null
        }
        if (stopping)
          return null
        const leaseToken = input.randomUUID()
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = 'running', attempt_count = attempt_count + 1,
              next_retry_at = NULL, lease_token = ?, lease_expires_at = ?,
              started_at = COALESCE(started_at, ?), updated_at = ?
          WHERE id = ? AND status = 'queued'
            AND (next_retry_at IS NULL OR next_retry_at <= ?)
            AND attempt_count < max_attempts
        `, [leaseToken, now + leaseMs, now, now, row.id, now])
        const claimed = await input.get<MemorySemanticScaleJobRow>(
          input.database,
          'SELECT * FROM memory_semantic_scale_jobs WHERE id = ? AND lease_token = ?',
          [row.id, leaseToken],
        )
        return claimed
          ? {
              row: claimed,
              leaseToken,
            }
          : null
      })
    })
  }

  async function persistProgress(
    attempt: ActiveMemorySemanticScaleAttempt,
    claimed: ClaimedMemorySemanticScaleJob,
    progress: MemorySemanticScaleJobProgress,
  ) {
    if (attempt.detached)
      return
    const normalized = normalizeProgress(progress, Number(claimed.row.corpus_size))
    const now = input.now()
    await input.enqueueWrite(async () => {
      await input.run(input.database, `
        UPDATE memory_semantic_scale_jobs
        SET progress_json = ?, lease_expires_at = ?, updated_at = ?
        WHERE id = ? AND status = 'running' AND lease_token = ?
      `, [
        JSON.stringify(normalized),
        now + leaseMs,
        now,
        claimed.row.id,
        claimed.leaseToken,
      ])
    })
  }

  async function renewClaimedLease(claimed: ClaimedMemorySemanticScaleJob) {
    const now = input.now()
    return await input.enqueueWrite(async () => {
      await input.run(input.database, `
        UPDATE memory_semantic_scale_jobs
        SET lease_expires_at = ?, updated_at = ?
        WHERE id = ? AND status = 'running' AND lease_token = ?
      `, [
        now + leaseMs,
        now,
        claimed.row.id,
        claimed.leaseToken,
      ])
      const row = await input.get<Pick<MemorySemanticScaleJobRow, 'status' | 'lease_token'>>(
        input.database,
        'SELECT status, lease_token FROM memory_semantic_scale_jobs WHERE id = ?',
        [claimed.row.id],
      )
      if (row?.lease_token !== claimed.leaseToken)
        return 'lost' as const
      if (row.status === 'running' || row.status === 'cancel_requested')
        return row.status
      return 'lost' as const
    })
  }

  function stopRecoveryMarkerForAttempt(
    attempt: ActiveMemorySemanticScaleAttempt,
  ): MemorySemanticScaleStopRecoveryMarker {
    const claimed = attempt.claimed
    if (!claimed)
      throw new Error(`semantic scale stop recovery requires a claimed attempt: ${attempt.jobId}`)
    const interrupted = (attempt.abortedByStop && !attempt.executorSettled)
      || (attempt.stopInterrupted && !attempt.report)
    const unsettledAbortReason = !attempt.executorSettled
      && attempt.controller.signal.aborted
      ? attempt.controller.signal.reason
      : null
    const marker: MemorySemanticScaleStopRecoveryMarker = {
      version: 2,
      jobId: claimed.row.id,
      cardId: claimed.row.card_id,
      leaseToken: claimed.leaseToken,
      attemptCountBeforeClaim: Math.max(0, Number(claimed.row.attempt_count) - 1),
      createdAt: input.now(),
      resolution: interrupted
        ? {
            kind: 'interrupted',
            reason: 'semantic scale runtime stopped before execution produced a result',
          }
        : {
            kind: 'settled',
            report: attempt.report,
            error: attempt.executionError || unsettledAbortReason
              ? errorText(
                  attempt.executionError ?? unsettledAbortReason,
                  'semantic scale job failed',
                )
              : null,
          },
    }
    return marker
  }

  async function preserveAttemptForRecovery(
    attempt: ActiveMemorySemanticScaleAttempt,
    stopDeadline: StopDeadline,
  ) {
    const marker = stopRecoveryMarkerForAttempt(attempt)
    const markerPath = await writeStopRecoveryMarker(marker, stopDeadline)
    try {
      await reconcileStopRecoveryMarker(marker, stopDeadline)
      attempt.settlementCompleted = true
    }
    catch (error) {
      if (error instanceof StopDeadlineExceededError)
        throw error
      // The synced marker is authoritative when the live database cannot settle.
      return
    }
    await removeRecoveryFile(markerPath, stopDeadline).catch(() => {
      // A settled database row remains authoritative if marker cleanup cannot finish.
    })
  }

  function startLeaseHeartbeat(
    attempt: ActiveMemorySemanticScaleAttempt,
    claimed: ClaimedMemorySemanticScaleJob,
    executionController: AbortController,
  ) {
    const stopController = new AbortController()
    let heartbeatError: unknown = null
    const stopOnExecutionAbort = () => stopController.abort()
    executionController.signal.addEventListener('abort', stopOnExecutionAbort, { once: true })
    const completed = (async () => {
      while (!stopController.signal.aborted) {
        await waitUntilAborted(leaseHeartbeatMs, stopController.signal)
        if (stopController.signal.aborted || attempt.detached)
          break
        try {
          const now = input.now()
          const heartbeatWrite = input.enqueueWrite(async () => {
            if (stopController.signal.aborted || attempt.detached)
              return
            await input.run(input.database, `
              UPDATE memory_semantic_scale_jobs
              SET lease_expires_at = ?, updated_at = ?
              WHERE id = ? AND status = 'running' AND lease_token = ?
            `, [
              now + leaseMs,
              now,
              claimed.row.id,
              claimed.leaseToken,
            ])
            if (stopController.signal.aborted || attempt.detached)
              return
            const row = await input.get<Pick<MemorySemanticScaleJobRow, 'status' | 'lease_token'>>(
              input.database,
              'SELECT status, lease_token FROM memory_semantic_scale_jobs WHERE id = ?',
              [claimed.row.id],
            )
            if (row?.status !== 'running' || row.lease_token !== claimed.leaseToken)
              throw new Error('semantic scale job lease is no longer active')
          }, { signal: stopController.signal })
          const heartbeatResult = await settleOrAbort(
            heartbeatWrite,
            stopController.signal,
          )
          if (heartbeatResult.kind === 'aborted')
            break
          if (heartbeatResult.kind === 'rejected')
            throw heartbeatResult.error
        }
        catch (error) {
          heartbeatError = error
          if (!executionController.signal.aborted)
            executionController.abort(error)
          break
        }
      }
    })()

    return async () => {
      stopController.abort()
      executionController.signal.removeEventListener('abort', stopOnExecutionAbort)
      await completed
      return heartbeatError
    }
  }

  async function settleExecution(inputData: {
    claimed: ClaimedMemorySemanticScaleJob
    report: MemorySemanticScaleSoakReport | null
    error: unknown
    interrupted: boolean
    interruptionReason: string | null
    requireIdentity?: boolean
    stopDeadline?: StopDeadline
  }) {
    const now = input.now()
    const runStep = async <T>(stage: string, task: () => Promise<T>) =>
      inputData.stopDeadline
        ? await withinStopDeadline(inputData.stopDeadline, stage, task)
        : await task()
    return await runStep('recovery settlement queue', async () =>
      await input.enqueueWrite(async () => {
        if (inputData.stopDeadline)
          assertStopDeadline(inputData.stopDeadline, 'recovery settlement queue')
        return await input.runInTransaction(input.database, async () => {
          if (inputData.stopDeadline)
            assertStopDeadline(inputData.stopDeadline, 'recovery settlement transaction')
          const row = await readJobRow(
            inputData.claimed.row.id,
            undefined,
            inputData.stopDeadline,
          )
          if (
            row.card_id !== inputData.claimed.row.card_id
            || row.lease_token !== inputData.claimed.leaseToken
            || (row.status !== 'running' && row.status !== 'cancel_requested')
          ) {
            if (inputData.requireIdentity) {
              throw invalidStopRecoveryMarker(
                inputData.claimed.row.id,
                'identity mismatch',
              )
            }
            return false
          }
          const progress = normalizeProgress(
            safeParseJson<unknown>(row.progress_json, null),
            Number(row.corpus_size),
          )

          if (row.status === 'cancel_requested') {
            await runStep('recovery cancellation settlement', async () =>
              await input.run(input.database, `
              UPDATE memory_semantic_scale_jobs
              SET status = 'cancelled', dead_lettered = 0,
                  next_retry_at = NULL, lease_token = NULL, lease_expires_at = NULL,
                  completed_at = COALESCE(completed_at, ?), updated_at = ?
              WHERE id = ? AND lease_token = ?
            `, [now, now, row.id, inputData.claimed.leaseToken]))
            return true
          }

          if (inputData.interrupted) {
            const attemptCountBeforeClaim = Math.max(
              0,
              Number(inputData.claimed.row.attempt_count) - 1,
            )
            await runStep('recovery interruption settlement', async () =>
              await input.run(input.database, `
              UPDATE memory_semantic_scale_jobs
              SET status = 'queued', dead_lettered = 0,
                  attempt_count = MIN(attempt_count, ?),
                  next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
                  last_error = ?, completed_at = NULL, updated_at = ?
              WHERE id = ? AND lease_token = ?
            `, [
                attemptCountBeforeClaim,
                now,
                inputData.interruptionReason
                ?? 'semantic scale runtime stopped before execution produced a result',
                now,
                row.id,
                inputData.claimed.leaseToken,
              ]))
            return true
          }

          if (!inputData.error && inputData.report?.passed) {
            await runStep('recovery success settlement', async () =>
              await input.run(input.database, `
              UPDATE memory_semantic_scale_jobs
              SET status = 'completed', dead_lettered = 0,
                  next_retry_at = NULL, lease_token = NULL, lease_expires_at = NULL,
                  progress_json = ?, report_json = ?, last_error = NULL,
                  completed_at = ?, updated_at = ?
              WHERE id = ? AND lease_token = ?
            `, [
                JSON.stringify(completedProgress(progress, Number(row.corpus_size))),
                JSON.stringify(inputData.report),
                now,
                now,
                row.id,
                inputData.claimed.leaseToken,
              ]))
            return true
          }

          const qualityFailureChecks = inputData.report && !inputData.report.passed
            ? inputData.report.summary.failingChecks
                .map(check => normalizeText(check, 120))
                .filter(Boolean)
            : []
          const message = qualityFailureChecks.length > 0
            ? `semantic scale quality checks failed: ${qualityFailureChecks.join(', ')}`
            : errorText(inputData.error, 'semantic scale job failed')
          const deadLettered = Number(row.attempt_count) >= Number(row.max_attempts)
          const nextRetryAt = deadLettered
            ? null
            : now + calculateBackoff(Number(row.attempt_count), retryBaseMs, retryMaxMs)
          await runStep('recovery failure settlement', async () =>
            await input.run(input.database, `
            UPDATE memory_semantic_scale_jobs
            SET status = ?, dead_lettered = ?,
                next_retry_at = ?, lease_token = NULL, lease_expires_at = NULL,
                report_json = COALESCE(?, report_json),
                last_error = ?, completed_at = ?, updated_at = ?
            WHERE id = ? AND lease_token = ?
          `, [
              deadLettered ? 'failed' : 'queued',
              deadLettered ? 1 : 0,
              nextRetryAt,
              inputData.report ? JSON.stringify(inputData.report) : null,
              message,
              deadLettered ? now : null,
              now,
              row.id,
              inputData.claimed.leaseToken,
            ]))
          return true
        })
      }))
  }

  function isStopInterruption(
    attempt: ActiveMemorySemanticScaleAttempt,
    error: unknown,
  ) {
    if (!attempt.abortedByStop || !attempt.stopAbortReason || attempt.report)
      return false
    return error === attempt.stopAbortReason
  }

  function abortAttemptForStop(attempt: ActiveMemorySemanticScaleAttempt) {
    if (attempt.controller.signal.aborted)
      return
    const reason = new Error('semantic scale runtime stopping')
    attempt.abortedByStop = true
    attempt.stopAbortReason = reason
    attempt.controller.abort(reason)
  }

  async function executeTrackedAttempt(
    attempt: ActiveMemorySemanticScaleAttempt,
  ): Promise<MemorySemanticScaleJob> {
    const controller = attempt.controller
    let tempDir: string | null = null
    let stopLeaseHeartbeat: (() => Promise<unknown>) | null = null
    try {
      try {
        attempt.claimed = await claimNextAttempt(attempt.jobId)
        if (!attempt.claimed) {
          if (attempt.detached)
            throw new Error('semantic scale attempt detached before claim')
          return await getJob(attempt.jobId)
        }
        const activeClaim = attempt.claimed
        stopLeaseHeartbeat = startLeaseHeartbeat(attempt, activeClaim, controller)
        tempDir = await createTempDir({
          jobId: activeClaim.row.id,
          tempRootDir,
        })
        if (attempt.detached)
          return mapJobRow(activeClaim.row)
        const current = await readJobRow(activeClaim.row.id)
        if (stopping)
          abortAttemptForStop(attempt)
        else if (current.status === 'cancel_requested' && !controller.signal.aborted)
          controller.abort(new Error(current.last_error ?? 'semantic scale job cancelled'))
        attempt.report = await executeJob({
          jobId: activeClaim.row.id,
          cardId: activeClaim.row.card_id,
          tier: activeClaim.row.tier,
          corpusSize: Number(activeClaim.row.corpus_size),
          createdAt: Number(activeClaim.row.created_at),
          embeddingProvider: input.resolveEmbeddingProvider?.() ?? null,
          tempDir,
          signal: controller.signal,
          onProgress: async progress =>
            await persistProgress(attempt, activeClaim, progress),
        })
        attempt.executorSettled = true
      }
      catch (error) {
        if (!attempt.claimed)
          throw error
        attempt.executionError = error
        attempt.executorSettled = true
        attempt.stopInterrupted = isStopInterruption(attempt, error)
      }
      finally {
        if (tempDir) {
          try {
            await removeTempDir(tempDir)
          }
          catch (error) {
            attempt.executionError ??= error
          }
        }
      }

      const claimed = attempt.claimed
      if (!claimed)
        return await getJob(attempt.jobId)
      if (stopLeaseHeartbeat) {
        const heartbeatError = await stopLeaseHeartbeat()
        attempt.executionError ??= heartbeatError
        stopLeaseHeartbeat = null
      }
      if (attempt.detached)
        return mapJobRow(claimed.row)
      let settlementFailureCount = 0
      let settled = false
      while (true) {
        if (attempt.detached)
          break
        try {
          const settlement = settleExecution({
            claimed,
            report: attempt.report,
            error: attempt.executionError,
            interrupted: attempt.stopInterrupted && !attempt.report,
            interruptionReason: attempt.stopInterrupted
              ? 'semantic scale runtime stopped before execution produced a result'
              : null,
          })
          attempt.settlementPromise = settlement
          void settlement.finally(() => {
            if (attempt.settlementPromise === settlement)
              attempt.settlementPromise = null
          }).catch(() => {})
          const settlementResult = stopping
            ? await settleOrAbort(settlement, runtimeStopController.signal)
            : {
                kind: 'settled' as const,
                value: await settlement,
              }
          if (settlementResult.kind === 'aborted') {
            attempt.detached = true
            break
          }
          if (settlementResult.kind === 'rejected')
            throw settlementResult.error
          const applied = settlementResult.value
          if (!applied)
            break
          settled = true
          attempt.settlementCompleted = true
          break
        }
        catch (error) {
          settlementFailureCount += 1
          await persistWorkerErrorBestEffort(attempt.jobId, error)
          if (attempt.detached)
            break
          if (stopping && settlementFailureCount >= 3)
            break
          if (!stopping) {
            let claimedState: 'cancel_requested' | 'lost' | 'running' | null = null
            try {
              claimedState = await renewClaimedLease(claimed)
            }
            catch (leaseError) {
              await persistWorkerErrorBestEffort(attempt.jobId, leaseError)
            }
            if (claimedState === 'lost')
              break
          }
          await wait(workerRetryDelay(settlementFailureCount))
        }
      }
      if (!settled)
        return mapJobRow(claimed.row)
      if (attempt.detached)
        return mapJobRow(claimed.row)
      return await getJob(attempt.jobId)
    }
    finally {
      if (stopLeaseHeartbeat)
        await stopLeaseHeartbeat()
    }
  }

  function runNextAttempt(jobId: string) {
    const normalizedJobId = normalizeText(jobId, 240)
    const active = activeAttempts.get(normalizedJobId)
    if (active?.promise)
      return active.promise
    if (stopping)
      return getJob(normalizedJobId)

    const attempt: ActiveMemorySemanticScaleAttempt = {
      jobId: normalizedJobId,
      controller: new AbortController(),
      claimed: null,
      executorSettled: false,
      report: null,
      executionError: null,
      abortedByStop: false,
      stopAbortReason: null,
      stopInterrupted: false,
      detached: false,
      settlementCompleted: false,
      settlementPromise: null,
      promise: null,
    }
    const promise = executeTrackedAttempt(attempt).finally(() => {
      if (activeAttempts.get(normalizedJobId) === attempt)
        activeAttempts.delete(normalizedJobId)
    })
    attempt.promise = promise
    activeAttempts.set(normalizedJobId, attempt)
    return promise
  }

  function runJob(jobId: string) {
    const normalizedJobId = normalizeText(jobId, 240)
    const active = activeWorkers.get(normalizedJobId)
    if (active)
      return active
    if (stopping)
      return Promise.resolve()

    const worker = workerTail.then(async () => {
      let workerFailureCount = 0
      try {
        while (true) {
          if (stopping)
            break
          try {
            const current = await getJob(normalizedJobId)
            if (['completed', 'cancelled', 'failed'].includes(current.status))
              break
            if (current.status === 'running' || current.status === 'cancel_requested') {
              const now = input.now()
              if (current.leaseExpiresAt !== null && current.leaseExpiresAt > now) {
                workerFailureCount = 0
                await waitUntilAborted(
                  Math.min(250, Math.max(5, current.leaseExpiresAt - now)),
                  runtimeStopController.signal,
                )
                continue
              }
              await recoverExpiredLeases()
              workerFailureCount = 0
              continue
            }
            if (current.nextRetryAt !== null && current.nextRetryAt > input.now()) {
              workerFailureCount = 0
              await waitUntilAborted(
                Math.min(250, Math.max(5, current.nextRetryAt - input.now())),
                runtimeStopController.signal,
              )
              continue
            }
            const next = await runNextAttempt(normalizedJobId)
            workerFailureCount = 0
            if (['completed', 'cancelled', 'failed'].includes(next.status))
              break
            if (next.status === 'running' || next.status === 'cancel_requested')
              break
          }
          catch (error) {
            if (stopping)
              break
            workerFailureCount += 1
            await persistWorkerErrorBestEffort(normalizedJobId, error)
            await waitUntilAborted(
              workerRetryDelay(workerFailureCount),
              runtimeStopController.signal,
            )
          }
        }
      }
      finally {
        activeWorkers.delete(normalizedJobId)
      }
    })
    activeWorkers.set(normalizedJobId, worker)
    workerTail = worker.then(() => undefined, () => undefined)
    return worker
  }

  async function requestCancel(jobId: string, reason?: string, expectedCardId?: string) {
    const now = input.now()
    const cancellationReason = normalizeText(reason, 500) || '用户取消语义规模压测'
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const row = await readJobRow(jobId, expectedCardId)
        if (['completed', 'cancelled', 'failed'].includes(row.status))
          return
        const hasActiveLease = row.status === 'running'
          || row.status === 'cancel_requested'
          || Boolean(row.lease_token)
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = ?, dead_lettered = 0,
              next_retry_at = NULL, last_error = ?,
              completed_at = ?, updated_at = ?
          WHERE id = ?
        `, [
          hasActiveLease ? 'cancel_requested' : 'cancelled',
          cancellationReason,
          hasActiveLease ? null : now,
          now,
          row.id,
        ])
      })
    })
    activeAttempts.get(normalizeText(jobId, 240))
      ?.controller
      .abort(new Error(cancellationReason))
    return await getJob(jobId, expectedCardId)
  }

  async function retryJob(jobId: string, expectedCardId?: string) {
    const now = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        const row = await readJobRow(jobId, expectedCardId)
        if (row.status !== 'failed' || Number(row.dead_lettered) !== 1)
          throw new Error(`semantic scale job is not dead-lettered: ${row.id}`)
        await input.run(input.database, `
          UPDATE memory_semantic_scale_jobs
          SET status = 'queued', dead_lettered = 0,
              attempt_count = 0, next_retry_at = NULL,
              lease_token = NULL, lease_expires_at = NULL,
              progress_json = ?, report_json = NULL, last_error = NULL,
              started_at = NULL, completed_at = NULL, updated_at = ?
          WHERE id = ?
        `, [
          JSON.stringify(queuedProgress(Number(row.corpus_size))),
          now,
          row.id,
        ])
      })
    })
    return await getJob(jobId, expectedCardId)
  }

  async function resumePendingJobs(cardId?: string) {
    if (stopping)
      return []
    await recoverExpiredLeases()
    const normalizedCardId = normalizeText(cardId, 120)
    const rows = await input.all<{ id: string }>(
      input.database,
      `SELECT id
       FROM memory_semantic_scale_jobs
       WHERE status IN ('queued', 'running', 'cancel_requested')
         ${normalizedCardId ? 'AND card_id = ?' : ''}
       ORDER BY created_at ASC, id ASC`,
      normalizedCardId ? [normalizedCardId] : [],
    )
    for (const row of rows)
      void runJob(row.id)
    return rows.map(row => row.id)
  }

  function activeJobIds() {
    return [...activeWorkers.keys()]
  }

  async function stopWithDeadline() {
    const stopStartedAt = performance.now()
    const stopDeadline: StopDeadline = {
      expiresAt: stopStartedAt + stopTimeoutMs,
    }
    const attemptDeadline: StopDeadline = {
      expiresAt: stopStartedAt + Math.max(1, Math.floor(stopTimeoutMs / 4)),
    }
    stopping = true
    runtimeStopController.abort()
    const attempts = [...activeAttempts.values()]
    for (const attempt of attempts)
      abortAttemptForStop(attempt)

    const trackedPromises = [
      ...attempts
        .map(attempt => attempt.promise)
        .filter((promise): promise is Promise<MemorySemanticScaleJob> => promise !== null),
      ...activeWorkers.values(),
    ]
    let settledBeforeDeadline: PromiseSettledResult<unknown>[] | null = null
    try {
      settledBeforeDeadline = await withinStopDeadline(
        attemptDeadline,
        'active attempt settlement',
        async () => await Promise.allSettled(trackedPromises),
      )
    }
    catch (error) {
      if (!(error instanceof StopDeadlineExceededError))
        throw error
    }

    const stopErrors: unknown[] = []
    if (settledBeforeDeadline) {
      for (const result of settledBeforeDeadline) {
        if (result.status === 'rejected')
          stopErrors.push(result.reason)
      }
    }
    else {
      for (const attempt of attempts) {
        if (!attempt.settlementCompleted)
          attempt.detached = true
      }
      for (const attempt of attempts) {
        if (!attempt.settlementCompleted && !attempt.claimed) {
          stopErrors.push(new Error(
            `semantic scale stop deadline reached before claim state became recoverable: ${attempt.jobId}`,
          ))
        }
      }
    }

    const unsettledSettlements = attempts
      .map(attempt => attempt.settlementPromise)
      .filter((promise): promise is Promise<unknown> => promise !== null)
    if (unsettledSettlements.length > 0) {
      try {
        await withinStopDeadline(
          stopDeadline,
          'active settlement completion',
          async () => await Promise.allSettled(unsettledSettlements),
        )
      }
      catch (error) {
        stopErrors.push(error)
      }
    }

    const recoveryResults = await Promise.allSettled(
      attempts
        .filter(attempt =>
          !attempt.settlementCompleted
          && attempt.settlementPromise === null
          && attempt.claimed !== null)
        .map(async attempt => await preserveAttemptForRecovery(attempt, stopDeadline)),
    )
    for (const result of recoveryResults) {
      if (result.status === 'rejected')
        stopErrors.push(result.reason)
    }
    if (stopErrors.length > 0) {
      const details = stopErrors
        .map(error => errorText(error, 'unknown stop failure'))
        .join('; ')
      throw new AggregateError(
        stopErrors,
        `semantic scale runtime stop could not establish a safe recovery boundary: ${details}`,
      )
    }
  }

  function stop() {
    stopPromise ??= stopWithDeadline()
    return stopPromise
  }

  return {
    initializeSchema,
    startJob,
    getJob,
    listJobs,
    getLatestAvailableReport,
    runNextAttempt,
    runJob,
    requestCancel,
    retryJob,
    recoverExpiredLeases,
    resumePendingJobs,
    activeJobIds,
    stop,
  }
}
