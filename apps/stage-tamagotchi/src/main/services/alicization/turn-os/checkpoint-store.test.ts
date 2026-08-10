import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import {
  createAlicizationRuntimeEvent,
} from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createAlicizationRuntimeCheckpointStore } from './checkpoint-store'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-checkpoint-store-test-'))
  sandboxDirs.push(dir)
  return dir
}

function openSqlite(filepath: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    let database: sqlite3.Database | null = null
    database = new sqlite3.Database(filepath, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve(database!)
    })
  })
}

function runSqlite(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve())
  })
}

function getSqlite<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined))
  })
}

function allSqlite<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve((rows ?? []) as T[]))
  })
}

function closeSqlite(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

afterEach(async () => {
  await Promise.all(sandboxDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

function runtimeScope(overrides: Partial<{
  turnId: string
  cardId: string
  userId: string
  conversationId: string
}> = {}) {
  return {
    turnId: 'turn-1',
    cardId: 'card-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
    ...overrides,
  }
}

function runtimeEvent(
  eventId: string,
  eventType: AlicizationRuntimeEventEnvelope['eventType'],
  scope = runtimeScope(),
) {
  return createAlicizationRuntimeEvent({
    eventId,
    eventType,
    turnId: scope.turnId,
    cardId: scope.cardId,
    userId: scope.userId,
    conversationId: scope.conversationId,
    source: 'runtime',
    occurredAt: 1_000,
    payload: { eventId },
  })
}

describe('alicization runtime checkpoint store', () => {
  it('saves, loads, and upserts a recoverable checkpoint', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 1_000,
      abortSignal: AbortSignal.abort(),
      activeActions: new Map([['action-1', { status: 'running' }]]),
      resume: () => {},
    } as any)
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: ['action-1', 'action-2'],
      deliveryOwner: 'callback',
      schemaVersion: 1,
      updatedAt: 2_000,
    })

    const loaded = await db.loadRuntimeCheckpoint(scope)

    expect(loaded).toEqual({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: ['action-1', 'action-2'],
      deliveryOwner: 'callback',
      schemaVersion: 1,
      updatedAt: 2_000,
    })
    expect(loaded).not.toHaveProperty('abortSignal')
    expect(loaded).not.toHaveProperty('activeActions')
    expect(loaded).not.toHaveProperty('resume')

    await db.close()
  })

  it('isolates checkpoint save and load by the full turn scope', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 0,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 1_000,
    })

    const foreignScope = runtimeScope({
      userId: 'user-2',
      conversationId: 'conversation-2',
    })
    await expect(db.loadRuntimeCheckpoint(foreignScope)).rejects.toThrow(/scope/i)
    await expect(db.saveRuntimeCheckpoint({
      ...foreignScope,
      sequence: 0,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 2_000,
    })).rejects.toThrow(/scope/i)

    await db.close()
  })

  it('rejects stale checkpoint sequences and older same-sequence updates', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 2_000,
    })

    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'waiting',
      activeActionIds: [],
      deliveryOwner: 'callback',
      schemaVersion: 1,
      updatedAt: 3_000,
    }))
      .rejects
      .toThrow(/stale checkpoint sequence/i)
    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: [],
      deliveryOwner: 'callback',
      schemaVersion: 1,
      updatedAt: 1_999,
    }))
      .rejects
      .toThrow(/checkpoint updatedAt/i)

    expect(await db.loadRuntimeCheckpoint(scope)).toMatchObject({
      sequence: 2,
      status: 'running',
      updatedAt: 2_000,
    })
    await db.close()
  })

  it('rejects checkpoints beyond the event cursor and allows valid cursor advances', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))

    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 3,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 1_000,
    }))
      .rejects
      .toThrow(/event cursor/i)

    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 1_000,
    })
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 1_500,
    })
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: ['action-1'],
      deliveryOwner: 'callback',
      schemaVersion: 1,
      updatedAt: 2_000,
    })

    expect(await db.loadRuntimeCheckpoint(scope)).toMatchObject({
      sequence: 2,
      status: 'waiting',
      deliveryOwner: 'callback',
      updatedAt: 2_000,
    })
    await db.close()
  })

  it('rejects a foreign checkpoint when events already own the turn', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const eventScope = runtimeScope()
    await db.appendRuntimeEvent(eventScope, runtimeEvent('event-1', 'turn.accepted', eventScope))
    const foreignScope = runtimeScope({
      cardId: 'card-foreign',
      userId: 'user-foreign',
      conversationId: 'conversation-foreign',
    })

    await expect(db.saveRuntimeCheckpoint({
      ...foreignScope,
      sequence: 1,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 1_000,
    }))
      .rejects
      .toThrow(/scope/i)
    await expect(db.loadRuntimeCheckpoint(foreignScope))
      .rejects
      .toThrow(/scope/i)

    await db.close()
  })

  it.each([
    ['unknown status', {
      status: 'unknown-status',
      schemaVersion: 1,
    }],
    ['unsupported schema version', {
      status: 'running',
      schemaVersion: 2,
    }],
  ])('rejects an %s checkpoint contract', async (_label, overrides) => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 0,
      activeActionIds: [],
      deliveryOwner: 'inline',
      updatedAt: 1_000,
      ...overrides,
    } as any))
      .rejects
      .toThrow(/checkpoint (status|schemaVersion)/i)

    await db.close()
  })

  it('recovers by loading checkpoint before listing tail events', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      schemaVersion: 1,
      updatedAt: 2_000,
    })
    await db.appendRuntimeEvent(scope, runtimeEvent('event-3', 'context.assembly.completed'))

    const checkpoint = await db.loadRuntimeCheckpoint(scope)
    const tail = await db.listRuntimeEvents(scope, {
      afterSequence: checkpoint?.sequence ?? 0,
    })

    expect(checkpoint?.sequence).toBe(2)
    expect(tail.map(event => [event.eventId, event.sequence])).toEqual([
      ['event-3', 3],
    ])

    await db.close()
  })

  it('loads checkpoint and event cursor from one SQLite read snapshot during a concurrent commit', async () => {
    const dir = await createSandboxUserDataPath()
    const databasePath = join(dir, 'checkpoint-load-snapshot.sqlite')
    const reader = await openSqlite(databasePath)
    const writer = await openSqlite(databasePath)
    const firstReadFinished = createDeferred()
    const writerCommitted = createDeferred()
    let barrierReached = false

    const readWithBarrier = async <T>(
      sql: string,
      read: () => Promise<T>,
    ) => {
      const readsEvents = sql.includes('alicization_runtime_events')
      const readsCheckpoints = sql.includes('alicization_runtime_checkpoints')
      if (!readsEvents && !readsCheckpoints)
        return await read()

      if (readsEvents && readsCheckpoints) {
        if (!barrierReached) {
          barrierReached = true
          firstReadFinished.resolve()
        }
        await writerCommitted.promise
        return await read()
      }

      const result = await read()
      if (!barrierReached) {
        barrierReached = true
        firstReadFinished.resolve()
        await writerCommitted.promise
      }
      return result
    }

    try {
      await runSqlite(reader, 'PRAGMA journal_mode = WAL')
      await runSqlite(writer, 'PRAGMA journal_mode = WAL')
      await runSqlite(reader, `
        CREATE TABLE alicization_runtime_events (
          turn_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          sequence INTEGER NOT NULL
        )
      `)
      await runSqlite(reader, `
        CREATE TABLE alicization_runtime_checkpoints (
          turn_id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          runtime_status TEXT NOT NULL,
          active_action_ids_json TEXT NOT NULL,
          delivery_owner TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)

      const store = createAlicizationRuntimeCheckpointStore({
        database: reader,
        run: async (database, sql, params = []) => await runSqlite(database, sql, params),
        get: async <T>(database: sqlite3.Database, sql: string, params: unknown[] = []) => {
          return await readWithBarrier(sql, async () => await getSqlite<T>(database, sql, params))
        },
        all: async <T>(database: sqlite3.Database, sql: string, params: unknown[] = []) => {
          return await readWithBarrier(sql, async () => await allSqlite<T>(database, sql, params))
        },
        runInTransaction: async <T>(
          _database: sqlite3.Database,
          task: () => Promise<T>,
        ) => await task(),
        enqueueWrite: async <T>(task: () => Promise<T>) => await task(),
      })
      const scope = runtimeScope()
      const loading = store.load(scope)

      await firstReadFinished.promise
      await runSqlite(writer, 'BEGIN IMMEDIATE')
      await runSqlite(
        writer,
        `
        INSERT INTO alicization_runtime_events (
          turn_id, card_id, user_id, conversation_id, sequence
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [scope.turnId, scope.cardId, scope.userId, scope.conversationId, 1],
      )
      await runSqlite(
        writer,
        `
        INSERT INTO alicization_runtime_checkpoints (
          turn_id,
          card_id,
          user_id,
          conversation_id,
          sequence,
          runtime_status,
          active_action_ids_json,
          delivery_owner,
          schema_version,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          scope.turnId,
          scope.cardId,
          scope.userId,
          scope.conversationId,
          1,
          'running',
          '["action-1"]',
          'inline',
          1,
          1_000,
        ],
      )
      await runSqlite(writer, 'COMMIT')
      writerCommitted.resolve()

      await expect(loading).resolves.toEqual({
        ...scope,
        sequence: 1,
        status: 'running',
        activeActionIds: ['action-1'],
        deliveryOwner: 'inline',
        schemaVersion: 1,
        updatedAt: 1_000,
      })
    }
    finally {
      writerCommitted.resolve()
      await Promise.all([closeSqlite(reader), closeSqlite(writer)])
    }
  })
})
