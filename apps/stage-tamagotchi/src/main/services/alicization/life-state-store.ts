import type sqlite3 from 'sqlite3'

import type { LifeCommitInput, LifeCommitReceipt, LifeMetaChange, LifeOwner, LifeOwnerVersion, LifeStateView } from '../../../shared/life-contracts'
import type { LifeSurfaceRegistration } from './life-body-repository'
import type { EffectRow, IngressRow } from './life-read-repository'
import type { LifeTransaction, LifeTransactionHandle } from './life-transaction'

import { createHash, randomUUID } from 'node:crypto'

import { applyLifeAppraisal } from './life-appraisal-repository'
import { applyLifeBody } from './life-body-repository'
import { readLifeClosure } from './life-closure-query'
import { readLifeConversationPreferences } from './life-conversation-preferences'
import { applyLifeEffect } from './life-effect-repository'
import { applyLifeEvidenceInvalidation } from './life-evidence-repository'
import { applyLifeExpression } from './life-expression-repository'
import { applyLifeGrowth, parseLifeGrowthSnapshot } from './life-growth-repository'
import { applyLifeIngress } from './life-ingress-repository'
import { serializeLifeUserInput } from './life-input-payload'
import { recordLifeFactVersion, registerLifeEntity } from './life-memory-repository'
import { applyLifeObligation } from './life-obligation-repository'
import { applyLifeOutreach } from './life-outreach-repository'
import { applyLifePersonaEvaluation } from './life-persona-evaluation'
import { applyLifePolicyEvaluation } from './life-policy-evaluation'
import { applyLifeProjectDevelopment } from './life-project-development'
import { bindLifeProject, settleLifeProjectExperience } from './life-project-repository'
import { mapLifeEffect, mapLifeIngress, readLifeDomains } from './life-read-repository'
import { lifeSchemaSql } from './life-schema-sql'
import { lifeSchemaVersion, readSupportedLifeSchemaVersion } from './life-schema-version'
import { applyLifeSoul } from './life-soul-repository'
import { projectLifeTask } from './life-task-repository'
import { activeLifeTransaction, afterLifeTransactionCommit, assertLifeTransaction } from './life-transaction'

const owners = new Set<LifeOwner>(['self', 'reflection', 'motivation', 'habit', 'presence', 'cognition', 'emotion', 'relationship', 'goals', 'memory', 'expression', 'soul', 'initiative', 'growth'])

export class LifeStateConflictError extends Error {
  readonly code = 'LIFE_STATE_CONFLICT'
}

interface LifeStoreOptions {
  database: sqlite3.Database
  readDatabase: () => sqlite3.Database
  cardId: string
  now: () => number
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  transaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  enqueue: <T>(task: () => Promise<T>, options?: { signal?: AbortSignal }) => Promise<T>
  backupMigration?: (from: number, to: number) => Promise<void>
}

