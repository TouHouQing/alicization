/** Startup owns native resources until its factories and hooks have settled. */
export function createAppStartupBarrier() {
  let stopping = false
  let started = false
  let startup: Promise<void> = Promise.resolve()
  const isStopping = () => stopping
  return {
    isStopping,
    start: (initialize: (isStopping: () => boolean) => Promise<void>) => {
      if (started)
        throw new Error('Application startup already has an owner')
      started = true
      startup = Promise.resolve().then(async () => {
        if (!stopping)
          await initialize(isStopping)
      })
      return startup
    },
    stop: () => {
      stopping = true
      return startup
    },
  }
}
