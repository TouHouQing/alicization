// Adapted from Pi (MIT, Copyright (c) 2025 Mario Zechner).
// See resources/licenses/pi-file-tools-license.txt and its notice for provenance.
import { realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
import { platform } from 'node:process'

const queues = new Map<string, Promise<void>>()
let registrationQueue = Promise.resolve()

export async function withFileMutationQueue<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const registration = registrationQueue.then(async () => {
    let key = resolve(path)
    try {
      key = await realpath(key)
    }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || !['ENOENT', 'ENOTDIR'].includes(String(error.code)))
        throw error
    }
    if (platform === 'win32')
      key = key.toLowerCase()
    const previous = queues.get(key) ?? Promise.resolve()
    let release!: () => void
    const pending = new Promise<void>((resolveQueue) => {
      release = resolveQueue
    })
    const chained = previous.then(() => pending)
    queues.set(key, chained)
    return { key, previous, chained, release }
  })
  registrationQueue = registration.then(() => undefined, () => undefined)
  const entry = await registration
  await entry.previous
  try {
    return await operation()
  }
  finally {
    entry.release()
    if (queues.get(entry.key) === entry.chained)
      queues.delete(entry.key)
  }
}
