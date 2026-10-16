import { debounce } from 'es-toolkit'

/** A tray notification must never revive native work after its owner closes. */
export function createTrayMenuRebuild(options: { isAvailable: () => boolean, rebuild: () => void }) {
  let disposed = false
  const available = () => !disposed && options.isAvailable()
  const pending = debounce(() => {
    if (available())
      options.rebuild()
  }, 50)

  return {
    request() {
      if (available())
        pending()
    },
    dispose() {
      disposed = true
      pending.cancel()
    },
  }
}
