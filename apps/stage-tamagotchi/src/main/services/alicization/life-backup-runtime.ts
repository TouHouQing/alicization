import type { LifeBackupIssue, LifeBackupSummary } from '../../../shared/life-backup-contracts'

import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { copyFile, lstat, mkdir, open, opendir, readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import * as v from 'valibot'

import sqlite from './sqlite3-runtime'

import { copyFileRecoveryBackupArtifacts, readFileRecoveryBackupReferences, verifyFileRecoveryBackupArtifacts } from './execution/file-recovery-backup'
import { fileRecoveryBlobSchema } from './execution/file-version-repository'
import { executionVerificationRegistryKey } from './execution/verification-recipes'
import { windowsKeyboardJournalIndexPrefix } from './execution/windows-keyboard-journal'
import { createLifeBackupCatalog } from './life-backup-catalog'
import { createLifeBackupSnapshotConflict } from './life-backup-conflict'
import { reconcileRestoredLifeGoals } from './life-backup-reconciliation'
import { removeUnpublishedLifeBackup } from './life-backup-staging'
import { sqliteFileSystemPath } from './sqlite-file-path'

const card = v.pipe(v.string(), v.regex(/^[\w-]{1,128}$/u))
const uuid = v.pipe(v.string(), v.uuid())
const digest = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const integer = v.pipe(v.number(), v.integer(), v.minValue(0))
const manifestFields = { id: uuid, cardId: card, createdAt: integer, revision: integer, schemaVersion: integer, databaseHash: digest, soulHash: v.nullable(digest) }
// Explicit format migration: v1 is restorable only with zero referenced blobs.
// v2 binds opaque ciphertext to the exact database snapshot without OS decryption.
const manifestSchema = v.variant('format', [v.strictObject({ format: v.literal('life-backup-v1'), ...manifestFields }), v.strictObject({ format: v.literal('life-backup-v2'), ...manifestFields, fileRecovery: v.pipe(v.array(fileRecoveryBlobSchema), v.maxLength(4096)) })])
type Manifest = v.InferOutput<typeof manifestSchema>
const requestSchema = v.strictObject({ backupId: uuid, cardId: card, expectedManifestHash: digest, operationId: uuid })
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const root = (userData: string) => join(userData, 'alicizations', 'life-backups')
const directory = (userData: string, id: string) => join(root(userData), v.parse(uuid, id))
const cardDirectory = (userData: string, id: string) => join(userData, 'alicizations', 'cards', v.parse(card, id))

async function exists(path: string) {
  try { await lstat(path); return true }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return false; throw error
  }
}
async function regular(path: string) {
  const stat = await lstat(path)
  if (stat.isSymbolicLink() || !stat.isFile())
    throw new Error('Backup files must be regular local files')
}
async function backupDirectory(path: string) {
  const stat = await lstat(path)
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error('Backup directory must be a regular local directory, not a link')
}
async function fileHash(path: string) {
  await regular(path)
  const digest = createHash('sha256')
  for await (const bytes of createReadStream(path)) digest.update(bytes)
  return digest.digest('hex')
}
async function durableJson(path: string, value: unknown) {
  const staged = `${path}.${randomUUID()}.tmp`
  const file = await open(staged, 'wx')
  try { await file.writeFile(JSON.stringify(value)); await file.sync() }
  finally { await file.close() }
  await rename(staged, path)
}
async function readPrivateManifest(userData: string, id: string) {
  await backupDirectory(root(userData))
  await backupDirectory(directory(userData, id))
  const path = join(directory(userData, id), 'manifest.json')
  await regular(path)
  if ((await lstat(path)).size > 2 * 1024 * 1024)
    throw new Error('Backup manifest exceeded its byte budget')
  const raw = await readFile(path, 'utf8')
  const manifest = v.parse(manifestSchema, JSON.parse(raw))
  if (manifest.id !== id)
    throw new Error('Backup directory and identity disagree')
  return { ...manifest, manifestHash: hash(raw) }
}
async function readManifest(userData: string, id: string): Promise<LifeBackupSummary> {
  const manifest = await readPrivateManifest(userData, id)
  return { id: manifest.id, cardId: manifest.cardId, createdAt: manifest.createdAt, revision: manifest.revision, schemaVersion: manifest.schemaVersion, databaseHash: manifest.databaseHash, soulHash: manifest.soulHash, manifestHash: manifest.manifestHash }
}
async function verifyBackup(userData: string, id: string, expected: string) {
  const manifest = await readPrivateManifest(userData, id)
  if (manifest.manifestHash !== expected || await fileHash(join(directory(userData, id), 'alicization.db')) !== manifest.databaseHash)
    throw new Error('Backup changed after review')
  if (manifest.soulHash !== null && await fileHash(join(directory(userData, id), 'SOUL.md')) !== manifest.soulHash)
    throw new Error('Backup identity file changed after review')
  await verifyFileRecoveryBackupArtifacts(join(directory(userData, id), 'alicization.db'), directory(userData, id), manifest.cardId, manifest.format === 'life-backup-v2' ? manifest.fileRecovery : [])
  return manifest
}

