import type { InvokeEventa } from '@moeru/eventa'

import { defineInvoke } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/renderer'
import { ref } from 'vue'

type EventaContext = ReturnType<typeof createContext>['context']
type IpcRendererLike = Parameters<typeof createContext>[0]

let sharedContext: EventaContext | undefined

function isElectronVueuseDev() {
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV)
}

function resolveIpcRenderer(ipcRenderer?: IpcRendererLike): IpcRendererLike {
  if (ipcRenderer) {
    return ipcRenderer
  }

  const globalIpcRenderer = (globalThis as { window?: { electron?: { ipcRenderer?: IpcRendererLike } } }).window?.electron?.ipcRenderer
  if (!globalIpcRenderer) {
    throw new Error('Electron ipcRenderer is not available. Pass it explicitly to useElectronEventaContext().')
  }

  return globalIpcRenderer
}

export function getElectronEventaContext(ipcRenderer?: IpcRendererLike): EventaContext {
  if (!sharedContext) {
    sharedContext = createContext(resolveIpcRenderer(ipcRenderer)).context

    if (isElectronVueuseDev()) {
      const originalEmit = sharedContext.emit.bind(sharedContext)
      sharedContext.emit = ((event, ...args) => {
        const eventId = typeof event === 'object' && event && 'id' in event
          ? String((event as { id?: unknown }).id ?? 'unknown')
          : 'unknown'

        try {
          const result = originalEmit(event, ...args)
          if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
            return (result as Promise<unknown>).catch((error) => {
              console.warn(`[electron-vueuse] context.emit failed: ${eventId}`, error)
              throw error
            })
          }
          return result
        }
        catch (error) {
          console.warn(`[electron-vueuse] context.emit threw: ${eventId}`, error)
          throw error
        }
      }) as typeof sharedContext.emit
    }
  }
  return sharedContext
}

export function useElectronEventaContext(ipcRenderer?: IpcRendererLike) {
  return ref(getElectronEventaContext(ipcRenderer))
}

export function useElectronEventaInvoke<Res, Req = undefined, ResErr = Error, ReqErr = Error>(invoke: InvokeEventa<Res, Req, ResErr, ReqErr>, context?: EventaContext) {
  const handler = defineInvoke(context ?? getElectronEventaContext(), invoke)
  const invokeId = typeof invoke === 'object' && invoke && 'id' in invoke
    ? String((invoke as { id?: unknown }).id ?? 'unknown')
    : 'unknown'

  return (async (payload: Req) => {
    try {
      return await handler(payload)
    }
    catch (error) {
      if (isElectronVueuseDev())
        console.warn(`[electron-vueuse] invoke failed: ${invokeId}`, error)
      throw error
    }
  }) as typeof handler
}

export function resetElectronEventaContextForTesting() {
  sharedContext = undefined
}
