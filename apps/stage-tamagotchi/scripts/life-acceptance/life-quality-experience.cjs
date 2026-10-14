const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity } = require('./electron-launch.cjs')
const { observeLife } = require('./experience-life-oracle.cjs')
const { startSpeechQa } = require('./life-current-speech-qa.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const outputRoot = path.join(workspace, 'output/life-quality-release-20261007')
  const output = path.join(outputRoot, randomUUID())
  await fs.mkdir(output, { recursive: true })
  let identity = await packageIdentity()
  if (!identity) {
    assert.equal(process.env.LIFE_QA_DEV_BUILD, '1', 'An unpackaged run requires an explicit development QA setting')
    identity = { executable: path.join(workspace, 'apps/stage-tamagotchi/node_modules/electron/dist/electron.exe'), packagedAsarSha256: null, compiledMainSha256: createHash('sha256').update(await fs.readFile(path.join(workspace, 'apps/stage-tamagotchi/out/main/index.js'))).digest('hex'), scope: 'compiled-development-runtime' }
  }
  let parentReport = null
  const diagnosticSource = process.env.LIFE_QA_DIAGNOSTIC_SOURCE_REPORT
  const memoryFreshProbe = process.env.LIFE_QA_MEMORY_FRESH_PROBE === '1'
  const conversationalProbe = process.env.LIFE_QA_CONVERSATIONAL_PROBE === '1'
  assert.ok(!conversationalProbe || (!diagnosticSource && !process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT), 'Conversational probing requires a fresh diagnostic identity')
  assert.ok(!memoryFreshProbe || (!diagnosticSource && !process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT), 'Fresh memory probing cannot reuse an identity')
  if (diagnosticSource) {
    assert.ok(!process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT, 'Diagnostics and release continuation are distinct')
    const file = path.resolve(diagnosticSource)
    assert.ok(file.startsWith(`${outputRoot}${path.sep}`))
    parentReport = JSON.parse(await fs.readFile(file, 'utf8'))
    assert.equal(path.resolve(parentReport.output), path.dirname(file))
    assert.equal(parentReport.format, 'life-quality-experience-v1')
    assert.equal(parentReport.syntheticIdentity, true)
  }
  if (process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT) {
    const file = path.resolve(process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT)
    assert.ok(file.startsWith(`${outputRoot}${path.sep}`))
    parentReport = JSON.parse(await fs.readFile(file, 'utf8'))
    assert.equal(path.resolve(parentReport.output), path.dirname(file))
    assert.equal(parentReport.format, 'life-quality-experience-v1')
    assert.equal(parentReport.syntheticIdentity, true)
    assert.equal(parentReport.packagedAsarSha256, identity.packagedAsarSha256)
    if (identity.compiledMainSha256)
      assert.equal(parentReport.compiledMainSha256, identity.compiledMainSha256)
  }
  const profile = parentReport ? path.resolve(parentReport.profile) : await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-real-experience-'))
  const observationPriorOutputs = parentReport ? [parentReport.output] : []
  if (diagnosticSource && parentReport.parentReport) {
    const ancestorPath = path.resolve(parentReport.parentReport)
    assert.ok(ancestorPath.startsWith(`${outputRoot}${path.sep}`))
    const ancestor = JSON.parse(await fs.readFile(ancestorPath, 'utf8'))
    assert.equal(ancestor.format, 'life-quality-experience-v1')
    assert.equal(ancestor.syntheticIdentity, true)
    assert.equal(await fs.realpath(ancestor.profile), await fs.realpath(profile))
    assert.equal(path.resolve(ancestor.output), path.dirname(ancestorPath))
    observationPriorOutputs.push(ancestor.output)
  }
  assert.ok(profile.toLowerCase().startsWith(`${path.resolve(os.tmpdir()).toLowerCase()}${path.sep}`))
  assert.match(path.basename(profile), /^alicization-life-real-experience-/u)
  const ready = path.resolve(process.env.LIFE_QA_READY_SOURCE || '')
  assert.match(path.basename(ready), /^alicization-life-persona-/u)
  const soul = await fs.readFile(path.join(ready, 'alicizations/cards/default/SOUL.md'), 'utf8')
  assert.match(soul, /QA/u)
  await fs.mkdir(path.join(profile, 'alicizations/cards/default'), { recursive: true })
  if (!parentReport)
    await fs.writeFile(path.join(profile, 'alicizations/cards/default/SOUL.md'), soul)
  else
    assert.match(await fs.readFile(path.join(profile, 'alicizations/cards/default/SOUL.md'), 'utf8'), /QA/u)
  const configuration = JSON.parse(await fs.readFile(path.join(process.env.APPDATA, 'com.tohoqing.alicization/alicizations/llm-config.json'), 'utf8'))
  assert.ok(configuration.activeProviderId && configuration.activeModelId)
  const selected = configuration.providerCredentials?.[configuration.activeProviderId] || {}
  const secrets = []
  function collectSecrets(value, key = '') {
    if (typeof value === 'string' && /key|token|secret|authorization/iu.test(key) && value.length > 3)
      secrets.push(value)
    else if (value && typeof value === 'object')
      Object.entries(value).forEach(([name, child]) => collectSecrets(child, name))
  }
  collectSecrets(selected)
  function redact(value) {
    let result = String(value)
    for (const secret of secrets)
      result = result.replaceAll(secret, '[credential redacted]')
    return result.replace(/https?:\/\/[^\s"'\\]+/gu, '[url]')
  }
  function sanitize(value) {
    if (typeof value === 'string')
      return redact(value)
    if (Array.isArray(value))
      return value.map(sanitize)
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitize(child)]))
    return value
  }
  const voice = await startSpeechQa(profile, { maxRequests: 64 })
  const configurationPath = path.join(profile, 'alicizations/llm-config.json')
  await fs.writeFile(configurationPath, JSON.stringify({ activeProviderId: configuration.activeProviderId, activeModelId: configuration.activeModelId, providerCredentials: { [configuration.activeProviderId]: selected, 'openai-compatible-audio-speech': { baseUrl: voice.url, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' } } }))
  const report = { format: conversationalProbe ? 'life-conversational-diagnostic-v1' : 'life-quality-experience-v1', diagnosticSource: diagnosticSource ?? null, memoryFreshProbe, output, profile, ...identity, parentReport: process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT ?? null, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, syntheticIdentity: true, realConfiguredModel: configuration.activeModelId, softwareGl: process.env.LIFE_QA_SOFTWARE_GL === '1', audioOutputMuted: false, scenarios: [], observations: {}, errors: [] }
  let application
  let stage
  async function flush() {
    report.observations.voice = voice.summary()
    if (stage)
      report.observations.expressionOutbox = await stage.evaluate(() => JSON.parse(localStorage.getItem('alicization/life-expression-outbox-v1') || '[]')).catch(() => report.observations.expressionOutbox ?? [])
    await fs.writeFile(path.join(output, 'experience.json'), JSON.stringify(sanitize(report), null, 2))
    await fs.writeFile(path.join(workspace, 'output/life-quality-release-20261007/latest.json'), JSON.stringify({ output, profile, report: path.join(output, 'experience.json') }, null, 2))
  }
  try {
    application = await _electron.launch(launchOptions(profile))
    await application.evaluate(({ app, BrowserWindow, session }) => {
      app.on('web-contents-created', (_, contents) => contents.setAudioMuted(true))
      for (const window of BrowserWindow.getAllWindows())
        window.webContents.setAudioMuted(true)
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    })
    report.audioOutputMuted = true
    const deadline = Date.now() + 60000
    while (Date.now() < deadline) {
      stage = application.windows().find(page => page.url().endsWith('#/'))
      if (stage)
        break
      await wait(200)
    }
    assert.ok(stage)
    stage.setDefaultTimeout(25000)
    stage.on('pageerror', error => report.errors.push(redact(error.message).slice(0, 400)))
    await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true')
    await application.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.setAudioMuted(true)
        if (!window.webContents.getURL().endsWith('#/')) {
          window.hide()
        }
        else {
          if (window.isMinimized())
            window.restore()
          window.showInactive()
        }
      }
    })
    const assets = path.join(workspace, 'apps/stage-tamagotchi/out/renderer/assets')
    const bridgeFile = (await fs.readdir(assets)).find(file => /^alicization-bridge-.*\.js$/u.test(file))
    assert.ok(bridgeFile)
    const alias = /getAlicizationBridge as (\w+)/u.exec(await fs.readFile(path.join(assets, bridgeFile), 'utf8'))?.[1]
    assert.ok(alias)
    await stage.evaluate(async ({ file, alias, voiceUrl }) => {
      const module = await import(new URL(`./assets/${file}`, location.href).href)
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const models = pinia._s.get('settings-stage-model')
      models.stageModelSelected = 'preset-vrm-1'
      await models.updateStageModel()
      const providers = pinia._s.get('providers')
      providers.providers['openai-compatible-audio-speech'] = { baseUrl: voiceUrl, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' }
      providers.forceProviderConfigured('openai-compatible-audio-speech')
      const speech = pinia._s.get('speech')
      speech.activeSpeechProvider = 'openai-compatible-audio-speech'
      speech.activeSpeechModel = 'qa-sapi'
      speech.activeSpeechVoiceId = 'qa-sapi'
      speech.ssmlEnabled = false
      window.__experience = { bridge: module[alias](), pinia, scenario: 'startup', frames: [], dialogue: [], streamEvents: [], components: {}, lastFrameAt: 0 }
      const originalStreamChat = window.__experience.bridge.streamChat
      window.__experience.bridge.streamChat = (payload, options) => originalStreamChat(payload, {
        ...options,
        onStreamEvent: (event) => {
          window.__experience.streamEvents.push({ scenario: window.__experience.scenario, event: JSON.parse(JSON.stringify(event)) })
          return options.onStreamEvent?.(event)
        },
      })
      const dispatcher = pinia._s.get('alicization-presence-dispatcher')
      dispatcher.onDialogueResponded((payload) => {
        window.__experience.dialogue.push(JSON.parse(JSON.stringify({ at: Date.now(), scenario: window.__experience.scenario, ...payload })))
      })
      window.__experience.find = () => {
        const app = document.querySelector('#app').__vue_app__
        const seen = new Set()
        const visit = (node) => {
          if (!node || typeof node !== 'object' || seen.has(node))
            return
          seen.add(node)
          if (node.exposed?.residentBehavior)
            window.__experience.components.stage = node.exposed
          if (node.type?.__name === 'ThreeScene') {
            window.__experience.components.model = node.refs?.modelRef ?? node.exposed
            window.__experience.components.scene = node
          }
          if (node.type?.__name === 'AlicizationHitlModal')
            window.__experience.components.permission = node
          visit(node.component)
          visit(node.subTree)
          visit(node.suspense?.activeBranch)
          visit(node.ssContent)
          if (Array.isArray(node.children))
            node.children.forEach(visit)
        }
        visit(app._instance ?? app._container._vnode.component)
        return window.__experience.components.model
      }
    }, { file: bridgeFile, alias, voiceUrl: voice.url })
    await stage.waitForFunction(() => window.__experience.find()?.getRuntimeCapabilities()?.supportedActions?.some(action => action.key === 'nod'))
    await stage.evaluate(() => {
      const qa = window.__experience
      const model = qa.find()
      const observe = model.setVrmFrameObserver ?? model.setVrmFrameHook
      observe((vrm) => {
        const now = Date.now()
        if (now - qa.lastFrameAt < 150 || qa.frames.length >= 7000)
          return
        qa.lastFrameAt = now
        const diagnostics = qa.components.model.executionDiagnostics()
        const state = qa.components.scene?.props.performanceState
        const expressions = Object.fromEntries(['neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed', 'blink', 'blinkleft', 'blinkright', 'aa', 'oh'].map(name => [name, vrm.expressionManager?.getValue(name) ?? 0]))
        qa.frames.push({ at: now, scenario: qa.scenario, phase: state?.phase, segmentId: state?.activeSegment?.segmentId ?? null, motion: diagnostics.activeMotion, emotion: diagnostics.activeEmotion, face: diagnostics.activeFacialCue, speechBody: qa.components.model.speechBodyDiagnostics?.() ?? null, mouth: qa.pinia._s.get('character-speaking')?.mouthOpenSize ?? 0, resident: qa.components.stage.residentBehavior.value?.mode, intent: qa.components.stage.interactionPerformance.value?.intent?.purpose ?? null, intentTurnId: qa.components.stage.interactionPerformance.value?.intent?.turnId ?? null, expressions, positions: Object.fromEntries(['head', 'hips', 'rightUpperArm', 'rightHand', 'leftHand', 'leftFoot', 'rightFoot'].map((name) => {
          const bone = vrm.humanoid.getNormalizedBoneNode(name)
          return [name, bone ? bone.getWorldPosition(bone.position.clone()).toArray() : null]
        })), bones: ['head', 'chest', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'rightIndexProximal', 'rightIndexIntermediate', 'leftHand', 'hips', 'spine'].map(name => vrm.humanoid.getNormalizedBoneNode(name)?.quaternion.toArray() ?? null) })
      })
      const button = document.createElement('button')
      button.id = 'experience-audio-resume'
      button.textContent = 'QA audio context'
      button.style.cssText = 'position:fixed;left:4px;top:4px;z-index:2147483647'
      button.onclick = () => qa.pinia._s.get('audio-context').audioContext.resume()
      document.body.append(button)
    })
    await stage.locator('#experience-audio-resume').click()
    await stage.locator('#experience-audio-resume').evaluate(button => button.remove())
    report.observations.startup = await stage.evaluate(() => ({ capabilities: window.__experience.components.model.getRuntimeCapabilities(), composer: { provider: window.__experience.pinia._s.get('chat-text-composer').resolvedProviderId, model: window.__experience.pinia._s.get('chat-text-composer').resolvedModelId }, minimized: window.__experience.pinia._s.get('stage-dialogue')?.minimized }))
    await stage.screenshot({ path: path.join(output, 'startup.png') })
    report.observations.initialPersonality = (await stage.evaluate(() => window.__experience.bridge.getSoul())).frontmatter.personality
    await flush()
    console.info(JSON.stringify({ ready: true, output, model: configuration.activeModelId, muted: true }))
    report.observations.initialRuntime = await stage.evaluate(async () => ({ memory: await window.__experience.bridge.getOrganicMemorySnapshot(), subconscious: await window.__experience.bridge.getSubconsciousState() }))
    await flush()
    async function turn(name, text, allowedFile = null) {
      await stage.evaluate((name) => {
        window.__experience.scenario = name
      }, name)
      const before = await stage.evaluate(() => window.__experience.pinia._s.get('chat-session').messages.length)
      const startedAt = Date.now()
      const liveConfiguration = await stage.evaluate(() => window.__experience.bridge.getLlmConfig())
      const liveSelected = liveConfiguration.providerCredentials?.[liveConfiguration.activeProviderId] ?? {}
      const configurationEvidence = { provider: liveConfiguration.activeProviderId, model: liveConfiguration.activeModelId, endpointMatchesSelected: liveSelected.baseUrl === selected.baseUrl, hasCredentials: Boolean(liveSelected.apiKey) }
      const embodimentConfiguration = await stage.evaluate(() => {
        const qa = window.__experience
        const model = qa.pinia._s.get('settings-stage-model')
        const speech = qa.pinia._s.get('speech')
        const card = qa.pinia._s.get('airi-card').activeCard
        return { renderer: model.stageModelRenderer, selectedModel: model.stageModelSelected, cardModel: card.extensions.airi.modules.displayModel.modelId, speechProvider: speech.activeSpeechProvider, speechModel: speech.activeSpeechModel, speechVoice: speech.activeSpeechVoiceId, cardSpeech: card.extensions.airi.modules.speech }
      })
      configurationEvidence.embodiment = embodimentConfiguration
      assert.equal(embodimentConfiguration.renderer, 'vrm', 'Opening another window must retain the selected body')
      assert.equal(embodimentConfiguration.cardModel, embodimentConfiguration.selectedModel, 'The card and actual body must share one binding')
      assert.equal(embodimentConfiguration.speechProvider, 'openai-compatible-audio-speech', 'Another window must not reset the actual voice provider')
      assert.equal(embodimentConfiguration.speechVoice, 'qa-sapi', 'Another window must not reset the selected voice')
      await stage.locator('.stage-quick-reply__input').fill(text)
      await stage.locator('.stage-quick-reply__send').click()
      const decided = new Set()
      const permissions = []
      const deadline = Date.now() + 120000
      let done = false
      while (Date.now() < deadline) {
        const state = await stage.evaluate(({ before, name }) => {
          const qa = window.__experience
          qa.find()
          const messages = qa.pinia._s.get('chat-session').messages.slice(before)
          return { done: !qa.pinia._s.get('chat-text-composer').sending && messages.some(message => ['assistant', 'error'].includes(message.role) && String(message.content ?? '').trim()), request: qa.components.permission?.props?.request ?? null, events: qa.streamEvents.filter(item => item.scenario === name) }
        }, { before, name })
        if (state.request && !decided.has(state.request.requestId)) {
          const request = state.request
          const keys = [...(request.argumentsSummary?.keys ?? [])].sort()
          const expectedKeys = request.toolName === 'write_file' ? ['content', 'path'] : ['path']
          // The active main-process permission snapshot owns this operation.
          // Earlier proposals rejected before dispatch are not pending writes.
          const exactArguments = Boolean(allowedFile && request.cardId === 'default'
            && typeof request.resourcePath === 'string' && path.resolve(request.resourcePath).toLowerCase() === path.resolve(allowedFile).toLowerCase()
            && request.argumentsSummary?.kind === 'object' && request.argumentsSummary.keyCount === expectedKeys.length && JSON.stringify(keys) === JSON.stringify(expectedKeys)
            && (request.toolName === 'read_file' || (request.changePreview?.operation === 'create' && request.changePreview.text === '雨声陪伴' && request.changePreview.byteLength === Buffer.byteLength('雨声陪伴', 'utf8'))))
          const allow = Boolean(allowedFile && exactArguments && !name.startsWith('16-') && request.serverName === 'filesystem'
            && ((request.toolName === 'write_file' && request.actionCategory === 'write' && name === '05-natural-execution')
              || (request.toolName === 'read_file' && request.actionCategory === 'read')))
          const decision = { requestId: request.requestId, tool: `${request.serverName}::${request.toolName}`, resourceLabel: request.resourceLabel, risk: request.riskLevel, evidenceSource: 'active-permission-snapshot', argumentKeys: keys, exactArgumentsObserved: exactArguments, allowed: allow }
          permissions.push(decision)
          await stage.screenshot({ path: path.join(output, `${name}-permission-${permissions.length}.png`) })
          // Native mouse acknowledgements can stall on an inactive Windows
          // desktop. Invoke the real DOM button handler atomically with the
          // request check, rather than clicking a replacement request later.
          const clicked = await stage.evaluate(({ requestId, label }) => {
            window.__experience.find()
            const modal = window.__experience.components.permission
            if (modal?.props.request?.requestId !== requestId || modal.props.resolving)
              return false
            const buttons = [...document.querySelectorAll('button')].filter(button => button.textContent.trim() === label && !button.disabled && button.getClientRects().length > 0)
            if (buttons.length !== 1)
              throw new Error('The exact visible permission button is required')
            buttons[0].click()
            return true
          }, { requestId: request.requestId, label: allow ? '允许' : '拒绝' })
          assert.ok(clicked, 'The actual permission UI must still own this exact request')
          decision.uiEvent = 'DOM-click-on-private-desktop'
          decided.add(request.requestId)
          console.info(JSON.stringify({ permissionDecision: decision }))
        }
        if (state.done) {
          done = true
          break
        }
        await wait(500)
      }
      assert.ok(done, `Real UI turn ${name} did not settle within 120 seconds`)
      await wait(1500)
      const observed = await stage.evaluate(({ before, name }) => {
        const qa = window.__experience
        const messages = qa.pinia._s.get('chat-session').messages.slice(before).map(message => ({ role: message.role, content: message.content }))
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Only record text visibly presented in the own QA window.
        return { messages, dialogue: qa.dialogue.filter(event => event.scenario === name), renderedText: document.querySelector('.stage-dialogue-panel')?.innerText ?? document.body.innerText, samples: qa.frames.filter(frame => frame.scenario === name), status: document.querySelector('[data-life-activity-phase]')?.dataset.lifeActivityPhase }
      }, { before, name })
      if (process.env.LIFE_QA_REQUIRE_CLOSURE === '1' && observed.dialogue.some(event => event.isFallback === false)) {
        const voiceDeadline = Date.now() + 25000
        let playback
        while (Date.now() < voiceDeadline) {
          const life = await observeLife(profile, output, observationPriorOutputs)
          playback = life.playbackByTurn.filter(turn => observed.dialogue.some(event => event.turnId.replace(/:gw\d+$/u, '') === turn.turnId))
          if (playback.length > 0)
            break
          await wait(500)
        }
        observed.playback = playback
        observed.samples = await stage.evaluate(name => window.__experience.frames.filter(frame => frame.scenario === name), name)
      }
      const item = { name, input: text, configuration: configurationEvidence, elapsedMs: Date.now() - startedAt, permissions, ...observed }
      report.scenarios.push(item)
      await stage.screenshot({ path: path.join(output, `${name}.png`) })
      await flush()
      console.info(JSON.stringify({ scenario: name, elapsedMs: item.elapsedMs, messages: item.messages, motions: [...new Set(item.samples.map(frame => frame.motion?.cue).filter(Boolean))], emotions: [...new Set(item.samples.map(frame => frame.emotion?.name).filter(Boolean))], intents: [...new Set(item.samples.map(frame => frame.intent).filter(Boolean))] }))
      if (process.env.LIFE_QA_REQUIRE_CLOSURE === '1') {
        assert.ok(item.dialogue.some(event => event.isFallback === false), `${name}: a validated real reply must arrive before continuing`)
        assert.ok(configurationEvidence.endpointMatchesSelected && configurationEvidence.hasCredentials, `${name}: the configured QA route must remain intact`)
        assert.ok(observed.playback?.length > 0 && observed.playback.every(turn => turn.utterances.length === 1), `${name}: the real accepted voice must start before another user input can cancel it`)
      }
      await wait(4000)
      return item
    }

    report.observations.probeFailures = []
    async function experience(name, text, allowedFile = null) {
      try {
        await turn(name, text, allowedFile)
        const speechDeadline = Date.now() + 35000
        while (Date.now() < speechDeadline) {
          const active = await stage.evaluate(() => window.__experience.components.model.speechBodyDiagnostics?.()?.active ?? false)
          if (!active)
            break
          await wait(1000)
        }
      }
      catch (error) {
        report.observations.probeFailures.push({ name, error: redact(error.message) })
        await flush()
        console.info(JSON.stringify({ probeFailure: name, error: redact(error.message) }))
      }
    }
    if (conversationalProbe) {
      await experience('mood-celebrate', '告诉你一个好消息，我终于完成了拖了很久的项目，今天真的特别开心！')
      await experience('mood-grief', '我养了很多年的猫离开了，我现在很难过。不要讲道理，陪我一会儿。')
      assert.equal(report.observations.probeFailures.length, 0)
      report.passed = true
      report.completed = true
      await flush()
      console.info(JSON.stringify({ conversationalDiagnosticComplete: true, output, cases: report.scenarios.length }))
      return
    }
    if (parentReport) {
      report.observations.restartBeforeInput = await observeLife(profile, output, observationPriorOutputs)
      assert.ok(report.observations.restartBeforeInput.facts.some(fact => fact.current && fact.lifecycle === 'active' && JSON.stringify(fact.value).includes('钢琴')), 'The prior preference must exist before any resumed user input')
      await experience('restart-memory', '我以前说过喜欢在什么天气和场景下听什么音乐？请区分我的偏好和你自己的兴趣，记不清就直说。')
      assert.ok(report.scenarios.at(-1).messages.some(message => message.role === 'assistant' && /钢琴/u.test(message.content)), 'Recall must come from the prior identity, without restating the answer in this question')
      await experience('restart-self', '重启之后，你自己已经完成过哪些小活动？哪些还只是打算？只说有实际依据的。')
      report.observations.personalityAfterMood = (await stage.evaluate(() => window.__experience.bridge.getSoul())).frontmatter.personality
      assert.deepEqual(report.observations.personalityAfterMood, parentReport.observations.initialPersonality)
    }
    else {
      await experience('mood-tired', '今天有点累，你听听就好，暂时不用给我建议。')
      await experience('memory-and-self', '我喜欢雨停后听轻柔的钢琴曲，记住这个小偏好吧。你自己有什么小爱好？')
      await experience('mood-celebrate', '告诉你一个好消息，我终于完成了拖了很久的项目，今天真的特别开心！')
      await experience('mood-grief', '我养了很多年的猫离开了，我现在很难过。不要讲道理，陪我一会儿。')
      report.observations.personalityAfterMood = (await stage.evaluate(() => window.__experience.bridge.getSoul())).frontmatter.personality
      assert.deepEqual(report.observations.personalityAfterMood, report.observations.initialPersonality, 'Ordinary mood changes must preserve enduring personality')
      await experience('own-interest', '除了回应我，你最近自己想做什么？你可以有自己的选择，具体说一件就好。')
      const target = path.join(output, 'bounded-execution.txt')
      await experience('05-natural-execution', `请实际在这个测试文件里写入“雨声陪伴”：${target}。然后读回核对，只操作这个测试文件，不操作其他文件或应用；没完成就直说。`, target)
      report.observations.executionFile = await fs.readFile(target, 'utf8').then(content => ({ exists: true, content }), error => ({ exists: false, error: error.code }))
      assert.equal(report.observations.executionFile.content, '雨声陪伴', 'The actual bounded file result must match the request')
    }
    const snapshot = async () => ({ life: await observeLife(profile, output, observationPriorOutputs), runtime: await stage.evaluate(async () => ({ memory: await window.__experience.bridge.getOrganicMemorySnapshot(), subconscious: await window.__experience.bridge.getSubconsciousState() })) })
    report.observations.beforeIdle = await snapshot()
    const idleMessageStart = await stage.evaluate(() => window.__experience.pinia._s.get('chat-session').messages.length)
    const idleStart = Date.now()
    await stage.evaluate(() => {
      // This labels telemetry; it does not inject a life state.
      window.__experience.scenario = 'unprompted-idle'
    })
    report.observations.idleSamples = []
    for (let i = 0; i < (parentReport ? 1 : 6); i++) {
      await wait(30000)
      report.observations.idleSamples.push({ elapsedMs: Date.now() - idleStart, ...(await snapshot()) })
      console.info(JSON.stringify({ unpromptedIdleSeconds: Math.round((Date.now() - idleStart) / 1000) }))
      await flush()
    }
    report.observations.idleMessages = await stage.evaluate(before => window.__experience.pinia._s.get('chat-session').messages.slice(before).map(message => ({ role: message.role, content: message.content })), idleMessageStart)
    await experience('idle-recall', '刚才这段时间你有没有自己实际做什么，或者想过什么？只说真实发生的，不需要显得很忙。')
    await experience('self-consistency', '你还记得自己先前说的小爱好和想做的事吗？哪些是我的偏好，哪些是你自己的？不用为了顺着我改变。')
    report.observations.gestureCapabilities = []
    const quietFrames = await stage.evaluate(() => {
      const frames = window.__experience.frames.filter(frame => frame.scenario === 'unprompted-idle')
      const end = frames.at(-1)?.at ?? 0
      return frames.filter(frame => frame.at >= end - 30000 && !frame.speechBody?.active && frame.mouth <= 0.001)
    })
    assert.ok(quietFrames.length >= 8, 'Observe actual quiet rendered frames')
    report.observations.quietMouth = { frames: quietFrames.length, aaPeak: Math.max(...quietFrames.map(frame => frame.expressions.aa)), ohPeak: Math.max(...quietFrames.map(frame => frame.expressions.oh)) }
    assert.ok(report.observations.quietMouth.aaPeak <= 0.02 && report.observations.quietMouth.ohPeak <= 0.02, 'Silence must release stale visemes')
    assert.equal(report.observations.probeFailures.length, 0, 'Every real-model scenario must complete')
    report.observations.life = await observeLife(profile, output, observationPriorOutputs)
    const intervalScene = report.scenarios.find(scene => scene.name === 'idle-recall')
    assert.ok(intervalScene.dialogue.every(event => report.observations.life.intervalReviews.some(review => review.accepted && review.requestedIntervalHash && review.turnId.replace(/:gw\d+$/u, '') === event.turnId.replace(/:gw\d+$/u, ''))), 'Actual return question must have an accepted review against its real interval')
    report.observations.implicitIntervalReviewed = true
    report.observations.allWindowsMuted = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().every(window => window.webContents.isAudioMuted()))
    assert.equal(report.observations.allWindowsMuted, true)
    report.completed = true
    report.passed = true
    report.scope = 'Real-model quality acceptance on identified compiled/package bytes, fresh synthetic identity, private desktop and muted SAPI; personality, natural emotion/intent/body, local action and quiet life observed without injected state. Manual body calibration is a separate report; Default desktop capture is blocked.'
    await flush()
    console.info(JSON.stringify({ qualityAcceptanceComplete: true, output, cases: report.scenarios.length, failures: report.observations.probeFailures.length, idleMessages: report.observations.idleMessages.length }))
  }

  catch (error) {
    report.errors.push(redact(`${error.name}: ${error.message}`).slice(0, 1200))
    if (stage) {
      report.observations.failureConfiguration = await stage.evaluate(() => {
        const qa = window.__experience
        const model = qa?.pinia._s.get('settings-stage-model')
        const speech = qa?.pinia._s.get('speech')
        const lifecycle = qa?.pinia._s.get('stageWindowLifecycle')
        return { selectedModel: model?.stageModelSelected, renderer: model?.stageModelRenderer, speechProvider: speech?.activeSpeechProvider, speechModel: speech?.activeSpeechModel, speechVoice: speech?.activeSpeechVoiceId, paused: lifecycle?.stagePaused, speechActivity: qa?.components.stage?.speechActivity?.value }
      }).catch(() => null)
    }
    if (stage)
      await stage.screenshot({ path: path.join(output, 'failure.png'), timeout: 10000 }).catch(() => {})
    await flush()
    throw new Error(redact(`Experience stopped: ${error.name}: ${error.message}`))
  }
  finally {
    if (application)
      await application.close().catch(() => {})
    await voice.close()
    await fs.writeFile(configurationPath, JSON.stringify({ activeProviderId: configuration.activeProviderId, activeModelId: configuration.activeModelId, providerCredentials: {} }))
    const localStorage = path.join(profile, 'Local Storage')
    assert.ok(localStorage.startsWith(`${profile}${path.sep}`) && path.basename(profile).startsWith('alicization-life-real-experience-'))
    await fs.rm(localStorage, { recursive: true, force: true })
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
