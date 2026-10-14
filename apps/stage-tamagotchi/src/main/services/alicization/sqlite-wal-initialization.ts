import type { Database } from 'sqlite3'

import { setTimeout } from 'node:timers/promises'

export async function withSqliteStartupLockWait<T>(database: Database, operation: () => Promise<T>, budgetMs = 5000): Promise<T> {
  const setBusyTimeout = (milliseconds: number) => new Promise<void>((resolve, reject) => {
    database.run(`PRAGMA busy_timeout = ${milliseconds};`, [], error => error ? reject(error) : resolve())
  })
  const deadline = performance.now() + budgetMs
  // SQLite may skip its busy handler during lock upgrades. Yield between
  // attempts so the connection holding the lock can finish and release it.
  // https://www.sqlite.org/c3ref/busy_handler.html
  await setBusyTimeout(100)
  try {
    for (;;) {
      try {
        return await operation()
      }
      catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'SQLITE_BUSY' || performance.now() >= deadline)
          throw error
        await setTimeout(Math.min(25, Math.max(1, deadline - performance.now())))
      }
    }
  }
  finally {
    await setBusyTimeout(2000)
  }
}

export async function initializeSqliteWal(database: Database, budgetMs = 5000) {
  await withSqliteStartupLockWait(database, async () => {
    const mode = await new Promise<string>((resolve, reject) => {
      database.get('PRAGMA journal_mode = WAL;', [], (error, row: { journal_mode: string }) => error ? reject(error) : resolve(row?.journal_mode ?? ''))
    })
    if (mode.toLowerCase() !== 'wal')
      throw new Error(`SQLite could not enable WAL (actual mode: ${mode})`)
  }, budgetMs)
}
