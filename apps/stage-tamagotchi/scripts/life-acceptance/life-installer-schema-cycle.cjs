const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')
const { DatabaseSync } = require('node:sqlite')
const { promisify } = require('node:util')

const { _electron } = require('playwright')

const { launchOptions, registerPrivateRuntime, closePrivateRuntime, nativeRuntimeProcess } = require('./electron-launch.cjs')
const { assertInstallerProfileOwner } = require('./installer-qa-identity.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const runFile = promisify(execFile)
const workspace = path.resolve(__dirname, '../../../..')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const hashFile = async file => hash(await fs.readFile(file))
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const exists = file => fs.access(file).then(() => true, () => false)
const quote = name => `"${name.replaceAll('"', '""')}"`

async function lifeFiles(directory, depth = 0) {
  assert.ok(depth < 9)
  const result = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    assert.equal(entry.isSymbolicLink(), false)
    const file = path.join(directory, entry.name)
    if (entry.isDirectory())
      result.push(...await lifeFiles(file, depth + 1))
    else if (['SOUL.md', 'alicization.db'].includes(entry.name) && !file.split(path.sep).includes('backups'))
      result.push(file)
  }
  return result
}

function databaseSnapshot(file) {
  const db = new DatabaseSync(file, { readOnly: true })
  try {
    assert.deepEqual(db.prepare('PRAGMA quick_check').all().map(row => row.quick_check), ['ok'])
    const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name').all().map(row => row.name)
    const version = db.prepare('SELECT value FROM alicization_meta WHERE key=\'life.schema.version\'').get()?.value
    const counts = {}
    const immutable = {}
    for (const table of tables) {
      // Vector virtual tables and their internal storage are outside this schema proof.
      if (table.includes('vec') || table.includes('embedding'))
        continue
      counts[table] = db.prepare(`SELECT count(*) AS total FROM ${quote(table)}`).get().total
      if (['life_commits', 'life_input_payloads', 'memory_facts', 'episodic_events', 'life_evidence_dependencies'].includes(table)) {
        immutable[table] = db.prepare(`SELECT * FROM ${quote(table)}`).all().map(row => hash(JSON.stringify(row))).sort()
      }
    }
    return { version: Number(version), counts, immutable }
  }
  finally {
    db.close()
  }
}

function retained(before, after) {
  for (const [table, hashes] of Object.entries(before.immutable)) {
    const current = new Set(after.immutable[table] || [])
    for (const digest of hashes)
      assert.ok(current.has(digest), `Migration changed pre-existing ${table} evidence`)
  }
}

