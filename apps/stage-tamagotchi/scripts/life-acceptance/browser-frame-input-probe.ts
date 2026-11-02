import assert from 'node:assert/strict'
import process, { env } from 'node:process'

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'

import { errorMessageFrom } from '@moeru/std'
import { app, BrowserWindow } from 'electron'

import { createLifeWindowsBrowserRuntime } from '../../src/main/services/alicization/life-windows-browser-runtime'

if (!env.LIFE_QA_PRIVATE_DESKTOP?.startsWith('AlicizationQA_') || !env.LIFE_QA_PROCESS_REGISTRY)
  throw new Error('A registered private desktop is required for frame input acceptance')
const root = resolve(env.LIFE_FRAME_PROBE_ROOT || `output/execution-browser-frames/${randomUUID()}`)
if (!root.startsWith(`${resolve('output')}${sep}`))
  throw new Error('Frame evidence must remain in the workspace output directory')
const profile = mkdtempSync(join(tmpdir(), 'alicization-life-browser-frames-'))
app.setPath('userData', profile)
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('site-per-process')
app.on('window-all-closed', () => {})
writeFileSync(join(profile, 'alicization-qa-owner.json'), JSON.stringify({ owner: 'browser-frame-input-probe', root, profile, pid: process.pid }))

async function main() {
  const checks: string[] = []
  const errors: string[] = []
  let port = 0
  const inner = '<style>body{margin:16px}button{width:120px;height:36px}</style><textarea id="note" aria-label="深层字段"></textarea><button id="save">深层保存</button><button id="other">相邻操作</button><script>window.saved=0;window.other=0;document.querySelector("#save").onclick=e=>{if(e.isTrusted)window.saved++};document.querySelector("#other").onclick=e=>{if(e.isTrusted)window.other++}</script>'
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    if (request.url === '/inner')
      response.end(inner)
    else if (request.url === '/outer')
      response.end(`<input aria-label="中层字段"><iframe style="width:500px;height:280px;border:6px solid black;margin:18px" src="http://127.0.0.1:${port}/inner"></iframe>`)
    else
      response.end(`<input aria-label="顶层字段"><iframe style="width:740px;height:440px;border:8px solid black;margin:20px;transform:scale(.9);transform-origin:top left" src="http://localhost:${port}/outer"></iframe>`)
  })
  let adapter: ReturnType<typeof createLifeWindowsBrowserRuntime> | undefined
  let desktopProof: Record<string, unknown> | undefined
  let failure: string | undefined
  const frameProcesses: number[][] = []
  const check = (name: string, value: unknown) => {
    console.info(name, value ? 'passed' : 'FAILED')
    assert(value, name)
    checks.push(name)
    writeFileSync(join(root, 'checkpoint.json'), JSON.stringify({ checks, errors, frameProcesses, profile }))
  }
  try {
    await app.whenReady()
    await mkdir(root, { recursive: true })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as { port: number }).port
    adapter = createLifeWindowsBrowserRuntime({ ownerId: () => 'synthetic-nested-frame', onError: error => errors.push(errorMessageFrom(error)) })
    for (let round = 1; round <= 3; round++) {
      check(`${round}:open`, (await adapter.openUrl({ url: `http://127.0.0.1:${port}/` })).status === 'completed')
      const contents = BrowserWindow.getAllWindows()[0]!.webContents
      if (!desktopProof) {
        desktopProof = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', resolve('apps/stage-tamagotchi/scripts/life-acceptance/assert-private-desktop.ps1'), '-ExpectedDesktop', env.LIFE_QA_PRIVATE_DESKTOP!, '-RuntimePid', String(process.pid)], { encoding: 'utf8', windowsHide: true, timeout: 15000 }))
        await appendFile(env.LIFE_QA_PROCESS_REGISTRY!, `${JSON.stringify({ pid: process.pid, executable: process.execPath, profile, ...desktopProof })}\n`)
        check('actual-private-window', desktopProof?.runtimeWindowVerified === true)
        if (env.LIFE_FRAME_PROBE_FAULT === 'after-private-window')
          throw new Error('Intentional frame-probe failure after private runtime registration')
      }
      const deadline = Date.now() + 15000
      let observed: Awaited<ReturnType<typeof adapter.readPage>> | undefined
      do {
        observed = await adapter.readPage({ format: 'interactables' })
        if ('elements' in observed && observed.elements.some(element => element.text === '深层字段'))
          break
        await new Promise(resolve => setTimeout(resolve, 50))
      } while (Date.now() < deadline)
      const reference = async (name: string) => {
        const view = await adapter!.readPage({ format: 'interactables' })
        assert('elements' in view, JSON.stringify(view))
        const matches = view.elements.filter(element => element.text === name)
        assert.equal(matches.length, 1, JSON.stringify(view))
        return matches[0]!.selector
      }
      const frames = contents.mainFrame.framesInSubtree
      frameProcesses.push(frames.map(frame => frame.processId))
      check(`${round}:actual-oopif`, new Set(frames.map(frame => frame.processId)).size >= 2)
      const deep = frames.find(frame => frame.url === `http://127.0.0.1:${port}/inner`)!
      check(`${round}:nested-document-present`, Boolean(deep))
      const text = `第${round}轮：雨声🙂 & $()\n第二行`
      const typed = await adapter.typeBrowserText({ selector: await reference('深层字段'), text, clearExisting: true })
      check(`${round}:trusted-nested-type:${JSON.stringify(typed)}`, typed.status === 'completed')
      check(`${round}:exact-unicode-and-newline`, await deep.executeJavaScript('document.querySelector("#note").value') === text)
      check(`${round}:parent-field-untouched`, await contents.executeJavaScript('document.querySelector("input").value') === '')
      const clicked = await adapter.clickElement({ selector: await reference('深层保存') })
      check(`${round}:trusted-nested-click:${JSON.stringify(clicked)}`, clicked.status === 'completed')
      check(`${round}:actual-one-click`, await deep.executeJavaScript('window.saved===1 && window.other===0'))
      check(`${round}:move-pointer-away-in-the-same-child-widget`, (await adapter.clickElement({ selector: await reference('相邻操作') })).status === 'completed')
      await deep.executeJavaScript(`document.querySelector('#save').addEventListener('mouseenter', () => { const s=document.querySelector('#save'),o=document.querySelector('#other');o.style.position='absolute';o.style.left=s.offsetLeft+'px';o.style.top=s.offsetTop+'px';s.style.transform='translateY(90px)' },{once:true})`)
      const moved = await adapter.clickElement({ selector: await reference('深层保存') })
      const hoverState = await deep.executeJavaScript('({saved:window.saved,other:window.other,transform:document.querySelector("#save").style.transform})')
      check(`${round}:hover-handler-actually-ran:${JSON.stringify(hoverState)}`, hoverState.transform === 'translateY(90px)')
      check(`${round}:hover-move-rejected:${JSON.stringify(moved)}`, moved.status === 'failed')
      check(`${round}:neighbor-not-clicked`, hoverState.saved === 1 && hoverState.other === 1)
    }
    check('no-unhandled-adapter-error', errors.length === 0)
  }
  catch (error) {
    failure = errorMessageFrom(error)
    console.error('Frame probe failed before cleanup:', failure)
    writeFileSync(join(root, 'failure.json'), JSON.stringify({ failure, checks, errors, frameProcesses, profile }))
  }
  finally {
    try {
      await adapter?.close()
    }
    catch (error) {
      failure ??= `Frame cleanup failed: ${errorMessageFrom(error)}`
    }
    server.closeAllConnections()
    if (server.listening)
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    const windowsClosed = BrowserWindow.getAllWindows().length === 0
    if (!windowsClosed)
      failure ??= 'Owned native windows did not close'
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'report.json'), JSON.stringify({ format: 'alicization-nested-frame-native-v1', passed: !failure && windowsClosed, scope: 'Owned local nested OOPIFs on a private desktop; does not attest physical host keyboard or all browser permissions.', checks, errors, failure, profile, desktopProof, frameProcesses, windowsClosed }, null, 2))
    if (failure) {
      console.error(failure)
      app.exit(1)
    }
    else { app.quit() }
  }
}
void main().catch((error) => {
  console.error(errorMessageFrom(error))
  app.exit(1)
})
