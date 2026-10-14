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

exports.closePrivateRuntime = async function (application, identity) {
  const startedAt = Date.now()
  const nativeProcess = application.process()
  const close = application.close()
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
  }
  return { completed: !failure, elapsedMs: Date.now() - startedAt, exitCode: nativeProcess.exitCode, ...(failure ? { failure, forcedQaCleanup: true } : {}) }
}

exports.packageIdentity = async function () {
  if (!process.env.LIFE_QA_EXE)
    return null
  const executable = path.resolve(process.env.LIFE_QA_EXE)
  const hash = createHash('sha256')
  for await (const bytes of createReadStream(path.join(path.dirname(executable), 'resources/app.asar')))
    hash.update(bytes)
  return { executable, packagedAsarSha256: hash.digest('hex') }
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
