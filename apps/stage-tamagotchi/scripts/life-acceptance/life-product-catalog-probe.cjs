/* eslint-disable style/max-statements-per-line */
/* eslint-disable unicorn/prefer-dom-node-text-content -- Product diagnostics read rendered text. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions } = require('./electron-launch.cjs')

async function main() {
  const source = JSON.parse(await fs.readFile('output/product-regression-20261014-dev4/report.json', 'utf8'))
  assert.equal(source.syntheticIdentity, true)
  assert.equal(source.credentialsRemoved, true)
  assert.match(path.basename(source.profile), /^alicization-life-product-regression-/)
  const root = path.resolve('output/product-catalog-probe-20261014')
  await fs.mkdir(root, { recursive: true })
  const app = await _electron.launch(launchOptions(source.profile))
  const report = { pages: [] }
  const click = async (locator) => { await locator.evaluate((node) => { node.scrollIntoView(); node.click() }, undefined, { timeout: 10000 }); await new Promise(resolve => setTimeout(resolve, 1000)) }
  const capture = async (page, name) => {
    const screenshot = path.join(root, `${report.pages.length}-${name}.png`)
    await page.screenshot({ path: screenshot })
    report.pages.push({ name, url: page.url(), screenshot, text: await page.locator('body').innerText(), links: await page.locator('a').evaluateAll(nodes => nodes.map(node => ({ href: node.getAttribute('href'), text: node.textContent }))) })
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  }
  try {
    await new Promise(resolve => setTimeout(resolve, 5000))
    // A credential-free catalogue fixture; first launch is covered separately.
    await app.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (window.webContents.getURL().endsWith('#/onboarding'))
          window.hide()
      }
    })
    const stage = app.windows().find(page => page.url().endsWith('#/'))
    await click(stage.locator('button:has([i-solar\\:settings-minimalistic-outline])').last())
    const settings = app.windows().find(page => page.url().includes('#/settings'))
    assert.ok(settings)
    await click(settings.locator('a[href="#/settings/providers"]'))
    for (const route of ['chat/openrouter-ai', 'chat/aihubmix', 'chat/ollama', 'speech/speech-noop']) {
      if (await settings.locator(`a[href="#/settings/providers/${route}"]`).count() === 0) {
        await capture(settings, `missing-${route.split('/').at(-1)}`)
        await click(settings.getByRole('button', { name: route.startsWith('chat') ? '对话模型' : '语音合成', exact: true }))
      }
      await click(settings.locator(`a[href="#/settings/providers/${route}"]`))
      await capture(settings, `entered-${route.split('/').at(-1)}`)
      await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
      await capture(settings, `back-${route.split('/').at(-1)}`)
    }
  }
  catch (error) {
    report.failure = error.message; for (const page of app.windows()) {
      if (page.url().includes('#/settings'))
        await capture(page, 'failure')
    } throw error
  }
  finally { await app.close(); await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2)) }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
