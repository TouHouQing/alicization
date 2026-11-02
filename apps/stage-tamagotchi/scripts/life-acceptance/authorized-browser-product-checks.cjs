const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const { existsSync } = require('node:fs')
const fs = require('node:fs/promises')
const { createServer } = require('node:http')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { chromium } = require('playwright')

const { isOwnedHostViewport } = require('./electron-launch.cjs')
const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

async function approveBrowser(pages, expected, originalPage) {
  for (const page of pages) {
    const dialog = page.getByRole('dialog', { name: '确认这次操作', exact: true })
    if (!await dialog.isVisible())
      continue
    const value = await originalPage.getByLabel('QA 浏览器留言', { exact: true }).inputValue()
    const result = await dialog.evaluate((element, allowed) => {
      const seen = new Set()
      function find(node) {
        if (!node || typeof node !== 'object' || seen.has(node))
          return null
        seen.add(node)
        const instance = node.component || node
        if (instance.props && Object.hasOwn(instance.props, 'request') && Object.hasOwn(instance.props, 'resolving'))
          return instance
        for (const child of [node.component, node.subTree, node.suspense?.activeBranch, node.ssContent, ...(Array.isArray(node.children) ? node.children : [])]) {
          const found = find(child)
          if (found)
            return found
        }
        return null
      }
      const app = document.querySelector('#app').__vue_app__
      const modal = find(app._instance ?? app._container._vnode.component)
      const request = modal?.props.request
      if (!request || modal.props.resolving || request.requestId !== element.dataset.permissionRequestId)
        return { stale: true }
      const typing = request.toolName === 'browser_type_text'
      const clicking = request.toolName === 'browser_click_element'
      const preview = request.interfacePreview
      const matches = request.cardId === 'default' && request.serverName === 'local-interface'
        && (!allowed.onlyOperation || request.toolName === allowed.onlyOperation)
        && request.resourcePath === allowed.destination && request.actionCategory === 'network'
        && request.supportsRememberSession === false
        && (typing ? request.resourceLabel.includes('QA 浏览器留言') && preview?.text === allowed.marker && preview.sha256 === allowed.hash && preview.byteLength === allowed.bytes && element.querySelector('[data-interface-input-preview]')?.textContent === allowed.marker : clicking && request.resourceLabel.includes('保存留言') && allowed.currentValue === allowed.marker && preview?.text.includes(`QA 浏览器留言: ${allowed.marker}`) && element.querySelector('[data-interface-input-preview]')?.textContent.includes(`QA 浏览器留言: ${allowed.marker}`))
      if (!matches)
        return { failed: true, operation: request.toolName, target: request.resourcePath }
      const button = [...element.querySelectorAll('button')].find(button => button.textContent.trim() === (allowed.deny ? '拒绝' : '允许') && !button.disabled && button.getClientRects().length)
      if (!button || button.dataset.permissionRequestId !== request.requestId || button.dataset.permissionToken !== request.token)
        return { stale: true }
      button.click()
      return { approved: !allowed.deny, denied: Boolean(allowed.deny), operation: request.toolName, contentBound: typing }
    }, { ...expected, currentValue: value, bytes: Buffer.byteLength(expected.marker, 'utf8'), hash: createHash('sha256').update(expected.marker).digest('hex') })
    if (result.stale)
      return null
    assert.ok(result.approved || result.denied, `Only the exact owned page and input may be decided: ${JSON.stringify(result)}`)
    return result
  }
  return null
}

