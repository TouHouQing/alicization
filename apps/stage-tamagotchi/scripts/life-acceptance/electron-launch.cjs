const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { createReadStream } = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

exports.registerPrivateRuntime = async function (application) {
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
    return { pid: process.pid, executable: process.execPath, profile: app.getPath('userData'), ...desktopProof }
  }, path.join(__dirname, 'assert-private-desktop.ps1'))
  if (!/^alicization-(?:stage-smoke|life-[\w-]+)-/.test(path.basename(identity.profile)))
    throw new Error('Only synthetic QA profiles can register a runtime')
  await fs.appendFile(target, `${JSON.stringify(identity)}\n`)
  return identity
}

exports.closePrivateRuntime = async function (application, identity, { viaUi = false } = {}) {
  const startedAt = Date.now()
  const nativeProcess = application.process()
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
  const exited = new Promise((resolve) => {
    onExit = resolve
    nativeProcess.once('exit', onExit)
  })
  const requestQuit = async () => {
    if (!viaUi) {
      await application.evaluate(({ app }) => {
        setImmediate(() => app.quit())
      })
      return
    }
    const stage = application.windows().find(page => page.url().endsWith('#/'))
    if (!stage)
      throw new Error('Live2D stage required for native UI shutdown')
    const closeButton = stage.getByRole('button', { name: '关闭', exact: true })
    if (!await closeButton.count())
      await stage.getByRole('button', { name: '展开', exact: true }).evaluate(node => node.click())
    await closeButton.waitFor({ timeout: 10000 })
    // Use the application's real close button with no Node debugger attached
    // during its asynchronous shutdown, matching the separate raw native probe.
    nodeConnection.close()
    debuggerDetachedBeforeUiQuit = true
    await closeButton.evaluate(node => node.click()).catch((error) => {
      if (!/closed/i.test(error.message))
        throw error
    })
  }
  const close = requestQuit().catch((error) => {
    if (nativeProcess.exitCode === null)
      throw error
  }).then(() => exited)
  let deadline
  let failure
  try {
    await Promise.race([close, new Promise((_, reject) => {
      deadline = setTimeout(() => reject(new Error('Application shutdown exceeded 60 seconds')), 60000)
    })])
  }
  catch (error) {
    failure = error.message
    if (identity) {
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'stop-private-runtime.ps1'), '-RuntimePid', String(identity.pid), '-ExecutablePath', identity.executable, '-ProfilePath', identity.profile], { windowsHide: true, timeout: 15000 })
      await Promise.race([close.catch(() => {}), new Promise(resolve => setTimeout(resolve, 2000))])
    }
  }
  finally {
    clearTimeout(deadline)
    nativeProcess.removeListener('exit', onExit)
    nativeProcess.stderr?.removeListener('data', observeStderr)
    nativeProcess.stdout?.removeListener('data', observeStdout)
    application.removeListener('console', observeFlush)
  }
  return { completed: !failure, elapsedMs: Date.now() - startedAt, exitCode: nativeProcess.exitCode, fileFlushObserved, windowTeardownObserved, debuggerDetachedAfterTeardown, debuggerDetachedBeforeUiQuit, exitMessages, ...(failure ? { failure, forcedQaCleanup: true, stderr: stderr.join('').slice(-4000) } : {}) }
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

exports.launchOptions = function (userData) {
  if (!/^alicization-(?:stage-smoke|life-[\w-]+)-/u.test(path.basename(userData)))
    throw new Error('Native acceptance only supports its isolated QA profile')
  if (!/^AlicizationQA_[a-f0-9]{32}$/u.test(process.env.LIFE_QA_PRIVATE_DESKTOP || ''))
    throw new Error('Native acceptance requires run-private-desktop.ps1 to keep the main desktop available')
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, timeout: 15000 })
  return {
    executablePath: process.env.LIFE_QA_EXE || path.resolve('apps/stage-tamagotchi/node_modules/electron/dist/electron.exe'),
    // Private Windows desktops can lose their D3D context while the input
    // desktop remains busy. Software GL is explicit QA-only configuration.
    args: ['--mute-audio', ...(process.env.LIFE_QA_SOFTWARE_GL === '1' ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), ...(process.env.LIFE_QA_EXE ? [] : [path.resolve('apps/stage-tamagotchi/out/main/index.js')])],
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE')), ALICIZATION_USER_DATA_PATH: userData },
  }
}
