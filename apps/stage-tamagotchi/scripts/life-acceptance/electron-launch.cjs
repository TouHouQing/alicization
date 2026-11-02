const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { createReadStream } = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { inspectHostViewportPackage } = require('./host-package-identity.cjs')
const { observeNativeQuit } = require('./native-quit-observation.cjs')
const { bindWindowsNativeRuntime, prepareWindowsQaLaunch } = require('./windows-native-launcher.cjs')

const nativeRuntimeObservers = new WeakMap()

exports.nativeRuntimeProcess = application => nativeRuntimeObservers.get(application)?.process ?? application.process()

function bindRegisteredRuntime(application, identity) {
  if (process.platform === 'win32') {
    const observed = bindWindowsNativeRuntime(identity, application.process())
    nativeRuntimeObservers.set(application, observed)
    identity.nativeProcessObservation = observed.proof
  }
  return identity
}

exports.isOwnedHostViewport = function (report) {
  const runtime = report?.nativeRuntime
  return process.env.LIFE_QA_HOST_VIEWPORT === '1' && runtime?.hostDesktopVerified === true
    && runtime.desktop === 'Default' && runtime.inputDesktop === 'Default' && runtime.switchedInputDesktop === false
    && runtime.hostViewport?.mode === 'actual-host-background-viewport'
    && runtime.hostViewport.actualMainSha256 === report.compiledMainSha256
}

/** Bounded cleanup of the exact retained child, never a successful quit receipt. */
exports.stopOwnedHostQaRuntime = async function (nativeProcess, identity) {
  if (nativeProcess.exitCode !== null || nativeProcess.signalCode !== null)
    return { requested: false, observedExit: true, normalExit: false }
  if (!identity?.hostDesktopVerified || identity.hostViewport?.mode !== 'actual-host-background-viewport' || identity.pid !== nativeProcess.pid || !/^alicization-life-[\w-]+-/u.test(path.basename(identity.profile)) || path.resolve(nativeProcess.spawnfile).toLowerCase() !== path.resolve(identity.executable).toLowerCase())
    throw new Error('Owned host QA cleanup identity mismatch')
  let timer
  let onExit
  const exited = new Promise((resolve) => {
    onExit = () => resolve(true)
    nativeProcess.once('exit', onExit)
  })
  try {
    const requested = nativeProcess.kill('SIGKILL')
    const observedExit = await Promise.race([exited, new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), 10000)
    })])
    return { requested, observedExit, normalExit: false, exitCode: nativeProcess.exitCode, exitSignal: nativeProcess.signalCode }
  }
  finally {
    clearTimeout(timer)
    nativeProcess.removeListener('exit', onExit)
  }
}

