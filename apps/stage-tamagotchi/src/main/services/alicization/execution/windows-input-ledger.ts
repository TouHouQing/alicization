/**
 * Algorithm adapted from Windows-MCP's owned-input ledger. See the attribution
 * record: ownership is recorded before down; failed releases remain retryable.
 */
export function createWindowsInputLedger(driver: {
  down: (key: number) => Promise<void>
  up: (key: number) => Promise<void>
  isPhysicallyDown: (key: number) => Promise<boolean>
  assertTarget: () => Promise<void>
}) {
  const owned = new Set<number>()
  let stopped = false
  let tail: Promise<unknown> = Promise.resolve()
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const next = tail.then(task, task)
    tail = next.catch(() => {})
    return next
  }
  async function release() {
    for (const key of [...owned].reverse()) {
      try {
        // A physical down after injection transfers ownership to the user.
        // Sending up here would release a key the user is still holding.
        if (await driver.isPhysicallyDown(key)) {
          owned.delete(key)
          continue
        }
        await driver.up(key)
        owned.delete(key)
      }
      catch { /* Keep ownership until a release actually succeeds. */ }
    }
    return owned.size === 0
  }
  return {
    chord: (keys: number[], signal?: AbortSignal) => serialize(async () => {
      if (stopped || keys.length < 1 || keys.length > 8 || new Set(keys).size !== keys.length || keys.some(key => !Number.isInteger(key) || key < 1 || key > 254))
        throw new Error('Owned keyboard input is stopped or outside its budget')
      try {
        for (const key of keys) {
          signal?.throwIfAborted()
          await driver.assertTarget()
          const physicallyDown = await driver.isPhysicallyDown(key)
          signal?.throwIfAborted()
          if (stopped || physicallyDown)
            throw new Error('User input owns a requested key')
          owned.add(key)
          await driver.down(key)
        }
      }
      finally {
        if (!await release())
          stopped = true
      }
      if (stopped)
        throw new Error('Keyboard release requires reconciliation')
    }),
    takeOver: () => { stopped = true; return serialize(release) },
    ownedKeys: () => [...owned],
  }
}
