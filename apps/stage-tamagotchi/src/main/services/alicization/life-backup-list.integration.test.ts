import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeBackupRuntime } from './life-backup-runtime'
import { lifeSchemaVersion } from './life-schema-version'

it.each(['invalid-json', 'oversized', 'wrong-identity', 'unsupported-format'] as const)('lists the other exact backups while retaining a %s manifest for inspection', async (condition) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-list-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-list-v1', root, condition }))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  try {
    const soul = join(root, 'alicizations', 'cards', 'alice', 'SOUL.md')
    await writeFile(soul, 'Persistent same identity 中文🙂')
    const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', state: db.readLifeState, snapshot: db.snapshotLifeDatabase, schema: async () => lifeSchemaVersion })
    const valid = await runtime.create()
    const invalid = await runtime.create()
    const manifest = join(root, 'alicizations', 'life-backups', invalid.id, 'manifest.json')
    const content = JSON.parse(await readFile(manifest, 'utf8'))
    const damaged = condition === 'invalid-json' ? '{unreadable' : condition === 'oversized' ? ' '.repeat(2 * 1024 * 1024 + 1) : JSON.stringify({ ...content, ...(condition === 'wrong-identity' ? { id: randomUUID() } : { format: 'life-backup-future-unreadable' }) })
    await writeFile(manifest, damaged)
    const before = await db.readLifeState()
    const databasePath = join(root, 'alicizations', 'life-backups', valid.id, 'alicization.db')
    const hash = createHash('sha256').update(await readFile(databasePath)).digest('hex')
    await expect(runtime.list()).resolves.toEqual([valid])
    expect(await runtime.inspect()).toEqual({ cardId: 'alice', backups: [valid], issues: [{ backupId: invalid.id, ownership: 'unidentified', code: 'unreadable-manifest' }] })
    expect(await runtime.inspectPage({ limit: 1 })).toEqual({ cardId: 'alice', backups: [valid], issues: [{ backupId: invalid.id, ownership: 'unidentified', code: 'unreadable-manifest' }], total: 1, issuesTotal: 1, nextCursor: null })
    expect(await readFile(manifest, 'utf8')).toBe(damaged)
    expect(createHash('sha256').update(await readFile(databasePath)).digest('hex')).toBe(hash)
    await expect(runtime.requestRestore(invalid.id, invalid.manifestHash)).rejects.toThrow()
    expect(await db.readLifeState()).toEqual(before)
    expect(await readFile(soul, 'utf8')).toBe('Persistent same identity 中文🙂')
  }
  finally { await db.close() }
})
