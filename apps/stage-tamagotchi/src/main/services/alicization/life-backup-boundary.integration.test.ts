import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rename, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { applyPendingLifeRestore, createLifeBackupRuntime } from './life-backup-runtime'
import { lifeSchemaVersion } from './life-schema-version'

const cases = (['backup-directory', 'backup-parent'] as const).flatMap(boundary => (['request', 'boot'] as const).map(phase => ({ boundary, phase })))
it.skipIf(process.platform !== 'win32').each(cases)('refuses a $phase restore through a replaced $boundary while preserving the current identity', async ({ boundary, phase }) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-boundary-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-boundary-v1', root, boundary, phase }))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  let closed = false
  try {
    const soul = join(root, 'alicizations', 'cards', 'alice', 'SOUL.md')
    await writeFile(soul, 'Persistent original identity 中文🙂')
    const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', state: db.readLifeState, snapshot: db.snapshotLifeDatabase, schema: async () => lifeSchemaVersion })
    const backup = await runtime.create()
    if (phase === 'boot')
      await runtime.requestRestore(backup.id, backup.manifestHash)
    const parent = join(root, 'alicizations', 'life-backups')
    const moved = boundary === 'backup-parent' ? parent : join(parent, backup.id)
    const retained = join(root, `retained-${boundary}`)
    // Both paths are inside this newly owned synthetic fixture. No existing
    // user folder or profile is moved or cleaned up by this test.
    for (const target of [moved, retained])
      expect(relative(root, target)).not.toMatch(/^\.\.|^[A-Z]:/iu)
    await rename(moved, retained)
    await symlink(retained, moved, 'junction')
    const retainedBackup = boundary === 'backup-parent' ? join(retained, backup.id) : retained
    const database = join(retainedBackup, 'alicization.db')
    const digest = () => readFile(database).then(bytes => createHash('sha256').update(bytes).digest('hex'))
    const before = await digest()
    if (phase === 'request') {
      await expect(runtime.requestRestore(backup.id, backup.manifestHash)).rejects.toThrow(/backup|directory|link/iu)
      await expect(readFile(join(parent, 'restore-request.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    }
    else {
      await db.close()
      closed = true
      await expect(applyPendingLifeRestore(root)).rejects.toThrow(/backup|directory|link/iu)
      expect(JSON.parse(await readFile(join(parent, 'restore-request.json'), 'utf8')).backupId).toBe(backup.id)
    }
    expect(await digest()).toBe(before)
    expect(await readFile(soul, 'utf8')).toBe('Persistent original identity 中文🙂')
    if (phase === 'request')
      expect((await db.readLifeState()).cardId).toBe('alice')
    if (boundary === 'backup-directory') {
      expect(await runtime.inspect()).toEqual({ cardId: 'alice', backups: [], issues: [{ backupId: backup.id, ownership: 'unidentified', code: 'unsafe-entry' }] })
    }
    else {
      await expect(runtime.inspect()).rejects.toThrow(/backup|directory|link/iu)
      await expect(runtime.create()).rejects.toThrow(/backup|directory|link/iu)
    }
  }
  finally {
    if (!closed)
      await db.close()
  }
})
