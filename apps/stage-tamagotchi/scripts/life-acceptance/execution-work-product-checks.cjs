/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify rendered product text rather than hidden DOM content. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { isOwnedHostViewport } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

// Compare only equivalent drive-rooted separator spellings. Do not resolve
// traversal, device paths, UNC roots, case changes or filesystem aliases here.
function fixtureDrivePath(value) {
  if (typeof value !== 'string' || !/^[a-z]:[\\/]/iu.test(value))
    return null
  const segments = value.slice(2).split(/[\\/]+/u).filter(Boolean)
  if (segments.some(segment => segment === '.' || segment === '..'))
    return null
  return `${value.slice(0, 2)}\\${segments.join('\\')}`
}

function inspectOrApprovePermission(element, { permitted = [], expected, inspect = false }) {
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
      const found = find(child)
      if (found)
        return found
    }
    return null
  }
  const modal = find(app._instance ?? app._container._vnode.component)
  const request = modal?.props.request
  if (!request || !request.requestId || !request.token || modal.props.resolving || element.dataset.permissionRequestId !== request.requestId)
    return { approved: false, stale: true }
  if (inspect)
    return { requestId: request.requestId, token: request.token, resourcePath: request.resourcePath, toolName: request.toolName }
  if (!expected || expected.requestId !== request.requestId || expected.token !== request.token || expected.resourcePath !== request.resourcePath)
    return { approved: false, stale: true }
  const target = permitted.find(item => item.path === request.resourcePath)
  if (!target)
    return { approved: false, reason: 'unowned-target', path: request.resourcePath }
  const writing = target.marker !== undefined
  const toolName = target.toolName ?? (writing ? 'write_file' : 'read_file')
  if (!['write_file', 'read_file', 'list_directory'].includes(toolName) || writing !== (toolName === 'write_file'))
    return { approved: false, reason: 'unsupported-fixture-operation' }
  const keys = [...(request.argumentsSummary?.keys ?? [])].sort()
  const expectedKeys = writing ? target.expectedHash ? ['content', 'expectedHash', 'path'] : ['content', 'path'] : ['path']
  const supportedReadOptions = toolName === 'list_directory' ? ['maxEntries', 'maxReturnBytes', 'recursive'] : ['maxReturnBytes']
  const permittedReadOptions = writing ? [] : (target.readOptions ?? []).filter(key => supportedReadOptions.includes(key))
  const argumentsMatch = writing || permittedReadOptions.length === 0
    ? JSON.stringify(keys) === JSON.stringify(expectedKeys)
    : keys.includes('path') && new Set(keys).size === keys.length && keys.every(key => key === 'path' || permittedReadOptions.includes(key))
  const exact = request.cardId === 'default' && request.serverName === 'filesystem'
    && request.toolName === toolName
    && request.actionCategory === (writing ? 'write' : 'read')
    && request.argumentsSummary?.kind === 'object' && request.argumentsSummary.keyCount === keys.length
    && argumentsMatch
    && (!writing || (request.changePreview?.operation === (target.changeOperation ?? 'create') && request.changePreview.text === target.marker.slice(0, 600) && request.changePreview.byteLength === target.bytes && request.changePreview.sha256 === target.sha256 && request.changePreview.truncated === (target.marker.length > 600)))
    && (!writing || (element.querySelector('[data-file-content-binding]')?.textContent.includes(target.sha256) && element.querySelector('[data-file-content-binding]')?.textContent.includes(String(target.bytes))))
    && element.textContent.includes(target.operation)
    && element.querySelector('p.break-all')?.textContent.includes(target.path)
  if (!exact)
    return { approved: false, reason: 'operation-or-content-binding-mismatch', path: request.resourcePath }
  const buttons = [...element.querySelectorAll('button')].filter(button => button.textContent.trim() === '允许' && !button.disabled && button.getClientRects().length > 0)
  if (buttons.length !== 1 || buttons[0].dataset.permissionRequestId !== request.requestId || buttons[0].dataset.permissionToken !== request.token)
    return { approved: false, stale: true }
  // Check the current request and invoke its real Vue button in one task;
  // another queued permission cannot replace it between check and click.
  buttons[0].click()
  return { approved: true }
}

