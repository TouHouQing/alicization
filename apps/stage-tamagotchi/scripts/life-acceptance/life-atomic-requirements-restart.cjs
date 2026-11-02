const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const scripts = __dirname
const { _electron } = require('playwright')

const { launchOptions, registerPrivateRuntime, closePrivateRuntime, packageIdentity } = require(path.join(scripts, 'electron-launch.cjs'))
const { sampleLive2D } = require(path.join(scripts, 'live2d-product-checks.cjs'))
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const hash = value => createHash('sha256').update(value).digest('hex')
async function tree(root) {
  const files = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      assert.equal(entry.isSymbolicLink(), false)
      if (entry.isDirectory()) {
        await walk(file)
      }
      else {
        assert.ok(entry.isFile())
        files.push({ path: path.relative(root, file), sha256: hash(await fs.readFile(file)) })
      }
    }
  }
  await walk(root)
  return files.sort((a, b) => a.path.localeCompare(b.path))
}
async function click(locator) {
  await locator.waitFor({ state: 'visible', timeout: 30000 })
  assert.equal(await locator.evaluate((node) => {
    const bounds = node.getBoundingClientRect()
    if (!node.isConnected || !bounds.width || !bounds.height || node.disabled)
      return false
    node.scrollIntoView({ block: 'center' })
    node.click()
    return true
  }), true)
  await wait(150)
}
async function main() {
  const baselinePath = path.resolve(process.env.LIFE_ATOMIC_BASELINE_REPORT || '')
  assert.ok(baselinePath.startsWith(path.resolve('output') + path.sep) && baselinePath.endsWith('/report.json'.replaceAll('/', path.sep)))
  const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'))
  assert.equal(baseline.passed, true)
  assert.equal(baseline.credentialsRemoved, true)
  assert.equal(baseline.shutdown.completed, true)
  assert.equal(baseline.shutdown.exitCode, 0)
  assert.equal(baseline.atomicRequirementExperiences.length, 3)
  assert.ok(baseline.atomicRequirementExperiences.every(item => item.prepared && !item.completed))
  assert.match(path.basename(baseline.profile), /^alicization-life-product-regression-/u)
  assert.equal(path.dirname(await fs.realpath(baseline.profile)).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
  const identity = await packageIdentity()
  assert.equal(identity.packagedAsarSha256, baseline.packagedAsarSha256)
  assert.equal(identity.portableExecutableSha256, baseline.portableExecutableSha256)
  const draftPath = path.join(scripts, 'atomic-requirements-product-checks.cjs')
  const bytes = await fs.readFile(draftPath, 'utf8')
  assert.equal(hash(bytes), baseline.qaDraft.sha256, 'Restart must use the exact accepted controller')
  const controller = { exports: require(draftPath) }
  const originalFiles = await tree(baseline.profile)
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-atomic-restart-'))
  for (const entry of await fs.readdir(baseline.profile))
    await fs.cp(path.join(baseline.profile, entry), path.join(profile, entry), { recursive: true, force: false, errorOnExist: true })
  assert.deepEqual(await tree(profile), originalFiles)
  const root = path.resolve(`output/atomic-requirements-cold-restart-${randomUUID()}`)
  await fs.mkdir(root)
  const report = { format: 'atomic-requirements-native-cold-restart-v1', scope: 'Three accepted host revisions; each continues after a complete native process restart on an owned profile copy. Original profile bytes preserved.', passed: false, root, profile, sourceProfile: baseline.profile, sourceFiles: originalFiles, baselinePath, identity, compiledMainSha256: baseline.compiledMainSha256, phases: [], checks: [], errors: [], atomicRequirementExperiences: [] }
  report.qaDraft = { acceptedPreparationSha256: baseline.qaDraft.sha256, currentControllerSha256: hash(bytes), preparationBytesIdentical: true, changedScope: 'none; exact accepted controller' }
  await fs.writeFile(path.join(profile, 'life-atomic-restart-owner.json'), JSON.stringify({ format: report.format, sourceProfile: baseline.profile, sourceFingerprint: hash(JSON.stringify(originalFiles)), nonce: randomUUID() }), { flag: 'wx' })
  const check = (name, passed, detail) => {
    report.checks.push({ name, passed, detail })
    assert.equal(passed, true, name)
  }
  const capture = async (page, label) => page.screenshot({ path: path.join(root, `${label}.png`) })
  try {
    for (const experience of structuredClone(baseline.atomicRequirementExperiences)) {
      const phase = { round: experience.round, passed: false }
      report.phases.push(phase)
      const app = await _electron.launch(launchOptions(profile))
      const nativeProcess = app.process()
      let runtime
      try {
        runtime = await registerPrivateRuntime(app)
        phase.nativeRuntime = runtime
        const by = Date.now() + 45000
        let stage
        while (Date.now() < by) {
          stage = app.windows().find(page => page.url().endsWith('#/'))
          if (stage && await stage.evaluate(() => Boolean(document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('settings-stage-model'))).catch(() => false))
            break
          await wait(150)
        }
        assert.ok(stage)
        const drawBy = Date.now() + 45000
        let startup
        while (Date.now() < drawBy) {
          startup = await sampleLive2D(stage).catch(() => null)
          if (startup?.models.length === 1 && startup.models[0].drawFrame?.frame > 0 && startup.models[0].probes.some(point => point.pixel[3] > 64))
            break
          await wait(150)
        }
        assert.ok(startup?.models.length === 1 && startup.models[0].drawFrame?.frame > 0, 'Actual Live2D drawing must be ready before the native restart workflow')
        phase.startupLive2D = startup.models[0]
        for (const page of app.windows()) page.on('pageerror', error => report.errors.push(error.message))
        app.on('window', page => page.on('pageerror', error => report.errors.push(error.message)))
        await click(stage.locator('button:has([i-solar\\:alt-arrow-up-line-duotone])').last())
        await click(stage.locator('button:visible:has([i-solar\\:settings-minimalistic-outline])').first())
        let settings
        for (let attempt = 0; attempt < 120; attempt++) {
          settings = app.windows().find(page => page.url().includes('#/settings'))
          if (settings)
            break
          await wait(100)
        }
        assert.ok(settings)
        phase.navigation = []
        settings.on('framenavigated', (frame) => {
          if (frame === settings.mainFrame())
            phase.navigation.push(frame.url())
        })
        await click(settings.locator('a[href="#/settings/life"]').first())
        await settings.waitForURL('**#/settings/life')
        await controller.exports.finishAtomicRequirementsAfterRestart({ settings, stage, pages: app.windows(), report, experience, capture, check })
        const body = await sampleLive2D(stage)
        assert.ok(body.models.length === 1 && body.models[0].drawFrame.frame > 0)
        assert.deepEqual(report.errors, [])
        phase.passed = true
      }
      catch (error) {
        phase.failure = error.message
        phase.pages = []
        for (const [index, page] of app.windows().entries()) {
          if (page.isClosed())
            continue
          phase.pages.push({ url: page.url(), text: await page.locator('body').textContent().then(text => text?.slice(0, 8000), () => null) })
          await capture(page, `round-${experience.round}-failure-${index}`).catch(() => {})
        }
        throw error
      }
      finally {
        phase.shutdown = runtime ? await closePrivateRuntime(app, runtime, { viaUi: true, nativeProcess }) : await app.close().then(() => ({ completed: false }))
        phase.passed &&= phase.shutdown.completed && phase.shutdown.exitCode === 0
        await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
      }
      assert.equal(phase.passed, true)
    }
    assert.deepEqual(await tree(baseline.profile), originalFiles)
    report.originalProfileBytesUnchanged = true
    report.passed = true
  }
  catch (error) {
    report.failure = error.message
    throw error
  }
  finally {
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
    console.info(JSON.stringify({ report: path.join(root, 'report.json'), passed: report.passed, rounds: report.phases.map(item => ({ round: item.round, passed: item.passed, nativeExit: item.shutdown?.exitCode })), failure: report.failure }))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
