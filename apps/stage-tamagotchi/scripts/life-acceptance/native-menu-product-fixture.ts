import process from 'node:process'

import { Buffer } from 'node:buffer'
import { createHash, randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import * as v from 'valibot'

import menuSource from '../../src/main/services/alicization/execution/native-menu-test-fixture.cs?raw'
import selectSource from '../../src/main/services/alicization/execution/native-select-test-fixture.cs?raw'

import { prepareWindowsProcessJob } from '../../src/main/services/alicization/execution/windows-process-job'
import { createLifeWindowsDesktopRuntime } from '../../src/main/services/alicization/life-windows-desktop-runtime'

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const readySchema = v.strictObject({ nonce: v.string(), outsideAllDisplays: v.literal(true), foreground: v.literal(false), processId: v.pipe(v.number(), v.integer(), v.minValue(1)), processStartTicks: v.pipe(v.string(), v.regex(/^\d{1,20}$/u)), windowId: v.pipe(v.string(), v.regex(/^[1-9]\d{0,19}$/u)), windowTitle: v.pipe(v.string(), v.maxLength(180)) })
const stateSchema = v.strictObject({ nonce: v.string(), clicks: v.pipe(v.number(), v.integer(), v.minValue(0)), submenuOpen: v.boolean(), actionVisible: v.boolean(), foregroundTaken: v.boolean(), selected: v.optional(v.string()), dropdownOpen: v.optional(v.boolean()) })

/** Prepare/read/dispose one passive WPF target; the packaged app performs every action. */
export async function startNativeMenuFixture(input: { root: string }) {
  return startPassiveFixture({ ...input, kind: 'menu', large: false })
}

export async function startNativeSelectFixture(input: { root: string, large: boolean }) {
  return startPassiveFixture({ ...input, kind: 'select' })
}

async function startPassiveFixture(input: { root: string, kind: 'menu' | 'select', large: boolean }) {
  const source = input.kind === 'menu' ? menuSource : selectSource
  const entryPoint = input.kind === 'menu' ? 'OwnedPassiveMenuFixture' : 'OwnedPassiveSelectFixture'
  const nonce = randomBytes(16).toString('hex')
  const marker = join(input.root, 'menu-marker.txt')
  const statePath = join(input.root, 'state.json')
  const stopPath = join(input.root, 'stop')
  const program = join(input.root, 'menu.ps1')
  const script = `\uFEFF$ErrorActionPreference='Stop'
$env:PSModulePath=Join-Path $PSHOME 'Modules'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$request=[Console]::In.ReadLine()|ConvertFrom-Json
$bytes=[Convert]::FromBase64String($request.source)
$sha=[Security.Cryptography.SHA256]::Create()
try{$actual=[BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
if($actual -cne $request.sourceSha256){throw 'FIXED_SOURCE_CHANGED'}
Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase,System.Xaml,System.Web.Extensions
$refs=@('System.dll','System.Core.dll','System.Xaml.dll','System.Web.Extensions.dll',[System.Windows.Window].Assembly.Location,[System.Windows.Media.Brush].Assembly.Location,[System.Windows.DependencyObject].Assembly.Location)
Add-Type -ReferencedAssemblies $refs -TypeDefinition ([Text.Encoding]::UTF8.GetString($bytes))
[${entryPoint}]::Run(($request|ConvertTo-Json -Depth 4 -Compress))
`
  await writeFile(program, script, { flag: 'wx' })
  await writeFile(join(input.root, 'owner.json'), JSON.stringify({ format: 'alicization-owned-native-menu-product-v1', root: input.root, nonce }), { flag: 'wx' })
  const prepared = await prepareWindowsProcessJob({ command: join(process.env.SystemRoot ?? 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), args: ['-NoProfile', '-NonInteractive', '-Sta', '-ExecutionPolicy', 'Bypass', '-File', program], cwd: input.root, env: { ...process.env, PSModulePath: 'C:/Windows/System32/WindowsPowerShell/v1.0/Modules' }, owner: `native-menu-product:${nonce}`, protectedRoot: join(input.root, 'native-job') })
  const job = prepared.start(async () => hash(await readFile(program)) === hash(script))
  let errors = ''
  job.child.stderr?.on('data', (bytes) => {
    errors = (errors + bytes.toString()).slice(-4000)
  })
  const ready = new Promise<v.InferOutput<typeof readySchema>>((resolve, reject) => {
    let stdout = ''
    const timer = setTimeout(() => reject(new Error(`Owned native menu readiness timed out: ${errors}`)), 25000)
    job.child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk
      if (stdout.length > 8192) {
        clearTimeout(timer)
        reject(new Error('Owned native menu readiness exceeded its budget'))
      }
      else if (stdout.includes('\n')) {
        clearTimeout(timer)
        try {
          resolve(v.parse(readySchema, JSON.parse(stdout.split('\n')[0])))
        }
        catch (error) {
          reject(error)
        }
      }
    })
    job.child.once('close', () => {
      clearTimeout(timer)
      reject(new Error(`Owned native menu closed before readiness: ${errors}`))
    })
  })
  job.child.stdin!.end(`${JSON.stringify({ nonce, root: input.root, marker, statePath, stopPath, large: input.large, source: Buffer.from(source).toString('base64'), sourceSha256: hash(source) })}\n`)
  let closure: Promise<{ closed: boolean, normalExit: boolean, nativeJobTreeStopped: boolean, nonce: string }> | undefined
  function close() {
    return closure ??= (async () => {
      await writeFile(stopPath, 'stop', { flag: 'wx' })
      let timer: ReturnType<typeof setTimeout> | undefined
      let outcome = await Promise.race([job.completion, new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 5000)
      })])
      clearTimeout(timer)
      if (!outcome) {
        job.stop('native-menu-product-cleanup')
        outcome = await job.completion
      }
      if (!outcome.treeStopped)
        throw new Error('Owned native menu left an unverified process tree')
      return { closed: true, normalExit: outcome.receipt?.exitCode === 0 && outcome.receipt.reason === 'completed', nativeJobTreeStopped: true, nonce }
    })()
  }
  try {
    const identity = await ready
    if (identity.nonce !== nonce || identity.windowTitle !== `Alicization owned passive menu ${nonce}`)
      throw new Error('Owned native menu identity changed')
    const adapter = createLifeWindowsDesktopRuntime({ ownerId: () => nonce })
    const snapshot = async () => {
      const deadline = Date.now() + 1500
      for (;;) {
        try {
          const state = v.parse(stateSchema, JSON.parse(await readFile(statePath, 'utf8')))
          if (state.nonce !== nonce || state.foregroundTaken)
            throw new Error('Owned native menu lost passive ownership')
          return state
        }
        catch (error) {
          if (!error || typeof error !== 'object' || !('code' in error) || !['EBUSY', 'ENOENT'].includes(String(error.code)) || Date.now() >= deadline)
            throw error
          await delay(Math.min(30, deadline - Date.now()))
        }
      }
    }
    const read = async () => {
      const actual = await adapter.listDesktopInteractables({ windowTitle: identity.windowTitle, maxItems: 120 }) as Record<string, unknown>
      if (actual.ok !== true || actual.windowId !== identity.windowId || actual.processId !== identity.processId || actual.processStartTicks !== identity.processStartTicks)
        throw new Error('Owned native menu window is no longer current')
      return snapshot()
    }
    if (input.large)
      await snapshot()
    else await read()
    return { ...identity, marker, markerSha256: hash(nonce), fixtureSourceSha256: hash(source), read, snapshot, close }
  }
  catch (error) {
    await close()
    throw error
  }
}
