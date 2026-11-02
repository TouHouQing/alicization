import type { setupAlicizationDb } from '../../src/main/services/alicization/db'
import type { BrowserDownloadReceipt } from '../../src/main/services/alicization/execution/browser-downloads'
import type { LifeEffect } from '../../src/shared/life-contracts'

import assert from 'node:assert/strict'
import process, { env } from 'node:process'

import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { app, BrowserWindow } from 'electron'

import { createExecutionInterruptRegistry } from '../../src/main/services/alicization/execution-interrupt-registry'
import { readBrowserDownloads, recordBrowserDownload } from '../../src/main/services/alicization/execution/browser-download-repository'
import { downloadRequestIdentity, recordBrowserDownloadReservation } from '../../src/main/services/alicization/execution/browser-download-reservations'
import { readBrowserDownloadQuarantines } from '../../src/main/services/alicization/execution/browser-download-resource-recovery'
import { createInterfaceEffectRecovery } from '../../src/main/services/alicization/execution/interface-effect-recovery'
import { createExecutionResourceBroker, executionFileResources } from '../../src/main/services/alicization/execution/resource-broker'
import { createWorkPlanExecutionRuntime } from '../../src/main/services/alicization/execution/work-plan-execution-runtime'
import { createLifeTurnRuntime } from '../../src/main/services/alicization/life-turn-runtime'
import { createLifeWindowsBrowserRuntime } from '../../src/main/services/alicization/life-windows-browser-runtime'

if (!env.LIFE_QA_PRIVATE_DESKTOP?.startsWith('AlicizationQA_'))
  throw new Error('A private desktop is required for the native browser probe')
const root = resolve(env.LIFE_BROWSER_PROBE_ROOT || `output/execution-browser-native-20261020/${randomUUID()}`)
const profile = mkdtempSync(join(tmpdir(), 'alicization-life-browser-execution-'))
app.setPath('userData', profile)
app.disableHardwareAcceleration()
// This probe owns shutdown. Closing its last hidden window must not exit
// Electron before snapshot cleanup and the final report have settled.
app.on('window-all-closed', () => {})
writeFileSync(join(profile, 'alicization-qa-owner.json'), JSON.stringify({ owner: 'browser-execution-probe', root, profile, pid: process.pid, createdAt: Date.now() }))

