const assert = require('node:assert/strict')
const { execFileSync, spawn } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

async function main() {
  assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f0-9]{32}$/u)
  const reportPath = path.resolve(process.argv[2] || process.env.LIFE_QA_SANITIZE_REPORT || '')
  assert.ok(reportPath.startsWith(path.resolve('output') + path.sep))
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'))
  assert.equal(report.syntheticIdentity, true)
  assert.equal(report.nativeRuntime.privateDesktopVerified, true)
  const profile = await fs.realpath(report.profile)
  assert.equal(path.dirname(profile).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
  assert.match(path.basename(profile), /^alicization-life-product-regression-[\w-]+$/u)
  try {
    process.kill(report.nativeRuntime.pid, 0)
    throw new Error('Interrupted QA runtime must have exited first')
  }
  catch (error) {
    if (error.code !== 'ESRCH')
      throw error
  }
  if (!process.versions.electron) {
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE
    const child = spawn(path.resolve('apps/stage-tamagotchi/node_modules/electron/dist/electron.exe'), [__filename, reportPath], { env, windowsHide: true, stdio: 'inherit' })
    process.exitCode = await new Promise(resolve => child.once('exit', resolve))
    return
  }
  const { app, session } = require('electron')
  const controller = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-credentials-cleaner-'))
  app.setPath('userData', controller)
  await app.whenReady()
  const proof = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, encoding: 'utf8', timeout: 15000 }))
  const nativeRuntime = { pid: process.pid, executable: process.execPath, profile: controller, ...proof }
  await fs.appendFile(process.env.LIFE_QA_PROCESS_REGISTRY, `${JSON.stringify(nativeRuntime)}\n`)
  // No project runtime or BrowserWindow is loaded. Sanitize only credentials
  // in this verified, exited synthetic profile; caches and life databases remain.
  const configPath = path.join(profile, 'alicizations/llm-config.json')
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
  config.providerCredentials = {}
  await fs.writeFile(configPath, JSON.stringify(config))
  await session.fromPath(profile).clearStorageData({ storages: ['localstorage'] })
  report.credentialsRemoved = true
  report.interruptedCredentialSanitization = { at: new Date().toISOString(), nativeRuntime, scope: 'Credential records and synthetic Local Storage only; no cache cleanup or life database deletion.' }
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.info(JSON.stringify({ credentialsRemoved: true, profile }))
  app.exit(0)
}
main().catch((error) => {
  console.error(error.message)
  if (process.versions.electron)
    require('electron').app.exit(1)
  else
    process.exitCode = 1
})
