import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { execPath } from 'node:process'

import { describe, expect, it, vi } from 'vitest'

const { observeNativeQuit, assertAuthenticatedNativeQuit } = createRequire(import.meta.url)('../../../scripts/life-acceptance/native-quit-observation.cjs') as { observeNativeQuit: <T>(exited: Promise<T>, requested: Promise<void>) => Promise<T>, assertAuthenticatedNativeQuit: (shutdown: unknown) => unknown }

function authenticatedShutdown() {
  return { completed: true, exitCode: 0, elapsedMs: 1000, nativeExitObservedAt: 2000, fileFlushObserved: true, windowTeardownObserved: true, nativeProcessObservation: { source: 'authenticated-direct-child-close', pid: 11, parentPid: 22, playwrightLauncherPid: 33, startedAt: 1000 } }
}

it('qualifies normal shutdown only with the actual child ownership and observed teardown', () => {
  const shutdown = authenticatedShutdown()
  expect(assertAuthenticatedNativeQuit(shutdown)).toEqual(shutdown.nativeProcessObservation)
})

it.each([
  { nativeProcessObservation: null },
  { nativeProcessObservation: { ...authenticatedShutdown().nativeProcessObservation, source: 'playwright-shell-exit' } },
  { nativeProcessObservation: { ...authenticatedShutdown().nativeProcessObservation, pid: 33 } },
  { nativeProcessObservation: { ...authenticatedShutdown().nativeProcessObservation, parentPid: 11 } },
  { nativeProcessObservation: { ...authenticatedShutdown().nativeProcessObservation, pid: 0 } },
  { nativeExitObservedAt: 999 },
  { nativeExitObservedAt: null },
  { completed: false },
  { exitCode: 1 },
  { exitSignal: 'SIGKILL' },
  { forcedCleanup: { observedExit: true } },
  { forcedQaCleanup: true },
  { unexpectedExitBeforeQuit: true },
  { fileFlushObserved: false },
  { windowTeardownObserved: false },
  { elapsedMs: 60001 },
])('rejects an incomplete, launcher-only or abnormal release exit receipt: %j', (patch) => {
  expect(() => assertAuthenticatedNativeQuit({ ...authenticatedShutdown(), ...patch })).toThrow()
})
const { closePrivateRuntime } = createRequire(import.meta.url)('../../../scripts/life-acceptance/electron-launch.cjs') as { closePrivateRuntime: (application: unknown, identity: null, options: { viaUi: boolean, nativeProcess?: unknown }) => Promise<{ completed: boolean, unexpectedExitBeforeQuit: boolean, exitCode: number | null, exitSignal: string | null, failure?: string, quitRequestTransportError?: string }> }
const { stopOwnedHostQaRuntime } = createRequire(import.meta.url)('../../../scripts/life-acceptance/electron-launch.cjs') as { stopOwnedHostQaRuntime: (native: unknown, identity: unknown) => Promise<{ requested: boolean, observedExit: boolean, normalExit: boolean }> }

function applicationWithLostQuitAcknowledgement(child: unknown) {
  return Object.assign(new EventEmitter(), {
    process: () => child,
    evaluate: vi.fn(async () => {
      throw new Error('electronApplication.evaluate: Execution context was destroyed, most likely because of a navigation.')
    }),
    _connection: { toImpl: () => ({ _nodeConnection: { close: vi.fn() } }) },
  })
}

