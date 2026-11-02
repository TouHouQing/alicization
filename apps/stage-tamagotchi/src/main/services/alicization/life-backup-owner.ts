import type { AlicizationDbService } from './db'

import { resolve } from 'node:path'

import { isLifeBackupSnapshotConflict } from './life-backup-conflict'
import { createLifeBackupRuntime } from './life-backup-runtime'

export interface LifeBackupOwner {
  cardId: string
  database: Pick<AlicizationDbService, 'readLifeState' | 'snapshotLifeDatabase' | 'getMetaValue'>
}

// RPC handlers construct a facade per request. Keep only the display index on
// the exact database owner; closing or switching that owner still fences calls.
const runtimes = new WeakMap<LifeBackupOwner['database'], { root: string, cardId: string, runtime: ReturnType<typeof createLifeBackupRuntime> }>()

/** Keep every asynchronous backup operation on one original life/database. */
export function createOwnedLifeBackupRuntime(options: { userDataPath: string, currentOwner: () => LifeBackupOwner | null }) {
  const initial = options.currentOwner()
  if (!initial)
    throw new Error('No active life is available for backup')
  const { cardId, database } = initial
  const assertCurrent = () => {
    const current = options.currentOwner()
    if (!current || current.cardId !== cardId || current.database !== database)
      throw new Error('Active life owner changed during backup; refresh its current view')
  }
  const readOwned = async <T>(operation: () => Promise<T>) => {
    assertCurrent()
    const value = await operation()
    assertCurrent()
    return value
  }
  const root = resolve(options.userDataPath)
  const previous = runtimes.get(database)
  if (previous && (previous.root !== root || previous.cardId !== cardId))
    throw new Error('Backup database owner cannot change its storage root')
  const runtime = previous?.runtime ?? createLifeBackupRuntime({
    userDataPath: options.userDataPath,
    cardId: () => {
      assertCurrent()
      return cardId
    },
    state: () => readOwned(async () => {
      const state = await database.readLifeState()
      if (state.cardId !== cardId)
        throw new Error('Backup database does not belong to the active life')
      return state
    }),
    snapshot: path => readOwned(() => database.snapshotLifeDatabase(path)),
    schema: () => readOwned(async () => Number(await database.getMetaValue('life.schema.version'))),
  })
  if (!previous)
    runtimes.set(database, { root, cardId, runtime })
  return {
    ...runtime,
    create: async () => {
      const retryUntil = Date.now() + 10_000
      for (let attempt = 0; ; attempt++) {
        try {
          return await readOwned(runtime.create)
        }
        catch (error) {
          assertCurrent()
          // Only a fully retired unpublished snapshot can be attempted again.
          // This bounds retry admission; it does not cancel an active VACUUM.
          if (!isLifeBackupSnapshotConflict(error) || attempt >= 2 || Date.now() >= retryUntil)
            throw error
        }
      }
    },
    inspect: () => readOwned(runtime.inspect),
    inspectPage: (request: Parameters<typeof runtime.inspectPage>[0]) => readOwned(() => runtime.inspectPage(request)),
    list: () => readOwned(runtime.list),
    requestRestore: async (id: string, hash: string) => {
      assertCurrent()
      // Once the exact request is durably accepted, retain its original
      // outcome. A later view change must not fabricate a persistence failure.
      return runtime.requestRestore(id, hash)
    },
  }
}
