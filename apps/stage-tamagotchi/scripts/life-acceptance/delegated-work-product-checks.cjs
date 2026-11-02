/* eslint-disable unicorn/prefer-dom-node-text-content -- Check visible product controls. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { execFileSync } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const hash = text => createHash('sha256').update(text).digest('hex')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
function activate(locator) {
  return locator.evaluate((element) => {
    if (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true')
      throw new Error('The actual control is disabled')
    element.click()
  })
}

function inspectOrDecideReview(element, expected) {
  const app = document.querySelector('#app').__vue_app__
  const seen = new Set()
  function find(node) {
    if (!node || typeof node !== 'object' || seen.has(node))
      return null
    seen.add(node)
    const instance = node.component || node
    if (instance.props && Object.hasOwn(instance.props, 'request') && Object.hasOwn(instance.props, 'resolving'))
      return instance
    for (const child of [node.component, node.subTree, node.suspense?.activeBranch, node.ssContent, ...(Array.isArray(node.children) ? node.children : [])]) {
      const match = find(child)
      if (match)
        return match
    }
    return null
  }
  const modal = find(app._instance ?? app._container._vnode.component)
  const request = modal?.props.request
  if (!request || modal.props.resolving || element.dataset.permissionRequestId !== request.requestId)
    return null
  if (expected.inspect)
    return { requestId: request.requestId, token: request.token, text: request.interfacePreview?.text }
  if (request.requestId !== expected.requestId || request.token !== expected.token)
    return null
  if (request.cardId !== 'default' || request.serverName !== 'local-interface' || request.toolName !== 'coding_agent.cli' || request.riskLevel !== 'danger' || request.actionCategory !== 'execute' || request.resourcePath !== expected.cwd || request.supportsRememberSession !== false || request.interfacePreview?.text !== expected.text || request.interfacePreview?.sha256 !== expected.sha256 || request.interfacePreview?.byteLength !== expected.byteLength || element.querySelector('[data-interface-input-preview]')?.textContent !== expected.text)
    throw new Error('The real delegated approval differs from the exact owned proposal')
  const buttons = [...element.querySelectorAll('button')].filter(button => button.textContent.trim() === (expected.allow ? '允许' : '拒绝') && !button.disabled && button.getClientRects().length > 0)
  if (buttons.length !== 1 || buttons[0].dataset.permissionRequestId !== request.requestId || buttons[0].dataset.permissionToken !== request.token)
    throw new Error('The delegated approval control changed identity')
  buttons[0].click()
  return { requestId: request.requestId, allowed: expected.allow, inputSha256: request.interfacePreview.sha256 }
}

/** Validate every parameter, then bind and activate the same current review. */
async function decide(pages, input, allow) {
  for (const page of pages) {
    const dialog = page.getByRole('dialog', { name: '确认这次操作', exact: true })
    if (!await dialog.isVisible())
      continue
    const snapshot = await dialog.evaluate(inspectOrDecideReview, { inspect: true })
    if (!snapshot)
      continue
    const parsed = JSON.parse(snapshot.text)
    assert.deepEqual(parsed, input, 'The complete reviewed parameters differ from the owned proposal')
    assert.equal(JSON.stringify(parsed, null, 2), snapshot.text, 'Unexpected review serialization or duplicate keys')
    // Object key order may change during schema parsing. Hash the complete
    // actual preview after comparing every value, never a truncated excerpt.
    return dialog.evaluate(inspectOrDecideReview, { ...snapshot, sha256: hash(snapshot.text), byteLength: Buffer.byteLength(snapshot.text), cwd: input.cwd, allow })
  }
  return null
}
exports.decideDelegatedOperation = decide

async function waitDecision(pages, input, allow) {
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    const decision = await decide(pages, input, allow)
    if (decision)
      return decision
    await wait(100)
  }
  throw new Error('The real delegated step did not request its exact host review')
}