async function approveSyntheticOperation(pages, targets, beforeDecision, { deferOperations = [] } = {}) {
  for (const page of pages) {
    const dialog = page.getByRole('dialog', { name: '确认这次操作', exact: true })
    if (!await dialog.isVisible())
      continue
    const expected = await dialog.evaluate(inspectOrApprovePermission, { inspect: true })
    if (expected.stale)
      return false
    // Another operation may become visible between dedicated reviewers. Leave
    // its live token untouched so its content-bound reviewer handles it next.
    if (deferOperations.includes(expected.toolName))
      return false
    const nativePath = fixtureDrivePath(expected.resourcePath)
    const permitted = targets.filter(target => target.path === expected.resourcePath || (nativePath && fixtureDrivePath(target.path) === nativePath)).map(target => ({ ...target, path: expected.resourcePath, bytes: target.marker === undefined ? null : Buffer.byteLength(target.marker, 'utf8'), sha256: target.marker === undefined ? null : createHash('sha256').update(target.marker, 'utf8').digest('hex') }))
    for (const target of permitted) {
      if (target.expectedHash)
        assert.equal(createHash('sha256').update(await fs.readFile(target.path)).digest('hex'), target.expectedHash, 'Owned replacement must retain its exact reviewed before-image')
    }
    await beforeDecision?.()
    // Native path binding happens in the controller. The final DOM task still
    // checks the exact original request/token, operation, preview and raw path.
    const result = await dialog.evaluate(inspectOrApprovePermission, { permitted, expected })
    if (result.stale)
      return false
    assert.ok(result.approved, `The actual permission must match its exact synthetic target, operation and bytes: ${JSON.stringify(result)}`)
    return result.approved
  }
  return false
}

exports.approveSyntheticOperation = approveSyntheticOperation
async function sendExecutionRequest(chat, text) {
  const ready = () => chat.waitForFunction(() => document.querySelector('textarea')?.closest('[aria-busy]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 180000 })
  await ready()
  const existing = await chat.locator('[data-chat-message-role="assistant"][data-chat-message-id^="chat:"]').evaluateAll(nodes => nodes.map(node => node.dataset.chatMessageId))
  await chat.locator('textarea').fill(text)
  await chat.getByRole('button', { name: '发送消息', exact: true }).click({ timeout: 180000 })
  await chat.waitForFunction(() => document.querySelector('textarea')?.value === '', undefined, { timeout: 10000 })
  await ready()
  const replies = await chat.locator('[data-chat-message-role="assistant"][data-chat-message-id^="chat:"]').evaluateAll((nodes, before) => nodes.filter(node => !before.includes(node.dataset.chatMessageId)).map(node => ({ id: node.dataset.chatMessageId, interrupted: Boolean(node.querySelector('[data-chat-delivery-status="interrupted"]')), artifactOrigin: node.dataset.chatArtifactOrigin, contractFailed: node.dataset.chatContractFailed === 'true' })), existing)
  assert.equal(replies.length, 1, 'A normal work request must keep one actual foreground reply')
  assert.equal(replies[0].interrupted, false, 'A normal work admission must not end as an interrupted or ungrounded reply')
  assert.notEqual(replies[0].artifactOrigin, 'failure-surface', 'Infrastructure failure text is not a normal work acknowledgment')
  assert.equal(replies[0].contractFailed, false, 'A failed reply contract cannot pass an ordinary work experience')
  return replies[0]
}
exports.sendExecutionRequest = sendExecutionRequest

async function refreshExecutionView(settings) {
  await settings.getByRole('button', { name: '刷新', exact: true }).click()
  await settings.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === '刷新' && !button.disabled))
}

