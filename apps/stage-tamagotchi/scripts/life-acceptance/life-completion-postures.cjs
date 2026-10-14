const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity } = require('./electron-launch.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function exposedCanvasPoint(stage) {
  const point = await stage.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const bounds = canvas.getBoundingClientRect()
    for (const y of [0.75, 0.25, 0.5, 0.95]) {
      for (const x of [0.25, 0.75, 0.5, 0.95]) {
        const point = { x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y }
        if (document.elementFromPoint(point.x, point.y) === canvas)
          return point
      }
    }
    return null
  })
  assert.ok(point, 'A real unoccluded canvas point is required for camera input')
  return point
}
async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const output = path.join(workspace, 'output/life-completion-postures-20261009', randomUUID())
  await fs.mkdir(output, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-action-'))
  const ready = path.resolve(process.env.LIFE_QA_READY_SOURCE || '')
  assert.match(path.basename(ready), /^alicization-life-persona-/u)
  const soul = await fs.readFile(path.join(ready, 'alicizations/cards/default/SOUL.md'), 'utf8')
  assert.match(soul, /QA/u)
  await fs.mkdir(path.join(profile, 'alicizations/cards/default'), { recursive: true })
  await fs.writeFile(path.join(profile, 'alicizations/cards/default/SOUL.md'), soul)
  const identity = await packageIdentity() ?? { scope: 'compiled-development-runtime', compiledMainSha256: createHash('sha256').update(await fs.readFile(path.join(workspace, 'apps/stage-tamagotchi/out/main/index.js'))).digest('hex') }
  const report = { format: 'life-posture-calibration-v1', output, profile, ...identity, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, syntheticIdentity: true, mode: 'explicit body calibration, separate from spontaneous-life acceptance', models: [], errors: [], passed: false }
  const application = await _electron.launch(launchOptions(profile))
  let stage
  try {
    await application.evaluate(({ app, BrowserWindow, session }) => {
      app.on('web-contents-created', (_, contents) => contents.setAudioMuted(true))
      BrowserWindow.getAllWindows().forEach(window => window.webContents.setAudioMuted(true))
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    })
    const deadline = Date.now() + 60000
    while (Date.now() < deadline && !stage) {
      stage = application.windows().find(page => page.url().endsWith('#/'))
      if (!stage)
        await wait(200)
    }
    assert.ok(stage)
    stage.on('pageerror', error => report.errors.push(error.message.slice(0, 400)))
    await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true')
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.setAudioMuted(true)
      if (!window.webContents.getURL().endsWith('#/')) {
        window.hide()
      }
      else {
        window.setBounds({ x: 50, y: 50, width: 900, height: 760 })
        window.showInactive()
      }
    }))
    const assets = path.join(workspace, 'apps/stage-tamagotchi/out/renderer/assets')
    const bridgeFile = (await fs.readdir(assets)).find(file => /^alicization-bridge-.*\.js$/u.test(file))
    const alias = /getAlicizationBridge as (\w+)/u.exec(await fs.readFile(path.join(assets, bridgeFile), 'utf8'))?.[1]
    assert.ok(alias)
    await stage.evaluate(async ({ file, alias }) => {
      const module = await import(new URL(`./assets/${file}`, location.href).href)
      // Explicit calibration suspends autonomous work through its production fence.
      await module[alias]().suspendKillSwitch({ reason: 'private body calibration' })
      window.__poseQa = { pinia: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia, frames: [] }
      window.__poseQa.find = () => {
        const seen = new Set()
        const visit = (node) => {
          if (!node || typeof node !== 'object' || seen.has(node))
            return
          seen.add(node)
          if (node.type?.__name === 'ThreeScene') {
            window.__poseQa.node = node
            window.__poseQa.model = node.refs?.modelRef ?? node.exposed
          }
          visit(node.component)
          visit(node.subTree)
          visit(node.suspense?.activeBranch)
          visit(node.ssContent)
          if (Array.isArray(node.children))
            node.children.forEach(visit)
        }
        const app = document.querySelector('#app').__vue_app__
        visit(app._instance ?? app._container._vnode.component)
        return window.__poseQa.model
      }
    }, { file: bridgeFile, alias })
    for (const modelId of ['preset-vrm-1', 'preset-vrm-2']) {
      await stage.evaluate(async (id) => {
        const store = window.__poseQa.pinia._s.get('settings-stage-model')
        store.stageModelSelected = id
        await store.updateStageModel()
      }, modelId)
      await stage.waitForFunction(id => window.__poseQa.find()?.bodyFrame?.()?.modelId === id, modelId, { timeout: 60000 })
      await stage.waitForFunction(() => {
        const store = window.__poseQa.pinia._s.get('modelStore')
        return store.scenePhase === 'mounted' && store.sceneTransactionDepth === 0
      }, {}, { timeout: 60000 })
      const savedCamera = await stage.evaluate(() => {
        const store = window.__poseQa.pinia._s.get('modelStore')
        return { position: { ...store.cameraPosition }, distance: store.cameraDistance }
      })
      await stage.evaluate(() => {
        const qa = window.__poseQa
        qa.find().setVrmFrameObserver((vrm, delta) => {
          vrm.scene.updateMatrixWorld(true)
          const positions = Object.fromEntries(['head', 'hips', 'leftFoot', 'rightFoot', 'leftHand', 'rightHand'].map((name) => {
            const bone = vrm.humanoid.getRawBoneNode(name)
            return [name, bone?.getWorldPosition(bone.position.clone()).toArray() ?? null]
          }))
          const camera = qa.node.exposed.camera()
          if (!camera?.isPerspectiveCamera)
            throw new Error('Actual scene camera must be available for viewport verification')
          camera.updateMatrixWorld(true)
          const projected = Object.fromEntries(Object.entries(positions).map(([name, position]) => {
            const point = vrm.scene.position.clone().fromArray(position).project(camera)
            return [name, point.toArray()]
          }))
          const frame = qa.node.exposed.characterFrame()
          const panels = [...document.querySelectorAll('.stage-dialogue-panel')].filter(element => getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden').map(element => element.getBoundingClientRect())
          const headUnobstructed = Boolean(frame?.head) && panels.every(panel => Math.min(panel.right, frame.head.x + frame.head.width) <= Math.max(panel.left, frame.head.x) || Math.min(panel.bottom, frame.head.y + frame.head.height) <= Math.max(panel.top, frame.head.y))
          if (qa.frames.length < 800)
            qa.frames.push({ at: Date.now(), delta, posture: qa.model.postureDiagnostics(), body: qa.model.bodyFrame(), bones: Object.fromEntries(['head', 'hips', 'spine', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'].map(name => [name, vrm.humanoid.getNormalizedBoneNode(name)?.quaternion.toArray() ?? null])), positions, projected, headUnobstructed, headRect: frame?.head, dialogueRects: panels.map(panel => ({ left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom })) })
        })
      })
      const results = { modelId, poses: [], gestures: [] }
      for (const mode of ['stand', 'sit', 'lie', 'sleep', 'work', 'stand']) {
        await stage.evaluate((mode) => {
          const qa = window.__poseQa
          qa.frames = []
          return qa.model.playDailyPosture(mode)
        }, mode)
        await stage.waitForFunction((mode) => {
          const qa = window.__poseQa
          const visible = mode === 'stand' || (Object.values(qa.frames.at(-1)?.projected ?? {}).length === 6 && Object.values(qa.frames.at(-1).projected).every(point => Math.abs(point[0]) < 0.95 && Math.abs(point[1]) < 0.95 && point[2] > -1 && point[2] < 1))
          return qa.model.postureDiagnostics().mode === mode && !qa.model.postureDiagnostics().failed && qa.frames.length >= 12 && qa.frames.reduce((sum, frame) => sum + Math.min(0.1, frame.delta), 0) >= 2 && visible && qa.frames.at(-1).headUnobstructed
        }, mode, { timeout: 60000 })
        const frames = await stage.evaluate(() => window.__poseQa.frames)
        const settled = frames.at(-1)
        assert.ok(settled.positions.head && settled.positions.hips && settled.positions.leftFoot)
        assert.ok(Object.values(settled.positions).flat().every(value => value === null || Number.isFinite(value)))
        const headHeight = Math.abs(settled.positions.head[1] - settled.positions.hips[1])
        const visible = Object.values(settled.projected).every(point => Math.abs(point[0]) < 0.95 && Math.abs(point[1]) < 0.95 && point[2] > -1 && point[2] < 1)
        if (mode !== 'stand')
          assert.ok(visible, `${modelId}: ${mode} must keep the head, hands and feet inside the actual camera viewport`)
        assert.ok(settled.headUnobstructed, 'The real dialogue widget must not obscure the rendered face')
        results.poses.push({ mode, frames: frames.length, headHeight, positions: settled.positions, projected: settled.projected, visible, headUnobstructed: settled.headUnobstructed, loaded: settled.posture.loaded })
        await fs.writeFile(path.join(output, `${modelId}-${mode}-${results.poses.length}.json`), JSON.stringify(frames, null, 2))
        await stage.screenshot({ path: path.join(output, `${modelId}-${mode}-${results.poses.length}.png`), omitBackground: true })
        console.info(JSON.stringify({ modelId, posture: mode, headHeight, frames: frames.length }))
      }
      const stand = results.poses[0]
      assert.ok(results.poses.find(item => item.mode === 'lie').headHeight < stand.headHeight * 0.55, 'The loaded body must actually lie horizontally')
      assert.ok(results.poses.find(item => item.mode === 'sit').positions.hips[1] < stand.positions.hips[1] - 0.1, 'Sitting must actually lower the hips')
      for (const cue of ['turn_attentive', 'shift_weight', 'small_step']) {
        await stage.evaluate((cue) => {
          const qa = window.__poseQa
          qa.frames = []
          return qa.model.playActionBinding({ id: `builtin-${cue}`, actionKey: cue, source: 'builtin', fileName: `procedural:${cue}`, label: cue, importedAt: 0 }, { motionSegmentId: null })
        }, cue)
        await stage.waitForFunction(() => window.__poseQa.frames.length >= 32, {}, { timeout: 60000 })
        const frames = await stage.evaluate(() => window.__poseQa.frames)
        const required = { turn_attentive: ['head', 'hips', 'spine'], shift_weight: ['hips', 'leftUpperLeg', 'rightUpperLeg'], small_step: ['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'] }[cue]
        const moving = required.every(name => frames.some(frame => frame.bones[name]?.some((value, component) => Math.abs(value - frames[0].bones[name][component]) > 0.005)))
        assert.ok(frames.some(frame => frame.body.cue === cue), 'The actual requested motion must own the observed frames')
        assert.ok(moving, `${modelId}: ${cue} must move actual normalized bones`)
        results.gestures.push({ cue, frames: frames.length, moving })
        await fs.writeFile(path.join(output, `${modelId}-${cue}.json`), JSON.stringify(frames, null, 2))
      }
      const composer = stage.locator('.stage-quick-reply__input')
      await composer.fill('')
      const focusedPanel = await stage.locator('.stage-dialogue-panel').boundingBox()
      assert.ok(focusedPanel)
      await stage.evaluate(() => {
        window.__poseQa.frames = []
        return window.__poseQa.model.playDailyPosture('sit')
      })
      await stage.waitForFunction(() => window.__poseQa.frames.length >= 36, {}, { timeout: 15000 })
      const focusedPanelAfter = await stage.locator('.stage-dialogue-panel').boundingBox()
      assert.ok(focusedPanelAfter)
      assert.ok(Math.abs(focusedPanelAfter.x - focusedPanel.x) < 0.5 && Math.abs(focusedPanelAfter.y - focusedPanel.y) < 0.5, 'Actual focused controls must stay stationary while the body changes pose')
      // Empty draft avoids an external request; the real locator still requires a stable, hit-testable button.
      await stage.locator('.stage-quick-reply__send').click({ timeout: 15000 })
      results.dialogueControlsStable = { focusedPanel, focusedPanelAfter, actualSendClick: true, externalRequest: false }
      const bodyPoint = await exposedCanvasPoint(stage)
      await stage.mouse.click(bodyPoint.x, bodyPoint.y)
      await stage.evaluate(() => window.__poseQa.model.playDailyPosture('stand'))
      const cameraAfter = await stage.evaluate(() => {
        const store = window.__poseQa.pinia._s.get('modelStore')
        return { position: { ...store.cameraPosition }, distance: store.cameraDistance }
      })
      assert.deepEqual(cameraAfter, savedCamera, 'Automatic posture framing must not persistently replace the saved view')
      results.savedCameraPreserved = true
      await stage.evaluate(() => window.__poseQa.model.playDailyPosture('sit'))
      await stage.waitForFunction(() => {
        const qa = window.__poseQa
        return qa.model.postureDiagnostics().mode === 'sit' && Object.values(qa.frames.at(-1).projected).every(point => Math.abs(point[0]) < 0.95 && Math.abs(point[1]) < 0.95)
      }, {}, { timeout: 60000 })
      const wheelPoint = await exposedCanvasPoint(stage)
      // Playwright delivers the wheel event to this renderer via CDP; no global OS input.
      await stage.mouse.move(wheelPoint.x, wheelPoint.y)
      await stage.mouse.wheel(0, 200)
      await stage.waitForFunction(before => window.__poseQa.pinia._s.get('modelStore').cameraDistance !== before, savedCamera.distance, { timeout: 10000 })
      const manualCamera = await stage.evaluate(() => {
        const store = window.__poseQa.pinia._s.get('modelStore')
        return { position: { ...store.cameraPosition }, distance: store.cameraDistance, actualPosition: window.__poseQa.node.exposed.camera().position.toArray() }
      })
      const manualFrameSerial = await stage.evaluate(() => window.__poseQa.model.bodyFrame().serial)
      await stage.waitForFunction(serial => window.__poseQa.model.bodyFrame().serial >= serial + 12, manualFrameSerial, { timeout: 10000 })
      const cameraAfterManual = await stage.evaluate(() => {
        const store = window.__poseQa.pinia._s.get('modelStore')
        return { position: { ...store.cameraPosition }, distance: store.cameraDistance, actualPosition: window.__poseQa.node.exposed.camera().position.toArray() }
      })
      assert.deepEqual(cameraAfterManual, manualCamera, 'Actual renderer wheel input must keep camera ownership during the low pose')
      results.manualCameraAccepted = true
      report.models.push(results)
      await fs.writeFile(path.join(output, 'postures.json'), JSON.stringify(report, null, 2))
    }
    assert.equal(report.errors.length, 0)
    report.passed = true
  }
  catch (error) {
    report.errors.push(error.message)
    if (stage) {
      report.failure = await stage.evaluate(() => ({ selected: window.__poseQa?.pinia._s.get('settings-stage-model')?.stageModelSelected, renderer: window.__poseQa?.pinia._s.get('settings-stage-model')?.stageModelRenderer, hasModel: Boolean(window.__poseQa?.find()), body: window.__poseQa?.model?.bodyFrame?.(), posture: window.__poseQa?.model?.postureDiagnostics?.(), frames: window.__poseQa?.frames?.length, lastFrames: window.__poseQa?.frames?.slice(-3) })).catch(() => null)
      await stage.screenshot({ path: path.join(output, 'failure.png'), omitBackground: true }).catch(() => { })
    }
    ;
    throw error
  }
  finally {
    await fs.writeFile(path.join(output, 'postures.json'), JSON.stringify(report, null, 2))
    await application.close().catch(() => { })
  }
  console.info(JSON.stringify({ completed: true, passed: report.passed, output }))
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
