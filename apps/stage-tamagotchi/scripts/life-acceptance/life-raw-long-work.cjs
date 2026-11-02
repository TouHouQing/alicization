/* eslint-disable unicorn/prefer-dom-node-text-content -- Inspect rendered product text. */
const assert = require('node:assert/strict')
const { spawn, execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { renameSync, writeFileSync } = require('node:fs')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { chromium } = require('playwright')

const { runAdaptiveWorkProductChecks } = require('./adaptive-work-product-checks.cjs')
const { runDelegatedWorkProductChecks } = require('./delegated-work-product-checks.cjs')
const { launchOptions, packageIdentity } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')
const { runLongWorkProductChecks } = require('./long-work-product-checks.cjs')
const { assertAuthenticatedNativeQuit } = require('./native-quit-observation.cjs')
const { bindWindowsNativeRuntime } = require('./windows-native-launcher.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function port() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const value = server.address().port
      server.close(() => resolve(value))
    })
  })
}
function quote(value) {
  assert.ok(!/["%\r\n]/u.test(value), 'Unsafe QA command argument')
  return `"${value}"`
}
async function bounded(pending, ms, message) {
  let timer
  try {
    return await Promise.race([pending, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms)
    })])
  }
  finally { clearTimeout(timer) }
}

