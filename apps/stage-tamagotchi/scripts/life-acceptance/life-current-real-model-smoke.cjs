const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions } = require('./electron-launch.cjs')

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-real-'))
  if (process.env.LIFE_QA_READY_SOURCE) {
    const ready = path.resolve(process.env.LIFE_QA_READY_SOURCE)
    assert.ok(/^alicization-life-(?:real|persona)-/u.test(path.basename(ready)))
    await fs.cp(path.join(ready, 'alicizations', 'cards'), path.join(profile, 'alicizations', 'cards'), { recursive: true })
  }
  const voiceQa = process.env.LIFE_QA_VOICE === '1' ? await require('./life-current-speech-qa.cjs').startSpeechQa(profile) : null
  const collapsedCheck = Boolean(voiceQa && process.env.LIFE_QA_COLLAPSED_CHECK === '1')
  const readSpeech = () => JSON.parse(execFileSync(process.env.LIFE_QA_PYTHON || 'python', [path.join(__dirname, 'read-life-current-speech.py'), profile], { encoding: 'utf8' }))
  const source = path.join(process.env.APPDATA, 'com.tohoqing.alicization', 'alicizations', 'llm-config.json')
  const config = JSON.parse(await fs.readFile(source, 'utf8'))
  assert.ok(config.activeProviderId && config.activeModelId)
  await fs.mkdir(path.join(profile, 'alicizations'), { recursive: true })
  const configPath = path.join(profile, 'alicizations', 'llm-config.json')
  let app
  try {
    await fs.writeFile(configPath, JSON.stringify({ activeProviderId: config.activeProviderId, activeModelId: config.activeModelId, providerCredentials: { [config.activeProviderId]: config.providerCredentials?.[config.activeProviderId] ?? {}, ...(voiceQa ? { 'openai-compatible-audio-speech': { baseUrl: voiceQa.url, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' } } : {}) } }))
    const seeded = execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'apps/stage-tamagotchi/scripts/life-qa-seed.ts', profile, String(Date.now())], { encoding: 'utf8' })
    console.info(JSON.stringify({ profile, seeded: JSON.parse(seeded.trim()).seeded, usesConfiguredModel: true }))
    app = await _electron.launch(launchOptions(profile))
    console.info(JSON.stringify(await app.evaluate(({ powerMonitor, BrowserWindow }) => ({ systemIdleState: powerMonitor.getSystemIdleState(60), idleSeconds: powerMonitor.getSystemIdleTime(), windows: BrowserWindow.getAllWindows().map(window => ({ role: window.webContents.getURL().split('#')[1], visible: window.isVisible(), minimized: window.isMinimized() })) }))))
    await new Promise(resolve => setTimeout(resolve, 5000))
    let page
    for (let attempt = 0; attempt < 100; attempt++) {
      page = app.windows().find(page => page.url().endsWith('#/onboarding') || (process.env.LIFE_QA_READY_SOURCE && page.url().endsWith('#/')))
      if (page)
        break
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    assert.ok(page)
    page.setDefaultTimeout(45000)
    console.info(JSON.stringify({ initialButtons: await page.getByRole('button').allTextContents(), personaForms: await page.locator('form.persona-step').count() }))
    const needsGenesis = await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-epoch1').needsGenesis)
    if (needsGenesis) {
      if (await page.locator('form.persona-step').count() === 0)
        await page.getByRole('button').last().click()
      await page.locator('form.persona-step input').first().fill('QA 小澄')
      await page.locator('form.persona-step input').nth(1).fill('QA 朋友')
      await page.locator('form.persona-step button[type=submit]').click()
      await page.locator('form.persona-step textarea').first().fill('温柔、好奇，诚实说明事实和未知。')
      await page.locator('form.persona-step button[type=submit]').click()
      await page.locator('form.persona-step button[type=submit]').click()
      await page.locator('form.persona-step textarea').first().waitFor()
      await page.locator('form.persona-step button[type=submit]').click()
      await page.waitForFunction(() => !document.querySelector('form.persona-step'))
    }
    await app.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (window.webContents.getURL().endsWith('#/onboarding'))
          window.hide()
      }
    })
    const stage = app.windows().find(page => page.url().endsWith('#/'))
    assert.ok(stage)
    await stage.waitForLoadState('domcontentloaded')
    await new Promise(resolve => setTimeout(resolve, 2500))
    await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true', {}, { timeout: 45000 })
    console.info(JSON.stringify(await stage.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__
      const seen = new Set()
      const entries = []
      const scan = (node) => {
        if (!node || typeof node !== 'object' || seen.has(node))
          return
        seen.add(node)
        if (node.type && node.subTree)
          entries.push({ name: node.type.__name ?? node.type.name, exposed: Object.keys(node.exposed ?? {}) })
        scan(node.component)
        scan(node.subTree)
        if (Array.isArray(node.children))
          node.children.forEach(scan)
      }
      scan(app._instance ?? app._container._vnode.component)
      return { canvas: document.querySelectorAll('canvas').length, stageComponents: entries.filter(item => item.name?.includes('Stage')), paused: app.config.globalProperties.$pinia._s.get('stageWindowLifecycle')?.stagePaused }
    })))
    if (voiceQa) {
      await stage.evaluate((url) => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        pinia._s.get('providers').providers['openai-compatible-audio-speech'] = { baseUrl: url, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' }
        const speech = pinia._s.get('speech')
        speech.activeSpeechProvider = 'openai-compatible-audio-speech'
        speech.activeSpeechModel = 'qa-sapi'
        speech.activeSpeechVoiceId = 'qa-sapi'
        speech.ssmlEnabled = false
        window.__lifeQaMouthMax = 0
        window.__lifeQaMouthTimer = setInterval(() => {
          window.__lifeQaMouthMax = Math.max(window.__lifeQaMouthMax, pinia._s.get('character-speaking')?.mouthOpenSize ?? 0)
        }, 20)
        window.__lifeQaDispatch = { started: 0, ended: 0, failed: 0, error: null }
        const dispatcher = pinia._s.get('alicization-presence-dispatcher')
        const original = dispatcher.dispatchDialogueResponded
        dispatcher.dispatchDialogueResponded = async (payload) => {
          window.__lifeQaDispatch.started++
          try {
            await original(payload)
            window.__lifeQaDispatch.ended++
          }
          catch (error) {
            window.__lifeQaDispatch.failed++
            window.__lifeQaDispatch.error = `${error.name}:${String(error.message).replace(/https?:\/\/\S+/g, '[url]').slice(0, 160)}`
            throw error
          }
        }
      }, voiceQa.url)
    }
    await stage.locator('button').filter({ has: stage.locator('[i-solar\\:settings-minimalistic-outline]') }).last().click()
    await new Promise(resolve => setTimeout(resolve, 1000))
    const settings = app.windows().find(page => page.url().includes('#/settings'))
    assert.ok(settings)
    settings.setDefaultTimeout(20000)
    await settings.waitForLoadState('domcontentloaded')
    await new Promise(resolve => setTimeout(resolve, 1500))
    await settings.evaluate(async () => {
      const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router
      await router.isReady()
      await router.push('/settings/life')
    })
    await settings.getByRole('button', { name: '查看原始输入', exact: true }).click()
    console.info(JSON.stringify({ nativeLifecycle: await app.evaluate(({ powerMonitor, BrowserWindow }) => ({ systemIdleState: powerMonitor.getSystemIdleState(60), windows: BrowserWindow.getAllWindows().map(window => ({ role: window.webContents.getURL().split('#')[1], visible: window.isVisible(), minimized: window.isMinimized() })) })), stageLifecycle: await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').windowLifecycle) }))
    if (voiceQa) {
      await stage.evaluate(async (url) => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        const providers = pinia._s.get('providers')
        providers.providers['openai-compatible-audio-speech'] = { baseUrl: url, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' }
        providers.forceProviderConfigured('openai-compatible-audio-speech')
        await new Promise(resolve => setTimeout(resolve, 300))
        const speech = pinia._s.get('speech')
        speech.activeSpeechProvider = 'openai-compatible-audio-speech'
        speech.activeSpeechModel = 'qa-sapi'
        speech.activeSpeechVoiceId = 'qa-sapi'
        speech.ssmlEnabled = false
      }, voiceQa.url)
    }
    console.info(JSON.stringify({ reviewed: true, continuationButtons: await settings.getByRole('button', { name: '继续处理', exact: true }).count() }))
    if (voiceQa) {
      await app.evaluate(({ BrowserWindow }) => {
        for (const window of BrowserWindow.getAllWindows()) {
          if (window.webContents.getURL().endsWith('#/')) {
            if (window.isMinimized())
              window.restore()
            window.show()
            window.focus()
          }
        }
      })
      await stage.waitForFunction(() => !document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('stageWindowLifecycle').stagePaused)
      await stage.evaluate(() => {
        const button = document.createElement('button')
        button.id = 'life-qa-audio-start'
        button.textContent = 'QA 音频验收'
        button.style.cssText = 'position:fixed;left:20px;top:20px;z-index:2147483647'
        button.onclick = () => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('audio-context').audioContext.resume()
        document.body.append(button)
      })
      await stage.locator('#life-qa-audio-start').click()
    }
    await settings.getByRole('button', { name: '继续处理', exact: true }).click()
    await settings.waitForFunction(() => document.querySelector('[role=status]')?.textContent.includes('新的请求') || document.querySelector('[role=alert]'), {}, { timeout: 45000 })
    const alerts = await settings.locator('[role=alert]').allTextContents()
    if (alerts.length) {
      console.info(JSON.stringify({ resumeRejected: true, admissionMismatch: alerts.some(text => text.includes('identifier') || text.includes('identity') || text.includes('input')), configurationFailure: alerts.some(text => text.includes('model') || text.includes('config')) }))
      throw new Error('Native continuation reported an error; inspect the isolated recovery state')
    }
    if (collapsedCheck) {
      // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Inspect the actually displayed reply before using its real controls.
      await stage.waitForFunction(() => document.body.innerText.includes('QA-你好'), {}, { timeout: 90000 })
      let observedAudio = false
      let textReceiptCount = 0
      for (let attempt = 0; attempt < 120; attempt++) {
        const evidence = readSpeech()
        if (evidence.textPresented && evidence.receipts.some(row => row[0] === 'audio-progress' && row[2] > 100)) {
          textReceiptCount = evidence.textReceiptCount
          observedAudio = true
          break
        }
        await new Promise(resolve => setTimeout(resolve, 250))
      }
      assert.ok(observedAudio)
      await stage.getByRole('button', { name: '收起对白窗', exact: true }).click()
      // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- A collapsed icon must hide the actual reply.
      await stage.waitForFunction(() => !document.body.innerText.includes('QA-你好'))
      await new Promise(resolve => setTimeout(resolve, 300))
      assert.equal(readSpeech().textReceiptCount, textReceiptCount, 'Collapsing the dialogue must not issue another text presentation receipt')
      await stage.locator('.stage-dialogue-panel__orb').click()
      console.info(JSON.stringify({ noExtraTextReceiptWhileCollapsed: true, actualCollapseAndExpandControls: true }))
    }
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Presentation proof must ignore hidden text.
    const observed = await stage.waitForFunction(() => document.body.innerText.includes('QA-你好'), {}, { timeout: 90000 })
    assert.ok(observed)
    await new Promise(resolve => setTimeout(resolve, process.env.LIFE_QA_INTERRUPT === '1' ? 0 : 4000))
    let speechEvidence = null
    if (voiceQa) {
      let cancelled = false
      for (let attempt = 0; attempt < 120; attempt++) {
        speechEvidence = readSpeech()
        if (process.env.LIFE_QA_INTERRUPT === '1' && !cancelled && speechEvidence.receipts.some(row => row[0] === 'audio-progress' && row[2] > 100)) {
          await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('speech-runtime').cancelOwner('default', 'qa-user-interruption'))
          cancelled = true
        }
        if (speechEvidence.textPresented && (process.env.LIFE_QA_INTERRUPT === '1' ? speechEvidence.interrupted : speechEvidence.completed))
          break
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      const mouthMax = await stage.evaluate(() => window.__lifeQaMouthMax)
      console.info(JSON.stringify({ speechEvidence, mouthMax, ...voiceQa.summary() }))
      assert.ok(speechEvidence.textPresented, 'Actual visible-text presentation receipt is required')
      if (process.env.LIFE_QA_INTERRUPT === '1') {
        assert.ok(speechEvidence.interrupted, 'Actual partial-playback interruption receipt is required')
        assert.equal(speechEvidence.completed, false)
      }
      else {
        assert.ok(speechEvidence.completed, 'Actual utterance completion receipt is required')
      }
      assert.ok(mouthMax > 0, 'Actual stage mouth motion is required')
      speechEvidence.mouthMax = mouthMax
    }
    await stage.waitForFunction(() => JSON.parse(localStorage.getItem('alicization/life-expression-outbox-v1') || '[]').length === 0, {}, { timeout: 15000 })
    await stage.screenshot({ path: 'output/playwright/life-current-real-recovery-stage.png' })
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Record text that the stage can actually present.
    const result = { profile, usesConfiguredModel: true, reviewedInputContinued: true, realReplyVisible: true, noExtraTextReceiptWhileCollapsed: collapsedCheck, speechEvidence, stageContainsQaGreeting: await stage.locator('body').innerText().then(text => text.includes('QA-你好')), alerts: await settings.locator('[role=alert]').count() }
    await fs.writeFile(process.env.LIFE_QA_INTERRUPT === '1' ? 'output/playwright/life-current-real-model-interruption-result.json' : 'output/playwright/life-current-real-model-result.json', JSON.stringify(result, null, 2))
    console.info(JSON.stringify(result))
  }
  finally {
    await fs.unlink(configPath).catch(() => {
    })
    const stage = app?.windows().find(page => page.url().endsWith('#/'))
    if (stage) {
      console.info(JSON.stringify(await stage.evaluate(() => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        const chat = pinia._s.get('chat-session')
        const walk = (node) => {
          if (!node)
            return null
          if (node.exposed?.speechActivity)
            return node.exposed.speechActivity.value
          let result = walk(node.subTree?.component)
          if (result)
            return result
          for (const child of node.subTree?.children ?? []) {
            if (child?.component && (result = walk(child.component)))
              return result
          }
          return null
        }
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Visibility diagnostics must ignore hidden text.
        return { activeSession: chat?.activeSessionId, messageCount: chat?.messages?.length, bodyHasQa: document.body.innerText.includes('QA-你好'), outboxCount: JSON.parse(localStorage.getItem('alicization/life-expression-outbox-v1') || '[]').length, dispatch: window.__lifeQaDispatch, speechProvider: pinia._s.get('speech')?.activeSpeechProvider, mouthMax: window.__lifeQaMouthMax, speechActivity: walk(document.querySelector('#app').__vue_app__._instance) }
      }).catch(() => ({ diagnosticsUnavailable: true }))))
    }
    if (voiceQa)
      console.info(JSON.stringify(voiceQa.summary()))
    if (stage) {
      console.info(JSON.stringify(await stage.evaluate(() => {
        const app = document.querySelector('#app').__vue_app__
        const seen = new Set()
        let activity = null
        const scan = (node) => {
          if (!node || typeof node !== 'object' || seen.has(node))
            return
          seen.add(node)
          if (node.exposed?.speechActivity)
            activity = node.exposed.speechActivity.value
          scan(node.component)
          scan(node.subTree)
          if (Array.isArray(node.children))
            node.children.forEach(scan)
        }
        scan(app._instance ?? app._container._vnode.component)
        return { speechActivity: activity, paused: app.config.globalProperties.$pinia._s.get('stageWindowLifecycle')?.stagePaused }
      }).catch(() => ({ speechActivityUnavailable: true }))))
    }
    if (stage) {
      await stage.screenshot({ path: 'output/playwright/life-current-real-voice-debug.png' }).catch(() => {
      })
    }
    const ownedProcess = app?.process()
    let closeTimer
    try {
      if (app) {
        await Promise.race([app.close(), new Promise((resolve) => {
          closeTimer = setTimeout(() => {
            ownedProcess.kill()
            resolve()
          }, 10000)
        })])
      }
    }
    finally {
      clearTimeout(closeTimer)
      if (voiceQa)
        await voiceQa.close()
    }
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