exports.registerPrivateRuntime = async function (application) {
  if (process.env.LIFE_QA_HOST_VIEWPORT === '1') {
    const identity = await application.evaluate(({ app, screen }, probePath) => {
      const { execFileSync } = process.getBuiltinModule('node:child_process')
      const desktop = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', probePath], { windowsHide: true, timeout: 15000, encoding: 'utf8' }))
      const viewport = globalThis.__alicizationHostViewportQa
      if (!viewport || viewport.mode !== 'actual-host-background-viewport')
        throw new Error('Host viewport entry did not own startup')
      const displays = screen.getAllDisplays().map(display => display.bounds)
      const windows = viewport.windows()
      if (windows.some(window => displays.some(display => window.bounds.x < display.x + display.width && window.bounds.x + window.bounds.width > display.x && window.bounds.y < display.y + display.height && window.bounds.y + window.bounds.height > display.y)))
        throw new Error('A host QA window overlaps a real display')
      return { pid: process.pid, parentPid: process.ppid, executable: process.execPath, profile: app.getPath('userData'), ...desktop, hostViewport: { ...viewport, windows, displays } }
    }, path.join(__dirname, 'assert-host-viewport.ps1'))
    if (!/^alicization-life-[\w-]+-/u.test(path.basename(identity.profile)) || !identity.hostDesktopVerified || identity.hostViewport.windows.some(window => window.focusable || identity.hostViewport.displays.some(display => window.bounds.x < display.x + display.width && window.bounds.x + window.bounds.width > display.x && window.bounds.y < display.y + display.height && window.bounds.y + window.bounds.height > display.y)))
      throw new Error('Owned host runtime or viewport verification failed')
    return bindRegisteredRuntime(application, identity)
  }
  const registry = process.env.LIFE_QA_PROCESS_REGISTRY
  if (!registry)
    throw new Error('Private runtime registration requires the desktop runner')
  const target = path.resolve(registry)
  if (!target.startsWith(`${path.resolve('output')}${path.sep}`) || !/^private-processes-[a-f0-9]{32}\.jsonl$/.test(path.basename(target)))
    throw new Error('Invalid private process registry')
  const identity = await application.evaluate(({ app }, probePath) => {
    // Check the desktop from a child of the actual Electron main process.
    // Cross-process desktop handles can be denied to the runner on Windows.
    const { execFileSync } = process.getBuiltinModule('node:child_process')
    const desktopProof = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', probePath, '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, timeout: 15000, encoding: 'utf8' }))
    return { pid: process.pid, parentPid: process.ppid, executable: process.execPath, profile: app.getPath('userData'), ...desktopProof }
  }, path.join(__dirname, 'assert-private-desktop.ps1'))
  if (!/^alicization-(?:stage-smoke|life-[\w-]+)-/.test(path.basename(identity.profile)))
    throw new Error('Only synthetic QA profiles can register a runtime')
  await fs.appendFile(target, `${JSON.stringify(identity)}\n`)
  return bindRegisteredRuntime(application, identity)
}

