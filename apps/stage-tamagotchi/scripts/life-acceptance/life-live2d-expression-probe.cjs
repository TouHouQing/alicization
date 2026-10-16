/* eslint-disable style/max-statements-per-line */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, registerPrivateRuntime, closePrivateRuntime, packageIdentity } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  const root = path.resolve(process.env.LIFE_EXPRESSION_ROOT || 'output/live2d-expression-baseline-20261015')
  assert.ok(root.startsWith(path.resolve('output') + path.sep))
  const idleDurationMs = Number(process.env.LIFE_EXPRESSION_IDLE_MS || 10000)
  assert.ok(Number.isFinite(idleDurationMs) && idleDurationMs >= 1000 && idleDurationMs <= 180000)
  await fs.mkdir(root, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-regression-expression-'))
  const options = launchOptions(profile)
  options.env.PORT = String(await new Promise((resolve) => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) }) }))
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND')
  const app = await _electron.launch(options)
  const report = { format: 'live2d-expression-observation-v1', profile, ...await packageIdentity(), syntheticIdentity: true, passed: false, samples: [], errors: [] }
  report.nativeRuntime = await registerPrivateRuntime(app)
  app.on('window', page => page.on('pageerror', error => report.errors.push(error.message)))
  let stage
  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      stage = app.windows().find(page => page.url().endsWith('#/'))
      if (stage && (await sampleLive2D(stage).catch(() => ({ models: [] }))).models.some(model => model.probes.some(point => point.pixel[3] > 64)))
        break
      await wait(200)
    }
    assert.ok(stage)
    report.initial = await sampleLive2D(stage)
    report.catalog = await stage.evaluate(() => {
      const seen = new Set(); let sdk; let actor
      const visit = (node) => {
        if (!node || typeof node !== 'object' || seen.has(node))
          return
        seen.add(node)
        sdk ||= node.props?.app?.stage?.children.find(child => child.internalModel?.coreModel)
        if (node.exposed?.characterFrame && node.props?.app?.stage)
          actor ||= node
        visit(node.component); visit(node.subTree); visit(node.suspense?.activeBranch); visit(node.ssContent)
        if (Array.isArray(node.children))
          node.children.forEach(visit)
      }
      const app = document.querySelector('#app').__vue_app__; visit(app._instance ?? app._container._vnode.component)
      if (!sdk)
        throw new Error('Actual Cubism model is missing')
      const internal = sdk.internalModel; const core = internal.coreModel; const p = core._model.parameters
      const qa = window.__live2dExpressionProbe = { sdk, actor, phase: 'initial', frames: [], focusCalls: [], controllerUpdates: [], lastFrameAt: -1 }
      const focus = internal.focusController.focus
      internal.focusController.focus = function (...args) {
        if (qa.focusCalls.length < 2000)
          qa.focusCalls.push({ phase: qa.phase, at: performance.now(), args }); return focus.apply(this, args)
      }
      const update = internal.focusController.update
      internal.focusController.update = function (delta) {
        if (qa.controllerUpdates.length < 6000)
          qa.controllerUpdates.push({ phase: qa.phase, at: performance.now(), delta }); return update.call(this, delta)
      }
      internal.on('beforeModelUpdate', () => {
        const now = performance.now()
        if (now - qa.lastFrameAt < 35 || qa.frames.length >= 6000)
          return
        qa.lastFrameAt = now
        qa.frames.push({ at: now, phase: qa.phase, focus: { x: internal.focusController.x, y: internal.focusController.y, targetX: internal.focusController.targetX, targetY: internal.focusController.targetY }, motionPriority: internal.motionManager.state.currentPriority, speech: { active: actor?.props.speechRenderState?.active, phase: actor?.props.speechRenderState?.phase }, emotion: actor?.props.performanceState?.performance?.baseEmotion, values: Object.fromEntries(p.ids.map(id => [id, core.getParameterValueById(id)])), proceduralGesture: actor?.exposed.executionDiagnostics().proceduralGesture ?? null })
      })
      return { parameters: p.ids.map((id, index) => ({ id, min: p.minimumValues[index], max: p.maximumValues[index], default: p.defaultValues[index] })), expressions: internal.settings.expressions, motions: Object.keys(internal.settings.motions), fakeParameterIds: Object.keys(core._notExistParameterId) }
    })
    const phase = async (label, duration, point) => {
      await stage.evaluate((label) => { window.__live2dExpressionProbe.phase = label }, label)
      if (point) {
        await stage.locator('canvas').first().evaluate((canvas, point) => {
          canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: point.x, clientY: point.y }))
          canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: point.x, clientY: point.y }))
        }, point)
      }
      await wait(duration)
      report.samples.push({ label, ...await sampleLive2D(stage) })
      await stage.screenshot({ path: path.join(root, `${label}.png`) })
    }
    await phase('idle-native-motion', idleDurationMs)
    const frame = report.initial.models[0].frame
    const viewport = stage.viewportSize() || await stage.evaluate(() => ({ width: innerWidth, height: innerHeight }))
    const y = Math.max(20, Math.min(viewport.height - 30, frame.anchorY))
    await phase('look-left', 1200, { x: 30, y })
    await phase('look-right', 1200, { x: viewport.width - 30, y })
    await phase('pointer-parked', 6500)
    if (process.env.LIFE_EXPRESSION_CALIBRATE === '1') {
      report.rendererCalibration = { scope: 'Controlled component-input fixtures on a real compiled Cubism model. These are renderer integration checks, not autonomous decisions or real dialogue.', fixtures: [] }
      for (const [label, emotion, cue, action, closed] of [
        ['fixture-angry', 'angry', 'glare', null, false],
        ['fixture-happy', 'happy', 'bright-smile', null, false],
        ['fixture-wide-eye', 'surprised', 'wide-eye', null, false],
        ['fixture-closed-phoneme', 'neutral', 'relaxed', null, true],
        ['fixture-voiced-vowel', 'neutral', 'relaxed', null, false],
        ['fixture-audio-silence', 'neutral', 'relaxed', null, false],
        ['fixture-stopped-voice', 'neutral', 'relaxed', null, false],
        ['fixture-nod', 'neutral', 'relaxed', 'nod_soft', false],
        ['fixture-nod-repeat', 'neutral', 'relaxed', 'nod_soft', false],
        ['fixture-head-shake', 'neutral', 'relaxed', 'head_shake', false],
      ]) {
        await stage.evaluate(({ label, emotion, cue, action, closed, revision }) => {
          const qa = window.__live2dExpressionProbe; const props = qa.actor.props
          qa.phase = label
          // Restore each controlled input and its latest parent value before
          // installing the next bounded fixture; keep all life stores untouched.
          for (const [key, saved] of Object.entries(qa.overrides ?? {})) {
            Object.defineProperty(props, key, { ...saved.descriptor, value: qa.fixture[key] })
            props[key] = saved.latest
          }
          qa.overrides = {}; qa.fixture = {}
          const state = JSON.parse(JSON.stringify(props.performanceState))
          const speech = JSON.parse(JSON.stringify(props.speechRenderState))
          state.performance = { ...state.performance, baseEmotion: emotion, emotion, facialCue: cue, actionCue: action, delivery: 'calm' }
          Object.assign(state, { activeCueSource: 'preview', activeFacialCue: cue, activeActionCue: action, expressionIntensity: 1, facialCueIntensity: 1, actionIntensity: 0.9, activeCue: null, actionPulse: { ...state.actionPulse, cue: action, revision } })
          const voiceFixture = closed || ['fixture-voiced-vowel', 'fixture-audio-silence', 'fixture-stopped-voice'].includes(label)
          const playing = voiceFixture && label !== 'fixture-stopped-voice'
          const energy = closed || label === 'fixture-voiced-vowel' ? 0.8 : 0
          const vowel = voiceFixture && !closed ? 0.7 : 0
          Object.assign(speech, { active: playing, phase: playing ? 'playing' : 'idle', playbackPhase: playing ? 'playing' : 'idle', audioBound: voiceFixture, mouthOpenRatio: voiceFixture ? 0.8 : 0, dynamics: { speechEnergy: energy, prosodyIntensity: voiceFixture ? 0.8 : 0, emphasisLevel: 0, cadencePulse: 0 }, articulation: { ...speech.articulation, active: voiceFixture, openness: vowel, jawOpen: vowel, lipClosure: closed ? 1 : 0, visemes: { A: vowel, I: 0, U: 0, E: 0, O: 0, closed: closed ? 1 : 0 } } })
          for (const [key, value] of Object.entries({ performanceState: state, speechRenderState: speech, live2dIdleAnimationEnabled: false })) {
            const descriptor = Object.getOwnPropertyDescriptor(props, key); qa.overrides[key] = { descriptor, latest: props[key] }; qa.fixture[key] = value
            props[key] = value
            Object.defineProperty(props, key, { configurable: true, enumerable: true, get: () => qa.fixture[key], set: (value) => { qa.overrides[key].latest = value } })
          }
        }, { label, emotion, cue, action, closed, revision: 1000 + report.rendererCalibration.fixtures.length })
        await phase(label, action ? 1700 : 1400)
        report.rendererCalibration.fixtures.push(label)
      }
    }
    report.timeline = await stage.evaluate(() => { const qa = window.__live2dExpressionProbe; return { frames: qa.frames, focusCalls: qa.focusCalls, controllerUpdates: qa.controllerUpdates, fakeParameterIds: Object.keys(qa.sdk.internalModel.coreModel._notExistParameterId) } })
    if (process.env.LIFE_EXPRESSION_ASSERTIONS === '1') {
      report.checks = []
      const check = (name, passed, detail) => { report.checks.push({ name, passed, detail }); assert.ok(passed, name) }
      const frames = label => report.timeline.frames.filter(frame => frame.phase === label)
      const range = values => Math.max(...values) - Math.min(...values)
      const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length
      const horizontal = label => frames(label).map(frame => frame.values.ParamEyeBallX)
      check('Autonomous eye fixation remains alive during native idle playback', range(horizontal('idle-native-motion')) > 0.05)
      check('Actual final draw eyes distinguish left and right pointer input', mean(horizontal('look-right')) - mean(horizontal('look-left')) > 0.3)
      const repeated = report.timeline.focusCalls.filter((call, index, all) => index && JSON.stringify(call.args) === JSON.stringify(all[index - 1].args)).length
      check('Parked coordinates do not constantly renew cursor fixation', repeated < Math.max(3, report.timeline.focusCalls.length * 0.2), { calls: report.timeline.focusCalls.length, repeated })
      const phantom = report.timeline.fakeParameterIds.filter(id => /^_ParamEyeBall|^Param(?:EyeSmile|MouthSmile|MouthPucker|BrowForm|[AIUEO])$/u.test(id))
      check('Expression projection creates no unsupported virtual facial channels', phantom.length === 0, phantom)
      if (process.env.LIFE_EXPRESSION_QUIET_ASSERTIONS === '1') {
        const idle = frames('idle-native-motion').slice(3)
        check('Speechless native idle avoids speaking-like mouth opening', idle.length > 20 && idle.every(frame => frame.speech.active === false && frame.values.ParamMouthOpenY < 0.12), { frames: idle.length, maxMouthOpen: Math.max(...idle.map(frame => frame.values.ParamMouthOpenY)) })
      }
      if (report.rendererCalibration) {
        const late = label => frames(label).slice(-5)
        check('A strong angry cue overcomes the authored smile on the actual rig', mean(late('fixture-angry').map(frame => frame.values.ParamMouthForm)) < -0.1)
        check('Happy and angry expressions produce distinct compiled mouth shapes', mean(late('fixture-happy').map(frame => frame.values.ParamMouthForm)) > mean(late('fixture-angry').map(frame => frame.values.ParamMouthForm)) + 0.3)
        const eyeMax = report.catalog.parameters.find(parameter => parameter.id === 'ParamEyeLOpen').max
        check('Wide-eye cues use the rig openness range beyond neutral without exceeding its compiled limit', frames('fixture-wide-eye').some(frame => frame.values.ParamEyeLOpen > 1.05) && frames('fixture-wide-eye').every(frame => frame.values.ParamEyeLOpen <= eyeMax + 0.00001))
        check('Closed phoneme frames actually close the compiled mouth', late('fixture-closed-phoneme').every(frame => frame.values.ParamMouthOpenY < 0.07))
        check('A voiced audio vowel opens the compiled mouth', late('fixture-voiced-vowel').some(frame => frame.values.ParamMouthOpenY > 0.35))
        check('Silent audio closes the mouth despite continuing vowel and prosody hints', late('fixture-audio-silence').every(frame => frame.values.ParamMouthOpenY < 0.05))
        check('Stopped playback releases stale vowel articulation', late('fixture-stopped-voice').every(frame => frame.values.ParamMouthOpenY < 0.05))
        for (const label of ['fixture-nod', 'fixture-nod-repeat', 'fixture-head-shake']) {
          check(`${label} reaches the real draw phase and releases`, frames(label).some(frame => Math.abs(frame.proceduralGesture?.offset ?? 0) > 0.5) && late(label).every(frame => frame.proceduralGesture === null))
        }
      }
    }
    report.passed = report.errors.length === 0 && report.samples.every(sample => sample.models.some(model => model.probes.some(point => point.pixel[3] > 64)))
  }
  catch (error) { report.failure = error.message; throw error }
  finally {
    report.shutdown = await closePrivateRuntime(app, report.nativeRuntime, { viaUi: true })
    report.passed &&= report.shutdown.completed && report.shutdown.exitCode === 0
    await fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  }
  console.info(JSON.stringify({ root, passed: report.passed, frames: report.timeline?.frames.length, focusCalls: report.timeline?.focusCalls.length, shutdown: report.shutdown }))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
