/* eslint-disable style/max-statements-per-line */
/* eslint-disable unicorn/prefer-dom-node-text-content -- Assert rendered product text rather than hidden content. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { closePrivateRuntime, launchOptions, packageIdentity, registerPrivateRuntime } = require('./electron-launch.cjs')
const { startSpeechQa } = require('./life-current-speech-qa.cjs')
const { observeLive2DExpression, readLive2DExpression, sampleLive2DSpeech } = require('./live2d-expression-observer.cjs')
const { runLive2DProductChecks, sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function main() {
  const root = path.resolve(process.env.LIFE_PRODUCT_REGRESSION_ROOT || 'output/product-regression-20261014')
  assert.ok(root.startsWith(`${path.resolve('output')}${path.sep}`))
  await fs.mkdir(root, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-regression-'))
  const identity = await packageIdentity() || { compiledMainSha256: createHash('sha256').update(await fs.readFile('apps/stage-tamagotchi/out/main/index.js')).digest('hex'), scope: 'compiled-development-runtime' }
  const configuration = JSON.parse(await fs.readFile(path.join(process.env.APPDATA, 'com.tohoqing.alicization/alicizations/llm-config.json'), 'utf8'))
  const selected = configuration.providerCredentials[configuration.activeProviderId]
  assert.ok(['openai-compatible', 'openai'].includes(configuration.activeProviderId))
  const secret = selected.apiKey
  const redact = value => String(value).replaceAll(secret, '[redacted]')
  const fastExpression = process.env.LIFE_PRODUCT_FAST_EXPRESSION === '1'
  const report = { format: fastExpression ? 'life-live2d-expression-diagnostic-v1' : 'life-product-regression-v1', syntheticIdentity: true, profile, ...identity, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, startedAt: new Date().toISOString(), checks: [], pages: [], errors: [], passed: false }
  const live2dOnly = process.env.LIFE_PRODUCT_RENDERER === 'live2d'
  report.rendererFocus = live2dOnly ? 'live2d' : 'both'
  const port = await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) })
  })
  const options = launchOptions(profile)
  options.env.PORT = String(port)
  // Keep the initial default channel from reaching an unrelated local instance.
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND')
  const app = await _electron.launch(options)
  let voice
  let expressionStage
  report.mainExitMessages = []
  app.on('console', (message) => {
    const text = message.text()
    if (/\[FileLogger\]|\[app-exit\]/.test(text))
      report.mainExitMessages.push(redact(text))
  })
  report.kokoroDownloadRequests = []
  app.context().on('request', (request) => {
    if (/https:\/\/(?:[^/]+\.)?huggingface\.co\//.test(request.url()))
      report.kokoroDownloadRequests.push(redact(request.url()))
  })
  const save = () => fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  const check = (name, ok, detail) => { report.checks.push({ name, passed: Boolean(ok), detail }); assert.ok(ok, name) }
  const click = async (locator, repetitions = 1) => {
    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      const clicked = await locator.evaluate((node, repetitions) => {
        const r = node.getBoundingClientRect()
        const s = getComputedStyle(node)
        if (!node.isConnected || !r.width || !r.height || node.disabled || s.visibility === 'hidden' || s.display === 'none')
          return false
        node.scrollIntoView({ block: 'center' })
        for (let index = 0; index < repetitions; index++) node.click()
        return true
      }, repetitions, { timeout: 10000 })
      if (clicked) { await wait(400); return }
      await wait(100)
    }
    throw new Error(`UI control did not become available: ${locator}`)
  }
  const capture = async (page, name) => {
    const readyStartedAt = Date.now()
    // A native window can expose its final URL before its first Vue document is
    // mounted. Wait for that document instead of racing the default body timeout.
    await page.waitForFunction(() => document.readyState !== 'loading' && document.body && document.querySelector('#app')?.__vue_app__, undefined, { timeout: 30000 })
    const documentReadyMs = Date.now() - readyStartedAt
    const text = redact(await page.locator('body').innerText())
    const screenshot = path.join(root, `${String(report.pages.length).padStart(3, '0')}-${name}.png`)
    await page.screenshot({ path: screenshot, timeout: 8000 })
    const dimensions = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }))
    const fields = await page.locator('textarea,input').evaluateAll(nodes => nodes.flatMap(node => [node.getAttribute('placeholder') || '', node.tagName === 'TEXTAREA' ? node.value : '']))
    const rawKeys = [...new Set([text, ...fields].join('\n').match(/settings\.[\w.-]+|about\.[\w.-]+|inlay\.[\w.-]+|(?<!stage\.)memory-workbench\.[\w.-]+/g) || [])]
    const renderer = await page.evaluate(() => {
      const model = document.querySelector('#app').__vue_app__?.config.globalProperties.$pinia?._s.get('settings-stage-model')
      return model ? { renderer: model.stageModelRenderer, modelId: model.stageModelSelected, mounted: document.documentElement.dataset.alicizationStageMounted } : null
    })
    const navigationControls = await page.locator('button').evaluateAll(nodes => nodes.filter(node => node.querySelector('[class*=arrow]') || node.getAttribute('aria-label')).map(node => ({ text: node.textContent.trim().slice(0, 80), label: node.getAttribute('aria-label'), title: node.getAttribute('title'), hidden: node.closest('[inert],[aria-hidden=true]')?.outerHTML.slice(0, 180) ?? null })))
    if (live2dOnly && renderer?.renderer)
      check(`Live2D renderer remains active at ${name}`, renderer.renderer === 'live2d', renderer)
    report.pages.push({ name, url: page.url(), text, screenshot, dimensions, rawKeys, renderer, navigationControls, documentReadyMs })
    await save()
  }
  report.rendererConsoleErrors = []
  const observe = (page) => {
    page.setDefaultTimeout(10000)
    page.setDefaultNavigationTimeout(15000)
    page.on('pageerror', error => report.errors.push({ message: redact(error.message), stack: redact(error.stack), url: page.url() }))
    page.on('console', (message) => {
      if (message.type() === 'error')
        report.rendererConsoleErrors.push({ message: redact(message.text()), url: page.url() })
    })
  }
  app.on('window', observe)
  app.windows().forEach(observe)
  try {
    report.nativeRuntime = await registerPrivateRuntime(app)
    report.channelFixture = { port, url: `ws://127.0.0.1:${port}/ws`, scope: 'Only synthetic QA network preferences; no life state is injected.' }
    await app.context().addInitScript((url) => {
      if (location.protocol === 'file:')
        localStorage.setItem('settings/connection/websocket-url', url)
    }, report.channelFixture.url)
    for (const page of app.windows().filter(page => page.url().endsWith('#/') || page.url().endsWith('#/onboarding'))) await page.reload()
    await app.evaluate(({ Tray }) => {
      const original = Tray.prototype.setContextMenu
      Tray.prototype.setContextMenu = function (menu) {
        globalThis.productQaMenu = menu
        return original.call(this, menu)
      }
    })
    let onboarding
    for (let i = 0; i < 120; i++) {
      onboarding = app.windows().find(page => page.url().endsWith('#/onboarding')); if (onboarding)
        break; await wait(250)
    }
    assert.ok(onboarding)
    await app.evaluate(({ app, BrowserWindow }) => {
      const owner = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/onboarding'))
      if (!owner)
        throw new Error('Actual onboarding owner unavailable')
      const qa = globalThis.productQaOnboardingWindows = { ownerId: owner.id, events: [] }
      qa.onCreated = (_event, window) => {
        if (qa.events.length < 100)
          qa.events.push({ event: 'created', id: window.id })
      }
      app.on('browser-window-created', qa.onCreated)
      owner.webContents.once('destroyed', () => qa.events.push({ event: 'onboarding-renderer-destroyed', id: qa.ownerId }))
      owner.once('closed', () => qa.events.push({ event: 'onboarding-closed', id: qa.ownerId }))
    })
    const welcomeStartedAt = Date.now()
    await onboarding.getByRole('button', { name: '开始吧！', exact: true }).waitFor({ timeout: 30000 })
    report.welcomeReadyMs = Date.now() - welcomeStartedAt
    await click(onboarding.getByRole('button', { name: '开始吧！', exact: true }))
    await onboarding.locator('form.persona-step input').nth(1).fill('QA 产品回归')
    await click(onboarding.locator('button[type=submit]'))
    const personaStep = title => onboarding.locator('form.persona-step').filter({ has: onboarding.getByRole('heading', { name: title, exact: true }) })
    const coreStep = personaStep('你期待怎样的她')
    await coreStep.locator('textarea').fill('温柔而有主见，喜欢画画。')
    await click(coreStep.locator('button[type=submit]'))
    await click(personaStep('让相处更合你的心意').locator('button[type=submit]'))
    await personaStep('这是她最初的样子').waitFor()
    await capture(onboarding, 'persona-preview')
    await click(personaStep('这是她最初的样子').getByRole('button', { name: '确认并继续', exact: true }))
    await onboarding.locator('input[value=ollama]').waitFor({ timeout: 30000 })
    await click(onboarding.locator('input[value=ollama]'))
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.locator('input[type=text]').fill('')
    check('Empty service URL cannot proceed', await onboarding.getByRole('button', { name: '下一步', exact: true }).isDisabled())
    await onboarding.locator('input[type=text]').fill('http://127.0.0.1:1/v1/')
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.getByRole('button', { name: '重试', exact: true }).waitFor()
    await capture(onboarding, 'connection-failure')
    const failureText = await onboarding.locator('body').innerText()
    check('Connection failure has Chinese recovery guidance', failureText.includes('请检查服务是否启动'))
    check('Technical error details are collapsed', !(await onboarding.locator('details').getAttribute('open')))
    await click(onboarding.getByRole('button', { name: '返回上一级', exact: true }))
    await click(onboarding.locator(`input[value="${configuration.activeProviderId}"]`))
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.locator('input[type=password]').fill(secret)
    await onboarding.locator('input[type=text]').fill(selected.baseUrl)
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.getByRole('button', { name: '保存并继续', exact: true }).waitFor({ timeout: 60000 })
    const model = configuration.activeModelId
    if (await onboarding.locator(`input[type=radio][value="${model}"]`).count() === 0)
      await onboarding.locator('input[type=search]').fill(model)
    await click(onboarding.locator(`input[type=radio][value="${model}"]`))
    check('Selecting a model waits for explicit confirmation', await onboarding.getByRole('button', { name: '保存并继续', exact: true }).isVisible())
    await capture(onboarding, 'model-selected-awaiting-confirmation')
    await click(onboarding.getByRole('button', { name: '保存并继续', exact: true }))
    await click(onboarding.getByRole('button', { name: '去配置动作映射', exact: true }))
    let settings
    for (let i = 0; i < 80; i++) {
      settings = app.windows().find(page => page.url().includes('#/settings')); if (settings)
        break; await wait(250)
    }
    assert.ok(settings)
    if (!onboarding.isClosed())
      await onboarding.waitForEvent('close', { timeout: 30000 })
    for (let attempt = 0; attempt < 120; attempt++) {
      if (await app.evaluate(() => globalThis.productQaOnboardingWindows.events.some(event => event.event === 'onboarding-renderer-destroyed')))
        break
      await wait(250)
    }
    report.onboardingWindowOrder = await app.evaluate(({ app, BrowserWindow }) => {
      const qa = globalThis.productQaOnboardingWindows
      const settings = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().includes('#/settings'))
      app.removeListener('browser-window-created', qa.onCreated)
      return { ownerId: qa.ownerId, settingsId: settings?.id, events: qa.events }
    })
    const settingsCreated = report.onboardingWindowOrder.events.findIndex(event => event.event === 'created' && event.id === report.onboardingWindowOrder.settingsId)
    const onboardingClosed = report.onboardingWindowOrder.events.findIndex(event => event.event === 'onboarding-renderer-destroyed')
    check('First-run follow-up settings opens before onboarding renderer disposal', settingsCreated >= 0 && onboardingClosed > settingsCreated, report.onboardingWindowOrder)
    await settings.getByRole('button', { name: '返回上一级', exact: true }).waitFor({ timeout: 30000 })
    await click(settings.getByRole('button', { name: '返回上一级', exact: true }))
    await settings.waitForURL('**#/settings')
    check('Cold settings deep link returns to settings home', settings.url().endsWith('#/settings'))
    const stage = app.windows().find(page => page.url().endsWith('#/'))
    assert.ok(stage)
    if (live2dOnly)
      check('First-run setup completes before desktop experience', onboarding.isClosed())
    const home = async () => {
      await click(stage.locator('button:has([i-solar\\:settings-minimalistic-outline])').last())
      await settings.waitForURL('**#/settings')
    }
    const go = async (route, name) => { await click(settings.locator(`a[href="#${route}"]`).first()); await settings.waitForURL(`**#${route}`); await wait(500); await capture(settings, name) }
    if (!fastExpression) {
      await go('/settings/modules', 'modules')
      const moduleLinks = await settings.locator('a[href^="#/settings/modules/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href').slice(1)))
      for (const route of moduleLinks) {
        await go(route, `module-${route.split('/').at(-1)}`)
        if (route.endsWith('/consciousness'))
          check('Configured provider is visible in consciousness', !(await settings.locator('body').innerText()).includes('没有配置服务来源'))
        if (route.endsWith('/memory')) {
          for (const tab of ['长期记忆', '回收站', '待审核', '召回测试', '人格候选', '质量验证', '健康与审计', '能力与技能']) {
            await click(settings.getByRole('button', { name: tab, exact: true }))
            await capture(settings, `memory-${['长期记忆', '回收站', '待审核', '召回测试', '人格候选', '质量验证', '健康与审计', '能力与技能'].indexOf(tab)}`)
          }
        }
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
        await settings.waitForURL('**#/settings/modules')
      }
      await home()
      await go('/settings/models', 'body-settings')
      const models = live2dOnly
        ? [['Hiyori (Free)', 'preset-live2d-2'], ['Hiyori (Pro)', 'preset-live2d-1']]
        : [['AvatarSample_A', 'preset-vrm-1'], ['Hiyori (Pro)', 'preset-live2d-1']]
      for (const [modelName, modelId] of models) {
        await click(settings.getByRole('button', { name: '选择模型', exact: true }))
        await settings.getByText(modelName, { exact: true }).waitFor()
        await capture(settings, `model-selector-${modelId}`)
        await click(settings.getByText(modelName, { exact: true }))
        await click(settings.getByRole('button', { name: '确认选择', exact: true }))
        await stage.waitForFunction(expected => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === expected, modelId)
        check(`Model choice reaches desktop: ${modelId}`, await stage.evaluate(expected => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === expected, modelId))
        await wait(3000)
        if (live2dOnly)
          await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true', undefined, { timeout: 30000 })
        await capture(stage, `desktop-${modelId}`)
      }
      if (live2dOnly)
        await runLive2DProductChecks({ app, stage, settings, click, capture, check, report, wait })
      await home()
      await go('/settings/airi-card', 'cards-localized')
      const cardCount = await settings.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').cards.size)
      check('Card upload uses its translated slot', (await settings.locator('body').innerText()).includes('点击或拖拽文件到此处上传'))
      await settings.locator('input[type=file]').setInputFiles({ name: 'invalid-card.json', mimeType: 'application/json', buffer: Buffer.from('{invalid json') })
      await settings.getByRole('alert').waitFor()
      check('Invalid card import shows an actionable error', (await settings.getByRole('alert').innerText()).includes('导入失败'))
      await capture(settings, 'invalid-card-feedback')
      await settings.locator('label:has(input[type=file])').evaluate((label) => {
        const transfer = new DataTransfer()
        transfer.items.add(new File(['{}'], 'invalid-drop.json', { type: 'application/json' }))
        label.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
      })
      check('Dropped card reaches import handler', (await settings.getByRole('alert').innerText()).includes('导入失败'))
      await settings.locator('label:has(input[type=file])').evaluate((label) => {
        const transfer = new DataTransfer()
        transfer.items.add(new File([JSON.stringify({ data: { name: 'QA 拖放角色卡', description: 'Synthetic drag and drop fixture', first_mes: '你好' } })], 'valid-drop.json', { type: 'application/json' }))
        label.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
      })
      await settings.getByRole('button', { name: '取消操作', exact: true }).waitFor()
      check('Valid dropped card opens the actual editor', await settings.getByRole('button', { name: '保存更改', exact: true }).isVisible())
      check('Invalid files never mutate the card list', await settings.evaluate(expected => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').cards.size === expected + 1, cardCount))
      check('Imported inactive card does not replace personhood authority', await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').activeCardId === 'default'))
      await capture(settings, 'valid-dropped-card')
      await click(settings.getByRole('button', { name: '取消操作', exact: true }))
      check('Cancelling inactive card editing keeps the current identity', await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').activeCardId === 'default'))
      await click(settings.locator('button[title="编辑模块绑定"]').last())
      await click(settings.getByRole('button', { name: '保存更改', exact: true }))
      check('Saving inactive card bindings keeps the current identity', await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').activeCardId === 'default'))
      await home()
      await go('/settings/life', 'life')
      await settings.locator('input[type=number]').first().fill('0')
      await click(settings.getByRole('button', { name: '保存交流节奏', exact: true }))
      await settings.reload()
      await settings.waitForFunction(() => document.querySelector('input[type=number]')?.value === '0')
      check('Paused initiative persists after reload', await settings.locator('input[type=number]').first().inputValue() === '0')
      await click(settings.locator('summary').filter({ hasText: '本地备份与恢复' }))
      await click(settings.getByRole('button', { name: '创建备份', exact: true }))
      await settings.getByRole('button', { name: '恢复此备份', exact: true }).waitFor()
      await capture(settings, 'backup-created')
      await home()
      await go('/settings/system', 'appearance')
      for (const sub of ['general', 'color-scheme', 'developer']) {
        await go(`/settings/system/${sub}`, `appearance-${sub}`)
        if (sub === 'general') {
          for (const language of ['English', '简体中文']) {
            await click(settings.getByRole('button', { name: 'Show popup', exact: true }))
            await click(settings.getByRole('option', { name: language, exact: true }))
          }
          await wait(600)
          report.trayLabels = await app.evaluate(() => globalThis.productQaMenu?.items.map(item => item.label).filter(Boolean))
          check('Actual rebuilt tray menu has Chinese labels', report.trayLabels?.some(label => label.startsWith('关于')) && report.trayLabels.every(label => !label.includes('tamagotchi.')))
        }
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
      }
      await home()
      for (const sub of ['data', 'connection']) { await go(`/settings/${sub}`, sub); await home() }
      await go('/settings/providers', 'providers')
      for (const [category, prefix] of [['对话模型', 'chat'], ['语音合成', 'speech'], ['语音识别', 'transcription']]) {
        if (await settings.locator(`a[href^="#/settings/providers/${prefix}/"]`).count() === 0)
          await click(settings.getByRole('button', { name: category, exact: true }))
      }
      await capture(settings, 'provider-categories-expanded')
      for (const route of ['/settings/modules/speech', '/settings/modules/hearing']) {
        await go(route, `builtin-${route.split('/').at(-1)}`)
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
        await settings.waitForURL('**#/settings/providers')
      }
      const providerLinks = await settings.locator('a[href^="#/settings/providers/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href').slice(1)))
      for (const [i, route] of providerLinks.entries()) {
        const downloadsBefore = report.kokoroDownloadRequests.length
        await go(route, `provider-${i}-${route.split('/').at(-1)}`)
        if (route.endsWith('/kokoro-local')) {
          await settings.getByRole('button', { name: '载入语音模型', exact: true }).waitFor()
          check('Browsing local speech settings does not download a model', report.kokoroDownloadRequests.length === downloadsBefore)
          const localModelSelection = settings.getByPlaceholder('选择一个模型...', { exact: true })
          check('The local speech model has a visible selected label', /WASM|WebGPU/.test(await localModelSelection.inputValue()))
          check('Local speech setup does not ask for an API key', await settings.locator('input[type=password]').count() === 0)
          await app.context().route('**/huggingface.co/**', async (request) => { await wait(1500); await request.abort('failed') })
          const failedLoadStartedAt = Date.now()
          await click(settings.getByRole('button', { name: '载入语音模型', exact: true }))
          check('Local speech model selection is disabled while loading', await localModelSelection.isDisabled())
          await settings.getByRole('alert').filter({ hasText: '模型载入失败' }).waitFor()
          check('Offline local model loading returns an actionable error promptly', Date.now() - failedLoadStartedAt < 15000 && await settings.getByRole('button', { name: '重试载入', exact: true }).isEnabled())
          await capture(settings, 'kokoro-offline-feedback')
          await click(settings.getByRole('button', { name: '重试载入', exact: true }))
          await settings.getByRole('alert').filter({ hasText: '模型载入失败' }).waitFor()
          check('Offline local model loading can be retried without a stuck spinner', await settings.getByRole('button', { name: '重试载入', exact: true }).isEnabled())
          await app.context().unroute('**/huggingface.co/**')
          report.kokoroOfflineFixture = true
        }
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
        await settings.waitForURL('**#/settings/providers')
        check(`Provider catalogue expansion survives return ${i}`, await settings.locator('a[href^="#/settings/providers/chat/"]').count() > 0 && await settings.locator('a[href^="#/settings/providers/speech/"]').count() > 0)
      }
    }
    if (fastExpression && process.env.LIFE_PRODUCT_FAST_WITH_WINDOWS === '1') {
      await go('/settings/system', 'exit-stress-system')
      await go('/settings/system/general', 'exit-stress-language')
      for (const language of ['English', '简体中文']) {
        await click(settings.getByRole('button', { name: 'Show popup', exact: true }))
        await click(settings.getByRole('option', { name: language, exact: true }))
      }
      await home()
    }
    if (!fastExpression || process.env.LIFE_PRODUCT_FAST_WITH_WINDOWS === '1') {
      for (const [prefix, route] of [['关于', '#/about'], ['打开字幕', '#/caption'], ['打开小部件', '#/widgets'], ['打开内嵌', '#/inlay']]) {
        if (process.env.LIFE_PRODUCT_AUX_FILTER && process.env.LIFE_PRODUCT_AUX_FILTER !== route)
          continue
        await app.evaluate((_, prefix) => {
          const item = globalThis.productQaMenu.items.find(item => item.label.startsWith(prefix))
          if (!item)
            throw new Error('Native tray command not found')
          item.click(item)
        }, prefix)
        let window
        for (let i = 0; i < 80; i++) {
          window = app.windows().find(page => page.url().includes(route)); if (window)
            break; await wait(250)
        }
        assert.ok(window, `Native tray command opens ${route}`)
        await wait(700)
        await capture(window, `tray-${route.slice(2)}`)
        if (route === '#/caption' && process.env.LIFE_PRODUCT_DISABLE_CAPTION_FOLLOW === '1') {
          await app.evaluate(async () => {
            const submenu = globalThis.productQaMenu.items.find(item => item.label === '字幕覆盖')?.submenu
            const follow = submenu?.items.find(item => item.label === '跟随窗口')
            if (!follow)
              throw new Error('Actual caption follow command unavailable')
            follow.checked = false
            await follow.click(follow)
          })
          await capture(window, 'caption-follow-disabled-diagnostic')
        }
        if (route === '#/about') {
          const overflow = await window.evaluate(() => [...document.querySelectorAll('*')].filter(node => ['auto', 'scroll'].includes(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 1).map(node => ({ tag: node.tagName, width: node.clientWidth, content: node.scrollWidth })))
          check('About window has no horizontal scrollbar', overflow.length === 0, overflow)
        }
        if (route === '#/widgets') {
          await click(window.getByRole('button', { name: '关闭窗口', exact: true }))
          check('An empty widget window can be closed', window.isClosed())
        }
      }
    }
    if (process.env.LIFE_PRODUCT_EXIT_AUX_ONLY === '1') {
      assert.ok(fastExpression, 'Auxiliary exit isolation is diagnostic-only')
      report.scope += ' Auxiliary-window exit isolation only; no dialogue or full-product acceptance.'
      report.passed = report.checks.every(check => check.passed) && report.errors.length === 0
      return
    }
    for (let attempt = 0; attempt < 150; attempt++) {
      if ((await sampleLive2D(stage)).models.length)
        break
      await wait(200)
    }
    await click(stage.locator('button:has([i-solar\\:alt-arrow-up-line-duotone])').last())
    await click(stage.locator('button:has([i-solar\\:chat-line-line-duotone])'))
    let chat
    for (let i = 0; i < 80; i++) {
      chat = app.windows().find(page => page.url().endsWith('#/chat')); if (chat)
        break; await wait(250)
    }
    assert.ok(chat)
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 30000 })
    if (live2dOnly && process.env.LIFE_PRODUCT_EXPRESSION === '1') {
      voice = await startSpeechQa(profile, { maxRequests: 48 })
      await Promise.all(app.windows().filter(page => page.url().includes('index.html#')).map(page => page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('consciousness')?.runtimeConfigHydrated === true, undefined, { timeout: 30000 })))
      const bridgeAssets = path.resolve('apps/stage-tamagotchi/out/renderer/assets')
      const bridgeFile = (await fs.readdir(bridgeAssets)).find(file => /^alicization-bridge-.*\.js$/u.test(file))
      const bridgeAlias = /getAlicizationBridge as (\w+)/u.exec(await fs.readFile(path.join(bridgeAssets, bridgeFile), 'utf8'))?.[1]
      assert.ok(bridgeAlias)
      await app.evaluate(({ app, BrowserWindow }) => {
        app.on('web-contents-created', (_event, contents) => contents.setAudioMuted(true))
        BrowserWindow.getAllWindows().forEach(window => window.webContents.setAudioMuted(true))
      })
      await stage.evaluate(async ({ voiceUrl, bridgeFile, bridgeAlias }) => {
        const module = await import(new URL(`./assets/${bridgeFile}`, location.href).href)
        const bridge = module[bridgeAlias]()
        const mainConfiguration = await bridge.getLlmConfig()
        const voiceConfiguration = { baseUrl: voiceUrl, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' }
        await bridge.syncLlmConfig({ ...mainConfiguration, providerCredentials: { ...mainConfiguration.providerCredentials, 'openai-compatible-audio-speech': voiceConfiguration } })
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        const providers = pinia._s.get('providers')
        providers.providers['openai-compatible-audio-speech'] = voiceConfiguration
        providers.forceProviderConfigured('openai-compatible-audio-speech')
        const speech = pinia._s.get('speech')
        speech.activeSpeechProvider = 'openai-compatible-audio-speech'
        speech.activeSpeechModel = 'qa-sapi'
        speech.activeSpeechVoiceId = 'qa-sapi'
        speech.ssmlEnabled = false
      }, { voiceUrl: voice.url, bridgeFile, bridgeAlias })
      report.expressionObservation = await observeLive2DExpression(stage)
      await stage.evaluate(() => {
        const button = document.createElement('button')
        button.id = 'live2d-qa-audio-resume'
        button.textContent = 'QA audio context'
        button.style.cssText = 'position:fixed;left:4px;top:60px;z-index:2147483647'
        button.onclick = () => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('audio-context').audioContext.resume()
        document.body.append(button)
      })
      await stage.locator('#live2d-qa-audio-resume').click()
      await stage.locator('#live2d-qa-audio-resume').evaluate(button => button.remove())
      report.speechConfiguration = await stage.evaluate(() => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        const speech = pinia._s.get('speech')
        return { provider: speech.activeSpeechProvider, model: speech.activeSpeechModel, voice: speech.activeSpeechVoiceId, audioContext: pinia._s.get('audio-context').audioContext.state }
      })
      check('Synthetic speech selection is ready and its private audio context is running', report.speechConfiguration.provider === 'openai-compatible-audio-speech' && report.speechConfiguration.audioContext === 'running', report.speechConfiguration)
      report.audioOutputMuted = true
      expressionStage = stage
    }
    check('Empty chat has a disabled send button and keyboard hint', await chat.getByRole('button', { name: '发送消息', exact: true }).isDisabled() && (await chat.locator('body').innerText()).includes('Shift + Enter'))
    await chat.locator('textarea').fill('你好，我叫 QA 产品回归，我喜欢在雨天画画。你叫什么？')
    await capture(chat, 'chat-visible-send')
    // Rapid clicks cover configuration preparation before the streaming lock.
    await click(chat.getByRole('button', { name: '发送消息', exact: true }), 2)
    await chat.getByRole('button', { name: '中断回复', exact: true }).waitFor()
    await chat.locator('textarea').fill('这是一份等待期间的新草稿。')
    await chat.locator('textarea').press('Enter')
    check('Repeated send retains the new draft while processing', await chat.locator('textarea').inputValue() === '这是一份等待期间的新草稿。')
    await capture(chat, 'chat-waiting-feedback')
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 180000 })
    await capture(chat, 'actual-model-reply')
    const messages = await chat.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('chat-session')?.messages)
    // Read actual session state for evidence only; all sends went through the UI.
    report.actualReplyText = redact(await chat.locator('body').innerText())
    check('Actual dialogue produced a named persona reply', report.actualReplyText.includes('小艾'))
    check('Chat has no horizontal overflow', (await chat.evaluate(() => document.documentElement.scrollWidth <= innerWidth)))
    report.sessionEvidenceAvailable = Boolean(messages)
    check('Only the submitted user turn entered the conversation', messages?.filter(message => message.role === 'user').length === 1)
    if (!fastExpression) {
      await home()
      await go('/settings/data', 'data-roundtrip')
      const exportedFile = path.join(root, 'synthetic-chat-export.json')
      await app.evaluate(({ session }, target) => {
        session.defaultSession.once('will-download', (_event, item) => {
          item.setSavePath(target)
          item.once('done', (_event, state) => { globalThis.productQaDownloadState = state })
        })
      }, exportedFile)
      await click(settings.getByRole('button', { name: '导出聊天记录', exact: true }))
      for (let i = 0; i < 100 && !(await fs.access(exportedFile).then(() => true, () => false)); i++) await wait(100)
      const exported = await fs.readFile(exportedFile, 'utf8')
      check('Chat export contains the actual synthetic conversation', exported.includes('QA 产品回归'))
      check('Chat export excludes the provider key', !exported.includes(secret))
      await settings.locator('input[type=file]').setInputFiles({ name: 'invalid-chat.json', mimeType: 'application/json', buffer: Buffer.from('{bad') })
      await settings.getByRole('alert').waitFor()
      await capture(settings, 'chat-import-error')
      await settings.locator('input[type=file]').setInputFiles(exportedFile)
      await settings.waitForFunction(() => !document.querySelector('[role=alert]'))
      await chat.reload()
      await chat.waitForFunction(() => document.body?.innerText.includes('小艾'))
      check('Chat import and reload preserve the same conversation', (await chat.locator('body').innerText()).includes('QA 产品回归'))
      await capture(chat, 'chat-import-persisted')
    }
    if (expressionStage) {
      const voiceAfterReload = await expressionStage.evaluate(() => {
        const speech = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('speech')
        return { provider: speech.activeSpeechProvider, voice: speech.activeSpeechVoiceId }
      })
      check('Chat reload preserves the chosen voice on the live stage', voiceAfterReload.provider === 'openai-compatible-audio-speech' && voiceAfterReload.voice === 'qa-sapi', voiceAfterReload)
      report.expressionTurns = []
      const expressionScenarios = [
        ['shared-joy', '今天画稿终于完成了，还得到了朋友的夸奖，我很开心，想和你分享一下。请简短聊两句。'],
        ['quiet-comfort', '不过我现在有点低落，担心下次画不好。先陪我安静一会儿，再轻轻鼓励我一句，好吗？'],
        ['gentle-acknowledgment', '你能轻轻点一下头回应我吗？一句简短的话就好。'],
      ]
      if (process.env.LIFE_PRODUCT_EXPRESSION_INITIAL_ONLY === '1') {
        for (let attempt = 0; attempt < 240; attempt++) {
          const speech = await sampleLive2DSpeech(expressionStage); const synthesis = voice.summary()
          if (attempt % 12 === 0) {
            report.expressionProgress = { speech, requests: synthesis.requests, pending: synthesis.pending, completed: synthesis.utterances.length }
            await save()
          }
          if (speech.hasSpoken && speech.latestActive === false && synthesis.pending === 0)
            break
          await wait(250)
        }
      }
      for (const [label, prompt] of process.env.LIFE_PRODUCT_EXPRESSION_INITIAL_ONLY === '1' ? [] : expressionScenarios) {
        const previousRequests = voice.summary().requests
        await expressionStage.evaluate((label) => { window.__live2dExpressionObservation.phase = label }, label)
        await chat.locator('textarea').fill(prompt)
        await click(chat.getByRole('button', { name: '发送消息', exact: true }))
        await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 180000 })
        for (let attempt = 0; attempt < 240; attempt++) {
          const speech = await sampleLive2DSpeech(expressionStage)
          const synthesis = voice.summary()
          if (attempt > 10 && speech.latestActive === false && synthesis.pending === 0 && synthesis.requests > previousRequests)
            break
          await wait(250)
        }
        report.expressionTurns.push({ label, prompt, text: redact(await chat.locator('body').innerText()) })
        check(`Actual speech completes for ${label}`, voice.summary().requests > previousRequests && voice.summary().pending === 0)
        await capture(expressionStage, `live2d-expression-${label}`)
        await capture(chat, `dialogue-${label}`)
      }
      report.expressionFrames = await readLive2DExpression(expressionStage)
      report.speechFixture = voice.summary()
      const speaking = report.expressionFrames.filter(frame => frame.speech.active)
      check('Real dialogue reaches a real Live2D speech render frame', speaking.length > 0)
      check('The real speech pipeline opens the compiled Live2D mouth', speaking.some(frame => frame.values.ParamMouthOpenY > 0.15))
      const silentAudioFrames = []
      const strictPcm = process.env.LIFE_PRODUCT_STRICT_PCM === '1'
      let silentRun
      for (const frame of report.expressionFrames) {
        const audio = frame.actualAudio
        if (strictPcm) {
          if (audio?.quietWindowSeconds >= 0.199 && audio.elapsed >= 0.2 && audio.quietWindowRms < 0.001 && frame.speech.energy < 0.005)
            silentAudioFrames.push(frame)
          continue
        }
        if (!audio || audio.rms >= 0.001 || frame.speech.energy >= 0.005) {
          silentRun = null
          continue
        }
        if (!silentRun || silentRun.id !== audio.id)
          silentRun = { id: audio.id, began: audio.elapsed }
        if (audio.elapsed - silentRun.began >= 0.2)
          silentAudioFrames.push(frame)
      }
      const idleSilentFrames = silentAudioFrames.filter(frame => frame.nativeMotionPriority === 0 || frame.nativeMotionPriority === 1)
      const foregroundSilentFrames = silentAudioFrames.filter(frame => frame.nativeMotionPriority > 1)
      report.actualAudioSilence = { scope: strictPcm ? 'All decoded PCM samples in a 200 ms window at the actual AudioContext playback clock, with window RMS below 0.001 and speech energy below 0.005. NONE/IDLE aperture is below 0.14; foreground actions in these gentle dialogue scenarios may retain small nonverbal facial opening below 0.20. Controlled neutral calibration separately requires below 0.05.' : 'Consecutive low-RMS render observations spanning at least 200 ms, with speech energy below its noise floor.', strictPcm, frames: silentAudioFrames.length, maxMouthOpen: Math.max(0, ...silentAudioFrames.map(frame => frame.values.ParamMouthOpenY)), idleFrames: idleSilentFrames.length, maxIdleMouthOpen: Math.max(0, ...idleSilentFrames.map(frame => frame.values.ParamMouthOpenY)), foregroundFrames: foregroundSilentFrames.length, maxForegroundMouthOpen: Math.max(0, ...foregroundSilentFrames.map(frame => frame.values.ParamMouthOpenY)), idleCeiling: 0.14, foregroundCeiling: 0.20 }
      if (process.env.LIFE_PRODUCT_QUIET_MOUTH_ASSERTIONS === '1')
        check('Actual audio silence releases speaking aperture while retaining small nonverbal expression', silentAudioFrames.length > 0 && idleSilentFrames.length + foregroundSilentFrames.length === silentAudioFrames.length && report.actualAudioSilence.maxIdleMouthOpen < 0.14 && report.actualAudioSilence.maxForegroundMouthOpen < 0.20, report.actualAudioSilence)
      check('Local voice synthesis completed without errors', report.speechFixture.requests > 0 && report.speechFixture.pending === 0 && report.speechFixture.utterances.length === report.speechFixture.requests && report.speechFixture.failures.length === 0, report.speechFixture)
      check('Speech ownership is released after the actual dialogue', report.expressionFrames.at(-1)?.speech.active === false)
      check('The matching cross-window chat intent is closed after playback', report.expressionFrames.at(-1)?.speechActivity?.chatIntentId === null)
      report.expressionScope = 'Actual configured LLM replies and bounded local Windows SAPI audio through the regular speech pipeline, with audio output muted. SAPI supplies test speech; this does not verify cloud voice quality or physical audio hardware.'
    }
    report.rawKeyPages = report.pages.filter(page => page.rawKeys.length).map(page => ({ name: page.name, rawKeys: page.rawKeys }))
    check('All observed product pages resolve translation keys', report.rawKeyPages.length === 0, report.rawKeyPages)
    check('No renderer exceptions', report.errors.length === 0, report.errors)
    if (live2dOnly)
      check('No unexpected Live2D load or render errors', !report.rendererConsoleErrors.some(error => error.url.startsWith('file:') && error.message.startsWith('[Live2D]')), report.rendererConsoleErrors.filter(error => error.message.startsWith('[Live2D]')))
    report.passed = true
  }
  catch (error) {
    report.failure = redact(error.message)
    for (const [index, page] of app.windows().entries()) {
      if (!page.isClosed() && page.url().includes('index.html#'))
        await capture(page, `failure-window-${index}`).catch(() => {})
    }
    await save()
    throw new Error(report.failure)
  }
  finally {
    if (expressionStage && !expressionStage.isClosed())
      report.audioObservation = await expressionStage.evaluate(() => window.__live2dExpressionObservation?.audioEvents ?? []).catch(() => [])
    if (expressionStage && !expressionStage.isClosed())
      report.streamObservation = await expressionStage.evaluate(() => { const qa = window.__live2dExpressionObservation; return { chatEvents: qa?.chatEvents, selectionChanges: qa?.selectionChanges, hookEvents: qa?.hookEvents, generationReads: qa?.generationReads, providerCalls: qa?.providerCalls } }).catch(() => null)
    if (expressionStage && !expressionStage.isClosed())
      report.expressionFrames = await readLive2DExpression(expressionStage).catch(() => report.expressionFrames)
    if (voice) {
      report.speechFixture = voice.summary()
      await voice.close()
    }
    await save()
    // Remove this QA profile's credential storage only after normal shutdown.
    // Clearing live Local Storage first can reinitialize every open renderer
    // (including its audio graph) while the app is trying to flush and exit.
    report.shutdown = await closePrivateRuntime(app, report.nativeRuntime, { viaUi: true })
    report.mainExitMessages = report.shutdown.exitMessages
    if (process.env.LIFE_PRODUCT_SHUTDOWN_ORDER === '1') {
      const markers = ['[app-exit] Saving life and window state', '[app-exit] State hooks completed; stopping services', '[app-exit] Services stopped; draining file logs', '[FileLogger] File closed successfully', '[app-exit] File logs drained; closing desktop windows', '[app-exit] Desktop windows closed; exiting']
      const positions = markers.map(marker => report.mainExitMessages.findIndex(message => message.includes(marker)))
      const passed = positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1]))
      report.checks.push({ name: 'Shutdown saves life and drains file logs before native window teardown', passed, detail: { markers, positions } })
      if (!passed) { report.passed = false; report.failure = 'Shutdown resource ordering was not observed' }
    }
    const configPath = path.join(profile, 'alicizations/llm-config.json')
    const config = JSON.parse(await fs.readFile(configPath, 'utf8').catch(() => '{}'))
    config.providerCredentials = {}
    await fs.writeFile(configPath, JSON.stringify(config))
    const storage = path.join(profile, 'Local Storage')
    const resolvedProfile = await fs.realpath(profile)
    assert.match(path.basename(resolvedProfile), /^alicization-life-product-regression-/)
    assert.equal(path.dirname(resolvedProfile).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
    await fs.rm(storage, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    report.credentialsRemoved = true
    report.finishedAt = new Date().toISOString()
    if (!report.shutdown.completed || report.shutdown.exitCode !== 0) {
      report.passed = false
      report.failure = report.shutdown.failure || `Application exited abnormally: ${report.shutdown.exitCode}`
      process.exitCode = 1
    }
    await save()
    console.info(JSON.stringify({ root, passed: report.passed, checks: report.checks.length, pages: report.pages.length, failure: report.failure }))
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
