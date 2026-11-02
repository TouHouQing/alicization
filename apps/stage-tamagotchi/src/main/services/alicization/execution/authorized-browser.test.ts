import type { AddressInfo } from 'node:net'

import type { LifeInterfaceRiskRequest } from '../life-interface-risk'
import type { BrowserNodeIdentity } from './browser-cdp'

import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium } from 'playwright'
import { describe, expect, it, vi } from 'vitest'

import pageSource from '../life-windows-browser-page.js?raw'

import { createLifeAuthorizedBrowserRuntime } from '../life-authorized-browser-runtime'
import { authorizedBrowserEndpoint, authorizedBrowserSocket, inspectAuthorizedBrowser, publicAuthorizedBrowserTarget } from './authorized-browser-endpoint'
import { connectAuthorizedBrowser } from './authorized-browser-transport'
import { createBrowserCdp } from './browser-cdp'

describe('explicit selected-page browser transport', () => {
  it('rejects remote, credential-bearing, redirected and oversized inspection endpoints', async () => {
    for (const endpoint of ['https://127.0.0.1:9222', 'http://localhost:9222', 'http://example.com:9222', 'http://127.0.0.1:9222/json/list', 'http://user:pass@127.0.0.1:9222', 'http://127.0.0.1:9222?token=x', 'http://2130706433:9222', 'http://127.0.0.1:65536'])
      expect(() => authorizedBrowserEndpoint(endpoint), endpoint).toThrow()
    const endpoint = authorizedBrowserEndpoint('http://127.0.0.1:9222')
    for (const socket of ['ws://127.0.0.1:9222/devtools/browser/root', 'ws://127.0.0.1:9223/devtools/page/page1', 'ws://example.com:9222/devtools/page/page1', 'ws://127.0.0.1:9222/devtools/page/page1?token=x'])
      expect(() => authorizedBrowserSocket(endpoint, 'page1', socket)).toThrow()
    let redirect = true
    const server = createServer((_request, response) => {
      if (redirect) {
        response.writeHead(302, { location: 'http://example.com/json/list' })
        response.end()
      }
      else { response.end(' '.repeat(65537)) }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      await expect(inspectAuthorizedBrowser(base)).rejects.toThrow()
      redirect = false
      await expect(inspectAuthorizedBrowser(base)).rejects.toThrow('INSPECTION_BUDGET')
    }
    finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
  })

  it('reads only granted origins in a real existing Chromium tab, releases owned input on takeover, and revokes navigation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-authorized-browser-'))
    const executable = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
    const foreign = createServer((_request, response) => { response.setHeader('content-type', 'text/html'); response.end('<h1>UNGRANTED_CHILD_SECRET</h1><input aria-label="forbidden" />') })
    await new Promise<void>(resolve => foreign.listen(0, '127.0.0.1', resolve))
    const foreignOrigin = `http://127.0.0.1:${(foreign.address() as AddressInfo).port}`
    const server = createServer((request, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(request.url === '/child'
        ? '<p>GRANTED_CHILD_TEXT</p>'
        : `<title>Chosen test page</title><h1>Granted page</h1><form action="/save"><label for="note-field">note</label><input id="note-field" name="note"/><span id="choice-name">Choose a kind</span><select aria-labelledby="choice-name"><option>One</option></select><input type="hidden" name="csrf" value="PRIVATE_FORM_TOKEN"/><button>Save note</button></form><iframe src="/child"></iframe><iframe src="${foreignOrigin}"></iframe>`)
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const context = await chromium.launchPersistentContext(root, { ...(executable ? { executablePath: executable } : {}), headless: true, args: ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0'] })
    const connections: Array<Awaited<ReturnType<typeof connectAuthorizedBrowser>>> = []
    let runtime: ReturnType<typeof createLifeAuthorizedBrowserRuntime> | undefined
    let releaseOld: (() => void) | undefined
    try {
      const page = context.pages()[0]!
      await page.goto(`${origin}/?private=synthetic-query`)
      await page.waitForLoadState('load')
      const [port] = (await readFile(join(root, 'DevToolsActivePort'), 'utf8')).split('\n')
      const endpoint = `http://127.0.0.1:${port}`
      const target = (await inspectAuthorizedBrowser(endpoint)).find(target => target.url.startsWith(origin))!
      expect(target).toBeDefined()
      expect(publicAuthorizedBrowserTarget(target).location).not.toContain('synthetic-query')
      const revoked: string[] = []
      const connection = await connectAuthorizedBrowser(target, [origin], reason => revoked.push(reason))
      connections.push(connection)
      const originalSend = connection.debuggerPort.sendCommand.bind(connection.debuggerPort)
      const commands = vi.spyOn(connection.debuggerPort, 'sendCommand')
      const cdp = createBrowserCdp(connection.debuggerPort, pageSource.replace(/^export /gmu, ''), connection)
      interface Observation { url: string, text: string, elements: Array<BrowserNodeIdentity & { selector: string, text: string, type: string, value: string | null }> }
      const observation = await cdp.observe<Observation>(12000, false)
      expect(observation.text).toContain('Granted page')
      expect(observation.text).toContain('GRANTED_CHILD_TEXT')
      expect(observation.text).not.toContain('UNGRANTED_CHILD_SECRET')
      expect(observation.elements.some(element => element.text === 'forbidden')).toBe(false)
      expect(observation.elements.some(element => element.text === 'Choose a kind')).toBe(true)
      const tree = await connection.debuggerPort.sendCommand('Page.getFrameTree') as { frameTree: { childFrames: Array<{ frame: { id: string, securityOrigin: string } }> } }
      const forbiddenId = tree.frameTree.childFrames.find(child => child.frame.securityOrigin === foreignOrigin)!.frame.id
      expect(commands.mock.calls.some(([method, input]) => method === 'Page.createIsolatedWorld' && input?.frameId === forbiddenId)).toBe(false)
      const input = observation.elements.find(element => element.text === 'note')!
      expect(input).toBeDefined()
      expect(await cdp.mutate(input, { operation: 'type', text: '中文🙂保持原值', clear: true }, connection.assertCurrent)).toMatchObject({ ok: true, inputMode: 'trusted-cdp' })
      expect(await page.getByRole('textbox', { name: 'note', exact: true }).inputValue()).toBe('中文🙂保持原值')
      const fresh = await cdp.observe<Observation>(12000, false)
      const current = fresh.elements.find(element => element.text === 'note')!
      commands.mockImplementation(async (method, params, sessionId) => {
        const result = await originalSend(method, params, sessionId)
        if (method === 'Input.dispatchKeyEvent' && params?.type === 'keyDown')
          await connection.stop('host-takeover')
        return result
      })
      await expect(cdp.mutate(current, { operation: 'type', text: 'must never be inserted', clear: true }, connection.assertCurrent)).rejects.toThrow('host-takeover')
      expect(connection.ownedInputCount()).toBe(0)
      expect(revoked).toEqual(['host-takeover'])
      expect(await page.getByRole('textbox', { name: 'note', exact: true }).inputValue()).toBe('中文🙂保持原值')
      expect(commands.mock.calls.filter(([method, params]) => method === 'Input.dispatchKeyEvent' && params?.type === 'keyUp')).toHaveLength(2)
      cdp.close()
      const next = await connectAuthorizedBrowser(target, [origin], reason => revoked.push(reason))
      connections.push(next)
      const epoch = next.documentEpoch()
      await page.goto(`${origin}/changed`)
      await vi.waitFor(() => expect(next.documentEpoch()).toBeGreaterThan(epoch))
      expect(() => next.assertCurrent(epoch)).toThrow('DOCUMENT_CHANGED')
      expect(() => next.assertCurrent()).not.toThrow()
      const currentTarget = (await inspectAuthorizedBrowser(endpoint)).find(item => item.id === target.id)!
      expect(currentTarget.fingerprint).not.toBe(target.fingerprint)
      await expect(connectAuthorizedBrowser(target, [origin], () => {})).rejects.toThrow('SELECTED_DOCUMENT_CHANGED')
      await page.goto(foreignOrigin)
      await vi.waitFor(() => expect(revoked).toContain('AUTHORIZED_BROWSER_ORIGIN_NOT_GRANTED'))
      expect(() => next.assertCurrent()).toThrow()
      await page.goto(`${origin}/changed`)
      expect(page.isClosed()).toBe(false)

      const audit: Record<string, unknown>[] = []
      const errors: unknown[] = []
      const approve = vi.fn(async (_request: LifeInterfaceRiskRequest) => ({ allow: true, reason: 'host-approved' }))
      const stopWork = vi.fn(async (_cardId: string) => {})
      let cardId = 'alice'
      const manager = createLifeAuthorizedBrowserRuntime({ ownerId: () => cardId, authorize: approve, stopWork, uploadRoot: join(root, 'uploads'), audit: async (event) => { audit.push(event) }, onError: error => errors.push(error) })
      runtime = manager
      const grantCurrent = async () => {
        const inspected = await manager.command({ cardId, action: 'inspect', endpoint })
        expect(inspected.inspection?.tabs).not.toHaveLength(0)
        return manager.command({ cardId, action: 'grant', inspectionId: inspected.inspection!.id, tabId: target.id, origins: [origin] })
      }
      expect((await grantCurrent()).status).toBe('connected')
      const workStopsBeforeTakeover = stopWork.mock.calls.length
      const read = await manager.withSession(() => manager.readPage({ format: 'interactables' }))
      expect(read).toMatchObject({ status: 'completed', executionScope: 'explicit-selected-page-and-origins' })
      expect(JSON.stringify(read)).not.toContain('UNGRANTED_CHILD_SECRET')
      expect(JSON.stringify(read)).not.toContain('PRIVATE_FORM_TOKEN')
      expect(JSON.stringify(read)).not.toContain('formPreview')
      const save = (read as { elements: Array<{ text: string, selector: string }> }).elements.find(element => element.text === 'Save note')!
      approve.mockResolvedValueOnce({ allow: false, reason: 'host-denied' })
      expect(await manager.clickElement({ selector: save.selector })).toMatchObject({ errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST', effectMayHaveOccurred: false })
      expect(approve.mock.lastCall?.[0].previewText).toContain('note: ')
      expect(approve.mock.lastCall?.[0].previewText).toContain('Choose a kind: One')
      expect(approve.mock.lastCall?.[0].previewText).not.toContain('PRIVATE_FORM_TOKEN')
      const note = (read as { elements: Array<{ text: string, selector: string }> }).elements.find(element => element.text === 'note')!
      let approveLate!: (result: { allow: boolean, reason: string }) => void
      approve.mockImplementationOnce(() => new Promise((resolve) => { approveLate = resolve }))
      const typing = manager.withSession(() => manager.typeBrowserText({ selector: note.selector, text: 'revoked approval must never type', clearExisting: true }))
      await vi.waitFor(() => expect(approveLate).toBeTypeOf('function'))
      const takeover = manager.command({ cardId, action: 'takeover' })
      await vi.waitFor(() => expect(manager.state().status).not.toBe('connected'))
      approveLate({ allow: true, reason: 'approval-arrived-after-revocation' })
      expect(await typing).toMatchObject({ status: 'failed', effectMayHaveOccurred: false })
      await takeover
      expect(await page.getByRole('textbox', { name: 'note', exact: true }).inputValue()).toBe('')
      expect(audit.filter(event => event.action === 'revoked')).toHaveLength(1)
      expect(stopWork).toHaveBeenCalledTimes(workStopsBeforeTakeover + 1)
      await grantCurrent()
      const gate = new Promise<void>((resolve) => { releaseOld = resolve })
      const oldSession = manager.withSession(async () => { await gate; return manager.readPage({}) })
      await manager.command({ cardId, action: 'revoke' })
      await grantCurrent()
      releaseOld!()
      expect(await oldSession).toMatchObject({ status: 'failed', errorCode: 'AUTHORIZED_BROWSER_GRANT_REVOKED', effectMayHaveOccurred: false })
      expect(await manager.withSession(() => manager.readPage({}))).toMatchObject({ status: 'completed' })
      cardId = 'bob'
      expect(await manager.readPage({})).toMatchObject({ status: 'failed', errorCode: 'AUTHORIZED_BROWSER_GRANT_REQUIRED' })
      await expect(manager.command({ cardId: 'alice', action: 'status' })).rejects.toThrow('CARD_CHANGED')
      cardId = 'alice'
      await manager.command({ cardId, action: 'managed' })
      expect(manager.state()).toMatchObject({ mode: 'managed', status: 'managed' })
      expect(page.isClosed()).toBe(false)
      expect(errors).toEqual([])
    }
    finally {
      releaseOld?.()
      await runtime?.close()
      await Promise.allSettled(connections.map(connection => connection.stop()))
      await context.close()
      server.closeAllConnections()
      foreign.closeAllConnections()
      await Promise.all([new Promise<void>(resolve => server.close(() => resolve())), new Promise<void>(resolve => foreign.close(() => resolve()))])
      await rm(root, { recursive: true, force: true })
    }
  }, 45000)
})