async function main() {
  const checks: string[] = []
  const errors: string[] = []
  const transfers = new Map<string, BrowserDownloadReceipt>()
  const reservations = new Map<string, string>()
  const requestedReservations = new Set<string>()
  const browserBinding = { kind: 'managed' as const, id: randomUUID() }
  const payload = '真实 Electron 下载，独立读回。'
  let submissions = 0
  const uploaded: string[] = []
  let desktopProof: Record<string, unknown> | null = null
  let approveUpload = false
  const requests: string[] = []
  const server = createServer((request, response) => {
    const url = new URL(request.url!, 'http://127.0.0.1')
    requests.push(url.pathname)
    if (url.pathname === '/upload') {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
        body += chunk
      })
      request.on('end', () => {
        uploaded.push(body)
        response.end('received')
      })
    }
    else if (['/download', '/download-slow', '/download-goal', '/download-held'].includes(url.pathname)) {
      const requestIdentity = downloadRequestIdentity(`http://${request.headers.host}${request.url}`)
      const matching = [...reservations].filter(([id, hash]) => hash === requestIdentity.hash && !requestedReservations.has(id))
      if (matching.length !== 1) {
        errors.push('download request reached the server before durable reservation')
        response.writeHead(409).end()
        return
      }
      requestedReservations.add(matching[0]![0])
      response.setHeader('content-disposition', 'attachment; filename="same.txt"')
      response.setHeader('content-type', 'application/octet-stream')
      if (url.pathname === '/download-held') {
        // Send enough actual bytes for the browser to start its native download,
        // then hold the rest until the host cancels this exact writer.
        response.setHeader('content-length', String(4 * 1024 * 1024))
        response.write(Buffer.alloc(65536, 'partial'))
      }
      else if (url.pathname === '/download-slow') {
        response.setHeader('content-length', String(4 * 1024 * 1024))
        const chunk = Buffer.alloc(32768, 'x')
        let sent = 0
        const timer = setInterval(() => {
          response.write(chunk)
          sent += chunk.length
          if (sent >= 4 * 1024 * 1024) {
            clearInterval(timer)
            response.end()
          }
        }, 40)
        response.once('close', () => clearInterval(timer))
      }
      else if (url.pathname === '/download-goal') {
        response.setHeader('content-length', String(Buffer.byteLength(payload)))
        response.write(Buffer.from(payload).subarray(0, 3))
        const timer = setTimeout(() => response.end(Buffer.from(payload).subarray(3)), 1800)
        response.once('close', () => clearTimeout(timer))
      }
      else {
        response.end(payload)
      }
    }
    else if (url.pathname === '/result') {
      submissions++
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(`<h1>已接收</h1><p>${url.searchParams.get('note')?.replace(/[<>&]/gu, '')}</p><a id="download" href="/download">下载回执</a><a href="/download-slow">慢速下载</a><a href="/download-goal">下载目标</a><a href="/download-held">取消下载目标</a><input id="attachment" type="file" aria-label="附件"><script>document.querySelector('#attachment').addEventListener('change', async event => { try { globalThis.uploadSelected = { name:event.target.files[0].name, size:event.target.files[0].size }; const bytes = await event.target.files[0].arrayBuffer(); await fetch('/upload', {method:'POST', body:bytes}) } catch(error) { globalThis.uploadError = String(error) } })</script>`)
    }
    else {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end('<form action="/result"><textarea id="note" name="note" placeholder="笔记"></textarea><button id="send">确认</button></form><script>globalThis.qaInputs = 0; document.addEventListener("input", e => { globalThis.qaInputs++; document.querySelector("#note").dataset.trusted = String(e.isTrusted) })</script>')
    }
  })
  let adapter: ReturnType<typeof createLifeWindowsBrowserRuntime> | undefined
  let database: Awaited<ReturnType<typeof setupAlicizationDb>> | undefined
  let work: ReturnType<typeof createWorkPlanExecutionRuntime> | undefined
  let evidence: Record<string, unknown> | null = null
  try {
    await app.whenReady()
    await mkdir(root, { recursive: true })
    console.info(`Browser probe evidence: ${root}`)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as { port: number }).port
    const { setupAlicizationDb } = await import('../../src/main/services/alicization/db')
    database = await setupAlicizationDb(join(root, 'db'), { cardId: 'synthetic-browser-probe' })
    const broker = createExecutionResourceBroker()
    adapter = createLifeWindowsBrowserRuntime({ ownerId: () => 'synthetic-browser-probe', resourceBroker: () => broker, authorize: async () => ({ allow: approveUpload, reason: approveUpload ? 'synthetic-host-approved' : 'host-denied' }), downloadRoot: join(root, 'downloads'), allowHostInterfaceReservations: true, recordDownloadReservation: async (reservation, end) => {
      await recordBrowserDownloadReservation(database!, reservation, { root: join(root, 'downloads'), allowHostInterface: true }, end)
      if (end)
        reservations.delete(reservation.id)
      else
        reservations.set(reservation.id, reservation.requestHash)
    }, recordDownload: async (receipt) => {
      await recordBrowserDownload(database!, receipt)
      transfers.set(receipt.id, structuredClone(receipt))
      if (receipt.state !== 'progressing')
        setImmediate(() => { void work?.notifyDownload('synthetic-browser-probe').catch(error => errors.push(String(error))) })
    }, readDownloads: () => readBrowserDownloads(database!), onError: error => errors.push(String(error)) })
    work = createWorkPlanExecutionRuntime({ getDatabase: () => database!, enabled: () => true, captureBrowserBinding: () => browserBinding, isBrowserBindingCurrent: current => current?.kind === 'managed' && current.id === browserBinding.id, broker, interrupts: createExecutionInterruptRegistry(broker), stopChildEffects: (cardId, effectIds) => adapter!.cancelEffectDownloads(cardId, effectIds), tools: { 'tool.browser_read_page': (input, signal) => adapter!.readPage({ ...input, abortSignal: signal }), 'tool.browser_click_element': (input, signal) => adapter!.clickElement({ selector: String(input.selector), abortSignal: signal }) }, onError: error => errors.push(String(error)) })
    const check = (label: string, value: boolean) => {
      assert(value, label)
      checks.push(label)
    }
    console.info('Browser probe: checking the initial owned connection')
    const health = await adapter.getHealth()
    console.info(`Browser probe: connection ready=${health.ready}; reason=${health.reason}`)
    check('actual-owned-cdp-health-probe', health.available && health.ready && health.reason === null)
    for (let round = 1; round <= 3; round++) {
      check(`round-${round}:open`, (await adapter.openUrl({ url: `http://127.0.0.1:${port}/` })).status === 'completed')
      if (round === 1) {
        desktopProof = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', resolve('apps/stage-tamagotchi/scripts/life-acceptance/assert-private-desktop.ps1'), '-ExpectedDesktop', env.LIFE_QA_PRIVATE_DESKTOP!, '-RuntimePid', String(process.pid)], { encoding: 'utf8', windowsHide: true, timeout: 15000 }))
        if (!env.LIFE_QA_PROCESS_REGISTRY)
          throw new Error('A private runtime registry is required')
        await appendFile(env.LIFE_QA_PROCESS_REGISTRY, `${JSON.stringify({ pid: process.pid, executable: process.execPath, profile, ...desktopProof })}\n`)
        check('native-window-on-private-desktop', desktopProof?.runtimeWindowVerified === true)
      }
      const observed = await adapter.readPage({ format: 'interactables' }) as { elements: Array<{ selector: string, text: string }> }
      const text = `第 ${round} 轮，中文与 emoji 🌧️\n第二行`
      const input = observed.elements.find(item => item.text === '笔记')!
      check(`round-${round}:trusted-input`, (await adapter.typeBrowserText({ selector: input.selector, text, clearExisting: true })).status === 'completed')
      const observedEffect: LifeEffect = { id: `read-${round}`, operationKey: `read-${round}`, kind: 'execute', turnId: `request-${round}`, actionId: 'read', generation: 0, status: 'settled', payload: { capabilityId: 'tool.browser_read_page', parameters: {}, browserBinding }, receipt: { outcome: 'success', output: observed }, leaseUntil: null }
      const uncertain: LifeEffect = { ...observedEffect, id: `type-${round}`, status: 'uncertain', actionId: 'type', payload: { capabilityId: 'tool.browser_type_text', browserBinding, parameters: { selector: input.selector, text, clearExisting: true } }, receipt: null }
      const recovery = createInterfaceEffectRecovery({ isBrowserBindingCurrent: binding => binding?.kind === 'managed' && binding.id === browserBinding.id && BrowserWindow.getAllWindows().length === 1, database: () => ({ readLifeTurnExecutionEffects: async () => [observedEffect, uncertain] }), observeBrowser: () => adapter!.readPage({ format: 'interactables' }), observeDesktop: async () => {
        throw new Error('Wrong recovery surface')
      } })
      const contents = BrowserWindow.getAllWindows()[0]!.webContents
      const inputsBeforeRecovery = await contents.executeJavaScript('globalThis.qaInputs')
      check(`round-${round}:lost-type-receipt-reconciled`, (await recovery(uncertain)).verdict === 'applied')
      check(`round-${round}:recovery-never-retypes`, await contents.executeJavaScript('globalThis.qaInputs') === inputsBeforeRecovery)
      await contents.executeJavaScript('const original = document.querySelector("#note"); const replacement = original.cloneNode(true); replacement.value = original.value; original.replaceWith(replacement)')
      check(`round-${round}:replaced-control-keeps-unknown`, (await recovery(uncertain)).verdict === 'unknown')
      const filled = await adapter.readPage({ format: 'interactables' }) as unknown as { elements: Array<{ selector: string, text: string, value: string }> }
      check(`round-${round}:readback`, filled.elements.find(item => item.text === '笔记')?.value === text)
      check(`round-${round}:submit`, (await adapter.clickElement({ selector: filled.elements.find(item => item.text === '确认')!.selector })).status === 'completed')
      check(`round-${round}:actual-receipt`, (await adapter.waitForBrowser({ text: '已接收', timeoutMs: 5000 })).status === 'completed' && submissions === round)
      const result = await adapter.readPage({ format: 'interactables' }) as { elements: Array<{ selector: string, text: string }> }
      await BrowserWindow.getAllWindows()[0]!.webContents.executeJavaScript(`globalThis.probeClicks = []; document.addEventListener('click', event => globalThis.probeClicks.push({ target: event.target.tagName, trusted: event.isTrusted, prevented: event.defaultPrevented }))`)
      const click = await adapter.clickElement({ selector: result.elements.find(item => item.text === '下载回执')!.selector })
      check(`round-${round}:download-click`, click.status === 'completed')
      const deadline = Date.now() + 10000
      while ([...transfers.values()].filter(item => item.state === 'completed').length < round && Date.now() < deadline)
        await new Promise(resolve => setTimeout(resolve, 50))
      const completed = [...transfers.values()].filter(item => item.state === 'completed')
      check(`round-${round}:completed-transfer`, completed.length === round)
      const transfer = completed.find(item => item.actionId === ('browserActionId' in click ? click.browserActionId : null))!
      check(`round-${round}:action-binding`, Boolean(transfer))
      check(`round-${round}:file-bytes`, await readFile(transfer.path, 'utf8') === payload)
      check(`round-${round}:hash`, transfer.sha256 === createHash('sha256').update(payload).digest('hex'))
      const source = join(root, `upload-${round}.txt`)
      const uploadText = `已批准的测试附件 ${round} 🌧️\n第二行`
      await writeFile(source, uploadText)
      const beforeUpload = await adapter.readPage({ format: 'interactables' }) as { elements: Array<{ selector: string, text: string }> }
      approveUpload = false
      check(`round-${round}:upload-denial`, (await adapter.uploadBrowserFiles({ selector: beforeUpload.elements.find(item => item.text === '附件')!.selector, files: [source] })).status === 'failed' && uploaded.length === round - 1)
      const approvedUpload = await adapter.readPage({ format: 'interactables' }) as { elements: Array<{ selector: string, text: string }> }
      approveUpload = true
      const selection = await adapter.uploadBrowserFiles({ selector: approvedUpload.elements.find(item => item.text === '附件')!.selector, files: [source] })
      check(`round-${round}:approved-file-selection`, selection.status === 'completed' && 'serverReceiptVerified' in selection && selection.serverReceiptVerified === false)
      const uploadDeadline = Date.now() + 5000
      while (uploaded.length < round && Date.now() < uploadDeadline)
        await new Promise(resolve => setTimeout(resolve, 50))
      check(`round-${round}:actual-upload-bytes`, uploaded[round - 1] === uploadText)
    }
    check('same-name-downloads-remain-distinct', new Set([...transfers.values()].map(item => item.path)).size === 3)
    await adapter.close()
    check('closed-window-released', BrowserWindow.getAllWindows().length === 0)
    check('managed-window-reopens', (await adapter.openUrl({ url: `http://127.0.0.1:${port}/result?note=reopened` })).status === 'completed')
    const reopened = await adapter.readPage({ format: 'interactables' }) as { elements: Array<{ selector: string, text: string }> }
    check('reopened-download-click', (await adapter.clickElement({ selector: reopened.elements.find(item => item.text === '下载回执')!.selector })).status === 'completed')
    const reopenDeadline = Date.now() + 5000
    while ([...transfers.values()].filter(item => item.state === 'completed').length < 4 && Date.now() < reopenDeadline)
      await new Promise(resolve => setTimeout(resolve, 50))
    check('reopened-download-completes', [...transfers.values()].filter(item => item.state === 'completed').length === 4)
    const life = createLifeTurnRuntime({ read: () => database!.readLifeState(), commit: input => database!.commitLifeState(input), getIngress: id => database!.getLifeIngress(id), getEffect: id => database!.getLifeEffect(id), now: Date.now })
    for (let round = 1; round <= 3; round++) {
      const turnId = `native-goal-${round}`
      await life.admit({ cardId: 'synthetic-browser-probe', turnId, conversationId: 'native-probe', messages: [{ role: 'user', content: '下载当前指定报告，按原字节验收。' }] }, new AbortController().signal)
      const criteria: import('../../src/shared/execution-contracts').ExecutionCriterion[] = [{ id: 'download', required: true, proofScope: 'bytes', predicate: { kind: 'browser-download', stepId: 'download', minimumBytes: 1, sha256: createHash('sha256').update(payload).digest('hex') } }]
      if (round === 2)
        criteria.push({ id: 'host-review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '是约定的报告吗？', artifactIds: ['download'] } })
      const accepted = await work.propose({ cardId: 'synthetic-browser-probe', turnId, goal: `真实下载目标 ${round}`, criteria, steps: [
        { id: 'observe', capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, dependsOn: [], acceptanceCriterionIds: [] },
        { id: 'download', capabilityId: 'tool.browser_click_element', input: { selector: 'requires-fresh-observation' }, inputBindings: [{ parameter: 'selector', stepId: 'observe', path: ['elements'], select: { field: 'text', equals: '下载目标', valueField: 'selector' } }], dependsOn: ['observe'], acceptanceCriterionIds: ['download'] },
      ] })
      const deadline = Date.now() + 10_000
      while (work.isActive() && Date.now() < deadline)
        await new Promise(resolve => setTimeout(resolve, 25))
      const initialGoal = (await database.readLifeState()).obligations.find(goal => goal.threadId === accepted.rootThreadId)!
      check(`goal-${round}:activation-alone-not-completion`, initialGoal.status === 'blocked' && initialGoal.verification?.verdict === 'unknown')
      let goal = initialGoal
      while (Date.now() < deadline) {
        goal = (await database.readLifeState()).obligations.find(goal => goal.id === initialGoal.id)!
        const observed = goal.verification?.evidence.criteria
        if (Array.isArray(observed) && observed.some(item => item.id === 'download' && item.verdict === 'satisfied'))
          break
        await new Promise(resolve => setTimeout(resolve, 25))
      }
      const path = await work.downloadArtifact({ cardId: 'synthetic-browser-probe', obligationId: goal.id, expectedGeneration: goal.generation, criterionId: 'download' })
      check(`goal-${round}:artifact-has-actual-native-bytes`, await readFile(path, 'utf8') === payload)
      if (round === 2) {
        check('goal-2:bytes-do-not-imply-host-approval', goal.status === 'blocked')
        check('goal-2:host-reviews-exact-download', (await work.review({ cardId: 'synthetic-browser-probe', obligationId: goal.id, expectedGeneration: goal.generation, contractHash: goal.proof.acceptance!.contractHash, criterionId: 'host-review', approved: true, requestId: 'native-host-review' })).state === 'satisfied')
        goal = (await database.readLifeState()).obligations.find(item => item.id === goal.id)!
      }
      check(`goal-${round}:native-completion-wakes-goal-verification`, goal.status === 'fulfilled')
      await work.notifyDownload('synthetic-browser-probe')
      check(`goal-${round}:verification-never-reclicks`, requests.filter(path => path === '/download-goal').length === round)
    }
    await life.admit({ cardId: 'synthetic-browser-probe', turnId: 'cancel-native-download', conversationId: 'native-probe', messages: [{ role: 'user', content: '下载此报告，随后由我取消。' }] }, new AbortController().signal)
    const cancelledPlan = await work.propose({ cardId: 'synthetic-browser-probe', turnId: 'cancel-native-download', goal: '取消仍在写入的原生下载', criteria: [{ id: 'download', required: true, proofScope: 'bytes', predicate: { kind: 'browser-download', stepId: 'download', minimumBytes: 1 } }], steps: [
      { id: 'observe', capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, dependsOn: [], acceptanceCriterionIds: [] },
      { id: 'download', capabilityId: 'tool.browser_click_element', input: { selector: 'requires-fresh-observation' }, inputBindings: [{ parameter: 'selector', stepId: 'observe', path: ['elements'], select: { field: 'text', equals: '取消下载目标', valueField: 'selector' } }], dependsOn: ['observe'], acceptanceCriterionIds: ['download'] },
    ] })
    const cancelDeadline = Date.now() + 10_000
    while (work.isActive() && Date.now() < cancelDeadline)
      await new Promise(resolve => setTimeout(resolve, 25))
    while (![...transfers.values()].some(item => item.state === 'progressing') && Date.now() < cancelDeadline)
      await new Promise(resolve => setTimeout(resolve, 25))
    check('host-cancel-target-has-a-live-native-download', [...transfers.values()].some(item => item.state === 'progressing'))
    const held = [...transfers.values()].find(item => item.state === 'progressing')!
    const heldResources = await executionFileResources(held.path)
    check('native-child-keeps-its-resource-after-parent-click-settles', broker.snapshot().some(lease => lease.effectId === `browser-download:${held.id}` && lease.resourceOnly === true))
    assert.throws(() => broker.acquire({ owner: 'concurrent-path-write', resources: heldResources }), /another executor/u)
    check('native-child-refuses-concurrent-path-mutation', true)
    const unrelated = broker.acquire({ owner: 'independent-work', resources: ['host:execution'], coordinationOnly: true })
    broker.settle(unrelated, { stopped: true, uncertain: false })
    check('native-child-allows-unrelated-work-to-proceed', true)
    const stopped = await work.stop({ cardId: 'synthetic-browser-probe', planId: cancelledPlan.planId, expectedRevision: 1, requestId: 'native-stop-child-download', action: 'cancel' })
    check('host-cancel-acknowledges-the-native-writer', stopped.state === 'stopped')
    await adapter.drainDownloads()
    check('acknowledged-native-cancellation-releases-only-its-child-resource', !broker.snapshot().some(lease => lease.effectId === `browser-download:${held.id}`))
    check('host-cancel-persists-its-native-result-without-hash', [...transfers.values()].filter(item => item.state === 'cancelled' && item.sha256 === null).length === 1)
    check('host-cancel-keeps-the-root-cancelled', (await database.readLifeState()).obligations.find(goal => goal.threadId === cancelledPlan.rootThreadId)?.status === 'cancelled')
    check('host-cancel-does-not-activate-the-download-again', requests.filter(path => path === '/download-held').length === 1)
    const beforeSlow = await adapter.readPage({ format: 'interactables' }) as { elements: Array<{ selector: string, text: string }> }
    check('slow-download-click', (await adapter.clickElement({ selector: beforeSlow.elements.find(item => item.text === '慢速下载')!.selector })).status === 'completed')
    const slowDeadline = Date.now() + 5000
    while (![...transfers.values()].some(item => item.state === 'progressing') && Date.now() < slowDeadline)
      await new Promise(resolve => setTimeout(resolve, 25))
    check('slow-download-durable-begin', [...transfers.values()].some(item => item.state === 'progressing'))
    await adapter.close()
    await adapter.drainDownloads()
    await work.dispose()
    check('shutdown-persisted-native-download-cancellation', [...transfers.values()].filter(item => item.state === 'cancelled' && item.sha256 === null).length === 2)
    await database.close()
    database = await setupAlicizationDb(join(root, 'db'), { cardId: 'synthetic-browser-probe' })
    check('all-transfer-evidence-survives-database-reopen', (await readBrowserDownloads(database)).filter(item => item.state === 'completed' && item.sha256 === createHash('sha256').update(payload).digest('hex')).length === 7)
    check('download-goal-fulfilment-survives-database-reopen', (await database.readLifeState()).obligations.filter(goal => goal.status === 'fulfilled' && goal.proof.acceptance?.criteria.some(item => item.predicate.kind === 'browser-download')).length === 3)
    check('cancelled-transfer-stays-non-evidence-after-reopen', (await readBrowserDownloads(database)).filter(item => item.state === 'cancelled' && item.sha256 === null).length === 2)
    check('each-network-download-started-from-one-durable-reservation', requestedReservations.size === 9)
    check('stopped-native-owners-do-not-revive-from-history', (await readBrowserDownloadQuarantines(database, 'simulated-next-runtime')).length === 0)
    check('no-native-adapter-errors', errors.length === 0)
    evidence = { passed: true, scope: 'native-Electron-managed-browser-only', checks, transfers: [...transfers.values()], errors, profile, desktop: env.LIFE_QA_PRIVATE_DESKTOP, desktopProof }
  }
  catch (error) {
    await mkdir(root, { recursive: true })
    const contents = BrowserWindow.getAllWindows()[0]?.webContents
    let diagnosticTimer: ReturnType<typeof setTimeout> | undefined
    const clicks = contents?.getURL()
      ? await Promise.race([
          contents.executeJavaScript('({ clicks:globalThis.probeClicks ?? [], uploadError:globalThis.uploadError ?? null, uploadSelected:globalThis.uploadSelected ?? null })').catch(() => []),
          new Promise<never[]>((resolve) => { diagnosticTimer = setTimeout(() => resolve([]), 1000) }),
        ]).finally(() => clearTimeout(diagnosticTimer))
      : []
    await writeFile(join(root, 'report.json'), JSON.stringify({ passed: false, checks, error: String(error), transfers: [...transfers.values()], errors, requests, clicks, profile }, null, 2))
    throw error
  }
  finally {
    await work?.dispose()
    console.info('Browser probe: closing the managed browser')
    await adapter?.close()
    await adapter?.drainDownloads()
    await database?.close()
    console.info('Browser probe: managed browser closed')
    await new Promise<void>(resolve => server.close(() => resolve()))
    console.info('Browser probe: fixture server closed')
  }
  if (evidence)
    await writeFile(join(root, 'report.json'), JSON.stringify(evidence, null, 2))
}

void main().then(() => app.exit(0), (error) => {
  console.error(error)
  app.exit(1)
})
