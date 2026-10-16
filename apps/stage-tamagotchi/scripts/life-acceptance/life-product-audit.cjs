/* eslint-disable style/max-statements-per-line */
/* eslint-disable unicorn/prefer-dom-node-text-content -- Record rendered product text, excluding hidden panels. */
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { closePrivateRuntime, launchOptions, packageIdentity, registerPrivateRuntime } = require('./electron-launch.cjs')

// Inspect only this job's synthetic app windows; never target the input desktop.
async function main() {
  const root = path.resolve(process.env.LIFE_PRODUCT_AUDIT_ROOT || 'output/product-audit-20261014')
  if (!root.startsWith(`${path.resolve('output')}${path.sep}`))
    throw new Error('Audit evidence must stay in workspace output')
  await fs.mkdir(root, { recursive: true })
  let profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-audit-'))
  if (process.env.LIFE_PRODUCT_AUDIT_SOURCE) {
    const source = path.resolve(process.env.LIFE_PRODUCT_AUDIT_SOURCE)
    if (!source.startsWith(`${path.resolve('output')}${path.sep}`))
      throw new Error('Continuation requires this workspace audit report')
    const prior = JSON.parse(await fs.readFile(source, 'utf8'))
    if (!/^alicization-life-product-audit-[\w-]+$/.test(path.basename(prior.profile)))
      throw new Error('Continuation only accepts a synthetic product audit identity')
    profile = prior.profile
  }
  const identity = await packageIdentity()
  const app = await _electron.launch(launchOptions(profile))
  const nativeRuntime = await registerPrivateRuntime(app)
  const errors = []
  const records = []
  const observe = (page) => {
    page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }))
    page.on('console', (message) => {
      if (message.type() === 'error' && page.url().startsWith('file:'))
        errors.push({ url: page.url(), message: message.text() })
    })
    page.on('requestfailed', (request) => {
      if (request.url().startsWith('file:'))
        errors.push({ url: request.url(), message: request.failure()?.errorText })
    })
  }
  app.on('window', observe)
  app.windows().forEach(observe)
  const capture = async (label) => {
    const windows = []
    for (const [i, page] of app.windows().entries()) {
      if (page.isClosed() || !page.url().includes('index.html#'))
        continue
      const state = await page.evaluate(() => {
        const visible = (node) => {
          const r = node.getBoundingClientRect()
          const s = getComputedStyle(node)
          return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'
        }
        const controls = [...document.querySelectorAll('a,button,input,textarea,select,[role=switch],[role=combobox],summary')].filter(visible).map(node => ({
          tag: node.tagName,
          role: node.getAttribute('role'),
          text: node.textContent?.trim().slice(0, 160),
          aria: node.getAttribute('aria-label'),
          title: node.getAttribute('title'),
          href: node.getAttribute('href'),
          placeholder: node.getAttribute('placeholder'),
          type: node.getAttribute('type'),
          disabled: node.disabled,
          value: node.type === 'password' ? '[redacted]' : /key|token|secret/i.test(`${node.name} ${node.id} ${node.placeholder}`) ? '[redacted]' : node.value,
        }))
        const model = document.querySelector('#app').__vue_app__?.config.globalProperties.$pinia?._s.get('settings-stage-model')
        return { text: document.body.innerText, controls, dimensions: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth }, alerts: [...document.querySelectorAll('[role=alert]')].map(node => node.textContent), stage: model ? { renderer: model.stageModelRenderer, modelId: model.stageModelSelected, sourceUrl: model.stageModelSelectedUrl, mounted: document.documentElement.dataset.alicizationStageMounted } : null }
      })
      const screenshot = path.join(root, `${String(records.length).padStart(3, '0')}-${label.replace(/[^\w-]/g, '_')}-${i}.png`)
      await page.screenshot({ path: screenshot, timeout: 5000 }).catch(error => errors.push({ url: page.url(), message: `Screenshot: ${error.message}` }))
      windows.push({ url: page.url(), screenshot, ...state })
    }
    const result = { label, at: new Date().toISOString(), windows, errors: [...errors] }
    records.push(result)
    await fs.writeFile(path.join(root, 'audit.json'), JSON.stringify({ profile, ...identity, nativeRuntime, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, records }, null, 2))
    return result
  }
  try {
    await new Promise(resolve => setTimeout(resolve, 6000))
    await fs.writeFile(path.join(root, 'ready.json'), JSON.stringify(await capture('first-launch'), null, 2))
    let previous = ''
    const deadline = Date.now() + 840000
    while (Date.now() < deadline) {
      let command
      try { command = JSON.parse(await fs.readFile(path.join(root, 'command.json'), 'utf8')) }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); continue }
      if (command.id === previous) { await new Promise(resolve => setTimeout(resolve, 250)); continue }
      previous = command.id
      let result
      try {
        if (command.action === 'stop') {
          await fs.writeFile(path.join(root, 'response.json'), JSON.stringify({ id: command.id, stopped: true }))
          break
        }
        const pages = app.windows().filter(page => !page.isClosed() && (!command.url || (command.url === 'stage' ? page.url().endsWith('#/') : page.url().includes(command.url))))
        if (command.action !== 'snapshot' && pages.length !== 1)
          throw new Error(`Expected one app page, found ${pages.length}`)
        const page = pages[0]
        const target = command.selector ? page.locator(command.selector).nth(command.index || 0) : command.role ? page.getByRole(command.role, { name: command.name, exact: command.exact !== false }).nth(command.index || 0) : null
        if (command.action === 'click') {
          await target.evaluate((node) => {
            const r = node.getBoundingClientRect()
            const s = getComputedStyle(node)
            if (!node.isConnected || !r.width || !r.height || s.display === 'none' || s.visibility === 'hidden' || node.disabled)
              throw new Error('Control is unavailable')
            node.scrollIntoView({ block: 'center' })
            node.click()
          }, undefined, { timeout: 5000 })
        }
        else if (command.action === 'fill') {
          await target.fill(command.value, { timeout: 5000 })
        }
        else if (command.action === 'select') {
          await target.selectOption(command.value, { timeout: 5000 })
        }
        else if (command.action === 'press') {
          await target.press(command.key, { timeout: 5000 })
        }
        else if (command.action === 'reload') {
          await page.reload()
        }
        else if (command.action === 'back') {
          await page.goBack()
        }
        else if (command.action !== 'snapshot') {
          throw new Error('Unknown audit action')
        }
        await new Promise(resolve => setTimeout(resolve, command.waitMs || 900))
        result = { id: command.id, result: await capture(command.label || command.id) }
      }
      catch (error) { result = { id: command.id, error: error.message } }
      await fs.writeFile(path.join(root, 'response.json'), JSON.stringify(result, null, 2))
    }
  }
  finally {
    const shutdown = await closePrivateRuntime(app, nativeRuntime)
    await fs.writeFile(path.join(root, 'shutdown.json'), JSON.stringify(shutdown))
    if (!shutdown.completed || shutdown.exitCode !== 0)
      process.exitCode = 1
    console.info(JSON.stringify({ root, profile, records: records.length, rendererErrors: errors, shutdown }))
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
