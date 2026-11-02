const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity, registerPrivateRuntime, closePrivateRuntime } = require('./electron-launch.cjs')
const { inspectHostViewportPackage } = require('./host-package-identity.cjs')
const { assertInstallerProfileOwner } = require('./installer-qa-identity.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const verified = await assertInstallerProfileOwner({ workspace, runId: process.env.LIFE_QA_INSTALLER_ID, appData: process.env.APPDATA, profile: process.env.LIFE_QA_PROFILE, nonce: process.env.LIFE_QA_PROFILE_NONCE, executable: process.env.LIFE_QA_EXE })
  const root = verified.identity.reportRoot
  const reportPath = path.resolve(process.env.LIFE_QA_REPORT || '')
  assert.equal(path.dirname(reportPath), root)
  assert.match(path.basename(reportPath), /^reopen-[a-f\d-]{36}\.json$/u)
  const archived = await packageIdentity()
  assert.equal(archived.packagedAsarSha256, verified.owner.asarSha256)
  assert.equal(archived.portableExecutableSha256, verified.owner.executableSha256)
  const viewport = process.env.LIFE_QA_HOST_VIEWPORT === '1' ? inspectHostViewportPackage({ executable: process.env.LIFE_QA_EXE, runId: process.env.LIFE_QA_INSTALLER_ID }) : null
  const report = { format: 'life-installed-profile-reopen-v1', passed: false, profile: verified.canonicalProfile, ...archived, ...(viewport ? { compiledMainSha256: viewport.mainSha256 } : {}), errors: [], scope: 'Actual installed runtime reopening the same nonce-owned persona and persisted Live2D selection; no model dialogue or physical input.' }
  const app = await _electron.launch(launchOptions(verified.canonicalProfile))
  let runtime
  try {
    runtime = await registerPrivateRuntime(app)
    report.nativeRuntime = runtime
    report.applicationVersion = await app.evaluate(({ app }) => app.getVersion())
    if (process.env.LIFE_QA_EXPECT_VERSION)
      assert.equal(report.applicationVersion, process.env.LIFE_QA_EXPECT_VERSION, 'The actual installed application must report the expected version')
    const observe = page => page.on('pageerror', error => report.errors.push(error.message))
    app.on('window', observe)
    app.windows().forEach(observe)
    const readyBy = Date.now() + 45000
    let stage
    let body
    let identity
    while (Date.now() < readyBy) {
      stage = app.windows().find(page => page.url().endsWith('#/'))
      if (stage) {
        identity = await stage.evaluate(() => {
          const stores = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s
          const soul = stores?.get('alicization-epoch1')
          const model = stores?.get('settings-stage-model')
          return { initialized: soul?.soul?.frontmatter?.initialized, name: soul?.soul?.frontmatter?.profile?.alicizationName, host: soul?.soul?.frontmatter?.profile?.hostName, renderer: model?.stageModelRenderer, model: model?.stageModelSelected }
        })
        body = await sampleLive2D(stage).catch(() => null)
        if (identity.initialized === true && body?.models.length === 1 && body.models[0].probes.some(point => point.pixel[3] > 64))
          break
      }
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    assert.ok(stage)
    assert.deepEqual(identity, { initialized: true, name: 'QA 小澄', host: 'QA 朋友', renderer: 'live2d', model: 'preset-live2d-1' })
    assert.ok(body?.models.length === 1 && body.models[0].probes.some(point => point.pixel[3] > 64), 'Reinstalled application really draws the saved Live2D body')
    for (const page of app.windows())
      assert.equal(await page.locator('form.persona-step').count(), 0, 'Reinstall must not ask to create a different persona')
    assert.deepEqual(report.errors, [])
    await stage.screenshot({ path: path.join(root, `${path.basename(reportPath, '.json')}-live2d.png`) })
    report.identity = identity
    report.live2d = body.models[0]
    assert.deepEqual(await packageIdentity(), archived)
    report.passed = true
  }
  catch (error) {
    report.failure = error.message
    throw error
  }
  finally {
    report.shutdown = runtime ? await closePrivateRuntime(app, runtime, { viaUi: true }) : await app.close().then(() => ({ completed: false, reason: 'runtime-not-registered' }))
    report.passed &&= report.shutdown.completed && report.shutdown.exitCode === 0
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' })
  }
  assert.equal(report.passed, true)
  console.info(JSON.stringify({ passed: report.passed, profile: report.profile, identity: report.identity, shutdown: report.shutdown }))
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
