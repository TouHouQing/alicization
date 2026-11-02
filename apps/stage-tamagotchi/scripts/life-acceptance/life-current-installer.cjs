const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const { createReadStream } = require('node:fs')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')
const { promisify } = require('node:util')

const { isOwnedHostViewport } = require('./electron-launch.cjs')
const { installerQaIdentity, assertInstallerProfileOwner } = require('./installer-qa-identity.cjs')

const runFile = promisify(execFile)
const workspace = path.resolve(__dirname, '../../../..')
const identity = installerQaIdentity({ workspace, runId: process.env.LIFE_QA_INSTALLER_ID, appData: process.env.APPDATA })
const { installer, profile } = identity

async function exists(file) {
  return fs.access(file).then(() => true, () => false)
}
async function waitFor(predicate) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await predicate())
      return
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error('Owned installer transition timed out')
}
async function hash(file) {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(file)) digest.update(chunk)
  return digest.digest('hex')
}
async function findIdentityFiles(directory, depth = 0) {
  const found = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory() && depth < 5)
      found.push(...await findIdentityFiles(file, depth + 1))
    if (entry.isFile() && ['SOUL.md', 'alicization.db', 'life-installer-qa-owner.json'].includes(entry.name))
      found.push(file)
  }
  return found
}
async function main() {
  assert.ok(profile && path.isAbsolute(profile), 'Installer QA requires the current-user application-data directory')
  const hostViewport = process.env.LIFE_QA_HOST_VIEWPORT === '1'
  if (hostViewport) {
    assert.equal(process.env.LIFE_QA_PRIVATE_DESKTOP, undefined)
    assert.equal(process.env.LIFE_PRODUCT_RENDERER, 'live2d')
    await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-host-viewport.ps1')], { windowsHide: true, timeout: 15000 })
  }
  else {
    assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP ?? '', /^AlicizationQA_[a-f0-9]{32}$/u)
    await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, timeout: 15000 })
  }
  await fs.mkdir(identity.reportRoot, { recursive: true })
  const resumeReport = process.env.LIFE_QA_INSTALLED_PERSONA_REPORT
  if (!resumeReport)
    assert.equal(await exists(profile), false, 'Never reuse an existing application-data identity')
  // The blockmap is written after NSIS finalizes the executable. A parallel
  // package job must finish before acceptance can launch its installer.
  await waitFor(async () => await exists(installer) && await exists(`${installer}.blockmap`))
  assert.equal((await fs.lstat(identity.release)).isSymbolicLink(), false)
  assert.equal((await fs.lstat(installer)).isSymbolicLink(), false)
  const requireApp = createRequire(path.join(workspace, 'apps/stage-tamagotchi/package.json'))
  const requireBuilder = createRequire(requireApp.resolve('electron-builder'))
  const requireLib = createRequire(requireBuilder.resolve('app-builder-lib'))
  const metadata = JSON.parse(requireLib('@electron/asar').extractFile(identity.unpackedAsar, 'package.json').toString('utf8'))
  assert.equal(metadata.name, identity.packageName, 'Do not install an older or production candidate')
  assert.equal(metadata.lifeQaInstallerId, identity.runId)
  const installerSha256 = await hash(installer)
  const asarSha256 = await hash(identity.unpackedAsar)
  let installRoot
  let nonce
  let personaResult
  if (resumeReport) {
    const reportPath = path.resolve(resumeReport)
    assert.ok(reportPath.startsWith(`${path.resolve('output/life-acceptance')}${path.sep}`) && reportPath.endsWith('.json'))
    const owner = JSON.parse(await fs.readFile(path.join(profile, 'life-installer-qa-owner.json'), 'utf8'))
    installRoot = owner.installRoot
    nonce = owner.nonce
    const verified = await assertInstallerProfileOwner({ workspace, runId: identity.runId, appData: process.env.APPDATA, profile, nonce, executable: path.join(installRoot, `${identity.executableName}.exe`) })
    assert.equal(owner.installerSha256, installerSha256)
    assert.equal(owner.asarSha256, asarSha256)
    personaResult = JSON.parse(await fs.readFile(reportPath, 'utf8'))
    assert.equal(personaResult.passed, true)
    assert.equal(path.resolve(personaResult.profile), verified.canonicalProfile)
    assert.equal(hostViewport ? isOwnedHostViewport(personaResult) : personaResult.nativeRuntime.privateDesktopVerified, true)
    assert.equal(path.resolve(personaResult.executable), path.join(installRoot, `${identity.executableName}.exe`))
    assert.equal(personaResult.portableExecutableSha256, owner.executableSha256)
  }
  else {
    installRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-installer-app-'))
  }
  assert.equal(path.dirname(installRoot).toLowerCase(), path.resolve(os.tmpdir()).toLowerCase())
  const executable = path.join(installRoot, `${identity.executableName}.exe`)
  if (!resumeReport)
    await runFile(installer, ['/S', '/currentuser', `/D=${installRoot}`], { windowsHide: true, timeout: 180000 })
  await waitFor(() => exists(executable))
  assert.equal(await hash(installer), installerSha256, 'Installer did not change during installation')
  assert.equal(await hash(path.join(installRoot, 'resources/app.asar')), asarSha256, 'Installation contains the exact packaged runtime')
  const executableSha256 = await hash(executable)
  assert.equal(executableSha256, await hash(identity.unpackedExecutable), 'Installed executable matches this exact candidate')
  if (!resumeReport) {
    nonce = randomUUID()
    await fs.mkdir(profile)
    await fs.writeFile(path.join(profile, 'life-installer-qa-owner.json'), JSON.stringify({ format: 'life-installer-qa-owner-v1', runId: identity.runId, nonce, installRoot, installerSha256, asarSha256, executableSha256 }), { flag: 'wx' })
    const personaReport = path.join(identity.reportRoot, 'persona.json')
    const persona = await runFile(process.execPath, [path.join(__dirname, 'life-current-persona-smoke.cjs')], { cwd: workspace, windowsHide: true, timeout: 150000, env: { ...process.env, LIFE_QA_EXE: executable, LIFE_QA_PROFILE: profile, LIFE_QA_PROFILE_NONCE: nonce, LIFE_QA_REPORT: personaReport } })
    await fs.writeFile(path.join(identity.reportRoot, 'installed-persona.log'), persona.stdout + persona.stderr)
    personaResult = JSON.parse(await fs.readFile(personaReport, 'utf8'))
  }
  assert.equal(personaResult.passed, true)
  assert.equal(personaResult.packagedAsarSha256, asarSha256)
  assert.equal(personaResult.shutdown.completed, true)
  assert.equal(personaResult.shutdown.exitCode, 0)
  const identityFiles = await findIdentityFiles(profile)
  assert.ok(identityFiles.some(file => path.basename(file) === 'SOUL.md'), 'Installed application really saved its own persona')
  assert.ok(identityFiles.some(file => path.basename(file) === 'alicization.db'), 'Installed native SQLite runtime really committed its own life state')
  const before = new Map(await Promise.all(identityFiles.map(async file => [file, await hash(file)])))
  // Reinstall the identical candidate over its own registered installation;
  // this proves repair persistence, not a different-version upgrade/rollback.
  await runFile(installer, ['/S', '/currentuser', `/D=${installRoot}`], { windowsHide: true, timeout: 180000 })
  assert.equal(await hash(executable), executableSha256)
  assert.equal(await hash(path.join(installRoot, 'resources/app.asar')), asarSha256)
  for (const [file, digest] of before)
    assert.equal(await hash(file), digest, 'Repair reinstall preserves the saved identity bytes')
  const uninstallerName = (await fs.readdir(installRoot)).find(file => /uninstall.*\.exe$/iu.test(file))
  assert.ok(uninstallerName, 'Owned NSIS uninstaller exists')
  await runFile(path.join(installRoot, uninstallerName), ['/S', '/currentuser'], { windowsHide: true, timeout: 180000 })
  await waitFor(async () => !await exists(executable))
  for (const [file, digest] of before)
    assert.equal(await hash(file), digest, 'Uninstall preserves the actual saved identity bytes')
  await runFile(installer, ['/S', '/currentuser', `/D=${installRoot}`], { windowsHide: true, timeout: 180000 })
  await waitFor(() => exists(executable))
  assert.equal(await hash(executable), executableSha256)
  assert.equal(await hash(path.join(installRoot, 'resources/app.asar')), asarSha256)
  const reopenAttempt = randomUUID()
  const reopenReport = path.join(identity.reportRoot, `reopen-${reopenAttempt}.json`)
  const reopen = await runFile(process.execPath, [path.join(__dirname, 'life-installer-reopen.cjs')], { cwd: workspace, windowsHide: true, timeout: 150000, env: { ...process.env, LIFE_QA_EXE: executable, LIFE_QA_PROFILE: profile, LIFE_QA_PROFILE_NONCE: nonce, LIFE_QA_REPORT: reopenReport } })
  await fs.writeFile(path.join(identity.reportRoot, `reinstalled-profile-${reopenAttempt}.log`), reopen.stdout + reopen.stderr, { flag: 'wx' })
  const reopened = JSON.parse(await fs.readFile(reopenReport, 'utf8'))
  assert.equal(reopened.passed, true)
  assert.equal(reopened.packagedAsarSha256, asarSha256)
  const soulFiles = identityFiles.filter(file => path.basename(file) === 'SOUL.md')
  for (const file of soulFiles)
    assert.equal(await hash(file), before.get(file), 'Reinstall reopening retains the initialized SOUL bytes')
  const afterReopen = new Map(await Promise.all(identityFiles.map(async file => [file, await hash(file)])))
  const finalUninstaller = (await fs.readdir(installRoot)).find(file => /uninstall.*\.exe$/iu.test(file))
  assert.ok(finalUninstaller)
  await runFile(path.join(installRoot, finalUninstaller), ['/S', '/currentuser'], { windowsHide: true, timeout: 180000 })
  await waitFor(async () => !await exists(executable))
  for (const [file, digest] of afterReopen)
    assert.equal(await hash(file), digest, 'Final uninstall preserves the reopened identity state')
  const result = { format: 'life-installer-acceptance-v4', passed: true, runId: identity.runId, installerSha256, asarSha256, executableSha256, scope: 'Isolated NSIS identity: actual persona/native SQLite and Live2D drawing, repair reinstall, uninstall, reinstall/reopen saved persona and Live2D, then final uninstall retaining state. Silent installation; different-version upgrade/rollback and manual installer UI remain unverified.', installRoot, profile, installer, reopenReport, resumedAfterGuardFailure: Boolean(resumeReport), installedRuntimeExact: true, installedPersonaAndSqlite: true, repairReinstallVerified: true, uninstallReinstallReopenVerified: true, persistedLive2dVerified: true, uninstallRemovedExecutable: true, savedIdentityFiles: identityFiles.length, identityBytesPreserved: true }
  await fs.writeFile(path.join(identity.reportRoot, 'installer.json'), JSON.stringify(result, null, 2), { flag: 'wx' })
  console.info(JSON.stringify(result))
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
