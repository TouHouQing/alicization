const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')
const { promisify } = require('node:util')

const { assertInstallerProfileOwner, installerQaIdentity } = require('./installer-qa-identity.cjs')

const runFile = promisify(execFile)
const workspace = path.resolve(__dirname, '../../../..')
const identity = installerQaIdentity({ workspace, runId: process.env.LIFE_QA_INSTALLER_ID, appData: process.env.APPDATA })
const root = path.join(workspace, 'output', `execution-${identity.runId}-version-cycle-${randomUUID()}`)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const hashFile = async file => hash(await fs.readFile(file))
const exists = file => fs.access(file).then(() => true, () => false)

async function identityFiles(directory, depth = 0) {
  const files = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    assert.equal(entry.isSymbolicLink(), false, 'A saved QA profile cannot redirect this installer test')
    if (entry.isDirectory() && depth < 5)
      files.push(...await identityFiles(file, depth + 1))
    else if (entry.isFile() && ['SOUL.md', 'alicization.db', 'life-installer-qa-owner.json'].includes(entry.name))
      files.push(file)
  }
  return files
}

async function noActiveCandidate() {
  const query = `$ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process -Filter "Name='${identity.executableName}.exe'" | Select-Object ProcessId,ExecutablePath) | ConvertTo-Json -Compress`
  const { stdout } = await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', query], { windowsHide: true, timeout: 15000 })
  assert.deepEqual(JSON.parse(stdout || '[]'), [], 'The exact QA identity must be fully closed before installer transitions')
}

