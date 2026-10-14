import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { expect, it } from 'vitest'

import { initializeSqliteWal } from './sqlite-wal-initialization'

it('fails within its bounded budget for a held lock, preserves the holder, and opens in WAL after release', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-wal-lock-'))
  const path = join(root, 'life.db')
  const holder = new sqlite3.Database(path)
  const reader = new sqlite3.Database(path)
  const run = (db: sqlite3.Database, sql: string) => new Promise<void>((resolve, reject) => db.run(sql, error => error ? reject(error) : resolve()))
  const get = (db: sqlite3.Database, sql: string) => new Promise<Record<string, unknown>>((resolve, reject) => db.get(sql, (error, row) => error ? reject(error) : resolve(row as Record<string, unknown>)))
  const close = (db: sqlite3.Database) => new Promise<void>((resolve, reject) => db.close(error => error ? reject(error) : resolve()))
  try {
    await run(holder, 'CREATE TABLE probe (value TEXT)')
    await run(holder, 'BEGIN EXCLUSIVE')
    await run(holder, 'INSERT INTO probe VALUES (\'holder-state\')')
    const began = performance.now()
    await expect(initializeSqliteWal(reader, 300)).rejects.toMatchObject({ code: 'SQLITE_BUSY' })
    expect(performance.now() - began).toBeLessThan(2000)
    expect(await get(holder, 'SELECT value FROM probe')).toEqual({ value: 'holder-state' })
    const opening = initializeSqliteWal(reader)
    await run(holder, 'COMMIT')
    await opening
    expect(await get(reader, 'PRAGMA journal_mode')).toEqual({ journal_mode: 'wal' })
    expect(await get(reader, 'PRAGMA busy_timeout')).toEqual({ timeout: 2000 })
    expect(await get(reader, 'SELECT value FROM probe')).toEqual({ value: 'holder-state' })
  }
  finally {
    await close(holder)
    await close(reader)
    await rm(root, { recursive: true, force: true })
  }
})
