import type {
  AlicizationActiveThought,
  AlicizationAuditLogInput,
  AlicizationChannelCapabilityManifestRecord,
  AlicizationChannelCapabilityManifestUpsertInput,
  AlicizationConversationTurnInput,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationExecutionEventKind,
  AlicizationExecutionEventRecord,
  AlicizationExecutionTaskKind,
  AlicizationExecutionTurnOrigin,
  AlicizationExecutorSessionRecord,
  AlicizationExecutorSessionStatus,
  AlicizationExecutorSessionUpsertInput,
  AlicizationListChannelCapabilityManifestsInput,
  AlicizationListExecutionEventsInput,
  AlicizationListExecutorSessionsInput,
  AlicizationListTaskThreadsInput,
  AlicizationMemoryFact,
  AlicizationMemoryFactInput,
  AlicizationMemoryLegacySnapshot,
  AlicizationMemoryMigrationResult,
  AlicizationMemorySource,
  AlicizationMemoryStats,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
  AlicizationSubconsciousFragment,
  AlicizationSubconsciousFragmentSourceKind,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
  AlicizationTaskThreadUpsertInput,
} from '../../../shared/eventa'

import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

const dayMs = 24 * 60 * 60 * 1000
const legacyMigrationMarker = 'legacy_memory_migrated_v1'
const memoryLastPrunedAtKey = 'memory_last_pruned_at'

interface SqliteStatementResult {
  changes: number
  lastID: number
}

interface MetaRow {
  value: string
}

interface CountRow {
  total: number
}

interface JournalModeRow {
  journal_mode: string
}

interface DbMemoryFactRow {
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AlicizationMemorySource
  dedupe_key: string
  created_at: number
  updated_at: number
  last_access_at: number | null
  access_count: number
}

interface DbConversationTurnRow {
  turn_id: string | null
  session_id: string
  user_text: string | null
  assistant_text: string | null
  structured_json: string | null
  created_at: number
}

interface DbMindTurnEventRow {
  id: string
  decision_trace_id: string
  turn_id: string | null
  session_id: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: AlicizationMindTurnEventKind
  payload_json: string | null
  created_at: number
}

interface DbTaskThreadRow {
  id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  origin: AlicizationExecutionTurnOrigin
  goal: string
  kind: AlicizationExecutionTaskKind
  status: AlicizationTaskThreadStatus
  selected_channel: AlicizationExecutionChannel | null
  proposed_channel: AlicizationExecutionChannel | null
  summary: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_event_at: number | null
  completed_at: number | null
}

interface DbExecutionEventRow {
  id: string
  thread_id: string
  decision_trace_id: string | null
  turn_id: string | null
  session_id: string | null
  origin: AlicizationExecutionTurnOrigin
  channel: AlicizationExecutionChannel | null
  kind: AlicizationExecutionEventKind
  thread_status: AlicizationTaskThreadStatus | null
  payload_json: string | null
  created_at: number
}

interface DbExecutorSessionRow {
  id: string
  channel: AlicizationExecutionChannel
  affinity_key: string
  external_session_id: string | null
  status: AlicizationExecutorSessionStatus
  summary: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_used_at: number | null
}

interface DbChannelCapabilityManifestRow {
  channel: AlicizationExecutionChannel
  available: number
  enabled: number
  ready: number
  session_affinity: number
  reason: string | null
  metadata_json: string | null
  created_at: number
  updated_at: number
  last_checked_at: number | null
}

interface DbActiveThoughtRow {
  id: string
  text: string
  created_at: number
  updated_at: number
}

interface DbSubconsciousFragmentRow {
  id: string
  text: string
  source_kind: AlicizationSubconsciousFragmentSourceKind
  created_at: number
  last_recalled_at: number | null
  recall_count: number
}

export interface AlicizationRelationshipDynamicsState {
  hostAttitude: string
  previousHostAttitude: string | null
  obedienceDelta: number
  livelinessDelta: number
  sensibilityDelta: number
  source: string
  createdAt: number
}

interface DbRelationshipDynamicsRow {
  host_attitude: string
  previous_host_attitude: string | null
  obedience_delta: number
  liveliness_delta: number
  sensibility_delta: number
  source: string
  created_at: number
}

type AlicizationScheduledTaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AlicizationScheduledTaskRecord {
  id: string
  taskId: string
  triggerAt: number
  message: string
  status: AlicizationScheduledTaskStatus
  createdAt: number
  claimedAt: number | null
  completedAt: number | null
  sourceTurnId: string | null
  firedTurnId: string | null
  lastError: string | null
}

interface DbScheduledTaskRow {
  id: string
  task_id: string
  trigger_at: number
  message: string
  status: AlicizationScheduledTaskStatus
  created_at: number
  claimed_at: number | null
  completed_at: number | null
  source_turn_id: string | null
  fired_turn_id: string | null
  last_error: string | null
}

interface DbWriteOptions {
  signal?: AbortSignal
}

const executionChannels = new Set<AlicizationExecutionChannel>([
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
])

const executionChannelSessionAffinity = new Set<AlicizationExecutionChannel>([
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
])

const executionTaskKinds = new Set<AlicizationExecutionTaskKind>([
  'run-command',
  'codebase-edit',
  'codebase-investigation',
  'browser-automation',
  'software-automation',
  'desktop-automation',
  'agent-delegation',
  'mixed',
  'unknown',
])

const taskThreadStatuses = new Set<AlicizationTaskThreadStatus>([
  'planned',
  'needs-affirmation',
  'running',
  'paused',
  'blocked',
  'completed',
  'failed',
  'cancelled',
])

const executionEventKinds = new Set<AlicizationExecutionEventKind>([
  'plan',
  'dispatch',
  'step',
  'result',
  'cancel',
  'resume',
  'takeover',
])

const executorSessionStatuses = new Set<AlicizationExecutorSessionStatus>([
  'active',
  'running',
  'failed',
  'suspended',
])

function parseMindTurnEventPayload(raw: string | null) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

function readMindTurnEventObject(raw: unknown) {
  return raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null
}

function readMindTurnEventText(raw: unknown) {
  return typeof raw === 'string' && raw.trim()
    ? raw.trim()
    : null
}

function resolveMindTurnEventActiveThreadId(payload: Record<string, unknown> | null) {
  if (!payload)
    return null

  const directActiveThreadId = readMindTurnEventText(payload.activeThreadId)
  if (directActiveThreadId)
    return directActiveThreadId

  const runtimeCandidate = readMindTurnEventObject(payload.runtime)
  const runtimeActiveThreadId = readMindTurnEventText(runtimeCandidate?.activeThreadId)
  if (runtimeActiveThreadId)
    return runtimeActiveThreadId

  const spineCandidate = readMindTurnEventObject(payload.digitalLifeSpine)
  const spineRuntimeCandidate = readMindTurnEventObject(spineCandidate?.runtime)
  const spineRuntimeActiveThreadId = readMindTurnEventText(spineRuntimeCandidate?.activeThreadId)
  if (spineRuntimeActiveThreadId)
    return spineRuntimeActiveThreadId

  return null
}

function parseJsonObject(raw: string | null) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function buildDedupeKey(subject: string, predicate: string, object: string) {
  return `${subject.trim().toLowerCase()}|${predicate.trim().toLowerCase()}|${object.trim().toLowerCase()}`
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 2),
  )
}