export function createLifeBackupRuntime(options: {
  userDataPath: string
  cardId: () => string
  snapshot: (path: string) => Promise<void>
  state: () => Promise<{ revision: number }>
  schema: () => Promise<number>
}) {
  const inspect = async (signal = AbortSignal.timeout(10000)) => {
    const cardId = v.parse(card, options.cardId())
    if (!await exists(root(options.userDataPath)))
      return { cardId, backups: [], issues: [] }
    await backupDirectory(root(options.userDataPath))
    const found: LifeBackupSummary[] = []
    const issues: LifeBackupIssue[] = []
    let inspected = 0
    for await (const entry of await opendir(root(options.userDataPath))) {
      signal.throwIfAborted()
      if (++inspected > 20000)
        throw new Error('Backup catalog exceeded its bounded index capacity')
      if (!v.safeParse(uuid, entry.name).success)
        continue
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        issues.push({ backupId: entry.name, ownership: 'unidentified', code: 'unsafe-entry' })
        continue
      }
      try {
        if (!await exists(join(directory(options.userDataPath, entry.name), 'manifest.json')))
          continue
        const manifest = await readManifest(options.userDataPath, entry.name)
        if (manifest.cardId === cardId)
          found.push(manifest)
      }
      catch {
        // Unreadable metadata cannot establish another life or authorize
        // cleanup. Keep it, report its limited scope, and list the other rows.
        issues.push({ backupId: entry.name, ownership: 'unidentified', code: 'unreadable-manifest' })
      }
    }
    signal.throwIfAborted()
    return { cardId, backups: found.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)), issues }
  }
  const catalog = createLifeBackupCatalog({
    cardId: options.cardId,
    inspect,
    read: id => readManifest(options.userDataPath, id),
    stamp: async () => {
      const path = root(options.userDataPath)
      if (!await exists(path))
        return 'absent'
      await backupDirectory(path)
      const stat = await lstat(path, { bigint: true })
      return `${stat.dev}:${stat.ino}:${stat.mtimeNs}:${stat.ctimeNs}`
    },
  })
  return {
    inspect,
    inspectPage: catalog.page,
    list: async () => (await inspect()).backups,
    create: async () => {
      const cardId = v.parse(card, options.cardId())
      const id = randomUUID()
      const target = directory(options.userDataPath, id)
      await mkdir(root(options.userDataPath), { recursive: true })
      await backupDirectory(root(options.userDataPath))
      // Exclusive creation owns only this new unpublished snapshot, never an
      // existing backup or the current card's personality and database.
      await mkdir(target, { mode: 0o700 })
      const created = await lstat(target, { bigint: true })
      if (!created.isDirectory() || created.isSymbolicLink())
        throw new Error('New backup directory changed before snapshot creation')
      const assertCurrentCard = () => {
        if (options.cardId() !== cardId)
          throw new Error('Active life card changed during backup creation')
      }
      try {
        assertCurrentCard()
        const soulPath = join(cardDirectory(options.userDataPath, cardId), 'SOUL.md')
        const beforeSoul = await exists(soulPath) ? await fileHash(soulPath) : null
        const before = await options.state()
        assertCurrentCard()
        await options.snapshot(join(target, 'alicization.db'))
        assertCurrentCard()
        const fileRecovery = await copyFileRecoveryBackupArtifacts(join(target, 'alicization.db'), cardDirectory(options.userDataPath, cardId), target, cardId)
        if (beforeSoul !== null)
          await copyFile(soulPath, join(target, 'SOUL.md'))
        const after = await options.state()
        assertCurrentCard()
        const afterSoul = await exists(soulPath) ? await fileHash(soulPath) : null
        if (before.revision !== after.revision || beforeSoul !== afterSoul || (beforeSoul !== null && await fileHash(join(target, 'SOUL.md')) !== beforeSoul))
          throw createLifeBackupSnapshotConflict()
        const schemaVersion = await options.schema()
        const databaseHash = await fileHash(join(target, 'alicization.db'))
        assertCurrentCard()
        const manifest: Manifest = { format: 'life-backup-v2', id, cardId, createdAt: Date.now(), revision: before.revision, schemaVersion, databaseHash, soulHash: beforeSoul, fileRecovery }
        await durableJson(join(target, 'manifest.json'), manifest)
        catalog.invalidate()
        return readManifest(options.userDataPath, id)
      }
      catch (error) {
        try {
          await removeUnpublishedLifeBackup({ root: root(options.userDataPath), directory: target, identity: `${created.dev}:${created.ino}` })
        }
        catch (cleanup) {
          throw new AggregateError([error, cleanup], `${errorMessageFrom(error)}; Unpublished backup cleanup refused: ${errorMessageFrom(cleanup)}`)
        }
        throw error
      }
    },
    requestRestore: async (id: string, expected: string) => {
      const manifest = await verifyBackup(options.userDataPath, id, expected)
      if (manifest.cardId !== options.cardId() || manifest.schemaVersion !== await options.schema())
        throw new Error('Backup scope or schema differs from this life')
      const current = await connect(join(cardDirectory(options.userDataPath, manifest.cardId), 'alicization.db'), true)
      try { await assertForgetBoundary(current, manifest.revision) }
      finally { await close(current) }
      const pending = join(root(options.userDataPath), 'restore-request.json')
      if (await exists(pending))
        throw new Error('A restore is already pending restart')
      await backupDirectory(root(options.userDataPath))
      if (options.cardId() !== manifest.cardId)
        throw new Error('Active life owner changed before accepting restore')
      await durableJson(pending, { backupId: id, cardId: manifest.cardId, expectedManifestHash: expected, operationId: randomUUID() })
    },
  }
}

