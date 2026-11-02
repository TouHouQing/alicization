import { createHash } from 'node:crypto'
import { lstat, mkdtemp, readdir, readFile, rename, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { expect, it } from 'vitest'

import { createStartupFailureHandler } from '../../app/startup-failure'
import { setupAlicizationDb } from './db'
import { cancelPendingLifeRestore, createLifeBackupRuntime } from './life-backup-runtime'
import { lifeSchemaVersion } from './life-schema-version'

it.skipIf(process.platform !== 'win32').each(['backup-parent', 'before-restore'] as const)('refuses cancellation through a redirected %s without moving the current personality or writing outside the backup root', async (boundary) => {
  const root = await mkdtemp(join(tmpdir(), 'life-backup-cancel-boundary-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-backup-cancel-boundary-v1', root, boundary }))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  let closed = false
  try {
    const card = join(root, 'alicizations', 'cards', 'alice')
    const soul = join(card, 'SOUL.md')
    await writeFile(soul, 'Original persistent person 中文🙂')
    const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', state: db.readLifeState, snapshot: db.snapshotLifeDatabase, schema: async () => lifeSchemaVersion })
    const backup = await runtime.create()
    await runtime.requestRestore(backup.id, backup.manifestHash)
    await db.close()
    closed = true
    const parent = join(root, 'alicizations', 'life-backups')
    const pending = join(parent, 'restore-request.json')
    const requestBytes = await readFile(pending)
    const request = JSON.parse(requestBytes.toString('utf8'))
    let retained = parent
    if (boundary === 'backup-parent') {
      retained = join(root, 'retained-backup-parent')
      for (const target of [parent, retained])
        expect(relative(root, target)).not.toMatch(/^\.\.|^[A-Z]:/iu)
      await rename(parent, retained)
      await symlink(retained, parent, 'junction')
    }
    else {
      // The junction points to this fixture's own original card. Following
      // it and then renaming the current card would create a broken identity.
      await symlink(card, join(parent, `before-restore-${request.operationId}`), 'junction')
    }
    const database = join(card, 'alicization.db')
    const bytes = await readFile(database)
    const before = createHash('sha256').update(bytes).digest('hex')
    const entries = (await readdir(retained)).sort()
    const failure = await cancelPendingLifeRestore(root).then(() => null, error => error)
    expect(failure).toBeInstanceOf(Error)
    expect(failure).toMatchObject({ message: expect.stringMatching(/backup|directory|link/iu) })
    // The real startup handler gives a bounded failure dialog and opens only
    // its main-owned data path. It cannot continue to start life writers.
    const events: string[] = []
    const reported: unknown[] = []
    await createStartupFailureHandler({
      translate: key => key,
      userDataPath: root,
      logsPath: join(root, 'logs'),
      hideWindows: () => { events.push('hide') },
      showMessage: async (options) => {
        events.push('prompt')
        expect(options.type).toBe('error')
        expect(options.cancelId).toBe(2)
        expect(options.buttons).toHaveLength(3)
        return { response: 1 }
      },
      openPath: async (path) => {
        expect(path).toBe(root)
        events.push('open-data')
        return ''
      },
      quit: () => { events.push('quit') },
      report: (error) => { reported.push(error) },
    })(failure)
    expect(events).toEqual(['hide', 'prompt', 'open-data', 'quit'])
    expect(reported).toEqual([failure])
    expect(createHash('sha256').update(await readFile(database)).digest('hex')).toBe(before)
    expect((await lstat(card)).isSymbolicLink()).toBe(false)
    expect(await readFile(soul, 'utf8')).toBe('Original persistent person 中文🙂')
    expect((await readFile(pending)).equals(requestBytes)).toBe(true)
    expect((await readdir(retained)).sort()).toEqual(entries)
  }
  finally {
    if (!closed)
      await db.close()
  }
})
