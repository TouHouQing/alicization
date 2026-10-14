const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions } = require('./electron-launch.cjs')

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-backup-ui-'))
  const app = await _electron.launch(launchOptions(profile))
  try {
    let stage
    for (let i = 0; i < 100; i++) {
      stage = app.windows().find(p => p.url().endsWith('#/'))
      if (stage)
        break
      await new Promise(r => setTimeout(r, 200))
    }
    assert.ok(stage)
    await app.evaluate(({ BrowserWindow }) => {
      for (const w of BrowserWindow.getAllWindows()) {
        if (w.webContents.getURL().endsWith('#/onboarding'))
          w.hide()
      }
    })
    await stage.locator('button').filter({ has: stage.locator('[i-solar\\:settings-minimalistic-outline]') }).last().click()
    let settings
    for (let i = 0; i < 60; i++) {
      settings = app.windows().find(p => p.url().includes('#/settings'))
      if (settings)
        break
      await new Promise(r => setTimeout(r, 100))
    }
    assert.ok(settings)
    settings.setDefaultTimeout(30000)
    const errors = []
    settings.on('pageerror', error => errors.push(error.message))
    await settings.waitForLoadState('domcontentloaded')
    await new Promise(r => setTimeout(r, 1500))
    await settings.evaluate(async () => {
      const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router
      await router.isReady()
      await router.push('/settings/life')
    })
    await settings.getByRole('button', { name: '保存交流节奏', exact: true }).waitFor()
    console.info(JSON.stringify({ profile, url: settings.url(), summaries: await settings.locator('summary').allTextContents(), headings: await settings.locator('h2').allTextContents(), buttons: await settings.getByRole('button').allTextContents(), errors }))
    await settings.screenshot({ path: 'output/playwright/life-current-backup-page.png', fullPage: true })
    await settings.locator('summary').filter({ hasText: '本地备份与恢复' }).click()
    await settings.getByRole('button', { name: '创建备份', exact: true }).click()
    await settings.getByRole('button', { name: '恢复此备份', exact: true }).waitFor()
    assert.equal(await settings.locator('[role=alert]').count(), 0)
    const entries = await fs.readdir(path.join(profile, 'alicizations', 'life-backups'))
    const backupId = entries.find(name => /^[a-f\d-]{36}$/.test(name))
    const manifest = JSON.parse(await fs.readFile(path.join(profile, 'alicizations', 'life-backups', backupId, 'manifest.json'), 'utf8'))
    assert.equal(manifest.cardId, 'default')
    assert.equal(manifest.schemaVersion, 5)
    await settings.getByRole('button', { name: '查看备份', exact: true }).click()
    assert.equal(await settings.getByRole('button', { name: '恢复此备份', exact: true }).count(), 1)
    await settings.screenshot({ path: 'output/playwright/life-current-backup-ui.png', fullPage: true })
    await settings.getByRole('button', { name: '恢复此备份', exact: true }).click()
    await new Promise(r => setTimeout(r, 800))
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('#/settings'))
      w.destroy()
    })
    await new Promise(r => setTimeout(r, 1500))
    const pending = await fs.access(path.join(profile, 'alicizations', 'life-backups', 'restore-request.json')).then(() => true, () => false)
    assert.equal(pending, false)
    const result = { profile, backupId, schemaVersion: manifest.schemaVersion, createdAndListed: true, ownerWindowCloseCancelsNativeConfirmation: true, restoreWasNotRequested: !pending }
    await fs.writeFile('output/playwright/life-current-backup-ui-result.json', JSON.stringify(result, null, 2))
    console.info(JSON.stringify(result))
  }
  finally {
    for (const page of app.windows()) {
      if (page.url().includes('#/settings'))
        console.info(JSON.stringify(await page.evaluate(() => ({ url: location.href, headings: [...document.querySelectorAll('h2')].map(n => n.textContent), buttons: [...document.querySelectorAll('button')].map(n => ({ text: n.textContent, display: getComputedStyle(n).display, visibility: getComputedStyle(n).visibility })), summaries: [...document.querySelectorAll('summary')].map(n => n.textContent), alerts: [...document.querySelectorAll('[role=alert]')].map(n => n.textContent) })).catch(() => ({ unavailable: true }))))
    }
    await app.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
