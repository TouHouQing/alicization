const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity } = require('./electron-launch.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  const output = path.resolve('output/life-quality-development-20261007', `body-${randomUUID()}`)
  await fs.mkdir(output, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-body-review-'))
  const source = path.resolve(process.env.LIFE_QA_READY_SOURCE || '')
  assert.match(path.basename(source), /^alicization-life-persona-/u)
  const soul = await fs.readFile(path.join(source, 'alicizations/cards/default/SOUL.md'), 'utf8')
  assert.match(soul, /QA/u)
  await fs.mkdir(path.join(profile, 'alicizations/cards/default'), { recursive: true })
  await fs.writeFile(path.join(profile, 'alicizations/cards/default/SOUL.md'), soul)
  const identity = await packageIdentity()
  const report = { format: 'life-body-quality-v1', compiledMainSha256: require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync('apps/stage-tamagotchi/out/main/index.js')).digest('hex'), output, profile, ...identity, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, mode: 'Explicit manual model API probes, not autonomous dialogue', noConfiguredModel: true, gestures: [], expressions: [] }
  const application = await _electron.launch(launchOptions(profile))
  try {
    await application.evaluate(({ app, BrowserWindow, session }) => {
      app.on('web-contents-created', (_, contents) => contents.setAudioMuted(true))
      for (const window of BrowserWindow.getAllWindows())
        window.webContents.setAudioMuted(true)
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    })
    let stage
    for (let attempt = 0; attempt < 120; attempt++) {
      stage = application.windows().find(page => page.url().endsWith('#/'))
      if (stage)
        break
      await wait(250)
    }
    assert.ok(stage)
    await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true', {}, { timeout: 45000 })
    await application.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (window.webContents.getURL().endsWith('#/')) {
          window.webContents.setBackgroundThrottling(false)
          window.setBounds({ x: 20, y: 20, width: 960, height: 1040 })
          if (window.isMinimized())
            window.restore()
          window.show()
          window.focus()
        }
        else {
          window.hide()
        }
      }
    })
    await stage.evaluate(async () => {
      const app = document.querySelector('#app').__vue_app__
      const models = app.config.globalProperties.$pinia._s.get('settings-stage-model')
      models.stageModelSelected = 'preset-vrm-1'
      await models.updateStageModel()
      window.__bodyReview = { model: null, samples: [] }
      window.__bodyReview.find = () => {
        const seen = new Set()
        const visit = (node) => {
          if (!node || typeof node !== 'object' || seen.has(node))
            return
          seen.add(node)
          if (node.type?.__name === 'ThreeScene')
            window.__bodyReview.model = node.refs?.modelRef ?? node.exposed
          visit(node.component)
          visit(node.subTree)
          visit(node.suspense?.activeBranch)
          if (Array.isArray(node.children))
            node.children.forEach(visit)
        }
        visit(app._instance ?? app._container._vnode.component)
        return window.__bodyReview.model
      }
    })
    await stage.waitForFunction(() => window.__bodyReview.find()?.getRuntimeCapabilities()?.supportedActions?.some(action => action.key === 'open_palm'), {}, { timeout: 45000 })
    report.capabilities = await stage.evaluate(() => window.__bodyReview.find().getRuntimeCapabilities())
    await stage.evaluate(() => {
      window.__bodyReview.find().setVrmFrameObserver((vrm) => {
        const qa = window.__bodyReview
        qa.samples.push({ at: Date.now(), probe: qa.probe, diagnostics: qa.model.executionDiagnostics(), expressions: Object.fromEntries(['neutral', 'happy', 'sad', 'angry', 'relaxed', 'surprised', 'blink', 'blinkleft', 'blinkright'].map(name => [name, vrm.expressionManager?.getValue(name) ?? 0])), positions: Object.fromEntries(['head', 'rightUpperArm', 'rightHand', 'leftHand', 'leftFoot', 'rightFoot'].map((name) => {
          const bone = vrm.humanoid.getNormalizedBoneNode(name)
          return [name, bone ? bone.getWorldPosition(bone.position.clone()).toArray() : null]
        })), bones: ['head', 'rightUpperArm', 'rightLowerArm', 'rightHand'].map(name => vrm.humanoid.getNormalizedBoneNode(name)?.quaternion.toArray() ?? null) })
        if (qa.samples.length > 600)
          qa.samples.shift()
      })
    })
    await wait(1500)
    for (const cue of ['gentle_wave', 'open_palm', 'celebrate_small', 'listen_close', 'rest_settle', 'stretch']) {
      const started = Date.now()
      await stage.evaluate((cue) => {
        const qa = window.__bodyReview
        qa.probe = cue
        qa.samples = []
        return qa.model.playActionBinding({ id: `builtin-${cue}`, actionKey: cue, source: 'builtin', fileName: `procedural:${cue}`, label: cue, importedAt: 0 }, { motionSegmentId: null })
      }, cue)
      const captures = []
      for (let index = 0; index < 3; index++) {
        await wait(index === 0 ? 450 : 250)
        const file = path.join(output, `${cue}-${index}.png`)
        await stage.screenshot({ path: file })
        captures.push({ file, elapsedMs: Date.now() - started })
      }
      report.gestures.push({ cue, captures, samples: await stage.evaluate(() => window.__bodyReview.samples) })
      console.info(JSON.stringify({ cue, captures: captures.map(item => item.elapsedMs) }))
      await wait(2200)
    }
    for (const expression of ['happy', 'sad', 'angry', 'relaxed']) {
      await stage.evaluate((expression) => {
        const qa = window.__bodyReview
        qa.probe = expression
        qa.samples = []
        qa.model.setExpression(expression, 0.85)
      }, expression)
      await wait(400)
      const file = path.join(output, `expression-${expression}.png`)
      await stage.screenshot({ path: file })
      report.expressions.push({ expression, file, samples: await stage.evaluate(() => window.__bodyReview.samples) })
      await wait(3000)
    }
    report.completed = true
    await fs.writeFile(path.join(output, 'body.json'), JSON.stringify(report, null, 2))
    await fs.writeFile(path.resolve('output/life-quality-development-20261007/body-latest.json'), JSON.stringify({ output, report: path.join(output, 'body.json') }, null, 2))
    console.info(JSON.stringify({ completed: true, output, gestures: report.gestures.length, expressions: report.expressions.length }))
  }
  finally {
    await application.close().catch(() => {})
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
