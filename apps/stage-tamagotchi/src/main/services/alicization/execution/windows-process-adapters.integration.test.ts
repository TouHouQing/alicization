import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import process from 'node:process'

import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, expect, it } from 'vitest'

import source from './fixtures/windows-process-adapter-fixture.cs?raw'

import { executeClaudeCodeTaskThread } from '../executor-adapters/claude-code'
import { executeCliTaskThread } from '../executor-adapters/cli'
import { executeCodexTaskThread } from '../executor-adapters/codex'
import { actionDidNotStart, withActionDispatch } from './action-dispatch-context'

const enabled = process.platform === 'win32'
const saved = new Map(['PATH', 'CODEX_HOME', 'CODEX_CLI_PATH', 'ALICIZATION_OWNED_PROCESS_FIXTURE'].map(name => [name, process.env[name]]))
let root = ''
let nativeRoot = ''
const active = new Set<Promise<unknown>>()
const delay = (ms: number) => new Promise<void>(resolveDelay => setTimeout(resolveDelay, ms))

beforeAll(async () => {
  if (!enabled)
    return
  root = await mkdtemp(join(tmpdir(), 'owned-process-adapter-'))
  nativeRoot = join(root, 'native')
  const home = join(root, 'codex-home')
  await mkdir(home)
  await writeFile(join(home, 'auth.json'), '{"owned":"synthetic-credential"}')
  const sourcePath = join(root, 'fixture.cs')
  await writeFile(sourcePath, source)
  const executable = join(root, 'claude.exe')
  const script = '$ErrorActionPreference=\'Stop\';$r=[Console]::In.ReadLine()|ConvertFrom-Json;Add-Type -Path $r.source -OutputAssembly $r.executable -OutputType ConsoleApplication -ReferencedAssemblies System.dll,System.Core.dll,System.Web.Extensions.dll'
  await new Promise<void>((resolveCompile, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20_000 }, error => error ? reject(error) : resolveCompile())
    child.stdin?.end(`${JSON.stringify({ source: sourcePath, executable })}\n`)
  })
  await copyFile(executable, join(root, 'codex.exe'))
  process.env.PATH = `${root};${saved.get('PATH')}`
  process.env.CODEX_HOME = home
  process.env.CODEX_CLI_PATH = join(root, 'codex.exe')
}, 30_000)

afterAll(async () => {
  await Promise.allSettled(active)
  for (const [name, value] of saved) {
    if (value === undefined)
      delete process.env[name]
    else
      process.env[name] = value
  }
  if (root)
    await rm(root, { recursive: true, force: true })
})