interface VersionRow {
  owner: LifeOwner
  revision: number
  content_hash: string
  payload_ref_json: string
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function assertSignal(signal?: AbortSignal) {
  if (signal?.aborted)
    throw signal.reason ?? new DOMException('Life state operation cancelled', 'AbortError')
}

function parseVersion(row: VersionRow): LifeOwnerVersion {
  const ref = JSON.parse(row.payload_ref_json) as { metaKey: string }
  return { owner: row.owner, revision: row.revision, contentHash: row.content_hash, metaKey: ref.metaKey }
}

export function createLifeStateStore(options: LifeStoreOptions) {
  const { database, run, get, all, transaction, enqueue, now, cardId } = options
  let reads: Promise<unknown> = Promise.resolve()
  let readsClosed = false
  const listeners = new Set<(receipt: LifeCommitReceipt) => void>()

  async function initialize() {
    // Migration runs after the existing domain schema; there is still one writer.
    await enqueue(async () => {
      const version = await get<{ value: string }>(database, `SELECT value FROM alicization_meta WHERE key = 'life.schema.version'`)
      const current = readSupportedLifeSchemaVersion(version?.value)
      if (current < lifeSchemaVersion)
        await options.backupMigration?.(current, lifeSchemaVersion)
      return transaction(database, async () => {
        for (const statement of lifeSchemaSql.replace(/^\s*--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean))
          await run(database, statement)
        for (const table of ['life_evidence_dependencies', 'life_evidence_cleanup_jobs']) {
          const column = table === 'life_evidence_dependencies' ? 'created_revision' : 'started_revision'
          const columns = await all<{ name: string }>(database, `PRAGMA table_info(${table})`)
          if (!columns.some(field => field.name === column))
            await run(database, `ALTER TABLE ${table} ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`)
        }
        const receiptColumns = await all<{ name: string }>(database, 'PRAGMA table_info(life_expression_receipts)')
        if (!receiptColumns.some(column => column.name === 'presentation_verified'))
          await run(database, 'ALTER TABLE life_expression_receipts ADD COLUMN presentation_verified INTEGER NOT NULL DEFAULT 0 CHECK(presentation_verified IN (0,1))')
        if (current < 4) {
          const expression = await get<{ value: string }>(database, `SELECT value FROM alicization_meta WHERE key = 'life:expression'`)
          const surfaces = expression ? (JSON.parse(expression.value) as { surfaces?: LifeSurfaceRegistration[] }).surfaces ?? [] : []
          for (const surface of surfaces)
            await run(database, 'INSERT OR IGNORE INTO life_surface_sessions(card_id, session_id, surface, issued_at) VALUES (?, ?, ?, ?)', [cardId, surface.id, surface.surface, surface.issuedAt])
        }
        if (current < 3) {
          let cursor = 0
          while (true) {
            const page = await all<{ rowid: number, ingress_id: string, payload_ref_json: string }>(database, `SELECT rowid, ingress_id, payload_ref_json FROM life_ingress WHERE card_id = ? AND kind = 'user-turn' AND rowid > ? ORDER BY rowid LIMIT 64`, [cardId, cursor])
            if (!page.length)
              break
            for (const row of page) {
              const legacy = JSON.parse(row.payload_ref_json) as Record<string, unknown>
              const currentMessage = legacy.currentMessage ?? (Array.isArray(legacy.messages) ? [...legacy.messages].reverse().find(message => message && typeof message === 'object' && message.role === 'user') : undefined)
              const input = currentMessage ? serializeLifeUserInput(currentMessage) : null
              const { messages: _messages, currentMessage: _currentMessage, ...envelope } = legacy
              const body = JSON.stringify({ ...envelope, legacyInputHash: legacy.inputHash, inputHash: input?.inputHash ?? legacy.inputHash, inputRef: { kind: input ? 'life-user-input' : 'unavailable-user-input', id: row.ingress_id } })
              await run(database, 'UPDATE life_ingress SET payload_ref_json = ?, payload_hash = ? WHERE card_id = ? AND ingress_id = ?', [body, hash(body), cardId, row.ingress_id])
              await run(database, 'INSERT OR IGNORE INTO life_input_payloads(card_id, ingress_id, input_hash, body_json, lifecycle, stored_at) VALUES (?, ?, ?, ?, ?, ?)', [cardId, row.ingress_id, input?.inputHash ?? String(legacy.inputHash ?? ''), input?.body ?? null, input ? 'active' : 'unavailable', now()])
            }
            cursor = page.at(-1)!.rowid
          }
        }
        const baselineKeys: Array<[LifeOwner, string]> = [['self', `mind-head:${cardId}:autobiographical-self`], ['reflection', `mind-head:${cardId}:reflection-ledger`], ['motivation', `mind-head:${cardId}:motive-engine`], ['habit', `mind-head:${cardId}:habit-policy`], ['presence', 'visual_presence_state_v1']]
        for (const [owner, key] of baselineKeys) {
          const row = await get<{ value: string }>(database, 'SELECT value FROM alicization_meta WHERE key = ?', [key])
          if (row?.value) {
            JSON.parse(row.value)
            await run(database, 'INSERT OR IGNORE INTO life_owner_versions(card_id, owner, revision, payload_ref_json, content_hash, updated_at) VALUES (?, ?, 0, ?, ?, ?)', [cardId, owner, JSON.stringify({ metaKey: key }), hash(row.value), now()])
          }
        }
        const growthOwner = await get<{ payload_ref_json: string }>(database, 'SELECT payload_ref_json FROM life_owner_versions WHERE card_id = ? AND owner = \'growth\'', [cardId])
        const growthKey = growthOwner ? JSON.parse(growthOwner.payload_ref_json).metaKey : 'self_evolution_version_runtime_v1'
        const legacyGrowth = await get<{ value: string }>(database, 'SELECT value FROM alicization_meta WHERE key = ?', [growthKey])
        if (legacyGrowth?.value) {
          const growth = parseLifeGrowthSnapshot(legacyGrowth.value)
          if (current < 5) {
            for (const candidate of growth.candidates.filter(candidate => candidate.status === 'active' && !candidate.pairedEvaluation)) {
              candidate.status = 'shadow'
              candidate.validation.activationBlockedReasons = [...new Set([...candidate.validation.activationBlockedReasons, 'self-evolution:paired-evaluation-required'])]
              if (growth.activeCandidateId === candidate.id)
                growth.activeCandidateId = null
            }
            const value = JSON.stringify(growth)
            await run(database, 'UPDATE alicization_meta SET value = ? WHERE key = ?', [value, growthKey])
            await run(database, 'UPDATE life_owner_versions SET content_hash = ? WHERE card_id = ? AND owner = \'growth\'', [hash(value), cardId])
          }
          const existingOwner = await get(database, `SELECT 1 FROM life_owner_versions WHERE card_id = ? AND owner = 'growth'`, [cardId])
          if (!existingOwner) {
            for (const candidate of growth.candidates) {
              if (candidate.status === 'active' && !candidate.sourceEvidence?.length) {
                candidate.status = 'shadow'
                candidate.validation.activationBlockedReasons.push('growth:legacy-source-review-required')
              }
            }
            if (!growth.candidates.some(candidate => candidate.id === growth.activeCandidateId && candidate.status === 'active'))
              growth.activeCandidateId = null
            const value = JSON.stringify(growth)
            await run(database, 'UPDATE alicization_meta SET value = ?, updated_at = ? WHERE key = ?', [value, now(), growthKey])
            await run(database, `INSERT INTO life_owner_versions(card_id, owner, revision, payload_ref_json, content_hash, updated_at) VALUES (?, 'growth', 0, ?, ?, ?)`, [cardId, JSON.stringify({ metaKey: growthKey }), hash(value), now()])
          }
        }
        // Historical processing completion has no visible-delivery proof.
        await run(database, `INSERT OR IGNORE INTO life_obligations(card_id, obligation_id, dedupe_key, generation, revision, kind, source_ref_json, beneficiary_ref_json, summary, status, due_at, timezone, expiry_policy, required_proof_json, scheduled_task_id, created_at, updated_at) SELECT ?, 'reminder:' || task_id, 'reminder:' || task_id, 1, 0, 'reminder', json_object('turnId', source_turn_id, 'deliveryTurnId', fired_turn_id), '{}', message, CASE WHEN status = 'completed' THEN 'verifying' WHEN status = 'failed' THEN 'failed' ELSE 'waiting' END, trigger_at, ?, 'none', '{"kind":"reminder","channel":"text-rendered"}', id, created_at, ? FROM scheduled_tasks`, [cardId, Intl.DateTimeFormat().resolvedOptions().timeZone, now()])
        await run(database, `INSERT INTO alicization_meta(key, value, updated_at) VALUES ('life.schema.version', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [String(lifeSchemaVersion), now()])
      })
    })
  }

  async function readInside(includeDomains = false, sourceDatabase = database): Promise<LifeStateView> {
    const clock = await get<{ revision: number }>(sourceDatabase, `SELECT COALESCE(MAX(revision), 0) AS revision FROM life_commits WHERE card_id = ?`, [cardId])
    const rows = await all<VersionRow>(sourceDatabase, `SELECT owner, revision, content_hash, payload_ref_json FROM life_owner_versions WHERE card_id = ? ORDER BY owner`, [cardId])
    const versions = rows.map(parseVersion)
    const values: Record<string, string> = {}
    for (const version of versions) {
      const row = await get<{ value: string }>(sourceDatabase, `SELECT value FROM alicization_meta WHERE key = ?`, [version.metaKey])
      if (!row || hash(row.value) !== version.contentHash)
        throw new LifeStateConflictError(`Life owner ${version.owner} no longer matches its committed state`)
      values[version.metaKey] = row.value
    }
    const domains = includeDomains ? await readLifeDomains({ cardId, all: (sql, params) => all(sourceDatabase, sql, params) }) : { obligations: [], ingress: [], effects: [], soulActivations: [] }
    const restore = await get<{ value: string }>(sourceDatabase, `SELECT value FROM alicization_meta WHERE key = 'life:backup-restore'`)
    const backupRestore = restore ? JSON.parse(restore.value) : undefined
    return { cardId, revision: clock?.revision ?? 0, owners: versions, values, ...domains, ...(backupRestore ? { backupRestore: { backupId: backupRestore.backupId, status: backupRestore.status } } : {}) }
  }

  async function readOne<T>(select: (reader: sqlite3.Database) => Promise<T>) {
    if (readsClosed)
      throw new Error('Life reader is closing')
    const pending = reads.then(async () => {
      const reader = options.readDatabase()
      await run(reader, 'BEGIN DEFERRED')
      try {
        const view = await select(reader)
        await run(reader, 'COMMIT')
        return view
      }
      catch (error) {
        await run(reader, 'ROLLBACK')
        throw error
      }
    })
    reads = pending.catch(() => {})
    return pending
  }
  const read = () => readOne(reader => readInside(true, reader))
  async function readUserInput(reader: sqlite3.Database, id: string) {
    const row = await get<{ body_json: string | null, input_hash: string, lifecycle: string }>(reader, 'SELECT body_json, input_hash, lifecycle FROM life_input_payloads WHERE card_id = ? AND ingress_id = ?', [cardId, id])
    if (!row || row.lifecycle === 'unavailable')
      return null
    if (row.lifecycle === 'withdrawn')
      throw new Error('Current input was withdrawn and cannot be consumed again')
    if (!row.body_json || hash(row.body_json) !== row.input_hash)
      throw new LifeStateConflictError('Current input no longer matches its durable hash')
    return JSON.parse(row.body_json) as Record<string, unknown>
  }
  const getUserInput = (id: string) => readOne(reader => readUserInput(reader, id))
  const readClosure = (turnId: string) => readOne(reader => readLifeClosure({ cardId, all: (sql, parameters) => all(reader, sql, parameters), get: (sql, parameters) => get(reader, sql, parameters) }, turnId))
  const getSurface = (id: string) => readOne(async reader => await get<LifeSurfaceRegistration>(reader, 'SELECT session_id AS id, surface, issued_at AS issuedAt FROM life_surface_sessions WHERE card_id = ? AND session_id = ?', [cardId, id]) ?? null)
  async function readIngress(reader: sqlite3.Database, id: string) {
    const row = await get<IngressRow>(reader, 'SELECT * FROM life_ingress WHERE card_id = ? AND ingress_id = ?', [cardId, id])
    if (row && hash(row.payload_ref_json) !== row.payload_hash)
      throw new Error('Ingress content no longer matches its durable hash')
    if (!row)
      return null
    const ingress = mapLifeIngress(row)
    if (ingress.kind === 'user-turn' && (ingress.payload.inputRef as { kind?: string } | undefined)?.kind === 'life-user-input' && !await readUserInput(reader, id))
      throw new LifeStateConflictError('Accepted user input has no durable source payload')
    return ingress
  }
  const getIngress = (id: string) => readOne(reader => readIngress(reader, id))
  async function readTurnExecutionEffects(reader: sqlite3.Database, turnId: string) {
    const rows = await all<EffectRow & { intent_hash: string }>(reader, 'SELECT * FROM life_effect_intents WHERE card_id = ? AND turn_id = ? AND kind = \'execute\' ORDER BY effect_id', [cardId, turnId])
    if (rows.some(row => hash(row.payload_ref_json) !== row.intent_hash))
      throw new LifeStateConflictError('Turn execution scope no longer matches its durable intents')
    return rows.map(mapLifeEffect)
  }
  const getTurnExecutionEffects = (turnId: string) => readOne(reader => readTurnExecutionEffects(reader, turnId))
  const getTurnExecutionEffectsInside = async (turnId: string) => {
    if (!activeLifeTransaction(database))
      throw new Error('Publication execution scope needs the current writer transaction')
    if (!await readIngress(database, `user:${turnId}`))
      throw new Error('Publication execution scope needs its intact human source')
    return readTurnExecutionEffects(database, turnId)
  }
  // Publication must recheck the human requirement inside its writer transaction.
  // A separate reader snapshot could miss a correction or source withdrawal.
  const readConversationPreferencesInside = async (turnId: string) => {
    if (!activeLifeTransaction(database))
      throw new Error('Publication requirements need the current writer transaction')
    const source = await readIngress(database, `user:${turnId}`)
    if (typeof source?.payload.conversationId !== 'string')
      return []
    return readLifeConversationPreferences(await readInside(), {
      getIngress: id => readIngress(database, id),
      readUserInput: id => readUserInput(database, id),
    }, now(), source.payload.conversationId)
  }
  const getEffect = (id: string) => readOne(async (reader) => {
    const row = await get<EffectRow & { intent_hash: string }>(reader, 'SELECT * FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [cardId, id])
    if (row && hash(row.payload_ref_json) !== row.intent_hash)
      throw new Error('Effect content no longer matches its durable hash')
    return row ? mapLifeEffect(row) : null
  })

  async function commit(input: LifeCommitInput, writeOptions: { signal?: AbortSignal } = {}, beforeMutations?: (tx: LifeTransaction) => Promise<void>, handle?: LifeTransactionHandle): Promise<LifeCommitReceipt> {
    if (input.cardId !== cardId || !input.operationKey?.trim() || input.operationKey.length > 512)
      throw new TypeError('Life commit requires the bound card and a bounded operation key')
    if (input.changes.length > 24 || (input.mutations?.length ?? 0) > 64 || input.changes.length + (input.mutations?.length ?? 0) < 1)
      throw new TypeError('Life commit requires bounded owner changes or domain mutations')
    const seenKeys = new Set<string>()
    const seenOwners = new Set<LifeOwner>()
    for (const change of input.changes) {
      if (!owners.has(change.owner) || !change.key?.trim() || seenKeys.has(change.key) || seenOwners.has(change.owner))
        throw new TypeError('Life commit contains invalid or duplicate owner changes')
      if (change.value.length > 2_000_000)
        throw new TypeError('Life owner payload exceeds its storage budget')
      JSON.parse(change.value)
      seenKeys.add(change.key)
      seenOwners.add(change.owner)
    }
    const requestHash = hash(JSON.stringify({ ...input, changes: [...input.changes].sort((a, b) => a.owner.localeCompare(b.owner)) }))
    assertSignal(writeOptions.signal)
    // Once admitted, resolve the durable result even if the caller cancels during COMMIT.
    const apply = async (): Promise<LifeCommitReceipt> => {
      assertSignal(writeOptions.signal)
      const existing = await get<{ request_hash: string, commit_id: string, revision: number, owner_changes_json: string, committed_at: number }>(database, `SELECT request_hash, commit_id, revision, owner_changes_json, committed_at FROM life_commits WHERE card_id = ? AND operation_key = ?`, [cardId, input.operationKey])
      if (existing) {
        if (existing.request_hash !== requestHash)
          throw new TypeError('Life operation key was reused with different content')
        return { status: 'duplicate', cardId, commitId: existing.commit_id, revision: existing.revision, owners: JSON.parse(existing.owner_changes_json) as LifeOwnerVersion[], committedAt: existing.committed_at }
      }
      const current = await readInside()
      if (input.expectedRevision != null && current.revision !== input.expectedRevision)
        throw new LifeStateConflictError('Life view became stale before commit')
      for (const absent of input.expectedAbsentOwners ?? []) {
        if (!owners.has(absent))
          throw new TypeError('Unknown absent life owner in read set')
        if (current.owners.some(owner => owner.owner === absent))
          throw new LifeStateConflictError(`Previously absent life owner ${absent} became present before commit`)
      }
      for (const expected of input.expectedOwners ?? []) {
        const actual = current.owners.find(owner => owner.owner === expected.owner)
        if (!actual || actual.revision !== expected.revision || actual.contentHash !== expected.contentHash || actual.metaKey !== expected.metaKey)
          throw new LifeStateConflictError(`Consumed life owner ${expected.owner} became stale before commit`)
      }
      const revision = current.revision + 1
      const commitId = randomUUID()
      const committedAt = now()
      const changedVersions: LifeOwnerVersion[] = []
      const updateOwner = async (change: LifeMetaChange) => {
        if (!owners.has(change.owner) || !change.key.trim() || change.value.length > 2_000_000)
          throw new TypeError('Derived life owner change is invalid or exceeds its budget')
        JSON.parse(change.value)
        const owned = current.owners.find(owner => owner.owner === change.owner)
        if (owned && owned.metaKey !== change.key)
          throw new LifeStateConflictError('A life owner cannot silently move to another authority key')
        const stored = await get<{ value: string }>(database, `SELECT value FROM alicization_meta WHERE key = ?`, [change.key])
        if ('expectedValue' in change && (stored?.value ?? null) !== change.expectedValue)
          throw new LifeStateConflictError(`Life owner ${change.owner} changed before commit`)
        if (stored && ['self', 'habit', 'reflection', 'motivation', 'relationship'].includes(change.owner)) {
          const semanticValue = (raw: string) => {
            const value = JSON.parse(raw)
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              const { updatedAt: _updatedAt, ...semantic } = value
              return JSON.stringify(semantic)
            }
            return raw
          }
          if (semanticValue(stored.value) === semanticValue(change.value))
            return
        }
        if (stored?.value === change.value)
          return
        await run(database, `INSERT INTO alicization_meta(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [change.key, change.value, committedAt])
        const version = { owner: change.owner, revision, contentHash: hash(change.value), metaKey: change.key }
        const index = changedVersions.findIndex(item => item.owner === change.owner)
        if (index < 0)
          changedVersions.push(version)
        else
          changedVersions[index] = version
        await run(database, `INSERT INTO life_owner_versions(card_id, owner, revision, payload_ref_json, content_hash, last_commit_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(card_id, owner) DO UPDATE SET revision = excluded.revision, payload_ref_json = excluded.payload_ref_json, content_hash = excluded.content_hash, last_commit_id = excluded.last_commit_id, updated_at = excluded.updated_at`, [cardId, change.owner, revision, JSON.stringify({ metaKey: change.key }), version.contentHash, commitId, committedAt])
      }
      for (const change of input.changes)
        await updateOwner(change)
      assertSignal(writeOptions.signal)
      await run(database, `INSERT INTO life_commits(card_id, revision, commit_id, operation_key, request_hash, base_revision, ingress_ids_json, read_set_json, owner_changes_json, runtime_event_refs_json, reducer_version, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [cardId, revision, commitId, input.operationKey, requestHash, current.revision, JSON.stringify(input.ingressIds ?? []), JSON.stringify({ version: 'life-readset-v2', present: input.expectedOwners ?? [], absent: input.expectedAbsentOwners ?? [], wholeRevision: input.expectedRevision ?? null, baseOwners: current.owners }), JSON.stringify(changedVersions), '[]', 'life-state-v1', committedAt])
      const tx: LifeTransaction = { cardId, revision, commitId, now: committedAt, run: (sql, params) => run(database, sql, params), get: (sql, params) => get(database, sql, params), all: (sql, params) => all(database, sql, params), updateOwner }
      await beforeMutations?.(tx)
      for (const mutation of input.mutations ?? []) {
        switch (mutation.type) {
          case 'project-experience-indexed': await settleLifeProjectExperience(tx, mutation)
            break
          case 'project-share':
          case 'project-feedback': await applyLifeProjectDevelopment(tx, mutation)
            break
          case 'outreach-reserve':
          case 'outreach-boundary':
          case 'outreach-policy': await applyLifeOutreach(tx, mutation)
            break
          case 'surface-register':
          case 'body-health': await applyLifeBody(tx, mutation)
            break
          case 'personal-project-bind': await bindLifeProject(tx, mutation)
            break
          case 'growth-save':
          case 'growth-consumed': await applyLifeGrowth(tx, mutation)
            break
          case 'growth-evaluate':
          case 'growth-adopt': await applyLifePolicyEvaluation(tx, mutation)
            break
          case 'ingress-accept':
          case 'input-resume':
          case 'ingress-settle': await applyLifeIngress(tx, mutation)
            break
          case 'effect-prepare':
          case 'effect-transition': await applyLifeEffect(tx, mutation)
            break
          case 'obligation-create':
          case 'obligation-update':
          case 'obligation-restore-verify':
          case 'obligation-verify': await applyLifeObligation(tx, mutation)
            break
          case 'reminder-attempt-settle':
          case 'reminder-generated': await applyLifeObligation(tx, mutation)
            break
          case 'expression-record': await applyLifeExpression(tx, mutation.receipt, mutation.presentationVerified)
            break
          case 'task-thread-project': await projectLifeTask(tx, mutation.threadId)
            break
          case 'soul-prepare':
          case 'soul-transition': await applyLifeSoul(tx, mutation)
            break
          case 'persona-evaluate':
          case 'persona-review': await applyLifePersonaEvaluation(tx, mutation)
            break
          case 'memory-fact-version': await recordLifeFactVersion(tx, mutation)
            break
          case 'entity-register': {
            await registerLifeEntity(tx, mutation.entity)
            const head = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = \'life:memory-head\'')
            await tx.updateOwner({ owner: 'memory', key: 'life:memory-head', value: JSON.stringify({ ...(head ? JSON.parse(head.value) : {}), entityRegistration: mutation.entity.id }) })
            break
          }
          case 'runtime-event-link': {
            const row = await tx.get<{ card_id: string, turn_id: string, event_type: string, sequence: number }>('SELECT card_id, turn_id, event_type, sequence FROM alicization_runtime_events WHERE event_id = ?', [mutation.eventId])
            if (!row || row.card_id !== cardId || row.turn_id !== mutation.turnId)
              throw new TypeError('Runtime event reference is absent or crossed the life scope')
            await tx.run('UPDATE life_commits SET runtime_event_refs_json = ? WHERE card_id = ? AND commit_id = ?', [JSON.stringify([{ eventId: mutation.eventId, turnId: mutation.turnId, eventType: row.event_type, sequence: row.sequence }]), cardId, commitId])
            break
          }
          case 'appraisal-apply': await applyLifeAppraisal(tx, mutation.appraisal)
            break
          case 'evidence-invalidate':
          case 'evidence-cleanup-resume': await applyLifeEvidenceInvalidation(tx, mutation)
            break
          default: throw new TypeError('Unknown life mutation')
        }
      }
      await tx.run('UPDATE life_commits SET owner_changes_json = ? WHERE card_id = ? AND commit_id = ?', [JSON.stringify(changedVersions), cardId, commitId])
      assertSignal(writeOptions.signal)
      const receipt: LifeCommitReceipt = { status: 'committed', cardId, commitId, revision, owners: changedVersions, committedAt }
      afterLifeTransactionCommit(database, () => {
        for (const listener of listeners)
          listener(receipt)
      })
      return receipt
    }
    if (handle) {
      assertLifeTransaction(database, handle)
      return apply()
    }
    return enqueue(async () => transaction(database, apply))
  }

  const subscribe = (listener: (receipt: LifeCommitReceipt) => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  const commitInside = (input: LifeCommitInput, writeOptions: { signal?: AbortSignal } = {}, beforeMutations?: (tx: LifeTransaction) => Promise<void>) => {
    const handle = activeLifeTransaction(database)
    if (!handle)
      throw new Error('Life mutation requires the current writer transaction')
    return commit(input, writeOptions, beforeMutations, handle)
  }
  return { initialize, read, getIngress, getEffect, getUserInput, getSurface, readClosure, getTurnExecutionEffects, getTurnExecutionEffectsInside, readConversationPreferencesInside, commit, subscribe, commitWith: commit, commitInside, stopReads: async () => {
    readsClosed = true
    await reads
  } }
}
