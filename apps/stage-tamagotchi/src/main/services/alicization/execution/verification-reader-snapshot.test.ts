import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'

import sqlite3 from 'sqlite3'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionVerificationConfiguration } from './verification-configuration'
import { executionVerificationRegistryKey } from './verification-recipes'

it('reads applied and revoked rules after an older concurrent life snapshot finishes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-verifier-snapshot-'))
  let hold = false
  let release = () => {}
  let pinned = () => {}
  let barrier = Promise.resolve()
  const driver = {
    ...sqlite3,
    Database: function ObservedDatabase(path: string, mode: number, callback: (error: Error | null) => void) {
      const database = new sqlite3.Database(path, mode, callback)
      const original = database.get.bind(database)
      if (mode === sqlite3.OPEN_READONLY) {
        database.get = ((...args: unknown[]) => {
          const callback = args.at(-1) as (...args: unknown[]) => void
          const shouldHold = hold && String(args[0]).includes('MAX(revision)')
          if (shouldHold)
            hold = false
          args[args.length - 1] = (...values: unknown[]) => {
            if (shouldHold) {
              pinned()
              void barrier.then(() => callback(...values))
            }
            else {
              callback(...values)
            }
          }
          return Reflect.apply(original, database, args)
        }) as typeof database.get
      }
      return database
    } as unknown as typeof sqlite3.Database,
  }
  const db = await setupAlicizationDb(root, { cardId: 'alice', sqliteDriver: driver })
  try {
    const control = createExecutionVerificationConfiguration({ cardId: () => 'alice', readSetting: db.getMetaValue, commit: db.commitLifeState })
    for (const quality of [[{ id: 'report', version: '1', checks: [{ kind: 'includes', values: ['Conclusion'] }] }], []]) {
      const preview = await control({ cardId: 'alice', action: 'preview', registry: JSON.stringify({ version: 1, quality, external: [] }) }, 42)
      barrier = new Promise<void>((resolve) => {
        release = resolve
      })
      const snapshotPinned = new Promise<void>((resolve) => {
        pinned = resolve
      })
      hold = true
      const oldSnapshot = db.readLifeState()
      await snapshotPinned
      const committed = new Promise<void>((resolve) => {
        const unsubscribe = db.onLifeCommitted(() => {
          unsubscribe()
          resolve()
        })
      })
      const applying = control({ cardId: 'alice', action: 'apply', token: preview.preview!.token }, 42)
      await committed
      // The real reader remains inside BEGIN DEFERRED across the actual writer
      // commit. A post-save metadata SELECT must not join this older snapshot.
      const releasing = setTimeout(100).then(release)
      expect((await applying).items.map(item => item.id)).toEqual(quality.map(item => item.id))
      await releasing
      await oldSnapshot
      expect(JSON.parse((await db.getMetaValue(executionVerificationRegistryKey))!).quality).toEqual(quality)
    }
  }
  finally {
    release()
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})
