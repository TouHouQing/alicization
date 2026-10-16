/* eslint-disable style/max-statements-per-line */
/* eslint-disable unicorn/prefer-dom-node-text-content -- Check visible labels, excluding hidden selector details. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const path = require('node:path')

// Read actual Cubism models and pixels; never replace life state or fabricate a reply.
async function sampleLive2D(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__
    const seen = new Set()
    const models = []
    const visit = (node) => {
      if (!node || typeof node !== 'object' || seen.has(node))
        return
      seen.add(node)
      const pixi = node.props?.app
      if (pixi?.renderer && node.exposed?.characterFrame) {
        const sdk = pixi.stage.children.find(child => child.internalModel?.coreModel)
        if (sdk) {
          const core = sdk.internalModel.coreModel
          const ids = core._model.parameters.ids
          const params = Object.fromEntries(['ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamEyeLOpen', 'ParamEyeROpen', 'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ', 'ParamBreath', 'ParamMouthOpenY', 'ParamMouthForm'].filter(id => ids.includes(id)).map(id => [id, core.getParameterValueById(id)]))
          const frame = node.exposed.characterFrame()
          const rect = pixi.view.getBoundingClientRect()
          const probes = []
          if (frame) {
            const gl = pixi.renderer.gl
            for (const [x, y] of [[frame.centerX, frame.top + (frame.bottom - frame.top) * 0.25], [frame.centerX, Math.min(rect.bottom - 20, frame.top + (frame.bottom - frame.top) * 0.65)], [frame.left + 12, Math.min(rect.bottom - 20, frame.top + (frame.bottom - frame.top) * 0.25)], [rect.left + 8, rect.top + 8]]) {
              const pixel = new Uint8Array(4)
              if (x >= rect.left && y >= rect.top && x < rect.right && y < rect.bottom)
                gl.readPixels(Math.floor((x - rect.left) * gl.drawingBufferWidth / rect.width), Math.floor(gl.drawingBufferHeight - 1 - (y - rect.top) * gl.drawingBufferHeight / rect.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
              probes.push({ x, y, pixel: [...pixel], hit: node.exposed.hitTestClientPoint(x, y) })
            }
          }
          models.push({ modelId: node.props.modelId, frame, canvas: rect.toJSON(), parameterCount: ids.length, params, probes, diagnostics: node.exposed.executionDiagnostics(), fpsLimit: pixi.ticker.maxFPS, motionPriority: sdk.internalModel.motionManager.state.currentPriority, sdkName: sdk.internalModel.settings.name })
        }
      }
      visit(node.component); visit(node.subTree); visit(node.suspense?.activeBranch); visit(node.ssContent)
      if (Array.isArray(node.children))
        node.children.forEach(visit)
    }
    visit(app._instance ?? app._container._vnode.component)
    const store = app.config.globalProperties.$pinia._s.get('live2d')
    return { at: Date.now(), models, preferences: store ? { scale: store.scale, position: { ...store.position }, parameters: { ...store.modelParameters }, motion: { ...store.currentMotion }, preferred: { ...store.preferredRuntimeMotions } } : null }
  })
}

async function runLive2DProductChecks({ app, stage, settings, click, capture, check, report, wait }) {
  const waitForBody = async (id) => {
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      const state = await sampleLive2D(stage)
      if (state.models.some(model => model.modelId === id && model.probes.some(point => point.pixel[3] > 64)))
        return
      await wait(200)
    }
    throw new Error(`Live2D body did not paint within 30 seconds: ${id}`)
  }
  const sample = async (label) => {
    const state = await sampleLive2D(stage)
    report.live2dSamples ||= []
    report.live2dSamples.push({ label, ...state })
    return state
  }
  await waitForBody('preset-live2d-1')
  const initial = await sample('initial-main-body')
  check('A real Cubism body is mounted on the desktop', initial.models.length === 1 && initial.models[0].parameterCount > 0, initial.models)
  check('The Live2D character paints visible pixels', initial.models[0].probes.some(point => point.pixel[3] > 64), initial.models[0].probes)
  check('A blank canvas point is outside the character hit region', initial.models[0].probes.at(-1).hit === false)
  check('Transparent model margins do not capture character input', initial.models[0].probes.every(point => point.pixel[3] > 64 || !point.hit), initial.models[0].probes)
  const idle = []
  for (let i = 0; i < 16; i++) { await wait(150); idle.push(await sample('idle-observation')) }
  check('Idle Live2D parameters keep changing across actual frames', idle.some(state => Object.entries(state.models[0].params).some(([key, value]) => Math.abs(value - initial.models[0].params[key]) > 0.001)))
  check('Desktop controls expose usable names', await stage.getByRole('button', { name: '打开设置', exact: true }).count() > 0 && await stage.getByRole('button', { name: '重置桌面布局', exact: true }).count() > 0)

  // Only our private application's canvas receives these DOM input events.
  const pointer = async (type, point, pressed = false) => {
    await stage.locator('canvas').first().evaluate((canvas, input) => {
      canvas.dispatchEvent(new PointerEvent(input.type, { bubbles: true, cancelable: true, pointerId: 701, pointerType: 'mouse', isPrimary: true, clientX: input.point.x, clientY: input.point.y, button: 0, buttons: input.pressed ? 1 : 0 }))
      if (input.type === 'pointermove')
        canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: input.point.x, clientY: input.point.y }))
    }, { type, point, pressed })
    await wait(100)
  }
  report.live2dPointerCoverage = 'Actual DOM event handlers on the private app canvas; physical Default desktop mouse delivery is outside this evidence.'
  const actor = initial.models[0].probes.find(point => point.hit && point.pixel[3] > 64)
  assert.ok(actor)
  await pointer('pointermove', actor)
  await wait(500)
  await capture(stage, 'live2d-hover-dialogue')
  const bodyPoint = initial.models[0].probes[1].hit && initial.models[0].probes[1].pixel[3] > 64 ? initial.models[0].probes[1] : actor
  await pointer('pointerdown', bodyPoint, true)
  await pointer('pointermove', { x: bodyPoint.x + 60, y: bodyPoint.y - 25 }, true)
  await pointer('pointerup', { x: bodyPoint.x + 60, y: bodyPoint.y - 25 })
  const moved = await sample('dragged-main-body')
  check('Dragging the actual character changes its position', Math.abs(moved.preferences.position.x - initial.preferences.position.x) > 10 || Math.abs(moved.preferences.position.y - initial.preferences.position.y) > 10, moved.preferences.position)
  const wheelPoint = moved.models[0].probes.find(point => point.hit && point.pixel[3] > 64)
  await stage.locator('canvas').first().evaluate((canvas, point) => canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: point.x, clientY: point.y, deltaY: -120 })), wheelPoint)
  await wait(300)
  check('Wheel input on the character changes its visible scale', (await sample('scaled-main-body')).preferences.scale > moved.preferences.scale)
  await click(stage.getByRole('button', { name: '重置桌面布局', exact: true }))
  check('The visible reset control restores the body transform', (await sample('reset-main-body')).preferences.scale === 1 && (await sample('reset-position')).preferences.position.x === 0)
  await capture(stage, 'live2d-desktop-transform-reset')

  await click(settings.getByRole('button', { name: '参数', exact: true }))
  for (const [label, key] of [['左眼开合', 'leftEyeOpen'], ['右眼开合', 'rightEyeOpen']]) {
    await settings.getByRole('slider', { name: new RegExp(`^${label}`) }).press('Home')
    await click(settings.locator(`div:has(> div:text-is("${label}")) > button[title="重置为默认值"]`))
    check(`Resetting ${label} restores its open default`, (await sample(`reset-${key}`)).preferences.parameters[key] === 1)
  }
  const idleSwitch = settings.getByRole('switch', { name: '待机动画', exact: true })
  const beforeIdle = await idleSwitch.getAttribute('aria-checked')
  await click(idleSwitch)
  check('The idle animation switch can be changed explicitly', await idleSwitch.getAttribute('aria-checked') !== beforeIdle)
  await click(idleSwitch)
  await click(settings.getByRole('radio', { name: '30', exact: true }))
  check('The Live2D FPS selection reaches the actual renderer', await settings.getByRole('radio', { name: '30', exact: true }).getAttribute('aria-checked') === 'true' && Math.abs((await sample('fps-limited-body')).models[0].fpsLimit - 30) < 0.01)
  await click(settings.getByRole('radio', { name: '60', exact: true }))
  const fpsLabel = await settings.getByText('帧率', { exact: true }).evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, lineHeight: Number.parseFloat(getComputedStyle(node).lineHeight) }))
  check('FPS controls keep their title readable in the narrow model settings', fpsLabel.width > 50 && fpsLabel.height <= fpsLabel.lineHeight + 1, fpsLabel)
  await capture(settings, 'live2d-narrow-fps-controls')

  await click(settings.getByRole('button', { name: '从模型提取主题颜色', exact: true }))
  await click(settings.getByRole('button', { name: '提取', exact: true }))
  await settings.locator('button[aria-label^="#"]').first().waitFor()
  check('Color extraction creates real palette choices', await settings.locator('button[aria-label^="#"]').count() > 0)
  await capture(settings, 'live2d-extracted-palette')
  const previewGeometry = await settings.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '选择模型')
    let form = button.parentElement
    while (form && !['auto', 'scroll'].includes(getComputedStyle(form).overflowY)) form = form.parentElement
    return { canvas: document.querySelector('canvas').getBoundingClientRect().toJSON(), form: form.getBoundingClientRect().toJSON() }
  })
  check('The model preview and form occupy separate areas', previewGeometry.canvas.bottom <= previewGeometry.form.top + 1 || previewGeometry.canvas.right <= previewGeometry.form.left + 1, previewGeometry)

  const choose = async (name, id) => {
    const startedAt = Date.now()
    await click(settings.getByRole('button', { name: '选择模型', exact: true }))
    await click(settings.getByText(name, { exact: true }).first())
    await click(settings.getByRole('button', { name: '确认选择', exact: true }))
    await stage.waitForFunction(id => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === id && document.documentElement.dataset.alicizationStageMounted === 'true', id, { timeout: 30000 })
    await wait(600)
    await waitForBody(id)
    report.live2dModelSwitches ||= []
    report.live2dModelSwitches.push({ id, paintedAfterMs: Date.now() - startedAt })
  }
  await click(settings.locator('[data-motion-selector] > button'))
  const available = settings.locator('[data-motion-selector] > div > button')
  check('The loaded Live2D model exposes selectable motions', await available.count() > 1)
  const chosenName = (await available.nth(1).innerText()).split('\n')[0]
  await click(available.nth(1))
  const chosen = (await sample('chosen-user-idle-motion')).preferences.preferred['preset-live2d-1']
  await stage.waitForFunction((expected) => {
    const app = document.querySelector('#app').__vue_app__
    const seen = new Set()
    let found = false
    const visit = (node) => {
      if (!node || typeof node !== 'object' || seen.has(node))
        return
      seen.add(node)
      if (node.props?.app && node.exposed?.executionDiagnostics) {
        const motion = node.exposed.executionDiagnostics().activeMotion
        found ||= motion?.group === expected.motionName && motion?.index === expected.motionIndex
      }
      visit(node.component); visit(node.subTree); visit(node.suspense?.activeBranch); visit(node.ssContent)
      if (Array.isArray(node.children))
        node.children.forEach(visit)
    }
    visit(app._instance ?? app._container._vnode.component)
    return found
  }, chosen, { timeout: 20000 })
  check('The selected idle motion reaches the actual Cubism player', (await sample('playing-user-idle-motion')).models[0].diagnostics.activeMotion.index === chosen.motionIndex)
  await choose('Hiyori (Free)', 'preset-live2d-2')
  await choose('Hiyori (Pro)', 'preset-live2d-1')
  await settings.getByRole('button', { name: '参数', exact: true }).waitFor()
  if (!(await settings.locator('[data-motion-selector] > button').isVisible()))
    await click(settings.getByRole('button', { name: '参数', exact: true }))
  check('Returning to a model restores its own idle motion choice', (await settings.locator('[data-motion-selector] > button').innerText()).includes(chosenName))
  await settings.reload()
  await settings.getByRole('button', { name: '参数', exact: true }).waitFor()
  await click(settings.getByRole('button', { name: '参数', exact: true }))
  await settings.waitForFunction(name => [...document.querySelectorAll('[data-motion-selector] > button')].some(node => node.textContent.includes(name)), chosenName)
  check('The model motion choice survives settings reload', (await settings.locator('[data-motion-selector] > button').innerText()).includes(chosenName))
  await click(settings.getByRole('button', { name: '清理模型缓存', exact: true }))
  await settings.getByRole('status').filter({ hasText: '模型缓存已清理' }).waitFor()
  check('Cache cleanup reports completion and keeps the current body painted', (await sample('cache-cleared-body')).models[0].probes.some(point => point.pixel[3] > 64))
  await capture(settings, 'live2d-cache-cleanup-feedback')

  await click(settings.getByRole('button', { name: '选择模型', exact: true }))
  const beforeCount = await settings.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('display-models').displayModels.length)
  const importFile = async (file) => {
    await click(settings.getByRole('button', { name: '导入模型', exact: true }))
    const chooser = settings.waitForEvent('filechooser')
    await click(settings.getByRole('menuitem', { name: 'Live2D', exact: true }))
    await (await chooser).setFiles(file, { timeout: 60000 })
  }
  await importFile({ name: 'QA-invalid.zip', mimeType: 'application/zip', buffer: Buffer.from('invalid zip') })
  await settings.getByRole('alert').filter({ hasText: '导入失败' }).waitFor()
  check('A broken model import produces an actionable error', await settings.getByRole('alert').count() > 0)
  check('Invalid model import leaves the catalogue unchanged', await settings.evaluate(count => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('display-models').displayModels.length === count, beforeCount))
  check('No invisible preview canvas remains after failed import', await settings.evaluate(() => ![...document.querySelectorAll('canvas')].some(canvas => canvas.style.opacity === '0')))
  await capture(settings, 'live2d-invalid-archive-feedback')
  const validZip = await fs.readFile(path.resolve('packages/stage-ui/src/assets/live2d/models/hiyori_free_zh.zip'))
  await importFile({ name: 'QA-Live2D.ZIP', mimeType: 'application/zip', buffer: validZip })
  await settings.getByText('QA-Live2D.ZIP', { exact: true }).waitFor({ timeout: 60000 })
  check('A valid uppercase ZIP can be imported after a failure', await settings.getByRole('alert').count() === 0)
  await click(settings.getByRole('button', { name: '重命名模型', exact: true }))
  await settings.getByPlaceholder('模型名称', { exact: true }).fill('QA 改名后的 Live2D')
  await click(settings.getByRole('button', { name: '保存', exact: true }))
  await settings.getByText('QA 改名后的 Live2D', { exact: true }).waitFor()
  await capture(settings, 'live2d-renamed-import')
  await settings.reload()
  await settings.getByRole('button', { name: '选择模型', exact: true }).waitFor()
  await click(settings.getByRole('button', { name: '选择模型', exact: true }))
  await settings.getByText('QA 改名后的 Live2D', { exact: true }).waitFor()
  check('Renamed imported models persist after reload', await settings.getByText('QA 改名后的 Live2D', { exact: true }).count() === 1)
  const importedId = await settings.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('display-models').displayModels.find(model => model.name === 'QA 改名后的 Live2D').id)
  await click(settings.getByText('QA 改名后的 Live2D', { exact: true }))
  await click(settings.getByRole('button', { name: '确认选择', exact: true }))
  await stage.waitForFunction(id => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === id && document.documentElement.dataset.alicizationStageMounted === 'true', importedId, { timeout: 30000 })
  await wait(500)
  await waitForBody(importedId)
  const importedBody = await sample('painted-imported-file-model')
  check('An imported file model reaches actual visible Cubism rendering', importedBody.models[0].modelId === importedId && importedBody.models[0].probes.some(point => point.pixel[3] > 64))
  await capture(stage, 'live2d-imported-model-visible')
  await choose('Hiyori (Pro)', 'preset-live2d-1')
  await click(settings.getByRole('button', { name: '选择模型', exact: true }))
  check('Built-in models do not offer a misleading remove action', await settings.getByRole('button', { name: 'Hiyori (Pro) 的选项', exact: true }).count() === 0)
  await click(settings.getByRole('button', { name: 'QA 改名后的 Live2D 的选项', exact: true }))
  await click(settings.getByRole('button', { name: '移除模型', exact: true }))
  await settings.getByText('QA 改名后的 Live2D', { exact: true }).waitFor({ state: 'hidden' })
  check('Imported models can be removed without replacing the active identity', (await sample('after-model-removal')).models[0].modelId === 'preset-live2d-1')
  await click(settings.getByText('Hiyori (Pro)', { exact: true }).first())
  await click(settings.getByRole('button', { name: '确认选择', exact: true }))
  // The supported fallback archive path has no model settings JSON.
  const modelRequire = createRequire(path.resolve('packages/stage-ui-live2d/package.json'))
  const JSZip = modelRequire('jszip')
  const inferredArchive = await JSZip.loadAsync(validZip)
  for (const name of Object.keys(inferredArchive.files)) {
    if (name.endsWith('.model3.json') || name.endsWith('.model.json'))
      inferredArchive.remove(name)
  }
  await click(settings.getByRole('button', { name: '选择模型', exact: true }))
  await importFile({ name: 'QA-Inferred-Live2D.zip', mimeType: 'application/zip', buffer: await inferredArchive.generateAsync({ type: 'nodebuffer' }) })
  await settings.getByText('QA-Inferred-Live2D.zip', { exact: true }).waitFor({ timeout: 60000 })
  const inferredId = await settings.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('display-models').displayModels.find(model => model.name === 'QA-Inferred-Live2D.zip').id)
  await click(settings.getByText('QA-Inferred-Live2D.zip', { exact: true }))
  await click(settings.getByRole('button', { name: '确认选择', exact: true }))
  await waitForBody(inferredId)
  check('An archive without model settings JSON discovers usable SDK idle motions', await settings.evaluate(id => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('live2d').getAvailableMotionsForModel(id).some(motion => motion.motionName === 'Idle'), inferredId))
  await capture(stage, 'live2d-inferred-model-visible')
  await choose('Hiyori (Pro)', 'preset-live2d-1')
  await click(settings.getByRole('button', { name: '选择模型', exact: true }))
  await click(settings.getByRole('button', { name: 'QA-Inferred-Live2D.zip 的选项', exact: true }))
  await click(settings.getByRole('button', { name: '移除模型', exact: true }))
  await click(settings.getByText('Hiyori (Pro)', { exact: true }).first())
  await click(settings.getByRole('button', { name: '确认选择', exact: true }))
  await click(settings.getByRole('button', { name: '参数', exact: true }))
  await click(settings.locator('[data-motion-selector] > button'))
  await click(settings.getByRole('button', { name: '跟随当前状态', exact: true }).last())
  await stage.waitForFunction(() => !document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('live2d').preferredRuntimeMotions['preset-live2d-1'], null, { timeout: 10000 }).catch(() => {})
  const automaticSettings = await sampleLive2D(settings)
  const automaticStage = await sample('automatic-idle-restored')
  report.automaticIdleState = { settings: automaticSettings.preferences, stage: automaticStage.preferences, stored: await settings.evaluate(() => localStorage.getItem('settings/live2d/preferred-runtime-motions')) }
  check('Automatic idle mode releases only the current model manual preference', !automaticStage.preferences.preferred['preset-live2d-1'], report.automaticIdleState)
  await click(settings.getByRole('button', { name: 'Alicization 动作映射', exact: true }))
  await settings.getByRole('button', { name: '预览', exact: true }).nth(1).waitFor()
  await click(settings.getByRole('button', { name: '预览', exact: true }).nth(1))
  const mappingPreview = await sample('action-mapping-preview')
  check('The action mapping preview button reaches actual Cubism playback', mappingPreview.models[0].diagnostics.activeMotion.index === 1)
  check('A manual gesture has foreground playback priority', mappingPreview.models[0].motionPriority === 3)
  if (!(await idleSwitch.isVisible()))
    await click(settings.getByRole('button', { name: '参数', exact: true }))
  await click(settings.getByRole('switch', { name: '待机动画', exact: true }))
  const stillPlaying = await sample('idle-disabled-during-owned-gesture')
  check('Disabling idle animation preserves the current foreground gesture', stillPlaying.models[0].motionPriority === 3 && stillPlaying.models[0].diagnostics.activeMotion.index === 1)
  await click(settings.getByRole('switch', { name: '待机动画', exact: true }))
  await capture(settings, 'live2d-action-mapping-preview')
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/settings/models'))
    window.setSize(1120, 850)
  })
  await wait(600)
  const wide = await settings.evaluate(() => {
    const canvas = document.querySelector('canvas').getBoundingClientRect()
    const button = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '选择模型')
    let form = button.parentElement
    while (form && !['auto', 'scroll'].includes(getComputedStyle(form).overflowY)) form = form.parentElement
    return { canvas: canvas.toJSON(), form: form.getBoundingClientRect().toJSON(), viewport: innerWidth, pageWidth: document.documentElement.scrollWidth }
  })
  check('A wide native settings window keeps the model beside its form without page overflow', wide.canvas.right <= wide.form.left + 1 && wide.pageWidth <= wide.viewport, wide)
  await capture(settings, 'live2d-wide-model-settings')
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/settings/models')).setSize(600, 800))
  await capture(stage, 'live2d-body-after-all-model-operations')
}

exports.sampleLive2D = sampleLive2D
exports.runLive2DProductChecks = runLive2DProductChecks