exports.closePrivateRuntime = async function (application, identity, { viaUi = false, nativeProcess: retainedProcess } = {}) {
  const startedAt = Date.now()
  const nativeProcess = nativeRuntimeObservers.get(application)?.process ?? retainedProcess ?? application.process()
  if (process.platform === 'win32' && identity && !nativeRuntimeObservers.has(application))
    throw new Error('Windows native shutdown requires an authenticated actual-child observer')
  if (nativeProcess.exitCode !== null || nativeProcess.signalCode !== null) {
    // Preserve a failed scene when its process/inspector has already closed.
    // An earlier spontaneous exit is not the requested, observed UI teardown.
    return { completed: false, unexpectedExitBeforeQuit: true, elapsedMs: Date.now() - startedAt, exitCode: nativeProcess.exitCode, exitSignal: nativeProcess.signalCode, nativeExitObservedAt: null, quitRequestSettledAt: null, fileFlushObserved: false, windowTeardownObserved: false, debuggerDetachedAfterTeardown: false, debuggerDetachedBeforeUiQuit: false, exitMessages: [], failure: 'Application exited before the requested shutdown' }
  }
  const stderr = []
  const observeStderr = (bytes) => {
    stderr.push(bytes.toString())
    if (stderr.length > 20)
      stderr.shift()
  }
  nativeProcess.stderr?.on('data', observeStderr)
  // Initiate quit once and observe the actual application's resource lifecycle.
  // A second Playwright close() can re-enter quit during asynchronous teardown.
  // Native exit owns success; log markers never substitute for process exit.
  let fileFlushObserved = false
  let windowTeardownObserved = false
  let debuggerDetachedAfterTeardown = false
  let debuggerDetachedBeforeUiQuit = false
  const exitMessages = []
  let stdoutPending = ''
  const observeStdout = (bytes) => {
    stdoutPending += bytes.toString()
    const lines = stdoutPending.split(/\r?\n/)
    stdoutPending = lines.pop()
    for (const line of lines) {
      if (!line.includes('[app-exit]') && !line.startsWith('[FileLogger]'))
        continue
      exitMessages.push(line)
      fileFlushObserved ||= line.startsWith('[FileLogger] Session log file:')
      windowTeardownObserved ||= line.includes('[app-exit] Desktop windows closed; exiting')
    }
  }
  nativeProcess.stdout?.on('data', observeStdout)
  // Playwright 1.58 exposes no public detach operation. Its close() first
  // evaluates app.quit(), which cannot finish while Electron is inside exit().
  // Detach this harness's inspector before native UI quit, or after teardown
  // for older probes. Never inject an exit or substitute a process result.
  const nodeConnection = application._connection?.toImpl?.(application)?._nodeConnection
  if (typeof nodeConnection?.close !== 'function')
    throw new Error('This Playwright version does not expose the QA inspector detach adapter')
  const observeFlush = (message) => {
    const text = message.text()
    if (text.startsWith('[FileLogger] Session log file:'))
      fileFlushObserved = true
    if (!windowTeardownObserved && text.includes('[app-exit] Desktop windows closed; exiting')) {
      windowTeardownObserved = true
      if (!viaUi) {
        nodeConnection.close()
        debuggerDetachedAfterTeardown = true
      }
    }
  }
  application.on('console', observeFlush)
  let onExit
  let nativeExitObservedAt = null
  let quitRequestSettledAt = null
  let quitRequestTransportError = null
  const exited = new Promise((resolve) => {
    onExit = () => {
      nativeExitObservedAt = Date.now()
      resolve()
    }
    nativeProcess.once('exit', onExit)
    if (nativeProcess.exitCode !== null)
      onExit()
  })
  const uiQuitControl = { stageFound: false, expanded: false, closeVisible: false, clicked: false }
  const requestQuit = async () => {
    if (!viaUi) {
      await application.evaluate(({ app }) => {
        setImmediate(() => app.quit())
      })
      return
    }
    const stage = application.windows().find(page => page.url().endsWith('#/'))
    uiQuitControl.stageFound = Boolean(stage)
    if (!stage)
      throw new Error('Live2D stage required for native UI shutdown')
    const closeButton = stage.getByRole('button', { name: '关闭', exact: true })
    if (!await closeButton.isVisible()) {
      await stage.getByRole('button', { name: '展开', exact: true }).evaluate(node => node.click())
      uiQuitControl.expanded = true
    }
    await closeButton.waitFor({ timeout: 10000 })
    uiQuitControl.closeVisible = true
    // Use the application's real close button with no Node debugger attached
    // during its asynchronous shutdown, matching the separate raw native probe.
    nodeConnection.close()
    debuggerDetachedBeforeUiQuit = true
    await closeButton.evaluate(node => node.click()).catch((error) => {
      if (!/closed/i.test(error.message))
        throw error
    })
    uiQuitControl.clicked = true
  }
  const requested = requestQuit().then(() => {
    quitRequestSettledAt = Date.now()
  }).catch((error) => {
    quitRequestSettledAt = Date.now()
    if (nativeProcess.exitCode === null) {
      // A closing inspector can lose its response before SQLite/native
      // teardown ends. The actual child and unchanged deadline still own exit.
      if (error.message.includes('Execution context was destroyed, most likely because of a navigation.')) {
        quitRequestTransportError = error.message
        return
      }
      throw error
    }
  })
  const close = observeNativeQuit(exited, requested)
  let deadline
  let failure
  let forcedCleanup
  try {
    await Promise.race([close, new Promise((_, reject) => {
      deadline = setTimeout(() => reject(new Error('Application shutdown exceeded 60 seconds')), 60000)
    })])
    if (nativeProcess.exitCode !== 0)
      failure = `Application exited abnormally (code ${nativeProcess.exitCode}, signal ${nativeProcess.signalCode ?? 'none'})`
  }
  catch (error) {
    failure = error.message
    if (identity && !identity.hostViewport) {
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'stop-private-runtime.ps1'), '-RuntimePid', String(identity.pid), '-ExecutablePath', identity.executable, '-ProfilePath', identity.profile], { windowsHide: true, timeout: 15000 })
      await Promise.race([close.catch(() => {}), new Promise(resolve => setTimeout(resolve, 2000))])
    }
    else if (identity?.hostViewport) {
      forcedCleanup = await exports.stopOwnedHostQaRuntime(nativeProcess, identity).catch(() => ({ requested: false, observedExit: false, normalExit: false, failure: 'Owned QA cleanup did not confirm process closure' }))
    }
  }
  finally {
    clearTimeout(deadline)
    nativeProcess.removeListener('exit', onExit)
    nativeProcess.stderr?.removeListener('data', observeStderr)
    nativeProcess.stdout?.removeListener('data', observeStdout)
    application.removeListener('console', observeFlush)
  }
  return { completed: !failure, elapsedMs: Date.now() - startedAt, exitCode: nativeProcess.exitCode, nativeExitObservedAt, nativeProcessObservation: nativeRuntimeObservers.get(application)?.proof ?? null, quitRequestSettledAt, ...(quitRequestTransportError ? { quitRequestTransportError } : {}), fileFlushObserved, windowTeardownObserved, debuggerDetachedAfterTeardown, debuggerDetachedBeforeUiQuit, exitMessages, uiQuitControl, ...(forcedCleanup ? { forcedCleanup } : {}), ...(failure ? { failure, ...(identity?.hostViewport ? { hostRuntimeExitUnconfirmed: !forcedCleanup?.observedExit } : { forcedQaCleanup: true }), stderr: stderr.join('').slice(-4000) } : {}) }
}