async function main() {
  assert.equal(process.cwd(), workspace)
  assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f0-9]{32}$/u)
  assert.equal(process.env.LIFE_QA_HOST_VIEWPORT, undefined)
  assert.equal(process.env.LIFE_PRODUCT_RENDERER, 'live2d')
  const inputPath = path.resolve(process.env.LIFE_SCHEMA_CYCLE_INPUT || '')
  assert.equal(path.dirname(inputPath), path.join(workspace, 'output'))
  const input = JSON.parse(await fs.readFile(inputPath, 'utf8'))
  assert.equal(input.format, 'alicization-schema-installer-cycle-input-v1')
  const runId = process.env.LIFE_QA_INSTALLER_ID
  const profile = path.join(process.env.APPDATA, `alicization-life-installer-${runId}`)
  const marker = path.join(profile, 'life-installer-qa-owner.json')
  const owner = JSON.parse(await fs.readFile(marker, 'utf8'))
  const executable = path.join(owner.installRoot, `alicization-lifeqa-${runId}.exe`)
  const verified = await assertInstallerProfileOwner({ workspace, runId, appData: process.env.APPDATA, profile, nonce: owner.nonce, executable })
  const root = path.join(workspace, 'output', `schema-installer-cycle-${randomUUID()}`)
  await fs.mkdir(root)
  await fs.writeFile(path.join(root, 'input.json'), JSON.stringify(input, null, 2), { flag: 'wx' })
  await fs.writeFile(path.join(root, 'initial-owner.json'), await fs.readFile(marker), { flag: 'wx' })
  const req = createRequire(path.join(workspace, 'apps/stage-tamagotchi/package.json'))
  const asar = createRequire(createRequire(req.resolve('electron-builder')).resolve('app-builder-lib'))('@electron/asar')
  const report = { format: 'alicization-installed-schema-cycle-v1', passed: false, profile: verified.canonicalProfile, runId, phases: [], scope: 'Actual frozen schema-6 installer, current schema-7 installer, native backup failure dialog, successful recovery and older-runtime refusal on the same owned synthetic profile. Exact owned native dialog controls are read with bounded WM_GETTEXT and closed once with WM_CLOSE on an inactive desktop; no physical mouse or model-dialogue claim.' }
  let active = false
  async function noActive() {
    const query = `$ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process -Filter "Name='alicization-lifeqa-${runId}.exe'" | Select-Object ProcessId) | ConvertTo-Json -Compress`
    const { stdout } = await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', query], { windowsHide: true, timeout: 15000 })
    assert.deepEqual(JSON.parse(stdout || '[]'), [])
    assert.equal(active, false)
  }
  async function install(artifact) {
    await noActive()
    assert.match(artifact.installerSha256, /^[a-f0-9]{64}$/u)
    assert.match(artifact.asarSha256, /^[a-f0-9]{64}$/u)
    assert.match(artifact.mainSha256, /^[a-f0-9]{64}$/u)
    assert.equal(await hashFile(artifact.installer), artifact.installerSha256)
    assert.ok(path.resolve(artifact.installer).startsWith(path.join(workspace, 'apps/stage-tamagotchi/dist') + path.sep))
    await runFile(artifact.installer, ['/S', '/currentuser', `/D=${owner.installRoot}`], { windowsHide: true, timeout: 180000 })
    const archive = path.join(owner.installRoot, 'resources/app.asar')
    assert.equal(await hashFile(archive), artifact.asarSha256)
    // NSIS replaced the bytes at this same path. The reader caches archive
    // header offsets; never reuse the previous version's index after install.
    asar.uncache(archive)
    const metadata = JSON.parse(asar.extractFile(archive, 'package.json'))
    assert.equal(metadata.lifeQaInstallerId, runId)
    assert.equal(metadata.name, `alicization-life-installer-${runId}`)
    assert.equal(metadata.version, artifact.version)
    assert.equal(hash(asar.extractFile(archive, path.normalize('out/main/index.js'))), artifact.mainSha256)
    await assertInstallerProfileOwner({ workspace, runId, appData: process.env.APPDATA, profile, nonce: owner.nonce, executable })
    await fs.writeFile(marker, JSON.stringify({ ...owner, installerSha256: artifact.installerSha256, asarSha256: artifact.asarSha256, executableSha256: await hashFile(executable) }))
  }
  async function launch(name, artifact, expectedError) {
    await noActive()
    process.env.LIFE_QA_EXE = executable
    process.env.LIFE_QA_PROFILE_NONCE = owner.nonce
    const app = await _electron.launch(launchOptions(profile))
    active = true
    const phase = { name, artifactMainSha256: artifact.mainSha256, passed: false }
    let runtime
    let native
    let fullyExited = false
    try {
      runtime = await registerPrivateRuntime(app)
      native = nativeRuntimeProcess(app)
      phase.nativeRuntime = runtime
      assert.equal(await app.evaluate(() => process.getBuiltinModule('node:crypto').createHash('sha256').update(process.getBuiltinModule('node:fs').readFileSync(process.getBuiltinModule('node:path').join(process.resourcesPath, 'app.asar/out/main/index.js'))).digest('hex')), artifact.mainSha256)
      if (expectedError) {
        let errorLog
        const errorDeadline = Date.now() + 15000
        while (!errorLog && Date.now() < errorDeadline) {
          const names = (await fs.readdir(path.join(profile, 'logs'))).filter(name => /^alicization-tamagotchi-\d{13}\.log$/u.test(name)
            && Number(name.slice('alicization-tamagotchi-'.length, -4)) >= runtime.nativeProcessObservation.startedAt)
          assert.ok(names.length <= 1, 'Only this new native process may own the startup log')
          if (names.length) {
            const file = path.join(profile, 'logs', names[0])
            const body = await fs.readFile(file, 'utf8')
            // Pretty logs insert ANSI resets between the logger name and text.
            // All three facts must still belong to one actual error entry.
            if (body.split('\n').some(line => line.includes('[main]') && line.includes('Error during app initialization') && line.includes(expectedError)))
              errorLog = file
          }
          if (!errorLog)
            await delay(50)
        }
        assert.ok(errorLog, 'The current installed process must independently record the expected startup error')
        phase.errorLog = { path: errorLog, expectedError, source: 'new-log-after-authenticated-native-child-start' }
        const logs = []
        native.stdout.on('data', bytes => logs.push(bytes.toString()))
        const exited = new Promise(resolve => native.once('exit', (code, signal) => resolve({ code, signal, at: Date.now() })))
        const connection = app._connection?.toImpl?.(app)?._nodeConnection
        assert.equal(typeof connection?.close, 'function')
        // Detach the harness before the application's real close button runs.
        connection.close()
        const requestedAt = Date.now()
        const { stdout } = await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-File', path.join(__dirname, 'invoke-owned-startup-close.ps1'), '-RuntimePid', String(runtime.pid), '-Executable', executable, '-ExecutableSha256', await hashFile(executable), '-ExpectedError', expectedError, '-ErrorLogPath', errorLog], { windowsHide: true, timeout: 45000 })
        phase.dialog = JSON.parse(stdout)
        let timer
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('The rejected version did not close normally')), 15000)
        })
        const exit = await Promise.race([exited, timeout]).finally(() => clearTimeout(timer))
        assert.equal(exit.code, 0)
        assert.equal(exit.signal, null)
        fullyExited = true
        active = false
        phase.shutdown = { completed: true, exitCode: exit.code, nativeProcessObservation: runtime.nativeProcessObservation, nativeExitObservedAt: exit.at, elapsedMs: exit.at - requestedAt, fileFlushObserved: logs.join('').includes('[FileLogger] Session log file:'), windowTeardownObserved: logs.join('').includes('[app-exit] Desktop windows closed; exiting') }
        assert.ok(phase.shutdown.fileFlushObserved && phase.shutdown.windowTeardownObserved)
        phase.errorLog.finalSha256 = await hashFile(errorLog)
        await fs.writeFile(path.join(root, `${name}.log`), logs.join(''), { flag: 'wx' })
      }
      else {
        let stage
        let body
        const deadline = Date.now() + 45000
        while (Date.now() < deadline) {
          stage = app.windows().find(page => page.url().endsWith('#/'))
          body = stage && await sampleLive2D(stage).catch(() => null)
          if (body?.models.length === 1 && body.models[0].probes.some(point => point.pixel[3] > 64))
            break
          await delay(150)
        }
        assert.ok(body?.models.length === 1 && body.models[0].probes.some(point => point.pixel[3] > 64))
        phase.identity = await stage.evaluate(() => {
          const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s
          const soul = stores.get('alicization-epoch1').soul.frontmatter
          return { initialized: soul.initialized, name: soul.profile.alicizationName, host: soul.profile.hostName, renderer: stores.get('settings-stage-model').stageModelRenderer }
        })
        assert.deepEqual(phase.identity, { initialized: true, name: 'QA 小澄', host: 'QA 朋友', renderer: 'live2d' })
        await stage.screenshot({ path: path.join(root, `${name}-live2d.png`) })
        phase.shutdown = await closePrivateRuntime(app, runtime, { viaUi: true })
        fullyExited = phase.shutdown.completed && phase.shutdown.exitCode === 0
        active = !fullyExited
        assert.equal(fullyExited, true)
      }
      phase.passed = true
    }
    catch (error) {
      phase.failure = String(error)
      if (error.stderr)
        phase.errorDialogStderr = String(error.stderr).slice(-4000)
      throw error
    }
    finally {
      if (!fullyExited && runtime)
        phase.cleanup = await closePrivateRuntime(app, runtime).catch(error => ({ failure: String(error) }))
      if (!fullyExited && native) {
        const stoppedBy = Date.now() + 1500
        while (native.exitCode === null && native.signalCode === null && Date.now() < stoppedBy)
          await delay(50)
      }
      if (native && (native.exitCode !== null || native.signalCode !== null)) {
        active = false
        if (!fullyExited)
          phase.cleanupStoppedActualChild = { exitCode: native.exitCode, signal: native.signalCode, successfulShutdownClaimed: false }
      }
      report.phases.push(phase)
      await fs.writeFile(path.join(root, `${name}.json`), JSON.stringify(phase, null, 2), { flag: 'wx' })
    }
  }
  try {
    const files = await lifeFiles(path.join(profile, 'alicizations'))
    const databases = files.filter(file => path.basename(file) === 'alicization.db')
    const souls = new Map(await Promise.all(files.filter(file => path.basename(file) === 'SOUL.md').map(async file => [file, await hashFile(file)])))
    assert.ok(databases.length > 0 && souls.size > 0)
    const before = new Map(databases.map(file => [file, databaseSnapshot(file)]))
    assert.ok([...before.values()].every(snapshot => snapshot.version === 6))
    await install(input.baseline)
    await launch('baseline-schema6', input.baseline)
    const baseline = new Map(databases.map(file => [file, databaseSnapshot(file)]))
    for (const [file, snapshot] of before) retained(snapshot, baseline.get(file))
    await install(input.upgrade)
    // Block only the exact migration backup entry, never ACLs or user files.
    const directory = path.join(path.dirname(databases[0]), 'backups')
    const saved = `${directory}.schema-cycle-${randomUUID()}`
    assert.ok(directory.startsWith(verified.canonicalProfile + path.sep) || directory.startsWith(profile + path.sep))
    const hadBackups = await exists(directory)
    await fs.writeFile(path.join(root, 'migration-backup-fault.json'), JSON.stringify({ profile: verified.canonicalProfile, directory, saved, hadBackups, nonce: owner.nonce, expectedFaultText: 'Owned temporary migration-backup fault' }, null, 2), { flag: 'wx' })
    if (hadBackups) {
      assert.ok((await fs.lstat(directory)).isDirectory())
      assert.equal((await fs.lstat(directory)).isSymbolicLink(), false)
      await fs.rename(directory, saved)
    }
    await fs.writeFile(directory, 'Owned temporary migration-backup fault', { flag: 'wx' })
    try {
      await launch('migration-backup-failure', input.upgrade, 'EEXIST')
      for (const [file, snapshot] of baseline) {
        const failed = databaseSnapshot(file)
        assert.equal(failed.version, 6)
        retained(snapshot, failed)
      }
    }
    finally {
      assert.equal(active, false, 'Restore the backup entry only after the exact application has ended')
      assert.equal(await fs.readFile(directory, 'utf8'), 'Owned temporary migration-backup fault')
      await fs.unlink(directory)
      if (hadBackups)
        await fs.rename(saved, directory)
    }
    await launch('recovered-schema7', input.upgrade)
    for (const [file, snapshot] of baseline) {
      const upgraded = databaseSnapshot(file)
      assert.equal(upgraded.version, 7)
      retained(snapshot, upgraded)
      const backups = await fs.readdir(path.join(path.dirname(file), 'backups'))
      const matching = backups.filter(name => /^life-schema-6-to-7-[a-f\d-]{36}\.db$/u.test(name))
      assert.ok(matching.length > 0)
      const backup = databaseSnapshot(path.join(path.dirname(file), 'backups', matching.at(-1)))
      assert.equal(backup.version, 6)
      retained(snapshot, backup)
    }
    const upgraded = new Map(databases.map(file => [file, databaseSnapshot(file)]))
    await install(input.baseline)
    await launch('older-runtime-refusal', input.baseline, 'Unsupported life schema version')
    for (const [file, snapshot] of upgraded)
      assert.deepEqual(databaseSnapshot(file), snapshot, 'The older runtime must leave newer life state intact')
    await install(input.upgrade)
    await launch('final-schema7-reopen', input.upgrade)
    for (const [file, digest] of souls)
      assert.equal(await hashFile(file), digest, 'Personhood must survive the entire installed cycle')
    await noActive()
    const uninstaller = (await fs.readdir(owner.installRoot)).find(name => /uninstall.*\.exe$/iu.test(name))
    assert.ok(uninstaller)
    await runFile(path.join(owner.installRoot, uninstaller), ['/S', '/currentuser'], { windowsHide: true, timeout: 180000 })
    for (let attempt = 0; attempt < 120 && await exists(executable); attempt++) await delay(500)
    assert.equal(await exists(executable), false)
    for (const [file, digest] of souls) assert.equal(await hashFile(file), digest)
    report.finalSchema = databases.map(file => ({ file, ...databaseSnapshot(file) }))
    report.uninstallRetainedLife = true
    report.passed = true
  }
  catch (error) {
    report.failure = String(error)
    throw error
  }
  finally {
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
    console.info(JSON.stringify({ root, passed: report.passed, phases: report.phases.length }))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