async function main() {
  assert.equal(process.env.LIFE_QA_HOST_VIEWPORT, '1')
  assert.equal(process.env.LIFE_PRODUCT_RENDERER, 'live2d')
  assert.equal(process.env.LIFE_QA_PRIVATE_DESKTOP, undefined)
  const expectedMainSha256 = process.env.LIFE_QA_VERSION_MAIN_SHA256
  assert.match(expectedMainSha256 || '', /^[a-f0-9]{64}$/u)
  await fs.mkdir(root)
  const markerPath = path.join(identity.profile, 'life-installer-qa-owner.json')
  const initialMarker = await fs.readFile(markerPath, 'utf8')
  const owner = JSON.parse(initialMarker)
  const executable = path.join(owner.installRoot, `${identity.executableName}.exe`)
  const verified = await assertInstallerProfileOwner({ workspace, runId: identity.runId, appData: process.env.APPDATA, profile: identity.profile, nonce: owner.nonce, executable })
  await noActiveCandidate()
  const startedInstalled = await exists(executable)
  if (startedInstalled) {
    assert.equal(await hashFile(executable), owner.executableSha256)
    assert.equal(await hashFile(path.join(owner.installRoot, 'resources/app.asar')), owner.asarSha256)
  }
  await fs.writeFile(path.join(root, 'initial-owner.json'), initialMarker, { flag: 'wx' })
  const req = createRequire(path.join(workspace, 'apps/stage-tamagotchi/package.json'))
  const asar = createRequire(createRequire(req.resolve('electron-builder')).resolve('app-builder-lib'))('@electron/asar')
  const result = { format: 'life-installer-version-cycle-v1', passed: false, runId: identity.runId, profile: verified.canonicalProfile, installRoot: owner.installRoot, startedInstalled, phases: [], scope: 'Same compiled runtime with QA metadata versions 0.3.0 and 0.3.1: actual NSIS upgrade and downgrade, saved SOUL/native database and Live2D reopen. This does not test a schema migration, a new product release, voice or manual installer UI. An existing baseline is accepted only with exact owned executable and ASAR hashes; earlier failed installs remain failed.' }
  const life = await identityFiles(verified.canonicalProfile)
  assert.ok(life.some(file => path.basename(file) === 'SOUL.md') && life.some(file => path.basename(file) === 'alicization.db'))
  const soul = new Map(await Promise.all(life.filter(file => path.basename(file) === 'SOUL.md').map(async file => [file, await hashFile(file)])))
  try {
    for (const [phase, version, release] of [
      ['baseline', '0.3.0', identity.release],
      ['upgrade', '0.3.1', `${identity.release}-upgrade-0.3.1`],
      ['rollback', '0.3.0', identity.release],
    ]) {
      await noActiveCandidate()
      const installer = path.join(release, path.basename(identity.installer))
      const archive = path.join(release, 'win-unpacked/resources/app.asar')
      const metadata = JSON.parse(asar.extractFile(archive, 'package.json'))
      assert.equal(metadata.name, identity.packageName)
      assert.equal(metadata.lifeQaInstallerId, identity.runId)
      assert.equal(metadata.version, version)
      const mainHash = hash(asar.extractFile(archive, path.normalize('out/main/index.js')))
      assert.equal(mainHash, expectedMainSha256)
      const before = new Map(await Promise.all(life.map(async file => [file, await hashFile(file)])))
      const installerHash = await hashFile(installer)
      const asarHash = await hashFile(archive)
      if (phase !== 'baseline' || !startedInstalled)
        await runFile(installer, ['/S', '/currentuser', `/D=${owner.installRoot}`], { windowsHide: true, timeout: 180000 })
      assert.equal(await hashFile(installer), installerHash)
      assert.equal(await hashFile(path.join(owner.installRoot, 'resources/app.asar')), asarHash)
      assert.equal(await hashFile(executable), await hashFile(path.join(release, 'win-unpacked', path.basename(executable))))
      for (const [file, digest] of before)
        assert.equal(await hashFile(file), digest, `${phase} must preserve saved data before application startup`)
      // Only this nonce-bound QA control marker follows the newly installed
      // package. Personhood, database and model-selection data are never edited.
      await assertInstallerProfileOwner({ workspace, runId: identity.runId, appData: process.env.APPDATA, profile: identity.profile, nonce: owner.nonce, executable })
      const nextOwner = { ...owner, installerSha256: installerHash, asarSha256: asarHash, executableSha256: await hashFile(executable) }
      await fs.writeFile(path.join(root, `${phase}-owner-before.json`), await fs.readFile(markerPath), { flag: 'wx' })
      await fs.writeFile(markerPath, JSON.stringify(nextOwner))
      const report = path.join(identity.reportRoot, `reopen-${randomUUID()}.json`)
      try {
        const output = await runFile(process.execPath, [path.join(__dirname, 'life-installer-reopen.cjs')], { cwd: workspace, windowsHide: true, timeout: 120000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, LIFE_QA_PROFILE: identity.profile, LIFE_QA_PROFILE_NONCE: owner.nonce, LIFE_QA_EXE: executable, LIFE_QA_REPORT: report, LIFE_QA_EXPECT_VERSION: version } })
        await fs.writeFile(path.join(root, `${phase}-reopen.log`), output.stdout + output.stderr, { flag: 'wx' })
      }
      catch (error) {
        await fs.writeFile(path.join(root, `${phase}-reopen.log`), String(error.stdout || '') + String(error.stderr || '') + String(error), { flag: 'wx' })
        throw error
      }
      const reopened = JSON.parse(await fs.readFile(report, 'utf8'))
      assert.equal(reopened.passed, true)
      assert.equal(reopened.applicationVersion, version)
      for (const [file, digest] of soul) assert.equal(await hashFile(file), digest)
      result.phases.push({ phase, version, installation: phase === 'baseline' && startedInstalled ? 'existing-exact-owned-baseline' : 'actual-silent-nsis', installerSha256: installerHash, asarSha256: asarHash, mainSha256: mainHash, report, identityFilesUnchangedDuringInstall: before.size, savedSoulUnchangedAfterReopen: true, nativeShutdownMs: reopened.shutdown.elapsedMs })
      await fs.writeFile(path.join(root, `${phase}.json`), JSON.stringify(result.phases.at(-1), null, 2), { flag: 'wx' })
    }
    await noActiveCandidate()
    const before = new Map(await Promise.all(life.map(async file => [file, await hashFile(file)])))
    const uninstaller = (await fs.readdir(owner.installRoot)).find(file => /uninstall.*\.exe$/iu.test(file))
    assert.ok(uninstaller)
    await runFile(path.join(owner.installRoot, uninstaller), ['/S', '/currentuser'], { windowsHide: true, timeout: 180000 })
    for (let i = 0; i < 120 && await exists(executable); i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    assert.equal(await exists(executable), false)
    for (const [file, digest] of before) assert.equal(await hashFile(file), digest)
    result.finalUninstallPreservedData = true
    result.passed = true
  }
  catch (error) {
    result.failure = String(error)
    throw error
  }
  finally {
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(result, null, 2), { flag: 'wx' })
    console.info(JSON.stringify({ root, passed: result.passed, phases: result.phases.length }))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
