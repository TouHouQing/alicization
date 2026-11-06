const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { performance } = require('node:perf_hooks')
const process = require('node:process')

const { _electron } = require('playwright')

const { closePrivateRuntime, launchOptions, packageIdentity, registerPrivateRuntime } = require('./electron-launch.cjs')

/** Inspect the real entry with a fresh profile or a copy of renderer storage. */
async function main() {
  const root = path.resolve(process.env.LIFE_STARTUP_OUTPUT || 'output/playwright/desktop-startup-20261104')
  assert.ok(root.startsWith(`${path.resolve('output/playwright')}${path.sep}`))
  await fs.mkdir(root, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-startup-'))
  const report = { format: 'desktop-startup-regression-v1', profile, passed: false, errors: [], ...(await packageIdentity()) }
  const copiedFolders = []
  let application
  let identity
  let stage
  const save = () => fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  try {
    if (process.env.LIFE_STARTUP_SOURCE_PROFILE) {
      const source = path.resolve(process.env.LIFE_STARTUP_SOURCE_PROFILE)
      assert.notEqual(source.toLowerCase(), profile.toLowerCase())
      for (const folder of ['Local Storage', 'IndexedDB']) {
        copiedFolders.push(folder)
        await fs.cp(path.join(source, folder), path.join(profile, folder), { recursive: true })
      }
      await fs.copyFile(path.join(source, 'app-options.json'), path.join(profile, 'app-options.json'))
      report.copiedRendererSettings = true
    }
    const started = performance.now()
    const options = launchOptions(profile)
    if (process.env.LIFE_QA_HOST_VIEWPORT === '1') {
      report.backgroundSchedulerFlags = ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion']
      options.args.push(...report.backgroundSchedulerFlags)
    }
    application = await _electron.launch(options)
    const observe = (page) => {
      page.on('pageerror', (error) => {
        if (report.errors.length < 20)
          report.errors.push({ url: page.url(), error: error.message })
      })
    }
    application.on('window', observe)
    application.windows().forEach(observe)
    identity = await registerPrivateRuntime(application)
    report.nativeRuntime = identity
    for (let attempt = 0; attempt < 100; attempt++) {
      stage = application.windows().find(page => page.url().endsWith('#/'))
      if (stage)
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(stage, 'Desktop stage must exist on normal startup')
    await stage.waitForFunction(() => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia
      return document.documentElement.dataset.alicizationStageMounted === 'true'
        && pinia?._s.get('chat-session')?.isReady
    }, null, { timeout: 15000 })
    report.readyMs = Math.round(performance.now() - started)
    report.stage = await stage.evaluate(() => {
      const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s
      const sessions = stores.get('chat-session')
      const messages = sessions.sessionMessages[sessions.activeSessionId] ?? []
      return {
        ready: document.documentElement.dataset.alicizationStagePageReady,
        mounted: document.documentElement.dataset.alicizationStageMounted,
        renderer: stores.get('settings-stage-model').stageModelRenderer,
        historyCount: sessions.sessionMessages[sessions.activeSessionId]?.length,
        historyIdentity: { uniqueIds: new Set(messages.map(message => message.id)).size, missingIds: messages.filter(message => !message.id).length, missingTimes: messages.filter(message => typeof message.createdAt !== 'number').length },
        viewport: { width: innerWidth, height: innerHeight },
        controls: [...document.querySelectorAll('button')].map(button => ({ label: button.getAttribute('aria-label'), bounds: button.getBoundingClientRect().toJSON() })),
        canvasCount: document.querySelectorAll('canvas').length,
      }
    })
    assert.equal(report.stage.renderer, 'live2d')
    assert.ok(report.stage.canvasCount > 0)
    assert.ok(report.stage.controls.some(({ bounds }) => bounds.width > 0 && bounds.height > 0 && bounds.x >= 0 && bounds.y >= 0 && bounds.right <= report.stage.viewport.width && bounds.bottom <= report.stage.viewport.height))
    if (process.env.LIFE_STARTUP_MIN_HISTORY)
      assert.ok(report.stage.historyCount >= Number(process.env.LIFE_STARTUP_MIN_HISTORY), 'Historical messages must remain available after startup')
    const captureStage = () => application.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/'))
      const image = await window.webContents.capturePage()
      const bitmap = image.toBitmap()
      const { width, height } = image.getSize()
      let bodyPixels = 0
      // Exclude the loading stripe and the bottom-right controls from the witness.
      for (let y = Math.floor(height * 0.15); y < height * 0.9; y += 16) {
        if (y > height * 0.44 && y < height * 0.56)
          continue
        for (let x = 0; x < width; x += 16) {
          if (x > width * 0.95 && y > height * 0.8)
            continue
          const offset = (y * width + x) * 4
          const colors = [bitmap[offset], bitmap[offset + 1], bitmap[offset + 2]]
          if (bitmap[offset + 3] > 64 && Math.max(...colors) - Math.min(...colors) > 8)
            bodyPixels += 1
        }
      }
      return { visible: window.isVisible(), minimized: window.isMinimized(), bodyPixels, png: image.toPNG().toString('base64') }
    })
    let picture
    for (let attempt = 0; attempt < 30; attempt++) {
      picture = await captureStage()
      if (picture.visible && !picture.minimized && picture.bodyPixels > 20)
        break
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    await fs.writeFile(path.join(root, 'live2d-startup.png'), Buffer.from(picture.png, 'base64'))
    report.nativeStage = { visible: picture.visible, minimized: picture.minimized, bodyPixels: picture.bodyPixels }
    await save()
    assert.ok(picture.visible && !picture.minimized && picture.bodyPixels > 20, 'The native stage must contain a painted character body')
    await stage.getByRole('button', { name: '打开设置', exact: true }).evaluate(node => node.click())
    let settings
    for (let attempt = 0; attempt < 100; attempt++) {
      settings = application.windows().find(page => page.url().includes('#/settings'))
      if (settings)
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(settings, 'The desktop settings button must open its real window')
    await settings.locator('a[href^="#/settings/"]:visible').first().waitFor({ timeout: 15000 })
    report.settingsOpened = true
    report.settingsEntries = await settings.locator('a[href^="#/settings/"]:visible').count()
    await application.evaluate(({ BrowserWindow }, url) => {
      BrowserWindow.getAllWindows().find(window => window.webContents.getURL() === url).close()
    }, settings.url())
    report.finalHistoryCount = await stage.evaluate(() => {
      const session = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('chat-session')
      return session.sessionMessages[session.activeSessionId]?.length
    })
    assert.equal(report.finalHistoryCount, report.stage.historyCount, 'Opening another window must not multiply cached history')
    assert.equal(report.errors.length, 0, 'Startup must not produce an uncaught renderer exception')
    report.passed = true
  }
  catch (error) {
    report.failure = error.message
    process.exitCode = 1
  }
  finally {
    if (identity) {
      report.shutdown = await closePrivateRuntime(application, identity, { viaUi: report.passed })
      if (!report.shutdown.completed || report.shutdown.exitCode !== 0) {
        report.passed = false
        report.failure ||= report.shutdown.failure || 'Native application did not exit normally'
        process.exitCode = 1
      }
    }
    else if (application) {
      await application.close().catch(() => {})
    }
    // Only this run's copied renderer data is removed; the source is read-only.
    assert.equal(path.dirname(await fs.realpath(profile)).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
    for (const folder of copiedFolders)
      await fs.rm(path.join(profile, folder), { recursive: true, force: true })
    report.copiedSettingsRemoved = copiedFolders.length > 0
    await save()
    console.info(JSON.stringify({ passed: report.passed, failure: report.failure, readyMs: report.readyMs, historyCount: report.stage?.historyCount, bodyPixels: report.nativeStage?.bodyPixels, settingsOpened: report.settingsOpened, output: root }))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
