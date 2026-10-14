import type { Eventa } from '@moeru/eventa'
import type { createContext } from '@moeru/eventa/adapters/electron/main'
import type { BrowserWindow } from 'electron'

/** Main-process spontaneous events need a window route, not an invoke sender. */
export function createLifePresenceTransport(createRoute: (window: BrowserWindow) => ReturnType<typeof createContext>) {
  const routes = new Map<number, { window: BrowserWindow, transport: ReturnType<typeof createContext>, acceptedEvents?: ReadonlySet<unknown> }>()
  function remove(id: number) {
    routes.get(id)?.transport.dispose()
    routes.delete(id)
  }
  return {
    attach(window: BrowserWindow, acceptedEvents?: ReadonlySet<unknown>) {
      if (window.isDestroyed() || routes.has(window.id))
        return
      routes.set(window.id, { window, transport: createRoute(window), acceptedEvents })
      window.once('closed', () => remove(window.id))
    },
    emit<T>(event: Eventa<T>, payload: T) {
      for (const [id, route] of routes) {
        if (route.window.isDestroyed()) {
          remove(id)
          continue
        }
        if (!route.acceptedEvents || route.acceptedEvents.has(event))
          route.transport.context.emit(event, payload)
      }
    },
    dispose() {
      for (const id of routes.keys()) remove(id)
    },
  }
}
