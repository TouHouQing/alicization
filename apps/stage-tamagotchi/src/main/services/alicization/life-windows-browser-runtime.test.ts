import type { BrowserWindow, HandlerDetails, WindowOpenHandlerResponse } from 'electron'
import type { Frame } from 'playwright'

import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium } from 'playwright'
import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { withActionDispatch } from './execution/action-dispatch-context'
import { createExecutionResourceBroker } from './execution/resource-broker'
import { observeLifeInterfaceResult } from './life-interface-action-closure'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { createLifeWindowsBrowserRuntime } from './life-windows-browser-runtime'
import { createAlicizationLocalBrowserAutomationService } from './local-browser-automation'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

vi.mock('electron', () => ({ BrowserWindow: class {}, shell: {} }))

describe('windows browser adapter with a real isolated browser DOM', () => {
  it('fills an actual form, reads its resulting page, rejects changed/ambiguous targets and honors cancellation', async () => {
    const executable = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
    const browser = await chromium.launch({ ...(executable ? { executablePath: executable } : {}), headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()
    const protocol = await context.newCDPSession(page)
    let popupHandler: ((details: HandlerDetails) => WindowOpenHandlerResponse) | undefined
    let probeMouse: ((kind: unknown) => void) | undefined
    let commandId = 0
    const childCommands = new Map<number, { resolve: (value: unknown) => void, reject: (error: Error) => void }>()
    const debuggerPort = Object.assign(new EventEmitter(), { attach: () => {}, detach: () => {}, isAttached: () => false, sendCommand: async (method: string, params: Record<string, unknown>, sessionId?: string) => {
      if (method === 'Input.dispatchMouseEvent')
        probeMouse?.(params.type)
      if (!sessionId)
        return protocol.send(method as Parameters<typeof protocol.send>[0], (method === 'Target.setAutoAttach' ? { ...params, flatten: false } : params) as never)
      const id = ++commandId
      const result = new Promise((resolve, reject) => childCommands.set(id, { resolve, reject }))
      await protocol.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) })
      return result
    } })
    protocol.on('Target.attachedToTarget', params => debuggerPort.emit('message', {}, 'Target.attachedToTarget', params))
    protocol.on('Target.detachedFromTarget', params => debuggerPort.emit('message', {}, 'Target.detachedFromTarget', params))
    protocol.on('Target.receivedMessageFromTarget', ({ message }) => {
      const response = JSON.parse(message)
      const pending = childCommands.get(response.id)
      if (pending) {
        childCommands.delete(response.id)
        if (response.error)
          pending.reject(new Error(response.error.message))
        else
          pending.resolve(response.result)
      }
    })
    let submitted: string | null = null
    const server = createServer((request, response) => {
      const url = new URL(request.url!, 'http://127.0.0.1')
      response.setHeader('content-type', 'text/html; charset=utf-8')
      if (url.pathname === '/result') {
        submitted = url.searchParams.get('note')
        response.end(`<h1>已保存</h1><p>${submitted?.replace(/[<>&]/gu, '')}</p>`)
      }
      else {
        response.end('<form action="/result"><input id="note" name="note" placeholder="笔记"><button id="save">保存</button></form><button class="duplicate">同名</button><button class="duplicate">同名</button>')
      }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as { port: number }
    let navigation: ((...args: unknown[]) => void) | undefined
    const frameIds = new Map<Frame, number>()
    const framePort = (frame: Frame): Record<string, unknown> => {
      if (!frameIds.has(frame))
        frameIds.set(frame, frameIds.size + 1)
      return { processId: 1, routingId: frameIds.get(frame), url: frame.url(), executeJavaScript: (script: string) => frame.evaluate(script), get framesInSubtree() { return page.frames().map(framePort) } }
    }
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame())
        navigation?.(null, frame.url(), false, true)
    })
    const owned = { isDestroyed: () => false, getContentBounds: () => ({ x: 0, y: 0, width: 1100, height: 760 }), isVisible: () => false, isFocusable: () => false, isMinimized: () => false, getTitle: () => 'QA Browser', showInactive: () => {}, destroy: () => {}, on: () => {}, loadURL: async (url: string) => { await page.goto(url) }, webContents: { debugger: debuggerPort, session: { on: () => {}, removeListener: () => {}, setPermissionRequestHandler: () => {}, setPermissionCheckHandler: () => {} }, setWindowOpenHandler: (handler: typeof popupHandler) => { popupHandler = handler }, setAudioMuted: () => {}, on: (event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'did-start-navigation')
        navigation = handler
    }, get mainFrame() { return framePort(page.mainFrame()) }, executeJavaScript: async (script: string) => page.evaluate(script), getURL: () => page.url(), stop: () => {} } } as unknown as BrowserWindow
    let owner = 'alice'
    let approve = false
    const authorize = vi.fn(async () => ({ allow: approve, reason: approve ? 'approved' : 'host-denied' }))
    const adapter = createLifeWindowsBrowserRuntime({ createWindow: () => owned, ownerId: () => owner, authorize })
    let elements: Array<{ selector: string, text: string }> = []
    const read = async () => {
      const result = await adapter.readPage({ format: 'interactables' })
      elements = ('elements' in result ? result.elements : []) as typeof elements
      return result
    }
    const reference = (text: string) => elements.find(element => element.text === text)!.selector
    try {
      expect(await adapter.getHealth()).toMatchObject({ available: true, ready: true, reason: null })
      const local = createAlicizationLocalBrowserAutomationService({ windowsBrowser: adapter, errorMessageFrom: String })
      expect((await local.resolveCapabilityChannels()).find(item => item.channel === 'browser')).toMatchObject({ available: true, ready: true, reason: null })
      const unavailable = vi.spyOn(adapter, 'getHealth').mockResolvedValueOnce({ available: true, ready: false, reason: 'managed-browser-probe-failed', observedAt: Date.now() })
      expect((await local.resolveCapabilityChannels()).find(item => item.channel === 'browser')).toMatchObject({ available: true, ready: false, reason: 'managed-browser-probe-failed' })
      unavailable.mockRestore()
      expect(await adapter.openUrl({ url: `http://127.0.0.1:${address.port}/` })).toMatchObject({ status: 'completed', browser: 'alicization-managed' })
      expect(await adapter.clickElement({ selector: '#save' })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_OBSERVATION_REQUIRED' })
      const observed = await read()
      expect(observed).toMatchObject({ status: 'completed', executionScope: 'owned-window-only' })
      expect(await adapter.clickElement({ text: '同名', exactText: true })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_AMBIGUOUS_TARGET' })
      await page.evaluate('document.body.insertAdjacentHTML(\'beforeend\', \'<div id="cover" style="position:fixed;inset:0;z-index:999">modal</div>\')')
      expect(await adapter.clickElement({ selector: reference('保存') })).toMatchObject({ errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' })
      expect(submitted).toBeNull()
      await page.evaluate('document.querySelector(\'#cover\').remove()')
      await read()
      await page.evaluate('document.querySelector(\'#save\').textContent = \'删除\'')
      expect(await adapter.clickElement({ selector: reference('保存') })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_STALE_TARGET' })
      expect(submitted).toBeNull()
      await page.evaluate('document.querySelector(\'#save\').textContent = \'保存\'')
      await read()
      await page.evaluate('document.querySelector(\'#note\').value = \'外部修改\'')
      expect(await adapter.typeBrowserText({ selector: reference('笔记'), text: '不得追加' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_STALE_TARGET' })
      expect(await page.inputValue('#note')).toBe('外部修改')
      await page.evaluate('document.querySelector(\'#note\').value = \'\'')
      await read()
      await page.evaluate(`window.actualInputEvents = []; for (const name of ['input', 'keydown', 'click']) document.addEventListener(name, event => window.actualInputEvents.push({ type: event.type, trusted: event.isTrusted }), true)`)
      const controller = new AbortController()
      controller.abort(new Error('host-stop'))
      await expect(adapter.typeBrowserText({ selector: reference('笔记'), text: '不得写入', abortSignal: controller.signal })).rejects.toThrow('host-stop')
      expect(await page.inputValue('#note')).toBe('')
      const directory = await mkdtemp(join(tmpdir(), 'life-browser-real-binding-'))
      const db = await setupAlicizationDb(directory, { cardId: 'alice' })
      try {
        const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, resourceBroker: createExecutionResourceBroker(), now: Date.now })
        const signal = new AbortController().signal
        const parameters = { selector: reference('笔记'), text: '雨声陪伴', clearExisting: true }
        await life.admit({ cardId: 'alice', turnId: 'type-owned-note', conversationId: 'qa', messages: [{ role: 'user', content: 'Enter only the accepted note' }] }, signal)
        const action = await life.beforeAction({ cardId: 'alice', turnId: 'type-owned-note', actionId: 'note', capabilityId: 'tool.browser_type_text', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.browser_type_text')!.effects }, signal)
        await action.authorizeDispatch(parameters)
        await expect(withActionDispatch(action.assertDispatchCurrent, () => local.typeBrowserText({ ...parameters, text: 'must not enter' }))).rejects.toThrow('input changed')
        await expect(withActionDispatch(action.assertDispatchCurrent, () => local.clickElement({ selector: parameters.selector }))).rejects.toThrow('capability changed')
        expect(await page.inputValue('#note')).toBe('')
        const result = await withActionDispatch(action.assertDispatchCurrent, () => local.typeBrowserText(parameters))
        expect(result).toMatchObject({ status: 'completed', requiresReadback: true, inputMode: 'trusted-cdp' })
        await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
        expect((await db.getLifeEffect(action.id))?.status).toBe('settled')
      }
      finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
      expect(await page.inputValue('#note')).toBe('雨声陪伴')
      await read()
      expect(await adapter.typeBrowserText({ selector: reference('笔记'), text: '新的内容', clearExisting: true })).toMatchObject({ status: 'completed', inputMode: 'trusted-cdp' })
      expect(await page.inputValue('#note')).toBe('新的内容')
      await read()
      expect(await adapter.typeBrowserText({ selector: reference('笔记'), text: '雨声陪伴', clearExisting: true })).toMatchObject({ status: 'completed' })
      const events = await page.evaluate('window.actualInputEvents') as Array<{ type: string, trusted: boolean }>
      expect(events.some(event => event.type === 'input')).toBe(true)
      expect(events.every(event => event.trusted)).toBe(true)
      await read()
      await page.evaluate(`document.querySelector('#note').outerHTML = document.querySelector('#note').outerHTML`)
      expect(await adapter.typeBrowserText({ selector: reference('笔记'), text: '不得写入替身' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_STALE_TARGET' })
      await read()
      expect(await adapter.typeBrowserText({ selector: reference('笔记'), text: '雨声陪伴', clearExisting: true })).toMatchObject({ status: 'completed' })
      await read()
      await page.evaluate(`document.querySelector('#save').addEventListener('mouseenter', () => document.querySelector('#save').textContent = 'hover changed', { once: true })`)
      expect(await adapter.clickElement({ selector: reference('保存') })).toMatchObject({ errorCode: 'LOCAL_BROWSER_STALE_TARGET' })
      expect(submitted).toBeNull()
      await page.evaluate(`document.querySelector('#save').textContent = '保存'`)
      const readback = await read()
      const field = (('elements' in readback ? readback.elements : []) as Array<{ text: string, id: string }>).find(item => item.text === '笔记')!
      const predicate = { kind: 'field' as const, id: field.id, valueHash: createHash('sha256').update('雨声陪伴').digest('hex'), preview: '雨声陪伴', length: 4 }
      const firstProof = observeLifeInterfaceResult(readback, [field.id], predicate)
      const secondProof = observeLifeInterfaceResult(await read(), [field.id], predicate)
      expect(firstProof?.predicateMatched).toBe(true)
      expect(secondProof?.contentHash).toBe(firstProof?.contentHash)
      expect(await adapter.clickElement({ selector: reference('保存') })).toMatchObject({ status: 'completed', requiresReadback: true })
      expect(await adapter.waitForBrowser({ text: '已保存', urlIncludes: '/result', timeoutMs: 3000 })).toMatchObject({ status: 'completed' })
      expect(await read()).toMatchObject({ status: 'completed', text: expect.stringContaining('雨声陪伴') })
      expect(submitted).toBe('雨声陪伴')
      await page.evaluate(`(() => {
        const host = document.createElement('section')
        document.body.append(host)
        host.attachShadow({ mode: 'open' }).innerHTML = '<input id="note" placeholder="影子字段"><button id="save">影子按钮</button>'
        const frame = document.createElement('iframe')
        frame.sandbox.add('allow-scripts')
        frame.srcdoc = '<input id="note" placeholder="框架字段"><button id="save">框架按钮</button>'
        document.body.append(frame)
      })()`)
      await page.frameLocator('iframe').getByPlaceholder('框架字段').waitFor()
      approve = true
      await read()
      await page.evaluate(`document.body.insertAdjacentHTML('beforeend', '<div id="outer-cover" style="position:fixed;inset:0;z-index:999">outer modal</div>')`)
      expect(await adapter.clickElement({ selector: reference('框架按钮') })).toMatchObject({ errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' })
      await page.evaluate(`document.querySelector('#outer-cover').remove()`)
      await read()
      await page.frames()[1]!.evaluate(`document.querySelector('#save').addEventListener('click', event => document.querySelector('#save').dataset.trusted = String(event.isTrusted))`)
      const frameClick = await adapter.clickElement({ selector: reference('框架按钮') })
      expect(frameClick, JSON.stringify(frameClick)).toMatchObject({ status: 'completed', inputMode: 'trusted-cdp' })
      expect(await page.frameLocator('iframe').locator('#save').getAttribute('data-trusted')).toBe('true')
      approve = false
      await read()
      await page.evaluate(`document.body.insertAdjacentHTML('beforeend', '<input id="focus-target" placeholder="焦点目标"><input id="focus-trap" placeholder="另一个字段">'); document.querySelector('#focus-trap').focus(); document.querySelector('#focus-target').addEventListener('focus', () => document.querySelector('#focus-trap').focus(), { once: true })`)
      await read()
      expect(await adapter.typeBrowserText({ selector: reference('焦点目标'), text: '不得误写' })).toMatchObject({ status: 'failed' })
      expect(await page.inputValue('#focus-target')).toBe('')
      expect(await page.inputValue('#focus-trap')).toBe('')
      await read()
      const oldFrameReference = reference('框架字段')
      expect(oldFrameReference).toMatch(/^element:/u)
      expect(await adapter.typeBrowserText({ selector: reference('影子字段'), text: 'shadow content', clearExisting: true })).toMatchObject({ status: 'completed' })
      expect(await page.getByPlaceholder('影子字段').inputValue()).toBe('shadow content')
      const popupUrl = `http://127.0.0.1:${address.port}/approved-popup`
      await page.evaluate(`(() => {
        const link = document.createElement('a')
        link.href = ${JSON.stringify(popupUrl)}
        link.textContent = '检查弹窗许可'
        link.addEventListener('click', event => event.preventDefault())
        document.body.append(link)
      })()`)
      await read()
      const decisions: Array<{ kind: unknown, action: string }> = []
      probeMouse = (kind) => {
        if (kind === 'mouseMoved' || kind === 'mousePressed')
          decisions.push({ kind, action: popupHandler!({ url: popupUrl } as HandlerDetails).action })
      }
      expect(await adapter.clickElement({ selector: reference('检查弹窗许可') })).toMatchObject({ status: 'completed' })
      probeMouse = undefined
      expect(decisions).toEqual([{ kind: 'mouseMoved', action: 'deny' }, { kind: 'mousePressed', action: 'allow' }])
      expect(popupHandler!({ url: popupUrl } as HandlerDetails).action).toBe('deny')
      await page.evaluate(`(() => {
        document.body.insertAdjacentHTML('beforeend', '<select id="mood" aria-label="心情"><option value="quiet">安静</option><option value="joy">开心</option><optgroup disabled label="disabled"><option value="blocked">不可选</option></optgroup><option value="other1">重复</option><option value="other2">重复</option></select>')
      })()`)
      await read()
      expect(await adapter.typeBrowserText({ selector: reference('心情'), text: '开心' })).toMatchObject({ status: 'completed' })
      expect(await page.inputValue('#mood')).toBe('joy')
      await read()
      expect(await adapter.typeBrowserText({ selector: reference('心情'), text: '重复' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_AMBIGUOUS_OPTION' })
      await read()
      expect(await adapter.typeBrowserText({ selector: reference('心情'), text: 'blocked' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_AMBIGUOUS_OPTION' })
      await read()
      await page.evaluate('document.querySelector(\'#mood option[value="quiet"]\').disabled=true')
      expect(await adapter.typeBrowserText({ selector: reference('心情'), text: 'quiet' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_STALE_TARGET' })
      expect(await page.inputValue('#mood')).toBe('joy')
      await read()
      await read()
      expect(await adapter.typeBrowserText({ selector: oldFrameReference, text: 'must not type' })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_STALE_REFERENCE' })
      expect(await adapter.typeBrowserText({ selector: reference('框架字段'), text: 'frame content', clearExisting: true })).toMatchObject({ status: 'completed' })
      expect(await page.frameLocator('iframe').getByPlaceholder('框架字段').inputValue()).toBe('frame content')
      expect(await page.getByPlaceholder('影子字段').inputValue()).toBe('shadow content')
      await page.evaluate('document.body.insertAdjacentHTML(\'beforeend\', \'<button id="pay" onclick="window.qaPaid = true">付款</button>\')')
      await read()
      expect(await adapter.clickElement({ selector: reference('付款') })).toMatchObject({ errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST', sideEffectState: 'none' })
      expect(await page.evaluate('Boolean(window.qaPaid)')).toBe(false)
      approve = true
      await read()
      expect(await adapter.clickElement({ selector: reference('付款') })).toMatchObject({ status: 'completed' })
      expect(await page.evaluate('window.qaPaid')).toBe(true)
      expect(authorize).toHaveBeenCalledWith(expect.objectContaining({ cardId: 'alice', riskLevel: 'danger', actionCategory: 'network' }), undefined)
      owner = 'bob'
      expect(await adapter.clickElement({ text: '保存' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_OBSERVATION_REQUIRED' })
      expect(submitted).toBe('雨声陪伴')
      expect(await adapter.openUrl({ url: 'file:///C:/Windows/win.ini' })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_URL_NOT_ALLOWED' })
    }
    finally { adapter.close(); await context.close(); await browser.close(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
  }, 30_000)
})
