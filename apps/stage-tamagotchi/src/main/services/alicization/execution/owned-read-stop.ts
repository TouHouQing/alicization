const stopped = new WeakSet<object>()

/** In-process evidence only; tool text/JSON cannot manufacture a stop receipt. */
export function markOwnedReadStopped<T>(value: T): T {
  if (value && typeof value === 'object')
    stopped.add(value)
  return value
}

export function isOwnedReadStopped(value: unknown) {
  return !!value && typeof value === 'object' && stopped.has(value)
}

/** Use only where every child operation is joined before the promise settles. */
export async function completeOwnedRead<T>(task: () => Promise<T>) {
  try {
    return markOwnedReadStopped(await task())
  }
  catch (error) { throw markOwnedReadStopped(error && typeof error === 'object' ? error : new Error(String(error))) }
}