async function confirmOwnedCommandStopped(file, nonce, nativePid) {
  const receipt = JSON.parse(await fs.readFile(file, 'utf8'))
  assert.equal(receipt.nonce, nonce)
  // The Job guard is the direct parent. The mandatory read-only shutdown
  // inspection binds that guard to the exact main-owned child event/approval.
  assert.ok(Number.isSafeInteger(receipt.parentPid) && receipt.parentPid > 0)
  assert.notEqual(receipt.pid, nativePid)
  assert.ok(Number.isSafeInteger(receipt.pid) && receipt.pid > 0)
  assert.equal(await fs.realpath(receipt.executable), await fs.realpath(process.execPath))
  const deadline = Date.now() + 15000
  do {
    const state = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${receipt.pid}'; if($p){'{"exists":true}'}else{'{"exists":false}'}`], { encoding: 'utf8', windowsHide: true, timeout: 5000 }))
    if (!state.exists)
      return { ...receipt, originalProcessEnded: true, independentlyObservedAt: Date.now(), supervisorLineage: 'required-in-read-only-shutdown-inspection' }
    await wait(100)
  } while (Date.now() < deadline)
  throw new Error('The exact owned command process is still present; refusing a host stop acknowledgement')
}

exports.runDelegatedWorkProductChecks = async function ({ stage, settings, chat, root, report, capture, check }) {
  assert.equal(report.rendererFocus, 'live2d')
  report.delegatedWorkExperiences = []
  for (const round of [1, 2, 3]) {
    for (const mode of ['complete', 'revise', 'cancel']) {
      const directory = path.join(root, `delegated-${randomUUID()}`)
      await fs.mkdir(directory)
      const cwd = await fs.realpath(directory)
      const artifact = path.join(cwd, 'result.txt')
      const starts = path.join(cwd, 'starts.txt')
      const processReceipt = path.join(cwd, 'child-process.json')
      const processNonce = randomUUID()
      const content = `Owned delegated result ${round}/${mode} 中文🙂`
      const startScript = `require('node:fs').appendFileSync(${JSON.stringify(starts)}, ${JSON.stringify('started\n')}); require('node:fs').writeFileSync(${JSON.stringify(processReceipt)}, JSON.stringify({nonce:${JSON.stringify(processNonce)},pid:process.pid,parentPid:process.ppid,executable:process.execPath,startedAt:Date.now()}), {flag:'wx'})`
      const script = mode === 'cancel'
        ? `${startScript}; setInterval(() => {}, 1000)`
        : `${startScript}; require('node:fs').writeFileSync(${JSON.stringify(artifact)}, ${JSON.stringify(content)})`
      let input = { command: 'node', args: ['-e', script], cwd, effect: 'mutate' }
      const goal = `QA 委托工作 ${round} ${mode} ${randomUUID()}`
      const proposal = { goal, criteria: [{ id: 'artifact', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: artifact, sha256: hash(content) } }], steps: [{ id: 'owned-command', capabilityId: 'coding_agent.cli', input, dependsOn: [], acceptanceCriterionIds: ['artifact'] }] }
      const request = `请只用 life_execute_work_plan 执行这份明确授权的自有测试任务，不改变参数、工作目录或验收条件。代码步骤必须等待界面批准。只简短确认接到任务，不声称已经完成。参数：${JSON.stringify(proposal)}`
      const experience = { round, mode, goal, artifact, starts, content, cwd, processReceipt, processNonce, requestSha256: hash(request), requestChars: request.length, approvals: [], completed: false }
      report.delegatedWorkExperiences.push(experience)
      const before = await sampleLive2D(stage)
      await sendExecutionRequest(chat, request)
      experience.approvals.push(await waitDecision([chat, settings, stage], input, mode !== 'revise'))
      await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
      const item = settings.locator('article[data-work-plan-id]').filter({ hasText: goal })
      await item.waitFor({ timeout: 30000 })
      experience.planId = await item.getAttribute('data-work-plan-id')
      experience.obligationId = await item.getAttribute('data-work-obligation-id')
      if (mode === 'revise') {
        await item.getByRole('button', { name: '调整未完成步骤', exact: true }).waitFor({ timeout: 30000 })
        check('Denied delegated work produces no process or artifact before host correction', !await fs.stat(starts).catch(() => null) && !await fs.stat(artifact).catch(() => null), { round })
        await activate(item.getByRole('button', { name: '调整未完成步骤', exact: true }))
        const args = ['-e', `${script}; console.log('host revised literal argv')`]
        const editor = item.getByRole('form', { name: '调整未完成步骤', exact: true })
        await editor.getByLabel('命令参数', { exact: false }).fill(JSON.stringify(args))
        await activate(editor.getByRole('button', { name: '保存调整', exact: true }))
        await editor.waitFor({ state: 'hidden', timeout: 15000 })
        experience.planRevision = 2
        input = { ...input, args }
        await activate(item.getByRole('button', { name: '继续处理', exact: true }))
        experience.approvals.push(await waitDecision([chat, settings, stage], input, true))
        check('Host-edited command obtains a different real approval bound to the revised argument vector', experience.approvals[0].requestId !== experience.approvals[1].requestId && experience.approvals[0].inputSha256 !== experience.approvals[1].inputSha256, { round })
      }
      const deadline = Date.now() + 30000
      while (Date.now() < deadline && !await fs.stat(starts).catch(() => null)) await wait(100)
      assert.equal(await fs.readFile(starts, 'utf8'), 'started\n')
      if (mode === 'cancel') {
        await activate(item.getByRole('button', { name: '停止任务', exact: true }))
        await item.getByRole('status').filter({ hasText: '已取消' }).first().waitFor({ timeout: 30000 })
        check('Actual parent cancellation ends the task without manufacturing the missing artifact', !await fs.stat(artifact).catch(() => null), { round })
        experience.processStop = await confirmOwnedCommandStopped(processReceipt, processNonce, report.nativeRuntime.pid)
        const recovery = settings.getByRole('region', { name: '尚未确定的操作', exact: true })
        await recovery.waitFor({ timeout: 15000 })
        assert.equal(await recovery.locator('article').count(), 1)
        const unknown = recovery.locator('article').first()
        const effectId = await unknown.getAttribute('data-recovery-effect-id')
        await activate(unknown.getByRole('button', { name: '重新核对', exact: true }))
        await recovery.getByRole('status').filter({ hasText: '暂时无法独立核对' }).waitFor({ timeout: 15000 })
        check('Stopping the real process does not silently turn its unknown effects into success or absence', await recovery.locator('article').count() === 1, { round, effectId })
        await activate(unknown.getByRole('button', { name: '由我接管', exact: true }))
        const takeOver = unknown.getByRole('button', { name: '确认接管并结束任务', exact: true })
        await takeOver.waitFor({ timeout: 10000 })
        assert.ok((await unknown.innerText()).includes(goal), 'Take over only this exact owned cancelled responsibility')
        assert.equal(await takeOver.isDisabled(), true)
        const token = await takeOver.getAttribute('data-recovery-token')
        assert.match(token, /^[a-f\d-]{36}$/u)
        await unknown.getByRole('switch', { name: '我已停止相关程序，并会自行处理已有结果', exact: true }).check()
        await activate(takeOver)
        await recovery.getByRole('status').filter({ hasText: '已记录你的接管决定并结束相关任务' }).waitFor({ timeout: 15000 })
        await unknown.waitFor({ state: 'detached', timeout: 10000 })
        experience.hostTakeover = { effectId, decisionId: `host-takeover:${token}`, originalResult: 'unknown' }
        check('Explicit host takeover releases the stopped operation while retaining its unknown original result', !await fs.stat(artifact).catch(() => null) && await fs.readFile(starts, 'utf8') === 'started\n', { round, effectId })
      }
      else {
        await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 30000 })
        check('Actual delegated work completes only after the independent artifact check', await fs.readFile(artifact, 'utf8') === content, { round, mode })
      }
      assert.equal(await fs.readFile(starts, 'utf8'), 'started\n')
      await item.locator('summary').click()
      check('The work step displays its localized operation', (await item.locator('ol').innerText()).includes('执行本地命令步骤'), { round, mode })
      const after = await sampleLive2D(stage)
      check('Live2D keeps drawing while the governed command runs', after.models.length === 1 && after.models[0].drawFrame?.frame > (before.models[0]?.drawFrame?.frame ?? 0), { round, mode })
      await capture(settings, `delegated-${round}-${mode}`)
      await settings.reload()
      await item.waitFor({ timeout: 15000 })
      assert.equal(await item.getAttribute('data-work-obligation-id'), experience.obligationId)
      experience.completed = true
      check('Reload preserves delegated work identity and the single actual process start', await fs.readFile(starts, 'utf8') === 'started\n', { round, mode })
    }
  }
}
