/* eslint-disable unicorn/prefer-dom-node-text-content -- Check visible product messages. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const { observeLive2DExpression, readLive2DExpression } = require('./live2d-expression-observer.cjs')

/** Actual UI, provider, audio graph and final Cubism draw; no reply/cue injection. */
exports.runConversationDeliveryProductChecks = async function ({ app, stage, chat, report, capture, check, voiceUrl, voiceSummary, root }) {
  report.scope = 'real-provider-chat-stream-and-muted-Live2D-conversation-delivery'
  report.expressionObservation = await observeLive2DExpression(stage)
  await app.evaluate(({ app, BrowserWindow }) => {
    const configure = (window) => {
      window.webContents.setAudioMuted(true)
      window.webContents.setBackgroundThrottling(false)
    }
    BrowserWindow.getAllWindows().forEach(configure)
    app.on('browser-window-created', (_event, window) => configure(window))
  })
  report.audioOutputMuted = true
  await stage.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const delivery = pinia._s.get('conversation-delivery')
    window.__deliveryQa = { states: [] }
    delivery.$subscribe(() => {
      const states = Object.values(delivery.states)
      const state = states.at(-1)
      if (state && window.__deliveryQa.states.length < 10000)
        window.__deliveryQa.states.push({ ...state, wallAt: Date.now() })
    }, { flush: 'sync' })
  })
  await chat.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    window.__deliveryDomQa = []
    const observer = new MutationObserver(() => {
      const stream = pinia._s.get('chat-stream')?.streamingMessage
      if (!stream?.content || window.__deliveryDomQa.length >= 4000)
        return
      const rows = [...document.querySelectorAll('[data-chat-message-role="assistant"]')].filter(node => node.dataset.chatMessageId === stream.id)
      const previous = window.__deliveryDomQa.at(-1)
      if (previous?.content !== stream.content || previous?.bubbles !== rows.length)
        window.__deliveryDomQa.push({ at: Date.now(), id: stream.id, content: stream.content, bubbles: rows.length, rendered: rows[0]?.innerText })
    })
    observer.observe(document.body, { childList: true, characterData: true, subtree: true })
  })
  const current = turnId => stage.evaluate(turnId => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).find(state => state.turnId === turnId), turnId)
  async function phase(label) {
    await stage.evaluate((label) => {
      window.__live2dExpressionObservation.phase = label
    }, label)
  }
  async function send(prompt, label) {
    await phase(label)
    const known = await stage.evaluate(() => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).map(state => state.epoch))
    await chat.locator('textarea').fill(prompt)
    await chat.getByRole('button', { name: '发送消息', exact: true }).click()
    await stage.waitForFunction(known => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).some(state => !known.includes(state.epoch)), known, { timeout: 30000 })
    return stage.evaluate(known => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).find(state => !known.includes(state.epoch)), known)
  }
  async function textEnded() {
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ state: 'visible', timeout: 180000 })
    return chat.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const session = pinia._s.get('chat-session')
      const message = session.getSessionMessages(session.activeSessionId).filter(message => message.role === 'assistant').at(-1)
      return { id: message.id, content: message.content, speechDelivery: message.speechDelivery }
    })
  }
  async function terminal(turn) {
    await stage.waitForFunction(turn => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).some(state => state.epoch === turn.epoch && ['completed', 'interrupted', 'failed'].includes(state.phase)), turn, { timeout: 120000 })
    return current(turn.turnId)
  }
  async function configureVoice(baseUrl) {
    const assets = path.resolve('apps/stage-tamagotchi/out/renderer/assets')
    const file = (await fs.readdir(assets)).find(file => /^alicization-bridge-.*\.js$/u.test(file))
    const alias = /getAlicizationBridge as (\w+)/u.exec(await fs.readFile(path.join(assets, file), 'utf8'))?.[1]
    assert.ok(alias)
    await stage.evaluate(async ({ file, alias, baseUrl }) => {
      const module = await import(new URL(`./assets/${file}`, location.href).href)
      const bridge = module[alias]()
      const config = await bridge.getLlmConfig()
      await bridge.syncLlmConfig({ ...config, providerCredentials: { ...config.providerCredentials, 'openai-compatible-audio-speech': { baseUrl, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' } } })
    }, { file, alias, baseUrl })
    for (const page of [stage, chat]) {
      await page.evaluate((baseUrl) => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        const providers = pinia._s.get('providers')
        providers.providers['openai-compatible-audio-speech'] = { baseUrl, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' }
        providers.forceProviderConfigured('openai-compatible-audio-speech')
        const speech = pinia._s.get('speech')
        speech.activeSpeechProvider = 'openai-compatible-audio-speech'
        speech.activeSpeechModel = 'qa-sapi'
        speech.activeSpeechVoiceId = 'qa-sapi'
        speech.ssmlEnabled = false
        speech.autoReadEnabled = true
      }, baseUrl)
    }
    await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('audio-context').audioContext.resume())
  }
  const first = await send('请只原样回复这些字，不加其它内容：今天画画很开心，明天一起继续吧。', 'delivery-silent')
  const firstText = await textEnded()
  await terminal(first)
  const firstRead = await chat.evaluate(turn => window.__deliveryDomQa.find(record => record.id === turn.id && record.content === turn.content), firstText)
  const firstComplete = await stage.evaluate(epoch => window.__deliveryQa.states.find(state => state.epoch === epoch && state.phase === 'completed'), first.epoch)
  check('Text completes before independent silent articulation', firstText.content.length > 5 && firstRead && firstComplete && firstRead.at < firstComplete.wallAt, { firstRead, firstComplete })
  const silentFrames = (await readLive2DExpression(stage)).filter(frame => frame.phase === 'delivery-silent' && frame.textArticulation)
  check('Actual Live2D draw uses independent silent mouth without an acoustic source', silentFrames.some(frame => frame.textArticulation.script === 'pinyin' && frame.values.ParamMouthOpenY > 0.05) && silentFrames.every(frame => !frame.speech.active), { frames: silentFrames.length })
  await configureVoice(voiceUrl)
  await app.evaluate(async () => {
    const item = globalThis.productQaMenu.items.find(item => item.label.startsWith('打开字幕'))
    if (!item)
      throw new Error('Actual caption menu is unavailable')
    await item.click(item)
  })
  let caption
  for (let attempt = 0; attempt < 80; attempt++) {
    caption = app.windows().find(page => page.url().endsWith('#/caption'))
    if (caption)
      break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(caption)
  const spoken = await send('请只原样回复这些字，不加其它内容：窗外的雨声很轻，我们慢慢说话。', 'delivery-voice')
  await stage.waitForFunction(turn => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).some(state => state.epoch === turn.epoch && state.phase === 'speaking' && state.playedMs > 50), spoken, { timeout: 45000 })
  await chat.locator('[data-speaking-range]').last().waitFor()
  await caption.waitForFunction(() => document.body.innerText.includes('窗外'), undefined, { timeout: 15000 })
  check('The separate native caption window receives actual playback text', true)
  await capture(caption, 'conversation-native-caption')
  await capture(chat, 'conversation-text-ahead-of-voice')
  await capture(stage, 'conversation-live2d-audio-mouth')
  const spokenText = await textEnded()
  const spokenEnd = await terminal(spoken)
  const voiceRead = await chat.evaluate(turn => window.__deliveryDomQa.find(record => record.id === turn.id && record.content === turn.content), spokenText)
  const voiceComplete = await stage.evaluate(epoch => window.__deliveryQa.states.find(state => state.epoch === epoch && state.phase === 'completed'), spoken.epoch)
  check('Reading is complete while its single voice remains pending or playing', voiceRead && voiceComplete && voiceRead.at < voiceComplete.wallAt, { voiceRead, voiceComplete })
  check('One actual voice confirms only completed source phrases', spokenEnd.phase === 'completed' && spokenEnd.spokenEnd === spokenText.content.length && spokenEnd.playedMs > 1000, spokenEnd)
  const voiceFrames = (await readLive2DExpression(stage)).filter(frame => frame.phase === 'delivery-voice')
  check('Real playback drives Live2D audio-clock mouth and dynamic aperture', voiceFrames.some(frame => frame.actualAudio && frame.textArticulation?.clock === 'audio' && frame.values.ParamMouthOpenY > 0.03), { audioFrames: voiceFrames.filter(frame => frame.actualAudio).length, mouthFrames: voiceFrames.filter(frame => frame.textArticulation?.clock === 'audio').length })
  const row = chat.locator('[data-chat-message-role="assistant"]').filter({ has: chat.getByRole('button', { name: '朗读全文', exact: true }) }).last()
  await phase('delivery-read-full')
  await row.getByRole('button', { name: '朗读全文', exact: true }).click()
  await stage.waitForFunction(epoch => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).some(state => state.turnId === epoch.turnId && state.epoch !== epoch.epoch), spoken, { timeout: 15000 })
  const full = await current(spoken.turnId)
  check('Full reading creates a new playback epoch on the existing message', full.epoch !== spoken.epoch && await row.count() <= 1, full)
  await stage.waitForFunction(turn => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).some(state => state.epoch === turn.epoch && state.playedMs > 100), full, { timeout: 45000 })
  const stopAt = Date.now()
  await chat.getByRole('button', { name: '停止表达', exact: true }).last().click()
  const stopped = await terminal(full)
  await stage.waitForFunction(() => {
    const frame = window.__live2dExpressionObservation.frames.at(-1)
    return frame && !frame.textArticulation && !frame.speech.active
  }, undefined, { timeout: 10000 })
  check('Chat-window stop promptly cancels host audio and Live2D expression', stopped.phase === 'interrupted' && stopped.spokenEnd === null && Date.now() - stopAt < 2000, { ...stopped, stoppedAfterMs: Date.now() - stopAt })
  const long = await send('请用约三百字描述一个安静的雨天绘画的下午，每句话二十个字以内。只写景色，不列点、不写计划或任务承诺。', 'delivery-long')
  const longText = await textEnded()
  check('Long text remains fully available while automatic speech is bounded', longText.content.length > 160 && (await current(long.turnId)).partial === true, { characters: longText.content.length, state: await current(long.turnId) })
  const longEnd = await terminal(long)
  check('Automatic excerpt does not claim the entire reply was heard', longEnd.phase === 'completed' && longEnd.partial && longEnd.spokenEnd < longText.content.length, longEnd)
  const beforeCode = voiceSummary().utterances.length
  const code = await send('请只原样回复下面内容，不加解释：\n计算如下。\n```ts\nconst total_sum = a * b;\n```\n结果可以在正文查看。', 'delivery-code')
  const codeText = await textEnded()
  await terminal(code)
  check('Automatic voice leaves code in the reading message', codeText.content.includes('total_sum') && voiceSummary().utterances.slice(beforeCode).every(item => !item.text.includes('total_sum')), { content: codeText.content })
  const beforeFullCode = voiceSummary().utterances.length
  await chat.locator('[data-chat-message-role="assistant"]').last().getByRole('button', { name: '朗读全文', exact: true }).click()
  await stage.waitForFunction(turn => Object.values(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('conversation-delivery').states).some(state => state.turnId === turn.turnId && state.epoch !== turn.epoch), code, { timeout: 15000 })
  await terminal(await current(code.turnId))
  check('Explicit full reading preserves code operators and variable names', voiceSummary().utterances.slice(beforeFullCode).some(item => item.text.includes('total_sum = a * b')), voiceSummary().utterances.slice(beforeFullCode))
  await configureVoice(`${voiceUrl}unavailable/`)
  const failed = await send('请只回复：我在这里。', 'delivery-audio-failure')
  const failedText = await textEnded()
  const failedEnd = await terminal(failed)
  check('Synthesis failure retains text and terminates the voice projection', failedText.content.length > 0 && failedEnd.phase === 'failed' && failedEnd.spokenEnd === null, failedEnd)
  await configureVoice(voiceUrl)
  const recovered = await send('请只回复：我们慢慢来。', 'delivery-after-failure')
  await textEnded()
  const recoveredEnd = await terminal(recovered)
  check('A new turn recovers without replaying failed audio or old mouth', recoveredEnd.phase === 'completed' && recoveredEnd.playedMs > 0, recoveredEnd)
  await stage.waitForFunction(() => JSON.parse(localStorage.getItem('alicization/life-expression-outbox-v1') ?? '[]').length === 0, undefined, { timeout: 15000 })
  check('Every actual playback observation is accepted before shutdown', true)
  report.conversationDelivery = await stage.evaluate(() => window.__deliveryQa)
  report.conversationDom = await chat.evaluate(() => window.__deliveryDomQa)
  check('Each live reply occupies one visible chat message throughout streaming', report.conversationDom.length > 0 && report.conversationDom.every(record => record.bubbles === 1), { observations: report.conversationDom.length })
  report.conversationMessages = await chat.evaluate(() => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('chat-session')
    return store.getSessionMessages(store.activeSessionId).filter(message => message.role === 'assistant').map(message => ({ id: message.id, content: message.content, speechDelivery: message.speechDelivery }))
  })
  report.expressionFrames = await readLive2DExpression(stage)
  report.passed = report.checks.every(item => item.passed) && report.errors.length === 0
  await fs.writeFile(path.join(root, 'conversation-delivery.json'), JSON.stringify({ passed: report.passed, checks: report.checks, states: report.conversationDelivery, dom: report.conversationDom, messages: report.conversationMessages }, null, 2))
}
