const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity } = require('./electron-launch.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const hash = value => createHash('sha256').update(value).digest('hex')

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-action-'))
  const ready = path.resolve(process.env.LIFE_QA_READY_SOURCE || '')
  assert.match(path.basename(ready), /^alicization-life-persona-/u)
  const soul = await fs.readFile(path.join(ready, 'alicizations/cards/default/SOUL.md'), 'utf8')
  assert.match(soul, /QA/u, 'Only a synthetic QA identity can seed this profile')
  await fs.cp(path.join(ready, 'alicizations/cards'), path.join(profile, 'alicizations/cards'), { recursive: true })
  const fixture = path.resolve('output/life-acceptance', `action-${randomUUID()}`)
  await fs.mkdir(fixture, { recursive: false })
  const archive = await packageIdentity()
  const application = await _electron.launch(launchOptions(profile))
  async function waitForPage(role) {
    const deadline = Date.now() + 25000
    while (Date.now() < deadline) {
      const page = application.windows().find(page => page.url().endsWith(role))
      if (page) {
        await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia), {}, { timeout: 25000 })
        return page
      }
      await wait(200)
    }
    throw new Error(`The required own QA renderer did not arrive: ${role}`)
  }
  try {
    const stage = await waitForPage('#/')
    assert.ok(stage)
    const rendererErrors = []
    stage.on('pageerror', (error) => {
      rendererErrors.push(error.stack ?? error.message)
      console.error(`QA renderer error: ${error.stack ?? error.message}`)
    })
    stage.on('console', (message) => {
      if (message.type() === 'error')
        console.error(`QA own renderer console: ${message.text()}`)
    })
    stage.setDefaultTimeout(45000)
    const editor = await waitForPage('#/onboarding')
    assert.ok(editor && editor !== stage, 'Personhood sync must originate in a different renderer')
    await editor.waitForFunction(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')?.soul?.frontmatter?.initialized)
    const soulMarker = `QA 跨窗口 ${randomUUID().slice(0, 8)}`
    const editedSoul = await editor.evaluate(async (marker) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')
      await store.refreshSoul()
      const frontmatter = { ...store.soul.frontmatter, profile: { ...store.soul.frontmatter.profile, alicizationName: marker } }
      const content = store.soul.content.replace(/^---\r?\n[\s\S]*?\r?\n---/u, `---\n${JSON.stringify(frontmatter, null, 2)}\n---`)
      if (content === store.soul.content)
        throw new Error('The actual editable identity field was not found')
      return await store.updateSoulContent(content)
    }, soulMarker)
    console.info(JSON.stringify({ soulMutationCommitted: Boolean(editedSoul?.content?.includes(soulMarker)), editorRevision: editedSoul?.revision, stage: await stage.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')
      return { revision: store?.soul?.revision, needsGenesis: store?.needsGenesis, initialized: store?.soul?.frontmatter?.initialized }
    }) }))
    assert.ok(editedSoul?.content?.includes(soulMarker), 'The second renderer must actually commit its SOUL edit')
    // Observe the stage's existing state; a manual getSoul would hide a broken
    // spontaneous event route from the editor's main-process mutation.
    await stage.waitForFunction(marker => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')?.soul?.content.includes(marker), soulMarker)
    const stageSoul = await stage.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')
      return { content: store.soul.content, name: store.soul.frontmatter.profile.alicizationName, initialized: store.soul.frontmatter.initialized }
    })
    assert.equal(stageSoul.content, editedSoul.content)
    assert.match(stageSoul.name, /QA/u)
    assert.equal(stageSoul.initialized, true)
    const returnMarker = `${soulMarker} 回同步`
    await stage.evaluate(async (marker) => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')
      const frontmatter = { ...store.soul.frontmatter, profile: { ...store.soul.frontmatter.profile, alicizationName: marker } }
      await store.updateSoulContent(store.soul.content.replace(/^---\r?\n[\s\S]*?\r?\n---/u, `---\n${JSON.stringify(frontmatter, null, 2)}\n---`))
    }, returnMarker)
    await editor.waitForFunction(marker => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1')?.soul?.frontmatter.profile.alicizationName === marker, returnMarker)
    await application.evaluate(async ({ BrowserWindow, screen }) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (window.webContents.getURL().endsWith('#/onboarding'))
          window.hide()
      }
      const stage = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/'))
      const background = new BrowserWindow({ ...screen.getPrimaryDisplay().workArea, frame: false, backgroundColor: '#253041', webPreferences: { sandbox: true } })
      await background.loadURL('data:text/html;charset=utf-8,<body style="margin:0;background:%23253041;color:white">Owned Alicization action QA surface</body>')
      background.show()
      background.focus()
      if (stage.isMinimized())
        stage.restore()
      stage.showInactive()
      stage.moveTop()
      // This trial measures action playback on controlled visible surfaces.
      // Startup visibility and explicit minimize semantics have separate trials.
      globalThis.__lifeActionQaKeepSurface = setInterval(() => {
        if (globalThis.__lifeActionQaHideTrial)
          return
        for (const window of [stage, background]) {
          if (window.isDestroyed())
            continue
          if (window.isMinimized())
            window.restore()
          if (!window.isVisible())
            window.showInactive()
        }
      }, 250)
    })
    await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true')
    await stage.evaluate(async () => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')
      store.stageModelSelected = 'preset-vrm-1'
      await store.updateStageModel()
    })
    await stage.waitForFunction(() => document.querySelector('canvas'))
    const assets = path.resolve('apps/stage-tamagotchi/out/renderer/assets')
    const bridgeFile = (await fs.readdir(assets)).find(file => /^alicization-bridge-.*\.js$/u.test(file))
    assert.ok(bridgeFile)
    const bridgeExport = /getAlicizationBridge as (\w+)/u.exec(await fs.readFile(path.join(assets, bridgeFile), 'utf8'))?.[1]
    assert.ok(bridgeExport)
    await stage.evaluate(async ({ file, alias }) => {
      const module = await import(new URL(`./assets/${file}`, location.href).href)
      window.__lifeActionQaBridge = module[alias]()
    }, { file: bridgeFile, alias: bridgeExport })
    await stage.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__
      const root = app._instance ?? app._container._vnode.component
      window.__lifeActionQa = { root: window.__lifeActionQaBridge, model: null, stage: null, frames: [], phases: [], names: [] }
      let seen = new Set()
      const scan = (node) => {
        if (!node || typeof node !== 'object' || seen.has(node))
          return
        seen.add(node)
        if (node.type && node.subTree)
          window.__lifeActionQa.names.push({ name: node.type.__name ?? node.type.name, exposed: Object.keys(node.exposed ?? {}) })
        if (node.exposed?.residentBehavior)
          window.__lifeActionQa.stage = node.exposed
        if (node.type?.__name === 'VRMModel')
          window.__lifeActionQa.vrmNode = node
        if (node.type?.__name === 'ThreeScene') {
          window.__lifeActionQa.model = node.refs?.modelRef ?? node.exposed
          window.__lifeActionQa.threeSceneNode = node
        }
        scan(node.component)
        scan(node.subTree)
        scan(node.suspense?.activeBranch)
        scan(node.ssContent)
        if (Array.isArray(node.children))
          node.children.forEach(scan)
      }
      window.__lifeActionQa.findModel = () => {
        seen = new Set()
        window.__lifeActionQa.names = []
        scan(root)
        return window.__lifeActionQa.model
      }
      window.__lifeActionQa.findModel()
      const recordPhase = () => {
        const element = document.querySelector('[data-life-activity-phase]')
        const phase = element?.dataset.lifeActivityPhase ?? null
        const last = window.__lifeActionQa.phases.at(-1)
        if (phase && phase !== last?.phase)
          window.__lifeActionQa.phases.push({ phase, at: Date.now() })
      }
      window.__lifeActionQa.timer = setInterval(recordPhase, 16)
    })
    const threeFile = (await fs.readdir(assets)).find(file => /^three\.module-.*\.js$/u.test(file))
    const mixerAlias = /AnimationMixer as (\w+)/u.exec(await fs.readFile(path.join(assets, threeFile), 'utf8'))?.[1] ?? 'AnimationMixer'
    await stage.evaluate(async ({ file, alias }) => {
      const module = await import(new URL(`./assets/${file}`, location.href).href)
      const prototype = module[alias].prototype
      const original = prototype.update
      window.__lifeActionQa.mixers = new Map()
      prototype.update = function (delta) {
        const result = original.call(this, delta)
        window.__lifeActionQa.mixers.set(this._root.uuid, { time: this.time, timeScale: this.timeScale, active: this._nActiveActions, actions: this._actions.map(action => ({ clip: action._clip.name, time: action.time, paused: action.paused, enabled: action.enabled, weight: action.getEffectiveWeight() })), bindings: this._bindings.map(binding => ({ path: binding.binding.path, node: binding.binding.node?.name, uuid: binding.binding.node?.uuid })) })
        return result
      }
    }, { file: threeFile, alias: mixerAlias })
    await wait(3500)
    console.info(JSON.stringify(await stage.evaluate(() => ({ capability: window.__lifeActionQa.findModel()?.getRuntimeCapabilities(), modelRenderer: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model').stageModelRenderer }))))
    await stage.waitForFunction(() => window.__lifeActionQa.findModel()?.getRuntimeCapabilities()?.supportedActions?.some(action => action.key === 'nod'))
    await application.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/')).setBounds({ x: 50, y: 50, width: 900, height: 680 })
    })
    let residentLife = null
    if (process.env.LIFE_QA_RESIDENT_SCENE === '1') {
      await stage.evaluate(() => {
        window.__lifeActionQa.findModel()
      })
      const readResident = () => stage.evaluate(() => {
        const state = window.__lifeActionQa.stage?.residentBehavior?.value
        return state ? { mode: state.mode, applied: state.applied, headPitch: state.motor.head.pitch, bodyLean: state.motor.body.lean } : null
      })
      console.info(JSON.stringify({ initialResident: await readResident() }))
      await stage.evaluate(() => {
        const qa = window.__lifeActionQa
        qa.residentFrames = []
        qa.model.setVrmFrameHook((vrm) => {
          const state = qa.stage.residentBehavior.value
          if (qa.residentFrames.length < 600)
            qa.residentFrames.push({ at: Date.now(), mode: state.mode, applied: state.applied, headPitch: state.motor.head.pitch, head: vrm.humanoid.getRawBoneNode('head')?.quaternion.toArray() ?? null })
        })
      })
      const input = stage.locator('textarea').last()
      // Software GL may compile the first visible rig after capabilities arrive.
      // Observe actual render readiness before measuring the brief listening onset.
      await stage.waitForFunction(() => window.__lifeActionQa.residentFrames.length >= 12, {}, { timeout: 12000 })
      await stage.evaluate(() => {
        window.__lifeActionQa.residentFrames = []
      })
      await input.fill('QA 正在输入，保持安静倾听。')
      await stage.waitForFunction(() => window.__lifeActionQa.stage?.residentBehavior?.value?.mode === 'listening')
      await stage.waitForFunction(() => window.__lifeActionQa.stage?.residentBehavior?.value?.applied === true)
      await stage.waitForFunction(() => {
        const samples = window.__lifeActionQa.residentFrames.filter(frame => frame.mode === 'listening' && frame.applied)
        return samples.length >= 12 && samples.at(-1).at - samples[0].at >= 1100
      })
      const listening = await readResident()
      const physical = await stage.evaluate(() => {
        const samples = window.__lifeActionQa.residentFrames.filter(frame => frame.mode === 'listening' && frame.applied)
        const moving = samples.some(frame => frame.head?.some((value, index) => Math.abs(value - samples[0].head[index]) > 0.0005))
        return { frames: samples.length, motorPeak: Math.max(...samples.map(frame => frame.headPitch)), movingHeadBones: moving }
      })
      console.info(JSON.stringify({ listeningPhysical: physical, listening }))
      assert.ok(physical.motorPeak > 0.02 && physical.movingHeadBones, 'Listening onset must reach the actual rendered rig')
      await input.fill('')
      await stage.waitForFunction(() => window.__lifeActionQa.stage?.residentBehavior?.value?.mode === 'accompany')
      const quiet = await readResident()
      assert.ok(listening.bodyLean > quiet.bodyLean, 'Actual focused input must change the rendered motor')
      await application.evaluate(({ BrowserWindow }) => {
        globalThis.__lifeActionQaHideTrial = true
        BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/')).hide()
      })
      await stage.waitForFunction(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused)
      await stage.waitForFunction(() => window.__lifeActionQa.stage.residentBehavior.value.applied === false)
      await application.evaluate(({ BrowserWindow }) => {
        globalThis.__lifeActionQaHideTrial = false
        BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/')).showInactive()
      })
      await stage.waitForFunction(() => !document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused)
      residentLife = { actualComposerListening: true, renderedMotorApplied: true, returnsToQuiet: true, hiddenStageReleasesBehavior: true, physical, listening, quiet }
      console.info(JSON.stringify({ residentLife }))
    }
    let interactionIntent = null
    if (process.env.LIFE_QA_INTERACTION_FIXTURE) {
      const target = path.resolve(process.env.LIFE_QA_INTERACTION_FIXTURE)
      assert.ok(target.startsWith(`${path.resolve('output')}${path.sep}`))
      const intentFixture = JSON.parse(await fs.readFile(target, 'utf8'))
      assert.equal(intentFixture.synthetic, true)
      const scenes = []
      for (const scene of intentFixture.scenes) {
        const result = await stage.evaluate(async (scene) => {
          const qa = window.__lifeActionQa
          const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s
          const dispatcher = stores.get('alicization-presence-dispatcher')
          if (!dispatcher || !qa.stage.interactionPerformance)
            throw new Error('Actual dispatcher and interaction projection are required')
          const remove = dispatcher.onDialogueResponded((payload) => {
            qa.dispatchedPerformance = payload.structured.performance
          })
          const publishedManifest = await qa.root.getPerformanceManifest()
          qa.frames = []
          qa.model.setVrmFrameHook((vrm) => {
            if (qa.frames.length < 240)
              qa.frames.push({ at: Date.now(), motion: qa.model.executionDiagnostics()?.activeMotion?.cue, bones: ['head', 'chest', 'rightUpperArm', 'rightLowerArm', 'rightHand'].map(name => vrm.humanoid.getNormalizedBoneNode(name)?.quaternion.toArray() ?? null) })
          })
          await dispatcher.dispatchDialogueResponded(scene.payload)
          remove()
          return { ...qa.stage.interactionPerformance.value, dispatchedPerformance: qa.dispatchedPerformance, publishedActions: publishedManifest?.supportedActions.map(action => action.key) }
        }, scene)
        console.info(JSON.stringify({ sceneAdmission: scene.purpose, dispatchedPerformance: result.dispatchedPerformance, publishedActions: result.publishedActions }))
        assert.equal(result.intent?.purpose, scene.purpose, `Actual Stage accepts main-prepared ${scene.purpose}`)
        assert.equal(result.intent?.reason, scene.providerFact.data.reason, 'The body retains the exact language intention')
        const cue = scene.payload.structured.embodiment.performance.actionCue
        try {
          await stage.waitForFunction((cue) => {
            const frames = window.__lifeActionQa.frames.filter(frame => frame.motion === cue)
            return frames.length >= 12 && frames.at(-1).at - frames[0].at >= 600
          }, cue, { timeout: 12000 })
        }
        catch (error) {
          console.info(JSON.stringify(await stage.evaluate(() => {
            const qa = window.__lifeActionQa
            const state = qa.threeSceneNode?.props.performanceState
            return { phase: state?.phase, cue: state?.activeCue, actionPulse: state?.actionPulse, variationToken: state?.variationToken, performance: state?.performance, motions: [...new Set(qa.frames.map(frame => frame.motion))], diagnostics: qa.model.executionDiagnostics() }
          })))
          throw error
        }
        const observed = await stage.evaluate(() => ({ frames: window.__lifeActionQa.frames, projection: window.__lifeActionQa.stage.interactionPerformance.value }))
        const matchingFrames = observed.frames.filter(frame => frame.motion === cue)
        console.info(JSON.stringify({ interactionScene: scene.purpose, expectedCue: cue, phase: observed.projection.phase, motions: [...new Set(observed.frames.map(frame => frame.motion))], motor: observed.projection.motor }))
        assert.ok(observed.frames.some(frame => frame.motion === cue), `Prepared ${scene.purpose} selects actual ${cue}`)
        assert.ok(matchingFrames.some(frame => frame.bones.some((q, index) => q && matchingFrames[0].bones[index] && q.some((value, component) => Math.abs(value - matchingFrames[0].bones[index][component]) > 0.003))), `Actual bones express ${scene.purpose}`)
        await stage.screenshot({ path: path.join(fixture, `interaction-${scene.purpose}.png`) })
        scenes.push({ purpose: scene.purpose, cue, frames: observed.frames.length, exactProviderReason: true, actualBonesMoved: true, phase: observed.projection.phase })
        await wait(1200)
      }
      await application.evaluate(({ BrowserWindow }) => {
        globalThis.__lifeActionQaHideTrial = true
        BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/')).hide()
      })
      await stage.waitForFunction(() => window.__lifeActionQa.stage.interactionPerformance.value.intent === null)
      await application.evaluate(({ BrowserWindow }) => {
        globalThis.__lifeActionQaHideTrial = false
        BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/')).showInactive()
      })
      interactionIntent = { scenes, pausedReleasesIntent: true, synthetic: true, configuredModel: false }
      console.info(JSON.stringify({ interactionIntent }))
    }
    const bindings = ['nod', 'shake_head', 'tilt_head', 'steady_focus', 'observe_focus', 'comfort_sway', 'gentle_wave', 'celebrate_small', 'open_palm', 'thoughtful_pause', 'reassuring_nod', 'gentle_boundary', 'listen_close', 'rest_settle', 'stretch', 'turn_attentive', 'shift_weight', 'small_step']
    const nativeGestures = []
    for (const cue of process.env.LIFE_QA_SKIP_GESTURES === '1' ? [] : bindings) {
      await application.evaluate(({ BrowserWindow }) => {
        const stage = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/'))
        if (stage.isMinimized())
          stage.restore()
        stage.showInactive()
      })
      await stage.waitForFunction(() => !document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused)
      await stage.evaluate((cue) => {
        const qa = window.__lifeActionQa
        qa.findModel()
        qa.frames = []
        qa.model.setVrmFrameHook(null)
        qa.model.setVrmFrameObserver((vrm, delta) => {
          if (qa.frames.length < 600) {
            vrm.scene.updateMatrixWorld(true)
            const names = ['head', 'chest', 'rightUpperArm', 'leftUpperArm', 'rightLowerArm', 'rightHand', 'leftHand', 'rightShoulder', 'leftShoulder', 'spine', 'leftUpperLeg', 'rightUpperLeg', 'hips']
            const positions = Object.fromEntries(names.map((name) => {
              const node = vrm.humanoid.getRawBoneNode(name)
              return [name, node ? node.getWorldPosition(node.position.clone()).toArray() : null]
            }))
            qa.frames.push({ at: Date.now(), delta, mixer: qa.mixers.get(vrm.scene.uuid) ?? null, motion: qa.model.executionDiagnostics()?.activeMotion?.cue, bones: names.map(name => vrm.humanoid.getRawBoneNode(name)?.quaternion.toArray() ?? null), positions })
          }
        })
        if (typeof qa.model.playActionBinding !== 'function')
          throw new Error('The actual nested VRM model action API is unavailable')
        return qa.model.playActionBinding({ id: `builtin-${cue}`, actionKey: cue, source: 'builtin', fileName: `procedural:${cue}`, label: cue, importedAt: 0 }, { motionSegmentId: null })
      }, cue)
      try {
        await stage.waitForFunction(() => {
          const frames = window.__lifeActionQa.frames
          return frames.length >= 32 && frames.at(-1).at - frames[0].at >= 3500
        }, {}, { timeout: 45000 })
      }
      catch (error) {
        console.info(JSON.stringify(await stage.evaluate(() => ({ frames: window.__lifeActionQa.frames.length, diagnostics: window.__lifeActionQa.model.executionDiagnostics(), paused: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused, visible: document.visibilityState }))))
        console.info(JSON.stringify(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(window => ({ role: window.webContents.getURL().split('#')[1], visible: window.isVisible(), minimized: window.isMinimized(), throttling: window.webContents.getBackgroundThrottling() })))))
        throw error
      }
      const result = await stage.evaluate(() => ({ frames: window.__lifeActionQa.frames, diagnostics: window.__lifeActionQa.model.executionDiagnostics(), paused: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused }))
      await fs.writeFile(path.join(fixture, `gesture-${cue}-frames.json`), JSON.stringify(result, null, 2))
      console.info(JSON.stringify({ cue, frames: result.frames.length, paused: result.paused, activeMotion: result.diagnostics.activeMotion }))
      assert.ok(result.frames.length >= 8, `Actual VRM frame hook runs for ${cue}`)
      assert.ok(result.frames.some(frame => frame.motion === cue), `The requested ${cue} actually plays before returning to idle`)
      assert.equal(result.diagnostics.activeMotion?.segmentId, null, `Standalone ${cue} must preserve its explicitly independent speech ownership`)
      const required = { nod: [0], shake_head: [0], tilt_head: [0], steady_focus: [0], observe_focus: [0], comfort_sway: [9], gentle_wave: [2, 5], celebrate_small: [2, 3], open_palm: [2, 4], thoughtful_pause: [0], reassuring_nod: [0], gentle_boundary: [2], listen_close: [0, 9], rest_settle: [0, 9], stretch: [2, 3], turn_attentive: [0, 9, 12], shift_weight: [10, 11, 12], small_step: [10, 11] }[cue]
      for (const index of required) {
        assert.ok(result.frames.some(frame => frame.bones[index] && result.frames[0].bones[index] && frame.bones[index].some((value, component) => Math.abs(value - result.frames[0].bones[index][component]) > 0.005)), `${cue} must move its specified semantic joint ${index}`)
      }
      const handAboveShoulder = Math.max(...result.frames.filter(frame => frame.positions.rightHand && frame.positions.rightShoulder).map(frame => frame.positions.rightHand[1] - frame.positions.rightShoulder[1]))
      if (cue === 'gentle_wave' || cue === 'stretch')
        assert.ok(handAboveShoulder > 0.02, `${cue} must raise its actual hand above the shoulder; observed ${handAboveShoulder}`)
      nativeGestures.push({ cue, frames: result.frames.length, movingBones: true, semanticJointIndices: required, handAboveShoulder, activeMotion: result.diagnostics.activeMotion })
      await wait(2700)
    }
    const rootFunctions = await stage.evaluate(() => ['upsertTaskThread', 'dispatchTaskThread', 'listTaskThreads', 'listExecutionEvents'].filter(key => typeof window.__lifeActionQa.root[key] === 'function'))
    assert.equal(rootFunctions.length, 4, 'QA uses existing production IPC wrappers')
    const outcomes = []
    for (const mode of ['accepted', 'wrong-proof']) {
      await application.evaluate(({ BrowserWindow }) => {
        const stage = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/'))
        if (stage.isMinimized())
          stage.restore()
        stage.showInactive()
        stage.moveTop()
      })
      await stage.waitForFunction(() => !document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused)
      const target = path.join(fixture, `${mode}.txt`)
      const content = `own native QA result ${mode}`
      const script = path.join(fixture, `${mode}.cjs`)
      await fs.writeFile(script, `setTimeout(() => { require('node:fs').writeFileSync(${JSON.stringify(target)}, ${JSON.stringify(content)}); console.log('owned fixture written') }, 6000)\n`)
      const threadId = `qa-action-${mode}-${randomUUID()}`
      const payload = { cardId: 'default', id: threadId, origin: 'user-turn', goal: `Save the controlled QA file ${mode}`, kind: 'codebase-edit', status: 'planned', selectedChannel: 'cli', metadata: { task: { permissionMode: 'explicit', effect: 'mutate', riskBudget: 'high', justification: 'Explicitly authorized own-fixture QA script; no external or private targets' }, goalProof: { kind: 'file', path: target, contentHash: hash(mode === 'accepted' ? content : 'different expected bytes') } } }
      const created = await stage.evaluate(payload => window.__lifeActionQa.root.upsertTaskThread(payload), payload)
      console.info(JSON.stringify({ createdTask: created.id, attempt: created.attemptId }))
      await stage.evaluate((payload) => {
        const qa = window.__lifeActionQa
        qa.pulses = []
        qa.removeListener?.()
        qa.removeListener = qa.root.onVisualPresencePulse((payload) => {
          if (payload.activity)
            qa.pulses.push(payload.activity)
        })
        qa.phases = []
        qa.executionFrames = []
        qa.model.setVrmFrameHook((vrm) => {
          const phase = document.querySelector('[data-life-activity-phase]')?.dataset.lifeActivityPhase
          const performance = qa.threeSceneNode?.props?.performanceState
          if (phase && qa.executionFrames.length < 2000)
            qa.executionFrames.push({ phase, head: vrm.humanoid.getNormalizedBoneNode('head').quaternion.toArray(), motion: qa.model.executionDiagnostics().activeMotion?.cue ?? null, motionSegmentId: qa.model.executionDiagnostics().activeMotion?.segmentId ?? null, performancePhase: performance?.phase, action: performance?.activeActionCue, pulse: performance?.actionPulse?.cue, aliases: performance?.activeCue?.rendererHints?.preferredMotionAliases })
        })
        qa.dispatch = qa.root.dispatchTaskThread(payload)
      }, { cardId: 'default', threadId, cli: { command: 'node', args: [script], cwd: process.cwd(), timeoutMs: 20000 } })
      try {
        await stage.waitForFunction(() => document.querySelector('[data-life-activity-phase="working"]'))
      }
      catch (error) {
        console.info(JSON.stringify(await stage.evaluate(async () => {
          const qa = window.__lifeActionQa
          const result = await qa.dispatch
          return { result, phases: qa.phases, pulses: qa.pulses, frameCount: qa.executionFrames.length, paused: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused }
        })))
        throw error
      }
      if (mode === 'accepted')
        await stage.screenshot({ path: path.resolve('output/playwright/life-current-action-working.png'), omitBackground: true })
      const result = await stage.evaluate(async () => {
        const result = await window.__lifeActionQa.dispatch
        return { status: result.thread.status, outcome: result.thread.metadata.lifeGoalOutcome }
      })
      const expected = mode === 'accepted' ? 'finished' : 'blocked'
      await stage.waitForFunction(phase => Boolean(document.querySelector(`[data-life-activity-phase="${phase}"]`)) && window.__lifeActionQa.phases.some(item => item.phase === phase), expected)
      const projection = await stage.evaluate(() => ({ phases: window.__lifeActionQa.phases, frames: window.__lifeActionQa.executionFrames }))
      await fs.writeFile(path.join(fixture, `execution-${mode}-frames.json`), JSON.stringify({ result, ...projection }, null, 2))
      assert.equal(result.status, 'completed', 'The real CLI adapter exits successfully in both proof cases')
      assert.equal(result.outcome.verdict, mode === 'accepted' ? 'satisfied' : 'not-satisfied')
      assert.equal(await fs.readFile(target, 'utf8'), content)
      assert.ok(projection.phases.some(item => item.phase === 'working'))
      assert.ok(projection.phases.some(item => item.phase === expected))
      if (mode !== 'accepted')
        assert.ok(!projection.phases.some(item => item.phase === 'finished'), 'Wrong actual bytes never animate success')
      console.info(JSON.stringify({ executionBody: mode, states: [...new Set(projection.frames.map(({ head, ...frame }) => JSON.stringify(frame)))].slice(0, 20) }))
      assert.ok(projection.frames.some(frame => frame.motion === 'steady_focus'), 'Committed working phase drives the production VRM gesture')
      assert.ok(projection.frames.filter(frame => frame.motion === 'steady_focus').every(frame => frame.motionSegmentId === null), 'Task motion must not claim the previous spoken segment')
      outcomes.push({ mode, ...result, phases: projection.phases, workingMotionObserved: true, exactOwnedFile: true })
      await wait(6500)
    }
    assert.equal(rendererErrors.length, 0, 'Actual animation and renderer errors must fail acceptance')
    assert.deepEqual(await packageIdentity(), archive, 'The observed package must stay unchanged during native QA')
    const graphics = await application.evaluate(async ({ app }) => (await app.getGPUInfo('complete')).auxAttributes)
    const report = { format: 'life-native-action-scene-v1', passed: true, profile, fixture, executable: process.env.LIFE_QA_EXE || 'electron-current-out', ...archive, syntheticIdentity: true, configuredModel: false, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, softwareGlRequested: process.env.LIFE_QA_SOFTWARE_GL === '1', graphics, personhoodSync: { separateRenderer: true, stageObservedCommittedSoul: true, editorObservedCommittedSoul: true, initialized: true }, residentLife, interactionIntent, gestureMatrixComplete: nativeGestures.length === bindings.length, gesturePlayback: nativeGestures, taskOutcomes: outcomes, scope: 'Isolated Windows desktop only: real cross-window SOUL IPC, SQLite, CLI execution, independent file proof, rendered activity phases and actual VRM bones; residentLife describes actual composer attention when requested. Does not establish active-desktop compositor, mouse pass-through, audio hardware or a configured language model.' }
    const reportPath = path.resolve(process.env.LIFE_QA_REPORT || 'output/life-acceptance/experience-action-scene.json')
    assert.ok(reportPath.startsWith(`${path.resolve('output/life-acceptance')}${path.sep}`) && reportPath.endsWith('.json'), 'QA evidence stays in its owned output directory')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.info(JSON.stringify(report))
  }
  finally {
    await application.evaluate(() => clearInterval(globalThis.__lifeActionQaKeepSurface)).catch(() => {})
    await application.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
