const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity, registerPrivateRuntime, closePrivateRuntime } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
async function tree(root) {
  const result = []
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      assert.equal(entry.isSymbolicLink(), false)
      if (entry.isDirectory()) {
        await walk(file)
      }
      else {
        assert.ok(entry.isFile())
        result.push({ path: path.relative(root, file), bytes: (await fs.stat(file)).size, sha256: hash(await fs.readFile(file)) })
      }
    }
  }
  await walk(root)
  return result.sort((a, b) => a.path.localeCompare(b.path))
}
async function click(locator) {
  await locator.waitFor({ state: 'visible', timeout: 30000 })
  assert.equal(await locator.evaluate((node) => {
    const box = node.getBoundingClientRect()
    if (!node.isConnected || !box.width || !box.height || node.disabled)
      return false
    node.scrollIntoView({ block: 'center' })
    node.click()
    return true
  }), true)
  await wait(150)
}
async function main() {
  assert.equal(process.cwd(), path.resolve(__dirname, '../../../..'), 'Run model restart acceptance from the workspace root')
  const reportPath = (value) => {
    assert.equal(typeof value, 'string')
    const file = path.resolve(value)
    assert.ok(file.startsWith(path.resolve('output') + path.sep) && file.endsWith('.json'))
    return file
  }
  const previous = JSON.parse(await fs.readFile(reportPath(process.env.LIFE_MODEL_RESTART_PREVIOUS_REPORT || process.env.LIFE_MODEL_RESTART_BASELINE_REPORT), 'utf8'))
  assert.equal(previous.shutdown?.completed, true)
  assert.equal(previous.shutdown.exitCode, 0)
  const baseline = JSON.parse(await fs.readFile(reportPath(process.env.LIFE_MODEL_RESTART_BASELINE_REPORT), 'utf8'))
  assert.equal(baseline.passed, true)
  assert.equal(baseline.shutdown.exitCode, 0)
  assert.equal(baseline.credentialsRemoved, true)
  assert.equal(path.dirname(await fs.realpath(baseline.profile)).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
  const packaged = await packageIdentity()
  assert.equal(packaged.packagedAsarSha256, baseline.packagedAsarSha256)
  assert.equal(packaged.portableExecutableSha256, baseline.portableExecutableSha256)
  assert.match(path.basename(baseline.profile), /^alicization-life-product-regression-/u)
  const source = await tree(baseline.profile)
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-imported-restart-'))
  for (const entry of await fs.readdir(baseline.profile))
    await fs.cp(path.join(baseline.profile, entry), path.join(profile, entry), { recursive: true, force: false, errorOnExist: true })
  assert.deepEqual(await tree(profile), source)
  const root = path.resolve(`output/live2d-imported-cold-restart-${crypto.randomUUID()}`)
  await fs.mkdir(root)
  const report = { format: 'live2d-imported-cold-restart-v1', passed: false, scope: 'Owned copy of a closed synthetic profile; actual model import/selection UI, full native exit then three real process cold reopens without rewriting preferences; actual File bytes and Cubism draw. Original acceptance profile remains byte-identical.', sourceProfile: baseline.profile, profile, root, sourceFiles: source, phases: [], errors: [] }
  await fs.writeFile(path.join(profile, 'life-imported-restart-owner.json'), JSON.stringify({ format: report.format, sourceProfile: baseline.profile, sourceFingerprint: hash(JSON.stringify(source)), nonce: crypto.randomUUID() }))
  const archive = await fs.readFile('packages/stage-ui/src/assets/live2d/models/hiyori_free_zh.zip')
  const expected = { name: 'QA-Cold-Restart-Live2D.ZIP', size: archive.length, sha256: hash(archive) }
  let modelId
  async function savedFile(stage) {
    return stage.evaluate(async () => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const settings = pinia._s.get('settings-stage-model')
      const catalogue = pinia._s.get('display-models')
      const model = await catalogue.getDisplayModel(settings.stageModelSelected)
      const file = model?.type === 'file' ? model.file : null
      return { renderer: settings.stageModelRenderer, modelId: settings.stageModelSelected, type: model?.type, file: file ? { name: file.name, size: file.size, sha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))).map(value => value.toString(16).padStart(2, '0')).join('') } : null }
    })
  }
  try {
    for (const phase of ['import-and-select', 'cold-reopen-1', 'cold-reopen-2', 'cold-reopen-3']) {
      const item = { phase, passed: false }
      report.phases.push(item)
      const app = await _electron.launch(launchOptions(profile))
      const nativeProcess = app.process()
      let runtime
      try {
        runtime = await registerPrivateRuntime(app)
        item.nativeRuntime = runtime
        const deadline = Date.now() + 45000
        let stage
        while (Date.now() < deadline) {
          stage = app.windows().find(page => page.url().endsWith('#/'))
          if (stage && await stage.evaluate(() => Boolean(document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('settings-stage-model'))).catch(() => false))
            break
          await wait(100)
        }
        assert.ok(stage, 'Actual stage must initialize')
        for (const page of app.windows())
          page.on('pageerror', error => report.errors.push(error.message))
        app.on('window', page => page.on('pageerror', error => report.errors.push(error.message)))
        if (phase === 'import-and-select') {
          await click(stage.locator('button:has([i-solar\\:alt-arrow-up-line-duotone])').last())
          // Both expanded layouts expose the same settings action.
          await click(stage.locator('button:visible:has([i-solar\\:settings-minimalistic-outline])').first())
          let settings
          for (let attempt = 0; attempt < 120; attempt++) {
            settings = app.windows().find(page => page.url().includes('#/settings'))
            if (settings)
              break
            await wait(100)
          }
          assert.ok(settings)
          await click(settings.locator('a[href="#/settings/models"]').first())
          await settings.waitForURL('**#/settings/models')
          await click(settings.getByRole('button', { name: /^(?:选择模型|Select Model)$/iu }))
          await click(settings.getByRole('button', { name: /^(?:导入模型|Import Model)$/iu }))
          const chooser = settings.waitForEvent('filechooser')
          await click(settings.getByRole('menuitem', { name: 'Live2D', exact: true }))
          await (await chooser).setFiles({ name: expected.name, mimeType: 'application/zip', buffer: archive }, { timeout: 60000 })
          await settings.getByText(expected.name, { exact: true }).waitFor({ timeout: 60000 })
          modelId = await settings.evaluate(name => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('display-models').displayModels.find(model => model.name === name).id, expected.name)
          await click(settings.getByText(expected.name, { exact: true }))
          await click(settings.getByRole('button', { name: /^(?:确认选择|Confirm Selection|Confirm)$/iu }))
        }
        const readyBy = Date.now() + 45000
        let body
        while (Date.now() < readyBy) {
          body = await sampleLive2D(stage).catch(() => null)
          if (body?.models.length === 1 && body.models[0].modelId === modelId && body.models[0].drawFrame?.frame > 0 && body.models[0].probes.some(point => point.pixel[3] > 64))
            break
          await wait(150)
        }
        assert.ok(body?.models.length === 1 && body.models[0].modelId === modelId && body.models[0].drawFrame?.frame > 0 && body.models[0].probes.some(point => point.pixel[3] > 64), 'Selected imported model must draw after complete native restart')
        item.file = await savedFile(stage)
        assert.equal(item.file.renderer, 'live2d')
        assert.equal(item.file.modelId, modelId)
        assert.equal(item.file.type, 'file')
        assert.deepEqual(item.file.file, expected)
        await wait(300)
        const next = await sampleLive2D(stage)
        assert.ok(next.models[0].drawFrame.frame > body.models[0].drawFrame.frame)
        item.body = next.models[0]
        await stage.screenshot({ path: path.join(root, `${phase}.png`) })
        assert.deepEqual(report.errors, [])
        item.passed = true
      }
      catch (error) {
        item.failure = error.message
        item.pages = []
        for (const [index, page] of app.windows().entries()) {
          if (page.isClosed())
            continue
          item.pages.push({ url: page.url(), text: await page.locator('body').textContent().then(text => text?.slice(0, 4000) ?? '', () => '') })
          await page.screenshot({ path: path.join(root, `${phase}-failure-${index}.png`) }).catch(() => {})
        }
        throw error
      }
      finally {
        item.shutdown = runtime ? await closePrivateRuntime(app, runtime, { viaUi: true, nativeProcess }) : await app.close().then(() => ({ completed: false }))
        item.passed &&= item.shutdown.completed && item.shutdown.exitCode === 0
        await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
      }
      assert.equal(item.passed, true)
    }
    assert.deepEqual(await tree(baseline.profile), source)
    report.originalProfileBytesUnchanged = true
    report.identity = await packageIdentity()
    report.modelId = modelId
    report.expectedFile = expected
    report.passed = true
  }
  catch (error) {
    report.failure = error.message
    throw error
  }
  finally {
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
    console.info(JSON.stringify({ report: path.join(root, 'report.json'), passed: report.passed, phases: report.phases.map(item => ({ phase: item.phase, passed: item.passed, failure: item.failure, shutdown: item.shutdown?.exitCode })), failure: report.failure }))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