exports.runExecutionRepairProductChecks = async function ({ settings, chat, root, report, capture, check, reviseCriteria = false }) {
  assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP || isOwnedHostViewport(report))
  const identity = randomUUID()
  const goal = `QA ${reviseCriteria ? '修改要求' : '修复步骤'} ${identity}`
  const marker = `Retain the first observed write ${identity}`
  const artifact = path.join(root, `repair-report-${identity}.txt`)
  const missing = path.join(root, `unavailable-source-${identity}.txt`)
  const source = path.join(root, `available-source-${identity}.txt`)
  await fs.writeFile(source, 'Synthetic read fixture', { flag: 'wx' })
  const proposal = {
    goal,
    criteria: [{ id: 'report', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: artifact, includes: [marker] } }],
    steps: [
      { id: 'write-report', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path: artifact, content: marker }, acceptanceCriterionIds: ['report'] },
      { id: 'read-source', dependsOn: ['write-report'], capabilityId: 'tool.filesystem_read_file', input: { path: missing }, acceptanceCriterionIds: [] },
    ],
  }
  await sendExecutionRequest(chat, `请用 life_execute_work_plan 执行这份本地工作参数。第二步缺失的来源文件稍后由我在界面纠正，不要自行重试、创建来源或改变计划。只允许写第一个指定新文件。参数：${JSON.stringify(proposal)}`)
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    await approveSyntheticOperation([chat, settings], [{ path: artifact, operation: '创建一个文件', marker }, { path: missing, operation: '读取文件或资料' }])
    if (await fs.readFile(artifact, 'utf8').catch(() => null) === marker)
      break
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  assert.equal(await fs.readFile(artifact, 'utf8'), marker)
  const base = settings.url().split('#')[0]
  await settings.goto(`${base}#/settings/life`)
  const item = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
  const repairDeadline = Date.now() + 45000
  while (Date.now() < repairDeadline && !await item.getByRole('button', { name: '调整未完成步骤', exact: true }).isVisible()) {
    await approveSyntheticOperation([chat, settings], [{ path: missing, operation: '读取文件或资料' }])
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  await item.getByRole('button', { name: '调整未完成步骤', exact: true }).waitFor({ timeout: 3000 })
  // File bytes may be visible before the writer closes its handle and Windows
  // finalizes mtime. Observe the settled write before taking the no-replay base.
  await item.locator('summary').click()
  await item.locator('ol > li').filter({ hasText: '1. 写入文件' }).getByText('操作结果已观察，目标仍需验收', { exact: true }).waitFor({ timeout: Math.max(1, repairDeadline - Date.now()) })
  const before = await fs.stat(artifact)
  const repairIdentity = { goal, planId: await item.getAttribute('data-work-plan-id'), obligationId: await item.getAttribute('data-work-obligation-id'), artifact, marker, originalModifiedAt: before.mtimeMs, baseline: 'settled-write-observed-in-product-details' }
  let criteriaIdentity
  if (reviseCriteria) {
    criteriaIdentity = { goal, planId: await item.getAttribute('data-work-plan-id'), obligationId: await item.getAttribute('data-work-obligation-id'), originalContractHash: await item.getAttribute('data-work-contract-hash'), artifact, marker, originalModifiedAt: before.mtimeMs }
    await item.getByRole('button', { name: '修改验收要求', exact: true }).click()
    const form = item.getByRole('form', { name: '修改验收要求', exact: true })
    report.criteriaEditorControls ??= []
    report.criteriaEditorControls.push(await form.locator('input[role="combobox"],button[aria-haspopup="listbox"]').evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, label: node.getAttribute('aria-label'), role: node.getAttribute('role'), expanded: node.getAttribute('aria-expanded'), labels: [...(node.labels ?? [])].map(label => label.textContent.trim()) }))))
    await form.getByRole('button', { name: '新条件类型', exact: true }).click()
    await settings.getByRole('option', { name: '文件内容完全一致', exact: true }).click()
    await form.getByRole('button', { name: '添加条件', exact: true }).click()
    const extra = form.locator('fieldset').last()
    await extra.getByLabel('文件路径', { exact: true }).fill(artifact)
    await extra.getByLabel('预期文件 SHA-256', { exact: true }).fill(createHash('sha256').update(marker).digest('hex'))
    await refreshExecutionView(settings)
    check('An actual same-contract view refresh preserves the added requirement and its edited fields', await form.locator('fieldset').count() === 2 && await extra.getByLabel('文件路径', { exact: true }).inputValue() === artifact && await extra.getByLabel('预期文件 SHA-256', { exact: true }).inputValue() === createHash('sha256').update(marker).digest('hex'))
    const revisionDeadline = Date.now() + 10000
    await form.getByRole('button', { name: '保存新要求', exact: true }).click()
    await settings.getByRole('status').filter({ hasText: '新要求已保存，旧验收已失效。' }).waitFor({ timeout: Math.max(1, revisionDeadline - Date.now()) })
    // A previous plan's success text cannot certify this asynchronous save.
    // Observe all current-task identity fields together in the actual DOM.
    await settings.waitForFunction(({ planId, obligationId, originalContractHash }) => {
      const current = [...document.querySelectorAll('article[data-work-plan-id]')].find(node => node.getAttribute('data-work-plan-id') === planId)
      return current?.getAttribute('data-work-obligation-id') === obligationId
        && current.getAttribute('data-work-generation') === '2'
        && current.getAttribute('data-work-plan-revision') === '2'
        && current.getAttribute('data-work-contract-hash') !== originalContractHash
    }, criteriaIdentity, { timeout: Math.max(1, revisionDeadline - Date.now()) })
    assert.equal(await item.getAttribute('data-work-generation'), '2')
    assert.equal(await item.getAttribute('data-work-plan-revision'), '2')
    assert.equal(await item.getAttribute('data-work-obligation-id'), criteriaIdentity.obligationId)
    assert.notEqual(await item.getAttribute('data-work-contract-hash'), criteriaIdentity.originalContractHash)
    await capture(settings, 'execution-requirements-revised')
    check('Actual host controls strengthen acceptance on the same task and expire the former contract', true)
  }
  await item.getByRole('button', { name: '调整未完成步骤', exact: true }).click()
  const editor = item.getByRole('form', { name: '调整未完成步骤', exact: true })
  await editor.getByLabel('文件路径', { exact: true }).fill(source)
  await refreshExecutionView(settings)
  check('An actual same-revision view refresh preserves the corrected step path before save', await editor.getByLabel('文件路径', { exact: true }).inputValue() === source)
  await editor.getByRole('button', { name: '保存调整', exact: true }).click()
  await settings.getByRole('status').filter({ hasText: '调整已保存，可以继续处理。' }).waitFor({ timeout: 10000 })
  await item.getByRole('button', { name: '继续处理', exact: true }).click()
  const resumeDeadline = Date.now() + 45000
  while (Date.now() < resumeDeadline && !await item.getByRole('status').filter({ hasText: '结果已确认' }).isVisible()) {
    await approveSyntheticOperation([chat, settings], [{ path: source, operation: '读取文件或资料' }])
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 30000 })
  const after = await fs.stat(artifact)
  check('Actual UI repairs a blocked dependency without replaying the earlier file write', before.mtimeMs === after.mtimeMs && await fs.readFile(artifact, 'utf8') === marker, { baseline: 'settled-write-observed-in-product-details', before: before.mtimeMs, after: after.mtimeMs, size: after.size })
  check(reviseCriteria ? 'Changing requirements does not create the missing source or replay the observed file write' : 'Repair does not create the missing source or redefine its acceptance', await fs.stat(missing).then(() => false, () => true))
  await settings.reload()
  await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 10000 })
  await capture(settings, 'execution-repaired-after-reload')
  if (reviseCriteria) {
    assert.equal(await item.getAttribute('data-work-plan-id'), criteriaIdentity.planId)
    assert.equal(await item.getAttribute('data-work-plan-revision'), '3')
    report.executionCriteriaExperiences ??= []
    report.executionCriteriaExperiences.push({ ...criteriaIdentity, finalModifiedAt: after.mtimeMs, correctedSource: source, source: 'actual-configured-model-and-host-requirements-controls' })
  }
  else {
    report.executionRepairExperiences ??= []
    report.executionRepairExperiences.push({ ...repairIdentity, source: 'actual-configured-model-and-product-controls', finalModifiedAt: after.mtimeMs, correctedSource: source })
  }
}

