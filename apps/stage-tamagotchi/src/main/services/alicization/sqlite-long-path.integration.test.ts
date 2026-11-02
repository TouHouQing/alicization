import { mkdir, mkdtemp, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { platform } from 'node:process'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'

it.skipIf(platform !== 'win32')('preserves one life state through long Windows migration backups, WAL snapshot and read-only reopening', async () => {
  const root = await mkdtemp(join(resolve('output'), 'sqlite-life-long-'))
  const original = join(root, 'a'.repeat(Math.max(1, 240 - root.length - 1)))
  const db = await setupAlicizationDb(root, { cardId: 'alice', rootDir: original })
  const snapshotRoot = join(original, 'snapshot', 'b'.repeat(80))
  await mkdir(snapshotRoot, { recursive: true })
  const snapshot = join(snapshotRoot, 'alicization.db')
  try {
    const migration = (await readdir(join(original, 'backups'))).find(name => name.startsWith('life-schema-'))!
    expect(join(original, 'backups', migration).length).toBeGreaterThan(260)
    expect((await stat(join(original, 'backups', migration))).size).toBeGreaterThan(0)
    await db.commitLifeState({ cardId: 'alice', operationKey: 'long-path-life-continuity', changes: [
      { owner: 'self', key: 'life:qa-self', value: JSON.stringify({ identity: 'same continuing person' }) },
      { owner: 'relationship', key: 'life:qa-relationship', value: JSON.stringify({ host: 'same trusted host' }) },
      { owner: 'emotion', key: 'life:qa-emotion', value: JSON.stringify({ feeling: 'calm' }) },
    ] })
    const before = await db.readLifeState()
    // VACUUM must include committed WAL content, not just the .db file.
    await db.snapshotLifeDatabase(snapshot)
    const reopened = await setupAlicizationDb(root, { cardId: 'alice', rootDir: snapshotRoot, readOnly: true })
    try {
      const after = await reopened.readLifeState()
      expect(after.cardId).toBe(before.cardId)
      expect(after.revision).toBe(before.revision)
      expect(after.owners).toEqual(before.owners)
      expect(after.values).toEqual(before.values)
      expect(reopened.dbPath).toBe(snapshot)
    }
    finally { await reopened.close() }
  }
  finally { await db.close() }
}, 20_000)
