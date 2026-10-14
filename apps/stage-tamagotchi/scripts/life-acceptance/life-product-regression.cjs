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
  const report = { format: 'life-product-regression-v1', syntheticIdentity: true, profile, ...identity, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, startedAt: new Date().toISOString(), checks: [], pages: [], errors: [], passed: false }
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
  report.kokoroDownloadRequests = []
  app.context().on('request', (request) => {
    if (/https:\/\/(?:[^/]+\.)?huggingface\.co\//.test(request.url()))
      report.kokoroDownloadRequests.push(redact(request.url()))
  })
  const save = () => fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  const check = (name, ok, detail) => { report.checks.push({ name, passed: Boolean(ok), detail }); assert.ok(ok, name) }
  const click = async (locator, repetitions = 1) => {
    await locator.evaluate((node, repetitions) => {
      const r = node.getBoundingClientRect()
      const s = getComputedStyle(node)
      if (!node.isConnected || !r.width || !r.height || node.disabled || s.visibility === 'hidden' || s.display === 'none')
        throw new Error('Unavailable UI control')
      node.scrollIntoView({ block: 'center' })
      for (let index = 0; index < repetitions; index++) node.click()
    }, repetitions, { timeout: 10000 })
    await wait(400)
  }
  const capture = async (page, name) => {
    const text = redact(await page.locator('body').innerText())
    const screenshot = path.join(root, `${String(report.pages.length).padStart(3, '0')}-${name}.png`)
    await page.screenshot({ path: screenshot, timeout: 8000 })
    const dimensions = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }))
    const fields = await page.locator('textarea,input').evaluateAll(nodes => nodes.flatMap(node => [node.getAttribute('placeholder') || '', node.tagName === 'TEXTAREA' ? node.value : '']))
    const rawKeys = [...new Set([text, ...fields].join('\n').match(/settings\.[\w.-]+|about\.[\w.-]+|inlay\.[\w.-]+|(?<!stage\.)memory-workbench\.[\w.-]+/g) || [])]
    report.pages.push({ name, url: page.url(), text, screenshot, dimensions, rawKeys })
    await save()
  }
  const observe = (page) => { page.setDefaultTimeout(10000); page.on('pageerror', error => report.errors.push({ message: redact(error.message), stack: redact(error.stack), url: page.url() })) }
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
    await onboarding.getByRole('button', { name: '开始吧！', exact: true }).waitFor()
    await click(onboarding.getByRole('button', { name: '开始吧！', exact: true }))
    await onboarding.locator('form.persona-step input').nth(1).fill('QA 产品回归')
    await click(onboarding.locator('button[type=submit]'))
    await onboarding.locator('textarea').fill('温柔而有主见，喜欢画画。')
    await click(onboarding.locator('button[type=submit]'))
    await click(onboarding.locator('button[type=submit]'))
    await capture(onboarding, 'persona-preview')
    await click(onboarding.locator('button[type=submit]'))
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
    await settings.getByRole('button', { name: '返回上一级', exact: true }).waitFor()
    await click(settings.getByRole('button', { name: '返回上一级', exact: true }))
    await settings.waitForURL('**#/settings')
    check('Cold settings deep link returns to settings home', settings.url().endsWith('#/settings'))
    const stage = app.windows().find(page => page.url().endsWith('#/'))
    assert.ok(stage)
    const home = async () => {
      await click(stage.locator('button:has([i-solar\\:settings-minimalistic-outline])').last())
      await settings.waitForURL('**#/settings')
    }
    const go = async (route, name) => { await click(settings.locator(`a[href="#${route}"]`).first()); await settings.waitForURL(`**#${route}`); await wait(500); await capture(settings, name) }
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
    for (const [modelName, modelId] of [['AvatarSample_A', 'preset-vrm-1'], ['Hiyori (Pro)', 'preset-live2d-1']]) {
      await click(settings.getByRole('button', { name: '选择模型', exact: true }))
      await settings.getByText(modelName, { exact: true }).waitFor()
      await capture(settings, `model-selector-${modelId}`)
      await click(settings.getByText(modelName, { exact: true }))
      await click(settings.getByRole('button', { name: '确认选择', exact: true }))
      await stage.waitForFunction(expected => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === expected, modelId)
      check(`Model choice reaches desktop: ${modelId}`, await stage.evaluate(expected => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === expected, modelId))
      await wait(3000)
      await capture(stage, `desktop-${modelId}`)
    }
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
    for (const [prefix, route] of [['关于', '#/about'], ['打开字幕', '#/caption'], ['打开小部件', '#/widgets'], ['打开内嵌', '#/inlay']]) {
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
      if (route === '#/about') {
        const overflow = await window.evaluate(() => [...document.querySelectorAll('*')].filter(node => ['auto', 'scroll'].includes(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 1).map(node => ({ tag: node.tagName, width: node.clientWidth, content: node.scrollWidth })))
        check('About window has no horizontal scrollbar', overflow.length === 0, overflow)
      }
      if (route === '#/widgets') {
        await click(window.getByRole('button', { name: '关闭窗口', exact: true }))
        check('An empty widget window can be closed', window.isClosed())
      }
    }
    await click(stage.locator('button:has([i-solar\\:alt-arrow-up-line-duotone])').last())
    await click(stage.locator('button:has([i-solar\\:chat-line-line-duotone])'))
    let chat
    for (let i = 0; i < 80; i++) {
      chat = app.windows().find(page => page.url().endsWith('#/chat')); if (chat)
        break; await wait(250)
    }
    assert.ok(chat)
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor()
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
    await chat.waitForFunction(() => document.body.innerText.includes('小艾'))
    check('Chat import and reload preserve the same conversation', (await chat.locator('body').innerText()).includes('QA 产品回归'))
    await capture(chat, 'chat-import-persisted')
    report.rawKeyPages = report.pages.filter(page => page.rawKeys.length).map(page => ({ name: page.name, rawKeys: page.rawKeys }))
    check('All observed product pages resolve translation keys', report.rawKeyPages.length === 0, report.rawKeyPages)
    check('No renderer exceptions', report.errors.length === 0, report.errors)
    report.passed = true
  }
  catch (error) { report.failure = redact(error.message); await save(); throw new Error(report.failure) }
  finally {
    await save()
    await app.evaluate(async ({ session }) => { for (const item of [session.defaultSession]) await item.clearStorageData({ storages: ['localstorage'] }) }).catch(() => {})
    report.shutdown = await closePrivateRuntime(app, report.nativeRuntime)
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