exports.runExecutionWorkProductChecks = async function ({ stage, settings, chat, root, report, capture, check }) {
  assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP || isOwnedHostViewport(report), 'This experience requires its verified owned background runtime')
  const identity = randomUUID()
  const marker = `Alicization accepted local responsibility ${identity}`
  const artifact = path.join(root, `accepted-report-${identity}.txt`)
  const goal = `QA 工作验收 ${identity}`
  const proposal = {
    goal,
    criteria: [
      { id: 'report', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: artifact, includes: [marker] } },
      { id: 'host-review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '这份报告符合要求吗？', artifactIds: ['report'] } },
    ],
    steps: [{ id: 'write-report', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path: artifact, content: marker }, acceptanceCriterionIds: ['report'] }],
  }
  // Observe actual parameter projection. No presence pulse or body value is injected.
  const bodyBefore = await stage.evaluate(() => ({ renderer: document.documentElement.dataset.renderer, speech: document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('speech')?.activeSpeechProvider }))
  const observingSince = Date.now()
  await stage.evaluate(() => {
    if (window.__executionApprovalObserver)
      return
    const dispatcher = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-presence-dispatcher')
    if (!dispatcher)
      throw new Error('Actual presence dispatcher is unavailable')
    window.__executionApprovalSamples = []
    window.__executionApprovalObserver = dispatcher.$onAction(({ name, args }) => {
      if (name !== 'dispatchPresencePulse')
        return
      const payload = args[0]
      if (payload?.reasonTags?.includes('execution:awaiting-host-approval')) {
        window.__executionApprovalSamples.push({ at: Date.now(), activity: structuredClone(payload.activity), embodiedPresence: payload.embodiedPresence, reasonTags: [...payload.reasonTags] })
        window.__executionApprovalSamples = window.__executionApprovalSamples.slice(-32)
      }
    }, true)
  })
  const approvalBodySamples = []
  report.executionApprovalBodyObservations ??= []
  const observeApproval = async () => {
    const deadline = Date.now() + 5000
    let pulse
    while (Date.now() < deadline) {
      pulse = await stage.evaluate(since => window.__executionApprovalSamples?.findLast(item => item.at >= since && item.activity?.work?.mode === 'waiting'), observingSince)
      if (pulse)
        break
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    assert.ok(pulse, 'A real permission wait must reach the actual Live2D presence dispatcher')
    const before = await sampleLive2D(stage)
    await new Promise(resolve => setTimeout(resolve, 150))
    const after = await sampleLive2D(stage)
    const observation = { goal, pulse, before, after }
    approvalBodySamples.push(observation)
    // Preserve failed observations too; a later assertion must not erase the body evidence.
    report.executionApprovalBodyObservations.push(observation)
    assert.ok(after.models.length === 1 && after.models[0].drawFrame?.frame > (before.models[0]?.drawFrame?.frame ?? 0), 'Live2D must keep drawing while actual execution waits for approval')
  }
  await sendExecutionRequest(chat, `请用 life_execute_work_plan 工具执行这份已明确授权的本地工作参数，不改用单独的写文件工具，也不要只口头声称完成。输出物只写这个新文件，其他文件不要修改。执行结束后等待我在工作进展页面验收。参数：${JSON.stringify(proposal)}`)
  const deadline = Date.now() + 45000
  let actual = null
  while (Date.now() < deadline) {
    if (await approveSyntheticOperation([chat, settings], [{ path: artifact, operation: '创建一个文件', marker }], observeApproval)) {
      report.executionCreationApproval = { target: artifact, scope: 'single-synthetic-test-file' }
    }
    actual = await fs.readFile(artifact, 'utf8').catch(() => null)
    // The governed writer can create its owned handle before filling it. Only
    // the exact expected bytes end this wait; existence is not completion.
    if (actual === marker)
      break
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  check('Actual configured model creates the accepted work artifact through the product', actual === marker, { expectedHash: createHash('sha256').update(marker).digest('hex'), actualHash: actual === null ? null : createHash('sha256').update(actual).digest('hex') })
  check('Actual permission waiting reaches the Live2D body without freezing its renderer', approvalBodySamples.length > 0)
  const base = settings.url().split('#')[0]
  await settings.goto(`${base}#/settings/life`)
  await settings.getByRole('heading', { name: '工作进展', exact: true }).waitFor({ timeout: 30000 })
  const item = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
  await item.getByRole('button', { name: '我确认结果符合要求', exact: true }).waitFor({ timeout: 30000 })
  const reviewButton = item.getByRole('button', { name: '我确认结果符合要求', exact: true })
  await reviewButton.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }))
  const controlsLayout = await reviewButton.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const hit = document.elementFromPoint(point.x, point.y)
    const heading = document.querySelector('h1')
    const work = node.closest('section')
    const recovery = [...document.querySelectorAll('h2')].find(item => item.textContent.trim() === '文件版本与恢复')
    return { rect: rect.toJSON(), point, header: heading?.getBoundingClientRect().toJSON(), hit: hit?.tagName, exposed: Boolean(hit && node.contains(hit)), workBeforeVersions: !recovery || Boolean(work.compareDocumentPosition(recovery) & Node.DOCUMENT_POSITION_FOLLOWING) }
  })
  report.executionWorkControlLayouts ??= []
  report.executionWorkControlLayouts.push({ goal, ...controlsLayout })
  check('Current work controls precede version history and remain reachable below the sticky header after scrolling', controlsLayout.workBeforeVersions && controlsLayout.exposed && controlsLayout.rect.top >= controlsLayout.header.bottom, controlsLayout)
  check('Work UI withholds completion until actual host review', await item.getByRole('button', { name: '我确认结果符合要求', exact: true }).isVisible() && !(await item.innerText()).includes('结果已确认'))
  await capture(settings, 'execution-awaiting-review')
  check('A work responsibility is shown once with its own acceptance controls', await settings.getByRole('heading', { name: goal, exact: true }).count() === 1)
  await item.getByRole('button', { name: '我确认结果符合要求', exact: true }).click()
  await settings.getByRole('status').filter({ hasText: '所有要求均已确认。' }).waitFor({ timeout: 15000 })
  await stage.getByText('这件事已经核验完成', { exact: true }).waitFor({ timeout: 6000 })
  check('The Live2D surface receives completion after the actual review', true)
  await item.getByRole('button', { name: '我确认结果符合要求', exact: true }).waitFor({ state: 'hidden', timeout: 6000 })
  check('Actual UI feedback completes the same delivered responsibility', await item.getByRole('button', { name: '我确认结果符合要求', exact: true }).count() === 0)
  await settings.reload()
  await item.getByRole('heading', { name: goal, exact: true }).waitFor({ timeout: 30000 })
  check('Reload preserves the accepted work and its final review', await item.getByRole('button', { name: '我确认结果符合要求', exact: true }).count() === 0 && (await item.innerText()).includes('结果已确认'))
  check('Work result controls keep their layout within the window', await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await capture(settings, 'execution-reviewed-after-reload')
  report.executionWorkExperiences ??= []
  report.executionWorkExperiences.push({ source: 'actual-configured-model-and-product-controls', modelRequestUsed: true, bodyBefore, approvalBodySamples, artifact, artifactHash: createHash('sha256').update(actual).digest('hex'), requiredReviewScope: 'user-reported', desktop: report.nativeRuntime?.desktop })
}
