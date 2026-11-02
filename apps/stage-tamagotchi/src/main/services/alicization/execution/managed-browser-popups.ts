import type { BrowserWindow, WebContents, WindowOpenHandlerResponse } from 'electron'

import { randomUUID } from 'node:crypto'

interface Surface { id: string, window: BrowserWindow, contents: WebContents, parent: Surface | null, actionId: string | null }
interface Admission { parent: Surface, href: string, actionId: string, signal?: AbortSignal, expiresAt: number, armed: boolean, consumed: boolean }

function link(value: string) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Managed popups require an HTTP link without URL credentials')
  return url.href
}

/** One reviewed click owns at most one child. Web pages never choose ownership. */
export function createManagedBrowserPopups(options: {
  root: BrowserWindow
  current: () => boolean
  created: (window: BrowserWindow) => void
  closed: (window: BrowserWindow, contents: WebContents) => void
  now?: () => number
}) {
  const surfaces = new Map<WebContents, Surface>()
  let root: Surface
  let selected: Surface
  let admission: Admission | null = null
  let closed = false
  const now = options.now ?? Date.now
  const valid = (entry: Admission) => !closed && !entry.signal?.aborted && entry.expiresAt > now()
    && options.current() && !options.root.isDestroyed() && !entry.parent.window.isDestroyed()

  function attach(window: BrowserWindow, parent: Surface | null, actionId: string | null) {
    const surface = { id: `surface:${randomUUID()}`, window, contents: window.webContents, parent, actionId }
    surfaces.set(surface.contents, surface)
    window.webContents.setWindowOpenHandler((details): WindowOpenHandlerResponse => {
      const entry = admission
      let href: string
      try {
        href = link(details.url)
      }
      catch { return { action: 'deny' } }
      if (!entry || entry.parent !== surface || !entry.armed || entry.consumed || !valid(entry)
        || entry.href !== href || details.postBody != null || surfaces.size >= 8) {
        return { action: 'deny' }
      }
      let depth = 0
      for (let ancestor: Surface | null = surface; ancestor; ancestor = ancestor.parent) depth++
      if (depth >= 4)
        return { action: 'deny' }
      entry.consumed = true
      const bounds = window.getContentBounds()
      return {
        action: 'allow',
        outlivesOpener: false,
        overrideBrowserWindowOptions: {
          parent: window,
          show: false,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          alwaysOnTop: false,
          focusable: window.isFocusable(),
          fullscreen: false,
          kiosk: false,
          skipTaskbar: true,
          webPreferences: { session: options.root.webContents.session, sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false, webSecurity: true, webviewTag: false, allowRunningInsecureContent: false, preload: undefined },
        },
      }
    })
    window.webContents.on('did-create-window', (child, details) => {
      const entry = admission
      let matches = false
      try {
        matches = Boolean(entry && entry.parent === surface && entry.consumed && valid(entry) && link(details.url) === entry.href)
      }
      catch { /* An unbound child never becomes a selected surface. */ }
      if (!matches || !entry || child.getParentWindow() !== window || child.webContents.session !== options.root.webContents.session) {
        admission = null
        child.destroy()
        return
      }
      // Consume before running composition callbacks; no reentrant adoption.
      admission = null
      selected = attach(child, surface, entry.actionId)
      options.created(child)
    })
    window.on('closed', () => {
      if (admission?.parent === surface)
        admission = null
      // The native window no longer exposes its WebContents after destruction.
      surfaces.delete(surface.contents)
      for (const item of [...surfaces.values()]) {
        if (item.parent === surface && !item.window.isDestroyed())
          item.window.destroy()
      }
      if (selected === surface)
        selected = surface.parent && !surface.parent.window.isDestroyed() ? surface.parent : root
      options.closed(window, surface.contents)
    })
    return surface
  }
  root = attach(options.root, null, null)
  selected = root

  return {
    begin(input: { window: BrowserWindow, url: string, actionId: string, signal?: AbortSignal, expiresAt: number }) {
      const parent = surfaces.get(input.window.webContents)
      if (closed || admission || !parent || !options.current() || input.signal?.aborted)
        throw new Error('Managed popup admission is unavailable')
      const entry: Admission = { parent, href: link(input.url), actionId: input.actionId, signal: input.signal, expiresAt: Math.min(input.expiresAt, now() + 15000), armed: false, consumed: false }
      admission = entry
      return {
        arm() {
          if (admission !== entry || !valid(entry))
            throw new Error('Managed popup admission changed')
          entry.armed = true
        },
        end() {
          if (admission === entry)
            admission = null
        },
      }
    },
    selected: () => selected.window,
    ownsDownload(contents: WebContents, opener: WebContents, actionId: string) {
      const surface = surfaces.get(contents)
      if (closed || !surface || !options.current() || options.root.isDestroyed() || surface.window.isDestroyed())
        return false
      return contents === opener || (surface.actionId === actionId && surface.parent?.contents === opener)
    },
    snapshot: () => [...surfaces.values()].map(surface => ({ id: surface.id, parentId: surface.parent?.id ?? null, selected: surface === selected })),
    close() {
      closed = true
      admission = null
      for (const surface of [...surfaces.values()].reverse()) {
        if (!surface.window.isDestroyed())
          surface.window.destroy()
      }
      surfaces.clear()
    },
  }
}
