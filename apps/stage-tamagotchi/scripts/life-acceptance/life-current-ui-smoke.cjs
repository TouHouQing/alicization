const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions } = require('./electron-launch.cjs')

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-ui-'))
  console.info(JSON.stringify({ profile }))
  const app = await _electron.launch(launchOptions(profile))
  try {
    await new Promise(resolve => setTimeout(resolve, 5000))
    const stage = app.windows().find(page => page.url().endsWith('#/'))
    assert.ok(stage)
    const onboard = app.windows().find(page => page.url().endsWith('#/onboarding'))
    if (onboard) {
      const info = await onboard.evaluate(() => {
        const root = document.querySelector('#app')
        const nodes = []
        function walk(v) {
          if (!v || nodes.includes(v))
            return
          nodes.push(v)
          const child = v.component
          if (child) {
            walk(child.subTree)
          }
          if (Array.isArray(v.children))
            v.children.forEach(walk)
        }
        walk(root.__vue_app__._instance?.subTree || root.__vue_app__._container._vnode)
        return { stores: [...root.__vue_app__.config.globalProperties.$pinia._s.keys()], components: nodes.filter(v => v.component).map(v => ({ name: v.component.type.__name, state: Object.keys(v.component.setupState) })).filter(v => v.name === 'onboarding') }
      })
      console.info(JSON.stringify(info))
      await app.evaluate(({ BrowserWindow }) => {
        for (const w of BrowserWindow.getAllWindows()) {
          if (w.webContents.getURL().endsWith('#/onboarding'))
            w.hide()
        }
      })
    }
    await stage.locator('button').filter({ has: stage.locator('[i-solar\\:settings-minimalistic-outline]') }).last().click()
    await new Promise(resolve => setTimeout(resolve, 1000))
    const settings = app.windows().find(page => page.url().includes('#/settings'))
    assert.ok(settings)
    await app.evaluate(({ ipcMain, webContents }) => {
      globalThis.lifeQaWire = []
      ipcMain.prependListener('eventa-message', (_e, p) => {
        if (String(p?.type).includes('life'))
          globalThis.lifeQaWire.push({ direction: 'in', type: p.type, body: p.payload?.body })
      })
      for (const c of webContents.getAllWebContents()) {
        const send = c.send.bind(c)
        c.send = (name, ...args) => {
          if (name === 'eventa-message' && String(args[0]?.type).includes('life'))
            globalThis.lifeQaWire.push({ direction: 'out', type: args[0].type, body: args[0].payload?.body })
          return send(name, ...args)
        }
      }
    })
    const errors = []
    settings.on('pageerror', error => errors.push(error.message))
    settings.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        console.info(JSON.stringify({ rendererConsole: message.text() }))
    })
    await settings.waitForLoadState('domcontentloaded')
    await new Promise(resolve => setTimeout(resolve, 1500))
    await settings.evaluate(async () => {
      const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router
      await router.isReady()
      await router.push('/settings/life')
    })
    await settings.getByRole('button', { name: '保存交流节奏', exact: true }).waitFor()
    const first = settings.locator('input[type="number"]').first()
    await first.fill('2')
    await settings.getByRole('button', { name: '保存交流节奏', exact: true }).click()
    console.info(JSON.stringify({ buttons: await settings.locator('button').evaluateAll(buttons => buttons.map(b => ({ text: b.textContent, disabled: b.disabled, aria: b.getAttribute('aria-label') })).filter(b => b.text?.includes('保存') || b.aria?.includes('保存'))) }))
    await new Promise(resolve => setTimeout(resolve, 2500))
    console.info(JSON.stringify({ errors, alerts: await settings.locator('[role=alert]').allTextContents(), revision: await settings.locator('details').last().textContent(), cloneProbe: await settings.evaluate(() => {
      try {
        window.electron.ipcRenderer.send('life-qa-clone-probe', { policy: new Proxy({ maximumPerDay: 2 }, {}) })
        return 'sent'
      }
      catch (error) {
        return error.message
      }
    }) }))
    console.info(JSON.stringify({ wire: await app.evaluate(() => globalThis.lifeQaWire) }))
    await settings.waitForFunction(() => [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '保存交流节奏' || b.textContent.includes('保存交流节奏'))?.disabled === false)
    console.info(JSON.stringify({ afterSave: await settings.locator('[role=alert]').allTextContents(), values: await settings.locator('input[type=number]').evaluateAll(inputs => inputs.map(i => i.value)) }))
    assert.equal(await settings.locator('[role=alert]').count(), 0)
    assert.equal(await first.inputValue(), '2')
    await settings.reload()
    await first.waitFor()
    await settings.waitForFunction(() => document.querySelector('input[type=number]')?.value === '2')
    assert.equal(await first.inputValue(), '2')
    await settings.screenshot({ path: 'output/playwright/life-current-settings.png', fullPage: true })
    console.info(JSON.stringify({ profile, policyPersistedAfterReload: true, errors }))
  }
  finally {
    await app.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