for (const channel of ['cli', 'codex', 'claude-code'] as const) {
  const modes: Array<'success' | 'cancel' | 'withdraw-before-resume' | 'timeout' | 'overflow'> = ['success', 'cancel', 'withdraw-before-resume', 'timeout', ...(channel === 'claude-code' ? ['overflow' as const] : [])]
  it.skipIf(!enabled).each(modes)(`owns the actual ${channel} native process boundary (%s)`, async (mode) => {
    const directory = join(root, `${channel}-${mode}`)
    await mkdir(directory)
    const readyPath = join(directory, 'detached.pid')
    const late = join(directory, 'must-not-write.txt')
    const scriptPath = join(directory, 'owned-parent.cjs')
    const artifact = join(directory, 'actual-output.txt')
    const text = `Actual ${channel} output 中文🙂\nline two`
    const childScript = `const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(readyPath)},String(process.pid));setTimeout(()=>fs.writeFileSync(${JSON.stringify(late)},'late'),20000)`
    await writeFile(scriptPath, `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(childScript)}],{detached:true,stdio:'ignore',windowsHide:true});setInterval(()=>{},1000)`)
    const fixture = { mode: mode === 'withdraw-before-resume' ? 'success' : mode, node: process.execPath, script: scriptPath, artifact, bytes: Buffer.from(text).toString('base64') }
    process.env.ALICIZATION_OWNED_PROCESS_FIXTURE = JSON.stringify(fixture)
    const controller = new AbortController()
    let suspendedReadyObserved = false
    const protectedRoot = mode === 'withdraw-before-resume' ? join(directory, 'native') : nativeRoot
    const check = async () => {
      if (mode === 'withdraw-before-resume') {
        for (const program of await readdir(protectedRoot).catch(() => [])) {
          for (const run of await readdir(join(protectedRoot, program)).catch(() => [])) {
            if (!run.startsWith('run-'))
              continue
            if (await readFile(join(protectedRoot, program, run, 'ready.json')).then(() => true, () => false)) {
              suspendedReadyObserved = true
              throw new Error('Owned source withdrawn after native suspended-child receipt')
            }
          }
        }
      }
      return { cardId: 'owned-adapter', effectId: `${channel}-${mode}`, expiresAt: null }
    }
    const thread: AlicizationTaskThreadRecord = { id: `owned-${channel}-${mode}`, decisionTraceId: `owned-trace-${channel}-${mode}`, turnId: 'owned-turn', sessionId: 'owned-session', origin: 'user-turn', goal: 'Only the inert owned native transport fixture', kind: 'run-command', status: 'planned', selectedChannel: channel, proposedChannel: channel, summary: '', metadata: { task: { effect: 'mutate', permissionMode: 'explicit' } }, createdAt: Date.now(), updatedAt: Date.now(), lastEventAt: null, completedAt: null }
    const common = { thread, workspaceRoot: directory, abortSignal: controller.signal, processJobsRoot: protectedRoot }
    const cliScript = mode === 'success' || mode === 'withdraw-before-resume'
      ? `require('node:fs').writeFileSync(${JSON.stringify(artifact)},Buffer.from(${JSON.stringify(fixture.bytes)},'base64'));console.log('owned native fixture finished')`
      : `require(${JSON.stringify(scriptPath)})`
    const pending = withActionDispatch(check, () => channel === 'cli'
      ? executeCliTaskThread({ ...common, command: { command: 'node', args: ['-e', cliScript], timeoutMs: mode === 'timeout' ? 5000 : 10_000 } })
      : channel === 'codex'
        ? executeCodexTaskThread({ ...common, command: { prompt: 'Only exercise this owned native fixture; no model request.', sandbox: 'workspace-write', timeoutMs: 10_000 }, lifecycle: { totalTimeoutMs: mode === 'timeout' ? 5000 : 10_000 } })
        : executeClaudeCodeTaskThread({ ...common, command: { prompt: 'Only exercise this owned native fixture; no model request.', allowTools: true, timeoutMs: mode === 'timeout' ? 5000 : 10_000 } }))
    active.add(pending)
    void pending.finally(() => active.delete(pending)).catch(() => {})
    let descendantPid: number | undefined
    try {
      if (mode === 'cancel' || mode === 'timeout') {
        const until = Date.now() + 10_000
        while (Date.now() < until) {
          descendantPid = await readFile(readyPath, 'utf8').then(value => Number(value), () => undefined)
          if (descendantPid)
            break
          const early = await Promise.race([pending.then(value => value), delay(20).then(() => null)])
          if (early)
            throw new Error(`Owned child ended before actuation: ${early.errorCode}`)
        }
        expect(descendantPid).toBeGreaterThan(0)
        expect(() => process.kill(descendantPid!, 0)).not.toThrow()
        if (mode === 'cancel')
          controller.abort('Owned cancellation after actual descendant admission')
      }
      const result = await pending
      expect(result.ok, JSON.stringify({ channel, mode, errorCode: result.errorCode, errorMessage: result.errorMessage })).toBe(mode === 'success')
      if (mode === 'withdraw-before-resume') {
        expect(suspendedReadyObserved).toBe(true)
        expect(actionDidNotStart(result, 'owned-adapter', `${channel}-${mode}`)).toBe(true)
        await expect(readFile(artifact)).rejects.toMatchObject({ code: 'ENOENT' })
      }
      else {
        const proof = result.events.map(event => event.payload?.processTree).find(Boolean)
        expect(proof).toMatchObject({ treeStopped: true, dispatchRefused: false, receipt: { started: true, activeProcesses: 0, errorCode: null } })
        if (mode === 'success') {
          expect(await readFile(artifact, 'utf8')).toBe(text)
        }
        else {
          expect(result.finalStatus).toBe(mode === 'cancel' ? 'cancelled' : 'failed')
          if (mode === 'timeout')
            expect(result.errorCode).toContain('TIMEOUT')
          if (mode === 'overflow')
            expect(result.errorCode).toBe('CLAUDE_CODE_OUTPUT_LIMIT')
          const stoppedPid = descendantPid
          if (stoppedPid)
            expect(() => process.kill(stoppedPid, 0)).toThrow()
          await expect(readFile(late)).rejects.toMatchObject({ code: 'ENOENT' })
        }
      }
    }
    finally { controller.abort('Owned fixture cleanup'); await pending }
  }, 35_000)
}
