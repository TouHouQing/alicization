const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { closePrivateRuntime, launchOptions, registerPrivateRuntime } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

async function main() {
  const root = path.resolve(process.env.LIFE_RENDER_FAILURE_ROOT || 'output/live2d-render-failure-check')
  assert.ok(root.startsWith(`${path.resolve('output')}${path.sep}`))
  await fs.mkdir(root, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-render-failure-'))
  const options = launchOptions(profile)
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND')
  options.env.PORT = String(await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  }))
  const report = { format: 'live2d-render-failure-check-v1', profile, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, checks: [], pageErrors: [], consoleErrors: [], rendererFailures: [], passed: false }
  const app = await _electron.launch(options)
  const observe = (page) => {
    page.on('pageerror', error => report.pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error')
        report.consoleErrors.push({ url: page.url(), message: message.text() })
      if (message.type() === 'error' && message.text().includes('[Live2D] Renderer unavailable.'))
        report.rendererFailures.push({ url: page.url(), message: message.text() })
    })
  }
  app.on('window', observe)
  app.windows().forEach(observe)
  const check = (name, condition, detail) => {
    report.checks.push({ name, passed: Boolean(condition), detail })
    assert.ok(condition, name)
  }
  try {
    report.nativeRuntime = await registerPrivateRuntime(app)
    let stage
    for (let attempt = 0; attempt < 150; attempt++) {
      stage = app.windows().find(page => page.url().endsWith('#/'))
      if (stage)
        break
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    assert.ok(stage, 'Actual desktop stage exists')
    await stage.getByRole('button', { name: '打开设置', exact: true }).evaluate(node => node.click())
    let settings
    for (let attempt = 0; attempt < 100; attempt++) {
      settings = app.windows().find(page => page.url().endsWith('#/settings'))
      if (settings)
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(settings, 'Actual settings window exists')
    await settings.locator('a[href="#/settings/models"]').evaluate(node => node.click())
    await settings.getByRole('button', { name: '选择模型', exact: true }).evaluate(node => node.click())
    await settings.getByText('Hiyori (Pro)', { exact: true }).evaluate(node => node.click())
    await settings.getByRole('button', { name: '确认选择', exact: true }).evaluate(node => node.click())
    const drawnModel = async () => {
      let sample
      for (let attempt = 0; attempt < 150; attempt++) {
        sample = await sampleLive2D(stage)
        if (sample.models.length === 1 && sample.models[0].drawFrame?.frame > 0 && !sample.models[0].renderState.contextLost)
          return sample
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      throw new Error(`The actual Live2D model did not draw: ${JSON.stringify(sample)}`)
    }
    report.before = await drawnModel()
    check('A real Live2D model drew before the failure', report.before.models.length === 1)
    const contextLoss = await stage.locator('canvas').first().evaluate((canvas) => {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2')
      const extension = gl?.getExtension('WEBGL_lose_context')
      if (!extension)
        return { supported: false }
      window.__lifeQaLostCanvas = canvas
      extension.loseContext()
      return { supported: true }
    })
    check('The actual WebGL context supports a native loss fault', contextLoss.supported, contextLoss)
    const panel = stage.locator('[data-stage-render-failure]')
    await panel.waitFor({ state: 'visible', timeout: 10000 })
    check('Actual WebGL context loss reaches the desktop alert', await panel.getAttribute('data-stage-render-failure') === 'LIVE2D_CONTEXT_LOST')
    check('An unavailable body is not reported as mounted', await stage.evaluate(() => document.documentElement.dataset.alicizationStageMounted !== 'true'))
    check('Localized failure text is visible', (await panel.textContent()).includes('角色画面暂不可用'))
    await stage.screenshot({ path: path.join(root, 'renderer-failure.png') })
    await panel.getByRole('button', { name: '重新加载', exact: true }).evaluate(node => node.click())
    report.after = await drawnModel()
    await panel.waitFor({ state: 'detached', timeout: 10000 })
    check('Retry replaces the lost canvas and mounts the new body', await stage.evaluate(() => document.querySelector('canvas') !== window.__lifeQaLostCanvas && !window.__lifeQaLostCanvas.isConnected && document.documentElement.dataset.alicizationStageMounted === 'true'))
    check('The replacement body produces real draw frames', report.after.models[0].drawFrame.frame > 0, report.after.models[0].drawFrame)
    check('Renderer failure and retry produce no unhandled page errors', report.pageErrors.length === 0, report.pageErrors)
    await stage.screenshot({ path: path.join(root, 'renderer-recovered.png') })
  }
  catch (error) {
    report.failure = error.message
    report.pages = await Promise.all(app.windows().filter(page => page.url().startsWith('file:')).map(async page => ({ url: page.url(), text: (await page.locator('body').textContent()).slice(-6000), state: await page.evaluate(() => {
      const model = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('settings-stage-model')
      return { renderer: model?.stageModelRenderer, modelUrl: model?.stageModelSelectedUrl, mounted: document.documentElement.dataset.alicizationStageMounted }
    }) })))
  }
  finally {
    report.shutdown = await closePrivateRuntime(app, report.nativeRuntime, { viaUi: true })
    report.passed = !report.failure && report.shutdown.completed && report.shutdown.exitCode === 0
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  }
  console.info(JSON.stringify({ passed: report.passed, checks: report.checks.length, failure: report.failure, shutdown: report.shutdown }))
  assert.ok(report.passed, report.failure || 'Native application shutdown failed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
