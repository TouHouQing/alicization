const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity } = require('./electron-launch.cjs')

async function main() {
  const profile = process.env.LIFE_QA_PROFILE ? path.resolve(process.env.LIFE_QA_PROFILE) : await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-persona-'))
  if (process.env.LIFE_QA_PROFILE) {
    assert.equal(path.dirname(profile).toLowerCase(), path.resolve(process.env.APPDATA).toLowerCase())
    assert.equal(path.basename(profile), 'alicization-life-installer-20261005')
    const owner = JSON.parse(await fs.readFile(path.join(profile, 'life-installer-qa-owner.json'), 'utf8'))
    assert.ok(process.env.LIFE_QA_PROFILE_NONCE && owner.nonce === process.env.LIFE_QA_PROFILE_NONCE)
  }
  const archive = await packageIdentity()
  const app = await _electron.launch(launchOptions(profile))
  try {
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
    assert.deepEqual(errors, [], 'Persona setup renderer must not raise an exception')
    assert.deepEqual(await packageIdentity(), archive, 'The observed package must stay unchanged during native QA')
    const report = { format: 'life-native-persona-scene-v1', passed: true, profile, executable: process.env.LIFE_QA_EXE || 'electron-current-out', ...archive, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, softwareGlRequested: process.env.LIFE_QA_SOFTWARE_GL === '1', syntheticIdentity: true, configuredModel: false, savedAndAdvanced: true, snapshot, trayLabels, nativeTrayTranslated: true, rendererErrors: errors, scope: 'Isolated Windows desktop: real persona form confirmation, persisted synthetic SOUL, advancement and Chinese native tray labels; no language model or audio hardware.' }
    const reportPath = path.resolve(process.env.LIFE_QA_REPORT || 'output/life-acceptance/continuity-persona-scene.json')
    assert.ok(reportPath.startsWith(`${path.resolve('output/life-acceptance')}${path.sep}`) && reportPath.endsWith('.json'), 'QA evidence stays in its owned output directory')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.info(JSON.stringify(report))
  }
  finally {
    await app.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
