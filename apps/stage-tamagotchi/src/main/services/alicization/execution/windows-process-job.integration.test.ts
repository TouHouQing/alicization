import type { WindowsProcessJob } from './windows-process-job'

import { Buffer } from 'node:buffer'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execPath, kill, platform } from 'node:process'

import { expect, it } from 'vitest'

import { prepareWindowsProcessJob } from './windows-process-job'

it.skipIf(platform !== 'win32')('preserves native argv/stdin and rejects withdrawn authority before resuming the actual process', async () => {
  const root = await mkdtemp(join(tmpdir(), 'owned-process-job-bridge-'))
  try {
    const text = '中文 "quoted" \\ trailing\\\n第二行'
    const target = join(root, 'actual.json')
    const args = ['-e', 'let text="";process.stdin.setEncoding("utf8");process.stdin.on("data",x=>text+=x);process.stdin.on("end",()=>{require("node:fs").writeFileSync(process.argv[1],JSON.stringify({args:process.argv.slice(2),text}));process.stdout.write("native-finished")})', target, text, '']
    const prepare = () => prepareWindowsProcessJob({ command: execPath, args, cwd: root, env: process.env, owner: 'owned-bridge-fixture', protectedRoot: join(root, 'native') })
    const prepared = await prepare()
    const job = prepared.start(async () => true)
    let stdout = ''
    job.child.stdout?.setEncoding('utf8').on('data', chunk => stdout += chunk)
    job.child.stdin?.end(text)
    const outcome = await job.completion
    expect(outcome).toMatchObject({ treeStopped: true, dispatchRefused: false, receipt: { started: true, exitCode: 0, reason: 'completed', errorCode: null, activeProcesses: 0 } })
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual({ args: [text, ''], text })
    expect(stdout).toBe('native-finished')
    expect(() => prepared.start(async () => true)).toThrow('ALREADY_STARTED')
    await rm(target)
    const revoked = (await prepare()).start(async () => false)
    revoked.child.stdin?.end()
    expect(await revoked.completion).toMatchObject({ treeStopped: true, dispatchRefused: true, receipt: { started: false, activeProcesses: 0 } })
    await expect(readFile(target)).rejects.toMatchObject({ code: 'ENOENT' })
    // On-disk receipts and owner metadata never contain the control key/input.
    expect((await readFile(join(outcome.journalRoot, 'owner.json'))).includes(Buffer.from(text))).toBe(false)
  }
  finally { await rm(root, { recursive: true, force: true }) }
}, 30_000)

it.skipIf(platform !== 'win32').each([false, true])('stops an actual detached descendant without stopping another owned job (force=%s)', async (force) => {
  const root = await mkdtemp(join(tmpdir(), 'owned-process-job-tree-'))
  const active: WindowsProcessJob[] = []
  const delay = (ms: number) => new Promise<void>(resolveDelay => setTimeout(resolveDelay, ms))
  const waitFile = async (path: string) => {
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const text = await readFile(path, 'utf8').catch(() => null)
      if (text)
        return Number(text)
      await delay(20)
    }
    throw new Error('Owned native child did not become ready')
  }
  try {
    const ready = join(root, 'detached.pid')
    const late = join(root, 'forbidden-after-cancel.txt')
    const peerReady = join(root, 'peer.pid')
    const childScript = `require('node:fs').writeFileSync(${JSON.stringify(ready)},String(process.pid));setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(late)},'must not happen'),15000)`
    const parentScript = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childScript)}],{detached:true,stdio:'ignore',windowsHide:true});setInterval(()=>{},1000)`
    const peerScript = `require('node:fs').writeFileSync(${JSON.stringify(peerReady)},String(process.pid));setInterval(()=>{},1000)`
    const prepare = (script: string) => prepareWindowsProcessJob({ command: execPath, args: ['-e', script], cwd: root, env: process.env, owner: 'owned-detached-tree-fixture', protectedRoot: join(root, 'native') })
    const peer = (await prepare(peerScript)).start(async () => true)
    active.push(peer)
    peer.child.stdin?.end()
    const peerPid = await waitFile(peerReady)
    const target = (await prepare(parentScript)).start(async () => true)
    active.push(target)
    target.child.stdin?.end()
    const descendantPid = await waitFile(ready)
    expect(() => kill(descendantPid, 0)).not.toThrow()
    target.stop('owned-test-cancel', force)
    const result = await target.completion
    expect(result.treeStopped).toBe(!force)
    expect(result.receipt === null).toBe(force)
    expect(result.dispatchRefused).toBe(false)
    // Guard death closes the kernel Job even without a trusted final receipt.
    const deadline = Date.now() + 5000
    let alive = true
    while (alive && Date.now() < deadline) {
      try { kill(descendantPid, 0) }
      catch { alive = false }
      if (alive)
        await delay(20)
    }
    expect(alive).toBe(false)
    expect(() => kill(peerPid, 0)).not.toThrow()
    await expect(readFile(late)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally {
    for (const job of active)
      job.stop('owned-test-cleanup')
    await Promise.all(active.map(job => job.completion))
    await rm(root, { recursive: true, force: true })
  }
}, 30_000)
