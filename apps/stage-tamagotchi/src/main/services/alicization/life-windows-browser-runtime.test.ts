import type { BrowserWindow } from 'electron'

import { existsSync } from 'node:fs'
import { createServer } from 'node:http'

import { chromium } from 'playwright'
import { describe, expect, it, vi } from 'vitest'

import { createLifeWindowsBrowserRuntime } from './life-windows-browser-runtime'

vi.mock('electron', () => ({ BrowserWindow: class {} }))

describe('windows browser adapter with a real isolated browser DOM', () => {
  it('fills an actual form, reads its resulting page, rejects changed/ambiguous targets and honors cancellation', async () => {
    const executable = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
    const browser = await chromium.launch({ ...(executable ? { executablePath: executable } : {}), headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()
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
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame())
        navigation?.(null, frame.url(), false, true)
    })
    const owned = { isDestroyed: () => false, getTitle: () => 'QA Browser', showInactive: () => {}, destroy: () => {}, on: () => {}, loadURL: async (url: string) => { await page.goto(url) }, webContents: { session: { setPermissionRequestHandler: () => {}, setPermissionCheckHandler: () => {} }, setWindowOpenHandler: () => {}, setAudioMuted: () => {}, on: (event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'did-start-navigation')
        navigation = handler
    }, executeJavaScript: async (script: string) => page.evaluate(script), getURL: () => page.url(), stop: () => {} } } as unknown as BrowserWindow
    let owner = 'alice'
    let approve = false
    const authorize = vi.fn(async () => ({ allow: approve, reason: approve ? 'approved' : 'host-denied' }))
    const adapter = createLifeWindowsBrowserRuntime({ createWindow: () => owned, ownerId: () => owner, authorize })
    try {
      expect(await adapter.openUrl({ url: `http://127.0.0.1:${address.port}/` })).toMatchObject({ status: 'completed', browser: 'alicization-managed' })
      expect(await adapter.clickElement({ selector: '#save' })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_OBSERVATION_REQUIRED' })
      const observed = await adapter.readPage({ format: 'interactables' })
      expect(observed).toMatchObject({ status: 'completed', executionScope: 'owned-window-only' })
      expect(await adapter.clickElement({ text: '同名', exactText: true })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_AMBIGUOUS_TARGET' })
      await page.evaluate('document.body.insertAdjacentHTML(\'beforeend\', \'<div id="cover" style="position:fixed;inset:0;z-index:999">modal</div>\')')
      expect(await adapter.clickElement({ selector: '#save' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' })
      expect(submitted).toBeNull()
      await page.evaluate('document.querySelector(\'#cover\').remove()')
      await adapter.readPage({})
      await page.evaluate('document.querySelector(\'#save\').textContent = \'删除\'')
      expect(await adapter.clickElement({ selector: '#save' })).toMatchObject({ status: 'failed', errorCode: 'LOCAL_BROWSER_STALE_TARGET' })
      expect(submitted).toBeNull()
      await page.evaluate('document.querySelector(\'#save\').textContent = \'保存\'')
      await adapter.readPage({})
      await page.evaluate('document.querySelector(\'#note\').value = \'外部修改\'')
      expect(await adapter.typeBrowserText({ selector: '#note', text: '不得追加' })).toMatchObject({ errorCode: 'LOCAL_BROWSER_STALE_TARGET' })
      expect(await page.inputValue('#note')).toBe('外部修改')
      await page.evaluate('document.querySelector(\'#note\').value = \'\'')
      await adapter.readPage({})
      const controller = new AbortController()
      controller.abort(new Error('host-stop'))
      await expect(adapter.typeBrowserText({ selector: '#note', text: '不得写入', abortSignal: controller.signal })).rejects.toThrow('host-stop')
      expect(await page.inputValue('#note')).toBe('')
      expect(await adapter.typeBrowserText({ selector: '#note', text: '雨声陪伴', clearExisting: true })).toMatchObject({ status: 'completed', requiresReadback: true })
      expect(await page.inputValue('#note')).toBe('雨声陪伴')
      await adapter.readPage({})
      expect(await adapter.clickElement({ selector: '#save' })).toMatchObject({ status: 'completed', requiresReadback: true })
      expect(await adapter.waitForBrowser({ text: '已保存', urlIncludes: '/result', timeoutMs: 3000 })).toMatchObject({ status: 'completed' })
      expect(await adapter.readPage({})).toMatchObject({ status: 'completed', text: expect.stringContaining('雨声陪伴') })
      expect(submitted).toBe('雨声陪伴')
      await page.evaluate('document.body.insertAdjacentHTML(\'beforeend\', \'<button id="pay" onclick="window.qaPaid = true">付款</button>\')')
      await adapter.readPage({})
      expect(await adapter.clickElement({ selector: '#pay' })).toMatchObject({ errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST', sideEffectState: 'none' })
      expect(await page.evaluate('Boolean(window.qaPaid)')).toBe(false)
      approve = true
      await adapter.readPage({})
      expect(await adapter.clickElement({ selector: '#pay' })).toMatchObject({ status: 'completed' })
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
