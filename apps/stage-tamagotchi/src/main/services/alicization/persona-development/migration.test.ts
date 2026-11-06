import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'

function open(path: string, mode = sqlite3.OPEN_READWRITE) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const value = new sqlite3.Database(path, mode, error => error ? reject(error) : resolve(value))
  })
}
const close = (db: sqlite3.Database) => new Promise<void>((resolve, reject) => db.close(error => error ? reject(error) : resolve()))
const get = <T>(db: sqlite3.Database, sql: string) => new Promise<T>((resolve, reject) => db.get(sql, (error, row) => error ? reject(error) : resolve(row as T)))

it('migrates the released v7 store with a consistent recoverable backup and preserves existing personhood', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-persona-migration-'))
  let db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
  try {
    await db.commitLifeState({ cardId: 'alice', operationKey: 'existing-relationship', changes: [{ owner: 'relationship', key: 'life:relationship', value: JSON.stringify({ continuity: 'already-known-host' }) }] })
    await db.close()
    const old = await open(join(root, 'alicization.db'))
    try {
      await new Promise<void>((resolve, reject) => old.exec('BEGIN; DROP TABLE life_persona_evidence; DROP TABLE life_persona_trials; DROP TABLE life_persona_extractions; DROP TABLE life_persona_withdrawals; UPDATE alicization_meta SET value=\'7\' WHERE key=\'life.schema.version\'; COMMIT;', error => error ? reject(error) : resolve()))
    }
    finally { await close(old) }
    db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
    expect(await db.getMetaValue('life.schema.version')).toBe('8')
    expect(JSON.parse((await db.readLifeState()).values['life:relationship'])).toEqual({ continuity: 'already-known-host' })
    expect(await db.readPersonaLearningEvidence()).toEqual([])
    const backups = (await readdir(join(root, 'backups'))).filter(name => name.startsWith('life-schema-7-to-8-'))
    expect(backups).toHaveLength(1)
    const backup = await open(join(root, 'backups', backups[0]), sqlite3.OPEN_READONLY)
    try {
      expect(await get(backup, 'SELECT value FROM alicization_meta WHERE key=\'life.schema.version\'')).toEqual({ value: '7' })
      expect(await get(backup, 'SELECT COUNT(*) AS count FROM sqlite_master WHERE name=\'life_persona_evidence\'')).toEqual({ count: 0 })
      expect(await get(backup, 'SELECT value FROM alicization_meta WHERE key=\'life:relationship\'')).toEqual({ value: JSON.stringify({ continuity: 'already-known-host' }) })
    }
    finally { await close(backup) }
  }
  finally {
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})