function connect(path: string, readOnly = false) {
  return new Promise<InstanceType<typeof sqlite.Database>>((resolve, reject) => {
    const db = new sqlite.Database(sqliteFileSystemPath(path), readOnly ? sqlite.OPEN_READONLY : sqlite.OPEN_READWRITE, error => error ? reject(error) : resolve(db))
  })
}
const close = (db: InstanceType<typeof sqlite.Database>) => new Promise<void>((resolve, reject) => db.close(error => error ? reject(error) : resolve()))
const run = (db: InstanceType<typeof sqlite.Database>, sql: string, args: unknown[] = []) => new Promise<void>((resolve, reject) => db.run(sql, args, error => error ? reject(error) : resolve()))
const all = <T>(db: InstanceType<typeof sqlite.Database>, sql: string, args: unknown[] = []) => new Promise<T[]>((resolve, reject) => db.all(sql, args, (error, rows) => error ? reject(error) : resolve(rows as T[])))

async function assertForgetBoundary(db: InstanceType<typeof sqlite.Database>, revision: number) {
  const withdrawn = await all(db, `SELECT job_id FROM life_evidence_cleanup_jobs WHERE mode='forget' AND started_revision > ? LIMIT 1`, [revision])
  if (withdrawn.length)
    throw new Error('This backup predates a forgotten source; restoring it would revive withdrawn memory')
}

