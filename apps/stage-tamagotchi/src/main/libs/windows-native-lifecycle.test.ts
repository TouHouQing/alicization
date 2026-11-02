import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { execPath } from 'node:process'

import { afterEach, expect, it, vi } from 'vitest'

interface Launch { executablePath: string, env: Record<string, string> }
interface Observation { process: EventEmitter & { pid: number, exitCode: number | null, signalCode: string | null, kill: (signal: string) => boolean }, failure: () => string | null, dispose: () => void }
const { prepareWindowsQaLaunch, bindWindowsNativeRuntime } = createRequire(import.meta.url)('../../../scripts/life-acceptance/windows-native-launcher.cjs') as { prepareWindowsQaLaunch: (profile: string, executable: string) => Launch, bindWindowsNativeRuntime: (identity: unknown, launcher: unknown) => Observation }
const profiles: string[] = []
const observations: Observation[] = []
const keyName = 'ALICIZATION_QA_LAUNCH_KEY'
const nonceName = 'ALICIZATION_QA_LAUNCH_NONCE'
const directoryName = 'ALICIZATION_QA_LAUNCH_DIRECTORY'
async function profile() {
  const directory = await mkdtemp(join(tmpdir(), 'alicization-life-native-owner-'))
  profiles.push(directory)
  return directory
}
async function receipt(launch: Launch, kind: string, values: Record<string, unknown> = {}, invalid = false) {
  const payload = { version: 1, kind, nonce: launch.env[nonceName], launcherPid: 888, pid: 444, executable: execPath, startedAt: 100, ...(kind === 'exited' ? { exitCode: 0, signal: null } : {}), ...values }
  const mac = invalid ? '0'.repeat(64) : createHmac('sha256', Buffer.from(launch.env[keyName], 'hex')).update(JSON.stringify(payload)).digest('hex')
  await writeFile(join(launch.env[directoryName], `qa-native-${kind}.json`), JSON.stringify({ payload, mac }), { flag: 'wx' })
}
async function fixture() {
  const directory = await profile()
  const launch = prepareWindowsQaLaunch(directory, execPath)
  await receipt(launch, 'started')
  const launcher = Object.assign(new EventEmitter(), { pid: 999, stdout: undefined, stderr: undefined, stdin: Object.assign(new EventEmitter(), { writable: true, destroyed: false, write: vi.fn() }) })
  const observed = bindWindowsNativeRuntime({ pid: 444, parentPid: 888, profile: directory, executable: execPath }, launcher)
  observations.push(observed)
  return { launch, launcher, observed }
}
afterEach(async () => {
  for (const observed of observations.splice(0)) observed.dispose()
  for (const directory of profiles.splice(0)) {
    expect(basename(directory).startsWith('alicization-life-native-owner-')).toBe(true)
    expect(await realpath(dirname(directory))).toBe(await realpath(tmpdir()))
    await rm(directory, { recursive: true, force: true })
  }
})

it('does not mistake a successful Windows launcher exit for actual application closure', async () => {
  const { launch, launcher, observed } = await fixture()
  const ended = vi.fn()
  observed.process.on('exit', ended)
  launcher.emit('exit', 0, null)
  expect(observed.process.pid).toBe(444)
  expect(observed.process.exitCode).toBeNull()
  expect(ended).not.toHaveBeenCalled()
  await receipt(launch, 'exited')
  await vi.waitFor(() => expect(observed.process.exitCode).toBe(0))
  expect(ended).toHaveBeenCalledExactlyOnceWith(0, null)
})

it.each(['signature', 'pid', 'nonce', 'parent'])('does not accept an unauthenticated or unrelated actual-process close: %s', async (fault) => {
  const { launch, launcher, observed } = await fixture()
  await receipt(launch, 'exited', fault === 'pid' ? { pid: 445 } : fault === 'nonce' ? { nonce: '0'.repeat(32) } : fault === 'parent' ? { launcherPid: 889 } : {}, fault === 'signature')
  launcher.emit('exit', 0, null)
  expect(observed.process.exitCode).toBeNull()
  expect(observed.failure()).toBeTruthy()
})

it('allocates new immutable receipts when the same synthetic identity profile is reopened', async () => {
  const directory = await profile()
  const first = prepareWindowsQaLaunch(directory, execPath)
  const second = prepareWindowsQaLaunch(directory, execPath)
  expect(first.executablePath).not.toBe(second.executablePath)
  expect(first.env[nonceName]).not.toBe(second.env[nonceName])
})

it.each([
  { stop: false, mode: 'direct' },
  { stop: true, mode: 'direct' },
  ...(process.platform === 'win32' ? [{ stop: false, mode: 'windows-shell' }, { stop: true, mode: 'windows-shell' }] : []),
])('owns a real child without passing signing keys: $mode stop=$stop', async ({ stop, mode }) => {
  const directory = await profile()
  const launch = prepareWindowsQaLaunch(directory, execPath)
  const code = `const forbidden = Object.keys(process.env).some(key => key.startsWith("ALICIZATION_QA_LAUNCH_") || key === "ALICIZATION_QA_NATIVE_EXECUTABLE"); setTimeout(() => process.exit(forbidden ? 9 : 0), ${stop ? '60000' : '1000'})`
  const fixturePath = join(directory, 'actual-child.cjs')
  await writeFile(fixturePath, code, { flag: 'wx' })
  const wrapper = mode === 'windows-shell'
    ? spawn(`"${launch.executablePath}" "${fixturePath}"`, [], { shell: true, env: { ...process.env, ...launch.env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] })
    : spawn(execPath, [resolve('apps/stage-tamagotchi/scripts/life-acceptance/windows-native-launcher.cjs'), fixturePath], { env: { ...process.env, ...launch.env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let observed: Observation | undefined
  const finished = new Promise<void>((resolve, reject) => {
    wrapper.once('error', reject)
    wrapper.once('close', () => resolve())
  })
  try {
    let started!: { payload: { pid: number, launcherPid: number } }
    await vi.waitFor(async () => {
      started = JSON.parse(await readFile(join(launch.env[directoryName], 'qa-native-started.json'), 'utf8'))
      expect(started.payload.pid).toBeGreaterThan(0)
    })
    observed = bindWindowsNativeRuntime({ pid: started.payload.pid, parentPid: started.payload.launcherPid, executable: execPath, profile: directory }, wrapper)
    observations.push(observed)
    expect(observed.process.pid).not.toBe(wrapper.pid)
    if (stop)
      expect(observed.process.kill('SIGKILL')).toBe(true)
    await finished
    await vi.waitFor(() => expect(observed!.process.exitCode !== null || observed!.process.signalCode !== null).toBe(true))
    if (stop)
      expect(observed.process.exitCode !== 0 || observed.process.signalCode !== null).toBe(true)
    else expect(observed.process.exitCode).toBe(0)
  }
  finally {
    if (wrapper.exitCode === null && wrapper.signalCode === null) {
      if (observed)
        observed.process.kill('SIGKILL')
      await finished
    }
  }
})