exports.packageIdentity = async function () {
  if (!process.env.LIFE_QA_EXE)
    return null
  const executable = path.resolve(process.env.LIFE_QA_EXE)
  const hash = createHash('sha256')
  for await (const bytes of createReadStream(path.join(path.dirname(executable), 'resources/app.asar')))
    hash.update(bytes)
  const executableHash = createHash('sha256')
  for await (const bytes of createReadStream(executable))
    executableHash.update(bytes)
  return { executable, packagedAsarSha256: hash.digest('hex'), portableExecutableSha256: executableHash.digest('hex') }
}

exports.launchOptions = function (userData, { launcher = 'playwright', executablePath } = {}) {
  if (!/^alicization-(?:stage-smoke|life-[\w-]+)-/u.test(path.basename(userData)))
    throw new Error('Native acceptance only supports its isolated QA profile')
  const hostViewport = process.env.LIFE_QA_HOST_VIEWPORT === '1'
  if (hostViewport) {
    if (process.env.LIFE_QA_PRIVATE_DESKTOP || process.env.LIFE_PRODUCT_RENDERER !== 'live2d')
      throw new Error('Host viewport QA requires Live2D on the current input desktop')
    if (process.env.LIFE_QA_EXE)
      inspectHostViewportPackage({ executable: process.env.LIFE_QA_EXE, runId: process.env.LIFE_QA_INSTALLER_ID })
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-host-viewport.ps1')], { windowsHide: true, timeout: 15000 })
  }
  else if (!/^AlicizationQA_[a-f0-9]{32}$/u.test(process.env.LIFE_QA_PRIVATE_DESKTOP || '')) {
    throw new Error('Native acceptance requires run-private-desktop.ps1 to keep the main desktop available')
  }
  if (!hostViewport)
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, timeout: 15000 })
  const options = {
    executablePath: executablePath || process.env.LIFE_QA_EXE || path.resolve('apps/stage-tamagotchi/node_modules/electron/dist/electron.exe'),
    // Private Windows desktops can lose their D3D context while the input
    // desktop remains busy. Software GL is explicit QA-only configuration.
    args: ['--mute-audio', ...(process.env.LIFE_QA_SOFTWARE_GL === '1' ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), ...(process.env.LIFE_QA_EXE ? [] : [hostViewport ? path.join(__dirname, 'host-viewport-entry.cjs') : path.resolve('apps/stage-tamagotchi/out/main/index.js')])],
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE')), ALICIZATION_USER_DATA_PATH: userData },
  }
  if (process.platform === 'win32' && launcher === 'playwright') {
    const owned = prepareWindowsQaLaunch(userData, options.executablePath)
    options.executablePath = owned.executablePath
    Object.assign(options.env, owned.env)
  }
  return options
}