/** Same product task checks, controlled solely through renderer CDP and UI. */
async function main() {
  assert.equal(process.platform, 'win32')
  const hostViewport = process.env.LIFE_QA_HOST_VIEWPORT === '1'
  const delegatedWork = process.env.LIFE_PRODUCT_DELEGATED_WORK === '1'
  const adaptiveWork = process.env.LIFE_PRODUCT_ADAPTIVE_WORK === '1'
  assert.ok(!delegatedWork || !adaptiveWork, 'Choose one complete product scenario')
  if (!hostViewport)
    assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f\d]{32}$/u)
  const root = path.resolve(process.env.LIFE_RAW_LONG_WORK_ROOT || '')
  assert.ok(root.startsWith(`${path.resolve('output')}${path.sep}`))
  await fs.mkdir(root, { recursive: false })
  const configuration = JSON.parse(await fs.readFile(path.join(process.env.APPDATA, 'com.tohoqing.alicization/alicizations/llm-config.json'), 'utf8'))
  assert.ok(['openai-compatible', 'openai'].includes(configuration.activeProviderId))
  const selected = configuration.providerCredentials[configuration.activeProviderId]
  const secret = selected.apiKey
  assert.ok(typeof secret === 'string' && secret.length > 0)
  const redact = value => String(value).replaceAll(secret, '[redacted]')
  const identity = await packageIdentity()
  assert.ok(identity || hostViewport, 'The product experience requires a packaged executable or the owned host viewport')
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-regression-raw-'))
  const options = launchOptions(profile)
  delete options.env.NODE_OPTIONS
  if (hostViewport)
    options.env.LIFE_QA_HOST_VIEWPORT_RECEIPT = '1'
  const debugPort = await port()
  const channelPort = await port()
  options.args.push(`--remote-debugging-port=${debugPort}`, '--remote-debugging-address=127.0.0.1', '--host-resolver-rules=MAP localhost ~NOTFOUND')
  const compiledMainSha256 = hostViewport ? createHash('sha256').update(await fs.readFile(path.resolve('apps/stage-tamagotchi/out/main/index.js'))).digest('hex') : undefined
  const report = { format: 'life-long-work-product-v2', syntheticIdentity: true, rendererFocus: 'live2d', profile, ...identity, ...(hostViewport ? { executable: identity?.executable ?? path.resolve('apps/stage-tamagotchi/node_modules/electron/dist/electron.exe'), compiledMainSha256, developmentOnly: !identity } : {}), scope: 'Three actual model/UI twenty-one-step tasks through independent renderer CDP; no Node inspector, direct life-state writes or mocked tools', startedAt: Date.now(), checks: [], pages: [], errors: [], nativeProcessEvents: [], mainExitMessages: [], nodeInspectorObserved: false, passed: false, releaseAccepted: false }
  if (delegatedWork)
    report.scope = 'Nine actual model/UI delegated command plans: three complete, three denied/edit/review and three running cancellation; original governed adapters, renderer CDP only, no Node inspector or life-state injection'
  if (adaptiveWork)
    report.scope = 'Three actual natural-language model/UI tasks with failed reads and grounded future-step revisions; original criteria and writes retained, renderer CDP only, no Node inspector or life-state injection'
  const save = () => {
    const temporary = path.join(root, 'report.pending.json')
    writeFileSync(temporary, JSON.stringify(report, null, 2))
    renameSync(temporary, path.join(root, 'report.json'))
  }
  const check = (name, condition, detail) => {
    report.checks.push({ name, passed: Boolean(condition), detail })
    save()
    assert.ok(condition, name)
  }
  await save()
  const heartbeat = setInterval(() => {
    save()
    console.info(JSON.stringify({ qaRunning: true, elapsedSeconds: Math.round((Date.now() - report.startedAt) / 1000), checks: report.checks.length, rounds: report.longWorkExperiences?.map(round => ({ round: round.round, completed: round.completed })) ?? [] }))
  }, 30000)
  heartbeat.unref()
  const launcher = spawn([options.executablePath, ...options.args].map(quote).join(' '), [], { shell: true, env: { ...options.env, PORT: String(channelPort) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] })
  let launcherFailure
  launcher.once('error', (error) => {
    launcherFailure = error
  })
  let stdoutPending = ''
  launcher.stdout.on('data', (bytes) => {
    stdoutPending += bytes.toString()
    const lines = stdoutPending.split(/\r?\n/u)
    stdoutPending = lines.pop()
    for (const line of lines) {
      const hook = /\[bootkit\] before-quit hook (\d+) (started|completed)/u.exec(line)
      if (hook) {
        report.shutdownHookEvents ||= []
        if (report.shutdownHookEvents.length < 256)
          report.shutdownHookEvents.push({ at: Date.now(), hook: Number(hook[1]), phase: hook[2] })
      }
      if (line.includes('[app-exit]') || line.startsWith('[FileLogger]'))
        report.mainExitMessages.push(redact(line))
    }
  })
  let startupStderr = ''
  launcher.stderr.on('data', (bytes) => {
    startupStderr = `${startupStderr}${bytes.toString()}`.slice(-16000)
    report.nodeInspectorObserved ||= bytes.toString().includes('Debugger listening on ')
  })
  let observed
  let browser
  let stage
  let nativeClosed
  let nativeExitObservedAt
  const capture = async (page, name) => {
    const screenshot = path.join(root, `${String(report.pages.length).padStart(3, '0')}-${name}.png`)
    const text = redact(await page.locator('body').innerText())
    await page.screenshot({ path: screenshot, timeout: 8000 })
    report.pages.push({ name, url: page.url(), text, screenshot })
    await save()
  }
  const click = async (locator) => {
    await locator.waitFor({ state: 'visible', timeout: 10000 })
    const deadline = Date.now() + 45000
    while (!await locator.isEnabled()) {
      assert.ok(Date.now() < deadline, 'Actual UI control remained disabled')
      await wait(100)
    }
    await locator.evaluate((node) => {
      if (node.matches(':disabled') || node.getAttribute('aria-disabled') === 'true')
        throw new Error('The current control became disabled before activation')
      node.click()
    }, undefined, { timeout: 10000 })
  }
  const pageFor = async (suffix) => {
    for (let attempt = 0; attempt < 120; attempt++) {
      const page = browser.contexts()[0].pages().find(page => page.url().endsWith(suffix))
      if (page)
        return page
      await wait(250)
    }
    throw new Error(`Actual QA window unavailable: ${suffix}`)
  }
  try {
    let started
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launcherFailure)
        throw launcherFailure
      started = await fs.readFile(path.join(options.env.ALICIZATION_QA_LAUNCH_DIRECTORY, 'qa-native-started.json'), 'utf8').then(JSON.parse).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error))
      if (started)
        break
      await wait(100)
    }
    assert.ok(started)
    const native = { pid: started.payload.pid, parentPid: started.payload.launcherPid, executable: report.executable, profile }
    observed = bindWindowsNativeRuntime(native, launcher)
    report.nativeRuntime = { ...native, nativeProcessObservation: observed.proof }
    nativeClosed = new Promise(resolve => observed.process.once('exit', (code, signal) => {
      nativeExitObservedAt = Date.now()
      report.nativeProcessEvents.push({ event: 'native-exit', pid: native.pid, at: nativeExitObservedAt, code, signal })
      resolve()
    }))
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startupStderr.includes('[qa-native-error]'))
        throw new Error(redact(startupStderr))
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`, { timeout: 1000 })
        break
      }
      catch {
        assert.equal(observed.process.exitCode, null, 'Actual app exited before renderer connection')
        await wait(200)
      }
    }
    assert.ok(browser)
    const context = browser.contexts()[0]
    context.on('page', page => page.on('pageerror', error => report.errors.push(redact(error.message))))
    context.pages().forEach(page => page.on('pageerror', error => report.errors.push(redact(error.message))))
    await context.addInitScript((url) => {
      if (location.protocol === 'file:')
        localStorage.setItem('settings/connection/websocket-url', url)
    }, `ws://127.0.0.1:${channelPort}/ws`)
    for (const page of context.pages().filter(page => page.url().endsWith('#/') || page.url().endsWith('#/onboarding'))) await page.reload()
    const onboarding = await pageFor('#/onboarding')
    await onboarding.emulateMedia({ reducedMotion: 'reduce' })
    report.onboardingMotionPolicy = 'Actual reduced-motion preference; CSS timing excluded'
    const desktop = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, hostViewport ? 'assert-host-viewport.ps1' : 'assert-private-desktop.ps1'), ...(hostViewport ? [] : ['-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP]), '-RuntimePid', String(native.pid)], { encoding: 'utf8', windowsHide: true, timeout: 15000 }))
    Object.assign(report.nativeRuntime, desktop)
    if (hostViewport) {
      const viewport = JSON.parse(await fs.readFile(path.join(profile, 'qa-host-viewport.json'), 'utf8'))
      assert.equal(viewport.pid, native.pid)
      assert.equal(viewport.parentPid, native.parentPid)
      assert.equal(viewport.actualMainSha256, compiledMainSha256)
      assert.equal(viewport.format, 'host-viewport-qa-v1')
      assert.equal(viewport.isPackaged, Boolean(identity))
      assert.equal(viewport.installerId, identity ? process.env.LIFE_QA_INSTALLER_ID : null)
      assert.ok(Date.now() - viewport.observedAt < 5000)
      assert.ok(viewport.windows.length > 0 && viewport.windows.every(window => !window.focusable))
      report.nativeRuntime.hostViewport = viewport
    }
    else {
      await fs.appendFile(process.env.LIFE_QA_PROCESS_REGISTRY, `${JSON.stringify(report.nativeRuntime)}\n`)
    }
    await onboarding.getByRole('button', { name: '开始吧！', exact: true }).waitFor({ timeout: 30000 })
    await click(onboarding.getByRole('button', { name: '开始吧！', exact: true }))
    await onboarding.locator('form.persona-step input').nth(1).fill('QA 产品回归')
    await click(onboarding.locator('button[type=submit]'))
    const personaStep = title => onboarding.locator('form.persona-step').filter({ has: onboarding.getByRole('heading', { name: title, exact: true }) })
    await personaStep('你期待怎样的她').locator('textarea').fill('温柔而有主见，喜欢画画。')
    await click(personaStep('你期待怎样的她').locator('button[type=submit]'))
    await click(personaStep('让相处更合你的心意').locator('button[type=submit]'))
    await personaStep('这是她最初的样子').waitFor({ timeout: 10000 })
    await capture(onboarding, 'persona-preview')
    await click(personaStep('这是她最初的样子').getByRole('button', { name: '确认并继续', exact: true }))
    const provider = onboarding.getByRole('radio', { name: configuration.activeProviderId === 'openai-compatible' ? /^OpenAI 兼容 API/u : /^OpenAI\s+OpenAi\.com$/u })
    await provider.waitFor({ timeout: 10000 })
    assert.equal(await provider.inputValue(), configuration.activeProviderId)
    await click(provider)
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.locator('input[type=password]').fill(secret)
    await onboarding.locator('input[type=text]').fill(selected.baseUrl)
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.getByRole('button', { name: '保存并继续', exact: true }).waitFor({ timeout: 60000 })
    if (await onboarding.locator(`input[type=radio][value="${configuration.activeModelId}"]`).count() === 0)
      await onboarding.locator('input[type=search]').fill(configuration.activeModelId)
    await click(onboarding.locator(`input[type=radio][value="${configuration.activeModelId}"]`))
    await capture(onboarding, 'model-selected-awaiting-confirmation')
    await click(onboarding.getByRole('button', { name: '保存并继续', exact: true }))
    await click(onboarding.getByRole('button', { name: '去配置动作映射', exact: true }))
    const settings = await pageFor('#/settings/models')
    await settings.getByRole('button', { name: '返回上一级', exact: true }).waitFor({ timeout: 30000 })
    await capture(settings, 'actual-cold-settings')
    await click(settings.getByRole('button', { name: '返回上一级', exact: true }))
    stage = await pageFor('#/')
    for (let attempt = 0; attempt < 150; attempt++) {
      report.live2dStartup = await sampleLive2D(stage)
      if (report.live2dStartup.models.length === 1 && report.live2dStartup.models[0].drawFrame?.frame > 0)
        break
      await wait(200)
    }
    check('The actual Live2D model draws before long-task admission', report.live2dStartup.models.length === 1 && report.live2dStartup.models[0].drawFrame?.frame > 0)
    await click(stage.locator('button:has([i-solar\\:alt-arrow-up-line-duotone])').last())
    await click(stage.locator('button:has([i-solar\\:chat-line-line-duotone])'))
    const chat = await pageFor('#/chat')
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 30000 })
    await (adaptiveWork ? runAdaptiveWorkProductChecks : delegatedWork ? runDelegatedWorkProductChecks : runLongWorkProductChecks)({ stage, settings, chat, root, report, capture, check })
    check('No renderer exceptions occurred', report.errors.length === 0, report.errors)
    check('No Node inspector was opened', !report.nodeInspectorObserved)
    report.passed = true
  }
  catch (error) {
    report.failure = redact(error.message)
    report.stderrDiagnostic = redact(startupStderr)
    report.passed = false
    process.exitCode = 1
    const failedPage = browser?.contexts()[0]?.pages().find(page => page.url().endsWith('#/onboarding'))
    if (failedPage) {
      try {
        report.failureWindow = { url: failedPage.url(), text: redact(await failedPage.locator('body').innerText({ timeout: 2000 })) }
        await capture(failedPage, 'failed-onboarding')
      }
      catch (captureError) { report.failureCapture = redact(captureError.message) }
    }
  }
  finally {
    clearInterval(heartbeat)
    await save()
    try {
      assert.ok(observed && observed.process.exitCode === null)
      stage ||= browser?.contexts()[0]?.pages().find(page => page.url().endsWith('#/'))
      assert.ok(stage, 'The actual stage must provide its own close control')
      const close = stage.getByRole('button', { name: '关闭', exact: true })
      if (!await close.isVisible())
        await click(stage.getByRole('button', { name: '展开', exact: true }))
      await close.waitFor({ timeout: 10000 })
      const requestedAt = Date.now()
      await click(close).catch((error) => {
        if (!/closed/iu.test(error.message))
          throw error
      })
      await bounded(nativeClosed, 60000, 'Actual native UI shutdown exceeded its budget')
      report.shutdown = { completed: true, elapsedMs: Date.now() - requestedAt, exitCode: observed.process.exitCode, nativeExitObservedAt, nativeProcessObservation: observed.proof, fileFlushObserved: report.mainExitMessages.some(line => line.startsWith('[FileLogger] Session log file:')), windowTeardownObserved: report.mainExitMessages.some(line => line.includes('[app-exit] Desktop windows closed; exiting')) }
      assertAuthenticatedNativeQuit(report.shutdown)
    }
    catch (error) {
      report.passed = false
      report.failure ||= redact(error.message)
      report.shutdown = { ...report.shutdown, completed: false, failure: redact(error.message) }
      process.exitCode = 1
      if (observed && observed.process.exitCode === null && observed.process.signalCode === null) {
        observed.process.kill('SIGKILL')
        await bounded(nativeClosed, 15000, 'Owned cleanup did not confirm native exit').catch(() => {})
        report.shutdown.forcedQaCleanup = true
      }
    }
    try {
      if (!observed || (observed.process.exitCode === null && observed.process.signalCode === null))
        throw new Error('Exact native closure is unconfirmed; live credential storage was retained')
      const configFile = path.join(profile, 'alicizations/llm-config.json')
      const config = JSON.parse(await fs.readFile(configFile, 'utf8').catch(error => error.code === 'ENOENT' ? '{}' : Promise.reject(error)))
      config.providerCredentials = {}
      await fs.mkdir(path.dirname(configFile), { recursive: true })
      await fs.writeFile(configFile, JSON.stringify(config))
      assert.equal(path.dirname(await fs.realpath(profile)).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
      await fs.rm(path.join(profile, 'Local Storage'), { recursive: true, force: true })
      report.credentialsRemoved = true
    }
    catch (error) {
      report.credentialsRemoved = false
      report.credentialCleanupFailure = redact(error.message)
      report.passed = false
      process.exitCode = 1
    }
    if (!observed) {
      // Let the private Job close this exact failed launch; no PID is guessed.
      launcher.kill('SIGKILL')
      for (const stream of launcher.stdio) stream?.destroy?.()
      launcher.unref()
    }
    observed?.dispose()
    await browser?.close().catch(() => {})
    report.finishedAt = Date.now()
    await save()
  }
  if (report.passed) {
    try {
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, adaptiveWork ? 'adaptive-work-inspection.ts' : delegatedWork ? 'delegated-work-inspection.ts' : 'long-work-inspection.ts'), profile, root], { windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.longWorkInspection = JSON.parse(await fs.readFile(path.join(root, adaptiveWork ? 'adaptive-work-after-shutdown.json' : delegatedWork ? 'delegated-work-after-shutdown.json' : 'long-work-after-shutdown.json'), 'utf8'))
      assert.equal(report.longWorkInspection.passed, true)
    }
    catch (error) {
      report.passed = false
      report.failure = `Read-only long-work inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
    finally { await save() }
  }
  console.info(JSON.stringify({ root, passed: report.passed, checks: report.checks.length, pages: report.pages.length, failure: report.failure }))
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