// Runs before the desktop life database and workers are opened. The original
// directory stays intact; a restart after either rename finishes the same saga.
export async function applyPendingLifeRestore(userDataPath: string, interrupt?: (phase: 'staged' | 'before-moved') => void) {
  if (!await exists(root(userDataPath)))
    return null
  await backupDirectory(root(userDataPath))
  const pending = join(root(userDataPath), 'restore-request.json')
  if (!await exists(pending))
    return null
  await regular(pending)
  const request = v.parse(requestSchema, JSON.parse(await readFile(pending, 'utf8')))
  const manifest = await verifyBackup(userDataPath, request.backupId, request.expectedManifestHash)
  const current = cardDirectory(userDataPath, request.cardId)
  const before = join(root(userDataPath), `before-restore-${request.operationId}`)
  const staged = join(root(userDataPath), `restore-stage-${request.operationId}`)
  const receipt = join(root(userDataPath), `restore-receipt-${request.operationId}.json`)
  if (!await exists(receipt) && !await exists(before)) {
    const currentDb = await connect(join(current, 'alicization.db'))
    const snapshot = join(root(userDataPath), `before-restore-${request.operationId}.db`)
    try {
      await assertForgetBoundary(currentDb, manifest.revision)
      if (!await exists(snapshot))
        await run(currentDb, 'VACUUM INTO ?', [sqliteFileSystemPath(snapshot)])
    }
    finally { await close(currentDb) }
    if (!await exists(staged))
      await mkdir(staged)
    // Staging is replaceable while the original directory is still authoritative.
    await copyFile(join(directory(userDataPath, manifest.id), 'alicization.db'), join(staged, 'alicization.db'))
    await copyFileRecoveryBackupArtifacts(join(staged, 'alicization.db'), directory(userDataPath, manifest.id), staged, request.cardId)
    // Current operational records are retained below; their encrypted versions
    // must travel with them even when absent from the older identity snapshot.
    await copyFileRecoveryBackupArtifacts(snapshot, current, staged, request.cardId)
    if (manifest.soulHash !== null)
      await copyFile(join(directory(userDataPath, manifest.id), 'SOUL.md'), join(staged, 'SOUL.md'))
    const db = await connect(join(staged, 'alicization.db'))
    try {
      await run(db, 'ATTACH DATABASE ? AS previous', [sqliteFileSystemPath(snapshot)])
      const schema = await all<{ value: string }>(db, 'SELECT value FROM previous.alicization_meta WHERE key = \'life.schema.version\'')
      if (Number(schema[0]?.value) !== manifest.schemaVersion)
        throw new Error('Restore schema changed before restart')
      const conflicts = await all(db, 'SELECT b.commit_id FROM life_commits b JOIN previous.life_commits p ON b.card_id=p.card_id AND b.revision=p.revision WHERE b.commit_id!=p.commit_id LIMIT 1')
      if (conflicts.length)
        throw new Error('Backup belongs to a different life history')
      await run(db, 'BEGIN IMMEDIATE')
      await run(db, 'INSERT OR IGNORE INTO life_commits SELECT * FROM previous.life_commits')
      // Operational records retain their current authority across identity restore.
      // An old snapshot must never revive cancelled timers or repeat completed work.
      for (const table of ['task_threads', 'executor_sessions', 'executor_events', 'scheduled_tasks', 'life_obligations', 'life_execution_contracts', 'life_work_plans', 'life_work_step_results', 'life_work_slices']) {
        await run(db, `DELETE FROM ${table}`)
        await run(db, `INSERT INTO ${table} SELECT * FROM previous.${table}`)
      }
      await run(db, `INSERT OR REPLACE INTO life_effect_intents SELECT * FROM previous.life_effect_intents WHERE kind='execute'`)
      // Identity rollback must retain the current one-shot native admissions.
      // Restoring an older index could forget a dispatched input or revive a
      // superseded admission. Its protected native files live outside this card.
      await run(db, 'DELETE FROM alicization_meta WHERE key GLOB ?', [`${windowsKeyboardJournalIndexPrefix}*`])
      await run(db, 'INSERT INTO alicization_meta SELECT * FROM previous.alicization_meta WHERE key GLOB ?', [`${windowsKeyboardJournalIndexPrefix}*`])
      // Identity rollback cannot revive a revoked service key or weaker rubric.
      // Preserve the current operational authority, including its absence.
      await run(db, 'DELETE FROM alicization_meta WHERE key=?', [executionVerificationRegistryKey])
      await run(db, 'INSERT INTO alicization_meta SELECT * FROM previous.alicization_meta WHERE key=?', [executionVerificationRegistryKey])
      await run(db, `UPDATE life_effect_intents SET status=CASE WHEN status IN ('prepared','claimed','cancelled') THEN 'cancelled' WHEN status='failed' AND json_extract(receipt_ref_json,'$.outcome')='host-taken-over' THEN 'failed' ELSE 'uncertain' END, lease_owner=NULL, lease_until=NULL, last_error_code='BACKUP_RESTORE_REQUIRES_RECONCILIATION' WHERE kind='execute'`)
      await run(db, `UPDATE life_ingress SET status='held', lease_owner=NULL, lease_until=NULL WHERE kind='user-turn' AND status IN ('accepted','processing')`)
      await run(db, `INSERT OR REPLACE INTO life_ingress SELECT * FROM previous.life_ingress WHERE kind='task-run' OR source IN ('execution','work-run-request','work-stop','execution-user-review','goal-verifier','execution-host-original','execution-host-takeover','execution-reconciliation','browser-download-result','browser-download-reservation','browser-download-reservation-result','browser-download-resource-release','file-version-before','file-version-after','file-version-forget-result','file-recovery-audit','file-version-orphan-cleanup') OR source LIKE 'file-recovery-request:%'`)
      await run(db, `UPDATE life_work_slices SET state='stopping' WHERE state IN ('ready','running')`)
      await run(db, `UPDATE life_ingress SET status='held', lease_owner=NULL, lease_until=NULL WHERE kind='task-run' AND status IN ('accepted','processing')`)
      // Keep the current commit clock so old callbacks cannot acquire a reused revision.
      await run(db, `INSERT OR REPLACE INTO life_owner_versions SELECT * FROM previous.life_owner_versions WHERE owner IN ('__commit_clock__','goals')`)
      await run(db, `INSERT OR REPLACE INTO alicization_meta SELECT * FROM previous.alicization_meta WHERE key IN (SELECT json_extract(payload_ref_json, '$.metaKey') FROM previous.life_owner_versions WHERE owner='goals')`)
      await run(db, `INSERT OR REPLACE INTO alicization_meta(key,value,updated_at) VALUES ('kill_switch_state_v1', ?, ?)`, [JSON.stringify({ state: 'SUSPENDED', reason: 'backup-restore-review-required', updatedAt: Date.now() }), Date.now()])
      await run(db, `INSERT OR REPLACE INTO alicization_meta(key,value,updated_at) VALUES ('life:backup-restore', ?, ?)`, [JSON.stringify({ backupId: manifest.id, operationId: request.operationId, beforeDirectory: before, status: 'restored-awaiting-review', restoredAt: Date.now() }), Date.now()])
      const failures = await all(db, 'PRAGMA foreign_key_check')
      if (failures.length)
        throw new Error('Restored database has unresolved references')
      const integrity = await all<{ integrity_check: string }>(db, 'PRAGMA integrity_check')
      if (integrity[0]?.integrity_check !== 'ok')
        throw new Error('Restored database failed integrity checking')
      await run(db, 'COMMIT')
      await run(db, 'DETACH DATABASE previous')
      await reconcileRestoredLifeGoals(db, request.cardId, request.operationId)
    }
    finally { await close(db) }
    const fileRecovery = await readFileRecoveryBackupReferences(join(staged, 'alicization.db'), request.cardId)
    await verifyFileRecoveryBackupArtifacts(join(staged, 'alicization.db'), staged, request.cardId, fileRecovery)
    await durableJson(join(staged, 'restore-activation.json'), { operationId: request.operationId, databaseHash: await fileHash(join(staged, 'alicization.db')), soulHash: manifest.soulHash, fileRecovery })
    interrupt?.('staged')
    await rename(current, before)
    interrupt?.('before-moved')
  }
  if (!await exists(receipt)) {
    if (!await exists(current))
      await rename(staged, current)
    const activation = JSON.parse(await readFile(join(current, 'restore-activation.json'), 'utf8'))
    if (activation.operationId !== request.operationId || activation.databaseHash !== await fileHash(join(current, 'alicization.db')) || (activation.soulHash !== null && activation.soulHash !== await fileHash(join(current, 'SOUL.md'))))
      throw new Error('Restored files changed before activation receipt')
    await verifyFileRecoveryBackupArtifacts(join(current, 'alicization.db'), current, request.cardId, v.parse(v.pipe(v.array(fileRecoveryBlobSchema), v.maxLength(4096)), activation.fileRecovery))
    await durableJson(receipt, { operationId: request.operationId, backupId: manifest.id, beforeDirectory: before, completedAt: Date.now() })
  }
  await rename(pending, join(root(userDataPath), `restore-request-${request.operationId}.completed.json`))
  return { cardId: request.cardId, backupId: manifest.id, beforeDirectory: before }
}

