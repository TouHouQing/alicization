import type { BrowserWindow, HandlerDetails, WindowOpenHandlerResponse } from 'electron'

import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { createManagedBrowserPopups } from './managed-browser-popups'

class WindowFixture extends EventEmitter {
  destroyed = false
  handler!: (details: HandlerDetails) => WindowOpenHandlerResponse
  webContents = Object.assign(new EventEmitter(), {
    session: {} as object,
    setWindowOpenHandler: (handler: typeof this.handler) => { this.handler = handler },
  })

  constructor(readonly session: object, readonly parent: WindowFixture | null = null) {
    super()
    this.webContents.session = session
  }

  asWindow() { return this as unknown as BrowserWindow }
  isDestroyed() { return this.destroyed }
  isFocusable() { return false }
  getParentWindow() { return this.parent?.asWindow() ?? null }
  getContentBounds() { return { x: 2400, y: 100, width: 1000, height: 700 } }
  destroy() {
    if (!this.destroyed) {
      this.destroyed = true
      this.emit('closed')
    }
  }

  request(url: string, postBody?: object) { return this.handler({ url, postBody } as HandlerDetails) }
  open(url: string) {
    const result = this.request(url)
    if (result.action !== 'allow')
      return { result, child: null }
    const child = new WindowFixture(this.session, this)
    this.webContents.emit('did-create-window', child.asWindow(), { url })
    return { result, child }
  }
}

function fixture() {
  const root = new WindowFixture({})
  let current = true
  let now = 1000
  const created = vi.fn()
  const closed = vi.fn()
  const group = createManagedBrowserPopups({ root: root.asWindow(), current: () => current, created, closed, now: () => now })
  const begin = (window = root, actionId = 'original-click', signal?: AbortSignal) => group.begin({ window: window.asWindow(), url: 'https://owned.example/note?value=1', actionId, signal, expiresAt: now + 10000 })
  return {
    root,
    group,
    begin,
    created,
    closed,
    revoke: () => { current = false },
    expire: () => { now += 10001 },
  }
}