exports.runAuthorizedBrowserProductChecks = async function ({ settings, chat, stage, root, report, capture, check, click }) {
  assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP?.startsWith('AlicizationQA_') || isOwnedHostViewport(report))
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-authorized-browser-product-'))
  const credential = randomUUID()
  const receipts = new Map()
  const saves = new Map()
  const foreignText = `ungranted-frame-${randomUUID()}`
  const foreign = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html')
    response.end(`<h1>${foreignText}</h1>`)
  })
  await new Promise(resolve => foreign.listen(0, '127.0.0.1', resolve))
  const foreignOrigin = `http://127.0.0.1:${foreign.address().port}`
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url, 'http://127.0.0.1')
      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        response.writeHead(204)
        response.end()
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      const number = Number(url.pathname.split('/').at(-1))
      if (/^\/login\/[1-3]$/.test(url.pathname)) {
        response.writeHead(302, { 'set-cookie': `qa-session=${credential}; HttpOnly; SameSite=Lax; Path=/`, 'location': `/case/${number}` })
        response.end()
        return
      }
      if (request.headers.cookie !== `qa-session=${credential}`) {
        response.writeHead(401)
        response.end('A synthetic session in the original browser is required.')
        return
      }
      if (request.method === 'POST' && /^\/save\/[1-3]$/.test(url.pathname)) {
        const parts = []
        let size = 0
        for await (const part of request) {
          size += part.length
          assert.ok(size <= 16000)
          parts.push(part)
        }
        const marker = Buffer.concat(parts).toString('utf8')
        const receipt = receipts.get(number)
        assert.ok(receipt && marker === receipt.marker)
        const count = (saves.get(number) ?? 0) + 1
        saves.set(number, count)
        assert.equal(count, 1, 'A consequential browser submission must not be replayed')
        await fs.writeFile(receipt.path, marker, { flag: 'wx' })
        response.end('已保存留言')
        return
      }
      assert.match(url.pathname, /^\/case\/[1-3]$/)
      response.end(`<title>Alicization QA browser ${number}</title><h1>测试账户已登录</h1><form action="/save/${number}" method="post"><label for="qa-note">QA 浏览器留言</label><input id="qa-note" name="note"/><button>保存留言</button></form><p id="result"></p><iframe src="${foreignOrigin}"></iframe><script>document.querySelector('form').onsubmit = async event => { event.preventDefault(); const response = await fetch('/save/${number}', { method: 'POST', body: document.querySelector('input').value }); if(response.ok)document.querySelector('#result').textContent = await response.text(); }</script>`)
    })().catch((error) => {
      report.browserFixtureFailure = error.message
      response.writeHead(500)
      response.end('The owned test operation failed.')
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  let browser
  let originalFailure
  const replyFailures = []
  try {
    browser = await chromium.launchPersistentContext(profile, { ...(executablePath ? { executablePath } : {}), headless: true, args: ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0'], timeout: 15000 })
    const original = browser.pages()[0]
    const [port] = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')
    const endpoint = `http://127.0.0.1:${port}`
    for (let repetition = 1; repetition <= 3; repetition++) {
      await original.goto(`${origin}/login/${repetition}`)
      assert.equal(await original.title(), `Alicization QA browser ${repetition}`)
      const noSession = await fetch(`${origin}/case/${repetition}`)
      assert.equal(noSession.status, 401)
      await noSession.body.cancel()
      await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
      const controls = settings.locator('[data-authorized-browser]')
      await controls.getByRole('heading', { name: '浏览器访问', exact: true }).waitFor()
      const details = controls.locator('details')
      if (!await details.evaluate(node => node.open))
        await click(details.locator('summary'))
      await controls.locator('input#authorized-browser-endpoint').fill(endpoint)
      await click(controls.locator('[data-browser-inspect]'))
      const tab = controls.locator('[data-browser-tab]').filter({ hasText: `Alicization QA browser ${repetition}` })
      await tab.waitFor()
      await click(tab)
      await controls.locator('input#authorized-browser-origins').fill(origin)
      await click(controls.locator('[data-browser-grant]'))
      await controls.locator('[data-browser-access-status][data-status="connected"]').waitFor({ timeout: 15000 })
      await controls.scrollIntoViewIfNeeded()
      await capture(settings, `authorized-browser-connected-${repetition}`)
      check('The real settings interface grants only its selected existing browser page', true)
      const marker = `Original browser delivery ${repetition} 中文🙂 ${randomUUID()}`
      const artifact = path.join(root, `browser-receipt-${repetition}.txt`)
      receipts.set(repetition, { marker, path: artifact })
      const goal = `QA 已登录浏览器交付 ${repetition}`
      const proposal = {
        goal,
        criteria: [{ id: 'receipt', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: artifact, includes: [marker] } }],
        steps: [
          { id: 'read-initial', dependsOn: [], capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, acceptanceCriterionIds: [] },
          { id: 'type-note', dependsOn: ['read-initial'], capabilityId: 'tool.browser_type_text', input: { selector: 'from-read-initial', text: marker, clearExisting: true }, inputBindings: [{ parameter: 'selector', stepId: 'read-initial', path: ['elements'], select: { field: 'text', equals: 'QA 浏览器留言', valueField: 'selector' } }], acceptanceCriterionIds: [] },
          { id: 'read-before-submit', dependsOn: ['type-note'], capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, acceptanceCriterionIds: [] },
          { id: 'submit', dependsOn: ['read-before-submit'], capabilityId: 'tool.browser_click_element', input: { selector: 'from-read-before-submit' }, inputBindings: [{ parameter: 'selector', stepId: 'read-before-submit', path: ['elements'], select: { field: 'text', equals: '保存留言', valueField: 'selector' } }], acceptanceCriterionIds: ['receipt'] },
          { id: 'wait-for-receipt', dependsOn: ['submit'], capabilityId: 'tool.browser_wait', input: { text: '已保存留言', state: 'complete', timeoutMs: 15000 }, acceptanceCriterionIds: [] },
          { id: 'read-result', dependsOn: ['wait-for-receipt'], capabilityId: 'tool.browser_read_page', input: { format: 'text' }, acceptanceCriterionIds: [] },
        ],
      }
      try {
        await sendExecutionRequest(chat, `请仅调用 life_execute_work_plan 执行这些参数，使用我在设置里已授权且已登录的浏览器页面。不要打开另一个浏览器、不要改计划、不要使用文件工具。验收文件由测试网站收到本次表单后生成，你无需写入它。参数：${JSON.stringify(proposal)}`)
      }
      catch (error) {
        if (process.env.LIFE_PRODUCT_BROWSER_DIAGNOSTIC !== '1' || error.code !== 'ERR_ASSERTION')
          throw error
        // Collect downstream evidence in this diagnostic without certifying a
        // broken reply. The original assertion still fails the complete run.
        replyFailures.push(error)
        report.diagnosticForegroundReplyFailures ??= []
        report.diagnosticForegroundReplyFailures.push({ goal, message: error.message })
      }
      const work = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
      await work.waitFor({ timeout: 15000 })
      const reconnected = repetition === 2
      if (reconnected) {
        let denied
        const denyDeadline = Date.now() + 15000
        while (!denied && Date.now() < denyDeadline) {
          denied = await approveBrowser([chat, settings], { destination: `${origin}/save/${repetition}`, marker, deny: true, onlyOperation: 'browser_type_text' }, original)
          if (!denied)
            await new Promise(resolve => setTimeout(resolve, 200))
        }
        assert.ok(denied?.denied)
        assert.equal(await original.getByLabel('QA 浏览器留言', { exact: true }).inputValue(), '')
        assert.equal(saves.get(repetition) ?? 0, 0)
        await click(controls.locator('[data-browser-takeover]'))
        await controls.locator('[data-browser-access-status][data-status="disconnected"]').waitFor({ timeout: 15000 })
        await click(controls.locator('[data-browser-inspect]'))
        const currentTab = controls.locator('[data-browser-tab]').filter({ hasText: `Alicization QA browser ${repetition}` })
        await currentTab.waitFor()
        await click(currentTab)
        await controls.locator('input#authorized-browser-origins').fill(origin)
        await click(controls.locator('[data-browser-grant]'))
        await controls.locator('[data-browser-access-status][data-status="connected"]').waitFor({ timeout: 15000 })
        await work.locator('[data-work-browser-reobserve]').waitFor({ timeout: 15000 })
        await click(work.locator('[data-work-browser-reobserve]'))
        check('Denied input, host takeover and reconnection preserve the same accepted work for fresh observation', true)
      }
      const approvals = []
      const deadline = Date.now() + 60000
      while (Date.now() < deadline && !await work.getByRole('status').filter({ hasText: '结果已确认' }).isVisible()) {
        const approval = await approveBrowser([chat, settings], { destination: `${origin}/save/${repetition}`, marker }, original)
        if (approval)
          approvals.push(approval)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      await work.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 3000 })
      assert.equal(await fs.readFile(artifact, 'utf8'), marker)
      assert.equal(saves.get(repetition), 1)
      assert.deepEqual(approvals.map(item => item.operation), ['browser_type_text', 'browser_click_element'])
      check('A real model task uses original browser login, bound input approval and one observed server submission', true)
      const before = await sampleLive2D(stage)
      await stage.waitForTimeout(150)
      const after = await sampleLive2D(stage)
      check('The selected-browser workflow keeps the actual Live2D body drawing', before.models.length === 1 && after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
      report.browserAccessExperiences ??= []
      report.browserAccessExperiences.push({ goal, artifact, marker, reconnected, originalLoginVerified: true, serverSubmissions: saves.get(repetition), approvals, ungrantedText: foreignText, renderer: 'live2d', browserProfileCopied: false, proofScope: 'owned-fixture-server-receipt-file' })
      await controls.scrollIntoViewIfNeeded()
      await click(controls.locator('[data-browser-takeover]'))
      await controls.locator('[data-browser-access-status][data-status="disconnected"]').waitFor({ timeout: 15000 })
      assert.equal(original.isClosed(), false)
      await click(controls.getByRole('button', { name: '使用应用的独立浏览器', exact: true }))
      await controls.locator('[data-browser-access-status][data-status="managed"]').waitFor()
      check('Host takeover stops access and leaves the original browser tab open', true)
    }
    assert.equal(report.browserFixtureFailure, undefined, 'The owned browser fixture must not hide a failed server operation')
    if (replyFailures.length)
      throw new AggregateError(replyFailures, 'Browser diagnostic observed failed foreground replies; downstream receipts do not certify those replies.')
  }
  catch (error) {
    originalFailure = error
    throw error
  }
  finally {
    server.closeAllConnections()
    foreign.closeAllConnections()
    const closed = await Promise.allSettled([browser?.close(), new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())), new Promise((resolve, reject) => foreign.close(error => error ? reject(error) : resolve()))])
    const failures = closed.filter(result => result.status === 'rejected')
    report.authorizedBrowserFixtureClosed = failures.length === 0
    if (!failures.length) {
      const owned = await fs.realpath(profile)
      assert.match(path.basename(owned), /^alicization-authorized-browser-product-/)
      assert.equal(await fs.realpath(path.dirname(owned)), await fs.realpath(os.tmpdir()))
      await fs.rm(owned, { recursive: true })
    }
    else {
      report.authorizedBrowserFixtureCleanup = { profile, errors: failures.map(result => result.reason.message) }
      if (!originalFailure)
        throw failures[0].reason
    }
  }
}
