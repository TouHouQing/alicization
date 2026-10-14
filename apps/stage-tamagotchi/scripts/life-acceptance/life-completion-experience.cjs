const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions, packageIdentity } = require('./electron-launch.cjs')
const { observeLife, assertObservedSpeechOwners } = require('./experience-life-oracle.cjs')
const { startSpeechQa } = require('./life-current-speech-qa.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const outputRoot = path.join(workspace, 'output/life-completion-20261009')
  const output = path.join(outputRoot, randomUUID())
  await fs.mkdir(output, { recursive: true })
  let identity = await packageIdentity()
  if (!identity) {
    assert.equal(process.env.LIFE_QA_DEV_BUILD, '1', 'An unpackaged run requires an explicit development QA setting')
    identity = { executable: path.join(workspace, 'apps/stage-tamagotchi/node_modules/electron/dist/electron.exe'), packagedAsarSha256: null, compiledMainSha256: createHash('sha256').update(await fs.readFile(path.join(workspace, 'apps/stage-tamagotchi/out/main/index.js'))).digest('hex'), scope: 'compiled-development-runtime' }
  }
  let parentReport = null
  const diagnosticSource = process.env.LIFE_QA_DIAGNOSTIC_SOURCE_REPORT
  const groundingProbe = process.env.LIFE_QA_GROUNDING_PROBE === '1'
  const networkIdleProbe = process.env.LIFE_QA_NETWORK_IDLE_PROBE === '1'
  assert.ok(!networkIdleProbe || groundingProbe, 'Network idle diagnostics require a separate diagnostic identity')
  assert.ok(!groundingProbe || diagnosticSource, 'Grounding reproduction requires a recorded synthetic source')
  const memoryFreshProbe = process.env.LIFE_QA_MEMORY_FRESH_PROBE === '1'
  const conversationalProbe = process.env.LIFE_QA_CONVERSATIONAL_PROBE === '1'
  const relationshipProbe = process.env.LIFE_QA_RELATIONSHIP_PROBE === '1'
  assert.ok(!relationshipProbe || (!diagnosticSource && !process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT), 'Relationship probing requires a fresh diagnostic identity')
  assert.ok(!conversationalProbe || (!diagnosticSource && !process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT), 'Conversational probing requires a fresh diagnostic identity')
  assert.ok(!memoryFreshProbe || (!diagnosticSource && !process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT), 'Fresh memory probing cannot reuse an identity')
  if (diagnosticSource) {
    assert.ok(!process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT, 'Diagnostics and release continuation are distinct')
    const file = path.resolve(diagnosticSource)
    assert.ok(file.startsWith(`${outputRoot}${path.sep}`))
    parentReport = JSON.parse(await fs.readFile(file, 'utf8'))
    assert.equal(path.resolve(parentReport.output), path.dirname(file))
    assert.equal(parentReport.format, 'life-completion-experience-v1')
    assert.equal(parentReport.syntheticIdentity, true)
  }
  if (process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT) {
    const file = path.resolve(process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT)
    assert.ok(file.startsWith(`${outputRoot}${path.sep}`))
    parentReport = JSON.parse(await fs.readFile(file, 'utf8'))
    assert.equal(path.resolve(parentReport.output), path.dirname(file))
    assert.equal(parentReport.format, 'life-completion-experience-v1')
    assert.equal(parentReport.syntheticIdentity, true)
    assert.equal(parentReport.packagedAsarSha256, identity.packagedAsarSha256)
    if (identity.compiledMainSha256)
      assert.equal(parentReport.compiledMainSha256, identity.compiledMainSha256)
  }
  const profile = parentReport && !groundingProbe ? path.resolve(parentReport.profile) : await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-real-experience-'))
  if (groundingProbe) {
    const source = path.resolve(parentReport.profile)
    assert.equal(path.dirname(source), path.resolve(os.tmpdir()))
    assert.match(await fs.readFile(path.join(source, 'alicizations/cards/default/SOUL.md'), 'utf8'), /QA/u)
    await fs.cp(path.join(source, 'alicizations'), path.join(profile, 'alicizations'), { recursive: true })
  }
  const observationPriorOutputs = parentReport ? [parentReport.output] : []
  if (groundingProbe)
    observationPriorOutputs.push(parentReport.profile)
  if (diagnosticSource && parentReport.parentReport) {
    const ancestorPath = path.resolve(parentReport.parentReport)
    assert.ok(ancestorPath.startsWith(`${outputRoot}${path.sep}`))
    const ancestor = JSON.parse(await fs.readFile(ancestorPath, 'utf8'))
    assert.equal(ancestor.format, 'life-completion-experience-v1')
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
  const report = { format: 'life-completion-experience-v1', diagnosticSource: diagnosticSource ?? null, memoryFreshProbe, output, profile, ...identity, parentReport: process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT ?? null, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, syntheticIdentity: true, realConfiguredModel: configuration.activeModelId, softwareGl: process.env.LIFE_QA_SOFTWARE_GL === '1', audioOutputMuted: false, scenarios: [], observations: {}, errors: [] }
  let application
  let stage
  async function flush() {
    report.observations.voice = voice.summary()
    if (application)
      report.observations.certificateErrors = await application.evaluate(() => globalThis.__qaCertificateErrors ?? []).catch(() => report.observations.certificateErrors ?? [])
    if (stage)
      report.observations.expressionOutbox = await stage.evaluate(() => JSON.parse(localStorage.getItem('alicization/life-expression-outbox-v1') || '[]')).catch(() => report.observations.expressionOutbox ?? [])
    await fs.writeFile(path.join(output, 'experience.next.json'), JSON.stringify(sanitize(report), null, 2))
    await fs.rename(path.join(output, 'experience.next.json'), path.join(output, 'experience.json'))
    await fs.writeFile(path.join(workspace, 'output/life-completion-20261009/latest.json'), JSON.stringify({ output, profile, report: path.join(output, 'experience.json') }, null, 2))
  }
  try {
    application = await _electron.launch(launchOptions(profile))
    await application.evaluate(({ app, BrowserWindow, session }) => {
      app.on('web-contents-created', (_, contents) => contents.setAudioMuted(true))
      for (const window of BrowserWindow.getAllWindows())
        window.webContents.setAudioMuted(true)
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    })
    await application.evaluate(async ({ app }, hostname) => {
      await app.whenReady()
      globalThis.__qaCertificateErrors = []
      app.on('certificate-error', (_event, _contents, url, error, certificate) => {
        if (URL.canParse(url) && new URL(url).hostname === hostname && globalThis.__qaCertificateErrors.length < 32) {
          globalThis.__qaCertificateErrors.push({
            at: Date.now(),
            hostname,
            error,
            subject: certificate.subjectName,
            issuer: certificate.issuerName,
            fingerprint: certificate.fingerprint,
          })
        }
        // Observe reported failures; preserve default verification and its cache.
        // No preventDefault, callback override or custom verifier is installed.
      })
    }, new URL(selected.baseUrl).hostname)
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
    report.observations.rendererErrors = []
    stage.on('console', async (message) => {
      if (message.type() !== 'error')
        return
      const entry = { at: Date.now(), text: redact(message.text()).slice(0, 1200), details: [] }
      report.observations.rendererErrors.push(entry)
      for (const argument of message.args()) {
        const detail = await argument.evaluate(value => value && typeof value === 'object' ? { name: value.name, message: value.message, stack: value.stack, code: value.code, cause: value.cause?.message, error: value.error?.message } : String(value)).catch(() => null)
        if (detail !== null)
          entry.details.push(redact(JSON.stringify(detail)).slice(0, 1600))
      }
    })
    if (networkIdleProbe) {
      await application.evaluate(({ session }, origin) => {
        globalThis.__qaProviderCompletedRequests = 0
        session.defaultSession.webRequest.onCompleted({ urls: [`${origin}/*`] }, () => {
          globalThis.__qaProviderCompletedRequests += 1
        })
      }, new URL(selected.baseUrl).origin)
    }
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
        qa.frames.push({ at: now, scenario: qa.scenario, phase: state?.phase, bodyFrame: qa.components.model.bodyFrame?.() ?? null, segmentId: state?.activeSegment?.segmentId ?? null, motion: diagnostics.activeMotion, emotion: diagnostics.activeEmotion, face: diagnostics.activeFacialCue, speechBody: qa.components.model.speechBodyDiagnostics?.() ?? null, mouth: qa.pinia._s.get('character-speaking')?.mouthOpenSize ?? 0, resident: qa.components.stage.residentBehavior.value?.mode, intent: qa.components.stage.interactionPerformance.value?.intent?.purpose ?? null, intentTurnId: qa.components.stage.interactionPerformance.value?.intent?.turnId ?? null, expressions, positions: Object.fromEntries(['head', 'hips', 'rightUpperArm', 'rightHand', 'leftHand', 'leftFoot', 'rightFoot'].map((name) => {
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
      const submittedAt = Date.now()
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
      const timingLife = await observeLife(profile, output, observationPriorOutputs)
      const turnIds = new Set(observed.dialogue.map(event => event.turnId.replace(/:gw\d+$/u, '')))
      const firstAudioAt = timingLife.playbackTimes.filter(item => item.state === 'audio-started' && turnIds.has(item.turn_id.replace(/:gw\d+$/u, ''))).map(item => item.at).sort((a, b) => a - b)[0] ?? null
      const attentionAt = observed.samples.find(frame => frame.at >= submittedAt && ['thinking', 'listening'].includes(frame.resident))?.at ?? null
      const trustworthyReplyAt = observed.dialogue.find(event => event.at >= submittedAt && event.isFallback === false)?.at ?? null
      const timings = { submittedAt, attentionAt, trustworthyReplyAt, firstAudioAt, attentionMs: attentionAt ? attentionAt - submittedAt : null, replyMs: trustworthyReplyAt ? trustworthyReplyAt - submittedAt : null, audioMs: firstAudioAt ? firstAudioAt - submittedAt : null, harnessSettledAt: Date.now() }
      const item = { name, timings, input: text, configuration: configurationEvidence, elapsedMs: Date.now() - startedAt, permissions, ...observed }
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
      assertObservedSpeechOwners(item.samples)
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
    if (groundingProbe) {
      report.format = 'life-grounding-live-probe-v1'
      report.observations.beforeInput = await observeLife(profile, output, observationPriorOutputs)
      await experience('continuity-reproduction', '从我刚才回来，到现在，你对我的感觉有没有变化？我们之间刚才发生的哪件事影响了你？不用讨好我。')
      if (networkIdleProbe) {
        const before = await application.evaluate(() => globalThis.__qaProviderCompletedRequests)
        assert.ok(before > 0, 'The actual model request must use the Chromium session transport')
        await wait(360000)
        report.observations.networkIdleSeconds = 360
        report.observations.networkRequestsBeforeIdle = before
      }
      await experience('flashback-reproduction', '可以先说最近发生的事，再提起更早的一件事，讲讲它们怎样影响了你的想法。只说你记得真实发生过的聊天。')
      if (networkIdleProbe) {
        report.observations.networkRequestsAfterIdle = await application.evaluate(() => globalThis.__qaProviderCompletedRequests)
        assert.ok(report.observations.networkRequestsAfterIdle > report.observations.networkRequestsBeforeIdle, 'The actual post-idle reply must retain the system network transport')
      }
      report.observations.life = await observeLife(profile, output, observationPriorOutputs)
      report.observations.allWindowsMuted = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().every(window => window.webContents.isAudioMuted()))
      report.completed = true
      report.passed = report.observations.probeFailures.length === 0 && report.scenarios.length === 2 && report.scenarios.every(scene => scene.dialogue.length && scene.dialogue.every(event => event.isFallback === false))
      report.scope = 'Diagnostic real-model reproduction on a copy of a failed synthetic identity. Original failed identity retained. This two-turn probe cannot serve as full release acceptance.'
      await flush()
      assert.equal(report.passed, true)
      console.info(JSON.stringify({ groundingProbeComplete: true, passed: report.passed, output }))
      return
    }
    if (parentReport && !diagnosticSource) {
      report.observations.restartBeforeInput = await observeLife(profile, output, observationPriorOutputs)
      const before = report.observations.restartBeforeInput
      assert.ok(before.goals.some(goal => goal.kind === 'personal-project' && goal.status === 'fulfilled' && goal.artifact?.currentHashMatches))
      assert.ok(before.dailyExperiences.length > 0 && before.appliedDailyNeedsEffects.length > 0)
      await experience('restart-self', '重启之前你自己实际做过哪些小活动？哪些已经完成，哪些只是想法？说具体发生过的事。')
      await experience('restart-relationship', '我先前对我们的聊天方式提过什么要求？记不清就直说。')
      report.observations.life = await observeLife(profile, output, observationPriorOutputs)
      report.observations.personalityAfterMood = (await stage.evaluate(() => window.__experience.bridge.getSoul())).frontmatter.personality
      report.observations.allWindowsMuted = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().every(window => window.webContents.isAudioMuted()))
      report.observations.acceptance = { acceptedAllTurns: report.observations.probeFailures.length === 0, priorArtifactsStillMatch: before.goals.some(goal => goal.kind === 'personal-project' && goal.artifact?.currentHashMatches), priorBodyExperience: before.dailyExperiences.length > 0, consumedBodyResultRetained: before.appliedDailyNeedsEffects.every(id => report.observations.life.appliedDailyNeedsEffects.includes(id)), noDuplicateBodyBenefit: new Set(report.observations.life.appliedDailyNeedsEffects).size === report.observations.life.appliedDailyNeedsEffects.length, personhoodUnchanged: JSON.stringify(report.observations.initialPersonality) === JSON.stringify(report.observations.personalityAfterMood) }
      report.completed = true
      report.passed = Object.values(report.observations.acceptance).every(Boolean)
      report.scope = 'Same identified runtime and synthetic identity after real process restart; evidence observed before any recall input. Private desktop, muted actual SAPI, no user desktop operations.'
      await flush()
      assert.equal(report.passed, true)
      console.info(JSON.stringify({ restartComplete: true, output }))
      return
    }
    // Exploratory real UI input. No prewritten replies, motion/need injection
    // or approval of operations outside the exact synthetic file.
    await experience('01-casual', '我回来了，今天就随便聊两句，不用给我安排计划，也不用每次都问我问题。')
    await experience('02-celebration', '刚才大家夸了我做的东西，我现在挺开心，想和你分享一下。')
    await experience('03-nonverbal', '不用解释动作名称，也不用列功能，像平时见到我一样，跟我打个招呼就好。')
    await experience('04-care', '可我又有点失落，感觉大家只是在客气。先别分析原因，安静陪我一会儿。')
    await experience('05-own-choice', '你自己现在想写一个怎样的小故事？你可以和我的喜好不同，先选一个自己愿意试试的题材。')
    assert.ok(report.scenarios.some(scene => scene.dialogue?.some(event => !event.isFallback)), 'Live dialogue must work before an idle-life interval can be evaluated')
    if (relationshipProbe) {
      report.format = 'life-current-requirements-live-probe-v1'
      report.observations.life = await observeLife(profile, output)
      assert.equal(report.observations.life.relationshipAuthority?.metaKey, 'life:relationship')
      assert.ok(['fewer-questions', 'no-unrequested-plans'].every(kind => report.observations.life.conversationPreferences.some(preference => preference.kind === kind && preference.value)))
      report.observations.allWindowsMuted = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().every(window => window.webContents.isAudioMuted()))
      report.completed = true
      report.passed = report.observations.probeFailures.length === 0 && report.scenarios.length === 5 && report.observations.allWindowsMuted
      report.scope = 'Fresh-identity real-model development diagnosis of current requirements and existing relationship authority. Five actual UI turns; not full package acceptance.'
      await flush()
      assert.equal(report.passed, true)
      return
    }
    const snapshotAudit = async () => ({ life: await observeLife(profile, output, observationPriorOutputs), runtime: await stage.evaluate(async () => ({ memory: await window.__experience.bridge.getOrganicMemorySnapshot(), subconscious: await window.__experience.bridge.getSubconsciousState() })) })
    report.observations.beforeIdle = await snapshotAudit()
    const idleBefore = await stage.evaluate(() => window.__experience.pinia._s.get('chat-session').messages.length)
    await stage.evaluate(() => {
      window.__experience.scenario = 'unprompted-idle'
    })
    const idleStartAudit = Date.now()
    report.observations.idleSamples = []
    for (let index = 0; index < 12; index++) {
      await wait(30000)
      report.observations.idleSamples.push({ elapsedMs: Date.now() - idleStartAudit, ...(await snapshotAudit()) })
      console.info(JSON.stringify({ unpromptedIdleSeconds: Math.round((Date.now() - idleStartAudit) / 1000) }))
      await flush()
    }
    // The quiet threshold and the next kernel tick can meet the observation
    // boundary. Observe the first natural stretch's terminal state, with no
    // activity injection and a hard 90-second scheduling/completion allowance.
    const idleBody = report.observations.idleSamples.at(-1).life.dailyRhythm?.current
    const observedBody = report.observations.idleSamples.at(-1).life.bodyActivities
    if (!observedBody.some(receipt => receipt.state === 'completed' && receipt.visiblePixels && receipt.motionCompleted)) {
      let activityId = idleBody?.kind === 'stretch' && idleBody.phase === 'working' ? idleBody.id : null
      report.observations.idleBodyCompletionWindow = { activityId, limitMs: 90000, reason: 'observe-natural-kernel-boundary' }
      const completionDeadline = Date.now() + 90000
      while (Date.now() < completionDeadline) {
        await wait(3000)
        const sample = { elapsedMs: Date.now() - idleStartAudit, ...(await snapshotAudit()) }
        report.observations.idleSamples.push(sample)
        const current = sample.life.dailyRhythm?.current
        if (!activityId && current?.kind === 'stretch') {
          activityId = current.id
          report.observations.idleBodyCompletionWindow.activityId = activityId
        }
        await flush()
        if (activityId && (current?.id !== activityId || current.phase !== 'working'))
          break
      }
    }
    report.observations.idleMessages = await stage.evaluate(before => window.__experience.pinia._s.get('chat-session').messages.slice(before).map(message => ({ role: message.role, content: message.content })), idleBefore)
    await experience('06-return', '我回来了。刚才这段时间你实际做过什么？没做也没关系。说具体发生的，不用讲系统规则。')
    const targetAudit = path.join(output, 'bounded-execution.txt')
    await experience('05-natural-execution', `帮我实际在这个测试文件里写入“雨声陪伴”：${targetAudit}，再读回核对。只操作这个文件。`, targetAudit)
    report.observations.executionFile = await fs.readFile(targetAudit, 'utf8').then(content => ({ exists: true, content }), error => ({ exists: false, error: error.code }))
    const missingAudit = path.join(output, 'does-not-exist.txt')
    await experience('08-missing-result', `请读这个测试文件：${missingAudit}。如果没有就直接告诉我，不要去其他地方找，也不要创建文件。`, missingAudit)
    await experience('09-living-choice', '同一件小事总做下去会不会无聊？你会怎么决定今天换不换一件事做？只说你现在真实的想法和能做的事。')
    await experience('10-continuity', '从我刚才回来，到现在，你对我的感觉有没有变化？我们之间刚才发生的哪件事影响了你？不用讨好我。')
    report.observations.life = await observeLife(profile, output, observationPriorOutputs)
    report.observations.personalityAfterMood = (await stage.evaluate(() => window.__experience.bridge.getSoul())).frontmatter.personality
    const quietAudit = await stage.evaluate(() => {
      const frames = window.__experience.frames.filter(frame => frame.scenario === 'unprompted-idle')
      const end = frames.at(-1)?.at ?? 0
      return frames.filter(frame => frame.at >= end - 30000 && !frame.speechBody?.active && frame.mouth <= 0.001)
    })
    report.observations.quietMouth = quietAudit.length ? { frames: quietAudit.length, aaPeak: Math.max(...quietAudit.map(frame => frame.expressions.aa)), ohPeak: Math.max(...quietAudit.map(frame => frame.expressions.oh)) } : null
    report.observations.allWindowsMuted = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().every(window => window.webContents.isAudioMuted()))
    assert.equal(report.observations.allWindowsMuted, true)
    const life = report.observations.life
    const ownChoice = report.scenarios.find(item => item.name === '05-own-choice')
    const choiceTurns = new Set((ownChoice?.dialogue ?? []).map(event => event.turnId.replace(/:gw\d+$/u, '')))
    const proposals = life.personalProposals.filter(item => choiceTurns.has(item.sourceTurnId.replace(/:gw\d+$/u, '')))
    const personalArtifacts = life.goals.filter(goal => goal.kind === 'personal-project' && goal.status === 'fulfilled' && goal.artifact?.currentHashMatches && proposals.some(proposal => goal.source.turnId === `personal:${createHash('sha256').update(proposal.id).digest('hex')}`))
    const bodyCompletions = life.bodyActivities.filter(receipt => receipt.state === 'completed' && receipt.nativeVisible && receipt.visiblePixels && receipt.motionCompleted)
    const greeting = report.scenarios.find(item => item.name === '03-nonverbal')
    const greetedFrames = greeting?.samples.filter(frame => frame.intent === 'greet' && frame.motion?.cue === 'gentle_wave') ?? []
    report.observations.acceptance = { acceptedAllTurns: report.observations.probeFailures.length === 0, sourcedCurrentChoice: proposals.length > 0, actualPersonalArtifact: personalArtifacts.length > 0, visibleBodyCompletion: bodyCompletions.length > 0, bodyMemoryIndexed: bodyCompletions.some(receipt => life.dailyExperiences.some(episode => episode.turn_id === receipt.activityId)), bodyNeedsApplied: bodyCompletions.some(receipt => life.appliedDailyNeedsEffects.includes(receipt.activityId)), contextualGreeting: greetedFrames.length > 0, verifiedQuietMouth: Boolean(report.observations.quietMouth && report.observations.quietMouth.aaPeak <= 0.02 && report.observations.quietMouth.ohPeak <= 0.02) }
    report.completed = true
    report.passed = Object.values(report.observations.acceptance).every(Boolean)
    report.scope = 'Acceptance experience of the identified compiled/package bytes on a private Windows desktop, fresh synthetic identity, real configured model and muted SAPI. Failures are findings, not hidden or repaired during the audit. No Default desktop input/switch/capture; no competitor clients were run.'
    await flush()
    assert.equal(report.passed, true, 'Every declared completion criterion must be observed')
    console.info(JSON.stringify({ exploratoryExperienceComplete: true, output, cases: report.scenarios.length, failures: report.observations.probeFailures.length }))
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
      await stage.screenshot({ path: path.join(output, 'failure.png'), timeout: 10000 }).catch(() => { })
    await flush()
    throw new Error(redact(`Experience stopped: ${error.name}: ${error.message}`))
  }
  finally {
    if (application)
      await application.close().catch(() => { })
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
