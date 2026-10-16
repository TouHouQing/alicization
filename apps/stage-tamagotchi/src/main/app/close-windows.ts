import { setImmediate } from 'node:timers/promises'

interface ClosingWindow {
  isDestroyed: () => boolean
  destroy: () => void
}

/** Call only after life, window state and asynchronous file logs are durable. */
export async function closeDesktopWindows(windows: readonly ClosingWindow[]) {
  const failures: unknown[] = []
  for (const window of windows) {
    try {
      if (!window.isDestroyed())
        window.destroy()
    }
    catch (error) {
      failures.push(error)
    }
  }

  // Let closed handlers and native teardown callbacks run before final quit.
  await setImmediate()
  if (failures.length)
    throw new AggregateError(failures, 'Failed to close desktop windows')
}
