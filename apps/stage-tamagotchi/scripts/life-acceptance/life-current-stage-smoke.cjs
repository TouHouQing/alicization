const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')
const { promisify } = require('node:util')

const { _electron } = require('playwright')

const runFile = promisify(execFile)
const { launchOptions } = require('./electron-launch.cjs')

async function main() {
  const model = process.env.LIFE_QA_STAGE_MODEL || 'preset-live2d-1'
  const suffix = model.startsWith('preset-vrm') ? 'vrm' : 'stage'
  const userData = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-stage-smoke-'))
  const application = await _electron.launch(launchOptions(userData))
  try {
    let stage
    for (let attempt = 0; attempt < 100; attempt++) {
      stage = application.windows().find(page => page.url().endsWith('#/'))
      if (stage)
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(stage)
    await application.evaluate(({ BrowserWindow }) => {
      globalThis.stageSmokeCapture = new Map()
      const original = BrowserWindow.prototype.setIgnoreMouseEvents
      BrowserWindow.prototype.setIgnoreMouseEvents = function (ignore, options) {
        globalThis.stageSmokeCapture.set(this.id, ignore)
        return original.call(this, ignore, options)
      }
    })
    await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true')
    if (model.startsWith('preset-vrm')) {
      await stage.evaluate(async (model) => {
        const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')
        store.stageModelSelected = model
        await store.updateStageModel()
      }, model)
      await stage.waitForFunction(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model').stageModelRenderer === 'vrm' && document.documentElement.dataset.alicizationStageMounted === 'true', {}, { timeout: 45000 })
    }
    const actorSample = await stage.waitForFunction(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas)
        return false
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl)
        return false
      const bounds = canvas.getBoundingClientRect()
      const pixel = new Uint8Array(4)
      for (let row = 14; row >= 7; row--) {
        for (const col of [12, 11, 13, 10, 14, 9, 15, 8]) {
          const x = bounds.width * col / 24
          const y = bounds.height * row / 24
          gl.readPixels(Math.floor(x * gl.drawingBufferWidth / bounds.width), Math.floor(gl.drawingBufferHeight - 1 - y * gl.drawingBufferHeight / bounds.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
          if (pixel[3] > 64)
            return { x: x + bounds.left, y: y + bounds.top, pixel: [...pixel] }
        }
      }
      return false
    })
    const actor = await actorSample.jsonValue()
    const setup = await application.evaluate(async ({ BrowserWindow, screen }) => {
      const window = BrowserWindow.getAllWindows().find(candidate => candidate.webContents.getURL().endsWith('#/'))
      for (const other of BrowserWindow.getAllWindows()) {
        if (other.webContents.getURL().endsWith('#/onboarding')) {
          if (!other.isAlwaysOnTop())
            throw new Error('Onboarding must appear above the companion')
          other.hide()
        }
      }
      const background = new BrowserWindow({ ...screen.getPrimaryDisplay().workArea, frame: false, show: false, backgroundColor: '#253041', webPreferences: { sandbox: true } })
      await background.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<body style="margin:0;background:#253041;color:white;font:20px sans-serif"><button id="probe" style="position:absolute;left:50px;top:50px;width:300px;height:160px;background:#3573b9;color:white;border:0;font:20px sans-serif" onclick="this.dataset.clicks=String(Number(this.dataset.clicks||0)+1)">Desktop click-through check</button><p style="position:absolute;bottom:40px;left:50px">Alicization stage verification</p></body>')}`)
      background.show()
      background.focus()
      window.moveTop()
      return {
        backgroundId: background.id,
        backgroundHandle: background.getNativeWindowHandle().readBigUInt64LE().toString(),
        stageHandle: window.getNativeWindowHandle().readBigUInt64LE().toString(),
        stageId: window.id,
        throttling: window.webContents.getBackgroundThrottling(),
        stageAlwaysOnTop: window.isAlwaysOnTop(),
        blankPoint: screen.dipToScreenPoint({ x: 200, y: 120 }),
      }
    })
    assert.equal(setup.throttling, false)
    assert.equal(setup.stageAlwaysOnTop, true, 'Desktop companion is really pinned on Windows')
    const background = application.windows().find(page => page.url().startsWith('data:text/html'))
    async function nativeInput(point, action, handle) {
      const { stdout } = await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'life-current-native-input.ps1'), '-X', String(point.x), '-Y', String(point.y), '-Action', action, '-ExpectedHandle', handle || ''], { windowsHide: true })
      return JSON.parse(stdout.trim())
    }
    async function setTestCursor(point) {
      await application.evaluate(({ screen }, position) => {
        globalThis.stageSmokeOriginalCursor ??= screen.getCursorScreenPoint
        screen.getCursorScreenPoint = () => position
      }, point)
    }
    await setTestCursor({ x: 200, y: 120 })
    await new Promise(resolve => setTimeout(resolve, 500))
    const blankHit = await nativeInput(setup.blankPoint, 'inspect', setup.stageHandle)
    const blankCapture = await application.evaluate((_electron, id) => globalThis.stageSmokeCapture.get(id), setup.stageId)
    console.info(JSON.stringify({ setup, blankHit, blankCapture }))
    assert.notEqual(blankCapture, false, 'Blank desktop does not force native input capture')
    assert.ok(blankHit.extendedStyle & 32, 'Windows marks blank stage input as transparent')
    await background.getByRole('button', { name: 'Desktop click-through check' }).click()
    await background.waitForFunction(() => document.querySelector('#probe').dataset.clicks === '1')
    const actorPoint = await application.evaluate(({ screen }, point) => screen.dipToScreenPoint({ x: Math.round(point.x), y: Math.round(point.y) }), actor)
    await setTestCursor({ x: Math.round(actor.x), y: Math.round(actor.y) })
    await new Promise(resolve => setTimeout(resolve, 500))
    const actorHit = await nativeInput(actorPoint, 'inspect', setup.stageHandle)
    const actorCapture = await application.evaluate((_electron, id) => globalThis.stageSmokeCapture.get(id), setup.stageId)
    const actorState = await application.evaluate(({ screen, BrowserWindow }, id) => ({ cursor: screen.getCursorScreenPoint(), bounds: BrowserWindow.fromId(id).getBounds() }), setup.stageId)
    const stageState = await stage.evaluate((point) => {
      const canvas = document.querySelector('canvas')
      const bounds = canvas.getBoundingClientRect()
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      const pixel = new Uint8Array(4)
      gl.readPixels(Math.floor((point.x - bounds.left) * gl.drawingBufferWidth / bounds.width), Math.floor(gl.drawingBufferHeight - 1 - (point.y - bounds.top) * gl.drawingBufferHeight / bounds.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      const ancestors = []
      for (let element = canvas; element; element = element.parentElement) {
        const style = getComputedStyle(element)
        ancestors.push({ tag: element.tagName, opacity: style.opacity, visibility: style.visibility, display: style.display })
      }
      return { paused: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused, dataset: { ...document.documentElement.dataset }, canvas: bounds.toJSON(), currentActorPixel: [...pixel], ancestors }
    }, actor)
    console.info(JSON.stringify({ actor, actorPoint, actorHit, actorCapture, actorState, stageState }))
    assert.equal(actorCapture, false, 'Rendered character captures native input')
    assert.equal(actorHit.extendedStyle & 32, 0, 'Windows enables input on the character')
    await stage.mouse.click(actor.x, actor.y)
    await new Promise(resolve => setTimeout(resolve, 1000))
    const nativePixels = await nativeInput(actorPoint, 'inspect', setup.stageHandle)
    const composedPixels = await application.evaluate(async ({ desktopCapturer, screen, BrowserWindow }, input) => {
      const background = BrowserWindow.fromId(input.backgroundId)
      const stage = BrowserWindow.fromId(input.stageId)
      if (!background?.isVisible() || !stage?.isVisible() || stage.isMinimized())
        throw new Error('Owned native QA surfaces must be visible for compositor verification')
      const display = screen.getPrimaryDisplay()
      const bounds = background.getBounds()
      if (input.actor.x < bounds.x || input.actor.y < bounds.y || input.actor.x >= bounds.x + bounds.width || input.actor.y >= bounds.y + bounds.height)
        throw new Error('Compositor probe must remain within the controlled QA background')
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor) }, fetchWindowIcons: false })
      const source = sources.find(source => source.display_id === String(display.id))
      if (!source || source.thumbnail.isEmpty())
        throw new Error('Native compositor capture unavailable')
      const size = source.thumbnail.getSize()
      const pixel = point => [...source.thumbnail.crop({ x: Math.floor((point.x - display.bounds.x) * size.width / display.bounds.width), y: Math.floor((point.y - display.bounds.y) * size.height / display.bounds.height), width: 1, height: 1 }).getBitmap()]
      // Never export or save the desktop thumbnail. Only bounded pixel probes
      // inside our own controlled background leave this function.
      const actorGrid = []
      for (const dy of [-100, -50, 0, 50, 100]) {
        for (const dx of [-100, -50, 0, 50, 100]) {
          const point = { x: input.actor.x + dx, y: input.actor.y + dy }
          if (point.x >= bounds.x && point.y >= bounds.y && point.x < bounds.x + bounds.width && point.y < bounds.y + bounds.height)
            actorGrid.push({ dx, dy, pixel: pixel(point) })
        }
      }
      return { actor: pixel(input.actor), actorGrid, reference: pixel({ x: bounds.x + 40, y: bounds.y + 400 }), thumbnailSize: size, displayBounds: display.bounds, scaleFactor: display.scaleFactor, windowOpacity: stage.getOpacity(), zoomFactor: stage.webContents.getZoomFactor(), bounds: stage.getBounds() }
    }, { actor, backgroundId: setup.backgroundId, stageId: setup.stageId })
    console.info(JSON.stringify({ composedPixels }))
    await stage.screenshot({ path: path.resolve('output/playwright', `life-current-${suffix}-visible.png`), omitBackground: true })
    assert.deepEqual(composedPixels.reference.slice(0, 3).sort((a, b) => a - b), [37, 48, 65], 'Compositor reference comes from the controlled QA background')
    assert.notDeepEqual(composedPixels.actor.slice(0, 3), composedPixels.reference.slice(0, 3), 'The native compositor must contain the companion over our controlled background')
    await application.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).hide(), setup.stageId)
    await stage.waitForFunction(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused === true)
    await application.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).showInactive(), setup.stageId)
    await stage.waitForFunction(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused === false)
    const report = { userData, backgroundThrottling: setup.throttling, stageReallyPinned: setup.stageAlwaysOnTop, actorCanvasPixel: actor.pixel, actorDesktopPixel: composedPixels.actor, gdiPixel: nativePixels.pixel, compositorReferencePixel: composedPixels.reference, blankClickThrough: true, actorNativeInteraction: true, stageMounted: true, hideAndShowPauseStage: true, inputVerification: 'Fixed cursor samples through the real IPC loop; native Windows styles and compositor pixels checked; pointer interactions via Chromium' }
    await fs.writeFile(path.resolve('output/playwright', `life-current-${suffix}-smoke-result.json`), JSON.stringify({ ...report, model }, null, 2))
    console.info(JSON.stringify(report))
  }
  finally {
    await application.evaluate(({ screen }) => {
      if (globalThis.stageSmokeOriginalCursor)
        screen.getCursorScreenPoint = globalThis.stageSmokeOriginalCursor
    }).catch(() => {
    })
    await application.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
