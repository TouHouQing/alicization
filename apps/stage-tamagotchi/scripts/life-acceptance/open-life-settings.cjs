const assert = require('node:assert/strict')

async function clickVisiblePrivateControl(locator) {
  await locator.waitFor({ state: 'visible', timeout: 25000 })
  const clicked = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    if (!element.isConnected || box.width <= 0 || box.height <= 0 || style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0' || element.disabled || element.getAttribute('aria-disabled') === 'true')
      return false
    // Private-desktop native mouse dispatch can wait forever when an Electron
    // handler opens another window. Exercise the actual compiled DOM handler.
    element.click()
    return true
  })
  assert.equal(clicked, true, 'Only an attached, visible, enabled real UI control may be clicked')
}

exports.clickVisiblePrivateControl = clickVisiblePrivateControl

exports.openLifeSettings = async function (application, stage) {
  let settings = application.windows().find(page => page !== stage && page.url().includes('#/settings'))
  if (!settings) {
    await clickVisiblePrivateControl(stage.locator('button:has([i-solar\\:settings-minimalistic-outline])').last())
    const deadline = Date.now() + 25000
    while (!settings && Date.now() < deadline) {
      settings = application.windows().find(page => page !== stage && page.url().includes('#/settings'))
      if (!settings)
        await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  assert.ok(settings, 'The real settings button must create its separate renderer')
  await settings.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__), {}, { timeout: 25000 })
  if (!settings.url().endsWith('#/settings/life'))
    await clickVisiblePrivateControl(settings.locator('a[href="#/settings/life"]').first())
  await application.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.webContents.getURL().endsWith('#/settings/life')) {
        window.webContents.setAudioMuted(true)
        window.showInactive()
      }
    }
  })
  return settings
}