// Human-selected startup recovery. Preserve both directories if activation had
// started; never delete an identity or replay actions while cancelling restore.
export async function cancelPendingLifeRestore(userDataPath: string) {
  await backupDirectory(root(userDataPath))
  const pending = join(root(userDataPath), 'restore-request.json')
  await regular(pending)
  const request = v.parse(requestSchema, JSON.parse(await readFile(pending, 'utf8')))
  const current = cardDirectory(userDataPath, request.cardId)
  const before = join(root(userDataPath), `before-restore-${request.operationId}`)
  const original = await exists(before) ? before : current
  await backupDirectory(original)
  await regular(join(original, 'alicization.db'))
  // FTS5 integrity checking needs a writable scratch connection even though it
  // changes no life records. Validate a SQLite snapshot, keeping original files.
  const originalDb = await connect(join(original, 'alicization.db'))
  const checkPath = join(root(userDataPath), `cancel-check-${randomUUID()}.db`)
  try { await run(originalDb, 'VACUUM INTO ?', [sqliteFileSystemPath(checkPath)]) }
  finally { await close(originalDb) }
  const db = await connect(checkPath)
  try {
    const integrity = await all<{ integrity_check: string }>(db, 'PRAGMA integrity_check')
    if (integrity[0]?.integrity_check !== 'ok')
      throw new Error(`Original life data failed integrity checking: ${JSON.stringify(integrity).slice(0, 1000)}`)
  }
  finally { await close(db) }
  if (original === before) {
    if (await exists(current))
      await rename(current, join(root(userDataPath), `restore-rejected-${request.operationId}-${randomUUID()}`))
    await rename(before, current)
  }
  await rename(pending, join(root(userDataPath), `restore-request-${request.operationId}.cancelled.json`))
}
