import { resolve } from 'node:path'

const journals = new Map<string, Promise<void>>()

// Electron owns one host runtime. Per-card readers can share a journal, and
// Windows may let overlapping rename handles both report success. Serialize
// their recovery passes without holding a SQLite transaction during file I/O.
export async function withRecoveryJournalQueue(directory: string, task: () => Promise<void>) {
  const key = resolve(directory)
  const previous = journals.get(key) ?? Promise.resolve()
  const current = previous.catch(() => {}).then(task)
  journals.set(key, current)
  try { await current }
  finally {
    if (journals.get(key) === current)
      journals.delete(key)
  }
}
