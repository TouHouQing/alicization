const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, registerPrivateRuntime, closePrivateRuntime, packageIdentity } = require('./electron-launch.cjs')

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const workspace = path.resolve(__dirname, '../../../..')
function ownedOutput(file) {
  const absolute = path.resolve(file)
  assert.ok(absolute.startsWith(path.join(workspace, 'output') + path.sep))
  return absolute
}

async function main() {
  const bundle = ownedOutput(process.env.LIFE_PROCEDURE_BROWSER_BUNDLE)
  const baselineFile = ownedOutput(process.env.LIFE_PROCEDURE_BROWSER_BASE_REPORT)
  const snapshotFile = ownedOutput(process.env.LIFE_PROCEDURE_SOURCE_SNAPSHOT)
  const snapshot = JSON.parse(await fs.readFile(snapshotFile, 'utf8'))
  const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'bundle-source.json'), 'utf8'))
  assert.equal(manifest.format, 'alicization-procedure-browser-bundle-v1')
  async function unchangedInputs() {
    const git = args => execFileSync('git', args, { cwd: workspace, windowsHide: true, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trimEnd()
    assert.equal(git(['rev-parse', 'HEAD']), snapshot.head)
    const currentPaths = [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))].sort()
    assert.deepEqual(currentPaths, snapshot.files.map(file => file.path))
    for (const file of snapshot.files) {
      const target = path.join(workspace, file.path)
      const metadata = await fs.lstat(target).catch((error) => {
        if (error.code === 'ENOENT')
          return null
        throw error
      })
      if (Object.hasOwn(file, 'gitlink')) {
        assert.equal(metadata?.isDirectory(), true)
        assert.equal(git(['ls-files', '--stage', '--', file.path]), file.gitlink)
      }
      else if (file.sha256 === null) {
        assert.equal(metadata, null)
      }
      else {
        assert.ok(metadata)
        assert.equal(hash(metadata.isSymbolicLink() ? `symlink:${await fs.readlink(target)}` : await fs.readFile(target)), file.sha256, file.path)
      }
    }
    for (const [source, expected] of Object.entries(manifest.sourceHashes))
      assert.equal(hash(await fs.readFile(source)), expected, source)
    for (const file of manifest.files)
      assert.equal(hash(await fs.readFile(path.join(bundle, file.file))), file.sha256, file.file)
  }
  await unchangedInputs()
  const baseline = JSON.parse(await fs.readFile(baselineFile, 'utf8'))
  assert.equal(baseline.shutdown.completed, true)
  assert.equal(baseline.shutdown.exitCode, 0)
  assert.equal(baseline.credentialsRemoved, true)
  assert.match(path.basename(baseline.profile), /^alicization-life-product-regression-/u)
  assert.equal(path.dirname(await fs.realpath(baseline.profile)).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
  const originals = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      assert.equal(entry.isSymbolicLink(), false)
      if (entry.isDirectory())
        await walk(file)
      else
        originals.push({ path: path.relative(baseline.profile, file), sha256: hash(await fs.readFile(file)) })
    }
  }
  await walk(baseline.profile)
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-procedure-browser-native-'))
  for (const entry of await fs.readdir(baseline.profile))
    await fs.cp(path.join(baseline.profile, entry), path.join(profile, entry), { recursive: true, force: false, errorOnExist: true })
  const root = path.join(workspace, 'output', `procedure-browser-repair-native-${crypto.randomUUID()}`)
  await fs.mkdir(root)
  await fs.writeFile(path.join(profile, 'owned-browser-procedure-check.json'), JSON.stringify({ format: 'owned-browser-procedure-check-v1', root, bundle, sourceProfile: baseline.profile }))
  const report = { format: 'actual-browser-procedure-repair-v1', passed: false, scope: 'Exact bundled development sources in a packaged Electron host. Module integration including actual failed-page downgrade and repaired-version replay; this does not accept a release containing the feature.', profile, bundle, sourceProfile: baseline.profile, sourceSnapshot: { file: snapshotFile, fingerprint: snapshot.fingerprint, files: snapshot.files.length }, root, rounds: [] }
  let app
  let runtime
  try {
    app = await _electron.launch(launchOptions(profile))
    runtime = await registerPrivateRuntime(app)
    report.nativeRuntime = runtime
    report.compiledMainSha256 = runtime.hostViewport.actualMainSha256
    report.package = await packageIdentity()
    for (let index = 0; index < 200; index++) {
      const stage = app.windows().find(page => page.url().endsWith('#/'))
      if (stage && await stage.evaluate(() => Boolean(document.querySelector('#app')?.__vue_app__)).catch(() => false))
        break
      if (index === 199)
        throw new Error('Stage was not ready before native method acceptance')
      await wait(100)
    }
    for (const round of [1, 2, 3]) {
      const fixture = path.join(profile, `procedure-transfer-${round}`)
      await app.evaluate(async ({ app }, { file, fixture }) => {
        globalThis.__ownedProcedureBrowserCheck = { status: 'running' }
        void (async () => {
          try {
            const require = process.getBuiltinModule('node:module').createRequire(`${app.getAppPath()}/package.json`)
            const result = await require(file).runProcedureBrowserCheck(fixture)
            globalThis.__ownedProcedureBrowserCheck = { status: 'completed', result }
          }
          catch (error) {
            globalThis.__ownedProcedureBrowserCheck = { status: 'failed', failure: error.message, stack: error.stack }
          }
        })()
      }, { file: path.join(bundle, 'procedure-browser-check.mjs'), fixture })
      let state
      const deadline = Date.now() + 180000
      while (Date.now() < deadline) {
        state = await app.evaluate(() => globalThis.__ownedProcedureBrowserCheck)
        if (state.status !== 'running')
          break
        await wait(250)
      }
      report.rounds.push({ round, ...state })
      await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
      assert.equal(state.status, 'completed', JSON.stringify(state))
      assert.equal(state.result.passed, true)
    }
    report.passed = true
  }
  catch (error) {
    report.failure = error.message
    process.exitCode = 1
  }
  finally {
    try {
      if (app)
        report.shutdown = await closePrivateRuntime(app, runtime, { viaUi: true })
      report.passed &&= report.shutdown?.completed && report.shutdown.exitCode === 0
      for (const file of originals)
        assert.equal(hash(await fs.readFile(path.join(baseline.profile, file.path))), file.sha256)
      await unchangedInputs()
      report.originalProfileBytesUnchanged = true
      report.compiledInputsUnchanged = true
    }
    catch (error) {
      report.passed = false
      report.verificationFailure = error.message
    }
    if (!report.passed)
      process.exitCode = 1
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
    console.info(JSON.stringify({ report: path.join(root, 'report.json'), passed: report.passed, rounds: report.rounds.length, shutdown: report.shutdown?.exitCode, failure: report.failure ?? report.verificationFailure }))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
