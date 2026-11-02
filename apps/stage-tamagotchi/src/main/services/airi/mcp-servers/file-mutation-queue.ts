// Adapted from Pi (MIT, Copyright (c) 2025 Mario Zechner).
// See resources/licenses/pi-file-tools-license.txt and its notice for provenance.
import { executionFileResources } from '../../alicization/execution/resource-broker'

const queues = new Map<string, Promise<void>>()
let registrationQueue = Promise.resolve()

export async function withFileMutationQueue<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const registration = registrationQueue.then(async () => {
    const keys = await executionFileResources(path)
    const previous = Promise.all(keys.map(key => queues.get(key) ?? Promise.resolve()))
    let release!: () => void
    const pending = new Promise<void>((resolveQueue) => {
      release = resolveQueue
    })
    const chained = previous.then(() => pending)
    for (const key of keys)
      queues.set(key, chained)
    return { keys, previous, chained, release }
  })
  registrationQueue = registration.then(() => undefined, () => undefined)
  const entry = await registration
  await entry.previous
  try {
    return await operation()
  }
  finally {
    entry.release()
    for (const key of entry.keys) {
      if (queues.get(key) === entry.chained)
        queues.delete(key)
    }
  }
}
