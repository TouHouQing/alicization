import type { AuthorizedBrowserTarget } from './authorized-browser-endpoint'
import type { BrowserDebuggerPort } from './browser-cdp'

import { EventEmitter } from 'node:events'

interface PendingCommand { resolve: (value: unknown) => void, reject: (error: Error) => void, timer: ReturnType<typeof setTimeout>, cleanup: boolean }
interface OwnedInput { method: string, params: Record<string, unknown>, sessionId?: string }

/** A page socket cannot enumerate or switch to other browser tabs. */
export async function connectAuthorizedBrowser(target: AuthorizedBrowserTarget, origins: string[], onRevoke: (reason: string) => void, onDocumentChanged?: () => void) {
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  const events = new EventEmitter()
  const pending = new Map<number, PendingCommand>()
  const owned = new Map<string, OwnedInput>()
  const releasing = new Map<string, Promise<unknown>>()
  const childSessions = new Set<string>()
  let sequence = 0
  let attached = false
  let stopped = false
  let armed = false
  let documentEpoch = 0
  let rootFrameId: string | null = null
  let revokedReason: string | null = null
  let stopPromise: Promise<{ released: boolean }> | null = null
  const allowedOrigins = new Set(origins)
  const permittedUrl = (value: unknown) => {
    try { return typeof value === 'string' && /^https?:/u.test(value) && allowedOrigins.has(new URL(value).origin) }
    catch { return false }
  }
  const failure = (reason: string) => new Error(reason)

  function assertCurrent(expectedEpoch?: number) {
    if (stopped || socket.readyState !== WebSocket.OPEN)
      throw failure(revokedReason ?? 'AUTHORIZED_BROWSER_DISCONNECTED')
    if (expectedEpoch !== undefined && expectedEpoch !== documentEpoch)
      throw failure('AUTHORIZED_BROWSER_DOCUMENT_CHANGED')
  }
  function sendRaw(method: string, params: Record<string, unknown> = {}, sessionId?: string, cleanup = false): Promise<unknown> {
    if (!cleanup)
      assertCurrent()
    if (socket.readyState !== WebSocket.OPEN || pending.size >= 64 || sessionId && !childSessions.has(sessionId))
      return Promise.reject(failure('AUTHORIZED_BROWSER_TRANSPORT_UNAVAILABLE'))
    const id = ++sequence
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(failure('AUTHORIZED_BROWSER_COMMAND_TIMEOUT'))
        if (!cleanup)
          revoke('AUTHORIZED_BROWSER_COMMAND_TIMEOUT')
      }, cleanup ? 1500 : 5000)
      timer.unref?.()
      pending.set(id, { resolve, reject, timer, cleanup })
      try { socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })) }
      catch (error) {
        clearTimeout(timer)
        pending.delete(id)
        reject(error)
        revoke('AUTHORIZED_BROWSER_DISCONNECTED')
      }
    })
  }
  const inputKey = (method: string, params: Record<string, unknown>, sessionId?: string) => `${sessionId ?? 'page'}:${method}:${method === 'Input.dispatchKeyEvent' ? params.windowsVirtualKeyCode : params.button}`
  function release(key: string) {
    const previous = releasing.get(key)
    if (previous)
      return previous
    const input = owned.get(key)
    if (!input)
      return Promise.resolve({})
    const promise = sendRaw(input.method, input.params, input.sessionId, true).then((result) => { owned.delete(key); return result }).finally(() => releasing.delete(key))
    releasing.set(key, promise)
    return promise
  }
  async function sendCommand(method: string, params: Record<string, unknown> = {}, sessionId?: string) {
    const input = method === 'Input.dispatchKeyEvent' || method === 'Input.dispatchMouseEvent'
    const up = input && (params.type === 'keyUp' || params.type === 'mouseReleased')
    if (up)
      return release(inputKey(method, params, sessionId))
    const cleanup = method === 'Runtime.releaseObject'
    if (!cleanup)
      assertCurrent()
    if (input && (params.type === 'keyDown' || params.type === 'mousePressed')) {
      if (owned.size >= 8)
        throw failure('AUTHORIZED_BROWSER_OWNED_INPUT_BUDGET')
      const key = inputKey(method, params, sessionId)
      if (owned.has(key))
        throw failure('AUTHORIZED_BROWSER_INPUT_ALREADY_OWNED')
      owned.set(key, { method, params: { ...params, type: params.type === 'keyDown' ? 'keyUp' : 'mouseReleased', ...(method === 'Input.dispatchMouseEvent' ? { buttons: 0 } : {}) }, sessionId })
    }
    return sendRaw(method, params, sessionId, cleanup)
  }
  function revoke(reason: string) {
    if (stopped)
      return
    stopped = true
    revokedReason = reason
    for (const [id, command] of pending) {
      if (!command.cleanup) {
        clearTimeout(command.timer)
        command.reject(failure(reason))
        pending.delete(id)
      }
    }
    // Invalidating the grant stops ordinary commands immediately. Keep the
    // socket alive only long enough to acknowledge release of our own inputs.
    stopPromise = Promise.allSettled([...owned.keys()].reverse().map(release)).then(() => {
      if (socket.readyState !== WebSocket.CLOSED)
        socket.close()
      return { released: owned.size === 0 }
    })
    try { onRevoke(reason) }
    catch { /* Observers cannot restore or prevent transport revocation. */ }
  }
  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string' || event.data.length > 2_000_000) {
      revoke('AUTHORIZED_BROWSER_PROTOCOL_BUDGET')
      return
    }
    let message: { id?: number, result?: unknown, error?: { code?: number }, method?: string, params?: Record<string, unknown>, sessionId?: string }
    try {
      const parsed: unknown = JSON.parse(event.data)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw failure('AUTHORIZED_BROWSER_PROTOCOL_INVALID')
      message = parsed
    }
    catch { revoke('AUTHORIZED_BROWSER_PROTOCOL_INVALID'); return }
    if (message.id !== undefined) {
      const command = pending.get(message.id)
      if (command) {
        clearTimeout(command.timer)
        pending.delete(message.id)
        if (message.error)
          command.reject(failure(`AUTHORIZED_BROWSER_PROTOCOL_ERROR:${message.error.code ?? 'unknown'}`))
        else
          command.resolve(message.result)
      }
      return
    }
    if (message.method === 'Target.attachedToTarget') {
      const info = message.params?.targetInfo as { type?: string } | undefined
      if (typeof message.params?.sessionId !== 'string' || info?.type !== 'iframe') {
        revoke('AUTHORIZED_BROWSER_UNEXPECTED_CHILD_TARGET')
        return
      }
      childSessions.add(message.params.sessionId)
    }
    if (message.method === 'Target.detachedFromTarget' && typeof message.params?.sessionId === 'string')
      childSessions.delete(message.params.sessionId)
    if (armed && ['Page.frameNavigated', 'Page.navigatedWithinDocument', 'Page.frameDetached'].includes(message.method ?? '')) {
      documentEpoch++
      const frame = message.params?.frame as { id?: string, url?: string, securityOrigin?: string } | undefined
      const root = !message.sessionId && (frame?.id === rootFrameId || message.params?.frameId === rootFrameId)
      if (root && message.method === 'Page.frameDetached')
        revoke('AUTHORIZED_BROWSER_DOCUMENT_CHANGED')
      else if (root && message.method === 'Page.frameNavigated' && (!frame?.securityOrigin || !allowedOrigins.has(frame.securityOrigin) || !/^https?:/u.test(frame.url ?? '')))
        revoke('AUTHORIZED_BROWSER_ORIGIN_NOT_GRANTED')
      else if (root && message.method === 'Page.navigatedWithinDocument' && !permittedUrl(message.params?.url))
        revoke('AUTHORIZED_BROWSER_ORIGIN_NOT_GRANTED')
      try { onDocumentChanged?.() }
      catch { /* Document fencing never depends on an observer. */ }
    }
    if (armed && message.method === 'Inspector.detached')
      revoke('AUTHORIZED_BROWSER_DISCONNECTED')
    if (message.method)
      events.emit('message', {}, message.method, message.params ?? {}, message.sessionId)
  })
  const disconnected = () => {
    revoke('AUTHORIZED_BROWSER_DISCONNECTED')
    for (const command of pending.values()) { clearTimeout(command.timer); command.reject(failure('AUTHORIZED_BROWSER_DISCONNECTED')) }
    pending.clear()
    events.emit('detach', {}, 'connection-closed')
  }
  socket.addEventListener('close', disconnected)
  socket.addEventListener('error', disconnected)
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { socket.close(); reject(failure('AUTHORIZED_BROWSER_CONNECT_TIMEOUT')) }, 4000)
      const opened = () => { clearTimeout(timer); socket.removeEventListener('error', failed); resolve() }
      const failed = () => { clearTimeout(timer); socket.removeEventListener('open', opened); reject(failure('AUTHORIZED_BROWSER_CONNECT_FAILED')) }
      socket.addEventListener('open', opened, { once: true })
      socket.addEventListener('error', failed, { once: true })
    })
    await sendCommand('Page.enable')
    const { frameTree } = await sendCommand('Page.getFrameTree') as { frameTree: { frame: { id: string, url: string, securityOrigin: string } } }
    if (frameTree.frame.url !== target.url || !allowedOrigins.has(frameTree.frame.securityOrigin))
      throw failure('AUTHORIZED_BROWSER_SELECTED_DOCUMENT_CHANGED')
    rootFrameId = frameTree.frame.id
    armed = true
  }
  catch (error) {
    revoke('AUTHORIZED_BROWSER_CONNECT_FAILED')
    await stopPromise
    throw error
  }
  const debuggerPort = Object.assign(events, {
    attach: () => {
      assertCurrent(); if (attached)
        throw failure('AUTHORIZED_BROWSER_DEBUGGER_ALREADY_OWNED'); attached = true
    },
    detach: () => { attached = false; revoke('AUTHORIZED_BROWSER_DETACHED') },
    isAttached: () => attached,
    sendCommand,
  }) satisfies BrowserDebuggerPort
  return {
    debuggerPort,
    assertCurrent,
    documentEpoch: () => documentEpoch,
    allowFrame: (frame: { securityOrigin?: string }) => Boolean(frame.securityOrigin && allowedOrigins.has(frame.securityOrigin)),
    stop: async (reason = 'AUTHORIZED_BROWSER_REVOKED') => { revoke(reason); return await stopPromise ?? { released: owned.size === 0 } },
    ownedInputCount: () => owned.size,
  }
}
