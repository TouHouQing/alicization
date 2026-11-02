const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity, registerPrivateRuntime, closePrivateRuntime } = require('./electron-launch.cjs')
const { inspectHostViewportPackage } = require('./host-package-identity.cjs')
const { assertInstallerProfileOwner } = require('./installer-qa-identity.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

async function main() {
  const { errorMessageFrom } = await import('@moeru/std')
  let profile = process.env.LIFE_QA_PROFILE ? path.resolve(process.env.LIFE_QA_PROFILE) : await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-persona-'))
  let installerOwner
  if (process.env.LIFE_QA_PROFILE) {
    const verified = await assertInstallerProfileOwner({ workspace: path.resolve(__dirname, '../../../..'), runId: process.env.LIFE_QA_INSTALLER_ID, appData: process.env.APPDATA, profile, nonce: process.env.LIFE_QA_PROFILE_NONCE, executable: process.env.LIFE_QA_EXE })
    installerOwner = verified.owner
    profile = verified.canonicalProfile
  }
  const archive = await packageIdentity()
  if (installerOwner) {
    assert.equal(archive.packagedAsarSha256, installerOwner.asarSha256)
    assert.equal(archive.portableExecutableSha256, installerOwner.executableSha256)
  }
  const reportPath = path.resolve(process.env.LIFE_QA_REPORT || 'output/life-acceptance/continuity-persona-scene.json')
  assert.ok(reportPath.startsWith(`${path.resolve('output/life-acceptance')}${path.sep}`) && reportPath.endsWith('.json'), 'QA evidence stays in its owned output directory')
  await fs.mkdir(path.dirname(reportPath), { recursive: true })
  const viewport = process.env.LIFE_QA_HOST_VIEWPORT === '1' ? inspectHostViewportPackage({ executable: process.env.LIFE_QA_EXE, runId: process.env.LIFE_QA_INSTALLER_ID }) : null
  let report = { format: 'life-native-persona-scene-v1', passed: false, profile, startedAt: new Date().toISOString(), ...archive, ...(viewport ? { compiledMainSha256: viewport.mainSha256 } : {}) }
  const app = await _electron.launch(launchOptions(profile))
  let nativeRuntime
  try {
    nativeRuntime = await registerPrivateRuntime(app)
    await app.evaluate(({ Tray }) => {
      globalThis.lifeQaTrayLabels = []
      const original = Tray.prototype.setContextMenu
      Tray.prototype.setContextMenu = function (menu) {
        const labels = []
        const collect = (items) => {
          for (const item of items) {
            if (item.label)
              labels.push(item.label)
            if (item.submenu)
              collect(item.submenu.items)
          }
        }
        collect(menu.items)
        globalThis.lifeQaTrayLabels = labels
        return original.call(this, menu)
      }
    })
    await new Promise(resolve => setTimeout(resolve, 5000))
    const page = app.windows().find(page => page.url().endsWith('#/onboarding'))
    assert.ok(page)
    page.setDefaultTimeout(15000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    console.info(JSON.stringify({ profile, initialButtons: await page.getByRole('button').allTextContents() }))
    const waitForPersonaStep = async (expected) => {
      await page.waitForFunction((expected) => {
        let node = document.querySelector('form.persona-step')
        if (!node)
          return false
        const steps = [...node.querySelectorAll('ol > li')]
        if (steps.findIndex(step => step.getAttribute('aria-current') === 'step') + 1 !== expected)
          return false
        while (node) {
          if (Number(getComputedStyle(node).opacity) < 0.98)
            return false
          node = node.parentElement
        }
        return true
      }, expected)
    }
    if (await page.locator('form.persona-step').count() === 0)
      await page.getByRole('button').last().click()
    await waitForPersonaStep(1)
    await page.locator('form.persona-step input').first().fill('QA 小澄')
    await page.locator('form.persona-step input').nth(1).fill('QA 朋友')
    await page.locator('form.persona-step button[type=submit]').click()
    await waitForPersonaStep(2)
    await page.locator('form.persona-step textarea').first().fill('温柔、好奇，记得兑现承诺，也保留自己的想法。')
    await page.locator('form.persona-step button[type=submit]').click()
    await waitForPersonaStep(3)
    await page.locator('form.persona-step button[type=submit]').click()
    await waitForPersonaStep(4)
    await page.locator('form.persona-step textarea').first().waitFor()
    await page.waitForFunction(() => {
      let node = document.querySelector('form.persona-step')
      if (!node)
        return false
      while (node) {
        if (Number(getComputedStyle(node).opacity) < 0.98)
          return false
        node = node.parentElement
      }
      return true
    }).catch(async (error) => {
      const style = await page.evaluate(() => {
        const result = []
        let node = document.querySelector('form.persona-step')
        while (node) {
          const computed = getComputedStyle(node)
          result.push({ tag: node.tagName, class: node.className, opacity: computed.opacity, animation: computed.animationName, playState: computed.animationPlayState })
          node = node.parentElement
        }
        return { result, title: document.querySelector('form.persona-step h2')?.textContent, visibility: document.visibilityState }
      })
      const windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(window => ({ url: window.webContents.getURL(), visible: window.isVisible(), minimized: window.isMinimized() })))
      console.info(JSON.stringify({ animationTimeout: true, style, windows }))
      throw error
    })
    await page.screenshot({ path: 'output/playwright/life-current-persona-review.png' })
    await page.locator('form.persona-step button[type=submit]').click()
    await page.waitForFunction(() => !document.querySelector('form.persona-step'))
    assert.equal(await page.locator('[role=alert]').count(), 0)
    const snapshot = await page.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')
      return { needsGenesis: store.needsGenesis, initialized: store.soul?.frontmatter?.initialized, name: store.soul?.frontmatter?.profile?.alicizationName, host: store.soul?.frontmatter?.profile?.hostName }
    })
    assert.equal(snapshot.needsGenesis, false)
    assert.equal(snapshot.initialized, true)
    assert.equal(snapshot.name, 'QA 小澄')
    assert.equal(snapshot.host, 'QA 朋友')
    await page.screenshot({ path: 'output/playwright/life-current-persona-after.png' })
    console.info(JSON.stringify({ profile, snapshot, errors, savedAndAdvanced: true }))
    await page.evaluate(() => {
      const settings = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-general')
      if (!settings)
        throw new Error('Actual language settings store unavailable')
      settings.language = 'zh-Hans'
    })
    await new Promise(resolve => setTimeout(resolve, 600))
    const trayLabels = await app.evaluate(() => globalThis.lifeQaTrayLabels)
    assert.ok(trayLabels.length > 8, 'Actual native tray menu was rebuilt')
    assert.ok(trayLabels.every(label => !label.includes('tamagotchi.electron.')), 'No raw translation keys in the native tray menu')
    assert.ok(trayLabels.some(label => /设置/u.test(label)), 'The Windows tray menu actually uses Chinese labels')
    console.info(JSON.stringify({ profile, trayLabels, nativeTrayTranslated: true }))
    const stage = app.windows().find(candidate => candidate.url().endsWith('#/'))
    assert.ok(stage, 'Persona completion opens the actual stage')
    await stage.evaluate(async () => {
      const model = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')
      model.stageModelSelected = 'preset-live2d-1'
      await model.updateStageModel()
    })
    const drawBy = Date.now() + 30000
    let body
    while (Date.now() < drawBy) {
      body = await sampleLive2D(stage)
      if (body.models.length === 1 && body.models[0].probes.some(point => point.pixel[3] > 64))
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(body?.models.length === 1 && body.models[0].probes.some(point => point.pixel[3] > 64), 'Actual Live2D draws after persona initialization')
    report.live2d = { selected: 'preset-live2d-1', draw: body.models[0], savedSelection: true }
    await stage.screenshot({ path: path.join(path.dirname(reportPath), 'persona-live2d.png') })
    assert.deepEqual(errors, [], 'Persona setup renderer must not raise an exception')
    assert.deepEqual(await packageIdentity(), archive, 'The observed package must stay unchanged during native QA')
    report = { ...report, passed: true, executable: process.env.LIFE_QA_EXE || 'electron-current-out', nativeRuntime, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, softwareGlRequested: process.env.LIFE_QA_SOFTWARE_GL === '1', syntheticIdentity: true, configuredModel: false, savedAndAdvanced: true, snapshot, trayLabels, nativeTrayTranslated: true, rendererErrors: errors, scope: 'Isolated Windows desktop: real persona form confirmation, persisted synthetic SOUL, advancement and Chinese native tray labels; no language model or audio hardware.' }
  }
  catch (error) {
    report.failure = errorMessageFrom(error)
    throw error
  }
  finally {
    const shutdown = nativeRuntime ? await closePrivateRuntime(app, nativeRuntime) : await app.close().then(() => ({ completed: false, reason: 'runtime-identity-unverified' }))
    report.shutdown = shutdown
    report.finishedAt = new Date().toISOString()
    report.passed &&= shutdown.completed === true && shutdown.exitCode === 0
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.info(JSON.stringify(report))
    if (!report.passed)
      process.exitCode = 1
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
