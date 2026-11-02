import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { lifeSchemaVersion } from './life-schema-version'
import { createLifeTurnRuntime } from './life-turn-runtime'

async function edit(path: string, task: (run: (sql: string, parameters?: unknown[]) => Promise<void>) => Promise<void>) {
  const database = await new Promise<sqlite3.Database>((resolve, reject) => {
    const connection = new sqlite3.Database(path, error => error ? reject(error) : resolve(connection))
  })
  try {
    await task((sql, parameters = []) => new Promise((resolve, reject) => database.run(sql, parameters, error => error ? reject(error) : resolve())))
  }
  finally { await new Promise<void>((resolve, reject) => database.close(error => error ? reject(error) : resolve())) }
}

describe('durable input migration and restart recovery', () => {
  it('backs up schema 6 before enabling read-bound contracts and preserves the full life view and unconfirmed effect', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-read-contract-migration-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
    try {
      const signal = new AbortController().signal
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'original-request', conversationId: 'continuous-session', messages: [{ role: 'user', content: '保留这一段关系与记忆来源，以及还没确认结果的操作。中文🙂' }] }, signal)
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'original-request', actionId: 'pending-operation', capabilityId: 'tool.filesystem_write_file', parameters: { path: join(root, 'unconfirmed.txt'), content: 'Never replay this merely because of a migration' } }, signal)
      const before = await db.readLifeState()
      const original = await db.getLifeUserInput('user:original-request')
      const path = db.dbPath
      await db.close()
      await edit(path, run => run('UPDATE alicization_meta SET value = ? WHERE key = \'life.schema.version\'', ['6']))
      db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: root })
      expect(await db.getMetaValue('life.schema.version')).toBe(String(lifeSchemaVersion))
      expect(await db.readLifeState()).toEqual(before)
      expect(await db.getLifeUserInput('user:original-request')).toEqual(original)
      expect((await db.getLifeEffect(action.id))?.status).toBe('dispatched')
      const backups = await readdir(join(root, 'backups'))
      const name = backups.find(name => name.startsWith(`life-schema-6-to-${lifeSchemaVersion}-`) && name.endsWith('.db'))
      expect(name).toBeTruthy()
      const backup = await new Promise<sqlite3.Database>((resolve, reject) => {
        const connection = new sqlite3.Database(join(root, 'backups', name!), sqlite3.OPEN_READONLY, error => error ? reject(error) : resolve(connection))
      })
      try {
        const version = await new Promise<{ value: string }>((resolve, reject) => backup.get('SELECT value FROM alicization_meta WHERE key = \'life.schema.version\'', (error, row) => error ? reject(error) : resolve(row as { value: string })))
        expect(version.value).toBe('6')
      }
      finally { await new Promise<void>((resolve, reject) => backup.close(error => error ? reject(error) : resolve())) }
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('migrates only the current legacy input, backs up first, and holds unfinished admissions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-input-migration-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => 100 })
      await life.admit({ cardId: 'alice', turnId: 'legacy', conversationId: 'session', messages: [{ role: 'user', content: '当前原始输入' }] }, signal)
      const path = db.dbPath
      await db.close()
      const payload = JSON.stringify({ turnId: 'legacy', conversationId: 'session', inputHash: 'legacy-history-hash', messages: [{ role: 'user', content: '旧历史' }, { role: 'assistant', content: '旧回复' }, { role: 'user', content: '当前原始输入' }] })
      await edit(path, async (run) => {
        await run('DROP TABLE life_input_payloads')
        await run('UPDATE alicization_meta SET value = \'2\' WHERE key = \'life.schema.version\'')
        await run('UPDATE life_ingress SET payload_ref_json = ?, payload_hash = ?', [payload, createHash('sha256').update(payload).digest('hex')])
      })
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await db.getMetaValue('life.schema.version')).toBe(String(lifeSchemaVersion))
      expect(await db.getLifeUserInput('user:legacy')).toEqual({ role: 'user', content: '当前原始输入' })
      expect(JSON.stringify((await db.getLifeIngress('user:legacy'))?.payload)).not.toMatch(/旧历史|旧回复|messages/)
      expect((await readdir(join(root, 'alicizations', 'cards', 'alice'))).some(name => /backup|migration/iu.test(name))).toBe(true)
      const restartedLife = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => 200 })
      await restartedLife.recover('alice')
      expect((await db.getLifeIngress('user:legacy'))?.status).toBe('held')
      await expect(restartedLife.beforeAction({ cardId: 'alice', turnId: 'legacy', actionId: 'new-write', capabilityId: 'file', parameters: {} }, signal)).rejects.toThrow('no longer active')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('rejects a future schema before any database writes and preserves its exact bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-future-schema-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const path = db.dbPath
    await db.close()
    try {
      await edit(path, async (run) => {
        await run('UPDATE alicization_meta SET value = ? WHERE key = \'life.schema.version\'', [String(lifeSchemaVersion + 1)])
        await run('PRAGMA journal_mode = DELETE')
      })
      const before = createHash('sha256').update(await readFile(path)).digest('hex')
      await expect(setupAlicizationDb(root, { cardId: 'alice' })).rejects.toThrow('Unsupported life schema')
      expect(createHash('sha256').update(await readFile(path)).digest('hex')).toBe(before)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('rolls source input and its archive back when the admission transaction fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-admission-rollback-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => 100 })
      await expect(life.admit({ cardId: 'alice', turnId: 'invalid', conversationId: '', messages: [{ role: 'user', content: '不能成为半条输入' }] }, new AbortController().signal)).rejects.toThrow()
      expect(await db.getLifeIngress('user:invalid')).toBeNull()
      expect(await db.getLifeUserInput('user:invalid')).toBeNull()
      expect((await db.readLifeState()).revision).toBe(0)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
