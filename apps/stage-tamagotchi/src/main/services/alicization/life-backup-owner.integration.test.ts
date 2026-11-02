import type { LifeBackupOwner } from './life-backup-owner'

import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createOwnedLifeBackupRuntime } from './life-backup-owner'
import { createLifeBackupRuntime } from './life-backup-runtime'
import { lifeSchemaVersion } from './life-schema-version'

it('retries a transient actual life commit and publishes only one coherent current backup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-transient-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-owner-v1', root }))
  await writeFile(join(root, 'alicizations', 'cards', 'alice', 'SOUL.md'), 'Same continuous identity')
  let snapshots = 0
  const database = { ...db, snapshotLifeDatabase: async (path: string) => {
    await db.snapshotLifeDatabase(path)
    if (++snapshots === 1)
      await db.upsertTaskThread({ id: 'accepted-during-first-snapshot', goal: 'Keep the real new responsibility', kind: 'mixed', status: 'planned' })
  } }
  try {
    const runtime = createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => ({ cardId: 'alice', database }) })
    const backup = await runtime.create()
    expect(snapshots).toBe(2)
    expect(backup.revision).toBe((await db.readLifeState()).revision)
    expect(await runtime.list()).toEqual([backup])
    expect(await readdir(join(root, 'alicizations', 'life-backups'))).toEqual([backup.id])
    await runtime.requestRestore(backup.id, backup.manifestHash)
    expect((await db.readLifeState()).obligations.some(item => item.threadId === 'accepted-during-first-snapshot')).toBe(true)
    expect(await readFile(join(root, 'alicizations', 'cards', 'alice', 'SOUL.md'), 'utf8')).toBe('Same continuous identity')
  }
  finally { await db.close() }
})

it.each(['continuous-commits', 'ordinary-failure'] as const)('bounds retries for %s and retains the actual current life without publishing staging', async (condition) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-retry-bound-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-owner-v1', root, condition }))
  let snapshots = 0
  const database = { ...db, snapshotLifeDatabase: async (path: string) => {
    snapshots++
    if (condition === 'ordinary-failure')
      throw new Error('Life state changed during backup; retry when the current interaction settles')
    await db.snapshotLifeDatabase(path)
    await db.upsertTaskThread({ id: `current-activity-${snapshots}`, goal: 'Retain the actual current responsibility', kind: 'mixed', status: 'planned' })
  } }
  try {
    const runtime = createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => ({ cardId: 'alice', database }) })
    await expect(runtime.create()).rejects.toThrow('Life state changed')
    expect(snapshots).toBe(condition === 'continuous-commits' ? 3 : 1)
    expect(await readdir(join(root, 'alicizations', 'life-backups'))).toEqual([])
    expect(await runtime.list()).toEqual([])
    if (condition === 'continuous-commits')
      expect((await db.readLifeState()).obligations.filter(item => item.threadId?.startsWith('current-activity-'))).toHaveLength(3)
  }
  finally { await db.close() }
})

it('rejects a life switch after reading the initial revision instead of publishing another life under its identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-owner-switch-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-owner-v1', root }))
  const alice = await setupAlicizationDb(root, { cardId: 'alice' })
  const bob = await setupAlicizationDb(root, { cardId: 'bob' })
  for (const cardId of ['alice', 'bob']) {
    const card = join(root, 'alicizations', 'cards', cardId)
    await mkdir(card, { recursive: true })
    await writeFile(join(card, 'SOUL.md'), `Identity ${cardId}`)
  }
  let active = { cardId: 'alice', database: alice }
  let reads = 0
  try {
    const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => active.cardId, snapshot: path => active.database.snapshotLifeDatabase(path), schema: async () => lifeSchemaVersion, state: async () => {
      const state = await active.database.readLifeState()
      if (++reads === 1)
        active = { cardId: 'bob', database: bob }
      return state
    } })
    await expect(runtime.create()).rejects.toThrow(/life|card|owner/iu)
    expect(await readdir(join(root, 'alicizations', 'life-backups'))).toEqual([])
    expect(await readFile(join(root, 'alicizations', 'cards', 'alice', 'SOUL.md'), 'utf8')).toBe('Identity alice')
    expect(await readFile(join(root, 'alicizations', 'cards', 'bob', 'SOUL.md'), 'utf8')).toBe('Identity bob')
  }
  finally {
    await alice.close()
    await bob.close()
  }
})

it.each(['before-start', 'during-snapshot', 'database-replaced', 'in-place-owner-change', 'mismatched-database'] as const)('keeps the actual backup owner fixed across %s', async (condition) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-fixed-owner-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-owner-v1', root, condition }))
  const alice = await setupAlicizationDb(root, { cardId: 'alice' })
  const bob = await setupAlicizationDb(root, { cardId: 'bob' })
  await writeFile(join(root, 'alicizations', 'cards', 'alice', 'SOUL.md'), 'Identity alice')
  await writeFile(join(root, 'alicizations', 'cards', 'bob', 'SOUL.md'), 'Identity bob')
  let active: LifeBackupOwner = { cardId: 'alice', database: alice }
  const port: LifeBackupOwner['database'] = { ...alice, snapshotLifeDatabase: async (path: string) => {
    await alice.snapshotLifeDatabase(path)
    if (condition === 'during-snapshot')
      active = { cardId: 'bob', database: bob }
    if (condition === 'database-replaced')
      active = { cardId: 'alice', database: { ...port } }
    if (condition === 'in-place-owner-change')
      active.database = bob
  } }
  active = { cardId: 'alice', database: condition === 'mismatched-database' ? bob : port }
  try {
    const runtime = createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => active })
    if (condition === 'before-start')
      active = { cardId: 'bob', database: bob }
    await expect(runtime.create()).rejects.toThrow(/life|card|owner/iu)
    const entries = await readdir(join(root, 'alicizations', 'life-backups')).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT')
        return []
      throw error
    })
    expect(entries).toEqual([])
    expect(await readFile(join(root, 'alicizations', 'cards', 'alice', 'SOUL.md'), 'utf8')).toBe('Identity alice')
    expect(await readFile(join(root, 'alicizations', 'cards', 'bob', 'SOUL.md'), 'utf8')).toBe('Identity bob')
  }
  finally {
    await alice.close()
    await bob.close()
  }
})

it('creates and inspects the same life, then refuses a stale restore before writing its request', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-owner-restore-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-owner-v1', root }))
  const alice = await setupAlicizationDb(root, { cardId: 'alice' })
  const bob = await setupAlicizationDb(root, { cardId: 'bob' })
  let active = { cardId: 'alice', database: alice }
  try {
    const runtime = createOwnedLifeBackupRuntime({ userDataPath: root, currentOwner: () => active })
    const backup = await runtime.create()
    expect(await runtime.inspect()).toEqual({ cardId: 'alice', backups: [backup], issues: [] })
    active = { cardId: 'bob', database: bob }
    await expect(runtime.requestRestore(backup.id, backup.manifestHash)).rejects.toThrow('owner changed')
    await expect(readFile(join(root, 'alicizations', 'life-backups', 'restore-request.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await alice.readLifeState()).cardId).toBe('alice')
    expect((await bob.readLifeState()).cardId).toBe('bob')
  }
  finally {
    await alice.close()
    await bob.close()
  }
})
