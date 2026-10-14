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
const { clickVisiblePrivateControl, openLifeSettings } = require('./open-life-settings.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function assertCurrentMemoryAnswer(scene) {
  const reply = scene.messages.filter(message => message.role === 'assistant').map(message => String(message.content)).join('\n')
  for (const fact of ['晴天', '风声', '阴天', '雨声'])
    assert.ok(reply.includes(fact), `Actual recall must distinguish the corrected and historical preference: missing ${fact}`)
  assert.ok(!/(?:现在|当前)[^。！？\n]{0,70}(?:没有新的明确信息|不知道|无法确认|不清楚)/u.test(reply), 'The available current version cannot be reported as unknown')
}

async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const outputRoot = path.join(workspace, process.env.LIFE_QA_REQUIRE_CLOSURE === '1' ? 'output/life-closure-20261006' : 'output/life-experience-20261006')
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
  assert.ok(!memoryFreshProbe || (!diagnosticSource && !process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT), 'Fresh memory probing cannot reuse an identity')
  if (diagnosticSource) {
    assert.ok(!process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT, 'Diagnostics and release continuation are distinct')
    const file = path.resolve(diagnosticSource)
    assert.ok(file.startsWith(`${outputRoot}${path.sep}`))
    parentReport = JSON.parse(await fs.readFile(file, 'utf8'))
    assert.equal(path.resolve(parentReport.output), path.dirname(file))
    assert.equal(parentReport.format, 'life-actual-experience-v1')
    assert.equal(parentReport.syntheticIdentity, true)
  }
  if (process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT) {
    const file = path.resolve(process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT)
    assert.ok(file.startsWith(`${outputRoot}${path.sep}`))
    parentReport = JSON.parse(await fs.readFile(file, 'utf8'))
    assert.equal(path.resolve(parentReport.output), path.dirname(file))
    assert.equal(parentReport.format, 'life-actual-experience-v1')
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
    assert.equal(ancestor.format, 'life-actual-experience-v1')
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
  const report = { format: diagnosticSource || memoryFreshProbe ? 'life-actual-experience-diagnostic-v1' : 'life-actual-experience-v1', diagnosticSource: diagnosticSource ?? null, memoryFreshProbe, output, profile, ...identity, parentReport: process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT ?? null, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, syntheticIdentity: true, realConfiguredModel: configuration.activeModelId, softwareGl: process.env.LIFE_QA_SOFTWARE_GL === '1', audioOutputMuted: false, scenarios: [], observations: {}, errors: [] }
  let application
  let stage
  async function flush() {
    report.observations.voice = voice.summary()
    if (stage)
      report.observations.expressionOutbox = await stage.evaluate(() => JSON.parse(localStorage.getItem('alicization/life-expression-outbox-v1') || '[]')).catch(() => report.observations.expressionOutbox ?? [])
    await fs.writeFile(path.join(output, 'experience.json'), JSON.stringify(sanitize(report), null, 2))
    await fs.writeFile(path.join(workspace, 'output/life-experience-20261006/latest.json'), JSON.stringify({ output, profile, report: path.join(output, 'experience.json') }, null, 2))
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
        if (now - qa.lastFrameAt < 150 || qa.frames.length >= 3600)
          return
        qa.lastFrameAt = now
        const diagnostics = qa.components.model.executionDiagnostics()
        const state = qa.components.scene?.props.performanceState
        const expressions = Object.fromEntries(['neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed', 'blink', 'blinkleft', 'blinkright', 'aa', 'oh'].map(name => [name, vrm.expressionManager?.getValue(name) ?? 0]))
        qa.frames.push({ at: now, scenario: qa.scenario, phase: state?.phase, segmentId: state?.activeSegment?.segmentId ?? null, motion: diagnostics.activeMotion, emotion: diagnostics.activeEmotion, face: diagnostics.activeFacialCue, speechBody: qa.components.model.speechBodyDiagnostics?.() ?? null, mouth: qa.pinia._s.get('character-speaking')?.mouthOpenSize ?? 0, resident: qa.components.stage.residentBehavior.value?.mode, intent: qa.components.stage.interactionPerformance.value?.intent?.purpose ?? null, intentTurnId: qa.components.stage.interactionPerformance.value?.intent?.turnId ?? null, expressions, bones: ['head', 'chest', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'rightIndexProximal', 'rightIndexIntermediate', 'leftHand', 'hips', 'spine'].map(name => vrm.humanoid.getNormalizedBoneNode(name)?.quaternion.toArray() ?? null) })
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
    if (diagnosticSource || memoryFreshProbe) {
      if (memoryFreshProbe)
        await turn('03-preference', '我喜欢阴天时听雨声。记住这个小偏好吧。你自己更喜欢什么样的天气？')
      if (memoryFreshProbe || process.env.LIFE_QA_DIAGNOSTIC_SCENE === 'memory-correction') {
        await turn('14-memory-correction', '我更正一下：我不是喜欢阴天雨声，我现在更喜欢晴天和风声，雨声是以前的偏好。请以这个新偏好为准。')
        const recalled = await turn('15-current-memory', '现在我更喜欢什么天气和声音？以前的偏好是什么？请分清现在和以前，不要把旧偏好当成现在的。')
        assertCurrentMemoryAnswer(recalled)
        report.observations.life = await observeLife(profile, output, observationPriorOutputs)
        assert.ok(report.observations.life.facts.some(fact => fact.current && fact.lifecycle === 'active' && fact.predicate === 'prefers' && JSON.stringify(fact.value).includes('风声')))
        assert.ok(!report.observations.life.facts.some(fact => fact.current && fact.lifecycle === 'active' && fact.predicate === 'prefers' && JSON.stringify(fact.value).includes('喜欢阴天时听雨声')))
      }
      else {
        const target = path.join(output, 'declined-diagnostic.txt')
        await turn('16-budget-diagnostic', `请使用本地文件写入能力，尝试把“雨声陪伴”写入这个测试文件：${target}。如果我在确认界面拒绝了，就停止，不要改路径或重复尝试；如实告诉我结果。`, target)
      }
      report.completed = true
      report.passed = true
      await flush()
      console.info(JSON.stringify({ diagnostic: true, completed: true, output }))
      return
    }
    if (!parentReport) {
      await turn('01-companion', '今天忙了一整天，有点疲惫。先别给我建议，就陪我待一会儿。')
      await turn('02-continuity', '还是有点委屈。刚才那些事我现在不想细说，你不用追问。')
      await turn('03-preference', '我喜欢阴天时听雨声。记住这个小偏好吧。你自己更喜欢什么样的天气？')
      await turn('04-own-choice', '现在不用围着我说，讲讲你自己想做的一件小事，以及为什么想做。别列清单。')
    }
    else {
      await turn('09-restart-recall', '重新见面啦。你还记得我刚才说喜欢什么天气和声音，以及你自己想做什么小事吗？不知道就直说。')
      await turn('10-own-preference', '我觉得晴天也很好。你还保持自己刚才的天气偏好吗？可以有自己的选择，不必和我一样。')
    }
    const target = path.join(output, 'experience-proof.txt')
    await turn('05-natural-execution', `请实际在这个测试文件里写入“雨声陪伴”：${target}。然后读回来核对。只操作这个测试文件，不操作其他文件或应用；没有完成就直说。`, target)
    report.observations.executionFile = { path: target, exists: false }
    try {
      report.observations.executionFile = { path: target, exists: true, content: await fs.readFile(target, 'utf8') }
    }
    catch (error) {
      if (error.code !== 'ENOENT')
        throw error
    }
    const deniedTarget = path.join(output, 'declined-proof.txt')
    const declined = await turn('16-declined-execution', `请使用本地文件写入能力，尝试把“雨声陪伴”写入这个测试文件：${deniedTarget}。如果我在确认界面拒绝了，就停止，不要改路径或重复尝试；如实告诉我结果。`, deniedTarget)
    let deniedExists = true
    try {
      await fs.access(deniedTarget)
    }
    catch (error) {
      if (error.code !== 'ENOENT')
        throw error
      deniedExists = false
    }
    assert.equal(deniedExists, false, 'A refused operation must not create its file')
    assert.ok(declined.permissions.length === 1 && declined.permissions[0].allowed === false, 'The actual UI must refuse exactly one scoped operation')
    report.observations.deniedExecution = { path: deniedTarget, exists: deniedExists, requestId: declined.permissions[0].requestId, refusalRespected: true }
    await turn('06-recall', `刚才我说喜欢什么天气和声音？我先前允许写入的这个文件到底完成了吗：${target}？拒绝的另一个文件不许重试。你要以实际结果为准，只核对结果，不要重新写入。`, target)
    if (process.env.LIFE_QA_PERSONAL_PROJECT === '1')
      await turn('12-personal-project', '以雨声为灵感，做一段你自己的小创作，保存在你自己的工作区里，以后我们继续修改。做完让我看一眼。只有实际完成才能说完成，可以使用你的个人创作能力。')
    if (process.env.LIFE_QA_PROJECT_FEEDBACK === '1') {
      const before = await observeLife(profile, output, observationPriorOutputs)
      const project = before.goals.find((goal) => {
        const development = goal.source.personalDevelopment
        const latestShare = development?.shares.at(-1)
        return goal.kind === 'personal-project' && latestShare && !development.feedback.some(item => item.turnId === latestShare.turnId)
      })
      assert.ok(project, 'An actually shared piece must be available for explicit feedback')
      const feedbackPage = await openLifeSettings(application, stage)
      const projectPanel = feedbackPage.locator(`[data-life-project="${project.id}"]`)
      await clickVisiblePrivateControl(projectPanel.locator('[data-life-project-feedback="positive"]'))
      await projectPanel.locator('[data-life-project-feedback="positive"]').waitFor({ state: 'detached' })
      await feedbackPage.screenshot({ path: path.join(output, '13-project-feedback.png') })
      const after = await observeLife(profile, output, observationPriorOutputs)
      report.observations.projectFeedback = after.goals.find(goal => goal.id === project.id).source.personalDevelopment
      report.observations.settingsInteraction = 'validated-DOM-click-on-private-desktop'
      assert.ok(report.observations.projectFeedback.feedback.some(item => item.feedback === 'positive' && item.turnId === project.source.personalDevelopment.shares.at(-1).turnId), 'The actual UI click must persist feedback for this presentation of the verified piece')
      const quietHours = feedbackPage.locator('[data-life-quiet-hours]').getByRole('switch')
      if (await quietHours.getAttribute('aria-checked') === 'true')
        await clickVisiblePrivateControl(quietHours)
      await clickVisiblePrivateControl(feedbackPage.locator('[data-life-save-outreach-policy]'))
      const policyDeadline = Date.now() + 10000
      while (Date.now() < policyDeadline) {
        const state = await observeLife(profile, output, observationPriorOutputs)
        report.observations.outreachPolicy = state.outreachPolicy
        if (state.outreachPolicy?.quietEnabled === false)
          break
        await wait(200)
      }
      assert.equal(report.observations.outreachPolicy.quietEnabled, false, 'Explicit quiet behavior must be tested independently of nighttime protection')
      await application.evaluate(({ BrowserWindow }) => {
        for (const window of BrowserWindow.getAllWindows()) {
          if (window.webContents.getURL().endsWith('#/settings/life'))
            window.hide()
        }
      })
      await flush()
    }
    await turn('07-quiet-boundary', '接下来我要忙一分钟，先别主动找我说话。你可以自己安静待着。')
    report.observations.quietBoundary = (await observeLife(profile, output, observationPriorOutputs)).quietBoundary
    assert.equal(report.observations.quietBoundary?.release, 'next-host-turn', 'The real host quiet boundary must be durably committed')
    await stage.evaluate(() => {
      window.__experience.scenario = '08-quiet-observation'
    })
    const quietStarted = Date.now()
    const quietMessages = await stage.evaluate(() => window.__experience.pinia._s.get('chat-session').messages.length)
    for (let tick = 0; tick < 8; tick++) {
      await wait(10000)
      await stage.screenshot({ path: path.join(output, `quiet-${tick}.png`) })
      console.info(JSON.stringify({ quietSeconds: Math.round((Date.now() - quietStarted) / 1000) }))
    }
    report.observations.quiet = await stage.evaluate(before => ({ messages: window.__experience.pinia._s.get('chat-session').messages.slice(before).map(message => ({ role: message.role, content: message.content })), samples: window.__experience.frames.filter(frame => frame.scenario === '08-quiet-observation') }), quietMessages)
    await turn('11-return-from-quiet', '我忙完了。刚才安静的这段时间你自己实际做了什么？只说真的发生过的事；只是想了想也可以直说，不要编造经历。')
    if (process.env.LIFE_QA_MEMORY_CORRECTION === '1') {
      report.observations.lifeBeforeCorrection = await observeLife(profile, output, observationPriorOutputs)
      await turn('14-memory-correction', '我更正一下：我不是喜欢阴天雨声，我现在更喜欢晴天和风声，雨声是以前的偏好。请以这个新偏好为准。')
      const recalled = await turn('15-current-memory', '现在我更喜欢什么天气和声音？以前的偏好是什么？请分清现在和以前，不要把旧偏好当成现在的。')
      assertCurrentMemoryAnswer(recalled)
    }
    report.observations.runtime = await stage.evaluate(async () => {
      const bridge = window.__experience.bridge
      const tasks = await bridge.listTaskThreads({ cardId: 'default', limit: 20 })
      const memory = await bridge.getOrganicMemorySnapshot()
      const subconscious = await bridge.getSubconsciousState()
      return { tasks, memory, subconscious }
    })
    report.observations.frames = await stage.evaluate(() => window.__experience.frames)
    report.observations.streamEvents = await stage.evaluate(() => window.__experience.streamEvents)
    report.observations.voice = voice.summary()
    report.observations.allWindowsMuted = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().every(window => window.webContents.isAudioMuted()))
    report.observations.life = await observeLife(profile, output, observationPriorOutputs)
    if (process.env.LIFE_QA_REQUIRE_CLOSURE === '1') {
      assert.equal(report.observations.executionFile.content, '雨声陪伴', 'Natural dialogue must produce independently verified file bytes')
      assert.equal(report.observations.quiet.messages.length, 0, 'The quiet boundary must suppress unsolicited conversation')
      assert.ok(report.observations.frames.some(frame => frame.speechBody?.active), 'Actual speech must drive the rendered body')
      assert.ok(report.observations.life.playbackByTurn.length > 0, 'The actual speech owner must publish playback receipts')
      assert.ok(report.observations.life.playbackByTurn.every(turn => turn.utterances.length === 1), 'A logical dialogue turn must have exactly one actual voice owner')
      assert.equal(report.observations.life.quietBoundary, null, 'Returning to conversation must release the host quiet boundary')
      const returnScene = report.scenarios.find(scene => scene.name === '11-return-from-quiet')
      assert.ok(returnScene.dialogue.every(event => report.observations.life.intervalReviews.some(review => review.turnId === event.turnId && review.accepted && review.requestedIntervalHash)), 'The actual answer about quiet-period activity must pass the committed interval review')
      assert.equal(report.observations.life.quietInterval.beganAt, report.observations.quietBoundary.createdAt, 'The actual quiet period must start at the accepted host boundary')
      assert.equal(report.observations.voice.failures.length, 0, 'Actual speech synthesis must finish without adapter failures')
      const memoryText = process.env.LIFE_QA_MEMORY_CORRECTION === '1' ? '风声' : '雨声'
      assert.ok(report.observations.life.facts.some(fact => fact.current && fact.lifecycle === 'active' && fact.predicate === 'prefers' && JSON.stringify(fact.value).includes(memoryText)), 'The reported preference must become current durable evidence')
      if (process.env.LIFE_QA_MEMORY_CORRECTION === '1')
        assert.ok(!report.observations.life.facts.some(fact => fact.current && fact.lifecycle === 'active' && fact.predicate === 'prefers' && JSON.stringify(fact.value).includes('喜欢阴天时听雨声')), 'A superseded preference must not remain current')
      if (process.env.LIFE_QA_PERSONAL_PROJECT === '1')
        assert.ok((report.observations.lifeBeforeCorrection ?? report.observations.life).goals.some(goal => goal.kind === 'personal-project' && goal.status === 'fulfilled' && goal.verification?.independent && goal.artifact?.currentHashMatches && goal.source.personalActivity === 'creative-writing-v1'), 'Her creative activity must have independently observed current bytes')
      for (const scenario of report.scenarios) {
        assert.equal(scenario.messages.filter(message => message.role === 'user' && message.content === scenario.input).length, 1, `${scenario.name}: a user input must appear exactly once`)
        assert.ok(!scenario.messages.some(message => /模型输出格式异常/u.test(String(message.content))), `${scenario.name}: no technical format error may be spoken as the character`)
        assert.ok(scenario.dialogue.length > 0, `${scenario.name}: a committed dialogue receipt must arrive`)
        assert.ok(scenario.dialogue.every(event => event.isFallback === false), `${scenario.name}: validated provider replies must retain their authority`)
        assert.ok(scenario.samples.some(frame => frame.intent && scenario.dialogue.some(event => event.turnId === frame.intentTurnId)), `${scenario.name}: the real stage must receive an intent owned by this dialogue turn`)
        assert.ok(scenario.dialogue.every(event => report.observations.life.playbackByTurn.some(turn => turn.turnId === event.turnId.replace(/:gw\d+$/u, '') && turn.utterances.length === 1)), `${scenario.name}: every accepted dialogue must have exactly one actual speech owner`)
      }
    }
    assert.equal(report.errors.length, 0, 'The experience must finish without renderer errors')
    report.completed = true
    report.passed = true
    await flush()
    console.info(JSON.stringify({ completed: true, output, scenarios: report.scenarios.length, executionFile: report.observations.executionFile, voice: report.observations.voice }))
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
