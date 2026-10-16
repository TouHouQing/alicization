import { debounce, throttle } from 'es-toolkit'

interface CaptionFollowSchedulerOptions {
  isAvailable: () => boolean
  move: () => void
  settle: () => void
  stop: () => void
}

/** Own delayed following work so a closed window cannot receive late updates. */
export function createCaptionFollowScheduler(options: CaptionFollowSchedulerOptions) {
  let disposed = false
  const available = () => !disposed && options.isAvailable()
  const move = throttle(() => {
    if (available())
      options.move()
  }, 1000 / 60)
  const settle = debounce(() => {
    if (available())
      options.settle()
  }, 200)

  return {
    request() {
      if (!available())
        return
      move()
      settle()
    },
    dispose() {
      if (disposed)
        return
      disposed = true
      move.cancel()
      settle.cancel()
      options.stop()
    },
  }
}