function scoreFact(queryTokens: Set<string>, fact: AlicizationMemoryFact, currentTs: number) {
  const factTokens = tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`)
  if (factTokens.size === 0)
    return 0

  let overlap = 0
  for (const token of factTokens) {
    if (queryTokens.has(token))
      overlap += 1
  }

  const lexicalScore = overlap / factTokens.size
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const decay = Math.exp(-ageDays / 14)
  const accessBoost = Math.min(0.2, fact.accessCount / 50)

  return (lexicalScore * 0.5 + fact.confidence * 0.4 + accessBoost * 0.1) * decay
}

function computePruneScore(fact: AlicizationMemoryFact, currentTs: number) {
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const timeDecay = Math.min(1, ageDays / 30)
  const accessFrequencyNorm = Math.min(1, fact.accessCount / 12)
  const confidenceNorm = clamp01(fact.confidence)
  return timeDecay * (1 - accessFrequencyNorm) * (1 - confidenceNorm)
}

function mapFactRow(row: DbMemoryFactRow): AlicizationMemoryFact {
  return {
    id: row.id,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    confidence: clamp01(row.confidence),
    source: row.source,
    dedupeKey: row.dedupe_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessAt: typeof row.last_access_at === 'number' ? row.last_access_at : null,
    accessCount: Math.max(0, Math.floor(row.access_count)),
  }
}

function mapActiveThoughtRow(row: DbActiveThoughtRow): AlicizationActiveThought {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSubconsciousFragmentRow(row: DbSubconsciousFragmentRow): AlicizationSubconsciousFragment {
  return {
    id: row.id,
    text: row.text,
    sourceKind: row.source_kind,
    createdAt: row.created_at,
    lastRecalledAt: typeof row.last_recalled_at === 'number' ? row.last_recalled_at : null,
    recallCount: Math.max(0, Math.floor(row.recall_count)),
  }
}

function normalizeExecutionOrigin(value: unknown): AlicizationExecutionTurnOrigin {
  return value === 'subconscious-proactive' || value === 'system'
    ? value
    : 'user-turn'
}

function normalizeExecutionChannel(value: unknown): AlicizationExecutionChannel | null {
  return typeof value === 'string' && executionChannels.has(value as AlicizationExecutionChannel)
    ? value as AlicizationExecutionChannel
    : null
}

function normalizeExecutionTaskKind(value: unknown): AlicizationExecutionTaskKind {
  return typeof value === 'string' && executionTaskKinds.has(value as AlicizationExecutionTaskKind)
    ? value as AlicizationExecutionTaskKind
    : 'unknown'
}

function normalizeTaskThreadStatus(value: unknown): AlicizationTaskThreadStatus {
  return typeof value === 'string' && taskThreadStatuses.has(value as AlicizationTaskThreadStatus)
    ? value as AlicizationTaskThreadStatus
    : 'planned'
}

function normalizeExecutionEventKind(value: unknown) {
  return typeof value === 'string' && executionEventKinds.has(value as AlicizationExecutionEventKind)
    ? value as AlicizationExecutionEventKind
    : null
}

function normalizeExecutorSessionStatus(value: unknown): AlicizationExecutorSessionStatus {
  return typeof value === 'string' && executorSessionStatuses.has(value as AlicizationExecutorSessionStatus)
    ? value as AlicizationExecutorSessionStatus
    : 'active'
}

function mapTaskThreadRow(row: DbTaskThreadRow): AlicizationTaskThreadRecord {
  return {
    id: row.id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    origin: row.origin,
    goal: row.goal,
    kind: row.kind,
    status: row.status,
    selectedChannel: row.selected_channel,
    proposedChannel: row.proposed_channel,
    summary: row.summary,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEventAt: row.last_event_at,
    completedAt: row.completed_at,
  }
}

function mapExecutionEventRow(row: DbExecutionEventRow): AlicizationExecutionEventRecord {
  return {
    id: row.id,
    threadId: row.thread_id,
    decisionTraceId: row.decision_trace_id,
    turnId: row.turn_id,
    sessionId: row.session_id,
    origin: row.origin,
    channel: row.channel,
    kind: row.kind,
    threadStatus: row.thread_status,
    payload: parseJsonObject(row.payload_json),
    createdAt: row.created_at,
  }
}

function mapExecutorSessionRow(row: DbExecutorSessionRow): AlicizationExecutorSessionRecord {
  return {
    id: row.id,
    channel: row.channel,
    affinityKey: row.affinity_key,
    externalSessionId: row.external_session_id,
    status: row.status,
    summary: row.summary,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  }
}

function mapChannelCapabilityManifestRow(row: DbChannelCapabilityManifestRow): AlicizationChannelCapabilityManifestRecord {
  return {
    channel: row.channel,
    available: row.available === 1,
    enabled: row.enabled === 1,
    ready: row.ready === 1,
    sessionAffinity: row.session_affinity === 1,
    reason: row.reason,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastCheckedAt: row.last_checked_at,
  }
}

function now() {
  return Date.now()
}

function clampRelationshipDelta(value: number, maxAbs = 0.08) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(-maxAbs, Math.min(maxAbs, value))
}

function mapScheduledTaskRow(row: DbScheduledTaskRow): AlicizationScheduledTaskRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    triggerAt: row.trigger_at,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    completedAt: row.completed_at,
    sourceTurnId: row.source_turn_id,
    firedTurnId: row.fired_turn_id,
    lastError: row.last_error,
  }
}

function createAbortError(reason?: unknown) {
  if (reason instanceof DOMException && reason.name === 'AbortError')
    return reason
  if (reason instanceof Error && reason.name === 'AbortError')
    return reason
  return new DOMException('Aborted before SQLite write execution', 'AbortError')
}

function assertWriteNotAborted(options?: DbWriteOptions) {
  if (!options?.signal?.aborted)
    return
  throw createAbortError(options.signal.reason)
}

function openDatabase(filepath: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    let database: sqlite3.Database | null = null
    const onOpen = (error: Error | null) => {
      if (error) {
        reject(error)
        return
      }
      if (database) {
        resolve(database)
        return
      }

      queueMicrotask(() => {
        if (database) {
          resolve(database)
          return
        }
        reject(new Error('sqlite3 opened without database handle'))
      })
    }

    database = new sqlite3.Database(filepath, onOpen)
  })
}

function run(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<SqliteStatementResult>((resolve, reject) => {
    database.run(sql, params, function callback(error) {
      if (error) {
        reject(error)
        return
      }

      resolve({
        changes: this.changes,
        lastID: this.lastID,
      })
    })
  })
}

function get<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row as T | undefined)
    })
  })
}

function all<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve((rows ?? []) as T[])
    })
  })
}

function close(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function runInTransaction<T>(database: sqlite3.Database, task: () => Promise<T>) {
  await run(database, 'BEGIN IMMEDIATE')
  try {
    const result = await task()
    await run(database, 'COMMIT')
    return result
  }
  catch (error) {
    await run(database, 'ROLLBACK').catch(() => {})
    throw error
  }
}

export interface AlicizationDbService {
  dbPath: string
  close: () => Promise<void>
  getMetaValue: (key: string) => Promise<string | undefined>
  setMetaValue: (key: string, value: string) => Promise<void>
  getLatestConversationSessionId: () => Promise<string | undefined>
  listConversationTurnsSince: (sinceExclusive: number, options?: { limit?: number }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }>>
  listConversationTurnsBySession: (sessionId: string, options?: { sinceCreatedAt?: number, limit?: number }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string | null
    assistantText: string | null
    structuredJson: string | null
    createdAt: number
  }>>
  appendMindTurnEvents: (events: AlicizationMindTurnEventInput[], options?: DbWriteOptions) => Promise<void>
  listMindTurnEvents: (input: {
    decisionTraceId?: string
    turnId?: string
    activeThreadId?: string
    limit?: number
  }) => Promise<AlicizationMindTurnEventRecord[]>
  getTaskThread: (id: string) => Promise<AlicizationTaskThreadRecord | undefined>
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput, options?: DbWriteOptions) => Promise<AlicizationTaskThreadRecord>
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
  upsertChannelCapabilityManifest: (input: AlicizationChannelCapabilityManifestUpsertInput, options?: DbWriteOptions) => Promise<AlicizationChannelCapabilityManifestRecord>
  listChannelCapabilityManifests: (input?: AlicizationListChannelCapabilityManifestsInput) => Promise<AlicizationChannelCapabilityManifestRecord[]>
  upsertExecutorSession: (input: AlicizationExecutorSessionUpsertInput, options?: DbWriteOptions) => Promise<AlicizationExecutorSessionRecord>
  listExecutorSessions: (input?: AlicizationListExecutorSessionsInput) => Promise<AlicizationExecutorSessionRecord[]>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[], options?: DbWriteOptions) => Promise<void>
  listExecutionEvents: (input?: AlicizationListExecutionEventsInput) => Promise<AlicizationExecutionEventRecord[]>
  clearConversationData: () => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput) => Promise<void>
  appendConversationTurn: (input: AlicizationConversationTurnInput, options?: DbWriteOptions) => Promise<void>
  getMemoryStats: () => Promise<AlicizationMemoryStats>
  upsertMemoryFacts: (facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource) => Promise<void>
  retrieveMemoryFacts: (query: string, limit?: number) => Promise<AlicizationMemoryFact[]>
  runMemoryPrune: () => Promise<AlicizationMemoryStats>
  importLegacyMemory: (snapshot: AlicizationMemoryLegacySnapshot) => Promise<AlicizationMemoryMigrationResult>
  overrideMemoryStats: (next: AlicizationMemoryStats) => Promise<AlicizationMemoryStats>
  listActiveThoughts: () => Promise<AlicizationActiveThought[]>
  replaceActiveThoughts: (thoughts: Array<{ text: string }>) => Promise<AlicizationActiveThought[]>
  appendSubconsciousFragments: (fragments: Array<{ text: string, sourceKind: AlicizationSubconsciousFragmentSourceKind }>) => Promise<AlicizationSubconsciousFragment[]>
  searchSubconsciousFragments: (query: string, limit?: number) => Promise<AlicizationSubconsciousFragment[]>
  listRecentSubconsciousFragments: (limit?: number) => Promise<AlicizationSubconsciousFragment[]>
  countSubconsciousFragments: () => Promise<number>
  appendRelationshipDynamics: (input: {
    hostAttitude: string
    previousHostAttitude?: string | null
    obedienceDelta?: number
    livelinessDelta?: number
    sensibilityDelta?: number
    source: string
    createdAt?: number
  }) => Promise<void>
  getLatestRelationshipDynamics: () => Promise<AlicizationRelationshipDynamicsState | null>
  insertScheduledTask: (input: {
    taskId: string
    triggerAt: number
    message: string
    sourceTurnId?: string
  }) => Promise<AlicizationScheduledTaskRecord>
  claimDueScheduledTasks: (nowMs: number, limit: number) => Promise<AlicizationScheduledTaskRecord[]>
  requeueScheduledTask: (taskId: string, reason?: string, nextTriggerAt?: number) => Promise<void>
  completeScheduledTask: (taskId: string, firedTurnId: string, completedAt?: number) => Promise<void>
  failScheduledTask: (taskId: string, error: string, completedAt?: number) => Promise<void>
  listPendingScheduledTasks: (limit?: number) => Promise<AlicizationScheduledTaskRecord[]>
  getJournalMode: () => Promise<string>
}

export async function setupAlicizationDb(
  userDataPath: string,
  options?: {
    rootDir?: string
    cardId?: string
  },
): Promise<AlicizationDbService> {
  const rootDir = options?.rootDir
    ?? (options?.cardId ? join(userDataPath, 'alicizations', 'cards', options.cardId) : join(userDataPath, 'alicizations'))
  const dbPath = join(rootDir, 'alicization.db')
  await mkdir(rootDir, { recursive: true })

  const database = await openDatabase(dbPath)

  let writeQueue = Promise.resolve<unknown>(undefined)

  const enqueueWrite = async <T>(task: () => Promise<T>, options?: DbWriteOptions) => {
    assertWriteNotAborted(options)
    const guardedTask = async () => {
      assertWriteNotAborted(options)
      return await task()
    }
    const next = writeQueue.then(guardedTask, guardedTask)
    writeQueue = next.then(() => undefined, () => undefined)
    return await next
  }

  async function initializeSchema() {
    await run(database, 'PRAGMA journal_mode = WAL;')
    await run(database, 'PRAGMA busy_timeout = 2000;')
    await run(database, 'PRAGMA foreign_keys = ON;')
    await run(database, 'PRAGMA synchronous = NORMAL;')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_facts (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_access_at INTEGER,
        access_count INTEGER NOT NULL DEFAULT 0
      )
    `)

    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_updated_at ON memory_facts(updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_facts_last_access_at ON memory_facts(last_access_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS memory_archive (
        id TEXT PRIMARY KEY,
        original_id TEXT,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        confidence REAL NOT NULL,
        source TEXT NOT NULL,
        dedupe_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_access_at INTEGER,
        access_count INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER NOT NULL
      )
    `)

    await run(database, 'CREATE INDEX IF NOT EXISTS idx_memory_archive_archived_at ON memory_archive(archived_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS active_thoughts (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_active_thoughts_updated_at ON active_thoughts(updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS subconscious_fragments (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_recalled_at INTEGER,
        recall_count INTEGER NOT NULL DEFAULT 0
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_subconscious_fragments_created_at ON subconscious_fragments(created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_subconscious_fragments_last_recalled_at ON subconscious_fragments(last_recalled_at DESC)')
    await run(database, `CREATE VIRTUAL TABLE IF NOT EXISTS subconscious_fragments_fts USING fts5(
      fragment_id UNINDEXED,
      text,
      tokenize = 'trigram'
    )`)

    await run(database, `
      CREATE TABLE IF NOT EXISTS relationship_dynamics (
        id TEXT PRIMARY KEY,
        host_attitude TEXT NOT NULL,
        previous_host_attitude TEXT,
        obedience_delta REAL NOT NULL,
        liveliness_delta REAL NOT NULL,
        sensibility_delta REAL NOT NULL,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_relationship_dynamics_created_at ON relationship_dynamics(created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS conversation_turns (
        id TEXT PRIMARY KEY,
        turn_id TEXT,
        session_id TEXT NOT NULL,
        user_text TEXT,
        assistant_text TEXT,
        structured_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    await run(database, 'ALTER TABLE conversation_turns ADD COLUMN turn_id TEXT').catch(() => {})
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_conversation_turns_turn_id ON conversation_turns(turn_id)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_conversation_turns_session_created_at ON conversation_turns(session_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS mind_turn_events (
        id TEXT PRIMARY KEY,
        decision_trace_id TEXT NOT NULL,
        turn_id TEXT,
        session_id TEXT,
        origin TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_mind_turn_events_trace_created_at ON mind_turn_events(decision_trace_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_mind_turn_events_turn_created_at ON mind_turn_events(turn_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_mind_turn_events_session_created_at ON mind_turn_events(session_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS task_threads (
        id TEXT PRIMARY KEY,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        origin TEXT NOT NULL,
        goal TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        selected_channel TEXT,
        proposed_channel TEXT,
        summary TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_event_at INTEGER,
        completed_at INTEGER
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_trace_updated_at ON task_threads(decision_trace_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_turn_updated_at ON task_threads(turn_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_session_updated_at ON task_threads(session_id, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_task_threads_status_updated_at ON task_threads(status, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS capability_manifests (
        channel TEXT PRIMARY KEY,
        available INTEGER NOT NULL,
        enabled INTEGER NOT NULL,
        ready INTEGER NOT NULL,
        session_affinity INTEGER NOT NULL,
        reason TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_checked_at INTEGER
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_capability_manifests_updated_at ON capability_manifests(updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_capability_manifests_available_ready ON capability_manifests(available, ready, updated_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS executor_sessions (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        affinity_key TEXT NOT NULL,
        external_session_id TEXT,
        status TEXT NOT NULL,
        summary TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER,
        UNIQUE(channel, affinity_key)
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_sessions_channel_updated_at ON executor_sessions(channel, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_sessions_status_updated_at ON executor_sessions(status, updated_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_sessions_last_used_at ON executor_sessions(last_used_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS executor_events (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        decision_trace_id TEXT,
        turn_id TEXT,
        session_id TEXT,
        origin TEXT NOT NULL,
        channel TEXT,
        kind TEXT NOT NULL,
        thread_status TEXT,
        payload_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_thread_created_at ON executor_events(thread_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_trace_created_at ON executor_events(decision_trace_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_turn_created_at ON executor_events(turn_id, created_at DESC)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_executor_events_session_created_at ON executor_events(session_id, created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    await run(database, 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)')

    await run(database, `
      CREATE TABLE IF NOT EXISTS alicization_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    await run(database, `
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL UNIQUE,
        trigger_at INTEGER NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        claimed_at INTEGER,
        completed_at INTEGER,
        source_turn_id TEXT,
        fired_turn_id TEXT,
        last_error TEXT
      )
    `)
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status_trigger_at ON scheduled_tasks(status, trigger_at)')
    await run(database, 'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_task_id ON scheduled_tasks(task_id)')
  }

  async function upsertMeta(key: string, value: string) {
    const ts = now()
    await run(
      database,
      `
      INSERT INTO alicization_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      [key, value, ts],
    )
  }

  async function getMetaValue(key: string) {
    const row = await get<MetaRow>(database, 'SELECT value FROM alicization_meta WHERE key = ? LIMIT 1', [key])
    return row?.value
  }

  async function getLastPrunedAt() {
    const value = await getMetaValue(memoryLastPrunedAtKey)
    if (!value)
      return null

    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed))
      return null
    return parsed
  }

  async function getMemoryStats() {
    const [totalRow, archivedRow, lastPrunedAt] = await Promise.all([
      get<CountRow>(database, 'SELECT COUNT(1) AS total FROM memory_facts'),
      get<CountRow>(database, 'SELECT COUNT(1) AS total FROM memory_archive'),
      getLastPrunedAt(),
    ])

    const active = totalRow?.total ?? 0
    const archived = archivedRow?.total ?? 0
    return {
      total: active + archived,
      active,
      archived,
      lastPrunedAt,
    } satisfies AlicizationMemoryStats
  }

  async function appendAuditLog(input: AlicizationAuditLogInput) {
    const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : now()
    const level = input.level ?? 'info'
    const payloadJson = input.payload ? JSON.stringify(input.payload) : null

    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT INTO audit_logs (id, level, category, action, message, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          level,
          input.category,
          input.action,
          input.message,
          payloadJson,
          createdAt,
        ],
      )
    })
  }

  async function appendConversationTurn(input: AlicizationConversationTurnInput, options?: DbWriteOptions) {
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId.trim() : ''
    if (!sessionId)
      throw new Error('sessionId is required')

    assertWriteNotAborted(options)
    const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : now()
    const turnId = typeof input.turnId === 'string' && input.turnId.trim()
      ? input.turnId.trim()
      : null
    const userText = typeof input.userText === 'string' ? input.userText : null
    const assistantText = typeof input.assistantText === 'string' ? input.assistantText : null
    const structuredJson = input.structured ? JSON.stringify(input.structured) : null

    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
        database,
        `
        INSERT INTO conversation_turns (
          id,
          turn_id,
          session_id,
          user_text,
          assistant_text,
          structured_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          turnId,
          sessionId,
          userText,
          assistantText,
          structuredJson,
          createdAt,
        ],
      )
    }, options)
  }

  async function getLatestConversationSessionId() {
    const row = await get<{ session_id?: string | null }>(
      database,
      `
      SELECT session_id
      FROM conversation_turns
      WHERE session_id IS NOT NULL AND TRIM(session_id) != ''
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    if (typeof row?.session_id !== 'string')
      return undefined
    const normalized = row.session_id.trim()
    return normalized || undefined
  }

  async function listConversationTurnsSince(sinceExclusive: number, options?: { limit?: number }) {
    const limit = Math.max(1, Math.min(10_000, Math.floor(options?.limit ?? 2_000)))
    const rows = await all<DbConversationTurnRow>(
      database,
      `
      SELECT
        turn_id,
        session_id,
        user_text,
        assistant_text,
        structured_json,
        created_at
      FROM conversation_turns
      WHERE created_at > ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [sinceExclusive, limit],
    )

    return rows.map(row => ({
      turnId: row.turn_id,
      sessionId: row.session_id,
      userText: row.user_text,
      assistantText: row.assistant_text,
      structuredJson: row.structured_json,
      createdAt: row.created_at,
    }))
  }

  async function listConversationTurnsBySession(sessionIdRaw: string, options?: { sinceCreatedAt?: number, limit?: number }) {
    const sessionId = sessionIdRaw.trim()
    if (!sessionId)
      return []

    const sinceCreatedAt = Number.isFinite(options?.sinceCreatedAt)
      ? Math.max(0, Math.floor(Number(options?.sinceCreatedAt)))
      : 0
    const limit = Math.max(1, Math.min(10_000, Math.floor(options?.limit ?? 500)))
    const rows = await all<DbConversationTurnRow>(
      database,
      `
      SELECT
        turn_id,
        session_id,
        user_text,
        assistant_text,
        structured_json,
        created_at
      FROM conversation_turns
      WHERE session_id = ?
        AND created_at >= ?
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [sessionId, sinceCreatedAt, limit],
    )

    return rows.map(row => ({
      turnId: row.turn_id,
      sessionId: row.session_id,
      userText: row.user_text,
      assistantText: row.assistant_text,
      structuredJson: row.structured_json,
      createdAt: row.created_at,
    }))
  }

  async function appendMindTurnEvents(events: AlicizationMindTurnEventInput[], options?: DbWriteOptions) {
    if (events.length === 0)
      return

    const normalized = events
      .map((event) => {
        const decisionTraceId = typeof event.decisionTraceId === 'string'
          ? event.decisionTraceId.trim()
          : ''
        if (!decisionTraceId)
          return null
        const kind = event.kind
        if (!kind)
          return null

        return {
          id: randomUUID(),
          decisionTraceId,
          turnId: typeof event.turnId === 'string' && event.turnId.trim()
            ? event.turnId.trim()
            : null,
          sessionId: typeof event.sessionId === 'string' && event.sessionId.trim()
            ? event.sessionId.trim()
            : null,
          origin: event.origin === 'subconscious-proactive'
            ? 'subconscious-proactive'
            : event.origin === 'system'
              ? 'system'
              : 'user-turn' as const,
          kind,
          payloadJson: event.payload && typeof event.payload === 'object'
            ? JSON.stringify(event.payload)
            : null,
          createdAt: Number.isFinite(event.createdAt)
            ? Math.max(0, Math.floor(Number(event.createdAt)))
            : now(),
        }
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (normalized.length === 0)
      return

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await runInTransaction(database, async () => {
        for (const event of normalized) {
          await run(
            database,
            `
            INSERT INTO mind_turn_events (
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              event.id,
              event.decisionTraceId,
              event.turnId,
              event.sessionId,
              event.origin,
              event.kind,
              event.payloadJson,
              event.createdAt,
            ],
          )
        }
      })
    }, options)
  }

  async function listMindTurnEvents(input: {
    decisionTraceId?: string
    turnId?: string
    activeThreadId?: string
    limit?: number
  }) {
    const decisionTraceId = typeof input.decisionTraceId === 'string'
      ? input.decisionTraceId.trim()
      : ''
    const turnId = typeof input.turnId === 'string'
      ? input.turnId.trim()
      : ''
    const activeThreadId = typeof input.activeThreadId === 'string'
      ? input.activeThreadId.trim()
      : ''
    if (!decisionTraceId && !turnId)
      return [] as AlicizationMindTurnEventRecord[]

    const limit = Math.max(1, Math.min(5_000, Math.floor(input.limit ?? 300)))
    const rows = decisionTraceId && turnId
      ? await all<DbMindTurnEventRow>(
          database,
          `
          SELECT
            id,
            decision_trace_id,
            turn_id,
            session_id,
            origin,
            kind,
            payload_json,
            created_at
          FROM mind_turn_events
          WHERE decision_trace_id = ?
            AND turn_id = ?
          ORDER BY created_at DESC
          LIMIT ?
          `,
          [decisionTraceId, turnId, limit],
        )
      : decisionTraceId
        ? await all<DbMindTurnEventRow>(
            database,
            `
            SELECT
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            FROM mind_turn_events
            WHERE decision_trace_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            `,
            [decisionTraceId, limit],
          )
        : await all<DbMindTurnEventRow>(
            database,
            `
            SELECT
              id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              kind,
              payload_json,
              created_at
            FROM mind_turn_events
            WHERE turn_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            `,
            [turnId, limit],
          )

    const mappedRows = [...rows]
      .reverse()
      .map((row): AlicizationMindTurnEventRecord => ({
        id: row.id,
        decisionTraceId: row.decision_trace_id,
        turnId: row.turn_id,
        sessionId: row.session_id,
        origin: row.origin,
        kind: row.kind,
        payload: parseMindTurnEventPayload(row.payload_json),
        createdAt: row.created_at,
      }))

    if (!activeThreadId)
      return mappedRows

    return mappedRows.filter((row) => {
      return resolveMindTurnEventActiveThreadId(row.payload) === activeThreadId
    })
  }

  async function upsertTaskThread(input: AlicizationTaskThreadUpsertInput, options?: DbWriteOptions) {
    const goal = input.goal.trim()
    if (!goal)
      throw new Error('goal is required')

    const currentTs = now()
    const id = typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : randomUUID()
    const decisionTraceId = typeof input.decisionTraceId === 'string' && input.decisionTraceId.trim()
      ? input.decisionTraceId.trim()
      : null
    const turnId = typeof input.turnId === 'string' && input.turnId.trim()
      ? input.turnId.trim()
      : null
    const sessionId = typeof input.sessionId === 'string' && input.sessionId.trim()
      ? input.sessionId.trim()
      : null
    const origin = normalizeExecutionOrigin(input.origin)
    const kind = normalizeExecutionTaskKind(input.kind)
    const status = normalizeTaskThreadStatus(input.status)
    const selectedChannel = normalizeExecutionChannel(input.selectedChannel)
    const proposedChannel = normalizeExecutionChannel(input.proposedChannel)
    const summary = typeof input.summary === 'string' && input.summary.trim()
      ? input.summary.trim()
      : null
    const metadataJson = input.metadata && typeof input.metadata === 'object'
      ? JSON.stringify(input.metadata)
      : null
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : currentTs
    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(createdAt, Math.floor(Number(input.updatedAt)))
      : currentTs
    const lastEventAt = Number.isFinite(input.lastEventAt)
      ? Math.max(0, Math.floor(Number(input.lastEventAt)))
      : null
    const completedAt = Number.isFinite(input.completedAt)
      ? Math.max(0, Math.floor(Number(input.completedAt)))
      : null

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
        database,
        `
        INSERT INTO task_threads (
          id,
          decision_trace_id,
          turn_id,
          session_id,
          origin,
          goal,
          kind,
          status,
          selected_channel,
          proposed_channel,
          summary,
          metadata_json,
          created_at,
          updated_at,
          last_event_at,
          completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
          decision_trace_id = excluded.decision_trace_id,
          turn_id = excluded.turn_id,
          session_id = excluded.session_id,
          origin = excluded.origin,
          goal = excluded.goal,
          kind = excluded.kind,
          status = excluded.status,
          selected_channel = excluded.selected_channel,
          proposed_channel = excluded.proposed_channel,
          summary = excluded.summary,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          last_event_at = excluded.last_event_at,
          completed_at = excluded.completed_at
        `,
        [
          id,
          decisionTraceId,
          turnId,
          sessionId,
          origin,
          goal,
          kind,
          status,
          selectedChannel,
          proposedChannel,
          summary,
          metadataJson,
          createdAt,
          updatedAt,
          lastEventAt,
          completedAt,
        ],
      )
    }, options)

    return {
      id,
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      goal,
      kind,
      status,
      selectedChannel,
      proposedChannel,
      summary,
      metadata: metadataJson ? parseJsonObject(metadataJson) : null,
      createdAt,
      updatedAt,
      lastEventAt,
      completedAt,
    } satisfies AlicizationTaskThreadRecord
  }

  async function getTaskThread(id: string) {
    const threadId = typeof id === 'string'
      ? id.trim()
      : ''
    if (!threadId)
      return undefined

    const row = await get<DbTaskThreadRow>(
      database,
      `
      SELECT
        id,
        decision_trace_id,
        turn_id,
        session_id,
        origin,
        goal,
        kind,
        status,
        selected_channel,
        proposed_channel,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_event_at,
        completed_at
      FROM task_threads
      WHERE id = ?
      LIMIT 1
      `,
      [threadId],
    )

    return row ? mapTaskThreadRow(row) : undefined
  }

  async function listTaskThreads(input?: AlicizationListTaskThreadsInput) {
    const decisionTraceId = typeof input?.decisionTraceId === 'string'
      ? input.decisionTraceId.trim()
      : ''
    const turnId = typeof input?.turnId === 'string'
      ? input.turnId.trim()
      : ''
    const sessionId = typeof input?.sessionId === 'string'
      ? input.sessionId.trim()
      : ''
    const statuses = Array.isArray(input?.status)
      ? input.status
          .map((value: AlicizationTaskThreadStatus) => normalizeTaskThreadStatus(value))
      : input?.status
        ? [normalizeTaskThreadStatus(input.status)]
        : []
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 200)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (decisionTraceId) {
      whereClauses.push('decision_trace_id = ?')
      params.push(decisionTraceId)
    }
    if (turnId) {
      whereClauses.push('turn_id = ?')
      params.push(turnId)
    }
    if (sessionId) {
      whereClauses.push('session_id = ?')
      params.push(sessionId)
    }
    if (statuses.length === 1) {
      whereClauses.push('status = ?')
      params.push(statuses[0])
    }
    else if (statuses.length > 1) {
      whereClauses.push(`status IN (${statuses.map(() => '?').join(', ')})`)
      params.push(...statuses)
    }

    const rows = await all<DbTaskThreadRow>(
      database,
      `
      SELECT
        id,
        decision_trace_id,
        turn_id,
        session_id,
        origin,
        goal,
        kind,
        status,
        selected_channel,
        proposed_channel,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_event_at,
        completed_at
      FROM task_threads
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY COALESCE(last_event_at, updated_at) DESC, updated_at DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return rows.map(mapTaskThreadRow)
  }

  async function upsertChannelCapabilityManifest(input: AlicizationChannelCapabilityManifestUpsertInput, options?: DbWriteOptions) {
    const channel = normalizeExecutionChannel(input.channel)
    if (!channel)
      throw new Error('channel is required')

    const available = input.available !== false
    const enabled = input.enabled !== false
    const ready = input.ready !== false
    const sessionAffinity = typeof input.sessionAffinity === 'boolean'
      ? input.sessionAffinity
      : executionChannelSessionAffinity.has(channel)
    const reason = typeof input.reason === 'string' && input.reason.trim()
      ? input.reason.trim().slice(0, 360)
      : null
    const metadataJson = input.metadata && typeof input.metadata === 'object'
      ? JSON.stringify(input.metadata)
      : null

    const currentTs = now()
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : currentTs
    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(createdAt, Math.floor(Number(input.updatedAt)))
      : currentTs
    const lastCheckedAt = Number.isFinite(input.lastCheckedAt)
      ? Math.max(0, Math.floor(Number(input.lastCheckedAt)))
      : updatedAt

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
        database,
        `
        INSERT INTO capability_manifests (
          channel,
          available,
          enabled,
          ready,
          session_affinity,
          reason,
          metadata_json,
          created_at,
          updated_at,
          last_checked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel)
        DO UPDATE SET
          available = excluded.available,
          enabled = excluded.enabled,
          ready = excluded.ready,
          session_affinity = excluded.session_affinity,
          reason = excluded.reason,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          last_checked_at = excluded.last_checked_at
        `,
        [
          channel,
          available ? 1 : 0,
          enabled ? 1 : 0,
          ready ? 1 : 0,
          sessionAffinity ? 1 : 0,
          reason,
          metadataJson,
          createdAt,
          updatedAt,
          lastCheckedAt,
        ],
      )
    }, options)

    const row = await get<DbChannelCapabilityManifestRow>(
      database,
      `
      SELECT
        channel,
        available,
        enabled,
        ready,
        session_affinity,
        reason,
        metadata_json,
        created_at,
        updated_at,
        last_checked_at
      FROM capability_manifests
      WHERE channel = ?
      LIMIT 1
      `,
      [channel],
    )

    if (row)
      return mapChannelCapabilityManifestRow(row)

    return {
      channel,
      available,
      enabled,
      ready,
      sessionAffinity,
      reason,
      metadata: metadataJson ? parseJsonObject(metadataJson) : null,
      createdAt,
      updatedAt,
      lastCheckedAt,
    } satisfies AlicizationChannelCapabilityManifestRecord
  }

  async function listChannelCapabilityManifests(input?: AlicizationListChannelCapabilityManifestsInput) {
    const channels = Array.isArray(input?.channel)
      ? input.channel
          .map(value => normalizeExecutionChannel(value))
          .filter((value): value is AlicizationExecutionChannel => Boolean(value))
      : input?.channel
        ? [normalizeExecutionChannel(input.channel)].filter((value): value is AlicizationExecutionChannel => Boolean(value))
        : []
    const available = typeof input?.available === 'boolean'
      ? input.available
      : null
    const enabled = typeof input?.enabled === 'boolean'
      ? input.enabled
      : null
    const ready = typeof input?.ready === 'boolean'
      ? input.ready
      : null
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 200)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (channels.length === 1) {
      whereClauses.push('channel = ?')
      params.push(channels[0])
    }
    else if (channels.length > 1) {
      whereClauses.push(`channel IN (${channels.map(() => '?').join(', ')})`)
      params.push(...channels)
    }
    if (available !== null) {
      whereClauses.push('available = ?')
      params.push(available ? 1 : 0)
    }
    if (enabled !== null) {
      whereClauses.push('enabled = ?')
      params.push(enabled ? 1 : 0)
    }
    if (ready !== null) {
      whereClauses.push('ready = ?')
      params.push(ready ? 1 : 0)
    }

    const rows = await all<DbChannelCapabilityManifestRow>(
      database,
      `
      SELECT
        channel,
        available,
        enabled,
        ready,
        session_affinity,
        reason,
        metadata_json,
        created_at,
        updated_at,
        last_checked_at
      FROM capability_manifests
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY updated_at DESC, COALESCE(last_checked_at, updated_at) DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return rows.map(mapChannelCapabilityManifestRow)
  }

  async function upsertExecutorSession(input: AlicizationExecutorSessionUpsertInput, options?: DbWriteOptions) {
    const channel = normalizeExecutionChannel(input.channel)
    if (!channel)
      throw new Error('channel is required')

    const affinityKey = typeof input.affinityKey === 'string'
      ? input.affinityKey.trim()
      : ''
    if (!affinityKey)
      throw new Error('affinityKey is required')

    const id = typeof input.id === 'string' && input.id.trim()
      ? input.id.trim()
      : randomUUID()
    const externalSessionId = typeof input.externalSessionId === 'string' && input.externalSessionId.trim()
      ? input.externalSessionId.trim()
      : null
    const status = normalizeExecutorSessionStatus(input.status)
    const summary = typeof input.summary === 'string' && input.summary.trim()
      ? input.summary.trim()
      : null
    const metadataJson = input.metadata && typeof input.metadata === 'object'
      ? JSON.stringify(input.metadata)
      : null
    const currentTs = now()
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : currentTs
    const updatedAt = Number.isFinite(input.updatedAt)
      ? Math.max(createdAt, Math.floor(Number(input.updatedAt)))
      : currentTs
    const lastUsedAt = Number.isFinite(input.lastUsedAt)
      ? Math.max(0, Math.floor(Number(input.lastUsedAt)))
      : updatedAt

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await run(
        database,
        `
        INSERT INTO executor_sessions (
          id,
          channel,
          affinity_key,
          external_session_id,
          status,
          summary,
          metadata_json,
          created_at,
          updated_at,
          last_used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel, affinity_key)
        DO UPDATE SET
          external_session_id = excluded.external_session_id,
          status = excluded.status,
          summary = excluded.summary,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          last_used_at = excluded.last_used_at
        `,
        [
          id,
          channel,
          affinityKey,
          externalSessionId,
          status,
          summary,
          metadataJson,
          createdAt,
          updatedAt,
          lastUsedAt,
        ],
      )
    }, options)

    const row = await get<DbExecutorSessionRow>(
      database,
      `
      SELECT
        id,
        channel,
        affinity_key,
        external_session_id,
        status,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_used_at
      FROM executor_sessions
      WHERE channel = ?
        AND affinity_key = ?
      LIMIT 1
      `,
      [channel, affinityKey],
    )

    if (row)
      return mapExecutorSessionRow(row)

    return {
      id,
      channel,
      affinityKey,
      externalSessionId,
      status,
      summary,
      metadata: metadataJson ? parseJsonObject(metadataJson) : null,
      createdAt,
      updatedAt,
      lastUsedAt,
    } satisfies AlicizationExecutorSessionRecord
  }

  async function listExecutorSessions(input?: AlicizationListExecutorSessionsInput) {
    const channels = Array.isArray(input?.channel)
      ? input.channel
          .map(value => normalizeExecutionChannel(value))
          .filter((value): value is AlicizationExecutionChannel => Boolean(value))
      : input?.channel
        ? [normalizeExecutionChannel(input.channel)].filter((value): value is AlicizationExecutionChannel => Boolean(value))
        : []
    const affinityKey = typeof input?.affinityKey === 'string'
      ? input.affinityKey.trim()
      : ''
    const statuses = Array.isArray(input?.status)
      ? input.status.map(value => normalizeExecutorSessionStatus(value))
      : input?.status
        ? [normalizeExecutorSessionStatus(input.status)]
        : []
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 200)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (channels.length === 1) {
      whereClauses.push('channel = ?')
      params.push(channels[0])
    }
    else if (channels.length > 1) {
      whereClauses.push(`channel IN (${channels.map(() => '?').join(', ')})`)
      params.push(...channels)
    }
    if (affinityKey) {
      whereClauses.push('affinity_key = ?')
      params.push(affinityKey)
    }
    if (statuses.length === 1) {
      whereClauses.push('status = ?')
      params.push(statuses[0])
    }
    else if (statuses.length > 1) {
      whereClauses.push(`status IN (${statuses.map(() => '?').join(', ')})`)
      params.push(...statuses)
    }

    const rows = await all<DbExecutorSessionRow>(
      database,
      `
      SELECT
        id,
        channel,
        affinity_key,
        external_session_id,
        status,
        summary,
        metadata_json,
        created_at,
        updated_at,
        last_used_at
      FROM executor_sessions
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY COALESCE(last_used_at, updated_at) DESC, updated_at DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return rows.map(mapExecutorSessionRow)
  }

  async function appendExecutionEvents(events: AlicizationExecutionEventInput[], options?: DbWriteOptions) {
    if (events.length === 0)
      return

    const normalized = events
      .map((event) => {
        const threadId = typeof event.threadId === 'string'
          ? event.threadId.trim()
          : ''
        const kind = normalizeExecutionEventKind(event.kind)
        if (!threadId || !kind)
          return null

        return {
          id: randomUUID(),
          threadId,
          decisionTraceId: typeof event.decisionTraceId === 'string' && event.decisionTraceId.trim()
            ? event.decisionTraceId.trim()
            : null,
          turnId: typeof event.turnId === 'string' && event.turnId.trim()
            ? event.turnId.trim()
            : null,
          sessionId: typeof event.sessionId === 'string' && event.sessionId.trim()
            ? event.sessionId.trim()
            : null,
          origin: normalizeExecutionOrigin(event.origin),
          channel: normalizeExecutionChannel(event.channel),
          kind,
          threadStatus: event.threadStatus
            ? normalizeTaskThreadStatus(event.threadStatus)
            : null,
          payloadJson: event.payload && typeof event.payload === 'object'
            ? JSON.stringify(event.payload)
            : null,
          createdAt: Number.isFinite(event.createdAt)
            ? Math.max(0, Math.floor(Number(event.createdAt)))
            : now(),
        }
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event))

    if (normalized.length === 0)
      return

    const latestByThread = new Map<string, (typeof normalized)[number]>()
    for (const event of normalized) {
      const current = latestByThread.get(event.threadId)
      if (!current || current.createdAt <= event.createdAt) {
        latestByThread.set(event.threadId, event)
      }
    }

    assertWriteNotAborted(options)
    await enqueueWrite(async () => {
      assertWriteNotAborted(options)
      await runInTransaction(database, async () => {
        for (const event of normalized) {
          await run(
            database,
            `
            INSERT INTO executor_events (
              id,
              thread_id,
              decision_trace_id,
              turn_id,
              session_id,
              origin,
              channel,
              kind,
              thread_status,
              payload_json,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              event.id,
              event.threadId,
              event.decisionTraceId,
              event.turnId,
              event.sessionId,
              event.origin,
              event.channel,
              event.kind,
              event.threadStatus,
              event.payloadJson,
              event.createdAt,
            ],
          )
        }

        for (const latest of latestByThread.values()) {
          const completedAt = latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled'
            ? latest.createdAt
            : null
          await run(
            database,
            `
            UPDATE task_threads
            SET updated_at = ?,
                last_event_at = ?,
                status = COALESCE(?, status),
                completed_at = COALESCE(?, completed_at)
            WHERE id = ?
            `,
            [
              latest.createdAt,
              latest.createdAt,
              latest.threadStatus,
              completedAt,
              latest.threadId,
            ],
          )
        }
      })
    }, options)
  }

  async function listExecutionEvents(input?: AlicizationListExecutionEventsInput) {
    const threadId = typeof input?.threadId === 'string'
      ? input.threadId.trim()
      : ''
    const decisionTraceId = typeof input?.decisionTraceId === 'string'
      ? input.decisionTraceId.trim()
      : ''
    const turnId = typeof input?.turnId === 'string'
      ? input.turnId.trim()
      : ''
    const limit = Math.max(1, Math.min(5_000, Math.floor(input?.limit ?? 300)))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (threadId) {
      whereClauses.push('thread_id = ?')
      params.push(threadId)
    }
    if (decisionTraceId) {
      whereClauses.push('decision_trace_id = ?')
      params.push(decisionTraceId)
    }
    if (turnId) {
      whereClauses.push('turn_id = ?')
      params.push(turnId)
    }

    const rows = await all<DbExecutionEventRow>(
      database,
      `
      SELECT
        id,
        thread_id,
        decision_trace_id,
        turn_id,
        session_id,
        origin,
        channel,
        kind,
        thread_status,
        payload_json,
        created_at
      FROM executor_events
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [...params, limit],
    )

    return [...rows].reverse().map(mapExecutionEventRow)
  }

  async function clearConversationData() {
    await enqueueWrite(async () => await runInTransaction(database, async () => {
      await run(database, 'DELETE FROM conversation_turns')
      await run(database, 'DELETE FROM mind_turn_events')
      await run(database, 'DELETE FROM task_threads')
      await run(database, 'DELETE FROM executor_sessions')
      await run(database, 'DELETE FROM executor_events')
      await run(database, 'DELETE FROM scheduled_tasks')
    }))
  }

  async function insertScheduledTask(input: {
    taskId: string
    triggerAt: number
    message: string
    sourceTurnId?: string
  }) {
    const taskId = input.taskId.trim()
    const message = input.message.trim()
    if (!taskId)
      throw new Error('taskId is required')
    if (!message)
      throw new Error('message is required')

    const createdAt = now()
    const triggerAt = Number.isFinite(input.triggerAt) ? Math.floor(input.triggerAt) : createdAt
    const id = randomUUID()
    const sourceTurnId = input.sourceTurnId?.trim() || null
    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT INTO scheduled_tasks (
          id,
          task_id,
          trigger_at,
          message,
          status,
          created_at,
          source_turn_id
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
        `,
        [id, taskId, triggerAt, message, createdAt, sourceTurnId],
      )
    })

    return {
      id,
      taskId,
      triggerAt,
      message,
      status: 'pending',
      createdAt,
      claimedAt: null,
      completedAt: null,
      sourceTurnId,
      firedTurnId: null,
      lastError: null,
    } satisfies AlicizationScheduledTaskRecord
  }

  async function claimDueScheduledTasks(nowMs: number, limit: number) {
    const safeNow = Number.isFinite(nowMs) ? Math.floor(nowMs) : now()
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)))
    return await enqueueWrite(async () => await runInTransaction(database, async () => {
      const dueRows = await all<DbScheduledTaskRow>(
        database,
        `
        SELECT *
        FROM scheduled_tasks
        WHERE status = 'pending'
          AND trigger_at <= ?
        ORDER BY trigger_at ASC
        LIMIT ?
        `,
        [safeNow, safeLimit],
      )
      const claimed: AlicizationScheduledTaskRecord[] = []
      for (const row of dueRows) {
        const claimAt = now()
        const result = await run(
          database,
          `
          UPDATE scheduled_tasks
          SET status = 'running',
              claimed_at = ?,
              last_error = NULL
          WHERE id = ?
            AND status = 'pending'
          `,
          [claimAt, row.id],
        )
        if (result.changes < 1)
          continue

        claimed.push({
          ...mapScheduledTaskRow(row),
          status: 'running',
          claimedAt: claimAt,
          lastError: null,
        })
      }
      return claimed
    }))
  }

  async function completeScheduledTask(taskIdRaw: string, firedTurnIdRaw: string, completedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    const firedTurnId = firedTurnIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    if (!firedTurnId)
      throw new Error('firedTurnId is required')
    const completedAt = typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
      ? Math.floor(completedAtRaw)
      : now()

    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE scheduled_tasks
        SET status = 'completed',
            fired_turn_id = ?,
            completed_at = ?,
            last_error = NULL
        WHERE task_id = ?
        `,
        [firedTurnId, completedAt, taskId],
      )
    })
  }

  async function requeueScheduledTask(taskIdRaw: string, reasonRaw?: string, nextTriggerAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const reason = reasonRaw?.trim() || null
    const nextTriggerAt = Number.isFinite(nextTriggerAtRaw)
      ? Math.max(0, Math.floor(Number(nextTriggerAtRaw)))
      : null

    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE scheduled_tasks
        SET status = 'pending',
            trigger_at = COALESCE(?, trigger_at),
            claimed_at = NULL,
            completed_at = NULL,
            fired_turn_id = NULL,
            last_error = ?
        WHERE task_id = ?
        `,
        [nextTriggerAt, reason, taskId],
      )
    })
  }

  async function failScheduledTask(taskIdRaw: string, errorRaw: string, completedAtRaw?: number) {
    const taskId = taskIdRaw.trim()
    if (!taskId)
      throw new Error('taskId is required')
    const message = errorRaw.trim() || 'unknown reminder error'
    const completedAt = typeof completedAtRaw === 'number' && Number.isFinite(completedAtRaw)
      ? Math.floor(completedAtRaw)
      : now()

    await enqueueWrite(async () => {
      await run(
        database,
        `
        UPDATE scheduled_tasks
        SET status = 'failed',
            completed_at = ?,
            last_error = ?
        WHERE task_id = ?
        `,
        [completedAt, message, taskId],
      )
    })
  }

  async function listPendingScheduledTasks(limit = 200) {
    const safeLimit = Math.max(1, Math.min(2000, Math.floor(limit)))
    const rows = await all<DbScheduledTaskRow>(
      database,
      `
      SELECT *
      FROM scheduled_tasks
      WHERE status = 'pending'
      ORDER BY trigger_at ASC
      LIMIT ?
      `,
      [safeLimit],
    )
    return rows.map(mapScheduledTaskRow)
  }

  async function upsertMemoryFacts(facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource) {
    if (facts.length === 0)
      return

    const normalizedFacts = facts
      .map((fact) => {
        const subject = fact.subject.trim()
        const predicate = fact.predicate.trim()
        const object = fact.object.trim()
        if (!subject || !predicate || !object)
          return null

        return {
          id: randomUUID(),
          subject,
          predicate,
          object,
          confidence: clamp01(fact.confidence),
          source,
          dedupeKey: buildDedupeKey(subject, predicate, object),
          createdAt: now(),
          updatedAt: now(),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (normalizedFacts.length === 0)
      return

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const fact of normalizedFacts) {
          await run(
            database,
            `
            INSERT INTO memory_facts (
              id,
              subject,
              predicate,
              object,
              confidence,
              source,
              dedupe_key,
              created_at,
              updated_at,
              last_access_at,
              access_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key)
            DO UPDATE SET
              confidence = MAX(memory_facts.confidence, excluded.confidence),
              source = excluded.source,
              updated_at = excluded.updated_at
            `,
            [
              fact.id,
              fact.subject,
              fact.predicate,
              fact.object,
              fact.confidence,
              fact.source,
              fact.dedupeKey,
              fact.createdAt,
              fact.updatedAt,
              null,
              0,
            ],
          )
        }
      })
    })
  }

  async function retrieveMemoryFacts(query: string, limit = 6) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery)
      return []

    const rows = await all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts')
    if (rows.length === 0)
      return []

    const facts = rows.map(mapFactRow)
    const queryTokens = tokenize(normalizedQuery)
    const currentTs = now()
    const ranked = facts
      .map(fact => ({
        fact,
        score: scoreFact(queryTokens, fact, currentTs),
      }))
      .filter(item => item.score > 0.01)
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(0, limit))

    if (ranked.length === 0)
      return []

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const item of ranked) {
          await run(
            database,
            `
            UPDATE memory_facts
            SET access_count = access_count + 1,
                last_access_at = ?
            WHERE id = ?
            `,
            [currentTs, item.fact.id],
          )
        }
      })
    })

    return ranked.map(item => item.fact)
  }

  async function runMemoryPrune() {
    const thresholdArchive = 0.72
    const thresholdDelete = 0.92
    const maxArchiveRetentionDays = 30
    const currentTs = now()

    const facts = (await all<DbMemoryFactRow>(database, 'SELECT * FROM memory_facts')).map(mapFactRow)

    const keepFacts: AlicizationMemoryFact[] = []
    const archiveFacts: AlicizationMemoryFact[] = []
    const deleteIds: string[] = []

    for (const fact of facts) {
      const score = computePruneScore(fact, currentTs)
      const daysSinceAccess = fact.lastAccessAt == null
        ? Number.POSITIVE_INFINITY
        : (currentTs - fact.lastAccessAt) / dayMs

      if (score >= thresholdDelete && daysSinceAccess >= 30) {
        deleteIds.push(fact.id)
        continue
      }

      if (score >= thresholdArchive && daysSinceAccess >= 14) {
        archiveFacts.push(fact)
        continue
      }

      keepFacts.push(fact)
    }

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const fact of archiveFacts) {
          await run(
            database,
            `
            INSERT INTO memory_archive (
              id,
              original_id,
              subject,
              predicate,
              object,
              confidence,
              source,
              dedupe_key,
              created_at,
              updated_at,
              last_access_at,
              access_count,
              archived_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              randomUUID(),
              fact.id,
              fact.subject,
              fact.predicate,
              fact.object,
              fact.confidence,
              fact.source,
              fact.dedupeKey,
              fact.createdAt,
              fact.updatedAt,
              fact.lastAccessAt,
              fact.accessCount,
              currentTs,
            ],
          )
          deleteIds.push(fact.id)
        }

        if (deleteIds.length > 0) {
          const placeholders = deleteIds.map(() => '?').join(',')
          await run(database, `DELETE FROM memory_facts WHERE id IN (${placeholders})`, deleteIds)
        }

        const archiveRetentionLimit = currentTs - maxArchiveRetentionDays * dayMs
        await run(database, 'DELETE FROM memory_archive WHERE archived_at < ?', [archiveRetentionLimit])

        await upsertMeta(memoryLastPrunedAtKey, String(currentTs))
      })
    })

    await appendAuditLog({
      level: 'notice',
      category: 'memory',
      action: 'prune',
      message: 'Memory pruning completed.',
      payload: {
        kept: keepFacts.length,
        archived: archiveFacts.length,
        deleted: deleteIds.length,
      },
    })

    return await getMemoryStats()
  }

  function normalizeOrganicMemoryText(raw: unknown, maxChars: number) {
    if (typeof raw !== 'string')
      return ''
    const normalized = raw.replace(/\s+/g, ' ').trim()
    if (!normalized)
      return ''
    return normalized.slice(0, maxChars)
  }

  function mapRelationshipDynamicsRow(row: DbRelationshipDynamicsRow): AlicizationRelationshipDynamicsState {
    return {
      hostAttitude: normalizeOrganicMemoryText(row.host_attitude, 120),
      previousHostAttitude: normalizeOrganicMemoryText(row.previous_host_attitude, 120) || null,
      obedienceDelta: clampRelationshipDelta(row.obedience_delta),
      livelinessDelta: clampRelationshipDelta(row.liveliness_delta),
      sensibilityDelta: clampRelationshipDelta(row.sensibility_delta),
      source: normalizeOrganicMemoryText(row.source, 64) || 'unknown',
      createdAt: Number.isFinite(row.created_at) ? Math.max(0, Math.floor(row.created_at)) : 0,
    }
  }

  async function listActiveThoughts() {
    const rows = await all<DbActiveThoughtRow>(
      database,
      `
      SELECT
        id,
        text,
        created_at,
        updated_at
      FROM active_thoughts
      ORDER BY updated_at DESC, created_at DESC
      `,
    )
    return rows.map(mapActiveThoughtRow)
  }

  async function replaceActiveThoughts(thoughts: Array<{ text: string }>) {
    const normalized = thoughts
      .map(item => normalizeOrganicMemoryText(item.text, 120))
      .filter(Boolean)
      .filter((item, index, current) => current.findIndex(candidate => candidate.toLowerCase() === item.toLowerCase()) === index)
      .slice(0, 5)
    const currentTs = now()

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        await run(database, 'DELETE FROM active_thoughts')
        for (const text of normalized) {
          await run(
            database,
            `
            INSERT INTO active_thoughts (
              id,
              text,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?)
            `,
            [randomUUID(), text, currentTs, currentTs],
          )
        }
      })
    })

    return await listActiveThoughts()
  }

  async function appendSubconsciousFragments(fragments: Array<{ text: string, sourceKind: AlicizationSubconsciousFragmentSourceKind }>) {
    const normalized = fragments
      .map(item => ({
        sourceKind: item.sourceKind,
        text: normalizeOrganicMemoryText(item.text, 160),
      }))
      .filter(item => item.text)
      .filter((item, index, current) => current.findIndex(candidate => candidate.sourceKind === item.sourceKind && candidate.text.toLowerCase() === item.text.toLowerCase()) === index)

    if (normalized.length === 0)
      return []

    const inserted: AlicizationSubconsciousFragment[] = []
    const currentTs = now()
    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const item of normalized) {
          const existing = await get<{ id?: string }>(
            database,
            `
            SELECT id
            FROM subconscious_fragments
            WHERE source_kind = ?
              AND lower(text) = lower(?)
            LIMIT 1
            `,
            [item.sourceKind, item.text],
          )
          if (existing?.id)
            continue

          const id = randomUUID()
          await run(
            database,
            `
            INSERT INTO subconscious_fragments (
              id,
              text,
              source_kind,
              created_at,
              last_recalled_at,
              recall_count
            ) VALUES (?, ?, ?, ?, NULL, 0)
            `,
            [id, item.text, item.sourceKind, currentTs],
          )
          await run(
            database,
            `
            INSERT INTO subconscious_fragments_fts (
              fragment_id,
              text
            ) VALUES (?, ?)
            `,
            [id, item.text],
          )
          inserted.push({
            id,
            text: item.text,
            sourceKind: item.sourceKind,
            createdAt: currentTs,
            lastRecalledAt: null,
            recallCount: 0,
          })
        }
      })
    })

    return inserted
  }

  async function searchSubconsciousFragments(query: string, limit = 6) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery)
      return []

    const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)))
    const rows = await all<DbSubconsciousFragmentRow>(
      database,
      `
      SELECT
        sf.id,
        sf.text,
        sf.source_kind,
        sf.created_at,
        sf.last_recalled_at,
        sf.recall_count
      FROM subconscious_fragments_fts
      JOIN subconscious_fragments sf
        ON sf.id = subconscious_fragments_fts.fragment_id
      WHERE subconscious_fragments_fts MATCH ?
      ORDER BY bm25(subconscious_fragments_fts), sf.created_at DESC
      LIMIT ?
      `,
      [normalizedQuery, safeLimit],
    )
    const mapped = rows.map(mapSubconsciousFragmentRow)
    if (mapped.length === 0)
      return mapped

    const recalledAt = now()
    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const fragment of mapped) {
          await run(
            database,
            `
            UPDATE subconscious_fragments
            SET last_recalled_at = ?,
                recall_count = recall_count + 1
            WHERE id = ?
            `,
            [recalledAt, fragment.id],
          )
        }
      })
    })

    return mapped.map(fragment => ({
      ...fragment,
      lastRecalledAt: recalledAt,
      recallCount: fragment.recallCount + 1,
    }))
  }

  async function listRecentSubconsciousFragments(limit = 8) {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))
    const rows = await all<DbSubconsciousFragmentRow>(
      database,
      `
      SELECT
        id,
        text,
        source_kind,
        created_at,
        last_recalled_at,
        recall_count
      FROM subconscious_fragments
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [safeLimit],
    )
    return rows.map(mapSubconsciousFragmentRow)
  }

  async function countSubconsciousFragments() {
    const row = await get<CountRow>(
      database,
      `
      SELECT COUNT(1) AS total
      FROM subconscious_fragments
      `,
    )
    return row?.total ?? 0
  }

  async function appendRelationshipDynamics(input: {
    hostAttitude: string
    previousHostAttitude?: string | null
    obedienceDelta?: number
    livelinessDelta?: number
    sensibilityDelta?: number
    source: string
    createdAt?: number
  }) {
    const hostAttitude = normalizeOrganicMemoryText(input.hostAttitude, 120)
    if (!hostAttitude)
      return

    const previousHostAttitude = normalizeOrganicMemoryText(input.previousHostAttitude, 120) || null
    const source = normalizeOrganicMemoryText(input.source, 64) || 'unknown'
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : now()

    await enqueueWrite(async () => {
      await run(
        database,
        `
        INSERT INTO relationship_dynamics (
          id,
          host_attitude,
          previous_host_attitude,
          obedience_delta,
          liveliness_delta,
          sensibility_delta,
          source,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          hostAttitude,
          previousHostAttitude,
          clampRelationshipDelta(Number(input.obedienceDelta ?? 0)),
          clampRelationshipDelta(Number(input.livelinessDelta ?? 0)),
          clampRelationshipDelta(Number(input.sensibilityDelta ?? 0)),
          source,
          createdAt,
        ],
      )
    })
  }

  async function getLatestRelationshipDynamics() {
    const row = await get<DbRelationshipDynamicsRow>(
      database,
      `
      SELECT
        host_attitude,
        previous_host_attitude,
        obedience_delta,
        liveliness_delta,
        sensibility_delta,
        source,
        created_at
      FROM relationship_dynamics
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    if (!row)
      return null
    return mapRelationshipDynamicsRow(row)
  }

  async function importLegacyMemory(snapshot: AlicizationMemoryLegacySnapshot): Promise<AlicizationMemoryMigrationResult> {
    const currentTs = now()
    const marker = await getMetaValue(legacyMigrationMarker)
    if (marker) {
      return {
        migrated: false,
        importedFacts: 0,
        importedArchive: 0,
        marker,
      }
    }

    const legacyFacts = Array.isArray(snapshot.facts) ? snapshot.facts : []
    const legacyArchive = Array.isArray(snapshot.archive) ? snapshot.archive : []

    const importedFacts = legacyFacts.length
    const importedArchive = legacyArchive.length

    await enqueueWrite(async () => {
      await runInTransaction(database, async () => {
        for (const fact of legacyFacts) {
          const subject = fact.subject?.trim()
          const predicate = fact.predicate?.trim()
          const object = fact.object?.trim()
          if (!subject || !predicate || !object)
            continue

          const dedupeKey = fact.dedupeKey?.trim() || buildDedupeKey(subject, predicate, object)
          await run(
            database,
            `
            INSERT INTO memory_facts (
              id,
              subject,
              predicate,
              object,
              confidence,
              source,
              dedupe_key,
              created_at,
              updated_at,
              last_access_at,
              access_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key)
            DO UPDATE SET
              confidence = MAX(memory_facts.confidence, excluded.confidence),
              source = excluded.source,
              updated_at = excluded.updated_at
            `,
            [
              fact.id || randomUUID(),
              subject,
              predicate,
              object,
              clamp01(fact.confidence),
              fact.source,
              dedupeKey,
              fact.createdAt,
              fact.updatedAt,
              fact.lastAccessAt,
              Math.max(0, Math.floor(fact.accessCount)),
            ],
          )
        }

        for (const item of legacyArchive) {
          const subject = item.subject?.trim()
          const predicate = item.predicate?.trim()
          const object = item.object?.trim()
          if (!subject || !predicate || !object)
            continue

          await run(
            database,
            `
            INSERT INTO memory_archive (
              id,
              original_id,
              subject,
              predicate,
              object,
              confidence,
              source,
              dedupe_key,
              created_at,
              updated_at,
              last_access_at,
              access_count,
              archived_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              item.id || randomUUID(),
              item.id || null,
              subject,
              predicate,
              object,
              clamp01(item.confidence),
              item.source,
              item.dedupeKey,
              item.createdAt,
              item.updatedAt,
              item.lastAccessAt,
              Math.max(0, Math.floor(item.accessCount)),
              item.archivedAt,
            ],
          )
        }

        if (typeof snapshot.lastPrunedAt === 'number' && Number.isFinite(snapshot.lastPrunedAt)) {
          await upsertMeta(memoryLastPrunedAtKey, String(snapshot.lastPrunedAt))
        }

        await upsertMeta(legacyMigrationMarker, String(currentTs))
      })
    })

    await appendAuditLog({
      level: 'notice',
      category: 'memory',
      action: 'legacy-migration',
      message: 'Imported legacy memory snapshot into SQLite.',
      payload: {
        importedFacts,
        importedArchive,
      },
    })

    return {
      migrated: true,
      importedFacts,
      importedArchive,
      marker: String(currentTs),
    }
  }

  async function overrideMemoryStats(next: AlicizationMemoryStats) {
    if (typeof next.lastPrunedAt === 'number' && Number.isFinite(next.lastPrunedAt)) {
      await enqueueWrite(async () => {
        await upsertMeta(memoryLastPrunedAtKey, String(next.lastPrunedAt))
      })
    }

    return await getMemoryStats()
  }

  async function getJournalMode() {
    const row = await get<JournalModeRow>(database, 'PRAGMA journal_mode;')
    return (row?.journal_mode || '').toLowerCase()
  }

  await initializeSchema()

  return {
    dbPath,
    close: async () => await close(database),
    getMetaValue,
    setMetaValue: async (key: string, value: string) => {
      await enqueueWrite(async () => {
        await upsertMeta(key, value)
      })
    },
    getLatestConversationSessionId,
    listConversationTurnsSince,
    listConversationTurnsBySession,
    appendMindTurnEvents,
    listMindTurnEvents,
    getTaskThread,
    upsertTaskThread,
    listTaskThreads,
    upsertChannelCapabilityManifest,
    listChannelCapabilityManifests,
    upsertExecutorSession,
    listExecutorSessions,
    appendExecutionEvents,
    listExecutionEvents,
    clearConversationData,
    appendAuditLog,
    appendConversationTurn,
    getMemoryStats,
    upsertMemoryFacts,
    retrieveMemoryFacts,
    runMemoryPrune,
    importLegacyMemory,
    overrideMemoryStats,
    listActiveThoughts,
    replaceActiveThoughts,
    appendSubconsciousFragments,
    searchSubconsciousFragments,
    listRecentSubconsciousFragments,
    countSubconsciousFragments,
    appendRelationshipDynamics,
    getLatestRelationshipDynamics,
    insertScheduledTask,
    claimDueScheduledTasks,
    requeueScheduledTask,
    completeScheduledTask,
    failScheduledTask,
    listPendingScheduledTasks,
    getJournalMode,
  }
}
