import { useElectronEventaContext } from '@proj-alicization/electron-vueuse'
import { onScopeDispose } from 'vue'

import { electronLifeExecutionChanged } from '../../../../shared/life-events'

/** Coalesce committed progress without replacing unsaved settings drafts. */
export function useExecutionViewUpdates(options: {
  cardId: () => string
  revision: () => number
  refresh: () => Promise<void>
}) {
  const context = useElectronEventaContext().value
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let disposed = false
  let requested: { cardId: string, revision: number } | null = null
  function schedule() {
    if (disposed || running || timer || document.visibilityState === 'hidden')
      return
    timer = setTimeout(async () => {
      timer = undefined
      if (!requested || requested.cardId !== options.cardId() || requested.revision <= options.revision())
        return
      running = true
      const before = requested
      try {
        await options.refresh()
      }
      finally {
        running = false
        // Only a newer commit retries a failed read; there is no polling loop.
        if (requested !== before)
          schedule()
      }
    }, 150)
  }
  const changed = (event: { body?: { cardId: string, revision: number } }) => {
    const payload = event.body
    if (!payload || payload.cardId !== options.cardId() || payload.revision <= options.revision())
      return
    if (!requested || requested.cardId !== payload.cardId || requested.revision < payload.revision)
      requested = payload
    schedule()
  }
  context.on(electronLifeExecutionChanged, changed)
  document.addEventListener('visibilitychange', schedule)
  onScopeDispose(() => {
    disposed = true
    clearTimeout(timer)
    context.off(electronLifeExecutionChanged, changed)
    document.removeEventListener('visibilitychange', schedule)
  })
}
