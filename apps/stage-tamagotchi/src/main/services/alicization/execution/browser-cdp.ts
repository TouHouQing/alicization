import type { Debugger } from 'electron'

import { toNamespacedPath } from 'node:path'

import { assertInterfaceDispatchCurrent as assertActionDispatchCurrent } from './interface-dispatch-context'

interface BrowserFrame { id: string, url: string, securityOrigin?: string, parentId?: string }
interface FrameTree { frame: BrowserFrame, childFrames?: FrameTree[] }
interface RemoteResult { result: { objectId?: string, value?: unknown }, exceptionDetails?: unknown }
export interface BrowserNodeIdentity {
  sessionId?: string
  frameId: string
  contextId: number
  documentId: number
  backendNodeId: number
}

export type BrowserDebuggerPort = Pick<Debugger, 'attach' | 'detach' | 'isAttached' | 'sendCommand' | 'on' | 'removeListener'>

/** The transport belongs to one selected page, including its permitted OOPIFs. */
export function createBrowserCdp(debuggerPort: BrowserDebuggerPort, source: string, policy?: { assertCurrent: () => void, allowFrame: (frame: BrowserFrame) => boolean }) {
  const sessions = new Set<string>()
  const pendingSessions = new Set<Promise<unknown>>()
  let sessionError: unknown = null
  const frameParents = new Map<string, { parentId?: string, sessionId?: string }>()
  let attached = false
  let detached = false
  const send = async <T>(method: string, params: Record<string, unknown> = {}, sessionId?: string, onDispatch?: () => void): Promise<T> => {
    if (detached)
      throw new Error('LOCAL_BROWSER_DEBUGGER_DETACHED')
    const cleanup = method === 'Runtime.releaseObject' || method === 'Input.dispatchKeyEvent' && params.type === 'keyUp' || method === 'Input.dispatchMouseEvent' && params.type === 'mouseReleased'
    if (!cleanup)
      policy?.assertCurrent()
    // Releases remain available after revocation so our input cannot stay held.
    if (!cleanup && (method.startsWith('Input.') || method === 'DOM.focus' || method === 'DOM.setFileInputFiles'))
      await assertActionDispatchCurrent(false)
    onDispatch?.()
    const result = await debuggerPort.sendCommand(method, params, sessionId) as T
    if (!cleanup)
      policy?.assertCurrent()
    return result
  }
  const message = (_event: unknown, method: string, params: { sessionId?: string }) => {
    if (method === 'Target.attachedToTarget' && params.sessionId) {
      sessions.add(params.sessionId)
      const ready = Promise.all([
        send('Page.enable', {}, params.sessionId),
        send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true, filter: [{ type: 'iframe', exclude: false }, { exclude: true }] }, params.sessionId),
      ]).catch((error) => { sessionError = error }).finally(() => pendingSessions.delete(ready))
      pendingSessions.add(ready)
    }
    if (method === 'Target.detachedFromTarget' && params.sessionId)
      sessions.delete(params.sessionId)
  }
  const onDetach = () => { detached = true; sessions.clear() }
  async function initialize() {
    if (attached)
      return
    // Taking over an unrelated debugger would make target ownership ambiguous.
    if (debuggerPort.isAttached())
      throw new Error('LOCAL_BROWSER_DEBUGGER_ALREADY_OWNED')
    debuggerPort.attach('1.3')
    attached = true
    debuggerPort.on('message', message)
    debuggerPort.on('detach', onDetach)
    await send('Page.enable')
    await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true, filter: [{ type: 'iframe', exclude: false }, { exclude: true }] })
  }
  async function evaluate<T>(expression: string, contextId: number, sessionId?: string, byValue = true): Promise<T> {
    const outcome = await send<RemoteResult>('Runtime.evaluate', { expression, contextId, returnByValue: byValue, awaitPromise: true }, sessionId)
    if (outcome.exceptionDetails)
      throw new Error('LOCAL_BROWSER_DOCUMENT_CHANGED')
    return (byValue ? outcome.result.value : outcome.result.objectId) as T
  }
  const expression = (body: string) => `(() => { ${source}; ${body} })()`
  async function node(selector: string | null, contextId: number, sessionId?: string) {
    const objectId = await evaluate<string | undefined>(expression(selector === null ? 'return document' : `const matches = observedMatches(${JSON.stringify(selector)}); return matches.length === 1 ? matches[0] : null`), contextId, sessionId, false)
    if (!objectId)
      throw new Error('LOCAL_BROWSER_STALE_TARGET')
    try {
      return (await send<{ node: { backendNodeId: number } }>('DOM.describeNode', { objectId }, sessionId)).node.backendNodeId
    }
    finally { await send('Runtime.releaseObject', { objectId }, sessionId) }
  }
  async function observe<T extends { text: string, elements: Array<{ selector: string }> }>(maximum: number, html: boolean) {
    await initialize()
    while (pendingSessions.size)
      await Promise.all(pendingSessions)
    if (sessionError) {
      const error = sessionError
      sessionError = null
      throw error
    }
    frameParents.clear()
    const framesById = new Map<string, { frameId: string, sessionId?: string, readable: boolean }>()
    for (const sessionId of [undefined, ...sessions]) {
      const tree = await send<{ frameTree: FrameTree }>('Page.getFrameTree', {}, sessionId)
      const visit = (entry: FrameTree, parentId?: string, parentReadable = true) => {
        const readable = parentReadable && (!policy || policy.allowFrame(entry.frame))
        if (!parentId && !sessionId && !readable)
          throw new Error('AUTHORIZED_BROWSER_ORIGIN_NOT_GRANTED')
        // Child targets own their own isolated world. Do not accidentally use a
        // parent session to address an out-of-process document.
        if (!framesById.has(entry.frame.id) || sessionId)
          framesById.set(entry.frame.id, { frameId: entry.frame.id, sessionId, readable: readable && (framesById.get(entry.frame.id)?.readable ?? true) })
        frameParents.set(entry.frame.id, { parentId: entry.frame.parentId ?? parentId ?? frameParents.get(entry.frame.id)?.parentId, sessionId })
        for (const child of entry.childFrames ?? [])
          visit(child, entry.frame.id, readable)
      }
      visit(tree.frameTree)
    }
    if (framesById.size > 16)
      throw new Error('LOCAL_BROWSER_FRAME_BUDGET')
    const frames = [...framesById.values()].filter(frame => frame.readable)
    const observations: Array<T & { elements: Array<T['elements'][number] & BrowserNodeIdentity> }> = []
    let remaining = maximum
    let controls = 120
    for (const { readable: _readable, ...frame } of frames) {
      const { executionContextId } = await send<{ executionContextId: number }>('Page.createIsolatedWorld', { frameId: frame.frameId, worldName: 'alicization-observation' }, frame.sessionId)
      const observed = await evaluate<T>(expression(`return observePage(${remaining},${html})`), executionContextId, frame.sessionId)
      const documentId = await node(null, executionContextId, frame.sessionId)
      const elements = []
      for (const element of observed.elements.slice(0, controls))
        elements.push({ ...element, ...frame, frameUrl: (observed as T & { url: string }).url, contextId: executionContextId, documentId, backendNodeId: await node(element.selector, executionContextId, frame.sessionId) })
      observations.push({ ...observed, elements })
      remaining = Math.max(0, remaining - observed.text.length)
      controls -= elements.length
    }
    if (!observations[0])
      throw new Error('LOCAL_BROWSER_DOCUMENT_UNAVAILABLE')
    return { ...observations[0], text: observations.map(item => item.text).join('\n').slice(0, maximum), elements: observations.flatMap(item => item.elements) }
  }
  async function mutate(target: BrowserNodeIdentity & { selector: string, type?: string }, input: { operation: 'click' | 'type' | 'upload', text?: string, clear?: boolean, submit?: boolean, files?: string[] }, assertCurrent: () => void, onClickDispatch?: () => void): Promise<{ ok: boolean, errorCode?: string, inputMode?: string, requiresReadback?: boolean }> {
    const { contextId, sessionId } = target
    const check = async () => {
      assertCurrent()
      if (await node(null, contextId, sessionId) !== target.documentId || await node(target.selector, contextId, sessionId) !== target.backendNodeId)
        throw new Error('LOCAL_BROWSER_STALE_TARGET')
      assertCurrent()
    }
    const checkFocus = async () => {
      await check()
      const focused = await evaluate<boolean>(expression(`const nodes = observedMatches(${JSON.stringify(target.selector)}); let active = document.activeElement; for (let depth = 0; active?.shadowRoot?.activeElement && depth < 16; depth++) active = active.shadowRoot.activeElement; return nodes.length === 1 && (active === nodes[0] || nodes[0].contains(active))`), contextId, sessionId)
      if (!focused)
        throw new Error('LOCAL_BROWSER_FOCUS_CHANGED')
      let frameId = target.frameId
      for (let depth = 0; depth < 16; depth++) {
        const parentId = frameParents.get(frameId)?.parentId
        if (!parentId)
          return
        const parentSession = frameParents.get(parentId)?.sessionId
        const owner = await send<{ backendNodeId: number }>('DOM.getFrameOwner', { frameId }, parentSession)
        const { object } = await send<{ object: { objectId: string } }>('DOM.resolveNode', { backendNodeId: owner.backendNodeId }, parentSession)
        try {
          const result = await send<RemoteResult>('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: 'function() { let active = this.ownerDocument.activeElement; for (let depth = 0; active?.shadowRoot?.activeElement && depth < 16; depth++) active = active.shadowRoot.activeElement; return active === this }', returnByValue: true }, parentSession)
          if (result.result.value !== true)
            throw new Error('LOCAL_BROWSER_FOCUS_CHANGED')
        }
        finally { await send('Runtime.releaseObject', { objectId: object.objectId }, parentSession) }
        frameId = parentId
      }
      throw new Error('LOCAL_BROWSER_FRAME_BUDGET')
    }
    await check()
    await assertActionDispatchCurrent(false)
    const prepared = await evaluate<{ ok: boolean, errorCode?: string, x: number, y: number, kind: string, optionSteps?: number }>(expression(`return preparePageMutation(${JSON.stringify({ ...input, selector: target.selector, expected: target })})`), contextId, sessionId)
    if (!prepared.ok)
      return prepared
    const key = async (name: string, code: number, commands?: string[]) => {
      await checkFocus()
      assertCurrent()
      let pressed = false
      try { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, windowsVirtualKeyCode: code, ...(commands ? { commands } : {}) }, sessionId, () => { pressed = true }) }
      finally {
        if (pressed)
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, windowsVirtualKeyCode: code }, sessionId)
      }
    }
    async function locateInput(): Promise<{ ok: true, x: number, y: number } | { ok: false, errorCode: string }> {
      await check()
      const { quads } = await send<{ quads: number[][] }>('DOM.getContentQuads', { backendNodeId: target.backendNodeId }, sessionId)
      const quad = quads[0]
      if (!quad || quad.length !== 8)
        return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
      let x = (quad[0]! + quad[2]! + quad[4]! + quad[6]!) / 4
      let y = (quad[1]! + quad[3]! + quad[5]! + quad[7]!) / 4
      const point = { x, y }
      const hit = await send<{ backendNodeId: number, frameId: string }>('DOM.getNodeForLocation', { x: Math.round(x), y: Math.round(y), includeUserAgentShadowDOM: false }, sessionId)
      if (hit.backendNodeId !== target.backendNodeId || hit.frameId !== target.frameId) {
        if (hit.frameId !== target.frameId)
          return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
        const { object } = await send<{ object: { objectId: string } }>('DOM.resolveNode', { backendNodeId: hit.backendNodeId, executionContextId: contextId }, sessionId)
        try {
          const contains = await send<RemoteResult>('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: `function() { ${source}; const nodes = observedMatches(${JSON.stringify(target.selector)}); return nodes.length === 1 && nodes[0].contains(this) }`, returnByValue: true }, sessionId)
          if (contains.result.value !== true)
            return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
        }
        finally { await send('Runtime.releaseObject', { objectId: object.objectId }, sessionId) }
      }
      let frameId = target.frameId
      let currentSession = sessionId
      // An OOPIF reports its own viewport coordinates. Project them through its
      // iframe's content quad before checking the outer page for occlusion.
      for (let depth = 0; currentSession && depth < 16; depth++) {
        const tree = await send<{ frameTree: FrameTree }>('Page.getFrameTree', {}, currentSession)
        frameId = tree.frameTree.frame.id
        const parentId = frameParents.get(frameId)?.parentId
        if (!parentId)
          throw new Error('LOCAL_BROWSER_FRAME_CHANGED')
        const parentSession = frameParents.get(parentId)?.sessionId
        const owner = await send<{ backendNodeId: number }>('DOM.getFrameOwner', { frameId }, parentSession)
        const { model } = await send<{ model: { content: number[], width: number, height: number } }>('DOM.getBoxModel', { backendNodeId: owner.backendNodeId }, parentSession)
        const metrics = await send<{ cssLayoutViewport: { clientWidth: number, clientHeight: number } }>('Page.getLayoutMetrics', {}, currentSession)
        const u = x / metrics.cssLayoutViewport.clientWidth
        const v = y / metrics.cssLayoutViewport.clientHeight
        const content = model.content
        x = content[0]! + u * (content[2]! - content[0]!) + v * (content[6]! - content[0]!)
        y = content[1]! + u * (content[3]! - content[1]!) + v * (content[7]! - content[1]!)
        const parentHit = await send<{ backendNodeId: number }>('DOM.getNodeForLocation', { x: Math.round(x), y: Math.round(y), includeUserAgentShadowDOM: false }, parentSession)
        if (parentHit.backendNodeId !== owner.backendNodeId)
          return { ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' }
        currentSession = parentSession
      }
      if (currentSession)
        throw new Error('LOCAL_BROWSER_FRAME_BUDGET')
      return { ok: true, ...point }
    }
    const point = await locateInput()
    if (!point.ok)
      return point
    if (input.operation === 'click') {
      await check()
      assertCurrent()
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, buttons: 0 }, sessionId)
      await check()
      const afterHover = await evaluate<{ ok: boolean, errorCode?: string }>(expression(`return preparePageMutation(${JSON.stringify({ ...input, selector: target.selector, expected: target })})`), contextId, sessionId)
      if (!afterHover.ok)
        return afterHover
      // Hover handlers may move a still-valid control and put another action
      // under the old pointer. Never press an unchecked historical coordinate.
      const hoveredPoint = await locateInput()
      if (!hoveredPoint.ok)
        return hoveredPoint
      if (Math.abs(hoveredPoint.x - point.x) > 0.5 || Math.abs(hoveredPoint.y - point.y) > 0.5)
        return { ok: false, errorCode: 'LOCAL_BROWSER_STALE_TARGET' }
      assertCurrent()
      let pressed = false
      try { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1 }, sessionId, () => { onClickDispatch?.(); pressed = true }) }
      finally {
        if (pressed)
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', buttons: 0, clickCount: 1 }, sessionId)
      }
    }
    else if (input.operation === 'upload') {
      await check()
      if (target.type !== 'file' || !input.files?.length)
        return { ok: false, errorCode: 'LOCAL_BROWSER_FILE_TARGET_REQUIRED' }
      assertCurrent()
      // Preserve the exact approved file on Windows profiles whose absolute
      // snapshot path exceeds MAX_PATH; Chromium otherwise exposes an empty file.
      await send('DOM.setFileInputFiles', { backendNodeId: target.backendNodeId, files: input.files.map(toNamespacedPath) }, sessionId)
    }
    else {
      await check()
      assertCurrent()
      await send('DOM.focus', { backendNodeId: target.backendNodeId }, sessionId)
      if (prepared.kind === 'select') {
        await key('Home', 36)
        for (let index = 0; index < (prepared.optionSteps ?? 0); index++)
          await key('ArrowDown', 40)
      }
      else {
        // Editor commands and Input.insertText generate Chromium's real editing
        // events without borrowing the host desktop or modifying the clipboard.
        await key('End', 35, [input.clear ? 'selectAll' : 'moveToEndOfDocument'])
        await checkFocus()
        assertCurrent()
        await send('Input.insertText', { text: input.text ?? '' }, sessionId)
        if (input.submit)
          await key('Enter', 13)
      }
    }
    return { ok: true, inputMode: 'trusted-cdp', requiresReadback: true }
  }
  function close() {
    debuggerPort.removeListener('message', message)
    debuggerPort.removeListener('detach', onDetach)
    if (attached && !detached && debuggerPort.isAttached())
      debuggerPort.detach()
    detached = true
    sessions.clear()
  }
  async function probe() {
    await initialize()
    await send('Page.getFrameTree')
  }
  async function scroll(action: 'top' | 'bottom' | 'up' | 'down', pixels: number) {
    await initialize()
    const { frameTree } = await send<{ frameTree: FrameTree }>('Page.getFrameTree')
    if (policy && !policy.allowFrame(frameTree.frame))
      throw new Error('AUTHORIZED_BROWSER_ORIGIN_NOT_GRANTED')
    const { executionContextId } = await send<{ executionContextId: number }>('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'alicization-observation' })
    await assertActionDispatchCurrent(false)
    return evaluate(expression(`return scrollPage(${JSON.stringify(action)},${Math.max(1, Math.min(4000, pixels))})`), executionContextId)
  }
  return { observe, mutate, close, probe, scroll }
}