describe('acceptance observes actual native shutdown', () => {
  it.each([0, 7])('waits for the actual child after its closing inspector context disappears and preserves its exit code %i', async (code) => {
    const child = spawn(execPath, ['-e', `setTimeout(() => process.exit(${code}), 150)`], { windowsHide: true, stdio: 'ignore' })
    const application = applicationWithLostQuitAcknowledgement(child)
    try {
      const shutdown = await closePrivateRuntime(application, null, { viaUi: false })
      expect(shutdown).toMatchObject({ completed: code === 0, exitCode: code, quitRequestTransportError: expect.stringContaining('Execution context was destroyed') })
      expect(child.exitCode).toBe(code)
    }
    finally {
      if (child.exitCode === null)
        child.kill()
    }
  })

  it('keeps the original sixty-second native-exit deadline after a lost inspector acknowledgement', async () => {
    vi.useFakeTimers()
    try {
      const child = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null })
      const application = applicationWithLostQuitAcknowledgement(child)
      const closing = closePrivateRuntime(application, null, { viaUi: false })
      await vi.advanceTimersByTimeAsync(60000)
      expect(await closing).toMatchObject({ completed: false, exitCode: null, failure: 'Application shutdown exceeded 60 seconds', quitRequestTransportError: expect.stringContaining('Execution context was destroyed') })
    }
    finally { vi.useRealTimers() }
  })

  it.each(['pid', 'executable', 'profile', 'mode'])('refuses forced cleanup when the retained host child ownership differs: %s', async (field) => {
    const child = Object.assign(new EventEmitter(), { pid: 44, spawnfile: 'C:/owned/electron.exe', exitCode: null, signalCode: null, kill: vi.fn() })
    const identity = { pid: field === 'pid' ? 45 : 44, executable: field === 'executable' ? 'C:/foreign/electron.exe' : child.spawnfile, profile: field === 'profile' ? 'C:/human/profile' : 'C:/Temp/alicization-life-qa-owned', hostDesktopVerified: true, hostViewport: { mode: field === 'mode' ? 'foreign' : 'actual-host-background-viewport' } }
    await expect(stopOwnedHostQaRuntime(child, identity)).rejects.toThrow('identity mismatch')
    expect(child.kill).not.toHaveBeenCalled()
  })
  it('waits for closure of the exact owned child while preserving forced cleanup as a failure', async () => {
    const child = Object.assign(new EventEmitter(), { pid: 44, spawnfile: 'C:/owned/electron.exe', exitCode: null as number | null, signalCode: null, kill: vi.fn() })
    child.kill.mockImplementation(() => {
      queueMicrotask(() => {
        child.exitCode = 1
        child.emit('exit', 1, null)
      })
      return true
    })
    const result = await stopOwnedHostQaRuntime(child, { pid: 44, executable: child.spawnfile, profile: 'C:/Temp/alicization-life-qa-owned', hostDesktopVerified: true, hostViewport: { mode: 'actual-host-background-viewport' } })
    expect(child.kill).toHaveBeenCalledExactlyOnceWith('SIGKILL')
    expect(result).toMatchObject({ requested: true, observedExit: true, normalExit: false })
    expect(child.listenerCount('exit')).toBe(0)
  })
  it('uses the retained native process when Playwright has disposed its Electron object', async () => {
    const application = { process: vi.fn(() => {
      throw new Error('disposed Electron object')
    }) }
    await expect(closePrivateRuntime(application, null, { viaUi: true, nativeProcess: { exitCode: 0, signalCode: null } })).resolves.toMatchObject({ completed: false, unexpectedExitBeforeQuit: true, exitCode: 0 })
    expect(application.process).not.toHaveBeenCalled()
  })
  it.each([{ exitCode: 0, signalCode: null }, { exitCode: null, signalCode: 'SIGTERM' }])('retains an unexpected prior exit without calling a dead inspector or certifying UI shutdown: $exitCode/$signalCode', async (state) => {
    const toImpl = vi.fn(() => {
      throw new Error('closed inspector')
    })
    const application = { process: () => state, _connection: { toImpl }, on: vi.fn(), removeListener: vi.fn() }
    await expect(closePrivateRuntime(application, null, { viaUi: true })).resolves.toMatchObject({ completed: false, unexpectedExitBeforeQuit: true, exitCode: state.exitCode, exitSignal: state.signalCode })
    expect(toImpl).not.toHaveBeenCalled()
  })
  it('observes an actual owned Node process exit even when the closing UI response never arrives', async () => {
    const child = spawn(execPath, ['-e', 'setTimeout(() => process.exit(0), 20)'], { windowsHide: true, stdio: 'ignore' })
    const exited = new Promise<number | null>((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', resolve)
    })
    const request = Promise.withResolvers<void>()
    let observed = false
    const closing = observeNativeQuit(exited, request.promise).then((code) => {
      observed = true
      return code
    })
    try {
      expect(await exited).toBe(0)
      await new Promise(resolve => setImmediate(resolve))
      expect(observed).toBe(true)
      expect(await closing).toBe(0)
    }
    finally {
      request.resolve()
      await closing
      if (child.exitCode === null)
        child.kill()
    }
  })

  it('does not equate an acknowledged quit request with native process exit', async () => {
    const native = Promise.withResolvers<number>()
    let observed = false
    const closing = observeNativeQuit(native.promise, Promise.resolve()).then((code) => {
      observed = true
      return code
    })
    await new Promise(resolve => setImmediate(resolve))
    expect(observed).toBe(false)
    native.resolve(7)
    expect(await closing).toBe(7)
  })

  it('reports request failure without waiting for a native exit and handles a late transport rejection after exit', async () => {
    const native = Promise.withResolvers<number>()
    await expect(observeNativeQuit(native.promise, Promise.reject(new Error('owned UI request failed')))).rejects.toThrow('owned UI request failed')
    const request = Promise.withResolvers<void>()
    const closed = observeNativeQuit(Promise.resolve(0), request.promise)
    let observed = false
    void closed.then(() => {
      observed = true
    }).catch(() => {})
    await new Promise(resolve => setImmediate(resolve))
    expect(observed).toBe(true)
    request.reject(new Error('late target closed'))
    expect(await closed).toBe(0)
  })
})
