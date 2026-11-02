import type { BrowserDownloadReceipt } from '../../src/main/services/alicization/execution/browser-downloads'

import assert from 'node:assert/strict'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { lstat, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { app, BrowserWindow, screen } from 'electron'

import { createLifeWindowsBrowserRuntime } from '../../src/main/services/alicization/life-windows-browser-runtime'

/** Direct host integration, not a model/UI acceptance or a life-state fixture. */
export async function runManagedPopupNativeChecks(input: { root: string, workspace: string }) {
  const root = resolve(input.root)
  assert.equal(dirname(root), resolve(input.workspace, 'output'))
  assert.match(root.split(/[/\\]/u).at(-1)!, /^managed-popup-native-[a-f0-9]{32}$/u)
  assert.equal((await lstat(root)).isSymbolicLink(), false)
  const owner = JSON.parse(await readFile(join(root, 'owner.json'), 'utf8'))
  assert.equal(owner.format, 'alicization-owned-popup-native-v1')
  assert.equal(resolve(owner.workspace), resolve(input.workspace))
  await app.whenReady()
  const report = { format: 'alicization-managed-popup-native-v1', scope: 'Actual Electron WebContents, popup creation, native download GUIDs and actual files through the production browser adapter. Synthetic bounded host approval; no ordinary-model or root-goal acceptance claim.', passed: false, checks: [] as string[], rounds: [] as unknown[], failure: null as string | null, windowsClosed: false }
  const receipts: BrowserDownloadReceipt[] = []
  const reservations: unknown[] = []
  const diagnostics: string[] = []
  const ownerId = `popup-native-${randomUUID()}`
  let ownedWindow: BrowserWindow | undefined
  const windows = new Set<BrowserWindow>()
  const displays = screen.getAllDisplays().map(display => display.bounds)
  const payload = (round: number) => `Actual native popup bytes ${round} 中文🙂\n`
  const server = createServer((request, response) => {
    const url = new URL(request.url!, 'http://127.0.0.1')
    const round = Number(url.searchParams.get('round'))
    if (url.pathname === '/download' || url.pathname === '/slow') {
      response.setHeader('content-type', 'application/octet-stream')
      response.setHeader('content-disposition', 'attachment; filename="same-name.txt"')
      if (url.pathname === '/download') {
        response.end(payload(round))
        return
      }
      response.setHeader('content-length', 4 * 1024 * 1024)
      const timer = setInterval(() => response.write(Buffer.alloc(1024, 'x')), 50)
      response.once('close', () => clearInterval(timer))
      return
    }
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(url.pathname === '/child'
      ? `<title>Owned popup ${round}</title><h1>资料 ${round}</h1><a href="/download?round=${round}">下载资料</a><a href="/slow?round=${round}">慢下载</a>`
      : `<title>Owned opener ${round}</title><h1>原始页面 ${round}</h1><a href="/child?round=${round}${round === 2 ? '#reviewed-route' : ''}" target="_blank">打开资料</a><a href="/download?round=${round}" target="_blank">直接弹窗下载</a>`)
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  const origin = `http://127.0.0.1:${address.port}`
  function check(value: unknown, name: string): asserts value {
    assert.ok(value, name)
    report.checks.push(name)
  }
  async function waitFor<T>(read: () => Promise<T | null> | T | null, name: string): Promise<T> {
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      const result = await read()
      if (result)
        return result
      await delay(50)
    }
    throw new Error(name)
  }
  function observeWindows() {
    for (const candidate of BrowserWindow.getAllWindows()) {
      let ancestor: BrowserWindow | null = candidate
      for (let depth = 0; ancestor && depth < 5; depth++) {
        if (ancestor === ownedWindow) {
          windows.add(candidate)
          break
        }
        ancestor = ancestor.getParentWindow()
      }
    }
    for (const window of windows) {
      if (window.isDestroyed())
        continue
      const bounds = window.getBounds()
      check(!window.isFocusable() && !window.isFocused() && !displays.some(display => bounds.x < display.x + display.width && bounds.x + bounds.width > display.x && bounds.y < display.y + display.height && bounds.y + bounds.height > display.y), 'Every actual owned browser window stays outside every display and cannot take focus')
    }
  }
  const adapter = createLifeWindowsBrowserRuntime({
    ownerId: () => ownerId,
    createWindow: () => {
      ownedWindow = new BrowserWindow({ show: false, focusable: false, x: Math.max(...displays.map(display => display.x + display.width)) + 128, y: Math.min(...displays.map(display => display.y)) + 128, width: 900, height: 680, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: `popup-native-${randomUUID()}` } })
      windows.add(ownedWindow)
      return ownedWindow
    },
    downloadRoot: join(root, 'downloads'),
    allowHostInterfaceReservations: true,
    recordDownload: async (receipt) => {
      receipts.push(structuredClone(receipt))
      await writeFile(join(root, `receipt-${receipt.id}.json`), JSON.stringify(receipt, null, 2))
    },
    recordDownloadReservation: async (reservation, end) => {
      const record = { reservation, end }
      reservations.push(record)
      const bytes = JSON.stringify(record, null, 2)
      await writeFile(join(root, `reservation-${createHash('sha256').update(bytes).digest('hex')}.json`), bytes)
    },
    authorize: async request => ({ allow: new URL(request.targetId).origin === origin && ['browser_click_element', 'browser_type_text'].includes(request.operation), reason: 'bounded-owned-fixture-host-approval' }),
    onError: error => diagnostics.push(String(error).slice(0, 512)),
  })
  async function page() {
    const result = await adapter.readPage({ format: 'interactables' })
    assert.equal(result.status, 'completed', JSON.stringify(result))
    return result as { elements: Array<{ selector: string, text: string }>, surfaces: Array<{ id: string, parentId: string | null, selected: boolean }>, transfers: BrowserDownloadReceipt[], text: string, url: string }
  }
  async function click(text: string) {
    const observation = await page()
    const targets = observation.elements.filter(element => element.text === text)
    assert.equal(targets.length, 1)
    const result = await adapter.clickElement({ selector: targets[0]!.selector })
    assert.equal(result.status, 'completed', JSON.stringify(result))
    return result as { browserActionId: string, downloadReservationId: string }
  }
  async function child(round: number) {
    await click('打开资料')
    const ready = await adapter.waitForBrowser({ text: `资料 ${round}`, timeoutMs: 5000 })
    assert.equal(ready.status, 'completed', JSON.stringify(ready))
    const observation = await page()
    check(observation.surfaces.length === 2 && observation.surfaces.filter(surface => surface.selected && surface.parentId).length === 1, 'A fresh observation selects the one actually created owned popup')
    check(observation.url === `${origin}/child?round=${round}${round === 2 ? '#reviewed-route' : ''}`, 'The actual selected popup preserves its exact reviewed URL including the client-side route')
    observeWindows()
    const selected = BrowserWindow.getAllWindows().find(window => window.getParentWindow() === ownedWindow)
    assert.ok(selected)
    return selected
  }
  try {
    for (const round of [1, 2, 3]) {
      assert.equal((await adapter.openUrl({ url: `${origin}/?round=${round}` })).status, 'completed')
      const popup = await child(round)
      const popupWindowId = popup.id
      const saved = await click('下载资料')
      const receipt = await waitFor(() => receipts.find(receipt => receipt.actionId === saved.browserActionId && receipt.state === 'completed') ?? null, 'The actual popup download did not complete')
      check(await readFile(receipt.path, 'utf8') === payload(round) && receipt.sha256 === createHash('sha256').update(payload(round)).digest('hex'), 'Independent native file bytes and digest agree with this exact popup download')
      popup.close()
      await waitFor(() => popup.isDestroyed() || null, 'The actual host close did not destroy its owned child')
      check((await page()).surfaces.length === 1 && !ownedWindow!.isDestroyed(), 'Closing the child returns to the same opener without manufacturing another browser')
      const direct = await click('直接弹窗下载')
      const directReceipt = await waitFor(() => receipts.find(receipt => receipt.actionId === direct.browserActionId && receipt.state === 'completed') ?? null, 'Direct target-blank download did not complete')
      check(await readFile(directReceipt.path, 'utf8') === payload(round) && directReceipt.id !== receipt.id && directReceipt.path !== receipt.path, 'Same-named direct popup downloads remain distinct actual transfers and files')
      observeWindows()
      for (const window of [...windows]) {
        if (!window.isDestroyed() && window !== ownedWindow)
          window.close()
      }
      await adapter.waitForBrowser({ text: `原始页面 ${round}`, timeoutMs: 5000 })
      const slowPopup = await child(round)
      const slow = await click('慢下载')
      await waitFor(async () => (await page()).transfers.find(receipt => receipt.actionId === slow.browserActionId && receipt.state === 'progressing') ?? null, 'The native slow download never started')
      slowPopup.close()
      const interrupted = await waitFor(() => receipts.find(receipt => receipt.actionId === slow.browserActionId && receipt.state !== 'progressing') ?? null, 'Closing the owned popup did not finish native cancellation')
      check(interrupted.state !== 'completed' && interrupted.sha256 === null, 'Closing a popup during a real transfer never certifies completion')
      await adapter.drainDownloads()
      check(adapter.downloadWriterStopped(ownerId, slow.downloadReservationId), 'The original native download writer actually stops before its ownership is released')
      report.rounds.push({ round, popupWindowId, receipt, directReceipt, interrupted })
    }
    check(receipts.filter(receipt => receipt.state === 'completed').length === 6, 'Three rounds retain exactly six completed native transfers')
    report.passed = true
  }
  catch (error) {
    report.failure = String(error)
    throw error
  }
  finally {
    await adapter.close()
    await adapter.drainDownloads()
    report.windowsClosed = [...windows].every(window => window.isDestroyed())
    if (!report.windowsClosed)
      report.passed = false
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
    await writeFile(join(root, 'native-report.json'), JSON.stringify({ ...report, diagnostics }, null, 2), { flag: 'wx' })
  }
  return report
}