describe('owned managed browser popup lifecycle', () => {
  it('admits one exact link only at click dispatch, inherits the owned session and denies replay', () => {
    const f = fixture()
    const entry = f.begin()
    expect(f.root.request('https://owned.example/note?value=1').action).toBe('deny')
    entry.arm()
    expect(f.root.request('https://owned.example/note?value=2').action).toBe('deny')
    const opened = f.root.open('https://owned.example/note?value=1')
    expect(opened.result).toMatchObject({ action: 'allow', outlivesOpener: false, overrideBrowserWindowOptions: {
      parent: f.root.asWindow(),
      show: false,
      alwaysOnTop: false,
      x: 2400,
      webPreferences: { session: f.root.session, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true },
    } })
    expect(f.group.selected()).toBe(opened.child!.asWindow())
    expect(f.created).toHaveBeenCalledOnce()
    expect(f.group.snapshot()).toHaveLength(2)
    expect(f.root.request('https://owned.example/note?value=1').action).toBe('deny')
    entry.end()
  })

  it.each(['', '#reviewed-route'])('does not transfer a reviewed navigation to a different client-side route: %s', (fragment) => {
    const f = fixture()
    const url = `https://owned.example/note?value=1${fragment}`
    f.group.begin({ window: f.root.asWindow(), url, actionId: 'exact-route', expiresAt: 2000 }).arm()
    expect(f.root.request('https://owned.example/note?value=1#unreviewed-route').action).toBe('deny')
    expect(f.root.open(url).result.action).toBe('allow')
  })

  it.each(['end', 'abort', 'owner', 'expiry'] as const)('refuses delayed window creation after %s', (reason) => {
    const f = fixture()
    const controller = new AbortController()
    const entry = f.begin(f.root, 'original-click', controller.signal)
    entry.arm()
    if (reason === 'end')
      entry.end()
    if (reason === 'abort')
      controller.abort()
    if (reason === 'owner')
      f.revoke()
    if (reason === 'expiry')
      f.expire()
    expect(f.root.request('https://owned.example/note?value=1').action).toBe('deny')
    expect(f.group.snapshot()).toHaveLength(1)
  })

  it('rejects unreviewed POST data, special URLs and URL credentials without consuming the valid link', () => {
    const f = fixture()
    f.begin().arm()
    for (const value of ['file:///C:/Windows/win.ini', 'javascript:alert(1)', 'https://user:secret@owned.example/note?value=1'])
      expect(f.root.request(value).action).toBe('deny')
    expect(f.root.request('https://owned.example/note?value=1', { data: ['unreviewed'] }).action).toBe('deny')
    expect(f.root.open('https://owned.example/note?value=1').result.action).toBe('allow')
  })

  it('destroys foreign or late child windows before adopting any surface', () => {
    const f = fixture()
    f.begin().arm()
    expect(f.root.request('https://owned.example/note?value=1').action).toBe('allow')
    const foreign = new WindowFixture({}, f.root)
    f.root.webContents.emit('did-create-window', foreign.asWindow(), { url: 'https://owned.example/note?value=1' })
    expect(foreign.destroyed).toBe(true)
    expect(f.group.selected()).toBe(f.root.asWindow())
    expect(f.created).not.toHaveBeenCalled()
    f.group.close()
  })

  it('binds popup downloads to the original click and actual parent and retires ownership on close', () => {
    const f = fixture()
    f.begin().arm()
    const child = f.root.open('https://owned.example/note?value=1').child!
    expect(f.group.ownsDownload(child.webContents as never, f.root.webContents as never, 'original-click')).toBe(true)
    expect(f.group.ownsDownload(child.webContents as never, f.root.webContents as never, 'another-click')).toBe(false)
    expect(f.group.ownsDownload(new WindowFixture(f.root.session).webContents as never, f.root.webContents as never, 'original-click')).toBe(false)
    child.destroy()
    expect(f.group.ownsDownload(child.webContents as never, f.root.webContents as never, 'original-click')).toBe(false)
    expect(f.group.selected()).toBe(f.root.asWindow())
    expect(f.closed).toHaveBeenCalledWith(child.asWindow(), child.webContents)
  })

  it('requires the actual opener and closes descendants without closing another group', () => {
    const f = fixture()
    f.begin().arm()
    const child = f.root.open('https://owned.example/note?value=1').child!
    f.begin(child, 'nested-click').arm()
    expect(f.root.request('https://owned.example/note?value=1').action).toBe('deny')
    const grandchild = child.open('https://owned.example/note?value=1').child!
    const foreign = new WindowFixture({})
    f.root.destroy()
    expect(child.destroyed).toBe(true)
    expect(grandchild.destroyed).toBe(true)
    expect(foreign.destroyed).toBe(false)
    expect(f.group.snapshot()).toEqual([])
    expect(f.group.ownsDownload(child.webContents as never, f.root.webContents as never, 'original-click')).toBe(false)
  })

  it('bounds live windows and nesting without expanding a reviewed click', () => {
    const f = fixture()
    let parent = f.root
    for (let index = 0; index < 3; index++) {
      f.begin(parent, `depth-${index}`).arm()
      parent = parent.open('https://owned.example/note?value=1').child!
    }
    const entry = f.begin(parent)
    entry.arm()
    expect(parent.request('https://owned.example/note?value=1').action).toBe('deny')
    entry.end()
    for (let index = 0; index < 4; index++) {
      f.begin(f.root, `sibling-${index}`).arm()
      expect(f.root.open('https://owned.example/note?value=1').child).not.toBeNull()
    }
    f.begin().arm()
    expect(f.root.request('https://owned.example/note?value=1').action).toBe('deny')
    expect(f.group.snapshot()).toHaveLength(8)
    f.group.close()
    expect(f.group.snapshot()).toEqual([])
  })
})
